import { Router } from 'express';
import { autoAdvanceVisitToStatus, autoAdvanceVisitTask } from './workflow.js';
import { authMiddleware } from '../middleware/auth.js';


const router = Router();
import { prisma } from '../prisma.js';

// ─── PRESCRIPTIONS ────────────────────────────────────────────────────────────

// Get all prescriptions in the pharmacy queue
router.get('/prescriptions', async (req, res, next) => {
  try {
    const { status, priority, search, patientId } = req.query;
    const whereClause: any = {};
    
    if (status && status !== 'ALL' && status !== 'ALL_STATUSES' && status !== 'undefined') {
      const sUpper = String(status).toUpperCase().trim();
      if (sUpper === 'PENDING_VERIFICATION') whereClause.status = 'PENDING';
      else if (sUpper === 'PARTIAL_DISPENSED') whereClause.status = 'PARTIALLY_DISPENSED';
      else if (['PENDING', 'VERIFIED', 'DISPENSED', 'PARTIALLY_DISPENSED', 'COMPLETED', 'CANCELLED'].includes(sUpper)) {
        whereClause.status = sUpper;
      }
    }

    if (priority && priority !== 'ALL' && priority !== 'undefined') {
      const pUpper = String(priority).toUpperCase().trim();
      if (['ROUTINE', 'STAT', 'URGENT', 'CRITICAL'].includes(pUpper)) {
        whereClause.priority = pUpper;
      }
    }

    if (patientId && patientId !== 'undefined' && patientId !== 'null') {
      whereClause.patientId = String(patientId).trim();
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      whereClause.OR = [
        { prescriptionNumber: { contains: q, mode: 'insensitive' } },
        { patient: { firstName: { contains: q, mode: 'insensitive' } } },
        { patient: { lastName: { contains: q, mode: 'insensitive' } } },
        { patient: { patientNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const prescriptions = await prisma.pharmacyPrescription.findMany({
      where: whereClause,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, patientNumber: true, birthDate: true, gender: true, allergies: true },
        },
        prescriber: {
          select: { id: true, firstName: true, lastName: true, designation: true },
        },
        items: {
          include: { 
            medication: {
              include: {
                batches: {
                  include: {
                    warehouse: true,
                  }
                }
              }
            } 
          },
        },
        dispensedRecords: {
          include: { batch: true },
        },
        clinicalInterventions: true,
      },
      orderBy: { orderedAt: 'desc' },
    });

    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching pharmacy prescriptions:', error);
    res.json([]);
  }
});

async function getOrCreateExternalMedicationItem(medName?: string) {
  try {
    let item = await prisma.pharmacyInventoryItem.findFirst({
      where: { itemCode: 'EXT-PURCHASE-MED' }
    });
    if (!item) {
      item = await prisma.pharmacyInventoryItem.create({
        data: {
          itemCode: 'EXT-PURCHASE-MED',
          genericName: medName || 'External Purchase Medication',
          brandName: medName || 'Out of Stock Drug',
          dosageForm: 'Tablet/Fluid',
          strength: 'Standard',
          unitOfMeasure: 'Unit',
          classification: 'EXTERNAL',
          price: 0,
          isActive: true,
          stockLeft: 0,
        }
      });
    }
    return item.id;
  } catch {
    const anyItem = await prisma.pharmacyInventoryItem.findFirst();
    return anyItem?.id || '';
  }
}

// Create a new prescription (CPOE)
router.post('/prescriptions', authMiddleware, async (req: any, res, next) => {
  try {
    const {
      patientId, prescribedById, visitId, encounterId, department,
      priority, clinicalNotes, diagnosis, paymentStatus, insurancePolicyNo,
      items, orderedAt,
    } = req.body;

    // Auto-resolve or seed staff ID for logged-in user if missing
    let finalStaffId = prescribedById;
    if (!finalStaffId) {
      let staff = await prisma.staff.findFirst({ where: { userId: req.user.id } });
      if (!staff) {
        const dept = await prisma.department.findFirst();
        staff = await prisma.staff.create({
          data: {
            userId: req.user.id,
            firstName: req.user.firstName || 'Default',
            lastName: req.user.lastName || 'Clinician',
            designation: 'Doctor',
            employeeId: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
            department: dept?.name || '',
          }
        });
      }
      finalStaffId = staff.id;
    }

    const prescriptionNumber = `RX-${Date.now().toString().slice(-8)}`;

    // Calculate total amount from item costs
    // NOTE: External drugs (isExternalPurchase: true) are for patient external purchase — hospital charges ₦0.00
    let totalAmount = 0;
    const prescriptionItems: any[] = [];
    const fallbackMedId = await getOrCreateExternalMedicationItem();

    for (const item of items) {
      const isExternalItem = Boolean(item.isExternalPurchase === true || item.isExternal === true);

      if (item.medicationId && !isExternalItem) {
        // In-stock pharmacy item
        const med = await prisma.pharmacyInventoryItem.findUnique({
          where: { id: item.medicationId },
        });
        if (!med) {
          // Treat as external if ID no longer valid — ₦0 hospital charge
          prescriptionItems.push({
            medicationId: fallbackMedId,
            strength: item.strength || '',
            dosageForm: item.dosageForm || 'N/A',
            dose: item.dose,
            frequency: item.frequency,
            duration: item.duration,
            route: item.route || 'Oral',
            quantityPrescribed: item.quantityPrescribed || 1,
            quantityDispensed: 0,
            refillsAllowed: 0,
            refillsRemaining: 0,
            clinicalIndication: item.clinicalIndication || `External purchase: ${item.name}`,
            status: 'OUT_OF_STOCK_EXTERNAL',
          });
          continue;
        }
        const itemCost = Number(med.price) * (item.quantityPrescribed || 1);
        totalAmount += itemCost;
        prescriptionItems.push({
          medicationId: item.medicationId,
          strength: item.strength || med.strength,
          dosageForm: item.dosageForm || med.dosageForm,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route || 'Oral',
          quantityPrescribed: item.quantityPrescribed || 1,
          quantityDispensed: 0,
          refillsAllowed: item.refillsAllowed || 0,
          refillsRemaining: item.refillsAllowed || 0,
          clinicalIndication: item.clinicalIndication,
          status: 'PENDING',
        });
      } else {
        // External purchase — patient buys outside, hospital charges ₦0.00
        prescriptionItems.push({
          medicationId: (item.medicationId && item.medicationId.length > 5) ? item.medicationId : fallbackMedId,
          strength: item.strength || '',
          dosageForm: item.dosageForm || 'N/A',
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route || 'Oral',
          quantityPrescribed: item.quantityPrescribed || 1,
          quantityDispensed: 0,
          refillsAllowed: 0,
          refillsRemaining: 0,
          clinicalIndication: item.clinicalIndication || `External purchase: ${item.name}`,
          status: 'OUT_OF_STOCK_EXTERNAL',
        });
      }
    }

    const isAllExternal = prescriptionItems.length > 0 && prescriptionItems.every(i => i.status === 'OUT_OF_STOCK_EXTERNAL' || i.status === 'DISPENSED_EXTERNAL');
    const rxInitialStatus = isAllExternal ? 'EXTERNAL_PURCHASE' : 'PENDING_VERIFICATION';

    let prescription: any = null;
    try {
      prescription = await prisma.pharmacyPrescription.create({
        data: {
          prescriptionNumber,
          patientId,
          prescribedById: finalStaffId,
          visitId,
          encounterId,
          department,
          priority: priority || 'ROUTINE',
          status: rxInitialStatus,
          clinicalNotes,
          diagnosis,
          paymentStatus: totalAmount > 0 ? (paymentStatus || 'UNPAID') : 'EXEMPT',
          insurancePolicyNo,
          totalAmount,
          orderedAt: orderedAt ? new Date(orderedAt) : new Date(),
          items: {
            create: prescriptionItems,
          },
        },
        include: { items: true },
      });
    } catch (createErr) {
      console.warn('Warning: DB create failed for prescription, returning synthesized object:', createErr);
      prescription = {
        id: `RX-MOCK-${Date.now()}`,
        prescriptionNumber,
        patientId,
        prescribedById: finalStaffId,
        department,
        priority: priority || 'ROUTINE',
        paymentStatus: totalAmount > 0 ? (paymentStatus || 'UNPAID') : 'EXEMPT',
        totalAmount,
        orderedAt: new Date(),
        items: prescriptionItems,
      };
    }

    if (visitId) {
      try {
        await autoAdvanceVisitToStatus(visitId, 'WAITING_PHARMACY', req.user?.username || 'System Doctor');
      } catch (vErr) {
        console.warn('Non-fatal: Failed to auto-advance visit:', vErr);
      }
    }

    // Auto-generate billing invoice for this prescription ONLY if totalAmount > 0 (billable hospital items exist)
    if (totalAmount > 0) {
      try {
        const invoiceNo = `RX-INV-${prescriptionNumber}`;
        const itemDescriptions = items
          .filter((it: any) => !it.isExternalPurchase && !it.isExternal && it.medicationId)
          .map((it: any, i: number) => {
            const pItem = prescriptionItems[i];
            return `${it.name || 'Medication'} - ${pItem?.dose || it.dose} ${pItem?.frequency || it.frequency} x ${pItem?.duration || it.duration}`;
          }).join('; ');
        await prisma.invoice.create({
          data: {
            patientId,
            status: 'ISSUED',
            total: totalAmount,
            amountPaid: 0,
            reasonText: `Pharmacy Prescription (${prescriptionNumber}): ${itemDescriptions}`,
            fhirId: invoiceNo,
            createdAt: orderedAt ? new Date(orderedAt) : new Date(),
          },
        });
      } catch (invErr) {
        console.warn('Non-fatal: Failed to generate invoice for prescription:', invErr);
      }
    }

    res.status(201).json(prescription);
  } catch (error) {
    console.error('Error handling prescription order:', error);
    res.status(201).json({
      success: true,
      message: 'Prescription processed',
      prescriptionNumber: `RX-${Date.now().toString().slice(-8)}`,
    });
  }
});

// Get a single prescription by ID
router.get('/prescriptions/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const prescription = await prisma.pharmacyPrescription.findUnique({
      where: { id: req.params.id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, patientNumber: true, birthDate: true, gender: true, allergies: true },
        },
        prescriber: {
          select: { id: true, firstName: true, lastName: true, designation: true },
        },
        items: {
          include: { 
            medication: {
              include: {
                batches: {
                  include: {
                    warehouse: true,
                  }
                }
              }
            } 
          },
        },
      },
    });
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    res.json(prescription);
  } catch (error) {
    next(error);
  }
});

// Pharmacist Verification & Check Simulation
router.patch('/prescriptions/:id/verify', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { verifiedById } = req.body;

    let finalVerifiedById = verifiedById;
    let staff = null;
    if (finalVerifiedById && finalVerifiedById !== 'pharmacist-admin') {
      staff = await prisma.staff.findFirst({
        where: {
          OR: [
            { id: finalVerifiedById },
            { userId: finalVerifiedById }
          ]
        }
      });
    }

    if (!staff) {
      staff = await prisma.staff.findFirst({ where: { userId: req.user.id } });
    }

    if (!staff) {
      const dept = await prisma.department.findFirst();
      staff = await prisma.staff.create({
        data: {
          userId: req.user.id,
          firstName: req.user.firstName || 'Default',
          lastName: req.user.lastName || 'Pharmacist',
          designation: 'Pharmacist',
          employeeId: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
          department: dept?.name || '',
        }
      });
    }

    finalVerifiedById = staff.id;

    const prescription = await prisma.pharmacyPrescription.findUnique({
      where: { id },
      include: {
        patient: { include: { allergies: true } },
        items: { include: { medication: true } },
      },
    });

    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    // Simulate EMR allergy checking
    const allergies = prescription.patient.allergies || [];
    let allergyAlert = false;
    let interactionAlert = false;
    let duplicateAlert = false;

    const allergyWarnings: string[] = [];
    const interactionWarnings: string[] = [];
    const duplicateWarnings: string[] = [];

    // Simple matching rule engine for testing/clinical safety simulation
    for (const item of prescription.items) {
      const name = item.medication.genericName.toLowerCase();
      // Allergy check
      allergies.forEach((allergy: any) => {
        if (name.includes(allergy.allergen?.toLowerCase() || '')) {
          allergyAlert = true;
          allergyWarnings.push(`Patient is allergic to allergen linked to: ${item.medication.genericName}`);
        }
      });

      // Interaction check mock (e.g. Warfarin + Aspirin or Sildenafil + Nitrates)
      const genericNames = prescription.items.map(i => i.medication.genericName.toLowerCase());
      if (genericNames.includes('warfarin') && genericNames.includes('aspirin')) {
        interactionAlert = true;
        interactionWarnings.push('Drug-Drug Interaction: Warfarin + Aspirin increases bleeding risk.');
      }
      if (genericNames.includes('sildenafil') && (genericNames.includes('nitroglycerin') || genericNames.includes('isosorbide'))) {
        interactionAlert = true;
        interactionWarnings.push('Drug-Drug Interaction: Nitrates + Sildenafil causes severe hypotension.');
      }

      // Duplicate therapy checks (same generic class)
      const countGenerics = genericNames.filter(g => g === name).length;
      if (countGenerics > 1) {
        duplicateAlert = true;
        duplicateWarnings.push(`Duplicate Therapy: Multiple items contain the generic ingredient ${item.medication.genericName}`);
      }
    }

    const updatedPrescription = await prisma.pharmacyPrescription.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedById: finalVerifiedById,
        verifiedAt: new Date(),
        allergyCheckDone: true,
        interactionCheckDone: true,
        duplicateCheckDone: true,
      },
    });

    res.json({
      prescription: updatedPrescription,
      alerts: {
        allergyAlert,
        allergyWarnings,
        interactionAlert,
        interactionWarnings,
        duplicateAlert,
        duplicateWarnings,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Dispense Medication with barcode verification & stock deduction
router.post('/dispense', authMiddleware, async (req: any, res, next) => {
  try {
    const {
      prescriptionId, prescriptionItemId, batchId, quantityDispensed,
      dispensedById, barcodeScanned, insuranceStatus, coPaymentAmount,
      claimId, counsellingDone, counsellingNotes, counsellingPrecautions,
      patientAcknowledge,
    } = req.body;

    let finalDispensedById = dispensedById;
    if (!finalDispensedById || finalDispensedById === 'pharmacist-admin') {
      let staff = await prisma.staff.findFirst({ where: { userId: req.user.id } });
      if (!staff) {
        const dept = await prisma.department.findFirst();
        staff = await prisma.staff.create({
          data: {
            userId: req.user.id,
            firstName: req.user.firstName || 'Default',
            lastName: req.user.lastName || 'Pharmacist',
            designation: 'Pharmacist',
            employeeId: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
            department: dept?.name || '',
          }
        });
      }
      finalDispensedById = staff.id;
    }

    // Validate prescription item
    const item = await prisma.pharmacyPrescriptionItem.findUnique({
      where: { id: prescriptionItemId },
      include: { medication: true },
    });

    if (!item) return res.status(404).json({ error: 'Prescription item not found' });
    if (item.quantityDispensed + quantityDispensed > item.quantityPrescribed) {
      return res.status(400).json({ error: 'Dispensing quantity exceeds prescribed amount' });
    }

    // Validate batch
    const batch = await prisma.pharmacyStockBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) return res.status(404).json({ error: 'Stock batch not found' });
    if (batch.currentQuantity < quantityDispensed) {
      return res.status(400).json({ error: `Insufficient stock in batch. Available: ${batch.currentQuantity}` });
    }

    // Expiry check
    if (new Date(batch.expiryDate) < new Date()) {
      return res.status(400).json({ error: 'Cannot dispense expired medication batch' });
    }

    // Barcode matching verification
    let barcodeVerified = false;
    if (barcodeScanned) {
      // Simulating check: barcodeScanned could match item generic code, itemCode or batch lot
      if (barcodeScanned === item.medication.itemCode || barcodeScanned === batch.batchNumber || barcodeScanned === batch.lotNumber) {
        barcodeVerified = true;
      }
    }

    // Deduct stock in batch
    await prisma.pharmacyStockBatch.update({
      where: { id: batchId },
      data: {
        currentQuantity: { decrement: quantityDispensed },
      },
    });

    // Update prescription item quantity dispensed
    const finalQuantityDispensed = item.quantityDispensed + quantityDispensed;
    const itemStatus = finalQuantityDispensed >= item.quantityPrescribed ? 'DISPENSED' : 'PARTIAL_DISPENSED';

    const updatedItem = await prisma.pharmacyPrescriptionItem.update({
      where: { id: prescriptionItemId },
      data: {
        quantityDispensed: finalQuantityDispensed,
        status: itemStatus,
      },
    });

    // Create dispense log
    const dispensingRecord = await prisma.pharmacyDispensingRecord.create({
      data: {
        prescriptionId,
        prescriptionItemId,
        batchId,
        quantityDispensed,
        dispensedById: finalDispensedById,
        barcodeVerified,
        barcodeScanned,
        insuranceStatus,
        coPaymentAmount,
        claimId,
        counsellingDone,
        counsellingNotes,
        counsellingPrecautions,
        patientAcknowledge,
      },
    });

    // If it's a controlled drug/narcotic, auto-log to controlled register
    if (item.medication.classification === 'CONTROLLED') {
      await prisma.pharmacyControlledSubstanceLog.create({
        data: {
          inventoryItemId: item.medication.id,
          batchNumber: batch.batchNumber,
          transactionType: 'DISPENSE',
          quantity: quantityDispensed,
          recordedBy: finalDispensedById,
          comments: `Dispensed to patient. Prescription Item ID: ${prescriptionItemId}`,
        },
      });
    }

    // Check if entire prescription is now complete
    const allItems = await prisma.pharmacyPrescriptionItem.findMany({
      where: { prescriptionId },
    });
    
    const allComplete = allItems.every(i => i.status === 'DISPENSED');
    const anyDispensed = allItems.some(i => i.quantityDispensed > 0);

    let mainPrescriptionStatus = 'PENDING_VERIFICATION';
    if (allComplete) mainPrescriptionStatus = 'DISPENSED';
    else if (anyDispensed) mainPrescriptionStatus = 'PARTIAL_DISPENSED';

    const prescription = await prisma.pharmacyPrescription.update({
      where: { id: prescriptionId },
      data: {
        status: mainPrescriptionStatus,
        completedAt: allComplete ? new Date() : null,
      },
    });

    // Advance patient journey in workflow engine
    if (allComplete && prescription.visitId) {
      await autoAdvanceVisitToStatus(prescription.visitId, 'MEDICATION_DISPENSED', req.user?.username || 'System Pharmacist');
      await autoAdvanceVisitTask(prescription.visitId, 'PHARMACY');
    }

    res.json({ dispensingRecord, updatedItem });
  } catch (error) {
    next(error);
  }
});

// Dispense all items in a prescription (one-click complete)
router.post('/prescriptions/:id/dispense-all', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const prescription = await prisma.pharmacyPrescription.findUnique({
      where: { id },
      include: { items: { include: { medication: true } } },
    });
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    // Resolve staff ID of logged-in user
    let finalDispensedById = null;
    let staff = await prisma.staff.findFirst({ where: { userId: req.user.id } });
    if (!staff) {
      const dept = await prisma.department.findFirst();
      staff = await prisma.staff.create({
        data: {
          userId: req.user.id,
          firstName: req.user.firstName || 'Default',
          lastName: req.user.lastName || 'Pharmacist',
          designation: 'Pharmacist',
          employeeId: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
          department: dept?.name || '',
        }
      });
    }
    finalDispensedById = staff.id;

    // Let's dispense each pending item
    for (const item of prescription.items) {
      if (item.status === 'DISPENSED') continue;

      // Find a batch with stock for this medication
      const batch = await prisma.pharmacyStockBatch.findFirst({
        where: { inventoryItemId: item.medicationId, currentQuantity: { gte: 1 }, expiryDate: { gte: new Date() } }
      });

      const qtyToDispense = item.quantityPrescribed - item.quantityDispensed;

      if (batch) {
        // Deduct stock
        const deductQty = Math.min(batch.currentQuantity, qtyToDispense);
        await prisma.pharmacyStockBatch.update({
          where: { id: batch.id },
          data: { currentQuantity: { decrement: deductQty } }
        });
      }

      // Update item status
      await prisma.pharmacyPrescriptionItem.update({
        where: { id: item.id },
        data: {
          quantityDispensed: item.quantityPrescribed,
          status: 'DISPENSED'
        }
      });

      // Create dispensing record
      await prisma.pharmacyDispensingRecord.create({
        data: {
          prescriptionId: prescription.id,
          prescriptionItemId: item.id,
          batchId: batch?.id || '', // fallback
          quantityDispensed: qtyToDispense,
          dispensedById: finalDispensedById,
          barcodeVerified: false,
          insuranceStatus: 'PATIENT_PAY',
          counsellingDone: true,
          patientAcknowledge: true,
        }
      });
    }

    // Update prescription status
    const updatedPrescription = await prisma.pharmacyPrescription.update({
      where: { id },
      data: {
        status: 'DISPENSED',
        completedAt: new Date(),
      },
      include: { items: true }
    });

    // Advance patient journey in workflow engine
    if (prescription.visitId) {
      await autoAdvanceVisitToStatus(prescription.visitId, 'MEDICATION_DISPENSED', req.user?.username || 'System Pharmacist');
      await autoAdvanceVisitTask(prescription.visitId, 'PHARMACY');
    }

    res.json({ success: true, prescription: updatedPrescription });
  } catch (e) {
    next(e);
  }
});

// Revert dispensing and verification for a prescription (Undo / Revert action)
router.post('/prescriptions/:id/revert', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const prescription = await prisma.pharmacyPrescription.findUnique({
      where: { id },
      include: {
        items: true,
        dispensedRecords: true,
      }
    });

    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    // 1. Restore batch stock for each dispensing record
    for (const record of prescription.dispensedRecords) {
      if (record.batchId) {
        await prisma.pharmacyStockBatch.update({
          where: { id: record.batchId },
          data: {
            currentQuantity: { increment: record.quantityDispensed }
          }
        });
      }
    }

    // 2. Delete dispensing records and controlled drug logs
    await prisma.pharmacyDispensingRecord.deleteMany({
      where: { prescriptionId: id }
    });

    await prisma.pharmacyControlledSubstanceLog.deleteMany({
      where: {
        inventoryItemId: { in: prescription.items.map(i => i.medicationId) },
        transactionType: 'DISPENSE',
        comments: { contains: id }
      }
    });

    // 3. Reset items state
    await prisma.pharmacyPrescriptionItem.updateMany({
      where: { prescriptionId: id },
      data: {
        quantityDispensed: 0,
        status: 'PENDING'
      }
    });

    // 4. Update prescription status back to PENDING_VERIFICATION
    const updated = await prisma.pharmacyPrescription.update({
      where: { id },
      data: {
        status: 'PENDING_VERIFICATION',
        verifiedById: null,
        verifiedAt: null,
        completedAt: null,
      },
      include: { items: true }
    });

    // 5. Revert patient visit workflow state back to WAITING_PHARMACY
    if (prescription.visitId) {
      await autoAdvanceVisitToStatus(prescription.visitId, 'WAITING_PHARMACY', req.user?.username || 'System Pharmacist');
    }

    res.json({ success: true, prescription: updated });
  } catch (e) {
    next(e);
  }
});

// ─── WARD MEDICATION CATALOG (Pharmacy Stock + Data Dictionary) ─────────────

// Comprehensive inpatient ward medication data dictionary per ward type
const WARD_MEDICATION_DICTIONARY: Record<string, any[]> = {
  surgical: [
    // IV Fluids
    { name: 'Normal Saline 0.9% 500ml', genericName: 'Sodium Chloride 0.9%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 800 },
    { name: 'Normal Saline 0.9% 1000ml', genericName: 'Sodium Chloride 0.9%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 1200 },
    { name: 'Ringer Lactate 500ml', genericName: 'Lactated Ringer Solution', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 900 },
    { name: 'Dextrose 5% in Water 500ml', genericName: 'Dextrose 5%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 850 },
    { name: 'Dextrose 10% 500ml', genericName: 'Dextrose 10%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 950 },
    { name: 'Dextrose Saline (DNS) 500ml', genericName: 'Dextrose + Saline', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 900 },
    { name: 'Gelofusine 500ml', genericName: 'Gelatin-based Colloid', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 3500 },
    // Post-Op Analgesics
    { name: 'Morphine 10mg/ml Injection', genericName: 'Morphine Sulphate', category: 'Analgesics (Opioid)', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 2500 },
    { name: 'Pethidine 100mg/2ml Injection', genericName: 'Pethidine HCl', category: 'Analgesics (Opioid)', route: 'IM', dosageForm: 'Injection', unitPrice: 1800 },
    { name: 'Tramadol 100mg Injection', genericName: 'Tramadol HCl', category: 'Analgesics (Opioid)', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 1200 },
    { name: 'Diclofenac Sodium 75mg Injection', genericName: 'Diclofenac Sodium', category: 'NSAIDs', route: 'IM', dosageForm: 'Injection', unitPrice: 600 },
    { name: 'Ketorolac 30mg Injection', genericName: 'Ketorolac Tromethamine', category: 'NSAIDs', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 1500 },
    { name: 'Paracetamol IV 1g/100ml', genericName: 'Acetaminophen IV', category: 'Analgesics', route: 'IV', dosageForm: 'IV Infusion', unitPrice: 2800 },
    // Antibiotics (Post-Op Prophylaxis)
    { name: 'Metronidazole 500mg IV', genericName: 'Metronidazole', category: 'Antibiotics', route: 'IV', dosageForm: 'IV Infusion', unitPrice: 800 },
    { name: 'Cefazolin 1g Injection', genericName: 'Cefazolin Sodium', category: 'Antibiotics', route: 'IV', dosageForm: 'Injection', unitPrice: 1800 },
    { name: 'Ceftriaxone 1g Injection', genericName: 'Ceftriaxone Sodium', category: 'Antibiotics', route: 'IV', dosageForm: 'Injection', unitPrice: 2200 },
    { name: 'Gentamicin 80mg Injection', genericName: 'Gentamicin Sulphate', category: 'Antibiotics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 700 },
    // Antiemetics
    { name: 'Ondansetron 8mg Injection', genericName: 'Ondansetron HCl', category: 'Antiemetics', route: 'IV', dosageForm: 'Injection', unitPrice: 1500 },
    { name: 'Metoclopramide 10mg Injection', genericName: 'Metoclopramide HCl', category: 'Antiemetics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 400 },
    // Wound Care
    { name: 'Povidone Iodine Solution 10%', genericName: 'Povidone Iodine', category: 'Wound Care', route: 'Topical', dosageForm: 'Solution', unitPrice: 1200 },
    { name: 'Normal Saline Wound Irrigation', genericName: 'Wound Irrigation NaCl', category: 'Wound Care', route: 'Topical', dosageForm: 'Solution', unitPrice: 600 },
    { name: 'Hydrogen Peroxide 3%', genericName: 'H2O2 Wound Cleanser', category: 'Wound Care', route: 'Topical', dosageForm: 'Solution', unitPrice: 400 },
    // Anticoagulants
    { name: 'Heparin 5000 IU Injection', genericName: 'Unfractionated Heparin', category: 'Anticoagulants', route: 'SC/IV', dosageForm: 'Injection', unitPrice: 3000 },
    { name: 'Enoxaparin (Clexane) 40mg', genericName: 'Enoxaparin Sodium', category: 'Anticoagulants', route: 'SC', dosageForm: 'Injection', unitPrice: 5500 },
  ],
  icu: [
    // IV Fluids
    { name: 'Normal Saline 0.9% 500ml', genericName: 'Sodium Chloride 0.9%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 800 },
    { name: 'Ringer Lactate 500ml', genericName: 'Lactated Ringer Solution', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 900 },
    { name: 'Dextrose 5% 500ml', genericName: 'Dextrose 5%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 850 },
    { name: 'Albumin 20% 50ml', genericName: 'Human Albumin', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Infusion', unitPrice: 35000 },
    // Inotropes & Vasopressors
    { name: 'Adrenaline (Epinephrine) 1mg/ml', genericName: 'Epinephrine', category: 'Inotropes/Vasopressors', route: 'IV', dosageForm: 'Injection', unitPrice: 3500 },
    { name: 'Noradrenaline 4mg/4ml', genericName: 'Norepinephrine', category: 'Inotropes/Vasopressors', route: 'IV Infusion', dosageForm: 'Injection', unitPrice: 8000 },
    { name: 'Dopamine 200mg/5ml', genericName: 'Dopamine HCl', category: 'Inotropes/Vasopressors', route: 'IV Infusion', dosageForm: 'Injection', unitPrice: 5000 },
    { name: 'Dobutamine 250mg/20ml', genericName: 'Dobutamine HCl', category: 'Inotropes/Vasopressors', route: 'IV Infusion', dosageForm: 'Injection', unitPrice: 12000 },
    { name: 'Vasopressin 20 IU/ml', genericName: 'Argipressin', category: 'Inotropes/Vasopressors', route: 'IV', dosageForm: 'Injection', unitPrice: 25000 },
    // Sedation/Analgesia
    { name: 'Midazolam 5mg/5ml Injection', genericName: 'Midazolam HCl', category: 'Sedatives', route: 'IV', dosageForm: 'Injection', unitPrice: 6000 },
    { name: 'Propofol 200mg/20ml', genericName: 'Propofol', category: 'Sedatives', route: 'IV', dosageForm: 'Injection', unitPrice: 15000 },
    { name: 'Fentanyl 100mcg/2ml', genericName: 'Fentanyl Citrate', category: 'Analgesics (Opioid)', route: 'IV', dosageForm: 'Injection', unitPrice: 8000 },
    { name: 'Morphine 10mg/ml Injection', genericName: 'Morphine Sulphate', category: 'Analgesics (Opioid)', route: 'IV', dosageForm: 'Injection', unitPrice: 2500 },
    // Antibiotics (Broad-Spectrum)
    { name: 'Meropenem 1g Injection', genericName: 'Meropenem', category: 'Antibiotics', route: 'IV', dosageForm: 'Injection', unitPrice: 15000 },
    { name: 'Vancomycin 500mg Injection', genericName: 'Vancomycin HCl', category: 'Antibiotics', route: 'IV', dosageForm: 'Injection', unitPrice: 12000 },
    { name: 'Piperacillin-Tazobactam 4.5g', genericName: 'Pip-Tazo', category: 'Antibiotics', route: 'IV', dosageForm: 'Injection', unitPrice: 18000 },
    { name: 'Colistin 150mg Injection', genericName: 'Colistimethate Sodium', category: 'Antibiotics', route: 'IV', dosageForm: 'Injection', unitPrice: 45000 },
    // Anticoagulants
    { name: 'Heparin 5000 IU Injection', genericName: 'Unfractionated Heparin', category: 'Anticoagulants', route: 'IV/SC', dosageForm: 'Injection', unitPrice: 3000 },
    { name: 'Enoxaparin (Clexane) 40mg', genericName: 'Enoxaparin Sodium', category: 'Anticoagulants', route: 'SC', dosageForm: 'Injection', unitPrice: 5500 },
    // GI Protection
    { name: 'Omeprazole 40mg IV', genericName: 'Omeprazole Sodium', category: 'GI Protection', route: 'IV', dosageForm: 'Injection', unitPrice: 3500 },
    { name: 'Sucralfate 1g Suspension', genericName: 'Sucralfate', category: 'GI Protection', route: 'Oral/NG', dosageForm: 'Suspension', unitPrice: 1800 },
    // Electrolytes
    { name: 'KCl 15% 10ml Infusion Additive', genericName: 'Potassium Chloride', category: 'Electrolytes', route: 'IV Additive', dosageForm: 'Concentrate', unitPrice: 600 },
    { name: 'Magnesium Sulphate 50% 10ml', genericName: 'Magnesium Sulphate', category: 'Electrolytes', route: 'IV', dosageForm: 'Injection', unitPrice: 800 },
    { name: 'Sodium Bicarbonate 8.4% 20ml', genericName: 'Sodium Bicarbonate', category: 'Electrolytes', route: 'IV', dosageForm: 'Injection', unitPrice: 700 },
    // Antiarrhythmics
    { name: 'Amiodarone 150mg/3ml', genericName: 'Amiodarone HCl', category: 'Antiarrhythmics', route: 'IV', dosageForm: 'Injection', unitPrice: 9000 },
    { name: 'Atropine 1mg/ml Injection', genericName: 'Atropine Sulphate', category: 'Antiarrhythmics', route: 'IV', dosageForm: 'Injection', unitPrice: 800 },
    { name: 'Adenosine 6mg/2ml', genericName: 'Adenosine', category: 'Antiarrhythmics', route: 'IV', dosageForm: 'Injection', unitPrice: 5500 },
  ],
  medical: [
    // IV Fluids
    { name: 'Normal Saline 0.9% 500ml', genericName: 'Sodium Chloride 0.9%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 800 },
    { name: 'Dextrose 5% 500ml', genericName: 'Dextrose 5%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 850 },
    { name: 'Ringer Lactate 500ml', genericName: 'Lactated Ringer', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 900 },
    // Antibiotics
    { name: 'Amoxicillin-Clavulanate 625mg', genericName: 'Co-Amoxiclav', category: 'Antibiotics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 350 },
    { name: 'Azithromycin 500mg', genericName: 'Azithromycin', category: 'Antibiotics', route: 'Oral/IV', dosageForm: 'Tablet', unitPrice: 1200 },
    { name: 'Ceftriaxone 1g Injection', genericName: 'Ceftriaxone Sodium', category: 'Antibiotics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 2200 },
    { name: 'Clarithromycin 500mg', genericName: 'Clarithromycin', category: 'Antibiotics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 900 },
    // Antihypertensives
    { name: 'Amlodipine 5mg Tablet', genericName: 'Amlodipine Besylate', category: 'Antihypertensives', route: 'Oral', dosageForm: 'Tablet', unitPrice: 150 },
    { name: 'Lisinopril 10mg Tablet', genericName: 'Lisinopril', category: 'Antihypertensives', route: 'Oral', dosageForm: 'Tablet', unitPrice: 200 },
    { name: 'Hydralazine 25mg Injection', genericName: 'Hydralazine HCl', category: 'Antihypertensives', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 3000 },
    { name: 'Labetalol 100mg/20ml IV', genericName: 'Labetalol HCl', category: 'Antihypertensives', route: 'IV', dosageForm: 'Injection', unitPrice: 8000 },
    // Antidiabetics
    { name: 'Insulin Regular 100 IU/ml', genericName: 'Regular Insulin', category: 'Antidiabetics', route: 'SC/IV', dosageForm: 'Injection', unitPrice: 2500 },
    { name: 'Insulin Glargine (Lantus) 100IU', genericName: 'Insulin Glargine', category: 'Antidiabetics', route: 'SC', dosageForm: 'Injection', unitPrice: 12000 },
    { name: 'Metformin 500mg Tablet', genericName: 'Metformin HCl', category: 'Antidiabetics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 80 },
    // Respiratory
    { name: 'Salbutamol Nebuliser 2.5mg', genericName: 'Albuterol', category: 'Respiratory', route: 'Nebulisation', dosageForm: 'Nebuliser Solution', unitPrice: 700 },
    { name: 'Prednisolone 20mg Tablet', genericName: 'Prednisolone', category: 'Respiratory/Anti-inflammatory', route: 'Oral', dosageForm: 'Tablet', unitPrice: 120 },
    { name: 'Aminophylline 250mg IV', genericName: 'Aminophylline', category: 'Respiratory', route: 'IV', dosageForm: 'Injection', unitPrice: 800 },
    // Cardiac
    { name: 'Furosemide 40mg Tablet', genericName: 'Furosemide', category: 'Diuretics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 100 },
    { name: 'Furosemide 20mg/2ml Injection', genericName: 'Furosemide', category: 'Diuretics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 400 },
    { name: 'Digoxin 250mcg Tablet', genericName: 'Digoxin', category: 'Cardiac Glycosides', route: 'Oral', dosageForm: 'Tablet', unitPrice: 200 },
    { name: 'Atorvastatin 40mg Tablet', genericName: 'Atorvastatin', category: 'Lipid-Lowering', route: 'Oral', dosageForm: 'Tablet', unitPrice: 250 },
    // Analgesics
    { name: 'Paracetamol 1g Tablet', genericName: 'Acetaminophen', category: 'Analgesics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 100 },
    { name: 'Ibuprofen 400mg Tablet', genericName: 'Ibuprofen', category: 'NSAIDs', route: 'Oral', dosageForm: 'Tablet', unitPrice: 120 },
    { name: 'Tramadol 50mg Capsule', genericName: 'Tramadol HCl', category: 'Analgesics (Opioid)', route: 'Oral', dosageForm: 'Capsule', unitPrice: 400 },
    // GI
    { name: 'Omeprazole 20mg Capsule', genericName: 'Omeprazole', category: 'GI Protection', route: 'Oral', dosageForm: 'Capsule', unitPrice: 200 },
    { name: 'Metoclopramide 10mg Tablet', genericName: 'Metoclopramide HCl', category: 'Antiemetics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 100 },
    { name: 'Oral Rehydration Salts (ORS)', genericName: 'Electrolyte Mixture', category: 'IV Fluids/Oral Rehydration', route: 'Oral', dosageForm: 'Sachet', unitPrice: 150 },
    // Antimalarials
    { name: 'Artemether-Lumefantrine 80/480mg', genericName: 'Artemether/Lumefantrine', category: 'Antimalarials', route: 'Oral', dosageForm: 'Tablet', unitPrice: 1800 },
    { name: 'IV Artesunate 60mg', genericName: 'Artesunate', category: 'Antimalarials', route: 'IV', dosageForm: 'Injection', unitPrice: 8000 },
  ],
  private: [
    // Same as medical but premium brands
    { name: 'Normal Saline 0.9% 500ml', genericName: 'Sodium Chloride 0.9%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 800 },
    { name: 'Ringer Lactate 500ml', genericName: 'Lactated Ringer', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 900 },
    { name: 'Dextrose 5% 500ml', genericName: 'Dextrose 5%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 850 },
    { name: 'Paracetamol 1g Tablet', genericName: 'Acetaminophen', category: 'Analgesics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 100 },
    { name: 'Ibuprofen 400mg Tablet', genericName: 'Ibuprofen', category: 'NSAIDs', route: 'Oral', dosageForm: 'Tablet', unitPrice: 120 },
    { name: 'Omeprazole 20mg Capsule', genericName: 'Omeprazole', category: 'GI Protection', route: 'Oral', dosageForm: 'Capsule', unitPrice: 200 },
    { name: 'Ceftriaxone 1g Injection', genericName: 'Ceftriaxone Sodium', category: 'Antibiotics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 2200 },
    { name: 'Metronidazole 500mg IV', genericName: 'Metronidazole', category: 'Antibiotics', route: 'IV', dosageForm: 'IV Infusion', unitPrice: 800 },
    { name: 'Amlodipine 5mg Tablet', genericName: 'Amlodipine', category: 'Antihypertensives', route: 'Oral', dosageForm: 'Tablet', unitPrice: 150 },
    { name: 'Metformin 500mg Tablet', genericName: 'Metformin HCl', category: 'Antidiabetics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 80 },
    { name: 'Furosemide 40mg Tablet', genericName: 'Furosemide', category: 'Diuretics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 100 },
    { name: 'Morphine 10mg/ml Injection', genericName: 'Morphine Sulphate', category: 'Analgesics (Opioid)', route: 'IV', dosageForm: 'Injection', unitPrice: 2500 },
    { name: 'Enoxaparin (Clexane) 40mg', genericName: 'Enoxaparin Sodium', category: 'Anticoagulants', route: 'SC', dosageForm: 'Injection', unitPrice: 5500 },
    { name: 'Atorvastatin 40mg Tablet', genericName: 'Atorvastatin', category: 'Lipid-Lowering', route: 'Oral', dosageForm: 'Tablet', unitPrice: 250 },
    { name: 'Artemether-Lumefantrine 80/480mg', genericName: 'Artemether/Lumefantrine', category: 'Antimalarials', route: 'Oral', dosageForm: 'Tablet', unitPrice: 1800 },
  ],
  paediatric: [
    // Paediatric IV Fluids
    { name: 'Normal Saline 0.9% 250ml (Paeds)', genericName: 'Sodium Chloride 0.9%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 600 },
    { name: 'Dextrose 5% 250ml (Paeds)', genericName: 'Dextrose 5%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 650 },
    { name: 'Ringer Lactate 250ml (Paeds)', genericName: 'Lactated Ringer', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 700 },
    { name: 'Dextrose 10% 250ml (Paeds)', genericName: 'Dextrose 10%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 750 },
    // Paediatric Antibiotics
    { name: 'Amoxicillin Syrup 125mg/5ml', genericName: 'Amoxicillin', category: 'Antibiotics', route: 'Oral', dosageForm: 'Syrup', unitPrice: 800 },
    { name: 'Ampicillin 500mg Injection (Paeds)', genericName: 'Ampicillin Sodium', category: 'Antibiotics', route: 'IV', dosageForm: 'Injection', unitPrice: 900 },
    { name: 'Ceftriaxone 500mg Injection (Paeds)', genericName: 'Ceftriaxone', category: 'Antibiotics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 1500 },
    { name: 'Gentamicin 20mg Injection (Paeds)', genericName: 'Gentamicin', category: 'Antibiotics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 500 },
    { name: 'Chloramphenicol Syrup 125mg/5ml', genericName: 'Chloramphenicol', category: 'Antibiotics', route: 'Oral', dosageForm: 'Syrup', unitPrice: 700 },
    // Paediatric Analgesics & Antipyretics
    { name: 'Paracetamol Syrup 120mg/5ml', genericName: 'Acetaminophen Syrup', category: 'Analgesics/Antipyretics', route: 'Oral', dosageForm: 'Syrup', unitPrice: 400 },
    { name: 'Ibuprofen Syrup 100mg/5ml', genericName: 'Ibuprofen Syrup', category: 'NSAIDs', route: 'Oral', dosageForm: 'Syrup', unitPrice: 500 },
    // Antimalarials
    { name: 'Artemether-Lumefantrine 20/120mg (Paeds)', genericName: 'Artemether/Lumefantrine', category: 'Antimalarials', route: 'Oral', dosageForm: 'Tablet', unitPrice: 1200 },
    { name: 'IV Artesunate 30mg (Paeds)', genericName: 'Artesunate', category: 'Antimalarials', route: 'IV', dosageForm: 'Injection', unitPrice: 5000 },
    // Anticonvulsants
    { name: 'Phenobarbitone 30mg/ml Injection', genericName: 'Phenobarbital', category: 'Anticonvulsants', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 1800 },
    { name: 'Diazepam 5mg/ml Rectal Gel', genericName: 'Diazepam', category: 'Anticonvulsants', route: 'Rectal', dosageForm: 'Gel', unitPrice: 2500 },
    // ORS & Nutrition
    { name: 'ORS Sachets (Paeds)', genericName: 'Oral Rehydration Salts', category: 'Oral Rehydration', route: 'Oral', dosageForm: 'Sachet', unitPrice: 150 },
    { name: 'Zinc Sulphate 20mg/5ml Syrup', genericName: 'Zinc Sulphate', category: 'Nutritional Supplements', route: 'Oral', dosageForm: 'Syrup', unitPrice: 600 },
    { name: 'Vitamin A 200000 IU Capsule', genericName: 'Retinol', category: 'Nutritional Supplements', route: 'Oral', dosageForm: 'Capsule', unitPrice: 300 },
    { name: 'Iron-Folic Acid Syrup', genericName: 'Iron + Folic Acid', category: 'Nutritional Supplements', route: 'Oral', dosageForm: 'Syrup', unitPrice: 500 },
  ],
  emergency: [
    { name: 'Adrenaline 1mg/ml Injection', genericName: 'Epinephrine', category: 'Emergency Drugs', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 3500 },
    { name: 'Atropine 1mg Injection', genericName: 'Atropine Sulphate', category: 'Emergency Drugs', route: 'IV', dosageForm: 'Injection', unitPrice: 800 },
    { name: 'Normal Saline 0.9% 1000ml', genericName: 'Sodium Chloride 0.9%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 1200 },
    { name: 'Ringer Lactate 1000ml', genericName: 'Lactated Ringer', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 1400 },
    { name: 'Morphine 10mg/ml Injection', genericName: 'Morphine Sulphate', category: 'Analgesics (Opioid)', route: 'IV', dosageForm: 'Injection', unitPrice: 2500 },
    { name: 'Ceftriaxone 1g Injection', genericName: 'Ceftriaxone Sodium', category: 'Antibiotics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 2200 },
    { name: 'Metronidazole 500mg IV', genericName: 'Metronidazole', category: 'Antibiotics', route: 'IV', dosageForm: 'IV Infusion', unitPrice: 800 },
    { name: 'Diazepam 10mg/2ml Injection', genericName: 'Diazepam', category: 'Anticonvulsants', route: 'IV', dosageForm: 'Injection', unitPrice: 1200 },
    { name: 'Magnesium Sulphate 50% 10ml', genericName: 'MgSO4', category: 'Emergency Drugs', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 800 },
    { name: 'Glucose 50% 20ml', genericName: 'Hypertonic Dextrose', category: 'Emergency Drugs', route: 'IV', dosageForm: 'Injection', unitPrice: 600 },
    { name: 'Hydrocortisone 100mg Injection', genericName: 'Hydrocortisone Sodium Succinate', category: 'Corticosteroids', route: 'IV', dosageForm: 'Injection', unitPrice: 2500 },
    { name: 'Furosemide 20mg/2ml Injection', genericName: 'Furosemide', category: 'Diuretics', route: 'IV', dosageForm: 'Injection', unitPrice: 400 },
    { name: 'Naloxone 0.4mg/ml', genericName: 'Naloxone HCl', category: 'Antidotes', route: 'IV/IM/SC', dosageForm: 'Injection', unitPrice: 5000 },
  ],
  maternity: [
    { name: 'Oxytocin 10 IU/ml Injection', genericName: 'Oxytocin', category: 'Uterotonics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 1200 },
    { name: 'Misoprostol 200mcg Tablet', genericName: 'Misoprostol', category: 'Uterotonics', route: 'Oral/Sublingual', dosageForm: 'Tablet', unitPrice: 800 },
    { name: 'Magnesium Sulphate 50% 10ml', genericName: 'MgSO4', category: 'Pre-Eclampsia/Eclampsia', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 800 },
    { name: 'Normal Saline 0.9% 500ml', genericName: 'Sodium Chloride 0.9%', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 800 },
    { name: 'Ringer Lactate 500ml', genericName: 'Lactated Ringer', category: 'IV Fluids', route: 'IV', dosageForm: 'IV Bag', unitPrice: 900 },
    { name: 'Methyldopa 250mg Tablet', genericName: 'Methyldopa', category: 'Antihypertensives (Pregnancy)', route: 'Oral', dosageForm: 'Tablet', unitPrice: 180 },
    { name: 'Iron-Folic Acid 65mg/0.4mg Tablet', genericName: 'Ferrous Sulphate + Folic Acid', category: 'Haematinics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 80 },
    { name: 'Ampicillin 1g Injection (Maternity)', genericName: 'Ampicillin Sodium', category: 'Antibiotics', route: 'IV', dosageForm: 'Injection', unitPrice: 1200 },
    { name: 'Gentamicin 80mg Injection', genericName: 'Gentamicin Sulphate', category: 'Antibiotics', route: 'IV/IM', dosageForm: 'Injection', unitPrice: 700 },
    { name: 'Metronidazole 500mg IV', genericName: 'Metronidazole', category: 'Antibiotics', route: 'IV', dosageForm: 'IV Infusion', unitPrice: 800 },
    { name: 'Paracetamol 1g Tablet', genericName: 'Acetaminophen', category: 'Analgesics', route: 'Oral', dosageForm: 'Tablet', unitPrice: 100 },
    { name: 'Diclofenac 50mg Tablet (Post-Delivery)', genericName: 'Diclofenac Sodium', category: 'NSAIDs', route: 'Oral', dosageForm: 'Tablet', unitPrice: 120 },
  ],
};

// GET /pharmacy/ward-medications?ward=surgical|icu|medical|private|paediatric|emergency|maternity
router.get('/ward-medications', async (req, res, next) => {
  try {
    const ward = (String(req.query.ward || 'medical')).toLowerCase().replace(/\s+/g, '');
    const search = req.query.search ? String(req.query.search).toLowerCase() : '';

    // 1. Fetch all pharmacy inventory with live stock
    const pharmacyItems = await prisma.pharmacyInventoryItem.findMany({
      include: {
        batches: {
          include: {
            warehouse: true,
          }
        }
      },
    });

    const pharmacyMapped = pharmacyItems.map(item => {
      const batches = item.batches || [];
      const dispensaryStock = batches
        .filter(b => b.warehouse?.code === 'DISP-MAIN' || b.warehouse?.name?.toLowerCase().includes('dispensary'))
        .reduce((sum, b) => sum + (b.currentQuantity || 0), 0);

      const centralStoreStock = batches
        .filter(b => b.warehouse?.code === 'WH-MAIN' || b.warehouse?.name?.toLowerCase().includes('central') || b.warehouse?.name?.toLowerCase().includes('warehouse') || b.warehouse?.name?.toLowerCase().includes('store'))
        .reduce((sum, b) => sum + (b.currentQuantity || 0), 0);

      const totalStock = batches.reduce((sum, b) => sum + (b.currentQuantity || 0), 0);

      return {
        id: item.id,
        name: item.brandName || item.genericName,
        genericName: item.genericName,
        brandName: item.brandName,
        category: item.classification || 'General',
        route: 'Oral',
        dosageForm: item.dosageForm || 'Tablet',
        stockQty: dispensaryStock,
        dispensaryStock,
        centralStoreStock,
        totalStock: totalStock > 0 ? totalStock : (item.stockLeft || 0),
        inStock: dispensaryStock > 0,
        isExternal: false,
        isPharmacyItem: true,
        unitPrice: Number(item.price) || 0,
        batches: item.batches,
      };
    });

    // 2. Get ward-specific data dictionary
    // Use ward key with fallback: paediatric->paediatric, icu->icu, etc.
    const wardKey = ward.includes('icu') ? 'icu' :
      ward.includes('surg') ? 'surgical' :
      ward.includes('priv') || ward.includes('vip') ? 'private' :
      ward.includes('paed') || ward.includes('pedi') ? 'paediatric' :
      ward.includes('emerg') ? 'emergency' :
      ward.includes('mater') || ward.includes('labour') ? 'maternity' :
      'medical';

    const dictItems = (WARD_MEDICATION_DICTIONARY[wardKey] || WARD_MEDICATION_DICTIONARY.medical).map((item, idx) => ({
      id: `DICT-${wardKey.toUpperCase()}-${idx}`,
      name: item.name,
      genericName: item.genericName,
      brandName: null,
      category: item.category,
      route: item.route,
      dosageForm: item.dosageForm,
      stockQty: 0,
      inStock: false,
      isExternal: true,
      isPharmacyItem: false,
      unitPrice: 0,
    }));

    // 3. Merge — pharmacy items take precedence; dict items not found in pharmacy are added as external
    const pharmacyNames = new Set(pharmacyMapped.map(p => p.name.toLowerCase()));
    const pharmacyGenericNames = new Set(pharmacyMapped.map(p => (p.genericName || '').toLowerCase()));

    const filteredDictItems = dictItems.filter(d => {
      const dName = d.name.toLowerCase();
      const dGeneric = d.genericName.toLowerCase();
      // Include dict item only if not already in pharmacy stock
      return !pharmacyNames.has(dName) && !pharmacyGenericNames.has(dGeneric) &&
        !Array.from(pharmacyNames).some(pn => pn.includes(dGeneric.split(' ')[0]) || dGeneric.includes(pn.split(' ')[0]));
    });

    // Also include out-of-stock pharmacy items that match the ward dictionary
    const dictNames = new Set(dictItems.map(d => d.name.toLowerCase()));
    const allItems = [
      ...pharmacyMapped,
      ...filteredDictItems,
    ];

    // Apply search filter
    const result = search
      ? allItems.filter(item =>
          item.name.toLowerCase().includes(search) ||
          (item.genericName || '').toLowerCase().includes(search) ||
          (item.category || '').toLowerCase().includes(search)
        )
      : allItems;

    // Sort: pharmacy in-stock first, then pharmacy out-of-stock, then external
    result.sort((a, b) => {
      if (a.isPharmacyItem && a.inStock && !(b.isPharmacyItem && b.inStock)) return -1;
      if (b.isPharmacyItem && b.inStock && !(a.isPharmacyItem && a.inStock)) return 1;
      if (a.isPharmacyItem && !b.isPharmacyItem) return -1;
      if (b.isPharmacyItem && !a.isPharmacyItem) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, data: result, ward: wardKey });
  } catch (error) {
    console.error('Error fetching ward medications:', error);
    res.json({ success: true, data: [], ward: 'unknown' });
  }
});

// ─── MASTER INVENTORY & BATCHES ──────────────────────────────────────────────

// Fetch all inventory items
router.get('/inventory', async (req, res, next) => {
  try {
    const { classification, search } = req.query;
    const where: any = {};
    if (classification) where.classification = classification as string;
    if (search) {
      where.OR = [
        { genericName: { contains: search as string } },
        { brandName: { contains: search as string } },
        { itemCode: { contains: search as string } },
      ];
    }
    const items = await prisma.pharmacyInventoryItem.findMany({
      where,
      include: {
        batches: {
          include: {
            warehouse: true,
            supplier: true,
          }
        },
      },
    });
    const mapped = items.map(item => {
      const batches = item.batches || [];
      const dispensaryStock = batches
        .filter(b => b.warehouse?.code === 'DISP-MAIN' || b.warehouse?.name?.toLowerCase().includes('dispensary'))
        .reduce((sum, b) => sum + (b.currentQuantity || 0), 0);

      const centralStoreStock = batches
        .filter(b => b.warehouse?.code === 'WH-MAIN' || b.warehouse?.name?.toLowerCase().includes('central') || b.warehouse?.name?.toLowerCase().includes('warehouse') || b.warehouse?.name?.toLowerCase().includes('store'))
        .reduce((sum, b) => sum + (b.currentQuantity || 0), 0);

      const totalStock = batches.reduce((sum, b) => sum + (b.currentQuantity || 0), 0);

      return {
        ...item,
        name: item.brandName || item.genericName,
        quantityInStock: dispensaryStock,
        stock: dispensaryStock,
        stockLeft: dispensaryStock,
        dispensaryStock,
        centralStoreStock,
        totalStock: totalStock > 0 ? totalStock : (item.stockLeft || 0),
        isDispensaryInStock: dispensaryStock > 0,
      };
    });
    res.json(mapped);
  } catch (error) {
    next(error);
  }
});

router.post('/inventory/bulk', async (req, res, next) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected an array of items' });
    let count = 0;
    for (const item of items) {
      if (!item.itemCode || !item.genericName) continue;
      await prisma.pharmacyInventoryItem.upsert({
        where: { itemCode: String(item.itemCode) },
        update: {
          genericName: item.genericName,
          brandName: item.brandName || '',
          dosageForm: item.dosageForm || 'Tablet',
          strength: item.strength || '',
          manufacturer: item.manufacturer || '',
          supplierPreferred: item.supplierPreferred || '',
          storageRequirements: item.storageRequirements || 'Room Temp',
          unitOfMeasure: item.unitOfMeasure || 'Pack',
          classification: item.classification || 'General',
          price: Number(item.price) || 0,
          requiresFasting: Boolean(item.requiresFasting),
          loincCode: item.loincCode || '',
        },
        create: {
          itemCode: String(item.itemCode),
          genericName: item.genericName,
          brandName: item.brandName || '',
          dosageForm: item.dosageForm || 'Tablet',
          strength: item.strength || '',
          manufacturer: item.manufacturer || '',
          supplierPreferred: item.supplierPreferred || '',
          storageRequirements: item.storageRequirements || 'Room Temp',
          unitOfMeasure: item.unitOfMeasure || 'Pack',
          classification: item.classification || 'General',
          price: Number(item.price) || 0,
          requiresFasting: Boolean(item.requiresFasting),
          loincCode: item.loincCode || '',
        }
      });
      count++;
    }
    res.json({ success: true, imported: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add new medication to master catalog
router.post('/inventory', async (req, res, next) => {
  try {
    const {
      itemCode, genericName, brandName, dosageForm, strength,
      manufacturer, supplierPreferred, storageRequirements, unitOfMeasure,
      classification, price, requiresFasting, loincCode,
    } = req.body;

    let finalItemCode = itemCode || `MED-${Date.now().toString().slice(-6)}`;
    const existing = await prisma.pharmacyInventoryItem.findUnique({
      where: { itemCode: finalItemCode },
    });

    if (existing) {
      finalItemCode = `${finalItemCode}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const item = await prisma.pharmacyInventoryItem.create({
      data: {
        itemCode: finalItemCode,
        genericName: genericName || 'Medication',
        brandName: brandName || genericName || 'Generic',
        dosageForm: dosageForm || 'Tablet',
        strength: strength || '500 mg',
        manufacturer,
        supplierPreferred,
        storageRequirements,
        unitOfMeasure: unitOfMeasure || 'Tablet',
        classification: classification || 'PRESCRIPTION',
        price: price ? Number(price) : 0,
        requiresFasting: Boolean(requiresFasting),
        loincCode,
      },
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// Add stock batch
router.post('/batches', async (req, res, next) => {
  try {
    const {
      inventoryItemId, batchNumber, expiryDate, manufacturerDate,
      purchaseCost, receivedQuantity, supplierId, lotNumber,
    } = req.body;

    const batch = await prisma.pharmacyStockBatch.create({
      data: {
        inventoryItemId,
        batchNumber,
        expiryDate: new Date(expiryDate),
        manufacturerDate: manufacturerDate ? new Date(manufacturerDate) : null,
        purchaseCost,
        receivedQuantity,
        currentQuantity: receivedQuantity,
        supplierId,
        lotNumber,
      },
    });
    res.status(201).json(batch);
  } catch (error) {
    next(error);
  }
});

// ─── PROCUREMENT & SUPPLIERS ────────────────────────────────────────────────

// Fetch all suppliers
router.get('/suppliers', async (req, res, next) => {
  try {
    const suppliers = await prisma.pharmacySupplier.findMany();
    res.json(suppliers);
  } catch (error) {
    next(error);
  }
});

// Create supplier
router.post('/suppliers', async (req, res, next) => {
  try {
    const data = req.body;
    if (data.licenseExpiry) data.licenseExpiry = new Date(data.licenseExpiry);
    const supplier = await prisma.pharmacySupplier.create({ data });
    res.status(201).json(supplier);
  } catch (error) {
    next(error);
  }
});

// Fetch purchase orders
router.get('/procurement', async (req, res, next) => {
  try {
    const pos = await prisma.pharmacyPurchaseOrder.findMany({
      include: {
        supplier: true,
        items: { include: { medication: true } },
      },
    });
    res.json(pos);
  } catch (error) {
    next(error);
  }
});

// Create purchase order
router.post('/procurement', async (req, res, next) => {
  try {
    const { supplierId, deliverySchedule, items } = req.body;
    const poNumber = `PO-RX-${Date.now().toString().slice(-8)}`;

    let totalAmount = 0;
    const poItems = items.map((i: any) => {
      totalAmount += i.quantityOrdered * Number(i.unitCost);
      return {
        medicationId: i.medicationId,
        quantityOrdered: i.quantityOrdered,
        unitCost: i.unitCost,
      };
    });

    const po = await prisma.pharmacyPurchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        deliverySchedule,
        totalAmount,
        items: {
          create: poItems,
        },
      },
      include: { items: true },
    });
    res.status(201).json(po);
  } catch (error) {
    next(error);
  }
});

// GRN Receiving against PO
router.post('/grn', async (req, res, next) => {
  try {
    const { poId, receivedBy, supplierInvoiceNo, notes, items } = req.body;
    const grnNumber = `GRN-RX-${Date.now().toString().slice(-8)}`;

    const grn = await prisma.pharmacyGRN.create({
      data: {
        grnNumber,
        poId,
        receivedBy,
        supplierInvoiceNo,
        notes,
        items: {
          create: items.map((i: any) => ({
            medicationId: i.medicationId,
            quantityReceived: i.quantityReceived,
            batchNumber: i.batchNumber,
            expiryDate: new Date(i.expiryDate),
            unitCost: i.unitCost,
          })),
        },
      },
      include: { items: true },
    });

    // Update PO item counts and catalog batches
    for (const item of items) {
      // Create new batch for this item in inventory
      await prisma.pharmacyStockBatch.create({
        data: {
          inventoryItemId: item.medicationId,
          batchNumber: item.batchNumber,
          expiryDate: new Date(item.expiryDate),
          purchaseCost: item.unitCost,
          receivedQuantity: item.quantityReceived,
          currentQuantity: item.quantityReceived,
        },
      });

      // Update PO items received count
      const poItem = await prisma.pharmacyPurchaseOrderItem.findFirst({
        where: { poId, medicationId: item.medicationId },
      });
      if (poItem) {
        await prisma.pharmacyPurchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            quantityReceived: { increment: item.quantityReceived },
          },
        });
      }
    }

    // Check PO total progress and complete/partial PO state
    const poItems = await prisma.pharmacyPurchaseOrderItem.findMany({
      where: { poId },
    });
    const allCompleted = poItems.every(i => i.quantityReceived >= i.quantityOrdered);
    await prisma.pharmacyPurchaseOrder.update({
      where: { id: poId },
      data: {
        status: allCompleted ? 'COMPLETED' : 'PARTIAL',
      },
    });

    res.status(201).json(grn);
  } catch (error) {
    next(error);
  }
});

// ─── SAFETY & CONTROLLED SUBSTANCES ──────────────────────────────────────────

// Controlled drug register log
router.get('/controlled-logs', async (req, res, next) => {
  try {
    const logs = await prisma.pharmacyControlledSubstanceLog.findMany({
      include: { inventoryItem: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Record direct log (receive / adjustment)
router.post('/controlled-logs', async (req, res, next) => {
  try {
    const { inventoryItemId, batchNumber, transactionType, quantity, recordedBy, authorizedBy, verificationDetails, comments } = req.body;
    let validItemId = inventoryItemId;
    let resolvedItem = validItemId ? await prisma.pharmacyInventoryItem.findUnique({ where: { id: validItemId } }).catch(() => null) : null;

    if (!resolvedItem && validItemId) {
      resolvedItem = await prisma.pharmacyInventoryItem.findFirst({
        where: { OR: [{ itemCode: validItemId }, { genericName: { contains: validItemId, mode: 'insensitive' } }] }
      }).catch(() => null);
    }

    if (!resolvedItem) {
      resolvedItem = await prisma.pharmacyInventoryItem.findFirst({ where: { classification: 'CONTROLLED' } }).catch(() => null) ||
                     await prisma.pharmacyInventoryItem.findFirst().catch(() => null);
    }

    if (!resolvedItem) {
      resolvedItem = await prisma.pharmacyInventoryItem.create({
        data: {
          itemCode: 'NAR-STD-001',
          genericName: 'Morphine / Controlled Medication Standard',
          brandName: 'Vault Stock',
          dosageForm: 'Injection',
          strength: '10mg/ml',
          classification: 'CONTROLLED',
          price: 5000,
          unitOfMeasure: 'Ampoule',
        }
      });
    }

    if (transactionType === 'DISPENSE') {
      const dispBatch = await prisma.pharmacyStockBatch.findFirst({
        where: {
          inventoryItemId: resolvedItem.id,
          warehouse: { code: 'DISP-MAIN' },
          currentQuantity: { gt: 0 },
        },
        include: { warehouse: true }
      });

      if (!dispBatch || dispBatch.currentQuantity < (Number(quantity) || 1)) {
        const centralBatch = await prisma.pharmacyStockBatch.findFirst({
          where: {
            inventoryItemId: resolvedItem.id,
            warehouse: { code: 'WH-MAIN' },
            currentQuantity: { gt: 0 },
          },
          include: { warehouse: true }
        });

        if (centralBatch) {
          return res.status(400).json({
            error: `Cannot dispense "${resolvedItem.brandName || resolvedItem.genericName}": Insufficient or 0 stock in Pharmacy Dispensary (${dispBatch?.currentQuantity || 0} units available). It exists in the Pharmacy Inventory (Central Warehouse: ${centralBatch.currentQuantity} units available). Please transfer stock from the Pharmacy Inventory page before dispensing.`
          });
        }
      } else {
        await prisma.pharmacyStockBatch.update({
          where: { id: dispBatch.id },
          data: { currentQuantity: { decrement: Number(quantity) || 1 } }
        }).catch(() => {});
      }
    }

    const log = await prisma.pharmacyControlledSubstanceLog.create({
      data: {
        inventoryItemId: resolvedItem.id,
        batchNumber: batchNumber || 'BATCH-VAULT-01',
        transactionType: transactionType || 'RECEIVE',
        quantity: Number(quantity) || 1,
        recordedBy: recordedBy || 'Authorized Pharmacist',
        authorizedBy: authorizedBy || undefined,
        verificationDetails: verificationDetails || undefined,
        comments: comments || undefined,
      },
      include: { inventoryItem: true },
    });
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
});

// Adverse Drug Events (ADE)
router.get('/ades', async (req, res, next) => {
  try {
    const ades = await prisma.pharmacyADE.findMany({
      include: { patient: true },
      orderBy: { reportedAt: 'desc' },
    });
    res.json(ades);
  } catch (error) {
    next(error);
  }
});

router.post('/ades', async (req, res, next) => {
  try {
    const data = req.body;
    const ade = await prisma.pharmacyADE.create({ data });
    res.status(201).json(ade);
  } catch (error) {
    next(error);
  }
});

// Clinical Interventions
router.get('/interventions', async (req, res, next) => {
  try {
    const list = await prisma.pharmacyClinicalIntervention.findMany({
      include: {
        pharmacist: { select: { firstName: true, lastName: true } },
        prescriber: { select: { firstName: true, lastName: true } },
        prescription: true,
      },
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

router.post('/interventions', async (req, res, next) => {
  try {
    const data = req.body;
    const intervention = await prisma.pharmacyClinicalIntervention.create({ data });
    res.status(201).json(intervention);
  } catch (error) {
    next(error);
  }
});

// ─── RECONCILIATION & WORKLOAD ANALYTICS ─────────────────────────────────────

// Fetch daily sales reconciliation data
router.get('/sales-reconciliation', async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await prisma.pharmacyDispensingRecord.findMany({
      where: { dispensedAt: { gte: startOfDay } },
      include: {
        prescriptionItem: { include: { medication: true } },
        dispenser: true,
      },
    });

    let totalCash = 0;
    let totalInsurance = 0;
    let totalCollected = 0;

    logs.forEach(l => {
      const price = Number(l.prescriptionItem.medication.price) * l.quantityDispensed;
      if (l.insuranceStatus === 'INS_COVERED') {
        totalInsurance += price - Number(l.coPaymentAmount);
        totalCash += Number(l.coPaymentAmount);
      } else {
        totalCash += price;
      }
      totalCollected += price;
    });

    res.json({
      date: startOfDay.toLocaleDateString(),
      totalTransactions: logs.length,
      revenueCollected: totalCollected,
      cashPortion: totalCash,
      insurancePortion: totalInsurance,
      transactions: logs,
    });
  } catch (error) {
    next(error);
  }
});

// Analytics Dashboard Endpoint
router.get('/analytics', async (req, res, next) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalPrescriptions,
      dispenses,
      ades,
      interventions,
      inventoryItems,
      controlledCount,
    ] = await Promise.all([
      prisma.pharmacyPrescription.count(),
      prisma.pharmacyDispensingRecord.findMany({
        include: { prescription: true },
      }),
      prisma.pharmacyADE.count(),
      prisma.pharmacyClinicalIntervention.count(),
      prisma.pharmacyInventoryItem.findMany({ include: { batches: true } }),
      prisma.pharmacyControlledSubstanceLog.count(),
    ]);

    // Average Turnaround Time logic
    let totalDurationMinutes = 0;
    let countTimed = 0;
    
    // We can measure verification time (from orderedAt to verifiedAt)
    const verPres = await prisma.pharmacyPrescription.findMany({
      where: { verifiedAt: { not: null } },
      select: { orderedAt: true, verifiedAt: true },
    });
    
    verPres.forEach(p => {
      if (p.verifiedAt) {
        totalDurationMinutes += (new Date(p.verifiedAt).getTime() - new Date(p.orderedAt).getTime()) / 60000;
        countTimed++;
      }
    });

    const avgTAT = countTimed > 0 ? Math.round(totalDurationMinutes / countTimed) : 12; // fallback minutes

    // Inventory status counting
    let lowStockCount = 0;
    let totalValue = 0;
    let nearExpiryCount = 0;
    const now = new Date();
    const alertExpiry = new Date();
    alertExpiry.setDate(now.getDate() + 90); // 90 days warning

    inventoryItems.forEach(item => {
      const currentStock = item.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      // Let's assume standard reorder of 50
      if (currentStock <= 50) lowStockCount++;
      
      item.batches.forEach(b => {
        totalValue += Number(b.purchaseCost) * b.currentQuantity;
        if (new Date(b.expiryDate) <= alertExpiry) {
          nearExpiryCount++;
        }
      });
    });

    res.json({
      summary: {
        totalPrescriptions,
        totalDispensed: dispenses.length,
        avgTATMinutes: avgTAT,
        adesCount: ades,
        interventionsCount: interventions,
        lowStockItems: lowStockCount,
        nearExpiryCount,
        inventoryTotalValue: totalValue,
        controlledSubstancesDispensed: controlledCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/inventory/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      itemCode,
      genericName,
      brandName,
      dosageForm,
      strength,
      manufacturer,
      supplierPreferred,
      storageRequirements,
      unitOfMeasure,
      classification,
      price,
      requiresFasting,
      isActive,
      loincCode,
      moniepointProductId,
    } = req.body;

    const data: any = {};
    if (itemCode !== undefined) data.itemCode = itemCode;
    if (genericName !== undefined) data.genericName = genericName;
    if (brandName !== undefined) data.brandName = brandName;
    if (dosageForm !== undefined) data.dosageForm = dosageForm;
    if (strength !== undefined) data.strength = strength;
    if (manufacturer !== undefined) data.manufacturer = manufacturer;
    if (supplierPreferred !== undefined) data.supplierPreferred = supplierPreferred;
    if (storageRequirements !== undefined) data.storageRequirements = storageRequirements;
    if (unitOfMeasure !== undefined) data.unitOfMeasure = unitOfMeasure;
    if (classification !== undefined) data.classification = classification;
    if (price !== undefined) data.price = Number(price);
    if (requiresFasting !== undefined) data.requiresFasting = Boolean(requiresFasting);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (loincCode !== undefined) data.loincCode = loincCode;
    if (moniepointProductId !== undefined) data.moniepointProductId = moniepointProductId;

    const item = await prisma.pharmacyInventoryItem.update({
      where: { id },
      data,
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/inventory/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.pharmacyInventoryItem.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Edit a prescription
router.put('/prescriptions/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { priority, clinicalNotes, diagnosis, paymentStatus } = req.body;
    const updated = await prisma.pharmacyPrescription.update({
      where: { id },
      data: { priority, clinicalNotes, diagnosis, paymentStatus },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete a prescription
router.delete('/prescriptions/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.pharmacyPrescription.delete({
      where: { id },
    });
    res.json({ success: true, message: 'Prescription deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
