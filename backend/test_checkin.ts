import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const template = await prisma.workflowTemplate.findFirst({
    where: { visitType: 'LAB_ONLY', isActive: true }
  });
  console.log("LAB_ONLY Template:", template);
  
  if (template) {
    const steps = await prisma.workflowStep.findMany({
      where: { templateId: template.id },
      orderBy: { stepOrder: 'asc' }
    });
    console.log("Steps:", steps);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
