import { prisma } from '../src/prisma.js';

async function main() {
  const requests = await prisma.surgicalRequest.findMany({
    include: { patient: true }
  });
  console.log('Surgical Requests in DB:', JSON.stringify(requests, null, 2));

  const templates = await prisma.workflowTemplate.findMany({
    include: { steps: true }
  });
  console.log('Workflow Templates in DB:', templates.map(t => ({ id: t.id, name: t.name, visitType: t.visitType, stepsCount: t.steps.length })));
}

main().finally(() => prisma.$disconnect());
