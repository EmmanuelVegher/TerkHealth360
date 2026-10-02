import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// FDI 32 adult teeth
const ALL_32_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38
];

// Clinical periodontal exam profile for Nwankwo Adeaze:
// Moderate chronic periodontitis with localized deep pockets around molars (16, 17, 26, 46, 36)
// and bleeding on probing in posterior quadrants.
const ADEAZE_PERIO_PROFILE: Record<number, { pd: number; gm: number; bop: boolean; supp: boolean; mobility: number; furcation: number; site: string }> = {
  18: { pd: 4, gm: 1, bop: true,  supp: false, mobility: 1, furcation: 1, site: 'Distobuccal & Midbuccal' },
  17: { pd: 5, gm: 1, bop: true,  supp: true,  mobility: 1, furcation: 2, site: 'Distobuccal & Midbuccal' },
  16: { pd: 5, gm: 0, bop: true,  supp: false, mobility: 0, furcation: 1, site: 'Mesiobuccal & Distobuccal' },
  15: { pd: 3, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
  14: { pd: 3, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
  13: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  12: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  11: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  21: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  22: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  23: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  24: { pd: 3, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
  25: { pd: 3, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
  26: { pd: 6, gm: 1, bop: true,  supp: true,  mobility: 2, furcation: 2, site: 'Mesiobuccal & Palatal' },
  27: { pd: 4, gm: 0, bop: true,  supp: false, mobility: 0, furcation: 1, site: 'Distobuccal' },
  28: { pd: 3, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
  48: { pd: 4, gm: 0, bop: true,  supp: false, mobility: 0, furcation: 0, site: 'Distobuccal' },
  47: { pd: 4, gm: 1, bop: true,  supp: false, mobility: 1, furcation: 1, site: 'Distobuccal & Midbuccal' },
  46: { pd: 5, gm: 1, bop: true,  supp: false, mobility: 1, furcation: 1, site: 'Mesiobuccal & Lingual' },
  45: { pd: 3, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
  44: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
  43: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  42: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  41: { pd: 3, gm: 1, bop: true,  supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  31: { pd: 3, gm: 1, bop: true,  supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  32: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  33: { pd: 2, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Labial' },
  34: { pd: 3, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
  35: { pd: 3, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
  36: { pd: 5, gm: 1, bop: true,  supp: true,  mobility: 1, furcation: 1, site: 'Distobuccal & Lingual' },
  37: { pd: 4, gm: 0, bop: true,  supp: false, mobility: 0, furcation: 1, site: 'Distobuccal' },
  38: { pd: 3, gm: 0, bop: false, supp: false, mobility: 0, furcation: 0, site: 'Midbuccal' },
};

async function main() {
  console.log('Seeding PostgreSQL dental perio measurements...');

  const encounters = await prisma.dentalEncounter.findMany({
    include: { patient: true }
  });

  if (encounters.length === 0) {
    console.log('No dental encounters found. Please create an encounter first.');
    return;
  }

  for (const enc of encounters) {
    console.log(`Seeding perio measurements for Encounter #${enc.encounterNumber} (${enc.patient?.firstName} ${enc.patient?.lastName})...`);

    // Remove existing
    await prisma.dentalPerioMeasurement.deleteMany({
      where: { dentalEncounterId: enc.id }
    });

    const isAdeaze = enc.patient?.lastName?.toLowerCase().includes('adeaze') || enc.encounterNumber.includes('99874');

    const records = ALL_32_TEETH.map(toothNumber => {
      if (isAdeaze && ADEAZE_PERIO_PROFILE[toothNumber]) {
        const item = ADEAZE_PERIO_PROFILE[toothNumber];
        return {
          dentalEncounterId: enc.id,
          toothNumber,
          site: item.site,
          probingDepthMM: item.pd,
          gingivalMarginMM: item.gm,
          calMM: item.pd + item.gm,
          bleedingOnProbing: item.bop,
          suppuration: item.supp,
          mobilityClass: item.mobility,
          furcationGrade: item.furcation
        };
      } else {
        // Healthy to mild baseline with occasional 3mm or slight GM
        const isMolar = [18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38].includes(toothNumber);
        const pd = isMolar ? (toothNumber === 16 || toothNumber === 46 ? 4 : 3) : 2;
        const bop = toothNumber === 16 || toothNumber === 46;
        return {
          dentalEncounterId: enc.id,
          toothNumber,
          site: isMolar ? 'Distobuccal & Midbuccal' : 'Midbuccal / Facial',
          probingDepthMM: pd,
          gingivalMarginMM: 0,
          calMM: pd,
          bleedingOnProbing: bop,
          suppuration: false,
          mobilityClass: 0,
          furcationGrade: 0
        };
      }
    });

    await prisma.dentalPerioMeasurement.createMany({
      data: records
    });

    await prisma.dentalEncounter.update({
      where: { id: enc.id },
      data: {
        periodontalNotes: isAdeaze
          ? 'AAP/EFP 2017: Stage II Grade B Generalized Periodontitis. 6mm probing pocket on tooth #26 with class II furcation; 5mm pockets on #17, #16, #46, #36 with bleeding on probing. Scaling and root planing (SRP) indicated for Upper Right, Upper Left, and Lower Left quadrants.'
          : 'Gingival health with localized mild gingivitis on molars #16 & #46. Oral hygiene instruction (OHI) and routine prophylaxis scheduled.'
      }
    });

    console.log(`✓ Seeded ${records.length} perio records into PostgreSQL for Encounter #${enc.encounterNumber}!`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
