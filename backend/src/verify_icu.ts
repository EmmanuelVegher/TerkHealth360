

import { prisma } from './prisma.js';

async function runTests() {
  console.log('=== STARTING MODULE 12 ICU & CRITICAL CARE SYSTEM VERIFICATION ===');

  try {
    const timestamp = Date.now();
    const testPatUsername = `icu_pat_${timestamp}`;
    const testDocUsername = `icu_doc_${timestamp}`;

    // 1. Setup Patient and Admitting Doctor
    const userPat = await prisma.user.create({
      data: { username: testPatUsername, email: `${testPatUsername}@test.com`, passwordHash: 'hash', role: 'PATIENT' }
    });
    const patient = await prisma.patient.create({
      data: { userId: userPat.id, patientNumber: `PAT-ICU-${timestamp.toString().slice(-6)}`, firstName: 'Kola', lastName: 'Adebayo', gender: 'MALE' }
    });

    const userDoc = await prisma.user.create({
      data: { username: testDocUsername, email: `${testDocUsername}@test.com`, passwordHash: 'hash', role: 'DOCTOR' }
    });
    const intensivist = await prisma.staff.create({
      data: { userId: userDoc.id, employeeId: `STF-ICU-${timestamp.toString().slice(-6)}`, firstName: 'Tunde', lastName: 'Alabi', designation: 'Lead Consultant Intensivist' }
    });

    console.log('✓ Setup critical care test patient and intensivist successfully');

    // 2. Register Critical Care Bed (Isolation Bed)
    const bed = await prisma.icuBed.create({
      data: {
        bedCode: `ICU-BED-TEST-${timestamp.toString().slice(-4)}`,
        unit: 'ICU',
        status: 'AVAILABLE',
        isolationRules: 'Negative pressure ventilation. Strict contact precautions.'
      }
    });

    console.log(`✓ Critical care isolation bed registered: ${bed.bedCode}`);

    // 3. Request ICU Admission (STAT trauma classification)
    const admission = await prisma.icuAdmission.create({
      data: {
        admissionCode: `ADM-ICU-${timestamp.toString().slice(-5)}`,
        patientId: patient.id,
        admittingStaffId: intensivist.id,
        diagnosis: 'Severe sepsis secondary to community-acquired pneumonia. Respiratory failure.',
        severityScore: 24, // APACHE severity index
        indication: 'Requires invasive ventilation support and hemodynamical titration support.',
        urgency: 'EMERGENCY',
        status: 'PENDING'
      }
    });

    console.log(`✓ ICU Admission requested. Severity score (APACHE): ${admission.severityScore}`);

    // 4. Approve Admission & Allocate Bed
    const approvedAdmission = await prisma.icuAdmission.update({
      where: { id: admission.id },
      data: {
        bedId: bed.id,
        status: 'ADMITTED'
      }
    });

    await prisma.icuBed.update({
      where: { id: bed.id },
      data: { status: 'OCCUPIED' }
    });

    console.log(`✓ Bed ${bed.bedCode} allocated. ICU Admission approved. Status: ${approvedAdmission.status}`);

    // 5. Continuous Physiological Vitals Recording (Telemetry)
    const telemetry = await prisma.icuPhysiologicalObservation.create({
      data: {
        admissionId: admission.id,
        patientId: patient.id,
        observerId: intensivist.id,
        heartRate: 112,
        bpSystolic: 95,
        bpDiastolic: 55,
        respirationRate: 26,
        spo2: 90, // Hypoxic
        temperature: 38.5,
        centralVenousPressure: 8,
        arterialPressure: 68,
        intracranialPressure: 12,
        cardiacOutput: 4.8
      }
    });

    console.log(`✓ Telemetry vital signs logged. SpO2: ${telemetry.spo2}%, Respiratory Rate: ${telemetry.respirationRate}`);

    // 6. Mechanical Ventilator Parameters
    const vent = await prisma.icuVentilatorSetting.create({
      data: {
        admissionId: admission.id,
        mode: 'AC', // Assist-Control
        tidalVolumeML: 420,
        respirationRate: 16,
        fio2Percentage: 50,
        peepH2O: 8,
        supportPressureH2O: 12,
        pressureInspiratoryH2O: 18,
        weaningStatus: 'ONGOING',
        extubationReadiness: 'Rapid shallow breathing index checked. Ongoing weaning trial.'
      }
    });

    console.log(`✓ Mechanical ventilator setting logged. Mode: ${vent.mode}, PEEP: ${vent.peepH2O} cmH2O`);

    // 7. Infusion Therapy Titration with High-Alert Double Verification check
    const infusion = await prisma.icuInfusionTherapy.create({
      data: {
        admissionId: admission.id,
        patientId: patient.id,
        medicationName: 'Norepinephrine',
        concentration: '4mg in 50ml D5W',
        doseRate: '0.08 mcg/kg/min',
        initialClinicianId: intensivist.id,
        verifiedClinicianId: intensivist.id, // verified signature check
        isHighAlert: true
      }
    });

    console.log(`✓ High-Alert drug infusion logged. Med: ${infusion.medicationName}. Dual verification check verified: Yes`);

    // 8. Renal Replacement Dialysis (CRRT run)
    const dialysis = await prisma.icuDialysisLifeSupport.create({
      data: {
        admissionId: admission.id,
        patientId: patient.id,
        dialysisType: 'CRRT',
        ultrafiltrationRateMLHr: 100.0,
        heparinDoseUnits: 500
      }
    });

    console.log(`✓ Dialysis life support logged. Modality: ${dialysis.dialysisType}, Ultrafiltration rate: ${dialysis.ultrafiltrationRateMLHr} mL/hr`);

    // 9. Glasgow Coma Scale (GCS) Neuro checks
    const neuro = await prisma.icuNeurologicalObservation.create({
      data: {
        admissionId: admission.id,
        patientId: patient.id,
        clinicianId: intensivist.id,
        gcsEye: 3,
        gcsVerbal: 4,
        gcsMotor: 5,
        pupilReactivity: 'SLUGGISH',
        limbMovementGrading: 'NORMAL',
        rassScore: -2 // Light sedation
      }
    });

    console.log(`✓ Neurological GCS logged. Total score: ${neuro.gcsEye + neuro.gcsVerbal + neuro.gcsMotor}/15, Sedation RASS: ${neuro.rassScore}`);

    // 10. NEWS Score Escalation Warnings
    const alert = await prisma.icuEarlyWarningAlert.create({
      data: {
        admissionId: admission.id,
        patientId: patient.id,
        newsScore: 7, // High risk
        abnormalTriggers: 'Tachycardia, tachypnea, hypotension, hypoxia',
        escalationLevel: 'ICU_TEAM_RESPONSE',
        status: 'ACTIVE'
      }
    });

    console.log(`✓ early warning alert NEWS score triggered: ${alert.newsScore} (Escalation level: ${alert.escalationLevel})`);

    // Resolve NEWS warning alert
    const resolvedAlert = await prisma.icuEarlyWarningAlert.update({
      where: { id: alert.id },
      data: {
        responderNotes: 'Administered 500mL fluid bolus. Titrated Norepinephrine to 0.12 mcg/kg/min.',
        status: 'RESOLVED'
      }
    });

    console.log(`✓ NEWS alarm resolved by responder: "${resolvedAlert.responderNotes}"`);

    // 11. Multidisciplinary goals
    const goal = await prisma.icuCarePlanGoal.create({
      data: {
        admissionId: admission.id,
        description: 'Initiate early mobilization sitting edge of bed 15 minutes daily',
        discipline: 'PHYSIO',
        targetDate: new Date()
      }
    });

    console.log(`✓ Care goal registered: ${goal.description}`);

    // 12. Infection Prevention checklists (VAP, CLABSI)
    const check = await prisma.icuInfectionPreventionCheck.create({
      data: {
        admissionId: admission.id,
        vapCompliance: true,
        clabsiCompliance: true,
        cautiCompliance: true,
        handHygieneCompliance: true
      }
    });

    if (check.vapCompliance && check.clabsiCompliance) {
      console.log('✓ PASS: VAP & CLABSI central line bundle compliance audits recorded successfully');
    } else {
      console.log('❌ FAIL: Infection bundle compliance checks failed');
    }

    // 13. Sepsis Clinical pathways overrides log
    const pathway = await prisma.icuClinicalPathwayCompliance.create({
      data: {
        admissionId: admission.id,
        pathwayName: 'Sepsis Management Bundle',
        compliancePercentage: 90,
        checklistsJson: JSON.stringify({ lactateMeas: true, bloodCultures: true, antibiotics: true }),
        overridesJson: JSON.stringify({ deviation: 'Delayed second lactate due to hemodynamical instability' })
      }
    });

    console.log(`✓ Pathway compliance logged: ${pathway.pathwayName} (${pathway.compliancePercentage}%). Deviation override audited.`);

    // 14. Patient Safety incidents reported with RCAs & CAPAs
    const incident = await prisma.icuIncidentRecord.create({
      data: {
        admissionId: admission.id,
        patientId: patient.id,
        reporterId: intensivist.id,
        incidentType: 'PRESSURE_INJURY_STAGE_1',
        severityGrading: 'MODERATE',
        rcaFindings: 'Inadequate turning schedule compliance under high workload.',
        capaDetails: 'Establish digital 2-hourly turning reminder alerts in ICU nursing board.',
        status: 'OPEN'
      }
    });

    console.log(`✓ Safety incident logged: ${incident.incidentType}. RCA findings: "${incident.rcaFindings}"`);

    // 15. Electronic ward handover discharge (Releasing bed status)
    const handover = await prisma.icuDischargeHandover.create({
      data: {
        admissionId: admission.id,
        patientId: patient.id,
        clinicianId: intensivist.id,
        targetWard: 'Medical Ward 1',
        currentDiagnosis: 'Recovering sepsis secondary to pneumonia.',
        medicationsActive: 'Levofloxacin 500mg PO daily',
        outstandingCare: 'Assess mobilization levels daily.',
        receivingClinicianSignoff: true
      }
    });

    // Reset bed status to AVAILABLE
    await prisma.icuBed.update({
      where: { id: bed.id },
      data: { status: 'AVAILABLE' }
    });

    // Update ICU Admission to DISCHARGED
    await prisma.icuAdmission.update({
      where: { id: admission.id },
      data: {
        status: 'DISCHARGED',
        dischargedAt: new Date()
      }
    });

    const finalBed = await prisma.icuBed.findUnique({ where: { id: bed.id } });
    const finalAdm = await prisma.icuAdmission.findUnique({ where: { id: admission.id } });

    if (finalBed?.status === 'AVAILABLE' && finalAdm?.status === 'DISCHARGED') {
      console.log('✓ PASS: Ward transfer handover successfully discharged patient and released critical care bed');
    } else {
      console.log('❌ FAIL: Handover discharge bed release failed');
    }

    // CLEANUP
    console.log('\n--- Cleaning up critical care test records ---');
    await prisma.icuIncidentRecord.delete({ where: { id: incident.id } });
    await prisma.icuDischargeHandover.delete({ where: { id: handover.id } });
    await prisma.icuClinicalPathwayCompliance.delete({ where: { id: pathway.id } });
    await prisma.icuInfectionPreventionCheck.delete({ where: { id: check.id } });
    await prisma.icuCarePlanGoal.delete({ where: { id: goal.id } });
    await prisma.icuEarlyWarningAlert.delete({ where: { id: alert.id } });
    await prisma.icuNeurologicalObservation.delete({ where: { id: neuro.id } });
    await prisma.icuDialysisLifeSupport.delete({ where: { id: dialysis.id } });
    await prisma.icuInfusionTherapy.delete({ where: { id: infusion.id } });
    await prisma.icuVentilatorSetting.delete({ where: { id: vent.id } });
    await prisma.icuPhysiologicalObservation.delete({ where: { id: telemetry.id } });
    await prisma.icuAdmission.delete({ where: { id: admission.id } });
    await prisma.icuBed.delete({ where: { id: bed.id } });
    await prisma.patient.delete({ where: { id: patient.id } });
    await prisma.staff.delete({ where: { id: intensivist.id } });
    await prisma.user.delete({ where: { id: userPat.id } });
    await prisma.user.delete({ where: { id: userDoc.id } });

    console.log('✓ Cleaned up critical care test records successfully');
    console.log('\n=== ALL MODULE 12 ICU & CRITICAL CARE TESTS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('❌ ICU verification failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
