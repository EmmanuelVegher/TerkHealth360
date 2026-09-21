import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, ButtonGroup, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, CircularProgress, Divider, IconButton, Stack, Avatar, Tooltip, Slider,
  FormControlLabel, Switch, Badge, ListSubheader, Autocomplete
} from '@mui/material';
import { TerminologyAutocomplete } from '../components/TerminologyAutocomplete';
import { PHYSIO_PROTOCOLS, PHYSIO_CATEGORIES, PHYSIO_ROUTINES, PhysioProtocolConfig, PhysioRoutineGroup, getPhysioProtocol } from '../data/physioProtocols';
import { Rehabilitation3DScene } from '../components/Rehabilitation3DHuman';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  BarChart, Bar, Legend
} from 'recharts';
import {
  AccessibilityNew, FitnessCenter, HomeRepairService, Add, Search,
  Refresh, CheckCircle, Warning, Print, RateReview, Speed,
  AssignmentTurnedIn, LocalHospital, EventNote, Timer, LocationOn,
  ReceiptLong, TrendingDown, Hotel, Straighten, Send, MedicalServices,
  FormatListNumbered, Healing, Videocam, CameraAlt, PlayArrow, Pause,
  VolumeUp, VolumeOff, VolumeMute, MusicNote, GraphicEq, Hearing, Tune,
  AutoAwesome, Check, Assessment, PersonAdd, Assignment, CalendarMonth,
  Chat, WhatsApp, Phone, AttachFile, CreditCard, ArrowForward, CheckCircleOutline,
  CloudUpload, AudioFile, Close, DeleteOutline, NotificationsActive, NotificationsOff,
  Fullscreen, FullscreenExit, SkipNext, SkipPrevious, Shuffle, Repeat, PlaylistPlay,
  PlaylistAdd, HourglassTop, Person, Save, AccountCircle, AutoMode as AutoModeIcon,
  PlayCircleOutline, EditNote, AddCircleOutline, Checklist
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── Standard Referring Departments & Clinicians Catalog ─────────────────────
export const REFERRING_PHYSICIANS_CATALOG = [
  { group: '🦴 Orthopaedic Surgery & Musculoskeletal', label: 'Dr. John Smith (Consultant Orthopaedic Surgeon)', dept: 'Orthopaedics' },
  { group: '🦴 Orthopaedic Surgery & Musculoskeletal', label: 'Dr. Emeka Eze (Consultant Orthopaedic & Spine Surgeon)', dept: 'Orthopaedics' },
  { group: '🦴 Orthopaedic Surgery & Musculoskeletal', label: 'Dr. Adebayo Williams (Trauma & Joint Reconstruction)', dept: 'Orthopaedics' },
  { group: '🧠 Neurology & Stroke Unit', label: 'Dr. Adebayo Ogunlesi (Consultant Neurologist)', dept: 'Neurology' },
  { group: '🧠 Neurology & Stroke Unit', label: 'Dr. Fatima Bello (Stroke & Neuromuscular Specialist)', dept: 'Neurology' },
  { group: '🩻 Neurosurgery & Spine Centre', label: 'Dr. Chidi Nwosu (Consultant Neurosurgeon)', dept: 'Neurosurgery' },
  { group: '🩻 Neurosurgery & Spine Centre', label: 'Dr. Tunde Alabi (Spine & Cranial Surgeon)', dept: 'Neurosurgery' },
  { group: '🩺 Internal Medicine & Rheumatology', label: 'Dr. Folake Adeyemi (Consultant Physician)', dept: 'Internal Medicine' },
  { group: '🩺 Internal Medicine & Rheumatology', label: 'Dr. Emeka Okonkwo (Consultant Rheumatologist)', dept: 'Rheumatology' },
  { group: '❤️ Cardiology & Cardiopulmonary', label: 'Dr. Sarah Jenkins (Consultant Cardiologist)', dept: 'Cardiology' },
  { group: '👶 Paediatrics & Child Health', label: 'Dr. Amina Yusuf (Consultant Paediatrician)', dept: 'Paediatrics' },
  { group: '🏥 Emergency & Critical Care (ICU)', label: 'Dr. David Adeleke (Emergency & ICU Lead)', dept: 'Emergency' },
  { group: '🏃 Sports Medicine & Occupational Health', label: 'Dr. Kevin Obi (Sports Medicine Specialist)', dept: 'Sports Medicine' },
  { group: '🤰 Obstetrics & Postnatal Care', label: 'Dr. Ngozi Okeke (Consultant Obstetrician)', dept: 'Obstetrics' },
  { group: '🏛️ General OPD & Ambulatory Clinic', label: 'Dr. Hassan Danladi (Senior Medical Officer, OPD)', dept: 'OPD' },
];

// ─── Standard Physical Medicine & Rehabilitation Data Dictionary Presets ───────
export const PHYSIO_DATA_DICTIONARY_DIAGNOSES = [
  { code: 'M50.00', display: 'Cervical Spondylotic Myelopathy & Neck Stiffness', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M47.812', display: 'Cervical Spondylosis without Myelopathy or Radiculopathy', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M54.2', display: 'Cervicalgia (Acute & Chronic Neck Pain)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M75.100', display: 'Rotator Cuff Tear / Tendinopathy (Right Shoulder)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M75.101', display: 'Rotator Cuff Tear / Tendinopathy (Left Shoulder)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M75.00', display: 'Adhesive Capsulitis of Shoulder (Frozen Shoulder)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M25.511', display: 'Subacromial Impingement Syndrome (Shoulder)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M54.50', display: 'Low Back Pain / Mechanical Lumbar Strain', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M51.26', display: 'Lumbar Disc Herniation with Radiculopathy (Sciatica L4-L5/S1)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M48.06', display: 'Spinal Stenosis (Lumbar Region)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'Z96.651', display: 'Post-OP Total Knee Arthroplasty (Right TKA)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'Z96.652', display: 'Post-OP Total Knee Arthroplasty (Left TKA)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'S83.511A', display: 'Anterior Cruciate Ligament (ACL) Tear / Post-Reconstruction', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M17.11', display: 'Primary Osteoarthritis (Right Knee)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M17.12', display: 'Primary Osteoarthritis (Left Knee)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M16.11', display: 'Primary Osteoarthritis (Right Hip)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'I69.351', display: 'Hemiplegia & Hemiparesis following Cerebral Infarction (Post-Stroke)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'G51.0', display: "Bell's Palsy (Facial Nerve Paralysis)", system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'G80.9', display: 'Cerebral Palsy (Pediatric Spastic / Neuromuscular)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'S93.401A', display: 'Acute Lateral Ankle Ligament Sprain', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M76.61', display: 'Achilles Tendinopathy / Strain (Right Leg)', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M72.2', display: 'Plantar Fasciitis & Calcaneal Spur', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'G56.00', display: 'Carpal Tunnel Syndrome', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M79.7', display: 'Fibromyalgia & Generalized Myofascial Pain Syndrome', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
  { code: 'M62.81', display: 'Muscle Weakness & Post-ICU Deconditioning', system: 'ICD10' as const, category: 'DIAGNOSIS' as const },
];

// ─── Intelligent Patient Issue -> Target Protocol & Recovery Goal Resolver ─────
export const resolvePatientGoalAndProtocol = (ep: any): { targetExercise: string; recoveryGoal: string } => {
  if (!ep) return { targetExercise: 'Shoulder Abduction', recoveryGoal: 'Active Shoulder Abduction ≥ 160° & Scapular Stability' };

  if (ep.recommendedProtocol && PHYSIO_PROTOCOLS[ep.recommendedProtocol]) {
    return {
      targetExercise: ep.recommendedProtocol,
      recoveryGoal: ep.recoveryGoal || PHYSIO_PROTOCOLS[ep.recommendedProtocol]?.title || 'Restoration of functional joint range of motion'
    };
  }

  const diag = `${ep.diagnosis || ''} ${ep.soapAssessment || ''} ${ep.soapPlan || ''} ${ep.clinicalNotes || ''} ${ep.referredFrom || ''} ${ep.chiefComplaint || ''}`.toLowerCase();

  // Knee / Arthroplasty / ACL / Meniscus / Patellar
  if (diag.includes('knee') || diag.includes('arthroplasty') || diag.includes('tka') || diag.includes('patell') || diag.includes('menisc') || diag.includes('acl')) {
    return {
      targetExercise: 'Knee Flexion Extension',
      recoveryGoal: ep.recoveryGoal || 'Active Knee Flexion ≥ 110°, Terminal Extension 0° & Independent Ambulation'
    };
  }
  // Stroke / Hemiparesis / Neurological / Cerebrovascular
  if (diag.includes('stroke') || diag.includes('hemipar') || diag.includes('hemipleg') || diag.includes('ischemic') || diag.includes('infarct')) {
    return {
      targetExercise: 'Hemiparetic Arm Elevation',
      recoveryGoal: ep.recoveryGoal || 'Hemiparetic Upper Limb Elevation ≥ 120° & Symmetrical Weight Transfer'
    };
  }
  // Lumbar Spine / Lower Back Pain / Sciatica / L4-L5 Radiculopathy
  if (diag.includes('lumbar') || diag.includes('l4-l5') || diag.includes('back pain') || diag.includes('sciatica') || diag.includes('radiculopathy') || diag.includes('disc') || diag.includes('spondylosis')) {
    return {
      targetExercise: 'Lumbar Spine Core Tilt',
      recoveryGoal: ep.recoveryGoal || 'L4-L5 Lumbar Decompression, Pelvic Core Stability & Pain VAS < 3/10'
    };
  }
  // Cervical Spine / Neck Stiffness / Myelopathy
  if (diag.includes('cervical') || diag.includes('neck') || diag.includes('myelopathy') || diag.includes('trapezius')) {
    return {
      targetExercise: 'Cervical Spine ROM',
      recoveryGoal: ep.recoveryGoal || 'Cervical Rotation ≥ 70° Bilaterally & Radicular Decompression'
    };
  }
  // Femur / Hip / ORIF / Pelvic Fracture
  if (diag.includes('femur') || diag.includes('femoral') || diag.includes('hip') || diag.includes('orif') || diag.includes('fracture')) {
    return {
      targetExercise: 'Standing Hip Abduction',
      recoveryGoal: ep.recoveryGoal || 'Post-ORIF Bedside Hip & Knee Mobilization ≥ 90° & Early Assisted Weight Bearing'
    };
  }
  // Parkinson's / Postural Instability / Gait Freezing / Fall Prevention
  if (diag.includes('parkinson') || diag.includes('festinating') || diag.includes('postural') || diag.includes('balance') || diag.includes('fall')) {
    return {
      targetExercise: 'Berg Balance Scale Exercise',
      recoveryGoal: ep.recoveryGoal || 'Overcome Festinating Gait, Rhythmic Cadence & Berg Score ≥ 45'
    };
  }
  // Paediatric / Cerebral Palsy / Equinus Gait
  if (diag.includes('cerebral palsy') || diag.includes('paediatric') || diag.includes('pediatric') || diag.includes('equinus') || diag.includes('diplegic')) {
    return {
      targetExercise: 'Paediatric Gait Training',
      recoveryGoal: ep.recoveryGoal || 'Heel-Strike Re-education, Hamstring Lengthening & Dynamic Balance'
    };
  }
  // Shoulder / Rotator Cuff / Adhesive Capsulitis / Impingement
  if (diag.includes('shoulder') || diag.includes('rotator') || diag.includes('capsulitis') || diag.includes('impingement') || diag.includes('bursitis')) {
    return {
      targetExercise: 'Shoulder Abduction',
      recoveryGoal: ep.recoveryGoal || 'Pain-Free Shoulder Abduction ≥ 160° & Scapular Stability'
    };
  }
  // Wrist / Hand / Carpal Tunnel
  if (diag.includes('wrist') || diag.includes('carpal') || diag.includes('hand')) {
    return {
      targetExercise: 'Wrist Flexion Extension ROM',
      recoveryGoal: ep.recoveryGoal || 'Wrist Flexion/Extension ROM ≥ 60° & Grip Strength Restoration'
    };
  }
  // Elbow / Forearm
  if (diag.includes('elbow')) {
    return {
      targetExercise: 'Elbow Flexion Extension Post-Fracture',
      recoveryGoal: ep.recoveryGoal || 'Elbow Flexion 0°–130° Post-Fracture & Forearm Pronosupination'
    };
  }
  // Cardiopulmonary / Breathing / COPD
  if (diag.includes('breath') || diag.includes('copd') || diag.includes('pulmonary') || diag.includes('respiratory')) {
    return {
      targetExercise: 'Diaphragmatic Breathing',
      recoveryGoal: ep.recoveryGoal || 'Diaphragmatic Expansion & Vital Capacity Enhancement'
    };
  }

  return {
    targetExercise: 'Shoulder Abduction',
    recoveryGoal: ep.recoveryGoal || 'Restoration of Full Functional Range of Motion (ROM)'
  };
};

// ─── Design Tokens ─────────────────────────────────────────────────────────
const PRIMARY = '#0f172a';
const SECONDARY = '#1e293b';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';
const CYAN = '#06b6d4';

// ─── Real Human Physiotherapist Trainer Video Library ───────────────────────
export interface HumanTrainerVideoInfo {
  title: string;
  trainer: string;
  role: string;
  src: string;
}

export const REAL_HUMAN_TRAINER_VIDEOS: Record<string, HumanTrainerVideoInfo> = {
  'Shoulder Abduction': {
    title: 'Shoulder Abduction & Coronal Elevation',
    trainer: 'Dr. Sarah Jenkins, DPT',
    role: 'Senior Clinical Physiotherapist',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  'Shoulder Flexion': {
    title: 'Sagittal Plane Shoulder Forward Flexion',
    trainer: 'Marcus Vance, PT, OCS',
    role: 'Orthopedic Rehabilitation Specialist',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  'Elbow Flexion': {
    title: 'Biceps Brachii & Elbow Flexion Arc',
    trainer: 'Dr. Sarah Jenkins, DPT',
    role: 'Senior Clinical Physiotherapist',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
  'Wall Climbing': {
    title: 'Post-Mastectomy Wall-Crawl & Shoulder Reach',
    trainer: 'Dr. Elena Rostova, DPT',
    role: 'Oncological Physiotherapy Lead',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  },
  'Lymphoedema Muscle Pump': {
    title: 'Lymphoedema Drainage & Muscle Pump',
    trainer: 'Dr. Elena Rostova, DPT',
    role: 'Oncological Physiotherapy Lead',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  },
  'Cervical Range of Motion': {
    title: 'Cervical Spine Flexion, Extension & Rotation',
    trainer: 'David Okafor, PT, MSc',
    role: 'Spine & Posture Consultant',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  },
  'Knee Extension Quad Set': {
    title: 'Isometric Quadriceps Setting & Knee Extension',
    trainer: 'Marcus Vance, PT, OCS',
    role: 'Orthopedic Rehabilitation Specialist',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  'Scapular Retraction': {
    title: 'Scapular Retraction & Posture Alignment',
    trainer: 'David Okafor, PT, MSc',
    role: 'Spine & Posture Consultant',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  },
};

export type DemoAvatarMode = 'HUMAN_VIDEO' | 'HUMAN_FRONT' | 'HUMAN_BACK' | 'SKELETON';

// ─── Sub-Tab Panel Helper ──────────────────────────────────────────────────
function TabPanel({ children, value, index }: any) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ─── KPI Card Component ────────────────────────────────────────────────────
const KPICard = ({ title, value, sub, icon, color }: any) => (
  <Card sx={{
    background: `linear-gradient(135deg, ${color}ee, ${color}aa)`,
    color: '#fff', borderRadius: 3, boxShadow: `0 8px 32px ${color}33`,
    position: 'relative', overflow: 'hidden',
  }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>{title}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{value}</Typography>
          {sub && <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>{sub}</Typography>}
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

const StatusChip = ({ label }: { label: string }) => {
  let color: 'success' | 'info' | 'warning' | 'error' | 'default' = 'default';
  const l = label?.toUpperCase() || '';
  if (['ACTIVE', 'SUCCESS', 'NORMAL', 'COMPLETED', 'FULLY_COMPETENT', 'BUNDLE_PAID', 'GOOD_FORM'].some(k => l.includes(k))) color = 'success';
  if (['URGENT', 'WARNING', 'COMPETENT_WITH_ASSISTANCE', 'SCHEDULED', 'INPATIENT_BEDSIDE', 'RAISING', 'HOLDING'].some(k => l.includes(k))) color = 'warning';
  if (['HIGH', 'HIGH_RISK', 'CRITICAL', 'REQUIRES_SUPERVISION', 'STAT', 'IMPROVE_FORM'].some(k => l.includes(k))) color = 'error';
  if (['PHYSIOTHERAPY', 'OUTPATIENT_GYM', 'PAY_AS_YOU_GO', 'LOWERING', 'READY'].some(k => l.includes(k))) color = 'info';

  return <Chip label={label?.replace('_', ' ')} size="small" color={color} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />;
};

// ─── ANATOMICAL BODY MAP REGIONS WITH CLINICAL PRESETS ───────────────────────
export interface BodyRegionPreset {
  id: string;
  label: string;
  icon: string;
  protocolKey: string;
  category: string;
  diagnosis: string;
  recoveryGoal: string;
  targetRom: string;
  painVasScore: number;
  mrcGrade: string;
  modalities: string;
  soapSubjective: string;
  soapObjective: string;
  soapAssessment: string;
  soapPlan: string;
}

const BODY_REGIONS: BodyRegionPreset[] = [
  {
    id: 'cervical',
    label: 'Cervical Spine / Neck',
    icon: '🧠',
    protocolKey: 'Cervical Spine ROM',
    category: 'Spine, Neck & Posture',
    diagnosis: 'Cervical Spondylotic Myelopathy & Neck Stiffness',
    recoveryGoal: 'Cervical Rotation ≥ 70° Bilaterally & Radicular Decompression',
    targetRom: 'Rotation ≥ 70° (Normal 80°–90°)',
    painVasScore: 7,
    mrcGrade: 'Grade 4/5 (Cervical Extensors & Rotators)',
    modalities: 'Intermittent Cervical Traction (12kg), TENS (20 mins), Moist Heat Pack',
    soapSubjective: 'Patient reports radiating neck stiffness, occipital headache, and intermittent numbness/tingling radiating into the right trapezius and shoulder girdle (VAS 7/10). Aggravated by prolonged desk work.',
    soapObjective: 'Cervical Active ROM: Right rotation 45°, Left rotation 50° (Target ≥ 70°). Spurling test positive on right. Paraspinal cervical muscular tenderness & spasm noted.',
    soapAssessment: 'Cervical radiculopathy secondary to degenerative cervical spondylosis (C5-C7) with myofascial trigger points.',
    soapPlan: '8–10 Session Package: Intermittent Cervical Mechanical Traction (12kg, 15 mins), TENS Electrotherapy, Moist Heat, Isometric Cervical Retraction & Rotation Biofeedback.'
  },
  {
    id: 'r_shoulder',
    label: 'Right Shoulder / Rotator Cuff',
    icon: '🦾',
    protocolKey: 'Shoulder Abduction',
    category: 'Orthopedic & Post-Surgical',
    diagnosis: 'Supraspinatus Tendinopathy & Subacromial Impingement',
    recoveryGoal: 'Active Shoulder Abduction ≥ 160° & Scapular Dynamic Stability',
    targetRom: 'Abduction 0° to 180° (Functional: 120°–150°)',
    painVasScore: 6,
    mrcGrade: 'Grade 3+/5 (Supraspinatus & Deltoid)',
    modalities: 'Therapeutic Ultrasound (1.5 W/cm²), Cryotherapy Cold Pack, TENS',
    soapSubjective: 'Complains of painful arc during overhead reach (60°–120°), night pain when lying on right side, and difficulty combing hair or dressing.',
    soapObjective: 'Active Right Shoulder Abduction: 85° (Target ≥ 160°). Neer & Hawkins-Kennedy impingement signs positive. Deltoid strength 3+/5. Scapular dyskinesis noted.',
    soapAssessment: 'Subacromial impingement syndrome with supraspinatus partial thickness tendinopathy.',
    soapPlan: '10-Session Rehab: Therapeutic Ultrasound, Cryotherapy, Scapular Retraction, Pendulum exercises, and Wall-Climb Abduction Biofeedback.'
  },
  {
    id: 'l_shoulder',
    label: 'Left Shoulder / Rotator Cuff',
    icon: '🦾',
    protocolKey: 'Shoulder Abduction',
    category: 'Orthopedic & Post-Surgical',
    diagnosis: 'Adhesive Capsulitis (Frozen Shoulder - Freezing Stage)',
    recoveryGoal: 'Capsular Decompression & Glenohumeral Abduction ≥ 150°',
    targetRom: 'Abduction ≥ 150°, External Rotation ≥ 45°',
    painVasScore: 7,
    mrcGrade: 'Grade 4-/5 (Rotator Cuff)',
    modalities: 'Shortwave Diathermy (SWD), TENS, Moist Heat Pack, PNF Mobilization',
    soapSubjective: 'Severe left shoulder stiffness and progressive loss of range in all planes for 3 months. Constant dull ache at rest, worsening sharply with sudden movement.',
    soapObjective: 'Glenohumeral Abduction: 60°, External Rotation: 20°. Hard capsular end-feel. Secondary trapezius shrugging compensation observed.',
    soapAssessment: 'Stage II Adhesive Capsulitis with severe glenohumeral capsular contracture.',
    soapPlan: '12-Session Package: SWD Deep Heat, Maitland Grade II/III joint mobilization, PNF stretching, and active-assisted coronal abduction exercises.'
  },
  {
    id: 'lumbar',
    label: 'Lumbar Spine (L4-L5 Spondylosis)',
    icon: '🦴',
    protocolKey: 'Lumbar Spine Core Tilt',
    category: 'Spine, Neck & Posture',
    diagnosis: 'Lumbar Spondylosis with L4-L5 Nerve Root Radiculopathy (Sciatica)',
    recoveryGoal: 'L4-L5 Decompression, Pelvic Core Stability & Pain VAS < 3/10',
    targetRom: 'Lumbar Flexion ≥ 60°, SLR ≥ 70° Bilaterally',
    painVasScore: 8,
    mrcGrade: 'Grade 4/5 (Extensor Hallucis Longus & Dorsiflexors)',
    modalities: 'Lumbar Mechanical Traction (35kg), Shortwave Diathermy (SWD), TENS',
    soapSubjective: 'Sharp shooting lower back pain radiating down the left posterior thigh and lateral calf (VAS 8/10). Aggravated by sitting >15 mins and forward bending.',
    soapObjective: 'Lumbar flexion restricted to 30°. Straight Leg Raise (SLR) positive on left at 40°. Paraspinal spasm in lumbar erector spinae. Sensation diminished along L5 dermatome.',
    soapAssessment: 'L4-L5 intervertebral disc degeneration with left L5 nerve root impingement and secondary muscular guarding.',
    soapPlan: '8–10 Session Package: Lumbar mechanical decompression traction, SWD deep diathermy, pelvic posterior tilts, core bridging, and nerve flossing.'
  },
  {
    id: 'r_knee',
    label: 'Right Knee (TKA / ACL)',
    icon: '🦵',
    protocolKey: 'Knee Flexion Extension',
    category: 'Orthopedic & Post-Surgical',
    diagnosis: 'Post-OP Total Knee Arthroplasty (Right)',
    recoveryGoal: 'Active Knee Flexion ≥ 110°, Terminal Extension 0° & Independent Ambulation',
    targetRom: 'Flexion 0° to 120° (Post-Op Target: ≥ 110°)',
    painVasScore: 6,
    mrcGrade: 'Grade 3+/5 (Quadriceps Femoris)',
    modalities: 'CPM Machine Flexion (0°-90°), Cryo-Compression Pack, TENS (20 mins)',
    soapSubjective: 'Patient reports moderate right knee stiffness and level 6/10 post-op surgical site soreness during weight bearing and transfers.',
    soapObjective: 'Right knee Active ROM: 0° extension to 85° flexion (Target ≥ 110°). Quadriceps extensor lag 10°. Mild suprapatellar localized effusion.',
    soapAssessment: 'Post-op Day 5 Total Knee Arthroplasty progressing steadily. Extension intact; active flexion lagging target by 25 degrees.',
    soapPlan: '10-Session Post-Op Package: Isometric quad sets, heel slides, Continuous Passive Motion (CPM) 30 mins, and walker gait re-education.'
  },
  {
    id: 'l_knee',
    label: 'Left Knee (Joint Flexion)',
    icon: '🦵',
    protocolKey: 'Knee Flexion Extension',
    category: 'Orthopedic & Post-Surgical',
    diagnosis: 'Grade II Medial Meniscal Tear & Patellofemoral Pain',
    recoveryGoal: 'Full Pain-Free Knee Flexion ≥ 130° & VMO Quadriceps Strengthening',
    targetRom: 'Flexion ≥ 130°, Extension 0°',
    painVasScore: 5,
    mrcGrade: 'Grade 4-/5 (Vastus Medialis Oblique - VMO)',
    modalities: 'Therapeutic Ultrasound (1 MHz), NMES Muscle Stimulator, Cold Pack',
    soapSubjective: 'Reports sharp joint line catching on stair climbing, clicking sensation during deep knee bend, and stiffness following prolonged sitting.',
    soapObjective: 'Left Knee Active Flexion: 95°, Extension: 0°. McMurray test positive for medial joint line tenderness. VMO atrophy measured 1.5cm difference.',
    soapAssessment: 'Medial meniscal derangement with secondary patellofemoral maltracking and VMO weakness.',
    soapPlan: '8-Session Package: Therapeutic ultrasound, NMES electrical muscle stimulation on VMO, closed-kinetic chain mini squats, and hamstring stretching.'
  },
  {
    id: 'hemiparetic_arm',
    label: 'Left Upper Extremity (Post-Stroke)',
    icon: '💪',
    protocolKey: 'Hemiparetic Arm Elevation',
    category: 'Neurological & Balance',
    diagnosis: 'Ischemic Stroke Recovery (Left Spastic Hemiparesis)',
    recoveryGoal: 'Hemiparetic Upper Limb Elevation ≥ 120° & Symmetrical Weight Transfer',
    targetRom: 'Active Elevation ≥ 120°',
    painVasScore: 4,
    mrcGrade: 'Grade 3/5 (Left Upper Limb MRC Grade)',
    modalities: 'Functional Electrical Stimulation (FES), Mirror Box Therapy, Bobath Mat',
    soapSubjective: 'Patient states left arm feels heavy with abnormal flexor synergy pattern during effort. Desires to regain hand-to-mouth function and self-feeding.',
    soapObjective: 'Left Upper Limb MRC Grade 3/5. Modified Ashworth Scale Grade 1+ in elbow flexors. Shoulder subluxation 1 finger breadth. Berg Balance Score: 32/56.',
    soapAssessment: 'Subacute ischemic stroke hemiparesis with developing flexor spasticity, scapular retraction deficit, and trunk asymmetry.',
    soapPlan: '12-Session Package: Bobath neuro-developmental facilitation, Functional Electrical Stimulation (FES), Mirror kinematic visual biofeedback, and cadence gait re-education.'
  },
  {
    id: 'ankle',
    label: 'Ankle & Achilles Tendon',
    icon: '🦶',
    protocolKey: 'Ankle Dorsiflexion',
    category: 'Orthopedic & Post-Surgical',
    diagnosis: 'Achilles Tendinopathy & Post-Immobilization Ankle Equinus',
    recoveryGoal: 'Heel-Strike Re-education, Talocrural Glide & Dorsiflexion ≥ 20°',
    targetRom: 'Dorsiflexion ≥ 20°, Plantarflexion ≥ 45°',
    painVasScore: 6,
    mrcGrade: 'Grade 4/5 (Gastrocnemius & Tibialis Anterior)',
    modalities: 'Therapeutic Ultrasound (3 MHz), Cryotherapy Cold Pack, Balance Wobble Board',
    soapSubjective: 'Morning stiffness in posterior heel, sharp pain during push-off phase of walking, and difficulty descending stairs.',
    soapObjective: 'Active Ankle Dorsiflexion: 5° with knee extended (Target ≥ 20°). Gastrocnemius-soleus tightness. Palpable tendon thickening and localized nodule.',
    soapAssessment: 'Chronic insertional Achilles tendinopathy with restricted talocrural joint arthrokinematics.',
    soapPlan: '6–8 Session Package: Eccentric Alfredson loading protocol, deep transverse friction massage, therapeutic ultrasound, and dynamic wobble board balance training.'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN REHABILITATION & PHYSIOTHERAPY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const RehabilitationPhysio = () => {
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [careSettingFilter, setCareSettingFilter] = useState<'ALL' | 'OUTPATIENT_GYM' | 'INPATIENT_BEDSIDE'>('ALL');

  // ─── Data States ──────────────────────────────────────────────────────────
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [homeVisits, setHomeVisits] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  // ─── Dialog States ────────────────────────────────────────────────────────
  const [soapModalOpen, setSoapModalOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [hepModalOpen, setHepModalOpen] = useState(false);
  const [aiReportModalOpen, setAiReportModalOpen] = useState(false);
  const [attachingAiReport, setAttachingAiReport] = useState(false);

  // ─── Equipment & Modalities Registry States ──────────────────────────────
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState<string>('ALL');
  const [registerEquipmentModalOpen, setRegisterEquipmentModalOpen] = useState(false);
  const [selectedEquipmentForDetail, setSelectedEquipmentForDetail] = useState<any | null>(null);
  const [assignEquipmentModalOpen, setAssignEquipmentModalOpen] = useState(false);
  const [equipmentAssignTarget, setEquipmentAssignTarget] = useState<any | null>(null);
  const [equipmentAssignPatient, setEquipmentAssignPatient] = useState('');
  const [newEquipmentForm, setNewEquipmentForm] = useState({
    name: '',
    code: '',
    category: 'ELECTROTHERAPY',
    location: 'Physio Gym 3A',
    manufacturer: '',
    serialNumber: '',
    channels: '',
    powerRating: '',
    notes: ''
  });

  // ─── Selected Item States ────────────────────────────────────────────────
  const [selectedEpisode, setSelectedEpisode] = useState<any | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [selectedBodyRegion, setSelectedBodyRegion] = useState<string>('cervical');

  // ─── KINEMATIC BIOFEEDBACK MIRROR COMPUTER VISION ENGINE STATES ──────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const threeSceneRef = useRef<Rehabilitation3DScene | null>(null);
  const pipCanvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const pipThreeSceneRef = useRef<Rehabilitation3DScene | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stepRef = useRef(0);
  const repCountRef = useRef(0);
  const lastRepStateRef = useRef(false);
  // ── Real CV pose detection refs ──
  const detectorRef = useRef<any>(null);
  const mediapipePoseRef = useRef<any>(null);
  const latestMediaPipeLandmarksRef = useRef<any[] | null>(null);
  const activeLoopRef = useRef(false);
  const animIdRef = useRef<number>(0);
  const prevAngleRef = useRef(0);

  // ── Temporal Movement Analysis & Multi-Stage State Machine Refs ──
  const currentRepStatsRef = useRef<{
    peakLeft: number;
    peakRight: number;
    activeSymmetries: number[];
    activeTorsos: number[];
    holdStartTime: number | null;
    holdDurationSec: number;
    sustainedLeanFrames: number;
    sustainedAsymFrames: number;
    hadSustainedLean: boolean;
    hadSustainedAsym: boolean;
  }>({
    peakLeft: 0,
    peakRight: 0,
    activeSymmetries: [],
    activeTorsos: [],
    holdStartTime: null,
    holdDurationSec: 0,
    sustainedLeanFrames: 0,
    sustainedAsymFrames: 0,
    hadSustainedLean: false,
    hadSustainedAsym: false,
  });

  // Moving average smoothing buffers (5-frame window to eliminate landmark flutter)
  const lAngleHistRef = useRef<number[]>([]);
  const rAngleHistRef = useRef<number[]>([]);
  const torsoHistRef = useRef<number[]>([]);
  const symHistRef = useRef<number[]>([]);

  // Speech Coaching Audio Debounce
  const lastSpokenTimeRef = useRef<number>(0);
  const lastSpokenTextRef = useRef<string>('');

  const [poseModelLoading, setPoseModelLoading] = useState(false);
  const [poseModelName, setPoseModelName] = useState('MediaPipe Pose Landmarker (33 Full-Body)');
  const [mirrorActive, setMirrorActive] = useState(true);
  const [cameraMode, setCameraMode] = useState<'WEBCAM' | 'SIMULATION'>('SIMULATION');
  const [demoAvatarMode, setDemoAvatarMode] = useState<DemoAvatarMode>('HUMAN_VIDEO');
  const [customDemoVideoUrl, setCustomDemoVideoUrl] = useState<string | null>(null);
  const [customDemoVideoName, setCustomDemoVideoName] = useState<string>('');
  const demoVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileVideoInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedExercise, setSelectedExercise] = useState('Shoulder Abduction');
  const selectedExerciseRef = useRef('Shoulder Abduction');
  useEffect(() => {
    selectedExerciseRef.current = selectedExercise;
  }, [selectedExercise]);

  // Sync real human video demonstration playback when exercise or mode changes
  useEffect(() => {
    if (demoVideoRef.current && demoAvatarMode === 'HUMAN_VIDEO') {
      const videoSrc = customDemoVideoUrl || REAL_HUMAN_TRAINER_VIDEOS[selectedExercise]?.src || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      if (demoVideoRef.current.src !== videoSrc) {
        demoVideoRef.current.src = videoSrc;
        demoVideoRef.current.load();
      }
      if (mirrorActive) {
        demoVideoRef.current.play().catch(() => {});
      } else {
        demoVideoRef.current.pause();
      }
    }
  }, [selectedExercise, demoAvatarMode, customDemoVideoUrl, mirrorActive]);

  // 5-Stage Movement State: READY -> RAISING -> HOLDING -> LOWERING -> COMPLETED
  const [exerciseStatus, setExerciseStatus] = useState<'READY' | 'RAISING' | 'HOLDING' | 'LOWERING' | 'IMPROVE FORM' | 'COMPLETED'>('READY');
  const exerciseStatusRef = useRef<'READY' | 'RAISING' | 'HOLDING' | 'LOWERING' | 'IMPROVE FORM' | 'COMPLETED'>('READY');
  const [coachingPrompt, setCoachingPrompt] = useState<string>('Ready — Stand tall and begin raising arms');
  const [voiceCoachingEnabled, setVoiceCoachingEnabled] = useState<boolean>(true);
  const [movementScore, setMovementScore] = useState(94);
  const [repCount, setRepCount] = useState(0);
  const [targetReps, setTargetReps] = useState(5);
  const targetRepsRef = useRef<number>(5);
  useEffect(() => { targetRepsRef.current = targetReps; }, [targetReps]);
  const [targetHoldDuration, setTargetHoldDuration] = useState<number>(2.0); // 2.0s hold requirement
  const targetHoldDurationRef = useRef<number>(2.0);
  useEffect(() => { targetHoldDurationRef.current = targetHoldDuration; }, [targetHoldDuration]);
  const [currentHoldSec, setCurrentHoldSec] = useState<number>(0.0);
  const [leftShoulderDeg, setLeftShoulderDeg] = useState(0);
  const [rightShoulderDeg, setRightShoulderDeg] = useState(0);
  const [torsoAlignment, setTorsoAlignment] = useState(100);
  const [symmetryScore, setSymmetryScore] = useState(100);

  const updateExerciseStatus = useCallback((st: 'READY' | 'RAISING' | 'HOLDING' | 'LOWERING' | 'IMPROVE FORM' | 'COMPLETED') => {
    exerciseStatusRef.current = st;
    setExerciseStatus(st);
  }, []);

  // ─── AUDIO & PACING PLAYLIST ENGINE (Multi-Track + Web Audio API) ────────
  type AudioMode = 'ALL' | 'CUSTOM' | 'CHIMES' | 'AMBIENT' | 'METRONOME' | 'MUTED';
  const [audioMode, setAudioMode] = useState<AudioMode>('ALL');
  const [audioVolume, setAudioVolume] = useState<number>(0.4);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [chimesEnabled, setChimesEnabled] = useState<boolean>(false); // Stretch chimes muted by default
  const [audioPulseActive, setAudioPulseActive] = useState<boolean>(false);

  // Multi-Track Playlist State
  interface PlaylistItem {
    id: string;
    name: string;
    url: string;
  }
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [currentTrackIdx, setCurrentTrackIdx] = useState<number>(0);
  const [playbackOrder, setPlaybackOrder] = useState<'SEQUENTIAL' | 'SHUFFLE'>('SEQUENTIAL');
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState<boolean>(false);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const customAudioInputRef = useRef<HTMLInputElement | null>(null);

  // ─── GROUPED EXERCISE ROUTINES & AUTO-SWITCH STATE ───────────────────────
  const [routineMode, setRoutineMode] = useState<boolean>(false);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('upper-limb-rotator');
  const [routineExerciseIdx, setRoutineExerciseIdx] = useState<number>(0);
  const [routineSecondsLeft, setRoutineSecondsLeft] = useState<number>(45);
  const [routineTransitionBanner, setRoutineTransitionBanner] = useState<string | null>(null);

  // ─── FULLSCREEN SLIDE SHOW PRESENTATION STATE ─────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const mirrorContainerRef = useRef<HTMLDivElement | null>(null);

  // ─── PATIENT BINDING STATE ───────────────────────────────────────────────
  const [boundEpisodeId, setBoundEpisodeId] = useState<string>('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<{ oscs: OscillatorNode[]; gain: GainNode; filter: BiquadFilterNode } | null>(null);
  const lastChimeTimeRef = useRef<{ peak: number; rep: number; metro: number }>({ peak: 0, rep: 0, metro: 0 });

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // ── Handle Multi-Track Music Upload & Playlist Management ────────────────
  const handleMultipleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTracks: PlaylistItem[] = Array.from(files).map((file, i) => ({
      id: `track-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      url: URL.createObjectURL(file)
    }));

    setPlaylist(prev => {
      const updated = [...prev, ...newTracks];
      return updated;
    });

    if (playlist.length === 0 && newTracks.length > 0) {
      setCurrentTrackIdx(0);
    }
    setAudioMode('CUSTOM');
    setIsAudioMuted(false);
    enqueueSnackbar(`🎵 Added ${newTracks.length} song${newTracks.length > 1 ? 's' : ''} to playlist!`, { variant: 'success' });
  };

  const handleNextTrack = useCallback(() => {
    if (playlist.length <= 1) return;
    if (playbackOrder === 'SHUFFLE') {
      let nextIdx = Math.floor(Math.random() * playlist.length);
      if (nextIdx === currentTrackIdx) {
        nextIdx = (currentTrackIdx + 1) % playlist.length;
      }
      setCurrentTrackIdx(nextIdx);
    } else {
      setCurrentTrackIdx(prev => (prev + 1) % playlist.length);
    }
  }, [playlist.length, playbackOrder, currentTrackIdx]);

  const handlePrevTrack = useCallback(() => {
    if (playlist.length <= 1) return;
    setCurrentTrackIdx(prev => (prev - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  const handleRemoveTrack = (id: string) => {
    setPlaylist(prev => {
      const trackToRemove = prev.find(t => t.id === id);
      if (trackToRemove) {
        URL.revokeObjectURL(trackToRemove.url);
      }
      const filtered = prev.filter(t => t.id !== id);
      if (currentTrackIdx >= filtered.length) {
        setCurrentTrackIdx(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  };

  const handleClearPlaylist = () => {
    playlist.forEach(t => URL.revokeObjectURL(t.url));
    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current.src = '';
    }
    setPlaylist([]);
    setCurrentTrackIdx(0);
    if (audioMode === 'CUSTOM') {
      setAudioMode('ALL');
    }
    enqueueSnackbar('Playlist cleared', { variant: 'info' });
  };

  const playBiofeedbackChime = useCallback((type: 'PEAK_ROM' | 'REP_DONE' | 'SET_DONE' | 'METRONOME') => {
    if (isAudioMuted || audioMode === 'MUTED' || audioVolume <= 0) return;
    if (type === 'METRONOME') {
      if (audioMode !== 'METRONOME') return; // ONLY play metronome if user explicitly chose 60 BPM Pacing Metronome
    } else {
      if (!chimesEnabled) return; // Muted stretch and rep chimes when disabled
      if (audioMode !== 'ALL' && audioMode !== 'CHIMES' && audioMode !== 'CUSTOM') return;
    }

    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const effectiveVol = isAudioMuted ? 0 : audioVolume;
      if (effectiveVol <= 0) return;

      setAudioPulseActive(true);
      setTimeout(() => setAudioPulseActive(false), 240);

      if (type === 'PEAK_ROM') {
        const notes = [659.25, 987.77];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0, now + idx * 0.07);
          gain.gain.linearRampToValueAtTime(0.24 * effectiveVol, now + idx * 0.07 + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.55);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.6);
        });
      } else if (type === 'REP_DONE') {
        const freqs = [523.25, 783.99, 1046.50];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.05);
          gain.gain.setValueAtTime(0, now + i * 0.05);
          gain.gain.linearRampToValueAtTime(0.28 * effectiveVol, now + i * 0.05 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.65);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.7);
        });
      } else if (type === 'SET_DONE') {
        const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.08);
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.32 * effectiveVol, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.85);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.9);
        });
      } else if (type === 'METRONOME') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        gain.gain.setValueAtTime(0.16 * effectiveVol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch {}
  }, [audioMode, audioVolume, isAudioMuted, chimesEnabled, getAudioContext]);

  // ── Real-Time Physiotherapist Voice Coaching Engine ──────────────────────
  const speakCoaching = useCallback((text: string) => {
    if (!voiceCoachingEnabled || isAudioMuted || audioMode === 'MUTED' || audioVolume <= 0) return;
    const now = Date.now();
    if (now - lastSpokenTimeRef.current < 2800 && lastSpokenTextRef.current === text) return;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        utter.pitch = 1.05;
        window.speechSynthesis.speak(utter);
        lastSpokenTimeRef.current = now;
        lastSpokenTextRef.current = text;
      } catch {}
    }
  }, [voiceCoachingEnabled, isAudioMuted, audioMode, audioVolume]);

  // ── Ambient Drone Generator ──────────────────────────────────────────────
  const startAmbientSound = useCallback(() => {
    if (isAudioMuted || audioMode === 'MUTED' || audioMode !== 'AMBIENT' || audioVolume <= 0) return;
    try {
      const ctx = getAudioContext();
      if (ambientNodesRef.current) return;

      const masterGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, ctx.currentTime);

      const effectiveVol = isAudioMuted ? 0 : audioVolume * 0.12;
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(effectiveVol, ctx.currentTime + 1.2);

      const freqs = [87.31, 130.81, 220.00, 261.63];
      const oscs = freqs.map((freq, idx) => {
        const osc = ctx.createOscillator();
        const subGain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq + (idx === 0 ? 0.35 : 0), ctx.currentTime);
        subGain.gain.setValueAtTime(0.25, ctx.currentTime);
        osc.connect(subGain);
        subGain.connect(filter);
        osc.start();
        return osc;
      });

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      ambientNodesRef.current = { oscs, gain: masterGain, filter };
    } catch {}
  }, [audioMode, audioVolume, isAudioMuted, getAudioContext]);

  const stopAmbientSound = useCallback(() => {
    if (!ambientNodesRef.current) return;
    try {
      const { oscs, gain } = ambientNodesRef.current;
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== 'closed') {
        gain.gain.setValueAtTime(0, ctx.currentTime);
        oscs.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
      }
    } catch {}
    ambientNodesRef.current = null;
  }, []);

  // Sync ambient sound with mirrorActive & audioMode
  useEffect(() => {
    if (mirrorActive && !isAudioMuted && audioMode === 'AMBIENT' && audioVolume > 0) {
      startAmbientSound();
    } else {
      stopAmbientSound();
    }
    return () => { stopAmbientSound(); };
  }, [mirrorActive, audioMode, isAudioMuted, audioVolume, startAmbientSound, stopAmbientSound]);

  // Sync current playlist track playback with mirrorActive & audio controls
  useEffect(() => {
    const audioEl = customAudioRef.current;
    if (!audioEl) return;

    const currentTrack = playlist[currentTrackIdx];
    if (currentTrack && audioEl.src !== currentTrack.url) {
      audioEl.src = currentTrack.url;
    }

    audioEl.volume = isAudioMuted || audioMode === 'MUTED' ? 0 : Math.min(1, Math.max(0, audioVolume));

    if (
      mirrorActive &&
      !isAudioMuted &&
      playlist.length > 0 &&
      (audioMode === 'CUSTOM' || audioMode === 'ALL')
    ) {
      audioEl.play().catch(() => {});
    } else {
      audioEl.pause();
    }
  }, [mirrorActive, isAudioMuted, audioMode, audioVolume, playlist, currentTrackIdx]);

  // ── Routine Auto-Cycle Timer Effect ──────────────────────────────────────
  useEffect(() => {
    if (!routineMode || !mirrorActive) return;

    const activeRoutine = PHYSIO_ROUTINES.find(r => r.id === selectedRoutineId) || PHYSIO_ROUTINES[0];

    const timer = setInterval(() => {
      setRoutineSecondsLeft(prev => {
        if (prev <= 1) {
          // Advance to next exercise in routine
          const nextIdx = (routineExerciseIdx + 1) % activeRoutine.exercises.length;
          const nextExerciseName = activeRoutine.exercises[nextIdx];
          setRoutineExerciseIdx(nextIdx);
          setSelectedExercise(nextExerciseName);
          selectedExerciseRef.current = nextExerciseName;
          setRepCount(0);
          repCountRef.current = 0;
          setRecordedReps([]);

          setRoutineTransitionBanner(`✨ Transitioning to ${nextExerciseName} (${nextIdx + 1} of ${activeRoutine.exercises.length})`);
          setTimeout(() => setRoutineTransitionBanner(null), 3500);

          return activeRoutine.defaultDurationSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [routineMode, mirrorActive, selectedRoutineId, routineExerciseIdx]);

  // ── Fullscreen Toggle Handlers ───────────────────────────────────────────
  const toggleFullscreenMode = () => {
    if (!document.fullscreenElement) {
      mirrorContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // ── Parse Query Parameters for Patient Binding (e.g. ?episodeId=REH-2026-001)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const epId = params.get('episodeId');
    if (epId) {
      setBoundEpisodeId(epId);
      const found = episodes.find(e => e.id === epId);
      if (found) setSelectedEpisode(found);
    }
  }, [location.search, episodes]);

  // ─── LIVE REPETITION AUDIT LOG STATE ─────────────────────────────────────
  interface RepetitionRecord {
    repNumber: number;
    time: string;
    leftJointAngle: number;
    rightJointAngle: number;
    symmetryScore: number;
    torsoAlignment: number;
    holdDurationSec?: number;
    movementScore: number;
    movementState: 'COMPLETED' | 'IMPROVE_FORM';
    formQuality: string;
    source?: 'LIVE_CAMERA' | 'MANUAL_ENTRY';
    notes?: string;
  }

  const [recordedReps, setRecordedReps] = useState<RepetitionRecord[]>([]);

  // ─── MANUAL KINEMATIC MOVEMENT LOGGER STATE ──────────────────────────────
  const [manualRepModalOpen, setManualRepModalOpen] = useState(false);
  const [manualRepForm, setManualRepForm] = useState({
    leftJointAngle: 110,
    rightJointAngle: 110,
    movementScore: 92,
    symmetryScore: 96,
    torsoAlignment: 92,
    holdDurationSec: 2,
    movementState: 'COMPLETED' as 'COMPLETED' | 'IMPROVE_FORM',
    formQuality: 'Optimal Form',
    therapistNotes: 'Guided movement performed with good neuromuscular recruitment.'
  });

  const handleSaveManualRep = (batchCount: number = 1) => {
    const nowTime = new Date().toTimeString().split(' ')[0];
    const newRecords: RepetitionRecord[] = [];
    const currentLen = recordedReps.length;
    for (let i = 0; i < batchCount; i++) {
      const repNum = currentLen + i + 1;
      newRecords.push({
        repNumber: repNum,
        time: nowTime,
        leftJointAngle: Number(manualRepForm.leftJointAngle),
        rightJointAngle: Number(manualRepForm.rightJointAngle),
        symmetryScore: Number(manualRepForm.symmetryScore),
        torsoAlignment: Number(manualRepForm.torsoAlignment),
        holdDurationSec: Number(manualRepForm.holdDurationSec),
        movementScore: Number(manualRepForm.movementScore),
        movementState: manualRepForm.movementState,
        formQuality: manualRepForm.formQuality,
        source: 'MANUAL_ENTRY',
        notes: manualRepForm.therapistNotes || undefined
      });
    }
    setRecordedReps(prev => [...prev, ...newRecords]);
    const newTotal = currentLen + batchCount;
    setRepCount(newTotal);
    repCountRef.current = newTotal;
    setManualRepModalOpen(false);
    enqueueSnackbar(`✅ Logged ${batchCount} manual movement repetition(s) into Patient Kinematic Audit!`, { variant: 'success' });
  };

  // ─── SOAP & Body Map Form State ──────────────────────────────────────────
  const [soapForm, setSoapForm] = useState({
    patientName: 'Jane Doe',
    referredFrom: 'Orthopaedic Surgery',
    referredBy: 'Dr. John Smith (Orthopaedic Surgeon)',
    diagnosis: 'Post-OP Total Knee Arthroplasty (Right)',
    urgency: 'HIGH',
    careSetting: 'INPATIENT_BEDSIDE',
    wardLocation: 'Ward 3B (Bed 12)',
    packageTotal: 10,
    paymentStatus: 'BUNDLE_PAID (10-Session Package)',
    soapSubjective: 'Patient reports moderate right knee stiffness and level 6/10 post-op pain during weight bearing.',
    soapObjective: 'Right knee Active ROM: 0° extension to 85° flexion. Quad strength 3+/5. Mild localized effusion.',
    soapAssessment: 'Post-op Day 5 TKA showing steady recovery. Flexion lagging target by 5 degrees.',
    soapPlan: '10-Session post-op package: Quad sets, heel slides, CPM machine, and gait training with walker.',
    painVasScore: 6,
    barthelIndexScore: 65,
    bergBalanceScore: 38,
    rehabProgram: 'KNEE_REHAB_POST_OP',
    selectedBodyPins: ['Right Knee (Anterior)', 'Right Thigh (Quadriceps)'],
  });

  // ─── Daily Session Form State ────────────────────────────────────────────
  const [sessionForm, setSessionForm] = useState({
    modalities: 'TENS Electrotherapy (20 mins), Cryotherapy Cold Pack (15 mins)',
    exercises: 'Quad sets (3x10), Heel slides (3x12), CPM Machine Flexion 0-85° (30 mins)',
    prePainScore: 6,
    postPainScore: 4,
    patientResponse: 'Tolerated modalities well. Pain score decreased from 6 to 4 post-session.',
  });

  // ─── ELECTRONIC REFERRALS & EXTERNAL INTAKE STATE ────────────────────────
  const [referrals, setReferrals] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [externalIntakeModalOpen, setExternalIntakeModalOpen] = useState(false);

  const [referralForm, setReferralForm] = useState({
    patientName: 'Mrs. Folashade Adeleke',
    phone: '+2348031234567',
    referredFrom: 'Female Surgical Ward (Bed 08)',
    referredBy: 'Dr. A. B. Balogun (Consultant Orthopaedic Surgeon)',
    diagnosis: 'Post-ORIF Femoral Fracture (Day 3 Post-Op)',
    priority: 'URGENT',
    careSetting: 'INPATIENT_BEDSIDE',
    wardLocation: 'Female Surgical Ward (Bed 08)',
    recommendedPackage: 'Post-Op Fracture Mobilization (10 Sessions)',
    packageTotal: 10,
    clinicalNotes: 'Patient requires bedside passive-to-active assisted knee/hip mobilization and tilt-table gradual weight bearing.'
  });

  const [externalIntakeForm, setExternalIntakeForm] = useState({
    clientName: 'Chief Oladipo Benson',
    age: 54,
    gender: 'MALE',
    phone: '+2348033445566',
    email: 'oladipo.benson@gmail.com',
    intakeType: 'DIRECT_ACCESS_WALKIN', // DIRECT_ACCESS_WALKIN | EXTERNAL_HOSPITAL_REFERRAL
    primaryComplaint: 'Chronic Rotator Cuff Tendinopathy & Subacromial Impingement (Left Shoulder)',
    externalHospitalName: 'Lagos Island General Hospital',
    externalDoctorName: 'Dr. T. A. Sanusi (Orthopaedic Registrar)',
    externalReferralDoc: 'https://smarthospital.ng/docs/external-referral-benson.pdf',
    packageType: 'Shoulder Rotator Cuff Restoration (10 Sessions)',
    packageSessions: 10,
    packageCost: 100000,
    paymentMethod: 'BUNDLE_PAID (Bank Transfer / Card at Reception)'
  });

  // ─── SCHEDULE MANAGEMENT & FILTER STATE ──────────────────────────────────
  const [scheduleBookingModalOpen, setScheduleBookingModalOpen] = useState(false);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [scheduleSettingFilter, setScheduleSettingFilter] = useState<'ALL' | 'INPATIENT_BEDSIDE' | 'OUTPATIENT_GYM' | 'EXTERNAL_CLIENT'>('ALL');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED'>('ALL');

  const [scheduleBookingForm, setScheduleBookingForm] = useState({
    patientName: '',
    episodeId: '',
    phone: '+2348000000000',
    timeSlot: '10:00 AM (Today)',
    patientType: 'OUTPATIENT_GYM',
    location: 'Outpatient Gym (Active Session)',
    therapist: 'Physiotherapist VEGHER',
    treatmentPlan: 'Kinematic Biofeedback Mirror & Exercise Protocol',
    packageTotal: 10
  });

  const handleCreateScheduleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleBookingForm.patientName) {
      enqueueSnackbar('Please select or specify a patient', { variant: 'warning' });
      return;
    }
    try {
      const res = await api.post('/rehabilitation/schedule', scheduleBookingForm);
      enqueueSnackbar(res.data.message || 'New therapy appointment scheduled successfully!', { variant: 'success' });
      setScheduleBookingModalOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to book schedule slot', { variant: 'error' });
    }
  };

  // ─── Master Patient Index (MPI) & Staff Lookup State ──────────────────────
  const [mpiPatients, setMpiPatients] = useState<any[]>([]);
  const [loadingMpi, setLoadingMpi] = useState(false);
  const [hospitalStaffList, setHospitalStaffList] = useState<any[]>([]);

  const fetchMpiPatients = useCallback(async (query?: string) => {
    setLoadingMpi(true);
    try {
      const res = await api.get('/patients/mpi', { params: { query: query ? query.trim() : undefined, limit: 30 } });
      const found = res.data?.data || res.data || [];
      setMpiPatients(found);
    } catch (err) {
      console.error('Failed to search patients MPI:', err);
    } finally {
      setLoadingMpi(false);
    }
  }, []);

  const fetchHospitalStaff = useCallback(async () => {
    try {
      const res = await api.get('/staff');
      const staffList = res.data?.data || res.data || [];
      setHospitalStaffList(staffList);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  }, []);

  const allPhysicianOptions = useMemo(() => {
    const dynamicStaff = (hospitalStaffList || [])
      .filter((s: any) => s.designation?.toLowerCase().includes('doctor') || s.designation?.toLowerCase().includes('consultant') || s.role?.toLowerCase().includes('doctor') || s.department)
      .map((s: any) => ({
        group: s.department ? `🏥 Department of ${s.department}` : '🏥 Hospital Medical Staff',
        label: `Dr. ${s.firstName} ${s.lastName} (${s.designation || s.department || 'Clinician'})`,
        dept: s.department || 'General Medicine'
      }));

    const combined = [...REFERRING_PHYSICIANS_CATALOG, ...dynamicStaff];
    const seen = new Set<string>();
    return combined.filter(item => {
      if (seen.has(item.label)) return false;
      seen.add(item.label);
      return true;
    });
  }, [hospitalStaffList]);

  // ─── Filtered Patients Admitted / Registered to Physiotherapy ────────────
  const physioAdmittedPatients = useMemo(() => {
    const patientMap = new Map<string, any>();

    // 1. From active rehabilitation episodes
    (episodes || []).forEach(ep => {
      const name = (ep.patientName || '').trim();
      const key = name.toLowerCase();
      if (key && !patientMap.has(key)) {
        patientMap.set(key, {
          id: ep.id || ep.patientId,
          patientName: name,
          patientNumber: ep.patientId || ep.id,
          diagnosis: ep.diagnosis,
          referredBy: ep.referredBy,
          referredFrom: ep.referredFrom,
          careSetting: ep.careSetting || (ep.wardLocation?.toLowerCase().includes('ward') ? 'INPATIENT_BEDSIDE' : 'OUTPATIENT_GYM'),
          wardLocation: ep.wardLocation || (ep.careSetting === 'INPATIENT_BEDSIDE' ? 'Inpatient Ward' : 'Outpatient Physio Gym'),
          phone: ep.phone,
          packageTotal: ep.packageTotal || 10,
          sessionsCompleted: ep.sessionsCompleted || 0,
          status: ep.status || 'ACTIVE',
          soapSubjective: ep.soapSubjective,
          soapObjective: ep.soapObjective,
          soapAssessment: ep.soapAssessment,
          soapPlan: ep.soapPlan,
          painVasScore: ep.painVasScore || 5,
          source: 'Admitted Care Episode'
        });
      }
    });

    // 2. From physiotherapy electronic referrals
    (referrals || []).forEach(ref => {
      const name = (ref.patientName || '').trim();
      const key = name.toLowerCase();
      if (key && !patientMap.has(key)) {
        patientMap.set(key, {
          id: ref.id || ref.patientId,
          patientName: name,
          patientNumber: ref.patientId || ref.id,
          diagnosis: ref.diagnosis,
          referredBy: ref.referredBy,
          referredFrom: ref.referredFrom,
          careSetting: ref.careSetting || 'INPATIENT_BEDSIDE',
          wardLocation: ref.wardLocation || ref.referredFrom,
          phone: ref.phone,
          packageTotal: ref.packageTotal || 10,
          sessionsCompleted: 0,
          status: ref.status || 'PENDING_REFERRAL',
          soapSubjective: ref.clinicalNotes ? `Referral: ${ref.clinicalNotes}` : '',
          soapObjective: '',
          soapAssessment: ref.diagnosis,
          soapPlan: ref.recommendedPackage || 'Standard Rehabilitation Package',
          painVasScore: 5,
          source: 'Physiotherapy Referral Queue'
        });
      }
    });

    // 3. From daily gym & bedside schedule
    (schedule || []).forEach(sch => {
      const name = (sch.patientName || '').trim();
      const key = name.toLowerCase();
      if (key && !patientMap.has(key)) {
        patientMap.set(key, {
          id: sch.episodeId || sch.id,
          patientName: name,
          patientNumber: sch.episodeId || sch.id,
          diagnosis: sch.treatmentPlan || 'Physiotherapy & Rehabilitation Care',
          referredBy: sch.therapist || 'Consultant Physiotherapist',
          referredFrom: sch.location,
          careSetting: sch.patientType === 'INPATIENT_BEDSIDE' ? 'INPATIENT_BEDSIDE' : 'OUTPATIENT_GYM',
          wardLocation: sch.location,
          phone: sch.phone,
          packageTotal: sch.packageTotal || 10,
          sessionsCompleted: sch.sessionIndex || 0,
          status: 'SCHEDULED',
          soapSubjective: '',
          soapObjective: '',
          soapAssessment: '',
          soapPlan: sch.treatmentPlan,
          painVasScore: 5,
          source: 'Physiotherapy Schedule'
        });
      }
    });

    return Array.from(patientMap.values());
  }, [episodes, referrals, schedule]);

  // ─── Filtered Schedule ───────────────────────────────────────────────────
  const filteredSchedule = useMemo(() => {
    return (schedule || []).filter(s => {
      if (scheduleSettingFilter !== 'ALL' && s.patientType !== scheduleSettingFilter) {
        return false;
      }
      if (scheduleStatusFilter !== 'ALL' && s.status !== scheduleStatusFilter) {
        return false;
      }
      if (scheduleSearchQuery.trim()) {
        const q = scheduleSearchQuery.toLowerCase().trim();
        const str = `${s.patientName || ''} ${s.phone || ''} ${s.location || ''} ${s.treatmentPlan || ''} ${s.therapist || ''} ${s.timeSlot || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [schedule, scheduleSettingFilter, scheduleStatusFilter, scheduleSearchQuery]);

  // ─── Filtered Equipment & Modalities ─────────────────────────────────────
  const filteredEquipment = useMemo(() => {
    const list = equipmentList.length > 0 ? equipmentList : [
      { id: 'EQ-01', code: 'EQ-TENS-01', name: 'TENS Machine (Electrotherapy Unit)', category: 'ELECTROTHERAPY', location: 'Physio Gym 3A', status: 'CALIBRATED & ACTIVE', manufacturer: 'Chattanooga Medical', serialNumber: 'TENS-2024-9982', lastCalibrated: '2026-08-15', nextCalibrationDue: '2026-11-15', assignedPatient: null, totalSessionsRun: 142, safetyCertStatus: 'VALID', channels: '4-Channel Dual Frequency', powerRating: '220V / Battery 9V' },
      { id: 'EQ-02', code: 'EQ-SWD-02', name: 'Shortwave Diathermy (SWD Unit)', category: 'THERMAL_DIATHERMY', location: 'Modality Bay 1', status: 'CALIBRATED & ACTIVE', manufacturer: 'Enraf-Nonius Curapuls', serialNumber: 'SWD-2712-401', lastCalibrated: '2026-08-10', nextCalibrationDue: '2026-11-10', assignedPatient: 'Chief Emeka Eze', totalSessionsRun: 88, safetyCertStatus: 'VALID', channels: 'Pulsed & Continuous RF 27.12 MHz', powerRating: '400W Peak RF' },
      { id: 'EQ-03', code: 'EQ-TRAC-04', name: 'Cervical / Lumbar Traction Unit', category: 'TRACTION_DECOMPRESSION', location: 'Spine Rehab Suite', status: 'CALIBRATED & ACTIVE', manufacturer: 'BTL Industries', serialNumber: 'TRAC-TX-883', lastCalibrated: '2026-08-20', nextCalibrationDue: '2026-11-20', assignedPatient: 'Engr. Babatunde Raji', totalSessionsRun: 64, safetyCertStatus: 'VALID', channels: 'Intermittent & Static Microprocessor Controlled', powerRating: 'Digital Tension Load 0-90 kg' },
      { id: 'EQ-04', code: 'EQ-US-09', name: 'Therapeutic Ultrasound Machine', category: 'ULTRASOUND_THERAPY', location: 'Physio Gym 3B', status: 'CALIBRATED & ACTIVE', manufacturer: 'Gymna Uniphy', serialNumber: 'US-SONO-552', lastCalibrated: '2026-08-18', nextCalibrationDue: '2026-11-18', assignedPatient: null, totalSessionsRun: 119, safetyCertStatus: 'VALID', channels: '1 MHz & 3 MHz Dual Frequency Soundhead', powerRating: 'Duty Cycle 10-100%' },
      { id: 'EQ-05', code: 'EQ-CPM-03', name: 'CPM Machine (Continuous Passive Motion)', category: 'MECHANOTHERAPY', location: 'Ward 3B (Orthopaedic Bay)', status: 'CALIBRATED & ACTIVE', manufacturer: 'Kinetec Prima Advance', serialNumber: 'CPM-ARTRO-112', lastCalibrated: '2026-08-22', nextCalibrationDue: '2026-11-22', assignedPatient: 'Jane Doe', totalSessionsRun: 52, safetyCertStatus: 'VALID', channels: 'Knee -10° to 120° Flexion/Extension', powerRating: '24V DC Medical Grade' },
      { id: 'EQ-06', code: 'EQ-IFT-07', name: 'Interferential Therapy Unit (IFT 4-Pole)', category: 'ELECTROTHERAPY', location: 'Physio Gym 3A', status: 'CALIBRATED & ACTIVE', manufacturer: 'EMS Physio Ltd', serialNumber: 'IFT-VECTOR-704', lastCalibrated: '2026-08-12', nextCalibrationDue: '2026-11-12', assignedPatient: null, totalSessionsRun: 95, safetyCertStatus: 'VALID', channels: '4-Pole Quadripolar Vector Sweep', powerRating: '4000 Hz Carrier' },
      { id: 'EQ-07', code: 'EQ-LASER-01', name: 'Class IV High-Intensity Laser Therapy (HILT)', category: 'PHOTO_BIOMODULATION', location: 'Modality Bay 2', status: 'CALIBRATED & ACTIVE', manufacturer: 'OptonPro Zimmer', serialNumber: 'HILT-OPTO-991', lastCalibrated: '2026-08-05', nextCalibrationDue: '2026-11-05', assignedPatient: null, totalSessionsRun: 41, safetyCertStatus: 'VALID', channels: 'Dual Wavelength 810nm / 980nm 25W', powerRating: 'Class 4 Laser Safety System' },
      { id: 'EQ-08', code: 'EQ-TILT-02', name: 'Motorized Electric Tilt Table', category: 'POSTURAL_VASCULAR', location: 'Neuro Gym Bedside Bay', status: 'CALIBRATED & ACTIVE', manufacturer: 'Akron Medical', serialNumber: 'TILT-MED-334', lastCalibrated: '2026-08-01', nextCalibrationDue: '2026-11-01', assignedPatient: 'Alhaji Ibrahim Musa', totalSessionsRun: 73, safetyCertStatus: 'VALID', channels: '0° to 90° Continuous Incline Angle', powerRating: 'High-Torque Dual Actuator' },
    ];

    return list.filter(eq => {
      if (equipmentCategoryFilter === 'IN_USE') {
        if (!eq.assignedPatient) return false;
      } else if (equipmentCategoryFilter !== 'ALL') {
        if (eq.category !== equipmentCategoryFilter) return false;
      }
      if (equipmentSearchQuery.trim()) {
        const q = equipmentSearchQuery.toLowerCase().trim();
        const str = `${eq.name} ${eq.code} ${eq.location || eq.room} ${eq.category} ${eq.manufacturer || ''} ${eq.serialNumber || ''} ${eq.assignedPatient || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [equipmentList, equipmentCategoryFilter, equipmentSearchQuery]);

  // ─── Route Sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');
    if (path === '/rehabilitation/mirror') setActiveTab(0);
    else if (path === '/rehabilitation/referrals') setActiveTab(1);
    else if (path === '/rehabilitation/schedule') setActiveTab(2);
    else if (path === '/rehabilitation/sessions') setActiveTab(3);
    else if (path === '/rehabilitation/plans') setActiveTab(4);
    else if (path === '/rehabilitation/progress') setActiveTab(5);
    else if (path === '/rehabilitation/equipment') setActiveTab(6);
    else if (path === '/rehabilitation/hep') setActiveTab(7);
    else setActiveTab(1); // Default to Referrals & Dashboard
  }, [location.pathname]);

  // ─── Fetch All Data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [epRes, seRes, viRes, biRes, refRes, schRes, eqRes] = await Promise.all([
        api.get('/rehabilitation/episodes'),
        api.get('/rehabilitation/sessions'),
        api.get('/rehabilitation/home-visits'),
        api.get('/rehabilitation/analytics'),
        api.get('/rehabilitation/referrals').catch(() => ({ data: { data: [] } })),
        api.get('/rehabilitation/schedule').catch(() => ({ data: { data: [] } })),
        api.get('/rehabilitation/equipment').catch(() => ({ data: { data: [] } })),
      ]);
      const loadedEps = epRes.data.data || [];
      setEpisodes(loadedEps);
      setSessions(seRes.data.data || []);
      setHomeVisits(viRes.data.data || []);
      setAnalytics(biRes.data.data || {});
      setReferrals(refRes.data.data || []);
      setSchedule(schRes.data.data || []);
      setEquipmentList(eqRes.data.data || []);

      // Preload MPI patient options & staff list
      fetchMpiPatients();
      fetchHospitalStaff();

      if (loadedEps.length > 0) {
        setSelectedEpisode((prev: any) => {
          const current = prev ? (loadedEps.find((e: any) => e.id === prev.id) || prev) : loadedEps[0];
          const { targetExercise } = resolvePatientGoalAndProtocol(current);
          if (targetExercise && PHYSIO_PROTOCOLS[targetExercise]) {
            setSelectedExercise(targetExercise);
            selectedExerciseRef.current = targetExercise;
          }
          return current;
        });
      }
    } catch {
      enqueueSnackbar('Failed to load rehabilitation databases', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar, fetchMpiPatients, fetchHospitalStaff]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Action: Accept Electronic Referral ──────────────────────────────────
  const handleAcceptReferral = async (refId: string) => {
    try {
      const res = await api.post(`/rehabilitation/referrals/${refId}/accept`);
      enqueueSnackbar(res.data.message || 'Electronic referral accepted!', { variant: 'success' });
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to accept referral', { variant: 'error' });
    }
  };

  // ─── Action: Submit Electronic Referral (Doctor Simulation) ───────────────
  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/rehabilitation/referrals', referralForm);
      enqueueSnackbar(res.data.message || 'Electronic referral sent to Physiotherapy Queue!', { variant: 'success' });
      setReferralModalOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to submit electronic referral', { variant: 'error' });
    }
  };

  // ─── Action: Quick Register External Client ──────────────────────────────
  const handleExternalIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/rehabilitation/external-intake', externalIntakeForm);
      enqueueSnackbar(res.data.message || 'External client registered and scheduled!', { variant: 'success' });
      setExternalIntakeModalOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to process external client intake', { variant: 'error' });
    }
  };

  // ─── Action: Deduct Package Session Credit ───────────────────────────────
  const handleDeductPackageSession = async (episodeId: string) => {
    try {
      const res = await api.post('/rehabilitation/packages/deduct', { episodeId });
      enqueueSnackbar(res.data.message || 'Session credit deducted!', { variant: 'success' });
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to deduct session credit', { variant: 'error' });
    }
  };

  // ─── Action: Update Daily Schedule Status ────────────────────────────────
  const handleUpdateScheduleStatus = async (schId: string, status: string) => {
    try {
      const res = await api.post(`/rehabilitation/schedule/${schId}/status`, { status });
      enqueueSnackbar(res.data.message || `Schedule updated to ${status}`, { variant: 'info' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to update schedule status', { variant: 'error' });
    }
  };

  // ─── Action: Send WhatsApp Missed Session Reminder ───────────────────────
  const handleSendWhatsAppReminder = async (patientName: string, phone: string, missedCount: number, episodeId: string) => {
    try {
      const res = await api.post('/attendance/whatsapp-reminder', { patientName, phone, missedCount, episodeId });
      const { whatsappUrl } = res.data.data;
      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank');
      }
      enqueueSnackbar(`📲 WhatsApp "We Miss You" reminder opened for ${patientName}`, { variant: 'success' });
    } catch {
      const cleanPhone = (phone || '+2348000000000').replace(/[^0-9+]/g, '');
      const msg = `Hello ${patientName}, we noticed you missed ${missedCount} scheduled Physiotherapy sessions at Faith Foundation Mission Hospital. Consistent rehabilitation is critical for your recovery protocol. Please reply to reschedule your session.`;
      window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(msg)}`, '_blank');
      enqueueSnackbar(`📲 WhatsApp "We Miss You" reminder opened for ${patientName}`, { variant: 'success' });
    }
  };

  // ─── Equipment Handlers ──────────────────────────────────────────────────
  const handleCalibrateEquipment = async (eqId: string) => {
    try {
      const res = await api.post(`/rehabilitation/equipment/${eqId}/calibrate`);
      enqueueSnackbar(res.data?.message || 'Equipment calibration certified successfully!', { variant: 'success' });
      fetchData();
      if (selectedEquipmentForDetail && (selectedEquipmentForDetail.id === eqId || selectedEquipmentForDetail.code === eqId)) {
        setSelectedEquipmentForDetail((prev: any) => ({
          ...prev,
          status: 'CALIBRATED & ACTIVE',
          lastCalibrated: new Date().toISOString().split('T')[0],
          nextCalibrationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
      }
    } catch {
      enqueueSnackbar('Failed to record equipment calibration', { variant: 'error' });
    }
  };

  const handleAssignEquipment = async () => {
    if (!equipmentAssignTarget) return;
    try {
      const res = await api.post(`/rehabilitation/equipment/${equipmentAssignTarget.id}/assign`, {
        patientName: equipmentAssignPatient
      });
      enqueueSnackbar(res.data?.message || 'Equipment assignment updated', { variant: 'success' });
      setAssignEquipmentModalOpen(false);
      setEquipmentAssignPatient('');
      setEquipmentAssignTarget(null);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to update equipment assignment', { variant: 'error' });
    }
  };

  const handleRegisterEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipmentForm.name.trim() || !newEquipmentForm.code.trim()) {
      enqueueSnackbar('Equipment Name and Code are required', { variant: 'warning' });
      return;
    }
    try {
      const res = await api.post('/rehabilitation/equipment', newEquipmentForm);
      enqueueSnackbar(res.data?.message || 'Equipment registered successfully', { variant: 'success' });
      setRegisterEquipmentModalOpen(false);
      setNewEquipmentForm({
        name: '',
        code: '',
        category: 'ELECTROTHERAPY',
        location: 'Physio Gym 3A',
        manufacturer: '',
        serialNumber: '',
        channels: '',
        powerRating: '',
        notes: ''
      });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to register equipment', { variant: 'error' });
    }
  };

  const handlePrintSafetyInspectionReport = (targetEq?: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const items = targetEq ? [targetEq] : (equipmentList.length > 0 ? equipmentList : [
      { id: 'EQ-01', code: 'EQ-TENS-01', name: 'TENS Machine (Electrotherapy Unit)', category: 'ELECTROTHERAPY', location: 'Physio Gym 3A', status: 'CALIBRATED & ACTIVE', serialNumber: 'TENS-2024-9982' },
      { id: 'EQ-02', code: 'EQ-SWD-02', name: 'Shortwave Diathermy (SWD Unit)', category: 'THERMAL_DIATHERMY', location: 'Modality Bay 1', status: 'CALIBRATED & ACTIVE', serialNumber: 'SWD-2712-401', assignedPatient: 'Chief Emeka Eze' },
      { id: 'EQ-03', code: 'EQ-TRAC-04', name: 'Cervical / Lumbar Traction Unit', category: 'TRACTION_DECOMPRESSION', location: 'Spine Rehab Suite', status: 'CALIBRATED & ACTIVE', serialNumber: 'TRAC-TX-883', assignedPatient: 'Engr. Babatunde Raji' },
      { id: 'EQ-04', code: 'EQ-US-09', name: 'Therapeutic Ultrasound Machine', category: 'ULTRASOUND_THERAPY', location: 'Physio Gym 3B', status: 'CALIBRATED & ACTIVE', serialNumber: 'US-SONO-552' },
    ]);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Physiotherapy Equipment Calibration & Safety Compliance Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; }
          .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #0369a1; }
          .meta { font-size: 13px; color: #64748b; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; }
          .badge { padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; display: inline-block; }
          .badge-active { background-color: #dcfce7; color: #15803d; }
          .badge-inuse { background-color: #e0f2fe; color: #0369a1; }
          .footer { margin-top: 30px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">FAITH FOUNDATION MISSION HOSPITAL</div>
          <div>Department of Physiotherapy & Physical Medicine — Biomedical Safety & Calibration Registry</div>
          <div class="meta">Certified Inspection Date: ${new Date().toLocaleDateString('en-GB')} · Certified by: Lead Biomedical Engineer & Consultant Physiotherapist</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Equipment Code</th>
              <th>Modality Name</th>
              <th>Category</th>
              <th>Location</th>
              <th>Serial Number</th>
              <th>Last Calibration</th>
              <th>Next Due</th>
              <th>Status</th>
              <th>Assigned Patient</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(eq => `
              <tr>
                <td><strong>${eq.code}</strong></td>
                <td>${eq.name}</td>
                <td>${eq.category}</td>
                <td>${eq.location || eq.room}</td>
                <td>${eq.serialNumber || 'N/A'}</td>
                <td>${eq.lastCalibrated || '2026-08-15'}</td>
                <td>${eq.nextCalibrationDue || '2026-11-15'}</td>
                <td><span class="badge ${eq.assignedPatient ? 'badge-inuse' : 'badge-active'}">${eq.status || 'CALIBRATED & ACTIVE'}</span></td>
                <td>${eq.assignedPatient || 'None (Available)'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <div>Verified compliant under ISO 13485 / IEC 60601-1 Medical Electrical Equipment Standards</div>
          <div>Authorized Signature: _______________________ (Lead Biomedical Engineer)</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ─── Action: Load Real Human Exercise Video (.mp4) ───────────────────────
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomDemoVideoUrl(url);
    setCustomDemoVideoName(file.name);
    setCameraMode('SIMULATION');
    setDemoAvatarMode('HUMAN_VIDEO');
    setIsAudioMuted(true);
    setAudioMode('MUTED');
    stopAmbientSound();
    if (demoVideoRef.current) {
      demoVideoRef.current.src = url;
      demoVideoRef.current.play().catch(() => {});
    }
    enqueueSnackbar(`🎥 Real human video loaded: "${file.name}". AI kinematic tracking activated (Audio Muted)!`, { variant: 'success' });
  };

  // ─── Webcam Setup & Teardown ─────────────────────────────────────────────
  const startCam = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn("video play error:", e));
        };
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      enqueueSnackbar('Camera permission required — please allow camera access in browser', { variant: 'warning' });
    }
  };

  useEffect(() => {
    if (cameraMode !== 'WEBCAM') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      return;
    }
    startCam();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [cameraMode, enqueueSnackbar]);

  // ─── KINEMATIC BIOFEEDBACK MIRROR — REAL COMPUTER VISION LOOP ─────────────
  useEffect(() => {
    // Stop any existing loop
    activeLoopRef.current = false;
    cancelAnimationFrame(animIdRef.current);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ── Shared helpers ───────────────────────────────────────────────────
    const getAbductionAngle = (sh: {x:number,y:number}, el: {x:number,y:number}): number => {
      const vx = el.x - sh.x;
      const vy = el.y - sh.y; // positive when elbow BELOW shoulder (arm at side)
      const angle = Math.atan2(Math.abs(vx), vy) * (180 / Math.PI);
      return Math.max(0, Math.min(175, Math.round(angle)));
    };

    const getKneeFlexionAngle = (hip: {x: number, y: number}, knee: {x: number, y: number}, ankle: {x: number, y: number}): number => {
      if (!hip || !knee || !ankle || hip.x === 0 || knee.x === 0 || ankle.x === 0) return 0;
      const v1x = hip.x - knee.x;
      const v1y = hip.y - knee.y;
      const v2x = ankle.x - knee.x;
      const v2y = ankle.y - knee.y;
      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.sqrt(v1x * v1x + v1y * v1y) || 1;
      const mag2 = Math.sqrt(v2x * v2x + v2y * v2y) || 1;
      const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      const angleDeg = 180 - (Math.acos(cosTheta) * (180 / Math.PI));
      return Math.max(0, Math.min(150, Math.round(angleDeg)));
    };

    const getHipAbductionAngle = (hip: {x: number, y: number}, ankle: {x: number, y: number}): number => {
      if (!hip || !ankle || hip.x === 0 || ankle.x === 0) return 0;
      const dx = ankle.x - hip.x;
      const dy = ankle.y - hip.y;
      const angle = Math.atan2(Math.abs(dx), Math.max(1, dy)) * (180 / Math.PI);
      return Math.max(0, Math.min(60, Math.round(angle)));
    };

    const getNeckTiltAngle = (nose: {x: number, y: number}, midSh: {x: number, y: number}): number => {
      if (!nose || !midSh || nose.x === 0 || midSh.x === 0) return 0;
      const dx = nose.x - midSh.x;
      const dy = Math.max(1, midSh.y - nose.y);
      const angle = Math.atan2(Math.abs(dx), dy) * (180 / Math.PI);
      return Math.max(0, Math.min(60, Math.round(angle * 1.6)));
    };

    const getHudMetrics = (lA: number, rA: number, torso: number, sym: number): [string, string][] => {
      const proto = getPhysioProtocol(selectedExerciseRef.current || selectedExercise);
      return proto.getHud(lA, rA, torso, sym);
    };

    const drawHud = (
      w: number, h: number,
      lAngle: number, rAngle: number,
      isBadForm: boolean, score: number, torso: number, sym: number, status: string,
      isSimMode: boolean,
      coachText: string = '',
      holdSec: number = 0
    ) => {
      const pW = 265, pH = 152, pad = 16, ip = 12;
      const rr = (x: number, y: number, ww: number, hh: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x+r,y); ctx.lineTo(x+ww-r,y); ctx.quadraticCurveTo(x+ww,y,x+ww,y+r);
        ctx.lineTo(x+ww,y+hh-r); ctx.quadraticCurveTo(x+ww,y+hh,x+ww-r,y+hh);
        ctx.lineTo(x+r,y+hh); ctx.quadraticCurveTo(x,y+hh,x,y+hh-r);
        ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
      };

      // If simulation mode, draw a watermark banner at top
      if (isSimMode) {
        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(0, 0, w, 36);
        ctx.restore();
        ctx.fillStyle = '#38bdf8';
        ctx.font = "bold 12px 'Courier New',monospace";
        ctx.textAlign = 'center';
        ctx.fillText('🎮  SIMULATION DEMO — NOT REAL PATIENT DATA  🎮', w / 2, 23);
      }

      // Left
      ctx.save(); ctx.globalAlpha = 0.78; ctx.fillStyle = '#000';
      rr(pad, h-pH-pad, pW, pH, 10); ctx.fill(); ctx.restore();
      ctx.fillStyle = isSimMode ? '#38bdf8' : '#4ade80';
      ctx.font = "bold 12.5px 'Courier New',monospace"; ctx.textAlign = 'left';
      ctx.fillText(isSimMode ? 'EXERCISE ANALYSIS SYSTEM (SIM)' : 'EXERCISE ANALYSIS SYSTEM (LIVE)', pad+ip, h-pH-pad+26);
      ctx.fillStyle = '#94a3b8'; ctx.font = "11px 'Segoe UI',sans-serif";
      ctx.fillText(`Exercise: ${selectedExercise}`, pad+ip, h-pH-pad+45);
      ctx.fillStyle = '#ccc'; ctx.font = "bold 11.5px 'Segoe UI',sans-serif";
      ctx.fillText('STATUS:', pad+ip, h-pH-pad+68);
      ctx.fillStyle = isBadForm ? '#ffcc00' : '#00e5ff';
      ctx.font = "bold 12px 'Segoe UI',sans-serif";
      ctx.fillText(isSimMode ? `[SIM] ${status}` : status, pad+ip+68, h-pH-pad+68);
      ctx.fillStyle = '#e2e8f0'; ctx.font = "11.5px 'Segoe UI',sans-serif";
      ctx.fillText(isSimMode ? 'Score: [DEMO]' : `Movement Score: ${score} / 100`, pad+ip, h-pH-pad+94);
      ctx.fillText(`Rep Count: ${String(repCountRef.current).padStart(2,'0')} / ${String(targetReps).padStart(2,'0')}`, pad+ip, h-pH-pad+114);
      if (holdSec > 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = "bold 11px 'Segoe UI',sans-serif";
        ctx.fillText(`Hold: ${holdSec.toFixed(1)}s / ${targetHoldDuration.toFixed(1)}s`, pad+ip, h-pH-pad+132);
      }
      // Right
      const rx = w - pW - pad;
      ctx.save(); ctx.globalAlpha = 0.78; ctx.fillStyle = '#000';
      rr(rx, h-pH-pad, pW, pH, 10); ctx.fill(); ctx.restore();
      ctx.fillStyle = isSimMode ? '#38bdf8' : '#4ade80';
      ctx.font = "bold 12.5px 'Courier New',monospace"; ctx.textAlign = 'left';
      ctx.fillText(isSimMode ? 'SIMULATED KINEMATICS (DEMO)' : 'LIVE PATIENT BIOMECHANICS', rx+ip, h-pH-pad+26);
      getHudMetrics(lAngle, rAngle, torso, sym).forEach(([label, value], i) => {
        ctx.fillStyle = '#94a3b8'; ctx.font = "11px 'Segoe UI',sans-serif"; ctx.textAlign = 'left';
        ctx.fillText(label, rx+ip, h-pH-pad+52+i*27);
        // In simulation mode, show "DEMO" instead of real values so it's clear this is not patient data
        const displayValue = isSimMode ? `${value} ⊘` : value;
        ctx.fillStyle = isSimMode ? '#64748b' : '#fff';
        ctx.font = "bold 11.5px 'Segoe UI',sans-serif"; ctx.textAlign = 'right';
        ctx.fillText(displayValue, rx+pW-ip, h-pH-pad+52+i*27);
      });
      // Top-center Biofeedback Coaching Guidance Banner
      if (coachText) {
        ctx.save();
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = '#0f172a';
        rr(w / 2 - 250, 14, 500, 42, 10);
        ctx.fill();
        ctx.strokeStyle = isBadForm ? '#f59e0b' : '#22d3ee';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = isBadForm ? '#fbbf24' : '#38bdf8';
        ctx.font = "bold 13px 'Segoe UI',sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(`💡 ${coachText}`, w / 2, 40);
      }
    };

    const drawSkeleton = (pts: {x:number,y:number}[], isBadForm: boolean) => {
      const skelColor = isBadForm ? '#ffcc00' : '#00e5ff';
      ctx.strokeStyle = skelColor; ctx.fillStyle = skelColor;
      ctx.lineWidth = 3.5; ctx.shadowColor = skelColor; ctx.shadowBlur = 14;
      const bone = (a?: {x:number,y:number}, b?: {x:number,y:number}) => {
        if (!a || !b || (a.x === 0 && a.y === 0) || (b.x === 0 && b.y === 0)) return;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      };
      if (pts.length < 17) return;

      if (pts.length >= 33) {
        // ── Full-Body 33 MediaPipe 3D Pose Landmarks ──
        // Head / Face
        if (pts[0]) {
          ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 14, 0, Math.PI*2); ctx.stroke();
        }
        // Shoulders & Torso Box
        bone(pts[11], pts[12]); bone(pts[11], pts[23]); bone(pts[12], pts[24]); bone(pts[23], pts[24]);
        // Arms
        bone(pts[11], pts[13]); bone(pts[13], pts[15]);
        bone(pts[12], pts[14]); bone(pts[14], pts[16]);
        // Hands
        bone(pts[15], pts[17]); bone(pts[15], pts[19]); bone(pts[15], pts[21]);
        bone(pts[16], pts[18]); bone(pts[16], pts[20]); bone(pts[16], pts[22]);
        // Legs & Feet
        bone(pts[23], pts[25]); bone(pts[25], pts[27]); bone(pts[27], pts[29]); bone(pts[29], pts[31]);
        bone(pts[24], pts[26]); bone(pts[26], pts[28]); bone(pts[28], pts[30]); bone(pts[30], pts[32]);
        // All joint nodes
        [0, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].forEach(i => {
          const pt = pts[i];
          if (!pt || (pt.x === 0 && pt.y === 0)) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI*2); ctx.fill();
        });
      } else {
        // ── MoveNet 17 Keypoints Fallback ──
        // Head
        ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, 18, 0, Math.PI*2); ctx.stroke();
        // Torso
        bone(pts[5], pts[6]); bone(pts[5], pts[11]); bone(pts[6], pts[12]); bone(pts[11], pts[12]);
        // Arms
        bone(pts[5], pts[7]); bone(pts[7], pts[9]);
        bone(pts[6], pts[8]); bone(pts[8], pts[10]);
        // Legs
        bone(pts[11], pts[13]); bone(pts[13], pts[15]);
        bone(pts[12], pts[14]); bone(pts[14], pts[16]);
        // Dots
        [0,5,6,7,8,9,10,11,12,13,14,15,16].forEach(i => {
          const pt = pts[i];
          if (!pt || (pt.x === 0 && pt.y === 0)) return;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI*2); ctx.fill();
        });
      }
      ctx.shadowBlur = 0;
    };

    const drawRealisticHumanAvatar = (
      pts: { x: number; y: number }[],
      sim: any,
      isBadForm: boolean,
      _cycle: number,
      isPiP: boolean = false
    ) => {
      if (pts.length < 17) return;
      const head = pts[0];
      const lSh = pts[5], rSh = pts[6];
      const lEl = pts[7], rEl = pts[8];
      const lWr = pts[9], rWr = pts[10];
      const lHip = pts[11], rHip = pts[12];
      const lKnee = pts[13], rKnee = pts[14];
      const lAnkle = pts[15], rAnkle = pts[16];

      if (!head || !lSh || !rSh || head.x === 0 || lSh.x === 0 || rSh.x === 0) return;

      ctx.save();

      // Only draw full room studio environment when running in FULLSCREEN SIMULATION mode, NEVER inside PiP!
      if (!isPiP) {
        // Modern Clinic Gym Environment Background (Warm Wood Parquet & Clinic Studio Wall)
        const w = canvas.width, h = canvas.height;
        const wallH = h * 0.72;
        const wallGrad = ctx.createLinearGradient(0, 0, 0, wallH);
        wallGrad.addColorStop(0, '#0a1128');
        wallGrad.addColorStop(0.6, '#111e38');
        wallGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, w, wallH);

        // Studio Polished Parquet Oak Hardwood Floor
        const floorGrad = ctx.createLinearGradient(0, wallH, 0, h);
        floorGrad.addColorStop(0, '#451a03'); // Rich amber oak wood
        floorGrad.addColorStop(0.15, '#2e1305');
        floorGrad.addColorStop(1, '#0f0a05');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, wallH, w, h - wallH);

        // Hardwood floor perspective planks
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.08)';
        ctx.lineWidth = 1;
        for (let py = wallH + 12; py < h; py += 16) {
          ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
        }

        // Studio floor exercise rehabilitation mat
        ctx.fillStyle = 'rgba(14, 116, 144, 0.18)';
        ctx.beginPath();
        ctx.roundRect(w / 2 - 180, wallH + 10, 360, h - wallH - 18, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dynamic floor drop-shadow directly below the human feet
        const footCenterY = Math.max(lAnkle.y, rAnkle.y) + 12;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.ellipse(w / 2, footCenterY, 110, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Subtle local drop-shadow inside PiP window
        const footCenterX = (lAnkle.x + rAnkle.x) / 2;
        const footCenterY = Math.max(lAnkle.y, rAnkle.y) + 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(footCenterX, footCenterY, 32, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Photorealistic Human Skin & Fabric Gradients
      const skinGrad = ctx.createLinearGradient(head.x - 25, head.y - 25, head.x + 25, head.y + 25);
      skinGrad.addColorStop(0, '#fed7aa'); // Natural healthy skin tone highlight
      skinGrad.addColorStop(0.4, '#f59e0b');
      skinGrad.addColorStop(1, '#b45309'); // Muscle contour shadow

      const shirtGrad = ctx.createLinearGradient(lSh.x, lSh.y, rHip.x, rHip.y);
      shirtGrad.addColorStop(0, '#1d4ed8'); // Athletic tech fabric
      shirtGrad.addColorStop(0.5, '#2563eb');
      shirtGrad.addColorStop(1, '#1e3a8a');

      const shortsGrad = ctx.createLinearGradient(lHip.x, lHip.y, rKnee.x, rKnee.y);
      shortsGrad.addColorStop(0, '#0f172a');
      shortsGrad.addColorStop(1, '#1e293b');

      // Tapered muscular limb helper with soft anatomical contouring
      const drawMuscleLimb = (p1: {x:number,y:number}, p2: {x:number,y:number}, r1: number, r2: number, fill: string | CanvasGradient, stroke?: string) => {
        if (!p1 || !p2 || (p1.x === 0 && p1.y === 0) || (p2.x === 0 && p2.y === 0)) return;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        ctx.beginPath();
        ctx.moveTo(p1.x + nx * r1, p1.y + ny * r1);
        ctx.lineTo(p2.x + nx * r2, p2.y + ny * r2);
        ctx.arc(p2.x, p2.y, r2, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
        ctx.lineTo(p1.x - nx * r1, p1.y - ny * r1);
        ctx.arc(p1.x, p1.y, r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
        ctx.closePath();

        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      };

      // ── 1. LOWER BODY (Legs & Shoes) ──────────────────────────────────
      // Quads / Compression Tights
      drawMuscleLimb(lHip, lKnee, 19, 15, shortsGrad, '#334155');
      drawMuscleLimb(rHip, rKnee, 19, 15, shortsGrad, '#334155');

      // Calves & Shins (Natural Muscle Definition)
      drawMuscleLimb(lKnee, lAnkle, 15, 11, skinGrad, '#9a3412');
      drawMuscleLimb(rKnee, rAnkle, 15, 11, skinGrad, '#9a3412');

      // Modern Athletic Sneakers with Soles and Laces
      const drawSneaker = (ankle: {x:number,y:number}, isLeft: boolean) => {
        if (!ankle || (ankle.x === 0 && ankle.y === 0)) return;
        const dir = isLeft ? -1 : 1;
        ctx.save();
        ctx.fillStyle = '#0284c7'; // Athletic Cyan Mesh
        ctx.beginPath();
        ctx.roundRect(ankle.x - (isLeft ? 18 : 10), ankle.y - 2, 32, 16, [4, 8, 4, 4]);
        ctx.fill();
        // White Cushion Sole
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(ankle.x - (isLeft ? 20 : 12), ankle.y + 11, 36, 6);
        // Laces
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ankle.x - 2, ankle.y + 2); ctx.lineTo(ankle.x + 4, ankle.y + 2);
        ctx.moveTo(ankle.x - 2, ankle.y + 5); ctx.lineTo(ankle.x + 4, ankle.y + 5);
        ctx.stroke();
        ctx.restore();
      };
      drawSneaker(lAnkle, true);
      drawSneaker(rAnkle, false);

      // Pelvis & Waist
      ctx.beginPath();
      ctx.moveTo(lHip.x - 16, lHip.y - 6);
      ctx.lineTo(rHip.x + 16, rHip.y - 6);
      ctx.lineTo(rHip.x + 10, rHip.y + 16);
      ctx.lineTo(lHip.x - 10, lHip.y + 16);
      ctx.closePath();
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // ── 2. TORSO & ATHLETIC COMPRESSION SHIRT ─────────────────────────
      ctx.beginPath();
      ctx.moveTo(lSh.x - 14, lSh.y - 4);
      ctx.quadraticCurveTo((lSh.x + rSh.x) / 2, lSh.y - 12, rSh.x + 14, rSh.y - 4);
      ctx.quadraticCurveTo(rSh.x + 10, (rSh.y + rHip.y) / 2, rHip.x + 12, rHip.y);
      ctx.lineTo(lHip.x - 12, lHip.y);
      ctx.quadraticCurveTo(lSh.x - 10, (lSh.y + lHip.y) / 2, lSh.x - 14, lSh.y - 4);
      ctx.closePath();
      ctx.fillStyle = shirtGrad;
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Chest / Pectoral contour & Hospital Physio Badge
      const midChestX = (lSh.x + rSh.x) / 2;
      const midChestY = (lSh.y + lHip.y) / 2 - 10;
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(midChestX, midChestY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FFH', midChestX, midChestY + 3);

      // ── 3. NECK & HEAD (Face, Eyes, Lips, Hair) ─────────────────────────
      // Neck Musculature
      const neckY = head.y + 18;
      ctx.fillStyle = skinGrad;
      ctx.beginPath();
      ctx.moveTo(head.x - 8, head.y + 12);
      ctx.lineTo(head.x + 8, head.y + 12);
      ctx.lineTo(head.x + 10, neckY);
      ctx.lineTo(head.x - 10, neckY);
      ctx.closePath();
      ctx.fill();

      // Head / Face
      ctx.beginPath();
      ctx.ellipse(head.x, head.y, 16, 22, 0, 0, Math.PI * 2);
      ctx.fillStyle = skinGrad;
      ctx.fill();
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Styled Athletic Hair
      ctx.beginPath();
      ctx.arc(head.x, head.y - 6, 17, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fillStyle = '#1e293b';
      ctx.fill();

      // Athletic Headband
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(head.x - 15, head.y - 10, 30, 6);

      // Facial Features (Eyes with pupils, Nose bridge, Smile)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(head.x - 5, head.y - 2, 3, 0, Math.PI * 2);
      ctx.arc(head.x + 5, head.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a'; // Pupils
      ctx.beginPath();
      ctx.arc(head.x - 5, head.y - 2, 1.5, 0, Math.PI * 2);
      ctx.arc(head.x + 5, head.y - 2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Nose & Smile
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(head.x, head.y - 1); ctx.lineTo(head.x - 1, head.y + 4); ctx.lineTo(head.x + 2, head.y + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(head.x, head.y + 8, 4, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // ── 4. UPPER LIMBS (Shoulders, Biceps, Forearms, Hands) ───────────
      // Deltoid caps
      ctx.fillStyle = shirtGrad;
      ctx.beginPath();
      ctx.arc(lSh.x, lSh.y, 14, 0, Math.PI * 2);
      ctx.arc(rSh.x, rSh.y, 14, 0, Math.PI * 2);
      ctx.fill();

      // Biceps & Triceps (Shoulder -> Elbow)
      drawMuscleLimb(lSh, lEl, 14, 11, skinGrad, '#9a3412');
      drawMuscleLimb(rSh, rEl, 14, 11, skinGrad, '#9a3412');

      // Forearms (Elbow -> Wrist)
      drawMuscleLimb(lEl, lWr, 11, 8, skinGrad, '#9a3412');
      drawMuscleLimb(rEl, rWr, 11, 8, skinGrad, '#9a3412');

      // Hands with Training Gloves
      const drawHand = (wrist: {x:number,y:number}, el: {x:number,y:number}) => {
        if (!wrist || !el || (wrist.x === 0 && wrist.y === 0)) return;
        const vx = wrist.x - el.x;
        const vy = wrist.y - el.y;
        const len = Math.hypot(vx, vy) || 1;
        const hx = wrist.x + (vx / len) * 11;
        const hy = wrist.y + (vy / len) * 11;

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(hx, hy, 8.5, 0, Math.PI * 2);
        ctx.fill();
      };
      drawHand(lWr, lEl);
      drawHand(rWr, rEl);

      // ── 5. SUPERIMPOSED GLOWING AI TELEMETRY OVERLAY ───────────────────
      const jointColor = isBadForm ? '#f59e0b' : '#00f0ff';
      ctx.strokeStyle = jointColor;
      ctx.fillStyle = jointColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = jointColor;
      ctx.shadowBlur = 12;

      // Dashed tracking overlay
      ctx.setLineDash([4, 4]);
      const boneLine = (a: {x:number,y:number}, b: {x:number,y:number}) => {
        if (!a || !b || (a.x === 0 && a.y === 0) || (b.x === 0 && b.y === 0)) return;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      };
      boneLine(lSh, lEl); boneLine(lEl, lWr);
      boneLine(rSh, rEl); boneLine(rEl, rWr);
      boneLine(lSh, rSh);
      boneLine(lSh, lHip); boneLine(rSh, rHip);
      boneLine(lHip, lKnee); boneLine(lKnee, lAnkle);
      boneLine(rHip, rKnee); boneLine(rKnee, rAnkle);
      ctx.setLineDash([]); // reset

      // Glowing Articulator Hubs
      [lSh, rSh, lEl, rEl, lWr, rWr, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle].forEach(pt => {
        if (!pt || (pt.x === 0 && pt.y === 0)) return;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = jointColor;
        ctx.stroke();
      });

      // Active Joint Angle Badges
      if (sim?.lA !== undefined && sim?.rA !== undefined) {
        ctx.shadowBlur = 0;
        ctx.font = 'bold 11.5px monospace';
        ctx.fillStyle = '#38bdf8';
        if (lEl) ctx.fillText(`${sim.lA}°`, lEl.x - 24, lEl.y);
        if (rEl) ctx.fillText(`${sim.rA}°`, rEl.x + 14, rEl.y);
      }

      ctx.restore();
    };

    // ── Picture-in-Picture reference skeleton (live mode only) ────────────
    // Separate sim step so the PiP runs its own continuous cycle independently
    let pipSimStep = 0;

    const drawPiPReference = (w: number, h: number) => {
      pipSimStep += 0.022;
      const pipCycle = Math.abs(Math.sin(pipSimStep));

      // ── Panel geometry ────────────────────────────────────────────────
      const pipW = 240, pipH = 230;
      const pipX = w - pipW - 12;
      const pipY = 12;
      const headerH = 32;
      const footerH = 18;

      // ── Panel background + border ─────────────────────────────────────
      ctx.save();
      ctx.globalAlpha = 0.93;
      ctx.fillStyle = '#060d1f';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(pipX, pipY, pipW, pipH, 12);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      // Header bar
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = '#0c1e3d';
      ctx.beginPath();
      ctx.roundRect(pipX + 1, pipY + 1, pipW - 2, headerH, [11, 11, 0, 0]);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#22d3ee';
      ctx.font = "bold 10px 'Courier New',monospace";
      ctx.textAlign = 'center';
      ctx.fillText('📖 EXERCISE REFERENCE', pipX + pipW / 2, pipY + 13);
      ctx.fillStyle = '#64748b';
      ctx.font = "7.5px 'Segoe UI',sans-serif";
      ctx.fillText('Simulated — how the exercise should look', pipX + pipW / 2, pipY + 26);

      // ── Content clipping area ─────────────────────────────────────────
      const cX = pipX + 4;
      const cY = pipY + headerH + 2;
      const cW = pipW - 8;
      const cH = pipH - headerH - footerH - 4;

      // ── Get sim data using a large virtual canvas ─────────────────────
      // Using 500×600 gives protocols enough room; coordinates won't clip
      const vW = 500, vH = 600;
      const proto = getPhysioProtocol(selectedExerciseRef.current || selectedExercise);
      const sim = proto.getSim(vW, vH, pipCycle, pipSimStep, false, vW / 2, vH * 0.16);

      // Virtual head position
      const headV = { x: vW / 2, y: vH * 0.10 };

      // Collect all joint points in virtual space
      type P = { x: number; y: number };
      const joints: P[] = [
        headV,
        sim.lSh, sim.rSh,
        sim.lEl, sim.rEl,
        sim.lWr, sim.rWr,
        sim.lHip, sim.rHip,
        sim.lKnee, sim.rKnee,
        sim.lAnkle, sim.rAnkle,
      ].filter(p => !(p.x === 0 && p.y === 0));

      // ── Compute bounding box ──────────────────────────────────────────
      const xs = joints.map(p => p.x);
      const ys = joints.map(p => p.y);
      const bbMinX = Math.min(...xs);
      const bbMaxX = Math.max(...xs);
      const bbMinY = Math.min(...ys);
      const bbMaxY = Math.max(...ys);
      const bbW = bbMaxX - bbMinX || 1;
      const bbH = bbMaxY - bbMinY || 1;

      // ── Uniform scale to fill content area (90% fill with padding) ───
      const innerPad = 12;
      const scale = Math.min(
        (cW - innerPad * 2) / bbW,
        (cH - innerPad * 2) / bbH
      ) * 0.92;

      // Offset so bounding box is centred in content area
      const offX = cX + (cW - bbW * scale) / 2 - bbMinX * scale;
      const offY = cY + (cH - bbH * scale) / 2 - bbMinY * scale;

      // Transform helper
      const tp = (p: P) => ({ x: p.x * scale + offX, y: p.y * scale + offY });

      // ── Clip all internal PiP drawing to PiP rounded bounds ──────────
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cX, cY, cW, cH, 6);
      ctx.clip();

      let rendered3D = false;
      if (pipCanvas3DRef.current) {
        if (!pipThreeSceneRef.current) {
          pipThreeSceneRef.current = new Rehabilitation3DScene(pipCanvas3DRef.current);
          pipThreeSceneRef.current.setCameraPosition(0, 1.45, 4.4, 1.35);
        }
        pipThreeSceneRef.current.setFacingMode(demoAvatarMode === 'HUMAN_BACK' ? 'BACK' : 'FRONT');
        pipThreeSceneRef.current.updateFromSim(sim, vW, vH, selectedExerciseRef.current || selectedExercise);
        try {
          ctx.drawImage(pipCanvas3DRef.current, cX, cY, cW, cH);
          rendered3D = true;
        } catch {
          rendered3D = false;
        }
      }

      if (!rendered3D) {
        // Fallback drawing
        const pipFloorY = cY + cH * 0.72;
        const pipWallGrad = ctx.createLinearGradient(cX, cY, cX, pipFloorY);
        pipWallGrad.addColorStop(0, '#0a1128');
        pipWallGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = pipWallGrad;
        ctx.fillRect(cX, cY, cW, pipFloorY - cY);

        const pipFloorGrad = ctx.createLinearGradient(cX, pipFloorY, cX, cY + cH);
        pipFloorGrad.addColorStop(0, '#451a03');
        pipFloorGrad.addColorStop(1, '#0f0a05');
        ctx.fillStyle = pipFloorGrad;
        ctx.fillRect(cX, pipFloorY, cW, cY + cH - pipFloorY);

        const thd = tp(headV);
        const scaledPts = [
          thd,
          { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
          tp(sim.lSh), tp(sim.rSh),
          tp(sim.lEl), tp(sim.rEl),
          tp(sim.lWr), tp(sim.rWr),
          tp(sim.lHip), tp(sim.rHip),
          tp(sim.lKnee), tp(sim.rKnee),
          tp(sim.lAnkle), tp(sim.rAnkle)
        ];

        const scaledSim = {
          ...sim,
          lSh: tp(sim.lSh), rSh: tp(sim.rSh),
          lEl: tp(sim.lEl), rEl: tp(sim.rEl),
          lWr: tp(sim.lWr), rWr: tp(sim.rWr),
          lHip: tp(sim.lHip), rHip: tp(sim.rHip),
          lKnee: tp(sim.lKnee), rKnee: tp(sim.rKnee),
          lAnkle: tp(sim.lAnkle), rAnkle: tp(sim.rAnkle)
        };

        drawRealisticHumanAvatar(scaledPts, scaledSim, false, pipCycle, true);
      }

      ctx.restore();

      // ── Footer: exercise phase status ─────────────────────────────────
      const maxChars = 30;
      const statusText = sim.status.length > maxChars ? sim.status.substring(0, maxChars) + '…' : sim.status;
      ctx.fillStyle = '#22d3ee';
      ctx.font = "bold 8.5px 'Segoe UI',sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(statusText, pipX + pipW / 2, pipY + pipH - 5);
    };

    // ── Standby screen ───────────────────────────────────────────────────
    if (!mirrorActive) {
      const drawStandby = () => {
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#0a0f1e'); bg.addColorStop(1, '#0f172a');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.003);
        ctx.save(); ctx.globalAlpha = pulse;
        ctx.fillStyle = 'rgba(6,182,212,0.12)';
        ctx.beginPath(); ctx.roundRect(w/2-64, h/2-88, 128, 100, 20); ctx.fill();
        ctx.restore();
        ctx.font = '48px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(cameraMode === 'WEBCAM' ? '📹' : '🎮', w/2, h/2-15);
        ctx.fillStyle = '#cbd5e1'; ctx.font = "bold 20px 'Segoe UI',sans-serif";
        ctx.fillText(cameraMode === 'WEBCAM' ? 'Live Patient Exercise Analysis System — Standby' : 'Simulation Kinematic Demo — Standby', w/2, h/2+34);
        ctx.fillStyle = '#94a3b8'; ctx.font = "13px 'Segoe UI',sans-serif";
        ctx.fillText(cameraMode === 'WEBCAM' ? 'Click  ▶️ Start Live Patient Tracking  to activate camera' : 'Click  ▶️ Play Simulation Demo  to watch movement protocol', w/2, h/2+60);
        animIdRef.current = requestAnimationFrame(drawStandby);
      };
      drawStandby();
      return () => { cancelAnimationFrame(animIdRef.current); };
    }

    // ── Active mirror loop ───────────────────────────────────────────────
    activeLoopRef.current = true;
    let simStep = 0;

    const runLoop = async () => {
      // Load Google MediaPipe Pose (33 full-body 3D landmarks) or MoveNet fallback
      if (cameraMode === 'WEBCAM' && !detectorRef.current && !mediapipePoseRef.current) {
        try {
          setPoseModelLoading(true);

          const ensureScript = (id: string, src: string): Promise<void> => {
            return new Promise((resolve, reject) => {
              if (document.getElementById(id)) return resolve();
              const s = document.createElement('script');
              s.id = id;
              s.src = src;
              s.crossOrigin = 'anonymous';
              s.onload = () => resolve();
              s.onerror = () => reject(new Error(`Failed to load ${src}`));
              document.head.appendChild(s);
            });
          };

          // Primary: Google MediaPipe Pose Landmarker
          try {
            if (!(window as any).Pose) {
              await ensureScript('mediapipe-pose-cdn', 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js');
            }
            if ((window as any).Pose) {
              const mpPose = new (window as any).Pose({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
              });
              mpPose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
              });
              mpPose.onResults((results: any) => {
                latestMediaPipeLandmarksRef.current = results.poseLandmarks || null;
              });
              mediapipePoseRef.current = mpPose;
              setPoseModelName('MediaPipe Pose Landmarker (33 Full-Body 3D)');
              enqueueSnackbar('✅ Google MediaPipe Pose Landmarker Active (33 Full-Body Landmarks)!', { variant: 'success' });
            }
          } catch (mpErr) {
            console.warn('MediaPipe Pose CDN load notice:', mpErr);
          }

          // Fallback: MoveNet Lightning
          if (!mediapipePoseRef.current) {
            if (!(window as any).tf) {
              await ensureScript('tfjs-cdn', 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
            }
            if (!(window as any).poseDetection) {
              await ensureScript('pose-detect-cdn', 'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js');
            }

            const tf = (window as any).tf;
            const poseDetection = (window as any).poseDetection;
            if (tf?.ready) await tf.ready();

            if (poseDetection) {
              detectorRef.current = await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
              );
              setPoseModelName('MoveNet Lightning Fallback (17 Keypoints)');
              enqueueSnackbar('✅ Pose Tracking Active — Move your body!', { variant: 'info' });
            }
          }
        } catch (err) {
          console.warn('Pose model load warning:', err);
        } finally {
          setPoseModelLoading(false);
        }
      }

      const loop = async () => {
        if (!activeLoopRef.current) return;

        const w = canvas.width, h = canvas.height;
        const video = videoRef.current;
        const detector = detectorRef.current;

        ctx.clearRect(0, 0, w, h);

        // ── WEBCAM BRANCH ────────────────────────────────────────────────
        if (cameraMode === 'WEBCAM') {
          if (video && video.readyState >= 2 && video.videoWidth > 0) {
            const sX = w / (video.videoWidth || w);
            const sY = h / (video.videoHeight || h);

            // 1. Draw mirrored live webcam video feed
            ctx.save();
            ctx.translate(w, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, w, h);
            ctx.restore();

            // Vignette for telemetry contrast
            const vig = ctx.createLinearGradient(0, h * 0.6, 0, h);
            vig.addColorStop(0, 'rgba(0,0,0,0)');
            vig.addColorStop(1, 'rgba(0,0,0,0.45)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, h * 0.6, w, h * 0.4);

            let pts: any[] = [];
            let isBadForm = false;
            let lAngle = 0, rAngle = 0, torso = 100, sym = 100, score = 95;
            let status = 'READY';
            let coachText = 'Ready — Stand tall and begin movement';

            // Send video frame to MediaPipe Pose if loaded
            if (mediapipePoseRef.current) {
              try {
                await mediapipePoseRef.current.send({ image: video });
              } catch {}
            }

            const mpLms = latestMediaPipeLandmarksRef.current;
            const hasMediaPipe = mpLms && mpLms.length >= 33;

            if (hasMediaPipe || detector) {
              try {
                let lSh = { x: 0, y: 0 }, rSh = { x: 0, y: 0 };
                let lEl = { x: 0, y: 0 }, rEl = { x: 0, y: 0 };
                let lHip = { x: 0, y: 0 }, rHip = { x: 0, y: 0 };
                let lKnee = { x: 0, y: 0 }, rKnee = { x: 0, y: 0 };
                let lAnkle = { x: 0, y: 0 }, rAnkle = { x: 0, y: 0 };
                let nose = { x: 0, y: 0 };

                if (hasMediaPipe) {
                  // ── MediaPipe 33 Landmark Processing ──
                  pts = mpLms.map((k: any) => ({
                    x: (k.visibility === undefined || k.visibility > 0.30) ? w - k.x * w : 0,
                    y: (k.visibility === undefined || k.visibility > 0.30) ? k.y * h : 0,
                    z: k.z || 0,
                  }));

                  nose = pts[0] || { x: 0, y: 0 };
                  lSh = pts[11] || { x: 0, y: 0 }; rSh = pts[12] || { x: 0, y: 0 };
                  lEl = pts[13] || { x: 0, y: 0 }; rEl = pts[14] || { x: 0, y: 0 };
                  lHip = pts[23] || { x: 0, y: 0 }; rHip = pts[24] || { x: 0, y: 0 };
                  lKnee = pts[25] || { x: 0, y: 0 }; rKnee = pts[26] || { x: 0, y: 0 };
                  lAnkle = pts[27] || { x: 0, y: 0 }; rAnkle = pts[28] || { x: 0, y: 0 };
                } else if (detector) {
                  // ── MoveNet Fallback Processing ──
                  const poses = await detector.estimatePoses(video, { flipHorizontal: false });
                  if (poses.length > 0 && poses[0]?.keypoints?.length >= 17) {
                    const kp = poses[0].keypoints;
                    const MIN_CONF = 0.28;
                    pts = kp.map((k: any) => ({
                      x: k.score > MIN_CONF ? w - k.x * sX : 0,
                      y: k.score > MIN_CONF ? k.y * sY : 0,
                    }));

                    nose = kp[0]?.score > MIN_CONF ? pts[0] : { x: 0, y: 0 };
                    lSh = kp[5]?.score > MIN_CONF ? pts[5] : { x: 0, y: 0 };
                    rSh = kp[6]?.score > MIN_CONF ? pts[6] : { x: 0, y: 0 };
                    lEl = kp[7]?.score > MIN_CONF ? pts[7] : { x: 0, y: 0 };
                    rEl = kp[8]?.score > MIN_CONF ? pts[8] : { x: 0, y: 0 };
                    lHip = kp[11]?.score > MIN_CONF ? pts[11] : { x: 0, y: 0 };
                    rHip = kp[12]?.score > MIN_CONF ? pts[12] : { x: 0, y: 0 };
                    lKnee = kp[13]?.score > MIN_CONF ? pts[13] : { x: 0, y: 0 };
                    rKnee = kp[14]?.score > MIN_CONF ? pts[14] : { x: 0, y: 0 };
                    lAnkle = kp[15]?.score > MIN_CONF ? pts[15] : { x: 0, y: 0 };
                    rAnkle = kp[16]?.score > MIN_CONF ? pts[16] : { x: 0, y: 0 };
                  }
                }

                // Identify active exercise protocol
                const curEx = selectedExerciseRef.current || selectedExercise;
                const isKneeSquat = curEx.includes('Knee') || curEx.includes('Squat') || curEx.includes('Nordic') || curEx.includes('Sit to Stand') || curEx.includes('Marching');
                const isHipAbd = curEx.includes('Hip Abduction') || curEx.includes('Single Leg');
                const isNeckSpine = curEx.includes('Cervical') || curEx.includes('Neck');
                const isLumbarTilt = curEx.includes('Lumbar') || curEx.includes('Pelvic') || curEx.includes('Core Tilt');
                const isUnilateralProtocol = curEx.includes('Post-Stroke') ||
                  curEx.includes('Hemiparetic') ||
                  curEx.includes('Lymphoedema') ||
                  curEx.includes('Single-Leg') ||
                  curEx.includes('Reach & Grasp') ||
                  curEx.includes('Knee Flexion Extension') ||
                  curEx.includes('Standing Hip Abduction');

                let rawLA = 0;
                let rawRA = 0;
                const midShX = (lSh.x > 0 && rSh.x > 0) ? (lSh.x + rSh.x) / 2 : (lSh.x || rSh.x || w / 2);
                const midShY = (lSh.y > 0 && rSh.y > 0) ? (lSh.y + rSh.y) / 2 : (lSh.y || rSh.y || h * 0.3);

                if (isKneeSquat) {
                  rawLA = getKneeFlexionAngle(lHip, lKnee, lAnkle);
                  rawRA = getKneeFlexionAngle(rHip, rKnee, rAnkle);
                } else if (isHipAbd) {
                  rawLA = getHipAbductionAngle(lHip, lAnkle);
                  rawRA = getHipAbductionAngle(rHip, rAnkle);
                } else if (isNeckSpine) {
                  const neckAngle = getNeckTiltAngle(nose, { x: midShX, y: midShY });
                  rawLA = neckAngle;
                  rawRA = neckAngle;
                } else {
                  // Default Shoulder / Upper Body Abduction and Elevation
                  rawLA = (lSh.x > 0 && lEl.x > 0) ? getAbductionAngle(lSh, lEl) : 0;
                  rawRA = (rSh.x > 0 && rEl.x > 0) ? getAbductionAngle(rSh, rEl) : 0;
                }

                // 5-frame moving average smoothing
                const smoothAvg = (arr: number[], val: number) => {
                  arr.push(val);
                  if (arr.length > 5) arr.shift();
                  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
                };

                lAngle = smoothAvg(lAngleHistRef.current, rawLA);
                rAngle = smoothAvg(rAngleHistRef.current, rawRA);

                // Vertical Spine Plumb Line for Torso Alignment
                if (lSh.x > 0 && rSh.x > 0 && lHip.x > 0 && rHip.x > 0) {
                  const midHipX = (lHip.x + rHip.x) / 2;
                  const midHipY = (lHip.y + rHip.y) / 2;
                  const spineDx = Math.abs(midShX - midHipX);
                  const spineDy = Math.abs(midHipY - midShY) || 1;
                  const spineTiltDeg = Math.atan2(spineDx, spineDy) * (180 / Math.PI);
                  const rawTorso = Math.max(30, Math.min(100, Math.round(100 - spineTiltDeg * 2.2)));
                  torso = smoothAvg(torsoHistRef.current, rawTorso);
                }

                // ── Left/Right Symmetry Calculation ──
                const motionAngle = Math.max(lAngle, rAngle);
                const angleDiff = Math.abs(lAngle - rAngle);

                if (isUnilateralProtocol) {
                  sym = torso > 70 ? 95 : Math.max(50, torso);
                } else {
                  const denom = Math.max(motionAngle, 35);
                  const rawSym = Math.max(15, Math.min(100, Math.round(100 - (angleDiff / denom) * 100)));
                  symHistRef.current.push(rawSym);
                  if (symHistRef.current.length > 5) symHistRef.current.shift();
                  sym = Math.round(symHistRef.current.reduce((a, b) => a + b, 0) / symHistRef.current.length);
                }

                // ── Sustained Form Fault Tracking (Avoids 1-frame glitches) ──
                const curStats = currentRepStatsRef.current;
                if (torso < 70) {
                  curStats.sustainedLeanFrames++;
                } else {
                  curStats.sustainedLeanFrames = Math.max(0, curStats.sustainedLeanFrames - 1);
                }
                if (motionAngle > 40 && angleDiff > 25 && !isUnilateralProtocol) {
                  curStats.sustainedAsymFrames++;
                } else {
                  curStats.sustainedAsymFrames = Math.max(0, curStats.sustainedAsymFrames - 1);
                }

                const isSustainedLean = curStats.sustainedLeanFrames >= 10;
                const isSustainedAsym = curStats.sustainedAsymFrames >= 10;
                if (isSustainedLean) curStats.hadSustainedLean = true;
                if (isSustainedAsym) curStats.hadSustainedAsym = true;
                isBadForm = isSustainedLean || isSustainedAsym;

                // ── DYNAMIC 5-STAGE MOVEMENT STATE MACHINE (REF-SYNCHRONIZED) ──
                // Stages: READY -> RAISING -> HOLDING -> LOWERING -> COMPLETED
                let targetRom = 120;
                let startThreshold = 30;
                let holdTargetRom = 85;
                let returnThreshold = 28;

                if (isKneeSquat) {
                  targetRom = 90;
                  startThreshold = 22;
                  holdTargetRom = 65;
                  returnThreshold = 20;
                } else if (isHipAbd) {
                  targetRom = 45;
                  startThreshold = 15;
                  holdTargetRom = 30;
                  returnThreshold = 12;
                } else if (isNeckSpine) {
                  targetRom = 45;
                  startThreshold = 14;
                  holdTargetRom = 25;
                  returnThreshold = 10;
                } else if (isLumbarTilt) {
                  targetRom = 30;
                  startThreshold = 10;
                  holdTargetRom = 20;
                  returnThreshold = 8;
                }

                const targetHold = targetHoldDurationRef.current || targetHoldDuration || 2.0;
                const currentStatus = exerciseStatusRef.current;

                if (currentStatus === 'READY') {
                  if (motionAngle >= startThreshold) {
                    updateExerciseStatus('RAISING');
                    curStats.peakLeft = lAngle;
                    curStats.peakRight = rAngle;
                    curStats.activeSymmetries = [sym];
                    curStats.activeTorsos = [torso];
                    curStats.holdStartTime = null;
                    curStats.holdDurationSec = 0;
                    curStats.hadSustainedLean = false;
                    curStats.hadSustainedAsym = false;
                    curStats.sustainedLeanFrames = 0;
                    curStats.sustainedAsymFrames = 0;
                    coachText = 'Smooth ascent toward target ROM';
                    status = 'RAISING';
                  } else {
                    status = 'READY';
                    coachText = 'Ready — Begin movement smoothly';
                  }
                } else if (currentStatus === 'RAISING') {
                  status = 'RAISING';
                  curStats.peakLeft = Math.max(curStats.peakLeft, lAngle);
                  curStats.peakRight = Math.max(curStats.peakRight, rAngle);
                  if (motionAngle > startThreshold + 10) {
                    curStats.activeSymmetries.push(sym);
                    curStats.activeTorsos.push(torso);
                  }

                  if (isSustainedLean) {
                    coachText = 'Keep your torso straight';
                    speakCoaching('Keep your torso straight');
                  } else if (isSustainedAsym && !isUnilateralProtocol) {
                    coachText = 'Lift both sides evenly';
                    speakCoaching('Lift both sides evenly');
                  } else if (motionAngle < holdTargetRom && motionAngle > startThreshold + 20) {
                    coachText = 'Elevate smoothly toward target ROM';
                  } else {
                    coachText = 'Ascending outward smoothly';
                  }

                  // Transition to HOLDING when target ROM reached
                  if (motionAngle >= holdTargetRom) {
                    updateExerciseStatus('HOLDING');
                    curStats.holdStartTime = Date.now();
                    status = 'HOLDING';
                    coachText = `Hold position (${targetHold.toFixed(0)}s)`;
                    speakCoaching('Hold position');
                    playBiofeedbackChime('PEAK_ROM');
                  } else if (motionAngle < Math.max(curStats.peakLeft, curStats.peakRight) - 15 && Math.max(curStats.peakLeft, curStats.peakRight) >= startThreshold + 15) {
                    // Patient began lowering before reaching full target ROM (Limited ROM repetition)
                    updateExerciseStatus('LOWERING');
                    status = 'LOWERING';
                    coachText = 'Lower with slow control';
                  }
                } else if (currentStatus === 'HOLDING') {
                  status = 'HOLDING';
                  curStats.peakLeft = Math.max(curStats.peakLeft, lAngle);
                  curStats.peakRight = Math.max(curStats.peakRight, rAngle);
                  curStats.activeSymmetries.push(sym);
                  curStats.activeTorsos.push(torso);

                  const holdElapsed = curStats.holdStartTime ? (Date.now() - curStats.holdStartTime) / 1000 : 0;
                  curStats.holdDurationSec = holdElapsed;
                  setCurrentHoldSec(holdElapsed);

                  const remHold = Math.max(0, targetHold - holdElapsed);
                  if (remHold > 0) {
                    coachText = `Hold position (${remHold.toFixed(1)}s remaining)`;
                  } else {
                    coachText = 'Hold complete! Now lower with control';
                  }

                  if (isSustainedLean) {
                    coachText = 'Keep your torso straight';
                    speakCoaching('Keep your torso straight');
                  }

                  // Transition to LOWERING when motion descends from peak
                  if (motionAngle < Math.max(curStats.peakLeft, curStats.peakRight) - 10 || motionAngle < holdTargetRom - 15) {
                    updateExerciseStatus('LOWERING');
                    status = 'LOWERING';
                    coachText = 'Lower with slow control';
                  }
                } else if (currentStatus === 'LOWERING') {
                  status = 'LOWERING';
                  curStats.activeSymmetries.push(sym);
                  curStats.activeTorsos.push(torso);

                  if (isSustainedLean) {
                    coachText = 'Keep your torso straight';
                  } else {
                    coachText = 'Lower with slow control';
                  }

                  // Transition to COMPLETED when returned to bottom rest position
                  if (motionAngle <= returnThreshold) {
                    updateExerciseStatus('READY');
                    status = 'COMPLETED';

                    const currentMaxReps = targetRepsRef.current || targetReps || 5;
                    const n = Math.min(repCountRef.current + 1, currentMaxReps);
                    repCountRef.current = n;
                    setRepCount(n);
                    playBiofeedbackChime(n >= currentMaxReps ? 'SET_DONE' : 'REP_DONE');

                    // Comprehensive Biomechanical Evaluation of Repetition
                    const peakRom = Math.max(curStats.peakLeft, curStats.peakRight);
                    const activeSyms = curStats.activeSymmetries;
                    const activeTors = curStats.activeTorsos;
                    const repSym = activeSyms.length > 0 ? Math.round(activeSyms.reduce((a, b) => a + b, 0) / activeSyms.length) : sym;
                    const repTor = activeTors.length > 0 ? Math.round(activeTors.reduce((a, b) => a + b, 0) / activeTors.length) : torso;
                    const holdTime = curStats.holdDurationSec;

                    const romSatisfied = peakRom >= (holdTargetRom * 0.88);
                    const holdSatisfied = holdTime >= (targetHold * 0.70);
                    const postureSatisfied = repTor >= 72 && !curStats.hadSustainedLean;
                    const symmetrySatisfied = isUnilateralProtocol || (repSym >= 70 && !curStats.hadSustainedAsym);

                    const isCleanRep = romSatisfied && holdSatisfied && postureSatisfied && symmetrySatisfied;

                    let repState: 'COMPLETED' | 'IMPROVE_FORM' = 'COMPLETED';
                    let formQuality = 'Optimal Form';
                    let repScore = 95;

                    if (isCleanRep) {
                      repState = 'COMPLETED';
                      formQuality = 'Optimal Form';
                      repScore = Math.min(100, Math.round(88 + (repSym * 0.06) + (repTor * 0.06)));
                      coachText = 'Good repetition!';
                      speakCoaching('Good repetition');
                    } else {
                      repState = 'IMPROVE_FORM';
                      if (!romSatisfied) {
                        formQuality = 'Limited Range of Motion';
                        repScore = Math.round(62 + (peakRom / Math.max(1, holdTargetRom)) * 18);
                        coachText = 'Raise higher towards target ROM';
                        speakCoaching('Raise higher');
                      } else if (!holdSatisfied) {
                        formQuality = 'Missing Hold Duration';
                        repScore = Math.round(68 + (holdTime / Math.max(1, targetHold)) * 18);
                        coachText = 'Missing hold duration';
                        speakCoaching('Hold position longer');
                      } else if (!postureSatisfied) {
                        formQuality = 'Torso Lean Detected';
                        repScore = Math.round(60 + (repTor / 100) * 20);
                        coachText = 'Keep your torso straight';
                        speakCoaching('Keep your torso straight');
                      } else {
                        formQuality = 'Asymmetry Detected';
                        repScore = Math.round(65 + (repSym / 100) * 20);
                        coachText = 'Lift both sides evenly';
                        speakCoaching('Lift both sides evenly');
                      }
                    }

                    const newRec: RepetitionRecord = {
                      repNumber: n,
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                      leftJointAngle: curStats.peakLeft || lAngle,
                      rightJointAngle: curStats.peakRight || rAngle,
                      symmetryScore: repSym,
                      torsoAlignment: repTor,
                      holdDurationSec: Number(holdTime.toFixed(1)),
                      movementScore: repScore,
                      movementState: repState,
                      formQuality: formQuality,
                      source: 'LIVE_CAMERA'
                    };

                    setRecordedReps(prev => {
                      const f = prev.filter(r => r.repNumber !== n);
                      return [...f, newRec].sort((a, b) => a.repNumber - b.repNumber);
                    });

                    // Reset stats for next repetition
                    curStats.peakLeft = 0;
                    curStats.peakRight = 0;
                    curStats.activeSymmetries = [];
                    curStats.activeTorsos = [];
                    curStats.holdStartTime = null;
                    curStats.holdDurationSec = 0;
                    curStats.hadSustainedLean = false;
                    curStats.hadSustainedAsym = false;
                    curStats.sustainedLeanFrames = 0;
                    curStats.sustainedAsymFrames = 0;
                  }
                }

                // Live Composite Movement Score
                const liveScore = Math.min(100, Math.max(40, Math.round(
                  (torso * 0.35) + (sym * 0.35) + (Math.min(30, (motionAngle / targetRom) * 30))
                )));
                score = liveScore;
                setMovementScore(score);
                setLeftShoulderDeg(lAngle);
                setRightShoulderDeg(rAngle);
                setTorsoAlignment(torso);
                setSymmetryScore(sym);
                setCoachingPrompt(coachText);

                drawSkeleton(pts, isBadForm);
              } catch { /* ignore */ }
            }

            drawHud(w, h, lAngle, rAngle, isBadForm, score, torso, sym, status, false, coachText, currentHoldSec);
            drawPiPReference(w, h);
          } else {
            // Camera initializing / loading
            ctx.fillStyle = '#0a0f1e';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#38bdf8';
            ctx.font = "bold 15px 'Segoe UI',sans-serif";
            ctx.textAlign = 'center';
            ctx.fillText('📹 Initializing Live Webcam Stream...', w / 2, h / 2);
            drawPiPReference(w, h);
          }

          animIdRef.current = requestAnimationFrame(() => { if (activeLoopRef.current) loop(); });
          return;
        }

        // ── SIMULATION BRANCH ─────────────────────────────────────────────
        simStep += 0.024;
        const cycle = Math.abs(Math.sin(simStep));
        const isBadForm = Math.sin(simStep * 0.42) < -0.55;
        const headX = w / 2, headY = h * 0.19;

        const proto = getPhysioProtocol(selectedExerciseRef.current || selectedExercise);
        const sim = proto.getSim(w, h, cycle, simStep, isBadForm, headX, headY);

          setLeftShoulderDeg(sim.lA); setRightShoulderDeg(sim.rA);
          setTorsoAlignment(sim.torso); setSymmetryScore(sim.sym);
          setMovementScore(sim.score); updateExerciseStatus(sim.status as any);

          // Rhythmic metronome pacing tick on cycle rhythm (ONLY if 60 BPM Pacing Metronome mode is explicitly active and unmuted)
          if (audioMode === 'METRONOME' && !isAudioMuted && audioVolume > 0) {
            const currentBeat = Math.floor(simStep / Math.PI);
            const prevBeat = Math.floor((simStep - 0.024) / Math.PI);
            if (currentBeat !== prevBeat) {
              playBiofeedbackChime('METRONOME');
            }
          }

          // Gentle peak ROM chime during simulation (ONLY if chimes are enabled and unmuted)
          if (chimesEnabled && !isAudioMuted && audioMode !== 'MUTED' && audioVolume > 0 && cycle > 0.85 && Date.now() - lastChimeTimeRef.current.peak > 2500) {
            lastChimeTimeRef.current.peak = Date.now();
            playBiofeedbackChime('PEAK_ROM');
          }

          // Rep counting (Visual counter for demonstration preview)
          if (cycle > 0.88 && !lastRepStateRef.current) {
            lastRepStateRef.current = true;
            const n = Math.min(repCountRef.current + 1, targetReps);
            repCountRef.current = n; setRepCount(n);

            // Play rep or set celebration chime (ONLY if chimes are enabled and unmuted)
            if (chimesEnabled && !isAudioMuted && audioMode !== 'MUTED' && audioVolume > 0) {
              playBiofeedbackChime(n >= targetReps ? 'SET_DONE' : 'REP_DONE');
            }
          } else if (cycle < 0.25) {
            lastRepStateRef.current = false;
          }

          const simPts = [
            { x: headX, y: headY }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
            sim.lSh, sim.rSh,
            sim.lEl, sim.rEl,
            sim.lWr, sim.rWr,
            sim.lHip, sim.rHip,
            sim.lKnee, sim.rKnee,
            sim.lAnkle, sim.rAnkle,
          ];
          if (demoAvatarMode === 'HUMAN_VIDEO') {
            // Hardware-accelerated real human video is rendered beneath the HUD canvas overlay
            ctx.clearRect(0, 0, w, h);
            if (demoVideoRef.current && mirrorActive && demoVideoRef.current.paused) {
              demoVideoRef.current.play().catch(() => {});
            }
          } else if (demoAvatarMode === 'HUMAN_FRONT' || demoAvatarMode === 'HUMAN_BACK') {
            if (canvas3DRef.current) {
              if (!threeSceneRef.current) {
                threeSceneRef.current = new Rehabilitation3DScene(canvas3DRef.current);
              }
              threeSceneRef.current.setFacingMode(demoAvatarMode === 'HUMAN_FRONT' ? 'FRONT' : 'BACK');
              threeSceneRef.current.updateFromSim(sim, w, h, selectedExerciseRef.current || selectedExercise);
              ctx.clearRect(0, 0, w, h);
            } else {
              drawRealisticHumanAvatar(simPts, sim, isBadForm, cycle);
            }
          } else {
            // Keep threeSceneRef alive when in WIREFRAME / SKELETON mode so toggling back to HUMAN mode is instantaneous without WebGL context loss
            // Dark grid background for AI wireframe
            const bg = ctx.createLinearGradient(0, 0, w, h);
            bg.addColorStop(0, '#1a1f35'); bg.addColorStop(0.45, '#243447'); bg.addColorStop(1, '#0f172a');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(255,255,255,0.02)'; ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
            drawSkeleton(simPts, isBadForm);
          }
          const simCoach = isBadForm ? 'Form Fault Detected — Keep your torso straight' : (cycle > 0.85 ? 'Hold position (2s)' : 'Good repetition');
          drawHud(w, h, sim.lA, sim.rA, isBadForm, sim.score, sim.torso, sim.sym, sim.status, true, simCoach, cycle > 0.85 ? 2.0 : 0);

          animIdRef.current = requestAnimationFrame(() => { if (activeLoopRef.current) loop(); });
        };

        loop();
      };

    runLoop();

    return () => {
      activeLoopRef.current = false;
      cancelAnimationFrame(animIdRef.current);
      // Dispose detector on mode change / unmount
      if (detectorRef.current && cameraMode !== 'WEBCAM') {
        detectorRef.current?.dispose?.();
        detectorRef.current = null;
      }
    };
  }, [mirrorActive, cameraMode, demoAvatarMode, selectedExercise, targetReps, enqueueSnackbar]);

  // Clean up WebGL 3D scenes only when component permanently unmounts
  useEffect(() => {
    return () => {
      if (threeSceneRef.current) {
        try { threeSceneRef.current.dispose(); } catch {}
        threeSceneRef.current = null;
      }
      if (pipThreeSceneRef.current) {
        try { pipThreeSceneRef.current.dispose(); } catch {}
        pipThreeSceneRef.current = null;
      }
    };
  }, []);

  // ─── Pin / Select Body Region & Load Clinical Preset ─────────────────────
  const handleSelectBodyRegion = (regionId: string) => {
    setSelectedBodyRegion(regionId);
    const reg = BODY_REGIONS.find(r => r.id === regionId);
    if (!reg) return;

    setSoapForm(prev => ({
      ...prev,
      selectedBodyPins: prev.selectedBodyPins.includes(reg.label)
        ? prev.selectedBodyPins
        : [...prev.selectedBodyPins, reg.label],
      diagnosis: reg.diagnosis,
      painVasScore: reg.painVasScore,
      soapSubjective: reg.soapSubjective,
      soapObjective: reg.soapObjective,
      soapAssessment: reg.soapAssessment,
      soapPlan: reg.soapPlan,
    }));
  };

  const toggleBodyPin = (label: string) => {
    setSoapForm(prev => {
      const exists = prev.selectedBodyPins.includes(label);
      return {
        ...prev,
        selectedBodyPins: exists
          ? prev.selectedBodyPins.filter(p => p !== label)
          : [...prev.selectedBodyPins, label]
      };
    });
  };

  // ─── Action Handlers ─────────────────────────────────────────────────────
  const handleSaveSOAPAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rehabilitation/episodes', {
        ...soapForm,
        bodyMapPins: soapForm.selectedBodyPins,
      });
      enqueueSnackbar('✅ SOAP Assessment & Body Map pin logged into Progressive Care Plan!', { variant: 'success' });
      setSoapModalOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to save SOAP assessment', { variant: 'error' });
    }
  };

  const handleRecordSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rehabilitation/sessions', {
        episodeId: selectedEpisodeId || episodes[0]?.id,
        ...sessionForm,
      });
      enqueueSnackbar('✅ Session delivered & 1 session deducted from package balance!', { variant: 'success' });
      setSessionDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to record therapy session logs', { variant: 'error' });
    }
  };

  // ─── Attach Live Kinematic Motion Audit to Patient EHR Chart ─────────────
  const handleAttachAiReportToEHR = async () => {
    if (attachingAiReport) return;
    setAttachingAiReport(true);
    try {
      const targetEp = selectedEpisode || episodes[0] || { id: 'REH-2026-001', patientName: 'Jane Doe', diagnosis: 'Post-OP Total Knee Arthroplasty' };
      const totalRecordedReps = recordedReps.length;
      const avgScore = totalRecordedReps > 0
        ? Math.round(recordedReps.reduce((s, r) => s + r.movementScore, 0) / totalRecordedReps)
        : movementScore;
      const peakAngle = totalRecordedReps > 0
        ? Math.max(...recordedReps.map(r => Math.max(r.leftJointAngle, r.rightJointAngle)))
        : Math.max(leftShoulderDeg, rightShoulderDeg);
      const avgTorso = totalRecordedReps > 0
        ? Math.round(recordedReps.reduce((s, r) => s + r.torsoAlignment, 0) / totalRecordedReps)
        : torsoAlignment;
      const formWarningsCount = recordedReps.filter(r => r.movementState === 'IMPROVE_FORM').length;

      // Attach Clinical Session Note to EHR and deduct exactly 1 session credit
      const res = await api.post('/rehabilitation/sessions', {
        episodeId: targetEp.id,
        patientName: targetEp.patientName,
        modalities: `Kinematic Biofeedback Movement Mirror (${selectedExercise})`,
        exercises: `${totalRecordedReps} Repetitions. Overall Movement Efficiency: ${avgScore}/100, Peak ROM: ${peakAngle}°, Form Warnings: ${formWarningsCount}`,
        prePainScore: targetEp.painVasScore || 5,
        postPainScore: Math.max(1, (targetEp.painVasScore || 5) - 1),
        patientResponse: `Live kinematic motion audit attached to patient chart. Patient completed ${totalRecordedReps} reps with ${avgScore}% overall form score.`,
      });

      const remCount = res?.data?.data?.sessionsRemaining;
      enqueueSnackbar(`✅ Kinematic Motion Audit (${totalRecordedReps} reps, ${avgScore}/100 score) attached to ${targetEp.patientName}'s EHR! ${remCount !== undefined ? `(${remCount} session(s) remaining)` : ''}`, { variant: 'success' });
      setAiReportModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.response?.status === 403) {
        enqueueSnackbar(err.response?.data?.message || '🔒 Access Locked: No paid sessions remaining. Please top up at Billing Desk.', { variant: 'error', autoHideDuration: 8000 });
      } else {
        enqueueSnackbar('Failed to attach kinematic motion audit to EHR', { variant: 'error' });
      }
    } finally {
      setAttachingAiReport(false);
    }
  };

  // ─── Printable Kinematic Motion Audit Clinical Report (PDF) ──────────────
  const handlePrintAiMotionReport = () => {
    const targetEp = selectedEpisode || episodes[0] || { patientName: 'Jane Doe', diagnosis: 'Shoulder Rotator Cuff Rehab', id: 'REH-2026-001', paymentStatus: 'BUNDLE_PAID' };
    const goalData = resolvePatientGoalAndProtocol(targetEp);
    const totalRecordedReps = recordedReps.length;
    const avgScore = totalRecordedReps > 0
      ? Math.round(recordedReps.reduce((s, r) => s + r.movementScore, 0) / totalRecordedReps)
      : movementScore;
    const peakAngle = totalRecordedReps > 0
      ? Math.max(...recordedReps.map(r => Math.max(r.leftJointAngle, r.rightJointAngle)))
      : Math.max(leftShoulderDeg, rightShoulderDeg);
    const avgTorso = totalRecordedReps > 0
      ? Math.round(recordedReps.reduce((s, r) => s + r.torsoAlignment, 0) / totalRecordedReps)
      : torsoAlignment;
    const formWarningsCount = recordedReps.filter(r => r.movementState === 'IMPROVE_FORM').length;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Kinematic Movement Audit Report - ${targetEp.patientName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #0f172a; }
            .header { text-align: center; border-bottom: 3px solid #06b6d4; padding-bottom: 12px; margin-bottom: 20px; }
            .hospital-title { font-size: 22px; font-weight: bold; }
            .sub-title { font-size: 13px; color: #64748b; margin-top: 4px; }
            .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
            .stat-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; background: #f8fafc; }
            .stat-val { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; text-align: left; }
            th { background: #f1f5f9; font-weight: 700; }
            .badge-ok { color: #16a34a; font-weight: bold; }
            .badge-warn { color: #ea580c; font-weight: bold; }
            .badge-manual { display: inline-block; background: #ede9fe; color: #6d28d9; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
            .badge-live { display: inline-block; background: #cffafe; color: #0891b2; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-title">FAITH FOUNDATION MISSION HOSPITAL</div>
            <div class="sub-title">DEPARTMENT OF PHYSIOTHERAPY & REHABILITATION MEDICINE</div>
            <div style="color: #06b6d4; font-weight: bold; margin-top: 6px;">OFFICIAL CLINICAL KINEMATIC MOVEMENT AUDIT REPORT</div>
          </div>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
            <div><strong>Patient:</strong> ${targetEp.patientName} (${targetEp.id})</div>
            <div><strong>Diagnosis / Indication:</strong> ${targetEp.diagnosis || 'Rehabilitation Care'}</div>
            <div><strong>Clinical Recovery Goal:</strong> <span style="color: #047857; font-weight: 700;">${goalData.recoveryGoal}</span></div>
            <div><strong>Prescribed Target Protocol:</strong> <strong>${selectedExercise}</strong></div>
            <div><strong>Attending Physio:</strong> Consultant Physiotherapist VEGHER</div>
            <div><strong>Session Timestamp:</strong> ${new Date().toLocaleString()}</div>
          </div>
          <div class="grid-4">
            <div class="stat-card"><div style="font-size: 11px; color: #64748b;">Overall Score</div><div class="stat-val" style="color: #16a34a;">${avgScore} / 100</div></div>
            <div class="stat-card"><div style="font-size: 11px; color: #64748b;">Peak Joint Angle</div><div class="stat-val" style="color: #0d9488;">${peakAngle}&deg;</div></div>
            <div class="stat-card"><div style="font-size: 11px; color: #64748b;">Torso Alignment</div><div class="stat-val">${avgTorso}%</div></div>
            <div class="stat-card"><div style="font-size: 11px; color: #64748b;">Form Warnings</div><div class="stat-val" style="color: #ea580c;">${formWarningsCount} Event${formWarningsCount !== 1 ? 's' : ''}</div></div>
          </div>
          <h3>Repetition Breakdown Audit Log</h3>
          <table>
            <thead>
              <tr>
                <th>Rep #</th><th>Method / Source</th><th>Time</th><th>Score</th><th>Left Joint Angle</th><th>Right Joint Angle</th><th>Symmetry</th><th>Hold</th><th>Form Quality</th><th>Clinical Notes</th>
              </tr>
            </thead>
            <tbody>
              ${recordedReps.map(r => `
                <tr>
                  <td>Rep ${String(r.repNumber).padStart(2, '0')}</td>
                  <td><span class="${r.source === 'MANUAL_ENTRY' ? 'badge-manual' : 'badge-live'}">${r.source === 'MANUAL_ENTRY' ? '✍️ Manual Entry' : '📹 Live CV'}</span></td>
                  <td>${r.time}</td>
                  <td style="font-weight: bold; color: ${r.movementScore >= 80 ? '#16a34a' : '#ea580c'}">${r.movementScore} / 100</td>
                  <td>${r.leftJointAngle}&deg;</td>
                  <td>${r.rightJointAngle}&deg;</td>
                  <td>${r.symmetryScore}%</td>
                  <td>${r.holdDurationSec !== undefined ? r.holdDurationSec + 's / ' + targetHoldDuration + 's' : targetHoldDuration + 's'}</td>
                  <td class="${r.movementState === 'COMPLETED' ? 'badge-ok' : 'badge-warn'}">${r.formQuality}</td>
                  <td style="color: #475569; font-style: italic;">${r.notes || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 30px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px;">
            Faith Foundation HMIS &bull; Clinical Kinematic Biofeedback Mirror &bull; Certified Medical Record
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ─── Printable Home Exercise Program (HEP PDF) ───────────────────────────
  const handlePrintHEP = (ep: any) => {
    setSelectedEpisode(ep);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Home Exercise Program (HEP) - ${ep.patientName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #0f172a; }
            .header { text-align: center; border-bottom: 3px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; }
            .hospital-title { font-size: 24px; font-weight: bold; }
            .sub-title { font-size: 14px; color: #64748b; margin-top: 4px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; background: #f0fdf4; padding: 14px; border-radius: 8px; border: 1px solid #bbf7d0; margin-bottom: 20px; }
            .section-box { border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; margin-bottom: 16px; background: #fafafa; }
            .exercise-item { border-left: 4px solid #0d9488; padding-left: 12px; margin-bottom: 12px; }
            .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 12px; text-align: center; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-title">FAITH FOUNDATION MISSION HOSPITAL</div>
            <div class="sub-title">DEPARTMENT OF PHYSIOTHERAPY & REHABILITATION MEDICINE</div>
            <div style="font-size: 13px; color: #0d9488; font-weight: bold; margin-top: 6px;">OFFICIAL PATIENT HOME EXERCISE PROGRAM (HEP) PRESCRIPTION</div>
          </div>
          <div class="info-grid">
            <div><strong>Patient Name:</strong> ${ep.patientName} (${ep.id})</div>
            <div><strong>Clinical Diagnosis:</strong> ${ep.diagnosis}</div>
            <div><strong>Attending Physio:</strong> Physiotherapist VEGHER (Senior PT)</div>
            <div><strong>Rehab Package:</strong> ${ep.paymentStatus}</div>
          </div>
          <div class="section-box">
            <h3 style="margin-top:0; color:#0f172a;">🎯 Prescribed Home Exercises & Frequency</h3>
            <div class="exercise-item">
              <strong>1. Active Quadriceps Isometric Sets</strong>
              <p style="margin: 4px 0; font-size: 13px; color: #475569;">Lie flat on back, press back of knee downward into bed. Hold 5 seconds. Repeat 10 times, 3 sets daily.</p>
            </div>
            <div class="exercise-item">
              <strong>2. Heel Slides for Knee Flexion</strong>
              <p style="margin: 4px 0; font-size: 13px; color: #475569;">Slide heel toward buttocks maintaining heel contact with bed. Hold at end-range 5 seconds. 15 reps, 2 sets daily.</p>
            </div>
            <div class="exercise-item">
              <strong>3. Core Bridging & Pelvic Tilts</strong>
              <p style="margin: 4px 0; font-size: 13px; color: #475569;">Bend knees, lift hips off bed engaging gluteals. Hold for 5 seconds. 12 reps, 3 sets daily.</p>
            </div>
          </div>
          <div class="section-box">
            <h3 style="margin-top:0; color:#dc2626;">⚠️ Safety Precautions & Pain Limits</h3>
            <p style="font-size: 13px; color: #334155;">Stop exercises immediately if pain VAS exceeds 6/10 or if sudden swelling occurs. Apply ice pack for 15 minutes post-exercise.</p>
          </div>
          <div class="footer">
            <p>Certified by Licensed Senior Physiotherapist · QR Verification: QR-HEP-${ep.id}</p>
            <p>Smart Hospital HMIS · Progressive Rehabilitation Division</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter episodes by Outpatient Gym vs Inpatient Bedside
  const filteredEpisodes = episodes.filter(ep => {
    if (careSettingFilter === 'OUTPATIENT_GYM') return ep.careSetting === 'OUTPATIENT_GYM';
    if (careSettingFilter === 'INPATIENT_BEDSIDE') return ep.careSetting === 'INPATIENT_BEDSIDE';
    return true;
  });

  // Mock trend data for Recovery Graph
  const recoveryTrendData = [
    { week: 'Week 1', painVas: 8, flexRom: 45, strength: 2 },
    { week: 'Week 2', painVas: 7, flexRom: 60, strength: 3 },
    { week: 'Week 3', painVas: 6, flexRom: 75, strength: 3.5 },
    { week: 'Week 4', painVas: 4, flexRom: 90, strength: 4 },
    { week: 'Week 5', painVas: 3, flexRom: 110, strength: 4.5 },
    { week: 'Week 6', painVas: 2, flexRom: 125, strength: 5 },
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* ── HEADER & CARE SETTING TOGGLE ─────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: PRIMARY, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 1.5, fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
            <AccessibilityNew sx={{ fontSize: { xs: 28, sm: 36 }, color: TEAL }} /> Physiotherapy & Rehabilitation Progressive Suite
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Paperless Electronic Referrals · SOAP Assessment · Rehabilitation Exercise Analysis System · Package Session Tracking
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Care Setting Filter (Commented out):
          <Paper sx={{ p: '4px 12px', bgcolor: '#fff', borderRadius: 3, border: '1px solid #cbd5e1' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 800, color: PRIMARY }}>Care Setting Filter:</Typography>
              <Chip
                label="All Patients"
                size="small"
                clickable
                color={careSettingFilter === 'ALL' ? 'primary' : 'default'}
                onClick={() => setCareSettingFilter('ALL')}
              />
              <Chip
                icon={<FitnessCenter fontSize="small" />}
                label="Outpatient Gym"
                size="small"
                clickable
                color={careSettingFilter === 'OUTPATIENT_GYM' ? 'info' : 'default'}
                onClick={() => setCareSettingFilter('OUTPATIENT_GYM')}
              />
              <Chip
                icon={<Hotel fontSize="small" />}
                label="Inpatient Ward Bedside"
                size="small"
                clickable
                color={careSettingFilter === 'INPATIENT_BEDSIDE' ? 'warning' : 'default'}
                onClick={() => setCareSettingFilter('INPATIENT_BEDSIDE')}
              />
            </Stack>
          </Paper>
          */}

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" gap={1}>
            <Button
              variant="outlined"
              startIcon={<CreditCard />}
              onClick={() => setExternalIntakeModalOpen(true)}
              sx={{ borderColor: '#8b5cf6', color: '#6d28d9', fontWeight: 800, bgcolor: '#f5f3ff' }}
            >
              + Quick Register External Client
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* ── KPI METRICS BAR ──────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Active Progressive Episodes" value={episodes.length} sub="Ongoing Care Journeys" icon={<AccessibilityNew />} color={PRIMARY} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Pending Electronic Referrals" value={`${referrals.filter(r => r.status === 'PENDING').length} Referrals`} sub="Wards & Specialist Clinics" icon={<Assignment />} color={WARNING} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Daily Gym & Bedside Schedule" value={`${schedule.length} Booked Today`} sub="Inpatient & External Intake" icon={<CalendarMonth />} color={CYAN} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Rehab Package Revenue" value="₦1,420,000" sub="100% Settled Bundles" icon={<ReceiptLong />} color={TEAL} />
        </Grid>
      </Grid>

      {/* ── MAIN WORKSPACE TABS ──────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 3, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => {
            setActiveTab(v);
            const routes = ['mirror', 'referrals', 'schedule', 'sessions', 'plans', 'progress', 'equipment', 'hep'];
            navigate(`/rehabilitation/${routes[v]}`);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid #e2e8f0', px: 2 }}
        >
          <Tab icon={<AutoAwesome sx={{ color: CYAN }} />} iconPosition="start" label="🎯 Rehabilitation Exercise Analysis System" sx={{ fontWeight: 900, color: CYAN }} />
          <Tab
            icon={
              <Badge badgeContent={referrals.filter(r => r.status === 'PENDING').length} color="error">
                <Assignment />
              </Badge>
            }
            iconPosition="start"
            label="Pending Referrals & Active Queue"
            sx={{ fontWeight: 800, textTransform: 'none' }}
          />
          <Tab
            icon={
              <Badge badgeContent={schedule.length} color="info">
                <CalendarMonth />
              </Badge>
            }
            iconPosition="start"
            label="Daily Gym & Bedside Schedule"
            sx={{ fontWeight: 800, textTransform: 'none' }}
          />
          <Tab icon={<FormatListNumbered />} iconPosition="start" label="Package Tracker & Billing Gatekeeper" sx={{ fontWeight: 800, textTransform: 'none' }} />
          <Tab icon={<RateReview />} iconPosition="start" label="SOAP Assessment & Body Map" sx={{ fontWeight: 800, textTransform: 'none' }} />
          <Tab icon={<Speed />} iconPosition="start" label="Recovery Graphs & Outcome Trends" sx={{ fontWeight: 800, textTransform: 'none' }} />
          <Tab icon={<FitnessCenter />} iconPosition="start" label="Modality & Equipment Registry" sx={{ fontWeight: 800, textTransform: 'none' }} />
          <Tab icon={<Print />} iconPosition="start" label="Home Exercise Program (HEP)" sx={{ fontWeight: 800, textTransform: 'none' }} />
        </Tabs>

        {/* ── TAB 0: 🪞 KINEMATIC BIOFEEDBACK MOTION MIRROR WORKSPACE ───────────── */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>

            {/* ── 1. PATIENT BINDING & EHR SESSION ARCHIVAL BANNER ── */}
            <Paper variant="outlined" sx={{
              p: 2, mb: 2.5, borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))',
              border: '1px solid rgba(56,189,248,0.3)',
              color: '#fff',
              overflow: 'hidden'
            }}>
              <Grid container spacing={2} alignItems="center">
                {/* 1. Patient Selector Box */}
                <Grid item xs={12} md={5} lg={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'rgba(56,189,248,0.2)', color: '#38bdf8', width: 42, height: 42, flexShrink: 0 }}>
                      <AccountCircle sx={{ fontSize: 26 }} />
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.68rem' }}>
                        Active Patient EHR Session Binding
                      </Typography>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={selectedEpisode?.id || boundEpisodeId || (episodes[0]?.id || '')}
                        onChange={(e) => {
                          const epId = e.target.value;
                          setBoundEpisodeId(epId);
                          const found = episodes.find(ep => ep.id === epId);
                          if (found) {
                            setSelectedEpisode(found);
                            const { targetExercise, recoveryGoal } = resolvePatientGoalAndProtocol(found);
                            if (targetExercise && PHYSIO_PROTOCOLS[targetExercise]) {
                              setSelectedExercise(targetExercise);
                              selectedExerciseRef.current = targetExercise;
                            }
                            setRepCount(0);
                            repCountRef.current = 0;
                            setRecordedReps([]);
                            enqueueSnackbar(`👤 Patient bound: ${found.patientName} — Matched Protocol: ${PHYSIO_PROTOCOLS[targetExercise]?.shortName || targetExercise}`, { variant: 'info' });
                          }
                        }}
                        sx={{
                          mt: 0.5,
                          bgcolor: 'rgba(15,23,42,0.7)',
                          borderRadius: 1.5,
                          '& .MuiOutlinedInput-root': {
                            color: '#38bdf8',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            '& fieldset': { borderColor: 'rgba(56,189,248,0.4)' },
                            '&:hover fieldset': { borderColor: '#38bdf8' }
                          },
                          '& .MuiSvgIcon-root': { color: '#38bdf8' }
                        }}
                      >
                        {episodes.map(ep => (
                          <MenuItem key={ep.id} value={ep.id} sx={{ color: '#0f172a', fontWeight: 700, fontSize: '0.84rem' }}>
                            👤 {ep.patientName} ({ep.id}) · {ep.diagnosis} ({ep.careSetting || 'OUTPATIENT'})
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Box>
                </Grid>

                {/* 2. Patient Clinical Summary & Goal Banner (Auto-Wrapping & No Overflow) */}
                <Grid item xs={12} md={7} lg={5.5}>
                  {selectedEpisode && (() => {
                    const sTotal = selectedEpisode.packageTotal || selectedEpisode.totalSessionsPlanned || 10;
                    const sUsed = selectedEpisode.sessionsCompleted || 0;
                    const sRemaining = Math.max(0, sTotal - sUsed);
                    const isLocked = sRemaining <= 0;
                    const { targetExercise: resolvedProtocol, recoveryGoal: resolvedGoal } = resolvePatientGoalAndProtocol(selectedEpisode);

                    return (
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center', mb: 0.6 }}>
                          <Chip
                            size="small"
                            label={selectedEpisode.careSetting === 'INPATIENT' ? `🏥 Inpatient · ${selectedEpisode.inpatientWard || 'Ward'}` : '🚶 Outpatient'}
                            sx={{ bgcolor: 'rgba(14,165,233,0.2)', color: '#38bdf8', fontWeight: 800, fontSize: '0.72rem' }}
                          />
                          <Chip
                            size="small"
                            label={isLocked ? '🔒 0 Paid Sessions Left' : `🎟️ ${sRemaining} Session(s) Remaining (${sUsed}/${sTotal} Used)`}
                            sx={{
                              bgcolor: isLocked ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.2)',
                              color: isLocked ? '#f87171' : '#4ade80',
                              fontWeight: 800,
                              fontSize: '0.72rem',
                              border: isLocked ? '1px solid #ef4444' : 'none'
                            }}
                          />
                          <Chip
                            size="small"
                            label={`🎯 Protocol: ${PHYSIO_PROTOCOLS[selectedExercise]?.shortName || selectedExercise}`}
                            sx={{ bgcolor: 'rgba(168,85,247,0.2)', color: '#c084fc', fontWeight: 800, fontSize: '0.72rem', maxWidth: '100%' }}
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            color: isLocked ? '#fca5a5' : '#cbd5e1',
                            display: 'block',
                            fontSize: '0.74rem',
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                            whiteSpace: 'normal'
                          }}
                        >
                          {isLocked ? (
                            '⚠️ All paid sessions used. Please top up at Reception / Billing Desk to unlock.'
                          ) : (
                            <>
                              Dx: <strong style={{ color: '#fff' }}>{selectedEpisode.diagnosis}</strong> · Goal: <strong style={{ color: '#38bdf8' }}>{resolvedGoal}</strong>
                            </>
                          )}
                        </Typography>
                      </Box>
                    );
                  })()}
                </Grid>

                {/* 3. Attach to EHR Action Button */}
                <Grid item xs={12} lg={2.5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}>
                  <Button
                    variant="contained"
                    startIcon={attachingAiReport ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    onClick={handleAttachAiReportToEHR}
                    disabled={attachingAiReport}
                    sx={{
                      bgcolor: '#22c55e',
                      color: '#0f172a',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      textTransform: 'none',
                      px: 2, py: 0.9,
                      width: { xs: '100%', lg: 'auto' },
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
                      '&:hover': { bgcolor: '#16a34a' }
                    }}
                  >
                    {attachingAiReport ? 'Saving to EHR...' : '💾 Save & Attach Audit to Patient EHR'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* ── 2. MIRROR TOP CONTROLS (Routine Selector & Action Bar) ── */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2.5, bgcolor: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
              {/* TIER 1: Exercise Protocol / Routine Selection & Presentation Actions */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: { xs: 'wrap', lg: 'nowrap' },
                mb: 1.8,
                pb: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                {/* Left: Exercise Protocol / Routine Selector Dropdown */}
                <Box sx={{ flex: { xs: '1 1 100%', lg: '1 1 auto' }, minWidth: { sm: 340 } }}>
                  {!routineMode ? (
                    <TextField
                      select
                      label="Target Exercise Protocol"
                      size="small"
                      fullWidth
                      value={selectedExercise}
                      onChange={e => setSelectedExercise(e.target.value)}
                      SelectProps={{
                        MenuProps: { PaperProps: { sx: { maxHeight: 420, bgcolor: '#0f172a', color: '#fff' } } }
                      }}
                      sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1.5, '& .MuiInputBase-input': { color: '#fff', fontWeight: 600 }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
                    >
                      {PHYSIO_CATEGORIES.map(cat => {
                        const catProtocols = Object.values(PHYSIO_PROTOCOLS).filter(p => p.category === cat);
                        return [
                          <ListSubheader key={cat} sx={{ bgcolor: '#1e293b', color: '#38bdf8', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '32px' }}>
                            {cat}
                          </ListSubheader>,
                          ...catProtocols.map(p => (
                            <MenuItem key={p.id} value={p.id} sx={{ color: '#fff', fontSize: '0.85rem', '&:hover': { bgcolor: 'rgba(6,182,212,0.15)' } }}>
                              <span style={{ marginRight: '8px' }}>{p.icon}</span> {p.shortName}
                            </MenuItem>
                          ))
                        ];
                      })}
                    </TextField>
                  ) : (
                    <Box>
                      <TextField
                        select
                        label="Active Clinical Routine Group"
                        size="small"
                        fullWidth
                        value={selectedRoutineId}
                        onChange={e => {
                          const rId = e.target.value;
                          setSelectedRoutineId(rId);
                          const r = PHYSIO_ROUTINES.find(item => item.id === rId);
                          if (r) {
                            setRoutineExerciseIdx(0);
                            const firstEx = r.exercises[0];
                            setSelectedExercise(firstEx);
                            selectedExerciseRef.current = firstEx;
                            setRoutineSecondsLeft(r.defaultDurationSec);
                            setRepCount(0);
                            repCountRef.current = 0;
                            setRecordedReps([]);
                          }
                        }}
                        SelectProps={{
                          MenuProps: { PaperProps: { sx: { maxHeight: 380, bgcolor: '#0f172a', color: '#fff' } } }
                        }}
                        sx={{ bgcolor: 'rgba(56,189,248,0.12)', borderRadius: 1.5, '& .MuiInputBase-input': { color: '#38bdf8', fontWeight: 800 }, '& .MuiInputLabel-root': { color: '#38bdf8' } }}
                      >
                        {PHYSIO_ROUTINES.map(r => (
                          <MenuItem key={r.id} value={r.id} sx={{ color: '#fff', fontSize: '0.84rem' }}>
                            <span style={{ marginRight: '8px' }}>{r.icon}</span> {r.name} ({r.exercises.length} Exercises)
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  )}
                </Box>

                {/* Right: Routine Mode Toggle, Manual Rep Entry, Video Upload, Fullscreen & Clinical Report */}
                <Stack direction="row" spacing={1} alignItems="center" flexShrink={0} flexWrap="wrap">
                  {/* Auto-Routine Mode Button */}
                  <Tooltip title={routineMode ? "Disable Auto-Switch Routine Mode" : "Enable Auto-Switch Routine Group Mode"}>
                    <Button
                      variant={routineMode ? "contained" : "outlined"}
                      onClick={() => {
                        const next = !routineMode;
                        setRoutineMode(next);
                        if (next) {
                          const r = PHYSIO_ROUTINES.find(item => item.id === selectedRoutineId) || PHYSIO_ROUTINES[0];
                          setRoutineSecondsLeft(r.defaultDurationSec);
                          enqueueSnackbar(`🔄 Auto-Switch Routine Mode ON: Cycling through ${r.name}`, { variant: 'info' });
                        } else {
                          enqueueSnackbar('Single Exercise Protocol Mode activated', { variant: 'info' });
                        }
                      }}
                      sx={{
                        bgcolor: routineMode ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.05)',
                        borderColor: routineMode ? '#c084fc' : 'rgba(255,255,255,0.25)',
                        color: routineMode ? '#e9d5ff' : '#cbd5e1',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                        py: 0.8,
                        px: 1.3,
                      }}
                    >
                      {routineMode ? '🔄 Routine: ON' : '🔄 Routine: OFF'}
                    </Button>
                  </Tooltip>

                  {/* Manual Rep Entry Action Button */}
                  <Tooltip title="Manually record & log movement repetitions (Goniometer angle / Clinical observations)">
                    <Button
                      variant="contained"
                      startIcon={<EditNote sx={{ fontSize: 18 }} />}
                      onClick={() => setManualRepModalOpen(true)}
                      sx={{
                        bgcolor: '#8b5cf6',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '0.74rem',
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                        py: 0.8,
                        px: 1.5,
                        boxShadow: '0 2px 10px rgba(139,92,246,0.35)',
                        '&:hover': { bgcolor: '#7c3aed' }
                      }}
                    >
                      ✍️ Manual Rep Entry
                    </Button>
                  </Tooltip>

                  {/* Upload Real Human Video Button */}
                  <Tooltip title="Upload custom real human video demonstration (MP4/WebM)">
                    <Button
                      variant="outlined"
                      startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
                      onClick={() => fileVideoInputRef.current?.click()}
                      sx={{
                        color: '#f43f5e',
                        borderColor: 'rgba(244,63,94,0.4)',
                        bgcolor: 'rgba(244,63,94,0.06)',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                        py: 0.8,
                        px: 1.3,
                        '&:hover': { bgcolor: 'rgba(244,63,94,0.15)', borderColor: '#f43f5e' }
                      }}
                    >
                      Upload Video
                    </Button>
                  </Tooltip>

                  {/* Fullscreen Presentation Button */}
                  <Tooltip title="Fullscreen Presentation / Slide Show Mode">
                    <Button
                      variant="outlined"
                      startIcon={isFullscreen ? <FullscreenExit sx={{ fontSize: 16 }} /> : <Fullscreen sx={{ fontSize: 16 }} />}
                      onClick={toggleFullscreenMode}
                      sx={{
                        color: '#38bdf8',
                        borderColor: 'rgba(56,189,248,0.5)',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                        py: 0.8,
                        px: 1.3,
                        '&:hover': { bgcolor: 'rgba(56,189,248,0.15)', borderColor: '#38bdf8' }
                      }}
                    >
                      {isFullscreen ? 'Exit' : '⛶ Fullscreen'}
                    </Button>
                  </Tooltip>

                  {/* Audit Report Button */}
                  <Button
                    variant="contained"
                    startIcon={<Assessment sx={{ fontSize: 16 }} />}
                    onClick={() => setAiReportModalOpen(true)}
                    sx={{
                      bgcolor: CYAN,
                      color: '#0f172a',
                      fontWeight: 900,
                      fontSize: '0.74rem',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      py: 0.8,
                      px: 1.5,
                      '&:hover': { bgcolor: '#0891b2', color: '#fff' }
                    }}
                  >
                    Audit Report
                  </Button>
                </Stack>
              </Box>

              {/* TIER 2: Session Playback & Trainer Demonstration Engine Toolbar */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: { xs: 'wrap', md: 'nowrap' }
              }}>
                {/* Left: Play/Pause and Live/Demo Mode Switcher */}
                <Stack direction="row" spacing={1.5} alignItems="center" flexShrink={0}>
                  {/* Play / Pause Demo Button */}
                  <Button
                    variant="contained"
                    color={mirrorActive ? 'error' : (cameraMode === 'WEBCAM' ? 'success' : 'info')}
                    startIcon={mirrorActive ? <Pause /> : <PlayArrow />}
                    onClick={() => {
                      if (!mirrorActive && repCount >= targetReps) {
                        setRepCount(0);
                        repCountRef.current = 0;
                        setRecordedReps([]);
                      }
                      setMirrorActive(!mirrorActive);
                    }}
                    sx={{
                      fontWeight: 800,
                      minWidth: 145,
                      py: 0.85,
                      px: 2,
                      fontSize: '0.82rem',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    }}
                  >
                    {mirrorActive
                      ? (cameraMode === 'WEBCAM' ? '⏸️ Pause Tracking' : '⏸️ Pause Demo')
                      : (cameraMode === 'WEBCAM' ? '▶️ Start Live' : '▶️ Play Demo')}
                  </Button>

                  {/* Mode Toggle (Live vs Demo) */}
                  <Button
                    variant={cameraMode === 'WEBCAM' ? 'contained' : 'outlined'}
                    color={cameraMode === 'WEBCAM' ? 'success' : 'inherit'}
                    startIcon={cameraMode === 'WEBCAM' ? <Videocam /> : <CameraAlt />}
                    onClick={() => {
                      const nextMode = cameraMode === 'WEBCAM' ? 'SIMULATION' : 'WEBCAM';
                      setCameraMode(nextMode);
                      setMirrorActive(true);
                      setRepCount(0);
                      repCountRef.current = 0;
                      setRecordedReps([]);
                      updateExerciseStatus('READY');
                      currentRepStatsRef.current = {
                        peakLeft: 0,
                        peakRight: 0,
                        activeSymmetries: [],
                        activeTorsos: [],
                        holdStartTime: null,
                        holdDurationSec: 0,
                        sustainedLeanFrames: 0,
                        sustainedAsymFrames: 0,
                        hadSustainedLean: false,
                        hadSustainedAsym: false,
                      };
                    }}
                    sx={{
                      color: '#fff',
                      borderColor: cameraMode === 'WEBCAM' ? '#22c55e' : 'rgba(255,255,255,0.3)',
                      fontWeight: 800,
                      fontSize: '0.80rem',
                      whiteSpace: 'nowrap',
                      py: 0.85,
                      px: 1.8,
                      bgcolor: cameraMode === 'WEBCAM' ? '#16a34a' : 'rgba(255,255,255,0.06)',
                      '&:hover': { bgcolor: cameraMode === 'WEBCAM' ? '#15803d' : 'rgba(255,255,255,0.15)' }
                    }}
                  >
                    {cameraMode === 'WEBCAM' ? '📹 LIVE CAMERA' : '🎮 DEMO MODE'}
                  </Button>
                </Stack>

                {/* Right: Trainer Demonstration Mode Selector */}
                {cameraMode === 'SIMULATION' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'nowrap' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
                      Trainer View:
                    </Typography>
                    <ButtonGroup
                      size="small"
                      sx={{
                        bgcolor: 'rgba(15,23,42,0.95)',
                        borderRadius: 2,
                        p: 0.35,
                        border: '1px solid rgba(255,255,255,0.2)',
                        flexShrink: 0,
                      }}
                    >
                      {/* Real Human Trainer (Video) */}
                      <Tooltip title="Real Human Physical Therapist Demonstration Video">
                        <Button
                          variant={demoAvatarMode === 'HUMAN_VIDEO' ? 'contained' : 'text'}
                          onClick={() => setDemoAvatarMode('HUMAN_VIDEO')}
                          startIcon={<PlayCircleOutline sx={{ fontSize: 16 }} />}
                          sx={{
                            color: '#fff',
                            bgcolor: demoAvatarMode === 'HUMAN_VIDEO' ? '#e11d48' : 'transparent',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            px: 1.3,
                            py: 0.6,
                            '&:hover': { bgcolor: demoAvatarMode === 'HUMAN_VIDEO' ? '#be123c' : 'rgba(255,255,255,0.08)' }
                          }}
                        >
                          🎥 Real Human Trainer
                        </Button>
                      </Tooltip>

                      {/* 3D Human Model Front */}
                      <Tooltip title="3D Realistic Human Model Front / Instructor View">
                        <Button
                          variant={demoAvatarMode === 'HUMAN_FRONT' ? 'contained' : 'text'}
                          onClick={() => setDemoAvatarMode('HUMAN_FRONT')}
                          startIcon={<Person sx={{ fontSize: 16 }} />}
                          sx={{
                            color: '#fff',
                            bgcolor: demoAvatarMode === 'HUMAN_FRONT' ? '#0284c7' : 'transparent',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            px: 1.2,
                            py: 0.6,
                            '&:hover': { bgcolor: demoAvatarMode === 'HUMAN_FRONT' ? '#0369a1' : 'rgba(255,255,255,0.08)' }
                          }}
                        >
                          👤 3D Front
                        </Button>
                      </Tooltip>

                      {/* 3D Human Model Back */}
                      <Tooltip title="3D Realistic Human Model Back / Mirror View">
                        <Button
                          variant={demoAvatarMode === 'HUMAN_BACK' ? 'contained' : 'text'}
                          onClick={() => setDemoAvatarMode('HUMAN_BACK')}
                          startIcon={<AccessibilityNew sx={{ fontSize: 16 }} />}
                          sx={{
                            color: '#fff',
                            bgcolor: demoAvatarMode === 'HUMAN_BACK' ? '#6366f1' : 'transparent',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            px: 1.2,
                            py: 0.6,
                            '&:hover': { bgcolor: demoAvatarMode === 'HUMAN_BACK' ? '#4f46e5' : 'rgba(255,255,255,0.08)' }
                          }}
                        >
                          🔙 3D Back
                        </Button>
                      </Tooltip>

                      {/* Holographic AI Joint Wireframe */}
                      <Tooltip title="Holographic AI Joint Wireframe">
                        <Button
                          variant={demoAvatarMode === 'SKELETON' ? 'contained' : 'text'}
                          onClick={() => setDemoAvatarMode('SKELETON')}
                          startIcon={<AutoAwesome sx={{ fontSize: 16 }} />}
                          sx={{
                            color: '#fff',
                            bgcolor: demoAvatarMode === 'SKELETON' ? '#10b981' : 'transparent',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            px: 1.2,
                            py: 0.6,
                            '&:hover': { bgcolor: demoAvatarMode === 'SKELETON' ? '#059669' : 'rgba(255,255,255,0.08)' }
                          }}
                        >
                          ⚡ Skeleton
                        </Button>
                      </Tooltip>
                    </ButtonGroup>
                  </Box>
                )}
              </Box>

              {/* Routine Progress Sub-Bar (When Routine Mode is Active) */}
              {routineMode && (
                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  {(() => {
                    const currentRoutine = PHYSIO_ROUTINES.find(r => r.id === selectedRoutineId) || PHYSIO_ROUTINES[0];
                    return (
                      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Chip
                            size="small"
                            icon={<HourglassTop sx={{ color: '#fff !important' }} />}
                            label={`Step ${routineExerciseIdx + 1} of ${currentRoutine.exercises.length}: ${selectedExercise}`}
                            sx={{ bgcolor: 'rgba(168,85,247,0.3)', color: '#e9d5ff', fontWeight: 800, fontSize: '0.75rem', border: '1px solid rgba(168,85,247,0.5)' }}
                          />
                          <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.78rem' }}>
                            ⏱️ Auto-advancing in <strong>{routineSecondsLeft}s</strong>
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SkipPrevious />}
                            onClick={() => {
                              const prevIdx = (routineExerciseIdx - 1 + currentRoutine.exercises.length) % currentRoutine.exercises.length;
                              const prevEx = currentRoutine.exercises[prevIdx];
                              setRoutineExerciseIdx(prevIdx);
                              setSelectedExercise(prevEx);
                              selectedExerciseRef.current = prevEx;
                              setRoutineSecondsLeft(currentRoutine.defaultDurationSec);
                              setRepCount(0);
                              repCountRef.current = 0;
                            }}
                            sx={{ color: '#cbd5e1', borderColor: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', textTransform: 'none', py: '2px' }}
                          >
                            Prev Exercise
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            endIcon={<SkipNext />}
                            onClick={() => {
                              const nextIdx = (routineExerciseIdx + 1) % currentRoutine.exercises.length;
                              const nextEx = currentRoutine.exercises[nextIdx];
                              setRoutineExerciseIdx(nextIdx);
                              setSelectedExercise(nextEx);
                              selectedExerciseRef.current = nextEx;
                              setRoutineSecondsLeft(currentRoutine.defaultDurationSec);
                              setRepCount(0);
                              repCountRef.current = 0;
                            }}
                            sx={{ color: '#cbd5e1', borderColor: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', textTransform: 'none', py: '2px' }}
                          >
                            Next Exercise
                          </Button>
                        </Stack>
                      </Stack>
                    );
                  })()}
                </Box>
              )}
            </Paper>

            {/* ── 3. AUDIO & PACING MULTI-TRACK PLAYLIST TOOLBAR ── */}
            <Paper sx={{
              p: '10px 18px', mb: 2, borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.92))',
              border: '1px solid rgba(6,182,212,0.3)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 2
            }}>
              {/* Hidden multi-track audio file input and audio player */}
              <input
                type="file"
                ref={customAudioInputRef}
                multiple
                accept="audio/*"
                onChange={handleMultipleMusicUpload}
                style={{ display: 'none' }}
              />
              <audio
                ref={customAudioRef}
                src={playlist[currentTrackIdx]?.url || ''}
                onEnded={handleNextTrack}
              />

              {/* Left: Title & Track Playlist Status */}
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 260 }}>
                <Avatar sx={{
                  bgcolor: isAudioMuted || audioMode === 'MUTED' ? 'rgba(148,163,184,0.15)' : (playlist.length > 0 ? 'rgba(139,92,246,0.25)' : 'rgba(6,182,212,0.2)'),
                  color: isAudioMuted || audioMode === 'MUTED' ? '#94a3b8' : (playlist.length > 0 ? '#c084fc' : '#22d3ee'),
                  width: 38, height: 38,
                  transition: 'all 0.3s'
                }}>
                  {isAudioMuted || audioMode === 'MUTED' ? <VolumeOff /> : (playlist.length > 0 ? <AudioFile /> : <MusicNote />)}
                </Avatar>

                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      Rehab Audio & Playlist
                    </Typography>
                    <Chip
                      size="small"
                      label={isAudioMuted || audioMode === 'MUTED' ? 'MUTED' : (mirrorActive ? '▶ PLAYING' : (playlist.length > 0 ? `${playlist.length} TRACKS` : 'ACTIVE'))}
                      sx={{
                        height: 20, fontSize: '0.66rem', fontWeight: 800,
                        bgcolor: isAudioMuted || audioMode === 'MUTED' ? 'rgba(148,163,184,0.2)' : (mirrorActive ? 'rgba(34,197,94,0.25)' : 'rgba(6,182,212,0.2)'),
                        color: isAudioMuted || audioMode === 'MUTED' ? '#94a3b8' : (mirrorActive ? '#4ade80' : '#38bdf8'),
                        border: isAudioMuted || audioMode === 'MUTED' ? '1px solid rgba(148,163,184,0.3)' : '1px solid rgba(34,197,94,0.4)',
                        transition: 'all 0.2s'
                      }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem', maxWidth: 260, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                    {playlist.length > 0
                      ? `Track ${currentTrackIdx + 1}/${playlist.length}: ${playlist[currentTrackIdx]?.name}`
                      : 'Synthesizer Drone · Upload multiple songs to create custom playlist'}
                  </Typography>
                </Box>
              </Stack>

              {/* Multi-Track Playlist Controls & Song Management */}
              <Stack direction="row" spacing={1} alignItems="center">
                {playlist.length > 0 ? (
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    {/* Previous Track */}
                    <Tooltip title="Previous Song">
                      <span>
                        <IconButton
                          size="small"
                          disabled={playlist.length <= 1}
                          onClick={handlePrevTrack}
                          sx={{ color: '#38bdf8', bgcolor: 'rgba(56,189,248,0.1)', p: '5px' }}
                        >
                          <SkipPrevious fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    {/* Current Song Pill / Open Playlist Modal */}
                    <Paper
                      onClick={() => setPlaylistDialogOpen(true)}
                      sx={{
                        p: '4px 10px',
                        bgcolor: 'rgba(139,92,246,0.2)',
                        border: '1px solid rgba(168,85,247,0.4)',
                        borderRadius: 2,
                        display: 'flex', alignItems: 'center', gap: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(139,92,246,0.35)' }
                      }}
                    >
                      <PlaylistPlay sx={{ color: '#c084fc', fontSize: 18 }} />
                      <Typography variant="caption" sx={{
                        color: '#e9d5ff', fontWeight: 800, fontSize: '0.72rem',
                        maxWidth: 110, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                      }}>
                        {playlist[currentTrackIdx]?.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${currentTrackIdx + 1}/${playlist.length}`}
                        sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: 'rgba(168,85,247,0.4)', color: '#f3e8ff' }}
                      />
                    </Paper>

                    {/* Next Track */}
                    <Tooltip title="Next Song">
                      <span>
                        <IconButton
                          size="small"
                          disabled={playlist.length <= 1}
                          onClick={handleNextTrack}
                          sx={{ color: '#38bdf8', bgcolor: 'rgba(56,189,248,0.1)', p: '5px' }}
                        >
                          <SkipNext fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    {/* Playback Mode Toggle: Sequential vs Shuffle */}
                    <Tooltip title={playbackOrder === 'SHUFFLE' ? "Playback Mode: Shuffle / Random (Click for Sequential)" : "Playback Mode: Sequential Loop (Click for Shuffle)"}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={playbackOrder === 'SHUFFLE' ? <Shuffle sx={{ fontSize: 14 }} /> : <Repeat sx={{ fontSize: 14 }} />}
                        onClick={() => {
                          const next = playbackOrder === 'SHUFFLE' ? 'SEQUENTIAL' : 'SHUFFLE';
                          setPlaybackOrder(next);
                          enqueueSnackbar(`🎵 Playback Mode: ${next === 'SHUFFLE' ? '🔀 Random Shuffle' : '🔁 Sequential Loop'}`, { variant: 'info' });
                        }}
                        sx={{
                          fontSize: '0.68rem', fontWeight: 800,
                          color: playbackOrder === 'SHUFFLE' ? '#f472b6' : '#38bdf8',
                          borderColor: playbackOrder === 'SHUFFLE' ? 'rgba(244,114,182,0.4)' : 'rgba(56,189,248,0.4)',
                          bgcolor: playbackOrder === 'SHUFFLE' ? 'rgba(244,114,182,0.1)' : 'rgba(56,189,248,0.08)',
                          textTransform: 'none', py: '3px', px: 1
                        }}
                      >
                        {playbackOrder === 'SHUFFLE' ? 'Shuffle' : 'Sequential'}
                      </Button>
                    </Tooltip>

                    {/* Upload More Songs Button */}
                    <Tooltip title="Add More Songs to Playlist">
                      <IconButton
                        size="small"
                        onClick={() => customAudioInputRef.current?.click()}
                        sx={{ color: '#4ade80', bgcolor: 'rgba(34,197,94,0.15)', p: '5px' }}
                      >
                        <PlaylistAdd fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CloudUpload />}
                    onClick={() => customAudioInputRef.current?.click()}
                    sx={{
                      color: '#38bdf8',
                      borderColor: 'rgba(56,189,248,0.4)',
                      bgcolor: 'rgba(56,189,248,0.08)',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: 'rgba(56,189,248,0.18)', borderColor: '#38bdf8' }
                    }}
                  >
                    📁 Upload Music Playlist
                  </Button>
                )}
              </Stack>

              {/* Stretch / Movement Chimes Quick Mute & Add Button */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title={chimesEnabled ? "Click to Mute Stretch Point Chimes (Pure Music Only)" : "Click to Enable Stretch Point Biofeedback Chimes"}>
                  <Button
                    size="small"
                    variant={chimesEnabled ? "contained" : "outlined"}
                    startIcon={chimesEnabled ? <NotificationsActive fontSize="small" /> : <NotificationsOff fontSize="small" />}
                    onClick={() => {
                      const next = !chimesEnabled;
                      setChimesEnabled(next);
                      if (next) {
                        enqueueSnackbar('🔔 Stretch point chimes ENABLED', { variant: 'info' });
                        playBiofeedbackChime('PEAK_ROM');
                      } else {
                        enqueueSnackbar('🔕 Stretch point chimes MUTED — Playing pure music only', { variant: 'success' });
                      }
                    }}
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'none',
                      py: '5px', px: 1.2,
                      bgcolor: chimesEnabled ? 'rgba(6,182,212,0.25)' : 'rgba(148,163,184,0.08)',
                      color: chimesEnabled ? '#22d3ee' : '#94a3b8',
                      borderColor: chimesEnabled ? 'rgba(6,182,212,0.6)' : 'rgba(148,163,184,0.3)',
                      '&:hover': {
                        bgcolor: chimesEnabled ? 'rgba(6,182,212,0.4)' : 'rgba(148,163,184,0.18)',
                        borderColor: chimesEnabled ? '#22d3ee' : '#cbd5e1'
                      }
                    }}
                  >
                    {chimesEnabled ? '🔔 Stretch Chimes: ON' : '🔕 Stretch Chimes: MUTED'}
                  </Button>
                </Tooltip>

                <Tooltip title="Real-time spoken physiotherapist coaching: 'Raise your arm higher', 'Keep your torso straight', 'Hold position', 'Good repetition'">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const next = !voiceCoachingEnabled;
                      setVoiceCoachingEnabled(next);
                      if (next) {
                        speakCoaching('Voice coaching active');
                        enqueueSnackbar('🗣️ Spoken physiotherapist coaching ENABLED', { variant: 'info' });
                      } else {
                        enqueueSnackbar('🔇 Spoken coaching MUTED', { variant: 'default' });
                      }
                    }}
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'none',
                      py: '5px', px: 1.2,
                      bgcolor: voiceCoachingEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.08)',
                      color: voiceCoachingEnabled ? '#4ade80' : '#94a3b8',
                      borderColor: voiceCoachingEnabled ? 'rgba(34,197,94,0.6)' : 'rgba(148,163,184,0.3)',
                      '&:hover': {
                        bgcolor: voiceCoachingEnabled ? 'rgba(34,197,94,0.35)' : 'rgba(148,163,184,0.18)',
                        borderColor: voiceCoachingEnabled ? '#4ade80' : '#cbd5e1'
                      }
                    }}
                  >
                    {voiceCoachingEnabled ? '🗣️ Voice Coach: ON' : '🔇 Voice Coach: OFF'}
                  </Button>
                </Tooltip>
              </Stack>

              {/* Middle: Sound Mode Dropdown */}
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1, maxWidth: 360 }}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  value={audioMode}
                  onChange={(e) => {
                    const mode = e.target.value as AudioMode;
                    setAudioMode(mode);
                    if (mode === 'MUTED') {
                      setIsAudioMuted(true);
                    } else {
                      setIsAudioMuted(false);
                    }
                    if (mode === 'CHIMES') {
                      setChimesEnabled(true);
                    }
                  }}
                  sx={{
                    bgcolor: 'rgba(15,23,42,0.6)',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      '& fieldset': { borderColor: 'rgba(6,182,212,0.35)' },
                      '&:hover fieldset': { borderColor: '#22d3ee' },
                    },
                    '& .MuiSvgIcon-root': { color: '#22d3ee' },
                  }}
                >
                  {playlist.length > 0 && (
                    <MenuItem value="CUSTOM" sx={{ fontWeight: 800, color: '#c084fc' }}>
                      🎵 Playlist ({playlist.length} Tracks · {playbackOrder})
                    </MenuItem>
                  )}
                  <MenuItem value="ALL">
                    {playlist.length > 0 ? '🎵 Custom Playlist' : '🌿 Calming Ambience'} {chimesEnabled ? '+ 🔔 Stretch Chimes' : '(Pure Music — No Chimes)'}
                  </MenuItem>
                  <MenuItem value="CHIMES">🔔 Biofeedback Chimes Only (ROM & Reps)</MenuItem>
                  <MenuItem value="AMBIENT">🌿 Calming Ambient Drone (Healing Waves)</MenuItem>
                  <MenuItem value="METRONOME">⏱️ 60 BPM Pacing Metronome</MenuItem>
                  <MenuItem value="MUTED">🔇 Mute All Audio</MenuItem>
                </TextField>
              </Stack>

              {/* Right: Volume Slider & Quick Mute Button */}
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 200 }}>
                <Tooltip title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setIsAudioMuted(!isAudioMuted);
                      if (isAudioMuted && audioMode === 'MUTED') setAudioMode(playlist.length > 0 ? 'CUSTOM' : 'ALL');
                    }}
                    sx={{
                      color: isAudioMuted ? '#f87171' : '#22d3ee',
                      bgcolor: isAudioMuted ? 'rgba(239,68,68,0.15)' : 'rgba(6,182,212,0.15)',
                      border: isAudioMuted ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(6,182,212,0.3)',
                      p: '6px'
                    }}
                  >
                    {isAudioMuted ? <VolumeOff fontSize="small" /> : <VolumeUp fontSize="small" />}
                  </IconButton>
                </Tooltip>

                <Box sx={{ width: 100 }}>
                  <Slider
                    size="small"
                    value={isAudioMuted ? 0 : Math.round(audioVolume * 100)}
                    disabled={isAudioMuted || audioMode === 'MUTED'}
                    onChange={(_, val) => {
                      const v = (val as number) / 100;
                      setAudioVolume(v);
                      if (isAudioMuted) setIsAudioMuted(false);
                    }}
                    min={0}
                    max={100}
                    sx={{
                      color: '#22d3ee',
                      height: 4,
                      '& .MuiSlider-thumb': {
                        width: 14, height: 14,
                        bgcolor: '#fff',
                        boxShadow: '0 0 8px #22d3ee',
                      },
                      '& .MuiSlider-track': { bgcolor: '#22d3ee' },
                      '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.2)' },
                    }}
                  />
                </Box>

                <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 800, minWidth: 32, fontSize: '0.75rem' }}>
                  {isAudioMuted || audioMode === 'MUTED' ? '0%' : `${Math.round(audioVolume * 100)}%`}
                </Typography>

                {/* Animated Waveform Visualizer Indicator */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', height: 16 }}>
                  {[12, 16, 8, 14].map((h, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 3,
                        height: isAudioMuted || audioMode === 'MUTED' ? 3 : (mirrorActive ? h : 4),
                        bgcolor: isAudioMuted || audioMode === 'MUTED' ? '#64748b' : '#22d3ee',
                        borderRadius: 1,
                        transition: 'height 0.2s ease',
                        animation: mirrorActive && !isAudioMuted && audioMode !== 'MUTED' ? `pulseWave 0.8s ease-in-out infinite alternate ${i * 0.15}s` : 'none',
                        '@keyframes pulseWave': {
                          '0%': { height: 4 },
                          '100%': { height: 16 }
                        }
                      }}
                    />
                  ))}
                </Box>
              </Stack>
            </Paper>

            {/* ── 4. MIRROR CAMERA WINDOW & FULLSCREEN SLIDE SHOW CONTAINER ── */}
            <Box
              ref={mirrorContainerRef}
              sx={{
                position: isFullscreen ? 'fixed' : 'relative',
                top: isFullscreen ? 0 : 'auto',
                left: isFullscreen ? 0 : 'auto',
                width: isFullscreen ? '100vw' : '100%',
                height: isFullscreen ? '100vh' : 'auto',
                zIndex: isFullscreen ? 999999 : 1,
                bgcolor: '#090d16',
                borderRadius: isFullscreen ? 0 : 4,
                overflow: 'hidden',
                border: isFullscreen ? 'none' : `3px solid ${exerciseStatus === 'IMPROVE FORM' ? '#ffcc00' : '#06b6d4'}`,
                boxShadow: isFullscreen
                  ? 'none'
                  : (exerciseStatus === 'IMPROVE FORM'
                    ? '0 12px 40px rgba(255, 204, 0, 0.25)'
                    : '0 12px 40px rgba(6, 182, 212, 0.25)'),
                transition: 'border-color 0.4s, box-shadow 0.4s',
                display: isFullscreen ? 'flex' : 'block',
                flexDirection: 'column'
              }}
            >
              {/* Fullscreen Floating Top Banner */}
              {isFullscreen && (
                <Box sx={{
                  p: 2,
                  bgcolor: 'rgba(15,23,42,0.92)',
                  backdropFilter: 'blur(10px)',
                  borderBottom: '1px solid rgba(56,189,248,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  color: '#fff', zIndex: 20
                }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#38bdf8', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                      🎯 REHABILITATION EXERCISE ANALYSIS SYSTEM — SLIDE SHOW
                    </Typography>
                    {selectedEpisode && (
                      <Chip
                        size="small"
                        label={`👤 ${selectedEpisode.patientName} (${selectedEpisode.id})`}
                        sx={{ bgcolor: 'rgba(56,189,248,0.2)', color: '#38bdf8', fontWeight: 800 }}
                      />
                    )}
                    <Chip
                      size="small"
                      label={`🎯 ${selectedExercise}`}
                      sx={{ bgcolor: 'rgba(34,197,94,0.25)', color: '#4ade80', fontWeight: 800 }}
                    />
                    {routineMode && (
                      <Chip
                        size="small"
                        icon={<HourglassTop sx={{ color: '#fff !important' }} />}
                        label={`⏱️ Step ${routineExerciseIdx + 1}: ${routineSecondsLeft}s`}
                        sx={{ bgcolor: 'rgba(168,85,247,0.3)', color: '#e9d5ff', fontWeight: 800 }}
                      />
                    )}
                  </Stack>

                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                      size="small"
                      variant="contained"
                      color={mirrorActive ? "error" : "success"}
                      startIcon={mirrorActive ? <Pause /> : <PlayArrow />}
                      onClick={() => setMirrorActive(!mirrorActive)}
                      sx={{ fontWeight: 800, textTransform: 'none' }}
                    >
                      {mirrorActive ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FullscreenExit />}
                      onClick={toggleFullscreenMode}
                      sx={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.5)', fontWeight: 800, textTransform: 'none' }}
                    >
                      Exit Slide Show
                    </Button>
                  </Stack>
                </Box>
              )}

              {/* Video element for webcam capture (positioned offscreen to keep GPU decoder active) */}
              <video
                ref={videoRef}
                style={{ position: 'fixed', top: -9999, left: -9999, width: 640, height: 480, opacity: 0, pointerEvents: 'none' }}
                muted
                playsInline
                autoPlay
              />

              {/* Real Human Physiotherapist Trainer Demonstration Video Viewport */}
              <video
                ref={demoVideoRef}
                src={customDemoVideoUrl || REAL_HUMAN_TRAINER_VIDEOS[selectedExercise]?.src || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: isFullscreen ? 'calc(100vh - 120px)' : '560px',
                  objectFit: 'contain',
                  display: (cameraMode === 'SIMULATION' && demoAvatarMode === 'HUMAN_VIDEO') ? 'block' : 'none',
                  zIndex: 1,
                  borderRadius: 16,
                  backgroundColor: '#0a1128'
                }}
                muted
                playsInline
                autoPlay
                loop
                crossOrigin="anonymous"
              />

              {/* Hidden file input for real human video upload */}
              <input
                type="file"
                ref={fileVideoInputRef}
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                style={{ display: 'none' }}
                onChange={handleVideoUpload}
              />

              <Box sx={{ position: 'relative', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: isFullscreen ? 'calc(100vh - 120px)' : '560px' }}>
                {/* Real Human Trainer Info Overlay Badge */}
                {cameraMode === 'SIMULATION' && demoAvatarMode === 'HUMAN_VIDEO' && (
                  <Box sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    bgcolor: 'rgba(15,23,42,0.88)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(244,63,94,0.4)',
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.2,
                    zIndex: 5,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  }}>
                    <Avatar sx={{ bgcolor: '#e11d48', width: 30, height: 30, fontSize: '0.85rem' }}>
                      🎥
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#fda4af', fontWeight: 800, fontSize: '0.74rem', display: 'block', lineHeight: 1.1 }}>
                        {customDemoVideoName ? `Custom Video: ${customDemoVideoName}` : (REAL_HUMAN_TRAINER_VIDEOS[selectedExercise]?.trainer || 'Dr. Sarah Jenkins, DPT')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.66rem', display: 'block' }}>
                        {customDemoVideoName ? 'User Uploaded Exercise Demonstration' : (REAL_HUMAN_TRAINER_VIDEOS[selectedExercise]?.role || 'Certified Physical Therapy Clinical Instructor')}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* 3D WebGL Real Human Mannequin Canvas */}
                <canvas
                  ref={canvas3DRef}
                  width={1000}
                  height={560}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: isFullscreen ? 'calc(100vh - 120px)' : '560px',
                    objectFit: 'contain',
                    display: (cameraMode === 'SIMULATION' && (demoAvatarMode === 'HUMAN_FRONT' || demoAvatarMode === 'HUMAN_BACK')) ? 'block' : 'none',
                    zIndex: 1,
                    borderRadius: 16,
                  }}
                />

                {/* Offscreen 3D WebGL Canvas for Exercise Reference PiP */}
                <canvas
                  ref={pipCanvas3DRef}
                  width={464}
                  height={352}
                  style={{
                    position: 'fixed',
                    top: -9999,
                    left: -9999,
                    width: 464,
                    height: 352,
                    pointerEvents: 'none'
                  }}
                />

                {/* 2D HUD Telemetry / Live Camera / AI Skeleton Canvas */}
                <canvas
                  ref={canvasRef}
                  width={1000}
                  height={560}
                  style={{
                    position: (cameraMode === 'SIMULATION' && demoAvatarMode !== 'SKELETON') ? 'absolute' : 'relative',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: isFullscreen ? 'calc(100vh - 120px)' : 'auto',
                    objectFit: 'contain',
                    display: 'block',
                    zIndex: 2,
                    pointerEvents: 'none',
                    borderRadius: 16,
                  }}
                />

                {/* Model Loading Spinner Overlay */}
                {poseModelLoading && (
                  <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    bgcolor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', zIndex: 10
                  }}>
                    <LinearProgress sx={{ width: 240, mb: 2, borderRadius: 2 }} color="info" />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#38bdf8' }}>
                      🤖 Initializing MoveNet Pose Engine...
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.5 }}>
                      Loading real-time 17-point anatomical landmark detector in browser
                    </Typography>
                  </Box>
                )}

                {/* Routine Auto-Transition Announcement Banner */}
                {routineTransitionBanner && (
                  <Box sx={{
                    position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
                    bgcolor: 'rgba(139,92,246,0.92)', color: '#fff',
                    px: 4, py: 1.5, borderRadius: 3, fontWeight: 900, fontSize: '1.15rem',
                    boxShadow: '0 8px 30px rgba(139,92,246,0.6)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 25,
                    textAlign: 'center',
                    border: '2px solid rgba(255,255,255,0.4)',
                    animation: 'pulseBanner 0.5s ease-in-out'
                  }}>
                    {routineTransitionBanner}
                  </Box>
                )}

                {/* Status badge for COMPLETED REPS */}
                {repCount >= targetReps && mirrorActive && (
                  <Box sx={{
                    position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                    bgcolor: 'rgba(22,163,74,0.9)', color: '#fff',
                    px: 3, py: 1, borderRadius: 3, fontWeight: 900, fontSize: '1rem',
                    boxShadow: '0 4px 20px rgba(22,163,74,0.5)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 15
                  }}>
                    🎉 Set Complete! {targetReps}/{targetReps} Reps Done
                  </Box>
                )}
              </Box>

              {/* Fullscreen Floating Bottom Bar */}
              {isFullscreen && (
                <Box sx={{
                  p: 1.5,
                  bgcolor: 'rgba(15,23,42,0.95)',
                  backdropFilter: 'blur(10px)',
                  borderTop: '1px solid rgba(56,189,248,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  color: '#fff', zIndex: 20
                }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800 }}>
                      PLAYLIST:
                    </Typography>
                    {playlist.length > 0 ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <IconButton size="small" onClick={handlePrevTrack} sx={{ color: '#38bdf8' }}>
                          <SkipPrevious fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" sx={{ color: '#e9d5ff', fontWeight: 800 }}>
                          🎵 {playlist[currentTrackIdx]?.name} ({currentTrackIdx + 1}/{playlist.length})
                        </Typography>
                        <IconButton size="small" onClick={handleNextTrack} sx={{ color: '#38bdf8' }}>
                          <SkipNext fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
                        🌿 Calming Synthesizer Drone
                      </Typography>
                    )}
                  </Stack>

                  <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                      size="small"
                      variant={chimesEnabled ? "contained" : "outlined"}
                      onClick={() => setChimesEnabled(!chimesEnabled)}
                      sx={{
                        fontSize: '0.72rem', fontWeight: 800, textTransform: 'none',
                        color: chimesEnabled ? '#22d3ee' : '#94a3b8',
                        bgcolor: chimesEnabled ? 'rgba(6,182,212,0.25)' : 'transparent',
                        borderColor: chimesEnabled ? '#22d3ee' : 'rgba(255,255,255,0.2)'
                      }}
                    >
                      {chimesEnabled ? '🔔 Stretch Chimes: ON' : '🔕 Stretch Chimes: MUTED'}
                    </Button>

                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleAttachAiReportToEHR}
                      disabled={attachingAiReport}
                      sx={{ bgcolor: '#22c55e', color: '#0f172a', fontWeight: 900, fontSize: '0.74rem', textTransform: 'none' }}
                    >
                      {attachingAiReport ? 'Saving...' : '💾 Save Audit to EHR'}
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>

            {/* ── CLINICAL PROTOCOL INSTRUCTIONS & PATIENT FORM GUIDELINES ── */}
            {(() => {
              const guide = getPhysioProtocol(selectedExercise);

              return (
                <Paper variant="outlined" sx={{ p: 2.5, mt: 3, borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #cbd5e1' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{guide.icon}</span> Clinical Protocol Guide: {guide.title}
                    </Typography>
                    <Chip label={`Target ROM: ${guide.targetRom}`} color="info" sx={{ fontWeight: 800 }} />
                  </Box>

                  <Box sx={{ mb: 2, p: 1.2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                    <Typography variant="body2" sx={{ color: '#166534', fontSize: '0.84rem' }}>
                      <strong>🏥 Clinical Indication:</strong> {guide.indication}
                    </Typography>
                  </Box>

                  <Grid container spacing={2.5}>
                    <Grid item xs={12} md={7}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1 }}>
                        📋 Step-by-Step Movement Instructions:
                      </Typography>
                      <Stack spacing={0.8}>
                        {guide.steps.map((st, i) => (
                          <Typography key={i} variant="body2" sx={{ color: '#334155', fontSize: '0.85rem' }}>
                            {st}
                          </Typography>
                        ))}
                      </Stack>
                    </Grid>

                    <Grid item xs={12} md={5}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: WARNING, mb: 1 }}>
                        ⚠️ Common Form Errors Flagged by System:
                      </Typography>
                      <Paper sx={{ p: 1.5, bgcolor: '#fff7ed', borderRadius: 2, border: '1px solid #ffedd5' }}>
                        <Stack spacing={0.8}>
                          {guide.formTips.map((ft, i) => (
                            <Typography key={i} variant="caption" sx={{ color: '#9a3412', display: 'block', fontWeight: 600 }}>
                              {ft}
                            </Typography>
                          ))}
                        </Stack>
                      </Paper>

                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
                        <strong>🤖 Movement Tracking Landmarks:</strong> {guide.landmarks}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              );
            })()}
          </Box>
        </TabPanel>

        {/* ── TAB 1: PENDING ELECTRONIC REFERRALS & ACTIVE QUEUE ─────────── */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3 }}>
            {/* HMIS Paperless Pathway Banner */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assignment sx={{ color: '#0284c7' }} /> Paperless Electronic Referral & Intake Pathway
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#334155', mt: 0.5, fontSize: '0.84rem' }}>
                    <strong>• Inpatient / Ward:</strong> Doctor clicks <em>[Refer to Physio]</em> ➔ Appears on Pending Queue ➔ Physio accepts ➔ Patient automatically added to Ward Bedside Rounds.<br/>
                    <strong>• Outpatient Clinic:</strong> Doctor refers ➔ Physio accepts ➔ Automated SMS booking notification dispatched to patient.<br/>
                    <strong>• External Walk-ins & Referrals:</strong> Receptionist performs <em>[Quick Register]</em> ➔ Primary Physio Assessment & Treatment Package initialized.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                  <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={<PersonAdd />}
                      onClick={() => setReferralModalOpen(true)}
                      sx={{ bgcolor: '#0284c7', fontWeight: 800, fontSize: '0.78rem' }}
                    >
                      + Doctor Referral
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<CreditCard />}
                      onClick={() => setExternalIntakeModalOpen(true)}
                      sx={{ bgcolor: '#7c3aed', fontWeight: 800, fontSize: '0.78rem' }}
                    >
                      + External Intake
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* SECTION A: PENDING ELECTRONIC REFERRALS QUEUE */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>📥</span> Pending Inpatient & Specialist Referrals ({referrals.filter(r => r.status === 'PENDING').length})
                </Typography>
                <Chip label="Awaiting Physiotherapist Acceptance" size="small" color="warning" sx={{ fontWeight: 800 }} />
              </Box>

              {referrals.filter(r => r.status === 'PENDING').length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 3, bgcolor: '#f8fafc', color: 'text.secondary' }}>
                  <CheckCircle sx={{ color: SUCCESS, fontSize: 36, mb: 1 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>No Pending Referrals in Queue</Typography>
                  <Typography variant="caption">All internal doctor referrals have been reviewed and accepted into active care.</Typography>
                </Paper>
              ) : (
                <Grid container spacing={2.5}>
                  {referrals.filter(r => r.status === 'PENDING').map(ref => (
                    <Grid item xs={12} md={4} key={ref.id}>
                      <Card variant="outlined" sx={{
                        borderRadius: 3,
                        borderColor: ref.priority === 'URGENT' ? '#fed7aa' : '#cbd5e1',
                        bgcolor: ref.priority === 'URGENT' ? '#fffaf5' : '#ffffff',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                        transition: 'all 0.2s',
                        '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, bgcolor: '#f1f5f9', p: '2px 8px', borderRadius: 1 }}>
                              {ref.id}
                            </Typography>
                            <Stack direction="row" spacing={0.5}>
                              <Chip
                                label={ref.priority}
                                size="small"
                                color={ref.priority === 'URGENT' ? 'error' : 'default'}
                                sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                              />
                              <StatusChip label={ref.careSetting} />
                            </Stack>
                          </Box>

                          <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, mb: 0.5 }}>
                            {ref.patientName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                            📞 {ref.phone} · 📍 <strong>{ref.wardLocation || ref.referredFrom}</strong>
                          </Typography>

                          <Paper variant="outlined" sx={{ p: 1.2, bgcolor: '#f8fafc', borderRadius: 2, mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" display="block">Referred By:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.8rem' }}>
                              {ref.referredBy} ({ref.referredFrom})
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.8 }}>Diagnosis:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0369a1', fontSize: '0.85rem' }}>
                              {ref.diagnosis}
                            </Typography>
                          </Paper>

                          <Box sx={{ mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block' }}>
                              Recommended Package:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: TEAL, fontSize: '0.82rem' }}>
                              {ref.recommendedPackage} ({ref.packageTotal || 10} Sessions)
                            </Typography>
                            {ref.clinicalNotes && (
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                                "{ref.clinicalNotes}"
                              </Typography>
                            )}
                          </Box>

                          <Divider sx={{ my: 1.5 }} />

                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<CheckCircleOutline />}
                            onClick={() => handleAcceptReferral(ref.id)}
                            sx={{
                              bgcolor: SUCCESS,
                              fontWeight: 800,
                              textTransform: 'none',
                              '&:hover': { bgcolor: '#15803d' }
                            }}
                          >
                            ✓ Accept Referral & Activate Episode
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* SECTION B: ACTIVE PROGRESSIVE PATIENT EPISODES */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🏥</span> Active Rehabilitation Patients & External Clients ({filteredEpisodes.length})
                </Typography>
                <Chip label="Ongoing Care Plans & Package Balances" size="small" color="primary" sx={{ fontWeight: 800 }} />
              </Box>

              <Grid container spacing={3}>
                {filteredEpisodes.map(ep => (
                  <Grid item xs={12} md={4} key={ep.id}>
                    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#cbd5e1', transition: 'all 0.2s', '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, bgcolor: '#f1f5f9', p: '2px 8px', borderRadius: 1 }}>
                            {ep.id}
                          </Typography>
                          <Stack direction="row" spacing={0.5}>
                            <Chip
                              label={ep.clientType === 'EXTERNAL_CLIENT' ? '🏢 EXTERNAL' : '🏥 INTERNAL'}
                              size="small"
                              sx={{
                                fontWeight: 800, fontSize: '0.62rem',
                                bgcolor: ep.clientType === 'EXTERNAL_CLIENT' ? '#ede9fe' : '#e0f2fe',
                                color: ep.clientType === 'EXTERNAL_CLIENT' ? '#6d28d9' : '#0369a1'
                              }}
                            />
                            <StatusChip label={ep.careSetting || 'OUTPATIENT_GYM'} />
                          </Stack>
                        </Box>

                        <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>{ep.patientName}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          Referred from: <strong>{ep.referredFrom}</strong> ({ep.referredBy})
                        </Typography>

                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block">Diagnosis & Goal:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: SECONDARY }}>{ep.diagnosis}</Typography>
                          {ep.externalReferralDoc && (
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<AttachFile />}
                              onClick={() => window.open(ep.externalReferralDoc, '_blank')}
                              sx={{ mt: 0.5, p: 0, fontSize: '0.72rem', textTransform: 'none', color: PURPLE }}
                            >
                              View External Referral Document (PDF)
                            </Button>
                          )}
                        </Paper>

                        {/* SESSION PACKAGE COUNTER & FINANCIAL BALANCE */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: TEAL }}>
                              Session Package: {ep.sessionsCompleted || 0} of {ep.packageTotal || 10} Used
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: (ep.sessionsRemaining || 0) <= 2 ? WARNING : SUCCESS }}>
                              {ep.sessionsRemaining || 0} Remaining
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={((ep.sessionsCompleted || 0) / (ep.packageTotal || 10)) * 100}
                            sx={{ height: 8, borderRadius: 4, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: TEAL } }}
                          />
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
                            Billing Status: <strong>{ep.paymentStatus}</strong>
                          </Typography>
                        </Box>

                        {/* BODY PINS CHIPS */}
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} sx={{ mb: 2 }}>
                          {(ep.bodyMapPins || ['Knee', 'Spine']).map((pin: string) => (
                            <Chip key={pin} label={`📌 ${pin}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', fontWeight: 700 }} />
                          ))}
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            size="small"
                            fullWidth
                            startIcon={<Add />}
                            onClick={() => { setSelectedEpisodeId(ep.id); setSessionDialogOpen(true); }}
                            sx={{ bgcolor: TEAL, fontWeight: 800, fontSize: '0.75rem' }}
                          >
                            Log Daily Session
                          </Button>
                          <Tooltip title="Launch Rehabilitation Exercise Analysis System for Patient">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedEpisode(ep);
                                setSelectedEpisodeId(ep.id);
                                navigate('/rehabilitation/mirror');
                              }}
                              sx={{ bgcolor: '#eff6ff', color: PRIMARY, border: '1px solid #bfdbfe' }}
                            >
                              <Videocam fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deduct 1 Package Credit">
                            <IconButton
                              size="small"
                              onClick={() => handleDeductPackageSession(ep.id)}
                              sx={{ bgcolor: '#f0fdf4', color: SUCCESS, border: '1px solid #bbf7d0' }}
                            >
                              <CreditCard fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <IconButton color="primary" onClick={() => handlePrintHEP(ep)} title="Print Home Exercise Program">
                            <Print fontSize="small" />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </TabPanel>

        {/* ── TAB 2: DAILY GYM & WARD BEDSIDE SCHEDULE (Combined View) ───────── */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3 }}>
            {/* Header with Title and Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonth sx={{ color: CYAN }} /> Combined Daily Rehabilitation Schedule & Attendance Tracker
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Synchronized real-time appointments for Inpatient Bedside Ward Rounds, Outpatient Gym Sessions, and External Walk-ins
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Button
                  variant="contained"
                  startIcon={<EventNote />}
                  onClick={() => setScheduleBookingModalOpen(true)}
                  sx={{ bgcolor: CYAN, color: '#0f172a', fontWeight: 800, '&:hover': { bgcolor: '#0891b2', color: '#fff' } }}
                >
                  + Book Appointment Slot
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setSessionDialogOpen(true)}
                  sx={{ bgcolor: PURPLE, fontWeight: 800 }}
                >
                  + Record Daily Therapy Session
                </Button>
              </Stack>
            </Box>

            {/* Filter & Search Toolbar */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Search by patient, phone, bed, or treatment..."
                    value={scheduleSearchQuery}
                    onChange={e => setScheduleSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ color: '#94a3b8', mr: 1, fontSize: 20 }} />
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mr: 0.5 }}>
                      Care Setting:
                    </Typography>
                    <Chip
                      size="small"
                      label={`All (${schedule.length})`}
                      onClick={() => setScheduleSettingFilter('ALL')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: scheduleSettingFilter === 'ALL' ? PRIMARY : '#fff',
                        color: scheduleSettingFilter === 'ALL' ? '#fff' : '#475569',
                        border: '1px solid #cbd5e1'
                      }}
                    />
                    <Chip
                      size="small"
                      label={`🛏️ Inpatient Bedside (${schedule.filter(s => s.patientType === 'INPATIENT_BEDSIDE').length})`}
                      onClick={() => setScheduleSettingFilter('INPATIENT_BEDSIDE')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: scheduleSettingFilter === 'INPATIENT_BEDSIDE' ? '#b45309' : '#fff',
                        color: scheduleSettingFilter === 'INPATIENT_BEDSIDE' ? '#fff' : '#b45309',
                        border: '1px solid #fde68a'
                      }}
                    />
                    <Chip
                      size="small"
                      label={`🏋️ Outpatient Gym (${schedule.filter(s => s.patientType === 'OUTPATIENT_GYM').length})`}
                      onClick={() => setScheduleSettingFilter('OUTPATIENT_GYM')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: scheduleSettingFilter === 'OUTPATIENT_GYM' ? '#0369a1' : '#fff',
                        color: scheduleSettingFilter === 'OUTPATIENT_GYM' ? '#fff' : '#0369a1',
                        border: '1px solid #bae6fd'
                      }}
                    />
                    <Chip
                      size="small"
                      label={`🏢 External Client (${schedule.filter(s => s.patientType === 'EXTERNAL_CLIENT').length})`}
                      onClick={() => setScheduleSettingFilter('EXTERNAL_CLIENT')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: scheduleSettingFilter === 'EXTERNAL_CLIENT' ? '#6d28d9' : '#fff',
                        color: scheduleSettingFilter === 'EXTERNAL_CLIENT' ? '#fff' : '#6d28d9',
                        border: '1px solid #ddd6fe'
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: PRIMARY, '& th, & .MuiTableCell-head, & .MuiTableCell-root': { color: '#ffffff !important', fontWeight: 800 } }}>
                  <TableRow>
                    {['Slot Time', 'Patient Name & Phone', 'Pathway Type', 'Location / Bed', 'Assigned PT', 'Treatment Plan & Progress', 'Status', 'Attendance & Actions'].map(h => (
                      <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.78rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSchedule.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
                        <CalendarMonth sx={{ fontSize: 40, color: '#cbd5e1', mb: 1 }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          No appointments match your current filters.
                        </Typography>
                        <Button size="small" onClick={() => { setScheduleSearchQuery(''); setScheduleSettingFilter('ALL'); setScheduleStatusFilter('ALL'); }} sx={{ mt: 1, textTransform: 'none' }}>
                          Clear Filters
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSchedule.map(s => (
                      <TableRow key={s.id} hover>
                        <TableCell sx={{ fontWeight: 800, color: '#0369a1', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          ⏰ {s.timeSlot}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: PRIMARY }}>{s.patientName}</Typography>
                          <Typography variant="caption" color="text.secondary">📞 {s.phone}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.patientType === 'INPATIENT_BEDSIDE' ? '🛏️ Inpatient Bedside' : (s.patientType === 'EXTERNAL_CLIENT' ? '🏢 External Client' : '🏋️ Outpatient Gym')}
                            size="small"
                            sx={{
                              fontSize: '0.68rem', fontWeight: 700,
                              bgcolor: s.patientType === 'INPATIENT_BEDSIDE' ? '#fef3c7' : (s.patientType === 'EXTERNAL_CLIENT' ? '#ede9fe' : '#e0f2fe'),
                              color: s.patientType === 'INPATIENT_BEDSIDE' ? '#b45309' : (s.patientType === 'EXTERNAL_CLIENT' ? '#6d28d9' : '#0369a1')
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{s.location}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>{s.therapist}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.78rem', color: TEAL }}>
                            {s.treatmentPlan}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Session {s.sessionIndex} of {s.packageTotal}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.status}
                            size="small"
                            color={s.status === 'COMPLETED' ? 'success' : (s.status === 'CHECKED_IN' ? 'info' : (s.status === 'IN_PROGRESS' ? 'warning' : (s.status === 'MISSED' ? 'error' : 'default')))}
                            sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 120, maxWidth: 135 }}>
                          <Stack direction="column" spacing={0.75} alignItems="stretch">
                            <TextField
                              select
                              size="small"
                              value={s.status}
                              onChange={(e) => handleUpdateScheduleStatus(s.id, e.target.value)}
                              sx={{
                                width: '100%',
                                '& .MuiOutlinedInput-input': { p: '4px 6px', fontSize: '0.73rem', fontWeight: 700 }
                              }}
                            >
                              <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                              <MenuItem value="CHECKED_IN">Checked In</MenuItem>
                              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                              <MenuItem value="COMPLETED">Completed</MenuItem>
                              <MenuItem value="MISSED">Missed</MenuItem>
                            </TextField>

                            {/* Quick Action Buttons in a compact row under the select */}
                            <Stack direction="row" spacing={0.5} justifyContent="flex-start" alignItems="center">
                              {/* 1. Quick Launch Mirror */}
                              <Tooltip title="Launch in Kinematic Biofeedback Mirror">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const matchedEp = episodes.find(e => e.id === s.episodeId || (e.patientName && e.patientName.toLowerCase() === s.patientName.toLowerCase()));
                                    if (matchedEp) {
                                      setSelectedEpisode(matchedEp);
                                      setSelectedEpisodeId(matchedEp.id);
                                    }
                                    const { targetExercise } = resolvePatientGoalAndProtocol(matchedEp || s);
                                    if (targetExercise && PHYSIO_PROTOCOLS[targetExercise]) {
                                      setSelectedExercise(targetExercise);
                                      selectedExerciseRef.current = targetExercise;
                                    }
                                    setActiveTab(0);
                                    navigate('/rehabilitation/mirror');
                                    enqueueSnackbar(`🚀 Loaded ${s.patientName} into Kinematic Biofeedback Mirror!`, { variant: 'info' });
                                  }}
                                  sx={{ bgcolor: '#eff6ff', color: PRIMARY, border: '1px solid #bfdbfe', p: '3px' }}
                                >
                                  <Videocam sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>

                              {/* 2. Quick Log Session & Deduct Credit */}
                              <Tooltip title="Log Therapy Session & Deduct Credit">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedEpisodeId(s.episodeId || episodes[0]?.id || '');
                                    setSessionDialogOpen(true);
                                  }}
                                  sx={{ bgcolor: '#f0fdf4', color: SUCCESS, border: '1px solid #bbf7d0', p: '3px' }}
                                >
                                  <CheckCircle sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>

                              {/* 3. WhatsApp Drop-out Retention or Reminder Trigger */}
                              {Boolean(s.status === 'MISSED' || (s.missedCount && s.missedCount >= 2)) ? (
                                <Tooltip title="Send 'We Miss You' WhatsApp Recovery Message">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<WhatsApp sx={{ fontSize: 13 }} />}
                                    onClick={() => handleSendWhatsAppReminder(s.patientName, s.phone, s.missedCount || 2, s.episodeId)}
                                    sx={{
                                      bgcolor: '#25D366',
                                      color: '#fff',
                                      fontWeight: 800,
                                      fontSize: '0.62rem',
                                      textTransform: 'none',
                                      py: '2px',
                                      px: 0.75,
                                      minWidth: 0,
                                      '&:hover': { bgcolor: '#128C7E' }
                                    }}
                                  >
                                    Missed
                                  </Button>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Send WhatsApp Appointment Reminder">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      const cleanPhone = (s.phone || '+2348000000000').replace(/[^0-9+]/g, '');
                                      const msg = `Hello ${s.patientName}, this is a reminder for your upcoming Physiotherapy session today at ${s.timeSlot} at Faith Foundation Mission Hospital. Location: ${s.location}. Treatment: ${s.treatmentPlan}.`;
                                      window.open(`https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(msg)}`, '_blank');
                                      enqueueSnackbar(`📲 WhatsApp reminder sent to ${s.patientName}`, { variant: 'success' });
                                    }}
                                    sx={{ bgcolor: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)', p: '3px' }}
                                  >
                                    <WhatsApp sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* ── TAB 3: PACKAGE TRACKER & FINANCIAL GATEKEEPER ────────────────── */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormatListNumbered sx={{ color: TEAL }} /> Treatment Package Credit Counter & Billing Gatekeeper
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Multi-session treatment packages, upfront billing verification, and per-session credit deduction tracker
                </Typography>
              </Box>

              <Button variant="contained" startIcon={<Add />} onClick={() => setSessionDialogOpen(true)} sx={{ bgcolor: TEAL, fontWeight: 800 }}>
                + Deliver & Log Session
              </Button>
            </Box>

            <Grid container spacing={2.5} sx={{ mb: 3 }}>
              {episodes.map(ep => (
                <Grid item xs={12} md={6} key={ep.id}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, border: '1px solid #cbd5e1' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>{ep.patientName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ep.id} · {ep.diagnosis} · 📞 {ep.phone || 'N/A'}
                        </Typography>
                      </Box>
                      <Chip
                        label={ep.paymentStatus}
                        size="small"
                        color={ep.paymentStatus.includes('PAID') ? 'success' : 'warning'}
                        sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                      />
                    </Box>

                    {/* Visual Countdown Progress */}
                    <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: TEAL }}>
                          🎟️ Session Credits: {ep.sessionsCompleted || 0} of {ep.packageTotal || 10} Delivered
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: (ep.sessionsRemaining || 0) <= 2 ? WARNING : SUCCESS }}>
                          {ep.sessionsRemaining || 0} Sessions Available
                        </Typography>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={((ep.sessionsCompleted || 0) / (ep.packageTotal || 10)) * 100}
                        sx={{ height: 10, borderRadius: 5, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: TEAL } }}
                      />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Package Value: <strong>₦{(ep.packageCost || 100000).toLocaleString()}</strong>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Setting: <strong>{ep.careSetting}</strong>
                        </Typography>
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CreditCard />}
                        onClick={() => handleDeductPackageSession(ep.id)}
                        disabled={(ep.sessionsRemaining || 0) <= 0}
                        sx={{ bgcolor: SUCCESS, fontWeight: 800, textTransform: 'none' }}
                      >
                        🎟️ Deduct 1 Session Credit
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => { setSelectedEpisodeId(ep.id); setSessionDialogOpen(true); }}
                        sx={{ fontWeight: 700, textTransform: 'none' }}
                      >
                        Log Modalities & VAS
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Daily Sessions Delivery Table */}
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARY, mb: 1.5 }}>
              📋 Complete Therapy Session Logs & Pain Reduction Audits
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: PRIMARY, '& th, & .MuiTableCell-head, & .MuiTableCell-root': { color: '#ffffff !important', fontWeight: 800 } }}>
                  <TableRow>
                    {['Session ID', 'Episode / Patient', 'Therapist', 'Modalities Used', 'Prescribed Exercises', 'Pre VAS', 'Post VAS', 'Patient Response', 'Actions'].map(h => (
                      <TableCell key={h} sx={{ color: '#ffffff !important', fontWeight: 800, fontSize: '0.78rem' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{s.id}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{s.episodeId}</TableCell>
                      <TableCell>{s.therapistName}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: TEAL, fontWeight: 650 }}>{s.modalities}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{s.exercises}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: DANGER }}>{s.prePainScore || 6}/10</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: SUCCESS }}>{s.postPainScore || 3}/10</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{s.patientResponse}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="primary" onClick={() => handlePrintHEP(episodes[0])}>
                          <Print fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* ── TAB 4: SOAP ASSESSMENT & DIGITAL BODY MAP ───────────────────── */}
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ p: 3 }}>
            {/* Header with Title & Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>
                  SOAP Assessment Suite & Interactive Anatomical Pain Map
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Interactive anatomical injury locator, goniometric ROM measurements, MRC muscle power grading & digitized clinical care plans.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={() => handlePrintHEP(selectedEpisode || episodes[0])}
                  sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
                >
                  🖨️ Print Active Care Plan & HEP
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setSoapModalOpen(true)}
                  sx={{ bgcolor: TEAL, fontWeight: 800, borderRadius: 2, px: 2.5, py: 1, textTransform: 'none' }}
                >
                  + New SOAP Assessment & Body Map
                </Button>
              </Stack>
            </Box>

            {/* Main Interactive Grid */}
            {(() => {
              const currentRegion = BODY_REGIONS.find(r => r.id === selectedBodyRegion) || BODY_REGIONS[0];
              const matchingEpisodes = episodes.filter(ep => {
                const text = `${ep.diagnosis || ''} ${ep.soapAssessment || ''} ${ep.soapPlan || ''} ${ep.recommendedProtocol || ''} ${ep.bodyMapPins?.join(' ') || ''}`.toLowerCase();
                const regKey = currentRegion.label.toLowerCase().split('/')[0].trim();
                const protoKey = currentRegion.protocolKey.toLowerCase();
                return text.includes(regKey) || text.includes(protoKey) || (ep.bodyMapPins && ep.bodyMapPins.some((pin: string) => pin.toLowerCase().includes(regKey)));
              });

              return (
                <Grid container spacing={3}>
                  {/* LEFT: Digital Pain Body Map Selector */}
                  <Grid item xs={12} lg={6}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARY }}>
                          📍 Digital Pain Body Map — Click to Inspect Injury Site
                        </Typography>
                        <Chip
                          size="small"
                          icon={<Healing sx={{ fontSize: '14px !important' }} />}
                          label={`${soapForm.selectedBodyPins.length} Region(s) Pinned`}
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 800 }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        Click on any anatomical injury site below to instantly load its clinical evaluation, diagnostic criteria, goniometric ROM target, and active patients.
                      </Typography>

                      <Grid container spacing={1.5}>
                        {BODY_REGIONS.map(reg => {
                          const isSelected = selectedBodyRegion === reg.id;
                          const isPinned = soapForm.selectedBodyPins.includes(reg.label);
                          return (
                            <Grid item xs={12} sm={6} key={reg.id}>
                              <Paper
                                onClick={() => handleSelectBodyRegion(reg.id)}
                                elevation={isSelected ? 4 : 0}
                                sx={{
                                  p: 2,
                                  cursor: 'pointer',
                                  borderRadius: 2.5,
                                  border: '2px solid',
                                  borderColor: isSelected ? '#06b6d4' : isPinned ? '#86efac' : '#e2e8f0',
                                  bgcolor: isSelected ? '#ecfeff' : isPinned ? '#f0fdf4' : '#ffffff',
                                  boxShadow: isSelected ? '0 4px 20px rgba(6,182,212,0.25)' : 'none',
                                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                  '&:hover': {
                                    borderColor: '#06b6d4',
                                    bgcolor: isSelected ? '#ecfeff' : '#f8fafc',
                                    transform: 'translateY(-2px)'
                                  }
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                    <Avatar sx={{ bgcolor: isSelected ? '#06b6d4' : '#f1f5f9', color: '#0f172a', width: 36, height: 36, fontSize: '1.2rem' }}>
                                      {reg.icon}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 800, color: isSelected ? '#0891b2' : PRIMARY, lineHeight: 1.2 }}>
                                        {reg.label}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                                        {reg.category}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  {isSelected ? (
                                    <Chip label="Active Focus" size="small" sx={{ bgcolor: '#06b6d4', color: '#fff', fontWeight: 800, height: 20, fontSize: '0.62rem' }} />
                                  ) : isPinned ? (
                                    <Chip label="Pinned" size="small" color="success" sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700 }} />
                                  ) : null}
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                  <Chip
                                    size="small"
                                    label={`Target: ${reg.targetRom}`}
                                    sx={{ bgcolor: isSelected ? '#cffafe' : '#f1f5f9', color: isSelected ? '#0e7490' : '#475569', fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                                  />
                                  <Chip
                                    size="small"
                                    label={`VAS: ${reg.painVasScore}/10`}
                                    sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                                  />
                                </Box>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Paper>
                  </Grid>

                  {/* RIGHT: Dynamic Clinical SOAP Overview & Protocol Action Suite */}
                  <Grid item xs={12} lg={6}>
                    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#f8fafc', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Active Region Header Banner */}
                      <Paper
                        variant="elevation"
                        elevation={0}
                        sx={{
                          p: 2,
                          mb: 2,
                          borderRadius: 2.5,
                          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography variant="h4">{currentRegion.icon}</Typography>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#38bdf8' }}>
                                {currentRegion.label}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                {currentRegion.category} · {currentRegion.diagnosis}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            icon={<Speed sx={{ fontSize: '14px !important', color: '#22d3ee !important' }} />}
                            label={`Target: ${currentRegion.targetRom}`}
                            sx={{ bgcolor: 'rgba(6,182,212,0.2)', color: '#22d3ee', fontWeight: 800, border: '1px solid rgba(6,182,212,0.4)' }}
                          />
                        </Box>

                        <Typography variant="body2" sx={{ color: '#e2e8f0', fontSize: '0.82rem', mb: 1 }}>
                          <strong>🎯 Clinical Recovery Goal:</strong> {currentRegion.recoveryGoal}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Chip size="small" label={`Muscle Power: ${currentRegion.mrcGrade}`} sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.68rem', fontWeight: 700 }} />
                          <Chip size="small" label={`Baseline Pain: VAS ${currentRegion.painVasScore}/10`} sx={{ bgcolor: 'rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.68rem', fontWeight: 800 }} />
                          <Chip size="small" label={`Protocol: ${currentRegion.protocolKey}`} sx={{ bgcolor: 'rgba(34,197,94,0.25)', color: '#86efac', fontSize: '0.68rem', fontWeight: 800 }} />
                        </Box>
                      </Paper>

                      {/* Matching Hospital Patients for this Region */}
                      {matchingEpisodes.length > 0 && (
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', mb: 0.8 }}>
                            👥 Registered Patients Under Care For This Region ({matchingEpisodes.length}):
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.8 }}>
                            {matchingEpisodes.map(ep => (
                              <Chip
                                key={ep.id}
                                avatar={<Avatar sx={{ bgcolor: PRIMARY, color: '#fff', fontSize: '0.7rem' }}>{ep.patientName.charAt(0)}</Avatar>}
                                label={`${ep.patientName} (${ep.sessionsCompleted || 0}/${ep.packageTotal || 10} Delivered)`}
                                onClick={() => {
                                  setSelectedEpisode(ep);
                                  setSelectedEpisodeId(ep.id);
                                  setSoapForm(prev => ({
                                    ...prev,
                                    patientName: ep.patientName,
                                    diagnosis: ep.diagnosis,
                                    referredBy: ep.referredBy,
                                    painVasScore: ep.painVasScore || 5,
                                    soapSubjective: ep.soapSubjective || currentRegion.soapSubjective,
                                    soapObjective: ep.soapObjective || currentRegion.soapObjective,
                                    soapAssessment: ep.soapAssessment || currentRegion.soapAssessment,
                                    soapPlan: ep.soapPlan || currentRegion.soapPlan,
                                  }));
                                  enqueueSnackbar(`Loaded clinical care plan for ${ep.patientName}`, { variant: 'info' });
                                }}
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '0.74rem',
                                  cursor: 'pointer',
                                  bgcolor: (selectedEpisode?.id === ep.id || selectedEpisodeId === ep.id) ? '#dbeafe' : '#f1f5f9',
                                  color: (selectedEpisode?.id === ep.id || selectedEpisodeId === ep.id) ? '#1d4ed8' : PRIMARY,
                                  border: (selectedEpisode?.id === ep.id || selectedEpisodeId === ep.id) ? '1.5px solid #2563eb' : '1px solid transparent',
                                  '&:hover': { bgcolor: '#e0f2fe' }
                                }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* SOAP Structured Cards */}
                      <Stack spacing={1.5} sx={{ flex: 1 }}>
                        <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: '#1d4ed8', display: 'block', mb: 0.3 }}>
                            S (Subjective Complaints & Pain Pattern):
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.82rem', lineHeight: 1.5 }}>
                            {soapForm.soapSubjective || currentRegion.soapSubjective}
                          </Typography>
                        </Box>

                        <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', borderLeft: '4px solid #06b6d4' }}>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: '#0891b2', display: 'block', mb: 0.3 }}>
                            O (Objective ROM Goniometry & Muscle Power):
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.82rem', lineHeight: 1.5 }}>
                            {soapForm.soapObjective || currentRegion.soapObjective}
                          </Typography>
                        </Box>

                        <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6' }}>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: '#6d28d9', display: 'block', mb: 0.3 }}>
                            A (Assessment & Functional Impairment Diagnosis):
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.82rem', lineHeight: 1.5 }}>
                            {soapForm.soapAssessment || currentRegion.soapAssessment}
                          </Typography>
                        </Box>

                        <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', borderLeft: '4px solid #22c55e' }}>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: '#15803d', display: 'block', mb: 0.3 }}>
                            P (Plan, Prescription & Modality Package):
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.82rem', lineHeight: 1.5 }}>
                            {soapForm.soapPlan || currentRegion.soapPlan}
                          </Typography>
                        </Box>
                      </Stack>

                      {/* Action Bar */}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
                        <Button
                          variant="contained"
                          startIcon={<Videocam />}
                          onClick={() => {
                            setSelectedExercise(currentRegion.protocolKey);
                            setActiveTab(0);
                            navigate('/rehabilitation/mirror');
                            enqueueSnackbar(`🚀 Loaded ${currentRegion.protocolKey} in Kinematic Biofeedback Mirror!`, { variant: 'success' });
                          }}
                          sx={{
                            bgcolor: '#0f172a',
                            color: '#38bdf8',
                            fontWeight: 800,
                            textTransform: 'none',
                            border: '1px solid #38bdf8',
                            flex: 1,
                            '&:hover': { bgcolor: '#1e293b' }
                          }}
                        >
                          🚀 Launch {currentRegion.protocolKey} in Mirror
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<EditNote />}
                          onClick={() => {
                            setSoapForm(prev => ({
                              ...prev,
                              diagnosis: currentRegion.diagnosis,
                              painVasScore: currentRegion.painVasScore,
                              soapSubjective: currentRegion.soapSubjective,
                              soapObjective: currentRegion.soapObjective,
                              soapAssessment: currentRegion.soapAssessment,
                              soapPlan: currentRegion.soapPlan,
                              selectedBodyPins: [currentRegion.label]
                            }));
                            setSoapModalOpen(true);
                          }}
                          sx={{ bgcolor: TEAL, fontWeight: 800, textTransform: 'none', flex: 1 }}
                        >
                          📝 Customize & Save SOAP to EHR
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              );
            })()}
          </Box>
        </TabPanel>

        {/* ── TAB 5: RECOVERY GRAPHS & OUTCOME TRENDS ─────────────────────── */}
        <TabPanel value={activeTab} index={5}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, mb: 2 }}>
              📈 Patient Progressive Recovery Trend Graph (Pain VAS vs ROM Flexion)
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={recoveryTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="painVas" name="Pain VAS Score (1-10)" stroke="#dc2626" strokeWidth={3} />
                  <Line type="monotone" dataKey="flexRom" name="Knee Flexion ROM (°)" stroke="#0d9488" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Box>
        </TabPanel>

        {/* ── TAB 6: MODALITY & EQUIPMENT REGISTRY ─────────────────────────── */}
        <TabPanel value={activeTab} index={6}>
          <Box sx={{ p: 3 }}>
            {/* Header with Title and Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 1 }}>
                  🏋️ Physiotherapy Equipment & Electrotherapy Modalities Registry
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Biomedical calibration, safety certifications, asset telemetry, and active patient modality allocation
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={() => handlePrintSafetyInspectionReport()}
                  sx={{ borderColor: '#94a3b8', color: '#334155', fontWeight: 800, textTransform: 'none' }}
                >
                  Calibration Safety Log (PDF)
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setRegisterEquipmentModalOpen(true)}
                  sx={{ bgcolor: PURPLE, fontWeight: 800, textTransform: 'none' }}
                >
                  + Register New Modality
                </Button>
              </Stack>
            </Box>

            {/* Filter & Search Toolbar */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Search equipment by name, code, serial no, or room..."
                    value={equipmentSearchQuery}
                    onChange={e => setEquipmentSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ color: '#94a3b8', mr: 1, fontSize: 20 }} />
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mr: 0.5 }}>
                      Category:
                    </Typography>
                    <Chip
                      size="small"
                      label={`All (${filteredEquipment.length})`}
                      onClick={() => setEquipmentCategoryFilter('ALL')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: equipmentCategoryFilter === 'ALL' ? PRIMARY : '#fff',
                        color: equipmentCategoryFilter === 'ALL' ? '#fff' : '#475569',
                        border: '1px solid #cbd5e1'
                      }}
                    />
                    <Chip
                      size="small"
                      label="⚡ Electrotherapy"
                      onClick={() => setEquipmentCategoryFilter('ELECTROTHERAPY')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: equipmentCategoryFilter === 'ELECTROTHERAPY' ? PURPLE : '#fff',
                        color: equipmentCategoryFilter === 'ELECTROTHERAPY' ? '#fff' : PURPLE,
                        border: '1px solid #ddd6fe'
                      }}
                    />
                    <Chip
                      size="small"
                      label="🔥 Diathermy & Heat"
                      onClick={() => setEquipmentCategoryFilter('THERMAL_DIATHERMY')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: equipmentCategoryFilter === 'THERMAL_DIATHERMY' ? '#b45309' : '#fff',
                        color: equipmentCategoryFilter === 'THERMAL_DIATHERMY' ? '#fff' : '#b45309',
                        border: '1px solid #fde68a'
                      }}
                    />
                    <Chip
                      size="small"
                      label="🦴 Traction & Spine"
                      onClick={() => setEquipmentCategoryFilter('TRACTION_DECOMPRESSION')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: equipmentCategoryFilter === 'TRACTION_DECOMPRESSION' ? '#0369a1' : '#fff',
                        color: equipmentCategoryFilter === 'TRACTION_DECOMPRESSION' ? '#fff' : '#0369a1',
                        border: '1px solid #bae6fd'
                      }}
                    />
                    <Chip
                      size="small"
                      label="🔊 Ultrasound"
                      onClick={() => setEquipmentCategoryFilter('ULTRASOUND_THERAPY')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: equipmentCategoryFilter === 'ULTRASOUND_THERAPY' ? TEAL : '#fff',
                        color: equipmentCategoryFilter === 'ULTRASOUND_THERAPY' ? '#fff' : TEAL,
                        border: '1px solid #99f6e4'
                      }}
                    />
                    <Chip
                      size="small"
                      label="🦾 Mechanotherapy & CPM"
                      onClick={() => setEquipmentCategoryFilter('MECHANOTHERAPY')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: equipmentCategoryFilter === 'MECHANOTHERAPY' ? '#0f766e' : '#fff',
                        color: equipmentCategoryFilter === 'MECHANOTHERAPY' ? '#fff' : '#0f766e',
                        border: '1px solid #ccfbf1'
                      }}
                    />
                    <Chip
                      size="small"
                      label="👤 In-Use (Assigned)"
                      onClick={() => setEquipmentCategoryFilter('IN_USE')}
                      sx={{
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: equipmentCategoryFilter === 'IN_USE' ? '#dc2626' : '#fff',
                        color: equipmentCategoryFilter === 'IN_USE' ? '#fff' : '#dc2626',
                        border: '1px solid #fecaca'
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Equipment Grid Cards */}
            <Grid container spacing={2.5}>
              {filteredEquipment.length === 0 ? (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', borderRadius: 3, bgcolor: '#f8fafc' }}>
                    <FitnessCenter sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      No equipment matching your selected filters.
                    </Typography>
                    <Button size="small" onClick={() => { setEquipmentCategoryFilter('ALL'); setEquipmentSearchQuery(''); }} sx={{ mt: 1 }}>
                      Reset Filters
                    </Button>
                  </Paper>
                </Grid>
              ) : (
                filteredEquipment.map(eq => (
                  <Grid item xs={12} sm={6} md={3} key={eq.code}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        bgcolor: '#ffffff',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: '0 8px 24px rgba(139,92,246,0.12)',
                          borderColor: PURPLE,
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <FitnessCenter sx={{ fontSize: 32, color: PURPLE }} />
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="View Tech Specs & Safety Cert">
                              <IconButton
                                size="small"
                                onClick={() => setSelectedEquipmentForDetail(eq)}
                                sx={{ color: '#64748b', '&:hover': { color: PRIMARY } }}
                              >
                                <EditNote fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print Individual Safety Certificate">
                              <IconButton
                                size="small"
                                onClick={() => handlePrintSafetyInspectionReport(eq)}
                                sx={{ color: '#64748b', '&:hover': { color: PRIMARY } }}
                              >
                                <Print fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>

                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, minHeight: 38, lineHeight: 1.3 }}>
                          {eq.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {eq.code} · {eq.location || eq.room}
                        </Typography>

                        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center' }}>
                          <Chip
                            label={eq.status || 'CALIBRATED & ACTIVE'}
                            size="small"
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.65rem',
                              bgcolor: eq.status === 'CALIBRATED & ACTIVE' ? '#16a34a' : (eq.status === 'IN_USE' ? '#0284c7' : '#d97706'),
                              color: '#ffffff'
                            }}
                          />

                          {eq.assignedPatient && (
                            <Chip
                              label={`👤 ${eq.assignedPatient}`}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                bgcolor: '#eff6ff',
                                color: PRIMARY,
                                border: '1px solid #bfdbfe'
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      {/* Card Action Buttons Footer */}
                      <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleCalibrateEquipment(eq.id || eq.code)}
                          sx={{
                            flex: 1,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            textTransform: 'none',
                            py: 0.5,
                            borderColor: '#cbd5e1',
                            color: '#334155',
                            '&:hover': { borderColor: '#16a34a', color: '#16a34a' }
                          }}
                        >
                          🔧 Calibrate
                        </Button>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            setEquipmentAssignTarget(eq);
                            setEquipmentAssignPatient(eq.assignedPatient || '');
                            setAssignEquipmentModalOpen(true);
                          }}
                          sx={{
                            flex: 1,
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            textTransform: 'none',
                            py: 0.5,
                            bgcolor: eq.assignedPatient ? '#f1f5f9' : '#f5f3ff',
                            color: eq.assignedPatient ? '#475569' : '#6d28d9',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: eq.assignedPatient ? '#e2e8f0' : '#ede9fe', boxShadow: 'none' }
                          }}
                        >
                          {eq.assignedPatient ? '🔓 Release' : '👤 Assign'}
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* ── TAB 7: HOME EXERCISE PROGRAM (HEP) ───────────────────────────── */}
        <TabPanel value={activeTab} index={7}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>
                🖨️ Prescribed Home Exercise Programs (HEP)
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {episodes.map(ep => (
                <Grid item xs={12} md={6} key={ep.id}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>{ep.patientName}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                      Diagnosis: {ep.diagnosis} · Setting: {ep.careSetting}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: '#334155' }}>
                      {ep.soapPlan}
                    </Typography>
                    <Button variant="outlined" startIcon={<Print />} onClick={() => handlePrintHEP(ep)} sx={{ fontWeight: 800 }}>
                      Print Official HEP Prescription (PDF)
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* ── MODAL: CLINICAL KINEMATIC MOVEMENT REPORT ──────────────────── */}
      {(() => {
        const totalRecordedReps = recordedReps.length;
        const liveRepsCount = recordedReps.filter(r => r.source !== 'MANUAL_ENTRY').length;
        const manualRepsCount = recordedReps.filter(r => r.source === 'MANUAL_ENTRY').length;
        const avgScore = totalRecordedReps > 0
          ? Math.round(recordedReps.reduce((s, r) => s + r.movementScore, 0) / totalRecordedReps)
          : null;
        const peakAngle = totalRecordedReps > 0
          ? Math.max(...recordedReps.map(r => Math.max(r.leftJointAngle, r.rightJointAngle)))
          : null;
        const avgTorso = totalRecordedReps > 0
          ? Math.round(recordedReps.reduce((s, r) => s + r.torsoAlignment, 0) / totalRecordedReps)
          : null;
        const formWarningsCount = recordedReps.filter(r => r.movementState === 'IMPROVE_FORM').length;
        const currentGoalData = resolvePatientGoalAndProtocol(selectedEpisode || episodes[0]);

        return (
          <Dialog open={aiReportModalOpen} onClose={() => setAiReportModalOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome sx={{ color: CYAN }} /> Kinematic Biofeedback Mirror — Clinical Movement Audit Report
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={totalRecordedReps > 0 ? `${totalRecordedReps} Reps (${liveRepsCount} Live CV / ${manualRepsCount} Manual)` : '0 Reps Recorded'}
                  size="small"
                  sx={{
                    bgcolor: totalRecordedReps > 0 ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.1)',
                    color: totalRecordedReps > 0 ? '#38bdf8' : '#94a3b8',
                    fontWeight: 800
                  }}
                />
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5}>
                {/* Patient Goal & Context Header Banner */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 2 }}>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                        Active Patient & Diagnosis
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: PRIMARY }}>
                        {selectedEpisode?.patientName || 'Jane Doe'} ({selectedEpisode?.id || 'REH-2026-001'})
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#475569' }}>
                        Dx: {selectedEpisode?.diagnosis || 'Post-OP Total Knee Arthroplasty (Right)'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                        Target Exercise Protocol & Recovery Goal
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: TEAL }}>
                        🏋️ {selectedExercise}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#047857', fontWeight: 700 }}>
                        🎯 Goal: {currentGoalData.recoveryGoal}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                <Alert severity={totalRecordedReps > 0 ? "info" : "warning"} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      {totalRecordedReps > 0 ? (
                        <>
                          <strong>Clinical Motion Analysis Summary:</strong> Recorded {totalRecordedReps} total repetitions ({liveRepsCount} via <strong>Live Camera CV</strong>, {manualRepsCount} via <strong>Therapist Manual Entry</strong>) for <strong>{selectedExercise}</strong>.
                          <Box sx={{ mt: 0.5, fontSize: '0.76rem', color: 'text.secondary' }}>
                            Protocol Standards: Target ROM ≥ 85°–120° • Hold ≥ {targetHoldDuration}s • Bilateral Symmetry ≥ 80% • Torso Alignment ≥ 75%
                          </Box>
                        </>
                      ) : (
                        <>
                          <strong>Awaiting Movement Recording:</strong> No repetitions recorded in this session yet.
                          <Box sx={{ mt: 0.5, fontSize: '0.76rem', color: 'text.secondary' }}>
                            You can record movements automatically via <strong>📹 LIVE CAMERA</strong> or log goniometer readings manually via <strong>✍️ Manual Rep Entry</strong>.
                          </Box>
                        </>
                      )}
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {totalRecordedReps > 0 && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          startIcon={<Refresh />}
                          onClick={() => {
                            setRecordedReps([]);
                            repCountRef.current = 0;
                            setRepCount(0);
                            enqueueSnackbar('🔄 Repetition audit log reset for new session', { variant: 'info' });
                          }}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          Reset Log
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<EditNote />}
                        onClick={() => setManualRepModalOpen(true)}
                        sx={{ bgcolor: '#8b5cf6', color: '#fff', textTransform: 'none', fontSize: '0.75rem', fontWeight: 800, '&:hover': { bgcolor: '#7c3aed' } }}
                      >
                        ✍️ + Add Manual Rep
                      </Button>
                    </Stack>
                  </Box>
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: totalRecordedReps > 0 ? (avgScore! >= 80 ? '#f0fdf4' : '#fff7ed') : '#f8fafc', borderColor: totalRecordedReps > 0 ? (avgScore! >= 80 ? '#bbf7d0' : '#fed7aa') : '#e2e8f0' }}>
                      <Typography variant="caption" color="text.secondary">Overall Score</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: totalRecordedReps > 0 ? (avgScore! >= 80 ? SUCCESS : WARNING) : '#94a3b8' }}>
                        {totalRecordedReps > 0 ? `${avgScore} / 100` : '-- / 100'}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: totalRecordedReps > 0 ? '#f0fdf4' : '#f8fafc', borderColor: totalRecordedReps > 0 ? '#bbf7d0' : '#e2e8f0' }}>
                      <Typography variant="caption" color="text.secondary">Peak Joint Angle</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: totalRecordedReps > 0 ? TEAL : '#94a3b8' }}>
                        {totalRecordedReps > 0 ? `${peakAngle}°` : '--°'}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: totalRecordedReps > 0 ? '#f0fdf4' : '#f8fafc', borderColor: totalRecordedReps > 0 ? '#bbf7d0' : '#e2e8f0' }}>
                      <Typography variant="caption" color="text.secondary">Torso Alignment</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: totalRecordedReps > 0 ? PRIMARY : '#94a3b8' }}>
                        {totalRecordedReps > 0 ? `${avgTorso}%` : '--%'}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: totalRecordedReps > 0 ? (formWarningsCount > 0 ? '#fff7ed' : '#f0fdf4') : '#f8fafc', borderColor: totalRecordedReps > 0 ? (formWarningsCount > 0 ? '#ffedd5' : '#bbf7d0') : '#e2e8f0' }}>
                      <Typography variant="caption" color="text.secondary">Form Warnings</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: totalRecordedReps > 0 ? (formWarningsCount > 0 ? WARNING : SUCCESS) : '#94a3b8' }}>
                        {formWarningsCount} Event{formWarningsCount !== 1 ? 's' : ''}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY }}>Repetition Breakdown Log:</Typography>
                {recordedReps.length === 0 ? (
                  <Box sx={{
                    p: 4,
                    textAlign: 'center',
                    bgcolor: '#f8fafc',
                    borderRadius: 2.5,
                    border: '1.5px dashed #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Avatar sx={{ bgcolor: 'rgba(2,132,199,0.12)', color: '#0284c7', width: 54, height: 54, mb: 1.5 }}>
                      <Videocam sx={{ fontSize: 30 }} />
                    </Avatar>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARY, mb: 0.5 }}>
                      No Patient Repetitions Recorded Yet
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 520, mx: 'auto', mb: 2.5, fontSize: '0.84rem' }}>
                      Choose your preferred recording method: use the <strong>Live Camera</strong> for real-time computer vision biomechanical tracking, or use the <strong>Manual Rep Entry</strong> dialog to enter joint angles and clinical observations directly.
                    </Typography>
                    <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<Videocam />}
                        onClick={() => {
                          setAiReportModalOpen(false);
                          setCameraMode('WEBCAM');
                          setMirrorActive(true);
                          setRepCount(0);
                          repCountRef.current = 0;
                          setRecordedReps([]);
                        }}
                        sx={{ fontWeight: 800, textTransform: 'none', px: 2.5, py: 1, borderRadius: 2 }}
                      >
                        📹 Switch to Live Camera Mode
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<EditNote />}
                        onClick={() => {
                          setAiReportModalOpen(false);
                          setManualRepModalOpen(true);
                        }}
                        sx={{
                          bgcolor: '#8b5cf6',
                          color: '#fff',
                          fontWeight: 800,
                          textTransform: 'none',
                          px: 2.5,
                          py: 1,
                          borderRadius: 2,
                          '&:hover': { bgcolor: '#7c3aed' }
                        }}
                      >
                        ✍️ Open Manual Rep Entry Dialog
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                          {['Rep #', 'Method / Source', 'Time', 'Movement State', 'Score', 'Left Angle', 'Right Angle', 'Symmetry', 'Hold Time', 'Form Quality', 'Notes'].map(h => (
                            <TableCell key={h} sx={{ fontWeight: 800, fontSize: '0.72rem' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recordedReps.map(r => (
                          <TableRow key={r.repNumber} hover>
                            <TableCell sx={{ fontWeight: 700 }}>Rep {String(r.repNumber).padStart(2, '0')}</TableCell>
                            <TableCell>
                              <Chip
                                label={r.source === 'MANUAL_ENTRY' ? '✍️ Manual' : '📹 Live CV'}
                                size="small"
                                sx={{
                                  bgcolor: r.source === 'MANUAL_ENTRY' ? '#ede9fe' : '#cffafe',
                                  color: r.source === 'MANUAL_ENTRY' ? '#6d28d9' : '#0891b2',
                                  fontWeight: 800,
                                  fontSize: '0.68rem',
                                  height: 20
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{r.time}</TableCell>
                            <TableCell><StatusChip label={r.movementState} /></TableCell>
                            <TableCell sx={{ fontWeight: 800, color: r.movementScore >= 80 ? SUCCESS : WARNING }}>
                              {r.movementScore} / 100
                            </TableCell>
                            <TableCell>{r.leftJointAngle}°</TableCell>
                            <TableCell>{r.rightJointAngle}°</TableCell>
                            <TableCell>{r.symmetryScore}%</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: (r.holdDurationSec ?? 0) >= targetHoldDuration * 0.75 ? SUCCESS : WARNING }}>
                              {r.holdDurationSec !== undefined ? `${r.holdDurationSec}s / ${targetHoldDuration}s` : `${targetHoldDuration}s`}
                            </TableCell>
                            <TableCell sx={{
                              color: r.movementState === 'COMPLETED' ? SUCCESS : WARNING,
                              fontWeight: 800,
                              fontSize: '0.75rem'
                            }}>
                              {r.formQuality}
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.73rem', color: '#475569', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.notes || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => setAiReportModalOpen(false)}>Close</Button>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handlePrintAiMotionReport}
                  disabled={totalRecordedReps === 0}
                  sx={{ fontWeight: 800, textTransform: 'none' }}
                >
                  🖨️ Print Clinical Movement Report (PDF)
                </Button>
                <Button
                  variant="contained"
                  startIcon={attachingAiReport ? <CircularProgress size={16} color="inherit" /> : <AssignmentTurnedIn />}
                  onClick={handleAttachAiReportToEHR}
                  disabled={totalRecordedReps === 0 || attachingAiReport}
                  sx={{
                    bgcolor: CYAN,
                    color: '#0f172a',
                    fontWeight: 900,
                    textTransform: 'none',
                    '&:disabled': { bgcolor: 'rgba(0,0,0,0.12)', color: 'rgba(0,0,0,0.26)' }
                  }}
                >
                  {attachingAiReport ? 'Attaching to EHR...' : 'Attach Kinematic Motion Audit to Patient EHR Chart'}
                </Button>
              </Stack>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* ── MODAL: MANUAL KINEMATIC MOVEMENT LOGGER ────────────────────────── */}
      <Dialog open={manualRepModalOpen} onClose={() => setManualRepModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{
          fontWeight: 900,
          background: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <EditNote sx={{ fontSize: 28, color: '#fef08a' }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                Physiotherapist Manual Kinematic Movement Logger
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem' }}>
                Direct clinical entry for manual goniometer measurements, bedside ROM testing & guided therapy reps
              </Typography>
            </Box>
          </Box>
          <Chip
            label={selectedEpisode ? `${selectedEpisode.patientName}` : 'Active Session'}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800 }}
          />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* Patient Context Banner with Protocol & Goal */}
            {(() => {
              const activeEp = selectedEpisode || episodes[0];
              const goalInfo = resolvePatientGoalAndProtocol(activeEp);
              return (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#faf5ff', borderColor: '#e9d5ff', borderRadius: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#7e22ce', fontWeight: 800, textTransform: 'uppercase' }}>
                        Patient Profile & Issue
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: PRIMARY }}>
                        {activeEp?.patientName || 'Jane Doe'} ({activeEp?.id || 'REH-2026-001'})
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.82rem' }}>
                        <strong>Diagnosis:</strong> {activeEp?.diagnosis || 'Post-OP Total Knee Arthroplasty (Right)'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#7e22ce', fontWeight: 800, textTransform: 'uppercase' }}>
                        Specific Clinical Recovery Goal
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: '#047857', mt: 0.3 }}>
                        🎯 {goalInfo.recoveryGoal}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Target Protocol:</Typography>
                        <TextField
                          select
                          size="small"
                          value={selectedExercise}
                          onChange={e => setSelectedExercise(e.target.value)}
                          sx={{
                            minWidth: 200,
                            bgcolor: '#fff',
                            '& .MuiSelect-select': { py: 0.5, fontSize: '0.8rem', fontWeight: 800 }
                          }}
                        >
                          {Object.keys(PHYSIO_PROTOCOLS).map(pk => (
                            <MenuItem key={pk} value={pk}>
                              {PHYSIO_PROTOCOLS[pk].title}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              );
            })()}

            {/* Quick Clinical Presets */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                ⚡ Quick Clinical Assessment Presets:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setManualRepForm({
                      leftJointAngle: 120,
                      rightJointAngle: 120,
                      movementScore: 96,
                      symmetryScore: 98,
                      torsoAlignment: 95,
                      holdDurationSec: 3,
                      movementState: 'COMPLETED',
                      formQuality: 'Optimal Form • Full Target ROM Achieved',
                      therapistNotes: 'Excellent active neuromuscular recruitment with zero compensatory tilt.'
                    });
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, borderColor: '#86efac', color: '#15803d', bgcolor: '#f0fdf4' }}
                >
                  🌟 Optimal Recovery (Full ROM, 96% Score)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setManualRepForm({
                      leftJointAngle: 85,
                      rightJointAngle: 90,
                      movementScore: 78,
                      symmetryScore: 82,
                      torsoAlignment: 78,
                      holdDurationSec: 2,
                      movementState: 'COMPLETED',
                      formQuality: 'Good ROM • Mild Scapular/Pelvic Compensation',
                      therapistNotes: 'Functional range reached with mild compensatory trunk lean. Guided cueing provided.'
                    });
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, borderColor: '#fde047', color: '#a16207', bgcolor: '#fefce8' }}
                >
                  ⚖️ Moderate Compensation (85° ROM, 78% Score)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setManualRepForm({
                      leftJointAngle: 55,
                      rightJointAngle: 60,
                      movementScore: 56,
                      symmetryScore: 65,
                      torsoAlignment: 68,
                      holdDurationSec: 1,
                      movementState: 'IMPROVE_FORM',
                      formQuality: 'Restricted ROM • Pain/Guarding Limited',
                      therapistNotes: 'Movement arrested prematurely due to surgical pain/guarding. Passive assist utilized.'
                    });
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, borderColor: '#fca5a5', color: '#b91c1c', bgcolor: '#fef2f2' }}
                >
                  ⚠️ Restricted ROM / Pain Guarded (55° ROM, 56% Score)
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* Form Fields: Joint Angles, Scores, Form Quality */}
            <Grid container spacing={2.5}>
              {/* Joint ROM Angles */}
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Straighten sx={{ fontSize: 18, color: TEAL }} /> Joint Range of Motion (Degrees)
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Primary Active Joint Angle</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: TEAL }}>{manualRepForm.leftJointAngle}°</Typography>
                      </Box>
                      <Slider
                        value={manualRepForm.leftJointAngle}
                        min={0}
                        max={180}
                        step={1}
                        onChange={(_, v) => setManualRepForm(p => ({ ...p, leftJointAngle: v as number }))}
                        valueLabelDisplay="auto"
                        sx={{ color: TEAL }}
                      />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Contralateral / Secondary Joint Angle</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: TEAL }}>{manualRepForm.rightJointAngle}°</Typography>
                      </Box>
                      <Slider
                        value={manualRepForm.rightJointAngle}
                        min={0}
                        max={180}
                        step={1}
                        onChange={(_, v) => setManualRepForm(p => ({ ...p, rightJointAngle: v as number }))}
                        valueLabelDisplay="auto"
                        sx={{ color: TEAL }}
                      />
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Execution & Biomechanical Metrics */}
              <Grid item xs={12} sm={6}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: PRIMARY, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Speed sx={{ fontSize: 18, color: '#8b5cf6' }} /> Execution & Symmetry Metrics
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Overall Execution Score</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: '#8b5cf6' }}>{manualRepForm.movementScore} / 100</Typography>
                      </Box>
                      <Slider
                        value={manualRepForm.movementScore}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(_, v) => setManualRepForm(p => ({ ...p, movementScore: v as number }))}
                        valueLabelDisplay="auto"
                        sx={{ color: '#8b5cf6' }}
                      />
                    </Box>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <TextField
                          label="Bilateral Symmetry (%)"
                          type="number"
                          size="small"
                          fullWidth
                          value={manualRepForm.symmetryScore}
                          onChange={e => setManualRepForm(p => ({ ...p, symmetryScore: Number(e.target.value) }))}
                          inputProps={{ min: 0, max: 100 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Hold Duration (sec)"
                          type="number"
                          size="small"
                          fullWidth
                          value={manualRepForm.holdDurationSec}
                          onChange={e => setManualRepForm(p => ({ ...p, holdDurationSec: Number(e.target.value) }))}
                          inputProps={{ min: 0, max: 30 }}
                        />
                      </Grid>
                    </Grid>
                    <Grid container spacing={1.5}>
                      <Grid item xs={6}>
                        <TextField
                          label="Torso Alignment (%)"
                          type="number"
                          size="small"
                          fullWidth
                          value={manualRepForm.torsoAlignment}
                          onChange={e => setManualRepForm(p => ({ ...p, torsoAlignment: Number(e.target.value) }))}
                          inputProps={{ min: 0, max: 100 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          select
                          label="Movement State"
                          size="small"
                          fullWidth
                          value={manualRepForm.movementState}
                          onChange={e => setManualRepForm(p => ({ ...p, movementState: e.target.value as any }))}
                        >
                          <MenuItem value="COMPLETED">✅ COMPLETED (Passed)</MenuItem>
                          <MenuItem value="IMPROVE_FORM">⚠️ IMPROVE_FORM (Warning)</MenuItem>
                        </TextField>
                      </Grid>
                    </Grid>
                  </Stack>
                </Paper>
              </Grid>

              {/* Form Quality Description & Clinical Notes */}
              <Grid item xs={12}>
                <TextField
                  label="Form Quality Description / Compensation Pattern"
                  size="small"
                  fullWidth
                  value={manualRepForm.formQuality}
                  onChange={e => setManualRepForm(p => ({ ...p, formQuality: e.target.value }))}
                  placeholder="e.g., Optimal Form • Full ROM Achieved, Mild Trunk Lean, Scapular Winging"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Physiotherapist Clinical Observation / Goniometer Notes"
                  multiline
                  rows={2}
                  fullWidth
                  value={manualRepForm.therapistNotes}
                  onChange={e => setManualRepForm(p => ({ ...p, therapistNotes: e.target.value }))}
                  placeholder="Record patient effort, muscle recruitment cues, pain levels (NRS), or passive assistance provided during the movement."
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setManualRepModalOpen(false)} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<EditNote />}
              onClick={() => handleSaveManualRep(1)}
              sx={{ fontWeight: 800, textTransform: 'none', borderColor: '#8b5cf6', color: '#7c3aed' }}
            >
              ✍️ Log 1 Repetition
            </Button>
            <Button
              variant="contained"
              startIcon={<Checklist />}
              onClick={() => handleSaveManualRep(5)}
              sx={{
                bgcolor: '#8b5cf6',
                color: '#fff',
                fontWeight: 900,
                textTransform: 'none',
                px: 2,
                '&:hover': { bgcolor: '#7c3aed' }
              }}
            >
              ⚡ Log 1 Set (5 Reps)
            </Button>
            <Button
              variant="contained"
              startIcon={<AssignmentTurnedIn />}
              onClick={() => handleSaveManualRep(10)}
              sx={{
                bgcolor: '#047857',
                color: '#fff',
                fontWeight: 900,
                textTransform: 'none',
                px: 2.5,
                '&:hover': { bgcolor: '#065f46' }
              }}
            >
              📦 Log Full Set (10 Reps)
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* ── MODAL 1: QUICK REGISTER EXTERNAL CLIENT ──────────────────────── */}
      <Dialog open={externalIntakeModalOpen} onClose={() => setExternalIntakeModalOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleExternalIntake}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: PURPLE, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCard /> External Client Quick Register & Treatment Package Intake
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                Instant intake for direct walk-in clients or referrals from external hospitals. Sets up patient profile, treatment package credits, and cashier billing.
              </Alert>

              <TextField
                select
                label="Intake Pathway"
                fullWidth
                size="small"
                value={externalIntakeForm.intakeType}
                onChange={e => setExternalIntakeForm(p => ({ ...p, intakeType: e.target.value }))}
              >
                <MenuItem value="DIRECT_ACCESS_WALKIN">🚶 Scenario A: Direct Access Walk-in (Self-Referral)</MenuItem>
                <MenuItem value="EXTERNAL_HOSPITAL_REFERRAL">🏥 Scenario B: Referral Letter from External Hospital</MenuItem>
              </TextField>

              <TextField
                label="Client Full Name *"
                fullWidth
                size="small"
                value={externalIntakeForm.clientName}
                onChange={e => setExternalIntakeForm(p => ({ ...p, clientName: e.target.value }))}
                required
              />

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <TextField
                    type="number"
                    label="Age *"
                    fullWidth
                    size="small"
                    value={externalIntakeForm.age}
                    onChange={e => setExternalIntakeForm(p => ({ ...p, age: Number(e.target.value) }))}
                    required
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    select
                    label="Gender *"
                    fullWidth
                    size="small"
                    value={externalIntakeForm.gender}
                    onChange={e => setExternalIntakeForm(p => ({ ...p, gender: e.target.value }))}
                  >
                    <MenuItem value="MALE">Male</MenuItem>
                    <MenuItem value="FEMALE">Female</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Phone Number *"
                    fullWidth
                    size="small"
                    value={externalIntakeForm.phone}
                    onChange={e => setExternalIntakeForm(p => ({ ...p, phone: e.target.value }))}
                    required
                  />
                </Grid>
              </Grid>

              {externalIntakeForm.intakeType === 'EXTERNAL_HOSPITAL_REFERRAL' && (
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#faf5ff', borderRadius: 2, border: '1px solid #e9d5ff' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: PURPLE, display: 'block', mb: 1 }}>
                    🏥 External Hospital & Referral Letter Upload:
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <TextField
                        label="External Hospital Name *"
                        fullWidth
                        size="small"
                        value={externalIntakeForm.externalHospitalName}
                        onChange={e => setExternalIntakeForm(p => ({ ...p, externalHospitalName: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="External Doctor Name"
                        fullWidth
                        size="small"
                        value={externalIntakeForm.externalDoctorName}
                        onChange={e => setExternalIntakeForm(p => ({ ...p, externalDoctorName: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Scanned Referral Document URL / File"
                        fullWidth
                        size="small"
                        value={externalIntakeForm.externalReferralDoc}
                        onChange={e => setExternalIntakeForm(p => ({ ...p, externalReferralDoc: e.target.value }))}
                        helperText="Digitally digitized referral note for Physio consultation"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              )}

              <TextField
                label="Primary Chief Complaint & Area of Pain *"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={externalIntakeForm.primaryComplaint}
                onChange={e => setExternalIntakeForm(p => ({ ...p, primaryComplaint: e.target.value }))}
                required
              />

              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', display: 'block', mb: 1 }}>
                  🎟️ Financial Gatekeeper — Treatment Package & Pricing:
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <TextField
                      label="Treatment Package Name"
                      fullWidth
                      size="small"
                      value={externalIntakeForm.packageType}
                      onChange={e => setExternalIntakeForm(p => ({ ...p, packageType: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      type="number"
                      label="Sessions"
                      fullWidth
                      size="small"
                      value={externalIntakeForm.packageSessions}
                      onChange={e => setExternalIntakeForm(p => ({ ...p, packageSessions: Number(e.target.value) }))}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      type="number"
                      label="Cost (₦)"
                      fullWidth
                      size="small"
                      value={externalIntakeForm.packageCost}
                      onChange={e => setExternalIntakeForm(p => ({ ...p, packageCost: Number(e.target.value) }))}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setExternalIntakeModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: PURPLE, fontWeight: 800 }}>
              Register & Initialize Session Credits
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── MODAL 3: SOAP ASSESSMENT & DIGITAL BODY MAP ─────────────────────── */}
      <Dialog open={soapModalOpen} onClose={() => setSoapModalOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSaveSOAPAssessment}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <RateReview /> Initial SOAP Clinical Assessment & Body Pain Map
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <Grid container spacing={2}>
                {/* 1. Patient Full Name (Filtered to Patients Admitted to Physiotherapy) */}
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={physioAdmittedPatients}
                    getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      return option.patientName || '';
                    }}
                    value={soapForm.patientName}
                    onInputChange={(_, newInputValue) => {
                      setSoapForm(p => ({ ...p, patientName: newInputValue }));
                    }}
                    onChange={(_, selectedOption: any) => {
                      if (typeof selectedOption === 'string') {
                        setSoapForm(p => ({ ...p, patientName: selectedOption }));
                      } else if (selectedOption) {
                        setSoapForm(p => ({
                          ...p,
                          patientName: selectedOption.patientName,
                          diagnosis: selectedOption.diagnosis || p.diagnosis,
                          referredBy: selectedOption.referredBy || p.referredBy,
                          referredFrom: selectedOption.referredFrom || p.referredFrom,
                          careSetting: selectedOption.careSetting || p.careSetting,
                          wardLocation: selectedOption.wardLocation || p.wardLocation,
                          painVasScore: selectedOption.painVasScore ?? p.painVasScore,
                          soapSubjective: selectedOption.soapSubjective || p.soapSubjective,
                          soapObjective: selectedOption.soapObjective || p.soapObjective,
                          soapAssessment: selectedOption.soapAssessment || p.soapAssessment,
                          soapPlan: selectedOption.soapPlan || p.soapPlan,
                        }));
                      }
                    }}
                    renderOption={(props, option: any) => (
                      <Box component="li" {...props} key={option.id || option.patientName || Math.random()}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', py: 0.8 }}>
                          <Avatar sx={{ bgcolor: PRIMARY, width: 34, height: 34, fontSize: '0.82rem', fontWeight: 800 }}>
                            {(option.patientName?.[0] || 'P').toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: PRIMARY, fontSize: '0.88rem' }}>
                                {option.patientName}
                              </Typography>
                              <Chip
                                size="small"
                                label={option.careSetting === 'INPATIENT_BEDSIDE' ? '🛏️ Bedside' : '🏋️ Gym Clinic'}
                                sx={{
                                  height: 18,
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  bgcolor: option.careSetting === 'INPATIENT_BEDSIDE' ? '#fef3c7' : '#ecfeff',
                                  color: option.careSetting === 'INPATIENT_BEDSIDE' ? '#b45309' : '#0891b2'
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              🩺 {option.diagnosis}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', flexWrap: 'wrap', mt: 0.3 }}>
                              <Chip size="small" label={option.wardLocation || 'Physio Unit'} sx={{ height: 16, fontSize: '0.62rem', bgcolor: '#f1f5f9', fontWeight: 700 }} />
                              <Chip size="small" label={`${option.sessionsCompleted}/${option.packageTotal} Sessions`} sx={{ height: 16, fontSize: '0.62rem', bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800 }} />
                              {option.phone && <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>📞 {option.phone}</Typography>}
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Patient Full Name *"
                        size="small"
                        fullWidth
                        required
                        placeholder="Select from admitted Physiotherapy patients..."
                        helperText="Shows only patients admitted / enrolled in Physiotherapy & Rehab"
                      />
                    )}
                  />
                </Grid>

                {/* 2. Referring Department & Physician (Dropdown with Specialty Groups) */}
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={allPhysicianOptions}
                    groupBy={(option: any) => option.group || 'Hospital Clinicians'}
                    getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      return option.label || option.name || '';
                    }}
                    value={soapForm.referredBy}
                    onInputChange={(_, newInputValue) => {
                      setSoapForm(p => ({ ...p, referredBy: newInputValue }));
                    }}
                    onChange={(_, selected: any) => {
                      if (typeof selected === 'string') {
                        setSoapForm(p => ({ ...p, referredBy: selected }));
                      } else if (selected) {
                        setSoapForm(p => ({
                          ...p,
                          referredBy: selected.label || selected.name,
                          referredFrom: selected.dept || p.referredFrom
                        }));
                      }
                    }}
                    renderOption={(props, option: any) => (
                      <Box component="li" {...props} key={option.label || option.id || Math.random()}>
                        <Box sx={{ py: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.84rem' }}>
                            {option.label || option.name}
                          </Typography>
                          {option.dept && (
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                              Department: {option.dept}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Referring Department & Physician *"
                        size="small"
                        fullWidth
                        required
                        placeholder="Select specialist or type doctor name..."
                      />
                    )}
                  />
                </Grid>

                {/* 3. Clinical Diagnosis (Data Dictionary ICD-10 Search) */}
                <Grid item xs={12} sm={6}>
                  <TerminologyAutocomplete
                    system="ICD10"
                    label="Clinical Diagnosis (Data Dictionary ICD-10) *"
                    placeholder="Search 600,000+ Data Dictionary concepts (e.g. Spondylosis, Stroke, TKA)..."
                    value={soapForm.diagnosis}
                    extraOptions={PHYSIO_DATA_DICTIONARY_DIAGNOSES}
                    onChange={(val: any, display?: string) => {
                      const chosen = display || (typeof val === 'string' ? val : '');
                      setSoapForm(p => ({ ...p, diagnosis: chosen }));
                      // Match body region preset
                      const matchedPreset = BODY_REGIONS.find(r => 
                        chosen.toLowerCase().includes(r.label.toLowerCase().split('/')[0].trim()) ||
                        chosen.toLowerCase().includes(r.protocolKey.toLowerCase())
                      );
                      if (matchedPreset) {
                        setSelectedBodyRegion(matchedPreset.id);
                        if (!soapForm.selectedBodyPins.includes(matchedPreset.label)) {
                          setSoapForm(prev => ({
                            ...prev,
                            selectedBodyPins: [...prev.selectedBodyPins, matchedPreset.label]
                          }));
                        }
                      }
                    }}
                    fullWidth
                    required
                  />
                </Grid>

                {/* 4. Care Setting Mode */}
                <Grid item xs={12} sm={6}>
                  <TextField select label="Care Setting Mode" fullWidth size="small" value={soapForm.careSetting} onChange={e => setSoapForm(p => ({ ...p, careSetting: e.target.value }))}>
                    <MenuItem value="OUTPATIENT_GYM">🏋️ Outpatient Gym Clinic</MenuItem>
                    <MenuItem value="INPATIENT_BEDSIDE">🛏️ Inpatient Ward Bedside</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              {/* SOAP INPUTS */}
              <TextField label="S (Subjective) — Patient Complaints & Pain History" multiline rows={2} fullWidth value={soapForm.soapSubjective} onChange={e => setSoapForm(p => ({ ...p, soapSubjective: e.target.value }))} />
              <TextField label="O (Objective) — ROM Measurements & Muscle Strength (MRC Grade 0-5)" multiline rows={2} fullWidth value={soapForm.soapObjective} onChange={e => setSoapForm(p => ({ ...p, soapObjective: e.target.value }))} />
              <TextField label="A (Assessment) — Impairment Conclusion & Functional Index" multiline rows={2} fullWidth value={soapForm.soapAssessment} onChange={e => setSoapForm(p => ({ ...p, soapAssessment: e.target.value }))} />
              <TextField label="P (Plan) — Treatment Modality Package & Goals" multiline rows={2} fullWidth value={soapForm.soapPlan} onChange={e => setSoapForm(p => ({ ...p, soapPlan: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setSoapModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: TEAL, fontWeight: 800 }}>Save Progressive Plan</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── MODAL 4: RECORD DAILY SESSION ───────────────────────────────────── */}
      <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleRecordSession}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: PURPLE, color: '#fff' }}>Log Daily Therapy Session & Modalities</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField select label="Select Active Patient Episode" fullWidth size="small" value={selectedEpisodeId || episodes[0]?.id || ''} onChange={e => setSelectedEpisodeId(e.target.value)}>
                {episodes.map(ep => <MenuItem key={ep.id} value={ep.id}>{ep.patientName} ({ep.id})</MenuItem>)}
              </TextField>
              <TextField label="Modalities Used (e.g. TENS, Cryotherapy, Traction)" multiline rows={2} fullWidth size="small" value={sessionForm.modalities} onChange={e => setSessionForm(p => ({ ...p, modalities: e.target.value }))} />
              <TextField label="Prescribed Exercises & Reps" multiline rows={2} fullWidth size="small" value={sessionForm.exercises} onChange={e => setSessionForm(p => ({ ...p, exercises: e.target.value }))} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField type="number" label="Pre VAS Pain Score" size="small" fullWidth value={sessionForm.prePainScore} onChange={e => setSessionForm(p => ({ ...p, prePainScore: Number(e.target.value) }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField type="number" label="Post VAS Pain Score" size="small" fullWidth value={sessionForm.postPainScore} onChange={e => setSessionForm(p => ({ ...p, postPainScore: Number(e.target.value) }))} />
                </Grid>
              </Grid>
              <TextField label="Patient Response Note" multiline rows={2} fullWidth size="small" value={sessionForm.patientResponse} onChange={e => setSessionForm(p => ({ ...p, patientResponse: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSessionDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: PURPLE, fontWeight: 800 }}>Deduct 1 Session & Save Log</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── MODAL 5: MUSIC PLAYLIST MANAGER ─────────────────────────────────── */}
      <Dialog open={playlistDialogOpen} onClose={() => setPlaylistDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MusicNote sx={{ color: '#38bdf8' }} />
            <span>Rehab Music Playlist ({playlist.length} Tracks)</span>
          </Box>
          <Chip
            size="small"
            label={playbackOrder === 'SHUFFLE' ? '🔀 Shuffle Mode' : '🔁 Sequential Mode'}
            sx={{ bgcolor: 'rgba(56,189,248,0.2)', color: '#38bdf8', fontWeight: 800 }}
          />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {playlist.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>
              <MusicNote sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                No music files in playlist
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Upload multiple audio files to play during kinematic exercise sessions.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {playlist.map((track, idx) => {
                const isCurrent = idx === currentTrackIdx;
                return (
                  <Paper
                    key={track.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: isCurrent ? 'rgba(56,189,248,0.08)' : '#fff',
                      borderColor: isCurrent ? '#38bdf8' : '#e2e8f0',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1, minWidth: 0 }}>
                      <Avatar sx={{
                        width: 32, height: 32,
                        bgcolor: isCurrent ? '#38bdf8' : '#f1f5f9',
                        color: isCurrent ? '#0f172a' : '#64748b',
                        fontSize: '0.8rem', fontWeight: 800
                      }}>
                        {idx + 1}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="subtitle2" sx={{
                          fontWeight: isCurrent ? 800 : 600,
                          color: isCurrent ? '#0284c7' : '#1e293b',
                          fontSize: '0.86rem',
                          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                        }}>
                          {track.name}
                        </Typography>
                        {isCurrent && (
                          <Chip
                            size="small"
                            label={mirrorActive ? "▶ NOW PLAYING" : "⏸ CURRENT"}
                            sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: 'rgba(34,197,94,0.15)', color: '#16a34a' }}
                          />
                        )}
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        size="small"
                        variant={isCurrent ? "contained" : "outlined"}
                        onClick={() => {
                          setCurrentTrackIdx(idx);
                          setAudioMode('CUSTOM');
                          setIsAudioMuted(false);
                        }}
                        sx={{ fontSize: '0.72rem', textTransform: 'none', py: '2px', px: 1.5 }}
                      >
                        {isCurrent ? 'Playing' : 'Play'}
                      </Button>
                      <IconButton size="small" onClick={() => handleRemoveTrack(track.id)} sx={{ color: '#ef4444' }}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              disabled={playlist.length === 0}
              onClick={handleClearPlaylist}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Clear Playlist
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CloudUpload />}
              onClick={() => customAudioInputRef.current?.click()}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Add More Songs
            </Button>
          </Stack>
          <Button variant="contained" onClick={() => setPlaylistDialogOpen(false)} sx={{ bgcolor: PRIMARY, fontWeight: 800 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MODAL 6: BOOK NEW SCHEDULE APPOINTMENT ─────────────────────────── */}
      <Dialog open={scheduleBookingModalOpen} onClose={() => setScheduleBookingModalOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateScheduleSlot}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: CYAN, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventNote /> Schedule Rehabilitation & Physiotherapy Appointment
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              {/* Select Admitted Patient */}
              <Autocomplete
                freeSolo
                options={physioAdmittedPatients}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return option.patientName || '';
                }}
                value={scheduleBookingForm.patientName}
                onInputChange={(_, newInputValue) => {
                  setScheduleBookingForm(p => ({ ...p, patientName: newInputValue }));
                }}
                onChange={(_, selectedOption: any) => {
                  if (typeof selectedOption === 'string') {
                    setScheduleBookingForm(p => ({ ...p, patientName: selectedOption }));
                  } else if (selectedOption) {
                    setScheduleBookingForm(p => ({
                      ...p,
                      patientName: selectedOption.patientName,
                      episodeId: selectedOption.id || selectedOption.patientNumber || '',
                      phone: selectedOption.phone || p.phone,
                      location: selectedOption.wardLocation || (selectedOption.careSetting === 'INPATIENT_BEDSIDE' ? 'Inpatient Ward Bedside' : 'Outpatient Physio Gym'),
                      patientType: selectedOption.careSetting || p.patientType,
                      treatmentPlan: selectedOption.diagnosis ? `${selectedOption.diagnosis} Exercise Protocol` : p.treatmentPlan,
                      packageTotal: selectedOption.packageTotal || p.packageTotal
                    }));
                  }
                }}
                renderOption={(props, option: any) => (
                  <Box component="li" {...props} key={option.id || option.patientName || Math.random()}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', py: 0.5 }}>
                      <Avatar sx={{ bgcolor: PRIMARY, width: 30, height: 30, fontSize: '0.75rem', fontWeight: 800 }}>
                        {(option.patientName?.[0] || 'P').toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: PRIMARY }}>
                          {option.patientName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {option.diagnosis} · {option.wardLocation || 'Physio'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Admitted Patient *"
                    size="small"
                    fullWidth
                    required
                    placeholder="Search from admitted Physiotherapy patients..."
                  />
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Patient Phone Number"
                    size="small"
                    fullWidth
                    value={scheduleBookingForm.phone}
                    onChange={e => setScheduleBookingForm(p => ({ ...p, phone: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Care Pathway Type"
                    size="small"
                    fullWidth
                    value={scheduleBookingForm.patientType}
                    onChange={e => setScheduleBookingForm(p => ({ ...p, patientType: e.target.value }))}
                  >
                    <MenuItem value="OUTPATIENT_GYM">🏋️ Outpatient Gym</MenuItem>
                    <MenuItem value="INPATIENT_BEDSIDE">🛏️ Inpatient Bedside</MenuItem>
                    <MenuItem value="EXTERNAL_CLIENT">🏢 External Client</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              {/* Time Slot with quick presets */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', display: 'block', mb: 0.8 }}>
                  Appointment Time Slot:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.8, mb: 1 }}>
                  {['08:30 AM', '09:30 AM', '10:30 AM', '11:45 AM', '01:30 PM', '02:45 PM', '04:00 PM'].map(slot => (
                    <Chip
                      key={slot}
                      label={slot}
                      size="small"
                      onClick={() => setScheduleBookingForm(p => ({ ...p, timeSlot: `${slot} (Today)` }))}
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 700,
                        bgcolor: scheduleBookingForm.timeSlot.includes(slot) ? '#0284c7' : '#f1f5f9',
                        color: scheduleBookingForm.timeSlot.includes(slot) ? '#fff' : '#334155'
                      }}
                    />
                  ))}
                </Stack>
                <TextField
                  label="Selected Slot Time *"
                  size="small"
                  fullWidth
                  value={scheduleBookingForm.timeSlot}
                  onChange={e => setScheduleBookingForm(p => ({ ...p, timeSlot: e.target.value }))}
                  required
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Location / Bed *"
                    size="small"
                    fullWidth
                    value={scheduleBookingForm.location}
                    onChange={e => setScheduleBookingForm(p => ({ ...p, location: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Assigned Physiotherapist *"
                    size="small"
                    fullWidth
                    value={scheduleBookingForm.therapist}
                    onChange={e => setScheduleBookingForm(p => ({ ...p, therapist: e.target.value }))}
                    required
                  />
                </Grid>
              </Grid>

              <TextField
                label="Treatment Plan / Exercise Modality *"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={scheduleBookingForm.treatmentPlan}
                onChange={e => setScheduleBookingForm(p => ({ ...p, treatmentPlan: e.target.value }))}
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setScheduleBookingModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: CYAN, color: '#0f172a', fontWeight: 800 }}>
              Confirm & Add to Schedule
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── MODAL 7: REGISTER NEW PHYSIOTHERAPY MODALITY / EQUIPMENT ────────── */}
      <Dialog open={registerEquipmentModalOpen} onClose={() => setRegisterEquipmentModalOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleRegisterEquipment}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: PURPLE, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <FitnessCenter /> Register New Physiotherapy Modality / Device
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <Grid container spacing={2}>
                <Grid item xs={8}>
                  <TextField
                    label="Equipment / Modality Name *"
                    size="small"
                    fullWidth
                    required
                    placeholder="e.g. Interferential Therapy Unit (IFT)"
                    value={newEquipmentForm.name}
                    onChange={e => setNewEquipmentForm(p => ({ ...p, name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    label="Asset Code *"
                    size="small"
                    fullWidth
                    required
                    placeholder="e.g. EQ-IFT-08"
                    value={newEquipmentForm.code}
                    onChange={e => setNewEquipmentForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Modality Category *"
                    size="small"
                    fullWidth
                    value={newEquipmentForm.category}
                    onChange={e => setNewEquipmentForm(p => ({ ...p, category: e.target.value }))}
                  >
                    <MenuItem value="ELECTROTHERAPY">⚡ Electrotherapy (TENS / IFT / NMES)</MenuItem>
                    <MenuItem value="THERMAL_DIATHERMY">🔥 Thermal Diathermy (SWD / Microwave)</MenuItem>
                    <MenuItem value="TRACTION_DECOMPRESSION">🦴 Spinal Traction & Decompression</MenuItem>
                    <MenuItem value="ULTRASOUND_THERAPY">🔊 Therapeutic Ultrasound</MenuItem>
                    <MenuItem value="MECHANOTHERAPY">🦾 Mechanotherapy (CPM / Kinetics)</MenuItem>
                    <MenuItem value="PHOTO_BIOMODULATION">💡 Laser & Photobiomodulation</MenuItem>
                    <MenuItem value="POSTURAL_VASCULAR">🛏️ Postural & Tilt Table</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Department Room / Bay *"
                    size="small"
                    fullWidth
                    required
                    placeholder="e.g. Physio Gym 3A"
                    value={newEquipmentForm.location}
                    onChange={e => setNewEquipmentForm(p => ({ ...p, location: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Manufacturer / Brand"
                    size="small"
                    fullWidth
                    placeholder="e.g. Chattanooga Medical"
                    value={newEquipmentForm.manufacturer}
                    onChange={e => setNewEquipmentForm(p => ({ ...p, manufacturer: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Serial Number"
                    size="small"
                    fullWidth
                    placeholder="e.g. SN-8829-IFT"
                    value={newEquipmentForm.serialNumber}
                    onChange={e => setNewEquipmentForm(p => ({ ...p, serialNumber: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Channels / Output Channels"
                    size="small"
                    fullWidth
                    placeholder="e.g. 4-Pole Quadripolar Vector"
                    value={newEquipmentForm.channels}
                    onChange={e => setNewEquipmentForm(p => ({ ...p, channels: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Power Rating / Voltage"
                    size="small"
                    fullWidth
                    placeholder="e.g. 220V 50Hz Medical"
                    value={newEquipmentForm.powerRating}
                    onChange={e => setNewEquipmentForm(p => ({ ...p, powerRating: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Clinical Operating Notes"
                size="small"
                multiline
                rows={2}
                fullWidth
                placeholder="Special indications, electrode hygiene guidelines, or contraindications..."
                value={newEquipmentForm.notes}
                onChange={e => setNewEquipmentForm(p => ({ ...p, notes: e.target.value }))}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
            <Button onClick={() => setRegisterEquipmentModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: PURPLE, fontWeight: 800 }}>
              Confirm & Register Modality
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── MODAL 8: EQUIPMENT DETAILS & CALIBRATION AUDIT ─────────────────── */}
      <Dialog open={Boolean(selectedEquipmentForDetail)} onClose={() => setSelectedEquipmentForDetail(null)} maxWidth="sm" fullWidth>
        {selectedEquipmentForDetail && (
          <>
            <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FitnessCenter sx={{ color: CYAN }} /> {selectedEquipmentForDetail.name}
              </Box>
              <Chip
                label={selectedEquipmentForDetail.status || 'CALIBRATED & ACTIVE'}
                size="small"
                sx={{
                  bgcolor: selectedEquipmentForDetail.status === 'CALIBRATED & ACTIVE' ? '#16a34a' : '#0284c7',
                  color: '#fff',
                  fontWeight: 800
                }}
              />
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Asset Code</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: PRIMARY }}>{selectedEquipmentForDetail.code}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Location / Room</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{selectedEquipmentForDetail.location || selectedEquipmentForDetail.room}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Manufacturer</Typography>
                      <Typography variant="body2">{selectedEquipmentForDetail.manufacturer || 'Standard Biomedical'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Serial Number</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedEquipmentForDetail.serialNumber || 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle sx={{ fontSize: 18 }} /> Biomedical Safety & Calibration Certificate
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Last Calibration Date:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedEquipmentForDetail.lastCalibrated || '2026-08-15'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Next Calibration Due:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>{selectedEquipmentForDetail.nextCalibrationDue || '2026-11-15'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Total Sessions Run:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{selectedEquipmentForDetail.totalSessionsRun || 100} Therapy Sessions</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Active In-Use Patient:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: selectedEquipmentForDetail.assignedPatient ? PRIMARY : 'text.secondary' }}>
                        {selectedEquipmentForDetail.assignedPatient || 'None (Standby / Available)'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {selectedEquipmentForDetail.channels && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      Technical Channels & Power Rating:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                      {selectedEquipmentForDetail.channels} · {selectedEquipmentForDetail.powerRating || '220V 50Hz'}
                    </Typography>
                    {selectedEquipmentForDetail.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {selectedEquipmentForDetail.notes}
                      </Typography>
                    )}
                  </Paper>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={() => handlePrintSafetyInspectionReport(selectedEquipmentForDetail)}
                sx={{ fontWeight: 800, textTransform: 'none' }}
              >
                Print Safety Cert (PDF)
              </Button>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={() => handleCalibrateEquipment(selectedEquipmentForDetail.id || selectedEquipmentForDetail.code)}
                  sx={{ bgcolor: '#16a34a', color: '#fff', fontWeight: 800, textTransform: 'none' }}
                >
                  🔧 Re-Certify Calibration
                </Button>
                <Button onClick={() => setSelectedEquipmentForDetail(null)}>Close</Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── MODAL 9: ASSIGN MODALITY TO PATIENT ───────────────────────────── */}
      <Dialog open={assignEquipmentModalOpen} onClose={() => setAssignEquipmentModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: PRIMARY, color: '#fff' }}>
          👤 Modality Patient Allocation
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
              Assign <strong>{equipmentAssignTarget?.name}</strong> ({equipmentAssignTarget?.code}) to an active rehabilitation patient:
            </Typography>

            <Autocomplete
              freeSolo
              options={physioAdmittedPatients}
              getOptionLabel={(option: any) => (typeof option === 'string' ? option : option.patientName || '')}
              value={equipmentAssignPatient}
              onInputChange={(_, val) => setEquipmentAssignPatient(val)}
              onChange={(_, opt: any) => {
                if (typeof opt === 'string') setEquipmentAssignPatient(opt);
                else if (opt) setEquipmentAssignPatient(opt.patientName || '');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Patient *"
                  size="small"
                  fullWidth
                  placeholder="Choose patient in gym or ward..."
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', justifyContent: 'space-between' }}>
          {equipmentAssignTarget?.assignedPatient ? (
            <Button
              color="error"
              onClick={() => {
                setEquipmentAssignPatient('');
                handleAssignEquipment();
              }}
              sx={{ fontWeight: 800 }}
            >
              🔓 Release / Clear
            </Button>
          ) : (
            <Box />
          )}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setAssignEquipmentModalOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAssignEquipment} sx={{ bgcolor: PURPLE, fontWeight: 800 }}>
              Confirm Allocation
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RehabilitationPhysio;
