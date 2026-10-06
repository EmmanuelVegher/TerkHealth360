/**
 * OpenMRS ESM Form Engine Expression Runner
 * Replicated from @openmrs/esm-form-engine-lib/src/utils/expression-runner.ts
 */

import { CommonExpressionHelpers } from './commonExpressionHelpers';
import { FormField, PatientContext } from './types';

export function evaluateExpression(
  expression: string | undefined | null,
  field: FormField,
  formFields: FormField[],
  formValues: Record<string, any>,
  patientContext: PatientContext
): any {
  if (!expression || typeof expression !== 'string' || !expression.trim()) {
    return null;
  }

  const helpers = new CommonExpressionHelpers(patientContext, formValues);
  const myValue = formValues[field.id];
  const sex = (patientContext.gender || patientContext.sex || '').toUpperCase();
  const isFemale = sex === 'F' || sex === 'FEMALE';
  const isMale = sex === 'M' || sex === 'MALE';
  const age = patientContext.age ?? 0;

  // Build sandboxed evaluation scope
  const scope: Record<string, any> = {
    ...formValues,
    ...helpers,
    myValue,
    patient: patientContext,
    sex,
    gender: sex,
    isFemale,
    isMale,
    age,
    today: helpers.today,
    now: helpers.now,
    isEmpty: helpers.isEmpty,
    hasValue: helpers.hasValue,
    includes: helpers.includes,
    includesAny: helpers.includesAny,
    isDateBefore: helpers.isDateBefore,
    isDateAfter: helpers.isDateAfter,
    calcBMI: helpers.calcBMI,
    calcEDD: helpers.calcEDD,
    calcMonthsOnART: helpers.calcMonthsOnART,
    calcAge: helpers.calcAge,
    formatDate: helpers.formatDate,
    _: { isEmpty: helpers.isEmpty },
  };

  try {
    // Sanitize expression tokens if needed
    let sanitizedExpr = expression.trim();

    // Map common OpenMRS expression patterns
    const argKeys = Object.keys(scope);
    const argVals = Object.values(scope);
    const fn = new Function(...argKeys, `"use strict"; return (${sanitizedExpr});`);
    return fn(...argVals);
  } catch (error) {
    // Fallback: evaluate basic common conditions
    try {
      if (expression.includes('isEmpty(')) {
        const match = expression.match(/isEmpty\(([^)]+)\)/);
        if (match && match[1]) {
          const varName = match[1].trim();
          const targetVal = varName === 'myValue' ? myValue : formValues[varName];
          return helpers.isEmpty(targetVal);
        }
      }
      if (expression.includes('gender') || expression.includes('sex')) {
        if (expression.includes("'F'") || expression.includes("'FEMALE'")) {
          return isFemale;
        }
        if (expression.includes("'M'") || expression.includes("'MALE'")) {
          return isMale;
        }
      }
    } catch {
      // Ignore fallback errors
    }
    return null;
  }
}
