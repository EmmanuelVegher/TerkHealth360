-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'RECEPTIONIST', 'PATIENT', 'STAFF');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'SEPARATED');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');

-- CreateEnum
CREATE TYPE "TelecomSystem" AS ENUM ('phone', 'fax', 'email', 'pager', 'url', 'sms', 'other');

-- CreateEnum
CREATE TYPE "TelecomUse" AS ENUM ('home', 'work', 'temp', 'old', 'mobile');

-- CreateEnum
CREATE TYPE "AddressUse" AS ENUM ('home', 'work', 'temp', 'old', 'billing');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('postal', 'physical', 'both');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'FULFILLED', 'CANCELLED', 'NOSHOW', 'ENTERED_IN_ERROR', 'PENDING', 'WAITLIST');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('PLANNED', 'ARRIVED', 'TRIAGED', 'IN_PROGRESS', 'ONLEAVE', 'FINISHED', 'CANCELLED', 'ENTERED_IN_ERROR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EncounterClass" AS ENUM ('AMBULATORY', 'EMERGENCY', 'FIELD', 'INPATIENT', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('REGISTERED', 'PRELIMINARY', 'FINAL', 'AMENDED', 'CORRECTED', 'CANCELLED', 'ENTERED_IN_ERROR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ClinicalStatus" AS ENUM ('ACTIVE', 'RECURRENCE', 'RELAPSE', 'INACTIVE', 'RESOLVED', 'REMISSION');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNCONFIRMED', 'PROVISIONAL', 'DIFFERENTIAL', 'CONFIRMED', 'REFUTED', 'ENTERED_IN_ERROR');

-- CreateEnum
CREATE TYPE "MedicationRequestStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'CANCELLED', 'COMPLETED', 'ENTERED_IN_ERROR', 'STOPPED', 'DRAFT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MedicationRequestIntent" AS ENUM ('PROPOSAL', 'PLAN', 'ORDER', 'ORIGINAL_ORDER', 'REFLEX_ORDER', 'FILLER_ORDER', 'INSTANCE_ORDER', 'OPTION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "twoFactorType" TEXT NOT NULL DEFAULT 'NONE',
    "emailOtpCode" TEXT,
    "emailOtpExpiresAt" TIMESTAMP(3),
    "passwordExpiresAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isTemporaryPassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "profilePicture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "fhirId" TEXT,
    "userId" TEXT NOT NULL,
    "patientNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "maidenName" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "Gender" NOT NULL,
    "maritalStatus" "MaritalStatus",
    "bloodGroup" "BloodGroup",
    "genotype" TEXT,
    "nationality" TEXT,
    "stateOfOrigin" TEXT,
    "lga" TEXT,
    "occupation" TEXT,
    "religion" TEXT,
    "spokenLanguage" TEXT,
    "nin" TEXT,
    "photoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "identification" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openmrsUuid" TEXT,
    "moniepointCustomerId" TEXT,
    "walletBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountOwed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "familyAccountId" TEXT,
    "familyRelationship" TEXT,
    "nokName" TEXT,
    "nokRelationship" TEXT,
    "nokPhone" TEXT,
    "nokAddress" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelationship" TEXT,
    "emergencyAddress" TEXT,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_identifiers" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "system" TEXT,
    "value" TEXT NOT NULL,
    "typeCode" TEXT,
    "typeDisplay" TEXT,

    CONSTRAINT "patient_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_telecoms" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "system" "TelecomSystem" NOT NULL DEFAULT 'phone',
    "value" TEXT NOT NULL,
    "use" "TelecomUse",
    "rank" INTEGER,

    CONSTRAINT "patient_telecoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_addresses" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "line" TEXT,
    "city" TEXT,
    "district" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "use" "AddressUse",
    "type" "AddressType",

    CONSTRAINT "patient_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "department" TEXT,
    "designation" TEXT,
    "qualification" TEXT,
    "specialization" TEXT,
    "licenseNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "fhirId" TEXT,
    "patientId" TEXT NOT NULL,
    "staffId" TEXT,
    "serviceType" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "reasonText" TEXT,
    "comment" TEXT,
    "appointmentNumber" TEXT,
    "appointmentType" TEXT,
    "visitType" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 15,
    "statusReason" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" TEXT,
    "parentAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "fhirId" TEXT,
    "patientId" TEXT NOT NULL,
    "staffId" TEXT,
    "visitId" TEXT,
    "status" "EncounterStatus" NOT NULL DEFAULT 'PLANNED',
    "class" "EncounterClass" NOT NULL DEFAULT 'AMBULATORY',
    "type" TEXT,
    "serviceType" TEXT,
    "start" TIMESTAMP(3),
    "end" TIMESTAMP(3),
    "reasonText" TEXT,
    "diagnosis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "fhirId" TEXT,
    "patientId" TEXT NOT NULL,
    "staffId" TEXT,
    "encounterId" TEXT,
    "status" "ObservationStatus" NOT NULL DEFAULT 'FINAL',
    "category" TEXT,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "valueQuantity" JSONB,
    "valueString" TEXT,
    "valueDateTime" TIMESTAMP(3),
    "effectiveDateTime" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditions" (
    "id" TEXT NOT NULL,
    "fhirId" TEXT,
    "patientId" TEXT NOT NULL,
    "staffId" TEXT,
    "encounterId" TEXT,
    "clinicalStatus" "ClinicalStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "category" TEXT,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "onsetDateTime" TIMESTAMP(3),
    "abatementDateTime" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_requests" (
    "id" TEXT NOT NULL,
    "fhirId" TEXT,
    "patientId" TEXT NOT NULL,
    "staffId" TEXT,
    "encounterId" TEXT,
    "status" "MedicationRequestStatus" NOT NULL DEFAULT 'ACTIVE',
    "intent" "MedicationRequestIntent" NOT NULL DEFAULT 'ORDER',
    "medicationCode" TEXT,
    "medicationDisplay" TEXT,
    "dosageText" TEXT,
    "note" TEXT,
    "authoredOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "fhirId" TEXT,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasonText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_role_mappings" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_role_mappings_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "headStaffId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_departments" (
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_departments_pkey" PRIMARY KEY ("userId","departmentId")
);

-- CreateTable
CREATE TABLE "department_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldDepartmentId" TEXT,
    "newDepartmentId" TEXT NOT NULL,
    "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "justification" TEXT,

    CONSTRAINT "department_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "break_glass_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actionPerformed" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "break_glass_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_card_reprints" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "reprintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reprintedBy" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "patient_card_reprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_accounts" (
    "id" TEXT NOT NULL,
    "familyNumber" TEXT NOT NULL,
    "headPatientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "visitNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "admittingStaffId" TEXT,
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "dischargeReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ADMITTED',

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "referringStaffId" TEXT NOT NULL,
    "receivingDept" TEXT,
    "receivingHospital" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactDetails" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "insurance_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_benefit_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "coverageDetails" JSONB,

    CONSTRAINT "insurance_benefit_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_insurance_policies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "membershipNumber" TEXT NOT NULL,
    "enrolleeNumber" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "patient_insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "encounterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_histories" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "lmp" TIMESTAMP(3),
    "edd" TIMESTAMP(3),
    "gravida" INTEGER,
    "para" INTEGER,
    "abortions" INTEGER,
    "livingChildren" INTEGER,
    "tobaccoUse" TEXT,
    "alcoholUse" TEXT,
    "lifestyleNotes" TEXT,
    "pastSurgicalNotes" TEXT,
    "familyHereditaryNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "medical_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reaction" TEXT,
    "onset" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_alerts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_notes" (
    "id" TEXT NOT NULL,
    "visitId" TEXT,
    "encounterId" TEXT,
    "patientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjective" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "signature" TEXT,
    "signedAt" TIMESTAMP(3),
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_note_amendments" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "amendedBy" TEXT NOT NULL,
    "amendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldSubjective" TEXT NOT NULL,
    "oldObjective" TEXT NOT NULL,
    "oldAssessment" TEXT NOT NULL,
    "oldPlan" TEXT NOT NULL,
    "justification" TEXT NOT NULL,

    CONSTRAINT "consultation_note_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_attachments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploader" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_calendar_blocks" (
    "id" TEXT NOT NULL,
    "staffId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "provider_calendar_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_queues" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "tokenNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "priorityReason" TEXT,
    "calledAt" TIMESTAMP(3),
    "serviceStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_feedbacks" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedbackText" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_accounts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationOtp" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_assignments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "shiftId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,

    CONSTRAINT "nurse_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_shifts" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "shiftType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "changedToStaffId" TEXT,

    CONSTRAINT "nurse_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_handovers" (
    "id" TEXT NOT NULL,
    "outgoingNurseId" TEXT NOT NULL,
    "incomingNurseId" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "outstandingTasks" TEXT,
    "medicationsDue" TEXT,
    "pendingInvestigations" TEXT,
    "clinicalConcerns" TEXT,
    "risks" TEXT,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "shift_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_tasks" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedNurseId" TEXT NOT NULL,
    "completedNurseId" TEXT,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "deferredReason" TEXT,

    CONSTRAINT "nursing_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triage_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "triageType" TEXT NOT NULL DEFAULT 'OUTPATIENT',
    "systolic" DOUBLE PRECISION NOT NULL,
    "diastolic" DOUBLE PRECISION NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "pulseRate" DOUBLE PRECISION NOT NULL,
    "respiratoryRate" DOUBLE PRECISION NOT NULL,
    "spo2" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "presentingComplaints" TEXT NOT NULL,
    "painScore" INTEGER NOT NULL DEFAULT 0,
    "consciousnessLevel" TEXT NOT NULL DEFAULT 'ALERT',
    "mobility" TEXT,
    "hydration" TEXT,
    "nutrition" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'STANDARD',
    "news2Score" INTEGER NOT NULL DEFAULT 0,
    "news2Risk" TEXT NOT NULL DEFAULT 'LOW',
    "triageStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triageEnd" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_care_plans" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "nursingDiagnosis" TEXT NOT NULL,
    "goals" TEXT NOT NULL,
    "expectedOutcomes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursing_care_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursing_interventions" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "missedReason" TEXT,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nursing_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emar_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "site" TEXT,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "administeredTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "administeredById" TEXT,
    "omittedReason" TEXT,
    "notes" TEXT,

    CONSTRAINT "emar_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pregnancy_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "gestationNumber" INTEGER NOT NULL DEFAULT 1,
    "lmpDate" TIMESTAMP(3) NOT NULL,
    "eddDate" TIMESTAMP(3) NOT NULL,
    "isHighRisk" BOOLEAN NOT NULL DEFAULT false,
    "highRiskReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pregnancy_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antenatal_visits" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestationalWeeks" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION,
    "systolic" DOUBLE PRECISION,
    "diastolic" DOUBLE PRECISION,
    "urineProtein" TEXT,
    "urineGlucose" TEXT,
    "fundalHeight" DOUBLE PRECISION,
    "fetalPresentation" TEXT,
    "fetalLie" TEXT,
    "fetalHeartRate" DOUBLE PRECISION,
    "fetalMovement" TEXT,
    "dangerSigns" TEXT,
    "educationTopics" TEXT,
    "nextVisitDate" TIMESTAMP(3),

    CONSTRAINT "antenatal_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_records" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "membranesStatus" TEXT NOT NULL DEFAULT 'INTACT',
    "cervicalDilatation" DOUBLE PRECISION NOT NULL,
    "contractionsFrequency" INTEGER NOT NULL,
    "fetalHeartRate" DOUBLE PRECISION NOT NULL,
    "maternalPulse" DOUBLE PRECISION NOT NULL,
    "maternalBp" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "partographData" TEXT,

    CONSTRAINT "labour_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_records" (
    "id" TEXT NOT NULL,
    "pregnancyId" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'VAGINAL',
    "birthTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloodLossMl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complications" TEXT,
    "placentaCondition" TEXT,
    "birthAttendantId" TEXT NOT NULL,

    CONSTRAINT "delivery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neonatal_records" (
    "id" TEXT NOT NULL,
    "deliveryRecordId" TEXT NOT NULL,
    "motherId" TEXT NOT NULL,
    "babyName" TEXT NOT NULL,
    "birthWeight" DOUBLE PRECISION NOT NULL,
    "birthLength" DOUBLE PRECISION,
    "headCircumference" DOUBLE PRECISION,
    "sex" TEXT NOT NULL DEFAULT 'MALE',
    "apgar1Min" INTEGER NOT NULL,
    "apgar5Min" INTEGER NOT NULL,
    "examinationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "neonatal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_discussions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_discussions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_discussion_comments" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "isRecommendation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_discussion_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdt_meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "agenda" TEXT NOT NULL,
    "casesJson" TEXT,
    "minutes" TEXT,
    "decisionsJson" TEXT,
    "attendanceJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mdt_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemedicine_sessions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "hasConsent" BOOLEAN NOT NULL DEFAULT true,
    "recordingConsentText" TEXT,
    "isRecorded" BOOLEAN NOT NULL DEFAULT false,
    "recordingUrl" TEXT,
    "sessionStart" TIMESTAMP(3),
    "sessionEnd" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "telemedicine_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "patientId" TEXT,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_catalog" (
    "id" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "specimenType" TEXT NOT NULL,
    "specimenVolume" TEXT,
    "containerType" TEXT,
    "turnaroundHours" INTEGER NOT NULL DEFAULT 24,
    "referenceRange" TEXT,
    "unit" TEXT,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresFasting" BOOLEAN NOT NULL DEFAULT false,
    "criticalLow" DOUBLE PRECISION,
    "criticalHigh" DOUBLE PRECISION,
    "loincCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_test_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "visitId" TEXT,
    "department" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "clinicalNotes" TEXT,
    "diagnosis" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "insurancePolicyNo" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "price" DECIMAL(12,2) NOT NULL,
    "worksheetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_specimens" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "barcodeId" TEXT NOT NULL,
    "specimenType" TEXT NOT NULL,
    "containerType" TEXT,
    "collectedAt" TIMESTAMP(3),
    "collectedBy" TEXT,
    "receivedAt" TIMESTAMP(3),
    "receivedBy" TEXT,
    "volume" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'ACCEPTABLE',
    "rejectionReason" TEXT,
    "storageLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_COLLECTION',
    "chainOfCustody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_specimens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_worksheets" (
    "id" TEXT NOT NULL,
    "worksheetNo" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_worksheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "worksheetId" TEXT,
    "resultValue" TEXT,
    "resultUnit" TEXT,
    "referenceRange" TEXT,
    "interpretation" TEXT,
    "resultText" TEXT,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "criticalNotified" BOOLEAN NOT NULL DEFAULT false,
    "criticalNotifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "resultedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amendmentReason" TEXT,
    "isAmended" BOOLEAN NOT NULL DEFAULT false,
    "previousValue" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_qc_records" (
    "id" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "analyzerName" TEXT NOT NULL,
    "controlName" TEXT NOT NULL,
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "testName" TEXT NOT NULL,
    "expectedRange" TEXT NOT NULL,
    "measuredValue" TEXT NOT NULL,
    "isWithinRange" BOOLEAN NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedBy" TEXT NOT NULL,
    "comments" TEXT,
    "correctionTaken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_qc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_inventory_items" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minimumStock" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "reorderLevel" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "storageCondition" TEXT,
    "expiryDate" TIMESTAMP(3),
    "lotNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_inventory_transactions" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "performedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_equipment" (
    "id" TEXT NOT NULL,
    "equipmentName" TEXT NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "lastCalibrated" TIMESTAMP(3),
    "nextCalibration" TIMESTAMP(3),
    "lastServiced" TIMESTAMP(3),
    "nextService" TIMESTAMP(3),
    "installDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_critical_alerts" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "criticalValue" TEXT NOT NULL,
    "notifiedTo" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "responseAction" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'SYSTEM',

    CONSTRAINT "lab_critical_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_referrals" (
    "id" TEXT NOT NULL,
    "referralNumber" TEXT NOT NULL,
    "orderId" TEXT,
    "patientName" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "testRequested" TEXT NOT NULL,
    "referredTo" TEXT NOT NULL,
    "referralDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultReceived" BOOLEAN NOT NULL DEFAULT false,
    "resultDate" TIMESTAMP(3),
    "resultSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_inventory_items" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "manufacturer" TEXT,
    "supplierPreferred" TEXT,
    "storageRequirements" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'PRESCRIPTION',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "requiresFasting" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loincCode" TEXT,
    "moniepointProductId" TEXT,
    "stockLeft" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_stock_batches" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "manufacturerDate" TIMESTAMP(3),
    "purchaseCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "receivedQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "supplierId" TEXT,
    "lotNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_prescriptions" (
    "id" TEXT NOT NULL,
    "prescriptionNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescribedById" TEXT NOT NULL,
    "verifiedById" TEXT,
    "visitId" TEXT,
    "encounterId" TEXT,
    "department" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "clinicalNotes" TEXT,
    "diagnosis" TEXT,
    "openmrsUuid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "insurancePolicyNo" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "allergyCheckDone" BOOLEAN NOT NULL DEFAULT false,
    "interactionCheckDone" BOOLEAN NOT NULL DEFAULT false,
    "duplicateCheckDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_prescription_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "dosageForm" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "quantityPrescribed" INTEGER NOT NULL,
    "quantityDispensed" INTEGER NOT NULL DEFAULT 0,
    "refillsAllowed" INTEGER NOT NULL DEFAULT 0,
    "refillsRemaining" INTEGER NOT NULL DEFAULT 0,
    "clinicalIndication" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_dispensing_records" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "prescriptionItemId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantityDispensed" INTEGER NOT NULL,
    "dispensedById" TEXT NOT NULL,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "barcodeVerified" BOOLEAN NOT NULL DEFAULT false,
    "barcodeScanned" TEXT,
    "insuranceStatus" TEXT NOT NULL DEFAULT 'PATIENT_PAY',
    "coPaymentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "claimId" TEXT,
    "counsellingDone" BOOLEAN NOT NULL DEFAULT false,
    "counsellingNotes" TEXT,
    "counsellingPrecautions" TEXT,
    "patientAcknowledge" BOOLEAN NOT NULL DEFAULT false,
    "moniepointSaleId" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Cash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_dispensing_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_controlled_substance_logs" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "authorizedBy" TEXT,
    "verificationDetails" TEXT,
    "patientName" TEXT,
    "prescriptionNo" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_controlled_substance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_suppliers" (
    "id" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "licenseInfo" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "certifications" TEXT,
    "paymentTerms" TEXT,
    "deliveryTimeDays" INTEGER NOT NULL DEFAULT 7,
    "orderAccuracyPct" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "qualityIncidents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contracts" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_purchase_orders" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliverySchedule" TEXT,
    "approvalWorkflow" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_purchase_order_items" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_grns" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT NOT NULL,
    "supplierInvoiceNo" TEXT,
    "discrepanciesCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_grns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_grn_items" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "quantityReceived" INTEGER NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_grn_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_stock_adjustments" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "physicalCount" INTEGER NOT NULL,
    "systemBalance" INTEGER NOT NULL,
    "discrepancy" INTEGER NOT NULL,
    "adjustmentReason" TEXT NOT NULL,
    "authorizedById" TEXT NOT NULL,
    "adjustedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_ades" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "causality" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "eventDescription" TEXT NOT NULL,
    "laboratoryResults" TEXT,
    "clinicalNotes" TEXT,
    "reportedBy" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_ades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_clinical_interventions" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "pharmacistId" TEXT NOT NULL,
    "prescriberId" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "prescriberAction" TEXT NOT NULL DEFAULT 'PENDING',
    "actionRationale" TEXT,
    "clinicalOutcome" TEXT,
    "documentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_clinical_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_antimicrobial_records" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "clinicalIndication" TEXT NOT NULL,
    "intendedDurationDays" INTEGER NOT NULL,
    "plannedReviewDate" TIMESTAMP(3) NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "stewardshipNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_antimicrobial_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_sync_logs" (
    "id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_imaging_catalog" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "prepInstructions" TEXT,
    "radiationCategory" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "insuranceCovered" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radiology_imaging_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "encounterId" TEXT,
    "clinicalHistory" TEXT,
    "provisionalDiagnosis" TEXT,
    "allergies" TEXT,
    "pregnancyStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "priority" TEXT NOT NULL DEFAULT 'ROUTINE',
    "status" TEXT NOT NULL DEFAULT 'ORDERED',
    "insuranceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "preAuthCode" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radiology_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_order_histories" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radiology_order_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_schedules" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 20,
    "roomId" TEXT,
    "technicianId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radiology_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_pacs_studies" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "studyInstanceUID" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "seriesCount" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "pacsUrl" TEXT,
    "storageSizeMB" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "radiationDose" DECIMAL(10,3),
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radiology_pacs_studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_reports" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "verifierId" TEXT,
    "technique" TEXT,
    "findings" TEXT NOT NULL,
    "impression" TEXT NOT NULL,
    "recommendations" TEXT,
    "criticalLevel" TEXT NOT NULL DEFAULT 'ROUTINE',
    "criticalNotified" BOOLEAN NOT NULL DEFAULT false,
    "criticalAcknowledge" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "amendedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "radiology_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_equipment" (
    "id" TEXT NOT NULL,
    "assetNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "installationDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "radiology_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_equipment_qa" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutcome" TEXT NOT NULL DEFAULT 'PASSED',
    "details" TEXT NOT NULL,
    "checkedBy" TEXT NOT NULL,

    CONSTRAINT "radiology_equipment_qa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_equipment_maintenance" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "type" TEXT NOT NULL DEFAULT 'PREVENTIVE',
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outcomeDetails" TEXT,
    "performedBy" TEXT NOT NULL,

    CONSTRAINT "radiology_equipment_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_incidents" (
    "id" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT,
    "reportedById" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "description" TEXT NOT NULL,
    "rootCause" TEXT,
    "capaActions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radiology_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radiology_audit_trails" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "orderId" TEXT,
    "studyId" TEXT,
    "userId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radiology_audit_trails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_donors" (
    "id" TEXT NOT NULL,
    "donorNumber" TEXT NOT NULL,
    "patientId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "rhStatus" TEXT NOT NULL,
    "donorCategory" TEXT NOT NULL DEFAULT 'VOLUNTARY',
    "consentSigned" BOOLEAN NOT NULL DEFAULT false,
    "deferralStatus" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "deferralReason" TEXT,
    "deferralExpiry" TIMESTAMP(3),
    "lastDonationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_donations" (
    "id" TEXT NOT NULL,
    "donationUnitNo" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectionSite" TEXT NOT NULL DEFAULT 'MAIN_BANK',
    "phlebotomistId" TEXT NOT NULL,
    "anticoagulantType" TEXT NOT NULL DEFAULT 'CPD',
    "volumeML" INTEGER NOT NULL DEFAULT 450,
    "adverseReaction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COLLECTED',

    CONSTRAINT "blood_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_components" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "volumeML" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "storageLocation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUARANTINED',
    "reservedForId" TEXT,
    "processedById" TEXT NOT NULL,

    CONSTRAINT "blood_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_test_results" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "details" TEXT,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_transfusion_requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'ROUTINE',
    "componentType" TEXT NOT NULL,
    "quantityUnits" INTEGER NOT NULL DEFAULT 1,
    "clinicalIndication" TEXT NOT NULL,
    "intendedDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_transfusion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_compatibility_tests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "crossmatchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'GEL_COLUMN',
    "result" TEXT NOT NULL DEFAULT 'COMPATIBLE',
    "scientistId" TEXT NOT NULL,

    CONSTRAINT "blood_compatibility_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_transfusion_records" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "administeredById" TEXT NOT NULL,
    "wristbandScanned" BOOLEAN NOT NULL DEFAULT false,
    "bagLabelScanned" BOOLEAN NOT NULL DEFAULT false,
    "doubleCheckedBy" TEXT NOT NULL,
    "vitalsBaseline" TEXT,
    "vitalsMidpoint" TEXT,
    "vitalsCompletion" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "suspectedReaction" BOOLEAN NOT NULL DEFAULT false,
    "reactionSeverity" TEXT,
    "reactionDetails" TEXT,
    "investigationOutcome" TEXT,

    CONSTRAINT "blood_transfusion_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blood_bank_equipment" (
    "id" TEXT NOT NULL,
    "equipmentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "minTempLimit" DECIMAL(4,2) NOT NULL,
    "maxTempLimit" DECIMAL(4,2) NOT NULL,
    "currentTemp" DECIMAL(4,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "lastCheckDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_bank_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgical_requests" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "surgeonId" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "proposedProcedure" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'ELECTIVE',
    "estimatedDurationMin" INTEGER NOT NULL DEFAULT 60,
    "anaesthesiaReqs" TEXT,
    "preferredDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surgical_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgical_bookings" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "surgeonId" TEXT NOT NULL,
    "anaesthetistId" TEXT,
    "operatingRoom" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "implantReserved" BOOLEAN NOT NULL DEFAULT false,
    "bloodProductsReserved" BOOLEAN NOT NULL DEFAULT false,
    "sterileKitsReserved" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surgical_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_op_assessments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "fastingHours" INTEGER NOT NULL DEFAULT 8,
    "medicalHistory" TEXT NOT NULL,
    "allergies" TEXT NOT NULL,
    "vitalsSigns" TEXT NOT NULL,
    "investigationStatus" TEXT NOT NULL DEFAULT 'COMPLETE',
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_op_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_anaesthetic_assessments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "airwayEvaluation" TEXT NOT NULL,
    "asaClassification" TEXT NOT NULL DEFAULT 'ASA_I',
    "anestheticRisks" TEXT NOT NULL,
    "plannedAnaesthesia" TEXT NOT NULL,
    "clearanceStatus" TEXT NOT NULL DEFAULT 'CLEARED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_anaesthetic_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgical_consents" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consentCode" TEXT NOT NULL,
    "benefitsExplained" BOOLEAN NOT NULL DEFAULT true,
    "risksExplained" BOOLEAN NOT NULL DEFAULT true,
    "signaturePatient" BOOLEAN NOT NULL DEFAULT false,
    "signatureSurgeon" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surgical_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "who_surgical_safety_checks" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "signInComplete" BOOLEAN NOT NULL DEFAULT false,
    "signInTime" TIMESTAMP(3),
    "timeoutComplete" BOOLEAN NOT NULL DEFAULT false,
    "timeoutTime" TIMESTAMP(3),
    "signoutComplete" BOOLEAN NOT NULL DEFAULT false,
    "signoutTime" TIMESTAMP(3),
    "completedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "who_surgical_safety_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intra_op_records" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "anaesthesiaStart" TIMESTAMP(3),
    "anaesthesiaEnd" TIMESTAMP(3),
    "surgicalIncision" TIMESTAMP(3),
    "surgicalClosure" TIMESTAMP(3),
    "initialInstrumentCount" INTEGER NOT NULL,
    "closureInstrumentCount" INTEGER NOT NULL,
    "instrumentReconciled" BOOLEAN NOT NULL DEFAULT false,
    "initialSwabCount" INTEGER NOT NULL,
    "closureSwabCount" INTEGER NOT NULL,
    "swabsReconciled" BOOLEAN NOT NULL DEFAULT false,
    "estimatedBloodLossML" INTEGER NOT NULL DEFAULT 0,
    "primaryProcedureNotes" TEXT NOT NULL,

    CONSTRAINT "intra_op_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgical_implants" (
    "id" TEXT NOT NULL,
    "intraOpRecordId" TEXT NOT NULL,
    "implantType" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "modelNumber" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "serialNumber" TEXT,
    "recallStatus" TEXT NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "surgical_implants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surgical_specimens" (
    "id" TEXT NOT NULL,
    "intraOpRecordId" TEXT NOT NULL,
    "anatomicalSource" TEXT NOT NULL,
    "specimenLabelCode" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAtLims" TIMESTAMP(3),
    "chainOfCustodyLogs" TEXT NOT NULL,

    CONSTRAINT "surgical_specimens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacu_recovery_records" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "admissionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargeTime" TIMESTAMP(3),
    "vitalsLog" TEXT NOT NULL,
    "painScore" INTEGER NOT NULL DEFAULT 0,
    "aldreteScore" INTEGER NOT NULL DEFAULT 10,
    "dischargeAuthorized" BOOLEAN NOT NULL DEFAULT false,
    "dischargeNotes" TEXT,

    CONSTRAINT "pacu_recovery_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cssd_sterilization_cycles" (
    "id" TEXT NOT NULL,
    "sterilizerCode" TEXT NOT NULL,
    "kitIdentifierCode" TEXT NOT NULL,
    "cycleNumber" TEXT NOT NULL,
    "temperatureCelsius" DECIMAL(5,2) NOT NULL,
    "pressurePsi" DECIMAL(4,2) NOT NULL,
    "exposureDurationMin" INTEGER NOT NULL,
    "cycleOutcomeStatus" TEXT NOT NULL DEFAULT 'PASSED',
    "officerId" TEXT NOT NULL,
    "sterilizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cssd_sterilization_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_beds" (
    "id" TEXT NOT NULL,
    "bedCode" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ICU',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isolationRules" TEXT,

    CONSTRAINT "icu_beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_admissions" (
    "id" TEXT NOT NULL,
    "admissionCode" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admittingStaffId" TEXT NOT NULL,
    "bedId" TEXT,
    "diagnosis" TEXT NOT NULL,
    "severityScore" INTEGER NOT NULL DEFAULT 0,
    "indication" TEXT NOT NULL,
    "urgency" TEXT NOT NULL DEFAULT 'URGENT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),

    CONSTRAINT "icu_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_care_plan_goals" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "icu_care_plan_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_equipment_assignments" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "equipmentType" TEXT NOT NULL,
    "equipmentCode" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "maintenanceStatus" TEXT NOT NULL DEFAULT 'VERIFIED',

    CONSTRAINT "icu_equipment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_physiological_observations" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "observerId" TEXT NOT NULL,
    "heartRate" INTEGER NOT NULL,
    "bpSystolic" INTEGER NOT NULL,
    "bpDiastolic" INTEGER NOT NULL,
    "respirationRate" INTEGER NOT NULL,
    "spo2" INTEGER NOT NULL,
    "temperature" DECIMAL(4,2) NOT NULL,
    "centralVenousPressure" INTEGER,
    "arterialPressure" INTEGER,
    "intracranialPressure" INTEGER,
    "cardiacOutput" DECIMAL(4,2),
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_physiological_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_device_integration_logs" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "rawData" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_device_integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_ventilator_settings" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "tidalVolumeML" INTEGER NOT NULL,
    "respirationRate" INTEGER NOT NULL,
    "fio2Percentage" INTEGER NOT NULL,
    "peepH2O" INTEGER NOT NULL,
    "supportPressureH2O" INTEGER NOT NULL,
    "pressureInspiratoryH2O" INTEGER NOT NULL,
    "weaningStatus" TEXT NOT NULL DEFAULT 'ONGOING',
    "extubationReadiness" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_ventilator_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_infusion_therapies" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "concentration" TEXT NOT NULL,
    "doseRate" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'IV',
    "initialClinicianId" TEXT NOT NULL,
    "verifiedClinicianId" TEXT,
    "isHighAlert" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),

    CONSTRAINT "icu_infusion_therapies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_dialysis_life_supports" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dialysisType" TEXT NOT NULL,
    "ultrafiltrationRateMLHr" DECIMAL(5,2) NOT NULL,
    "heparinDoseUnits" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_dialysis_life_supports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_neurological_observations" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "gcsEye" INTEGER NOT NULL,
    "gcsVerbal" INTEGER NOT NULL,
    "gcsMotor" INTEGER NOT NULL,
    "pupilReactivity" TEXT NOT NULL,
    "limbMovementGrading" TEXT NOT NULL,
    "rassScore" INTEGER NOT NULL DEFAULT 0,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_neurological_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_early_warning_alerts" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "newsScore" INTEGER NOT NULL,
    "abnormalTriggers" TEXT NOT NULL,
    "responderNotes" TEXT,
    "escalationLevel" TEXT NOT NULL DEFAULT 'NONE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_early_warning_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_progress_notes" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "assessments" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_progress_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_infection_prevention_checks" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "vapCompliance" BOOLEAN NOT NULL DEFAULT true,
    "clabsiCompliance" BOOLEAN NOT NULL DEFAULT true,
    "cautiCompliance" BOOLEAN NOT NULL DEFAULT true,
    "handHygieneCompliance" BOOLEAN NOT NULL DEFAULT true,
    "auditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_infection_prevention_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_clinical_pathway_compliance" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "pathwayName" TEXT NOT NULL,
    "compliancePercentage" INTEGER NOT NULL,
    "checklistsJson" TEXT NOT NULL,
    "overridesJson" TEXT,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_clinical_pathway_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_discharge_handovers" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "targetWard" TEXT NOT NULL,
    "currentDiagnosis" TEXT NOT NULL,
    "medicationsActive" TEXT NOT NULL,
    "outstandingCare" TEXT NOT NULL,
    "receivingClinicianSignoff" BOOLEAN NOT NULL DEFAULT false,
    "handoverDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_discharge_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_incident_records" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "severityGrading" TEXT NOT NULL,
    "rcaFindings" TEXT NOT NULL,
    "capaDetails" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_incident_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icu_staffing_shifts" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "patientRatio" INTEGER NOT NULL,
    "acuityWorkloadScore" INTEGER NOT NULL DEFAULT 10,
    "shiftDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icu_staffing_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_arrivals" (
    "id" TEXT NOT NULL,
    "arrivalCode" TEXT NOT NULL,
    "patientId" TEXT,
    "tempPatientName" TEXT,
    "arrivalMethod" TEXT NOT NULL DEFAULT 'WALK_IN',
    "presentingComplaint" TEXT NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ARRIVED',
    "bedId" TEXT,

    CONSTRAINT "emergency_arrivals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ambulance_pre_arrivals" (
    "id" TEXT NOT NULL,
    "arrivalId" TEXT NOT NULL,
    "dispatchTime" TIMESTAMP(3),
    "departureTime" TIMESTAMP(3),
    "arrivalTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "crewDetails" TEXT NOT NULL,
    "preHospitalVitals" TEXT,
    "preHospitalNotes" TEXT,
    "turnaroundTimeMin" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ambulance_pre_arrivals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_triages" (
    "id" TEXT NOT NULL,
    "arrivalId" TEXT NOT NULL,
    "triageCategory" TEXT NOT NULL DEFAULT 'BLUE',
    "presentingComplaint" TEXT NOT NULL,
    "heartRate" INTEGER NOT NULL,
    "bpSystolic" INTEGER NOT NULL,
    "bpDiastolic" INTEGER NOT NULL,
    "respirationRate" INTEGER NOT NULL,
    "spo2" INTEGER NOT NULL,
    "temperature" DECIMAL(4,2) NOT NULL,
    "painScore" INTEGER NOT NULL DEFAULT 0,
    "gcsScore" INTEGER NOT NULL DEFAULT 15,
    "allergies" TEXT NOT NULL DEFAULT 'NKDA',
    "pregnancyStatus" TEXT,
    "triageNurseName" TEXT NOT NULL,
    "triageTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reassessmentDate" TIMESTAMP(3),

    CONSTRAINT "emergency_triages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_beds" (
    "id" TEXT NOT NULL,
    "bedCode" TEXT NOT NULL,
    "bedType" TEXT NOT NULL DEFAULT 'TREATMENT_CUBICLE',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "emergency_beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_resuscitations" (
    "id" TEXT NOT NULL,
    "arrivalId" TEXT NOT NULL,
    "airwayNotes" TEXT NOT NULL,
    "circulationNotes" TEXT NOT NULL,
    "drugsAdministered" TEXT NOT NULL,
    "defibrillationShocks" INTEGER NOT NULL DEFAULT 0,
    "cprDurationMin" INTEGER NOT NULL DEFAULT 0,
    "outcomeStatus" TEXT NOT NULL DEFAULT 'ROSC',
    "resusStartTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resusEndTime" TIMESTAMP(3),

    CONSTRAINT "emergency_resuscitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_trauma_teams" (
    "id" TEXT NOT NULL,
    "arrivalId" TEXT NOT NULL,
    "teamLeaderId" TEXT NOT NULL,
    "surgeonId" TEXT,
    "activationTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mechanismOfInjury" TEXT NOT NULL,
    "injuryLocation" TEXT NOT NULL,
    "traumaScoreRTS" DECIMAL(3,2) NOT NULL,

    CONSTRAINT "emergency_trauma_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_procedures" (
    "id" TEXT NOT NULL,
    "arrivalId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "procedureType" TEXT NOT NULL,
    "indication" TEXT NOT NULL,
    "complications" TEXT,
    "outcomeStatus" TEXT NOT NULL DEFAULT 'SUCCESS',
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_observation_logs" (
    "id" TEXT NOT NULL,
    "arrivalId" TEXT NOT NULL,
    "nurseId" TEXT NOT NULL,
    "reasonForObservation" TEXT NOT NULL,
    "expectedDurationHrs" INTEGER NOT NULL DEFAULT 24,
    "treatmentNotes" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_observation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_discharge_handovers" (
    "id" TEXT NOT NULL,
    "arrivalId" TEXT NOT NULL,
    "targetWard" TEXT NOT NULL,
    "currentDiagnosis" TEXT NOT NULL,
    "medicationsActive" TEXT NOT NULL,
    "outstandingCare" TEXT NOT NULL,
    "receivingClinicianSignoff" BOOLEAN NOT NULL DEFAULT false,
    "handoverDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_discharge_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_disaster_incidents" (
    "id" TEXT NOT NULL,
    "disasterName" TEXT NOT NULL,
    "activationTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commanderId" TEXT NOT NULL,
    "resourceShortages" TEXT,
    "incidentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "emergency_disaster_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_incident_records" (
    "id" TEXT NOT NULL,
    "arrivalId" TEXT NOT NULL,
    "patientId" TEXT,
    "reporterId" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "severityGrading" TEXT NOT NULL,
    "rcaFindings" TEXT NOT NULL,
    "capaDetails" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_incident_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_staffing_shifts" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "shiftName" TEXT NOT NULL,
    "patientLoad" INTEGER NOT NULL,
    "acuityWorkloadScore" INTEGER NOT NULL DEFAULT 10,
    "shiftDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_staffing_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maternity_profiles" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "ageAtRegistration" INTEGER,
    "gravidity" INTEGER NOT NULL DEFAULT 1,
    "parity" INTEGER NOT NULL DEFAULT 0,
    "abortions" INTEGER NOT NULL DEFAULT 0,
    "livingChildren" INTEGER NOT NULL DEFAULT 0,
    "bloodGroup" TEXT,
    "rhesusStatus" TEXT,
    "hivStatus" TEXT,
    "hivTestDate" TIMESTAMP(3),
    "pmtctEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "pmtctArv" TEXT,
    "syphilisStatus" TEXT,
    "hepatitisBStatus" TEXT,
    "malariaStatus" TEXT,
    "ttDoseCount" INTEGER NOT NULL DEFAULT 0,
    "ironFolateSupplied" BOOLEAN NOT NULL DEFAULT false,
    "insuranceScheme" TEXT,
    "referralSource" TEXT,
    "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nigeriaObstetricScore" TEXT,
    "openMrsPatientUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maternity_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maternal_risk_assessments" (
    "id" TEXT NOT NULL,
    "maternityProfileId" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessorId" TEXT NOT NULL,
    "riskCategory" TEXT NOT NULL DEFAULT 'LOW',
    "riskFactors" TEXT NOT NULL,
    "recommendedCare" TEXT,
    "referralRequired" BOOLEAN NOT NULL DEFAULT false,
    "referralReason" TEXT,
    "referralFacility" TEXT,
    "actionPlan" TEXT,
    "nextReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maternal_risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fetal_surveillance" (
    "id" TEXT NOT NULL,
    "maternityProfileId" TEXT NOT NULL,
    "pregnancyId" TEXT,
    "surveillanceType" TEXT NOT NULL,
    "performedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestationalAgeWeeks" INTEGER,
    "biparietal" DOUBLE PRECISION,
    "fetalLength" DOUBLE PRECISION,
    "abdominalCirc" DOUBLE PRECISION,
    "estimatedFetalWeight" DOUBLE PRECISION,
    "amnioticFluidIndex" DOUBLE PRECISION,
    "placentaGrade" TEXT,
    "placentaLocation" TEXT,
    "cervicalLength" DOUBLE PRECISION,
    "fetalHeartRate" DOUBLE PRECISION,
    "kicksPerHour" INTEGER,
    "biophysicalScore" INTEGER,
    "dopplerFindings" TEXT,
    "anomaliesDetected" BOOLEAN NOT NULL DEFAULT false,
    "anomalyDetails" TEXT,
    "reportNotes" TEXT,
    "reportedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fetal_surveillance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maternal_complications" (
    "id" TEXT NOT NULL,
    "maternityProfileId" TEXT NOT NULL,
    "pregnancyId" TEXT,
    "complicationType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MILD',
    "onsetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "managementNotes" TEXT,
    "drugsAdministered" TEXT,
    "outcome" TEXT,
    "resolvedDate" TIMESTAMP(3),
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maternal_complications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labour_monitoring_entries" (
    "id" TEXT NOT NULL,
    "labourRecordId" TEXT NOT NULL,
    "entryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cervicalDilatation" DOUBLE PRECISION NOT NULL,
    "fetalStationLevel" TEXT,
    "fetalPresentation" TEXT,
    "fetalHeartRate" DOUBLE PRECISION NOT NULL,
    "uterineContractions" INTEGER NOT NULL,
    "contractionDuration" INTEGER,
    "contractionStrength" TEXT,
    "membranesStatus" TEXT,
    "liquidourColour" TEXT,
    "maternalPulse" DOUBLE PRECISION,
    "maternalBp" TEXT,
    "maternalTemp" DOUBLE PRECISION,
    "urineOutput" DOUBLE PRECISION,
    "oxytocin" TEXT,
    "epiduralGiven" BOOLEAN NOT NULL DEFAULT false,
    "alertLine" BOOLEAN NOT NULL DEFAULT false,
    "actionLine" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "enteredBy" TEXT,

    CONSTRAINT "labour_monitoring_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birth_notifications" (
    "id" TEXT NOT NULL,
    "neonatalRecordId" TEXT NOT NULL,
    "notificationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notificationRef" TEXT,
    "facilityCode" TEXT,
    "nhisSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "nhisRef" TEXT,
    "nhmisSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "nhmisRef" TEXT,
    "crvsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "crvsRef" TEXT,
    "birthCertRequested" BOOLEAN NOT NULL DEFAULT false,
    "birthCertNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "birth_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postnatal_visits" (
    "id" TEXT NOT NULL,
    "maternityProfileId" TEXT NOT NULL,
    "neonatalRecordId" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitType" TEXT NOT NULL DEFAULT 'ROUTINE',
    "dayPostDelivery" INTEGER,
    "motherVitalsBp" TEXT,
    "motherPulse" DOUBLE PRECISION,
    "motherTemp" DOUBLE PRECISION,
    "uterineInvolution" TEXT,
    "lochiaCharacter" TEXT,
    "perinealHealing" TEXT,
    "breastfeedingStatus" TEXT,
    "epsychologicalScreen" TEXT,
    "maternalDepression" BOOLEAN NOT NULL DEFAULT false,
    "babyWeight" DOUBLE PRECISION,
    "babyTemperature" DOUBLE PRECISION,
    "babyBreathing" TEXT,
    "cordHealingStatus" TEXT,
    "jaundicePresent" BOOLEAN NOT NULL DEFAULT false,
    "immunizationsGiven" TEXT,
    "vitaminKGiven" BOOLEAN NOT NULL DEFAULT false,
    "vaccinesGiven" TEXT,
    "clinicianNotes" TEXT,
    "nextVisitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "postnatal_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gynaecology_consultations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clinicianId" TEXT NOT NULL,
    "consultationType" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "menstrualHistory" TEXT,
    "obstetricHistory" TEXT,
    "contraceptiveHistory" TEXT,
    "clinicalFindings" TEXT,
    "investigationsOrdered" TEXT,
    "diagnosis" TEXT,
    "icdCode" TEXT,
    "managementPlan" TEXT,
    "proceduresPlanned" TEXT,
    "referralRequired" BOOLEAN NOT NULL DEFAULT false,
    "referralTo" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gynaecology_consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gynaecology_procedures" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT,
    "patientId" TEXT NOT NULL,
    "procedureType" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "performedDate" TIMESTAMP(3),
    "theatreId" TEXT,
    "surgeonId" TEXT,
    "anaesthesiaType" TEXT,
    "indication" TEXT,
    "procedureNotes" TEXT,
    "findings" TEXT,
    "complications" TEXT,
    "specimenSent" BOOLEAN NOT NULL DEFAULT false,
    "specimenRef" TEXT,
    "histologyResult" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gynaecology_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cervical_cancer_screenings" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "screeningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "screeningMethod" TEXT NOT NULL,
    "screeningResult" TEXT NOT NULL,
    "via_result" TEXT,
    "pap_result" TEXT,
    "hpv_genotype" TEXT,
    "referralForColposcopy" BOOLEAN NOT NULL DEFAULT false,
    "colposcopyDate" TIMESTAMP(3),
    "treatmentGiven" TEXT,
    "treatmentDate" TIMESTAMP(3),
    "followUpDate" TIMESTAMP(3),
    "screenedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cervical_cancer_screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_planning_enrollments" (
    "id" TEXT NOT NULL,
    "maternityProfileId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "counsellorId" TEXT,
    "methodChosen" TEXT NOT NULL,
    "methodStartDate" TIMESTAMP(3),
    "methodEndDate" TIMESTAMP(3),
    "reasonForMethod" TEXT,
    "sideEffectsReported" TEXT,
    "switchReason" TEXT,
    "previousMethod" TEXT,
    "isPostpartum" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nextAppointment" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_planning_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmtct_follow_ups" (
    "id" TEXT NOT NULL,
    "maternityProfileId" TEXT NOT NULL,
    "followUpDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "infantAge" TEXT,
    "infantArvProphylaxis" TEXT,
    "infantEidTest" BOOLEAN NOT NULL DEFAULT false,
    "infantEidResult" TEXT,
    "infantEidDate" TIMESTAMP(3),
    "breastfeedingStatus" TEXT,
    "motherArvAdherence" TEXT,
    "motherVlMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "motherVlResult" DOUBLE PRECISION,
    "motherVlDate" TIMESTAMP(3),
    "cotrimoxazoleProphylaxis" BOOLEAN NOT NULL DEFAULT false,
    "openMrsEncounterUuid" TEXT,
    "clinicianNotes" TEXT,
    "nextFollowUp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pmtct_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neonatal_care_entries" (
    "id" TEXT NOT NULL,
    "neonatalRecordId" TEXT NOT NULL,
    "admissionReason" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gestationalAgeWeeks" DOUBLE PRECISION,
    "birthWeightKg" DOUBLE PRECISION,
    "phototherapy" BOOLEAN NOT NULL DEFAULT false,
    "oxygen" BOOLEAN NOT NULL DEFAULT false,
    "ivFluids" BOOLEAN NOT NULL DEFAULT false,
    "antibiotics" BOOLEAN NOT NULL DEFAULT false,
    "surfactant" BOOLEAN NOT NULL DEFAULT false,
    "kangarooCare" BOOLEAN NOT NULL DEFAULT false,
    "enteral_feeding" BOOLEAN NOT NULL DEFAULT false,
    "totalParenteral" BOOLEAN NOT NULL DEFAULT false,
    "dayOfDischarge" TIMESTAMP(3),
    "dischargeWeight" DOUBLE PRECISION,
    "dischargeCondition" TEXT,
    "deathDate" TIMESTAMP(3),
    "causeOfDeath" TEXT,

    CONSTRAINT "neonatal_care_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maternal_death_reviews" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "deathDate" TIMESTAMP(3) NOT NULL,
    "deathLocation" TEXT NOT NULL,
    "deathCause" TEXT NOT NULL,
    "isMDDR" BOOLEAN NOT NULL DEFAULT false,
    "avoidability" TEXT,
    "delay1" BOOLEAN NOT NULL DEFAULT false,
    "delay2" BOOLEAN NOT NULL DEFAULT false,
    "delay3" BOOLEAN NOT NULL DEFAULT false,
    "reviewDate" TIMESTAMP(3),
    "reviewCommittee" TEXT,
    "findingsSummary" TEXT,
    "recommendations" TEXT,
    "reportSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "nhmisRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maternal_death_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fertility_assessments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "partnerId" TEXT,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clinicianId" TEXT,
    "durationInfertility" TEXT,
    "infertilityType" TEXT,
    "femaleInvestigations" TEXT,
    "maleInvestigations" TEXT,
    "diagnosisFemal" TEXT,
    "diagnosisMale" TEXT,
    "treatmentPlan" TEXT,
    "artRecommended" BOOLEAN NOT NULL DEFAULT false,
    "artType" TEXT,
    "referralFacility" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fertility_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_queue" (
    "id" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_at" TIMESTAMP(3),

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "patients_fhirId_key" ON "patients"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_userId_key" ON "patients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_patientNumber_key" ON "patients"("patientNumber");

-- CreateIndex
CREATE UNIQUE INDEX "patients_nin_key" ON "patients"("nin");

-- CreateIndex
CREATE UNIQUE INDEX "patient_identifiers_patientId_system_value_key" ON "patient_identifiers"("patientId", "system", "value");

-- CreateIndex
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_employeeId_key" ON "staff"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_fhirId_key" ON "appointments"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointmentNumber_key" ON "appointments"("appointmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_fhirId_key" ON "encounters"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "observations_fhirId_key" ON "observations"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "conditions_fhirId_key" ON "conditions"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "medication_requests_fhirId_key" ON "medication_requests"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_fhirId_key" ON "invoices"("fhirId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "family_accounts_familyNumber_key" ON "family_accounts"("familyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "family_accounts_headPatientId_key" ON "family_accounts"("headPatientId");

-- CreateIndex
CREATE UNIQUE INDEX "visits_visitNumber_key" ON "visits"("visitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "wards_name_key" ON "wards"("name");

-- CreateIndex
CREATE UNIQUE INDEX "beds_wardId_number_key" ON "beds"("wardId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_providers_name_key" ON "insurance_providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_providers_code_key" ON "insurance_providers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "patient_insurance_policies_providerId_membershipNumber_key" ON "patient_insurance_policies"("providerId", "membershipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "medical_histories_patientId_key" ON "medical_histories"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "portal_accounts_patientId_key" ON "portal_accounts"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_test_catalog_testCode_key" ON "lab_test_catalog"("testCode");

-- CreateIndex
CREATE UNIQUE INDEX "lab_orders_orderNumber_key" ON "lab_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "lab_specimens_barcodeId_key" ON "lab_specimens"("barcodeId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_worksheets_worksheetNo_key" ON "lab_worksheets"("worksheetNo");

-- CreateIndex
CREATE UNIQUE INDEX "lab_results_orderItemId_key" ON "lab_results"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_inventory_items_itemCode_key" ON "lab_inventory_items"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "lab_equipment_serialNumber_key" ON "lab_equipment"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "lab_referrals_referralNumber_key" ON "lab_referrals"("referralNumber");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_inventory_items_itemCode_key" ON "pharmacy_inventory_items"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_stock_batches_inventoryItemId_batchNumber_key" ON "pharmacy_stock_batches"("inventoryItemId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_prescriptions_prescriptionNumber_key" ON "pharmacy_prescriptions"("prescriptionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_suppliers_supplierName_key" ON "pharmacy_suppliers"("supplierName");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_purchase_orders_poNumber_key" ON "pharmacy_purchase_orders"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_grns_grnNumber_key" ON "pharmacy_grns"("grnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_imaging_catalog_code_key" ON "radiology_imaging_catalog"("code");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_orders_orderNumber_key" ON "radiology_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_pacs_studies_studyInstanceUID_key" ON "radiology_pacs_studies"("studyInstanceUID");

-- CreateIndex
CREATE UNIQUE INDEX "radiology_equipment_assetNumber_key" ON "radiology_equipment"("assetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "blood_donors_donorNumber_key" ON "blood_donors"("donorNumber");

-- CreateIndex
CREATE UNIQUE INDEX "blood_donations_donationUnitNo_key" ON "blood_donations"("donationUnitNo");

-- CreateIndex
CREATE UNIQUE INDEX "blood_components_componentCode_key" ON "blood_components"("componentCode");

-- CreateIndex
CREATE UNIQUE INDEX "blood_transfusion_requests_requestNumber_key" ON "blood_transfusion_requests"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "blood_bank_equipment_equipmentCode_key" ON "blood_bank_equipment"("equipmentCode");

-- CreateIndex
CREATE UNIQUE INDEX "surgical_requests_requestNumber_key" ON "surgical_requests"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "surgical_consents_consentCode_key" ON "surgical_consents"("consentCode");

-- CreateIndex
CREATE UNIQUE INDEX "intra_op_records_bookingId_key" ON "intra_op_records"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "surgical_specimens_specimenLabelCode_key" ON "surgical_specimens"("specimenLabelCode");

-- CreateIndex
CREATE UNIQUE INDEX "pacu_recovery_records_bookingId_key" ON "pacu_recovery_records"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "cssd_sterilization_cycles_cycleNumber_key" ON "cssd_sterilization_cycles"("cycleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "icu_beds_bedCode_key" ON "icu_beds"("bedCode");

-- CreateIndex
CREATE UNIQUE INDEX "icu_admissions_admissionCode_key" ON "icu_admissions"("admissionCode");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_arrivals_arrivalCode_key" ON "emergency_arrivals"("arrivalCode");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_beds_bedCode_key" ON "emergency_beds"("bedCode");

-- CreateIndex
CREATE UNIQUE INDEX "maternity_profiles_patientId_key" ON "maternity_profiles"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "birth_notifications_neonatalRecordId_key" ON "birth_notifications"("neonatalRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "birth_notifications_notificationRef_key" ON "birth_notifications"("notificationRef");

-- CreateIndex
CREATE INDEX "sync_queue_status_created_at_idx" ON "sync_queue"("status", "created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_familyAccountId_fkey" FOREIGN KEY ("familyAccountId") REFERENCES "family_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_identifiers" ADD CONSTRAINT "patient_identifiers_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_telecoms" ADD CONSTRAINT "patient_telecoms_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_addresses" ADD CONSTRAINT "patient_addresses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_mappings" ADD CONSTRAINT "user_role_mappings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_mappings" ADD CONSTRAINT "user_role_mappings_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_histories" ADD CONSTRAINT "department_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_histories" ADD CONSTRAINT "department_histories_newDepartmentId_fkey" FOREIGN KEY ("newDepartmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_histories" ADD CONSTRAINT "password_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "break_glass_logs" ADD CONSTRAINT "break_glass_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_card_reprints" ADD CONSTRAINT "patient_card_reprints_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "wards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_benefit_plans" ADD CONSTRAINT "insurance_benefit_plans_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "insurance_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_insurance_policies" ADD CONSTRAINT "patient_insurance_policies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_insurance_policies" ADD CONSTRAINT "patient_insurance_policies_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "insurance_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_insurance_policies" ADD CONSTRAINT "patient_insurance_policies_planId_fkey" FOREIGN KEY ("planId") REFERENCES "insurance_benefit_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "patient_insurance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_histories" ADD CONSTRAINT "medical_histories_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_alerts" ADD CONSTRAINT "clinical_alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_notes" ADD CONSTRAINT "consultation_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_notes" ADD CONSTRAINT "consultation_notes_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_note_amendments" ADD CONSTRAINT "consultation_note_amendments_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "consultation_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_attachments" ADD CONSTRAINT "clinical_attachments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_calendar_blocks" ADD CONSTRAINT "provider_calendar_blocks_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_queues" ADD CONSTRAINT "patient_queues_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_queues" ADD CONSTRAINT "patient_queues_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_feedbacks" ADD CONSTRAINT "patient_feedbacks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_accounts" ADD CONSTRAINT "portal_accounts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurse_assignments" ADD CONSTRAINT "nurse_assignments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurse_assignments" ADD CONSTRAINT "nurse_assignments_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurse_shifts" ADD CONSTRAINT "nurse_shifts_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_outgoingNurseId_fkey" FOREIGN KEY ("outgoingNurseId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_incomingNurseId_fkey" FOREIGN KEY ("incomingNurseId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_tasks" ADD CONSTRAINT "nursing_tasks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_tasks" ADD CONSTRAINT "nursing_tasks_assignedNurseId_fkey" FOREIGN KEY ("assignedNurseId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_tasks" ADD CONSTRAINT "nursing_tasks_completedNurseId_fkey" FOREIGN KEY ("completedNurseId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triage_records" ADD CONSTRAINT "triage_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_care_plans" ADD CONSTRAINT "nursing_care_plans_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_care_plans" ADD CONSTRAINT "nursing_care_plans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_interventions" ADD CONSTRAINT "nursing_interventions_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "nursing_care_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_interventions" ADD CONSTRAINT "nursing_interventions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursing_interventions" ADD CONSTRAINT "nursing_interventions_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emar_records" ADD CONSTRAINT "emar_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emar_records" ADD CONSTRAINT "emar_records_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pregnancy_records" ADD CONSTRAINT "pregnancy_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antenatal_visits" ADD CONSTRAINT "antenatal_visits_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "pregnancy_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_records" ADD CONSTRAINT "labour_records_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "pregnancy_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_pregnancyId_fkey" FOREIGN KEY ("pregnancyId") REFERENCES "pregnancy_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_birthAttendantId_fkey" FOREIGN KEY ("birthAttendantId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neonatal_records" ADD CONSTRAINT "neonatal_records_deliveryRecordId_fkey" FOREIGN KEY ("deliveryRecordId") REFERENCES "delivery_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neonatal_records" ADD CONSTRAINT "neonatal_records_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_discussions" ADD CONSTRAINT "clinical_discussions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_discussions" ADD CONSTRAINT "clinical_discussions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_discussion_comments" ADD CONSTRAINT "clinical_discussion_comments_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "clinical_discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_discussion_comments" ADD CONSTRAINT "clinical_discussion_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemedicine_sessions" ADD CONSTRAINT "telemedicine_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemedicine_sessions" ADD CONSTRAINT "telemedicine_sessions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_messages" ADD CONSTRAINT "clinical_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_messages" ADD CONSTRAINT "clinical_messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_messages" ADD CONSTRAINT "clinical_messages_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_testId_fkey" FOREIGN KEY ("testId") REFERENCES "lab_test_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "lab_worksheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_specimens" ADD CONSTRAINT "lab_specimens_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_worksheets" ADD CONSTRAINT "lab_worksheets_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "lab_order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_worksheetId_fkey" FOREIGN KEY ("worksheetId") REFERENCES "lab_worksheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_inventory_transactions" ADD CONSTRAINT "lab_inventory_transactions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "lab_inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_critical_alerts" ADD CONSTRAINT "lab_critical_alerts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_critical_alerts" ADD CONSTRAINT "lab_critical_alerts_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "lab_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_stock_batches" ADD CONSTRAINT "pharmacy_stock_batches_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "pharmacy_inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_stock_batches" ADD CONSTRAINT "pharmacy_stock_batches_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "pharmacy_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_prescriptions" ADD CONSTRAINT "pharmacy_prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_prescriptions" ADD CONSTRAINT "pharmacy_prescriptions_prescribedById_fkey" FOREIGN KEY ("prescribedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_prescriptions" ADD CONSTRAINT "pharmacy_prescriptions_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_prescription_items" ADD CONSTRAINT "pharmacy_prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "pharmacy_prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_prescription_items" ADD CONSTRAINT "pharmacy_prescription_items_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "pharmacy_inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_dispensing_records" ADD CONSTRAINT "pharmacy_dispensing_records_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "pharmacy_prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_dispensing_records" ADD CONSTRAINT "pharmacy_dispensing_records_prescriptionItemId_fkey" FOREIGN KEY ("prescriptionItemId") REFERENCES "pharmacy_prescription_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_dispensing_records" ADD CONSTRAINT "pharmacy_dispensing_records_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "pharmacy_stock_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_dispensing_records" ADD CONSTRAINT "pharmacy_dispensing_records_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_controlled_substance_logs" ADD CONSTRAINT "pharmacy_controlled_substance_logs_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "pharmacy_inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_purchase_orders" ADD CONSTRAINT "pharmacy_purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "pharmacy_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_purchase_order_items" ADD CONSTRAINT "pharmacy_purchase_order_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES "pharmacy_purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_purchase_order_items" ADD CONSTRAINT "pharmacy_purchase_order_items_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "pharmacy_inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_grns" ADD CONSTRAINT "pharmacy_grns_poId_fkey" FOREIGN KEY ("poId") REFERENCES "pharmacy_purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_grn_items" ADD CONSTRAINT "pharmacy_grn_items_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "pharmacy_grns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_grn_items" ADD CONSTRAINT "pharmacy_grn_items_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "pharmacy_inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_stock_adjustments" ADD CONSTRAINT "pharmacy_stock_adjustments_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "pharmacy_inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_stock_adjustments" ADD CONSTRAINT "pharmacy_stock_adjustments_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_ades" ADD CONSTRAINT "pharmacy_ades_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_clinical_interventions" ADD CONSTRAINT "pharmacy_clinical_interventions_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "pharmacy_prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_clinical_interventions" ADD CONSTRAINT "pharmacy_clinical_interventions_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_clinical_interventions" ADD CONSTRAINT "pharmacy_clinical_interventions_prescriberId_fkey" FOREIGN KEY ("prescriberId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_antimicrobial_records" ADD CONSTRAINT "pharmacy_antimicrobial_records_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "pharmacy_prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "radiology_imaging_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_orders" ADD CONSTRAINT "radiology_orders_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_order_histories" ADD CONSTRAINT "radiology_order_histories_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "radiology_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_schedules" ADD CONSTRAINT "radiology_schedules_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "radiology_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_schedules" ADD CONSTRAINT "radiology_schedules_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_pacs_studies" ADD CONSTRAINT "radiology_pacs_studies_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "radiology_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "radiology_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_reports" ADD CONSTRAINT "radiology_reports_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_equipment_qa" ADD CONSTRAINT "radiology_equipment_qa_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "radiology_equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_equipment_maintenance" ADD CONSTRAINT "radiology_equipment_maintenance_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "radiology_equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_incidents" ADD CONSTRAINT "radiology_incidents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radiology_incidents" ADD CONSTRAINT "radiology_incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_donors" ADD CONSTRAINT "blood_donors_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_donations" ADD CONSTRAINT "blood_donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "blood_donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_donations" ADD CONSTRAINT "blood_donations_phlebotomistId_fkey" FOREIGN KEY ("phlebotomistId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_components" ADD CONSTRAINT "blood_components_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "blood_donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_components" ADD CONSTRAINT "blood_components_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_test_results" ADD CONSTRAINT "blood_test_results_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "blood_donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_transfusion_requests" ADD CONSTRAINT "blood_transfusion_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_transfusion_requests" ADD CONSTRAINT "blood_transfusion_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_compatibility_tests" ADD CONSTRAINT "blood_compatibility_tests_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "blood_transfusion_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_compatibility_tests" ADD CONSTRAINT "blood_compatibility_tests_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "blood_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_compatibility_tests" ADD CONSTRAINT "blood_compatibility_tests_scientistId_fkey" FOREIGN KEY ("scientistId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_transfusion_records" ADD CONSTRAINT "blood_transfusion_records_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "blood_transfusion_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_transfusion_records" ADD CONSTRAINT "blood_transfusion_records_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "blood_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_transfusion_records" ADD CONSTRAINT "blood_transfusion_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blood_transfusion_records" ADD CONSTRAINT "blood_transfusion_records_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_requests" ADD CONSTRAINT "surgical_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_requests" ADD CONSTRAINT "surgical_requests_surgeonId_fkey" FOREIGN KEY ("surgeonId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_bookings" ADD CONSTRAINT "surgical_bookings_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "surgical_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_bookings" ADD CONSTRAINT "surgical_bookings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_bookings" ADD CONSTRAINT "surgical_bookings_surgeonId_fkey" FOREIGN KEY ("surgeonId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_bookings" ADD CONSTRAINT "surgical_bookings_anaesthetistId_fkey" FOREIGN KEY ("anaesthetistId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_op_assessments" ADD CONSTRAINT "pre_op_assessments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "surgical_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_op_assessments" ADD CONSTRAINT "pre_op_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_op_assessments" ADD CONSTRAINT "pre_op_assessments_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_anaesthetic_assessments" ADD CONSTRAINT "pre_anaesthetic_assessments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "surgical_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_anaesthetic_assessments" ADD CONSTRAINT "pre_anaesthetic_assessments_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_consents" ADD CONSTRAINT "surgical_consents_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "surgical_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_consents" ADD CONSTRAINT "surgical_consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "who_surgical_safety_checks" ADD CONSTRAINT "who_surgical_safety_checks_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "surgical_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intra_op_records" ADD CONSTRAINT "intra_op_records_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "surgical_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_implants" ADD CONSTRAINT "surgical_implants_intraOpRecordId_fkey" FOREIGN KEY ("intraOpRecordId") REFERENCES "intra_op_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgical_specimens" ADD CONSTRAINT "surgical_specimens_intraOpRecordId_fkey" FOREIGN KEY ("intraOpRecordId") REFERENCES "intra_op_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacu_recovery_records" ADD CONSTRAINT "pacu_recovery_records_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "surgical_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacu_recovery_records" ADD CONSTRAINT "pacu_recovery_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pacu_recovery_records" ADD CONSTRAINT "pacu_recovery_records_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cssd_sterilization_cycles" ADD CONSTRAINT "cssd_sterilization_cycles_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_admissions" ADD CONSTRAINT "icu_admissions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_admissions" ADD CONSTRAINT "icu_admissions_admittingStaffId_fkey" FOREIGN KEY ("admittingStaffId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_admissions" ADD CONSTRAINT "icu_admissions_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "icu_beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_care_plan_goals" ADD CONSTRAINT "icu_care_plan_goals_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_equipment_assignments" ADD CONSTRAINT "icu_equipment_assignments_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_physiological_observations" ADD CONSTRAINT "icu_physiological_observations_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_physiological_observations" ADD CONSTRAINT "icu_physiological_observations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_physiological_observations" ADD CONSTRAINT "icu_physiological_observations_observerId_fkey" FOREIGN KEY ("observerId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_ventilator_settings" ADD CONSTRAINT "icu_ventilator_settings_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_infusion_therapies" ADD CONSTRAINT "icu_infusion_therapies_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_infusion_therapies" ADD CONSTRAINT "icu_infusion_therapies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_dialysis_life_supports" ADD CONSTRAINT "icu_dialysis_life_supports_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_dialysis_life_supports" ADD CONSTRAINT "icu_dialysis_life_supports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_neurological_observations" ADD CONSTRAINT "icu_neurological_observations_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_neurological_observations" ADD CONSTRAINT "icu_neurological_observations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_neurological_observations" ADD CONSTRAINT "icu_neurological_observations_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_early_warning_alerts" ADD CONSTRAINT "icu_early_warning_alerts_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_early_warning_alerts" ADD CONSTRAINT "icu_early_warning_alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_progress_notes" ADD CONSTRAINT "icu_progress_notes_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_infection_prevention_checks" ADD CONSTRAINT "icu_infection_prevention_checks_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_clinical_pathway_compliance" ADD CONSTRAINT "icu_clinical_pathway_compliance_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_discharge_handovers" ADD CONSTRAINT "icu_discharge_handovers_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_discharge_handovers" ADD CONSTRAINT "icu_discharge_handovers_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_discharge_handovers" ADD CONSTRAINT "icu_discharge_handovers_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_incident_records" ADD CONSTRAINT "icu_incident_records_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "icu_admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_incident_records" ADD CONSTRAINT "icu_incident_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_incident_records" ADD CONSTRAINT "icu_incident_records_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icu_staffing_shifts" ADD CONSTRAINT "icu_staffing_shifts_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_arrivals" ADD CONSTRAINT "emergency_arrivals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_arrivals" ADD CONSTRAINT "emergency_arrivals_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "emergency_beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambulance_pre_arrivals" ADD CONSTRAINT "ambulance_pre_arrivals_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "emergency_arrivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_triages" ADD CONSTRAINT "emergency_triages_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "emergency_arrivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_resuscitations" ADD CONSTRAINT "emergency_resuscitations_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "emergency_arrivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_trauma_teams" ADD CONSTRAINT "emergency_trauma_teams_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "emergency_arrivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_trauma_teams" ADD CONSTRAINT "emergency_trauma_teams_teamLeaderId_fkey" FOREIGN KEY ("teamLeaderId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_trauma_teams" ADD CONSTRAINT "emergency_trauma_teams_surgeonId_fkey" FOREIGN KEY ("surgeonId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_procedures" ADD CONSTRAINT "emergency_procedures_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "emergency_arrivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_procedures" ADD CONSTRAINT "emergency_procedures_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_observation_logs" ADD CONSTRAINT "emergency_observation_logs_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "emergency_arrivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_observation_logs" ADD CONSTRAINT "emergency_observation_logs_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_discharge_handovers" ADD CONSTRAINT "emergency_discharge_handovers_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "emergency_arrivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_incident_records" ADD CONSTRAINT "emergency_incident_records_arrivalId_fkey" FOREIGN KEY ("arrivalId") REFERENCES "emergency_arrivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_incident_records" ADD CONSTRAINT "emergency_incident_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_incident_records" ADD CONSTRAINT "emergency_incident_records_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_staffing_shifts" ADD CONSTRAINT "emergency_staffing_shifts_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maternity_profiles" ADD CONSTRAINT "maternity_profiles_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maternal_risk_assessments" ADD CONSTRAINT "maternal_risk_assessments_maternityProfileId_fkey" FOREIGN KEY ("maternityProfileId") REFERENCES "maternity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maternal_risk_assessments" ADD CONSTRAINT "maternal_risk_assessments_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fetal_surveillance" ADD CONSTRAINT "fetal_surveillance_maternityProfileId_fkey" FOREIGN KEY ("maternityProfileId") REFERENCES "maternity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maternal_complications" ADD CONSTRAINT "maternal_complications_maternityProfileId_fkey" FOREIGN KEY ("maternityProfileId") REFERENCES "maternity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labour_monitoring_entries" ADD CONSTRAINT "labour_monitoring_entries_labourRecordId_fkey" FOREIGN KEY ("labourRecordId") REFERENCES "labour_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birth_notifications" ADD CONSTRAINT "birth_notifications_neonatalRecordId_fkey" FOREIGN KEY ("neonatalRecordId") REFERENCES "neonatal_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postnatal_visits" ADD CONSTRAINT "postnatal_visits_maternityProfileId_fkey" FOREIGN KEY ("maternityProfileId") REFERENCES "maternity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gynaecology_consultations" ADD CONSTRAINT "gynaecology_consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gynaecology_consultations" ADD CONSTRAINT "gynaecology_consultations_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gynaecology_procedures" ADD CONSTRAINT "gynaecology_procedures_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cervical_cancer_screenings" ADD CONSTRAINT "cervical_cancer_screenings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_planning_enrollments" ADD CONSTRAINT "family_planning_enrollments_maternityProfileId_fkey" FOREIGN KEY ("maternityProfileId") REFERENCES "maternity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_planning_enrollments" ADD CONSTRAINT "family_planning_enrollments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmtct_follow_ups" ADD CONSTRAINT "pmtct_follow_ups_maternityProfileId_fkey" FOREIGN KEY ("maternityProfileId") REFERENCES "maternity_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "neonatal_care_entries" ADD CONSTRAINT "neonatal_care_entries_neonatalRecordId_fkey" FOREIGN KEY ("neonatalRecordId") REFERENCES "neonatal_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maternal_death_reviews" ADD CONSTRAINT "maternal_death_reviews_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fertility_assessments" ADD CONSTRAINT "fertility_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
