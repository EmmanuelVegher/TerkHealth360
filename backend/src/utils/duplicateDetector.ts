import { soundex } from './phonetic.js';
import { prisma } from '../prisma.js';

export interface DuplicateResult {
  patientId: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  phone: string | null;
  gender?: string | null;
  score: number; // 0 to 100%
  reasons: string[];
}

export interface DuplicateCandidatePair {
  patientA: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    phone: string | null;
    status: string;
    createdAt: string;
  };
  patientB: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    birthDate: string | null;
    phone: string | null;
    status: string;
    createdAt: string;
  };
  score: number;
  reasons: string[];
}

const HONORIFICS = ['MR', 'MRS', 'MS', 'DR', 'CHIEF', 'ALHAJI', 'ALHAJA', 'MALLAM', 'MASTER', 'MISS', 'ENGR', 'SIR', 'HON', 'PASTOR', 'REV', 'BISHOP'];

function cleanName(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim().toUpperCase().replace(/[,.-]/g, ' ');
  const tokens = cleaned.split(/\s+/).filter(t => t.length > 0 && !HONORIFICS.includes(t));
  return tokens.join(' ');
}

export const checkDuplicates = async (params: {
  firstName: string;
  lastName: string;
  birthDate?: string | Date | null;
  phone?: string | null;
  nin?: string | null;
  excludePatientId?: string;
}): Promise<DuplicateResult[]> => {
  const cleanFirst = cleanName(params.firstName);
  const cleanLast = cleanName(params.lastName);

  const incomingFirstSound = soundex(cleanFirst);
  const incomingLastSound = soundex(cleanLast);

  const allPatients = await prisma.patient.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      ...(params.excludePatientId ? { id: { not: params.excludePatientId } } : {}),
    },
    include: {
      telecoms: true,
    },
  });

  const matches: DuplicateResult[] = [];

  for (const p of allPatients) {
    let score = 0;
    const reasons: string[] = [];

    const pCleanFirst = cleanName(p.firstName);
    const pCleanLast = cleanName(p.lastName);

    const pFirstSound = soundex(pCleanFirst);
    const pLastSound = soundex(pCleanLast);

    // Exact direct name match
    if (cleanFirst === pCleanFirst && cleanLast === pCleanLast) {
      score += 40;
      reasons.push('Exact Name Match');
    }
    // Direct Soundex match
    else if (incomingFirstSound === pFirstSound && incomingLastSound === pLastSound) {
      score += 30;
      reasons.push('Phonetic Name Match (Soundex)');
    }

    // Swapped First & Last Name Match (e.g. "Mohammed Ibrahim" vs "Ibrahim Mohammed")
    if (cleanFirst === pCleanLast && cleanLast === pCleanFirst) {
      score += 38;
      reasons.push('Swapped First & Surname Match');
    } else if (incomingFirstSound === pLastSound && incomingLastSound === pFirstSound) {
      score += 28;
      reasons.push('Swapped Phonetic Name Match');
    }

    // Individual token overlap
    const incomingTokens = `${cleanFirst} ${cleanLast}`.split(' ').filter(Boolean);
    const pTokens = `${pCleanFirst} ${pCleanLast}`.split(' ').filter(Boolean);
    const sharedTokens = incomingTokens.filter(t => pTokens.includes(t));
    if (sharedTokens.length >= 2 && !reasons.some(r => r.includes('Exact') || r.includes('Swapped'))) {
      score += 20;
      reasons.push(`Multiple Name Tokens Match (${sharedTokens.join(', ')})`);
    }

    // Date of Birth matching
    if (params.birthDate && p.birthDate) {
      const incomingDob = new Date(params.birthDate).toISOString().split('T')[0];
      const pDob = new Date(p.birthDate).toISOString().split('T')[0];
      if (incomingDob === pDob) {
        score += 25;
        reasons.push(`Exact DOB Match (${pDob})`);
      }
    }

    // Phone matching (normalize digits, suffix 10 digits match)
    const pPhones = p.telecoms.filter(t => t.system === 'phone').map(t => t.value);
    if (params.phone && pPhones.length > 0) {
      const cleanIncomingPhone = params.phone.replace(/\D/g, '').slice(-10);
      if (cleanIncomingPhone.length >= 7) {
        const matchPhone = pPhones.some(phone => {
          const cleanPPhone = phone.replace(/\D/g, '').slice(-10);
          return cleanPPhone.length >= 7 && (cleanPPhone === cleanIncomingPhone || cleanPPhone.endsWith(cleanIncomingPhone) || cleanIncomingPhone.endsWith(cleanPPhone));
        });
        if (matchPhone) {
          score += 30;
          reasons.push('Phone Number Match');
        }
      }
    }

    // NIN matching
    if (params.nin && p.nin && params.nin.trim() && p.nin.trim()) {
      if (params.nin.trim() === p.nin.trim()) {
        score += 45;
        reasons.push('National ID (NIN) Match');
      }
    }

    const finalScore = Math.min(score, 100);

    if (finalScore >= 40) {
      const phoneVal = p.telecoms.find(t => t.system === 'phone')?.value || null;
      matches.push({
        patientId: p.id,
        patientNumber: p.patientNumber,
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate ? p.birthDate.toISOString() : null,
        phone: phoneVal,
        gender: p.gender,
        score: finalScore,
        reasons,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
};

// Helper to check duplicates from a single free-text query (used by departmental quick searches)
export const checkDuplicatesFreeText = async (query: string): Promise<DuplicateResult[]> => {
  if (!query || query.trim().length < 2) return [];
  
  // Extract potential phone digits vs name text
  const phoneMatch = query.match(/(?:\+?234|0)?[789][01]\d{8}/);
  const phone = phoneMatch ? phoneMatch[0] : undefined;
  
  const textParts = query.replace(/(?:\+?234|0)?[789][01]\d{8}/g, '').trim().split(/\s+/);
  const firstName = textParts[0] || query;
  const lastName = textParts.slice(1).join(' ') || firstName;

  return checkDuplicates({
    firstName,
    lastName,
    phone,
  });
};

// Scan the entire database for potential duplicate candidate pairs (Super-User Dashboard Queue)
export const scanAllPotentialDuplicates = async (): Promise<DuplicateCandidatePair[]> => {
  const allPatients = await prisma.patient.findMany({
    where: { status: { not: 'ARCHIVED' } },
    include: { telecoms: true },
    orderBy: { createdAt: 'desc' },
    take: 300, // Top 300 active patients
  });

  const candidates: DuplicateCandidatePair[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < allPatients.length; i++) {
    const p1 = allPatients[i];

    for (let j = i + 1; j < allPatients.length; j++) {
      const p2 = allPatients[j];
      const pairKey = [p1.id, p2.id].sort().join('_');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      let score = 0;
      const reasons: string[] = [];

      const p1First = cleanName(p1.firstName);
      const p1Last = cleanName(p1.lastName);
      const p2First = cleanName(p2.firstName);
      const p2Last = cleanName(p2.lastName);

      const p1FirstSound = soundex(p1First);
      const p1LastSound = soundex(p1Last);
      const p2FirstSound = soundex(p2First);
      const p2LastSound = soundex(p2Last);

      // 1. Direct or Swapped name match
      if (p1First === p2First && p1Last === p2Last) {
        score += 40;
        reasons.push('Identical Names');
      } else if (p1First === p2Last && p1Last === p2First) {
        score += 38;
        reasons.push('Swapped First & Last Name');
      } else if (p1FirstSound === p2FirstSound && p1LastSound === p2LastSound) {
        score += 30;
        reasons.push('Phonetic Soundex Match');
      } else if (p1FirstSound === p2LastSound && p1LastSound === p2FirstSound) {
        score += 28;
        reasons.push('Swapped Phonetic Match');
      }

      // 2. Phone match
      const p1Phones = p1.telecoms.filter(t => t.system === 'phone').map(t => t.value.replace(/\D/g, '').slice(-10));
      const p2Phones = p2.telecoms.filter(t => t.system === 'phone').map(t => t.value.replace(/\D/g, '').slice(-10));
      if (p1Phones.length > 0 && p2Phones.length > 0) {
        const hasPhoneMatch = p1Phones.some(ph1 => ph1.length >= 7 && p2Phones.some(ph2 => ph2.length >= 7 && (ph1 === ph2 || ph1.endsWith(ph2) || ph2.endsWith(ph1))));
        if (hasPhoneMatch) {
          score += 30;
          reasons.push('Matching Phone Number');
        }
      }

      // 3. DOB match
      if (p1.birthDate && p2.birthDate) {
        const dob1 = new Date(p1.birthDate).toISOString().split('T')[0];
        const dob2 = new Date(p2.birthDate).toISOString().split('T')[0];
        if (dob1 === dob2) {
          score += 25;
          reasons.push(`Same Date of Birth (${dob1})`);
        }
      }

      // 4. NIN match
      if (p1.nin && p2.nin && p1.nin.trim() && p1.nin.trim() === p2.nin.trim()) {
        score += 45;
        reasons.push('Same NIN National ID');
      }

      const finalScore = Math.min(score, 100);

      if (finalScore >= 45) {
        const p1Phone = p1.telecoms.find(t => t.system === 'phone')?.value || null;
        const p2Phone = p2.telecoms.find(t => t.system === 'phone')?.value || null;

        candidates.push({
          patientA: {
            id: p1.id,
            patientNumber: p1.patientNumber,
            firstName: p1.firstName,
            lastName: p1.lastName,
            birthDate: p1.birthDate ? p1.birthDate.toISOString() : null,
            phone: p1Phone,
            status: p1.status,
            createdAt: p1.createdAt.toISOString(),
          },
          patientB: {
            id: p2.id,
            patientNumber: p2.patientNumber,
            firstName: p2.firstName,
            lastName: p2.lastName,
            birthDate: p2.birthDate ? p2.birthDate.toISOString() : null,
            phone: p2Phone,
            status: p2.status,
            createdAt: p2.createdAt.toISOString(),
          },
          score: finalScore,
          reasons,
        });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
};
