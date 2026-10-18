import crypto from 'crypto';
import { prisma } from '../../prisma.js';

export interface AnonymizationOptions {
  salt?: string;
  ageBanding?: boolean; // If true, converts exact birthDate into NHMIS age bands (<1, 1-4, 5-14, 15-49, 50+)
  dateJitterDays?: number;
  includePrescriptions?: boolean;
  includeDiagnoses?: boolean;
  includeVitals?: boolean;
  respectConsentDirectives?: boolean;
}

export interface AnonymizedPatientRecord {
  pseudonymId: string;
  ageBand: string;
  birthYear: number | null;
  gender: string;
  state: string;
  lga: string;
  consentLawfulBasis: string;
  encountersCount: number;
  diagnoses: Array<{
    code: string;
    system: string;
    description: string;
    category?: string;
    recordedYear: number;
  }>;
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
  }>;
  observationsSummary?: {
    totalObservations: number;
    recentCategories: string[];
  };
}

export class DeIdentificationPipeline {
  private salt: string;

  constructor(customSalt?: string) {
    this.salt = customSalt || process.env.ANONYMIZATION_SALT || 'TERK_HEALTH_360_NDPC_SECURE_SALT_2026';
  }

  /**
   * Deterministic pseudonymization using HMAC-SHA256.
   * Produces a stable, irreversible pseudonym (e.g., 'ANON-PAT-9A4B8F7C').
   */
  public generatePseudonym(identifier: string, prefix = 'ANON-PAT'): string {
    if (!identifier) return `${prefix}-UNKNOWN`;
    const hmac = crypto.createHmac('sha256', this.salt);
    hmac.update(identifier.trim().toLowerCase());
    const hash = hmac.digest('hex').substring(0, 10).toUpperCase();
    return `${prefix}-${hash}`;
  }

  /**
   * Mask Nigerian National Identification Number (NIN).
   * Format: '***-***-9012'
   */
  public maskNin(nin?: string | null): string {
    if (!nin) return '[NOT_RECORDED]';
    const clean = nin.replace(/\D/g, '');
    if (clean.length < 4) return '***-***-****';
    return `***-***-${clean.slice(-4)}`;
  }

  /**
   * Mask Phone Number.
   * Format: '+234 *** *** 1234'
   */
  public maskPhone(phone?: string | null): string {
    if (!phone) return '[NOT_RECORDED]';
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 4) return '+234 *** *** ****';
    return `+234 *** *** ${clean.slice(-4)}`;
  }

  /**
   * Mask Email Address.
   * Format: 'j***e@domain.com'
   */
  public maskEmail(email?: string | null): string {
    if (!email || !email.includes('@')) return '[REDACTED]';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `*@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  /**
   * Convert exact birthDate to NHMIS standard age bands.
   */
  public calculateAgeBand(dob?: Date | null): string {
    if (!dob) return 'UNKNOWN';
    const now = new Date();
    const diffMs = now.getTime() - new Date(dob).getTime();
    const ageYears = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));

    if (ageYears < 1) return '< 1 yr';
    if (ageYears <= 4) return '1 - 4 yrs';
    if (ageYears <= 14) return '5 - 14 yrs';
    if (ageYears <= 24) return '15 - 24 yrs';
    if (ageYears <= 49) return '25 - 49 yrs';
    return '50+ yrs';
  }

  /**
   * Extract state and LGA from address string while redacting specific house/street.
   */
  public sanitizeAddress(knownState?: string | null, knownLga?: string | null): { state: string; lga: string } {
    const state = knownState || 'UNKNOWN_STATE';
    const lga = knownLga || 'UNKNOWN_LGA';
    return { state, lga };
  }

  /**
   * Executes full pipeline on patient cohort for research/epidemiology export.
   */
  public async anonymizeCohort(
    patientIds?: string[],
    options: AnonymizationOptions = {}
  ): Promise<{
    totalProcessed: number;
    totalExcludedByConsent: number;
    records: AnonymizedPatientRecord[];
  }> {
    const whereClause: any = {};
    if (patientIds && patientIds.length > 0) {
      whereClause.id = { in: patientIds };
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: {
        consents: true,
        conditions: {
          take: 50,
          orderBy: { createdAt: 'desc' }
        },
        pharmacyPrescriptions: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                medication: true
              }
            }
          }
        },
        encounters: {
          select: { id: true, createdAt: true }
        },
        observations: {
          take: 20,
          orderBy: { createdAt: 'desc' }
        }
      },
      take: 250
    });

    let totalExcludedByConsent = 0;
    const records: AnonymizedPatientRecord[] = [];

    for (const pat of patients) {
      // 1. Consent Directives evaluation under NDPA 2023
      if (options.respectConsentDirectives !== false && pat.consents && pat.consents.length > 0) {
        // Find if any active directive denies research or public health
        const denyDirective = pat.consents.find(c => 
          c.status === 'ACTIVE' && 
          c.provisionType === 'DENY' && 
          (c.purposeOfUse === 'CLINICAL_RESEARCH' || c.scope === 'RESEARCH')
        );

        if (denyDirective) {
          totalExcludedByConsent++;
          continue; // Respect patient's legal right to opt out
        }
      }

      // 2. Deterministic Pseudonym
      const pseudonymId = this.generatePseudonym(pat.id || pat.patientNumber);

      // 3. Demographics de-identification
      const ageBand = this.calculateAgeBand(pat.birthDate);
      const birthYear = pat.birthDate ? new Date(pat.birthDate).getFullYear() : null;
      const gender = pat.gender || 'UNKNOWN';
      const { state, lga } = this.sanitizeAddress(pat.stateOfOrigin, pat.lga);

      // Find lawful basis from active consent or default
      const activeConsent = pat.consents?.find(c => c.status === 'ACTIVE');
      const consentLawfulBasis = activeConsent?.ndpcLawfulBasis || 'PUBLIC_HEALTH_LAW';

      // 4. Clinical data sanitization
      // Check restricted data classes
      const restrictedClasses = (activeConsent?.dataClassesRestricted || '')
        .split(',')
        .map(s => s.trim().toUpperCase());

      // Filter conditions / diagnoses
      const diagnoses: AnonymizedPatientRecord['diagnoses'] = [];
      if (options.includeDiagnoses !== false && pat.conditions) {
        for (const dx of pat.conditions) {
          const isSensitive = dx.category === 'HIV_STATUS' || dx.category === 'MENTAL_HEALTH' || dx.category === 'REPRODUCTIVE_HEALTH';
          if (isSensitive && restrictedClasses.includes(dx.category || '')) {
            continue; // Skip restricted sensitive class
          }
          diagnoses.push({
            code: dx.code || 'UNKNOWN',
            system: dx.code.startsWith('1') || dx.code.startsWith('2') || dx.code.includes('.') ? 'WHO-ICD-11' : 'ICD-10',
            description: dx.display || 'Clinical Diagnosis',
            category: dx.category || 'GENERAL',
            recordedYear: dx.createdAt ? new Date(dx.createdAt).getFullYear() : 2026
          });
        }
      }

      // Filter medications
      const medications: AnonymizedPatientRecord['medications'] = [];
      if (options.includePrescriptions !== false && pat.pharmacyPrescriptions) {
        for (const rx of pat.pharmacyPrescriptions) {
          for (const item of rx.items) {
            medications.push({
              name: item.medication ? `${item.medication.genericName} (${item.medication.brandName})` : 'Medication',
              dosage: `${item.dose || ''} ${item.strength || ''}`.trim() || undefined,
              frequency: item.frequency || undefined
            });
          }
        }
      }

      // Observations summary
      let observationsSummary: AnonymizedPatientRecord['observationsSummary'] = undefined;
      if (options.includeVitals !== false && pat.observations && pat.observations.length > 0) {
        const categories = Array.from(new Set(pat.observations.map(o => o.category || 'General').filter(Boolean)));
        observationsSummary = {
          totalObservations: pat.observations.length,
          recentCategories: categories.slice(0, 5)
        };
      }

      records.push({
        pseudonymId,
        ageBand,
        birthYear,
        gender,
        state,
        lga,
        consentLawfulBasis,
        encountersCount: pat.encounters?.length || 0,
        diagnoses,
        medications,
        observationsSummary
      });
    }

    return {
      totalProcessed: patients.length,
      totalExcludedByConsent,
      records
    };
  }

  /**
   * Converts anonymized cohort records into a flat CSV format.
   */
  public toCsv(records: AnonymizedPatientRecord[]): string {
    const headers = [
      'Pseudonym_ID',
      'Age_Band',
      'Birth_Year',
      'Gender',
      'State',
      'LGA',
      'Encounters_Count',
      'Consent_Lawful_Basis',
      'Primary_Diagnoses_Codes',
      'Primary_Medications'
    ];

    const rows = records.map(r => [
      r.pseudonymId,
      r.ageBand,
      r.birthYear ?? 'N/A',
      r.gender,
      r.state,
      r.lga,
      r.encountersCount,
      r.consentLawfulBasis,
      `"${r.diagnoses.map(d => `${d.code} (${d.system})`).join('; ')}"`,
      `"${r.medications.map(m => m.name).join('; ')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

export const deIdentificationPipeline = new DeIdentificationPipeline();
