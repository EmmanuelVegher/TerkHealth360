import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';

const router = Router();

// ── GET /api/facilities/states ───────────────────────────────────────────────
// Returns all unique Nigerian states with their facility counts
router.get('/states', async (_req: Request, res: Response) => {
  try {
    const states = await prisma.federalHealthFacility.groupBy({
      by: ['stateName'],
      _count: { id: true },
      orderBy: { stateName: 'asc' },
    });

    const data = states
      .filter((s) => s.stateName && s.stateName.trim() !== '' && s.stateName !== 'Unknown State')
      .map((s) => ({
        stateName: s.stateName,
        facilityCount: s._count.id,
      }));

    res.json({ success: true, count: data.length, data });
  } catch (error: any) {
    console.error('Error fetching states:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/facilities/lgas ─────────────────────────────────────────────────
// Returns all unique LGAs for a given state
router.get('/lgas', async (req: Request, res: Response) => {
  try {
    const state = (req.query.state as string)?.trim();
    if (!state) {
      return res.status(400).json({ success: false, error: 'State parameter is required' });
    }

    const lgas = await prisma.federalHealthFacility.groupBy({
      by: ['lgaName'],
      where: {
        stateName: { equals: state, mode: 'insensitive' },
      },
      _count: { id: true },
      orderBy: { lgaName: 'asc' },
    });

    const data = lgas
      .filter((l) => l.lgaName && l.lgaName.trim() !== '' && l.lgaName !== 'Unknown LGA')
      .map((l) => ({
        lgaName: l.lgaName,
        facilityCount: l._count.id,
      }));

    res.json({ success: true, state, count: data.length, data });
  } catch (error: any) {
    console.error('Error fetching LGAs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/facilities/wards ────────────────────────────────────────────────
// Returns all unique wards for a given state and LGA
router.get('/wards', async (req: Request, res: Response) => {
  try {
    const state = (req.query.state as string)?.trim();
    const lga = (req.query.lga as string)?.trim();

    if (!state || !lga) {
      return res.status(400).json({ success: false, error: 'Both state and lga parameters are required' });
    }

    const wards = await prisma.federalHealthFacility.groupBy({
      by: ['wardName'],
      where: {
        stateName: { equals: state, mode: 'insensitive' },
        lgaName: { equals: lga, mode: 'insensitive' },
      },
      _count: { id: true },
      orderBy: { wardName: 'asc' },
    });

    const data = wards
      .filter((w) => w.wardName && w.wardName.trim() !== '' && w.wardName !== 'Unknown Ward')
      .map((w) => ({
        wardName: w.wardName,
        facilityCount: w._count.id,
      }));

    res.json({ success: true, state, lga, count: data.length, data });
  } catch (error: any) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/facilities/hospitals ────────────────────────────────────────────
// Returns hospitals matching state, LGA, and ward, with optional search query
router.get('/hospitals', async (req: Request, res: Response) => {
  try {
    const state = (req.query.state as string)?.trim();
    const lga = (req.query.lga as string)?.trim();
    const ward = (req.query.ward as string)?.trim();
    const search = (req.query.search as string)?.trim();
    const limit = parseInt((req.query.limit as string) || '100', 10);

    const where: any = {};
    if (state) where.stateName = { equals: state, mode: 'insensitive' };
    if (lga) where.lgaName = { equals: lga, mode: 'insensitive' };
    if (ward) where.wardName = { equals: ward, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { facilityName: { contains: search, mode: 'insensitive' } },
        { uniqueId: { contains: search, mode: 'insensitive' } },
        { stateUniqueId: { contains: search, mode: 'insensitive' } },
        { physicalLocation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const hospitals = await prisma.federalHealthFacility.findMany({
      where,
      orderBy: { facilityName: 'asc' },
      take: Math.min(limit, 500),
    });

    res.json({
      success: true,
      count: hospitals.length,
      data: hospitals,
    });
  } catch (error: any) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/facilities/selected ─────────────────────────────────────────────
// Returns the currently selected/active hospital configuration from the Federal Registry
router.get('/selected', async (_req: Request, res: Response) => {
  try {
    // 1. Check if there is an explicitly marked facility in the federal table
    let facility = await prisma.federalHealthFacility.findFirst({
      where: { isSelectedHospital: true },
    });

    // 2. If none explicitly marked, check if HOSPITAL_UNIQUE_ID is saved in HospitalConfig
    if (!facility) {
      const savedUid = await prisma.hospitalConfig.findUnique({
        where: { moduleKey: 'HOSPITAL_UNIQUE_ID' },
      });
      if (savedUid?.description) {
        facility = await prisma.federalHealthFacility.findUnique({
          where: { uniqueId: savedUid.description },
        });
      }
    }

    // 3. If still none, check by HOSPITAL_NAME
    if (!facility) {
      const savedName = await prisma.hospitalConfig.findUnique({
        where: { moduleKey: 'HOSPITAL_NAME' },
      });
      if (savedName?.description) {
        facility = await prisma.federalHealthFacility.findFirst({
          where: { facilityName: { equals: savedName.description, mode: 'insensitive' } },
        });
      }
    }

    // Load all current hospital config key-values
    const allConfigs = await prisma.hospitalConfig.findMany();
    const configMap: Record<string, string> = {};
    for (const c of allConfigs) {
      if (c.description) configMap[c.moduleKey] = c.description;
    }

    res.json({
      success: true,
      facility: facility || null,
      configs: configMap,
    });
  } catch (error: any) {
    console.error('Error fetching selected facility:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /api/facilities/select ──────────────────────────────────────────────
// Selects a hospital from the Federal Registry and updates the entire application identity & metadata
router.post('/select', async (req: Request, res: Response) => {
  try {
    const { facilityId, uniqueId } = req.body;
    if (!facilityId && !uniqueId) {
      return res.status(400).json({ success: false, error: 'facilityId or uniqueId is required' });
    }

    const facility = await prisma.federalHealthFacility.findFirst({
      where: facilityId ? { id: facilityId } : { uniqueId },
    });

    if (!facility) {
      return res.status(404).json({ success: false, error: 'Federal health facility not found' });
    }

    // 1. Mark this facility as the selected one, unmark others
    await prisma.federalHealthFacility.updateMany({
      where: { isSelectedHospital: true },
      data: { isSelectedHospital: false },
    });
    await prisma.federalHealthFacility.update({
      where: { id: facility.id },
      data: { isSelectedHospital: true },
    });

    // 2. Upsert core HospitalConfig modules so print templates, EMR, and settings reflect this hospital
    const configUpdates: Array<{ key: string; val: string }> = [
      { key: 'HOSPITAL_NAME', val: facility.facilityName },
      { key: 'HOSPITAL_EMAIL', val: facility.emailAddress || '' },
      { key: 'HOSPITAL_PHONE', val: facility.phoneNumber || '' },
      { key: 'HOSPITAL_ADDRESS', val: facility.physicalLocation || facility.postalAddress || '' },
      { key: 'HOSPITAL_WEBSITE', val: facility.website || '' },
      { key: 'HOSPITAL_STATE', val: facility.stateName },
      { key: 'HOSPITAL_LGA', val: facility.lgaName },
      { key: 'HOSPITAL_WARD', val: facility.wardName },
      { key: 'HOSPITAL_UNIQUE_ID', val: facility.uniqueId },
      { key: 'HOSPITAL_REGISTRY_ID', val: facility.registryId || '' },
      { key: 'HOSPITAL_STATE_UNIQUE_ID', val: facility.stateUniqueId || '' },
      { key: 'HOSPITAL_REGISTRATION_NO', val: facility.registrationNo || '' },
      { key: 'HOSPITAL_LEVEL', val: facility.facilityLevelName || '' },
      { key: 'HOSPITAL_OWNERSHIP', val: facility.ownershipName || '' },
      { key: 'HOSPITAL_OWNERSHIP_TYPE', val: facility.ownershipType || '' },
      { key: 'HOSPITAL_BEDS', val: String(facility.beds || '') },
      { key: 'HOSPITAL_OPERATIONAL_STATUS', val: facility.operationalStatus || 'Functional' },
      { key: 'HOSPITAL_METADATA', val: JSON.stringify(facility) },
    ];

    const existingSubtitle = await prisma.hospitalConfig.findUnique({ where: { moduleKey: 'HOSPITAL_SUBTITLE' } });
    const defaultSubtitle = facility.facilityLevelName
      ? `${facility.facilityLevelName} Hospital · ${facility.lgaName}`
      : `${facility.lgaName}, ${facility.stateName}`;
    if (!existingSubtitle || !existingSubtitle.description) {
      configUpdates.push({ key: 'HOSPITAL_SUBTITLE', val: defaultSubtitle });
    }

    const existingMission = await prisma.hospitalConfig.findUnique({ where: { moduleKey: 'HOSPITAL_MISSION' } });
    if (!existingMission || !existingMission.description) {
      configUpdates.push({ key: 'HOSPITAL_MISSION', val: `Delivering compassionate, evidence-based healthcare to ${facility.lgaName} and surrounding communities.` });
    }

    for (const item of configUpdates) {
      await prisma.hospitalConfig.upsert({
        where: { moduleKey: item.key },
        update: { description: item.val, isActive: true },
        create: { moduleKey: item.key, description: item.val, isActive: true },
      });
    }

    // 3. Update NMRS / OpenMRS / NDR Config if table exists
    try {
      const existingNmrs = await prisma.nmrsConfig.findFirst();
      if (existingNmrs) {
        await prisma.nmrsConfig.update({
          where: { id: existingNmrs.id },
          data: {
            facilityName: facility.facilityName,
            facilityNhfrCode: facility.uniqueId,
            stateName: facility.stateName,
            lgaName: facility.lgaName,
          },
        });
      } else {
        await prisma.nmrsConfig.create({
          data: {
            facilityName: facility.facilityName,
            facilityNhfrCode: facility.uniqueId,
            stateName: facility.stateName,
            lgaName: facility.lgaName,
          },
        });
      }
    } catch (nmrsErr) {
      console.warn('Could not update nmrsConfig:', nmrsErr);
    }

    res.json({
      success: true,
      message: `Application updated and linked to Federal Registry facility: ${facility.facilityName}`,
      data: facility,
    });
  } catch (error: any) {
    console.error('Error selecting hospital:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /api/facilities/:id ──────────────────────────────────────────────────
// Returns full facility details and raw federal registry metadata
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const facility = await prisma.federalHealthFacility.findFirst({
      where: {
        OR: [{ id }, { uniqueId: id }],
      },
    });

    if (!facility) {
      return res.status(404).json({ success: false, error: 'Facility not found' });
    }

    res.json({ success: true, data: facility });
  } catch (error: any) {
    console.error('Error fetching facility details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
