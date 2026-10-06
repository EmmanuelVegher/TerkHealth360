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

  // Build sandboxed evaluation scope with helpers and patient context
  const scope: Record<string, any> = {
    ...formValues,
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
    arrayContains: helpers.arrayContains,
    contains: helpers.contains,
    isDateBefore: helpers.isDateBefore,
    isDateAfter: helpers.isDateAfter,
    calcBMI: helpers.calcBMI,
    calcEDD: helpers.calcEDD,
    calcMonthsOnART: helpers.calcMonthsOnART,
    calcAge: helpers.calcAge,
    formatDate: helpers.formatDate,
    lookupArvStrength: helpers.lookupArvStrength,
    _: { isEmpty: helpers.isEmpty },
  };

  // Add field IDs as known variables so they default to undefined if unentered
  if (Array.isArray(formFields)) {
    for (const f of formFields) {
      if (f && f.id && !(f.id in scope)) {
        scope[f.id] = undefined;
      }
    }
  }

  try {
    const sanitizedExpr = expression.trim();

    // Use Proxy sandbox so uninitialized variables resolve to undefined without throwing ReferenceError
    const proxy = new Proxy(scope, {
      has(_target, _key) {
        return true;
      },
      get(target, key) {
        if (typeof key === 'symbol') return (target as any)[key];
        if (key in target) return (target as any)[key];
        // Fallback: search case-insensitive or stripped
        for (const [k, v] of Object.entries(target)) {
          if (k.toLowerCase() === key.toLowerCase() || k.replace(/[^a-zA-Z0-9_]/g, '') === key) {
            return v;
          }
        }
        return undefined;
      }
    });

    const fn = new Function('sandbox', `with(sandbox) { return (${sanitizedExpr}); }`);
    return fn(proxy);
  } catch (error) {
    // Graceful fallback for basic common patterns
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

