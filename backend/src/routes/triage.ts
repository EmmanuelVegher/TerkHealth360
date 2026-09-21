import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';
import { calculateNEWS2 } from '../utils/news2.js';
import { autoAdvanceVisitToStatus } from './workflow.js';

const router = Router();
import { prisma } from '../prisma.js';

// Get clinical reference thresholds for vitals
const REF_RANGES = {
  systolic: { min: 90, max: 140 },
  diastolic: { min: 60, max: 90 },
  temperature: { min: 36.1, max: 37.2 },
  pulseRate: { min: 60, max: 100 },
  spo2: { min: 95, max: 100 },
  respiratoryRate: { min: 12, max: 20 }
};

// 1. Record Outpatient/Emergency Triage
router.post('/save', authMiddleware, async (req: any, res, next) => {
  try {
    const {
      patientId,
      triageType,
      systolic,
      diastolic,
      temperature,
      pulseRate,
      respiratoryRate,
      spo2,
      weight,
      height,
      presentingComplaints,
      painScore,
      consciousnessLevel,
      mobility,
      hydration,
      nutrition,
      priority,
      createdById,
    } = z.object({
      patientId: z.string(),
      triageType: z.enum(['OUTPATIENT', 'EMERGENCY', 'INPATIENT', 'MATERNITY', 'ANC', 'LABOUR_DELIVERY', 'PAEDIATRIC']).optional().default('OUTPATIENT'),
      systolic: z.number(),
      diastolic: z.number(),
      temperature: z.number(),
      pulseRate: z.number(),
      respiratoryRate: z.number(),
      spo2: z.number(),
      weight: z.number().optional().nullable(),
      height: z.number().optional().nullable(),
      presentingComplaints: z.string().min(3, 'Presenting complaints must be documented'),
      painScore: z.number().min(0).max(10).default(0),
      consciousnessLevel: z.enum(['ALERT', 'VOICE', 'PAIN', 'UNRESPONSIVE']).default('ALERT'),
      mobility: z.string().optional().nullable(),
      hydration: z.string().optional().nullable(),
      nutrition: z.string().optional().nullable(),
      priority: z.enum(['IMMEDIATE', 'VERY_URGENT', 'URGENT', 'STANDARD', 'NON_URGENT']).default('STANDARD'),
      createdById: z.string(),
    }).parse(req.body);

    // Business Rules: Calculate BMI if height and weight entered
    let bmi: number | null = null;
    if (height && weight && height > 0) {
      // height is in cm, weight in kg
      const heightInMeters = height / 100;
      bmi = parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(2));
    }

    // Early Warning Score NEWS2 calculation
    const news2 = calculateNEWS2({
      respRate: respiratoryRate,
      spo2,
      systolicBp: systolic,
      heartRate: pulseRate,
      temp: temperature,
      consciousnessAlert: consciousnessLevel === 'ALERT'
    });

    // Check for idempotent duplicate triage submission within 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const recentDuplicate = await prisma.triageRecord.findFirst({
      where: {
        patientId,
        systolic,
        diastolic,
        temperature,
        pulseRate,
        createdAt: { gte: thirtySecondsAgo }
      },
      include: { patient: true }
    });

    if (recentDuplicate) {
      console.log(`[Triage] Deduplicated duplicate triage submission for patient ${patientId}`);
      return res.json({ success: true, triage: recentDuplicate, news2: { score: recentDuplicate.news2Score } });
    }

    // Create the Triage Record
    const triage = await prisma.triageRecord.create({
      data: {
        patientId,
        triageType,
        systolic,
        diastolic,
        temperature,
        pulseRate,
        respiratoryRate,
        spo2,
        weight,
        height,
        bmi,
        presentingComplaints,
        painScore,
        consciousnessLevel,
        mobility,
        hydration,
        nutrition,
        priority,
        news2Score: news2.score,
        news2Risk: news2.risk,
        createdById,
        triageStart: new Date(),
        triageEnd: new Date(),
      },
      include: { patient: true }
    });

    // Also add to EMR Observation table for longitudinal graphs compatibility
    await prisma.observation.create({
      data: {
        patientId,
        category: 'vital-signs',
        code: 'VITAL_SIGNS_PANEL',
        display: `Triage: BP ${systolic}/${diastolic}, Temp ${temperature}, Pulse ${pulseRate}, SpO2 ${spo2}. NEWS2: ${news2.score}`,
        valueString: `${systolic}/${diastolic}|${temperature}|${pulseRate}|${spo2}|${respiratoryRate}`,
        effectiveDateTime: new Date(),
      }
    });

    // Workflow Integration (FR-NUR-086): Update patient's queue status to "Ready for Consultation"
    await prisma.patientQueue.updateMany({
      where: {
        patientId,
        status: 'WAITING',
      },
      data: {
        status: 'WAITING', // keep in queue but tag priority or metadata if needed
      }
    });

    // Find the active checked-in/triage visit for the patient
    const activeVisit = await prisma.visit.findFirst({
      where: {
        patientId,
        status: { in: ['REGISTERED', 'CHECKED_IN', 'WAITING_TRIAGE', 'IN_TRIAGE'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (activeVisit) {
      // Pass presentingComplaints down to Visit, Encounter, and Queue for Doctor OPD Desk
      if (presentingComplaints) {
        await prisma.visit.update({
          where: { id: activeVisit.id },
          data: { chiefComplaint: presentingComplaints }
        }).catch(() => {});

        await prisma.encounter.updateMany({
          where: { visitId: activeVisit.id },
          data: { diagnosis: { presentingComplaints } }
        }).catch(() => {});
      }

      // Dynamically auto-advance the visit workflow to the next step
      const state = await prisma.visitWorkflowState.findUnique({ where: { visitId: activeVisit.id } });
      if (state) {
        const template = await prisma.workflowTemplate.findUnique({
          where: { id: state.templateId },
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        });
        if (template) {
          const currentStepIndex = template.steps.findIndex((s: any) => s.stepOrder === state.currentStepOrder);
          if (currentStepIndex !== -1 && currentStepIndex + 1 < template.steps.length) {
            let nextStep = template.steps[currentStepIndex + 1];
            if (nextStep.statusCode === 'PAYMENT_CONFIRMED' && currentStepIndex + 2 < template.steps.length) {
              nextStep = template.steps[currentStepIndex + 2];
            }
            // Completing triage means advancing past IN_TRIAGE to WAITING_CONSULTATION / WAITING_DOCTOR
            if (nextStep.statusCode === 'IN_TRIAGE' || activeVisit.status === 'WAITING_TRIAGE' || activeVisit.status === 'IN_TRIAGE') {
              const consultStep = template.steps.find((s: any) => s.statusCode === 'WAITING_CONSULTATION' || s.statusCode === 'IN_CONSULTATION');
              if (consultStep) {
                nextStep = consultStep;
              }
            }
            await autoAdvanceVisitToStatus(activeVisit.id, nextStep.statusCode, req.user.username || 'System Nurse');
          }
        }
      } else {
        const targetStatus = activeVisit.visitType === 'EMERGENCY' ? 'IN_CONSULTATION' : 'WAITING_CONSULTATION';
        await autoAdvanceVisitToStatus(activeVisit.id, targetStatus, req.user.username || 'System Nurse');
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'triage.create',
      resourceType: 'TriageRecord',
      resourceId: triage.id,
      changes: { details: `Completed triage assessment for patient ${triage.patient.firstName} ${triage.patient.lastName}. NEWS2: ${news2.score} (${news2.risk})` }
    });

    // Validate vital observations against normal limits (FR-NUR-076)
    const alerts: string[] = [];
    if (systolic < REF_RANGES.systolic.min || systolic > REF_RANGES.systolic.max) {
      alerts.push(`Systolic blood pressure of ${systolic} mmHg is outside reference limits.`);
    }
    if (temperature < REF_RANGES.temperature.min || temperature > REF_RANGES.temperature.max) {
      alerts.push(`Body temperature of ${temperature}°C is abnormal.`);
    }
    if (spo2 < REF_RANGES.spo2.min) {
      alerts.push(`Oxygen saturation SpO2 of ${spo2}% is low!`);
    }

    res.status(201).json({
      triage,
      news2,
      alerts,
    });
  } catch (error) {
    next(error);
  }
});

// 2. Fetch vitals history for trends
router.get('/history/:patientId', authMiddleware, async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const history = await prisma.triageRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// 3. Priority escalations overrides
router.post('/priority-override', authMiddleware, async (req: any, res, next) => {
  try {
    const { triageId, newPriority, reason } = z.object({
      triageId: z.string(),
      newPriority: z.enum(['IMMEDIATE', 'VERY_URGENT', 'URGENT', 'STANDARD', 'NON_URGENT']),
      reason: z.string().min(5, 'Override reason is too short'),
    }).parse(req.body);

    const triage = await prisma.triageRecord.update({
      where: { id: triageId },
      data: { priority: newPriority },
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'triage.priority.override',
      resourceType: 'TriageRecord',
      resourceId: triageId,
      changes: { newPriority, reason, details: `Overrode triage priority to ${newPriority} for patient ${triage.patient.firstName} ${triage.patient.lastName}. Reason: ${reason}` }
    });

    res.json({ success: true, triage });
  } catch (error) {
    next(error);
  }
});

export default router;
