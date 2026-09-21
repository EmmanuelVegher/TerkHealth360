import { prisma } from '../src/prisma.js';
import { seedWorkflowTemplates, createVisitWorkflowState } from '../src/routes/workflow.js';

async function main() {
  console.log('--- 1. SEEDING SURGICAL WORKFLOW TEMPLATES ---');
  await seedWorkflowTemplates();
  console.log('Surgical workflow templates successfully seeded!');

  console.log('\n--- 2. BACKFILLING VISITS & WORKFLOW STATES FOR SURGICAL REQUESTS ---');
  const requests = await prisma.surgicalRequest.findMany({
    include: { patient: true }
  });

  for (const req of requests) {
    console.log(`Processing Surgical Request ${req.requestNumber} for ${req.patient.firstName} ${req.patient.lastName}...`);
    const isEmergency = req.urgency === 'EMERGENCY';
    const visitType = isEmergency ? 'SURGERY_EMERGENCY' : 'SURGERY_SCHEDULED';
    const isCleared = req.status === 'APPROVED' || req.status === 'SCHEDULED' || req.status === 'COMPLETED' || isEmergency;
    const initialStatus = isCleared ? 'IN_SURGERY' : 'AWAITING_PAYMENT';

    // Find or create active Visit
    let activeVisit = await prisma.visit.findFirst({
      where: {
        patientId: req.patientId,
        status: { notIn: ['CLOSED', 'DISCHARGED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeVisit) {
      const visitNumber = `VIS-SRG-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 100)}`;
      activeVisit = await prisma.visit.create({
        data: {
          visitNumber,
          patientId: req.patientId,
          visitType,
          status: initialStatus,
          chiefComplaint: `Surgical Order: ${req.proposedProcedure} (Diagnosis: ${req.diagnosis})`,
        }
      });
      console.log(`  Created Visit ${activeVisit.visitNumber} (${visitType}) with status ${initialStatus}`);
    } else {
      console.log(`  Found existing active Visit ${activeVisit.visitNumber} (Current status: ${activeVisit.status})`);
    }

    // Ensure VisitWorkflowState exists
    const existingWf = await prisma.visitWorkflowState.findUnique({
      where: { visitId: activeVisit.id }
    });

    if (!existingWf) {
      await createVisitWorkflowState(activeVisit.id, visitType);
      console.log(`  Created VisitWorkflowState for visit ${activeVisit.id}`);
    }

    // Ensure DB Invoice exists for billing clearance
    const fhirId = `SRG-INV-${req.requestNumber}`;
    const depositAmount = (isCleared && isEmergency) ? 0 : 150000;
    const existingInvoice = await prisma.invoice.findFirst({
      where: { fhirId }
    });

    if (!existingInvoice) {
      await prisma.invoice.create({
        data: {
          patientId: req.patientId,
          fhirId,
          status: isCleared ? 'PAID' : 'ISSUED',
          total: depositAmount,
          amountPaid: isCleared ? depositAmount : 0,
          reasonText: `Surgical Fee Deposit & Financial Clearance: ${req.proposedProcedure} (${req.requestNumber})`
        }
      });
      console.log(`  Created DB Invoice ${fhirId} for financial clearance`);
    }
  }

  console.log('\n--- 3. VERIFYING CREATED VISITS ---');
  const activeVisits = await prisma.visit.findMany({
    include: { patient: true, workflowState: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total active visits in DB: ${activeVisits.length}`);
  activeVisits.forEach(v => {
    console.log(` - Visit ${v.visitNumber} | Patient: ${v.patient.firstName} ${v.patient.lastName} | Type: ${v.visitType} | Status: ${v.status} | Step: ${v.workflowState?.currentStepOrder || 'N/A'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
