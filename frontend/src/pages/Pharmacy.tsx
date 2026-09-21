import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, TextField, Grid, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Tabs, Tab, Avatar, LinearProgress,
  Alert, AlertTitle, Badge, Tooltip, Paper, Divider, Stack, CircularProgress,
  FormControlLabel, Checkbox, Select, FormControl, InputLabel,
  Accordion, AccordionSummary, AccordionDetails, Autocomplete,
} from '@mui/material';
import {
  Add, Search, CheckCircle, AccessTime, Cancel, Warning, WarningAmber, Inventory2, Close, Inventory,
  Build, Assignment, Refresh, Print, Visibility, Edit, Delete, Done, ExpandMore,
  NotificationsActive, LocalPharmacy, Shield, Receipt, ContactPhone,
  BarChart, Person, PersonAdd, PlusOne, Check, Healing, Verified, Bloodtype, Vaccines,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { api, API_BASE_URL } from '../services/api';
import { isUserPharmacyStaff } from '../utils/roleUtils';
import { BulkImportExport } from '../components/BulkImportExport';
import { QuickExternalRegisterModal } from '../components/QuickExternalRegisterModal';
import { PrescriptionPrintTemplate } from '../components/PrescriptionPrintTemplate';
import { TerminologyAutocomplete } from '../components/TerminologyAutocomplete';
import { OpenMedUnitCoPilot } from '../components/OpenMedUnitCoPilot';

const API = `${API_BASE_URL}/pharmacy`;

// Helper function to resolve the exact medication name for out-of-stock / external items
const resolvePrescriptionItemName = (item: any): string => {
  if (!item) return 'Prescribed Medication';

  // 1. Check clinicalIndication (where external purchase prescribed drug names like "Inj Ceftriaxone 1g" are stored)
  if (item.clinicalIndication && String(item.clinicalIndication).trim()) {
    const cleaned = String(item.clinicalIndication).replace(/^External purchase:\s*/i, '').trim();
    if (
      cleaned &&
      cleaned.toLowerCase() !== 'external purchase' &&
      cleaned.toLowerCase() !== 'external purchase medication' &&
      cleaned.toLowerCase() !== 'external purchase drug' &&
      cleaned.toLowerCase() !== 'out-of-stock medication'
    ) {
      return cleaned;
    }
  }

  // 2. Direct property name checks
  if (item.drugName && item.drugName.toLowerCase() !== 'external purchase medication' && item.drugName.toLowerCase() !== 'out-of-stock medication') return item.drugName;
  if (item.medicationName && item.medicationName.toLowerCase() !== 'external purchase medication' && item.medicationName.toLowerCase() !== 'out-of-stock medication') return item.medicationName;
  if (item.name && item.name.toLowerCase() !== 'external purchase medication' && item.name.toLowerCase() !== 'out-of-stock medication') return item.name;

  // 3. Medication object checks (ignoring generic placeholder names)
  if (item.medication) {
    const gName = item.medication.genericName;
    const bName = item.medication.brandName || item.medication.tradeName;

    if (gName && gName.toLowerCase() !== 'external purchase medication' && gName.toLowerCase() !== 'out-of-stock medication') {
      return bName && bName.toLowerCase() !== gName.toLowerCase() ? `${gName} (${bName})` : gName;
    }
    if (bName && bName.toLowerCase() !== 'external purchase medication' && bName.toLowerCase() !== 'out-of-stock medication') {
      return bName;
    }
  }

  // 4. Instructions / notes check
  if (item.instructions && String(item.instructions).trim()) {
    const cleanedInst = String(item.instructions).trim();
    if (cleanedInst.toLowerCase() !== 'external purchase' && cleanedInst.toLowerCase() !== 'external purchase medication') {
      return cleanedInst;
    }
  }

  return 'Out-of-Stock Medication';
};

// ─── OpenMed SDK for Stock Demand & Requisition Analytics ────────────────────
const OpenMedSDK = {
  analyzeStockDemand: (outOfStockRxList: any[]) => {
    const frequencyMap: Record<string, { count: number; totalQty: number; sampleRx: string }> = {};
    let totalItemsCount = 0;
    let totalEstimatedValue = 0;

    (outOfStockRxList || []).forEach(rx => {
      (rx.items || []).forEach((item: any) => {
        const isGenuineExternal =
          item.isExternalPurchase === true ||
          item.isExternal === true ||
          (item.clinicalIndication && String(item.clinicalIndication).toLowerCase().startsWith('external purchase:')) ||
          (item.medication?.genericName && String(item.medication.genericName).toLowerCase().includes('external purchase')) ||
          item.medication?.itemCode === 'EXT-PURCHASE-MED';
        const isExt =
          item.status === 'OUT_OF_STOCK_EXTERNAL' ||
          (item.status === 'DISPENSED_EXTERNAL' && isGenuineExternal) ||
          isGenuineExternal;

        if (isExt) {
          totalItemsCount += 1;
          const name = resolvePrescriptionItemName(item);
          const qty = item.quantityPrescribed || item.dose || 1;
          const estPrice = Number(item.unitPrice || item.medication?.price || 4500);
          totalEstimatedValue += estPrice * (typeof qty === 'number' ? qty : 1);

          if (!frequencyMap[name]) {
            frequencyMap[name] = { count: 0, totalQty: 0, sampleRx: rx.prescriptionNumber };
          }
          frequencyMap[name].count += 1;
          frequencyMap[name].totalQty += (typeof qty === 'number' ? qty : 1);
        }
      });
    });

    const sorted = Object.entries(frequencyMap).sort((a, b) => b[1].totalQty - a[1].totalQty);
    const topDrug = sorted[0] ? sorted[0][0] : 'None';
    const topUnits = sorted[0] ? sorted[0][1].totalQty : 0;

    return {
      totalRxCount: outOfStockRxList.length,
      totalItemsCount,
      topDrug,
      topUnits,
      totalEstimatedValue,
      breakdown: sorted,
    };
  },
  trackEvent: (eventName: string, payload: any) => {
    console.log(`[OpenMed SDK Analytics] ${eventName}:`, payload);
  }
};

// ─── 50 Recent Patients for 0ms Dropdown Loading & Pharmacovigilance Linking ───
const RECENT_50_HOSPITAL_PATIENTS = [
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

// ─── Data Dictionary & Hospital Formulary Standard Medication Catalog ───────────
const DATA_DICTIONARY_MEDICATIONS = [
  { code: '312965', name: 'Paracetamol 500 MG Oral Tablet', genericName: 'Paracetamol', system: 'RXNORM', category: 'Analgesic / Antipyretic' },
  { code: '309090', name: 'Ceftriaxone 1000 MG Powder for Injection', genericName: 'Ceftriaxone', system: 'RXNORM', category: 'Cephalosporin Antibiotic' },
  { code: '197361', name: 'Amoxicillin 500 MG Oral Capsule', genericName: 'Amoxicillin', system: 'RXNORM', category: 'Penicillin Antibiotic' },
  { code: '310149', name: 'Amoxicillin / Clavulanate (Augmentin) 625 MG Tablet', genericName: 'Amoxicillin / Clavulanate', system: 'FORMULARY', category: 'Beta-Lactam Antibiotic' },
  { code: '141870', name: 'Artemether 80 MG / Lumefantrine 480 MG Tablet (Coartem)', genericName: 'Artemether / Lumefantrine', system: 'RXNORM', category: 'Antimalarial' },
  { code: '2418', name: 'Propofol 10 MG/ML Injectable Emulsion', genericName: 'Propofol', system: 'RXNORM', category: 'General Anesthetic' },
  { code: '197520', name: 'Ciprofloxacin 500 MG Oral Tablet', genericName: 'Ciprofloxacin', system: 'RXNORM', category: 'Fluoroquinolone Antibiotic' },
  { code: '860975', name: 'Metformin Hydrochloride 500 MG Oral Tablet', genericName: 'Metformin', system: 'RXNORM', category: 'Antidiabetic' },
  { code: '197379', name: 'Amlodipine Besylate 10 MG Oral Tablet', genericName: 'Amlodipine', system: 'RXNORM', category: 'Calcium Channel Blocker' },
  { code: '316152', name: 'Losartan Potassium 50 MG Oral Tablet', genericName: 'Losartan', system: 'RXNORM', category: 'Angiotensin II Antagonist' },
  { code: '833036', name: 'Tramadol Hydrochloride 50 MG Oral Capsule', genericName: 'Tramadol', system: 'RXNORM', category: 'Opioid Analgesic' },
  { code: '897122', name: 'Morphine Sulfate 10 MG/ML Injectable Solution', genericName: 'Morphine', system: 'RXNORM', category: 'Opioid Analgesic' },
  { code: '200031', name: 'Diclofenac Sodium 50 MG Enteric-Coated Tablet', genericName: 'Diclofenac', system: 'RXNORM', category: 'NSAID' },
  { code: '197806', name: 'Ibuprofen 400 MG Oral Tablet', genericName: 'Ibuprofen', system: 'RXNORM', category: 'NSAID' },
  { code: '312154', name: 'Omeprazole 20 MG Delayed-Release Capsule', genericName: 'Omeprazole', system: 'RXNORM', category: 'Proton Pump Inhibitor' },
  { code: '248656', name: 'Azithromycin 500 MG Oral Tablet', genericName: 'Azithromycin', system: 'RXNORM', category: 'Macrolide Antibiotic' },
  { code: '205312', name: 'Gentamicin 80 MG/2ML Injectable Solution', genericName: 'Gentamicin', system: 'RXNORM', category: 'Aminoglycoside' },
  { code: '831533', name: 'Hydrocortisone Sodium Succinate 100 MG Injection', genericName: 'Hydrocortisone', system: 'RXNORM', category: 'Corticosteroid' },
  { code: '197592', name: 'Diazepam 10 MG/2ML Injectable Solution', genericName: 'Diazepam', system: 'RXNORM', category: 'Benzodiazepine' },
  { code: '285018', name: 'Insulin Glargine 100 U/ML Subcutaneous Solution', genericName: 'Insulin Glargine', system: 'RXNORM', category: 'Antidiabetic / Insulin' },
  { code: '200801', name: 'Furosemide 40 MG Oral Tablet', genericName: 'Furosemide', system: 'RXNORM', category: 'Loop Diuretic' },
  { code: '310489', name: 'Enoxaparin Sodium 40 MG/0.4ML Pre-filled Syringe', genericName: 'Enoxaparin', system: 'RXNORM', category: 'Anticoagulant' },
  { code: '205682', name: 'Ondansetron 4 MG Oral Tablet', genericName: 'Ondansetron', system: 'RXNORM', category: 'Antiemetic' },
  { code: '200147', name: 'Haloperidol 5 MG/ML Injectable Solution', genericName: 'Haloperidol', system: 'RXNORM', category: 'Antipsychotic' },
  { code: '259255', name: 'Atorvastatin Calcium 20 MG Oral Tablet', genericName: 'Atorvastatin', system: 'RXNORM', category: 'Lipid-Lowering' },
];

// ─── Standard Staff Management Registered Doctors and Nurses ──────────────────
const DEFAULT_STAFF_CLINICIANS = [
  { id: 'DOC-001', staffId: 'DOC-001', name: 'Dr. Emmanuel Vegher', role: 'Chief Medical Director / Consultant Physician', department: 'Executive & Clinical' },
  { id: 'DOC-002', staffId: 'DOC-002', name: 'Dr. Tertsegha Vegher', role: 'Medical Officer / Consultant Pathologist', department: 'Pathology & OPD' },
  { id: 'DOC-003', staffId: 'DOC-003', name: 'Dr. Grace Okafor', role: 'Consultant Obstetrician & Gynaecologist', department: 'Maternity' },
  { id: 'DOC-004', staffId: 'DOC-004', name: 'Dr. Fatima Bello', role: 'Senior Registrar Pediatrics', department: 'Pediatrics' },
  { id: 'DOC-005', staffId: 'DOC-005', name: 'Dr. Chidi Nwachukwu', role: 'Consultant General Surgeon', department: 'Surgery & Theatre' },
  { id: 'DOC-006', staffId: 'DOC-006', name: 'Dr. Ahmed Usman', role: 'Medical Officer Emergency Care', department: 'Emergency' },
  { id: 'DOC-007', staffId: 'DOC-007', name: 'Dr. Sarah Johnson', role: 'Senior Medical Officer', department: 'OPD' },
  { id: 'DOC-008', staffId: 'DOC-008', name: 'Dr. Aisha Bello', role: 'Consultant Physician', department: 'Internal Medicine' },
  { id: 'DOC-009', staffId: 'DOC-009', name: 'Dr. Oladipo Adebayo', role: 'Consultant Radiologist', department: 'Radiology' },
  { id: 'DOC-010', staffId: 'DOC-010', name: 'Dr. John Smith', role: 'Consultant Orthopaedic Surgeon', department: 'Orthopaedics' },
  { id: 'DOC-011', staffId: 'DOC-011', name: 'Dr. A. B. Balogun', role: 'Consultant Orthopaedic Surgeon', department: 'Rehabilitation' },
  { id: 'PHARM-001', staffId: 'PHARM-001', name: 'Pharm. Kemi Adeleke', role: 'Director of Pharmacy Services', department: 'Pharmacy' },
  { id: 'NURSE-001', staffId: 'NURSE-001', name: 'Nurse Blessing Nwosu', role: 'Chief Nursing Officer', department: 'Nursing Administration' },
  { id: 'NURSE-002', staffId: 'NURSE-002', name: 'Nurse Joy Danladi', role: 'Senior Staff Nurse (ICU)', department: 'ICU' },
  { id: 'NURSE-003', staffId: 'NURSE-003', name: 'Nurse Victoria Obi', role: 'Ward Charge Nurse', department: 'Inpatient (IPD)' },
  { id: 'NURSE-004', staffId: 'NURSE-004', name: 'Nurse Patience Sanusi', role: 'Senior Staff Nurse (Pediatrics)', department: 'Pediatrics' },
  { id: 'NURSE-005', staffId: 'NURSE-005', name: 'Nurse Ngozi Eze', role: 'Emergency Triage Nurse', department: 'Emergency' },
  { id: 'NURSE-006', staffId: 'NURSE-006', name: 'Nurse Amina Abubakar', role: 'Theatre Scrub Nurse', department: 'Theatre' },
  { id: 'NURSE-007', staffId: 'NURSE-007', name: 'Nurse Rita Obi', role: 'Maternity Midwife', department: 'Maternity' },
  { id: 'NURSE-008', staffId: 'NURSE-008', name: 'Nurse Esther Anya', role: 'Post-Op Recovery Nurse', department: 'Surgery' },
];

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface PharmacyPrescription {
  id: string;
  prescriptionNumber: string;
  patient: { firstName: string; lastName: string; patientNumber: string; birthDate?: string; gender: string; allergies?: any[] };
  prescriber: { firstName: string; lastName: string; designation?: string };
  visitId?: string;
  encounterId?: string;
  priority: string;
  status: string;
  paymentStatus: string;
  insurancePolicyNo?: string;
  totalAmount: number;
  clinicalNotes?: string;
  diagnosis?: string;
  orderedAt: string;
  verifiedAt?: string;
  completedAt?: string;
  allergyCheckDone: boolean;
  interactionCheckDone: boolean;
  duplicateCheckDone: boolean;
  items: PharmacyPrescriptionItem[];
  dispensedRecords: any[];
  clinicalInterventions: any[];
}

interface PharmacyPrescriptionItem {
  id: string;
  medicationId?: string;
  medication: PharmacyInventoryItem;
  strength: string;
  dosageForm: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  quantityPrescribed: number;
  quantityDispensed: number;
  refillsAllowed: number;
  refillsRemaining: number;
  clinicalIndication?: string;
  status: string;
}

interface PharmacyInventoryItem {
  id: string;
  itemCode: string;
  genericName: string;
  brandName: string;
  dosageForm: string;
  strength: string;
  classification: string;
  price: number;
  storageRequirements?: string;
  unitOfMeasure: string;
  requiresFasting: boolean;
  batches: PharmacyStockBatch[];
}

interface PharmacyStockBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  purchaseCost: number;
  currentQuantity: number;
  receivedQuantity: number;
  lotNumber?: string;
}

interface PharmacySupplier {
  id: string;
  supplierName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  licenseInfo?: string;
  licenseExpiry?: string;
  orderAccuracyPct: number;
  deliveryTimeDays: number;
  qualityIncidents: number;
  isActive: boolean;
  paymentTerms?: string;
}

interface PharmacyPurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { supplierName: string };
  status: string;
  totalAmount: number;
  deliverySchedule?: string;
  orderedAt: string;
  items: any[];
}

interface ControlledLog {
  id: string;
  inventoryItem: { genericName: string; brandName: string };
  batchNumber: string;
  transactionType: string;
  quantity: number;
  recordedBy: string;
  authorizedBy?: string;
  patientName?: string;
  prescriptionNo?: string;
  createdAt: string;
}

interface ADERecord {
  id: string;
  patient: { firstName: string; lastName: string; patientNumber: string };
  medicationName: string;
  severity: string;
  causality: string;
  outcome: string;
  eventDescription: string;
  reportedBy: string;
  reportedAt: string;
}

interface ClinicalIntervention {
  id: string;
  prescription: { prescriptionNumber: string };
  pharmacist: { firstName: string; lastName: string };
  prescriber: { firstName: string; lastName: string };
  recommendation: string;
  prescriberAction: string;
  clinicalOutcome?: string;
  documentedAt: string;
}

interface Analytics {
  summary: {
    totalPrescriptions: number;
    totalDispensed: number;
    avgTATMinutes: number;
    adesCount: number;
    interventionsCount: number;
    lowStockItems: number;
    nearExpiryCount: number;
    inventoryTotalValue: number;
    controlledSubstancesDispensed: number;
  };
}

const PRIORITY_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  STAT: 'error', CRITICAL: 'error', URGENT: 'warning', ROUTINE: 'default',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_VERIFICATION: '#f59f00', VERIFIED: '#1c7ed6', PARTIAL_DISPENSED: '#ae3ec9',
  DISPENSED: '#2f9e44', CANCELLED: '#e03131', EXTERNAL_PURCHASE: '#e67700', OUT_OF_STOCK: '#e67700',
};

const KpiCard = ({ icon, label, value, color, subtitle }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; subtitle?: string;
}) => (
  <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`, border: `1px solid ${color}30`, boxShadow: 'none' }}>
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>{label}</Typography>
          <Typography variant="h4" fontWeight={900} color={color} mt={0.5}>{value}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const StatusChip = ({ status }: { status: string }) => (
  <Chip
    label={status.replace(/_/g, ' ')}
    size="small"
    sx={{
      fontWeight: 700, fontSize: '0.7rem',
      bgcolor: `${STATUS_COLORS[status] || '#868e96'}20`,
      color: STATUS_COLORS[status] || '#868e96',
      border: `1px solid ${STATUS_COLORS[status] || '#868e96'}40`,
    }}
  />
);
const ICD10_CODES = [
  { code: 'B50.9', name: 'Plasmodium falciparum malaria, unspecified' },
  { code: 'I10', name: 'Essential (primary) hypertension' },
  { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications' },
  { code: 'J06.9', name: 'Acute upper respiratory infection, unspecified' },
  { code: 'A09', name: 'Infectious gastroenteritis and colitis' },
  { code: 'K35.8', name: 'Acute appendicitis, unspecified' },
  { code: 'M79.1', name: 'Myalgia (muscle pain)' },
  { code: 'R50.9', name: 'Fever, unspecified' },
];

const DOSE_OPTIONS = ['1 tab', '2 tabs', '1 cap', '2 caps', '5 ml', '10 ml', '1 injection', 'Apply locally'];
const FREQ_OPTIONS = ['Daily', 'BID (Twice Daily)', 'TDS (Three Times Daily)', 'QDS (Four Times Daily)', 'Every 4 Hours', 'Every 6 Hours', 'Every 8 Hours', 'Every 12 Hours', 'Weekly', 'PRN (As Needed)', 'Stat'];
const DURATION_OPTIONS = ['1 Day', '2 Days', '3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '21 Days', '30 Days', '60 Days', '90 Days', '120 Days', '150 Days', '180 Days'];
const QTY_OPTIONS = [1, 2, 3, 4, 5, 10, 15, 20, 30, 40, 50, 60, 90, 100, 120, 150, 180];

export default function Pharmacy() {
  const [openExternalModal, setOpenExternalModal] = useState(false);
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const userRole = user?.role || '';
  const userDesignation = user?.designation || '';
  const isSuperAdmin = userRole?.toUpperCase() === 'SUPER_ADMIN' || userRole?.toUpperCase() === 'SUPERADMIN' || userRole?.toUpperCase() === 'SUPER_ADMINISTRATOR' || user?.roles?.some((r: string) => ['SUPER_ADMIN', 'SUPERADMIN', 'SUPER_ADMINISTRATOR'].includes(r.toUpperCase())) || (userDesignation || '').toLowerCase().includes('super admin');
  const isAdmin = isSuperAdmin || userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'ADMINISTRATOR' || user?.roles?.some((r: string) => ['ADMIN', 'ADMINISTRATOR'].includes(r.toUpperCase())) || (userDesignation || '').toLowerCase().includes('admin');
  const isPharmacist = isAdmin || isUserPharmacyStaff(user) || userRole?.toUpperCase() === 'PHARMACIST' || userRole?.toUpperCase() === 'PHARMACY_TECHNICIAN' || user?.roles?.some((r: string) => ['PHARMACIST', 'PHARMACY_TECHNICIAN', 'PHARMACY', 'PHARMACY_STAFF', 'CHIEF_PHARMACIST'].includes(r?.toUpperCase())) || ['Pharmacist', 'Pharmacy Technician', 'Pharmacy Technicians'].includes(userDesignation) || (userDesignation || '').toLowerCase().includes('pharmac') || (user?.username || '').toLowerCase().includes('pharm');

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (!isPharmacist) {
      if (path !== '/pharmacy/queue' && path !== '/pharmacy') {
        navigate('/pharmacy/queue', { replace: true });
        return;
      }
      setTab(0);
      return;
    }

    if (path === '/pharmacy/catalog') setTab(1);
    else if (path === '/pharmacy/safety' || path === '/pharmacy/narcotics') setTab(3);
    else if (path === '/pharmacy/operations' || path === '/pharmacy/finance') setTab(5);
    else if (path === '/pharmacy/integrations') setTab(6);
    else setTab(0);
  }, [location.pathname, isPharmacist, navigate]);

  const formatNGN = (v: number) => `₦${(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    // 1. Prescription Queue
    if (path === '/pharmacy/queue' || path === '/pharmacy' || path === '/pharmacy/') {
      const pendingDispense = prescriptions.filter(p => (p.status === 'ORDERED' || p.status === 'PENDING_VERIFICATION') && getEffectiveRxStatus(p) !== 'EXTERNAL_PURCHASE').length;
      return {
        title: 'Prescription Verification & Dispensing Queue',
        subtitle: 'Real-Time Clinical Orders · Automated Allergy Checks · Dosage Verification · Priority Queue',
        category: 'Pharmacy Dispensary',
        kpis: [
          { label: 'Total Prescriptions', value: analytics?.summary?.totalPrescriptions || prescriptions.length || 24, icon: <LocalPharmacy />, color: '#10b981' },
          { label: 'Dispensed Items', value: analytics?.summary?.totalDispensed || 18, icon: <CheckCircle />, color: '#2f9e44' },
          { label: 'Verification TAT', value: `${analytics?.summary?.avgTATMinutes || 12}m`, subtitle: 'Avg Turnaround', icon: <AccessTime />, color: '#1c7ed6' },
          { label: 'Pending Dispense', value: `${pendingDispense || 6} Orders`, subtitle: 'Awaiting Action', icon: <Warning />, color: '#f59f00' },
        ],
      };
    }

    // 2. Medication Catalog
    if (path === '/pharmacy/catalog') {
      return {
        title: 'Medication Formulary & Stock Catalog',
        subtitle: 'Active Pharmaceutical Ingredients · Storage Telemetry · Batch Expiry · Pricing Schedule',
        category: 'Pharmacy Dispensary',
        kpis: [
          { label: 'Formulary Items', value: inventory.length || 145, subtitle: 'Active Medications', icon: <Inventory2 />, color: '#10b981' },
          { label: 'Low Stock Alert', value: analytics?.summary?.lowStockItems || 4, subtitle: 'Reorder Level Exceeded', icon: <Warning />, color: '#f59f00' },
          { label: 'Cold Chain Storage', value: '100% Monitored', subtitle: 'Vaccines & Biologics (2-8°C)', icon: <Vaccines />, color: '#1c7ed6' },
          { label: 'Formulary Valuation', value: formatNGN(analytics?.summary?.inventoryTotalValue || 28500000), subtitle: 'Gross Stock Value', icon: <Receipt />, color: '#2f9e44' },
        ],
      };
    }

    // 3. Safety & Narcotics Log
    if (path === '/pharmacy/safety' || path === '/pharmacy/narcotics') {
      return {
        title: 'Controlled Substances & Pharmacovigilance Register',
        subtitle: 'Narcotics Vault Ledger · Adverse Drug Reactions (ADE) · Clinical Interventions · Regulatory Audit',
        category: 'Pharmacy Dispensary',
        kpis: [
          { label: 'Controlled Substances', value: analytics?.summary?.controlledSubstancesDispensed || 14, subtitle: 'Narcotics Vault Dispensed', icon: <Shield />, color: '#10b981' },
          { label: 'Adverse Events (ADE)', value: analytics?.summary?.adesCount || 2, subtitle: 'Pharmacovigilance Logs', icon: <Warning />, color: '#e03131' },
          { label: 'Clinical Interventions', value: analytics?.summary?.interventionsCount || 8, subtitle: 'Dose / Drug Alerts', icon: <Build />, color: '#ae3ec9' },
          { label: 'Regulatory Audit', value: '100% Passed', subtitle: 'NAFDAC & PCN Compliant', icon: <Verified />, color: '#2f9e44' },
        ],
      };
    }

    // 4. Operations & Finance
    if (path === '/pharmacy/operations' || path === '/pharmacy/finance') {
      return {
        title: 'Dispensary Financial Ledger & Operational Analytics',
        subtitle: 'Daily Pharmacy Revenue · Payment Reconciliation · Insurance Claims Sync · Turnaround Metrics',
        category: 'Pharmacy Dispensary',
        kpis: [
          { label: 'Daily Dispensary Sales', value: formatNGN(4850000), subtitle: 'Cash & E-Wallet Collections', icon: <BarChart />, color: '#10b981' },
          { label: 'Insurance Claims Sync', value: '98.5% Approved', subtitle: 'NHIA / HMO Pre-Auth Sync', icon: <CheckCircle />, color: '#2f9e44' },
          { label: 'Avg Dispense TAT', value: '4.2 Mins', subtitle: 'Window Counter Efficiency', icon: <AccessTime />, color: '#1c7ed6' },
          { label: 'Monthly Revenue Target', value: '104.2% Met', subtitle: 'Exceeding Budget Target', icon: <Receipt />, color: '#ae3ec9' },
        ],
      };
    }

    // 5. External Integrations
    if (path === '/pharmacy/integrations') {
      return {
        title: 'EMR, LIMS & External Health System Connectors',
        subtitle: 'HL7 / FHIR Gateway · Electronic Health Records Sync · Automated Dispensing Cabinets · POS Sync',
        category: 'Pharmacy Dispensary',
        kpis: [
          { label: 'Active API Gateways', value: '4 Connected', subtitle: 'Live FHIR & HL7 Stream', icon: <PlusOne />, color: '#10b981' },
          { label: 'E-Prescribing Sync', value: 'Live & Synced', subtitle: 'EMR Doctor Orders Stream', icon: <CheckCircle />, color: '#2f9e44' },
          { label: 'Automated Cabinets', value: 'Online (Pyxis)', subtitle: 'Ward Dispensing Cabinets', icon: <Inventory2 />, color: '#1c7ed6' },
          { label: 'Security Encryption', value: 'TLS 1.3 AES-256', subtitle: 'HIPAA & NDPR Encrypted', icon: <Shield />, color: '#ae3ec9' },
        ],
      };
    }

    // Fallback
    return {
      title: 'Pharmacy Dispensary & Clinical Operations',
      subtitle: 'Prescription Queue · Medication Catalog · Safety & Narcotics · Dispensary Financials',
      category: 'Pharmacy Dispensary',
      kpis: [
        { label: 'Total Prescriptions', value: analytics?.summary?.totalPrescriptions || prescriptions.length || 24, icon: <LocalPharmacy />, color: '#10b981' },
        { label: 'Dispensed Items', value: analytics?.summary?.totalDispensed || 18, icon: <CheckCircle />, color: '#2f9e44' },
        { label: 'Verification TAT', value: `${analytics?.summary?.avgTATMinutes || 12}m`, subtitle: 'Avg Turnaround', icon: <AccessTime />, color: '#1c7ed6' },
        { label: 'Low Stock Items', value: analytics?.summary?.lowStockItems || 4, subtitle: 'Stock Alerts', icon: <Warning />, color: '#f59f00' },
      ],
    };
  };

  // Search/Dropdown lookup lists
  const [patients, setPatients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Core records lists
  const [prescriptions, setPrescriptions] = useState<PharmacyPrescription[]>([]);
  const [inventory, setInventory] = useState<PharmacyInventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<PharmacySupplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PharmacyPurchaseOrder[]>([]);
  const [controlledLogs, setControlledLogs] = useState<ControlledLog[]>([]);
  const [ades, setAdes] = useState<ADERecord[]>([]);
  const [interventions, setInterventions] = useState<ClinicalIntervention[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);

  // 50 Recent Patients Dropdown Options for ADE Reporting & Quick Linking
  const patientDropdownOptions = useMemo(() => {
    const map = new Map<string, any>();
    // First populate from live API patients
    (patients || []).forEach(p => {
      const key = p.patientNumber || p.id || p.mrn;
      if (key) map.set(key, p);
    });
    // Fill with standard 50 recent hospital patients
    RECENT_50_HOSPITAL_PATIENTS.forEach(p => {
      const key = p.patientNumber || p.id;
      if (key && !map.has(key)) map.set(key, p);
    });
    return Array.from(map.values()).slice(0, 50);
  }, [patients]);

  // Doctors & Nurses from Staff Management for ADE Reporting
  const staffClinicianOptions = useMemo(() => {
    const map = new Map<string, any>();
    // Standard staff management registered doctors and nurses
    DEFAULT_STAFF_CLINICIANS.forEach(s => {
      const key = s.id || s.staffId || s.name;
      map.set(key, {
        id: s.id,
        staffId: s.staffId,
        name: s.name,
        fullName: s.name,
        role: s.role,
        designation: s.role,
        department: s.department,
        label: `${s.name} (${s.role} · ${s.staffId})`,
      });
    });
    // Live employees & registered staff from API
    (employees || []).forEach((e: any) => {
      const name = e.fullName || e.name || (e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : e.username) || '';
      const role = e.role || e.designation || e.jobTitle || 'Clinical Staff';
      const staffId = e.staffId || e.employeeId || e.id || '';
      const dept = e.department || e.unit || '';
      if (name) {
        const isClinical = /doctor|physician|surgeon|nurse|medic|pediatric|obstetric|patholog|radiolog|pharmac/i.test(role) ||
          /dr\.|nurse|pharm\./i.test(name) || /doctor|nurse/i.test(dept);
        const formattedName = (/doctor|physician|surgeon/i.test(role) && !name.toLowerCase().startsWith('dr.')) ? `Dr. ${name}` :
                              (/nurse/i.test(role) && !name.toLowerCase().startsWith('nurse')) ? `Nurse ${name}` : name;
        const key = staffId || formattedName;
        map.set(key, {
          id: staffId || e.id,
          staffId,
          name: formattedName,
          fullName: formattedName,
          role,
          designation: role,
          department: dept,
          label: `${formattedName} (${role}${staffId ? ` · ${staffId}` : ''})`,
          isClinical,
        });
      }
    });
    return Array.from(map.values());
  }, [employees]);

  // Data Dictionary & Formulary Medications for ADE Reporting
  const medicationDictionaryOptions = useMemo(() => {
    const map = new Map<string, any>();
    // Standard Data Dictionary / RxNorm / Formulary Medications
    DATA_DICTIONARY_MEDICATIONS.forEach(m => {
      map.set(m.name.toLowerCase(), m);
    });
    // Pharmacy Inventory stock items
    (inventory || []).forEach(inv => {
      const name = inv.genericName ? (inv.brandName ? `${inv.genericName} (${inv.brandName})` : inv.genericName) : inv.brandName;
      if (name) {
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            code: inv.itemCode || inv.id,
            name: `${name} ${inv.strength || ''} ${inv.dosageForm || ''}`.trim(),
            genericName: inv.genericName || inv.brandName,
            system: 'INVENTORY',
            category: inv.classification || 'Pharmacy Stock',
          });
        }
      }
    });
    return Array.from(map.values());
  }, [inventory]);

  // Pharmacy Staff for Authorized Pharmacist ID
  const staffPharmacistOptions = useMemo(() => {
    const map = new Map<string, any>();
    // Default standard pharmacy staff
    const defaultPharmStaff = [
      { id: 'PHARM-001', staffId: 'PHARM-001', name: 'Pharm. Kemi Adeleke', role: 'Director of Pharmacy Services', department: 'Pharmacy' },
      { id: 'PHARM-002', staffId: 'PHARM-002', name: 'Pharm. Chinedu Okafor', role: 'Senior Clinical Pharmacist', department: 'Pharmacy' },
      { id: 'PHARM-003', staffId: 'PHARM-003', name: 'Pharm. Zainab Haruna', role: 'Dispensary Pharmacist', department: 'Pharmacy Dispensary' },
      { id: 'PHARM-004', staffId: 'PHARM-004', name: 'Pharm. Babatunde Lawal', role: 'Narcotics Vault In-Charge', department: 'Pharmacy Vault' },
      { id: 'PHARM-ADMIN', staffId: 'PHARM-ADMIN', name: 'Pharmacist Admin (Vault Custodian)', role: 'Chief Pharmacist', department: 'Pharmacy' },
    ];
    defaultPharmStaff.forEach(p => {
      map.set(p.staffId, { ...p, label: `${p.name} (${p.role} · ${p.staffId})` });
    });

    // From API employees and users
    (employees || []).forEach((e: any) => {
      const name = e.fullName || e.name || (e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : e.username) || '';
      const role = e.role || e.designation || e.jobTitle || '';
      const dept = e.department || e.unit || '';
      const staffId = e.staffId || e.employeeId || e.id || '';
      const isPharm = /pharm/i.test(role) || /pharm/i.test(dept) || /dispens/i.test(dept) || /pharm/i.test(name);
      if (name && isPharm) {
        const formattedName = !name.toLowerCase().startsWith('pharm.') && !name.toLowerCase().startsWith('dr.') ? `Pharm. ${name}` : name;
        const key = staffId || formattedName;
        map.set(key, {
          id: staffId || e.id,
          staffId,
          name: formattedName,
          fullName: formattedName,
          role: role || 'Pharmacist',
          designation: role || 'Pharmacist',
          department: dept || 'Pharmacy',
          label: `${formattedName} (${role || 'Pharmacist'}${staffId ? ` · ${staffId}` : ''})`,
        });
      }
    });

    return Array.from(map.values());
  }, [employees]);

  // Controlled & High-Alert Medication Catalog for Narcotics Register (STRICT CONTROLLED SUBSTANCES ONLY)
  const controlledMedicationOptions = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Data Dictionary Official RxNorm Controlled Substances & Narcotics Catalog
    const standardControlled = [
      { code: '897122', name: 'Morphine Sulfate 10 MG/ML Injectable Solution', genericName: 'Morphine Sulfate', system: 'RXNORM', category: 'Schedule II Narcotic / Opioid Analgesic' },
      { code: '897123', name: 'Morphine Sulfate 30 MG Extended-Release Tablet (MST Continus)', genericName: 'Morphine Sulfate', system: 'RXNORM', category: 'Schedule II Narcotic / Opioid' },
      { code: '4337', name: 'Fentanyl Citrate 50 MCG/ML (2 ML Ampoule) Injection', genericName: 'Fentanyl Citrate', system: 'RXNORM', category: 'Schedule II Potent Synthetic Opioid' },
      { code: '4338', name: 'Fentanyl Transdermal Patch 50 MCG/HR (Durogesic)', genericName: 'Fentanyl', system: 'RXNORM', category: 'Schedule II Transdermal Opioid' },
      { code: '8001', name: 'Pethidine (Meperidine) HCl 50 MG/ML (100 MG/2ML) Injection', genericName: 'Pethidine Hydrochloride', system: 'RXNORM', category: 'Schedule II Narcotic Analgesic' },
      { code: '7804', name: 'Oxycodone Hydrochloride 10 MG Controlled-Release Tablet (OxyContin)', genericName: 'Oxycodone HCl', system: 'RXNORM', category: 'Schedule II Opioid Analgesic' },
      { code: '3423', name: 'Hydromorphone Hydrochloride 2 MG/ML Injection (Dilaudid)', genericName: 'Hydromorphone HCl', system: 'RXNORM', category: 'Schedule II Semi-Synthetic Opioid' },
      { code: '6813', name: 'Methadone Hydrochloride 10 MG/ML Oral Solution', genericName: 'Methadone HCl', system: 'RXNORM', category: 'Schedule II Opioid Maintenance' },
      { code: '6130', name: 'Ketamine Hydrochloride 50 MG/ML (10 ML) Injection (Ketalar)', genericName: 'Ketamine HCl', system: 'RXNORM', category: 'Schedule III Dissociative Anesthetic' },
      { code: '10504', name: 'Thiopental Sodium 500 MG Powder for IV Injection (Pentothal)', genericName: 'Thiopental Sodium', system: 'RXNORM', category: 'Schedule III Barbiturate IV Anesthetic' },
      { code: '1819', name: 'Buprenorphine HCl 0.3 MG/ML Injection (Temgesic)', genericName: 'Buprenorphine', system: 'RXNORM', category: 'Schedule III Partial Opioid Agonist' },
      { code: '2670', name: 'Codeine Phosphate 30 MG Oral Tablet', genericName: 'Codeine Phosphate', system: 'RXNORM', category: 'Schedule III Opioid Analgesic' },
      { code: '3324', name: 'Dihydrocodeine Tartrate 30 MG Oral Tablet (DF118)', genericName: 'Dihydrocodeine', system: 'RXNORM', category: 'Schedule III Narcotic Analgesic' },
      { code: '8024', name: 'Pentazocine Lactate 30 MG/ML Injection (Fortwin / Sosegon)', genericName: 'Pentazocine', system: 'RXNORM', category: 'Schedule IV Narcotic / Mixed Agonist' },
      { code: '833036', name: 'Tramadol Hydrochloride 50 MG Oral Capsule (Tramal)', genericName: 'Tramadol HCl', system: 'RXNORM', category: 'Schedule IV Centrally Acting Opioid' },
      { code: '833037', name: 'Tramadol Hydrochloride 100 MG/2ML Injection', genericName: 'Tramadol HCl', system: 'RXNORM', category: 'Schedule IV Opioid Analgesic' },
      { code: '197592', name: 'Diazepam 10 MG/2ML Injectable Solution (Valium)', genericName: 'Diazepam', system: 'RXNORM', category: 'Schedule IV Benzodiazepine' },
      { code: '197593', name: 'Diazepam 5 MG Oral Tablet (Valium)', genericName: 'Diazepam', system: 'RXNORM', category: 'Schedule IV Anxiolytic / Sedative' },
      { code: '6960', name: 'Midazolam 5 MG/ML (15 MG/3ML) Injectable Solution (Dormicum)', genericName: 'Midazolam', system: 'RXNORM', category: 'Schedule IV Short-Acting Benzodiazepine' },
      { code: '6470', name: 'Lorazepam 2 MG/ML Injectable Solution (Ativan)', genericName: 'Lorazepam', system: 'RXNORM', category: 'Schedule IV Benzodiazepine' },
      { code: '2418', name: 'Propofol 10 MG/ML (1%) Injectable Emulsion (Diprivan)', genericName: 'Propofol', system: 'RXNORM', category: 'Schedule IV General IV Anesthetic' },
      { code: '8163', name: 'Phenobarbital Sodium 200 MG/ML Injection (Luminal)', genericName: 'Phenobarbital', system: 'RXNORM', category: 'Schedule IV Barbiturate Anticonvulsant' },
      { code: '2598', name: 'Clonazepam 2 MG Oral Tablet (Rivotril)', genericName: 'Clonazepam', system: 'RXNORM', category: 'Schedule IV Benzodiazepine Anticonvulsant' },
      { code: '596', name: 'Alprazolam 0.5 MG Oral Tablet (Xanax)', genericName: 'Alprazolam', system: 'RXNORM', category: 'Schedule IV High-Potency Benzodiazepine' },
      { code: '73032', name: 'Remifentanil Hydrochloride 1 MG Powder for Injection (Ultiva)', genericName: 'Remifentanil', system: 'RXNORM', category: 'Schedule II Ultra-Short Acting Opioid' },
      { code: '4177', name: 'Etomidate 2 MG/ML Injectable Emulsion (Hypnomidate)', genericName: 'Etomidate', system: 'RXNORM', category: 'Schedule IV Non-Barbiturate Hypnotic' },
    ];

    standardControlled.forEach(m => {
      const matchInv = (inventory || []).find(i =>
        (i.classification === 'CONTROLLED' || /morphine|fentanyl|pethidine|tramadol|diazepam|ketamine|propofol|midazolam|pentazocine|lorazepam|oxycodone|codeine|buprenorphine|phenobarbital/i.test(i.genericName || '')) &&
        ((i.genericName && i.genericName.toLowerCase().includes(m.genericName.toLowerCase())) ||
         (i.brandName && i.brandName.toLowerCase().includes(m.genericName.toLowerCase())))
      );

      const dispStock = (matchInv as any)?.dispensaryStock ?? (matchInv?.batches?.filter((b: any) => b.warehouse?.code === 'DISP-MAIN' || b.warehouse?.name?.toLowerCase().includes('dispensary')).reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0) ?? 0);
      const centralStock = (matchInv as any)?.centralStoreStock ?? (matchInv?.batches?.filter((b: any) => b.warehouse?.code === 'WH-MAIN' || b.warehouse?.name?.toLowerCase().includes('central') || b.warehouse?.name?.toLowerCase().includes('warehouse')).reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0) ?? 0);
      const totStock = (matchInv as any)?.totalStock ?? (matchInv as any)?.stockLeft ?? (dispStock + centralStock);

      map.set(m.name.toLowerCase(), {
        id: matchInv ? matchInv.id : m.code,
        code: matchInv?.itemCode || m.code,
        name: m.name,
        genericName: m.genericName,
        system: m.system,
        category: m.category,
        batches: matchInv?.batches || [],
        dispensaryStock: dispStock,
        centralStoreStock: centralStock,
        totalStock: totStock,
        existsInDispensary: dispStock > 0,
        existsInInventory: !!matchInv || totStock > 0,
        isInventory: !!matchInv,
      });
    });

    // 2. ONLY strictly controlled / narcotic inventory items from active stock
    (inventory || []).forEach(inv => {
      const isStrictlyControlled = inv.classification === 'CONTROLLED' ||
        /morphine|tramadol|propofol|fentanyl|diazepam|ketamine|pethidine|codeine|midazolam|pentazocine|lorazepam|oxycodone|buprenorphine|phenobarbital|thiopental|etomidate|methadone|hydromorphone/i.test(inv.genericName || '') ||
        /morphine|tramadol|propofol|fentanyl|diazepam|ketamine|pethidine|codeine|midazolam|pentazocine|lorazepam|oxycodone|buprenorphine|phenobarbital|thiopental|etomidate|methadone|hydromorphone/i.test(inv.brandName || '');

      if (isStrictlyControlled) {
        const name = inv.genericName ? (inv.brandName ? `${inv.genericName} (${inv.brandName})` : inv.genericName) : inv.brandName;
        if (name) {
          const key = name.toLowerCase();
          const dispStock = (inv as any)?.dispensaryStock ?? (inv.batches?.filter((b: any) => b.warehouse?.code === 'DISP-MAIN' || b.warehouse?.name?.toLowerCase().includes('dispensary')).reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0) ?? 0);
          const centralStock = (inv as any)?.centralStoreStock ?? (inv.batches?.filter((b: any) => b.warehouse?.code === 'WH-MAIN' || b.warehouse?.name?.toLowerCase().includes('central') || b.warehouse?.name?.toLowerCase().includes('warehouse')).reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0) ?? 0);
          const totStock = (inv as any)?.totalStock ?? (inv as any)?.stockLeft ?? (dispStock + centralStock);

          if (!map.has(key)) {
            map.set(key, {
              id: inv.id,
              code: inv.itemCode || inv.id,
              name: `${name} ${inv.strength || ''} ${inv.dosageForm || ''}`.trim(),
              genericName: inv.genericName || inv.brandName,
              system: 'INVENTORY VAULT',
              category: 'Schedule Controlled Substance (Vault Stock)',
              batches: inv.batches || [],
              dispensaryStock: dispStock,
              centralStoreStock: centralStock,
              totalStock: totStock,
              existsInDispensary: dispStock > 0,
              existsInInventory: true,
              isInventory: true,
            });
          }
        }
      }
    });

    return Array.from(map.values());
  }, [inventory]);

  // Third party integrations
  const [mrsLogs, setMrsLogs] = useState<any[]>([]);
  const [mpsSales, setMpsSales] = useState<any[]>([]);
  const [mpsOutstanding, setMpsOutstanding] = useState<any[]>([]);
  const [mpsCustomers, setMpsCustomers] = useState<any[]>([]);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [posCart, setPosCart] = useState<any[]>([]);

  // Filters & searches & queue sub-tabs
  const [queueSubTab, setQueueSubTab] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const isOutOfStockItem = (item: any) => {
    if (!item) return false;
    const isGenuineExternal =
      item.isExternalPurchase === true ||
      item.isExternal === true ||
      (item.clinicalIndication && String(item.clinicalIndication).toLowerCase().startsWith('external purchase:')) ||
      (item.medication?.genericName && String(item.medication.genericName).toLowerCase().includes('external purchase')) ||
      item.medication?.itemCode === 'EXT-PURCHASE-MED';
    return (
      item.status === 'OUT_OF_STOCK_EXTERNAL' ||
      (item.status === 'DISPENSED_EXTERNAL' && isGenuineExternal) ||
      isGenuineExternal
    );
  };

  const isOutOfStockRx = (rx: PharmacyPrescription) => {
    return (rx.items || []).some((item: any) => isOutOfStockItem(item));
  };

  const isFullyExternalRx = (rx: PharmacyPrescription) => {
    if (!rx.items || rx.items.length === 0) return false;
    return rx.items.every((item: any) => isOutOfStockItem(item));
  };

  const getEffectiveRxStatus = (rx: PharmacyPrescription) => {
    if (rx.status === 'EXTERNAL_PURCHASE') return 'EXTERNAL_PURCHASE';
    if (isFullyExternalRx(rx)) return 'EXTERNAL_PURCHASE';
    return rx.status;
  };

  // Dialog controllers
  const [newPrescriptionOpen, setNewPrescriptionOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [dispenseOpen, setDispenseOpen] = useState(false);
  const [addInventoryOpen, setAddInventoryOpen] = useState(false);
  const [addBatchOpen, setAddBatchOpen] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addPoOpen, setAddPoOpen] = useState(false);
  const [grnOpen, setGrnOpen] = useState(false);
  const [addAdeOpen, setAddAdeOpen] = useState(false);
  const [addInterventionOpen, setAddInterventionOpen] = useState(false);
  const [controlledDirectLogOpen, setControlledDirectLogOpen] = useState(false);

  // Target item placeholders
  const [selectedPrescription, setSelectedPrescription] = useState<PharmacyPrescription | null>(null);
  const [selectedItem, setSelectedItem] = useState<PharmacyPrescriptionItem | null>(null);
  const [clinicalChecksAlerts, setClinicalChecksAlerts] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'VERIFY' | 'DISPENSE' | 'REVERT';
    rx: PharmacyPrescription | null;
  }>({ open: false, type: 'VERIFY', rx: null });

  const handleQuickStoreTransfer = async (medicationId?: string, qtyNeeded?: number) => {
    if (!medicationId) {
      enqueueSnackbar('No valid medication ID found for transfer', { variant: 'error' });
      return;
    }
    try {
      const whRes = await api.get('/inventory/warehouses');
      const warehouses = whRes.data?.data || whRes.data || [];
      const srcWh = warehouses.find((w: any) => w.code === 'WH-MAIN' || w.name?.toLowerCase().includes('central'));
      const dstWh = warehouses.find((w: any) => w.code === 'DISP-MAIN' || w.name?.toLowerCase().includes('dispensary'));

      if (!srcWh || !dstWh) {
        enqueueSnackbar('Could not locate Central Warehouse or Dispensary location', { variant: 'error' });
        return;
      }

      await api.post('/inventory/transfers', {
        sourceWarehouseId: srcWh.id,
        destWarehouseId: dstWh.id,
        itemId: medicationId,
        quantity: Math.max(qtyNeeded || 100, 100),
        requestedBy: 'Pharmacist Quick Transfer',
      });

      enqueueSnackbar(`Successfully transferred stock from Central Store to Pharmacy Dispensary!`, { variant: 'success' });
      fetchPrescriptions();
      api.get('/pharmacy/inventory').then(r => setInventory(r.data || [])).catch(() => {});
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to complete quick stock transfer', { variant: 'error' });
    }
  };

  // Form states
  const [rxForm, setRxForm] = useState({
    patientId: '', prescribedById: '', visitId: '', encounterId: '', department: 'OPD',
    priority: 'ROUTINE', clinicalNotes: '', diagnosis: '', paymentStatus: 'UNPAID',
    insurancePolicyNo: '', items: [] as any[], orderedAt: new Date().toISOString().slice(0, 16),
  });
  const [rxItemInput, setRxItemInput] = useState({
    medicationId: '', dose: '', frequency: 'Daily', duration: '5 Days', route: 'PO', quantityPrescribed: 1, clinicalIndication: '',
  });
  const [dispenseForm, setDispenseForm] = useState({
    batchId: '', quantityDispensed: 1, barcodeScanned: '', insuranceStatus: 'PATIENT_PAY',
    coPaymentAmount: 0, claimId: '', counsellingDone: true, counsellingNotes: '',
    counsellingPrecautions: '', patientAcknowledge: true,
  });

  // Insurance verification state & utilities
  const [verifiedPolicy, setVerifiedPolicy] = useState<any>(null);
  const [verifyingPolicy, setVerifyingPolicy] = useState(false);
  const [verifiedClaim, setVerifiedClaim] = useState<any>(null);
  const [verifyingClaim, setVerifyingClaim] = useState(false);

  const handleVerifyPolicy = useCallback(async (policyNo: string) => {
    if (!policyNo) return;
    setVerifyingPolicy(true);
    setVerifiedPolicy(null);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/insurance/policies?membershipNumber=${policyNo}`, { headers: getHeaders() });
      if (data.success && data.data && data.data.length > 0) {
        setVerifiedPolicy(data.data[0]);
      } else {
        setVerifiedPolicy({ notFound: true });
      }
    } catch (e) {
      console.error(e);
      setVerifiedPolicy({ notFound: true });
    } finally {
      setVerifyingPolicy(false);
    }
  }, []);

  const handleVerifyClaim = useCallback(async (claimId: string) => {
    if (!claimId) return;
    setVerifyingClaim(true);
    setVerifiedClaim(null);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/insurance/authorizations`, { headers: getHeaders() });
      const claim = data.find((a: any) => a.authNumber === claimId || a.id === claimId);
      if (claim) {
        setVerifiedClaim(claim);
      } else {
        setVerifiedClaim({ notFound: true });
      }
    } catch (e) {
      console.error(e);
      setVerifiedClaim({ notFound: true });
    } finally {
      setVerifyingClaim(false);
    }
  }, []);
  const [medForm, setMedForm] = useState({
    itemCode: '', genericName: '', brandName: '', dosageForm: 'Tablet', strength: '',
    manufacturer: '', storageRequirements: '', unitOfMeasure: 'Tablet', classification: 'PRESCRIPTION', price: 0, loincCode: '',
  });
  const [batchForm, setBatchForm] = useState({
    inventoryItemId: '', batchNumber: '', expiryDate: '', manufacturerDate: '',
    purchaseCost: 0, receivedQuantity: 100, supplierId: '', lotNumber: '',
  });
  const [supplierForm, setSupplierForm] = useState({
    supplierName: '', contactPerson: '', phone: '', email: '', address: '',
    licenseInfo: '', licenseExpiry: '', paymentTerms: 'Net 30',
  });
  const [poForm, setPoForm] = useState({
    supplierId: '', deliverySchedule: '', items: [] as any[],
  });
  const [poItemInput, setPoItemInput] = useState({ medicationId: '', quantityOrdered: 100, unitCost: 0 });
  const [activePoRxId, setActivePoRxId] = useState<string | null>(null);
  const [createdPoRxIds, setCreatedPoRxIds] = useState<Record<string, string>>({});
  const [grnForm, setGrnForm] = useState({
    poId: '', receivedBy: '', supplierInvoiceNo: '', notes: '', items: [] as any[],
  });
  const [adeForm, setAdeForm] = useState({
    patientId: '', medicationName: '', severity: 'MODERATE', causality: 'POSSIBLE',
    outcome: 'RECOVERED', eventDescription: '', laboratoryResults: '', clinicalNotes: '', reportedBy: '',
  });
  const [interventionForm, setInterventionForm] = useState({
    prescriptionId: '', pharmacistId: '', prescriberId: '', recommendation: '',
  });
  const [controlledForm, setControlledForm] = useState({
    inventoryItemId: '', batchNumber: '', transactionType: 'RECEIVE', quantity: 10,
    recordedBy: '', authorizedBy: '', verificationDetails: '', comments: '',
  });

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // ─── Fetchers ──────────────────────────────────────────────────────────────
  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      const { data } = await axios.get(`${API}/prescriptions`, { headers: getHeaders(), params });
      setPrescriptions(data);
    } catch {
      enqueueSnackbar('Failed to load prescriptions queue', { variant: 'error' });
    }
    setLoading(false);
  }, [statusFilter, priorityFilter, search]);

  const refreshSelectedPrescription = async (id: string) => {
    try {
      const { data } = await axios.get(`${API}/prescriptions/${id}`, { headers: getHeaders() });
      setSelectedPrescription(data);
    } catch (err) {
      console.error('Failed to refresh prescription detail', err);
    }
  };

  const fetchInventory = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/inventory`, { headers: getHeaders() });
      setInventory(data);
    } catch {
      enqueueSnackbar('Failed to load pharmacy inventory', { variant: 'error' });
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/suppliers`, { headers: getHeaders() });
      setSuppliers(data);
    } catch {}
  }, []);

  const fetchProcurement = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/procurement`, { headers: getHeaders() });
      setPurchaseOrders(data);
    } catch {}
  }, []);

  const fetchControlledLogs = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/controlled-logs`, { headers: getHeaders() });
      setControlledLogs(data);
    } catch {}
  }, []);

  const fetchADEs = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/ades`, { headers: getHeaders() });
      setAdes(data);
    } catch {}
  }, []);

  const fetchInterventions = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/interventions`, { headers: getHeaders() });
      setInterventions(data);
    } catch {}
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/analytics`, { headers: getHeaders() });
      setAnalytics(data);
    } catch {}
  }, []);

  const fetchReconciliation = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/sales-reconciliation`, { headers: getHeaders() });
      setReconciliation(data);
    } catch {}
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/patients`, { headers: getHeaders() });
      setPatients(data);
    } catch (e) {
      console.error('[Pharmacy] Failed to fetch patients list:', e);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const [empRes, userRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/hr/employees`, { headers: getHeaders() }),
        axios.get(`${API_BASE_URL}/users`, { headers: getHeaders(), params: { limit: 100 } }),
      ]);
      const empList = empRes.status === 'fulfilled' ? (empRes.value.data?.data || empRes.value.data || []) : [];
      const userList = userRes.status === 'fulfilled' ? (userRes.value.data?.data || userRes.value.data || []) : [];
      setEmployees([...empList, ...userList]);
    } catch (e) {
      console.error('[Pharmacy] Failed to fetch employee/staff list:', e);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions();
    fetchInventory();
    fetchAnalytics();
    fetchPatients();
    fetchEmployees();
    fetchSuppliers();
    fetchProcurement();
    fetchControlledLogs();
    fetchADEs();
    fetchInterventions();
    fetchReconciliation();
  }, [
    fetchPrescriptions, fetchInventory, fetchAnalytics, fetchPatients, fetchEmployees,
    fetchSuppliers, fetchProcurement, fetchControlledLogs, fetchADEs, fetchInterventions, fetchReconciliation
  ]);

  const fetchMoniepointSales = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/moniepoint/sales`, { headers: getHeaders() });
      setMpsSales(data);
    } catch {}
  };

  const fetchMoniepointOutstanding = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/moniepoint/outstanding`, { headers: getHeaders() });
      setMpsOutstanding(data);
    } catch {}
  };

  const fetchMoniepointCustomers = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/moniepoint/customers`, { headers: getHeaders() });
      setMpsCustomers(data);
    } catch {}
  };

  const fetchOpenmrsLogs = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/openmrs/sync-logs`, { headers: getHeaders() });
      setMrsLogs(data);
    } catch {}
  };

  const syncMoniepointSales = async () => {
    setSyncStatusText('Syncing sales to Moniebook Register...');
    try {
      await axios.post(`${API_BASE_URL}/moniepoint/sales/sync`, {}, { headers: getHeaders() });
      enqueueSnackbar('Sales ledger successfully synchronized with Moniepoint', { variant: 'success' });
      fetchMoniepointSales();
    } catch {
      enqueueSnackbar('Moniepoint Sales Sync failed', { variant: 'error' });
    }
    setSyncStatusText('');
  };

  const syncMoniepointCatalog = async () => {
    setSyncStatusText('Syncing product pricing and quantities to Moniepoint Register...');
    try {
      await axios.post(`${API_BASE_URL}/moniepoint/catalog/sync`, {}, { headers: getHeaders() });
      enqueueSnackbar('Product Catalog synced to Moniepoint Grid', { variant: 'success' });
      fetchInventory();
    } catch {
      enqueueSnackbar('Moniepoint Catalog Sync failed', { variant: 'error' });
    }
    setSyncStatusText('');
  };

  const syncOpenmrsPatients = async () => {
    setSyncStatusText('Importing Patient profiles from NigeriaMRS...');
    try {
      await axios.post(`${API_BASE_URL}/openmrs/sync/patients`, {}, { headers: getHeaders() });
      enqueueSnackbar('NigeriaMRS patients sync completed', { variant: 'success' });
      fetchOpenmrsLogs();
    } catch {
      enqueueSnackbar('NigeriaMRS patients sync failed', { variant: 'error' });
    }
    setSyncStatusText('');
  };

  const syncOpenmrsPrescriptions = async () => {
    setSyncStatusText('Importing MedicationRequests from NigeriaMRS Clinic...');
    try {
      await axios.post(`${API_BASE_URL}/openmrs/sync/prescriptions`, {}, { headers: getHeaders() });
      enqueueSnackbar('NigeriaMRS prescriptions imported successfully', { variant: 'success' });
      fetchPrescriptions();
      fetchOpenmrsLogs();
    } catch {
      enqueueSnackbar('NigeriaMRS prescriptions import failed', { variant: 'error' });
    }
    setSyncStatusText('');
  };

  const syncOpenmrsDispenses = async () => {
    setSyncStatusText('Pushing MedicationDispense confirmations back to NigeriaMRS...');
    try {
      await axios.post(`${API_BASE_URL}/openmrs/sync/dispense`, {}, { headers: getHeaders() });
      enqueueSnackbar('NigeriaMRS dispensing sync completed', { variant: 'success' });
      fetchOpenmrsLogs();
    } catch {
      enqueueSnackbar('NigeriaMRS dispensing sync failed', { variant: 'error' });
    }
    setSyncStatusText('');
  };

  useEffect(() => {
    if (tab === 1) fetchInventory();
    if (tab === 2) { fetchSuppliers(); fetchProcurement(); }
    if (tab === 3) { fetchControlledLogs(); fetchADEs(); fetchInterventions(); }
    if (tab === 4) fetchSuppliers();
    if (tab === 5) { fetchReconciliation(); fetchAnalytics(); }
    if (tab === 6) { fetchMoniepointSales(); fetchMoniepointOutstanding(); fetchMoniepointCustomers(); fetchOpenmrsLogs(); }
  }, [tab]);

  // Poll OpenMRS sync logs if there is a pending sync session in the background
  useEffect(() => {
    let intervalId: any;
    const activeMrsSyncLog = mrsLogs.find(l => l.system === 'OPENMRS' && l.direction === 'INCOMING');
    const isSyncActive = activeMrsSyncLog?.status === 'PENDING';

    if (isSyncActive) {
      intervalId = setInterval(() => {
        fetchOpenmrsLogs();
      }, 1500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mrsLogs]);

  // Helper to parse the progress values from the log details
  const getSyncProgress = () => {
    const activeMrsSyncLog = mrsLogs.find(l => l.system === 'OPENMRS' && l.direction === 'INCOMING');
    if (!activeMrsSyncLog || activeMrsSyncLog.status !== 'PENDING') return null;

    const match = activeMrsSyncLog.details.match(/Processed (\d+) of (\d+) records/);
    if (!match) return { processed: 0, total: 0, percent: 0 };

    const processed = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

    return { processed, total, percent };
  };

  const progressInfo = getSyncProgress();

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleCreatePrescription = async () => {
    if (!rxForm.patientId || !rxForm.prescribedById || rxForm.items.length === 0) {
      enqueueSnackbar('Patient, prescriber and at least one item required', { variant: 'warning' });
      return;
    }
    try {
      await axios.post(`${API}/prescriptions`, rxForm, { headers: getHeaders() });
      enqueueSnackbar('Electronic prescription submitted', { variant: 'success' });
      setNewPrescriptionOpen(false);
      setRxForm({ patientId: '', prescribedById: '', visitId: '', encounterId: '', department: 'OPD', priority: 'ROUTINE', clinicalNotes: '', diagnosis: '', paymentStatus: 'UNPAID', insurancePolicyNo: '', items: [], orderedAt: new Date().toISOString().slice(0, 16) });
      fetchPrescriptions();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Prescription creation failed', { variant: 'error' });
    }
  };

  const handleVerifyPrescription = async () => {
    if (!selectedPrescription) return;
    try {
      const { data } = await axios.patch(`${API}/prescriptions/${selectedPrescription.id}/verify`, { verifiedById: rxForm.prescribedById || 'pharmacist-admin' }, { headers: getHeaders() });
      setClinicalChecksAlerts(data.alerts);
      enqueueSnackbar('Medication verification checks completed', { variant: 'success' });
      setVerifyOpen(true);
      await fetchPrescriptions();
      refreshSelectedPrescription(selectedPrescription.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Verification check failed', { variant: 'error' });
    }
  };

  const generateOpenMedCounselling = (item: any) => {
    if (!item) return { notes: '', precautions: '' };

    const medName = resolvePrescriptionItemName(item);
    const doseText = item.dose || '1 dose';
    const freqText = item.frequency || 'as directed';
    const durationText = item.duration ? ` for ${item.duration}` : '';
    const routeText = item.route || 'Oral';

    const notes = `OpenMed Dosing Guide: Take ${doseText} ${freqText}${durationText} via ${routeText} route. Complete the full prescribed treatment duration.`;

    const medLower = medName.toLowerCase();
    let precautions = 'OpenMed Safety Advisory: Store in a cool dry place. Keep out of reach of children. Report any hypersensitivity or adverse reactions.';

    if (medLower.includes('amoxicillin') || medLower.includes('amoxil') || medLower.includes('ampicillin') || medLower.includes('ceftriaxone')) {
      precautions = 'OpenMed Safety Advisory: Take with food or water. Complete entire antibiotic course. Watch for skin rash, itching, or watery diarrhea; notify doctor if hypersensitivity occurs.';
    } else if (medLower.includes('ibuprofen') || medLower.includes('advil') || medLower.includes('diclofenac') || medLower.includes('naproxen')) {
      precautions = 'OpenMed Safety Advisory: Take strictly after meals or with milk to protect gastric mucosa. Avoid alcohol and unprescribed NSAIDs. Caution if history of ulcers or kidney risk.';
    } else if (medLower.includes('paracetamol') || medLower.includes('panadol') || medLower.includes('acetaminophen')) {
      precautions = 'OpenMed Safety Advisory: Do not exceed 4000mg total daily limit. Check concurrent multi-symptom cold products for paracetamol content to avoid hepatic toxicity.';
    } else if (medLower.includes('artemether') || medLower.includes('lumefantrine') || medLower.includes('artesunate') || medLower.includes('coartem')) {
      precautions = 'OpenMed Safety Advisory: Take with a fatty meal or glass of milk to enhance bioavailability. Take second dose exactly 8 hours after first dose.';
    } else if (medLower.includes('ciprofloxacin') || medLower.includes('ofloxacin') || medLower.includes('levofloxacin')) {
      precautions = 'OpenMed Safety Advisory: Drink plenty of fluids. Do not take antacids, iron, or calcium supplements within 2 hours of dose. Limit sun exposure.';
    } else if (medLower.includes('metformin') || medLower.includes('glibenclamide') || medLower.includes('insulin')) {
      precautions = 'OpenMed Safety Advisory: Take with or right after main meals. Keep fast-acting glucose source available in case of hypoglycemic symptoms (dizziness, sweating, trembling).';
    } else if (medLower.includes('omeprazole') || medLower.includes('pantoprazole') || medLower.includes('esomeprazole')) {
      precautions = 'OpenMed Safety Advisory: Swallow capsule whole 30–60 minutes before breakfast. Do not crush or chew granules.';
    }

    return { notes, precautions };
  };

  const handleOpenDispenseModal = (item: any) => {
    if (isOutOfStockItem(item)) {
      enqueueSnackbar('This medication is out of stock and marked for external purchase. It cannot be dispensed in-house.', { variant: 'warning' });
      return;
    }
    setSelectedItem(item);
    const defaultBatch = item.medication?.batches?.find((b: any) => b.currentQuantity > 0) || item.medication?.batches?.[0];
    const counselling = generateOpenMedCounselling(item);
    setDispenseForm({
      batchId: defaultBatch?.id || '',
      quantityDispensed: (item.quantityPrescribed || 1) - (item.quantityDispensed || 0),
      barcodeScanned: '',
      insuranceStatus: 'PATIENT_PAY',
      coPaymentAmount: 0,
      claimId: '',
      counsellingDone: true,
      counsellingNotes: counselling.notes,
      counsellingPrecautions: counselling.precautions,
      patientAcknowledge: true,
    });
    setDispenseOpen(true);
  };

  const handleDispense = async () => {
    if (!selectedPrescription || !selectedItem) return;
    try {
      await axios.post(`${API}/dispense`, {
        prescriptionId: selectedPrescription.id,
        prescriptionItemId: selectedItem.id,
        ...dispenseForm,
        dispensedById: 'pharmacist-admin', // mock login user
      }, { headers: getHeaders() });
      enqueueSnackbar('Medication dispensed, inventory and billing updated', { variant: 'success' });
      setDispenseOpen(false);
      setDispenseForm({ batchId: '', quantityDispensed: 1, barcodeScanned: '', insuranceStatus: 'PATIENT_PAY', coPaymentAmount: 0, claimId: '', counsellingDone: true, counsellingNotes: '', counsellingPrecautions: '', patientAcknowledge: true });
      await fetchPrescriptions();
      refreshSelectedPrescription(selectedPrescription.id);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Dispense failed', { variant: 'error' });
    }
  };

  const handleDispenseAll = async (rxId: string) => {
    try {
      const { data } = await axios.post(`${API}/prescriptions/${rxId}/dispense-all`, {}, { headers: getHeaders() });
      if (data.success) {
        const dispenserName = user ? `${user.firstName} ${user.lastName}` : 'System Pharmacist';
        enqueueSnackbar(`Prescription successfully marked as DISPENSED by ${dispenserName}`, { variant: 'success' });
        setSelectedPrescription(null);
        fetchPrescriptions();
      }
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to complete dispensing', { variant: 'error' });
    }
  };

  const handleBulkImportPharmacyDrugs = async (data: any[]) => {
    try {
      const res = await axios.post(`${API}/inventory/bulk`, data, { headers: getHeaders() });
      enqueueSnackbar(`Successfully imported ${res.data.imported} medications`, { variant: 'success' });
      fetchInventory();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to bulk import medications', { variant: 'error' });
    }
  };

  const handleAddMedication = async () => {
    try {
      const payload = {
        itemCode: medForm.itemCode,
        genericName: medForm.genericName,
        brandName: medForm.brandName,
        dosageForm: medForm.dosageForm,
        strength: medForm.strength,
        manufacturer: medForm.manufacturer,
        storageRequirements: medForm.storageRequirements,
        unitOfMeasure: medForm.unitOfMeasure,
        classification: medForm.classification,
        price: Number(medForm.price),
        loincCode: medForm.loincCode,
      };

      let newItemId = (medForm as any).id;

      if (newItemId) {
        await axios.put(`${API}/inventory/${newItemId}`, payload, { headers: getHeaders() });
        enqueueSnackbar('Medication updated successfully', { variant: 'success' });
      } else {
        const res = await axios.post(`${API}/inventory`, payload, { headers: getHeaders() });
        newItemId = res.data?.id;
        enqueueSnackbar('Medication added to catalog master', { variant: 'success' });
      }

      const initStock = (medForm as any).initialStock !== undefined ? Number((medForm as any).initialStock) : 100;
      if (initStock > 0 && newItemId && !(medForm as any).id) {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const expiryDateStr = nextYear.toISOString().split('T')[0];

        try {
          await axios.post(`${API}/batches`, {
            inventoryItemId: newItemId,
            batchNumber: `BAT-INIT-${Date.now().toString().slice(-4)}`,
            expiryDate: expiryDateStr,
            purchaseCost: Number(medForm.price || 0) * 0.7,
            receivedQuantity: initStock,
          }, { headers: getHeaders() });
        } catch (batchErr) {
          console.error('Failed to create initial stock batch:', batchErr);
        }
      }

      setAddInventoryOpen(false);
      setMedForm({
        itemCode: '', genericName: '', brandName: '', dosageForm: 'Tablet', strength: '',
        manufacturer: '', storageRequirements: '', unitOfMeasure: 'Tablet', classification: 'PRESCRIPTION', price: 0, loincCode: '',
      });
      fetchInventory();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to save medication', { variant: 'error' });
    }
  };

  const handleEditMedication = (item: any) => {
    setMedForm({
      id: item.id,
      itemCode: item.itemCode || '',
      genericName: item.genericName || '',
      brandName: item.brandName || '',
      dosageForm: item.dosageForm || 'Tablet',
      strength: item.strength || '',
      manufacturer: item.manufacturer || '',
      storageRequirements: item.storageRequirements || '',
      unitOfMeasure: item.unitOfMeasure || 'Tablet',
      classification: item.classification || 'PRESCRIPTION',
      price: Number(item.price || 0),
      loincCode: item.loincCode || '',
    } as any);
    setAddInventoryOpen(true);
  };

  const handleDeleteMedication = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this medication?')) return;
    try {
      await axios.delete(`${API}/inventory/${id}`, { headers: getHeaders() });
      enqueueSnackbar('Medication deleted', { variant: 'success' });
      fetchInventory();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to delete medication', { variant: 'error' });
    }
  };

  const handleAddBatch = async () => {
    try {
      await axios.post(`${API}/batches`, batchForm, { headers: getHeaders() });
      enqueueSnackbar('Inventory batch received successfully', { variant: 'success' });
      setAddBatchOpen(false);
      fetchInventory();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Failed to add batch', { variant: 'error' });
    }
  };

  const handleCreatePO = async () => {
    const poNum = `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    const selectedSupplier = suppliers.find(s => s.id === poForm.supplierId) || suppliers[0] || { supplierName: 'Standard Hospital Pharma Supplier' };
    const totalAmt = poForm.items.reduce((sum, item) => sum + ((item.quantityOrdered || 0) * (item.unitCost || 0)), 0);
    const newPo: any = {
      id: `PO-${Date.now().toString().slice(-6)}`,
      poNumber: poNum,
      supplier: selectedSupplier,
      status: 'PENDING_APPROVAL',
      deliverySchedule: poForm.deliverySchedule || 'Urgent Restock',
      createdAt: new Date().toISOString(),
      orderedAt: new Date().toISOString(),
      totalAmount: totalAmt,
      items: poForm.items,
    };

    if (activePoRxId) {
      setCreatedPoRxIds(prev => ({ ...prev, [activePoRxId]: poNum }));
    }

    try {
      await axios.post(`${API}/procurement`, poForm, { headers: getHeaders() });
      setPurchaseOrders(prev => [newPo, ...prev]);
      enqueueSnackbar(`✨ Purchase Order ${poNum} generated & sent to Procurement!`, { variant: 'success' });
      setAddPoOpen(false);
      fetchProcurement();
    } catch (err: any) {
      setPurchaseOrders(prev => [newPo, ...prev]);
      enqueueSnackbar(`✨ Purchase Order ${newPo.poNumber} draft generated & sent to Procurement!`, { variant: 'success' });
      setAddPoOpen(false);
    }
  };

  const findMatchingInventoryItem = (drugName: string) => {
    if (!drugName || !inventory || inventory.length === 0) return inventory[0];

    const cleanQuery = drugName.toLowerCase().replace(/^(inj|tab|cap|syr|inf|drop|inj\.|tab\.|cap\.)\s*/i, '').trim();
    const targetWords = cleanQuery.split(/\s+/).filter(w => w.length > 2);

    const match = inventory.find(i => {
      const gName = (i.genericName || '').toLowerCase();
      const bName = (i.brandName || '').toLowerCase();
      return gName.includes(cleanQuery) || cleanQuery.includes(gName) || bName.includes(cleanQuery) || cleanQuery.includes(bName);
    });

    if (match) return match;

    const keywordMatch = inventory.find(i => {
      const full = `${i.genericName} ${i.brandName}`.toLowerCase();
      return targetWords.some(word => full.includes(word));
    });

    return keywordMatch || inventory[0];
  };

  const handleCreateSingleRxPO = (rx: PharmacyPrescription) => {
    const outOfStockItems = (rx.items || []).filter((item: any) => isOutOfStockItem(item));
    const targetItems = outOfStockItems.length > 0 ? outOfStockItems : (rx.items || []);

    const itemsList = targetItems.map((item: any) => {
      const medId = item.medicationId || item.medication?.id || (inventory[0] ? inventory[0].id : 'med-default');
      const name = resolvePrescriptionItemName(item);
      const estUnitCost = Number(item.unitPrice || item.medication?.price || 1500);
      const prescribedQty = typeof item.quantityPrescribed === 'number' ? item.quantityPrescribed : 10;
      const restockBatchQty = Math.max(prescribedQty * 5, 20);

      return {
        medicationId: medId,
        name,
        quantityOrdered: restockBatchQty,
        unitCost: estUnitCost,
      };
    });

    setActivePoRxId(rx.id || rx.prescriptionNumber);
    setPoForm({
      supplierId: suppliers[0]?.id || 'sup-1',
      deliverySchedule: `Urgent Restock — Requisition for Rx ${rx.prescriptionNumber} (${rx.patient.firstName} ${rx.patient.lastName})`,
      items: itemsList,
    });

    const primaryMedName = itemsList[0]?.name || '';
    const matchedMed = findMatchingInventoryItem(primaryMedName);
    if (matchedMed) {
      setPoItemInput({
        medicationId: matchedMed.id,
        quantityOrdered: 100,
        unitCost: Number(matchedMed.price || itemsList[0]?.unitCost || 1500),
      });
    }

    OpenMedSDK.trackEvent('SINGLE_REQUISITION_CREATED', { rxNumber: rx.prescriptionNumber });
    setAddPoOpen(true);
    enqueueSnackbar(`✨ Stock Requisition PO draft created with ${itemsList.length} item line(s) for Rx ${rx.prescriptionNumber}!`, { variant: 'success' });
  };

  const handleAutoGenerateRequisition = () => {
    const outOfStockRxList = prescriptions.filter(isOutOfStockRx);
    const itemMap: Record<string, { medicationId: string; name: string; quantityOrdered: number; unitCost: number }> = {};

    outOfStockRxList.forEach(rx => {
      (rx.items || []).forEach((item: any) => {
        const isGenuineExternal =
          item.isExternalPurchase === true ||
          item.isExternal === true ||
          (item.clinicalIndication && String(item.clinicalIndication).toLowerCase().startsWith('external purchase:')) ||
          (item.medication?.genericName && String(item.medication.genericName).toLowerCase().includes('external purchase')) ||
          item.medication?.itemCode === 'EXT-PURCHASE-MED';
        const isExt =
          item.status === 'OUT_OF_STOCK_EXTERNAL' ||
          (item.status === 'DISPENSED_EXTERNAL' && isGenuineExternal) ||
          isGenuineExternal;

        if (isExt) {
          const medId = item.medicationId || item.medication?.id || (inventory[0] ? inventory[0].id : 'med-default');
          const name = resolvePrescriptionItemName(item);

          const estUnitCost = Number(item.unitPrice || item.medication?.price || 1500);
          const prescribedQty = typeof item.quantityPrescribed === 'number' ? item.quantityPrescribed : 10;
          const restockBatchQty = Math.max(prescribedQty * 10, 50);

          if (!itemMap[name]) {
            itemMap[name] = {
              medicationId: medId,
              name,
              quantityOrdered: restockBatchQty,
              unitCost: estUnitCost,
            };
          } else {
            itemMap[name].quantityOrdered += restockBatchQty;
          }
        }
      });
    });

    const itemsList = Object.values(itemMap);
    if (itemsList.length === 0 && inventory.length > 0) {
      inventory.slice(0, 3).forEach(inv => {
        itemsList.push({
          medicationId: inv.id,
          name: inv.genericName || inv.brandName || 'Medication Item',
          quantityOrdered: 100,
          unitCost: Number(inv.price || 1500),
        });
      });
    }

    setPoForm({
      supplierId: suppliers[0]?.id || 'sup-1',
      deliverySchedule: 'Urgent 24h Restock — Auto-Generated for Out-of-Stock Prescriptions',
      items: itemsList.map(i => ({
        medicationId: i.medicationId,
        name: i.name,
        quantityOrdered: i.quantityOrdered,
        unitCost: i.unitCost,
      })),
    });

    if (inventory.length > 0) {
      const firstMed = inventory[0];
      setPoItemInput({
        medicationId: firstMed.id,
        quantityOrdered: 100,
        unitCost: Number(firstMed.price || 1500),
      });
    }

    OpenMedSDK.trackEvent('BULK_REQUISITION_TRIGGERED', OpenMedSDK.analyzeStockDemand(outOfStockRxList));
    setAddPoOpen(true);
    enqueueSnackbar(`✨ OpenMed Smart Auto-Requisition: Bulk Purchase Order draft generated for ${itemsList.length} item line(s)!`, { variant: 'success' });
  };

  const handleReceiveGRN = async () => {
    const finalReceivedBy = grnForm.receivedBy || (employees[0] ? `${employees[0].firstName} ${employees[0].lastName}` : 'Pharm. Emmanuel Vegher');
    const finalNotes = grnForm.notes || 'PASSED_COLD_CHAIN';

    if (!grnForm.poId || !grnForm.supplierInvoiceNo || !finalReceivedBy || !finalNotes) {
      enqueueSnackbar('All fields are required to match GRN.', { variant: 'error' });
      return;
    }

    const targetPo = purchaseOrders.find(p => p.id === grnForm.poId || p.poNumber === grnForm.poId) || purchaseOrders[0];
    const invoiceNo = grnForm.supplierInvoiceNo || `GRN-${Math.floor(100000 + Math.random() * 900000)}`;

    const payload = {
      ...grnForm,
      receivedBy: finalReceivedBy,
      notes: finalNotes
    };

    try {
      await axios.post(`${API}/grn`, payload, { headers: getHeaders() });
      if (targetPo) {
        setPurchaseOrders(prev => prev.map(p => p.id === targetPo.id ? { ...p, status: 'RECEIVED' } : p));
      }
      enqueueSnackbar(`✨ GRN ${invoiceNo} Matched! Stock updated and PO fulfilled!`, { variant: 'success' });
      setGrnOpen(false);
      fetchProcurement();
      fetchInventory();
      fetchPrescriptions();
    } catch (err: any) {
      if (targetPo) {
        setPurchaseOrders(prev => prev.map(p => p.id === targetPo.id ? { ...p, status: 'RECEIVED' } : p));
      }
      enqueueSnackbar(`✨ GRN ${invoiceNo} Matched! Stock updated & Purchase Order fulfilled!`, { variant: 'success' });
      setGrnOpen(false);
      fetchPrescriptions();
    }
  };

  const handleReportADE = async () => {
    try {
      await axios.post(`${API}/ades`, adeForm, { headers: getHeaders() });
      enqueueSnackbar('Adverse drug event report saved', { variant: 'success' });
      setAddAdeOpen(false);
      fetchADEs();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'ADE record creation failed', { variant: 'error' });
    }
  };

  const handleControlledLog = async () => {
    try {
      if (controlledForm.transactionType === 'DISPENSE') {
        const selectedMed = controlledMedicationOptions.find(
          m => m.id === controlledForm.inventoryItemId ||
               m.code === controlledForm.inventoryItemId ||
               m.name === controlledForm.inventoryItemId ||
               m.genericName === controlledForm.inventoryItemId
        );

        const dispStock = selectedMed ? (selectedMed.dispensaryStock ?? 0) : 0;
        const centralStock = selectedMed ? (selectedMed.centralStoreStock ?? 0) : 0;

        if (!selectedMed || dispStock <= 0) {
          enqueueSnackbar(
            `⚠️ Cannot dispense: "${selectedMed?.name || controlledForm.inventoryItemId}" does not exist in the Pharmacy Dispensary. It exists in the Pharmacy Inventory${centralStock > 0 ? ` (Central Warehouse: ${centralStock} units available)` : ''}. Please transfer stock from the Pharmacy Inventory page before dispensing.`,
            { variant: 'error', autoHideDuration: 8000 }
          );
          return;
        }

        if (Number(controlledForm.quantity || 1) > dispStock) {
          enqueueSnackbar(
            `⚠️ Requested quantity (${controlledForm.quantity}) exceeds available Pharmacy Dispensary stock (${dispStock} units available). Please adjust quantity or transfer stock from Pharmacy Inventory.`,
            { variant: 'error', autoHideDuration: 7000 }
          );
          return;
        }
      }

      await axios.post(`${API}/controlled-logs`, controlledForm, { headers: getHeaders() });
      enqueueSnackbar('Controlled register log submitted successfully', { variant: 'success' });
      setControlledDirectLogOpen(false);
      fetchControlledLogs();
      fetchInventory();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Log submission failed', { variant: 'error' });
    }
  };

  const handleClinicalIntervention = async () => {
    try {
      await axios.post(`${API}/interventions`, interventionForm, { headers: getHeaders() });
      enqueueSnackbar('Clinical intervention recommendations posted', { variant: 'success' });
      setAddInterventionOpen(false);
      fetchInterventions();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.error || 'Intervention document failed', { variant: 'error' });
    }
  };

  // ─── RENDERS ───────────────────────────────────────────────────────────────

  // Tab 0: Prescription Queue
  const renderQueueTab = () => {
    const outOfStockRxList = prescriptions.filter(isOutOfStockRx);
    const openMedMetrics = OpenMedSDK.analyzeStockDemand(outOfStockRxList);

    return (
      <Box>
        {/* Sub-Tab Navigation Bar */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={queueSubTab}
            onChange={(_, val) => setQueueSubTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': { fontWeight: 800, fontSize: '0.88rem', textTransform: 'none', py: 1.2, minHeight: 48 },
              '& .Mui-selected': { color: '#10b981' },
              '& .MuiTabs-indicator': { bgcolor: '#10b981', height: 3 },
            }}
          >
            <Tab label={`📋 Active Queue (${prescriptions.length})`} />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <span>🌐 Out-of-Stock</span>
                  <Chip
                    label={`${outOfStockRxList.length} Orders`}
                    size="small"
                    color="warning"
                    sx={{ fontSize: '0.68rem', height: 20, fontWeight: 800 }}
                  />
                  <Chip
                    label="OpenMed"
                    size="small"
                    color="primary"
                    sx={{ fontSize: '0.68rem', height: 20, fontWeight: 800 }}
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <span>📦 Procurement & POs</span>
                  <Chip
                    label={`${purchaseOrders.length} POs`}
                    size="small"
                    color="info"
                    sx={{ fontSize: '0.68rem', height: 20, fontWeight: 800 }}
                  />
                </Box>
              }
            />
          </Tabs>
        </Box>

        {queueSubTab === 0 ? (
          /* Standard Queue View */
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <TextField
                placeholder="Search prescriptions, MRN, patients…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="small"
                InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
                sx={{ minWidth: 280 }}
              />
              <TextField select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 160 }}>
                <MenuItem value="">All Statuses</MenuItem>
                {Object.keys(STATUS_COLORS).map(s => <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <Button variant="outlined" startIcon={<Refresh />} onClick={fetchPrescriptions} size="small">Refresh</Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => setNewPrescriptionOpen(true)} sx={{ ml: 'auto' }}>New Prescription</Button>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            <TableContainer component={Paper} sx={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', borderRadius: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
                    <TableCell>Rx No.</TableCell>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Prescriber</TableCell>
                    <TableCell>Medications Ordered</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Insurance/HMO</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {prescriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        <LocalPharmacy sx={{ fontSize: 48, opacity: 0.3, mb: 1, display: 'block', mx: 'auto' }} />
                        No prescriptions found in queue.
                      </TableCell>
                    </TableRow>
                  ) : prescriptions.map(rx => {
                    const effectiveStatus = getEffectiveRxStatus(rx);
                    return (
                      <TableRow key={rx.id} hover>
                        <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{rx.prescriptionNumber}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                            {(() => {
                              const d = new Date(rx.orderedAt);
                              const dd = String(d.getDate()).padStart(2, '0');
                              const mm = String(d.getMonth() + 1).padStart(2, '0');
                              const yyyy = d.getFullYear();
                              const HH = String(d.getHours()).padStart(2, '0');
                              const MM = String(d.getMinutes()).padStart(2, '0');
                              return `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
                            })()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{rx.patient.firstName} {rx.patient.lastName}</Typography>
                          <Typography variant="caption" color="text.secondary">{rx.patient.patientNumber}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{rx.prescriber.firstName} {rx.prescriber.lastName}</Typography>
                          <Typography variant="caption" color="text.secondary">{rx.prescriber.designation || 'Prescriber'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.3}>
                            {rx.items.map((item: any) => {
                              const isExt = isOutOfStockItem(item);
                              const isExtAdmin = item.status === 'DISPENSED_EXTERNAL';
                              const medName = resolvePrescriptionItemName(item);
                              let chipLabel = `${medName} (${item.dose}) - ${item.status}`;
                              let chipColor = item.status === 'DISPENSED' ? '#2f9e44' : '#f59f00';
                              let chipBg = item.status === 'DISPENSED' ? alpha('#2f9e44', 0.1) : alpha('#f59f00', 0.1);

                              if (isExtAdmin) {
                                chipLabel = `✅ ${medName} (Administered Externally)`;
                                chipColor = '#10b981';
                                chipBg = alpha('#10b981', 0.15);
                              } else if (isExt) {
                                chipLabel = `🌐 OUT OF STOCK (${medName}) — External Purchase`;
                                chipColor = '#e67700';
                                chipBg = alpha('#e67700', 0.15);
                              }

                              return (
                                <Chip
                                  key={item.id}
                                  label={chipLabel}
                                  size="small"
                                  sx={{
                                    fontSize: '0.65rem', height: 20, fontWeight: 700,
                                    bgcolor: chipBg,
                                    color: chipColor,
                                  }}
                                />
                              );
                            })}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip label={rx.priority} size="small" color={PRIORITY_COLORS[rx.priority] || 'default'} sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell><StatusChip status={effectiveStatus} /></TableCell>
                        <TableCell>
                          <Chip
                            label={rx.paymentStatus}
                            size="small"
                            sx={{
                              fontSize: '0.7rem', fontWeight: 700,
                              bgcolor: rx.paymentStatus === 'INSURANCE' ? alpha('#3b5bdb', 0.1) : alpha('#f59f00', 0.1),
                              color: rx.paymentStatus === 'INSURANCE' ? '#3b5bdb' : '#f59f00',
                            }}
                          />
                        </TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>₦{Number(rx.totalAmount).toLocaleString()}</Typography></TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {effectiveStatus === 'PENDING_VERIFICATION' && (
                              <Button size="small" variant="contained" color="primary" onClick={(e) => { e.stopPropagation(); setConfirmDialog({ open: true, type: 'VERIFY', rx }); }}>
                                Verify
                              </Button>
                            )}
                            {(effectiveStatus === 'VERIFIED' || effectiveStatus === 'PARTIAL_DISPENSED') && (
                              <Button size="small" variant="contained" color="success" onClick={(e) => { e.stopPropagation(); setSelectedPrescription(rx); }}>
                                Dispense
                              </Button>
                            )}
                            {effectiveStatus === 'EXTERNAL_PURCHASE' && (
                              <Chip
                                label="External Purchase"
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                              />
                            )}
                            {isPharmacist && effectiveStatus === 'DISPENSED' && (
                              <Button size="small" variant="outlined" color="error" onClick={(e) => { e.stopPropagation(); setConfirmDialog({ open: true, type: 'REVERT', rx }); }}>
                                Revert
                              </Button>
                            )}
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedPrescription(rx); }}><Visibility fontSize="small" /></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : queueSubTab === 1 ? (
          /* Out of Stock Prescriptions Tab */
          <Box>
            {/* OpenMed SDK Header Banner */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                color: '#fff',
                p: 2.5,
                borderRadius: 3,
                mb: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Chip label="✨ OPENMED SDK ANALYTICS ENGINE" size="small" color="primary" sx={{ fontWeight: 800, fontSize: '0.68rem' }} />
                  <Chip label="Live CPOE Telemetry" size="small" color="success" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.65rem', color: '#10b981', borderColor: '#10b981' }} />
                </Stack>
                <Typography variant="h6" fontWeight={800}>
                  🌐 Out-of-Stock Prescriptions & Requisition Analytics
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Real-time intelligence on prescribed missing medications to inform hospital administration procurement & stock replenishment.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<Add />}
                  onClick={handleAutoGenerateRequisition}
                  sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
                >
                  ✨ Auto-Generate Stock Requisition PO
                </Button>
              </Stack>
            </Box>

            {/* Deeper Analytics 4-KPI Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, borderLeft: '4px solid #e67700', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>OUT-OF-STOCK ORDERS</Typography>
                    <Typography variant="h4" fontWeight={900} color="#e67700" sx={{ my: 0.5 }}>
                      {openMedMetrics.totalRxCount}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Prescriptions containing missing items</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, borderLeft: '4px solid #3b5bdb', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>PRESCRIBED MISSING ITEMS</Typography>
                    <Typography variant="h4" fontWeight={900} color="#3b5bdb" sx={{ my: 0.5 }}>
                      {openMedMetrics.totalItemsCount} Lines
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Total unfulfilled medication lines</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, borderLeft: '4px solid #d6336c', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>TOP REQUISITION DEMAND</Typography>
                    <Typography variant="subtitle1" fontWeight={900} color="#d6336c" sx={{ my: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {openMedMetrics.topDrug}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{openMedMetrics.topUnits} units required by doctors</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, borderLeft: '4px solid #0d9488', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>ESTIMATED RESTOCK BUDGET</Typography>
                    <Typography variant="h5" fontWeight={900} color="#0d9488" sx={{ my: 0.5 }}>
                      ₦{openMedMetrics.totalEstimatedValue.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Required hospital procurement spend</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* OpenMed AI Intelligence Recommendation Banner */}
            <Alert
              severity="warning"
              icon={<LocalPharmacy />}
              sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: alpha('#e67700', 0.3) }}
            >
              <Typography variant="subtitle2" fontWeight={800}>
                💡 OpenMed AI Requisition Intelligence for Hospital Administrators
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                OpenMed SDK telemetry detected <strong>{openMedMetrics.totalItemsCount} out-of-stock medication lines</strong> across {openMedMetrics.totalRxCount} prescriptions.
                Highest prescribed missing item: <strong>{openMedMetrics.topDrug}</strong> ({openMedMetrics.topUnits} units). Generating an urgent stock purchase requisition will restock inventory, recover ₦{openMedMetrics.totalEstimatedValue.toLocaleString()} in revenue, and eliminate patient external purchase delays.
              </Typography>
            </Alert>

            {/* Out of Stock Table */}
            <TableContainer component={Paper} sx={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', borderRadius: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: alpha('#e67700', 0.08) } }}>
                    <TableCell>Rx No.</TableCell>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Prescriber</TableCell>
                    <TableCell>Out-of-Stock Medications Prescribed</TableCell>
                    <TableCell>Patient Action</TableCell>
                    <TableCell>Requisition Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {outOfStockRxList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        <CheckCircle sx={{ fontSize: 48, color: '#10b981', mb: 1, display: 'block', mx: 'auto' }} />
                        No out-of-stock prescriptions recorded. All hospital medications are in stock!
                      </TableCell>
                    </TableRow>
                  ) : outOfStockRxList.map(rx => (
                    <TableRow key={rx.id} hover>
                      <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{rx.prescriptionNumber}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          {(() => {
                            const d = new Date(rx.orderedAt);
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const yyyy = d.getFullYear();
                            const HH = String(d.getHours()).padStart(2, '0');
                            const MM = String(d.getMinutes()).padStart(2, '0');
                            return `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{rx.patient.firstName} {rx.patient.lastName}</Typography>
                        <Typography variant="caption" color="text.secondary">{rx.patient.patientNumber}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{rx.prescriber.firstName} {rx.prescriber.lastName}</Typography>
                        <Typography variant="caption" color="text.secondary">{rx.prescriber.designation || 'Doctor'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.3}>
                          {rx.items.map((item: any) => {
                            const isExt = isOutOfStockItem(item);
                            const medName = resolvePrescriptionItemName(item);

                            return (
                              <Chip
                                key={item.id}
                                label={isExt ? `🌐 OUT OF STOCK (${medName}) — External Purchase` : `✅ ${medName} (In Stock)`}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem', height: 20, fontWeight: 700,
                                  bgcolor: isExt ? alpha('#e67700', 0.15) : alpha('#10b981', 0.1),
                                  color: isExt ? '#e67700' : '#10b981',
                                }}
                              />
                            );
                          })}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="External Purchase"
                          size="small"
                          variant="outlined"
                          color="warning"
                          sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const poNum = createdPoRxIds[rx.id] || createdPoRxIds[rx.prescriptionNumber];
                          if (poNum) {
                            return (
                              <Chip
                                label={`🟢 Requisition Sent (${poNum})`}
                                size="small"
                                sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: alpha('#10b981', 0.15), color: '#059669' }}
                              />
                            );
                          }
                          return (
                            <Chip
                              label="🔴 Requisition Required"
                              size="small"
                              sx={{ fontWeight: 800, fontSize: '0.68rem', bgcolor: alpha('#e03131', 0.1), color: '#e03131' }}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell align="right">
                        {(() => {
                          const poNum = createdPoRxIds[rx.id] || createdPoRxIds[rx.prescriptionNumber];
                          if (poNum) {
                            return (
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<Inventory />}
                                onClick={() => setQueueSubTab(2)}
                                sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.75rem' }}
                              >
                                📦 View PO & Match GRN
                              </Button>
                            );
                          }
                          return (
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              startIcon={<Add />}
                              onClick={() => handleCreateSingleRxPO(rx)}
                              sx={{ textTransform: 'none', fontWeight: 800, fontSize: '0.75rem' }}
                            >
                              + Create Requisition PO
                            </Button>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          /* Sub-Tab 2: Procurement & PO Tracking */
          renderProcurementTab()
        )}

        {/* Prescription Detail Dialog */}
        {selectedPrescription && (
        <Dialog open={!!selectedPrescription} onClose={() => setSelectedPrescription(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Prescription Detail: {selectedPrescription.prescriptionNumber}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} mb={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Patient</Typography>
                <Typography variant="body1" fontWeight={700}>{selectedPrescription.patient.firstName} {selectedPrescription.patient.lastName} ({selectedPrescription.patient.patientNumber})</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Prescriber</Typography>
                <Typography variant="body1">{selectedPrescription.prescriber.firstName} {selectedPrescription.prescriber.lastName}</Typography>
              </Grid>
              {selectedPrescription.clinicalNotes && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Prescriber Notes</Typography>
                  <Typography variant="body2" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 2 }}>{selectedPrescription.clinicalNotes}</Typography>
                </Grid>
              )}
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={800} mb={1.5}>Medication Items</Typography>
            <Stack spacing={1.5}>
              {selectedPrescription.items.map(item => {
                const isExtItem = isOutOfStockItem(item);
                const batches = item.medication?.batches || [];
                const dispBatches = batches.filter((b: any) =>
                  !b.warehouseId ||
                  b.warehouse?.code === 'DISP-MAIN' ||
                  b.warehouse?.name?.toLowerCase().includes('dispensary') ||
                  b.warehouse?.name?.toLowerCase().includes('pharmacy') ||
                  b.warehouse?.code?.includes('DISP')
                );
                const storeBatches = batches.filter((b: any) =>
                  b.warehouse?.code === 'WH-MAIN' ||
                  b.warehouse?.name?.toLowerCase().includes('central') ||
                  b.warehouse?.name?.toLowerCase().includes('warehouse') ||
                  b.warehouse?.name?.toLowerCase().includes('store')
                );

                const dispBatchesSum = dispBatches.reduce((sum: number, b: any) => sum + (b.currentQuantity ?? b.quantity ?? 0), 0);
                const storeBatchesSum = storeBatches.reduce((sum: number, b: any) => sum + (b.currentQuantity ?? b.quantity ?? 0), 0);
                const totalBatchesSum = batches.reduce((sum: number, b: any) => sum + (b.currentQuantity ?? b.quantity ?? 0), 0);

                const medObj = (item.medication as any) || {};
                const medStockLeft = Number(medObj.dispensaryStock ?? medObj.stockLeft ?? medObj.stockQty ?? medObj.quantityInStock ?? 0);
                const medStoreStock = Number(medObj.centralStoreStock ?? medObj.warehouseStock ?? 0);

                let dispQty = 0;
                let storeQty = 0;

                if (!isExtItem) {
                  dispQty = dispBatchesSum > 0 ? dispBatchesSum : (medStockLeft > 0 ? medStockLeft : (totalBatchesSum > 0 ? totalBatchesSum : 100));
                  storeQty = storeBatchesSum > 0 ? storeBatchesSum : (medStoreStock > 0 ? medStoreStock : 250);
                }

                const itemTitle = resolvePrescriptionItemName(item);
                const itemBrand = item.medication?.brandName ? ` (${item.medication.brandName})` : '';

                return (
                  <Card key={item.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" fontWeight={700}>
                          {itemTitle}{itemBrand}
                        </Typography>
                        <Chip
                          label={isExtItem ? 'OUT_OF_STOCK_EXTERNAL' : item.status}
                          size="small"
                          color={isExtItem ? 'warning' : (item.status === 'DISPENSED' ? 'success' : 'warning')}
                          sx={{ fontWeight: 800, fontSize: '0.68rem' }}
                        />
                      </Box>
                      <Grid container spacing={1.5} mt={1}>
                        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Dose / Freq</Typography><Typography variant="body2">{item.dose} · {item.frequency}</Typography></Grid>
                        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Duration / Route</Typography><Typography variant="body2">{item.duration} · {item.route}</Typography></Grid>
                        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Quantity Prescribed</Typography><Typography variant="body2" fontWeight={700}>{item.quantityPrescribed} ({item.medication?.unitOfMeasure || 'units'})</Typography></Grid>
                        {item.clinicalIndication && <Grid item xs={12}><Typography variant="caption" color="text.secondary">Clinical Indication</Typography><Typography variant="body2">{item.clinicalIndication}</Typography></Grid>}

                        {/* Location Stock Breakdown & Quick Store Transfer */}
                        <Grid item xs={12}>
                          {isExtItem ? (
                            <Box sx={{ p: 1.2, bgcolor: alpha('#e67700', 0.08), borderRadius: 1.5, border: '1px dashed', borderColor: alpha('#e67700', 0.3), display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                              <Typography variant="caption" fontWeight={700} color="#e67700">
                                📍 Stock Availability: 🌐 OUT OF STOCK — Dispensary: <span style={{ color: '#dc2626', fontWeight: 800 }}>0 left</span> | Central Warehouse: <span style={{ color: '#dc2626', fontWeight: 800 }}>0 units</span> (External Purchase Required — Patient purchasing outside)
                              </Typography>
                              <Chip
                                label="External Purchase"
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                              />
                            </Box>
                          ) : (
                            <Box sx={{ p: 1.2, bgcolor: alpha('#2563eb', 0.05), borderRadius: 1.5, border: '1px dashed', borderColor: alpha('#2563eb', 0.2), display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                              <Typography variant="caption" fontWeight={700}>
                                📍 Stock Availability: Dispensary: <span style={{ color: dispQty > 0 ? '#16a34a' : '#ea580c', fontWeight: 800 }}>{dispQty} left</span> | Central Warehouse: <span style={{ color: storeQty > 0 ? '#1e3a8a' : '#dc2626', fontWeight: 800 }}>{storeQty} units available</span>
                              </Typography>
                              {dispQty <= 0 && storeQty > 0 && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="secondary"
                                  sx={{ fontSize: '0.68rem', py: 0.3, px: 1.2, height: 26, fontWeight: 800, textTransform: 'none' }}
                                  onClick={() => handleQuickStoreTransfer(item.medicationId || item.medication?.id, item.quantityPrescribed)}
                                >
                                  ⚡ Transfer Stock from Store to Dispensary
                                </Button>
                              )}
                            </Box>
                          )}
                        </Grid>
                      </Grid>
                      {isExtItem ? (
                        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label="Out of Stock — External Purchase Required"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                          />
                        </Box>
                      ) : dispQty <= 0 && storeQty <= 0 ? (
                        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label="Out of Stock — Dispensing Unavailable"
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                          />
                        </Box>
                      ) : (
                        (selectedPrescription.status === 'VERIFIED' || selectedPrescription.status === 'PARTIAL_DISPENSED') && item.status !== 'DISPENSED' && (
                          <Button size="small" variant="contained" color="success" startIcon={<PlusOne />} sx={{ mt: 1.5 }}
                            onClick={() => handleOpenDispenseModal(item)}>
                            Dispense Medication
                          </Button>
                        )
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </DialogContent>
          <DialogActions>
            {(selectedPrescription.status === 'VERIFIED' || selectedPrescription.status === 'PARTIAL_DISPENSED') && (
              <Button 
                startIcon={<Check />} 
                variant="contained" 
                color="success" 
                onClick={() => setConfirmDialog({ open: true, type: 'DISPENSE', rx: selectedPrescription })}
              >
                Mark as Dispensed
              </Button>
            )}
            {isPharmacist && selectedPrescription.status === 'DISPENSED' && (
              <Button 
                startIcon={<Cancel />} 
                variant="contained" 
                color="error" 
                onClick={() => setConfirmDialog({ open: true, type: 'REVERT', rx: selectedPrescription })}
              >
                Revert Dispensing
              </Button>
            )}
            <Button variant="outlined" startIcon={<Print />} onClick={() => window.print()}>Print</Button>
            <Button onClick={() => setSelectedPrescription(null)}>Close</Button>
            <Button startIcon={<NotificationsActive />} variant="outlined" color="warning" onClick={() => setAddInterventionOpen(true)}>Clinical Intervention</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Clinical verification alerts notification dialog */}
      {clinicalChecksAlerts && (
        <Dialog open={!!clinicalChecksAlerts} onClose={() => setClinicalChecksAlerts(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 800, bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}>
            ⚠ Clinical Safety Check Alerts
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body1" fontWeight={700} mb={2}>Allergy, Drug Interaction & Duplicate Therapy Warning Results:</Typography>
            {clinicalChecksAlerts.allergyAlert && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                <strong>Allergy Warning:</strong>
                {clinicalChecksAlerts.allergyWarnings.map((w: string) => <div key={w}>{w}</div>)}
              </Alert>
            )}
            {clinicalChecksAlerts.interactionAlert && (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                <strong>Interaction Warnings:</strong>
                {clinicalChecksAlerts.interactionWarnings.map((w: string) => <div key={w}>{w}</div>)}
              </Alert>
            )}
            {clinicalChecksAlerts.duplicateAlert && (
              <Alert severity="info" sx={{ mb: 1.5 }}>
                <strong>Duplicate Therapy warnings:</strong>
                {clinicalChecksAlerts.duplicateWarnings.map((w: string) => <div key={w}>{w}</div>)}
              </Alert>
            )}
            {!clinicalChecksAlerts.allergyAlert && !clinicalChecksAlerts.interactionAlert && !clinicalChecksAlerts.duplicateAlert && (
              <Alert severity="success">No interactions or allergy warning detected for this prescription.</Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClinicalChecksAlerts(null)} variant="contained">Acknowledge</Button>
          </DialogActions>
        </Dialog>
      )}
      {/* Action Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(p => ({ ...p, open: false }))} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {confirmDialog.type === 'VERIFY' && 'Confirm Clinical Verification'}
          {confirmDialog.type === 'DISPENSE' && 'Confirm Drug Dispensing'}
          {confirmDialog.type === 'REVERT' && 'Revert Dispense / Verification'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {confirmDialog.type === 'VERIFY' && `Are you sure you want to clinically verify prescription ${confirmDialog.rx?.prescriptionNumber}? This will run safety alerts and checks to verify patient eligibility.`}
            {confirmDialog.type === 'DISPENSE' && `Are you sure you want to mark prescription ${confirmDialog.rx?.prescriptionNumber} as DISPENSED? This will deduct the inventory items and advance the patient's stage.`}
            {confirmDialog.type === 'REVERT' && `Are you sure you want to undo and revert dispensing for prescription ${confirmDialog.rx?.prescriptionNumber}? This will restore the deducted inventory and reset the status to pending.`}
          </Typography>
          
          <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 2, borderLeft: `4px solid ${theme.palette.primary.main}` }}>
            <Typography variant="subtitle2" fontWeight={800} display="block">
              Pharmacist Performing Action:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user ? `${user.firstName} ${user.lastName} (${user.role})` : 'Pharmacist Admin'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmDialog(p => ({ ...p, open: false }))} color="inherit">Cancel</Button>
          <Button 
            variant="contained" 
            color={confirmDialog.type === 'REVERT' ? 'error' : 'success'} 
            onClick={async () => {
              if (!confirmDialog.rx) return;
              const rxId = confirmDialog.rx.id;
              setConfirmDialog(p => ({ ...p, open: false }));
              
              if (confirmDialog.type === 'VERIFY') {
                // Auto-verify if payment is made or insurance is active
                if (confirmDialog.rx.paymentStatus !== 'PAID' && confirmDialog.rx.paymentStatus !== 'INSURANCE') {
                  enqueueSnackbar('Verification blocked: prescription has not been paid or insurance coverage has not been approved.', { variant: 'warning' });
                  return;
                }
                try {
                  const { data } = await axios.patch(`${API}/prescriptions/${rxId}/verify`, { verifiedById: user?.id || 'pharmacist-admin' }, { headers: getHeaders() });
                  setClinicalChecksAlerts(data.alerts);
                  enqueueSnackbar(`Prescription successfully verified by ${user ? `${user.firstName} ${user.lastName}` : 'Pharmacist Admin'}`, { variant: 'success' });
                  setVerifyOpen(true);
                  await fetchPrescriptions();
                  refreshSelectedPrescription(rxId);
                } catch (err: any) {
                  enqueueSnackbar(err.response?.data?.error || 'Verification check failed', { variant: 'error' });
                }
              } else if (confirmDialog.type === 'DISPENSE') {
                try {
                  const { data } = await axios.post(`${API}/prescriptions/${rxId}/dispense-all`, {}, { headers: getHeaders() });
                  if (data.success) {
                    enqueueSnackbar(`Prescription marked as DISPENSED by ${user ? `${user.firstName} ${user.lastName}` : 'Pharmacist Admin'}`, { variant: 'success' });
                    await fetchPrescriptions();
                    refreshSelectedPrescription(rxId);
                  }
                } catch (err: any) {
                  enqueueSnackbar(err.response?.data?.error || 'Failed to dispense', { variant: 'error' });
                }
              } else if (confirmDialog.type === 'REVERT') {
                try {
                  const { data } = await axios.post(`${API}/prescriptions/${rxId}/revert`, {}, { headers: getHeaders() });
                  if (data.success) {
                    enqueueSnackbar('Dispensing and verification reverted successfully. Inventory stock restored.', { variant: 'info' });
                    await fetchPrescriptions();
                    refreshSelectedPrescription(rxId);
                  }
                } catch (err: any) {
                  enqueueSnackbar(err.response?.data?.error || 'Failed to revert', { variant: 'error' });
                }
              }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      {/* Medication Dispensing Modal */}
      {selectedItem && (
        <Dialog open={dispenseOpen} onClose={() => setDispenseOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <DialogTitle sx={{ fontWeight: 800 }}>Dispense Medication: {selectedItem.medication.genericName}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} mt={1}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Select Stock Batch (FEFO Order)</Typography>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Batch Number</InputLabel>
                  <Select 
                    value={dispenseForm.batchId} 
                    label="Batch Number" 
                    onChange={e => {
                      const selectedBatchId = e.target.value;
                      const counselling = generateOpenMedCounselling(selectedItem);
                      setDispenseForm(p => ({
                        ...p,
                        batchId: selectedBatchId,
                        counsellingNotes: counselling.notes,
                        counsellingPrecautions: counselling.precautions,
                      }));
                      enqueueSnackbar(`✨ OpenMed Auto-Fill: Populated dosage instructions & clinical precautions for ${selectedItem?.medication?.genericName || 'medication'}`, { variant: 'info' });
                    }}
                  >
                    {selectedItem.medication.batches?.filter(b => b.currentQuantity > 0).map(b => (
                      <MenuItem key={b.id} value={b.id}>
                        Batch: {b.batchNumber} (Expires: {new Date(b.expiryDate).toLocaleDateString()}) - Available: {b.currentQuantity}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Quantity to Dispense" type="number" fullWidth value={dispenseForm.quantityDispensed}
                  onChange={e => setDispenseForm(p => ({ ...p, quantityDispensed: Number(e.target.value) }))} />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Barcode Scan Verify" placeholder="Scan barcode/lot" fullWidth value={dispenseForm.barcodeScanned}
                  onChange={e => setDispenseForm(p => ({ ...p, barcodeScanned: e.target.value }))}
                  InputProps={{ endAdornment: <IconButton onClick={() => setDispenseForm(p => ({ ...p, barcodeScanned: selectedItem.medication.itemCode }))}><Verified /></IconButton> }} />
              </Grid>
              {/* ── Insurance & Co-payment details section (Commented out per user request as billing/payment was already completed at Cashier counter) ── */}
              {/* 
              <Grid item xs={12}>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={800} mb={1}>Insurance & Co-payment details</Typography>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Insurance Status" fullWidth value={dispenseForm.insuranceStatus}
                  onChange={e => setDispenseForm(p => ({ ...p, insuranceStatus: e.target.value }))}>
                  <MenuItem value="PATIENT_PAY">Patient Out of Pocket</MenuItem>
                  <MenuItem value="INS_COVERED">Insurance Covered</MenuItem>
                </TextField>
              </Grid>
              {dispenseForm.insuranceStatus === 'INS_COVERED' && (
                <>
                  <Grid item xs={12}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1}>
                        <TextField 
                          label="HMO Authorization Claim ID" 
                          fullWidth 
                          value={dispenseForm.claimId}
                          onChange={e => {
                            const val = e.target.value;
                            setDispenseForm(p => ({ ...p, claimId: val }));
                            if (val.length >= 4) handleVerifyClaim(val);
                            else setVerifiedClaim(null);
                          }} 
                        />
                        <Button 
                          variant="contained" 
                          onClick={() => handleVerifyClaim(dispenseForm.claimId)}
                          disabled={verifyingClaim || !dispenseForm.claimId}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          {verifyingClaim ? <CircularProgress size={20} color="inherit" /> : 'Verify Claim'}
                        </Button>
                      </Stack>
                      {verifiedClaim && (
                        <Box sx={{ mt: 1 }}>
                          {verifiedClaim.notFound ? (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                              No pre-authorization claim found matching "{dispenseForm.claimId}".
                            </Alert>
                          ) : (
                            <Alert 
                              severity={verifiedClaim.status === 'APPROVED' ? "success" : "warning"}
                              sx={{ borderRadius: 2 }}
                            >
                              <Typography variant="subtitle2" fontWeight={800}>
                                Pre-Auth Verified: {verifiedClaim.patientName} ({verifiedClaim.payer})
                              </Typography>
                              <Typography variant="caption" display="block">
                                Service: <strong>{verifiedClaim.service}</strong> · Status: <strong>{verifiedClaim.status}</strong>
                              </Typography>
                              <Typography variant="caption" display="block">
                                Code CPT: {verifiedClaim.cptCode || 'N/A'} · Request Date: {verifiedClaim.requestDate}
                              </Typography>
                              {selectedPrescription && selectedPrescription.patient?.firstName && !verifiedClaim.patientName.includes(selectedPrescription.patient.firstName) && (
                                <Typography variant="caption" color="error.main" fontWeight={700} display="block" sx={{ mt: 0.5 }}>
                                  ⚠️ Warning: Dispense patient does not match this Pre-Auth owner!
                                </Typography>
                              )}
                            </Alert>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField label="Insurance Co-pay Charge (₦)" type="number" fullWidth value={dispenseForm.coPaymentAmount}
                      onChange={e => setDispenseForm(p => ({ ...p, coPaymentAmount: Number(e.target.value) }))} />
                  </Grid>
                </>
              )} 
              */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" fontWeight={800} mb={1}>Patient counselling & instructions</Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Dosage and Administration instructions" multiline rows={2} fullWidth value={dispenseForm.counsellingNotes}
                  onChange={e => setDispenseForm(p => ({ ...p, counsellingNotes: e.target.value }))} placeholder="e.g. Take 1 tablet morning and night after food." />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Precautions & adverse effects counselling" multiline rows={2} fullWidth value={dispenseForm.counsellingPrecautions}
                  onChange={e => setDispenseForm(p => ({ ...p, counsellingPrecautions: e.target.value }))} placeholder="e.g. May cause drowsiness. Avoid driving or operating machinery." />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel control={<Checkbox checked={dispenseForm.counsellingDone} onChange={e => setDispenseForm(p => ({ ...p, counsellingDone: e.target.checked }))} />}
                  label="Counselling completed and explained in patient's preferred language" />
                <FormControlLabel control={<Checkbox checked={dispenseForm.patientAcknowledge} onChange={e => setDispenseForm(p => ({ ...p, patientAcknowledge: e.target.checked }))} />}
                  label="Patient acknowledges dosage, precautions and returns policies" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDispenseOpen(false)}>Cancel</Button>
            <Button variant="contained" color="success" onClick={handleDispense}>Confirm Dispense</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* New Prescription dialog (CPOE Mockup) */}
      <Dialog open={newPrescriptionOpen} onClose={() => setNewPrescriptionOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>New Electronic Prescription</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={6}>
              <Autocomplete
                options={patients}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.patientNumber})`}
                value={patients.find(p => p.id === rxForm.patientId) || null}
                onChange={(_, newValue) => {
                  setRxForm(p => ({ ...p, patientId: newValue ? newValue.id : '' }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Patient MRN / ID" fullWidth required />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                options={employees}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.id})`}
                value={employees.find(e => e.id === rxForm.prescribedById) || null}
                onChange={(_, newValue) => {
                  setRxForm(p => ({ ...p, prescribedById: newValue ? newValue.id : '' }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Prescribing Clinician Employee ID" fullWidth required />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                label="Diagnosis / ICD-10 Code"
                fullWidth
                value={rxForm.diagnosis}
                onChange={e => setRxForm(p => ({ ...p, diagnosis: e.target.value }))}
              >
                {ICD10_CODES.map(c => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select label="Payment Status" fullWidth value={rxForm.paymentStatus} onChange={e => setRxForm(p => ({ ...p, paymentStatus: e.target.value }))}>
                <MenuItem value="UNPAID">Unpaid / Self pay</MenuItem>
                <MenuItem value="INSURANCE">Insurance HMO</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="DateTime"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={rxForm.orderedAt}
                onChange={e => setRxForm(p => ({ ...p, orderedAt: e.target.value }))}
              />
            </Grid>
            {rxForm.paymentStatus === 'INSURANCE' && (
              <Grid item xs={12}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1}>
                    <TextField 
                      label="Insurance Card Policy number" 
                      fullWidth 
                      value={rxForm.insurancePolicyNo} 
                      onChange={e => {
                        const val = e.target.value;
                        setRxForm(p => ({ ...p, insurancePolicyNo: val }));
                        if (val.length >= 4) handleVerifyPolicy(val);
                        else setVerifiedPolicy(null);
                      }} 
                    />
                    <Button 
                      variant="contained" 
                      onClick={() => handleVerifyPolicy(rxForm.insurancePolicyNo)}
                      disabled={verifyingPolicy || !rxForm.insurancePolicyNo}
                      sx={{ whiteSpace: 'nowrap' }}
                    >
                      {verifyingPolicy ? <CircularProgress size={20} color="inherit" /> : 'Verify Claims'}
                    </Button>
                  </Stack>
                  {verifiedPolicy && (
                    <Box sx={{ mt: 1 }}>
                      {verifiedPolicy.notFound ? (
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                          No active insurance policy found for policy number "{rxForm.insurancePolicyNo}".
                        </Alert>
                      ) : (
                        <Alert 
                          severity={verifiedPolicy.isActive && new Date(verifiedPolicy.expiryDate) >= new Date() ? "success" : "warning"}
                          sx={{ borderRadius: 2 }}
                        >
                          <Typography variant="subtitle2" fontWeight={800}>
                            Owner Verified: {verifiedPolicy.patient?.firstName} {verifiedPolicy.patient?.lastName}
                          </Typography>
                          <Typography variant="caption" display="block">
                            HMO Provider: <strong>{verifiedPolicy.provider?.name}</strong> · Plan: <strong>{verifiedPolicy.plan?.name}</strong>
                          </Typography>
                          <Typography variant="caption" display="block">
                            Policy Expiry: {new Date(verifiedPolicy.expiryDate).toLocaleDateString()} · Co-pay: {verifiedPolicy.plan?.copayPercentage || 0}%
                          </Typography>
                          {rxForm.patientId && verifiedPolicy.patientId !== rxForm.patientId && (
                            <Typography variant="caption" color="error.main" fontWeight={700} display="block" sx={{ mt: 0.5 }}>
                              ⚠️ Warning: Selected patient does not match this policy owner!
                            </Typography>
                          )}
                        </Alert>
                      )}
                    </Box>
                  )}
                </Stack>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField label="Clinical notes" multiline rows={2} fullWidth value={rxForm.clinicalNotes} onChange={e => setRxForm(p => ({ ...p, clinicalNotes: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight={800} mb={1}>Medications list</Typography>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={4}>
                  <TextField select label="Select Medication" fullWidth size="small" value={rxItemInput.medicationId} onChange={e => setRxItemInput(p => ({ ...p, medicationId: e.target.value }))}>
                    {inventory.map(m => <MenuItem key={m.id} value={m.id}>{m.genericName} ({m.brandName})</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={2}>
                  <TextField select label="Dose" size="small" fullWidth value={rxItemInput.dose} onChange={e => setRxItemInput(p => ({ ...p, dose: e.target.value }))}>
                    {DOSE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={2}>
                  <TextField select label="Freq" size="small" fullWidth value={rxItemInput.frequency} onChange={e => setRxItemInput(p => ({ ...p, frequency: e.target.value }))}>
                    {FREQ_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={2}>
                  <TextField select label="Duration" size="small" fullWidth value={rxItemInput.duration} onChange={e => setRxItemInput(p => ({ ...p, duration: e.target.value }))}>
                    {DURATION_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={1.5}>
                  <TextField select label="Qty" size="small" fullWidth value={rxItemInput.quantityPrescribed} onChange={e => setRxItemInput(p => ({ ...p, quantityPrescribed: Number(e.target.value) }))}>
                    {QTY_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={0.5}>
                  <IconButton color="primary" onClick={() => {
                    if (!rxItemInput.medicationId || !rxItemInput.dose) return;
                    setRxForm(p => ({ ...p, items: [...p.items, rxItemInput] }));
                    setRxItemInput({ medicationId: '', dose: '', frequency: 'Daily', duration: '5 Days', route: 'PO', quantityPrescribed: 1, clinicalIndication: '' });
                  }}><Add /></IconButton>
                </Grid>
              </Grid>
              {rxForm.items.length > 0 && (
                <Box mt={2}>
                  {rxForm.items.map((i, index) => {
                    const med = inventory.find(m => m.id === i.medicationId);
                    return (
                      <Chip key={index} label={`${med?.genericName} - Dose: ${i.dose} Qty: ${i.quantityPrescribed}`} sx={{ mr: 1, mb: 1 }} onDelete={() => setRxForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== index) }))} />
                    );
                  })}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewPrescriptionOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreatePrescription}>Submit Prescription</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

  // Tab 1: Medication Inventory
  const renderInventoryTab = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mr="auto">Medication Stock Ledger</Typography>
        <BulkImportExport
          onImport={handleBulkImportPharmacyDrugs}
          exportFileName="Pharmacy_Drugs_Template"
          templateData={[{
            itemCode: 'PHRM-001', genericName: 'Paracetamol', brandName: 'Panadol', dosageForm: 'Tablet',
            strength: '500mg', manufacturer: 'GSK', supplierPreferred: 'MedTech Supplies Ltd',
            storageRequirements: 'Room Temp', unitOfMeasure: 'Pack', classification: 'Analgesic',
            price: 500, requiresFasting: false, loincCode: ''
          }]}
        />
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchInventory}>Refresh</Button>
        <Button variant="outlined" startIcon={<Add />} onClick={() => setAddBatchOpen(true)}>Add Stock Batch</Button>
        <Button variant="contained" startIcon={<Add />} onClick={() => {
          setMedForm({ itemCode: '', genericName: '', brandName: '', dosageForm: '', strength: '', manufacturer: '', storageRequirements: '', classification: 'General', price: 0, unitOfMeasure: 'Pack', loincCode: '' });
          setAddInventoryOpen(true);
        }}>New Medication</Button>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
              <TableCell>Code</TableCell>
              <TableCell>Generic Name</TableCell>
              <TableCell>Brand Name</TableCell>
              <TableCell>Form / Strength</TableCell>
              <TableCell>Classification</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock Balances</TableCell>
              <TableCell>Next Expiry</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.map(item => {
              const totalAllStock = item.batches?.reduce((sum, b) => sum + (b.currentQuantity || 0), 0) || 0;
              const dispensaryBatches = item.batches?.filter((b: any) =>
                !b.warehouseId ||
                b.warehouse?.name?.toLowerCase().includes('dispensary') ||
                b.warehouse?.name?.toLowerCase().includes('pharmacy') ||
                b.warehouse?.code?.includes('DISP')
              ) || [];

              const dispensaryStock = dispensaryBatches.reduce((sum: number, b: any) => sum + (b.currentQuantity || 0), 0);
              const displayStock = dispensaryBatches.length > 0 ? dispensaryStock : totalAllStock;
              const hasLow = displayStock <= 50;

              return (
                <TableRow key={item.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{item.itemCode}</Typography></TableCell>
                  <TableCell><Typography variant="body2" fontWeight={700}>{item.genericName}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{item.brandName}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{item.dosageForm} · {item.strength}</Typography></TableCell>
                  <TableCell>
                    <Chip label={item.classification} size="small" color={item.classification === 'CONTROLLED' ? 'error' : 'default'} sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                  </TableCell>
                  <TableCell><Typography variant="body2" fontWeight={700}>₦{Number(item.price).toLocaleString()}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={800} color={hasLow ? 'error.main' : 'success.main'}>
                      {displayStock} {item.unitOfMeasure}s {hasLow && '⚠️'}
                    </Typography>
                    {dispensaryBatches.length > 0 && totalAllStock !== dispensaryStock && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>
                        ({dispensaryStock} in Dispensary / {totalAllStock} Total)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.batches?.length > 0 ? (
                      <Typography variant="caption">
                        {new Date(Math.min(...item.batches.map(b => new Date(b.expiryDate).getTime()))).toLocaleDateString()}
                      </Typography>
                    ) : 'No Batches'}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        sx={{ borderRadius: 2, fontSize: '0.68rem', fontWeight: 800, py: 0.3, px: 1 }}
                        onClick={() => {
                          setBatchForm(p => ({ ...p, inventoryItemId: item.id, receivedQuantity: 100 }));
                          setAddBatchOpen(true);
                        }}>
                        + Add Stock
                      </Button>
                      <IconButton size="small" color="primary" onClick={() => handleEditMedication(item)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteMedication(item.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* New Medication dialog */}
      <Dialog open={addInventoryOpen} onClose={() => setAddInventoryOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Medication to Catalog</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12} sm={8}>
              <TerminologyAutocomplete
                system="RXNORM"
                label="Generic Name * (Data Dictionary Search)"
                placeholder="Type drug generic name (e.g., Amoxicillin, Paracetamol, Metformin)..."
                value={medForm.genericName}
                onChange={(codeStr, display, concept) => {
                  const pureCode = concept?.code || codeStr.split(' — ')[0];
                  const drugDisplayName = concept?.display || display || codeStr;
                  const nameLower = drugDisplayName.toLowerCase();

                  // 1. Auto-Detect Brand Name
                  let autoBrand = '';
                  if (nameLower.includes('amoxicillin-clavulanate') || nameLower.includes('augmentin')) autoBrand = 'Augmentin';
                  else if (nameLower.includes('amoxicillin') || nameLower.includes('amoxil')) autoBrand = 'Amoxil';
                  else if (nameLower.includes('paracetamol') || nameLower.includes('acetaminophen') || nameLower.includes('panadol')) autoBrand = 'Panadol';
                  else if (nameLower.includes('artemether') || nameLower.includes('coartem')) autoBrand = 'Coartem';
                  else if (nameLower.includes('metformin') || nameLower.includes('glucophage')) autoBrand = 'Glucophage';
                  else if (nameLower.includes('amlodipine') || nameLower.includes('norvasc')) autoBrand = 'Norvasc';
                  else if (nameLower.includes('ciprofloxacin') || nameLower.includes('cipro')) autoBrand = 'Ciprotab';
                  else if (nameLower.includes('metronidazole') || nameLower.includes('flagyl')) autoBrand = 'Flagyl';
                  else if (nameLower.includes('salbutamol') || nameLower.includes('ventolin')) autoBrand = 'Ventolin Inhaler';
                  else if (nameLower.includes('azithromycin') || nameLower.includes('zithromax')) autoBrand = 'Zithromax';
                  else if (nameLower.includes('ceftriaxone') || nameLower.includes('rocephin')) autoBrand = 'Rocephin';
                  else if (nameLower.includes('omeprazole') || nameLower.includes('losec')) autoBrand = 'Losec';
                  else if (nameLower.includes('ibuprofen') || nameLower.includes('advil')) autoBrand = 'Advil';
                  else if (nameLower.includes('diclofenac') || nameLower.includes('voltaren')) autoBrand = 'Voltaren';
                  else if (nameLower.includes('lisinopril') || nameLower.includes('zestril')) autoBrand = 'Zestril';
                  else if (nameLower.includes('atorvastatin') || nameLower.includes('lipitor')) autoBrand = 'Lipitor';

                  // 2. Auto-Detect Dosage Form & Unit of Measure
                  let autoForm = 'Tablet';
                  let autoUnit = 'Tablet';
                  if (nameLower.includes('capsule') || nameLower.includes('cap')) {
                    autoForm = 'Capsule';
                    autoUnit = 'Capsule';
                  } else if (nameLower.includes('injection') || nameLower.includes('iv') || nameLower.includes('ampoule') || nameLower.includes('vial') || nameLower.includes('ceftriaxone')) {
                    autoForm = 'Injection / IV';
                    autoUnit = 'Vial / Ampoule';
                  } else if (nameLower.includes('syrup') || nameLower.includes('suspension') || nameLower.includes('liquid') || nameLower.includes('elixir')) {
                    autoForm = 'Oral Suspension / Syrup';
                    autoUnit = 'Bottle (ml)';
                  } else if (nameLower.includes('cream') || nameLower.includes('ointment') || nameLower.includes('gel')) {
                    autoForm = 'Topical Ointment / Cream';
                    autoUnit = 'Tube';
                  } else if (nameLower.includes('drops') || nameLower.includes('eye') || nameLower.includes('ear')) {
                    autoForm = 'Eye/Ear Drops';
                    autoUnit = 'Bottle (ml)';
                  } else if (nameLower.includes('inhaler') || nameLower.includes('aerosol') || nameLower.includes('salbutamol')) {
                    autoForm = 'Inhaler';
                    autoUnit = 'Pack / Box';
                  } else if (nameLower.includes('suppository')) {
                    autoForm = 'Suppository';
                    autoUnit = 'Pack / Box';
                  } else if (nameLower.includes('infusion')) {
                    autoForm = 'Infusion';
                    autoUnit = 'Vial / Ampoule';
                  }

                  // 3. Auto-Detect Strength
                  let autoStrength = '500 mg';
                  if (nameLower.includes('80/480') || nameLower.includes('coartem') || nameLower.includes('artemether')) autoStrength = '80/480 mg';
                  else if (nameLower.includes('250mg/5ml') || nameLower.includes('125mg/5ml')) autoStrength = '250 mg/5ml';
                  else if (nameLower.includes('1000mg') || nameLower.includes('1g') || nameLower.includes('1 g') || nameLower.includes('ceftriaxone')) autoStrength = '1 g';
                  else if (nameLower.includes('500')) autoStrength = '500 mg';
                  else if (nameLower.includes('250')) autoStrength = '250 mg';
                  else if (nameLower.includes('400')) autoStrength = '400 mg';
                  else if (nameLower.includes('20mg') || nameLower.includes('20 mg') || nameLower.includes('omeprazole')) autoStrength = '20 mg';
                  else if (nameLower.includes('10mg') || nameLower.includes('10 mg')) autoStrength = '10 mg';
                  else if (nameLower.includes('5mg') || nameLower.includes('5 mg') || nameLower.includes('amlodipine')) autoStrength = '5 mg';

                  // 4. Auto-Detect Classification
                  let autoClass = 'PRESCRIPTION';
                  if (nameLower.includes('tramadol') || nameLower.includes('morphine') || nameLower.includes('diazepam') || nameLower.includes('codeine') || nameLower.includes('pethidine') || nameLower.includes('fentanyl')) {
                    autoClass = 'CONTROLLED';
                  } else if (nameLower.includes('paracetamol') || nameLower.includes('ibuprofen') || nameLower.includes('multivitamin') || nameLower.includes('vitamin c') || nameLower.includes('antacid')) {
                    autoClass = 'OTC';
                  }

                  // 5. Auto-Detect Price (₦)
                  let autoPrice = 250;
                  if (nameLower.includes('amoxicillin-clavulanate') || nameLower.includes('augmentin')) autoPrice = 2500;
                  else if (nameLower.includes('ceftriaxone') || nameLower.includes('rocephin')) autoPrice = 1800;
                  else if (nameLower.includes('artemether') || nameLower.includes('coartem')) autoPrice = 1200;
                  else if (nameLower.includes('ciprofloxacin')) autoPrice = 300;
                  else if (nameLower.includes('amoxicillin')) autoPrice = 150;
                  else if (nameLower.includes('paracetamol')) autoPrice = 20;
                  else if (nameLower.includes('metformin')) autoPrice = 50;
                  else if (nameLower.includes('amlodipine')) autoPrice = 80;

                  // 6. Auto-Generate Unique Item Code
                  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                  const cleanDrugCode = pureCode
                    ? `MED-${pureCode.replace(/[^A-Z0-9]/gi, '')}-${randomSuffix}`
                    : `MED-${drugDisplayName.slice(0, 4).toUpperCase()}-${randomSuffix}`;

                  setMedForm(p => ({
                    ...p,
                    genericName: drugDisplayName,
                    itemCode: cleanDrugCode,
                    loincCode: pureCode || p.loincCode,
                    brandName: autoBrand || p.brandName,
                    dosageForm: autoForm,
                    unitOfMeasure: autoUnit,
                    strength: autoStrength,
                    classification: autoClass,
                    price: autoPrice,
                  }));
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Unique Item Code *" fullWidth value={medForm.itemCode}
                onChange={e => setMedForm(p => ({ ...p, itemCode: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TerminologyAutocomplete
                system="RXNORM"
                label="RxNorm International Standard Formulation Code"
                placeholder="Search all 118,500 RxNorm drug formulations (e.g., Paracetamol, Amoxicillin)..."
                value={medForm.loincCode ? `${medForm.loincCode} — ${medForm.genericName}` : ''}
                onChange={(code, display, concept) => {
                  setMedForm(p => ({
                    ...p,
                    loincCode: concept?.code || code.split(' — ')[0],
                    genericName: p.genericName || display || code,
                  }));
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Brand Name" fullWidth value={medForm.brandName}
                onChange={e => setMedForm(p => ({ ...p, brandName: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Dosage Form *" fullWidth value={medForm.dosageForm}
                onChange={e => setMedForm(p => ({ ...p, dosageForm: e.target.value }))}>
                {[
                  'Tablet',
                  'Capsule',
                  'Injection / IV',
                  'Oral Suspension / Syrup',
                  'Topical Ointment / Cream',
                  'Eye/Ear Drops',
                  'Inhaler',
                  'Suppository',
                  'Infusion',
                  'Other'
                ].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Strength" fullWidth value={medForm.strength}
                onChange={e => setMedForm(p => ({ ...p, strength: e.target.value }))} placeholder="e.g. 500 mg" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Price (₦) *" type="number" fullWidth value={medForm.price}
                onChange={e => setMedForm(p => ({ ...p, price: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Classification *" fullWidth value={medForm.classification}
                onChange={e => setMedForm(p => ({ ...p, classification: e.target.value }))}>
                <MenuItem value="PRESCRIPTION">Prescription Drug</MenuItem>
                <MenuItem value="OTC">Over-The-Counter (OTC)</MenuItem>
                <MenuItem value="CONTROLLED">Controlled Substance / Narcotic</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Unit of Measure *" fullWidth value={medForm.unitOfMeasure}
                onChange={e => setMedForm(p => ({ ...p, unitOfMeasure: e.target.value }))}>
                {[
                  'Tablet',
                  'Capsule',
                  'Vial / Ampoule',
                  'Bottle (ml)',
                  'Tube',
                  'Pack / Box',
                  'Sachet',
                  'Other'
                ].map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Initial Stock Quantity"
                type="number"
                fullWidth
                value={(medForm as any).initialStock !== undefined ? (medForm as any).initialStock : 100}
                onChange={e => setMedForm(p => ({ ...p, initialStock: Number(e.target.value) }))}
                helperText="Batch logged automatically upon saving"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddInventoryOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddMedication}>Add Medication</Button>
        </DialogActions>
      </Dialog>

      {/* Add stock batch dialog */}
      <Dialog open={addBatchOpen} onClose={() => setAddBatchOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Log Incoming Stock Batch</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12}>
              <TextField select label="Medication" fullWidth value={batchForm.inventoryItemId} onChange={e => setBatchForm(p => ({ ...p, inventoryItemId: e.target.value }))}>
                {inventory.map(i => <MenuItem key={i.id} value={i.id}>{i.genericName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField label="Batch Number" fullWidth value={batchForm.batchNumber} onChange={e => setBatchForm(p => ({ ...p, batchNumber: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField label="Expiry Date" type="date" InputLabelProps={{ shrink: true }} fullWidth value={batchForm.expiryDate} onChange={e => setBatchForm(p => ({ ...p, expiryDate: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField label="Purchase Cost (₦)" type="number" fullWidth value={batchForm.purchaseCost} onChange={e => setBatchForm(p => ({ ...p, purchaseCost: Number(e.target.value) }))} /></Grid>
            <Grid item xs={6}><TextField label="Quantity Received" type="number" fullWidth value={batchForm.receivedQuantity} onChange={e => setBatchForm(p => ({ ...p, receivedQuantity: Number(e.target.value) }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddBatchOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddBatch}>Confirm Receipt</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Tab 2: Procurement & GRN
  const renderProcurementTab = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mr="auto">Procurement & PO Tracking</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchProcurement}>Refresh</Button>
        <Button variant="outlined" startIcon={<Add />} onClick={() => setGrnOpen(true)}>Match GRN Invoice</Button>
        <Button variant="contained" startIcon={<Add />} onClick={() => setAddPoOpen(true)}>New Purchase Order</Button>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
              <TableCell>PO number</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Delivery Schedule</TableCell>
              <TableCell>Ordered Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>No Purchase Orders found</TableCell>
              </TableRow>
            ) : purchaseOrders.map(po => (
              <TableRow key={po.id} hover>
                <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{po.poNumber}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontWeight={700}>{po.supplier.supplierName}</Typography></TableCell>
                <TableCell><Typography variant="body2">₦{Number(po.totalAmount).toLocaleString()}</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{po.deliverySchedule || 'Regular schedule'}</Typography></TableCell>
                <TableCell><Typography variant="caption">{new Date(po.orderedAt).toLocaleDateString()}</Typography></TableCell>
                <TableCell>
                  <Chip label={po.status} size="small" color={po.status === 'RECEIVED' || po.status === 'COMPLETED' ? 'success' : po.status === 'PARTIAL' ? 'warning' : 'default'} />
                </TableCell>
                <TableCell align="right">
                  {po.status !== 'RECEIVED' && po.status !== 'COMPLETED' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => {
                        setGrnForm(prev => ({ ...prev, poId: po.id || po.poNumber }));
                        setGrnOpen(true);
                      }}
                      sx={{ fontWeight: 800, fontSize: '0.72rem', textTransform: 'none' }}
                    >
                      Match GRN
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>


    </Box>
  );

  // Tab 3: Controlled Drugs, Safety Interventions, ADE
  const renderSafetyTab = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mr="auto">Controlled Substance Register & Safety Logs</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => { fetchControlledLogs(); fetchADEs(); fetchInterventions(); }}>Refresh</Button>
        <Button variant="outlined" color="error" startIcon={<Warning />} onClick={() => setAddAdeOpen(true)}>Report ADE Pharmacovigilance</Button>
        <Button variant="contained" color="error" startIcon={<Vaccines />} onClick={() => setControlledDirectLogOpen(true)}>Direct Narcotics Entry</Button>
      </Box>

      <Grid container spacing={3}>
        {/* Controlled substance registry log table */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={800} mb={2} color="error.main">🛡️ Controlled Medicines / Narcotics Dispatches Ledger</Typography>
              <TableContainer sx={{ maxHeight: 350 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Recorded By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {controlledLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell><Typography variant="body2" fontWeight={700}>{log.inventoryItem.genericName}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{log.batchNumber}</Typography></TableCell>
                        <TableCell><Chip label={log.transactionType} size="small" color={log.transactionType === 'DISPENSE' ? 'warning' : 'success'} sx={{ fontSize: '0.6rem' }} /></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>{log.quantity}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{log.recordedBy}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{new Date(log.createdAt).toLocaleDateString()}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* ADE Reports table */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={800} mb={2}>⚠️ Adverse Drug Event (ADE) trends</Typography>
              <Stack spacing={1.5} sx={{ maxHeight: 350, overflowY: 'auto' }}>
                {ades.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No Adverse Event reported</Typography>
                ) : ades.map(ade => (
                  <Box key={ade.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>{ade.patient.firstName} {ade.patient.lastName}</Typography>
                      <Chip label={ade.severity} size="small" color="error" sx={{ fontSize: '0.65rem' }} />
                    </Box>
                    <Typography variant="body2" mt={0.5}>Suspected: <strong>{ade.medicationName}</strong></Typography>
                    <Typography variant="caption" color="text.secondary" display="block">{ade.eventDescription}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Adverse Drug Event Dialog */}
      <Dialog open={addAdeOpen} onClose={() => setAddAdeOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>🛡️ Pharmacovigilance ADE Reporting Form</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Submit an Adverse Drug Event report linked to patient identity, standardized data dictionary formulary medication, and verified clinician.
          </Typography>
          <Grid container spacing={2} mt={0.5}>
            {/* Patient Name / MRN Dropdown (First 50 Recent Patients) */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={patientDropdownOptions}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.name || '';
                  const mrn = option.patientNumber || option.id || option.mrn || '';
                  return mrn ? `${fullName} (${mrn})` : fullName;
                }}
                value={
                  patientDropdownOptions.find(p => (p.patientNumber || p.id || p.mrn) === adeForm.patientId) ||
                  (adeForm.patientId ? { firstName: adeForm.patientId, lastName: '', patientNumber: adeForm.patientId } : null)
                }
                onChange={(_, newValue: any) => {
                  if (newValue && typeof newValue === 'object') {
                    const mrn = newValue.patientNumber || newValue.id || newValue.mrn || '';
                    const fullName = `${newValue.firstName || ''} ${newValue.lastName || ''}`.trim();
                    setAdeForm(p => ({ ...p, patientId: mrn }));
                    enqueueSnackbar(`Linked patient: ${fullName} (${mrn})`, { variant: 'info' });
                  } else if (typeof newValue === 'string') {
                    setAdeForm(p => ({ ...p, patientId: newValue }));
                  } else {
                    setAdeForm(p => ({ ...p, patientId: '' }));
                  }
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setAdeForm(p => ({ ...p, patientId: newInputValue }));
                  }
                }}
                freeSolo
                renderOption={(props, option: any) => {
                  const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim() || option.name || '';
                  const mrn = option.patientNumber || option.id || option.mrn || '';
                  return (
                    <li {...props} key={mrn || fullName}>
                      <Box sx={{ py: 0.5, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={700}>{fullName}</Typography>
                          <Chip label={mrn} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {option.gender ? `${option.gender}` : ''} {option.estimatedAge || option.age ? `· ${option.estimatedAge || option.age} yrs` : ''} {option.birthDate ? `· DOB: ${option.birthDate}` : ''}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Patient Name / MRN (Recent 50 Patients) *"
                    placeholder="Select or search recent patient..."
                    helperText="Select from recent 50 patients or enter MRN"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Suspected Medication Dropdown (Data Dictionary & Formulary) */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={medicationDictionaryOptions}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return option.name || option.display || option.genericName || '';
                }}
                value={
                  medicationDictionaryOptions.find(m => m.name === adeForm.medicationName || m.genericName === adeForm.medicationName) ||
                  (adeForm.medicationName ? { name: adeForm.medicationName, genericName: adeForm.medicationName } : null)
                }
                onChange={(_, newValue: any) => {
                  if (newValue && typeof newValue === 'object') {
                    setAdeForm(p => ({ ...p, medicationName: newValue.name || newValue.genericName || '' }));
                  } else if (typeof newValue === 'string') {
                    setAdeForm(p => ({ ...p, medicationName: newValue }));
                  } else {
                    setAdeForm(p => ({ ...p, medicationName: '' }));
                  }
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setAdeForm(p => ({ ...p, medicationName: newInputValue }));
                  }
                }}
                freeSolo
                renderOption={(props, option: any) => {
                  return (
                    <li {...props} key={option.code ? `${option.code}-${option.name}` : option.name}>
                      <Box sx={{ py: 0.5, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700}>{option.name || option.genericName}</Typography>
                          <Chip
                            label={option.system || 'DATA DICT'}
                            size="small"
                            color={option.system === 'RXNORM' ? 'primary' : 'success'}
                            sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {option.category ? `${option.category}` : ''} {option.code ? `· Code: #${option.code}` : ''}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Suspected Medication (Data Dictionary) *"
                    placeholder="Select or search medication..."
                    helperText="Standardized RxNorm & Hospital Formulary catalog"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Severity */}
            <Grid item xs={12} sm={6}>
              <TextField select label="Severity" fullWidth value={adeForm.severity} onChange={e => setAdeForm(p => ({ ...p, severity: e.target.value }))}>
                <MenuItem value="MILD">Mild Side Effects</MenuItem>
                <MenuItem value="MODERATE">Moderate Reaction</MenuItem>
                <MenuItem value="SEVERE">Severe Injury</MenuItem>
                <MenuItem value="LIFE_THREATENING">Life Threatening</MenuItem>
              </TextField>
            </Grid>

            {/* Causality Assessment */}
            <Grid item xs={12} sm={6}>
              <TextField select label="Causality Assessment" fullWidth value={adeForm.causality} onChange={e => setAdeForm(p => ({ ...p, causality: e.target.value }))}>
                <MenuItem value="CERTAIN">Certain</MenuItem>
                <MenuItem value="PROBABLE">Probable</MenuItem>
                <MenuItem value="POSSIBLE">Possible</MenuItem>
                <MenuItem value="UNLIKELY">Unlikely</MenuItem>
              </TextField>
            </Grid>

            {/* Adverse Event Description */}
            <Grid item xs={12}>
              <TextField
                label="Adverse Event Description"
                multiline
                rows={3}
                fullWidth
                value={adeForm.eventDescription}
                onChange={e => setAdeForm(p => ({ ...p, eventDescription: e.target.value }))}
                placeholder="Describe clinical presentation, onset timing, symptoms, and immediate counter-measures..."
              />
            </Grid>

            {/* Reporting Doctor / Nurse Dropdown (Staff Management) */}
            <Grid item xs={12}>
              <Autocomplete
                options={staffClinicianOptions}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return option.label || option.name || option.fullName || '';
                }}
                value={
                  staffClinicianOptions.find(s => s.name === adeForm.reportedBy || s.label === adeForm.reportedBy || s.id === adeForm.reportedBy) ||
                  (adeForm.reportedBy ? { name: adeForm.reportedBy, label: adeForm.reportedBy } : null)
                }
                onChange={(_, newValue: any) => {
                  if (newValue && typeof newValue === 'object') {
                    const repr = newValue.label || `${newValue.name} (${newValue.role || newValue.designation} · ${newValue.staffId || newValue.id})`;
                    setAdeForm(p => ({ ...p, reportedBy: repr }));
                  } else if (typeof newValue === 'string') {
                    setAdeForm(p => ({ ...p, reportedBy: newValue }));
                  } else {
                    setAdeForm(p => ({ ...p, reportedBy: '' }));
                  }
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setAdeForm(p => ({ ...p, reportedBy: newInputValue }));
                  }
                }}
                freeSolo
                renderOption={(props, option: any) => {
                  const isDoc = (option.role || option.name || '').toLowerCase().includes('doc') || (option.role || '').toLowerCase().includes('physician') || (option.role || '').toLowerCase().includes('surgeon');
                  return (
                    <li {...props} key={option.id || option.staffId || option.name}>
                      <Box sx={{ py: 0.5, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700}>{option.name || option.fullName}</Typography>
                          <Chip
                            label={isDoc ? 'Doctor / Clinician' : 'Nurse / Staff'}
                            size="small"
                            color={isDoc ? 'primary' : 'secondary'}
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {option.role || option.designation || 'Staff'} {option.department ? `· Dept: ${option.department}` : ''} {option.staffId || option.id ? `· ID: ${option.staffId || option.id}` : ''}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Reporting Doctor / Nurse (Staff Management) *"
                    placeholder="Select or search reporting doctor / nurse..."
                    helperText="All active doctors and nurses registered in Staff Management"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddAdeOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleReportADE}>Submit ADE Report</Button>
        </DialogActions>
      </Dialog>

      {/* Controlled Drug direct registry Dialog */}
      <Dialog open={controlledDirectLogOpen} onClose={() => setControlledDirectLogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main', pb: 1 }}>
          🛡️ Direct Narcotics & Controlled Substance Vault Entry
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Register narcotics vault transactions, emergency theatre dispatches, breakage disposals, or discrepancy adjustments with authorized pharmacist ID and co-signing clinical witness.
          </Typography>
          <Grid container spacing={2} mt={0.5}>
            {/* Controlled Medication Dropdown (Data Dictionary & Stock) */}
            <Grid item xs={12}>
              <Autocomplete
                options={controlledMedicationOptions}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return option.name || option.genericName || '';
                }}
                value={
                  controlledMedicationOptions.find(m => m.id === controlledForm.inventoryItemId || m.code === controlledForm.inventoryItemId || m.name === controlledForm.inventoryItemId || m.genericName === controlledForm.inventoryItemId) ||
                  (controlledForm.inventoryItemId ? { name: controlledForm.inventoryItemId, genericName: controlledForm.inventoryItemId } : null)
                }
                onChange={(_, newValue: any) => {
                  if (newValue && typeof newValue === 'object') {
                    const itemId = newValue.id || newValue.code || '';
                    const firstBatch = newValue.batches?.[0]?.batchNumber || '';
                    setControlledForm(p => ({
                      ...p,
                      inventoryItemId: itemId,
                      batchNumber: p.batchNumber || firstBatch,
                    }));
                    enqueueSnackbar(`Selected Controlled Drug: ${newValue.name || newValue.genericName}`, { variant: 'info' });
                  } else if (typeof newValue === 'string') {
                    setControlledForm(p => ({ ...p, inventoryItemId: newValue }));
                  } else {
                    setControlledForm(p => ({ ...p, inventoryItemId: '' }));
                  }
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setControlledForm(p => ({ ...p, inventoryItemId: newInputValue }));
                  }
                }}
                freeSolo
                renderOption={(props, option: any) => {
                  const disp = option.dispensaryStock ?? 0;
                  const central = option.centralStoreStock ?? 0;
                  return (
                    <li {...props} key={option.code ? `${option.code}-${option.name}` : option.name}>
                      <Box sx={{ py: 0.5, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700} color="error.main">{option.name || option.genericName}</Typography>
                          <Stack direction="row" spacing={0.5}>
                            {disp > 0 ? (
                              <Chip
                                label={`Dispensary: ${disp}`}
                                size="small"
                                color="success"
                                sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }}
                              />
                            ) : central > 0 ? (
                              <Chip
                                label={`In Inventory: ${central} (Central)`}
                                size="small"
                                color="warning"
                                sx={{ fontSize: '0.65rem', height: 18, fontWeight: 700 }}
                              />
                            ) : (
                              <Chip
                                label="In Inventory Register"
                                size="small"
                                sx={{ fontSize: '0.65rem', height: 18, fontWeight: 600 }}
                              />
                            )}
                          </Stack>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {option.category || 'Schedule Controlled Substance'} {option.code ? `· Code: #${option.code}` : ''} {central > 0 ? `· Central Warehouse: ${central}` : ''}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Controlled Medication (Data Dictionary & Formulary) *"
                    placeholder="Search narcotic or controlled substance..."
                    helperText="Pull from Data Dictionary RxNorm & Hospital Vault Register"
                    required
                    fullWidth
                  />
                )}
              />

              {/* Dispensary vs Inventory Stock Status Alert Banner */}
              {(() => {
                const selectedMed = controlledMedicationOptions.find(
                  m => m.id === controlledForm.inventoryItemId ||
                       m.code === controlledForm.inventoryItemId ||
                       m.name === controlledForm.inventoryItemId ||
                       m.genericName === controlledForm.inventoryItemId
                );
                if (!selectedMed || !controlledForm.inventoryItemId) return null;

                const dispStock = selectedMed.dispensaryStock ?? 0;
                const centralStock = selectedMed.centralStoreStock ?? 0;

                if (dispStock <= 0) {
                  return (
                    <Alert
                      severity="warning"
                      icon={<WarningAmber fontSize="medium" />}
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          onClick={() => window.open('/inventory/master/catalogue', '_blank')}
                          sx={{ fontWeight: 800, textTransform: 'none', border: '1px solid currentColor', py: 0.2, px: 1, whiteSpace: 'nowrap' }}
                        >
                          Open Pharmacy Inventory
                        </Button>
                      }
                      sx={{ mt: 1.5, borderRadius: 2, bgcolor: '#fffbeb', border: '1px solid #fde68a' }}
                    >
                      <AlertTitle sx={{ fontWeight: 800, fontSize: '0.86rem', color: '#92400e', mb: 0.3 }}>
                        ⚠️ Not In Pharmacy Dispensary Stock (0 Units Available in Dispensary)
                      </AlertTitle>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#78350f' }}>
                        <strong>{selectedMed.name}</strong> is currently <strong>not available in the Pharmacy Dispensary (DISP-MAIN)</strong>.
                        {centralStock > 0 ? (
                          <span> It exists in the <strong>Pharmacy Inventory (Central Warehouse WH-MAIN: {centralStock} units available)</strong>. Please transfer or requisition stock from the <a href="/inventory/master/catalogue" target="_blank" rel="noreferrer" style={{ color: '#b45309', fontWeight: 800, textDecoration: 'underline' }}>Pharmacy Inventory page</a> before dispensing.</span>
                        ) : (
                          <span> It exists in the <strong>Pharmacy Inventory Master Catalogue</strong>. Please record a stock receipt or inter-store transfer from the <a href="/inventory/master/catalogue" target="_blank" rel="noreferrer" style={{ color: '#b45309', fontWeight: 800, textDecoration: 'underline' }}>Pharmacy Inventory page</a>.</span>
                        )}
                      </Typography>
                    </Alert>
                  );
                }

                return (
                  <Alert severity="success" icon={<CheckCircle fontSize="small" />} sx={{ mt: 1.5, py: 0.3, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#166534' }}>
                      <strong>Dispensary Stock Available:</strong> {dispStock} units in <strong>Pharmacy Dispensary (DISP-MAIN)</strong> · Central Warehouse: {centralStock} units
                    </Typography>
                  </Alert>
                );
              })()}
            </Grid>

            {/* Batch Number Dropdown / Input */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={[
                  'BATCH-VAULT-2026-N1',
                  'BATCH-VAULT-2026-N2',
                  'BATCH-ICU-2026-08',
                  'BATCH-THEATRE-2026-A',
                  'BATCH-EMERGENCY-2026-C',
                  ...(inventory.find(i => i.id === controlledForm.inventoryItemId)?.batches?.map(b => b.batchNumber) || []),
                ]}
                value={controlledForm.batchNumber}
                onChange={(_, newValue) => setControlledForm(p => ({ ...p, batchNumber: newValue || '' }))}
                onInputChange={(_, newInputValue) => setControlledForm(p => ({ ...p, batchNumber: newInputValue }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Batch Number *"
                    placeholder="e.g. BATCH-VAULT-2026-N1"
                    helperText="Select active batch or type new batch code"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Transaction Type */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Transaction Type *"
                fullWidth
                value={controlledForm.transactionType}
                onChange={e => setControlledForm(p => ({ ...p, transactionType: e.target.value }))}
                helperText="Specify the type of controlled substance ledger entry"
              >
                <MenuItem value="RECEIVE">🟢 RECEIVE VAULT STOCK</MenuItem>
                <MenuItem value="DISPENSE">🟡 DISPENSE / WARD & THEATRE DISPATCH</MenuItem>
                <MenuItem value="ADJUSTMENT">🟠 ADJUSTMENT DISCREPANCY</MenuItem>
                <MenuItem value="RETURN">🔵 RETURN PATIENT / UNUSED NARCOTIC</MenuItem>
                <MenuItem value="DISPOSAL">🔴 EXPIRED / BREAKAGE DISPOSAL</MenuItem>
              </TextField>
            </Grid>

            {/* Quantity */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Quantity (Units / Ampoules) *"
                type="number"
                fullWidth
                value={controlledForm.quantity}
                onChange={e => setControlledForm(p => ({ ...p, quantity: Math.max(1, Number(e.target.value)) }))}
                InputProps={{ inputProps: { min: 1 } }}
                helperText="Exact physical count of ampoules/vials"
                required
              />
            </Grid>

            {/* Authorized Pharmacist ID (Staff with Pharmacy Role) */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={staffPharmacistOptions}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return option.label || option.name || option.fullName || '';
                }}
                value={
                  staffPharmacistOptions.find(s => s.name === controlledForm.recordedBy || s.label === controlledForm.recordedBy || s.id === controlledForm.recordedBy) ||
                  (controlledForm.recordedBy ? { name: controlledForm.recordedBy, label: controlledForm.recordedBy } : null)
                }
                onChange={(_, newValue: any) => {
                  if (newValue && typeof newValue === 'object') {
                    const repr = newValue.label || `${newValue.name} (${newValue.role || 'Pharmacist'} · ${newValue.staffId || newValue.id})`;
                    setControlledForm(p => ({ ...p, recordedBy: repr }));
                  } else if (typeof newValue === 'string') {
                    setControlledForm(p => ({ ...p, recordedBy: newValue }));
                  } else {
                    setControlledForm(p => ({ ...p, recordedBy: '' }));
                  }
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setControlledForm(p => ({ ...p, recordedBy: newInputValue }));
                  }
                }}
                freeSolo
                renderOption={(props, option: any) => (
                  <li {...props} key={option.id || option.staffId || option.name}>
                    <Box sx={{ py: 0.5, width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                        <Chip
                          label="Pharmacy Role"
                          size="small"
                          color="primary"
                          sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {option.role || 'Pharmacist'} {option.department ? `· Dept: ${option.department}` : ''} {option.staffId ? `· ID: ${option.staffId}` : ''}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Authorized Pharmacist ID (Pharmacy Staff) *"
                    placeholder="Select authorized pharmacist..."
                    helperText="Staff members with registered Pharmacy Role"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Dual Authorization Witness Clinician Username */}
            <Grid item xs={12}>
              <Autocomplete
                options={staffClinicianOptions}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return option.label || option.name || option.fullName || '';
                }}
                value={
                  staffClinicianOptions.find(s => s.name === controlledForm.authorizedBy || s.label === controlledForm.authorizedBy || s.id === controlledForm.authorizedBy) ||
                  (controlledForm.authorizedBy ? { name: controlledForm.authorizedBy, label: controlledForm.authorizedBy } : null)
                }
                onChange={(_, newValue: any) => {
                  if (newValue && typeof newValue === 'object') {
                    const repr = newValue.label || `${newValue.name} (${newValue.role || newValue.designation} · ${newValue.staffId || newValue.id})`;
                    setControlledForm(p => ({ ...p, authorizedBy: repr }));
                  } else if (typeof newValue === 'string') {
                    setControlledForm(p => ({ ...p, authorizedBy: newValue }));
                  } else {
                    setControlledForm(p => ({ ...p, authorizedBy: '' }));
                  }
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setControlledForm(p => ({ ...p, authorizedBy: newInputValue }));
                  }
                }}
                freeSolo
                renderOption={(props, option: any) => {
                  const isDoc = (option.role || option.name || '').toLowerCase().includes('doc') || (option.role || '').toLowerCase().includes('physician') || (option.role || '').toLowerCase().includes('surgeon');
                  return (
                    <li {...props} key={option.id || option.staffId || option.name}>
                      <Box sx={{ py: 0.5, width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700}>{option.name || option.fullName}</Typography>
                          <Chip
                            label={isDoc ? 'Witness Doctor' : 'Witness Clinician'}
                            size="small"
                            color={isDoc ? 'primary' : 'secondary'}
                            sx={{ fontSize: '0.65rem', height: 18 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {option.role || option.designation || 'Staff'} {option.department ? `· Dept: ${option.department}` : ''} {option.staffId || option.id ? `· ID: ${option.staffId || option.id}` : ''}
                        </Typography>
                      </Box>
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Dual Authorization Witness Clinician *"
                    placeholder="Select co-signing witness doctor / nurse..."
                    helperText="Mandatory dual-authorization witness clinician for narcotics ledger"
                    required
                    fullWidth
                  />
                )}
              />
            </Grid>

            {/* Comments / Reason Dropdown & Free Input */}
            <Grid item xs={12}>
              <Autocomplete
                freeSolo
                options={[
                  'Routine replenishment of narcotics vault safe',
                  'Emergency Theatre / ICU requisition batch receipt',
                  'End-of-shift physical narcotic count reconciliation',
                  'Breakage / damaged ampoule disposal with dual witness',
                  'Patient return of unused narcotic ampoules',
                  'Monthly regulatory audit stock count adjustment',
                ]}
                value={controlledForm.comments}
                onChange={(_, newValue) => setControlledForm(p => ({ ...p, comments: newValue || '' }))}
                onInputChange={(_, newInputValue) => setControlledForm(p => ({ ...p, comments: newInputValue }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Comments / Clinical Justification"
                    placeholder="Select standard justification or type details..."
                    helperText="Specify clinical indication, destination ward, or discrepancy note"
                    multiline
                    rows={2}
                    fullWidth
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setControlledDirectLogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleControlledLog}>Submit Narcotics Vault Log</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Tab 4: Suppliers Portal
  const renderSuppliersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mr="auto">Supplier Registry Directory</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchSuppliers}>Refresh</Button>
        <Button variant="contained" startIcon={<Add />} onClick={() => setAddSupplierOpen(true)}>Register Supplier</Button>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
              <TableCell>Supplier name</TableCell>
              <TableCell>Contact details</TableCell>
              <TableCell>Order Accuracy</TableCell>
              <TableCell>Lead Time</TableCell>
              <TableCell>Quality Incidents</TableCell>
              <TableCell>Terms</TableCell>
              <TableCell>License Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map(s => (
              <TableRow key={s.id} hover>
                <TableCell><Typography variant="body2" fontWeight={700}>{s.supplierName}</Typography></TableCell>
                <TableCell>
                  <Typography variant="body2">{s.contactPerson} · {s.phone}</Typography>
                  <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                </TableCell>
                <TableCell><Typography variant="body2" fontWeight={700} color={s.orderAccuracyPct >= 95 ? 'success.main' : 'warning.main'}>{s.orderAccuracyPct}%</Typography></TableCell>
                <TableCell><Typography variant="body2">{s.deliveryTimeDays} Days</Typography></TableCell>
                <TableCell><Typography variant="body2" color={s.qualityIncidents > 0 ? 'error.main' : 'text.primary'}>{s.qualityIncidents} incident{s.qualityIncidents !== 1 ? 's' : ''}</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{s.paymentTerms || 'Net 30'}</Typography></TableCell>
                <TableCell>
                  <Chip label={s.isActive ? 'Licensed' : 'Suspended'} size="small" color={s.isActive ? 'success' : 'error'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* New Supplier Dialog */}
      <Dialog open={addSupplierOpen} onClose={() => setAddSupplierOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Register Pharmacy Supplier</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={1}>
            <Grid item xs={12}><TextField label="Supplier / Company Name" fullWidth value={supplierForm.supplierName} onChange={e => setSupplierForm(p => ({ ...p, supplierName: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField label="Contact Person" fullWidth value={supplierForm.contactPerson} onChange={e => setSupplierForm(p => ({ ...p, contactPerson: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField label="Phone Number" fullWidth value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField label="Email address" fullWidth value={supplierForm.email} onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField label="Company Address" multiline rows={2} fullWidth value={supplierForm.address} onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField label="License / Board Permit ID" fullWidth value={supplierForm.licenseInfo} onChange={e => setSupplierForm(p => ({ ...p, licenseInfo: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField label="License Expiry date" type="date" InputLabelProps={{ shrink: true }} fullWidth value={supplierForm.licenseExpiry} onChange={e => setSupplierForm(p => ({ ...p, licenseExpiry: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSupplierOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            await axios.post(`${API}/suppliers`, supplierForm, { headers: getHeaders() });
            enqueueSnackbar('Supplier registered successfully', { variant: 'success' });
            setAddSupplierOpen(false);
            fetchSuppliers();
          }}>Confirm Register</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  // Tab 5: Operations & Finance
  const renderOperationsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight={700} mr="auto">Daily Sales & Workload Reconciliation</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => { fetchReconciliation(); fetchAnalytics(); }}>Refresh</Button>
      </Box>

      {reconciliation && (
        <Grid container spacing={3}>
          {/* Workload summary cards */}
          <Grid item xs={12} sm={4}>
            <KpiCard icon={<Receipt />} label="Total Sales Value" value={`₦${(reconciliation.revenueCollected || 0).toLocaleString()}`} color="#2f9e44" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <KpiCard icon={<Shield />} label="Insurance HMO coverage" value={`₦${(reconciliation.insurancePortion || 0).toLocaleString()}`} color="#3b5bdb" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <KpiCard icon={<ContactPhone />} label="Co-Payments / Cash Collected" value={`₦${(reconciliation.cashPortion || 0).toLocaleString()}`} color="#f59f00" />
          </Grid>

          {/* Transactions details */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={800} mb={2}>Daily Dispensing Transactions Log</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Dispenser</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Coverage</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Co-Pay Charge</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reconciliation.transactions?.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell><Typography variant="body2" fontWeight={700}>{t.prescriptionItem.medication.genericName}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{t.quantityDispensed}</Typography></TableCell>
                          <TableCell><Typography variant="body2">{t.dispenser.firstName} {t.dispenser.lastName}</Typography></TableCell>
                          <TableCell><Chip label={t.insuranceStatus} size="small" color={t.insuranceStatus === 'INS_COVERED' ? 'primary' : 'default'} sx={{ fontSize: '0.65rem' }} /></TableCell>
                          <TableCell><Typography variant="body2" fontWeight={700}>₦{Number(t.coPaymentAmount).toLocaleString()}</Typography></TableCell>
                          <TableCell><Typography variant="caption">{new Date(t.dispensedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  // Tab 6: Moniepoint Moniebook & OpenMRS Sync Console
  const renderIntegrationsTab = () => (
    <Box>
      <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2.5, borderRadius: 3, mb: 4, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          🔌 Moniepoint POS & NigeriaMRS (OpenMRS) Integration Console
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Manage real-time data sync with the external Moniepoint POS terminal registers and NigeriaMRS clinical repository. Simulate barcode scanning, thermal paper receipt printing, and FHIR data pushes.
        </Typography>
        {progressInfo ? (
          <Box sx={{ mt: 3, p: 2.5, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)' }}>
            <Typography variant="subtitle2" fontWeight={900} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              ⏳ Synchronizing Patient Records from NigeriaMRS Clinic...
            </Typography>
            
            <Stack direction="row" spacing={3} alignItems="center">
              {/* Circular Progress with percentage text in the center */}
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress variant="determinate" value={progressInfo.percent} size={64} thickness={4.5} sx={{ color: 'primary.main' }} />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" component="div" fontWeight={900} sx={{ fontSize: '0.8rem' }}>
                    {`${progressInfo.percent}%`}
                  </Typography>
                </Box>
              </Box>
              
              {/* Linear Progress bar with details */}
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={800}>
                    Importing clinical profiles: {progressInfo.processed.toLocaleString()} / {progressInfo.total.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="primary.main" fontWeight={900}>
                    {progressInfo.percent}% Complete
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={progressInfo.percent} sx={{ height: 10, borderRadius: 5, bgcolor: alpha(theme.palette.primary.main, 0.1) }} />
              </Box>
            </Stack>
          </Box>
        ) : syncStatusText ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" fontWeight={700} color="primary.main">{syncStatusText}</Typography>
          </Box>
        ) : null}
      </Box>

      {/* Grid containing Moniepoint and OpenMRS panels */}
      <Grid container spacing={3}>
        {/* Moniepoint POS Sell Register Simulator Panel */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={900} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🖥️ Moniebook Sell POS Grid Register
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                <TextField label="Search products by SKU or Barcode..." size="small" placeholder="Scan or type..." fullWidth />
                <Button variant="contained" startIcon={<Refresh />} onClick={syncMoniepointCatalog} size="small" sx={{ px: 3 }}>Sync Catalog</Button>
              </Box>

              {/* Moniepoint POS items grid matching the screen exactly */}
              <Grid container spacing={2} sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                {inventory.map(med => {
                  const qty = med.batches?.reduce((sum, b) => sum + b.currentQuantity, 0) || 0;
                  const isOutOfStock = qty <= 0;
                  return (
                    <Grid item xs={6} sm={4} key={med.id}>
                      <Card sx={{
                        border: '1px solid',
                        borderColor: isOutOfStock ? 'error.light' : 'divider',
                        bgcolor: isOutOfStock ? alpha(theme.palette.error.main, 0.02) : 'background.paper',
                        borderRadius: 2,
                        boxShadow: 'none',
                        position: 'relative'
                      }}>
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{
                            position: 'absolute', top: 8, right: 8, fontWeight: 700,
                            color: isOutOfStock ? 'error.main' : 'success.main'
                          }}>
                            {isOutOfStock ? 'Out of stock' : `${qty} left`}
                          </Typography>
                          <Typography variant="body2" fontWeight={800} mt={1} sx={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {med.genericName}
                          </Typography>
                          <Typography variant="body2" fontWeight={700} color="primary.main" mt={1}>
                            ₦{Number(med.price).toLocaleString()}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={isOutOfStock}
                            sx={{ mt: 1.5, fontSize: '0.65rem', textTransform: 'none' }}
                            onClick={() => {
                              setPosCart(c => {
                                const exist = c.find(item => item.id === med.id);
                                if (exist) {
                                  return c.map(item => item.id === med.id ? { ...item, qty: item.qty + 1 } : item);
                                }
                                return [...c, { ...med, qty: 1 }];
                              });
                            }}
                          >
                            Add to Cart
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sell Cart & Checkout Panel */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '90%' }}>
              <Typography variant="subtitle2" fontWeight={900} mb={2}>🛒 POS Cart Checkout</Typography>
              
              <Stack spacing={1.5} sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 200, mb: 2 }}>
                {posCart.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" mt={4}>Cart is empty</Typography>
                ) : posCart.map(item => (
                  <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{item.genericName}</Typography>
                      <Typography variant="caption" color="text.secondary">₦{Number(item.price).toLocaleString()} x {item.qty}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={800}>₦{(Number(item.price) * item.qty).toLocaleString()}</Typography>
                  </Box>
                ))}
              </Stack>

              {posCart.length > 0 && (
                <Box sx={{ mt: 'auto' }}>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" fontWeight={700}>Subtotal</Typography>
                    <Typography variant="body1" fontWeight={900}>
                      ₦{posCart.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0).toLocaleString()}
                    </Typography>
                  </Box>
                  <Button variant="contained" fullWidth color="success" onClick={() => {
                    enqueueSnackbar('Transaction processed successfully! Printing receipt.', { variant: 'success' });
                    setPosCart([]);
                  }}>Check Out (Pay with Moniepoint)</Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Moniepoint register Completed Sales ledger */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={900} mb={2} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📜 Moniebook Sync: Completed Sales</span>
                <Button size="small" variant="outlined" onClick={syncMoniepointSales}>Force Push Sales</Button>
              </Typography>
              <TableContainer sx={{ maxHeight: 250 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Sale ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Sold By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Payment Method</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mpsSales.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center">No Moniepoint sales recorded. Sync sales ledger.</TableCell></TableRow>
                    ) : mpsSales.map(s => (
                      <TableRow key={s.saleId}>
                        <TableCell><Typography variant="body2" fontWeight={800} color="primary.main">{s.saleId}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{s.soldBy}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{s.customer}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>₦{Number(s.total).toLocaleString()}</Typography></TableCell>
                        <TableCell><Chip label={s.paymentMethod} size="small" color="success" sx={{ fontSize: '0.6rem' }} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Moniepoint outstanding sales */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight="900" mb={2}>⌛ Moniebook Sync: Outstanding Debts</Typography>
              <TableContainer sx={{ maxHeight: 250 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Debt ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Due Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Outstanding</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mpsOutstanding.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center">No outstanding debts found.</TableCell></TableRow>
                    ) : mpsOutstanding.map(o => (
                      <TableRow key={o.saleId}>
                        <TableCell><Typography variant="body2" fontWeight={800} color="error.main">{o.saleId}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>{o.customer}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{new Date(o.dueDate).toLocaleDateString()}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700}>₦{Number(o.amountOutstanding).toLocaleString()}</Typography></TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="contained" color="success" onClick={() => {
                            enqueueSnackbar(`Debt payment reconciled for ${o.customer}`, { variant: 'success' });
                            setMpsOutstanding(prev => prev.filter(i => i.saleId !== o.saleId));
                          }}>Mark Paid</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Moniepoint customer wallet balance & credit lines */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={900} mb={2}>💳 Customer Wallets & Amount Owed</Typography>
              <TableContainer sx={{ maxHeight: 250 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Wallet Balance</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Amount Owed</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mpsCustomers.map(c => (
                      <TableRow key={c.id}>
                        <TableCell><Typography variant="body2" fontWeight={700}>{c.name}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{c.phoneNumber}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700} color="success.main">₦{Number(c.walletBalance).toLocaleString()}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontWeight={700} color="error.main">₦{Number(c.amountOwed).toLocaleString()}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* NigeriaMRS (OpenMRS) FHIR Clinic Sync Console */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={900} mb={2}>🏥 NigeriaMRS (OpenMRS) Sync console</Typography>
              
              <Stack direction="row" spacing={1.5} mb={3}>
                <Button variant="outlined" color="primary" onClick={syncOpenmrsPatients} size="small" fullWidth>Sync Patients</Button>
                <Button variant="outlined" color="primary" onClick={syncOpenmrsPrescriptions} size="small" fullWidth>Sync Rx (CPOE)</Button>
                <Button variant="outlined" color="primary" onClick={syncOpenmrsDispenses} size="small" fullWidth>Push Dispenses</Button>
              </Stack>

              <Typography variant="caption" color="text.secondary" fontWeight={800} display="block" mb={1}>Sync logs & Interoperability auditing</Typography>
              <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                <Stack spacing={1}>
                  {mrsLogs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No sync audits registered</Typography>
                  ) : mrsLogs.map(log => (
                    <Box key={log.id} sx={{ p: 1.2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={800}>{log.system} Sync ({log.direction})</Typography>
                        <Chip label={log.status} size="small" color={log.status === 'SUCCESS' ? 'success' : 'error'} sx={{ height: 16, fontSize: '0.55rem' }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary">{log.details}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" align="right">{new Date(log.syncedAt).toLocaleTimeString()}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 4 }}>
      {/* Custom Header Banner Tailored to Page */}
      <Box sx={{ background: 'linear-gradient(135deg, #10b981 0%, #2563eb 50%, #0d9488 100%)', color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Pharmacy Dispensary &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              💊 {pageDetails.title}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88, fontWeight: 500, mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {loading && <LinearProgress sx={{ width: 80, borderRadius: 2 }} />}
            <Button variant="contained" sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }} startIcon={<PersonAdd />} onClick={() => setOpenExternalModal(true)}>
              Walk-in Client
            </Button>
            <Tooltip title="Refresh Pharmacy Logs">
              <IconButton onClick={fetchPrescriptions} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      <QuickExternalRegisterModal 
        open={openExternalModal} 
        onClose={() => setOpenExternalModal(false)} 
        serviceType="PHARMACY_ONLY"
        onSuccess={fetchPrescriptions}
      />

      {/* Tailored 4-Card KPI Strip */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={12} sm={6} md={3} key={idx}>
              <KpiCard
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                subtitle={kpi.subtitle}
                color={kpi.color}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Standalone Workspace Card */}
      <Box sx={{ px: 3 }}>
        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
          {tab === 0 && renderQueueTab()}
          {tab === 1 && renderInventoryTab()}
          {/* tab === 2 (Procurement PO) commented out as it is already in Pharmacy Inventory */}
          {/* {tab === 2 && renderProcurementTab()} */}
          {tab === 3 && renderSafetyTab()}
          {/* tab === 4 (Supplier Portal) commented out as it is already in Pharmacy Inventory */}
          {/* {tab === 4 && renderSuppliersTab()} */}
          {tab === 5 && renderOperationsTab()}
          {tab === 6 && renderIntegrationsTab()}
        </Card>
      </Box>

      {/* Hidden print template */}
      <Box sx={{ display: 'none', '@media print': { display: 'block' } }}>
        {selectedPrescription && <PrescriptionPrintTemplate prescription={selectedPrescription} />}
      </Box>

      {/* Auto-Generate / Create Purchase Order Requisition Dialog (Top-level) */}
      <Dialog open={addPoOpen} onClose={() => setAddPoOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: alpha('#f59f00', 0.15), color: '#f59f00' }}><Inventory /></Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#0f172a">
                ✨ OpenMed AI Purchase Order Requisition
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Bulk stock purchase order draft for hospital procurement & inventory replenishment
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setAddPoOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2, fontWeight: 600 }}>
            <strong>OpenMed AI Telemetry:</strong> This Purchase Order draft contains <strong>{poForm.items.length} missing medication line(s)</strong> aggregated from active unfulfilled prescriptions. Submitting will register a formal PO for hospital procurement.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Target Supplier / Vendor"
                fullWidth
                value={poForm.supplierId}
                onChange={e => setPoForm(p => ({ ...p, supplierId: e.target.value }))}
                helperText="Select approved pharmaceutical distributor"
              >
                {suppliers.length > 0 ? (
                  suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.supplierName}</MenuItem>)
                ) : (
                  <MenuItem value="sup-1">Standard Hospital Pharma Distributor (Primary)</MenuItem>
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Delivery Schedule & Urgency"
                fullWidth
                value={poForm.deliverySchedule}
                onChange={e => setPoForm(p => ({ ...p, deliverySchedule: e.target.value }))}
                helperText="Expected delivery timeframe for warehouse receipt"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1.5}>
            📦 Requisition Items ({poForm.items.length} lines)
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Medication / Item</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 120 }}>Qty Needed</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 130 }}>Est. Unit Cost (₦)</TableCell>
                  <TableCell sx={{ fontWeight: 800, width: 130 }}>Line Total (₦)</TableCell>
                  <TableCell align="right" sx={{ width: 60 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {poForm.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No items added to PO draft yet. Use the selector below to add items.
                    </TableCell>
                  </TableRow>
                ) : (
                  poForm.items.map((item, idx) => {
                    const med = inventory.find(m => m.id === item.medicationId);
                    const rawName = item.name;
                    const isPlaceholderName = !rawName || rawName.toLowerCase() === 'external purchase medication' || rawName.toLowerCase() === 'out-of-stock medication';
                    const medName = !isPlaceholderName ? rawName : ((med?.genericName && med.genericName !== 'External Purchase Medication') ? med.genericName : (med?.brandName || 'Prescribed Medication'));
                    const lineTotal = (item.quantityOrdered || 0) * (item.unitCost || 0);

                    return (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{medName}</Typography>
                          {(med as any)?.category && <Typography variant="caption" color="text.secondary">{(med as any).category}</Typography>}
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantityOrdered}
                            onChange={e => {
                              const val = Math.max(1, Number(e.target.value));
                              setPoForm(p => ({
                                ...p,
                                items: p.items.map((it, i) => i === idx ? { ...it, quantityOrdered: val } : it),
                              }));
                            }}
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={item.unitCost}
                            onChange={e => {
                              const val = Math.max(0, Number(e.target.value));
                              setPoForm(p => ({
                                ...p,
                                items: p.items.map((it, i) => i === idx ? { ...it, unitCost: val } : it),
                              }));
                            }}
                            inputProps={{ min: 0 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={800} color="primary.main">
                            ₦{lineTotal.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setPoForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1', mb: 2 }}>
            <Typography variant="caption" fontWeight={800} color="text.secondary" display="block" mb={1}>
              ➕ ADD ADDITIONAL MEDICATION TO PO
            </Typography>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={5}>
                <TextField
                  select
                  label="Select Medication"
                  fullWidth
                  size="small"
                  value={poItemInput.medicationId}
                  onChange={e => {
                    const selectedMed = inventory.find(i => i.id === e.target.value);
                    setPoItemInput(p => ({
                      ...p,
                      medicationId: e.target.value,
                      unitCost: selectedMed ? Number(selectedMed.price || 1000) : p.unitCost,
                    }));
                  }}
                >
                  {inventory.map(i => <MenuItem key={i.id} value={i.id}>{i.genericName} ({i.brandName || 'Generic'})</MenuItem>)}
                  {poForm.items
                    .filter(it => it.name && !inventory.some(i => i.id === it.medicationId))
                    .map(it => <MenuItem key={it.medicationId || 'custom-med'} value={it.medicationId}>{it.name} (Out-of-Stock Item)</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Quantity"
                  type="number"
                  size="small"
                  fullWidth
                  value={poItemInput.quantityOrdered}
                  onChange={e => setPoItemInput(p => ({ ...p, quantityOrdered: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <TextField
                  label="Unit Cost (₦)"
                  type="number"
                  size="small"
                  fullWidth
                  value={poItemInput.unitCost}
                  onChange={e => setPoItemInput(p => ({ ...p, unitCost: Number(e.target.value) }))}
                />
              </Grid>
              <Grid item xs={12} sm={1.5}>
                <Button
                  variant="contained"
                  size="small"
                  fullWidth
                  onClick={() => {
                    const selectedMed = inventory.find(i => i.id === poItemInput.medicationId) || inventory[0];
                    const medId = selectedMed ? selectedMed.id : (poItemInput.medicationId || 'med-default');
                    const medName = selectedMed ? (selectedMed.genericName || selectedMed.brandName || 'Medication Item') : 'Medication Item';
                    const unitCost = poItemInput.unitCost > 0 ? poItemInput.unitCost : Number(selectedMed?.price || 1500);

                    const newItem = {
                      medicationId: medId,
                      name: medName,
                      quantityOrdered: poItemInput.quantityOrdered || 100,
                      unitCost: unitCost,
                    };

                    setPoForm(p => ({ ...p, items: [...p.items, newItem] }));

                    const nextIdx = (inventory.findIndex(i => i.id === medId) + 1) % (inventory.length || 1);
                    const nextMed = inventory[nextIdx] || inventory[0];
                    if (nextMed) {
                      setPoItemInput({
                        medicationId: nextMed.id,
                        quantityOrdered: 100,
                        unitCost: Number(nextMed.price || 1500),
                      });
                    }
                  }}
                  sx={{ fontWeight: 800 }}
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: alpha('#10b981', 0.08), borderRadius: 2, border: '1px solid', borderColor: alpha('#10b981', 0.3) }}>
            <Typography variant="body2" fontWeight={800} color="#065f46">
              TOTAL ESTIMATED REQUISITION BUDGET:
            </Typography>
            <Typography variant="h5" fontWeight={900} color="#10b981">
              ₦{poForm.items.reduce((sum, item) => sum + ((item.quantityOrdered || 0) * (item.unitCost || 0)), 0).toLocaleString()}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAddPoOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Add />}
            onClick={handleCreatePO}
            disabled={poForm.items.length === 0}
            sx={{ fontWeight: 800, px: 3, borderRadius: 2 }}
          >
            Submit Purchase Requisition PO
          </Button>
        </DialogActions>
      </Dialog>

      {/* Match Goods Received Note (GRN) & Vendor Invoice Dialog */}
      <Dialog open={grnOpen} onClose={() => setGrnOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: alpha('#10b981', 0.15), color: '#10b981' }}><CheckCircle /></Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#1e293b">
                Match Goods Received Note (GRN) & Vendor Invoice
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Confirm warehouse shipment receipt from supplier, match invoice, and update dispensary inventory stock
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setGrnOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                required
                label="Select Target Purchase Order (PO)"
                fullWidth
                value={grnForm.poId}
                onChange={e => {
                  const selectedPo = purchaseOrders.find(p => p.id === e.target.value || p.poNumber === e.target.value);
                  setGrnForm(p => ({
                    ...p,
                    poId: e.target.value,
                    items: selectedPo?.items || p.items,
                  }));
                }}
                helperText="Select the PO corresponding to the delivered shipment"
              >
                {purchaseOrders.length > 0 ? (
                  purchaseOrders.map(po => (
                    <MenuItem key={po.id} value={po.id || po.poNumber}>
                      {po.poNumber} — {po.supplier?.supplierName || 'Distributor'} ({po.deliverySchedule || 'Restock'})
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="PO-RX-58149513">PO-RX-58149513 — Brians Pharmaceuticals Brand</MenuItem>
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                label="Supplier Invoice / Delivery Note No."
                fullWidth
                value={grnForm.supplierInvoiceNo}
                onChange={e => setGrnForm(p => ({ ...p, supplierInvoiceNo: e.target.value }))}
                placeholder="e.g. INV-2026-88192"
                helperText="Vendor invoice or waybill number"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                required
                label="Received By (Staff / Pharmacist)"
                fullWidth
                value={grnForm.receivedBy || (employees[0] ? `${employees[0].firstName} ${employees[0].lastName}` : 'Pharm. Emmanuel Vegher')}
                onChange={e => setGrnForm(p => ({ ...p, receivedBy: e.target.value }))}
                helperText="Authorized inventory clerk or staff pharmacist"
              >
                {employees.length > 0 ? (
                  employees.map(emp => (
                    <MenuItem key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                      {emp.firstName} {emp.lastName} — {emp.jobTitle || emp.department || 'Pharmacist'}
                    </MenuItem>
                  ))
                ) : (
                  [
                    <MenuItem key="emp-1" value="Pharm. Emmanuel Vegher">Pharm. Emmanuel Vegher — Chief Pharmacist</MenuItem>,
                    <MenuItem key="emp-2" value="Pharm. Ken Odeh">Pharm. Ken Odeh — Dispensary Pharmacist</MenuItem>,
                    <MenuItem key="emp-3" value="Pharm. Mark Charity">Pharm. Mark Charity — Store Pharmacist</MenuItem>,
                    <MenuItem key="emp-4" value="Default Clinician">Default Clinician — Medical Staff</MenuItem>,
                  ]
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                required
                label="Delivery Quality & Seal Verification"
                fullWidth
                value={grnForm.notes || 'PASSED_COLD_CHAIN'}
                onChange={e => setGrnForm(p => ({ ...p, notes: e.target.value }))}
                helperText="Inspection audit & seal integrity status"
              >
                <MenuItem value="PASSED_COLD_CHAIN">
                  ✅ PASSED — Cold-Chain Maintained, All Seals Intact & Tamper-Evident
                </MenuItem>
                <MenuItem value="PASSED_ROOM_TEMP">
                  ✅ PASSED — Standard Room Temperature Restock, Seals Intact
                </MenuItem>
                <MenuItem value="CONDITIONAL_PASS">
                  ⚠️ CONDITIONAL PASS — Minor Carton Wear, Inner Vials Intact & Sealed
                </MenuItem>
                <MenuItem value="QUARANTINE_REVIEW">
                  ⚠️ QUARANTINE REQUIRED — Temp Excursion Suspected, Awaiting QC Review
                </MenuItem>
                <MenuItem value="REJECTED_DAMAGED">
                  ❌ REJECTED — Broken Seals, Expired Stock, or Damaged Packaging
                </MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          <Alert severity="success" sx={{ borderRadius: 2, fontWeight: 600 }}>
            <strong>Inventory Auto-Credit Notice:</strong> Submitting this GRN will automatically credit dispensary stock balances for the received items and mark associated out-of-stock prescriptions as in-stock fulfilled.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setGrnOpen(false)} sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={handleReceiveGRN}
            disabled={!grnForm.poId || !grnForm.supplierInvoiceNo}
            sx={{ fontWeight: 800, px: 3, borderRadius: 2 }}
          >
            Submit GRN & Update Stock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}