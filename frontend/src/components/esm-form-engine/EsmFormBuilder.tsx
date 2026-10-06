/**
 * OpenMRS ESM Form Builder Component
 * Replicated from @openmrs/esm-form-builder
 * Provides visual and schema-based form authoring with live embedded FormEngine preview.
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  Divider,
  Chip,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
} from '@mui/material';
import {
  Code as CodeIcon,
  Visibility as PreviewIcon,
  Add as AddIcon,
  DeleteOutline as DeleteIcon,
  Save as SaveIcon,
  PlayArrow as TestIcon,
  AutoAwesome as MagicIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { FormSchema, FormPage, FormSection, FormField, RenderType } from './types';
import { EsmFormEngine } from './EsmFormEngine';

const DEFAULT_SAMPLE_SCHEMA: FormSchema = {
  name: 'ART Clinical Encounter Form',
  version: '2.1',
  encounterType: 'ART Clinical Encounter',
  processor: 'EncounterFormProcessor',
  pages: [
    {
      label: 'Clinical Assessment & History',
      sections: [
        {
          label: 'Visit & Vitals',
          isExpanded: 'true',
          questions: [
            {
              id: 'encounterDatetime',
              label: 'Encounter Date',
              type: 'encounterDatetime',
              required: true,
              questionOptions: {
                rendering: 'date',
                defaultValue: new Date().toISOString().split('T')[0],
              },
            },
            {
              id: 'weight',
              label: 'Body Weight (kg)',
              type: 'obs',
              required: true,
              questionOptions: {
                concept: '5089AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                rendering: 'number',
                min: 1,
                max: 250,
                step: 0.1,
              },
            },
            {
              id: 'height',
              label: 'Height (cm)',
              type: 'obs',
              required: true,
              questionOptions: {
                concept: '5090AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                rendering: 'number',
                min: 30,
                max: 250,
              },
            },
            {
              id: 'bmi',
              label: 'Body Mass Index (BMI)',
              type: 'obs',
              readonly: true,
              questionOptions: {
                concept: '1342AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                rendering: 'number',
                calculate: {
                  calculateExpression: 'calcBMI(weight, height)',
                },
              },
            },
          ],
        },
        {
          label: 'ART & Regimen Status',
          isExpanded: 'true',
          questions: [
            {
              id: 'artStatus',
              label: 'Patient ART Status',
              type: 'obs',
              required: true,
              questionOptions: {
                concept: '165240AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                rendering: 'radio',
                answers: [
                  { label: 'Treatment Restart', concept: '165239AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
                  { label: 'Treatment Ongoing', concept: '160563AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
                  { label: 'Transferred In', concept: '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
                ],
              },
            },
            {
              id: 'regimen',
              label: 'First Line Regimen Prescribed',
              type: 'obs',
              hide: {
                hideWhenExpression: 'isEmpty(artStatus)',
              },
              questionOptions: {
                concept: '1652AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                rendering: 'select',
                answers: [
                  { label: '1a: TDF + 3TC + DTG', concept: '165243AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
                  { label: '1b: TDF + 3TC + EFV', concept: '165244AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
                  { label: '1c: AZT + 3TC + DTG', concept: '165245AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
                  { label: '1d: ABC + 3TC + DTG', concept: '165246AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      label: 'Laboratory & Viral Load Monitoring',
      sections: [
        {
          label: 'Viral Load & CD4',
          isExpanded: 'true',
          questions: [
            {
              id: 'viralLoadCopies',
              label: 'Viral Load Result (copies/mL)',
              type: 'obs',
              questionOptions: {
                concept: '856AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                rendering: 'number',
                min: 0,
                max: 10000000,
              },
            },
            {
              id: 'vlSuppressed',
              label: 'Viral Load Suppression State',
              type: 'obs',
              questionOptions: {
                rendering: 'content-switcher',
                answers: [
                  { label: 'Suppressed (<50 cp/mL)', concept: '1301AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
                  { label: 'Unsuppressed (≥1000 cp/mL)', concept: '1302AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

interface EsmFormBuilderProps {
  initialSchema?: FormSchema;
  onSaveSchema?: (schema: FormSchema) => Promise<void> | void;
}

export const EsmFormBuilder: React.FC<EsmFormBuilderProps> = ({
  initialSchema,
  onSaveSchema,
}) => {
  const [schema, setSchema] = useState<FormSchema>(initialSchema || DEFAULT_SAMPLE_SCHEMA);
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(initialSchema || DEFAULT_SAMPLE_SCHEMA, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [builderTab, setBuilderTab] = useState<'editor' | 'preview' | 'split'>('split');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Sync JSON text to Schema state
  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      setSchema(parsed);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      setSchema(parsed);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  const handleSave = async () => {
    if (jsonError) return;
    try {
      if (onSaveSchema) {
        await onSaveSchema(schema);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 650 }}>
      {/* Header Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          bgcolor: '#0f172a',
          color: '#ffffff',
          borderRadius: 2,
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#38bdf8' }}>
            OpenMRS ESM Form Builder &amp; Schema Studio
          </Typography>
          <Chip label={`Schema: ${schema.name}`} size="small" sx={{ bgcolor: '#334155', color: '#f8fafc', fontWeight: 700 }} />
          <Chip label={`v${schema.version || '1.0'}`} size="small" color="primary" sx={{ height: 20 }} />
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Tabs
            value={builderTab}
            onChange={(_, val) => setBuilderTab(val)}
            textColor="inherit"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': { color: '#94a3b8', minHeight: 36, py: 0.5, fontWeight: 700, textTransform: 'none' },
              '& .Mui-selected': { color: '#38bdf8 !important' },
            }}
          >
            <Tab value="editor" icon={<CodeIcon fontSize="small" />} iconPosition="start" label="JSON Schema Editor" />
            <Tab value="preview" icon={<PreviewIcon fontSize="small" />} iconPosition="start" label="Live Engine Preview" />
            <Tab value="split" icon={<TestIcon fontSize="small" />} iconPosition="start" label="Split View" />
          </Tabs>

          <Button
            size="small"
            variant="outlined"
            startIcon={<MagicIcon />}
            onClick={handleFormatJson}
            sx={{ color: '#bae6fd', borderColor: 'rgba(255,255,255,0.2)', textTransform: 'none', borderRadius: 2 }}
          >
            Format JSON
          </Button>

          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
          >
            Save Schema
          </Button>
        </Box>
      </Paper>

      {savedSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Schema saved and synchronized with OpenMRS CLOB storage successfully.
        </Alert>
      )}

      {jsonError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          JSON Schema Syntax Error: {jsonError}
        </Alert>
      )}

      {/* Main Studio Body */}
      <Grid container spacing={2} sx={{ flex: 1, minHeight: 520 }}>
        {/* Left: Code / Schema Editor */}
        {(builderTab === 'editor' || builderTab === 'split') && (
          <Grid item xs={12} md={builderTab === 'split' ? 6 : 12}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                bgcolor: '#0f172a',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: 1 }}>
                  JSON SCHEMA SPECIFICATION (OpenMRS / Ampath format)
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {schema.pages?.length || 0} Pages • {schema.encounterType || 'Encounter Form'}
                </Typography>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={22}
                value={jsonText}
                onChange={handleJsonChange}
                variant="outlined"
                sx={{
                  flex: 1,
                  bgcolor: '#020617',
                  borderRadius: 1.5,
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                    fontSize: '0.82rem',
                    color: '#38bdf8',
                    p: 1.5,
                  },
                  '& fieldset': { borderColor: '#334155' },
                }}
              />
            </Paper>
          </Grid>
        )}

        {/* Right: Embedded Live Preview */}
        {(builderTab === 'preview' || builderTab === 'split') && (
          <Grid item xs={12} md={builderTab === 'split' ? 6 : 12}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid #cbd5e1',
                height: '100%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box p={1.5} bgcolor="#f1f5f9" borderBottom="1px solid #e2e8f0" display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155' }}>
                  Embedded FormEngine Interactive Preview
                </Typography>
                <Chip label="Live Evaluation" size="small" color="success" sx={{ height: 20, fontWeight: 700 }} />
              </Box>

              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <EsmFormEngine
                  schema={schema}
                  patientContext={{
                    id: 'preview-patient-1',
                    uuid: 'preview-patient-1',
                    patientNumber: 'ART-TEST-001',
                    name: 'Test Patient (Preview Mode)',
                    gender: 'FEMALE',
                    sex: 'FEMALE',
                    age: 28,
                    artNumber: 'IMO02400857',
                    hospitalNumber: '10LTN',
                  }}
                  mode="enter"
                  onSubmit={(formData) => {
                    alert('Preview Form Submission Successful!\n\nPayload: ' + JSON.stringify(formData, null, 2));
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
