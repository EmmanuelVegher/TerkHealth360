import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const patient = await prisma.patient.findFirst({
    where: { patientNumber: 'EXT-2026-00036' }
  });
  if (patient) {
    const visits = await prisma.visit.findMany({
        where: { patientId: patient.id }
    });
    console.log(visits);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
