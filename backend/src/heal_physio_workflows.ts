import { prisma } from './prisma.js';
import { seedWorkflowTemplates } from './routes/workflow.js';

async function healPhysioWorkflows() {
  console.log('=== RESEEDING WORKFLOW TEMPLATES & HEALING PHYSIO VISITS ===');

  // 1. Reseed workflow templates so PHYSIO template in DB has IN_PHYSIOTHERAPY & IN_REHAB_MIRROR
  await seedWorkflowTemplates();
  console.log('✅ Workflow templates successfully re-seeded.');

  // 2. Find all PHYSIO visits
  const physioVisits = await prisma.visit.findMany({
    where: { visitType: 'PHYSIO' },
    include: { patient: true }
  });

  console.log(`Found ${physioVisits.length} Physiotherapy visit(s).`);

  for (const v of physioVisits) {
    console.log(`Processing visit ${v.visitNumber} for ${v.patient?.firstName} ${v.patient?.lastName} (Current Status: ${v.status})`);

    // If status is currently IN_TRIAGE or WAITING_TRIAGE or REGISTERED/PAYMENT_CONFIRMED, set to IN_PHYSIOTHERAPY
    if (['IN_TRIAGE', 'WAITING_TRIAGE', 'REGISTERED', 'PAYMENT_CONFIRMED'].includes(v.status)) {
      await prisma.visit.update({
        where: { id: v.id },
        data: { status: 'IN_PHYSIOTHERAPY' }
      });
      console.log(`  -> Updated visit status to IN_PHYSIOTHERAPY`);
    }

    // Update workflow state
    const wfState = await prisma.visitWorkflowState.findUnique({
      where: { visitId: v.id }
    });

    if (wfState) {
      const template = await prisma.workflowTemplate.findFirst({
        where: { visitType: 'PHYSIO' },
        include: { steps: { orderBy: { stepOrder: 'asc' } } }
      });

      if (template) {
        let completed = [];
        if (typeof wfState.completedSteps === 'string') {
          try { completed = JSON.parse(wfState.completedSteps); } catch (e) {}
        } else if (Array.isArray(wfState.completedSteps)) {
          completed = wfState.completedSteps;
        }

        // Auto mark step 1, 2, 3 as complete if not already
        const updatedCompleted = [
          { stepOrder: 1, statusCode: 'REGISTERED', completedAt: new Date().toISOString(), completedBy: 'System (Check-in)' },
          { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', completedAt: new Date().toISOString(), completedBy: 'Billing Gate' },
          { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', completedAt: new Date().toISOString(), completedBy: 'System' },
        ];

        await prisma.visitWorkflowState.update({
          where: { visitId: v.id },
          data: {
            templateId: template.id,
            currentStepOrder: 4,
            currentStatus: 'IN_PHYSIOTHERAPY',
            completedSteps: updatedCompleted
          }
        });
        console.log(`  -> Updated workflow state to Step 4 (IN_PHYSIOTHERAPY)`);
      }
    }
  }

  console.log('=== PHYSIOTHERAPY WORKFLOW HEALING COMPLETE ===');
  process.exit(0);
}

healPhysioWorkflows().catch(err => {
  console.error('Error healing physio workflows:', err);
  process.exit(1);
});
