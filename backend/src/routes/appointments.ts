import { Router } from 'express';
import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();
import { prisma } from '../prisma.js';

const appointmentCreateSchema = z.object({
  patientId: z.string(),
  staffId: z.string().optional().nullable(),
  serviceType: z.string().optional().nullable(),
  start: z.string(), // ISO String
  duration: z.number().default(15), // in minutes
  appointmentType: z.enum(['NEW', 'RETURNING', 'SPECIALIST', 'ANC', 'TELEMEDICINE', 'ANC_FOLLOW_UP', 'FAMILY_PLANNING']).default('NEW'),
  visitType: z.enum(['WALK_IN', 'SCHEDULED']).default('SCHEDULED'),
  reasonText: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
  bypassConflict: z.boolean().default(false),
});

const rescheduleSchema = z.object({
  start: z.string(),
  duration: z.number().default(15),
  statusReason: z.string().min(3),
});

// 1. Get appointments
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { patientId, staffId, serviceType, startDate, endDate } = req.query;

    const where: any = {};
    if (patientId) where.patientId = patientId as string;
    if (staffId) where.staffId = staffId as string;
    if (serviceType) where.serviceType = serviceType as string;

    if (startDate || endDate) {
      where.start = {};
      if (startDate) where.start.gte = new Date(startDate as string);
      if (endDate) where.start.lte = new Date(endDate as string);
    }

    const list = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: {
            admissions: {
              where: { status: 'ADMITTED' },
              include: { bed: { include: { ward: true } } }
            }
          }
        },
        staff: true,
      },
      orderBy: { start: 'asc' },
    });

    res.json(list);
  } catch (error) {
    next(error);
  }
});

// 2. Create Appointment (Validates double bookings & leave blocks)
router.post('/', authMiddleware, async (req: any, res, next) => {
  try {
    const data = appointmentCreateSchema.parse(req.body);
    const startVal = new Date(data.start);
    const endVal = new Date(startVal.getTime() + data.duration * 60 * 1000);

    if (endVal <= startVal) {
      return res.status(400).json({ message: 'Appointment end time must exceed start time.' });
    }

    // A. Validate Leave / Calendar Blocks
    if (data.staffId) {
      const block = await prisma.providerCalendarBlock.findFirst({
        where: {
          staffId: data.staffId,
          startTime: { lte: startVal },
          endTime: { gte: endVal },
        },
      });

      if (block) {
        return res.status(400).json({
          message: `Booking failed: Healthcare provider is unavailable due to documented leave or clinic closure: ${block.reason}`,
        });
      }
    }

    // B. Check Double Bookings
    if (data.staffId && !data.bypassConflict) {
      const doubleBooking = await prisma.appointment.findFirst({
        where: {
          staffId: data.staffId,
          status: { in: [AppointmentStatus.BOOKED, AppointmentStatus.PENDING] },
          OR: [
            { start: { lte: startVal }, end: { gt: startVal } },
            { start: { lt: endVal }, end: { gte: endVal } },
          ],
        },
      });

      if (doubleBooking) {
        return res.status(409).json({
          conflict: true,
          message: 'Conflict alert: The selected provider already has a scheduled appointment during this time block. Bypassing requires supervisor override authorization.',
        });
      }
    }

    // C. Generate automatic appointment number
    const randDigits = Math.floor(100000 + Math.random() * 900000);
    const appointmentNumber = `APT-${randDigits}`;

    const appointment = await prisma.appointment.create({
      data: {
        appointmentNumber,
        patientId: data.patientId,
        staffId: data.staffId || null,
        serviceType: data.serviceType || null,
        status: AppointmentStatus.BOOKED,
        start: startVal,
        end: endVal,
        duration: data.duration,
        appointmentType: data.appointmentType,
        visitType: data.visitType,
        reasonText: data.reasonText || null,
        comment: data.comment || null,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'appointment.create',
      resourceType: 'Appointment',
      resourceId: appointment.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
});

// 3. Reschedule Appointment
router.post('/reschedule/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const id = req.params.id;
    const data = rescheduleSchema.parse(req.body);

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const startVal = new Date(data.start);
    const endVal = new Date(startVal.getTime() + data.duration * 60 * 1000);

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        start: startVal,
        end: endVal,
        duration: data.duration,
        statusReason: data.statusReason,
        status: AppointmentStatus.BOOKED, // Rescheduled resets status
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'appointment.reschedule',
      resourceType: 'Appointment',
      resourceId: updated.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { prevStart: appointment.start, prevEnd: appointment.end, reason: data.statusReason },
    });

    res.json({ success: true, appointment: updated });
  } catch (error) {
    next(error);
  }
});

// 4. Cancel Appointment
router.post('/cancel/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const id = req.params.id;
    const { statusReason } = z.object({ statusReason: z.string().min(3) }).parse(req.body);

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        statusReason,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'appointment.cancel',
      resourceType: 'Appointment',
      resourceId: updated.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { reason: statusReason },
    });

    res.json({ success: true, appointment: updated });
  } catch (error) {
    next(error);
  }
});

// 5. Create Calendar Blocks
router.post('/blocks', authMiddleware, async (req: any, res, next) => {
  try {
    const { staffId, startTime, endTime, reason } = z.object({
      staffId: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      reason: z.string().min(3),
    }).parse(req.body);

    const block = await prisma.providerCalendarBlock.create({
      data: {
        staffId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'calendar.create_block',
      resourceType: 'ProviderCalendarBlock',
      resourceId: block.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, block });
  } catch (error) {
    next(error);
  }
});

export default router;
