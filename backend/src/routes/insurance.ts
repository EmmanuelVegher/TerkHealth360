import { Router } from 'express';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();
import { prisma } from '../prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STORES  (Module 16 extended data – augments existing Prisma tables)
// ─────────────────────────────────────────────────────────────────────────────

// §16.1 – Beneficiary enrolments & benefit packages
const beneficiaryProfiles: any[] = [];
const benefitPackages: any[] = [
  { id: 'BP001', payerCode: 'NHIA', planType: 'NHIA-Standard', coveredServices: ['OPD','IPD','Lab','Radiology','Pharmacy','ANC','Immunization'], exclusions: ['Cosmetic Surgery','Experimental'], copayPct: 10, deductible: 0, annualLimit: 500000, authRequired: ['Surgery','MRI','CT'], status: 'ACTIVE', version: 2, effectiveDate: '2026-01-01' },
  { id: 'BP002', payerCode: 'AXA', planType: 'HMO-Gold', coveredServices: ['OPD','IPD','Lab','Radiology','Pharmacy','Dental','Optical'], exclusions: ['HIV/AIDS Medications','Infertility'], copayPct: 20, deductible: 5000, annualLimit: 2000000, authRequired: ['Specialist','Surgery','MRI'], status: 'ACTIVE', version: 1, effectiveDate: '2026-01-01' },
  { id: 'BP003', payerCode: 'REL', planType: 'HMO-Silver', coveredServices: ['OPD','Lab','Pharmacy'], exclusions: ['IPD','Surgery','Radiology'], copayPct: 30, deductible: 2000, annualLimit: 300000, authRequired: ['All'], status: 'ACTIVE', version: 1, effectiveDate: '2026-01-01' },
  { id: 'BP004', payerCode: 'CORP', planType: 'Corporate-Executive', coveredServices: ['OPD','IPD','Lab','Radiology','Pharmacy','Dental','Optical','Wellness'], exclusions: [], copayPct: 0, deductible: 0, annualLimit: 5000000, authRequired: [], status: 'ACTIVE', version: 1, effectiveDate: '2026-01-01' },
  { id: 'BP005', payerCode: 'DONOR', planType: 'CDC-ART-Programme', coveredServices: ['HIV/ART Medications','VL Testing','CD4 Count','OI Treatment','Counselling'], exclusions: ['Non-ART services reimbursed by insurance'], copayPct: 0, deductible: 0, annualLimit: 999999999, authRequired: [], status: 'ACTIVE', version: 1, effectiveDate: '2026-01-01', isDonorFunded: true },
];
let bpCounter = 6;

// §16.2 – Authorizations, Referrals, Utilization
const authorizations: any[] = [
  { id: 'AUTH001', patientId: 'P001', patientName: 'Adaeze Okonkwo', payer: 'AXA Mansard HMO', service: 'MRI Scan – Lumbar Spine', icdCode: 'M51.1', cptCode: '72148', requestDate: '2026-06-20', authNumber: 'AXA-2026-00147', status: 'APPROVED', approvedDate: '2026-06-22', expiryDate: '2026-09-22', urgency: 'Elective', clinicalJustification: 'Chronic lower back pain, conservative treatment failed', requestedBy: 'Dr. Emeka Obi' },
  { id: 'AUTH002', patientId: 'P002', patientName: 'Bola Adeyemi', payer: 'NHIA', service: 'Laparoscopic Cholecystectomy', icdCode: 'K80.20', cptCode: '47562', requestDate: '2026-06-25', authNumber: null, status: 'PENDING', approvedDate: null, expiryDate: null, urgency: 'Urgent', clinicalJustification: 'Symptomatic cholelithiasis with recurrent biliary colic', requestedBy: 'Dr. Chioma Eze' },
  { id: 'AUTH003', patientId: 'P003', patientName: 'Emeka Nwosu', payer: 'Reliance HMO', service: 'Specialist Referral – Cardiology', icdCode: 'I25.10', cptCode: '99243', requestDate: '2026-06-26', authNumber: null, status: 'DENIED', approvedDate: null, expiryDate: null, urgency: 'Routine', clinicalJustification: 'Hypertension not controlled on 2-drug regimen', requestedBy: 'Dr. Fatima Sule', denialReason: 'Not pre-authorized – requires GP referral first' },
];
let authCounter = 4;

const referrals: any[] = [
  { id: 'REF001', patientId: 'P001', patientName: 'Adaeze Okonkwo', referringProvider: 'Dr. Emeka Obi', referralType: 'Internal', specialty: 'Orthopaedics', facility: 'SmartHospital – Orthopaedics Dept', reason: 'Lumbar disc herniation management', urgency: 'Routine', status: 'ACCEPTED', referralDate: '2026-06-20', appointmentDate: '2026-06-28', completionDate: null },
  { id: 'REF002', patientId: 'P004', patientName: 'Grace Abubakar', referringProvider: 'Dr. Amaka Ike', referralType: 'External', specialty: 'Oncology', facility: 'LUTH – Oncology Department', reason: 'Suspicious breast lump – biopsy and specialist evaluation', urgency: 'Urgent', status: 'PENDING', referralDate: '2026-06-27', appointmentDate: null, completionDate: null },
];
let refCounter = 3;

const utilizationReviews: any[] = [
  { id: 'UR001', patientId: 'P005', patientName: 'Mohammed Bello', admissionDate: '2026-06-22', payer: 'NHIA', diagnosis: 'Severe Pneumonia', authorizedLOS: 5, actualLOS: 7, status: 'EXTENDED', extensionRequestDate: '2026-06-27', extensionApproved: true, reviewedBy: 'Nurse Aisha Garba', clinicalNotes: 'Patient still oxygen-dependent; extension approved for 3 more days' },
  { id: 'UR002', patientId: 'P006', patientName: 'Chinwe Okafor', admissionDate: '2026-06-25', payer: 'AXA Mansard HMO', diagnosis: 'Post-operative recovery – appendectomy', authorizedLOS: 3, actualLOS: 2, status: 'ON_TRACK', extensionRequestDate: null, extensionApproved: null, reviewedBy: 'Nurse Biola Adebayo', clinicalNotes: 'Recovering well; discharge planned tomorrow' },
];
let urCounter = 3;

// §16.3 – Claims lifecycle
const insuranceClaims: any[] = [
  { id: 'CLM001', claimNumber: 'CLM-2026-00101', patientId: 'P001', patientName: 'Adaeze Okonkwo', payer: 'AXA Mansard HMO', planType: 'HMO-Gold', serviceDate: '2026-06-01', submissionDate: '2026-06-05', totalAmount: 85000, approvedAmount: null, paidAmount: null, status: 'UNDER_REVIEW', adjudicationDate: null, denialReason: null, appealStatus: null, isDonorFunded: false, services: [{ code: 'CONSULT-SPEC', desc: 'Specialist Consultation', amount: 15000 }, { code: 'MRI-LUMBAR', desc: 'MRI Lumbar Spine', amount: 70000 }] },
  { id: 'CLM002', claimNumber: 'CLM-2026-00102', patientId: 'P002', patientName: 'Bola Adeyemi', payer: 'NHIA', planType: 'NHIA-Standard', serviceDate: '2026-06-08', submissionDate: '2026-06-10', totalAmount: 120000, approvedAmount: 108000, paidAmount: 108000, status: 'PAID', adjudicationDate: '2026-06-18', denialReason: null, appealStatus: null, isDonorFunded: false, services: [{ code: 'SURG-LAP', desc: 'Laparoscopic Procedure', amount: 120000 }] },
  { id: 'CLM003', claimNumber: 'CLM-2026-00103', patientId: 'P007', patientName: 'Tunde Fashola', payer: 'Reliance HMO', planType: 'HMO-Silver', serviceDate: '2026-06-12', submissionDate: '2026-06-14', totalAmount: 45000, approvedAmount: 0, paidAmount: 0, status: 'DENIED', adjudicationDate: '2026-06-20', denialReason: 'Service not covered under HMO-Silver plan', appealStatus: 'APPEAL_SUBMITTED', isDonorFunded: false, services: [{ code: 'XRAY-CHEST', desc: 'Chest X-Ray', amount: 8000 }, { code: 'ADMIT-MED', desc: 'Medical Admission', amount: 37000 }] },
  { id: 'CLM004', claimNumber: 'CLM-ART-2026-00001', patientId: 'P008', patientName: 'Anonymous', payer: 'CDC/CARITAS', planType: 'ART-Programme', serviceDate: '2026-06-15', submissionDate: '2026-06-15', totalAmount: 0, approvedAmount: 0, paidAmount: 0, status: 'APPROVED', adjudicationDate: '2026-06-15', denialReason: null, appealStatus: null, isDonorFunded: true, services: [{ code: 'ART-DRUGS', desc: 'ART Medications (Donor Funded)', amount: 0 }, { code: 'VL-TEST', desc: 'Viral Load Test (Donor Funded)', amount: 0 }] },
];
let claimCounter = 5;

// §16.4 – Contracts, Operations, Fraud
const payerContracts: any[] = [
  { id: 'CON001', payer: 'National Health Insurance Authority (NHIA)', type: 'NHIA', effectiveDate: '2026-01-01', expiryDate: '2026-12-31', status: 'ACTIVE', reimbursementSchedule: 'Monthly – 30 days net', serviceObligations: 'OPD, IPD, Emergency, Maternity, Immunization', creditLimit: 5000000, outstandingBalance: 843200, lastPaymentDate: '2026-06-15', lastPaymentAmount: 412000, contactPerson: 'Mrs. Ngozi Amadi', contactEmail: 'ngozi.amadi@nhia.gov.ng', version: 3, notes: 'Capitation + fee-for-service hybrid model' },
  { id: 'CON002', payer: 'AXA Mansard HMO', type: 'HMO', effectiveDate: '2026-01-01', expiryDate: '2026-12-31', status: 'ACTIVE', reimbursementSchedule: 'Bi-monthly – 45 days net', serviceObligations: 'OPD, IPD, Lab, Radiology, Pharmacy, Dental', creditLimit: 10000000, outstandingBalance: 1287500, lastPaymentDate: '2026-06-01', lastPaymentAmount: 650000, contactPerson: 'Mr. Chukwuemeka Obi', contactEmail: 'c.obi@axamansard.com', version: 2, notes: 'Panel provider since 2023; Gold & Silver plans' },
  { id: 'CON003', payer: 'Reliance HMO', type: 'HMO', effectiveDate: '2026-01-01', expiryDate: '2026-06-30', status: 'EXPIRING', reimbursementSchedule: 'Quarterly – 60 days net', serviceObligations: 'OPD, Lab, Pharmacy only', creditLimit: 3000000, outstandingBalance: 389000, lastPaymentDate: '2026-04-30', lastPaymentAmount: 195000, contactPerson: 'Aisha Hassan', contactEmail: 'a.hassan@reliancehmo.com', version: 1, notes: 'Contract renewal negotiations ongoing' },
  { id: 'CON004', payer: 'CDC/CARITAS (ART Programme)', type: 'DONOR', effectiveDate: '2026-01-01', expiryDate: '2026-12-31', status: 'ACTIVE', reimbursementSchedule: 'Quarterly grant disbursement', serviceObligations: 'HIV/ART Medications, VL Testing, CD4 Count, OI Treatment, Counselling', creditLimit: 999999999, outstandingBalance: 0, lastPaymentDate: '2026-04-01', lastPaymentAmount: 2400000, contactPerson: 'Dr. Ifunanya Okafor', contactEmail: 'i.okafor@caritasng.org', version: 1, notes: 'Donor-funded; zero patient billing; NigeriaMRS reporting required' },
];

const fraudAlerts: any[] = [
  { id: 'FRAUD001', type: 'Duplicate Claim', description: 'CLM-2026-00103 has a near-duplicate with CLM-2026-00089 (same patient, same service, 7-day gap)', severity: 'HIGH', status: 'UNDER_INVESTIGATION', raisedDate: '2026-06-22', investigatedBy: null },
  { id: 'FRAUD002', type: 'Excessive Override', description: '12 manual eligibility overrides by Officer ID USR-0044 in 5 days – exceeds threshold of 5', severity: 'MEDIUM', status: 'OPEN', raisedDate: '2026-06-25', investigatedBy: null },
  { id: 'FRAUD003', type: 'Donor Billing Violation', description: 'ART patient (P009) billed ₦45,000 for services that should be donor-funded', severity: 'CRITICAL', status: 'RESOLVED', raisedDate: '2026-06-15', investigatedBy: 'Insurance Manager' },
];

const riskRegister: any[] = [
  { id: 'RISK001', category: 'Contract', description: 'Reliance HMO contract expiring 2026-06-30; renewal not confirmed', severity: 'HIGH', owner: 'Contract Manager', mitigation: 'Schedule urgent renewal meeting; explore alternative HMO partnerships', reviewDate: '2026-06-30', status: 'OPEN' },
  { id: 'RISK002', category: 'Compliance', description: 'NHIA quarterly regulatory report overdue by 5 days', severity: 'MEDIUM', owner: 'Compliance Officer', mitigation: 'Compile and submit immediately; update submission calendar', reviewDate: '2026-07-05', status: 'IN_PROGRESS' },
  { id: 'RISK003', category: 'Financial', description: 'AXA outstanding balance ₦1.287M approaching credit limit of ₦10M at current burn rate', severity: 'LOW', owner: 'Finance Director', mitigation: 'Monitor monthly; trigger review if >50% of limit', reviewDate: '2026-07-31', status: 'OPEN' },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING PRISMA-BACKED ROUTES (preserved & enhanced)
// ─────────────────────────────────────────────────────────────────────────────

const providerSchema = z.object({ name: z.string().min(2), code: z.string().min(2), contactDetails: z.string().optional(), isActive: z.boolean().default(true) });
const policySchema = z.object({ patientId: z.string(), providerId: z.string(), planId: z.string(), membershipNumber: z.string().min(2), enrolleeNumber: z.string().optional().nullable(), effectiveDate: z.string(), expiryDate: z.string(), isPrimary: z.boolean().default(true), beneficiaryCategory: z.enum(['PRIMARY','SPOUSE','CHILD','DEPENDANT','OTHER']).default('PRIMARY'), employerName: z.string().optional() });

router.get('/providers', authMiddleware, async (req, res, next) => {
  try { res.json(await prisma.insuranceProvider.findMany({ include: { plans: true } })); } catch (e) { next(e); }
});

router.post('/providers', authMiddleware, async (req: any, res, next) => {
  try {
    const { name, code, contactDetails, isActive } = providerSchema.parse(req.body);
    const existing = await prisma.insuranceProvider.findUnique({ where: { code } });
    if (existing) return res.status(400).json({ message: 'Insurance provider code already exists' });
    const provider = await prisma.insuranceProvider.create({ data: { name, code, contactDetails, isActive } });
    await logAudit({ userId: req.user.userId, action: 'insurance.provider_create', resourceType: 'InsuranceProvider', resourceId: provider.id, ipAddress: req.ip, userAgent: req.headers['user-agent'], changes: { name, code } });
    res.status(201).json({ success: true, provider });
  } catch (e) { next(e); }
});

router.patch('/providers/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const provider = await prisma.insuranceProvider.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user.userId, action: 'insurance.provider_update', resourceType: 'InsuranceProvider', resourceId: provider.id, ipAddress: req.ip, userAgent: req.headers['user-agent'], changes: req.body });
    res.json({ success: true, provider });
  } catch (e) { next(e); }
});

router.post('/plans', authMiddleware, async (req: any, res, next) => {
  try {
    const { name, providerId, coverageDetails } = z.object({ name: z.string().min(2), providerId: z.string(), coverageDetails: z.any().optional() }).parse(req.body);
    const plan = await prisma.insuranceBenefitPlan.create({ data: { name, providerId, coverageDetails: (coverageDetails ? JSON.stringify(coverageDetails) : null) as any } });
    await logAudit({ userId: req.user.userId, action: 'insurance.plan_create', resourceType: 'InsuranceBenefitPlan', resourceId: plan.id, ipAddress: req.ip, userAgent: req.headers['user-agent'], changes: { name, providerId } });
    res.status(201).json({ success: true, plan });
  } catch (e) { next(e); }
});

router.get('/plans', authMiddleware, async (req, res, next) => {
  try { res.json(await prisma.insuranceBenefitPlan.findMany({ include: { provider: true } })); } catch (e) { next(e); }
});

router.post('/policies', authMiddleware, async (req: any, res, next) => {
  try {
    const data = policySchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const provider = await prisma.insuranceProvider.findUnique({ where: { id: data.providerId } });
    const plan = await prisma.insuranceBenefitPlan.findUnique({ where: { id: data.planId } });
    if (!provider || !plan) return res.status(404).json({ message: 'Insurance provider or Benefit plan not found' });
    // Duplicate check (FR-INS-004)
    const dupCheck = await prisma.patientInsurancePolicy.findFirst({ where: { patientId: data.patientId, providerId: data.providerId, isActive: true } });
    if (dupCheck) return res.status(400).json({ message: 'Duplicate enrolment: patient already has an active policy with this provider.' });
    if (data.isPrimary) await prisma.patientInsurancePolicy.updateMany({ where: { patientId: data.patientId }, data: { isPrimary: false } });
    const policy = await prisma.patientInsurancePolicy.create({ data: { patientId: data.patientId, providerId: data.providerId, planId: data.planId, membershipNumber: data.membershipNumber, enrolleeNumber: data.enrolleeNumber, effectiveDate: new Date(data.effectiveDate), expiryDate: new Date(data.expiryDate), isPrimary: data.isPrimary } });
    await logAudit({ userId: req.user.userId, action: 'insurance.policy_link', resourceType: 'PatientInsurancePolicy', resourceId: policy.id, ipAddress: req.ip, userAgent: req.headers['user-agent'], changes: { patientId: data.patientId, membershipNumber: data.membershipNumber } });
    res.status(201).json({ success: true, policy });
  } catch (e) { next(e); }
});

router.get('/policies', authMiddleware, async (req: any, res, next) => {
  try {
    const where: any = {};
    if (req.query.patientId) where.patientId = req.query.patientId;
    if (req.query.membershipNumber) where.membershipNumber = req.query.membershipNumber;
    if (req.query.enrolleeNumber) where.enrolleeNumber = req.query.enrolleeNumber;
    if (req.query.status === 'active') {
      where.isActive = true;
      where.expiryDate = { gte: new Date() };
    }
    const policies = await prisma.patientInsurancePolicy.findMany({
      where,
      include: { provider: true, plan: true, patient: true },
      orderBy: { effectiveDate: 'desc' },
      take: 100
    });
    res.json({ success: true, data: policies, total: policies.length });
  } catch (e) { next(e); }
});

router.patch('/policies/:id/suspend', authMiddleware, async (req: any, res, next) => {
  try {
    const policy = await prisma.patientInsurancePolicy.update({ where: { id: req.params.id }, data: { isActive: false } });
    await logAudit({ userId: req.user.userId, action: 'insurance.policy_suspend', resourceType: 'PatientInsurancePolicy', resourceId: policy.id, ipAddress: req.ip, userAgent: req.headers['user-agent'], changes: { reason: req.body.reason } });
    res.json({ success: true, policy });
  } catch (e) { next(e); }
});

router.patch('/policies/:id/reactivate', authMiddleware, async (req: any, res, next) => {
  try {
    const policy = await prisma.patientInsurancePolicy.update({ where: { id: req.params.id }, data: { isActive: true } });
    await logAudit({ userId: req.user.userId, action: 'insurance.policy_reactivate', resourceType: 'PatientInsurancePolicy', resourceId: policy.id, ipAddress: req.ip, userAgent: req.headers['user-agent'], changes: {} });
    res.json({ success: true, policy });
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.1 – BENEFIT PACKAGES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/benefit-packages', authMiddleware, (req: any, res) => {
  const { payerCode } = req.query;
  const data = payerCode ? benefitPackages.filter(bp => bp.payerCode === payerCode) : benefitPackages;
  res.json({ success: true, data, total: data.length });
});

router.post('/benefit-packages', authMiddleware, (req: any, res) => {
  const pkg = { id: `BP${String(bpCounter++).padStart(3,'0')}`, ...req.body, status: 'ACTIVE', version: 1, createdAt: new Date().toISOString() };
  benefitPackages.push(pkg);
  res.status(201).json({ success: true, data: pkg });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.1 – ELIGIBILITY VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

router.get('/verify/:patientId', authMiddleware, async (req, res, next) => {
  try {
    const { serviceType } = req.query;
    const patientId = req.params.patientId;
    const activePolicy = await prisma.patientInsurancePolicy.findFirst({
      where: { patientId, isActive: true, expiryDate: { gte: new Date() }, effectiveDate: { lte: new Date() } },
      include: { provider: true, plan: true },
    });
    if (!activePolicy) return res.json({ eligible: false, message: 'No active health insurance policy found.', verificationDate: new Date().toISOString() });
    let covered = true, copayPct = 0, coveragePct = 100;
    if (activePolicy.plan.coverageDetails) {
      const details = typeof activePolicy.plan.coverageDetails === 'string' ? JSON.parse(activePolicy.plan.coverageDetails) : (activePolicy.plan.coverageDetails as any);
      if (serviceType && typeof serviceType === 'string') {
        const ruleVal = details[serviceType.toLowerCase()];
        if (ruleVal !== undefined) { const pct = parseFloat(ruleVal); coveragePct = pct; copayPct = 100 - pct; covered = pct > 0; }
      }
    }
    res.json({ eligible: true, provider: activePolicy.provider.name, planName: activePolicy.plan.name, membershipNumber: activePolicy.membershipNumber, enrolleeNumber: activePolicy.enrolleeNumber, effectiveDate: activePolicy.effectiveDate, expiryDate: activePolicy.expiryDate, covered, copayPct, coveragePct, verificationDate: new Date().toISOString(), policyId: activePolicy.id });
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.2 – PRE-AUTHORIZATIONS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/authorizations', authMiddleware, (req: any, res) => {
  const { status, payer } = req.query;
  let data = [...authorizations];
  if (status) data = data.filter(a => a.status === status);
  if (payer) data = data.filter(a => a.payer === payer);
  res.json({ success: true, data, total: data.length });
});

router.post('/authorizations', authMiddleware, (req: any, res) => {
  const auth = {
    id: `AUTH${String(authCounter++).padStart(3,'0')}`,
    ...req.body,
    status: 'PENDING',
    authNumber: null,
    approvedDate: null,
    expiryDate: null,
    denialReason: null,
    submittedAt: new Date().toISOString(),
    submittedBy: req.user?.userId,
  };
  authorizations.push(auth);
  res.status(201).json({ success: true, data: auth });
});

router.patch('/authorizations/:id/decision', authMiddleware, (req: any, res) => {
  const auth = authorizations.find(a => a.id === req.params.id);
  if (!auth) return res.status(404).json({ message: 'Authorization not found' });
  const { status, authNumber, approvedDate, expiryDate, denialReason } = req.body;
  Object.assign(auth, { status, authNumber: authNumber || null, approvedDate: approvedDate || null, expiryDate: expiryDate || null, denialReason: denialReason || null, decidedAt: new Date().toISOString() });
  res.json({ success: true, data: auth });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.2 – REFERRALS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/referrals', authMiddleware, (req: any, res) => {
  const { status } = req.query;
  const data = status ? referrals.filter(r => r.status === status) : referrals;
  res.json({ success: true, data, total: data.length });
});

router.post('/referrals', authMiddleware, (req: any, res) => {
  const ref = { id: `REF${String(refCounter++).padStart(3,'0')}`, ...req.body, status: 'PENDING', referralDate: new Date().toISOString().split('T')[0], createdBy: req.user?.userId };
  referrals.push(ref);
  res.status(201).json({ success: true, data: ref });
});

router.patch('/referrals/:id/status', authMiddleware, (req: any, res) => {
  const ref = referrals.find(r => r.id === req.params.id);
  if (!ref) return res.status(404).json({ message: 'Referral not found' });
  Object.assign(ref, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: ref });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.2 – UTILIZATION REVIEWS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/utilization-reviews', authMiddleware, (req: any, res) => {
  res.json({ success: true, data: utilizationReviews, total: utilizationReviews.length });
});

router.post('/utilization-reviews', authMiddleware, (req: any, res) => {
  const ur = { id: `UR${String(urCounter++).padStart(3,'0')}`, ...req.body, status: 'UNDER_REVIEW', createdAt: new Date().toISOString() };
  utilizationReviews.push(ur);
  res.status(201).json({ success: true, data: ur });
});

router.patch('/utilization-reviews/:id', authMiddleware, (req: any, res) => {
  const ur = utilizationReviews.find(u => u.id === req.params.id);
  if (!ur) return res.status(404).json({ message: 'Utilization review not found' });
  Object.assign(ur, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: ur });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.3 – INSURANCE CLAIMS LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

router.get('/claims', authMiddleware, (req: any, res) => {
  const { status, payer, isDonorFunded } = req.query;
  let data = [...insuranceClaims];
  if (status) data = data.filter(c => c.status === status);
  if (payer) data = data.filter(c => c.payer === payer);
  if (isDonorFunded !== undefined) data = data.filter(c => c.isDonorFunded === (isDonorFunded === 'true'));
  res.json({ success: true, data, total: data.length });
});

router.post('/claims', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, policyId, encounterId, totalAmount } = z.object({ patientId: z.string(), policyId: z.string(), encounterId: z.string().optional().nullable(), totalAmount: z.number() }).parse(req.body);

    // Donor-funded check (BR-ICLM-005)
    const isDonorFunded = req.body.isDonorFunded === true;
    if (!isDonorFunded) {
      const claim = await prisma.claim.create({ data: { patientId, policyId, encounterId: encounterId || null, totalAmount, status: 'SUBMITTED' } });
      await logAudit({ userId: req.user.userId, action: 'insurance.claim_create', resourceType: 'Claim', resourceId: claim.id, ipAddress: req.ip, userAgent: req.headers['user-agent'], changes: { totalAmount, policyId } });
    }

    const claimNum = `CLM-${new Date().getFullYear()}-${String(claimCounter).padStart(5,'0')}`;
    const newClaim = {
      id: `CLM${String(claimCounter++).padStart(3,'0')}`,
      claimNumber: claimNum,
      patientId, policyId,
      ...req.body,
      isDonorFunded,
      status: 'SUBMITTED',
      submissionDate: new Date().toISOString().split('T')[0],
      submittedBy: req.user?.userId,
    };
    insuranceClaims.push(newClaim);
    res.status(201).json({ success: true, data: newClaim });
  } catch (e) { next(e); }
});

router.patch('/claims/:id/adjudicate', authMiddleware, (req: any, res) => {
  const claim = insuranceClaims.find(c => c.id === req.params.id);
  if (!claim) return res.status(404).json({ message: 'Claim not found' });
  const { status, approvedAmount, denialReason } = req.body;
  // Validation: donor-funded claims cannot be submitted for insurance reimbursement
  if (claim.isDonorFunded && status === 'APPROVED') return res.status(400).json({ message: 'Donor-funded services cannot be approved for insurance reimbursement (BR-ICLM-005)' });
  Object.assign(claim, { status, approvedAmount: approvedAmount || 0, denialReason: denialReason || null, adjudicationDate: new Date().toISOString().split('T')[0], adjudicatedBy: req.user?.userId });
  res.json({ success: true, data: claim });
});

router.patch('/claims/:id/appeal', authMiddleware, (req: any, res) => {
  const claim = insuranceClaims.find(c => c.id === req.params.id);
  if (!claim) return res.status(404).json({ message: 'Claim not found' });
  if (claim.status !== 'DENIED') return res.status(400).json({ message: 'Only denied claims can be appealed' });
  claim.appealStatus = 'APPEAL_SUBMITTED';
  claim.appealDate = new Date().toISOString().split('T')[0];
  claim.appealJustification = req.body.justification;
  res.json({ success: true, data: claim });
});

router.patch('/claims/:id/payment', authMiddleware, (req: any, res) => {
  const claim = insuranceClaims.find(c => c.id === req.params.id);
  if (!claim) return res.status(404).json({ message: 'Claim not found' });
  claim.paidAmount = req.body.paidAmount;
  claim.paymentDate = new Date().toISOString().split('T')[0];
  claim.paymentReference = req.body.paymentReference;
  claim.status = 'PAID';
  res.json({ success: true, data: claim });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.4 – PAYER CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/contracts', authMiddleware, (req: any, res) => {
  res.json({ success: true, data: payerContracts, total: payerContracts.length });
});

router.post('/contracts', authMiddleware, (req: any, res) => {
  const contract = { id: `CON${String(payerContracts.length + 1).padStart(3,'0')}`, ...req.body, status: 'ACTIVE', version: 1, createdAt: new Date().toISOString() };
  payerContracts.push(contract);
  res.status(201).json({ success: true, data: contract });
});

router.patch('/contracts/:id', authMiddleware, (req: any, res) => {
  const con = payerContracts.find(c => c.id === req.params.id);
  if (!con) return res.status(404).json({ message: 'Contract not found' });
  con.version = (con.version || 1) + 1;
  Object.assign(con, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: con });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.4 – FRAUD DETECTION & RISK REGISTER
// ─────────────────────────────────────────────────────────────────────────────

router.get('/fraud-alerts', authMiddleware, (req: any, res) => {
  res.json({ success: true, data: fraudAlerts, total: fraudAlerts.length });
});

router.patch('/fraud-alerts/:id', authMiddleware, (req: any, res) => {
  const alert = fraudAlerts.find(f => f.id === req.params.id);
  if (!alert) return res.status(404).json({ message: 'Alert not found' });
  Object.assign(alert, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: alert });
});

router.get('/risk-register', authMiddleware, (req: any, res) => {
  res.json({ success: true, data: riskRegister, total: riskRegister.length });
});

router.post('/risk-register', authMiddleware, (req: any, res) => {
  const risk = { id: `RISK${String(riskRegister.length + 1).padStart(3,'0')}`, ...req.body, createdAt: new Date().toISOString() };
  riskRegister.push(risk);
  res.status(201).json({ success: true, data: risk });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.4 – EXECUTIVE ANALYTICS & REPORTS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics/summary', authMiddleware, async (req: any, res, next) => {
  try {
    const now = new Date();
    // Claims analytics
    const totalClaims = insuranceClaims.length;
    const paidClaims = insuranceClaims.filter(c => c.status === 'PAID');
    const deniedClaims = insuranceClaims.filter(c => c.status === 'DENIED');
    const pendingClaims = insuranceClaims.filter(c => ['SUBMITTED','UNDER_REVIEW'].includes(c.status));
    const totalBilled = insuranceClaims.reduce((s, c) => s + (c.totalAmount || 0), 0);
    const totalCollected = insuranceClaims.reduce((s, c) => s + (c.paidAmount || 0), 0);
    const denialRate = totalClaims > 0 ? ((deniedClaims.length / totalClaims) * 100).toFixed(1) : '0.0';
    // Active enrolments
    let activeEnrolments = 0;
    try { activeEnrolments = await prisma.patientInsurancePolicy.count({ where: { isActive: true, expiryDate: { gte: now } } }); } catch (_) {}
    // Expiring policies (next 30 days)
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let expiringPolicies = 0;
    try { expiringPolicies = await prisma.patientInsurancePolicy.count({ where: { isActive: true, expiryDate: { gte: now, lte: in30 } } }); } catch (_) {}
    // Contract outstanding
    const totalOutstanding = payerContracts.reduce((s, c) => s + (c.outstandingBalance || 0), 0);
    // Payer mix
    const payerMix = payerContracts.map(c => ({
      payer: c.payer.split(' ')[0],
      claims: insuranceClaims.filter(cl => cl.payer.includes(c.payer.split(' ')[0])).length,
      outstanding: c.outstandingBalance,
    }));
    res.json({ success: true, data: { totalClaims, paidClaims: paidClaims.length, deniedClaims: deniedClaims.length, pendingClaims: pendingClaims.length, totalBilled, totalCollected, denialRate, activeEnrolments, expiringPolicies, totalOutstanding, payerMix, openFraudAlerts: fraudAlerts.filter(f => f.status !== 'RESOLVED').length, highRisks: riskRegister.filter(r => r.severity === 'HIGH' && r.status !== 'CLOSED').length, pendingAuthorizations: authorizations.filter(a => a.status === 'PENDING').length, pendingReferrals: referrals.filter(r => r.status === 'PENDING').length } });
  } catch (e) { next(e); }
});

router.get('/analytics/reports', authMiddleware, async (req: any, res, next) => {
  try {
    const type = req.query.type as string;
    if (type === 'active-beneficiaries') {
      let policies: any[] = [];
      try { policies = await prisma.patientInsurancePolicy.findMany({ where: { isActive: true }, include: { provider: true, plan: true }, take: 50 }); } catch (_) {}
      return res.json({ success: true, reportName: 'Active Beneficiary Register', data: policies });
    }
    if (type === 'claims-submission') {
      const summary = { totalClaims: insuranceClaims.length, submitted: insuranceClaims.filter(c => c.status === 'SUBMITTED').length, underReview: insuranceClaims.filter(c => c.status === 'UNDER_REVIEW').length, approved: insuranceClaims.filter(c => c.status === 'APPROVED').length, paid: insuranceClaims.filter(c => c.status === 'PAID').length, denied: insuranceClaims.filter(c => c.status === 'DENIED').length, firstPassRate: '66.7%', claims: insuranceClaims };
      return res.json({ success: true, reportName: 'Claims Submission Report', data: summary });
    }
    if (type === 'benefit-utilization') {
      const data = benefitPackages.map(bp => ({ ...bp, utilizationPct: Math.floor(Math.random() * 70) + 10, claimsCount: insuranceClaims.filter(c => c.payer.includes(bp.payerCode)).length }));
      return res.json({ success: true, reportName: 'Benefit Utilization Report', data });
    }
    if (type === 'expiring-policies') {
      const in30 = new Date(Date.now() + 30 * 86400000);
      let data: any[] = [];
      try { data = await prisma.patientInsurancePolicy.findMany({ where: { isActive: true, expiryDate: { gte: new Date(), lte: in30 } }, include: { provider: true, plan: true } }); } catch (_) {}
      return res.json({ success: true, reportName: 'Expiring Policy Report', data });
    }
    if (type === 'payer-distribution') {
      const data = payerContracts.map(c => ({ payer: c.payer, type: c.type, claims: insuranceClaims.filter(cl => cl.payer.includes(c.payer.split(' ')[0])).length, totalBilled: insuranceClaims.filter(cl => cl.payer.includes(c.payer.split(' ')[0])).reduce((s, cl) => s + (cl.totalAmount || 0), 0), outstanding: c.outstandingBalance }));
      return res.json({ success: true, reportName: 'Payer Distribution Report', data });
    }
    if (type === 'donor-programme') {
      const donorClaims = insuranceClaims.filter(c => c.isDonorFunded);
      return res.json({ success: true, reportName: 'Donor Programme Eligibility Coordination Report', data: { donorClaims, totalDonorClaims: donorClaims.length, patientsBilledInError: fraudAlerts.filter(f => f.type === 'Donor Billing Violation').length, coordinatingOrg: 'NigeriaMRS', programmes: ['CDC/CARITAS ART Programme'], note: 'Donor-funded services excluded from insurance reimbursement per BR-INS-005 / BR-ICLM-005' } });
    }
    if (type === 'authorization-status') {
      return res.json({ success: true, reportName: 'Prior Authorization Status Report', data: { total: authorizations.length, pending: authorizations.filter(a => a.status === 'PENDING').length, approved: authorizations.filter(a => a.status === 'APPROVED').length, denied: authorizations.filter(a => a.status === 'DENIED').length, approvalRate: '33%', avgTurnaroundDays: 2.5, authorizations } });
    }
    if (type === 'contract-performance') {
      return res.json({ success: true, reportName: 'Payer Contract Performance Report', data: payerContracts });
    }
    if (type === 'fraud-monitoring') {
      return res.json({ success: true, reportName: 'Fraud Monitoring Report', data: { alerts: fraudAlerts, totalAlerts: fraudAlerts.length, critical: fraudAlerts.filter(f => f.severity === 'CRITICAL').length, resolved: fraudAlerts.filter(f => f.status === 'RESOLVED').length } });
    }
    if (type === 'risk-register') {
      return res.json({ success: true, reportName: 'Insurance Risk Register Report', data: riskRegister });
    }
    res.json({ success: true, reportName: 'Enterprise Insurance BI Dashboard', data: { claims: insuranceClaims, authorizations, referrals, contracts: payerContracts, fraudAlerts, riskRegister, benefitPackages } });
  } catch (e) { next(e); }
});

// Patients lookup for policy linking
router.get('/patients-lookup', authMiddleware, async (req: any, res, next) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query || query.length < 2) return res.json({ success: true, data: [] });
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { patientNumber: { contains: query } }
        ]
      },
      take: 20,
      select: { id: true, firstName: true, lastName: true, patientNumber: true, birthDate: true }
    });
    res.json({ success: true, data: patients });
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// BENEFIT CATALOG — per plan covered service items
// ─────────────────────────────────────────────────────────────────────────────

router.get('/plans/:planId/catalog', authMiddleware, async (req, res, next) => {
  try {
    const items = await prisma.insuranceBenefitCatalogItem.findMany({
      where: { planId: req.params.planId },
      orderBy: [{ serviceCategory: 'asc' }, { serviceName: 'asc' }],
    });
    res.json({ success: true, data: items });
  } catch (e) { next(e); }
});

router.post('/plans/:planId/catalog', authMiddleware, async (req: any, res, next) => {
  try {
    const schema = z.object({
      serviceCode: z.string().min(1),
      serviceName: z.string().min(2),
      serviceCategory: z.string(),
      coverageType: z.enum(['FULL', 'PARTIAL', 'EXCLUDED']),
      coveragePct: z.number().min(0).max(100).default(100),
      maxAmount: z.number().nonnegative().optional().nullable(),
      requiresPreAuth: z.boolean().default(false),
      notes: z.string().optional().nullable(),
    });
    const data = schema.parse(req.body);
    const item = await prisma.insuranceBenefitCatalogItem.upsert({
      where: { planId_serviceCode: { planId: req.params.planId, serviceCode: data.serviceCode } },
      create: { ...data, planId: req.params.planId, maxAmount: data.maxAmount as any },
      update: { ...data, maxAmount: data.maxAmount as any },
    });
    await logAudit({ userId: req.user.userId, action: 'insurance.catalog.upsert', resourceType: 'InsuranceBenefitCatalogItem', resourceId: item.id, changes: data });
    res.status(201).json({ success: true, data: item });
  } catch (e) { next(e); }
});

router.put('/catalog/:itemId', authMiddleware, async (req: any, res, next) => {
  try {
    const schema = z.object({
      serviceName: z.string().min(2).optional(),
      serviceCategory: z.string().optional(),
      coverageType: z.enum(['FULL', 'PARTIAL', 'EXCLUDED']).optional(),
      coveragePct: z.number().min(0).max(100).optional(),
      maxAmount: z.number().nonnegative().optional().nullable(),
      requiresPreAuth: z.boolean().optional(),
      notes: z.string().optional().nullable(),
    });
    const data = schema.parse(req.body);
    const item = await prisma.insuranceBenefitCatalogItem.update({
      where: { id: req.params.itemId },
      data: { ...data, maxAmount: data.maxAmount as any },
    });
    res.json({ success: true, data: item });
  } catch (e) { next(e); }
});

router.delete('/catalog/:itemId', authMiddleware, async (req, res, next) => {
  try {
    await prisma.insuranceBenefitCatalogItem.delete({ where: { id: req.params.itemId } });
    res.json({ success: true, message: 'Catalog item removed' });
  } catch (e) { next(e); }
});

// Coverage check: given a patient + service code, what is covered?
router.get('/coverage-check', authMiddleware, async (req, res, next) => {
  try {
    const { patientId, serviceCode, serviceCategory } = req.query as any;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });

    // Get active policy
    const policy = await prisma.patientInsurancePolicy.findFirst({
      where: { patientId, isActive: true, expiryDate: { gte: new Date() }, effectiveDate: { lte: new Date() } },
      include: { provider: true, plan: { include: { catalogItems: true } } },
    });

    if (!policy) {
      return res.json({
        hasCoverage: false,
        message: 'No active insurance policy found for this patient.',
        patientId,
      });
    }

    const catalogItems = (policy.plan as any).catalogItems || [];

    let specificItem = null;
    if (serviceCode) {
      specificItem = catalogItems.find((i: any) => i.serviceCode === serviceCode);
    }
    if (!specificItem && serviceCategory) {
      specificItem = catalogItems.find((i: any) => i.serviceCategory.toLowerCase() === serviceCategory.toLowerCase() && i.coverageType !== 'EXCLUDED');
    }

    const result = {
      hasCoverage: true,
      policyId: policy.id,
      providerName: policy.provider.name,
      planName: policy.plan.name,
      membershipNumber: policy.membershipNumber,
      expiryDate: policy.expiryDate,
      copayPercentage: (policy.plan as any).copayPercentage || 0,
      maxAnnualLimit: (policy.plan as any).maxAnnualLimit || null,
      serviceResult: specificItem ? {
        serviceCode: specificItem.serviceCode,
        serviceName: specificItem.serviceName,
        coverageType: specificItem.coverageType,
        coveragePct: specificItem.coveragePct,
        maxAmount: specificItem.maxAmount,
        requiresPreAuth: specificItem.requiresPreAuth,
        notes: specificItem.notes,
      } : null,
      coveredCategories: [...new Set(catalogItems.filter((i: any) => i.coverageType !== 'EXCLUDED').map((i: any) => i.serviceCategory))],
      excludedCategories: [...new Set(catalogItems.filter((i: any) => i.coverageType === 'EXCLUDED').map((i: any) => i.serviceCategory))],
    };

    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

// Get full insurance summary for a patient (for patient profile)
router.get('/patient-summary/:patientId', authMiddleware, async (req, res, next) => {
  try {
    const policies = await prisma.patientInsurancePolicy.findMany({
      where: { patientId: req.params.patientId },
      include: {
        provider: true,
        plan: { include: { catalogItems: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { effectiveDate: 'desc' }],
    });
    res.json({ success: true, data: policies });
  } catch (e) { next(e); }
});

// Update plan financial details
router.patch('/plans/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      maxAnnualLimit: z.number().nonnegative().optional().nullable(),
      copayPercentage: z.number().min(0).max(100).optional(),
      deductibleAmount: z.number().nonnegative().optional().nullable(),
      coverageNotes: z.string().optional().nullable(),
    });
    const data = schema.parse(req.body);
    const plan = await prisma.insuranceBenefitPlan.update({
      where: { id: req.params.id },
      data: { ...data, maxAnnualLimit: data.maxAnnualLimit as any, deductibleAmount: data.deductibleAmount as any },
    });
    res.json({ success: true, data: plan });
  } catch (e) { next(e); }
});

export default router;

