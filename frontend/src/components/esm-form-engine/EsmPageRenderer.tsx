/**
 * OpenMRS ESM Form Engine Page Renderer
 * Replicates page layout from @openmrs/esm-form-engine-lib/src/components/renderer/page
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import { FormPage, PatientContext } from './types';
import { EsmSectionRenderer } from './EsmSectionRenderer';

interface EsmPageRendererProps {
  page: FormPage;
  formValues: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  patientContext: PatientContext;
  errors: Record<string, string>;
  isReadonly?: boolean;
  forceExpandAll?: boolean;
}

export const EsmPageRenderer: React.FC<EsmPageRendererProps> = ({
  page,
  formValues,
  onChange,
  patientContext,
  errors,
  isReadonly = false,
  forceExpandAll = false,
}) => {
  const { label, sections = [] } = page;
  const visibleSections = sections.filter((s) => !s.isHidden);

  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2, pb: 1, borderBottom: '2px solid #0284c7' }}>
        {label}
      </Typography>

      {visibleSections.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
          No visible sections on this page.
        </Typography>
      ) : (
        visibleSections.map((section, idx) => (
          <EsmSectionRenderer
            key={section.id || `${label}-sec-${idx}`}
            section={section}
            formValues={formValues}
            onChange={onChange}
            patientContext={patientContext}
            errors={errors}
            isReadonly={isReadonly}
            forceExpandAll={forceExpandAll}
          />
        ))
      )}
    </Box>
  );
};
