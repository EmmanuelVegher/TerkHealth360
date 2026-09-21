import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const patient = await prisma.patient.findFirst({
    where: {
      OR: [
        { firstName: { contains: 'IJEOMA', mode: 'insensitive' } },
        { lastName: { contains: 'IJEOMA', mode: 'insensitive' } },
        { firstName: { contains: 'IKE', mode: 'insensitive' } },
      ]
    }
  });

  if (!patient) {
    console.log('Patient IKE IJEOMA not found');
    return;
  }

  console.log('Found patient:', patient.id, patient.firstName, patient.lastName);

  // Check active pregnancy
  let pregnancy = await prisma.pregnancyRecord.findFirst({
    where: { patientId: patient.id, status: 'ACTIVE' }
  });

  if (!pregnancy) {
    pregnancy = await prisma.pregnancyRecord.create({
      data: {
        patientId: patient.id,
        gestationNumber: 1,
        lmpDate: new Date(),
        eddDate: new Date(),
        status: 'ACTIVE',
        isHighRisk: true
      }
    });
    console.log('Created pregnancy:', pregnancy.id);
  } else {
    console.log('Found existing pregnancy:', pregnancy.id);
  }

  // Create active LabourRecord
  let labour = await prisma.labourRecord.findFirst({
    where: { pregnancyId: pregnancy.id, status: 'ACTIVE' }
  });

  if (!labour) {
    labour = await prisma.labourRecord.create({
      data: {
        pregnancyId: pregnancy.id,
        membranesStatus: 'INTACT',
        cervicalDilatation: 4,
        contractionsFrequency: 3,
        fetalHeartRate: 140,
        maternalPulse: 80,
        maternalBp: '120/80',
        status: 'ACTIVE',
        monitoringEntries: {
          create: {
            cervicalDilatation: 4,
            fetalHeartRate: 140,
            uterineContractions: 3,
            membranesStatus: 'INTACT',
            maternalPulse: 80,
            maternalBp: '120/80',
            notes: 'Baseline triage logged during Ward Transfer to Labour & Delivery Ward',
            enteredBy: 'Midwife'
          }
        }
      }
    });
    console.log('Created active LabourRecord:', labour.id);
  } else {
    console.log('Active LabourRecord already exists:', labour.id);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
