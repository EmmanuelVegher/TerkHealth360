import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Beds:', await prisma.emergencyBed.count());
  console.log('Disasters:', await prisma.emergencyDisasterIncident.count());
}
main().catch(console.error).finally(() => prisma.$disconnect());
