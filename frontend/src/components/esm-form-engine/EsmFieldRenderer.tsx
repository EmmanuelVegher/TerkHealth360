/**
 * OpenMRS ESM Form Engine Field Renderer
 * Replicates input controls from @openmrs/esm-form-engine-lib/src/components/inputs
 */

import React from 'react';
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

interface EsmFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (fieldId: string, value: any) => void;
  formValues: Record<string, any>;
  patientContext: PatientContext;
  error?: string;
  isReadonly?: boolean;
}

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
  const answers = questionOptions?.answers || [];

  // Dynamic datasource resolution for ARV drugs and strengths if answers are empty
  let effectiveAnswers = [...answers];
  if (effectiveAnswers.length === 0) {
    if (questionOptions?.datasource?.name === 'arvDrugs' || id.toLowerCase().includes('drug')) {
      effectiveAnswers = [
        { label: 'Tenofovir / Lamivudine / Dolutegravir (TDF/3TC/DTG)', concept: '165681AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Tenofovir / Lamivudine / Efavirenz (TDF/3TC/EFV)', concept: '165682AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Abacavir / Lamivudine / Dolutegravir (ABC/3TC/DTG)', concept: '165692AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Zidovudine / Lamivudine / Nevirapine (AZT/3TC/NVP)', concept: '165686AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Abacavir / Lamivudine (ABC/3TC)', concept: '165691AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Tenofovir / Lamivudine (TDF/3TC)', concept: '161364AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Zidovudine / Lamivudine (AZT/3TC)', concept: '161363AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Dolutegravir (DTG 50mg)', concept: '165631AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Atazanavir / Ritonavir (ATV/r 300/100mg)', concept: '161361AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Lopinavir / Ritonavir (LPV/r 200/50mg)', concept: '794AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Darunavir / Ritonavir (DRV/r 600/100mg)', concept: '165633AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Raltegravir (RAL 400mg)', concept: '154378AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Cotrimoxazole (CTX 960mg)', concept: '105281AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: 'Isoniazid (INH 300mg)', concept: '78280AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
        { label: '3HP (Rifapentine + INH)', concept: '167041AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
      ];
    } else if (questionOptions?.datasource?.name === 'arvStrengths' || id.toLowerCase().includes('strength')) {
      effectiveAnswers = [
        { label: '300mg / 300mg / 50mg', concept: '300_300_50mg' },
        { label: '300mg / 300mg / 600mg', concept: '300_300_600mg' },
        { label: '300mg / 150mg / 200mg', concept: '300_150_200mg' },
        { label: '600mg / 300mg / 50mg', concept: '600_300_50mg' },
        { label: '300mg / 300mg', concept: '300_300mg' },
        { label: '300mg / 150mg', concept: '300_150mg' },
        { label: '300mg', concept: '300mg' },
        { label: '50mg', concept: '50mg' },
        { label: '10mg', concept: '10mg' },
        { label: '600mg', concept: '600mg' },
        { label: '400mg', concept: '400mg' },
        { label: '200mg', concept: '200mg' },
        { label: '300mg / 100mg', concept: '300_100mg' },
        { label: '200mg / 50mg', concept: '200_50mg' },
        { label: '960mg', concept: '960mg' },
        { label: '480mg', concept: '480mg' },
      ];
    }
  }

  // Find matching answer for select/radio
  const matchingAns = effectiveAnswers.find(
    (a) =>
      (a.concept && String(a.concept).toLowerCase() === String(value).toLowerCase()) ||
      (a.value && String(a.value).toLowerCase() === String(value).toLowerCase()) ||
      (a.label && String(a.label).toLowerCase() === String(value).toLowerCase())
  );
  const selectedValue = matchingAns
    ? String(matchingAns.concept || matchingAns.value || matchingAns.label)
    : (value !== undefined && value !== null && value !== '' ? String(value) : '');

  if (selectedValue && !effectiveAnswers.some((a) => String(a.concept || a.value || a.label) === selectedValue)) {
    effectiveAnswers.push({ label: selectedValue, concept: selectedValue });
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

  // 3. Dropdown / Select / ui-select-extended / select-concept-answers
  if (
    rendering === 'select' ||
    rendering === 'ui-select-extended' ||
    rendering === 'select-concept-answers' ||
    rendering === 'drug' ||
    rendering === 'problem'
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
            {effectiveAnswers.map((ans) => {
              const ansVal = ans.concept || ans.value || ans.label;
              return (
                <MenuItem key={ansVal} value={String(ansVal)} disabled={ans.isDisabled}>
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
  if (rendering === 'date' || rendering === 'datetime') {
    const safeDateValue = (() => {
      if (!value || typeof value === 'boolean' || value === 'true' || value === 'false') return '';
      try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        if (rendering === 'datetime') {
          return d.toISOString().slice(0, 16);
        }
        return d.toISOString().slice(0, 10);
      } catch {
        return '';
      }
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
