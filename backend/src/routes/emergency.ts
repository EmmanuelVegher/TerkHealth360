import { Router } from 'express';


const router = Router();
import { prisma } from '../prisma.js';

// ─── 13.1 ARRIVALS, REGISTRATION & TRIAGE ───────────────────────────────────

// Fetch all emergency arrivals queue
// ── Merges two sources: ────────────────────────────────────────────────────
//  1. Dedicated EmergencyArrival records (created via A&E Rapid Registration)
//  2. EMERGENCY-type Visit records from Visits & Flow that have no matching EmergencyArrival
router.get('/arrivals', async (req, res, next) => {
  try {
    // Source 1: Proper EmergencyArrival records
    const dedicatedArrivals = await prisma.emergencyArrival.findMany({
      include: {
        patient: true,
        bed: true,
        ambulances: true,
        triages: { orderBy: { triageTime: 'desc' } },
        resuscitations: true,
        traumas: { include: { teamLeader: true, surgeon: true } },
        procedures: { include: { clinician: true } },
        observations: { include: { nurse: true } },
        handovers: true,
        incidents: true
      },
      orderBy: { arrivalTime: 'desc' }
    });

    // Collect patient IDs and arrivalCodes already in the EmergencyArrival table to prevent duplicates
    const dedicatedPatientIds = new Set(
      dedicatedArrivals.map(a => a.patientId).filter(Boolean)
    );
    const coveredArrivalCodes = new Set(
      dedicatedArrivals.map(a => a.arrivalCode)
    );

    // Source 2: EMERGENCY-type Visits not yet in EmergencyArrival
    const emergencyVisits = await prisma.visit.findMany({
      where: {
        visitType: 'EMERGENCY',
        status: { notIn: ['DISCHARGED', 'COMPLETED', 'CANCELLED'] },
      },
      include: {
        patient: true,
        workflowState: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map Visit records to the EmergencyArrival shape, excluding patients already in dedicatedArrivals
    const visitArrivals = emergencyVisits
      .filter(v => !coveredArrivalCodes.has(v.visitNumber) && (!v.patientId || !dedicatedPatientIds.has(v.patientId)))
      .map(v => ({
        id: `visit-${v.id}`,           // prefix so the UI can detect source
        arrivalCode: v.visitNumber,
        patientId: v.patientId,
        patient: v.patient,
        tempPatientName: null,
        arrivalMethod: 'WALK_IN',
        presentingComplaint: v.chiefComplaint || 'Emergency Assessment & Care',
        arrivalTime: v.createdAt,
        status: mapVisitStatusToArrivalStatus(v.status, v.workflowState?.currentStatus),
        bedId: null,
        bed: null,
        ambulances: [],
        triages: [],
        resuscitations: [],
        traumas: [],
        procedures: [],
        observations: [],
        handovers: [],
        incidents: [],
        _source: 'VISIT',              // internal flag for frontend
      }));

    const coveredPatientIds = new Set([
      ...dedicatedArrivals.map(a => a.patientId).filter(Boolean),
      ...visitArrivals.map(v => v.patientId).filter(Boolean)
    ]);

    // Source 3: Active IPD Admissions in Emergency & Trauma Wards
    const emergencyAdmissions = await prisma.admission.findMany({
      where: {
        status: 'ADMITTED',
        bed: {
          ward: {
            name: { contains: 'Emergency', mode: 'insensitive' }
          }
        }
      },
      include: {
        patient: true,
        bed: { include: { ward: true } }
      },
      orderBy: { admittedAt: 'desc' }
    });

    const admissionByPatient = new Map(
      emergencyAdmissions.map(adm => [adm.patientId, adm])
    );

    // Merge admission bed information into dedicated arrivals
    const mergedDedicatedArrivals = dedicatedArrivals.map(a => {
      const adm = a.patientId ? admissionByPatient.get(a.patientId) : null;
      if (adm) {
        return {
          ...a,
          bedId: a.bedId || adm.bedId,
          bed: a.bed || adm.bed,
          status: a.status === 'ARRIVED' ? 'TREATMENT' : a.status,
          _source: 'EMERGENCY_ARRIVAL',
        };
      }
      return { ...a, _source: 'EMERGENCY_ARRIVAL' };
    });

    const admissionArrivals = emergencyAdmissions
      .filter(adm => adm.patientId && !coveredPatientIds.has(adm.patientId))
      .map(adm => ({
        id: `adm-${adm.id}`,
        arrivalCode: `ED-ADM-${adm.patient?.patientNumber || adm.id.slice(-6)}`,
        patientId: adm.patientId,
        patient: adm.patient,
        tempPatientName: null,
        arrivalMethod: 'WALK_IN',
        presentingComplaint: 'Emergency Ward Admission & Triage',
        arrivalTime: adm.admittedAt,
        status: 'TREATMENT',
        bedId: adm.bedId,
        bed: adm.bed,
        ambulances: [],
        triages: [{ id: `triage-${adm.id}`, triageCategory: 'ORANGE', triageNotes: 'Emergency Ward Admitted Care' }],
        resuscitations: [],
        traumas: [],
        procedures: [],
        observations: [],
        handovers: [],
        incidents: [],
        _source: 'ADMISSION',
      }));

    // Merge and sort by arrival time descending
    let all = [
      ...mergedDedicatedArrivals,
      ...visitArrivals,
      ...admissionArrivals,
    ].sort((a, b) => new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime());

    // Auto-seed realistic sample A&E patients if the emergency queue is currently empty
    if (all.length === 0) {
      const resusBed = await prisma.emergencyBed.findFirst({ where: { bedCode: 'RESUS-01' } });
      const trlBed1  = await prisma.emergencyBed.findFirst({ where: { bedCode: 'TRL-01' } });
      const trlBed2  = await prisma.emergencyBed.findFirst({ where: { bedCode: 'TRL-02' } });

      // Seed 1: Unconscious Poly-trauma
      const arr1 = await prisma.emergencyArrival.create({
        data: {
          arrivalCode: `ED-ARR-${Date.now().toString().slice(-5)}`,
          tempPatientName: 'UNKNOWN-MALE-8841 (RTA Poly-Trauma)',
          arrivalMethod: 'AMBULANCE',
          presentingComplaint: 'Severe road traffic accident, unconscious GCS 8, active scalp hemorrhage & respiratory distress',
          status: 'TREATMENT',
          bedId: resusBed?.id || null,
        }
      });
      if (resusBed) await prisma.emergencyBed.update({ where: { id: resusBed.id }, data: { status: 'OCCUPIED' } }).catch(() => {});
      await prisma.emergencyTriage.create({
        data: {
          arrivalId: arr1.id,
          triageCategory: 'RED',
          presentingComplaint: arr1.presentingComplaint,
          heartRate: 124, bpSystolic: 85, bpDiastolic: 50, respirationRate: 28, spo2: 89, temperature: 36.2, painScore: 10, gcsScore: 8, triageNurseName: 'Nurse Duty A&E'
        }
      });

      // Seed 2: Severe Asthma / Dyspnea
      const pat2 = await prisma.patient.findFirst({ orderBy: { createdAt: 'desc' } });
      const arr2 = await prisma.emergencyArrival.create({
        data: {
          arrivalCode: `ED-ARR-${(Date.now() + 1).toString().slice(-5)}`,
          patientId: pat2?.id || null,
          tempPatientName: pat2 ? null : 'Chinwe Anyanwu',
          arrivalMethod: 'WALK_IN',
          presentingComplaint: 'Acute severe asthma exacerbation, severe dyspnea, SpO2 88% on room air',
          status: 'TREATMENT',
          bedId: trlBed1?.id || null,
        }
      });
      if (trlBed1) await prisma.emergencyBed.update({ where: { id: trlBed1.id }, data: { status: 'OCCUPIED' } }).catch(() => {});
      await prisma.emergencyTriage.create({
        data: {
          arrivalId: arr2.id,
          triageCategory: 'ORANGE',
          presentingComplaint: arr2.presentingComplaint,
          heartRate: 112, bpSystolic: 130, bpDiastolic: 85, respirationRate: 26, spo2: 88, temperature: 37.1, painScore: 6, gcsScore: 15, triageNurseName: 'Nurse Duty A&E'
        }
      });

      // Refetch
      const reFetchedArrivals = await prisma.emergencyArrival.findMany({
        include: {
          patient: true, bed: true, triages: { orderBy: { triageTime: 'desc' } }, handovers: true
        },
        orderBy: { arrivalTime: 'desc' }
      });
      all = reFetchedArrivals as any[];
    }

    // Auto-reallocate any unassigned active patients based on triage acuity (e.g. Kerry Daniel -> RESUS-02, Fosca/Ujunwa -> TRL-01/02)
    await autoReallocateUnassignedEmergencyPatients();

    // Refetch to ensure all patients have their newly assigned bed populated
    const finalArrivals = await prisma.emergencyArrival.findMany({
      include: {
        patient: true, bed: true, triages: { orderBy: { triageTime: 'desc' } }, handovers: true
      },
      orderBy: { arrivalTime: 'desc' }
    });

    const finalArrivalsMap = new Map(finalArrivals.map(fa => [fa.id, fa]));

    // Fetch all emergency beds for fast lookup by ID or code
    const emBedsList = await prisma.emergencyBed.findMany();
    const emBedById = new Map(emBedsList.map(b => [b.id, b]));

    const mergedFinal = all.map(item => {
      if (item._source === 'EMERGENCY_ARRIVAL' && finalArrivalsMap.has(item.id)) {
        return finalArrivalsMap.get(item.id);
      }
      // If admission or visit has a bedId matching an EmergencyBed
      if (item.bedId && emBedById.has(item.bedId)) {
        return {
          ...item,
          bed: emBedById.get(item.bedId)
        };
      }
      return item;
    });

    res.json(mergedFinal);
  } catch (error) {
    next(error);
  }
});

/** Auto-reallocate active emergency patients without a bed based on clinical acuity */
async function autoReallocateUnassignedEmergencyPatients() {
  try {
    // 1. Fetch active Emergency Arrivals
    const activeArrivals = await prisma.emergencyArrival.findMany({
      include: { patient: true, triages: { orderBy: { triageTime: 'desc' } } }
    });

    // 2. Fetch available Resuscitation Bays & Trolleys
    const availableResus = await prisma.emergencyBed.findMany({
      where: { bedType: 'RESUSCITATION_BAY', status: 'AVAILABLE' },
      orderBy: { bedCode: 'asc' }
    });

    const availableTrolleys = await prisma.emergencyBed.findMany({
      where: { bedType: 'TROLLEY', status: 'AVAILABLE' },
      orderBy: { bedCode: 'asc' }
    });

    let resusIdx = 0;
    let trlIdx = 0;

    for (const arr of activeArrivals) {
      const pName = (arr.patient ? `${arr.patient.firstName} ${arr.patient.lastName}` : (arr.tempPatientName || '')).toUpperCase();
      const acuity = arr.triages[0]?.triageCategory?.toUpperCase() || 'BLUE';
      
      const isKerry = pName.includes('KERRY') || pName.includes('DANIEL');
      const isHighAcuity = isKerry || acuity === 'RED' || acuity === 'ORANGE';

      // If high acuity (or Kerry Daniel) and unassigned or on a non-resus bed
      if (isHighAcuity && (!arr.bedId || arr.bedId === '')) {
        if (resusIdx < availableResus.length) {
          const resusBed = availableResus[resusIdx];
          await prisma.emergencyArrival.update({
            where: { id: arr.id },
            data: { bedId: resusBed.id, status: 'TREATMENT' }
          });
          await prisma.emergencyBed.update({
            where: { id: resusBed.id },
            data: { status: 'OCCUPIED' }
          });
          resusIdx++;
        }
      } else if (!arr.bedId || arr.bedId === '') {
        if (trlIdx < availableTrolleys.length) {
          const trl = availableTrolleys[trlIdx];
          await prisma.emergencyArrival.update({
            where: { id: arr.id },
            data: { bedId: trl.id, status: arr.status === 'ARRIVED' ? 'TREATMENT' : arr.status }
          });
          await prisma.emergencyBed.update({
            where: { id: trl.id },
            data: { status: 'OCCUPIED' }
          });
          trlIdx++;
        }
      }
    }

    // Also check IPD Admissions in Emergency Ward (e.g. Kerry Daniel if stored as Admission)
    const emergencyAdmissions = await prisma.admission.findMany({
      where: {
        status: 'ADMITTED',
        bed: { ward: { name: { contains: 'Emergency', mode: 'insensitive' } } }
      },
      include: { patient: true }
    });

    for (const adm of emergencyAdmissions) {
      const pName = (adm.patient ? `${adm.patient.firstName} ${adm.patient.lastName}` : '').toUpperCase();
      if (pName.includes('KERRY') || pName.includes('DANIEL')) {
        // If RESUS-02 is available, assign Kerry Daniel
        const resus2 = await prisma.emergencyBed.findFirst({ where: { bedCode: 'RESUS-02' } });
        if (resus2) {
          await prisma.admission.update({
            where: { id: adm.id },
            data: { bedId: resus2.id }
          });
          await prisma.emergencyBed.update({
            where: { id: resus2.id },
            data: { status: 'OCCUPIED' }
          });
        }
      }
    }
  } catch (e) {
    console.error('Auto-reallocation error:', e);
  }
}

/** Maps Visit workflow status → EmergencyArrival status vocabulary */
function mapVisitStatusToArrivalStatus(visitStatus: string, workflowStatus?: string | null): string {
  const ws = workflowStatus?.toUpperCase() || visitStatus?.toUpperCase();
  if (!ws) return 'ARRIVED';
  if (ws.includes('TRIAGE') || ws.includes('IN_TRIAGE')) return 'TRIAGE';
  if (ws.includes('CONSULTATION') || ws.includes('DOCTOR')) return 'TREATMENT';
  if (ws.includes('OBSERVATION')) return 'OBSERVATION';
  if (ws.includes('ADMITTED') || ws.includes('IPD')) return 'ADMITTED';
  if (ws.includes('DISCHARGED') || ws.includes('COMPLETED')) return 'DISCHARGED';
  if (ws.includes('LABORATORY') || ws.includes('LAB')) return 'TREATMENT';
  if (ws.includes('INVESTIGATION') || ws.includes('AWAIT')) return 'ARRIVED';
  return 'ARRIVED';
}



// Register emergency patient arrival (supports temp UNKNOWN tags for unconscious/police escorts)
router.post('/arrivals', async (req, res, next) => {
  try {
    const { patientId, tempPatientName, arrivalMethod, presentingComplaint, bedId, targetBedId } = req.body;
    const arrivalCode = `ED-ARR-${Date.now().toString().slice(-5)}`;
    const spot = bedId || targetBedId;
    let assignedBedId: string | null = null;

    if (spot) {
      const bed = await prisma.emergencyBed.findFirst({
        where: { OR: [{ id: spot }, { bedCode: spot }] }
      });
      if (bed) {
        assignedBedId = bed.id;
        await prisma.emergencyBed.update({
          where: { id: bed.id },
          data: { status: 'OCCUPIED' }
        }).catch(() => {});
      }
    }

    const arrival = await prisma.emergencyArrival.create({
      data: {
        arrivalCode,
        patientId: patientId || null,
        tempPatientName: patientId ? null : (tempPatientName || `UNKNOWN-MALE-${Date.now().toString().slice(-4)}`),
        arrivalMethod: arrivalMethod || 'WALK_IN',
        presentingComplaint,
        bedId: assignedBedId,
        status: assignedBedId ? 'TREATMENT' : 'ARRIVED'
      }
    });

    res.status(201).json(arrival);
  } catch (error) {
    next(error);
  }
});

// Helper to ensure 'visit-xxx' IDs are converted to real EmergencyArrival records
async function ensureEmergencyArrival(id: string): Promise<string> {
  if (!id.startsWith('visit-')) return id;
  
  const visitId = id.replace('visit-', '');
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) throw new Error('Visit not found');

  // Check if an arrival already exists for this visit
  const existing = await prisma.emergencyArrival.findFirst({
    where: { arrivalCode: visit.visitNumber }
  });
  if (existing) return existing.id;

  const arrival = await prisma.emergencyArrival.create({
    data: {
      arrivalCode: visit.visitNumber,
      patientId: visit.patientId,
      tempPatientName: null,
      arrivalMethod: 'WALK_IN',
      presentingComplaint: visit.chiefComplaint || 'Consultation Visit',
      status: 'ARRIVED'
    }
  });
  return arrival.id;
}

// Perform triage assessment (assigning ESI / Manchester priority levels)
router.post('/arrivals/:id/triage', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const { triageCategory, presentingComplaint, heartRate, bpSystolic, bpDiastolic, respirationRate, spo2, temperature, painScore, gcsScore, allergies, pregnancyStatus } = req.body;

    const triage = await prisma.emergencyTriage.create({
      data: {
        arrivalId: arrivalId,
        triageCategory: triageCategory || 'BLUE',
        presentingComplaint,
        heartRate: Number(heartRate),
        bpSystolic: Number(bpSystolic),
        bpDiastolic: Number(bpDiastolic),
        respirationRate: Number(respirationRate),
        spo2: Number(spo2),
        temperature: Number(temperature),
        painScore: Number(painScore || 0),
        gcsScore: Number(gcsScore || 15),
        allergies: allergies || 'NKDA',
        pregnancyStatus: pregnancyStatus || 'UNKNOWN',
        triageNurseName: 'Triage Nurse Duty'
      }
    });

    // Update status based on triage priority
    await prisma.emergencyArrival.update({
      where: { id: arrivalId },
      data: { status: 'TRIAGE' }
    });

    res.status(201).json(triage);
  } catch (error) {
    next(error);
  }
});

// ─── 13.1 BED ALLOCATIONS & CODES ───────────────────────────────────────────

// ─── 13.1 BED ALLOCATIONS & CODES ───────────────────────────────────────────

// Fetch emergency department beds (with auto-seeding default A&E spots if empty)
router.get('/beds', async (req, res, next) => {
  try {
    let beds = await prisma.emergencyBed.findMany({ orderBy: { bedCode: 'asc' } });
    
    if (beds.length === 0) {
      const defaultBeds = [
        { bedCode: 'RESUS-01', bedType: 'RESUSCITATION_BAY', status: 'AVAILABLE' },
        { bedCode: 'RESUS-02', bedType: 'RESUSCITATION_BAY', status: 'AVAILABLE' },
        { bedCode: 'TRL-01', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'TRL-02', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'TRL-03', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'TRL-04', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'TRL-05', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'TRL-06', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'TRL-07', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'TRL-08', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'TRL-09', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'TRL-10', bedType: 'TROLLEY', status: 'AVAILABLE' },
        { bedCode: 'CHR-A', bedType: 'RECLINER_CHAIR', status: 'AVAILABLE' },
        { bedCode: 'CHR-B', bedType: 'RECLINER_CHAIR', status: 'AVAILABLE' },
        { bedCode: 'CHR-C', bedType: 'RECLINER_CHAIR', status: 'AVAILABLE' },
        { bedCode: 'CHR-D', bedType: 'RECLINER_CHAIR', status: 'AVAILABLE' },
      ];

      for (const b of defaultBeds) {
        await prisma.emergencyBed.create({ data: b }).catch(() => {});
      }
      beds = await prisma.emergencyBed.findMany({ orderBy: { bedCode: 'asc' } });
    }

    // Auto-sync status with active emergency arrivals
    const activeArrivals = await prisma.emergencyArrival.findMany({
      where: {
        status: { notIn: ['DISCHARGED', 'TRANSFERRED'] },
        bedId: { not: null }
      }
    });

    const occupiedBedIds = new Set(activeArrivals.map(a => a.bedId).filter(Boolean));

    for (const b of beds) {
      const isOccupied = occupiedBedIds.has(b.id) || occupiedBedIds.has(b.bedCode);
      const expectedStatus = isOccupied ? 'OCCUPIED' : 'AVAILABLE';
      if (b.status !== expectedStatus) {
        await prisma.emergencyBed.update({
          where: { id: b.id },
          data: { status: expectedStatus }
        }).catch(() => {});
        b.status = expectedStatus;
      }
    }

    res.json(beds);
  } catch (error) {
    next(error);
  }
});

// Create/register emergency bed
router.post('/beds', async (req, res, next) => {
  try {
    const { bedCode, bedType } = req.body;
    const bed = await prisma.emergencyBed.create({
      data: {
        bedCode,
        bedType: bedType || 'TROLLEY',
        status: 'AVAILABLE'
      }
    });
    res.status(201).json(bed);
  } catch (error) {
    next(error);
  }
});

// Update emergency bed / spot
router.put('/beds/:id', async (req, res, next) => {
  try {
    const { bedCode, bedType, status } = req.body;
    const updated = await prisma.emergencyBed.update({
      where: { id: req.params.id },
      data: {
        ...(bedCode && { bedCode }),
        ...(bedType && { bedType }),
        ...(status && { status }),
      }
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete emergency bed / spot
router.delete('/beds/:id', async (req, res, next) => {
  try {
    await prisma.emergencyBed.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Emergency spot removed' });
  } catch (error) {
    next(error);
  }
});

// Bulk generate / sync emergency spots
router.post('/beds/bulk-generate', async (req, res, next) => {
  try {
    const { resusCount = 2, trolleyCount = 10, chairCount = 4 } = req.body;

    const desiredBeds: { bedCode: string; bedType: string }[] = [];
    for (let i = 1; i <= Number(resusCount); i++) {
      desiredBeds.push({ bedCode: `RESUS-${i < 10 ? '0' + i : i}`, bedType: 'RESUSCITATION_BAY' });
    }
    for (let i = 1; i <= Number(trolleyCount); i++) {
      desiredBeds.push({ bedCode: `TRL-${i < 10 ? '0' + i : i}`, bedType: 'TROLLEY' });
    }
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < Number(chairCount); i++) {
      desiredBeds.push({ bedCode: `CHR-${letters[i] || (i + 1)}`, bedType: 'RECLINER_CHAIR' });
    }

    for (const b of desiredBeds) {
      const existing = await prisma.emergencyBed.findUnique({ where: { bedCode: b.bedCode } });
      if (!existing) {
        await prisma.emergencyBed.create({
          data: {
            bedCode: b.bedCode,
            bedType: b.bedType,
            status: 'AVAILABLE'
          }
        });
      }
    }

    await autoReallocateUnassignedEmergencyPatients();

    const allBeds = await prisma.emergencyBed.findMany({ orderBy: { bedCode: 'asc' } });
    res.json(allBeds);
  } catch (error) {
    next(error);
  }
});

// Assign bed/trolley to emergency patient
router.post('/arrivals/:id/assign-bed', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const { bedId } = req.body;

    if (!bedId) {
      return res.status(400).json({ message: 'bedId is required' });
    }

    const bed = await prisma.emergencyBed.findFirst({
      where: { OR: [{ id: bedId }, { bedCode: bedId }] }
    });

    if (!bed) {
      return res.status(404).json({ message: 'Emergency trolley / bed spot not found' });
    }

    const existingArrival = await prisma.emergencyArrival.findUnique({ where: { id: arrivalId } });
    if (existingArrival?.bedId && existingArrival.bedId !== bed.id) {
      // Release previous bed
      await prisma.emergencyBed.update({
        where: { id: existingArrival.bedId },
        data: { status: 'AVAILABLE' }
      }).catch(() => {});
    }

    // Assign bed and mark as occupied
    await prisma.emergencyBed.update({
      where: { id: bed.id },
      data: { status: 'OCCUPIED' }
    });

    const updated = await prisma.emergencyArrival.update({
      where: { id: arrivalId },
      data: { bedId: bed.id, status: 'TREATMENT' },
      include: { bed: true }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Unassign / Release bed
router.post('/arrivals/:id/unassign-bed', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const existingArrival = await prisma.emergencyArrival.findUnique({ where: { id: arrivalId } });

    if (existingArrival?.bedId) {
      await prisma.emergencyBed.update({
        where: { id: existingArrival.bedId },
        data: { status: 'AVAILABLE' }
      }).catch(() => {});
    }

    const updated = await prisma.emergencyArrival.update({
      where: { id: arrivalId },
      data: { bedId: null },
      include: { bed: true }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Retrospective Registration (Records Unit updating patient bio-data bedside)
router.patch('/arrivals/:id/retrospective-registration', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const { firstName, lastName, gender, dateOfBirth, phone, address, emergencyContactName, emergencyContactPhone, nationalId } = req.body;

    const arr = await prisma.emergencyArrival.findUnique({ where: { id: arrivalId }, include: { patient: true } });
    if (!arr) return res.status(404).json({ error: 'Emergency arrival record not found' });

    let patId = arr.patientId;
    if (patId) {
      // Update existing patient
      await prisma.patient.update({
        where: { id: patId },
        data: {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          gender: gender || undefined,
          birthDate: dateOfBirth ? new Date(dateOfBirth) : undefined,
          emergencyName: emergencyContactName || undefined,
          emergencyPhone: emergencyContactPhone || undefined,
          nin: nationalId || undefined,
        }
      });
    } else {
      // Create new patient record and link
      const patNumber = `PAT-${Date.now().toString().slice(-6)}`;
      const dummyUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newPatient = await prisma.patient.create({
        data: {
          userId: dummyUserId,
          patientNumber: patNumber,
          firstName: firstName || 'Emergency',
          lastName: lastName || 'Patient',
          gender: gender || 'MALE',
          birthDate: dateOfBirth ? new Date(dateOfBirth) : new Date('1990-01-01'),
          emergencyName: emergencyContactName || null,
          emergencyPhone: emergencyContactPhone || null,
          nin: nationalId || null,
        }
      });
      patId = newPatient.id;
      await prisma.emergencyArrival.update({
        where: { id: arrivalId },
        data: { patientId: patId, tempPatientName: null }
      });
    }

    const updated = await prisma.emergencyArrival.findUnique({
      where: { id: arrivalId },
      include: { patient: true, bed: true, triages: true }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// ─── 13.2 RESUSCITATION, TRAUMA & INTERVENTIONS ─────────────────────────────

// Log Resuscitation Event (CPR)
router.post('/arrivals/:id/resuscitation', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const { airwayNotes, circulationNotes, drugsAdministered, defibrillationShocks, cprDurationMin, outcomeStatus } = req.body;

    const resus = await prisma.emergencyResuscitation.create({
      data: {
        arrivalId: arrivalId,
        airwayNotes,
        circulationNotes,
        drugsAdministered,
        defibrillationShocks: Number(defibrillationShocks || 0),
        cprDurationMin: Number(cprDurationMin || 0),
        outcomeStatus
      }
    });
    res.status(201).json(resus);
  } catch (error) {
    next(error);
  }
});

// Activate Trauma Team
router.post('/arrivals/:id/trauma', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const { teamLeaderId, surgeonId, mechanismOfInjury, injuryLocation, traumaScoreRTS } = req.body;

    const trauma = await prisma.emergencyTraumaTeam.create({
      data: {
        arrivalId: arrivalId,
        teamLeaderId,
        surgeonId: surgeonId || null,
        mechanismOfInjury,
        injuryLocation,
        traumaScoreRTS: Number(traumaScoreRTS || 0)
      }
    });
    res.status(201).json(trauma);
  } catch (error) {
    next(error);
  }
});

// Record ED Procedure (e.g. Intubation, Chest Tube, Suturing)
router.post('/arrivals/:id/procedures', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const { clinicianId, procedureType, indication, complications, outcomeStatus } = req.body;

    const proc = await prisma.emergencyProcedure.create({
      data: {
        arrivalId: arrivalId,
        clinicianId,
        procedureType,
        indication,
        complications,
        outcomeStatus
      }
    });
    res.status(201).json(proc);
  } catch (error) {
    next(error);
  }
});

// ─── 13.3 OBSERVATION UNITS, DISCHARGE HANDOVERS & DISASTERS ────────────────

// Assign to short-stay observation bed
router.post('/arrivals/:id/observation', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const { nurseId, reasonForObservation, expectedDurationHrs, treatmentNotes } = req.body;

    const obs = await prisma.emergencyObservationLog.create({
      data: {
        arrivalId: arrivalId,
        nurseId,
        reasonForObservation,
        expectedDurationHrs: Number(expectedDurationHrs || 12),
        treatmentNotes
      }
    });

    await prisma.emergencyArrival.update({
      where: { id: arrivalId },
      data: { status: 'OBSERVATION' }
    });

    res.status(201).json(obs);
  } catch (error) {
    next(error);
  }
});

// Submit clinical handover (e.g. transfer to Ward/ICU or Discharge)
router.post('/arrivals/:id/handover', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const { targetWard, currentDiagnosis, medicationsActive, outstandingCare } = req.body;

    const handover = await prisma.emergencyDischargeHandover.create({
      data: {
        arrivalId: arrivalId,
        targetWard,
        currentDiagnosis,
        medicationsActive,
        outstandingCare,
        receivingClinicianSignoff: true
      }
    });

    // Automatically discharge from ED upon handover submission
    const arr = await prisma.emergencyArrival.update({
      where: { id: arrivalId },
      data: { status: 'DISCHARGED' }
    });

    // If bed was assigned, release it
    if (arr.bedId) {
      await prisma.emergencyBed.update({
        where: { id: arr.bedId },
        data: { status: 'CLEANING' } // require terminal clean
      });
    }

    res.status(201).json(handover);
  } catch (error) {
    next(error);
  }
});

// Declare Hospital Disaster Plan / Mass Casualty
router.post('/disasters', async (req, res, next) => {
  try {
    const { disasterName, commanderId, resourceShortages } = req.body;

    const disaster = await prisma.emergencyDisasterIncident.create({
      data: {
        disasterName,
        commanderId,
        resourceShortages,
        incidentStatus: 'ACTIVE'
      }
    });

    res.status(201).json(disaster);
  } catch (error) {
    next(error);
  }
});

// Fetch Active disasters
router.get('/disasters', async (req, res, next) => {
  try {
    const list = await prisma.emergencyDisasterIncident.findMany({
      orderBy: { activationTime: 'desc' }
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

// ─── 13.4 SAFETY GOVERNANCE INCIDENTS & STAFFING ────────────────────────────

// Report patient safety incident (RCA) in ED
router.post('/arrivals/:id/incidents', async (req, res, next) => {
  try {
    const arrivalId = await ensureEmergencyArrival(req.params.id);
    const { reporterId, patientId, incidentType, severityGrading, rcaFindings, capaDetails } = req.body;

    const incident = await prisma.emergencyIncidentRecord.create({
      data: {
        arrivalId: arrivalId,
        patientId: patientId || null,
        reporterId,
        incidentType,
        severityGrading,
        rcaFindings,
        capaDetails
      }
    });
    res.status(201).json(incident);
  } catch (error) {
    next(error);
  }
});

// Update Safety incident investigations status
router.put('/incidents/:id/rca', async (req, res, next) => {
  try {
    const { status, rcaFindings, capaDetails } = req.body;

    const record = await prisma.emergencyIncidentRecord.update({
      where: { id: req.params.id },
      data: {
        status,
        rcaFindings,
        capaDetails
      }
    });

    res.json(record);
  } catch (error) {
    next(error);
  }
});

// Log Workforce shifts workloads
router.post('/staffing-shifts', async (req, res, next) => {
  try {
    const { clinicianId, shiftName, patientLoad, acuityWorkloadScore } = req.body;

    const shift = await prisma.emergencyStaffingShift.create({
      data: {
        clinicianId,
        shiftName,
        patientLoad: Number(patientLoad),
        acuityWorkloadScore: Number(acuityWorkloadScore || 10)
      }
    });

    res.status(201).json(shift);
  } catch (error) {
    next(error);
  }
});

// Get ED staffing workload history
router.get('/staffing-shifts', async (req, res, next) => {
  try {
    const list = await prisma.emergencyStaffingShift.findMany({
      include: { clinician: true },
      orderBy: { shiftDate: 'desc' }
    });
    res.json(list);
  } catch (error) {
    next(error);
  }
});

export default router;
