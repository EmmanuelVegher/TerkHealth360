import { Router } from 'express';


const router = Router();
import { prisma } from '../prisma.js';

// ─── 12.1 ADMISSIONS & BED MANAGEMENT ────────────────────────────────────────

// Fetch all critical care admissions
router.get('/admissions', async (req, res, next) => {
  try {
    const list = await prisma.icuAdmission.findMany({
      include: {
        patient: true,
        admittingStaff: true,
        bed: true,
        careGoals: true,
        equipments: true,
        observations: { orderBy: { loggedAt: 'desc' }, take: 10 },
        ventilators: { orderBy: { loggedAt: 'desc' }, take: 5 },
        infusions: true,
        dialysisRuns: true,
        neuroObservations: { orderBy: { loggedAt: 'desc' }, take: 5 },
        warningAlerts: { orderBy: { triggeredAt: 'desc' } },
        progressNotes: true,
        infectionChecks: true,
        pathways: true,
        handovers: true,
        incidents: true
      },
      orderBy: { admittedAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

// Request an ICU/HDU admission
router.post('/admissions', async (req, res, next) => {
  try {
    const { patientId, admittingStaffId, diagnosis, severityScore, indication, urgency } = req.body;
    const admissionCode = `ADM-ICU-${Date.now().toString().slice(-5)}`;

    const icuAdm = await prisma.icuAdmission.create({
      data: {
        admissionCode,
        patientId,
        admittingStaffId,
        diagnosis,
        severityScore: Number(severityScore || 0),
        indication,
        urgency: urgency || 'URGENT',
        status: 'PENDING'
      }
    });

    res.status(201).json(icuAdm);
  } catch (error) {
    next(error);
  }
});

// Approve admission and allocate ICU bed (prevention of double allocation)
router.post('/admissions/:id/approve', async (req, res, next) => {
  try {
    const { bedId } = req.body;

    // Check if the bed is already occupied
    const bed = await prisma.icuBed.findUnique({ where: { id: bedId } });
    if (!bed) {
      return res.status(404).json({ error: 'ICU Bed not found.' });
    }
    if (bed.status === 'OCCUPIED') {
      return res.status(409).json({ error: 'ICU double-allocation protection: Allocated bed is currently occupied.' });
    }

    // Update bed status to OCCUPIED
    await prisma.icuBed.update({
      where: { id: bedId },
      data: { status: 'OCCUPIED' }
    });

    // Update ICU admission status
    const updated = await prisma.icuAdmission.update({
      where: { id: req.params.id },
      data: {
        bedId,
        status: 'ADMITTED'
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Fetch ICU Beds
router.get('/beds', async (req, res, next) => {
  try {
    let list = await prisma.icuBed.findMany();
    if (list.length === 0) {
      await prisma.icuBed.createMany({
        data: [
          { bedCode: 'ICU-BED-01', unit: 'ICU', isolationRules: 'Negative Pressure Airborne Isolation', status: 'AVAILABLE' },
          { bedCode: 'ICU-BED-02', unit: 'ICU', isolationRules: 'Standard Critical Care Bay', status: 'AVAILABLE' },
          { bedCode: 'HDU-BED-03', unit: 'HDU', isolationRules: 'High Dependency Monitoring Bay', status: 'AVAILABLE' },
          { bedCode: 'ICU-BED-04', unit: 'ICU', isolationRules: 'Protective Contact Isolation', status: 'AVAILABLE' },
        ]
      });
      list = await prisma.icuBed.findMany();
    }
    res.json(list);
  } catch (error) {
    next(error);
  }
});

// Register/create new critical care beds
router.post('/beds', async (req, res, next) => {
  try {
    const { bedCode, unit, isolationRules } = req.body;
    const bed = await prisma.icuBed.create({
      data: {
        bedCode,
        unit: unit || 'ICU',
        isolationRules,
        status: 'AVAILABLE'
      }
    });
    res.status(201).json(bed);
  } catch (error) {
    next(error);
  }
});

// ─── 12.2 PHYSIOLOGICAL RECORDING & MEDICAL DEVICES ─────────────────────────

// Record vital signs observations
router.post('/admissions/:id/observations', async (req, res, next) => {
  try {
    const {
      patientId, observerId, heartRate, bpSystolic, bpDiastolic, respirationRate, spo2, temperature,
      centralVenousPressure, arterialPressure, intracranialPressure, cardiacOutput
    } = req.body;

    const obs = await prisma.icuPhysiologicalObservation.create({
      data: {
        admissionId: req.params.id,
        patientId,
        observerId,
        heartRate: Number(heartRate),
        bpSystolic: Number(bpSystolic),
        bpDiastolic: Number(bpDiastolic),
        respirationRate: Number(respirationRate),
        spo2: Number(spo2),
        temperature: Number(temperature),
        centralVenousPressure: centralVenousPressure ? Number(centralVenousPressure) : null,
        arterialPressure: arterialPressure ? Number(arterialPressure) : null,
        intracranialPressure: intracranialPressure ? Number(intracranialPressure) : null,
        cardiacOutput: cardiacOutput ? Number(cardiacOutput) : null
      }
    });

    res.status(201).json(obs);
  } catch (error) {
    next(error);
  }
});

// Record ventilator setting parameters (extubation ready assessments)
router.post('/admissions/:id/ventilator', async (req, res, next) => {
  try {
    const { mode, tidalVolumeML, respirationRate, fio2Percentage, peepH2O, supportPressureH2O, pressureInspiratoryH2O, weaningStatus, extubationReadiness } = req.body;

    const vent = await prisma.icuVentilatorSetting.create({
      data: {
        admissionId: req.params.id,
        mode,
        tidalVolumeML: Number(tidalVolumeML),
        respirationRate: Number(respirationRate),
        fio2Percentage: Number(fio2Percentage),
        peepH2O: Number(peepH2O),
        supportPressureH2O: Number(supportPressureH2O),
        pressureInspiratoryH2O: Number(pressureInspiratoryH2O),
        weaningStatus: weaningStatus || 'ONGOING',
        extubationReadiness
      }
    });

    res.status(201).json(vent);
  } catch (error) {
    next(error);
  }
});

// Record continuous medication infusions (with high alert double verification checks)
router.post('/admissions/:id/infusions', async (req, res, next) => {
  try {
    const { patientId, medicationName, concentration, doseRate, initialClinicianId, verifiedClinicianId, isHighAlert } = req.body;

    // Business rule validation: high alert medication requires verifiedClinicianId signature dual-verification check
    if (isHighAlert && !verifiedClinicianId) {
      return res.status(400).json({
        error: 'Safety Alert: High-Alert medication infusion titration requires double-verification clinician checklist signoff.'
      });
    }

    const infusion = await prisma.icuInfusionTherapy.create({
      data: {
        admissionId: req.params.id,
        patientId,
        medicationName,
        concentration,
        doseRate,
        initialClinicianId,
        verifiedClinicianId: isHighAlert ? verifiedClinicianId : null,
        isHighAlert: !!isHighAlert
      }
    });

    res.status(201).json(infusion);
  } catch (error) {
    next(error);
  }
});

// Record dialysis / CRRT
router.post('/admissions/:id/dialysis', async (req, res, next) => {
  try {
    const { patientId, dialysisType, ultrafiltrationRateMLHr, heparinDoseUnits } = req.body;

    const run = await prisma.icuDialysisLifeSupport.create({
      data: {
        admissionId: req.params.id,
        patientId,
        dialysisType,
        ultrafiltrationRateMLHr: Number(ultrafiltrationRateMLHr),
        heparinDoseUnits: Number(heparinDoseUnits)
      }
    });

    res.status(201).json(run);
  } catch (error) {
    next(error);
  }
});

// ─── 12.2 NEUROLOGICAL & NEWS EARLY WARNING ──────────────────────────────────

// Record GCS & neurological assessments
router.post('/admissions/:id/neuro', async (req, res, next) => {
  try {
    const { patientId, clinicianId, gcsEye, gcsVerbal, gcsMotor, pupilReactivity, limbMovementGrading, rassScore } = req.body;

    const neuro = await prisma.icuNeurologicalObservation.create({
      data: {
        admissionId: req.params.id,
        patientId,
        clinicianId,
        gcsEye: Number(gcsEye),
        gcsVerbal: Number(gcsVerbal),
        gcsMotor: Number(gcsMotor),
        pupilReactivity,
        limbMovementGrading,
        rassScore: Number(rassScore || 0)
      }
    });

    res.status(201).json(neuro);
  } catch (error) {
    next(error);
  }
});

// Raise NEWS score alerts
router.post('/admissions/:id/alerts', async (req, res, next) => {
  try {
    const { patientId, newsScore, abnormalTriggers, escalationLevel } = req.body;

    const alert = await prisma.icuEarlyWarningAlert.create({
      data: {
        admissionId: req.params.id,
        patientId,
        newsScore: Number(newsScore),
        abnormalTriggers,
        escalationLevel: escalationLevel || 'NONE',
        status: 'ACTIVE'
      }
    });

    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
});

// Resolve NEWS score alerts
router.put('/alerts/:id/resolve', async (req, res, next) => {
  try {
    const { responderNotes } = req.body;

    const alert = await prisma.icuEarlyWarningAlert.update({
      where: { id: req.params.id },
      data: {
        responderNotes,
        status: 'RESOLVED'
      }
    });

    res.json(alert);
  } catch (error) {
    next(error);
  }
});

// ─── 12.3 PROGRESS NOTES & CARE PATHWAYS ─────────────────────────────────────

// Record progress notes
router.post('/admissions/:id/notes', async (req, res, next) => {
  try {
    const { notes, assessments } = req.body;

    const note = await prisma.icuProgressNote.create({
      data: {
        admissionId: req.params.id,
        notes,
        assessments
      }
    });

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

// Record Care goals
router.post('/admissions/:id/goals', async (req, res, next) => {
  try {
    const { description, discipline, targetDate } = req.body;

    const goal = await prisma.icuCarePlanGoal.create({
      data: {
        admissionId: req.params.id,
        description,
        discipline,
        targetDate: new Date(targetDate)
      }
    });

    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
});

// Complete care goals
router.put('/goals/:id', async (req, res, next) => {
  try {
    const { status } = req.body;

    const goal = await prisma.icuCarePlanGoal.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json(goal);
  } catch (error) {
    next(error);
  }
});

// Log Infection checks checklists (VAP, CLABSI, CAUTI prevention compliance)
router.post('/admissions/:id/infection-checks', async (req, res, next) => {
  try {
    const { vapCompliance, clabsiCompliance, cautiCompliance, handHygieneCompliance } = req.body;

    const check = await prisma.icuInfectionPreventionCheck.create({
      data: {
        admissionId: req.params.id,
        vapCompliance: !!vapCompliance,
        clabsiCompliance: !!clabsiCompliance,
        cautiCompliance: !!cautiCompliance,
        handHygieneCompliance: !!handHygieneCompliance
      }
    });

    res.status(201).json(check);
  } catch (error) {
    next(error);
  }
});

// Pathway overrides log audits
router.post('/admissions/:id/pathway-compliance', async (req, res, next) => {
  try {
    const { pathwayName, compliancePercentage, checklistsJson, overridesJson } = req.body;

    const comp = await prisma.icuClinicalPathwayCompliance.create({
      data: {
        admissionId: req.params.id,
        pathwayName,
        compliancePercentage: Number(compliancePercentage),
        checklistsJson,
        overridesJson
      }
    });

    res.status(201).json(comp);
  } catch (error) {
    next(error);
  }
});

// Electronic ward handover
router.post('/admissions/:id/handover', async (req, res, next) => {
  try {
    const { patientId, clinicianId, targetWard, currentDiagnosis, medicationsActive, outstandingCare } = req.body;

    const handover = await prisma.icuDischargeHandover.create({
      data: {
        admissionId: req.params.id,
        patientId,
        clinicianId,
        targetWard,
        currentDiagnosis,
        medicationsActive,
        outstandingCare,
        receivingClinicianSignoff: false
      }
    });

    // Release ICU bed status
    const adm = await prisma.icuAdmission.findUnique({ where: { id: req.params.id } });
    if (adm?.bedId) {
      await prisma.icuBed.update({
        where: { id: adm.bedId },
        data: { status: 'AVAILABLE' }
      });
    }

    // Update ICU admission status to DISCHARGED
    await prisma.icuAdmission.update({
      where: { id: req.params.id },
      data: {
        status: 'DISCHARGED',
        dischargedAt: new Date()
      }
    });

    res.status(201).json(handover);
  } catch (error) {
    next(error);
  }
});

// ─── 12.4 QUALITY GOVERNANCE & RATIOS ────────────────────────────────────────

// Log Patient Safety incident with RCA CAPAs
router.post('/admissions/:id/incidents', async (req, res, next) => {
  try {
    const { patientId, reporterId, incidentType, severityGrading, rcaFindings, capaDetails } = req.body;

    const incident = await prisma.icuIncidentRecord.create({
      data: {
        admissionId: req.params.id,
        patientId,
        reporterId,
        incidentType,
        severityGrading,
        rcaFindings,
        capaDetails
      }
    });

    res.status(201).json(incident);
  } catch (error) {
    next(error);
  }
});

// Update RCA investigations status
router.put('/incidents/:id/rca', async (req, res, next) => {
  try {
    const { status, rcaFindings, capaDetails } = req.body;

    const record = await prisma.icuIncidentRecord.update({
      where: { id: req.params.id },
      data: {
        status,
        rcaFindings,
        capaDetails
      }
    });

    res.json(record);
  } catch (error) {
    next(error);
  }
});

// Create Staffing Shift Workload ratios
router.post('/staffing-shifts', async (req, res, next) => {
  try {
    const { clinicianId, shiftName, patientRatio, acuityWorkloadScore } = req.body;

    const shift = await prisma.icuStaffingShift.create({
      data: {
        clinicianId,
        shiftName,
        patientRatio: Number(patientRatio),
        acuityWorkloadScore: Number(acuityWorkloadScore || 10)
      }
    });

    res.status(201).json(shift);
  } catch (error) {
    next(error);
  }
});

// Get staffing shift history
router.get('/staffing-shifts', async (req, res, next) => {
  try {
    const list = await prisma.icuStaffingShift.findMany({
      include: { clinician: true },
      orderBy: { shiftDate: 'desc' }
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

export default router;
