import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ── 1. GET /api/dental/encounters ───────────────────────────────────────────
// List dental encounters (with optional patient filter)
router.get('/encounters', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, status } = req.query as { patientId?: string; status?: string };
    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const encounters = await prisma.dentalEncounter.findMany({
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
            birthDate: true
          }
        },
        findings: true,
        perioRecords: true,
        labOrders: true,
        treatmentPlans: true
      },
      take: 50
    });

    return res.json({ success: true, data: encounters });
  } catch (err: any) {
    console.error('[Dental] List encounters error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. GET /api/dental/encounters/:id ───────────────────────────────────────
router.get('/encounters/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const encounter = await prisma.dentalEncounter.findUnique({
      where: { id },
      include: {
        patient: true,
        findings: { orderBy: { toothNumber: 'asc' } },
        perioRecords: { orderBy: { toothNumber: 'asc' } },
        labOrders: { orderBy: { createdAt: 'desc' } },
        treatmentPlans: { orderBy: { phase: 'asc' } }
      }
    });

    if (!encounter) {
      return res.status(404).json({ success: false, message: 'Dental encounter not found' });
    }

    // Query all dental invoices for this patient to check real-time payment status
    const patientInvoices = await prisma.invoice.findMany({
      where: {
        patientId: encounter.patientId,
        OR: [
          { fhirId: { startsWith: 'DENT-' } },
          { reasonText: { contains: 'Dental', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        fhirId: true,
        status: true,
        total: true,
        amountPaid: true,
        reasonText: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedFindings = (encounter.findings || []).map((f: any) => {
      // Find matching invoice by tooth number in reasonText, or fallback to latest encounter invoice if billed
      const matchingInv = patientInvoices.find(inv => {
        const text = inv.reasonText || '';
        return text.includes(`Tooth #${f.toothNumber}`) || text.includes(`Tooth ${f.toothNumber}`);
      }) || (encounter.status === 'BILLED' && patientInvoices.length > 0 ? patientInvoices[0] : null);

      let paymentStatus: 'PAID' | 'UNPAID' | 'NOT_BILLED' = 'NOT_BILLED';
      let invoiceNumber: string | null = null;
      let invoiceAmount: number = 0;
      let invoiceTotal: number = 0;

      if (matchingInv) {
        invoiceNumber = matchingInv.fhirId || matchingInv.id;
        invoiceTotal = Number(matchingInv.total || 0);
        invoiceAmount = Number(matchingInv.amountPaid || 0);
        if (matchingInv.status === 'PAID' || (invoiceTotal > 0 && invoiceAmount >= invoiceTotal)) {
          paymentStatus = 'PAID';
        } else {
          paymentStatus = 'UNPAID';
        }
      }

      return {
        ...f,
        paymentStatus,
        invoiceNumber,
        amountPaid: invoiceAmount,
        invoiceTotal
      };
    });

    return res.json({
      success: true,
      data: {
        ...encounter,
        findings: enrichedFindings,
        invoices: patientInvoices
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. POST /api/dental/encounters ──────────────────────────────────────────
// Start a new dental clinical encounter
router.post('/encounters', authMiddleware, async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { patientId, visitId, chiefComplaint, chartingType } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    const dentistName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Dr. Attending Dentist';
    const encounterNumber = `DENT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const encounter = await prisma.dentalEncounter.create({
      data: {
        encounterNumber,
        patientId,
        dentistId: user?.id || 'DENTIST-SYSTEM',
        dentistName,
        visitId: visitId || null,
        chiefComplaint: chiefComplaint || 'Routine Dental Consultation & Odontogram Exam',
        chartingType: chartingType || 'ADULT_FDI',
        status: 'IN_PROGRESS'
      },
      include: {
        patient: true
      }
    });

    return res.json({
      success: true,
      message: `Dental Encounter ${encounterNumber} initialized`,
      data: encounter
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. PUT /api/dental/encounters/:id/findings ──────────────────────────────
// Save full odontogram tooth findings array
router.put('/encounters/:id/findings', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { findings, clinicalNotes } = req.body as { findings: any[]; clinicalNotes?: string };

    if (!Array.isArray(findings)) {
      return res.status(400).json({ success: false, message: 'findings array is required' });
    }

    await prisma.$transaction(async (tx) => {
      // Clear previous findings for this encounter to re-sync full tooth chart state
      await tx.dentalToothFinding.deleteMany({
        where: { dentalEncounterId: id }
      });

      if (findings.length > 0) {
        await tx.dentalToothFinding.createMany({
          data: findings.map(f => ({
            dentalEncounterId: id,
            toothNumber: Number(f.toothNumber),
            toothSystem: f.toothSystem || 'FDI',
            surfaceMesial: f.surfaceMesial || null,
            surfaceDistal: f.surfaceDistal || null,
            surfaceOcclusal: f.surfaceOcclusal || null,
            surfaceBuccal: f.surfaceBuccal || null,
            surfaceLingual: f.surfaceLingual || null,
            wholeToothStatus: f.wholeToothStatus || null,
            diagnosis: f.diagnosis || null,
            notes: f.notes || null,
            cdtCode: f.cdtCode || null,
            cost: Number(f.cost) || 0,
            status: f.status || 'EXISTING'
          }))
        });
      }

      if (clinicalNotes !== undefined) {
        await tx.dentalEncounter.update({
          where: { id },
          data: { clinicalNotes }
        });
      }
    });

    const updated = await prisma.dentalEncounter.findUnique({
      where: { id },
      include: { findings: { orderBy: { toothNumber: 'asc' } } }
    });

    return res.json({
      success: true,
      message: 'Odontogram chart findings saved successfully',
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. PUT /api/dental/encounters/:id/perio ─────────────────────────────────
// Save periodontal probing chart records
router.put('/encounters/:id/perio', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { perioRecords, periodontalNotes } = req.body as { perioRecords: any[]; periodontalNotes?: string };

    if (!Array.isArray(perioRecords)) {
      return res.status(400).json({ success: false, message: 'perioRecords array is required' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.dentalPerioMeasurement.deleteMany({
        where: { dentalEncounterId: id }
      });

      if (perioRecords.length > 0) {
        await tx.dentalPerioMeasurement.createMany({
          data: perioRecords.map(p => {
            const pd = Number(p.probingDepthMM) || 2;
            const gm = Number(p.gingivalMarginMM) || 0;
            return {
              dentalEncounterId: id,
              toothNumber: Number(p.toothNumber),
              site: p.site || 'B',
              probingDepthMM: pd,
              gingivalMarginMM: gm,
              calMM: pd + gm, // CAL calculation
              bleedingOnProbing: Boolean(p.bleedingOnProbing),
              suppuration: Boolean(p.suppuration),
              furcationGrade: p.furcationGrade !== undefined && p.furcationGrade !== null ? Number(p.furcationGrade) : null,
              mobilityClass: p.mobilityClass !== undefined && p.mobilityClass !== null ? Number(p.mobilityClass) : null
            };
          })
        });
      }

      if (periodontalNotes !== undefined) {
        await tx.dentalEncounter.update({
          where: { id },
          data: { periodontalNotes }
        });
      }
    });

    const updated = await prisma.dentalEncounter.findUnique({
      where: { id },
      include: {
        perioRecords: { orderBy: { toothNumber: 'asc' } }
      }
    });

    return res.json({
      success: true,
      message: `Periodontal probing chart with ${perioRecords.length} teeth saved successfully in PostgreSQL`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5b. POST /api/dental/encounters/:id/perio/seed-baseline ───────────────────
// Seed or reset periodontal measurements directly in PostgreSQL
router.post('/encounters/:id/perio/seed-baseline', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mode } = req.body as { mode?: 'CLINICAL' | 'HEALTHY' };

    const ALL_32_TEETH = [
      18, 17, 16, 15, 14, 13, 12, 11,
      21, 22, 23, 24, 25, 26, 27, 28,
      48, 47, 46, 45, 44, 43, 42, 41,
      31, 32, 33, 34, 35, 36, 37, 38
    ];

    const records = ALL_32_TEETH.map(toothNumber => {
      if (mode === 'HEALTHY') {
        return {
          dentalEncounterId: id,
          toothNumber,
          site: 'Distobuccal & Midbuccal',
          probingDepthMM: 2,
          gingivalMarginMM: 0,
          calMM: 2,
          bleedingOnProbing: false,
          suppuration: false,
          furcationGrade: 0,
          mobilityClass: 0
        };
      }

      // Clinical exam mode with realistic variation
      const isMolar = [18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38].includes(toothNumber);
      const isProblematic = [16, 17, 26, 36, 46].includes(toothNumber);
      const pd = isProblematic ? 5 : isMolar ? 4 : 2;
      const gm = isProblematic ? 1 : 0;
      const bop = isProblematic || toothNumber === 31 || toothNumber === 41;
      const supp = toothNumber === 26 || toothNumber === 36;
      const mobility = toothNumber === 26 ? 2 : isProblematic ? 1 : 0;
      const furcation = isProblematic ? (toothNumber === 26 ? 2 : 1) : 0;

      return {
        dentalEncounterId: id,
        toothNumber,
        site: isMolar ? 'Distobuccal & Midbuccal' : 'Labial / Facial',
        probingDepthMM: pd,
        gingivalMarginMM: gm,
        calMM: pd + gm,
        bleedingOnProbing: bop,
        suppuration: supp,
        furcationGrade: furcation,
        mobilityClass: mobility
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.dentalPerioMeasurement.deleteMany({
        where: { dentalEncounterId: id }
      });
      await tx.dentalPerioMeasurement.createMany({
        data: records
      });
      await tx.dentalEncounter.update({
        where: { id },
        data: {
          periodontalNotes: mode === 'HEALTHY'
            ? 'Healthy gingival tissues on intact periodontium (PD: 1-2mm throughout, BOP < 10%). Routine 6-month recall.'
            : 'AAP/EFP 2017: Stage II Generalized Periodontitis with localized deep pockets (5-6mm) on molars #16, #17, #26, #36, #46 with bleeding on probing. Scaling and root planing (SRP) indicated.'
        }
      });
    });

    const updated = await prisma.dentalEncounter.findUnique({
      where: { id },
      include: {
        perioRecords: { orderBy: { toothNumber: 'asc' } }
      }
    });

    return res.json({
      success: true,
      message: `Successfully seeded ${records.length} periodontal measurements in PostgreSQL database`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper to seed realistic clinical dental lab orders in PostgreSQL if none exist
async function seedDentalLabOrdersIfEmpty() {
  try {
    const count = await prisma.dentalLabOrder.count();
    if (count > 0) return;

    let encounters = await prisma.dentalEncounter.findMany({
      include: { patient: true },
      take: 5
    });

    if (encounters.length === 0) {
      const patients = await prisma.patient.findMany({ take: 3 });
      for (const p of patients) {
        const enc = await prisma.dentalEncounter.create({
          data: {
            encounterNumber: `DENT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
            patientId: p.id,
            dentistId: 'DENTIST-SYSTEM',
            dentistName: 'Dr. Chidi Okafor (Consultant Prosthodontist)',
            chiefComplaint: 'Prosthodontic Restoration & Crown Rehabilitation',
            chartingType: 'ADULT_FDI',
            status: 'IN_PROGRESS'
          },
          include: { patient: true }
        });
        encounters.push(enc);
      }
    }

    if (encounters.length === 0) return;

    const defaultTemplates = [
      {
        labName: 'CeramMax Precision Dental Lab (Lagos)',
        restorationType: 'Monolithic Multilayer Zirconia Crown',
        toothNumbers: '16',
        shadeVita: 'A2',
        shadeStump: 'ND2',
        instructions: 'High translucency multilayer zirconia, 0.8mm occlusal reduction, high glaze finish with anatomical fissure staining.',
        turnaroundDays: 5,
        cost: 48000,
        status: 'IN_FABRICATION'
      },
      {
        labName: 'Apex Aesthetic Crown Studio (Abuja)',
        restorationType: 'IPS e.max CAD Lithium Disilicate Veneers',
        toothNumbers: '11, 21',
        shadeVita: 'BL2 (Bleach)',
        shadeStump: 'ND1',
        instructions: 'Minimal prep buccal veneers (0.5mm), characterization with natural mamelons and incisal translucency.',
        turnaroundDays: 4,
        cost: 95000,
        status: 'SHIPPED'
      },
      {
        labName: 'Metro Dental Prosthetics Lab (Enugu)',
        restorationType: 'Cobalt-Chromium Cast Partial Denture (RPD)',
        toothNumbers: '34, 35, 36, 44, 45, 46',
        shadeVita: 'A3',
        shadeStump: null,
        instructions: 'Kennedy Class I lower arch framework with Akers clasps on #34, #44 and anatomical acrylic teeth setup for try-in.',
        turnaroundDays: 7,
        cost: 72000,
        status: 'ORDERED'
      },
      {
        labName: 'CeramMax Precision Dental Lab (Lagos)',
        restorationType: 'Custom Titanium Abutment & Screw-Retained Crown',
        toothNumbers: '46',
        shadeVita: 'A3.5',
        shadeStump: 'Titanium Anodized Gold',
        instructions: 'Direct screw-retained implant crown on 4.5mm internal hex platform, 30Ncm torque spec with composite access hole plug.',
        turnaroundDays: 6,
        cost: 110000,
        status: 'DELIVERED'
      }
    ];

    for (let i = 0; i < defaultTemplates.length; i++) {
      const tmpl = defaultTemplates[i];
      const enc = encounters[i % encounters.length];
      const orderNumber = `DLAB-2026-${1001 + i}`;
      const expectedDueDate = new Date(Date.now() + tmpl.turnaroundDays * 24 * 60 * 60 * 1000);

      await prisma.dentalLabOrder.create({
        data: {
          orderNumber,
          dentalEncounterId: enc.id,
          patientId: enc.patientId,
          labName: tmpl.labName,
          restorationType: tmpl.restorationType,
          toothNumbers: tmpl.toothNumbers,
          shadeVita: tmpl.shadeVita,
          shadeStump: tmpl.shadeStump,
          instructions: tmpl.instructions,
          turnaroundDays: tmpl.turnaroundDays,
          expectedDueDate,
          cost: tmpl.cost,
          status: tmpl.status
        }
      });
    }
  } catch (err) {
    console.warn('[Dental Lab] Auto-seed error (non-fatal):', err);
  }
}

// ── 6a. GET /api/dental/lab-orders ──────────────────────────────────────────
// List all digital dental lab prescription slips from PostgreSQL database
router.get('/lab-orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    await seedDentalLabOrdersIfEmpty();

    const { patientId, dentalEncounterId, status, search } = req.query as {
      patientId?: string;
      dentalEncounterId?: string;
      status?: string;
      search?: string;
    };

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (dentalEncounterId) where.dentalEncounterId = dentalEncounterId;
    if (status && status !== 'ALL') where.status = status;

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { labName: { contains: term, mode: 'insensitive' } },
        { restorationType: { contains: term, mode: 'insensitive' } },
        { toothNumbers: { contains: term, mode: 'insensitive' } },
        { instructions: { contains: term, mode: 'insensitive' } },
      ];
    }

    const labOrders = await prisma.dentalLabOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        dentalEncounter: {
          include: {
            patient: {
              select: {
                id: true,
                patientNumber: true,
                firstName: true,
                lastName: true,
                gender: true,
                birthDate: true
              }
            }
          }
        }
      }
    });

    const enriched = labOrders.map((ord: any) => ({
      ...ord,
      patientName: ord.dentalEncounter?.patient
        ? `${ord.dentalEncounter.patient.firstName || ''} ${ord.dentalEncounter.patient.lastName || ''}`.trim()
        : 'Patient',
      patientMrn: ord.dentalEncounter?.patient?.patientNumber || '',
      encounterNumber: ord.dentalEncounter?.encounterNumber || '',
    }));

    return res.json({
      success: true,
      data: enriched,
      count: enriched.length,
      source: 'PostgreSQL Database'
    });
  } catch (err: any) {
    console.error('[Dental] Fetch lab orders error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6b. POST /api/dental/lab-orders ─────────────────────────────────────────
// Create new dental lab prescription slip directly in PostgreSQL
router.post('/lab-orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      dentalEncounterId,
      labName,
      restorationType,
      toothNumbers,
      shadeVita,
      shadeStump,
      instructions,
      turnaroundDays,
      cost
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    // Resolve or auto-create dental encounter if not provided
    let encounterId = dentalEncounterId;
    if (!encounterId) {
      let activeEnc = await prisma.dentalEncounter.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' }
      });

      if (!activeEnc) {
        const encounterNumber = `DENT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        activeEnc = await prisma.dentalEncounter.create({
          data: {
            encounterNumber,
            patientId,
            dentistId: (req as any).user?.id || 'DENTIST-SYSTEM',
            dentistName: (req as any).user ? `${(req as any).user.firstName || ''} ${(req as any).user.lastName || ''}`.trim() : 'Dr. Attending Dentist',
            chiefComplaint: 'Prosthetic Restoration & Dental Lab Work',
            chartingType: 'ADULT_FDI',
            status: 'IN_PROGRESS'
          }
        });
      }
      encounterId = activeEnc.id;
    }

    const orderNumber = `DLAB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueDays = Number(turnaroundDays) || 5;
    const expectedDueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);

    const labOrder = await prisma.dentalLabOrder.create({
      data: {
        orderNumber,
        dentalEncounterId: encounterId,
        patientId,
        labName: labName || 'Crown & Bridge Dental Lab',
        restorationType: restorationType || 'Zirconia Crown',
        toothNumbers: toothNumbers || '16',
        shadeVita: shadeVita || 'A2',
        shadeStump: shadeStump || null,
        instructions: instructions || 'High aesthetic contour, glazed finish',
        turnaroundDays: dueDays,
        expectedDueDate,
        cost: Number(cost) || 45000,
        status: 'ORDERED'
      },
      include: {
        dentalEncounter: {
          include: {
            patient: true
          }
        }
      }
    });

    const enriched = {
      ...labOrder,
      patientName: labOrder.dentalEncounter?.patient
        ? `${labOrder.dentalEncounter.patient.firstName || ''} ${labOrder.dentalEncounter.patient.lastName || ''}`.trim()
        : 'Patient',
      patientMrn: labOrder.dentalEncounter?.patient?.patientNumber || '',
      encounterNumber: labOrder.dentalEncounter?.encounterNumber || '',
    };

    return res.json({
      success: true,
      message: `Dental Lab Order ${orderNumber} dispatched and saved in PostgreSQL`,
      data: enriched
    });
  } catch (err: any) {
    console.error('[Dental] Create lab order error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6c. PUT /api/dental/lab-orders/:id/status ───────────────────────────────
// Update lab order fabrication & delivery status in PostgreSQL
router.put('/lab-orders/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, instructions } = req.body;

    const data: any = {};
    if (status) data.status = status;
    if (instructions !== undefined) data.instructions = instructions;

    const updated = await prisma.dentalLabOrder.update({
      where: { id },
      data,
      include: {
        dentalEncounter: {
          include: { patient: true }
        }
      }
    });

    return res.json({
      success: true,
      message: `Lab order status updated to ${status} in PostgreSQL`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6d. DELETE /api/dental/lab-orders/:id ────────────────────────────────────
router.delete('/lab-orders/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.dentalLabOrder.delete({ where: { id } });
    return res.json({ success: true, message: 'Dental lab order deleted from PostgreSQL' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6e. POST /api/dental/encounters/:id/lab-orders (Legacy route kept for compatibility)
router.post('/encounters/:id/lab-orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      patientId,
      labName,
      restorationType,
      toothNumbers,
      shadeVita,
      shadeStump,
      instructions,
      turnaroundDays,
      cost
    } = req.body;

    const orderNumber = `DLAB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueDays = Number(turnaroundDays) || 5;
    const expectedDueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);

    const labOrder = await prisma.dentalLabOrder.create({
      data: {
        orderNumber,
        dentalEncounterId: id,
        patientId,
        labName: labName || 'Crown & Bridge Dental Lab',
        restorationType: restorationType || 'Zirconia Crown',
        toothNumbers: toothNumbers || '14',
        shadeVita: shadeVita || 'A2',
        shadeStump: shadeStump || null,
        instructions: instructions || 'High aesthetic contour, glazed finish',
        turnaroundDays: dueDays,
        expectedDueDate,
        cost: Number(cost) || 45000,
        status: 'ORDERED'
      }
    });

    return res.json({
      success: true,
      message: `Dental Lab Order ${orderNumber} dispatched`,
      data: labOrder
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 7a. Helper: Auto-Seed Dental Treatment Plans If Empty ───────────────────
async function seedDentalTreatmentPlansIfEmpty() {
  try {
    const count = await prisma.dentalTreatmentPlanItem.count();
    if (count > 0) return;

    const encounters = await prisma.dentalEncounter.findMany({
      take: 5,
      include: { patient: true }
    });

    if (encounters.length === 0) return;

    const enc1 = encounters[0];
    const enc2 = encounters.length > 1 ? encounters[1] : enc1;

    const samplePlans = [
      // Phase 1: Urgent / Emergency Relief
      {
        dentalEncounterId: enc1.id,
        patientId: enc1.patientId,
        phase: 1,
        procedureName: 'Surgical Extraction of Impacted Wisdom Tooth',
        cdtCode: 'D7210',
        toothNumbers: '48',
        cost: 35000,
        isApprovedByPatient: true,
        isBilled: false,
        status: 'ACCEPTED'
      },
      {
        dentalEncounterId: enc2.id,
        patientId: enc2.patientId,
        phase: 1,
        procedureName: 'Palliative Emergency Treatment for Acute Dental Pain',
        cdtCode: 'D9110',
        toothNumbers: '36',
        cost: 15000,
        isApprovedByPatient: true,
        isBilled: true,
        status: 'COMPLETED'
      },
      // Phase 2: Disease Control & Periodontal Therapy
      {
        dentalEncounterId: enc1.id,
        patientId: enc1.patientId,
        phase: 2,
        procedureName: 'Periodontal Scaling & Root Planing (Upper Right Q1)',
        cdtCode: 'D4341',
        toothNumbers: '11-18',
        cost: 30000,
        isApprovedByPatient: true,
        isBilled: false,
        status: 'IN_PROGRESS'
      },
      {
        dentalEncounterId: enc2.id,
        patientId: enc2.patientId,
        phase: 2,
        procedureName: 'Molar Endodontic Therapy (Root Canal Treatment)',
        cdtCode: 'D3330',
        toothNumbers: '46',
        cost: 65000,
        isApprovedByPatient: true,
        isBilled: false,
        status: 'ACCEPTED'
      },
      // Phase 3: Restorative, Reconstructive & Prosthetic
      {
        dentalEncounterId: enc1.id,
        patientId: enc1.patientId,
        phase: 3,
        procedureName: 'Monolithic Multilayer Zirconia Crown',
        cdtCode: 'D2740',
        toothNumbers: '16',
        cost: 95000,
        isApprovedByPatient: false,
        isBilled: false,
        status: 'PROPOSED'
      },
      {
        dentalEncounterId: enc1.id,
        patientId: enc1.patientId,
        phase: 3,
        procedureName: 'Posterior 2-Surface Resin-Based Composite',
        cdtCode: 'D2392',
        toothNumbers: '26',
        cost: 28000,
        isApprovedByPatient: true,
        isBilled: false,
        status: 'ACCEPTED'
      },
      {
        dentalEncounterId: enc2.id,
        patientId: enc2.patientId,
        phase: 3,
        procedureName: 'Maxillary Cast Metal Cobalt-Chromium Partial Denture',
        cdtCode: 'D5213',
        toothNumbers: '14-17, 24-27',
        cost: 125000,
        isApprovedByPatient: false,
        isBilled: false,
        status: 'PROPOSED'
      },
      // Phase 4: Maintenance & Prevention
      {
        dentalEncounterId: enc1.id,
        patientId: enc1.patientId,
        phase: 4,
        procedureName: 'Periodontal Maintenance & Subgingival Irrigation',
        cdtCode: 'D4910',
        toothNumbers: 'All',
        cost: 20000,
        isApprovedByPatient: false,
        isBilled: false,
        status: 'PROPOSED'
      },
      {
        dentalEncounterId: enc2.id,
        patientId: enc2.patientId,
        phase: 4,
        procedureName: 'Dual-Laminate Occlusal Guard / Nightguard (Bruxism)',
        cdtCode: 'D9944',
        toothNumbers: 'Maxillary Arch',
        cost: 45000,
        isApprovedByPatient: false,
        isBilled: false,
        status: 'PROPOSED'
      }
    ];

    for (const plan of samplePlans) {
      await prisma.dentalTreatmentPlanItem.create({ data: plan });
    }
    console.log('[Dental] Auto-seeded realistic clinical dental treatment plans in PostgreSQL.');
  } catch (err: any) {
    console.warn('[Dental] Seeding dental treatment plans error:', err.message);
  }
}

// ── 7b. Helper: Compute Dynamic Dental Consumables from Procedures ───────────
function computeDentalConsumables(items: Array<{ procedureName?: string; cdtCode?: string }>) {
  const consumableMap: Record<string, { name: string; qtyNum: number; unit: string; category: string }> = {};

  const addConsumable = (name: string, qty: number, unit: string, category: string) => {
    if (!consumableMap[name]) {
      consumableMap[name] = { name, qtyNum: 0, unit, category };
    }
    consumableMap[name].qtyNum += qty;
  };

  for (const item of items) {
    const code = (item.cdtCode || '').toUpperCase();
    const name = (item.procedureName || '').toLowerCase();

    // Local Anesthesia
    if (code.startsWith('D7') || code.startsWith('D3') || code.startsWith('D2') || name.includes('extract') || name.includes('canal') || name.includes('crown') || name.includes('composite')) {
      addConsumable('Lidocaine 2% with 1:100,000 Epinephrine (1.8mL Carpule)', 2, 'Cartridges', 'Anesthetics');
      addConsumable('Sterile Dental Needle (27G Long / 30G Short)', 1, 'Unit', 'Surgical / Syringes');
    }

    // Extractions / Oral Surgery
    if (code.startsWith('D7') || name.includes('extract') || name.includes('surgical')) {
      addConsumable('Sterile Carbon Steel Surgical Blade #15', 1, 'Blade', 'Surgical');
      addConsumable('Resorbable 3-0 Vicryl Suture with Reverse Cutting Needle', 1, 'Foil Pack', 'Surgical');
      addConsumable('Non-Woven Sterile Gauze Sponges (2x2 inch)', 4, 'Sponges', 'Dressings');
    }

    // Restorations & Composites
    if (code.startsWith('D2') || name.includes('composite') || name.includes('restoration') || name.includes('filling')) {
      addConsumable('3M Filtek Z350 XT Universal Restorative Composite', 0.4, 'grams', 'Restorative');
      addConsumable('Single Bond Universal Dental Adhesive', 0.05, 'mL (1 drop)', 'Restorative');
      addConsumable('37% Phosphoric Acid Etching Gel', 0.2, 'mL', 'Restorative');
      addConsumable('Micro-applicator Tips & Mylar Matrix Strips', 2, 'Units', 'Restorative Disposables');
      addConsumable('Bausch Articulating Paper (100 micron Red/Blue)', 1, 'Strip', 'Diagnostic');
    }

    // Endodontics / Root Canal
    if (code.startsWith('D3') || name.includes('canal') || name.includes('endodontic') || name.includes('pulp')) {
      addConsumable('Sodium Hypochlorite 5.25% Endodontic Irrigant Solution', 10, 'mL', 'Endodontics');
      addConsumable('Rotary NiTi Protaper Gold Shaping & Finishing Files', 1, 'Sterile Set', 'Endodontics');
      addConsumable('Standardized ISO Gutta-Percha Cones (.04/.06 taper)', 3, 'Cones', 'Endodontics');
      addConsumable('AH-Plus Bioceramic Root Canal Sealer', 0.1, 'mL', 'Endodontics');
      addConsumable('Cavit / IRM Temporary Restorative Material', 0.5, 'grams', 'Restorative');
    }

    // Periodontal / Scaling
    if (code.startsWith('D4') || code.startsWith('D1') || name.includes('scaling') || name.includes('periodontal') || name.includes('prophylaxis')) {
      addConsumable('Chlorhexidine Gluconate 0.2% Pre-Procedural Oral Rinse', 15, 'mL', 'Preventive');
      addConsumable('Fluoridated Prophylaxis Paste (Fine/Medium Silica)', 2, 'grams', 'Preventive');
      addConsumable('Sterile Cavitron Ultrasonic Scaler Insert Tip', 1, 'Unit', 'Periodontal');
    }

    // Crowns & Prosthetics
    if (code.startsWith('D5') || code.startsWith('D6') || name.includes('crown') || name.includes('denture') || name.includes('bridge') || name.includes('veneer')) {
      addConsumable('Ultrapack Knitted Gingival Retraction Cord #00', 5, 'cm', 'Prosthetics');
      addConsumable('Aluminum Chloride 25% Hemostatic Retraction Solution', 0.5, 'mL', 'Prosthetics');
      addConsumable('3M RelyX U200 Self-Adhesive Universal Resin Cement', 0.3, 'mL', 'Prosthetics');
    }
  }

  if (Object.keys(consumableMap).length === 0) {
    addConsumable('Lidocaine 2% with 1:100,000 Epinephrine (1.8mL Carpule)', 2, 'Cartridges', 'Anesthetics');
    addConsumable('3M Filtek Z350 XT Universal Restorative Composite', 0.4, 'grams', 'Restorative');
    addConsumable('Single Bond Universal Dental Adhesive', 0.05, 'mL (1 drop)', 'Restorative');
    addConsumable('Micro-applicator Tips & Etching Gel (37% Phosphoric)', 1, 'Unit', 'Restorative');
  }

  return Object.values(consumableMap).map(c => ({
    name: c.name,
    category: c.category,
    qty: `${c.qtyNum < 1 ? c.qtyNum.toFixed(2) : c.qtyNum} ${c.unit}`
  }));
}

// ── 7c. GET /api/dental/treatment-plans ──────────────────────────────────────
// Query treatment plan items from PostgreSQL with filters (patient, phase, status, search)
router.get('/treatment-plans', authMiddleware, async (req: Request, res: Response) => {
  try {
    await seedDentalTreatmentPlansIfEmpty();

    const { patientId, dentalEncounterId, phase, status, search } = req.query as {
      patientId?: string;
      dentalEncounterId?: string;
      phase?: string;
      status?: string;
      search?: string;
    };

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (dentalEncounterId) where.dentalEncounterId = dentalEncounterId;
    if (phase && phase !== 'ALL') where.phase = Number(phase);
    if (status && status !== 'ALL') where.status = status;

    if (search) {
      const q = search.trim();
      where.OR = [
        { procedureName: { contains: q, mode: 'insensitive' } },
        { cdtCode: { contains: q, mode: 'insensitive' } },
        { toothNumbers: { contains: q, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.dentalTreatmentPlanItem.findMany({
      where,
      orderBy: [{ phase: 'asc' }, { createdAt: 'desc' }],
      include: {
        dentalEncounter: {
          select: {
            id: true,
            encounterNumber: true,
            status: true,
            patient: {
              select: {
                id: true,
                patientNumber: true,
                firstName: true,
                lastName: true,
                gender: true,
                birthDate: true
              }
            }
          }
        }
      }
    });

    const enriched = items.map(item => ({
      ...item,
      patient: item.dentalEncounter?.patient || null,
      patientName: item.dentalEncounter?.patient ? `${item.dentalEncounter.patient.firstName} ${item.dentalEncounter.patient.lastName}` : null,
      patientMrn: item.dentalEncounter?.patient?.patientNumber || null,
      encounterNumber: item.dentalEncounter?.encounterNumber || null,
      phaseLabel: item.phase === 1 ? 'Phase 1: Urgent (Emergency)' : item.phase === 2 ? 'Phase 2: Disease Control' : item.phase === 3 ? 'Phase 3: Restorative & Prosthetic' : 'Phase 4: Maintenance & Recall'
    }));

    return res.json({
      success: true,
      count: enriched.length,
      data: enriched,
      source: 'PostgreSQL Database'
    });
  } catch (err: any) {
    console.error('[Dental] GET treatment-plans error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch dental treatment plans' });
  }
});

// ── 7d. GET /api/dental/treatment-plans/consumables ─────────────────────────
// Dynamically compute dental consumables / dispensary deductions from planned procedures
router.get('/treatment-plans/consumables', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.query as { patientId?: string };
    const where: any = {};
    if (patientId) where.patientId = patientId;

    const items = await prisma.dentalTreatmentPlanItem.findMany({
      where,
      select: { procedureName: true, cdtCode: true }
    });

    const consumables = computeDentalConsumables(items.map(it => ({ procedureName: it.procedureName, cdtCode: it.cdtCode || undefined })));
    return res.json({ success: true, data: consumables, count: consumables.length, source: 'Calculated from Active Treatment Plans' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 7e. POST /api/dental/treatment-plans ────────────────────────────────────
// Save a newly proposed dental treatment plan item directly into PostgreSQL
router.post('/treatment-plans', authMiddleware, async (req: Request, res: Response) => {
  try {
    let {
      patientId,
      dentalEncounterId,
      phase,
      procedureName,
      cdtCode,
      toothNumbers,
      cost,
      status,
      isApprovedByPatient
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    // Ensure encounter exists
    if (!dentalEncounterId) {
      let encounter = await prisma.dentalEncounter.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' }
      });

      if (!encounter) {
        const dentist = await prisma.staff.findFirst();
        const dentistId = dentist ? dentist.id : ((req as any).user?.id || patientId);
        const encounterNumber = `DENT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        encounter = await prisma.dentalEncounter.create({
          data: {
            encounterNumber,
            patientId,
            dentistId,
            chiefComplaint: 'Comprehensive Dental Treatment Plan Formulation',
            status: 'IN_PROGRESS'
          }
        });
      }
      dentalEncounterId = encounter.id;
    }

    const created = await prisma.dentalTreatmentPlanItem.create({
      data: {
        dentalEncounterId,
        patientId,
        phase: Number(phase) || 1,
        procedureName: procedureName || 'Dental Procedure',
        cdtCode: cdtCode || null,
        toothNumbers: toothNumbers || null,
        cost: Number(cost) || 0,
        status: status || 'PROPOSED',
        isApprovedByPatient: Boolean(isApprovedByPatient),
        isBilled: false
      },
      include: {
        dentalEncounter: {
          select: {
            id: true,
            encounterNumber: true,
            patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Treatment plan procedure saved to PostgreSQL.',
      data: {
        ...created,
        patient: created.dentalEncounter?.patient || null,
        patientName: created.dentalEncounter?.patient ? `${created.dentalEncounter.patient.firstName} ${created.dentalEncounter.patient.lastName}` : null,
        patientMrn: created.dentalEncounter?.patient?.patientNumber || null
      }
    });
  } catch (err: any) {
    console.error('[Dental] POST treatment plan item error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save treatment plan procedure' });
  }
});

// ── 7f. PUT /api/dental/treatment-plans/:id ──────────────────────────────────
// Update treatment plan item (approval, status, phase, cost) in PostgreSQL
router.put('/treatment-plans/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      phase,
      procedureName,
      cdtCode,
      toothNumbers,
      cost,
      status,
      isApprovedByPatient,
      isBilled
    } = req.body;

    const data: any = {};
    if (phase !== undefined) data.phase = Number(phase);
    if (procedureName !== undefined) data.procedureName = procedureName;
    if (cdtCode !== undefined) data.cdtCode = cdtCode;
    if (toothNumbers !== undefined) data.toothNumbers = toothNumbers;
    if (cost !== undefined) data.cost = Number(cost);
    if (status !== undefined) data.status = status;
    if (isApprovedByPatient !== undefined) data.isApprovedByPatient = Boolean(isApprovedByPatient);
    if (isBilled !== undefined) data.isBilled = Boolean(isBilled);

    const updated = await prisma.dentalTreatmentPlanItem.update({
      where: { id },
      data,
      include: {
        dentalEncounter: {
          select: {
            id: true,
            encounterNumber: true,
            patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    return res.json({
      success: true,
      message: 'Treatment plan updated in PostgreSQL.',
      data: {
        ...updated,
        patient: updated.dentalEncounter?.patient || null,
        patientName: updated.dentalEncounter?.patient ? `${updated.dentalEncounter.patient.firstName} ${updated.dentalEncounter.patient.lastName}` : null,
        patientMrn: updated.dentalEncounter?.patient?.patientNumber || null
      }
    });
  } catch (err: any) {
    console.error('[Dental] PUT treatment plan item error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update treatment plan item' });
  }
});

// ── 7g. DELETE /api/dental/treatment-plans/:id ──────────────────────────────
// Delete treatment plan item from PostgreSQL
router.delete('/treatment-plans/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.dentalTreatmentPlanItem.delete({ where: { id } });
    return res.json({ success: true, message: 'Treatment plan procedure removed from PostgreSQL.' });
  } catch (err: any) {
    console.error('[Dental] DELETE treatment plan item error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete treatment plan item' });
  }
});

// ── 7h. POST /api/dental/treatment-plans/post-to-billing ────────────────────
// Post treatment plan items to billing with real invoice generation in PostgreSQL
router.post('/treatment-plans/post-to-billing', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, itemIds } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    const where: any = { patientId };
    if (Array.isArray(itemIds) && itemIds.length > 0) {
      where.id = { in: itemIds };
    } else {
      where.isBilled = false;
    }

    const itemsToBill = await prisma.dentalTreatmentPlanItem.findMany({
      where,
      include: { dentalEncounter: true }
    });

    if (itemsToBill.length === 0) {
      return res.status(400).json({ success: false, message: 'No unbilled treatment plan procedures found to bill.' });
    }

    const totalCost = itemsToBill.reduce((sum, item) => sum + Number(item.cost || 0), 0);
    const invoiceNo = `DENT-INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const summaryText = itemsToBill.map(i => `${i.procedureName}${i.toothNumbers ? ` (#${i.toothNumbers})` : ''}`).join('; ');

    const invoice = await prisma.invoice.create({
      data: {
        fhirId: invoiceNo,
        patientId,
        status: 'UNPAID',
        total: totalCost,
        amountPaid: 0,
        reasonText: `Dental Treatment Plan (${summaryText})`
      }
    });

    // Mark items as billed and accepted
    await prisma.dentalTreatmentPlanItem.updateMany({
      where: { id: { in: itemsToBill.map(i => i.id) } },
      data: { isBilled: true, status: 'ACCEPTED' }
    });

    // Update encounters to BILLED
    const encounterIds = Array.from(new Set(itemsToBill.map(i => i.dentalEncounterId).filter(Boolean)));
    for (const eid of encounterIds) {
      await prisma.dentalEncounter.update({
        where: { id: eid },
        data: { status: 'BILLED' }
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `🎉 Generated Dental Invoice #${invoiceNo} for ₦${totalCost.toLocaleString()} (${itemsToBill.length} procedures billed to Central Cashier).`,
      totalBilled: totalCost,
      invoiceNumber: invoiceNo,
      invoiceId: invoice.id,
      itemCount: itemsToBill.length
    });
  } catch (err: any) {
    console.error('[Dental] POST treatment-plans post-to-billing error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to post treatment plan to billing' });
  }
});

// ── 7i. POST /api/dental/encounters/:id/treatment-plans (Legacy encounter-scoped route) ──
router.post('/encounters/:id/treatment-plans', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      patientId,
      phase,
      procedureName,
      cdtCode,
      toothNumbers,
      cost
    } = req.body;

    const planItem = await prisma.dentalTreatmentPlanItem.create({
      data: {
        dentalEncounterId: id,
        patientId,
        phase: Number(phase) || 1,
        procedureName: procedureName || 'Dental Composite Restoration',
        cdtCode: cdtCode || 'D2391',
        toothNumbers: toothNumbers || '',
        cost: Number(cost) || 15000,
        status: 'PROPOSED',
        isApprovedByPatient: false
      }
    });

    return res.json({
      success: true,
      message: 'Treatment plan item added',
      data: planItem
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 8. POST /api/dental/encounters/:id/post-to-billing & /sync-billing ───────
// Generates invoice / billing line items for charted tooth findings and treatment plan procedures
router.post(['/encounters/:id/post-to-billing', '/encounters/:id/sync-billing'], authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bodyFindings = Array.isArray(req.body?.findings) ? req.body.findings : [];

    // If request contains fresh findings from odontogram, save them into database first
    if (bodyFindings.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.dentalToothFinding.deleteMany({
          where: { dentalEncounterId: id }
        });
        await tx.dentalToothFinding.createMany({
          data: bodyFindings.map((f: any) => ({
            dentalEncounterId: id,
            toothNumber: Number(f.toothNumber),
            toothSystem: f.toothSystem || 'FDI',
            surfaceMesial: f.surfaceMesial || null,
            surfaceDistal: f.surfaceDistal || null,
            surfaceOcclusal: f.surfaceOcclusal || null,
            surfaceBuccal: f.surfaceBuccal || null,
            surfaceLingual: f.surfaceLingual || null,
            wholeToothStatus: f.wholeToothStatus || null,
            diagnosis: f.diagnosis || null,
            notes: f.notes || null,
            cdtCode: f.cdtCode || null,
            cost: Number(f.cost) || 0,
            status: f.status || 'PLANNED'
          }))
        });
      }).catch((e) => console.warn('[Dental] Failed saving findings before billing:', e.message));
    }

    const encounter = await prisma.dentalEncounter.findUnique({
      where: { id },
      include: {
        treatmentPlans: true,
        findings: true,
        patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } }
      }
    });

    if (!encounter) {
      return res.status(404).json({ success: false, message: 'Dental encounter not found in PostgreSQL' });
    }

    // 1. Collect charted tooth findings
    const billedLineItems: Array<{ description: string; cost: number; code: string; toothNumber?: number }> = [];

    const billableFindings = (encounter.findings || []).filter((f: any) => {
      const c = Number(f.cost || 0);
      return c > 0 || (f.wholeToothStatus && f.wholeToothStatus !== 'SOUND');
    });

    for (const f of billableFindings) {
      let cost = Number(f.cost || 0);
      if (cost <= 0) {
        if (f.wholeToothStatus === 'ROOT_CANAL') cost = 45000;
        else if (f.wholeToothStatus === 'PORCELAIN_CROWN') cost = 65000;
        else if (f.wholeToothStatus === 'IMPLANT') cost = 150000;
        else if (f.wholeToothStatus === 'COMPOSITE') cost = 20000;
        else cost = 18000;
      }
      const desc = f.diagnosis || `Tooth #${f.toothNumber} ${f.wholeToothStatus ? f.wholeToothStatus.replace('_', ' ') : 'Restoration'} (${f.cdtCode || 'CDT-D2140'})`;
      billedLineItems.push({
        description: desc,
        cost,
        code: f.cdtCode || `DENT-T${f.toothNumber}`,
        toothNumber: f.toothNumber
      });
    }

    // 2. Collect treatment plan items
    const unbilledPlans = (encounter.treatmentPlans || []).filter((p: any) => !p.isBilled && p.status !== 'DECLINED');
    for (const p of unbilledPlans) {
      billedLineItems.push({
        description: `${p.procedureName}${p.toothNumbers ? ` [Tooth ${p.toothNumbers}]` : ''}`,
        cost: Number(p.cost || 15000),
        code: p.cdtCode || 'CDT-PROC'
      });
    }

    // 3. Fallback to bodyFindings if database query had no non-sound findings yet
    if (billedLineItems.length === 0 && bodyFindings.length > 0) {
      for (const f of bodyFindings) {
        const cost = Number(f.cost) || 18000;
        billedLineItems.push({
          description: f.diagnosis || `Tooth #${f.toothNumber} Restoration (${f.cdtCode || 'CDT-D2140'})`,
          cost,
          code: f.cdtCode || `DENT-T${f.toothNumber}`,
          toothNumber: Number(f.toothNumber)
        });
      }
    }

    if (billedLineItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No charted tooth procedures or treatment plan items to bill. Please chart at least one tooth procedure.'
      });
    }

    const totalCost = billedLineItems.reduce((acc, item) => acc + item.cost, 0);
    const invoiceNo = `DENT-INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const summaryText = billedLineItems.map(i => i.description).join('; ');

    const invoice = await prisma.invoice.create({
      data: {
        fhirId: invoiceNo,
        patientId: encounter.patientId,
        status: 'UNPAID',
        total: totalCost,
        amountPaid: 0,
        reasonText: `Dental Procedures (${summaryText})`
      }
    });

    // Mark treatment plans as billed
    if (unbilledPlans.length > 0) {
      await prisma.dentalTreatmentPlanItem.updateMany({
        where: { id: { in: unbilledPlans.map(u => u.id) } },
        data: { isBilled: true, status: 'ACCEPTED' }
      });
    }

    // Also update encounter status
    await prisma.dentalEncounter.update({
      where: { id },
      data: { status: 'BILLED' }
    }).catch(() => {});

    return res.json({
      success: true,
      message: `🎉 Generated Dental Invoice #${invoiceNo} for ₦${totalCost.toLocaleString()} (${billedLineItems.length} dental procedure${billedLineItems.length > 1 ? 's' : ''})!`,
      totalBilled: totalCost,
      invoiceNumber: invoiceNo,
      data: {
        invoice: {
          ...invoice,
          invoiceNumber: invoiceNo,
          patientName: encounter.patient ? `${encounter.patient.firstName} ${encounter.patient.lastName}` : 'Dental Patient',
          patientNumber: encounter.patient?.patientNumber
        },
        billedItemsCount: billedLineItems.length
      }
    });
  } catch (err: any) {
    console.error('[Dental] sync-billing error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Dental billing sync failed' });
  }
});

// ── 9. GET /api/dental/radiology ─────────────────────────────────────────────
// Fetch live radiology scans for a dental patient/encounter from PostgreSQL
router.get('/radiology', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, encounterId } = req.query as { patientId?: string; encounterId?: string };
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    let scans: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "dental_radiology_scans" WHERE "patientId" = $1 ORDER BY "createdAt" DESC`,
      patientId
    );

    // If no scans exist for this patient in PostgreSQL yet, initialize standard clinical dental scans
    if (!scans || scans.length === 0) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { patientNumber: true, firstName: true, lastName: true }
      });
      const pNum = patient?.patientNumber || 'PAT-DENT';

      const initialScans = [
        {
          id: `rad-opg-${Date.now()}-1`,
          scanNumber: `RAD-OPG-${Date.now().toString().slice(-5)}`,
          dentalEncounterId: encounterId || null,
          patientId,
          scanType: 'PANORAMIC_OPG',
          modality: 'PX',
          title: 'Panoramic OPG Radiograph — Full Dental Arch',
          seriesDescription: 'Orthopantomogram (OPG) bilateral condylar, mandibular & maxillary overview',
          imageUrl: '/api/dental/radiology/assets/opg-full.webp',
          dicomUid: `1.2.840.10008.5.1.4.1.1.1.${Date.now()}.1`,
          exposureDetails: '70kV / 12mA • 14.2s exposure • Focal trough aligned',
          status: 'ACQUIRED',
          reportText: 'Both condylar heads well-formed in glenoid fossae. Alveolar bone crest levels within normal physiological limits. No impacted supernumerary teeth identified.',
          findingsNotes: 'Generalized mild horizontal bone loss (Grade 1) in posterior quadrants. Sound trabecular bone pattern throughout mandible.',
          radiationDoseDAP: '128 mGy·cm²',
          teethIndicated: 'All 32 Teeth (Maxillary & Mandibular Arches)',
          radiographer: 'Chidiebere Nwosu (Senior Radiographer)',
        },
        {
          id: `rad-bw-${Date.now()}-2`,
          scanNumber: `RAD-BW-${Date.now().toString().slice(-5)}`,
          dentalEncounterId: encounterId || null,
          patientId,
          scanType: 'BITEWING_IO',
          modality: 'IO',
          title: 'Right Posterior Intraoral Bitewings (R-BW)',
          seriesDescription: 'High-resolution digital phosphor sensor interproximal caries evaluation',
          imageUrl: '/api/dental/radiology/assets/bitewing-r.webp',
          dicomUid: `1.2.840.10008.5.1.4.1.1.1.${Date.now()}.2`,
          exposureDetails: '65kV / 7mA • 0.22s • Rinn sensor holder with rectangular collimation',
          status: 'ACQUIRED',
          reportText: 'Interproximal contacts between #16-#15 and #46-#45 clear. Enamel radiopacity intact with no recurrent decay under existing restorations.',
          findingsNotes: 'Incipient enamel demineralization on distal surface of #15, confined to outer third of enamel. Calculus spur visible mesial #46.',
          radiationDoseDAP: '26 mGy·cm²',
          teethIndicated: '14, 15, 16, 17, 44, 45, 46, 47',
          radiographer: 'Chidiebere Nwosu (Senior Radiographer)',
        },
        {
          id: `rad-cbct-${Date.now()}-3`,
          scanNumber: `RAD-CBCT-${Date.now().toString().slice(-5)}`,
          dentalEncounterId: encounterId || null,
          patientId,
          scanType: 'CBCT_3D',
          modality: 'CT',
          title: 'CBCT 3D Volumetric Maxillofacial Scan (Axial/Coronal)',
          seriesDescription: 'Cone Beam Computed Tomography 8x8 cm FOV, 150μm voxel resolution',
          imageUrl: '/api/dental/radiology/assets/cbct-slice.webp',
          dicomUid: `1.2.840.10008.5.1.4.1.1.1.${Date.now()}.3`,
          exposureDetails: '90kV / 10mA • 8.9s pulsed • 8x8cm FOV High Resolution',
          status: 'ACQUIRED',
          reportText: 'Adequate alveolar ridge width (6.8mm) and vertical height (12.4mm) superior to the inferior alveolar nerve canal at site #46.',
          findingsNotes: 'No periapical radiolucencies. Maxillary sinus floor pneumatization bilaterally within acceptable implant placement parameters.',
          radiationDoseDAP: '342 mGy·cm²',
          teethIndicated: 'Quadrant 4 Posterior / Site #46 Implant Bed',
          radiographer: 'Dr. Amina Bello (Oral & Maxillofacial Radiologist)',
        }
      ];

      for (const s of initialScans) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "dental_radiology_scans" (
            "id", "scanNumber", "dentalEncounterId", "patientId", "scanType", "modality",
            "title", "seriesDescription", "imageUrl", "dicomUid", "exposureDetails",
            "status", "reportText", "findingsNotes", "radiationDoseDAP", "teethIndicated", "radiographer"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT ("id") DO NOTHING`,
          s.id, s.scanNumber, s.dentalEncounterId, s.patientId, s.scanType, s.modality,
          s.title, s.seriesDescription, s.imageUrl, s.dicomUid, s.exposureDetails,
          s.status, s.reportText, s.findingsNotes, s.radiationDoseDAP, s.teethIndicated, s.radiographer
        );
      }

      scans = await prisma.$queryRawUnsafe(
        `SELECT * FROM "dental_radiology_scans" WHERE "patientId" = $1 ORDER BY "createdAt" DESC`,
        patientId
      );
    }

    return res.json({ success: true, data: scans, count: scans.length });
  } catch (err: any) {
    console.error('[Dental] GET radiology scans error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch dental radiology scans' });
  }
});

// ── 10. POST /api/dental/radiology ───────────────────────────────────────────
// Record a newly acquired dental radiograph / scan in PostgreSQL
router.post('/radiology', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      dentalEncounterId,
      scanType,
      modality,
      title,
      seriesDescription,
      imageUrl,
      exposureDetails,
      radiationDoseDAP,
      teethIndicated,
      findingsNotes,
      radiographer
    } = req.body;

    if (!patientId || !title || !scanType) {
      return res.status(400).json({ success: false, message: 'patientId, title, and scanType are required' });
    }

    const id = `rad-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const scanNumber = `RAD-DENT-${Date.now().toString().slice(-6)}`;
    const dicomUid = `1.2.840.10008.5.1.4.1.1.1.${Date.now()}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "dental_radiology_scans" (
        "id", "scanNumber", "dentalEncounterId", "patientId", "scanType", "modality",
        "title", "seriesDescription", "imageUrl", "dicomUid", "exposureDetails",
        "status", "reportText", "findingsNotes", "radiationDoseDAP", "teethIndicated", "radiographer"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      id, scanNumber, dentalEncounterId || null, patientId, scanType, modality || 'PX',
      title, seriesDescription || '', imageUrl || '', dicomUid, exposureDetails || '70kV / 10mA • Standard Exposure',
      'ACQUIRED', '', findingsNotes || '', radiationDoseDAP || '100 mGy·cm²', teethIndicated || 'Teeth Indicated',
      radiographer || (req as any).user?.username || 'Dental Radiographer'
    );

    const created = await prisma.$queryRawUnsafe(
      `SELECT * FROM "dental_radiology_scans" WHERE "id" = $1`,
      id
    );

    return res.status(201).json({
      success: true,
      message: `Dental radiograph ${scanNumber} recorded in PostgreSQL.`,
      data: Array.isArray(created) ? created[0] : created
    });
  } catch (err: any) {
    console.error('[Dental] POST radiology error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to record dental radiograph' });
  }
});

// ── 11. PUT /api/dental/radiology/:id ────────────────────────────────────────
// Save radiological findings, diagnostic report, or update status in PostgreSQL
router.put('/radiology/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reportText, findingsNotes, status } = req.body;

    await prisma.$executeRawUnsafe(
      `UPDATE "dental_radiology_scans"
       SET "reportText" = COALESCE($1, "reportText"),
           "findingsNotes" = COALESCE($2, "findingsNotes"),
           "status" = COALESCE($3, "status"),
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $4`,
      reportText !== undefined ? reportText : null,
      findingsNotes !== undefined ? findingsNotes : null,
      status || (reportText ? 'REPORTED' : 'ACQUIRED'),
      id
    );

    const updated = await prisma.$queryRawUnsafe(
      `SELECT * FROM "dental_radiology_scans" WHERE "id" = $1`,
      id
    );

    return res.json({
      success: true,
      message: 'Radiology report and diagnostic findings saved to PostgreSQL.',
      data: Array.isArray(updated) ? updated[0] : updated
    });
  } catch (err: any) {
    console.error('[Dental] PUT radiology error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to update radiology scan' });
  }
});

// ── 12. GET /api/dental/consents ─────────────────────────────────────────────
// List signed dental consent forms with patient & encounter info
router.get('/consents', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { patientId, dentalEncounterId, status, consentType } = req.query as {
      patientId?: string;
      dentalEncounterId?: string;
      status?: string;
      consentType?: string;
    };

    const where: any = {};
    if (patientId) where.patientId = patientId;
    if (dentalEncounterId) where.dentalEncounterId = dentalEncounterId;
    if (status) where.status = status;
    if (consentType) where.consentType = consentType;

    const consents = await prisma.dentalConsent.findMany({
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
            emergencyPhone: true,
          }
        },
        dentalEncounter: {
          select: {
            id: true,
            encounterNumber: true,
            dentistName: true,
            chiefComplaint: true,
            createdAt: true
          }
        }
      },
      take: 100
    });

    return res.json({ success: true, data: consents });
  } catch (err: any) {
    console.error('[Dental] List consents error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to list dental consents' });
  }
});

// ── 13. GET /api/dental/consents/:id ─────────────────────────────────────────
// Retrieve a single signed consent form by ID
router.get('/consents/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const consent = await prisma.dentalConsent.findUnique({
      where: { id },
      include: {
        patient: true,
        dentalEncounter: true
      }
    });

    if (!consent) {
      return res.status(404).json({ success: false, message: 'Dental consent record not found' });
    }

    return res.json({ success: true, data: consent });
  } catch (err: any) {
    console.error('[Dental] GET consent error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to get dental consent' });
  }
});

// ── 14. POST /api/dental/consents ────────────────────────────────────────────
// Create and archive a chairside digital informed consent in PostgreSQL
router.post('/consents', authMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      dentalEncounterId,
      consentType = 'GENERAL_TREATMENT',
      title = 'Chairside Digital Informed Consent & Treatment Agreement',
      procedureNames,
      toothNumbers,
      treatmentDescription,
      risksDisclosed,
      alternativesDiscussed,
      estimatedCost = 0,
      signerName,
      signerRelationship = 'PATIENT',
      signerPhone,
      signatureData,
      witnessName,
      clinicianId,
      clinicianName,
      termsAgreed = true,
      anesthesiaConsent = true,
      radiographConsent = true,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient ID is required to save digital consent' });
    }
    if (!signatureData) {
      return res.status(400).json({ success: false, message: 'A valid patient or guardian signature is required' });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, firstName: true, lastName: true, patientNumber: true, emergencyPhone: true }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const effectiveSignerName = signerName?.trim() || `${patient.firstName} ${patient.lastName}`;
    const effectiveSignerPhone = signerPhone || patient.emergencyPhone || '';

    // Generate readable, unique consent numbering
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const consentNumber = `DNT-CNS-${dateStr}-${randomSuffix}`;

    const user = (req as any).user;
    const effectiveClinicianId = clinicianId || user?.id || null;
    const effectiveClinicianName = clinicianName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Attending Dental Surgeon');

    const newConsent = await prisma.dentalConsent.create({
      data: {
        consentNumber,
        dentalEncounterId: dentalEncounterId || null,
        patientId,
        consentType,
        title,
        procedureNames: Array.isArray(procedureNames) ? procedureNames.join(', ') : procedureNames || null,
        toothNumbers: Array.isArray(toothNumbers) ? toothNumbers.join(', ') : toothNumbers || null,
        treatmentDescription: treatmentDescription || null,
        risksDisclosed: risksDisclosed || 'Bleeding, postoperative discomfort, infection, temporary or permanent nerve numbness, and need for secondary intervention.',
        alternativesDiscussed: alternativesDiscussed || 'Non-intervention, conservative monitoring, alternate restoration options, or specialist referral.',
        estimatedCost: Number(estimatedCost) || 0,
        signerName: effectiveSignerName,
        signerRelationship,
        signerPhone: effectiveSignerPhone,
        signatureData,
        witnessName: witnessName || null,
        clinicianId: effectiveClinicianId,
        clinicianName: effectiveClinicianName,
        termsAgreed: Boolean(termsAgreed),
        anesthesiaConsent: Boolean(anesthesiaConsent),
        radiographConsent: Boolean(radiographConsent),
        status: 'SIGNED',
        signedAt: new Date(),
      },
      include: {
        patient: {
          select: {
            id: true,
            patientNumber: true,
            firstName: true,
            lastName: true,
            gender: true,
            birthDate: true
          }
        },
        dentalEncounter: true
      }
    });

    return res.status(201).json({
      success: true,
      message: `Digital consent ${consentNumber} signed and archived into Patient EHR file.`,
      data: newConsent
    });
  } catch (err: any) {
    console.error('[Dental] POST consent error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to archive digital consent' });
  }
});

// ── 15. DELETE /api/dental/consents/:id ──────────────────────────────────────
router.delete('/consents/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.dentalConsent.delete({ where: { id } });
    return res.json({ success: true, message: 'Dental consent record deleted' });
  } catch (err: any) {
    console.error('[Dental] DELETE consent error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete dental consent' });
  }
});

export default router;
