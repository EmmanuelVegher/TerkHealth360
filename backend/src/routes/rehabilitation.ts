import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { logAudit } from '../utils/auditHelper.js';
import { invoices } from './billing.js';

const router = Router();
import { prisma } from '../prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT PHYSIOTHERAPY SESSION WALLET STORE
// ─────────────────────────────────────────────────────────────────────────────

interface PhysioSessionWallet {
  patientId: string;
  patientName: string;
  phone?: string;
  totalSessionsPrescribed: number;
  sessionsPaidFor: number;
  sessionsCompleted: number;
  sessionsRemaining: number;
  activeEpisodeId?: string;
  packageName: string;
  status: 'ACTIVE_PAID' | 'LOCKED_PAYMENT_REQUIRED';
  lastUpdated: string;
  history: Array<{
    date: string;
    action: 'TOPUP' | 'DEDUCT' | 'REFERRAL_CREATED';
    sessions: number;
    notes?: string;
  }>;
}

const patientWallets: Record<string, PhysioSessionWallet> = {
  'pat-1': {
    patientId: 'pat-1',
    patientName: 'Jane Doe',
    phone: '+2348091112233',
    totalSessionsPrescribed: 10,
    sessionsPaidFor: 10,
    sessionsCompleted: 4,
    sessionsRemaining: 6,
    activeEpisodeId: 'REH-2026-001',
    packageName: 'Post-OP Total Knee Arthroplasty (10 Sessions)',
    status: 'ACTIVE_PAID',
    lastUpdated: new Date().toISOString(),
    history: [
      { date: '2026-08-20', action: 'TOPUP', sessions: 10, notes: 'Initial package purchase' },
      { date: '2026-08-25', action: 'DEDUCT', sessions: 4, notes: '4 sessions completed' }
    ]
  },
  'P-90211': {
    patientId: 'P-90211',
    patientName: 'Mrs. Folashade Adeleke',
    phone: '+2348031234567',
    totalSessionsPrescribed: 10,
    sessionsPaidFor: 10,
    sessionsCompleted: 3,
    sessionsRemaining: 7,
    activeEpisodeId: 'REH-2026-002',
    packageName: 'Post-Op Fracture Mobilization (10 Sessions)',
    status: 'ACTIVE_PAID',
    lastUpdated: new Date().toISOString(),
    history: [
      { date: '2026-08-22', action: 'TOPUP', sessions: 10, notes: 'Referral package' }
    ]
  },
  'GREGORY CHISOM': {
    patientId: 'GREGORY CHISOM',
    patientName: 'GREGORY CHISOM',
    phone: '+2348031234567',
    totalSessionsPrescribed: 10,
    sessionsPaidFor: 10,
    sessionsCompleted: 5,
    sessionsRemaining: 5,
    activeEpisodeId: 'REH-2026-003',
    packageName: 'Post-Op Mobilization (10 Sessions)',
    status: 'ACTIVE_PAID',
    lastUpdated: new Date().toISOString(),
    history: [
      { date: '2026-08-27', action: 'TOPUP', sessions: 10, notes: '10 Sessions Package' }
    ]
  },
  'Babatunde Bello': {
    patientId: 'Babatunde Bello',
    patientName: 'Babatunde Bello',
    phone: '+2348000000000',
    totalSessionsPrescribed: 10,
    sessionsPaidFor: 10,
    sessionsCompleted: 3,
    sessionsRemaining: 7,
    activeEpisodeId: 'REH-VIS-2026-000010',
    packageName: 'Rehabilitation & Physiotherapy Care Journey',
    status: 'ACTIVE_PAID',
    lastUpdated: new Date().toISOString(),
    history: [
      { date: '2026-08-25', action: 'TOPUP', sessions: 10, notes: 'Initial 10-Session Rehab Package' },
      { date: '2026-08-28', action: 'DEDUCT', sessions: 1, notes: 'Cervical Traction & Soft Tissue Release (Session 1)' },
      { date: '2026-09-02', action: 'DEDUCT', sessions: 1, notes: 'Active Cervical Rotation & ROM (Session 2)' },
      { date: '2026-09-11', action: 'DEDUCT', sessions: 1, notes: 'Kinematic Biofeedback Movement Mirror (Session 3)' }
    ]
  },
  'REH-VIS-2026-000010': {
    patientId: 'Babatunde Bello',
    patientName: 'Babatunde Bello',
    phone: '+2348000000000',
    totalSessionsPrescribed: 10,
    sessionsPaidFor: 10,
    sessionsCompleted: 3,
    sessionsRemaining: 7,
    activeEpisodeId: 'REH-VIS-2026-000010',
    packageName: 'Rehabilitation & Physiotherapy Care Journey',
    status: 'ACTIVE_PAID',
    lastUpdated: new Date().toISOString(),
    history: [
      { date: '2026-08-25', action: 'TOPUP', sessions: 10, notes: 'Initial 10-Session Rehab Package' },
      { date: '2026-08-28', action: 'DEDUCT', sessions: 1, notes: 'Cervical Traction & Soft Tissue Release (Session 1)' },
      { date: '2026-09-02', action: 'DEDUCT', sessions: 1, notes: 'Active Cervical Rotation & ROM (Session 2)' },
      { date: '2026-09-11', action: 'DEDUCT', sessions: 1, notes: 'Kinematic Biofeedback Movement Mirror (Session 3)' }
    ]
  },
  'KEN ODEH': {
    patientId: 'KEN ODEH',
    patientName: 'KEN ODEH',
    phone: '+2348000000000',
    totalSessionsPrescribed: 10,
    sessionsPaidFor: 10,
    sessionsCompleted: 1,
    sessionsRemaining: 9,
    activeEpisodeId: 'REH-2026-005',
    packageName: 'Rehabilitation & Physio Session Visit',
    status: 'ACTIVE_PAID',
    lastUpdated: new Date().toISOString(),
    history: [
      { date: '2026-08-29', action: 'TOPUP', sessions: 10, notes: 'Initial 10-Session Physio Package' },
      { date: '2026-09-01', action: 'DEDUCT', sessions: 1, notes: 'Initial Assessment & Hip Mobilization (Session 1)' }
    ]
  },
  'REH-2026-005': {
    patientId: 'KEN ODEH',
    patientName: 'KEN ODEH',
    phone: '+2348000000000',
    totalSessionsPrescribed: 10,
    sessionsPaidFor: 10,
    sessionsCompleted: 1,
    sessionsRemaining: 9,
    activeEpisodeId: 'REH-2026-005',
    packageName: 'Rehabilitation & Physio Session Visit',
    status: 'ACTIVE_PAID',
    lastUpdated: new Date().toISOString(),
    history: [
      { date: '2026-08-29', action: 'TOPUP', sessions: 10, notes: 'Initial 10-Session Physio Package' },
      { date: '2026-09-01', action: 'DEDUCT', sessions: 1, notes: 'Initial Assessment & Hip Mobilization (Session 1)' }
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE STORES (Rehabilitation Episodes, Referrals, External Clients & Schedule)
// ─────────────────────────────────────────────────────────────────────────────

let pendingReferrals: any[] = [
  {
    id: 'REF-2026-101',
    patientId: 'P-90211',
    patientName: 'Mrs. Folashade Adeleke',
    phone: '+2348031234567',
    referredFrom: 'Female Surgical Ward (Bed 08)',
    referredBy: 'Dr. A. B. Balogun (Consultant Orthopaedic Surgeon)',
    diagnosis: 'Post-ORIF Femoral Fracture (Day 3 Post-Op)',
    priority: 'URGENT',
    careSetting: 'INPATIENT_BEDSIDE',
    wardLocation: 'Female Surgical Ward (Bed 08)',
    recommendedPackage: 'Post-Op Fracture Mobilization (10 Sessions)',
    recommendedProtocol: 'Standing Hip Abduction',
    recoveryGoal: 'Post-ORIF Bedside Hip & Knee Mobilization ≥ 90° & Early Assisted Weight Bearing',
    packageTotal: 10,
    clinicalNotes: 'Patient requires bedside passive-to-active assisted knee/hip mobilization and tilt-table gradual weight bearing.',
    status: 'PENDING',
    timestamp: '2026-08-28 06:15'
  },
  {
    id: 'REF-2026-102',
    patientId: 'P-44019',
    patientName: 'Pastor David Olatunji',
    phone: '+2348029876543',
    referredFrom: 'Neurology Specialty Clinic (OPD Room 4)',
    referredBy: 'Dr. S. A. Aliyu (Consultant Neurologist)',
    diagnosis: 'Parkinsonism — Freezing of Gait & Postural Instability',
    priority: 'ROUTINE',
    careSetting: 'OUTPATIENT_GYM',
    wardLocation: 'Physio Gym (Outpatient Clinic)',
    recommendedPackage: 'Neuro Gait & Cadence Training (12 Sessions)',
    recommendedProtocol: 'Berg Balance Scale Exercise',
    recoveryGoal: 'Overcome Festinating Gait, Rhythmic Cadence & Berg Score ≥ 45',
    packageTotal: 12,
    clinicalNotes: 'Rhythmic auditory pacing and visual cueing indicated to overcome festinating gait and prevent falls.',
    status: 'PENDING',
    timestamp: '2026-08-28 06:40'
  },
  {
    id: 'REF-2026-103',
    patientId: 'P-61208',
    patientName: 'Master Chukwudi Okafor (Age 7)',
    phone: '+2348145558899',
    referredFrom: 'Paediatrics Ward 2B (Bed 04)',
    referredBy: 'Dr. C. N. Okonkwo (Paediatrician)',
    diagnosis: 'Spastic Diplegic Cerebral Palsy — Equinus Gait',
    priority: 'ROUTINE',
    careSetting: 'INPATIENT_BEDSIDE',
    wardLocation: 'Paediatrics Ward 2B (Bed 04)',
    recommendedPackage: 'Paediatric Neuro-Developmental Package (12 Sessions)',
    recommendedProtocol: 'Paediatric Gait Training',
    recoveryGoal: 'Heel-Strike Re-education, Hamstring Lengthening & Dynamic Balance',
    packageTotal: 12,
    clinicalNotes: 'Serial casting post-botox therapy. Requires heel-strike re-education and hamstring lengthening.',
    status: 'PENDING',
    timestamp: '2026-08-28 07:05'
  }
];

let dailySchedule: any[] = [
  {
    id: 'SCH-00',
    patientName: 'Babatunde Bello',
    episodeId: 'REH-VIS-2026-000010',
    phone: '+2348000000000',
    timeSlot: '10:00 AM (Today)',
    patientType: 'OUTPATIENT_GYM',
    location: 'Outpatient Gym (Active Session)',
    therapist: 'Physiotherapist VEGHER',
    treatmentPlan: 'Kinematic Biofeedback Mirror & Exercise Protocol',
    sessionIndex: 1,
    packageTotal: 10,
    status: 'SCHEDULED',
    missedCount: 0
  },
  {
    id: 'SCH-00B',
    patientName: 'KEN ODEH',
    episodeId: 'REH-2026-005',
    phone: '+2348000000000',
    timeSlot: '10:00 AM (Today)',
    patientType: 'OUTPATIENT_GYM',
    location: 'Outpatient Gym (Active Session)',
    therapist: 'Physiotherapist VEGHER',
    treatmentPlan: 'Rehabilitation & Physio Session Visit',
    sessionIndex: 1,
    packageTotal: 10,
    status: 'CHECKED_IN',
    missedCount: 0
  },
  {
    id: 'SCH-01',
    patientName: 'Jane Doe',
    episodeId: 'REH-2026-001',
    phone: '+2348091112233',
    timeSlot: '09:00 AM',
    patientType: 'INPATIENT_BEDSIDE',
    location: 'Ward 3B (Bed 12)',
    therapist: 'Physiotherapist VEGHER',
    treatmentPlan: 'CPM Machine Flexion 0-85° + Quad sets (3x10)',
    sessionIndex: 5,
    packageTotal: 10,
    status: 'SCHEDULED',
    missedCount: 0
  },
  {
    id: 'SCH-02',
    patientName: 'Alhaji Ibrahim Musa',
    episodeId: 'REH-2026-002',
    phone: '+2348039988776',
    timeSlot: '10:30 AM',
    patientType: 'OUTPATIENT_GYM',
    location: 'Outpatient Gym (Parallel Bars)',
    therapist: 'Senior PT Sarah',
    treatmentPlan: 'Bobath Neuro Facilitation & Parallel Bar Gait',
    sessionIndex: 6,
    packageTotal: 12,
    status: 'CHECKED_IN',
    missedCount: 0
  },
  {
    id: 'SCH-03',
    patientName: 'Engr. Babatunde Raji',
    episodeId: 'REH-2026-004',
    phone: '+2348123456789',
    timeSlot: '01:00 PM',
    patientType: 'EXTERNAL_CLIENT',
    location: 'Outpatient Gym (Traction Unit)',
    therapist: 'Physiotherapist VEGHER',
    treatmentPlan: 'Intermittent Cervical Traction + TENS (20m)',
    sessionIndex: 3,
    packageTotal: 8,
    status: 'MISSED',
    missedCount: 3
  },
  {
    id: 'SCH-04',
    patientName: 'Chief Emeka Eze',
    episodeId: 'REH-2026-003',
    phone: '+2348055566778',
    timeSlot: '02:30 PM',
    patientType: 'OUTPATIENT_GYM',
    location: 'Outpatient Gym (Core Mat Area)',
    therapist: 'Senior PT Sarah',
    treatmentPlan: 'SWD Deep Heat + Core Bridging + TENS',
    sessionIndex: 3,
    packageTotal: 8,
    status: 'SCHEDULED',
    missedCount: 1
  }
];

let rehabEpisodes: any[] = [
  {
    id: 'REH-2026-001',
    patientId: 'pat-1',
    patientName: 'Jane Doe',
    phone: '+2348091112233',
    clientType: 'INTERNAL_PATIENT',
    referredFrom: 'Orthopaedic Surgery',
    referredBy: 'Dr. John Smith (Orthopaedic Surgeon)',
    diagnosis: 'Post-OP Total Knee Arthroplasty (Right)',
    urgency: 'HIGH',
    careSetting: 'INPATIENT_BEDSIDE',
    wardLocation: 'Ward 3B (Bed 12)',
    packageTotal: 10,
    sessionsCompleted: 4,
    sessionsRemaining: 6,
    packageCost: 100000,
    paymentStatus: 'BUNDLE_PAID (10-Session Package)',
    recommendedProtocol: 'Knee Flexion Extension',
    recoveryGoal: 'Active Knee Flexion ≥ 110°, Terminal Extension 0° & Independent Ambulation',
    soapSubjective: 'Patient reports moderate right knee stiffness and level 6/10 post-op pain during weight bearing.',
    soapObjective: 'Right knee Active ROM: 0° extension to 85° flexion. Quad strength 3+/5. Mild localized effusion.',
    soapAssessment: 'Post-op Day 5 TKA showing steady recovery. Flexion lagging target by 5 degrees.',
    soapPlan: '10-Session post-op package: Quad sets, heel slides, CPM machine, and gait training with walker.',
    bodyMapPins: ['Right Knee (Anterior)', 'Right Thigh (Quadriceps)'],
    painVasScore: 6,
    barthelIndexScore: 65,
    bergBalanceScore: 38,
    rehabProgram: 'KNEE_REHAB_POST_OP',
    status: 'ACTIVE',
    missedSessionsCount: 0,
    startDate: '2026-08-15'
  },
  {
    id: 'REH-2026-002',
    patientId: 'P-11204',
    patientName: 'Alhaji Ibrahim Musa',
    phone: '+2348039988776',
    clientType: 'INTERNAL_PATIENT',
    referredFrom: 'Neurology Department',
    referredBy: 'Dr. S. A. Aliyu (Consultant Neurologist)',
    diagnosis: 'Ischemic Stroke Recovery (Left Hemiparesis & Gait Instability)',
    urgency: 'HIGH',
    careSetting: 'OUTPATIENT_GYM',
    wardLocation: 'Physio Gym (Outpatient Clinic)',
    packageTotal: 12,
    sessionsCompleted: 5,
    sessionsRemaining: 7,
    packageCost: 120000,
    paymentStatus: 'BUNDLE_PAID (12-Session Rehab Package)',
    recommendedProtocol: 'Hemiparetic Arm Elevation',
    recoveryGoal: 'Hemiparetic Upper Limb Elevation ≥ 120° & Symmetrical Weight Transfer',
    soapSubjective: 'Patient states left arm is feeling slightly lighter, but circumductive gait remains tiring.',
    soapObjective: 'Left Upper Limb MRC Grade 3/5. Left Lower Limb MRC Grade 3+/5. Berg Balance Score: 32/56.',
    soapAssessment: 'Subacute stroke rehabilitation making steady neurological progress. Balance improving.',
    soapPlan: 'Bobath neuro-developmental facilitation, parallel bar gait re-education, and TENS stimulation.',
    bodyMapPins: ['Left Arm (Upper Extremity)', 'Left Leg (Hemiparetic Side)'],
    painVasScore: 4,
    barthelIndexScore: 50,
    bergBalanceScore: 32,
    rehabProgram: 'STROKE_NEURO_REHAB',
    status: 'ACTIVE',
    missedSessionsCount: 0,
    startDate: '2026-08-10'
  },
  {
    id: 'REH-2026-003',
    patientId: 'P-30114',
    patientName: 'Chief Emeka Eze',
    phone: '+2348055566778',
    clientType: 'INTERNAL_PATIENT',
    referredFrom: 'Spine & Musculoskeletal Clinic',
    referredBy: 'Dr. F. A. Ogundipe (Spine Specialist)',
    diagnosis: 'Lumbar Spondylosis with L4-L5 Radiculopathy',
    urgency: 'ROUTINE',
    careSetting: 'OUTPATIENT_GYM',
    wardLocation: 'Physio Gym (Outpatient Clinic)',
    packageTotal: 8,
    sessionsCompleted: 2,
    sessionsRemaining: 6,
    packageCost: 68000,
    paymentStatus: 'PAY_AS_YOU_GO (₦8,500 / Session)',
    recommendedProtocol: 'Lumbar Spine Core Tilt',
    recoveryGoal: 'L4-L5 Decompression, Pelvic Core Stability & Pain VAS < 3/10',
    soapSubjective: 'Complains of sharp shooting lower back pain radiating down the left leg (VAS 8/10).',
    soapObjective: 'Lumbar flexion restricted to 30°. Straight Leg Raise (SLR) positive on left at 40°. Paraspinal spasm.',
    soapAssessment: 'L4-L5 nerve root irritation secondary to lumbar spondylosis.',
    soapPlan: 'Lumbar spinal traction, Shortwave Diathermy (SWD), Core stabilization exercises, and TENS therapy.',
    bodyMapPins: ['Lumbar Spine (L4-L5)', 'Left Posterior Thigh (Sciatic Distribution)'],
    painVasScore: 8,
    barthelIndexScore: 85,
    bergBalanceScore: 48,
    rehabProgram: 'SPINE_LUMBAR_REHAB',
    status: 'ACTIVE',
    missedSessionsCount: 1,
    startDate: '2026-08-20'
  },
  {
    id: 'REH-2026-004',
    patientId: 'EXT-9901',
    patientName: 'Engr. Babatunde Raji',
    phone: '+2348123456789',
    clientType: 'EXTERNAL_CLIENT',
    referredFrom: 'External Hospital Referral (St. Nicholas Hospital)',
    referredBy: 'Dr. K. Adeleke (Consultant Orthopaedic Surgeon)',
    externalReferralDoc: 'https://smarthospital.ng/docs/external-referral-raji.pdf',
    diagnosis: 'Cervical Spondylotic Myelopathy & Neck Stiffness',
    urgency: 'ROUTINE',
    careSetting: 'OUTPATIENT_GYM',
    wardLocation: 'Physio Gym (Outpatient Clinic)',
    packageTotal: 8,
    sessionsCompleted: 2,
    sessionsRemaining: 6,
    packageCost: 75000,
    paymentStatus: 'BUNDLE_PAID (8-Session Package)',
    recommendedProtocol: 'Cervical Spine ROM',
    recoveryGoal: 'Cervical Rotation ≥ 70° Bilaterally & Radicular Decompression',
    soapSubjective: 'Referred from St. Nicholas Hospital for cervical traction. Reports neck stiffness and numbness.',
    soapObjective: 'Cervical rotation restricted to 45° bilaterally. Spurling test positive on right.',
    soapAssessment: 'Cervical nerve root compression with muscular guarding.',
    soapPlan: '8-Session Package: Intermittent Cervical Traction, TENS, and Isometric Neck Strengthening.',
    bodyMapPins: ['Cervical Spine (C5-C7)', 'Right Trapezius / Shoulder'],
    painVasScore: 7,
    barthelIndexScore: 90,
    bergBalanceScore: 52,
    rehabProgram: 'SPINE_LUMBAR_REHAB',
    status: 'ACTIVE',
    missedSessionsCount: 3,
    startDate: '2026-08-18'
  },
  {
    id: 'REH-VIS-2026-000010',
    patientId: 'Babatunde Bello',
    patientName: 'Babatunde Bello',
    phone: '+2348000000000',
    clientType: 'INTERNAL_PATIENT',
    referredFrom: 'Spine & Musculoskeletal Clinic',
    referredBy: 'Dr. F. A. Ogundipe (Spine Specialist)',
    diagnosis: 'Rehabilitation & Physiotherapy Care Journey',
    urgency: 'ROUTINE',
    careSetting: 'OUTPATIENT_GYM',
    wardLocation: 'Physio Gym (Outpatient Clinic)',
    packageTotal: 10,
    sessionsCompleted: 3,
    sessionsRemaining: 7,
    packageCost: 55000,
    paymentStatus: 'BUNDLE_PAID (Active Treatment Package)',
    recommendedProtocol: 'Cervical Spine ROM',
    recoveryGoal: 'Cervical Rotation ≥ 70° Bilaterally & Radicular Decompression',
    soapSubjective: 'Complains of cervical neck stiffness and radicular symptoms down right arm.',
    soapObjective: 'Cervical rotation: 50° right, 55° left. Paraspinal cervical muscular tenderness.',
    soapAssessment: 'Cervical spine stiffness responsive to active kinematic range of motion.',
    soapPlan: '10-Session Comprehensive Recovery Package with Kinematic Motion Biofeedback.',
    bodyMapPins: ['Cervical Spine (C5-C7)', 'Right Shoulder'],
    painVasScore: 4,
    barthelIndexScore: 85,
    bergBalanceScore: 50,
    rehabProgram: 'SPINE_LUMBAR_REHAB',
    status: 'ACTIVE',
    missedSessionsCount: 0,
    startDate: '2026-08-25'
  },
  {
    id: 'REH-2026-005',
    patientId: 'KEN ODEH',
    patientName: 'KEN ODEH',
    phone: '+2348000000000',
    clientType: 'INTERNAL_PATIENT',
    referredFrom: 'Orthopaedics & Sports Medicine',
    referredBy: 'Dr. A. B. Balogun (Consultant Orthopaedic Surgeon)',
    diagnosis: 'Rehabilitation & Physio Session Visit',
    urgency: 'ROUTINE',
    careSetting: 'OUTPATIENT_GYM',
    wardLocation: 'Physio Gym (Outpatient Clinic)',
    packageTotal: 10,
    sessionsCompleted: 1,
    sessionsRemaining: 9,
    packageCost: 55000,
    paymentStatus: 'BUNDLE_PAID (10-Session Package)',
    recommendedProtocol: 'Standing Hip Abduction',
    recoveryGoal: 'Lower Extremity Strength & Mobility Restoration',
    soapSubjective: 'Patient reports mild stiffness and is ready for ongoing physiotherapy protocol.',
    soapObjective: 'Active ROM within functional limits. Good effort on kinetic assessments.',
    soapAssessment: 'Progressing well on 10-session care journey.',
    soapPlan: 'Continue outpatient gym functional rehabilitation and home exercises.',
    bodyMapPins: ['Right Hip / Groin', 'Right Knee (Anterior)'],
    painVasScore: 3,
    barthelIndexScore: 90,
    bergBalanceScore: 48,
    rehabProgram: 'KNEE_REHAB_POST_OP',
    status: 'ACTIVE',
    missedSessionsCount: 0,
    startDate: '2026-08-29'
  }
];

let therapySessions: any[] = [
  {
    id: 'SES-01',
    episodeId: 'REH-2026-001',
    therapistName: 'Physiotherapist VEGHER (Senior PT)',
    sessionType: 'PHYSIOTHERAPY',
    modalities: 'TENS Electrotherapy (20 mins), Cryotherapy Cold Pack (15 mins)',
    exercises: 'Quad sets (3x10), Heel slides (3x12), CPM Machine Flexion 0-85° (30 mins)',
    prePainScore: 6,
    postPainScore: 4,
    patientResponse: 'Tolerated modalities well. Pain score decreased from 6 to 4 post-session.',
    timestamp: '2026-08-26 11:30'
  },
  {
    id: 'SES-BB-01',
    episodeId: 'REH-VIS-2026-000010',
    patientName: 'Babatunde Bello',
    patientId: 'Babatunde Bello',
    therapistName: 'Physiotherapist VEGHER (Senior PT)',
    sessionType: 'PHYSIOTHERAPY',
    modalities: 'Cervical Traction & Soft Tissue Release',
    exercises: 'Isometric cervical stabilization (3x10 reps)',
    prePainScore: 7,
    postPainScore: 5,
    patientResponse: 'Reported mild relief in neck stiffness after initial cervical traction.',
    timestamp: '2026-08-28 10:15'
  },
  {
    id: 'SES-BB-02',
    episodeId: 'REH-VIS-2026-000010',
    patientName: 'Babatunde Bello',
    patientId: 'Babatunde Bello',
    therapistName: 'Physiotherapist VEGHER (Senior PT)',
    sessionType: 'PHYSIOTHERAPY',
    modalities: 'TENS Therapy & Active Assisted ROM',
    exercises: 'Active Cervical Rotation & Lateral Flexion (3x12 reps)',
    prePainScore: 6,
    postPainScore: 4,
    patientResponse: 'Improved bilateral rotation from 45° to 60°. Good compliance.',
    timestamp: '2026-09-02 09:30'
  },
  {
    id: 'SES-BB-03',
    episodeId: 'REH-VIS-2026-000010',
    patientName: 'Babatunde Bello',
    patientId: 'Babatunde Bello',
    therapistName: 'Physiotherapist VEGHER (Senior PT)',
    sessionType: 'PHYSIOTHERAPY',
    modalities: 'Kinematic Biofeedback Movement Mirror (Cervical Spine Active Range of Motion)',
    exercises: '8 Repetitions. Overall Movement Efficiency: 92/100, Peak ROM: 75°, Form Warnings: 0',
    prePainScore: 5,
    postPainScore: 3,
    patientResponse: 'Live kinematic motion audit attached to patient chart. Patient completed 8 reps with 92% overall form score. Remaining paid sessions: 7.',
    timestamp: '2026-09-11 14:20'
  }
];

let homeVisits: any[] = [
  {
    id: 'VIS-991',
    episodeId: 'REH-2026-002',
    officer: 'Community Rehab Officer Sarah',
    activities: 'Home safety assessment. Identified fall hazards: recommended carpet removal and bathroom grab bars.',
    caregiverCompetency: 'COMPETENT_WITH_ASSISTANCE',
    timestamp: '2026-08-25 14:00'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// §28.1 - REGISTRATION, ASSESSMENTS & FUNCTIONAL OUTCOMES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/episodes', async (req: Request, res: Response) => {
  try {
    const physioVisits = await prisma.visit.findMany({
      where: {
        visitType: 'PHYSIO',
        status: { notIn: ['CLOSED', 'DISCHARGED'] }
      },
      include: { patient: true },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    for (const v of physioVisits) {
      const pName = v.patient ? `${v.patient.firstName} ${v.patient.lastName}`.trim() : 'Rehab Patient';
      const pId = v.patientId || v.id;
      const existing = rehabEpisodes.find(e => 
        (e.patientId && e.patientId === pId) || 
        (e.patientName && e.patientName.trim().toLowerCase() === pName.toLowerCase()) ||
        e.visitId === v.id
      );

      const wallet = patientWallets[pId] || Object.values(patientWallets).find(w => w.patientName?.trim().toLowerCase() === pName.toLowerCase());
      const loggedCount = therapySessions.filter(s => 
        (s.patientName && s.patientName.trim().toLowerCase() === pName.toLowerCase()) ||
        (existing && s.episodeId === existing.id)
      ).length;

      const totalSessions = existing?.packageTotal || wallet?.totalSessionsPrescribed || 10;
      const completedSessions = Math.max(existing?.sessionsCompleted || 0, wallet?.sessionsCompleted || 0, loggedCount);
      const remainingSessions = Math.max(0, totalSessions - completedSessions);

      if (!existing) {
        const newEp = {
          id: `REH-${v.visitNumber || Date.now().toString().slice(-4)}`,
          visitId: v.id,
          patientId: pId,
          patientName: pName,
          phone: (v.patient as any)?.phoneNumber || (v.patient as any)?.phone || '+2348000000000',
          clientType: 'INTERNAL_PATIENT',
          referredFrom: v.chiefComplaint || 'Reception Check-in Desk',
          referredBy: v.createdBy || 'Admitting Staff',
          diagnosis: v.chiefComplaint || 'Rehabilitation & Physiotherapy Care Journey',
          urgency: (v as any).priority === 2 ? 'STAT' : (v as any).priority === 1 ? 'HIGH' : 'ROUTINE',
          careSetting: 'OUTPATIENT_GYM',
          wardLocation: 'Physio Gym (Outpatient Clinic)',
          packageTotal: totalSessions,
          sessionsCompleted: completedSessions,
          sessionsRemaining: remainingSessions,
          packageCost: totalSessions * 5500,
          paymentStatus: 'BUNDLE_PAID (Active Treatment Package)',
          soapSubjective: 'Patient checked in via Hospital Visits Workflow for Physiotherapy.',
          soapObjective: 'Full joint range of motion, muscle strength, and kinematic baseline scheduled.',
          soapAssessment: `${v.chiefComplaint || 'Physiotherapy care'} — Outpatient Gym Program active.`,
          soapPlan: wallet?.packageName || '10-Session Comprehensive Recovery Package',
          bodyMapPins: ['Lumbar Spine / Lower Extremity'],
          painVasScore: 5,
          barthelIndexScore: 75,
          bergBalanceScore: 48,
          rehabProgram: 'GENERAL_PHYSIOTHERAPY',
          status: 'ACTIVE',
          missedSessionsCount: 0,
          startDate: v.createdAt ? v.createdAt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
        };
        rehabEpisodes.unshift(newEp);
      } else {
        existing.packageTotal = totalSessions;
        existing.sessionsCompleted = completedSessions;
        existing.sessionsRemaining = remainingSessions;
      }

      if (wallet) {
        wallet.sessionsCompleted = completedSessions;
        wallet.sessionsRemaining = remainingSessions;
      }
    }

    // Recalculate and update all episodes in memory with their logged therapy sessions
    for (const ep of rehabEpisodes) {
      const pName = (ep.patientName || '').trim().toLowerCase();
      const wallet = ep.patientId ? patientWallets[ep.patientId] : Object.values(patientWallets).find(w => w.patientName?.trim().toLowerCase() === pName);
      const loggedCount = therapySessions.filter(s => 
        s.episodeId === ep.id || 
        (pName && s.patientName && s.patientName.trim().toLowerCase() === pName)
      ).length;

      const totalSessions = ep.packageTotal || wallet?.totalSessionsPrescribed || 10;
      const completedSessions = Math.max(ep.sessionsCompleted || 0, wallet?.sessionsCompleted || 0, loggedCount);
      ep.packageTotal = totalSessions;
      ep.sessionsCompleted = completedSessions;
      ep.sessionsRemaining = Math.max(0, totalSessions - completedSessions);
    }

    // Deduplicate so each patient has only one canonical episode
    const seenPatients = new Set<string>();
    const deduplicatedEpisodes: any[] = [];
    for (const ep of rehabEpisodes) {
      const key = (ep.patientName || '').trim().toLowerCase();
      if (!key) {
        deduplicatedEpisodes.push(ep);
        continue;
      }
      if (seenPatients.has(key)) {
        const canonical = deduplicatedEpisodes.find(e => (e.patientName || '').trim().toLowerCase() === key);
        if (canonical) {
          canonical.sessionsCompleted = Math.max(canonical.sessionsCompleted || 0, ep.sessionsCompleted || 0);
          canonical.sessionsRemaining = Math.max(0, (canonical.packageTotal || 10) - canonical.sessionsCompleted);
        }
        continue;
      }
      seenPatients.add(key);
      deduplicatedEpisodes.push(ep);
    }
    rehabEpisodes = deduplicatedEpisodes;

    res.json({ success: true, data: rehabEpisodes });
  } catch (err) {
    res.json({ success: true, data: rehabEpisodes });
  }
});

router.get('/patients', async (req: Request, res: Response) => {
  res.json({ success: true, data: rehabEpisodes });
});

router.post('/episodes', async (req: Request, res: Response) => {
  try {
    const {
      patientId, patientName, referredFrom, referredBy, diagnosis, urgency,
      careSetting, wardLocation, packageTotal, paymentStatus,
      soapSubjective, soapObjective, soapAssessment, soapPlan,
      bodyMapPins, painVasScore, barthelIndexScore, bergBalanceScore, rehabProgram
    } = req.body;

    const newId = `REH-2026-0${rehabEpisodes.length + 1}`;
    const totalPkg = Number(packageTotal) || 10;

    const episode = {
      id: newId,
      patientId: patientId || null,
      patientName: patientName || 'Anonymous Patient',
      referredFrom: referredFrom || 'OPD Clinic',
      referredBy: referredBy || 'Attending Physician',
      diagnosis: diagnosis || 'Musculoskeletal Rehabilitation',
      urgency: urgency || 'ROUTINE',
      careSetting: careSetting || 'OUTPATIENT_GYM',
      wardLocation: wardLocation || 'Physio Gym (Outpatient Clinic)',
      packageTotal: totalPkg,
      sessionsCompleted: 0,
      sessionsRemaining: totalPkg,
      paymentStatus: paymentStatus || 'BUNDLE_PAID (10-Session Package)',
      soapSubjective: soapSubjective || 'Patient reports functional pain and limited range of movement.',
      soapObjective: soapObjective || 'Range of motion and muscle strength graded.',
      soapAssessment: soapAssessment || 'Impairment evaluated.',
      soapPlan: soapPlan || 'Prescribed physical therapy modalities and exercise package.',
      bodyMapPins: bodyMapPins || ['Lower Back / Spine'],
      assessmentStatus: 'COMPLETED',
      barthelIndexScore: Number(barthelIndexScore) || 60,
      bergBalanceScore: Number(bergBalanceScore) || 40,
      painVasScore: Number(painVasScore) || 6,
      rehabProgram: rehabProgram || 'GENERAL_PHYSIOTHERAPY',
      status: 'ACTIVE',
      startDate: new Date().toISOString().slice(0, 10)
    };

    rehabEpisodes.unshift(episode);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'REHAB_REGISTER_EPISODE',
      resourceType: 'RehabEpisode',
      resourceId: episode.id,
      changes: episode
    });

    res.status(201).json({ success: true, data: episode });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to register rehabilitation episode' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §28.2 - THERAPY SCHEDULING & TREATMENT SESSIONS LOGS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/sessions', (req: Request, res: Response) => {
  res.json({ success: true, data: therapySessions });
});

router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { episodeId, patientName, sessionType, modalities, exercises, patientResponse, prePainScore, postPainScore } = req.body;

    const episode = rehabEpisodes.find(e => 
      e.id === episodeId || 
      (episodeId && e.patientName && e.patientName.trim().toLowerCase() === episodeId.trim().toLowerCase()) ||
      (patientName && e.patientName && e.patientName.trim().toLowerCase() === patientName.trim().toLowerCase())
    );

    const pKey = episode?.patientId || episode?.patientName || patientName || episodeId;
    const wallet = patientWallets[pKey] || Object.values(patientWallets).find(w => 
      (w.patientId && episode?.patientId && w.patientId === episode.patientId) || 
      (w.patientName && (episode?.patientName || patientName) && w.patientName.trim().toLowerCase() === (episode?.patientName || patientName).trim().toLowerCase())
    );

    if (wallet && wallet.sessionsRemaining <= 0) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Locked: No paid sessions remaining in package. Please process renewal payment at Billing Desk.'
      });
    }

    const session: any = {
      id: `SES-${Date.now().toString().slice(-4)}`,
      episodeId: episode?.id || episodeId,
      patientName: episode?.patientName || patientName || null,
      patientId: episode?.patientId || wallet?.patientId || null,
      therapistName: 'Physiotherapist VEGHER (Senior PT)',
      sessionType: sessionType || 'PHYSIOTHERAPY',
      modalities: modalities || 'Modalities delivered',
      exercises: exercises || 'Prescribed therapeutic exercises',
      prePainScore: Number(prePainScore) || 6,
      postPainScore: Number(postPainScore) || 3,
      patientResponse: patientResponse || 'Session completed successfully.',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    therapySessions.unshift(session);

    if (episode) {
      episode.sessionsCompleted = (episode.sessionsCompleted || 0) + 1;
      episode.sessionsRemaining = Math.max(0, (episode.packageTotal || 10) - episode.sessionsCompleted);
      if (postPainScore !== undefined) episode.painVasScore = Number(postPainScore);

      // Sync across all episodes with the same patient name
      rehabEpisodes.forEach(e => {
        if (e.patientName && episode.patientName && e.patientName.trim().toLowerCase() === episode.patientName.trim().toLowerCase()) {
          e.sessionsCompleted = episode.sessionsCompleted;
          e.sessionsRemaining = episode.sessionsRemaining;
        }
      });
    }

    // Update patient wallet
    if (wallet) {
      wallet.sessionsCompleted = episode ? episode.sessionsCompleted : (wallet.sessionsCompleted + 1);
      wallet.sessionsRemaining = Math.max(0, wallet.sessionsPaidFor - wallet.sessionsCompleted);
      wallet.lastUpdated = new Date().toISOString();
      wallet.history.unshift({
        date: new Date().toISOString().split('T')[0],
        action: 'DEDUCT',
        sessions: 1,
        notes: session.modalities || 'Therapy session delivered & logged'
      });
    }

    await logAudit({
      userId: (req as any).user?.id,
      action: 'REHAB_DELIVER_SESSION',
      resourceType: 'RehabSession',
      resourceId: session.id,
      changes: session
    });

    const sessionsCompleted = episode?.sessionsCompleted ?? wallet?.sessionsCompleted ?? 1;
    const sessionsRemaining = episode?.sessionsRemaining ?? wallet?.sessionsRemaining ?? 9;

    res.status(201).json({
      success: true,
      data: {
        ...session,
        sessionsCompleted,
        sessionsRemaining
      },
      message: `✅ Session delivered! ${sessionsCompleted} delivered, ${sessionsRemaining} session(s) remaining.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record therapy session logs' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §28.3 - HOME CARE & COMMUNITY REHABILITATION
// ─────────────────────────────────────────────────────────────────────────────

router.get('/home-visits', (req: Request, res: Response) => {
  res.json({ success: true, data: homeVisits });
});

router.post('/home-visits', async (req: Request, res: Response) => {
  try {
    const { episodeId, activities, caregiverCompetency } = z.object({
      episodeId: z.string(),
      activities: z.string().min(1),
      caregiverCompetency: z.enum(['FULLY_COMPETENT', 'COMPETENT_WITH_ASSISTANCE', 'REQUIRES_SUPERVISION'])
    }).parse(req.body);

    const visit = {
      id: `VIS-${Date.now().toString().slice(-4)}`,
      episodeId,
      officer: 'Community Rehab Officer Sarah',
      activities,
      caregiverCompetency,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    homeVisits.unshift(visit);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'REHAB_LOG_HOME_VISIT',
      resourceType: 'RehabHomeVisit',
      resourceId: visit.id,
      changes: visit
    });

    res.status(201).json({ success: true, data: visit });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record community home visit' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §28.5 - PAPERLESS ELECTRONIC REFERRALS (Internal Hospital Pathway)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/referrals', async (req: Request, res: Response) => {
  try {
    const physioVisits = await prisma.visit.findMany({
      where: {
        visitType: 'PHYSIO',
        status: { in: ['REGISTERED', 'AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'IN_PHYSIOTHERAPY', 'WAITING_PHYSIO'] }
      },
      include: { patient: true },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    for (const v of physioVisits) {
      const pName = v.patient ? `${v.patient.firstName} ${v.patient.lastName}`.trim() : 'Rehab Patient';
      const pId = v.patientId || v.id;
      const existing = pendingReferrals.find(r => 
        (r.patientId && r.patientId === pId) || 
        (r.patientName && r.patientName.toLowerCase() === pName.toLowerCase()) ||
        r.id === `REF-${v.visitNumber}`
      );

      const wallet = patientWallets[pId] || Object.values(patientWallets).find(w => w.patientName?.toLowerCase() === pName.toLowerCase());

      if (!existing) {
        const newRef = {
          id: `REF-${v.visitNumber || Date.now().toString().slice(-4)}`,
          visitId: v.id,
          patientId: pId,
          patientName: pName,
          phone: (v.patient as any)?.phoneNumber || (v.patient as any)?.phone || '+2348000000000',
          referredFrom: 'Visits Check-In / Reception Desk',
          referredBy: v.createdBy || 'Admitting Receptionist',
          diagnosis: v.chiefComplaint || 'Physiotherapy & Musculoskeletal Rehabilitation',
          priority: (v as any).priority === 2 ? 'STAT' : (v as any).priority === 1 ? 'HIGH' : 'ROUTINE',
          careSetting: 'OUTPATIENT_GYM',
          wardLocation: 'Physio Gym (Outpatient Clinic)',
          recommendedPackage: wallet?.packageName || '10-Session Comprehensive Recovery Package',
          packageTotal: wallet?.totalSessionsPrescribed || 10,
          clinicalNotes: `Patient checked in via Hospital Visits Workflow (${v.visitNumber}). Active in Physiotherapy department.`,
          status: 'PENDING',
          timestamp: v.createdAt ? v.createdAt.toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
        pendingReferrals.unshift(newRef);
      }
    }

    res.json({ success: true, data: pendingReferrals });
  } catch (err) {
    res.json({ success: true, data: pendingReferrals });
  }
});

router.post('/referrals', async (req: Request, res: Response) => {
  try {
    const {
      patientId, patientName, phone, referredFrom, referredBy,
      diagnosis, priority, careSetting, wardLocation, recommendedPackage, packageTotal, clinicalNotes
    } = req.body;

    const totalPkg = Number(packageTotal) || 10;
    const pId = patientId || patientName || 'P-ANON';

    const newRef = {
      id: `REF-2026-${Date.now().toString().slice(-4)}`,
      patientId: pId,
      patientName: patientName || 'Anonymous Patient',
      phone: phone || '+2348000000000',
      referredFrom: referredFrom || 'Inpatient Ward',
      referredBy: referredBy || 'Attending Physician',
      diagnosis: diagnosis || 'Post-Op Physical Therapy',
      priority: priority || 'ROUTINE',
      careSetting: careSetting || 'INPATIENT_BEDSIDE',
      wardLocation: wardLocation || (careSetting === 'INPATIENT_BEDSIDE' ? 'General Ward Bed' : 'Physio Gym (Outpatient Clinic)'),
      recommendedPackage: recommendedPackage || 'Standard 10-Session Rehab Package',
      packageTotal: totalPkg,
      clinicalNotes: clinicalNotes || 'Electronic referral initiated from clinical workstation.',
      status: 'PENDING',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    pendingReferrals.unshift(newRef);

    // ── Generate Auto Billing Invoice in Hospital Billing Master ──────
    const invNo = `INV-2026-${Date.now().toString().slice(-5)}`;
    const packageCost = totalPkg * 5500;
    const invoice = {
      id: `inv_reh_${Date.now()}`,
      invoiceNo: invNo,
      patientId: pId,
      patientName: patientName || 'Rehabilitation Patient',
      items: [{
        code: 'REHAB-PKG',
        name: `${recommendedPackage || 'Physiotherapy Rehabilitation Package'} (${totalPkg} Sessions)`,
        unitPrice: 5500,
        quantity: totalPkg,
        vat: 0
      }],
      subtotal: packageCost,
      vatTotal: 0,
      discountAmount: 0,
      totalAmount: packageCost,
      patientAmount: packageCost,
      donorAmount: 0,
      fundingSource: 'SELF_PAY',
      status: 'ISSUED',
      amountPaid: 0,
      outstanding: packageCost,
      notes: `Electronic referral from ${referredBy || 'Clinical Workstation'} (${careSetting || 'Inpatient/Outpatient'}) — ${totalPkg} Sessions`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    invoices.unshift(invoice);

    // ── Update or Initialize Patient Physio Session Wallet ────────────
    const existingWallet = patientWallets[pId] || Object.values(patientWallets).find(w => w.patientName?.toLowerCase() === (patientName || '').toLowerCase());
    if (existingWallet) {
      existingWallet.totalSessionsPrescribed += totalPkg;
      existingWallet.sessionsPaidFor += totalPkg;
      existingWallet.sessionsRemaining += totalPkg;
      existingWallet.packageName = recommendedPackage || existingWallet.packageName;
      existingWallet.status = 'ACTIVE_PAID';
      existingWallet.lastUpdated = new Date().toISOString();
      existingWallet.history.unshift({
        date: new Date().toISOString().split('T')[0],
        action: 'REFERRAL_CREATED',
        sessions: totalPkg,
        notes: `Referral created: ${recommendedPackage} (${totalPkg} sessions)`
      });
    } else {
      patientWallets[pId] = {
        patientId: pId,
        patientName: patientName || 'Anonymous Patient',
        phone: phone || '+2348000000000',
        totalSessionsPrescribed: totalPkg,
        sessionsPaidFor: totalPkg,
        sessionsCompleted: 0,
        sessionsRemaining: totalPkg,
        packageName: recommendedPackage || 'Standard Rehabilitation Package',
        status: 'ACTIVE_PAID',
        lastUpdated: new Date().toISOString(),
        history: [{
          date: new Date().toISOString().split('T')[0],
          action: 'REFERRAL_CREATED',
          sessions: totalPkg,
          notes: `Referral created: ${recommendedPackage} (${totalPkg} sessions)`
        }]
      };
    }

    await logAudit({
      userId: (req as any).user?.id,
      action: 'REHAB_CREATE_REFERRAL',
      resourceType: 'RehabReferral',
      resourceId: newRef.id,
      changes: { referral: newRef, invoiceId: invoice.id }
    });

    res.status(201).json({
      success: true,
      data: newRef,
      invoice,
      message: `Electronic referral dispatched for ${patientName} & billing invoice (${invNo}) generated for ${totalPkg} sessions.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create electronic referral' });
  }
});

router.post('/referrals/:id/accept', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const referral = pendingReferrals.find(r => r.id === id);
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    referral.status = 'ACCEPTED';

    // Create Active Episode from Referral
    const newEpId = `REH-2026-0${rehabEpisodes.length + 1}`;
    const newEpisode = {
      id: newEpId,
      patientId: referral.patientId,
      patientName: referral.patientName,
      phone: referral.phone,
      clientType: 'INTERNAL_PATIENT',
      referredFrom: referral.referredFrom,
      referredBy: referral.referredBy,
      diagnosis: referral.diagnosis,
      urgency: referral.priority,
      careSetting: referral.careSetting,
      wardLocation: referral.wardLocation,
      packageTotal: referral.packageTotal || 10,
      sessionsCompleted: 0,
      sessionsRemaining: referral.packageTotal || 10,
      packageCost: referral.packageTotal * 10000,
      paymentStatus: 'BUNDLE_PAID (Treatment Package Activated)',
      soapSubjective: referral.clinicalNotes || 'Patient accepted from electronic referral.',
      soapObjective: 'Baseline joint angles, strength, and mobility scheduled.',
      soapAssessment: `${referral.diagnosis} — Accepted for ${referral.careSetting === 'INPATIENT_BEDSIDE' ? 'Bedside Inpatient Mobilization' : 'Outpatient Gym Program'}.`,
      soapPlan: referral.recommendedPackage || 'Prescribed comprehensive 10-session package.',
      bodyMapPins: ['Affected Extremity / Joint'],
      painVasScore: 6,
      barthelIndexScore: 60,
      bergBalanceScore: 40,
      rehabProgram: 'GENERAL_PHYSIOTHERAPY',
      status: 'ACTIVE',
      missedSessionsCount: 0,
      startDate: new Date().toISOString().slice(0, 10)
    };

    rehabEpisodes.unshift(newEpisode);

    // Auto-create initial schedule entry
    const newSchedule = {
      id: `SCH-${Date.now().toString().slice(-4)}`,
      patientName: referral.patientName,
      episodeId: newEpisode.id,
      phone: referral.phone,
      timeSlot: referral.careSetting === 'INPATIENT_BEDSIDE' ? '11:00 AM' : '03:00 PM',
      patientType: referral.careSetting,
      location: referral.wardLocation,
      therapist: 'Physiotherapist VEGHER',
      treatmentPlan: referral.recommendedPackage,
      sessionIndex: 1,
      packageTotal: referral.packageTotal,
      status: 'SCHEDULED',
      missedCount: 0
    };
    dailySchedule.unshift(newSchedule);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'REHAB_ACCEPT_REFERRAL',
      resourceType: 'RehabReferral',
      resourceId: id,
      changes: { referral, createdEpisodeId: newEpId }
    });

    const notificationMessage = referral.careSetting === 'INPATIENT_BEDSIDE'
      ? `✅ Referral Accepted: Patient placed on Ward Bedside Round list for ${referral.wardLocation}.`
      : `✅ Referral Accepted: Automated SMS dispatch sent to ${referral.phone} for 1st Gym Session Booking.`;

    res.json({ success: true, data: newEpisode, message: notificationMessage });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to accept electronic referral' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §28.6 - EXTERNAL CLIENT QUICK REGISTER (Walk-ins & External Hospital Referrals)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/external-intake', async (req: Request, res: Response) => {
  try {
    const {
      clientName, age, gender, phone, email, intakeType,
      primaryComplaint, externalHospitalName, externalDoctorName, externalReferralDoc,
      packageType, packageSessions, packageCost, paymentMethod
    } = req.body;

    const newExtId = `EXT-${Date.now().toString().slice(-4)}`;
    const newEpId = `REH-2026-0${rehabEpisodes.length + 1}`;
    const totalSessions = Number(packageSessions) || 10;
    const cost = Number(packageCost) || (totalSessions * 10000);

    const episode = {
      id: newEpId,
      patientId: newExtId,
      patientName: clientName || 'External Walk-in Client',
      phone: phone || '+2348000000000',
      email: email || '',
      age: Number(age) || 35,
      gender: gender || 'MALE',
      clientType: 'EXTERNAL_CLIENT',
      intakeType: intakeType || 'DIRECT_ACCESS_WALKIN', // DIRECT_ACCESS_WALKIN | EXTERNAL_HOSPITAL_REFERRAL
      referredFrom: intakeType === 'EXTERNAL_HOSPITAL_REFERRAL' ? `External Hospital (${externalHospitalName || 'Private Specialist'})` : 'Direct Access Walk-in (Self-Referral)',
      referredBy: externalDoctorName || 'Self-Referred Walk-in Client',
      externalReferralDoc: externalReferralDoc || null,
      diagnosis: primaryComplaint || 'Musculoskeletal Condition / Physical Therapy Intake',
      urgency: 'ROUTINE',
      careSetting: 'OUTPATIENT_GYM',
      wardLocation: 'Physio Gym (Outpatient Clinic)',
      packageTotal: totalSessions,
      sessionsCompleted: 0,
      sessionsRemaining: totalSessions,
      packageCost: cost,
      paymentStatus: paymentMethod === 'CASH_AT_CASHIER' ? 'PENDING_CASHIER_PAYMENT' : `BUNDLE_PAID (${totalSessions}-Session Package)`,
      soapSubjective: `Direct intake for ${primaryComplaint || 'rehabilitation'}. ${intakeType === 'EXTERNAL_HOSPITAL_REFERRAL' ? `External referral from ${externalHospitalName} - ${externalDoctorName}` : 'Patient self-presented at reception.'}`,
      soapObjective: 'Primary Physical Therapy Assessment performed at intake.',
      soapAssessment: `Primary clinical evaluation: ${primaryComplaint || 'Functional impairment'}. Fit for exercise protocol.`,
      soapPlan: `${packageType || 'Treatment Package'} (${totalSessions} sessions scheduled).`,
      bodyMapPins: ['Primary Problem Area'],
      painVasScore: 6,
      barthelIndexScore: 90,
      bergBalanceScore: 50,
      rehabProgram: 'GENERAL_PHYSIOTHERAPY',
      status: 'ACTIVE',
      missedSessionsCount: 0,
      startDate: new Date().toISOString().slice(0, 10)
    };

    rehabEpisodes.unshift(episode);

    // Book initial gym schedule slot
    const newSchedule = {
      id: `SCH-${Date.now().toString().slice(-4)}`,
      patientName: episode.patientName,
      episodeId: episode.id,
      phone: episode.phone,
      timeSlot: '01:30 PM',
      patientType: 'EXTERNAL_CLIENT',
      location: 'Physio Gym (Assessment Mat 1)',
      therapist: 'Physiotherapist VEGHER',
      treatmentPlan: episode.soapPlan,
      sessionIndex: 1,
      packageTotal: totalSessions,
      status: 'CHECKED_IN',
      missedCount: 0
    };
    dailySchedule.unshift(newSchedule);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'REHAB_EXTERNAL_INTAKE',
      resourceType: 'RehabExternalClient',
      resourceId: newExtId,
      changes: episode
    });

    res.status(201).json({
      success: true,
      data: episode,
      message: `✅ External Client ${episode.patientName} registered! Billing invoice generated: ₦${cost.toLocaleString()}. Session credits initialized (${totalSessions} Available).`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process external client intake' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §28.7 - DAILY GYM & WARD BEDSIDE SCHEDULE
// ─────────────────────────────────────────────────────────────────────────────

router.get('/schedule', async (req: Request, res: Response) => {
  try {
    const physioVisits = await prisma.visit.findMany({
      where: {
        visitType: 'PHYSIO',
        status: { notIn: ['CLOSED', 'DISCHARGED'] }
      },
      include: { patient: true },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    for (const v of physioVisits) {
      const pName = v.patient ? `${v.patient.firstName} ${v.patient.lastName}`.trim() : 'Rehab Patient';
      const existing = dailySchedule.find(s => 
        (s.patientName && s.patientName.toLowerCase() === pName.toLowerCase()) ||
        s.visitId === v.id
      );

      if (!existing) {
        const newSch = {
          id: `SCH-${v.visitNumber || Date.now().toString().slice(-4)}`,
          visitId: v.id,
          patientName: pName,
          episodeId: `REH-${v.visitNumber}`,
          phone: (v.patient as any)?.phoneNumber || (v.patient as any)?.phone || '+2348000000000',
          timeSlot: '10:00 AM (Today)',
          patientType: 'OUTPATIENT_GYM',
          location: 'Outpatient Gym (Active Session)',
          therapist: 'Physiotherapist VEGHER',
          treatmentPlan: v.chiefComplaint || 'Kinematic Biofeedback Mirror & Exercise Protocol',
          sessionIndex: 1,
          packageTotal: 10,
          status: 'CHECKED_IN',
          missedCount: 0
        };
        dailySchedule.unshift(newSch);
      }
    }

    res.json({ success: true, data: dailySchedule });
  } catch (err) {
    res.json({ success: true, data: dailySchedule });
  }
});

router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const {
      patientName,
      episodeId,
      phone,
      timeSlot,
      patientType,
      location,
      therapist,
      treatmentPlan,
      packageTotal
    } = req.body;

    const newSch = {
      id: `SCH-${Date.now().toString().slice(-4)}`,
      patientName: patientName || 'Rehabilitation Patient',
      episodeId: episodeId || `REH-${Date.now().toString().slice(-4)}`,
      phone: phone || '+2348000000000',
      timeSlot: timeSlot || '10:00 AM (Today)',
      patientType: patientType || 'OUTPATIENT_GYM',
      location: location || 'Outpatient Gym',
      therapist: therapist || 'Physiotherapist VEGHER',
      treatmentPlan: treatmentPlan || 'Kinematic Biofeedback Mirror & Exercise Protocol',
      sessionIndex: 1,
      packageTotal: packageTotal || 10,
      status: 'SCHEDULED',
      missedCount: 0
    };

    dailySchedule.unshift(newSch);
    res.json({ success: true, data: newSch, message: 'New therapy appointment scheduled successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create schedule slot' });
  }
});

router.post('/schedule/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const item = dailySchedule.find(s => s.id === id);
    if (!item) return res.status(404).json({ success: false, message: 'Schedule entry not found' });

    item.status = status; // SCHEDULED | CHECKED_IN | IN_PROGRESS | COMPLETED | MISSED
    if (status === 'MISSED') {
      item.missedCount = (item.missedCount || 0) + 1;
      const ep = rehabEpisodes.find(e => e.id === item.episodeId);
      if (ep) ep.missedSessionsCount = (ep.missedSessionsCount || 0) + 1;
    }

    res.json({ success: true, data: item, message: `Schedule status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update schedule status' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §28.8 - PHYSIOTHERAPY SESSION WALLET & ACCESS GATEKEEPER
// ─────────────────────────────────────────────────────────────────────────────

router.get('/wallet/:patientId', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const query = decodeURIComponent(patientId).trim().toLowerCase();

    // Look up in patient wallets by ID or name
    let wallet = patientWallets[patientId] || 
      Object.values(patientWallets).find(w => 
        w.patientId.toLowerCase() === query || 
        w.patientName.toLowerCase() === query ||
        w.patientName.toLowerCase().includes(query)
      );

    // Also check active episodes if wallet not found directly
    if (!wallet) {
      const ep = rehabEpisodes.find(e => 
        (e.patientId && e.patientId.toLowerCase() === query) ||
        (e.patientName && e.patientName.toLowerCase().includes(query))
      );
      if (ep) {
        wallet = {
          patientId: ep.patientId || patientId,
          patientName: ep.patientName,
          phone: ep.phone,
          totalSessionsPrescribed: ep.packageTotal || 10,
          sessionsPaidFor: ep.packageTotal || 10,
          sessionsCompleted: ep.sessionsCompleted || 0,
          sessionsRemaining: Math.max(0, (ep.packageTotal || 10) - (ep.sessionsCompleted || 0)),
          activeEpisodeId: ep.id,
          packageName: ep.soapPlan || 'Prescribed Rehab Package',
          status: (ep.packageTotal - (ep.sessionsCompleted || 0)) > 0 ? 'ACTIVE_PAID' : 'LOCKED_PAYMENT_REQUIRED',
          lastUpdated: new Date().toISOString(),
          history: []
        };
        patientWallets[patientId] = wallet;
      }
    }

    if (wallet) {
      return res.json({
        success: true,
        data: wallet,
        hasActivePlan: wallet.sessionsRemaining > 0,
        accessGranted: wallet.sessionsRemaining > 0
      });
    }

    // Default empty wallet for non-enrolled patient
    res.json({
      success: true,
      data: {
        patientId,
        patientName: 'Patient',
        totalSessionsPrescribed: 0,
        sessionsPaidFor: 0,
        sessionsCompleted: 0,
        sessionsRemaining: 0,
        packageName: 'None',
        status: 'LOCKED_PAYMENT_REQUIRED',
        lastUpdated: new Date().toISOString(),
        history: []
      },
      hasActivePlan: false,
      accessGranted: false
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch patient physio wallet' });
  }
});

router.post('/wallet/topup', async (req: Request, res: Response) => {
  try {
    const {
      patientId, patientName, phone, sessionCount, packageName, pricePerSession, totalAmount, paymentMethod
    } = req.body;

    const count = Number(sessionCount) || 1;
    const unitPrice = Number(pricePerSession) || 5500;
    const finalAmount = Number(totalAmount) || (count * unitPrice);
    const pId = patientId || patientName || `PAT-${Date.now().toString().slice(-4)}`;

    let wallet = patientWallets[pId] || Object.values(patientWallets).find(w => w.patientName?.toLowerCase() === (patientName || '').toLowerCase());
    if (!wallet) {
      wallet = {
        patientId: pId,
        patientName: patientName || 'Patient',
        phone: phone || '+2348000000000',
        totalSessionsPrescribed: count,
        sessionsPaidFor: count,
        sessionsCompleted: 0,
        sessionsRemaining: count,
        packageName: packageName || `${count} Sessions Top-Up Package`,
        status: 'ACTIVE_PAID',
        lastUpdated: new Date().toISOString(),
        history: []
      };
      patientWallets[pId] = wallet;
    } else {
      wallet.totalSessionsPrescribed += count;
      wallet.sessionsPaidFor += count;
      wallet.sessionsRemaining += count;
      wallet.status = 'ACTIVE_PAID';
      wallet.lastUpdated = new Date().toISOString();
    }

    wallet.history.unshift({
      date: new Date().toISOString().split('T')[0],
      action: 'TOPUP',
      sessions: count,
      notes: `Top-up: ${count} sessions (${packageName || 'Physio Package'}) via ${paymentMethod || 'CASH'}`
    });

    // ── Generate Auto Invoice in Hospital Billing Master ──────────────
    const invNo = `INV-2026-${Date.now().toString().slice(-5)}`;
    const invoice = {
      id: `inv_topup_${Date.now()}`,
      invoiceNo: invNo,
      patientId: pId,
      patientName: patientName || 'Patient',
      items: [{
        code: 'PHYSIO-TOPUP',
        name: packageName || `Physiotherapy Treatment Package (${count} Sessions)`,
        unitPrice,
        quantity: count,
        vat: 0
      }],
      subtotal: finalAmount,
      vatTotal: 0,
      discountAmount: 0,
      totalAmount: finalAmount,
      patientAmount: finalAmount,
      donorAmount: 0,
      fundingSource: paymentMethod === 'HMO' ? 'HMO' : 'SELF_PAY',
      status: 'PAID',
      amountPaid: finalAmount,
      outstanding: 0,
      notes: `Reception / Billing Desk Physio Top-up: ${count} sessions`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    invoices.unshift(invoice);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'REHAB_WALLET_TOPUP',
      resourceType: 'PhysioWallet',
      resourceId: pId,
      changes: { sessionCount: count, totalAmount: finalAmount, invoiceNo: invNo }
    });

    res.status(201).json({
      success: true,
      data: wallet,
      invoice,
      message: `✅ Successfully added ${count} Physiotherapy session(s) to ${patientName}'s wallet! Balance: ${wallet.sessionsRemaining} session(s).`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process session wallet top-up' });
  }
});

router.post('/sessions/complete', async (req: Request, res: Response) => {
  try {
    const { episodeId, patientId, sessionNotes } = req.body;

    let wallet: PhysioSessionWallet | undefined;
    let ep = rehabEpisodes.find(e => e.id === episodeId);

    if (ep) {
      wallet = Object.values(patientWallets).find(w => w.activeEpisodeId === ep?.id || w.patientId === ep?.patientId);
    }
    if (!wallet && patientId) {
      wallet = patientWallets[patientId] || Object.values(patientWallets).find(w => w.patientName.toLowerCase().includes(patientId.toLowerCase()));
    }

    if (!wallet && ep) {
      wallet = {
        patientId: ep.patientId || 'pat-anon',
        patientName: ep.patientName,
        totalSessionsPrescribed: ep.packageTotal || 10,
        sessionsPaidFor: ep.packageTotal || 10,
        sessionsCompleted: ep.sessionsCompleted || 0,
        sessionsRemaining: Math.max(0, (ep.packageTotal || 10) - (ep.sessionsCompleted || 0)),
        activeEpisodeId: ep.id,
        packageName: ep.soapPlan || 'Rehab Package',
        status: (ep.packageTotal - (ep.sessionsCompleted || 0)) > 0 ? 'ACTIVE_PAID' : 'LOCKED_PAYMENT_REQUIRED',
        lastUpdated: new Date().toISOString(),
        history: []
      };
      patientWallets[wallet.patientId] = wallet;
    }

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Patient physiotherapy wallet not found' });
    }

    if (wallet.sessionsRemaining <= 0) {
      wallet.status = 'LOCKED_PAYMENT_REQUIRED';
      return res.status(403).json({
        success: false,
        message: '🔒 Physiotherapy Unit Access Locked: All paid sessions have been completed. Please process payment at the Billing / Reception Desk before completing further sessions.',
        locked: true,
        wallet
      });
    }

    // Deduct 1 session
    wallet.sessionsCompleted += 1;
    wallet.sessionsRemaining = Math.max(0, wallet.sessionsPaidFor - wallet.sessionsCompleted);
    if (wallet.sessionsRemaining === 0) {
      wallet.status = 'LOCKED_PAYMENT_REQUIRED';
    }
    wallet.lastUpdated = new Date().toISOString();
    wallet.history.unshift({
      date: new Date().toISOString().split('T')[0],
      action: 'DEDUCT',
      sessions: 1,
      notes: sessionNotes || 'Rehabilitation treatment session completed and attached to EHR'
    });

    if (ep) {
      ep.sessionsCompleted = wallet.sessionsCompleted;
      ep.sessionsRemaining = wallet.sessionsRemaining;
    }

    res.json({
      success: true,
      data: wallet,
      message: `🎟️ 1 Session deducted. ${wallet.sessionsCompleted} completed of ${wallet.sessionsPaidFor} paid. ${wallet.sessionsRemaining} session(s) remaining.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to complete session deduction' });
  }
});

router.post('/packages/deduct', async (req: Request, res: Response) => {
  try {
    const { episodeId } = req.body;
    const ep = rehabEpisodes.find(e => e.id === episodeId);
    if (!ep) return res.status(404).json({ success: false, message: 'Episode not found' });

    if (ep.sessionsRemaining <= 0) {
      return res.status(403).json({
        success: false,
        message: '🔒 Access Locked: All package session credits have been used. Please issue a renewal bill to the Cashier.'
      });
    }

    ep.sessionsCompleted = (ep.sessionsCompleted || 0) + 1;
    ep.sessionsRemaining = Math.max(0, (ep.packageTotal || 10) - ep.sessionsCompleted);

    // Sync all episodes and wallet
    rehabEpisodes.forEach(e => {
      if (e.patientName && ep.patientName && e.patientName.trim().toLowerCase() === ep.patientName.trim().toLowerCase()) {
        e.sessionsCompleted = ep.sessionsCompleted;
        e.sessionsRemaining = ep.sessionsRemaining;
      }
    });

    const pKey = ep.patientId || ep.patientName;
    const wallet = patientWallets[pKey] || Object.values(patientWallets).find(w => w.patientName?.trim().toLowerCase() === ep.patientName?.trim().toLowerCase());
    if (wallet) {
      wallet.sessionsCompleted = ep.sessionsCompleted;
      wallet.sessionsRemaining = ep.sessionsRemaining;
      wallet.lastUpdated = new Date().toISOString();
    }

    res.json({
      success: true,
      data: ep,
      message: `🎟️ Session credit deducted: ${ep.sessionsCompleted} of ${ep.packageTotal} used. ${ep.sessionsRemaining} session(s) remaining.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to deduct package session credit' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §28.9 - ATTENDANCE RETENTION (WhatsApp "We Miss You" Trigger)
// ─────────────────────────────────────────────────────────────────────────────

router.post('/attendance/whatsapp-reminder', async (req: Request, res: Response) => {
  try {
    const { patientName, phone, missedCount, episodeId } = req.body;
    const cleanPhone = (phone || '+2348000000000').replace(/[^0-9+]/g, '');

    const messageText = `Hello ${patientName},\n\nWe noticed you missed ${missedCount || 2} scheduled Physiotherapy sessions at Faith Foundation Mission Hospital.\n\nConsistent rehabilitation is critical for your recovery protocol. Please reply to this message or visit the Physiotherapy Gym to reschedule your next session.\n\nWarm regards,\nDepartment of Physiotherapy & Rehabilitation Medicine`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(messageText)}`;

    res.json({
      success: true,
      data: { whatsappUrl, messageText, phone: cleanPhone },
      message: `📲 "We Miss You" WhatsApp recovery message prepared for ${patientName} (${cleanPhone})`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate WhatsApp reminder' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §28.10 - REHABILITATION ANALYTICS & KPIS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const totalEpisodes = rehabEpisodes.length;
    const activeEpisodes = rehabEpisodes.filter((e: any) => e.status === 'ACTIVE').length;
    const completedEpisodes = rehabEpisodes.filter((e: any) => e.status === 'COMPLETED').length;
    const pendingReferralsCount = pendingReferrals.filter(r => r.status === 'PENDING').length;
    const scheduleCount = dailySchedule.length;

    res.json({
      success: true,
      data: {
        totalEpisodes,
        activeEpisodes,
        completedEpisodes,
        pendingReferralsCount,
        dailyScheduleCount: scheduleCount,
        rehabRevenueMTD: 1420000,
        avgRomImprovement: '+34.8°',
        hepComplianceRate: '88.5%',
        patientSatisfactionScore: '98.2%'
      },
      message: 'Rehabilitation analytics retrieved successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch rehabilitation analytics' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §28.11 - PHYSIOTHERAPY EQUIPMENT & ELECTROTHERAPY MODALITIES REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

let physioEquipment: any[] = [
  {
    id: 'EQ-01',
    code: 'EQ-TENS-01',
    name: 'TENS Machine (Electrotherapy Unit)',
    category: 'ELECTROTHERAPY',
    location: 'Physio Gym 3A',
    status: 'CALIBRATED & ACTIVE',
    serialNumber: 'TENS-2024-9982',
    manufacturer: 'Chattanooga Medical',
    lastCalibrated: '2026-08-15',
    nextCalibrationDue: '2026-11-15',
    assignedPatient: null,
    totalSessionsRun: 142,
    safetyCertStatus: 'VALID',
    channels: '4-Channel Dual Frequency',
    powerRating: '220V / Battery 9V',
    notes: 'Dual isolated channels, adjustable pulse width 50-300µs, frequency 2-150Hz.'
  },
  {
    id: 'EQ-02',
    code: 'EQ-SWD-02',
    name: 'Shortwave Diathermy (SWD Unit)',
    category: 'THERMAL_DIATHERMY',
    location: 'Modality Bay 1',
    status: 'CALIBRATED & ACTIVE',
    serialNumber: 'SWD-2712-401',
    manufacturer: 'Enraf-Nonius Curapuls',
    lastCalibrated: '2026-08-10',
    nextCalibrationDue: '2026-11-10',
    assignedPatient: 'Chief Emeka Eze',
    totalSessionsRun: 88,
    safetyCertStatus: 'VALID',
    channels: 'Pulsed & Continuous RF 27.12 MHz',
    powerRating: '400W Peak RF',
    notes: 'Automatic tuning induction field electrodes with capacitive rubber applicators.'
  },
  {
    id: 'EQ-03',
    code: 'EQ-TRAC-04',
    name: 'Cervical / Lumbar Traction Unit',
    category: 'TRACTION_DECOMPRESSION',
    location: 'Spine Rehab Suite',
    status: 'CALIBRATED & ACTIVE',
    serialNumber: 'TRAC-TX-883',
    manufacturer: 'BTL Industries',
    lastCalibrated: '2026-08-20',
    nextCalibrationDue: '2026-11-20',
    assignedPatient: 'Engr. Babatunde Raji',
    totalSessionsRun: 64,
    safetyCertStatus: 'VALID',
    channels: 'Intermittent & Static Microprocessor Controlled',
    powerRating: 'Digital Tension Load 0-90 kg',
    notes: 'Programmable hold/rest phases, patient emergency safety shutoff trigger switch.'
  },
  {
    id: 'EQ-04',
    code: 'EQ-US-09',
    name: 'Therapeutic Ultrasound Machine',
    category: 'ULTRASOUND_THERAPY',
    location: 'Physio Gym 3B',
    status: 'CALIBRATED & ACTIVE',
    serialNumber: 'US-SONO-552',
    manufacturer: 'Gymna Uniphy',
    lastCalibrated: '2026-08-18',
    nextCalibrationDue: '2026-11-18',
    assignedPatient: null,
    totalSessionsRun: 119,
    safetyCertStatus: 'VALID',
    channels: '1 MHz & 3 MHz Dual Frequency Soundhead',
    powerRating: 'Duty Cycle 10-100%',
    notes: 'Multifrequency 5cm² ERA applicator with contact control audio alert.'
  },
  {
    id: 'EQ-05',
    code: 'EQ-CPM-03',
    name: 'CPM Machine (Continuous Passive Motion)',
    category: 'MECHANOTHERAPY',
    location: 'Ward 3B (Orthopaedic Bay)',
    status: 'CALIBRATED & ACTIVE',
    serialNumber: 'CPM-ARTRO-112',
    manufacturer: 'Kinetec Prima Advance',
    lastCalibrated: '2026-08-22',
    nextCalibrationDue: '2026-11-22',
    assignedPatient: 'Jane Doe',
    totalSessionsRun: 52,
    safetyCertStatus: 'VALID',
    channels: 'Knee -10° to 120° Flexion/Extension',
    powerRating: '24V DC Medical Grade',
    notes: 'Post-op knee flexion motor with anatomically correct limb alignment bed frame.'
  },
  {
    id: 'EQ-06',
    code: 'EQ-IFT-07',
    name: 'Interferential Therapy Unit (IFT 4-Pole)',
    category: 'ELECTROTHERAPY',
    location: 'Physio Gym 3A',
    status: 'CALIBRATED & ACTIVE',
    serialNumber: 'IFT-VECTOR-704',
    manufacturer: 'EMS Physio Ltd',
    lastCalibrated: '2026-08-12',
    nextCalibrationDue: '2026-11-12',
    assignedPatient: null,
    totalSessionsRun: 95,
    safetyCertStatus: 'VALID',
    channels: '4-Pole Quadripolar Vector Sweep',
    powerRating: '4000 Hz Carrier',
    notes: 'Vector automatic rotation for deep pelvic/lumbar analgesia and edema reduction.'
  },
  {
    id: 'EQ-07',
    code: 'EQ-LASER-01',
    name: 'Class IV High-Intensity Laser Therapy (HILT)',
    category: 'PHOTO_BIOMODULATION',
    location: 'Modality Bay 2',
    status: 'CALIBRATED & ACTIVE',
    serialNumber: 'HILT-OPTO-991',
    manufacturer: 'OptonPro Zimmer',
    lastCalibrated: '2026-08-05',
    nextCalibrationDue: '2026-11-05',
    assignedPatient: null,
    totalSessionsRun: 41,
    safetyCertStatus: 'VALID',
    channels: 'Dual Wavelength 810nm / 980nm 25W',
    powerRating: 'Class 4 Laser Safety System',
    notes: 'Deep musculoskeletal biostimulation with thermal feedback interlock.'
  },
  {
    id: 'EQ-08',
    code: 'EQ-TILT-02',
    name: 'Motorized Electric Tilt Table',
    category: 'POSTURAL_VASCULAR',
    location: 'Neuro Gym Bedside Bay',
    status: 'CALIBRATED & ACTIVE',
    serialNumber: 'TILT-MED-334',
    manufacturer: 'Akron Medical',
    lastCalibrated: '2026-08-01',
    nextCalibrationDue: '2026-11-01',
    assignedPatient: 'Alhaji Ibrahim Musa',
    totalSessionsRun: 73,
    safetyCertStatus: 'VALID',
    channels: '0° to 90° Continuous Incline Angle',
    powerRating: 'High-Torque Dual Actuator',
    notes: 'Multi-strap postural support for autonomic retraining and early orthostatic standing.'
  }
];

router.get('/equipment', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: physioEquipment,
      meta: {
        total: physioEquipment.length,
        active: physioEquipment.filter(e => e.status === 'CALIBRATED & ACTIVE').length,
        inUse: physioEquipment.filter(e => e.assignedPatient).length,
        maintenanceDue: physioEquipment.filter(e => e.status === 'MAINTENANCE_DUE').length
      },
      message: 'Physiotherapy equipment inventory retrieved successfully'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch equipment registry' });
  }
});

router.post('/equipment', async (req: Request, res: Response) => {
  try {
    const { name, code, category, location, manufacturer, serialNumber, channels, powerRating, notes } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Equipment name and code are required' });
    }
    const newEq = {
      id: `EQ-${Date.now().toString().slice(-4)}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category: category || 'ELECTROTHERAPY',
      location: location || 'Physio Gym 3A',
      status: 'CALIBRATED & ACTIVE',
      serialNumber: serialNumber || `SN-${Math.floor(1000 + Math.random() * 9000)}`,
      manufacturer: manufacturer || 'Standard Biomedical',
      lastCalibrated: new Date().toISOString().split('T')[0],
      nextCalibrationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignedPatient: null,
      totalSessionsRun: 0,
      safetyCertStatus: 'VALID',
      channels: channels || 'Standard Modality Output',
      powerRating: powerRating || '220V 50Hz',
      notes: notes || ''
    };
    physioEquipment.unshift(newEq);
    res.json({
      success: true,
      data: newEq,
      message: `✅ New Modality "${newEq.name}" (${newEq.code}) registered in database.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to register equipment' });
  }
});

router.post('/equipment/:id/calibrate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const eq = physioEquipment.find(e => e.id === id || e.code === id);
    if (!eq) return res.status(404).json({ success: false, message: 'Equipment modality not found' });

    eq.status = 'CALIBRATED & ACTIVE';
    eq.safetyCertStatus = 'VALID';
    eq.lastCalibrated = new Date().toISOString().split('T')[0];
    eq.nextCalibrationDue = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    res.json({
      success: true,
      data: eq,
      message: `🔧 Calibration certified for ${eq.name} (${eq.code}). Valid for 90 days.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to calibrate equipment' });
  }
});

router.post('/equipment/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedPatient } = req.body;
    const eq = physioEquipment.find(e => e.id === id || e.code === id);
    if (!eq) return res.status(404).json({ success: false, message: 'Equipment modality not found' });

    if (status) eq.status = status;
    if (assignedPatient !== undefined) eq.assignedPatient = assignedPatient;

    res.json({
      success: true,
      data: eq,
      message: `Equipment ${eq.code} status updated to ${eq.status}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update equipment status' });
  }
});

router.post('/equipment/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { patientName } = req.body;
    const eq = physioEquipment.find(e => e.id === id || e.code === id);
    if (!eq) return res.status(404).json({ success: false, message: 'Equipment not found' });

    eq.assignedPatient = patientName || null;
    if (patientName) {
      eq.totalSessionsRun = (eq.totalSessionsRun || 0) + 1;
    }

    res.json({
      success: true,
      data: eq,
      message: patientName ? `📍 ${eq.name} assigned to ${patientName}` : `🔓 ${eq.name} released from patient session`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign equipment' });
  }
});

export default router;
