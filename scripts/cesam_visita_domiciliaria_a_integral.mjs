// CESAM: reemplaza los bloques "Visita Domiciliaria" por "Visita Integral de Salud Mental (SM)"
// (misma profesión/especialidad/proceso del catálogo). Respalda los bloques antes de cambiarlos.
// Uso: node scripts/cesam_visita_domiciliaria_a_integral.mjs [--aplicar]
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
const APLICAR = process.argv.includes('--aplicar');
const DESTINO = 'Visita Integral de Salud Mental (SM)';
const p = new PrismaClient();
async function retry(fn) { for (let i = 0; i < 8; i++) { try { return await fn(); } catch (e) { if (!/Can't reach|P1001|P1017/.test(e.message)) throw e; await new Promise(r => setTimeout(r, 5000)); } } throw new Error('sin conexión'); }

const agendas = await retry(() => p.agenda.findMany({ where: { serviceName: { contains: 'CESAM' } } }));
const bloques = await retry(() => p.agendaBlock.findMany({
  where: { agendaId: { in: agendas.map(a => a.id) }, activity: 'Visita Domiciliaria' },
  include: { professional: true },
}));
const catalogo = await retry(() => p.catalogActivity.findMany({ where: { activity: DESTINO } }));
const plan = [];
const errores = [];
for (const b of bloques) {
  const agenda = agendas.find(a => a.id === b.agendaId);
  const esp = b.professional.specialtyCatalog || agenda.serviceSpecialty;
  const filas = catalogo.filter(c => c.profession === b.professional.type && (c.specialty === esp || c.specialty === 'No Aplica'));
  filas.sort((x, y) => (x.process === b.process ? 0 : 1) - (y.process === b.process ? 0 : 1) || (x.specialty === esp ? 0 : 1) - (y.specialty === esp ? 0 : 1));
  if (!filas[0]) { errores.push(`${agenda.externalId} ${b.professional.name} (${b.professional.type}/${esp})`); continue; }
  plan.push({ b, agenda, cat: filas[0] });
}
const resumen = {};
for (const x of plan) { const k = `${x.agenda.externalId} | ${x.b.professional.type} | ${x.b.process} → ${x.cat.process}: ${x.cat.activity}`; resumen[k] = (resumen[k] || 0) + 1; }
console.log(resumen);
if (errores.length) { console.log('SIN EQUIVALENTE EN CATÁLOGO:', errores); process.exit(1); }
if (!APLICAR) { console.log(`SIMULACIÓN: ${plan.length} bloques. Usa --aplicar.`); await p.$disconnect(); process.exit(); }

fs.mkdirSync('backups', { recursive: true });
fs.writeFileSync('backups/cesam-visita-domiciliaria-2026-11-18.json', JSON.stringify(bloques.map(({ professional, ...b }) => b), null, 1));
const fecha = new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Santiago' });
await retry(() => p.$transaction(async (tx) => {
  for (const { b, cat } of plan) {
    await tx.agendaBlock.update({ where: { id: b.id }, data: { activity: cat.activity, process: cat.process, catalogActivityId: cat.id, isClinical: cat.isClinical, hasPerformance: cat.hasPerformance } });
  }
  for (const a of agendas) {
    const n = plan.filter(x => x.agenda.id === a.id).length;
    if (!n) continue;
    const last = await tx.agendaHistory.findFirst({ where: { agendaId: a.id }, orderBy: { sortOrder: 'desc' } });
    await tx.agendaHistory.create({ data: { agendaId: a.id, dateLabel: fecha, action: 'Prestación reclasificada', userName: 'DDI', sortOrder: (last?.sortOrder ?? -1) + 1, comment: `${n} bloques "Visita Domiciliaria" pasan a "${DESTINO}".` } });
    await tx.agendaAudit.create({ data: { agendaId: a.id, entityType: 'block', action: 'update', userName: 'DDI', payloadJson: JSON.stringify({ origen: 'script', de: 'Visita Domiciliaria', a: DESTINO, bloques: plan.filter(x => x.agenda.id === a.id).map(x => x.b.id) }) } });
    await tx.agenda.update({ where: { id: a.id }, data: { lastUpdated: BigInt(Date.now()) } });
  }
}, { maxWait: 30000, timeout: 120000 }));
console.log(`APLICADO: ${plan.length} bloques actualizados. Respaldo en backups/cesam-visita-domiciliaria-2026-11-18.json`);
await p.$disconnect();
