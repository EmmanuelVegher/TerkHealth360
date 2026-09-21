import { PrismaClient } from '@prisma/client';
import { autoAdvanceVisitToStatus } from './src/routes/workflow.js';
const prisma = new PrismaClient();
async function run() {
  const p1 = await prisma.patient.findFirst({ where: { firstName: 'Oluwaseun' }});
  const visit = await prisma.visit.findFirst({ where: { patientId: p1?.id }, orderBy: { createdAt: 'desc' } });
  console.log('visit status:', visit?.status);
  
  const state = await prisma.visitWorkflowState.findUnique({ where: { visitId: visit!.id } });
  console.log('state current order:', state?.currentStepOrder, state?.currentStatus);
  
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: state!.templateId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
  
  const targetStep = template!.steps.find((s: any) => s.stepOrder > 1 && !s.isBillingGate) || template!.steps[1];
  console.log('target step:', targetStep.stepOrder, targetStep.statusCode);
}
run();
