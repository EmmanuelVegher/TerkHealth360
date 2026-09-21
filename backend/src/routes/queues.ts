import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();
import { prisma } from '../prisma.js';

const checkInSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional().nullable(),
  department: z.string(), // e.g. OPD, LABORATORY, RADIOLOGY, PHARMACY, BILLING
  priority: z.number().default(0), // 0: Normal, 1: Priority, 2: Emergency
  priorityReason: z.string().optional().nullable(),
});

const actionSchema = z.object({
  queueId: z.string(),
  status: z.enum(['WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'SKIPPED', 'CANCELLED']),
});

const priorityOverrideSchema = z.object({
  queueId: z.string(),
  priority: z.number(),
  reason: z.string().min(3),
});

// Helper: Generate next sequential token number for department
const generateTokenNumber = async (dept: string): Promise<string> => {
  const prefix = dept.substring(0, 3).toUpperCase();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await prisma.patientQueue.count({
    where: {
      department: dept,
      createdAt: { gte: startOfDay },
    },
  });

  const nextSeq = count + 1;
  return `${prefix}-${nextSeq.toString().padStart(3, '0')}`;
};

// 0. Get list of all doctors for patient transfers & assignments
router.get('/doctors', authMiddleware, async (_req, res, next) => {
  try {
    const dbStaff = await prisma.staff.findMany({
      where: {
        OR: [
          { designation: { contains: 'Doctor', mode: 'insensitive' } },
          { designation: { contains: 'MD', mode: 'insensitive' } },
          { designation: { contains: 'MO', mode: 'insensitive' } },
          { designation: { contains: 'Physician', mode: 'insensitive' } },
          { user: { role: 'DOCTOR' } }
        ]
      },
      include: { user: true },
      orderBy: { firstName: 'asc' }
    });

    let formatted = dbStaff.map(s => ({
      id: s.id,
      staffId: s.id,
      userId: s.userId,
      employeeId: s.employeeId,
      fullName: s.firstName && s.lastName ? (s.firstName.startsWith('Dr.') ? `${s.firstName} ${s.lastName}` : `Dr. ${s.firstName} ${s.lastName}`) : (s.user?.username ? `Dr. ${s.user.username}` : 'Dr. Medical Officer'),
      firstName: s.firstName,
      lastName: s.lastName,
      department: s.department || 'OPD',
      designation: s.designation || 'Doctor',
      specialization: s.specialization || 'General Practice',
    }));

    if (formatted.length === 0) {
      const dbUsers = await prisma.user.findMany({
        where: { role: 'DOCTOR' },
        include: { staff: true }
      });
      formatted = dbUsers.map(u => ({
        id: u.staff?.id || u.id,
        staffId: u.staff?.id || u.id,
        userId: u.id,
        employeeId: u.staff?.employeeId || u.username,
        fullName: u.staff ? `Dr. ${u.staff.firstName} ${u.staff.lastName}` : `Dr. ${u.username}`,
        firstName: u.staff?.firstName || u.username,
        lastName: u.staff?.lastName || '',
        department: u.staff?.department || 'OPD',
        designation: u.staff?.designation || 'Doctor',
        specialization: 'General Practice',
      }));
    }

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// 1. Check in patient to queue
router.post('/check-in', authMiddleware, async (req: any, res, next) => {
  try {
    const data = checkInSchema.parse(req.body);

    // Validate patient exists
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Generate token prefix sequential
    const tokenNumber = await generateTokenNumber(data.department);

    // Create a visit log if appointment is linked
    let visitId: string | null = null;
    if (data.appointmentId) {
      const appt = await prisma.appointment.findUnique({ where: { id: data.appointmentId } });
      if (appt) {
        // Link to existing visit or create check-in visit
        const activeVisit = await prisma.visit.findFirst({
          where: { patientId: data.patientId, status: 'CHECKED_IN' },
          orderBy: { createdAt: 'desc' },
        });

        if (activeVisit) {
          visitId = activeVisit.id;
        } else {
          // Create check-in visit
          const randSeq = Math.floor(1000 + Math.random() * 9000);
          const v = await prisma.visit.create({
            data: {
              patientId: data.patientId,
              visitNumber: `VIS-${randSeq}`,
              visitType: 'OUTPATIENT',
              status: 'CHECKED_IN',
            },
          });
          visitId = v.id;
        }

        // Update appointment status to Checked-In (FULFILLED or leave it as FULFILLED)
        await prisma.appointment.update({
          where: { id: data.appointmentId },
          data: { status: 'FULFILLED' },
        });
      }
    }

    const queueTicket = await prisma.patientQueue.create({
      data: {
        patientId: data.patientId,
        visitId,
        tokenNumber,
        department: data.department,
        status: 'WAITING',
        priority: data.priority,
        priorityReason: data.priorityReason || null,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'queue.check_in',
      resourceType: 'PatientQueue',
      resourceId: queueTicket.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { tokenNumber, department: data.department },
    });

    res.status(201).json({ success: true, queueTicket });
  } catch (error) {
    next(error);
  }
});

// 2. Get active queues for department (only patients physically in waiting area: WAITING & CALLED)
router.get('/department/:dept', authMiddleware, async (req, res, next) => {
  try {
    const dept = req.params.dept;

    // Fetch active admissions to exclude inpatient ward-admitted patients
    const activeAdmissions = await prisma.admission.findMany({
      where: { dischargedAt: null },
      select: { patientId: true }
    }).catch(() => []);
    const admittedPatientIds = new Set(activeAdmissions.map(a => a.patientId));

    const list = await prisma.patientQueue.findMany({
      where: {
        department: dept,
        status: { in: ['WAITING', 'CALLED'] }, // Exclude IN_SERVICE (in consultation), COMPLETED, and CANCELLED
      },
      include: {
        patient: {
          include: { telecoms: true }
        },
        visit: true,
      },
      orderBy: [
        { priority: 'desc' }, // emergency levels top
        { createdAt: 'asc' }, // first come first served
      ],
    });

    // Exclude admitted patients or patients whose visits are in consultation / admitted / closed / discharged
    const filteredList = list.filter(item => {
      if (admittedPatientIds.has(item.patientId)) return false;
      if (item.visit) {
        const vStatus = (item.visit.status || '').toUpperCase();
        if (vStatus === 'IN_CONSULTATION' || vStatus === 'ADMITTED' || vStatus === 'CLOSED' || vStatus === 'DISCHARGED') {
          return false;
        }
      }
      return true;
    });

    res.json(filteredList);
  } catch (error) {
    next(error);
  }
});

// 3. Queue Action Transitions
router.post('/action', authMiddleware, async (req: any, res, next) => {
  try {
    const data = actionSchema.parse(req.body);

    const queue = await prisma.patientQueue.findUnique({ where: { id: data.queueId } });
    if (!queue) return res.status(404).json({ message: 'Queue ticket not found' });

    // Fetch full doctor profile details from database
    const userRecord: any = await prisma.user.findUnique({
      where: { id: req.user?.id || req.user?.userId || '' },
      include: { staff: true }
    }).catch(() => null);

    const doctorId = userRecord?.staffId || userRecord?.staff?.id || userRecord?.id || req.user?.staffId || req.user?.id || req.user?.userId || 'SYSTEM_DOC';
    const rawDocName = userRecord?.fullName || (userRecord?.firstName ? `${userRecord.firstName} ${userRecord.lastName || ''}`.trim() : null) || userRecord?.username || req.user?.fullName;
    const doctorName = rawDocName ? (rawDocName.startsWith('Dr.') ? rawDocName : `Dr. ${rawDocName}`) : 'Dr. Medical Officer';

    const updateData: any = { status: data.status };

    if (data.status === 'CALLED') {
      updateData.calledAt = new Date();
    } else if (data.status === 'IN_SERVICE') {
      updateData.serviceStartedAt = new Date();
      updateData.assignedDoctorId = doctorId;
      updateData.assignedDoctorName = doctorName;
    } else if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.patientQueue.update({
      where: { id: data.queueId },
      data: updateData,
    });

    // Synchronize linked Visit and Encounter state
    let targetVisitId = queue.visitId;
    if (!targetVisitId) {
      const activeVisit = await prisma.visit.findFirst({
        where: { patientId: queue.patientId, status: { notIn: ['CLOSED', 'DISCHARGED'] } },
        orderBy: { createdAt: 'desc' }
      });
      targetVisitId = activeVisit?.id || null;
    }

    if (targetVisitId) {
      if (data.status === 'CALLED' || data.status === 'IN_SERVICE') {
        const { transitionVisitWorkflowToStatus } = await import('./workflow.js');
        await transitionVisitWorkflowToStatus(targetVisitId, 'IN_CONSULTATION', doctorName, `Queue status changed to ${data.status}`);

        const existingEnc = await prisma.encounter.findFirst({ where: { visitId: targetVisitId } });
        if (!existingEnc) {
          await prisma.encounter.create({
            data: {
              visitId: targetVisitId,
              patientId: queue.patientId,
              staffId: doctorId,
              type: 'Consultation',
              status: 'IN_PROGRESS',
              start: new Date(),
              serviceType: 'OUTPATIENT',
              reasonText: queue.priorityReason || 'OPD Consultation',
            }
          }).catch(() => {});
        } else {
          const encUpdate: any = { status: 'IN_PROGRESS' };
          if (data.status === 'IN_SERVICE') {
            encUpdate.staffId = doctorId;
          }
          await prisma.encounter.update({
            where: { id: existingEnc.id },
            data: encUpdate
          }).catch(() => {});
        }
      } else if (data.status === 'COMPLETED') {
        const { transitionVisitWorkflowToStatus } = await import('./workflow.js');
        await transitionVisitWorkflowToStatus(targetVisitId, 'CLOSED', doctorName, 'Completed visit in Queue');
      }
    }

    await logAudit({
      userId: req.user.userId || doctorId,
      action: `queue.transition_${data.status.toLowerCase()}`,
      resourceType: 'PatientQueue',
      resourceId: queue.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, queueTicket: updated, doctorName, doctorId });
  } catch (error) {
    next(error);
  }
});

// Transfer patient to another Doctor
router.post('/transfer-doctor', authMiddleware, async (req: any, res, next) => {
  try {
    const { visitId, queueId, encounterId, targetDoctorId, targetDoctorName, transferNotes } = req.body;

    if (!targetDoctorId || !targetDoctorName) {
      return res.status(400).json({ message: 'Target doctor details are required' });
    }

    // 1. Update PatientQueue ticket if exists
    if (queueId) {
      await prisma.patientQueue.update({
        where: { id: queueId },
        data: {
          assignedDoctorId: targetDoctorId,
          assignedDoctorName: targetDoctorName,
          status: 'WAITING', // reset to WAITING so new doctor can call/see them
        }
      }).catch(() => {});
    } else if (visitId) {
      await prisma.patientQueue.updateMany({
        where: { visitId, department: 'CONSULTATION' },
        data: {
          assignedDoctorId: targetDoctorId,
          assignedDoctorName: targetDoctorName,
          status: 'WAITING',
        }
      }).catch(() => {});
    }

    // 2. Update Encounter staffId
    if (encounterId && !encounterId.startsWith('enc-v-') && !encounterId.startsWith('enc-q-')) {
      await prisma.encounter.update({
        where: { id: encounterId },
        data: {
          staffId: targetDoctorId,
          reasonText: transferNotes ? `[Transferred to ${targetDoctorName}]: ${transferNotes}` : undefined,
        }
      }).catch(() => {});
    } else if (visitId) {
      await prisma.encounter.updateMany({
        where: { visitId },
        data: {
          staffId: targetDoctorId,
        }
      }).catch(() => {});
    }

    // 3. Log audit
    await logAudit({
      userId: req.user?.id || 'DOCTOR',
      action: 'queue.transfer_doctor',
      resourceType: 'PatientQueue',
      resourceId: queueId || visitId || 'TRANSFER',
      changes: { targetDoctorId, targetDoctorName, transferNotes },
    });

    res.json({ success: true, message: `Patient successfully transferred to ${targetDoctorName}` });
  } catch (error) {
    next(error);
  }
});

// 4. Priority Triage Overrides
router.post('/priority-override', authMiddleware, async (req: any, res, next) => {
  try {
    const data = priorityOverrideSchema.parse(req.body);

    const queue = await prisma.patientQueue.findUnique({ where: { id: data.queueId } });
    if (!queue) return res.status(404).json({ message: 'Queue ticket not found' });

    const updated = await prisma.patientQueue.update({
      where: { id: data.queueId },
      data: {
        priority: data.priority,
        priorityReason: data.reason,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'queue.priority_override',
      resourceType: 'PatientQueue',
      resourceId: queue.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { prevPriority: queue.priority, newPriority: data.priority, reason: data.reason },
    });

    res.json({ success: true, queueTicket: updated });
  } catch (error) {
    next(error);
  }
});

// 5. Waiting Time & Excessive Delay Warnings Alert
router.get('/waiting-times', authMiddleware, async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const activeTickets = await prisma.patientQueue.findMany({
      where: {
        createdAt: { gte: startOfDay },
        status: 'WAITING',
      },
      include: { patient: true },
    });

    const now = new Date().getTime();
    const waitTimes = activeTickets.map(t => {
      const waitMinutes = Math.floor((now - new Date(t.createdAt).getTime()) / 60000);
      return {
        id: t.id,
        tokenNumber: t.tokenNumber,
        patientName: `${t.patient.firstName} ${t.patient.lastName}`,
        department: t.department,
        waitMinutes,
        exceedsThreshold: waitMinutes >= 60, // Warning threshold limit
      };
    });

    // Calculate averages per department
    const depts = Array.from(new Set(waitTimes.map(w => w.department)));
    const averages = depts.map(d => {
      const tickets = waitTimes.filter(w => w.department === d);
      const sum = tickets.reduce((acc, t) => acc + t.waitMinutes, 0);
      return {
        department: d,
        count: tickets.length,
        averageWaitMinutes: tickets.length > 0 ? Math.round(sum / tickets.length) : 0,
      };
    });

    res.json({ waitTimes, averages });
  } catch (error) {
    next(error);
  }
});

export default router;
