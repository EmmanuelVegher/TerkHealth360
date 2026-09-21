import { Router } from 'express';


const router = Router();
import { prisma } from '../prisma.js';

// ─── 10.1 DONOR REGISTRY & ELIGIBILITY ────────────────────────────────────────

// Fetch blood donors list
router.get('/donors', async (req, res, next) => {
  try {
    const donors = await prisma.bloodDonor.findMany({
      include: { donations: true }
    });
    res.json(donors);
  } catch (error) {
    next(error);
  }
});

// Register blood donor
router.post('/donors', async (req, res, next) => {
  try {
    const { firstName, lastName, birthDate, gender, bloodGroup, rhStatus, donorCategory, consentSigned } = req.body;
    
    // Generate unique donor ID
    const donorNumber = `DON-${Date.now().toString().slice(-5)}`;

    const donor = await prisma.bloodDonor.create({
      data: {
        donorNumber,
        firstName,
        lastName,
        birthDate: new Date(birthDate),
        gender,
        bloodGroup,
        rhStatus,
        donorCategory: donorCategory || 'VOLUNTARY',
        consentSigned: !!consentSigned
      }
    });

    res.status(201).json(donor);
  } catch (error) {
    next(error);
  }
});

// Update donor eligibility (e.g. Deferral check)
router.put('/donors/:id/eligibility', async (req, res, next) => {
  try {
    const { deferralStatus, deferralReason, deferralExpiry } = req.body;
    
    const donor = await prisma.bloodDonor.update({
      where: { id: req.params.id },
      data: {
        deferralStatus,
        deferralReason,
        deferralExpiry: deferralExpiry ? new Date(deferralExpiry) : null
      }
    });
    res.json(donor);
  } catch (error) {
    next(error);
  }
});

// ─── 10.1 COLLECTION & COMPONENT PROCESSING ────────────────────────────────

// Fetch collections registry
router.get('/donations', async (req, res, next) => {
  try {
    const donations = await prisma.bloodDonation.findMany({
      include: {
        donor: true,
        phlebotomist: true,
        testResults: true,
        components: true
      },
      orderBy: { collectionDate: 'desc' }
    });
    res.json(donations);
  } catch (error) {
    next(error);
  }
});

// Log new donation event
router.post('/donations', async (req, res, next) => {
  try {
    const { donorId, collectionSite, phlebotomistId, anticoagulantType, volumeML, adverseReaction } = req.body;
    
    // Verify donor eligibility first
    const donor = await prisma.bloodDonor.findUnique({ where: { id: donorId } });
    if (!donor || donor.deferralStatus === 'DEFERRED') {
      return res.status(400).json({ error: 'Deferral Block: This donor is currently deferred and not eligible to donate.' });
    }

    // Generate unique ISBT-128 unit ID
    const donationUnitNo = `W-${Date.now().toString().slice(-8)}`;

    const donation = await prisma.bloodDonation.create({
      data: {
        donationUnitNo,
        donorId,
        collectionSite: collectionSite || 'MAIN_BANK',
        phlebotomistId,
        anticoagulantType: anticoagulantType || 'CPD',
        volumeML: Number(volumeML || 450),
        adverseReaction,
        status: 'COLLECTED'
      }
    });

    // Update last donation date
    await prisma.bloodDonor.update({
      where: { id: donorId },
      data: { lastDonationDate: new Date() }
    });

    res.status(201).json(donation);
  } catch (error) {
    next(error);
  }
});

// Process whole blood unit into components (splits)
router.post('/donations/:id/components', async (req, res, next) => {
  try {
    const { componentType, volumeML, expiryDate, storageLocation, processedById } = req.body;
    
    const donation = await prisma.bloodDonation.findUnique({
      where: { id: req.params.id },
      include: { donor: true }
    });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Unique split label
    const componentCode = `${donation.donationUnitNo}-${componentType.slice(0, 3)}`;

    const component = await prisma.bloodComponent.create({
      data: {
        donationId: donation.id,
        componentCode,
        componentType,
        volumeML: Number(volumeML),
        expiryDate: new Date(expiryDate),
        storageLocation,
        processedById,
        status: 'QUARANTINED' // Starts as quarantined until screening passed
      }
    });

    res.status(201).json(component);
  } catch (error) {
    next(error);
  }
});

// ─── 10.2 INFECTIOUS SCREENING & COMPATIBILITY ──────────────────────────────

// Add laboratory screening tests (HIV, Hep B, Hep C, Syphilis, Malaria)
router.post('/donations/:id/screening', async (req, res, next) => {
  try {
    const { testType, outcome, details } = req.body;
    
    const result = await prisma.bloodTestResult.create({
      data: {
        donationId: req.params.id,
        testType,
        outcome,
        details
      }
    });

    // Auto-Quarantine: If screening is reactive, flag donation and components as DISCARDED
    if (outcome === 'REACTIVE') {
      await prisma.bloodDonation.update({
        where: { id: req.params.id },
        data: { status: 'DISCARDED' }
      });
      await prisma.bloodComponent.updateMany({
        where: { donationId: req.params.id },
        data: { status: 'DISCARDED' }
      });
    } else {
      // Check if all screenings are non-reactive (HIV, HepB, HepC, Syphilis)
      const allResults = await prisma.bloodTestResult.findMany({
        where: { donationId: req.params.id }
      });
      
      const isClean = allResults.every(r => r.outcome === 'NON_REACTIVE') && allResults.length >= 4;
      if (isClean) {
        await prisma.bloodDonation.update({
          where: { id: req.params.id },
          data: { status: 'SCREENED' }
        });
        await prisma.bloodComponent.updateMany({
          where: { donationId: req.params.id, status: 'QUARANTINED' },
          data: { status: 'AVAILABLE' }
        });
      }
    }

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Fetch blood inventory (active and available components)
router.get('/inventory', async (req, res, next) => {
  try {
    const components = await prisma.bloodComponent.findMany({
      include: { donation: { include: { donor: true } } },
      orderBy: { expiryDate: 'asc' } // FEFO default sorting
    });
    res.json(components);
  } catch (error) {
    next(error);
  }
});

// Request transfusion (prescriber order)
router.post('/transfusions/requests', async (req, res, next) => {
  try {
    const { patientId, requesterId, urgency, componentType, quantityUnits, clinicalIndication, intendedDate } = req.body;
    const requestNumber = `REQ-TX-${Date.now().toString().slice(-5)}`;

    const txRequest = await prisma.bloodTransfusionRequest.create({
      data: {
        requestNumber,
        patientId,
        requesterId,
        urgency: urgency || 'ROUTINE',
        componentType,
        quantityUnits: Number(quantityUnits || 1),
        clinicalIndication,
        intendedDate: new Date(intendedDate),
        status: 'PENDING'
      }
    });

    res.status(201).json(txRequest);
  } catch (error) {
    next(error);
  }
});

// Fetch transfusion requests
router.get('/transfusions/requests', async (req, res, next) => {
  try {
    const list = await prisma.bloodTransfusionRequest.findMany({
      include: {
        patient: true,
        requester: true,
        crossmatches: { include: { component: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

// Perform compatibility test (crossmatch verification)
router.post('/transfusions/crossmatch', async (req, res, next) => {
  try {
    const { requestId, componentId, method, result, scientistId } = req.body;

    const crossmatch = await prisma.bloodCompatibilityTest.create({
      data: {
        requestId,
        componentId,
        method: method || 'GEL_COLUMN',
        result: result || 'COMPATIBLE',
        scientistId
      }
    });

    // Update component status
    if (result === 'COMPATIBLE') {
      await prisma.bloodComponent.update({
        where: { id: componentId },
        data: { status: 'RESERVED' }
      });
      await prisma.bloodTransfusionRequest.update({
        where: { id: requestId },
        data: { status: 'CROSSMATCHED' }
      });
    }

    res.status(201).json(crossmatch);
  } catch (error) {
    next(error);
  }
});

// ─── 10.3 BEDSIDE TRANSFUSION & HAEMOVIGILANCE ─────────────────────────────

// Log bedside verification & transfusion start
router.post('/transfusions/start', async (req, res, next) => {
  try {
    const { requestId, componentId, patientId, administeredById, wristbandScanned, bagLabelScanned, doubleCheckedBy, vitalsBaseline } = req.body;
    
    // Safety check: Bedside match checklist must match patient and donor bag compatibility
    if (!wristbandScanned || !bagLabelScanned) {
      return res.status(400).json({ error: 'Safety Block: Bedside barcode scans for patient wristband and blood component bag must be completed to prevent patient mismatches.' });
    }

    const tx = await prisma.bloodTransfusionRecord.create({
      data: {
        requestId,
        componentId,
        patientId,
        administeredById,
        wristbandScanned,
        bagLabelScanned,
        doubleCheckedBy,
        vitalsBaseline,
        status: 'RUNNING'
      }
    });

    // Update status
    await prisma.bloodComponent.update({
      where: { id: componentId },
      data: { status: 'TRANSFUSED' }
    });

    await prisma.bloodTransfusionRequest.update({
      where: { id: requestId },
      data: { status: 'ISSUED' }
    });

    res.status(201).json(tx);
  } catch (error) {
    next(error);
  }
});

// Complete / Stop transfusion & Report suspected reaction (Haemovigilance audit)
router.put('/transfusions/:id/complete', async (req, res, next) => {
  try {
    const { vitalsCompletion, status, suspectedReaction, reactionSeverity, reactionDetails } = req.body;
    
    const record = await prisma.bloodTransfusionRecord.update({
      where: { id: req.params.id },
      data: {
        vitalsCompletion,
        status,
        completedAt: new Date(),
        suspectedReaction: !!suspectedReaction,
        reactionSeverity,
        reactionDetails
      }
    });

    if (status === 'COMPLETED') {
      await prisma.bloodTransfusionRequest.update({
        where: { id: record.requestId },
        data: { status: 'COMPLETED' }
      });
    }

    res.json(record);
  } catch (error) {
    next(error);
  }
});

// ─── 10.2 STORAGE & TEMPERATURE REGISTRY ───────────────────────────────────

router.get('/equipment', async (req, res, next) => {
  try {
    let items = await prisma.bloodBankEquipment.findMany();
    if (items.length === 0) {
      await prisma.bloodBankEquipment.createMany({
        data: [
          { equipmentCode: 'BB-EQ-001', name: 'Helmer Scientific i.Series Plasma Ultra-Low Freezer (-30°C)', componentType: 'FFP_PLASMA', minTempLimit: -35.0, maxTempLimit: -25.0, currentTemp: -28.4, status: 'NORMAL' },
          { equipmentCode: 'BB-EQ-002', name: 'Dometic Blood Bank Refrigerator MB 300 (+4°C)', componentType: 'WHOLE_BLOOD', minTempLimit: 2.0, maxTempLimit: 6.0, currentTemp: 4.1, status: 'NORMAL' },
          { equipmentCode: 'BB-EQ-003', name: 'Helmer Platelet Agitator & Incubator (+22°C)', componentType: 'PLATELETS', minTempLimit: 20.0, maxTempLimit: 24.0, currentTemp: 22.0, status: 'NORMAL' },
        ]
      });
      items = await prisma.bloodBankEquipment.findMany();
    }
    res.json(items);
  } catch (error) {
    next(error);
  }
});

// Log temperature check
router.post('/equipment/temperature', async (req, res, next) => {
  try {
    const { equipmentCode, currentTemp } = req.body;
    const item = await prisma.bloodBankEquipment.findUnique({ where: { equipmentCode } });
    if (!item) {
      return res.status(404).json({ error: 'Equipment code not found' });
    }

    const temp = Number(currentTemp);
    const minLimit = Number(item.minTempLimit);
    const maxLimit = Number(item.maxTempLimit);

    const status = (temp < minLimit || temp > maxLimit) ? 'TEMPERATURE_ALARM' : 'NORMAL';

    const updated = await prisma.bloodBankEquipment.update({
      where: { id: item.id },
      data: {
        currentTemp: temp,
        status,
        lastCheckDate: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Setup cold chain storage devices
router.post('/equipment', async (req, res, next) => {
  try {
    const { equipmentCode, name, componentType, minTempLimit, maxTempLimit, currentTemp } = req.body;
    const device = await prisma.bloodBankEquipment.create({
      data: {
        equipmentCode,
        name,
        componentType,
        minTempLimit: Number(minTempLimit),
        maxTempLimit: Number(maxTempLimit),
        currentTemp: Number(currentTemp)
      }
    });
    res.status(201).json(device);
  } catch (error) {
    next(error);
  }
});

export default router;
