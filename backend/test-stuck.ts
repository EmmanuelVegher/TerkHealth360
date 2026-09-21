import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const stuckVisits = await prisma.visit.findMany({ where: { status: 'AWAITING_PAYMENT' } });
  console.log('stuck:', stuckVisits.map(v => v.visitNumber));
}
run();
