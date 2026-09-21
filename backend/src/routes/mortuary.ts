import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { logAudit } from '../utils/auditHelper.js';
import { invoices, billChargeMasterService } from './billing.js';

const router = Router();
import { prisma } from '../prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// STATE STORES (Mock Database for Mortuary Logistics & Refrigeration Sensors)
// ─────────────────────────────────────────────────────────────────────────────

let mortuaryAdmissions: any[] = [
  {
    id: 'AD-9001',
    mrn: 'MOR-2026-001',
    patientId: 'pat-1',
    name: 'Jane Doe (Hospital Death)',
    gender: 'Female',
    age: 58,
    admittedAt: '2026-06-28 10:15',
    admittingPersonnel: 'Mortuary Officer Caleb',
    certifyingClinician: 'Dr. Okafor',
    causeOfDeath: 'Cardiopulmonary Arrest',
    medicoLegalStatus: 'NONE',
    identifyingFeatures: 'Scar on right knee',
    personalEffects: [
      { id: 'PE-01', description: 'Gold wedding ring', quantity: 1, status: 'SECURED' },
      { id: 'PE-02', description: 'Leather wallet containing ID', quantity: 1, status: 'SECURED' }
    ],
    nextOfKin: { name: 'John Doe', relationship: 'Husband', phone: '+1234567890' },
    status: 'RELEASED',
    storageLocation: 'RELEASED (Vault Vacated)',
    autopsyStatus: 'Autopsy Completed & Certified',
    certificateIssued: true,
    findings: 'Cardiopulmonary arrest secondary to acute cardiac event. Complete postmortem inspection and release authorized.'
  },
  {
    id: 'AD-9002',
    mrn: 'MOR-2026-002',
    patientId: null,
    name: 'Unidentified Male (Brought In Dead)',
    gender: 'Male',
    age: 42,
    admittedAt: '2026-06-28 23:40',
    admittingPersonnel: 'Mortuary Officer Caleb',
    certifyingClinician: 'Dr. Triage Admin',
    causeOfDeath: 'Traumatic Injuries (RTA)',
    medicoLegalStatus: 'POLICE_CASE',
    identifyingFeatures: 'Tattoo of anchor on left forearm',
    personalEffects: [],
    nextOfKin: { name: 'Awaiting police contact', relationship: 'N/A', phone: '—' },
    status: 'ADMITTED',
    storageLocation: 'Cabinet B - Tray 1',
    certificateIssued: false
  },
  {
    id: 'AD-9003',
    mrn: 'MORT-2026-0042',
    patientId: 'P-09821',
    name: 'Late Chief Emmanuel O. Chukwu',
    gender: 'Male',
    age: 72,
    admittedAt: '2026-08-21 22:45',
    admittingPersonnel: 'Mortuary Officer Caleb',
    certifyingClinician: 'Dr. EMMANUEL VEGHER',
    causeOfDeath: 'Refractory Cardiogenic Shock 2° to Massive Anterior Myocardial Infarction',
    medicoLegalStatus: 'NONE',
    identifyingFeatures: 'Inpatient Medical Ward (Ward 4B)',
    personalEffects: [
      { id: 'PE-03', description: 'Wristwatch & Gold Ring', quantity: 1, status: 'SECURED' }
    ],
    nextOfKin: { name: 'Dr. Nnamdi Chukwu', relationship: 'Son', phone: '+234 803 123 4567' },
    status: 'ADMITTED',
    storageLocation: 'Cold Storage Bay 04',
    autopsyStatus: 'Clinical Pathology Autopsy',
    certificateIssued: true
  },
  {
    id: 'AD-9004',
    mrn: 'MORT-2026-0043',
    patientId: 'P-11109',
    name: 'Late Usman Garba',
    gender: 'Male',
    age: 50,
    admittedAt: '2026-08-22 03:15',
    admittingPersonnel: 'Mortuary Officer Caleb',
    certifyingClinician: 'Dr. Tertsegha Vegher',
    causeOfDeath: 'Traumatic Hemorrhagic Shock 2° to Severe Polytrauma & Ruptured Spleen',
    medicoLegalStatus: 'CORONER_CASE',
    identifyingFeatures: 'Accident & Emergency (A&E)',
    personalEffects: [],
    nextOfKin: { name: 'Hajiya Amina Garba', relationship: 'Wife', phone: '+234 802 987 6543' },
    status: 'ADMITTED',
    storageLocation: 'Cold Storage Bay 08',
    autopsyStatus: 'Coroner Forensic Autopsy',
    certificateIssued: false
  }
];

let storageCabinets: any[] = [
  { code: 'Cabinet A - Tray 1', capacity: 1, occupied: false, tempCelsius: 3.9, humidityPercent: 65, status: 'NORMAL', chamberType: 'Standard Mortuary Refrigeration (2°C to 4°C)' },
  { code: 'Cabinet A - Tray 2', capacity: 1, occupied: false, tempCelsius: 4.1, humidityPercent: 66, status: 'NORMAL', chamberType: 'Standard Mortuary Refrigeration (2°C to 4°C)' },
  { code: 'Cabinet B - Tray 1', capacity: 1, occupied: true, tempCelsius: 3.8, humidityPercent: 64, status: 'NORMAL', chamberType: 'Standard Mortuary Refrigeration (2°C to 4°C)' },
  { code: 'Cabinet B - Tray 2', capacity: 1, occupied: false, tempCelsius: 9.8, humidityPercent: 72, status: 'EXCURSION_ALERT', chamberType: 'Standard Mortuary Refrigeration (2°C to 4°C)' },
  { code: 'Cold Storage Bay 04', capacity: 1, occupied: true, tempCelsius: 3.5, humidityPercent: 62, status: 'NORMAL', chamberType: 'Inpatient Cold Storage Bay' },
  { code: 'Cold Storage Bay 08', capacity: 1, occupied: true, tempCelsius: 4.0, humidityPercent: 63, status: 'NORMAL', chamberType: 'Emergency Intake Cold Bay' },
  { code: 'Cold Chamber C - Tray 1', capacity: 1, occupied: false, tempCelsius: 3.6, humidityPercent: 60, status: 'NORMAL', chamberType: 'Preservation Cold Chamber' },
  { code: 'Deep Freeze Chamber D (Forensic)', capacity: 1, occupied: false, tempCelsius: -18.5, humidityPercent: 45, status: 'NORMAL', chamberType: 'Forensic Deep Freeze Chamber (-20°C)' }
];

let chainOfCustodyLogs: any[] = [
  { id: 'COC-01', mrn: 'MOR-2026-001', name: 'Jane Doe (Hospital Death)', event: 'RELEASE_TO_FAMILY', origin: 'Cabinet A - Tray 2', destination: 'Funeral Parlour Dispatch / Family Handover', personnel: 'Mortuary Officer Caleb', recipient: 'John Doe (Husband)', timestamp: '2026-06-29 14:20', notes: 'Positive biometric & ID verification cleared. Release certificate issued.' },
  { id: 'COC-02', mrn: 'MOR-2026-002', name: 'Unidentified Male (Brought In Dead)', event: 'AUTOPSY_SUITE_TRANSFER', origin: 'Cabinet B - Tray 1', destination: 'Pathology Dissection Suite 1', personnel: 'Mortuary Officer Caleb', recipient: 'Dr. Jane Benson (Pathologist)', timestamp: '2026-06-29 10:45', notes: 'Coroner autopsy examination requested by Investigating Police Officer.' },
  { id: 'COC-03', mrn: 'MORT-2026-0042', name: 'Late Chief Emmanuel O. Chukwu', event: 'INITIAL_ADMISSION', origin: 'Inpatient Medical Ward (Ward 4B)', destination: 'Cold Storage Bay 04', personnel: 'Mortuary Officer Caleb', recipient: 'Mortuary Cold Vault Unit', timestamp: '2026-08-21 23:10', notes: 'Admitted from Ward 4B with personal jewelry logged in custody safe.' },
  { id: 'COC-04', mrn: 'MORT-2026-0043', name: 'Late Usman Garba', event: 'INITIAL_ADMISSION', origin: 'Accident & Emergency (A&E)', destination: 'Cold Storage Bay 08', personnel: 'Mortuary Officer Caleb', recipient: 'Mortuary Cold Vault Unit', timestamp: '2026-08-22 03:40', notes: 'Coroner case admission following severe polytrauma.' },
  { id: 'COC-05', mrn: 'MOR-2026-002', name: 'Unidentified Male (Brought In Dead)', event: 'INITIAL_ADMISSION', origin: 'Emergency Department', destination: 'Cabinet B - Tray 1', personnel: 'Mortuary Officer Caleb', recipient: 'Mortuary Cold Vault Unit', timestamp: '2026-06-28 23:55', notes: 'Brought-in-dead by ambulance team. Sealed evidence bag custody initiated.' }
];

let autopsyRecords: any[] = [
  {
    id: 'AUT-501',
    mrn: 'MOR-2026-002',
    name: 'Unidentified Male (Brought In Dead)',
    gender: 'Male',
    age: 42,
    type: 'CORONER',
    pathologist: 'Dr. Jane Benson',
    scheduledTime: '2026-06-29 11:00 AM',
    status: 'COMPLETED',
    causeOfDeath: 'Traumatic Injuries (RTA)',
    findings: 'External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared.'
  },
  {
    id: 'AUT-502',
    mrn: 'MORT-2026-0042',
    name: 'Late Chief Emmanuel O. Chukwu',
    gender: 'Male',
    age: 72,
    type: 'CLINICAL',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    scheduledTime: '2026-08-22 10:00 AM',
    status: 'COMPLETED',
    causeOfDeath: 'Refractory Cardiogenic Shock 2° to Massive Anterior Myocardial Infarction',
    findings: 'Postmortem examination confirms extensive transmural myocardial necrosis of anterior left ventricular wall with severe multi-vessel coronary atherosclerosis.'
  },
  {
    id: 'AUT-503',
    mrn: 'MORT-2026-0043',
    name: 'Late Usman Garba',
    gender: 'Male',
    age: 50,
    type: 'CORONER',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    scheduledTime: '2026-08-23 02:00 PM',
    status: 'SCHEDULED',
    causeOfDeath: 'Traumatic Hemorrhagic Shock 2° to Severe Polytrauma & Ruptured Spleen',
    findings: 'Pending postmortem examination findings report.'
  }
];

let embalmingRecords: any[] = [
  {
    id: 'EMB-101',
    mrn: 'MORT-2026-0042',
    name: 'Late Chief Emmanuel O. Chukwu',
    preservativeFluid: 'Arterial Formalin & Glutaraldehyde Complex (3.5% index)',
    embalmer: 'Mortuary Specialist Caleb',
    bodyPrepStatus: 'DRESSED_AND_GROOMED',
    shroudVerified: true,
    certificateIssued: true,
    completedAt: '2026-08-23 16:30',
    notes: 'Full arterial preservation completed. Dressed in family traditional attire as requested.'
  },
  {
    id: 'EMB-102',
    mrn: 'MOR-2026-002',
    name: 'Unidentified Male (Brought In Dead)',
    preservativeFluid: 'Standard Cavity Fluid Preservation',
    embalmer: 'Mortuary Specialist Caleb',
    bodyPrepStatus: 'PRESERVED_IN_VAULT',
    shroudVerified: true,
    certificateIssued: false,
    completedAt: '2026-06-30 09:15',
    notes: 'Coroner hold; standard sanitary preservation applied.'
  }
];

let viewingSchedules: any[] = [
  {
    id: 'VIW-201',
    mrn: 'MORT-2026-0042',
    name: 'Late Chief Emmanuel O. Chukwu',
    viewingChamber: 'Private Family Viewing Chapel 1',
    familyContact: 'Dr. Nnamdi Chukwu (Son, +234 803 123 4567)',
    scheduledTime: '2026-08-24 14:00 - 16:00',
    maxAttendees: 15,
    status: 'SCHEDULED',
    religiousRequirements: 'Christian Dignity Committal Prayers with attending clergy'
  },
  {
    id: 'VIW-202',
    mrn: 'MOR-2026-001',
    name: 'Jane Doe (Hospital Death)',
    viewingChamber: 'Family Viewing Suite A',
    familyContact: 'John Doe (Husband, +1234567890)',
    scheduledTime: '2026-06-29 11:30 - 12:30',
    maxAttendees: 8,
    status: 'COMPLETED',
    religiousRequirements: 'Standard Private Family Farewell'
  }
];

let capaPlans: any[] = [
  { id: 'CAPA-401', targetUnit: 'Refrigeration Unit Cabinet B', discrepancy: 'Temperature spike to 9.8C on Cabinet B Tray 2', correctiveAction: 'Biomedical engineer recalibrating thermostatic sensor.', deadline: '2026-06-30', status: 'OPEN' }
];

let deceasedPatientQueue: any[] = [
  {
    id: 'DEC-001',
    patientId: 'P-10023',
    name: 'Late Fatima Aliyu',
    gender: 'FEMALE',
    age: 64,
    source: 'IPD',
    sourceWard: 'Female Medical Ward (Bed 04)',
    deceasedAt: '2026-09-04 08:30',
    certifyingClinician: 'Dr. Aisha Bello',
    causeOfDeath: 'Acute Respiratory Distress Syndrome (ARDS) secondary to Severe Pneumonia',
    medicoLegalStatus: 'NONE',
    identifyingFeatures: 'Female Medical Ward (Bed 04) · Scar on left knee',
    nokName: 'Mustapha Aliyu',
    nokRelationship: 'Husband',
    nokPhone: '+234 803 555 1290',
    status: 'PENDING_MORTUARY_INTAKE',
    createdAt: '2026-09-04 08:45'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// §27.1 - MORTUARY ADMISSIONS & IDENTITY REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

router.get('/certifying-clinicians', async (_req: Request, res: Response, next) => {
  try {
    const staffRecords = await prisma.staff.findMany({
      where: { isActive: true },
      include: {
        user: {
          include: {
            roles: { include: { role: true } }
          }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    const clinicians = staffRecords.filter(s => {
      const des = (s.designation || '').toLowerCase();
      const userRoles = (s.user?.roles || []).map(r => r.role.name.toLowerCase());
      const roleStr = (s.user?.role || '').toLowerCase();

      const isDoctorRole = userRoles.some(r => r.includes('doctor') || r.includes('physician') || r.includes('consultant') || r.includes('clinician') || r.includes('surgeon'))
        || roleStr.includes('doctor') || roleStr.includes('physician') || roleStr.includes('consultant');

      const isDoctorDesignation = des.includes('doctor') || des.includes('physician') || des.includes('consultant')
        || des.includes('medical officer') || des.includes('surgeon') || des.includes('registrar')
        || des.includes('cmd') || des.includes('md') || des.includes('smo') || des.includes('mo')
        || des.includes('pmo') || des.includes('specialist');

      return isDoctorRole || isDoctorDesignation;
    }).map(s => {
      const fullName = `${s.firstName} ${s.lastName}`.replace(/^Dr\.?\s+/i, '');
      return {
        id: s.id,
        employeeId: s.employeeId,
        name: `Dr. ${fullName}`,
        fullName,
        designation: s.designation || 'Medical Officer',
        department: s.department || 'Clinical Services',
        label: `Dr. ${fullName} — ${s.designation || 'Medical Officer'} (${s.department || 'Clinical'}${s.employeeId ? ` · ${s.employeeId}` : ''})`
      };
    });

    res.json({ success: true, data: clinicians });
  } catch (error) {
    next(error);
  }
});

const getDeceasedQueueKey = (item: any) => {
  if (item.patientId && String(item.patientId).trim()) {
    return `PID_${String(item.patientId).trim().toLowerCase()}`;
  }
  const clean = (item.name || '').toLowerCase().replace(/^late\s+/i, '').replace(/[^a-z0-9]/g, '');
  if (clean) return `NAME_${clean}`;
  return `ID_${item.id || ''}`;
};

router.get('/deceased-queue', (req: Request, res: Response) => {
  // Deduplicate queue so that the same patient appears at most once
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const item of deceasedPatientQueue) {
    const key = getDeceasedQueueKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    } else {
      // If a duplicate has status ADMITTED, propagate to preserved item
      const idx = deduped.findIndex(d => getDeceasedQueueKey(d) === key);
      if (idx !== -1 && item.status === 'ADMITTED') {
        deduped[idx].status = 'ADMITTED';
      }
    }
  }
  deceasedPatientQueue = deduped;
  res.json({ success: true, data: deceasedPatientQueue });
});

router.post('/deceased-queue', async (req: Request, res: Response) => {
  try {
    const item = {
      id: `DEC-${Date.now().toString().slice(-4)}`,
      patientId: req.body.patientId || null,
      name: req.body.name,
      gender: req.body.gender || 'UNKNOWN',
      age: req.body.age || null,
      source: req.body.source || 'IPD',
      sourceWard: req.body.sourceWard || 'Inpatient Ward',
      deceasedAt: req.body.deceasedAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
      certifyingClinician: req.body.certifyingClinician || 'Attending Physician',
      causeOfDeath: req.body.causeOfDeath || 'Clinical Death',
      medicoLegalStatus: req.body.medicoLegalStatus || 'NONE',
      identifyingFeatures: req.body.identifyingFeatures || '',
      nokName: req.body.nokName || '',
      nokRelationship: req.body.nokRelationship || '',
      nokPhone: req.body.nokPhone || '',
      status: 'PENDING_MORTUARY_INTAKE',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const targetKey = getDeceasedQueueKey(item);
    const existingIndex = deceasedPatientQueue.findIndex(q => getDeceasedQueueKey(q) === targetKey);
    if (existingIndex !== -1) {
      deceasedPatientQueue[existingIndex] = {
        ...deceasedPatientQueue[existingIndex],
        ...item,
        id: deceasedPatientQueue[existingIndex].id,
        status: deceasedPatientQueue[existingIndex].status === 'ADMITTED' ? 'ADMITTED' : 'PENDING_MORTUARY_INTAKE'
      };
      return res.json({ success: true, data: deceasedPatientQueue[existingIndex] });
    }

    deceasedPatientQueue.unshift(item);
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/deceased-queue/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const cleanId = (id || '').toLowerCase().trim();
  deceasedPatientQueue = deceasedPatientQueue.filter(q => {
    if (q.id === id || q.patientId === id) return false;
    const qName = (q.name || '').toLowerCase().replace(/^late\s+/i, '').trim();
    if (cleanId && (qName === cleanId || qName.includes(cleanId) || cleanId.includes(qName))) return false;
    return true;
  });
  res.json({ success: true, message: 'Removed from mortuary deceased queue' });
});

router.get('/admissions', (req: Request, res: Response) => {
  const activeAutopsyMrns = new Set(autopsyRecords.map(a => a.mrn));
  mortuaryAdmissions.forEach(b => {
    if (b.autopsyStatus && b.autopsyStatus.includes('Scheduled') && !activeAutopsyMrns.has(b.mrn) && !activeAutopsyMrns.has(b.id) && (!b.patientId || !activeAutopsyMrns.has(b.patientId))) {
      delete b.autopsyStatus;
    }
  });
  res.json({ success: true, data: mortuaryAdmissions });
});

router.get('/cases', (req: Request, res: Response) => {
  const activeAutopsyMrns = new Set(autopsyRecords.map(a => a.mrn));
  mortuaryAdmissions.forEach(b => {
    if (b.autopsyStatus && b.autopsyStatus.includes('Scheduled') && !activeAutopsyMrns.has(b.mrn) && !activeAutopsyMrns.has(b.id) && (!b.patientId || !activeAutopsyMrns.has(b.patientId))) {
      delete b.autopsyStatus;
    }
  });
  res.json({ success: true, data: mortuaryAdmissions, cases: mortuaryAdmissions });
});

router.post('/admissions', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      patientId: z.string().optional().nullable(),
      deceasedQueueId: z.string().optional().nullable(),
      name: z.string().min(1),
      gender: z.string().optional(),
      age: z.union([z.number(), z.string()]).optional(),
      certifyingClinician: z.string().min(1),
      causeOfDeath: z.string().min(1),
      medicoLegalStatus: z.enum(['NONE', 'CORONER_CASE', 'POLICE_CASE']),
      identifyingFeatures: z.string().optional(),
      nokName: z.string().min(1),
      nokRelationship: z.string().min(1),
      nokPhone: z.string().min(1),
      storageLocation: z.string().min(1),
      initialBelonging: z.string().optional(),
      initialBelongingQuantity: z.union([z.number(), z.string()]).optional(),
      storageLocker: z.string().optional()
    });

    const parsed = schema.parse(req.body);
    const newMRN = `MOR-2026-0${mortuaryAdmissions.length + 1}`;
    
    // Check and mark ALL matching items in deceasedPatientQueue as ADMITTED
    let sourceOrigin = 'Transfer Intake';
    const cleanAdmName = (parsed.name || '').toLowerCase().replace(/^late\s+/i, '').trim();

    deceasedPatientQueue.forEach(q => {
      const qCleanName = (q.name || '').toLowerCase().replace(/^late\s+/i, '').trim();
      const isMatch = (parsed.deceasedQueueId && q.id === parsed.deceasedQueueId) ||
        (parsed.patientId && q.patientId === parsed.patientId) ||
        (cleanAdmName && qCleanName && (cleanAdmName === qCleanName || cleanAdmName.includes(qCleanName) || qCleanName.includes(cleanAdmName)));

      if (isMatch) {
        q.status = 'ADMITTED';
        sourceOrigin = `${q.source || 'Ward'} - ${q.sourceWard || 'Unit'}`;
      }
    });

    const queueItem = deceasedPatientQueue.find(q =>
      (parsed.deceasedQueueId && q.id === parsed.deceasedQueueId) ||
      (parsed.patientId && q.patientId === parsed.patientId)
    );

    if (sourceOrigin === 'Transfer Intake' && parsed.identifyingFeatures && (parsed.identifyingFeatures.includes('Ward') || parsed.identifyingFeatures.includes('OPD') || parsed.identifyingFeatures.includes('Emergency'))) {
      sourceOrigin = parsed.identifyingFeatures.split('·')[0].trim();
    }

    const initialEffects: any[] = [];
    if (parsed.initialBelonging && parsed.initialBelonging.trim()) {
      initialEffects.push({
        id: `PE-${Date.now().toString().slice(-4)}`,
        mrn: newMRN,
        description: parsed.initialBelonging.trim(),
        quantity: typeof parsed.initialBelongingQuantity === 'string' ? (parseInt(parsed.initialBelongingQuantity, 10) || 1) : (parsed.initialBelongingQuantity || 1),
        status: 'SECURED',
        storageLocker: parsed.storageLocker || 'Locker A-01',
        loggedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });
    }

    const admission = {
      id: `AD-${Date.now().toString().slice(-4)}`,
      mrn: newMRN,
      patientId: parsed.patientId || queueItem?.patientId || null,
      name: parsed.name,
      gender: parsed.gender || queueItem?.gender || 'N/A',
      age: parsed.age || queueItem?.age || undefined,
      admittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      admittingPersonnel: 'Mortuary Officer Caleb',
      certifyingClinician: parsed.certifyingClinician,
      causeOfDeath: parsed.causeOfDeath,
      medicoLegalStatus: parsed.medicoLegalStatus,
      identifyingFeatures: parsed.identifyingFeatures || 'None documented',
      personalEffects: initialEffects,
      nextOfKin: { name: parsed.nokName, relationship: parsed.nokRelationship, phone: parsed.nokPhone },
      status: 'ADMITTED',
      storageLocation: parsed.storageLocation,
      certificateIssued: false
    };

    mortuaryAdmissions.unshift(admission);

    // Update storage cabinet occupancy
    const cabinet = storageCabinets.find(c => c.code === parsed.storageLocation);
    if (cabinet) cabinet.occupied = true;

    // Log to chain of custody
    chainOfCustodyLogs.unshift({
      id: `COC-${Date.now().toString().slice(-4)}`,
      mrn: newMRN,
      event: 'INITIAL_ADMISSION',
      origin: sourceOrigin,
      destination: parsed.storageLocation,
      personnel: 'Mortuary Officer Caleb',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_ADMIT_BODY',
      resourceType: 'MortuaryAdmission',
      resourceId: admission.id,
      changes: admission
    });

    // Automatically bill Mortuary Cold Vault Intake to the Cashier
    try {
      billChargeMasterService({
        patientId: admission.patientId,
        patientName: admission.name,
        serviceCode: 'MORT-INTAKE',
        quantity: 1,
        notes: `Hospital Mortuary Cold Vault Admission & Initial Storage (MRN: ${newMRN}, Location: ${parsed.storageLocation})`,
        userId: (req as any).user?.id || 'SYSTEM'
      });
    } catch (e) {
      console.warn('Billing mortuary intake error:', e);
    }

    res.status(201).json({ success: true, data: admission });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to complete mortuary admission' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §27.1.2 - PERSONAL EFFECTS & BELONGINGS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

router.post('/belongings', async (req: Request, res: Response) => {
  try {
    const { mrn, description, quantity, storageLocker, status, handedOverBy, notes } = z.object({
      mrn: z.string().min(1),
      description: z.string().min(1),
      quantity: z.union([z.number(), z.string()]).default(1),
      storageLocker: z.string().optional(),
      status: z.enum(['SECURED', 'RELEASED_TO_NOK', 'SEALED_EVIDENCE', 'IN_LOCKER']).default('SECURED'),
      handedOverBy: z.string().optional(),
      notes: z.string().optional()
    }).parse(req.body);

    const admission = mortuaryAdmissions.find(a => a.mrn === mrn || a.id === mrn || (a.patientId && a.patientId === mrn));
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Mortuary admission not found for MRN: ' + mrn });
    }

    if (!Array.isArray(admission.personalEffects)) {
      admission.personalEffects = [];
    }

    const newItem = {
      id: `PE-${Date.now().toString().slice(-4)}`,
      mrn: admission.mrn,
      description,
      quantity: typeof quantity === 'string' ? parseInt(quantity, 10) || 1 : quantity,
      status: status || 'SECURED',
      storageLocker: storageLocker || 'Locker A-01',
      handedOverBy: handedOverBy || 'Ward Nursing Staff / Transfer Officer',
      notes: notes || '',
      loggedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    admission.personalEffects.push(newItem);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_LOG_BELONGINGS',
      resourceType: 'MortuaryAdmission',
      resourceId: admission.id,
      changes: newItem
    });

    res.status(201).json({ success: true, message: 'Personal belonging recorded successfully', data: newItem });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to log personal effects' });
  }
});

router.patch('/belongings/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, recipientName, relationship } = req.body;

    let foundItem: any = null;
    let targetAdm: any = null;

    for (const adm of mortuaryAdmissions) {
      if (Array.isArray(adm.personalEffects)) {
        const item = adm.personalEffects.find((p: any) => p.id === id);
        if (item) {
          foundItem = item;
          targetAdm = adm;
          break;
        }
      }
    }

    if (!foundItem) {
      return res.status(404).json({ success: false, message: 'Belonging item not found' });
    }

    foundItem.status = status || 'RELEASED_TO_NOK';
    if (recipientName) foundItem.releasedTo = recipientName;
    if (relationship) foundItem.recipientRelationship = relationship;
    foundItem.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_UPDATE_BELONGING_STATUS',
      resourceType: 'MortuaryAdmission',
      resourceId: targetAdm.id,
      changes: foundItem
    });

    res.json({ success: true, message: 'Belonging status updated', data: foundItem });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to update belonging status' });
  }
});

router.delete('/belongings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let removed = false;

    for (const adm of mortuaryAdmissions) {
      if (Array.isArray(adm.personalEffects)) {
        const idx = adm.personalEffects.findIndex((p: any) => p.id === id);
        if (idx !== -1) {
          adm.personalEffects.splice(idx, 1);
          removed = true;
          break;
        }
      }
    }

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, message: 'Personal belonging item removed' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to remove belonging item' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §27.2 - BODY STORAGE, REFRIGERATION & CHAIN OF CUSTODY
// ─────────────────────────────────────────────────────────────────────────────

router.get('/storage', (req: Request, res: Response) => {
  const activeAdmissions = mortuaryAdmissions.filter(a => a.status === 'ADMITTED');
  const enrichedCabinets = storageCabinets.map(cab => {
    const occupant = activeAdmissions.find(a => a.storageLocation === cab.code);
    return {
      ...cab,
      occupied: Boolean(occupant),
      occupant: occupant ? {
        mrn: occupant.mrn,
        name: occupant.name,
        gender: occupant.gender,
        age: occupant.age,
        admittedAt: occupant.admittedAt,
        causeOfDeath: occupant.causeOfDeath,
        medicoLegalStatus: occupant.medicoLegalStatus,
        certifyingClinician: occupant.certifyingClinician,
      } : null
    };
  });
  res.json({ success: true, data: enrichedCabinets });
});

router.post('/storage/calibrate', async (req: Request, res: Response) => {
  try {
    const { code, targetTemp = 3.8, targetHumidity = 65 } = req.body;
    const cab = storageCabinets.find(c => c.code === code);
    if (!cab) return res.status(404).json({ success: false, message: 'Cabinet unit not found' });

    cab.tempCelsius = targetTemp;
    cab.humidityPercent = targetHumidity;
    cab.status = 'NORMAL';

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_CALIBRATE_SENSOR',
      resourceType: 'MortuaryStorageCabinet',
      resourceId: cab.code,
      changes: { code, targetTemp, targetHumidity, status: 'NORMAL' }
    });

    res.json({ success: true, message: `Sensor for ${cab.code} recalibrated to ${targetTemp}°C. Excursion alarms cleared.`, data: cab });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to calibrate cooling sensor' });
  }
});

router.post('/storage/calibrate-all', async (req: Request, res: Response) => {
  try {
    storageCabinets.forEach(cab => {
      if (cab.code.includes('Deep Freeze')) {
        cab.tempCelsius = -18.5;
        cab.humidityPercent = 45;
      } else {
        cab.tempCelsius = 3.8;
        cab.humidityPercent = 65;
      }
      cab.status = 'NORMAL';
    });

    capaPlans.forEach(c => {
      if (c.discrepancy?.includes('Temperature spike') || c.discrepancy?.includes('Cabinet B')) {
        c.status = 'CLOSED';
        c.correctiveAction = 'Biomedical engineering telemetry recalibration completed. All chamber sensors stabilized.';
      }
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_CALIBRATE_ALL_SENSORS',
      resourceType: 'MortuaryStorageCabinet',
      resourceId: 'ALL_CHAMBERS',
      changes: { status: 'NORMAL', count: storageCabinets.length }
    });

    res.json({
      success: true,
      message: 'All 8 mortuary environmental cooling sensors successfully recalibrated and telemetry stabilized.',
      data: storageCabinets
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to calibrate all sensors' });
  }
});

router.get('/custody', (req: Request, res: Response) => {
  res.json({ success: true, data: chainOfCustodyLogs });
});

router.post('/custody', async (req: Request, res: Response) => {
  try {
    const { mrn, event, origin, destination, personnel, recipient, notes } = z.object({
      mrn: z.string().min(1),
      event: z.string().min(1),
      origin: z.string().min(1),
      destination: z.string().min(1),
      personnel: z.string().optional(),
      recipient: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const adm = mortuaryAdmissions.find(a => a.mrn === mrn || a.id === mrn);
    const newLog = {
      id: `COC-${Date.now().toString().slice(-4)}`,
      mrn: adm?.mrn || mrn,
      name: adm?.name || 'Deceased Patient',
      event,
      origin,
      destination,
      personnel: personnel || 'Mortuary Officer Caleb',
      recipient: recipient || 'Designated Receiving Officer',
      notes: notes || 'Handover verified and recorded under chain of custody protocol.',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    chainOfCustodyLogs.unshift(newLog);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_LOG_CUSTODY_TRANSFER',
      resourceType: 'ChainOfCustody',
      resourceId: newLog.id,
      changes: newLog
    });

    res.status(201).json({ success: true, message: 'Chain of custody transfer recorded successfully', data: newLog });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || 'Failed to record custody transfer' });
  }
});

router.post('/movements', async (req: Request, res: Response) => {
  try {
    const { mrn, destination, purpose } = z.object({
      mrn: z.string(),
      destination: z.string(),
      purpose: z.string()
    }).parse(req.body);

    const body = mortuaryAdmissions.find(b => b.mrn === mrn);
    if (!body) return res.status(404).json({ success: false, message: 'Admitted body MRN not found' });

    const oldLocation = body.storageLocation;
    body.storageLocation = destination;

    // Update cabinets
    const oldCab = storageCabinets.find(c => c.code === oldLocation);
    if (oldCab) oldCab.occupied = false;

    const newCab = storageCabinets.find(c => c.code === destination);
    if (newCab) newCab.occupied = true;

    const movement = {
      id: `COC-${Date.now().toString().slice(-4)}`,
      mrn: body.mrn,
      name: body.name,
      event: 'INTERNAL_TRANSFER',
      origin: oldLocation,
      destination,
      personnel: 'Mortuary Officer Caleb',
      recipient: 'Cold Vault Reassignment',
      notes: purpose || 'Internal tray movement transfer',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    chainOfCustodyLogs.unshift(movement);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_MOVE_BODY',
      resourceType: 'MortuaryAdmission',
      resourceId: body.id,
      changes: { oldLocation, newLocation: destination, purpose }
    });

    res.json({ success: true, data: body });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record body movement' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §27.3 - AUTOPSY, POSTMORTEM SERVICES & FUNERAL RELEASE
// ─────────────────────────────────────────────────────────────────────────────

router.get('/autopsies', (req: Request, res: Response) => {
  const enriched = autopsyRecords.map(a => {
    const body = mortuaryAdmissions.find(b => b.mrn === a.mrn || b.id === a.mrn || b.patientId === a.mrn || (a.patientId && b.patientId === a.patientId));
    return {
      ...a,
      name: a.name || body?.name || 'Deceased Patient',
      gender: a.gender || body?.gender || 'Male',
      age: a.age || body?.age || 50,
      causeOfDeath: a.causeOfDeath || body?.causeOfDeath || 'Pending Autopsy Report',
      storageLocation: body?.storageLocation || 'Mortuary Cold Vault',
      medicoLegalStatus: a.type === 'CORONER' ? 'CORONER_CASE' : (body?.medicoLegalStatus || 'NONE'),
    };
  });
  res.json({ success: true, data: enriched });
});

router.post('/autopsies', async (req: Request, res: Response) => {
  try {
    const {
      mrn,
      patientId,
      name,
      gender,
      age,
      sourceWard,
      certifyingClinician,
      causeOfDeath,
      pathologist,
      scheduledTime,
      type,
      inMortuary = true,
      directReferral = false
    } = req.body;

    const targetMrn = mrn || patientId || `P-DEC-${Date.now().toString().slice(-4)}`;
    const body = mortuaryAdmissions.find(b => b.mrn === targetMrn || b.id === targetMrn || b.patientId === targetMrn || (patientId && b.patientId === patientId));

    const autopsy = {
      id: `AUT-${Math.floor(100 + Math.random() * 900)}`,
      mrn: body?.mrn || targetMrn,
      patientId: patientId || body?.patientId || null,
      name: name || body?.name || 'Deceased Patient',
      gender: gender || body?.gender || 'UNKNOWN',
      age: age || body?.age || null,
      sourceWard: sourceWard || body?.sourceWard || body?.storageLocation || 'Clinical Ward',
      certifyingClinician: certifyingClinician || body?.certifyingClinician || 'Attending Physician',
      causeOfDeath: causeOfDeath || body?.causeOfDeath || 'Pending Autopsy Report',
      pathologist: pathologist || 'Dr. T. A. Vegher (Consultant Pathologist)',
      scheduledTime: scheduledTime || new Date().toLocaleString(),
      type: type || 'CLINICAL',
      inMortuary: inMortuary && !!body,
      directReferral: Boolean(directReferral || !body),
      status: 'SCHEDULED',
      findings: 'Pending postmortem examination findings report.'
    };

    autopsyRecords.unshift(autopsy);

    // Update body admission status if in mortuary
    if (body) {
      body.autopsyStatus = type === 'CORONER' ? 'Coroner Forensic Autopsy Scheduled' : 'Clinical Pathology Autopsy Scheduled';
    }

    // Automatically bill Autopsy Examination to the Cashier
    const serviceCode = type === 'CORONER' ? 'MORT-AUTOPSY-CORONER' : 'MORT-AUTOPSY-CLIN';
    try {
      billChargeMasterService({
        patientId: autopsy.patientId,
        patientName: autopsy.name,
        serviceCode,
        quantity: 1,
        notes: `Post-Mortem Autopsy: ${type === 'CORONER' ? 'Coroner Medico-Legal' : 'Clinical Pathology'} (${autopsy.name})`,
        userId: (req as any).user?.id || 'SYSTEM'
      });
    } catch (e) {
      console.warn('Billing autopsy examination error:', e);
    }

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_SCHEDULE_AUTOPSY',
      resourceType: 'AutopsyRecord',
      resourceId: autopsy.id,
      changes: autopsy
    });

    res.status(201).json({ success: true, data: autopsy });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to request autopsy postmortem services' });
  }
});

router.post('/post-autopsy-transfer', async (req: Request, res: Response) => {
  try {
    const {
      patientId,
      name,
      gender,
      age,
      destination, // 'HOSPITAL_MORTUARY' | 'EXTERNAL_MORTUARY' | 'FAMILY_RELEASE'
      externalFacilityName,
      transportMode, // 'AMBULANCE' | 'PERSONAL_VEHICLE'
      ambulanceVehicle,
      ambulanceDriver,
      vehiclePlateNumber,
      driverName,
      claimantName,
      claimantPhone,
      relationship,
      causeOfDeath,
      pathologist
    } = req.body;

    const resolvedName = name || 'Deceased Patient';
    const patientIdentifier = patientId || `DEC-${Date.now().toString().slice(-4)}`;

    if (destination === 'HOSPITAL_MORTUARY') {
      // Add to deceasedPatientQueue for Mortician Cold Vault assignment
      const queueItem = {
        id: `DEC-${Date.now().toString().slice(-4)}`,
        patientId,
        name: resolvedName.startsWith('Late ') ? resolvedName : `Late ${resolvedName}`,
        gender: gender || 'UNKNOWN',
        age: age || null,
        source: 'PATHOLOGY',
        sourceWard: 'Pathology Autopsy Suite',
        deceasedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        certifyingClinician: pathologist || 'Dr. T. A. Vegher (Consultant Pathologist)',
        causeOfDeath: causeOfDeath || 'Post-Mortem Certified Cause',
        medicoLegalStatus: 'NONE',
        identifyingFeatures: 'Pathology Post-Mortem Autopsy Completed · Referred to Mortuary Cold Vaults',
        nokName: claimantName || 'Family Next of Kin',
        nokRelationship: relationship || 'Family',
        nokPhone: claimantPhone || '—',
        status: 'PENDING_MORTUARY_INTAKE',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };

      deceasedPatientQueue.unshift(queueItem);

      // Bill mortuary intake
      try {
        billChargeMasterService({
          patientId,
          patientName: resolvedName,
          serviceCode: 'MORT-INTAKE',
          quantity: 1,
          notes: `Hospital Mortuary Cold Vault Admission following Post-Mortem Autopsy (${resolvedName})`,
          userId: (req as any).user?.id || 'SYSTEM'
        });
      } catch (e) {
        console.warn('Billing mortuary intake error:', e);
      }

      // Log custody
      chainOfCustodyLogs.unshift({
        id: `COC-${Date.now().toString().slice(-4)}`,
        mrn: patientIdentifier,
        event: 'POST_AUTOPSY_MORTUARY_TRANSFER',
        origin: 'Pathology Autopsy Suite',
        destination: 'Hospital Mortuary Cold Vaults (Pending Bay Allocation)',
        personnel: pathologist || 'Consultant Pathologist',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });

      return res.json({
        success: true,
        message: 'Body transferred to Hospital Mortuary Cold Vaults ingestion queue & invoiced to Cashier.',
        data: queueItem
      });
    }

    // External Mortuary or Family Release
    // 1. If transport is Ambulance: bill TRANS-AMBULANCE (₦25,000)
    let transportInvoice = null;
    if (transportMode === 'AMBULANCE') {
      try {
        transportInvoice = billChargeMasterService({
          patientId,
          patientName: resolvedName,
          serviceCode: 'TRANS-AMBULANCE',
          quantity: 1,
          notes: `Hospital Ambulance Body Transfer to ${externalFacilityName || 'Designated Mortuary/Residence'} (Vehicle: ${ambulanceVehicle || 'AMB-01'}, Driver: ${ambulanceDriver || 'Assigned Driver'})`,
          userId: (req as any).user?.id || 'SYSTEM'
        });
      } catch (e) {
        console.warn('Billing ambulance transfer error:', e);
      }
    }

    // 2. Bill statutory death certificate & release clearance: DEATH-CERT (₦5,000)
    let deathCertInvoice = null;
    try {
      deathCertInvoice = billChargeMasterService({
        patientId,
        patientName: resolvedName,
        serviceCode: 'DEATH-CERT',
        quantity: 1,
        notes: `Statutory Clinical Death Certificate & Post-Mortem Release Clearance (${resolvedName})`,
        userId: (req as any).user?.id || 'SYSTEM'
      });
    } catch (e) {
      console.warn('Billing death cert error:', e);
    }

    // 3. Chain of Custody Log
    const destDesc = destination === 'EXTERNAL_MORTUARY'
      ? `External Mortuary: ${externalFacilityName || 'Private Facility'} (${transportMode === 'AMBULANCE' ? `Hospital Ambulance ${ambulanceVehicle || ''} / Driver ${ambulanceDriver || ''}` : `Private Vehicle ${vehiclePlateNumber || ''} / Driver ${driverName || ''}`})`
      : `Family / Next-of-Kin Custody (${claimantName || 'Claimant'}, ${relationship || 'Family'})`;

    chainOfCustodyLogs.unshift({
      id: `COC-${Date.now().toString().slice(-4)}`,
      mrn: patientIdentifier,
      event: destination === 'EXTERNAL_MORTUARY' ? 'EXTERNAL_TRANSFER' : 'FINAL_RELEASE',
      origin: 'Pathology Autopsy Suite',
      destination: destDesc,
      personnel: pathologist || 'Consultant Pathologist',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });

    // Also update any matching autopsy records
    const matchingAutopsies = autopsyRecords.filter(a => a.mrn === patientIdentifier || a.patientId === patientId || (a.name && a.name.toLowerCase().includes(resolvedName.toLowerCase())));
    matchingAutopsies.forEach(a => {
      a.disposition = destination;
      a.destinationDesc = destDesc;
      a.transportMode = transportMode;
      a.releasedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    });

    res.json({
      success: true,
      message: `Body successfully dispatched to ${destDesc}. All service charges queued for Cashier payment.`,
      data: {
        destination,
        destDesc,
        transportMode,
        transportInvoice,
        deathCertInvoice
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to complete post-autopsy transfer: ' + err.message });
  }
});

router.post('/autopsies/complete', async (req: Request, res: Response) => {
  try {
    const { mrn, findings, causeOfDeath, pathologist } = req.body;

    const body = mortuaryAdmissions.find(b => b.mrn === mrn || b.patientId === mrn || b.id === mrn);
    const resolvedMrn = body?.mrn || mrn;

    let matchingAutopsies = autopsyRecords.filter(a => a.mrn === mrn || a.id === mrn || a.mrn === resolvedMrn || (body?.patientId && a.mrn === body.patientId));

    if (matchingAutopsies.length > 0) {
      matchingAutopsies.forEach(a => {
        a.status = 'COMPLETED';
        a.findings = findings || a.findings;
        if (pathologist) a.pathologist = pathologist;
        if (causeOfDeath) a.causeOfDeath = causeOfDeath;
      });
    } else {
      const newAutopsy = {
        id: `AUT-${Math.floor(100 + Math.random() * 900)}`,
        mrn: resolvedMrn,
        pathologist: pathologist || 'Dr. T. A. Vegher (Consultant Pathologist)',
        scheduledTime: new Date().toLocaleString(),
        status: 'COMPLETED',
        findings: findings || 'External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared.',
        causeOfDeath: causeOfDeath || 'Cardiopulmonary Arrest'
      };
      autopsyRecords.unshift(newAutopsy);
    }

    if (body) {
      body.autopsyStatus = 'Autopsy Completed & Signed';
      if (causeOfDeath) body.causeOfDeath = causeOfDeath;
      body.findings = findings;
    }

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_COMPLETE_AUTOPSY',
      resourceType: 'AutopsyRecord',
      resourceId: mrn,
      changes: { mrn, findings, causeOfDeath }
    });

    res.json({ success: true, message: 'Autopsy report completed and signed into chain of custody.', data: body });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to complete autopsy report' });
  }
});

router.post('/autopsies/cancel', async (req: Request, res: Response) => {
  try {
    const { mrn } = req.body;
    if (!mrn) {
      return res.status(400).json({ success: false, message: 'MRN is required to cancel autopsy' });
    }

    const body = mortuaryAdmissions.find(b => b.mrn === mrn || b.id === mrn || b.patientId === mrn || (b.name && b.name.toLowerCase().includes(mrn.toLowerCase())));
    const resolvedMrn = body?.mrn || mrn;

    // Filter out from autopsyRecords
    autopsyRecords = autopsyRecords.filter(a => 
      a.mrn !== mrn && 
      a.id !== mrn && 
      a.mrn !== resolvedMrn && 
      (!body?.patientId || a.mrn !== body.patientId)
    );

    if (body) {
      delete body.autopsyStatus;
    }

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_CANCEL_AUTOPSY',
      resourceType: 'AutopsyRecord',
      resourceId: resolvedMrn,
      changes: { mrn, cancelled: true }
    });

    res.json({ success: true, message: 'Autopsy request cancelled successfully', data: body });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel autopsy request' });
  }
});

router.delete('/autopsies/:mrn', async (req: Request, res: Response) => {
  try {
    const { mrn } = req.params;
    const body = mortuaryAdmissions.find(b => b.mrn === mrn || b.id === mrn || b.patientId === mrn);
    const resolvedMrn = body?.mrn || mrn;

    autopsyRecords = autopsyRecords.filter(a => 
      a.mrn !== mrn && 
      a.id !== mrn && 
      a.mrn !== resolvedMrn && 
      (!body?.patientId || a.mrn !== body.patientId)
    );

    if (body) {
      delete body.autopsyStatus;
    }

    res.json({ success: true, message: 'Autopsy request deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete autopsy request' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §27.3.2 - EMBALMING & BODY PREPARATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/embalming', (req: Request, res: Response) => {
  const enriched = embalmingRecords.map(e => {
    const body = mortuaryAdmissions.find(b => b.mrn === e.mrn || b.id === e.mrn || b.patientId === e.mrn);
    return {
      ...e,
      name: e.name || body?.name || 'Deceased Patient',
      storageLocation: body?.storageLocation || 'Mortuary Cold Vault',
    };
  });
  res.json({ success: true, data: enriched });
});

router.post('/embalming', async (req: Request, res: Response) => {
  try {
    const {
      mrn,
      preservativeFluid = 'Arterial Formalin & Glutaraldehyde Complex (3.5% index)',
      embalmer = 'Mortuary Specialist Caleb',
      bodyPrepStatus = 'DRESSED_AND_GROOMED',
      serviceCode: reqServiceCode,
      shroudVerified = true,
      certificateIssued = true,
      notes = ''
    } = req.body;

    const body = mortuaryAdmissions.find(b => b.mrn === mrn || b.id === mrn || b.patientId === mrn);

    // Map bodyPrepStatus to specific Charge Master service code
    const statusToCodeMap: Record<string, string> = {
      'DRESSED_AND_GROOMED': 'MORT-EMBALM-DRESS',
      'SHROUDED_FOR_VIEWING': 'MORT-SHROUD-VIEW',
      'WASHED_AND_EMBALMED': 'MORT-EMBALM-BASIC',
      'RESTORATION_IN_PROGRESS': 'MORT-RESTORATION',
      'CAVITY_TISSUE_FIXATION': 'MORT-CAVITY-PREP',
      'REPATRIATION_PREP': 'MORT-REPATRIATION',
    };

    const finalServiceCode = reqServiceCode || statusToCodeMap[bodyPrepStatus] || 'MORT-EMBALM-DRESS';

    const newRecord = {
      id: `EMB-${Date.now().toString().slice(-3)}`,
      mrn: body?.mrn || mrn,
      name: body?.name || 'Deceased Patient',
      preservativeFluid,
      embalmer,
      bodyPrepStatus,
      serviceCode: finalServiceCode,
      shroudVerified: Boolean(shroudVerified),
      certificateIssued: Boolean(certificateIssued),
      completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: notes || 'Embalming procedure completed in accordance with mortuary sanitary protocols.'
    };

    embalmingRecords.unshift(newRecord);

    // Bill Embalming to Internal Banking / Cashier Charge Master
    let createdInvoice = null;
    try {
      createdInvoice = billChargeMasterService({
        patientId: body?.patientId,
        patientName: body?.name || mrn,
        serviceCode: finalServiceCode,
        quantity: 1,
        notes: `Mortuary Body Preparation: ${bodyPrepStatus.replace(/_/g, ' ')} (${body?.name || mrn}) - Performed by ${embalmer}`,
        userId: (req as any).user?.id || 'SYSTEM'
      });
    } catch (e) {
      console.warn('Billing embalming error:', e);
    }

    // Log custody
    chainOfCustodyLogs.unshift({
      id: `COC-${Date.now().toString().slice(-4)}`,
      mrn: newRecord.mrn,
      event: 'EMBALMING_PREPARATION',
      origin: body?.storageLocation || 'Cold Vault',
      destination: 'Embalming & Cosmological Prep Suite',
      personnel: embalmer,
      recipient: 'Family Viewing Chamber Ready',
      notes: `Arterial preservation completed (${preservativeFluid}). Status: ${bodyPrepStatus}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_LOG_EMBALMING',
      resourceType: 'EmbalmingRecord',
      resourceId: newRecord.id,
      changes: newRecord
    });

    res.status(201).json({ success: true, message: 'Embalming procedure logged and invoiced to Cashier.', data: newRecord });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to record embalming procedure: ' + err.message });
  }
});

router.patch('/embalming/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { bodyPrepStatus, notes } = req.body;
    const record = embalmingRecords.find(e => e.id === id);
    if (!record) return res.status(404).json({ success: false, message: 'Embalming record not found' });

    if (bodyPrepStatus) record.bodyPrepStatus = bodyPrepStatus;
    if (notes) record.notes = notes;

    res.json({ success: true, message: 'Embalming record updated', data: record });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update embalming record' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §27.3.3 - DIGNITY FAMILY VIEWING SCHEDULES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/viewings', (req: Request, res: Response) => {
  const enriched = viewingSchedules.map(v => {
    const body = mortuaryAdmissions.find(b => b.mrn === v.mrn || b.id === v.mrn || b.patientId === v.mrn);
    return {
      ...v,
      name: v.name || body?.name || 'Deceased Patient',
      storageLocation: body?.storageLocation || 'Mortuary Cold Vault',
    };
  });
  res.json({ success: true, data: enriched });
});

router.post('/viewings', async (req: Request, res: Response) => {
  try {
    const {
      mrn,
      viewingChamber = 'Private Family Viewing Chapel 1',
      familyContact,
      scheduledTime,
      maxAttendees = 10,
      religiousRequirements = 'Standard Dignity Committal Viewing'
    } = req.body;

    const body = mortuaryAdmissions.find(b => b.mrn === mrn || b.id === mrn || b.patientId === mrn);
    const newViewing = {
      id: `VIW-${Date.now().toString().slice(-3)}`,
      mrn: body?.mrn || mrn,
      name: body?.name || 'Deceased Patient',
      viewingChamber,
      familyContact: familyContact || (body?.nextOfKin?.name ? `${body.nextOfKin.name} (${body.nextOfKin.relationship || 'NOK'}, ${body.nextOfKin.phone || ''})` : 'Next of Kin Contact'),
      scheduledTime: scheduledTime || new Date().toLocaleString(),
      maxAttendees: Number(maxAttendees) || 10,
      status: 'SCHEDULED',
      religiousRequirements: religiousRequirements || 'Standard Dignity Committal Viewing'
    };

    viewingSchedules.unshift(newViewing);

    // Bill Viewing Suite to Cashier
    try {
      billChargeMasterService({
        patientId: body?.patientId,
        patientName: body?.name || mrn,
        serviceCode: 'MORT-VIEWING',
        quantity: 1,
        notes: `Private Family Dignity Viewing Session (${body?.name || mrn} - ${viewingChamber})`,
        userId: (req as any).user?.id || 'SYSTEM'
      });
    } catch (e) {
      console.warn('Billing viewing session error:', e);
    }

    // Log custody
    chainOfCustodyLogs.unshift({
      id: `COC-${Date.now().toString().slice(-4)}`,
      mrn: newViewing.mrn,
      event: 'DIGNITY_FAMILY_VIEWING',
      origin: body?.storageLocation || 'Cold Vault',
      destination: viewingChamber,
      personnel: 'Mortuary Officer Caleb',
      recipient: newViewing.familyContact,
      notes: `Family viewing session scheduled for ${newViewing.scheduledTime}. Max attendees: ${newViewing.maxAttendees}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_SCHEDULE_VIEWING',
      resourceType: 'ViewingSchedule',
      resourceId: newViewing.id,
      changes: newViewing
    });

    res.status(201).json({ success: true, message: 'Dignity family viewing session scheduled & invoiced to Cashier.', data: newViewing });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to schedule family viewing: ' + err.message });
  }
});

router.patch('/viewings/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const viewing = viewingSchedules.find(v => v.id === id);
    if (!viewing) return res.status(404).json({ success: false, message: 'Viewing session not found' });

    viewing.status = status;

    res.json({ success: true, message: `Viewing session status updated to ${status}`, data: viewing });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update viewing status' });
  }
});

router.post('/release', async (req: Request, res: Response) => {
  try {
    const { mrn, claimantName, claimantNid, relationship, undertaker, hearseNumber, receiptNumber } = z.object({
      mrn: z.string(),
      claimantName: z.string().min(1),
      claimantNid: z.string().min(1),
      relationship: z.string().min(1),
      undertaker: z.string().optional(),
      hearseNumber: z.string().optional(),
      receiptNumber: z.string().optional()
    }).parse(req.body);

    const body = mortuaryAdmissions.find(b => b.mrn === mrn || b.patientId === mrn || b.id === mrn);
    if (!body) return res.status(404).json({ success: false, message: 'Body record not found' });

    body.status = 'RELEASED';
    const oldLoc = body.storageLocation;
    body.storageLocation = 'RELEASED (Vault Vacated)';
    body.claimantName = claimantName;
    body.claimantNid = claimantNid;
    body.relationship = relationship;
    body.undertaker = undertaker || 'Family Private Transport';
    body.hearseNumber = hearseNumber || 'N/A';
    body.receiptNumber = receiptNumber || `RCP-MORT-${Date.now().toString().slice(-5)}`;
    body.releasedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const cabinet = storageCabinets.find(c => c.code === oldLoc);
    if (cabinet) cabinet.occupied = false;

    // Log release movement
    chainOfCustodyLogs.unshift({
      id: `COC-${Date.now().toString().slice(-4)}`,
      mrn: body.mrn,
      event: 'FINAL_RELEASE',
      origin: oldLoc,
      destination: 'RELEASED_TO_FAMILY',
      personnel: 'Mortuary Officer Caleb',
      recipient: `${claimantName} (${relationship} · NIN: ${claimantNid})`,
      notes: `Body released to family. Undertaker: ${undertaker || 'Private'} [${hearseNumber || 'N/A'}]. Receipt: ${body.receiptNumber}.`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_RELEASE_BODY',
      resourceType: 'MortuaryAdmission',
      resourceId: body.id,
      changes: { status: 'RELEASED', claimantName, relationship }
    });

    res.json({ success: true, message: 'Body release completed successfully and logged to custody trail.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to complete body release' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §27.4 - INCIDENTS & CAPA (Corrective and Preventive Action)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/capa', (req: Request, res: Response) => {
  res.json({ success: true, data: capaPlans });
});

router.post('/capa', async (req: Request, res: Response) => {
  try {
    const { targetUnit, discrepancy, correctiveAction, deadline } = z.object({
      targetUnit: z.string(),
      discrepancy: z.string(),
      correctiveAction: z.string(),
      deadline: z.string()
    }).parse(req.body);

    const plan = {
      id: `CAPA-${Date.now().toString().slice(-3)}`,
      targetUnit,
      discrepancy,
      correctiveAction,
      deadline,
      status: 'OPEN'
    };

    capaPlans.unshift(plan);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'MORTUARY_CREATE_CAPA',
      resourceType: 'CAPAPlan',
      resourceId: plan.id,
      changes: plan
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to register CAPA corrective plan' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §27.4 - BI ANALYTICS KPI SCORECARD
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics', (req: Request, res: Response) => {
  const totalBodies = mortuaryAdmissions.length;
  const activeAdmitted = mortuaryAdmissions.filter(b => b.status === 'ADMITTED').length;
  const releasedCount = mortuaryAdmissions.filter(b => b.status === 'RELEASED').length;
  
  const occupiedCabinetsCount = storageCabinets.filter(c => c.occupied).length;
  const totalCabinetsCount = storageCabinets.length;
  const occupancyPercentage = Number(((occupiedCabinetsCount / totalCabinetsCount) * 100).toFixed(0));

  const alertExcursionCount = storageCabinets.filter(c => c.status === 'EXCURSION_ALERT').length;

  const distributionByStatus = [
    { name: 'Active Admitted', value: activeAdmitted },
    { name: 'Released', value: releasedCount }
  ];

  res.json({
    success: true,
    data: {
      totalBodies,
      activeAdmitted,
      releasedCount,
      occupancyPercentage,
      alertExcursionCount,
      distributionByStatus
    }
  });
});

export default router;
