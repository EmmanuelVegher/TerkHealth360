import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const patients = await prisma.patient.findMany({
    include: {
      pregnancyRecords: true
    }
  });
  console.log("Total patients in database:", patients.length);
  for (const p of patients) {
    console.log(`Patient: ${p.firstName} ${p.lastName} (ID: ${p.id}, MRN: ${p.mrn || 'N/A'}) - Pregnancies: ${p.pregnancyRecords.length}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
