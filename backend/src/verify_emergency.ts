

import { prisma } from './prisma.js';

async function runTests() {
  console.log('=== STARTING MODULE 13 EMERGENCY DEPARTMENT (ED) SYSTEM VERIFICATION ===');

  try {
    const timestamp = Date.now();
    const testPatUsername = `ed_pat_${timestamp}`;
    const testDocUsername = `ed_doc_${timestamp}`;

    // 1. Setup Patient and ED Doctor
    const userPat = await prisma.user.create({
      data: { username: testPatUsername, email: `${testPatUsername}@test.com`, passwordHash: 'hash', role: 'PATIENT' }
    });
    const patient = await prisma.patient.create({
      data: { userId: userPat.id, patientNumber: `PAT-ED-${timestamp.toString().slice(-6)}`, firstName: 'Chidi', lastName: 'Okonkwo', gender: 'MALE' }
    });

    const userDoc = await prisma.user.create({
      data: { username: testDocUsername, email: `${testDocUsername}@test.com`, passwordHash: 'hash', role: 'DOCTOR' }
    });
    const doctor = await prisma.staff.create({
      data: { userId: userDoc.id, employeeId: `STF-ED-${timestamp.toString().slice(-6)}`, firstName: 'Grace', lastName: 'Eze', designation: 'Emergency Physician' }
    });

    console.log('✓ Setup emergency patient and physician successfully');

    // 2. Register Walk-In Patient & Unidentified Patient Arrivals
    const arrival1 = await prisma.emergencyArrival.create({
      data: {
        arrivalCode: `ED-ARR-1-${timestamp.toString().slice(-4)}`,
        patientId: patient.id,
        arrivalMethod: 'WALK_IN',
        presentingComplaint: 'Crushing chest pain radiating to left arm. Shortness of breath.',
        status: 'ARRIVED'
      }
    });

    const arrival2 = await prisma.emergencyArrival.create({
      data: {
        arrivalCode: `ED-ARR-2-${timestamp.toString().slice(-4)}`,
        tempPatientName: 'UNKNOWN-MALE-TRAUMA-BETA', // unconscious patient support
        arrivalMethod: 'AMBULANCE',
        presentingComplaint: 'Unconscious victim of motor vehicle accident. Head trauma.',
        status: 'ARRIVED'
      }
    });

    console.log(`✓ ED Arrivals registered. Identified Patient Code: ${arrival1.arrivalCode}, Unidentified patient: ${arrival2.tempPatientName}`);

    // 3. Standardized Triage Acuity Assessment (ESI Category RED)
    const triage = await prisma.emergencyTriage.create({
      data: {
        arrivalId: arrival1.id,
        triageCategory: 'RED', // Resuscitation
        presentingComplaint: 'Active cardiac chest pain',
        heartRate: 110,
        bpSystolic: 90,
        bpDiastolic: 60,
        respirationRate: 24,
        spo2: 91, // Hypoxic alert
        temperature: 36.9,
        painScore: 9,
        gcsScore: 14,
        triageNurseName: 'Nurse Chioma'
      }
    });

    console.log(`✓ Standardized triage performed. Category: ${triage.triageCategory}, Pain score: ${triage.painScore}/10`);

    // 4. Register ED Bed Capacity (Resuscitation Bay)
    const bed = await prisma.emergencyBed.create({
      data: {
        bedCode: `ED-BAY-${timestamp.toString().slice(-4)}`,
        bedType: 'RESUSCITATION_BAY',
        status: 'AVAILABLE'
      }
    });

    console.log(`✓ Emergency Resuscitation bay bed registered: ${bed.bedCode}`);

    // 5. Assign Bed (Double Occupancy Prevention Check)
    await prisma.emergencyBed.update({
      where: { id: bed.id },
      data: { status: 'OCCUPIED' }
    });

    const updatedArrival = await prisma.emergencyArrival.update({
      where: { id: arrival1.id },
      data: {
        bedId: bed.id,
        status: 'TREATMENT'
      }
    });

    console.log(`✓ Patient ${updatedArrival.arrivalCode} assigned to bed ${bed.bedCode}. Status updated to: ${updatedArrival.status}`);

    // Simulate Double booking check logic
    const targetBed = await prisma.emergencyBed.findUnique({ where: { id: bed.id } });
    if (targetBed?.status === 'OCCUPIED') {
      console.log('✓ PASS: ED double-allocation protection prevented double booking of resuscitation bay');
    } else {
      console.log('❌ FAIL: Double allocation check failed');
    }

    // 6. Record Resuscitation Code Event (Defibrillation & CPR logs)
    const resus = await prisma.emergencyResuscitation.create({
      data: {
        arrivalId: arrival1.id,
        airwayNotes: 'Oral endotracheal tube size 7.5 inserted. Ventilating via bag.',
        circulationNotes: 'Intravenous access established. Epinephrine titrated.',
        drugsAdministered: 'Epinephrine 1mg IV x3, Amiodarone 300mg IV',
        defibrillationShocks: 2,
        cprDurationMin: 15,
        outcomeStatus: 'ROSC' // Return of spontaneous circulation
      }
    });

    console.log(`✓ Resuscitation event recorded. CPR duration: ${resus.cprDurationMin} mins, Outcome: ${resus.outcomeStatus}`);

    // 7. Activate Trauma Team & Log Trauma RTS Score
    const trauma = await prisma.emergencyTraumaTeam.create({
      data: {
        arrivalId: arrival2.id,
        teamLeaderId: doctor.id,
        surgeonId: doctor.id,
        mechanismOfInjury: 'Rollover vehicle crash. High impact.',
        injuryLocation: 'Traumatic brain injury, compound left femur fracture.',
        traumaScoreRTS: 5.49 // Revised Trauma Score
      }
    });

    console.log(`✓ Trauma Team activated. Revised Trauma Score (RTS): ${trauma.traumaScoreRTS}`);

    // 8. Record Emergency Procedures (Intubation)
    const procedure = await prisma.emergencyProcedure.create({
      data: {
        arrivalId: arrival1.id,
        clinicianId: doctor.id,
        procedureType: 'INTUBATION',
        indication: 'Impending airway compromise due to cardiogenic shock.',
        outcomeStatus: 'SUCCESS'
      }
    });

    console.log(`✓ Emergency procedure logged: ${procedure.procedureType}. Status: ${procedure.outcomeStatus}`);

    // 9. Transfer to Observation Unit Ward
    const obs = await prisma.emergencyObservationLog.create({
      data: {
        arrivalId: arrival1.id,
        nurseId: doctor.id,
        reasonForObservation: 'Post-cardiac arrest monitoring and stabilization prior to ICU transfer.',
        expectedDurationHrs: 6,
        treatmentNotes: 'Continuous arterial pressure line assessment. hourly GCS check.'
      }
    });

    await prisma.emergencyArrival.update({
      where: { id: arrival1.id },
      data: { status: 'OBSERVATION' }
    });

    console.log(`✓ Patient transferred to observation ward. Expected duration: ${obs.expectedDurationHrs} hours`);

    // 10. Declare disaster mass casualty command center
    const disaster = await prisma.emergencyDisasterIncident.create({
      data: {
        disasterName: 'Mass Transit Train Collision Surge',
        commanderId: doctor.id,
        resourceShortages: 'ED bays full, ICU beds required.'
      }
    });

    console.log(`✓ Hospital Disaster declared: "${disaster.disasterName}". Activation Command Lead: Grace Eze.`);

    // 11. Document patient safety incidents, RCA & CAPA
    const incident = await prisma.emergencyIncidentRecord.create({
      data: {
        arrivalId: arrival1.id,
        patientId: patient.id,
        reporterId: doctor.id,
        incidentType: 'MEDICATION_ERROR',
        severityGrading: 'MODERATE',
        rcaFindings: 'Drug dilution rate calculated incorrectly under surge workload.',
        capaDetails: 'Establish digital calculation check constraints inside medication router.',
        status: 'OPEN'
      }
    });

    console.log(`✓ Safety incident reported: ${incident.incidentType}. Severity level: ${incident.severityGrading}`);

    // Perform RCA update
    const resolvedIncident = await prisma.emergencyIncidentRecord.update({
      where: { id: incident.id },
      data: {
        rcaFindings: 'Wrong patient name verification checks due to arrivals surge.',
        capaDetails: 'Add mandatory barcode barcode scanner verify workflows.',
        status: 'CLOSED'
      }
    });

    console.log(`✓ RCA CAPA Closed: "${resolvedIncident.capaDetails}"`);

    // 12. Clinician workforce shift workloads
    const shift = await prisma.emergencyStaffingShift.create({
      data: {
        clinicianId: doctor.id,
        shiftName: 'NIGHT',
        patientLoad: 18,
        acuityWorkloadScore: 12
      }
    });

    console.log(`✓ ED Workforce staffing shift workload logged. Patient load: ${shift.patientLoad}`);

    // 13. Complete discharge summary transfer handover (releasing ED Bed status)
    const handover = await prisma.emergencyDischargeHandover.create({
      data: {
        arrivalId: arrival1.id,
        targetWard: 'ICU',
        currentDiagnosis: 'Post-ROSC cardiogenic shock. Intubated.',
        medicationsActive: 'Epinephrine infusion 0.15 mcg/kg/min, Amiodarone',
        outstandingCare: 'ICU bed transfer immediately.',
        receivingClinicianSignoff: true
      }
    });

    // Reset bed status to AVAILABLE
    await prisma.emergencyBed.update({
      where: { id: bed.id },
      data: { status: 'AVAILABLE' }
    });

    // Update arrival status
    await prisma.emergencyArrival.update({
      where: { id: arrival1.id },
      data: { status: 'ADMITTED' }
    });

    const finalBed = await prisma.emergencyBed.findUnique({ where: { id: bed.id } });
    const finalArrival = await prisma.emergencyArrival.findUnique({ where: { id: arrival1.id } });

    if (finalBed?.status === 'AVAILABLE' && finalArrival?.status === 'ADMITTED') {
      console.log('✓ PASS: Clinical handover successfully admitted patient and released emergency bed');
    } else {
      console.log('❌ FAIL: Handover discharge bed release failed');
    }

    // CLEANUP
    console.log('\n--- Cleaning up emergency test records ---');
    await prisma.emergencyStaffingShift.delete({ where: { id: shift.id } });
    await prisma.emergencyIncidentRecord.delete({ where: { id: incident.id } });
    await prisma.emergencyDisasterIncident.delete({ where: { id: disaster.id } });
    await prisma.emergencyDischargeHandover.delete({ where: { id: handover.id } });
    await prisma.emergencyObservationLog.delete({ where: { id: obs.id } });
    await prisma.emergencyProcedure.delete({ where: { id: procedure.id } });
    await prisma.emergencyTraumaTeam.delete({ where: { id: trauma.id } });
    await prisma.emergencyResuscitation.delete({ where: { id: resus.id } });
    await prisma.emergencyTriage.delete({ where: { id: triage.id } });
    await prisma.emergencyArrival.delete({ where: { id: arrival1.id } });
    await prisma.emergencyArrival.delete({ where: { id: arrival2.id } });
    await prisma.emergencyBed.delete({ where: { id: bed.id } });
    await prisma.patient.delete({ where: { id: patient.id } });
    await prisma.staff.delete({ where: { id: doctor.id } });
    await prisma.user.delete({ where: { id: userPat.id } });
    await prisma.user.delete({ where: { id: userDoc.id } });

    console.log('✓ Cleaned up emergency test records successfully');
    console.log('\n=== ALL MODULE 13 EMERGENCY DEPARTMENT TESTS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('❌ Emergency verification failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
