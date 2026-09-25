import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';
import { prisma } from '../prisma.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// §16.0 – HEALTH INSURANCE SCHEMES CONFIGURATION & SEEDING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface SchemeConfig {
  id?: string;
  code: string;
  name: string;
  shortName: string;
  category: 'STATUTORY_FEDERAL' | 'STATE_STATUTORY' | 'MUTUAL_HEALTH_AGENCY' | 'DIOCESAN_FAITH_BASED' | 'PRIVATE_HMO' | 'CORPORATE';
  badge: string;
  color: string;
  contactPerson?: string;
  contactDetails: string;
  phone?: string;
  email?: string;
  portalUrl?: string;
  externalDatabaseUrl?: string;
  description: string;
  defaultCapitationRate: number;
  defaultCopayPercentage: number;
  accreditedStatus: 'ACCREDITED' | 'PROVISIONAL' | 'RENEWAL_DUE';
  accreditationExpiry?: string;
  requiresPreAuthForSpecialist: boolean;
  requiresPreAuthForSurgery: boolean;
  requiresPreAuthForScans: boolean;
  requiresPreAuthForSpecialLabs: boolean;
  isActive: boolean;
  plans: {
    id?: string;
    name: string;
    maxAnnualLimit: number;
    copayPercentage: number;
    deductibleAmount: number;
    coverageDetails?: any;
    coverageNotes?: string;
  }[];
}

export const DEFAULT_SCHEMES: SchemeConfig[] = [
  {
    code: 'NHIA',
    name: 'National Health Insurance Authority (NHIA / NHIS)',
    shortName: 'NHIA (National)',
    category: 'STATUTORY_FEDERAL',
    badge: 'Federal Statutory',
    color: '#16a34a',
    contactPerson: 'Zonal Coordinator (SE Zonal Office)',
    contactDetails: 'enquiries@nhia.gov.ng · 0800-CALL-NHIA',
    phone: '0800-2255-6442',
    email: 'enquiries@nhia.gov.ng',
    portalUrl: 'https://nhia.gov.ng/portal',
    description: 'Federal statutory health insurance program for formal, informal, and vulnerable populations across Nigeria.',
    defaultCapitationRate: 750,
    defaultCopayPercentage: 10,
    accreditedStatus: 'ACCREDITED',
    accreditationExpiry: '2027-12-31',
    requiresPreAuthForSpecialist: false,
    requiresPreAuthForSurgery: true,
    requiresPreAuthForScans: true,
    requiresPreAuthForSpecialLabs: true,
    isActive: true,
    plans: [
      { name: 'Formal Sector Social Health Insurance Plan (FSSHIPP)', maxAnnualLimit: 1500000, copayPercentage: 10, deductibleAmount: 0 },
      { name: 'Group, Individual & Family Social Health Insurance (GIFSHIP)', maxAnnualLimit: 800000, copayPercentage: 10, deductibleAmount: 0 },
      { name: 'Basic Health Care Provision Fund (BHCPF - Vulnerable)', maxAnnualLimit: 500000, copayPercentage: 0, deductibleAmount: 0 },
      { name: 'Tertiary Institution Social Health Insurance Plan (TISHIP)', maxAnnualLimit: 600000, copayPercentage: 10, deductibleAmount: 0 },
    ],
  },
  {
    code: 'ESAUHC',
    name: 'Enugu State Agency for Universal Health Coverage',
    shortName: 'ESAUHC (Enugu State)',
    category: 'STATE_STATUTORY',
    badge: 'State Statutory',
    color: '#0d9488',
    contactPerson: 'Executive Secretary / Desk Officer',
    contactDetails: 'coverage@enugustate.gov.ng · 042-255-ESAUHC',
    phone: '042-255-3728',
    email: 'coverage@enugustate.gov.ng',
    portalUrl: 'https://esauhc.en.gov.ng',
    description: 'Enugu State Government Universal Health Coverage Agency for state civil servants, LGA workers, and state residents.',
    defaultCapitationRate: 850,
    defaultCopayPercentage: 10,
    accreditedStatus: 'ACCREDITED',
    accreditationExpiry: '2027-11-30',
    requiresPreAuthForSpecialist: false,
    requiresPreAuthForSurgery: true,
    requiresPreAuthForScans: true,
    requiresPreAuthForSpecialLabs: true,
    isActive: true,
    plans: [
      { name: 'Enugu State Formal Sector Civil Servants Plan', maxAnnualLimit: 1200000, copayPercentage: 10, deductibleAmount: 0 },
      { name: 'Enugu State Informal & Community Equity Scheme', maxAnnualLimit: 600000, copayPercentage: 5, deductibleAmount: 0 },
      { name: 'Enugu State Maternal & Child Healthcare Window', maxAnnualLimit: 750000, copayPercentage: 0, deductibleAmount: 0 },
    ],
  },
  {
    code: 'CHIKADIBIA',
    name: 'Chikadibia Mutual Health Agency',
    shortName: 'Chikadibia Mutual',
    category: 'MUTUAL_HEALTH_AGENCY',
    badge: 'Mutual Agency',
    color: '#ea580c',
    contactPerson: 'Scheme Administrator & Liaison Officer',
    contactDetails: 'admin@chikadibia-mutual.org · 0803-CHIKADIBIA',
    phone: '0803-456-7890',
    email: 'admin@chikadibia-mutual.org',
    portalUrl: 'https://portal.chikadibia-mutual.org',
    description: 'Community-based mutual health insurance agency providing micro-health risk pooling and community healthcare access.',
    defaultCapitationRate: 600,
    defaultCopayPercentage: 10,
    accreditedStatus: 'ACCREDITED',
    accreditationExpiry: '2027-09-30',
    requiresPreAuthForSpecialist: true,
    requiresPreAuthForSurgery: true,
    requiresPreAuthForScans: true,
    requiresPreAuthForSpecialLabs: true,
    isActive: true,
    plans: [
      { name: 'Chikadibia Community Primary Health Package', maxAnnualLimit: 400000, copayPercentage: 10, deductibleAmount: 0 },
      { name: 'Chikadibia Family Extended Shield', maxAnnualLimit: 750000, copayPercentage: 15, deductibleAmount: 0 },
      { name: 'Chikadibia Micro-Enterprise Group Plan', maxAnnualLimit: 500000, copayPercentage: 10, deductibleAmount: 0 },
    ],
  },
  {
    code: 'NDMHS',
    name: 'Nsukka Diocesan Mutual Health Scheme',
    shortName: 'Nsukka Diocesan Scheme',
    category: 'DIOCESAN_FAITH_BASED',
    badge: 'Diocesan Faith Scheme',
    color: '#7c3aed',
    contactPerson: 'Diocesan Health Coordinator / Rev. Fr. Director',
    contactDetails: 'healthcommission@nsukkadiocese.org · 0806-NSUKKA-MHS',
    phone: '0806-789-0123',
    email: 'healthcommission@nsukkadiocese.org',
    portalUrl: 'https://health.nsukkadiocese.org',
    description: 'Faith-based diocesan health maintenance scheme for clergy, religious communities, catholic school teachers, and parishioners.',
    defaultCapitationRate: 500,
    defaultCopayPercentage: 10,
    accreditedStatus: 'ACCREDITED',
    accreditationExpiry: '2028-06-30',
    requiresPreAuthForSpecialist: false,
    requiresPreAuthForSurgery: true,
    requiresPreAuthForScans: true,
    requiresPreAuthForSpecialLabs: true,
    isActive: true,
    plans: [
      { name: 'Diocesan Clergy, Religious & Seminary Staff Plan', maxAnnualLimit: 1000000, copayPercentage: 0, deductibleAmount: 0 },
      { name: 'Catholic Schools, Parishes & Institutions Staff Plan', maxAnnualLimit: 600000, copayPercentage: 10, deductibleAmount: 0 },
      { name: 'Parishioners Mutual Solidarity Health Scheme', maxAnnualLimit: 450000, copayPercentage: 10, deductibleAmount: 0 },
    ],
  },
];

// Helper to seed schemes & link real hospital patients into the insurance registry
let hasSeededInitially = false;
async function ensureDatabaseSeeded() {
  if (hasSeededInitially) return;
  try {
    // 1. Seed or update providers & plans
    for (const scheme of DEFAULT_SCHEMES) {
      const dbProv = await prisma.insuranceProvider.upsert({
        where: { code: scheme.code },
        update: {
          name: scheme.name,
          contactDetails: scheme.contactDetails,
          isActive: scheme.isActive,
        },
        create: {
          name: scheme.name,
          code: scheme.code,
          contactDetails: scheme.contactDetails,
          isActive: scheme.isActive,
        },
      });

      for (const p of scheme.plans) {
        const existingPlan = await prisma.insuranceBenefitPlan.findFirst({
          where: { providerId: dbProv.id, name: p.name }
        });
        if (!existingPlan) {
          await prisma.insuranceBenefitPlan.create({
            data: {
              name: p.name,
              providerId: dbProv.id,
              maxAnnualLimit: p.maxAnnualLimit as any,
              copayPercentage: p.copayPercentage,
              deductibleAmount: p.deductibleAmount as any,
              coverageDetails: JSON.stringify({
                consultation: 100,
                laboratory: 90,
                radiology: 85,
                medications: 90,
                surgery: 80,
                maternity: 100,
                admission: 80,
              }),
            }
          });
        }
      }
    }

    // 2. Link registered hospital patients into PatientInsurancePolicy if count is low
    const policyCount = await prisma.patientInsurancePolicy.count();
    if (policyCount < 20) {
      const hospitalPatients = await prisma.patient.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
      });

      const providers = await prisma.insuranceProvider.findMany({
        include: { plans: true }
      });

      if (providers.length > 0 && hospitalPatients.length > 0) {
        for (let i = 0; i < hospitalPatients.length; i++) {
          const patient = hospitalPatients[i];
          const provider = providers[i % providers.length];
          const plan = provider.plans[0] || provider.plans[i % provider.plans.length];

          if (!plan) continue;

          const membershipNumber = `${provider.code}/POL/${patient.patientNumber || String(10000 + i)}`;
          const existing = await prisma.patientInsurancePolicy.findFirst({
            where: { patientId: patient.id }
          });

          if (!existing) {
            await prisma.patientInsurancePolicy.create({
              data: {
                patientId: patient.id,
                providerId: provider.id,
                planId: plan.id,
                membershipNumber,
                enrolleeNumber: `EN-${provider.code}-${String(1000 + i)}`,
                effectiveDate: new Date(2026, 0, 1),
                expiryDate: new Date(2027, 11, 31),
                isActive: true,
                isPrimary: true,
              }
            }).catch(() => {});
          }
        }
      }
    }
    // 3. Link real claims into PostgreSQL claims table if count is low
    const claimCount = await prisma.claim.count();
    if (claimCount < 10) {
      const dbPolicies = await prisma.patientInsurancePolicy.findMany({
        include: { provider: true, plan: true, patient: true },
        take: 30,
      });

      const sampleServices = [
        { amount: 175000, approved: 157500, status: 'APPROVED' },
        { amount: 125000, approved: 112500, status: 'PAID' },
        { amount: 220000, approved: 0, status: 'SUBMITTED' },
        { amount: 48000, approved: 43200, status: 'APPROVED' },
        { amount: 85000, approved: 76500, status: 'APPROVED' },
        { amount: 195000, approved: 0, status: 'IN_PROGRESS' },
        { amount: 32000, approved: 28800, status: 'APPROVED' },
        { amount: 110000, approved: 0, status: 'SUBMITTED' },
        { amount: 42000, approved: 37800, status: 'APPROVED' },
        { amount: 65000, approved: 58500, status: 'PAID' },
        { amount: 140000, approved: 0, status: 'PENDING' },
        { amount: 55000, approved: 0, status: 'REJECTED' },
      ];

      for (let i = 0; i < dbPolicies.length; i++) {
        const pol = dbPolicies[i];
        const s = sampleServices[i % sampleServices.length];
        await prisma.claim.create({
          data: {
            patientId: pol.patientId,
            policyId: pol.id,
            status: s.status,
            totalAmount: s.amount,
            approvedAmount: s.approved,
            createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000 * 1.5)),
          }
        }).catch(() => {});
      }
    }

    hasSeededInitially = true;
  } catch (err) {
    console.error('Insurance database auto-seeding error:', err);
  }
}

// Trigger initial seed
ensureDatabaseSeeded();

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONAL STORES (Verification Calls, Capitation Ledger, FFS Claims, PA Codes)
// ─────────────────────────────────────────────────────────────────────────────

// External Scheme Phone / Portal Verification Desk Logs
export let externalVerificationLogs: any[] = [
  {
    id: 'VER-2026-001',
    patientId: 'pat-real-001',
    patientName: 'Mrs. Chioma Ezechukwu',
    folderNumber: '107T6',
    schemeCode: 'NHIA',
    schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
    callReferenceCode: 'NHIA-CALL-78923',
    hmoOfficerName: 'Dr. Chika Okafor (NHIA Desk Officer)',
    hmoOfficerPhone: '0803-555-0192',
    channel: 'PHONE_CALL',
    verificationTime: '2026-09-24T10:15:00Z',
    verifiedStatus: 'FULLY_COVERED',
    verifiedServices: [
      { category: 'LABORATORY', item: 'Full Blood Count & Electrolytes', isCovered: true, hmoPortionPct: 90, copayPct: 10, requiresPa: false },
      { category: 'RADIOLOGY', item: 'Abdominal / Pelvic Ultrasound Scan', isCovered: true, hmoPortionPct: 90, copayPct: 10, requiresPa: true, paCode: 'NHIA-RAD-99120' },
      { category: 'PHARMACY', item: 'IV Ceftriaxone & Oral Cefuroxime', isCovered: true, hmoPortionPct: 90, copayPct: 10, requiresPa: false },
    ],
    generatedPaCode: 'NHIA-RAD-99120',
    hmoApprovedAmount: 45000,
    patientCopayAmount: 5000,
    extraOutofPocketNotes: 'Standard 10% co-payment on medication and scan tariff. No extra out-of-pocket required.',
    officerNotes: 'Spoke with HMO Desk Officer Dr. Chika. Policy is fully active under formal sector civil service window.',
    verifiedByStaff: 'Mary Okon (Insurance Desk Officer)',
  },
  {
    id: 'VER-2026-002',
    patientId: 'pat-real-002',
    patientName: 'Mazi Chukwuma Eze',
    folderNumber: '107G6',
    schemeCode: 'ESAUHC',
    schemeName: 'Enugu State Agency for Universal Health Coverage',
    callReferenceCode: 'ESA-PORTAL-5519',
    hmoOfficerName: 'Enugu State Agency Automated Portal API',
    hmoOfficerPhone: '042-255-ESAUHC',
    channel: 'EXTERNAL_PORTAL_QUERY',
    verificationTime: '2026-09-24T11:40:00Z',
    verifiedStatus: 'PARTIALLY_COVERED_COPAY',
    verifiedServices: [
      { category: 'CONSULTATION', item: 'Specialist Physician Consultation', isCovered: true, hmoPortionPct: 100, copayPct: 0, requiresPa: false },
      { category: 'LABORATORY', item: 'Lipid Profile & Liver Function Tests', isCovered: true, hmoPortionPct: 90, copayPct: 10, requiresPa: false },
      { category: 'PHARMACY', item: 'Rosuvastatin 20mg (Non-Formulary Brand)', isCovered: false, hmoPortionPct: 0, copayPct: 100, requiresPa: false, notes: 'Non-formulary brand requires cash self-pay or generic substitution' },
    ],
    generatedPaCode: 'ESAUHC-LAB-38102',
    hmoApprovedAmount: 22000,
    patientCopayAmount: 6500,
    extraOutofPocketNotes: 'Patient must pay ₦4,500 cash for non-formulary statin brand plus ₦2,000 lab co-pay.',
    officerNotes: 'Verified via ESAUHC live verification portal. Beneficiary valid until December 2027.',
    verifiedByStaff: 'Peter Obi (Senior Claims Officer)',
  },
  {
    id: 'VER-2026-003',
    patientId: 'pat-real-003',
    patientName: 'Blessing Nkechi Ugwu',
    folderNumber: '108UX',
    schemeCode: 'CHIKADIBIA',
    schemeName: 'Chikadibia Mutual Health Agency',
    callReferenceCode: 'CHK-CALL-0941',
    hmoOfficerName: 'Sister Faustina (Chikadibia Mutual Ops)',
    hmoOfficerPhone: '0803-CHIKADIBIA',
    channel: 'PHONE_CALL',
    verificationTime: '2026-09-24T13:10:00Z',
    verifiedStatus: 'FULLY_COVERED',
    verifiedServices: [
      { category: 'SURGERY', item: 'Emergency Appendectomy & Theatre Pack', isCovered: true, hmoPortionPct: 85, copayPct: 15, requiresPa: true, paCode: 'CHK-SUR-77142' },
      { category: 'ADMISSION', item: 'Post-Op Surgical Ward Admission (3 Days)', isCovered: true, hmoPortionPct: 90, copayPct: 10, requiresPa: true, paCode: 'CHK-ADM-77143' },
    ],
    generatedPaCode: 'CHK-SUR-77142',
    hmoApprovedAmount: 145000,
    patientCopayAmount: 22500,
    extraOutofPocketNotes: '15% co-pay on surgical procedure covered under mutual risk pool.',
    officerNotes: 'Confirmed by phone call with Sister Faustina. Primary facility code accredited.',
    verifiedByStaff: 'Mary Okon (Insurance Desk Officer)',
  },
];

// 2. Monthly Enrollee Register
export let monthlyEnrolleeRegister: any[] = [
  {
    id: 'REG-2026-09-001',
    enrolleeNumber: 'EN-NHIA-02201',
    folderNumber: '107T6',
    fullName: 'Mrs. Chioma Ezechukwu',
    age: 34,
    gender: 'Female',
    schemeCode: 'NHIA',
    schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
    planName: 'Formal Sector Social Health Insurance Plan (FSSHIPP)',
    reportingMonth: '2026-09',
    registrationDate: '2026-09-02',
    primaryUnit: 'OPD Clinic',
    accreditedFacility: 'Faith Foundation Mission Hospital (Main Campus)',
    status: 'ACTIVE',
    batchNumber: 'NHIA/BAT/2026/09A',
  },
  {
    id: 'REG-2026-09-002',
    enrolleeNumber: 'EN-ESA-01984',
    folderNumber: '107G6',
    fullName: 'Mazi Chukwuma Eze',
    age: 48,
    gender: 'Male',
    schemeCode: 'ESAUHC',
    schemeName: 'Enugu State Agency for Universal Health Coverage',
    planName: 'Enugu State Formal Sector Civil Servants Plan',
    reportingMonth: '2026-09',
    registrationDate: '2026-09-05',
    primaryUnit: 'OPD Clinic',
    accreditedFacility: 'Faith Foundation Mission Hospital (Main Campus)',
    status: 'ACTIVE',
    batchNumber: 'ESA/BAT/2026/09B',
  },
  {
    id: 'REG-2026-09-003',
    enrolleeNumber: 'EN-CHK-00912',
    folderNumber: '108UX',
    fullName: 'Blessing Nkechi Ugwu',
    age: 26,
    gender: 'Female',
    schemeCode: 'CHIKADIBIA',
    schemeName: 'Chikadibia Mutual Health Agency',
    planName: 'Chikadibia Community Primary Health Package',
    reportingMonth: '2026-09',
    registrationDate: '2026-09-10',
    primaryUnit: 'Maternity & Antenatal Suite',
    accreditedFacility: 'Faith Foundation Mission Hospital (Main Campus)',
    status: 'ACTIVE',
    batchNumber: 'CHK/BAT/2026/09C',
  },
  {
    id: 'REG-2026-09-004',
    enrolleeNumber: 'EN-NDM-00877',
    folderNumber: '10857',
    fullName: 'Ambless Sidney',
    age: 42,
    gender: 'Female',
    schemeCode: 'NDMHS',
    schemeName: 'Nsukka Diocesan Mutual Health Scheme',
    planName: 'Diocesan Clergy, Religious & Seminary Staff Plan',
    reportingMonth: '2026-09',
    registrationDate: '2026-09-15',
    primaryUnit: 'Specialist Clinic',
    accreditedFacility: 'Faith Foundation Mission Hospital (Main Campus)',
    status: 'ACTIVE',
    batchNumber: 'NDM/BAT/2026/09A',
  },
  {
    id: 'REG-2026-09-005',
    enrolleeNumber: 'EN-NHIA-02202',
    folderNumber: '1084K1',
    fullName: 'Hilary Chike',
    age: 52,
    gender: 'Male',
    schemeCode: 'NHIA',
    schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
    planName: 'Group, Individual & Family Social Health Insurance (GIFSHIP)',
    reportingMonth: '2026-09',
    registrationDate: '2026-09-18',
    primaryUnit: 'Accident & Emergency',
    accreditedFacility: 'Faith Foundation Mission Hospital (Main Campus)',
    status: 'ACTIVE',
    batchNumber: 'NHIA/BAT/2026/09B',
  },
];

// 3. Monthly Capitation Reconciliation Store
export let monthlyCapitationLedger: any[] = [
  {
    id: 'CAP-2026-09-NHIA',
    schemeCode: 'NHIA',
    schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
    month: '2026-09',
    enrolleeCount: 1420,
    ratePerHead: 750,
    expectedAmount: 1065000,
    receivedAmount: 1065000,
    variance: 0,
    bankReference: 'CBN/E-TRZ/20260904-NHIA-0992',
    remittanceDate: '2026-09-04',
    status: 'RECONCILED',
    verifiedBy: 'Emmanuel Vegher (Audit Head)',
    notes: 'Full capitation received directly through Remita TSA account. 100% reconciliation match.',
  },
  {
    id: 'CAP-2026-09-ESAUHC',
    schemeCode: 'ESAUHC',
    schemeName: 'Enugu State Agency for Universal Health Coverage',
    month: '2026-09',
    enrolleeCount: 980,
    ratePerHead: 850,
    expectedAmount: 833000,
    receivedAmount: 833000,
    variance: 0,
    bankReference: 'FBN/E-PAY/20260908-ESAUHC-8812',
    remittanceDate: '2026-09-08',
    status: 'RECONCILED',
    verifiedBy: 'Emmanuel Vegher (Audit Head)',
    notes: 'State formal sector civil service capitation remitted and verified against primary register.',
  },
  {
    id: 'CAP-2026-09-CHIKADIBIA',
    schemeCode: 'CHIKADIBIA',
    schemeName: 'Chikadibia Mutual Health Agency',
    month: '2026-09',
    enrolleeCount: 650,
    ratePerHead: 600,
    expectedAmount: 390000,
    receivedAmount: 375000,
    variance: -15000,
    bankReference: 'ZEN/TRF/20260912-CHK-MUT-4421',
    remittanceDate: '2026-09-12',
    status: 'UNDER_REMITTED',
    verifiedBy: 'Emmanuel Vegher (Audit Head)',
    notes: 'Under-remitted by ₦15,000 (25 enrollees pending mutual community council clearance).',
  },
  {
    id: 'CAP-2026-09-NDMHS',
    schemeCode: 'NDMHS',
    schemeName: 'Nsukka Diocesan Mutual Health Scheme',
    month: '2026-09',
    enrolleeCount: 520,
    ratePerHead: 500,
    expectedAmount: 260000,
    receivedAmount: 260000,
    variance: 0,
    bankReference: 'UBA/NIP/20260905-NDM-SCH-1109',
    remittanceDate: '2026-09-05',
    status: 'RECONCILED',
    verifiedBy: 'Emmanuel Vegher (Audit Head)',
    notes: 'Diocesan Secretariat health commission remittance received in full.',
  },
  {
    id: 'CAP-2026-08-NHIA',
    schemeCode: 'NHIA',
    schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
    month: '2026-08',
    enrolleeCount: 1390,
    ratePerHead: 750,
    expectedAmount: 1042500,
    receivedAmount: 1042500,
    variance: 0,
    bankReference: 'CBN/E-TRZ/20260805-NHIA-0771',
    remittanceDate: '2026-08-05',
    status: 'RECONCILED',
    verifiedBy: 'Emmanuel Vegher (Audit Head)',
    notes: 'August 2026 statutory capitation fully settled and credited.',
  },
];

// 4. Monthly Fee-For-Service (FFS) Claims Store
export let monthlyFfsClaims: any[] = [
  {
    id: 'FFS-2026-09-001',
    claimNumber: 'CLM/NHIA/2026/09/0081',
    folderNumber: '107T6',
    clientName: 'Mrs. Chioma Ezechukwu',
    schemeCode: 'NHIA',
    schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
    serviceDate: '2026-09-14',
    careLevel: 'SECONDARY_CARE',
    category: 'SURGERY',
    serviceDescription: 'Elective Abdominal Myomectomy & Pre-Op Diagnostics',
    tariffAmount: 175000,
    copayAmount: 17500,
    claimedAmount: 157500,
    approvedAmount: 157500,
    paCode: 'NHIA-SUR-98124',
    status: 'APPROVED',
    hmoBatchNo: 'BATCH-NHIA-2026-SEP-01',
    submissionDate: '2026-09-18',
    doctorInCharge: 'Dr. Chinedu Eze (Consultant Gynaecologist)',
    notes: 'Prior-auth granted on 12/09/2026. Clinical summary and histology report attached.',
  },
  {
    id: 'FFS-2026-09-002',
    claimNumber: 'CLM/ESA/2026/09/0045',
    folderNumber: '107G6',
    clientName: 'Mazi Chukwuma Eze',
    schemeCode: 'ESAUHC',
    schemeName: 'Enugu State Agency for Universal Health Coverage',
    serviceDate: '2026-09-16',
    careLevel: 'SECONDARY_DIAGNOSTICS',
    category: 'RADIOLOGY',
    serviceDescription: 'High-Resolution Pelvic MRI & Triphasic CT Scan',
    tariffAmount: 125000,
    copayAmount: 12500,
    claimedAmount: 112500,
    approvedAmount: 112500,
    paCode: 'ESA-RAD-04421',
    status: 'PAID',
    hmoBatchNo: 'BATCH-ESA-2026-SEP-02',
    submissionDate: '2026-09-19',
    doctorInCharge: 'Dr. Mary Nnamani (Radiologist)',
    notes: 'Direct bank remittance confirmed by finance desk.',
  },
  {
    id: 'FFS-2026-09-003',
    claimNumber: 'CLM/CHK/2026/09/0019',
    folderNumber: '108UX',
    clientName: 'Blessing Nkechi Ugwu',
    schemeCode: 'CHIKADIBIA',
    schemeName: 'Chikadibia Mutual Health Agency',
    serviceDate: '2026-09-20',
    careLevel: 'TERTIARY_OBSTETRICS',
    category: 'THEATRE_DELIVERY',
    serviceDescription: 'Emergency Caesarean Section Package & Blood Transfusion',
    tariffAmount: 220000,
    copayAmount: 22000,
    claimedAmount: 198000,
    approvedAmount: 0,
    paCode: 'CHK-SUR-77142',
    status: 'SUBMITTED',
    hmoBatchNo: 'BATCH-CHK-2026-SEP-01',
    submissionDate: '2026-09-22',
    doctorInCharge: 'Dr. Ifeanyi Okoro (Senior Medical Officer)',
    notes: 'Awaiting monthly claims adjudication review from Chikadibia Medical Board.',
  },
  {
    id: 'FFS-2026-09-004',
    claimNumber: 'CLM/NDM/2026/09/0031',
    folderNumber: '10857',
    clientName: 'Ambless Sidney',
    schemeCode: 'NDMHS',
    schemeName: 'Nsukka Diocesan Mutual Health Scheme',
    serviceDate: '2026-09-21',
    careLevel: 'SPECIALIST_MEDICINE',
    category: 'PATHOLOGY_LAB',
    serviceDescription: 'Comprehensive Endocrine Panel & HbA1c Glycated Haemoglobin',
    tariffAmount: 48000,
    copayAmount: 4800,
    claimedAmount: 43200,
    approvedAmount: 43200,
    paCode: 'NDM-LAB-10928',
    status: 'APPROVED',
    hmoBatchNo: 'BATCH-NDM-2026-SEP-01',
    submissionDate: '2026-09-23',
    doctorInCharge: 'Dr. Obinna Ugwu (Consultant Physician)',
    notes: 'Approved under clergy and religious medical benefit window.',
  },
  {
    id: 'FFS-2026-09-005',
    claimNumber: 'CLM/HYG/2026/09/0112',
    folderNumber: '1084K1',
    clientName: 'Hilary Chike',
    schemeCode: 'HYGEIA',
    schemeName: 'Hygeia HMO Private Health Plan',
    serviceDate: '2026-09-22',
    careLevel: 'SPECIALIST_CARDIOLOGY',
    category: 'CARDIAC_CARE',
    serviceDescription: '24-Hour Holter Monitoring & Echocardiography',
    tariffAmount: 85000,
    copayAmount: 8500,
    claimedAmount: 76500,
    approvedAmount: 76500,
    paCode: 'HYG-CARD-44192',
    status: 'APPROVED',
    hmoBatchNo: 'BATCH-HYG-2026-SEP-01',
    submissionDate: '2026-09-24',
    doctorInCharge: 'Dr. Franklin Madu (Consultant Cardiologist)',
    notes: 'Approved via Hygeia Provider Portal.',
  },
  {
    id: 'FFS-2026-09-006',
    claimNumber: 'CLM/AXA/2026/09/0094',
    folderNumber: '1082M4',
    clientName: 'Ngozi Precious Okafor',
    schemeCode: 'AXA_MANSARD',
    schemeName: 'AXA Mansard Health Insurance',
    serviceDate: '2026-09-23',
    careLevel: 'SECONDARY_CARE',
    category: 'ORTHOPAEDICS',
    serviceDescription: 'Closed Reduction & Internal Fixation of Left Fibula Fracture',
    tariffAmount: 195000,
    copayAmount: 19500,
    claimedAmount: 175500,
    approvedAmount: 0,
    paCode: 'AXA-ORT-61209',
    status: 'IN_PROGRESS',
    hmoBatchNo: 'BATCH-AXA-2026-SEP-01',
    submissionDate: '2026-09-24',
    doctorInCharge: 'Dr. Chukwuemeka Ezeh (Orthopaedic Surgeon)',
    notes: 'Under review with HMO Medical Claims Adjudication team.',
  },
  {
    id: 'FFS-2026-09-007',
    claimNumber: 'CLM/REL/2026/09/0063',
    folderNumber: '1089A1',
    clientName: 'Emeka Christian Onuorah',
    schemeCode: 'RELIANCE',
    schemeName: 'Reliance Health HMO',
    serviceDate: '2026-09-23',
    careLevel: 'PRIMARY_CARE',
    category: 'PHARMACY_LAB',
    serviceDescription: 'Typhoid Panel, Complete Blood Count & IV Antibiotics Course',
    tariffAmount: 32000,
    copayAmount: 3200,
    claimedAmount: 28800,
    approvedAmount: 28800,
    paCode: 'REL-MED-90182',
    status: 'APPROVED',
    hmoBatchNo: 'BATCH-REL-2026-SEP-01',
    submissionDate: '2026-09-24',
    doctorInCharge: 'Dr. Joy Umeh (Medical Officer)',
    notes: 'Instant pre-auth granted via Reliance API.',
  },
  {
    id: 'FFS-2026-09-008',
    claimNumber: 'CLM/NHIA/2026/09/0095',
    folderNumber: '1091B2',
    clientName: 'Gabriel Chukwu',
    schemeCode: 'NHIA',
    schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
    serviceDate: '2026-09-24',
    careLevel: 'SECONDARY_CARE',
    category: 'OPHTHALMOLOGY',
    serviceDescription: 'Cataract Extraction & Intraocular Lens Implantation',
    tariffAmount: 110000,
    copayAmount: 11000,
    claimedAmount: 99000,
    approvedAmount: 0,
    paCode: 'NHIA-OPH-33291',
    status: 'SUBMITTED',
    hmoBatchNo: 'BATCH-NHIA-2026-SEP-02',
    submissionDate: '2026-09-24',
    doctorInCharge: 'Dr. Esther Nnaji (Consultant Ophthalmologist)',
    notes: 'Submitted in secondary claims batch to NHIA Zonal Office.',
  },
];

// 5. Clinical Prior-Authorization (PA) Codes
export let clinicalAuthorizations: any[] = [
  {
    id: 'AUTH-001',
    paCode: 'NHIA-LAB-88231',
    schemeCode: 'NHIA',
    schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
    clientName: 'Mrs. Chioma Ezechukwu',
    folderNumber: '107T6',
    category: 'LABORATORY',
    serviceName: 'Full Blood Count (FBC) + Lipid Profile + Liver Function Test',
    requestingDoctor: 'Dr. Chinedu Eze',
    tariffAmount: 14500,
    patientCopay: 1450,
    coverageAmount: 13050,
    requestDate: '2026-09-22',
    expiryDate: '2026-10-22',
    status: 'APPROVED',
    notes: 'Approved via NHIA Portal automated pre-authorization gateway.',
  },
  {
    id: 'AUTH-002',
    paCode: 'ESA-RAD-04421',
    schemeCode: 'ESAUHC',
    schemeName: 'Enugu State Agency for Universal Health Coverage',
    clientName: 'Mazi Chukwuma Eze',
    folderNumber: '107G6',
    category: 'RADIOLOGY',
    serviceName: 'High-Resolution Abdominal Pelvic Ultrasound + Chest X-Ray',
    requestingDoctor: 'Dr. Mary Nnamani',
    tariffAmount: 28000,
    patientCopay: 2800,
    coverageAmount: 25200,
    requestDate: '2026-09-21',
    expiryDate: '2026-10-21',
    status: 'APPROVED',
    notes: 'Authorisation code validated against ESAUHC secondary diagnostic benefits.',
  },
  {
    id: 'AUTH-003',
    paCode: 'CHK-SUR-77142',
    schemeCode: 'CHIKADIBIA',
    schemeName: 'Chikadibia Mutual Health Agency',
    clientName: 'Blessing Nkechi Ugwu',
    folderNumber: '108UX',
    category: 'SURGERY',
    serviceName: 'Emergency Lower Segment Caesarean Section (EMERGENCY CS)',
    requestingDoctor: 'Dr. Ifeanyi Okoro',
    tariffAmount: 220000,
    patientCopay: 22000,
    coverageAmount: 198000,
    requestDate: '2026-09-20',
    expiryDate: '2026-10-20',
    status: 'APPROVED',
    notes: 'Emergency telephonic prior-auth code issued by Chikadibia Desk Officer.',
  },
  {
    id: 'AUTH-004',
    paCode: 'NDM-DRG-33109',
    schemeCode: 'NDMHS',
    schemeName: 'Nsukka Diocesan Mutual Health Scheme',
    clientName: 'Ambless Sidney',
    folderNumber: '10857',
    category: 'MEDICATION',
    serviceName: 'IV Ceftriaxone 1g + Artemether-Lumefantrine + Paracetamol IV Infusion',
    requestingDoctor: 'Dr. Obinna Ugwu',
    tariffAmount: 18500,
    patientCopay: 1850,
    coverageAmount: 16650,
    requestDate: '2026-09-23',
    expiryDate: '2026-10-23',
    status: 'APPROVED',
    notes: 'Special antimicrobial authorization code granted by Diocesan Pharmacist.',
  },
  {
    id: 'AUTH-005',
    paCode: 'NHIA-SPC-55102',
    schemeCode: 'NHIA',
    schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
    clientName: 'Hilary Chike',
    folderNumber: '1084K1',
    category: 'SPECIALIST_CONSULTATION',
    serviceName: 'Consultant Cardiologist Evaluation & Resting 12-Lead ECG',
    requestingDoctor: 'Dr. Franklin Madu',
    tariffAmount: 25000,
    patientCopay: 2500,
    coverageAmount: 22500,
    requestDate: '2026-09-24',
    expiryDate: '2026-10-24',
    status: 'APPROVED',
    notes: 'Secondary consultation referral authorization active for 30 days.',
  },
];

// 6. Accredited Hospital Units under the Schemes
export let accreditedUnits: any[] = [
  {
    id: 'UNT-001',
    unitName: 'Accident & Emergency (A&E) / Casualty Department',
    code: 'EMERGENCY_DEPT',
    accreditationLevel: 'TERTIARY_24_7',
    leadOfficer: 'Dr. Ifeanyi Okoro (Emergency Director)',
    schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS'],
    accreditationDate: '2024-01-15',
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: 'Resuscitation, STAT Trauma, Minor Surgery, Acute Admissions, 24/7 Casualty',
  },
  {
    id: 'UNT-002',
    unitName: 'General Outpatient Department (GOPD) & Primary Care Clinic',
    code: 'OPD_CLINIC',
    accreditationLevel: 'PRIMARY_SECONDARY',
    leadOfficer: 'Dr. Franklin Madu (HOD Outpatients)',
    schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS'],
    accreditationDate: '2024-01-15',
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: 'Primary Consultations, Health Screenings, Chronic Disease Care, Immunization',
  },
  {
    id: 'UNT-003',
    unitName: 'Antenatal Care (ANC) & Labour Suite',
    code: 'MATERNITY_ANC',
    accreditationLevel: 'COMPREHENSIVE_EMOC',
    leadOfficer: 'Dr. Chinedu Eze (Consultant Obstetrician)',
    schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS'],
    accreditationDate: '2024-03-01',
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: 'Antenatal Visits, Normal Deliveries, High-Risk Pregnancies, Postnatal Care',
  },
  {
    id: 'UNT-004',
    unitName: 'Inpatient Clinical Wards (Male, Female, Paediatrics)',
    code: 'INPATIENT_WARDS',
    accreditationLevel: 'SECONDARY_CARE_WARDS',
    leadOfficer: 'Matron Ngozi Ugwu (Chief Nursing Officer)',
    schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS'],
    accreditationDate: '2024-01-15',
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: 'Inpatient Care, 24/7 Nursing, Post-Operative Recovery, Paediatric Admissions',
  },
  {
    id: 'UNT-005',
    unitName: 'Clinical Diagnostic Laboratory (LIMS)',
    code: 'LAB_DIAGNOSTICS',
    accreditationLevel: 'TERTIARY_ISO15189',
    leadOfficer: 'Scientist Emeka Anayo (Chief Medical Lab Scientist)',
    schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS'],
    accreditationDate: '2024-02-10',
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: 'Haematology, Clinical Chemistry, Microbiology, Parasitology, Blood Bank Crossmatching',
  },
  {
    id: 'UNT-006',
    unitName: 'Radiology & Medical Imaging Center',
    code: 'RADIOLOGY_IMAGING',
    accreditationLevel: 'ADVANCED_IMAGING',
    leadOfficer: 'Dr. Mary Nnamani (Chief Consultant Radiologist)',
    schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS'],
    accreditationDate: '2024-04-12',
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: 'Digital X-Ray, Abdominal/Pelvic Ultrasound, 4D Obstetric Scans, CT Scanner, Mammography',
  },
  {
    id: 'UNT-007',
    unitName: 'Main Surgical Operating Theatres (Theatres 1 & 2)',
    code: 'SURGICAL_THEATRE',
    accreditationLevel: 'MAJOR_SURGICAL_SUITE',
    leadOfficer: 'Dr. Obinna Ugwu (Chief of Surgery)',
    schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS'],
    accreditationDate: '2024-01-15',
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: 'General Surgery, Orthopaedics, Gynaecological Surgery, Caesarean Sections, Laparoscopy',
  },
  {
    id: 'UNT-008',
    unitName: 'Pharmacy Dispensary & Drug Revolving Fund',
    code: 'PHARMACY_DISPENSARY',
    accreditationLevel: 'FORMULARY_DISPENSARY',
    leadOfficer: 'Pharm. Kalu Ndukwe (Head of Pharmacy)',
    schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS'],
    accreditationDate: '2024-01-15',
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: 'Formulary Dispensing, Antenatal Medicines, Controlled Drugs, Prescription Auditing',
  },
  {
    id: 'UNT-009',
    unitName: 'Rehabilitation & Physiotherapy Unit',
    code: 'PHYSIOTHERAPY',
    accreditationLevel: 'REHABILITATION_CLINIC',
    leadOfficer: 'PT. Chiamaka Eze (Chief Physiotherapist)',
    schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS'],
    accreditationDate: '2024-05-18',
    renewalDate: '2027-12-31',
    status: 'ACCREDITED',
    services: 'Post-Stroke Rehab, Orthopaedic Rehab, Paediatric Neuro-Developmental Therapy',
  },
];

// 7. Audit & Daily Receipts / Transactions Store
export let insuranceDailyAudit: any = {
  reportingDate: new Date().toISOString().slice(0, 10),
  dailyReceipts: [
    {
      id: 'REC-2026-0924-001',
      receiptNumber: 'INS-REC-2026-0924-8801',
      timestamp: '2026-09-24T08:15:00Z',
      patientName: 'Mrs. Chioma Ezechukwu',
      folderNumber: '107T6',
      schemeCode: 'NHIA',
      schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
      serviceRendered: '10% Co-Payment for FBC, LFT & Lipid Panel',
      amountPaid: 1450,
      paymentMethod: 'POS / Debit Card',
      cashierName: 'Mary Okon (Cash Desk #01)',
      status: 'VALID',
    },
    {
      id: 'REC-2026-0924-002',
      receiptNumber: 'INS-REC-2026-0924-8802',
      timestamp: '2026-09-24T09:20:00Z',
      patientName: 'Mazi Chukwuma Eze',
      folderNumber: '107G6',
      schemeCode: 'ESAUHC',
      schemeName: 'Enugu State Agency for Universal Health Coverage',
      serviceRendered: '10% Co-Payment for Pelvic Ultrasound Scan',
      amountPaid: 2800,
      paymentMethod: 'Cash',
      cashierName: 'Mary Okon (Cash Desk #01)',
      status: 'VALID',
    },
    {
      id: 'REC-2026-0924-003',
      receiptNumber: 'INS-REC-2026-0924-8803',
      timestamp: '2026-09-24T10:45:00Z',
      patientName: 'Blessing Nkechi Ugwu',
      folderNumber: '108UX',
      schemeCode: 'CHIKADIBIA',
      schemeName: 'Chikadibia Mutual Health Agency',
      serviceRendered: '10% Co-Payment for Inpatient Ward Stay & Nursing Care',
      amountPaid: 3500,
      paymentMethod: 'Bank Transfer (Monnify)',
      cashierName: 'Peter Obi (Cash Desk #02)',
      status: 'VALID',
    },
    {
      id: 'REC-2026-0924-004',
      receiptNumber: 'INS-REC-2026-0924-8804',
      timestamp: '2026-09-24T11:10:00Z',
      patientName: 'Ambless Sidney',
      folderNumber: '10857',
      schemeCode: 'NDMHS',
      schemeName: 'Nsukka Diocesan Mutual Health Scheme',
      serviceRendered: '10% Co-Payment for Antibiotics & Prescription Drugs',
      amountPaid: 1850,
      paymentMethod: 'Cash',
      cashierName: 'Mary Okon (Cash Desk #01)',
      status: 'VALID',
    },
    {
      id: 'REC-2026-0924-005',
      receiptNumber: 'INS-REC-2026-0924-8805',
      timestamp: '2026-09-24T12:30:00Z',
      patientName: 'Hilary Chike',
      folderNumber: '1084K1',
      schemeCode: 'NHIA',
      schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
      serviceRendered: '10% Co-Payment for Specialist Cardiologist Review',
      amountPaid: 2500,
      paymentMethod: 'POS / Debit Card',
      cashierName: 'Peter Obi (Cash Desk #02)',
      status: 'VALID',
    },
  ],
  canceledReceipts: [
    {
      id: 'CAN-REC-001',
      receiptNumber: 'INS-REC-2026-0924-8799',
      originalTimestamp: '2026-09-24T07:45:00Z',
      cancellationTimestamp: '2026-09-24T08:00:00Z',
      patientName: 'Elizabeth Nwachukwu',
      folderNumber: '109L4',
      schemeCode: 'NHIA',
      amount: 4500,
      reason: 'Billed 100% private tariff in error before insurance policy confirmation was verified. Corrected to 10% co-pay.',
      authorizedBy: 'Emmanuel Vegher (Audit Supervisor)',
      cashierName: 'Mary Okon',
    },
    {
      id: 'CAN-REC-002',
      receiptNumber: 'INS-REC-2026-0924-8785',
      originalTimestamp: '2026-09-23T16:15:00Z',
      cancellationTimestamp: '2026-09-23T16:40:00Z',
      patientName: 'Jude Unamka',
      folderNumber: '105XY',
      schemeCode: 'ESAUHC',
      amount: 15000,
      reason: 'Duplicate payment entry made on POS terminal. Customer account credited and duplicate canceled.',
      authorizedBy: 'Emmanuel Vegher (Audit Supervisor)',
      cashierName: 'Peter Obi',
    },
  ],
  dailyFolderVisits: [
    { folderNumber: '107T6', patientName: 'Mrs. Chioma Ezechukwu', schemeCode: 'NHIA', clinicUnit: 'GOPD Clinic', visitTime: '08:05', status: 'COMPLETED' },
    { folderNumber: '107G6', patientName: 'Mazi Chukwuma Eze', schemeCode: 'ESAUHC', clinicUnit: 'Radiology / Ultrasound', visitTime: '09:12', status: 'COMPLETED' },
    { folderNumber: '108UX', patientName: 'Blessing Nkechi Ugwu', schemeCode: 'CHIKADIBIA', clinicUnit: 'Antenatal & Labour Suite', visitTime: '10:30', status: 'IN_PROGRESS' },
    { folderNumber: '10857', patientName: 'Ambless Sidney', schemeCode: 'NDMHS', clinicUnit: 'Specialist Clinic', visitTime: '11:00', status: 'COMPLETED' },
    { folderNumber: '1084K1', patientName: 'Hilary Chike', schemeCode: 'NHIA', clinicUnit: 'Cardiology Review', visitTime: '12:15', status: 'IN_PROGRESS' },
    { folderNumber: '109L4', patientName: 'Elizabeth Nwachukwu', schemeCode: 'NHIA', clinicUnit: 'GOPD Clinic', visitTime: '12:45', status: 'WAITING' },
    { folderNumber: '105XY', patientName: 'Jude Unamka', schemeCode: 'ESAUHC', clinicUnit: 'Eye & Dental Clinic', visitTime: '13:10', status: 'WAITING' },
  ],
  specialistConsultationFees: [
    { specialty: 'Consultant Cardiologist', statutoryTariff: 15000, hmoCoverage: 13500, patientCopay: 1500, primaryRequirements: 'Referral Letter + Prior Auth Code' },
    { specialty: 'Consultant Obstetrician & Gynaecologist (O&G)', statutoryTariff: 15000, hmoCoverage: 13500, patientCopay: 1500, primaryRequirements: 'Covered under Maternal Window' },
    { specialty: 'Consultant Paediatrician', statutoryTariff: 12000, hmoCoverage: 10800, patientCopay: 1200, primaryRequirements: 'Under-5 free under NHIA/BHCPF' },
    { specialty: 'Consultant General Surgeon', statutoryTariff: 15000, hmoCoverage: 13500, patientCopay: 1500, primaryRequirements: 'Surgical Booking Form Required' },
    { specialty: 'Consultant Orthopaedic Surgeon', statutoryTariff: 18000, hmoCoverage: 16200, patientCopay: 1800, primaryRequirements: 'X-Ray / Trauma Film Required' },
    { specialty: 'Consultant Ophthalmologist (Eye Specialist)', statutoryTariff: 12000, hmoCoverage: 10800, patientCopay: 1200, primaryRequirements: 'Visual Acuity Chart Attached' },
    { specialty: 'Consultant ENT Surgeon (Ear, Nose & Throat)', statutoryTariff: 12000, hmoCoverage: 10800, patientCopay: 1200, primaryRequirements: 'Audiogram Report' },
    { specialty: 'Consultant Physician / Internal Medicine', statutoryTariff: 15000, hmoCoverage: 13500, patientCopay: 1500, primaryRequirements: 'Chronic Disease Regimen Review' },
    { specialty: 'Consultant Dental Surgeon', statutoryTariff: 10000, hmoCoverage: 9000, patientCopay: 1000, primaryRequirements: 'Dental Charting Assessment' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// §16.1 – SCHEMES CRUD & CONFIGURATION API (Supports dynamic hospital schemes)
// ─────────────────────────────────────────────────────────────────────────────

// GET /insurance/schemes - Live list of all configured insurance schemes
router.get('/schemes', authMiddleware, async (_req, res, next) => {
  try {
    await ensureDatabaseSeeded();

    // Query providers from DB
    const dbProviders = await prisma.insuranceProvider.findMany({
      include: {
        plans: true,
        policies: {
          include: { patient: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Merge with DEFAULT_SCHEMES metadata for rich UI styling
    const schemes = dbProviders.map(p => {
      const match = DEFAULT_SCHEMES.find(d => d.code === p.code);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        shortName: match?.shortName || p.name,
        category: match?.category || 'PRIVATE_HMO',
        badge: match?.badge || 'Health Scheme',
        color: match?.color || '#3b5bdb',
        contactPerson: match?.contactPerson || 'Liaison Officer',
        contactDetails: p.contactDetails || match?.contactDetails || '',
        phone: match?.phone || '',
        email: match?.email || '',
        portalUrl: match?.portalUrl || '',
        description: match?.description || 'Registered health insurance scheme operating at Faith Foundation Mission Hospital.',
        defaultCapitationRate: match?.defaultCapitationRate || 700,
        defaultCopayPercentage: match?.defaultCopayPercentage || 10,
        accreditedStatus: match?.accreditedStatus || 'ACCREDITED',
        accreditationExpiry: match?.accreditationExpiry || '2027-12-31',
        requiresPreAuthForSpecialist: match?.requiresPreAuthForSpecialist ?? true,
        requiresPreAuthForSurgery: match?.requiresPreAuthForSurgery ?? true,
        requiresPreAuthForScans: match?.requiresPreAuthForScans ?? true,
        requiresPreAuthForSpecialLabs: match?.requiresPreAuthForSpecialLabs ?? true,
        isActive: p.isActive,
        enrolleeCount: p.policies.length,
        plans: p.plans.map(pl => ({
          id: pl.id,
          name: pl.name,
          maxAnnualLimit: Number(pl.maxAnnualLimit) || 1000000,
          copayPercentage: pl.copayPercentage || 10,
          deductibleAmount: Number(pl.deductibleAmount) || 0,
        }))
      };
    });

    res.json({
      success: true,
      data: schemes,
      total: schemes.length
    });
  } catch (err) {
    next(err);
  }
});

// POST /insurance/schemes - Add a new scheme dynamically
router.post('/schemes', authMiddleware, async (req: any, res, next) => {
  try {
    const {
      code, name, shortName, category, badge, color, contactPerson,
      contactDetails, phone, email, portalUrl, description,
      defaultCapitationRate, defaultCopayPercentage, accreditedStatus,
      accreditationExpiry, requiresPreAuthForSpecialist, requiresPreAuthForSurgery,
      requiresPreAuthForScans, requiresPreAuthForSpecialLabs, plans
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Scheme code and name are required' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');

    const existing = await prisma.insuranceProvider.findUnique({
      where: { code: cleanCode }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Scheme code ${cleanCode} already exists` });
    }

    // Create provider in database
    const provider = await prisma.insuranceProvider.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        contactDetails: contactDetails || `${email || ''} · ${phone || ''}`,
        isActive: true,
      }
    });

    // Create plans
    const createdPlans = [];
    const rawPlans = (plans && Array.isArray(plans) && plans.length > 0)
      ? plans
      : [{ name: `${name.trim()} Standard Plan`, maxAnnualLimit: 1000000, copayPercentage: Number(defaultCopayPercentage) || 10, deductibleAmount: 0 }];

    for (const pl of rawPlans) {
      const plan = await prisma.insuranceBenefitPlan.create({
        data: {
          name: pl.name,
          providerId: provider.id,
          maxAnnualLimit: (Number(pl.maxAnnualLimit) || 1000000) as any,
          copayPercentage: Number(pl.copayPercentage) || 10,
          deductibleAmount: (Number(pl.deductibleAmount) || 0) as any,
          coverageDetails: JSON.stringify({
            consultation: 100,
            laboratory: 90,
            radiology: 85,
            medications: 90,
            surgery: 80,
            maternity: 100,
            admission: 80,
          }),
        }
      });
      createdPlans.push(plan);
    }

    // Add to DEFAULT_SCHEMES in memory for styling
    DEFAULT_SCHEMES.push({
      code: cleanCode,
      name: name.trim(),
      shortName: shortName || name.trim(),
      category: category || 'PRIVATE_HMO',
      badge: badge || 'Health Scheme',
      color: color || '#3b5bdb',
      contactPerson: contactPerson || 'Scheme Officer',
      contactDetails: contactDetails || `${email || ''} · ${phone || ''}`,
      phone: phone || '',
      email: email || '',
      portalUrl: portalUrl || '',
      description: description || 'Hospital configured health scheme',
      defaultCapitationRate: Number(defaultCapitationRate) || 700,
      defaultCopayPercentage: Number(defaultCopayPercentage) || 10,
      accreditedStatus: accreditedStatus || 'ACCREDITED',
      accreditationExpiry: accreditationExpiry || '2028-12-31',
      requiresPreAuthForSpecialist: !!requiresPreAuthForSpecialist,
      requiresPreAuthForSurgery: !!requiresPreAuthForSurgery,
      requiresPreAuthForScans: !!requiresPreAuthForScans,
      requiresPreAuthForSpecialLabs: !!requiresPreAuthForSpecialLabs,
      isActive: true,
      plans: createdPlans.map(cp => ({
        id: cp.id,
        name: cp.name,
        maxAnnualLimit: Number(cp.maxAnnualLimit) || 1000000,
        copayPercentage: cp.copayPercentage,
        deductibleAmount: Number(cp.deductibleAmount) || 0,
      }))
    });

    await logAudit({
      userId: req.user?.userId || 'system',
      action: 'insurance.scheme_create',
      resourceType: 'InsuranceScheme',
      resourceId: provider.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { code: cleanCode, name },
    });

    res.status(201).json({
      success: true,
      message: `Health insurance scheme ${name} created successfully`,
      data: {
        id: provider.id,
        code: cleanCode,
        name,
        plans: createdPlans,
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /insurance/schemes/:id - Update scheme config
router.put('/schemes/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const {
      code, name, shortName, category, badge, color, contactPerson,
      contactDetails, phone, email, portalUrl, description,
      defaultCapitationRate, defaultCopayPercentage, accreditedStatus,
      accreditationExpiry, requiresPreAuthForSpecialist, requiresPreAuthForSurgery,
      requiresPreAuthForScans, requiresPreAuthForSpecialLabs, isActive,
      plans, planName, planMaxAnnualLimit
    } = req.body;

    const provider = await prisma.insuranceProvider.findFirst({
      where: {
        OR: [
          { id },
          { code: id }
        ]
      },
      include: { plans: true }
    });

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Health insurance scheme not found' });
    }

    const updatedProvider = await prisma.insuranceProvider.update({
      where: { id: provider.id },
      data: {
        name: name ? name.trim() : undefined,
        code: (code && code.trim().toUpperCase() !== provider.code) ? code.trim().toUpperCase().replace(/\s+/g, '_') : undefined,
        contactDetails: contactDetails || (email || phone ? `${email || ''} · ${phone || ''}` : undefined),
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
      include: { plans: true }
    });

    // If plans are provided, synchronize them in DB
    const finalPlansList: any[] = [];
    if (plans && Array.isArray(plans) && plans.length > 0) {
      const incomingIds = plans.map(p => p.id).filter(Boolean);
      // Clean up removed plans
      if (incomingIds.length > 0) {
        await prisma.insuranceBenefitPlan.deleteMany({
          where: {
            providerId: provider.id,
            id: { notIn: incomingIds }
          }
        }).catch(() => {});
      }

      for (const pl of plans) {
        if (!pl.name || !pl.name.trim()) continue;
        if (pl.id) {
          const updated = await prisma.insuranceBenefitPlan.update({
            where: { id: pl.id },
            data: {
              name: pl.name.trim(),
              maxAnnualLimit: (Number(pl.maxAnnualLimit) || 1000000) as any,
              copayPercentage: pl.copayPercentage !== undefined ? Number(pl.copayPercentage) : 10,
              deductibleAmount: (Number(pl.deductibleAmount) || 0) as any,
            }
          }).catch(() => null);
          if (updated) finalPlansList.push(updated);
        } else {
          const created = await prisma.insuranceBenefitPlan.create({
            data: {
              name: pl.name.trim(),
              providerId: provider.id,
              maxAnnualLimit: (Number(pl.maxAnnualLimit) || 1000000) as any,
              copayPercentage: pl.copayPercentage !== undefined ? Number(pl.copayPercentage) : 10,
              deductibleAmount: (Number(pl.deductibleAmount) || 0) as any,
              coverageDetails: JSON.stringify({
                consultation: 100,
                laboratory: 90,
                radiology: 85,
                medications: 90,
                surgery: 80,
                maternity: 100,
                admission: 80,
              }),
            }
          }).catch(() => null);
          if (created) finalPlansList.push(created);
        }
      }
    } else if (planName || planMaxAnnualLimit) {
      if (provider.plans.length > 0) {
        const updated = await prisma.insuranceBenefitPlan.update({
          where: { id: provider.plans[0].id },
          data: {
            name: planName || provider.plans[0].name,
            maxAnnualLimit: (Number(planMaxAnnualLimit) || Number(provider.plans[0].maxAnnualLimit) || 1000000) as any,
            copayPercentage: defaultCopayPercentage !== undefined ? Number(defaultCopayPercentage) : provider.plans[0].copayPercentage,
          }
        }).catch(() => null);
        if (updated) finalPlansList.push(updated);
      }
    }

    // Update or add in memory DEFAULT_SCHEMES
    let match = DEFAULT_SCHEMES.find(d => d.code === provider.code || d.code === updatedProvider.code);
    if (!match) {
      match = {
        code: updatedProvider.code,
        name: updatedProvider.name,
        shortName: shortName || updatedProvider.name,
        category: category || 'PRIVATE_HMO',
        badge: badge || 'Health Scheme',
        color: color || '#3b5bdb',
        contactPerson: contactPerson || '',
        contactDetails: updatedProvider.contactDetails || '',
        phone: phone || '',
        email: email || '',
        portalUrl: portalUrl || '',
        description: description || '',
        defaultCapitationRate: Number(defaultCapitationRate) || 700,
        defaultCopayPercentage: Number(defaultCopayPercentage) || 10,
        accreditedStatus: accreditedStatus || 'ACCREDITED',
        accreditationExpiry: accreditationExpiry || '2027-12-31',
        requiresPreAuthForSpecialist: !!requiresPreAuthForSpecialist,
        requiresPreAuthForSurgery: !!requiresPreAuthForSurgery,
        requiresPreAuthForScans: !!requiresPreAuthForScans,
        requiresPreAuthForSpecialLabs: !!requiresPreAuthForSpecialLabs,
        isActive: updatedProvider.isActive,
        plans: finalPlansList.map(p => ({
          id: p.id,
          name: p.name,
          maxAnnualLimit: Number(p.maxAnnualLimit) || 1000000,
          copayPercentage: p.copayPercentage || 10,
          deductibleAmount: Number(p.deductibleAmount) || 0,
        })),
      };
      DEFAULT_SCHEMES.push(match);
    } else {
      if (code) match.code = updatedProvider.code;
      if (name) match.name = name.trim();
      if (shortName) match.shortName = shortName;
      if (category) match.category = category;
      if (badge) match.badge = badge;
      if (color) match.color = color;
      if (contactPerson !== undefined) match.contactPerson = contactPerson;
      if (contactDetails !== undefined) match.contactDetails = contactDetails;
      if (phone !== undefined) match.phone = phone;
      if (email !== undefined) match.email = email;
      if (portalUrl !== undefined) match.portalUrl = portalUrl;
      if (description !== undefined) match.description = description;
      if (defaultCapitationRate !== undefined) match.defaultCapitationRate = Number(defaultCapitationRate);
      if (defaultCopayPercentage !== undefined) match.defaultCopayPercentage = Number(defaultCopayPercentage);
      if (accreditedStatus) match.accreditedStatus = accreditedStatus;
      if (accreditationExpiry) match.accreditationExpiry = accreditationExpiry;
      if (requiresPreAuthForSpecialist !== undefined) match.requiresPreAuthForSpecialist = !!requiresPreAuthForSpecialist;
      if (requiresPreAuthForSurgery !== undefined) match.requiresPreAuthForSurgery = !!requiresPreAuthForSurgery;
      if (requiresPreAuthForScans !== undefined) match.requiresPreAuthForScans = !!requiresPreAuthForScans;
      if (requiresPreAuthForSpecialLabs !== undefined) match.requiresPreAuthForSpecialLabs = !!requiresPreAuthForSpecialLabs;
      if (isActive !== undefined) match.isActive = !!isActive;
      if (finalPlansList.length > 0) {
        match.plans = finalPlansList.map(p => ({
          id: p.id,
          name: p.name,
          maxAnnualLimit: Number(p.maxAnnualLimit) || 1000000,
          copayPercentage: p.copayPercentage || 10,
          deductibleAmount: Number(p.deductibleAmount) || 0,
        }));
      }
    }

    await logAudit({
      userId: req.user?.userId || 'system',
      action: 'insurance.scheme_update',
      resourceType: 'InsuranceScheme',
      resourceId: provider.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { code: updatedProvider.code, name: updatedProvider.name },
    });

    res.json({
      success: true,
      message: `Scheme ${updatedProvider.name} updated successfully`,
      data: updatedProvider
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /insurance/schemes/:id - Delete a scheme
router.delete('/schemes/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;

    const provider = await prisma.insuranceProvider.findFirst({
      where: {
        OR: [
          { id },
          { code: id }
        ]
      },
      include: {
        plans: true,
        policies: true,
      }
    });

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Health insurance scheme not found' });
    }

    // 1. Delete associated policies
    await prisma.patientInsurancePolicy.deleteMany({
      where: { providerId: provider.id }
    });

    // 2. Delete associated benefit plans
    await prisma.insuranceBenefitPlan.deleteMany({
      where: { providerId: provider.id }
    });

    // 3. Delete the provider
    await prisma.insuranceProvider.delete({
      where: { id: provider.id }
    });

    // 4. Remove from DEFAULT_SCHEMES in memory
    const idx = DEFAULT_SCHEMES.findIndex(d => d.code === provider.code);
    if (idx !== -1) {
      DEFAULT_SCHEMES.splice(idx, 1);
    }

    // 5. Clean up associated mock data or logs
    const code = provider.code;
    monthlyEnrolleeRegister = monthlyEnrolleeRegister.filter(r => r.schemeCode !== code);
    monthlyCapitationLedger = monthlyCapitationLedger.filter(c => c.schemeCode !== code);
    monthlyFfsClaims = monthlyFfsClaims.filter(f => f.schemeCode !== code);
    clinicalAuthorizations = clinicalAuthorizations.filter(a => a.schemeCode !== code);

    await logAudit({
      userId: req.user?.userId || 'system',
      action: 'insurance.scheme_delete',
      resourceType: 'InsuranceScheme',
      resourceId: provider.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { code: provider.code, name: provider.name },
    });

    res.json({
      success: true,
      message: `Scheme "${provider.name}" and all associated benefit plans have been deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.2 – REGISTERED HOSPITAL PATIENTS LOOKUP (All names must be registered)
// ─────────────────────────────────────────────────────────────────────────────

// GET /insurance/registered-patients - Fast autocomplete search across hospital registered patients
router.get('/registered-patients', authMiddleware, async (req: any, res, next) => {
  try {
    const { query, limit = '25' } = req.query;
    const take = Math.min(parseInt(limit as string) || 25, 100);

    const where: any = { isActive: true };

    if (query && typeof query === 'string' && query.trim()) {
      const q = query.trim();
      where.OR = [
        { patientNumber: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { nin: { contains: q, mode: 'insensitive' } },
        { telecoms: { some: { value: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        lastName: true,
        middleName: true,
        gender: true,
        birthDate: true,
        bloodGroup: true,
        genotype: true,
        telecoms: true,
        addresses: true,
        insurancePolicies: {
          where: { isActive: true },
          include: { provider: true, plan: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take
    });

    const mapped = patients.map(p => {
      const phoneObj = p.telecoms?.find(t => t.system === 'phone');
      const addrObj = p.addresses?.[0];
      const activePolicy = p.insurancePolicies?.[0];

      let age: number | null = null;
      if (p.birthDate) {
        const diff = Date.now() - new Date(p.birthDate).getTime();
        age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      }

      return {
        id: p.id,
        patientNumber: p.patientNumber,
        folderNumber: p.patientNumber,
        fullName: `${p.firstName} ${p.middleName ? p.middleName + ' ' : ''}${p.lastName}`.trim(),
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        birthDate: p.birthDate,
        age: age || 30,
        phone: phoneObj?.value || '08000000000',
        address: addrObj ? `${addrObj.line || ''} ${addrObj.city || ''}`.trim() : 'Nsukka, Enugu State',
        bloodGroup: p.bloodGroup ? p.bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-') : 'O+',
        genotype: p.genotype || 'AA',
        hasInsurance: !!activePolicy,
        currentScheme: activePolicy?.provider?.name || null,
        currentSchemeCode: activePolicy?.provider?.code || null,
        policyNumber: activePolicy?.membershipNumber || null,
      };
    });

    res.json({
      success: true,
      data: mapped,
      total: mapped.length
    });
  } catch (err) {
    next(err);
  }
});

// Extended metadata for client policies (coverage scope, dependents, provisional folder link)
export interface PolicyMetadata {
  coverageScope: 'INDIVIDUAL' | 'FAMILY' | 'CORPORATE_GROUP';
  maxDependents: number;
  coveredDependents: Array<{
    id: string;
    name: string;
    relationship: 'SPOUSE' | 'CHILD' | 'PARENT' | 'WARD' | 'DEPENDENT';
    gender?: string;
    age?: number;
    dob?: string;
    nationalId?: string;
  }>;
  isProvisionalFolder: boolean;
  notes?: string;
}

export let policyExtendedMetadata: Record<string, PolicyMetadata> = {};

// ─────────────────────────────────────────────────────────────────────────────
// §16.3 – CLIENT REGISTRY & ENROLLEE ONBOARDING (Live Prisma Database Linked)
// ─────────────────────────────────────────────────────────────────────────────

// GET /insurance/clients - Returns all insured clients with linking & dependent status
router.get('/clients', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureDatabaseSeeded();
    const { schemeCode, search, limit = '100', page = '1' } = req.query;

    const p = parseInt(page as string) || 1;
    const l = Math.min(parseInt(limit as string) || 100, 200);
    const skip = (p - 1) * l;

    const where: any = {};

    if (schemeCode && schemeCode !== 'ALL') {
      where.provider = { code: schemeCode };
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { membershipNumber: { contains: q, mode: 'insensitive' } },
        { enrolleeNumber: { contains: q, mode: 'insensitive' } },
        { patient: { patientNumber: { contains: q, mode: 'insensitive' } } },
        { patient: { firstName: { contains: q, mode: 'insensitive' } } },
        { patient: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [policies, total] = await Promise.all([
      prisma.patientInsurancePolicy.findMany({
        where,
        include: {
          patient: {
            include: { telecoms: true, addresses: true }
          },
          provider: true,
          plan: true,
        },
        orderBy: { effectiveDate: 'desc' },
        skip,
        take: l,
      }),
      prisma.patientInsurancePolicy.count({ where }),
    ]);

    const mapped = policies.map((pol, idx) => {
      const pat = pol.patient;
      const phoneObj = pat.telecoms?.find(t => t.system === 'phone');
      const addrObj = pat.addresses?.[0];
      const meta = policyExtendedMetadata[pol.id];

      let age = 35;
      if (pat.birthDate) {
        const diff = Date.now() - new Date(pat.birthDate).getTime();
        age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      }

      const isFamily = meta?.coverageScope === 'FAMILY' || (!meta && idx % 2 === 0);
      const scope = meta?.coverageScope || (isFamily ? 'FAMILY' : 'INDIVIDUAL');
      const sampleDependents = isFamily ? [
        { id: `DEP-${idx}-1`, name: `${pat.lastName} Blessing`, relationship: 'SPOUSE' as const, gender: 'Female', age: 32 },
        { id: `DEP-${idx}-2`, name: `${pat.lastName} Junior`, relationship: 'CHILD' as const, gender: 'Male', age: 7 },
        { id: `DEP-${idx}-3`, name: `${pat.lastName} Chidera`, relationship: 'CHILD' as const, gender: 'Female', age: 4 },
      ] : [];

      const coveredDependents = meta?.coveredDependents || sampleDependents;
      const coversBeyondPrincipal = scope === 'FAMILY' || scope === 'CORPORATE_GROUP';

      return {
        id: pol.id,
        patientId: pat.id,
        folderNumber: pat.patientNumber,
        isProvisionalFolder: meta?.isProvisionalFolder ?? (pat.patientNumber.startsWith('INS-')),
        isFolderLinked: meta ? !meta.isProvisionalFolder : (!pat.patientNumber.startsWith('INS-')),
        name: `${pat.firstName} ${pat.middleName ? pat.middleName + ' ' : ''}${pat.lastName}`.trim(),
        firstName: pat.firstName,
        lastName: pat.lastName,
        age,
        gender: pat.gender ? (pat.gender === 'MALE' ? 'Male' : 'Female') : 'Female',
        phone: phoneObj?.value || '08034567891',
        address: addrObj ? `${addrObj.line || ''} ${addrObj.city || ''}`.trim() : 'No. 14 University Road, Nsukka',
        membershipNumber: pol.membershipNumber,
        enrolleeNumber: pol.enrolleeNumber || `EN-${pol.provider.code}-${String(1000 + idx)}`,
        schemeCode: pol.provider.code,
        schemeName: pol.provider.name,
        planName: pol.plan?.name || 'Standard Coverage Plan',
        coverageScope: scope,
        coversBeyondPrincipal,
        coveredDependents,
        dependentCount: coveredDependents.length,
        registrationDate: pol.effectiveDate.toISOString().slice(0, 10),
        effectiveDate: pol.effectiveDate.toISOString().slice(0, 10),
        expiryDate: pol.expiryDate.toISOString().slice(0, 10),
        status: pol.isActive ? 'ACTIVE' : 'SUSPENDED',
        bloodGroup: pat.bloodGroup ? pat.bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-') : 'O+',
        genotype: pat.genotype || 'AA',
        primaryUnit: 'OPD Clinic',
        totalVisits: (idx % 5) + 1,
        lastVisit: new Date(Date.now() - (idx * 86400000 * 3)).toISOString().slice(0, 10),
      };
    });

    res.json({
      success: true,
      data: mapped,
      total,
      page: p,
      totalPages: Math.ceil(total / l)
    });
  } catch (err) {
    next(err);
  }
});

// POST /insurance/clients - Enroll patient OR create new enrollee into a scheme
router.post('/clients', authMiddleware, async (req: any, res, next) => {
  try {
    const {
      patientId, folderNumber, firstName, lastName, middleName, gender,
      phone, address, bloodGroup, genotype, birthDate, age,
      providerId, schemeCode, planId, membershipNumber, enrolleeNumber,
      effectiveDate, expiryDate, primaryUnit, coverageScope, coveredDependents
    } = req.body;

    let patient = null;
    let isProvisionalFolder = false;

    // 1. If existing patient selected by ID or folder
    if (patientId) {
      patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { telecoms: true, addresses: true }
      });
    } else if (folderNumber && !folderNumber.startsWith('NEW')) {
      patient = await prisma.patient.findUnique({
        where: { patientNumber: folderNumber },
        include: { telecoms: true, addresses: true }
      });
    }

    // 2. If client does not exist / has no folder yet, auto-create a provisional enrollee record
    if (!patient) {
      if (!firstName && !lastName) {
        return res.status(400).json({
          success: false,
          message: 'Please provide the client name or select an existing patient folder.'
        });
      }

      const patientCount = await prisma.patient.count();
      const newFolderNumber = `INS-${String(10000 + patientCount + 1)}`;
      isProvisionalFolder = true;

      const user = await prisma.user.create({
        data: {
          username: `ins_${newFolderNumber.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
          email: `ins_${newFolderNumber.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}@terkhealth.internal`,
          passwordHash: '$2b$10$dummyHashForInsuranceEnrolleePlaceholder',
          role: 'PATIENT',
          isActive: true,
        }
      });

      patient = await prisma.patient.create({
        data: {
          userId: user.id,
          patientNumber: newFolderNumber,
          firstName: (firstName || 'Enrollee').trim(),
          lastName: (lastName || 'Principal').trim(),
          middleName: middleName ? middleName.trim() : undefined,
          gender: gender === 'Female' || gender === 'FEMALE' ? 'FEMALE' : (gender === 'Male' || gender === 'MALE' ? 'MALE' : 'OTHER'),
          birthDate: birthDate ? new Date(birthDate) : (age ? new Date(Date.now() - (Number(age) * 365.25 * 86400000)) : new Date(1990, 0, 1)),
          bloodGroup: bloodGroup ? (bloodGroup.replace('+', '_POSITIVE').replace('-', '_NEGATIVE') as any) : undefined,
          genotype: genotype || 'AA',
          telecoms: phone ? {
            create: [{ system: 'phone', value: phone.trim(), use: 'mobile' }]
          } : undefined,
          addresses: address ? {
            create: [{ line: address.trim(), city: 'Nsukka', state: 'Enugu', country: 'Nigeria' }]
          } : undefined,
          isActive: true,
        },
        include: { telecoms: true, addresses: true }
      });
    }

    // 3. Find provider
    let provider = null;
    if (providerId) {
      provider = await prisma.insuranceProvider.findUnique({ where: { id: providerId }, include: { plans: true } });
    } else if (schemeCode) {
      provider = await prisma.insuranceProvider.findUnique({ where: { code: schemeCode }, include: { plans: true } });
    }

    if (!provider) {
      return res.status(400).json({ success: false, message: 'Invalid health insurance scheme selected' });
    }

    // 4. Find or assign plan
    let selectedPlanId = planId;
    if (!selectedPlanId && provider.plans.length > 0) {
      selectedPlanId = provider.plans[0].id;
    }

    if (!selectedPlanId) {
      const newPlan = await prisma.insuranceBenefitPlan.create({
        data: {
          name: `${provider.name} Standard Plan`,
          providerId: provider.id,
          maxAnnualLimit: 1000000 as any,
          copayPercentage: 10,
          deductibleAmount: 0 as any,
        }
      });
      selectedPlanId = newPlan.id;
    }

    const effDate = effectiveDate ? new Date(effectiveDate) : new Date();
    const expDate = expiryDate ? new Date(expiryDate) : new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
    const memNo = membershipNumber || `${provider.code}/POL/${patient.patientNumber}`;
    const enrNo = enrolleeNumber || `EN-${provider.code}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Create policy in DB
    const policy = await prisma.patientInsurancePolicy.create({
      data: {
        patientId: patient.id,
        providerId: provider.id,
        planId: selectedPlanId,
        membershipNumber: memNo,
        enrolleeNumber: enrNo,
        effectiveDate: effDate,
        expiryDate: expDate,
        isActive: true,
        isPrimary: true,
      },
      include: {
        provider: true,
        plan: true,
        patient: true,
      }
    });

    // 5. Save multi-beneficiary coverage metadata & dependents
    const scope = coverageScope || (coveredDependents && coveredDependents.length > 0 ? 'FAMILY' : 'INDIVIDUAL');
    const dependentsList = Array.isArray(coveredDependents) ? coveredDependents.map((d: any, idx: number) => ({
      id: d.id || `DEP-${Date.now()}-${idx + 1}`,
      name: d.name,
      relationship: d.relationship || 'DEPENDENT',
      gender: d.gender || 'Female',
      age: d.age ? Number(d.age) : undefined,
      dob: d.dob || undefined,
      nationalId: d.nationalId || undefined,
    })) : [];

    policyExtendedMetadata[policy.id] = {
      coverageScope: scope,
      maxDependents: scope === 'FAMILY' ? 4 : (scope === 'CORPORATE_GROUP' ? 6 : 0),
      coveredDependents: dependentsList,
      isProvisionalFolder,
      notes: isProvisionalFolder ? 'Enrollee registered without initial hospital medical record. Can be linked anytime by Records.' : 'Linked to active hospital patient folder.',
    };

    // Also add to monthly enrollee register
    monthlyEnrolleeRegister.unshift({
      id: `REG-${new Date().toISOString().slice(0, 7)}-${String(monthlyEnrolleeRegister.length + 1).padStart(3, '0')}`,
      enrolleeNumber: enrNo,
      folderNumber: patient.patientNumber,
      fullName: `${patient.firstName} ${patient.middleName ? patient.middleName + ' ' : ''}${patient.lastName}`.trim(),
      age: 35,
      gender: patient.gender === 'MALE' ? 'Male' : 'Female',
      schemeCode: provider.code,
      schemeName: provider.name,
      planName: policy.plan?.name || 'Standard Plan',
      coverageScope: scope,
      dependentCount: dependentsList.length,
      reportingMonth: new Date().toISOString().slice(0, 7),
      registrationDate: new Date().toISOString().slice(0, 10),
      primaryUnit: primaryUnit || 'OPD Clinic',
      accreditedFacility: 'Faith Foundation Mission Hospital (Main Campus)',
      status: 'ACTIVE',
      batchNumber: `${provider.code}/BAT/${new Date().toISOString().slice(0, 7)}`,
    });

    await logAudit({
      userId: req.user?.userId || 'system',
      action: 'insurance.client_enroll',
      resourceType: 'PatientInsurancePolicy',
      resourceId: policy.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { patientNumber: patient.patientNumber, schemeCode: provider.code, membershipNumber: memNo, coverageScope: scope, dependentsCount: dependentsList.length },
    });

    res.status(201).json({
      success: true,
      message: `Enrollee ${patient.firstName} ${patient.lastName} (${isProvisionalFolder ? 'Provisional Folder #' + patient.patientNumber : 'Folder #' + patient.patientNumber}) enrolled successfully under ${provider.name} with ${scope} coverage (${dependentsList.length} dependents).`,
      data: {
        ...policy,
        coverageScope: scope,
        coveredDependents: dependentsList,
        isProvisionalFolder,
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /insurance/clients/:id/link-patient - Records action: Link hospital patient folder to an insurance policy
router.post('/clients/:id/link-patient', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params; // Policy ID
    const { patientId, folderNumber } = req.body;

    let targetPatient = null;
    if (patientId) {
      targetPatient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: { telecoms: true, addresses: true }
      });
    } else if (folderNumber) {
      targetPatient = await prisma.patient.findUnique({
        where: { patientNumber: folderNumber },
        include: { telecoms: true, addresses: true }
      });
    }

    if (!targetPatient) {
      return res.status(404).json({ success: false, message: 'Target hospital patient folder not found' });
    }

    const updatedPolicy = await prisma.patientInsurancePolicy.update({
      where: { id },
      data: {
        patientId: targetPatient.id,
      },
      include: {
        patient: { include: { telecoms: true, addresses: true } },
        provider: true,
        plan: true,
      }
    });

    if (policyExtendedMetadata[id]) {
      policyExtendedMetadata[id].isProvisionalFolder = false;
    }

    await logAudit({
      userId: req.user?.userId || 'system',
      action: 'insurance.policy_link_patient',
      resourceType: 'PatientInsurancePolicy',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      changes: { linkedToFolder: targetPatient.patientNumber, patientId: targetPatient.id },
    });

    res.json({
      success: true,
      message: `Insurance policy successfully linked to patient ${targetPatient.firstName} ${targetPatient.lastName} (Folder #${targetPatient.patientNumber})`,
      data: updatedPolicy
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.4 – REAL-TIME COVERAGE CHECK & CASHIER BILLING INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

// GET /insurance/coverage-check/:patientId - Real-time eligibility & multi-person coverage check
router.get('/coverage-check/:patientId', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        insurancePolicies: {
          where: { isActive: true, expiryDate: { gte: new Date() } },
          include: { provider: true, plan: true },
          orderBy: { isPrimary: 'desc' }
        },
        telecoms: true,
      }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const activePolicy = patient.insurancePolicies[0];

    if (!activePolicy) {
      return res.json({
        success: true,
        hasInsurance: false,
        fundingSource: 'SELF_PAY',
        patient: {
          id: patient.id,
          folderNumber: patient.patientNumber,
          name: `${patient.firstName} ${patient.lastName}`,
        },
        message: 'Patient has no active health insurance policy. Billed as 100% Out-of-Pocket / Self-Pay.',
      });
    }

    const schemeCode = activePolicy.provider.code;
    const schemeMatch = DEFAULT_SCHEMES.find(d => d.code === schemeCode);
    const copayPct = activePolicy.plan?.copayPercentage !== undefined ? activePolicy.plan.copayPercentage : (schemeMatch?.defaultCopayPercentage || 10);
    const coveragePct = 100 - copayPct;

    const meta = policyExtendedMetadata[activePolicy.id];
    const isFamily = meta?.coverageScope === 'FAMILY' || (!meta && activePolicy.membershipNumber.includes('FAM'));
    const scope = meta?.coverageScope || (isFamily ? 'FAMILY' : 'INDIVIDUAL');
    const coversBeyond = scope === 'FAMILY' || scope === 'CORPORATE_GROUP';
    const dependents = meta?.coveredDependents || (isFamily ? [
      { id: 'DEP-1', name: `${patient.lastName} Blessing`, relationship: 'SPOUSE', gender: 'Female', age: 32 },
      { id: 'DEP-2', name: `${patient.lastName} Junior`, relationship: 'CHILD', gender: 'Male', age: 7 },
    ] : []);

    // Look up active authorizations for this patient's folder number
    const patientAuths = clinicalAuthorizations.filter(a => a.folderNumber === patient.patientNumber && a.status === 'APPROVED');

    // Look up any phone verification logs
    const latestVerification = externalVerificationLogs.find(v => v.folderNumber === patient.patientNumber);

    res.json({
      success: true,
      hasInsurance: true,
      fundingSource: 'INSURANCE',
      patient: {
        id: patient.id,
        folderNumber: patient.patientNumber,
        name: `${patient.firstName} ${patient.lastName}`,
      },
      scheme: {
        id: activePolicy.provider.id,
        code: activePolicy.provider.code,
        name: activePolicy.provider.name,
        shortName: schemeMatch?.shortName || activePolicy.provider.name,
        badge: schemeMatch?.badge || 'Health Scheme',
        color: schemeMatch?.color || '#16a34a',
        category: schemeMatch?.category || 'STATUTORY_FEDERAL',
        phone: schemeMatch?.phone || activePolicy.provider.contactDetails,
        portalUrl: schemeMatch?.portalUrl,
      },
      policy: {
        id: activePolicy.id,
        membershipNumber: activePolicy.membershipNumber,
        enrolleeNumber: activePolicy.enrolleeNumber,
        planName: activePolicy.plan?.name || 'Standard Plan',
        effectiveDate: activePolicy.effectiveDate,
        expiryDate: activePolicy.expiryDate,
        copayPercentage: copayPct,
        coveragePercentage: coveragePct,
        maxAnnualLimit: Number(activePolicy.plan?.maxAnnualLimit) || 1000000,
        coverageScope: scope,
        coversBeyondPrincipal: coversBeyond,
        coveredDependents: dependents,
        scopeDescription: coversBeyond
          ? `Family Multi-Beneficiary Coverage — Covers Principal and ${dependents.length} registered family dependents beyond the subscriber.`
          : 'Individual / Principal Subscriber Only — Strictly restricted to subscriber (Does NOT cover family members or dependents).',
      },
      activeAuthorizations: patientAuths,
      latestVerificationLog: latestVerification || null,
      coverageSummary: {
        scope: coversBeyond ? 'FAMILY / MULTI-BENEFICIARY (Covers Dependents)' : 'INDIVIDUAL (Principal Only)',
        consultations: '100% Covered (₦0 Co-pay)',
        routineLabs: `${coveragePct}% Covered by HMO, ${copayPct}% Patient Co-Pay`,
        specialScans: `${coveragePct}% Covered by HMO (Requires PA Code), ${copayPct}% Patient Co-Pay`,
        formularyMedications: `${coveragePct}% Covered by HMO, ${copayPct}% Patient Co-Pay (Non-formulary: 100% Self-Pay)`,
        surgeries: `80-90% Covered by HMO (Requires Prior-Authorization), 10-20% Patient Co-Pay`,
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /insurance/coverage-check-by-folder/:folderNumber - Real-time lookup with multi-person scope
router.get('/coverage-check-by-folder/:folderNumber', authMiddleware, async (req: any, res, next) => {
  try {
    const { folderNumber } = req.params;

    const patient = await prisma.patient.findUnique({
      where: { patientNumber: folderNumber },
      include: {
        insurancePolicies: {
          where: { isActive: true, expiryDate: { gte: new Date() } },
          include: { provider: true, plan: true },
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: `No hospital patient found with folder #${folderNumber}` });
    }

    const activePolicy = patient.insurancePolicies[0];

    if (!activePolicy) {
      return res.json({
        success: true,
        hasInsurance: false,
        fundingSource: 'SELF_PAY',
        patient: {
          id: patient.id,
          folderNumber: patient.patientNumber,
          name: `${patient.firstName} ${patient.lastName}`,
        },
        message: 'Patient has no active insurance policy. 100% Out-of-Pocket.',
      });
    }

    const schemeCode = activePolicy.provider.code;
    const schemeMatch = DEFAULT_SCHEMES.find(d => d.code === schemeCode);
    const copayPct = activePolicy.plan?.copayPercentage !== undefined ? activePolicy.plan.copayPercentage : (schemeMatch?.defaultCopayPercentage || 10);

    const meta = policyExtendedMetadata[activePolicy.id];
    const isFamily = meta?.coverageScope === 'FAMILY' || (!meta && activePolicy.membershipNumber.includes('FAM'));
    const scope = meta?.coverageScope || (isFamily ? 'FAMILY' : 'INDIVIDUAL');
    const coversBeyond = scope === 'FAMILY' || scope === 'CORPORATE_GROUP';
    const dependents = meta?.coveredDependents || (isFamily ? [
      { id: 'DEP-1', name: `${patient.lastName} Blessing`, relationship: 'SPOUSE', gender: 'Female', age: 32 },
      { id: 'DEP-2', name: `${patient.lastName} Junior`, relationship: 'CHILD', gender: 'Male', age: 7 },
    ] : []);

    const patientAuths = clinicalAuthorizations.filter(a => a.folderNumber === folderNumber && a.status === 'APPROVED');
    const latestVerification = externalVerificationLogs.find(v => v.folderNumber === folderNumber);

    res.json({
      success: true,
      hasInsurance: true,
      fundingSource: 'INSURANCE',
      patient: {
        id: patient.id,
        folderNumber: patient.patientNumber,
        name: `${patient.firstName} ${patient.lastName}`,
      },
      scheme: {
        id: activePolicy.provider.id,
        code: activePolicy.provider.code,
        name: activePolicy.provider.name,
        badge: schemeMatch?.badge || 'Health Scheme',
        color: schemeMatch?.color || '#16a34a',
        phone: schemeMatch?.phone,
      },
      policy: {
        membershipNumber: activePolicy.membershipNumber,
        enrolleeNumber: activePolicy.enrolleeNumber,
        planName: activePolicy.plan?.name,
        copayPercentage: copayPct,
        coveragePercentage: 100 - copayPct,
        coverageScope: scope,
        coversBeyondPrincipal: coversBeyond,
        coveredDependents: dependents,
        scopeDescription: coversBeyond
          ? `Family Plan — Covers Principal Enrollee and registered Family Dependents beyond the subscriber.`
          : 'Individual Plan — Exclusively covers the Principal subscriber only (Does NOT cover dependents).',
      },
      activeAuthorizations: patientAuths,
      latestVerificationLog: latestVerification || null,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.5 – EXTERNAL SCHEME PHONE & PORTAL VERIFICATION LOGGING
// ─────────────────────────────────────────────────────────────────────────────

// GET /insurance/verifications - Get all logged external verification calls / portal checks
router.get('/verifications', authMiddleware, async (req: any, res) => {
  const { folderNumber, schemeCode } = req.query;
  let data = [...externalVerificationLogs];
  if (folderNumber) data = data.filter(v => v.folderNumber === folderNumber);
  if (schemeCode && schemeCode !== 'ALL') data = data.filter(v => v.schemeCode === schemeCode);
  res.json({ success: true, data, total: data.length });
});

// POST /insurance/log-verification - Record HMO Phone Call / External Portal confirmation
router.post('/log-verification', authMiddleware, async (req: any, res) => {
  const {
    patientId, folderNumber, patientName, schemeCode, callReferenceCode,
    hmoOfficerName, hmoOfficerPhone, channel, verifiedStatus, verifiedServices,
    generatedPaCode, hmoApprovedAmount, patientCopayAmount,
    extraOutofPocketNotes, officerNotes
  } = req.body;

  const schemeMatch = DEFAULT_SCHEMES.find(d => d.code === schemeCode) || DEFAULT_SCHEMES[0];
  const paCode = generatedPaCode || `${schemeCode || 'NHIA'}-PA-${Math.floor(10000 + Math.random() * 90000)}`;

  const logEntry = {
    id: `VER-${new Date().toISOString().slice(0, 10)}-${String(externalVerificationLogs.length + 1).padStart(3, '0')}`,
    patientId: patientId || 'pat-unknown',
    patientName: patientName || 'Insured Patient',
    folderNumber: folderNumber || 'FF-UNKNOWN',
    schemeCode: schemeCode || 'NHIA',
    schemeName: schemeMatch.name,
    callReferenceCode: callReferenceCode || `CALL-REF-${Math.floor(1000 + Math.random() * 9000)}`,
    hmoOfficerName: hmoOfficerName || 'HMO Verification Officer',
    hmoOfficerPhone: hmoOfficerPhone || schemeMatch.phone || '0800-000-0000',
    channel: channel || 'PHONE_CALL',
    verificationTime: new Date().toISOString(),
    verifiedStatus: verifiedStatus || 'FULLY_COVERED',
    verifiedServices: verifiedServices || [],
    generatedPaCode: paCode,
    hmoApprovedAmount: Number(hmoApprovedAmount) || 0,
    patientCopayAmount: Number(patientCopayAmount) || 0,
    extraOutofPocketNotes: extraOutofPocketNotes || 'Standard 10% statutory co-payment applies.',
    officerNotes: officerNotes || 'Telephonic confirmation completed and authorized.',
    verifiedByStaff: req.user?.username ? `${req.user.username} (Insurance Desk)` : 'Mary Okon (Insurance Desk Officer)',
  };

  externalVerificationLogs.unshift(logEntry);

  // If a PA code was generated, auto-create an entry in clinicalAuthorizations so other departments see it
  if (paCode) {
    clinicalAuthorizations.unshift({
      id: `AUTH-${String(clinicalAuthorizations.length + 1).padStart(3, '0')}`,
      paCode,
      schemeCode: schemeCode || 'NHIA',
      schemeName: schemeMatch.name,
      clientName: patientName,
      folderNumber,
      category: 'GENERAL_CARE',
      serviceName: Array.isArray(verifiedServices) && verifiedServices.length > 0 ? verifiedServices.map((s: any) => s.item).join(', ') : 'Verified Clinical Services',
      requestingDoctor: 'Attending Hospital Physician',
      tariffAmount: (Number(hmoApprovedAmount) || 0) + (Number(patientCopayAmount) || 0),
      patientCopay: Number(patientCopayAmount) || 0,
      coverageAmount: Number(hmoApprovedAmount) || 0,
      requestDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
      status: 'APPROVED',
      notes: `Authorization confirmed via ${channel === 'PHONE_CALL' ? 'HMO Telephone Call with ' + hmoOfficerName : 'External HMO Portal'}. Ref: ${logEntry.callReferenceCode}`,
    });
  }

  res.status(201).json({
    success: true,
    message: `Verification log recorded successfully. Prior-Auth Code ${paCode} issued.`,
    data: logEntry
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.6 – MONTHLY ENROLLEE REGISTER API
// ─────────────────────────────────────────────────────────────────────────────

router.get('/monthly-register', authMiddleware, async (req: any, res) => {
  const { month, schemeCode } = req.query;
  let data = [...monthlyEnrolleeRegister];
  if (month) data = data.filter(r => r.reportingMonth === month);
  if (schemeCode && schemeCode !== 'ALL') data = data.filter(r => r.schemeCode === schemeCode);
  res.json({ success: true, data, total: data.length });
});

router.post('/monthly-register', authMiddleware, async (req: any, res) => {
  const schemeCode = req.body.schemeCode || 'NHIA';
  const schemeObj = DEFAULT_SCHEMES.find(s => s.code === schemeCode) || DEFAULT_SCHEMES[0];
  const item = {
    id: `REG-${new Date().toISOString().slice(0, 7)}-${String(monthlyEnrolleeRegister.length + 1).padStart(3, '0')}`,
    ...req.body,
    schemeName: schemeObj.name,
    reportingMonth: req.body.reportingMonth || new Date().toISOString().slice(0, 7),
    registrationDate: req.body.registrationDate || new Date().toISOString().slice(0, 10),
    status: req.body.status || 'ACTIVE',
  };
  monthlyEnrolleeRegister.unshift(item);
  res.status(201).json({ success: true, data: item });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.7 – MONTHLY CAPITATION RECONCILIATION API
// ─────────────────────────────────────────────────────────────────────────────

router.get('/capitation', authMiddleware, async (req: any, res) => {
  const { month, schemeCode } = req.query;
  let data = [...monthlyCapitationLedger];
  if (month) data = data.filter(c => c.month === month);
  if (schemeCode && schemeCode !== 'ALL') data = data.filter(c => c.schemeCode === schemeCode);

  const totalExpected = data.reduce((s, c) => s + (c.expectedAmount || 0), 0);
  const totalReceived = data.reduce((s, c) => s + (c.receivedAmount || 0), 0);
  const totalVariance = data.reduce((s, c) => s + (c.variance || 0), 0);

  res.json({
    success: true,
    data,
    total: data.length,
    summary: { totalExpected, totalReceived, totalVariance, reconciledCount: data.filter(c => c.status === 'RECONCILED').length }
  });
});

router.post('/capitation', authMiddleware, async (req: any, res) => {
  const schemeCode = req.body.schemeCode || 'NHIA';
  const schemeObj = DEFAULT_SCHEMES.find(s => s.code === schemeCode) || DEFAULT_SCHEMES[0];
  const enrolleeCount = Number(req.body.enrolleeCount) || 100;
  const ratePerHead = Number(req.body.ratePerHead) || schemeObj.defaultCapitationRate || 750;
  const expectedAmount = enrolleeCount * ratePerHead;
  const receivedAmount = Number(req.body.receivedAmount) || expectedAmount;
  const variance = receivedAmount - expectedAmount;

  const item = {
    id: `CAP-${req.body.month || new Date().toISOString().slice(0, 7)}-${schemeCode}`,
    schemeCode,
    schemeName: schemeObj.name,
    month: req.body.month || new Date().toISOString().slice(0, 7),
    enrolleeCount,
    ratePerHead,
    expectedAmount,
    receivedAmount,
    variance,
    bankReference: req.body.bankReference || `CBN/TRZ/${Math.floor(1000000 + Math.random() * 9000000)}`,
    remittanceDate: req.body.remittanceDate || new Date().toISOString().slice(0, 10),
    status: variance === 0 ? 'RECONCILED' : (variance < 0 ? 'UNDER_REMITTED' : 'OVER_REMITTED'),
    verifiedBy: req.body.verifiedBy || 'Emmanuel Vegher (Audit Head)',
    notes: req.body.notes || 'Capitation remittance processed and reconciled against enrollee register.',
  };

  monthlyCapitationLedger.unshift(item);
  res.status(201).json({ success: true, data: item });
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.8 – MONTHLY FEE-FOR-SERVICE (FFS) CLAIMS API (PostgreSQL Prisma Powered)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/fee-for-service', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureDatabaseSeeded();
    const { schemeCode, status } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (schemeCode && schemeCode !== 'ALL') {
      where.policy = { provider: { code: schemeCode } };
    }

    const dbClaims = await prisma.claim.findMany({
      where,
      include: {
        policy: {
          include: {
            provider: true,
            plan: true,
            patient: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = dbClaims.map(c => {
      const patient = c.policy?.patient;
      const provider = c.policy?.provider;
      const plan = c.policy?.plan;
      const copayPct = plan?.copayPercentage || 10;
      const tariffAmount = c.totalAmount || 0;
      const copayAmount = Math.round((tariffAmount * copayPct) / 100);
      const claimedAmount = tariffAmount - copayAmount;

      return {
        id: c.id,
        claimNumber: `CLM/${provider?.code || 'HMO'}/${c.createdAt.toISOString().slice(0, 7).replace('-', '/')}/${c.id.slice(0, 4).toUpperCase()}`,
        folderNumber: patient?.patientNumber || 'FF-0000',
        clientName: patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Insured Client',
        schemeCode: provider?.code || 'NHIA',
        schemeName: provider?.name || 'National Health Insurance Authority',
        serviceDate: c.createdAt.toISOString().slice(0, 10),
        careLevel: 'SECONDARY_CARE',
        category: 'CLINICAL_CARE',
        serviceDescription: 'Specialist Consultation, Diagnostics & Clinical Care',
        tariffAmount,
        copayAmount,
        claimedAmount,
        approvedAmount: c.approvedAmount || (c.status === 'APPROVED' || c.status === 'PAID' ? claimedAmount : 0),
        paCode: `${provider?.code || 'NHIA'}-PA-${c.id.slice(0, 5).toUpperCase()}`,
        status: c.status,
        hmoBatchNo: `BATCH-${provider?.code || 'HMO'}-${c.createdAt.toISOString().slice(0, 7)}-01`,
        submissionDate: c.createdAt.toISOString().slice(0, 10),
        doctorInCharge: 'Attending Hospital Physician',
        notes: 'Clinical claim verified and processed via PostgreSQL.',
      };
    });

    const totalTariff = data.reduce((s, f) => s + (f.tariffAmount || 0), 0);
    const totalClaimed = data.reduce((s, f) => s + (f.claimedAmount || 0), 0);
    const totalApproved = data.reduce((s, f) => s + (f.approvedAmount || 0), 0);
    const totalCopay = data.reduce((s, f) => s + (f.copayAmount || 0), 0);

    res.json({
      success: true,
      data,
      total: data.length,
      summary: { totalTariff, totalClaimed, totalApproved, totalCopay }
    });
  } catch (e) {
    next(e);
  }
});

router.post('/fee-for-service', authMiddleware, async (req: any, res, next) => {
  try {
    const { schemeCode, tariffAmount, amount, clientName, folderNumber, patientId, status } = req.body;

    let pol = await prisma.patientInsurancePolicy.findFirst({
      where: schemeCode ? { provider: { code: schemeCode } } : {},
      include: { provider: true, plan: true, patient: true }
    });

    if (!pol) {
      pol = await prisma.patientInsurancePolicy.findFirst({
        include: { provider: true, plan: true, patient: true }
      });
    }

    const totalAmt = Number(tariffAmount || amount) || 50000;
    const created = await prisma.claim.create({
      data: {
        patientId: pol?.patientId || 'unknown',
        policyId: pol?.id || 'unknown',
        status: status || 'SUBMITTED',
        totalAmount: totalAmt,
        approvedAmount: 0,
      },
      include: {
        policy: {
          include: {
            provider: true,
            plan: true,
            patient: true,
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: created.id,
        claimNumber: `CLM/${pol?.provider?.code || schemeCode || 'HMO'}/${new Date().toISOString().slice(0, 7).replace('-', '/')}/${created.id.slice(0, 4).toUpperCase()}`,
        clientName: clientName || `${pol?.patient?.firstName || ''} ${pol?.patient?.lastName || ''}`.trim(),
        folderNumber: folderNumber || pol?.patient?.patientNumber,
        schemeCode: pol?.provider?.code || schemeCode,
        tariffAmount: totalAmt,
        status: created.status,
      }
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/fee-for-service/:id/status', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const { status, approvedAmount } = req.body;

    const existing = await prisma.claim.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Claim not found in database' });
    }

    const updated = await prisma.claim.update({
      where: { id },
      data: {
        status: status || existing.status,
        approvedAmount: approvedAmount !== undefined ? Number(approvedAmount) : (status === 'APPROVED' ? existing.totalAmount : existing.approvedAmount),
      }
    });

    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.9 – POSTGRESQL AUTHORIZATIONS (PA CODES) & LIVE BILL CHART API
// ─────────────────────────────────────────────────────────────────────────────

async function ensureAuthorizationsTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS insurance_authorizations (
        id VARCHAR(64) PRIMARY KEY,
        pa_code VARCHAR(100) UNIQUE NOT NULL,
        scheme_code VARCHAR(50) NOT NULL,
        scheme_name VARCHAR(255),
        client_name VARCHAR(255) NOT NULL,
        folder_number VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        requesting_doctor VARCHAR(255),
        tariff_amount DOUBLE PRECISION DEFAULT 0,
        patient_copay DOUBLE PRECISION DEFAULT 0,
        coverage_amount DOUBLE PRECISION DEFAULT 0,
        request_date VARCHAR(50),
        expiry_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'APPROVED',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const countRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM insurance_authorizations`);
    if (Number(countRes?.[0]?.count || 0) === 0) {
      const seedAuths = [
        {
          id: 'AUTH-001',
          paCode: 'NHIA-LAB-88231',
          schemeCode: 'NHIA',
          schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
          clientName: 'Mrs. Chioma Ezechukwu',
          folderNumber: '107T6',
          category: 'LABORATORY',
          serviceName: 'Full Blood Count (FBC) + Lipid Profile + Liver Function Test',
          requestingDoctor: 'Dr. Chinedu Eze',
          tariffAmount: 14500,
          patientCopay: 1450,
          coverageAmount: 13050,
          requestDate: '2026-09-22',
          expiryDate: '2026-10-22',
          status: 'APPROVED',
          notes: 'Approved via NHIA Portal automated pre-authorization gateway.',
        },
        {
          id: 'AUTH-002',
          paCode: 'ESA-RAD-04421',
          schemeCode: 'ESAUHC',
          schemeName: 'Enugu State Agency for Universal Health Coverage',
          clientName: 'Mazi Chukwuma Eze',
          folderNumber: '107G6',
          category: 'RADIOLOGY',
          serviceName: 'High-Resolution Abdominal Pelvic Ultrasound + Chest X-Ray',
          requestingDoctor: 'Dr. Mary Nnamani',
          tariffAmount: 28000,
          patientCopay: 2800,
          coverageAmount: 25200,
          requestDate: '2026-09-21',
          expiryDate: '2026-10-21',
          status: 'APPROVED',
          notes: 'Authorisation code validated against ESAUHC secondary diagnostic benefits.',
        },
        {
          id: 'AUTH-003',
          paCode: 'CHK-SUR-77142',
          schemeCode: 'CHIKADIBIA',
          schemeName: 'Chikadibia Mutual Health Agency',
          clientName: 'Blessing Nkechi Ugwu',
          folderNumber: '108UX',
          category: 'SURGERY',
          serviceName: 'Emergency Lower Segment Caesarean Section (EMERGENCY CS)',
          requestingDoctor: 'Dr. Ifeanyi Okoro',
          tariffAmount: 220000,
          patientCopay: 22000,
          coverageAmount: 198000,
          requestDate: '2026-09-20',
          expiryDate: '2026-10-20',
          status: 'APPROVED',
          notes: 'Emergency telephonic prior-auth code issued by Chikadibia Desk Officer.',
        },
        {
          id: 'AUTH-004',
          paCode: 'NDM-DRG-33109',
          schemeCode: 'NDMHS',
          schemeName: 'Nsukka Diocesan Mutual Health Scheme',
          clientName: 'Ambless Sidney',
          folderNumber: '10857',
          category: 'MEDICATION',
          serviceName: 'IV Ceftriaxone 1g + Artemether-Lumefantrine + Paracetamol IV Infusion',
          requestingDoctor: 'Dr. Obinna Ugwu',
          tariffAmount: 18500,
          patientCopay: 1850,
          coverageAmount: 16650,
          requestDate: '2026-09-23',
          expiryDate: '2026-10-23',
          status: 'APPROVED',
          notes: 'Special antimicrobial authorization code granted by Diocesan Pharmacist.',
        },
        {
          id: 'AUTH-005',
          paCode: 'NHIA-SPC-55102',
          schemeCode: 'NHIA',
          schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
          clientName: 'Hilary Chike',
          folderNumber: '1084K1',
          category: 'SPECIALIST_CONSULTATION',
          serviceName: 'Consultant Cardiologist Evaluation & Resting 12-Lead ECG',
          requestingDoctor: 'Dr. Franklin Madu',
          tariffAmount: 25000,
          patientCopay: 2500,
          coverageAmount: 22500,
          requestDate: '2026-09-24',
          expiryDate: '2026-10-24',
          status: 'APPROVED',
          notes: 'Secondary consultation referral authorization active for 30 days.',
        },
        {
          id: 'AUTH-006',
          paCode: 'AXA-ORT-61209',
          schemeCode: 'AXA_MANSARD',
          schemeName: 'AXA Mansard Health Insurance',
          clientName: 'Ngozi Precious Okafor',
          folderNumber: '1082M4',
          category: 'SURGERY',
          serviceName: 'Closed Reduction & Internal Fixation of Left Fibula Fracture',
          requestingDoctor: 'Dr. Chukwuemeka Ezeh',
          tariffAmount: 195000,
          patientCopay: 19500,
          coverageAmount: 175500,
          requestDate: '2026-09-23',
          expiryDate: '2026-10-23',
          status: 'APPROVED',
          notes: 'Under review with HMO Medical Claims Adjudication team.',
        },
        {
          id: 'AUTH-007',
          paCode: 'REL-MED-90182',
          schemeCode: 'RELIANCE',
          schemeName: 'Reliance Health HMO',
          clientName: 'Emeka Christian Onuorah',
          folderNumber: '1089A1',
          category: 'MEDICATION',
          serviceName: 'Typhoid Panel, Complete Blood Count & IV Antibiotics Course',
          requestingDoctor: 'Dr. Joy Umeh',
          tariffAmount: 32000,
          patientCopay: 3200,
          coverageAmount: 28800,
          requestDate: '2026-09-23',
          expiryDate: '2026-10-23',
          status: 'APPROVED',
          notes: 'Instant pre-auth granted via Reliance API.',
        },
        {
          id: 'AUTH-008',
          paCode: 'NHIA-OPH-33291',
          schemeCode: 'NHIA',
          schemeName: 'National Health Insurance Authority (NHIA / NHIS)',
          clientName: 'Gabriel Chukwu',
          folderNumber: '1091B2',
          category: 'SURGERY',
          serviceName: 'Cataract Extraction & Intraocular Lens Implantation',
          requestingDoctor: 'Dr. Esther Nnaji',
          tariffAmount: 110000,
          patientCopay: 11000,
          coverageAmount: 99000,
          requestDate: '2026-09-24',
          expiryDate: '2026-10-24',
          status: 'APPROVED',
          notes: 'Submitted in secondary claims batch to NHIA Zonal Office.',
        },
      ];

      for (const a of seedAuths) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO insurance_authorizations (
            id, pa_code, scheme_code, scheme_name, client_name, folder_number,
            category, service_name, requesting_doctor, tariff_amount, patient_copay,
            coverage_amount, request_date, expiry_date, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (pa_code) DO NOTHING
        `, a.id, a.paCode, a.schemeCode, a.schemeName, a.clientName, a.folderNumber, a.category, a.serviceName, a.requestingDoctor, a.tariffAmount, a.patientCopay, a.coverageAmount, a.requestDate, a.expiryDate, a.status, a.notes);
      }
    }
  } catch (err) {
    console.error('Error ensuring insurance_authorizations table in PostgreSQL:', err);
  }
}

router.get('/authorizations', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAuthorizationsTable();
    const { schemeCode, category, status, search, folderNumber } = req.query;

    let query = `SELECT * FROM insurance_authorizations WHERE 1=1`;
    const params: any[] = [];

    if (schemeCode && schemeCode !== 'ALL') {
      params.push(schemeCode);
      query += ` AND scheme_code = $${params.length}`;
    }
    if (category && category !== 'ALL') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (status && status !== 'ALL') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (folderNumber) {
      params.push(folderNumber);
      query += ` AND folder_number = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (client_name ILIKE $${params.length} OR folder_number ILIKE $${params.length} OR pa_code ILIKE $${params.length} OR service_name ILIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC, id DESC`;

    const rows: any = await prisma.$queryRawUnsafe(query, ...params);
    const data = rows.map((r: any) => ({
      id: r.id,
      paCode: r.pa_code,
      schemeCode: r.scheme_code,
      schemeName: r.scheme_name,
      clientName: r.client_name,
      folderNumber: r.folder_number,
      category: r.category,
      serviceName: r.service_name,
      requestingDoctor: r.requesting_doctor,
      tariffAmount: Number(r.tariff_amount || 0),
      patientCopay: Number(r.patient_copay || 0),
      coverageAmount: Number(r.coverage_amount || 0),
      requestDate: r.request_date,
      expiryDate: r.expiry_date,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json({ success: true, data, total: data.length });
  } catch (e) {
    next(e);
  }
});

router.post('/authorizations', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAuthorizationsTable();
    const {
      schemeCode = 'NHIA',
      clientName,
      folderNumber,
      category = 'LABORATORY',
      serviceName,
      requestingDoctor = 'Attending Physician',
      tariffAmount = 10000,
      copayPct = 10,
      patientCopay: customCopay,
      coverageAmount: customCoverage,
      requestDate,
      expiryDate,
      status = 'APPROVED',
      notes,
    } = req.body;

    if (!clientName || !folderNumber || !serviceName) {
      return res.status(400).json({ message: 'Patient Name, Hospital Folder Number, and Service Name are required.' });
    }

    const schemeObj = DEFAULT_SCHEMES.find(s => s.code === schemeCode) || DEFAULT_SCHEMES[0];
    const categoryPrefix = (category || 'LAB').slice(0, 3).toUpperCase();
    const generatedCode = req.body.paCode || `${schemeCode}-${categoryPrefix}-${Math.floor(10000 + Math.random() * 90000)}`;

    const numTariff = Number(tariffAmount) || 0;
    const numCopayPct = Number(copayPct) !== undefined ? Number(copayPct) : 10;
    const calcCopay = customCopay !== undefined ? Number(customCopay) : Math.round((numTariff * numCopayPct) / 100);
    const calcCoverage = customCoverage !== undefined ? Number(customCoverage) : (numTariff - calcCopay);

    const id = `AUTH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const reqD = requestDate || new Date().toISOString().slice(0, 10);
    const expD = expiryDate || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
    const noteText = notes || 'Prior authorization code approved and validated against benefit schedule.';

    await prisma.$executeRawUnsafe(`
      INSERT INTO insurance_authorizations (
        id, pa_code, scheme_code, scheme_name, client_name, folder_number,
        category, service_name, requesting_doctor, tariff_amount, patient_copay,
        coverage_amount, request_date, expiry_date, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, id, generatedCode, schemeCode, schemeObj?.name || schemeCode, clientName, folderNumber, category, serviceName, requestingDoctor, numTariff, calcCopay, calcCoverage, reqD, expD, status, noteText);

    res.status(201).json({
      success: true,
      message: 'Prior-Authorization code issued and saved to PostgreSQL',
      data: {
        id,
        paCode: generatedCode,
        schemeCode,
        schemeName: schemeObj?.name || schemeCode,
        clientName,
        folderNumber,
        category,
        serviceName,
        requestingDoctor,
        tariffAmount: numTariff,
        patientCopay: calcCopay,
        coverageAmount: calcCoverage,
        requestDate: reqD,
        expiryDate: expD,
        status,
        notes: noteText,
      }
    });
  } catch (e: any) {
    if (e.message?.includes('duplicate key') || e.code === '23505') {
      return res.status(400).json({ message: 'A prior-authorization with this PA Code already exists. Please regenerate.' });
    }
    next(e);
  }
});

router.put('/authorizations/:id', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAuthorizationsTable();
    const { id } = req.params;
    const {
      paCode,
      schemeCode = 'NHIA',
      clientName,
      folderNumber,
      category,
      serviceName,
      requestingDoctor,
      tariffAmount,
      patientCopay,
      coverageAmount,
      expiryDate,
      status,
      notes
    } = req.body;

    const schemeObj = DEFAULT_SCHEMES.find(s => s.code === schemeCode);
    const numTariff = Number(tariffAmount || 0);
    const numCopay = Number(patientCopay || 0);
    const numCoverage = Number(coverageAmount || (numTariff - numCopay));

    await prisma.$executeRawUnsafe(`
      UPDATE insurance_authorizations
      SET pa_code = $1,
          scheme_code = $2,
          scheme_name = $3,
          client_name = $4,
          folder_number = $5,
          category = $6,
          service_name = $7,
          requesting_doctor = $8,
          tariff_amount = $9,
          patient_copay = $10,
          coverage_amount = $11,
          expiry_date = $12,
          status = $13,
          notes = $14,
          updated_at = NOW()
      WHERE id = $15
    `, paCode, schemeCode, schemeObj?.name || schemeCode, clientName, folderNumber, category, serviceName, requestingDoctor, numTariff, numCopay, numCoverage, expiryDate, status || 'APPROVED', notes, id);

    res.json({
      success: true,
      message: 'Authorization updated successfully in PostgreSQL',
      data: { id, paCode, schemeCode, clientName, folderNumber, category, serviceName, requestingDoctor, tariffAmount: numTariff, patientCopay: numCopay, coverageAmount: numCoverage, expiryDate, status, notes }
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/authorizations/:id/decision', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAuthorizationsTable();
    const { id } = req.params;
    const { status, notes } = req.body;

    await prisma.$executeRawUnsafe(`
      UPDATE insurance_authorizations
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          updated_at = NOW()
      WHERE id = $3
    `, status, notes, id);

    res.json({ success: true, message: `Authorization status updated to ${status}` });
  } catch (e) {
    next(e);
  }
});

router.delete('/authorizations/:id', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAuthorizationsTable();
    const { id } = req.params;
    await prisma.$executeRawUnsafe(`DELETE FROM insurance_authorizations WHERE id = $1`, id);
    res.json({ success: true, message: 'Authorization deleted successfully from PostgreSQL' });
  } catch (e) {
    next(e);
  }
});

// GET /insurance/bill-charts - Itemized patient service bill chart
router.get('/bill-charts', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAuthorizationsTable();
    const { folderNumber } = req.query;

    let query = `SELECT * FROM insurance_authorizations WHERE 1=1`;
    const params: any[] = [];
    if (folderNumber) {
      params.push(folderNumber);
      query += ` AND folder_number = $${params.length}`;
    }
    query += ` ORDER BY created_at DESC, id DESC`;

    const rows: any = await prisma.$queryRawUnsafe(query, ...params);
    const items = rows.map((r: any) => ({
      id: r.id,
      paCode: r.pa_code,
      schemeCode: r.scheme_code,
      schemeName: r.scheme_name,
      clientName: r.client_name,
      folderNumber: r.folder_number,
      category: r.category,
      serviceName: r.service_name,
      requestingDoctor: r.requesting_doctor,
      tariffAmount: Number(r.tariff_amount || 0),
      patientCopay: Number(r.patient_copay || 0),
      coverageAmount: Number(r.coverage_amount || 0),
      requestDate: r.request_date,
      expiryDate: r.expiry_date,
      status: r.status,
      notes: r.notes,
    }));

    const totalBilled = items.reduce((s: number, i: any) => s + (i.tariffAmount || 0), 0);
    const totalCovered = items.reduce((s: number, i: any) => s + (i.coverageAmount || 0), 0);
    const totalCopay = items.reduce((s: number, i: any) => s + (i.patientCopay || 0), 0);

    res.json({
      success: true,
      data: {
        items,
        summary: {
          totalItems: items.length,
          totalBilled,
          totalCovered,
          totalCopay,
          coverageRate: totalBilled > 0 ? `${Math.round((totalCovered / totalBilled) * 100)}%` : '100%',
        }
      }
    });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.10 – ACCREDITED HOSPITAL UNITS POSTGRESQL CRUD API
// ─────────────────────────────────────────────────────────────────────────────

async function ensureAccreditedUnitsTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS insurance_accredited_units (
        id VARCHAR(64) PRIMARY KEY,
        unit_name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE NOT NULL,
        accreditation_level VARCHAR(100) DEFAULT 'PRIMARY_SECONDARY',
        lead_officer VARCHAR(255),
        schemes_covered JSONB DEFAULT '[]'::jsonb,
        accreditation_date VARCHAR(50),
        renewal_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'ACCREDITED',
        services TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const countRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM insurance_accredited_units`);
    if (Number(countRes?.[0]?.count || 0) === 0) {
      const seedUnits = [
        {
          id: 'UNT-001',
          unitName: 'Accident & Emergency (A&E) / Casualty Department',
          code: 'EMERGENCY_DEPT',
          accreditationLevel: 'TERTIARY_24_7',
          leadOfficer: 'Dr. Ifeanyi Okoro (Emergency Director)',
          schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
          accreditationDate: '2024-01-15',
          renewalDate: '2027-12-31',
          status: 'ACCREDITED',
          services: 'Resuscitation, STAT Trauma, Minor Surgery, Acute Admissions, 24/7 Casualty',
        },
        {
          id: 'UNT-002',
          unitName: 'General Outpatient Department (GOPD) & Primary Care Clinic',
          code: 'OPD_CLINIC',
          accreditationLevel: 'PRIMARY_SECONDARY',
          leadOfficer: 'Dr. Franklin Madu (HOD Outpatients)',
          schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
          accreditationDate: '2024-01-15',
          renewalDate: '2027-12-31',
          status: 'ACCREDITED',
          services: 'Primary Consultations, Health Screenings, Chronic Disease Care, Immunization',
        },
        {
          id: 'UNT-003',
          unitName: 'Antenatal Care (ANC) & Labour Suite',
          code: 'MATERNITY_ANC',
          accreditationLevel: 'COMPREHENSIVE_EMOC',
          leadOfficer: 'Dr. Chinedu Eze (Consultant Obstetrician)',
          schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
          accreditationDate: '2024-03-01',
          renewalDate: '2027-12-31',
          status: 'ACCREDITED',
          services: 'Antenatal Visits, Normal Deliveries, High-Risk Pregnancies, Postnatal Care',
        },
        {
          id: 'UNT-004',
          unitName: 'Inpatient Clinical Wards (Male, Female, Paediatrics)',
          code: 'INPATIENT_WARDS',
          accreditationLevel: 'SECONDARY_CARE_WARDS',
          leadOfficer: 'Matron Ngozi Ugwu (Chief Nursing Officer)',
          schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
          accreditationDate: '2024-01-15',
          renewalDate: '2027-12-31',
          status: 'ACCREDITED',
          services: 'Inpatient Care, 24/7 Nursing, Post-Operative Recovery, Paediatric Admissions',
        },
        {
          id: 'UNT-005',
          unitName: 'Clinical Diagnostic Laboratory (LIMS)',
          code: 'LAB_DIAGNOSTICS',
          accreditationLevel: 'TERTIARY_ISO15189',
          leadOfficer: 'Scientist Emeka Anayo (Chief Medical Lab Scientist)',
          schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
          accreditationDate: '2024-02-10',
          renewalDate: '2027-12-31',
          status: 'ACCREDITED',
          services: 'Haematology, Clinical Chemistry, Microbiology, Parasitology, Blood Bank Crossmatching',
        },
        {
          id: 'UNT-006',
          unitName: 'Radiology & Medical Imaging Center',
          code: 'RADIOLOGY_IMAGING',
          accreditationLevel: 'ADVANCED_IMAGING',
          leadOfficer: 'Dr. Mary Nnamani (Chief Consultant Radiologist)',
          schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
          accreditationDate: '2024-04-12',
          renewalDate: '2027-12-31',
          status: 'ACCREDITED',
          services: 'Digital X-Ray, Abdominal/Pelvic Ultrasound, 4D Obstetric Scans, CT Scanner, Mammography',
        },
        {
          id: 'UNT-007',
          unitName: 'Main Surgical Operating Theatres (Theatres 1 & 2)',
          code: 'SURGICAL_THEATRE',
          accreditationLevel: 'MAJOR_SURGICAL_SUITE',
          leadOfficer: 'Dr. Obinna Ugwu (Chief of Surgery)',
          schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
          accreditationDate: '2024-01-15',
          renewalDate: '2027-12-31',
          status: 'ACCREDITED',
          services: 'General Surgery, Orthopaedics, Gynaecological Surgery, Caesarean Sections, Laparoscopy',
        },
        {
          id: 'UNT-008',
          unitName: 'Pharmacy Dispensary & Drug Revolving Fund',
          code: 'PHARMACY_DISPENSARY',
          accreditationLevel: 'FORMULARY_DISPENSARY',
          leadOfficer: 'Pharm. Kalu Ndukwe (Head of Pharmacy)',
          schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
          accreditationDate: '2024-01-15',
          renewalDate: '2027-12-31',
          status: 'ACCREDITED',
          services: 'Formulary Dispensing, Antenatal Medicines, Controlled Drugs, Prescription Auditing',
        },
        {
          id: 'UNT-009',
          unitName: 'Rehabilitation & Physiotherapy Unit',
          code: 'PHYSIOTHERAPY',
          accreditationLevel: 'REHABILITATION_CLINIC',
          leadOfficer: 'PT. Chiamaka Eze (Chief Physiotherapist)',
          schemesCovered: ['NHIA', 'ESAUHC', 'CHIKADIBIA', 'NDMHS', 'HYGEIA'],
          accreditationDate: '2024-05-18',
          renewalDate: '2027-12-31',
          status: 'ACCREDITED',
          services: 'Post-Stroke Rehab, Orthopaedic Rehab, Paediatric Neuro-Developmental Therapy',
        },
      ];

      for (const u of seedUnits) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO insurance_accredited_units (id, unit_name, code, accreditation_level, lead_officer, schemes_covered, accreditation_date, renewal_date, status, services)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
          ON CONFLICT (code) DO NOTHING
        `, u.id, u.unitName, u.code, u.accreditationLevel, u.leadOfficer, JSON.stringify(u.schemesCovered), u.accreditationDate, u.renewalDate, u.status, u.services);
      }
    }
  } catch (err) {
    console.error('Error ensuring insurance_accredited_units table in PostgreSQL:', err);
  }
}

router.get('/accredited-units', authMiddleware, async (_req, res, next) => {
  try {
    await ensureAccreditedUnitsTable();
    const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM insurance_accredited_units ORDER BY unit_name ASC`);
    const formatted = rows.map((u: any) => {
      let schemesCovered: any[] = [];
      try {
        schemesCovered = typeof u.schemes_covered === 'string' ? JSON.parse(u.schemes_covered) : u.schemes_covered;
      } catch {
        schemesCovered = [];
      }
      return {
        id: u.id,
        unitName: u.unit_name,
        code: u.code,
        accreditationLevel: u.accreditation_level,
        leadOfficer: u.lead_officer,
        schemesCovered: Array.isArray(schemesCovered) ? schemesCovered : [],
        accreditationDate: u.accreditation_date,
        renewalDate: u.renewal_date,
        status: u.status,
        services: u.services,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      };
    });
    res.json({ success: true, data: formatted, total: formatted.length });
  } catch (e) {
    next(e);
  }
});

router.post('/accredited-units', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAccreditedUnitsTable();
    const { unitName, code, accreditationLevel, leadOfficer, schemesCovered, accreditationDate, renewalDate, status, services } = req.body;
    if (!unitName) {
      return res.status(400).json({ message: 'Unit name is required.' });
    }
    const id = `UNT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const unitCode = (code && code.trim()) ? code.trim().toUpperCase().replace(/\s+/g, '_') : `UNT_${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanSchemes = Array.isArray(schemesCovered) ? schemesCovered : [];

    await prisma.$executeRawUnsafe(`
      INSERT INTO insurance_accredited_units (id, unit_name, code, accreditation_level, lead_officer, schemes_covered, accreditation_date, renewal_date, status, services)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
    `, id, unitName, unitCode, accreditationLevel || 'PRIMARY_SECONDARY', leadOfficer || 'Unit Head / Coordinator', JSON.stringify(cleanSchemes), accreditationDate || new Date().toISOString().slice(0, 10), renewalDate || '2027-12-31', status || 'ACCREDITED', services || 'Clinical and diagnostic services');

    res.status(201).json({
      success: true,
      message: 'Accredited unit added successfully in PostgreSQL',
      data: { id, unitName, code: unitCode, accreditationLevel, leadOfficer, schemesCovered: cleanSchemes, accreditationDate, renewalDate, status: status || 'ACCREDITED', services }
    });
  } catch (e: any) {
    if (e.message?.includes('duplicate key') || e.message?.includes('unique constraint') || e.code === '23505') {
      return res.status(400).json({ message: 'An accredited unit with this code already exists. Please choose a unique code.' });
    }
    next(e);
  }
});

router.put('/accredited-units/:id', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAccreditedUnitsTable();
    const { id } = req.params;
    const { unitName, code, accreditationLevel, leadOfficer, schemesCovered, accreditationDate, renewalDate, status, services } = req.body;
    if (!unitName) {
      return res.status(400).json({ message: 'Unit name is required.' });
    }
    const cleanSchemes = Array.isArray(schemesCovered) ? schemesCovered : [];

    await prisma.$executeRawUnsafe(`
      UPDATE insurance_accredited_units
      SET unit_name = $1, code = $2, accreditation_level = $3, lead_officer = $4, schemes_covered = $5::jsonb, accreditation_date = $6, renewal_date = $7, status = $8, services = $9, updated_at = NOW()
      WHERE id = $10
    `, unitName, code, accreditationLevel, leadOfficer, JSON.stringify(cleanSchemes), accreditationDate, renewalDate, status || 'ACCREDITED', services, id);

    res.json({
      success: true,
      message: 'Accredited unit updated successfully in PostgreSQL',
      data: { id, unitName, code, accreditationLevel, leadOfficer, schemesCovered: cleanSchemes, accreditationDate, renewalDate, status, services }
    });
  } catch (e: any) {
    if (e.message?.includes('duplicate key') || e.message?.includes('unique constraint') || e.code === '23505') {
      return res.status(400).json({ message: 'An accredited unit with this code already exists. Please choose a unique code.' });
    }
    next(e);
  }
});

router.delete('/accredited-units/:id', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAccreditedUnitsTable();
    const { id } = req.params;
    await prisma.$executeRawUnsafe(`DELETE FROM insurance_accredited_units WHERE id = $1`, id);
    res.json({ success: true, message: 'Accredited unit deleted successfully from PostgreSQL' });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.10 – POSTGRESQL INSURANCE AUDIT & DAILY RECEIPTS API
// ─────────────────────────────────────────────────────────────────────────────

async function ensureAuditTables() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS insurance_daily_receipts (
        id VARCHAR(64) PRIMARY KEY,
        receipt_number VARCHAR(100) UNIQUE NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        folder_number VARCHAR(100) NOT NULL,
        scheme_code VARCHAR(100) NOT NULL,
        scheme_name VARCHAR(255),
        service_rendered VARCHAR(255) NOT NULL,
        amount_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
        payment_method VARCHAR(100) DEFAULT 'POS / Debit Card',
        cashier_name VARCHAR(100) DEFAULT 'Mary Okon (Cash Desk #01)',
        status VARCHAR(50) DEFAULT 'VALID',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS insurance_canceled_receipts (
        id VARCHAR(64) PRIMARY KEY,
        receipt_number VARCHAR(100) NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        folder_number VARCHAR(100) NOT NULL,
        scheme_code VARCHAR(100) NOT NULL,
        amount DOUBLE PRECISION NOT NULL DEFAULT 0,
        reason TEXT NOT NULL,
        authorized_by VARCHAR(255) NOT NULL,
        cashier_name VARCHAR(100) DEFAULT 'Mary Okon',
        original_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        cancellation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS insurance_daily_visits (
        id VARCHAR(64) PRIMARY KEY,
        folder_number VARCHAR(100) NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        scheme_code VARCHAR(100) NOT NULL,
        clinic_unit VARCHAR(100) NOT NULL,
        visit_time VARCHAR(50),
        status VARCHAR(50) DEFAULT 'COMPLETED',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS insurance_specialist_fees (
        id VARCHAR(64) PRIMARY KEY,
        specialty VARCHAR(255) NOT NULL,
        statutory_tariff DOUBLE PRECISION NOT NULL DEFAULT 0,
        hmo_coverage DOUBLE PRECISION NOT NULL DEFAULT 0,
        patient_copay DOUBLE PRECISION NOT NULL DEFAULT 0,
        primary_requirements TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Seed Receipts if empty
    const recCountRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM insurance_daily_receipts`);
    if (Number(recCountRes?.[0]?.count || 0) === 0) {
      const seedReceipts = [
        { id: 'REC-001', receiptNumber: 'INS-REC-2026-0924-8801', patientName: 'Mrs. Chioma Ezechukwu', folderNumber: '107T6', schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA / NHIS)', serviceRendered: '10% Co-Payment for FBC, LFT & Lipid Panel', amountPaid: 1450, paymentMethod: 'POS / Debit Card', cashierName: 'Mary Okon (Cash Desk #01)', status: 'VALID' },
        { id: 'REC-002', receiptNumber: 'INS-REC-2026-0924-8802', patientName: 'Mazi Chukwuma Eze', folderNumber: '107G6', schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency for Universal Health Coverage', serviceRendered: '10% Co-Payment for Pelvic Ultrasound Scan', amountPaid: 2800, paymentMethod: 'Cash', cashierName: 'Mary Okon (Cash Desk #01)', status: 'VALID' },
        { id: 'REC-003', receiptNumber: 'INS-REC-2026-0924-8803', patientName: 'Blessing Nkechi Ugwu', folderNumber: '108UX', schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', serviceRendered: '10% Co-Payment for Inpatient Ward Stay & Nursing Care', amountPaid: 3500, paymentMethod: 'Bank Transfer (Monnify)', cashierName: 'Peter Obi (Cash Desk #02)', status: 'VALID' },
        { id: 'REC-004', receiptNumber: 'INS-REC-2026-0924-8804', patientName: 'Ambless Sidney', folderNumber: '10857', schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', serviceRendered: '10% Co-Payment for Antibiotics & Prescription Drugs', amountPaid: 1850, paymentMethod: 'Cash', cashierName: 'Mary Okon (Cash Desk #01)', status: 'VALID' },
        { id: 'REC-005', receiptNumber: 'INS-REC-2026-0924-8805', patientName: 'Hilary Chike', folderNumber: '1084K1', schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA / NHIS)', serviceRendered: '10% Co-Payment for Specialist Cardiologist Review', amountPaid: 2500, paymentMethod: 'POS / Debit Card', cashierName: 'Peter Obi (Cash Desk #02)', status: 'VALID' },
      ];
      for (const r of seedReceipts) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO insurance_daily_receipts (id, receipt_number, patient_name, folder_number, scheme_code, scheme_name, service_rendered, amount_paid, payment_method, cashier_name, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (receipt_number) DO NOTHING
        `, r.id, r.receiptNumber, r.patientName, r.folderNumber, r.schemeCode, r.schemeName, r.serviceRendered, r.amountPaid, r.paymentMethod, r.cashierName, r.status);
      }
    }

    // Seed Canceled Receipts if empty
    const cancelCountRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM insurance_canceled_receipts`);
    if (Number(cancelCountRes?.[0]?.count || 0) === 0) {
      const seedCanceled = [
        { id: 'CAN-001', receiptNumber: 'INS-REC-2026-0924-8799', patientName: 'Elizabeth Nwachukwu', folderNumber: '109L4', schemeCode: 'NHIA', amount: 4500, reason: 'Billed 100% private tariff in error before insurance policy confirmation was verified. Corrected to 10% co-pay.', authorizedBy: 'Emmanuel Vegher (Audit Supervisor)', cashierName: 'Mary Okon' },
        { id: 'CAN-002', receiptNumber: 'INS-REC-2026-0924-8785', patientName: 'Jude Unamka', folderNumber: '105XY', schemeCode: 'ESAUHC', amount: 15000, reason: 'Duplicate payment entry made on POS terminal. Customer account credited and duplicate canceled.', authorizedBy: 'Emmanuel Vegher (Audit Supervisor)', cashierName: 'Peter Obi' },
      ];
      for (const c of seedCanceled) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO insurance_canceled_receipts (id, receipt_number, patient_name, folder_number, scheme_code, amount, reason, authorized_by, cashier_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, c.id, c.receiptNumber, c.patientName, c.folderNumber, c.schemeCode, c.amount, c.reason, c.authorizedBy, c.cashierName);
      }
    }

    // Seed Daily Visits if empty
    const visitsCountRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM insurance_daily_visits`);
    if (Number(visitsCountRes?.[0]?.count || 0) === 0) {
      const seedVisits = [
        { id: 'VIS-001', folderNumber: '107T6', patientName: 'Mrs. Chioma Ezechukwu', schemeCode: 'NHIA', clinicUnit: 'GOPD Clinic', visitTime: '08:05', status: 'COMPLETED' },
        { id: 'VIS-002', folderNumber: '107G6', patientName: 'Mazi Chukwuma Eze', schemeCode: 'ESAUHC', clinicUnit: 'Radiology / Ultrasound', visitTime: '09:12', status: 'COMPLETED' },
        { id: 'VIS-003', folderNumber: '108UX', patientName: 'Blessing Nkechi Ugwu', schemeCode: 'CHIKADIBIA', clinicUnit: 'Antenatal & Labour Suite', visitTime: '10:30', status: 'IN_PROGRESS' },
        { id: 'VIS-004', folderNumber: '10857', patientName: 'Ambless Sidney', schemeCode: 'NDMHS', clinicUnit: 'Specialist Clinic', visitTime: '11:00', status: 'COMPLETED' },
        { id: 'VIS-005', folderNumber: '1084K1', patientName: 'Hilary Chike', schemeCode: 'NHIA', clinicUnit: 'Cardiology Review', visitTime: '12:15', status: 'IN_PROGRESS' },
        { id: 'VIS-006', folderNumber: '109L4', patientName: 'Elizabeth Nwachukwu', schemeCode: 'NHIA', clinicUnit: 'GOPD Clinic', visitTime: '12:45', status: 'WAITING' },
        { id: 'VIS-007', folderNumber: '105XY', patientName: 'Jude Unamka', schemeCode: 'ESAUHC', clinicUnit: 'Eye & Dental Clinic', visitTime: '13:10', status: 'WAITING' },
      ];
      for (const v of seedVisits) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO insurance_daily_visits (id, folder_number, patient_name, scheme_code, clinic_unit, visit_time, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, v.id, v.folderNumber, v.patientName, v.schemeCode, v.clinicUnit, v.visitTime, v.status);
      }
    }

    // Seed Specialist Fees if empty
    const specCountRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM insurance_specialist_fees`);
    if (Number(specCountRes?.[0]?.count || 0) === 0) {
      const seedSpec = [
        { id: 'SPEC-001', specialty: 'Consultant Cardiologist', statutoryTariff: 15000, hmoCoverage: 13500, patientCopay: 1500, primaryRequirements: 'Referral Letter + Prior Auth Code' },
        { id: 'SPEC-002', specialty: 'Consultant Obstetrician & Gynaecologist (O&G)', statutoryTariff: 15000, hmoCoverage: 13500, patientCopay: 1500, primaryRequirements: 'Covered under Maternal Window' },
        { id: 'SPEC-003', specialty: 'Consultant Paediatrician', statutoryTariff: 12000, hmoCoverage: 10800, patientCopay: 1200, primaryRequirements: 'Under-5 free under NHIA/BHCPF' },
        { id: 'SPEC-004', specialty: 'Consultant General Surgeon', statutoryTariff: 15000, hmoCoverage: 13500, patientCopay: 1500, primaryRequirements: 'Surgical Booking Form Required' },
        { id: 'SPEC-005', specialty: 'Consultant Orthopaedic Surgeon', statutoryTariff: 18000, hmoCoverage: 16200, patientCopay: 1800, primaryRequirements: 'X-Ray / Trauma Film Required' },
        { id: 'SPEC-006', specialty: 'Consultant Ophthalmologist (Eye Specialist)', statutoryTariff: 12000, hmoCoverage: 10800, patientCopay: 1200, primaryRequirements: 'Visual Acuity Chart Attached' },
        { id: 'SPEC-007', specialty: 'Consultant ENT Surgeon (Ear, Nose & Throat)', statutoryTariff: 12000, hmoCoverage: 10800, patientCopay: 1200, primaryRequirements: 'Audiogram Report' },
        { id: 'SPEC-008', specialty: 'Consultant Physician / Internal Medicine', statutoryTariff: 15000, hmoCoverage: 13500, patientCopay: 1500, primaryRequirements: 'Chronic Disease Regimen Review' },
        { id: 'SPEC-009', specialty: 'Consultant Dental Surgeon', statutoryTariff: 10000, hmoCoverage: 9000, patientCopay: 1000, primaryRequirements: 'Dental Charting Assessment' },
      ];
      for (const s of seedSpec) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO insurance_specialist_fees (id, specialty, statutory_tariff, hmo_coverage, patient_copay, primary_requirements)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, s.id, s.specialty, s.statutoryTariff, s.hmoCoverage, s.patientCopay, s.primaryRequirements);
      }
    }
  } catch (err) {
    console.error('Error ensuring audit tables in PostgreSQL:', err);
  }
}

// GET /insurance/audit-summary - Live PostgreSQL queries for all audit tables
router.get('/audit-summary', authMiddleware, async (_req, res, next) => {
  try {
    await ensureAuditTables();

    const [receiptRows, cancelRows, visitRows, specRows]: [any, any, any, any] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM insurance_daily_receipts ORDER BY created_at DESC LIMIT 50`),
      prisma.$queryRawUnsafe(`SELECT * FROM insurance_canceled_receipts ORDER BY created_at DESC LIMIT 50`),
      prisma.$queryRawUnsafe(`SELECT * FROM insurance_daily_visits ORDER BY created_at DESC LIMIT 50`),
      prisma.$queryRawUnsafe(`SELECT * FROM insurance_specialist_fees ORDER BY specialty ASC`),
    ]);

    const dailyReceipts = receiptRows.map((r: any) => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      patientName: r.patient_name,
      folderNumber: r.folder_number,
      schemeCode: r.scheme_code,
      schemeName: r.scheme_name,
      serviceRendered: r.service_rendered,
      amountPaid: Number(r.amount_paid || 0),
      paymentMethod: r.payment_method,
      cashierName: r.cashier_name,
      status: r.status,
      timestamp: r.created_at,
    }));

    const canceledReceipts = cancelRows.map((c: any) => ({
      id: c.id,
      receiptNumber: c.receipt_number,
      patientName: c.patient_name,
      folderNumber: c.folder_number,
      schemeCode: c.scheme_code,
      amount: Number(c.amount || 0),
      reason: c.reason,
      authorizedBy: c.authorized_by,
      cashierName: c.cashier_name,
      originalTimestamp: c.original_timestamp,
      cancellationTimestamp: c.cancellation_timestamp || c.created_at,
    }));

    const dailyFolderVisits = visitRows.map((v: any) => ({
      id: v.id,
      folderNumber: v.folder_number,
      patientName: v.patient_name,
      schemeCode: v.scheme_code,
      clinicUnit: v.clinic_unit,
      visitTime: v.visit_time,
      status: v.status,
    }));

    const specialistConsultationFees = specRows.map((s: any) => ({
      id: s.id,
      specialty: s.specialty,
      statutoryTariff: Number(s.statutory_tariff || 0),
      hmoCoverage: Number(s.hmo_coverage || 0),
      patientCopay: Number(s.patient_copay || 0),
      primaryRequirements: s.primary_requirements,
    }));

    res.json({
      success: true,
      data: {
        reportingDate: new Date().toISOString().slice(0, 10),
        dailyReceipts,
        canceledReceipts,
        dailyFolderVisits,
        specialistConsultationFees,
      }
    });
  } catch (e) {
    next(e);
  }
});

// POST /insurance/audit/receipts - Record a new cashier co-payment receipt in PostgreSQL
router.post('/audit/receipts', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAuditTables();
    const { patientName, folderNumber, schemeCode, schemeName, serviceRendered, amountPaid, paymentMethod, cashierName } = req.body;
    const id = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const receiptNumber = `INS-REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    await prisma.$executeRawUnsafe(`
      INSERT INTO insurance_daily_receipts (id, receipt_number, patient_name, folder_number, scheme_code, scheme_name, service_rendered, amount_paid, payment_method, cashier_name, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'VALID')
    `, id, receiptNumber, patientName, folderNumber, schemeCode, schemeName, serviceRendered, Number(amountPaid || 0), paymentMethod || 'Cash', cashierName || 'Cashier Desk');

    res.status(201).json({
      success: true,
      message: 'Receipt recorded successfully in PostgreSQL',
      data: { id, receiptNumber, patientName, folderNumber, schemeCode, serviceRendered, amountPaid: Number(amountPaid || 0) }
    });
  } catch (e) {
    next(e);
  }
});

// POST /insurance/audit/cancel-receipt - Void/cancel a receipt with audit reason in PostgreSQL
router.post('/audit/cancel-receipt', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureAuditTables();
    const { receiptNumber, patientName, folderNumber, schemeCode, amount, reason, authorizedBy, cashierName } = req.body;
    const id = `CAN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    await prisma.$executeRawUnsafe(`
      INSERT INTO insurance_canceled_receipts (id, receipt_number, patient_name, folder_number, scheme_code, amount, reason, authorized_by, cashier_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, id, receiptNumber, patientName, folderNumber, schemeCode, Number(amount || 0), reason || 'Voided by audit', authorizedBy || 'Emmanuel Vegher (Audit Head)', cashierName || 'Cashier Desk');

    // Update receipt status if exists
    await prisma.$executeRawUnsafe(`UPDATE insurance_daily_receipts SET status = 'VOIDED' WHERE receipt_number = $1`, receiptNumber).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Canceled receipt logged in PostgreSQL audit trail',
      data: { id, receiptNumber, reason, authorizedBy }
    });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRISMA PROVIDERS, PLANS & POLICIES API (Preserved for compatibility)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/providers', authMiddleware, async (_req, res, next) => {
  try {
    await ensureDatabaseSeeded();
    const providers = await prisma.insuranceProvider.findMany({ include: { plans: true } });
    res.json(providers);
  } catch (e) { next(e); }
});

router.get('/plans', authMiddleware, async (_req, res, next) => {
  try {
    const plans = await prisma.insuranceBenefitPlan.findMany({ include: { provider: true } });
    res.json(plans);
  } catch (e) { next(e); }
});

router.get('/policies', authMiddleware, async (req: any, res, next) => {
  try {
    const where: any = {};
    if (req.query.patientId) where.patientId = req.query.patientId;
    if (req.query.membershipNumber) where.membershipNumber = req.query.membershipNumber;
    const policies = await prisma.patientInsurancePolicy.findMany({
      where,
      include: { provider: true, plan: true, patient: true },
      orderBy: { effectiveDate: 'desc' },
      take: 100
    });
    res.json({ success: true, data: policies, total: policies.length });
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.11 – LIVE POSTGRESQL INSURANCE CLAIMS & DASHBOARD METRICS API
// ─────────────────────────────────────────────────────────────────────────────

router.get('/claims', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureDatabaseSeeded();
    const { schemeCode, status, limit, patientId } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (patientId) {
      where.patientId = patientId;
    }
    if (schemeCode && schemeCode !== 'ALL') {
      where.policy = {
        provider: {
          code: schemeCode
        }
      };
    }

    const max = limit ? parseInt(limit as string, 10) : 50;

    // Direct Live Query to PostgreSQL via Prisma
    const dbClaims = await prisma.claim.findMany({
      where,
      include: {
        policy: {
          include: {
            provider: true,
            plan: true,
            patient: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: max,
    });

    const formatted = dbClaims.map(c => {
      const patient = c.policy?.patient;
      const provider = c.policy?.provider;
      const plan = c.policy?.plan;
      const pName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Insured Patient';
      const pNumber = patient?.patientNumber || 'FF-0000';
      const provCode = provider?.code || 'HMO';
      const provName = provider?.name || 'Health Scheme';

      return {
        id: c.id,
        claimNumber: `CLM-${provCode}-${c.id.slice(0, 8).toUpperCase()}`,
        patientId: c.patientId,
        patientName: pName,
        folderNumber: pNumber,
        insuranceProvider: provCode,
        provider: provName,
        schemeCode: provCode,
        schemeName: provName,
        planName: plan?.name || 'Standard Benefit Plan',
        membershipNumber: c.policy?.membershipNumber,
        enrolleeNumber: c.policy?.enrolleeNumber,
        amount: c.totalAmount || 0,
        claimAmount: c.totalAmount || 0,
        tariffAmount: c.totalAmount || 0,
        approvedAmount: c.approvedAmount || 0,
        status: c.status,
        submittedAt: c.createdAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      };
    });

    // Compute live summary statistics directly from PostgreSQL
    const allDbClaims = await prisma.claim.findMany({
      select: { status: true, totalAmount: true }
    });

    const summary = {
      totalClaims: allDbClaims.length,
      pendingReview: allDbClaims.filter(c => c.status === 'PENDING' || c.status === 'SUBMITTED' || c.status === 'DRAFT').length,
      approved: allDbClaims.filter(c => c.status === 'APPROVED' || c.status === 'PAID').length,
      rejected: allDbClaims.filter(c => c.status === 'REJECTED' || c.status === 'DECLINED').length,
      inProgress: allDbClaims.filter(c => c.status === 'IN_PROGRESS' || c.status === 'UNDER_REVIEW').length,
      totalClaimedAmount: allDbClaims.reduce((sum, c) => sum + (c.totalAmount || 0), 0),
    };

    res.json({
      success: true,
      data: formatted,
      claims: formatted,
      total: allDbClaims.length,
      summary,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/claims', authMiddleware, async (req: any, res, next) => {
  try {
    const { patientId, policyId, amount, totalAmount, status } = req.body;
    
    let targetPolicyId = policyId;
    let targetPatientId = patientId;

    if (!targetPolicyId && targetPatientId) {
      const pol = await prisma.patientInsurancePolicy.findFirst({
        where: { patientId: targetPatientId, isActive: true }
      });
      if (pol) targetPolicyId = pol.id;
    }

    if (!targetPolicyId) {
      const anyPol = await prisma.patientInsurancePolicy.findFirst({
        where: { isActive: true }
      });
      if (anyPol) {
        targetPolicyId = anyPol.id;
        targetPatientId = targetPatientId || anyPol.patientId;
      }
    }

    if (!targetPolicyId || !targetPatientId) {
      return res.status(400).json({ message: 'Valid insurance policy and patient required to create claim.' });
    }

    const created = await prisma.claim.create({
      data: {
        patientId: targetPatientId,
        policyId: targetPolicyId,
        status: status || 'SUBMITTED',
        totalAmount: Number(amount || totalAmount) || 50000,
        approvedAmount: 0,
      },
      include: {
        policy: {
          include: {
            provider: true,
            plan: true,
            patient: true,
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: created.id,
        claimNumber: `CLM-${created.policy?.provider?.code || 'HMO'}-${created.id.slice(0, 8).toUpperCase()}`,
        patientName: `${created.policy?.patient?.firstName || ''} ${created.policy?.patient?.lastName || ''}`.trim(),
        insuranceProvider: created.policy?.provider?.code,
        amount: created.totalAmount,
        status: created.status,
        createdAt: created.createdAt,
      }
    });
  } catch (e) {
    next(e);
  }
});

router.get('/dashboard-summary', authMiddleware, async (_req: any, res, next) => {
  try {
    await ensureDatabaseSeeded();
    const [claims, policiesCount, providersCount] = await Promise.all([
      prisma.claim.findMany({
        select: { status: true, totalAmount: true, approvedAmount: true, createdAt: true }
      }),
      prisma.patientInsurancePolicy.count({ where: { isActive: true } }),
      prisma.insuranceProvider.count({ where: { isActive: true } }),
    ]);

    const totalClaims = claims.length;
    const pending = claims.filter(c => c.status === 'PENDING' || c.status === 'SUBMITTED' || c.status === 'DRAFT').length;
    const approved = claims.filter(c => c.status === 'APPROVED' || c.status === 'PAID').length;
    const rejected = claims.filter(c => c.status === 'REJECTED').length;
    const inProgress = claims.filter(c => c.status === 'IN_PROGRESS').length;
    const totalClaimed = claims.reduce((s, c) => s + (c.totalAmount || 0), 0);
    const totalApproved = claims.reduce((s, c) => s + (c.approvedAmount || 0), 0);

    res.json({
      success: true,
      data: {
        totalClaims,
        pendingReview: pending,
        approvedClaims: approved,
        rejectedClaims: rejected,
        inProgressClaims: inProgress,
        totalClaimedAmount: totalClaimed,
        totalApprovedAmount: totalApproved,
        activePoliciesCount: policiesCount,
        activeProvidersCount: providersCount,
      }
    });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §16.12 – POSTGRESQL INSURANCE TARIFFS & CODE MASTER API
// ─────────────────────────────────────────────────────────────────────────────

async function ensureTariffTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS insurance_tariffs (
        id VARCHAR(64) PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        service_code VARCHAR(100) UNIQUE NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        private_fee DOUBLE PRECISION NOT NULL DEFAULT 0,
        nhia_tariff DOUBLE PRECISION NOT NULL DEFAULT 0,
        esauhc_tariff DOUBLE PRECISION NOT NULL DEFAULT 0,
        mutual_tariff DOUBLE PRECISION NOT NULL DEFAULT 0,
        hmo_tariff DOUBLE PRECISION NOT NULL DEFAULT 0,
        scheme_tariffs JSONB DEFAULT '[]'::jsonb,
        pre_auth_rule VARCHAR(255) DEFAULT 'Covered under Primary Plan',
        copay_percentage DOUBLE PRECISION DEFAULT 10,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Ensure scheme_tariffs column exists if table was created previously
    await prisma.$executeRawUnsafe(`
      ALTER TABLE insurance_tariffs ADD COLUMN IF NOT EXISTS scheme_tariffs JSONB DEFAULT '[]'::jsonb;
    `);

    const countRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM insurance_tariffs`);
    const count = Number(countRes?.[0]?.count || 0);

    if (count === 0) {
      const seedItems = [
        {
          id: 'TAR-001',
          category: 'Consultation',
          serviceCode: 'CON-GOPD-01',
          serviceName: 'General Outpatient (GOPD) Consultation',
          privateFee: 5000,
          nhiaTariff: 0,
          esauhcTariff: 0,
          mutualTariff: 0,
          hmoTariff: 4000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 0, isCapitated: true },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 0, isCapitated: true },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 0, isCapitated: true },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 0, isCapitated: true },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 4000, isCapitated: false },
          ],
          preAuthRule: 'Covered under Capitation',
          copayPercentage: 0
        },
        {
          id: 'TAR-002',
          category: 'Consultation',
          serviceCode: 'CON-SPEC-02',
          serviceName: 'Specialist Physician Consultation',
          privateFee: 15000,
          nhiaTariff: 10000,
          esauhcTariff: 10000,
          mutualTariff: 8000,
          hmoTariff: 12000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 10000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 10000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 8000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 8000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 12000, isCapitated: false },
          ],
          preAuthRule: 'Referral Letter Required',
          copayPercentage: 10
        },
        {
          id: 'TAR-003',
          category: 'Laboratory',
          serviceCode: 'LAB-FBC-01',
          serviceName: 'Full Blood Count (FBC) + ESR',
          privateFee: 4500,
          nhiaTariff: 3000,
          esauhcTariff: 3000,
          mutualTariff: 2500,
          hmoTariff: 3500,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 3000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 3000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 2500, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 2500, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 3500, isCapitated: false },
          ],
          preAuthRule: 'Primary Cover (10% Co-Pay)',
          copayPercentage: 10
        },
        {
          id: 'TAR-004',
          category: 'Laboratory',
          serviceCode: 'LAB-LIP-02',
          serviceName: 'Lipid Profile + Liver Function Tests (LFT)',
          privateFee: 14000,
          nhiaTariff: 9500,
          esauhcTariff: 9500,
          mutualTariff: 8000,
          hmoTariff: 11000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 9500, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 9500, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 8000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 8000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 11000, isCapitated: false },
          ],
          preAuthRule: 'Primary Cover (10% Co-Pay)',
          copayPercentage: 10
        },
        {
          id: 'TAR-005',
          category: 'Laboratory',
          serviceCode: 'LAB-ELE-03',
          serviceName: 'Electrolytes, Urea & Creatinine (E/U/Cr)',
          privateFee: 8500,
          nhiaTariff: 6000,
          esauhcTariff: 6000,
          mutualTariff: 5000,
          hmoTariff: 7000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 6000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 6000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 5000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 5000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 7000, isCapitated: false },
          ],
          preAuthRule: 'Primary Cover (10% Co-Pay)',
          copayPercentage: 10
        },
        {
          id: 'TAR-006',
          category: 'Radiology',
          serviceCode: 'RAD-USG-01',
          serviceName: 'Abdominal & Pelvic Ultrasound Scan',
          privateFee: 15000,
          nhiaTariff: 10500,
          esauhcTariff: 10500,
          mutualTariff: 8500,
          hmoTariff: 12000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 10500, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 10500, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 8500, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 8500, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 12000, isCapitated: false },
          ],
          preAuthRule: 'Requires PA Code',
          copayPercentage: 10
        },
        {
          id: 'TAR-007',
          category: 'Radiology',
          serviceCode: 'RAD-XRY-02',
          serviceName: 'Chest X-Ray Digital PA/Lat View',
          privateFee: 12000,
          nhiaTariff: 8500,
          esauhcTariff: 8500,
          mutualTariff: 7000,
          hmoTariff: 9500,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 8500, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 8500, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 7000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 7000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 9500, isCapitated: false },
          ],
          preAuthRule: 'Requires PA Code',
          copayPercentage: 10
        },
        {
          id: 'TAR-008',
          category: 'Radiology',
          serviceCode: 'RAD-CT-03',
          serviceName: 'High-Resolution Brain CT Scan (Plain/Contrast)',
          privateFee: 75000,
          nhiaTariff: 55000,
          esauhcTariff: 55000,
          mutualTariff: 45000,
          hmoTariff: 60000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 55000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 55000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 45000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 45000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 60000, isCapitated: false },
          ],
          preAuthRule: 'Mandatory Prior Authorization',
          copayPercentage: 10
        },
        {
          id: 'TAR-009',
          category: 'Surgery',
          serviceCode: 'SUR-CS-01',
          serviceName: 'Caesarean Section (Elective/Emergency)',
          privateFee: 250000,
          nhiaTariff: 150000,
          esauhcTariff: 140000,
          mutualTariff: 120000,
          hmoTariff: 180000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 150000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 140000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 120000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 120000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 180000, isCapitated: false },
          ],
          preAuthRule: 'Mandatory Prior Authorization',
          copayPercentage: 10
        },
        {
          id: 'TAR-010',
          category: 'Surgery',
          serviceCode: 'SUR-APP-02',
          serviceName: 'Appendectomy (Open / Laparoscopic)',
          privateFee: 180000,
          nhiaTariff: 110000,
          esauhcTariff: 100000,
          mutualTariff: 90000,
          hmoTariff: 130000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 110000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 100000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 90000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 90000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 130000, isCapitated: false },
          ],
          preAuthRule: 'Mandatory Prior Authorization',
          copayPercentage: 10
        },
        {
          id: 'TAR-011',
          category: 'Surgery',
          serviceCode: 'SUR-MYO-03',
          serviceName: 'Abdominal Myomectomy (Uterine Fibroid Surgery)',
          privateFee: 220000,
          nhiaTariff: 145000,
          esauhcTariff: 140000,
          mutualTariff: 115000,
          hmoTariff: 165000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 145000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 140000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 115000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 115000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 165000, isCapitated: false },
          ],
          preAuthRule: 'Mandatory Prior Authorization',
          copayPercentage: 10
        },
        {
          id: 'TAR-012',
          category: 'Maternity',
          serviceCode: 'MAT-NVD-01',
          serviceName: 'Normal Spontaneous Vaginal Delivery (NVD)',
          privateFee: 80000,
          nhiaTariff: 45000,
          esauhcTariff: 45000,
          mutualTariff: 40000,
          hmoTariff: 60000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 45000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 45000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 40000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 40000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 60000, isCapitated: false },
          ],
          preAuthRule: '100% Covered Maternal Window',
          copayPercentage: 0
        },
        {
          id: 'TAR-013',
          category: 'Inpatient',
          serviceCode: 'INP-GEN-01',
          serviceName: 'General Ward Admission & Nursing Care (Per Day)',
          privateFee: 10000,
          nhiaTariff: 6000,
          esauhcTariff: 6000,
          mutualTariff: 5000,
          hmoTariff: 8000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 6000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 6000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 5000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 5000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 8000, isCapitated: false },
          ],
          preAuthRule: 'Covered up to 14 days/year',
          copayPercentage: 10
        },
        {
          id: 'TAR-014',
          category: 'Inpatient',
          serviceCode: 'INP-ICU-02',
          serviceName: 'Intensive Care Unit (ICU) Critical Bed (Per Day)',
          privateFee: 45000,
          nhiaTariff: 30000,
          esauhcTariff: 30000,
          mutualTariff: 25000,
          hmoTariff: 38000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 30000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 30000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 25000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 25000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 38000, isCapitated: false },
          ],
          preAuthRule: 'Specialist ICU Pre-Auth Required',
          copayPercentage: 10
        },
        {
          id: 'TAR-015',
          category: 'Dental',
          serviceCode: 'DEN-EXT-01',
          serviceName: 'Simple Tooth Extraction & Local Anaesthesia',
          privateFee: 15000,
          nhiaTariff: 8000,
          esauhcTariff: 8000,
          mutualTariff: 7000,
          hmoTariff: 11000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 8000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 8000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 7000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 7000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 11000, isCapitated: false },
          ],
          preAuthRule: 'Primary Dental Care',
          copayPercentage: 10
        },
        {
          id: 'TAR-016',
          category: 'Ophthalmology',
          serviceCode: 'OPH-CAT-01',
          serviceName: 'Cataract Extraction & Intraocular Lens (IOL)',
          privateFee: 130000,
          nhiaTariff: 85000,
          esauhcTariff: 85000,
          mutualTariff: 70000,
          hmoTariff: 95000,
          schemeTariffs: [
            { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: 85000, isCapitated: false },
            { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: 85000, isCapitated: false },
            { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: 70000, isCapitated: false },
            { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: 70000, isCapitated: false },
            { schemeCode: 'HYGEIA', schemeName: 'Hygeia HMO (Private)', tariffAmount: 95000, isCapitated: false },
          ],
          preAuthRule: 'Prior Authorization Required',
          copayPercentage: 10
        },
      ];

      for (const item of seedItems) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO insurance_tariffs (id, category, service_code, service_name, private_fee, nhia_tariff, esauhc_tariff, mutual_tariff, hmo_tariff, scheme_tariffs, pre_auth_rule, copay_percentage, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, true)
          ON CONFLICT (service_code) DO NOTHING
        `, item.id, item.category, item.serviceCode, item.serviceName, item.privateFee, item.nhiaTariff, item.esauhcTariff, item.mutualTariff, item.hmoTariff, JSON.stringify(item.schemeTariffs), item.preAuthRule, item.copayPercentage);
      }
    }
  } catch (err) {
    console.error('Error ensuring insurance_tariffs table:', err);
  }
}

// GET /insurance/tariffs - List all live tariffs with filtering and search
router.get('/tariffs', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureTariffTable();
    const { category, search } = req.query;

    let query = `SELECT * FROM insurance_tariffs WHERE is_active = true`;
    const params: any[] = [];

    if (category && category !== 'ALL') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (service_name ILIKE $${params.length} OR service_code ILIKE $${params.length} OR category ILIKE $${params.length})`;
    }

    query += ` ORDER BY category ASC, service_name ASC`;

    const rows: any = await prisma.$queryRawUnsafe(query, ...params);

    const formatted = rows.map((r: any) => {
      let schemeTariffs: any[] = [];
      if (r.scheme_tariffs) {
        try {
          schemeTariffs = typeof r.scheme_tariffs === 'string' ? JSON.parse(r.scheme_tariffs) : r.scheme_tariffs;
        } catch {
          schemeTariffs = [];
        }
      }

      if (!Array.isArray(schemeTariffs) || schemeTariffs.length === 0) {
        // Synthesize dynamic list from fallback columns
        schemeTariffs = [
          { schemeCode: 'NHIA', schemeName: 'National Health Insurance Authority (NHIA)', tariffAmount: Number(r.nhia_tariff || 0), isCapitated: Number(r.nhia_tariff) === 0 },
          { schemeCode: 'ESAUHC', schemeName: 'Enugu State Agency (ESAUHC)', tariffAmount: Number(r.esauhc_tariff || 0), isCapitated: Number(r.esauhc_tariff) === 0 },
          { schemeCode: 'CHIKADIBIA', schemeName: 'Chikadibia Mutual Health Agency', tariffAmount: Number(r.mutual_tariff || 0), isCapitated: Number(r.mutual_tariff) === 0 },
          { schemeCode: 'NDMHS', schemeName: 'Nsukka Diocesan Mutual Health Scheme', tariffAmount: Number(r.mutual_tariff || 0), isCapitated: Number(r.mutual_tariff) === 0 },
          { schemeCode: 'HYGEIA', schemeName: 'Private Commercial HMOs', tariffAmount: Number(r.hmo_tariff || 0), isCapitated: false },
        ];
      }

      return {
        id: r.id,
        category: r.category,
        serviceCode: r.service_code,
        serviceName: r.service_name,
        privateFee: Number(r.private_fee || 0),
        nhiaTariff: Number(r.nhia_tariff || 0),
        esauhcTariff: Number(r.esauhc_tariff || 0),
        mutualTariff: Number(r.mutual_tariff || 0),
        hmoTariff: Number(r.hmo_tariff || 0),
        schemeTariffs,
        preAuthRule: r.pre_auth_rule || 'Covered under Primary Plan',
        copayPercentage: Number(r.copay_percentage || 10),
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    const categories = [...new Set(rows.map((r: any) => r.category))];

    res.json({
      success: true,
      data: formatted,
      total: formatted.length,
      categories,
      summary: {
        totalItems: formatted.length,
        categoriesCount: categories.length,
        preAuthItemsCount: formatted.filter((f: any) => (f.preAuthRule || '').toLowerCase().includes('auth') || (f.preAuthRule || '').toLowerCase().includes('pa')).length,
      }
    });
  } catch (e) {
    next(e);
  }
});

// POST /insurance/tariffs - Create a new tariff
router.post('/tariffs', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureTariffTable();
    const { category, serviceCode, serviceName, privateFee, nhiaTariff, esauhcTariff, mutualTariff, hmoTariff, schemeTariffs, preAuthRule, copayPercentage } = req.body;

    if (!category || !serviceName) {
      return res.status(400).json({ message: 'Category and Service Name are required.' });
    }

    const id = `TAR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const code = (serviceCode && serviceCode.trim()) ? serviceCode.trim() : `${category.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const cleanSchemeTariffs = Array.isArray(schemeTariffs) ? schemeTariffs : [];
    const derivedNhia = cleanSchemeTariffs.find((s: any) => s.schemeCode === 'NHIA')?.tariffAmount ?? Number(nhiaTariff || 0);
    const derivedEsauhc = cleanSchemeTariffs.find((s: any) => s.schemeCode === 'ESAUHC')?.tariffAmount ?? Number(esauhcTariff || 0);
    const derivedMutual = cleanSchemeTariffs.find((s: any) => s.schemeCode === 'CHIKADIBIA' || s.schemeCode === 'NDMHS' || s.schemeCode === 'MUTUAL')?.tariffAmount ?? Number(mutualTariff || 0);
    const derivedHmo = cleanSchemeTariffs.find((s: any) => s.schemeCode?.includes('HMO') || s.schemeCode === 'HYGEIA' || s.schemeCode === 'PRIVATE_HMO')?.tariffAmount ?? Number(hmoTariff || 0);

    await prisma.$executeRawUnsafe(`
      INSERT INTO insurance_tariffs (id, category, service_code, service_name, private_fee, nhia_tariff, esauhc_tariff, mutual_tariff, hmo_tariff, scheme_tariffs, pre_auth_rule, copay_percentage, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, true)
    `, id, category, code, serviceName, Number(privateFee || 0), Number(derivedNhia), Number(derivedEsauhc), Number(derivedMutual), Number(derivedHmo), JSON.stringify(cleanSchemeTariffs), preAuthRule || 'Covered under Primary Plan', Number(copayPercentage !== undefined ? copayPercentage : 10));

    res.status(201).json({
      success: true,
      message: 'Tariff item created successfully in PostgreSQL',
      data: {
        id, category, serviceCode: code, serviceName,
        privateFee: Number(privateFee || 0),
        nhiaTariff: Number(derivedNhia),
        esauhcTariff: Number(derivedEsauhc),
        mutualTariff: Number(derivedMutual),
        hmoTariff: Number(derivedHmo),
        schemeTariffs: cleanSchemeTariffs,
        preAuthRule: preAuthRule || 'Covered under Primary Plan',
        copayPercentage: Number(copayPercentage !== undefined ? copayPercentage : 10)
      }
    });
  } catch (e: any) {
    if (e.message?.includes('duplicate key') || e.message?.includes('unique constraint') || e.code === '23505') {
      return res.status(400).json({ message: 'A tariff with this service code already exists. Please use a unique service code.' });
    }
    next(e);
  }
});

// PUT /insurance/tariffs/:id - Update an existing tariff
router.put('/tariffs/:id', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureTariffTable();
    const { id } = req.params;
    const { category, serviceCode, serviceName, privateFee, nhiaTariff, esauhcTariff, mutualTariff, hmoTariff, schemeTariffs, preAuthRule, copayPercentage } = req.body;

    const cleanSchemeTariffs = Array.isArray(schemeTariffs) ? schemeTariffs : [];
    const derivedNhia = cleanSchemeTariffs.find((s: any) => s.schemeCode === 'NHIA')?.tariffAmount ?? Number(nhiaTariff || 0);
    const derivedEsauhc = cleanSchemeTariffs.find((s: any) => s.schemeCode === 'ESAUHC')?.tariffAmount ?? Number(esauhcTariff || 0);
    const derivedMutual = cleanSchemeTariffs.find((s: any) => s.schemeCode === 'CHIKADIBIA' || s.schemeCode === 'NDMHS' || s.schemeCode === 'MUTUAL')?.tariffAmount ?? Number(mutualTariff || 0);
    const derivedHmo = cleanSchemeTariffs.find((s: any) => s.schemeCode?.includes('HMO') || s.schemeCode === 'HYGEIA' || s.schemeCode === 'PRIVATE_HMO')?.tariffAmount ?? Number(hmoTariff || 0);

    await prisma.$executeRawUnsafe(`
      UPDATE insurance_tariffs
      SET category = $1, service_code = $2, service_name = $3, private_fee = $4, nhia_tariff = $5, esauhc_tariff = $6, mutual_tariff = $7, hmo_tariff = $8, scheme_tariffs = $9::jsonb, pre_auth_rule = $10, copay_percentage = $11, updated_at = NOW()
      WHERE id = $12
    `, category, serviceCode, serviceName, Number(privateFee || 0), Number(derivedNhia), Number(derivedEsauhc), Number(derivedMutual), Number(derivedHmo), JSON.stringify(cleanSchemeTariffs), preAuthRule, Number(copayPercentage !== undefined ? copayPercentage : 10), id);

    res.json({
      success: true,
      message: 'Tariff updated successfully in PostgreSQL',
      data: { id, category, serviceCode, serviceName, privateFee, nhiaTariff: derivedNhia, esauhcTariff: derivedEsauhc, mutualTariff: derivedMutual, hmoTariff: derivedHmo, schemeTariffs: cleanSchemeTariffs, preAuthRule, copayPercentage }
    });
  } catch (e: any) {
    if (e.message?.includes('duplicate key') || e.message?.includes('unique constraint') || e.code === '23505') {
      return res.status(400).json({ message: 'A tariff with this service code already exists. Please use a unique service code.' });
    }
    next(e);
  }
});

// DELETE /insurance/tariffs/:id - Delete a tariff from database
router.delete('/tariffs/:id', authMiddleware, async (req: any, res, next) => {
  try {
    await ensureTariffTable();
    const { id } = req.params;
    await prisma.$executeRawUnsafe(`DELETE FROM insurance_tariffs WHERE id = $1`, id);
    res.json({ success: true, message: 'Tariff deleted successfully from database' });
  } catch (e) {
    next(e);
  }
});

export default router;
