import { prisma } from './prisma.js';
import { seedWorkflowTemplates, createVisitWorkflowState } from './routes/workflow.js';

async function healLabourVisits() {
  console.log('=== HEALING LABOUR WARD VISITS & WORKFLOW TEMPLATES ===');

  // 1. Reseed workflow templates to ensure Direct Labour & Delivery Admission is present
  await seedWorkflowTemplates();
  console.log('✅ Workflow templates re-seeded.');

  // 2. Find all active LabourRecords or active Admissions in Labour / Maternity Wards
  const activeLabourRecords = await prisma.labourRecord.findMany({
    where: { status: 'ACTIVE' },
    include: { pregnancy: { include: { patient: true } } }
  });

  console.log(`Found ${activeLabourRecords.length} active LabourRecords.`);

  for (const record of activeLabourRecords) {
    const patient = record.pregnancy.patient;
    console.log(`Processing patient: ${patient.firstName} ${patient.lastName} (ID: ${patient.id})`);

    let visit = await prisma.visit.findFirst({
      where: {
        patientId: patient.id,
        status: { notIn: ['CLOSED', 'DISCHARGED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!visit) {
      const visitNumber = `VIS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      visit = await prisma.visit.create({
        data: {
          visitNumber,
          patientId: patient.id,
          visitType: 'LABOUR_DELIVERY',
          status: 'IN_LABOUR',
          chiefComplaint: 'Emergency Direct Labour Ward Admission & Bed Allocation',
        }
      });
      console.log(`  ➕ Created new visit ${visit.visitNumber} for ${patient.firstName} ${patient.lastName}`);
      await createVisitWorkflowState(visit.id, 'LABOUR_DELIVERY');
      console.log(`  ⚡ Initialized LABOUR_DELIVERY workflow state for visit ${visit.visitNumber}`);
    } else {
      console.log(`  Updating existing visit ${visit.visitNumber} to IN_LABOUR & LABOUR_DELIVERY`);
      await prisma.visit.update({
        where: { id: visit.id },
        data: {
          status: 'IN_LABOUR',
          visitType: 'LABOUR_DELIVERY'
        }
      });
      const wfState = await prisma.visitWorkflowState.findUnique({ where: { visitId: visit.id } });
      if (!wfState) {
        await createVisitWorkflowState(visit.id, 'LABOUR_DELIVERY');
        console.log(`  ⚡ Initialized missing workflow state for visit ${visit.visitNumber}`);
      }
    }
  }

  // Also check active admissions in beds belonging to Labour Ward or Maternity Ward
  const activeAdmissions = await prisma.admission.findMany({
    where: { status: 'ADMITTED' },
    include: { patient: true, bed: { include: { ward: true } } }
  });

  for (const adm of activeAdmissions) {
    if (adm.bed?.ward?.type === 'LABOUR' || adm.bed?.ward?.type === 'MATERNITY' || adm.clinicalCondition === 'ACTIVE_LABOUR') {
      const patient = adm.patient;
      console.log(`Bed occupant in ${adm.bed.ward?.name || 'Labour Ward'}: ${patient.firstName} ${patient.lastName}`);
      let visit = await prisma.visit.findFirst({
        where: {
          patientId: patient.id,
          status: { notIn: ['CLOSED', 'DISCHARGED'] }
        }
      });
      if (!visit) {
        const visitNumber = `VIS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
        visit = await prisma.visit.create({
          data: {
            visitNumber,
            patientId: patient.id,
            visitType: 'LABOUR_DELIVERY',
            status: 'IN_LABOUR',
            chiefComplaint: 'Emergency Direct Labour Ward Bed Occupancy',
          }
        });
        console.log(`  ➕ Created visit ${visit.visitNumber} for bed occupant ${patient.firstName} ${patient.lastName}`);
        await createVisitWorkflowState(visit.id, 'LABOUR_DELIVERY');
      } else if (visit.status !== 'IN_LABOUR') {
        await prisma.visit.update({
          where: { id: visit.id },
          data: { status: 'IN_LABOUR', visitType: 'LABOUR_DELIVERY' }
        });
        console.log(`  Updated visit ${visit.visitNumber} to IN_LABOUR`);
      }
    }
  }

  console.log('=== HEALING COMPLETE ===');
  process.exit(0);
}

healLabourVisits().catch(err => {
  console.error('Error healing visits:', err);
  process.exit(1);
});
