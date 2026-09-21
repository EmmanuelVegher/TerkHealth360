import { prisma } from './prisma.js';
import { seedWorkflowTemplates, setVisitWorkflowStepByStatus } from './routes/workflow.js';

async function main() {
  console.log('Seeding updated workflow templates...');
  await seedWorkflowTemplates();

  console.log('Fixing active labour visit statuses and workflow steps...');

  // Find all occupied Labour beds
  const occupiedBeds = await prisma.bed.findMany({
    where: {
      status: 'OCCUPIED',
      ward: {
        OR: [
          { wardCategory: 'LABOUR' },
          { type: 'LABOUR' },
          { name: { contains: 'Labour', mode: 'insensitive' } },
          { name: { contains: 'Delivery', mode: 'insensitive' } }
        ]
      }
    },
    include: {
      admissions: {
        where: { status: 'ADMITTED' },
        include: { patient: true }
      }
    }
  });

  for (const bed of occupiedBeds) {
    for (const adm of bed.admissions) {
      console.log(`Processing patient: ${adm.patient.firstName} ${adm.patient.lastName} (${adm.patient.patientNumber}) in bed ${bed.number}`);
      
      const activeVisit = await prisma.visit.findFirst({
        where: {
          patientId: adm.patientId,
          status: { notIn: ['CLOSED', 'DISCHARGED'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activeVisit) {
        console.log(`Updating visit ${activeVisit.id} (current status: ${activeVisit.status}) -> IN_LABOUR`);
        await prisma.visit.update({
          where: { id: activeVisit.id },
          data: { status: 'IN_LABOUR' }
        });

        const wfRes = await setVisitWorkflowStepByStatus(activeVisit.id, 'IN_LABOUR');
        console.log('Workflow result:', wfRes);
      }
    }
  }

  console.log('Done fixing active labour visits!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
