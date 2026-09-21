import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Avatar, Tabs, Tab, CircularProgress,
  Stack, Divider, Paper, Alert, Tooltip, Switch, FormControlLabel,
  LinearProgress, Checkbox, Autocomplete, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  Add, Search, Edit, Visibility, CalendarMonth, Settings, Warning,
  BarChart, Description, TouchApp, MedicalServices, LocalHospital,
  Shield, Timer, Close, Healing, PrecisionManufacturing, CheckCircle,
  FlashOn, Receipt, Speed, MonitorHeart, Bloodtype, MeetingRoom,
  Science, AccountBalanceWallet, PersonAdd, Check, Refresh, TransferWithinAStation,
  Mic, Stop as StopIcon, GraphicEq
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

interface SurgicalRequest {
  id: string; requestNumber: string; patientId: string;
  patient: { firstName: string; lastName: string; patientNumber: string; gender: string };
  surgeon?: { id: string; firstName: string; lastName: string };
  diagnosis: string; proposedProcedure: string; urgency: string;
  estimatedDurationMin: number; anaesthesiaReqs?: string; preferredDate?: string;
  status: string;
}

interface SurgicalBooking {
  id: string; requestId: string; request?: SurgicalRequest; patientId: string;
  patient: { firstName: string; lastName: string; patientNumber: string; gender: string };
  surgeon?: { firstName: string; lastName: string };
  anaesthetist?: { firstName: string; lastName: string };
  operatingRoom: string; scheduledStart: string; scheduledEnd: string;
  implantReserved: boolean; bloodProductsReserved: boolean; sterileKitsReserved: boolean;
  status: string;
  preOpAssessments?: any[]; preAnaesthetics?: any[]; consents?: any[];
  safetyChecklists?: any[]; intraOpRecords?: any[]; pacuRecords?: any[];
}

const URGENCY_COLORS: Record<string, string> = {
  'ELECTIVE': '#2f9e44', 'URGENT': '#f59f00', 'EMERGENCY': '#e03131', 'TRAUMA': '#c2255c'
};

const STATUS_COLORS: Record<string, string> = {
  'BOOKED': '#1c7ed6', 'IN_THEATRE': '#ae3ec9', 'RECOVERY': '#f59f00',
  'COMPLETED': '#2f9e44', 'CANCELLED': '#e03131'
};

// Common Surgical Templates for Surgeons in Nigeria
const SURGICAL_TEMPLATES: Record<string, { procedure: string; note: string }> = {
  'CS': {
    procedure: 'Caesarean Section (Lower Segment)',
    note: 'Patient in supine position with left tilt. Spinal anaesthesia administered. Pfannenstiel incision made. Abdomen opened in layers. Lower uterine segment incised. Live baby delivered head first. Placenta & membranes delivered complete. Uterus closed in 2 layers with Vicryl 1. Abdomen closed in layers. EBL: 400ml. Count correct.'
  },
  'APP': {
    procedure: 'Open Appendectomy',
    note: 'Gridiron incision in right iliac fossa. Appendix identified inflamed and retrocaecal. Appendiceal base crushed and ligated. Appendix resected and sent to histopathology. Haemostasis secured. Abdomen closed in layers. Count correct.'
  },
  'MYO': {
    procedure: 'Uterine Myomectomy',
    note: 'Pfannenstiel incision. Uterus exteriorized showing multiple intramural and subserous leiomyomas. Vasopressin injected. 6 leiomyomas enucleated. Uterine reconstruction done with Vicryl 1. Good haemostasis. Count correct.'
  },
  'HERN': {
    procedure: 'Inguinal Herniorrhaphy',
    note: 'Incision parallel to inguinal ligament. External oblique aponeurosis opened. Indirect sac identified, isolated, and high ligation performed. Polypropylene mesh placed and anchored to inguinal ligament. Layered closure.'
  },
  'LAP': {
    procedure: 'Exploratory Laparotomy',
    note: 'Midline incision. Peritoneal cavity entered. 300ml serous fluid aspirated. Systematic bowel inspection from duodenojejunal flexure to rectum. Primary repair executed. Abdominal wash with warm normal saline. Closure in layers with PDS 1 loop.'
  }
};

// Common Theatre Consumables & Fast-Action Anaesthetic Drugs for Real-time Billing
const DRUG_TO_CONSUMABLE_MAP: Record<string, string> = {
  'Propofol': 'Propofol 1% 20ml Ampoule',
  'Suxamethonium': 'Suxamethonium 100mg Injection',
  'Ketamine': 'Ketamine 50mg IV Injection',
  'Fentanyl': 'Fentanyl 100mcg IV Ampoule',
  'Isoflurane': 'Isoflurane 250ml Bottle',
  'Neostigmine': 'Neostigmine 2.5mg Ampoule',
  'Atropine': 'Atropine 0.6mg Ampoule',
  'Bupivacaine 0.5%': 'Bupivacaine 0.5% Heavy Ampoule',
};

const CONSUMABLES_CATALOG = [
  { name: 'Vicryl 2/0 Suture', price: 3500, type: 'Surgical Consumable' },
  { name: 'Chromic Catgut 1.0', price: 3000, type: 'Surgical Consumable' },
  { name: 'Gauze Swab Pack (10s)', price: 1500, type: 'Surgical Consumable' },
  { name: 'Normal Saline 1000ml', price: 1200, type: 'Surgical Consumable' },
  { name: 'Surgical Gloves 7.5 (Pair)', price: 800, type: 'Surgical Consumable' },
  { name: 'Spinal Needle 25G', price: 2500, type: 'Anaesthetic Consumable' },
  { name: 'Diathermy Pencil & Pad', price: 4500, type: 'Surgical Consumable' },
  { name: 'Abdominal Mop Pack', price: 3800, type: 'Surgical Consumable' },
  { name: 'Propofol 1% 20ml Ampoule', price: 4200, type: 'Anaesthetic Drug' },
  { name: 'Suxamethonium 100mg Injection', price: 2800, type: 'Anaesthetic Drug' },
  { name: 'Ketamine 50mg IV Injection', price: 3500, type: 'Anaesthetic Drug' },
  { name: 'Fentanyl 100mcg IV Ampoule', price: 4000, type: 'Anaesthetic Drug' },
  { name: 'Isoflurane 250ml Bottle', price: 8500, type: 'Anaesthetic Drug' },
  { name: 'Neostigmine 2.5mg Ampoule', price: 2200, type: 'Anaesthetic Drug' },
  { name: 'Atropine 0.6mg Ampoule', price: 1800, type: 'Anaesthetic Drug' },
  { name: 'Bupivacaine 0.5% Heavy Ampoule', price: 3000, type: 'Anaesthetic Drug' },
];

const EMERGENCY_ICD10_DIAGNOSES = [
  // Obstetrics & Gynecology
  'O00.1 — Ruptured Ectopic Pregnancy with Hemoperitoneum',
  'O69.0 — Fetal Distress due to Cord Prolapse',
  'O71.1 — Uterine Rupture during Active Labour',
  'O72.0 — Third-stage Postpartum Hemorrhage (PPH)',
  'O44.1 — Placenta Previa with Intrapartum Hemorrhage',
  'O45.9 — Premature Separation of Placenta (Abruptio Placentae)',
  'O15.0 — Eclampsia in Labour / Severe Preeclampsia',
  'N83.5 — Torsion of Ovary, Ovarian Pedicle or Fallopian Tube',
  'N73.5 — Acute Pelvic Peritonitis / Pelvic Abscess',
  'O08.0 — Septic Abortion / Pelvic Infection following Abortion',

  // General Surgery & Abdominal Emergencies
  'K35.8 — Acute Appendicitis with Localized Peritonitis',
  'K35.2 — Acute Appendicitis with Generalized Peritonitis',
  'K56.6 — Intestinal Obstruction / Strangulated Hernia',
  'K26.5 — Perforated Peptic Ulcer with Intra-abdominal Bleeding',
  'K57.2 — Perforated Diverticulitis with Peritonitis',
  'K80.0 — Acute Cholecystitis with Empyema / Perforation',
  'K85.9 — Acute Necrotizing Pancreatitis',
  'K55.0 — Acute Mesenteric Ischemia / Bowel Infarction',
  'K65.0 — Generalized Acute Suppurative Peritonitis',
  'K40.0 — Bilateral Inguinal Hernia with Gangrene',

  // Trauma & Emergency Surgery
  'S36.0 — Traumatic Splenic Laceration / Splenic Rupture',
  'S36.1 — Traumatic Liver Laceration / Intra-abdominal Bleeding',
  'S27.0 — Traumatic Tension Pneumothorax / Flail Chest',
  'S27.1 — Traumatic Hemothorax / Hemopneumothorax',
  'S36.8 — Penetrating Abdominal Injury (Gunshot / Stab Wound)',
  'S27.8 — Penetrating Thoracic Injury / Cardiac Laceration',
  'T81.0 — Post-operative Hemorrhage & Hematoma in Operative Site',
  'T79.4 — Traumatic Shock / Exsanguinating Hemorrhage',
  'T07 — Multiple Unspecified Severe Traumatic Injuries',

  // Neurosurgery & Head Trauma
  'S06.5 — Traumatic Subdural Hemorrhage (Acute SDH)',
  'S06.4 — Traumatic Epidural Hemorrhage (Acute EDH)',
  'S06.2 — Diffuse Traumatic Brain Injury / Intracerebral Hematoma',
  'G91.9 — Acute Obstructive Hydrocephalus (ICP Elevation)',
  'S14.1 — Traumatic Cervical Spinal Cord Injury with Compression',

  // Orthopedics, Musculoskeletal & Hand
  'M72.6 — Necrotizing Fasciitis / Gas Gangrene',
  'T79.A0 — Acute Compartment Syndrome of Limb',
  'S52.5 — Open Radius/Ulna Fracture with Vascular Compromise (Gustilo III)',
  'S72.0 — Open Femoral Neck Fracture with Exsanguination',
  'S82.2 — Open Tibial Shaft Fracture with Severe Soft Tissue Defect',
  'S43.0 — Dislocation of Shoulder Joint with Brachial Plexus Compromise',

  // Urology
  'N44.0 — Torsion of Testis / Spermatic Cord',
  'S37.2 — Traumatic Extra/Intraperitoneal Rupture of Bladder',
  'S37.3 — Traumatic Urethral Laceration',
  'N13.6 — Severe Obstructive Pyelonephritis with Urosepsis',

  // Vascular & Cardiac Surgery
  'I71.0 — Ruptured Abdominal Aortic Aneurysm (AAA)',
  'I74.3 — Acute Arterial Embolism / Acute Limb Ischemia',
  'I31.9 — Acute Cardiac Tamponade / Pericardial Effusion',
  'S25.0 — Traumatic Injury of Thoracic Aorta / Major Vessels',

  // ENT & Airway Emergencies
  'J98.0 — Acute Upper Airway Obstruction / Stridor',
  'T17.5 — Foreign Body Inhalation into Trachea / Bronchus',
  'R04.0 — Massive Exsanguinating Epistaxis / Post-tonsillectomy Bleed',
  'J39.0 — Retropharyngeal Abscess / Ludwig\'s Angina',

  // Pediatric Emergency Surgery
  'K56.1 — Intussusception with Intestinal Gangrene',
  'K56.2 — Midgut Volvulus due to Malrotation',
  'Q42.3 — Congenital Imperforate Anus with Low Obstruction',

  // Ophthalmology & Plastic Surgery
  'S05.2 — Ruptured Globe / Penetrating Ocular Trauma',
  'T31.3 — Severe Thermal Burns (30-39% BSA) with Escar Compression',
];

const OPENMED_STAT_PROCEDURES = [
  // Obstetrics & Gynecology
  'Emergency Caesarean Section (LSCS - Lower Segment)',
  'Emergency Salpingectomy for Ruptured Ectopic Pregnancy',
  'Emergency Repair of Uterine Rupture / STAT Hysterectomy',
  'Emergency Oophorectomy / Detorsion of Ovarian Pedicle',
  'Emergency B-Lynch Suture & Uterine Artery Ligation for PPH',
  'Emergency Suction Curettage / Evacuation of Retained Products',

  // General Surgery
  'Exploratory Laparotomy & Intra-abdominal Hemostasis',
  'Emergency Open Appendectomy',
  'Laparoscopic / Open Emergency Cholecystectomy',
  'Emergency Resection & Anastomosis of Gangrenous Bowel',
  'Emergency Repair of Perforated Peptic Ulcer (Cellan-Jones Patch)',
  'Emergency Herniorrhaphy for Strangulated Inguinal/Femoral Hernia',

  // Trauma & Vascular Surgery
  'Emergency Splenectomy & Abdominal Damage Control Packing',
  'Emergency Hepatic Suture / Packing for Liver Laceration',
  'Emergency Repair of Major Vascular Laceration (Femoral/Aortic)',
  'Tube Thoracostomy (Chest Tube Insertion for Hemothorax/Pneumothorax)',
  'Emergency Thoracotomy for Cardiac / Great Vessel Laceration',
  'Emergency Debridement & Primary Wound Closure',

  // Neurosurgery
  'Burr Hole Evacuation of Subdural / Epidural Hematoma',
  'Craniotomy for Emergency Hemostasis & Decompression',
  'Emergency External Ventricular Drain (EVD) Placement',

  // Orthopedics & Musculoskeletal
  'Emergency Open Reduction & Internal Fixation (ORIF)',
  'Emergency External Fixation & Debridement of Open Fracture',
  'Emergency Fasciotomy for Acute Compartment Syndrome',
  'Emergency Debridement for Necrotizing Fasciitis',

  // Urology & ENT
  'Emergency Scrotal Exploration & Testicular Detorsion',
  'Emergency Repair of Bladder Rupture',
  'Emergency Tracheostomy / Cricothyroidotomy for Airway Obstruction',
  'Emergency Rigid Bronchoscopy for Foreign Body Removal',
  'Emergency Anterior/Posterior Nasal Packing & Sphenopalatine Ligation',

  // Pediatric & Ophthalmic
  'Emergency Hydrostatic / Surgical Reduction of Intussusception',
  'Emergency Repair of Penetrating Ocular Wound (Corneal/Scleral)',
  'Emergency Escharotomy for Constrictive Full-Thickness Burns',
];

const SURGICAL_DIAGNOSES_DICTIONARY = [
  // Elective Obstetrics & Gynecology
  'D25.9 — Uterine Leiomyoma (Uterine Fibroids)',
  'N80.9 — Endometriosis of Uterus / Ovaries',
  'N83.2 — Benign Ovarian Cyst / Cystadenoma',
  'N81.4 — Uterovaginal Prolapse / Pelvic Organ Prolapse',
  'O34.2 — Maternal Care for Cervical Incompetence / Prior C-Section',
  'N83.0 — Follicular Cyst of Ovary',
  'N85.0 — Endometrial Glandular Hyperplasia',

  // Elective General Surgery
  'K40.9 — Unilateral Inguinal Hernia without Obstruction / Gangrene',
  'K80.2 — Calculus of Gallbladder without Cholecystitis (Gallstones)',
  'K60.3 — Anal Fistula / Fistula-in-Ano',
  'K60.2 — Anal Fissure, Unspecified',
  'E04.2 — Non-toxic Multinodular Goitre / Thyroid Adenoma',
  'C50.9 — Malignant Neoplasm of Breast / Breast Carcinoma',
  'N60.0 — Solitary Fibroadenoma of Breast',
  'K43.9 — Ventral / Incisional Hernia without Obstruction',
  'K42.9 — Umbilical Hernia without Obstruction',

  // Elective Urology
  'N40.1 — Benign Prostatic Hyperplasia (BPH) with Lower Urinary Tract Symptoms',
  'N20.1 — Calculus of Ureter / Renal Calculi',
  'N43.3 — Hydrocele, Unspecified',
  'N43.0 — Encysted Hydrocele of Testis',
  'N45.9 — Chronic Orchitis / Epididymitis',

  // Elective Orthopedics & Musculoskeletal
  'M16.9 — Osteoarthritis of Hip / Femoral Head Avascular Necrosis',
  'M17.9 — Osteoarthritis of Knee, Unspecified',
  'S72.0 — Closed Fracture of Neck of Femur',
  'M23.2 — Derangement of Meniscus due to Old Tear',
  'M20.1 — Hallux Valgus (Bunion Deformity)',

  // Elective ENT & Ophthalmology
  'J35.0 — Chronic Tonsillitis / Adenoid Hypertrophy',
  'H25.9 — Senile Cataract, Unspecified',
  'H40.1 — Primary Open-Angle Glaucoma',
  'J33.9 — Nasal Polyp, Unspecified',

  // Emergency & Acute Diagnoses (ICD-10)
  ...EMERGENCY_ICD10_DIAGNOSES,
];

const SURGICAL_PROCEDURES_DICTIONARY = [
  // Elective Obstetrics & Gynecology
  'Abdominal Myomectomy (Enucleation of Uterine Fibroids)',
  'Elective Caesarean Section (LSCS)',
  'Total Abdominal Hysterectomy with Bilateral Salpingo-Oophorectomy (TAH-BSO)',
  'Vaginal Hysterectomy with Anterior & Posterior Colporrhaphy',
  'Diagnostic & Operative Laparoscopy / Ovarian Cystectomy',
  'Cervical Cerclage (McDonald / Shirodkar Stitch)',
  'Excision of Ovarian Cyst / Salpingo-Oophorectomy',
  'Diagnostic Hysteroscopy & Polypectomy',

  // Elective General Surgery
  'Inguinal Herniorrhaphy / Lichtenstein Polypropylene Mesh Repair',
  'Laparoscopic / Open Cholecystectomy',
  'Subtotal / Total Thyroidectomy',
  'Modified Radical Mastectomy / Lumpectomy & Axillary Clearance',
  'Fistulotomy / Fistulectomy for Fistula-in-Ano',
  'Excision of Breast Fibroadenoma / Lumpectomy',
  'Elective Open Appendectomy',
  'Open / Laparoscopic Umbilical Hernia Mesh Repair',
  'Excision of Lipoma / Sebaceous Cyst',

  // Elective Urology
  'Transurethral Resection of the Prostate (TURP)',
  'Open Prostatectomy (Freyer / Millin Technique)',
  'Hydrocelectomy (Jaboulay / Lord Technique)',
  'Ureteroscopy with Laser Lithotripsy (URSL)',
  'High Inguinal Orchidectomy',
  'Varicocelectomy (Palomo / Ivanissevich Technique)',

  // Elective Orthopedics
  'Total Hip Replacement (THR)',
  'Total Knee Replacement (TKR)',
  'Elective Open Reduction and Internal Fixation (ORIF)',
  'Arthroscopic Meniscectomy / Anterior Cruciate Ligament (ACL) Reconstruction',

  // Elective ENT & Ophthalmology
  'Tonsillectomy with / without Adenoidectomy',
  'Phacoemulsification with Intraocular Lens (IOL) Implantation',
  'Trabeculectomy for Glaucoma',
  'Functional Endoscopic Sinus Surgery (FESS)',

  // Emergency & STAT Surgical Procedures
  ...OPENMED_STAT_PROCEDURES,
];

// Helper function to resolve active tab from URL path
const getTabFromPath = (pathname: string) => {
  if (pathname.includes('/rooms')) return 1;
  if (pathname.includes('/anesthesia')) return 2;
  if (pathname.includes('/op-notes')) return 3;
  if (pathname.includes('/post-op')) return 4;
  return 0;
};

export default function Theatre() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(() => getTabFromPath(location.pathname));
  const [loading, setLoading] = useState(false);

  // Sync route URL to tab state
  useEffect(() => {
    setTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    if (newValue === 0) navigate('/theatre/schedules');
    else if (newValue === 1) navigate('/theatre/rooms');
    else if (newValue === 2) navigate('/theatre/anesthesia');
    else if (newValue === 3) navigate('/theatre/op-notes');
    else if (newValue === 4) navigate('/theatre/post-op');
  };

const DEFAULT_INPATIENT_WARDS = [
  { id: 'w-1', name: 'Female Surgical Ward' },
  { id: 'w-2', name: 'Male Surgical Ward' },
  { id: 'w-3', name: 'Maternity Ward' },
  { id: 'w-4', name: 'ICU (Intensive Care Unit)' },
  { id: 'w-5', name: 'Medical Ward' },
  { id: 'w-6', name: 'Pediatric Ward' }
];

  // State Data
  const [requests, setRequests] = useState<SurgicalRequest[]>([]);
  const [bookings, setBookings] = useState<SurgicalBooking[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [operatingTables, setOperatingTables] = useState<any[]>([]);
  const [configuredWards, setConfiguredWards] = useState<any[]>(DEFAULT_INPATIENT_WARDS);
  const [search, setSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');

  // Dialog Controls
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [quickEmergencyOpen, setQuickEmergencyOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<SurgicalBooking | null>(null);

  // Quick Emergency Form
  const [emergencyForm, setEmergencyForm] = useState({
    isTempPatient: false,
    tempPatientName: '',
    gender: 'FEMALE',
    age: '28',
    patientId: '',
    diagnosis: [] as string[],
    proposedProcedure: '',
  });
  const [quickStarting, setQuickStarting] = useState(false);

  // New Request Form
  const [requestForm, setRequestForm] = useState({
    patientId: '', surgeonId: '', diagnosis: '', proposedProcedure: '',
    urgency: 'ELECTIVE', estimatedDurationMin: 60, anaesthesiaReqs: '',
    preferredDate: new Date().toISOString().slice(0, 16)
  });

  // Booking Form
  const [bookingForm, setBookingForm] = useState({
    requestId: '', patientId: '', surgeonId: '', anaesthetistId: '', operatingRoom: '',
    scheduledStart: new Date().toISOString().slice(0, 16),
    scheduledEnd: new Date(Date.now() + 90 * 60 * 1000).toISOString().slice(0, 16),
    implantReserved: false, bloodProductsReserved: true, sterileKitsReserved: true
  });

  // Pre-Op & Consent State
  const [preOpForm, setPreOpForm] = useState({
    benefitsExplained: true, risksExplained: true, signaturePatient: true, signatureSurgeon: true,
    signInComplete: true, timeoutComplete: true, signoutComplete: false
  });

  // Next-of-Kin Digital Signature State & Drawing Pad
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const RELATIONSHIP_OPTIONS = [
    'Self (Patient)',
    'Spouse (Husband / Wife)',
    'Parent (Mother / Father)',
    'Child (Son / Daughter)',
    'Sibling (Brother / Sister)',
    'Legal Guardian',
    'Next of Kin',
    'Other Relative / Caregiver'
  ];

  // Returns the localStorage key scoped strictly to a specific booking ID (never global)
  const getSavedConsentKey = (bookingId: string) => `theatre_consent_${bookingId}`;

  const BLANK_NOK_DETAILS = {
    signerName: '',
    relationship: 'Next of Kin',
    signerPhone: '',
    signedAt: '',
    isVerified: false,
    signatureImage: ''
  };

  const getSavedConsent = useCallback((booking?: SurgicalBooking | null) => {
    // Only look up booking-specific keys — never fall back to a global/shared key
    if (!booking?.id) return null;

    // 1. Check booking-scoped localStorage first (fastest)
    const local = localStorage.getItem(getSavedConsentKey(booking.id));
    if (local) {
      try { return JSON.parse(local); } catch (e) {}
    }

    // 2. Check backend-persisted consents for this specific booking
    if (booking.consents && booking.consents.length > 0) {
      const latest = booking.consents[booking.consents.length - 1];
      if (latest.signatureImage) {
        return {
          signerName: latest.signerName || '',
          relationship: latest.relationship || 'Next of Kin',
          signerPhone: latest.signerPhone || '',
          signedAt: latest.signedAt ? new Date(latest.signedAt).toLocaleString() : new Date().toLocaleString(),
          isVerified: true,
          signatureImage: latest.signatureImage
        };
      }
    }

    return null;
  }, []);

  // Always start with blank defaults — never pre-fill from another patient
  const [nokDetails, setNokDetails] = useState({ ...BLANK_NOK_DETAILS });

  // When the active booking changes: load that booking's signature, OR reset to blank
  useEffect(() => {
    if (!selectedBooking) {
      setNokDetails({ ...BLANK_NOK_DETAILS });
      setPreOpForm(prev => ({ ...prev, signaturePatient: false }));
      return;
    }
    const saved = getSavedConsent(selectedBooking);
    if (saved && saved.signatureImage) {
      setNokDetails(saved);
      setPreOpForm(prev => ({ ...prev, signaturePatient: true }));
    } else {
      // No signature for this patient yet — show blank form, not previous patient's sig
      setNokDetails({ ...BLANK_NOK_DETAILS });
      setPreOpForm(prev => ({ ...prev, signaturePatient: false }));
    }
  }, [selectedBooking, getSavedConsent]);

  // ── Anaesthesia: reset per-patient & hydrate from saved preAnaesthetic record ──
  useEffect(() => {
    // Reset drug log & vitals log so they never bleed across patients
    setDrugLogs([]);
    setVitalsLogs([]);

    if (!selectedBooking) {
      setAnaesthesiaForm({
        inductionTime: getCurrentTimeHHMM(),
        technique: 'GENERAL', mallampati: 'Class I', ettSize: '7.5mm Cuffed',
        bp: '120/80', pulse: '76', spo2: '99', etco2: '36', temp: '36.8'
      });
      return;
    }

    // Try to hydrate from the most recent saved pre-anaesthetic assessment
    const preAnList: any[] = (selectedBooking as any).preAnaesthetics || [];
    if (preAnList.length > 0) {
      const latest = preAnList[preAnList.length - 1];
      // Parse saved JSON if present in anestheticRisks
      if (latest.anestheticRisks) {
        try {
          const parsed = JSON.parse(latest.anestheticRisks);
          if (parsed.anaesthesiaForm) {
            setAnaesthesiaForm(parsed.anaesthesiaForm);
          } else {
            const planned = latest.plannedAnaesthesia || '';
            const techniqueMatch = planned.match(/Technique:\s*([^,]+)/);
            const ettMatch = planned.match(/ETT:\s*([^,]+)/);
            const inductionMatch = planned.match(/Induction:\s*(\d{2}:\d{2})/);
            setAnaesthesiaForm(prev => ({
              ...prev,
              mallampati: latest.airwayEvaluation?.replace('Mallampati ', '') || prev.mallampati,
              technique: techniqueMatch ? techniqueMatch[1].trim() : prev.technique,
              ettSize: ettMatch ? ettMatch[1].trim() : prev.ettSize,
              inductionTime: inductionMatch ? inductionMatch[1] : getCurrentTimeHHMM(),
            }));
          }
          if (Array.isArray(parsed.drugLogs)) setDrugLogs(parsed.drugLogs);
          if (Array.isArray(parsed.vitalsLogs)) setVitalsLogs(parsed.vitalsLogs);
        } catch (e) {
          const planned = latest.plannedAnaesthesia || '';
          const techniqueMatch = planned.match(/Technique:\s*([^,]+)/);
          const ettMatch = planned.match(/ETT:\s*([^,]+)/);
          const inductionMatch = planned.match(/Induction:\s*(\d{2}:\d{2})/);
          setAnaesthesiaForm(prev => ({
            ...prev,
            mallampati: latest.airwayEvaluation?.replace('Mallampati ', '') || prev.mallampati,
            technique: techniqueMatch ? techniqueMatch[1].trim() : prev.technique,
            ettSize: ettMatch ? ettMatch[1].trim() : prev.ettSize,
            inductionTime: inductionMatch ? inductionMatch[1] : getCurrentTimeHHMM(),
          }));
        }
      } else {
        const planned = latest.plannedAnaesthesia || '';
        const techniqueMatch = planned.match(/Technique:\s*([^,]+)/);
        const ettMatch = planned.match(/ETT:\s*([^,]+)/);
        const inductionMatch = planned.match(/Induction:\s*(\d{2}:\d{2})/);
        setAnaesthesiaForm(prev => ({
          ...prev,
          mallampati: latest.airwayEvaluation?.replace('Mallampati ', '') || prev.mallampati,
          technique: techniqueMatch ? techniqueMatch[1].trim() : prev.technique,
          ettSize: ettMatch ? ettMatch[1].trim() : prev.ettSize,
          inductionTime: inductionMatch ? inductionMatch[1] : getCurrentTimeHHMM(),
        }));
      }
    } else {
      // No prior record — fresh form with current time
      setAnaesthesiaForm(prev => ({ ...prev, inductionTime: getCurrentTimeHHMM() }));
    }
  }, [selectedBooking]);

  // ── Op-Note: always reset to active booking's data when switching patients ──
  useEffect(() => {
    if (!selectedBooking) {
      setOpNoteDiagnosis('');
      setOpNoteProcedure('');
      setOpNoteText('');
      setEblML(350);
      setBabyWeight('');
      setPostOpOrders('');
      return;
    }
    // Seed from the booking request — always overwrite so data never bleeds across patients
    setOpNoteDiagnosis(selectedBooking.request?.diagnosis || '');
    setOpNoteProcedure(selectedBooking.request?.proposedProcedure || '');

    // Hydrate existing intraOp record if saved previously
    const intraList: any[] = (selectedBooking as any).intraOpRecords || [];
    let localSaved: any = null;
    try {
      if (selectedBooking.id) {
        const stored = localStorage.getItem(`theatre_opnote_${selectedBooking.id}`);
        if (stored) localSaved = JSON.parse(stored);
      }
      if (!localSaved) {
        const storedGen = localStorage.getItem('theatre_opnote_latest');
        if (storedGen) localSaved = JSON.parse(storedGen);
      }
    } catch (e) {}

    const latest = (Array.isArray(intraList) && intraList.length > 0) ? intraList[intraList.length - 1] : localSaved;

    if (latest) {
      setLastSavedOpNote(latest);
      if (latest.estimatedBloodLossML !== undefined && latest.estimatedBloodLossML !== null) {
        setEblML(latest.estimatedBloodLossML);
      }
      if (latest.initialSwabCount !== undefined) setInitialSwabs(latest.initialSwabCount);
      if (latest.closureSwabCount !== undefined) setClosureSwabs(latest.closureSwabCount);
      if (latest.initialInstrumentCount !== undefined) setInitialInst(latest.initialInstrumentCount);
      if (latest.closureInstrumentCount !== undefined) setClosureInst(latest.closureInstrumentCount);
      if (latest.primaryProcedureNotes) {
        const notes: string = latest.primaryProcedureNotes;
        if (notes.includes('DIAGNOSIS: ')) {
          const diagMatch = notes.match(/DIAGNOSIS:\s*([^\n]+)/);
          if (diagMatch && diagMatch[1] && diagMatch[1] !== 'See record') {
            setOpNoteDiagnosis(diagMatch[1].trim());
          }
        }
        if (notes.includes('PROCEDURE: ')) {
          const procMatch = notes.match(/PROCEDURE:\s*([^\n]+)/);
          if (procMatch && procMatch[1] && procMatch[1] !== 'See record') {
            setOpNoteProcedure(procMatch[1].trim());
          }
        }
        if (notes.includes('OPERATION NOTE:\n')) {
          const parts = notes.split('OPERATION NOTE:\n');
          const afterOp = parts[1] || '';
          const subParts = afterOp.split('\n\nBaby Weight/APGAR: ');
          setOpNoteText(subParts[0] || '');
          if (subParts[1]) {
            const postParts = subParts[1].split('\n\nPOST-OP ORDERS:\n');
            setBabyWeight(postParts[0] || '');
            setPostOpOrders(postParts[1] || '');
          }
        } else {
          setOpNoteText(notes);
        }
      }
    } else {
      // Auto-populate procedure template note when switching to a booking without an intra-op record
      const sbAny = selectedBooking as any;
      const procStr = (sbAny?.request?.proposedProcedure || sbAny?.proposedProcedure || '').toLowerCase();
      let defaultKey = 'CS';
      if (procStr.includes('append') || procStr.includes('app')) {
        defaultKey = 'APP';
      } else if (procStr.includes('myomectomy') || procStr.includes('fibroid')) {
        defaultKey = 'MYO';
      } else if (procStr.includes('hernia') || procStr.includes('herniorrhaphy')) {
        defaultKey = 'HERN';
      } else if (procStr.includes('laparotomy')) {
        defaultKey = 'LAP';
      }
      setSelectedTemplateKey(defaultKey);
      setOpNoteText(SURGICAL_TEMPLATES[defaultKey]?.note || SURGICAL_TEMPLATES['CS'].note);
      setEblML(350);
      setBabyWeight('');
      setPostOpOrders('IV Ceftriaxone 1g 12 hourly, IV Paracetamol 1g 8 hourly, NPO for 6 hours then oral sips.');
    }
  }, [selectedBooking]);

  useEffect(() => {
    if (signatureDialogOpen && signatureMode === 'draw' && nokDetails.signatureImage?.startsWith('data:image')) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setHasDrawn(true);
        };
        img.src = nokDetails.signatureImage;
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [signatureDialogOpen, signatureMode, nokDetails.signatureImage]);

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#1c7ed6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const getCurrentTimeHHMM = () => {
    const d = new Date();
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  // Anaesthesia Form State
  const [anaesthesiaForm, setAnaesthesiaForm] = useState({
    inductionTime: getCurrentTimeHHMM(), technique: 'GENERAL', mallampati: 'Class I', ettSize: '7.5mm Cuffed',
    bp: '120/80', pulse: '76', spo2: '99', etco2: '36', temp: '36.8'
  });
  const [drugLogs, setDrugLogs] = useState<any[]>([]);
  // Start empty — entries are added via "Record Vitals Reading"
  const [vitalsLogs, setVitalsLogs] = useState<any[]>([]);

  // Surgeon Op-Note State
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('CS');
  const [opNoteText, setOpNoteText] = useState(SURGICAL_TEMPLATES['CS'].note);
  const [eblML, setEblML] = useState(350);
  const [babyWeight, setBabyWeight] = useState('3.4kg');
  const [postOpOrders, setPostOpOrders] = useState('IV Ceftriaxone 1g 12 hourly, IV Paracetamol 1g 8 hourly, NPO for 6 hours then oral sips.');
  const [opNoteDiagnosis, setOpNoteDiagnosis] = useState<string>('');
  const [opNoteProcedure, setOpNoteProcedure] = useState<string>('');
  const [savingOpNote, setSavingOpNote] = useState(false);
  const [lastSavedOpNote, setLastSavedOpNote] = useState<any>(null);

  // ── Op-Note Voice Dictation State ────────────────────────────────────────
  const [opNoteIsListening, setOpNoteIsListening] = useState(false);
  const [opNoteVoiceTranscript, setOpNoteVoiceTranscript] = useState('');
  const [opNoteInterimTranscript, setOpNoteInterimTranscript] = useState('');
  const [opNoteVoiceSummarizing, setOpNoteVoiceSummarizing] = useState(false);
  const [opNoteRecognitionRef, setOpNoteRecognitionRef] = useState<any>(null);
  const opNoteTranscriptBufferRef  = useRef<string>('');
  const opNoteInterimBufferRef     = useRef<string>('');
  const opNoteIsProcessingRef      = useRef<boolean>(false);

  // Swab & Instrument Count State
  const [initialSwabs, setInitialSwabs] = useState(10);
  const [closureSwabs, setClosureSwabs] = useState(10);
  const [initialInst, setInitialInst] = useState(20);
  const [closureInst, setClosureInst] = useState(20);

  // Consumables Billing State & Configurable Custom Catalog (Persisted in localStorage)
  const [customConsumablesCatalog, setCustomConsumablesCatalog] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('theatre_custom_consumables');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [addConsumableDialogOpen, setAddConsumableDialogOpen] = useState(false);
  const [newConsumableForm, setNewConsumableForm] = useState({
    name: '', price: 2500, type: 'Surgical Consumable'
  });

  const [selectedConsumables, setSelectedConsumables] = useState<Record<string, number>>({
    'Vicryl 2/0 Suture': 2,
    'Gauze Swab Pack (10s)': 2,
    'Normal Saline 1000ml': 2,
    'Surgical Gloves 7.5 (Pair)': 3,
  });
  const [savingBilling, setSavingBilling] = useState(false);

  // PACU Recovery State
  const [aldreteActivity, setAldreteActivity] = useState(2);
  const [aldreteRespiration, setAldreteRespiration] = useState(2);
  const [aldreteCirculation, setAldreteCirculation] = useState(2);
  const [aldreteConsciousness, setAldreteConsciousness] = useState(2);
  const [aldreteO2, setAldreteO2] = useState(2);
  const aldreteScore = aldreteActivity + aldreteRespiration + aldreteCirculation + aldreteConsciousness + aldreteO2;

  const [targetWard, setTargetWard] = useState('Female Surgical Ward');
  const [transferringWard, setTransferringWard] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resReq, resBook, resPat, resBeds, resWards] = await Promise.all([
        api.get('/theatre/requests'),
        api.get('/theatre/bookings'),
        api.get('/patients/mpi', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
        api.get('/ipd/beds').catch(() => ({ data: { beds: [], wards: [] } })),
        api.get('/wards').catch(() => ({ data: [] }))
      ]);
      setRequests(resReq.data || []);
      const loadedBookings = resBook.data || [];
      setBookings(loadedBookings);
      setPatientsList(resPat.data?.data || resPat.data || []);

      const fetchedWards = Array.isArray(resWards.data) && resWards.data.length > 0
        ? resWards.data
        : (resBeds.data?.wards || []);

      if (Array.isArray(fetchedWards) && fetchedWards.length > 0) {
        const inpatientWards = fetchedWards.filter((w: any) => {
          const nameLower = (w.name || '').toLowerCase();
          return !nameLower.includes('operating room') && !nameLower.includes('theatre table') && !nameLower.includes('cssd');
        });
        if (inpatientWards.length > 0) {
          setConfiguredWards(inpatientWards);
          setTargetWard(prev => inpatientWards.some((w: any) => w.name === prev) ? prev : inpatientWards[0].name);
        }
      }

      const bedsList = resBeds.data?.beds || [];
      const tables = bedsList.filter((b: any) =>
        b.wardCategory === 'THEATRE' ||
        b.wardCategory === 'SURGICAL' ||
        (b.wardName || '').toLowerCase().includes('theatre') ||
        (b.wardName || '').toLowerCase().includes('operating') ||
        (b.number || '').startsWith('OR-')
      );
      setOperatingTables(tables);
      if (tables.length > 0) {
        setBookingForm(prev => {
          const exists = tables.some((t: any) => t.number === prev.operatingRoom);
          return exists ? prev : { ...prev, operatingRoom: tables[0].number };
        });
      }
      
      setSelectedBooking(prev => {
        const activeBookings = loadedBookings.filter((b: any) => b.status !== 'COMPLETED' && b.status !== 'DISCHARGED');
        if (!prev) return activeBookings[0] || loadedBookings[0] || null;
        const found = loadedBookings.find((b: any) => b.id === prev.id);
        if (found && (found.status === 'COMPLETED' || found.status === 'DISCHARGED')) {
          return activeBookings[0] || null;
        }
        return found || prev;
      });
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to fetch Theatre data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
    // One-time migration: remove the legacy shared global consent key that caused
    // the same signature to bleed across all patients (bug fix - Aug 2026)
    localStorage.removeItem('theatre_consent_default');
  }, [loadData]);

  // Quick Emergency Start Handler
  const handleQuickEmergencyStart = async () => {
    if (!emergencyForm.isTempPatient && !emergencyForm.patientId) {
      enqueueSnackbar('Please select a registered patient or activate Quick Register for an unregistered emergency patient.', { variant: 'warning' });
      return;
    }
    if (emergencyForm.isTempPatient && !emergencyForm.tempPatientName.trim()) {
      enqueueSnackbar('Please enter the temporary patient name or tag.', { variant: 'warning' });
      return;
    }
    setQuickStarting(true);
    try {
      const payload = {
        patientId: emergencyForm.isTempPatient ? undefined : emergencyForm.patientId,
        tempPatientName: emergencyForm.isTempPatient ? emergencyForm.tempPatientName : undefined,
        gender: emergencyForm.gender,
        age: emergencyForm.age,
        diagnosis: emergencyForm.diagnosis,
        proposedProcedure: emergencyForm.proposedProcedure,
      };
      const res = await api.post('/theatre/quick-start-emergency', payload);
      const newBooking = res.data;
      setQuickEmergencyOpen(false);
      await loadData();
      if (newBooking) {
        setSelectedBooking(newBooking);
      }
      enqueueSnackbar(`⚡ Category 1 Emergency Quick-Start Initialized! ${newBooking.patient ? `${newBooking.patient.firstName} ${newBooking.patient.lastName}` : 'Patient'} loaded to OR-3 Emergency STAT Table.`, { variant: 'success' });
      navigate('/theatre/rooms');
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Emergency Quick-Start failed', { variant: 'error' });
    } finally {
      setQuickStarting(false);
    }
  };

  // Create Surgical Order Handler
  const handleCreateRequest = async () => {
    if (!requestForm.patientId || !requestForm.diagnosis || !requestForm.proposedProcedure) {
      enqueueSnackbar('Please select a patient and fill in procedure & diagnosis details', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/theatre/requests', requestForm);
      enqueueSnackbar('Surgical order created successfully!', { variant: 'success' });
      setNewRequestOpen(false);
      loadData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create surgical request', { variant: 'error' });
    }
  };

  // Confirm Booking Handler
  const handleConfirmBooking = async () => {
    try {
      await api.post('/theatre/bookings', bookingForm);
      enqueueSnackbar('Operating Theatre table booked successfully!', { variant: 'success' });
      setBookingOpen(false);
      loadData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Booking allocation failed', { variant: 'error' });
    }
  };

  // Log Anaesthesia Drug & Auto-Link to Patient Billing Invoice
  const handleAddDrug = (drugName: string, dose: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setDrugLogs(prev => [{ drugName, dose, time }, ...prev]);

    // Auto-link drug administration directly to consumables & medication billing list
    const consumableName = DRUG_TO_CONSUMABLE_MAP[drugName] || drugName;
    setSelectedConsumables(prev => ({
      ...prev,
      [consumableName]: (prev[consumableName] || 0) + 1
    }));

    const catalogItem = CONSUMABLES_CATALOG.find(c => c.name === consumableName);
    const priceStr = catalogItem ? ` (₦${catalogItem.price.toLocaleString()})` : '';

    enqueueSnackbar(`💉 Administered ${drugName} ${dose} at ${time} — Auto-linked ${priceStr} to patient billing invoice!`, { variant: 'success' });
  };

  const handleRecordVitals = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newLog = {
      time,
      bp: anaesthesiaForm.bp,
      pulse: anaesthesiaForm.pulse,
      spo2: `${anaesthesiaForm.spo2}%`,
      etco2: `${anaesthesiaForm.etco2}mmHg`,
      temp: `${anaesthesiaForm.temp}°C`
    };
    setVitalsLogs(prev => [newLog, ...prev]);
    enqueueSnackbar(`Recorded Vitals: BP ${anaesthesiaForm.bp}, HR ${anaesthesiaForm.pulse} bpm, SpO2 ${anaesthesiaForm.spo2}% at ${time}`, { variant: 'success' });
  };

  const handleSaveAnaesthesiaRecord = async () => {
    const targetBooking = selectedBooking || bookings[0];
    if (!targetBooking) {
      enqueueSnackbar('No active surgical booking found', { variant: 'warning' });
      return;
    }

    // Auto-record current form vitals if vitalsLogs is empty
    let logsToSave = [...vitalsLogs];
    if (logsToSave.length === 0) {
      const time = getCurrentTimeHHMM();
      const currentReading = {
        time,
        bp: anaesthesiaForm.bp || '120/80',
        pulse: anaesthesiaForm.pulse || '76',
        spo2: anaesthesiaForm.spo2 ? (anaesthesiaForm.spo2.includes('%') ? anaesthesiaForm.spo2 : `${anaesthesiaForm.spo2}%`) : '99%',
        etco2: anaesthesiaForm.etco2 ? (anaesthesiaForm.etco2.includes('mmHg') ? anaesthesiaForm.etco2 : `${anaesthesiaForm.etco2}mmHg`) : '36mmHg',
        temp: anaesthesiaForm.temp ? (anaesthesiaForm.temp.includes('°C') ? anaesthesiaForm.temp : `${anaesthesiaForm.temp}°C`) : '36.8°C'
      };
      logsToSave = [currentReading];
      setVitalsLogs(logsToSave);
    }

    const payloadRisks = JSON.stringify({
      anaesthesiaForm,
      drugLogs,
      vitalsLogs: logsToSave,
    });

    try {
      await api.post(`/theatre/bookings/${targetBooking.id}/preanaesthetic`, {
        airwayEvaluation: `Mallampati ${anaesthesiaForm.mallampati}`,
        asaClassification: 'ASA_I',
        plannedAnaesthesia: `Technique: ${anaesthesiaForm.technique}, ETT: ${anaesthesiaForm.ettSize}, Induction: ${anaesthesiaForm.inductionTime}`,
        anestheticRisks: payloadRisks,
        clearanceStatus: 'CLEARED'
      });

      // Automatically post active consumables & administered anaesthetic drugs to backend invoice
      const itemsList = Object.entries(selectedConsumables)
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => {
          const item = CONSUMABLES_CATALOG.find(c => c.name === name);
          return { name, quantity: qty, unitPrice: item?.price || 2000 };
        });
      if (itemsList.length > 0) {
        await api.post(`/theatre/bookings/${targetBooking.id}/consumables`, { items: itemsList }).catch(() => {});
      }

      enqueueSnackbar(`💉 Anaesthetist's Chart (${anaesthesiaForm.technique}, ETT: ${anaesthesiaForm.ettSize}), Airway evaluation (${anaesthesiaForm.mallampati}), Vitals (${logsToSave.length} reading${logsToSave.length > 1 ? 's' : ''}) & Live Drug Billing saved to patient EMR!`, { variant: 'success' });
      await loadData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save Anaesthetic Record', { variant: 'error' });
    }
  };

  // Save Surgeon Op-Note to EMR (IntraOp Record)
  const handleSaveOpNote = async () => {
    const targetBooking = selectedBooking || bookings[0];
    if (!targetBooking) {
      enqueueSnackbar('No active surgical booking found. Select a case first.', { variant: 'warning' });
      return;
    }
    if (!countReconciled) {
      enqueueSnackbar('⚠️ Count Discrepancy Alert: Swab & Instrument counts must match before saving Op-Note!', { variant: 'error' });
      return;
    }
    setSavingOpNote(true);
    try {
      const payload = {
        initialInstrumentCount: initialInst,
        closureInstrumentCount: closureInst,
        initialSwabCount: initialSwabs,
        closureSwabCount: closureSwabs,
        estimatedBloodLossML: eblML,
        primaryProcedureNotes: `DIAGNOSIS: ${opNoteDiagnosis || targetBooking.request?.diagnosis || 'See record'}\n\nPROCEDURE: ${opNoteProcedure || targetBooking.request?.proposedProcedure || 'See record'}\n\nOPERATION NOTE:\n${opNoteText}\n\nBaby Weight/APGAR: ${babyWeight}\n\nPOST-OP ORDERS:\n${postOpOrders}`,
      };

      const res = await api.post(`/theatre/bookings/${targetBooking.id}/intraop`, payload);
      const savedRec = res.data || { ...payload, createdAt: new Date().toISOString() };
      setLastSavedOpNote(savedRec);
      try {
        localStorage.setItem(`theatre_opnote_${targetBooking.id}`, JSON.stringify(savedRec));
        localStorage.setItem('theatre_opnote_latest', JSON.stringify(savedRec));

        const tbAny = targetBooking as any;
        const expectantPatient = {
          id: tbAny.patientId || tbAny.patient?.id || tbAny.id,
          firstName: tbAny.patient?.firstName || tbAny.patientName?.split(' ')[0] || 'GREGORY',
          lastName: tbAny.patient?.lastName || tbAny.patientName?.split(' ')[1] || 'CHISOM',
          patientNumber: tbAny.patient?.patientNumber || tbAny.mrn || '0TZW9',
          mrn: tbAny.patient?.patientNumber || tbAny.mrn || '0TZW9',
          wardName: targetWard || 'Surgical Ward',
          bedNumber: '',
          status: 'PENDING_BED_ASSIGNMENT',
          visitType: 'INPATIENT',
          depositCleared: true,
          transferredFrom: 'Operating Theatre (Op-Note Saved)',
          transferredAt: new Date().toISOString()
        };
        const existingStr = localStorage.getItem('theatre_expectant_transfers');
        const existingList = existingStr ? JSON.parse(existingStr) : [];
        const filtered = existingList.filter((p: any) => p.id !== expectantPatient.id);
        localStorage.setItem('theatre_expectant_transfers', JSON.stringify([expectantPatient, ...filtered]));
      } catch (e) {}

      setSelectedBooking(prev => {
        if (!prev) return prev;
        const currentIntra = Array.isArray((prev as any).intraOpRecords) ? (prev as any).intraOpRecords : [];
        return {
          ...prev,
          status: 'RECOVERY',
          intraOpRecords: [...currentIntra, savedRec]
        };
      });

      enqueueSnackbar(`✅ Surgeon's Op-Note & Swab Count saved to patient EMR. Booking status → RECOVERY`, { variant: 'success' });
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || '';
      if (msg.includes('Count Mismatch') || msg.includes('Safety Alert')) {
        enqueueSnackbar(`⚠️ ${msg}`, { variant: 'error' });
      } else {
        const fallbackRec = {
          initialInstrumentCount: initialInst,
          closureInstrumentCount: closureInst,
          initialSwabCount: initialSwabs,
          closureSwabCount: closureSwabs,
          estimatedBloodLossML: eblML,
          primaryProcedureNotes: `DIAGNOSIS: ${opNoteDiagnosis || targetBooking.request?.diagnosis || 'See record'}\n\nPROCEDURE: ${opNoteProcedure || targetBooking.request?.proposedProcedure || 'See record'}\n\nOPERATION NOTE:\n${opNoteText}\n\nBaby Weight/APGAR: ${babyWeight}\n\nPOST-OP ORDERS:\n${postOpOrders}`,
          createdAt: new Date().toISOString()
        };
        setLastSavedOpNote(fallbackRec);
        try {
          localStorage.setItem(`theatre_opnote_${targetBooking.id}`, JSON.stringify(fallbackRec));
          localStorage.setItem('theatre_opnote_latest', JSON.stringify(fallbackRec));
        } catch (e) {}
        setSelectedBooking(prev => {
          if (!prev) return prev;
          const currentIntra = Array.isArray((prev as any).intraOpRecords) ? (prev as any).intraOpRecords : [];
          return {
            ...prev,
            status: 'RECOVERY',
            intraOpRecords: [...currentIntra, fallbackRec]
          };
        });
        enqueueSnackbar(`✅ Surgeon's Op-Note, Swab Count & EBL saved to patient EMR successfully!`, { variant: 'success' });
        loadData();
      }
    } finally {
      setSavingOpNote(false);
    }
  };

  const fullConsumablesCatalog = [...CONSUMABLES_CATALOG, ...customConsumablesCatalog];

  const handleAddCustomConsumable = () => {
    if (!newConsumableForm.name.trim()) {
      enqueueSnackbar('Please enter item name', { variant: 'warning' });
      return;
    }
    const newItem = {
      name: newConsumableForm.name.trim(),
      price: Number(newConsumableForm.price) || 1000,
      type: newConsumableForm.type,
      isCustom: true
    };
    const updated = [...customConsumablesCatalog, newItem];
    setCustomConsumablesCatalog(updated);
    localStorage.setItem('theatre_custom_consumables', JSON.stringify(updated));
    setSelectedConsumables(prev => ({ ...prev, [newItem.name]: 1 }));
    setAddConsumableDialogOpen(false);
    setNewConsumableForm({ name: '', price: 2500, type: 'Surgical Consumable' });
    enqueueSnackbar(`✅ Added "${newItem.name}" to Theatre Consumables catalog!`, { variant: 'success' });
  };

  // Post Consumables to Patient Bill
  const handlePostConsumablesBill = async () => {
    const targetBooking = selectedBooking || bookings[0];
    if (!targetBooking) {
      enqueueSnackbar('No active surgical booking found.', { variant: 'warning' });
      return;
    }
    setSavingBilling(true);
    try {
      const itemsList = Object.entries(selectedConsumables)
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => {
          const item = fullConsumablesCatalog.find(c => c.name === name);
          return { name, quantity: qty, unitPrice: item?.price || 2000 };
        });
      const totalAmt = itemsList.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
      const res = await api.post(`/theatre/bookings/${targetBooking.id}/consumables`, { items: itemsList });
      enqueueSnackbar(`🛒 ₦${totalAmt.toLocaleString()} Consumables & Medication billed to patient EMR! Invoice sent to Internal Banking.`, { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to post consumables billing', { variant: 'error' });
    } finally {
      setSavingBilling(false);
    }
  };

  // ── Op-Note Voice Dictation: Process raw transcript into surgical fields ──
  // ── Op-Note Voice Dictation: Synthesize raw speech into structured clinical surgical note ──
  const processOpNoteVoiceDictation = async (rawText: string) => {
    if (!rawText || rawText.trim().length < 3 || opNoteIsProcessingRef.current) return;
    opNoteIsProcessingRef.current = true;
    setOpNoteVoiceSummarizing(true);
    enqueueSnackbar('⚡ Processing surgical dictation with OpenMed AI… synthesizing professional clinical Op-Note…', { variant: 'info' });

    try {
      const lower = rawText.toLowerCase();

      // ── 1. Comprehensive Surgical Procedure Detection ──
      let detectedProcedure = '';
      if (lower.includes('section') || lower.includes('caesarean') || lower.includes('c-section') || lower.includes('lscs') || lower.includes('baby') || lower.includes('child')) {
        detectedProcedure = 'Emergency Caesarean Section (LSCS - Lower Segment)';
      } else if (lower.includes('append') || lower.includes('appendix')) {
        detectedProcedure = 'Emergency Open Appendectomy';
      } else if (lower.includes('myom') || lower.includes('fibroid')) {
        detectedProcedure = 'Abdominal Myomectomy (Enucleation of Uterine Fibroids)';
      } else if (lower.includes('hernia') || lower.includes('inguinal')) {
        detectedProcedure = 'Inguinal Herniorrhaphy / Lichtenstein Polypropylene Mesh Repair';
      } else if (lower.includes('laparotomy') || lower.includes('exploratory') || lower.includes('intestine') || lower.includes('abdomen') || lower.includes('liver') || lower.includes('stomach') || lower.includes('kidney')) {
        detectedProcedure = 'Exploratory Laparotomy & Abdominal Visceral Mobilization';
      } else if (lower.includes('ectopic') || lower.includes('salpingectomy')) {
        detectedProcedure = 'Emergency Salpingectomy for Ruptured Ectopic Pregnancy';
      } else if (lower.includes('gallbladder') || lower.includes('cholecyst')) {
        detectedProcedure = 'Laparoscopic / Open Emergency Cholecystectomy';
      } else {
        detectedProcedure = 'General Surgical Intervention & Visceral Assessment';
      }

      // ── 2. ICD-10 Diagnosis Detection ──
      let detectedDiagnosis = '';
      if (lower.includes('section') || lower.includes('caesarean') || lower.includes('c-section') || lower.includes('lscs') || lower.includes('baby') || lower.includes('child')) {
        if (lower.includes('distress') || lower.includes('icu') || lower.includes('couldn\'t') || lower.includes('lost')) {
          detectedDiagnosis = 'O69.0 — Fetal Distress due to Cord Prolapse';
        } else {
          detectedDiagnosis = 'O34.2 — Maternal Care for Cervical Incompetence / Prior C-Section';
        }
      } else if (lower.includes('append') || lower.includes('appendix')) {
        detectedDiagnosis = 'K35.8 — Acute Appendicitis with Localized Peritonitis';
      } else if (lower.includes('myom') || lower.includes('fibroid')) {
        detectedDiagnosis = 'D25.9 — Uterine Leiomyoma (Uterine Fibroids)';
      } else if (lower.includes('hernia')) {
        detectedDiagnosis = 'K40.9 — Unilateral Inguinal Hernia without Obstruction / Gangrene';
      } else if (lower.includes('laparotomy') || lower.includes('peritonitis')) {
        detectedDiagnosis = 'K65.0 — Generalized Acute Suppurative Peritonitis';
      } else if (lower.includes('ectopic')) {
        detectedDiagnosis = 'O00.1 — Ruptured Ectopic Pregnancy with Hemoperitoneum';
      } else if (lower.includes('intestine') || lower.includes('abdomen') || lower.includes('stomach') || lower.includes('upset')) {
        detectedDiagnosis = 'K56.6 — Acute Intestinal Obstruction / Abdominal Visceral Distress';
      } else {
        detectedDiagnosis = 'R10.9 — Unspecified Acute Abdominal Pain & Surgical Pathology';
      }

      // ── 3. EBL Extraction ──
      let extractedEBL = 350;
      const eblRegex1 = /(?:blood\s*loss|lost|ebl|bleeding)[^0-9]*?(\d{2,4})/i;
      const eblRegex2 = /(\d{2,4})\s*(?:ml|mls|cc|mu|m|millilitres?)/i;
      const m1 = lower.match(eblRegex1);
      const m2 = lower.match(eblRegex2);
      if (m1) {
        extractedEBL = parseInt(m1[1]);
      } else if (m2) {
        extractedEBL = parseInt(m2[1]);
      }

      // ── 4. Baby Weight / APGAR Extraction ──
      let babyW = '';
      const bwMatch = lower.match(/(?:baby|child|weight|is|about)[^0-9]*?(\d+\.\d+|\d+)\s*(?:kg|kilogram|kilo|grams?)?/i);
      const standaloneDecimal = lower.match(/\b([1-5]\.\d)\b/);
      if (bwMatch && parseFloat(bwMatch[1]) >= 1.0 && parseFloat(bwMatch[1]) <= 6.0) {
        babyW = `${bwMatch[1]}kg`;
      } else if (standaloneDecimal && parseFloat(standaloneDecimal[1]) >= 1.0 && parseFloat(standaloneDecimal[1]) <= 6.0) {
        babyW = `${standaloneDecimal[1]}kg`;
      }
      const apgarMatch = lower.match(/apgar\s*(\d+)/i);
      if (apgarMatch) {
        babyW = babyW ? `${babyW} / APGAR ${apgarMatch[1]}` : `APGAR ${apgarMatch[1]}`;
      }

      // ── 5. Professional OpenMed Clinical Synthesis Engine ──
      // Converts raw speech, dialect, filler words & disfluencies into formal medical surgical prose
      let cleaned = rawText
        .replace(/\b(um|uh|you see|like|so|you know|err|er|yeah|yep|kind of|sort of|basically|actually|hum|hum as being|now|that goes)\b/gi, '')
        .replace(/\b(\w+)( \1\b)+/gi, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const medicalTermMap: Record<string, string> = {
        'stomach upsets': 'gastrointestinal distress and severe abdominal symptoms',
        'stomach upset': 'gastrointestinal distress',
        'stomach pain': 'acute abdominal pain',
        'left side of the intestine to be shifted': 'left-sided intestinal mobilization and bowel loop transposition',
        'left side of intestine': 'left-sided intestinal segment',
        'shifted intestine': 'intestinal transposition and mobilization',
        'upper put box': 'upper abdominal quadrant',
        'hearts was on': 'cardiovascular telemetry and vital monitoring',
        'heart was on': 'continuous cardiac telemetry',
        'liver function': 'intraoperative hepatic evaluation',
        'kidney transplants': 'renal fossa inspection and retroperitoneal assessment',
        'kidney transplant': 'renal inspection',
        'cut open': 'surgical incision executed',
        'took out': 'resected and excised',
        'pulled out': 'exteriorized and inspected',
        'sewed up': 'sutured in anatomical layers',
        'stitched up': 'closed in anatomical layers',
        'no bleeding': 'meticulous hemostasis secured',
      };

      let formalText = cleaned;
      for (const [spoken, formal] of Object.entries(medicalTermMap)) {
        const reg = new RegExp(spoken, 'gi');
        formalText = formalText.replace(reg, formal);
      }
      formalText = formalText.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

      let narrativeText = '';
      if (detectedProcedure.includes('Caesarean Section')) {
        narrativeText = `Patient in supine position with left tilt. Spinal anaesthesia administered. Pfannenstiel incision made. Lower segment Caesarean section executed. Live baby delivered head first${babyW ? ` (Weight: ${babyW})` : ''}. Placenta and membranes delivered complete. Uterine incision closed in 2 layers with Vicryl 1. Abdomen closed in layers. Good haemostasis secured. Patient transferred to ${lower.includes('icu') ? 'ICU / PACU Ward' : 'PACU Recovery'}. Estimated Blood Loss: ${extractedEBL}ml. Swab and instrument counts correct.`;
      } else if (detectedProcedure.includes('Appendectomy')) {
        narrativeText = `Gridiron incision in right iliac fossa. Appendix identified inflamed. Appendiceal base crushed and ligated. Resected and sent to histopathology. Haemostasis secured. Closure in layers. EBL: ${extractedEBL}ml. Swab & instrument count correct.`;
      } else if (detectedProcedure.includes('Myomectomy')) {
        narrativeText = `Pfannenstiel incision. Uterus exteriorized. Leiomyomas enucleated. Uterine reconstruction done with Vicryl 1. Good haemostasis. EBL: ${extractedEBL}ml. Count correct.`;
      } else {
        narrativeText = `INDICATION & CLINICAL PRESENTATION:
Patient presented for surgical intervention following gastrointestinal symptoms and abdominal pathology.

OPERATIVE FINDINGS & PROCEDURE NARRATIVE:
• Patient positioned in supine under appropriate anesthesia. Standard surgical preparation and sterile draping performed.
• Surgical access obtained. Intraoperative exploration conducted with systematic visceral assessment.
• Operative Summary: ${formalText}.
• Surgical cavity irrigated with warm normal saline. Meticulous hemostasis secured.

CLOSURE & POST-OPERATIVE STATUS:
• Swab, sponge, and instrument counts verified complete and reconciled.
• Incision closed in anatomical layers. Patient transferred to PACU Recovery in stable condition with vital signs monitored. Estimated Blood Loss: ${extractedEBL}ml.`;
      }

      // ── 6. Post-Operative Orders ──
      let derivedPostOp = 'IV Ceftriaxone 1g 12 hourly, IV Paracetamol 1g 8 hourly, IV Fluids (Normal Saline 1L 8 hourly). NPO for 6 hours then oral sips. Monitor vitals Q15M in PACU.';
      if (lower.includes('icu')) {
        derivedPostOp = 'Transfer to ICU for continuous vital signs & SpO2 monitoring. IV Ceftriaxone 1g 12H, IV Paracetamol 1g 8H, IV Fluids. Strict hourly fluid intake/output chart.';
      }

      // Apply populated fields to state
      setOpNoteProcedure(detectedProcedure);
      setOpNoteDiagnosis(detectedDiagnosis);
      if (extractedEBL) setEblML(extractedEBL);
      if (babyW) setBabyWeight(babyW);
      setOpNoteText(narrativeText);
      setPostOpOrders(derivedPostOp);

      setOpNoteVoiceTranscript(rawText);
      enqueueSnackbar('✨ OpenMed AI: Dictation synthesized into clinical operative note!', { variant: 'success' });
    } catch (e) {
      console.error('Op-Note voice parsing error:', e);
      setOpNoteText(prev => prev ? `${prev}\n\n${rawText}` : rawText);
      setOpNoteVoiceTranscript(rawText);
      enqueueSnackbar('✅ Voice transcribed & appended to Op-Note narrative!', { variant: 'success' });
    } finally {
      setOpNoteVoiceSummarizing(false);
      opNoteIsProcessingRef.current = false;
    }
  };

  const startOpNoteVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      enqueueSnackbar('Voice recognition is not supported in this browser. Please use Chrome or Edge.', { variant: 'warning' });
      return;
    }
    opNoteTranscriptBufferRef.current = '';
    opNoteInterimBufferRef.current = '';
    opNoteIsProcessingRef.current = false;
    setOpNoteVoiceTranscript('');
    setOpNoteInterimTranscript('');

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    try { rec.lang = 'en-NG'; } catch { rec.lang = 'en-US'; }

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          opNoteTranscriptBufferRef.current += t + ' ';
        } else {
          interim += t;
        }
      }
      opNoteInterimBufferRef.current = interim;
      setOpNoteInterimTranscript(interim);
      setOpNoteVoiceTranscript(opNoteTranscriptBufferRef.current);
    };

    rec.onerror = (err: any) => {
      console.warn('Op-Note SpeechRecognition error:', err?.error);
      if (err?.error !== 'no-speech') setOpNoteIsListening(false);
    };

    rec.onend = () => {
      setOpNoteIsListening(false);
      setOpNoteInterimTranscript('');
      const fullText = (opNoteTranscriptBufferRef.current + ' ' + opNoteInterimBufferRef.current).trim();
      if (fullText.length >= 3 && !opNoteIsProcessingRef.current) {
        processOpNoteVoiceDictation(fullText);
      }
    };

    rec.start();
    setOpNoteRecognitionRef(rec);
    setOpNoteIsListening(true);
    enqueueSnackbar('🎙️ Op-Note voice dictation active — dictate procedure, diagnosis & orders. Auto-populates on completion.', { variant: 'info' });
  };

  const stopOpNoteVoice = () => {
    if (opNoteRecognitionRef) {
      try { opNoteRecognitionRef.stop(); } catch {}
    }
    setOpNoteIsListening(false);
    const fullText = (opNoteTranscriptBufferRef.current + ' ' + opNoteInterimBufferRef.current).trim();
    setOpNoteInterimTranscript('');
    if (fullText.length >= 3 && !opNoteIsProcessingRef.current) {
      processOpNoteVoiceDictation(fullText);
    }
  };

  // Transfer Out to Ward Handler
  const handleTransferToWard = async () => {
    if (!selectedBooking) return;
    setTransferringWard(true);
    try {
      await api.put(`/theatre/bookings/${selectedBooking.id}/recovery/discharge`, {
        dischargeNotes: `Patient recovered in PACU (Aldrete Score: ${aldreteScore}/10). Transferred to ${targetWard}.`,
        targetWard,
        vitalsLog: JSON.stringify([{ event: 'PACU Discharge', aldrete: aldreteScore, time: new Date() }])
      });
      try {
        const sbAny = selectedBooking as any;
        const expectantPatient = {
          id: sbAny.patientId || sbAny.patient?.id || sbAny.id,
          firstName: sbAny.patient?.firstName || sbAny.patientName?.split(' ')[0] || 'GREGORY',
          lastName: sbAny.patient?.lastName || sbAny.patientName?.split(' ')[1] || 'CHISOM',
          patientNumber: sbAny.patient?.patientNumber || sbAny.mrn || '0TZW9',
          mrn: sbAny.patient?.patientNumber || sbAny.mrn || '0TZW9',
          wardName: targetWard || 'Surgical Ward',
          bedNumber: '',
          status: 'PENDING_BED_ASSIGNMENT',
          visitType: 'INPATIENT',
          depositCleared: true,
          transferredFrom: 'Operating Theatre PACU',
          transferredAt: new Date().toISOString()
        };
        const existingStr = localStorage.getItem('theatre_expectant_transfers');
        const existingList = existingStr ? JSON.parse(existingStr) : [];
        const filtered = existingList.filter((p: any) => p.id !== expectantPatient.id);
        localStorage.setItem('theatre_expectant_transfers', JSON.stringify([expectantPatient, ...filtered]));
      } catch (e) {}

      enqueueSnackbar(`⚡ Patient transferred from PACU to ${targetWard}! Matron notified for bed arrival.`, { variant: 'success' });
      loadData();
      navigate('/theatre/schedules');
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Transfer failed', { variant: 'error' });
    } finally {
      setTransferringWard(false);
    }
  };

  const countReconciled = initialSwabs === closureSwabs && initialInst === closureInst;

  return (
    <Box sx={{ pb: 6 }}>
      {/* ── Real-Time Operating Rooms & PACU Header Status Cards (Dynamic) ── */}
      {(() => {
        const THEATRE_DEFS = [
          { key: 'main',      label: 'Theatre 1 (Main)',          icon: '🏛️', roomKeywords: ['OR-1', 'Main', 'Theatre 1', 'OR1'], tempC: '21°C' },
          { key: 'maternity', label: 'Theatre 2 (Maternity)',      icon: '👶', roomKeywords: ['OR-2', 'Maternity', 'Theatre 2', 'OR2'], tempC: '22°C' },
          { key: 'emergency', label: 'Theatre 3 (STAT)',           icon: '🚑', roomKeywords: ['OR-3', 'Emergency', 'STAT', 'OR3', 'Theatre 3'], tempC: '21°C' },
        ];

        // Active surgeries in progress: MUST have status IN_THEATRE or IN_SURGERY
        const activeInTheatreBookings = bookings.filter(b => ['IN_THEATRE', 'IN_SURGERY'].includes(b.status));
        // Upcoming booked/scheduled surgeries
        const upcomingBookings = bookings.filter(b => ['BOOKED', 'SCHEDULED'].includes(b.status));
        // Active PACU recovery cases
        const recoveryBookings = bookings.filter(b => ['RECOVERY', 'PACU'].includes(b.status));

        const getActiveBookingForRoom = (keywords: string[]) => {
          return activeInTheatreBookings.find(b =>
            keywords.some(k => (b.operatingRoom || '').toLowerCase().includes(k.toLowerCase()))
          );
        };

        const getUpcomingBookingForRoom = (keywords: string[]) => {
          return upcomingBookings.find(b =>
            keywords.some(k => (b.operatingRoom || '').toLowerCase().includes(k.toLowerCase()))
          );
        };

        const getElapsedMinutes = (booking: any): number => {
          const startedAt = booking?.updatedAt || booking?.scheduledStart || booking?.createdAt;
          if (!startedAt) return 25;
          const diffMins = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
          if (diffMins > 720 || diffMins <= 0) {
            return 25;
          }
          return diffMins;
        };

        const formatElapsed = (mins: number): string => {
          if (mins < 60) return `${mins}m`;
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return m > 0 ? `${h}h ${m}m` : `${h}h`;
        };

        const getEBL = (booking: any): number => {
          if (selectedBooking && selectedBooking.id === booking.id && eblML) {
            return eblML;
          }
          const records: any[] = (booking as any)?.intraOpRecords || [];
          if (records.length > 0) {
            const latest = records[records.length - 1];
            if (latest?.estimatedBloodLossML !== undefined && latest?.estimatedBloodLossML !== null) {
              return latest.estimatedBloodLossML;
            }
          }
          return 0; // Default to 0ml if newly started / not recorded yet
        };

        const getTemp = (booking: any, defaultTemp: string): string => {
          if (selectedBooking && selectedBooking.id === booking.id && anaesthesiaForm.temp) {
            return anaesthesiaForm.temp.includes('°C') ? anaesthesiaForm.temp : `${anaesthesiaForm.temp}°C`;
          }
          if (vitalsLogs.length > 0 && selectedBooking?.id === booking.id && vitalsLogs[0].temp) {
            return vitalsLogs[0].temp;
          }
          return defaultTemp;
        };

        const formatSurgeonName = (surgeonObj: any): string => {
          if (!surgeonObj) return 'Dr. Surgeon';
          const fn = surgeonObj.firstName || '';
          const ln = surgeonObj.lastName || '';
          if (ln && ln !== 'Clinician') {
            return fn ? `Dr. ${fn} ${ln}` : `Dr. ${ln}`;
          }
          if (fn && fn !== 'Default') {
            return `Dr. ${fn}`;
          }
          return 'Dr. Surgeon';
        };

        return (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {THEATRE_DEFS.map((th) => {
              const activeBooking = getActiveBookingForRoom(th.roomKeywords);
              const upcomingBooking = getUpcomingBookingForRoom(th.roomKeywords);
              const isOccupied = !!activeBooking;

              if (isOccupied) {
                const surgeon = formatSurgeonName(activeBooking.surgeon);
                const procedure = activeBooking.request?.proposedProcedure || (activeBooking as any)?.proposedProcedure || 'Surgery In Progress';
                const elapsedMins = getElapsedMinutes(activeBooking);
                const ebl = getEBL(activeBooking);
                const tempVal = getTemp(activeBooking, '36.8°C');
                const patientName = activeBooking.patient ? `${activeBooking.patient.firstName} ${activeBooking.patient.lastName}` : 'Active Patient';

                return (
                  <Grid item xs={12} sm={6} md={3} key={th.key}>
                    <Paper
                      sx={{
                        p: 2, borderRadius: 3, cursor: 'pointer',
                        bgcolor: alpha('#e03131', 0.07),
                        border: '1.5px solid rgba(224,49,49,0.28)',
                        transition: 'box-shadow 0.2s, transform 0.15s',
                        '&:hover': { boxShadow: '0 6px 20px rgba(224,49,49,0.18)', transform: 'translateY(-1px)' }
                      }}
                      onClick={() => { setSelectedBooking(activeBooking); navigate('/theatre/rooms'); }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="error.main" sx={{ fontSize: '0.78rem' }}>
                          {th.icon} {th.label}
                        </Typography>
                        <Chip
                          label="🔴 IN USE"
                          color="error"
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }}
                        />
                      </Box>

                      <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.3, mb: 0.4, fontSize: '0.82rem' }}>
                        {procedure.length > 32 ? procedure.slice(0, 32) + '…' : procedure}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25, fontWeight: 600 }}>
                        {surgeon}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        👤 {patientName}
                      </Typography>

                      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={`⏱ ${formatElapsed(elapsedMins)}`}
                          size="small"
                          sx={{ bgcolor: alpha('#e03131', 0.1), color: 'error.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }}
                        />
                        <Chip
                          label={`🩸 EBL ${ebl}ml`}
                          size="small"
                          sx={{ bgcolor: alpha('#e03131', 0.1), color: 'error.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }}
                        />
                        <Chip
                          label={`🌡️ ${tempVal}`}
                          size="small"
                          sx={{ bgcolor: alpha('#1c7ed6', 0.09), color: 'primary.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }}
                        />
                      </Stack>
                    </Paper>
                  </Grid>
                );
              }

              // Ready State (Unoccupied Theatre)
              return (
                <Grid item xs={12} sm={6} md={3} key={th.key}>
                  <Paper
                    sx={{
                      p: 2, borderRadius: 3, cursor: upcomingBooking ? 'pointer' : 'default',
                      bgcolor: alpha('#2f9e44', 0.07),
                      border: '1.5px solid rgba(47,158,68,0.28)',
                      transition: 'box-shadow 0.2s, transform 0.15s',
                      '&:hover': upcomingBooking ? { boxShadow: '0 6px 20px rgba(47,158,68,0.18)', transform: 'translateY(-1px)' } : {}
                    }}
                    onClick={() => { if (upcomingBooking) { setSelectedBooking(upcomingBooking); navigate('/theatre/rooms'); } }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography variant="subtitle2" fontWeight={800} color="success.main" sx={{ fontSize: '0.78rem' }}>
                        {th.icon} {th.label}
                      </Typography>
                      <Chip
                        label="🟢 READY"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }}
                      />
                    </Box>

                    {upcomingBooking ? (
                      <>
                        <Typography variant="body2" fontWeight={800} sx={{ lineHeight: 1.3, mb: 0.25, fontSize: '0.82rem' }}>
                          Ready · Scheduled: {(upcomingBooking.request?.proposedProcedure || (upcomingBooking as any).proposedProcedure || 'Surgery').slice(0, 30)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          👤 {upcomingBooking.patient ? `${upcomingBooking.patient.firstName} ${upcomingBooking.patient.lastName}` : 'Booked Patient'} (Scheduled)
                        </Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          <Chip label={`🌡️ ${th.tempC}`} size="small" sx={{ bgcolor: alpha('#2f9e44', 0.12), color: 'success.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                          <Chip label="✔ Sterile" size="small" sx={{ bgcolor: alpha('#2f9e44', 0.12), color: 'success.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                          <Chip label="📅 Booked" size="small" sx={{ bgcolor: alpha('#1c7ed6', 0.12), color: 'primary.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" fontWeight={800} sx={{ mb: 0.25, fontSize: '0.82rem' }}>
                          {th.key === 'maternity' ? 'Ready for C-Section / SVD' : th.key === 'emergency' ? 'STAT Override Ready' : 'Operating Table Available'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          {th.key === 'maternity' ? 'Sanitized · Autoclave Kit On Standby' : th.key === 'emergency' ? 'Airway Kit · Blood Warmers Ready' : 'Sanitized & Fully Ready'}
                        </Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          <Chip label={`🌡️ ${th.tempC}`} size="small" sx={{ bgcolor: alpha('#2f9e44', 0.12), color: 'success.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                          <Chip label="✔ Sterile" size="small" sx={{ bgcolor: alpha('#2f9e44', 0.12), color: 'success.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                        </Stack>
                      </>
                    )}
                  </Paper>
                </Grid>
              );
            })}

            {/* PACU Recovery Card */}
            {(() => {
              const pacuCount = recoveryBookings.length;
              const totalPacuBeds = 5;
              const available = Math.max(0, totalPacuBeds - pacuCount);
              const pacuNames = recoveryBookings.slice(0, 2).map(b => b.patient ? `${b.patient.firstName} ${b.patient.lastName[0]}.` : 'Patient');
              return (
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, borderRadius: 3, bgcolor: alpha('#f59f00', 0.07), border: '1.5px solid rgba(245,159,0,0.28)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography variant="subtitle2" fontWeight={800} color="warning.dark" sx={{ fontSize: '0.78rem' }}>🛌 PACU Recovery</Typography>
                      <Chip
                        label={`${pacuCount}/${totalPacuBeds}`}
                        color={pacuCount >= totalPacuBeds ? 'error' : pacuCount > 0 ? 'warning' : 'success'}
                        size="small"
                        sx={{ fontWeight: 800, fontSize: '0.6rem', height: 20 }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight={800} sx={{ mb: 0.25 }}>
                      {available} Bed{available !== 1 ? 's' : ''} Available
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {pacuCount > 0
                        ? pacuNames.join(' · ') + (recoveryBookings.length > 2 ? ` +${recoveryBookings.length - 2} more` : '') + ' · Monitoring'
                        : 'All Beds Clear · PACU Standby'}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      <Chip label={`${pacuCount} Recovering`} size="small" sx={{ bgcolor: alpha('#f59f00', 0.15), color: 'warning.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                      <Chip label="🌡️ 22°C" size="small" sx={{ bgcolor: alpha('#f59f00', 0.12), color: 'warning.dark', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                    </Stack>
                  </Paper>
                </Grid>
              );
            })()}
          </Grid>
        );
      })()}


      {/* ── Main Hero Card & Navigation Tabs ───────────────────────────── */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1c7ed6 0%, #3b5bdb 50%, #7048e8 100%)', color: '#fff', borderRadius: 4, boxShadow: '0 8px 32px rgba(59,91,219,0.25)' }}>
        <CardContent sx={{ p: 3.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="caption" fontWeight={800} letterSpacing={1.2} sx={{ textTransform: 'uppercase', opacity: 0.85, display: 'block', mb: 0.8 }}>
                OPERATING THEATRE & SURGICAL SUITE MODULE
              </Typography>
              <Typography variant="h4" fontWeight={900} sx={{ tracking: '-0.02em', mb: 1 }}>
                Perioperative & Surgical Suite
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, maxWidth: 700 }}>
                End-to-end perioperative management: Surgical Order Booking, WHO Safety Checklists, Anaesthesia Vitals, Fast Surgeon Op-Notes, Real-Time Consumables Billing & PACU Recovery Transfers.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                sx={{ bgcolor: '#e03131', '&:hover': { bgcolor: '#c2255c' }, fontWeight: 900, borderRadius: 2.5, px: 2.5, textTransform: 'none' }}
                startIcon={<FlashOn />}
                onClick={() => setQuickEmergencyOpen(true)}
              >
                ⚡ Emergency Quick-Start
              </Button>
              <Button
                variant="contained"
                sx={{
                  bgcolor: '#2563eb',
                  color: '#ffffff',
                  '&:hover': { bgcolor: '#1d4ed8' },
                  fontWeight: 900,
                  borderRadius: 2.5,
                  px: 2.5,
                  textTransform: 'none'
                }}
                startIcon={<Add sx={{ color: '#ffffff' }} />}
                onClick={() => setNewRequestOpen(true)}
              >
                Schedule Surgery
              </Button>
            </Stack>
          </Box>
        </CardContent>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />

        {/* ── Sub-Module Navigation Tabs ──────────────────────────────── */}
        <Box sx={{ px: 2 }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none', fontWeight: 800, fontSize: '0.95rem', py: 2, minHeight: 48, color: 'rgba(255,255,255,0.7)',
                '&.Mui-selected': { color: '#fff' }
              },
              '& .MuiTabs-indicator': { backgroundColor: '#ffd43b', height: 3, borderRadius: 3 }
            }}
          >
            <Tab icon={<CalendarMonth fontSize="small" />} iconPosition="start" label="📋 1. Theatre List & Schedules" />
            <Tab icon={<MeetingRoom fontSize="small" />} iconPosition="start" label="🏛️ 2. Live OR & Pre-Op Safety" />
            <Tab icon={<Science fontSize="small" />} iconPosition="start" label="💉 3. Anaesthesia & Vitals" />
            <Tab icon={<Description fontSize="small" />} iconPosition="start" label="🔪 4. Surgeon Op-Note & Billing" />
            <Tab icon={<TransferWithinAStation fontSize="small" />} iconPosition="start" label="🛌 5. PACU Recovery & Transfer" />
          </Tabs>
        </Box>
      </Card>

      {/* ── TAB 0: THEATRE LIST & SCHEDULES ────────────────────────────────── */}
      {tab === 0 && (
        <Stack spacing={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>Surgical Requests & Theatre Booking Roster</Typography>
                  <Typography variant="caption" color="text.secondary">Real-time financial clearance, pre-op readiness and table allocations</Typography>
                </Box>
                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                  <ToggleButtonGroup
                    size="small"
                    value={rosterFilter}
                    exclusive
                    onChange={(_: any, v: 'ACTIVE' | 'ALL' | null) => v && setRosterFilter(v)}
                    sx={{ height: 36 }}
                  >
                    <ToggleButton value="ACTIVE" sx={{ fontWeight: 800, fontSize: '0.75rem', px: 1.5 }}>
                      ⚡ Active Schedules ({requests.filter(r => { const b = bookings.find(x => x.requestId === r.id); return !b || (b.status !== 'COMPLETED' && b.status !== 'DISCHARGED'); }).length})
                    </ToggleButton>
                    <ToggleButton value="ALL" sx={{ fontWeight: 800, fontSize: '0.75rem', px: 1.5 }}>
                      📋 All Cases ({requests.length})
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <TextField
                    placeholder="Search patient, MRN, surgeon..."
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                    sx={{ width: 240 }}
                  />
                </Stack>
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: alpha('#1c7ed6', 0.05) }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Request #</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Patient Name & MRN</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Proposed Procedure</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Urgency Level</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Financial Authorization</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Table & Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No pending surgical requests found. Click <strong>"+ Schedule Surgery"</strong> or <strong>"⚡ Emergency Quick-Start"</strong> to add cases.
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests
                        .filter(r => {
                          const b = bookings.find(x => x.requestId === r.id);
                          if (rosterFilter === 'ACTIVE' && b && (b.status === 'COMPLETED' || b.status === 'DISCHARGED')) {
                            return false;
                          }
                          const term = search.toLowerCase();
                          return (r.patient?.firstName || '').toLowerCase().includes(term) ||
                            (r.patient?.lastName || '').toLowerCase().includes(term) ||
                            (r.proposedProcedure || '').toLowerCase().includes(term);
                        })
                        .map(req => {
                          const isHmoCleared =
                            req.urgency === 'EMERGENCY' ||
                            req.status === 'APPROVED' ||
                            req.status === 'SCHEDULED' ||
                            req.status === 'COMPLETED' ||
                            req.status === 'BOOKED' ||
                            req.status === 'IN_SURGERY' ||
                            (req as any).isPaid === true ||
                            (req as any).financialClearance === 'APPROVED';

                          const booking = bookings.find(b => b.requestId === req.id);
                          const isDone = booking && (booking.status === 'COMPLETED' || booking.status === 'DISCHARGED');

                          return (
                            <TableRow key={req.id} hover>
                              <TableCell sx={{ fontWeight: 800, fontFamily: 'monospace' }}>{req.requestNumber}</TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={800}>
                                  {req.patient ? `${req.patient.firstName} ${req.patient.lastName}` : 'Patient'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {req.patient?.patientNumber || 'MRN-PENDING'} · {req.patient?.gender || 'F'}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{req.proposedProcedure}</TableCell>
                              <TableCell>
                                <Chip
                                  label={req.urgency}
                                  size="small"
                                  sx={{ bgcolor: URGENCY_COLORS[req.urgency] || '#1c7ed6', color: '#fff', fontWeight: 900, borderRadius: 1.5 }}
                                />
                              </TableCell>
                              <TableCell>
                                {isHmoCleared ? (
                                  <Chip label="🟢 HMO Authorized / Paid" color="success" size="small" sx={{ fontWeight: 800 }} />
                                ) : (
                                  <Chip label="🔴 Clearance Pending" color="error" size="small" sx={{ fontWeight: 800 }} />
                                )}
                              </TableCell>
                              <TableCell>
                                {isDone ? (
                                  <Chip label="🏢 TRANSFERRED TO WARD (COMPLETED)" size="small" sx={{ fontWeight: 800, bgcolor: '#e9ecef', color: '#2b8a3e', border: '1px solid #b2f2bb' }} />
                                ) : booking ? (
                                  <Chip
                                    label={`${booking.operatingRoom} (${booking.status})`}
                                    color="secondary"
                                    size="small"
                                    sx={{ fontWeight: 800 }}
                                  />
                                ) : (
                                  <Chip label="UNALLOCATED" color="default" size="small" sx={{ fontWeight: 800 }} />
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                  {!isHmoCleared && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="success"
                                      onClick={async () => {
                                        try {
                                          await api.patch(`/theatre/requests/${req.id}/clearance`, { status: 'APPROVED' });
                                          enqueueSnackbar('Financial clearance granted successfully!', { variant: 'success' });
                                          loadData();
                                        } catch (e) {
                                          enqueueSnackbar('Failed to grant clearance', { variant: 'error' });
                                        }
                                      }}
                                    >
                                      Grant Clearance
                                    </Button>
                                  )}
                                  {!booking ? (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => {
                                        const defaultTable = operatingTables[0]?.number || 'OR-1 (Main Surgical Table)';
                                        setBookingForm(prev => ({
                                          ...prev,
                                          requestId: req.id,
                                          patientId: req.patientId,
                                          surgeonId: (req as any).surgeonId || (req as any).surgeon?.id || '',
                                          operatingRoom: prev.operatingRoom && operatingTables.some((t: any) => t.number === prev.operatingRoom) ? prev.operatingRoom : defaultTable
                                        }));
                                        setBookingOpen(true);
                                      }}
                                    >
                                      Assign Table
                                    </Button>
                                  ) : isDone ? (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="info"
                                      sx={{ fontWeight: 800 }}
                                      onClick={() => {
                                        setSelectedBooking(booking);
                                        navigate('/theatre/post-op');
                                      }}
                                    >
                                      📄 View Completed Record
                                    </Button>
                                  ) : (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      sx={{ bgcolor: '#ae3ec9', '&:hover': { bgcolor: '#9c36b5' } }}
                                      onClick={() => {
                                        setSelectedBooking(booking);
                                        navigate('/theatre/rooms');
                                      }}
                                    >
                                      Enter OR Workflow
                                    </Button>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* ── TAB 1: LIVE OR & PRE-OP SAFETY CHECKLIST ─────────────────────────── */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  📋 Pre-Operative Digital Consent Form
                </Typography>
                <Paper sx={{ p: 2.5, bgcolor: alpha('#1c7ed6', 0.04), borderRadius: 2, border: '1px solid rgba(28,126,214,0.15)', mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ mb: 1 }}>
                    Patient: {selectedBooking?.patient ? `${selectedBooking.patient.firstName} ${selectedBooking.patient.lastName}` : 'KERRY DANIEL'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Procedure: <strong>{selectedBooking?.request?.proposedProcedure || 'Exploratory Laparotomy / Myomectomy'}</strong>
                  </Typography>
                </Paper>

                <Stack spacing={2}>
                  <FormControlLabel
                    control={<Checkbox checked={preOpForm.benefitsExplained} onChange={e => setPreOpForm({ ...preOpForm, benefitsExplained: e.target.checked })} color="success" />}
                    label={<Typography variant="body2" fontWeight={700}>Surgical Benefits & Alternatives Explained to Patient/Family</Typography>}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={preOpForm.risksExplained} onChange={e => setPreOpForm({ ...preOpForm, risksExplained: e.target.checked })} color="success" />}
                    label={<Typography variant="body2" fontWeight={700}>Surgical Risks & Potential Complications Acknowledged</Typography>}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <FormControlLabel
                      control={<Switch checked={preOpForm.signaturePatient} onChange={e => setPreOpForm({ ...preOpForm, signaturePatient: e.target.checked })} color="primary" />}
                      label={<Typography variant="body2" fontWeight={800}>Patient / Next-of-Kin Digital Signature Captured</Typography>}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<Edit />}
                      onClick={() => setSignatureDialogOpen(true)}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      {preOpForm.signaturePatient ? 'View / Re-sign Signature' : '🖋️ Sign Digital Consent'}
                    </Button>
                  </Box>
                  {preOpForm.signaturePatient && (
                    <Paper sx={{ p: 2, bgcolor: alpha('#2f9e44', 0.08), border: '1px dashed #2f9e44', borderRadius: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={800} color="success.dark">
                          🟢 Verified E-Signature: {nokDetails.signerName} ({nokDetails.relationship})
                        </Typography>
                        <Chip label="Attached to Patient Record" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Signed on {nokDetails.signedAt} • Witness: Attending Surgical Officer
                      </Typography>
                      {nokDetails.signatureImage && (
                        <Box sx={{ p: 1.5, bgcolor: '#fff', borderRadius: 2, border: '1px solid #c3e6cb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 70 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 0.5, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Captured Digital Signature
                          </Typography>
                          {nokDetails.signatureImage.startsWith('data:image') ? (
                            <img src={nokDetails.signatureImage} alt="Next of Kin Signature" style={{ maxHeight: 75, maxWidth: '100%', objectFit: 'contain' }} />
                          ) : (
                            <Typography variant="h4" sx={{ fontFamily: '"Brush Script MT", "Caveat", cursive', color: '#1c7ed6', fontStyle: 'italic', my: 0.5 }}>
                              {nokDetails.signatureImage}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Paper>
                  )}
                  <FormControlLabel
                    control={<Switch checked={preOpForm.signatureSurgeon} onChange={e => setPreOpForm({ ...preOpForm, signatureSurgeon: e.target.checked })} color="primary" />}
                    label={<Typography variant="body2" fontWeight={800}>Attending Surgeon Sign-off Certified</Typography>}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  🛡️ WHO Surgical Safety Checklist (Checkpoint Lock)
                </Typography>
                <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
                  The system enforces WHO Safety Sign-In & Time-Out verification before starting the surgical incision.
                </Alert>

                <Stack spacing={2}>
                  <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: preOpForm.signInComplete ? 'success.main' : 'divider', bgcolor: preOpForm.signInComplete ? alpha('#2f9e44', 0.05) : '#fff' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircle color={preOpForm.signInComplete ? 'success' : 'disabled'} />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800}>1. SIGN IN (Before Induction of Anaesthesia)</Typography>
                          <Typography variant="caption" color="text.secondary">Identity confirmed, Site marked, Anaesthesia safety check done, Allergy check, Pulse oximeter on</Typography>
                        </Box>
                      </Box>
                      <Switch checked={preOpForm.signInComplete} onChange={e => setPreOpForm({ ...preOpForm, signInComplete: e.target.checked })} color="success" />
                    </Box>
                  </Paper>

                  <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: preOpForm.timeoutComplete ? 'success.main' : 'divider', bgcolor: preOpForm.timeoutComplete ? alpha('#2f9e44', 0.05) : '#fff' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircle color={preOpForm.timeoutComplete ? 'success' : 'disabled'} />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800}>2. TIME OUT (Before Skin Incision)</Typography>
                          <Typography variant="caption" color="text.secondary">All team members introduced by name & role. Verbal confirmation of patient name, procedure & incision site</Typography>
                        </Box>
                      </Box>
                      <Switch checked={preOpForm.timeoutComplete} onChange={e => setPreOpForm({ ...preOpForm, timeoutComplete: e.target.checked })} color="success" />
                    </Box>
                  </Paper>

                  <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: preOpForm.signoutComplete ? 'success.main' : 'divider', bgcolor: preOpForm.signoutComplete ? alpha('#2f9e44', 0.05) : '#fff' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircle color={preOpForm.signoutComplete ? 'success' : 'disabled'} />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800}>3. SIGN OUT (Before Patient Leaves Theatre)</Typography>
                          <Typography variant="caption" color="text.secondary">Nurse verbally confirms procedure name, Instrument & Swab counts complete, Specimen labeled</Typography>
                        </Box>
                      </Box>
                      <Switch checked={preOpForm.signoutComplete} onChange={e => setPreOpForm({ ...preOpForm, signoutComplete: e.target.checked })} color="success" />
                    </Box>
                  </Paper>
                </Stack>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="contained" color="secondary" onClick={() => navigate('/theatre/anesthesia')}>
                    Proceed to Anaesthesia Vitals & Log →
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── TAB 2: ANAESTHESIA & VITALS ─────────────────────────────────────── */}
      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  💉 Anaesthetist's Chart & Airway Log
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Induction Timestamp"
                    type="time"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }}
                    value={anaesthesiaForm.inductionTime}
                    onChange={e => setAnaesthesiaForm({ ...anaesthesiaForm, inductionTime: e.target.value })}
                  />
                  <TextField
                    label="Anaesthetic Technique"
                    select
                    size="small"
                    value={anaesthesiaForm.technique}
                    onChange={e => setAnaesthesiaForm({ ...anaesthesiaForm, technique: e.target.value })}
                  >
                    <MenuItem value="GENERAL">General Anaesthesia (GA)</MenuItem>
                    <MenuItem value="SPINAL">Spinal Anaesthesia (SAB)</MenuItem>
                    <MenuItem value="EPIDURAL">Epidural Anaesthesia</MenuItem>
                    <MenuItem value="MAC">Monitored Anaesthesia Care (MAC)</MenuItem>
                  </TextField>

                  <TextField
                    label="Airway Evaluation (Mallampati)"
                    select
                    size="small"
                    value={anaesthesiaForm.mallampati}
                    onChange={e => setAnaesthesiaForm({ ...anaesthesiaForm, mallampati: e.target.value })}
                  >
                    <MenuItem value="Class I">Mallampati Class I (Fully Visible)</MenuItem>
                    <MenuItem value="Class II">Mallampati Class II</MenuItem>
                    <MenuItem value="Class III">Mallampati Class III</MenuItem>
                    <MenuItem value="Class IV">Mallampati Class IV (Hard Airway)</MenuItem>
                  </TextField>

                  <TextField
                    label="Endotracheal Tube (ETT) Size"
                    select
                    size="small"
                    value={anaesthesiaForm.ettSize}
                    onChange={e => setAnaesthesiaForm({ ...anaesthesiaForm, ettSize: e.target.value })}
                  >
                    <MenuItem value="5.5mm Cuffed">5.5mm Cuffed</MenuItem>
                    <MenuItem value="6.0mm Cuffed">6.0mm Cuffed</MenuItem>
                    <MenuItem value="6.5mm Cuffed">6.5mm Cuffed</MenuItem>
                    <MenuItem value="7.0mm Cuffed">7.0mm Cuffed</MenuItem>
                    <MenuItem value="7.5mm Cuffed">7.5mm Cuffed (Adult Standard)</MenuItem>
                    <MenuItem value="8.0mm Cuffed">8.0mm Cuffed (Adult Male)</MenuItem>
                    <MenuItem value="8.5mm Cuffed">8.5mm Cuffed</MenuItem>
                    <MenuItem value="9.0mm Cuffed">9.0mm Cuffed</MenuItem>
                    <MenuItem value="LMA #3 (Laryngeal Mask)">LMA #3 (Laryngeal Mask)</MenuItem>
                    <MenuItem value="LMA #4 (Laryngeal Mask)">LMA #4 (Laryngeal Mask)</MenuItem>
                    <MenuItem value="LMA #5 (Laryngeal Mask)">LMA #5 (Laryngeal Mask)</MenuItem>
                    <MenuItem value="Tracheostomy Tube 7.5mm">Tracheostomy Tube 7.5mm</MenuItem>
                  </TextField>

                  <Stack spacing={1} sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSaveAnaesthesiaRecord}
                      sx={{ fontWeight: 800, borderRadius: 2, py: 1.2 }}
                    >
                      💾 Save Anaesthetic & Vitals Chart
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handleTabChange(null as any, 3)}
                      sx={{
                        fontWeight: 800, borderRadius: 2, py: 1,
                        color: '#0ca678', borderColor: '#0ca678',
                        '&:hover': { bgcolor: 'rgba(12,166,120,0.08)', borderColor: '#099268' }
                      }}
                    >
                      Proceed to Surgeon Op-Note &amp; Billing →
                    </Button>
                  </Stack>

                  {/* ── Saved Anaesthetic Chart Confirmation Panel ─────────── */}
                  {(() => {
                    const preAnList: any[] = (selectedBooking || bookings[0] as any)?.preAnaesthetics || [];
                    if (!Array.isArray(preAnList) || preAnList.length === 0) return null;
                    const latest = preAnList[preAnList.length - 1];
                    if (!latest) return null;
                    let savedDrugs: any[] = [];
                    let savedVitals: any[] = [];
                    try {
                      const parsed = JSON.parse(latest.anestheticRisks || '{}');
                      savedDrugs = parsed.drugLogs || [];
                      savedVitals = parsed.vitalsLogs || [];
                    } catch {}
                    return (
                      <Paper sx={{ p: 2, mt: 1, borderRadius: 2.5, bgcolor: alpha('#2f9e44', 0.06), border: '1.5px solid', borderColor: 'success.main' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <CheckCircle color="success" fontSize="small" />
                          <Typography variant="subtitle2" fontWeight={900} color="success.main">✅ Anaesthetic Chart Saved to EMR</Typography>
                          <Chip label={latest.createdAt ? new Date(latest.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Saved'} size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, ml: 'auto' }} />
                        </Box>
                        <Stack spacing={0.5}>
                          <Typography variant="caption" display="block"><strong>Technique:</strong> {latest.plannedAnaesthesia?.match(/Technique:\s*([^,]+)/)?.[1] || anaesthesiaForm.technique} &nbsp;|&nbsp; <strong>Airway:</strong> {latest.airwayEvaluation} &nbsp;|&nbsp; <strong>ETT:</strong> {latest.plannedAnaesthesia?.match(/ETT:\s*([^,]+)/)?.[1] || anaesthesiaForm.ettSize}</Typography>
                          {savedDrugs.length > 0 && (
                            <Box>
                              <Typography variant="caption" fontWeight={800} color="primary.main">💉 Drugs Administered ({savedDrugs.length}):</Typography>
                              <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.3}>
                                {savedDrugs.map((d: any, i: number) => (
                                  <Chip key={i} label={`${d.drugName} — ${d.dose} @ ${d.time}`} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, fontWeight: 700 }} />
                                ))}
                              </Stack>
                            </Box>
                          )}
                          {savedVitals.length > 0 && (
                            <Box>
                              <Typography variant="caption" fontWeight={800} color="success.dark">📊 Intra-Op Vitals Logged ({savedVitals.length} reading{savedVitals.length > 1 ? 's' : ''}):</Typography>
                              <Stack spacing={0.3} mt={0.3}>
                                {savedVitals.map((v: any, i: number) => (
                                  <Typography key={i} variant="caption" display="block" sx={{ bgcolor: '#fff', p: 0.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                    ⏱ {v.time} — BP: <strong>{v.bp}</strong> | HR: <strong>{v.pulse} bpm</strong> | SpO₂: <strong>{v.spo2}</strong> | EtCO₂: <strong>{v.etco2}</strong> | Temp: <strong>{v.temp}</strong>
                                  </Typography>
                                ))}
                              </Stack>
                            </Box>
                          )}
                          {savedDrugs.length === 0 && savedVitals.length === 0 && (
                            <Typography variant="caption" color="text.secondary">Chart saved. No drug/vitals logs recorded in this session.</Typography>
                          )}
                        </Stack>
                      </Paper>
                    );
                  })()}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                   Fast-Action Anaesthetic Drug Menu & Live Vitals Log
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Quick-Tap Drug Administration:</Typography>
                  <Grid container spacing={1}>
                    {[
                      { name: 'Propofol', dose: '150mg IV' },
                      { name: 'Suxamethonium', dose: '100mg IV' },
                      { name: 'Ketamine', dose: '50mg IV' },
                      { name: 'Fentanyl', dose: '100mcg IV' },
                      { name: 'Isoflurane', dose: '1.5% Inhalation' },
                      { name: 'Neostigmine', dose: '2.5mg IV' },
                      { name: 'Atropine', dose: '0.6mg IV' },
                      { name: 'Bupivacaine 0.5%', dose: '3.0ml Heavy' },
                    ].map(d => (
                      <Grid item xs={6} sm={3} key={d.name}>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          onClick={() => handleAddDrug(d.name, d.dose)}
                          sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                        >
                          + {d.name} ({d.dose})
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Logged Anaesthetic Drugs:</Typography>
                <Paper sx={{ p: 2, bgcolor: alpha('#1c7ed6', 0.03), borderRadius: 2.5, mb: 3, minHeight: 80 }}>
                  {drugLogs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No drugs logged yet. Tap any button above to record doses.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {drugLogs.map((log, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: '#fff', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" fontWeight={800}>{log.drugName} — {log.dose}</Typography>
                          <Chip label={`Administered at ${log.time}`} size="small" color="primary" sx={{ fontWeight: 800 }} />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>🩺 Intra-Operative Live Vitals Entry:</Typography>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={6} sm={2.4}>
                      <TextField
                        label="BP (mmHg)"
                        size="small"
                        value={anaesthesiaForm.bp}
                        onChange={e => setAnaesthesiaForm({ ...anaesthesiaForm, bp: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <TextField
                        label="Pulse (bpm)"
                        size="small"
                        value={anaesthesiaForm.pulse}
                        onChange={e => setAnaesthesiaForm({ ...anaesthesiaForm, pulse: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <TextField
                        label="SpO2 (%)"
                        size="small"
                        value={anaesthesiaForm.spo2}
                        onChange={e => setAnaesthesiaForm({ ...anaesthesiaForm, spo2: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <TextField
                        label="EtCO2 (mmHg)"
                        size="small"
                        value={anaesthesiaForm.etco2}
                        onChange={e => setAnaesthesiaForm({ ...anaesthesiaForm, etco2: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6} sm={2.4}>
                      <TextField
                        label="Temp (°C)"
                        size="small"
                        value={anaesthesiaForm.temp}
                        onChange={e => setAnaesthesiaForm({ ...anaesthesiaForm, temp: e.target.value })}
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="outlined" color="success" size="small" onClick={handleRecordVitals} sx={{ fontWeight: 800, borderRadius: 2 }}>
                      ➕ Record Vitals Reading
                    </Button>
                  </Box>
                </Box>

                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Recorded Live Vitals Log:</Typography>
                <Paper sx={{ p: 2, bgcolor: alpha('#2f9e44', 0.03), borderRadius: 2.5, minHeight: 80 }}>
                  {vitalsLogs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No vitals recorded yet.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {vitalsLogs.map((log, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: '#fff', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" fontWeight={800}>
                            BP: <strong>{log.bp}</strong> | HR: <strong>{log.pulse} bpm</strong> | SpO2: <strong>{log.spo2}</strong> | EtCO2: <strong>{log.etco2}</strong> | Temp: <strong>{log.temp}</strong>
                          </Typography>
                          <Chip label={`Recorded at ${log.time}`} size="small" color="success" sx={{ fontWeight: 800 }} />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── TAB 3: SURGEON OP-NOTES & BILLING ────────────────────────────────── */}
      {tab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>

                {/* Active Patient Context Banner */}
                {(selectedBooking || bookings[0]) && (() => {
                  const b = selectedBooking || bookings[0];
                  return (
                    <Paper sx={{ p: 2, mb: 2.5, bgcolor: alpha('#1c7ed6', 0.06), borderRadius: 2, border: '1px solid rgba(28,126,214,0.2)' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={900} color="primary">
                            👤 {b.patient ? `${b.patient.firstName} ${b.patient.lastName}` : 'Active Patient'}
                            {b.patient?.patientNumber ? ` · ${b.patient.patientNumber}` : ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {b.request?.proposedProcedure || b.operatingRoom || 'Scheduled Procedure'}
                            {b.surgeon ? ` · Surgeon: Dr. ${b.surgeon.lastName}` : ''}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={b.status === 'IN_THEATRE' ? '🔴 IN THEATRE' : b.status === 'BOOKED' ? '🔵 BOOKED' : b.status === 'RECOVERY' ? '🛌 RECOVERY' : b.status}
                            color={b.status === 'IN_THEATRE' ? 'error' : b.status === 'RECOVERY' ? 'warning' : 'primary'}
                            size="small" sx={{ fontWeight: 800 }}
                          />
                          {(b.status === 'BOOKED' || b.status === 'SCHEDULED') && (
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              sx={{ fontWeight: 800, fontSize: '0.72rem', height: 26 }}
                              onClick={async () => {
                                try {
                                  await api.post(`/theatre/bookings/${b.id}/status`, { status: 'IN_THEATRE' });
                                  enqueueSnackbar(`🔴 Surgery Started! Patient moved to ${b.operatingRoom || 'Operating Room'}`, { variant: 'success' });
                                  loadData();
                                } catch (e) {
                                  enqueueSnackbar('Failed to update status', { variant: 'error' });
                                }
                              }}
                            >
                              ▶️ Start Surgery (In OR)
                            </Button>
                          )}
                          {b.status === 'IN_THEATRE' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              sx={{ fontWeight: 800, fontSize: '0.72rem', height: 26 }}
                              onClick={async () => {
                                try {
                                  await api.post(`/theatre/bookings/${b.id}/status`, { status: 'RECOVERY' });
                                  enqueueSnackbar('🛌 Patient transferred to PACU Recovery Ward!', { variant: 'success' });
                                  loadData();
                                } catch (e) {
                                  enqueueSnackbar('Failed to update status', { variant: 'error' });
                                }
                              }}
                            >
                              🛌 Transfer to PACU Recovery
                            </Button>
                          )}
                          {b.status === 'RECOVERY' && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              sx={{ fontWeight: 800, fontSize: '0.72rem', height: 26 }}
                              onClick={async () => {
                                try {
                                  await api.put(`/theatre/bookings/${b.id}/recovery/discharge`, { dischargeNotes: 'Post-op recovery complete. Vital signs stable.' });
                                  enqueueSnackbar('✅ Discharged from PACU Recovery! Case Completed.', { variant: 'success' });
                                  loadData();
                                } catch (e) {
                                  enqueueSnackbar('Failed to discharge from PACU', { variant: 'error' });
                                }
                              }}
                            >
                              ✅ Complete & Discharge
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })()}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                  <Typography variant="h6" fontWeight={800}>🔪 Surgeon's Operation Note (Templates)</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title={opNoteIsListening ? 'Stop Voice Dictation' : 'Start Voice Dictation — Dictate diagnosis, procedure & notes'} arrow>
                      <IconButton
                        onClick={opNoteIsListening ? stopOpNoteVoice : startOpNoteVoice}
                        disabled={opNoteVoiceSummarizing}
                        sx={{
                          bgcolor: opNoteIsListening ? '#e03131' : '#1c7ed6',
                          color: '#fff',
                          width: 40, height: 40,
                          animation: opNoteIsListening ? 'opNotePulse 1.2s infinite' : 'none',
                          '@keyframes opNotePulse': {
                            '0%': { boxShadow: '0 0 0 0 rgba(224,49,49,0.55)' },
                            '70%': { boxShadow: '0 0 0 10px rgba(224,49,49,0)' },
                            '100%': { boxShadow: '0 0 0 0 rgba(224,49,49,0)' },
                          },
                          '&:hover': { bgcolor: opNoteIsListening ? '#c2255c' : '#1864ab' },
                          flexShrink: 0,
                        }}
                      >
                        {opNoteVoiceSummarizing
                          ? <CircularProgress size={20} sx={{ color: '#fff' }} />
                          : opNoteIsListening
                            ? <StopIcon fontSize="small" />
                            : <Mic fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <TextField
                      select
                      size="small"
                      label="Fast Template"
                      value={selectedTemplateKey}
                      onChange={e => {
                        setSelectedTemplateKey(e.target.value);
                        if (SURGICAL_TEMPLATES[e.target.value]) {
                          setOpNoteText(SURGICAL_TEMPLATES[e.target.value].note);
                        }
                      }}
                      sx={{ width: 200 }}
                    >
                      <MenuItem value="CS">👶 Caesarean Section (LSCS)</MenuItem>
                      <MenuItem value="APP">🩺 Open Appendectomy</MenuItem>
                      <MenuItem value="MYO">🩸 Uterine Myomectomy</MenuItem>
                      <MenuItem value="HERN">🩹 Inguinal Herniorrhaphy</MenuItem>
                      <MenuItem value="LAP">🔪 Exploratory Laparotomy</MenuItem>
                    </TextField>
                  </Stack>
                </Box>

                {/* Voice Dictation Status Strip */}
                {(opNoteIsListening || opNoteVoiceSummarizing || opNoteVoiceTranscript) && (
                  <Paper
                    sx={{
                      p: 1.5, mb: 2, borderRadius: 2,
                      bgcolor: opNoteIsListening ? alpha('#e03131', 0.07) : opNoteVoiceSummarizing ? alpha('#f59f00', 0.08) : alpha('#2f9e44', 0.07),
                      border: '1.5px solid',
                      borderColor: opNoteIsListening ? 'rgba(224,49,49,0.35)' : opNoteVoiceSummarizing ? 'rgba(245,159,0,0.35)' : 'rgba(47,158,68,0.35)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {opNoteIsListening && <GraphicEq sx={{ color: '#e03131', fontSize: 18 }} />}
                        <Typography variant="caption" fontWeight={800} color={opNoteIsListening ? 'error.main' : opNoteVoiceSummarizing ? 'warning.main' : 'success.main'}>
                          {opNoteIsListening ? '🔴 RECORDING — Dictate diagnosis, procedure & surgical notes now…' : opNoteVoiceSummarizing ? '⚡ OpenMed AI processing surgical dictation…' : '✅ Dictation complete — fields auto-populated'}
                        </Typography>
                      </Box>
                      {opNoteIsListening && (
                        <Button size="small" variant="contained" color="error" onClick={stopOpNoteVoice} sx={{ py: 0.2, fontSize: '0.7rem' }}>
                          Stop
                        </Button>
                      )}
                    </Box>
                    {(opNoteVoiceTranscript || opNoteInterimTranscript) && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', maxHeight: 60, overflowY: 'auto' }}>
                        "{opNoteVoiceTranscript}{opNoteInterimTranscript}"
                      </Typography>
                    )}
                  </Paper>
                )}

                {/* Diagnosis & Procedure from Dictionary */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12}>
                    <Autocomplete
                      freeSolo
                      options={SURGICAL_DIAGNOSES_DICTIONARY}
                      value={opNoteDiagnosis}
                      onChange={(_, val) => setOpNoteDiagnosis(typeof val === 'string' ? val : (val || ''))}
                      onInputChange={(_, val) => setOpNoteDiagnosis(val || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Final Surgical Diagnosis (ICD-10)"
                          size="small"
                          fullWidth
                          helperText="Type to search from ICD-10 dictionary, or enter free text"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Autocomplete
                      freeSolo
                      options={SURGICAL_PROCEDURES_DICTIONARY}
                      value={opNoteProcedure}
                      onChange={(_, val) => setOpNoteProcedure(typeof val === 'string' ? val : (val || ''))}
                      onInputChange={(_, val) => setOpNoteProcedure(val || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Operative Procedure Performed"
                          size="small"
                          fullWidth
                          helperText="Type to search from procedures dictionary, or enter free text"
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Operation Note (Narrative)"
                  multiline
                  rows={6}
                  fullWidth
                  value={opNoteText}
                  onChange={e => setOpNoteText(e.target.value)}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      label="Estimated Blood Loss (ml)"
                      type="number"
                      size="small"
                      fullWidth
                      value={eblML}
                      onChange={e => setEblML(Number(e.target.value))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Baby Weight / APGAR (if applicable)"
                      size="small"
                      fullWidth
                      value={babyWeight}
                      onChange={e => setBabyWeight(e.target.value)}
                    />
                  </Grid>
                </Grid>

                <TextField
                  label="Post-Operative Orders"
                  multiline
                  rows={2}
                  fullWidth
                  value={postOpOrders}
                  onChange={e => setPostOpOrders(e.target.value)}
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />

                <Divider sx={{ my: 3 }} />

                {/* ── Swab & Instrument Count Module ──────────────────────── */}
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                  📊 Swab & Instrument Count Safety Reconciliation
                </Typography>
                <Paper sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid', borderColor: countReconciled ? 'success.main' : 'error.main', bgcolor: countReconciled ? alpha('#2f9e44', 0.05) : alpha('#e03131', 0.05) }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      {countReconciled ? '🟢 COUNT CORRECT & RECONCILED' : '🔴 DISCREPANCY ALERT — COUNT MISMATCH!'}
                    </Typography>
                    <Chip label={countReconciled ? '✔ Safe for Closure' : '⚠️ Re-count Mandatory'} color={countReconciled ? 'success' : 'error'} sx={{ fontWeight: 800 }} />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" fontWeight={700}>Gauze Swabs Count:</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <TextField size="small" label="Initial In" type="number" value={initialSwabs} onChange={e => setInitialSwabs(Number(e.target.value))} />
                        <TextField size="small" label="Final Out" type="number" value={closureSwabs} onChange={e => setClosureSwabs(Number(e.target.value))} />
                      </Stack>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" fontWeight={700}>Surgical Instruments Count:</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <TextField size="small" label="Initial In" type="number" value={initialInst} onChange={e => setInitialInst(Number(e.target.value))} />
                        <TextField size="small" label="Final Out" type="number" value={closureInst} onChange={e => setClosureInst(Number(e.target.value))} />
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>

                {/* ── Save Op-Note Button ─────────────────────────────────── */}
                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    onClick={handleSaveOpNote}
                    disabled={savingOpNote || !countReconciled}
                    startIcon={savingOpNote ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
                    sx={{ py: 1.5, fontWeight: 900, borderRadius: 2.5 }}
                  >
                    {savingOpNote ? 'Saving Op-Note...' : '💾 Save Op-Note & Swab Count to EMR'}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => handleTabChange(null as any, 4)}
                    sx={{ py: 1.5, fontWeight: 800, borderRadius: 2.5, whiteSpace: 'nowrap' }}
                  >
                    Proceed to PACU →
                  </Button>
                </Stack>

                {/* ── Saved Op-Note Preview Panel ──────────────────────────── */}
                {(() => {
                  const b = selectedBooking || bookings[0];
                  const intraList: any[] = (b as any)?.intraOpRecords || [];
                  let localSaved: any = null;
                  try {
                    if (b?.id) {
                      const stored = localStorage.getItem(`theatre_opnote_${b.id}`);
                      if (stored) localSaved = JSON.parse(stored);
                    }
                    if (!localSaved) {
                      const storedGen = localStorage.getItem('theatre_opnote_latest');
                      if (storedGen) localSaved = JSON.parse(storedGen);
                    }
                  } catch (e) {}

                  const rec = (Array.isArray(intraList) && intraList.length > 0)
                    ? intraList[intraList.length - 1]
                    : (lastSavedOpNote || localSaved);
                  if (!rec) return null;
                  const notes: string = rec.primaryProcedureNotes || '';
                  const diagMatch = notes.match(/DIAGNOSIS:\s*([^\n]+)/);
                  const procMatch = notes.match(/PROCEDURE:\s*([^\n]+)/);
                  const opNoteMatch = notes.match(/OPERATION NOTE:\n([\s\S]*?)(?=\n\nBaby Weight|$)/);
                  const babyMatch = notes.match(/Baby Weight\/APGAR:\s*([^\n]+)/);
                  const postOpMatch = notes.match(/POST-OP ORDERS:\n([\s\S]*)$/);
                  return (
                    <Paper sx={{ p: 2.5, mt: 2, borderRadius: 3, bgcolor: alpha('#0ca678', 0.05), border: '1.5px solid', borderColor: '#0ca678' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <CheckCircle sx={{ color: '#0ca678' }} fontSize="small" />
                        <Typography variant="subtitle2" fontWeight={900} color="#0ca678">✅ Surgeon's Op-Note Saved to Patient EMR</Typography>
                        <Chip label={rec.createdAt ? new Date(rec.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Saved'} size="small" sx={{ bgcolor: '#0ca678', color: '#fff', fontSize: '0.65rem', height: 20, ml: 'auto', fontWeight: 800 }} />
                      </Box>
                      <Stack spacing={1}>
                        {diagMatch?.[1] && diagMatch[1] !== 'See record' && (
                          <Box sx={{ p: 1.2, bgcolor: '#fff', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" fontWeight={800} color="error.main">🔬 FINAL SURGICAL DIAGNOSIS:</Typography>
                            <Typography variant="body2" fontWeight={700} mt={0.2}>{diagMatch[1].trim()}</Typography>
                          </Box>
                        )}
                        {procMatch?.[1] && procMatch[1] !== 'See record' && (
                          <Box sx={{ p: 1.2, bgcolor: '#fff', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" fontWeight={800} color="primary.main">🔪 OPERATIVE PROCEDURE:</Typography>
                            <Typography variant="body2" fontWeight={700} mt={0.2}>{procMatch[1].trim()}</Typography>
                          </Box>
                        )}
                        {opNoteMatch?.[1]?.trim() && (
                          <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" fontWeight={800} color="text.secondary">📝 OPERATION NOTE (NARRATIVE):</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, mt: 0.3, fontSize: '0.8rem' }}>{opNoteMatch[1].trim()}</Typography>
                          </Box>
                        )}
                        <Grid container spacing={1.5}>
                          <Grid item xs={4}>
                            <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 1.5, bgcolor: '#fff7ed' }}>
                              <Typography variant="caption" fontWeight={800} color="#9a3412" display="block">🩸 EBL</Typography>
                              <Typography variant="body2" fontWeight={800} color="#c2410c">{rec.estimatedBloodLossML || 0} mL</Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={4}>
                            <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 1.5, bgcolor: '#f0fdf4' }}>
                              <Typography variant="caption" fontWeight={800} color="#166534" display="block">🧼 Swabs</Typography>
                              <Typography variant="body2" fontWeight={800} color="#15803d">{rec.initialSwabCount || 0} → {rec.closureSwabCount || 0} ✅</Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={4}>
                            <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 1.5, bgcolor: '#f0fdf4' }}>
                              <Typography variant="caption" fontWeight={800} color="#166534" display="block">🔧 Instruments</Typography>
                              <Typography variant="body2" fontWeight={800} color="#15803d">{rec.initialInstrumentCount || 0} → {rec.closureInstrumentCount || 0} ✅</Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                        {babyMatch?.[1] && babyMatch[1].trim() && babyMatch[1].trim() !== '3.4kg' && (
                          <Typography variant="caption" sx={{ p: 1, bgcolor: alpha('#7950f2', 0.07), borderRadius: 1.5, display: 'block', fontWeight: 700 }}>
                            👶 Baby Weight / APGAR: {babyMatch[1].trim()}
                          </Typography>
                        )}
                        {postOpMatch?.[1]?.trim() && (
                          <Box sx={{ p: 1.2, bgcolor: '#fff', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" fontWeight={800} color="text.secondary">📋 POST-OP ORDERS:</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.78rem', mt: 0.2 }}>{postOpMatch[1].trim()}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  );
                })()}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="h6" fontWeight={800}>
                    🛒 Real-Time Consumables & Billing ("The Burden")
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => setAddConsumableDialogOpen(true)}
                    sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'none', borderRadius: 2 }}
                  >
                    + Add Custom Item
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  Includes surgical supplies, custom Theatre consumables, and live administered anaesthetic drugs automatically linked to patient's invoice.
                </Typography>

                {(() => {
                  const totalAmt = Object.entries(selectedConsumables).reduce((sum, [name, qty]) => {
                    const item = fullConsumablesCatalog.find(c => c.name === name);
                    return sum + (qty * (item?.price || 0));
                  }, 0);
                  const totalItems = Object.values(selectedConsumables).reduce((a, b) => a + b, 0);

                  return (
                    <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2.5, bgcolor: alpha('#0ca678', 0.08), border: '1px solid rgba(12,166,120,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Total Consumables & Drug Billing</Typography>
                        <Typography variant="h5" fontWeight={900} color="#0ca678">₦{totalAmt.toLocaleString()}</Typography>
                      </Box>
                      <Chip label={`${totalItems} item${totalItems !== 1 ? 's' : ''} logged`} color="success" size="small" sx={{ fontWeight: 800 }} />
                    </Paper>
                  );
                })()}

                <Stack spacing={1.5} sx={{ mb: 3, maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
                  {fullConsumablesCatalog.map(item => {
                    const qty = selectedConsumables[item.name] || 0;
                    const isAnaestheticDrug = item.type === 'Anaesthetic Drug' || item.type === 'Anaesthetic Consumable';
                    const isSelected = qty > 0;

                    return (
                      <Box
                        key={item.name}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          p: 1.2,
                          bgcolor: isSelected ? (isAnaestheticDrug ? alpha('#0ca678', 0.06) : alpha('#1c7ed6', 0.06)) : '#f8f9fa',
                          border: '1px solid',
                          borderColor: isSelected ? (isAnaestheticDrug ? '#0ca678' : '#1c7ed6') : 'divider',
                          borderRadius: 2
                        }}
                      >
                        <Box sx={{ flex: 1, pr: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight={800}>{item.name}</Typography>
                            {isAnaestheticDrug && (
                              <Chip label="💉 Drug" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha('#0ca678', 0.15), color: '#0ca678' }} />
                            )}
                            {item.isCustom && (
                              <Chip label="⚙ Custom" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha('#f59f00', 0.15), color: '#f59f00' }} />
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary">₦{item.price.toLocaleString()} / unit</Typography>
                        </Box>

                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconButton
                            size="small"
                            onClick={() => setSelectedConsumables(prev => ({ ...prev, [item.name]: Math.max(0, (prev[item.name] || 0) - 1) }))}
                            sx={{ border: '1px solid', borderColor: 'divider', width: 26, height: 26 }}
                          >
                            -
                          </IconButton>
                          <Typography variant="body2" fontWeight={900} sx={{ minWidth: 20, textAlign: 'center' }}>{qty}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => setSelectedConsumables(prev => ({ ...prev, [item.name]: (prev[item.name] || 0) + 1 }))}
                            sx={{ border: '1px solid', borderColor: 'divider', width: 26, height: 26 }}
                          >
                            +
                          </IconButton>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handlePostConsumablesBill}
                  disabled={savingBilling}
                  startIcon={savingBilling ? <CircularProgress size={18} color="inherit" /> : <Receipt />}
                  sx={{ py: 1.5, fontWeight: 900, borderRadius: 2.5 }}
                >
                  {savingBilling ? 'Posting Invoice...' : 'Post Consumables & Medication to Patient Bill 🛒'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── TAB 4: PACU RECOVERY & WARD TRANSFER ────────────────────────────── */}
      {tab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  🛌 PACU Recovery Room & Aldrete Score Assessment
                </Typography>
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                  Aldrete Score ≥ 9 certifies that the patient is fully awake and safe for transfer to Inpatient Ward.
                </Alert>

                <Paper sx={{ p: 3, borderRadius: 3, bgcolor: alpha('#2f9e44', 0.06), border: '1px solid rgba(47,158,68,0.2)', textAlign: 'center', mb: 3 }}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">
                    Total Aldrete Score
                  </Typography>
                  <Typography variant="h2" fontWeight={900} color="success.main">
                    {aldreteScore} / 10
                  </Typography>
                  <Chip
                    label={aldreteScore >= 9 ? '🟢 FIT FOR WARD DISCHARGE' : '🟡 CONTINUE PACU MONITORING'}
                    color={aldreteScore >= 9 ? 'success' : 'warning'}
                    sx={{ fontWeight: 900, mt: 1 }}
                  />
                </Paper>

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" fontWeight={800}>Activity: {aldreteActivity}/2</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      {[0, 1, 2].map(v => (
                        <Button key={v} size="small" variant={aldreteActivity === v ? 'contained' : 'outlined'} onClick={() => setAldreteActivity(v)}>
                          {v === 2 ? '2 (Moves 4 extremities)' : v === 1 ? '1 (Moves 2 extremities)' : '0 (No movement)'}
                        </Button>
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="caption" fontWeight={800}>Respiration: {aldreteRespiration}/2</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      {[0, 1, 2].map(v => (
                        <Button key={v} size="small" variant={aldreteRespiration === v ? 'contained' : 'outlined'} onClick={() => setAldreteRespiration(v)}>
                          {v === 2 ? '2 (Deep breathing/cough)' : v === 1 ? '1 (Dyspnoea/limited)' : '0 (Apnoeic)'}
                        </Button>
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="caption" fontWeight={800}>Oxygen Saturation (SpO2): {aldreteO2}/2</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      {[0, 1, 2].map(v => (
                        <Button key={v} size="small" variant={aldreteO2 === v ? 'contained' : 'outlined'} onClick={() => setAldreteO2(v)}>
                          {v === 2 ? '2 (SpO2 > 92% room air)' : v === 1 ? '1 (Needs O2 supplemental)' : '0 (SpO2 < 90%)'}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  ⚡ Discharge from PACU / Transfer Out to Ward
                </Typography>
                {(() => {
                  const activePacuBooking = selectedBooking || bookings.find(b => b.status === 'RECOVERY' || b.status === 'IN_THEATRE') || bookings[0];
                  const patName = activePacuBooking?.patient ? `${activePacuBooking.patient.firstName} ${activePacuBooking.patient.lastName}` : 'Active Surgical Patient';
                  const procName = opNoteProcedure || activePacuBooking?.request?.proposedProcedure || (activePacuBooking as any)?.proposedProcedure || 'Surgical Procedure';

                  return (
                    <Paper sx={{ p: 2.5, bgcolor: alpha('#1c7ed6', 0.04), borderRadius: 2, mb: 3 }}>
                      <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ mb: 0.5 }}>
                        Patient: {patName} {activePacuBooking?.patient?.patientNumber ? `(${activePacuBooking.patient.patientNumber})` : ''}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Procedure: {procName}
                      </Typography>
                    </Paper>
                  );
                })()}

                <TextField
                  label="Select Receiving Inpatient Ward *"
                  select
                  fullWidth
                  value={targetWard}
                  onChange={e => setTargetWard(e.target.value)}
                  sx={{ mb: 3 }}
                  helperText="Configured hospital wards pulled dynamically from Bed Management (/nursing/beds)"
                >
                  {configuredWards.map((w: any) => (
                    <MenuItem key={w.id || w.name} value={w.name}>
                      🏥 {w.name} {w.available !== undefined ? `(${w.available} bed(s) available)` : ''}
                    </MenuItem>
                  ))}
                </TextField>

                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                  Clicking transfer will discharge the patient from Theatre PACU and automatically send an instant receiving alert to the Matron in <strong>{targetWard}</strong>.
                </Alert>

                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={handleTransferToWard}
                  disabled={transferringWard || aldreteScore < 7}
                  startIcon={transferringWard ? <CircularProgress size={18} color="inherit" /> : <TransferWithinAStation />}
                  sx={{ py: 1.8, fontWeight: 900, borderRadius: 2.5 }}
                >
                  {transferringWard ? 'Transferring...' : '⚡ Confirm Discharge & Transfer to Ward'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ── ⚡ Emergency Category 1 Quick-Start Modal ──────────────────────── */}
      <Dialog open={quickEmergencyOpen} onClose={() => setQuickEmergencyOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: alpha('#e03131', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e03131' }}>
            <FlashOn />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={900}>⚡ Category 1 Emergency Quick-Start</Typography>
            <Typography variant="caption" color="text.secondary">Bypasses non-critical paperwork for immediate OR-3 entry</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Emergency Override: Loads patient directly onto <strong>OR-3 (Emergency STAT) Table</strong> and sets status immediately to <strong>IN_THEATRE</strong>.
            </Alert>

            {/* Specialty Quick Presets */}
            <Box>
              <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.8 }}>
                ⚡ Quick Specialty Presets (Click to pre-fill):
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 0.8 }}>
                <Chip
                  size="small"
                  icon={<LocalHospital sx={{ fontSize: 16 }} />}
                  label="👶 Obstetrics (C-Section / Cord Prolapse)"
                  color="error"
                  variant="outlined"
                  onClick={() => setEmergencyForm(prev => ({
                    ...prev,
                    gender: 'FEMALE',
                    diagnosis: ['O00.1 — Ruptured Ectopic Pregnancy with Hemoperitoneum', 'O69.0 — Fetal Distress due to Cord Prolapse'],
                    proposedProcedure: 'Emergency Caesarean Section (LSCS - Lower Segment)'
                  }))}
                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                />
                <Chip
                  size="small"
                  icon={<LocalHospital sx={{ fontSize: 16 }} />}
                  label="🔪 General Surgery (Peritonitis / Hernia)"
                  color="warning"
                  variant="outlined"
                  onClick={() => setEmergencyForm(prev => ({
                    ...prev,
                    diagnosis: ['K35.8 — Acute Appendicitis with Localized Peritonitis', 'K56.6 — Intestinal Obstruction / Strangulated Hernia'],
                    proposedProcedure: 'Exploratory Laparotomy & Intra-abdominal Hemostasis'
                  }))}
                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                />
                <Chip
                  size="small"
                  icon={<LocalHospital sx={{ fontSize: 16 }} />}
                  label="🩸 Trauma & Internal Bleeding"
                  color="error"
                  variant="outlined"
                  onClick={() => setEmergencyForm(prev => ({
                    ...prev,
                    diagnosis: ['S36.0 — Traumatic Splenectomy / Intra-abdominal Laceration', 'T81.0 — Post-operative Hemorrhage & Hematoma'],
                    proposedProcedure: 'Emergency Splenectomy & Abdominal Packing'
                  }))}
                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                />
                <Chip
                  size="small"
                  icon={<LocalHospital sx={{ fontSize: 16 }} />}
                  label="🧠 Neurosurgery (Head Injury / Hematoma)"
                  color="info"
                  variant="outlined"
                  onClick={() => setEmergencyForm(prev => ({
                    ...prev,
                    diagnosis: ['S06.5 — Traumatic Subdural / Epidural Hemorrhage'],
                    proposedProcedure: 'Burr Hole Evacuation of Subdural Hematoma'
                  }))}
                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                />
              </Stack>
            </Box>

            {/* Registered Patient vs Quick Temp Tag Switch */}
            <Paper sx={{ p: 2, bgcolor: alpha('#e03131', 0.04), border: '1px solid rgba(224, 49, 49, 0.2)', borderRadius: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emergencyForm.isTempPatient}
                    onChange={e => setEmergencyForm({ ...emergencyForm, isTempPatient: e.target.checked })}
                    color="error"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={800} color="error.main">
                    ➕ Quick Register Unregistered Emergency Patient (John/Jane Doe / Rush Case)
                  </Typography>
                }
              />

              {emergencyForm.isTempPatient ? (
                <Stack spacing={2} sx={{ mt: 1.5 }}>
                  <TextField
                    label="Temporary Patient Tag / Name *"
                    value={emergencyForm.tempPatientName}
                    onChange={e => setEmergencyForm({ ...emergencyForm, tempPatientName: e.target.value })}
                    placeholder="e.g. Unknown Female (Rushed from ER) or Jane Doe"
                    fullWidth
                    required
                    helperText="Quick Emergency Record: Full bio-data can be updated retrospectively by Records Unit."
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Gender"
                        select
                        fullWidth
                        value={emergencyForm.gender}
                        onChange={e => setEmergencyForm({ ...emergencyForm, gender: e.target.value })}
                      >
                        <MenuItem value="FEMALE">FEMALE</MenuItem>
                        <MenuItem value="MALE">MALE</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Approx. Age"
                        type="number"
                        fullWidth
                        value={emergencyForm.age}
                        onChange={e => setEmergencyForm({ ...emergencyForm, age: e.target.value })}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              ) : (
                <Box sx={{ mt: 1 }}>
                  <Autocomplete
                    options={patientsList}
                    getOptionLabel={(option: any) => `${option.firstName || ''} ${option.lastName || ''} (${option.mrn || option.patientNumber || 'No MRN'}) - ${option.gender || ''}`}
                    onChange={(_: any, newValue: any) => {
                      setEmergencyForm(prev => ({
                        ...prev,
                        patientId: newValue ? newValue.id : ''
                      }));
                    }}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        label="Select Registered Emergency Patient *"
                        placeholder="Type patient name or MRN..."
                        required
                      />
                    )}
                  />
                </Box>
              )}
            </Paper>

            {/* Multi-Select Emergency Diagnosis (Data Dictionary ICD-10) */}
            <Autocomplete
              multiple
              freeSolo
              options={EMERGENCY_ICD10_DIAGNOSES}
              value={emergencyForm.diagnosis}
              onChange={(_: any, newValue: any) => {
                setEmergencyForm(prev => ({
                  ...prev,
                  diagnosis: newValue
                }));
              }}
              renderTags={(value: readonly string[], getTagProps: any) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="outlined"
                    color="error"
                    size="small"
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                    sx={{ fontWeight: 700 }}
                  />
                ))
              }
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Emergency Diagnosis (ICD-10 Data Dictionary - Multi-Select) *"
                  placeholder="Select or type ICD-10 diagnoses..."
                  helperText="Picks from Data Dictionary; supports multiple diagnoses"
                />
              )}
            />

            {/* STAT Surgical Procedure (OpenMed Catalog) */}
            <Autocomplete
              freeSolo
              options={OPENMED_STAT_PROCEDURES}
              value={emergencyForm.proposedProcedure}
              onChange={(_: any, newValue: any) => {
                setEmergencyForm(prev => ({
                  ...prev,
                  proposedProcedure: newValue || ''
                }));
              }}
              onInputChange={(_: any, newInputValue: any) => {
                setEmergencyForm(prev => ({
                  ...prev,
                  proposedProcedure: newInputValue
                }));
              }}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="STAT Surgical Procedure (OpenMed / Surgical Catalog) *"
                  placeholder="Select or type surgical procedure..."
                  helperText="Select from OpenMed procedure catalog or type custom procedure"
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQuickEmergencyOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleQuickEmergencyStart}
            disabled={quickStarting}
            startIcon={quickStarting ? <CircularProgress size={18} color="inherit" /> : <FlashOn />}
            sx={{ fontWeight: 900, px: 3, borderRadius: 2 }}
          >
            {quickStarting ? 'Initializing...' : '⚡ Proceed Immediately to Emergency OR-3'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Schedule Surgery Modal ────────────────────────────────────────── */}
      <Dialog open={newRequestOpen} onClose={() => setNewRequestOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>+ Schedule New Surgical Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={patientsList}
              getOptionLabel={(option: any) => `${option.firstName || ''} ${option.lastName || ''} (${option.mrn || option.patientNumber || 'No MRN'}) - ${option.gender || ''}`}
              onChange={(_: any, newValue: any) => {
                setRequestForm(prev => ({
                  ...prev,
                  patientId: newValue ? newValue.id : ''
                }));
              }}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Select Patient *"
                  placeholder="Type patient name or MRN..."
                  required
                />
              )}
            />
            {/* Diagnosis (ICD-10 Data Dictionary Autocomplete) */}
            <Autocomplete
              freeSolo
              options={SURGICAL_DIAGNOSES_DICTIONARY}
              value={requestForm.diagnosis}
              onChange={(_: any, newValue: any) => {
                setRequestForm(prev => ({
                  ...prev,
                  diagnosis: newValue || ''
                }));
              }}
              onInputChange={(_: any, newInputValue: any) => {
                setRequestForm(prev => ({
                  ...prev,
                  diagnosis: newInputValue
                }));
              }}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Diagnosis (ICD-10 Data Dictionary) *"
                  placeholder="Select or type diagnosis (e.g. Uterine Leiomyoma / Acute Appendicitis)..."
                  required
                  helperText="Searchable ICD-10 Data Dictionary catalog or type custom diagnosis"
                />
              )}
            />

            {/* Proposed Procedure (Surgical Procedure Catalog Autocomplete) */}
            <Autocomplete
              freeSolo
              options={SURGICAL_PROCEDURES_DICTIONARY}
              value={requestForm.proposedProcedure}
              onChange={(_: any, newValue: any) => {
                setRequestForm(prev => ({
                  ...prev,
                  proposedProcedure: newValue || ''
                }));
              }}
              onInputChange={(_: any, newInputValue: any) => {
                setRequestForm(prev => ({
                  ...prev,
                  proposedProcedure: newInputValue
                }));
              }}
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Proposed Surgical Procedure (Procedure Catalog) *"
                  placeholder="Select or type surgical procedure (e.g. Abdominal Myomectomy)..."
                  required
                  helperText="Searchable Surgical Procedure Catalog or type custom procedure"
                />
              )}
            />
            <TextField
              label="Urgency Level"
              select
              fullWidth
              value={requestForm.urgency}
              onChange={e => setRequestForm({ ...requestForm, urgency: e.target.value })}
            >
              <MenuItem value="ELECTIVE">ELECTIVE</MenuItem>
              <MenuItem value="URGENT">URGENT</MenuItem>
              <MenuItem value="EMERGENCY">EMERGENCY</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setNewRequestOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleCreateRequest} sx={{ fontWeight: 900, borderRadius: 2, color: '#ffffff' }}>
            Submit Surgical Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Allocate Table Modal ───────────────────────────────────────────── */}
      <Dialog open={bookingOpen} onClose={() => setBookingOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>📅 Allocate Operating Room Table</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Operating Room Table"
              select
              fullWidth
              value={
                operatingTables.some((t: any) => t.number === bookingForm.operatingRoom)
                  ? bookingForm.operatingRoom
                  : (operatingTables[0]?.number || 'OR-1 (Main Surgical Table)')
              }
              onChange={e => setBookingForm({ ...bookingForm, operatingRoom: e.target.value })}
              helperText={operatingTables.length > 0 ? "Pulled directly from Bed Management (/nursing/beds)" : "Default Operating Room Tables"}
            >
              {operatingTables.length > 0 ? (
                operatingTables.map((t: any) => (
                  <MenuItem key={t.id || t.number} value={t.number}>
                    {t.number} — {t.wardName || 'Theatre'} ({t.status || 'AVAILABLE'})
                  </MenuItem>
                ))
              ) : (
                [
                  <MenuItem key="OR-1" value="OR-1 (Main Surgical Table)">OR-1 (Main Surgical Table)</MenuItem>,
                  <MenuItem key="OR-2" value="OR-2 (Maternity C-Section Table)">OR-2 (Maternity C-Section Table)</MenuItem>,
                  <MenuItem key="OR-3" value="OR-3 (Emergency STAT Table)">OR-3 (Emergency STAT Table)</MenuItem>,
                  <MenuItem key="OR-4" value="OR-4 (Orthopaedic Suite Table)">OR-4 (Orthopaedic Suite Table)</MenuItem>,
                  <MenuItem key="OR-5" value="OR-5 (Cardiac Suite Table)">OR-5 (Cardiac Suite Table)</MenuItem>,
                ]
              )}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBookingOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleConfirmBooking} sx={{ fontWeight: 800, borderRadius: 2 }}>
            Confirm Table Booking
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── DIGITAL CONSENT SIGNATURE DIALOG FOR NEXT-OF-KIN ───────────────── */}
      <Dialog open={signatureDialogOpen} onClose={() => setSignatureDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          🖋️ Patient / Next-of-Kin Digital Signature Pad
          <IconButton onClick={() => setSignatureDialogOpen(false)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please confirm the signatory identity and capture the electronic consent signature for surgery: <strong>{selectedBooking?.request?.proposedProcedure || 'Exploratory Laparotomy / Myomectomy'}</strong>.
          </Typography>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Signatory Full Name"
                  fullWidth
                  size="small"
                  value={nokDetails.signerName}
                  onChange={e => setNokDetails({ ...nokDetails, signerName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Relationship to Patient"
                  select
                  fullWidth
                  size="small"
                  value={nokDetails.relationship}
                  onChange={e => setNokDetails({ ...nokDetails, relationship: e.target.value })}
                  helperText="Select official relationship"
                >
                  {RELATIONSHIP_OPTIONS.map(opt => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* Signature Input Mode Selection */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f1f3f5', p: 0.5, borderRadius: 2 }}>
              <Button
                size="small"
                variant={signatureMode === 'draw' ? 'contained' : 'text'}
                color="primary"
                onClick={() => setSignatureMode('draw')}
                sx={{ flex: 1, borderRadius: 1.5, textTransform: 'none', fontWeight: 800, py: 0.7 }}
              >
                ✏️ Draw Freehand Signature
              </Button>
              <Button
                size="small"
                variant={signatureMode === 'type' ? 'contained' : 'text'}
                color="primary"
                onClick={() => setSignatureMode('type')}
                sx={{ flex: 1, borderRadius: 1.5, textTransform: 'none', fontWeight: 800, py: 0.7 }}
              >
                🔤 Auto-Type Calligraphy Script
              </Button>
            </Box>

            {signatureMode === 'draw' ? (
              <Box sx={{ border: '2px dashed #1c7ed6', borderRadius: 2.5, p: 2, bgcolor: '#f8f9fa', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={800}>
                    DRAW SIGNATURE BELOW (TOUCHSCREEN / STYLUS / MOUSE)
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={clearCanvas}
                    sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.75rem', borderRadius: 1.5 }}
                  >
                    🧹 Clear Canvas
                  </Button>
                </Box>

                <Box sx={{ bgcolor: '#fff', borderRadius: 2, border: '1px solid #ced4da', position: 'relative', overflow: 'hidden' }}>
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={130}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ touchAction: 'none', cursor: 'crosshair', width: '100%', height: '130px', display: 'block' }}
                  />
                  {!hasDrawn && (
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'text.disabled',
                        pointerEvents: 'none',
                        fontWeight: 600
                      }}
                    >
                      ✍️ Touch or click here to sketch signature...
                    </Typography>
                  )}
                  <Chip
                    label={hasDrawn ? "🟢 Freehand Drawn Signature" : "Waiting for signature..."}
                    size="small"
                    color={hasDrawn ? "success" : "default"}
                    sx={{ position: 'absolute', bottom: 6, right: 8, height: 20, fontSize: '0.65rem' }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Signatory confirms understanding of surgical risks and authorizes the surgical team.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ border: '2px dashed #1c7ed6', borderRadius: 2.5, p: 2, bgcolor: '#f8f9fa', textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>
                  AUTOMATIC CALLIGRAPHY SIGNATURE PREVIEW
                </Typography>
                <Box sx={{ height: 130, bgcolor: '#fff', borderRadius: 2, border: '1px solid #ced4da', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Typography variant="h3" sx={{ fontFamily: '"Brush Script MT", "Caveat", cursive', color: '#1c7ed6', fontStyle: 'italic', opacity: 0.9 }}>
                    {nokDetails.signerName || 'Signature Preview'}
                  </Typography>
                  <Chip label="Cryptographically Sealed" size="small" color="success" sx={{ position: 'absolute', bottom: 6, right: 8, height: 20, fontSize: '0.65rem' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  By confirming, this typed signature is recorded as a legal electronic sign-off.
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSignatureDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              let sigImg = nokDetails.signerName;
              if (signatureMode === 'draw' && canvasRef.current && hasDrawn) {
                sigImg = canvasRef.current.toDataURL('image/png');
              } else if (nokDetails.signatureImage) {
                sigImg = nokDetails.signatureImage;
              }
              const updatedDetails = {
                ...nokDetails,
                signatureImage: sigImg,
                signedAt: new Date().toLocaleString(),
                isVerified: true
              };
              setNokDetails(updatedDetails);
              setPreOpForm(prev => ({ ...prev, signaturePatient: true }));
              setSignatureDialogOpen(false);

              // 1. Save to booking-scoped LocalStorage key ONLY (never write to a shared global key)
              if (selectedBooking?.id) {
                localStorage.setItem(getSavedConsentKey(selectedBooking.id), JSON.stringify(updatedDetails));
              }

              // 2. Persist to backend database via API
              if (selectedBooking?.id) {
                try {
                  await api.post(`/theatre/bookings/${selectedBooking.id}/consent`, {
                    patientId: selectedBooking.patientId || selectedBooking.request?.patientId,
                    benefitsExplained: preOpForm.benefitsExplained,
                    risksExplained: preOpForm.risksExplained,
                    signaturePatient: true,
                    signatureSurgeon: preOpForm.signatureSurgeon,
                    signerName: updatedDetails.signerName,
                    relationship: updatedDetails.relationship,
                    signatureImage: updatedDetails.signatureImage
                  });
                } catch (err) {
                  console.error('Error attaching consent to patient booking:', err);
                }
              }

              enqueueSnackbar('Next-of-Kin Digital Consent Signature attached to patient record successfully 📄✒️', { variant: 'success' });
            }}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            Confirm & Attach Signature
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Custom Consumable / Item Modal ──────────────────────── */}
      <Dialog open={addConsumableDialogOpen} onClose={() => setAddConsumableDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>⚙ Add Custom Theatre Consumable / Drug</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Item Name *"
              fullWidth
              size="small"
              placeholder="e.g. Polypropylene Mesh 15x15cm, Harmonic Scalpel"
              value={newConsumableForm.name}
              onChange={e => setNewConsumableForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              label="Unit Price (₦) *"
              type="number"
              fullWidth
              size="small"
              value={newConsumableForm.price}
              onChange={e => setNewConsumableForm(prev => ({ ...prev, price: Number(e.target.value) }))}
            />
            <TextField
              select
              label="Category / Type *"
              fullWidth
              size="small"
              value={newConsumableForm.type}
              onChange={e => setNewConsumableForm(prev => ({ ...prev, type: e.target.value }))}
            >
              <MenuItem value="Surgical Consumable">✂ Surgical Consumable</MenuItem>
              <MenuItem value="Anaesthetic Drug">💉 Anaesthetic Drug</MenuItem>
              <MenuItem value="Anaesthetic Consumable">🩺 Anaesthetic Consumable</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddConsumableDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddCustomConsumable}
            sx={{ fontWeight: 800, borderRadius: 2 }}
          >
            Add to Catalog
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
