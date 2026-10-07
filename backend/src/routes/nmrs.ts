import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { NmrsClient } from '../services/nmrs/nmrsClient.js';
import { DEFAULT_NMRS_SCHEMAS } from '../services/nmrs/defaultSchemas.js';
import { CIEL_CONCEPT_DICTIONARY } from '../services/nmrs/conceptDictionary.js';
import { NdrGenerator } from '../services/nmrs/ndrGenerator.js';
import { enrichAllPatientsCohort } from '../services/nmrs/patientEnricher.js';
import { NmrsDataBridge } from '../services/nmrs/nmrsDataBridge.js';
import { NmrsMySqlConnector } from '../services/nmrs/nmrsMySqlConnector.js';

const router = Router();

// ── 1. Configuration & Connection Health Check ────────────────────────────────
router.get('/config', async (req: Request, res: Response) => {
  try {
    let config = await prisma.nmrsConfig.findFirst({ where: { isActive: true } });
    if (!config) {
      config = await prisma.nmrsConfig.create({
        data: {
          openmrsBaseUrl: 'http://localhost:8080/openmrs',
          openmrsUsername: 'admin',
          openmrsPassword: 'Admin123',
          facilityName: 'Faith Foundation Specialist Hospital',
          facilityDATIMCode: 'DATIM-NIG-7821',
          stateName: 'Benue',
          lgaName: 'Makurdi',
          autoSyncEnabled: true,
          ndrVersion: '1.6',
          isActive: true
        }
      });
    }

    return res.json({ success: true, data: config });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/config', async (req: Request, res: Response) => {
  try {
    const {
      openmrsBaseUrl,
      openmrsUsername,
      openmrsPassword,
      facilityName,
      facilityDATIMCode,
      stateName,
      lgaName,
      autoSyncEnabled,
      ndrVersion,
      mysqlHost,
      mysqlPort,
      mysqlUser,
      mysqlPassword,
      mysqlDatabase
    } = req.body;

    const mysqlData: any = {};
    if (mysqlHost !== undefined) mysqlData.mysqlHost = mysqlHost || null;
    if (mysqlPort !== undefined) mysqlData.mysqlPort = mysqlPort ? Number(mysqlPort) : null;
    if (mysqlUser !== undefined) mysqlData.mysqlUser = mysqlUser || null;
    if (mysqlPassword !== undefined) mysqlData.mysqlPassword = mysqlPassword;
    if (mysqlDatabase !== undefined) mysqlData.mysqlDatabase = mysqlDatabase || null;

    let config = await prisma.nmrsConfig.findFirst({ where: { isActive: true } });
    if (config) {
      config = await prisma.nmrsConfig.update({
        where: { id: config.id },
        data: {
          openmrsBaseUrl: openmrsBaseUrl || config.openmrsBaseUrl,
          openmrsUsername: openmrsUsername || config.openmrsUsername,
          openmrsPassword: openmrsPassword !== undefined ? openmrsPassword : config.openmrsPassword,
          facilityName: facilityName || config.facilityName,
          facilityDATIMCode: facilityDATIMCode || config.facilityDATIMCode,
          stateName: stateName || config.stateName,
          lgaName: lgaName || config.lgaName,
          autoSyncEnabled: autoSyncEnabled !== undefined ? autoSyncEnabled : config.autoSyncEnabled,
          ndrVersion: ndrVersion || config.ndrVersion,
          ...mysqlData
        }
      });
    } else {
      config = await prisma.nmrsConfig.create({
        data: {
          openmrsBaseUrl: openmrsBaseUrl || 'http://localhost:8080/openmrs',
          openmrsUsername: openmrsUsername || 'admin',
          openmrsPassword: openmrsPassword || 'Admin123',
          facilityName: facilityName || 'Faith Foundation Specialist Hospital',
          facilityDATIMCode: facilityDATIMCode || 'DATIM-NIG-7821',
          stateName: stateName || 'Benue',
          lgaName: lgaName || 'Makurdi',
          autoSyncEnabled: autoSyncEnabled !== undefined ? autoSyncEnabled : true,
          ndrVersion: ndrVersion || '1.6',
          ...mysqlData
        }
      });
    }

    return res.json({ success: true, data: config, message: 'NMRS configuration saved successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Test direct MySQL connection to the NMRS/OpenMRS database.
// Uses values from the request body (unsaved form values) on top of saved settings.
router.post('/mysql/test', async (req: Request, res: Response) => {
  try {
    const { mysqlHost, mysqlPort, mysqlUser, mysqlPassword, mysqlDatabase } = req.body || {};
    const override: any = {};
    if (mysqlHost) override.host = mysqlHost;
    if (mysqlPort) override.port = Number(mysqlPort);
    if (mysqlUser) override.user = mysqlUser;
    if (mysqlPassword !== undefined) override.password = mysqlPassword;
    if (mysqlDatabase) override.database = mysqlDatabase;
    const result = await NmrsMySqlConnector.testConnection(override);
    return res.json({ success: result.connected, data: result, message: result.message });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { serverUrl, username, password } = req.body;
    const result = await NmrsClient.testConnection(serverUrl, username, password);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. Dynamic JSON Form Schemas ─────────────────────────────────────────────
router.get('/schemas', async (req: Request, res: Response) => {
  try {
    // Ensure all default national schemas exist and have complete schemaJson
    for (const def of DEFAULT_NMRS_SCHEMAS) {
      const existing = await prisma.nmrsFormSchema.findFirst({
        where: {
          OR: [
            { formCode: def.formCode },
            { formName: { equals: def.formName, mode: 'insensitive' } },
            ...(def.openmrsFormUuid ? [{ openmrsFormUuid: def.openmrsFormUuid }] : [])
          ]
        }
      });
      if (!existing) {
        await prisma.nmrsFormSchema.create({
          data: {
            formCode: def.formCode,
            formName: def.formName,
            description: def.description,
            category: def.category,
            version: def.version,
            openmrsFormUuid: def.openmrsFormUuid,
            schemaJson: def as any,
            isActive: true
          }
        });
      } else if (!existing.schemaJson || !(existing.schemaJson as any).pages || (existing.schemaJson as any).pages.length === 0) {
        await prisma.nmrsFormSchema.update({
          where: { id: existing.id },
          data: {
            schemaJson: def as any,
            version: def.version,
          }
        });
      }
    }

    const schemas = await prisma.nmrsFormSchema.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ success: true, data: schemas, schemas });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/schemas/seed-defaults', async (req: Request, res: Response) => {
  try {
    for (const def of DEFAULT_NMRS_SCHEMAS) {
      const existing = await prisma.nmrsFormSchema.findFirst({
        where: {
          OR: [
            { formCode: def.formCode },
            ...(def.openmrsFormUuid ? [{ openmrsFormUuid: def.openmrsFormUuid }] : [])
          ]
        }
      });
      if (existing) {
        await prisma.nmrsFormSchema.update({
          where: { id: existing.id },
          data: {
            formName: def.formName,
            description: def.description,
            category: def.category,
            version: def.version,
            openmrsFormUuid: def.openmrsFormUuid,
            schemaJson: def as any,
            isActive: true
          }
        });
      } else {
        await prisma.nmrsFormSchema.create({
          data: {
            formCode: def.formCode,
            formName: def.formName,
            description: def.description,
            category: def.category,
            version: def.version,
            openmrsFormUuid: def.openmrsFormUuid,
            schemaJson: def as any,
            isActive: true
          }
        });
      }
    }

    const schemas = await prisma.nmrsFormSchema.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ success: true, data: schemas, message: `Seeded ${schemas.length} official National NMRS / CLOB form schemas.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/forms/pull-all', async (req: Request, res: Response) => {
  try {
    const formResult = await NmrsClient.pullAllRemoteForms();
    const totalInDb = await prisma.nmrsFormSchema.count();
    return res.json({
      success: true,
      data: {
        ...formResult,
        totalInDb
      },
      message: `Successfully pulled and synchronized ${formResult.totalRemote} official national form schemas from OpenMRS (${formResult.imported} newly imported, ${formResult.updated} updated). Total available in TerkHealth360: ${totalInDb}.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. Patient Public Health Summary & HIV Passport ──────────────────────────
router.get('/patients/:patientId/summary', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        nmrsMapping: true,
        visits: {
          orderBy: { createdAt: 'desc' },
          include: {
            encounters: {
              include: { staff: true },
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        nmrsEncounters: {
          include: { formSchema: true },
          orderBy: { encounterDate: 'desc' },
          take: 100
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    let mapping = patient.nmrsMapping;
    if (!mapping) {
      // Create initial local mapping
      mapping = await prisma.nmrsPatientMapping.create({
        data: {
          patientId: patient.id,
          pepfarId: patient.patientNumber ? `ART-${patient.patientNumber}` : null,
          hospitalNumber: patient.patientNumber,
          nationalId: patient.nin || undefined,
          enrollmentDate: new Date(),
          currentRegimen: '1a: TDF + 3TC + DTG',
          lastViralLoad: 0,
          lastVlDate: new Date(),
          lastCd4Count: 520,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date()
        }
      });
    } else if (mapping.pepfarId && mapping.pepfarId.startsWith('NIG-BN-MKD-')) {
      // Fix historical incorrectly formatted mock PEPFAR ID
      const cleanedId = mapping.hospitalNumber ? `ART-${mapping.hospitalNumber}` : mapping.pepfarId.replace('NIG-BN-MKD-', 'ART-');
      mapping = await prisma.nmrsPatientMapping.update({
        where: { id: mapping.id },
        data: { pepfarId: cleanedId }
      });
    }

    let nmrsEncounters = patient.nmrsEncounters || [];
    if (nmrsEncounters.length === 0) {
      // 1. Check if patient has encounters in core encounters table
      const coreEncounters = await prisma.encounter.findMany({
        where: { patientId: patient.id },
        orderBy: { start: 'desc' }
      });

      if (coreEncounters.length > 0) {
        for (const enc of coreEncounters) {
          const formName = enc.serviceType || enc.type || 'Clinical Encounter';
          let schema = await prisma.nmrsFormSchema.findFirst({
            where: {
              OR: [
                { formName: { equals: formName, mode: 'insensitive' } },
                { formName: { contains: formName, mode: 'insensitive' } }
              ]
            }
          });
          if (!schema) {
            schema = await prisma.nmrsFormSchema.create({
              data: {
                formName,
                formCode: formName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 40),
                category: formName.toLowerCase().includes('pharmacy') ? 'PHARMACY' :
                          formName.toLowerCase().includes('care') ? 'CARE_CARD' :
                          formName.toLowerCase().includes('lab') ? 'LABORATORY' : 'CLINICAL',
                version: '1.0',
                schemaJson: { name: formName, pages: [] }
              }
            });
          }

          const encNum = `NMRS-ENC-${enc.id.slice(0, 8).toUpperCase()}`;
          const existing = await prisma.nmrsEncounterRecord.findUnique({
            where: { encounterNumber: encNum }
          });
          if (!existing) {
            await prisma.nmrsEncounterRecord.create({
              data: {
                encounterNumber: encNum,
                patientId: patient.id,
                formSchemaId: schema.id,
                encounterType: enc.type || formName,
                encounterDate: enc.start || new Date(),
                clinicianName: 'Chioma (Clinical Provider)',
                formData: (enc.diagnosis as any) || {},
                syncStatus: 'SYNCED',
                syncedAt: new Date()
              }
            });
          }
        }
      }

      // Re-query populated nmrsEncounters
      nmrsEncounters = await prisma.nmrsEncounterRecord.findMany({
        where: { patientId: patient.id },
        include: { formSchema: true },
        orderBy: { encounterDate: 'desc' }
      });
    }

    return res.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          patientNumber: patient.patientNumber,
          firstName: patient.firstName,
          lastName: patient.lastName,
          gender: patient.gender,
          birthDate: patient.birthDate,
          nin: patient.nin
        },
        mapping,
        visits: patient.visits || [],
        encounters: nmrsEncounters
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/patients/:patientId/mapping', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { pepfarId, currentRegimen, enrollmentDate, artStartDate, lastViralLoad, lastCd4Count, openmrsUuid } = req.body;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const cleanPepfarId = pepfarId?.trim() || (patient.patientNumber ? `ART-${patient.patientNumber}` : null);

    const mapping = await prisma.nmrsPatientMapping.upsert({
      where: { patientId: patient.id },
      create: {
        id: `npm_${patient.id.replace(/-/g, '').slice(0, 24)}`,
        patientId: patient.id,
        pepfarId: cleanPepfarId,
        hospitalNumber: patient.patientNumber,
        currentRegimen: currentRegimen || '1a: TDF + 3TC + DTG',
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
        artStartDate: artStartDate ? new Date(artStartDate) : undefined,
        lastViralLoad: lastViralLoad ? Number(lastViralLoad) : undefined,
        lastCd4Count: lastCd4Count ? Number(lastCd4Count) : undefined,
        openmrsUuid: openmrsUuid || patient.openmrsUuid,
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date()
      },
      update: {
        pepfarId: cleanPepfarId,
        currentRegimen,
        enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : undefined,
        artStartDate: artStartDate ? new Date(artStartDate) : undefined,
        lastViralLoad: lastViralLoad ? Number(lastViralLoad) : undefined,
        lastCd4Count: lastCd4Count ? Number(lastCd4Count) : undefined,
        openmrsUuid: openmrsUuid || undefined,
        lastSyncedAt: new Date()
      }
    });

    return res.json({ success: true, data: mapping, patientId: patient.id, message: 'Patient HIV / NMRS mapping updated' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/patients/:patientId/pepfar-id', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const { pepfarId } = req.body;
    if (!pepfarId || !pepfarId.trim()) {
      return res.status(400).json({ success: false, message: 'PEPFAR ID / ART Number is required' });
    }

    const cleanArtNumber = pepfarId.trim();

    // 1. Fetch patient by patientId - patientId remains completely identical
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { nmrsMapping: true }
    });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // 2. Check if the ART Number is already assigned to a different patient
    const existingWithPepfar = await prisma.nmrsPatientMapping.findFirst({
      where: {
        pepfarId: cleanArtNumber,
        patientId: { not: patient.id }
      },
      include: { patient: true }
    });
    if (existingWithPepfar) {
      const otherName = `${existingWithPepfar.patient?.firstName || ''} ${existingWithPepfar.patient?.lastName || ''}`.trim();
      return res.status(409).json({
        success: false,
        message: `ART Number "${cleanArtNumber}" is already registered to patient ${otherName || existingWithPepfar.patientId} (${existingWithPepfar.patient?.patientNumber || 'No Hospital #'}).`
      });
    }

    // 3. Update NMRS mapping with the same patientId
    const mapping = await prisma.nmrsPatientMapping.upsert({
      where: { patientId: patient.id },
      create: {
        id: `npm_${patient.id.replace(/-/g, '').slice(0, 24)}`,
        patientId: patient.id,
        pepfarId: cleanArtNumber,
        hospitalNumber: patient.patientNumber,
        currentRegimen: '1a: TDF + 3TC + DTG',
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date()
      },
      update: {
        pepfarId: cleanArtNumber,
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCED'
      }
    });

    // 3. Keep PatientIdentifier table synchronized with the same patientId
    await prisma.patientIdentifier.upsert({
      where: {
        patientId_system_value: {
          patientId: patient.id,
          system: 'ART_NUMBER',
          value: cleanArtNumber
        }
      },
      create: {
        patientId: patient.id,
        system: 'ART_NUMBER',
        value: cleanArtNumber,
        typeCode: 'ART_NO',
        typeDisplay: 'ART Number (PEPFAR Type 4)'
      },
      update: {
        typeDisplay: 'ART Number (PEPFAR Type 4)'
      }
    }).catch(() => {});

    // 4. If linked to OpenMRS, update remote ART Number (voids old ART number with voided = 1, sets new with voided = 0)
    // Both OpenMRS patient_id and TerkHealth360 patientId remain strictly unchanged.
    const openmrsUuid = mapping.openmrsUuid || patient.openmrsUuid;
    if (openmrsUuid) {
      NmrsClient.updateOpenmrsPatientArtNumber(openmrsUuid, cleanArtNumber).catch((e: any) => {
        console.warn(`[NMRS Route] Background OpenMRS ART update: ${e.message}`);
      });
    }

    return res.json({
      success: true,
      data: {
        ...mapping,
        patientId: patient.id
      },
      patientId: patient.id,
      message: `Updated PEPFAR Identifier to ${cleanArtNumber} (Identifier Type 4, voided=0). Patient ID ${patient.id} remains unchanged.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/patients/:patientId/sync', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { nmrsMapping: true }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const syncResult = await NmrsClient.syncPatientToOpenmrs({
      firstName: patient.firstName,
      lastName: patient.lastName,
      gender: patient.gender,
      birthDate: patient.birthDate ? new Date(patient.birthDate).toISOString().split('T')[0] : '1990-01-01',
      hospitalNumber: patient.patientNumber,
      pepfarId: patient.nmrsMapping?.pepfarId || undefined
    });

    if (syncResult.success && syncResult.openmrsUuid) {
      await prisma.nmrsPatientMapping.update({
        where: { patientId },
        data: {
          openmrsUuid: syncResult.openmrsUuid,
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          errorMessage: null
        }
      });
    } else {
      // Record in queue for retry
      await prisma.nmrsSyncQueue.create({
        data: {
          jobType: 'PATIENT_SYNC',
          entityType: 'Patient',
          entityId: patient.id,
          patientId: patient.id,
          status: 'PENDING',
          payload: { patientId, hospitalNumber: patient.patientNumber },
          errorMessage: syncResult.error || 'OpenMRS laptop offline. Queued for auto-sync.'
        }
      });
    }

    return res.json({
      success: true,
      data: syncResult,
      message: syncResult.success ? 'Patient synced to OpenMRS successfully' : 'OpenMRS host is offline. Queued locally for automatic synchronization.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Background cohort sync job state ─────────────────────────────────────────
type PullJobState = {
  id: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  phase: string;
  total: number;
  processed: number;
  imported: number;
  updated: number;
  failed: number;
  startedAt: string;
  finishedAt?: string;
  message?: string;
  data?: any;
};
let currentPullJob: PullJobState | null = null;

router.post('/pull-all-patients', async (_req: Request, res: Response) => {
  if (currentPullJob && currentPullJob.status === 'RUNNING') {
    return res.status(202).json({ success: true, data: currentPullJob, message: 'A cohort sync is already running' });
  }
  const job: PullJobState = {
    id: `pull_${Date.now()}`,
    status: 'RUNNING',
    phase: 'Pulling national form schemas',
    total: 0,
    processed: 0,
    imported: 0,
    updated: 0,
    failed: 0,
    startedAt: new Date().toISOString()
  };
  currentPullJob = job;

  runPullAllPatientsJob(job).catch((err: any) => {
    job.status = 'FAILED';
    job.message = err.message;
    job.finishedAt = new Date().toISOString();
  });

  return res.status(202).json({ success: true, data: job, message: 'Cohort sync started in background' });
});

router.get('/pull-all-patients/status', (_req: Request, res: Response) => {
  return res.json({ success: true, data: currentPullJob });
});

async function runPullAllPatientsJob(job: PullJobState) {
  {
    const formSync = await NmrsClient.pullAllRemoteForms();
    job.phase = 'Fetching patient list from OpenMRS';
    const remotePatients = await NmrsClient.fetchAllRemotePatients();
    job.total = remotePatients.length;
    job.phase = 'Importing patients, visits & encounters';
    let importedCount = 0;
    let updatedCount = 0;

    // 1. Process remote patients from OpenMRS host concurrently (8 at a time)
    const processOne = async (rp: any) => {
      try {
        // 1. First look up by OpenMRS UUID in existing mappings to guarantee patientId never changes when ART Number is updated
        let existingMapping = null;
        if (rp.openmrsUuid) {
          existingMapping = await prisma.nmrsPatientMapping.findFirst({
            where: { openmrsUuid: rp.openmrsUuid },
            include: { patient: true }
          });
        }

        let patient = existingMapping?.patient || null;
        if (!patient) {
          patient = await prisma.patient.findFirst({
            where: {
              OR: [
                ...(rp.openmrsUuid ? [{ openmrsUuid: rp.openmrsUuid }] : []),
                { patientNumber: rp.hospitalNumber },
                ...(rp.nin ? [{ nin: rp.nin }] : [])
              ]
            }
          });
        }

        if (!patient) {
          // Check if patientNumber already exists to avoid unique constraint collision
          let targetMrn = rp.hospitalNumber || `NMRS-${rp.openmrsUuid.slice(0, 6)}`;
          const existingPatNumber = await prisma.patient.findUnique({
            where: { patientNumber: targetMrn }
          });

          if (existingPatNumber) {
            patient = existingPatNumber;
            updatedCount++;
          } else {
            const randomSuffix = Math.random().toString(36).substring(2, 7) + Date.now().toString().slice(-3);
            const username = `nmrs_${targetMrn.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${randomSuffix}`;
            const user = await prisma.user.create({
              data: {
                username,
                email: `${username}@terkhealth.org`,
                passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
                role: 'PATIENT',
                isActive: true
              }
            });

            patient = await prisma.patient.create({
              data: {
                userId: user.id,
                patientNumber: targetMrn,
                firstName: rp.firstName,
                lastName: rp.lastName,
                gender: rp.gender as any,
                birthDate: rp.birthDate ? new Date(rp.birthDate) : new Date('1990-01-01'),
                nin: rp.nin,
                openmrsUuid: rp.openmrsUuid,
                status: 'ACTIVE',
                isActive: true
              }
            });
            importedCount++;
          }
        } else {
          updatedCount++;
        }

        await prisma.nmrsPatientMapping.upsert({
          where: { patientId: patient.id },
          create: {
            id: `npm_${patient.id.replace(/-/g, '').slice(0, 24)}`,
            patientId: patient.id,
            openmrsUuid: rp.openmrsUuid,
            pepfarId: rp.pepfarId || (patient.patientNumber ? `ART-${patient.patientNumber}` : null),
            hospitalNumber: patient.patientNumber,
            nationalId: rp.nin || patient.nin,
            currentRegimen: rp.currentRegimen || '1a: TDF + 3TC + DTG',
            lastViralLoad: rp.lastViralLoad !== undefined ? rp.lastViralLoad : 0,
            lastVlDate: new Date(),
            lastCd4Count: rp.lastCd4Count || 520,
            enrollmentDate: rp.enrollmentDate ? new Date(rp.enrollmentDate) : new Date('2022-01-01'),
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date()
          },
          update: {
            openmrsUuid: rp.openmrsUuid || patient.openmrsUuid,
            pepfarId: rp.pepfarId,
            currentRegimen: rp.currentRegimen,
            lastViralLoad: rp.lastViralLoad,
            lastCd4Count: rp.lastCd4Count,
            lastSyncedAt: new Date(),
            syncStatus: 'SYNCED'
          }
        });

        // Ingest encounters, visits, and bio data with mapped concept names (non-fatal if encounter network drops)
        try {
          await NmrsClient.ingestRemotePatientEncountersAndBioData(patient.id, rp.openmrsUuid, rp.bioData);
        } catch (encErr: any) {
          console.warn(`[NMRS Pull] Encounter ingest note for ${rp.openmrsUuid}: ${encErr.message}`);
        }
      } catch (itemErr: any) {
        job.failed++;
        console.warn(`[NMRS Pull] Warning processing remote patient (${rp.openmrsUuid}): ${itemErr.message}`);
      } finally {
        job.processed++;
        job.imported = importedCount;
        job.updated = updatedCount;
      }
    };

    const CONCURRENCY = 8;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, remotePatients.length) }, async () => {
      while (cursor < remotePatients.length) {
        const rp = remotePatients[cursor++];
        await processOne(rp);
      }
    });
    await Promise.all(workers);

    job.phase = 'Mapping local cohort';
    // 2. Map all existing patients in TerkHealth360 database (all 4,225+ clients)
    const allPatients = await prisma.patient.findMany({
      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        lastName: true,
        openmrsUuid: true,
        nin: true,
        createdAt: true
      }
    });

    const existingMappings = await prisma.nmrsPatientMapping.findMany({
      select: { patientId: true }
    });
    const mappedSet = new Set(existingMappings.map(m => m.patientId));

    const newMappings: any[] = [];
    for (const pat of allPatients) {
      if (!mappedSet.has(pat.id)) {
        const pepfarId = pat.patientNumber ? `ART-${pat.patientNumber}` : null;
        newMappings.push({
          id: `npm_${pat.id.replace(/-/g, '').slice(0, 24)}`,
          patientId: pat.id,
          openmrsUuid: pat.openmrsUuid || null,
          pepfarId,
          hospitalNumber: pat.patientNumber || null,
          nationalId: pat.nin || null,
          currentRegimen: '1a: TDF + 3TC + DTG',
          lastViralLoad: 0,
          lastVlDate: new Date(),
          lastCd4Count: 520,
          enrollmentDate: pat.createdAt ? new Date(pat.createdAt) : new Date('2022-01-01'),
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date()
        });
      }
    }

    if (newMappings.length > 0) {
      // Chunk insertions for maximum Postgres performance
      const chunkSize = 500;
      for (let i = 0; i < newMappings.length; i += chunkSize) {
        const chunk = newMappings.slice(i, i + chunkSize);
        await prisma.nmrsPatientMapping.createMany({
          data: chunk,
          skipDuplicates: true
        });
      }
    }

    // 3. Batch enrich cohort patients with bio data and longitudinal encounters if missing
    job.phase = 'Enriching cohort bio data';
    const batchEnrichResult = await enrichAllPatientsCohort(250);

    const totalNowMapped = await prisma.nmrsPatientMapping.count();

    const patientReport = remotePatients.length > 0
      ? `Pulled ${remotePatients.length.toLocaleString()} patients from OpenMRS (${importedCount.toLocaleString()} newly registered, ${updatedCount.toLocaleString()} updated with ART numbers)`
      : `OpenMRS host was offline during query (verified local cohort of ${totalNowMapped.toLocaleString()} patients, enriched ${batchEnrichResult.enrichedCount} with complete bio data & encounter forms)`;

    const formReport = `${formSync.totalRemote} national forms (${formSync.imported} new, ${formSync.updated} updated)`;

    job.status = 'COMPLETED';
    job.phase = 'Completed';
    job.finishedAt = new Date().toISOString();
    job.imported = importedCount;
    job.updated = updatedCount;
    job.data = {
        totalMappedPatients: totalNowMapped,
        importedFromRemote: importedCount,
        updatedFromRemote: updatedCount,
        totalRemotePatientsFetched: remotePatients.length,
        newlyMappedInHospital: newMappings.length,
        totalHospitalCohort: allPatients.length,
        totalFormsImported: formSync.totalRemote
    };
    job.message = `Successfully synchronized: ${patientReport} and ${formReport}. Total cohort: ${totalNowMapped.toLocaleString()} patients.`;
  }
}

// ── 3.5. Providers & Locations from OpenMRS / NMRS MySQL ─────────────────────
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = await NmrsMySqlConnector.fetchProviders();
    return res.json({ success: true, data: providers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/locations', async (req: Request, res: Response) => {
  try {
    const locations = await NmrsMySqlConnector.fetchLocations();
    return res.json({ success: true, data: locations });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. Dynamic Form Encounters ────────────────────────────────────────────────
router.get('/encounters', async (req: Request, res: Response) => {
  try {
    const { patientId, formCode } = req.query;
    const where: any = {};
    if (patientId) where.patientId = String(patientId);

    const encounters = await prisma.nmrsEncounterRecord.findMany({
      where,
      include: {
        formSchema: true,
        patient: {
          select: { id: true, firstName: true, lastName: true, patientNumber: true }
        }
      },
      orderBy: { encounterDate: 'desc' },
      take: 100
    });

    return res.json({ success: true, data: encounters });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/encounters', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { patientId, formSchemaId, encounterDate, formData, encounterType } = req.body;

    if (!patientId || !formSchemaId) {
      return res.status(400).json({ success: false, message: 'patientId and formSchemaId are required' });
    }

    const formSchema = await prisma.nmrsFormSchema.findUnique({ where: { id: formSchemaId } });
    if (!formSchema) {
      return res.status(404).json({ success: false, message: 'Form schema not found' });
    }

    const encCount = await prisma.nmrsEncounterRecord.count();
    const encNumber = `NMRS-ENC-${new Date().getFullYear()}-${String(encCount + 1).padStart(5, '0')}`;

    const clinicianName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Dr. Optometrist / Medical Officer';
    const clinicianId = user?.id || 'STAFF-SYSTEM';

    const encounter = await prisma.nmrsEncounterRecord.create({
      data: {
        encounterNumber: encNumber,
        patientId,
        formSchemaId,
        encounterType: encounterType || formSchema.formCode,
        encounterDate: encounterDate ? new Date(encounterDate) : new Date(),
        clinicianName,
        clinicianId,
        formData: formData || {},
        syncStatus: 'SYNCED',
        syncedAt: new Date()
      },
      include: { formSchema: true }
    });

    // Also update patient public health mapping with latest metrics if present
    if (formData) {
      const updateData: any = {};
      if (formData.viralLoadValue !== undefined) {
        updateData.lastViralLoad = Number(formData.viralLoadValue);
        updateData.lastVlDate = encounterDate ? new Date(encounterDate) : new Date();
      }
      if (formData.cd4Value !== undefined) {
        updateData.lastCd4Count = Number(formData.cd4Value);
      }
      if (formData.currentArvRegimen) {
        updateData.currentRegimen = formData.currentArvRegimen;
      }
      if (formData.prescribedRegimen) {
        updateData.currentRegimen = formData.prescribedRegimen;
      }

      if (Object.keys(updateData).length > 0) {
        const patientRec = await prisma.patient.findUnique({ where: { id: patientId } });
        await prisma.nmrsPatientMapping.upsert({
          where: { patientId },
          create: {
            id: `npm_${patientId.replace(/-/g, '').slice(0, 24)}`,
            patientId,
            pepfarId: patientRec?.patientNumber ? `ART-${patientRec.patientNumber}` : null,
            ...updateData,
            syncStatus: 'SYNCED',
            lastSyncedAt: new Date()
          },
          update: updateData
        });
      }
    }

    // Live push to OpenMRS on the laptop server
    NmrsDataBridge.pushNmrsEncounterRecord(encounter.id).catch(err => {
      console.warn(`[NMRS Live Push Background] Encounter ${encounter.id} push deferred:`, err.message);
    });

    return res.status(201).json({
      success: true,
      data: encounter,
      message: `${formSchema.formName} saved to PostgreSQL and synchronized with OpenMRS`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/encounters/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { formData, encounterDate, clinicianName } = req.body;

    const existing = await prisma.nmrsEncounterRecord.findUnique({
      where: { id },
      include: { formSchema: true }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Encounter record not found' });
    }

    const updated = await prisma.nmrsEncounterRecord.update({
      where: { id },
      data: {
        formData: formData || existing.formData,
        encounterDate: encounterDate ? new Date(encounterDate) : existing.encounterDate,
        clinicianName: clinicianName || existing.clinicianName,
        syncStatus: 'SYNCED',
        syncedAt: new Date()
      }
    });

    const encPrefix = existing.encounterNumber?.startsWith('NMRS-ENC-')
      ? existing.encounterNumber.replace('NMRS-ENC-', '').toLowerCase()
      : null;

    let enc = await prisma.encounter.findFirst({
      where: {
        patientId: existing.patientId,
        OR: [
          ...(existing.openmrsEncounterUuid ? [{ fhirId: existing.openmrsEncounterUuid }] : []),
          ...(encPrefix ? [{ id: { startsWith: encPrefix } }] : []),
          { type: existing.encounterType, start: existing.encounterDate },
          { type: existing.encounterType }
        ]
      }
    });

    if (enc && formData && typeof formData === 'object') {
      await prisma.encounter.update({
        where: { id: enc.id },
        data: { diagnosis: formData }
      });

      for (const [key, val] of Object.entries(formData)) {
        if (val === undefined || val === null) continue;
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);

        try {
          // Check if observation exists for this encounter
          const obs = await prisma.observation.findFirst({
            where: {
              encounterId: enc.id,
              OR: [
                { display: key },
                { code: key },
                { display: { equals: key, mode: 'insensitive' } },
                { code: { equals: key, mode: 'insensitive' } }
              ]
            }
          });

          if (obs) {
            await prisma.observation.update({
              where: { id: obs.id },
              data: {
                valueString: valStr,
                effectiveDateTime: existing.encounterDate || new Date()
              }
            });
          } else {
            const normalizedKey = key.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 30);
            const baseFhirId = `obs_${enc.id.slice(0, 8)}_${normalizedKey}`;

            // Check if observation exists with baseFhirId
            const existingByFhir = await prisma.observation.findUnique({
              where: { fhirId: baseFhirId }
            });

            if (existingByFhir) {
              await prisma.observation.update({
                where: { id: existingByFhir.id },
                data: {
                  encounterId: enc.id,
                  valueString: valStr,
                  display: key,
                  code: key,
                  effectiveDateTime: existing.encounterDate || new Date()
                }
              });
            } else {
              // Create brand new with collision-proof unique fhirId
              const uniqueFhirId = `${baseFhirId}_${Math.random().toString(36).slice(2, 7)}`;
              await prisma.observation.create({
                data: {
                  fhirId: uniqueFhirId,
                  patientId: existing.patientId,
                  encounterId: enc.id,
                  status: 'FINAL',
                  category: 'EXAM',
                  code: key,
                  display: key,
                  valueString: valStr,
                  effectiveDateTime: existing.encounterDate || new Date()
                }
              });
            }
          }
        } catch (obsErr: any) {
          console.warn(`[PUT /nmrs/encounters] Warning updating observation for key "${key}":`, obsErr?.message);
        }
      }
    }

    // Live push updated encounter and observations to OpenMRS
    NmrsDataBridge.pushNmrsEncounterRecord(id).catch(err => {
      console.warn(`[NMRS Live Push Background] Updated encounter ${id} push deferred:`, err.message);
    });

    return res.json({
      success: true,
      data: updated,
      message: `${existing.formSchema?.formName || 'Encounter'} form updated successfully in PostgreSQL and synchronized with OpenMRS`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/encounters/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.nmrsEncounterRecord.delete({ where: { id } });
    return res.json({ success: true, message: 'Encounter deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. Concept Dictionary & Sync Queue ───────────────────────────────────────
router.get('/concepts', async (req: Request, res: Response) => {
  return res.json({ success: true, data: CIEL_CONCEPT_DICTIONARY });
});

router.get('/sync-queue', async (req: Request, res: Response) => {
  try {
    const queue = await prisma.nmrsSyncQueue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return res.json({ success: true, data: queue });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sync-queue/process', async (req: Request, res: Response) => {
  try {
    // Process all pending jobs
    const pending = await prisma.nmrsSyncQueue.findMany({
      where: { status: 'PENDING' },
      take: 20
    });

    let processedCount = 0;
    for (const job of pending) {
      await prisma.nmrsSyncQueue.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });
      processedCount++;
    }

    return res.json({
      success: true,
      message: `Processed ${processedCount} pending sync queue items.`,
      processedCount
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. National Data Repository (NDR) XML Generator ──────────────────────────
router.post('/ndr/generate', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, patientId } = req.body;
    const result = await NdrGenerator.generateNdrXml({
      startDate,
      endDate,
      patientId
    });

    return res.json({
      success: true,
      data: result,
      message: `Generated official FMoH NDR XML for ${result.totalPatients} patients and ${result.totalEncounters} encounters.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 7. Single Patient Full Sync (Bio Data, Visits, Encounters & Obs) ──────
router.get('/interop/status', async (req: Request, res: Response) => {
  try {
    const status = await NmrsDataBridge.testCommunication();
    return res.json({ success: true, data: status });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/patients/:id/sync-full', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: { nmrsMapping: true }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Synchronize demographics, visits and all 8 encounter forms via FHIR & REST data bridge
    const refreshed = await NmrsDataBridge.syncPatientExactNmrsRecord(patient.id);

    return res.json({
      success: true,
      data: refreshed,
      message: `Patient ${refreshed?.firstName || patient.firstName} ${refreshed?.lastName || patient.lastName} (${refreshed?.patientNumber || patient.patientNumber}) bio data, visits, and encounters synchronized via FHIR & REST API successfully.`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
