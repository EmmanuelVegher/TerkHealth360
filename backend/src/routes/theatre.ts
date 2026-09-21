import { Router } from 'express';
import { invoices } from './billing.js';

const router = Router();
import { prisma } from '../prisma.js';

// ─── 11.1 SURGICAL REQUESTS & BOOKINGS ───────────────────────────────────────

// Fetch surgical requests queue
router.get('/requests', async (req, res, next) => {
  try {
    const list = await prisma.surgicalRequest.findMany({
      include: { patient: true, surgeon: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

// Create surgical request (clinical order)
router.post('/requests', async (req, res, next) => {
  try {
    const { patientId, surgeonId, diagnosis, proposedProcedure, urgency, estimatedDurationMin, anaesthesiaReqs, preferredDate } = req.body;
    const requestNumber = `REQ-SRG-${Date.now().toString().slice(-5)}`;

    let finalSurgeonId = surgeonId;
    if (!finalSurgeonId) {
      const defaultSurgeon = await prisma.staff.findFirst({
        where: {
          AND: [
            { lastName: { not: 'Clinician' } },
            {
              OR: [
                { specialization: { contains: 'Surgeon', mode: 'insensitive' } },
                { designation: { contains: 'Consultant', mode: 'insensitive' } },
                { designation: { contains: 'Doctor', mode: 'insensitive' } },
                { department: { contains: 'Surgery', mode: 'insensitive' } }
              ]
            }
          ]
        }
      }) || await prisma.staff.findFirst({ where: { lastName: { not: 'Clinician' } } }) || await prisma.staff.findFirst();
      finalSurgeonId = defaultSurgeon?.id;
    }

    const srgRequest = await prisma.surgicalRequest.create({
      data: {
        requestNumber,
        patientId,
        surgeonId: finalSurgeonId,
        diagnosis,
        proposedProcedure,
        urgency: urgency || 'ELECTIVE',
        estimatedDurationMin: Number(estimatedDurationMin || 60),
        anaesthesiaReqs,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        status: (urgency === 'EMERGENCY') ? 'APPROVED' : 'PENDING'
      }
    });

    // Auto-create active Visit for patient with Surgical Workflow Template
    try {
      const { createVisitWorkflowState } = await import('./workflow.js');
      const isEmergency = (urgency || 'ELECTIVE') === 'EMERGENCY';
      const visitType = isEmergency ? 'SURGERY_EMERGENCY' : 'SURGERY_SCHEDULED';
      const initialStatus = isEmergency ? 'IN_SURGERY' : 'AWAITING_PAYMENT';

      let activeVisit = await prisma.visit.findFirst({
        where: {
          patientId,
          status: { notIn: ['CLOSED', 'DISCHARGED'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!activeVisit) {
        const visitNumber = `VIS-${Date.now().toString().slice(-6)}`;
        activeVisit = await prisma.visit.create({
          data: {
            visitNumber,
            patientId,
            visitType,
            status: initialStatus,
            chiefComplaint: `Surgical Order: ${proposedProcedure} (Diagnosis: ${diagnosis})`,
          }
        });
        await createVisitWorkflowState(activeVisit.id, visitType);
      }

      // Create DB invoice for billing clearance
      const invoiceNo = `SRG-INV-${requestNumber}`;
      const depositAmount = isEmergency ? 0 : 150000;
      await prisma.invoice.create({
        data: {
          patientId,
          fhirId: invoiceNo,
          status: isEmergency ? 'PAID' : 'ISSUED',
          total: depositAmount,
          amountPaid: isEmergency ? depositAmount : 0,
          reasonText: `Surgical Fee Deposit & Financial Clearance: ${proposedProcedure} (Req: ${requestNumber})`
        }
      }).catch(() => {});
    } catch (visitErr) {
      console.error('[Theatre] Failed to auto-create surgical visit/invoice:', visitErr);
    }

    res.status(201).json(srgRequest);
  } catch (error) {
    next(error);
  }
});

// Grant financial authorization / clearance for surgical request
router.patch('/requests/:id/clearance', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status = 'APPROVED' } = req.body;

    const srg = await prisma.surgicalRequest.update({
      where: { id },
      data: { status }
    });

    // Sync DB invoice status if exists
    const expectedInvoiceNo = `SRG-INV-${srg.requestNumber}`;
    try {
      await prisma.invoice.updateMany({
        where: { fhirId: expectedInvoiceNo },
        data: { status: 'PAID', amountPaid: 150000 }
      });
    } catch (e) {}

    // Advance active visit workflow state if present
    try {
      const activeVisit = await prisma.visit.findFirst({
        where: { patientId: srg.patientId, status: { notIn: ['CLOSED', 'DISCHARGED'] } },
        orderBy: { createdAt: 'desc' }
      });
      if (activeVisit) {
        const { autoAdvanceVisitToStatus } = await import('./workflow.js');
        await autoAdvanceVisitToStatus(activeVisit.id, 'PRE_OP_ASSESSMENT', 'Theatre Financial Officer');
      }
    } catch (e) {}

    res.json({ success: true, data: srg });
  } catch (error) {
    next(error);
  }
});

// Fetch theatre bookings
router.get('/bookings', async (req, res, next) => {
  try {
    const list = await prisma.surgicalBooking.findMany({
      include: {
        patient: true,
        surgeon: true,
        anaesthetist: true,
        preOpAssessments: true,
        preAnaesthetics: true,
        consents: true,
        safetyChecklists: true,
        intraOpRecords: { include: { implantsUsed: true, specimensCollected: true } },
        pacuRecords: true
      },
      orderBy: { scheduledStart: 'asc' }
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

// Book operating theatre (with double-booking protection checks)
router.post('/bookings', async (req, res, next) => {
  try {
    const { requestId, patientId, surgeonId, anaesthetistId, operatingRoom, scheduledStart, scheduledEnd, implantReserved, bloodProductsReserved, sterileKitsReserved } = req.body;

    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);

    // double-booking validation rule: check if OR is booked during this slot
    const conflict = await prisma.surgicalBooking.findFirst({
      where: {
        operatingRoom,
        status: { in: ['BOOKED', 'IN_THEATRE'] },
        OR: [
          { scheduledStart: { lte: start }, scheduledEnd: { gte: start } },
          { scheduledStart: { lte: end }, scheduledEnd: { gte: end } },
          { scheduledStart: { gte: start }, scheduledEnd: { lte: end } }
        ]
      }
    });

    if (conflict) {
      return res.status(409).json({
        error: `double-booking Block: Operating Room ${operatingRoom} is already booked for another surgical procedure during this scheduled time slot.`
      });
    }

    // Resolve surgical request details if missing
    let surgReq = null;
    if (requestId) {
      surgReq = await prisma.surgicalRequest.findUnique({ where: { id: requestId } });
    }

    const finalPatientId = patientId || surgReq?.patientId;
    if (!finalPatientId) {
      return res.status(400).json({ error: 'patientId or valid requestId is required' });
    }

    let finalSurgeonId = surgeonId || surgReq?.surgeonId;
    if (!finalSurgeonId || String(finalSurgeonId).trim() === '') {
      const defaultSurgeon = await prisma.staff.findFirst({
        where: {
          OR: [
            { designation: { contains: 'Doctor', mode: 'insensitive' } },
            { designation: { contains: 'Surgeon', mode: 'insensitive' } },
            { specialization: { contains: 'Surgery', mode: 'insensitive' } },
            { department: { contains: 'Surgery', mode: 'insensitive' } }
          ]
        }
      }) || await prisma.staff.findFirst();
      finalSurgeonId = defaultSurgeon?.id;
    }

    if (!finalSurgeonId) {
      return res.status(400).json({ error: 'A valid surgeonId is required to book an operating room' });
    }

    const finalAnaesthetistId = (anaesthetistId && String(anaesthetistId).trim() !== '') ? anaesthetistId : null;

    const booking = await prisma.surgicalBooking.create({
      data: {
        requestId,
        patientId: finalPatientId,
        surgeonId: finalSurgeonId,
        anaesthetistId: finalAnaesthetistId,
        operatingRoom: operatingRoom || 'OR-1 (Main Surgical Table)',
        scheduledStart: start,
        scheduledEnd: end,
        implantReserved: !!implantReserved,
        bloodProductsReserved: !!bloodProductsReserved,
        sterileKitsReserved: !!sterileKitsReserved,
        status: 'BOOKED'
      }
    });

    // Update request status
    await prisma.surgicalRequest.update({
      where: { id: requestId },
      data: { status: 'SCHEDULED' }
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

// ─── 11.2 PRE-OPERATIVE & SAFETY CHECKLISTS ───────────────────────────────

// Create Pre-op clinical assessment
router.post('/bookings/:id/preop', async (req, res, next) => {
  try {
    const { patientId, clinicianId, fastingHours, medicalHistory, allergies, vitalsSigns, investigationStatus } = req.body;
    
    const preOp = await prisma.preOpAssessment.create({
      data: {
        bookingId: req.params.id,
        patientId,
        clinicianId,
        fastingHours: Number(fastingHours || 8),
        medicalHistory,
        allergies,
        vitalsSigns,
        investigationStatus: investigationStatus || 'COMPLETE',
        status: 'APPROVED'
      }
    });
    res.status(201).json(preOp);
  } catch (error) {
    next(error);
  }
});

// Create Pre-anaesthetic clearance evaluation
router.post('/bookings/:id/preanaesthetic', async (req, res, next) => {
  try {
    const { clinicianId, airwayEvaluation, asaClassification, anestheticRisks, plannedAnaesthesia, clearanceStatus } = req.body;
    
    let staffId = clinicianId;
    if (!staffId) {
      const defaultStaff = await prisma.staff.findFirst();
      staffId = defaultStaff?.id || 'STAFF-ANAESTHESIA';
    }

    const preAn = await prisma.preAnaestheticAssessment.create({
      data: {
        bookingId: req.params.id,
        clinicianId: staffId,
        airwayEvaluation: airwayEvaluation || 'Mallampati Class I',
        asaClassification: asaClassification || 'ASA_I',
        anestheticRisks: anestheticRisks || 'None',
        plannedAnaesthesia: plannedAnaesthesia || 'General Anaesthesia',
        clearanceStatus: clearanceStatus || 'CLEARED'
      }
    });
    res.status(201).json(preAn);
  } catch (error) {
    next(error);
  }
});

// Save informed surgical consent form
router.post('/bookings/:id/consent', async (req, res, next) => {
  try {
    const { patientId, benefitsExplained, risksExplained, signaturePatient, signatureSurgeon, signerName, relationship, signatureImage } = req.body;
    const consentCode = `CNS-${Date.now().toString().slice(-6)}`;

    const consent = await prisma.surgicalConsent.create({
      data: {
        bookingId: req.params.id,
        patientId,
        consentCode,
        benefitsExplained: !!benefitsExplained,
        risksExplained: !!risksExplained,
        signaturePatient: !!signaturePatient,
        signatureSurgeon: !!signatureSurgeon,
        signerName: signerName || null,
        relationship: relationship || null,
        signatureImage: signatureImage || null
      }
    });
    res.status(201).json(consent);
  } catch (error) {
    next(error);
  }
});

// Update WHO safety checklist sign in / timeout / sign out phases
router.post('/bookings/:id/safety-check', async (req, res, next) => {
  try {
    const { signInComplete, timeoutComplete, signoutComplete, completedBy } = req.body;
    
    const check = await prisma.wHOSurgicalSafetyCheck.create({
      data: {
        bookingId: req.params.id,
        signInComplete: !!signInComplete,
        signInTime: signInComplete ? new Date() : null,
        timeoutComplete: !!timeoutComplete,
        timeoutTime: timeoutComplete ? new Date() : null,
        signoutComplete: !!signoutComplete,
        signoutTime: signoutComplete ? new Date() : null,
        completedBy
      }
    });

    res.status(201).json(check);
  } catch (error) {
    next(error);
  }
});

// ─── 11.3 INTRA-OPERATIVE SURGERY RECORDING ───────────────────────────────

// Save intra-op record with instrument and swab count checks
// Get intra-op record
router.get('/bookings/:id/intraop', async (req, res, next) => {
  try {
    const record = await prisma.intraOpRecord.findFirst({
      where: { bookingId: req.params.id },
      include: { implantsUsed: true, specimensCollected: true }
    });
    res.json(record || null);
  } catch (error) {
    next(error);
  }
});

// Save intra-op record with instrument and swab count checks
router.post('/bookings/:id/intraop', async (req, res, next) => {
  try {
    const {
      anaesthesiaStart,
      anaesthesiaEnd,
      surgicalIncision,
      surgicalClosure,
      initialInstrumentCount,
      closureInstrumentCount,
      initialSwabCount,
      closureSwabCount,
      estimatedBloodLossML,
      primaryProcedureNotes
    } = req.body;

    const initialInst = Number(initialInstrumentCount || 0);
    const closureInst = Number(closureInstrumentCount || 0);
    const initialSwabs = Number(initialSwabCount || 0);
    const closureSwabs = Number(closureSwabCount || 0);

    const instrumentReconciled = initialInst === closureInst;
    const swabsReconciled = initialSwabs === closureSwabs;

    // Safety check: if count is not reconciled, raise count mismatch block
    if (!instrumentReconciled || !swabsReconciled) {
      return res.status(400).json({
        error: `Safety Alert: Count Mismatch! Swabs/Instruments are not reconciled (Initial: ${initialInst}/${initialSwabs}, Closure: ${closureInst}/${closureSwabs}). Count reconciliation is mandatory to prevent retained foreign object events.`
      });
    }

    const existing = await prisma.intraOpRecord.findFirst({
      where: { bookingId: req.params.id }
    });

    let intraOp;
    if (existing) {
      intraOp = await prisma.intraOpRecord.update({
        where: { id: existing.id },
        data: {
          anaesthesiaStart: anaesthesiaStart ? new Date(anaesthesiaStart) : existing.anaesthesiaStart,
          anaesthesiaEnd: anaesthesiaEnd ? new Date(anaesthesiaEnd) : existing.anaesthesiaEnd,
          surgicalIncision: surgicalIncision ? new Date(surgicalIncision) : existing.surgicalIncision,
          surgicalClosure: surgicalClosure ? new Date(surgicalClosure) : existing.surgicalClosure,
          initialInstrumentCount: initialInst,
          closureInstrumentCount: closureInst,
          instrumentReconciled,
          initialSwabCount: initialSwabs,
          closureSwabCount: closureSwabs,
          swabsReconciled,
          estimatedBloodLossML: Number(estimatedBloodLossML || existing.estimatedBloodLossML || 0),
          primaryProcedureNotes: primaryProcedureNotes || existing.primaryProcedureNotes
        }
      });
    } else {
      intraOp = await prisma.intraOpRecord.create({
        data: {
          bookingId: req.params.id,
          anaesthesiaStart: anaesthesiaStart ? new Date(anaesthesiaStart) : null,
          anaesthesiaEnd: anaesthesiaEnd ? new Date(anaesthesiaEnd) : null,
          surgicalIncision: surgicalIncision ? new Date(surgicalIncision) : null,
          surgicalClosure: surgicalClosure ? new Date(surgicalClosure) : null,
          initialInstrumentCount: initialInst,
          closureInstrumentCount: closureInst,
          instrumentReconciled,
          initialSwabCount: initialSwabs,
          closureSwabCount: closureSwabs,
          swabsReconciled,
          estimatedBloodLossML: Number(estimatedBloodLossML || 0),
          primaryProcedureNotes
        }
      });
    }

    // Advance booking status
    try {
      await prisma.surgicalBooking.update({
        where: { id: req.params.id },
        data: { status: 'RECOVERY' }
      });
    } catch (e) {
      console.warn('Booking status update non-fatal error:', e);
    }

    res.status(201).json(intraOp);
  } catch (error) {
    next(error);
  }
});

// Authorize discharge from PACU (Support both PUT and POST)
const handlePacuDischarge = async (req: any, res: any, next: any) => {
  try {
    const { dischargeNotes, targetWard } = req.body;

    const existingRec = await prisma.pACURecoveryRecord.findFirst({
      where: { bookingId: req.params.id }
    });

    let rec;
    if (existingRec) {
      rec = await prisma.pACURecoveryRecord.update({
        where: { id: existingRec.id },
        data: {
          dischargeTime: new Date(),
          dischargeAuthorized: true,
          dischargeNotes: dischargeNotes || `Discharged to ${targetWard || 'Inpatient Ward'}`
        }
      });
    } else {
      const booking = await prisma.surgicalBooking.findUnique({ where: { id: req.params.id } });
      rec = await prisma.pACURecoveryRecord.create({
        data: {
          bookingId: req.params.id,
          patientId: booking?.patientId || '',
          clinicianId: booking?.surgeonId || '',
          vitalsLog: JSON.stringify([{ event: 'PACU Admission & Discharge', aldrete: 10, time: new Date() }]),
          aldreteScore: 10,
          dischargeTime: new Date(),
          dischargeAuthorized: true,
          dischargeNotes: dischargeNotes || `Discharged to ${targetWard || 'Inpatient Ward'}`
        }
      });
    }

    try {
      await prisma.surgicalBooking.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED' }
      });

      // Register patient into target ward as Expectant Inpatient awaiting bed assignment
      const booking = await prisma.surgicalBooking.findUnique({
        where: { id: req.params.id },
        include: { patient: true }
      });

      if (booking?.patientId) {
        const selectedWardName = targetWard || 'Surgical Ward';

        // Ensure Ward exists in DB
        let ward = await prisma.ward.findFirst({
          where: { name: { contains: selectedWardName.replace('Ward', '').trim(), mode: 'insensitive' } }
        });
        if (!ward) {
          ward = await prisma.ward.create({
            data: { name: selectedWardName, type: 'SURGICAL', capacity: 25 }
          }).catch(() => null);
        }

        // Discharge old bed assignments for this patient so they become expectant
        await prisma.admission.updateMany({
          where: { patientId: booking.patientId, status: 'ADMITTED' },
          data: { status: 'DISCHARGED', dischargeReason: `Transferred from Operating Theatre PACU to ${selectedWardName}. ${dischargeNotes || ''}`, dischargedAt: new Date() }
        }).catch(() => {});


        // Update active Visit to PENDING_BED_ASSIGNMENT
        const activeVisit = await prisma.visit.findFirst({
          where: { patientId: booking.patientId, status: { not: 'CLOSED' } }
        });
        if (activeVisit) {
          await prisma.visit.update({
            where: { id: activeVisit.id },
            data: { status: 'PENDING_BED_ASSIGNMENT', visitType: 'INPATIENT' }
          }).catch(() => {});
        } else {
          await prisma.visit.create({
            data: {
              patientId: booking.patientId,
              visitType: 'INPATIENT',
              status: 'PENDING_BED_ASSIGNMENT',
              chiefComplaint: `Post-op Transfer from Theatre PACU to ${selectedWardName}`,
              visitNumber: `VST-${Date.now()}`
            }
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Post-op ward transfer non-fatal error:', e);
    }

    res.json(rec);
  } catch (error) {
    next(error);
  }
};

router.put('/bookings/:id/recovery/discharge', handlePacuDischarge);
router.post('/bookings/:id/recovery/discharge', handlePacuDischarge);

// Fetch CSSD cycles
router.get('/cssd', async (req, res, next) => {
  try {
    const cycles = await prisma.cSSDSterilizationCycle.findMany({
      include: { officer: true },
      orderBy: { sterilizedAt: 'desc' }
    });
    res.json(cycles);
  } catch (error) {
    next(error);
  }
});

// Log Autoclave sterilization parameters (CSSD)
router.post('/cssd', async (req, res, next) => {
  try {
    const { sterilizerCode, kitIdentifierCode, temperatureCelsius, pressurePsi, exposureDurationMin, officerId } = req.body;
    const cycleNumber = `CSSD-CYC-${Date.now().toString().slice(-6)}`;

    const temp = Number(temperatureCelsius);
    const press = Number(pressurePsi);
    const dur = Number(exposureDurationMin);

    // Validation rule: Autoclave sterilization requires >= 121C, >= 15 psi, and >= 15 min duration
    const passed = (temp >= 121 && press >= 15 && dur >= 15);
    const cycleOutcomeStatus = passed ? 'PASSED' : 'FAILED';

    const cycle = await prisma.cSSDSterilizationCycle.create({
      data: {
        sterilizerCode,
        kitIdentifierCode,
        cycleNumber,
        temperatureCelsius: temp,
        pressurePsi: press,
        exposureDurationMin: dur,
        cycleOutcomeStatus,
        officerId
      }
    });

    res.status(201).json(cycle);
  } catch (error) {
    next(error);
  }
});

// ─── 11.5 STAT EMERGENCY QUICK START & REAL-TIME BILLING ────────────────────

// Category 1 Emergency Quick-Start Surgery
router.post('/quick-start-emergency', async (req, res, next) => {
  try {
    const { patientId, tempPatientName, gender, age, diagnosis, proposedProcedure } = req.body;
    let finalPatientId = patientId;

    if (!finalPatientId && tempPatientName) {
      const nameParts = tempPatientName.trim().split(' ');
      const firstName = nameParts[0] || 'Emergency';
      const lastName = nameParts.slice(1).join(' ') || 'Unregistered';
      const dummyUserId = `user-emg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newPatient = await prisma.patient.create({
        data: {
          userId: dummyUserId,
          patientNumber: `EMG-REG-${Date.now().toString().slice(-5)}`,
          firstName,
          lastName,
          gender: gender || 'FEMALE',
          birthDate: age ? new Date(Date.now() - Number(age) * 365.25 * 24 * 60 * 60 * 1000) : new Date(Date.now() - 30 * 365.25 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
        }
      });
      finalPatientId = newPatient.id;
    }

    if (!finalPatientId) {
      const p = await prisma.patient.findFirst({
        where: { firstName: { contains: 'Emergency', mode: 'insensitive' } }
      }) || await prisma.patient.findFirst();
      finalPatientId = p?.id;
    }

    const formattedDiagnosis = Array.isArray(diagnosis)
      ? diagnosis.join(', ')
      : (diagnosis || 'Category 1 Emergency Surgical Case');

    const defaultSurgeon = await prisma.staff.findFirst({
      where: {
        OR: [
          { department: { contains: 'Surgery', mode: 'insensitive' } },
          { designation: { contains: 'Doctor', mode: 'insensitive' } }
        ]
      }
    }) || await prisma.staff.findFirst();

    if (!defaultSurgeon) {
      return res.status(400).json({ message: 'No staff available in system for emergency surgeon assignment' });
    }

    const reqNum = `EMG-SRG-${Date.now().toString().slice(-5)}`;
    const srgRequest = await prisma.surgicalRequest.create({
      data: {
        requestNumber: reqNum,
        patientId: finalPatientId!,
        surgeonId: defaultSurgeon.id,
        diagnosis: formattedDiagnosis,
        proposedProcedure: proposedProcedure || 'STAT Emergency Exploratory Surgery',
        urgency: 'EMERGENCY',
        estimatedDurationMin: 90,
        anaesthesiaReqs: 'STAT General Anaesthesia / Airway Prep',
        status: 'BOOKED'
      }
    });

    const booking = await prisma.surgicalBooking.create({
      data: {
        requestId: srgRequest.id,
        patientId: finalPatientId!,
        surgeonId: defaultSurgeon.id,
        operatingRoom: 'OR-3 (Emergency STAT)',
        scheduledStart: new Date(),
        scheduledEnd: new Date(Date.now() + 90 * 60 * 1000),
        status: 'IN_THEATRE',
        implantReserved: false,
        bloodProductsReserved: true,
        sterileKitsReserved: true
      },
      include: { patient: true, surgeon: true, request: { include: { patient: true, surgeon: true } } }
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

// Log consumables used during surgery & add to patient bill (Real-time billing)
router.post('/bookings/:id/consumables', async (req, res, next) => {
  try {
    const { items } = req.body;
    const booking = await prisma.surgicalBooking.findUnique({
      where: { id: req.params.id },
      include: { patient: true }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    let totalAmount = 0;
    const itemSummaries = (items || []).map((it: any) => {
      const qty = Number(it.quantity || 1);
      const price = Number(it.unitPrice || 0);
      totalAmount += qty * price;
      return `${it.name} x${qty} (₦${(qty * price).toLocaleString()})`;
    });

    const invoiceNo = `INV-THR-${Date.now().toString().slice(-6)}`;
    const reasonText = `Operating Theatre Consumables & Medication: ${itemSummaries.join(', ')}`;

    // Create DB billing item with UNPAID status so it shows in Internal Banking
    const invoice = await prisma.invoice.create({
      data: {
        patientId: booking.patientId,
        total: totalAmount,
        status: 'UNPAID',
        fhirId: invoiceNo,
        reasonText
      }
    }).catch((err) => {
      console.error('[Theatre] DB Invoice creation error:', err);
      return null;
    });

    // Register line items in Billing module in-memory store
    const patientName = booking.patient ? `${booking.patient.firstName} ${booking.patient.lastName}` : 'Surgical Patient';
    const lineItems = (items || []).map((it: any) => ({
      code: `THR-CONS-${(it.name || '').replace(/[^a-zA-Z0-9]/g, '-').toUpperCase()}`,
      chargeCode: 'THEATRE-CONSUMABLE',
      description: `[Theatre Consumable] ${it.name}`,
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || 0),
      vat: 0,
      total: Number(it.quantity || 1) * Number(it.unitPrice || 0)
    }));

    invoices.push({
      id: invoice?.id || `inv_thr_${Date.now()}`,
      invoiceNo,
      patientId: booking.patientId,
      patientName,
      patientNumber: booking.patient?.patientNumber,
      items: lineItems,
      subtotal: totalAmount,
      vatTotal: 0,
      discountAmount: 0,
      totalAmount,
      patientAmount: totalAmount,
      donorAmount: 0,
      fundingSource: 'SELF_PAY',
      status: 'UNPAID',
      amountPaid: 0,
      outstanding: totalAmount,
      notes: reasonText,
      createdAt: new Date().toISOString(),
      source: 'THEATRE'
    });

    res.status(201).json({
      success: true,
      message: `Consumables & medication billed to patient (Invoice ${invoiceNo}). ₦${totalAmount.toLocaleString()} sent to Internal Banking billing module!`,
      items,
      totalAmount,
      invoiceId: invoice?.id || invoiceNo,
      invoiceNo
    });
  } catch (error) {
    next(error);
  }
});

// Update booking status
router.post('/bookings/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await prisma.surgicalBooking.update({
      where: { id: req.params.id },
      data: { status },
      include: { patient: true }
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
});

export default router;

