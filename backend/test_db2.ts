import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const template = await prisma.workflowTemplate.findFirst({
    where: { visitType: 'LAB_ONLY' },
    include: { steps: { orderBy: { stepOrder: 'asc' } } }
  });
  console.log(JSON.stringify(template, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
