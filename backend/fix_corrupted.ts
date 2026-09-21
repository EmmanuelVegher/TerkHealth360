import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const states = await prisma.visitWorkflowState.findMany({
    where: { currentStatus: 'AWAITING_PAYMENT' }
  });
  
  let fixed = 0;
  for (const state of states) {
    let completedSteps: any[] = [];
    if (typeof state.completedSteps === 'string') {
        try { completedSteps = JSON.parse(state.completedSteps); } catch(e){}
    } else {
        completedSteps = state.completedSteps as any[];
    }
    
    // Check if IN_LABORATORY is erroneously in completedSteps
    const hasLab = completedSteps.some(s => s.statusCode === 'IN_LABORATORY');
    if (hasLab) {
      // It's corrupted! Revert completed steps to only REGISTERED
      const completed = [
        {
          stepOrder: 1,
          statusCode: 'REGISTERED',
          completedAt: new Date().toISOString(),
          completedBy: 'System',
          notes: 'Fixed by script'
        }
      ];

      await prisma.visitWorkflowState.update({
        where: { visitId: state.visitId },
        data: {
          currentStatus: 'IN_LABORATORY',
          currentStepOrder: 2,
          completedSteps: completed
        }
      });

      await prisma.visit.update({
        where: { id: state.visitId },
        data: { status: 'IN_LABORATORY' }
      });
      console.log("Fixed visit:", state.visitId);
      fixed++;
    }
  }
  console.log("Total fixed:", fixed);
}

run().catch(console.error).finally(() => prisma.$disconnect());
