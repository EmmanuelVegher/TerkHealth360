import { prisma } from '../prisma.js';

async function setupDentalAndEyeTables() {
  console.log('[Setup] Creating Dental and Eye Clinic tables in PostgreSQL...');
  
  const statements = [
    // 🦷 Dental Tables
    `CREATE TABLE IF NOT EXISTS "dental_encounters" (
      "id" TEXT PRIMARY KEY,
      "encounterNumber" TEXT UNIQUE NOT NULL,
      "patientId" TEXT NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
      "dentistId" TEXT NOT NULL,
      "dentistName" TEXT,
      "visitId" TEXT,
      "chiefComplaint" TEXT,
      "clinicalNotes" TEXT,
      "periodontalNotes" TEXT,
      "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      "chartingType" TEXT NOT NULL DEFAULT 'ADULT_FDI',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "dental_tooth_findings" (
      "id" TEXT PRIMARY KEY,
      "dentalEncounterId" TEXT NOT NULL REFERENCES "dental_encounters"("id") ON DELETE CASCADE,
      "toothNumber" INTEGER NOT NULL,
      "toothSystem" TEXT NOT NULL DEFAULT 'FDI',
      "surfaceMesial" TEXT,
      "surfaceDistal" TEXT,
      "surfaceOcclusal" TEXT,
      "surfaceBuccal" TEXT,
      "surfaceLingual" TEXT,
      "wholeToothStatus" TEXT,
      "diagnosis" TEXT,
      "notes" TEXT,
      "cdtCode" TEXT,
      "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'EXISTING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "dental_perio_measurements" (
      "id" TEXT PRIMARY KEY,
      "dentalEncounterId" TEXT NOT NULL REFERENCES "dental_encounters"("id") ON DELETE CASCADE,
      "toothNumber" INTEGER NOT NULL,
      "site" TEXT NOT NULL,
      "probingDepthMM" INTEGER NOT NULL DEFAULT 2,
      "gingivalMarginMM" INTEGER NOT NULL DEFAULT 0,
      "calMM" INTEGER NOT NULL DEFAULT 2,
      "bleedingOnProbing" BOOLEAN NOT NULL DEFAULT FALSE,
      "suppuration" BOOLEAN NOT NULL DEFAULT FALSE,
      "furcationGrade" INTEGER,
      "mobilityClass" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "dental_lab_orders" (
      "id" TEXT PRIMARY KEY,
      "orderNumber" TEXT UNIQUE NOT NULL,
      "dentalEncounterId" TEXT NOT NULL REFERENCES "dental_encounters"("id") ON DELETE CASCADE,
      "patientId" TEXT NOT NULL,
      "labName" TEXT NOT NULL,
      "restorationType" TEXT NOT NULL,
      "toothNumbers" TEXT NOT NULL,
      "shadeVita" TEXT NOT NULL,
      "shadeStump" TEXT,
      "instructions" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ORDERED',
      "turnaroundDays" INTEGER NOT NULL DEFAULT 5,
      "expectedDueDate" TIMESTAMP(3),
      "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "dental_treatment_plan_items" (
      "id" TEXT PRIMARY KEY,
      "dentalEncounterId" TEXT NOT NULL REFERENCES "dental_encounters"("id") ON DELETE CASCADE,
      "patientId" TEXT NOT NULL,
      "phase" INTEGER NOT NULL DEFAULT 1,
      "procedureName" TEXT NOT NULL,
      "cdtCode" TEXT,
      "toothNumbers" TEXT,
      "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "isApprovedByPatient" BOOLEAN NOT NULL DEFAULT FALSE,
      "isBilled" BOOLEAN NOT NULL DEFAULT FALSE,
      "status" TEXT NOT NULL DEFAULT 'PROPOSED',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "dental_radiology_scans" (
      "id" TEXT PRIMARY KEY,
      "scanNumber" TEXT UNIQUE NOT NULL,
      "dentalEncounterId" TEXT REFERENCES "dental_encounters"("id") ON DELETE SET NULL,
      "patientId" TEXT NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
      "scanType" TEXT NOT NULL,
      "modality" TEXT NOT NULL DEFAULT 'PX',
      "title" TEXT NOT NULL,
      "seriesDescription" TEXT,
      "imageUrl" TEXT,
      "dicomUid" TEXT,
      "exposureDetails" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACQUIRED',
      "reportText" TEXT,
      "findingsNotes" TEXT,
      "radiationDoseDAP" TEXT,
      "teethIndicated" TEXT,
      "radiographer" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    // 👁️ Eye Clinic Tables
    `CREATE TABLE IF NOT EXISTS "eye_encounters" (
      "id" TEXT PRIMARY KEY,
      "encounterNumber" TEXT UNIQUE NOT NULL,
      "patientId" TEXT NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
      "ophthalmologistId" TEXT NOT NULL,
      "ophthalmologistName" TEXT,
      "visitId" TEXT,
      "chiefComplaint" TEXT,
      "historyOfPresentIllness" TEXT,
      "generalExam" TEXT,
      "anteriorSegmentOD" TEXT,
      "anteriorSegmentOS" TEXT,
      "posteriorFundusOD" TEXT,
      "posteriorFundusOS" TEXT,
      "cupToDiscRatioOD" DECIMAL(3,2),
      "cupToDiscRatioOS" DECIMAL(3,2),
      "diagnosisOD" TEXT,
      "diagnosisOS" TEXT,
      "clinicalManagementPlan" TEXT,
      "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "eye_refraction_exams" (
      "id" TEXT PRIMARY KEY,
      "eyeEncounterId" TEXT NOT NULL REFERENCES "eye_encounters"("id") ON DELETE CASCADE,
      "examType" TEXT NOT NULL DEFAULT 'MANIFEST',
      "vaDistanceOD" TEXT,
      "vaNearOD" TEXT,
      "sphereOD" DECIMAL(4,2),
      "cylinderOD" DECIMAL(4,2),
      "axisOD" INTEGER,
      "addOD" DECIMAL(4,2),
      "bcvaOD" TEXT,
      "vaDistanceOS" TEXT,
      "vaNearOS" TEXT,
      "sphereOS" DECIMAL(4,2),
      "cylinderOS" DECIMAL(4,2),
      "axisOS" INTEGER,
      "addOS" DECIMAL(4,2),
      "bcvaOS" TEXT,
      "vaDistanceOU" TEXT,
      "pupillaryDistanceMM" INTEGER,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "eye_iop_measurements" (
      "id" TEXT PRIMARY KEY,
      "eyeEncounterId" TEXT NOT NULL REFERENCES "eye_encounters"("id") ON DELETE CASCADE,
      "patientId" TEXT NOT NULL,
      "method" TEXT NOT NULL DEFAULT 'GOLDMANN',
      "iopOD" DECIMAL(4,1) NOT NULL,
      "iopOS" DECIMAL(4,1) NOT NULL,
      "pachymetryOD" INTEGER,
      "pachymetryOS" INTEGER,
      "timeMeasured" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "antiGlaucomaMeds" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "eye_anatomical_drawings" (
      "id" TEXT PRIMARY KEY,
      "eyeEncounterId" TEXT NOT NULL REFERENCES "eye_encounters"("id") ON DELETE CASCADE,
      "eyeSide" TEXT NOT NULL DEFAULT 'OD',
      "anatomicZone" TEXT NOT NULL DEFAULT 'RETINA_FUNDUS',
      "canvasSvgJson" TEXT NOT NULL,
      "pngDataUrl" TEXT,
      "annotations" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS "eye_optical_prescriptions" (
      "id" TEXT PRIMARY KEY,
      "rxNumber" TEXT UNIQUE NOT NULL,
      "eyeEncounterId" TEXT NOT NULL REFERENCES "eye_encounters"("id") ON DELETE CASCADE,
      "patientId" TEXT NOT NULL,
      "prescribedById" TEXT NOT NULL,
      "lensType" TEXT NOT NULL DEFAULT 'PROGRESSIVE',
      "lensMaterial" TEXT NOT NULL DEFAULT 'POLYCARBONATE_159',
      "coatings" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "sphereOD" DECIMAL(4,2) NOT NULL,
      "cylinderOD" DECIMAL(4,2) NOT NULL DEFAULT 0,
      "axisOD" INTEGER NOT NULL DEFAULT 0,
      "addOD" DECIMAL(4,2) NOT NULL DEFAULT 0,
      "sphereOS" DECIMAL(4,2) NOT NULL,
      "cylinderOS" DECIMAL(4,2) NOT NULL DEFAULT 0,
      "axisOS" INTEGER NOT NULL DEFAULT 0,
      "addOS" DECIMAL(4,2) NOT NULL DEFAULT 0,
      "pdDistanceMM" INTEGER NOT NULL DEFAULT 64,
      "pdNearMM" INTEGER,
      "usageAdvice" TEXT,
      "expiryDate" TIMESTAMP(3),
      "status" TEXT NOT NULL DEFAULT 'ISSUED',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (e: any) {
      console.warn(`[Setup table warning]: ${e.message}`);
    }
  }

  console.log('✅ Dental and Eye Clinic tables successfully created in database!');
}

setupDentalAndEyeTables()
  .catch(err => console.error('Setup error:', err))
  .finally(() => process.exit(0));
