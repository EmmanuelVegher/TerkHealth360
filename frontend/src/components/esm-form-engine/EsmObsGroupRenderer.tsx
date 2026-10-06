/**
 * OpenMRS ESM Form Engine ObsGroup & Repeating Questions Renderer
 * Replicates group logic from @openmrs/esm-form-engine-lib/src/components/group
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Divider,
  Grid,
} from '@mui/material';
import { Add as AddIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { FormField, PatientContext } from './types';
import { EsmFieldRenderer } from './EsmFieldRenderer';

interface EsmObsGroupRendererProps {
  field: FormField;
  formValues: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  patientContext: PatientContext;
  errors: Record<string, string>;
  isReadonly?: boolean;
}

export const EsmObsGroupRenderer: React.FC<EsmObsGroupRendererProps> = ({
  field,
  formValues,
  onChange,
  patientContext,
  errors,
  isReadonly = false,
}) => {
  const { id, label, questions = [], questionOptions } = field;
  const isRepeating = questionOptions?.rendering === 'repeating';

  if (!isRepeating) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          my: 2,
          borderRadius: 2,
          border: '1px solid #cbd5e1',
          bgcolor: '#fafafa',
        }}
      >
        {label && (
          <Box mb={1.5} pb={1} borderBottom="1px solid #e2e8f0">
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {label}
            </Typography>
          </Box>
        )}
        <Grid container spacing={2}>
          {questions
            .filter((q) => !q.isHidden)
            .map((nestedQ) => (
              <Grid item xs={12} sm={nestedQ.questionOptions?.rendering === 'textarea' ? 12 : 6} key={nestedQ.id}>
                <EsmFieldRenderer
                  field={nestedQ}
                  value={formValues[nestedQ.id]}
                  onChange={onChange}
                  formValues={formValues}
                  patientContext={patientContext}
                  error={errors[nestedQ.id]}
                  isReadonly={isReadonly}
                />
              </Grid>
            ))}
        </Grid>
      </Paper>
    );
  }

  // Repeating Rows
  const repeatList: any[] = Array.isArray(formValues[id]) ? formValues[id] : [{}];

  const handleAddRow = () => {
    const updated = [...repeatList, {}];
    onChange(id, updated);
  };

  const handleRemoveRow = (idx: number) => {
    if (repeatList.length <= 1) {
      onChange(id, [{}]);
    } else {
      const updated = repeatList.filter((_, i) => i !== idx);
      onChange(id, updated);
    }
  };

  const handleRowFieldChange = (rowIdx: number, nestedId: string, val: any) => {
    const updated = repeatList.map((row, i) => {
      if (i === rowIdx) {
        return { ...row, [nestedId]: val };
      }
      return row;
    });
    onChange(id, updated);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        my: 2,
        borderRadius: 2,
        border: '1px solid #cbd5e1',
        bgcolor: '#f8fafc',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
          {label || id}
        </Typography>
        {!isReadonly && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddRow}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {questionOptions?.repeatOptions?.addText || 'Add Entry'}
          </Button>
        )}
      </Box>

      {repeatList.map((rowObj, rowIdx) => (
        <Paper
          key={rowIdx}
          variant="outlined"
          sx={{
            p: 1.5,
            mb: 1.5,
            borderRadius: 1.5,
            bgcolor: '#ffffff',
            position: 'relative',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Entry #{rowIdx + 1}
            </Typography>
            {!isReadonly && repeatList.length > 1 && (
              <IconButton size="small" color="error" onClick={() => handleRemoveRow(rowIdx)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          <Grid container spacing={2}>
            {questions
              .filter((q) => !q.isHidden)
              .map((nestedQ) => (
                <Grid item xs={12} sm={nestedQ.questionOptions?.rendering === 'textarea' ? 12 : 6} key={nestedQ.id}>
                  <EsmFieldRenderer
                    field={nestedQ}
                    value={rowObj[nestedQ.id]}
                    onChange={(_, val) => handleRowFieldChange(rowIdx, nestedQ.id, val)}
                    formValues={rowObj}
                    patientContext={patientContext}
                    error={errors[`${id}_${rowIdx}_${nestedQ.id}`]}
                    isReadonly={isReadonly}
                  />
                </Grid>
              ))}
          </Grid>
        </Paper>
      ))}
    </Paper>
  );
};
