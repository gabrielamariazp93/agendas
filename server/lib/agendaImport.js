import * as XLSX from 'xlsx';
import { normalizeText } from './hr.js';

const DIAS_VALIDAS = new Set(['LUNES', 'MARTES', 'MIERCOLES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'SÁBADO', 'DOMINGO']);
const DIA_MAP = {
  LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', MIÉRCOLES: 'Miércoles',
  JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado', SÁBADO: 'Sábado', DOMINGO: 'Domingo',
};
const RUT_RE = /^\d{1,2}[.\d]*-[\dkK]$/;

// Pestañas de referencia/resumen/plantilla que aparecen en prácticamente todas las planillas de
// programación del hospital y NUNCA son un horario real — se excluyen explícitamente en vez de
// confiar solo en la detección dinámica de 'DIA', porque "prestaciones" en particular es una
// tabla de catálogo que puede producir falsos positivos (columnas que coinciden por casualidad).
const HOJAS_EXCLUIDAS = new Set([
  'PROFESIONALES', 'RESUMEN', 'RESUMEN2', 'INDICADORES', 'PROGRAMACION_SEMANAL',
  'PRESTACIONES', 'EXCELL', 'TABLAS', 'CALENDARIO CONSOLIDADO', 'RESUMEN HORAS MÉDICO',
  'RESUMEN HORAS MEDICO', 'HOJA1', 'HOJA2', 'HOJA3', 'CONSULTORIAS',
]);

function toMinutes(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return value.getUTCHours() * 60 + value.getUTCMinutes();
  }
  if (typeof value === 'number') {
    // Serial de Excel: fracción de día (ej. 0.354166 = 08:30). Si viene como número entero de
    // horas totales (raro, pero posible según formato de celda) se descarta como hora inválida.
    if (value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      return totalMinutes;
    }
    return null;
  }
  return null;
}

// Busca la celda 'DIA' escaneando las primeras filas/columnas de la hoja — evita asumir una
// posición fija de columna, porque varias planillas reales traen corrimientos de 1 columna
// (ver casos encontrados manualmente: Neurología Adulto, Ps. Carla Fuentes en CESAM CIAS).
function findHeader(rows, maxScanRows = 12) {
  const limit = Math.min(rows.length, maxScanRows);
  for (let r = 0; r < limit; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (normalizeText(row[c]) === 'DIA') {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function colIndexFor(headerRow, baseCol, ...keywords) {
  for (let idx = baseCol; idx < headerRow.length; idx++) {
    const val = normalizeText(headerRow[idx]);
    if (!val) continue;
    if (keywords.some((kw) => val.includes(kw))) return idx;
  }
  return null;
}

// Algunas hojas reales traen el bloque RUT/NOMBRE/ESPECIALIDAD y la grilla de horario pero se
// les borró la fila de encabezado DIA/DESDE/HASTA/... (ej. Dra. Motrán, Gine-Obstetricia 2027).
// Si bajo el rótulo 'RUT' aparecen filas que parten con un día de la semana en esa misma columna,
// se asume el orden estándar de la plantilla: DIA, DESDE, HASTA, ∆, ACTIVIDAD, BOX, CUPOS.
const COLUMNAS_PLANTILLA = ['DIA', 'DESDE', 'HASTA', '∆', 'ACTIVIDAD', 'BOX', 'CUPOS'];
function findHeaderlessGrid(rows, maxScanRows = 12) {
  for (let r = 0; r < Math.min(rows.length, maxScanRows); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (normalizeText(row[c]) !== 'RUT') continue;
      for (let d = r + 1; d < Math.min(rows.length, r + 12); d++) {
        if (DIAS_VALIDAS.has(normalizeText((rows[d] || [])[c]))) {
          const virtualHeader = [];
          COLUMNAS_PLANTILLA.forEach((label, i) => { virtualHeader[c + i] = label; });
          return { row: d - 1, col: c, virtualHeader };
        }
      }
    }
  }
  return null;
}

function parseSheet(sheetName, rows) {
  const header = findHeader(rows) || findHeaderlessGrid(rows);
  if (!header) {
    return { sheet: sheetName, omitida: true, motivo: 'Sin fila de encabezado "DIA" — no es una hoja de horario.' };
  }
  const { row: headerRow, col: diaCol } = header;
  const identCol = diaCol + 4;

  // Busca la fila con el rótulo 'RUT' escaneando hacia arriba desde el encabezado, en la misma
  // columna que 'DIA' — cubre planillas con filas en blanco extra antes del bloque de identidad.
  let rutRow = null;
  for (let r = headerRow - 1; r >= Math.max(headerRow - 9, 0); r--) {
    if (normalizeText((rows[r] || [])[diaCol]) === 'RUT') { rutRow = r; break; }
  }
  if (rutRow == null) rutRow = Math.max(headerRow - 6, 0);

  const cellIdent = (offset, c) => (rows[rutRow + offset] || [])[c] ?? null;
  let rut = cellIdent(0, identCol);
  let nombre = cellIdent(1, identCol);
  const especialidad = cellIdent(2, identCol);

  if (rut != null && !RUT_RE.test(String(rut).trim())) {
    if (nombre != null && RUT_RE.test(String(nombre).trim())) {
      const tmp = rut; rut = nombre; nombre = tmp;
    }
  }

  const headerRowValues = header.virtualHeader || rows[headerRow] || [];
  const idxDesde = colIndexFor(headerRowValues, diaCol, 'DESDE');
  const idxHasta = colIndexFor(headerRowValues, diaCol, 'HASTA');
  const idxActividad = colIndexFor(headerRowValues, diaCol, 'ACTIVIDAD');
  const idxBox = colIndexFor(headerRowValues, diaCol, 'BOX');
  const idxCupos = colIndexFor(headerRowValues, diaCol, 'CUPOS');

  const bloques = [];
  const advertencias = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const diaRaw = row[diaCol];
    if (diaRaw == null || String(diaRaw).trim() === '') continue;
    const diaNorm = normalizeText(diaRaw);
    if (!DIAS_VALIDAS.has(diaNorm)) break;

    const actividad = idxActividad != null ? row[idxActividad] : null;
    if (actividad == null || String(actividad).trim() === '') continue;

    const desde = idxDesde != null ? row[idxDesde] : null;
    const hasta = idxHasta != null ? row[idxHasta] : null;
    const inicio = toMinutes(desde);
    const fin = toMinutes(hasta);
    if (inicio == null || fin == null) {
      advertencias.push(`Fila ${r + 1} (${DIA_MAP[diaNorm]}): DESDE/HASTA no es una hora válida — descartada.`);
      continue;
    }
    const duracion = fin - inicio;
    if (duracion <= 0) continue;

    bloques.push({
      dia: DIA_MAP[diaNorm],
      inicioMin: inicio,
      duracionMin: duracion,
      actividad: String(actividad).trim(),
      box: idxBox != null && row[idxBox] != null ? String(row[idxBox]).trim() : null,
      cupos: idxCupos != null && typeof row[idxCupos] === 'number' ? row[idxCupos] : null,
    });
  }

  // Dedup por (dia, inicio, fin, actividad) — mismo criterio usado en todas las importaciones
  // manuales de esta sesión, por si la hoja repite una fila.
  const seen = new Set();
  const dedup = [];
  for (const b of bloques) {
    const key = `${b.dia}|${b.inicioMin}|${b.inicioMin + b.duracionMin}|${b.actividad}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(b);
  }

  return {
    sheet: sheetName,
    omitida: false,
    rut: rut != null ? String(rut).trim() : null,
    nombre: nombre != null ? String(nombre).trim() : sheetName,
    especialidad: especialidad != null ? String(especialidad).trim() : null,
    bloques: dedup,
    advertencias,
  };
}

// Parsea el workbook completo: una hoja por profesional, con el mismo formato usado en todas las
// planillas de programación del hospital (bloque RUT/NOMBRE/ESPECIALIDAD/EQUIPO CLINICO seguido
// de la grilla DIA/DESDE/HASTA/ACTIVIDAD/BOX/CUPOS). Hojas sin ese formato (resúmenes, catálogos,
// plantillas en blanco) se omiten automáticamente al no encontrar la fila 'DIA'.
export function parseAgendaWorkbook(buffer) {
  // cellDates: false a propósito — las horas (DESDE/HASTA) se leen como fracción de día (número
  // serial de Excel, ver toMinutes). Con cellDates: true la librería las convierte en fechas de
  // 1899, y en zona horaria de Chile ese año usaba hora media local (UTC−4:42:46): al leerlas en
  // UTC todos los horarios quedaban corridos +4h42 (08:00 -> 12:42).
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const resultados = [];
  const omitidas = [];

  for (const sheetName of workbook.SheetNames) {
    // Las hojas con nombre solo numérico suelen ser plantillas, pero algunas planillas (ej. MFyR
    // 2027) numeran así las hojas de cada profesional: esas se leen igual y se aceptan solo si
    // traen nombre y bloques reales (más abajo).
    const hojaNumerica = /^\d+$/.test(sheetName.trim());
    if (HOJAS_EXCLUIDAS.has(normalizeText(sheetName))) {
      omitidas.push({ sheet: sheetName, motivo: 'Pestaña de referencia/plantilla conocida — no es un horario.' });
      continue;
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    const parsed = parseSheet(sheetName, rows);
    if (parsed.omitida) {
      omitidas.push({ sheet: sheetName, motivo: parsed.motivo });
      continue;
    }
    if (hojaNumerica && (!parsed.nombre || parsed.nombre === sheetName.trim())) {
      omitidas.push({ sheet: sheetName, motivo: 'Pestaña de referencia/plantilla conocida — no es un horario.' });
      continue;
    }
    if (parsed.bloques.length === 0) {
      omitidas.push({ sheet: sheetName, motivo: 'Sin bloques de horario con datos reales.' });
      continue;
    }
    resultados.push(parsed);
  }

  return { profesionales: resultados, omitidas };
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Superposición de palabras (coeficiente de solapamiento: palabras compartidas / palabras del
// más corto de los dos) — a diferencia de Levenshtein puro, esto no castiga que el catálogo
// agregue palabras en MEDIO del texto ("Consulta Nueva Presencial" -> "Consulta Nueva DE
// ESPECIALIDAD Presencial") ni que el origen tenga palabras de más al final ("Interconsulta a
// sala o actividad enlace" -> "Interconsulta"), que son justamente los patrones reales más
// comunes encontrados durante la sesión.
function overlapPalabras(a, b) {
  const wordsA = new Set(normalizeText(a).split(' ').filter(Boolean));
  const wordsB = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let compartidas = 0;
  for (const w of wordsA) if (wordsB.has(w)) compartidas++;
  return compartidas / Math.min(wordsA.size, wordsB.size);
}

// Similitud 0..1 combinando dos señales: Levenshtein sobre texto normalizado (bueno para
// mayúsculas/tildes/tipeos de una sola palabra) y solapamiento de palabras (bueno para
// sufijos/prefijos agregados o quitados). Se toma el máximo de las dos porque son
// complementarias, no cada una un caso particular de la otra.
function similarity(a, b) {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  const maxLen = Math.max(normA.length, normB.length) || 1;
  const porLetras = 1 - levenshtein(normA, normB) / maxLen;
  const porPalabras = overlapPalabras(a, b) * 0.92; // pequeño descuento para no empatar siempre con match exacto
  return Math.max(porLetras, porPalabras);
}

const SUGERENCIA_UMBRAL = 0.35;
const SUGERENCIAS_MAX = 3;

function sugerirActividades(actividad, candidatos) {
  return candidatos
    .map((c) => ({ actividad: c, score: similarity(actividad, c) }))
    .filter((c) => c.score >= SUGERENCIA_UMBRAL)
    .sort((a, b) => b.score - a.score)
    .slice(0, SUGERENCIAS_MAX)
    .map((c) => c.actividad);
}

// Valida cada actividad distinta contra el catálogo real (profession + specialty, con 'No
// Aplica' como fallback transversal) — exige coincidencia EXACTA de texto (o, si el llamador ya
// confirmó una corrección puntual vía `overrides`, coincidencia exacta del texto corregido). A
// diferencia de las importaciones manuales hechas durante la sesión, esto no corrige nada solo:
// cuando no hay match, se calculan sugerencias por similitud de texto contra el catálogo real
// para que el usuario elija una y la confirme explícitamente en un siguiente intento — nunca se
// aplica una corrección sin que alguien la haya visto y aceptado.
export async function validateAgendaImport(prisma, profesionales, { profession, specialty, overrides = {} }) {
  const actividades = new Set();
  for (const p of profesionales) {
    for (const b of p.bloques) actividades.add(b.actividad);
  }

  const catalogo = await prisma.catalogActivity.findMany({
    where: { profession, specialty: { in: [specialty, 'No Aplica'] } },
  });
  const candidatosTexto = [...new Set(catalogo.map((c) => c.activity))];

  const catalogMap = new Map();
  const errores = [];
  for (const actividad of actividades) {
    const textoBuscado = overrides[actividad] || actividad;
    const rows = catalogo.filter((c) => c.activity === textoBuscado);
    rows.sort((a, b) => {
      const bySpecialty = (a.specialty === specialty ? 0 : 1) - (b.specialty === specialty ? 0 : 1);
      if (bySpecialty !== 0) return bySpecialty;
      return (a.process === 'Ambulatorio' ? 0 : 1) - (b.process === 'Ambulatorio' ? 0 : 1);
    });
    if (rows[0]) {
      catalogMap.set(actividad, rows[0]);
    } else {
      errores.push({
        actividad,
        mensaje: `"${textoBuscado}" no existe en el catálogo para ${profession} / ${specialty}.`,
        sugerencias: sugerirActividades(textoBuscado, candidatosTexto),
      });
    }
  }

  return { catalogMap, errores };
}

function cuposToRendimiento(cupos, duracionMin) {
  if (!cupos || !duracionMin) return 0;
  return Math.round((cupos / (duracionMin / 60)) * 100) / 100;
}

// Aplica el import ya validado dentro de una transacción. En modo 'update' reemplaza TODOS los
// profesionales/bloques de la agenda existente (mismo criterio que las actualizaciones manuales
// de esta sesión — ej. Ginecología/Obstetricia) y sube la versión; en modo 'create' crea el
// Service + Agenda nuevos desde cero.
export async function applyAgendaImport(tx, { mode, profession, specialty, profesionales, catalogMap, existingAgenda, nuevaAgendaConfig }) {
  let agendaId;
  let externalId;

  if (mode === 'update') {
    agendaId = existingAgenda.id;
    externalId = existingAgenda.externalId;
    const actuales = await tx.agendaProfessional.findMany({ where: { agendaId } });
    const idsActuales = actuales.map((p) => p.id);
    if (idsActuales.length > 0) {
      await tx.agendaBlock.deleteMany({ where: { professionalId: { in: idsActuales } } });
      await tx.agendaProfessional.deleteMany({ where: { id: { in: idsActuales } } });
    }
    await tx.agenda.update({
      where: { id: agendaId },
      data: { version: existingAgenda.version + 1, lastUpdated: BigInt(Date.now()) },
    });
  } else {
    const service = await tx.service.create({
      data: {
        name: nuevaAgendaConfig.serviceName,
        specialtyCatalog: specialty,
        chiefName: nuevaAgendaConfig.chiefName || profesionales[0]?.nombre || 'Sin jefe',
        groupName: nuevaAgendaConfig.groupName || null,
      },
    });
    externalId = nuevaAgendaConfig.externalId;
    const agenda = await tx.agenda.create({
      data: {
        externalId,
        serviceId: service.id,
        serviceSpecialty: specialty,
        serviceName: nuevaAgendaConfig.serviceName,
        chiefName: nuevaAgendaConfig.chiefName || profesionales[0]?.nombre || 'Sin jefe',
        monthLabel: nuevaAgendaConfig.monthLabel,
        validFrom: nuevaAgendaConfig.validFrom ? new Date(nuevaAgendaConfig.validFrom) : null,
        validTo: nuevaAgendaConfig.validTo ? new Date(nuevaAgendaConfig.validTo) : null,
        status: 'borrador',
        version: 1,
        lastUpdated: BigInt(Date.now()),
      },
    });
    agendaId = agenda.id;
  }

  let totalBloques = 0;
  for (const p of profesionales) {
    const rutDigits = p.rut ? p.rut.replace(/[^0-9kK]/g, '') : null;
    const professional = await tx.agendaProfessional.create({
      data: {
        agendaId,
        externalId: `${externalId}-${rutDigits || p.sheet.replace(/\W+/g, '')}`,
        name: p.nombre,
        type: profession,
        professionCatalog: profession,
        rut: rutDigits ? rutDigits.slice(0, -1) : null,
      },
    });

    const blocksData = p.bloques.map((b) => {
      const cat = catalogMap.get(b.actividad);
      return {
        agendaId,
        professionalId: professional.id,
        day: b.dia,
        startMinutes: b.inicioMin,
        durationMinutes: b.duracionMin,
        process: cat.process,
        activity: cat.activity,
        catalogActivityId: cat.id,
        isClinical: cat.isClinical,
        hasPerformance: cat.hasPerformance && b.cupos != null,
        performance: cuposToRendimiento(b.cupos, b.duracionMin),
        box: b.box,
      };
    });
    if (blocksData.length > 0) {
      await tx.agendaBlock.createMany({ data: blocksData });
      totalBloques += blocksData.length;
    }
  }

  return { agendaId, externalId, profesionales: profesionales.length, bloques: totalBloques };
}
