import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { extractHospitalFolder, ExtractedFolderData, FolderExtractionOptions, normalizeLabTest } from '../utils/folderVisionExtractor.js';
import bcrypt from 'bcryptjs';

const router = Router();

const superAdminGuard = (req: any, res: Response, next: any) => {
  const user = req.user;
  const isSuperAdmin = Boolean(
    user?.role === 'SUPER_ADMIN' ||
    user?.roles?.includes('SUPER_ADMIN') ||
    user?.role?.toUpperCase() === 'SUPER_ADMIN' ||
    (user?.designation || '').toLowerCase().includes('super admin')
  );

  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: The Record Migration Station is restricted to Super Administrators only.'
    });
  }
  next();
};

// ── 1. POST /api/records-migration/extract-folder ───────────────────────────
router.post('/extract-folder', authMiddleware, superAdminGuard, async (req: any, res: Response) => {
  try {
    const {
      images,
      imageBase64,
      selectedFormTypes,
      pageFormMappings,
      hospitalPreset,
      customHospitalName,
      customMotto,
      customInstructions,
      expectedFields,
      pageLabels
    } = req.body;

    const imageList: string[] = Array.isArray(images) && images.length > 0
      ? images
      : imageBase64
      ? [imageBase64]
      : [];

    if (imageList.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one folder page image' });
    }

    const options: FolderExtractionOptions = {
      selectedFormTypes,
      pageFormMappings,
      hospitalPreset,
      customHospitalName,
      customMotto,
      customInstructions,
      expectedFields,
      pageLabels
    };

    const extracted = await extractHospitalFolder(imageList, options);

    // Check if patient number, family number, or name already exists in database
    let existingMatch: any = null;
    if (extracted.patient.patientNumber || extracted.patient.folderNumber) {
      const targetNum = extracted.patient.patientNumber || extracted.patient.folderNumber;
      const matchByNum = await prisma.patient.findFirst({
        where: {
          patientNumber: { equals: targetNum, mode: 'insensitive' }
        },
        include: {
          familyAccount: true,
          visits: { take: 5, orderBy: { createdAt: 'desc' } },
          triageRecords: { take: 5, orderBy: { createdAt: 'desc' } },
          consultationNotes: { take: 5, orderBy: { createdAt: 'desc' } }
        }
      });
      if (matchByNum) {
        existingMatch = {
          patientId: matchByNum.id,
          patientNumber: matchByNum.patientNumber,
          fullName: `${matchByNum.firstName} ${matchByNum.lastName}`,
          gender: matchByNum.gender,
          birthDate: matchByNum.birthDate,
          familyNumber: matchByNum.familyAccount?.familyNumber,
          existingVisitsCount: matchByNum.visits.length,
          existingVitalsCount: matchByNum.triageRecords.length,
          existingNotesCount: matchByNum.consultationNotes.length,
          matchType: 'EXACT_PATIENT_NUMBER'
        };
      }
    }

    if (!existingMatch && extracted.patient.firstName && extracted.patient.lastName) {
      const matchByName = await prisma.patient.findFirst({
        where: {
          AND: [
            { firstName: { equals: extracted.patient.firstName, mode: 'insensitive' } },
            { lastName: { equals: extracted.patient.lastName, mode: 'insensitive' } }
          ]
        },
        include: {
          familyAccount: true,
          visits: { take: 5, orderBy: { createdAt: 'desc' } }
        }
      });
      if (matchByName) {
        existingMatch = {
          patientId: matchByName.id,
          patientNumber: matchByName.patientNumber,
          fullName: `${matchByName.firstName} ${matchByName.lastName}`,
          gender: matchByName.gender,
          birthDate: matchByName.birthDate,
          familyNumber: matchByName.familyAccount?.familyNumber,
          existingVisitsCount: matchByName.visits.length,
          matchType: 'NAME_MATCH'
        };
      }
    }

    // Check if Family Account exists and compute sequential patient number
    let existingFamilyAccount = null;
    let suggestedPatientNumber = extracted.patient.patientNumber || extracted.patient.folderNumber;

    if (extracted.patient.familyNumber) {
      const cleanFan = extracted.patient.familyNumber.trim().replace(/^family\s*/i, '');
      const possibleFans = [
        cleanFan,
        `FAN-${cleanFan}`,
        cleanFan.replace(/^FAN-/, ''),
        `FAN-${new Date().getFullYear()}-${cleanFan.padStart(5, '0')}`
      ];
      const fam = await prisma.familyAccount.findFirst({
        where: {
          OR: possibleFans.map(f => ({ familyNumber: { equals: f, mode: 'insensitive' } }))
        },
        include: {
          members: {
            select: { id: true, firstName: true, lastName: true, patientNumber: true, familyRelationship: true }
          }
        }
      });
      if (fam) {
        existingFamilyAccount = {
          id: fam.id,
          familyNumber: fam.familyNumber,
          headPatientId: fam.headPatientId,
          membersCount: fam.members.length,
          members: fam.members
        };
        // Generate next sequential sub-number e.g. FFH-12676-2 or 12676/2
        const nextSeq = fam.members.length + 1;
        suggestedPatientNumber = `FFH-${cleanFan}-${nextSeq}`;
        extracted.patient.patientNumber = suggestedPatientNumber;
        if (!extracted.patient.familyRelationship || extracted.patient.familyRelationship === 'HEAD') {
          extracted.patient.familyRelationship = 'MEMBER';
        }
      } else {
        // Family doesn't exist yet: designate as head and generate FFH-12676-1
        suggestedPatientNumber = `FFH-${cleanFan}-1`;
        extracted.patient.patientNumber = suggestedPatientNumber;
        extracted.patient.familyRelationship = 'HEAD';
      }
    }

    return res.json({
      success: true,
      data: extracted,
      existingMatch,
      existingFamilyAccount,
      suggestedPatientNumber
    });
  } catch (err: any) {
    console.error('[RecordsMigration] Folder extraction error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to analyze folder images'
    });
  }
});

// ── 2. GET /api/records-migration/check-patient-match ────────────────────────
router.get('/check-patient-match', authMiddleware, superAdminGuard, async (req: Request, res: Response) => {
  try {
    const { folderNumber, firstName, lastName, familyNumber } = req.query as {
      folderNumber?: string;
      firstName?: string;
      lastName?: string;
      familyNumber?: string;
    };

    const conditions: any[] = [];
    if (folderNumber?.trim()) {
      conditions.push({ patientNumber: { equals: folderNumber.trim(), mode: 'insensitive' } });
    }
    if (firstName?.trim() && lastName?.trim()) {
      conditions.push({
        AND: [
          { firstName: { equals: firstName.trim(), mode: 'insensitive' } },
          { lastName: { equals: lastName.trim(), mode: 'insensitive' } }
        ]
      });
    }

    if (conditions.length === 0) {
      return res.json({ success: true, match: null, family: null });
    }

    const [patient, family] = await Promise.all([
      prisma.patient.findFirst({
        where: { OR: conditions },
        include: {
          familyAccount: true,
          visits: { take: 5, orderBy: { createdAt: 'desc' } },
          triageRecords: { take: 5, orderBy: { createdAt: 'desc' } },
          consultationNotes: { take: 5, orderBy: { createdAt: 'desc' } },
          conditions: { take: 5 }
        }
      }),
      familyNumber ? prisma.familyAccount.findFirst({
        where: {
          OR: [
            { familyNumber: { equals: familyNumber.trim(), mode: 'insensitive' } },
            { familyNumber: { equals: `FAN-${familyNumber.trim()}`, mode: 'insensitive' } },
            { familyNumber: { equals: familyNumber.trim().replace(/^FAN-/, ''), mode: 'insensitive' } }
          ]
        },
        include: {
          members: {
            select: { id: true, firstName: true, lastName: true, patientNumber: true, familyRelationship: true }
          }
        }
      }) : null
    ]);

    if (!patient && !family) {
      return res.json({ success: true, match: null, family: null });
    }

    return res.json({
      success: true,
      match: patient ? {
        id: patient.id,
        patientNumber: patient.patientNumber,
        firstName: patient.firstName,
        lastName: patient.lastName,
        gender: patient.gender,
        birthDate: patient.birthDate,
        phone: patient.nokPhone,
        address: patient.emergencyAddress,
        bloodGroup: patient.bloodGroup,
        genotype: patient.genotype,
        familyAccountId: patient.familyAccountId,
        familyNumber: patient.familyAccount?.familyNumber,
        familyRelationship: patient.familyRelationship,
        totalVisits: patient.visits.length,
        totalVitals: patient.triageRecords.length,
        totalNotes: patient.consultationNotes.length,
        totalConditions: patient.conditions.length
      } : null,
      family: family ? {
        id: family.id,
        familyNumber: family.familyNumber,
        headPatientId: family.headPatientId,
        membersCount: family.members.length,
        members: family.members
      } : null
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. POST /api/records-migration/commit-migration ─────────────────────────
router.post('/commit-migration', authMiddleware, superAdminGuard, async (req: any, res: Response) => {
  try {
    const clerkUser = req.user;
    const {
      patient,
      vitals,
      encounters,
      diagnoses,
      prescriptions,
      labInvestigations,
      allergies,
      dischargeSummaries,
      billingRecords,
      maternityRecords,
      ancRecords,
      radiologyReports,
      mortuaryRecords,
      pathologyReports,
      physiotherapyRecords,
      dentalRecords,
      eyeClinicRecords,
      insuranceRecords,
      financeRecords,
      auditRecords,
      scannedPages,
      mergeOption, // 'CREATE_NEW' | 'MERGE_APPEND'
      existingPatientId,
      hospitalPreset
    } = req.body as {
      patient: ExtractedFolderData['patient'];
      vitals: ExtractedFolderData['vitals'];
      encounters: ExtractedFolderData['encounters'];
      diagnoses: ExtractedFolderData['diagnoses'];
      prescriptions: ExtractedFolderData['prescriptions'];
      labInvestigations: ExtractedFolderData['labInvestigations'];
      allergies: ExtractedFolderData['allergies'];
      dischargeSummaries?: ExtractedFolderData['dischargeSummaries'];
      billingRecords?: ExtractedFolderData['billingRecords'];
      maternityRecords?: ExtractedFolderData['maternityRecords'];
      ancRecords?: ExtractedFolderData['ancRecords'];
      radiologyReports?: ExtractedFolderData['radiologyReports'];
      mortuaryRecords?: ExtractedFolderData['mortuaryRecords'];
      pathologyReports?: ExtractedFolderData['pathologyReports'];
      physiotherapyRecords?: ExtractedFolderData['physiotherapyRecords'];
      dentalRecords?: ExtractedFolderData['dentalRecords'];
      eyeClinicRecords?: ExtractedFolderData['eyeClinicRecords'];
      insuranceRecords?: ExtractedFolderData['insuranceRecords'];
      financeRecords?: ExtractedFolderData['financeRecords'];
      auditRecords?: ExtractedFolderData['auditRecords'];
      scannedPages: Array<{ pageIndex: number; dataUrl: string; label?: string }>;
      mergeOption?: string;
      existingPatientId?: string;
      hospitalPreset?: string;
    };

    if (!patient || !patient.firstName || !patient.lastName) {
      return res.status(400).json({ success: false, message: 'Patient firstName and lastName are required' });
    }

    let clerkStaff = await prisma.staff.findFirst({
      where: { userId: clerkUser?.id }
    });
    if (!clerkStaff) {
      clerkStaff = await prisma.staff.findFirst();
    }
    const defaultStaffId = clerkStaff?.id || 'STAFF-MIGRATION-SYSTEM';

    const result = await prisma.$transaction(async (tx) => {
      let targetPatient: any = null;

      // 1. Resolve or Create Patient Record
      if (mergeOption === 'MERGE_APPEND' && existingPatientId) {
        targetPatient = await tx.patient.findUnique({ where: { id: existingPatientId } });
        if (targetPatient) {
          targetPatient = await tx.patient.update({
            where: { id: existingPatientId },
            data: {
              bloodGroup: patient.bloodGroup ? (patient.bloodGroup as any) : targetPatient.bloodGroup,
              genotype: patient.genotype || targetPatient.genotype,
              maritalStatus: patient.maritalStatus ? (patient.maritalStatus as any) : targetPatient.maritalStatus,
              occupation: patient.occupation || targetPatient.occupation,
              religion: patient.religion || targetPatient.religion,
              spokenLanguage: patient.spokenLanguage || targetPatient.spokenLanguage,
              stateOfOrigin: patient.stateOfOrigin || targetPatient.stateOfOrigin,
              lga: patient.lga || targetPatient.lga,
              nokName: patient.nokName || targetPatient.nokName,
              nokRelationship: patient.nokRelationship || targetPatient.nokRelationship,
              nokPhone: patient.nokPhone || targetPatient.nokPhone,
              nokAddress: patient.nokAddress || targetPatient.nokAddress,
              emergencyName: patient.emergencyName || targetPatient.emergencyName,
              emergencyPhone: patient.emergencyPhone || targetPatient.emergencyPhone,
            }
          });
        }
      }

      if (!targetPatient) {
        let finalPatientNumber = patient.patientNumber || patient.folderNumber || `FFH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const existingWithNum = await tx.patient.findUnique({ where: { patientNumber: finalPatientNumber } });
        if (existingWithNum) {
          finalPatientNumber = `${finalPatientNumber}-MIG${Math.floor(100 + Math.random() * 900)}`;
        }

        const username = `${patient.firstName.toLowerCase()}.${patient.lastName.toLowerCase()}.${Math.floor(100 + Math.random() * 900)}`.replace(/[^a-z0-9.]/g, '');
        const email = `${username}@hospital.local`;
        const dummyPasswordHash = await bcrypt.hash('TerkHealth360@' + new Date().getFullYear(), 10);

        const newUser = await tx.user.create({
          data: {
            username,
            email,
            passwordHash: dummyPasswordHash,
            role: 'PATIENT',
            isActive: true,
          }
        });

        const parsedDob = patient.birthDate ? new Date(patient.birthDate) : new Date(Date.now() - (patient.ageYears || 35) * 365.25 * 24 * 60 * 60 * 1000);

        targetPatient = await tx.patient.create({
          data: {
            userId: newUser.id,
            patientNumber: finalPatientNumber,
            firstName: patient.firstName,
            lastName: patient.lastName,
            middleName: patient.middleName || null,
            maidenName: patient.maidenName || null,
            birthDate: isNaN(parsedDob.getTime()) ? new Date('1990-01-01') : parsedDob,
            gender: (['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'].includes(patient.gender) ? patient.gender : 'MALE') as any,
            maritalStatus: (['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED'].includes(patient.maritalStatus as string) ? patient.maritalStatus : 'MARRIED') as any,
            bloodGroup: patient.bloodGroup as any,
            genotype: patient.genotype || 'AA',
            nationality: 'Nigerian',
            stateOfOrigin: patient.stateOfOrigin || null,
            lga: patient.lga || null,
            occupation: patient.occupation || null,
            religion: patient.religion || null,
            spokenLanguage: patient.spokenLanguage || 'English',
            nin: patient.nin || null,
            nokName: patient.nokName || null,
            nokRelationship: patient.nokRelationship || null,
            nokPhone: patient.nokPhone || null,
            nokAddress: patient.nokAddress || null,
            emergencyName: patient.emergencyName || patient.nokName || null,
            emergencyPhone: patient.emergencyPhone || patient.nokPhone || null,
            createdById: clerkUser?.id || null,
          }
        });

        if (patient.phone) {
          await tx.patientTelecom.create({
            data: {
              patientId: targetPatient.id,
              system: 'phone',
              value: patient.phone,
              use: 'mobile'
            }
          });
        }

        if (patient.alternatePhone) {
          await tx.patientTelecom.create({
            data: {
              patientId: targetPatient.id,
              system: 'phone',
              value: patient.alternatePhone,
              use: 'work'
            }
          });
        }

        if (patient.address) {
          await tx.patientAddress.create({
            data: {
              patientId: targetPatient.id,
              line: patient.address,
              city: patient.lga || 'City',
              state: patient.stateOfOrigin || 'State',
              country: 'Nigeria',
              use: 'home'
            }
          });
        }
      }

      // Handle Family Account Linking / Auto-Creation
      let familyAccountResult = null;
      if (patient.familyNumber) {
        const cleanFan = patient.familyNumber.trim().replace(/^family\s*/i, '');
        if (cleanFan) {
          const possibleFans = [
            cleanFan,
            `FAN-${cleanFan}`,
            cleanFan.replace(/^FAN-/, ''),
            `FAN-${new Date().getFullYear()}-${cleanFan.padStart(5, '0')}`
          ];

          let existingFam = await tx.familyAccount.findFirst({
            where: {
              OR: possibleFans.map(f => ({ familyNumber: { equals: f, mode: 'insensitive' } }))
            }
          });

          if (!existingFam) {
            const newFanNumber = cleanFan.startsWith('FAN-') ? cleanFan : `FAN-${cleanFan}`;
            existingFam = await tx.familyAccount.create({
              data: {
                familyNumber: newFanNumber,
                headPatientId: targetPatient.id
              }
            });
          }

          if (existingFam) {
            const relationship = patient.familyRelationship || (existingFam.headPatientId === targetPatient.id ? 'HEAD' : 'MEMBER');
            await tx.patient.update({
              where: { id: targetPatient.id },
              data: {
                familyAccountId: existingFam.id,
                familyRelationship: relationship
              }
            });
            targetPatient.familyAccountId = existingFam.id;
            targetPatient.familyRelationship = relationship;
            familyAccountResult = {
              id: existingFam.id,
              familyNumber: existingFam.familyNumber,
              relationship
            };
          }
        }
      }

      const patientId = targetPatient.id;
      const createdVisits: any[] = [];
      const createdEncounters: any[] = [];
      const createdVitals: any[] = [];
      const createdNotes: any[] = [];
      const createdConditions: any[] = [];
      const createdPrescriptions: any[] = [];
      const createdInvoices: any[] = [];
      const createdAttachments: any[] = [];

      // 2. Map Doctor Encounters / SOAP Notes into Visits & ConsultationNotes
      if (Array.isArray(encounters) && encounters.length > 0) {
        for (let i = 0; i < encounters.length; i++) {
          const enc = encounters[i];
          const visitDate = enc.visitDate ? new Date(enc.visitDate) : new Date();
          const validDate = isNaN(visitDate.getTime()) ? new Date() : visitDate;

          const visitNumber = `VIS-MIG-${validDate.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

          const visit = await tx.visit.create({
            data: {
              visitNumber,
              patientId,
              visitType: enc.visitType || 'OUTPATIENT',
              status: 'COMPLETED',
              chiefComplaint: enc.chiefComplaint || 'Historical Clinical Review',
              createdAt: validDate,
              updatedAt: validDate,
              createdBy: clerkUser?.id || 'MIGRATION_AI'
            }
          });
          createdVisits.push(visit);

          const encounter = await tx.encounter.create({
            data: {
              patientId,
              visitId: visit.id,
              status: 'FINISHED',
              class: enc.visitType === 'INPATIENT' ? 'INPATIENT' : enc.visitType === 'EMERGENCY' ? 'EMERGENCY' : 'AMBULATORY',
              type: enc.specialty || 'General Medicine',
              reasonText: enc.chiefComplaint || 'Historical Clinical Encounter',
              start: validDate,
              end: new Date(validDate.getTime() + 30 * 60 * 1000),
              staffId: defaultStaffId,
              createdAt: validDate
            }
          });
          createdEncounters.push(encounter);

          const note = await tx.consultationNote.create({
            data: {
              patientId,
              visitId: visit.id,
              encounterId: encounter.id,
              authorId: defaultStaffId,
              subjective: `[Chief Complaint]: ${enc.chiefComplaint || 'N/A'}\n\n[History of Present Illness / Subjective]:\n${enc.historyOfPresentIllness || 'Historical presentation.'}`,
              objective: enc.physicalExamination || 'O/E: Physical examination recorded in physical folder.',
              assessment: enc.assessment || 'Clinical Assessment / Impression from paper record.',
              plan: enc.plan || 'Management plan documented in physical case notes.',
              signature: enc.doctorName || 'Dr. Attending Clinician',
              signedAt: validDate,
              isFinalized: true,
              createdAt: validDate,
              updatedAt: validDate
            }
          });
          createdNotes.push(note);
        }
      }

      // 3. Map Discharge Summaries
      if (Array.isArray(dischargeSummaries) && dischargeSummaries.length > 0) {
        for (const ds of dischargeSummaries) {
          const dDate = ds.dischargeDate ? new Date(ds.dischargeDate) : new Date();
          const validDDate = isNaN(dDate.getTime()) ? new Date() : dDate;

          const dischVisit = await tx.visit.create({
            data: {
              visitNumber: `VIS-DISCH-${validDDate.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
              patientId,
              visitType: 'INPATIENT',
              status: 'COMPLETED',
              chiefComplaint: `Discharge Summary: ${ds.dischargeDiagnosis || 'Inpatient Resolution'}`,
              createdAt: validDDate,
              updatedAt: validDDate,
              createdBy: clerkUser?.id || 'MIGRATION_AI'
            }
          });
          createdVisits.push(dischVisit);

          const dischNote = await tx.consultationNote.create({
            data: {
              patientId,
              visitId: dischVisit.id,
              authorId: defaultStaffId,
              subjective: `[Inpatient Admission Date]: ${ds.admissionDate || 'N/A'}\n[Ward]: ${ds.ward || 'General'}\n[Admission Diagnosis]: ${ds.admissionDiagnosis || 'N/A'}\n\n[Clinical Course Summary]:\n${ds.clinicalSummary || 'Course of inpatient care.'}`,
              objective: `[Discharge Condition]: ${ds.dischargeCondition || 'RECOVERED'}`,
              assessment: `[Discharge Final Diagnosis]: ${ds.dischargeDiagnosis || 'Resolved'}`,
              plan: `[Discharge Medications]: ${ds.dischargeMedications || 'None'}\n[Follow-up Clinic]: ${ds.followUpClinic || 'GOPD'} on ${ds.followUpDate || 'TBD'}`,
              signature: ds.dischargingDoctor || 'Dr. Consultant',
              signedAt: validDDate,
              isFinalized: true,
              createdAt: validDDate,
              updatedAt: validDDate
            }
          });
          createdNotes.push(dischNote);
        }
      }

      // Anchor visit for standalone vitals/diagnoses if no encounters exist
      let primaryVisitId = createdVisits.length > 0 ? createdVisits[0].id : null;
      let primaryEncounterId = createdEncounters.length > 0 ? createdEncounters[0].id : null;

      if (!primaryVisitId) {
        const firstVitalDate = vitals && vitals.length > 0 && vitals[0].recordedDate ? new Date(vitals[0].recordedDate) : new Date();
        const validAnchorDate = isNaN(firstVitalDate.getTime()) ? new Date() : firstVitalDate;
        const anchorVisit = await tx.visit.create({
          data: {
            visitNumber: `VIS-MIG-${validAnchorDate.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
            patientId,
            visitType: 'OUTPATIENT',
            status: 'COMPLETED',
            chiefComplaint: 'Historical Medical Records Migration',
            createdAt: validAnchorDate,
            updatedAt: validAnchorDate
          }
        });
        primaryVisitId = anchorVisit.id;

        const anchorEncounter = await tx.encounter.create({
          data: {
            patientId,
            visitId: anchorVisit.id,
            status: 'FINISHED',
            class: 'AMBULATORY',
            type: 'General Outpatient',
            reasonText: 'Historical Medical Records Migration',
            start: validAnchorDate,
            end: new Date(validAnchorDate.getTime() + 15 * 60 * 1000),
            staffId: defaultStaffId,
            createdAt: validAnchorDate
          }
        });
        primaryEncounterId = anchorEncounter.id;
      }

      // 4. Map Billing Forms & Invoices
      if (Array.isArray(billingRecords) && billingRecords.length > 0) {
        for (const b of billingRecords) {
          const bDate = b.billDate ? new Date(b.billDate) : new Date();
          const validBDate = isNaN(bDate.getTime()) ? new Date() : bDate;

          const inv = await tx.invoice.create({
            data: {
              patientId,
              status: b.paymentStatus === 'PAID' || b.paymentStatus === 'CLEARED' ? 'PAID' : 'ISSUED',
              total: Number(b.totalAmount) || 0,
              amountPaid: Number(b.amountPaid) || Number(b.totalAmount) || 0,
              reasonText: `Migrated Bill ${b.billNumber || ''} (Receipt: ${b.receiptNumber || 'N/A'}) - ${b.notes || 'Full Clearance'}`,
              createdAt: validBDate,
              updatedAt: validBDate
            }
          });
          createdInvoices.push(inv);
        }
      }

      // 5. Insert Time-Series Vitals (TriageRecords & Observations)
      if (Array.isArray(vitals) && vitals.length > 0) {
        for (const v of vitals) {
          const vDate = v.recordedDate ? new Date(v.recordedDate) : new Date();
          const validVDate = isNaN(vDate.getTime()) ? new Date() : vDate;

          const triage = await tx.triageRecord.create({
            data: {
              patientId,
              encounterId: primaryEncounterId,
              triageType: 'OUTPATIENT',
              systolic: Number(v.systolic) || 120,
              diastolic: Number(v.diastolic) || 80,
              temperature: Number(v.temperature) || 36.8,
              pulseRate: Number(v.heartRate) || 75,
              respiratoryRate: Number(v.respiratoryRate) || 18,
              spo2: Number(v.oxygenSaturation) || 98,
              weight: v.weightKg ? Number(v.weightKg) : null,
              height: v.heightCm ? Number(v.heightCm) : null,
              bmi: v.bmi ? Number(v.bmi) : null,
              presentingComplaints: v.notes || 'Routine triage observation',
              painScore: Number(v.painScore) || 0,
              createdById: defaultStaffId,
              triageStart: validVDate,
              triageEnd: validVDate,
              createdAt: validVDate
            }
          });
          createdVitals.push(triage);
        }
      }

      // 6. Insert Diagnoses (Conditions)
      if (Array.isArray(diagnoses) && diagnoses.length > 0) {
        for (const d of diagnoses) {
          const dDate = d.date ? new Date(d.date) : new Date();
          const validDDate = isNaN(dDate.getTime()) ? new Date() : dDate;

          const condition = await tx.condition.create({
            data: {
              patientId,
              encounterId: primaryEncounterId,
              code: d.icd10Code || 'Z00.0',
              display: d.diagnosisName || 'Clinical Diagnosis',
              clinicalStatus: d.status === 'RESOLVED' ? 'RESOLVED' : d.status === 'CHRONIC' ? 'ACTIVE' : 'ACTIVE',
              verificationStatus: d.type === 'PROVISIONAL' ? 'PROVISIONAL' : 'CONFIRMED',
              onsetDateTime: validDDate,
              note: `Migrated from physical case file: ${d.diagnosisName}`,
              createdAt: validDDate
            }
          });
          createdConditions.push(condition);
        }
      }

      // 7. Insert Prescriptions (PharmacyPrescriptions, PharmacyPrescriptionItems, and eMAR Med Tracker)
      const createdEmarRecords: any[] = [];
      if (Array.isArray(prescriptions) && prescriptions.length > 0) {
        for (const p of prescriptions) {
          const rxDate = p.prescribedDate ? new Date(p.prescribedDate) : new Date();
          const validRxDate = isNaN(rxDate.getTime()) ? new Date() : rxDate;

          const genericDrugName = p.genericName || p.medicationName || 'Standard Medication';
          const cleanDrugSearch = genericDrugName.split('/')[0].trim();

          // 1. Match or Auto-Create Pharmacy Inventory Item / Data Dictionary
          let medItem = await tx.pharmacyInventoryItem.findFirst({
            where: {
              OR: [
                { genericName: { equals: genericDrugName, mode: 'insensitive' } },
                { brandName: { equals: p.medicationName, mode: 'insensitive' } },
                { genericName: { contains: cleanDrugSearch, mode: 'insensitive' } },
                { brandName: { contains: cleanDrugSearch, mode: 'insensitive' } }
              ]
            }
          });

          if (!medItem) {
            const shortCode = cleanDrugSearch.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'MED';
            const itemCode = `MED-${shortCode}-${Math.floor(100 + Math.random() * 900)}`;
            medItem = await tx.pharmacyInventoryItem.create({
              data: {
                itemCode,
                genericName: genericDrugName,
                brandName: p.medicationName || genericDrugName,
                classification: p.route === 'IV' ? 'Injectables / Infusions' : 'General Pharmacy',
                dosageForm: p.route === 'IV' ? 'IV Fluid/Vial' : p.route === 'IM' ? 'Injectable' : p.route === 'SC' ? 'Pre-filled Syringe' : 'Tablet/Capsule',
                strength: p.dosage || 'Standard',
                price: 500,
                unitOfMeasure: 'Unit',
                isActive: true
              }
            });
          }

          // 2. Create Pharmacy Prescription
          const rxNumber = `RX-MIG-${validRxDate.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
          const rx = await tx.pharmacyPrescription.create({
            data: {
              prescriptionNumber: rxNumber,
              patientId,
              prescribedById: defaultStaffId,
              visitId: primaryVisitId,
              encounterId: primaryEncounterId,
              status: 'COMPLETED',
              clinicalNotes: `Migrated prescription: ${p.medicationName} (${p.dosage} ${p.frequency} ${p.route || ''}) - Data Dictionary: ${medItem.genericName} [${medItem.itemCode}]`,
              orderedAt: validRxDate,
              verifiedAt: validRxDate,
              completedAt: validRxDate,
              createdAt: validRxDate
            }
          });
          createdPrescriptions.push(rx);

          // 3. Create Pharmacy Prescription Item (Dispensed & Linked to Data Dictionary)
          await tx.pharmacyPrescriptionItem.create({
            data: {
              prescriptionId: rx.id,
              medicationId: medItem.id,
              strength: p.dosage || 'Standard',
              dosageForm: p.route || 'Oral',
              dose: p.dosage || '1 dose',
              frequency: p.frequency || 'Daily',
              duration: p.duration || '5 days',
              route: p.route || 'Oral',
              quantityPrescribed: 10,
              quantityDispensed: 10,
              clinicalIndication: `Data Dictionary: ${medItem.genericName} (${medItem.itemCode})`,
              status: 'DISPENSED',
              createdAt: validRxDate
            }
          });

          // 4. Create eMAR Medication Administration Records for each documented time
          if (Array.isArray(p.administrationTimes) && p.administrationTimes.length > 0) {
            for (const adm of p.administrationTimes) {
              const admDateStr = `${adm.date}T${adm.time || '08:00'}:00.000Z`;
              const admDate = new Date(admDateStr);
              const validAdmDate = isNaN(admDate.getTime()) ? validRxDate : admDate;

              const emar = await tx.eMARRecord.create({
                data: {
                  patientId,
                  medicationName: `${medItem.genericName} (${p.medicationName})`,
                  dosage: p.dosage || adm.doseGiven || 'Standard',
                  route: p.route || 'IV',
                  scheduledTime: validAdmDate,
                  administeredTime: adm.status === 'ADMINISTERED' ? validAdmDate : null,
                  status: adm.status || 'ADMINISTERED',
                  administeredById: defaultStaffId,
                  notes: `Treatment Sheet Kardex Log (${adm.doseGiven || p.dosage || ''} by ${adm.givenBy || 'Staff Nurse'})`
                }
              });
              createdEmarRecords.push(emar);
            }
          } else {
            // Generate default eMAR entry
            const emar = await tx.eMARRecord.create({
              data: {
                patientId,
                medicationName: `${medItem.genericName} (${p.medicationName})`,
                dosage: p.dosage || 'Standard',
                route: p.route || 'Oral',
                scheduledTime: validRxDate,
                administeredTime: validRxDate,
                status: 'ADMINISTERED',
                administeredById: defaultStaffId,
                notes: `Migrated Treatment Card (${p.frequency || 'Routine dosing'})`
              }
            });
            createdEmarRecords.push(emar);
          }
        }
      }

      // 8. Insert Laboratory Investigations & Results (Mapped to Data Dictionary & LabTestCatalog)
      const createdLabOrders: any[] = [];
      const createdLabResults: any[] = [];
      if (Array.isArray(labInvestigations) && labInvestigations.length > 0) {
        for (const lab of labInvestigations) {
          const rawTestName = lab.testName || 'Routine Laboratory Investigation';
          const dictLookup = normalizeLabTest(
            rawTestName,
            lab.resultValue,
            lab.unit,
            lab.specimenType,
            lab.referenceRange
          );

          const testName = lab.standardTestName || dictLookup.standardTestName;
          const category = lab.category || dictLookup.category;
          const loincCode = lab.loincCode || dictLookup.loincCode;
          const specimenType = lab.specimenType || dictLookup.specimenType;
          const unit = lab.unit || dictLookup.unit;
          const referenceRange = lab.referenceRange || dictLookup.referenceRange;
          const interpretation = lab.interpretation || dictLookup.interpretation;
          const labDate = lab.orderedDate ? new Date(lab.orderedDate) : new Date();
          const validLabDate = isNaN(labDate.getTime()) ? new Date() : labDate;

          // 1. Match or Create LabTestCatalog entry (Data Dictionary)
          let testCatalog = await tx.labTestCatalog.findFirst({
            where: {
              OR: [
                { testName: { equals: testName, mode: 'insensitive' } },
                { loincCode: { equals: loincCode } },
                { testName: { equals: rawTestName, mode: 'insensitive' } }
              ]
            }
          });

          if (!testCatalog) {
            const shortCode = testName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'LAB';
            const testCode = dictLookup.dataDictionaryCode || `LAB-${shortCode}-${Math.floor(100 + Math.random() * 900)}`;
            testCatalog = await tx.labTestCatalog.create({
              data: {
                testCode,
                testName,
                category,
                specimenType,
                unit,
                referenceRange,
                loincCode,
                price: 0,
                turnaroundHours: 24,
                isActive: true
              }
            });
          }

          // 2. Create LabOrder (Status COMPLETED)
          const orderNumber = `LAB-MIG-${validLabDate.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
          const labOrder = await tx.labOrder.create({
            data: {
              orderNumber,
              patientId,
              requestedById: defaultStaffId,
              visitId: primaryVisitId,
              status: 'COMPLETED',
              paymentStatus: 'PAID',
              clinicalNotes: `Migrated Lab: ${testName} (LOINC: ${loincCode}) - ${lab.resultValue || ''}`,
              orderedAt: validLabDate,
              completedAt: validLabDate,
              createdAt: validLabDate
            }
          });
          createdLabOrders.push(labOrder);

          // 3. Create LabOrderItem
          const orderItem = await tx.labOrderItem.create({
            data: {
              orderId: labOrder.id,
              testId: testCatalog.id,
              status: 'COMPLETED',
              price: 0,
              createdAt: validLabDate
            }
          });

          // 4. Create LabResult
          const result = await tx.labResult.create({
            data: {
              orderItemId: orderItem.id,
              resultValue: lab.resultValue || 'Within normal limits',
              resultUnit: unit,
              referenceRange,
              interpretation,
              resultText: `${testName}: ${lab.resultValue || 'Recorded'} (${unit || ''}). Ref: ${referenceRange || 'Standard'}. Data Dictionary LOINC: ${loincCode}`,
              resultedAt: validLabDate,
              verifiedById: defaultStaffId,
              verifiedAt: validLabDate,
              validatedById: defaultStaffId,
              validatedAt: validLabDate,
              createdAt: validLabDate
            }
          });
          createdLabResults.push(result);
        }
      }

      // 9. Insert Allergies
      if (Array.isArray(allergies) && allergies.length > 0) {
        for (const a of allergies) {
          if (a.allergen && !a.allergen.toLowerCase().includes('no known') && !a.allergen.toLowerCase().includes('nkda')) {
            await tx.allergy.create({
              data: {
                patientId,
                allergen: a.allergen,
                category: a.category || 'Medication',
                status: 'ACTIVE',
                severity: a.severity || 'MODERATE',
                reaction: a.reaction || 'Reported on physical case folder'
              }
            });
          }
        }
      }

      // 10. Map ANC (Antenatal Care) Records
      const createdAncVisits: any[] = [];
      if (Array.isArray(ancRecords) && ancRecords.length > 0) {
        let pregnancy = await tx.pregnancyRecord.findFirst({
          where: { patientId, status: 'ACTIVE' }
        });
        if (!pregnancy) {
          pregnancy = await tx.pregnancyRecord.create({
            data: {
              patientId,
              gestationNumber: 1,
              lmpDate: new Date(),
              eddDate: new Date(Date.now() + 280 * 24 * 60 * 60 * 1000),
              status: 'ACTIVE'
            }
          });
        }
        for (const anc of ancRecords) {
          const ancDate = anc.visitDate ? new Date(anc.visitDate) : new Date();
          const validAncDate = isNaN(ancDate.getTime()) ? new Date() : ancDate;
          const nextDate = anc.nextVisitDate ? new Date(anc.nextVisitDate) : null;
          const validNextDate = nextDate && !isNaN(nextDate.getTime()) ? nextDate : null;

          const ancVisit = await tx.antenatalVisit.create({
            data: {
              pregnancyId: pregnancy.id,
              visitDate: validAncDate,
              gestationalWeeks: Number(anc.gestationalWeeks) || 28,
              weight: anc.weightKg ? Number(anc.weightKg) : null,
              systolic: anc.systolic ? Number(anc.systolic) : null,
              diastolic: anc.diastolic ? Number(anc.diastolic) : null,
              urineProtein: anc.urineProtein || 'Nil',
              urineGlucose: anc.urineGlucose || 'Nil',
              fundalHeight: anc.fundalHeight ? Number(anc.fundalHeight) : null,
              fetalPresentation: anc.fetalPresentation || 'Cephalic',
              fetalLie: anc.fetalLie || 'Longitudinal',
              fetalHeartRate: anc.fetalHeartRate ? Number(anc.fetalHeartRate) : 140,
              fetalMovement: anc.fetalMovement || 'Active',
              dangerSigns: anc.dangerSigns || 'None',
              educationTopics: anc.educationTopics || 'Birth Preparedness',
              nextVisitDate: validNextDate
            }
          });
          createdAncVisits.push(ancVisit);
        }
      }

      // 11. Map Radiology & Imaging Reports
      const createdRadiologyReports: any[] = [];
      if (Array.isArray(radiologyReports) && radiologyReports.length > 0) {
        for (const r of radiologyReports) {
          const rDate = r.examDate ? new Date(r.examDate) : new Date();
          const validRDate = isNaN(rDate.getTime()) ? new Date() : rDate;

          let catalogItem = await tx.radiologyImagingCatalogItem.findFirst({
            where: {
              OR: [
                { name: { equals: r.bodyPart || r.studyType, mode: 'insensitive' } },
                { modality: { equals: r.studyType, mode: 'insensitive' } }
              ]
            }
          });
          if (!catalogItem) {
            catalogItem = await tx.radiologyImagingCatalogItem.create({
              data: {
                code: `RAD-CAT-${Math.floor(100 + Math.random() * 900)}`,
                name: r.bodyPart ? `${r.studyType} - ${r.bodyPart}` : `${r.studyType} Imaging Examination`,
                modality: r.studyType || 'X_RAY',
                price: 5000,
                insuranceCovered: true
              }
            });
          }

          const orderNumber = r.orderNumber || `RAD-ORD-${validRDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const radOrder = await tx.radiologyOrder.create({
            data: {
              orderNumber,
              patientId,
              catalogItemId: catalogItem.id,
              requestedById: defaultStaffId,
              clinicalHistory: r.clinicalIndication || 'Historical Radiology Review',
              priority: r.criticalLevel || 'ROUTINE',
              status: 'COMPLETED',
              createdAt: validRDate,
              updatedAt: validRDate
            }
          });

          const rep = await tx.radiologyReport.create({
            data: {
              orderId: radOrder.id,
              reporterId: defaultStaffId,
              findings: r.findings || 'Radiological investigation findings documented.',
              impression: r.impression || 'Diagnostic Impression',
              recommendations: r.recommendations || 'Clinical correlation',
              criticalLevel: r.criticalLevel || 'ROUTINE',
              status: 'FINALIZED',
              createdAt: validRDate,
              verifiedAt: validRDate
            }
          });
          createdRadiologyReports.push(rep);
        }
      }

      // 12. Map Mortuary & Deceased Records
      const createdMortuaryRecords: any[] = [];
      if (Array.isArray(mortuaryRecords) && mortuaryRecords.length > 0) {
        for (const m of mortuaryRecords) {
          const dDate = m.dateOfDeath ? new Date(m.dateOfDeath) : new Date();
          const validDDate = isNaN(dDate.getTime()) ? new Date() : dDate;

          const mortNote = await tx.consultationNote.create({
            data: {
              patientId,
              authorId: defaultStaffId,
              subjective: `[Mortuary Record / Date of Death]: ${m.dateOfDeath} ${m.timeOfDeath || ''}\n[Cause of Death]: ${m.causeOfDeath}\n[Immediate Cause]: ${m.immediateCause || 'N/A'}\n[Antecedent Cause]: ${m.antecedentCause || 'N/A'}`,
              objective: `[Corpse Tag #]: ${m.corpseTagNumber || 'N/A'}\n[Mortuary Chamber]: ${m.mortuaryChamberNumber || 'Chamber 1'}\n[Date Brought In]: ${m.dateBroughtIn || m.dateOfDeath}`,
              assessment: `[Clinical Death Certified by]: ${m.certifyingDoctor || 'Attending Physician'}`,
              plan: `[Brought In By]: ${m.broughtInBy || 'Next of Kin'}\n[NOK Notified]: ${m.nextOfKinNotified ? 'YES' : 'NO'}\n[Notes]: ${m.notes || 'Deceased records transferred to digital repository'}`,
              signature: m.certifyingDoctor || 'Dr. Attending Physician',
              signedAt: validDDate,
              isFinalized: true,
              createdAt: validDDate,
              updatedAt: validDDate
            }
          });
          createdMortuaryRecords.push(mortNote);
        }
      }

      // 13. Map Pathology & Histology Reports
      const createdPathologyReports: any[] = [];
      if (Array.isArray(pathologyReports) && pathologyReports.length > 0) {
        for (const p of pathologyReports) {
          const pDate = p.collectionDate ? new Date(p.collectionDate) : new Date();
          const validPDate = isNaN(pDate.getTime()) ? new Date() : pDate;

          let pathCatalog = await tx.labTestCatalog.findFirst({
            where: {
              category: 'PATHOLOGY',
              testName: { equals: p.specimenType || 'Histopathology Specimen', mode: 'insensitive' }
            }
          });
          if (!pathCatalog) {
            pathCatalog = await tx.labTestCatalog.create({
              data: {
                testCode: `PATH-${Math.floor(100 + Math.random() * 900)}`,
                testName: p.specimenType ? `Histopathology: ${p.specimenType}` : 'Histopathology Biopsy Evaluation',
                category: 'PATHOLOGY',
                specimenType: p.specimenType || 'Biopsy Tissue',
                price: 0,
                isActive: true
              }
            });
          }

          const pathOrder = await tx.labOrder.create({
            data: {
              orderNumber: `PATH-ORD-${validPDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              patientId,
              requestedById: defaultStaffId,
              status: 'COMPLETED',
              clinicalNotes: `Specimen: ${p.specimenNumber || 'N/A'} (${p.anatomicalSite || 'Tissue'}). Clinical Dx: ${p.clinicalDiagnosis || ''}`,
              orderedAt: validPDate,
              completedAt: validPDate,
              createdAt: validPDate
            }
          });

          const pathItem = await tx.labOrderItem.create({
            data: {
              orderId: pathOrder.id,
              testId: pathCatalog.id,
              status: 'COMPLETED',
              price: 0,
              createdAt: validPDate
            }
          });

          const pathResult = await tx.labResult.create({
            data: {
              orderItemId: pathItem.id,
              resultValue: p.malignancyStatus || 'BENIGN',
              interpretation: p.malignancyStatus === 'MALIGNANT' ? 'ABNORMAL' : 'NORMAL',
              resultText: `[HISTOPATHOLOGICAL DIAGNOSIS]: ${p.histopathologicalDiagnosis}\n[MACROSCOPIC]: ${p.macroscopicDescription || 'N/A'}\n[MICROSCOPIC]: ${p.microscopicDescription || 'N/A'}\n[Pathologist]: ${p.pathologist || 'Consultant Pathologist'}`,
              resultedAt: validPDate,
              verifiedById: defaultStaffId,
              verifiedAt: validPDate,
              createdAt: validPDate
            }
          });
          createdPathologyReports.push(pathResult);
        }
      }

      // 14. Map Physiotherapy & Rehabilitation
      const createdPhysioRecords: any[] = [];
      if (Array.isArray(physiotherapyRecords) && physiotherapyRecords.length > 0) {
        for (const pt of physiotherapyRecords) {
          const ptDate = pt.sessionDate ? new Date(pt.sessionDate) : new Date();
          const validPtDate = isNaN(ptDate.getTime()) ? new Date() : ptDate;

          const ptNote = await tx.consultationNote.create({
            data: {
              patientId,
              authorId: defaultStaffId,
              subjective: `[Physiotherapy Chief Complaint]: ${pt.chiefComplaint || 'Pain/mobility limitation'}\n[Diagnosis]: ${pt.diagnosis || 'Musculoskeletal Rehabilitation'}`,
              objective: `[Assessment Findings]: ${pt.assessmentFindings || 'Physical evaluation conducted'}\n[Range of Motion]: ${pt.rangeOfMotion || 'Documented'}\n[Muscle Strength]: ${pt.muscleStrength || '5/5'}`,
              assessment: `[Rehabilitation Impression]: ${pt.diagnosis || 'Rehab Progress Recorded'}`,
              plan: `[Treatment Modalities]: ${pt.treatmentModalities || 'Manual & Exercise therapy'}\n[Prescribed Exercises]: ${pt.exercisesPrescribed || 'Home exercise program'}\n[Progress Notes]: ${pt.progressNotes || 'Tolerated well'}\n[Next Session]: ${pt.nextSessionDate || 'As scheduled'}`,
              signature: pt.physiotherapist || 'PT Attending Physiotherapist',
              signedAt: validPtDate,
              isFinalized: true,
              createdAt: validPtDate,
              updatedAt: validPtDate
            }
          });
          createdPhysioRecords.push(ptNote);
        }
      }

      // 15. Map Dental Records
      const createdDentalRecords: any[] = [];
      if (Array.isArray(dentalRecords) && dentalRecords.length > 0) {
        for (const d of dentalRecords) {
          const dDate = d.examDate ? new Date(d.examDate) : new Date();
          const validDDate = isNaN(dDate.getTime()) ? new Date() : dDate;

          const dentalEnc = await tx.dentalEncounter.create({
            data: {
              encounterNumber: `DENT-MIG-${validDDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              patientId,
              dentistId: defaultStaffId,
              dentistName: d.dentistName || 'Dr. Dental Surgeon',
              chiefComplaint: d.chiefComplaint || 'Dental examination',
              clinicalNotes: `Tooth: ${d.toothNumber || 'General'}. Condition: ${d.conditionFound || 'N/A'}. Procedure Done: ${d.procedureDone || 'N/A'}. Perio: ${d.periodontalStatus || 'Normal'}. Notes: ${d.clinicalNotes || ''}`,
              status: 'COMPLETED',
              createdAt: validDDate,
              updatedAt: validDDate
            }
          });

          const toothNum = parseInt(String(d.toothNumber).replace(/[^0-9]/g, ''), 10) || 11;
          await tx.dentalToothFinding.create({
            data: {
              dentalEncounterId: dentalEnc.id,
              toothNumber: toothNum > 0 && toothNum <= 48 ? toothNum : 11,
              diagnosis: d.conditionFound || 'Caries/Gingival issue',
              notes: `${d.procedureDone || 'Procedure'}: ${d.clinicalNotes || ''}`,
              status: 'TREATED',
              createdAt: validDDate,
              updatedAt: validDDate
            }
          });
          createdDentalRecords.push(dentalEnc);
        }
      }

      // 16. Map Eye Clinic & Ophthalmology
      const createdEyeRecords: any[] = [];
      if (Array.isArray(eyeClinicRecords) && eyeClinicRecords.length > 0) {
        for (const e of eyeClinicRecords) {
          const eDate = e.examDate ? new Date(e.examDate) : new Date();
          const validEDDate = isNaN(eDate.getTime()) ? new Date() : eDate;

          const eyeEnc = await tx.eyeEncounter.create({
            data: {
              encounterNumber: `EYE-MIG-${validEDDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              patientId,
              ophthalmologistId: defaultStaffId,
              ophthalmologistName: e.examinerName || 'Dr. Consultant Ophthalmologist',
              chiefComplaint: e.chiefComplaint || 'Visual acuity and ocular review',
              anteriorSegmentOD: e.anteriorSegmentOD || 'Normal',
              anteriorSegmentOS: e.anteriorSegmentOS || 'Normal',
              posteriorFundusOD: e.posteriorFundusOD || 'Optic disc healthy',
              posteriorFundusOS: e.posteriorFundusOS || 'Optic disc healthy',
              diagnosisOD: e.diagnosis || 'Refractive Error',
              diagnosisOS: e.diagnosis || 'Refractive Error',
              clinicalManagementPlan: `${e.managementPlan || 'Optical management'}\n[Prescription]: ${e.opticalPrescription || 'Standard'}`,
              status: 'COMPLETED',
              createdAt: validEDDate,
              updatedAt: validEDDate
            }
          });

          await tx.eyeRefractionExam.create({
            data: {
              eyeEncounterId: eyeEnc.id,
              vaDistanceOD: e.visualAcuityOD || '6/6',
              vaDistanceOS: e.visualAcuityOS || '6/6',
              notes: `Refraction: OD (${e.refractionOD || 'Plano'}), OS (${e.refractionOS || 'Plano'})`,
              createdAt: validEDDate
            }
          });

          const numIopOD = parseFloat(String(e.iopOD).replace(/[^0-9.]/g, '')) || 15.0;
          const numIopOS = parseFloat(String(e.iopOS).replace(/[^0-9.]/g, '')) || 15.0;
          await tx.eyeIopMeasurement.create({
            data: {
              eyeEncounterId: eyeEnc.id,
              patientId,
              iopOD: numIopOD,
              iopOS: numIopOS,
              notes: 'Goldmann applanation tonometry',
              createdAt: validEDDate
            }
          });

          createdEyeRecords.push(eyeEnc);
        }
      }

      // 17. Map Insurance & HMO Policies
      const createdInsuranceRecords: any[] = [];
      if (Array.isArray(insuranceRecords) && insuranceRecords.length > 0) {
        for (const ins of insuranceRecords) {
          const effDate = ins.effectiveDate ? new Date(ins.effectiveDate) : new Date('2026-01-01');
          const expDate = ins.expiryDate ? new Date(ins.expiryDate) : new Date('2026-12-31');

          const provCode = ins.providerName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'HMO';
          let prov = await tx.insuranceProvider.findFirst({
            where: {
              OR: [
                { name: { equals: ins.providerName, mode: 'insensitive' } },
                { code: { equals: provCode } }
              ]
            }
          });
          if (!prov) {
            prov = await tx.insuranceProvider.create({
              data: {
                name: ins.providerName,
                code: provCode,
                contactDetails: 'Managed Care Organization',
                isActive: true
              }
            });
          }

          let plan = await tx.insuranceBenefitPlan.findFirst({
            where: { providerId: prov.id }
          });
          if (!plan) {
            plan = await tx.insuranceBenefitPlan.create({
              data: {
                name: ins.planName || 'Comprehensive Health Coverage',
                providerId: prov.id,
                coverageNotes: ins.coveredServices || 'Outpatient, Inpatient, Drugs, Labs',
                copayPercentage: 0
              }
            });
          }

          const policy = await tx.patientInsurancePolicy.create({
            data: {
              patientId,
              providerId: prov.id,
              planId: plan.id,
              membershipNumber: ins.policyNumber || `POL-${Math.floor(10000 + Math.random() * 90000)}`,
              enrolleeNumber: ins.enrolleeNumber || null,
              effectiveDate: isNaN(effDate.getTime()) ? new Date('2026-01-01') : effDate,
              expiryDate: isNaN(expDate.getTime()) ? new Date('2026-12-31') : expDate,
              isActive: true,
              isPrimary: true
            }
          });
          createdInsuranceRecords.push(policy);

          if (ins.claimAmount && Number(ins.claimAmount) > 0) {
            await tx.claim.create({
              data: {
                patientId,
                policyId: policy.id,
                status: ins.approvalStatus === 'APPROVED' ? 'APPROVED' : 'PENDING',
                totalAmount: Number(ins.claimAmount),
                approvedAmount: ins.approvalStatus === 'APPROVED' ? Number(ins.claimAmount) : 0,
                createdAt: isNaN(effDate.getTime()) ? new Date() : effDate
              }
            });
          }
        }
      }

      // 18. Map Finance & Cashier Records
      const createdFinanceRecords: any[] = [];
      if (Array.isArray(financeRecords) && financeRecords.length > 0) {
        for (const f of financeRecords) {
          const fDate = f.transactionDate ? new Date(f.transactionDate) : new Date();
          const validFDate = isNaN(fDate.getTime()) ? new Date() : fDate;

          const finInv = await tx.invoice.create({
            data: {
              patientId,
              status: f.paymentStatus === 'PAID' || f.paymentStatus === 'CLEARED' ? 'PAID' : 'ISSUED',
              total: Number(f.amountDue) || Number(f.amountPaid) || 0,
              amountPaid: Number(f.amountPaid) || 0,
              reasonText: `[FINANCE LEDGER] Receipt #${f.receiptNumber || 'N/A'} (Method: ${f.paymentMethod || 'CASH'}, Revenue Head: ${f.revenueHead || 'General'}, Cashier: ${f.cashierName || 'Cashier'})`,
              createdAt: validFDate,
              updatedAt: validFDate
            }
          });
          createdFinanceRecords.push(finInv);
        }
      }

      // 19. Map Audit & Governance Records
      const createdAuditRecords: any[] = [];
      if (Array.isArray(auditRecords) && auditRecords.length > 0) {
        for (const aud of auditRecords) {
          const audDate = aud.auditDate ? new Date(aud.auditDate) : new Date();
          const validAudDate = isNaN(audDate.getTime()) ? new Date() : audDate;

          const auditEntry = await tx.auditLog.create({
            data: {
              userId: clerkUser?.id || null,
              action: 'CLINICAL_CHART_AUDIT',
              resourceType: 'PatientCaseNote',
              resourceId: patientId,
              changes: {
                auditorName: aud.auditorName,
                auditType: aud.auditType,
                complianceScorePercent: aud.complianceScorePercent,
                verificationStatus: aud.verificationStatus,
                deficienciesIdentified: aud.deficienciesIdentified,
                auditorRemarks: aud.auditorRemarks,
                auditDate: validAudDate
              },
              createdAt: validAudDate
            }
          });
          createdAuditRecords.push(auditEntry);
        }
      }

      // 20. Store Original Scanned Page Images in ClinicalAttachment
      if (Array.isArray(scannedPages) && scannedPages.length > 0) {
        for (let i = 0; i < scannedPages.length; i++) {
          const page = scannedPages[i];
          const pageUrl = page.dataUrl || (page as any);
          if (typeof pageUrl === 'string' && pageUrl.startsWith('data:image')) {
            const attachment = await tx.clinicalAttachment.create({
              data: {
                patientId,
                category: 'PHYSICAL_FOLDER_MIGRATION',
                title: page.label || `Case Folder Page ${i + 1}`,
                fileUrl: pageUrl,
                uploader: clerkUser?.username || 'RecordClerk'
              }
            });
            createdAttachments.push(attachment);
          }
        }
      }

      // 21. Main Audit Log
      await tx.auditLog.create({
        data: {
          userId: clerkUser?.id || null,
          action: 'MIGRATE_HOSPITAL_PAPER_FOLDER',
          resourceType: 'Patient',
          resourceId: patientId,
          changes: {
            patientNumber: targetPatient.patientNumber,
            fullName: `${targetPatient.firstName} ${targetPatient.lastName}`,
            familyNumber: patient.familyNumber || null,
            familyAccountId: targetPatient.familyAccountId || null,
            encountersCount: createdEncounters.length,
            vitalsCount: createdVitals.length,
            prescriptionsCount: createdPrescriptions.length,
            labsCount: createdLabResults.length,
            invoicesCount: createdInvoices.length,
            ancVisitsCount: createdAncVisits.length,
            radiologyCount: createdRadiologyReports.length,
            mortuaryCount: createdMortuaryRecords.length,
            pathologyCount: createdPathologyReports.length,
            physioCount: createdPhysioRecords.length,
            dentalCount: createdDentalRecords.length,
            eyeCount: createdEyeRecords.length,
            insuranceCount: createdInsuranceRecords.length,
            financeCount: createdFinanceRecords.length,
            auditCount: createdAuditRecords.length,
            attachmentsCount: createdAttachments.length,
            hospitalPreset: hospitalPreset || 'FAITH_FOUNDATION'
          }
        }
      });

      return {
        patient: targetPatient,
        familyAccount: familyAccountResult,
        encountersCreated: createdEncounters.length,
        vitalsCreated: createdVitals.length,
        consultationNotesCreated: createdNotes.length,
        diagnosesCreated: createdConditions.length,
        prescriptionsCreated: createdPrescriptions.length,
        emarRecordsCreated: createdEmarRecords.length,
        labsCreated: createdLabResults.length,
        invoicesCreated: createdInvoices.length,
        ancVisitsCreated: createdAncVisits.length,
        radiologyCreated: createdRadiologyReports.length,
        mortuaryCreated: createdMortuaryRecords.length,
        pathologyCreated: createdPathologyReports.length,
        physioCreated: createdPhysioRecords.length,
        dentalCreated: createdDentalRecords.length,
        eyeCreated: createdEyeRecords.length,
        insuranceCreated: createdInsuranceRecords.length,
        financeCreated: createdFinanceRecords.length,
        auditCreated: createdAuditRecords.length,
        scannedPagesArchived: createdAttachments.length
      };
    });

    return res.json({
      success: true,
      message: `🎉 Successfully migrated patient folder "${result.patient.firstName} ${result.patient.lastName}" (${result.patient.patientNumber}) across all clinical departments & data dictionary!`,
      data: result
    });
  } catch (err: any) {
    console.error('[RecordsMigration] Commit error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to commit folder migration to database'
    });
  }
});

// ── 4. GET /api/records-migration/history ───────────────────────────────────
router.get('/history', authMiddleware, superAdminGuard, async (req: Request, res: Response) => {
  try {
    const [totalMigratedAttachments, totalPatients, recentMigratedPatients] = await Promise.all([
      prisma.clinicalAttachment.count({
        where: { category: 'PHYSICAL_FOLDER_MIGRATION' }
      }),
      prisma.patient.count(),
      prisma.clinicalAttachment.findMany({
        where: { category: 'PHYSICAL_FOLDER_MIGRATION' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              patientNumber: true,
              firstName: true,
              lastName: true,
              gender: true,
              familyAccount: {
                select: { familyNumber: true }
              },
              createdAt: true
            }
          }
        }
      })
    ]);

    const distinctPatientIds = new Set(recentMigratedPatients.map(a => a.patientId));

    return res.json({
      success: true,
      stats: {
        totalScannedPagesArchived: totalMigratedAttachments,
        estimatedMigratedFolders: distinctPatientIds.size,
        totalHospitalPatients: totalPatients,
      },
      recentMigrations: recentMigratedPatients
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
