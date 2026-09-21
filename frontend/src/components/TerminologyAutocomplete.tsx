import { useState, useEffect, useCallback } from 'react';
import { Autocomplete, TextField, CircularProgress, Chip, Box, Typography, Paper } from '@mui/material';
import { Public, CheckCircle, WifiOff, CloudDone, FlashOn } from '@mui/icons-material';
import { api } from '../services/api';

export interface TerminologyConceptOption {
  id?: string;
  code: string;
  display: string;
  system: string;
  category?: string;
  description?: string;
  isRemote?: boolean;
  isOfflineFallback?: boolean;
}

interface TerminologyAutocompleteProps {
  system: 'ICD10' | 'LOINC' | 'RXNORM' | 'CPT' | 'SNOMED' | 'ALL';
  label: string;
  placeholder?: string;
  value: any; // string or string[]
  onChange: (code: any, display?: string, concept?: TerminologyConceptOption) => void;
  multiple?: boolean;
  fullWidth?: boolean;
  required?: boolean;
  size?: 'small' | 'medium';
  extraOptions?: TerminologyConceptOption[];
}

const BUILTIN_OFFLINE_DICTIONARY: TerminologyConceptOption[] = [
  // ICD10 Diagnoses
  { code: 'B50.9', display: 'Plasmodium falciparum malaria, unspecified (Severe Malaria)', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'B54', display: 'Unspecified malaria (Malaria Fever)', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'D64.9', display: 'Anaemia, unspecified', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'D57.0', display: 'Sickle-cell anaemia with crisis', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'I10', display: 'Essential (primary) hypertension', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'I11.9', display: 'Hypertensive heart disease without heart failure', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'E11.9', display: 'Type 2 diabetes mellitus without complications', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'E11.1', display: 'Type 2 diabetes mellitus with ketoacidosis (DKA)', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'J18.9', display: 'Pneumonia, unspecified organism', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'A15.0', display: 'Tuberculosis of lung', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'J45.909', display: 'Unspecified asthma, uncomplicated', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'K35.80', display: 'Unspecified acute appendicitis', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'R10.0', display: 'Severe acute abdomen', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'A09', display: 'Infectious gastroenteritis and colitis', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'A01.0', display: 'Typhoid fever (Salmonella typhi)', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'O80', display: 'Encounter for full-term uncomplicated delivery', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'O82', display: 'Encounter for cesarean delivery', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'O72.1', display: 'Other immediate postpartum hemorrhage (PPH)', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'O14.9', display: 'Unspecified pre-eclampsia', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'N39.0', display: 'Urinary tract infection, site unspecified (UTI)', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'K56.60', display: 'Unspecified intestinal obstruction', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'R50.9', display: 'Fever, unspecified', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'R51.9', display: 'Headache, unspecified', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'R07.9', display: 'Chest pain, unspecified', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'A41.9', display: 'Sepsis, unspecified organism', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'L03.90', display: 'Cellulitis, unspecified', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'N18.9', display: 'Chronic kidney disease, unspecified (CKD)', system: 'ICD10', category: 'DIAGNOSIS' },
  { code: 'N17.9', display: 'Acute kidney failure, unspecified (AKI)', system: 'ICD10', category: 'DIAGNOSIS' },
  // LOINC Labs
  { code: '57021-8', display: 'Full Blood Count (FBC / CBC)', system: 'LOINC', category: 'LAB' },
  { code: '58410-2', display: 'Malaria Parasite (MP) Smear', system: 'LOINC', category: 'LAB' },
  { code: '24357-6', display: 'Urinalysis Routine Panel', system: 'LOINC', category: 'LAB' },
  { code: '2160-0', display: 'Creatinine Serum', system: 'LOINC', category: 'LAB' },
  { code: '3094-0', display: 'Urea Nitrogen (BUN)', system: 'LOINC', category: 'LAB' },
  { code: '2951-2', display: 'Sodium Serum', system: 'LOINC', category: 'LAB' },
  { code: '2823-3', display: 'Potassium Serum', system: 'LOINC', category: 'LAB' },
  { code: '600-7', display: 'Blood Culture & Sensitivity', system: 'LOINC', category: 'LAB' },
  // RXNORM Drugs
  { code: '855332', display: 'Artemether 20 mg / Lumefantrine 120 mg Oral Tablet (Coartem)', system: 'RXNORM', category: 'PHARMACY' },
  { code: '161', display: 'Paracetamol 500 mg Oral Tablet', system: 'RXNORM', category: 'PHARMACY' },
  { code: '313782', display: 'Amoxicillin 500 mg / Clavulanate 125 mg (Augmentin)', system: 'RXNORM', category: 'PHARMACY' },
  { code: '309090', display: 'Ceftriaxone 1 g Injection', system: 'RXNORM', category: 'PHARMACY' },
  { code: '1807633', display: 'Sodium Chloride 0.9% IV Infusion (Normal Saline)', system: 'RXNORM', category: 'PHARMACY' },
  { code: '1807635', display: 'Ringer Lactate IV Infusion Solution', system: 'RXNORM', category: 'PHARMACY' },
  { code: '10565', display: 'Tramadol 50 mg Oral Capsule', system: 'RXNORM', category: 'PHARMACY' },
  { code: '7804', display: 'Oxytocin 10 units/mL Injectable Solution', system: 'RXNORM', category: 'PHARMACY' },
  { code: '25480', display: 'Metronidazole 400 mg Oral Tablet (Flagyl)', system: 'RXNORM', category: 'PHARMACY' },
  { code: '73044', display: 'Ciprofloxacin 500 mg Oral Tablet', system: 'RXNORM', category: 'PHARMACY' }
];

export const TerminologyAutocomplete = ({
  system,
  label,
  placeholder = 'Type to search standard codes (e.g., Malaria, Hypertension)...',
  value,
  onChange,
  multiple = false,
  fullWidth = true,
  required = false,
  size = 'small',
  extraOptions = [],
}: TerminologyAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(typeof value === 'string' ? value : '');
  const [options, setOptions] = useState<TerminologyConceptOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync internal inputValue with external value prop
  useEffect(() => {
    if (typeof value === 'string') {
      setInputValue(value || '');
    }
  }, [value]);

  const fetchSuggestions = useCallback(async (query: string) => {
    setLoading(true);

    const q = (query || '').toLowerCase().trim();
    const matchedOffline = BUILTIN_OFFLINE_DICTIONARY.filter(item => {
      if (system !== 'ALL' && item.system !== system) return false;
      if (!q) return true;
      return item.code.toLowerCase().includes(q) || item.display.toLowerCase().includes(q);
    });

    try {
      const localRes = await api.get('/terminology/concepts', {
        params: {
          search: q ? q : undefined,
          system: system !== 'ALL' ? system : undefined,
          limit: 30,
        },
      });

      const localItems: TerminologyConceptOption[] = (localRes.data.data || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        display: c.display,
        system: c.system,
        category: c.category,
        description: c.description,
        isRemote: false,
      }));

      let combinedLocal = [...extraOptions, ...matchedOffline, ...localItems];
      const seenCodes = new Set<string>();
      combinedLocal = combinedLocal.filter(item => {
        if (!item.code || seenCodes.has(item.code)) return false;
        seenCodes.add(item.code);
        return true;
      });

      setOptions(combinedLocal);

      if (!isOffline && q && q.length >= 2 && localItems.length < 5) {
        try {
          const remoteRes = await api.get('/terminology/remote-search', {
            params: { query: q, system },
          });

          const remoteItems: TerminologyConceptOption[] = (remoteRes.data.results || []).map((r: any) => ({
            code: r.code,
            display: r.display,
            system: r.system,
            category: r.category,
            description: r.description,
            isRemote: true,
          }));

          const existingCodes = new Set(combinedLocal.map(i => i.code));
          const filteredRemote = remoteItems.filter(r => !existingCodes.has(r.code));
          setOptions([...combinedLocal, ...filteredRemote]);
        } catch (remoteErr) {
          setOptions(combinedLocal);
        }
      }
    } catch (err) {
      const seen = new Set<string>();
      const fallbackOptions = [...extraOptions, ...matchedOffline].filter(item => {
        if (!item.code || seen.has(item.code)) return false;
        seen.add(item.code);
        return true;
      });
      setOptions(fallbackOptions);
    } finally {
      setLoading(false);
    }
  }, [system, isOffline, extraOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        fetchSuggestions(inputValue || '');
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [inputValue, open, fetchSuggestions]);

  const handleSelect = async (_: any, selected: any) => {
    if (multiple) {
      const selectedArray = Array.isArray(selected) ? selected : selected ? [selected] : [];
      const formatted = selectedArray.map((item: any) => {
        if (typeof item === 'string') return item;
        return item.display?.includes(item.code) ? item.display : `${item.code} — ${item.display}`;
      });
      onChange(formatted, '', undefined);
      return;
    }

    if (!selected) {
      onChange('', '', undefined);
      return;
    }

    if (typeof selected === 'string') {
      const generatedCode = `${system}-OFFLINE-${selected.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`;
      onChange(generatedCode, selected, {
        code: generatedCode,
        display: selected,
        system,
        isOfflineFallback: true,
      });
      return;
    }

    const combinedVal = selected.display.includes(selected.code)
      ? selected.display
      : `${selected.code} — ${selected.display}`;

    if (selected.isRemote && !isOffline) {
      try {
        const importedRes = await api.post('/terminology/concepts', {
          system: selected.system,
          code: selected.code,
          display: selected.display,
          description: selected.description,
          category: selected.category || (system === 'ICD10' ? 'DIAGNOSIS' : system === 'LOINC' ? 'LAB' : 'PHARMACY'),
        });
        onChange(combinedVal, selected.display, { ...selected, id: importedRes.data.id, isRemote: false });
      } catch (err) {
        console.error('Background auto-import failed:', err);
        onChange(combinedVal, selected.display, selected);
      }
    } else {
      onChange(combinedVal, selected.display, selected);
    }
  };

  const autocompleteValue = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : (value || null);

  return (
    <Autocomplete
      multiple={multiple}
      freeSolo
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      fullWidth={fullWidth}
      size={size}
      value={autocompleteValue}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onChange={handleSelect}
      getOptionLabel={(option) => {
        if (typeof option === 'string') return option;
        return `${option.code} — ${option.display}`;
      }}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={`${option.system}-${option.code}`}>
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={700}>
                {option.display}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={`${option.system} ${option.code}`}
                  size="small"
                  color={option.system === 'ICD10' ? 'primary' : option.system === 'LOINC' ? 'info' : 'success'}
                  sx={{ fontWeight: 800, fontSize: '0.65rem', height: 18 }}
                />
                {option.isRemote && (
                  <Chip
                    icon={<Public sx={{ fontSize: '10px !important' }} />}
                    label="Auto-Import Global"
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: '0.6rem', height: 18 }}
                  />
                )}
                {option.isOfflineFallback && (
                  <Chip
                    icon={<WifiOff sx={{ fontSize: '10px !important' }} />}
                    label="Offline Entry"
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: '0.6rem', height: 18 }}
                  />
                )}
              </Box>
            </Box>
            {option.description && (
              <Typography variant="caption" color="text.secondary">
                {option.description}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          helperText={isOffline ? "⚡ Working Offline: Searching local database & cached codes" : undefined}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {isOffline && <WifiOff sx={{ color: 'warning.main', fontSize: 18, mr: 1 }} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default TerminologyAutocomplete;
