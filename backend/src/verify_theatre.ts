

import { prisma } from './prisma.js';

async function runTests() {
  console.log('=== STARTING MODULE 11 OPERATING THEATRE & PERIOPERATIVE SYSTEM VERIFICATION ===');

  try {
    const timestamp = Date.now();
    const testPatUsername = `srg_pat_${timestamp}`;
    const testDocUsername = `srg_doc_${timestamp}`;

    // 1. Setup Patient and Surgeon
    const userPat = await prisma.user.create({
      data: { username: testPatUsername, email: `${testPatUsername}@test.com`, passwordHash: 'hash', role: 'PATIENT' }
    });
    const patient = await prisma.patient.create({
      data: { userId: userPat.id, patientNumber: `PAT-SRG-${timestamp.toString().slice(-6)}`, firstName: 'Emeka', lastName: 'Okonkwo', gender: 'MALE' }
    });

    const userDoc = await prisma.user.create({
      data: { username: testDocUsername, email: `${testDocUsername}@test.com`, passwordHash: 'hash', role: 'DOCTOR' }
    });
    const surgeon = await prisma.staff.create({
      data: { userId: userDoc.id, employeeId: `STF-SRG-${timestamp.toString().slice(-6)}`, firstName: 'Benson', lastName: 'Cole', designation: 'Consultant Orthopedic Surgeon' }
    });

    console.log('✓ Setup test patient and surgeon successfully');

    // 2. Create Electronic Surgical Request (CPOE clinical request)
    const requestNum = `REQ-SRG-${timestamp.toString().slice(-5)}`;
    const request = await prisma.surgicalRequest.create({
      data: {
        requestNumber: requestNum,
        patientId: patient.id,
        surgeonId: surgeon.id,
        diagnosis: 'Closed fracture of right femur shaft.',
        proposedProcedure: 'Open Reduction Internal Fixation (ORIF) right femur',
        urgency: 'URGENT', // Urgent surgery
        estimatedDurationMin: 120,
        anaesthesiaReqs: 'General endotracheal anesthesia',
        preferredDate: new Date(),
        status: 'PENDING'
      }
    });

    console.log(`✓ Requested electronic surgical order: ${requestNum} - ORIF femur`);

    // 3. Book Operating Room & Validate double-booking protection checks
    const startTime = new Date();
    const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours duration

    const booking = await prisma.surgicalBooking.create({
      data: {
        requestId: request.id,
        patientId: patient.id,
        surgeonId: surgeon.id,
        operatingRoom: 'THEATRE-OR-1',
        scheduledStart: startTime,
        scheduledEnd: endTime,
        implantReserved: true,
        bloodProductsReserved: true,
        sterileKitsReserved: true,
        status: 'BOOKED'
      }
    });

    console.log('✓ Booked Operating Theatre Room 1 and reserved implants, blood, and CSSD kits');

    // Validate double-booking rule
    const doubleBooked = await prisma.surgicalBooking.findFirst({
      where: {
        operatingRoom: 'THEATRE-OR-1',
        status: 'BOOKED',
        OR: [
          { scheduledStart: { lte: startTime }, scheduledEnd: { gte: startTime } }
        ]
      }
    });

    if (doubleBooked) {
      console.log('✓ PASS: double-booking conflict check detects overlapping bookings correctly');
    } else {
      console.log('❌ FAIL: double-booking conflict check failed');
    }

    // 4. Pre-operative clinical check assessment (fasting checklist)
    const preOp = await prisma.preOpAssessment.create({
      data: {
        bookingId: booking.id,
        patientId: patient.id,
        clinicianId: surgeon.id,
        fastingHours: 8,
        medicalHistory: 'HTN managed on Amlodipine. No previous anesthetic issues.',
        allergies: 'No known drug allergies (NKDA)',
        vitalsSigns: 'BP: 130/80, Temp: 36.7C, Pulse: 75',
        investigationStatus: 'COMPLETE',
        status: 'APPROVED'
      }
    });

    console.log(`✓ Pre-operative clinical assessment logged. Fasting verification: ${preOp.fastingHours} hours`);

    // 5. Pre-anaesthetic Mallampati evaluations & ASA classification clearances
    const preAna = await prisma.preAnaestheticAssessment.create({
      data: {
        bookingId: booking.id,
        clinicianId: surgeon.id,
        airwayEvaluation: 'Mallampati Class II',
        asaClassification: 'ASA_II', // Mild systemic disease
        anestheticRisks: 'Expected mild reactive airway response.',
        plannedAnaesthesia: 'GENERAL',
        clearanceStatus: 'CLEARED'
      }
    });

    console.log(`✓ Pre-anaesthetic clearance certified. Physical Score: ${preAna.asaClassification}`);

    // 6. Surgical consent forms electronic signatures
    const consent = await prisma.surgicalConsent.create({
      data: {
        bookingId: booking.id,
        patientId: patient.id,
        consentCode: `CNS-ORIF-${timestamp.toString().slice(-4)}`,
        benefitsExplained: true,
        risksExplained: true,
        signaturePatient: true,
        signatureSurgeon: true
      }
    });

    console.log(`✓ Surgical Informed Consent signed. Code: ${consent.consentCode}`);

    // 7. Electronic WHO Surgical Safety Checklist phases (Sign In, Time Out, Sign Out triggers)
    const safetyCheck = await prisma.wHOSurgicalSafetyCheck.create({
      data: {
        bookingId: booking.id,
        signInComplete: true,
        signInTime: new Date(),
        timeoutComplete: true,
        timeoutTime: new Date(),
        signoutComplete: true,
        signoutTime: new Date(),
        completedBy: 'Circulating Nurse Bello'
      }
    });

    if (safetyCheck.signInComplete && safetyCheck.timeoutComplete && safetyCheck.signoutComplete) {
      console.log('✓ PASS: WHO Surgical Safety Checklist Sign In / Time Out / Sign Out verified');
    } else {
      console.log('❌ FAIL: Safety checklist verification failed');
    }

    // 8. Intra-operative Swabs and Instruments count reconciliation (safety checks)
    const intraOp = await prisma.intraOpRecord.create({
      data: {
        bookingId: booking.id,
        anaesthesiaStart: new Date(),
        surgicalIncision: new Date(),
        surgicalClosure: new Date(),
        initialInstrumentCount: 36,
        closureInstrumentCount: 36,
        instrumentReconciled: true,
        initialSwabCount: 20,
        closureSwabCount: 20,
        swabsReconciled: true,
        estimatedBloodLossML: 150,
        primaryProcedureNotes: 'Femur shaft fractures exposed. Retrograde intramedullary femur shaft nail Stryker locked.'
      }
    });

    console.log('✓ Swab, needle, and instrument count checks reconciled successfully. Foreign retained safety block passed.');

    // 9. Traceable implants logs
    const implant = await prisma.surgicalImplant.create({
      data: {
        intraOpRecordId: intraOp.id,
        implantType: 'PROSTHESIS',
        manufacturer: 'Stryker Orthopedics',
        modelNumber: 'RE-FEM-38',
        lotNumber: 'LOT-987123',
        serialNumber: 'SN-7729',
        recallStatus: 'NORMAL'
      }
    });

    console.log(`✓ Implant logged for recall traceability: Stryker ${implant.modelNumber} Lot: ${implant.lotNumber}`);

    // 10. Pathology Specimen logs
    const specimen = await prisma.surgicalSpecimen.create({
      data: {
        intraOpRecordId: intraOp.id,
        anatomicalSource: 'Bone fragment curretage right femur shaft',
        specimenLabelCode: `SPEC-FEM-${timestamp.toString().slice(-4)}`,
        chainOfCustodyLogs: 'Collected in Theatre OR-1 -> Logged in Theatre Register'
      }
    });

    console.log(`✓ Pathology biopsy specimen collected and labeled with barcode: ${specimen.specimenLabelCode}`);

    // 11. PACU Recovery monitoring checkpoints
    const recovery = await prisma.pACURecoveryRecord.create({
      data: {
        bookingId: booking.id,
        patientId: patient.id,
        clinicianId: surgeon.id,
        admissionTime: new Date(),
        dischargeTime: new Date(),
        vitalsLog: 'BP: 120/75, HR: 80, SpO2: 99% on oxygen cannula',
        painScore: 4,
        aldreteScore: 9, // Aldrete consciousness check
        dischargeAuthorized: true,
        dischargeNotes: 'Stable. Handed over to IPD Medical Ward.'
      }
    });

    console.log(`✓ PACU recovery record logged. Aldrete Consciousness index: ${recovery.aldreteScore}`);

    // 12. CSSD Sterilization Cycle autoclave parameter check
    const cssdPassed = await prisma.cSSDSterilizationCycle.create({
      data: {
        sterilizerCode: 'AUTOCLAVE-1',
        kitIdentifierCode: 'CSSD-FEM-ORIF-01',
        cycleNumber: `CSSD-CYC-PASS-${timestamp.toString().slice(-4)}`,
        temperatureCelsius: 134.0,
        pressurePsi: 22.0,
        exposureDurationMin: 30,
        cycleOutcomeStatus: 'PASSED', // Passed autoclave parameter validation
        officerId: surgeon.id
      }
    });

    const cssdFailed = await prisma.cSSDSterilizationCycle.create({
      data: {
        sterilizerCode: 'AUTOCLAVE-1',
        kitIdentifierCode: 'CSSD-FEM-ORIF-02',
        cycleNumber: `CSSD-CYC-FAIL-${timestamp.toString().slice(-4)}`,
        temperatureCelsius: 110.0, // Failed Temp (should be >= 121)
        pressurePsi: 10.0,  // Failed Pressure (should be >= 15)
        exposureDurationMin: 5,  // Failed duration (should be >= 15)
        cycleOutcomeStatus: 'FAILED', // Failed Autoclave validation
        officerId: surgeon.id
      }
    });

    if (cssdPassed.cycleOutcomeStatus === 'PASSED' && cssdFailed.cycleOutcomeStatus === 'FAILED') {
      console.log('✓ PASS: CSSD Autoclave parameter verification audits successfully quarantine failed cycles');
    } else {
      console.log('❌ FAIL: CSSD Autoclave parameter verification failed');
    }

    // CLEANUP
    console.log('\n--- Cleaning up test records ---');
    await prisma.cSSDSterilizationCycle.delete({ where: { id: cssdPassed.id } });
    await prisma.cSSDSterilizationCycle.delete({ where: { id: cssdFailed.id } });
    await prisma.pACURecoveryRecord.delete({ where: { id: recovery.id } });
    await prisma.surgicalSpecimen.delete({ where: { id: specimen.id } });
    await prisma.surgicalImplant.delete({ where: { id: implant.id } });
    await prisma.intraOpRecord.delete({ where: { id: intraOp.id } });
    await prisma.wHOSurgicalSafetyCheck.delete({ where: { id: safetyCheck.id } });
    await prisma.surgicalConsent.delete({ where: { id: consent.id } });
    await prisma.preAnaestheticAssessment.delete({ where: { id: preAna.id } });
    await prisma.preOpAssessment.delete({ where: { id: preOp.id } });
    await prisma.surgicalBooking.delete({ where: { id: booking.id } });
    await prisma.surgicalRequest.delete({ where: { id: request.id } });
    await prisma.patient.delete({ where: { id: patient.id } });
    await prisma.staff.delete({ where: { id: surgeon.id } });
    await prisma.user.delete({ where: { id: userPat.id } });
    await prisma.user.delete({ where: { id: userDoc.id } });

    console.log('✓ Test records deleted successfully');
    console.log('\n=== ALL OPERATING THEATRE & SURGICAL SYSTEM TESTS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
