/**
 * OpenMRS ESM Form Engine Section Renderer
 * Replicates section layout from @openmrs/esm-form-engine-lib/src/components/renderer/section
 */

import React, { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Grid,
  Chip,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { FormSection, FormField, PatientContext } from './types';
import { EsmFieldRenderer } from './EsmFieldRenderer';
import { EsmObsGroupRenderer } from './EsmObsGroupRenderer';

interface EsmSectionRendererProps {
  section: FormSection;
  formValues: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  patientContext: PatientContext;
  errors: Record<string, string>;
  isReadonly?: boolean;
  forceExpandAll?: boolean;
}

export const EsmSectionRenderer: React.FC<EsmSectionRendererProps> = ({
  section,
  formValues,
  onChange,
  patientContext,
  errors,
  isReadonly = false,
  forceExpandAll = false,
}) => {
  const { label, isExpanded = true, questions = [] } = section;
  const initialExpanded = typeof isExpanded === 'string' ? isExpanded === 'true' : Boolean(isExpanded);
  const [expanded, setExpanded] = useState<boolean>(initialExpanded || forceExpandAll);

  useEffect(() => {
    if (forceExpandAll) {
      setExpanded(true);
    }
  }, [forceExpandAll]);

  const visibleQuestions = questions.filter((q) => !q.isHidden);
  if (visibleQuestions.length === 0) return null;

  // Count section errors
  const sectionErrorCount = visibleQuestions.filter((q) => {
    if (errors[q.id]) return true;
    if (q.questions?.some((child) => errors[child.id])) return true;
    return false;
  }).length;

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExp) => setExpanded(isExp)}
      sx={{
        mb: 2,
        borderRadius: '10px !important',
        border: sectionErrorCount > 0 ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: '#0284c7' }} />}
        sx={{
          bgcolor: sectionErrorCount > 0 ? '#fef2f2' : '#f8fafc',
          borderBottom: expanded ? '1px solid #e2e8f0' : 'none',
          py: 1,
          px: 2.5,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5} width="100%">
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
            {label}
          </Typography>
          <Chip
            size="small"
            label={`${visibleQuestions.length} fields`}
            sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e2e8f0', color: '#475569', fontWeight: 600 }}
          />
          {sectionErrorCount > 0 && (
            <Chip
              size="small"
              label={`${sectionErrorCount} required / invalid`}
              color="error"
              sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
            />
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 2.5, bgcolor: '#ffffff' }}>
        <Grid container spacing={2}>
          {visibleQuestions.map((q) => {
            const isGroup = q.type === 'obsGroup' || q.questionOptions?.rendering === 'repeating';
            const isFullWidth =
              isGroup ||
              q.questionOptions?.rendering === 'textarea' ||
              q.questionOptions?.rendering === 'radio' ||
              q.questionOptions?.rendering === 'checkbox' ||
              q.questionOptions?.rendering === 'content-switcher' ||
              q.questionOptions?.rendering === 'toggle';

            if (isGroup) {
              return (
                <Grid item xs={12} key={q.id}>
                  <EsmObsGroupRenderer
                    field={q}
                    formValues={formValues}
                    onChange={onChange}
                    patientContext={patientContext}
                    errors={errors}
                    isReadonly={isReadonly}
                  />
                </Grid>
              );
            }

            return (
              <Grid item xs={12} sm={isFullWidth ? 12 : 6} key={q.id}>
                <EsmFieldRenderer
                  field={q}
                  value={formValues[q.id]}
                  onChange={onChange}
                  formValues={formValues}
                  patientContext={patientContext}
                  error={errors[q.id]}
                  isReadonly={isReadonly}
                />
              </Grid>
            );
          })}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};
