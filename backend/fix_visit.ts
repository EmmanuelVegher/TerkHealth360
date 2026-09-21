import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const visit = await prisma.visit.findFirst({
    where: { visitNumber: 'VIS-2026-00012' }
  });
  if (!visit) return console.log("Visit not found");
  
  const state = await prisma.visitWorkflowState.findUnique({
    where: { visitId: visit.id }
  });
  if (!state) return console.log("State not found");
  
  // Revert completed steps to only REGISTERED
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
    where: { visitId: visit.id },
    data: {
      currentStatus: 'IN_LABORATORY',
      currentStepOrder: 2,
      completedSteps: completed
    }
  });

  await prisma.visit.update({
    where: { id: visit.id },
    data: { status: 'IN_LABORATORY' }
  });

  console.log("Fixed VIS-2026-00012");
}

run().catch(console.error).finally(() => prisma.$disconnect());
