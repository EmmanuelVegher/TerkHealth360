import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { NmrsDataBridge } from '../services/nmrs/nmrsDataBridge.js';
import {
  PROGRAMS, JUNK_FORM_CODES, programById, groupForm, ensureDiseaseClinicSchemas, NEW_CATEGORIES,
} from '../services/diseaseClinicCatalog.js';

const router = Router();

const clean = (v: any): any => JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? Number(val) : val)));
const q = async (sql: Prisma.Sql) => clean(await prisma.$queryRaw(sql));
const catList = (cats: string[]) => Prisma.join(cats);
const junk = () => Prisma.join(JUNK_FORM_CODES);
const age = (d?: Date | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 31557600000) : null);
const fail = (res: Response, e: any) => {
  console.error('[disease-clinics]', e);
  res.status(500).json({ success: false, message: e?.message || 'Server error' });
};

router.use(async (_req, _res, next) => {
  try { await ensureDiseaseClinicSchemas(); } catch (e) { console.warn('schema seed failed', e); }
  next();
});

/** Metrics for one program, used for hub cards and dashboards */
async function programSummary(id: string) {
  const p = programById(id)!;
  const base = Prisma.sql`FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id
    WHERE s.category IN (${catList(p.categories)}) AND s.form_code NOT IN (${junk()})`;
  const [tot] = await q(Prisma.sql`SELECT COUNT(DISTINCT e.patient_id) AS patients, COUNT(*) AS encounters,
    COUNT(*) FILTER (WHERE e.encounter_date >= NOW() - INTERVAL '30 days') AS last30,
    COUNT(DISTINCT e.patient_id) FILTER (WHERE e.encounter_date >= NOW() - INTERVAL '30 days') AS active30 ${base}`);
  const [fc] = await q(Prisma.sql`SELECT COUNT(*) AS n FROM nmrs_form_schemas s WHERE s.is_active AND s.category IN (${catList(p.categories)}) AND s.form_code NOT IN (${junk()})`);
  const spark = await q(Prisma.sql`SELECT to_char(date_trunc('month', e.encounter_date), 'Mon') AS m, date_trunc('month', e.encounter_date) AS d, COUNT(*) AS v
    ${base} AND e.encounter_date >= date_trunc('month', NOW()) - INTERVAL '5 months' AND e.encounter_date <= NOW()
    GROUP BY 1, 2 ORDER BY 2`);
  return { ...p, patients: tot?.patients || 0, encounters: tot?.encounters || 0, last30: tot?.last30 || 0, active30: tot?.active30 || 0, forms: fc?.n || 0, sparkline: spark.map((r: any) => ({ m: r.m, v: r.v })) };
}

let programsCache: { at: number; data: any[] } | null = null;
router.get('/programs', async (_req, res) => {
  try {
    if (!programsCache || Date.now() - programsCache.at > 60000) {
      const data = [];
      for (const p of PROGRAMS) data.push(await programSummary(p.id));
      programsCache = { at: Date.now(), data };
    }
    res.json({ success: true, data: programsCache.data });
  } catch (e) { fail(res, e); }
});

/** Global patient search with per-program enrolment chips */
router.get('/patients/search', async (req, res) => {
  try {
    const term = String(req.query.q || '').trim();
    if (term.length < 2) return res.json({ success: true, data: [] });
    const rows = await prisma.patient.findMany({
      where: { OR: [
        { firstName: { contains: term, mode: 'insensitive' } }, { lastName: { contains: term, mode: 'insensitive' } },
        { patientNumber: { contains: term, mode: 'insensitive' } }, { nin: { contains: term } },
        { nmrsMapping: { pepfarId: { contains: term, mode: 'insensitive' } } },
      ] },
      include: { nmrsMapping: true }, take: 20, orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: await decoratePatients(rows) });
  } catch (e) { fail(res, e); }
});

async function enrolments(ids: string[]) {
  if (!ids.length) return {} as Record<string, Record<string, { n: number; last: string }>>;
  const rows = await q(Prisma.sql`SELECT e.patient_id AS pid, s.category AS cat, COUNT(*) AS n, MAX(e.encounter_date) AS last
    FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id
    WHERE e.patient_id IN (${Prisma.join(ids)}) AND s.form_code NOT IN (${junk()}) GROUP BY 1, 2`);
  const out: Record<string, Record<string, { n: number; last: string }>> = {};
  for (const r of rows) {
    for (const p of PROGRAMS) {
      if (!p.categories.includes(r.cat)) continue;
      const m = (out[r.pid] ||= {});
      const cur = m[p.id] || { n: 0, last: '' };
      m[p.id] = { n: cur.n + r.n, last: !cur.last || r.last > cur.last ? r.last : cur.last };
    }
  }
  return out;
}

async function decoratePatients(rows: any[]) {
  const en = await enrolments(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id, patientNumber: r.patientNumber, name: `${r.firstName} ${r.lastName}`.trim(), gender: r.gender, age: age(r.birthDate),
    artNumber: r.nmrsMapping?.pepfarId || null, regimen: r.nmrsMapping?.currentRegimen || null,
    programs: en[r.id] || {},
  }));
}

router.get('/patients/:patientId/overview', async (req, res) => {
  try {
    const { patientId } = req.params;
    const p = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { nmrsMapping: true, allergies: true, telecoms: true,
        triageRecords: { orderBy: { createdAt: 'desc' }, take: 1 } },
    } as any) as any;
    if (!p) return res.status(404).json({ success: false, message: 'Patient not found' });
    const en = (await enrolments([patientId]))[patientId] || {};
    const recent = await q(Prisma.sql`SELECT e.id, e.encounter_number AS "encounterNumber", e.encounter_date AS "encounterDate", e.sync_status AS "syncStatus",
      s.form_name AS "formName", s.form_code AS "formCode", s.category FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id
      WHERE e.patient_id = ${patientId} ORDER BY e.encounter_date DESC LIMIT 60`);
    const programs = PROGRAMS.map((pr) => {
      const items = recent.filter((r: any) => pr.categories.includes(r.category) && !JUNK_FORM_CODES.includes(r.formCode));
      return { id: pr.id, title: pr.title, color: pr.color, enrolled: !!en[pr.id], encounters: en[pr.id]?.n || 0, lastVisit: en[pr.id]?.last || null, recent: items.slice(0, 3) };
    });
    const m = p.nmrsMapping;
    const alerts: { level: string; program: string; text: string }[] = [];
    const days = (d?: string | null) => (d ? (Date.now() - new Date(d).getTime()) / 86400000 : Infinity);
    const hiv = en['hiv-art'], tb = en['tb-dots'], mch = en['mch'];
    if (hiv && days(tb?.last) > 180) alerts.push({ level: 'warning', program: 'tb-dots', text: 'HIV client without TB screening in the last 180 days. Screen for TB (and offer TPT if eligible).' });
    if (m?.lastViralLoad != null && Number(m.lastViralLoad) >= 1000) alerts.push({ level: 'error', program: 'hiv-art', text: `Unsuppressed viral load (${m.lastViralLoad} cp/mL). Start Enhanced Adherence Counselling.` });
    if (m?.lastCd4Count != null && Number(m.lastCd4Count) < 200) alerts.push({ level: 'error', program: 'hiv-art', text: `CD4 ${m.lastCd4Count} (<200): advanced HIV disease package.` });
    if (hiv && days(m?.lastVlDate?.toISOString?.() ?? null) > 365) alerts.push({ level: 'warning', program: 'hiv-art', text: 'Viral load overdue (>12 months).' });
    if (hiv && mch && p.gender === 'FEMALE') alerts.push({ level: 'info', program: 'mch', text: 'HIV-positive woman attending MCH: ensure PMTCT enrolment and infant prophylaxis.' });
    const t = p.triageRecords?.[0];
    res.json({ success: true, data: {
      id: p.id, patientNumber: p.patientNumber, name: `${p.firstName} ${p.lastName}`.trim(), gender: p.gender, age: age(p.birthDate), birthDate: p.birthDate,
      phone: p.telecoms?.find((x: any) => x.system === 'phone')?.value || null, address: [p.lga, p.stateOfOrigin].filter(Boolean).join(', ') || null,
      bloodGroup: p.bloodGroup, genotype: p.genotype, allergies: (p.allergies || []).map((a: any) => a.substance || a.allergen || a.name).filter(Boolean),
      vitals: t ? { systolic: t.systolic, diastolic: t.diastolic, temperature: t.temperature, pulse: t.pulseRate, spo2: t.spo2, weight: t.weight, height: t.height, at: t.createdAt } : null,
      hiv: m ? { artNumber: m.pepfarId, regimen: m.currentRegimen, viralLoad: m.lastViralLoad, vlDate: m.lastVlDate, cd4: m.lastCd4Count, artStart: m.artStartDate } : null,
      programs, alerts,
    } });
  } catch (e) { fail(res, e); }
});

router.get('/patients/:patientId/encounters', async (req, res) => {
  try {
    const prog = req.query.program ? programById(String(req.query.program)) : null;
    const cats = prog ? prog.categories : PROGRAMS.flatMap((x) => x.categories);
    const rows = await q(Prisma.sql`SELECT e.id, e.encounter_number AS "encounterNumber", e.encounter_date AS "encounterDate", e.sync_status AS "syncStatus",
      e.clinician_name AS "clinicianName", e.form_data AS "formData", s.id AS "formSchemaId", s.form_name AS "formName", s.form_code AS "formCode", s.category
      FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id
      WHERE e.patient_id = ${req.params.patientId} AND s.category IN (${catList(cats)}) AND s.form_code NOT IN (${junk()})
      ORDER BY e.encounter_date DESC LIMIT 200`);
    res.json({ success: true, data: rows });
  } catch (e) { fail(res, e); }
});

router.get('/forms/:id', async (req, res) => {
  try {
    const f = await prisma.nmrsFormSchema.findUnique({ where: { id: req.params.id } });
    if (!f) return res.status(404).json({ success: false, message: 'Form not found' });
    res.json({ success: true, data: f });
  } catch (e) { fail(res, e); }
});

import { ClinicalIntegrationService } from '../services/clinicalIntegrationService.js';

router.post('/patients/:patientId/forms/:formId/submit', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { patientId, formId } = req.params;
    const { formData = {}, encounterDate } = req.body || {};
    const form = await prisma.nmrsFormSchema.findUnique({ where: { id: formId } });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const isNational = NEW_CATEGORIES.includes(form.category);
    const raw = encounterDate || formData.visitDate || formData.encounterDate || formData.visit_date;
    const when = raw ? new Date(raw) : new Date();
    const resolvedDate = isNaN(when.getTime()) ? new Date() : when;
    const clinicianName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Clinician';
    let data = formData;
    if (!isNational) {
      try { data = (await NmrsDataBridge.verifyAndEnrichFormDataWithLiveConcepts(formData)) || formData; } catch { /* offline OpenMRS */ }
    }

    // Attach standard data dictionary metadata
    const standardVitals = ClinicalIntegrationService.extractVitals(data);
    const standardMeds = ClinicalIntegrationService.extractPrescriptions(data, form.formCode, form.formName);
    const standardLabs = ClinicalIntegrationService.extractLabInvestigations(data, form.formCode, form.formName);
    data._dataDictionary = {
      standard: 'WHO_CIEL_LOINC_RXNORM',
      mappedAt: new Date().toISOString(),
      vitalsCodes: standardVitals ? Object.keys(standardVitals) : [],
      medicationCodes: standardMeds.map(m => m.medicationCode),
      labCodes: standardLabs.map(l => l.loincCode || l.testCode),
    };

    const enc = await prisma.nmrsEncounterRecord.create({
      data: {
        encounterNumber: `DC-ENC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        patientId, formSchemaId: formId, encounterType: form.formCode, encounterDate: resolvedDate,
        clinicianName, clinicianId: user?.id || 'STAFF-SYSTEM', formData: data, syncStatus: isNational ? 'LOCAL' : 'PENDING',
      },
    });

    // Clinically integrate vitals into TriageRecords, prescriptions into MedicationRequests, and labs into LabOrders
    try {
      await ClinicalIntegrationService.integrateEncounter({
        patientId,
        formSchemaId: formId,
        formCode: form.formCode,
        formName: form.formName,
        category: form.category,
        formData: data,
        encounterDate: resolvedDate,
        clinicianName,
        clinicianId: user?.id,
        encounterRecordId: enc.id,
      });
    } catch (intErr: any) {
      console.warn('[disease-clinics] Clinical integration warning:', intErr.message);
    }

    if (!isNational) {
      const u: any = {};
      if (formData.viralLoadValue !== undefined) { u.lastViralLoad = Number(formData.viralLoadValue); u.lastVlDate = resolvedDate; }
      if (formData.cd4Value !== undefined) u.lastCd4Count = Number(formData.cd4Value);
      if (formData.currentArvRegimen) u.currentRegimen = formData.currentArvRegimen;
      if (formData.prescribedRegimen) u.currentRegimen = formData.prescribedRegimen;
      if (Object.keys(u).length) {
        await prisma.nmrsPatientMapping.upsert({
          where: { patientId },
          create: { id: `npm_${patientId.replace(/-/g, '').slice(0, 24)}`, patientId, pepfarId: `ART-${patient.patientNumber}`, ...u, syncStatus: 'SYNCED', lastSyncedAt: new Date() },
          update: u,
        });
      }
      try {
        const r: any = await NmrsDataBridge.pushNmrsEncounterRecord(enc.id);
        if (r?.success) await prisma.nmrsEncounterRecord.update({ where: { id: enc.id }, data: { syncStatus: 'SYNCED', syncedAt: new Date(), openmrsEncounterUuid: r.openmrsEncounterUuid || undefined } });
      } catch (err: any) { console.warn('[disease-clinics] push failed', err.message); }
    }
    res.json({ success: true, data: enc });
  } catch (e) { fail(res, e); }
});

router.get('/patients/:patientId/longitudinal', async (req, res) => {
  try {
    const { patientId } = req.params;
    const rows = await q(Prisma.sql`SELECT e.id, e.encounter_date AS date, e.encounter_number AS "encounterNumber", e.form_data AS "formData", e.sync_status AS "syncStatus",
      e.clinician_name AS "clinicianName", s.id AS "formSchemaId", s.form_name AS "formName", s.form_code AS "formCode", s.category
      FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id
      WHERE e.patient_id = ${patientId} AND s.form_code NOT IN (${junk()}) ORDER BY e.encounter_date ASC LIMIT 1000`);
    const events = rows.map((r: any) => {
      const pr = PROGRAMS.find((p) => p.categories.includes(r.category));
      return { id: r.id, date: r.date, formName: r.formName, formCode: r.formCode, formSchemaId: r.formSchemaId, clinicianName: r.clinicianName, syncStatus: r.syncStatus,
        program: pr?.id || 'other', programTitle: pr?.title || 'Other', color: pr?.color || '#64748b', formData: r.formData };
    });
    const num = (v: any) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v));
    const series = (...keys: string[]) => events.map((e: any) => {
      const k = keys.find((x) => num(e.formData?.[x]) !== null);
      return { date: e.date, value: k ? num(e.formData[k]) : null };
    }).filter((x: any) => x.value !== null);
    const tri = ((await prisma.patient.findUnique({ where: { id: patientId }, include: { triageRecords: { orderBy: { createdAt: 'asc' }, take: 60 } } } as any)) as any)?.triageRecords || [];
    const vitals = tri.map((t: any) => ({ date: t.createdAt, systolic: num(t.systolic), diastolic: num(t.diastolic), weight: num(t.weight), pulse: num(t.pulseRate), spo2: num(t.spo2) }));
    const strip = events.map(({ formData, ...e }: any) => e);
    const counts: Record<string, number> = {};
    events.forEach((e: any) => { counts[e.program] = (counts[e.program] || 0) + 1; });
    res.json({ success: true, data: { events: strip.reverse(), vitals, viralLoad: series('viralLoadValue', 'HIV VIRAL LOAD', 'HIV Viral Load (Quantitative)', 'Alphanumeric Viral Load Result'), cd4: series('cd4Value', 'CD4 COUNT', 'CD4 Absolute Count (cells/µL)', 'CD4 LFA RESULT'),
      malariaPositives: events.filter((e: any) => e.formCode === 'NG_MALARIA_OPD_CASE_REGISTER' && String(e.formData?.mrdt_result).toUpperCase() === 'POSITIVE').map((e: any) => ({ date: e.date })),
      vaccinations: events.filter((e: any) => e.formCode === 'NG_EPI_VACCINATION_SESSION').map((e: any) => ({ date: e.date, antigens: e.formData?.antigens_administered || [] })),
      counts } });
  } catch (e) { fail(res, e); }
});

router.get('/:program/dashboard', async (req, res) => {
  try {
    const p = programById(req.params.program);
    if (!p) return res.status(404).json({ success: false, message: 'Unknown program' });
    const summary = await programSummary(p.id);
    const base = Prisma.sql`FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id
      WHERE s.category IN (${catList(p.categories)}) AND s.form_code NOT IN (${junk()})`;
    const trend = await q(Prisma.sql`SELECT to_char(date_trunc('month', e.encounter_date), 'Mon YY') AS month, date_trunc('month', e.encounter_date) AS d,
      COUNT(*) AS encounters, COUNT(DISTINCT e.patient_id) AS patients ${base}
      AND e.encounter_date >= date_trunc('month', NOW()) - INTERVAL '11 months' AND e.encounter_date <= NOW() GROUP BY 1, 2 ORDER BY 2`);
    const topForms = await q(Prisma.sql`SELECT s.form_name AS name, COUNT(*) AS value ${base} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`);
    const byCat = await q(Prisma.sql`SELECT s.category AS name, COUNT(*) AS value ${base} GROUP BY 1 ORDER BY 2 DESC`);
    const sex = await q(Prisma.sql`SELECT pt.gender AS name, COUNT(DISTINCT e.patient_id) AS value FROM nmrs_encounter_records e
      JOIN nmrs_form_schemas s ON s.id = e.form_schema_id JOIN patients pt ON pt.id = e.patient_id
      WHERE s.category IN (${catList(p.categories)}) AND s.form_code NOT IN (${junk()}) GROUP BY 1`);

    const kpis: { label: string; value: string | number; hint?: string; tone?: string }[] = [
      { label: 'Patients served', value: summary.patients, hint: 'unique, all-time' },
      { label: 'Active (30 days)', value: summary.active30, hint: 'patients with a visit' },
      { label: 'Encounters (30 days)', value: summary.last30 },
      { label: 'Forms available', value: summary.forms },
    ];
    let extra: any = {};
    const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
    const jsonCount = async (code: string, key: string, val: string) => {
      const [r] = await q(Prisma.sql`SELECT COUNT(*) AS n FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id
        WHERE s.form_code = ${code} AND UPPER(e.form_data->>${key}) = ${val}`);
      return r?.n || 0;
    };
    if (p.id === 'hiv-art') {
      const onArt = await prisma.nmrsPatientMapping.count({ where: { currentRegimen: { not: null } } });
      const vlDone = await prisma.nmrsPatientMapping.count({ where: { lastViralLoad: { not: null } } });
      const supp = await prisma.nmrsPatientMapping.count({ where: { lastViralLoad: { not: null, lt: 1000 } } });
      const lowCd4 = await prisma.nmrsPatientMapping.count({ where: { lastCd4Count: { lt: 200 } } });
      const reg = await prisma.nmrsPatientMapping.groupBy({ by: ['currentRegimen'], where: { currentRegimen: { not: null } }, _count: { _all: true }, orderBy: { _count: { currentRegimen: 'desc' } }, take: 6 });
      kpis.push({ label: 'On ART', value: onArt, tone: 'success' }, { label: 'VL suppression', value: pct(supp, vlDone), hint: `${supp}/${vlDone} with VL <1000`, tone: 'success' }, { label: 'CD4 < 200', value: lowCd4, tone: 'danger' });
      extra.distribution = { title: 'Regimen mix', data: reg.map((r) => ({ name: r.currentRegimen, value: r._count._all })) };
    } else if (p.id === 'tb-dots') {
      const [scr] = await q(Prisma.sql`SELECT COUNT(DISTINCT e.patient_id) AS n FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id WHERE s.form_code IN ('TB_SCREENING_FORM','PRESUMPTIVE_TB_REGISTER_FORM')`);
      const [tpt] = await q(Prisma.sql`SELECT COUNT(DISTINCT e.patient_id) AS n FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id WHERE s.form_code IN ('IPT','TB_PREVENTIVE_THERAPHY')`);
      const [trt] = await q(Prisma.sql`SELECT COUNT(DISTINCT e.patient_id) AS n FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id WHERE s.form_code IN ('TB_PATIENT_TREATMENT_CARD_FORM','TB_TREATMENT_MONITORING_FORM')`);
      kpis.push({ label: 'Screened / presumptive', value: scr?.n || 0 }, { label: 'On TB treatment', value: trt?.n || 0, tone: 'warning' }, { label: 'On TPT', value: tpt?.n || 0, tone: 'success' });
    } else if (p.id === 'malaria') {
      const pos = await jsonCount('NG_MALARIA_OPD_CASE_REGISTER', 'mrdt_result', 'POSITIVE');
      const sev = await jsonCount('NG_MALARIA_OPD_CASE_REGISTER', 'classification', 'SEVERE_MALARIA');
      kpis.push({ label: 'mRDT positive', value: pos, tone: 'danger' }, { label: 'Severe cases', value: sev, tone: 'danger' });
    } else if (p.id === 'immunization') {
      const aefi = await jsonCount('NG_EPI_AEFI_REPORT', 'seriousness', 'SERIOUS_HOSPITALISED');
      kpis.push({ label: 'Serious AEFI', value: aefi, tone: 'danger' });
    } else if (p.id === 'polio-afp') {
      const adequate = await jsonCount('NG_AFP_STOOL_SPECIMEN_LAB', 'adequate_stool_2_specimens_24_48h_apart_within_14_days', 'YES');
      const [cases] = await q(Prisma.sql`SELECT COUNT(*) AS n FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id WHERE s.form_code = 'NG_AFP_CASE_INVESTIGATION'`);
      kpis.push({ label: 'AFP cases investigated', value: cases?.n || 0 }, { label: 'Adequate stool', value: pct(adequate, cases?.n || 0), tone: 'success' });
    } else if (p.id === 'mch') {
      const [anc] = await q(Prisma.sql`SELECT COUNT(DISTINCT e.patient_id) AS n FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id WHERE s.form_code IN ('ANTENATAL_CARE_DETAILS','NG_MCH_ANC_VISIT_REGISTER')`);
      kpis.push({ label: 'ANC clients', value: anc?.n || 0 });
    }

    // cross-clinic overlap
    const overlap = [];
    for (const o of PROGRAMS.filter((x) => x.id !== p.id)) {
      const [r] = await q(Prisma.sql`SELECT COUNT(DISTINCT a.patient_id) AS n FROM nmrs_encounter_records a JOIN nmrs_form_schemas sa ON sa.id = a.form_schema_id
        WHERE sa.category IN (${catList(p.categories)}) AND sa.form_code NOT IN (${junk()}) AND a.patient_id IN (
          SELECT b.patient_id FROM nmrs_encounter_records b JOIN nmrs_form_schemas sb ON sb.id = b.form_schema_id WHERE sb.category IN (${catList(o.categories)}) AND sb.form_code NOT IN (${junk()}))`);
      overlap.push({ id: o.id, title: o.title, color: o.color, patients: r?.n || 0 });
    }
    res.json({ success: true, data: { program: p, summary, kpis, trend, topForms, categories: byCat, sex, overlap, ...extra } });
  } catch (e) { fail(res, e); }
});

router.get('/:program/forms', async (req, res) => {
  try {
    const p = programById(req.params.program);
    if (!p) return res.status(404).json({ success: false, message: 'Unknown program' });
    const patientId = req.query.patientId ? String(req.query.patientId) : null;
    const rows = await q(Prisma.sql`SELECT s.id, s.form_code AS "formCode", s.form_name AS "formName", s.description, s.category, s.version,
      jsonb_array_length(COALESCE(s.schema_json->'pages', '[]'::jsonb)) AS pages,
      COALESCE(c.n, 0) AS "filledCount", c.last AS "lastFilled"
      FROM nmrs_form_schemas s LEFT JOIN (
        SELECT form_schema_id, COUNT(*) AS n, MAX(encounter_date) AS last FROM nmrs_encounter_records
        WHERE ${patientId ? Prisma.sql`patient_id = ${patientId}` : Prisma.sql`FALSE`} GROUP BY 1) c ON c.form_schema_id = s.id
      WHERE s.is_active AND s.category IN (${catList(p.categories)}) AND s.form_code NOT IN (${junk()}) AND s.form_code NOT LIKE 'COVID19%'
      ORDER BY s.form_name`);
    const forms = rows.map((r: any) => ({ ...r, group: groupForm(r.category, r.formCode, r.formName) }));
    const groups = Array.from(new Set(forms.map((f: any) => f.group)));
    res.json({ success: true, data: forms, groups });
  } catch (e) { fail(res, e); }
});

router.get('/:program/patients', async (req, res) => {
  try {
    const p = programById(req.params.program);
    if (!p) return res.status(404).json({ success: false, message: 'Unknown program' });
    const term = String(req.query.search || '').trim();
    let rows: any[];
    if (term.length >= 2) {
      rows = await prisma.patient.findMany({
        where: { OR: [
          { firstName: { contains: term, mode: 'insensitive' } }, { lastName: { contains: term, mode: 'insensitive' } },
          { patientNumber: { contains: term, mode: 'insensitive' } }, { nin: { contains: term } },
          { nmrsMapping: { pepfarId: { contains: term, mode: 'insensitive' } } },
        ] }, include: { nmrsMapping: true }, take: 30, orderBy: { updatedAt: 'desc' },
      });
    } else {
      const ids = await q(Prisma.sql`SELECT e.patient_id AS id FROM nmrs_encounter_records e JOIN nmrs_form_schemas s ON s.id = e.form_schema_id
        WHERE s.category IN (${catList(p.categories)}) AND s.form_code NOT IN (${junk()}) GROUP BY 1 ORDER BY MAX(e.encounter_date) DESC LIMIT 25`);
      rows = ids.length ? await prisma.patient.findMany({ where: { id: { in: ids.map((r: any) => r.id) } }, include: { nmrsMapping: true } }) : [];
      const order = new Map(ids.map((r: any, i: number) => [r.id, i]));
      rows.sort((a, b) => (order.get(a.id) as number) - (order.get(b.id) as number));
    }
    const data = (await decoratePatients(rows)).map((x) => ({ ...x, enrolled: !!x.programs[p.id], lastVisit: x.programs[p.id]?.last || null, encounters: x.programs[p.id]?.n || 0 }));
    res.json({ success: true, data });
  } catch (e) { fail(res, e); }
});

export default router;
