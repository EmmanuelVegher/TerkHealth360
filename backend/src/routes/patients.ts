import bcrypt from 'bcryptjs';
// Wait, this is backend! I should use express Router.
import { Router as ExpressRouter } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';
import { soundex } from '../utils/phonetic.js';
import { checkDuplicates, scanAllPotentialDuplicates } from '../utils/duplicateDetector.js';
import { createVisitWorkflowState } from './workflow.js';

const router = ExpressRouter();
import { prisma } from '../prisma.js';

const registerPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional().nullable(),
  maidenName: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']),
  birthDate: z.string().optional().nullable(),
  estimatedAge: z.number().optional().nullable(), // if DoB unknown
  maritalStatus: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  genotype: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  stateOfOrigin: z.string().optional().nullable(),
  lga: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  spokenLanguage: z.string().optional().nullable(),
  nin: z.string().optional().nullable(),
  phone: z.string().min(5),
  email: z.string().email().optional().nullable(),
  address: z.string().min(2),
  city: z.string().min(2),
  photoUrl: z.string().optional().nullable(),
  registrationType: z.string().min(1),
  registrationFee: z.number().nonnegative().optional().nullable(),
  familyAccountId: z.string().optional().nullable(),
  familyRelationship: z.string().optional().nullable(),
  nokName: z.string().optional().nullable(),
  nokRelationship: z.string().optional().nullable(),
  nokPhone: z.string().optional().nullable(),
  nokAddress: z.string().optional().nullable(),
  emergencyName: z.string().optional().nullable(),
  emergencyRelationship: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  emergencyAddress: z.string().optional().nullable(),
  emergencyArrivalId: z.string().optional().nullable(),
});

// Calculate registration fee tariff
const getRegistrationFee = (type: string): number => {
  switch (type) {
    case 'INDIVIDUAL': return 1500;
    case 'FAMILY': return 3000;
    case 'EMERGENCY': return 0; // Emergency bypass fee
    case 'WALKIN': return 1000;
    case 'CORPORATE': return 2500;
    case 'INSURANCE': return 2000;
    default: return 1500;
  }
};

// Get patient metrics
router.get('/metrics', authMiddleware, async (req, res, next) => {
  try {
    const [total, active, deceased, archived, external] = await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({ where: { status: 'ACTIVE' } }),
      prisma.patient.count({ where: { status: 'DECEASED' } }),
      prisma.patient.count({ where: { status: 'ARCHIVED' } }),
      prisma.patient.count({ where: { patientNumber: { startsWith: 'EXT-' } } }),
    ]);
    res.json({ total, active, deceased, archived, external });
  } catch (error) {
    next(error);
  }
});

// External walk-in patient creation (Lab, Pharmacy, Radiology)
router.post('/external', authMiddleware, async (req: any, res, next) => {
  try {
    const { firstName, lastName, phone, serviceType, gender = 'UNKNOWN', registrationFee = 0, overrideDuplicate = false } = req.body;

    // Real-time duplicate check guardrail before creating external patient record
    if (!overrideDuplicate) {
      const candidates = await checkDuplicates({ firstName, lastName, phone });
      const highestScore = candidates[0]?.score || 0;
      if (highestScore >= 45) {
        return res.status(409).json({
          success: false,
          duplicateDetected: true,
          message: `Potential duplicate patient detected (${highestScore}% match). Please confirm or use existing patient record.`,
          candidates,
        });
      }
    }
    
    // Generate dummy user
    const dummyEmail = `external_${Date.now()}_${Math.floor(Math.random()*1000)}@hospital.local`;
    const hashedPassword = await bcrypt.hash('External123!', 10);
    const user = await prisma.user.create({
      data: {
        email: dummyEmail,
        username: dummyEmail.split('@')[0], // add required username
        passwordHash: hashedPassword,
        role: 'PATIENT',
        isActive: true,
      }
    });

    const patientCount = await prisma.patient.count();
    const patientNumber = `EXT-${new Date().getFullYear()}-${String(patientCount + 1).padStart(5, '0')}`;

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        createdById: req.user?.id || req.user?.userId || user.id,
        patientNumber,
        firstName,
        lastName,
        gender,
        telecoms: {
          create: { system: 'phone', value: phone, use: 'mobile' }
        }
      }
    });

    // Create a visit for the service
    const visitCount = await prisma.visit.count();
    const visitNumber = `VIS-${new Date().getFullYear()}-${String(visitCount + 1).padStart(6, '0')}`;
    
    const visit = await prisma.visit.create({
      data: {
        visitNumber,
        patientId: patient.id,
        visitType: serviceType, // e.g. PHARMACY_ONLY, LAB_ONLY, MORTUARY_ONLY
        status: serviceType === 'LAB_ONLY' ? 'IN_LABORATORY' : (serviceType === 'PHARMACY_ONLY' ? 'IN_PHARMACY' : 'REGISTERED'),
        createdBy: req.user.id,
      }
    });

    // Trigger workflow engine (this creates the encounters based on template)
    try {
      await createVisitWorkflowState(visit.id, serviceType);
    } catch(e) {
      console.error('[Patients] Failed to create workflow state for external visit:', e);
    }

    if (registrationFee > 0) {
      await prisma.invoice.create({
        data: {
          patientId: patient.id,
          status: 'ISSUED',
          total: registrationFee,
          amountPaid: 0,
          reasonText: `Registration fee invoice - ${serviceType}`,
        }
      });
    }

    res.json({ success: true, patient, visit });
  } catch(error) {
    next(error);
  }
});

// Check duplicate candidates
router.post('/check-duplicates', authMiddleware, async (req, res, next) => {
  try {
    const { firstName, lastName, birthDate, phone, nin } = req.body;
    const duplicates = await checkDuplicates({ firstName, lastName, birthDate, phone, nin });
    res.json(duplicates);
  } catch (error) {
    next(error);
  }
});

// Get Super-User Candidate Duplicate Queue (Scan DB)
router.get('/duplicate-candidates', authMiddleware, async (req, res, next) => {
  try {
    const candidatePairs = await scanAllPotentialDuplicates();
    res.json({ success: true, count: candidatePairs.length, pairs: candidatePairs });
  } catch (error) {
    next(error);
  }
});

// Get all patients
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        telecoms: true,
        triageRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(patients);
  } catch (error) {
    next(error);
  }
});

// Search Master Patient Index (MPI)
router.get('/mpi', authMiddleware, async (req, res, next) => {
  try {
    const { query, gender, status, page = '1', limit = '20' } = req.query;
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 20;
    const skip = (p - 1) * l;

    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (gender) {
      where.gender = gender as any;
    }

    if (query) {
      const q = (query as string).trim();
      const words = q.split(/\s+/).filter(Boolean);

      if (words.length > 1) {
        where.AND = words.map(w => ({
          OR: [
            { patientNumber: { contains: w, mode: 'insensitive' } },
            { nin: { contains: w, mode: 'insensitive' } },
            { firstName: { contains: w, mode: 'insensitive' } },
            { lastName: { contains: w, mode: 'insensitive' } },
            { middleName: { contains: w, mode: 'insensitive' } },
            { telecoms: { some: { value: { contains: w, mode: 'insensitive' } } } },
          ]
        }));
      } else {
        where.OR = [
          { patientNumber: { contains: q, mode: 'insensitive' } },
          { nin: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { middleName: { contains: q, mode: 'insensitive' } },
          { telecoms: { some: { value: { contains: q, mode: 'insensitive' } } } },
        ];
      }
    }

    const [patients, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        include: {
          telecoms: true,
          addresses: true,
          familyAccount: true,
          insurancePolicies: { include: { provider: true } },
          visits: { orderBy: { createdAt: 'desc' }, take: 1 }, // most recent visit
          createdBy: { include: { staff: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
      }),
      prisma.patient.count({ where }),
    ]);

    const data = patients.map(pat => {
      const phoneVal = pat.telecoms.find(t => t.system === 'phone')?.value || '';
      const emailVal = pat.telecoms.find(t => t.system === 'email')?.value || '';
      const creatorName = pat.createdBy?.staff
        ? `${pat.createdBy.staff.firstName} ${pat.createdBy.staff.lastName}`
        : pat.patientNumber.startsWith('EXT-') ? 'External / Walk-in' : 'Registration Desk';

      return {
        id: pat.id,
        mrn: pat.patientNumber,
        firstName: pat.firstName,
        lastName: pat.lastName,
        middleName: pat.middleName,
        gender: pat.gender,
        birthDate: pat.birthDate,
        status: pat.status,
        phone: phoneVal,
        email: emailVal,
        photoUrl: pat.photoUrl,
        nin: pat.nin,
        familyAccount: pat.familyAccount,
        lastVisitDate: pat.visits[0]?.createdAt || null,
        insurance: pat.insurancePolicies.map(p => p.provider.name).join(', ') || 'Self Payer',
        createdAt: pat.createdAt,
        createdBy: creatorName,
      };
    });

    res.json({
      data,
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

// Single patient detail
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        telecoms: true,
        addresses: true,
        familyAccount: { include: { members: true } },
        insurancePolicies: { include: { provider: true, plan: true } },
        visits: { 
          orderBy: { createdAt: 'desc' },
          include: {
            encounters: {
              include: { staff: true },
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        labOrders: { 
          include: { requestedBy: true, items: { include: { test: true, result: true } } },
          orderBy: { createdAt: 'desc' } 
        },
        pharmacyPrescriptions: { 
          include: { prescriber: true, items: { include: { medication: true } } },
          orderBy: { createdAt: 'desc' } 
        },
        cardReprints: { orderBy: { reprintedAt: 'desc' } },
      },
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    next(error);
  }
});

// Register patient
router.post('/', authMiddleware, async (req: any, res, next) => {
  try {
    const data = registerPatientSchema.parse(req.body);

    // 1. Generate unique MRN (configurable format: FFH-2026-XXXXXX)
    const year = new Date().getFullYear();
    const count = await prisma.patient.count();
    const sequence = (count + 1).toString().padStart(6, '0');
    const mrn = `FFH-${year}-${sequence}`;

    const newPatient = await prisma.$transaction(async (tx) => {
      // Create user login account for Patient Portal (inactive by default till verified)
      const defaultPassword = await bcrypt.hash('patient123', 12);
      const user = await tx.user.create({
        data: {
          username: `pat_${mrn.replace(/-/g, '_').toLowerCase()}`,
          email: data.email || `patient_${mrn.replace(/-/g, '_').toLowerCase()}@hospital.com`,
          passwordHash: defaultPassword,
          role: 'PATIENT',
          isActive: true,
        },
      });

      // Map patient details
      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          createdById: req.user?.id || req.user?.userId || null,
          patientNumber: mrn,
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName?.trim() || null,
          maidenName: data.maidenName?.trim() || null,
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          gender: data.gender,
          maritalStatus: (data.maritalStatus as any) || null,
          bloodGroup: (data.bloodGroup as any) || null,
          genotype: data.genotype || null,
          nationality: data.nationality || 'Nigeria',
          stateOfOrigin: data.stateOfOrigin || null,
          lga: data.lga || null,
          occupation: data.occupation || null,
          religion: data.religion || null,
          spokenLanguage: data.spokenLanguage || 'English',
          nin: (data.nin && data.nin.trim() !== '') ? data.nin.trim() : null,
          photoUrl: data.photoUrl || null,
          familyAccountId: data.familyAccountId || null,
          familyRelationship: data.familyRelationship || null,
          nokName: data.nokName,
          nokRelationship: data.nokRelationship,
          nokPhone: data.nokPhone,
          nokAddress: data.nokAddress,
          emergencyName: data.emergencyName,
          emergencyRelationship: data.emergencyRelationship,
          emergencyPhone: data.emergencyPhone,
          emergencyAddress: data.emergencyAddress,
        },
      });

      // Save telecom
      await tx.patientTelecom.create({
        data: { patientId: patient.id, system: 'phone', value: data.phone, use: 'mobile' },
      });

      if (data.email) {
        await tx.patientTelecom.create({
          data: { patientId: patient.id, system: 'email', value: data.email },
        });
      }

      // Save address
      await tx.patientAddress.create({
        data: { patientId: patient.id, line: data.address, city: data.city, country: 'Nigeria', use: 'home' },
      });

      // 2. Registration Fee Calculation & Invoicing
      const fee = (data.registrationFee !== undefined && data.registrationFee !== null)
        ? data.registrationFee
        : getRegistrationFee(data.registrationType);
      if (fee > 0) {
        await tx.invoice.create({
          data: {
            patientId: patient.id,
            status: 'ISSUED', // Cashier will confirm payment to activate
            total: fee,
            amountPaid: 0,
            reasonText: `Registration fee invoice - ${data.registrationType}`,
          },
        });
      }

      if (data.emergencyArrivalId) {
        let targetId = data.emergencyArrivalId;
        if (targetId.startsWith('visit-')) {
          const visitId = targetId.replace('visit-', '');
          const visit = await tx.visit.findUnique({ where: { id: visitId } });
          if (visit) {
            await tx.visit.update({
              where: { id: visitId },
              data: { patientId: patient.id }
            });
            const existing = await tx.emergencyArrival.findFirst({ where: { arrivalCode: visit.visitNumber } });
            if (existing) {
              await tx.emergencyArrival.update({
                where: { id: existing.id },
                data: { patientId: patient.id, tempPatientName: null }
              });
            } else {
              await tx.emergencyArrival.create({
                data: {
                  arrivalCode: visit.visitNumber,
                  patientId: patient.id,
                  tempPatientName: null,
                  arrivalMethod: 'WALK_IN',
                  presentingComplaint: visit.chiefComplaint || 'Emergency Assessment & Care',
                  status: 'ARRIVED'
                }
              });
            }
          }
        } else if (!targetId.startsWith('adm-')) {
          await tx.emergencyArrival.update({
            where: { id: targetId },
            data: { patientId: patient.id, tempPatientName: null }
          }).catch((err) => console.error('Failed to link emergency arrival', err));
        }
      }

      return patient;
    });

    await logAudit({
      userId: req.user.userId,
      action: 'patient.register',
      resourceType: 'Patient',
      resourceId: newPatient.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { mrn: newPatient.patientNumber, name: `${newPatient.firstName} ${newPatient.lastName}` },
    });

    res.status(201).json({ success: true, patient: newPatient });
  } catch (error) {
    next(error);
  }
});

// Update demographics
router.put('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const data = registerPatientSchema.partial().parse(req.body);
    const patientId = req.params.id;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        maidenName: data.maidenName,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        gender: data.gender,
        maritalStatus: data.maritalStatus as any,
        bloodGroup: data.bloodGroup as any,
        genotype: data.genotype,
        nationality: data.nationality,
        stateOfOrigin: data.stateOfOrigin,
        lga: data.lga,
        occupation: data.occupation,
        religion: data.religion,
        spokenLanguage: data.spokenLanguage,
        nin: data.nin,
        photoUrl: data.photoUrl,
        familyAccountId: data.familyAccountId,
        familyRelationship: data.familyRelationship,
        nokName: data.nokName,
        nokRelationship: data.nokRelationship,
        nokPhone: data.nokPhone,
        nokAddress: data.nokAddress,
        emergencyName: data.emergencyName,
        emergencyRelationship: data.emergencyRelationship,
        emergencyPhone: data.emergencyPhone,
        emergencyAddress: data.emergencyAddress,
      },
    });

    // Update telecom if phone updated
    if (data.phone) {
      await prisma.patientTelecom.updateMany({
        where: { patientId, system: 'phone' },
        data: { value: data.phone },
      });
    }

    await logAudit({
      userId: req.user.userId,
      action: 'patient.update',
      resourceType: 'Patient',
      resourceId: patientId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { before: patient, after: updated },
    });

    res.json({ success: true, patient: updated });
  } catch (error) {
    next(error);
  }
});

// Patient record merge
router.post('/merge', authMiddleware, async (req: any, res, next) => {
  try {
    const { survivingPatientId, obsoletePatientId, justification } = z.object({
      survivingPatientId: z.string(),
      obsoletePatientId: z.string(),
      justification: z.string().min(5),
    }).parse(req.body);

    if (survivingPatientId === obsoletePatientId) {
      return res.status(400).json({ message: 'Surviving and obsolete patient records must be different.' });
    }

    const [surviving, obsolete] = await Promise.all([
      prisma.patient.findUnique({ where: { id: survivingPatientId } }),
      prisma.patient.findUnique({ where: { id: obsoletePatientId } }),
    ]);

    if (!surviving || !obsolete) {
      return res.status(404).json({ message: 'Surviving or obsolete patient record not found.' });
    }

    await prisma.$transaction(async (tx) => {
      // Reassign all clinical records to surviving patient
      await tx.appointment.updateMany({ where: { patientId: obsoletePatientId }, data: { patientId: survivingPatientId } });
      await tx.encounter.updateMany({ where: { patientId: obsoletePatientId }, data: { patientId: survivingPatientId } });
      await tx.observation.updateMany({ where: { patientId: obsoletePatientId }, data: { patientId: survivingPatientId } });
      await tx.condition.updateMany({ where: { patientId: obsoletePatientId }, data: { patientId: survivingPatientId } });
      await tx.medicationRequest.updateMany({ where: { patientId: obsoletePatientId }, data: { patientId: survivingPatientId } });
      await tx.invoice.updateMany({ where: { patientId: obsoletePatientId }, data: { patientId: survivingPatientId } });
      await tx.admission.updateMany({ where: { patientId: obsoletePatientId }, data: { patientId: survivingPatientId } });
      await tx.referral.updateMany({ where: { patientId: obsoletePatientId }, data: { patientId: survivingPatientId } });

      // Archive obsolete patient record
      await tx.patient.update({
        where: { id: obsoletePatientId },
        data: { status: 'ARCHIVED', isActive: false },
      });
    });

    await logAudit({
      userId: req.user.userId,
      action: 'patient.merge',
      resourceType: 'Patient',
      resourceId: survivingPatientId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { survivingPatientId, obsoletePatientId, justification },
    });

    res.json({ success: true, message: 'Patient records merged successfully. Obsolete record is archived.' });
  } catch (error) {
    next(error);
  }
});

// PATCH /:id/status — update patient status (ACTIVE, INACTIVE, DECEASED, ARCHIVED)
router.patch('/:id/status', authMiddleware, async (req: any, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(['ACTIVE', 'INACTIVE', 'DECEASED', 'ARCHIVED']),
    }).parse(req.body);

    const patientId = req.params.id;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        status,
        isActive: status === 'ACTIVE',
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'patient.status_change',
      resourceType: 'Patient',
      resourceId: patientId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { fromStatus: patient.status, toStatus: status },
    });

    res.json({ success: true, patient: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id — remove patient (only if no clinical history exists)
router.delete('/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const patientId = req.params.id;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        appointments: { select: { id: true } },
        encounters: { select: { id: true } },
        invoices: { select: { id: true } },
      },
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const hasHistory = patient.appointments.length > 0 || patient.encounters.length > 0 || patient.invoices.length > 0;

    if (hasHistory) {
      return res.status(400).json({
        message: 'This patient has existing clinical records (appointments, encounters, or invoices). Hard deletion is blocked to preserve medical audit trails. Change the patient status to "ARCHIVED" or "INACTIVE" instead.',
        code: 'CLINICAL_RECORDS_EXIST',
        canArchive: true,
      });
    }

    // Safe to delete — no clinical history
    if (patient.userId) {
      await prisma.user.delete({ where: { id: patient.userId } });
    } else {
      await prisma.patient.delete({ where: { id: patientId } });
    }

    await logAudit({
      userId: req.user.userId,
      action: 'patient.delete',
      resourceType: 'Patient',
      resourceId: patientId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { mrn: patient.patientNumber },
    });

    res.json({ success: true, message: 'Patient profile deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// Patient ID card reprint history logger
router.post('/:id/card-reprint', authMiddleware, async (req: any, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    const patientId = req.params.id;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const reprintedBy = user?.username || 'Unknown';

    const log = await prisma.patientCardReprint.create({
      data: {
        patientId,
        reprintedBy,
        reason,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'patient.card_reprint',
      resourceType: 'Patient',
      resourceId: patientId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { reprintLogId: log.id, reason },
    });

    res.json({ success: true, message: 'Card reprint logged' });
  } catch (error) {
    next(error);
  }
});

// Approve Registration Encounter
router.post('/encounters/:encounterId/approve', authMiddleware, async (req: any, res, next) => {
  try {
    const { encounterId } = req.params;
    const { signature } = req.body;

    // Must be ADMIN
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Only administrators can approve registrations' });
    }

    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
    });

    if (!encounter) {
      return res.status(404).json({ success: false, error: 'Encounter not found' });
    }

    if (encounter.serviceType !== 'REGISTRATION') {
      return res.status(400).json({ success: false, error: 'Only registration encounters can be approved via this endpoint' });
    }

    const updated = await prisma.encounter.update({
      where: { id: encounterId },
      data: {
        approvedById: req.user.userId,
        approvalSignature: signature,
        approvedAt: new Date(),
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'encounter.approve',
      resourceType: 'Encounter',
      resourceId: encounterId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
