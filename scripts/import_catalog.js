import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

const DEFAULT_XLSX_PATH = '/Users/pabloabarca/Downloads/Listado de actividades.xlsx';
const xlsxPath = process.argv[2] || process.env.CATALOG_XLSX_PATH || DEFAULT_XLSX_PATH;

const SERVICE_SPECIALTIES = [
  { name: 'Cardiología', specialtyCatalog: 'CARDIOLOGÍA ADULTO', chiefName: 'Dr. Rojas' },
  { name: 'Oftalmología', specialtyCatalog: 'OFTALMOLOGÍA', chiefName: 'Dra. Molina' },
  { name: 'Traumatología', specialtyCatalog: 'TRAUMATOLOGÍA Y ORTOPEDIA ADULTO', chiefName: 'Dr. Peña' },
  { name: 'Medicina Interna', specialtyCatalog: 'MEDICINA INTERNA', chiefName: 'Dr. Soto' },
  { name: 'Otorrinolaringología', specialtyCatalog: 'OTORRINOLARINGOLOGÍA', chiefName: 'Dra. Contreras' },
  { name: 'Ginecología', specialtyCatalog: 'GINECOLOGÍA ADULTO', chiefName: 'Dra. Vega' },
];

const LOCAL_PERFORMANCE_RULES = [
  {
    specialty: 'CARDIOLOGÍA ADULTO',
    values: {
      'Consulta Nueva de especialidad Presencial': 3,
      'Consulta Control de especialidad Presencial': 3,
      'Telemedicina Nueva (Teleinterconsulta asincrónica)': 3,
      'Telemedicina Nueva (teleinterconsulta Sincrónica)': 3,
      'Telemedicina: Teleconsulta Nueva': 3,
      'Telemedicina control (Teleinterconsulta asincrónica)': 3,
      'Telemedicina Control (Teleinterconsulta sincrónica)': 3,
      'Telemedicina: Teleconsulta Control': 3,
    },
  },
  {
    specialty: 'OFTALMOLOGÍA',
    values: {
      'Consulta Nueva de especialidad Presencial': 4,
      'Consulta Control de especialidad Presencial': 4,
      'Telemedicina Nueva (Teleinterconsulta asincrónica)': 4,
      'Telemedicina Nueva (teleinterconsulta Sincrónica)': 4,
      'Telemedicina: Teleconsulta Nueva': 4,
      'Telemedicina control (Teleinterconsulta asincrónica)': 4,
      'Telemedicina Control (Teleinterconsulta sincrónica)': 4,
      'Telemedicina: Teleconsulta Control': 4,
    },
  },
  {
    specialty: 'TRAUMATOLOGÍA Y ORTOPEDIA ADULTO',
    values: {
      'Consulta Nueva de especialidad Presencial': 3,
      'Consulta Control de especialidad Presencial': 4,
      'Telemedicina Nueva (Teleinterconsulta asincrónica)': 3,
      'Telemedicina Nueva (teleinterconsulta Sincrónica)': 3,
      'Telemedicina: Teleconsulta Nueva': 3,
      'Telemedicina control (Teleinterconsulta asincrónica)': 4,
      'Telemedicina Control (Teleinterconsulta sincrónica)': 4,
      'Telemedicina: Teleconsulta Control': 4,
    },
  },
  {
    specialty: 'MEDICINA INTERNA',
    values: {
      'Consulta Nueva de especialidad Presencial': 3,
      'Consulta Control de especialidad Presencial': 3,
      'Telemedicina Nueva (Teleinterconsulta asincrónica)': 3,
      'Telemedicina Nueva (teleinterconsulta Sincrónica)': 3,
      'Telemedicina: Teleconsulta Nueva': 3,
      'Telemedicina control (Teleinterconsulta asincrónica)': 3,
      'Telemedicina Control (Teleinterconsulta sincrónica)': 3,
      'Telemedicina: Teleconsulta Control': 3,
    },
  },
  {
    specialty: 'OTORRINOLARINGOLOGÍA',
    values: {
      'Consulta Nueva de especialidad Presencial': 3,
      'Consulta Control de especialidad Presencial': 4,
      'Telemedicina Nueva (Teleinterconsulta asincrónica)': 3,
      'Telemedicina Nueva (teleinterconsulta Sincrónica)': 3,
      'Telemedicina: Teleconsulta Nueva': 3,
      'Telemedicina control (Teleinterconsulta asincrónica)': 4,
      'Telemedicina Control (Teleinterconsulta sincrónica)': 4,
      'Telemedicina: Teleconsulta Control': 4,
    },
  },
  {
    specialty: 'GINECOLOGÍA ADULTO',
    values: {
      'Consulta Nueva de especialidad Presencial': 3,
      'Consulta Control de especialidad Presencial': 4,
      'Telemedicina Nueva (Teleinterconsulta asincrónica)': 3,
      'Telemedicina Nueva (teleinterconsulta Sincrónica)': 3,
      'Telemedicina: Teleconsulta Nueva': 3,
      'Telemedicina control (Teleinterconsulta asincrónica)': 4,
      'Telemedicina Control (Teleinterconsulta sincrónica)': 4,
      'Telemedicina: Teleconsulta Control': 4,
    },
  },
];

async function extractCatalog() {
  const { stdout } = await execFileAsync('python3', ['scripts/extract_catalog.py', xlsxPath], {
    cwd: process.cwd(),
    maxBuffer: 50 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

async function upsertServices() {
  for (const service of SERVICE_SPECIALTIES) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {
        specialtyCatalog: service.specialtyCatalog,
        chiefName: service.chiefName,
      },
      create: service,
    });
  }
}

async function replaceCatalog(catalog) {
  await prisma.catalogActivity.deleteMany();

  for (const row of catalog) {
    await prisma.catalogActivity.create({
      data: row,
    });
  }
}

async function seedReferencePerformances() {
  await prisma.referencePerformance.deleteMany();

  for (const specialtyRule of LOCAL_PERFORMANCE_RULES) {
    for (const [activity, localValue] of Object.entries(specialtyRule.values)) {
      await prisma.referencePerformance.create({
        data: {
          process: 'Ambulatorio',
          activity,
          specialty: specialtyRule.specialty,
          nationalValue: null,
          localValue,
          notes: 'Valor local inicial cargado sin PDF normativo nacional adjunto.',
        },
      });
    }
  }
}

async function seedNormativeDocumentPlaceholders() {
  const placeholders = [
    {
      title: 'RPE N°21 (MINSAL)',
      summary: 'Pendiente de adjuntar PDF. Se deja placeholder para futura carga documental y extracción de rendimientos nacionales.',
      filePath: null,
    },
    {
      title: 'Ord. N°0214 (Servicio de Salud Coquimbo)',
      summary: 'Pendiente de adjuntar PDF. Se deja placeholder para futura carga documental y trazabilidad de rendimientos locales.',
      filePath: null,
    },
    {
      title: 'Resolución RES/2226-2026 (Comité de Programación HSJD La Serena)',
      summary: 'Pendiente de adjuntar PDF. Se deja placeholder para futura referencia normativa y contexto institucional.',
      filePath: null,
    },
  ];

  await prisma.normativeDocument.deleteMany();
  for (const doc of placeholders) {
    await prisma.normativeDocument.create({ data: doc });
  }
}

async function main() {
  const extracted = await extractCatalog();

  await upsertServices();
  await replaceCatalog(extracted.catalog);
  await seedReferencePerformances();
  await seedNormativeDocumentPlaceholders();

  console.log(JSON.stringify({
    xlsxPath,
    rowsRead: extracted.rowsRead,
    rowsImported: extracted.rowsImported,
    servicesUpdated: SERVICE_SPECIALTIES.length,
    referencePerformanceRows: LOCAL_PERFORMANCE_RULES.reduce((sum, item) => sum + Object.keys(item.values).length, 0),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
