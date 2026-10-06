/**
 * OpenMRS ESM Form Engine Expression Helpers
 * Replicated from @openmrs/esm-form-engine-lib/src/utils/common-expression-helpers.ts
 */

export class CommonExpressionHelpers {
  patient: any;
  formValues: Record<string, any>;

  constructor(patient: any = {}, formValues: Record<string, any> = {}) {
    this.patient = patient;
    this.formValues = formValues;
  }

  isEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (typeof value === 'object' && Object.keys(value).length === 0) return true;
    return false;
  };

  hasValue = (value: any): boolean => {
    return !this.isEmpty(value);
  };

  today = (): Date => {
    return new Date();
  };

  now = (): Date => {
    return new Date();
  };

  includes = (collection: any[], value: any): boolean => {
    if (!collection || !Array.isArray(collection)) return false;
    return collection.includes(value);
  };

  includesAny = (collection: any[], values: any[]): boolean => {
    if (!collection || !Array.isArray(collection) || !values) return false;
    return values.some(v => collection.includes(v));
  };

  isDateBefore = (left: Date | string, right: Date | string): boolean => {
    if (!left || !right) return false;
    const lDate = left instanceof Date ? left : new Date(left);
    const rDate = right instanceof Date ? right : new Date(right);
    return lDate.getTime() < rDate.getTime();
  };

  isDateAfter = (
    selectedDate: Date | string,
    baseDate: Date | string,
    duration: number = 0,
    timePeriod: 'days' | 'weeks' | 'months' | 'years' = 'days'
  ): boolean => {
    if (!selectedDate || !baseDate) return false;
    const sel = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
    const base = baseDate instanceof Date ? new Date(baseDate.getTime()) : new Date(baseDate);

    switch (timePeriod) {
      case 'days':
        base.setDate(base.getDate() + duration);
        break;
      case 'weeks':
        base.setDate(base.getDate() + duration * 7);
        break;
      case 'months':
        base.setMonth(base.getMonth() + duration);
        break;
      case 'years':
        base.setFullYear(base.getFullYear() + duration);
        break;
    }
    return sel.getTime() >= base.getTime();
  };

  calcBMI = (weight: number | string, height: number | string): number | null => {
    const w = typeof weight === 'string' ? parseFloat(weight) : weight;
    const h = typeof height === 'string' ? parseFloat(height) : height;
    if (!w || !h || h <= 0) return null;
    const heightInMeters = h > 3 ? h / 100 : h;
    const bmi = w / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  };

  calcEDD = (lmp: Date | string): string | null => {
    if (!lmp) return null;
    const lmpDate = lmp instanceof Date ? lmp : new Date(lmp);
    if (isNaN(lmpDate.getTime())) return null;
    const edd = new Date(lmpDate);
    edd.setDate(edd.getDate() + 280); // 40 weeks = 280 days
    return edd.toISOString().split('T')[0];
  };

  calcMonthsOnART = (artStartDate: Date | string, encDate?: Date | string): number => {
    if (!artStartDate) return 0;
    const start = artStartDate instanceof Date ? artStartDate : new Date(artStartDate);
    const enc = encDate ? (encDate instanceof Date ? encDate : new Date(encDate)) : new Date();
    const months = (enc.getFullYear() - start.getFullYear()) * 12 + (enc.getMonth() - start.getMonth());
    return Math.max(0, months);
  };

  calcAge = (birthDate: Date | string): number => {
    if (!birthDate) return this.patient?.age || 0;
    const b = birthDate instanceof Date ? birthDate : new Date(birthDate);
    const diffMs = Date.now() - b.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  formatDate = (date: Date | string, format: string = 'YYYY-MM-DD'): string => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    if (format === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
    return `${yyyy}-${mm}-${dd}`;
  };
}
