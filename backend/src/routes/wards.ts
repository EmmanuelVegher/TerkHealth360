import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ── GET /wards — list all wards ────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    let wards = await prisma.ward.findMany({
      include: { beds: true },
      orderBy: { name: 'asc' },
    });

    // Auto-seed default wards if empty
    if (wards.length === 0) {
      const defaultWards = [
        { name: 'General Ward', wardCategory: 'GENERAL', type: 'GENERAL', capacity: 10, description: 'General Medical & Surgical Inpatient Ward', color: '#3f51b5' },
        { name: 'ICU (Intensive Care Unit)', wardCategory: 'ICU', type: 'ICU', capacity: 6, description: 'Intensive Critical Care Monitoring Unit', color: '#f44336' },
        { name: 'Maternity Ward', wardCategory: 'MATERNITY', type: 'MATERNITY', capacity: 8, description: 'Antenatal, Labor & Postnatal Mother Care', color: '#e91e63' },
        { name: 'Paediatric Ward', wardCategory: 'PAEDIATRIC', type: 'PAEDIATRIC', capacity: 8, description: 'Pediatric Inpatient & Children Care', color: '#9c27b0' },
        { name: 'Emergency Ward', wardCategory: 'EMERGENCY', type: 'EMERGENCY', capacity: 6, description: 'Accident & Emergency Acute Stabilization Ward', color: '#ff9800' },
        { name: 'Main Operating Theatre & Surgical Suites', wardCategory: 'THEATRE', type: 'THEATRE', capacity: 6, description: 'Major surgical suites, operating room tables & PACU recovery bays', color: '#0f766e' },
        { name: 'Surgical Ward', wardCategory: 'SURGICAL', type: 'SURGICAL', capacity: 8, description: 'Post-Operative Surgical Recovery Ward', color: '#00bcd4' },
        { name: 'Private Ward', wardCategory: 'PRIVATE', type: 'PRIVATE', capacity: 5, description: 'Private & Executive VIP Rooms', color: '#4caf50' },
      ];

      for (const dw of defaultWards) {
        const createdWard = await prisma.ward.create({ data: dw });
        const prefix = dw.wardCategory.substring(0, 3).toUpperCase();
        const beds = Array.from({ length: dw.capacity }, (_, i) => ({
          number: `${prefix}-${String(i + 1).padStart(2, '0')}`,
          wardId: createdWard.id,
          status: 'AVAILABLE',
        }));
        await prisma.bed.createMany({ data: beds });
      }

      wards = await prisma.ward.findMany({
        include: { beds: true },
        orderBy: { name: 'asc' },
      });
    }

    const result = wards.map((w) => ({
      ...w,
      totalBeds: w.beds.length,
      occupiedBeds: w.beds.filter((b) => b.status === 'OCCUPIED').length,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ── POST /wards — create a ward ────────────────────────────────────────────────
router.post('/', authMiddleware, async (req: any, res, next) => {
  try {
    const { name, type, wardCategory, gender, capacity, description, color } = req.body;

    if (!name || !wardCategory) {
      return res.status(400).json({ message: 'name and wardCategory are required' });
    }

    const ward = await prisma.$transaction(async (tx) => {
      const w = await tx.ward.create({
        data: {
          name: name.trim(),
          type: type || wardCategory,
          wardCategory,
          gender: gender || null,
          capacity: parseInt(capacity) || 0,
          description: description || null,
          color: color || null,
        },
      });

      // Auto-create beds up to capacity
      const bedCount = parseInt(capacity) || 0;
      if (bedCount > 0) {
        const prefix = wardCategory.substring(0, 3).toUpperCase();
        const beds = Array.from({ length: bedCount }, (_, i) => ({
          number: `${prefix}-${String(i + 1).padStart(2, '0')}`,
          wardId: w.id,
          status: 'AVAILABLE',
        }));
        await tx.bed.createMany({ data: beds });
      }

      return w;
    });

    const result = await prisma.ward.findUnique({ where: { id: ward.id }, include: { beds: true } });
    res.status(201).json(result);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ message: 'A ward with that name already exists' });
    }
    next(error);
  }
});

// ── PUT /wards/:id — update a ward ────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { name, type, wardCategory, gender, capacity, description, color, isActive } = req.body;

    const ward = await prisma.ward.update({
      where: { id: req.params.id },
      data: {
        name: name?.trim(),
        type: type || wardCategory,
        wardCategory,
        gender: gender || null,
        capacity: capacity !== undefined ? parseInt(capacity) : undefined,
        description,
        color,
        isActive,
      },
      include: { beds: true },
    });

    res.json(ward);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ message: 'A ward with that name already exists' });
    }
    next(error);
  }
});

// ── DELETE /wards/:id — delete or deactivate a ward ────────────────────────────
router.delete('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const wardId = req.params.id;

    // Check if ward has occupied beds
    const occupiedBeds = await prisma.bed.count({
      where: { wardId, status: 'OCCUPIED' }
    });

    if (occupiedBeds > 0) {
      return res.status(400).json({ message: `Cannot delete ward containing ${occupiedBeds} occupied beds.` });
    }

    // Delete associated beds and remove ward
    await prisma.$transaction([
      prisma.bed.deleteMany({ where: { wardId } }),
      prisma.wardNurseRoster.deleteMany({ where: { wardId } }),
      prisma.ward.delete({ where: { id: wardId } })
    ]);

    res.json({ message: 'Ward deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
