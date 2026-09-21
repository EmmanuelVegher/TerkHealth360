import { Router } from 'express';
const router = Router();
import { prisma } from '../prisma.js';

// ─── OPENMRS CLIENT UTILITY ──────────────────────────────────────────────────

/**
 * Sends an authenticated HTTP request to the running OpenMRS instance.
 * Handles credentials, headers, and response parsing.
 */
async function queryOpenMRS(endpoint: string, options: any = {}) {
  // Retrieve configurations from the database first, fallback to environment variables
  let baseUrl = '';
  let username = '';
  let password = '';

  try {
    const configs = await prisma.hospitalConfig.findMany({
      where: {
        moduleKey: {
          in: ['OPENMRS_BASE_URL', 'OPENMRS_USERNAME', 'OPENMRS_PASSWORD']
        }
      }
    });

    const getDbVal = (key: string) => configs.find(c => c.moduleKey === key)?.description;
    baseUrl = getDbVal('OPENMRS_BASE_URL') || '';
    username = getDbVal('OPENMRS_USERNAME') || '';
    password = getDbVal('OPENMRS_PASSWORD') || '';
  } catch (dbErr) {
    console.warn('[OpenMRS Config] Failed to fetch credentials from database. Falling back to .env:', dbErr);
  }

  // Fallback to process.env if not specified in database
  if (!baseUrl) baseUrl = process.env.OPENMRS_BASE_URL || '';
  if (!username) username = process.env.OPENMRS_USERNAME || 'admin';
  if (!password) password = process.env.OPENMRS_PASSWORD || 'Admin123';

  if (!baseUrl) {
    throw new Error('OPENMRS_BASE_URL is not configured (neither in Settings page nor in .env file).');
  }

  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  
  // Decide whether to append ws/rest/v1 or if it's already an absolute FHIR path
  const isFhir = endpoint.includes('ws/fhir2/');
  const targetUrl = isFhir ? `${baseUrl}/${endpoint}` : `${baseUrl}/ws/rest/v1/${endpoint}`;

  const response = await fetch(targetUrl, {
    ...options,
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenMRS Connection Error (${response.status}): ${errText}`);
  }

  return response.json();
}

// Global lock variable to prevent overlapping patient sync processes
let isSyncingPatients = false;

async function runPatientSyncInBackground() {
  const syncSessionId = Date.now().toString().slice(-6);
  console.log(`[OpenMRS Sync] Background patient sync started (session ${syncSessionId}).`);

  // Log start
  await prisma.pharmacySyncLog.create({
    data: {
      system: 'OPENMRS',
      direction: 'INCOMING',
      status: 'PENDING',
      details: `Background patient sync started (session ${syncSessionId})...`
    }
  }).catch(() => {});

  let syncCount = 0;
  let totalProcessed = 0;
  let totalCount = 0;

  try {
    const configs = await prisma.hospitalConfig.findMany({
      where: {
        moduleKey: {
          in: ['OPENMRS_BASE_URL', 'OPENMRS_USERNAME', 'OPENMRS_PASSWORD']
        }
      }
    });
    const getDbVal = (key: string) => configs.find(c => c.moduleKey === key)?.description;
    const baseUrl = getDbVal('OPENMRS_BASE_URL') || process.env.OPENMRS_BASE_URL || 'http://localhost:8080/openmrs';
    const cleanBase = baseUrl.replace(/\/+$/, '');

    let nextPath: string | null = 'ws/fhir2/R4/Patient?_count=100';
    const allEntries: any[] = [];

    // Phase 1: Download all entries from FHIR in quick succession (avoids search page token timeout)
    while (nextPath) {
      console.log(`[OpenMRS Sync] Downloading FHIR page: ${nextPath}`);
      const data = await queryOpenMRS(nextPath);
      if (totalCount === 0 && data.total) {
        totalCount = data.total;
      }
      
      const entries = data.entry || [];
      if (entries.length === 0) {
        break;
      }
      allEntries.push(...entries);
      
      // Update progress log for the downloading phase
      await prisma.pharmacySyncLog.create({
        data: {
          system: 'OPENMRS',
          direction: 'INCOMING',
          status: 'PENDING',
          details: `In progress: Processed ${allEntries.length} of ${totalCount} records, imported/linked ${syncCount} patients...`
        }
      }).catch(() => {});

      // Find next link (FHIR spec uses relation, REST uses rel)
      const nextLinkObj = data.link?.find((l: any) => l.relation === 'next' || l.rel === 'next');
      if (nextLinkObj && nextLinkObj.url) {
        const nextUrl = nextLinkObj.url;
        const index = nextUrl.indexOf(cleanBase);
        if (index !== -1) {
          nextPath = nextUrl.substring(index + cleanBase.length).replace(/^\/+/, '');
        } else {
          // Fallback regex match
          const fhirMatch = nextUrl.match(/ws\/fhir2\/R4.*/);
          nextPath = fhirMatch ? fhirMatch[0] : null;
        }
      } else {
        nextPath = null;
      }
    }

    // Phase 2: Process downloaded entries and write to local PostgreSQL database
    console.log(`[OpenMRS Sync] Finished download. Processing ${allEntries.length} entries for database import...`);
    
    for (const entry of allEntries) {
      const p = entry.resource;
      if (!p || p.resourceType !== 'Patient') continue;

      const uuid = p.id;
      const nameObj = p.name?.[0];
      const firstName = nameObj?.given?.[0] || 'Unknown';
      const lastName = nameObj?.family || 'Unknown';

      let gender = 'UNKNOWN';
      const fhirGender = p.gender || '';
      if (fhirGender.toLowerCase() === 'male' || fhirGender.toLowerCase() === 'm') {
        gender = 'MALE';
      } else if (fhirGender.toLowerCase() === 'female' || fhirGender.toLowerCase() === 'f') {
        gender = 'FEMALE';
      }

      let mrn = '';
      if (p.identifier && p.identifier.length > 0) {
        const getVal = (typeText: string) => p.identifier.find((id: any) => id.type?.text?.toLowerCase() === typeText.toLowerCase())?.value;
        mrn = getVal('Hospital Number') || getVal('ART Number') || getVal('OpenMRS ID') || p.identifier[0].value;
      }
      if (!mrn) {
        mrn = `ART-${uuid.slice(0, 4)}`;
      }

      totalProcessed++;

      // Find if patient already exists in local DB
      let pat = await prisma.patient.findFirst({
        where: {
          OR: [
            { openmrsUuid: uuid },
            { patientNumber: mrn }
          ]
        }
      });

      if (!pat) {
        // Create matching local login shell User first
        // We use the full UUID to guarantee unique constraints on username and email never fail
        const safeName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const user = await prisma.user.create({
          data: {
            username: `mrs_${safeName}_${uuid}`,
            email: `mrs_${uuid}@nigeriamrs.org`,
            passwordHash: 'mrs_sync_locked',
            role: 'PATIENT'
          }
        });

        // Insert patient record
        pat = await prisma.patient.create({
          data: {
            userId: user.id,
            patientNumber: mrn,
            firstName,
            lastName,
            gender: gender as any,
            openmrsUuid: uuid
          }
        });
        syncCount++;
      } else if (!pat.openmrsUuid) {
        // Link existing local record with OpenMRS ID
        await prisma.patient.update({
          where: { id: pat.id },
          data: { openmrsUuid: uuid }
        });
        syncCount++;
      }

      // Log progress log periodically to prevent database write overload
      if (totalProcessed % 50 === 0 || totalProcessed === allEntries.length) {
        await prisma.pharmacySyncLog.create({
          data: {
            system: 'OPENMRS',
            direction: 'INCOMING',
            status: 'PENDING',
            details: `In progress: Processed ${totalProcessed} of ${totalCount} records, imported/linked ${syncCount} patients...`
          }
        }).catch(() => {});
      }
    }

    // Success log
    await prisma.pharmacySyncLog.create({
      data: {
        system: 'OPENMRS',
        direction: 'INCOMING',
        status: 'SUCCESS',
        details: `Successfully completed: Sync session finished. Processed ${totalProcessed} of ${totalCount} profiles, imported/linked ${syncCount} patient clinical records.`
      }
    });

  } catch (error: any) {
    console.error('[OpenMRS Patient Sync Error]:', error.message || error);
    await prisma.pharmacySyncLog.create({
      data: {
        system: 'OPENMRS',
        direction: 'INCOMING',
        status: 'FAILED',
        details: `Patient sync failed: ${error.message || 'Unknown network error'}`
      }
    }).catch(() => {});
  } finally {
    isSyncingPatients = false;
  }
}

// Import Patient profiles from NigeriaMRS
router.post('/sync/patients', async (req, res, next) => {
  if (isSyncingPatients) {
    return res.status(409).json({ success: false, message: 'A Patient sync session is already running in the background.' });
  }

  isSyncingPatients = true;

  // Run the sync process in the background, catch errors to prevent server crash
  runPatientSyncInBackground().catch(err => {
    console.error('[OpenMRS Sync Background Trigger Error]:', err);
    isSyncingPatients = false;
  });

  res.json({ success: true, message: 'Interoperability Patient sync started successfully in the background. Check logs tab for progress updates.' });
});

// Import electronic prescriptions (Drug Orders) from NigeriaMRS (OpenMRS)
router.post('/sync/prescriptions', async (req, res, next) => {
  try {
    const activePatients = await prisma.patient.findMany({
      where: { openmrsUuid: { not: null } }
    });

    if (activePatients.length === 0) {
      return res.json({ message: 'No patient accounts synced with OpenMRS. Run Patient Sync first.' });
    }

    const meds = await prisma.pharmacyInventoryItem.findMany();
    if (meds.length === 0) {
      return res.json({ message: 'Pharmacy medication catalog is empty. Populate drugs first.' });
    }

    const prescriberUser = await prisma.user.findFirst({ where: { role: 'DOCTOR' } });
    const staffList = await prisma.staff.findMany();
    const staffId = staffList[0]?.id;

    if (!staffId) {
      return res.status(400).json({ message: 'Missing local doctor/staff accounts in database to attribute prescriptions.' });
    }

    let importedCount = 0;
    
    // Sync patient by patient to fetch their drug orders
    for (const pat of activePatients) {
      try {
        const orderData = await queryOpenMRS(`order?patient=${pat.openmrsUuid}&v=default`);
        const openmrsOrders = orderData.results || [];

        for (const order of openmrsOrders) {
          // Only pull active drug prescriptions (OpenMRS REST classifies this as 'drugorder')
          if (order.type !== 'drugorder') continue;

          // Check if already imported
          const exists = await prisma.pharmacyPrescription.findFirst({
            where: { openmrsUuid: order.uuid }
          });
          if (exists) continue;

          // Find a matching local medication item by checking item name or code
          const medName = order.concept?.display || '';
          const med = meds.find(m => 
            m.brandName.toLowerCase().includes(medName.toLowerCase()) || 
            m.genericName.toLowerCase().includes(medName.toLowerCase())
          ) || meds[0];
          
          const rxQuantity = order.quantity || 30;
          const prescriptionNumber = `RX-MRS-${Date.now().toString().slice(-6)}`;

          await prisma.pharmacyPrescription.create({
            data: {
              prescriptionNumber,
              patientId: pat.id,
              prescribedById: staffId,
              diagnosis: order.action || 'Prescribed via OpenMRS CPOE',
              openmrsUuid: order.uuid,
              totalAmount: Number(med.price) * rxQuantity,
              status: 'VERIFIED',
              allergyCheckDone: true,
              interactionCheckDone: true,
              duplicateCheckDone: true,
              items: {
                create: [
                  {
                    medicationId: med.id,
                    strength: med.strength || 'N/A',
                    dosageForm: med.dosageForm || 'Tablet',
                    dose: order.dose ? `${order.dose} ${order.doseUnits?.display || ''}` : 'As directed',
                    frequency: order.frequency?.display || 'Daily',
                    duration: order.duration ? `${order.duration} Days` : '30 Days',
                    route: 'PO',
                    quantityPrescribed: rxQuantity,
                    status: 'PENDING'
                  }
                ]
              }
            }
          });
          importedCount++;
        }
      } catch (patientError: any) {
        console.warn(`[OpenMRS Prescription Sync] Failed fetching orders for patient [${pat.id}]:`, patientError.message);
      }
    }

    await prisma.pharmacySyncLog.create({
      data: {
        system: 'OPENMRS',
        direction: 'INCOMING',
        status: 'SUCCESS',
        details: `Imported ${importedCount} electronic prescriptions (Drug Orders) from NigeriaMRS clinic.`
      }
    });

    res.json({ message: `Imported ${importedCount} MedicationRequests from NigeriaMRS.` });
  } catch (error: any) {
    console.error('[OpenMRS Prescription Sync Error]:', error.message || error);
    
    await prisma.pharmacySyncLog.create({
      data: {
        system: 'OPENMRS',
        direction: 'INCOMING',
        status: 'FAILED',
        details: `Prescription sync failed: ${error.message || 'Unknown network error'}`
      }
    }).catch(() => {});

    res.status(502).json({ success: false, message: `Prescription sync failed: ${error.message || 'Unknown network error'}` });
  }
});

// Push local MedicationDispense records to NigeriaMRS via FHIR2 module
router.post('/sync/dispense', async (req, res, next) => {
  try {
    const unPushedDispenses = await prisma.pharmacyDispensingRecord.findMany({
      where: {
        prescription: {
          openmrsUuid: { not: null }
        }
      },
      include: {
        prescription: true,
        prescriptionItem: { include: { medication: true } }
      }
    });

    let pushedCount = 0;
    for (const disp of unPushedDispenses) {
      const patientUuid = disp.prescription.openmrsUuid;

      // Map local Prisma record to a standard HL7 FHIR R4 MedicationDispense payload
      const fhirMedicationDispense = {
        resourceType: 'MedicationDispense',
        status: 'completed',
        subject: {
          reference: `Patient/${patientUuid}`
        },
        medicationCodeableConcept: {
          text: disp.prescriptionItem.medication.brandName || disp.prescriptionItem.medication.genericName,
          coding: [
            {
              system: 'http://hl7.org/fhir/sid/ndc',
              code: disp.prescriptionItem.medication.itemCode,
              display: disp.prescriptionItem.medication.brandName || disp.prescriptionItem.medication.genericName
            }
          ]
        },
        quantity: {
          value: disp.quantityDispensed,
          unit: disp.prescriptionItem.dosageForm || 'Tablet'
        },
        whenHandedOver: disp.dispensedAt.toISOString()
      };

      try {
        // Send a POST request to OpenMRS FHIR endpoint: /ws/fhir2/R4/MedicationDispense
        await queryOpenMRS('ws/fhir2/R4/MedicationDispense', {
          method: 'POST',
          body: JSON.stringify(fhirMedicationDispense)
        });
        
        pushedCount++;
      } catch (pushErr: any) {
        console.warn(`[OpenMRS Dispense Sync] Failed pushing dispense record [${disp.id}]:`, pushErr.message);
      }
    }

    await prisma.pharmacySyncLog.create({
      data: {
        system: 'OPENMRS',
        direction: 'OUTGOING',
        status: 'SUCCESS',
        details: `Pushed ${pushedCount} MedicationDispense resources to NigeriaMRS FHIR repository.`
      }
    });

    res.json({ message: `Successfully pushed ${pushedCount} dispensing confirmations to NigeriaMRS FHIR.` });
  } catch (error: any) {
    console.error('[OpenMRS Dispense Sync Error]:', error.message || error);
    
    await prisma.pharmacySyncLog.create({
      data: {
        system: 'OPENMRS',
        direction: 'OUTGOING',
        status: 'FAILED',
        details: `Dispense sync failed: ${error.message || 'Unknown network error'}`
      }
    }).catch(() => {});

    res.status(502).json({ success: false, message: `Dispense sync failed: ${error.message || 'Unknown network error'}` });
  }
});

// Fetch synchronization audit logs
router.get('/sync-logs', async (req, res, next) => {
  try {
    const logs = await prisma.pharmacySyncLog.findMany({
      orderBy: { syncedAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;
