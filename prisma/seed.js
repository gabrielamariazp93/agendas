import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../server/lib/auth.js';

const prisma = new PrismaClient();

const services = [
  { name: 'Cardiología', specialtyCatalog: 'CARDIOLOGÍA ADULTO', chiefName: 'Dr. Rojas' },
  { name: 'Oftalmología', specialtyCatalog: 'OFTALMOLOGÍA', chiefName: 'Dra. Molina' },
  { name: 'Traumatología', specialtyCatalog: 'TRAUMATOLOGÍA Y ORTOPEDIA ADULTO', chiefName: 'Dr. Peña' },
  { name: 'Medicina Interna', specialtyCatalog: 'MEDICINA INTERNA', chiefName: 'Dr. Soto' },
  { name: 'Otorrinolaringología', specialtyCatalog: 'OTORRINOLARINGOLOGÍA', chiefName: 'Dra. Contreras' },
  { name: 'Ginecología', specialtyCatalog: 'GINECOLOGÍA ADULTO', chiefName: 'Dra. Vega' },
];

const users = [
  { email: 'admin@hospital.local', name: 'Administrador DDI', role: 'admin', serviceName: null },
  { email: 'referente@hospital.local', name: 'Referente Programacion', role: 'referente_programacion', serviceName: null },
  { email: 'admision@hospital.local', name: 'Equipo Admision', role: 'admision', serviceName: null },
  { email: 'subdireccion@hospital.local', name: 'Subdireccion Ambulatoria', role: 'subdirector', serviceName: null },
  { email: 'cardiologia@hospital.local', name: 'Dr. Rojas', role: 'jefe_servicio', serviceName: 'Cardiología' },
  { email: 'oftalmologia@hospital.local', name: 'Dra. Molina', role: 'jefe_servicio', serviceName: 'Oftalmología' },
  { email: 'traumatologia@hospital.local', name: 'Dr. Peña', role: 'jefe_servicio', serviceName: 'Traumatología' },
];

async function main() {
  const passwordHash = hashPassword('demo123');

  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: { chiefName: service.chiefName, specialtyCatalog: service.specialtyCatalog },
      create: service,
    });
  }

  for (const user of users) {
    const service = user.serviceName
      ? await prisma.service.findUnique({ where: { name: user.serviceName } })
      : null;

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        serviceId: service?.id ?? null,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
        serviceId: service?.id ?? null,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
