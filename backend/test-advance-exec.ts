import { PrismaClient } from '@prisma/client';
import { autoAdvanceVisitToStatus } from './src/routes/workflow.js';
const prisma = new PrismaClient();
async function run() {
  const p1 = await prisma.patient.findFirst({ where: { firstName: 'Oluwaseun' }});
  const visit = await prisma.visit.findFirst({ where: { patientId: p1?.id }, orderBy: { createdAt: 'desc' } });
  
  console.log('Before advance:', visit?.status);
  await autoAdvanceVisitToStatus(visit!.id, 'PAYMENT_CONFIRMED');
  
  const visitAfter = await prisma.visit.findUnique({ where: { id: visit!.id }});
  const stateAfter = await prisma.visitWorkflowState.findUnique({ where: { visitId: visit!.id }});
  console.log('After advance status:', visitAfter?.status);
  console.log('After advance order:', stateAfter?.currentStepOrder, stateAfter?.currentStatus);
}
run();
