import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';
import { calculateNEWS2 } from '../utils/news2.js';
import { notifyVisitsChange } from './visits.js';

const router = Router();
import { prisma } from '../prisma.js';

const medicalHistorySchema = z.object({
  lmp: z.string().optional().nullable(),
  edd: z.string().optional().nullable(),
  gravida: z.number().optional().nullable(),
  para: z.number().optional().nullable(),
  abortions: z.number().optional().nullable(),
  livingChildren: z.number().optional().nullable(),
  tobaccoUse: z.string().optional().nullable(),
  alcoholUse: z.string().optional().nullable(),
  lifestyleNotes: z.string().optional().nullable(),
  pastSurgicalNotes: z.string().optional().nullable(),
  familyHereditaryNotes: z.string().optional().nullable(),
});

const vitalSignsSchema = z.object({
  patientId: z.string(),
  encounterId: z.string().optional().nullable(),
  temp: z.number(),       // °C
  systolicBp: z.number(), // mmHg
  diastolicBp: z.number(),// mmHg
  pulse: z.number(),      // bpm
  respRate: z.number(),   // breaths/min
  spo2: z.number(),       // %
  weight: z.number().optional().nullable(), // kg
  height: z.number().optional().nullable(), // m
  consciousnessAlert: z.boolean().default(true),
  painScore: z.number().optional().nullable(),
  bloodGlucose: z.number().optional().nullable(),
});

const allergySchema = z.object({
  patientId: z.string(),
  allergen: z.string().min(1),
  category: z.enum(['DRUG', 'FOOD', 'ENVIRONMENTAL', 'LATEX', 'CONTRAST_MEDIA', 'OTHER']),
  status: z.enum(['SUSPECTED', 'CONFIRMED']),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
  reaction: z.string().optional().nullable(),
  onset: z.string().optional().nullable(),
});

const noteSchema = z.object({
  id: z.string().optional(), // for updating drafts
  visitId: z.string().optional().nullable(),
  encounterId: z.string().optional().nullable(),
  patientId: z.string(),
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  isFinalized: z.boolean().default(false),
  signature: z.string().optional().nullable(),
  justification: z.string().optional().nullable(), // for amendments
});

// 1. Get Clinical Summary View
router.get('/summary/:patientId', authMiddleware, async (req, res, next) => {
  try {
    const patientId = req.params.patientId;

    const [patient, history, allergies, alerts, recentVitals, activeProblems, recentMeds, recentInvoices, activeAdmission, triageRecords, consultationNotesRaw, surgicalBookings] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        include: { telecoms: true, insurancePolicies: { include: { provider: true, plan: true } } },
      }),
      prisma.medicalHistory.findUnique({ where: { patientId } }),
      prisma.allergy.findMany({ where: { patientId, isActive: true } }),
      prisma.clinicalAlert.findMany({ where: { patientId, isActive: true } }),
      prisma.observation.findMany({
        where: { patientId, category: 'vital-signs' },
        orderBy: { createdAt: 'desc' },
        take: 12, // recent measurements
      }),
      prisma.condition.findMany({
        where: { patientId, clinicalStatus: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.medicationRequest.findMany({
        where: { patientId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.invoice.findMany({
        where: { patientId, status: 'ISSUED' },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.admission.findFirst({
        where: { patientId, status: 'ADMITTED' },
        include: { bed: { include: { ward: true } } },
      }),
      prisma.triageRecord.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.consultationNote.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.surgicalBooking.findMany({
        where: { patientId },
        include: {
          request: true,
          surgeon: true,
          anaesthetist: true,
          intraOpRecords: {
            include: {
              implantsUsed: true,
              specimensCollected: true
            }
          },
          pacuRecords: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Attach Doctor Info to Consultation Notes
    const authorUserIds = Array.from(new Set(consultationNotesRaw.map(n => n.authorId).filter(Boolean)));
    const staffList = await prisma.staff.findMany({
      where: { OR: [{ userId: { in: authorUserIds } }, { id: { in: authorUserIds } }] },
      select: { id: true, userId: true, firstName: true, lastName: true, designation: true }
    });
    const staffMap = new Map(staffList.flatMap(s => [[s.id, s], [s.userId, s]]));

    const consultationNotes = consultationNotesRaw.map(n => {
      const doctor = staffMap.get(n.authorId || '');
      return {
        ...n,
        doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : (n.signature ? n.signature.replace(/^Signed by /i, '').replace(/^Amended by @/i, '') : 'Dr. Emmanuel Vegher'),
        doctorDesignation: doctor?.designation || 'Medical Officer',
      };
    });

    res.json({
      patient,
      history,
      allergies,
      alerts,
      recentVitals,
      activeProblems,
      recentMeds,
      recentInvoices,
      activeAdmission,
      triageRecords,
      consultationNotes,
      surgicalBookings,
    });
  } catch (error) {
    next(error);
  }
});

// 2. Get Longitudinal Clinical Timeline
router.get('/timeline/:patientId', authMiddleware, async (req, res, next) => {
  try {
    const patientId = req.params.patientId;

    const [visits, notes, meds, conditions, observations] = await Promise.all([
      prisma.visit.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } }),
      prisma.consultationNote.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } }),
      prisma.medicationRequest.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } }),
      prisma.condition.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } }),
      prisma.observation.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } }),
    ]);

    // Aggregate into timeline events
    const timeline: any[] = [];

    visits.forEach(v => {
      timeline.push({
        id: v.id,
        type: 'VISIT',
        title: `Hospital Visit - ${v.visitType}`,
        subtitle: v.visitNumber,
        date: v.createdAt,
        status: v.status,
        color: v.visitType === 'EMERGENCY' ? '#c92a2a' : '#3b5bdb',
      });
    });

    notes.forEach(n => {
      timeline.push({
        id: n.id,
        type: 'CONSULTATION',
        title: n.isFinalized ? 'Finalized Consultation Note' : 'Draft Consultation Note',
        subtitle: `SOAP Note by Dr. Author`,
        date: n.createdAt,
        details: n.plan,
        color: '#12b886',
      });
    });

    meds.forEach(m => {
      timeline.push({
        id: m.id,
        type: 'MEDICATION',
        title: `Prescription: ${m.medicationDisplay}`,
        subtitle: m.dosageText,
        date: m.authoredOn,
        status: m.status,
        color: '#f59f00',
      });
    });

    conditions.forEach(c => {
      timeline.push({
        id: c.id,
        type: 'DIAGNOSIS',
        title: `Diagnosis: ${c.display}`,
        subtitle: `${c.clinicalStatus} • Code: ${c.code}`,
        date: c.createdAt,
        color: '#ae3ec9',
      });
    });

    // Sort descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(timeline);
  } catch (error) {
    next(error);
  }
});

// 3. Upsert Medical / Obstetric / Social History
router.post('/history/:patientId', authMiddleware, async (req: any, res, next) => {
  try {
    const patientId = req.params.patientId;
    const data = medicalHistorySchema.parse(req.body);

    const history = await prisma.medicalHistory.upsert({
      where: { patientId },
      update: {
        lmp: data.lmp ? new Date(data.lmp) : null,
        edd: data.edd ? new Date(data.edd) : null,
        gravida: data.gravida,
        para: data.para,
        abortions: data.abortions,
        livingChildren: data.livingChildren,
        tobaccoUse: data.tobaccoUse,
        alcoholUse: data.alcoholUse,
        lifestyleNotes: data.lifestyleNotes,
        pastSurgicalNotes: data.pastSurgicalNotes,
        familyHereditaryNotes: data.familyHereditaryNotes,
        reviewedAt: new Date(),
        reviewedBy: req.user.username,
      },
      create: {
        patientId,
        lmp: data.lmp ? new Date(data.lmp) : null,
        edd: data.edd ? new Date(data.edd) : null,
        gravida: data.gravida,
        para: data.para,
        abortions: data.abortions,
        livingChildren: data.livingChildren,
        tobaccoUse: data.tobaccoUse,
        alcoholUse: data.alcoholUse,
        lifestyleNotes: data.lifestyleNotes,
        pastSurgicalNotes: data.pastSurgicalNotes,
        familyHereditaryNotes: data.familyHereditaryNotes,
        reviewedAt: new Date(),
        reviewedBy: req.user.username,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'emr.update_history',
      resourceType: 'MedicalHistory',
      resourceId: history.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
});

// 4. Save Vitals (Calculate NEWS2 & BMI)
router.post('/vitals', authMiddleware, async (req: any, res, next) => {
  try {
    const data = vitalSignsSchema.parse(req.body);

    // Calculate BMI if weight and height provided
    let bmiValue: number | null = null;
    if (data.weight && data.height) {
      bmiValue = parseFloat((data.weight / (data.height * data.height)).toFixed(1));
    }

    // Calculate NEWS2 score
    const newsDetails = calculateNEWS2({
      respRate: data.respRate,
      spo2: data.spo2,
      systolicBp: data.systolicBp,
      heartRate: data.pulse,
      temp: data.temp,
      consciousnessAlert: data.consciousnessAlert,
    });

    // Save observations inside Prisma Transaction
    const obsList = await prisma.$transaction(async (tx) => {
      const createdObs = [];
      const metrics = [
        { code: '8310-5', display: 'Body temperature', valStr: `${data.temp}°C`, valQty: { value: data.temp, unit: 'C' } },
        { code: '8480-6', display: 'Systolic blood pressure', valStr: `${data.systolicBp}mmHg`, valQty: { value: data.systolicBp, unit: 'mmHg' } },
        { code: '8462-4', display: 'Diastolic blood pressure', valStr: `${data.diastolicBp}mmHg`, valQty: { value: data.diastolicBp, unit: 'mmHg' } },
        { code: '8867-4', display: 'Heart rate', valStr: `${data.pulse}bpm`, valQty: { value: data.pulse, unit: 'bpm' } },
        { code: '9279-1', display: 'Respiratory rate', valStr: `${data.respRate} breaths/min`, valQty: { value: data.respRate, unit: 'breaths/min' } },
        { code: '2708-6', display: 'Oxygen saturation', valStr: `${data.spo2}%`, valQty: { value: data.spo2, unit: '%' } },
      ];

      if (data.weight) {
        metrics.push({ code: '29463-7', display: 'Body weight', valStr: `${data.weight}kg`, valQty: { value: data.weight, unit: 'kg' } });
      }
      if (data.height) {
        metrics.push({ code: '8302-2', display: 'Body height', valStr: `${data.height}m`, valQty: { value: data.height, unit: 'm' } });
      }
      if (bmiValue) {
        metrics.push({ code: '39156-5', display: 'Body mass index', valStr: `${bmiValue}`, valQty: { value: bmiValue, unit: 'kg/m2' } });
      }
      if (data.painScore !== null && data.painScore !== undefined) {
        metrics.push({ code: '72514-3', display: 'Pain score', valStr: `${data.painScore}/10`, valQty: { value: data.painScore, unit: 'Score' } });
      }

      for (const m of metrics) {
        const obs = await tx.observation.create({
          data: {
            patientId: data.patientId,
            encounterId: data.encounterId || null,
            status: 'FINAL',
            category: 'vital-signs',
            code: m.code,
            display: m.display,
            valueString: m.valStr,
            valueQuantity: m.valQty,
            effectiveDateTime: new Date(),
          },
        });
        createdObs.push(obs);
      }

      // Add a special observation for NEWS2 score
      await tx.observation.create({
        data: {
          patientId: data.patientId,
          encounterId: data.encounterId || null,
          status: 'FINAL',
          category: 'clinical-score',
          code: 'NEWS2',
          display: 'NEWS2 Early Warning Score',
          valueString: `Score: ${newsDetails.score} (${newsDetails.risk} RISK)`,
          valueQuantity: { value: newsDetails.score, risk: newsDetails.risk, color: newsDetails.color },
          effectiveDateTime: new Date(),
        },
      });

      // Auto-complete active TRIAGE queue ticket for the patient
      await tx.patientQueue.updateMany({
        where: {
          patientId: data.patientId,
          department: 'TRIAGE',
          status: { in: ['WAITING', 'CALLED', 'IN_SERVICE'] },
        },
        data: {
          status: 'COMPLETED',
        },
      });

      return createdObs;
    });

    // Notify clients (like Queue Board) to refresh
    notifyVisitsChange();

    await logAudit({
      userId: req.user.userId,
      action: 'emr.record_vitals',
      resourceType: 'Patient',
      resourceId: data.patientId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { news2Score: newsDetails.score, risk: newsDetails.risk },
    });

    res.status(201).json({
      success: true,
      vitalsCount: obsList.length,
      news2: newsDetails,
    });
  } catch (error) {
    next(error);
  }
});

// 5. Add Allergy
router.post('/allergies', authMiddleware, async (req: any, res, next) => {
  try {
    const data = allergySchema.parse(req.body);

    const allergy = await prisma.allergy.create({
      data: {
        patientId: data.patientId,
        allergen: data.allergen,
        category: data.category,
        status: data.status,
        severity: data.severity,
        reaction: data.reaction,
        onset: data.onset ? new Date(data.onset) : null,
      },
    });

    // Create a corresponding Clinical Alert for high severity allergy
    if (data.severity === 'SEVERE' || data.severity === 'LIFE_THREATENING') {
      await prisma.clinicalAlert.create({
        data: {
          patientId: data.patientId,
          message: `SEVERE ALLERGY ALERT: Patient has a documented ${data.severity.replace(/_/g, ' ')} allergy to ${data.allergen}!`,
          severity: 'CRITICAL',
        },
      });
    }

    await logAudit({
      userId: req.user.userId,
      action: 'emr.add_allergy',
      resourceType: 'Allergy',
      resourceId: allergy.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { allergen: data.allergen, severity: data.severity },
    });

    res.status(201).json({ success: true, allergy });
  } catch (error) {
    next(error);
  }
});

// 6. Consultation Notes (SOAP) Charting & Amendments
router.post('/notes', authMiddleware, async (req: any, res, next) => {
  try {
    const data = noteSchema.parse(req.body);

    // If note ID provided, check draft vs amendment
    if (data.id) {
      const existing = await prisma.consultationNote.findUnique({ where: { id: data.id } });
      if (!existing) return res.status(404).json({ message: 'Note not found' });

      if (existing.isFinalized) {
        // Requires amendment justification workflow
        if (!data.justification) {
          return res.status(400).json({ message: 'Justification is mandatory to amend a finalized note.' });
        }

        const note = await prisma.$transaction(async (tx) => {
          // Log amendment history
          await tx.consultationNoteAmendment.create({
            data: {
              noteId: existing.id,
              amendedBy: req.user.username,
              oldSubjective: existing.subjective,
              oldObjective: existing.objective,
              oldAssessment: existing.assessment,
              oldPlan: existing.plan,
              justification: data.justification || '',
            },
          });

          // Update original note
          return tx.consultationNote.update({
            where: { id: existing.id },
            data: {
              subjective: data.subjective,
              objective: data.objective,
              assessment: data.assessment,
              plan: data.plan,
              signature: `Amended by @${req.user.username} on ${new Date().toLocaleString()}`,
            },
          });
        });

        await logAudit({
          userId: req.user.userId,
          action: 'emr.amend_note',
          resourceType: 'ConsultationNote',
          resourceId: note.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          changes: { justification: data.justification },
        });

        return res.json({ success: true, note });
      } else {
        // Update draft
        const note = await prisma.consultationNote.update({
          where: { id: data.id },
          data: {
            subjective: data.subjective,
            objective: data.objective,
            assessment: data.assessment,
            plan: data.plan,
            isFinalized: data.isFinalized,
            signature: data.isFinalized ? data.signature : null,
            signedAt: data.isFinalized ? new Date() : null,
          },
        });
        if (data.isFinalized && data.encounterId) {
          await prisma.encounter.update({
            where: { id: data.encounterId },
            data: { status: 'FINISHED' }
          });
        }
        return res.json({ success: true, note });
      }
    }

    // Create new note (draft or finalized)
    const note = await prisma.consultationNote.create({
      data: {
        visitId: data.visitId,
        encounterId: data.encounterId,
        patientId: data.patientId,
        authorId: req.user.userId,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        isFinalized: data.isFinalized,
        signature: data.isFinalized ? data.signature : null,
        signedAt: data.isFinalized ? new Date() : null,
      },
    });

    // Auto-Bind Assessment (ICD-10 / SNOMED) to Patient's Active Condition Record
    if (data.assessment && data.patientId) {
      try {
        const diagCode = data.assessment.trim();
        const matchedConcept = await prisma.terminologyConcept.findFirst({
          where: { code: diagCode, system: { in: ['ICD10', 'SNOMED'] } },
        });

        await prisma.condition.create({
          data: {
            patientId: data.patientId,
            encounterId: data.encounterId || null,
            code: diagCode,
            display: matchedConcept?.display || `Diagnosis ${diagCode}`,
            category: 'encounter-diagnosis',
            clinicalStatus: 'ACTIVE',
            verificationStatus: 'CONFIRMED',
            note: `Auto-linked from SOAP Note (${note.id}) by Dr. @${req.user.username}`,
          },
        });
      } catch (condErr) {
        console.error('Condition auto-binding notice:', condErr);
      }
    }

    // Note: SOAP note save preserves active encounter status (IN_PROGRESS) so doctor can write prescriptions & lab orders before completing consultation.
    await logAudit({
      userId: req.user.userId,
      action: data.isFinalized ? 'emr.finalize_note' : 'emr.save_draft_note',
      resourceType: 'ConsultationNote',
      resourceId: note.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, note });
  } catch (error) {
    next(error);
  }
});

// 7. Scanned attachments uploader
router.post('/attachments', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, category, title, fileUrl } = z.object({
      patientId: z.string(),
      category: z.string(),
      title: z.string(),
      fileUrl: z.string(),
    }).parse(req.body);

    const attachment = await prisma.clinicalAttachment.create({
      data: {
        patientId,
        category,
        title,
        fileUrl,
        uploader: req.user.username,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'emr.upload_attachment',
      resourceType: 'ClinicalAttachment',
      resourceId: attachment.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, attachment });
  } catch (error) {
    next(error);
  }
});

// 8. Custom Clinical Alert
router.post('/alerts', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, message, severity } = z.object({
      patientId: z.string(),
      message: z.string().min(3),
      severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
    }).parse(req.body);

    const alert = await prisma.clinicalAlert.create({
      data: { patientId, message, severity },
    });

    res.status(201).json({ success: true, alert });
  } catch (error) {
    next(error);
  }
});

export default router;
