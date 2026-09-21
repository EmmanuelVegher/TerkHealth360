import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const p1 = await prisma.patient.findFirst({ where: { firstName: 'Oluwaseun' }});
  const visit = await prisma.visit.findFirst({ where: { patientId: p1?.id }, orderBy: { createdAt: 'desc' } });
  console.log('Oluwaseun visit created at:', visit?.createdAt);
  
  const p2 = await prisma.patient.findFirst({ where: { firstName: 'Emeka' }});
  const visit2 = await prisma.visit.findFirst({ where: { patientId: p2?.id }, orderBy: { createdAt: 'desc' } });
  console.log('Emeka visit created at:', visit2?.createdAt);
}
run();
