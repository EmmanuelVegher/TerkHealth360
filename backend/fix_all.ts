import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const patient = await prisma.patient.findFirst({
    where: { firstName: 'Ibrahim' }
  });
  
  const visits = await prisma.visit.findMany({
    where: { patientId: patient?.id }
  });
  console.log("Visits found:", visits);

  for (const visit of visits) {
    const state = await prisma.visitWorkflowState.findUnique({
      where: { visitId: visit.id }
    });
    if (!state) continue;
    
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
    console.log("Fixed visit:", visit.id);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
