import { useState, useEffect } from 'react';
import { assetUrl } from '../utils/assetUrl';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { TreatmentChartPrintTemplate } from '../components/TreatmentChartPrintTemplate';
import {
  Container, Typography, Paper, Grid, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Box, Avatar, Stack, Chip, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Tab, Tabs, List, ListItem, ListItemText,
  Select, MenuItem, FormControl, InputLabel, FormHelperText, Checkbox, FormControlLabel, TextField, Alert, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip, Radio, RadioGroup, FormLabel
} from '@mui/material';
import { Delete, Print, QrCode2, ArrowBack, FamilyRestroom, History, Shield, Info, Portrait, Link as LinkIcon, SwapHoriz, ExpandMore, CalendarToday, Sync, Description, Edit, Save, Close } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { EncounterPrintTemplate } from '../components/EncounterPrintTemplate';
import { LabReportPrintTemplate } from '../components/LabReportPrintTemplate';
import { PrescriptionPrintTemplate } from '../components/PrescriptionPrintTemplate';
import { RegistrationPrintTemplate } from '../components/RegistrationPrintTemplate';
import { useAuth } from '../contexts/AuthContext';
import { EsmFormEngine } from '../components/esm-form-engine';

// Dictionary mapping OpenMRS CIEL concept UUIDs and coded values to human-readable labels
const CIEL_NAME_DICTIONARY: Record<string, string> = {
  '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Yes',
  '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'No',
  '1085AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Refill / Follow-up',
  '160530AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Facility Pickup',
  '160531AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Community Pickup',
  '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Once daily (OD)',
  '160863AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Twice daily (BD)',
  '164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Adult 1st Line',
  '164513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Adult 2nd Line',
  '165702AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Adult 3rd Line',
  '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '1a: TDF + 3TC + DTG',
  '8a343013-0216-44e0-aefe-53909ffd5631': '1a: TDF + 3TC + DTG',
  '165682AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '1b: TDF + 3TC + EFV400',
  '165688AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': '2a: AZT + 3TC + ATV/r',
  '9b49eb5e-9ca9-4494-a2ff-f1d62b6feecc': 'ART (Antiretroviral Therapy)',
  'a291af62-d00e-4ace-a672-f6f965b325fe': 'Adult (>= 15 years)',
  '60882cd1-1f42-485b-8afb-cd988282251e': 'Facility-based Dispensing',
  '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Isoniazid (INH 300mg)',
  '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2': 'TDF/FTC (Truvada)',
  'dbf8a287-3c82-440b-bfc3-a4b9432f9183': 'Cotrimoxazole (CTX 960mg)',
  'fcd74eb9-c917-42b1-969a-696b15a5627c': '300mg',
  '5942eb74-1dca-4199-bd60-875b0fcc683a': '300mg / 200mg',
  'c03561ed-1402-4bfe-b95d-9547fe6b9bf7': '960mg',
  '166144AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Devolved',
  '166145AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Non-devolved',
  '165889AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Physically able to work',
  '165888AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Ambulatory',
  '165887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA': 'Bedridden',
};

export const formatObsSummary = (k: string, v: any): string => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return String(v);

  if (typeof v === 'string') {
    if (CIEL_NAME_DICTIONARY[v]) return CIEL_NAME_DICTIONARY[v];
    return v;
  }

  if (Array.isArray(v)) {
    if (v.length === 0) return 'None';
    const first = v[0];
    if (typeof first === 'object' && first !== null) {
      if (k.toLowerCase().includes('tb_prev')) {
        const drug = CIEL_NAME_DICTIONARY[first.tb_prev_drugs] || 'INH (Isoniazid)';
        const days = first.tb_prevDispensedInDays || first.qty_prescribed_tb_prev || '90';
        return `${drug} (${days} days / ${days} tabs)`;
      }
      if (k.toLowerCase().includes('prep')) {
        const drug = CIEL_NAME_DICTIONARY[first.prev_drugs] || 'TDF/FTC (PrEP)';
        const days = first.prepDispensedInDays || first.qty_prescribed_prev || '90';
        return `${drug} (${days} days)`;
      }
      if (k.toLowerCase().includes('oi_prophylaxis')) {
        const drug = CIEL_NAME_DICTIONARY[first.drugs_Cotrim] || 'Cotrimoxazole (CTX)';
        const days = first.oi_prophylaxisDispensedInDays || first.qty_prescribed_Cotrim || '90';
        return `${drug} (${days} days)`;
      }
      const label = first.label || first.name || first.drug || Object.values(first)[0];
      return `${typeof label === 'string' ? label : 'Prescribed'} (${v.length} item${v.length > 1 ? 's' : ''})`;
    }
    return v.map((item) => (CIEL_NAME_DICTIONARY[String(item)] || String(item))).join(', ');
  }

  if (typeof v === 'object') {
    if (v.label) return String(v.label);
    if (v.name) return String(v.name);
    if (v.display) return String(v.display);
    if (v.value && typeof v.value !== 'object') return formatObsSummary(k, v.value);
    const prims = Object.values(v).filter((x) => typeof x === 'string' || typeof x === 'number');
    if (prims.length > 0) return String(prims[0]);
    return JSON.stringify(v);
  }

  return String(v);
};

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar: alertMsg } = useSnackbar();
  const { user } = useAuth();
  
  const [patient, setPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingNmrs, setSyncingNmrs] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [openLinkFamily, setOpenLinkFamily] = useState(false);
  const [printEncounter, setPrintEncounter] = useState<any>(null);
  const [familyAccounts, setFamilyAccounts] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [familyRelationship, setFamilyRelationship] = useState('SPOUSE');
  const [chargeUpgrade, setChargeUpgrade] = useState(true);
  const [upgradeFee, setUpgradeFee] = useState(1500);
  const [openStatusChange, setOpenStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [deleteBlockedMsg, setDeleteBlockedMsg] = useState('');

  // NMRS Form JSON Schema editing states & validations
  const [editingEncounter, setEditingEncounter] = useState<any | null>(null);
  const [editingFormData, setEditingFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [savingEncounter, setSavingEncounter] = useState<boolean>(false);
  const [formActiveTab, setFormActiveTab] = useState<number>(0);
  const [nmrsSchemas, setNmrsSchemas] = useState<any[]>([]);

  const normalizeKey = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const ALIAS_MAP: Record<string, string[]> = {
    visitdate: ['visitdate', 'encounterdatetime', 'date', 'ordereddate', 'dateorderd', 'encounterdate'],
    dateorderd: ['dateorderd', 'ordereddate', 'dateordered', 'visitdate'],
    ordereddate: ['ordereddate', 'dateorderd', 'dateordered', 'visitdate'],
    treatmenttype: ['treatmenttype', 'purposeofprescription', 'treatment_type'],
    purposeofprescription: ['purposeofprescription', 'treatmenttype', 'treatment_type'],
    visittype: ['visittype', 'visittypepharm', 'visit_type_pharm'],
    visittypepharm: ['visittype', 'visittypepharm', 'visit_type_pharm'],
    pregnant: ['pregnant', 'pregnancystatus', 'pregnancybreastfeedingstatus', 'pregnancy_status'],
    pregnancystatus: ['pregnant', 'pregnancystatus', 'pregnancybreastfeedingstatus', 'pregnancy_status'],
    pregnancybreastfeedingstatus: ['pregnant', 'pregnancystatus', 'pregnancybreastfeedingstatus', 'pregnancy_status'],
    refill: ['refill', 'pickupreason', 'pick_up_reason_pharm'],
    pickupreason: ['refill', 'pickupreason', 'pick_up_reason_pharm'],
    pickupreasonpharm: ['refill', 'pickupreason', 'pick_up_reason_pharm'],

    calculatednextappointmentdate: ['calculatednextappointmentdate', 'returnvisitdate', 'nextappointmentdate', 'nextrefilldate'],
    returnvisitdate: ['calculatednextappointmentdate', 'returnvisitdate', 'nextappointmentdate', 'nextrefilldate'],
    nextappointmentdate: ['calculatednextappointmentdate', 'returnvisitdate', 'nextappointmentdate', 'nextrefilldate'],
    treatmentagegroup: ['treatmentagegroup', 'treatment_age_group'],
    regimenline: ['regimenline', 'currentregimenline', 'regimen_line'],
    currentregimenline: ['regimenline', 'currentregimenline', 'regimen_line'],
    adult1stline: ['adult1stlinearvregimen', 'adult1stlineregimens', 'adult_1st_line_regimens', 'arvregimen', 'adult1stlineregimenschooseifadultagegroup'],
    adult1stlineregimens: ['adult1stlinearvregimen', 'adult1stlineregimens', 'adult_1st_line_regimens', 'arvregimen', 'adult1stlineregimenschooseifadultagegroup'],
    adult1stlinearvregimen: ['adult1stlinearvregimen', 'adult1stlineregimens', 'adult_1st_line_regimens', 'arvregimen', 'adult1stlineregimenschooseifadultagegroup'],
    adult1stlineregimenschooseifadultagegroup: ['adult1stlinearvregimen', 'adult1stlineregimens', 'adult_1st_line_regimens', 'arvregimen', 'adult1stlineregimenschooseifadultagegroup'],
    multimonthdispensingmmd: ['multimonthdispensingmmd', 'mmd'],
    mmd: ['multimonthdispensingmmd', 'mmd'],
    adherencecounselingoffering: ['adherencecounselingoffering', 'adherencecounseling', 'adherence'],
    weight: ['weight', 'latestweight', 'weightkg', 'patientweightatinitiationkg', 'patientweight', 'currentweight', '5089'],
    latestweight: ['weight', 'latestweight', 'weightkg', 'patientweightatinitiationkg', 'patientweight', 'currentweight', '5089'],
    height: ['height', 'latestheight', 'heightcm', 'patientheightatinitiationcm', 'patientheight', 'currentheight', '5090'],
    latestheight: ['height', 'latestheight', 'heightcm', 'patientheightatinitiationcm', 'patientheight', 'currentheight', '5090'],
    bodymassindex: ['bodymassindex', 'bmi', '1342'],
    bmi: ['bodymassindex', 'bmi', '1342'],
    dsdstatus: ['dsdstatus', 'dsdmodel', 'dispensingmodality', 'dispensing_modality', '166144', '166145'],
    dsdmodel: ['dsdstatus', 'dsdmodel', 'dispensingmodality', 'dispensing_modality', '166144', '166145'],
    dispensingmodality: ['dsdstatus', 'dsdmodel', 'dispensingmodality', 'dispensing_modality', '166144', '166145'],
    functionalstatus: ['functionalstatus', 'functional_status', '165889', '165888', '165887'],
    familyplanning: ['familyplanning', 'familyplanningmethod', 'fpmethod', '1388', '374'],
    viralload: ['viralload', 'viralloadvalue', 'vl', 'lastviralload', 'viralloadcopiesml', '856'],
    viralloadvalue: ['viralload', 'viralloadvalue', 'vl', 'lastviralload', 'viralloadcopiesml', '856'],
    cd4: ['cd4', 'cd4value', 'cd4count', 'lastcd4count', '5497'],
    cd4value: ['cd4', 'cd4value', 'cd4count', 'lastcd4count', '5497'],
    tbstatus: ['tbstatus', 'tbscreeningstatus', 'tuberculosisdiseasestatus', 'tb_screening_status', '1659'],
    tbscreeningstatus: ['tbstatus', 'tbscreeningstatus', 'tuberculosisdiseasestatus', 'tb_screening_status', '1659'],
    whostage: ['whohivclinicalstage', 'currentwhohivstage', 'whostage', '1204', '1205', '1206', '1207'],
    whohivclinicalstage: ['whohivclinicalstage', 'currentwhohivstage', 'whostage', '1204', '1205', '1206', '1207'],
    signature: ['signature', 'orderby', 'dispensedby', 'provider', 'clinician'],
    orderby: ['signature', 'orderby', 'dispensedby', 'provider', 'clinician'],
    dispensedby: ['signature', 'orderby', 'dispensedby', 'provider', 'clinician']
  };

  const STANDARD_NMRS_DROPDOWNS: Record<string, string[]> = {
    treatmenttype: ['Antiretroviral Therapy', 'Non-ART', 'Occupational PEP', 'Non-Occupational PEP', 'HIV-Exposed Infant', 'PrEP'],
    purposeofprescription: ['Antiretroviral Therapy', 'Non-ART', 'Occupational PEP', 'Non-Occupational PEP', 'HIV-Exposed Infant', 'PrEP'],
    treatment_type: ['Antiretroviral Therapy', 'Non-ART', 'Occupational PEP', 'Non-Occupational PEP', 'HIV-Exposed Infant', 'PrEP'],
    visittype: ['Initial Visit', 'Return Visit Type'],
    visittypepharm: ['Initial Visit', 'Return Visit Type'],
    visit_type_pharm: ['Initial Visit', 'Return Visit Type'],
    pregnant: ['Pregnant', 'Not Pregnant', 'Breastfeeding', 'Post-partum'],
    pregnancystatus: ['Pregnant', 'Not Pregnant', 'Breastfeeding', 'Post-partum'],
    pregnancy_status: ['Pregnant', 'Not Pregnant', 'Breastfeeding', 'Post-partum'],
    refill: ['Refill', 'New Prescription', 'Drug Substitution', 'Drug Switch'],
    pickupreason: ['Refill', 'New Prescription', 'Drug Substitution', 'Drug Switch'],
    pick_up_reason_pharm: ['Refill', 'New Prescription', 'Drug Substitution', 'Drug Switch'],
    dsdmodel: ['Non-devolved', 'Facility-based', 'Community ART Group (CAG)', 'Home Delivery', 'Fast Track', 'CPAP'],
    dsdstatus: ['Non-devolved', 'Facility-based', 'Community ART Group (CAG)', 'Home Delivery', 'Fast Track', 'CPAP'],
    dispensingmodality: ['Non-devolved', 'Facility-based', 'Community ART Group (CAG)', 'Home Delivery', 'Fast Track', 'CPAP'],
    dispensing_modality: ['Non-devolved', 'Facility-based', 'Community ART Group (CAG)', 'Home Delivery', 'Fast Track', 'CPAP'],
    treatmentagegroup: ['Adult', 'Child'],
    treatment_age_group: ['Adult', 'Child'],
    regimenline: ['Adult 1st Line ARV Regimen', 'Adult 2nd Line ARV Regimen', 'Child 1st Line ARV Regimen', 'Child 2nd Line ARV Regimen', 'Third Line (Salvage)'],
    regimen_line: ['Adult 1st Line ARV Regimen', 'Adult 2nd Line ARV Regimen', 'Child 1st Line ARV Regimen', 'Child 2nd Line ARV Regimen', 'Third Line (Salvage)'],
    adult1stlineregimens: [
      '1a: TDF + 3TC + DTG (Tenofovir + Lamivudine + Dolutegravir)',
      '1b: TDF + 3TC + EFV400 (Tenofovir + Lamivudine + Efavirenz 400mg)',
      '1c: AZT + 3TC + DTG (Zidovudine + Lamivudine + Dolutegravir)',
      '1d: ABC + 3TC + DTG (Abacavir + Lamivudine + Dolutegravir)',
      '1e: TDF + 3TC + EFV600',
      '1f: TDF + FTC + DTG',
      '1g: ABC + 3TC + EFV'
    ],
    adult_1st_line_regimens: [
      '1a: TDF + 3TC + DTG (Tenofovir + Lamivudine + Dolutegravir)',
      '1b: TDF + 3TC + EFV400 (Tenofovir + Lamivudine + Efavirenz 400mg)',
      '1c: AZT + 3TC + DTG (Zidovudine + Lamivudine + Dolutegravir)',
      '1d: ABC + 3TC + DTG (Abacavir + Lamivudine + Dolutegravir)',
      '1e: TDF + 3TC + EFV600',
      '1f: TDF + FTC + DTG',
      '1g: ABC + 3TC + EFV'
    ],
    adult2ndlineregimens: [
      '2a: AZT + 3TC + ATV/r (Zidovudine + Lamivudine + Atazanavir/r)',
      '2b: AZT + 3TC + LPV/r (Zidovudine + Lamivudine + Lopinavir/r)',
      '2c: TDF + 3TC + ATV/r (Tenofovir + Lamivudine + Atazanavir/r)',
      '2d: TDF + 3TC + LPV/r (Tenofovir + Lamivudine + Lopinavir/r)',
      '2e: TDF + 3TC + DRV/r (Tenofovir + Lamivudine + Darunavir/r)',
      '2f: ABC + 3TC + LPV/r (Abacavir + Lamivudine + Lopinavir/r)',
      '2g: ABC + 3TC + ATV/r (Abacavir + Lamivudine + Atazanavir/r)'
    ],
    child1stlineregimens: [
      '4a: ABC + 3TC + DTG (10mg/50mg/5mg)',
      '4b: ABC + 3TC + LPV/r',
      '4c: AZT + 3TC + LPV/r',
      '4d: AZT + 3TC + DTG',
      '4e: TDF + 3TC + DTG'
    ],
    child2ndlineregimens: [
      '5a: AZT + 3TC + ATV/r',
      '5b: ABC + 3TC + ATV/r',
      '5c: TDF + 3TC + LPV/r'
    ],
    whostage: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4'],
    whohivclinicalstage: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4'],
    tbscreeningstatus: ['No Signs', 'TB Suspect', 'On TB Treatment', 'Confirmed TB Not On Treatment'],
    functionalstatus: ['Working', 'Ambulatory', 'Bedridden'],
    adherence: ['Good (>95%)', 'Fair (85-94%)', 'Poor (<85%)'],
    maritalstatus: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'],
    educationallevel: ['None', 'Primary', 'Secondary', 'Tertiary'],
    employmentstatus: ['Employed', 'Unemployed', 'Student', 'Retired', 'Self-Employed']
  };

  const checkQuestionVisibility = (q: any, formData: Record<string, any>, patientRecord: any): boolean => {
    // 1. Explicit dependsOn
    if (q.dependsOn) {
      const deps = Array.isArray(q.dependsOn) ? q.dependsOn : [q.dependsOn];
      for (const dep of deps) {
        const fieldKey = dep.fieldId || dep.field || dep.id;
        const parentVal = formData[fieldKey] ?? formData[normalizeKey(fieldKey)] ?? '';
        
        if (dep.equals !== undefined) {
          if (String(parentVal).trim().toLowerCase() !== String(dep.equals).trim().toLowerCase()) return false;
        }
        if (dep.value !== undefined) {
          if (String(parentVal).trim().toLowerCase() !== String(dep.value).trim().toLowerCase()) return false;
        }
        if (dep.notEquals !== undefined) {
          if (String(parentVal).trim().toLowerCase() === String(dep.notEquals).trim().toLowerCase()) return false;
        }
        if (dep.in && Array.isArray(dep.in)) {
          const inMatch = dep.in.some((item: any) => String(item).trim().toLowerCase() === String(parentVal).trim().toLowerCase());
          if (!inMatch) return false;
        }
      }
    }

    // 2. Explicit hide / hideWhenExpression
    if (q.hide) {
      if (q.hide.field) {
        const parentVal = formData[q.hide.field] ?? formData[normalizeKey(q.hide.field)] ?? '';
        if (String(parentVal).trim().toLowerCase() === String(q.hide.value).trim().toLowerCase()) return false;
      }
      if (q.hide.hideWhenExpression && typeof q.hide.hideWhenExpression === 'string') {
        const expr = q.hide.hideWhenExpression.toLowerCase();
        if (expr.includes('sex') && expr.includes('female')) {
          const sexVal = String(formData['Sex'] || formData['sex'] || patientRecord?.gender || '').toLowerCase();
          if (sexVal.startsWith('m')) return false; // hide for male
        }
      }
    }

    // 3. Explicit display / showWhenExpression
    if (q.display && q.display.showWhenExpression && typeof q.display.showWhenExpression === 'string') {
      const expr = q.display.showWhenExpression.toLowerCase();
      if (expr.includes('tb') && expr.includes('treatment')) {
        const tbVal = String(formData['TB Screening Result'] || formData['tbStatus'] || formData['TB Screening Status'] || '').toLowerCase();
        if (!tbVal.includes('treatment') && !tbVal.includes('confirmed') && !tbVal.includes('on tb')) return false;
      }
    }

    // 4. National Clinical Contextual Rules
    const qNormId = normalizeKey(q.id);
    const qNormLabel = normalizeKey(q.label);

    // Female-only fields
    const isFemaleOnlyField = ['pregnant', 'pregnancystatus', 'pregnancy_status', 'ancnumber', 'anc_number', 'edd', 'lmp', 'breastfeeding', 'breastfeedingstatus', 'gravida', 'parity'].some(k => qNormId === k || qNormLabel === k);
    if (isFemaleOnlyField) {
      const clientGender = String(formData['Sex'] || formData['sex'] || formData['gender'] || patientRecord?.gender || '').toUpperCase();
      if (clientGender === 'M' || clientGender === 'MALE' || clientGender === '1530') {
        return false;
      }
    }

    // TB treatment details (only if on TB treatment or presumptive)
    const isTbTreatmentField = ['tbtreatmentstartdate', 'tbregimen', 'tbtreatmentregimen', 'tbfacility', 'tbdotscentre', 'tbtreatmentfacility'].some(k => qNormId === k || qNormLabel === k);
    if (isTbTreatmentField) {
      const tbStatusVal = String(formData['TB Screening Result'] || formData['tbStatus'] || formData['TB Screening Status'] || formData['tbscreeningresult'] || '').toLowerCase();
      if (!tbStatusVal.includes('treatment') && !tbStatusVal.includes('confirmed') && !tbStatusVal.includes('presumptive') && !tbStatusVal.includes('suspect')) {
        return false;
      }
    }

    // Regimen change reason (only if drug switch / substitution)
    const isRegimenChangeField = ['reasonforregimenchange', 'reasonforchangeorsubstitution', 'regimenchangesubstitutionreason'].some(k => qNormId === k || qNormLabel === k);
    if (isRegimenChangeField) {
      const pickupReason = String(formData['Pickup / Refill Reason'] || formData['pickupReason'] || formData['refillReason'] || formData['Reason for Drug Refill'] || '').toLowerCase();
      if (!pickupReason.includes('switch') && !pickupReason.includes('substitut') && !pickupReason.includes('change')) {
        return false;
      }
    }

    // Transfer-out details
    const isTransferOutField = ['transferoutfacility', 'transferredtofacility', 'transferoutdate', 'dateoftransferout'].some(k => qNormId === k || qNormLabel === k);
    if (isTransferOutField) {
      const statusVal = String(formData['Patient Status'] || formData['careOutcome'] || formData['exitReason'] || patientRecord?.status || '').toLowerCase();
      if (!statusVal.includes('transfer')) return false;
    }

    // Deceased details
    const isDeceasedField = ['dateofdeath', 'causeofdeath', 'deathdate'].some(k => qNormId === k || qNormLabel === k);
    if (isDeceasedField) {
      const statusVal = String(formData['Patient Status'] || formData['careOutcome'] || formData['exitReason'] || patientRecord?.status || '').toLowerCase();
      if (!statusVal.includes('dead') && !statusVal.includes('deceas')) return false;
    }

    return true;
  };

  const getDynamicAnswers = (q: any, formData: Record<string, any>): Array<{ label: string; value: string | number; concept?: string | number }> => {
    const qNormId = normalizeKey(q.id);
    const qNormLabel = normalizeKey(q.label);

    // 1. Regimen cascading by Regimen Line
    const isRegimenField = [
      'prescribedregimen', 'dispensedregimen', 'firstlineregimen', 'arvregimen', 
      'adult1stlineregimens', 'adult2ndlineregimens', 'child1stlineregimens', 'child2ndlineregimens',
      'regimendrugsprescribed', 'prescribedarvregimen', 'dispensedarvregimen'
    ].some(k => qNormId.includes(k) || qNormLabel.includes(k));

    if (isRegimenField) {
      const selectedLine = String(
        formData['Regimen Line'] || formData['regimenLine'] || formData['regimen_line'] || 
        formData['Treatment Age Group'] || formData['treatmentAgeGroup'] || formData['arvRegimenLine'] || ''
      ).toLowerCase();

      if (selectedLine.includes('2nd') || selectedLine.includes('second')) {
        if (selectedLine.includes('child') || selectedLine.includes('pediatric')) {
          return [
            { label: '5a: AZT + 3TC + ATV/r', value: 'AZT-3TC-ATV/r' },
            { label: '5b: ABC + 3TC + ATV/r', value: 'ABC-3TC-ATV/r' },
            { label: '5c: TDF + 3TC + LPV/r', value: 'TDF-3TC-LPV/r' },
            { label: '5d: ABC + 3TC + LPV/r', value: 'ABC-3TC-LPV/r' }
          ];
        }
        return [
          { label: '2a: AZT + 3TC + ATV/r (Zidovudine + Lamivudine + Atazanavir/r)', value: 'AZT-3TC-ATV/r' },
          { label: '2b: AZT + 3TC + LPV/r (Zidovudine + Lamivudine + Lopinavir/r)', value: 'AZT-3TC-LPV/r' },
          { label: '2c: TDF + 3TC + ATV/r (Tenofovir + Lamivudine + Atazanavir/r)', value: 'TDF-3TC-ATV/r' },
          { label: '2d: TDF + 3TC + LPV/r (Tenofovir + Lamivudine + Lopinavir/r)', value: 'TDF-3TC-LPV/r' },
          { label: '2e: TDF + 3TC + DRV/r (Tenofovir + Lamivudine + Darunavir/r)', value: 'TDF-3TC-DRV/r' },
          { label: '2f: ABC + 3TC + LPV/r (Abacavir + Lamivudine + Lopinavir/r)', value: 'ABC-3TC-LPV/r' },
          { label: '2g: ABC + 3TC + ATV/r (Abacavir + Lamivudine + Atazanavir/r)', value: 'ABC-3TC-ATV/r' }
        ];
      }

      if (selectedLine.includes('3rd') || selectedLine.includes('third') || selectedLine.includes('salvage')) {
        return [
          { label: '3a: DRV/r + DTG + 2 NRTIs (Darunavir/r + Dolutegravir + NRTIs)', value: 'DRV/r-DTG-2NRTIs' },
          { label: '3b: RAL + DRV/r + 2 NRTIs (Raltegravir + Darunavir/r + NRTIs)', value: 'RAL-DRV/r-2NRTIs' },
          { label: '3c: ETV + DRV/r + DTG (Etravirine + Darunavir/r + Dolutegravir)', value: 'ETV-DRV/r-DTG' }
        ];
      }

      if (selectedLine.includes('pep')) {
        return [
          { label: 'PEP 1: TDF + 3TC + DTG (Single Fixed Dose x 28 days)', value: 'TDF-3TC-DTG-PEP' },
          { label: 'PEP 2: TDF + FTC + DTG', value: 'TDF-FTC-DTG-PEP' },
          { label: 'PEP 3: AZT + 3TC + DTG', value: 'AZT-3TC-DTG-PEP' }
        ];
      }

      if (selectedLine.includes('prep')) {
        return [
          { label: 'PrEP 1: Oral TDF/FTC (Truvada) 1 tab daily', value: 'TDF-FTC-PrEP' },
          { label: 'PrEP 2: Oral TDF/3TC 1 tab daily', value: 'TDF-3TC-PrEP' },
          { label: 'PrEP 3: Long-Acting Cabotegravir (CAB-LA)', value: 'CAB-LA' }
        ];
      }

      if (selectedLine.includes('child') || selectedLine.includes('pediatric')) {
        return [
          { label: '4a: ABC + 3TC + DTG (10mg/50mg/5mg)', value: 'ABC-3TC-DTG' },
          { label: '4b: ABC + 3TC + LPV/r', value: 'ABC-3TC-LPV/r' },
          { label: '4c: AZT + 3TC + LPV/r', value: 'AZT-3TC-LPV/r' },
          { label: '4d: AZT + 3TC + DTG', value: 'AZT-3TC-DTG' },
          { label: '4e: TDF + 3TC + DTG', value: 'TDF-3TC-DTG' }
        ];
      }

      // Default: Adult 1st Line
      return [
        { label: '1a: TDF + 3TC + DTG (Tenofovir + Lamivudine + Dolutegravir)', value: 'TDF-3TC-DTG' },
        { label: '1b: TDF + 3TC + EFV400 (Tenofovir + Lamivudine + Efavirenz 400mg)', value: 'TDF-3TC-EFV400' },
        { label: '1c: AZT + 3TC + DTG (Zidovudine + Lamivudine + Dolutegravir)', value: 'AZT-3TC-DTG' },
        { label: '1d: ABC + 3TC + DTG (Abacavir + Lamivudine + Dolutegravir)', value: 'ABC-3TC-DTG' },
        { label: '1e: TDF + 3TC + EFV600 (Tenofovir + Lamivudine + Efavirenz 600mg)', value: 'TDF-3TC-EFV600' },
        { label: '1f: TDF + FTC + DTG (Tenofovir + Emtricitabine + Dolutegravir)', value: 'TDF-FTC-DTG' },
        { label: '1g: ABC + 3TC + EFV (Abacavir + Lamivudine + Efavirenz)', value: 'ABC-3TC-EFV' }
      ];
    }

    // 2. Schema Answers or Dropdown Dictionary
    const schemaAnswers = q.questionOptions?.answers || q.options;
    if (schemaAnswers && schemaAnswers.length > 0) {
      return schemaAnswers.map((a: any) => ({
        label: a.label || a.value || String(a),
        value: a.value || a.label || String(a),
        concept: a.concept || a.conceptId
      }));
    }

    const standardAnswers = STANDARD_NMRS_DROPDOWNS[qNormId] || STANDARD_NMRS_DROPDOWNS[qNormLabel];
    if (standardAnswers && standardAnswers.length > 0) {
      return standardAnswers.map((s: string) => ({ label: s, value: s }));
    }

    return [];
  };

  const getStatusColor = (status: string): "success" | "warning" | "error" | "default" | "info" | "secondary" => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warning';
      case 'DECEASED':
      case 'DEAD': return 'error';
      case 'TRANSFERRED_OUT': return 'secondary';
      case 'LTFU': return 'warning';
      case 'STOPPED_TREATMENT': return 'error';
      case 'ARCHIVED': return 'default';
      default: return 'info';
    }
  };

  const mapValueToAnswer = (q: any, rawVal: any): any => {
    if (rawVal === undefined || rawVal === null || rawVal === '') return '';
    const answers = q.questionOptions?.answers || q.options || q.answers || [];
    if (!answers || answers.length === 0) return rawVal;

    const rawStr = String(rawVal).toLowerCase().trim();

    // 1. Exact match on concept or value
    const exactMatch = answers.find((a: any) =>
      String(a.concept || a.value || '').toLowerCase() === rawStr
    );
    if (exactMatch) return exactMatch.concept || exactMatch.value;

    // 2. Match on human readable label (e.g. "Non-devolved", "Physically able to work", "Yes")
    const labelMatch = answers.find((a: any) =>
      String(a.label || '').toLowerCase().trim() === rawStr ||
      normalizeKey(String(a.label || '')) === normalizeKey(rawStr)
    );
    if (labelMatch) return labelMatch.concept || labelMatch.value || labelMatch.label;

    // 3. Partial label match
    const partialMatch = answers.find((a: any) =>
      a.label && (rawStr.includes(String(a.label).toLowerCase()) || String(a.label).toLowerCase().includes(rawStr))
    );
    if (partialMatch) return partialMatch.concept || partialMatch.value || partialMatch.label;

    return rawVal;
  };

  const resolveInitialValue = (q: any, rawData: Record<string, any>, encounter: any): any => {
    if (rawData[q.label] !== undefined && rawData[q.label] !== '') return mapValueToAnswer(q, rawData[q.label]);
    if (rawData[q.id] !== undefined && rawData[q.id] !== '') return mapValueToAnswer(q, rawData[q.id]);

    const qNormId = normalizeKey(q.id);
    const qNormLabel = normalizeKey(q.label);

    // 1. Direct key/label match
    for (const [k, v] of Object.entries(rawData)) {
      const kNorm = normalizeKey(k);
      if ((kNorm === qNormId || kNorm === qNormLabel) && v !== undefined && v !== '') {
        return mapValueToAnswer(q, v);
      }
    }

    // 2. Concept ID or Concept UUID match
    const qConcept = String(q.conceptId || q.questionOptions?.concept || '');
    if (qConcept) {
      const normConcept = normalizeKey(qConcept);
      for (const [k, v] of Object.entries(rawData)) {
        if (normalizeKey(k) === normConcept && v !== undefined && v !== '') {
          return mapValueToAnswer(q, v);
        }
      }
    }

    // 3. Aliases match
    const aliases = [...(ALIAS_MAP[qNormId] || []), ...(ALIAS_MAP[qNormLabel] || [])];
    for (const alias of aliases) {
      for (const [k, v] of Object.entries(rawData)) {
        if (normalizeKey(k) === alias && v !== undefined && v !== '') {
          return mapValueToAnswer(q, v);
        }
      }
    }

    if (qNormId.includes('visitdate') || qNormLabel.includes('visitdate')) {
      return encounter?.encounterDate ? new Date(encounter.encounterDate).toISOString().slice(0, 10) : '';
    }
    if (qNormId.includes('dispensedby') || qNormId.includes('orderby') || qNormLabel.includes('dispensedby') || qNormLabel.includes('orderby')) {
      return encounter?.clinicianName || 'Chioma (Clinical Provider)';
    }

    if (q.defaultValue !== undefined) return q.defaultValue;
    return '';
  };

  const validateField = (q: any, value: any): string | null => {
    const isRequired = q.required === true;
    const strVal = value !== undefined && value !== null ? String(value).trim() : '';

    if (isRequired && !strVal) {
      return `${q.label || 'This field'} is required`;
    }

    if (!strVal) return null;

    const isDate = q.type === 'date' || q.type === 'encounterDatetime' || q.questionOptions?.rendering === 'date';
    if (isDate) {
      const valDate = new Date(strVal);
      if (isNaN(valDate.getTime())) {
        return 'Please enter a valid date';
      }
      const allowFuture = q.validators?.find((v: any) => v.allowFutureDates !== undefined)?.allowFutureDates;
      if (allowFuture === 'false' || allowFuture === false) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (valDate > today) {
          return 'Future dates are not permitted for this field';
        }
      }
    }

    const isNumber = q.type === 'number' || q.questionOptions?.rendering === 'number';
    if (isNumber) {
      const num = Number(strVal);
      if (isNaN(num)) {
        return 'Must be a valid number';
      }
      const validator = q.validators?.find((v: any) => v.min !== undefined || v.max !== undefined);
      const minVal = validator?.min ?? q.min;
      const maxVal = validator?.max ?? q.max;
      if (minVal !== undefined && num < minVal) {
        return `Minimum allowed value is ${minVal}`;
      }
      if (maxVal !== undefined && num > maxVal) {
        return `Maximum allowed value is ${maxVal}`;
      }
    }

    return null;
  };

  const handleOpenFormDialog = (encounterRecord: any) => {
    setEditingEncounter(encounterRecord);
    setFormErrors({});
    setFormActiveTab(0);

    const rawData = encounterRecord.formData ? { ...encounterRecord.formData } : {};
    const schema = encounterRecord.formSchema?.schemaJson;
    const pages = schema?.pages && schema.pages.length > 0
      ? schema.pages
      : (schema?.sections && schema.sections.length > 0 ? [{ label: schema.formName || 'Form', sections: schema.sections }] : []);
    const sections = pages.flatMap((p: any) => p.sections || []);
    const questions = sections.flatMap((s: any) => s.questions || []);

    const initialMappedData: Record<string, any> = { ...rawData };

    for (const q of questions) {
      const resolved = resolveInitialValue(q, rawData, encounterRecord);
      if (resolved !== undefined && resolved !== '') {
        initialMappedData[q.id] = resolved;
        initialMappedData[q.label] = resolved;
      }
    }

    setEditingFormData(initialMappedData);
  };

  const handleSaveEncounterForm = async () => {
    if (!editingEncounter) return;

    const schema = editingEncounter.formSchema?.schemaJson;
    const pages = schema?.pages && schema.pages.length > 0
      ? schema.pages
      : (schema?.sections && schema.sections.length > 0 ? [{ label: schema.formName || 'Form', sections: schema.sections }] : []);
    const sections = pages.flatMap((p: any) => p.sections || []);
    const questions = sections.flatMap((s: any) => s.questions || []);

    const newErrors: Record<string, string> = {};

    for (const q of questions) {
      if (!checkQuestionVisibility(q, editingFormData, patient)) {
        continue;
      }

      const currentVal = editingFormData[q.label] ?? editingFormData[q.id];
      const err = validateField(q, currentVal);
      if (err) {
        newErrors[q.id] = err;
        newErrors[q.label] = err;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      alertMsg('Please complete all required fields and correct the highlighted errors before saving.', { variant: 'error' });
      return;
    }

    setSavingEncounter(true);
    try {
      const res = await api.put(`/nmrs/encounters/${editingEncounter.id}`, {
        formData: editingFormData
      });
      alertMsg(res.data?.message || 'Encounter form updated successfully', { variant: 'success' });
      setEditingEncounter(null);
      fetchPatientDetails();
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Failed to update encounter form', { variant: 'error' });
    } finally {
      setSavingEncounter(false);
    }
  };

  // Coverage check states
  const [selectedPolicyCatalog, setSelectedPolicyCatalog] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [checkServiceCode, setCheckServiceCode] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checkingCoverage, setCheckingCoverage] = useState(false);

  const handleLoadCatalog = async (planId: string, policyId: string) => {
    setSelectedPolicyId(policyId);
    setLoadingCatalog(true);
    setCheckResult(null);
    try {
      const res = await api.get(`/insurance/plans/${planId}/catalog`);
      setSelectedPolicyCatalog(res.data?.data || []);
    } catch {
      alertMsg('Failed to load benefit catalog', { variant: 'error' });
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleCheckCoverage = async () => {
    if (!checkServiceCode) return;
    setCheckingCoverage(true);
    try {
      const res = await api.get('/insurance/coverage-check', {
        params: { patientId: id, serviceCode: checkServiceCode },
      });
      setCheckResult(res.data?.data || res.data);
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Check failed', { variant: 'error' });
    } finally {
      setCheckingCoverage(false);
    }
  };

  const fetchFamilyAccounts = async () => {
    try {
      const res = await api.get('/family');
      setFamilyAccounts(res.data);
      if (res.data.length > 0) {
        setSelectedFamilyId(res.data[0].id);
      }
    } catch (err) {
      alertMsg('Failed to load family accounts', { variant: 'error' });
    }
  };

  const handleLinkFamily = async () => {
    if (!selectedFamilyId) {
      alertMsg('Please select a family account', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await api.post(`/family/${selectedFamilyId}/members`, {
        patientId: id,
        relationship: familyRelationship,
      });
      alertMsg('Successfully linked patient to family account', { variant: 'success' });
      setOpenLinkFamily(false);
      fetchPatientDetails();
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Failed to link family account', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    setLoading(true);
    try {
      await api.post('/family', {
        headPatientId: id,
        upgradeFeeAmount: chargeUpgrade ? upgradeFee : 0,
      });
      alertMsg('Successfully converted account and created Family Account as Head', { variant: 'success' });
      setOpenLinkFamily(false);
      fetchPatientDetails();
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Failed to create family account', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/patients/${id}`);
      setPatient(res.data);
    } catch (err) {
      alertMsg('Failed to load patient profile', { variant: 'error' });
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNmrsRecord = async () => {
    setSyncingNmrs(true);
    try {
      const res = await api.post(`/nmrs/patients/${id}/sync-full`);
      alertMsg(res.data?.message || 'OpenMRS record, bio data & encounters synchronized', { variant: 'success' });
      fetchPatientDetails();
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Failed to sync OpenMRS record', { variant: 'error' });
    } finally {
      setSyncingNmrs(false);
    }
  };

  const fetchNmrsSchemas = async () => {
    try {
      const res = await api.get('/nmrs/schemas');
      if (res.data?.schemas || res.data?.data) {
        setNmrsSchemas(res.data.schemas || res.data.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPatientDetails();
    fetchNmrsSchemas();
  }, [id]);

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/patients/${id}`);
      alertMsg('Patient profile deleted successfully', { variant: 'success' });
      navigate('/patients');
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code === 'CLINICAL_RECORDS_EXIST') {
        setDeleteBlockedMsg(data.message);
      } else {
        alertMsg(data?.message || 'Failed to delete patient profile', { variant: 'error' });
      }
    }
  };

  const handleStatusChange = async () => {
    try {
      await api.patch(`/patients/${id}/status`, { status: newStatus });
      alertMsg(`Patient status updated to ${newStatus}`, { variant: 'success' });
      setOpenStatusChange(false);
      fetchPatientDetails();
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Failed to update status', { variant: 'error' });
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  if (loading) return <Container sx={{ py: 4 }}><Typography>Loading Patient Profile...</Typography></Container>;
  if (!patient) return <Container sx={{ py: 4 }}><Typography>Patient not found.</Typography></Container>;

  const fullName = `${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`;
  const phone = patient.telecoms?.find((t: any) => t.system === 'phone')?.value || 'N/A';
  const email = patient.telecoms?.find((t: any) => t.system === 'email')?.value || 'N/A';
  const addressStr = patient.addresses?.[0] ? [patient.addresses[0].line, patient.addresses[0].city, patient.addresses[0].state].filter(Boolean).join(', ') : 'N/A';

  const labOrders = patient.labOrders || [];
  const prescriptions = patient.pharmacyPrescriptions || [];

  const enhancedVisits = (patient.visits || []).map((visit: any) => {
    const visitDate = new Date(visit.createdAt).toDateString();
    
    const visitLabs = labOrders.filter((lo: any) => lo.visitId === visit.id || new Date(lo.createdAt).toDateString() === visitDate);
    const visitRx = prescriptions.filter((rx: any) => rx.visitId === visit.id || new Date(rx.createdAt).toDateString() === visitDate);

    const mappedLabs = visitLabs.map((lo: any) => ({
      id: lo.id,
      type: 'LAB_ORDER',
      serviceType: `Lab Order (${lo.items?.length || 0} tests)`,
      class: 'DIAGNOSTIC',
      status: lo.status,
      createdAt: lo.createdAt,
      staff: lo.requestedBy,
      reasonText: lo.clinicalNotes,
      diagnosis: lo.diagnosis,
      rawOrder: { ...lo, patient }
    }));

    const mappedRx = visitRx.map((rx: any) => ({
      id: rx.id,
      type: 'PHARMACY_PRESCRIPTION',
      serviceType: `Prescription (${rx.items?.length || 0} items)`,
      class: 'MEDICATION',
      status: rx.status,
      createdAt: rx.createdAt,
      staff: rx.prescriber,
      reasonText: rx.clinicalNotes,
      diagnosis: rx.diagnosis,
      rawOrder: { ...rx, patient }
    }));

    const allEncounters = [...(visit.encounters || []), ...mappedLabs, ...mappedRx]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      ...visit,
      allEncounters
    };
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'block', '@media print': { display: 'none !important' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/patients')}>
          Back to Master Patient Index
        </Button>
        <Stack direction="row" spacing={2}>
          <Button
            startIcon={syncingNmrs ? <CircularProgress size={16} color="inherit" /> : <Sync />}
            variant="outlined"
            color="secondary"
            disabled={syncingNmrs}
            onClick={handleSyncNmrsRecord}
          >
            {syncingNmrs ? 'Syncing...' : 'Sync OpenMRS Record'}
          </Button>
          <Button startIcon={<CalendarToday />} variant="contained" color="primary" onClick={() => navigate('/appointments', { state: { preselectedPatient: patient } })}>
            Book Next Appointment
          </Button>
          <Button startIcon={<Print />} variant="outlined" color="primary" onClick={() => window.print()}>
            Print Treatment Chart
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={4}>
        {/* Left Side Details */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4, borderRadius: 3, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3.5 }}>
              <Avatar src={patient.photoUrl || undefined} sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {patient.firstName[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={800}>{fullName}</Typography>
                <Stack direction="row" spacing={1} mt={0.5} alignItems="center" flexWrap="wrap">
                  {(patient.nmrsMapping?.pepfarId || (patient.patientNumber?.startsWith('IMO') ? patient.patientNumber : null)) ? (
                    <Chip
                      label={`ART: ${patient.nmrsMapping?.pepfarId || patient.patientNumber}`}
                      size="small"
                      color="secondary"
                      sx={{ fontWeight: 800 }}
                    />
                  ) : (
                    <Chip label={`MRN: ${patient.patientNumber}`} size="small" variant="outlined" />
                  )}
                  {(patient.identification || patient.nmrsMapping?.hospitalNumber) && (
                    <Chip
                      label={`Hospital ID: ${patient.identification || patient.nmrsMapping?.hospitalNumber}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, borderColor: '#1976d2', color: '#1976d2' }}
                    />
                  )}
                  <Chip
                    label={patient.status?.replace('_', ' ')}
                    size="small"
                    color={getStatusColor(patient.status)}
                    sx={{ fontWeight: 800 }}
                  />
                  {patient.bloodGroup && (
                    <Chip label={`Blood: ${patient.bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')}`} size="small" color="primary" />
                  )}
                </Stack>
              </Box>
            </Box>

            {(patient.status === 'DECEASED' || patient.status === 'DEAD') && (
              <Alert severity="error" sx={{ mb: 3, fontWeight: 700, borderRadius: 2 }}>
                💀 PATIENT DECEASED / DEAD — Clinical history and encounters are preserved as locked legal medical records. Active consultations, patient portal logins, and new orders are disabled.
              </Alert>
            )}

            {patient.status === 'TRANSFERRED_OUT' && (
              <Alert severity="warning" sx={{ mb: 3, fontWeight: 700, borderRadius: 2, bgcolor: '#fdf4ff', color: '#86198f', borderColor: '#f0abfc' }}>
                📤 PATIENT TRANSFERRED OUT — Patient has been officially transferred to another clinical facility.
              </Alert>
            )}

            {patient.status === 'LTFU' && (
              <Alert severity="warning" sx={{ mb: 3, fontWeight: 700, borderRadius: 2 }}>
                ⚠️ PATIENT LOST TO FOLLOW-UP (LTFU) — Tracking & retention protocol is active for appointment/refill default.
              </Alert>
            )}

            {patient.status === 'STOPPED_TREATMENT' && (
              <Alert severity="info" sx={{ mb: 3, fontWeight: 700, borderRadius: 2 }}>
                🛑 PATIENT STOPPED TREATMENT — Antiretroviral therapy has been stopped/discontinued.
              </Alert>
            )}

            <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tab icon={<Info fontSize="small" />} iconPosition="start" label="General Info" />
              <Tab icon={<FamilyRestroom fontSize="small" />} iconPosition="start" label="Family Account" />
              <Tab icon={<History fontSize="small" />} iconPosition="start" label="Visits Register" />
              <Tab icon={<Shield fontSize="small" />} iconPosition="start" label="Insurance Policies" />
            </Tabs>

            {tabIndex === 0 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">National Identification (NIN)</Typography>
                  <Typography variant="body1" fontWeight={600}>{patient.nin || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Contact Phone / Email</Typography>
                  <Typography variant="body1" fontWeight={600}>{phone} • {email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">State / LGA of Origin</Typography>
                  <Typography variant="body1" fontWeight={600}>{patient.stateOfOrigin || 'N/A'} / {patient.lga || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Genotype</Typography>
                  <Typography variant="body1" fontWeight={600}>{patient.genotype || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Residential Address</Typography>
                  <Typography variant="body1" fontWeight={600}>{addressStr}</Typography>
                </Grid>
                <Grid item xs={12}><Divider sx={{ my: 1.5 }} /></Grid>

                {/* NOK */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" fontWeight={700} color="primary" mb={1}>Next of Kin</Typography>
                  <Typography variant="body2"><strong>Name:</strong> {patient.nokName || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Relationship:</strong> {patient.nokRelationship || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Phone:</strong> {patient.nokPhone || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Address:</strong> {patient.nokAddress || 'N/A'}</Typography>
                </Grid>
                {/* Emergency contact */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" fontWeight={700} color="secondary" mb={1}>Emergency Contact</Typography>
                  <Typography variant="body2"><strong>Name:</strong> {patient.emergencyName || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Relationship:</strong> {patient.emergencyRelationship || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Phone:</strong> {patient.emergencyPhone || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Address:</strong> {patient.emergencyAddress || 'N/A'}</Typography>
                </Grid>
              </Grid>
            )}

            {tabIndex === 1 && (
              <Box>
                {patient.familyAccount ? (
                  <Stack spacing={3}>
                    <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700}>Household Family Code: {patient.familyAccount.familyNumber}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>Primary Family Head: {fullName}</Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Family Members Linked</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>MRN</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Relationship</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {patient.familyAccount.members?.map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell>{m.patientNumber}</TableCell>
                            <TableCell>{m.firstName} {m.lastName}</TableCell>
                            <TableCell>{m.familyRelationship}</TableCell>
                            <TableCell><Chip label={m.status} size="small" color={m.status === 'ACTIVE' ? 'success' : 'default'} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Stack>
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      This patient is not currently linked to any Household Family Account.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      onClick={() => {
                        fetchFamilyAccounts();
                        setOpenLinkFamily(true);
                      }}
                    >
                      Link Family Household
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {tabIndex === 2 && (
              <Box>
                {enhancedVisits.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No visits recorded for this patient.</Typography>
                ) : (
                  <Box>
                    {enhancedVisits.map((v: any) => (
                      <Accordion key={v.id} sx={{ mb: 2, '&:before': { display: 'none' }, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#f8f9fa', borderRadius: 1 }}>
                          <Box display="flex" justifyContent="space-between" width="100%" alignItems="center" pr={2}>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>Visit: {v.visitNumber}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Checked in: {new Date(v.createdAt).toLocaleString()} | Type: {v.visitType} | Status: {v.status}
                              </Typography>
                            </Box>
                            <Chip label={`${v.allEncounters?.length || 0} Encounters`} size="small" variant="outlined" />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: '#fff', p: 0 }}>
                          {v.allEncounters?.length === 0 ? (
                            <Box p={2} textAlign="center">
                              <Typography variant="body2" color="text.secondary">No encounters recorded during this visit.</Typography>
                            </Box>
                          ) : (
                            <List disablePadding>
                              {v.allEncounters?.map((enc: any) => (
                                <Accordion key={enc.id} sx={{ boxShadow: 'none', borderBottom: '1px solid #eee', '&:before': { display: 'none' } }}>
                                  <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Box display="flex" justifyContent="space-between" width="100%" alignItems="center" pr={2}>
                                      <Box>
                                        <Typography variant="body2" fontWeight={600}>{enc.serviceType || 'General Consultation'}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {new Date(enc.createdAt).toLocaleString()} • {enc.class} • {enc.status}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </AccordionSummary>
                                  <AccordionDetails sx={{ bgcolor: '#fafafa', borderTop: '1px solid #eee', p: 3 }}>
                                    <Grid container spacing={3}>
                                      <Grid item xs={12} md={6}>
                                        {enc.type === 'LAB_ORDER' ? (
                                          <>
                                            <Typography variant="caption" color="text.secondary" display="block">Requested By</Typography>
                                            <Typography variant="body2" fontWeight={500} mb={2}>
                                              {enc.staff ? `${enc.staff.firstName} ${enc.staff.lastName}` : 'System Administrator'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">Tests ({enc.rawOrder?.items?.length || 0})</Typography>
                                            <Box>
                                              {enc.rawOrder?.items?.map((item: any) => (
                                                <Typography key={item.id} variant="body2" fontWeight={500}>
                                                  • {item.test?.testName || 'Unknown Test'} - {item.status}
                                                  {item.result?.resultValue && ` (Result: ${item.result.resultValue} ${item.result.unit || ''})`}
                                                </Typography>
                                              ))}
                                            </Box>
                                          </>
                                        ) : enc.type === 'PHARMACY_PRESCRIPTION' ? (
                                          <>
                                            <Typography variant="caption" color="text.secondary" display="block">Prescriber</Typography>
                                            <Typography variant="body2" fontWeight={500} mb={2}>
                                              {enc.staff ? `${enc.staff.firstName} ${enc.staff.lastName}` : 'System Administrator'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">Medications ({enc.rawOrder?.items?.length || 0})</Typography>
                                            <Box>
                                              {enc.rawOrder?.items?.map((item: any) => {
                                                const medName = item.medication?.brandName || item.medication?.genericName || item.medication?.itemCode || 'Unknown Medication';
                                                return (
                                                  <Typography key={item.id} variant="body2" fontWeight={500}>
                                                    • {medName} ({item.dose} - {item.frequency} for {item.duration})
                                                  </Typography>
                                                );
                                              })}
                                            </Box>
                                          </>
                                        ) : enc.serviceType === 'REGISTRATION' ? (
                                          <>
                                            <Typography variant="caption" color="text.secondary" display="block">Registration Details</Typography>
                                            <Typography variant="body2" fontWeight={500} mb={1}>
                                              Registered By: {enc.staff ? `${enc.staff.firstName} ${enc.staff.lastName}` : 'System Administrator'}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500} mb={1}>
                                              NOK: {patient.nokName || 'N/A'} ({patient.nokRelationship || 'N/A'}) - {patient.nokPhone || 'N/A'}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500} mb={1}>
                                              Emergency: {patient.emergencyName || 'N/A'} ({patient.emergencyRelationship || 'N/A'}) - {patient.emergencyPhone || 'N/A'}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                              Address: {patient.addresses?.[0]?.line || 'N/A'}, {patient.addresses?.[0]?.city || 'N/A'}
                                            </Typography>
                                          </>
                                        ) : (
                                          <>
                                            <Typography variant="caption" color="text.secondary" display="block">Attending Provider</Typography>
                                            <Typography variant="body2" fontWeight={500} mb={2}>
                                              {enc.staff ? `${enc.staff.firstName} ${enc.staff.lastName}` : 'Unassigned'}
                                            </Typography>
                                            
                                            <Typography variant="caption" color="text.secondary" display="block">Reason for Visit</Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                              {enc.reasonText || 'None provided'}
                                            </Typography>
                                          </>
                                        )}
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <Typography variant="caption" color="text.secondary" display="block">Clinical Observations & Concept Mappings</Typography>
                                        {enc.diagnosis && typeof enc.diagnosis === 'object' && Object.keys(enc.diagnosis).length > 0 ? (
                                          <Paper variant="outlined" sx={{ mt: 1, maxHeight: 220, overflowY: 'auto', borderRadius: 1.5 }}>
                                            <Table size="small">
                                              <TableHead>
                                                <TableRow sx={{ bgcolor: '#f4f6f8' }}>
                                                  <TableCell sx={{ fontWeight: 700, py: 0.6, fontSize: '0.75rem' }}>Concept / Parameter</TableCell>
                                                  <TableCell sx={{ fontWeight: 700, py: 0.6, fontSize: '0.75rem' }}>Observation Value</TableCell>
                                                </TableRow>
                                              </TableHead>
                                              <TableBody>
                                                {Object.entries(enc.diagnosis).map(([conceptName, val]: [string, any]) => (
                                                  <TableRow key={conceptName} hover>
                                                    <TableCell sx={{ py: 0.5, fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary' }}>
                                                      {conceptName}
                                                    </TableCell>
                                                    <TableCell sx={{ py: 0.5, fontSize: '0.8rem', fontWeight: 700 }}>
                                                      <Chip
                                                        label={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                        size="small"
                                                        variant="outlined"
                                                        color={
                                                          conceptName.includes('Viral Load') && (String(val).includes('Target Not Detected') || String(val) === '0') ? 'success' :
                                                          conceptName.includes('Regimen') ? 'primary' :
                                                          conceptName.includes('CD4') ? 'info' : 'default'
                                                        }
                                                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                                                      />
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </Paper>
                                        ) : (
                                          <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto' }}>
                                            {enc.diagnosis ? JSON.stringify(enc.diagnosis, null, 2) : enc.reasonText || 'No clinical notes recorded.'}
                                          </Typography>
                                        )}
                                      </Grid>
                                      <Grid item xs={12} display="flex" justifyContent="flex-end" mt={1}>
                                        <Button 
                                          startIcon={<Print />} 
                                          variant="outlined" 
                                          size="small"
                                          onClick={() => {
                                            if (enc.type === 'LAB_ORDER') {
                                              setPrintEncounter({ type: 'LAB_ORDER', order: enc.rawOrder });
                                            } else if (enc.type === 'PHARMACY_PRESCRIPTION') {
                                              setPrintEncounter({ type: 'PHARMACY_PRESCRIPTION', prescription: enc.rawOrder });
                                            } else if (enc.serviceType === 'REGISTRATION') {
                                              setPrintEncounter({ type: 'REGISTRATION', data: enc });
                                            } else {
                                              setPrintEncounter({ type: 'CLINICAL', data: enc });
                                            }
                                            setTimeout(() => { window.print(); setPrintEncounter(null); }, 500);
                                          }}
                                        >
                                          Print {enc.type === 'LAB_ORDER' ? 'Lab Result' : enc.type === 'PHARMACY_PRESCRIPTION' ? 'Prescription' : 'Encounter'}
                                        </Button>

                                        {enc.serviceType === 'REGISTRATION' && user?.role === 'ADMIN' && !enc.approvedAt && (
                                          <Button 
                                            variant="contained" 
                                            color="success" 
                                            size="small"
                                            sx={{ ml: 2 }}
                                            onClick={async () => {
                                              try {
                                                // fetch the stamp first
                                                const confRes = await api.get('/config/modules');
                                                let stamp = '';
                                                if (confRes.data?.success) {
                                                  const stampConfig = confRes.data.data.find((c: any) => c.moduleKey === 'HOSPITAL_STAMP');
                                                  if (stampConfig?.description) {
                                                    stamp = stampConfig.description.startsWith('http') ? stampConfig.description : `${stampConfig.description}`;
                                                  }
                                                }

                                                if (!stamp) {
                                                  alertMsg('No Hospital Stamp configured in Settings. Please upload a stamp first.', { variant: 'warning' });
                                                  return;
                                                }

                                                const res = await api.post(`/patients/encounters/${enc.id}/approve`, { signature: stamp });
                                                if (res.data?.success) {
                                                  alertMsg('Registration Approved!', { variant: 'success' });
                                                  fetchPatientDetails(); // reload to get the updated encounter
                                                } else {
                                                  alertMsg(res.data?.error || 'Failed to approve', { variant: 'error' });
                                                }
                                              } catch (err: any) {
                                                alertMsg(err.response?.data?.error || 'Error approving registration', { variant: 'error' });
                                              }
                                            }}
                                          >
                                            Approve & Sign
                                          </Button>
                                        )}
                                      </Grid>
                                    </Grid>
                                  </AccordionDetails>
                                </Accordion>
                              ))}
                            </List>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}

                {patient.nmrsEncounters?.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description fontSize="small" /> Official National Form Records (OpenMRS / NMRS)
                    </Typography>
                    {patient.nmrsEncounters.map((ne: any) => (
                      <Paper key={ne.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, bgcolor: '#fbfcfd' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {ne.formSchema?.formName || ne.encounterType}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Encounter No: {ne.encounterNumber} | Date: {new Date(ne.encounterDate).toLocaleDateString()} | Clinician: {ne.clinicianName || 'Unassigned'}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip label={ne.syncStatus} size="small" color={ne.syncStatus === 'SYNCED' ? 'success' : 'info'} />
                            <Tooltip title={`Open & Edit ${ne.formSchema?.formName || ne.encounterType}`}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenFormDialog(ne)}
                                sx={{ bgcolor: '#e0f2fe', '&:hover': { bgcolor: '#bae6fd' } }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        {ne.formData && typeof ne.formData === 'object' && (
                          <Box sx={{ mt: 1 }}>
                            <Grid container spacing={1}>
                              {Object.entries(ne.formData).slice(0, 6).map(([k, v]: [string, any]) => (
                                <Grid item xs={12} sm={6} md={4} key={k}>
                                  <Typography variant="caption" color="text.secondary" display="block">{k}</Typography>
                                  <Typography variant="body2" fontWeight={600} noWrap title={formatObsSummary(k, v)}>{formatObsSummary(k, v)}</Typography>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {tabIndex === 3 && (
              <Box>
                {patient.insurancePolicies?.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No insurance policy details linked.</Typography>
                ) : (
                  <Stack spacing={4}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Provider HMO</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Benefit Plan Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Policy Number</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Expiry Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {patient.insurancePolicies?.map((ip: any) => {
                          const isExpired = new Date(ip.expiryDate) < new Date();
                          return (
                            <TableRow key={ip.id}>
                              <TableCell sx={{ fontWeight: 'bold' }}>{ip.provider?.name}</TableCell>
                              <TableCell>{ip.plan?.name}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{ip.membershipNumber}</TableCell>
                              <TableCell>{new Date(ip.expiryDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Chip
                                  label={!ip.isActive ? 'SUSPENDED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                                  size="small"
                                  color={!ip.isActive ? 'default' : isExpired ? 'error' : 'success'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleLoadCatalog(ip.planId, ip.id)}
                                  disabled={!ip.isActive || isExpired}
                                >
                                  View Benefits
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {selectedPolicyId && (
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={2}>Plan Coverage Check & Benefits Catalog</Typography>
                        <Divider sx={{ mb: 2 }} />

                        {/* Quick Coverage Tester */}
                        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                          <Grid item xs={8}>
                            <TextField
                              size="small"
                              label="Test Coverage by Service Code"
                              placeholder="e.g. OPD-GENERAL, LAB-CBC"
                              fullWidth
                              value={checkServiceCode}
                              onChange={e => setCheckServiceCode(e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <Button
                              variant="contained"
                              onClick={handleCheckCoverage}
                              disabled={checkingCoverage || !checkServiceCode}
                              fullWidth
                            >
                              Check
                            </Button>
                          </Grid>
                        </Grid>

                        {checkResult && (
                          <Box sx={{ mb: 3 }}>
                            {checkResult.hasCoverage ? (
                              <Alert
                                severity={checkResult.serviceResult?.coverageType === 'FULL' ? 'success' : checkResult.serviceResult?.coverageType === 'PARTIAL' ? 'warning' : 'error'}
                                sx={{ borderRadius: 2 }}
                              >
                                <strong>{checkResult.serviceResult?.serviceName || checkServiceCode}</strong> —{' '}
                                {checkResult.serviceResult?.coverageType || 'EXCLUDED'}{' '}
                                {checkResult.serviceResult?.coverageType === 'PARTIAL' && `(${checkResult.serviceResult.coveragePct}%)`}
                                {checkResult.serviceResult?.maxAmount && ` · Max ₦${Number(checkResult.serviceResult.maxAmount).toLocaleString()}`}
                                {checkResult.serviceResult?.requiresPreAuth && ' · Pre-authorization required'}
                              </Alert>
                            ) : (
                              <Alert severity="error" sx={{ borderRadius: 2 }}>{checkResult.message || 'No coverage found.'}</Alert>
                            )}
                          </Box>
                        )}

                        {/* Benefits Table */}
                        <Typography variant="body2" fontWeight={700} color="text.secondary" mb={1}>Covered Benefit Items</Typography>
                        {loadingCatalog ? (
                          <CircularProgress size={20} />
                        ) : selectedPolicyCatalog.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">No benefits registered for this plan.</Typography>
                        ) : (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Cover %</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Max Amount</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedPolicyCatalog.map(item => (
                                <TableRow key={item.id}>
                                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.serviceCode}</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>{item.serviceName}</TableCell>
                                  <TableCell>{item.serviceCategory}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={item.coverageType}
                                      size="small"
                                      color={item.coverageType === 'FULL' ? 'success' : item.coverageType === 'PARTIAL' ? 'warning' : 'error'}
                                      sx={{ fontSize: '0.65rem', height: 16 }}
                                    />
                                  </TableCell>
                                  <TableCell>{item.coveragePct}%</TableCell>
                                  <TableCell>{item.maxAmount ? `₦${Number(item.maxAmount).toLocaleString()}` : '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Paper>
                    )}
                  </Stack>
                )}
              </Box>
            )}

            <Divider sx={{ my: 4 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<SwapHoriz />}
                onClick={() => {
                  setNewStatus(patient?.status || 'ACTIVE');
                  setOpenStatusChange(true);
                }}
              >
                Change Status
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => {
                  setDeleteBlockedMsg('');
                  setDeleteOpen(true);
                }}
              >
                Delete Profile
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Side Barcode / ID Card Preview */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, borderRadius: 3, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={700} mb={3}>Patient Card Preview</Typography>
            
            <Box
              className="printable-patient-id-card"
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #1e2a78 0%, #162068 100%)',
                color: 'common.white',
                position: 'relative',
                borderRadius: 2,
                mb: 3,
                minHeight: 180,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box component="img" src={assetUrl('/hospital-logo.png')} sx={{ width: 22, height: 22, objectFit: 'contain', borderRadius: '4px', bgcolor: '#fff', p: 0.2 }} />
                <Typography variant="caption" sx={{ letterSpacing: '0.05em', fontWeight: 'bold', color: '#fff' }}>
                  FAITH FOUNDATION MISSION HOSPITAL
                </Typography>
              </Stack>
              <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.15)' }} />
              
              <Stack direction="row" spacing={2} sx={{ mt: 1.5, textAlign: 'left' }} alignItems="center">
                <Avatar src={patient.photoUrl || undefined} sx={{ width: 56, height: 56, border: '2px solid #fff' }}>
                  {patient.firstName[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fff' }}>
                    {patient.firstName} {patient.lastName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', fontFamily: 'monospace' }}>
                    MRN: {patient.patientNumber}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Sex: {patient.gender} • Insurance: {patient.insurancePolicy?.provider?.name || 'Self Payer'}
                  </Typography>
                </Box>
              </Stack>
              
              {/* Simulated barcode */}
              <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                <Box sx={{ display: 'flex', height: 24, width: 140, bgcolor: '#fff', p: 0.2, borderRadius: 0.5, gap: 0.5 }}>
                  {[1, 3, 2, 4, 1, 2, 3, 1, 4, 2].map((w, idx) => (
                    <Box key={idx} sx={{ width: w, height: '100%', bgcolor: '#000' }} />
                  ))}
                </Box>
                <Typography variant="caption" sx={{ letterSpacing: '0.2em', fontWeight: 'bold', fontFamily: 'monospace', color: '#fff', mt: 0.5, fontSize: '0.7rem' }}>
                  {patient.patientNumber}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              startIcon={<Print />}
              fullWidth
              onClick={handlePrintCard}
            >
              Print ID Card
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* CONFIRM DELETE DIALOG */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {deleteBlockedMsg ? 'Deletion Blocked' : 'Confirm Account Deletion'}
        </DialogTitle>
        <DialogContent>
          {deleteBlockedMsg ? (
            <Stack spacing={2}>
              <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                <Typography variant="body2" color="warning.dark" fontWeight={600}>
                  ⚠ This patient cannot be deleted
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This patient has existing clinical records (appointments, encounters, or invoices). Hard deletion is blocked to preserve medical audit trails.
                </Typography>
              </Box>
              <Typography variant="body2">
                You can <strong>change the patient's status</strong> to <em>ARCHIVED</em> or <em>INACTIVE</em> to deactivate the account while preserving the medical history.
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2">
              Are you sure you want to permanently delete this patient account and all associated encounters, billings, and clinical files? <strong>This cannot be undone.</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          {deleteBlockedMsg ? (
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                setDeleteOpen(false);
                setNewStatus('ARCHIVED');
                setOpenStatusChange(true);
              }}
            >
              Archive Instead
            </Button>
          ) : (
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Confirm Delete
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* STATUS CHANGE DIALOG */}
      <Dialog open={openStatusChange} onClose={() => setOpenStatusChange(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Change Patient Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current status: <Chip label={patient?.status || '...'} size="small"
                color={patient?.status === 'ACTIVE' ? 'success' : patient?.status === 'DECEASED' ? 'error' : 'default'}
              />
            </Typography>
            <FormControl fullWidth>
              <InputLabel>New Status *</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="New Status *"
              >
                <MenuItem value="ACTIVE">✅ ACTIVE IN CARE</MenuItem>
                <MenuItem value="DECEASED">💀 DECEASED / DEAD</MenuItem>
                <MenuItem value="TRANSFERRED_OUT">📤 TRANSFERRED OUT</MenuItem>
                <MenuItem value="LTFU">⚠️ LOST TO FOLLOW-UP (LTFU)</MenuItem>
                <MenuItem value="STOPPED_TREATMENT">🛑 STOPPED TREATMENT</MenuItem>
                <MenuItem value="INACTIVE">🔴 INACTIVE</MenuItem>
                <MenuItem value="ARCHIVED">📁 ARCHIVED</MenuItem>
              </Select>
            </FormControl>
            {newStatus === 'DECEASED' && (
              <Box sx={{ p: 1.5, bgcolor: 'error.light', borderRadius: 1.5 }}>
                <Typography variant="caption" color="error.dark" fontWeight={700}>
                  ⚠ Setting status to DECEASED will mark the patient as dead and deactivate active clinical orders and portal access.
                </Typography>
              </Box>
            )}
            {newStatus === 'TRANSFERRED_OUT' && (
              <Box sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: 1.5 }}>
                <Typography variant="caption" color="warning.dark" fontWeight={700}>
                  ℹ Setting status to TRANSFERRED OUT indicates the patient has moved to another facility.
                </Typography>
              </Box>
            )}
            {newStatus === 'LTFU' && (
              <Box sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: 1.5 }}>
                <Typography variant="caption" color="warning.dark" fontWeight={700}>
                  ℹ Patient will be flagged for community tracking and retention follow-up.
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatusChange(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusChange}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* LINK FAMILY DIALOG */}
      <Dialog open={openLinkFamily} onClose={() => setOpenLinkFamily(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Link Patient to Family Account</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Option A: Convert Account & Create New Family Account</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Convert this account to a Family Account and make <strong>{patient?.firstName} {patient?.lastName}</strong> the Family Head.
              </Typography>
              
              <Stack spacing={2} sx={{ mb: 2, mt: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={chargeUpgrade}
                      onChange={(e) => setChargeUpgrade(e.target.checked)}
                      color="secondary"
                      sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' } }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                      Charge Account Upgrade / Conversion Fee
                    </Typography>
                  }
                />
                
                {chargeUpgrade && (
                  <TextField
                    type="number"
                    size="small"
                    label="Upgrade Fee Amount (₦)"
                    value={upgradeFee}
                    onChange={(e) => setUpgradeFee(Number(e.target.value))}
                    InputLabelProps={{
                      style: { color: 'rgba(255,255,255,0.9)' },
                    }}
                    sx={{
                      input: { color: '#fff' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                        '&:hover fieldset': { borderColor: '#fff' },
                        '&.Mui-focused fieldset': { borderColor: '#fff' },
                      }
                    }}
                  />
                )}
              </Stack>

              <Button variant="contained" color="secondary" onClick={handleCreateFamily} fullWidth>
                Convert and Create Family Account
              </Button>
            </Box>

            <Divider>OR</Divider>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Option B: Link to Existing Family Account</Typography>
              {familyAccounts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No other Family Accounts currently registered to link this patient to.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Select Family Account *</InputLabel>
                    <Select
                      value={selectedFamilyId}
                      onChange={(e) => setSelectedFamilyId(e.target.value)}
                      label="Select Family Account *"
                    >
                      {familyAccounts.map((f) => (
                        <MenuItem key={f.id} value={f.id}>
                          {f.familyNumber} — Head: {f.headName} ({f.headMrn})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Relationship to Family Head *</InputLabel>
                    <Select
                      value={familyRelationship}
                      onChange={(e) => setFamilyRelationship(e.target.value)}
                      label="Relationship to Family Head *"
                    >
                      <MenuItem value="SPOUSE">SPOUSE</MenuItem>
                      <MenuItem value="CHILD">CHILD</MenuItem>
                      <MenuItem value="PARENT">PARENT</MenuItem>
                      <MenuItem value="SIBLING">SIBLING</MenuItem>
                      <MenuItem value="GUARDIAN">GUARDIAN</MenuItem>
                      <MenuItem value="OTHER">OTHER</MenuItem>
                    </Select>
                  </FormControl>

                  <Button variant="contained" onClick={handleLinkFamily}>
                    Link to Selected Account
                  </Button>
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLinkFamily(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      </Box>

      {/* ── Official OpenMRS ESM JSON Schema Form Engine Modal Dialog ── */}
      <Dialog
        open={Boolean(editingEncounter)}
        onClose={() => setEditingEncounter(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden', p: 0 } }}
      >
        {editingEncounter && (
          <EsmFormEngine
            schema={(() => {
              let rawSchema = editingEncounter.formSchema?.schemaJson;
              
              // If rawSchema is incomplete (missing pages or only has 1 basic metadata section), look up rich schema in nmrsSchemas
              const isBasicStub = !rawSchema || !rawSchema.pages || rawSchema.pages.length === 0 || 
                (rawSchema.pages.length === 1 && rawSchema.pages[0].sections?.length <= 2 && rawSchema.pages[0].sections?.every((s: any) => (s.questions?.length || 0) <= 7 && s.id === 'encounter_header'));
              
              if (isBasicStub && nmrsSchemas.length > 0) {
                const targetName = (editingEncounter.formSchema?.formName || editingEncounter.encounterType || '').toLowerCase().trim();
                const matched = nmrsSchemas.find((s: any) => {
                  const sName = (s.formName || '').toLowerCase().trim();
                  return sName === targetName || sName.includes(targetName) || targetName.includes(sName) ||
                    (targetName.includes('intake') && (s.formCode === 'CLIENT_INTAKE_FORM' || s.formCode === 'HTS_REGISTER')) ||
                    (targetName.includes('hts') && (s.formCode === 'HTS_REGISTER' || s.formCode === 'CLIENT_INTAKE_FORM')) ||
                    (targetName.includes('pharmacy') && s.formCode === 'PHARMACY_ORDER') ||
                    (targetName.includes('lab') && s.formCode === 'INTEGRATED_LAB_ORDER') ||
                    (targetName.includes('care card') && s.formCode === 'CARE_CARD_MASTER') ||
                    (targetName.includes('adult') && s.formCode === 'CARE_CARD_4B');
                });
                if (matched?.schemaJson) {
                  rawSchema = matched.schemaJson;
                }
              }

              if (rawSchema?.pages && rawSchema.pages.length > 0) {
                return rawSchema;
              }
              if (rawSchema?.sections && rawSchema.sections.length > 0) {
                return {
                  name: rawSchema.name || rawSchema.formName || editingEncounter.encounterType || 'Encounter Form',
                  encounterType: rawSchema.encounterType || editingEncounter.encounterType,
                  pages: [
                    {
                      label: rawSchema.name || rawSchema.formName || 'Clinical Encounter Details',
                      sections: rawSchema.sections,
                    }
                  ],
                  processor: rawSchema.processor || 'EncounterFormProcessor',
                  uuid: rawSchema.uuid || editingEncounter.formSchemaId,
                };
              }
              return {
                name: editingEncounter.formSchema?.formName || editingEncounter.encounterType || 'Encounter Form',
                encounterType: editingEncounter.encounterType,
                pages: [],
              };
            })()}
            patientContext={{
              id: patient?.id,
              uuid: patient?.id,
              patientNumber: patient?.patientNumber,
              name: `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim(),
              firstName: patient?.firstName,
              lastName: patient?.lastName,
              gender: patient?.gender,
              sex: patient?.gender,
              age: patient?.age,
              birthDate: patient?.birthDate,
              phone: patient?.phone,
              address: patient?.address,
              artNumber: patient?.artNumber,
              hospitalNumber: patient?.hospitalNumber,
            }}
            initialValues={editingFormData}
            mode="edit"
            isSubmitting={savingEncounter}
            onCancel={() => setEditingEncounter(null)}
            onSubmit={async (formData) => {
              setSavingEncounter(true);
              try {
                const res = await api.put(`/nmrs/encounters/${editingEncounter.id}`, {
                  formData
                });
                alertMsg(res.data?.message || 'Encounter form updated successfully', { variant: 'success' });
                setEditingEncounter(null);
                fetchPatientDetails();
              } catch (err: any) {
                alertMsg(err.response?.data?.message || 'Failed to update encounter form', { variant: 'error' });
              } finally {
                setSavingEncounter(false);
              }
            }}
          />
        )}
      </Dialog>

      {/* Hidden Print Templates */}
      <Box sx={{ display: 'none', '@media print': { display: 'block !important' } }}>
        {printEncounter?.type === 'LAB_ORDER' ? (
          <LabReportPrintTemplate order={printEncounter.order} />
        ) : printEncounter?.type === 'PHARMACY_PRESCRIPTION' ? (
          <PrescriptionPrintTemplate prescription={printEncounter.prescription} />
        ) : printEncounter?.type === 'REGISTRATION' ? (
          <RegistrationPrintTemplate patient={patient} encounter={printEncounter.data} />
        ) : printEncounter?.type === 'CLINICAL' ? (
          <EncounterPrintTemplate encounter={printEncounter.data} patient={patient} />
        ) : (
          <TreatmentChartPrintTemplate patient={patient} />
        )}
      </Box>
    </Container>
  );
};

export default PatientDetail;