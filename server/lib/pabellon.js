import * as XLSX from 'xlsx';
import { normalizeText } from './hr.js';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
// normalizeText quita tildes (NFD + strip de marcas combinantes), así que "Mañana" normaliza a
// "MANANA", no "MAÑANA" — hay que comparar contra la forma ya normalizada.
const JORNADAS_VALIDAS = new Set(['MANANA', 'TARDE']);

// Cada grupo de columnas es una tabla de pabellón independiente dentro de la misma hoja:
// [colTitulo, colPabellon, colJornada, colPrimerDia]. El número de días (hasta Sábado, según
// cuántas columnas de día trae esa tabla) se detecta solo leyendo la fila de encabezado.
function findGroups(headerRow) {
  const groups = [];
  for (let c = 0; c < headerRow.length; c += 1) {
    if (normalizeText(headerRow[c]) === 'PABELLON') {
      // La columna del titulo del grupo es la primera columna no vacía antes de "Pabellon"
      // en esa misma zona de la hoja (título de sección, una fila arriba).
      groups.push({ colPabellon: c, colJornada: c + 1, colDiaInicio: c + 2 });
    }
  }
  return groups;
}

export function parsePabellonWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  if (rows.length < 3) {
    throw new Error('La hoja no tiene el formato esperado (título, encabezado, datos).');
  }

  const tituloRow = rows[0];
  const headerRow = rows[1];
  const groups = findGroups(headerRow);
  if (groups.length === 0) {
    throw new Error('No se encontró ninguna columna "Pabellon" en la hoja.');
  }

  // Cuántas columnas de día trae cada grupo (hasta la próxima columna vacía en el encabezado).
  for (const g of groups) {
    let count = 0;
    for (let c = g.colDiaInicio; c < headerRow.length; c += 1) {
      const label = normalizeText(headerRow[c]);
      if (!label) break;
      count += 1;
    }
    g.dias = DIAS.slice(0, count);
    g.grupo = String(tituloRow[g.colPabellon] ?? tituloRow[g.colPabellon - 1] ?? '').trim() || `Grupo ${g.colPabellon}`;
  }

  const allocations = [];
  let ultimoPabellon = {};
  for (let r = 2; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row) continue;
    for (const g of groups) {
      const jornadaRaw = normalizeText(row[g.colJornada]);
      if (!JORNADAS_VALIDAS.has(jornadaRaw)) continue; // salta títulos tipo "Planes", filas vacías, etc.
      const pabellonCell = row[g.colPabellon];
      const pabellon = pabellonCell !== null && pabellonCell !== undefined && String(pabellonCell).trim()
        ? String(pabellonCell).trim()
        : ultimoPabellon[g.colPabellon];
      if (!pabellon) continue;
      ultimoPabellon[g.colPabellon] = pabellon;
      const jornada = jornadaRaw === 'MANANA' ? 'Mañana' : 'Tarde';
      g.dias.forEach((dia, idx) => {
        const especialidadTexto = String(row[g.colDiaInicio + idx] ?? '').trim();
        if (!especialidadTexto) return;
        allocations.push({ grupo: g.grupo, pabellon, jornada, dia, especialidadTexto });
      });
    }
  }

  return { sheetName, allocations };
}

// Texto tal cual viene en la planilla (a veces junta más de una especialidad separadas por "/",
// uso compartido de un mismo pabellón) -> lista de nombres de servicio canónicos de la app. Un
// fragmento que no matchea ningún servicio conocido se deja tal cual (útil para mostrar "no
// cargado todavía" en vez de perderlo silenciosamente).
const FRAGMENTO_A_SERVICIO = {
  'DENTAL': 'Dental',
  'GINECOLOGIA': 'Ginecología',
  'GINE': 'Ginecología',
  'GINE-OBST.': 'Ginecología',
  'GINE OBST': 'Ginecología',
  'MFR': 'Medicina Física y Rehabilitación',
  'OFTALMOLOGIA': 'Oftalmología',
  'TRAUMATOLOGIA': 'Traumatología',
  'OTORRINOLOGIA': 'Otorrinolaringología',
  'OTORRINO': 'Otorrinolaringología',
  'OTORRINOLARINGOLOGIA': 'Otorrinolaringología',
  'CIR. INFANTIL': 'Cirugía Infantil',
  'CIR INFANTIL': 'Cirugía Infantil',
  'CIR. ADULTO': 'Cirugía Adulto',
  'CIR ADULTO': 'Cirugía Adulto',
  'CIR. A.': 'Cirugía Adulto',
  'CIR A': 'Cirugía Adulto',
  'CIRUGIA': 'Cirugía Adulto',
  'URO': 'Urología Adulto',
  'UROLOGIA': 'Urología Adulto',
  'SEO': 'SEO',
  'EDA': 'Endoscopia y Gastroenterología',
  'EDA. IND.': 'Endoscopia y Gastroenterología',
  'EDA IND': 'Endoscopia y Gastroenterología',
  'URGENCIA': 'Urgencia',
};

export function resolveServiciosDesdeTexto(especialidadTexto) {
  const fragmentos = especialidadTexto.split('/').map((f) => f.trim()).filter(Boolean);
  return fragmentos.map((f) => FRAGMENTO_A_SERVICIO[normalizeText(f)] || f);
}
