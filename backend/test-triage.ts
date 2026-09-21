import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const t = await prisma.triageRecord.findMany({ orderBy: { createdAt: 'desc' }, take: 2, include: { patient: true } });
  console.log(t.map(r => `${r.patient.firstName} - ${r.news2Score}`));
}
run();
