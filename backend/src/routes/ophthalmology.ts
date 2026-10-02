import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ── 1. GET /api/ophthalmology/encounters ─────────────────────────────────────
router.get('/encounters', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, status } = req.query as { patientId?: string; status?: string };
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const encounters = await prisma.eyeEncounter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            gender: true,
            birthDate: true,
            bloodGroup: true,
          }
        },
        refractions: {
          orderBy: { createdAt: 'desc' }
        },
        iopMeasurements: {
          orderBy: { timeMeasured: 'desc' }
        },
        drawings: {
          orderBy: { createdAt: 'desc' }
        },
        opticalPrescriptions: {
          orderBy: { createdAt: 'desc' }
        }
      },
      take: 50
    });

    return res.json({ success: true, data: encounters });
  } catch (err: any) {
    console.error('[Ophthalmology] List encounters error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. GET /api/ophthalmology/encounters/:id ─────────────────────────────────
router.get('/encounters/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const encounter = await prisma.eyeEncounter.findUnique({
      where: { id },
      include: {
        patient: true,
        refractions: { orderBy: { createdAt: 'desc' } },
        iopMeasurements: { orderBy: { timeMeasured: 'desc' } },
        drawings: { orderBy: { createdAt: 'desc' } },
        opticalPrescriptions: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!encounter) {
      return res.status(404).json({ success: false, message: 'Eye encounter not found' });
    }

    return res.json({ success: true, data: encounter });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. POST /api/ophthalmology/encounters ────────────────────────────────────
router.post('/encounters', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const {
      patientId,
      visitId,
      chiefComplaint,
      historyOfPresentIllness,
      generalExam,
      anteriorSegmentOD,
      anteriorSegmentOS,
      posteriorFundusOD,
      posteriorFundusOS,
      cupToDiscRatioOD,
      cupToDiscRatioOS,
      diagnosisOD,
      diagnosisOS,
      clinicalManagementPlan,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    const ophthalmologistName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Dr. Attending Ophthalmologist';
    const encounterNumber = `EYE-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const encounter = await prisma.eyeEncounter.create({
      data: {
        encounterNumber,
        patientId,
        ophthalmologistId: user?.id || 'EYE-MD-SYSTEM',
        ophthalmologistName,
        visitId: visitId || null,
        chiefComplaint: chiefComplaint || 'Routine Ophthalmic & Visual Acuity Assessment',
        historyOfPresentIllness,
        generalExam,
        anteriorSegmentOD,
        anteriorSegmentOS,
        posteriorFundusOD,
        posteriorFundusOS,
        cupToDiscRatioOD: cupToDiscRatioOD ? Number(cupToDiscRatioOD) : null,
        cupToDiscRatioOS: cupToDiscRatioOS ? Number(cupToDiscRatioOS) : null,
        diagnosisOD,
        diagnosisOS,
        clinicalManagementPlan,
        status: 'IN_PROGRESS'
      },
      include: {
        patient: true
      }
    });

    return res.json({
      success: true,
      message: `Eye Clinic Encounter ${encounterNumber} created`,
      data: encounter
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. PUT /api/ophthalmology/encounters/:id ─────────────────────────────────
router.put('/encounters/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      chiefComplaint,
      historyOfPresentIllness,
      generalExam,
      anteriorSegmentOD,
      anteriorSegmentOS,
      posteriorFundusOD,
      posteriorFundusOS,
      cupToDiscRatioOD,
      cupToDiscRatioOS,
      diagnosisOD,
      diagnosisOS,
      clinicalManagementPlan,
      status
    } = req.body;

    const encounter = await prisma.eyeEncounter.update({
      where: { id },
      data: {
        chiefComplaint,
        historyOfPresentIllness,
        generalExam,
        anteriorSegmentOD,
        anteriorSegmentOS,
        posteriorFundusOD,
        posteriorFundusOS,
        cupToDiscRatioOD: cupToDiscRatioOD !== undefined ? (cupToDiscRatioOD ? Number(cupToDiscRatioOD) : null) : undefined,
        cupToDiscRatioOS: cupToDiscRatioOS !== undefined ? (cupToDiscRatioOS ? Number(cupToDiscRatioOS) : null) : undefined,
        diagnosisOD,
        diagnosisOS,
        clinicalManagementPlan,
        status: status || undefined,
      },
      include: {
        patient: true,
        refractions: true,
        iopMeasurements: true,
        drawings: true,
        opticalPrescriptions: true,
      }
    });

    return res.json({ success: true, data: encounter });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. POST /api/ophthalmology/encounters/:id/refractions ─────────────────────
// Save Dual-Eye OD/OS Refraction & Acuity Assessment
router.post('/encounters/:id/refractions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      examType,
      vaDistanceOD,
      vaNearOD,
      sphereOD,
      cylinderOD,
      axisOD,
      addOD,
      bcvaOD,
      vaDistanceOS,
      vaNearOS,
      sphereOS,
      cylinderOS,
      axisOS,
      addOS,
      bcvaOS,
      vaDistanceOU,
      pupillaryDistanceMM,
      notes
    } = req.body;

    const refraction = await prisma.eyeRefractionExam.create({
      data: {
        eyeEncounterId: id,
        examType: examType || 'MANIFEST',
        vaDistanceOD: vaDistanceOD || '6/6 (20/20)',
        vaNearOD: vaNearOD || 'N6',
        sphereOD: sphereOD !== undefined && sphereOD !== '' ? Number(sphereOD) : null,
        cylinderOD: cylinderOD !== undefined && cylinderOD !== '' ? Number(cylinderOD) : null,
        axisOD: axisOD !== undefined && axisOD !== '' ? Number(axisOD) : null,
        addOD: addOD !== undefined && addOD !== '' ? Number(addOD) : null,
        bcvaOD: bcvaOD || '6/6',
        vaDistanceOS: vaDistanceOS || '6/6 (20/20)',
        vaNearOS: vaNearOS || 'N6',
        sphereOS: sphereOS !== undefined && sphereOS !== '' ? Number(sphereOS) : null,
        cylinderOS: cylinderOS !== undefined && cylinderOS !== '' ? Number(cylinderOS) : null,
        axisOS: axisOS !== undefined && axisOS !== '' ? Number(axisOS) : null,
        addOS: addOS !== undefined && addOS !== '' ? Number(addOS) : null,
        bcvaOS: bcvaOS || '6/6',
        vaDistanceOU: vaDistanceOU || '6/6',
        pupillaryDistanceMM: pupillaryDistanceMM ? Number(pupillaryDistanceMM) : 64,
        notes: notes || null
      }
    });

    return res.json({ success: true, data: refraction });
  } catch (err: any) {
    console.error('[Eye Refraction error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. POST /api/ophthalmology/encounters/:id/iop ─────────────────────────────
// Record Tonometry & Intraocular Pressure (IOP)
router.post('/encounters/:id/iop', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { patientId, method, iopOD, iopOS, pachymetryOD, pachymetryOS, antiGlaucomaMeds, notes } = req.body;

    const measurement = await prisma.eyeIopMeasurement.create({
      data: {
        eyeEncounterId: id,
        patientId: patientId || (await prisma.eyeEncounter.findUnique({ where: { id }, select: { patientId: true } }))?.patientId || '',
        method: method || 'GOLDMANN',
        iopOD: Number(iopOD) || 15.0,
        iopOS: Number(iopOS) || 15.0,
        pachymetryOD: pachymetryOD ? Number(pachymetryOD) : null,
        pachymetryOS: pachymetryOS ? Number(pachymetryOS) : null,
        antiGlaucomaMeds: antiGlaucomaMeds || null,
        notes: notes || null
      }
    });

    return res.json({ success: true, data: measurement });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 7. GET /api/ophthalmology/iop-trends/:patientId ──────────────────────────
// Longitudinal Glaucoma and IOP trend analysis across time
router.get('/iop-trends/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const measurements = await prisma.eyeIopMeasurement.findMany({
      where: { patientId },
      orderBy: { timeMeasured: 'asc' },
      include: {
        eyeEncounter: {
          select: {
            encounterNumber: true,
            ophthalmologistName: true,
            diagnosisOD: true,
            diagnosisOS: true
          }
        }
      }
    });

    return res.json({ success: true, data: measurements });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 8. POST /api/ophthalmology/encounters/:id/drawings ────────────────────────
// Visual Anatomical Drawing & Annotation (Fundus / Anterior segment)
router.post('/encounters/:id/drawings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { eyeSide, anatomicZone, canvasSvgJson, pngDataUrl, annotations } = req.body;

    const drawing = await prisma.eyeAnatomicalDrawing.create({
      data: {
        eyeEncounterId: id,
        eyeSide: eyeSide || 'OD',
        anatomicZone: anatomicZone || 'RETINA_FUNDUS',
        canvasSvgJson: typeof canvasSvgJson === 'string' ? canvasSvgJson : JSON.stringify(canvasSvgJson || {}),
        pngDataUrl: pngDataUrl || null,
        annotations: annotations || null
      }
    });

    return res.json({ success: true, data: drawing });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 9. POST /api/ophthalmology/encounters/:id/optical-prescriptions ──────────
// E-Prescribing for Spectacles & Contact Lenses dispatched to Optical Shop
router.post('/encounters/:id/optical-prescriptions', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const {
      patientId,
      lensType,
      lensMaterial,
      coatings,
      sphereOD,
      cylinderOD,
      axisOD,
      addOD,
      sphereOS,
      cylinderOS,
      axisOS,
      addOS,
      pdDistanceMM,
      pdNearMM,
      usageAdvice,
      expiryDays
    } = req.body;

    const rxNumber = `OPT-RX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (expiryDays || 365));

    const prescription = await prisma.eyeOpticalPrescription.create({
      data: {
        rxNumber,
        eyeEncounterId: id,
        patientId: patientId || (await prisma.eyeEncounter.findUnique({ where: { id }, select: { patientId: true } }))?.patientId || '',
        prescribedById: user?.id || 'OPTOMETRIST-SYSTEM',
        lensType: lensType || 'PROGRESSIVE',
        lensMaterial: lensMaterial || 'POLYCARBONATE_159',
        coatings: Array.isArray(coatings) ? coatings : ['ANTI_REFLECTIVE', 'UV_400', 'BLUE_BLOCKER'],
        sphereOD: Number(sphereOD) || 0,
        cylinderOD: Number(cylinderOD) || 0,
        axisOD: Number(axisOD) || 0,
        addOD: Number(addOD) || 0,
        sphereOS: Number(sphereOS) || 0,
        cylinderOS: Number(cylinderOS) || 0,
        axisOS: Number(axisOS) || 0,
        addOS: Number(addOS) || 0,
        pdDistanceMM: Number(pdDistanceMM) || 64,
        pdNearMM: pdNearMM ? Number(pdNearMM) : null,
        usageAdvice: usageAdvice || 'Constant wear for distance and reading; anti-fatigue screen filter.',
        expiryDate,
        status: 'DISPATCHED_TO_OPTICAL_SHOP'
      }
    });

    return res.json({
      success: true,
      message: `Optical Prescription ${rxNumber} generated and dispatched to Optical Shop`,
      data: prescription
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 10. POST /api/ophthalmology/telemetry-import ─────────────────────────────
// Diagnostic Equipment Telemetry simulation (Nidek/Topcon Auto-Refractor, Zeiss Humphrey, OCT)
router.post('/telemetry-import', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { deviceType } = req.body;

    const telemetryPayload = {
      deviceModel: deviceType || 'TOPCON KR-800 Auto Kerato-Refractometer',
      deviceSerial: 'TPC-884920-ENG',
      connectedVia: 'HL7 FHIR v4.0.1 / DICOM Modality Worklist',
      status: 'CALIBRATED_ONLINE',
      od: {
        sphere: -1.75,
        cylinder: -0.75,
        axis: 85,
        se: -2.12,
        k1: '43.25 D @ 85°',
        k2: '44.00 D @ 175°',
        cornealAstigmatism: '-0.75 D'
      },
      os: {
        sphere: -2.00,
        cylinder: -0.50,
        axis: 95,
        se: -2.25,
        k1: '43.50 D @ 95°',
        k2: '44.25 D @ 5°',
        cornealAstigmatism: '-0.75 D'
      },
      pupillaryDistanceMM: 63.5,
      confidenceScore: '99.8%'
    };

    return res.json({ success: true, data: telemetryPayload });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
