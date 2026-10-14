/**
 * OpenMRS ESM Form Engine Field Renderer
 * Replicates input controls from @openmrs/esm-form-engine-lib/src/components/inputs
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Select,
  MenuItem,
  InputLabel,
  Switch,
  Tooltip,
  IconButton,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import { InfoOutlined as InfoIcon } from '@mui/icons-material';
import { FormField, PatientContext } from './types';
import { matchAnswerConcept, normalizeDateToYMD } from './legacyFormNormalizer';
import { api } from '../../services/api';

interface EsmFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (fieldId: string, value: any) => void;
  formValues: Record<string, any>;
  patientContext: PatientContext;
  error?: string;
  isReadonly?: boolean;
}

// Fallback clinical providers reflecting authentic hospital staffing
const FALLBACK_PROVIDERS_LIST = [
  { label: 'Dr. John Smith (Chief Consultant Physician)', concept: 'Dr. John Smith', value: 'Dr. John Smith' },
  { label: 'Dr. Emmanuel Vegher (Medical Director)', concept: 'Dr. Emmanuel Vegher', value: 'Dr. Emmanuel Vegher' },
  { label: 'Pharm. Kemi Adeleke (Director of Pharmacy Services)', concept: 'Pharm. Kemi Adeleke', value: 'Pharm. Kemi Adeleke' },
  { label: 'Pharm. Ibrahim Musa (Chief Pharmacist)', concept: 'Pharm. Ibrahim Musa', value: 'Pharm. Ibrahim Musa' },
  { label: 'Pharm. Chidi Nwosu (Clinical Pharmacist)', concept: 'Pharm. Chidi Nwosu', value: 'Pharm. Chidi Nwosu' },
  { label: 'Nurse Blessing (Senior ART Nursing Officer)', concept: 'Nurse Blessing', value: 'Nurse Blessing' },
  { label: 'Medical Records Officer (Health Records)', concept: 'Medical Records Officer', value: 'Medical Records Officer' },
];

const LOCATIONS_LIST = [
  { label: 'Main Facility / ARV Clinic', concept: 'Main Facility / ARV Clinic', value: 'Main Facility / ARV Clinic' },
  { label: 'Faith Foundation Specialist Hospital', concept: 'Faith Foundation Specialist Hospital', value: 'Faith Foundation Specialist Hospital' },
  { label: 'Pharmacy Dispensing Unit', concept: 'Pharmacy Dispensing Unit', value: 'Pharmacy Dispensing Unit' },
  { label: 'Adult ART Clinic', concept: 'Adult ART Clinic', value: 'Adult ART Clinic' },
  { label: 'PMTCT / MCH Clinic', concept: 'PMTCT / MCH Clinic', value: 'PMTCT / MCH Clinic' },
  { label: 'Laboratory Unit', concept: 'Laboratory Unit', value: 'Laboratory Unit' },
];

// In-memory cache for live providers loaded from database / OpenMRS
let cachedProviders: Array<{ label: string; concept: string; value: string }> | null = null;
let isFetchingProviders = false;

export const loadProvidersFromApi = async (): Promise<Array<{ label: string; concept: string; value: string }>> => {
  if (cachedProviders && cachedProviders.length > 0) return cachedProviders;
  if (isFetchingProviders) return cachedProviders || [];
  isFetchingProviders = true;
  try {
    const res = await api.get('/nmrs/providers');
    const list = res.data?.data || [];
    if (Array.isArray(list) && list.length > 0) {
      cachedProviders = list.map((p: any) => ({
        label: p.name || p.identifier,
        concept: p.name || p.uuid || p.identifier,
        value: p.name || p.identifier
      }));
      return cachedProviders;
    }
  } catch {
    // ignore
  } finally {
    isFetchingProviders = false;
  }
  return cachedProviders || [];
};

export const EsmFieldRenderer: React.FC<EsmFieldRendererProps> = ({
  field,
  value,
  onChange,
  formValues,
  patientContext,
  error,
  isReadonly = false,
}) => {
  const { id, label, questionOptions, isRequired, isDisabled, questionInfo } = field;
  const rendering = questionOptions?.rendering || 'text';
  const rawAnswers = questionOptions?.answers || (field as any).answers || (field as any).options || [];

  const [providerOptions, setProviderOptions] = useState<any[]>(() => cachedProviders || []);

  const normId = (id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normLabel = (label || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const isProviderField =
    field.type === 'encounterProvider' ||
    normId.includes('orderby') || normId.includes('dispensedby') || normId.includes('signature') ||
    normId.includes('provider') || normId.includes('clinician') || normLabel.includes('order by') ||
    normLabel.includes('dispensed by') || normLabel.includes('signature') || normLabel.includes('provider');

  useEffect(() => {
    if (isProviderField) {
      if (!cachedProviders || cachedProviders.length === 0) {
        loadProvidersFromApi().then((list) => {
          if (list && list.length > 0) {
            setProviderOptions(list);
          }
        });
      }
    }
  }, [isProviderField]);

  // Dynamic datasource & category resolution for dropdowns if answers are empty
  let effectiveAnswers = [...rawAnswers];

  if (effectiveAnswers.length === 0) {
    // 1. Providers / Signatures
    if (isProviderField) {
      effectiveAnswers = providerOptions.length > 0
        ? providerOptions
        : (cachedProviders && cachedProviders.length > 0 ? cachedProviders : [...FALLBACK_PROVIDERS_LIST]);
    }
    // 2. Locations / Facility
    else if (
      normId.includes('location') || normId.includes('facility') || normLabel.includes('location') ||
      normLabel.includes('facility')
    ) {
      effectiveAnswers = [...LOCATIONS_LIST];
    }
    // 3. ARV Strengths (Checked before drugs because field IDs like 'Drug_Strength_ART_1' contain 'drug')
    else if (
      questionOptions?.datasource?.name === 'arvStrengths' ||
      normId.includes('strength') ||
      normLabel.includes('strength')
    ) {
      effectiveAnswers = [
        { label: '300/300/50mg', concept: '300/300/50mg', value: '300/300/50mg' },
        { label: '300/300/600mg', concept: '300/300/600mg', value: '300/300/600mg' },
        { label: '300/150/200mg', concept: '300/150/200mg', value: '300/150/200mg' },
        { label: '600/300/50mg', concept: '600/300/50mg', value: '600/300/50mg' },
        { label: '600/300/600mg', concept: '600/300/600mg', value: '600/300/600mg' },
        { label: '300/300mg', concept: '300/300mg', value: '300/300mg' },
        { label: '300/150mg', concept: '300/150mg', value: '300/150mg' },
        { label: '300/100mg', concept: '300/100mg', value: '300/100mg' },
        { label: '200/50mg', concept: '200/50mg', value: '200/50mg' },
        { label: '300mg', concept: '300mg', value: '300mg' },
        { label: '200mg', concept: '200mg', value: '200mg' },
        { label: '150mg', concept: '150mg', value: '150mg' },
        { label: '100mg', concept: '100mg', value: '100mg' },
        { label: '50mg', concept: '50mg', value: '50mg' },
        { label: '10mg', concept: '10mg', value: '10mg' },
        { label: '600mg', concept: '600mg', value: '600mg' },
        { label: '400mg', concept: '400mg', value: '400mg' },
        { label: '960mg', concept: '960mg', value: '960mg' },
        { label: '480mg', concept: '480mg', value: '480mg' },
      ];
    }
    // 4. ARV Drugs (Clean NMRS mappings without duplicate CIEL options)
    else if (
      questionOptions?.datasource?.name === 'arvDrugs' ||
      ((normId.includes('drug') || normId.includes('arvdrug')) &&
        !normId.includes('strength') &&
        !normLabel.includes('strength') &&
        !normId.includes('frequency') &&
        !normLabel.includes('frequency') &&
        !normId.includes('duration') &&
        !normId.includes('qty') &&
        !normId.includes('cotrim') &&
        !normId.includes('tbprev') &&
        !normId.includes('prep'))
    ) {
      effectiveAnswers = [
        { label: 'Tenofovir / Lamivudine / Dolutegravir (TDF/3TC/DTG)', concept: '8a343013-0216-44e0-aefe-53909ffd5631', value: '8a343013-0216-44e0-aefe-53909ffd5631' },
        { label: 'Tenofovir / Lamivudine / Efavirenz (TDF/3TC/EFV)', concept: '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '164505AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Abacavir / Lamivudine / Dolutegravir (ABC/3TC/DTG)', concept: '14c41615-9c0e-4254-b4b1-770956d390e9', value: '14c41615-9c0e-4254-b4b1-770956d390e9' },
        { label: 'Zidovudine / Lamivudine / Nevirapine (AZT/3TC/NVP)', concept: '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Abacavir / Lamivudine (ABC/3TC)', concept: '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Tenofovir / Lamivudine (TDF/3TC)', concept: '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Zidovudine / Lamivudine (AZT/3TC)', concept: '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Dolutegravir (DTG 50mg)', concept: '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Atazanavir / Ritonavir (ATV/r 300/100mg)', concept: '161361AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '161361AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Lopinavir / Ritonavir (LPV/r 200/50mg)', concept: '794AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '794AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Darunavir / Ritonavir (DRV/r 600/100mg)', concept: '165633AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '165633AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Raltegravir (RAL 400mg)', concept: '154378AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '154378AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Cotrimoxazole (CTX 960mg)', concept: '105281AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '105281AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Isoniazid (INH 300mg)', concept: '78280AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '78280AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: '3HP (Rifapentine + INH)', concept: '167041AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', value: '167041AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 5. Purpose of Prescription / Treatment Type
    else if (normId.includes('treatmenttype') || normId.includes('purpose') || normLabel.includes('purpose')) {
      effectiveAnswers = [
        { label: 'ART (Antiretroviral Therapy)', concept: '9b49eb5e-9ca9-4494-a2ff-f1d62b6feecc' },
        { label: 'Non-ART', concept: '165048AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Occupational PEP', concept: '165060AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Non-Occupational PEP', concept: '165062AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'PMTCT Mother', concept: '165063AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'PrEP (Pre-Exposure Prophylaxis)', concept: '165064AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 6. Visit Type
    else if (normId.includes('visittype') || normLabel.includes('visit type')) {
      effectiveAnswers = [
        { label: 'Facility Pickup', concept: '160530AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Community / DSD Pickup', concept: '160531AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 7. Refill (Yes/No)
    else if (normId === 'refill' || normLabel === 'refill') {
      effectiveAnswers = [
        { label: 'Yes (Drug Refill)', concept: '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'No (New Dispensation)', concept: '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 8. Substitution / Switch Reason
    else if (normId.includes('pickupreason') || normId.includes('substitution') || normLabel.includes('substitution')) {
      effectiveAnswers = [
        { label: 'Drug Substitution (Toxicity/Side Effects)', concept: '165681' },
        { label: 'Drug Switch (Treatment Failure)', concept: '165682' },
        { label: 'New Clinical Guideline', concept: '165683' },
        { label: 'Stock Out', concept: '165684' },
      ];
    }
    // 9. DSD Model / Dispensing Modality
    else if (normId.includes('dispensingmodality') || normId.includes('dsd') || normLabel.includes('dsd')) {
      effectiveAnswers = [
        { label: 'Facility Based Dispensing', concept: '60882cd1-1f42-485b-8afb-cd988282251e' },
        { label: 'Community ART Group (CAG)', concept: 'c291af62-d00e-4ace-a672-f6f965b325ff' },
        { label: 'Fast Track Refill', concept: 'd291af62-d00e-4ace-a672-f6f965b325ff' },
        { label: 'Non-devolved', concept: '166145AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 10. Treatment Age Group
    else if (normId.includes('treatmentagegroup') || normLabel.includes('treatment age group')) {
      effectiveAnswers = [
        { label: 'Adult (>= 15 years)', concept: 'a291af62-d00e-4ace-a672-f6f965b325fe' },
        { label: 'Child (< 15 years)', concept: 'c291af62-d00e-4ace-a672-f6f965b325fe' },
      ];
    }
    // 11. Regimen Line
    else if (normId.includes('regimenline') || normLabel.includes('regimen line')) {
      effectiveAnswers = [
        { label: 'Adult 1st Line', concept: '164506AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Adult 2nd Line', concept: '164513AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Adult 3rd Line', concept: '165702AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Child 1st Line', concept: '164507AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Child 2nd Line', concept: '164514AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 12. Drug Frequency
    else if (normId.includes('frequency') || normLabel.includes('frequency')) {
      effectiveAnswers = [
        { label: 'Once daily (OD)', concept: '160862AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Twice daily (BD)', concept: '160863AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Three times daily (TDS)', concept: '160864AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Four times daily (QDS)', concept: '160865AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 13. OI Prophylaxis Drugs (Cotrimoxazole)
    else if (normId.includes('cotrim') || normId.includes('oiprophylaxis') || normLabel.includes('oi')) {
      effectiveAnswers = [
        { label: 'Cotrimoxazole 960mg (CTX)', concept: 'dbf8a287-3c82-440b-bfc3-a4b9432f9183' },
        { label: 'Cotrimoxazole 480mg (CTX)', concept: '105281AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Dapsone 100mg', concept: '74250AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Fluconazole 200mg', concept: '76488AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 14. TB Prevention Drugs (INH)
    else if (normId.includes('tbprev') || normLabel.includes('tb prev')) {
      effectiveAnswers = [
        { label: 'Isoniazid (INH 300mg)', concept: '656AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: '3HP (Rifapentine + INH)', concept: '167041AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Rifampicin + INH', concept: '78280AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 15. PrEP Drugs
    else if (normId.includes('prep') || normLabel.includes('prep')) {
      effectiveAnswers = [
        { label: 'TDF/FTC (Truvada 300/200mg)', concept: '9aed739b-a64a-4e0d-afa0-f2b50d4cb2c2' },
        { label: 'TDF/3TC (Tenofovir/Lamivudine)', concept: '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Cabotegravir (CAB-LA Long Acting)', concept: '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 16. Pregnancy Status
    else if (normId.includes('pregnant') || normLabel.includes('pregnant')) {
      effectiveAnswers = [
        { label: 'Pregnant', concept: '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Not Pregnant', concept: '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Breastfeeding', concept: '5526AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
    // 17. Functional Status
    else if (normId.includes('functional') || normLabel.includes('functional')) {
      effectiveAnswers = [
        { label: 'Physically able to work (Working)', concept: '165889AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Ambulatory', concept: '165888AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Bedridden', concept: '165887AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    }
  }

  // Normalize value if an object was passed (e.g. { concept, label, value })
  let cleanScalarValue = value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    cleanScalarValue = value.concept || value.value || value.label || '';
  }

  // Find matching answer for select/radio
  const matchedUuid = matchAnswerConcept(cleanScalarValue, effectiveAnswers);
  const matchingAns = matchedUuid
    ? effectiveAnswers.find(
        (a) =>
          (a.concept && a.concept.toLowerCase() === matchedUuid.toLowerCase()) ||
          (a.value && String(a.value).toLowerCase() === matchedUuid.toLowerCase())
      )
    : effectiveAnswers.find(
        (a) =>
          (a.concept && String(a.concept).toLowerCase() === String(cleanScalarValue).toLowerCase()) ||
          (a.value && String(a.value).toLowerCase() === String(cleanScalarValue).toLowerCase()) ||
          (a.label && String(a.label).toLowerCase() === String(cleanScalarValue).toLowerCase())
      );
  const selectedValue = matchingAns
    ? String(matchingAns.concept || matchingAns.value || matchingAns.label)
    : (matchedUuid ? String(matchedUuid) : (cleanScalarValue !== undefined && cleanScalarValue !== null && cleanScalarValue !== '' ? String(cleanScalarValue) : ''));

  if (selectedValue && !effectiveAnswers.some((a) => String(a.concept || a.value || a.label) === selectedValue)) {
    effectiveAnswers.push({ label: selectedValue, concept: selectedValue, value: selectedValue });
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(id, e.target.value);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
    onChange(id, val);
  };

  const handleSelectChange = (e: any) => {
    onChange(id, e.target.value);
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(id, e.target.value);
  };

  const handleCheckboxChange = (conceptVal: string, checked: boolean) => {
    const currentList: string[] = Array.isArray(value) ? [...value] : value ? [value] : [];
    if (checked) {
      if (!currentList.includes(conceptVal)) currentList.push(conceptVal);
    } else {
      const idx = currentList.indexOf(conceptVal);
      if (idx !== -1) currentList.splice(idx, 1);
    }
    onChange(id, currentList);
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(id, e.target.checked);
  };

  const disabled = isDisabled || isReadonly;

  const renderLabelWithInfo = (
    <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
        {label || id}
        {isRequired && <span style={{ color: '#d32f2f', marginLeft: 4 }}>*</span>}
      </Typography>
      {questionInfo && (
        <Tooltip title={questionInfo} arrow placement="top">
          <IconButton size="small" sx={{ p: 0.2 }}>
            <InfoIcon fontSize="small" sx={{ fontSize: '1rem', color: 'info.main' }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  // 1. Radio / Content-Switcher
  if (rendering === 'radio' || rendering === 'content-switcher') {
    return (
      <Box sx={{ my: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        {renderLabelWithInfo}
        <RadioGroup row value={selectedValue} onChange={handleRadioChange}>
          {effectiveAnswers.map((ans) => {
            const ansVal = ans.concept || ans.value || ans.label;
            return (
              <FormControlLabel
                key={ansVal}
                value={String(ansVal)}
                control={<Radio size="small" />}
                label={<Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{ans.label || ansVal}</Typography>}
                disabled={disabled || ans.isDisabled}
                sx={{ mr: 2.5 }}
              />
            );
          })}
        </RadioGroup>
        {error && <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>{error}</Typography>}
      </Box>
    );
  }

  // 2. Checkbox / Multi-Select
  if (rendering === 'checkbox' || rendering === 'checkbox-searchable' || rendering === 'multi-select' || rendering === 'multiCheckbox') {
    const selectedValues: string[] = Array.isArray(value) ? value : value ? [value] : [];
    return (
      <Box sx={{ my: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        {renderLabelWithInfo}
        <FormGroup row>
          {effectiveAnswers.map((ans) => {
            const ansVal = ans.concept || ans.value || ans.label;
            const checked = selectedValues.includes(String(ansVal));
            return (
              <FormControlLabel
                key={ansVal}
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={(e) => handleCheckboxChange(String(ansVal), e.target.checked)}
                    disabled={disabled || ans.isDisabled}
                  />
                }
                label={<Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{ans.label || ansVal}</Typography>}
                sx={{ mr: 2 }}
              />
            );
          })}
        </FormGroup>
        {error && <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>{error}</Typography>}
      </Box>
    );
  }

  // 3. Dropdown / Select / ui-select-extended / select-concept-answers / concept-search
  if (
    rendering === 'select' ||
    rendering === 'ui-select-extended' ||
    rendering === 'select-concept-answers' ||
    rendering === 'drug' ||
    rendering === 'problem' ||
    rendering === 'dropdown' ||
    rendering === 'concept-search' ||
    rendering === 'autocomplete' ||
    rendering === 'coded'
  ) {
    return (
      <Box sx={{ my: 1 }}>
        <FormControl fullWidth size="small" error={Boolean(error)} disabled={disabled}>
          <InputLabel id={`${id}-label`}>
            {label || id} {isRequired ? '*' : ''}
          </InputLabel>
          <Select
            labelId={`${id}-label`}
            id={id}
            value={selectedValue}
            label={`${label || id} ${isRequired ? '*' : ''}`}
            onChange={handleSelectChange}
            sx={{ bgcolor: '#fff' }}
          >
            <MenuItem value="">
              <em>-- Select an option --</em>
            </MenuItem>
            {effectiveAnswers.map((ans, idx) => {
              const ansVal = ans.concept || ans.value || ans.label;
              return (
                <MenuItem key={`${ansVal}-${idx}`} value={String(ansVal)} disabled={ans.isDisabled}>
                  {ans.label || ansVal}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
        {error && <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>{error}</Typography>}
      </Box>
    );
  }

  // 4. Date / DateTime
  if (rendering === 'date' || rendering === 'datetime' || field.type === 'encounterDatetime') {
    const safeDateValue = (() => {
      if (!value || typeof value === 'boolean' || value === 'true' || value === 'false') return '';
      if (rendering === 'datetime') {
        try {
          const d = new Date(value);
          if (isNaN(d.getTime())) return '';
          return d.toISOString().slice(0, 16);
        } catch {
          return '';
        }
      }
      return normalizeDateToYMD(value);
    })();

    return (
      <Box sx={{ my: 1 }}>
        <TextField
          fullWidth
          size="small"
          type={rendering === 'datetime' ? 'datetime-local' : 'date'}
          label={label || id}
          value={safeDateValue}
          onChange={handleTextChange}
          disabled={disabled}
          error={Boolean(error)}
          helperText={error}
          required={isRequired}
          InputLabelProps={{ shrink: true }}
          sx={{ bgcolor: '#fff' }}
        />
      </Box>
    );
  }

  // 5. Number / Numeric
  if (rendering === 'number' || rendering === 'numeric') {
    return (
      <Box sx={{ my: 1 }}>
        <TextField
          fullWidth
          size="small"
          type="number"
          label={label || id}
          value={value !== undefined && value !== null ? value : ''}
          onChange={handleNumberChange}
          disabled={disabled}
          error={Boolean(error)}
          helperText={error}
          required={isRequired}
          inputProps={{
            min: questionOptions?.min,
            max: questionOptions?.max,
            step: questionOptions?.step || (questionOptions?.disallowDecimals ? 1 : 'any'),
          }}
          sx={{ bgcolor: '#fff' }}
        />
      </Box>
    );
  }

  // 6. Textarea
  if (rendering === 'textarea') {
    return (
      <Box sx={{ my: 1 }}>
        <TextField
          fullWidth
          multiline
          rows={questionOptions?.rows || 3}
          size="small"
          label={label || id}
          value={value || ''}
          onChange={handleTextChange}
          disabled={disabled}
          error={Boolean(error)}
          helperText={error}
          required={isRequired}
          sx={{ bgcolor: '#fff' }}
        />
      </Box>
    );
  }

  // 7. Toggle / Switch
  if (rendering === 'toggle') {
    const labelTrue = questionOptions?.toggleOptions?.labelTrue || 'Yes';
    const labelFalse = questionOptions?.toggleOptions?.labelFalse || 'No';
    return (
      <Box sx={{ my: 1, p: 1.5, borderRadius: 1.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {label || id} {isRequired && <span style={{ color: '#d32f2f' }}>*</span>}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color={!value ? 'primary.main' : 'text.secondary'}>
              {labelFalse}
            </Typography>
            <Switch
              checked={Boolean(value)}
              onChange={handleToggleChange}
              disabled={disabled}
              color="primary"
            />
            <Typography variant="body2" color={value ? 'primary.main' : 'text.secondary'}>
              {labelTrue}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  // 8. Fixed Value / Markdown
  if (rendering === 'fixed-value' || rendering === 'markdown') {
    return (
      <Box sx={{ my: 1, p: 1.5, bgcolor: '#f1f5f9', borderRadius: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
          {label || id}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}>
          {questionOptions?.defaultValue || value || 'N/A'}
        </Typography>
      </Box>
    );
  }

  // Default Fallback: Text Field
  return (
    <Box sx={{ my: 1 }}>
      <TextField
        fullWidth
        size="small"
        label={label || id}
        value={value !== undefined && value !== null ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : ''}
        onChange={handleTextChange}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error}
        required={isRequired}
        sx={{ bgcolor: '#fff' }}
      />
    </Box>
  );
};
