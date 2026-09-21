import { Router, Request, Response } from 'express';
import { z } from 'zod';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();
import { prisma } from '../prisma.js';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// ─────────────────────────────────────────────────────────────────────────────
// STATE STORES (Mock Database for Telemedicine & Remote Patient Monitoring)
// ─────────────────────────────────────────────────────────────────────────────

let telemedicineSessions: any[] = [
  { id: 'TEL-101', patientId: 'pat-1', doctorName: 'Dr. Chidi Okafor', specialty: 'Cardiology', date: '2026-06-29', time: '10:00 AM', status: 'WAITING_ROOM', roomToken: 'room_cardio_101' }
];

let rpmReadings: any[] = [
  { id: 'RPM-01', patientId: 'pat-1', type: 'BLOOD_PRESSURE', systolic: 125, diastolic: 82, pulse: 72, timestamp: '2026-06-28 08:30', status: 'NORMAL' },
  { id: 'RPM-02', patientId: 'pat-1', type: 'BLOOD_GLUCOSE', glucoseValue: 98, mealContext: 'FASTING', timestamp: '2026-06-28 07:15', status: 'NORMAL' },
  { id: 'RPM-03', patientId: 'pat-1', type: 'PULSE_OXIMETER', spo2: 98, pulseRate: 75, timestamp: '2026-06-28 09:00', status: 'NORMAL' }
];

let engagementCampaigns: any[] = [
  { id: 'CMP-201', title: 'National Polio Vaccination Drive', channel: 'SMS', dateSent: '2026-06-25', status: 'DELIVERED', message: 'Bring infants under 5 to the nearest Ward Clinic for immunisation.' },
  { id: 'CMP-202', title: 'ART Adherence Checkup', channel: 'WHATSAPP', dateSent: '2026-06-27', status: 'DELIVERED', message: 'This is a friendly reminder to record your daily ART pill check.' }
];

// ─────────────────────────────────────────────────────────────────────────────
// §26.1 - PATIENT REGISTRATION & AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

const portalRegisterSchema = z.object({
  patientNumber: z.string(),
  phone: z.string(),
  password: z.string().min(6),
});

const verifyOtpSchema = z.object({
  patientId: z.string(),
  otp: z.string().length(6),
});

const portalLoginSchema = z.object({
  mrn: z.string(),
  password: z.string(),
});

router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const data = portalRegisterSchema.parse(req.body);
    const patient = await prisma.patient.findFirst({
      where: {
        patientNumber: data.patientNumber,
        telecoms: { some: { system: 'phone', value: data.phone } }
      }
    });

    if (!patient) {
      return res.status(400).json({
        message: 'Registration failed: MRN number and registered phone number combination does not match.'
      });
    }

    const existing = await prisma.portalAccount.findUnique({
      where: { patientId: patient.id }
    });

    if (existing) {
      return res.status(409).json({ message: 'Patient portal account already exists for this MRN.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.portalAccount.create({
      data: {
        patientId: patient.id,
        passwordHash,
        isVerified: false,
        verificationOtp: otp,
        otpExpiresAt: otpExpires,
      }
    });

    res.status(201).json({
      success: true,
      message: 'Portal account created. OTP sent to registered mobile phone.',
      patientId: patient.id,
      mockOtp: otp
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-otp', async (req: Request, res: Response, next) => {
  try {
    const { patientId, otp } = verifyOtpSchema.parse(req.body);
    const account = await prisma.portalAccount.findUnique({ where: { patientId } });
    if (!account) return res.status(404).json({ message: 'Portal account not found.' });

    if (account.verificationOtp !== otp || !account.otpExpiresAt || account.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification token.' });
    }

    await prisma.portalAccount.update({
      where: { patientId },
      data: { isVerified: true, verificationOtp: null, otpExpiresAt: null }
    });

    res.json({ success: true, message: 'Portal profile activated successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const { mrn, password } = portalLoginSchema.parse(req.body);
    const patient = await prisma.patient.findFirst({
      where: { patientNumber: mrn },
      include: { portalAccount: true }
    });

    if (!patient || !patient.portalAccount) {
      return res.status(401).json({ message: 'Invalid MRN or password.' });
    }

    if (!patient.portalAccount.isVerified) {
      return res.status(403).json({ message: 'Account is not verified. Verify OTP first.' });
    }

    const match = await bcrypt.compare(password, patient.portalAccount.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid MRN or password.' });

    await prisma.portalAccount.update({
      where: { patientId: patient.id },
      data: { lastLogin: new Date() }
    });

    const token = jwt.sign(
      { userId: patient.id, username: mrn, role: 'PATIENT' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      patient: {
        id: patient.id,
        mrn: patient.patientNumber,
        firstName: patient.firstName,
        lastName: patient.lastName,
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §26.1 - PATIENT MEDICAL RECORDS & BILLS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/records/:patientId', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const patientId = req.params.patientId;
    const [conditions, medications, queuePosition, billingClaims] = await Promise.all([
      prisma.condition.findMany({
        where: { patientId, clinicalStatus: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.medicationRequest.findMany({
        where: { patientId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.patientQueue.findFirst({
        where: { patientId, status: { in: ['WAITING', 'CALLED'] } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    let queueDetails: any = null;
    if (queuePosition) {
      const aheadCount = await prisma.patientQueue.count({
        where: {
          department: queuePosition.department,
          status: 'WAITING',
          createdAt: { lt: queuePosition.createdAt }
        }
      });
      queueDetails = {
        tokenNumber: queuePosition.tokenNumber,
        department: queuePosition.department,
        status: queuePosition.status,
        ahead: aheadCount,
        estWaitMinutes: aheadCount * 12 + 12
      };
    }

    res.json({
      conditions,
      medications,
      queueDetails,
      billingClaims,
      telemedicine: telemedicineSessions.filter(s => s.patientId === patientId || s.patientId === 'pat-1'),
      rpm: rpmReadings.filter(r => r.patientId === patientId || r.patientId === 'pat-1'),
      campaigns: engagementCampaigns
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §26.2 - TELEMEDICINE VIRTUAL CONSULTATIONS
// ─────────────────────────────────────────────────────────────────────────────

router.post('/telemedicine/join', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);
    const session = telemedicineSessions.find(s => s.id === sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session room not found' });
    session.status = 'IN_CONSULTATION';
    await logAudit({ userId: (req as any).user?.userId, action: 'TELEMEDICINE_JOIN_ROOM', resourceType: 'TelemedicineSession', resourceId: session.id, changes: { status: session.status } });
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §26.3 - REMOTE PATIENT MONITORING (RPM)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/rpm/reading', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const data = z.object({
      patientId: z.string(),
      type: z.string(),
      systolic: z.number().optional(),
      diastolic: z.number().optional(),
      pulse: z.number().optional(),
      glucoseValue: z.number().optional(),
      mealContext: z.string().optional(),
      spo2: z.number().optional(),
      pulseRate: z.number().optional()
    }).parse(req.body);

    let status = 'NORMAL';
    if (data.type === 'BLOOD_PRESSURE' && data.systolic && data.systolic > 140) {
      status = 'CRITICAL';
    }
    if (data.type === 'BLOOD_GLUCOSE' && data.glucoseValue && data.glucoseValue > 180) {
      status = 'CRITICAL';
    }
    if (data.type === 'PULSE_OXIMETER' && data.spo2 && data.spo2 < 95) {
      status = 'CRITICAL';
    }

    const reading = {
      id: `RPM-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status,
      ...data
    };

    rpmReadings.unshift(reading);
    await logAudit({ userId: (req as any).user?.userId, action: 'RPM_LOG_READING', resourceType: 'RPMReading', resourceId: reading.id, changes: reading });
    res.status(201).json({ success: true, data: reading });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §26.4 - SATISFACTION FEEDBACK SURVEY
// ─────────────────────────────────────────────────────────────────────────────

router.post('/feedback', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const { patientId, rating, feedbackText, category } = z.object({
      patientId: z.string(),
      rating: z.number().min(1).max(5),
      feedbackText: z.string().optional().nullable(),
      category: z.string().optional().nullable(),
    }).parse(req.body);

    const feedback = await prisma.patientFeedback.create({
      data: {
        patientId,
        rating,
        feedbackText: feedbackText || null,
        category: category || null,
      },
    });

    res.status(201).json({ success: true, feedback });
  } catch (error) {
    next(error);
  }
});

export default router;
