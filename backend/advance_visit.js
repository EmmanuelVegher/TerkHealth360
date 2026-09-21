import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const patient = await prisma.patient.findFirst({
    where: { patientNumber: 'EXT-2026-00036' }
  });
  if (patient) {
    const activeVisit = await prisma.visit.findFirst({
        where: { patientId: patient.id, status: { in: ['REGISTERED', 'AWAITING_PAYMENT'] } },
        orderBy: { createdAt: 'desc' }
    });
    if (activeVisit) {
      const { autoAdvanceVisitToStatus } = await import('./dist/routes/workflow.js');
      await autoAdvanceVisitToStatus(activeVisit.id, 'PAYMENT_CONFIRMED', 'System Cashier');
      console.log("Advanced visit to PAYMENT_CONFIRMED", activeVisit.id);
    } else {
      console.log("Active visit not found");
    }
  } else {
    console.log("Patient not found");
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
