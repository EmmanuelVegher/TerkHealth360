import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { extractHospitalFolder, ExtractedFolderData } from '../utils/folderVisionExtractor.js';
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
// Multimodal AI Extraction for physical paper folder pages
router.post('/extract-folder', authMiddleware, superAdminGuard, async (req: any, res: Response) => {
  try {
    const { images, imageBase64 } = req.body;
    const imageList: string[] = Array.isArray(images) && images.length > 0
      ? images
      : imageBase64
      ? [imageBase64]
      : [];

    if (imageList.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one folder page image' });
    }

    const extracted = await extractHospitalFolder(imageList);

    // Check if patient number or name already exists in database
    let existingMatch = null;
    if (extracted.patient.folderNumber) {
      const matchByNum = await prisma.patient.findFirst({
        where: {
          patientNumber: { equals: extracted.patient.folderNumber, mode: 'insensitive' }
        },
        include: {
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
          existingVisitsCount: matchByNum.visits.length,
          existingVitalsCount: matchByNum.triageRecords.length,
          existingNotesCount: matchByNum.consultationNotes.length,
          matchType: 'EXACT_FOLDER_NUMBER'
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
          existingVisitsCount: matchByName.visits.length,
          matchType: 'NAME_MATCH'
        };
      }
    }

    return res.json({
      success: true,
      data: extracted,
      existingMatch
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
    const { folderNumber, firstName, lastName } = req.query as { folderNumber?: string; firstName?: string; lastName?: string };

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
      return res.json({ success: true, match: null });
    }

    const patient = await prisma.patient.findFirst({
      where: { OR: conditions },
      include: {
        visits: { take: 5, orderBy: { createdAt: 'desc' } },
        triageRecords: { take: 5, orderBy: { createdAt: 'desc' } },
        consultationNotes: { take: 5, orderBy: { createdAt: 'desc' } },
        conditions: { take: 5 }
      }
    });

    if (!patient) {
      return res.json({ success: true, match: null });
    }

    return res.json({
      success: true,
      match: {
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
        totalVisits: patient.visits.length,
        totalVitals: patient.triageRecords.length,
        totalNotes: patient.consultationNotes.length,
        totalConditions: patient.conditions.length
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. POST /api/records-migration/commit-migration ─────────────────────────
// Commits all verified clinical data into target tables atomically
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
      scannedPages,
      mergeOption, // 'CREATE_NEW' | 'MERGE_APPEND'
      existingPatientId
    } = req.body as {
      patient: ExtractedFolderData['patient'];
      vitals: ExtractedFolderData['vitals'];
      encounters: ExtractedFolderData['encounters'];
      diagnoses: ExtractedFolderData['diagnoses'];
      prescriptions: ExtractedFolderData['prescriptions'];
      labInvestigations: ExtractedFolderData['labInvestigations'];
      allergies: ExtractedFolderData['allergies'];
      scannedPages: Array<{ pageIndex: number; dataUrl: string; label?: string }>;
      mergeOption?: string;
      existingPatientId?: string;
    };

    if (!patient || !patient.firstName || !patient.lastName) {
      return res.status(400).json({ success: false, message: 'Patient firstName and lastName are required' });
    }

    // Determine staff id for authorizer/creator
    let clerkStaff = await prisma.staff.findFirst({
      where: { userId: clerkUser?.id }
    });
    if (!clerkStaff) {
      clerkStaff = await prisma.staff.findFirst();
    }
    const defaultStaffId = clerkStaff?.id || 'STAFF-MIGRATION-SYSTEM';

    const result = await prisma.$transaction(async (tx) => {
      let targetPatient: any = null;

      // 1. Resolve Patient Record
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
        // Check if patientNumber is already taken, if so, generate a unique variation
        let finalPatientNumber = patient.folderNumber || `FFH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
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

      const patientId = targetPatient.id;
      const createdVisits: any[] = [];
      const createdEncounters: any[] = [];
      const createdVitals: any[] = [];
      const createdNotes: any[] = [];
      const createdConditions: any[] = [];
      const createdPrescriptions: any[] = [];
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
              subjective: `[Chief Complaint]: ${enc.chiefComplaint || 'N/A'}\n\n[History of Present Illness]: ${enc.historyOfPresentIllness || 'Historical presentation.'}`,
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

      // If no encounters were created but there are vitals, create at least 1 historical visit to anchor them
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

      // 3. Insert Time-Series Vitals (TriageRecords & Observations)
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

      // 4. Insert Diagnoses (Conditions)
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

      // 5. Insert Prescriptions (PharmacyPrescriptions)
      if (Array.isArray(prescriptions) && prescriptions.length > 0) {
        for (const p of prescriptions) {
          const rxDate = p.prescribedDate ? new Date(p.prescribedDate) : new Date();
          const validRxDate = isNaN(rxDate.getTime()) ? new Date() : rxDate;

          const rxNumber = `RX-MIG-${validRxDate.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
          const rx = await tx.pharmacyPrescription.create({
            data: {
              prescriptionNumber: rxNumber,
              patientId,
              prescribedById: defaultStaffId,
              visitId: primaryVisitId,
              encounterId: primaryEncounterId,
              status: 'COMPLETED',
              clinicalNotes: `Migrated prescription: ${p.medicationName} (${p.dosage} ${p.frequency} ${p.route || ''}) - ${p.instructions || ''}`,
              orderedAt: validRxDate,
              verifiedAt: validRxDate,
              completedAt: validRxDate,
              createdAt: validRxDate
            }
          });
          createdPrescriptions.push(rx);
        }
      }

      // 6. Insert Allergies
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

      // 7. Store Original Scanned Page Images in ClinicalAttachment for Audit & Medicolegal trail
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

      // 8. Audit Log
      await tx.auditLog.create({
        data: {
          userId: clerkUser?.id || null,
          action: 'MIGRATE_HOSPITAL_PAPER_FOLDER',
          resourceType: 'Patient',
          resourceId: patientId,
          changes: {
            patientNumber: targetPatient.patientNumber,
            fullName: `${targetPatient.firstName} ${targetPatient.lastName}`,
            encountersCount: createdEncounters.length,
            vitalsCount: createdVitals.length,
            diagnosesCount: createdConditions.length,
            prescriptionsCount: createdPrescriptions.length,
            attachmentsCount: createdAttachments.length
          }
        }
      });

      return {
        patient: targetPatient,
        encountersCreated: createdEncounters.length,
        vitalsCreated: createdVitals.length,
        consultationNotesCreated: createdNotes.length,
        diagnosesCreated: createdConditions.length,
        prescriptionsCreated: createdPrescriptions.length,
        scannedPagesArchived: createdAttachments.length
      };
    });

    return res.json({
      success: true,
      message: `🎉 Successfully migrated patient folder "${result.patient.firstName} ${result.patient.lastName}" (${result.patient.patientNumber})!`,
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
// Returns migration statistics and recent batches
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
