import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const stuck = [
  'VIS-2026-000013',  // Kemi Dada
  'VIS-2026-000012',  // Ibrahim Gbadamosi
  'TEST-VIS-1783606211350',  // Adebayo Okonkwo
  'VIS-2026-000004',  // Chinedu Balogun
];

for (const vNum of stuck) {
  const visit = await prisma.visit.findFirst({ where: { visitNumber: vNum }, include: { workflowState: true } });
  if (!visit) { console.log(`${vNum} not found`); continue; }
  
  const state = visit.workflowState;
  if (!state) { console.log(`${vNum} no workflow state`); continue; }
  
  const template = await prisma.workflowTemplate.findUnique({
    where: { id: state.templateId },
    include: { steps: { orderBy: { stepOrder: 'asc' } } }
  });
  
  // Find IN_LABORATORY step
  const labStep = template?.steps.find(s => s.statusCode === 'IN_LABORATORY');
  if (!labStep) { console.log(`${vNum} no IN_LABORATORY step`); continue; }
  
  // Build completedSteps up to (not including) IN_LABORATORY
  let completedSteps = Array.isArray(state.completedSteps) ? [...state.completedSteps] : [];
  const stepsToMark = template.steps.filter(s => s.stepOrder < labStep.stepOrder);
  for (const s of stepsToMark) {
    if (!completedSteps.some(cs => cs.stepOrder === s.stepOrder)) {
      completedSteps.push({
        stepOrder: s.stepOrder,
        statusCode: s.statusCode,
        completedAt: new Date().toISOString(),
        completedBy: 'System (invoice-paid repair)',
        notes: 'Auto-repaired: invoice was already paid'
      });
    }
  }
  
  // Update workflow state to IN_LABORATORY
  await prisma.visitWorkflowState.update({
    where: { visitId: visit.id },
    data: {
      currentStepOrder: labStep.stepOrder,
      currentStatus: 'IN_LABORATORY',
      completedSteps
    }
  });
  
  // Update visit status
  await prisma.visit.update({
    where: { id: visit.id },
    data: { status: 'IN_LABORATORY' }
  });
  
  console.log(`✅ ${vNum} (${visit.visitNumber}) → advanced to IN_LABORATORY`);
}

await prisma.$disconnect();
console.log('\nDone!');
