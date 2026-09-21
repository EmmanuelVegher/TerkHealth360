import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Multer configuration for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/logos';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const position = (req as any).params?.position || 'logo';
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    // Use a fixed name per position so it always overwrites the same file
    cb(null, `hospital-${position}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|svg/.test(file.mimetype) || /\.(jpg|jpeg|png|webp|svg)$/i.test(file.originalname);
    if (ok) cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
});

const DEFAULT_MODULES = [
  { moduleKey: 'OPD', description: 'Outpatient Department', isActive: true },
  { moduleKey: 'IPD', description: 'Inpatient / Ward', isActive: true },
  { moduleKey: 'PATHOLOGY', description: 'Pathology & Laboratory', isActive: true },
  { moduleKey: 'RADIOLOGY', description: 'Radiology & Imaging', isActive: true },
  { moduleKey: 'BLOOD_BANK', description: 'Blood Bank', isActive: true },
  { moduleKey: 'OPERATING_THEATRE', description: 'Operating Theatre (Surgery)', isActive: true },
  { moduleKey: 'ICU', description: 'Intensive Care Unit (ICU)', isActive: false },
  { moduleKey: 'EMERGENCY', description: 'Accident & Emergency', isActive: true },
  { moduleKey: 'MATERNITY', description: 'Maternity Ward / ANC', isActive: true },
  { moduleKey: 'PHYSIO', description: 'Physiotherapy & Rehab', isActive: true },
  { moduleKey: 'MORTUARY', description: 'Mortuary & Funeral', isActive: true },
  { moduleKey: 'PHARMACY', description: 'Pharmacy', isActive: true },
];

router.get('/modules', async (req: Request, res: Response) => {
  try {
    let configs = await prisma.hospitalConfig.findMany();
    
    // Seed missing defaults
    const existingKeys = new Set(configs.map(c => c.moduleKey));
    const missing = DEFAULT_MODULES.filter(m => !existingKeys.has(m.moduleKey));
    if (missing.length > 0) {
      await prisma.hospitalConfig.createMany({ data: missing });
    }

    // Set ICU module inactive as configured
    if (!existingKeys.has('ICU')) {
      await prisma.hospitalConfig.upsert({
        where: { moduleKey: 'ICU' },
        update: { isActive: false },
        create: { moduleKey: 'ICU', description: 'Intensive Care Unit (ICU)', isActive: false },
      });
    }

    configs = await prisma.hospitalConfig.findMany();
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/modules/:moduleKey', async (req: any, res: Response) => {
  try {
    const { moduleKey } = req.params;
    const { isActive, description } = req.body;
    
    const updateData: any = {};
    if (typeof isActive !== 'undefined') updateData.isActive = isActive;
    if (typeof description !== 'undefined') updateData.description = description;

    const config = await prisma.hospitalConfig.upsert({
      where: { moduleKey },
      update: updateData,
      create: { 
        moduleKey, 
        isActive: typeof isActive !== 'undefined' ? isActive : true, 
        description: description ?? moduleKey 
      }
    });

    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Dedicated Logo Upload Endpoint ---
// POST /api/config/logos/:position  (position = 'left' | 'right' | 'stamp')
router.post('/logos/:position', uploadLogo.single('logo'), async (req: any, res: Response) => {
  try {
    const { position } = req.params;
    if (!['left', 'right', 'stamp'].includes(position)) {
      return res.status(400).json({ success: false, error: 'position must be left, right, or stamp' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Store the public URL path
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const moduleKey = position === 'left' ? 'HOSPITAL_LOGO_LEFT' : (position === 'right' ? 'HOSPITAL_LOGO_RIGHT' : 'HOSPITAL_STAMP');

    const config = await prisma.hospitalConfig.upsert({
      where: { moduleKey },
      update: { description: logoUrl, isActive: true },
      create: { moduleKey, description: logoUrl, isActive: true },
    });

    res.json({ success: true, data: config, url: logoUrl });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
