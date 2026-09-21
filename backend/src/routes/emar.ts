import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();
import { prisma } from '../prisma.js';

// 1. Get medicationRequests prescriptions from CPOE and active eMAR records for patient
router.get('/patient/:patientId', authMiddleware, async (req, res, next) => {
  try {
    const { patientId } = req.params;

    // 1. Fetch ALL Pharmacy Prescriptions for this patient (ordered by most recent first)
    const pharmacyPrescriptions = await prisma.pharmacyPrescription.findMany({
      where: { patientId },
      include: {
        prescriber: {
          select: { id: true, firstName: true, lastName: true, designation: true }
        },
        items: {
          include: {
            medication: true,
            dispensedRecords: {
              include: { dispenser: { select: { id: true, firstName: true, lastName: true, designation: true } } },
              orderBy: { dispensedAt: 'desc' },
              take: 1
            }
          }
        },
        dispensedRecords: { include: { dispenser: true }, take: 1, orderBy: { dispensedAt: 'desc' } }
      },
      orderBy: { orderedAt: 'desc' }
    });

    // 2. Fetch CPOE MedicationRequests
    const cpoePrescriptions = await prisma.medicationRequest.findMany({
      where: { patientId },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true, designation: true } }
      },
      orderBy: { authoredOn: 'desc' }
    });

    const allPrescriptions: any[] = [];
    const paidPrescriptions: any[] = [];
    let hasUnpaid = false;
    let hasUndispensed = false;

    // Map pharmacy prescriptions — PAID/WAIVED ones go to nurses, UNPAID ones tracked separately
    pharmacyPrescriptions.forEach(rx => {
      const prescriberName = rx.prescriber
        ? `Dr. ${rx.prescriber.firstName} ${rx.prescriber.lastName}`
        : 'Ward Doctor';
      const dept = rx.department || 'Inpatient Ward';
      const isPaid =
        rx.paymentStatus === 'PAID' ||
        rx.paymentStatus === 'COMPLETED' ||
        rx.paymentStatus === 'DISPENSED' ||
        rx.paymentStatus === 'WAIVED' ||
        rx.paymentStatus === 'EXEMPT' ||
        Number(rx.totalAmount || 0) === 0;

      if (rx.items && rx.items.length > 0) {
        rx.items.forEach((item: any, idx) => {
          const isExternalItem = Boolean(
            item.isExternalPurchase === true ||
            item.isExternal === true ||
            item.status === 'OUT_OF_STOCK_EXTERNAL' ||
            item.medication?.itemCode === 'EXT-PURCHASE-MED' ||
            item.medication?.genericName === 'External Purchase Medication' ||
            item.clinicalIndication?.toLowerCase().startsWith('external purchase:')
          );
          const itemCleared = isPaid || isExternalItem;
          if (!itemCleared) {
            hasUnpaid = true;
          }

          // ── Dispensing Gate (FR-PHARM-301): Item must be dispensed by pharmacist before nurse can administer ──
          // External purchases bypass dispensing requirement (patient sourced externally)
          const isItemDispensed = isExternalItem ||
            item.status === 'DISPENSED' ||
            item.status === 'PARTIAL_DISPENSED' ||
            (item.dispensedRecords && item.dispensedRecords.length > 0);

          if (itemCleared && !isItemDispensed) {
            hasUndispensed = true;
          }

          // Resolve dispensing pharmacist name if available
          const dispenserRecord = item.dispensedRecords?.[0];
          const dispensedByName = dispenserRecord?.dispenser
            ? `${dispenserRecord.dispenser.firstName} ${dispenserRecord.dispenser.lastName}`
            : null;

          // Resolve the real medication name (even for external/out-of-stock items)
          const rawName = (() => {
            // 1. clinicalIndication stores "External purchase: [Drug Name]" — extract the drug name
            if (item.clinicalIndication?.toLowerCase().startsWith('external purchase:')) {
              return item.clinicalIndication.replace(/^external purchase:\s*/i, '').trim();
            }
            // 2. If medication record exists and is not the generic placeholder, use it
            if (item.medication && item.medication.genericName !== 'External Purchase Medication') {
              return item.medication.brandName
                ? `${item.medication.genericName} (${item.medication.brandName})`
                : item.medication.genericName;
            }
            // 3. Fall back to item.name (the name typed by the doctor when prescribing)
            if (item.name) return item.name;
            // 4. Last resort — readable fallback
            return 'Prescribed Medication';
          })();

          const medName = isExternalItem
            ? `${rawName} (External Purchase - Out of Stock)`
            : rawName;
          const dosage = item.dose || item.strength || '500mg';
          const route = item.route || item.dosageForm || 'Oral';
          const freq = item.frequency || 'TID (8-hourly)';
          const prescriptionEntry = {
            id: `${rx.id}-${idx}`,
            prescriptionNumber: rx.prescriptionNumber,
            medicationName: medName,
            dosage,
            route,
            frequency: freq,
            doctorName: prescriberName,
            department: dept,
            paymentStatus: itemCleared ? (isExternalItem ? 'EXEMPT (EXTERNAL)' : 'PAID') : 'UNPAID',
            isPaid: itemCleared,
            isDispensed: isItemDispensed,
            isExternal: isExternalItem,
            dispensedBy: dispensedByName,
            invoiceNo: `RX-INV-${rx.prescriptionNumber}`,
            authoredOn: rx.orderedAt,
            notes: rx.clinicalNotes || item.clinicalIndication || 'Bedside dose per doctor order'
          };
          allPrescriptions.push(prescriptionEntry);
          // Nurses can only administer medications that are PAID and DISPENSED by pharmacist
          if (itemCleared && isItemDispensed) {
            paidPrescriptions.push(prescriptionEntry);
          }
        });
      } else {
        const prescriptionEntry = {
          id: rx.id,
          prescriptionNumber: rx.prescriptionNumber,
          medicationName: 'IV Normal Saline 0.9% 500ml',
          dosage: '500ml',
          route: 'Intravenous (IV)',
          frequency: 'Continuous',
          doctorName: prescriberName,
          department: dept,
          paymentStatus: isPaid ? 'PAID' : 'UNPAID',
          isPaid,
          isExternal: false,
          invoiceNo: `RX-INV-${rx.prescriptionNumber}`,
          authoredOn: rx.orderedAt,
          notes: rx.clinicalNotes || 'Bedside fluid administration'
        };
        allPrescriptions.push(prescriptionEntry);
        if (isPaid) {
          paidPrescriptions.push(prescriptionEntry);
        }
      }
    });

    // Map CPOE MedicationRequests (already paid — doctor direct orders)
    cpoePrescriptions.forEach(cpoe => {
      const docName = cpoe.staff
        ? `Dr. ${cpoe.staff.firstName} ${cpoe.staff.lastName}`
        : 'Attending Physician';
      const entry = {
        id: cpoe.id,
        prescriptionNumber: cpoe.fhirId || `CPOE-${cpoe.id.slice(0, 6)}`,
        medicationName: cpoe.medicationDisplay || 'Prescribed Medication Order',
        dosage: cpoe.dosageText?.split('·')[0]?.trim() || '1 Dose',
        route: cpoe.dosageText?.includes('IV') ? 'Intravenous (IV)' : 'Oral',
        frequency: 'Daily',
        doctorName: docName,
        department: 'Inpatient Ward',
        paymentStatus: 'PAID',
        isPaid: true,
        isExternal: false,
        invoiceNo: `CPOE-INV-${cpoe.id.slice(0, 6).toUpperCase()}`,
        authoredOn: cpoe.authoredOn,
        notes: cpoe.note || 'CPOE Doctor Direct Order'
      };
      allPrescriptions.push(entry);
      paidPrescriptions.push(entry);
    });

    // Fetch eMAR logs
    const emarLogs = await prisma.eMARRecord.findMany({
      where: { patientId },
      include: { administerer: true },
      orderBy: { scheduledTime: 'desc' }
    });

    // Fetch patient allergies for alert validations (FR-NUR-125)
    const allergies = await prisma.allergy.findMany({
      where: { patientId, isActive: true }
    });

    res.json({
      // Nurses only see PAID + DISPENSED prescriptions to administer (dispensing gate FR-PHARM-301)
      prescriptions: paidPrescriptions,
      // Full list for reference (includes unpaid and undispensed)
      allPrescriptions,
      // Flag: patient has prescriptions pending payment at cashier
      hasUnpaidPrescriptions: hasUnpaid,
      // Flag: patient has paid prescriptions not yet dispensed by pharmacist
      hasUndispensedPrescriptions: hasUndispensed,
      // prescriptionStatus helps the frontend show contextual messages
      prescriptionStatus: paidPrescriptions.length === 0
        ? (hasUnpaid ? 'PENDING_PAYMENT' : (hasUndispensed ? 'PENDING_DISPENSING' : 'NO_PRESCRIPTIONS'))
        : 'HAS_PRESCRIPTIONS',
      emarLogs,
      allergies: allergies.map(a => ({
        allergen: a.allergen,
        severity: a.severity,
        category: a.category,
      }))
    });
  } catch (error) {
    next(error);
  }
});

// 2. Administer medication or log omission/delay
router.post('/administer', authMiddleware, async (req: any, res, next) => {
  try {
    const {
      patientId,
      medicationName,
      dosage,
      route,
      site,
      status, // ADMINISTERED, OMITTED, DELAYED
      omittedReason,
      notes,
      scheduledTime,
      administeredById,
    } = z.object({
      patientId: z.string(),
      medicationName: z.string(),
      dosage: z.string(),
      route: z.string(),
      site: z.string().optional().nullable(),
      status: z.enum(['ADMINISTERED', 'OMITTED', 'DELAYED']),
      omittedReason: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      scheduledTime: z.string().transform(val => new Date(val)),
      administeredById: z.string(),
    }).parse(req.body);

    // Business Rule: Check drug allergy conflicts before registering
    const activeAllergies = await prisma.allergy.findMany({
      where: { patientId, isActive: true }
    });

    const allergyConflict = activeAllergies.find(a =>
      medicationName.toLowerCase().includes(a.allergen.toLowerCase()) ||
      a.allergen.toLowerCase().includes(medicationName.toLowerCase())
    );

    // Create eMAR administration record
    const emar = await prisma.eMARRecord.create({
      data: {
        patientId,
        medicationName,
        dosage,
        route,
        site,
        status,
        scheduledTime,
        administeredTime: status === 'ADMINISTERED' ? new Date() : null,
        administeredById: status === 'ADMINISTERED' ? administeredById : null,
        omittedReason: status !== 'ADMINISTERED' ? omittedReason : null,
        notes: notes || (allergyConflict ? `[ALLERGY ALERT WARNING IN EFFECT: ${allergyConflict.allergen}]` : null),
      },
      include: { patient: true }
    });

    // Update matching PharmacyPrescriptionItem status to DISPENSED_EXTERNAL
    if (status === 'ADMINISTERED') {
      try {
        const matchingItems = await prisma.pharmacyPrescriptionItem.findMany({
          where: {
            prescription: { patientId },
            status: { in: ['PENDING', 'OUT_OF_STOCK_EXTERNAL', 'ORDERED'] },
          },
          include: { medication: true }
        });
        const cleanTarget = medicationName.replace(/\s*\[.*\]/, '').replace(/\s*\(External Purchase.*\)/i, '').trim().toLowerCase();
        const matched = matchingItems.find(it => {
          const name1 = (it.medication?.genericName || '').toLowerCase();
          const name2 = (it.medication?.brandName || '').toLowerCase();
          const indication = (it.clinicalIndication || '').toLowerCase();
          return name1.includes(cleanTarget) || cleanTarget.includes(name1) ||
                 name2.includes(cleanTarget) || cleanTarget.includes(name2) ||
                 indication.includes(cleanTarget) || cleanTarget.includes(indication);
        });
        if (matched) {
          // Only mark DISPENSED_EXTERNAL for genuinely external/out-of-stock items
          const isGenuinelyExternal =
            matched.status === 'OUT_OF_STOCK_EXTERNAL' ||
            matched.medication?.itemCode === 'EXT-PURCHASE-MED' ||
            matched.medication?.genericName === 'External Purchase Medication' ||
            matched.clinicalIndication?.toLowerCase().startsWith('external purchase:');
          const newItemStatus = isGenuinelyExternal ? 'DISPENSED_EXTERNAL' : 'DISPENSED';
          await prisma.pharmacyPrescriptionItem.update({
            where: { id: matched.id },
            data: { status: newItemStatus, quantityDispensed: matched.quantityPrescribed || 1 }
          });
        }
      } catch (err) {
        console.warn('Non-fatal: Failed to update pharmacy prescription item status on eMAR administer:', err);
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'emar.administer',
      resourceType: 'eMARRecord',
      resourceId: emar.id,
      changes: { status, details: `Medication ${medicationName} marked as ${status} for patient ${emar.patient.firstName}. Scheduled slot: ${scheduledTime.toISOString()}` }
    });

    res.status(201).json({
      emar,
      allergyWarning: allergyConflict ? `Patient is allergic to ${allergyConflict.allergen} (${allergyConflict.severity})!` : null
    });
  } catch (error) {
    next(error);
  }
});

// 3. IV Infusion fluid administrations
router.post('/infusions', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, fluidName, rateMlHr, siteChecks, action } = z.object({
      patientId: z.string(),
      fluidName: z.string(),
      rateMlHr: z.number(),
      siteChecks: z.string().optional().nullable(),
      action: z.enum(['START', 'ADJUST', 'COMPLETE']),
    }).parse(req.body);

    // We can save this inside the eMAR logs with custom notes
    const emar = await prisma.eMARRecord.create({
      data: {
        patientId,
        medicationName: `IV Infusion: ${fluidName}`,
        dosage: `${rateMlHr} ml/hr`,
        route: 'Intravenous',
        site: siteChecks || 'IV Line',
        scheduledTime: new Date(),
        administeredTime: new Date(),
        status: 'ADMINISTERED',
        notes: `IV Infusion event: ${action}. Site checks: ${siteChecks || 'Normal'}`,
      },
      include: { patient: true }
    });

    await logAudit({
      userId: req.user.id,
      action: 'emar.infusion',
      resourceType: 'eMARRecord',
      resourceId: emar.id,
      changes: { action, details: `IV fluid infusion ${fluidName} (${action}) registered for patient ${emar.patient.firstName}` }
    });

    res.status(201).json(emar);
  } catch (error) {
    next(error);
  }
});

export default router;
