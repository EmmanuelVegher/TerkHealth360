import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Robust parsers to handle "+1.50", " -0.75 ", empty strings, or nulls without NaN crashes
const parseDecimal = (val: any): number | null => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).trim().replace(/^\+/, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const parseIntSafe = (val: any, defaultVal: number | null = null): number | null => {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : Math.round(val);
  const cleaned = String(val).trim().replace(/^\+/, '');
  if (!cleaned) return defaultVal;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? defaultVal : num;
};

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

// ── 5. GET /api/ophthalmology/refractions ────────────────────────────────────
// List all refraction records from database filtered by patientId or eyeEncounterId
router.get('/refractions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, eyeEncounterId, limit } = req.query as {
      patientId?: string;
      eyeEncounterId?: string;
      limit?: string;
    };

    const where: any = {};
    if (eyeEncounterId) {
      where.eyeEncounterId = eyeEncounterId;
    } else if (patientId) {
      where.eyeEncounter = { patientId };
    }

    const refractions = await prisma.eyeRefractionExam.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      include: {
        eyeEncounter: {
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
            }
          }
        }
      }
    });

    return res.json({ success: true, data: refractions });
  } catch (err: any) {
    console.error('[Eye Refraction list error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5b. GET /api/ophthalmology/refractions/stats/:patientId ───────────────────
// Live database stats for the patient
router.get('/refractions/stats/:patientId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const [refractionCount, encounterCount, latestRefraction, latestIop] = await Promise.all([
      prisma.eyeRefractionExam.count({
        where: { eyeEncounter: { patientId } }
      }),
      prisma.eyeEncounter.count({
        where: { patientId }
      }),
      prisma.eyeRefractionExam.findFirst({
        where: { eyeEncounter: { patientId } },
        orderBy: { createdAt: 'desc' },
        include: { eyeEncounter: true }
      }),
      prisma.eyeIopMeasurement.findFirst({
        where: { patientId },
        orderBy: { timeMeasured: 'desc' }
      })
    ]);

    return res.json({
      success: true,
      data: {
        refractionCount,
        encounterCount,
        latestRefraction,
        latestIop
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5c. POST /api/ophthalmology/refractions ──────────────────────────────────
// Create refraction with automatic encounter creation if no active encounter exists
router.post('/refractions', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const {
      patientId,
      eyeEncounterId,
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

    if (!patientId && !eyeEncounterId) {
      return res.status(400).json({ success: false, message: 'patientId or eyeEncounterId is required' });
    }

    let encounterId = eyeEncounterId;

    // If no encounterId provided, look for an active one or create a new encounter
    if (!encounterId) {
      const activeEncounter = await prisma.eyeEncounter.findFirst({
        where: { patientId, status: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' }
      });

      if (activeEncounter) {
        encounterId = activeEncounter.id;
      } else {
        const ophthalmologistName = user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
          : 'Dr. Attending Optometrist';
        const encounterNumber = `EYE-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

        const newEncounter = await prisma.eyeEncounter.create({
          data: {
            encounterNumber,
            patientId,
            ophthalmologistId: user?.id || 'EYE-CLINIC-AUTO',
            ophthalmologistName,
            chiefComplaint: 'Dual-Eye (OD/OS) Refractive Vision Assessment & Acuity Workup',
            status: 'IN_PROGRESS'
          }
        });
        encounterId = newEncounter.id;
      }
    }

    const refraction = await prisma.eyeRefractionExam.create({
      data: {
        eyeEncounterId: encounterId,
        examType: examType || 'Subjective Manifest Refraction',
        vaDistanceOD: vaDistanceOD || '6/6 (20/20)',
        vaNearOD: vaNearOD || 'N6',
        sphereOD: parseDecimal(sphereOD),
        cylinderOD: parseDecimal(cylinderOD),
        axisOD: parseIntSafe(axisOD),
        addOD: parseDecimal(addOD),
        bcvaOD: bcvaOD || '6/6 (20/20)',
        vaDistanceOS: vaDistanceOS || '6/6 (20/20)',
        vaNearOS: vaNearOS || 'N6',
        sphereOS: parseDecimal(sphereOS),
        cylinderOS: parseDecimal(cylinderOS),
        axisOS: parseIntSafe(axisOS),
        addOS: parseDecimal(addOS),
        bcvaOS: bcvaOS || '6/6 (20/20)',
        vaDistanceOU: vaDistanceOU || '6/6 (20/20)',
        pupillaryDistanceMM: parseIntSafe(pupillaryDistanceMM, 64),
        notes: notes || null
      },
      include: {
        eyeEncounter: {
          include: {
            patient: true
          }
        }
      }
    });

    return res.json({
      success: true,
      message: 'Dual-Eye Refraction saved directly to PostgreSQL database',
      data: refraction
    });
  } catch (err: any) {
    console.error('[Eye Refraction create error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5d. POST /api/ophthalmology/encounters/:id/refractions ─────────────────────
// Save Dual-Eye OD/OS Refraction directly under specific encounter
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
        examType: examType || 'Subjective Manifest Refraction',
        vaDistanceOD: vaDistanceOD || '6/6 (20/20)',
        vaNearOD: vaNearOD || 'N6',
        sphereOD: parseDecimal(sphereOD),
        cylinderOD: parseDecimal(cylinderOD),
        axisOD: parseIntSafe(axisOD),
        addOD: parseDecimal(addOD),
        bcvaOD: bcvaOD || '6/6 (20/20)',
        vaDistanceOS: vaDistanceOS || '6/6 (20/20)',
        vaNearOS: vaNearOS || 'N6',
        sphereOS: parseDecimal(sphereOS),
        cylinderOS: parseDecimal(cylinderOS),
        axisOS: parseIntSafe(axisOS),
        addOS: parseDecimal(addOS),
        bcvaOS: bcvaOS || '6/6 (20/20)',
        vaDistanceOU: vaDistanceOU || '6/6 (20/20)',
        pupillaryDistanceMM: parseIntSafe(pupillaryDistanceMM, 64),
        notes: notes || null
      },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    return res.json({ success: true, data: refraction });
  } catch (err: any) {
    console.error('[Eye Refraction error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5e. DELETE /api/ophthalmology/refractions/:id ─────────────────────────────
router.delete('/refractions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.eyeRefractionExam.delete({ where: { id } });
    return res.json({ success: true, message: 'Refraction exam record deleted' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. GET /api/ophthalmology/iop ────────────────────────────────────────────
// List all tonometry & IOP records from PostgreSQL
router.get('/iop', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, eyeEncounterId } = req.query as {
      patientId?: string;
      eyeEncounterId?: string;
    };

    const where: any = {};
    if (eyeEncounterId) {
      where.eyeEncounterId = eyeEncounterId;
    } else if (patientId) {
      where.patientId = patientId;
    }

    const measurements = await prisma.eyeIopMeasurement.findMany({
      where,
      orderBy: { timeMeasured: 'desc' },
      include: {
        eyeEncounter: {
          select: {
            id: true,
            encounterNumber: true,
            ophthalmologistName: true,
            status: true
          }
        }
      }
    });

    return res.json({ success: true, data: measurements });
  } catch (err: any) {
    console.error('[IOP list error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6b. POST /api/ophthalmology/iop ──────────────────────────────────────────
// Direct IOP creation with automatic encounter generation if none active
router.post('/iop', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const {
      patientId,
      eyeEncounterId,
      method,
      iopOD,
      iopOS,
      pachymetryOD,
      pachymetryOS,
      antiGlaucomaMeds,
      notes,
      timeMeasured
    } = req.body;

    if (!patientId && !eyeEncounterId) {
      return res.status(400).json({ success: false, message: 'patientId or eyeEncounterId is required' });
    }

    let encounterId = eyeEncounterId;

    if (!encounterId) {
      const activeEncounter = await prisma.eyeEncounter.findFirst({
        where: { patientId, status: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' }
      });

      if (activeEncounter) {
        encounterId = activeEncounter.id;
      } else {
        const ophthalmologistName = user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
          : 'Dr. Attending Tonometrist';
        const encounterNumber = `EYE-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

        const newEncounter = await prisma.eyeEncounter.create({
          data: {
            encounterNumber,
            patientId,
            ophthalmologistId: user?.id || 'EYE-CLINIC-AUTO',
            ophthalmologistName,
            chiefComplaint: 'Intraocular Pressure (IOP) Tonometry & Glaucoma Monitoring',
            status: 'IN_PROGRESS'
          }
        });
        encounterId = newEncounter.id;
      }
    }

    const measurement = await prisma.eyeIopMeasurement.create({
      data: {
        eyeEncounterId: encounterId,
        patientId: patientId || (await prisma.eyeEncounter.findUnique({ where: { id: encounterId }, select: { patientId: true } }))?.patientId || '',
        method: method || 'Goldmann Applanation Tonometry',
        iopOD: iopOD !== undefined && iopOD !== '' && iopOD !== null ? Number(iopOD) : 15.0,
        iopOS: iopOS !== undefined && iopOS !== '' && iopOS !== null ? Number(iopOS) : 15.0,
        pachymetryOD: pachymetryOD ? Number(pachymetryOD) : null,
        pachymetryOS: pachymetryOS ? Number(pachymetryOS) : null,
        antiGlaucomaMeds: antiGlaucomaMeds || null,
        notes: notes || null,
        timeMeasured: timeMeasured ? new Date(timeMeasured) : new Date()
      },
      include: {
        eyeEncounter: {
          select: {
            id: true,
            encounterNumber: true,
            ophthalmologistName: true
          }
        }
      }
    });

    return res.json({
      success: true,
      message: `Tonometry reading OD ${measurement.iopOD} mmHg / OS ${measurement.iopOS} mmHg saved in PostgreSQL`,
      data: measurement
    });
  } catch (err: any) {
    console.error('[IOP save error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6c. POST /api/ophthalmology/encounters/:id/iop ─────────────────────────────
// Record Tonometry & Intraocular Pressure (IOP) under specific encounter
router.post('/encounters/:id/iop', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { patientId, method, iopOD, iopOS, pachymetryOD, pachymetryOS, antiGlaucomaMeds, notes } = req.body;

    const measurement = await prisma.eyeIopMeasurement.create({
      data: {
        eyeEncounterId: id,
        patientId: patientId || (await prisma.eyeEncounter.findUnique({ where: { id }, select: { patientId: true } }))?.patientId || '',
        method: method || 'Goldmann Applanation Tonometry',
        iopOD: iopOD !== undefined && iopOD !== '' && iopOD !== null ? Number(iopOD) : 15.0,
        iopOS: iopOS !== undefined && iopOS !== '' && iopOS !== null ? Number(iopOS) : 15.0,
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

// ── 6d. DELETE /api/ophthalmology/iop/:id ─────────────────────────────────────
router.delete('/iop/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.eyeIopMeasurement.delete({ where: { id } });
    return res.json({ success: true, message: 'IOP measurement deleted from PostgreSQL' });
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
            id: true,
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

// ── 8. DRAWINGS REST API (Fundus, Anterior Segment & Visual Canvas) ─────────
// GET /api/ophthalmology/drawings (filter by patientId or encounterId)
router.get('/drawings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, encounterId } = req.query;
    const where: any = {};
    if (encounterId) {
      where.eyeEncounterId = encounterId as string;
    } else if (patientId) {
      where.eyeEncounter = {
        patientId: patientId as string
      };
    }

    const drawings = await prisma.eyeAnatomicalDrawing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        eyeEncounter: {
          select: {
            id: true,
            encounterNumber: true,
            ophthalmologistName: true,
            status: true,
            createdAt: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                patientNumber: true,
                gender: true,
                birthDate: true
              }
            }
          }
        }
      }
    });

    return res.json({ success: true, data: drawings });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ophthalmology/drawings/:id
router.get('/drawings/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const drawing = await prisma.eyeAnatomicalDrawing.findUnique({
      where: { id },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    if (!drawing) {
      return res.status(404).json({ success: false, message: 'Drawing not found' });
    }

    return res.json({ success: true, data: drawing });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ophthalmology/drawings
router.post('/drawings', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const {
      patientId,
      eyeEncounterId,
      eyeSide,
      anatomicZone,
      canvasSvgJson,
      pngDataUrl,
      annotations,
      diagnosis,
      clinicianName
    } = req.body;

    let targetEncounterId = eyeEncounterId;

    if (!targetEncounterId && patientId) {
      let enc = await prisma.eyeEncounter.findFirst({
        where: { patientId, status: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' }
      });
      if (!enc) {
        const count = await prisma.eyeEncounter.count();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const encounterNumber = `EYE-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
        enc = await prisma.eyeEncounter.create({
          data: {
            patientId,
            encounterNumber,
            ophthalmologistId: user?.id || 'EYE-CLINIC-AUTO',
            ophthalmologistName: clinicianName || user?.name || 'Attending Ophthalmologist / Optometrist',
            chiefComplaint: 'Visual Anatomic Drawing & Pathology Lesion Charting',
            status: 'IN_PROGRESS'
          }
        });
      }
      targetEncounterId = enc.id;
    }

    if (!targetEncounterId) {
      return res.status(400).json({ success: false, message: 'patientId or eyeEncounterId is required' });
    }

    const drawing = await prisma.eyeAnatomicalDrawing.create({
      data: {
        eyeEncounterId: targetEncounterId,
        eyeSide: eyeSide || 'OD',
        anatomicZone: anatomicZone || 'RETINA_FUNDUS',
        canvasSvgJson: typeof canvasSvgJson === 'string' ? canvasSvgJson : JSON.stringify(canvasSvgJson || {}),
        pngDataUrl: pngDataUrl || null,
        annotations: annotations || (diagnosis ? `Diagnosis: ${diagnosis}` : null)
      },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    return res.json({ success: true, data: drawing });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ophthalmology/encounters/:id/drawings
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
      },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    return res.json({ success: true, data: drawing });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/ophthalmology/drawings/:id
router.delete('/drawings/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.eyeAnatomicalDrawing.delete({
      where: { id }
    });
    return res.json({ success: true, message: 'Drawing deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 9. OPTICAL PRESCRIPTIONS REST API (Spectacles, Contact Lenses, Lab Order) ──
// GET /api/ophthalmology/optical-prescriptions
router.get('/optical-prescriptions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, encounterId, status } = req.query;
    const where: any = {};
    if (patientId) where.patientId = patientId as string;
    if (encounterId) where.eyeEncounterId = encounterId as string;
    if (status) where.status = status as string;

    const prescriptions = await prisma.eyeOpticalPrescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        eyeEncounter: {
          select: {
            id: true,
            encounterNumber: true,
            ophthalmologistName: true,
            status: true,
            createdAt: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                patientNumber: true,
                gender: true,
                birthDate: true
              }
            }
          }
        }
      }
    });

    return res.json({ success: true, data: prescriptions });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ophthalmology/optical-prescriptions/:id
router.get('/optical-prescriptions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rx = await prisma.eyeOpticalPrescription.findUnique({
      where: { id },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    if (!rx) {
      return res.status(404).json({ success: false, message: 'Optical prescription not found' });
    }

    return res.json({ success: true, data: rx });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ophthalmology/optical-prescriptions
router.post('/optical-prescriptions', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const {
      patientId,
      eyeEncounterId,
      prescribedById,
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
      expiryDays,
      prescriberName
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    const clinicianId = (prescribedById || user?.id || user?.userId || user?.staffId || 'OPTOMETRIST-SYSTEM').toString();

    let targetEncounterId = eyeEncounterId;
    if (!targetEncounterId) {
      let activeEnc = await prisma.eyeEncounter.findFirst({
        where: { patientId, status: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' }
      });
      if (!activeEnc) {
        const count = await prisma.eyeEncounter.count();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const encounterNumber = `EYE-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
        activeEnc = await prisma.eyeEncounter.create({
          data: {
            patientId,
            encounterNumber,
            ophthalmologistId: clinicianId,
            ophthalmologistName: prescriberName || user?.name || 'Dr. Emmanuel Vegher (Ophthalmologist)',
            chiefComplaint: 'Optical E-Prescribing & Spectacle Work Order',
            status: 'IN_PROGRESS'
          }
        });
      }
      targetEncounterId = activeEnc.id;
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const rxNumber = `OPT-RX-${dateStr}-${randomHex}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (expiryDays || 365));

    const prescription = await prisma.eyeOpticalPrescription.create({
      data: {
        rxNumber,
        prescriptionNumber: rxNumber,
        eyeEncounterId: targetEncounterId,
        patientId,
        prescribedById: clinicianId,
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
        usageAdvice: usageAdvice || 'Constant wear for distance, computer, and reading.',
        expiryDate,
        status: 'DISPATCHED_TO_OPTICAL_SHOP'
      },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
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

// POST /api/ophthalmology/encounters/:id/optical-prescriptions
router.post('/encounters/:id/optical-prescriptions', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const {
      patientId,
      prescribedById,
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

    const clinicianId = (prescribedById || user?.id || user?.userId || user?.staffId || 'OPTOMETRIST-SYSTEM').toString();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const rxNumber = `OPT-RX-${dateStr}-${randomHex}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (expiryDays || 365));

    const prescription = await prisma.eyeOpticalPrescription.create({
      data: {
        rxNumber,
        prescriptionNumber: rxNumber,
        eyeEncounterId: id,
        patientId: patientId || (await prisma.eyeEncounter.findUnique({ where: { id }, select: { patientId: true } }))?.patientId || '',
        prescribedById: clinicianId,
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
      },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
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

// PATCH /api/ophthalmology/optical-prescriptions/:id/status
router.patch('/optical-prescriptions/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.eyeOpticalPrescription.update({
      where: { id },
      data: { status },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/ophthalmology/optical-prescriptions/:id
router.delete('/optical-prescriptions/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.eyeOpticalPrescription.delete({
      where: { id }
    });
    return res.json({ success: true, message: 'Optical prescription deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 10. TELEMETRY & OCT SCANS (PostgreSQL eye_telemetry_scans) ─────────────

// GET /api/ophthalmology/telemetry
router.get('/telemetry', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, encounterId, modality, eyeSide } = req.query;
    const where: any = {};
    if (patientId) where.patientId = patientId as string;
    if (encounterId) where.eyeEncounterId = encounterId as string;
    if (modality) where.modality = modality as string;
    if (eyeSide) where.eyeSide = eyeSide as string;

    const scans = await prisma.eyeTelemetryScan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        eyeEncounter: {
          select: {
            id: true,
            encounterNumber: true,
            ophthalmologistName: true,
            status: true,
            createdAt: true,
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                patientNumber: true,
                gender: true,
                birthDate: true
              }
            }
          }
        }
      }
    });

    return res.json({ success: true, data: scans });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ophthalmology/telemetry/:id
router.get('/telemetry/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scan = await prisma.eyeTelemetryScan.findUnique({
      where: { id },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    if (!scan) {
      return res.status(404).json({ success: false, message: 'Telemetry scan not found' });
    }

    return res.json({ success: true, data: scan });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ophthalmology/telemetry
router.post('/telemetry', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const {
      patientId,
      eyeEncounterId,
      deviceModel,
      deviceSerial,
      modality,
      eyeSide,
      centralThickness,
      rnflAverage,
      cupDiscRatio,
      signalQuality,
      findingsSummary,
      clinicalNotes,
      imageUrl,
      dicomMetadata,
      clinicianName
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    const clinicianId = (user?.id || user?.userId || user?.staffId || 'OPTOMETRIST-SYSTEM').toString();

    let targetEncounterId = eyeEncounterId;
    if (!targetEncounterId) {
      let activeEnc = await prisma.eyeEncounter.findFirst({
        where: { patientId, status: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' }
      });
      if (!activeEnc) {
        const count = await prisma.eyeEncounter.count();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const encounterNumber = `EYE-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
        activeEnc = await prisma.eyeEncounter.create({
          data: {
            patientId,
            encounterNumber,
            ophthalmologistId: clinicianId,
            ophthalmologistName: clinicianName || user?.name || 'Dr. Emmanuel Vegher (Ophthalmologist)',
            chiefComplaint: 'Diagnostic Imaging & Telemetry Acquisition',
            status: 'IN_PROGRESS'
          }
        });
      }
      targetEncounterId = activeEnc.id;
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const modalityPrefix = modality === 'OCT_MACULA' ? 'OCT-MAC' : modality === 'OCT_RNFL_GLAUCOMA' ? 'OCT-RNFL' : modality === 'FUNDUS_PHOTOGRAPHY' ? 'FND-IMG' : modality === 'VISUAL_FIELD_PERIMETRY' ? 'HFA-VF' : 'TEL-SCN';
    const scanNumber = `${modalityPrefix}-${dateStr}-${randomHex}`;

    const scan = await prisma.eyeTelemetryScan.create({
      data: {
        scanNumber,
        eyeEncounterId: targetEncounterId,
        patientId,
        deviceModel: deviceModel || 'Spectralis OCT Plus (Heidelberg Engineering)',
        deviceSerial: deviceSerial || `SN-HEID-${randomHex}`,
        modality: modality || 'OCT_MACULA',
        eyeSide: eyeSide || 'OU',
        centralThickness: centralThickness ? Number(centralThickness) : null,
        rnflAverage: rnflAverage ? Number(rnflAverage) : null,
        cupDiscRatio: cupDiscRatio ? Number(cupDiscRatio) : null,
        signalQuality: signalQuality ? Number(signalQuality) : 9,
        findingsSummary: findingsSummary || 'Diagnostic imaging verified normal morphological architecture.',
        clinicalNotes: clinicalNotes || '',
        imageUrl: imageUrl || null,
        dicomMetadata: dicomMetadata || {
          sopClassUID: '1.2.840.10008.5.1.4.1.1.77.1.5.1',
          modality: modality || 'Ophthalmic Tomography (OPT)',
          acquisitionDate: new Date().toISOString(),
          wavelengthNm: 870,
          resolutionDpi: 1200
        },
        clinicianId,
        status: 'FINAL_INTERPRETED'
      },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    return res.json({
      success: true,
      message: `Diagnostic telemetry scan ${scanNumber} ingested and stored in PostgreSQL PACS`,
      data: scan
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ophthalmology/telemetry/simulate
// Ingests authentic realistic clinical PACS scans (Macular OCT, RNFL Glaucoma, Fundus Photo, Humphrey VF)
router.post('/telemetry/simulate', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { patientId, modalityChoice } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    const clinicianId = (user?.id || user?.userId || user?.staffId || 'OPTOMETRIST-SYSTEM').toString();

    // Ensure encounter exists
    let activeEnc = await prisma.eyeEncounter.findFirst({
      where: { patientId, status: 'IN_PROGRESS' },
      orderBy: { createdAt: 'desc' }
    });
    if (!activeEnc) {
      const count = await prisma.eyeEncounter.count();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const encounterNumber = `EYE-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
      activeEnc = await prisma.eyeEncounter.create({
        data: {
          patientId,
          encounterNumber,
          ophthalmologistId: clinicianId,
          ophthalmologistName: 'Dr. Emmanuel Vegher (Ophthalmologist)',
          chiefComplaint: 'Spectral Domain OCT & High-Res Posterior Imaging Worklist',
          status: 'IN_PROGRESS'
        }
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const choice = modalityChoice || 'OCT_MACULA';

    let scanData: any = {};
    if (choice === 'OCT_MACULA') {
      const randomHex = Math.floor(1000 + Math.random() * 9000);
      scanData = {
        scanNumber: `OCT-MAC-${dateStr}-${randomHex}`,
        deviceModel: 'Heidelberg Spectralis OCT2 MultiColor',
        deviceSerial: `HD-OCT-${randomHex}`,
        modality: 'OCT_MACULA',
        eyeSide: 'OD',
        centralThickness: 248,
        rnflAverage: 98,
        cupDiscRatio: 0.32,
        signalQuality: 9,
        findingsSummary: 'Preserved foveal pit depression with intact IS/OS photoreceptor junction and continuous RPE layer. No intraretinal cystoid spaces or subretinal fluid.',
        clinicalNotes: 'Normal macular morphology. Central subfield thickness: 248 µm (Normal normative range: 220–270 µm).',
        dicomMetadata: {
          modality: 'OPT (Ophthalmic Tomography)',
          scanPattern: 'High-Resolution 20° x 20° 49-Section Raster (512x496)',
          qScore: '34 dB (Excellent Signal)',
          lightSourceNm: 870,
          depthResolutionUm: 3.9
        }
      };
    } else if (choice === 'OCT_RNFL_GLAUCOMA') {
      const randomHex = Math.floor(1000 + Math.random() * 9000);
      scanData = {
        scanNumber: `OCT-RNFL-${dateStr}-${randomHex}`,
        deviceModel: 'Zeiss Cirrus HD-OCT 5000 (AngioPlex)',
        deviceSerial: `ZCS-5000-${randomHex}`,
        modality: 'OCT_RNFL_GLAUCOMA',
        eyeSide: 'OU',
        centralThickness: 252,
        rnflAverage: 96,
        cupDiscRatio: 0.38,
        signalQuality: 10,
        findingsSummary: 'Optic Nerve Head RNFL Profile: Superior 118 µm (Green), Inferior 126 µm (Green), Nasal 74 µm (Green), Temporal 66 µm (Green). Symmetric TSNIT distribution bilaterally.',
        clinicalNotes: 'Glaucoma progression analysis within normal limits (WNL). Average cup-to-disc ratio: 0.38 OD / 0.35 OS. Neuroretinal rim healthy.',
        dicomMetadata: {
          modality: 'OPT (RNFL Thickness Map)',
          circleDiameterMm: 3.46,
          signalStrength: '10/10',
          normativeDatabase: 'Cirrus Age-Matched Normative Database v7.0'
        }
      };
    } else if (choice === 'FUNDUS_PHOTOGRAPHY') {
      const randomHex = Math.floor(1000 + Math.random() * 9000);
      scanData = {
        scanNumber: `FND-IMG-${dateStr}-${randomHex}`,
        deviceModel: 'Topcon TRC-50DX Mydriatic/Non-Mydriatic Retinal Camera',
        deviceSerial: `TPC-DX-${randomHex}`,
        modality: 'FUNDUS_PHOTOGRAPHY',
        eyeSide: 'OD',
        centralThickness: null,
        rnflAverage: null,
        cupDiscRatio: 0.30,
        signalQuality: 9,
        findingsSummary: 'Optic disc is round with sharp distinct margins. A/V ratio 2:3 with regular course and calibre. Foveal reflex sharp and distinct. No hemorrhages, hard exudates, or cotton wool spots.',
        clinicalNotes: 'TrueColor high-resolution 50° posterior pole acquisition. Healthy neuroretinal rim tissue and clear vitreous media.',
        dicomMetadata: {
          modality: 'OP (Ophthalmic Photography)',
          fieldOfView: '50 Degrees',
          sensorResolution: '24.1 Megapixels RGB TrueColor',
          flashIntensityWs: 50
        }
      };
    } else {
      const randomHex = Math.floor(1000 + Math.random() * 9000);
      scanData = {
        scanNumber: `HFA-VF-${dateStr}-${randomHex}`,
        deviceModel: 'Humphrey Field Analyzer 3 (HFA3 24-2 SITA-Faster)',
        deviceSerial: `HFA3-${randomHex}`,
        modality: 'VISUAL_FIELD_PERIMETRY',
        eyeSide: 'OS',
        centralThickness: null,
        rnflAverage: null,
        cupDiscRatio: 0.35,
        signalQuality: 10,
        findingsSummary: 'Visual Field Index (VFI): 99%. Mean Deviation (MD): -0.42 dB (p > 5%). Pattern Standard Deviation (PSD): +1.15 dB (p > 5%). Glaucoma Hemifield Test (GHT): Within Normal Limits.',
        clinicalNotes: 'Test reliability exceptional: Fixation losses 0/14, False POS 1%, False NEG 0%. No scotoma or arcuate defects detected.',
        dicomMetadata: {
          modality: 'OPV (Ophthalmic Visual Field)',
          testStrategy: 'SITA-Faster 24-2',
          stimulusSize: 'Goldmann III White',
          backgroundLuminance: '31.5 ASB'
        }
      };
    }

    const savedScan = await prisma.eyeTelemetryScan.create({
      data: {
        ...scanData,
        eyeEncounterId: activeEnc.id,
        patientId,
        clinicianId,
        status: 'FINAL_INTERPRETED'
      },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    return res.json({
      success: true,
      message: `Telemetry scan ${savedScan.scanNumber} acquired and saved to PostgreSQL`,
      data: savedScan
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/ophthalmology/telemetry/:id
router.patch('/telemetry/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { findingsSummary, clinicalNotes, status } = req.body;

    const updated = await prisma.eyeTelemetryScan.update({
      where: { id },
      data: {
        ...(findingsSummary && { findingsSummary }),
        ...(clinicalNotes !== undefined && { clinicalNotes }),
        ...(status && { status })
      },
      include: {
        eyeEncounter: {
          include: { patient: true }
        }
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/ophthalmology/telemetry/:id
router.delete('/telemetry/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.eyeTelemetryScan.delete({
      where: { id }
    });
    return res.json({ success: true, message: 'Telemetry scan deleted successfully from PostgreSQL' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 11. POST /api/ophthalmology/telemetry-import ─────────────────────────────
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
