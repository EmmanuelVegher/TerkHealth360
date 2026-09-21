import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const visits = await prisma.visit.findMany({
    where: { visitType: 'EMERGENCY' }
  });
  console.log("Visits with visitType='EMERGENCY':", visits.length);
  console.dir(visits, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
