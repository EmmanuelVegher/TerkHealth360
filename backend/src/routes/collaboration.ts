import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();
import { prisma } from '../prisma.js';

// 1. Get Clinical Messaging
router.get('/messages', authMiddleware, async (req: any, res, next) => {
  try {
    // Find staff profile of logged-in user
    const staff = await prisma.staff.findUnique({
      where: { userId: req.user.id }
    });

    if (!staff) {
      return res.status(404).json({ error: 'Clinical staff profile not found' });
    }

    const messages = await prisma.clinicalMessage.findMany({
      where: {
        OR: [
          { senderId: staff.id },
          { recipientId: staff.id }
        ]
      },
      include: {
        sender: true,
        recipient: true,
        patient: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      staffId: staff.id,
      messages
    });
  } catch (error) {
    next(error);
  }
});

// Send secure message (FR-COM-001)
router.post('/messages', authMiddleware, async (req: any, res, next) => {
  try {
    const { recipientId, patientId, body, attachmentUrl, priority } = z.object({
      recipientId: z.string(),
      patientId: z.string().optional().nullable(),
      body: z.string().min(1, 'Message body cannot be empty'),
      attachmentUrl: z.string().optional().nullable(),
      priority: z.enum(['ROUTINE', 'URGENT']).default('ROUTINE'),
    }).parse(req.body);

    const sender = await prisma.staff.findUnique({
      where: { userId: req.user.id }
    });

    if (!sender) {
      return res.status(404).json({ error: 'Sender clinical staff profile not found' });
    }

    const msg = await prisma.clinicalMessage.create({
      data: {
        senderId: sender.id,
        recipientId,
        patientId: patientId || null,
        body,
        attachmentUrl,
        priority,
      },
      include: { sender: true, recipient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'clinical.message.send',
      resourceType: 'ClinicalMessage',
      resourceId: msg.id,
      changes: { priority, details: `Sent clinical message to ${msg.recipient.firstName} ${msg.recipient.lastName}. Priority: ${priority}` }
    });

    res.status(201).json(msg);
  } catch (error) {
    next(error);
  }
});

// Acknowledge/Read message (FR-COM-005)
router.post('/messages/read/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const msg = await prisma.clinicalMessage.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ success: true, msg });
  } catch (error) {
    next(error);
  }
});

// 2. MDT Meetings Workspace (FR-COM-011)
router.get('/mdt', authMiddleware, async (req, res, next) => {
  try {
    const meetings = await prisma.mDTMeeting.findMany({
      orderBy: { scheduledAt: 'desc' }
    });
    res.json(meetings);
  } catch (error) {
    next(error);
  }
});

router.post('/mdt', authMiddleware, async (req: any, res, next) => {
  try {
    const { title, scheduledAt, agenda, casesJson, attendanceJson } = z.object({
      title: z.string().min(3),
      scheduledAt: z.string().transform(val => new Date(val)),
      agenda: z.string(),
      casesJson: z.string().optional().nullable(),
      attendanceJson: z.string().optional().nullable(),
    }).parse(req.body);

    const meeting = await prisma.mDTMeeting.create({
      data: {
        title,
        scheduledAt,
        agenda,
        casesJson,
        attendanceJson,
        status: 'SCHEDULED',
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'mdt.meeting.schedule',
      resourceType: 'MDTMeeting',
      resourceId: meeting.id,
      changes: { details: `Scheduled MDT team review: "${title}" on ${scheduledAt.toISOString()}` }
    });

    res.status(201).json(meeting);
  } catch (error) {
    next(error);
  }
});

// Document MDT Decisions & minutes (FR-COM-014)
router.post('/mdt/decisions/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { minutes, decisionsJson } = z.object({
      minutes: z.string().min(5, 'Minutes must be filled in'),
      decisionsJson: z.string().min(2, 'Decisions detail is required'),
    }).parse(req.body);

    const meeting = await prisma.mDTMeeting.update({
      where: { id },
      data: {
        minutes,
        decisionsJson,
        status: 'COMPLETED'
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'mdt.meeting.complete',
      resourceType: 'MDTMeeting',
      resourceId: meeting.id,
      changes: { details: `Completed and documented MDT decisions for review session "${meeting.title}"` }
    });

    res.json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
});

// 3. Clinical Case Discussions (FR-COM-006)
router.get('/discussions/patient/:patientId', authMiddleware, async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const discussions = await prisma.clinicalDiscussion.findMany({
      where: { patientId },
      include: {
        creator: true,
        comments: {
          include: { author: true },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(discussions);
  } catch (error) {
    next(error);
  }
});

router.post('/discussions', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, subject } = z.object({
      patientId: z.string(),
      subject: z.string().min(3, 'Discussion subject is too short'),
    }).parse(req.body);

    const staff = await prisma.staff.findUnique({
      where: { userId: req.user.id }
    });

    if (!staff) {
      return res.status(404).json({ error: 'Clinical staff profile not found' });
    }

    const discussion = await prisma.clinicalDiscussion.create({
      data: {
        patientId,
        subject,
        createdById: staff.id,
        status: 'ACTIVE'
      },
      include: { creator: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'discussion.create',
      resourceType: 'ClinicalDiscussion',
      resourceId: discussion.id,
      changes: { details: `Initiated patient clinical case discussion on: "${subject}"` }
    });

    res.status(201).json(discussion);
  } catch (error) {
    next(error);
  }
});

router.post('/discussions/comment', authMiddleware, async (req: any, res, next) => {
  try {
    const { discussionId, comment, isRecommendation } = z.object({
      discussionId: z.string(),
      comment: z.string().min(1, 'Comment body cannot be empty'),
      isRecommendation: z.boolean().default(false),
    }).parse(req.body);

    const staff = await prisma.staff.findUnique({
      where: { userId: req.user.id }
    });

    if (!staff) {
      return res.status(404).json({ error: 'Clinical staff profile not found' });
    }

    const discussionComment = await prisma.clinicalDiscussionComment.create({
      data: {
        discussionId,
        authorId: staff.id,
        comment,
        isRecommendation
      },
      include: { author: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'discussion.comment',
      resourceType: 'ClinicalDiscussionComment',
      resourceId: discussionComment.id,
      changes: { isRecommendation, details: `Posted comment to discussion thread. Recommendation: ${isRecommendation}` }
    });

    res.status(201).json(discussionComment);
  } catch (error) {
    next(error);
  }
});

// 4. Telemedicine consultations Room registration (FR-COM-016)
router.post('/telemedicine/session', authMiddleware, async (req: any, res, next) => {
  try {
    const { appointmentId, patientId, hasConsent, recordingConsentText, roomName } = z.object({
      appointmentId: z.string().optional().nullable(),
      patientId: z.string(),
      hasConsent: z.boolean().default(true),
      recordingConsentText: z.string().optional().nullable(),
      roomName: z.string(),
    }).parse(req.body);

    const host = await prisma.staff.findUnique({
      where: { userId: req.user.id }
    });

    if (!host) {
      return res.status(404).json({ error: 'Host doctor staff profile not found' });
    }

    const session = await prisma.telemedicineSession.create({
      data: {
        appointmentId: appointmentId || null,
        patientId,
        staffId: host.id,
        roomName,
        hasConsent,
        recordingConsentText: hasConsent ? (recordingConsentText || 'Patient verbally consented to virtual recording') : null,
        isRecorded: hasConsent,
        status: 'ACTIVE',
        sessionStart: new Date(),
      },
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'telemedicine.session.start',
      resourceType: 'TelemedicineSession',
      resourceId: session.id,
      changes: { details: `Began virtual telemedicine room ${roomName} for patient ${session.patient.firstName} ${session.patient.lastName}` }
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

// Complete Telemedicine session & sync notes
router.post('/telemedicine/complete/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = z.object({
      notes: z.string().min(5, 'Consultation summary is required'),
    }).parse(req.body);

    const session = await prisma.telemedicineSession.update({
      where: { id },
      data: {
        notes,
        status: 'COMPLETED',
        sessionEnd: new Date()
      },
      include: { patient: true }
    });

    // Automatically sync notes to EMR records
    await prisma.consultationNote.create({
      data: {
        patientId: session.patientId,
        authorId: session.staffId,
        subjective: 'Virtual consultation conducted via secure Telemedicine module.',
        objective: `Room: ${session.roomName}. Session recording is archived.`,
        assessment: `Patient verified and consented. Assessment notes: ${notes}`,
        plan: 'Follow up remote consultation scheduled where necessary.',
        isFinalized: true,
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'telemedicine.session.complete',
      resourceType: 'TelemedicineSession',
      resourceId: session.id,
      changes: { details: `Completed telemedicine session and synced SOAP record to patient ${session.patient.firstName} ${session.patient.lastName}` }
    });

    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
});

export default router;
