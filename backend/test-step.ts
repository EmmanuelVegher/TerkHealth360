import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const steps = await prisma.workflowStep.findFirst();
  console.log(steps);
}
run();
