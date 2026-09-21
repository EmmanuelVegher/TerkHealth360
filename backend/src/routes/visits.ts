import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';
import { createVisitWorkflowState, autoAdvanceVisitToStatus } from './workflow.js';

const router = Router();
import { prisma } from '../prisma.js';

let clients: any[] = [];

export function notifyVisitsChange() {
  clients.forEach(c => {
    try {
      c.write('data: update\n\n');
    } catch (e) {
      // client disconnected
    }
  });
}

router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

const createVisitSchema = z.object({
  patientId: z.string(),
  visitType: z.enum(['OUTPATIENT', 'EMERGENCY', 'ANC', 'MATERNITY', 'LAB_ONLY', 'RADIOLOGY_ONLY', 'PHYSIO', 'INPATIENT', 'LABOUR_DELIVERY', 'PAEDIATRIC']),
  consultationServiceId: z.string().optional().nullable(),
  chiefComplaint: z.string().optional().nullable(),
  priority: z.number().optional().nullable(),
  priorityReason: z.string().optional().nullable(),
});

const admitSchema = z.object({
  bedId: z.string(),
  admittingStaffId: z.string().optional(),
});

const dischargeSchema = z.object({
  reason: z.string().min(3),
});

const referSchema = z.object({
  patientId: z.string(),
  referringStaffId: z.string(),
  type: z.enum(['INTERNAL', 'EXTERNAL']),
  receivingDept: z.string().optional().nullable(),
  receivingHospital: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// List wards and beds status
router.get('/wards', authMiddleware, async (req, res, next) => {
  try {
    let Wards = await prisma.ward.findMany({
      include: {
        beds: true,
      },
    });

    if (Wards.length === 0) {
      const defaultWards = [
        { name: 'Paediatric Ward', wardCategory: 'PAEDIATRIC', type: 'PAEDIATRIC', capacity: 10, description: 'Pediatric Inpatient & Children Care Ward', color: '#9c27b0' },
        { name: 'General Ward', wardCategory: 'GENERAL', type: 'GENERAL', capacity: 12, description: 'General Medical & Surgical Inpatient Ward', color: '#3f51b5' },
        { name: 'Maternity Ward', wardCategory: 'MATERNITY', type: 'MATERNITY', capacity: 8, description: 'Antenatal, Labor & Postnatal Mother Care', color: '#e91e63' },
        { name: 'Surgical Ward', wardCategory: 'SURGICAL', type: 'SURGICAL', capacity: 8, description: 'Post-Operative Surgical Recovery Ward', color: '#00bcd4' },
        { name: 'Emergency Ward', wardCategory: 'EMERGENCY', type: 'EMERGENCY', capacity: 6, description: 'Accident & Emergency Acute Stabilization Ward', color: '#ff9800' },
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

      Wards = await prisma.ward.findMany({
        include: { beds: true },
      });
    }

    res.json(Wards);
  } catch (error) {
    next(error);
  }
});

// List all visits
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { status, type, page = '1', limit = '50' } = req.query;
    
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 50;
    const skip = (p - 1) * l;

    const where: any = {};
    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status as string[] };
      } else {
        where.status = status as string;
      }
    }
    if (type) where.visitType = type as string;

    const [visits, total] = await prisma.$transaction([
      prisma.visit.findMany({
        where,
        include: {
          patient: {
            include: { telecoms: true },
          },
          encounters: {
            include: { staff: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
      }),
      prisma.visit.count({ where }),
    ]);

    // Auto-heal visits stuck in AWAITING_PAYMENT when no unpaid invoices exist for the patient
    const awaitingVisits = visits.filter(v => v.status === 'AWAITING_PAYMENT');
    if (awaitingVisits.length > 0) {
      for (const v of awaitingVisits) {
        const unpaidCount = await prisma.invoice.count({
          where: {
            patientId: v.patientId,
            status: { in: ['ISSUED', 'UNPAID', 'PARTIAL'] }
          }
        });
        if (unpaidCount === 0) {
          console.log(`[Visits] Auto-advancing visit ${v.id} from AWAITING_PAYMENT to WAITING_CONSULTATION`);
          v.status = 'WAITING_CONSULTATION';
          await autoAdvanceVisitToStatus(v.id, 'WAITING_CONSULTATION', 'System (Auto-Heal)').catch(() => {});
        }
      }
    }

    res.json({
      data: visits,
      pagination: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create Visit check-in
router.post('/', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, visitType, consultationServiceId, chiefComplaint, priority, priorityReason } = createVisitSchema.parse(req.body);

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Generate unique Visit number
    const count = await prisma.visit.count();
    const visitNum = `VIS-${new Date().getFullYear()}-${(count + 1).toString().padStart(6, '0')}`;

    let finalVisitType = visitType;
    let isResidentDoctor = false;

    if (consultationServiceId) {
      const svc = await prisma.consultationService.findUnique({ where: { id: consultationServiceId } });
      if (svc && svc.code === 'OPD-RESIDENT') {
        isResidentDoctor = true;
      }
    }

    if (isResidentDoctor) {
      const localTime = new Date();
      const hour = localTime.getHours();
      const day = localTime.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = day === 0 || day === 6;
      const isNightTime = hour >= 18 || hour < 8;

      if (isWeekend || isNightTime) {
        finalVisitType = 'EMERGENCY';
      }
    }

    const visit = await prisma.visit.create({
      data: {
        visitNumber: visitNum,
        patientId,
        visitType: finalVisitType,
        status: 'REGISTERED',
        chiefComplaint: chiefComplaint || null,
        consultationServiceId: consultationServiceId || null,
        createdBy: req.user.username,
      },
    });

    // Auto-create workflow state based on visit type
    await createVisitWorkflowState(visit.id, finalVisitType);

    // Sync triage priority and priorityReason to queue ticket
    if (priority !== undefined && priority !== null) {
      await prisma.patientQueue.updateMany({
        where: { visitId: visit.id },
        data: {
          priority: Number(priority),
          priorityReason: priorityReason || chiefComplaint || null,
        }
      });
    }

    // Consultation Service Billing Integration
    let servicePrice = 0;
    let selectedSvc: any = null;
    let serviceName = 'General Outpatient Consultation';
    let serviceCode = 'OPD-GENERAL';

    if (consultationServiceId) {
      selectedSvc = await prisma.consultationService.findUnique({ where: { id: consultationServiceId } });
      if (selectedSvc) {
        servicePrice = Number(selectedSvc.price);
        serviceName = selectedSvc.name;
        serviceCode = selectedSvc.code;
      }
    }

    // Default billing for check-ins with billing gates if no specific service selected
    if (servicePrice === 0) {
      if (finalVisitType === 'LABOUR_DELIVERY') {
        servicePrice = 5000;
        serviceName = 'Labour & Delivery Check-in Fee';
        serviceCode = 'LABOUR_DELIVERY';
      } else if (finalVisitType === 'ANC') {
        servicePrice = 2500;
        serviceName = 'ANC Check-in Fee';
        serviceCode = 'ANC-VISIT';
      } else if (finalVisitType === 'MATERNITY') {
        servicePrice = 5000;
        serviceName = 'Maternity Admission Deposit';
        serviceCode = 'MATERNITY';
      } else if (finalVisitType === 'INPATIENT') {
        servicePrice = 5000;
        serviceName = 'Inpatient Admission Deposit';
        serviceCode = 'INPATIENT';
      } else if (finalVisitType === 'PAEDIATRIC') {
        servicePrice = 3200;
        serviceName = 'Paediatrician Consultation Fee';
        serviceCode = 'PAED-CONSULT';
      } else if (finalVisitType === 'OUTPATIENT') {
        servicePrice = 1500;
        serviceName = 'General Consultation Fee';
        serviceCode = 'OPD-GENERAL';
      }
    }

    if (servicePrice > 0) {
      let activeCoverage: any = null;
      let patientPortion = servicePrice;
      let insurancePortion = 0;

      activeCoverage = await prisma.patientInsurancePolicy.findFirst({
        where: { patientId, isActive: true },
        include: { plan: true },
      });

      if (activeCoverage && selectedSvc) {
        const benefitItem = await prisma.insuranceBenefitCatalogItem.findFirst({
          where: {
            planId: activeCoverage.planId,
            serviceCode: selectedSvc.code,
          },
        });
        if (benefitItem) {
          if (benefitItem.coverageType === 'FULL') {
            patientPortion = 0;
            insurancePortion = servicePrice;
          } else if (benefitItem.coverageType === 'PARTIAL') {
            const pct = Number(benefitItem.coveragePct || 0) / 100;
            insurancePortion = servicePrice * pct;
            patientPortion = servicePrice - insurancePortion;
          } else if (benefitItem.coverageType === 'EXCLUDED') {
            patientPortion = servicePrice;
            insurancePortion = 0;
          }
        }
      }

      // Create database Invoice
      const dbInvoice = await prisma.invoice.create({
        data: {
          patientId,
          status: finalVisitType === 'EMERGENCY' ? 'PAID' : 'ISSUED',
          total: servicePrice,
          amountPaid: finalVisitType === 'EMERGENCY' ? servicePrice : 0,
          reasonText: `Consultation fee: ${serviceName}`,
        },
      });

      // Synchronize into billing.ts in-memory list
      try {
        const { invoices } = await import('./billing.js');
        const invoiceNo = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
        invoices.unshift({
          id: dbInvoice.id,
          invoiceNo,
          patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          visitId: visit.id,
          items: [
            {
              chargeCode: serviceCode,
              name: serviceName,
              category: 'Consultation',
              quantity: 1,
              unitPrice: servicePrice,
              vat: 0,
            },
          ],
          subtotal: servicePrice,
          vatTotal: 0,
          discountAmount: 0,
          totalAmount: servicePrice,
          patientAmount: patientPortion,
          donorAmount: 0,
          fundingSource: activeCoverage ? 'HMO' : 'SELF_PAY',
          payerId: activeCoverage?.planId || null,
          status: finalVisitType === 'EMERGENCY' ? 'PAID' : 'ISSUED',
          amountPaid: finalVisitType === 'EMERGENCY' ? servicePrice : 0,
          outstanding: finalVisitType === 'EMERGENCY' ? 0 : servicePrice,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error('[Visits Checkin] In-memory billing push failed:', e);
      }
    }

    // Auto-advance workflow dynamically based on template and servicePrice
    if (finalVisitType === 'EMERGENCY') {
      await autoAdvanceVisitToStatus(visit.id, 'IN_TRIAGE', 'System');
    } else {
      const state = await prisma.visitWorkflowState.findUnique({ where: { visitId: visit.id } });
      if (state) {
        const template = await prisma.workflowTemplate.findUnique({
          where: { id: state.templateId },
          include: { steps: { orderBy: { stepOrder: 'asc' } } },
        });
        if (template && template.steps.length > 1) {
          let targetStep;
          if (servicePrice > 0) {
            // If payment required, stop at the first billing gate (or just the next step)
            targetStep = template.steps.find((s: any) => s.stepOrder > 1 && s.isBillingGate) || template.steps[1];
          } else {
            // If no payment required, skip the billing gate and go to the first clinical step
            targetStep = template.steps.find((s: any) => s.stepOrder > 1 && !s.isBillingGate) || template.steps[1];
          }
          if (targetStep) {
            await autoAdvanceVisitToStatus(visit.id, targetStep.statusCode, 'System');
          }
        }
      }
    }

    // Auto-create EmergencyArrival for Emergency visits
    if (finalVisitType === 'EMERGENCY') {
      const eCount = await prisma.emergencyArrival.count();
      await prisma.emergencyArrival.create({
        data: {
          arrivalCode: `ED-ARR-${new Date().getFullYear()}-${(eCount + 1).toString().padStart(6, '0')}`,
          patientId,
          arrivalMethod: 'WALK_IN',
          presentingComplaint: chiefComplaint || 'Emergency visit',
          status: 'ARRIVED',
        },
      });
    }

    // Auto-create MaternityProfile for Maternity/ANC/Labour & Delivery visits if it doesn't exist
    if (finalVisitType === 'MATERNITY' || finalVisitType === 'ANC' || finalVisitType === 'LABOUR_DELIVERY') {
      const existingProfile = await prisma.maternityProfile.findUnique({
        where: { patientId },
      });
      if (!existingProfile) {
        await prisma.maternityProfile.create({
          data: {
            patientId,
          },
        });
      }

      // Auto-create active pregnancy record for LABOUR_DELIVERY or MATERNITY if none exists
      if (finalVisitType === 'LABOUR_DELIVERY' || finalVisitType === 'MATERNITY') {
        const activePreg = await prisma.pregnancyRecord.findFirst({
          where: { patientId, status: 'ACTIVE' },
        });
        if (!activePreg) {
          const lmpDate = new Date(Date.now() - 280 * 24 * 60 * 60 * 1000);
          const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000);
          await prisma.pregnancyRecord.create({
            data: {
              patientId,
              gestationNumber: 1,
              lmpDate,
              eddDate,
              isHighRisk: true,
              highRiskReason: 'Emergency Check-in / Unbooked Delivery',
              status: 'ACTIVE'
            }
          });
        }
      }
    }

    // Automatically create an active 'Consultation' type encounter inside the visit for the OPD clinic desk
    await prisma.encounter.create({
      data: {
        visitId: visit.id,
        patientId,
        type: 'Consultation',
        status: 'IN_PROGRESS',
        start: new Date(),
        serviceType: finalVisitType || 'AMBULATORY',
        reasonText: chiefComplaint || 'General Ambulatory Consultation',
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'visit.checkin',
      resourceType: 'Visit',
      resourceId: visit.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { visitNumber: visitNum, patientId, visitType: finalVisitType },
    });

    res.status(201).json({ success: true, visit });
  } catch (error) {
    next(error);
  }
});

// Create Triage or Doctor Encounter inside Visit
router.post('/:id/encounters', authMiddleware, async (req: any, res, next) => {
  try {
    const { type, staffId, serviceType, notes } = z.object({
      type: z.string(),
      staffId: z.string().optional().nullable(),
      serviceType: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).parse(req.body);

    const visitId = req.params.id;
    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    const encounter = await prisma.encounter.create({
      data: {
        visitId,
        patientId: visit.patientId,
        staffId: staffId || null,
        type,
        status: 'IN_PROGRESS',
        start: new Date(),
        serviceType: serviceType || type.toUpperCase(),
        reasonText: notes,
      },
    });

    // Update visit status to In Progress
    await prisma.visit.update({
      where: { id: visitId },
      data: { status: 'In Progress' },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'encounter.create',
      resourceType: 'Encounter',
      resourceId: encounter.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { type, visitId },
    });

    res.status(201).json({ success: true, encounter });
  } catch (error) {
    next(error);
  }
});

// Doctor Order Inpatient Admission
router.post('/:id/order-admission', authMiddleware, async (req: any, res, next) => {
  try {
    const rawId = req.params.id;
    const { targetWardCategory = 'GENERAL', urgency = 'ROUTINE', admissionDiagnosis, notes } = req.body;

    let visit: any = await prisma.visit.findUnique({ where: { id: rawId }, include: { patient: true } });

    if (!visit) {
      // Self-healing lookup: If rawId is an Encounter ID, find its Visit or create one
      const encounter = await prisma.encounter.findUnique({
        where: { id: rawId },
        include: { visit: { include: { patient: true } }, patient: true },
      });

      if (encounter) {
        if (encounter.visit) {
          visit = encounter.visit;
        } else if (encounter.patientId) {
          const existingVisit = await prisma.visit.findFirst({
            where: { patientId: encounter.patientId, status: { not: 'DISCHARGED' } },
            include: { patient: true },
            orderBy: { createdAt: 'desc' },
          });

          if (existingVisit) {
            visit = existingVisit;
          } else {
            visit = await prisma.visit.create({
              data: {
                visitNumber: `VIS-${Date.now()}`,
                patientId: encounter.patientId,
                visitType: 'INPATIENT',
                status: 'ORDERED_ADMISSION',
              },
              include: { patient: true },
            });
          }

          // Link encounter to visit
          await prisma.encounter.update({
            where: { id: encounter.id },
            data: { visitId: visit.id },
          });
        }
      }
    }

    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    const visitId = visit.id;

    const updatedVisit = await prisma.$transaction(async (tx) => {
      const v = await tx.visit.update({
        where: { id: visitId },
        data: {
          status: 'ORDERED_ADMISSION',
        },
      });

      // Update Workflow State
      const wf = await tx.visitWorkflowState.findUnique({ where: { visitId } });
      if (wf) {
        await tx.visitWorkflowState.update({
          where: { visitId },
          data: {
            currentStatus: 'ORDERED_ADMISSION',
          }
        });
      }

      // Record Clinical Encounter Note with structured Admission Diagnosis & Special Nursing Unit Orders
      await tx.encounter.create({
        data: {
          visitId,
          patientId: visit.patientId,
          type: 'AdmissionOrder',
          status: 'FINISHED',
          start: new Date(),
          end: new Date(),
          serviceType: 'CLINICAL_ORDER',
          reasonText: `Inpatient Admission Order (${urgency}) [Ward: ${targetWardCategory}] — Diagnosis: ${admissionDiagnosis || 'Clinical Admission'}`,
          diagnosis: {
            admissionDiagnosis,
            targetWardCategory,
            urgency,
            specialNursingOrders: notes,
          },
        }
      });

      // Register active Condition records for the patient if diagnosis is provided
      if (admissionDiagnosis) {
        const diagStr = String(admissionDiagnosis);
        const codeMatch = diagStr.match(/([A-Z][0-9]{2}(\.[0-9]{1,3})?)/);
        const code = codeMatch ? codeMatch[1] : 'ICD10';
        await tx.condition.create({
          data: {
            patientId: visit.patientId,
            encounterId: null,
            clinicalStatus: 'ACTIVE',
            verificationStatus: 'CONFIRMED',
            category: 'encounter-diagnosis',
            code,
            display: diagStr,
            onsetDateTime: new Date(),
            note: notes ? `Special Nursing Orders: ${notes}` : null,
          }
        });
      }

      return v;
    });

    // Generate Inpatient Admission & Ward Accommodation Deposit Invoice for Billing
    const depositAmount = targetWardCategory === 'ICU' ? 80000 : (targetWardCategory === 'VIP' || targetWardCategory === 'PRIVATE') ? 40000 : 10000;
    const serviceName = `Inpatient Admission & Ward Accommodation Deposit (${targetWardCategory} Ward)`;
    const invoiceNo = `INV-ADM-${visit.id.slice(-6).toUpperCase()}`;

    try {
      const dbInvoice = await prisma.invoice.create({
        data: {
          patientId: visit.patientId,
          fhirId: invoiceNo,
          status: 'ISSUED',
          total: depositAmount,
          amountPaid: 0,
          reasonText: serviceName,
        },
      });

      const { invoices } = await import('./billing.js');
      invoices.unshift({
        id: dbInvoice.id,
        invoiceNo,
        patientId: visit.patientId,
        patientName: visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : 'Patient',
        visitId: visit.id,
        items: [
          {
            chargeCode: `ADMIT-${targetWardCategory.toUpperCase()}`,
            name: serviceName,
            category: 'Inpatient',
            quantity: 1,
            unitPrice: depositAmount,
            vat: 0,
          },
        ],
        subtotal: depositAmount,
        vatTotal: 0,
        discountAmount: 0,
        totalAmount: depositAmount,
        patientAmount: depositAmount,
        donorAmount: 0,
        fundingSource: 'SELF_PAY',
        payerId: null,
        status: 'ISSUED',
        amountPaid: 0,
        outstanding: depositAmount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`[Visits] Created admission deposit invoice ${invoiceNo} (₦${depositAmount}) for visit ${visit.id}`);
    } catch (invErr) {
      console.error('[Visits] Failed to create admission deposit invoice:', invErr);
    }

    await logAudit({
      userId: req.user.userId,
      action: 'visit.order_admission',
      resourceType: 'Visit',
      resourceId: visitId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { targetWardCategory, urgency, admissionDiagnosis, notes },
    });

    res.json({ success: true, visit: updatedVisit });
  } catch (error) {
    next(error);
  }
});

// Records Process Inpatient Admission File & Deposit Clearance
router.post('/:id/process-admission-file', authMiddleware, async (req: any, res, next) => {
  try {
    const visitId = req.params.id;
    const { depositAmount = 0, paymentMode = 'CASH', inpatientNumber } = req.body;

    const visit = await prisma.visit.findUnique({ where: { id: visitId }, include: { patient: true } });
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    const ipid = inpatientNumber || `IPD-${new Date().getFullYear()}-${(visit.patient?.patientNumber || visit.id.slice(-6)).replace(/\D/g, '').slice(-6)}`;

    const updatedVisit = await prisma.$transaction(async (tx) => {
      const v = await tx.visit.update({
        where: { id: visitId },
        data: {
          status: 'PENDING_BED_ASSIGNMENT',
        },
      });

      // Update Workflow State
      const wf = await tx.visitWorkflowState.findUnique({ where: { visitId } });
      if (wf) {
        await tx.visitWorkflowState.update({
          where: { visitId },
          data: {
            currentStatus: 'PENDING_BED_ASSIGNMENT',
          }
        });
      }

      // Record Deposit Invoice line item if > 0
      if (Number(depositAmount) > 0) {
        await tx.invoice.create({
          data: {
            patientId: visit.patientId,
            total: Number(depositAmount),
            amountPaid: Number(depositAmount),
            status: 'PAID',
            reasonText: `Inpatient Admission Deposit (${ipid})`,
          }
        });
      }

      return v;
    });

    await logAudit({
      userId: req.user.userId,
      action: 'visit.process_admission_file',
      resourceType: 'Visit',
      resourceId: visitId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { ipid, depositAmount, paymentMode },
    });

    res.json({ success: true, visit: updatedVisit, ipid });
  } catch (error) {
    next(error);
  }
});

// Ward Admission & Physical Bed Assignment by Nurse
router.post('/:id/admit', authMiddleware, async (req: any, res, next) => {
  try {
    const { bedId, admittingStaffId } = admitSchema.parse(req.body);
    const visitId = req.params.id;

    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    const bed = await prisma.bed.findUnique({ where: { id: bedId } });
    if (!bed || bed.status !== 'AVAILABLE') {
      return res.status(400).json({ message: 'Selected Bed is not available' });
    }

    const admission = await prisma.$transaction(async (tx) => {
      // 1. Allocate bed
      await tx.bed.update({
        where: { id: bedId },
        data: { status: 'OCCUPIED' },
      });

      // 2. Create admission log
      const adm = await tx.admission.create({
        data: {
          patientId: visit.patientId,
          bedId,
          admittingStaffId: admittingStaffId || null,
          status: 'ADMITTED',
        },
      });

      // 3. Create Encounter
      await tx.encounter.create({
        data: {
          visitId,
          patientId: visit.patientId,
          type: 'Admission',
          status: 'IN_PROGRESS',
          start: new Date(),
          serviceType: 'INPATIENT',
          reasonText: `Admitted to Bed ${bed.number}`,
        },
      });

      // 4. Update Visit status to ADMITTED
      await tx.visit.update({
        where: { id: visitId },
        data: { status: 'ADMITTED' }
      });

      // 5. Update Workflow State
      const wf = await tx.visitWorkflowState.findUnique({ where: { visitId } });
      if (wf) {
        await tx.visitWorkflowState.update({
          where: { visitId },
          data: {
            currentStatus: 'ADMITTED',
          }
        });
      }

      return adm;
    });

    await logAudit({
      userId: req.user.userId,
      action: 'visit.admission',
      resourceType: 'Admission',
      resourceId: admission.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { bedId, visitId },
    });

    res.status(201).json({ success: true, admission });
  } catch (error) {
    next(error);
  }
});

// Ward Discharge
router.post('/:id/discharge', authMiddleware, async (req: any, res, next) => {
  try {
    const { reason } = dischargeSchema.parse(req.body);
    const visitId = req.params.id;

    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    // Find active admission
    const activeAdm = await prisma.admission.findFirst({
      where: { patientId: visit.patientId, status: 'ADMITTED' },
    });

    if (!activeAdm) {
      return res.status(400).json({ message: 'No active admission found for this patient.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Discharge admission
      await tx.admission.update({
        where: { id: activeAdm.id },
        data: {
          status: 'DISCHARGED',
          dischargedAt: new Date(),
          dischargeReason: reason,
        },
      });

      // 2. Free Bed
      await tx.bed.update({
        where: { id: activeAdm.bedId },
        data: { status: 'AVAILABLE' },
      });

      // 3. Finish Admission Encounter
      const encs = await tx.encounter.findMany({
        where: { visitId, type: 'Admission', status: 'IN_PROGRESS' },
      });
      for (const e of encs) {
        await tx.encounter.update({
          where: { id: e.id },
          data: { status: 'FINISHED', end: new Date() },
        });
      }
    });

    await logAudit({
      userId: req.user.userId,
      action: 'visit.discharge',
      resourceType: 'Admission',
      resourceId: activeAdm.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { reason },
    });

    res.json({ success: true, message: 'Patient discharged and bed released.' });
  } catch (error) {
    next(error);
  }
});

// Referrals
router.post('/refer', authMiddleware, async (req: any, res, next) => {
  try {
    const data = referSchema.parse(req.body);

    const ref = await prisma.referral.create({
      data: {
        patientId: data.patientId,
        referringStaffId: data.referringStaffId,
        type: data.type,
        receivingDept: data.receivingDept,
        receivingHospital: data.receivingHospital,
        notes: data.notes,
        status: 'PENDING',
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'referral.create',
      resourceType: 'Referral',
      resourceId: ref.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: data,
    });

    res.status(201).json({ success: true, referral: ref });
  } catch (error) {
    next(error);
  }
});

// Close Visit (Finish all clinical activities)
router.post('/:id/close', authMiddleware, async (req: any, res, next) => {
  try {
    const visitId = req.params.id;

    // Check if patient has active admissions
    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) return res.status(404).json({ message: 'Visit not found' });

    const activeAdm = await prisma.admission.findFirst({
      where: { patientId: visit.patientId, status: 'ADMITTED' },
    });
    if (activeAdm) {
      return res.status(400).json({ message: 'Cannot close visit while patient is admitted in ward.' });
    }

    // In progress encounters finish them
    await prisma.encounter.updateMany({
      where: { visitId, status: 'IN_PROGRESS' },
      data: { status: 'FINISHED', end: new Date() },
    });

    await prisma.visit.update({
      where: { id: visitId },
      data: { status: 'Completed' },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'visit.completed',
      resourceType: 'Visit',
      resourceId: visitId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Visit completed and queue closed.' });
  } catch (error) {
    next(error);
  }
});

// Visit summary details
router.get('/:id/summary', authMiddleware, async (req, res, next) => {
  try {
    const visitId = req.params.id;

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: true,
        encounters: {
          include: { staff: true },
        },
      },
    });

    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    // Fetch vital signs (observations), diagnoses, bills
    const observations = await prisma.observation.findMany({
      where: { patientId: visit.patientId, encounterId: { in: visit.encounters.map(e => e.id) } },
    });

    const conditions = await prisma.condition.findMany({
      where: { patientId: visit.patientId, encounterId: { in: visit.encounters.map(e => e.id) } },
    });

    const invoices = await prisma.invoice.findMany({
      where: { patientId: visit.patientId, createdAt: { gte: visit.createdAt } },
    });

    res.json({
      visitNumber: visit.visitNumber,
      visitType: visit.visitType,
      status: visit.status,
      createdAt: visit.createdAt,
      patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
      mrn: visit.patient.patientNumber,
      encounters: visit.encounters,
      vitals: observations,
      diagnoses: conditions,
      invoices,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
