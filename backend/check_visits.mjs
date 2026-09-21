import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Show current workflow state for these patients
const visits = await prisma.visit.findMany({
  where: { status: { in: ['AWAITING_PAYMENT', 'IN_LABORATORY', 'REGISTERED'] }, visitType: 'LAB_ONLY' },
  include: { patient: true, workflowState: true }
});
console.log('LAB_ONLY visits:', visits.length);
for (const v of visits) {
  console.log(`\n${v.visitNumber} - ${v.patient?.firstName} ${v.patient?.lastName} - status: ${v.status}`);
  console.log('  workflowState current:', v.workflowState?.currentStatus);
  console.log('  templateId:', v.workflowState?.templateId);
  
  // Check template
  if (v.workflowState?.templateId) {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: v.workflowState.templateId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } }
    });
    console.log('  template:', template?.name);
    console.log('  steps:', template?.steps?.map(s => `${s.stepOrder}:${s.statusCode}(billing:${s.isBillingGate})`).join(' -> '));
  }
  
  // Check if they have any invoices
  const invoices = await prisma.invoice.findMany({ where: { patientId: v.patientId } });
  console.log('  invoices:', invoices.length === 0 ? 'NONE' : invoices.map(i => `${i.fhirId || i.id} total:${i.total} status:${i.status}`));
}

await prisma.$disconnect();
