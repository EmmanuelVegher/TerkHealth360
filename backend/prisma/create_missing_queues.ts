import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for active visits without patient queue tickets...');
  const activeVisits = await prisma.visit.findMany({
    where: {
      status: { notIn: ['CLOSED', 'DISCHARGED'] }
    },
    include: {
      patient: true,
      PatientQueue: true
    }
  });

  console.log(`Found ${activeVisits.length} active visits.`);

  for (const visit of activeVisits) {
    // Map visit status to department queue name
    let dept: string | null = null;
    switch (visit.status) {
      case 'REGISTERED':
        dept = 'REGISTRATION';
        break;
      case 'AWAITING_PAYMENT':
      case 'PAYMENT_CONFIRMED':
        dept = 'BILLING';
        break;
      case 'WAITING_TRIAGE':
      case 'IN_TRIAGE':
        dept = 'TRIAGE';
        break;
      case 'WAITING_CONSULTATION':
      case 'IN_CONSULTATION':
        dept = 'CONSULTATION';
        break;
      case 'AWAITING_INVESTIGATION':
      case 'IN_LABORATORY':
      case 'RESULTS_AVAILABLE':
        dept = 'LABORATORY';
        break;
      case 'WAITING_PHARMACY':
      case 'MEDICATION_DISPENSED':
        dept = 'PHARMACY';
        break;
      default:
        // Default to consultation or registration if generic status
        dept = 'CONSULTATION';
        break;
    }

    const existingTicket = visit.PatientQueue.find(q => q.department === dept);
    if (!existingTicket) {
      const prefix = dept.substring(0, 3).toUpperCase();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const count = await prisma.patientQueue.count({
        where: { department: dept, createdAt: { gte: startOfDay } }
      });
      const tokenNumber = `${prefix}-${(count + 1).toString().padStart(3, '0')}`;

      console.log(`Creating missing queue ticket ${tokenNumber} for patient ${visit.patient.firstName} in ${dept} queue...`);
      await prisma.patientQueue.create({
        data: {
          patientId: visit.patientId,
          visitId: visit.id,
          tokenNumber,
          department: dept,
          status: 'WAITING',
          createdAt: visit.createdAt // match the visit creation time
        }
      });
    } else {
      console.log(`Visit ${visit.visitNumber} already has queue ticket ${existingTicket.tokenNumber} for ${dept}.`);
    }
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
