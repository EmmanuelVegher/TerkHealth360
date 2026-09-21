import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const visits = await prisma.visit.findMany({ select: { id: true, visitNumber: true, status: true, patient: { select: { firstName: true } } } });
  console.log('All visits:', visits.map(v => `${v.visitNumber} - ${v.status} - ${v.patient?.firstName}`));
}
run();
