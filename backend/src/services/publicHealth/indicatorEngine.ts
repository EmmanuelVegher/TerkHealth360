/**
 * NHTDAO Layer 4 — Public Health Aggregate Indicator Engine
 *
 * Computes facility-level monthly aggregates (NHMIS monthly summary + IDSR weekly/monthly
 * notifiable disease counts) directly from TerkHealth360 clinical tables. Output values are
 * keyed by a stable `indicatorKey` which is mapped to DHIS2 dataElement / categoryOptionCombo
 * UIDs via the Dhis2DataElementMapping table (UIDs differ between DHIS2 instances, so they are
 * configured per-deployment rather than hard-coded).
 *
 * Period format follows DHIS2 conventions: Monthly = "YYYYMM" (e.g. "202609").
 */
import { prisma } from '../../prisma.js';

export type IndicatorGroup = 'OPD' | 'IPD' | 'MATERNAL' | 'NEWBORN' | 'FAMILY_PLANNING' | 'MALARIA' | 'IDSR';

export interface IndicatorDefinition {
  key: string;
  label: string;
  group: IndicatorGroup;
  source: string; // human-readable description of how the value is derived
}

export interface IndicatorValue extends IndicatorDefinition {
  value: number;
}

export interface PeriodRange {
  period: string;
  start: Date;
  end: Date; // exclusive
}

// ── ICD code sets for disease surveillance (ICD-11 MMS + ICD-10 for legacy records) ──
// Matching is prefix-based on the normalised code, so '1F4' captures 1F40–1F4Z.
export const IDSR_CODE_SETS: Record<string, { label: string; prefixes: string[]; keywords: string[] }> = {
  MALARIA: { label: 'Malaria', prefixes: ['1F4', 'B50', 'B51', 'B52', 'B53', 'B54'], keywords: ['malaria'] },
  CHOLERA: { label: 'Cholera', prefixes: ['1A00', 'A00'], keywords: ['cholera'] },
  LASSA: { label: 'Lassa fever', prefixes: ['1D61.2', 'A96.2'], keywords: ['lassa'] },
  YELLOW_FEVER: { label: 'Yellow fever', prefixes: ['1D47', 'A95'], keywords: ['yellow fever'] },
  MENINGITIS: { label: 'Bacterial / CSM meningitis', prefixes: ['1D01', 'A39', 'G00'], keywords: ['meningitis'] },
  MEASLES: { label: 'Measles', prefixes: ['1F03', 'B05'], keywords: ['measles'] },
  TYPHOID: { label: 'Typhoid fever', prefixes: ['1A07', 'A01.0'], keywords: ['typhoid'] },
  TUBERCULOSIS: { label: 'Tuberculosis', prefixes: ['1B10', '1B11', '1B12', '1B13', '1B14', 'A15', 'A16', 'A17', 'A18', 'A19'], keywords: ['tuberculosis'] },
  HIV: { label: 'HIV disease', prefixes: ['1C60', '1C61', '1C62', 'B20', 'B21', 'B22', 'B23', 'B24'], keywords: ['hiv disease', 'human immunodeficiency virus'] },
};

export const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  // OPD
  { key: 'OPD_ATTENDANCE_TOTAL', label: 'OPD attendance — total', group: 'OPD', source: 'Visits registered in period' },
  { key: 'OPD_ATTENDANCE_MALE', label: 'OPD attendance — male', group: 'OPD', source: 'Visits in period, patient gender MALE' },
  { key: 'OPD_ATTENDANCE_FEMALE', label: 'OPD attendance — female', group: 'OPD', source: 'Visits in period, patient gender FEMALE' },
  { key: 'OPD_ATTENDANCE_UNDER5', label: 'OPD attendance — under 5 years', group: 'OPD', source: 'Visits in period, patient age < 5 at visit date' },
  // IPD
  { key: 'IPD_ADMISSIONS', label: 'Inpatient admissions', group: 'IPD', source: 'Admissions with admittedAt in period' },
  { key: 'IPD_DISCHARGES', label: 'Inpatient discharges', group: 'IPD', source: 'Admissions with dischargedAt in period' },
  { key: 'IPD_DEATHS', label: 'Inpatient deaths', group: 'IPD', source: 'Discharges in period whose reason/status indicates death' },
  // Maternal
  { key: 'ANC_FIRST_VISIT', label: 'ANC first visits (booking)', group: 'MATERNAL', source: 'Antenatal visits in period that are the first for their pregnancy' },
  { key: 'ANC_TOTAL_VISITS', label: 'ANC visits — total', group: 'MATERNAL', source: 'Antenatal visits in period' },
  { key: 'DELIVERIES_TOTAL', label: 'Deliveries — total', group: 'MATERNAL', source: 'Delivery records with birthTimestamp in period' },
  { key: 'DELIVERIES_CAESAREAN', label: 'Deliveries — caesarean section', group: 'MATERNAL', source: 'Deliveries in period with caesarean delivery type' },
  { key: 'MATERNAL_DEATHS', label: 'Maternal deaths', group: 'MATERNAL', source: 'Maternal death reviews with deathDate in period' },
  // Newborn
  { key: 'LIVE_BIRTHS', label: 'Live births', group: 'NEWBORN', source: 'Neonatal records for deliveries in period with APGAR(5 min) > 0' },
  { key: 'STILL_BIRTHS', label: 'Still births', group: 'NEWBORN', source: 'Neonatal records for deliveries in period with APGAR 1 & 5 min = 0' },
  { key: 'LOW_BIRTH_WEIGHT', label: 'Low birth weight (< 2.5 kg)', group: 'NEWBORN', source: 'Live births with birth weight < 2.5 kg (or < 2500 g)' },
  // Family planning
  { key: 'FP_NEW_ACCEPTORS', label: 'Family planning — new acceptors', group: 'FAMILY_PLANNING', source: 'FP enrolments with enrollmentDate in period' },
  // Malaria (NMEP)
  { key: 'MALARIA_TESTS_PERFORMED', label: 'Malaria tests performed (RDT/microscopy)', group: 'MALARIA', source: 'Lab results in period for tests named malaria/MP/RDT' },
  { key: 'MALARIA_TESTS_POSITIVE', label: 'Malaria tests positive', group: 'MALARIA', source: 'Malaria lab results in period interpreted as positive' },
  // IDSR — one indicator per notifiable condition
  ...Object.entries(IDSR_CODE_SETS).map(([k, v]) => ({
    key: `IDSR_${k}_CASES`,
    label: `${v.label} — new cases`,
    group: (k === 'MALARIA' ? 'MALARIA' : 'IDSR') as IndicatorGroup,
    source: `Conditions recorded in period coded ${v.prefixes.join(', ')}`,
  })),
];

// ── Helpers ──────────────────────────────────────────────────────────────────

export function parseMonthlyPeriod(period: string): PeriodRange {
  if (!/^\d{6}$/.test(period)) {
    throw new Error(`Invalid DHIS2 monthly period "${period}". Expected YYYYMM.`);
  }
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6));
  if (month < 1 || month > 12) throw new Error(`Invalid month in period "${period}".`);
  return {
    period,
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/** Previous calendar month, the usual reporting period for NHMIS monthly returns. */
export function previousMonthlyPeriod(ref = new Date()): string {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function codeMatches(code: string | null | undefined, prefixes: string[]): boolean {
  if (!code) return false;
  const c = code.trim().toUpperCase();
  return prefixes.some((p) => c.startsWith(p.toUpperCase()));
}

function isPositiveMalariaResult(...fields: (string | null | undefined)[]): boolean {
  const text = fields.filter(Boolean).join(' ').toLowerCase();
  if (!text) return false;
  if (/\b(negative|not seen|not detected|no parasite|nil)\b/.test(text)) return false;
  return /\b(positive|pos|detected|seen|reactive)\b|\+/.test(text);
}

const DEATH_PATTERN = /(death|died|deceased|expired|dead)/i;
const CAESAREAN_PATTERN = /(caes|cesar|c-section|c\/s|^cs$|section)/i;

// ── Main computation ─────────────────────────────────────────────────────────

export async function computeMonthlyIndicators(period: string): Promise<{ range: PeriodRange; values: IndicatorValue[] }> {
  const range = parseMonthlyPeriod(period);
  const inRange = { gte: range.start, lt: range.end };
  const results: Record<string, number> = {};

  // OPD
  const visits = await prisma.visit.findMany({
    where: { createdAt: inRange },
    select: { createdAt: true, patient: { select: { gender: true, birthDate: true } } },
  });
  results.OPD_ATTENDANCE_TOTAL = visits.length;
  results.OPD_ATTENDANCE_MALE = visits.filter((v) => v.patient?.gender === 'MALE').length;
  results.OPD_ATTENDANCE_FEMALE = visits.filter((v) => v.patient?.gender === 'FEMALE').length;
  results.OPD_ATTENDANCE_UNDER5 = visits.filter((v) => {
    const dob = v.patient?.birthDate;
    if (!dob) return false;
    const fifthBirthday = new Date(dob);
    fifthBirthday.setUTCFullYear(fifthBirthday.getUTCFullYear() + 5);
    return v.createdAt < fifthBirthday;
  }).length;

  // IPD
  results.IPD_ADMISSIONS = await prisma.admission.count({ where: { admittedAt: inRange } });
  const discharges = await prisma.admission.findMany({
    where: { dischargedAt: inRange },
    select: { dischargeReason: true, status: true, clinicalCondition: true },
  });
  results.IPD_DISCHARGES = discharges.length;
  results.IPD_DEATHS = discharges.filter((d) =>
    DEATH_PATTERN.test(`${d.dischargeReason || ''} ${d.status || ''} ${d.clinicalCondition || ''}`),
  ).length;

  // ANC
  const ancVisits = await prisma.antenatalVisit.findMany({
    where: { visitDate: inRange },
    select: { pregnancyId: true },
  });
  results.ANC_TOTAL_VISITS = ancVisits.length;
  const pregIds = [...new Set(ancVisits.map((a) => a.pregnancyId))];
  if (pregIds.length) {
    const priorVisits = await prisma.antenatalVisit.findMany({
      where: { pregnancyId: { in: pregIds }, visitDate: { lt: range.start } },
      select: { pregnancyId: true },
      distinct: ['pregnancyId'],
    });
    const hadPrior = new Set(priorVisits.map((p) => p.pregnancyId));
    results.ANC_FIRST_VISIT = pregIds.filter((id) => !hadPrior.has(id)).length;
  } else {
    results.ANC_FIRST_VISIT = 0;
  }

  // Deliveries & newborns
  const deliveries = await prisma.deliveryRecord.findMany({
    where: { birthTimestamp: inRange },
    select: {
      deliveryType: true,
      neonatalRecords: { select: { birthWeight: true, apgar1Min: true, apgar5Min: true } },
    },
  });
  results.DELIVERIES_TOTAL = deliveries.length;
  results.DELIVERIES_CAESAREAN = deliveries.filter((d) => CAESAREAN_PATTERN.test(d.deliveryType || '')).length;
  const babies = deliveries.flatMap((d) => d.neonatalRecords);
  const liveBabies = babies.filter((b) => (b.apgar5Min ?? 0) > 0);
  results.LIVE_BIRTHS = liveBabies.length;
  results.STILL_BIRTHS = babies.filter((b) => (b.apgar1Min ?? 0) === 0 && (b.apgar5Min ?? 0) === 0).length;
  results.LOW_BIRTH_WEIGHT = liveBabies.filter((b) => {
    const w = Number(b.birthWeight || 0);
    if (w <= 0) return false;
    return w >= 100 ? w < 2500 : w < 2.5; // values >= 100 are assumed to be grams
  }).length;

  results.MATERNAL_DEATHS = await prisma.maternalDeathReview.count({ where: { deathDate: inRange } });
  results.FP_NEW_ACCEPTORS = await prisma.familyPlanningEnrollment.count({ where: { enrollmentDate: inRange } });

  // Malaria laboratory testing
  const malariaResults = await prisma.labResult.findMany({
    where: {
      resultedAt: inRange,
      orderItem: {
        test: {
          OR: [
            { testName: { contains: 'malaria', mode: 'insensitive' } },
            { testName: { contains: 'RDT', mode: 'insensitive' } },
            { testCode: { equals: 'MP', mode: 'insensitive' } },
          ],
        },
      },
    },
    select: { resultValue: true, interpretation: true, resultText: true },
  });
  results.MALARIA_TESTS_PERFORMED = malariaResults.length;
  results.MALARIA_TESTS_POSITIVE = malariaResults.filter((r) =>
    isPositiveMalariaResult(r.resultValue, r.interpretation, r.resultText),
  ).length;

  // IDSR — new cases from ICD-coded Conditions (onset in period, else recorded in period)
  const conditions = await prisma.condition.findMany({
    where: {
      verificationStatus: { notIn: ['REFUTED', 'ENTERED_IN_ERROR'] as any },
      OR: [{ onsetDateTime: inRange }, { onsetDateTime: null, createdAt: inRange }],
    },
    select: { code: true, display: true, patientId: true },
  });
  for (const [k, set] of Object.entries(IDSR_CODE_SETS)) {
    // Count distinct patients so repeated entries of the same diagnosis in one month count once.
    const patients = new Set(
      conditions
        .filter((c) => codeMatches(c.code, set.prefixes) || (!c.code && set.keywords.some((kw) => (c.display || '').toLowerCase().includes(kw))))
        .map((c) => c.patientId),
    );
    results[`IDSR_${k}_CASES`] = patients.size;
  }

  const values: IndicatorValue[] = INDICATOR_DEFINITIONS.map((def) => ({ ...def, value: results[def.key] ?? 0 }));
  return { range, values };
}
