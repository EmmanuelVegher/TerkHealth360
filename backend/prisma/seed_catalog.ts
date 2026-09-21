import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const meds = [
  {
    itemCode: 'MED-AMOX-500',
    genericName: 'Amoxicillin',
    brandName: 'Amoxil',
    dosageForm: 'Capsule',
    strength: '500 mg',
    unitOfMeasure: 'Capsule',
    classification: 'PRESCRIPTION',
    price: 150,
  },
  {
    itemCode: 'MED-PARA-500',
    genericName: 'Paracetamol',
    brandName: 'Panadol',
    dosageForm: 'Tablet',
    strength: '500 mg',
    unitOfMeasure: 'Tablet',
    classification: 'OTC',
    price: 20,
  },
  {
    itemCode: 'MED-AL-80',
    genericName: 'Artemether-Lumefantrine',
    brandName: 'Coartem',
    dosageForm: 'Tablet',
    strength: '80/480 mg',
    unitOfMeasure: 'Tablet',
    classification: 'PRESCRIPTION',
    price: 1200,
  },
  {
    itemCode: 'MED-METF-500',
    genericName: 'Metformin',
    brandName: 'Glucophage',
    dosageForm: 'Tablet',
    strength: '500 mg',
    unitOfMeasure: 'Tablet',
    classification: 'PRESCRIPTION',
    price: 50,
  },
  {
    itemCode: 'MED-AMLO-5',
    genericName: 'Amlodipine',
    brandName: 'Norvasc',
    dosageForm: 'Tablet',
    strength: '5 mg',
    unitOfMeasure: 'Tablet',
    classification: 'PRESCRIPTION',
    price: 80,
  },
  {
    itemCode: 'MED-CIPR-500',
    genericName: 'Ciprofloxacin',
    brandName: 'Cipro',
    dosageForm: 'Tablet',
    strength: '500 mg',
    unitOfMeasure: 'Tablet',
    classification: 'PRESCRIPTION',
    price: 300,
  },
  {
    itemCode: 'MED-OMEP-20',
    genericName: 'Omeprazole',
    brandName: 'Prilosec',
    dosageForm: 'Capsule',
    strength: '20 mg',
    unitOfMeasure: 'Capsule',
    classification: 'PRESCRIPTION',
    price: 100,
  },
  {
    itemCode: 'MED-IBUP-400',
    genericName: 'Ibuprofen',
    brandName: 'Advil',
    dosageForm: 'Tablet',
    strength: '400 mg',
    unitOfMeasure: 'Tablet',
    classification: 'OTC',
    price: 40,
  },
  {
    itemCode: 'MED-VENT-100',
    genericName: 'Salbutamol Inhaler',
    brandName: 'Ventolin',
    dosageForm: 'Inhaler',
    strength: '100 mcg',
    unitOfMeasure: 'Inhaler',
    classification: 'PRESCRIPTION',
    price: 2500,
  },
  {
    itemCode: 'MED-LANT-100',
    genericName: 'Insulin Glargine',
    brandName: 'Lantus SoloStar',
    dosageForm: 'Injection',
    strength: '100 IU/mL',
    unitOfMeasure: 'Vial',
    classification: 'PRESCRIPTION',
    price: 8000,
  },
];

const tests = [
  {
    testCode: 'LAB-MP',
    testName: 'Malaria Parasite Smear (MP)',
    category: 'HAEMATOLOGY',
    specimenType: 'BLOOD',
    containerType: 'EDTA Tube',
    turnaroundHours: 2,
    referenceRange: 'No Malaria Parasites Seen',
    unit: 'Plasm/uL',
    price: 1500,
  },
  {
    testCode: 'LAB-FBC',
    testName: 'Full Blood Count (FBC)',
    category: 'HAEMATOLOGY',
    specimenType: 'BLOOD',
    containerType: 'EDTA Tube',
    turnaroundHours: 4,
    referenceRange: 'WBC: 4.0-11.0 x10^9/L, HGB: 13.5-17.5 g/dL, PLT: 150-400 x10^9/L',
    unit: 'Cells',
    price: 3500,
  },
  {
    testCode: 'LAB-URINE',
    testName: 'Urinalysis',
    category: 'URINALYSIS',
    specimenType: 'URINE',
    containerType: 'Urine Cup',
    turnaroundHours: 2,
    referenceRange: 'Normal urine profile',
    unit: 'Visual/Chemical',
    price: 1000,
  },
  {
    testCode: 'LAB-FBS',
    testName: 'Fasting Blood Sugar (FBS)',
    category: 'BIOCHEMISTRY',
    specimenType: 'BLOOD',
    containerType: 'Fluoride Tube',
    turnaroundHours: 3,
    referenceRange: '3.6 - 6.1 mmol/L',
    unit: 'mmol/L',
    price: 1200,
  },
  {
    testCode: 'LAB-LIPID',
    testName: 'Lipid Profile',
    category: 'BIOCHEMISTRY',
    specimenType: 'BLOOD',
    containerType: 'Lithium Heparin Tube',
    turnaroundHours: 8,
    referenceRange: 'Chol: <5.2 mmol/L, HDL: >1.0 mmol/L',
    unit: 'mmol/L',
    price: 6000,
  },
  {
    testCode: 'LAB-LFT',
    testName: 'Liver Function Test (LFT)',
    category: 'BIOCHEMISTRY',
    specimenType: 'BLOOD',
    containerType: 'Lithium Heparin Tube',
    turnaroundHours: 6,
    referenceRange: 'Albumin: 35-50 g/L, ALT: 7-56 U/L, AST: 10-40 U/L',
    unit: 'U/L',
    price: 5000,
  },
  {
    testCode: 'LAB-EUC',
    testName: 'Electrolytes, Urea & Creatinine (E/U/Cr)',
    category: 'BIOCHEMISTRY',
    specimenType: 'BLOOD',
    containerType: 'Lithium Heparin Tube',
    turnaroundHours: 6,
    referenceRange: 'Na+: 135-145, K+: 3.5-5.0, Creatinine: 60-110',
    unit: 'mmol/L',
    price: 5500,
  },
  {
    testCode: 'LAB-WIDAL',
    testName: 'Typhoid Widal Test',
    category: 'SEROLOGY',
    specimenType: 'BLOOD',
    containerType: 'Plain Tube',
    turnaroundHours: 4,
    referenceRange: 'O & H Agglutinins < 1:80',
    unit: 'Titre',
    price: 2000,
  },
  {
    testCode: 'LAB-HIV',
    testName: 'HIV 1 & 2 Screening',
    category: 'SEROLOGY',
    specimenType: 'BLOOD',
    containerType: 'Plain Tube',
    turnaroundHours: 2,
    referenceRange: 'Non-Reactive',
    unit: 'Qualitative',
    price: 1500,
  },
  {
    testCode: 'LAB-PT',
    testName: 'Urine Pregnancy Test (PT)',
    category: 'URINALYSIS',
    specimenType: 'URINE',
    containerType: 'Urine Cup',
    turnaroundHours: 1,
    referenceRange: 'Negative',
    unit: 'Qualitative',
    price: 800,
  },
];

async function main() {
  console.log('Seeding Medication Inventory and Lab Test Catalogs...');

  // Seed Medications
  for (const m of meds) {
    const dbMed = await prisma.pharmacyInventoryItem.upsert({
      where: { itemCode: m.itemCode },
      update: {
        price: m.price,
        genericName: m.genericName,
        brandName: m.brandName,
        dosageForm: m.dosageForm,
        strength: m.strength,
        unitOfMeasure: m.unitOfMeasure,
        classification: m.classification,
      },
      create: m,
    });

    const existingBatch = await prisma.pharmacyStockBatch.findFirst({
      where: { inventoryItemId: dbMed.id },
    });
    
    if (!existingBatch) {
      await prisma.pharmacyStockBatch.create({
        data: {
          inventoryItemId: dbMed.id,
          batchNumber: `BAT-${m.itemCode.slice(-4)}-01`,
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          receivedQuantity: 200,
          currentQuantity: 200,
          purchaseCost: Number(m.price) * 0.7,
        },
      });
    }
  }

  // Seed Lab Tests
  for (const t of tests) {
    await prisma.labTestCatalog.upsert({
      where: { testCode: t.testCode },
      update: {
        price: t.price,
        testName: t.testName,
        category: t.category,
        specimenType: t.specimenType,
        containerType: t.containerType,
        turnaroundHours: t.turnaroundHours,
        referenceRange: t.referenceRange,
        unit: t.unit,
      },
      create: t,
    });
  }

  console.log('Seeding of catalogs complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
