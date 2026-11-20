// Carga las agendas del periodo de programación 2027 desde las planillas de la carpeta
// "Programación 2027\Agendas de Especialidades 2027", como agendas NUEVAS (planningPeriod 2027)
// de los servicios existentes. Las agendas 2026 no se tocan.
//
// Uso:
//   node scripts/importar_periodo_2027.mjs --carpeta "<ruta>"            simulación (no guarda)
//   node scripts/importar_periodo_2027.mjs --carpeta "<ruta>" --aplicar  guarda en la base
//
// Cada actividad de la planilla se resuelve contra el catálogo (profesión + especialidad del
// profesional, con 'No Aplica' como transversal) en este orden:
//   1. texto exacto  2. mismo texto ignorando mayúsculas/tildes/espacios  3. tabla EQUIVALENCIAS
// Si alguna no resuelve, no se guarda nada. La simulación imprime la tabla de equivalencias
// usada para que se revise antes de aplicar.
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { parseAgendaWorkbook } from '../server/lib/agendaImport.js';
import { normalizeText } from '../server/lib/hr.js';

const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
// Recrea una agenda 2027 que ya existe, solo si nadie la ha editado en la plataforma (sin auditoría).
const REEMPLAZAR = args.includes('--reemplazar');
const CARPETA = args[args.indexOf('--carpeta') + 1];
// Procesa solo las planillas cuya ruta contiene este texto (ej. --solo MFyR), para cargar un
// servicio nuevo sin que las agendas 2027 ya cargadas de los otros den error de duplicado.
const SOLO = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null;
if (!CARPETA || !fs.existsSync(CARPETA)) {
  console.error('Falta --carpeta con la ruta de "Agendas de Especialidades 2027".');
  process.exit(1);
}

const PERIODO = 2027;
const VIGENCIA = { desde: '2027-01-01', hasta: '2027-12-31', label: 'Enero - Diciembre 2027' };
const MEDICO = 'Médico(a) Cirujano(a)';
const ENFERMERO = 'Enfermero(a)';

// Planillas -> servicios destino. `destino(prof)` decide a qué servicio va cada hoja (el archivo
// de Gine-Obstetricia trae ambos servicios mezclados) y `especialidad(prof)` la especialidad del
// catálogo de ese profesional (null = la del servicio).
const ARCHIVOS = [
  {
    archivo: 'Cuidados Paliativos/AGENDAS CP dic 2026.xlsx',
    destino: () => 'Cuidados Paliativos',
    profesion: (pr) => (/ENFERM/.test(normalizeText(pr.especialidad)) ? ENFERMERO : MEDICO),
    especialidad: (pr) => (/FAMILIAR/.test(normalizeText(pr.especialidad)) ? 'MEDICINA FAMILIAR' : null),
  },
  {
    archivo: 'Ginecologia y Obstetricia/Agenda Gine - Obste Médicos Diciembre 2026.xlsx',
    destino: (pr) => (/OBSTETRICIA/.test(normalizeText(pr.especialidad)) ? 'Obstetricia' : 'Ginecología'),
    profesion: () => MEDICO,
    especialidad: () => null,
  },
  {
    archivo: 'Neonatologia/Programación 2027 UPCN.xlsx',
    destino: () => 'Neonatología',
    profesion: () => MEDICO,
    especialidad: (pr) => (/PEDIATRIA/.test(normalizeText(pr.especialidad)) ? 'PEDIATRÍA' : null),
  },
  {
    archivo: 'MFyR/Agenda_Medica_MFYR_2027.xlsx',
    destino: () => 'Medicina Física y Rehabilitación',
    profesion: () => MEDICO,
    especialidad: () => null,
  },
];

// Equivalencias para textos de planilla que no existen tal cual en el catálogo. Clave: texto
// normalizado (normalizeText). Valor: actividad del catálogo, o un objeto por servicio/profesión.
// `revisar: true` marca las que son criterio (no solo diferencia de escritura) para la revisión.
const TURNO = { turno: true };
const EQUIVALENCIAS = {
  'CONSULTA NUEVA PRESENCIAL': { [MEDICO]: 'Consulta Nueva de especialidad Presencial', [ENFERMERO]: 'Consulta Nueva Presencial (ESPECIALIDADES)' },
  'CONSULTA NUEVA': { [MEDICO]: 'Consulta Nueva de especialidad Presencial' },
  'CONSULTA NUEVA ESPECIALIDAD': { [MEDICO]: 'Consulta Nueva de especialidad Presencial' },
  'CONSULTA CONTROL PRESENCIAL': { [MEDICO]: 'Consulta Control de especialidad Presencial', [ENFERMERO]: 'Consulta Control  Presencial (ESPECIALIDADES)' },
  'CONSULTA CONTROL ESPECIALIDAD': { [MEDICO]: 'Consulta Control de especialidad Presencial' },
  'CONSULTA ABREVIADA': { [MEDICO]: 'Consulta Abreviada Médica Presencial', [ENFERMERO]: 'Consulta Abreviada no Médica' },
  'CONSULTA ABREVIADA /RECETAS': { [MEDICO]: 'Consulta Abreviada Médica Presencial' },
  'CONSULTA ABREVIADA/RECETAS': { [MEDICO]: 'Consulta Abreviada Médica Presencial' },
  'OTROS ACTIVIDADES CLINICAS': 'Otras Actividades Clínicas',
  'OTRAS ACTIVIDADES CLINICAS': 'Otras Actividades Clínicas',
  'OTRAS ACTIVIDADES NO CLINICAS': 'Otras Actividades No Clínicas',
  'ACTIVIDADES ADMINISTRATIVAS': { [MEDICO]: 'Otras Actividades No Clínicas', [ENFERMERO]: 'OANC Actividades administrativas', revisar: true },
  'INTERCONSULTA A SALA O ACTIVIDAD ENLACE': 'Interconsulta',
  'PROCEDIMIENTOS MEDICOS/OTROS PROFESIONALES': { [MEDICO]: 'Otros procedimientos médicos', [ENFERMERO]: 'Procedimientos No Invasivos (Propios)' },
  'PROCEDIMIENTOS MEDICOS/ OTROS PROFESIONALES': { [MEDICO]: 'Otros procedimientos médicos' },
  'COMITE CLINICO': { [MEDICO]: 'Comité Clínico', [ENFERMERO]: 'Comité clínico' },
  'REUNION CLINICA': 'Reunión Clínica',
  'REUNION TECNICO ADMINISTRATIVA': 'Reunión Técnica Administrativa',
  'REUNION TECNICA ADMINISTRATIVA': 'Reunión Técnica Administrativa',
  'REUNION TECNICO ADMINSITRATIVA': 'Reunión Técnica Administrativa',
  'GESTION DE CASOS': 'Gestión de Casos',
  'GESTION DE CASO': 'Gestión de Casos',
  'GESTION CASO CLINICO': 'Gestión de Casos',
  'GESTION CASOS CLINICOS': 'Gestión de Casos',
  'ADMINISTRATIVO JEFATURA': 'Gestión Organizacional (Administrativo/ Jefatura)',
  'GESTION JEFATURA': 'Gestión Organizacional (Administrativo/ Jefatura)',
  'GESTION ORGANIZACIONAL (ADMINISTRATIVO/JEFATURA)': 'Gestión Organizacional (Administrativo/ Jefatura)',
  'PABELLON CIRUGIA MAYOR': 'Pabellon Cirugía Mayor',
  'PABELLON CIRUGIA MAYOR AMBULATORIA': 'Pabellon Cirugía Mayor Ambulatoria',
  'TELECONSULTORIA': 'Teleconsultoria OTRAS ESPECIALIDADES',
  // --- criterio, para revisión ---
  'VISITA A SALA HOSPITALIZADO': { porServicio: { Obstetricia: 'Visita a sala Hospitalizado cama básica Adulto' }, defecto: 'Atención en sala', revisar: true },
  'VISITA SALA HOSPITALIZADO': { porServicio: { Obstetricia: 'Visita a sala Hospitalizado cama básica Adulto' }, defecto: 'Atención en sala', revisar: true },
  'VISITA PACIENTES HOSPITALIZADAS': { porServicio: { Obstetricia: 'Visita a sala Hospitalizado cama básica Adulto' }, defecto: 'Atención en sala', revisar: true },
  'EDUCACION INDIVIDUAL': { [MEDICO]: 'Otras Actividades Clínicas', [ENFERMERO]: 'Educación Individual', revisar: true },
  'PABELLON CESAREAS ELECTIVAS': { defecto: 'Pabellon Cirugía Obstétrica', revisar: true },
  'PROCEDIMIENTOS ECOGRAFICOS': { defecto: 'Ecografía Obstétrica', revisar: true },
  'PROCEDIENTO ECOGRAFIAS GINECOLOGICAS': { defecto: 'Procedimientos especialidad', revisar: true },
  'REUNION DE SERVICIO': { defecto: 'Reunión Técnica Administrativa', revisar: true },
  'ATENCION NUTRICIONAL INTENSIVA': { defecto: 'Atención en sala', revisar: true },
  // MFyR 2027: el catálogo de Fisiatría no tiene pabellón; decisión del referente (19-11-2026).
  'PABELLON CIRUGIA MENOR': { porServicio: { 'Medicina Física y Rehabilitación': 'Infiltraciones (rehabilitación)' }, revisar: true },
  'REFUERZO TURNO': { ...TURNO, revisar: true },
  'TURNO HOSPITALIZADOS': TURNO,
  'TURNO URGENCIAS': TURNO,
  'TURNO': TURNO,
};

function equivalencia(texto, profesion, servicio) {
  const e = EQUIVALENCIAS[normalizeText(texto)];
  if (e == null) return null;
  if (typeof e === 'string') return { actividad: e, revisar: false };
  if (e.turno) return { turno: true, revisar: !!e.revisar, etiqueta: String(texto).trim() };
  const actividad = e.porServicio?.[servicio] ?? e[profesion] ?? e.defecto ?? null;
  return actividad ? { actividad, revisar: !!e.revisar } : null;
}

const prisma = new PrismaClient();
async function retry(fn, label) {
  for (let i = 1; i <= 8; i++) {
    try { return await fn(); } catch (e) {
      if (!/Can't reach|P1001|P1017|connection/i.test(e.message)) throw e;
      console.log(`  (sin conexión a la base, reintento ${i} — ${label})`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw new Error(`Sin conexión a la base tras reintentos: ${label}`);
}

// ---- Cálculos derivados (mismos criterios que recomputeAgendaDerivedData en server/index.js) ----
const PROCESOS = ['Ambulatorio', 'Hospitalizado', 'Quirúrgico', 'Urgencia'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const LABELS = [];
for (let m = 8 * 60; m < 20 * 60; m += 30) {
  const f = (x) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  LABELS.push(`${f(m)}–${f(m + 30)}`);
}
function horasYDistribucion(bloques) {
  const horas = Object.fromEntries(PROCESOS.map((p) => [p, 0]));
  const dist = Object.fromEntries(DIAS.map((d) => [d, Object.fromEntries(LABELS.map((l) => [l, 0]))]));
  for (const b of bloques) {
    if (b.isShift) continue;
    if (b.process in horas) horas[b.process] += b.durationMinutes / 60;
    if (!dist[b.day]) continue;
    LABELS.forEach((label, i) => {
      const ini = 8 * 60 + i * 30;
      const ov = Math.min(b.startMinutes + b.durationMinutes, ini + 30) - Math.max(b.startMinutes, ini);
      if (ov > 0) dist[b.day][label] += ov / 60;
    });
  }
  return { horas, dist };
}
const rendimiento = (cupos, min) => (!cupos || !min ? 0 : Math.round((cupos / (min / 60)) * 100) / 100);

// ---- 1. Leer planillas y agrupar profesionales por servicio destino ----
const porServicio = new Map(); // servicio -> [{ pr, profesion, especialidad }]
const omitidas = [];
for (const cfg of ARCHIVOS.filter((c) => !SOLO || c.archivo.toLowerCase().includes(SOLO.toLowerCase()))) {
  const parsed = parseAgendaWorkbook(fs.readFileSync(path.join(CARPETA, cfg.archivo)));
  for (const o of parsed.omitidas) if (!/^\d+$/.test(o.sheet.trim()) && !/referencia/.test(o.motivo)) omitidas.push(`${cfg.archivo} › ${o.sheet}: ${o.motivo}`);
  for (const pr of parsed.profesionales) {
    const servicio = cfg.destino(pr);
    if (!porServicio.has(servicio)) porServicio.set(servicio, []);
    porServicio.get(servicio).push({ pr, profesion: cfg.profesion(pr), especialidad: cfg.especialidad(pr), archivo: cfg.archivo });
  }
}

// ---- 2. Resolver actividades contra el catálogo ----
const catalogo = await retry(() => prisma.catalogActivity.findMany(), 'catálogo');
const usadas = new Map(); // "origen → destino" -> { n, revisar, servicios }
const errores = [];
const plan = [];
for (const [servicioNombre, profs] of porServicio) {
  const servicio = await retry(() => prisma.service.findUnique({ where: { name: servicioNombre } }), 'servicio');
  if (!servicio) { errores.push(`No existe el servicio "${servicioNombre}"`); continue; }
  const agenda2026 = await retry(() => prisma.agenda.findFirst({ where: { serviceId: servicio.id, planningPeriod: 2026 }, orderBy: { updatedAt: 'desc' } }), 'agenda 2026');
  const base = (agenda2026?.externalId || servicioNombre).replace(/-20\d\d$/, '');
  const externalId = `${base}-${PERIODO}`;
  const existe = await retry(() => prisma.agenda.findUnique({ where: { externalId }, include: { _count: { select: { audits: true } } } }), 'existe');
  if (existe && !REEMPLAZAR) { errores.push(`Ya existe la agenda ${externalId} — no se duplica (usa --reemplazar para recrearla).`); continue; }
  if (existe && existe._count.audits > 0) { errores.push(`La agenda ${externalId} ya fue editada en la plataforma (${existe._count.audits} cambios) — no se reemplaza.`); continue; }

  const profesionales = [];
  for (const { pr, profesion, especialidad } of profs) {
    const esp = especialidad || servicio.specialtyCatalog;
    const candidatos = catalogo.filter((c) => c.profession === profesion && (c.specialty === esp || c.specialty === 'No Aplica'));
    const buscar = (texto) => {
      const filas = candidatos.filter((c) => c.activity === texto || normalizeText(c.activity) === normalizeText(texto));
      filas.sort((a, b) => (a.specialty === esp ? 0 : 1) - (b.specialty === esp ? 0 : 1) || (a.process === 'Ambulatorio' ? 0 : 1) - (b.process === 'Ambulatorio' ? 0 : 1));
      return filas[0] || null;
    };
    const bloques = [];
    for (const b of pr.bloques) {
      let cat = buscar(b.actividad);
      let eq = null;
      if (!cat) {
        eq = equivalencia(b.actividad, profesion, servicioNombre);
        if (eq?.actividad) cat = buscar(eq.actividad);
      }
      if (!cat && !eq?.turno) {
        errores.push(`${servicioNombre} › ${pr.nombre} (${profesion}/${esp}): "${b.actividad}"${eq ? ` → "${eq.actividad}" no existe para esa profesión/especialidad` : ' sin equivalencia'}`);
        continue;
      }
      if (eq) {
        const key = `${b.actividad}  →  ${eq.turno ? '[TURNO]' : `${cat.process}: ${cat.activity}`}`;
        const u = usadas.get(key) || { n: 0, revisar: eq.revisar, servicios: new Set() };
        u.n++; u.servicios.add(servicioNombre); usadas.set(key, u);
      }
      bloques.push(eq?.turno
        ? { day: b.dia, startMinutes: b.inicioMin, durationMinutes: b.duracionMin, process: null, activity: eq.etiqueta, isShift: true, isClinical: true, hasPerformance: false, performance: 0, box: b.box, observations: `Planilla: ${b.actividad}` }
        : { day: b.dia, startMinutes: b.inicioMin, durationMinutes: b.duracionMin, process: cat.process, activity: cat.activity, catalogActivityId: cat.id, isShift: false, isClinical: cat.isClinical, hasPerformance: cat.hasPerformance && b.cupos != null, performance: rendimiento(b.cupos, b.duracionMin), box: b.box });
    }
    profesionales.push({ pr, profesion, especialidad, bloques });
  }
  plan.push({ servicio, agenda2026, externalId, profesionales, reemplazaId: existe?.id ?? null });
}

// ---- 3. Informe ----
console.log(`\n===== PERIODO ${PERIODO} (${VIGENCIA.desde} a ${VIGENCIA.hasta}) — ${APLICAR ? 'APLICANDO' : 'SIMULACIÓN'} =====`);
for (const p of plan) {
  const nb = p.profesionales.reduce((s, x) => s + x.bloques.length, 0);
  const { horas } = horasYDistribucion(p.profesionales.flatMap((x) => x.bloques));
  const otrasEsp = p.profesionales.filter((x) => x.especialidad).map((x) => `${x.pr.nombre} (${x.especialidad})`);
  const tipos = {}; p.profesionales.forEach((x) => (tipos[x.profesion] = (tipos[x.profesion] || 0) + 1));
  console.log(`\n▶ ${p.servicio.name} → nueva agenda ${p.externalId}  [2026: ${p.agenda2026?.externalId || '—'}]`);
  console.log(`  ${p.profesionales.length} profesionales ${JSON.stringify(tipos)}, ${nb} bloques, horas ${JSON.stringify(Object.fromEntries(Object.entries(horas).map(([k, v]) => [k, Math.round(v * 10) / 10])))}`);
  if (otrasEsp.length) console.log(`  con especialidad propia: ${otrasEsp.join('; ')}`);
}
console.log('\n--- Hojas omitidas (vacías o sin formato de horario) ---');
omitidas.forEach((o) => console.log('  ' + o));
console.log('\n--- Equivalencias aplicadas (texto planilla → catálogo) [bloques] ---');
const filas = [...usadas.entries()].sort((a, b) => Number(b[1].revisar) - Number(a[1].revisar) || a[0].localeCompare(b[0]));
for (const [k, u] of filas) console.log(`  ${u.revisar ? '⚠ REVISAR ' : '          '}${k}  [${u.n}] (${[...u.servicios].join(', ')})`);
if (errores.length) {
  console.log('\n--- ERRORES (no se guarda nada) ---');
  errores.forEach((e) => console.log('  ✖ ' + e));
  process.exitCode = 1;
  await prisma.$disconnect();
  process.exit();
}

// ---- 4. Guardar ----
if (!APLICAR) {
  console.log('\nSIMULACIÓN OK: no se guardó nada. Ejecuta con --aplicar para guardar.');
  await prisma.$disconnect();
  process.exit();
}
const fecha = new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Santiago' });
await retry(() => prisma.$transaction(async (tx) => {
  for (const p of plan) {
    if (p.reemplazaId) await tx.agenda.delete({ where: { id: p.reemplazaId } });
    const todos = p.profesionales.flatMap((x) => x.bloques);
    const { horas, dist } = horasYDistribucion(todos);
    const agenda = await tx.agenda.create({
      data: {
        externalId: p.externalId,
        serviceId: p.servicio.id,
        serviceSpecialty: p.servicio.specialtyCatalog,
        serviceName: p.servicio.name,
        chiefName: p.agenda2026?.chiefName || p.servicio.chiefName || 'Sin jefe',
        chiefUserId: p.agenda2026?.chiefUserId ?? null,
        monthLabel: VIGENCIA.label,
        planningPeriod: PERIODO,
        validFrom: new Date(VIGENCIA.desde),
        validTo: new Date(VIGENCIA.hasta),
        status: 'borrador',
        version: 1,
        lastUpdated: BigInt(Date.now()),
        hoursJson: JSON.stringify(horas),
        distributionJson: JSON.stringify(dist),
      },
    });
    for (const [i, x] of p.profesionales.entries()) {
      const rutDigits = x.pr.rut ? x.pr.rut.replace(/[^0-9kK]/g, '') : null;
      const prof = await tx.agendaProfessional.create({
        data: {
          agendaId: agenda.id,
          externalId: `${p.externalId}-${rutDigits || x.pr.sheet.replace(/\W+/g, '')}`,
          name: x.pr.nombre,
          type: x.profesion,
          professionCatalog: x.profesion,
          rut: rutDigits ? rutDigits.slice(0, -1) : null,
          specialtyCatalog: x.especialidad,
          sortOrder: i,
        },
      });
      if (x.bloques.length) await tx.agendaBlock.createMany({ data: x.bloques.map((b) => ({ ...b, agendaId: agenda.id, professionalId: prof.id })) });
    }
    await tx.agendaHistory.create({
      data: {
        agendaId: agenda.id, dateLabel: fecha, action: `Creada para el periodo ${PERIODO} por importación de planilla`, userName: 'DDI', sortOrder: 0,
        comment: `Carga inicial de la programación ${PERIODO} desde la carpeta "Agendas de Especialidades ${PERIODO}".`,
      },
    });
    console.log(`  ✔ ${p.externalId} creada`);
  }
}, { maxWait: 30000, timeout: 180000 }), 'transacción');
console.log('\nAPLICADO: agendas 2027 guardadas.');
await prisma.$disconnect();
