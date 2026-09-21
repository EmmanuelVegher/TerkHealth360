import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wards = await prisma.ward.findMany({
    include: {
      beds: true
    }
  });

  console.log('=== WARDS & BEDS IN DB ===');
  console.log(JSON.stringify(wards, null, 2));

  const allBeds = await prisma.bed.findMany({
    include: { ward: true }
  });
  console.log('=== TOTAL BEDS IN DB ===', allBeds.length);
  for (const b of allBeds) {
    console.log(`Bed: ${b.number}, type: ${b.bedType}, wardName: ${b.ward?.name}, wardCategory: ${b.ward?.wardCategory}, wardType: ${b.ward?.type}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
