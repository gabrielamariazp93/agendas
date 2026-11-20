// Une las programaciones de CESAM adulto + infanto-juvenil en una sola agenda por dispositivo.
// La agenda adulto se conserva (cambia de nombre) y recibe los profesionales, bloques, historial y
// auditoría de la infanto-juvenil. Los profesionales infanto-juveniles quedan con su propia
// especialidad (AgendaProfessional.specialtyCatalog) para no perder la distinción en catálogo y
// rendimientos. Luego se eliminan la agenda y el servicio infanto-juvenil ya vacíos.
//
// Uso:  node scripts/unir_cesam_por_dispositivo.mjs          (simulación: hace todo y revierte)
//       node scripts/unir_cesam_por_dispositivo.mjs --aplicar
// Respaldo previo en backups/cesam-antes-de-unir-2026-11-18.json.
import { PrismaClient } from '@prisma/client';

const APLICAR = process.argv.includes('--aplicar');
const prisma = new PrismaClient();

const DISPOSITIVOS = [
  {
    nombre: 'Salud Mental CESAM Centro',
    externalId: 'cesamcentro-2026',
    adulto: 'cesamcentroadulto-2026',
    infanto: 'cesamcentroinfanto-2026',
    jefe: 'PAMELA MEDEL SALAZAR',
  },
  {
    nombre: 'Salud Mental CESAM Las Compañías',
    externalId: 'cesamcias-2026',
    adulto: 'cesamciasadulto-2026',
    infanto: 'cesamciasinfanto-2026',
    jefe: 'DIEGO GONZALEZ CASTRO', // provisorio: la jefatura de Las Compañías está por confirmar
  },
];

function sumarJson(a, b) {
  const out = structuredClone(a);
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === 'object') out[k] = sumarJson(out[k] || {}, v);
    else out[k] = (out[k] || 0) + (v || 0);
  }
  return out;
}

function fechaLabel(d = new Date()) {
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Santiago' });
}

class Simulacion extends Error {}

async function unir(tx, cfg) {
  const adulto = await tx.agenda.findUnique({ where: { externalId: cfg.adulto } });
  const infanto = await tx.agenda.findUnique({ where: { externalId: cfg.infanto } });
  if (!adulto || !infanto) throw new Error(`Falta agenda de ${cfg.nombre}: adulto=${!!adulto} infanto=${!!infanto}`);
  const svcInfanto = await tx.service.findUnique({ where: { id: infanto.serviceId } });
  const choque = await tx.service.findUnique({ where: { name: cfg.nombre } });
  if (choque && choque.id !== adulto.serviceId) throw new Error(`Ya existe un servicio llamado ${cfg.nombre}`);

  const nAdulto = await tx.agendaProfessional.count({ where: { agendaId: adulto.id } });
  const nHistAdulto = await tx.agendaHistory.count({ where: { agendaId: adulto.id } });
  const profsInfanto = await tx.agendaProfessional.findMany({ where: { agendaId: infanto.id }, orderBy: { sortOrder: 'asc' } });

  // Profesionales infanto -> agenda adulto, con su especialidad propia y orden a continuación.
  for (const [i, p] of profsInfanto.entries()) {
    await tx.agendaProfessional.update({
      where: { id: p.id },
      data: { agendaId: adulto.id, specialtyCatalog: svcInfanto.specialtyCatalog, sortOrder: nAdulto + i },
    });
  }
  const bloques = await tx.agendaBlock.updateMany({ where: { agendaId: infanto.id }, data: { agendaId: adulto.id } });
  const hist = await tx.agendaHistory.findMany({ where: { agendaId: infanto.id } });
  for (const h of hist) {
    await tx.agendaHistory.update({ where: { id: h.id }, data: { agendaId: adulto.id, sortOrder: nHistAdulto + h.sortOrder } });
  }
  const audits = await tx.agendaAudit.updateMany({ where: { agendaId: infanto.id }, data: { agendaId: adulto.id } });
  await tx.notification.updateMany({ where: { agendaId: infanto.id }, data: { agendaId: adulto.id } });

  await tx.service.update({ where: { id: adulto.serviceId }, data: { name: cfg.nombre, chiefName: cfg.jefe } });
  await tx.agenda.update({
    where: { id: adulto.id },
    data: {
      externalId: cfg.externalId,
      serviceName: cfg.nombre,
      chiefName: cfg.jefe,
      hoursJson: JSON.stringify(sumarJson(JSON.parse(adulto.hoursJson || '{}'), JSON.parse(infanto.hoursJson || '{}'))),
      distributionJson: JSON.stringify(sumarJson(JSON.parse(adulto.distributionJson || '{}'), JSON.parse(infanto.distributionJson || '{}'))),
      lastUpdated: BigInt(Date.now()),
    },
  });
  await tx.agendaHistory.create({
    data: {
      agendaId: adulto.id,
      dateLabel: fechaLabel(),
      action: 'Agenda unificada por dispositivo',
      userName: 'DDI',
      comment: `Se unieron "${adulto.serviceName}" y "${infanto.serviceName}" en una sola agenda por dispositivo. Los profesionales infanto-juveniles conservan la especialidad ${svcInfanto.specialtyCatalog}.`,
      sortOrder: nHistAdulto + hist.length,
    },
  });

  await tx.agenda.delete({ where: { id: infanto.id } });
  await tx.service.delete({ where: { id: svcInfanto.id } });

  // Verificación dentro de la misma transacción.
  const final = await tx.agenda.findUnique({ where: { id: adulto.id }, include: { _count: { select: { professionals: true, blocks: true, historyEntries: true } } } });
  return {
    dispositivo: cfg.nombre,
    externalId: final.externalId,
    profesionales: `${nAdulto} + ${profsInfanto.length} = ${final._count.professionals}`,
    bloquesMovidos: bloques.count,
    bloquesTotal: final._count.blocks,
    historial: final._count.historyEntries,
    auditoriaMovida: audits.count,
    horas: JSON.parse(final.hoursJson),
  };
}

try {
  await prisma.$transaction(async (tx) => {
    for (const cfg of DISPOSITIVOS) console.log(JSON.stringify(await unir(tx, cfg)));
    if (!APLICAR) throw new Simulacion();
  }, { maxWait: 30000, timeout: 120000 });
  console.log('APLICADO: cambios guardados.');
} catch (e) {
  if (e instanceof Simulacion) console.log('SIMULACIÓN OK: no se guardó nada. Ejecuta con --aplicar para guardar.');
  else { console.error('ERROR (no se guardó nada):', e.message); process.exitCode = 1; }
} finally {
  await prisma.$disconnect();
}
