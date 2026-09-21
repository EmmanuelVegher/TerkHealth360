import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({
    where: { firstName: 'Oluwaseun', lastName: 'Soyinka' }
  });
  console.log('Patient:', patient);
}
main().catch(console.error).finally(() => prisma.$disconnect());
