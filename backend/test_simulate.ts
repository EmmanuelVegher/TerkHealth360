import { PrismaClient } from '@prisma/client';
import { createVisitWorkflowState, autoAdvanceVisitToStatus } from './src/routes/workflow';

const prisma = new PrismaClient();

async function run() {
  const patient = await prisma.patient.findFirst();
  if (!patient) return console.log("No patient found");

  const visitNum = `TEST-VIS-${Date.now()}`;
  const visit = await prisma.visit.create({
    data: {
      visitNumber: visitNum,
      patientId: patient.id,
      visitType: 'LAB_ONLY',
      status: 'REGISTERED',
      createdBy: 'test'
    }
  });

  console.log("Visit created:", visit.id);

  console.log("Running createVisitWorkflowState...");
  await createVisitWorkflowState(visit.id, 'LAB_ONLY');
  
  let state = await prisma.visitWorkflowState.findUnique({ where: { visitId: visit.id }});
  console.log("State after create:", state?.currentStatus, state?.currentStepOrder);

  console.log("Running autoAdvance logic for servicePrice=0...");
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: state!.templateId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } },
  });
  
  if (template) {
      let targetStep = template.steps.find((s: any) => s.stepOrder > 1 && !s.isBillingGate) || template.steps[1];
      console.log("Target Step:", targetStep?.statusCode);
      if (targetStep) {
        await autoAdvanceVisitToStatus(visit.id, targetStep.statusCode, 'System');
      }
  }

  state = await prisma.visitWorkflowState.findUnique({ where: { visitId: visit.id }});
  const finalVisit = await prisma.visit.findUnique({ where: { id: visit.id }});
  console.log("Final State:", state?.currentStatus, state?.currentStepOrder);
  console.log("Final Visit Status:", finalVisit?.status);
}

run().catch(console.error).finally(() => prisma.$disconnect());
