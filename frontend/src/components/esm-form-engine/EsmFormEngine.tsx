/**
 * OpenMRS ESM Form Engine Main Container
 * Replicates @openmrs/esm-form-engine-lib/src/form-engine.component.tsx
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  CheckCircle as ValidIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { FormSchema, FormField, FormPage, FormSection, PatientContext, SessionMode } from './types';
import { evaluateExpression } from './expressionRunner';
import { EsmPageRenderer } from './EsmPageRenderer';
import { EsmSidebar } from './EsmSidebar';
import { normalizeLegacyFormData } from './legacyFormNormalizer';
import { ALL_ARV_DRUGS, getArvDrugsForRegimen } from './arvDatasource';
import { lookupArvStrength } from './commonExpressionHelpers';

export interface EsmFormEngineProps {
  schema: FormSchema;
  patientContext?: PatientContext;
  initialValues?: Record<string, any>;
  mode?: SessionMode;
  onSubmit?: (formData: Record<string, any>, encounterPayload: any) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const EsmFormEngine: React.FC<EsmFormEngineProps> = ({
  schema,
  patientContext = {},
  initialValues = {},
  mode = 'edit',
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Form State
  const [formValues, setFormValues] = useState<Record<string, any>>(() => {
    return normalizeLegacyFormData(initialValues || {}, patientContext);
  });
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [forceExpandAll, setForceExpandAll] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Flatten all fields for expression & validation processing
  const allRawFields = useMemo(() => {
    const fields: FormField[] = [];
    schema.pages?.forEach((p) => {
      p.sections?.forEach((s) => {
        s.questions?.forEach((q) => {
          fields.push(q);
          if (q.questions) {
            q.questions.forEach((child) => fields.push(child));
          }
        });
      });
    });
    return fields;
  }, [schema]);

  // Sync initialValues if changed & evaluate initial calculate expressions
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      const normalized = normalizeLegacyFormData(initialValues, patientContext);
      allRawFields.forEach((field) => {
        const calcExpr = field.questionOptions?.calculate?.calculateExpression;
        if (calcExpr && (normalized[field.id] === undefined || normalized[field.id] === '')) {
          try {
            const calculatedVal = evaluateExpression(calcExpr, field, allRawFields, normalized, patientContext);
            if (calculatedVal !== null && calculatedVal !== undefined) {
              normalized[field.id] = calculatedVal;
            }
          } catch {
            // Ignore calculate evaluation error
          }
        }
      });
      setFormValues((prev) => ({ ...prev, ...normalized }));
    }
  }, [initialValues, patientContext, allRawFields]);

  // Handle Field Value Change & Run Calculate Expressions
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    let cleanVal = value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value.value !== undefined) cleanVal = value.value;
      else if (value.concept !== undefined) cleanVal = value.concept;
      else if (value.label !== undefined) cleanVal = value.label;
    }

    setFormValues((prev) => {
      const updated = { ...prev, [fieldId]: cleanVal };

      // When a Regimen is selected, automatically update active_regimen_info,
      // and pre-select the primary FDC drug into ARV Drug 1 with its strength & frequency
      if (
        fieldId === 'Adult_1st_Line_Regimens' ||
        fieldId === 'Adult_2nd_line_ARV_regimen' ||
        fieldId === 'Adult_3rd_Line_ARV_Regimens' ||
        fieldId === 'Child_1st_line_ARV_regimen' ||
        fieldId === 'Child_2nd_line_ARV_regimen' ||
        fieldId === 'Child_3rd_Line_ARV_Regimens' ||
        fieldId === 'dispensedRegimen' ||
        fieldId === 'currentRegimen' ||
        fieldId === 'regimen'
      ) {
        if (cleanVal) {
          const ageGroup = updated['Treatment_age_group'] || 'a291af62-d00e-4ace-a672-f6f965b325fe';
          updated['active_regimen_info'] = `${ageGroup}|${cleanVal}`;
          updated['dispensedRegimen'] = cleanVal;

          const filteredDrugs = getArvDrugsForRegimen(cleanVal);
          const primaryFdc = filteredDrugs.find((d) => d.isFdc) || filteredDrugs[0];
          if (primaryFdc) {
            // Auto-select primary drug for ARV Drug 1
            updated['Drugs_ART_1'] = primaryFdc.concept;
            updated['Drug_Strength_ART_1'] = primaryFdc.strength;
            if (primaryFdc.frequency) {
              updated['Drug_Frequency_ART_1'] = primaryFdc.frequency;
            }
          }
        }
      }

      // When an ARV Drug option is selected, automatically select its Drug Strength & default Frequency
      if (fieldId.startsWith('Drugs_ART_') && cleanVal) {
        const rowIdx = fieldId.replace('Drugs_ART_', '');
        const autoStrength = lookupArvStrength(cleanVal);
        if (autoStrength) {
          updated[`Drug_Strength_ART_${rowIdx}`] = autoStrength;
        }
        const matchedDrug = ALL_ARV_DRUGS.find(
          (d) =>
            d.concept.toLowerCase() === String(cleanVal).toLowerCase() ||
            d.value.toLowerCase() === String(cleanVal).toLowerCase() ||
            d.label.toLowerCase() === String(cleanVal).toLowerCase() ||
            String(cleanVal).toLowerCase().includes(d.concept.toLowerCase())
        );
        if (matchedDrug?.frequency && !updated[`Drug_Frequency_ART_${rowIdx}`]) {
          updated[`Drug_Frequency_ART_${rowIdx}`] = matchedDrug.frequency;
        }
      }

      // Auto-convenience for duration/qty within the same ARV drug row (never cross-pollinating rows)
      if (fieldId.startsWith('duration_pharm_ART_') && cleanVal) {
        const rowIdx = fieldId.replace('duration_pharm_ART_', '');
        if (updated[`arvDispensedInDays_ART_${rowIdx}`] === undefined || updated[`arvDispensedInDays_ART_${rowIdx}`] === '') {
          updated[`arvDispensedInDays_ART_${rowIdx}`] = cleanVal;
        }
        if (updated[`qty_prescribed_pharm_ART_${rowIdx}`] === undefined || updated[`qty_prescribed_pharm_ART_${rowIdx}`] === '') {
          updated[`qty_prescribed_pharm_ART_${rowIdx}`] = cleanVal;
        }
        if (updated[`qty_dispensed_pharm_ART_${rowIdx}`] === undefined || updated[`qty_dispensed_pharm_ART_${rowIdx}`] === '') {
          updated[`qty_dispensed_pharm_ART_${rowIdx}`] = cleanVal;
        }
      }

      // If a drug is cleared from a non-primary row (e.g. Drugs_ART_2..5), clear all sub-fields for that row
      if (fieldId.startsWith('Drugs_ART_') && !cleanVal) {
        const rowIdx = fieldId.replace('Drugs_ART_', '');
        delete updated[`Drug_Strength_ART_${rowIdx}`];
        delete updated[`Drug_Frequency_ART_${rowIdx}`];
        delete updated[`duration_pharm_ART_${rowIdx}`];
        delete updated[`qty_prescribed_pharm_ART_${rowIdx}`];
        delete updated[`arvDispensedInDays_ART_${rowIdx}`];
        delete updated[`qty_dispensed_pharm_ART_${rowIdx}`];
      }

      // Evaluate any calculate expressions on dependent fields
      allRawFields.forEach((field) => {
        const calcExpr = field.questionOptions?.calculate?.calculateExpression;
        if (calcExpr) {
          try {
            const calculatedVal = evaluateExpression(calcExpr, field, allRawFields, updated, patientContext);
            if (calculatedVal !== null && calculatedVal !== undefined && calculatedVal !== '') {
              updated[field.id] = calculatedVal;
            } else if (calculatedVal === '' || calculatedVal === null) {
              if (field.id.startsWith('Drug_Strength_ART_')) {
                const drugId = field.id.replace('Drug_Strength_', 'Drugs_');
                if (!updated[drugId]) {
                  updated[field.id] = '';
                }
              }
            }
          } catch {
            // Ignore calculate evaluation error
          }
        }
      });

      return updated;
    });
  }, [allRawFields, patientContext]);

  // Dynamically evaluate expressions for pages, sections, fields, and answers
  const evaluatedPages: FormPage[] = useMemo(() => {
    if (!schema.pages) return [];

    return schema.pages.map((page) => {
      // Evaluate page hide
      let pageHidden = false;
      if (page.hide?.hideWhenExpression) {
        pageHidden = Boolean(
          evaluateExpression(page.hide.hideWhenExpression, { id: page.id || '' } as FormField, allRawFields, formValues, patientContext)
        );
      }

      const evaluatedSections: FormSection[] = (page.sections || []).map((section) => {
        // Evaluate section hide
        let sectionHidden = false;
        if (section.hide?.hideWhenExpression) {
          sectionHidden = Boolean(
            evaluateExpression(section.hide.hideWhenExpression, { id: section.id || '' } as FormField, allRawFields, formValues, patientContext)
          );
        }

        const evaluatedQuestions: FormField[] = (section.questions || []).map((question) => {
          const qCopy: FormField = { ...question };

          // Evaluate question hide
          if (qCopy.hide?.hideWhenExpression) {
            qCopy.isHidden = Boolean(
              evaluateExpression(qCopy.hide.hideWhenExpression, qCopy, allRawFields, formValues, patientContext)
            );
          } else {
            qCopy.isHidden = false;
          }

          // Evaluate question disabled
          if (typeof qCopy.disabled === 'object' && qCopy.disabled?.disableWhenExpression) {
            qCopy.isDisabled = Boolean(
              evaluateExpression(qCopy.disabled.disableWhenExpression, qCopy, allRawFields, formValues, patientContext)
            );
          } else if (typeof qCopy.disabled === 'boolean') {
            qCopy.isDisabled = qCopy.disabled;
          }

          // Evaluate conditional required
          if (typeof qCopy.required === 'object' && qCopy.required?.type === 'conditionalRequired') {
            const refId = qCopy.required.referenceQuestionId;
            const refAnswers = qCopy.required.referenceQuestionAnswers || [];
            const refVal = refId ? formValues[refId] : null;
            qCopy.isRequired = refAnswers.includes(String(refVal));
          } else if (typeof qCopy.required === 'string') {
            qCopy.isRequired = qCopy.required === 'true';
          } else if (typeof qCopy.required === 'boolean') {
            qCopy.isRequired = qCopy.required;
          }

          // Evaluate child questions if obsGroup
          if (qCopy.questions && qCopy.questions.length > 0) {
            qCopy.questions = qCopy.questions.map((child) => {
              const cCopy = { ...child };
              if (cCopy.hide?.hideWhenExpression) {
                cCopy.isHidden = Boolean(
                  evaluateExpression(cCopy.hide.hideWhenExpression, cCopy, allRawFields, formValues, patientContext)
                );
              }
              return cCopy;
            });
          }

          return qCopy;
        });

        return {
          ...section,
          isHidden: sectionHidden,
          questions: evaluatedQuestions,
        };
      });

      return {
        ...page,
        isHidden: pageHidden,
        sections: evaluatedSections,
      };
    });
  }, [schema.pages, allRawFields, formValues, patientContext]);

  // Validation Engine
  const { errors, pageErrors, isValid } = useMemo(() => {
    const errMap: Record<string, string> = {};
    const pgErrMap: Record<number, number> = {};

    evaluatedPages.forEach((page, pgIdx) => {
      let countForPage = 0;
      if (page.isHidden) return;

      page.sections?.forEach((section) => {
        if (section.isHidden) return;

        section.questions?.forEach((q) => {
          if (q.isHidden) return;

          const val = formValues[q.id];
          const isValEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);

          // 1. Required check
          if (q.isRequired && isValEmpty) {
            errMap[q.id] = `${q.label || q.id} is required`;
            countForPage++;
          }

          // 2. Custom Validators (JS expressions / min / max)
          if (q.validators && !isValEmpty) {
            q.validators.forEach((v) => {
              if (v.failsWhenExpression) {
                const fails = evaluateExpression(v.failsWhenExpression, q, allRawFields, formValues, patientContext);
                if (fails) {
                  errMap[q.id] = v.message || 'Invalid value';
                  countForPage++;
                }
              }
            });
          }

          // 3. Min / Max number check
          if ((q.questionOptions?.rendering === 'number' || q.questionOptions?.rendering === 'numeric') && !isValEmpty) {
            const numVal = parseFloat(val);
            if (q.questionOptions.min !== undefined && numVal < Number(q.questionOptions.min)) {
              errMap[q.id] = `Value cannot be less than ${q.questionOptions.min}`;
              countForPage++;
            }
            if (q.questionOptions.max !== undefined && numVal > Number(q.questionOptions.max)) {
              errMap[q.id] = `Value cannot be greater than ${q.questionOptions.max}`;
              countForPage++;
            }
          }
        });
      });

      if (countForPage > 0) {
        pgErrMap[pgIdx] = countForPage;
      }
    });

    return {
      errors: errMap,
      pageErrors: pgErrMap,
      isValid: Object.keys(errMap).length === 0,
    };
  }, [evaluatedPages, formValues, allRawFields, patientContext]);

  // Submission Payload Builder
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // If there are validation errors, navigate to the first error page
    if (!isValid) {
      const firstErrorPageIndex = Object.keys(pageErrors).map(Number).sort((a, b) => a - b)[0];
      if (firstErrorPageIndex !== undefined) {
        setActivePageIndex(firstErrorPageIndex);
      }
      setSubmitError('Please correct the highlighted validation errors before saving.');
      return;
    }

    // Build standard OpenMRS / NMRS Obs Encounter Payload strictly matching OpenMRS 3.x ESM form engine specification
    const obsList: any[] = [];
    const handledFieldIds = new Set<string>();

    // 1. Identify obsGroups from schema
    const obsGroups: FormField[] = [];
    schema.pages?.forEach((p) => {
      p.sections?.forEach((s) => {
        s.questions?.forEach((q) => {
          if (q.type === 'obsGroup' || q.questionOptions?.rendering === 'repeating') {
            obsGroups.push(q);
          }
        });
      });
    });

    // Process obsGroups
    obsGroups.forEach((grp) => {
      handledFieldIds.add(grp.id);
      grp.questions?.forEach((child) => handledFieldIds.add(child.id));

      const grpConcept = grp.questionOptions?.concept;
      if (!grpConcept) return;

      const isRepeating = grp.questionOptions?.rendering === 'repeating';
      const grpVal = formValues[grp.id];

      if (isRepeating && Array.isArray(grpVal)) {
        grpVal.forEach((row) => {
          if (!row || typeof row !== 'object') return;
          const groupMembers: any[] = [];
          grp.questions?.forEach((subQ) => {
            const subVal = row[subQ.id];
            if (subVal !== undefined && subVal !== null && subVal !== '' && subQ.questionOptions?.concept) {
              groupMembers.push({
                concept: subQ.questionOptions.concept,
                value: subVal,
                formFieldNamespace: 'rfe-forms',
                formFieldPath: `rfe-forms-${subQ.id}`,
              });
            }
          });
          if (groupMembers.length > 0) {
            obsList.push({
              concept: grpConcept,
              formFieldNamespace: 'rfe-forms',
              formFieldPath: `rfe-forms-${grp.id}`,
              groupMembers,
            });
          }
        });
      } else {
        // Non-repeating Obs Group (e.g. ARVDrug_1..5)
        const groupMembers: any[] = [];
        grp.questions?.forEach((subQ) => {
          const subVal = formValues[subQ.id];
          if (subVal !== undefined && subVal !== null && subVal !== '' && subQ.questionOptions?.concept) {
            groupMembers.push({
              concept: subQ.questionOptions.concept,
              value: subVal,
              formFieldNamespace: 'rfe-forms',
              formFieldPath: `rfe-forms-${subQ.id}`,
            });
          }
        });
        if (groupMembers.length > 0) {
          obsList.push({
            concept: grpConcept,
            formFieldNamespace: 'rfe-forms',
            formFieldPath: `rfe-forms-${grp.id}`,
            groupMembers,
          });
        }
      }
    });

    // 2. Process all remaining standalone root fields
    allRawFields.forEach((field) => {
      if (handledFieldIds.has(field.id)) return;
      if (field.type === 'obsGroup') return;

      const val = formValues[field.id];
      if (val !== undefined && val !== null && val !== '') {
        const conceptUuid = field.questionOptions?.concept;
        if (conceptUuid && !field.questionOptions?.isTransient) {
          obsList.push({
            concept: conceptUuid,
            value: val,
            obsDatetime: formValues['encounterDatetime'] || new Date().toISOString(),
            formFieldNamespace: 'rfe-forms',
            formFieldPath: `rfe-forms-${field.id}`,
          });
        }
      }
    });

    const encounterPayload = {
      encounterType: schema.encounterType,
      patient: patientContext.uuid || patientContext.id,
      encounterDatetime: formValues['encounterDatetime'] || new Date().toISOString(),
      location: formValues['encounterLocation'] || patientContext.locationUuid,
      provider: formValues['encounterProvider'],
      form: {
        uuid: schema.uuid || '4a238dc4-a76b-4c0f-a100-229d98fd5758',
      },
      obs: obsList,
      formSchemaUuid: schema.uuid || '4a238dc4-a76b-4c0f-a100-229d98fd5758',
      formName: schema.name,
    };

    if (onSubmit) {
      try {
        await onSubmit(formValues, encounterPayload);
      } catch (err: any) {
        setSubmitError(err?.message || 'Error saving encounter form record.');
      }
    }
  };

  const visiblePages = evaluatedPages.filter((p) => !p.isHidden);
  const currentPage = visiblePages[activePageIndex] || visiblePages[0];
  const isReadonly = mode === 'view';

  return (
    <Box
      component="form"
      onSubmit={handleSave}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '85vh',
        bgcolor: '#ffffff',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* 1. Header Banner */}
      <Box
        sx={{
          p: 2,
          bgcolor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc', fontSize: '1.1rem' }}>
              {schema.name}
            </Typography>
            {schema.version && (
              <Chip size="small" label={`v${schema.version}`} sx={{ bgcolor: '#334155', color: '#94a3b8', height: 20 }} />
            )}
            <Chip
              size="small"
              label={mode.toUpperCase()}
              color={mode === 'edit' ? 'primary' : mode === 'enter' ? 'success' : 'default'}
              sx={{ fontWeight: 700, height: 20 }}
            />
          </Box>
          {schema.encounterType && (
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Encounter Type: {schema.encounterType}
            </Typography>
          )}
        </Box>

        {/* Patient Demographic Banner */}
        {patientContext.name && (
          <Paper
            elevation={0}
            sx={{
              px: 2,
              py: 0.75,
              bgcolor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <PersonIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffffff' }}>
                {patientContext.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#bae6fd' }}>
                {patientContext.artNumber ? `ART: ${patientContext.artNumber} • ` : ''}
                {patientContext.gender || patientContext.sex} • {patientContext.age} yrs
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Error Alert Banner */}
      {submitError && (
        <Alert severity="error" onClose={() => setSubmitError(null)} sx={{ borderRadius: 0 }}>
          {submitError}
        </Alert>
      )}

      {/* 2. Form Body (Sidebar + Content) */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 400 }}>
        {/* Sidebar for Multi-page forms on Desktop */}
        {!isMobile && visiblePages.length > 1 && (
          <EsmSidebar
            pages={visiblePages}
            activePageIndex={activePageIndex}
            onSelectPage={setActivePageIndex}
            pageErrors={pageErrors}
            forceExpandAll={forceExpandAll}
            onToggleExpandAll={() => setForceExpandAll(!forceExpandAll)}
          />
        )}

        {/* Form Page Content */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto', bgcolor: '#ffffff' }}>
          {/* Mobile Top Tabs for Multi-page */}
          {isMobile && visiblePages.length > 1 && (
            <Tabs
              value={activePageIndex}
              onChange={(_, val) => setActivePageIndex(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2, borderBottom: '1px solid #e2e8f0' }}
            >
              {visiblePages.map((p, idx) => (
                <Tab
                  key={idx}
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>{p.label}</span>
                      {pageErrors[idx] && <Chip size="small" label={pageErrors[idx]} color="error" sx={{ height: 18 }} />}
                    </Box>
                  }
                />
              ))}
            </Tabs>
          )}

          {currentPage && (
            <EsmPageRenderer
              page={currentPage}
              formValues={formValues}
              onChange={handleFieldChange}
              patientContext={patientContext}
              errors={errors}
              isReadonly={isReadonly}
              forceExpandAll={forceExpandAll}
            />
          )}
        </Box>
      </Box>

      {/* 3. Action Footer */}
      <Divider />
      <Box
        sx={{
          p: 2,
          bgcolor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          {isValid ? (
            <Chip
              icon={<ValidIcon />}
              label="All validations passed"
              color="success"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          ) : (
            <Chip
              icon={<WarningIcon />}
              label={`${Object.keys(errors).length} validation issues`}
              color="warning"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
        </Box>

        <Box display="flex" gap={1.5}>
          {onCancel && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<CloseIcon />}
              onClick={onCancel}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
          )}

          {!isReadonly && (
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              disabled={isSubmitting}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                px: 3,
                fontWeight: 700,
                boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)',
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Encounter Record'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};
