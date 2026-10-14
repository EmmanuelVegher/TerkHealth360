import { prisma } from '../src/prisma.js';

async function main() {
  console.log('--- Harmonizing and Activating Rich National Form Schemas ---');

  // 1. First, find the 13-page Adult Clinical Evaluation schema
  const adult13 = await prisma.nmrsFormSchema.findUnique({
    where: { id: 'd2ed2b86-bb79-4994-baa9-d90c997eb77d' }
  });

  if (adult13) {
    const sj = adult13.schemaJson as any;
    console.log(`Found 13-page Adult Clinical Evaluation schema (pages: ${sj?.pages?.length})`);
    
    // Ensure it has the official descriptive formName matching what user designed
    await prisma.nmrsFormSchema.update({
      where: { id: adult13.id },
      data: {
        formName: 'Adult Initial Clinical Evaluation Form',
        version: '1.2',
        category: 'HIV_PROGRAM',
        isActive: true
      }
    });
    console.log('✓ Updated Adult Clinical Evaluation to "Adult Initial Clinical Evaluation Form v1.2"');

    // Upgrade the stub ADULT_INITIAL and CARE_CARD_4B schemas so if anything points to them, they get the 13 pages
    await prisma.nmrsFormSchema.updateMany({
      where: {
        OR: [
          { formCode: { in: ['ADULT_INITIAL', 'CARE_CARD_4B_INITIAL_CLINICAL_EVALUATION', 'CARE_CARD_4B', 'ADULT_INITIAL_EVALUATION'] } },
          { formName: { in: ['Adult Initial Clinical Evaluation', 'Care Card 4b - Initial Clinical Evaluation', 'Care Card 4b – Initial Clinical Evaluation'] } }
        ],
        id: { not: adult13.id }
      },
      data: {
        schemaJson: adult13.schemaJson as any,
        version: '1.2',
        isActive: false // Keep only the primary 'Adult Initial Clinical Evaluation Form' active in dropdown
      }
    });
    console.log('✓ Upgraded legacy adult initial and care card 4b variants to 13-page schema');
  }

  // 2. Harmonize Pharmacy Order Form (upgrade 1-page stub to the 10-page schema)
  const richPharmacy = await prisma.nmrsFormSchema.findFirst({
    where: { formCode: 'PHARMACY_ORDER' }
  });
  const stubPharmacy = await prisma.nmrsFormSchema.findFirst({
    where: { formCode: 'PHARMACY_ORDER_FORM' }
  });

  if (richPharmacy && (richPharmacy.schemaJson as any)?.pages?.length > 1) {
    await prisma.nmrsFormSchema.update({
      where: { id: richPharmacy.id },
      data: {
        formName: 'Pharmacy Order Form',
        category: 'PHARMACY',
        isActive: true
      }
    });
    console.log('✓ Activated 10-page rich Pharmacy Order Form');

    if (stubPharmacy && stubPharmacy.id !== richPharmacy.id) {
      await prisma.nmrsFormSchema.update({
        where: { id: stubPharmacy.id },
        data: {
          schemaJson: richPharmacy.schemaJson as any,
          version: richPharmacy.version,
          formName: 'Pharmacy Order Form (Legacy)',
          isActive: false // Hide duplicate legacy stub
        }
      });
      console.log('✓ Upgraded legacy stub Pharmacy Order Form to 10-page schema');
    }
  }

  // 3. Harmonize Integrated Laboratory Order and Result Form (upgrade 1-page stub to 5-page schema)
  const richLab = await prisma.nmrsFormSchema.findFirst({
    where: { formCode: 'INTEGRATED_LAB_ORDER' }
  });
  const stubLab = await prisma.nmrsFormSchema.findFirst({
    where: { formCode: 'LAB_ORDER_RESULT' }
  });

  if (richLab && (richLab.schemaJson as any)?.pages?.length > 1) {
    await prisma.nmrsFormSchema.update({
      where: { id: richLab.id },
      data: {
        formName: 'Integrated Laboratory Order and Result Form',
        category: 'LAB',
        isActive: true
      }
    });
    console.log('✓ Activated 5-page Integrated Laboratory Order and Result Form');

    if (stubLab && stubLab.id !== richLab.id) {
      await prisma.nmrsFormSchema.update({
        where: { id: stubLab.id },
        data: {
          schemaJson: richLab.schemaJson as any,
          version: richLab.version,
          formName: 'Laboratory Order and Result Form (Legacy)',
          isActive: false
        }
      });
      console.log('✓ Upgraded legacy stub Lab Order Form to 5-page schema');
    }
  }

  // 4. Activate all other designed multi-page schemas
  const richCodesToActivate = [
    'HTS_REGISTER',
    'NATIONAL_ART_REGISTER',
    'PEDIATRIC_INITIAL_CLINICAL_EVALUATION',
    'TB_PATIENT_TREATMENT_CARD_FORM',
    'DR_TB_TREATMENT_REGISTER_FORM',
    'NATIONAL_PMTCT_REGISTER',
    'NATIONAL_PMTCT_CHILD_FOLLOW_UP_REGISTER',
    'MOTHER_INFANT_PAIR_CARD_FRONT',
    'HIV_CARE_AND_TREATMENT_TRANSFER_FORM',
    'MATERNAL_COHORT_REGISTER',
    'HIV_TESTING_SERVICES',
    'IPT',
    'PRESUMPTIVE_TB_REGISTER_FORM',
    'PREP_PEP_CARD',
    'PREP_AND_PEP_COMPLETION_DISCONTINUATION_',
    'PREP_AND_PEP_ENROLLMENT_CARD',
    'GENERAL_ANTENATAL_CARE',
    'CLIENT_INTAKE_FORM',
    'TB_INTERRUPTION_TRACKING_FORM',
    'DR_TB_IN_PATIENT_DISCHARGE_FORM',
    'HIV_ENROLLMENT',
    'CARE_CARD_1A',
    'CARE_CARD',
    'CARE_CARD_1B_ENROLLMENT_AND_ART_COMMENCE',
    'CARE_CARD_1D_DISCONTINUATION_INTERRUPTIO',
    'CARE_CARD_4C_CARE_AND_SUPPORT_POSITIVE_H',
    'CLIENT_REFERRAL_FORM',
    'OPERATION_TRIPLE_ZERO_OTZ_SERVICE',
    'CLIENT_TRACKING_AND_TERMINATION'
  ];

  for (const code of richCodesToActivate) {
    const s = await prisma.nmrsFormSchema.findFirst({
      where: { formCode: code }
    });
    if (s) {
      await prisma.nmrsFormSchema.update({
        where: { id: s.id },
        data: { isActive: true }
      });
      console.log(`✓ Activated schema: ${s.formName} (${s.formCode})`);
    }
  }

  // 5. Ensure all schemas with > 1 pages in DB are isActive: true
  const allSchemas = await prisma.nmrsFormSchema.findMany();
  for (const s of allSchemas) {
    const sj = s.schemaJson as any;
    if (sj?.pages && sj.pages.length > 1 && !s.formName.includes('(Legacy)') && !s.formName.includes('(Alt)')) {
      if (!s.isActive) {
        await prisma.nmrsFormSchema.update({
          where: { id: s.id },
          data: { isActive: true }
        });
        console.log(`✓ Auto-activated multi-page form: "${s.formName}" (${sj.pages.length} pages)`);
      }
    }
  }

  console.log('\n--- Sync Finished Successfully ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
