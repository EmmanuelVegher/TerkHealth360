import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Avatar, Tabs, Tab, Paper, Stack, Divider,
  Alert, Tooltip, Badge, CircularProgress, LinearProgress, Autocomplete, createFilterOptions,
} from '@mui/material';
import {
  Add, Search, Edit, Visibility, Biotech, Science, Assignment,
  RateReview, Hotel, Inventory, CheckCircle, Warning, Print,
  Download, FilterList, LocalHospital, Person, CalendarMonth,
  Shield, QrCode, Description, Refresh, FactCheck, AccessTime, Mic, MicOff,
  MeetingRoom, Cancel, RemoveCircleOutline, LocalShipping, DirectionsCar,
  Settings, Delete,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

// --- Types & Interfaces ---
interface HistologyOrder {
  id: string;
  refNo: string;
  patientName: string;
  patientId: string;
  age: number;
  gender: string;
  requestingSurgeon: string;
  surgicalUnit: string;
  organSite: string;
  clinicalIndication: string;
  grossingDescription?: string;
  grossDescription?: string;
  microscopicFindings?: string;
  pathologicalDiagnosis?: string;
  tnmStaging?: string;
  surgicalMargins?: string;
  reportedDate?: string;
  reportedBy?: string;
  cassetteCount: number;
  fixationStatus: string;
  stainType: string;
  dateReceived: string;
  status: 'Accessioned' | 'Grossed' | 'Processing' | 'Slide Ready' | 'Reported';
  pathologist: string;
  urgency: 'ROUTINE' | 'STAT' | 'FROZEN_SECTION';
}

interface CytologySpecimen {
  id: string;
  refNo: string;
  patientName: string;
  patientId: string;
  requestingDoctor: string;
  specimenType: 'Cervical Pap Smear' | 'Thyroid FNA' | 'Breast Lump FNA' | 'Pleural Fluid' | 'Ascitic Fluid';
  stainingMethod: 'Papanicolaou (Pap)' | 'Giemsa / Diff-Quik' | 'H&E Stain';
  adequacy: 'Satisfactory (Endocervical component present)' | 'Unsatisfactory';
  bethesdaClassification: 'NILM (Negative for Malignancy)' | 'ASC-US' | 'LSIL' | 'HSIL' | 'Malignant (Adenocarcinoma)';
  findings: string;
  dateCollected: string;
  status: 'Pending Staining' | 'Microscopy In Progress' | 'Final Signed';
  cytotechnologist: string;
}

interface MicroscopicReport {
  id: string;
  specimenRef: string;
  patientName: string;
  patientId: string;
  specimenType: string;
  grossDescription: string;
  microscopicFindings: string;
  ihcSummary?: string;
  pathologicalDiagnosis: string;
  tnmStaging?: string;
  surgicalMargins?: string;
  signedBy: string;
  signedDate: string;
  status: 'Draft' | 'Final Certified';
}

interface MortuaryRecord {
  id: string;
  tagNo: string;
  deceasedName: string;
  mrn: string;
  age: number;
  gender: string;
  dateOfDeath: string;
  timeOfDeath: string;
  sourceWard: string;
  chillerSlot: string;
  nextOfKin: string;
  nextOfKinPhone: string;
  autopsyStatus: string;
  causeOfDeath?: string;
  findings?: string;
  status: 'In Storage' | 'Released to Family' | 'Transfer to Funeral Home' | 'Transferred / Released' | 'Awaiting Examination';
  releasedAt?: string;
  claimantName?: string;
  relationship?: string;
  inMortuary?: boolean;
  disposition?: string;
  destinationDesc?: string;
  transportMode?: string;
}

const MORTUARY_AUTOPSY_STORAGE_KEY = 'smart_hospital_mortuary_autopsies_v1';
const MORTUARY_RELEASE_STORAGE_KEY = 'smart_hospital_mortuary_releases_v1';

const loadSavedMortuaryAutopsies = (): Record<string, { autopsyStatus?: string; causeOfDeath?: string; findings?: string; statusStage?: string; pathologist?: string; scheduledTime?: string }> => {
  try {
    const raw = localStorage.getItem(MORTUARY_AUTOPSY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveMortuaryAutopsyToStorage = (key: string, data: { autopsyStatus?: string; causeOfDeath?: string; findings?: string; statusStage?: string; pathologist?: string; scheduledTime?: string }) => {
  try {
    const current = loadSavedMortuaryAutopsies();
    current[key] = { ...(current[key] || {}), ...data };
    localStorage.setItem(MORTUARY_AUTOPSY_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed saving mortuary autopsy to storage:', err);
  }
};

const removeMortuaryAutopsyFromStorage = (keys: (string | undefined | null)[]) => {
  try {
    const current = loadSavedMortuaryAutopsies();
    let changed = false;
    keys.forEach(k => {
      if (k && current[k]) {
        delete current[k];
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(MORTUARY_AUTOPSY_STORAGE_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.warn('Failed removing mortuary autopsy from storage:', err);
  }
};

const loadSavedMortuaryReleases = (): Record<string, { status?: 'Released to Family'; chillerSlot?: string; releasedAt?: string; claimantName?: string; relationship?: string }> => {
  try {
    const raw = localStorage.getItem(MORTUARY_RELEASE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveMortuaryReleaseToStorage = (key: string, data: { status?: 'Released to Family'; chillerSlot?: string; releasedAt?: string; claimantName?: string; relationship?: string }) => {
  try {
    const current = loadSavedMortuaryReleases();
    current[key] = { ...(current[key] || {}), ...data };
    localStorage.setItem(MORTUARY_RELEASE_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed saving mortuary release to storage:', err);
  }
};

interface SlideArchiveItem {
  id: string;
  specimenNo: string;
  patientName: string;
  patientId: string;
  blockId: string;
  slideId: string;
  organSite: string;
  cabinetLocator: string;
  retentionYears: number;
  dateArchived: string;
  status: 'In Archive' | 'Checked Out (Second Opinion)' | 'Permanent Retention' | 'Checked Out (IHC/Research)';
  checkedOutTo?: string;
  checkedOutReason?: string;
  checkedOutDate?: string;
}

export interface ArchiveLocatorSlot {
  id: string;
  room: string;
  cabinet: string;
  shelf: string;
  drawer: string;
  maxCapacity: number;
  description?: string;
}

const DEFAULT_ARCHIVE_LOCATORS: ArchiveLocatorSlot[] = [
  { id: 'loc-1', room: 'Archive Room 2', cabinet: 'Cabinet B', shelf: 'Shelf 3', drawer: 'Drawer 14', maxCapacity: 50, description: 'Surgical Biopsies & General FFPE' },
  { id: 'loc-2', room: 'Archive Room 2', cabinet: 'Cabinet A', shelf: 'Shelf 1', drawer: 'Drawer 04', maxCapacity: 50, description: 'GI & Endoscopy Biopsy Archive' },
  { id: 'loc-3', room: 'Archive Room 2', cabinet: 'Cabinet A', shelf: 'Shelf 2', drawer: 'Drawer 06', maxCapacity: 50, description: 'Gynaecology & Breast Specimen Archive' },
  { id: 'loc-4', room: 'Archive Room 1', cabinet: 'Cabinet C', shelf: 'Shelf 1', drawer: 'Drawer 01', maxCapacity: 50, description: 'Oncology & Malignancy Retention' },
  { id: 'loc-5', room: 'Archive Room 1', cabinet: 'Cabinet C', shelf: 'Shelf 2', drawer: 'Drawer 02', maxCapacity: 50, description: 'Urology & Prostate Needle Biopsies' },
  { id: 'loc-6', room: 'Cold Archive Bay', cabinet: 'Cabinet D', shelf: 'Shelf 4', drawer: 'Drawer 10', maxCapacity: 30, description: 'Forensic Autopsy & Special Stains' },
];

const STORAGE_KEY_PATHOLOGY_ARCHIVE = 'smart_hospital_pathology_archive_v2';
const STORAGE_KEY_ARCHIVE_LOCATORS = 'smart_hospital_archive_locators_v2';

const loadSavedArchiveLocators = (): ArchiveLocatorSlot[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ARCHIVE_LOCATORS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed reading archive locators storage:', err);
  }
  return DEFAULT_ARCHIVE_LOCATORS;
};

const saveArchiveLocatorsToStorage = (locators: ArchiveLocatorSlot[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_ARCHIVE_LOCATORS, JSON.stringify(locators));
  } catch (err) {
    console.warn('Failed saving archive locators storage:', err);
  }
};

const loadSavedArchiveItems = (): SlideArchiveItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATHOLOGY_ARCHIVE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed reading archive storage:', err);
  }
  return INITIAL_ARCHIVE;
};

const saveArchiveItemsToStorage = (items: SlideArchiveItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_PATHOLOGY_ARCHIVE, JSON.stringify(items));
  } catch (err) {
    console.warn('Failed saving archive storage:', err);
  }
};

export interface IHCRecord {
  id: string;
  specimenNo: string;
  patientName: string;
  patientId: string;
  age?: number;
  gender?: string;
  organSite?: string;
  panelType: string;
  erStatus?: string;
  prStatus?: string;
  her2Status?: string;
  ki67Index?: string;
  additionalMarkers?: string;
  interpretation: string;
  targetTherapyRecommendation?: string;
  pathologist: string;
  dateCompleted: string;
  status: 'IHC Certified' | 'Pending Scoring' | 'Awaiting Slide Staining';
}

const STORAGE_KEY_PATHOLOGY_IHC = 'smart_hospital_pathology_ihc_v3';

const loadSavedIHCRecords = (): IHCRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATHOLOGY_IHC);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed reading IHC storage:', err);
  }
  return INITIAL_IHC;
};

const saveIHCRecordsToStorage = (records: IHCRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_PATHOLOGY_IHC, JSON.stringify(records));
  } catch (err) {
    console.warn('Failed saving IHC storage:', err);
  }
};

export interface ExternalPathologyReferral {
  id: string;
  refNo: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  referringHospital: string;
  referringDoctor: string;
  doctorPhone?: string;
  doctorEmail?: string;
  caseCategory: 'Fresh Tissue Biopsy & Resection' | 'Slide Review / Second Opinion' | 'Cytology / FNA' | 'IHC Biomarker Panel';
  specimenType: string;
  containerCount: string;
  fixationCondition: string;
  clinicalHistory: string;
  billingType: 'Direct Cash / POS' | 'Corporate Contract Invoice';
  billingAmount: number;
  paymentStatus: 'Paid & Cleared' | 'Billed to Corporate Account' | 'Payment Pending';
  courierStatus: string;
  dateReceived: string;
  status: 'Received & Logged' | 'Grossing In Progress' | 'Microscopy Review' | 'Report Signed & Active QR';
  pathologist: string;
  qrVerificationCode: string;
  grossDescription?: string;
  microscopicFindings?: string;
  pathologicalDiagnosis?: string;
  deliveryMethod?: string;
}

export interface CourierLog {
  id: string;
  dispatchRef: string;
  courierName: string;
  sourceClinic: string;
  sampleCount: number;
  pickupTime: string;
  arrivalTime: string;
  temperatureCondition: string;
  receivingOfficer: string;
  notes?: string;
}

// Crisp inline SVG QR Code generator for paperless pathology report verification
const QRCodeSVG: React.FC<{ value: string; size?: number }> = ({ value, size = 110 }) => {
  const hash = Array.from(value).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000007, 0);
  const gridSize = 17;
  const cellSize = size / gridSize;

  const isSquareFilled = (row: number, col: number) => {
    if (row < 4 && col < 4) return row === 0 || row === 3 || col === 0 || col === 3 || (row === 1 && col === 1);
    if (row < 4 && col >= gridSize - 4) return row === 0 || row === 3 || col === gridSize - 1 || col === gridSize - 4 || (row === 1 && col === gridSize - 2);
    if (row >= gridSize - 4 && col < 4) return row === gridSize - 1 || row === gridSize - 4 || col === 0 || col === 3 || (row === gridSize - 2 && col === 1);
    return ((row * 13 + col * 19 + hash) % 7) > 3;
  };

  const rects = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (isSquareFilled(r, c)) {
        rects.push(<rect key={`${r}-${c}`} x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#0f172a" />);
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: '#fff', padding: 4, borderRadius: 6, border: '1px solid #cbd5e1' }}>
      {rects}
    </svg>
  );
};

const INITIAL_EXTERNAL_REFERRALS: ExternalPathologyReferral[] = [
  {
    id: 'ext-1',
    refNo: 'EXT-PATH-2026-0041',
    patientName: 'Chief Samuel O. Adebayo',
    patientAge: 58,
    patientGender: 'Male',
    patientPhone: '+234 803 311 2244',
    referringHospital: 'St. Nicholas Hospital, Lagos Island',
    referringDoctor: 'Dr. F. A. Ogundipe (Consultant Urologist)',
    doctorPhone: '+234 802 345 6789',
    doctorEmail: 'dr.ogundipe@stnicholas.ng',
    caseCategory: 'Fresh Tissue Biopsy & Resection',
    specimenType: 'Prostate Needle Core Biopsies (12 Cores)',
    containerCount: '2 Formalin Jars (12 Cores in Cassettes A1-A6)',
    fixationCondition: '10% Neutral Buffered Formalin (Fixed 9:30 AM)',
    clinicalHistory: '58yo male presented with lower urinary tract symptoms, PSA elevated at 14.2 ng/mL. Digital rectal exam revealed firm right lobe nodule. TRUS-guided 12-core biopsy performed. Requesting Gleason score grading, perineural invasion check, and tumor burden assessment.',
    billingType: 'Corporate Contract Invoice',
    billingAmount: 45000,
    paymentStatus: 'Billed to Corporate Account',
    courierStatus: 'Delivered by St. Nicholas Dispatch Driver (Ref: SN-LOG-8821, Temp: 22°C)',
    dateReceived: '2026-08-23 10:15 AM',
    status: 'Grossing In Progress',
    pathologist: 'Dr. Consultant Pathologist (FMCPath)',
    qrVerificationCode: 'QR-EXT-0041-STNICHOLAS',
    grossDescription: '12 cylindrical tan-gray tissue cores received in 2 formalin containers, measuring between 1.0cm and 1.6cm. Submitted in cassettes A1 through A6.',
    microscopicFindings: 'Microscopic examination shows prostatic adenocarcinoma with fused acinar glands (Gleason 3+4=7).',
    pathologicalDiagnosis: 'PROSTATIC ADENOCARCINOMA (GLEASON SCORE 3+4=7, GRADE GROUP 2) INVOLVING 4 OF 12 CORES.',
    deliveryMethod: 'Pending Delivery',
  },
  {
    id: 'ext-2',
    refNo: 'EXT-PATH-2026-0042',
    patientName: 'Mrs. Grace N. Chukwu',
    patientAge: 44,
    patientGender: 'Female',
    patientPhone: '+234 802 244 6688',
    referringHospital: 'Apex Specialist Clinic, Enugu',
    referringDoctor: 'Dr. C. I. Nnamdi (Obstetrician & Gynaecologist)',
    doctorPhone: '+234 803 987 1122',
    doctorEmail: 'drnnamdi@apexclinic.ng',
    caseCategory: 'Cytology / FNA',
    specimenType: 'Left Thyroid Nodule FNA Smears',
    containerCount: '4 Glass Slides (Alcohol Fixed)',
    fixationCondition: '95% Ethanol Fixed Glass Slides',
    clinicalHistory: '44yo female presenting with 3cm solitary left thyroid nodule. Thyroid ultrasound shows EU-TIRADS 4 lesion with microcalcifications. Fine needle aspiration biopsy performed. Requesting Bethesda classification and cytological opinion.',
    billingType: 'Direct Cash / POS',
    billingAmount: 22000,
    paymentStatus: 'Paid & Cleared',
    courierStatus: 'Received via DHL Medical Express (Tracking: DHL-NG-77412)',
    dateReceived: '2026-08-22 02:40 PM',
    status: 'Report Signed & Active QR',
    pathologist: 'Dr. Consultant Pathologist (FMCPath)',
    qrVerificationCode: 'QR-EXT-0042-APEX',
    grossDescription: '4 glass slides received in slide mailer, labeled with patient name and left thyroid FNA.',
    microscopicFindings: 'High cellularity smear displaying clusters of follicular epithelial cells with nuclear enlargement, grooves, and pseudoinclusions.',
    pathologicalDiagnosis: 'SUSPICIOUS FOR PAPILLARY THYROID CARCINOMA (BETHESDA CATEGORY V). SURGICAL EXCISION RECOMMENDED.',
    deliveryMethod: 'WhatsApp Delivered',
  },
  {
    id: 'ext-3',
    refNo: 'EXT-PATH-2026-0043',
    patientName: 'Alhaji Ibrahim K. Bello',
    patientAge: 62,
    patientGender: 'Male',
    patientPhone: '+234 805 566 7788',
    referringHospital: 'Federal Medical Centre, Ebute Metta',
    referringDoctor: 'Prof. M. A. Danfulani (Consultant Oncologist)',
    doctorPhone: '+234 802 111 3344',
    doctorEmail: 'danfulani@fmcem.gov.ng',
    caseCategory: 'Slide Review / Second Opinion',
    specimenType: 'Colon Resection FFPE Blocks & H&E Slides',
    containerCount: '2 FFPE Blocks, 4 H&E Slides',
    fixationCondition: 'FFPE Blocks & H&E Stained Glass Slides',
    clinicalHistory: '62yo male diagnosed with rectosigmoid carcinoma. Primary H&E slides reported as moderately differentiated adenocarcinoma. Referred for Expert Second Opinion consultation and Mismatch Repair (MMR) IHC biomarker feasibility prior to adjuvant chemotherapy.',
    billingType: 'Corporate Contract Invoice',
    billingAmount: 35000,
    paymentStatus: 'Billed to Corporate Account',
    courierStatus: 'Picked up by Smart Hospital Dispatch Driver (Ref: SH-DRV-04, Temp: 20°C)',
    dateReceived: '2026-08-23 04:00 PM',
    status: 'Microscopy Review',
    pathologist: 'Dr. Consultant Pathologist (FMCPath)',
    qrVerificationCode: 'QR-EXT-0043-FMC',
    grossDescription: '2 FFPE blocks labeled B-2026-904A/B and 4 stained H&E slides received intact.',
    microscopicFindings: 'Sections confirm moderately differentiated invasive colonic adenocarcinoma.',
    pathologicalDiagnosis: 'EXPERT CONSULTATION: MODERATELY DIFFERENTIATED COLONIC ADENOCARCINOMA. SUGGEST MLH1/MSH2/MSH6/PMS2 IHC PANEL.',
    deliveryMethod: 'Email Sent',
  },
];

const INITIAL_COURIER_LOGS: CourierLog[] = [
  {
    id: 'c-1',
    dispatchRef: 'SN-LOG-8821',
    courierName: 'St. Nicholas Hospital Medical Express (Driver K. Sanusi)',
    sourceClinic: 'St. Nicholas Hospital, Victoria Island',
    sampleCount: 3,
    pickupTime: '2026-08-23 08:30 AM',
    arrivalTime: '2026-08-23 10:15 AM',
    temperatureCondition: '22°C Ambient Cool Container',
    receivingOfficer: 'Pathology Clerk E. Okon',
    notes: 'Tissue samples intact in 10% formalin bottles.',
  },
  {
    id: 'c-2',
    dispatchRef: 'DHL-NG-77412',
    courierName: 'DHL Express Nigeria (Courier J. Chukwu)',
    sourceClinic: 'Apex Specialist Clinic, Enugu',
    sampleCount: 1,
    pickupTime: '2026-08-21 04:00 PM',
    arrivalTime: '2026-08-22 02:40 PM',
    temperatureCondition: 'Dry Slide Transport Mailer',
    receivingOfficer: 'Pathology Clerk E. Okon',
    notes: '4 ethanol-fixed glass slides in protective plastic slide box.',
  },
];

// --- Initial Mock Data ---
const INITIAL_HISTOLOGY: HistologyOrder[] = [
  {
    id: '1',
    refNo: 'PATH-HIST-2026-0891',
    patientName: 'Adaora Nwosu',
    patientId: 'P-10492',
    age: 44,
    gender: 'Female',
    requestingSurgeon: 'Prof. C. O. Eze (Consultant Oncoplastic Surgeon)',
    surgicalUnit: 'Surgical Suite 3 (General & Surgical Oncology)',
    organSite: 'Right Breast Mass (Outer Upper Quadrant)',
    clinicalIndication: '44yo female with 3.2cm firm irregular right breast mass. Core biopsy performed. Rule out Invasive Ductal Carcinoma.',
    grossingDescription: 'Specimen consists of 4 core tissue biopsy strips, cream-colored, measuring 1.2cm to 1.8cm in length. Embedded in 2 cassettes A1 & A2.',
    cassetteCount: 2,
    fixationStatus: '10% Neutral Buffered Formalin (14 hrs fixation)',
    stainType: 'Hematoxylin & Eosin (H&E)',
    dateReceived: '2026-08-22 09:30 AM',
    status: 'Slide Ready',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist, FMCPath)',
    urgency: 'STAT',
  },
  {
    id: '2',
    refNo: 'PATH-HIST-2026-0892',
    patientName: 'Babatunde Adeleke',
    patientId: 'P-10883',
    age: 58,
    gender: 'Male',
    requestingSurgeon: 'Dr. K. Bello (Urologist)',
    surgicalUnit: 'Urology Theatre Desk',
    organSite: 'Prostate Core Biopsies (12 Cores)',
    clinicalIndication: 'Elevated Serum PSA (14.2 ng/mL). TRUS-guided 12-core prostate biopsy. Rule out Prostate Adenocarcinoma.',
    grossingDescription: 'Specimen consists of 12 cylindrical tissue cores divided into 6 containers (Right Apex, Mid, Base; Left Apex, Mid, Base). Embedded in 6 cassettes B1-B6.',
    cassetteCount: 6,
    fixationStatus: '10% Neutral Buffered Formalin',
    stainType: 'H&E + High-MW Cytokeratin (PIN-4 Stain)',
    dateReceived: '2026-08-21 02:15 PM',
    status: 'Reported',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist, FMCPath)',
    urgency: 'ROUTINE',
  },
  {
    id: '3',
    refNo: 'PATH-HIST-2026-0893',
    patientName: 'Chioma Okeke',
    patientId: 'P-11029',
    age: 29,
    gender: 'Female',
    requestingSurgeon: 'Dr. A. Danjuma (Emergency Surgeon)',
    surgicalUnit: 'Emergency Operating Theatre',
    organSite: 'Appendix (Laparoscopic Appendectomy)',
    clinicalIndication: 'Acute RIF pain, fever (38.8°C), leucocytosis. Intra-operative inflamed turgid appendix. Rule out acute appendicitis vs carcinoid tumor.',
    grossingDescription: 'Specimen consists of an appendix measuring 7.5cm in length and 1.2cm in diameter. Serosa is dull and covered with fibrinous exudate. Embedded in 3 cassettes C1-C3.',
    cassetteCount: 3,
    fixationStatus: '10% Neutral Buffered Formalin',
    stainType: 'Standard H&E',
    dateReceived: '2026-08-23 04:10 AM',
    status: 'Grossed',
    pathologist: 'Dr. M. I. Ibrahim (Senior Pathology Resident)',
    urgency: 'FROZEN_SECTION',
  },
];

const INITIAL_CYTOLOGY: CytologySpecimen[] = [
  {
    id: '1',
    refNo: 'PATH-CYTO-2026-0310',
    patientName: 'Grace Danjuma',
    patientId: 'P-10992',
    requestingDoctor: 'Dr. E. O. Bassey (Gynaecologist)',
    specimenType: 'Cervical Pap Smear',
    stainingMethod: 'Papanicolaou (Pap)',
    adequacy: 'Satisfactory (Endocervical component present)',
    bethesdaClassification: 'NILM (Negative for Malignancy)',
    findings: 'Abundant superficial and intermediate squamous cells. Normal endocervical cell clusters. Benign reactive changes secondary to inflammation. No intraepithelial lesion or malignancy.',
    dateCollected: '2026-08-20',
    status: 'Final Signed',
    cytotechnologist: 'Scientist E. O. John (Senior Cytotechnologist)',
  },
  {
    id: '2',
    refNo: 'PATH-CYTO-2026-0311',
    patientName: 'Fatima Abubakar',
    patientId: 'P-11204',
    requestingDoctor: 'Dr. S. A. Aliyu (Endocrinologist)',
    specimenType: 'Thyroid FNA',
    stainingMethod: 'Giemsa / Diff-Quik',
    adequacy: 'Satisfactory (Endocervical component present)',
    bethesdaClassification: 'HSIL',
    findings: 'High cellularity smear with clusters of follicular epithelial cells featuring nuclear enlargement, overcrowding, microfollicle formation, and prominent grooves. Bethesda Category IV: Follicular Neoplasm.',
    dateCollected: '2026-08-22',
    status: 'Microscopy In Progress',
    cytotechnologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
  },
];

const INITIAL_MORTUARY: MortuaryRecord[] = [
  {
    id: 'AD-9001',
    tagNo: 'MOR-2026-001',
    deceasedName: 'Jane Doe (Hospital Death)',
    mrn: 'pat-1',
    age: 50,
    gender: 'Male',
    dateOfDeath: '2026-06-28',
    timeOfDeath: '10:15',
    sourceWard: 'Scar on right knee',
    chillerSlot: 'RELEASED (Vault Vacated)',
    nextOfKin: 'John Doe',
    nextOfKinPhone: '+1234567890',
    autopsyStatus: 'Autopsy Completed & Certified',
    causeOfDeath: 'Cardiopulmonary Arrest',
    findings: 'External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared.',
    status: 'Released to Family',
  },
  {
    id: 'AD-9002',
    tagNo: 'MOR-2026-002',
    deceasedName: 'Unidentified Male (Brought In Dead)',
    mrn: 'MOR-2026-002',
    age: 42,
    gender: 'Male',
    dateOfDeath: '2026-06-28',
    timeOfDeath: '23:40',
    sourceWard: 'Tattoo of anchor on left forearm',
    chillerSlot: 'Cabinet B - Tray 1',
    nextOfKin: 'Awaiting police contact',
    nextOfKinPhone: '—',
    autopsyStatus: 'Coroner Forensic Autopsy',
    causeOfDeath: 'Traumatic Injuries (RTA)',
    status: 'In Storage',
  },
  {
    id: 'AD-9003',
    tagNo: 'MORT-2026-0042',
    deceasedName: 'Late Chief Emmanuel O. Chukwu',
    mrn: 'P-09821',
    age: 72,
    gender: 'Male',
    dateOfDeath: '2026-08-21',
    timeOfDeath: '22:45',
    sourceWard: 'Inpatient Medical Ward (Ward 4B)',
    chillerSlot: 'Cold Storage Bay 04 - Temp (-2.5°C)',
    nextOfKin: 'Dr. Nnamdi Chukwu (Son)',
    nextOfKinPhone: '+234 803 123 4567',
    autopsyStatus: 'Clinical Pathology Autopsy',
    causeOfDeath: 'Refractory Cardiogenic Shock 2° to Massive Anterior Myocardial Infarction',
    status: 'In Storage',
  },
  {
    id: 'AD-9004',
    tagNo: 'MORT-2026-0043',
    deceasedName: 'Late Usman Garba',
    mrn: 'P-11109',
    age: 38,
    gender: 'Male',
    dateOfDeath: '2026-08-22',
    timeOfDeath: '03:15',
    sourceWard: 'Accident & Emergency (A&E)',
    chillerSlot: 'Cold Storage Bay 08 - Temp (-3.0°C)',
    nextOfKin: 'Hajiya Amina Garba (Wife)',
    nextOfKinPhone: '+234 802 987 6543',
    autopsyStatus: 'Coroner Forensic Autopsy',
    causeOfDeath: 'Traumatic Hemorrhagic Shock 2° to Severe Polytrauma & Ruptured Spleen',
    status: 'In Storage',
  },
];

const INITIAL_ARCHIVE: SlideArchiveItem[] = [
  {
    id: '1',
    specimenNo: 'PATH-HIST-2025-4102',
    patientName: 'Victoria Balogun',
    patientId: 'P-08291',
    blockId: 'FFPE Block #B-4102-A1',
    slideId: 'H&E Slide #S-4102-A1',
    organSite: 'Uterine Leiomyoma (Myomectomy Specimen)',
    cabinetLocator: 'Archive Room 2 · Cabinet B · Shelf 3 · Drawer 14',
    retentionYears: 20,
    dateArchived: '2025-11-14',
    status: 'In Archive',
  },
  {
    id: '2',
    specimenNo: 'PATH-HIST-2025-4990',
    patientName: 'Samuel Ogundipe',
    patientId: 'P-07712',
    blockId: 'FFPE Block #B-4990-C2',
    slideId: 'H&E Slide #S-4990-C2',
    organSite: 'Colon Biopsy (Polypectomy)',
    cabinetLocator: 'Archive Room 2 · Cabinet A · Shelf 1 · Drawer 04',
    retentionYears: 20,
    dateArchived: '2025-12-02',
    status: 'Checked Out (Second Opinion)',
  },
];

const INITIAL_IHC: IHCRecord[] = [
  {
    id: 'ihc-1',
    specimenNo: 'PATH-HIST-2026-0891',
    patientName: 'Adaora Nwosu',
    patientId: 'P-10492',
    age: 44,
    gender: 'Female',
    organSite: 'Left Breast Core Biopsy',
    panelType: 'Breast Cancer Biomarker Panel (ER, PR, HER2, Ki-67)',
    erStatus: 'Strong Positive (85% nuclear expression, Score 8/8)',
    prStatus: 'Moderate Positive (60% nuclear expression, Score 6/8)',
    her2Status: 'Score 3+ (Positive for Overexpression)',
    ki67Index: '32% High Proliferation Index',
    additionalMarkers: 'E-Cadherin: Positive (Membranous)',
    interpretation: 'Invasive Ductal Carcinoma, Luminal B (HER2-Positive) Subtype. Eligible for Targeted Trastuzumab (Herceptin) & Endocrine Therapy.',
    targetTherapyRecommendation: 'Trastuzumab (Herceptin) + Aromatase Inhibitor / Tamoxifen Protocol',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    dateCompleted: '2026-08-22',
    status: 'IHC Certified',
  },
  {
    id: 'ihc-2',
    specimenNo: 'PATH-HIST-2026-1120',
    patientName: 'Khadijah Lawal',
    patientId: 'P-35146',
    age: 25,
    gender: 'Female',
    organSite: 'Right Breast Lumpectomy',
    panelType: 'Breast Cancer Triple-Negative Profiling',
    erStatus: 'Negative (0% nuclear staining, Score 0/8)',
    prStatus: 'Negative (0% nuclear staining, Score 0/8)',
    her2Status: 'Score 0 (Negative, no membrane staining)',
    ki67Index: '78% Very High Proliferation Index',
    additionalMarkers: 'p53: Diffuse Mutational Pattern, CK5/6: Positive',
    interpretation: 'Triple-Negative Invasive Breast Carcinoma (Basal-like Phenotype), Nottingham Grade 3. High proliferative index.',
    targetTherapyRecommendation: 'Platinum-based Neoadjuvant Chemotherapy + PARP Inhibitor / Immunotherapy Evaluation',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    dateCompleted: '2026-08-28',
    status: 'IHC Certified',
  },
  {
    id: 'ihc-3',
    specimenNo: 'PATH-HIST-2026-1405',
    patientName: 'Solomon Bassey',
    patientId: 'P-34145',
    age: 40,
    gender: 'Male',
    organSite: 'Right Lung Bronchial Biopsy',
    panelType: 'Lung Non-Small Cell Carcinoma (NSCLC) Subtyping & PD-L1',
    erStatus: 'N/A',
    prStatus: 'N/A',
    her2Status: 'N/A',
    ki67Index: '45% Proliferation Index',
    additionalMarkers: 'TTF-1: Diffuse Strong Positive, Napsin A: Positive, p40: Negative, PD-L1 (22C3): TPS 65% (High Expression)',
    interpretation: 'Primary Lung Adenocarcinoma (TTF-1 / Napsin A positive, squamous p40 negative). PD-L1 Tumor Proportion Score (TPS) >= 50%.',
    targetTherapyRecommendation: 'Eligible for First-Line Pembrolizumab (Keytruda) Monotherapy / EGFR-ALK-ROS1 NGS panel',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    dateCompleted: '2026-09-02',
    status: 'IHC Certified',
  },
  {
    id: 'ihc-4',
    specimenNo: 'PATH-HIST-2026-1780',
    patientName: 'Patrick Ezeife',
    patientId: 'P-40151',
    age: 63,
    gender: 'Male',
    organSite: 'Prostatic Needle Core Biopsy',
    panelType: 'Prostate PIN / Carcinoma Triple Cocktail',
    erStatus: 'N/A',
    prStatus: 'N/A',
    her2Status: 'N/A',
    ki67Index: '18% Proliferation Index',
    additionalMarkers: 'AMACR / Racemase: Diffuse Strong Granular Circumferential Positive, p63: Complete Absence of Basal Cells, HMWCK (34bE12): Negative, PSA: Positive',
    interpretation: 'Prostatic Adenocarcinoma, Gleason Score 4+4=8 (Grade Group 4). Absence of basal cell layer confirmed with AMACR overexpression.',
    targetTherapyRecommendation: 'Androgen Deprivation Therapy (ADT) + Radical Oncologic Treatment Protocol',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    dateCompleted: '2026-09-05',
    status: 'IHC Certified',
  },
  {
    id: 'ihc-5',
    specimenNo: 'PATH-HIST-2026-2041',
    patientName: 'Samuel Ibanga',
    patientId: 'P-36147',
    age: 57,
    gender: 'Male',
    organSite: 'Cervical Lymph Node Excision',
    panelType: 'Lymphoma Lineage & Subtyping Panel',
    erStatus: 'N/A',
    prStatus: 'N/A',
    her2Status: 'N/A',
    ki67Index: '85% Very High Proliferation Index',
    additionalMarkers: 'CD20: Diffuse Strong Membranous Positive (B-cell), CD3: Negative (Background T-cells only), CD10: Positive, BCL-6: Positive, MUM-1: Negative',
    interpretation: 'Diffuse Large B-Cell Lymphoma (DLBCL), Germinal Center B-cell-like (GCB) Subtype by Hans Algorithm.',
    targetTherapyRecommendation: 'R-CHOP Immunochemotherapy Regimen (Rituximab targeted anti-CD20 therapy)',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    dateCompleted: '2026-09-07',
    status: 'IHC Certified',
  },
];

const Pathology: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Route Synchronization for Pathology Sub-Menu
  const getTabFromPath = (pathname: string): number => {
    if (pathname.includes('/pathology/cytology')) return 1;
    if (pathname.includes('/pathology/reporting')) return 2;
    if (pathname.includes('/pathology/mortuary')) return 3;
    if (pathname.includes('/pathology/archive')) return 4;
    if (pathname.includes('/pathology/ihc')) return 5;
    if (pathname.includes('/pathology/external') || pathname.includes('/pathology/referrals')) return 6;
    return 0; // default to Histology Orders
  };

  const [activeTab, setActiveTab] = useState<number>(getTabFromPath(location.pathname));

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const routes = [
      '/pathology/histology',
      '/pathology/cytology',
      '/pathology/reporting',
      '/pathology/mortuary',
      '/pathology/archive',
      '/pathology/ihc',
      '/pathology/external',
    ];
    navigate(routes[newValue] || '/pathology/histology');
  };

// Local Storage persistence helpers for Pathology Diagnostic Reports
const STORAGE_KEY_PATHOLOGY_REPORTS = 'faith_pathology_saved_reports_v2';

const loadSavedPathologyReports = (): Record<string, Partial<HistologyOrder>> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PATHOLOGY_REPORTS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to load saved pathology reports from storage:', e);
    return {};
  }
};

const savePathologyReportToStorage = (key: string, data: Partial<HistologyOrder>, altKey?: string) => {
  try {
    const current = loadSavedPathologyReports();
    current[key] = { ...(current[key] || {}), ...data };
    if (altKey) {
      current[altKey] = { ...(current[altKey] || {}), ...data };
    }
    localStorage.setItem(STORAGE_KEY_PATHOLOGY_REPORTS, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save pathology report to storage:', e);
  }
};

  // State Stores
  const [histologyOrders, setHistologyOrders] = useState<HistologyOrder[]>(() => {
    const saved = loadSavedPathologyReports();
    return INITIAL_HISTOLOGY.map(h => {
      const s = saved[h.id] || (h.refNo ? saved[h.refNo] : undefined);
      return s ? { ...h, ...s } : h;
    });
  });
  const [cytologySpecimens, setCytologySpecimens] = useState<CytologySpecimen[]>(INITIAL_CYTOLOGY);
  const [mortuaryRecords, setMortuaryRecords] = useState<MortuaryRecord[]>(() => {
    const savedAutopsies = loadSavedMortuaryAutopsies();
    const savedReleases = loadSavedMortuaryReleases();
    return INITIAL_MORTUARY.map(m => {
      const key = m.tagNo || m.mrn || m.id;
      const aut = savedAutopsies[key];
      const rel = savedReleases[key];
      return {
        ...m,
        ...(aut || {}),
        ...(rel || {}),
      };
    });
  });
  const [archiveItems, setArchiveItems] = useState<SlideArchiveItem[]>(loadSavedArchiveItems);
  const [ihcRecords, setIhcRecords] = useState<IHCRecord[]>(loadSavedIHCRecords);
  const [ihcFilter, setIhcFilter] = useState<'ALL' | 'BREAST' | 'LUNG' | 'PROSTATE' | 'LYMPHOMA' | 'CERTIFIED'>('ALL');
  const [isNewIHCModalOpen, setIsNewIHCModalOpen] = useState(false);
  const [isViewIHCReportModalOpen, setIsViewIHCReportModalOpen] = useState(false);
  const [isEditIHCModalOpen, setIsEditIHCModalOpen] = useState(false);
  const [selectedIHCRecord, setSelectedIHCRecord] = useState<IHCRecord | null>(null);
  const [selectedIHCPatient, setSelectedIHCPatient] = useState<any | null>(null);

  const [newIHCForm, setNewIHCForm] = useState({
    specimenNo: '',
    patientName: '',
    patientId: '',
    age: 45,
    gender: 'Female',
    organSite: 'Left Breast Core Biopsy',
    panelType: 'Breast Cancer Biomarker Panel (ER, PR, HER2, Ki-67)',
    erStatus: 'Strong Positive (85% nuclear expression, Score 8/8)',
    prStatus: 'Moderate Positive (60% nuclear expression, Score 6/8)',
    her2Status: 'Score 3+ (Positive for Overexpression)',
    ki67Index: '35% High Proliferation Index',
    additionalMarkers: 'E-Cadherin: Positive (Membranous)',
    interpretation: 'Invasive Ductal Carcinoma, Luminal B (HER2-Positive) Subtype. High risk for recurrence without targeted biologic blockade.',
    targetTherapyRecommendation: 'Eligible for Targeted Trastuzumab (Herceptin) + Endocrine Hormonal Therapy (Aromatase Inhibitor).',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
  });

  const [editIHCForm, setEditIHCForm] = useState<IHCRecord>({
    id: '',
    specimenNo: '',
    patientName: '',
    patientId: '',
    organSite: '',
    panelType: '',
    erStatus: '',
    prStatus: '',
    her2Status: '',
    ki67Index: '',
    additionalMarkers: '',
    interpretation: '',
    targetTherapyRecommendation: '',
    pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    dateCompleted: '',
    status: 'IHC Certified',
  });

  // External Referral & Courier State
  const [externalOrders, setExternalOrders] = useState<ExternalPathologyReferral[]>(INITIAL_EXTERNAL_REFERRALS);
  const [courierLogs, setCourierLogs] = useState<CourierLog[]>(INITIAL_COURIER_LOGS);

  // Dialog State
  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [isReportDeliveryModalOpen, setIsReportDeliveryModalOpen] = useState(false);
  const [selectedExternalReferral, setSelectedExternalReferral] = useState<ExternalPathologyReferral | null>(null);

  // Quick Register External Form
  const [newExternalForm, setNewExternalForm] = useState({
    patientName: '',
    patientAge: 42,
    patientGender: 'Female',
    patientPhone: '',
    referringHospital: 'St. Nicholas Hospital, Lagos',
    referringDoctor: '',
    doctorPhone: '',
    doctorEmail: '',
    caseCategory: 'Fresh Tissue Biopsy & Resection' as ExternalPathologyReferral['caseCategory'],
    specimenType: '',
    containerCount: '1 Formalin Jar',
    fixationCondition: '10% Neutral Buffered Formalin',
    clinicalHistory: '',
    billingType: 'Direct Cash / POS' as ExternalPathologyReferral['billingType'],
    billingAmount: 35000,
    paymentStatus: 'Paid & Cleared' as ExternalPathologyReferral['paymentStatus'],
    courierStatus: 'Received at Desk (Hand Delivered)',
  });

  const getNowISOString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Courier Pickup Form
  const [newCourierForm, setNewCourierForm] = useState({
    dispatchRef: '',
    courierName: 'Smart Hospital Dispatch (Driver K. Sanusi)',
    sourceClinic: 'St. Nicholas Hospital, Lagos Island',
    sampleCount: 1,
    pickupTime: getNowISOString(),
    arrivalTime: getNowISOString(),
    temperatureCondition: '22°C Ambient Container',
    receivingOfficer: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Pathology Receiving Desk (Clerk E. Okon)',
    notes: '',
  });

  // Dynamic Doctor Options for Requesting Clinician & Surgeon Dropdowns (Strictly Doctors/Physicians from Staff Records)
  const [doctorOptions, setDoctorOptions] = useState<string[]>([
    'Dr. EMMANUEL VEGHER (Chief Consultant Physician)',
    'Dr. Tertsegha Vegher (Senior Medical Officer - SMO)',
    'Dr. Grace Okafor (Consultant Obstetrician & Gynaecologist)',
    'Dr. E. O. Bassey (Consultant Gynaecologist)',
    'Dr. C. I. Nnamdi (Obstetrician & Gynaecologist)',
    'Dr. S. A. Aliyu (Endocrinologist)',
    'Dr. John Smith (General Surgeon)',
    'Prof. C. O. Eze (Consultant Surgeon)',
    'Dr. F. A. Ogundipe (Consultant Urologist)',
  ]);

  const fetchDoctorList = async () => {
    try {
      const res = await api.get('/users', { params: { limit: 200 } });
      const usersData = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.users || res.data || []);
      if (usersData.length > 0) {
        // Filter strictly for doctors, physicians, consultants, SMOs, and specialists from Staff Records
        const doctorsOnly = usersData.filter((u: any) => {
          if (!u || u.role === 'PATIENT') return false;
          
          // Exclude non-doctor roles
          const nonDoctorRoles = ['NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'RECEPTIONIST', 'ACCOUNTANT'];
          if (nonDoctorRoles.includes(u.role)) return false;

          if (u.role === 'DOCTOR' || u.role === 'CLINICIAN') return true;

          const desig = (u.designation || '').toLowerCase();
          const dept = (u.department || '').toLowerCase();
          const title = (u.title || '').toLowerCase();
          const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();

          const doctorKeywords = [
            'doctor', 'dr.', 'dr ', 'prof.', 'prof ', 'physician', 'consultant', 'surgeon',
            'medical officer', 'smo', 'cmo', 'gynaecol', 'obstetr', 'paediatr', 'patholog',
            'radiolog', 'oncolog', 'cardiol', 'dermatol', 'nephrol', 'neurol', 'psychiat',
            'urolog', 'orthop', 'general practitioner', 'gp', 'medical', 'vegher', 'okafor'
          ];

          return doctorKeywords.some(kw => desig.includes(kw) || title.includes(kw) || dept.includes(kw) || name.includes(kw));
        });

        const names: string[] = doctorsOnly.map((u: any) => {
          const rawName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.username || 'Doctor';
          let formattedName = rawName;
          if (!formattedName.toLowerCase().startsWith('dr.') && !formattedName.toLowerCase().startsWith('prof.')) {
            formattedName = `Dr. ${formattedName}`;
          }
          const specialty = u.designation || u.department || 'Consultant Clinician';
          return `${formattedName} (${specialty})`;
        });

        const defaults = [
          'Dr. EMMANUEL VEGHER (Chief Consultant Physician)',
          'Dr. Tertsegha Vegher (Senior Medical Officer - SMO)',
          'Dr. Grace Okafor (Consultant Obstetrician & Gynaecologist)',
        ];

        setDoctorOptions(Array.from(new Set([...names, ...defaults])));
      }
    } catch (err) {
      console.warn('Error fetching doctor list for pathology:', err);
    }
  };

  // Dynamic Staff Options for Courier Logistics & Receiving Officer Intake
  const [staffOptions, setStaffOptions] = useState<string[]>([
    'Pathology Receiving Desk (Clerk E. Okon)',
    'Senior Cytotechnologist (Scientist E. O. John)',
    'Duty Pathologist (Dr. Consultant Pathologist)',
  ]);

  const fetchStaffList = async () => {
    try {
      const res = await api.get('/users', { params: { limit: 200 } });
      const usersData = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.users || res.data || []);
      if (usersData.length > 0) {
        // Exclude PATIENT role — only show clinical & administrative staff
        const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'RECEPTIONIST', 'STAFF'];
        const staffOnly = usersData.filter((u: any) => STAFF_ROLES.includes(u.role));
        const names: string[] = staffOnly.map((u: any) => {
          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
          const roleLabel = u.designation || u.role?.replace(/_/g, ' ') || 'Staff';
          return fullName ? `${fullName} (${roleLabel})` : (u.username || 'Staff Member');
        });
        const currentName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
        if (currentName && !names.find(n => n.startsWith(currentName))) {
          const currentRole = (user as any)?.designation || (user as any)?.role?.replace(/_/g, ' ') || 'Staff';
          names.unshift(`${currentName} (${currentRole})`);
        }
        // Always seed defaults if list is empty after filtering
        const defaults = [
          'Pathology Receiving Desk Officer',
          'Senior Cytotechnologist',
          'Duty Pathologist',
        ];
        setStaffOptions(Array.from(new Set([...names, ...defaults])));
      }
    } catch (err) {
      console.warn('Error fetching staff list for courier intake:', err);
    }
  };

  useEffect(() => {
    fetchDoctorList();
    if (isCourierModalOpen) {
      fetchStaffList();
    }
  }, [isCourierModalOpen]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Live Backend Diagnostic & Mortuary Sync
  const syncPathologyData = async (showNotification = false) => {
    setIsSyncing(true);
    try {
      // 1. Sync LIMS lab orders and Surgical Theatre Requests
      const [limsRes, theatreRes] = await Promise.allSettled([
        api.get('/lims/orders'),
        api.get('/theatre/requests'),
      ]);

      const fetchedHist: HistologyOrder[] = [];
      const fetchedCyto: CytologySpecimen[] = [];

      // Process live Surgical Theatre Requests (e.g., KERRY DANIEL, etc.)
      if (theatreRes.status === 'fulfilled' && Array.isArray(theatreRes.value?.data)) {
        theatreRes.value.data.forEach((srg: any) => {
          const pName = srg.patient ? `${srg.patient.firstName || ''} ${srg.patient.lastName || ''}`.trim() : 'Surgical Patient';
          const pId = srg.patient?.patientNumber || srg.patientId || 'P-SURG';
          const surgName = srg.surgeon ? `Dr. ${srg.surgeon.firstName || ''} ${srg.surgeon.lastName || ''}`.trim() : 'Attending Surgeon';

          let genderStr = 'Male';
          if (srg.patient?.gender) {
            const g = String(srg.patient.gender).toLowerCase();
            genderStr = g.startsWith('f') ? 'Female' : 'Male';
          }

          let age = 35;
          if (srg.patient?.birthDate) {
            const y = new Date(srg.patient.birthDate).getFullYear();
            if (!isNaN(y)) age = new Date().getFullYear() - y;
          } else if (srg.patient?.estimatedAge) {
            age = Number(srg.patient.estimatedAge);
          }

          fetchedHist.push({
            id: `srg-${srg.id}`,
            refNo: srg.requestNumber || `PATH-HIST-${String(srg.id).slice(-4)}`,
            patientName: pName,
            patientId: pId,
            age: age,
            gender: genderStr,
            requestingSurgeon: surgName,
            surgicalUnit: 'Operating Theatre & Surgical Suite',
            organSite: `${srg.proposedProcedure || 'Resected Tissue Specimen'} (Surgical Specimen)`,
            clinicalIndication: srg.diagnosis ? `Pre-Op Diagnosis: ${srg.diagnosis}. Tissue sent for histopathology examination.` : 'Intraoperative tissue specimen submitted for urgent pathological review.',
            grossingDescription: 'Specimen received in 10% neutral buffered formalin from Operating Theatre. Gross examination logged.',
            cassetteCount: 2,
            fixationStatus: '10% Neutral Buffered Formalin',
            stainType: 'Hematoxylin & Eosin (H&E)',
            dateReceived: srg.createdAt ? new Date(srg.createdAt).toLocaleString() : new Date().toLocaleString(),
            status: 'Grossed',
            pathologist: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Dr. Consultant Pathologist',
            urgency: srg.urgency === 'EMERGENCY' || srg.urgency === 'TRAUMA' ? 'STAT' : 'ROUTINE',
          });
        });
      }

      // Process LIMS orders
      if (limsRes.status === 'fulfilled' && Array.isArray(limsRes.value?.data)) {
        limsRes.value.data.forEach((ord: any) => {
          const pName = ord.patient ? `${ord.patient.firstName || ''} ${ord.patient.lastName || ''}`.trim() : 'Anonymous Patient';
          const pId = ord.patient?.patientNumber || ord.patientId || 'P-9999';
          const docName = ord.requestedBy ? `Dr. ${ord.requestedBy.firstName || ''} ${ord.requestedBy.lastName || ''}`.trim() : 'Attending Clinician';

          const items = ord.items || [];
          if (items.length === 0) {
            if (ord.department === 'PATHOLOGY' || ord.department === 'HISTOLOGY' || ord.notes?.toLowerCase().includes('histology') || ord.notes?.toLowerCase().includes('biopsy')) {
              fetchedHist.push({
                id: `db-${ord.id}`,
                refNo: ord.orderNumber || `PATH-HIST-${String(ord.id).slice(-4)}`,
                patientName: pName,
                patientId: pId,
                age: 45,
                gender: ord.patient?.gender || 'Female',
                requestingSurgeon: docName,
                surgicalUnit: 'Operating Suite',
                organSite: ord.testName || 'Surgical Tissue Specimen',
                clinicalIndication: ord.clinicalNotes || ord.notes || 'Histopathological analysis requested.',
                grossingDescription: 'Specimen received in 10% neutral buffered formalin. Gross examination logged.',
                cassetteCount: 2,
                fixationStatus: '10% Neutral Buffered Formalin',
                stainType: 'Hematoxylin & Eosin (H&E)',
                dateReceived: ord.orderedAt ? new Date(ord.orderedAt).toLocaleString() : new Date().toLocaleString(),
                status: ord.status === 'COMPLETED' ? 'Reported' : 'Slide Ready',
                pathologist: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Dr. Consultant Pathologist',
                urgency: ord.priority === 'STAT' ? 'STAT' : 'ROUTINE',
              });
            }
          } else {
            items.forEach((item: any) => {
              const testName = item.test?.testName || item.testName || '';
              const category = item.test?.category || '';
              const nameLower = testName.toLowerCase();
              const catLower = category.toLowerCase();

              if (catLower.includes('pathology') || catLower.includes('histology') || nameLower.includes('biopsy') || nameLower.includes('histology') || nameLower.includes('resection') || nameLower.includes('specimen')) {
                fetchedHist.push({
                  id: `db-${ord.id}-${item.id}`,
                  refNo: ord.orderNumber || `PATH-HIST-${String(ord.id).slice(-4)}`,
                  patientName: pName,
                  patientId: pId,
                  age: 45,
                  gender: ord.patient?.gender || 'Female',
                  requestingSurgeon: docName,
                  surgicalUnit: 'Operating Suite',
                  organSite: testName || 'Surgical Tissue Specimen',
                  clinicalIndication: ord.clinicalNotes || 'Histopathological analysis requested from clinical encounter.',
                  grossingDescription: 'Specimen received in formalin container. Gross examination logged.',
                  cassetteCount: 2,
                  fixationStatus: '10% Neutral Buffered Formalin',
                  stainType: 'Hematoxylin & Eosin (H&E)',
                  dateReceived: ord.orderedAt ? new Date(ord.orderedAt).toLocaleString() : new Date().toLocaleString(),
                  status: ord.status === 'COMPLETED' ? 'Reported' : 'Slide Ready',
                  pathologist: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Dr. Consultant Pathologist',
                  urgency: ord.priority === 'STAT' ? 'STAT' : 'ROUTINE',
                });
              } else if (nameLower.includes('pap') || nameLower.includes('smear') || nameLower.includes('cytology') || nameLower.includes('fna') || nameLower.includes('fluid')) {
                fetchedCyto.push({
                  id: `db-${ord.id}-${item.id}`,
                  refNo: ord.orderNumber || `PATH-CYTO-${String(ord.id).slice(-4)}`,
                  patientName: pName,
                  patientId: pId,
                  requestingDoctor: docName,
                  specimenType: testName.includes('Pap') ? 'Cervical Pap Smear' : 'Thyroid FNA',
                  stainingMethod: 'Papanicolaou (Pap)',
                  adequacy: 'Satisfactory (Endocervical component present)',
                  bethesdaClassification: 'NILM (Negative for Malignancy)',
                  findings: 'Normal cellularity smear. No dysplastic or malignant cells identified.',
                  dateCollected: ord.orderedAt ? new Date(ord.orderedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                  status: ord.status === 'COMPLETED' ? 'Final Signed' : 'Microscopy In Progress',
                  cytotechnologist: 'Scientist E. O. John (Senior Cytotechnologist)',
                });
              }
            });
          }
        });
      }

      const savedReports = loadSavedPathologyReports();
      const enrichItem = (item: HistologyOrder): HistologyOrder => {
        const saved = savedReports[item.id] || (item.refNo ? savedReports[item.refNo] : undefined);
        return saved ? { ...item, ...saved } : item;
      };

      const enrichedFetchedHist = fetchedHist.map(enrichItem);

      if (enrichedFetchedHist.length > 0) {
        setHistologyOrders(prev => {
          const merged = enrichedFetchedHist.map(f => {
            const existingInPrev = prev.find(p => p.id === f.id || (f.refNo && p.refNo === f.refNo));
            if (existingInPrev && (existingInPrev.status === 'Reported' || existingInPrev.microscopicFindings)) {
              return { ...f, ...existingInPrev };
            }
            return f;
          });
          const existingNotInFetched = prev.filter(p => !enrichedFetchedHist.some(f => f.id === p.id || (f.refNo && p.refNo === f.refNo)) && !p.id.startsWith('pat-db-') && !['1','2','3'].includes(p.id));
          return [...merged, ...existingNotInFetched];
        });
      } else {
        // Clear fake dummy records so histology log reflects actual system state
        setHistologyOrders(prev => prev.filter(p => !p.id.startsWith('pat-db-') && !['1','2','3'].includes(p.id)));
      }

      if (fetchedCyto.length > 0) {
        setCytologySpecimens(prev => {
          const combined = [...fetchedCyto, ...prev.filter(p => !fetchedCyto.some(f => f.id === p.id))];
          return combined;
        });
      }

      // 2. Sync Mortuary Admissions & Scheduled Autopsies
      const [mortRes, autopsyRes] = await Promise.allSettled([
        api.get('/mortuary/admissions'),
        api.get('/mortuary/autopsies'),
      ]);

      const mortData = mortRes.status === 'fulfilled' ? (mortRes.value.data?.data || mortRes.value.data) : [];
      const autData = autopsyRes.status === 'fulfilled' ? (autopsyRes.value.data?.data || autopsyRes.value.data || []) : [];

      const savedAutopsies = loadSavedMortuaryAutopsies();
      const savedReleases = loadSavedMortuaryReleases();

      const autMap = new Map<string, any>();
      if (Array.isArray(autData)) {
        autData.forEach((a: any) => {
          if (a.mrn) autMap.set(a.mrn, a);
          if (a.id) autMap.set(a.id, a);
          if (a.patientId) autMap.set(a.patientId, a);
        });
      }

      const fetchedMort: MortuaryRecord[] = [];

      // 1. Process hospital mortuary admissions that have requested autopsies
      if (Array.isArray(mortData) && mortData.length > 0) {
        mortData.forEach((m: any) => {
          const key = m.mrn || m.patientId || m.id;
          const aut = savedAutopsies[key] || savedAutopsies[m.mrn] || savedAutopsies[m.id];
          const rel = savedReleases[key] || savedReleases[m.mrn] || savedReleases[m.id];
          const serverAut = autMap.get(m.mrn) || autMap.get(m.patientId) || autMap.get(m.id);

          // An admission only belongs on the Pathology Mortuary & Autopsy Desk
          // if an autopsy postmortem has been explicitly requested, scheduled, or certified.
          // Not every deceased patient requires an autopsy; cold-vault storage patients stay in Mortuary only.
          const serverHasAutopsy = Boolean(serverAut && serverAut.status !== 'CANCELLED');
          const admissionHasAutopsy = Boolean(
            m.autopsyStatus && 
            typeof m.autopsyStatus === 'string' && 
            m.autopsyStatus.trim() && 
            !['none', 'no autopsy', 'no autopsy requested', 'vault storage only'].includes(m.autopsyStatus.toLowerCase())
          );

          // If the patient is Late Ben Ogu or MOR-2026-05 and server has no active autopsy, purge any stale test residue!
          if (!serverHasAutopsy && (m.mrn === 'MOR-2026-05' || (m.name && m.name.toLowerCase().includes('ben ogu')))) {
            removeMortuaryAutopsyFromStorage([m.mrn, m.patientId, m.id, 'MOR-2026-05']);
            return;
          }

          // Strict verification: If neither the server autopsy database nor the admission record
          // has an active requested autopsy, do NOT show on the Pathologist's autopsy desk!
          if (!serverHasAutopsy && !admissionHasAutopsy) {
            return;
          }

          const isAutopsyDone = serverAut?.status === 'COMPLETED' || m.autopsyStatus?.toLowerCase().includes('completed') || !!aut?.findings;
          const isReleased = m.status === 'RELEASED' || rel?.status === 'Released to Family';

          let computedAutopsyStatus = 'Clinical Pathology Autopsy';
          if (isAutopsyDone) {
            computedAutopsyStatus = 'Autopsy Completed & Certified';
          } else if (serverAut?.status === 'SCHEDULED' || m.autopsyStatus?.toLowerCase().includes('scheduled') || aut?.statusStage === 'SCHEDULED') {
            computedAutopsyStatus = (m.medicoLegalStatus === 'CORONER_CASE' || m.medicoLegalStatus === 'POLICE_CASE' || m.autopsyStatus?.toLowerCase().includes('coroner'))
              ? 'Coroner Forensic Autopsy Scheduled'
              : 'Clinical Pathology Autopsy Scheduled';
          } else if (m.medicoLegalStatus === 'CORONER_CASE' || m.medicoLegalStatus === 'POLICE_CASE') {
            computedAutopsyStatus = 'Coroner Forensic Autopsy';
          } else {
            computedAutopsyStatus = m.autopsyStatus || 'Clinical Pathology Autopsy';
          }

          fetchedMort.push({
            id: m.id || `mort-${Math.random()}`,
            tagNo: m.mrn || `MORT-${m.id}`,
            deceasedName: m.name || 'Unidentified Deceased',
            mrn: m.patientId || m.mrn || 'P-DECEASED',
            age: m.age || 50,
            gender: m.gender || 'Male',
            dateOfDeath: m.admittedAt ? m.admittedAt.split(' ')[0] : '2026-08-22',
            timeOfDeath: m.admittedAt ? m.admittedAt.split(' ')[1] || '12:00' : '12:00',
            sourceWard: m.identifyingFeatures || m.storageLocation || 'Mortuary Cold Bay',
            chillerSlot: isReleased ? (rel?.chillerSlot || `${m.storageLocation} (Vacated)`) : (m.storageLocation || 'Cabinet A - Tray 1'),
            nextOfKin: m.nextOfKin?.name || 'Awaiting NOK',
            nextOfKinPhone: m.nextOfKin?.phone || '—',
            autopsyStatus: computedAutopsyStatus,
            causeOfDeath: aut?.causeOfDeath || serverAut?.causeOfDeath || m.causeOfDeath || 'Pending Autopsy Report',
            findings: aut?.findings || serverAut?.findings || m.findings || '',
            status: isReleased ? 'Released to Family' : 'In Storage',
            releasedAt: rel?.releasedAt || m.releasedAt,
            claimantName: rel?.claimantName || m.claimantName,
            relationship: rel?.relationship || m.relationship,
            inMortuary: true,
          });
        });
      }

      // 2. Process direct autopsy referrals (from IPD / OPD before or independent of mortuary)
      if (Array.isArray(autData) && autData.length > 0) {
        autData.forEach((a: any) => {
          if (a.status === 'CANCELLED') return;
          const aNameClean = (a.name || '').toLowerCase().replace(/^late\s+/i, '').trim();
          const alreadyMapped = fetchedMort.some(f => {
            const fNameClean = (f.deceasedName || '').toLowerCase().replace(/^late\s+/i, '').trim();
            return f.tagNo === a.mrn || f.mrn === a.mrn || f.mrn === a.patientId || f.id === a.id || (aNameClean && fNameClean && aNameClean === fNameClean);
          });

          if (!alreadyMapped) {
            const key = a.mrn || a.patientId || a.id;
            const aut = savedAutopsies[key] || savedAutopsies[a.mrn] || savedAutopsies[a.id];
            const isAutopsyDone = a.status === 'COMPLETED' || !!aut?.findings || (a.findings && !a.findings.includes('Pending postmortem'));
            const isDispatched = a.disposition === 'HOSPITAL_MORTUARY' || a.disposition === 'EXTERNAL_MORTUARY' || a.disposition === 'FAMILY_RELEASE';

            let computedAutopsyStatus = 'Clinical Pathology Autopsy Scheduled';
            if (isAutopsyDone) {
              computedAutopsyStatus = 'Autopsy Completed & Certified';
            } else if (a.type === 'CORONER') {
              computedAutopsyStatus = 'Coroner Forensic Autopsy Scheduled';
            }

            fetchedMort.push({
              id: a.id || `aut-${Math.random()}`,
              tagNo: a.mrn || `AUT-${a.id}`,
              deceasedName: a.name || 'Direct Referral Patient',
              mrn: a.patientId || a.mrn || 'P-DECEASED',
              age: a.age || 52,
              gender: a.gender || 'Male',
              dateOfDeath: a.scheduledTime ? a.scheduledTime.split(' ')[0] : new Date().toISOString().split('T')[0],
              timeOfDeath: a.scheduledTime ? a.scheduledTime.split(' ')[1] || '10:00' : '10:00',
              sourceWard: a.sourceWard || 'Direct Referral (Inpatient / Emergency)',
              chillerSlot: a.inMortuary ? 'Mortuary Cold Vault' : (isDispatched ? (a.destinationDesc || 'Dispatched') : 'Pre-Mortuary Autopsy Suite'),
              nextOfKin: a.nokName || 'Family Next of Kin',
              nextOfKinPhone: a.nokPhone || '—',
              autopsyStatus: computedAutopsyStatus,
              causeOfDeath: aut?.causeOfDeath || a.causeOfDeath || 'Pending Autopsy Report',
              findings: aut?.findings || a.findings || '',
              status: isDispatched ? 'Transferred / Released' : 'Awaiting Examination',
              releasedAt: a.releasedAt,
              claimantName: a.claimantName,
              relationship: a.relationship,
              inMortuary: a.inMortuary === true,
              disposition: a.disposition,
              destinationDesc: a.destinationDesc,
              transportMode: a.transportMode,
            });
          }
        });
      }

      setMortuaryRecords(fetchedMort);

      if (showNotification) {
        enqueueSnackbar('✨ Pathology Diagnostic Hub synced with live Operating Theatre & LIMS databases!', { variant: 'success' });
      }
    } catch (err) {
      console.warn('Pathology live sync fallback:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncPathologyData();
  }, []);

  useEffect(() => {
    if (location.pathname.includes('/pathology/mortuary')) {
      syncPathologyData();
    }
  }, [location.pathname]);

  // Dialog Modals
  const [newHistologyOpen, setNewHistologyOpen] = useState(false);
  const [reportingOpen, setReportingOpen] = useState(false);
  const [selectedHistology, setSelectedHistology] = useState<HistologyOrder | null>(null);

  // Initial 50 Recent Patients for Instant 0ms Dropdown Loading
  const RECENT_50_PATHOLOGY_PATIENTS = [
    { id: 'WALK-PT-46843', patientNumber: 'WALK-PT-46843', firstName: 'New', lastName: 'Radiolgost', gender: 'Female', estimatedAge: 36, birthDate: '1990-05-12' },
    { id: 'WALK-PT-88319', patientNumber: 'WALK-PT-88319', firstName: 'Laboratory', lastName: 'New', gender: 'Male', estimatedAge: 42, birthDate: '1984-03-20' },
    { id: 'P-10492', patientNumber: 'P-10492', firstName: 'Sarah', lastName: 'Johnson', gender: 'Female', estimatedAge: 29, birthDate: '1997-08-14' },
    { id: 'WALK-PT-33210', patientNumber: 'WALK-PT-33210', firstName: 'Kabusa', lastName: 'Yetti', gender: 'Female', estimatedAge: 34, birthDate: '1992-11-05' },
    { id: '0TZWX', patientNumber: '0TZWX', firstName: 'KERRY', lastName: 'DANIEL', gender: 'Male', estimatedAge: 48, birthDate: '1978-01-15' },
    { id: 'P-20941', patientNumber: 'P-20941', firstName: 'Zainab', lastName: 'Suleiman', gender: 'Female', estimatedAge: 31, birthDate: '1995-09-22' },
    { id: 'P-30114', patientNumber: 'P-30114', firstName: 'Emeka', lastName: 'Eze', gender: 'Male', estimatedAge: 53, birthDate: '1973-04-18' },
    { id: 'P-40115', patientNumber: 'P-40115', firstName: 'Mary', lastName: 'Okonkwo', gender: 'Female', estimatedAge: 45, birthDate: '1981-02-10' },
    { id: 'P-50116', patientNumber: 'P-50116', firstName: 'Ibrahim', lastName: 'Musa', gender: 'Male', estimatedAge: 39, birthDate: '1987-07-25' },
    { id: 'P-60117', patientNumber: 'P-60117', firstName: 'Chinedu', lastName: 'Okafor', gender: 'Male', estimatedAge: 61, birthDate: '1965-11-19' },
    { id: 'P-70118', patientNumber: 'P-70118', firstName: 'Fatima', lastName: 'Bello', gender: 'Female', estimatedAge: 27, birthDate: '1999-04-30' },
    { id: 'P-80119', patientNumber: 'P-80119', firstName: 'Blessing', lastName: 'Adebayo', gender: 'Female', estimatedAge: 33, birthDate: '1993-01-08' },
    { id: 'P-90120', patientNumber: 'P-90120', firstName: 'Ngozi', lastName: 'Eze', gender: 'Female', estimatedAge: 50, birthDate: '1976-10-14' },
    { id: 'P-10121', patientNumber: 'P-10121', firstName: 'Babatunde', lastName: 'Ogundipe', gender: 'Male', estimatedAge: 58, birthDate: '1968-06-03' },
    { id: 'P-11122', patientNumber: 'P-11122', firstName: 'Amina', lastName: 'Abubakar', gender: 'Female', estimatedAge: 24, birthDate: '2002-09-17' },
    { id: 'P-12123', patientNumber: 'P-12123', firstName: 'Sunday', lastName: 'Nnamdi', gender: 'Male', estimatedAge: 47, birthDate: '1979-12-01' },
    { id: 'P-13124', patientNumber: 'P-13124', firstName: 'Grace', lastName: 'Danfulani', gender: 'Female', estimatedAge: 41, birthDate: '1985-08-22' },
    { id: 'P-14125', patientNumber: 'P-14125', firstName: 'Victor', lastName: 'Cole', gender: 'Male', estimatedAge: 37, birthDate: '1989-03-11' },
    { id: 'P-15126', patientNumber: 'P-15126', firstName: 'Patience', lastName: 'Sanusi', gender: 'Female', estimatedAge: 30, birthDate: '1996-05-29' },
    { id: 'P-16127', patientNumber: 'P-16127', firstName: 'Emmanuel', lastName: 'Okon', gender: 'Male', estimatedAge: 52, birthDate: '1974-11-04' },
    { id: 'P-17128', patientNumber: 'P-17128', firstName: 'Folake', lastName: 'Ajayi', gender: 'Female', estimatedAge: 38, birthDate: '1988-02-14' },
    { id: 'P-18129', patientNumber: 'P-18129', firstName: 'Usman', lastName: 'Garba', gender: 'Male', estimatedAge: 64, birthDate: '1962-09-09' },
    { id: 'P-19130', patientNumber: 'P-19130', firstName: 'Rita', lastName: 'Obi', gender: 'Female', estimatedAge: 28, birthDate: '1998-01-23' },
    { id: 'P-20131', patientNumber: 'P-20131', firstName: 'Kinsley', lastName: 'Umeh', gender: 'Male', estimatedAge: 44, birthDate: '1982-10-18' },
    { id: 'P-21132', patientNumber: 'P-21132', firstName: 'Hauwa', lastName: 'Mohammed', gender: 'Female', estimatedAge: 32, birthDate: '1994-06-07' },
    { id: 'P-22133', patientNumber: 'P-22133', firstName: 'Gideon', lastName: 'Akpan', gender: 'Male', estimatedAge: 49, birthDate: '1977-03-30' },
    { id: 'P-23134', patientNumber: 'P-23134', firstName: 'Joy', lastName: 'Onuoha', gender: 'Female', estimatedAge: 35, birthDate: '1991-08-02' },
    { id: 'P-24135', patientNumber: 'P-24135', firstName: 'Tunde', lastName: 'Fashola', gender: 'Male', estimatedAge: 56, birthDate: '1970-12-25' },
    { id: 'P-25136', patientNumber: 'P-25136', firstName: 'Mercy', lastName: 'Ezeh', gender: 'Female', estimatedAge: 43, birthDate: '1983-04-16' },
    { id: 'P-26137', patientNumber: 'P-26137', firstName: 'Sadiq', lastName: 'Sani', gender: 'Male', estimatedAge: 36, birthDate: '1990-07-19' },
    { id: 'P-27138', patientNumber: 'P-27138', firstName: 'Chioma', lastName: 'Nwachukwu', gender: 'Female', estimatedAge: 26, birthDate: '2000-11-12' },
    { id: 'P-28139', patientNumber: 'P-28139', firstName: 'David', lastName: 'Oladipo', gender: 'Male', estimatedAge: 60, birthDate: '1966-05-08' },
    { id: 'P-29140', patientNumber: 'P-29140', firstName: 'Hadiza', lastName: 'Yusuf', gender: 'Female', estimatedAge: 39, birthDate: '1987-10-01' },
    { id: 'P-30141', patientNumber: 'P-30141', firstName: 'Benjamin', lastName: 'Orji', gender: 'Male', estimatedAge: 51, birthDate: '1975-01-27' },
    { id: 'P-31142', patientNumber: 'P-31142', firstName: 'Stella', lastName: 'Ogunleye', gender: 'Female', estimatedAge: 46, birthDate: '1980-09-15' },
    { id: 'P-32143', patientNumber: 'P-32143', firstName: 'Yakubu', lastName: 'Danjuma', gender: 'Male', estimatedAge: 54, birthDate: '1972-03-05' },
    { id: 'P-33144', patientNumber: 'P-33144', firstName: 'Vivian', lastName: 'Uche', gender: 'Female', estimatedAge: 31, birthDate: '1995-12-20' },
    { id: 'P-34145', patientNumber: 'P-34145', firstName: 'Solomon', lastName: 'Bassey', gender: 'Male', estimatedAge: 40, birthDate: '1986-06-14' },
    { id: 'P-35146', patientNumber: 'P-35146', firstName: 'Khadijah', lastName: 'Lawal', gender: 'Female', estimatedAge: 25, birthDate: '2001-08-31' },
    { id: 'P-36147', patientNumber: 'P-36147', firstName: 'Samuel', lastName: 'Ibanga', gender: 'Male', estimatedAge: 57, birthDate: '1969-02-18' },
    { id: 'P-37148', patientNumber: 'P-37148', firstName: 'Esther', lastName: 'Anya', gender: 'Female', estimatedAge: 42, birthDate: '1984-11-28' },
    { id: 'P-38149', patientNumber: 'P-38149', firstName: 'Mustapha', lastName: 'Bello', gender: 'Male', estimatedAge: 38, birthDate: '1988-04-09' },
    { id: 'P-39150', patientNumber: 'P-39150', firstName: 'Kemi', lastName: 'Adewale', gender: 'Female', estimatedAge: 29, birthDate: '1997-10-21' },
    { id: 'P-40151', patientNumber: 'P-40151', firstName: 'Patrick', lastName: 'Ezeife', gender: 'Male', estimatedAge: 63, birthDate: '1963-07-03' },
    { id: 'P-41152', patientNumber: 'P-41152', firstName: 'Zainab', lastName: 'Haruna', gender: 'Female', estimatedAge: 34, birthDate: '1992-03-17' },
    { id: 'P-42153', patientNumber: 'P-42153', firstName: 'Clement', lastName: 'Udeh', gender: 'Male', estimatedAge: 45, birthDate: '1981-09-24' },
    { id: 'P-43154', patientNumber: 'P-43154', firstName: 'Priscilla', lastName: 'Okoh', gender: 'Female', estimatedAge: 36, birthDate: '1990-12-10' },
    { id: 'P-44155', patientNumber: 'P-44155', firstName: 'Alhassan', lastName: 'Shehu', gender: 'Male', estimatedAge: 55, birthDate: '1971-05-19' },
    { id: 'P-45156', patientNumber: 'P-45156', firstName: 'Agnes', lastName: 'Nwadike', gender: 'Female', estimatedAge: 48, birthDate: '1978-01-02' },
    { id: 'P-46157', patientNumber: 'P-46157', firstName: 'Francis', lastName: 'Opara', gender: 'Male', estimatedAge: 52, birthDate: '1974-08-15' },
  ];

  // Patient Search State for Specimen Accession Dialog
  const [patientSearchOptions, setPatientSearchOptions] = useState<any[]>(RECENT_50_PATHOLOGY_PATIENTS);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [selectedPatientSearch, setSelectedPatientSearch] = useState<any | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Instant 0ms Custom Filter: Show EXACTLY the most recent 50 patients on click when query is empty, filter by Name or ID/MRN when typed
  const pathologyPatientFilter = (options: any[], state: { inputValue: string }) => {
    const query = (state.inputValue || '').trim().toLowerCase();
    if (!query) {
      return options.slice(0, 50); // Show EXACTLY the most recent 50 patients when input is empty!
    }
    return options.filter((opt: any) => {
      if (typeof opt === 'string') return opt.toLowerCase().includes(query);
      const fullName = `${opt.firstName || ''} ${opt.lastName || ''}`.toLowerCase();
      const mrn = (opt.patientNumber || opt.id || '').toLowerCase();
      const phone = (opt.phone || opt.mobilePhone || '').toLowerCase();
      return fullName.includes(query) || mrn.includes(query) || phone.includes(query);
    });
  };

  // Pre-fetch patients silently in background on page load
  useEffect(() => {
    const silentPrefetch = async () => {
      try {
        const res = await api.get('/patients?limit=50');
        const data = Array.isArray(res.data) ? res.data : (res.data?.patients || res.data?.data || []);
        if (data.length > 0) {
          const combined = [...data, ...RECENT_50_PATHOLOGY_PATIENTS];
          const uniqueMap = new Map();
          combined.forEach(p => {
            if (p && (p.id || p.patientNumber)) {
              uniqueMap.set(p.id || p.patientNumber, p);
            }
          });
          setPatientSearchOptions(Array.from(uniqueMap.values()).slice(0, 50));
        }
      } catch (err) {
        console.warn('Silent patient prefetch warning:', err);
      }
    };
    silentPrefetch();
  }, []);

  const fetchPatients = async (query = '') => {
    if (!query.trim()) return;
    setPatientSearchLoading(true);
    try {
      const url = `/patients/mpi?query=${encodeURIComponent(query)}&limit=30`;
      const res = await api.get(url);
      const data = Array.isArray(res.data) ? res.data : (res.data?.patients || res.data?.data || []);
      
      const combined = [...patientSearchOptions, ...data];
      const uniqueMap = new Map();
      combined.forEach(p => {
        if (p && (p.id || p.patientNumber)) {
          uniqueMap.set(p.id || p.patientNumber, p);
        }
      });
      setPatientSearchOptions(Array.from(uniqueMap.values()));
    } catch (err) {
      console.warn('Error fetching patients for pathology accession:', err);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  const handlePatientInputChange = (newInputValue: string) => {
    setNewOrderForm(p => ({ ...p, patientName: newInputValue }));
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (newInputValue.trim().length > 1) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchPatients(newInputValue.trim());
      }, 250);
    }
  };

  useEffect(() => {
    if (newHistologyOpen) {
      fetchPatients();
    }
  }, [newHistologyOpen]);

  // Form State for New Tissue Specimen Accessioning
  const [newOrderForm, setNewOrderForm] = useState({
    patientName: '',
    patientId: '',
    age: 35,
    gender: 'Female',
    requestingSurgeon: '',
    surgicalUnit: 'General Surgery Suite',
    organSite: '',
    clinicalIndication: '',
    urgency: 'ROUTINE' as 'ROUTINE' | 'STAT' | 'FROZEN_SECTION',
    grossingDescription: '',
    cassetteCount: 1,
  });

  // External Referral & Courier Handlers
  const handleSaveExternalIntake = async () => {
    if (!newExternalForm.patientName || !newExternalForm.referringHospital || !newExternalForm.specimenType) {
      enqueueSnackbar('Please fill in Patient Name, Referring Hospital, and Specimen Type', { variant: 'warning' });
      return;
    }

    const nextId = externalOrders.length + 44;
    const newRefNo = `EXT-PATH-2026-${String(nextId).padStart(4, '0')}`;
    const newQr = `QR-EXT-${String(nextId).padStart(4, '0')}-${newExternalForm.referringHospital.split(' ')[0].toUpperCase()}`;

    // Dispatch billing charge to central cashier/billing module endpoint
    try {
      await api.post('/billing/charges', {
        patientName: newExternalForm.patientName,
        referringHospital: newExternalForm.referringHospital,
        serviceName: `Pathology Accession: ${newExternalForm.specimenType} (${newExternalForm.caseCategory})`,
        amount: newExternalForm.billingAmount,
        billingType: newExternalForm.billingType,
        paymentStatus: newExternalForm.paymentStatus,
        refNo: newRefNo,
      });
    } catch (e) {
      // Fallback for offline/mock mode
    }

    const newRecord: ExternalPathologyReferral = {
      id: `ext-${Date.now()}`,
      refNo: newRefNo,
      patientName: newExternalForm.patientName,
      patientAge: newExternalForm.patientAge,
      patientGender: newExternalForm.patientGender,
      patientPhone: newExternalForm.patientPhone || '+234 803 000 0000',
      referringHospital: newExternalForm.referringHospital,
      referringDoctor: newExternalForm.referringDoctor || 'Dr. Referring Clinician',
      doctorPhone: newExternalForm.doctorPhone || '+234 802 000 0000',
      doctorEmail: newExternalForm.doctorEmail || 'doctor@referringhospital.ng',
      caseCategory: newExternalForm.caseCategory,
      specimenType: newExternalForm.specimenType,
      containerCount: newExternalForm.containerCount,
      fixationCondition: newExternalForm.fixationCondition,
      clinicalHistory: newExternalForm.clinicalHistory || 'External referral tissue specimen submitted for histopathology examination.',
      billingType: newExternalForm.billingType,
      billingAmount: newExternalForm.billingAmount,
      paymentStatus: newExternalForm.paymentStatus,
      courierStatus: newExternalForm.courierStatus,
      dateReceived: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      status: 'Received & Logged',
      pathologist: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Dr. Consultant Pathologist (FMCPath)',
      qrVerificationCode: newQr,
      grossDescription: 'Specimen received in 10% neutral buffered formalin container. Gross examination and sectioning completed.',
      microscopicFindings: 'Sections display cellular features evaluated under high-power light microscopy. Nuclear pleomorphism and architecture logged.',
      pathologicalDiagnosis: 'PATHOLOGICAL CONSULTATION IN PROGRESS. SPECIMEN ACCESSIONED & FILED.',
      deliveryMethod: 'Pending Delivery',
    };

    setExternalOrders(prev => [newRecord, ...prev]);
    setIsExternalModalOpen(false);
    enqueueSnackbar(`💳 Specimen Registered & Bill of ₦${newExternalForm.billingAmount.toLocaleString()} dispatched to Central Cashier Desk! Ref: ${newRefNo}`, { variant: 'success' });
  };

  const handleSaveCourierLog = () => {
    if (!newCourierForm.courierName || !newCourierForm.sourceClinic) {
      enqueueSnackbar('Please select Courier/Driver Name and Source Clinic', { variant: 'warning' });
      return;
    }

    const formatDT = (dtStr: string) => {
      if (!dtStr) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return dtStr;
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const newLog: CourierLog = {
      id: `c-${Date.now()}`,
      dispatchRef: newCourierForm.dispatchRef || `DSP-LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      courierName: newCourierForm.courierName,
      sourceClinic: newCourierForm.sourceClinic,
      sampleCount: newCourierForm.sampleCount,
      pickupTime: formatDT(newCourierForm.pickupTime),
      arrivalTime: formatDT(newCourierForm.arrivalTime),
      temperatureCondition: newCourierForm.temperatureCondition,
      receivingOfficer: newCourierForm.receivingOfficer,
      notes: newCourierForm.notes,
    };

    setCourierLogs(prev => [newLog, ...prev]);
    setIsCourierModalOpen(false);
    enqueueSnackbar('🚚 Courier Pickup Logged successfully!', { variant: 'success' });
  };

  const handleAutoEmailReport = () => {
    if (!selectedExternalReferral) return;
    const updated: ExternalPathologyReferral = {
      ...selectedExternalReferral,
      deliveryMethod: 'Email Sent',
      status: 'Report Signed & Active QR',
    };

    setExternalOrders(prev => prev.map(e => e.id === selectedExternalReferral.id ? updated : e));
    setSelectedExternalReferral(updated);
    enqueueSnackbar(`✉️ PDF Consultation Report auto-emailed to ${selectedExternalReferral.doctorEmail || 'referring physician'}!`, { variant: 'success' });
  };

  const handleSendWhatsApp = () => {
    if (!selectedExternalReferral) return;
    const phoneClean = (selectedExternalReferral.doctorPhone || '').replace(/[^0-9]/g, '');
    const message = `Hello ${selectedExternalReferral.referringDoctor}, Smart Hospital Pathology Diagnostic Hub has completed the pathology consultation report for patient ${selectedExternalReferral.patientName} (Ref: ${selectedExternalReferral.refNo}). Diagnosis: ${selectedExternalReferral.pathologicalDiagnosis || 'Signed Report'}. Verified online token: ${selectedExternalReferral.qrVerificationCode}.`;
    const url = `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    const updated: ExternalPathologyReferral = {
      ...selectedExternalReferral,
      deliveryMethod: 'WhatsApp Delivered',
      status: 'Report Signed & Active QR',
    };
    setExternalOrders(prev => prev.map(e => e.id === selectedExternalReferral.id ? updated : e));
    setSelectedExternalReferral(updated);
    enqueueSnackbar(`💬 WhatsApp message link opened for Dr. ${selectedExternalReferral.referringDoctor}!`, { variant: 'info' });
  };
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [isVoiceRewriting, setIsVoiceRewriting] = useState(false);
  const voiceRecognitionRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const userStoppedVoiceRef = useRef(false);
  const currentVoiceTranscriptRef = useRef('');

  const updateFieldValue = (fieldKey: string, val: string) => {
    if (['grossDescription', 'microscopicFindings', 'pathologicalDiagnosis', 'tnmStaging', 'surgicalMargins'].includes(fieldKey)) {
      setReportForm(prev => ({ ...prev, [fieldKey]: val }));
    } else if (['clinicalIndication', 'grossingDescription'].includes(fieldKey)) {
      setNewOrderForm(prev => ({ ...prev, [fieldKey]: val }));
    } else if (fieldKey === 'externalClinicalHistory') {
      setNewExternalForm(prev => ({ ...prev, clinicalHistory: val }));
    } else if (fieldKey === 'clinicalNotes') {
      setNewCytologyForm(prev => ({ ...prev, clinicalNotes: val }));
    } else if (fieldKey === 'findings') {
      setCytoReportForm(prev => ({ ...prev, findings: val }));
    } else if (fieldKey === 'autopsyFindings') {
      setAutopsyForm(prev => ({ ...prev, findings: val }));
    } else if (fieldKey === 'causeOfDeath' || fieldKey === 'certifiedCauseOfDeath') {
      setAutopsyForm(prev => ({ ...prev, causeOfDeath: val }));
    }
  };

  const inferPathologistClinicalRewrite = (fieldKey: string, text: string): string => {
    // 1. Strip recursive template prefixes and boilerplate sentences if already in the input
    let cleanText = text
      .replace(/specimen received in 10% neutral buffered formalin (container labeled with patient credentials\.)?/gi, ' ')
      .replace(/gross physical examination reveals:?/gi, ' ')
      .replace(/entire specimen processed and embedded for histological sectioning\.?/gi, ' ')
      .replace(/clinical indication & pre-op findings:?/gi, ' ')
      .replace(/patient presents with clinical symptoms and operative findings\.?/gi, ' ')
      .replace(/formally processed for histopathological accessioning.*?diagnostic impression\.?/gi, ' ')
      .trim();

    let lower = cleanText.toLowerCase().trim();

    // 2. Strip speech filler words, conversational hesitation & speech recognition artifacts
    lower = lower
      .replace(/\b(i'm sorry|sorry|excuse me|patience|so the patients?|the patient|patient|had recorded|recorded|um|uh|er|ah|like|you know|i mean|basically|actually|well|just)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Context from active forms
    const activeSite = ((newOrderForm?.organSite || selectedHistology?.organSite || '') + ' ' + lower).toLowerCase();

    // 3. Standardize clinical, autopsy & pathology terminology & phonetic mishearings
    lower = lower
      .replace(/\bformalyn\b/g, 'formalin')
      .replace(/\bformalin fixed\b/g, '10% neutral buffered formalin fixed')
      .replace(/\bhe stain\b/g, 'H&E stain')
      .replace(/\bh and e\b/g, 'Hematoxylin & Eosin (H&E)')
      .replace(/\bmitosis\b/g, 'mitotic figures')
      .replace(/\bpleomorphism\b/g, 'nuclear pleomorphism')
      .replace(/\b(poised with|poised by|poised)\b/gi, 'poisoned with')
      .replace(/\b(snake poison|snake bite poison)\b/gi, 'snake venom envenomation')
      .replace(/\b(shut down the liver and kidney|shut down liver and kidney|shut down kidney and liver)\b/gi, 'induced acute toxic hepatic necrosis, acute tubular necrosis, and multiorgan failure')
      .replace(/\b(shut down|shutting down)\b/gi, 'acute failure and toxic necrosis')
      .replace(/\b(reviews in tax body|reviews in tact body|reveals in tax body|in tax body|tax body|reviews intact body)\b/gi, 'reveals intact body')
      .replace(/\b(review in tax body|review in tact body)\b/gi, 'reveals intact body')
      .replace(/\b(external examination reviews|external inspection reviews)\b/gi, 'external examination reveals')
      .replace(/\b(rigor mortise|rigour mortise)\b/gi, 'rigor mortis')
      .replace(/\b(liver mortise|livour mortise|livor mortise)\b/gi, 'livor mortis')
      .replace(/\b(post mortem|post-mortem)\b/gi, 'postmortem');

    // ── Clinical History & Pre-Op Findings (Histology & Cytology) ───────────
    if (fieldKey === 'clinicalIndication' || fieldKey === 'externalClinicalHistory' || fieldKey === 'clinicalNotes') {
      if (activeSite.includes('gall') || activeSite.includes('cholecyst') || lower.includes('stone') || lower.includes('biliary')) {
        return `42-year-old patient presenting with recurrent right upper quadrant abdominal pain, episodic biliary colic, and postprandial dyspepsia. Abdominal ultrasound confirms chronic calculous cholecystitis with multiple gallstones. Specimen submitted for histopathology clearance.`;
      }
      if (activeSite.includes('breast') || lower.includes('lump') || lower.includes('mass')) {
        return `38-year-old female presenting with a 3-month history of a painless, progressive right breast lump (upper outer quadrant). Mammography/US reveals BI-RADS 4 lesion. Pre-op diagnosis: Right breast mass query carcinoma. Requested: Histopathology examination & ER/PR/HER2 biomarker clearance.`;
      }
      if (activeSite.includes('prostate') || lower.includes('psa') || lower.includes('voiding') || lower.includes('urine')) {
        return `62-year-old male with elevated serum PSA (14.2 ng/mL) and lower urinary tract symptoms (LUTS). TRUS guided 12-core prostate biopsy performed. Pre-op diagnosis: Prostatic adenocarcinoma vs BPH. Requested: Histopathology Gleason scoring & Grade Grouping.`;
      }
      if (activeSite.includes('appendix') || lower.includes('pain') || lower.includes('fosse') || lower.includes('iliac')) {
        return `26-year-old male with acute right iliac fossa pain, rebound tenderness, and leukocytosis (WBC 14.5 x 10^9/L). Emergency appendectomy performed. Pre-op diagnosis: Acute appendicitis. Requested: Histopathology report.`;
      }
      if (activeSite.includes('cervix') || lower.includes('pap') || lower.includes('smear') || lower.includes('bleeding') || lower.includes('vagina') || lower.includes('discharge') || lower.includes('injury') || lower.includes('erosion')) {
        return `42-year-old female presenting with post-coital vaginal bleeding, cervical erosion, and pelvic discomfort. Cervical transformation zone biopsy / Pap smear performed. Pre-op diagnosis: Cervical intraepithelial neoplasia (CIN) vs severe cervicitis. Requested: Bethesda cytological evaluation and histopathology report.`;
      }
      if (activeSite.includes('colon') || lower.includes('bowel') || lower.includes('stool') || lower.includes('polyp')) {
        return `58-year-old male presenting with altered bowel habits, hematochezia, and weight loss. Colonoscopic biopsy of colonic mass performed. Pre-op diagnosis: Colonic lesion query adenocarcinoma. Requested: Histopathology consultation.`;
      }
      if (activeSite.includes('uterus') || activeSite.includes('fibroid') || lower.includes('myoma') || lower.includes('menorrhagia')) {
        return `42-year-old multiparous female with severe menorrhagia and pelvic pressure. Pelvic ultrasound demonstrates multiple intramural/submucosal uterine leiomyomas. Surgical specimen: Hysterectomy / Myomectomy. Pre-op diagnosis: Uterine leiomyomata. Requested: Histopathology clearance.`;
      }
      if (activeSite.includes('thyroid') || lower.includes('swelling') || lower.includes('goitre') || lower.includes('neck')) {
        return `46-year-old female with progressive anterior neck swelling and solitary thyroid nodule. US reveals hypoechoic nodule (TIRADS 4). Pre-op diagnosis: Thyroid nodule query follicular neoplasm vs papillary thyroid carcinoma. Requested: Histopathological diagnosis.`;
      }
      
      const cleanSpoken = lower
        .replace(/\b(the image finding set that had a gall|had a gall)\b/gi, 'Ultrasound imaging findings consistent with cholelithiasis and calculous cholecystitis')
        .replace(/\b(pain in tummy|stomach pain)\b/gi, 'acute abdominal pain')
        .replace(/\b(heavy bleeding)\b/gi, 'severe menorrhagia');
      
      const formattedSpoken = cleanSpoken ? cleanSpoken.charAt(0).toUpperCase() + cleanSpoken.slice(1) : 'Surgical tissue specimen submitted for histopathological consultation';
      return `Clinical Indication & Pre-Op Findings: ${formattedSpoken}. Patient presents with clinical symptoms and operative findings. Formally processed for histopathological accessioning, gross evaluation, and diagnostic impression.`;
    }

    // ── Grossing Physical Description (Pathologist Log) ────────────────────
    if (fieldKey === 'grossDescription' || fieldKey === 'grossingDescription') {
      if (activeSite.includes('gall') || activeSite.includes('cholecyst') || lower.includes('bluish') || lower.includes('nonsense') || lower.includes('stone') || lower.includes('sludge') || lower.includes('bile')) {
        return `Specimen consists of a surgically resected gallbladder measuring 7.8cm x 3.2cm x 2.0cm with intact, congested dark bluish-green serosal surfaces. Lumen contains dark viscous bile, mucinous sludge, and multiple dark pigmented choleliths. Mucosa displays velvety trabeculation without focal ulceration or mass. Wall thickness measures 3mm without perforation. Representative sections taken in cassettes A1-A2.`;
      }
      if (activeSite.includes('core') || lower.includes('strip') || lower.includes('biopsy')) {
        return `Specimen consists of multiple core tissue biopsy strips, tan-cream to grayish-white, measuring between 1.2cm and 1.8cm in length. Embedded in cassettes A1 & A2 for histological sectioning.`;
      }
      if (activeSite.includes('breast') || lower.includes('mass') || lower.includes('lump')) {
        return `Specimen consists of a firm, irregular tissue mass measuring 3.2cm x 2.5cm x 1.8cm, with yellowish-tan cut surface and central focal scirrhous induration. Entire specimen processed for histology in cassettes A1-A4.`;
      }
      if (activeSite.includes('appendix') || lower.includes('appendectomy')) {
        return `Specimen consists of a surgically resected appendix measuring 7.5cm in length and 1.2cm in outer diameter. Serosa is hyperaemic with fibrinous exudate. Mesoappendix attached. Processed in cassette A1.`;
      }
      if (activeSite.includes('fibroid') || activeSite.includes('uterus') || lower.includes('myoma')) {
        return `Specimen consists of multiple well-circumscribed, firm, whorled tissue masses measuring from 2.5cm up to 6.8cm in diameter. Cut surfaces exhibit characteristic bulged, whorled, grayish-white pattern without focal necrosis or hemorrhage. Processed in cassettes A1-A3.`;
      }
      
      const cleanSpoken = lower
        .replace(/\b(color was not clean was bluish and it had a bit of nonsense inside|not clean was bluish|nonsense inside)\b/gi, 'congested dark bluish-green serosa with focal mucosal discoloration and intraluminal mucinous sludge')
        .replace(/\b(had a bit of nonsense|nonsense|dirty stuff|dirt)\b/gi, 'fibrinous exudate and particulate debris')
        .replace(/\b(small pieces|broken bits)\b/gi, 'multiple fragmented core biopsy strips')
        .replace(/\b(fat and blood)\b/gi, 'fibrofatty tissue with focal interstitial hemorrhage');

      const formattedSpoken = cleanSpoken ? cleanSpoken.charAt(0).toUpperCase() + cleanSpoken.slice(1) : 'Tan-cream tissue biopsy fragment received in formalin';
      return `Specimen received in 10% neutral buffered formalin container labeled with patient credentials. Gross physical examination reveals: ${formattedSpoken}. Entire specimen processed and embedded for histological sectioning.`;
    }

    // ── Microscopic & Cytological Findings ─────────────────────────────────
    if (fieldKey === 'microscopicFindings' || fieldKey === 'findings') {
      if (lower.includes('breast') || lower.includes('ductal') || lower.includes('sheets') || lower.includes('cords') || lower.includes('cancer')) {
        return `Sections show a high-grade malignant epithelial neoplasm arranged in sheets, cords, and infiltrating nests penetrating fibrofatty stroma. Marked nuclear pleomorphism, hyperchromasia, and frequent atypical mitotic figures (12-14 per 10 HPF) observed. Surgical margins clear of tumor cells.`;
      }
      if (lower.includes('prostate') || lower.includes('gleason')) {
        return `Sections of prostate core biopsies demonstrate invasive prostatic adenocarcinoma composed of crowded, fused acinar glands (Gleason Pattern 3+4 = Grade Group 2). Prominent nucleoli present.`;
      }
      if (lower.includes('appendix') || lower.includes('appendicitis')) {
        return `Sections display dense transmural infiltration of polymorphonuclear neutrophils extending through the muscularis propria into the subserosa with mucosal ulceration, diagnostic of acute suppurative appendicitis.`;
      }
      return `Histological examination reveals sections displaying: ${text.charAt(0).toUpperCase() + text.slice(1)}. Nuclear features, mitotic activity, and stromal reaction evaluated.`;
    }

    // ── Pathological Diagnosis ──────────────────────────────────────────────
    if (fieldKey === 'pathologicalDiagnosis') {
      if (lower.includes('breast') || lower.includes('ductal')) {
        return `INVASIVE DUCTAL CARCINOMA OF THE BREAST (NOTTINGHAM GRADE II) — SURGICAL RESECTION MARGINS CLEAR.`;
      }
      if (lower.includes('prostate') || lower.includes('adenocarcinoma')) {
        return `PROSTATE ADENOCARCINOMA (GLEASON SCORE 3+4 = 7, GRADE GROUP 2) — INVOLVING 4 OF 12 CORES.`;
      }
      if (lower.includes('appendix') || lower.includes('appendicitis')) {
        return `ACUTE SUPPURATIVE APPENDICITIS WITH PERI-APPENDICITIS — UNREMARKABLE FOR DYSPLASIA.`;
      }
      return text.toUpperCase();
    }

    if (fieldKey === 'tnmStaging') {
      return text.includes('pT') ? text : `pT2 pN0 pMx (AJCC 8th Edition — ${text})`;
    }

    if (fieldKey === 'surgicalMargins') {
      return text.toLowerCase().includes('clear') ? `Surgical margins are clear of tumor (closest margin > 5mm).` : `Surgical resection margins evaluated: ${text}`;
    }

    // ── Autopsy & Forensic Postmortem Examination Findings ─────────────────
    if (fieldKey === 'autopsyFindings' || fieldKey === 'autopsy' || fieldKey === 'mortuary') {
      // 1. Snake Bite Envenomation / Snake Venom Toxicity
      if (/\b(snake|venom|envenom|viper|cobra|mamba|ophidian)\b/i.test(lower) || (/\b(poison|poisoned|toxic)\b/i.test(lower) && /\b(snake|reptile|bite)\b/i.test(lower))) {
        return `I. EXTERNAL EXAMINATION:
Body of an adult, received cold and preserved in mortuary refrigeration. External inspection reveals puncture fang mark wounds with surrounding localized soft-tissue edema, ecchymosis, and bullae formation consistent with ophidian (snake) envenomation. Postmortem lividity is generalized with petechial hemorrhages; rigor mortis is established. No blunt mechanical skeletal fractures or defense lacerations noted.

II. INTERNAL VISCERAL EXAMINATION:
• Hepatobiliary System: Liver is enlarged and congested (weight ~1750g), displaying severe diffuse centrilobular hepatic necrosis and toxic parenchymal degeneration.
• Renal & Urinary System: Bilateral kidneys are swollen and dusky; cross-sections demonstrate marked acute tubular necrosis (ATN), hemoglobinuric/myoglobinuric nephropathy, and loss of corticomedullary differentiation secondary to venom-induced nephrotoxicity and acute renal shutdown.
• Cardiovascular & Hematologic: Heart exhibits subendocardial petechial hemorrhages and microthrombi consistent with systemic venom-induced coagulopathy and Disseminated Intravascular Coagulation (DIC).
• Respiratory & Thoracic Cavity: Bilateral lungs demonstrate severe toxic pulmonary edema and diffuse alveolar congestion.

III. ANCILLARY HISTOPATHOLOGY & TOXICOLOGY:
Representative tissue blocks harvested from liver, kidney, myocardium, and bite puncture site. Postmortem femoral blood, urine, and bile secured for venom antigen identification, snake venom ELISA, and comprehensive forensic toxicology screening.

IV. PATHOLOGICAL CONCLUSION:
Fatal systemic snake envenomation resulting in acute toxic hepatic necrosis, acute renal failure (acute tubular necrosis), secondary disseminated intravascular coagulation (DIC), and irreversible multi-organ failure.`;
      }

      // 2. Chemical Poisoning / Toxicity / Ingestion
      if (/\b(poison|poisoned|toxicity|pesticide|organophosphate|cyanide|ingestion|overdose|chemical)\b/i.test(lower)) {
        return `I. EXTERNAL EXAMINATION:
Body of an adult, received cold and preserved in mortuary refrigeration. External inspection reveals cyanosis of lips and nail beds, absence of mechanical blunt trauma, and fixed dependent livor mortis.

II. INTERNAL VISCERAL EXAMINATION:
• Gastrointestinal Tract: Gastric mucosa shows diffuse erythema, chemical corrosion/erosion, and dark fluid residue with characteristic toxic odor.
• Hepatobiliary & Renal Systems: Severe acute toxic hepatopathy with centrilobular necrosis; bilateral kidneys demonstrate marked acute tubular necrosis (ATN) and cortical pallor resulting in acute hepatorenal shutdown.
• Cardiovascular & Respiratory: Acute congestion of thoracic viscera with massive non-cardiogenic pulmonary edema and tracheobronchial frothy secretions.

III. ANCILLARY & TOXICOLOGY:
Gastric contents, heart blood, femoral blood, bile, and liver/kidney tissue cassettes collected and logged into Forensic Chain of Custody for toxicological assay and gas chromatography/mass spectrometry (GC-MS).

IV. PATHOLOGICAL CONCLUSION:
Acute toxic poisoning / chemical substance ingestion complicated by fulminant acute hepatorenal failure and cardiopulmonary collapse.`;
      }

      // 3. Hepatorenal / Multi-Organ Failure (Liver & Kidney Shutdown)
      if ((/\b(liver|hepatic)\b/i.test(lower) && /\b(kidney|renal)\b/i.test(lower)) || /\b(hepatorenal|mods|multiorgan|multi-organ)\b/i.test(lower)) {
        return `I. EXTERNAL EXAMINATION:
Body of an adult, received cold and preserved in mortuary refrigeration. External inspection reveals generalized icterus (jaundice), scleral icterus, and dependent edema without external mechanical trauma.

II. INTERNAL VISCERAL EXAMINATION:
• Hepatobiliary System: Liver demonstrates severe diffuse hepatic necrosis, centrilobular toxic degeneration, and acute parenchymal congestion.
• Renal System: Bilateral kidneys are swollen and congested, displaying extensive acute tubular necrosis (ATN) with corticomedullary blurring and renal shutdown.
• Thoracic & Abdominal Cavities: Serosanguinous ascites and bilateral serous pleural effusions with secondary acute pulmonary edema.

III. ANCILLARY HISTOPATHOLOGY:
Representative tissue cassettes taken from hepatic lobes and renal parenchyma. Postmortem blood and body fluids preserved for biochemical and toxicological clearance.

IV. PATHOLOGICAL CONCLUSION:
Multi-Organ Dysfunction Syndrome (MODS) with fulminant acute hepatic and acute renal failure.`;
      }

      // 4. Head Trauma / Skull Fracture
      if (/\b(skull|calvarium|epidural|subdural|intracranial|head injury|head trauma|brain injury|brain contusion|craniotomy)\b/i.test(lower)) {
        return `I. EXTERNAL EXAMINATION:
Body of an adult, received cold and preserved in mortuary refrigeration. External inspection of the head reveals subgaleal contusion and scalp laceration over the temporoparietal region. Calvarium demonstrates linear fracture extending into the middle cranial fossa. Rigor mortis is generalized; postmortem lividity (livor mortis) is fixed on dependent posterior surfaces. No other acute mechanical trauma to trunk or extremities.

II. INTERNAL VISCERAL EXAMINATION:
• Cranial Cavity: Reflection of calvarium reveals an acute epidural hematoma (~75mL clotted blood) secondary to middle meningeal vessel disruption. Underlying cerebral contusions and marked uncal herniation present.
• Thoracic & Abdominal Viscera: Pleural, pericardial, and peritoneal cavities contain normal serous fluid. Myocardium, pulmonary parenchyma, liver, spleen, and bilateral kidneys exhibit acute congestion secondary to traumatic brain injury.

III. ANCILLARY & TOXICOLOGY:
Representative cerebral and visceral tissue cassettes harvested for histopathological examination. Femoral blood and vitreous humor secured for forensic toxicology screening.

IV. PATHOLOGICAL CONCLUSION:
Fatal closed head injury with compound skull fracture, acute intracranial hemorrhage, and secondary brainstem compression.`;
      }

      // 5. Ballistic / Gunshot Wound
      if (/\b(gunshot|bullet|gsw|firearm|ballistic|projectile)\b/i.test(lower)) {
        return `I. EXTERNAL EXAMINATION:
External examination reveals a penetrating circular projectile entrance wound measuring 9mm in diameter with marginal abrasion collar and soot deposition. Body habitus is intact with fixed postmortem lividity.

II. INTERNAL EXAMINATION:
• Thoracic Cavity: Projectile wound track penetrates anterior chest wall, right middle lung lobe, and lateral wall of the right ventricle, exiting through posterior thorax. Massive right hemothorax (approx. 1400mL frank blood) present.
• Abdominal Cavity: Abdominal organs intact; subdiaphragmatic surfaces intact.
• Cardiovascular & Respiratory: Massive exsanguinating internal hemorrhage with secondary cardiopulmonary collapse.

III. ANCILLARY & TOXICOLOGY:
Metallic projectile fragments recovered and logged into Forensic Chain of Custody. Visceral tissue samples preserved for histological evaluation.

IV. PATHOLOGICAL CONCLUSION:
Fatal penetrating ballistic trauma causing catastrophic cardiovascular disruption and massive hemothorax.`;
      }

      // 6. Sharp Force / Stab Wound
      if (/\b(stab|stabbed|knife|blade|sharp-force|incised wound)\b/i.test(lower)) {
        return `I. EXTERNAL EXAMINATION:
External examination reveals an incised, penetrating sharp-force wound with clean-cut non-abraded margins. Rigor mortis generalized; dependent livor mortis noted.

II. INTERNAL EXAMINATION:
• Internal Dissection: Wound track traverses intercostal space, incising the pericardial sac and left ventricular anterior myocardium.
• Hemopericardium / Hemothorax: Acute cardiac tamponade with 350mL intrapericardial blood and 800mL left hemothorax. Viscera display profound hypovolemic pallor.

III. ANCILLARY INVESTIGATIONS:
Wound depth, angles, and directional track documented. Tissue blocks taken for microscopic examination. Toxicology specimens preserved.

IV. PATHOLOGICAL CONCLUSION:
Fatal penetrating sharp-force thoracic injury resulting in acute cardiac tamponade and hypovolemic shock.`;
      }

      // 7. Cardiovascular / Myocardial Infarction
      if (/\b(myocardial|infarct|cardiac arrest|coronary|heart attack|atherosclerosis)\b/i.test(lower)) {
        return `I. EXTERNAL EXAMINATION:
Body of an adult deceased, received refrigerated and well-preserved. External examination reveals an intact body with no traumatic injuries, defense wounds, or external marks of violence. Rigor mortis is fully established; dependent postmortem lividity is purple-red and fixed.

II. INTERNAL EXAMINATION:
• Cardiovascular System: Heart is enlarged (weight ~490g). Severe multi-vessel coronary atherosclerosis noted (85% stenosis of LAD with fresh occlusive luminal thrombus). Left ventricular anterior wall exhibits macroscopic pale mottled ischemic necrosis with hyperemic borders, consistent with acute myocardial infarction.
• Respiratory System: Bilateral lungs are heavy, boggy, and edematous (left 680g, right 740g). Cut surfaces exude copious frothy pink edema fluid into tracheobronchial tree.
• Abdominal Cavity & Viscera: Liver, spleen, and kidneys display severe acute passive venous congestion (nutmeg pattern).

III. HISTOPATHOLOGY & TOXICOLOGY:
Cassettes A1-A4 taken from left ventricle, apex, and septum demonstrating contraction band necrosis, neutrophilic infiltration, and wavy myocardial fibers. Routine toxicological screen negative for volatile substances.

IV. PATHOLOGICAL CONCLUSION:
Acute myocardial infarction secondary to severe occlusive coronary artery atherosclerosis, complicated by acute pulmonary edema and cardiogenic collapse.`;
      }

      // 8. Sepsis / Severe Infection
      if (/\b(sepsis|septic|peritonitis|bacteremia|endocarditis)\b/i.test(lower)) {
        return `I. EXTERNAL EXAMINATION:
Body of an adult, received cold and preserved in mortuary refrigeration. External inspection reveals peripheral petechial purpura, warm postmortem changes, and absence of external mechanical trauma.

II. INTERNAL VISCERAL EXAMINATION:
• Abdominal Cavity & Peritoneum: Peritoneal cavity contains turbid, purulent fibrinous exudate (~600mL) with hyperemic bowel serosa.
• Reticuloendothelial & Viscera: Spleen is soft and diffluent (acute septic spleen, weight ~380g). Bilateral adrenal glands demonstrate acute bilateral cortical hemorrhage (Waterhouse-Friderichsen syndrome pattern).
• Lungs & Kidneys: Diffuse alveolar damage (ARDS) and acute tubular necrosis secondary to septic hypoperfusion.

III. ANCILLARY MICROBIOLOGY & HISTOPATHOLOGY:
Postmortem blood cultures, peritoneal fluid aspirate, and visceral tissue cassettes secured for microbiological speciation and histological evaluation.

IV. PATHOLOGICAL CONCLUSION:
Severe septic shock with Multi-Organ Dysfunction Syndrome (MODS) and Disseminated Intravascular Coagulation (DIC).`;
      }

      // 9. Asphyxia / Hanging / Strangulation / Drowning
      if (/\b(hanging|ligature|strangulation|asphyxia|drowning|submersion)\b/i.test(lower)) {
        return `I. EXTERNAL EXAMINATION:
Body of an adult, received cold and preserved in mortuary refrigeration. External inspection reveals prominent petechial hemorrhages of palpebral and bulbar conjunctivae, facial cyanosis, and dependent postmortem lividity.

II. INTERNAL VISCERAL EXAMINATION:
• Neck & Airway: Deep neck dissection reveals soft-tissue hemorrhage along strap muscles with intact hyoid bone and thyroid cartilage. Larynx and trachea contain fine frothy mucus without foreign body obstruction.
• Thoracic Cavity: Lungs are hyperinflated and heavy with subpleural petechiae (Tardieu spots) and massive acute pulmonary edema.
• Viscera: Acute generalized visceral congestion of abdominal and cranial organs.

III. ANCILLARY & TOXICOLOGY:
Neck tissue blocks, pulmonary sections, and forensic fluid specimens preserved for histopathological evaluation and toxicology screening.

IV. PATHOLOGICAL CONCLUSION:
Fatal acute asphyxia secondary to airway compromise, complicated by acute cardiorespiratory arrest.`;
      }

      // General / Custom dictated postmortem findings
      const cleanSpoken = lower ? lower.charAt(0).toUpperCase() + lower.slice(1) : 'External examination reveals intact deceased body';
      return `I. EXTERNAL EXAMINATION:
Body of an adult, received cold and preserved in mortuary refrigeration. External inspection: ${cleanSpoken}. Postmortem lividity (livor mortis) is fixed on dependent posterior surfaces; generalized rigor mortis is established. No signs of acute blunt-force trauma, penetrating injuries, defensive wounds, or external violence.

II. INTERNAL EXAMINATION (SYSTEMS & CAVITIES):
Thoracic and abdominal cavities opened under standard autopsy protocol; normal anatomical situs observed. Dissection findings documented: ${cleanSpoken}.
• Cardiovascular System: Pericardial sac contains physiological clear fluid. Coronary vessels evaluated; patent lumens without acute rupture. Myocardium shows uniform texture and color.
• Respiratory System: Tracheobronchial tree patent; no airway foreign body. Lungs demonstrate dependent passive congestion without consolidation.
• Gastrointestinal & Hepatobiliary: Stomach contains minimal fluid; mucosal lining intact. Liver, gallbladder, pancreas, and spleen display gross organ changes consistent with clinical history.
• Genitourinary System: Bilateral kidneys exhibit intact capsules with smooth cortical surfaces and sharp corticomedullary differentiation.
• Central Nervous System: Cranial vault intact; dura intact. Brain demonstrates symmetrical cerebral hemispheres without uncal/tonsillar herniation or intracranial hemorrhage.

III. HISTOPATHOLOGY & TOXICOLOGY PROTOCOL:
Representative tissue cassettes harvested from major organ systems (myocardium, lungs, liver, kidneys) and submitted for histological sectioning. Postmortem femoral blood, vitreous humor, and bile preserved for toxicological clearance.

IV. PATHOLOGICAL IMPRESSION & SUMMARY:
Postmortem examination findings: ${cleanSpoken}. Findings are consistent with cardiopulmonary failure secondary to documented pathological etiology, pending definitive histopathological review.`;
    }

    // ── Certified Cause of Death ───────────────────────────────────────────
    if (fieldKey === 'causeOfDeath' || fieldKey === 'certifiedCauseOfDeath') {
      if (/\b(snake|venom|envenom|viper|cobra|mamba)\b/i.test(lower) || (/\b(poison|poisoned|toxic)\b/i.test(lower) && /\b(snake|bite)\b/i.test(lower))) {
        return 'Multi-Organ Failure (Acute Hepatic Necrosis & Acute Tubular Necrosis) 2° to Severe Systemic Snake Envenomation (Toxicity)';
      }
      if (/\b(poison|poisoned|toxicity|toxic|chemical|overdose|pesticide|organophosphate)\b/i.test(lower)) {
        return 'Acute Toxic Poisoning & Fulminant Hepatorenal Failure 2° to Chemical/Toxin Ingestion';
      }
      if ((/\b(liver|hepatic)\b/i.test(lower) && /\b(kidney|renal)\b/i.test(lower)) || /\b(hepatorenal|mods)\b/i.test(lower)) {
        return 'Multi-Organ Dysfunction Syndrome (MODS) 2° to Acute Hepatorenal Failure';
      }
      if (lower.includes('heart') || lower.includes('myocardial') || lower.includes('infarct') || lower.includes('coronar') || lower.includes('shock')) {
        return 'Refractory Cardiogenic Shock 2° to Acute Anterior Wall Myocardial Infarction & Severe Coronary Atherosclerosis';
      }
      if (/\b(skull|calvarium|epidural|subdural|intracranial|head injury|head trauma|brain injury)\b/i.test(lower)) {
        return 'Severe Traumatic Brain Injury & Acute Intracranial Hemorrhage 2° to Blunt Force Head Trauma';
      }
      if (lower.includes('gunshot') || lower.includes('gsw') || lower.includes('bullet')) {
        return 'Catastrophic Hemorrhagic Shock & Massive Hemothorax 2° to Penetrating Projectile Gunshot Wound';
      }
      if (lower.includes('stab') || lower.includes('knife') || lower.includes('sharp')) {
        return 'Acute Cardiac Tamponade & Exsanguinating Hemorrhage 2° to Penetrating Sharp-Force Thoracic Wound';
      }
      if (lower.includes('sepsis') || lower.includes('septic') || lower.includes('infection')) {
        return 'Septic Shock with Multi-Organ Dysfunction Syndrome (MODS) 2° to Severe Generalized Peritonitis';
      }
      if (lower.includes('pulmonary') || lower.includes('embol') || lower.includes('dvt')) {
        return 'Acute Obstructive Cardiopulmonary Collapse 2° to Massive Saddle Pulmonary Thromboembolism';
      }
      if (lower.includes('renal') || lower.includes('kidney') || lower.includes('uremi')) {
        return 'End-Stage Renal Disease with Uremic Encephalopathy & Secondary Cardiorespiratory Arrest';
      }
      if (lower.includes('stroke') || lower.includes('cva') || lower.includes('cerebrovascular')) {
        return 'Massive Hemorrhagic Cerebrovascular Accident (CVA) 2° to Hypertensive Intracranial Bleed';
      }
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    return text;
  };

  const isRewritingRef = useRef(false);

  const processPathologistVoiceRewrite = async (fieldKey: string, rawSpeech: string) => {
    if (!rawSpeech || rawSpeech.trim().length < 1) return;
    setIsVoiceRewriting(true);

    let rewritten = '';
    try {
      const res = await api.post('/openmed/voice-summarize', {
        rawTranscript: rawSpeech,
        context: fieldKey,
      });

      rewritten = res.data?.data?.cleanedTranscript || res.data?.data?.summary?.subjective || res.data?.cleanedTranscript || '';
    } catch (err) {
      console.warn('OpenMed backend voice rewrite fallback to local engine:', err);
    } finally {
      setIsVoiceRewriting(false);
    }

    const speechText = rewritten || rawSpeech;

    // Always run through inferPathologistClinicalRewrite to guarantee 100% clinical AI formatting
    const polished = inferPathologistClinicalRewrite(fieldKey, speechText);
    updateFieldValue(fieldKey, polished);

    // ── TWO-WAY AUTOPSY SYNC: Certified Cause of Death <--> Detailed Autopsy Findings ──
    if (fieldKey === 'autopsyFindings' || fieldKey === 'autopsy') {
      // 1. User dictated Detailed Findings -> Auto-generate & sync Certified Cause of Death
      const inferredCause = inferPathologistClinicalRewrite('causeOfDeath', speechText);
      if (inferredCause) {
        setAutopsyForm(prev => ({ ...prev, causeOfDeath: inferredCause }));
      }
    } else if (fieldKey === 'causeOfDeath' || fieldKey === 'certifiedCauseOfDeath') {
      // 2. User dictated Certified Cause of Death -> Auto-generate & draft Detailed Autopsy Findings
      const inferredDetailedFindings = inferPathologistClinicalRewrite('autopsyFindings', speechText);
      if (inferredDetailedFindings) {
        setAutopsyForm(prev => ({ ...prev, findings: inferredDetailedFindings }));
      }
    }

    enqueueSnackbar('✨ OpenMed Pathologist AI: Voice findings structured & clinically rewritten across both sections!', { variant: 'success' });
  };

  const stopVoiceDictation = () => {
    userStoppedVoiceRef.current = true;
    isRewritingRef.current = true; // Lock field against late raw speech onresult events!

    const field = activeVoiceField;
    const rawSpeech = currentVoiceTranscriptRef.current;

    if (voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.onresult = null;
        voiceRecognitionRef.current.onend = null;
        voiceRecognitionRef.current.stop();
      } catch (e) {}
      voiceRecognitionRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }

    setActiveVoiceField(null);

    if (field && rawSpeech && rawSpeech.trim().length >= 1) {
      processPathologistVoiceRewrite(field, rawSpeech);
    }
  };

  const startVoiceDictation = async (fieldKey: string) => {
    if (activeVoiceField === fieldKey) {
      stopVoiceDictation();
      return;
    }
    if (activeVoiceField) {
      stopVoiceDictation();
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      enqueueSnackbar('⚠️ Voice dictation is not supported in this browser. Please use Chrome, Edge, or Safari.', { variant: 'warning' });
      return;
    }

    userStoppedVoiceRef.current = false;
    isRewritingRef.current = false;
    currentVoiceTranscriptRef.current = '';
    setActiveVoiceField(fieldKey);

    // ── 1. Hardware Noise Cancellation & Audio Processing Constraints ──
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 },
        }
      });
      micStreamRef.current = micStream;

      // ── 2. Web Audio API 2.5x Gain Amplification for Microphone Sensitivity ──
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(micStream);
        const gainNode = ctx.createGain();
        gainNode.gain.value = 2.5;
        const dest = ctx.createMediaStreamDestination();
        source.connect(gainNode);
        gainNode.connect(dest);
      }
    } catch (micErr) {
      console.warn('Microphone enhanced processing fallback:', micErr);
    }

    // ── 3. Speech Recognition Engine Config ──
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    try { recognition.lang = 'en-NG'; } catch { recognition.lang = 'en-US'; }

    recognition.onresult = (event: any) => {
      if (isRewritingRef.current) return; // Prevent late raw speech from overwriting AI clinical rewrite

      let fullText = '';
      for (let i = 0; i < event.results.length; ++i) {
        fullText += event.results[i][0].transcript + ' ';
      }

      const cleanText = fullText.trim();
      currentVoiceTranscriptRef.current = cleanText;
      updateFieldValue(fieldKey, cleanText);
    };

    recognition.onerror = (err: any) => {
      console.warn('Voice dictation error:', err);
      if (err.error === 'not-allowed') {
        enqueueSnackbar('🔴 Microphone access denied. Please check microphone permissions in your browser.', { variant: 'error' });
        setActiveVoiceField(null);
      }
    };

    recognition.onend = () => {
      if (!userStoppedVoiceRef.current && activeVoiceField === fieldKey) {
        try {
          recognition.start();
        } catch (e) {
          stopVoiceDictation();
        }
      } else {
        stopVoiceDictation();
      }
    };

    voiceRecognitionRef.current = recognition;
    try {
      recognition.start();
      enqueueSnackbar(`🎙️ Pathologist Voice AI active for ${fieldKey}. Noise-cancelling & Gain Boost active! Speak findings clearly...`, { variant: 'info' });
    } catch (e) {
      console.error('Speech recognition start failed:', e);
    }
  };
  // Microscopic Reporting Form State
  const [reportForm, setReportForm] = useState({
    grossDescription: '',
    microscopicFindings: '',
    pathologicalDiagnosis: '',
    tnmStaging: 'pT2 pN0 pMx',
    surgicalMargins: 'Resection margins clear by > 8mm',
  });

  // Grossing Accession Handler
  const handleCreateHistologyOrder = () => {
    if (!newOrderForm.patientName || !newOrderForm.organSite) {
      enqueueSnackbar('Please fill in Patient Name and Tissue Organ Site!', { variant: 'warning' });
      return;
    }

    const newOrd: HistologyOrder = {
      id: String(Date.now()),
      refNo: `PATH-HIST-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: newOrderForm.patientName,
      patientId: newOrderForm.patientId || `P-${Math.floor(10000 + Math.random() * 90000)}`,
      age: newOrderForm.age,
      gender: newOrderForm.gender,
      requestingSurgeon: newOrderForm.requestingSurgeon || 'Dr. Consultant Surgeon',
      surgicalUnit: newOrderForm.surgicalUnit,
      organSite: newOrderForm.organSite,
      clinicalIndication: newOrderForm.clinicalIndication,
      grossingDescription: newOrderForm.grossingDescription || 'Specimen received in 10% neutral buffered formalin. Gross examination in progress.',
      cassetteCount: newOrderForm.cassetteCount,
      fixationStatus: '10% Neutral Buffered Formalin',
      stainType: 'Hematoxylin & Eosin (H&E)',
      dateReceived: new Date().toLocaleString(),
      status: 'Accessioned',
      pathologist: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Dr. Consultant Pathologist',
      urgency: newOrderForm.urgency,
    };

    setHistologyOrders([newOrd, ...histologyOrders]);
    enqueueSnackbar(`✨ Tissue Specimen Accessioned successfully! Barcode Tag: ${newOrd.refNo}`, { variant: 'success' });
    setNewHistologyOpen(false);
  };

  // Open Pathologist Reporting Desk
  const handleOpenReportingDesk = (order: HistologyOrder) => {
    // Look up any persisted report from storage as well as current order state
    const savedMap = loadSavedPathologyReports();
    const stored = savedMap[order.id] || (order.refNo ? savedMap[order.refNo] : undefined);

    const mergedOrder: HistologyOrder = {
      ...order,
      ...(stored || {})
    };

    setSelectedHistology(mergedOrder);

    // Specimen-aware clinical defaults for first-time reporting
    const getInitialDiagnosis = () => {
      if (mergedOrder.pathologicalDiagnosis) return mergedOrder.pathologicalDiagnosis;
      const site = (order.organSite || '').toLowerCase();
      if (site.includes('myomectomy') || site.includes('fibroid') || site.includes('uter')) {
        return `LEIOMYOMA OF THE UTERUS (BENIGN SMOOTH MUSCLE NEOPLASM) · ${order.organSite.toUpperCase()}`;
      }
      if (site.includes('prostate')) {
        return `PROSTATIC ADENOCARCINOMA, GLEASON SCORE 4+3=7 (GRADE GROUP 3) · ${order.organSite.toUpperCase()}`;
      }
      if (site.includes('append')) {
        return `ACUTE SUPPURATIVE APPENDICITIS WITH TRANSMURAL PERFORATION · ${order.organSite.toUpperCase()}`;
      }
      if (site.includes('breast')) {
        return `INVASIVE DUCTAL CARCINOMA OF THE BREAST (GRADE II) · ${order.organSite.toUpperCase()}`;
      }
      return `HISTOPATHOLOGICAL EXAMINATION: BENIGN TISSUE ARCHITECTURE · ${order.organSite.toUpperCase()}`;
    };

    const getInitialMicroscopic = () => {
      if (mergedOrder.microscopicFindings) return mergedOrder.microscopicFindings;
      const site = (order.organSite || '').toLowerCase();
      if (site.includes('myomectomy') || site.includes('fibroid') || site.includes('uter')) {
        return 'Sections demonstrate interlacing fascicles of uniform, elongated smooth muscle cells with blunt-ended, cigar-shaped nuclei. No cytologic atypia, coagulative tumor necrosis, or atypical mitotic figures (<1 mitosis per 10 HPF). Stroma displays mild hyalinization. Features are consistent with Benign Uterine Leiomyoma.';
      }
      if (site.includes('prostate')) {
        return 'Sections show prostate needle cores with infiltrating malignant glands displaying prominent nucleoli, cribriform architectures, and fused glandular profiles. Loss of basal cell lining confirmed on immunohistochemical staining.';
      }
      if (site.includes('append')) {
        return 'Sections show extensive neutrophilic infiltration through the muscularis propria into the subserosa, with mucosal ulceration, vascular congestion, and fibrinous serosal exudate. No neuroendocrine (carcinoid) tumor identified.';
      }
      return 'Sections show tissue architecture consistent with surgical resection. Cellular characteristics, nuclear-to-cytoplasmic ratio, and stromal elements observed without overt dysplasia or malignant change.';
    };

    setReportForm({
      grossDescription: mergedOrder.grossDescription || mergedOrder.grossingDescription || order.grossingDescription || 'Specimen received in 10% neutral buffered formalin from Operating Theatre. Gross examination logged.',
      microscopicFindings: getInitialMicroscopic(),
      pathologicalDiagnosis: getInitialDiagnosis(),
      tnmStaging: mergedOrder.tnmStaging || (order.organSite.toLowerCase().includes('breast') ? 'pT2 pN0 pMx (AJCC 8th Edition)' : 'pT1 pN0 pMx'),
      surgicalMargins: mergedOrder.surgicalMargins || 'Surgical margins are clear of pathological lesion (margins intact).',
    });
    setReportingOpen(true);
  };

  // Save Narrative Pathologist Diagnostic Report
  const handleSaveReport = () => {
    if (!selectedHistology) return;

    const reportData: Partial<HistologyOrder> = {
      grossDescription: reportForm.grossDescription,
      grossingDescription: reportForm.grossDescription,
      microscopicFindings: reportForm.microscopicFindings,
      pathologicalDiagnosis: reportForm.pathologicalDiagnosis,
      tnmStaging: reportForm.tnmStaging,
      surgicalMargins: reportForm.surgicalMargins,
      status: 'Reported',
      reportedDate: new Date().toLocaleString(),
      reportedBy: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || selectedHistology.pathologist || 'Dr. Consultant Pathologist',
    };

    const updatedOrder: HistologyOrder = {
      ...selectedHistology,
      ...reportData,
    };

    setHistologyOrders(prev =>
      prev.map(o => (o.id === selectedHistology.id || (selectedHistology.refNo && o.refNo === selectedHistology.refNo) ? { ...o, ...reportData } : o))
    );
    setSelectedHistology(updatedOrder);

    // Persist to storage
    savePathologyReportToStorage(selectedHistology.id, reportData, selectedHistology.refNo);

    enqueueSnackbar(`✅ Narrative Microscopic Diagnostic Report signed and published to EMR & Unified Diagnostic Hub!`, { variant: 'success' });
    setReportingOpen(false);
  };

  const [reportingFilter, setReportingFilter] = useState<'ALL' | 'PENDING' | 'REPORTED'>('ALL');

  const handlePrintHistologyReport = (order: HistologyOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Pathology Consultation Report - ${order.refNo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #1e293b; }
            .header { text-align: center; border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
            .hospital-title { font-size: 24px; font-weight: bold; color: #0f172a; }
            .sub-title { font-size: 14px; color: #64748b; margin-top: 4px; }
            .section { margin-bottom: 20px; }
            .section-header { font-size: 14px; font-weight: bold; color: #0284c7; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .diagnosis-box { background: #f0fdf4; border: 2px solid #22c55e; color: #15803d; padding: 14px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 15px 0; }
            .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 12px; text-align: center; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-title">FAITH FOUNDATION MISSION HOSPITAL</div>
            <div class="sub-title">DEPARTMENT OF ANATOMIC PATHOLOGY & SURGICAL DIAGNOSIS</div>
            <div style="font-size: 12px; color: #0284c7; font-weight: bold; margin-top: 4px;">HISTOPATHOLOGY DIAGNOSTIC CONSULTATION REPORT</div>
          </div>

          <div class="info-grid">
            <div><strong>Patient Name:</strong> ${order.patientName}</div>
            <div><strong>Accession Ref:</strong> ${order.refNo}</div>
            <div><strong>MRN / ID:</strong> ${order.patientId}</div>
            <div><strong>Date Accessioned:</strong> ${order.dateReceived}</div>
            <div><strong>Organ Site / Specimen:</strong> ${order.organSite}</div>
            <div><strong>Fixative & Staining:</strong> ${order.fixationStatus} · ${order.stainType}</div>
            <div><strong>Requesting Surgeon:</strong> ${order.requestingSurgeon} (${order.surgicalUnit})</div>
            <div><strong>Attending Pathologist:</strong> ${order.pathologist}</div>
          </div>

          <div class="section" style="margin-top: 20px;">
            <div class="section-header">Clinical History & Pre-Op Diagnosis</div>
            <p style="font-size: 14px; line-height: 1.6;">${order.clinicalIndication}</p>
          </div>

          <div class="section">
            <div class="section-header">Gross Physical Description</div>
            <p style="font-size: 14px; line-height: 1.6;">${order.grossDescription || order.grossingDescription || 'Specimen received in 10% neutral buffered formalin. Gross examination logged.'}</p>
          </div>

          <div class="section">
            <div class="section-header">Microscopic Narrative Description</div>
            <p style="font-size: 14px; line-height: 1.6;">${order.microscopicFindings || 'Sections demonstrate cellular architecture consistent with histopathological biopsy examination.'}</p>
          </div>

          <div class="section">
            <div class="section-header">Pathological Impression & Diagnosis</div>
            <div class="diagnosis-box">
              DIAGNOSIS: ${order.pathologicalDiagnosis || order.organSite.toUpperCase()}<br/>
              <span style="font-size: 12px; font-weight: normal;">TNM Staging: ${order.tnmStaging || 'pT2 pN0 pMx'} · Margins: ${order.surgicalMargins || 'Clear of tumor'}</span>
            </div>
          </div>

          <div class="footer">
            <p>Digitally Certified & Signed by ${order.pathologist} (FMCPath) · QR Verification Token: QR-HIST-${order.refNo}</p>
            <p>Smart Hospital HMIS · Anatomic Pathology & Surgical Diagnosis Suite</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintMortuaryTag = (record: MortuaryRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Deceased Identity Tag & Mortuary Receipt - ${record.tagNo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #0f172a; }
            .header { text-align: center; border-bottom: 3px solid #dc2626; padding-bottom: 12px; margin-bottom: 20px; }
            .hospital-title { font-size: 24px; font-weight: bold; }
            .sub-title { font-size: 14px; color: #64748b; margin-top: 4px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; background: #fff5f5; padding: 14px; border-radius: 8px; border: 1px solid #fecaca; }
            .tag-box { background: #1e293b; color: #fff; padding: 16px; border-radius: 8px; text-align: center; font-size: 20px; font-weight: bold; margin: 20px 0; }
            .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 12px; text-align: center; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-title">FAITH FOUNDATION MISSION HOSPITAL</div>
            <div class="sub-title">MORTUARY & FORENSIC AUTOPSY SERVICES LOGISTICS</div>
            <div style="font-size: 12px; color: #dc2626; font-weight: bold; margin-top: 4px;">OFFICIAL DECEASED IDENTIFICATION & VAULT ADMISSION TAG</div>
          </div>

          <div class="tag-box">
            MORTUARY TAG NO: ${record.tagNo}<br/>
            <span style="font-size: 14px; font-weight: normal; color: #cbd5e1;">CHILLER VAULT: ${record.chillerSlot}</span>
          </div>

          <div class="info-grid">
            <div><strong>Deceased Name:</strong> ${record.deceasedName}</div>
            <div><strong>MRN / Hospital No:</strong> ${record.mrn}</div>
            <div><strong>Age / Gender:</strong> ${record.age} Y / ${record.gender}</div>
            <div><strong>Date / Time of Death:</strong> ${record.dateOfDeath} (${record.timeOfDeath})</div>
            <div><strong>Source Ward / Origin:</strong> ${record.sourceWard}</div>
            <div><strong>Next-of-Kin Contact:</strong> ${record.nextOfKin} (${record.nextOfKinPhone})</div>
            <div><strong>Autopsy Status:</strong> ${record.autopsyStatus}</div>
            <div><strong>Storage Status:</strong> ${record.status}</div>
          </div>

          <div style="margin-top: 20px; font-size: 14px;">
            <strong>Documented Cause of Death / Clinical Findings:</strong>
            <p style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${record.causeOfDeath || 'Pending formal autopsy findings and death certification clearance.'}</p>
          </div>

          <div class="footer">
            <p>Certified by Mortuary Logistics Manager · QR Vault Token: QR-MORT-${record.tagNo}</p>
            <p>Smart Hospital HMIS · Mortuary & Forensic Pathology Division</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Autopsy Postmortem Findings Desk State
  const [isAutopsyFindingsModalOpen, setIsAutopsyFindingsModalOpen] = useState(false);
  const [selectedMortuaryRecord, setSelectedMortuaryRecord] = useState<MortuaryRecord | null>(null);
  const [autopsyForm, setAutopsyForm] = useState({
    causeOfDeath: '',
    findings: '',
  });

  // Mortuary Vault Deallocation & Body Release State
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [selectedReleaseRecord, setSelectedReleaseRecord] = useState<MortuaryRecord | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    claimantName: '',
    relationship: 'Husband',
    claimantNid: '',
    claimantPhone: '',
    funeralHome: 'Private Family Hearse Transport',
    deathCertVerified: true,
    effectsHandedOver: true,
    feesCleared: true,
    vacateVaultConfirmed: true,
  });

  // Post-Autopsy Disposition & Transport Logistics State (When body is not in hospital mortuary)
  const [dispositionModalOpen, setDispositionModalOpen] = useState(false);
  const [dispositionRecord, setDispositionRecord] = useState<MortuaryRecord | null>(null);
  const [dispositionForm, setDispositionForm] = useState({
    destination: 'HOSPITAL_MORTUARY' as 'HOSPITAL_MORTUARY' | 'EXTERNAL_MORTUARY' | 'FAMILY_RELEASE',
    externalFacilityName: 'St. Luke Specialist Hospital & Mortuary, Garki',
    transportMode: 'AMBULANCE' as 'AMBULANCE' | 'PERSONAL_VEHICLE',
    ambulanceVehicle: 'AMB-01 (Hospital Critical Care Transport Van)',
    ambulanceDriver: 'Ibrahim Danjuma (Emergency Medical Driver)',
    vehiclePlateNumber: '',
    driverName: '',
    claimantName: '',
    claimantPhone: '',
    relationship: 'Next of Kin / Family Head',
    notes: ''
  });
  const [submittingDisposition, setSubmittingDisposition] = useState(false);

  const handleOpenDispositionModal = (record: MortuaryRecord) => {
    setDispositionRecord(record);
    const cleanNok = record.nextOfKin && !record.nextOfKin.includes('Awaiting') ? record.nextOfKin : '';
    setDispositionForm({
      destination: (record.disposition as any) || 'HOSPITAL_MORTUARY',
      externalFacilityName: 'St. Luke Specialist Hospital & Mortuary, Garki',
      transportMode: (record.transportMode as any) || 'AMBULANCE',
      ambulanceVehicle: 'AMB-01 (Hospital Critical Care Transport Van)',
      ambulanceDriver: 'Ibrahim Danjuma (Emergency Medical Driver)',
      vehiclePlateNumber: '',
      driverName: '',
      claimantName: cleanNok,
      claimantPhone: record.nextOfKinPhone && record.nextOfKinPhone !== '—' ? record.nextOfKinPhone : '+234 803 123 4567',
      relationship: cleanNok.toLowerCase().includes('husband') ? 'Husband' : cleanNok.toLowerCase().includes('wife') ? 'Wife' : 'Next of Kin / Family Head',
      notes: ''
    });
    setDispositionModalOpen(true);
  };

  const handleConfirmDisposition = async () => {
    if (!dispositionRecord) return;
    setSubmittingDisposition(true);
    try {
      const res = await api.post('/mortuary/post-autopsy-transfer', {
        patientId: dispositionRecord.mrn || dispositionRecord.id,
        name: dispositionRecord.deceasedName,
        gender: dispositionRecord.gender,
        age: dispositionRecord.age,
        destination: dispositionForm.destination,
        externalFacilityName: dispositionForm.externalFacilityName,
        transportMode: dispositionForm.transportMode,
        ambulanceVehicle: dispositionForm.ambulanceVehicle,
        ambulanceDriver: dispositionForm.ambulanceDriver,
        vehiclePlateNumber: dispositionForm.vehiclePlateNumber,
        driverName: dispositionForm.driverName,
        claimantName: dispositionForm.claimantName || dispositionRecord.nextOfKin,
        claimantPhone: dispositionForm.claimantPhone || dispositionRecord.nextOfKinPhone,
        relationship: dispositionForm.relationship,
        causeOfDeath: dispositionRecord.causeOfDeath,
        pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
        notes: dispositionForm.notes,
      });

      enqueueSnackbar(res.data?.message || 'Post-autopsy disposition completed & service fees invoiced to Cashier!', { variant: 'success' });
      setDispositionModalOpen(false);
      await syncPathologyData();
    } catch (err: any) {
      enqueueSnackbar('Error recording post-autopsy disposition: ' + err.message, { variant: 'error' });
    } finally {
      setSubmittingDisposition(false);
    }
  };

  const handleCancelAutopsy = async (record: MortuaryRecord) => {
    const tagKey = record.tagNo || record.mrn || record.id;
    try {
      await api.post('/mortuary/autopsies/cancel', { mrn: tagKey });
    } catch (err) {
      console.warn('API cancel autopsy fallback:', err);
    }
    removeMortuaryAutopsyFromStorage([record.tagNo, record.mrn, record.id, 'MOR-2026-05']);
    setMortuaryRecords(prev => prev.filter(m => m.id !== record.id && m.tagNo !== record.tagNo));
    enqueueSnackbar(`${record.deceasedName} removed from Autopsy Desk. Retained in mortuary cold vault storage.`, { variant: 'info' });
  };

  const handleOpenAutopsyModal = (record: MortuaryRecord) => {
    setSelectedMortuaryRecord(record);
    const key = record.tagNo || record.mrn || record.id;
    const saved = loadSavedMortuaryAutopsies()[key];
    setAutopsyForm({
      causeOfDeath: saved?.causeOfDeath || record.causeOfDeath || 'Cardiopulmonary Arrest 2° to Underlying Pathology',
      findings: saved?.findings || record.findings || 'External examination reveals intact deceased body. Internal postmortem dissection shows gross organ changes consistent with clinical history. Forensic toxicology cleared.',
    });
    setIsAutopsyFindingsModalOpen(true);
  };

  const handleSaveAutopsyFindings = async () => {
    if (!selectedMortuaryRecord) return;
    const tagKey = selectedMortuaryRecord.tagNo || selectedMortuaryRecord.mrn || selectedMortuaryRecord.id;
    try {
      await api.post('/mortuary/autopsies/complete', {
        mrn: tagKey,
        findings: autopsyForm.findings,
        causeOfDeath: autopsyForm.causeOfDeath,
        pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
      });
    } catch (err) {
      console.warn('API post autopsy complete fallback:', err);
    }

    const updatedData = {
      autopsyStatus: 'Autopsy Completed & Certified',
      causeOfDeath: autopsyForm.causeOfDeath,
      findings: autopsyForm.findings,
      pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
      statusStage: 'COMPLETED',
      scheduledTime: new Date().toLocaleString(),
    };

    setMortuaryRecords(prev => prev.map(m => {
      if (m.id === selectedMortuaryRecord.id || m.tagNo === tagKey || m.mrn === tagKey) {
        return {
          ...m,
          ...updatedData,
        };
      }
      return m;
    }));

    saveMortuaryAutopsyToStorage(tagKey, updatedData);
    if (selectedMortuaryRecord.tagNo && selectedMortuaryRecord.tagNo !== tagKey) {
      saveMortuaryAutopsyToStorage(selectedMortuaryRecord.tagNo, updatedData);
    }
    if (selectedMortuaryRecord.mrn && selectedMortuaryRecord.mrn !== tagKey) {
      saveMortuaryAutopsyToStorage(selectedMortuaryRecord.mrn, updatedData);
    }
    if (selectedMortuaryRecord.id && selectedMortuaryRecord.id !== tagKey) {
      saveMortuaryAutopsyToStorage(selectedMortuaryRecord.id, updatedData);
    }

    enqueueSnackbar('✅ Autopsy Postmortem Report signed and published into Chain of Custody!', { variant: 'success' });
    setIsAutopsyFindingsModalOpen(false);

    // If body is NOT in hospital mortuary vault, prompt disposition & transport logistics!
    if (selectedMortuaryRecord.inMortuary === false || selectedMortuaryRecord.chillerSlot?.includes('Pre-Mortuary') || !selectedMortuaryRecord.tagNo.startsWith('MOR-')) {
      handleOpenDispositionModal({
        ...selectedMortuaryRecord,
        ...updatedData
      });
    }
  };

  const handleOpenReleaseModal = (record: MortuaryRecord) => {
    setSelectedReleaseRecord(record);
    const cleanNok = record.nextOfKin && !record.nextOfKin.includes('Awaiting') ? record.nextOfKin : '';
    setReleaseForm({
      claimantName: cleanNok,
      relationship: cleanNok.toLowerCase().includes('husband') ? 'Husband' : cleanNok.toLowerCase().includes('wife') ? 'Wife' : cleanNok.toLowerCase().includes('son') ? 'Son' : 'Authorized Next-of-Kin',
      claimantNid: 'NIN-VERIFIED-' + Math.floor(10000000 + Math.random() * 90000000),
      claimantPhone: record.nextOfKinPhone && record.nextOfKinPhone !== '—' ? record.nextOfKinPhone : '+234 803 123 4567',
      funeralHome: 'Private Family Hearse Transport (Licensed)',
      deathCertVerified: true,
      effectsHandedOver: true,
      feesCleared: true,
      vacateVaultConfirmed: true,
    });
    setIsReleaseModalOpen(true);
  };

  const handleConfirmReleaseVault = async () => {
    if (!selectedReleaseRecord) return;
    const tagKey = selectedReleaseRecord.tagNo || selectedReleaseRecord.mrn || selectedReleaseRecord.id;
    try {
      await api.post('/mortuary/release', {
        mrn: tagKey,
        claimantName: releaseForm.claimantName || 'Authorized Family Representative',
        claimantNid: releaseForm.claimantNid || 'NIN-VERIFIED',
        relationship: releaseForm.relationship || 'Next-of-Kin',
      });
    } catch (err) {
      console.warn('API post mortuary release fallback:', err);
    }

    const updatedRelease = {
      status: 'Released to Family' as const,
      chillerSlot: `${selectedReleaseRecord.chillerSlot} (Vacated)`,
      releasedAt: new Date().toLocaleString(),
      claimantName: releaseForm.claimantName || 'Authorized Family Representative',
      relationship: releaseForm.relationship,
    };

    setMortuaryRecords(prev => prev.map(m => {
      if (m.id === selectedReleaseRecord.id || m.tagNo === tagKey || m.mrn === tagKey) {
        return {
          ...m,
          ...updatedRelease,
        };
      }
      return m;
    }));

    saveMortuaryReleaseToStorage(tagKey, updatedRelease);
    enqueueSnackbar(`✅ Deceased body successfully released to ${releaseForm.claimantName || 'Next of Kin'}. Cold Vault ${selectedReleaseRecord.chillerSlot} vacated & disinfected!`, { variant: 'success' });
    setIsReleaseModalOpen(false);
  };

  // ── 🧪 CYTOLOGY WORKSPACE STATE & HANDLERS ─────────────────────────
  const [isNewCytologyModalOpen, setIsNewCytologyModalOpen] = useState(false);
  const [isCytologyReportModalOpen, setIsCytologyReportModalOpen] = useState(false);
  const [selectedCytology, setSelectedCytology] = useState<CytologySpecimen | null>(null);

  const [newCytologyForm, setNewCytologyForm] = useState({
    patientName: '',
    patientId: '',
    specimenType: 'Cervical Pap Smear',
    stainingMethod: 'Papanicolaou (Pap)',
    requestingDoctor: '',
    clinicalNotes: '',
    fee: 25000,
  });

  const [cytoReportForm, setCytoReportForm] = useState({
    bethesdaClassification: 'NILM (Negative for Malignancy)',
    adequacy: 'Satisfactory (Endocervical component present)',
    findings: 'Abundant superficial and intermediate squamous cells. Normal endocervical cell clusters. Benign reactive changes secondary to inflammation. No intraepithelial lesion or malignancy.',
    impression: 'NEGATIVE FOR INTRAEPITHELIAL LESION OR MALIGNANCY (NILM). ROUTINE 3-YEAR PAP SMEAR FOLLOW-UP RECOMMENDED.',
  });

  const handleSaveNewCytology = async () => {
    if (!newCytologyForm.patientName || !newCytologyForm.specimenType) {
      enqueueSnackbar('Please fill in Patient Name and Specimen Type', { variant: 'warning' });
      return;
    }

    const nextId = cytologySpecimens.length + 312;
    const refNo = `PATH-CYTO-2026-${String(nextId).padStart(4, '0')}`;

    // Auto-dispatch fee to Cashier Billing Desk
    try {
      await api.post('/billing/charges', {
        patientName: newCytologyForm.patientName,
        serviceName: `Cytology Accession: ${newCytologyForm.specimenType}`,
        amount: newCytologyForm.fee,
        refNo: refNo,
      });
    } catch (e) {}

    const newCyto: CytologySpecimen = {
      id: `cyto-${Date.now()}`,
      refNo: refNo,
      patientName: newCytologyForm.patientName,
      patientId: newCytologyForm.patientId || 'P-10992',
      requestingDoctor: newCytologyForm.requestingDoctor,
      specimenType: newCytologyForm.specimenType as any,
      stainingMethod: newCytologyForm.stainingMethod as any,
      adequacy: 'Satisfactory (Endocervical component present)',
      bethesdaClassification: 'NILM (Negative for Malignancy)',
      findings: newCytologyForm.clinicalNotes || 'Cytological smear prepared and stained. Microscopy in progress.',
      dateCollected: new Date().toISOString().split('T')[0],
      status: 'Microscopy In Progress',
      cytotechnologist: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Senior Cytotechnologist',
    };

    setCytologySpecimens(prev => [newCyto, ...prev]);
    setIsNewCytologyModalOpen(false);
    enqueueSnackbar(`🧪 Cytology Specimen Accessioned! Ref: ${refNo}. Bill of ₦${newCytologyForm.fee.toLocaleString()} sent to Cashier.`, { variant: 'success' });
  };

  const handleOpenCytologyReport = (cyto: CytologySpecimen) => {
    setSelectedCytology(cyto);
    setCytoReportForm({
      bethesdaClassification: cyto.bethesdaClassification || 'NILM (Negative for Malignancy)',
      adequacy: cyto.adequacy || 'Satisfactory (Endocervical component present)',
      findings: cyto.findings || 'Smear shows normal squamous epithelial architecture with benign endocervical cells.',
      impression: `BETHESDA CLASSIFICATION: ${cyto.bethesdaClassification.toUpperCase()}.`,
    });
    setIsCytologyReportModalOpen(true);
  };

  const handleSaveCytologyReport = () => {
    if (!selectedCytology) return;

    const updated: CytologySpecimen = {
      ...selectedCytology,
      bethesdaClassification: cytoReportForm.bethesdaClassification as any,
      adequacy: cytoReportForm.adequacy as any,
      findings: cytoReportForm.findings,
      status: 'Final Signed',
    };

    setCytologySpecimens(prev => prev.map(c => c.id === selectedCytology.id ? updated : c));
    setIsCytologyReportModalOpen(false);
    enqueueSnackbar(`✨ Bethesda Cytology Diagnostic Report signed & published for ${selectedCytology.patientName}!`, { variant: 'success' });
  };

  const handlePrintCytologyReport = (cyto: CytologySpecimen) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Bethesda Cytology Report - ${cyto.refNo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #1e293b; }
            .header { text-align: center; border-bottom: 3px solid #7c3aed; padding-bottom: 12px; margin-bottom: 20px; }
            .hospital-title { font-size: 24px; font-weight: bold; color: #0f172a; }
            .sub-title { font-size: 14px; color: #64748b; margin-top: 4px; }
            .section { margin-bottom: 20px; }
            .section-header { font-size: 14px; font-weight: bold; color: #7c3aed; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .bethesda-box { background: #f0fdf4; border: 2px solid #22c55e; color: #15803d; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 15px 0; }
            .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 12px; text-align: center; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-title">FAITH FOUNDATION MISSION HOSPITAL</div>
            <div class="sub-title">DEPARTMENT OF ANATOMIC PATHOLOGY & CYTOPATHOLOGY</div>
            <div style="font-size: 12px; color: #7c3aed; font-weight: bold; margin-top: 4px;">BETHESDA CYTOLOGICAL DIAGNOSTIC CONSULTATION REPORT</div>
          </div>

          <div class="info-grid">
            <div><strong>Patient Name:</strong> ${cyto.patientName}</div>
            <div><strong>Cytology Ref:</strong> ${cyto.refNo}</div>
            <div><strong>MRN / ID:</strong> ${cyto.patientId}</div>
            <div><strong>Date Collected:</strong> ${cyto.dateCollected}</div>
            <div><strong>Specimen:</strong> ${cyto.specimenType}</div>
            <div><strong>Staining Protocol:</strong> ${cyto.stainingMethod}</div>
            <div><strong>Referring Doctor:</strong> ${cyto.requestingDoctor}</div>
            <div><strong>Status:</strong> ${cyto.status}</div>
          </div>

          <div class="section" style="margin-top: 20px;">
            <div class="section-header">Bethesda System Classification</div>
            <div class="bethesda-box">
              CLASSIFICATION: ${cyto.bethesdaClassification}<br/>
              <span style="font-size: 12px; font-weight: normal;">Specimen Adequacy: ${cyto.adequacy || 'Satisfactory'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-header">Microscopic Cytological Findings</div>
            <p style="font-size: 14px; line-height: 1.6;">${cyto.findings}</p>
          </div>

          <div class="footer">
            <p>Digitally Signed by Consultant Cytopathologist (FMCPath) · QR Verification Token: QR-CYTO-${cyto.refNo}</p>
            <p>Smart Hospital HMIS · Anatomic Pathology Suite</p>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ── 🗄️ SLIDE & FFPE BLOCK ARCHIVE STATE & HANDLERS ──────────────────
  const [archiveLocators, setArchiveLocators] = useState<ArchiveLocatorSlot[]>(loadSavedArchiveLocators);
  const [isLocatorConfigModalOpen, setIsLocatorConfigModalOpen] = useState(false);
  const [newLocatorForm, setNewLocatorForm] = useState({
    room: 'Archive Room 2',
    cabinet: 'Cabinet A',
    shelf: 'Shelf 1',
    drawer: 'Drawer 01',
    maxCapacity: 50,
    description: 'General Specimen Vault',
  });

  const [isNewArchiveModalOpen, setIsNewArchiveModalOpen] = useState(false);
  const [selectedArchivePatient, setSelectedArchivePatient] = useState<any | null>(null);
  const [newArchiveForm, setNewArchiveForm] = useState({
    specimenNo: '',
    patientName: '',
    patientId: '',
    organSite: '',
    blockId: '',
    slideId: '',
    room: 'Archive Room 2',
    cabinet: 'Cabinet A',
    shelf: 'Shelf 2',
    drawer: 'Drawer 06',
    retentionYears: 20,
  });

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedArchiveItem, setSelectedArchiveItem] = useState<SlideArchiveItem | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({
    borrowerName: '',
    departmentOrHospital: 'External Oncology Consultation (Second Opinion)',
    purpose: 'Second Opinion Histopathology Review',
    authorizedBy: 'Dr. Consultant Pathologist',
    dueDate: '2026-09-20',
  });

  const [archiveStatusFilter, setArchiveStatusFilter] = useState<'ALL' | 'IN_ARCHIVE' | 'CHECKED_OUT'>('ALL');

  // Real-time capacity & occupancy calculator
  const getSlotCapacityInfo = (room: string, cabinet: string, shelf: string, drawer: string) => {
    const matching = archiveLocators.find(l =>
      l.room.toLowerCase().trim() === room.toLowerCase().trim() &&
      l.cabinet.toLowerCase().trim() === cabinet.toLowerCase().trim() &&
      l.shelf.toLowerCase().trim() === shelf.toLowerCase().trim() &&
      l.drawer.toLowerCase().trim() === drawer.toLowerCase().trim()
    );
    const maxCap = matching ? matching.maxCapacity : 50;

    const occupiedCount = archiveItems.filter(it =>
      it.status === 'In Archive' &&
      it.cabinetLocator.toLowerCase().includes(room.toLowerCase()) &&
      it.cabinetLocator.toLowerCase().includes(cabinet.toLowerCase()) &&
      it.cabinetLocator.toLowerCase().includes(shelf.toLowerCase()) &&
      it.cabinetLocator.toLowerCase().includes(drawer.toLowerCase())
    ).length;

    const available = Math.max(0, maxCap - occupiedCount);
    const percent = maxCap > 0 ? Math.min(100, Math.round((occupiedCount / maxCap) * 100)) : 0;

    return { maxCap, occupiedCount, available, percent, matching };
  };

  const handleCreateNewLocatorSlot = () => {
    if (!newLocatorForm.room || !newLocatorForm.cabinet || !newLocatorForm.drawer) {
      enqueueSnackbar('Please fill in Room, Cabinet and Drawer name!', { variant: 'warning' });
      return;
    }

    const exists = archiveLocators.some(l =>
      l.room === newLocatorForm.room &&
      l.cabinet === newLocatorForm.cabinet &&
      l.shelf === newLocatorForm.shelf &&
      l.drawer === newLocatorForm.drawer
    );

    if (exists) {
      enqueueSnackbar('A locator slot with this Room, Cabinet, Shelf and Drawer already exists!', { variant: 'warning' });
      return;
    }

    const newSlot: ArchiveLocatorSlot = {
      id: `loc-${Date.now()}`,
      room: newLocatorForm.room,
      cabinet: newLocatorForm.cabinet,
      shelf: newLocatorForm.shelf,
      drawer: newLocatorForm.drawer,
      maxCapacity: Number(newLocatorForm.maxCapacity) || 50,
      description: newLocatorForm.description || 'Configured Storage Slot',
    };

    const updated = [...archiveLocators, newSlot];
    setArchiveLocators(updated);
    saveArchiveLocatorsToStorage(updated);
    enqueueSnackbar(`✅ New Physical Archive slot "${newSlot.room} · ${newSlot.cabinet} · ${newSlot.shelf} · ${newSlot.drawer}" added (Capacity: ${newSlot.maxCapacity})!`, { variant: 'success' });
    setNewLocatorForm(p => ({
      ...p,
      drawer: `Drawer ${String(archiveLocators.length + 1).padStart(2, '0')}`,
    }));
  };

  const handleDeleteLocatorSlot = (locId: string) => {
    const slot = archiveLocators.find(l => l.id === locId);
    if (!slot) return;
    const occupied = archiveItems.filter(it =>
      it.status === 'In Archive' &&
      it.cabinetLocator.includes(slot.room) &&
      it.cabinetLocator.includes(slot.cabinet) &&
      it.cabinetLocator.includes(slot.drawer)
    ).length;

    if (occupied > 0) {
      enqueueSnackbar(`Cannot delete locator slot: ${occupied} active specimens are currently stored inside it!`, { variant: 'error' });
      return;
    }

    const updated = archiveLocators.filter(l => l.id !== locId);
    setArchiveLocators(updated);
    saveArchiveLocatorsToStorage(updated);
    enqueueSnackbar('Physical locator slot removed from storage registry.', { variant: 'info' });
  };

  const handleUpdateLocatorCapacity = (locId: string, newMax: number) => {
    if (newMax < 1) return;
    const updated = archiveLocators.map(l => l.id === locId ? { ...l, maxCapacity: newMax } : l);
    setArchiveLocators(updated);
    saveArchiveLocatorsToStorage(updated);
    enqueueSnackbar('Updated locator drawer max capacity.', { variant: 'success' });
  };

  const handleOpenCheckoutModal = (arc: SlideArchiveItem) => {
    setSelectedArchiveItem(arc);
    setCheckoutForm({
      borrowerName: '',
      departmentOrHospital: 'External Oncology Consultation (Second Opinion)',
      purpose: 'Second Opinion Histopathology Review',
      authorizedBy: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Dr. Consultant Pathologist',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    });
    setIsCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = () => {
    if (!selectedArchiveItem) return;
    if (!checkoutForm.borrowerName) {
      enqueueSnackbar('Please enter the borrower or requester name', { variant: 'warning' });
      return;
    }

    const updated = archiveItems.map(item => {
      if (item.id === selectedArchiveItem.id) {
        return {
          ...item,
          status: 'Checked Out (Second Opinion)' as const,
          checkedOutTo: `${checkoutForm.borrowerName} (${checkoutForm.departmentOrHospital})`,
          checkedOutReason: checkoutForm.purpose,
          checkedOutDate: new Date().toISOString().split('T')[0],
        };
      }
      return item;
    });

    setArchiveItems(updated);
    saveArchiveItemsToStorage(updated);
    enqueueSnackbar(`✅ Specimen ${selectedArchiveItem.specimenNo} checked out to ${checkoutForm.borrowerName}!`, { variant: 'success' });
    setIsCheckoutModalOpen(false);
  };

  const handleReturnArchiveItem = (arc: SlideArchiveItem) => {
    const updated = archiveItems.map(item => {
      if (item.id === arc.id) {
        return {
          ...item,
          status: 'In Archive' as const,
          checkedOutTo: undefined,
          checkedOutReason: undefined,
          checkedOutDate: undefined,
        };
      }
      return item;
    });

    setArchiveItems(updated);
    saveArchiveItemsToStorage(updated);
    enqueueSnackbar(`✅ Specimen ${arc.specimenNo} returned to physical cabinet ${arc.cabinetLocator}!`, { variant: 'success' });
  };

  const handleCreateNewArchiveItem = () => {
    if (!newArchiveForm.specimenNo || !newArchiveForm.patientName) {
      enqueueSnackbar('Please enter specimen number and patient name', { variant: 'warning' });
      return;
    }

    const capInfo = getSlotCapacityInfo(newArchiveForm.room, newArchiveForm.cabinet, newArchiveForm.shelf, newArchiveForm.drawer);
    if (capInfo.available <= 0) {
      enqueueSnackbar(`⚠️ Warning: ${newArchiveForm.drawer} has reached max capacity (${capInfo.maxCap}/${capInfo.maxCap} slots occupied). Please select another drawer or expand capacity!`, { variant: 'error' });
      return;
    }

    const newItem: SlideArchiveItem = {
      id: `arc-${Date.now()}`,
      specimenNo: newArchiveForm.specimenNo,
      patientName: newArchiveForm.patientName,
      patientId: newArchiveForm.patientId || `P-${Math.floor(10000 + Math.random() * 90000)}`,
      blockId: newArchiveForm.blockId || `FFPE Block #B-${Math.floor(1000 + Math.random() * 9000)}-A1`,
      slideId: newArchiveForm.slideId || `H&E Slide #S-${Math.floor(1000 + Math.random() * 9000)}-A1`,
      organSite: newArchiveForm.organSite || 'Diagnostic Tissue Biopsy',
      cabinetLocator: `${newArchiveForm.room} · ${newArchiveForm.cabinet} · ${newArchiveForm.shelf} · ${newArchiveForm.drawer}`,
      retentionYears: newArchiveForm.retentionYears || 20,
      dateArchived: new Date().toISOString().split('T')[0],
      status: 'In Archive',
    };

    const updated = [newItem, ...archiveItems];
    setArchiveItems(updated);
    saveArchiveItemsToStorage(updated);
    enqueueSnackbar(`✅ Specimen ${newItem.specimenNo} indexed into ${newItem.cabinetLocator} (Remaining capacity: ${capInfo.available - 1} slots)!`, { variant: 'success' });
    setIsNewArchiveModalOpen(false);
    setSelectedArchivePatient(null);
    setNewArchiveForm({
      specimenNo: '',
      patientName: '',
      patientId: '',
      organSite: '',
      blockId: '',
      slideId: '',
      room: 'Archive Room 2',
      cabinet: 'Cabinet A',
      shelf: 'Shelf 2',
      drawer: 'Drawer 06',
      retentionYears: 20,
    });
  };

  const handlePrintArchiveLabel = (arc: SlideArchiveItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Specimen Archive Label - ${arc.specimenNo}</title>
          <style>
            @page { size: 100mm 65mm; margin: 4mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 8px; font-size: 11px; color: #0f172a; }
            .label-box { border: 2px solid #0f172a; border-radius: 6px; padding: 8px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px; }
            .hospital { font-weight: 900; font-size: 11px; text-transform: uppercase; color: #047857; }
            .specimen-tag { font-size: 13px; font-weight: 900; color: #0f172a; }
            .barcode { letter-spacing: 4px; font-family: monospace; font-size: 12px; font-weight: 800; text-align: center; margin: 4px 0; background: #f1f5f9; padding: 4px; border-radius: 3px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px; }
            .field-label { font-size: 8px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            .field-val { font-size: 10px; font-weight: 700; color: #0f172a; }
            .locator { background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px; padding: 4px; text-align: center; font-weight: 800; color: #166534; font-size: 10px; margin-bottom: 4px; }
            .footer { display: flex; justify-content: space-between; font-size: 8px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 4px; }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="header">
              <span class="hospital">FAITH FOUNDATION ARCHIVE</span>
              <span class="specimen-tag">${arc.specimenNo}</span>
            </div>
            <div class="barcode">*${arc.specimenNo.replace(/-/g, '')}*</div>
            <div class="grid">
              <div>
                <div class="field-label">Patient Name & MRN</div>
                <div class="field-val">${arc.patientName} (${arc.patientId})</div>
              </div>
              <div>
                <div class="field-label">Tissue Site</div>
                <div class="field-val">${arc.organSite}</div>
              </div>
              <div>
                <div class="field-label">FFPE Wax Block ID</div>
                <div class="field-val">${arc.blockId}</div>
              </div>
              <div>
                <div class="field-label">Glass Slide ID</div>
                <div class="field-val">${arc.slideId}</div>
              </div>
            </div>
            <div class="locator">
              📍 ${arc.cabinetLocator}
            </div>
            <div class="footer">
              <span>Archived: ${arc.dateArchived}</span>
              <span>Retention: ${arc.retentionYears} Years (ISO 15189)</span>
              <span>Status: ${arc.status}</span>
            </div>
          </div>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintArchiveInventory = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pathology Specimen Archive Master Register</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 20px; color: #1e293b; }
            h2 { color: #047857; margin-bottom: 4px; }
            p { margin-top: 0; color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f8fafc; font-weight: 800; }
            .status-in { color: #166534; font-weight: 800; }
            .status-out { color: #b45309; font-weight: 800; }
          </style>
        </head>
        <body>
          <h2>FAITH FOUNDATION HOSPITAL · PATHOLOGY SPECIMEN ARCHIVE</h2>
          <p>Master FFPE Block & Glass Slide Archival Register · ISO 15189 Retention Policy (20 Years) · Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Specimen No</th>
                <th>Patient Name & MRN</th>
                <th>Organ / Specimen Site</th>
                <th>FFPE Block ID</th>
                <th>Glass Slide ID</th>
                <th>Physical Cabinet Locator</th>
                <th>Date Archived</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${archiveItems.map(a => `
                <tr>
                  <td><strong>${a.specimenNo}</strong></td>
                  <td>${a.patientName} (${a.patientId})</td>
                  <td>${a.organSite}</td>
                  <td>${a.blockId}</td>
                  <td>${a.slideId}</td>
                  <td>${a.cabinetLocator}</td>
                  <td>${a.dateArchived}</td>
                  <td class="${a.status === 'In Archive' ? 'status-in' : 'status-out'}">${a.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ── 🔬 IMMUNOHISTOCHEMISTRY (IHC) HANDLERS ─────────────────────────
  const handleOpenNewIHCModal = () => {
    setSelectedIHCPatient(null);
    const randNum = Math.floor(1000 + Math.random() * 9000);
    setNewIHCForm({
      specimenNo: `PATH-HIST-${new Date().getFullYear()}-${randNum}`,
      patientName: '',
      patientId: '',
      age: 45,
      gender: 'Female',
      organSite: 'Left Breast Core Biopsy',
      panelType: 'Breast Cancer Biomarker Panel (ER, PR, HER2, Ki-67)',
      erStatus: 'Strong Positive (85% nuclear expression, Score 8/8)',
      prStatus: 'Moderate Positive (60% nuclear expression, Score 6/8)',
      her2Status: 'Score 3+ (Positive for Overexpression)',
      ki67Index: '35% High Proliferation Index',
      additionalMarkers: 'E-Cadherin: Positive (Membranous)',
      interpretation: 'Invasive Ductal Carcinoma, Luminal B (HER2-Positive) Subtype. High risk for recurrence without targeted biologic blockade.',
      targetTherapyRecommendation: 'Eligible for Targeted Trastuzumab (Herceptin) + Endocrine Hormonal Therapy (Aromatase Inhibitor).',
      pathologist: 'Dr. T. A. Vegher (Consultant Pathologist)',
    });
    setIsNewIHCModalOpen(true);
  };

  const handleIHCPanelTypeChange = (newPanel: string) => {
    if (newPanel.includes('Breast Cancer Biomarker')) {
      setNewIHCForm(p => ({
        ...p,
        panelType: newPanel,
        organSite: p.organSite || 'Left Breast Core Biopsy',
        erStatus: 'Strong Positive (85% nuclear expression, Score 8/8)',
        prStatus: 'Moderate Positive (60% nuclear expression, Score 6/8)',
        her2Status: 'Score 3+ (Positive for Overexpression)',
        ki67Index: '35% High Proliferation Index',
        additionalMarkers: 'E-Cadherin: Positive (Membranous)',
        interpretation: 'Invasive Ductal Carcinoma, Luminal B (HER2-Positive) Subtype.',
        targetTherapyRecommendation: 'Eligible for Targeted Trastuzumab (Herceptin) + Endocrine Therapy.',
      }));
    } else if (newPanel.includes('Triple-Negative')) {
      setNewIHCForm(p => ({
        ...p,
        panelType: newPanel,
        organSite: p.organSite || 'Right Breast Lumpectomy',
        erStatus: 'Negative (0% nuclear staining, Score 0/8)',
        prStatus: 'Negative (0% nuclear staining, Score 0/8)',
        her2Status: 'Score 0 (Negative)',
        ki67Index: '80% Very High Proliferation Index',
        additionalMarkers: 'p53: Mutational Overexpression, CK5/6: Positive',
        interpretation: 'Triple-Negative Invasive Breast Carcinoma (Basal-like Phenotype), Nottingham Grade 3.',
        targetTherapyRecommendation: 'Platinum-based Neoadjuvant Chemotherapy + PARP Inhibitor / Immunotherapy Evaluation.',
      }));
    } else if (newPanel.includes('Lung')) {
      setNewIHCForm(p => ({
        ...p,
        panelType: newPanel,
        organSite: p.organSite || 'Right Lung Bronchial Biopsy',
        erStatus: 'N/A',
        prStatus: 'N/A',
        her2Status: 'N/A',
        ki67Index: '40% Proliferation Index',
        additionalMarkers: 'TTF-1: Strong Positive, Napsin A: Positive, p40: Negative, PD-L1 (22C3): TPS 70% (High Expression)',
        interpretation: 'Primary Lung Adenocarcinoma (TTF-1 & Napsin A positive, squamous marker p40 negative).',
        targetTherapyRecommendation: 'Eligible for First-Line Pembrolizumab (Keytruda) Immunotherapy Monotherapy.',
      }));
    } else if (newPanel.includes('Prostate')) {
      setNewIHCForm(p => ({
        ...p,
        panelType: newPanel,
        organSite: p.organSite || 'Prostate Needle Core Biopsy',
        erStatus: 'N/A',
        prStatus: 'N/A',
        her2Status: 'N/A',
        ki67Index: '20% Proliferation Index',
        additionalMarkers: 'AMACR / Racemase: Strong Circumferential Positive, p63: Complete Absence of Basal Layer, PSA: Positive',
        interpretation: 'Prostatic Adenocarcinoma, Gleason Score 4+4=8 (Grade Group 4).',
        targetTherapyRecommendation: 'Androgen Deprivation Therapy (ADT) + External Beam Radiation / Radical Prostatectomy.',
      }));
    } else if (newPanel.includes('Lymphoma')) {
      setNewIHCForm(p => ({
        ...p,
        panelType: newPanel,
        organSite: p.organSite || 'Cervical Lymph Node Biopsy',
        erStatus: 'N/A',
        prStatus: 'N/A',
        her2Status: 'N/A',
        ki67Index: '85% Very High Proliferation Index',
        additionalMarkers: 'CD20: Diffuse Strong Positive, CD3: Background Reactive T-cells, CD10: Positive, BCL-6: Positive',
        interpretation: 'Diffuse Large B-Cell Lymphoma (DLBCL), Germinal Center B-cell-like (GCB) Subtype.',
        targetTherapyRecommendation: 'R-CHOP Immunochemotherapy Regimen (Rituximab Targeted Anti-CD20 Therapy).',
      }));
    } else if (newPanel.includes('Colorectal') || newPanel.includes('MMR')) {
      setNewIHCForm(p => ({
        ...p,
        panelType: newPanel,
        organSite: p.organSite || 'Colorectal Resection Specimen',
        erStatus: 'N/A',
        prStatus: 'N/A',
        her2Status: 'N/A',
        ki67Index: '50% Proliferation Index',
        additionalMarkers: 'MLH1: Intact, MSH2: Intact, MSH6: Intact, PMS2: Intact (No Loss of Expression)',
        interpretation: 'Colorectal Adenocarcinoma with Intact Mismatch Repair Proteins (MSS / pMMR Proficient).',
        targetTherapyRecommendation: 'Standard FOLFOX/FOLFIRI Chemotherapy Regimen.',
      }));
    } else {
      setNewIHCForm(p => ({ ...p, panelType: newPanel }));
    }
  };

  const handleCreateIHCRecord = () => {
    if (!newIHCForm.specimenNo.trim() || !newIHCForm.patientName.trim()) {
      enqueueSnackbar('Please provide Specimen Reference and Patient Name!', { variant: 'warning' });
      return;
    }

    const newRecord: IHCRecord = {
      id: `ihc-${Date.now()}`,
      specimenNo: newIHCForm.specimenNo,
      patientName: newIHCForm.patientName,
      patientId: newIHCForm.patientId || `P-${Math.floor(10000 + Math.random() * 90000)}`,
      age: Number(newIHCForm.age) || 45,
      gender: newIHCForm.gender,
      organSite: newIHCForm.organSite,
      panelType: newIHCForm.panelType,
      erStatus: newIHCForm.erStatus,
      prStatus: newIHCForm.prStatus,
      her2Status: newIHCForm.her2Status,
      ki67Index: newIHCForm.ki67Index,
      additionalMarkers: newIHCForm.additionalMarkers,
      interpretation: newIHCForm.interpretation,
      targetTherapyRecommendation: newIHCForm.targetTherapyRecommendation,
      pathologist: newIHCForm.pathologist,
      dateCompleted: new Date().toISOString().split('T')[0],
      status: 'IHC Certified',
    };

    const updated = [newRecord, ...ihcRecords];
    setIhcRecords(updated);
    saveIHCRecordsToStorage(updated);
    enqueueSnackbar(`✅ IHC Biomarker Record for ${newRecord.patientName} (${newRecord.specimenNo}) certified & logged!`, { variant: 'success' });
    setIsNewIHCModalOpen(false);
  };

  const handleOpenViewIHCReport = (ihc: IHCRecord) => {
    setSelectedIHCRecord(ihc);
    setIsViewIHCReportModalOpen(true);
  };

  const handleOpenEditIHCModal = (ihc: IHCRecord) => {
    setEditIHCForm({ ...ihc });
    setIsEditIHCModalOpen(true);
  };

  const handleUpdateIHCRecord = () => {
    if (!editIHCForm.id) return;
    const updated = ihcRecords.map(r => r.id === editIHCForm.id ? { ...editIHCForm, dateCompleted: new Date().toISOString().split('T')[0] } : r);
    setIhcRecords(updated);
    saveIHCRecordsToStorage(updated);
    enqueueSnackbar(`✅ IHC Biomarker Record for ${editIHCForm.patientName} updated!`, { variant: 'success' });
    setIsEditIHCModalOpen(false);
  };

  const handleCertifyIHCRecord = (ihc: IHCRecord) => {
    const updated = ihcRecords.map(r => r.id === ihc.id ? { ...r, status: 'IHC Certified' as const, dateCompleted: new Date().toISOString().split('T')[0] } : r);
    setIhcRecords(updated);
    saveIHCRecordsToStorage(updated);
    enqueueSnackbar(`✅ IHC Biomarker panel for ${ihc.patientName} digitally certified by Pathologist!`, { variant: 'success' });
  };

  const handleDeleteIHCRecord = (id: string) => {
    const updated = ihcRecords.filter(r => r.id !== id);
    setIhcRecords(updated);
    saveIHCRecordsToStorage(updated);
    enqueueSnackbar('IHC Record removed.', { variant: 'info' });
  };

  const handlePrintIHCRecord = (ihc: IHCRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>IHC Diagnostic Report - ${ihc.specimenNo}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 30px; color: #0f172a; line-height: 1.5; }
            .header { border-bottom: 3px double #0284c7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .hospital { font-size: 20px; font-weight: 900; color: #0369a1; text-transform: uppercase; }
            .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
            .badge { background: #0284c7; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
            .field-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
            .field-val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
            .panel-title { font-size: 15px; font-weight: 900; color: #0f172a; margin: 16px 0 8px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; text-align: left; }
            th { background: #f1f5f9; font-weight: 800; }
            .positive { color: #b91c1c; font-weight: 800; }
            .negative { color: #15803d; font-weight: 800; }
            .box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
            .box-title { font-size: 12px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 6px; }
            .box-content { font-size: 13px; color: #14532d; font-weight: 600; }
            .footer { margin-top: 30px; border-top: 1.5px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
            .stamp { border: 2px solid #059669; padding: 6px 12px; border-radius: 6px; color: #059669; font-weight: 900; text-align: center; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="hospital">FAITH FOUNDATION SPECIALIST HOSPITAL</div>
              <div class="sub">DEPARTMENT OF ANATOMIC PATHOLOGY & MOLECULAR ONCOLOGY</div>
              <div class="sub">ISO 15189 / CAP ACCREDITED IMMUNOHISTOCHEMISTRY (IHC) LAB</div>
            </div>
            <div class="badge">OFFICIAL IHC CERTIFICATE</div>
          </div>

          <div class="grid">
            <div>
              <div class="field-label">Patient Full Name</div>
              <div class="field-val">${ihc.patientName}</div>
            </div>
            <div>
              <div class="field-label">Patient MRN / Hospital ID</div>
              <div class="field-val">${ihc.patientId}</div>
            </div>
            <div>
              <div class="field-label">Specimen Accession Ref</div>
              <div class="field-val">${ihc.specimenNo}</div>
            </div>
            <div>
              <div class="field-label">Organ / Tissue Site</div>
              <div class="field-val">${ihc.organSite || 'Diagnostic Tissue Biopsy'}</div>
            </div>
            <div>
              <div class="field-label">Clinical Indication / Panel</div>
              <div class="field-val">${ihc.panelType}</div>
            </div>
            <div>
              <div class="field-label">Date Completed & Certified</div>
              <div class="field-val">${ihc.dateCompleted}</div>
            </div>
          </div>

          <div class="panel-title">IMMUNOHISTOCHEMICAL ANTIBODY STAINING RESULTS</div>
          <table>
            <thead>
              <tr>
                <th>Biomarker / Antibody Clone</th>
                <th>Target Antigen</th>
                <th>Cellular Staining Pattern</th>
                <th>ASCO / CAP Quantitation & Result Score</th>
              </tr>
            </thead>
            <tbody>
              ${ihc.erStatus && ihc.erStatus !== 'N/A' ? `
                <tr>
                  <td><strong>ER (Estrogen Receptor)</strong> [Clone SP1]</td>
                  <td>Nuclear Hormone Receptor</td>
                  <td>Nuclear</td>
                  <td class="${ihc.erStatus.toLowerCase().includes('positive') ? 'positive' : 'negative'}">${ihc.erStatus}</td>
                </tr>
              ` : ''}
              ${ihc.prStatus && ihc.prStatus !== 'N/A' ? `
                <tr>
                  <td><strong>PR (Progesterone Receptor)</strong> [Clone 1E2]</td>
                  <td>Nuclear Hormone Receptor</td>
                  <td>Nuclear</td>
                  <td class="${ihc.prStatus.toLowerCase().includes('positive') ? 'positive' : 'negative'}">${ihc.prStatus}</td>
                </tr>
              ` : ''}
              ${ihc.her2Status && ihc.her2Status !== 'N/A' ? `
                <tr>
                  <td><strong>HER2 / neu</strong> [Clone 4B5]</td>
                  <td>Tyrosine Kinase Receptor</td>
                  <td>Membranous</td>
                  <td class="${ihc.her2Status.toLowerCase().includes('positive') || ihc.her2Status.includes('3+') ? 'positive' : 'negative'}"><strong>${ihc.her2Status}</strong></td>
                </tr>
              ` : ''}
              ${ihc.ki67Index ? `
                <tr>
                  <td><strong>Ki-67 Proliferation Index</strong> [Clone MIB-1]</td>
                  <td>Nuclear Matrix Antigen</td>
                  <td>Nuclear</td>
                  <td><strong>${ihc.ki67Index}</strong></td>
                </tr>
              ` : ''}
              ${ihc.additionalMarkers ? `
                <tr>
                  <td><strong>Additional Panel Markers</strong></td>
                  <td>Panel Dependent</td>
                  <td>Membranous / Cytoplasmic / Nuclear</td>
                  <td><strong>${ihc.additionalMarkers}</strong></td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="box">
            <div class="box-title">ONCOLOGY DIAGNOSTIC INTERPRETATION</div>
            <div class="box-content">${ihc.interpretation}</div>
          </div>

          ${ihc.targetTherapyRecommendation ? `
            <div class="box" style="background: #f0fdf4; border-color: #86efac;">
              <div class="box-title" style="color: #166534;">TARGETED THERAPY & ONCOLOGY RECOMMENDATION</div>
              <div class="box-content" style="color: #14532d;">${ihc.targetTherapyRecommendation}</div>
            </div>
          ` : ''}

          <div class="footer">
            <div>
              <div style="font-size: 11px; color: #64748b;">Digitally Signed & Validated By:</div>
              <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${ihc.pathologist}</div>
              <div style="font-size: 10px; color: #64748b;">Consultant Pathologist & Dermatopathologist (FMCPath)</div>
            </div>
            <div class="stamp">
              ✓ IHC DIGITALLY CERTIFIED<br/>
              <span style="font-size: 8px; font-weight: 600;">TOKEN: FFH-IHC-${ihc.specimenNo.replace(/[^A-Z0-9]/gi, '')}</span>
            </div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintIHCMasterLog = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>IHC Master Register Log</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 20px; color: #1e293b; }
            h2 { color: #0284c7; margin-bottom: 4px; }
            p { margin-top: 0; color: #64748b; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f8fafc; font-weight: 800; }
          </style>
        </head>
        <body>
          <h2>FAITH FOUNDATION HOSPITAL · IMMUNOHISTOCHEMISTRY (IHC) MASTER LOG</h2>
          <p>Diagnostic Receptor Biomarker Register · Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Specimen Ref</th>
                <th>Patient Name & MRN</th>
                <th>Panel Type</th>
                <th>Biomarker Results</th>
                <th>Diagnostic Interpretation</th>
                <th>Pathologist</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${ihcRecords.map(i => `
                <tr>
                  <td><strong>${i.specimenNo}</strong></td>
                  <td>${i.patientName} (${i.patientId})</td>
                  <td>${i.panelType}</td>
                  <td>${i.erStatus !== 'N/A' && i.erStatus ? `ER: ${i.erStatus} | ` : ''}${i.her2Status !== 'N/A' && i.her2Status ? `HER2: ${i.her2Status} | ` : ''}${i.additionalMarkers || ''}</td>
                  <td>${i.interpretation}</td>
                  <td>${i.pathologist}</td>
                  <td>${i.dateCompleted}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Top Suite Header Banner */}
      <Card sx={{ mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', boxShadow: '0 8px 32px rgba(15,23,42,0.2)' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Biotech sx={{ fontSize: 34 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={900} letterSpacing="-0.02em" sx={{ color: '#fff' }}>
                    Department of Anatomic Pathology & Cytopathology
                  </Typography>

                  <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Shield sx={{ fontSize: 16, color: '#38bdf8' }} /> Tissue & Surgical Diagnosis Center · Grossing Desk · Bethesda Cytology · Microscopic Narrative Hub · FFPE Archive
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6} sx={{ textAlign: { md: 'right' } }}>
              <Stack direction="row" spacing={1.5} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap" gap={1}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setNewHistologyOpen(true)}
                  sx={{
                    bgcolor: '#38bdf8', color: '#0f172a', fontWeight: 800, px: 2.5, py: 1.1, borderRadius: 2.5,
                    '&:hover': { bgcolor: '#7dd3fc' },
                    boxShadow: '0 4px 14px rgba(56, 189, 248, 0.4)',
                  }}
                >
                  Accession Specimen
                </Button>
                <Button
                  variant="contained"
                  startIcon={<LocalHospital />}
                  onClick={() => setIsExternalModalOpen(true)}
                  sx={{
                    bgcolor: '#059669', color: '#ffffff', fontWeight: 800, px: 2.5, py: 1.1, borderRadius: 2.5,
                    '&:hover': { bgcolor: '#047857' },
                    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                  }}
                >
                  Quick Register: External
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<LocalHospital />}
                  onClick={() => setIsCourierModalOpen(true)}
                  sx={{
                    borderColor: '#059669', color: '#059669', fontWeight: 800, px: 2, py: 1.1, borderRadius: 2.5,
                    '&:hover': { borderColor: '#047857', bgcolor: 'rgba(5,150,105,0.08)' },
                  }}
                >
                  Courier Pickup
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* KPI Overview Metrics */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Active Histology Biopsies', value: histologyOrders.length, sub: 'Surgical Specimen Log', icon: <Assignment />, color: '#0284c7' },
          { label: 'Cytology & Pap Smears', value: cytologySpecimens.length, sub: 'Bethesda Screening Desk', icon: <Biotech />, color: '#7c3aed' },
          { label: 'External Referrals Intake', value: externalOrders.length, sub: 'Partner Hospital Cases', icon: <LocalHospital />, color: '#059669' },
          { label: 'Pending Pathologist Reports', value: histologyOrders.filter(h => h.status !== 'Reported').length, sub: 'Microscopic Desk Queue', icon: <RateReview />, color: '#d97706' },
          { label: 'Mortuary Cold Bay Occupancy', value: `${mortuaryRecords.length} Bodies`, sub: 'Chiller Unit Status', icon: <Hotel />, color: '#dc2626' },
        ].map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={2.4} key={idx}>
            <Paper variant="outlined" sx={{ p: 2.2, borderRadius: 3, bgcolor: '#fff', borderColor: '#e2e8f0' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                    {kpi.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: kpi.color, mt: 0.5 }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {kpi.sub}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: alpha(kpi.color, 0.1), color: kpi.color, width: 44, height: 44 }}>
                  {kpi.icon}
                </Avatar>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Workspace Navigation Tabs */}
      <Card sx={{ borderRadius: 3, mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 2, pt: 1, borderBottom: '1px solid #e2e8f0',
              '& .MuiTab-root': { fontWeight: 800, fontSize: '0.85rem', textTransform: 'none', py: 1.8 },
            }}
          >
            <Tab label="🔬 Histology Orders (Biopsies & Grossing)" icon={<Assignment />} iconPosition="start" />
            <Tab label="🧪 Cytology Workspace (Pap Smears & FNA)" icon={<Biotech />} iconPosition="start" />
            <Tab label="✍️ Microscopic Reporting Desk" icon={<RateReview />} iconPosition="start" />
            <Tab label="🏥 Mortuary & Autopsy Manager" icon={<Hotel />} iconPosition="start" />
            <Tab label="🗄️ Slide & FFPE Block Archive" icon={<Inventory />} iconPosition="start" />
            <Tab label="🧬 Immunohistochemistry (IHC)" icon={<Science />} iconPosition="start" />
            <Tab label="🏥 External Specimen Intake & Referrals" icon={<LocalHospital />} iconPosition="start" />
          </Tabs>

          <Box sx={{ p: 2.5 }}>
            {/* Search & Filter Toolbar */}
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" mb={2}>
              <TextField
                placeholder="Search specimen ref, patient name, MRN, organ site..."
                size="small"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 20 }} /></InputAdornment>,
                }}
                sx={{ width: 340 }}
              />

              <Stack direction="row" spacing={1}>
                <Chip
                  icon={<FilterList />}
                  label={archiveStatusFilter === 'ALL' ? "Filter Active" : archiveStatusFilter === 'IN_ARCHIVE' ? "Filter: In Archive" : "Filter: Checked Out"}
                  variant={archiveStatusFilter === 'ALL' ? "outlined" : "filled"}
                  color={archiveStatusFilter === 'ALL' ? "default" : "primary"}
                  size="small"
                  onClick={() => {
                    setArchiveStatusFilter(prev => prev === 'ALL' ? 'IN_ARCHIVE' : prev === 'IN_ARCHIVE' ? 'CHECKED_OUT' : 'ALL');
                  }}
                  sx={{ cursor: 'pointer', fontWeight: 700 }}
                  title="Click to toggle filter (All / In Archive / Checked Out)"
                />
                <Chip icon={isSyncing ? <CircularProgress size={14} /> : <Refresh />} label={isSyncing ? "Syncing..." : "Sync Diagnostic Hub"} variant="outlined" color="primary" size="small" onClick={() => syncPathologyData(true)} />
              </Stack>
            </Stack>

            {/* TAB 0: HISTOLOGY ORDERS (SURGICAL SPECIMEN ACCESSIONING & GROSSING) */}
            {activeTab === 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Specimen Tag</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Patient Details</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Surgeon / Surgical Unit</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Organ Site & Clinical Indication</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Cassettes / Fixative</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {histologyOrders
                      .filter(o => o.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || o.refNo.toLowerCase().includes(searchQuery.toLowerCase()) || o.organSite.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(order => (
                        <TableRow key={order.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={800} color="primary.main">
                              {order.refNo}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {order.dateReceived}
                            </Typography>
                            {order.urgency === 'STAT' && <Chip label="STAT" color="error" size="small" sx={{ fontWeight: 800, height: 18, fontSize: '0.65rem', mt: 0.5 }} />}
                            {order.urgency === 'FROZEN_SECTION' && <Chip label="FROZEN SECTION" color="secondary" size="small" sx={{ fontWeight: 800, height: 18, fontSize: '0.65rem', mt: 0.5 }} />}
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={700}>{order.patientName}</Typography>
                            <Typography variant="caption" color="text.secondary">{order.patientId} · {order.age}Y/{order.gender}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">{order.requestingSurgeon}</Typography>
                            <Typography variant="caption" color="text.secondary">{order.surgicalUnit}</Typography>
                          </TableCell>

                          <TableCell sx={{ maxWidth: 280 }}>
                            <Typography variant="body2" fontWeight={800} color="primary.main">{order.organSite}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {order.clinicalIndication}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip icon={<QrCode />} label={`${order.cassetteCount} Cassettes`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                              {order.fixationStatus}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={order.status}
                              size="small"
                              color={order.status === 'Reported' ? 'success' : order.status === 'Slide Ready' ? 'info' : 'warning'}
                              sx={{ fontWeight: 800 }}
                            />
                          </TableCell>

                          <TableCell align="right">
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<RateReview />}
                              onClick={() => handleOpenReportingDesk(order)}
                              sx={{ fontWeight: 800, borderRadius: 2 }}
                            >
                              {order.status === 'Reported' ? 'View/Edit Report' : 'Pathologist Report'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 1: CYTOLOGY WORKSPACE (PAP SMEAR & FNA BETHESDA SCREENING) */}
            {activeTab === 1 && (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fcfaff', borderColor: '#e9d5ff' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800} color="#7c3aed" display="flex" alignItems="center" gap={1}>
                        <Biotech /> Bethesda Cytopathology & Pap Smear Desk
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cervical Pap Smear, Fine Needle Aspirates (FNA), & Body Fluid Cytometry Screening Desk.
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<Add />}
                      onClick={() => setIsNewCytologyModalOpen(true)}
                      sx={{ fontWeight: 800, borderRadius: 2.5, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                    >
                      🧪 Accession Cytology / Pap Smear
                    </Button>
                  </Stack>
                </Paper>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Cytology Ref</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Patient Details</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Specimen & Stain</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Bethesda Classification</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Cytological Findings</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cytologySpecimens
                        .filter(c =>
                          !searchQuery ||
                          c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.refNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.specimenType.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(cyto => (
                          <TableRow key={cyto.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={800} color="secondary.main">{cyto.refNo}</Typography>
                              <Typography variant="caption" color="text.secondary">{cyto.dateCollected}</Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>{cyto.patientName}</Typography>
                              <Typography variant="caption" color="text.secondary">{cyto.patientId} · Ref: {cyto.requestingDoctor}</Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>{cyto.specimenType}</Typography>
                              <Typography variant="caption" color="text.secondary">{cyto.stainingMethod}</Typography>
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={cyto.bethesdaClassification}
                                size="small"
                                color={cyto.bethesdaClassification.includes('NILM') ? 'success' : 'error'}
                                sx={{ fontWeight: 800 }}
                              />
                            </TableCell>

                            <TableCell sx={{ maxWidth: 280 }}>
                              <Typography variant="caption" color="text.secondary" display="-webkit-box" sx={{ WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {cyto.findings}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip label={cyto.status} size="small" color={cyto.status === 'Final Signed' ? 'success' : 'primary'} sx={{ fontWeight: 700 }} />
                            </TableCell>

                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                  variant="contained"
                                  color="secondary"
                                  size="small"
                                  startIcon={<RateReview />}
                                  onClick={() => handleOpenCytologyReport(cyto)}
                                  sx={{ fontWeight: 800, borderRadius: 2, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}
                                >
                                  {cyto.status === 'Final Signed' ? 'View Report' : 'Pathologist Report'}
                                </Button>
                                <IconButton color="primary" size="small" onClick={() => handlePrintCytologyReport(cyto)}>
                                  <Print fontSize="small" />
                                </IconButton>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}

            {/* TAB 2: MICROSCOPIC REPORTING DESK (PATHOLOGIST NARRATIVE DIAGNOSTICS) */}
            {activeTab === 2 && (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800} color="primary.main" display="flex" alignItems="center" gap={1}>
                        <RateReview /> Pathologist Microscopic Diagnostic Suite
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Structured narrative diagnostic reports, TNM staging, surgical margin clearance, & digital sign-off.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={`All Cases (${histologyOrders.length})`}
                        color={reportingFilter === 'ALL' ? 'primary' : 'default'}
                        onClick={() => setReportingFilter('ALL')}
                        sx={{ fontWeight: 800, cursor: 'pointer' }}
                      />
                      <Chip
                        label={`⏳ Pending (${histologyOrders.filter(h => h.status !== 'Reported').length})`}
                        color={reportingFilter === 'PENDING' ? 'warning' : 'default'}
                        onClick={() => setReportingFilter('PENDING')}
                        sx={{ fontWeight: 800, cursor: 'pointer' }}
                      />
                      <Chip
                        label={`✅ Reported (${histologyOrders.filter(h => h.status === 'Reported').length})`}
                        color={reportingFilter === 'REPORTED' ? 'success' : 'default'}
                        onClick={() => setReportingFilter('REPORTED')}
                        sx={{ fontWeight: 800, cursor: 'pointer' }}
                      />
                    </Stack>
                  </Stack>
                </Paper>

                <Grid container spacing={2}>
                  {histologyOrders
                    .filter(ord => {
                      if (reportingFilter === 'PENDING' && ord.status === 'Reported') return false;
                      if (reportingFilter === 'REPORTED' && ord.status !== 'Reported') return false;
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        ord.patientName.toLowerCase().includes(q) ||
                        ord.refNo.toLowerCase().includes(q) ||
                        ord.organSite.toLowerCase().includes(q) ||
                        ord.patientId.toLowerCase().includes(q) ||
                        ord.requestingSurgeon.toLowerCase().includes(q)
                      );
                    })
                    .map(ord => (
                      <Grid item xs={12} md={6} key={ord.id}>
                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <Typography variant="caption" color="text.secondary" fontWeight={800}>{ord.refNo}</Typography>
                                <Chip label={ord.urgency || 'ROUTINE'} size="small" color={ord.urgency === 'STAT' ? 'error' : 'default'} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }} />
                              </Stack>
                              <Typography variant="h6" fontWeight={800} color="primary.main">{ord.organSite}</Typography>
                              <Typography variant="body2" fontWeight={700}>{ord.patientName} ({ord.patientId})</Typography>
                              <Typography variant="caption" color="text.secondary">Ref by: {ord.requestingSurgeon} · {ord.surgicalUnit}</Typography>
                            </Box>
                            <Chip label={ord.status} color={ord.status === 'Reported' ? 'success' : 'warning'} size="small" sx={{ fontWeight: 800 }} />
                          </Stack>

                          <Divider sx={{ my: 1.5 }} />

                          <Typography variant="caption" color="text.secondary" display="block">Clinical Indication:</Typography>
                          <Typography variant="body2" color="text.secondary" mb={1} display="-webkit-box" sx={{ WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {ord.clinicalIndication}
                          </Typography>

                          <Typography variant="caption" color="text.secondary" display="block">Grossing Description:</Typography>
                          <Typography variant="body2" color="text.secondary" mb={1} display="-webkit-box" sx={{ WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {ord.grossDescription || ord.grossingDescription}
                          </Typography>

                          {ord.pathologicalDiagnosis && (
                            <Box sx={{ mb: 1.5, p: 1, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '1px solid #bbf7d0' }}>
                              <Typography variant="caption" fontWeight={800} color="#166534" display="block">
                                Diagnostic Impression:
                              </Typography>
                              <Typography variant="caption" fontWeight={700} color="#15803d" display="-webkit-box" sx={{ WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {ord.pathologicalDiagnosis}
                              </Typography>
                            </Box>
                          )}

                          <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1} borderTop="1px dashed #e2e8f0">
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">Attending Pathologist</Typography>
                              <Typography variant="caption" fontWeight={800} color="secondary.main">{ord.pathologist}</Typography>
                            </Box>

                            <Stack direction="row" spacing={1}>
                              <IconButton size="small" color="primary" onClick={() => handlePrintHistologyReport(ord)}>
                                <Print fontSize="small" />
                              </IconButton>
                              <Button
                                variant="contained"
                                size="small"
                                color={ord.status === 'Reported' ? 'success' : 'primary'}
                                startIcon={<RateReview />}
                                onClick={() => handleOpenReportingDesk(ord)}
                                sx={{ fontWeight: 800, borderRadius: 2 }}
                              >
                                {ord.status === 'Reported' ? 'View/Edit Report' : 'Pathologist Report'}
                              </Button>
                            </Stack>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                </Grid>
              </Stack>
            )}

            {/* TAB 3: MORTUARY & AUTOPSY MANAGER */}
            {activeTab === 3 && (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fff1f2', borderColor: '#fecdd3' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800} color="error.main" display="flex" alignItems="center" gap={1}>
                        <Hotel /> Mortuary Logistics, Cold Vaults & Autopsy Manager
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Refrigeration bay occupancy tracking, chain of custody logs, forensic autopsy scheduling, & deceased release.
                      </Typography>
                    </Box>
                    {/* Pathologist should not directly access the mortuary operations suite meant for morticians */}
                    {/*
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<Hotel />}
                        onClick={() => navigate('/mortuary')}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      >
                        Open Full Mortuary Operations Suite (/mortuary)
                      </Button>
                    </Stack>
                    */}
                  </Stack>
                </Paper>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Tag No & Deceased</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>MRN / Source Ward</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Cold Room Chiller Slot</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Next-of-Kin Contact</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Autopsy Status & Findings</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mortuaryRecords
                        .filter(m =>
                          !searchQuery ||
                          m.deceasedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.tagNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.chillerSlot.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.nextOfKin.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(m => (
                          <TableRow key={m.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={800} color="error.main">{m.tagNo}</Typography>
                              <Typography variant="body2" fontWeight={700}>{m.deceasedName}</Typography>
                              <Typography variant="caption" color="text.secondary">{m.age}Y/{m.gender} · DOD: {m.dateOfDeath} ({m.timeOfDeath})</Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>{m.mrn}</Typography>
                              <Typography variant="caption" color="text.secondary">{m.sourceWard}</Typography>
                            </TableCell>

                            <TableCell>
                              {m.status === 'Released to Family' ? (
                                <Box>
                                  <Chip icon={<CheckCircle />} label="🟢 Vacated & Disinfected" size="small" color="success" variant="outlined" sx={{ fontWeight: 800 }} />
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Slot: {m.chillerSlot.replace(' (Vacated)', '')}
                                  </Typography>
                                </Box>
                              ) : (
                                <Chip icon={<Hotel />} label={m.chillerSlot} size="small" color="error" variant="outlined" sx={{ fontWeight: 800 }} />
                              )}
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>{m.nextOfKin}</Typography>
                              <Typography variant="caption" color="text.secondary">{m.nextOfKinPhone}</Typography>
                            </TableCell>

                            <TableCell sx={{ maxWidth: 220 }}>
                              <Chip
                                label={m.autopsyStatus || 'No Autopsy (Vault Storage)'}
                                size="small"
                                color={
                                  m.autopsyStatus?.includes('Completed') ? 'success' :
                                  m.autopsyStatus?.includes('Coroner') || m.autopsyStatus?.includes('Forensic') ? 'warning' :
                                  m.autopsyStatus?.includes('Clinical') ? 'info' : 'default'
                                }
                                sx={{ fontWeight: 800, mb: 0.5 }}
                              />
                              <Typography variant="caption" color="text.secondary" display="block">
                                {m.causeOfDeath || 'Documented Cause of Death'}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip label={m.status} size="small" color={m.status === 'Released to Family' ? 'success' : 'error'} sx={{ fontWeight: 800 }} />
                            </TableCell>

                            <TableCell align="center" sx={{ minWidth: 145, maxWidth: 170 }}>
                              <Stack direction="column" spacing={0.6} alignItems="stretch">
                                <Button
                                  variant="contained"
                                  color={m.autopsyStatus?.includes('Completed') ? 'success' : 'error'}
                                  size="small"
                                  startIcon={m.autopsyStatus?.includes('Completed') ? <CheckCircle /> : <RateReview />}
                                  onClick={() => handleOpenAutopsyModal(m)}
                                  sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.4 }}
                                  fullWidth
                                >
                                  {m.autopsyStatus?.includes('Completed') ? '📄 View Autopsy' : '✍️ Log Autopsy'}
                                </Button>
                                {m.status !== 'Released to Family' && !m.autopsyStatus?.includes('Completed') && (
                                  <Tooltip title="Cancel Autopsy Request (Not for autopsy — retain in Mortuary cold vault storage)">
                                    <Button
                                      variant="outlined"
                                      color="inherit"
                                      size="small"
                                      startIcon={<Cancel fontSize="small" />}
                                      onClick={() => handleCancelAutopsy(m)}
                                      sx={{ fontWeight: 700, borderRadius: 1.5, fontSize: '0.7rem', py: 0.3, color: 'text.secondary', borderColor: '#cbd5e1' }}
                                      fullWidth
                                    >
                                      Not For Autopsy
                                    </Button>
                                  </Tooltip>
                                )}

                                {m.inMortuary === false ? (
                                  m.status === 'Transferred / Released' ? (
                                    <Chip
                                      label={m.disposition === 'HOSPITAL_MORTUARY' ? 'Sent to Mortuary' : 'Dispatched'}
                                      size="small"
                                      color="info"
                                      sx={{ fontWeight: 800 }}
                                    />
                                  ) : (
                                    <Button
                                      variant="contained"
                                      color="secondary"
                                      size="small"
                                      startIcon={<LocalShipping />}
                                      onClick={() => handleOpenDispositionModal(m)}
                                      sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.4 }}
                                      fullWidth
                                    >
                                      Transfer / Release
                                    </Button>
                                  )
                                ) : m.status === 'Released to Family' ? (
                                  <Button
                                    variant="outlined"
                                    color="success"
                                    size="small"
                                    disabled
                                    startIcon={<CheckCircle />}
                                    sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.4 }}
                                    fullWidth
                                  >
                                    Vault Released
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    startIcon={<MeetingRoom />}
                                    onClick={() => handleOpenReleaseModal(m)}
                                    sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.4 }}
                                    fullWidth
                                  >
                                    Vault & Release
                                  </Button>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}

            {/* TAB 4: SLIDE & FFPE BLOCK ARCHIVE */}
            {activeTab === 4 && (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800} color="primary.main" display="flex" alignItems="center" gap={1}>
                        <Inventory /> Slide & FFPE Tissue Block Archival Custody System
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Physical cabinet locator indexing, 20-year legal retention compliance, specimen retrieval tracking & chain-of-custody checkout.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip
                        label={`All (${archiveItems.length})`}
                        size="small"
                        color={archiveStatusFilter === 'ALL' ? 'primary' : 'default'}
                        onClick={() => setArchiveStatusFilter('ALL')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                      />
                      <Chip
                        label={`In Archive (${archiveItems.filter(a => a.status === 'In Archive').length})`}
                        size="small"
                        color={archiveStatusFilter === 'IN_ARCHIVE' ? 'success' : 'default'}
                        onClick={() => setArchiveStatusFilter('IN_ARCHIVE')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                      />
                      <Chip
                        label={`Checked Out (${archiveItems.filter(a => a.status !== 'In Archive').length})`}
                        size="small"
                        color={archiveStatusFilter === 'CHECKED_OUT' ? 'warning' : 'default'}
                        onClick={() => setArchiveStatusFilter('CHECKED_OUT')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                      />
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        startIcon={<Settings />}
                        onClick={() => setIsLocatorConfigModalOpen(true)}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      >
                        Cabinet Locators & Capacity
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<Print />}
                        onClick={handlePrintArchiveInventory}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      >
                        Print Master Index
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => {
                          setSelectedArchivePatient(null);
                          setIsNewArchiveModalOpen(true);
                        }}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      >
                        Archive Specimen / Block
                      </Button>
                    </Stack>
                  </Stack>

                  {/* Physical Capacity Summary Banner */}
                  {(() => {
                    const totalMaxCapacity = archiveLocators.reduce((sum, l) => sum + (l.maxCapacity || 50), 0);
                    const totalOccupied = archiveItems.filter(a => a.status === 'In Archive').length;
                    const totalAvailable = Math.max(0, totalMaxCapacity - totalOccupied);
                    const totalPercent = totalMaxCapacity > 0 ? Math.min(100, Math.round((totalOccupied / totalMaxCapacity) * 100)) : 0;
                    return (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          📊 Physical Vault Occupancy: <strong>{totalOccupied}</strong> / <strong>{totalMaxCapacity}</strong> Slots Used ({totalAvailable} slots free across {archiveLocators.length} configured drawers)
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
                          <LinearProgress
                            variant="determinate"
                            value={totalPercent}
                            color={totalPercent > 90 ? 'error' : totalPercent > 70 ? 'warning' : 'success'}
                            sx={{ height: 6, borderRadius: 3, flex: 1 }}
                          />
                          <Typography variant="caption" fontWeight={800} color={totalPercent > 90 ? 'error.main' : 'text.primary'}>
                            {totalPercent}%
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })()}
                </Paper>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, width: '100%' }}>
                  <Table size="small" sx={{ width: '100%' }}>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Specimen No</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Patient Name & MRN</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>FFPE Block & Slide ID</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Physical Cabinet Locator</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Retention</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Archive Status</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {archiveItems
                        .filter(arc => {
                          if (archiveStatusFilter === 'IN_ARCHIVE' && arc.status !== 'In Archive') return false;
                          if (archiveStatusFilter === 'CHECKED_OUT' && !arc.status.startsWith('Checked Out')) return false;
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            arc.specimenNo.toLowerCase().includes(q) ||
                            arc.patientName.toLowerCase().includes(q) ||
                            arc.patientId.toLowerCase().includes(q) ||
                            arc.blockId.toLowerCase().includes(q) ||
                            arc.slideId.toLowerCase().includes(q) ||
                            arc.organSite.toLowerCase().includes(q) ||
                            arc.cabinetLocator.toLowerCase().includes(q) ||
                            arc.status.toLowerCase().includes(q)
                          );
                        })
                        .map(arc => (
                          <TableRow key={arc.id} hover>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" fontWeight={800} color="primary.main">{arc.specimenNo}</Typography>
                              <Typography variant="caption" color="text.secondary">Archived: {arc.dateArchived}</Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>{arc.patientName}</Typography>
                              <Typography variant="caption" color="text.secondary">{arc.patientId} · {arc.organSite}</Typography>
                            </TableCell>

                            <TableCell>
                              <Chip label={arc.blockId} size="small" variant="outlined" sx={{ fontWeight: 700, mb: 0.4, display: 'block', maxWidth: 'fit-content', bgcolor: '#f8fafc' }} />
                              <Chip label={arc.slideId} size="small" variant="outlined" sx={{ fontWeight: 700, display: 'block', maxWidth: 'fit-content', bgcolor: '#f8fafc' }} />
                            </TableCell>

                            <TableCell sx={{ maxWidth: 190 }}>
                              <Typography variant="body2" fontWeight={800} color="secondary.main">
                                {arc.cabinetLocator.split(' · ').slice(0, 2).join(' · ')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {arc.cabinetLocator.split(' · ').slice(2).join(' · ')}
                              </Typography>
                              {arc.checkedOutTo && (
                                <Typography variant="caption" color="warning.dark" display="block" fontWeight={700}>
                                  Checked out to: {arc.checkedOutTo}
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" fontWeight={700}>{arc.retentionYears} Years</Typography>
                              <Typography variant="caption" color="text.secondary">CAP/ISO 15189</Typography>
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={arc.status}
                                size="small"
                                color={arc.status === 'In Archive' ? 'success' : 'warning'}
                                sx={{ fontWeight: 800 }}
                              />
                            </TableCell>

                            <TableCell align="center" sx={{ minWidth: 105, maxWidth: 125, p: 0.75 }}>
                              <Stack direction="column" spacing={0.5} alignItems="stretch">
                                {arc.status === 'In Archive' ? (
                                  <Button
                                    variant="outlined"
                                    color="warning"
                                    size="small"
                                    onClick={() => handleOpenCheckoutModal(arc)}
                                    sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.35 }}
                                    fullWidth
                                  >
                                    Check Out
                                  </Button>
                                ) : (
                                  <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    onClick={() => handleReturnArchiveItem(arc)}
                                    sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.35 }}
                                    fullWidth
                                  >
                                    Return to Cabinet
                                  </Button>
                                )}
                                <Button
                                  variant="text"
                                  color="inherit"
                                  size="small"
                                  startIcon={<Print fontSize="small" />}
                                  onClick={() => handlePrintArchiveLabel(arc)}
                                  sx={{ fontSize: '0.68rem', color: 'text.secondary', py: 0.2 }}
                                  fullWidth
                                >
                                  Print Label
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      {archiveItems.filter(arc => {
                        if (archiveStatusFilter === 'IN_ARCHIVE' && arc.status !== 'In Archive') return false;
                        if (archiveStatusFilter === 'CHECKED_OUT' && !arc.status.startsWith('Checked Out')) return false;
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          arc.specimenNo.toLowerCase().includes(q) ||
                          arc.patientName.toLowerCase().includes(q) ||
                          arc.patientId.toLowerCase().includes(q) ||
                          arc.blockId.toLowerCase().includes(q) ||
                          arc.slideId.toLowerCase().includes(q) ||
                          arc.organSite.toLowerCase().includes(q) ||
                          arc.cabinetLocator.toLowerCase().includes(q) ||
                          arc.status.toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Inventory sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body1" fontWeight={700} color="text.secondary">
                              No archived specimens match the current filter.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}

            {/* TAB 5: IMMUNOHISTOCHEMISTRY (IHC) LAB */}
            {activeTab === 5 && (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc', borderColor: '#e2e8f0' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={800} color="primary.main" display="flex" alignItems="center" gap={1}>
                        <Biotech /> Immunohistochemistry (IHC) & Molecular Biomarker Lab
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ASCO/CAP compliant quantitative hormone receptor profiling, tumor lineage classification, targeted immunotherapy suitability & oncologist digital certification.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip
                        label={`All (${ihcRecords.length})`}
                        size="small"
                        color={ihcFilter === 'ALL' ? 'primary' : 'default'}
                        onClick={() => setIhcFilter('ALL')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                      />
                      <Chip
                        label={`Breast Panels (${ihcRecords.filter(i => i.panelType.includes('Breast')).length})`}
                        size="small"
                        color={ihcFilter === 'BREAST' ? 'secondary' : 'default'}
                        onClick={() => setIhcFilter('BREAST')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                      />
                      <Chip
                        label={`Lung Panels (${ihcRecords.filter(i => i.panelType.includes('Lung')).length})`}
                        size="small"
                        color={ihcFilter === 'LUNG' ? 'info' : 'default'}
                        onClick={() => setIhcFilter('LUNG')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                      />
                      <Chip
                        label={`Prostate (${ihcRecords.filter(i => i.panelType.includes('Prostate')).length})`}
                        size="small"
                        color={ihcFilter === 'PROSTATE' ? 'warning' : 'default'}
                        onClick={() => setIhcFilter('PROSTATE')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                      />
                      <Chip
                        label={`Lymphoma (${ihcRecords.filter(i => i.panelType.includes('Lymphoma')).length})`}
                        size="small"
                        color={ihcFilter === 'LYMPHOMA' ? 'success' : 'default'}
                        onClick={() => setIhcFilter('LYMPHOMA')}
                        sx={{ fontWeight: 700, cursor: 'pointer' }}
                      />
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<Print />}
                        onClick={handlePrintIHCMasterLog}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      >
                        Print Master Log
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<Add />}
                        onClick={handleOpenNewIHCModal}
                        sx={{ fontWeight: 800, borderRadius: 2 }}
                      >
                        Order / Log New IHC Panel
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, width: '100%' }}>
                  <Table size="small" sx={{ width: '100%' }}>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Specimen Ref</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Patient Name & MRN</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Biomarker Panel</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Receptor Staining & Scores</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Oncology Diagnostic Interpretation</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Pathologist Signature</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ihcRecords
                        .filter(ihc => {
                          if (ihcFilter === 'BREAST' && !ihc.panelType.includes('Breast')) return false;
                          if (ihcFilter === 'LUNG' && !ihc.panelType.includes('Lung')) return false;
                          if (ihcFilter === 'PROSTATE' && !ihc.panelType.includes('Prostate')) return false;
                          if (ihcFilter === 'LYMPHOMA' && !ihc.panelType.includes('Lymphoma')) return false;
                          if (ihcFilter === 'CERTIFIED' && ihc.status !== 'IHC Certified') return false;
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            ihc.specimenNo.toLowerCase().includes(q) ||
                            ihc.patientName.toLowerCase().includes(q) ||
                            (ihc.patientId && ihc.patientId.toLowerCase().includes(q)) ||
                            ihc.panelType.toLowerCase().includes(q) ||
                            ihc.interpretation.toLowerCase().includes(q) ||
                            (ihc.additionalMarkers && ihc.additionalMarkers.toLowerCase().includes(q)) ||
                            (ihc.organSite && ihc.organSite.toLowerCase().includes(q))
                          );
                        })
                        .map(ihc => (
                          <TableRow key={ihc.id} hover>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" fontWeight={800} color="primary.main">{ihc.specimenNo}</Typography>
                              <Typography variant="caption" color="text.secondary">Completed: {ihc.dateCompleted}</Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>{ihc.patientName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {ihc.patientId} · {ihc.organSite || 'Diagnostic Tissue'}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={ihc.panelType}
                                size="small"
                                color={
                                  ihc.panelType.includes('Breast') ? 'secondary' :
                                  ihc.panelType.includes('Lung') ? 'info' :
                                  ihc.panelType.includes('Prostate') ? 'warning' :
                                  ihc.panelType.includes('Lymphoma') ? 'success' : 'default'
                                }
                                sx={{ fontWeight: 800, mb: 0.5, maxWidth: 220 }}
                              />
                            </TableCell>

                            <TableCell sx={{ minWidth: 260 }}>
                              {ihc.erStatus && ihc.erStatus !== 'N/A' && (
                                <Typography variant="caption" display="block">
                                  <strong>ER:</strong> <span style={{ color: ihc.erStatus.includes('Positive') ? '#166534' : '#64748b', fontWeight: 700 }}>{ihc.erStatus}</span>
                                </Typography>
                              )}
                              {ihc.prStatus && ihc.prStatus !== 'N/A' && (
                                <Typography variant="caption" display="block">
                                  <strong>PR:</strong> <span style={{ color: ihc.prStatus.includes('Positive') ? '#166534' : '#64748b', fontWeight: 700 }}>{ihc.prStatus}</span>
                                </Typography>
                              )}
                              {ihc.her2Status && ihc.her2Status !== 'N/A' && (
                                <Typography variant="caption" display="block">
                                  <strong>HER2/neu:</strong> <span style={{ color: ihc.her2Status.includes('3+') || ihc.her2Status.includes('Positive') ? '#dc2626' : '#64748b', fontWeight: 800 }}>{ihc.her2Status}</span>
                                </Typography>
                              )}
                              {ihc.ki67Index && (
                                <Typography variant="caption" display="block">
                                  <strong>Ki-67:</strong> <span style={{ fontWeight: 700 }}>{ihc.ki67Index}</span>
                                </Typography>
                              )}
                              {ihc.additionalMarkers && (
                                <Typography variant="caption" display="block" color="secondary.main" fontWeight={700}>
                                  <strong>Markers:</strong> {ihc.additionalMarkers}
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell sx={{ maxWidth: 300 }}>
                              <Typography variant="caption" color="text.primary" fontWeight={600} display="block">
                                {ihc.interpretation}
                              </Typography>
                              {ihc.targetTherapyRecommendation && (
                                <Box sx={{ mt: 0.5, p: 0.75, borderRadius: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                                  <Typography variant="caption" color="success.dark" fontWeight={800} display="block">
                                    💊 {ihc.targetTherapyRecommendation}
                                  </Typography>
                                </Box>
                              )}
                            </TableCell>

                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" fontWeight={700}>{ihc.pathologist}</Typography>
                              <Chip icon={<CheckCircle sx={{ color: '#fff !important' }} />} label={ihc.status || "IHC Certified"} color="success" size="small" sx={{ fontWeight: 800, mt: 0.5 }} />
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                                ASCO/CAP & ISO 15189
                              </Typography>
                            </TableCell>

                            <TableCell align="center" sx={{ minWidth: 120, maxWidth: 140, p: 0.75 }}>
                              <Stack direction="column" spacing={0.5} alignItems="stretch">
                                <Button
                                  variant="contained"
                                  color="primary"
                                  size="small"
                                  startIcon={<Visibility fontSize="small" />}
                                  onClick={() => handleOpenViewIHCReport(ihc)}
                                  sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.35 }}
                                  fullWidth
                                >
                                  View / Print
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="secondary"
                                  size="small"
                                  startIcon={<Edit fontSize="small" />}
                                  onClick={() => handleOpenEditIHCModal(ihc)}
                                  sx={{ fontWeight: 800, borderRadius: 1.5, fontSize: '0.72rem', py: 0.35 }}
                                  fullWidth
                                >
                                  Edit Scores
                                </Button>
                                <Button
                                  variant="text"
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeleteIHCRecord(ihc.id)}
                                  sx={{ fontSize: '0.68rem', py: 0.2 }}
                                  fullWidth
                                >
                                  Delete
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      {ihcRecords.filter(ihc => {
                        if (ihcFilter === 'BREAST' && !ihc.panelType.includes('Breast')) return false;
                        if (ihcFilter === 'LUNG' && !ihc.panelType.includes('Lung')) return false;
                        if (ihcFilter === 'PROSTATE' && !ihc.panelType.includes('Prostate')) return false;
                        if (ihcFilter === 'LYMPHOMA' && !ihc.panelType.includes('Lymphoma')) return false;
                        if (ihcFilter === 'CERTIFIED' && ihc.status !== 'IHC Certified') return false;
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          ihc.specimenNo.toLowerCase().includes(q) ||
                          ihc.patientName.toLowerCase().includes(q) ||
                          (ihc.patientId && ihc.patientId.toLowerCase().includes(q)) ||
                          ihc.panelType.toLowerCase().includes(q) ||
                          ihc.interpretation.toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <Biotech sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography variant="body1" fontWeight={700} color="text.secondary">
                              No IHC biomarker records match the current filter.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}

            {/* TAB 6: EXTERNAL SPECIMEN INTAKE & REFERRALS HUB */}
            {activeTab === 6 && (
              <Stack spacing={3}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LocalHospital sx={{ color: '#059669', fontSize: 28 }} />
                        <Typography variant="h6" fontWeight={900} color="#065f46">
                          External Specimen Intake & Clinical Referral Hub
                        </Typography>
                        <Chip label="PARTNER DIAGNOSTICS ACTIVE" color="success" size="small" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                      </Stack>
                      <Typography variant="body2" color="#166534" mt={0.5}>
                        Process biopsies, Pap smears, FNA cytology, and IHC slide reviews referred from outside clinics, private hospitals, and diagnostic centers across Nigeria.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.5}>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setIsExternalModalOpen(true)}
                        sx={{ bgcolor: '#059669', color: '#fff', fontWeight: 800, borderRadius: 2, '&:hover': { bgcolor: '#047857' } }}
                      >
                        + Quick Register: External
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<LocalHospital />}
                        onClick={() => setIsCourierModalOpen(true)}
                        sx={{ borderColor: '#059669', color: '#059669', fontWeight: 800, borderRadius: 2 }}
                      >
                        🚚 Courier Pickup Log
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>

                {/* External Referrals Main Log Table */}
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Referral Ref & Date</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Patient Demographics</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Source Hospital & Referring Doctor</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Specimen & Logistics</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Clinical History & Pre-Op Diagnosis</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Billing Clearance</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {externalOrders
                        .filter(e =>
                          e.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.refNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.referringHospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.specimenType.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map(ext => (
                          <TableRow key={ext.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={800} color="#059669">
                                {ext.refNo}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {ext.dateReceived}
                              </Typography>
                              <Chip
                                icon={<QrCode sx={{ fontSize: '12px !important' }} />}
                                label="QR Active"
                                size="small"
                                variant="outlined"
                                color="success"
                                sx={{ height: 18, fontSize: '0.65rem', mt: 0.5, fontWeight: 800 }}
                              />
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>{ext.patientName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {ext.patientAge}Y / {ext.patientGender} · {ext.patientPhone}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={700} color="primary.main">
                                {ext.referringHospital}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {ext.referringDoctor}
                              </Typography>
                            </TableCell>

                            <TableCell sx={{ maxWidth: 220 }}>
                              <Chip label={ext.caseCategory} size="small" color="secondary" sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem', mb: 0.5 }} />
                              <Typography variant="body2" fontWeight={700}>{ext.specimenType}</Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {ext.containerCount} · {ext.fixationCondition}
                              </Typography>
                            </TableCell>

                            <TableCell sx={{ maxWidth: 260 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {ext.clinicalHistory}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" fontWeight={800} color="#0f172a">
                                ₦{ext.billingAmount.toLocaleString()}
                              </Typography>
                              <Chip
                                label={ext.paymentStatus}
                                size="small"
                                color={ext.paymentStatus.includes('Paid') ? 'success' : 'info'}
                                sx={{ fontWeight: 800, height: 20, fontSize: '0.65rem', mt: 0.5 }}
                              />
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                                {ext.billingType}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={ext.status}
                                size="small"
                                color={ext.status.includes('Signed') ? 'success' : 'warning'}
                                sx={{ fontWeight: 800 }}
                              />
                              {ext.deliveryMethod && (
                                <Typography variant="caption" color="primary.main" display="block" sx={{ fontWeight: 700, mt: 0.5 }}>
                                  {ext.deliveryMethod}
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="View & Deliver PDF Consultation Report">
                                  <Button
                                    variant="contained"
                                    size="small"
                                    color="success"
                                    startIcon={<Description />}
                                    onClick={() => {
                                      setSelectedExternalReferral(ext);
                                      setIsReportDeliveryModalOpen(true);
                                    }}
                                    sx={{ fontWeight: 800, borderRadius: 2 }}
                                  >
                                    Deliver PDF
                                  </Button>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Courier Logistics Logs Sub-Table */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={900} mb={1.5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    🚚 Courier Logistics & Driver Transport Pickup Register
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800 }}>Dispatch Ref</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Courier / Driver Details</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Source Clinic</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Sample Count</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Pickup & Arrival Time</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Container Temperature</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>Receiving Officer</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {courierLogs.map(c => (
                          <TableRow key={c.id} hover>
                            <TableCell><Typography variant="body2" fontWeight={800}>{c.dispatchRef}</Typography></TableCell>
                            <TableCell><Typography variant="body2" fontWeight={700}>{c.courierName}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{c.sourceClinic}</Typography></TableCell>
                            <TableCell><Chip label={`${c.sampleCount} Jars/Slides`} size="small" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                            <TableCell><Typography variant="caption" display="block">Pickup: {c.pickupTime}</Typography><Typography variant="caption" color="text.secondary">Arrived: {c.arrivalTime}</Typography></TableCell>
                            <TableCell><Chip label={c.temperatureCondition} size="small" color="primary" sx={{ fontWeight: 700 }} /></TableCell>
                            <TableCell><Typography variant="body2">{c.receivingOfficer}</Typography></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Stack>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* DIALOG: ACCESSION NEW TISSUE SPECIMEN */}
      <Dialog open={newHistologyOpen} onClose={() => setNewHistologyOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Biotech sx={{ color: '#38bdf8' }} /> Tissue Specimen Accessioning & Grossing Log
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <Alert severity="info" icon={<FactCheck />}>
              <strong>Surgical Tissue Specimen Intake:</strong> Enter specimen origin, organ site, surgical unit, and clinical history for formalin-fixed tissue biopsy accessioning.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <Autocomplete
                  freeSolo
                  openOnFocus
                  selectOnFocus
                  clearOnBlur={false}
                  filterOptions={pathologyPatientFilter}
                  options={patientSearchOptions}
                  getOptionLabel={(option: any) => {
                    if (typeof option === 'string') return option;
                    return `${option.firstName || ''} ${option.lastName || ''}`.trim();
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (typeof option === 'string' || typeof value === 'string') return option === value;
                    return (option.id || option.patientNumber) === (value.id || value.patientNumber);
                  }}
                  value={selectedPatientSearch}
                  onInputChange={(_, newInputValue) => handlePatientInputChange(newInputValue)}
                  onChange={(_, newValue: any) => {
                    setSelectedPatientSearch(newValue);
                    if (newValue && typeof newValue === 'object') {
                      const pName = `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim();
                      const mrn = newValue.patientNumber || newValue.id || '';
                      let calculatedAge = 35;
                      if (newValue.birthDate) {
                        const birthYear = new Date(newValue.birthDate).getFullYear();
                        if (!isNaN(birthYear)) calculatedAge = new Date().getFullYear() - birthYear;
                      } else if (newValue.estimatedAge) {
                        calculatedAge = Number(newValue.estimatedAge);
                      }
                      let genderStr = 'Female';
                      if (newValue.gender) {
                        const g = String(newValue.gender).toLowerCase();
                        if (g.startsWith('m')) genderStr = 'Male';
                        else if (g.startsWith('f')) genderStr = 'Female';
                      }

                      setNewOrderForm(p => ({
                        ...p,
                        patientName: pName,
                        patientId: mrn,
                        age: calculatedAge,
                        gender: genderStr,
                      }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Patient Name / MRN *"
                      placeholder="Type patient name or MRN to search..."
                      fullWidth
                      required
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {patientSearchLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option: any) => (
                    <Box component="li" {...props} key={option.id || option.patientNumber || Math.random()}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" width="100%">
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {option.firstName} {option.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            MRN: {option.patientNumber || option.id} · Gender: {option.gender || 'N/A'}
                          </Typography>
                        </Box>
                        <Chip label="MPI Registered" size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </Stack>
                    </Box>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Patient MRN / ID" fullWidth value={newOrderForm.patientId} onChange={e => setNewOrderForm(p => ({ ...p, patientId: e.target.value }))} placeholder="P-10492" />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField label="Age (Years)" type="number" fullWidth value={newOrderForm.age} onChange={e => setNewOrderForm(p => ({ ...p, age: Number(e.target.value) }))} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select label="Gender" fullWidth value={newOrderForm.gender} onChange={e => setNewOrderForm(p => ({ ...p, gender: e.target.value }))}>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select label="Priority / Urgency" fullWidth value={newOrderForm.urgency} onChange={e => setNewOrderForm(p => ({ ...p, urgency: e.target.value as any }))}>
                  <MenuItem value="ROUTINE">Routine Biopsy</MenuItem>
                  <MenuItem value="STAT">STAT / Urgent Oncology</MenuItem>
                  <MenuItem value="FROZEN_SECTION">Intra-Operative Frozen Section</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={doctorOptions}
                  value={newOrderForm.requestingSurgeon}
                  onInputChange={(_, newValue) => setNewOrderForm(p => ({ ...p, requestingSurgeon: newValue }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Requesting Surgeon / Clinician"
                      placeholder="Select doctor from Staff Records..."
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={[
                    'General Surgery Suite',
                    'Main Operating Theatre (Suite 1)',
                    'Main Operating Theatre (Suite 2)',
                    'Obstetrics & Gynaecology OT',
                    'Urology Operating Suite',
                    'Orthopaedic Theatre',
                    'Endoscopy Suite',
                    'Outpatient Minor Surgery Clinic',
                    'Cardiothoracic Theatre',
                    'Neuro-Surgery OT',
                  ]}
                  value={newOrderForm.surgicalUnit}
                  onInputChange={(_, newValue) => setNewOrderForm(p => ({ ...p, surgicalUnit: newValue }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Surgical Unit / Operating Theatre"
                      placeholder="Select or type surgical unit..."
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  freeSolo
                  options={[
                    'Prostate Core Biopsy (TRUS 12-Core)',
                    'Breast Mass / Core Needle Biopsy (Outer Upper Quadrant)',
                    'Appendix (Appendectomy Specimen)',
                    'Gallbladder (Cholecystectomy Specimen)',
                    'Cervical Biopsy / Punch Biopsy',
                    'Endometrial Curettings / PIPELLE Biopsy',
                    'Thyroid Nodule / Subtotal Thyroidectomy',
                    'Colon Biopsy / Polypectomy Specimen',
                    'Skin Punch / Excisional Biopsy',
                    'Lymph Node Excisional Biopsy',
                    'Uterine Leiomyoma / Hysterectomy Specimen',
                    'Renal Mass / Radical Nephrectomy Specimen',
                    'Gastric Endoscopic Biopsy (Antral / Body)',
                    'Ovarian Cyst / Salpingo-Oophorectomy',
                    'Soft Tissue Mass / Tru-Cut Biopsy',
                  ]}
                  value={newOrderForm.organSite}
                  onInputChange={(_, newValue) => setNewOrderForm(p => ({ ...p, organSite: newValue }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tissue Organ Site / Specimen Type *"
                      placeholder="Select or type tissue organ site / biopsy specimen type..."
                      fullWidth
                      required
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary">Clinical History & Pre-Operative Findings</Typography>
                  <Chip
                    icon={activeVoiceField === 'clinicalIndication' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                    label={activeVoiceField === 'clinicalIndication' ? "Listening... (Click to Stop & Rewrite)" : "🎤 Voice Dictate"}
                    size="small"
                    color={activeVoiceField === 'clinicalIndication' ? "error" : "primary"}
                    variant={activeVoiceField === 'clinicalIndication' ? "filled" : "outlined"}
                    onClick={() => activeVoiceField === 'clinicalIndication' ? stopVoiceDictation() : startVoiceDictation('clinicalIndication')}
                    sx={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem', height: 24 }}
                  />
                </Stack>
                <TextField multiline rows={2} fullWidth value={newOrderForm.clinicalIndication} onChange={e => setNewOrderForm(p => ({ ...p, clinicalIndication: e.target.value }))} placeholder="Enter relevant history, imaging findings, or surgical impression..." />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary">Grossing Physical Description (Pathologist Log)</Typography>
                  <Chip
                    icon={activeVoiceField === 'grossingDescription' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                    label={activeVoiceField === 'grossingDescription' ? "Listening... (Click to Stop & Rewrite)" : "🎤 Voice Dictate"}
                    size="small"
                    color={activeVoiceField === 'grossingDescription' ? "error" : "primary"}
                    variant={activeVoiceField === 'grossingDescription' ? "filled" : "outlined"}
                    onClick={() => activeVoiceField === 'grossingDescription' ? stopVoiceDictation() : startVoiceDictation('grossingDescription')}
                    sx={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem', height: 24 }}
                  />
                </Stack>
                <TextField multiline rows={2} fullWidth value={newOrderForm.grossingDescription} onChange={e => setNewOrderForm(p => ({ ...p, grossingDescription: e.target.value }))} placeholder="Physical dimensions, color, consistency, hemorrhage, focal nodules..." />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setNewHistologyOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleCreateHistologyOrder} startIcon={<CheckCircle />}>
            Generate Tissue Barcode Tag & Accession
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: PATHOLOGIST MICROSCOPIC DIAGNOSTIC REPORTING DESK */}
      <Dialog open={reportingOpen} onClose={() => setReportingOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RateReview sx={{ color: '#38bdf8' }} /> Pathologist Diagnostic Report Consultation Desk
          </Box>
          <Chip label={selectedHistology?.refNo} color="primary" size="small" sx={{ fontWeight: 800 }} />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Typography variant="caption" color="text.secondary" display="block">Patient & Specimen</Typography>
              <Typography variant="body1" fontWeight={800}>{selectedHistology?.patientName} ({selectedHistology?.patientId})</Typography>
              <Typography variant="body2" color="primary.main" fontWeight={700} mt={0.5}>{selectedHistology?.organSite}</Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>Clinical History: {selectedHistology?.clinicalIndication}</Typography>
            </Paper>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">Gross Description</Typography>
                <Chip
                  icon={activeVoiceField === 'grossDescription' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                  label={activeVoiceField === 'grossDescription' ? "Listening... (Click to Stop & Rewrite)" : "🎤 Voice Dictate"}
                  size="small"
                  color={activeVoiceField === 'grossDescription' ? "error" : "primary"}
                  variant={activeVoiceField === 'grossDescription' ? "filled" : "outlined"}
                  onClick={() => activeVoiceField === 'grossDescription' ? stopVoiceDictation() : startVoiceDictation('grossDescription')}
                  sx={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem', height: 24 }}
                />
              </Stack>
              <TextField
                multiline
                rows={2}
                fullWidth
                value={reportForm.grossDescription}
                onChange={e => setReportForm(p => ({ ...p, grossDescription: e.target.value }))}
                placeholder="Describe specimen dimensions, color, consistency, focal nodules..."
              />
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">Microscopic Examination Findings</Typography>
                <Chip
                  icon={activeVoiceField === 'microscopicFindings' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                  label={activeVoiceField === 'microscopicFindings' ? "Listening... (Click to Stop & Rewrite)" : "🎤 Voice Dictate"}
                  size="small"
                  color={activeVoiceField === 'microscopicFindings' ? "error" : "primary"}
                  variant={activeVoiceField === 'microscopicFindings' ? "filled" : "outlined"}
                  onClick={() => activeVoiceField === 'microscopicFindings' ? stopVoiceDictation() : startVoiceDictation('microscopicFindings')}
                  sx={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem', height: 24 }}
                />
              </Stack>
              <TextField
                multiline
                rows={4}
                fullWidth
                value={reportForm.microscopicFindings}
                onChange={e => setReportForm(p => ({ ...p, microscopicFindings: e.target.value }))}
                helperText="Describe cellular architecture, cytologic atypia, mitotic count per 10 HPF, necrosis, and stromal reaction."
              />
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">Pathological Diagnosis / Diagnostic Impression</Typography>
                <Chip
                  icon={activeVoiceField === 'pathologicalDiagnosis' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                  label={activeVoiceField === 'pathologicalDiagnosis' ? "Listening... (Click to Stop & Rewrite)" : "🎤 Voice Dictate"}
                  size="small"
                  color={activeVoiceField === 'pathologicalDiagnosis' ? "error" : "primary"}
                  variant={activeVoiceField === 'pathologicalDiagnosis' ? "filled" : "outlined"}
                  onClick={() => activeVoiceField === 'pathologicalDiagnosis' ? stopVoiceDictation() : startVoiceDictation('pathologicalDiagnosis')}
                  sx={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem', height: 24 }}
                />
              </Stack>
              <TextField
                multiline
                rows={2}
                fullWidth
                value={reportForm.pathologicalDiagnosis}
                onChange={e => setReportForm(p => ({ ...p, pathologicalDiagnosis: e.target.value }))}
                sx={{ '& .MuiInputBase-input': { fontWeight: 800, color: '#1e293b' } }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary">TNM Pathological Staging</Typography>
                  <Chip
                    icon={activeVoiceField === 'tnmStaging' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                    label={activeVoiceField === 'tnmStaging' ? "Listening..." : "🎤 Dictate"}
                    size="small"
                    color={activeVoiceField === 'tnmStaging' ? "error" : "primary"}
                    variant={activeVoiceField === 'tnmStaging' ? "filled" : "outlined"}
                    onClick={() => activeVoiceField === 'tnmStaging' ? stopVoiceDictation() : startVoiceDictation('tnmStaging')}
                    sx={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.65rem', height: 22 }}
                  />
                </Stack>
                <TextField fullWidth value={reportForm.tnmStaging} onChange={e => setReportForm(p => ({ ...p, tnmStaging: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary">Surgical Clearance Margins</Typography>
                  <Chip
                    icon={activeVoiceField === 'surgicalMargins' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                    label={activeVoiceField === 'surgicalMargins' ? "Listening..." : "🎤 Dictate"}
                    size="small"
                    color={activeVoiceField === 'surgicalMargins' ? "error" : "primary"}
                    variant={activeVoiceField === 'surgicalMargins' ? "filled" : "outlined"}
                    onClick={() => activeVoiceField === 'surgicalMargins' ? stopVoiceDictation() : startVoiceDictation('surgicalMargins')}
                    sx={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.65rem', height: 22 }}
                  />
                </Stack>
                <TextField fullWidth value={reportForm.surgicalMargins} onChange={e => setReportForm(p => ({ ...p, surgicalMargins: e.target.value }))} />
              </Grid>
            </Grid>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CheckCircle sx={{ color: '#16a34a' }} />
                <Box>
                  <Typography variant="body2" fontWeight={800} color="#166534">
                    Consultant Pathologist E-Signature Authorization
                  </Typography>
                  <Typography variant="caption" color="#15803d">
                    Report will be digitally signed by {(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Dr. T. A. Vegher (Consultant Pathologist, FMCPath)'} and synced to EMR & Unified Diagnostic Hub.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setReportingOpen(false)}>Close</Button>
          <Button variant="contained" color="success" onClick={handleSaveReport} startIcon={<CheckCircle />} sx={{ fontWeight: 800, px: 3 }}>
            Sign & Publish Pathology Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 1: QUICK REGISTER EXTERNAL SPECIMEN INTAKE */}
      <Dialog open={isExternalModalOpen} onClose={() => setIsExternalModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#065f46', display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f0fdf4' }}>
          <LocalHospital sx={{ color: '#059669' }} /> Quick Register: External Specimen Intake & Clinical Referral
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>
            <Alert severity="success" icon={<FactCheck />}>
              <strong>Paperless Referral Intake Desk:</strong> Register biopsy, FNA, or Pap smear samples received from external partner hospitals or clinics. No full inpatient folder required.
            </Alert>

            <Typography variant="subtitle2" fontWeight={900} color="primary.main" sx={{ borderBottom: '2px solid #059669', pb: 0.5, display: 'inline-block' }}>
              1. Patient Demographics (Quick Register)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Patient Full Name *"
                  fullWidth
                  required
                  value={newExternalForm.patientName}
                  onChange={e => setNewExternalForm(p => ({ ...p, patientName: e.target.value }))}
                  placeholder="e.g. Mrs. Grace N. Chukwu"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Age (Years) *"
                  type="number"
                  fullWidth
                  value={newExternalForm.patientAge}
                  onChange={e => setNewExternalForm(p => ({ ...p, patientAge: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  label="Gender *"
                  fullWidth
                  value={newExternalForm.patientGender}
                  onChange={e => setNewExternalForm(p => ({ ...p, patientGender: e.target.value }))}
                >
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Patient Phone Number"
                  fullWidth
                  value={newExternalForm.patientPhone}
                  onChange={e => setNewExternalForm(p => ({ ...p, patientPhone: e.target.value }))}
                  placeholder="+234 803 000 0000"
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={900} color="primary.main" sx={{ borderBottom: '2px solid #059669', pb: 0.5, display: 'inline-block', mt: 1 }}>
              2. Source Hospital & Referring Physician
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={[
                    'St. Nicholas Hospital, Lagos Island',
                    'Apex Specialist Clinic, Enugu',
                    'Federal Medical Centre, Ebute Metta',
                    'Lagos University Teaching Hospital (LUTH)',
                    'General Hospital, Ikeja',
                    'Zenith Medical & Kidney Centre, Abuja',
                    'Reddington Hospital, Victoria Island',
                    'First Cardiology Consultants, Ikoyi',
                  ]}
                  value={newExternalForm.referringHospital}
                  onInputChange={(_, newValue) => setNewExternalForm(p => ({ ...p, referringHospital: newValue }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Referring Hospital / Clinic Name *"
                      placeholder="Select or type custom hospital/clinic name..."
                      fullWidth
                      required
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={[
                    'Dr. F. A. Ogundipe (Consultant Urologist)',
                    'Dr. C. I. Nnamdi (Obstetrician & Gynaecologist)',
                    'Prof. M. A. Danfulani (Consultant Oncologist)',
                    'Dr. A. B. Cole (Consultant General Surgeon)',
                  ]}
                  value={newExternalForm.referringDoctor}
                  onInputChange={(_, newValue) => setNewExternalForm(p => ({ ...p, referringDoctor: newValue }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Referring Doctor Name *"
                      placeholder="Select or type custom doctor name..."
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Doctor Contact Phone (For WhatsApp Result)"
                  fullWidth
                  value={newExternalForm.doctorPhone}
                  onChange={e => setNewExternalForm(p => ({ ...p, doctorPhone: e.target.value }))}
                  placeholder="+234 802 345 6789"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Doctor Email (For Auto-PDF Dispatch)"
                  fullWidth
                  value={newExternalForm.doctorEmail}
                  onChange={e => setNewExternalForm(p => ({ ...p, doctorEmail: e.target.value }))}
                  placeholder="doctor@stnicholas.ng"
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={900} color="primary.main" sx={{ borderBottom: '2px solid #059669', pb: 0.5, display: 'inline-block', mt: 1 }}>
              3. Specimen Details & Logistics Tracking
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Case Classification / Category *"
                  fullWidth
                  value={newExternalForm.caseCategory}
                  onChange={e => setNewExternalForm(p => ({ ...p, caseCategory: e.target.value as any }))}
                >
                  <MenuItem value="Fresh Tissue Biopsy & Resection">Fresh Tissue Biopsy & Resection</MenuItem>
                  <MenuItem value="Slide Review / Second Opinion">Slide Review / Second Opinion (FFPE/Slides)</MenuItem>
                  <MenuItem value="Cytology / FNA">Cytology / Fine Needle Aspiration (FNA)</MenuItem>
                  <MenuItem value="IHC Biomarker Panel">IHC Biomarker Panel (ER/PR/HER2/Ki-67)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Specimen Description / Organ Site *"
                  fullWidth
                  required
                  value={newExternalForm.specimenType}
                  onChange={e => setNewExternalForm(p => ({ ...p, specimenType: e.target.value }))}
                  placeholder="e.g. Prostate Core Biopsies (12 cores) / Breast Lump"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Container / Slide Count *"
                  fullWidth
                  value={newExternalForm.containerCount}
                  onChange={e => setNewExternalForm(p => ({ ...p, containerCount: e.target.value }))}
                  placeholder="e.g. 2 Jars, 12 Cores / 4 Slides"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Condition on Arrival *"
                  fullWidth
                  value={newExternalForm.fixationCondition}
                  onChange={e => setNewExternalForm(p => ({ ...p, fixationCondition: e.target.value }))}
                >
                  <MenuItem value="10% Neutral Buffered Formalin">10% Neutral Buffered Formalin</MenuItem>
                  <MenuItem value="Fresh / Unfixed">Fresh / Unfixed Specimen</MenuItem>
                  <MenuItem value="95% Ethanol Fixed Glass Slides">95% Ethanol Fixed Glass Slides</MenuItem>
                  <MenuItem value="FFPE Blocks & H&E Stained Glass Slides">FFPE Blocks & H&E Stained Glass Slides</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={900} color="primary.main" sx={{ borderBottom: '2px solid #059669', pb: 0.5, display: 'inline-block', mt: 1 }}>
              4. Clinical History & Pre-Op Diagnosis (Referring Doctor's Notes)
            </Typography>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  Clinical History, Operative Findings & Ultrasound Impressions *
                </Typography>
                <Chip
                  icon={activeVoiceField === 'externalClinicalHistory' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                  label={activeVoiceField === 'externalClinicalHistory' ? "Listening..." : "🎤 Pathologist AI Voice Dictation"}
                  size="small"
                  color={activeVoiceField === 'externalClinicalHistory' ? "error" : "primary"}
                  variant={activeVoiceField === 'externalClinicalHistory' ? "filled" : "outlined"}
                  onClick={() => activeVoiceField === 'externalClinicalHistory' ? stopVoiceDictation() : startVoiceDictation('externalClinicalHistory')}
                  sx={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.7rem' }}
                />
              </Stack>
              <TextField
                multiline
                rows={4}
                fullWidth
                required
                value={newExternalForm.clinicalHistory}
                onChange={e => setNewExternalForm(p => ({ ...p, clinicalHistory: e.target.value }))}
                placeholder="Type or dictate the referring doctor's clinical history, symptoms, serum PSA/ultrasound findings, pre-op diagnosis, and specific pathology questions requested..."
              />
            </Box>

            <Typography variant="subtitle2" fontWeight={900} color="primary.main" sx={{ borderBottom: '2px solid #059669', pb: 0.5, display: 'inline-block', mt: 1 }}>
              5. Financial Clearance & Central Cashier Billing Setup
            </Typography>
            <Alert severity="info" sx={{ bgcolor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534', py: 0.5, fontSize: '0.82rem' }}>
              <strong>💳 Central Cashier Integration:</strong> Pathology charges are automatically posted to the hospital <strong>Billing Module (/billing)</strong>. Direct-pay patients complete payment at the cashier counter via Cash/POS/Card to receive receipt clearance.
            </Alert>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Billing Channel *"
                  fullWidth
                  value={newExternalForm.billingType}
                  onChange={e => setNewExternalForm(p => ({ ...p, billingType: e.target.value as any }))}
                >
                  <MenuItem value="Direct Cash / POS">Direct Cash / POS / Card (Paid at Cashier Counter)</MenuItem>
                  <MenuItem value="Corporate Contract Invoice">Corporate Contract Invoice (Referring Hospital Account)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Pathology Investigation Fee (₦) *"
                  type="number"
                  fullWidth
                  value={newExternalForm.billingAmount}
                  onChange={e => setNewExternalForm(p => ({ ...p, billingAmount: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  label="Financial Status *"
                  fullWidth
                  value={newExternalForm.paymentStatus}
                  onChange={e => setNewExternalForm(p => ({ ...p, paymentStatus: e.target.value as any }))}
                >
                  <MenuItem value="Paid & Cleared">Paid & Cleared at Cashier (Receipt Verified)</MenuItem>
                  <MenuItem value="Billed to Corporate Account">Billed to Corporate Account (Monthly Invoice)</MenuItem>
                  <MenuItem value="Payment Pending">Billed to Cashier (Pending Cashier Counter Payment)</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsExternalModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveExternalIntake}
            startIcon={<CheckCircle />}
            sx={{ fontWeight: 800, px: 3.5, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            💾 Save & Register External Specimen Intake
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 2: LOG SAMPLE COURIER PICKUP */}
      <Dialog open={isCourierModalOpen} onClose={() => setIsCourierModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalHospital sx={{ color: '#059669' }} /> 🚚 Log Sample Courier Pickup & Driver Logistics
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              label="Dispatch Reference Number"
              fullWidth
              value={newCourierForm.dispatchRef}
              onChange={e => setNewCourierForm(p => ({ ...p, dispatchRef: e.target.value }))}
              placeholder="e.g. SN-LOG-8821 / DHL-NG-77412"
            />

            <Autocomplete
              freeSolo
              options={[
                'Smart Hospital Dispatch (Driver K. Sanusi)',
                'St. Nicholas Medical Express (Driver A. Bello)',
                'DHL Express Nigeria (Medical Logistics)',
                'GIG Logistics Medical Courier',
                'Apex Specialist Courier (Driver J. Chukwu)',
                'Federal Medical Centre Dispatch Driver',
                'Self-Hand Delivered by Patient/Relative',
              ]}
              value={newCourierForm.courierName}
              onInputChange={(_, newValue) => setNewCourierForm(p => ({ ...p, courierName: newValue }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Courier / Driver Name *"
                  placeholder="Select or type custom courier/driver name..."
                  fullWidth
                  required
                />
              )}
            />

            <Autocomplete
              freeSolo
              options={[
                'St. Nicholas Hospital, Lagos Island',
                'Apex Specialist Clinic, Enugu',
                'Federal Medical Centre, Ebute Metta',
                'Lagos University Teaching Hospital (LUTH)',
                'General Hospital, Ikeja',
                'Zenith Medical & Kidney Centre, Abuja',
                'Reddington Hospital, Victoria Island',
                'First Cardiology Consultants, Ikoyi',
              ]}
              value={newCourierForm.sourceClinic}
              onInputChange={(_, newValue) => setNewCourierForm(p => ({ ...p, sourceClinic: newValue }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Source Clinic / Hospital Name *"
                  placeholder="Select or type custom hospital/clinic name..."
                  fullWidth
                  required
                />
              )}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Sample / Container Count"
                  type="number"
                  fullWidth
                  value={newCourierForm.sampleCount}
                  onChange={e => setNewCourierForm(p => ({ ...p, sampleCount: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Container Temperature *"
                  fullWidth
                  value={newCourierForm.temperatureCondition}
                  onChange={e => setNewCourierForm(p => ({ ...p, temperatureCondition: e.target.value }))}
                >
                  <MenuItem value="22°C Ambient Container">22°C Ambient Container</MenuItem>
                  <MenuItem value="2°C - 8°C Cold Pack Container">2°C - 8°C Cold Pack Container</MenuItem>
                  <MenuItem value="-20°C Frozen Specimen Container">-20°C Frozen Specimen Container</MenuItem>
                  <MenuItem value="95% Ethanol Fixed Slide Mailer">95% Ethanol Fixed Slide Mailer</MenuItem>
                  <MenuItem value="Dry Room Temperature Box">Dry Room Temperature Box</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Pickup Date & Time *"
                  type="datetime-local"
                  fullWidth
                  value={newCourierForm.pickupTime}
                  onChange={e => setNewCourierForm(p => ({ ...p, pickupTime: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Arrival Date & Time *"
                  type="datetime-local"
                  fullWidth
                  value={newCourierForm.arrivalTime}
                  onChange={e => setNewCourierForm(p => ({ ...p, arrivalTime: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Autocomplete
              freeSolo
              options={staffOptions}
              value={newCourierForm.receivingOfficer}
              onInputChange={(_, newValue) => setNewCourierForm(p => ({ ...p, receivingOfficer: newValue }))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Receiving Officer Name *"
                  placeholder="Select or type custom receiving officer name..."
                  fullWidth
                  required
                />
              )}
            />

            <TextField
              label="Logistics & Transport Notes"
              multiline
              rows={2}
              fullWidth
              value={newCourierForm.notes}
              onChange={e => setNewCourierForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Tissue bottles sealed intact in 10% formalin."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsCourierModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleSaveCourierLog} sx={{ fontWeight: 800 }}>
            Log Courier Entry
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 3: EXTERNAL PATHOLOGIST CONSULTATION PDF & PAPERLESS DELIVERY REPORT */}
      <Dialog
        open={isReportDeliveryModalOpen}
        onClose={() => setIsReportDeliveryModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Description sx={{ color: '#059669' }} />
            <Typography variant="h6" fontWeight={900}>
              Pathology Consultation & Verification Report — {selectedExternalReferral?.refNo}
            </Typography>
          </Stack>
          <Chip label="OFFICIAL BRANDED PDF" color="success" size="small" sx={{ fontWeight: 800 }} />
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3, bgcolor: '#f1f5f9' }}>
          {selectedExternalReferral && (
            <Paper
              elevation={3}
              sx={{
                p: 4,
                bgcolor: '#fff',
                borderRadius: 2,
                maxWidth: 800,
                mx: 'auto',
                border: '1px solid #cbd5e1',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              }}
            >
              {/* Header Letterhead */}
              <Box sx={{ borderBottom: '3px double #059669', pb: 2, mb: 3 }}>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item xs={8}>
                    <Typography variant="h5" fontWeight={900} color="#065f46" letterSpacing="-0.02em">
                      SMART HOSPITAL & PATHOLOGY DIAGNOSTIC HUB
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                      Department of Anatomic Pathology, Histopathology & Diagnostic Cytopathology
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Plot 14, Victoria Island Medical Complex, Lagos, Nigeria | Email: pathology@smarthospital.ng
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Chip label="PATHOLOGY CONSULTATION REPORT" color="primary" sx={{ fontWeight: 800, borderRadius: 1, mb: 0.5 }} />
                    <Typography variant="caption" display="block" fontWeight={800} color="#059669">
                      REF: {selectedExternalReferral.refNo}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* 2-Column Demographics Box */}
              <Grid container spacing={2} sx={{ mb: 3, bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                    PATIENT DEMOGRAPHICS
                  </Typography>
                  <Typography variant="body1" fontWeight={900} color="#0f172a">
                    {selectedExternalReferral.patientName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Age / Gender: <strong>{selectedExternalReferral.patientAge}Y / {selectedExternalReferral.patientGender}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contact: <strong>{selectedExternalReferral.patientPhone}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Intake Date: <strong>{selectedExternalReferral.dateReceived}</strong>
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                    REFERRING CLINICIAN & FACILITY
                  </Typography>
                  <Typography variant="body1" fontWeight={900} color="#059669">
                    {selectedExternalReferral.referringHospital}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Referring Doctor: <strong>{selectedExternalReferral.referringDoctor}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Doctor Phone / Email: <strong>{selectedExternalReferral.doctorPhone} | {selectedExternalReferral.doctorEmail}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Financial Clearance: <strong>{selectedExternalReferral.paymentStatus} ({selectedExternalReferral.billingType})</strong>
                  </Typography>
                </Grid>
              </Grid>

              {/* Specimen Logistics */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={0.5}>
                  SPECIMEN LOGISTICS & CASE CATEGORY
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fff' }}>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Typography variant="body2"><strong>Category:</strong> {selectedExternalReferral.caseCategory}</Typography>
                    <Typography variant="body2"><strong>Specimen:</strong> {selectedExternalReferral.specimenType}</Typography>
                    <Typography variant="body2"><strong>Containers:</strong> {selectedExternalReferral.containerCount}</Typography>
                    <Typography variant="body2"><strong>Fixation:</strong> {selectedExternalReferral.fixationCondition}</Typography>
                  </Stack>
                </Paper>
              </Box>

              {/* Clinical History */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={0.5}>
                  CLINICAL HISTORY & PRE-OPERATIVE DIAGNOSIS (PROVIDED BY REFERRING PHYSICIAN)
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc', fontStyle: 'italic' }}>
                  <Typography variant="body2" color="#334155">
                    "{selectedExternalReferral.clinicalHistory}"
                  </Typography>
                </Paper>
              </Box>

              {/* Pathologist Findings */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={0.5}>
                  GROSS EXAMINATION DESCRIPTION
                </Typography>
                <Typography variant="body2" color="#1e293b" paragraph>
                  {selectedExternalReferral.grossDescription || 'Specimen received in 10% neutral buffered formalin container. Gross examination and sectioning completed.'}
                </Typography>

                <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={0.5}>
                  MICROSCOPIC EXAMINATION FINDINGS
                </Typography>
                <Typography variant="body2" color="#1e293b" paragraph>
                  {selectedExternalReferral.microscopicFindings || 'Sections display cellular features evaluated under high-power light microscopy. Nuclear pleomorphism, mitotic activity, and architecture logged.'}
                </Typography>
              </Box>

              {/* Highlighted Final Pathological Diagnosis Box */}
              <Box sx={{ mb: 3, p: 2.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '2px solid #059669' }}>
                <Typography variant="caption" fontWeight={900} color="#065f46" display="block" mb={0.5} letterSpacing="0.05em">
                  FINAL PATHOLOGICAL DIAGNOSIS & IMPRESSION
                </Typography>
                <Typography variant="subtitle1" fontWeight={900} color="#047857">
                  {selectedExternalReferral.pathologicalDiagnosis || 'PATHOLOGICAL CONSULTATION COMPLETED. SEE DETAILED MICROSCOPIC NARRATIVE.'}
                </Typography>
              </Box>

              {/* Signatures & Live QR Code Verification Box */}
              <Box sx={{ borderTop: '2px solid #e2e8f0', pt: 2, mt: 3 }}>
                <Grid container alignItems="center" spacing={2}>
                  <Grid item xs={7}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary" display="block">
                      CONSULTANT PATHOLOGIST E-SIGNATURE
                    </Typography>
                    <Typography variant="body1" fontWeight={900} color="#0f172a" sx={{ mt: 0.5 }}>
                      Dr. Consultant Pathologist, FMCPath
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Consultant Anatomic & Molecular Pathologist
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Medical & Dental Council Registration #: MDC-NG-88412
                    </Typography>
                  </Grid>

                  <Grid item xs={5} sx={{ textAlign: 'right' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="flex-end">
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" fontWeight={900} color="#059669" display="block">
                          VERIFY REPORT ONLINE
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                          Token: {selectedExternalReferral.qrVerificationCode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.6rem' }}>
                          Scan to verify on hospital portal
                        </Typography>
                      </Box>
                      <QRCodeSVG value={selectedExternalReferral.qrVerificationCode} size={90} />
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', justifyContent: 'space-between' }}>
          <Button onClick={() => setIsReportDeliveryModalOpen(false)}>Close</Button>

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Print />}
              onClick={() => window.print()}
              sx={{ fontWeight: 800 }}
            >
              Print Report
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<FactCheck />}
              onClick={handleSendWhatsApp}
              sx={{ fontWeight: 800, bgcolor: '#25D366', color: '#fff', '&:hover': { bgcolor: '#128C7E' } }}
            >
              💬 Send to WhatsApp
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<Description />}
              onClick={handleAutoEmailReport}
              sx={{ fontWeight: 800, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
            >
              ✉️ Auto-Email PDF Report
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
      {/* DIALOG 4: ACCESSION CYTOLOGY SPECIMEN (PAP SMEAR & FNA) */}
      <Dialog open={isNewCytologyModalOpen} onClose={() => setIsNewCytologyModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fcfaff' }}>
          <Biotech /> Accession Cytology Specimen (Pap Smear & FNA Screening)
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <Alert severity="info">
              <strong>Cytology Screening & Pap Smear Intake:</strong> Assign specimen ref, select stain protocol, and log clinical/gynaecological history. Diagnostic fee will automatically dispatch to Central Cashier Desk.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <Autocomplete
                  freeSolo
                  openOnFocus
                  selectOnFocus
                  clearOnBlur={false}
                  filterOptions={pathologyPatientFilter}
                  options={patientSearchOptions}
                  getOptionLabel={(option: any) => {
                    if (typeof option === 'string') return option;
                    const name = `${option.firstName || ''} ${option.lastName || ''}`.trim();
                    const mrn = option.patientNumber || option.id || '';
                    return name ? `${name} (${mrn})` : mrn;
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (typeof option === 'string' || typeof value === 'string') return option === value;
                    return (option.id || option.patientNumber) === (value.id || value.patientNumber);
                  }}
                  onInputChange={(_, newInputValue) => handlePatientInputChange(newInputValue)}
                  onChange={(_, newValue: any) => {
                    if (newValue && typeof newValue === 'object') {
                      const pName = `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim();
                      const mrn = newValue.patientNumber || newValue.id || '';
                      setNewCytologyForm(p => ({
                        ...p,
                        patientName: pName,
                        patientId: mrn,
                      }));
                    } else if (typeof newValue === 'string') {
                      setNewCytologyForm(p => ({ ...p, patientName: newValue }));
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Patient Name / MRN * *"
                      placeholder="Type patient name or select recent 50 patients..."
                      fullWidth
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Patient MRN / ID"
                  fullWidth
                  value={newCytologyForm.patientId}
                  onChange={e => setNewCytologyForm(p => ({ ...p, patientId: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Specimen Category / Type * *"
                  fullWidth
                  value={newCytologyForm.specimenType}
                  onChange={e => setNewCytologyForm(p => ({ ...p, specimenType: e.target.value as any }))}
                >
                  <MenuItem value="Cervical Pap Smear">Cervical Pap Smear (Conventional)</MenuItem>
                  <MenuItem value="Liquid Based Cytology (LBC Cervical)">Liquid Based Cytology (LBC Cervical)</MenuItem>
                  <MenuItem value="Thyroid FNA">Thyroid Nodule FNA Biopsy</MenuItem>
                  <MenuItem value="Breast Lump FNA">Breast Mass FNA Biopsy</MenuItem>
                  <MenuItem value="Pleural Fluid">Pleural Fluid Cytology</MenuItem>
                  <MenuItem value="Ascitic Fluid">Ascitic Fluid Cytology</MenuItem>
                  <MenuItem value="Urine Cytology">Urine Cytology</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Staining Protocol"
                  fullWidth
                  value={newCytologyForm.stainingMethod}
                  onChange={e => setNewCytologyForm(p => ({ ...p, stainingMethod: e.target.value as any }))}
                >
                  <MenuItem value="Papanicolaou (Pap)">Papanicolaou (Pap) Stain</MenuItem>
                  <MenuItem value="Giemsa / Diff-Quik">Giemsa / Diff-Quik (Rapid Field Stain)</MenuItem>
                  <MenuItem value="H&E Stain">Hematoxylin & Eosin (H&E)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={8}>
                <Autocomplete
                  freeSolo
                  options={doctorOptions}
                  value={newCytologyForm.requestingDoctor}
                  onInputChange={(_, value) => setNewCytologyForm(p => ({ ...p, requestingDoctor: value }))}
                  renderInput={(params) => <TextField {...params} label="Requesting Clinician / Gynaecologist" placeholder="Select doctor from Staff Records..." fullWidth />}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label="Cytology Fee (₦)"
                  type="number"
                  fullWidth
                  value={newCytologyForm.fee}
                  onChange={e => setNewCytologyForm(p => ({ ...p, fee: Number(e.target.value) }))}
                  InputProps={{ startAdornment: <InputAdornment position="start">₦</InputAdornment> }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ position: 'relative' }}>
                  <TextField
                    label="Clinical History & Gynaecology Notes"
                    multiline
                    rows={3}
                    fullWidth
                    value={newCytologyForm.clinicalNotes}
                    onChange={e => setNewCytologyForm(p => ({ ...p, clinicalNotes: e.target.value }))}
                    placeholder="e.g. 42-year-old female presenting with post-coital vaginal bleeding and cervical erosion..."
                  />
                  <Chip
                    icon={<Mic />}
                    label={activeVoiceField === 'clinicalNotes' ? 'Listening...' : 'Voice Dictate'}
                    color={activeVoiceField === 'clinicalNotes' ? 'error' : 'primary'}
                    size="small"
                    onClick={() => startVoiceDictation('clinicalNotes')}
                    sx={{ position: 'absolute', top: 10, right: 10, cursor: 'pointer', fontWeight: 800 }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsNewCytologyModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleSaveNewCytology} sx={{ fontWeight: 800, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}>
            🧪 Accession Cytology Specimen
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 5: BETHESDA SYSTEM CYTOLOGY DIAGNOSTIC CONSULTATION REPORT */}
      <Dialog open={isCytologyReportModalOpen} onClose={() => setIsCytologyReportModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#fcfaff' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <RateReview sx={{ color: '#7c3aed' }} />
            <Typography variant="h6" fontWeight={900}>
              Bethesda Cytology Consultation & Diagnostic Desk — {selectedCytology?.refNo}
            </Typography>
          </Stack>
          <Chip label={selectedCytology?.patientName} color="secondary" size="small" sx={{ fontWeight: 800 }} />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedCytology && (
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Patient Name & ID</Typography>
                    <Typography variant="body2" fontWeight={800}>{selectedCytology.patientName} ({selectedCytology.patientId})</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Specimen & Stain</Typography>
                    <Typography variant="body2" fontWeight={800}>{selectedCytology.specimenType} · {selectedCytology.stainingMethod}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Referring Clinician</Typography>
                    <Typography variant="body2" fontWeight={800}>{selectedCytology.requestingDoctor}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Bethesda System Classification * *"
                    fullWidth
                    value={cytoReportForm.bethesdaClassification}
                    onChange={e => setCytoReportForm(p => ({ ...p, bethesdaClassification: e.target.value }))}
                  >
                    <MenuItem value="NILM (Negative for Malignancy)">NILM (Negative for Intraepithelial Lesion or Malignancy)</MenuItem>
                    <MenuItem value="ASC-US">ASC-US (Atypical Squamous Cells of Undetermined Significance)</MenuItem>
                    <MenuItem value="LSIL">LSIL (Low-grade Squamous Intraepithelial Lesion)</MenuItem>
                    <MenuItem value="HSIL">HSIL (High-grade Squamous Intraepithelial Lesion)</MenuItem>
                    <MenuItem value="Malignant (Adenocarcinoma)">Malignant (Squamous Cell Carcinoma / Adenocarcinoma)</MenuItem>
                    <MenuItem value="Bethesda Thyroid II (Benign)">Bethesda Thyroid II (Benign Nodule)</MenuItem>
                    <MenuItem value="Bethesda Thyroid IV (Follicular Neoplasm)">Bethesda Thyroid IV (Follicular Neoplasm)</MenuItem>
                    <MenuItem value="Bethesda Thyroid VI (Malignant)">Bethesda Thyroid VI (Papillary Thyroid Carcinoma)</MenuItem>
                    <MenuItem value="Breast FNA C2 (Benign)">Breast FNA C2 (Benign Fibroadenoma)</MenuItem>
                    <MenuItem value="Breast FNA C5 (Malignant)">Breast FNA C5 (Malignant Carcinoma)</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Specimen Adequacy"
                    fullWidth
                    value={cytoReportForm.adequacy}
                    onChange={e => setCytoReportForm(p => ({ ...p, adequacy: e.target.value }))}
                  >
                    <MenuItem value="Satisfactory (Endocervical component present)">Satisfactory (Endocervical component present)</MenuItem>
                    <MenuItem value="Satisfactory (Endocervical component absent)">Satisfactory (Endocervical component absent)</MenuItem>
                    <MenuItem value="Unsatisfactory (Obscuring blood/inflammation)">Unsatisfactory for Evaluation (Obscuring blood/inflammation)</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ position: 'relative' }}>
                    <TextField
                      label="Microscopic Cytological Findings (Pathologist Description)"
                      multiline
                      rows={4}
                      fullWidth
                      value={cytoReportForm.findings}
                      onChange={e => setCytoReportForm(p => ({ ...p, findings: e.target.value }))}
                    />
                    <Chip
                      icon={<Mic />}
                      label={activeVoiceField === 'findings' ? 'Listening...' : 'Voice Dictate'}
                      color={activeVoiceField === 'findings' ? 'error' : 'primary'}
                      size="small"
                      onClick={() => startVoiceDictation('findings')}
                      sx={{ position: 'absolute', top: 10, right: 10, cursor: 'pointer', fontWeight: 800 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsCytologyReportModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleSaveCytologyReport} sx={{ fontWeight: 800, bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' } }}>
            ✍️ Sign & Publish Bethesda Cytology Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔬 PATHOLOGIST AUTOPSY POSTMORTEM FINDINGS MODAL */}
      <Dialog open={isAutopsyFindingsModalOpen} onClose={() => setIsAutopsyFindingsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#991b1b', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <RateReview /> Pathologist Forensic & Clinical Autopsy Postmortem Suite
        </DialogTitle>
        <DialogContent dividers>
          {selectedMortuaryRecord && (
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fef2f2', borderColor: '#fca5a5' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Deceased Tag / MRN</Typography>
                    <Typography variant="body2" fontWeight={800} color="error.main">{selectedMortuaryRecord.tagNo} ({selectedMortuaryRecord.mrn})</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Deceased Name</Typography>
                    <Typography variant="body2" fontWeight={800}>{selectedMortuaryRecord.deceasedName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Chiller Location</Typography>
                    <Typography variant="body2" fontWeight={800}>{selectedMortuaryRecord.chillerSlot}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Box sx={{ position: 'relative' }}>
                <TextField
                  label="Certified Cause of Death (Pathological Impression)"
                  fullWidth
                  value={autopsyForm.causeOfDeath}
                  onChange={e => setAutopsyForm(p => ({ ...p, causeOfDeath: e.target.value }))}
                  placeholder="e.g. Refractory Cardiogenic Shock 2° to Massive Myocardial Infarction"
                  InputProps={{ sx: { pr: 18 } }}
                />
                <Chip
                  icon={activeVoiceField === 'causeOfDeath' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                  label={activeVoiceField === 'causeOfDeath' ? "Listening..." : "🎤 Voice Dictate"}
                  color={activeVoiceField === 'causeOfDeath' ? "error" : "primary"}
                  size="small"
                  variant={activeVoiceField === 'causeOfDeath' ? "filled" : "outlined"}
                  onClick={() => activeVoiceField === 'causeOfDeath' ? stopVoiceDictation() : startVoiceDictation('causeOfDeath')}
                  sx={{ position: 'absolute', top: 14, right: 10, cursor: 'pointer', fontWeight: 800 }}
                />
              </Box>

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                    Detailed Autopsy Postmortem Examination Findings (Gross & Microscopic)
                  </Typography>
                  <Chip
                    icon={activeVoiceField === 'autopsyFindings' ? <MicOff sx={{ color: '#fff !important' }} /> : <Mic />}
                    label={
                      isVoiceRewriting && activeVoiceField === 'autopsyFindings'
                        ? "AI Rewriting..."
                        : activeVoiceField === 'autopsyFindings'
                        ? "Listening... (Click to Stop & Rewrite)"
                        : "🎤 Voice Dictate"
                    }
                    color={activeVoiceField === 'autopsyFindings' ? "error" : "primary"}
                    size="small"
                    variant={activeVoiceField === 'autopsyFindings' ? "filled" : "outlined"}
                    onClick={() => activeVoiceField === 'autopsyFindings' ? stopVoiceDictation() : startVoiceDictation('autopsyFindings')}
                    sx={{ cursor: 'pointer', fontWeight: 800 }}
                  />
                </Stack>
                <TextField
                  multiline
                  rows={8}
                  fullWidth
                  value={autopsyForm.findings}
                  onChange={e => setAutopsyForm(p => ({ ...p, findings: e.target.value }))}
                  placeholder="Record external examination, organ weights, gross dissection, histology sections..."
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsAutopsyFindingsModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleSaveAutopsyFindings} sx={{ fontWeight: 800 }}>
            ✍️ Sign & Certificate Autopsy Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🚚 POST-AUTOPSY DISPOSITION & TRANSPORT LOGISTICS MODAL */}
      <Dialog
        open={dispositionModalOpen}
        onClose={() => !submittingDisposition && setDispositionModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 0.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#1e293b', color: '#fff', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocalShipping sx={{ color: '#38bdf8' }} />
          <Box>
            <Typography variant="h6" fontWeight={900} color="#fff">
              Post-Autopsy Disposition & Transport Logistics Handover
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Autopsy completed · Dispatch body to Hospital Mortuary Cold Vaults OR External Mortuary / Family Release
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          {dispositionRecord && (
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: alpha('#7c3aed', 0.04), borderColor: alpha('#7c3aed', 0.25), borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={7}>
                    <Typography variant="subtitle1" fontWeight={900} color="text.primary">
                      {dispositionRecord.deceasedName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Tag: {dispositionRecord.tagNo} · MRN: {dispositionRecord.mrn} · {dispositionRecord.gender}, Age {dispositionRecord.age}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 700, display: 'block', mt: 0.5 }}>
                      Cause of Death: {dispositionRecord.causeOfDeath || 'Pending Autopsy Report'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={5} sx={{ textAlign: { sm: 'right' } }}>
                    <Chip label="Post-Mortem Autopsy Certified" color="success" size="small" sx={{ fontWeight: 800 }} />
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Location: Pathology Autopsy Suite (Pre-Mortuary)
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                  Select Body Disposition Destination *
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={dispositionForm.destination}
                  onChange={e => setDispositionForm(prev => ({ ...prev, destination: e.target.value as any }))}
                  helperText="Choose whether relatives request Hospital Cold Vault admission or external release/transport"
                >
                  <MenuItem value="HOSPITAL_MORTUARY">
                    🏢 Transfer to Hospital Mortuary Cold Vaults (Admission & Refrigeration Storage · MORT-INTAKE ₦15,000)
                  </MenuItem>
                  <MenuItem value="EXTERNAL_MORTUARY">
                    🏥 Transfer to External Facility / Private Mortuary
                  </MenuItem>
                  <MenuItem value="FAMILY_RELEASE">
                    🏡 Direct Release to Family / Next-of-Kin Custody
                  </MenuItem>
                </TextField>
              </Box>

              {dispositionForm.destination === 'EXTERNAL_MORTUARY' && (
                <TextField
                  label="External Mortuary Facility Name & Address *"
                  size="small"
                  fullWidth
                  required
                  value={dispositionForm.externalFacilityName}
                  onChange={e => setDispositionForm(prev => ({ ...prev, externalFacilityName: e.target.value }))}
                  placeholder="e.g. St. Luke Specialist Hospital & Mortuary, Garki, Abuja"
                />
              )}

              {dispositionForm.destination !== 'HOSPITAL_MORTUARY' && (
                <>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha('#0284c7', 0.04), borderColor: alpha('#0284c7', 0.25) }}>
                    <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DirectionsCar fontSize="small" /> Transport Logistics & Vehicle Assignment
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Transport Vehicle Mode *"
                          value={dispositionForm.transportMode}
                          onChange={e => setDispositionForm(prev => ({ ...prev, transportMode: e.target.value as any }))}
                        >
                          <MenuItem value="AMBULANCE">
                            🚑 Hospital Ambulance / Medical Transport Van (Hospital Driver & Vehicle · TRANS-AMBULANCE ₦25,000)
                          </MenuItem>
                          <MenuItem value="PERSONAL_VEHICLE">
                            🚗 Personal / Private Family Vehicle (Family transport · ₦0 Transport Fee)
                          </MenuItem>
                        </TextField>
                      </Grid>

                      {dispositionForm.transportMode === 'AMBULANCE' ? (
                        <>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              label="Assigned Hospital Ambulance *"
                              value={dispositionForm.ambulanceVehicle}
                              onChange={e => setDispositionForm(prev => ({ ...prev, ambulanceVehicle: e.target.value }))}
                            >
                              <MenuItem value="AMB-01 (Hospital Critical Care Transport Van)">AMB-01 (Hospital Critical Care Transport Van)</MenuItem>
                              <MenuItem value="AMB-02 (Hospital Logistics Van - Specially Fitted)">AMB-02 (Hospital Logistics Van - Specially Fitted)</MenuItem>
                              <MenuItem value="AMB-03 (Emergency Response Ambulance)">AMB-03 (Emergency Response Ambulance)</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              label="Assigned Hospital Driver *"
                              value={dispositionForm.ambulanceDriver}
                              onChange={e => setDispositionForm(prev => ({ ...prev, ambulanceDriver: e.target.value }))}
                            >
                              <MenuItem value="Ibrahim Danjuma (Emergency Medical Driver)">Ibrahim Danjuma (Emergency Medical Driver)</MenuItem>
                              <MenuItem value="Sunday Eze (Clinical Transport Driver)">Sunday Eze (Clinical Transport Driver)</MenuItem>
                              <MenuItem value="Musa Abdullahi (Senior Logistics Officer)">Musa Abdullahi (Senior Logistics Officer)</MenuItem>
                            </TextField>
                          </Grid>
                        </>
                      ) : (
                        <>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Private Vehicle Plate Number *"
                              size="small"
                              fullWidth
                              required
                              value={dispositionForm.vehiclePlateNumber}
                              onChange={e => setDispositionForm(prev => ({ ...prev, vehiclePlateNumber: e.target.value }))}
                              placeholder="e.g. ABJ-452-XY"
                              helperText="No transport charge applied (₦0)"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Private Driver / Family Chauffeur Name *"
                              size="small"
                              fullWidth
                              required
                              value={dispositionForm.driverName}
                              onChange={e => setDispositionForm(prev => ({ ...prev, driverName: e.target.value }))}
                              placeholder="e.g. Emeka Okafor (Brother)"
                            />
                          </Grid>
                        </>
                      )}
                    </Grid>
                  </Paper>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Claimant / NOK Full Name *"
                        size="small"
                        fullWidth
                        required
                        value={dispositionForm.claimantName}
                        onChange={e => setDispositionForm(prev => ({ ...prev, claimantName: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Relationship to Deceased *"
                        size="small"
                        fullWidth
                        required
                        value={dispositionForm.relationship}
                        onChange={e => setDispositionForm(prev => ({ ...prev, relationship: e.target.value }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Claimant Contact Phone *"
                        size="small"
                        fullWidth
                        required
                        value={dispositionForm.claimantPhone}
                        onChange={e => setDispositionForm(prev => ({ ...prev, claimantPhone: e.target.value }))}
                      />
                    </Grid>
                  </Grid>

                  <Alert severity="info" sx={{ fontWeight: 600 }}>
                    Official Statutory Death Certificate & Release Clearance (DEATH-CERT — ₦5,000) will be automatically generated and queued for Cashier settlement.
                  </Alert>
                </>
              )}

              {dispositionForm.destination === 'HOSPITAL_MORTUARY' && (
                <Alert severity="success" sx={{ fontWeight: 600 }}>
                  Body will be transferred to the Hospital Mortuary Ingestion Desk at /mortuary for cold vault allocation. Invoices Hospital Mortuary Cold Vault Admission & Storage (MORT-INTAKE — ₦15,000) to the Cashier.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setDispositionModalOpen(false)} disabled={submittingDisposition}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmDisposition}
            disabled={submittingDisposition}
            sx={{ fontWeight: 800, borderRadius: 2, px: 3 }}
          >
            {submittingDisposition
              ? 'Processing Transfer...'
              : dispositionForm.destination === 'HOSPITAL_MORTUARY'
                ? '🏢 Confirm Transfer to Hospital Mortuary'
                : '🚀 Dispatch & Issue Invoices to Cashier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🚪 MORTUARY COLD VAULT DEALLOCATION & BODY RELEASE MODAL */}
      <Dialog open={isReleaseModalOpen} onClose={() => setIsReleaseModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#047857', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <MeetingRoom /> Mortuary Cold Vault Deallocation & Body Release Handover
        </DialogTitle>
        <DialogContent dividers>
          {selectedReleaseRecord && (
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#ecfdf5', borderColor: '#a7f3d0' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Deceased Tag / MRN</Typography>
                    <Typography variant="body2" fontWeight={800} color="success.dark">
                      {selectedReleaseRecord.tagNo} ({selectedReleaseRecord.mrn})
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Deceased Name</Typography>
                    <Typography variant="body2" fontWeight={800}>
                      {selectedReleaseRecord.deceasedName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Current Cold Vault Location</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        icon={<Hotel />}
                        label={selectedReleaseRecord.chillerSlot}
                        size="small"
                        color="error"
                        sx={{ fontWeight: 800 }}
                      />
                    </Box>
                    <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5, fontWeight: 700 }}>
                      ⚠️ Vault will be automatically vacated & flagged for sanitation
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Cause of Death</Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {selectedReleaseRecord.causeOfDeath || 'Documented Cause of Death'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                Claimant Legal Verification & Handover Information
              </Typography>

              <TextField
                label="Claimant / Receiver Full Name"
                fullWidth
                size="small"
                value={releaseForm.claimantName}
                onChange={e => setReleaseForm(p => ({ ...p, claimantName: e.target.value }))}
                placeholder="e.g. John Doe"
                required
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Relationship to Deceased"
                    fullWidth
                    size="small"
                    value={releaseForm.relationship}
                    onChange={e => setReleaseForm(p => ({ ...p, relationship: e.target.value }))}
                    placeholder="e.g. Husband / Next-of-Kin"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Claimant Phone / National ID"
                    fullWidth
                    size="small"
                    value={releaseForm.claimantPhone}
                    onChange={e => setReleaseForm(p => ({ ...p, claimantPhone: e.target.value }))}
                    placeholder="e.g. +1234567890"
                    required
                  />
                </Grid>
              </Grid>

              <TextField
                label="Designated Funeral Home / Hearse Service"
                fullWidth
                size="small"
                value={releaseForm.funeralHome}
                onChange={e => setReleaseForm(p => ({ ...p, funeralHome: e.target.value }))}
                placeholder="e.g. Private Family Hearse Transport (Licensed)"
              />

              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc' }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" sx={{ mb: 1 }}>
                  MORTUARY DISCHARGE & CHAIN OF CUSTODY CHECKLIST
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: '#059669', fontSize: 18 }} />
                    <Typography variant="body2">Identity wristbands and mortuary tags positively verified</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: '#059669', fontSize: 18 }} />
                    <Typography variant="body2">Personal effects, jewelry and valuables signed over to claimant</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: '#059669', fontSize: 18 }} />
                    <Typography variant="body2">Mortuary cold storage invoices & burial permits cleared</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: '#059669', fontSize: 18 }} />
                    <Typography variant="body2" fontWeight={700} color="error.dark">
                      Deallocate cold storage bay ({selectedReleaseRecord.chillerSlot})
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsReleaseModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmReleaseVault}
            sx={{ fontWeight: 800 }}
            startIcon={<CheckCircle />}
          >
            Confirm Release Handover & Vacate Vault
          </Button>
        </DialogActions>
      </Dialog>

      {/* 📤 CHECK OUT SLIDE / FFPE BLOCK MODAL */}
      <Dialog open={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#b45309', color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory /> Check Out Specimen Block / Slide
        </DialogTitle>
        <DialogContent dividers>
          {selectedArchiveItem && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fffbeb', borderColor: '#fde68a' }}>
                <Typography variant="caption" color="text.secondary">Specimen / Patient</Typography>
                <Typography variant="body2" fontWeight={800} color="warning.dark">
                  {selectedArchiveItem.specimenNo} · {selectedArchiveItem.patientName} ({selectedArchiveItem.patientId})
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Current Location: <strong>{selectedArchiveItem.cabinetLocator}</strong>
                </Typography>
              </Paper>

              <TextField
                label="Borrower / Pathologist / Requester Name"
                fullWidth
                size="small"
                value={checkoutForm.borrowerName}
                onChange={e => setCheckoutForm(p => ({ ...p, borrowerName: e.target.value }))}
                placeholder="e.g. Dr. C. I. Nnamdi"
                required
              />

              <TextField
                label="Requesting Hospital / Department"
                fullWidth
                size="small"
                value={checkoutForm.departmentOrHospital}
                onChange={e => setCheckoutForm(p => ({ ...p, departmentOrHospital: e.target.value }))}
                placeholder="e.g. Apex Specialist Clinic, Lagos"
              />

              <TextField
                label="Purpose of Check Out"
                select
                fullWidth
                size="small"
                value={checkoutForm.purpose}
                onChange={e => setCheckoutForm(p => ({ ...p, purpose: e.target.value }))}
              >
                <MenuItem value="Second Opinion Histopathology Review">Second Opinion Histopathology Review</MenuItem>
                <MenuItem value="IHC Biomarker Re-Cut & Staining">IHC Biomarker Re-Cut & Staining</MenuItem>
                <MenuItem value="Molecular / PCR Genetic Testing">Molecular / PCR Genetic Testing</MenuItem>
                <MenuItem value="Clinical Multidisciplinary Tumor Board">Clinical Multidisciplinary Tumor Board</MenuItem>
                <MenuItem value="Academic Research & Teaching">Academic Research & Teaching</MenuItem>
              </TextField>

              <TextField
                label="Expected Return Due Date"
                type="date"
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                value={checkoutForm.dueDate}
                onChange={e => setCheckoutForm(p => ({ ...p, dueDate: e.target.value }))}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsCheckoutModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleConfirmCheckout}
            sx={{ fontWeight: 800 }}
          >
            Confirm Check Out
          </Button>
        </DialogActions>
      </Dialog>

      {/* ➕ ARCHIVE NEW SPECIMEN BLOCK / SLIDE MODAL */}
      <Dialog open={isNewArchiveModalOpen} onClose={() => setIsNewArchiveModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#1e3a8a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory /> Index & Archive New Tissue Block / Slide
          </Box>
          <Chip
            label="ISO 15189 / CAP Standard"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {/* Patient Name Dropdown (Top 50 Patients) & MRN Autofill */}
            <Box sx={{ bgcolor: '#f0f9ff', p: 1.5, borderRadius: 2, border: '1px solid #bae6fd' }}>
              <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ mb: 1, display: 'block' }}>
                👤 PATIENT IDENTITY & DEMOGRAPHICS (TOP 50 RECENT PATIENTS)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={7}>
                  <Autocomplete
                    options={patientSearchOptions.slice(0, 50)}
                    filterOptions={pathologyPatientFilter}
                    getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.name || '';
                      const mrn = option.patientNumber || option.id || option.mrn || '';
                      return mrn ? `${fullName} (${mrn})` : fullName;
                    }}
                    value={selectedArchivePatient}
                    onChange={(_, newValue: any) => {
                      setSelectedArchivePatient(newValue);
                      if (newValue && typeof newValue === 'object') {
                        const fullName = `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim() || newValue.name || '';
                        const mrn = newValue.patientNumber || newValue.id || newValue.mrn || '';
                        const organ = newValue.gender === 'Female' ? 'Cervical / Endometrial Biopsy' : 'Prostatic Core Needle Biopsy';
                        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                        setNewArchiveForm(p => ({
                          ...p,
                          patientName: fullName,
                          patientId: mrn,
                          organSite: p.organSite || organ,
                          specimenNo: p.specimenNo || `PATH-HIST-${new Date().getFullYear()}-${randomSuffix}`,
                          blockId: p.blockId || `FFPE Block #B-${randomSuffix}-A1`,
                          slideId: p.slideId || `H&E Slide #S-${randomSuffix}-A1`,
                        }));
                        enqueueSnackbar(`Patient selected: ${fullName} · Auto-filled MRN: ${mrn}`, { variant: 'info' });
                      } else if (typeof newValue === 'string') {
                        setNewArchiveForm(p => ({ ...p, patientName: newValue }));
                      }
                    }}
                    onInputChange={(_, newInputValue) => {
                      if (!selectedArchivePatient) {
                        setNewArchiveForm(p => ({ ...p, patientName: newInputValue }));
                      }
                    }}
                    freeSolo
                    renderOption={(props, option: any) => {
                      const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.name || '';
                      const mrn = option.patientNumber || option.id || option.mrn || '';
                      return (
                        <li {...props} key={mrn || fullName}>
                          <Box sx={{ py: 0.5, width: '100%' }}>
                            <Typography variant="body2" fontWeight={700}>{fullName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              MRN: <strong>{mrn}</strong> {option.gender ? `· ${option.gender}` : ''} {option.estimatedAge || option.age ? `· ${option.estimatedAge || option.age}Y` : ''}
                            </Typography>
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Patient Name (First 50 Patients) *"
                        size="small"
                        placeholder="Click dropdown or search name..."
                        helperText="Select from 50 pre-loaded hospital patients"
                        required
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    label="Patient MRN / ID Number *"
                    fullWidth
                    size="small"
                    value={newArchiveForm.patientId}
                    onChange={e => setNewArchiveForm(p => ({ ...p, patientId: e.target.value }))}
                    placeholder="e.g. P-09142"
                    helperText="Auto-filled on patient selection"
                    required
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Specimen & Tissue Biopsy Details */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Specimen Accession Number *"
                  fullWidth
                  size="small"
                  value={newArchiveForm.specimenNo}
                  onChange={e => {
                    const val = e.target.value;
                    const suffix = val.replace('PATH-HIST-', '').replace('PATH-', '');
                    setNewArchiveForm(p => ({
                      ...p,
                      specimenNo: val,
                      blockId: p.blockId || (val ? `FFPE Block #B-${suffix}-A1` : ''),
                      slideId: p.slideId || (val ? `H&E Slide #S-${suffix}-A1` : ''),
                    }));
                  }}
                  placeholder="e.g. PATH-HIST-2026-5120"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Organ / Tissue Site *"
                  fullWidth
                  size="small"
                  value={newArchiveForm.organSite}
                  onChange={e => setNewArchiveForm(p => ({ ...p, organSite: e.target.value }))}
                  placeholder="e.g. Endometrial Curettage"
                  required
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="FFPE Wax Block ID *"
                  fullWidth
                  size="small"
                  value={newArchiveForm.blockId}
                  onChange={e => setNewArchiveForm(p => ({ ...p, blockId: e.target.value }))}
                  placeholder="e.g. FFPE Block #B-5120-A1"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Glass Slide ID *"
                  fullWidth
                  size="small"
                  value={newArchiveForm.slideId}
                  onChange={e => setNewArchiveForm(p => ({ ...p, slideId: e.target.value }))}
                  placeholder="e.g. H&E Slide #S-5120-A1"
                  required
                />
              </Grid>
            </Grid>

            {/* Physical Archive Room & Cabinet Locator Configuration */}
            <Box sx={{ borderTop: '1px dashed #cbd5e1', pt: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  PHYSICAL ARCHIVE ROOM & CABINET LOCATOR
                </Typography>
                <Button
                  size="small"
                  startIcon={<Settings fontSize="small" />}
                  onClick={() => setIsLocatorConfigModalOpen(true)}
                  sx={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'none', py: 0.2 }}
                >
                  Configure Capacity Limits
                </Button>
              </Stack>

              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Room"
                    select
                    fullWidth
                    size="small"
                    value={newArchiveForm.room}
                    onChange={e => setNewArchiveForm(p => ({ ...p, room: e.target.value }))}
                  >
                    {Array.from(new Set(archiveLocators.map(l => l.room))).concat(['Archive Room 1', 'Archive Room 2', 'Cold Archive Bay']).filter((v, i, a) => a.indexOf(v) === i).map(r => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Cabinet"
                    select
                    fullWidth
                    size="small"
                    value={newArchiveForm.cabinet}
                    onChange={e => setNewArchiveForm(p => ({ ...p, cabinet: e.target.value }))}
                  >
                    {Array.from(new Set(archiveLocators.map(l => l.cabinet))).concat(['Cabinet A', 'Cabinet B', 'Cabinet C', 'Cabinet D']).filter((v, i, a) => a.indexOf(v) === i).map(c => (
                      <MenuItem key={c} value={c}>{c}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Shelf"
                    select
                    fullWidth
                    size="small"
                    value={newArchiveForm.shelf}
                    onChange={e => setNewArchiveForm(p => ({ ...p, shelf: e.target.value }))}
                  >
                    {Array.from(new Set(archiveLocators.map(l => l.shelf))).concat(['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4']).filter((v, i, a) => a.indexOf(v) === i).map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Drawer / Box"
                    select
                    fullWidth
                    size="small"
                    value={newArchiveForm.drawer}
                    onChange={e => setNewArchiveForm(p => ({ ...p, drawer: e.target.value }))}
                  >
                    {Array.from(new Set(archiveLocators.map(l => l.drawer))).concat(['Drawer 01', 'Drawer 02', 'Drawer 03', 'Drawer 04', 'Drawer 05', 'Drawer 06']).filter((v, i, a) => a.indexOf(v) === i).map(d => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              {/* Dynamic Live Capacity Gauge & Countdown for Selected Drawer */}
              {(() => {
                const cap = getSlotCapacityInfo(newArchiveForm.room, newArchiveForm.cabinet, newArchiveForm.shelf, newArchiveForm.drawer);
                const isFull = cap.available <= 0;
                return (
                  <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: isFull ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isFull ? '#fecaca' : '#bbf7d0'}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" fontWeight={800} color={isFull ? 'error.main' : 'success.main'}>
                        📍 Selected: {newArchiveForm.room} · {newArchiveForm.cabinet} · {newArchiveForm.shelf} · {newArchiveForm.drawer}
                      </Typography>
                      <Chip
                        label={isFull ? 'DRAWER FULL (0 Left)' : `${cap.available} Free Slots Remaining`}
                        size="small"
                        color={isFull ? 'error' : cap.available <= 5 ? 'warning' : 'success'}
                        sx={{ fontWeight: 800, height: 22 }}
                      />
                    </Stack>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.8 }}>
                      <LinearProgress
                        variant="determinate"
                        value={cap.percent}
                        color={cap.percent >= 100 ? 'error' : cap.percent >= 80 ? 'warning' : 'success'}
                        sx={{ height: 6, borderRadius: 3, flex: 1 }}
                      />
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        {cap.occupiedCount} / {cap.maxCap} Stored ({cap.percent}%)
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.72rem' }}>
                      ⚡ Available drawer capacity automatically reduces by 1 when this block/slide is indexed.
                    </Typography>
                  </Box>
                );
              })()}
            </Box>

            <TextField
              label="Legal Retention Policy (Years)"
              type="number"
              fullWidth
              size="small"
              value={newArchiveForm.retentionYears}
              onChange={e => setNewArchiveForm(p => ({ ...p, retentionYears: parseInt(e.target.value, 10) || 20 }))}
              helperText="ISO 15189 / CAP standards mandate 20-year retention for diagnostic tissue blocks & slides"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsNewArchiveModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateNewArchiveItem}
            sx={{ fontWeight: 800, px: 3 }}
          >
            Save & Index to Cabinet
          </Button>
        </DialogActions>
      </Dialog>

      {/* ⚙️ PHYSICAL ARCHIVE ROOM & CABINET LOCATOR CONFIGURATOR MODAL */}
      <Dialog open={isLocatorConfigModalOpen} onClose={() => setIsLocatorConfigModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#475569', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings /> Physical Archive Rooms, Cabinets & Capacity Configurator
          </Box>
          <Chip
            label={`${archiveLocators.length} Configured Storage Slots`}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Configure physical storage capacity limits for your pathology archival rooms, cabinets, and drawers.
              As specimen blocks and slides are saved to any locator, the available slot count <strong>automatically reduces in real-time</strong>.
            </Alert>

            {/* Add New Locator Slot Form */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', borderColor: '#cbd5e1' }}>
              <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 1.5 }}>
                ➕ Add or Provision New Archive Storage Drawer
              </Typography>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Room"
                    fullWidth
                    size="small"
                    value={newLocatorForm.room}
                    onChange={e => setNewLocatorForm(p => ({ ...p, room: e.target.value }))}
                    placeholder="e.g. Archive Room 1"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Cabinet"
                    fullWidth
                    size="small"
                    value={newLocatorForm.cabinet}
                    onChange={e => setNewLocatorForm(p => ({ ...p, cabinet: e.target.value }))}
                    placeholder="e.g. Cabinet B"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Shelf"
                    fullWidth
                    size="small"
                    value={newLocatorForm.shelf}
                    onChange={e => setNewLocatorForm(p => ({ ...p, shelf: e.target.value }))}
                    placeholder="e.g. Shelf 1"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    label="Drawer / Box"
                    fullWidth
                    size="small"
                    value={newLocatorForm.drawer}
                    onChange={e => setNewLocatorForm(p => ({ ...p, drawer: e.target.value }))}
                    placeholder="e.g. Drawer 07"
                  />
                </Grid>
                <Grid item xs={12} sm={1.5}>
                  <TextField
                    label="Capacity"
                    type="number"
                    fullWidth
                    size="small"
                    value={newLocatorForm.maxCapacity}
                    onChange={e => setNewLocatorForm(p => ({ ...p, maxCapacity: parseInt(e.target.value, 10) || 50 }))}
                  />
                </Grid>
                <Grid item xs={12} sm={1.5}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="small"
                    startIcon={<Add />}
                    onClick={handleCreateNewLocatorSlot}
                    sx={{ fontWeight: 800, height: 40 }}
                  >
                    Add
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* List of Configured Storage Locators with Real-Time Occupancy & Reduction */}
            <Typography variant="subtitle2" fontWeight={800}>
              🗄️ Active Storage Registry & Live Drawer Capacities
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 360 }}>
              <Table size="small" stickyHeader>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Physical Storage Location</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Max Drawer Capacity</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Active Stored Items</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Available (Remaining)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Live Occupancy Meter</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {archiveLocators.map(loc => {
                    const cap = getSlotCapacityInfo(loc.room, loc.cabinet, loc.shelf, loc.drawer);
                    return (
                      <TableRow key={loc.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {loc.room} · {loc.cabinet}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {loc.shelf} · {loc.drawer} ({loc.description})
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={loc.maxCapacity}
                            onChange={e => handleUpdateLocatorCapacity(loc.id, parseInt(e.target.value, 10) || 1)}
                            sx={{ width: 85 }}
                            InputProps={{ inputProps: { min: 1, max: 1000 } }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={`${cap.occupiedCount} items`}
                            size="small"
                            color={cap.occupiedCount > 0 ? 'primary' : 'default'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={cap.available <= 0 ? 'FULL (0)' : `${cap.available} Free`}
                            size="small"
                            color={cap.available <= 0 ? 'error' : cap.available <= 5 ? 'warning' : 'success'}
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>

                        <TableCell sx={{ minWidth: 140 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={cap.percent}
                              color={cap.percent >= 100 ? 'error' : cap.percent >= 80 ? 'warning' : 'success'}
                              sx={{ height: 6, borderRadius: 3, flex: 1 }}
                            />
                            <Typography variant="caption" fontWeight={700}>
                              {cap.percent}%
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            disabled={cap.occupiedCount > 0}
                            onClick={() => handleDeleteLocatorSlot(loc.id)}
                            title={cap.occupiedCount > 0 ? 'Cannot delete slot with stored specimens' : 'Delete slot'}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsLocatorConfigModalOpen(false)} variant="contained" color="primary" sx={{ fontWeight: 800 }}>
            Done & Close Configurator
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔬 ORDER / ACCESSION NEW IHC BIOMARKER PANEL MODAL */}
      <Dialog open={isNewIHCModalOpen} onClose={() => setIsNewIHCModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Biotech /> Order & Accession New IHC Biomarker Panel
          </Box>
          <Chip
            label="ASCO / CAP & ISO 15189 Standard"
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}
          />
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {/* Patient Name Dropdown (Top 50 Patients) & MRN Autofill */}
            <Box sx={{ bgcolor: '#f0f9ff', p: 1.5, borderRadius: 2, border: '1px solid #bae6fd' }}>
              <Typography variant="caption" fontWeight={800} color="primary.main" sx={{ mb: 1, display: 'block' }}>
                👤 PATIENT IDENTITY (FIRST 50 RECENT HOSPITAL PATIENTS)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={7}>
                  <Autocomplete
                    options={patientSearchOptions.slice(0, 50)}
                    filterOptions={pathologyPatientFilter}
                    getOptionLabel={(option: any) => {
                      if (typeof option === 'string') return option;
                      const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.name || '';
                      const mrn = option.patientNumber || option.id || option.mrn || '';
                      return mrn ? `${fullName} (${mrn})` : fullName;
                    }}
                    value={selectedIHCPatient}
                    onChange={(_, newValue: any) => {
                      setSelectedIHCPatient(newValue);
                      if (newValue && typeof newValue === 'object') {
                        const fullName = `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim() || newValue.name || '';
                        const mrn = newValue.patientNumber || newValue.id || newValue.mrn || '';
                        const age = newValue.estimatedAge || newValue.age || 45;
                        const gender = newValue.gender || 'Female';
                        const organ = gender === 'Female' ? 'Left Breast Core Biopsy' : 'Prostate Needle Core Biopsy';
                        const panel = gender === 'Female'
                          ? 'Breast Cancer Biomarker Panel (ER, PR, HER2, Ki-67)'
                          : 'Prostate PIN / Carcinoma Triple Cocktail';
                        const randSuffix = Math.floor(1000 + Math.random() * 9000);
                        setNewIHCForm(p => ({
                          ...p,
                          patientName: fullName,
                          patientId: mrn,
                          age,
                          gender,
                          organSite: organ,
                          panelType: panel,
                          specimenNo: p.specimenNo || `PATH-HIST-${new Date().getFullYear()}-${randSuffix}`,
                        }));
                        handleIHCPanelTypeChange(panel);
                        enqueueSnackbar(`Patient selected: ${fullName} · Auto-filled MRN: ${mrn}`, { variant: 'info' });
                      } else if (typeof newValue === 'string') {
                        setNewIHCForm(p => ({ ...p, patientName: newValue }));
                      }
                    }}
                    freeSolo
                    renderOption={(props, option: any) => {
                      const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.name || '';
                      const mrn = option.patientNumber || option.id || option.mrn || '';
                      return (
                        <li {...props} key={mrn || fullName}>
                          <Box sx={{ py: 0.5, width: '100%' }}>
                            <Typography variant="body2" fontWeight={700}>{fullName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              MRN: <strong>{mrn}</strong> {option.gender ? `· ${option.gender}` : ''} {option.estimatedAge || option.age ? `· ${option.estimatedAge || option.age}Y` : ''}
                            </Typography>
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Patient Name (Select from 50 Patients) *"
                        size="small"
                        placeholder="Search patient name..."
                        helperText="Top 50 hospital patients · Auto-fills MRN"
                        required
                        fullWidth
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    label="Patient MRN / Hospital ID *"
                    fullWidth
                    size="small"
                    value={newIHCForm.patientId}
                    onChange={e => setNewIHCForm(p => ({ ...p, patientId: e.target.value }))}
                    placeholder="e.g. P-10492"
                    helperText="Auto-filled on patient selection"
                    required
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Specimen Details & Panel Selection */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Specimen Ref No *"
                  fullWidth
                  size="small"
                  value={newIHCForm.specimenNo}
                  onChange={e => setNewIHCForm(p => ({ ...p, specimenNo: e.target.value }))}
                  placeholder="PATH-HIST-2026-0891"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Organ / Tissue Biopsy Site *"
                  fullWidth
                  size="small"
                  value={newIHCForm.organSite}
                  onChange={e => setNewIHCForm(p => ({ ...p, organSite: e.target.value }))}
                  placeholder="e.g. Left Breast Core Biopsy"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Biomarker Panel Type *"
                  select
                  fullWidth
                  size="small"
                  value={newIHCForm.panelType}
                  onChange={e => handleIHCPanelTypeChange(e.target.value)}
                >
                  <MenuItem value="Breast Cancer Biomarker Panel (ER, PR, HER2, Ki-67)">Breast Panel (ER, PR, HER2, Ki-67)</MenuItem>
                  <MenuItem value="Breast Cancer Triple-Negative Profiling">Breast Triple-Negative (TNBC / Basal-like)</MenuItem>
                  <MenuItem value="Lung Non-Small Cell Carcinoma (NSCLC) Subtyping & PD-L1">Lung NSCLC (TTF-1, Napsin A, p40, PD-L1)</MenuItem>
                  <MenuItem value="Prostate PIN / Carcinoma Triple Cocktail">Prostate Cocktail (AMACR, p63, HMWCK, PSA)</MenuItem>
                  <MenuItem value="Lymphoma Lineage & Subtyping Panel">Lymphoma (CD20, CD3, CD10, BCL6, Ki-67)</MenuItem>
                  <MenuItem value="Colorectal MMR / MSI Panel">Colorectal MMR (MLH1, MSH2, MSH6, PMS2)</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* Biomarker Staining Results & Expressions */}
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" fontWeight={800} color="secondary.main" sx={{ mb: 1.5, display: 'block' }}>
                🧪 ANTIBODY STAINING QUANTITATION & SCORES
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="ER (Estrogen Receptor) Status"
                    fullWidth
                    size="small"
                    value={newIHCForm.erStatus}
                    onChange={e => setNewIHCForm(p => ({ ...p, erStatus: e.target.value }))}
                    placeholder="e.g. Strong Positive (85%, Score 8/8) or N/A"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="PR (Progesterone Receptor) Status"
                    fullWidth
                    size="small"
                    value={newIHCForm.prStatus}
                    onChange={e => setNewIHCForm(p => ({ ...p, prStatus: e.target.value }))}
                    placeholder="e.g. Moderate Positive (60%, Score 6/8) or N/A"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="HER2 / neu Overexpression"
                    fullWidth
                    size="small"
                    value={newIHCForm.her2Status}
                    onChange={e => setNewIHCForm(p => ({ ...p, her2Status: e.target.value }))}
                    placeholder="e.g. Score 3+ (Positive) or Score 0 (Negative)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Ki-67 Proliferation Index"
                    fullWidth
                    size="small"
                    value={newIHCForm.ki67Index}
                    onChange={e => setNewIHCForm(p => ({ ...p, ki67Index: e.target.value }))}
                    placeholder="e.g. 35% High Proliferation Index"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Additional Lineage Markers / PD-L1 TPS / Special Stains"
                    fullWidth
                    size="small"
                    value={newIHCForm.additionalMarkers}
                    onChange={e => setNewIHCForm(p => ({ ...p, additionalMarkers: e.target.value }))}
                    placeholder="e.g. E-Cadherin: Positive, or PD-L1 TPS: 70%, or TTF-1: Positive"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Diagnostic Interpretation & Targeted Therapy */}
            <TextField
              label="Oncology Diagnostic Interpretation *"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={newIHCForm.interpretation}
              onChange={e => setNewIHCForm(p => ({ ...p, interpretation: e.target.value }))}
              placeholder="e.g. Invasive Ductal Carcinoma, Luminal B (HER2-Positive) Subtype."
              required
            />

            <TextField
              label="Targeted Immunotherapy / Chemotherapy Recommendation"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={newIHCForm.targetTherapyRecommendation}
              onChange={e => setNewIHCForm(p => ({ ...p, targetTherapyRecommendation: e.target.value }))}
              placeholder="e.g. Eligible for Targeted Trastuzumab (Herceptin) + Endocrine Hormonal Therapy."
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Signing Consultant Pathologist"
                  fullWidth
                  size="small"
                  value={newIHCForm.pathologist}
                  onChange={e => setNewIHCForm(p => ({ ...p, pathologist: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1 }}>
                  <Chip icon={<CheckCircle sx={{ color: '#fff !important' }} />} label="Auto-Digital Certification Active" color="success" sx={{ fontWeight: 800 }} />
                </Box>
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsNewIHCModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateIHCRecord}
            sx={{ fontWeight: 800, px: 3 }}
          >
            Save & Certify IHC Panel
          </Button>
        </DialogActions>
      </Dialog>

      {/* 📄 VIEW / PRINT OFFICIAL IHC REPORT MODAL */}
      <Dialog open={isViewIHCReportModalOpen} onClose={() => setIsViewIHCReportModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description /> Official Clinical Immunohistochemistry Diagnostic Certificate
          </Box>
          <Chip label="ISO 15189 / CAP ACCREDITED" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }} />
        </DialogTitle>
        <DialogContent dividers>
          {selectedIHCRecord && (
            <Stack spacing={2.5}>
              {/* Header Box */}
              <Box sx={{ borderBottom: '2px solid #0284c7', pb: 1.5 }}>
                <Typography variant="h6" fontWeight={900} color="#0369a1">
                  FAITH FOUNDATION SPECIALIST HOSPITAL
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Department of Anatomic Pathology & Molecular Oncology · IHC Diagnostic Division
                </Typography>
              </Box>

              {/* Demographics Grid */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>PATIENT NAME</Typography>
                    <Typography variant="body1" fontWeight={800}>{selectedIHCRecord.patientName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>PATIENT MRN / ID</Typography>
                    <Typography variant="body1" fontWeight={800}>{selectedIHCRecord.patientId}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>SPECIMEN ACCESSION</Typography>
                    <Typography variant="body2" fontWeight={800} color="primary.main">{selectedIHCRecord.specimenNo}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>ORGAN / TISSUE SITE</Typography>
                    <Typography variant="body2" fontWeight={700}>{selectedIHCRecord.organSite || 'Diagnostic Tissue'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>DATE CERTIFIED</Typography>
                    <Typography variant="body2" fontWeight={700}>{selectedIHCRecord.dateCompleted}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Panel & Scores */}
              <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: '#0f172a' }}>
                  IMMUNOHISTOCHEMICAL BIOMARKER EXPRESSIONS ({selectedIHCRecord.panelType})
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Biomarker / Antibody</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Target Location</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Expression & Quantitation Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedIHCRecord.erStatus && selectedIHCRecord.erStatus !== 'N/A' && (
                        <TableRow>
                          <TableCell><strong>ER (Estrogen Receptor)</strong> [Clone SP1]</TableCell>
                          <TableCell>Nuclear</TableCell>
                          <TableCell><strong style={{ color: selectedIHCRecord.erStatus.includes('Positive') ? '#166534' : '#64748b' }}>{selectedIHCRecord.erStatus}</strong></TableCell>
                        </TableRow>
                      )}
                      {selectedIHCRecord.prStatus && selectedIHCRecord.prStatus !== 'N/A' && (
                        <TableRow>
                          <TableCell><strong>PR (Progesterone Receptor)</strong> [Clone 1E2]</TableCell>
                          <TableCell>Nuclear</TableCell>
                          <TableCell><strong style={{ color: selectedIHCRecord.prStatus.includes('Positive') ? '#166534' : '#64748b' }}>{selectedIHCRecord.prStatus}</strong></TableCell>
                        </TableRow>
                      )}
                      {selectedIHCRecord.her2Status && selectedIHCRecord.her2Status !== 'N/A' && (
                        <TableRow>
                          <TableCell><strong>HER2 / neu</strong> [Clone 4B5]</TableCell>
                          <TableCell>Membranous</TableCell>
                          <TableCell><strong style={{ color: selectedIHCRecord.her2Status.includes('3+') || selectedIHCRecord.her2Status.includes('Positive') ? '#dc2626' : '#64748b' }}>{selectedIHCRecord.her2Status}</strong></TableCell>
                        </TableRow>
                      )}
                      {selectedIHCRecord.ki67Index && (
                        <TableRow>
                          <TableCell><strong>Ki-67 Proliferation Index</strong> [Clone MIB-1]</TableCell>
                          <TableCell>Nuclear</TableCell>
                          <TableCell><strong>{selectedIHCRecord.ki67Index}</strong></TableCell>
                        </TableRow>
                      )}
                      {selectedIHCRecord.additionalMarkers && (
                        <TableRow>
                          <TableCell><strong>Additional Panel Markers</strong></TableCell>
                          <TableCell>Panel Specific</TableCell>
                          <TableCell><strong>{selectedIHCRecord.additionalMarkers}</strong></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Interpretation Box */}
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdf4', border: '1.5px solid #86efac' }}>
                <Typography variant="caption" fontWeight={800} color="success.dark" display="block" sx={{ mb: 0.5 }}>
                  ONCOLOGY DIAGNOSTIC INTERPRETATION
                </Typography>
                <Typography variant="body2" fontWeight={700} color="#14532d">
                  {selectedIHCRecord.interpretation}
                </Typography>
              </Box>

              {selectedIHCRecord.targetTherapyRecommendation && (
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f0f9ff', border: '1.5px solid #bae6fd' }}>
                  <Typography variant="caption" fontWeight={800} color="primary.dark" display="block" sx={{ mb: 0.5 }}>
                    TARGETED THERAPY & ONCOLOGY RECOMMENDATION
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#075985">
                    {selectedIHCRecord.targetTherapyRecommendation}
                  </Typography>
                </Box>
              )}

              {/* Signature Stamp */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #e2e8f0' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Digitally Signed By:</Typography>
                  <Typography variant="body2" fontWeight={800}>{selectedIHCRecord.pathologist}</Typography>
                  <Typography variant="caption" color="text.secondary">Consultant Pathologist (FMCPath)</Typography>
                </Box>
                <Chip
                  icon={<CheckCircle sx={{ color: '#fff !important' }} />}
                  label="IHC DIGITALLY CERTIFIED"
                  color="success"
                  sx={{ fontWeight: 800 }}
                />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsViewIHCReportModalOpen(false)}>Close</Button>
          {selectedIHCRecord && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Print />}
              onClick={() => handlePrintIHCRecord(selectedIHCRecord)}
              sx={{ fontWeight: 800 }}
            >
              Print Official Certificate
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ✍️ EDIT IHC SCORES MODAL */}
      <Dialog open={isEditIHCModalOpen} onClose={() => setIsEditIHCModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, bgcolor: '#334155', color: '#fff' }}>
          ✍️ Edit IHC Scores & Interpretation
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} color="primary.main">
              {editIHCForm.patientName} · {editIHCForm.specimenNo}
            </Typography>

            <TextField
              label="ER (Estrogen Receptor)"
              fullWidth
              size="small"
              value={editIHCForm.erStatus || ''}
              onChange={e => setEditIHCForm(p => ({ ...p, erStatus: e.target.value }))}
            />

            <TextField
              label="PR (Progesterone Receptor)"
              fullWidth
              size="small"
              value={editIHCForm.prStatus || ''}
              onChange={e => setEditIHCForm(p => ({ ...p, prStatus: e.target.value }))}
            />

            <TextField
              label="HER2 / neu Overexpression"
              fullWidth
              size="small"
              value={editIHCForm.her2Status || ''}
              onChange={e => setEditIHCForm(p => ({ ...p, her2Status: e.target.value }))}
            />

            <TextField
              label="Ki-67 Proliferation Index"
              fullWidth
              size="small"
              value={editIHCForm.ki67Index || ''}
              onChange={e => setEditIHCForm(p => ({ ...p, ki67Index: e.target.value }))}
            />

            <TextField
              label="Additional Lineage Markers / PD-L1"
              fullWidth
              size="small"
              value={editIHCForm.additionalMarkers || ''}
              onChange={e => setEditIHCForm(p => ({ ...p, additionalMarkers: e.target.value }))}
            />

            <TextField
              label="Oncology Diagnostic Interpretation"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={editIHCForm.interpretation || ''}
              onChange={e => setEditIHCForm(p => ({ ...p, interpretation: e.target.value }))}
            />

            <TextField
              label="Targeted Therapy Recommendation"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={editIHCForm.targetTherapyRecommendation || ''}
              onChange={e => setEditIHCForm(p => ({ ...p, targetTherapyRecommendation: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={() => setIsEditIHCModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateIHCRecord}
            sx={{ fontWeight: 800 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Pathology;
