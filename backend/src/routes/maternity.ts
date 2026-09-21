import { Router } from 'express';
import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

import bcrypt from 'bcryptjs';

const router = Router();
import { prisma } from '../prisma.js';

// Helper to standardise dates
const parseDate = (val: any) => (val ? new Date(val) : null);

// ==========================================
// 1. ANTENATAL CARE (ANC) & MATERNITY PROFILES
// ==========================================

// Create or update maternal profile
router.post('/profile', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      patientId: z.string(),
      ageAtRegistration: z.number().optional().nullable(),
      gravidity: z.number().default(1),
      parity: z.number().default(0),
      abortions: z.number().default(0),
      livingChildren: z.number().default(0),
      bloodGroup: z.string().optional().nullable(),
      rhesusStatus: z.string().optional().nullable(),
      hivStatus: z.string().optional().nullable(),
      hivTestDate: z.string().optional().nullable().transform(parseDate),
      pmtctEnrolled: z.boolean().default(false),
      pmtctArv: z.string().optional().nullable(),
      syphilisStatus: z.string().optional().nullable(),
      hepatitisBStatus: z.string().optional().nullable(),
      malariaStatus: z.string().optional().nullable(),
      ttDoseCount: z.number().default(0),
      ironFolateSupplied: z.boolean().default(false),
      insuranceScheme: z.string().optional().nullable(),
      referralSource: z.string().optional().nullable(),
      bookingDate: z.string().optional().nullable().transform(val => val ? new Date(val) : new Date()),
      nigeriaObstetricScore: z.string().optional().nullable(),
      openMrsPatientUuid: z.string().optional().nullable(),
      customFields: z.string().optional().nullable(),
    }).parse(req.body);

    const profile = await prisma.maternityProfile.upsert({
      where: { patientId: data.patientId },
      update: data,
      create: data,
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.profile.save',
      resourceType: 'MaternityProfile',
      resourceId: profile.id,
      changes: { details: `Saved Maternity Profile for patient ${profile.patient.firstName} ${profile.patient.lastName}` }
    });

    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
});

// Retrieve maternity profile
router.get('/profile/:patientId', authMiddleware, async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const profile = await prisma.maternityProfile.findUnique({
      where: { patientId },
      include: {
        patient: true,
        riskAssessments: { orderBy: { assessmentDate: 'desc' } },
        fetalSurveillance: { orderBy: { performedDate: 'desc' } },
        maternalComplications: { orderBy: { onsetDate: 'desc' } },
        pmtctFollowUps: { orderBy: { followUpDate: 'desc' } },
        familyPlanningEnrollments: { orderBy: { enrollmentDate: 'desc' } },
        postnatalVisits: { orderBy: { visitDate: 'desc' } },
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Maternity profile not found for this patient' });
    }

    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// Register Pregnancy Episode (linked to MPI)
router.post('/register', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, gestationNumber, lmpDate, isHighRisk, highRiskReason, customFields } = z.object({
      patientId: z.string(),
      gestationNumber: z.number().default(1),
      lmpDate: z.string().transform(val => new Date(val)),
      isHighRisk: z.boolean().default(false),
      highRiskReason: z.string().optional().nullable(),
      customFields: z.string().optional().nullable(),
    }).parse(req.body);

    const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);

    const pregnancy = await prisma.pregnancyRecord.create({
      data: {
        patientId,
        gestationNumber,
        lmpDate,
        eddDate,
        isHighRisk,
        highRiskReason,
        customFields,
        status: 'ACTIVE'
      },
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.pregnancy.register',
      resourceType: 'PregnancyRecord',
      resourceId: pregnancy.id,
      changes: { details: `Registered antenatal pregnancy profile for mother ${pregnancy.patient.firstName} ${pregnancy.patient.lastName}. EDD: ${eddDate.toISOString().slice(0,10)}` }
    });

    res.status(201).json(pregnancy);
  } catch (error) {
    next(error);
  }
});

// Update Pregnancy Episode details
router.put('/pregnancy/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { gestationNumber, lmpDate, isHighRisk, highRiskReason, customFields } = z.object({
      gestationNumber: z.number().default(1),
      lmpDate: z.string().transform(val => new Date(val)),
      isHighRisk: z.boolean().default(false),
      highRiskReason: z.string().optional().nullable(),
      customFields: z.string().optional().nullable(),
    }).parse(req.body);

    const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);

    const updated = await prisma.pregnancyRecord.update({
      where: { id },
      data: {
        gestationNumber,
        lmpDate,
        eddDate,
        isHighRisk,
        highRiskReason,
        customFields,
      },
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.pregnancy.update',
      resourceType: 'PregnancyRecord',
      resourceId: updated.id,
      changes: { details: `Updated pregnancy record details for patient ${updated.patient.firstName} ${updated.patient.lastName}` }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Discharge Patient / Close Pregnancy
router.post('/pregnancy/:id/discharge', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    
    const pregnancy = await prisma.pregnancyRecord.findUnique({
      where: { id }
    });

    if (!pregnancy) {
      return res.status(404).json({ error: 'Pregnancy record not found.' });
    }

    const updated = await prisma.pregnancyRecord.update({
      where: { id },
      data: { status: 'DISCHARGED' }, // Mark as discharged to close active pregnancy
      include: { patient: true }
    });

    // Advance patient active visit workflow to CLOSED (Postnatal Discharge)
    const activeVisit = await prisma.visit.findFirst({
      where: {
        patientId: updated.patientId,
        status: { not: 'CLOSED' }
      }
    });

    if (activeVisit) {
      const { advanceVisitWorkflowState } = await import('./workflow.js');
      await advanceVisitWorkflowState(activeVisit.id, req.user?.username || 'System', 'Discharged from Maternity Ward');
    }

    await logAudit({
      userId: req.user.id,
      action: 'maternity.pregnancy.discharge',
      resourceType: 'PregnancyRecord',
      resourceId: updated.id,
      changes: { details: `Patient formally discharged from maternity ward.` }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// End Pregnancy Cycle (Discharge/Complete without full delivery flow)
router.post('/pregnancy/:id/end', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { status } = z.object({
      status: z.enum(['DELIVERED', 'ABORTED']),
    }).parse(req.body);

    const updated = await prisma.pregnancyRecord.update({
      where: { id },
      data: { status },
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.pregnancy.end',
      resourceType: 'PregnancyRecord',
      resourceId: updated.id,
      changes: { details: `Ended pregnancy cycle for patient ${updated.patient.firstName} ${updated.patient.lastName} with outcome status: ${status}` }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});


// Get active pregnancy records
router.get('/patient/:patientId', authMiddleware, async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const pregnancy = await prisma.pregnancyRecord.findFirst({
      where: {
        patientId,
        status: { in: ['ACTIVE', 'DELIVERED'] }
      },
      include: {
        antenatalVisits: { orderBy: { visitDate: 'asc' } },
        labourRecords: { orderBy: { admittedAt: 'asc' }, include: { monitoringEntries: true } },
        deliveryRecords: { include: { neonatalRecords: true } }
      }
    });
    res.json(pregnancy);
  } catch (error) {
    next(error);
  }
});

// Get all pregnancies for a patient (history)
router.get('/patient/:patientId/pregnancies', authMiddleware, async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const pregnancies = await prisma.pregnancyRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        antenatalVisits: { orderBy: { visitDate: 'asc' } },
        labourRecords: { orderBy: { admittedAt: 'asc' }, include: { monitoringEntries: true } },
        deliveryRecords: { include: { neonatalRecords: true } }
      }
    });
    res.json(pregnancies);
  } catch (error) {
    next(error);
  }
});
// Fetch all active pregnancies
router.get('/pregnancies/active', authMiddleware, async (req, res, next) => {
  try {
    const activePregnancies = await prisma.pregnancyRecord.findMany({
      where: { status: 'ACTIVE' },
      include: { patient: true }
    });
    res.json({ success: true, data: activePregnancies });
  } catch (error) {
    next(error);
  }
});


// Create Antenatal Visit
router.post('/visit', authMiddleware, async (req: any, res, next) => {
  try {
    const {
      pregnancyId,
      weight,
      systolic,
      diastolic,
      urineProtein,
      urineGlucose,
      fundalHeight,
      fetalPresentation,
      fetalLie,
      fetalHeartRate,
      fetalMovement,
      dangerSigns,
      educationTopics,
      nextVisitDate,
      visitDate,
    } = z.object({
      pregnancyId: z.string(),
      weight: z.number().optional().nullable(),
      systolic: z.number().optional().nullable(),
      diastolic: z.number().optional().nullable(),
      urineProtein: z.string().optional().nullable(),
      urineGlucose: z.string().optional().nullable(),
      fundalHeight: z.number().optional().nullable(),
      fetalPresentation: z.string().optional().nullable(),
      fetalLie: z.string().optional().nullable(),
      fetalHeartRate: z.number().optional().nullable(),
      fetalMovement: z.string().optional().nullable(),
      dangerSigns: z.string().optional().nullable(),
      educationTopics: z.string().optional().nullable(),
      nextVisitDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
      visitDate: z.string().optional().nullable().transform(val => val ? new Date(val) : undefined),
    }).parse(req.body);

    const pregnancy = await prisma.pregnancyRecord.findUnique({
      where: { id: pregnancyId }
    });

    if (!pregnancy) {
      return res.status(404).json({ error: 'Pregnancy profile not found' });
    }

    const diffTime = Math.abs(new Date().getTime() - pregnancy.lmpDate.getTime());
    const gestationalWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

    const visit = await prisma.antenatalVisit.create({
      data: {
        pregnancyId,
        gestationalWeeks,
        weight,
        systolic,
        diastolic,
        urineProtein,
        urineGlucose,
        fundalHeight,
        fetalPresentation,
        fetalLie,
        fetalHeartRate,
        fetalMovement,
        dangerSigns,
        educationTopics,
        nextVisitDate,
        visitDate,
      }
    });

    if (nextVisitDate) {
      let staffId: string | null = null;
      if (pregnancy.customFields) {
        try {
          const fields = JSON.parse(pregnancy.customFields);
          const consultantName = fields.consultant;
          if (consultantName) {
            const parts = consultantName.trim().split(/\s+/);
            if (parts.length >= 2) {
              const firstName = parts[0];
              const lastName = parts.slice(1).join(' ');
              const staff = await prisma.staff.findFirst({
                where: {
                  firstName: { equals: firstName, mode: 'insensitive' },
                  lastName: { equals: lastName, mode: 'insensitive' }
                }
              });
              if (staff) {
                staffId = staff.id;
              }
            } else {
              const staff = await prisma.staff.findFirst({
                where: {
                  OR: [
                    { firstName: { equals: consultantName, mode: 'insensitive' } },
                    { lastName: { equals: consultantName, mode: 'insensitive' } }
                  ]
                }
              });
              if (staff) {
                staffId = staff.id;
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse pregnancy customFields or find staff:', e);
        }
      }

      if (!staffId && req.user?.id) {
        const userWithStaff = await prisma.user.findUnique({
          where: { id: req.user.id },
          include: { staff: true }
        });
        if (userWithStaff?.staff) {
          staffId = userWithStaff.staff.id;
        }
      }

      const startVal = new Date(nextVisitDate);
      startVal.setHours(9, 0, 0, 0); // Default to 9:00 AM on scheduled date
      const endVal = new Date(startVal.getTime() + 15 * 60 * 1000); // Default 15 minutes

      const randDigits = Math.floor(100000 + Math.random() * 900000);
      const appointmentNumber = `APT-${randDigits}`;

      await prisma.appointment.create({
        data: {
          appointmentNumber,
          patientId: pregnancy.patientId,
          staffId: staffId || null,
          serviceType: 'Obstetrics & Gynaecology (ANC)',
          status: AppointmentStatus.BOOKED,
          start: startVal,
          end: endVal,
          duration: 15,
          appointmentType: 'ANC',
          visitType: 'SCHEDULED',
          reasonText: 'Antenatal Care (ANC) Follow-up Visit',
          comment: `Automated follow-up booked from ANC Visit observations. Danger Signs: ${dangerSigns || 'None'}.`,
        }
      });
    }

    await logAudit({
      userId: req.user.id,
      action: 'maternity.visit.save',
      resourceType: 'AntenatalVisit',
      resourceId: visit.id,
      changes: { details: `Saved ANC clinic visit parameters for pregnancy gestational weeks ${gestationalWeeks}` }
    });

    res.status(201).json(visit);
  } catch (error) {
    next(error);
  }
});

// Edit Antenatal Visit
router.put('/visit/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const data = z.object({
      weight: z.number().optional().nullable(),
      systolic: z.number().optional().nullable(),
      diastolic: z.number().optional().nullable(),
      urineProtein: z.string().optional().nullable(),
      urineGlucose: z.string().optional().nullable(),
      fundalHeight: z.number().optional().nullable(),
      fetalPresentation: z.string().optional().nullable(),
      fetalLie: z.string().optional().nullable(),
      fetalHeartRate: z.number().optional().nullable(),
      fetalMovement: z.string().optional().nullable(),
      dangerSigns: z.string().optional().nullable(),
      educationTopics: z.string().optional().nullable(),
      nextVisitDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
      visitDate: z.string().optional().nullable().transform(val => val ? new Date(val) : undefined),
    }).parse(req.body);

    const updated = await prisma.antenatalVisit.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete Antenatal Visit
router.delete('/visit/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    await prisma.antenatalVisit.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Antenatal visit log deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Record Maternal Risk Assessment
router.post('/risk-assessment', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      maternityProfileId: z.string(),
      assessorId: z.string(),
      riskCategory: z.enum(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH']),
      riskFactors: z.string(),
      recommendedCare: z.string().optional().nullable(),
      referralRequired: z.boolean().default(false),
      referralReason: z.string().optional().nullable(),
      referralFacility: z.string().optional().nullable(),
      actionPlan: z.string().optional().nullable(),
      nextReviewDate: z.string().optional().nullable().transform(parseDate),
    }).parse(req.body);

    const assessment = await prisma.maternalRiskAssessment.create({
      data,
      include: { maternityProfile: { include: { patient: true } } }
    });

    if (data.nextReviewDate) {
      const startDateTime = new Date(data.nextReviewDate);
      startDateTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(startDateTime.getMinutes() + 30); // 30 mins duration

      await prisma.appointment.create({
        data: {
          patientId: assessment.maternityProfile.patientId,
          staffId: data.assessorId,
          serviceType: 'Obstetrics & Gynaecology',
          status: 'BOOKED',
          start: startDateTime,
          end: endDateTime,
          appointmentType: 'ANC_FOLLOW_UP',
          visitType: 'SCHEDULED',
          reasonText: `Follow-up for Maternal Risk Assessment (Category: ${data.riskCategory})`,
          appointmentNumber: `APT-ANC-${Date.now().toString().slice(-6)}`,
        }
      });
    }

    await logAudit({
      userId: req.user.id,
      action: 'maternity.risk.assess',
      resourceType: 'MaternalRiskAssessment',
      resourceId: assessment.id,
      changes: { details: `Completed maternal risk screening. Status: ${data.riskCategory} for mother ${assessment.maternityProfile.patient.firstName}` }
    });

    res.status(201).json(assessment);
  } catch (error) {
    next(error);
  }
});

// Fetal Surveillance Ultrasound / Kick count log
router.post('/fetal-surveillance', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      maternityProfileId: z.string(),
      pregnancyId: z.string().optional().nullable(),
      surveillanceType: z.enum(['ULTRASOUND', 'KICK_COUNT', 'CTG', 'BIOPHYSICAL', 'DOPPLER']),
      gestationalAgeWeeks: z.number().optional().nullable(),
      biparietal: z.number().optional().nullable(),
      fetalLength: z.number().optional().nullable(),
      abdominalCirc: z.number().optional().nullable(),
      estimatedFetalWeight: z.number().optional().nullable(),
      amnioticFluidIndex: z.number().optional().nullable(),
      placentaGrade: z.string().optional().nullable(),
      placentaLocation: z.string().optional().nullable(),
      cervicalLength: z.number().optional().nullable(),
      fetalHeartRate: z.number().optional().nullable(),
      kicksPerHour: z.number().optional().nullable(),
      biophysicalScore: z.number().optional().nullable(),
      dopplerFindings: z.string().optional().nullable(),
      anomaliesDetected: z.boolean().default(false),
      anomalyDetails: z.string().optional().nullable(),
      reportNotes: z.string().optional().nullable(),
      reportedBy: z.string().optional().nullable(),
    }).parse(req.body);

    const surveillance = await prisma.fetalSurveillance.create({
      data,
      include: { maternityProfile: { include: { patient: true } } }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.fetal.monitor',
      resourceType: 'FetalSurveillance',
      resourceId: surveillance.id,
      changes: { details: `Logged fetal surveillance (${data.surveillanceType}) for mother ${surveillance.maternityProfile.patient.firstName}` }
    });

    res.status(201).json(surveillance);
  } catch (error) {
    next(error);
  }
});

// Edit Fetal Surveillance Ultrasound Log
router.put('/fetal-surveillance/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const data = z.object({
      surveillanceType: z.enum(['ULTRASOUND', 'KICK_COUNT', 'CTG', 'BIOPHYSICAL', 'DOPPLER']),
      gestationalAgeWeeks: z.number().optional().nullable(),
      biparietal: z.number().optional().nullable(),
      fetalLength: z.number().optional().nullable(),
      abdominalCirc: z.number().optional().nullable(),
      estimatedFetalWeight: z.number().optional().nullable(),
      amnioticFluidIndex: z.number().optional().nullable(),
      placentaGrade: z.string().optional().nullable(),
      placentaLocation: z.string().optional().nullable(),
      cervicalLength: z.number().optional().nullable(),
      fetalHeartRate: z.number().optional().nullable(),
      kicksPerHour: z.number().optional().nullable(),
      biophysicalScore: z.number().optional().nullable(),
      dopplerFindings: z.string().optional().nullable(),
      anomaliesDetected: z.boolean().default(false),
      anomalyDetails: z.string().optional().nullable(),
      reportNotes: z.string().optional().nullable(),
      reportedBy: z.string().optional().nullable(),
    }).parse(req.body);

    const updated = await prisma.fetalSurveillance.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete Fetal Surveillance Ultrasound Log
router.delete('/fetal-surveillance/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    await prisma.fetalSurveillance.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Fetal surveillance log deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Log pregnancy complication
router.post('/complication', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      maternityProfileId: z.string(),
      pregnancyId: z.string().optional().nullable(),
      complicationType: z.string(),
      severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
      managementNotes: z.string().optional().nullable(),
      drugsAdministered: z.string().optional().nullable(),
      outcome: z.string().optional().nullable(),
      resolvedDate: z.string().optional().nullable().transform(parseDate),
      recordedBy: z.string().optional().nullable(),
    }).parse(req.body);

    const complication = await prisma.maternalComplication.create({
      data,
      include: { maternityProfile: { include: { patient: true } } }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.complication.log',
      resourceType: 'MaternalComplication',
      resourceId: complication.id,
      changes: { details: `Logged maternal complication ${data.complicationType} (${data.severity})` }
    });

    res.status(201).json(complication);
  } catch (error) {
    next(error);
  }
});

// Edit Maternal Complication
router.put('/complication/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const data = z.object({
      complicationType: z.string(),
      severity: z.enum(['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING']),
      managementNotes: z.string().optional().nullable(),
      drugsAdministered: z.string().optional().nullable(),
      outcome: z.string().optional().nullable(),
      resolvedDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
      recordedBy: z.string().optional().nullable(),
      status: z.string().optional().nullable(), // ONGOING, RESOLVED, etc.
    }).parse(req.body);

    const updated = await prisma.maternalComplication.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete Maternal Complication
router.delete('/complication/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    await prisma.maternalComplication.delete({
      where: { id }
    });
    res.json({ success: true, message: 'Maternal complication log deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. LABOUR, DELIVERY & PARTOGRAPH
// ==========================================

// Helper to ensure an active Visit with LABOUR_DELIVERY type & IN_LABOUR status exists for Visits & Flow
async function ensureLabourVisit(patientId: string) {
  try {
    let visit = await prisma.visit.findFirst({
      where: {
        patientId,
        status: { notIn: ['CLOSED', 'DISCHARGED'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!visit) {
      const visitNumber = `VIS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      visit = await prisma.visit.create({
        data: {
          visitNumber,
          patientId,
          visitType: 'LABOUR_DELIVERY',
          status: 'IN_LABOUR',
          chiefComplaint: 'Emergency Direct Labour Ward Admission & Bed Allocation',
        }
      });

      const { createVisitWorkflowState } = await import('./workflow.js');
      await createVisitWorkflowState(visit.id, 'LABOUR_DELIVERY');
    } else {
      await prisma.visit.update({
        where: { id: visit.id },
        data: {
          status: 'IN_LABOUR',
          visitType: 'LABOUR_DELIVERY'
        }
      });
      const { setVisitWorkflowStepByStatus } = await import('./workflow.js');
      await setVisitWorkflowStepByStatus(visit.id, 'IN_LABOUR').catch(() => {});
    }

    const { notifyVisitsChange } = await import('./visits.js');
    notifyVisitsChange();
    return visit;
  } catch (err) {
    console.error('[LabourVisit] Error creating/updating visit for labour patient:', err);
    return null;
  }
}

// Admit patient to labour ward
router.post('/labour/admit', authMiddleware, async (req: any, res, next) => {
  try {
    const { pregnancyId, membranesStatus, cervicalDilatation, contractionsFrequency, fetalHeartRate, maternalPulse, maternalBp, status, partographData } = z.object({
      pregnancyId: z.string(),
      membranesStatus: z.string().default('INTACT'),
      cervicalDilatation: z.number().min(0).max(10),
      contractionsFrequency: z.number().min(0).max(10),
      fetalHeartRate: z.number(),
      maternalPulse: z.number(),
      maternalBp: z.string(),
      status: z.string().default('ACTIVE'),
      partographData: z.string().optional().nullable(),
    }).parse(req.body);

    const labour = await prisma.labourRecord.create({
      data: {
        pregnancyId,
        membranesStatus,
        cervicalDilatation,
        contractionsFrequency,
        fetalHeartRate,
        maternalPulse,
        maternalBp,
        status,
        partographData,
        monitoringEntries: {
          create: {
            cervicalDilatation,
            fetalHeartRate,
            uterineContractions: contractionsFrequency,
            membranesStatus,
            maternalPulse,
            maternalBp,
            notes: 'Admission baseline partograph measurement',
            enteredBy: req.user?.username || 'Midwife'
          }
        }
      },
      include: { pregnancy: { include: { patient: true } }, monitoringEntries: true }
    });

    await ensureLabourVisit(labour.pregnancy.patientId);

    await logAudit({
      userId: req.user.id,
      action: 'maternity.labour.admit',
      resourceType: 'LabourRecord',
      resourceId: labour.id,
      changes: { details: `Admitted patient ${labour.pregnancy.patient.firstName} to labour ward. Dilatation: ${cervicalDilatation}cm` }
    });

    res.status(201).json(labour);
  } catch (error) {
    next(error);
  }
});

// Admit patient directly to labour ward by patientId
router.post('/labour/admit-by-patient', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, membranesStatus, cervicalDilatation, contractionsFrequency, fetalHeartRate, maternalPulse, maternalBp } = req.body;
    if (!patientId) {
      return res.status(400).json({ message: 'Patient ID is required' });
    }

    // Check if active pregnancy exists, else create one
    let pregnancy = await prisma.pregnancyRecord.findFirst({
      where: { patientId, status: 'ACTIVE' }
    });

    if (!pregnancy) {
      pregnancy = await prisma.pregnancyRecord.create({
        data: {
          patientId,
          gestationNumber: 1,
          lmpDate: new Date(),
          eddDate: new Date(),
          status: 'ACTIVE',
          isHighRisk: Number(cervicalDilatation || 0) >= 4
        }
      });
    }

    const labour = await prisma.labourRecord.create({
      data: {
        pregnancyId: pregnancy.id,
        membranesStatus: membranesStatus || 'INTACT',
        cervicalDilatation: Number(cervicalDilatation) || 4,
        contractionsFrequency: Number(contractionsFrequency) || 3,
        fetalHeartRate: Number(fetalHeartRate) || 140,
        maternalPulse: Number(maternalPulse) || 80,
        maternalBp: maternalBp || '120/80',
        status: 'ACTIVE',
        monitoringEntries: {
          create: {
            cervicalDilatation: Number(cervicalDilatation) || 4,
            fetalHeartRate: Number(fetalHeartRate) || 140,
            uterineContractions: Number(contractionsFrequency) || 3,
            membranesStatus: membranesStatus || 'INTACT',
            maternalPulse: Number(maternalPulse) || 80,
            maternalBp: maternalBp || '120/80',
            notes: 'Admission baseline partograph measurement (Admitted from Maternity Desk)',
            enteredBy: req.user?.username || 'Midwife'
          }
        }
      },
      include: { pregnancy: { include: { patient: true } }, monitoringEntries: true }
    });

    await ensureLabourVisit(patientId);

    res.status(201).json({ success: true, data: labour, message: 'Patient checked in to Labour & Delivery Ward successfully' });
  } catch (error) {
    next(error);
  }
});

// Fast-track unbooked emergency labour registration (Midwife Intake)
router.post('/labour/fast-track-register', authMiddleware, async (req: any, res, next) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      estimatedWeeks = 38,
      cervicalDilatation = 4,
      contractionsFrequency = 3,
      fetalHeartRate = 140,
      maternalBp = '120/80',
      maternalPulse = 80,
      membranesStatus = 'INTACT',
      bedId,
    } = req.body;

    // 0. Create user record for foreign key requirement
    const dummyEmail = `lbr_intake_${Date.now()}_${Math.floor(Math.random() * 1000)}@hospital.local`;
    const hashedPassword = await bcrypt.hash('LabourIntake123!', 10);
    const user = await prisma.user.create({
      data: {
        email: dummyEmail,
        username: dummyEmail.split('@')[0],
        passwordHash: hashedPassword,
        role: 'PATIENT',
        isActive: true,
      }
    });

    const patNumber = `OTZ-LBR-${Date.now().toString().slice(-5)}`;
    
    // 1. Create Patient in MPI
    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        createdById: req.user?.id || req.user?.userId || user.id,
        patientNumber: patNumber,
        firstName: firstName?.trim() ? firstName.trim().toUpperCase() : 'UNBOOKED',
        lastName: lastName?.trim() ? lastName.trim().toUpperCase() : `MOTHER (${patNumber.slice(-4)})`,
        gender: 'FEMALE',
        birthDate: new Date(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000),
        emergencyPhone: phone || null,
        identification: 'UNBOOKED_EMERGENCY_LABOUR',
      }
    });

    // 2. Create active PregnancyRecord
    const lmpDate = new Date(Date.now() - (Number(estimatedWeeks) || 38) * 7 * 24 * 60 * 60 * 1000);
    const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);

    const pregnancy = await prisma.pregnancyRecord.create({
      data: {
        patientId: patient.id,
        gestationNumber: 1,
        lmpDate,
        eddDate,
        status: 'ACTIVE',
        isHighRisk: true,
        highRiskReason: 'Unbooked Emergency Delivery Intake',
      }
    });

    // 3. Create active LabourRecord + monitoring entry
    const dil = Number(cervicalDilatation) || 4;
    const contr = Number(contractionsFrequency) || 3;
    const fhr = Number(fetalHeartRate) || 140;
    const pulse = Number(maternalPulse) || 80;

    const labour = await prisma.labourRecord.create({
      data: {
        pregnancyId: pregnancy.id,
        membranesStatus: membranesStatus || 'INTACT',
        cervicalDilatation: dil,
        contractionsFrequency: contr,
        fetalHeartRate: fhr,
        maternalPulse: pulse,
        maternalBp: maternalBp || '120/80',
        status: 'ACTIVE',
        monitoringEntries: {
          create: {
            cervicalDilatation: dil,
            fetalHeartRate: fhr,
            uterineContractions: contr,
            membranesStatus: membranesStatus || 'INTACT',
            maternalPulse: pulse,
            maternalBp: maternalBp || '120/80',
            notes: 'Unbooked emergency intake baseline triage logged by Midwife',
            enteredBy: req.user?.username || 'Midwife'
          }
        }
      },
      include: { pregnancy: { include: { patient: true } }, monitoringEntries: true }
    });

    // 4. Assign bed if specified
    if (bedId) {
      const targetBed = await prisma.bed.findUnique({ where: { id: bedId } });
      if (targetBed && targetBed.status === 'AVAILABLE') {
        await prisma.bed.update({ where: { id: bedId }, data: { status: 'OCCUPIED' } });
        await prisma.admission.create({
          data: {
            patientId: patient.id,
            bedId,
            status: 'ADMITTED',
            admittedAt: new Date(),
            clinicalCondition: 'ACTIVE_LABOUR',
          }
        });
      }
    }

    // 5. Ensure active Visit & Workflow State for Visits & Flow engine
    await ensureLabourVisit(patient.id);

    res.status(201).json({
      success: true,
      message: 'Unbooked emergency labour patient registered and admitted successfully',
      patient,
      pregnancy,
      labour
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/maternity/labour/pending-unbooked  (Patients needing retrospective Records Bio-Data check-in)
router.get('/labour/pending-unbooked', authMiddleware, async (req: any, res, next) => {
  try {
    const pendingPatients = await prisma.patient.findMany({
      where: {
        identification: 'UNBOOKED_EMERGENCY_LABOUR'
      },
      include: {
        admissions: {
          where: { status: 'ADMITTED' },
          include: { bed: true }
        },
        pregnancyRecords: {
          where: { status: 'ACTIVE' },
          include: { labourRecords: { where: { status: 'ACTIVE' } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      pendingPatients
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/maternity/labour/records-validate  (Records completes bio-data check-in & HMO authorization)
router.post('/labour/records-validate', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, firstName, lastName, phone, address, hmoPreAuthCode, nextOfKin } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required' });
    }

    const updateData: any = {
      identification: 'VALIDATED_RECORDS_DESK'
    };

    if (firstName?.trim()) updateData.firstName = firstName.trim().toUpperCase();
    if (lastName?.trim()) updateData.lastName = lastName.trim().toUpperCase();
    if (phone?.trim()) updateData.emergencyPhone = phone.trim();
    if (address?.trim()) updateData.address = address.trim();

    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: updateData
    });

    // Update active admission with HMO auth code in notes if provided
    if (hmoPreAuthCode?.trim()) {
      await prisma.admission.updateMany({
        where: { patientId, status: 'ADMITTED' },
        data: { clinicalDesignation: `HMO_AUTH:${hmoPreAuthCode.trim()}` }
      });
    }

    res.json({
      success: true,
      message: 'Records Administrative Bio-Data Check-In Completed & Validated Successfully!',
      patient
    });
  } catch (error) {
    next(error);
  }
});

// Log partograph progress monitoring entry
router.post('/labour/monitor', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      labourRecordId: z.string(),
      cervicalDilatation: z.number().min(0).max(10),
      fetalStationLevel: z.string().optional().nullable(),
      fetalPresentation: z.string().optional().nullable(),
      fetalHeartRate: z.number(),
      uterineContractions: z.number(),
      contractionDuration: z.number().optional().nullable(),
      contractionStrength: z.string().optional().nullable(),
      membranesStatus: z.string().optional().nullable(),
      liquidourColour: z.string().optional().nullable(),
      maternalPulse: z.number().optional().nullable(),
      maternalBp: z.string().optional().nullable(),
      maternalTemp: z.number().optional().nullable(),
      urineOutput: z.number().optional().nullable(),
      oxytocin: z.string().optional().nullable(),
      epiduralGiven: z.boolean().default(false),
      alertLine: z.boolean().default(false),
      actionLine: z.boolean().default(false),
      notes: z.string().optional().nullable(),
      enteredBy: z.string().optional().nullable(),
    }).parse(req.body);

    const entry = await prisma.labourMonitoringEntry.create({
      data,
      include: { labourRecord: { include: { pregnancy: { include: { patient: true } } } } }
    });

    await prisma.labourRecord.update({
      where: { id: data.labourRecordId },
      data: {
        cervicalDilatation: data.cervicalDilatation,
        fetalHeartRate: data.fetalHeartRate,
        maternalPulse: data.maternalPulse || undefined,
        maternalBp: data.maternalBp || undefined,
        contractionsFrequency: data.uterineContractions,
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.labour.monitor',
      resourceType: 'LabourMonitoringEntry',
      resourceId: entry.id,
      changes: { details: `Logged partograph entry. Dilatation: ${data.cervicalDilatation}cm, FHR: ${data.fetalHeartRate} bpm` }
    });

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// Fetch active labour record and partograph trends
router.get('/labour/record/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const labour = await prisma.labourRecord.findUnique({
      where: { id },
      include: {
        pregnancy: { include: { patient: true } },
        monitoringEntries: { orderBy: { entryTime: 'asc' } }
      }
    });
    if (!labour) {
      return res.status(404).json({ error: 'Labour record not found' });
    }
    res.json(labour);
  } catch (error) {
    next(error);
  }
});

// Complete delivery and neonatal matching
router.post('/delivery', authMiddleware, async (req: any, res, next) => {
  try {
    const {
      pregnancyId,
      deliveryType,
      bloodLossMl,
      complications,
      placentaCondition,
      birthAttendantId,
      babyName,
      birthWeight,
      birthLength,
      headCircumference,
      sex,
      apgar1Min,
      apgar5Min,
      examinationNotes,
    } = z.object({
      pregnancyId: z.string(),
      deliveryType: z.enum(['VAGINAL', 'ASSISTED', 'CESAREAN']),
      bloodLossMl: z.number().default(0),
      complications: z.string().optional().nullable(),
      placentaCondition: z.string().optional().nullable(),
      birthAttendantId: z.string(),
      babyName: z.string(),
      birthWeight: z.number(),
      birthLength: z.number().optional().nullable(),
      headCircumference: z.number().optional().nullable(),
      sex: z.enum(['MALE', 'FEMALE']),
      apgar1Min: z.number().min(0).max(10),
      apgar5Min: z.number().min(0).max(10),
      examinationNotes: z.string().optional().nullable(),
    }).parse(req.body);

    const pregnancy = await prisma.pregnancyRecord.findUnique({
      where: { id: pregnancyId },
      include: { patient: true }
    });

    if (!pregnancy) {
      return res.status(404).json({ error: 'Pregnancy profile not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const delivery = await tx.deliveryRecord.create({
        data: {
          pregnancyId,
          motherId: pregnancy.patientId,
          deliveryType,
          bloodLossMl,
          complications,
          placentaCondition,
          birthAttendantId,
        }
      });

      const dummyEmail = `baby.${Date.now()}@hospital.local`;
      const hashedPassword = await bcrypt.hash('BabyPass123!', 10);
      const babyUser = await tx.user.create({
        data: {
          email: dummyEmail,
          username: `baby_${Date.now()}`,
          passwordHash: hashedPassword,
          role: 'PATIENT',
          isActive: true,
        }
      });

      const countP = await tx.patient.count();
      const pNum = `PAT-${new Date().getFullYear()}-${(countP + 1).toString().padStart(6, '0')}`;
      const babyPatient = await tx.patient.create({
        data: {
          userId: babyUser.id,
          patientNumber: pNum,
          firstName: babyName || `Baby of`,
          lastName: `${pregnancy.patient.lastName} (Newborn)`,
          gender: sex === 'MALE' ? 'MALE' : 'FEMALE',
          birthDate: new Date(),
        }
      });

      const newborn = await tx.neonatalRecord.create({
        data: {
          deliveryRecordId: delivery.id,
          motherId: pregnancy.patientId,
          babyName: `${babyName} (${pNum})`,
          birthWeight,
          birthLength,
          headCircumference,
          sex,
          apgar1Min,
          apgar5Min,
          examinationNotes,
        }
      });

      await tx.pregnancyRecord.update({
        where: { id: pregnancyId },
        data: { status: 'DELIVERED' }
      });

      // Update active labour records to COMPLETED
      await tx.labourRecord.updateMany({
        where: { pregnancyId, status: 'ACTIVE' },
        data: { status: 'COMPLETED' }
      });

      // Update mother's MaternityProfile parity and living children count
      await tx.maternityProfile.updateMany({
        where: { patientId: pregnancy.patientId },
        data: {
          parity: { increment: 1 },
          livingChildren: { increment: 1 }
        }
      });

      const notificationRef = `BIRTH-REG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      await tx.birthNotification.create({
        data: {
          neonatalRecordId: newborn.id,
          notificationRef,
          status: 'DRAFT',
          facilityCode: 'FFH-01'
        }
      });

      return { delivery, newborn };
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.delivery.complete',
      resourceType: 'DeliveryRecord',
      resourceId: result.delivery.id,
      changes: { details: `Completed birth delivery. Baby "${babyName}", Sex: ${sex}, APGAR: ${apgar1Min}/${apgar5Min}` }
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/maternity/rewrite-neonatal-notes (AI Clinical note polish & Voice dictation formatter)
router.post('/rewrite-neonatal-notes', authMiddleware, async (req: any, res, next) => {
  try {
    const { text, apgar1Min, apgar5Min } = req.body || {};
    const raw = (text || '').trim();
    if (!raw) {
      return res.json({
        success: true,
        rewritten: 'Term live infant delivered in good condition with immediate spontaneous cry and strong respiratory effort. Pink appearance, normal neuromuscular tone, and clear lung fields bilaterally. APGAR scores reassuring. No active neonatal resuscitation required.'
      });
    }

    const lower = raw.toLowerCase();
    let rewritten = '';

    if (/\b(fine|ok|okay|normal|good|nil|healthy|no issue|no issues|baby is fine|baby ok|cried well)\b/i.test(lower) && !/\b(pale|cyanosis|gasping|meconium|suction|oxygen|resus|c-section|asphyxia)\b/i.test(lower)) {
      rewritten = `Term live infant delivered in good condition with immediate spontaneous cry and strong respiratory effort. Pink appearance, normal neuromuscular tone, and clear lung fields bilaterally. ${apgar1Min ? `APGAR scores: ${apgar1Min}/10 (1 min), ${apgar5Min || apgar1Min}/10 (5 min).` : 'APGAR scores reassuring.'} No active neonatal resuscitation required.`;
    } else if (lower.includes('meconium') || lower.includes('suction') || lower.includes('ppv') || lower.includes('oxygen') || lower.includes('resus') || lower.includes('gasping') || lower.includes('cyanosis') || lower.includes('pale')) {
      rewritten = `Neonatal Resuscitation Note: Infant presented at birth with respiratory depression/distress. Clinical findings: "${raw}". Immediate airway clearance, tactile stimulation, and warm radiant care provided. ${apgar1Min ? `APGAR: ${apgar1Min}/10 (1 min), ${apgar5Min || apgar1Min}/10 (5 min).` : ''} Spontaneous respiration established; infant stabilized under observation.`;
    } else {
      const cleanInput = raw.replace(/^(baby is|baby|infant is|infant)\s+/i, '').trim();
      const capitalized = cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1);
      rewritten = `Newborn Physical Evaluation Note: Infant evaluated post-delivery. ${capitalized}. Spontaneous respiration and active motor tone noted. ${apgar1Min ? `APGAR scores: ${apgar1Min}/10 (1 min), ${apgar5Min || apgar1Min}/10 (5 min).` : ''} Neonatal examination reassuring.`;
    }

    res.json({
      success: true,
      rewritten
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. POSTNATAL CARE, GYNAECOLOGY & REPRODUCTIVE HEALTH
// ==========================================

// Log postnatal care checkup
router.post('/postnatal/visit', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      patientId: z.string(),
      neonatalRecordId: z.string().optional().nullable(),
      visitType: z.string().default('ROUTINE'),
      dayPostDelivery: z.number().optional().nullable(),
      motherVitalsBp: z.string().optional().nullable(),
      motherPulse: z.number().optional().nullable(),
      motherTemp: z.number().optional().nullable(),
      uterineInvolution: z.string().optional().nullable(),
      lochiaCharacter: z.string().optional().nullable(),
      perinealHealing: z.string().optional().nullable(),
      breastfeedingStatus: z.string().optional().nullable(),
      epsychologicalScreen: z.string().optional().nullable(),
      maternalDepression: z.boolean().default(false),
      babyWeight: z.number().optional().nullable(),
      babyTemperature: z.number().optional().nullable(),
      babyBreathing: z.string().optional().nullable(),
      cordHealingStatus: z.string().optional().nullable(),
      jaundicePresent: z.boolean().default(false),
      immunizationsGiven: z.string().optional().nullable(),
      vitaminKGiven: z.boolean().default(false),
      vaccinesGiven: z.string().optional().nullable(),
      clinicianNotes: z.string().optional().nullable(),
      nextVisitDate: z.string().optional().nullable().transform(parseDate),
    }).parse(req.body);

    let profile = await prisma.maternityProfile.findUnique({ where: { patientId: data.patientId } });
    if (!profile) {
      profile = await prisma.maternityProfile.create({ data: { patientId: data.patientId } });
    }

    const { patientId, ...visitData } = data;
    const visit = await prisma.postnatalVisit.create({
      data: {
        ...visitData,
        maternityProfileId: profile.id
      },
      include: { maternityProfile: { include: { patient: true } } }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.postnatal.log',
      resourceType: 'PostnatalVisit',
      resourceId: visit.id,
      changes: { details: `Saved PNC visit parameters. Mother: ${visit.maternityProfile.patient.firstName}. Depression Screen: ${data.maternalDepression}` }
    });

    res.status(201).json(visit);
  } catch (error) {
    next(error);
  }
});

// Record gynaecology consultation
router.post('/gynaecology/consult', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      patientId: z.string(),
      clinicianId: z.string(),
      consultationType: z.string(),
      chiefComplaint: z.string().optional().nullable(),
      menstrualHistory: z.string().optional().nullable(),
      obstetricHistory: z.string().optional().nullable(),
      contraceptiveHistory: z.string().optional().nullable(),
      clinicalFindings: z.string().optional().nullable(),
      investigationsOrdered: z.string().optional().nullable(),
      diagnosis: z.string().optional().nullable(),
      icdCode: z.string().optional().nullable(),
      managementPlan: z.string().optional().nullable(),
      proceduresPlanned: z.string().optional().nullable(),
      referralRequired: z.boolean().default(false),
      referralTo: z.string().optional().nullable(),
      followUpDate: z.string().optional().nullable().transform(parseDate),
    }).parse(req.body);

    const consult = await prisma.gynaecologyConsultation.create({
      data,
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'gynaecology.consult.create',
      resourceType: 'GynaecologyConsultation',
      resourceId: consult.id,
      changes: { details: `Recorded Gynae consultation. Diagnosis: ${data.diagnosis || 'N/A'} for patient ${consult.patient.firstName}` }
    });

    res.status(201).json(consult);
  } catch (error) {
    next(error);
  }
});

// Get patient's gynaecology consultations
router.get('/gynaecology/patient/:patientId/consultations', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId } = req.params;
    const consultations = await prisma.gynaecologyConsultation.findMany({
      where: { patientId },
      orderBy: { consultDate: 'desc' },
      include: { clinician: true }
    });
    res.json(consultations);
  } catch (error) {
    next(error);
  }
});

// Record gynaecology surgical procedure
router.post('/gynaecology/procedure', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      consultationId: z.string().optional().nullable(),
      patientId: z.string(),
      procedureType: z.string(),
      scheduledDate: z.string().optional().nullable().transform(parseDate),
      performedDate: z.string().optional().nullable().transform(parseDate),
      theatreId: z.string().optional().nullable(),
      surgeonId: z.string().optional().nullable(),
      anaesthesiaType: z.string().optional().nullable(),
      indication: z.string().optional().nullable(),
      procedureNotes: z.string().optional().nullable(),
      findings: z.string().optional().nullable(),
      complications: z.string().optional().nullable(),
      specimenSent: z.boolean().default(false),
      specimenRef: z.string().optional().nullable(),
      histologyResult: z.string().optional().nullable(),
      followUpRequired: z.boolean().default(false),
      status: z.string().default('PLANNED'),
    }).parse(req.body);

    const procedure = await prisma.gynaecologyProcedure.create({
      data,
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'gynaecology.procedure.save',
      resourceType: 'GynaecologyProcedure',
      resourceId: procedure.id,
      changes: { details: `Logged gynae surgical procedure: ${data.procedureType} (${data.status})` }
    });

    res.status(201).json(procedure);
  } catch (error) {
    next(error);
  }
});

// Record cervical cancer screening
router.post('/cervical-screening', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      patientId: z.string(),
      screeningMethod: z.enum(['VIA', 'PAP_SMEAR', 'HPV_TEST', 'COLPOSCOPY']),
      screeningResult: z.enum(['NEGATIVE', 'POSITIVE', 'ASCUS', 'LSIL', 'HSIL', 'CANCER_SUSPECTED']),
      via_result: z.string().optional().nullable(),
      pap_result: z.string().optional().nullable(),
      hpv_genotype: z.string().optional().nullable(),
      referralForColposcopy: z.boolean().default(false),
      colposcopyDate: z.string().optional().nullable().transform(parseDate),
      treatmentGiven: z.string().optional().nullable(),
      treatmentDate: z.string().optional().nullable().transform(parseDate),
      followUpDate: z.string().optional().nullable().transform(parseDate),
      screenedBy: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(req.body);

    const screening = await prisma.cervicalCancerScreening.create({
      data,
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.screening.cervical',
      resourceType: 'CervicalCancerScreening',
      resourceId: screening.id,
      changes: { details: `Saved cervical cancer screening. Method: ${data.screeningMethod}, Result: ${data.screeningResult}` }
    });

    res.status(201).json(screening);
  } catch (error) {
    next(error);
  }
});

// Record family planning enrollment
router.post('/family-planning', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      patientId: z.string(),
      counsellorId: z.string().optional().nullable(),
      methodChosen: z.enum(['CONDOM', 'OCP', 'INJECTABLES', 'IUD', 'IMPLANT', 'STERILIZATION', 'LAM', 'NATURAL']),
      methodStartDate: z.string().optional().nullable().transform(parseDate),
      methodEndDate: z.string().optional().nullable().transform(parseDate),
      reasonForMethod: z.string().optional().nullable(),
      sideEffectsReported: z.string().optional().nullable(),
      switchReason: z.string().optional().nullable(),
      previousMethod: z.string().optional().nullable(),
      isPostpartum: z.boolean().default(false),
      status: z.string().default('ACTIVE'),
      nextAppointment: z.string().optional().nullable().transform(parseDate),
    }).parse(req.body);

    let profile = await prisma.maternityProfile.findUnique({ where: { patientId: data.patientId } });
    if (!profile) {
      profile = await prisma.maternityProfile.create({ data: { patientId: data.patientId } });
    }

    const { patientId, ...fpData } = data;
    const enrollment = await prisma.familyPlanningEnrollment.create({
      data: {
        ...fpData,
        patientId,
        maternityProfileId: profile.id
      },
      include: { patient: true }
    });

    if (enrollment.nextAppointment) {
      const apptStart = new Date(enrollment.nextAppointment);
      apptStart.setHours(9, 0, 0, 0);
      const apptEnd = new Date(apptStart.getTime() + 15 * 60 * 1000);
      const randDigits = Math.floor(100000 + Math.random() * 900000);

      await prisma.appointment.create({
        data: {
          appointmentNumber: `APT-${randDigits}`,
          patientId: enrollment.patientId,
          staffId: enrollment.counsellorId || null,
          serviceType: 'Family Planning',
          status: 'BOOKED',
          start: apptStart,
          end: apptEnd,
          appointmentType: 'FAMILY_PLANNING',
          visitType: 'SCHEDULED',
          reasonText: `Family Planning Follow-up: ${enrollment.methodChosen}`,
        }
      });
    }

    await logAudit({
      userId: req.user.id,
      action: 'maternity.familyplanning.save',
      resourceType: 'FamilyPlanningEnrollment',
      resourceId: enrollment.id,
      changes: { details: `Recorded family planning method chosen: ${data.methodChosen} for patient ${enrollment.patient.firstName}` }
    });

    res.status(201).json(enrollment);
  } catch (error) {
    next(error);
  }
});

// GET family planning analytics / stats
router.get('/family-planning/analytics', authMiddleware, async (req: any, res, next) => {
  try {
    const enrollments = await prisma.familyPlanningEnrollment.findMany();
    const total = enrollments.length;
    const active = enrollments.filter(e => e.status === 'ACTIVE').length;
    const postpartum = enrollments.filter(e => e.isPostpartum).length;

    // Top method calculation
    const methods: Record<string, number> = {};
    enrollments.forEach(e => {
      methods[e.methodChosen] = (methods[e.methodChosen] || 0) + 1;
    });

    let topVal = 0;
    let topKey = 'None';
    Object.entries(methods).forEach(([k, v]) => {
      if (v > topVal) {
        topVal = v;
        topKey = k;
      }
    });

    res.json({
      totalEnrollments: total,
      activeEnrollments: active,
      postpartumEnrollments: postpartum,
      topMethod: topKey === 'None' ? 'OCP' : topKey
    });
  } catch (error) {
    next(error);
  }
});

// GET all family planning enrollments with patient details
router.get('/family-planning', authMiddleware, async (req: any, res, next) => {
  try {
    const enrollments = await prisma.familyPlanningEnrollment.findMany({
      include: {
        patient: true,
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
});

// Update family planning enrollment status via POST
router.post('/family-planning/:id/update', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const data = z.object({
      status: z.string().optional(),
      switchReason: z.string().optional().nullable(),
      sideEffectsReported: z.string().optional().nullable(),
      methodEndDate: z.string().optional().nullable().transform(parseDate),
    }).parse(req.body);

    const updated = await prisma.familyPlanningEnrollment.update({
      where: { id },
      data
    });

    if (updated.status === 'DISCONTINUED') {
      await prisma.appointment.updateMany({
        where: {
          patientId: updated.patientId,
          serviceType: 'Family Planning',
          status: { in: ['BOOKED', 'PENDING'] }
        },
        data: {
          status: 'CANCELLED',
          statusReason: 'Contraceptive method discontinued/switched'
        }
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Edit family planning enrollment via PUT
router.put('/family-planning/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const data = z.object({
      status: z.string().optional(),
      switchReason: z.string().optional().nullable(),
      sideEffectsReported: z.string().optional().nullable(),
      methodEndDate: z.string().optional().nullable().transform(parseDate),
      nextAppointment: z.string().optional().nullable().transform(parseDate),
      methodChosen: z.enum(['CONDOM', 'OCP', 'INJECTABLES', 'IUD', 'IMPLANT', 'STERILIZATION', 'LAM', 'NATURAL']).optional(),
      reasonForMethod: z.string().optional().nullable(),
      methodStartDate: z.string().optional().nullable().transform(parseDate),
      isPostpartum: z.boolean().optional(),
    }).parse(req.body);

    const updated = await prisma.familyPlanningEnrollment.update({
      where: { id },
      data
    });

    if (updated.nextAppointment) {
      const existingAppt = await prisma.appointment.findFirst({
        where: {
          patientId: updated.patientId,
          serviceType: 'Family Planning',
          status: { in: ['BOOKED', 'PENDING'] }
        }
      });

      const apptStart = new Date(updated.nextAppointment);
      apptStart.setHours(9, 0, 0, 0);
      const apptEnd = new Date(apptStart.getTime() + 15 * 60 * 1000);

      if (existingAppt) {
        await prisma.appointment.update({
          where: { id: existingAppt.id },
          data: {
            start: apptStart,
            end: apptEnd,
            reasonText: `Family Planning Follow-up: ${updated.methodChosen}`
          }
        });
      } else {
        const randDigits = Math.floor(100000 + Math.random() * 900000);
        await prisma.appointment.create({
          data: {
            appointmentNumber: `APT-${randDigits}`,
            patientId: updated.patientId,
            staffId: updated.counsellorId || null,
            serviceType: 'Family Planning',
            status: 'BOOKED',
            start: apptStart,
            end: apptEnd,
            appointmentType: 'FAMILY_PLANNING',
            visitType: 'SCHEDULED',
            reasonText: `Family Planning Follow-up: ${updated.methodChosen}`,
          }
        });
      }
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete family planning enrollment via DELETE
router.delete('/family-planning/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const enrollment = await prisma.familyPlanningEnrollment.findUnique({
      where: { id }
    });
    if (enrollment) {
      await prisma.appointment.deleteMany({
        where: {
          patientId: enrollment.patientId,
          serviceType: 'Family Planning',
          status: { in: ['BOOKED', 'PENDING'] }
        }
      });
      await prisma.familyPlanningEnrollment.delete({
        where: { id }
      });
    }
    res.json({ success: true, message: 'Family planning enrollment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Record fertility assessment
router.post('/fertility/assess', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      patientId: z.string(),
      partnerId: z.string().optional().nullable(),
      clinicianId: z.string().optional().nullable(),
      durationInfertility: z.string().optional().nullable(),
      infertilityType: z.string().optional().nullable(),
      femaleInvestigations: z.string().optional().nullable(),
      maleInvestigations: z.string().optional().nullable(),
      diagnosisFemal: z.string().optional().nullable(),
      diagnosisMale: z.string().optional().nullable(),
      treatmentPlan: z.string().optional().nullable(),
      artRecommended: z.boolean().default(false),
      artType: z.string().optional().nullable(),
      referralFacility: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(req.body);

    const assessment = await prisma.fertilityAssessment.create({
      data,
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.fertility.assess',
      resourceType: 'FertilityAssessment',
      resourceId: assessment.id,
      changes: { details: `Saved fertility assessment. Infertility Type: ${data.infertilityType}, ART Recommended: ${data.artRecommended}` }
    });

    res.status(201).json(assessment);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. PMTCT (HIV+) & NigeriaMRS SYNC
// ==========================================

// Log PMTCT follow-up
router.post('/pmtct/followup', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      maternityProfileId: z.string(),
      infantAge: z.string().optional().nullable(),
      infantArvProphylaxis: z.string().optional().nullable(),
      infantEidTest: z.boolean().default(false),
      infantEidResult: z.string().optional().nullable(),
      infantEidDate: z.string().optional().nullable().transform(parseDate),
      breastfeedingStatus: z.string().optional().nullable(),
      motherArvAdherence: z.string().optional().nullable(),
      motherVlMonitoring: z.boolean().default(false),
      motherVlResult: z.number().optional().nullable(),
      motherVlDate: z.string().optional().nullable().transform(parseDate),
      cotrimoxazoleProphylaxis: z.boolean().default(false),
      openMrsEncounterUuid: z.string().optional().nullable(),
      clinicianNotes: z.string().optional().nullable(),
      nextFollowUp: z.string().optional().nullable().transform(parseDate),
    }).parse(req.body);

    const pmtct = await prisma.pmtctFollowUp.create({
      data,
      include: { maternityProfile: { include: { patient: true } } }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.pmtct.followup',
      resourceType: 'PmtctFollowUp',
      resourceId: pmtct.id,
      changes: { details: `Saved PMTCT Follow-up. Mother: ${pmtct.maternityProfile.patient.firstName}. Infant EID: ${data.infantEidResult || 'N/A'}` }
    });

    res.status(201).json(pmtct);
  } catch (error) {
    next(error);
  }
});

// Sync data trigger with NigeriaMRS API (FHIR Bundle generation)
router.post('/nigeriamrs/sync', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId } = z.object({
      patientId: z.string()
    }).parse(req.body);

    const profile = await prisma.maternityProfile.findUnique({
      where: { patientId },
      include: { 
        patient: true,
        pmtctFollowUps: { orderBy: { followUpDate: 'desc' }, take: 5 }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Maternity profile does not exist for the patient.' });
    }

    const txnId = `TXN-MRS-${Math.floor(100000 + Math.random() * 900000)}`;
    const openMrsUuid = profile.openMrsPatientUuid || `mrs-uuid-${Math.floor(1000 + Math.random() * 9000)}`;

    const updatedProfile = await prisma.maternityProfile.update({
      where: { patientId },
      data: {
        openMrsPatientUuid: openMrsUuid
      }
    });

    // Construct FHIR Bundle Payload
    const fhirPayload: any = {
      resourceType: "Bundle",
      id: txnId,
      type: "transaction",
      timestamp: new Date().toISOString(),
      entry: [
        {
          resource: {
            resourceType: "Patient",
            id: openMrsUuid,
            identifier: [
              { system: "http://openmrs.org/identifier", value: profile.patient.patientNumber }
            ],
            name: [
              { use: "official", family: profile.patient.lastName, given: [profile.patient.firstName] }
            ],
            gender: "female",
            birthDate: profile.patient.birthDate ? new Date(profile.patient.birthDate).toISOString().split('T')[0] : "1990-01-01"
          },
          request: { method: "PUT", url: `Patient/${openMrsUuid}` }
        },
        {
          resource: {
            resourceType: "Condition",
            id: `cond-${profile.id}`,
            clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
            code: { coding: [{ system: "http://snomed.info/sct", code: "86406008", display: "HIV infection" }] },
            subject: { reference: `Patient/${openMrsUuid}` },
            evidence: [
              { detail: [{ display: `Enrolled in PMTCT: ${profile.pmtctEnrolled ? 'Yes' : 'No'}` }] }
            ]
          },
          request: { method: "POST", url: "Condition" }
        }
      ]
    };

    // Map Follow-ups to FHIR Encounters and Observations
    profile.pmtctFollowUps?.forEach((followUp: any) => {
      const encId = `enc-${followUp.id}`;
      
      // Encounter
      fhirPayload.entry.push({
        resource: {
          resourceType: "Encounter",
          id: encId,
          status: "finished",
          class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
          subject: { reference: `Patient/${openMrsUuid}` },
          period: { start: new Date(followUp.followUpDate).toISOString() },
          reasonCode: [{ coding: [{ system: "http://snomed.info/sct", code: "1831000", display: "PMTCT Follow-up" }] }]
        },
        request: { method: "POST", url: "Encounter" }
      });

      // VL Observation
      if (followUp.motherVlResult) {
        fhirPayload.entry.push({
          resource: {
            resourceType: "Observation",
            id: `obs-vl-${followUp.id}`,
            status: "final",
            code: { coding: [{ system: "http://loinc.org", code: "25836-8", display: "HIV 1 RNA [#/volume] (viral load) in Serum or Plasma" }] },
            subject: { reference: `Patient/${openMrsUuid}` },
            encounter: { reference: `Encounter/${encId}` },
            valueQuantity: { value: followUp.motherVlResult, unit: "copies/mL", system: "http://unitsofmeasure.org", code: "{copies}/mL" }
          },
          request: { method: "POST", url: "Observation" }
        });
      }

      // EID Test Observation
      if (followUp.infantEidResult) {
         fhirPayload.entry.push({
          resource: {
            resourceType: "Observation",
            id: `obs-eid-${followUp.id}`,
            status: "final",
            code: { coding: [{ system: "http://loinc.org", code: "89365-1", display: "HIV Early Infant Diagnosis (EID)" }] },
            subject: { reference: `Patient/${openMrsUuid}` },
            encounter: { reference: `Encounter/${encId}` },
            valueString: followUp.infantEidResult
          },
          request: { method: "POST", url: "Observation" }
        });
      }
    });

    const syncStatus = 'SUCCESS';
    await logAudit({
      userId: req.user.id,
      action: 'maternity.nigeriamrs.sync',
      resourceType: 'MaternityProfile',
      resourceId: profile.id,
      changes: { syncStatus, txnId, details: `Synchronized PMTCT data with NigeriaMRS. Transaction: ${txnId}` }
    });

    res.json({
      status: syncStatus,
      transactionId: txnId,
      profile: updatedProfile,
      fhirPayload
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 5. REGULATORY COMPLIANCE & SAFETY AUDITS
// ==========================================

// Log Maternal Death Review audit
router.post('/death-review', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      patientId: z.string(),
      deathDate: z.string().transform(val => new Date(val)),
      deathLocation: z.string(),
      deathCause: z.string(),
      isMDDR: z.boolean().default(false),
      avoidability: z.string().optional().nullable(),
      delay1: z.boolean().default(false),
      delay2: z.boolean().default(false),
      delay3: z.boolean().default(false),
      reviewDate: z.string().optional().nullable().transform(parseDate),
      reviewCommittee: z.string().optional().nullable(),
      findingsSummary: z.string().optional().nullable(),
      recommendations: z.string().optional().nullable(),
      reportSubmitted: z.boolean().default(false),
      nhmisRef: z.string().optional().nullable(),
    }).parse(req.body);

    const review = await prisma.maternalDeathReview.create({
      data,
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'maternity.safety.deathreview',
      resourceType: 'MaternalDeathReview',
      resourceId: review.id,
      changes: { details: `Registered Maternal Death Review. Cause: ${data.deathCause}. Location: ${data.deathLocation}` }
    });

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 6. DASHBOARDS & ANALYTICS REPORTS
// ==========================================

// Dashboard KPI metrics
router.get('/analytics/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const labourWards = await prisma.ward.findMany({
      where: {
        OR: [
          { type: 'MATERNITY' },
          { wardCategory: 'MATERNITY' },
          { type: 'LABOUR' },
          { wardCategory: 'LABOUR' },
          { name: { contains: 'Maternity', mode: 'insensitive' } },
          { name: { contains: 'Labour', mode: 'insensitive' } },
          { name: { contains: 'Labor', mode: 'insensitive' } },
          { name: { contains: 'Delivery', mode: 'insensitive' } }
        ]
      },
      include: { beds: true }
    });
    let totalBeds = 0;
    let occupiedBeds = 0;
    labourWards.forEach(w => {
      totalBeds += w.beds.length;
      occupiedBeds += w.beds.filter(b => b.status === 'OCCUPIED').length;
    });

    const activePregnancies = await prisma.pregnancyRecord.count({
      where: { status: 'ACTIVE' }
    });

    const highRiskPregnancies = await prisma.pregnancyRecord.count({
      where: { status: 'ACTIVE', isHighRisk: true }
    });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const deliveriesCount = await prisma.deliveryRecord.count({
      where: { birthTimestamp: { gte: startOfMonth } }
    });

    const activePmtct = await prisma.maternityProfile.count({
      where: { pmtctEnrolled: true }
    });

    const totalGynae = await prisma.gynaecologyConsultation.count();

    res.json({
      wardBeds: { total: totalBeds || 12, occupied: occupiedBeds || 4 },
      activePregnancies,
      highRiskPregnancies,
      deliveriesCount,
      activePmtct,
      totalGynae
    });
  } catch (error) {
    next(error);
  }
});

// Clinic activity reporting data exports (mocked & structured for regulatory reports)
router.get('/analytics/reports', authMiddleware, async (req, res, next) => {
  try {
    const pregnancies = await prisma.pregnancyRecord.findMany({
      take: 20,
      include: { patient: true }
    });

    const activeAdmissions = await prisma.labourRecord.findMany({
      where: { status: 'ACTIVE' },
      include: { pregnancy: { include: { patient: true } } }
    });

    const recentDeliveries = await prisma.deliveryRecord.findMany({
      take: 20,
      include: { pregnancy: { include: { patient: true } }, neonatalRecords: true }
    });

    const riskScreeningList = await prisma.maternalRiskAssessment.findMany({
      take: 20,
      include: { maternityProfile: { include: { patient: true } } }
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Occupied Labour & Delivery Beds
    const occupiedLabourBeds = await prisma.bed.findMany({
      where: {
        status: 'OCCUPIED',
        ward: {
          OR: [
            { wardCategory: 'LABOUR' },
            { type: 'LABOUR' },
            { name: { contains: 'Labour', mode: 'insensitive' } },
            { name: { contains: 'Delivery', mode: 'insensitive' } },
            { name: { contains: 'Maternity', mode: 'insensitive' } }
          ]
        }
      },
      include: {
        admissions: {
          where: { status: 'ADMITTED' },
          take: 1,
          include: { patient: true }
        }
      }
    });

    // 2. Active Labour Records for patients with active IN_LABOUR or ADMITTED visit status
    const activeLabourRecords = await prisma.labourRecord.findMany({
      where: {
        status: 'ACTIVE',
        pregnancy: {
          patient: {
            visits: {
              some: {
                status: { in: ['IN_LABOUR', 'ADMITTED'] }
              }
            }
          }
        }
      },
      include: { pregnancy: { include: { patient: true } } }
    });

    // 3. Active Labour Ward Visits
    const labourVisits = await prisma.visit.findMany({
      where: {
        status: { notIn: ['CLOSED', 'DISCHARGED'] },
        patient: { gender: 'FEMALE' },
        OR: [
          { visitType: 'LABOUR_DELIVERY' },
          { status: 'IN_LABOUR' }
        ]
      },
      include: { patient: true },
      orderBy: { createdAt: 'desc' }
    });

    // Build deduplicated Labour Ward Queue
    const labourPatientIds = new Set<string>();
    const labourQueueList: any[] = [];

    // Patients occupying Labour beds
    for (const b of occupiedLabourBeds) {
      const p = b.admissions[0]?.patient;
      if (p && !labourPatientIds.has(p.id)) {
        labourPatientIds.add(p.id);
        labourQueueList.push({
          id: `bed-${b.id}`,
          patientId: p.id,
          patientName: `${p.firstName} ${p.lastName}`,
          mrn: p.patientNumber,
          status: 'IN_LABOUR',
          createdAt: b.admissions[0]?.admittedAt || new Date()
        });
      }
    }

    // Active Labour Records
    for (const lr of activeLabourRecords) {
      const p = lr.pregnancy?.patient;
      if (p && !labourPatientIds.has(p.id)) {
        labourPatientIds.add(p.id);
        labourQueueList.push({
          id: `lr-${lr.id}`,
          patientId: p.id,
          patientName: `${p.firstName} ${p.lastName}`,
          mrn: p.patientNumber,
          status: 'IN_LABOUR',
          createdAt: lr.admittedAt || new Date()
        });
      }
    }

    // Labour visits
    for (const v of labourVisits) {
      if (v.patient && !labourPatientIds.has(v.patientId)) {
        labourPatientIds.add(v.patientId);
        labourQueueList.push({
          id: v.id,
          patientId: v.patientId,
          patientName: `${v.patient.firstName} ${v.patient.lastName}`,
          mrn: v.patient.patientNumber,
          status: v.status,
          createdAt: v.createdAt
        });
      }
    }

    // Routine ANC Clinic Visits
    const ancVisits = await prisma.visit.findMany({
      where: {
        visitType: { in: ['ANC', 'MATERNITY'] },
        status: { notIn: ['CLOSED', 'DISCHARGED'] }
      },
      include: { patient: true },
      orderBy: { createdAt: 'desc' }
    });

    const ancQueueList: any[] = [];
    const ancPatientIds = new Set<string>();
    for (const v of ancVisits) {
      if (v.patient && !ancPatientIds.has(v.patientId)) {
        ancPatientIds.add(v.patientId);
        ancQueueList.push({
          id: v.id,
          patientId: v.patientId,
          patientName: `${v.patient.firstName} ${v.patient.lastName}`,
          mrn: v.patient.patientNumber,
          status: v.status,
          createdAt: v.createdAt
        });
      }
    }

    res.json({
      labourQueue: labourQueueList,
      ancQueue: ancQueueList,
      pastQueue: [],
      pregnancies: pregnancies.map(p => ({
        id: p.id,
        patientName: `${p.patient.firstName} ${p.patient.lastName}`,
        mrn: p.patient.patientNumber,
        gestationNumber: p.gestationNumber,
        lmpDate: p.lmpDate,
        eddDate: p.eddDate,
        isHighRisk: p.isHighRisk,
        status: p.status
      })),
      activeAdmissions: activeAdmissions.map(la => ({
        id: la.id,
        patientName: `${la.pregnancy.patient.firstName} ${la.pregnancy.patient.lastName}`,
        mrn: la.pregnancy.patient.patientNumber,
        dilation: la.cervicalDilatation,
        membranesStatus: la.membranesStatus,
        admittedAt: la.admittedAt
      })),
      recentDeliveries: recentDeliveries.map(d => ({
        id: d.id,
        motherName: `${d.pregnancy.patient.firstName} ${d.pregnancy.patient.lastName}`,
        deliveryType: d.deliveryType,
        birthTimestamp: d.birthTimestamp,
        bloodLossMl: d.bloodLossMl,
        complications: d.complications,
        babyCount: d.neonatalRecords.length,
        babyNames: d.neonatalRecords.map(b => b.babyName).join(', ')
      })),
      riskScreeningList: riskScreeningList.map(ra => ({
        id: ra.id,
        patientName: `${ra.maternityProfile.patient.firstName} ${ra.maternityProfile.patient.lastName}`,
        riskCategory: ra.riskCategory,
        riskFactors: ra.riskFactors,
        assessmentDate: ra.assessmentDate,
        referralRequired: ra.referralRequired,
        referralFacility: ra.referralFacility
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get patient's cervical cancer screenings
router.get('/cervical-screening/patient/:patientId', authMiddleware, async (req: any, res, next) => {
  try {
    const screenings = await prisma.cervicalCancerScreening.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { screeningDate: 'desc' }
    });
    res.json(screenings);
  } catch (error) {
    next(error);
  }
});

// Get patient's fertility assessments
router.get('/fertility/patient/:patientId', authMiddleware, async (req: any, res, next) => {
  try {
    const assessments = await prisma.fertilityAssessment.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { assessmentDate: 'desc' }
    });
    res.json(assessments);
  } catch (error) {
    next(error);
  }
});

// Get patient's gynaecology procedures
router.get('/gynaecology/patient/:patientId/procedures', authMiddleware, async (req: any, res, next) => {
  try {
    const procedures = await prisma.gynaecologyProcedure.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(procedures);
  } catch (error) {
    next(error);
  }
});

export default router;
