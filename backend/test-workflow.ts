import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const steps = await prisma.workflowStep.findMany({ where: { statusCode: { in: ['AWAITING_PAYMENT', 'PAYMENT_CONFIRMED'] } } });
  console.log(steps.map(s => `${s.statusCode} - ${s.isBillingGate}`));
}
run();
