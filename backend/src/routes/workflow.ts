import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../utils/auditHelper.js';
import { prisma } from '../prisma.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES = [
  {
    name: 'Standard OPD',
    visitType: 'OUTPATIENT',
    description: 'Standard outpatient department flow with billing gate before consultation',
    isDefault: true,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Registered', description: 'Patient has been registered and visit created', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'registration', moduleRoute: '/register-patient' },
      { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', label: 'Awaiting Payment', description: 'Waiting for consultation fee payment at cashier', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: true, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', description: 'Consultation fee received and confirmed', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: true, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 4, statusCode: 'WAITING_TRIAGE', label: 'Waiting for Triage', description: 'Patient queued for nursing vitals assessment', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'nursing', moduleRoute: '/nursing' },
      { stepOrder: 5, statusCode: 'IN_TRIAGE', label: 'In Triage', description: 'Nurse is assessing patient vitals and complaints', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'nursing', moduleRoute: '/nursing' },
      { stepOrder: 6, statusCode: 'WAITING_CONSULTATION', label: 'Waiting for Consultation', description: 'Patient ready to be seen by the clinician', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'emr', moduleRoute: '/emr-workspace' },
      { stepOrder: 7, statusCode: 'IN_CONSULTATION', label: 'In Consultation', description: 'Doctor consultation in progress', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'emr', moduleRoute: '/emr-workspace' },
      { stepOrder: 8, statusCode: 'AWAITING_INVESTIGATION', label: 'Awaiting Investigation', description: 'Laboratory or radiology orders placed', assignedRole: 'LAB_TECHNICIAN', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'lims', moduleRoute: '/lims' },
      { stepOrder: 9, statusCode: 'RESULTS_AVAILABLE', label: 'Results Available', description: 'Investigation results ready for clinician review', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'lims', moduleRoute: '/lims' },
      { stepOrder: 10, statusCode: 'WAITING_PHARMACY', label: 'Waiting for Pharmacy', description: 'Prescription issued, awaiting dispensing', assignedRole: 'PHARMACIST', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'pharmacy', moduleRoute: '/pharmacy' },
      { stepOrder: 11, statusCode: 'MEDICATION_DISPENSED', label: 'Medication Dispensed', description: 'Pharmacy services completed', assignedRole: 'PHARMACIST', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'pharmacy', moduleRoute: '/pharmacy' },
      { stepOrder: 12, statusCode: 'CLOSED', label: 'Closed', description: 'Visit fully completed', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Quick Admit Patient to A&E',
    visitType: 'EMERGENCY',
    description: 'Emergency A&E Quick Intake — Immediate nursing triage, resus/trolley bed allocation, STAT labs/meds, retrospective billing after stabilization.',
    isDefault: true,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'A&E Quick Intake Registered', description: 'Emergency arrival registered at A&E desk or triage bay', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'emergency', moduleRoute: '/ipd/emergency' },
      { stepOrder: 2, statusCode: 'IN_TRIAGE', label: 'Emergency Triage Assessment', description: 'ESI/Manchester priority triage & vital signs assessment', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'emergency', moduleRoute: '/ipd/emergency' },
      { stepOrder: 3, statusCode: 'IN_CONSULTATION', label: 'Emergency Resuscitation & Doctor Care', description: 'Emergency physician immediate clinical management', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'emergency', moduleRoute: '/ipd/emergency' },
      { stepOrder: 4, statusCode: 'AWAITING_INVESTIGATION', label: 'Emergency STAT Investigations', description: 'Urgent lab & radiology orders', assignedRole: 'LAB_TECHNICIAN', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'lims', moduleRoute: '/lims' },
      { stepOrder: 5, statusCode: 'WAITING_PHARMACY', label: 'Emergency STAT Pharmacy / Meds', description: 'Emergency stat medications & fluid administration', assignedRole: 'PHARMACIST', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'pharmacy', moduleRoute: '/pharmacy' },
      { stepOrder: 6, statusCode: 'AWAITING_PAYMENT', label: 'Post-Treatment Retrospective Billing', description: 'Retrospective administrative check-in & billing after stabilization', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: true, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 7, statusCode: 'DISCHARGED', label: 'A&E Discharge / Ward Transfer', description: 'Discharged from A&E or admitted to Inpatient Ward', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'emergency', moduleRoute: '/ipd/emergency' },
      { stepOrder: 8, statusCode: 'CLOSED', label: 'Emergency Visit Closed', description: 'A&E visit record fully closed', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Antenatal Care (ANC)',
    visitType: 'ANC',
    description: 'Antenatal care visit flow for pregnant patients',
    isDefault: false,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Registered', description: 'ANC patient registered', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'registration', moduleRoute: '/register-patient' },
      { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', label: 'ANC Fee Payment', description: 'Waiting for ANC visit fee', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', description: 'ANC fee received', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 4, statusCode: 'IN_TRIAGE', label: 'ANC Vitals / Nursing', description: 'ANC nurse takes vitals and assessments', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/maternity' },
      { stepOrder: 5, statusCode: 'IN_CONSULTATION', label: 'Doctor / Midwife Consultation', description: 'ANC consultation with clinician', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/maternity' },
      { stepOrder: 6, statusCode: 'AWAITING_INVESTIGATION', label: 'ANC Laboratory', description: 'ANC lab orders pending', assignedRole: 'LAB_TECHNICIAN', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'lims', moduleRoute: '/lims' },
      { stepOrder: 7, statusCode: 'WAITING_PHARMACY', label: 'Pharmacy / Supplements', description: 'ANC medications/supplements dispensing', assignedRole: 'PHARMACIST', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'pharmacy', moduleRoute: '/pharmacy' },
      { stepOrder: 8, statusCode: 'CLOSED', label: 'Closed — Next ANC Visit Booked', description: 'ANC visit complete, follow-up scheduled', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'appointments', moduleRoute: '/appointments' },
    ],
  },
  {
    name: 'Maternity',
    visitType: 'MATERNITY',
    description: 'Maternity ward admission, labor progress, and delivery monitoring flow',
    isDefault: false,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Registered', description: 'Maternity patient check-in registered', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'registration', moduleRoute: '/register-patient' },
      { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', label: 'Maternity Deposit Payment', description: 'Maternity admission/delivery fee deposit', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: true, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', description: 'Maternity deposit fee confirmed', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: true, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 4, statusCode: 'IN_TRIAGE', label: 'Labor Admission Triage', description: 'Maternity nurse vitals and initial contraction assessment', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/maternity' },
      { stepOrder: 5, statusCode: 'IN_CONSULTATION', label: 'Doctor / Midwife Delivery Monitoring', description: 'Active monitoring of labor, delivery, or post-partum care', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/maternity' },
      { stepOrder: 6, statusCode: 'IN_LABOUR', label: 'Active Labour Ward & Bed Occupied', description: 'Admitted in active Labour Ward. Bed allocated & Partograph monitoring active.', assignedRole: 'MIDWIFE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/labour-ward' },
      { stepOrder: 7, statusCode: 'AWAITING_INVESTIGATION', label: 'Maternity Investigations', description: 'Lab tests or ultrasound orders pending', assignedRole: 'LAB_TECHNICIAN', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'lims', moduleRoute: '/lims' },
      { stepOrder: 8, statusCode: 'WAITING_PHARMACY', label: 'Maternity Pharmacy / Delivery Pack', description: 'Medications and delivery/surgical packs dispensing', assignedRole: 'PHARMACIST', isBillingGate: false, isOptional: true, skipForEmergency: false, module: 'pharmacy', moduleRoute: '/pharmacy' },
      { stepOrder: 9, statusCode: 'CLOSED', label: 'Discharged & Closed', description: 'Mother and baby discharged successfully', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Direct Labour & Delivery Admission',
    visitType: 'LABOUR_DELIVERY',
    description: 'Emergency Direct Labour Ward Admission — Midwife clinical intake, bed allocation & Partograph surveillance, retrospective billing after delivery.',
    isDefault: true,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Registered', description: 'Emergency direct labour arrival registered', assignedRole: 'MIDWIFE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/labour-ward' },
      { stepOrder: 2, statusCode: 'IN_LABOUR', label: 'Active Labour & Bed Occupied', description: 'Admitted in active Labour Ward. Bed allocated & Partograph monitoring active.', assignedRole: 'MIDWIFE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/labour-ward' },
      { stepOrder: 3, statusCode: 'IN_CONSULTATION', label: 'Obstetric Care / Partograph Surveillance', description: 'Obstetrician/midwife active labour surveillance', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/labour-ward' },
      { stepOrder: 4, statusCode: 'DELIVERED', label: 'Delivered (Birth Notification)', description: 'Baby delivered successfully, birth notification recorded', assignedRole: 'MIDWIFE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/labour-ward' },
      { stepOrder: 5, statusCode: 'RECOVERY', label: 'Post-Delivery Recovery', description: 'Mother monitored in post-delivery recovery bed', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/labour-ward' },
      { stepOrder: 6, statusCode: 'AWAITING_PAYMENT', label: 'Post-Delivery Administrative Billing', description: 'HMO / cash billing retrospective check-in', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: true, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 7, statusCode: 'DISCHARGED', label: 'Maternal & Neonatal Discharge', description: 'Discharged from Labour & Delivery Ward', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'maternity', moduleRoute: '/labour-ward' },
      { stepOrder: 8, statusCode: 'CLOSED', label: 'Visit Closed', description: 'Labour & Delivery visit fully closed', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Laboratory Only',
    visitType: 'LAB_ONLY',
    description: 'Walk-in laboratory test only — no consultation required',
    isDefault: false,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Registered', description: 'Lab-only patient registered', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'registration', moduleRoute: '/register-patient' },
      { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', label: 'Lab Fee Payment', description: 'Lab test fees to be paid', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', description: 'Lab payment received', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 4, statusCode: 'IN_LABORATORY', label: 'In Laboratory', description: 'Sample collected and being processed', assignedRole: 'LAB_TECHNICIAN', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'lims', moduleRoute: '/lims' },
      { stepOrder: 5, statusCode: 'RESULTS_AVAILABLE', label: 'Results Available', description: 'Lab results ready for collection', assignedRole: 'LAB_TECHNICIAN', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'lims', moduleRoute: '/lims' },
      { stepOrder: 6, statusCode: 'CLOSED', label: 'Closed', description: 'Lab visit complete, results collected', assignedRole: 'LAB_TECHNICIAN', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Physiotherapy & Rehabilitation',
    visitType: 'PHYSIO',
    description: 'Paperless Physiotherapy & Rehabilitation Journey — Electronic Referral intake from Wards/OPD or direct walk-in, treatment package billing gatekeeper, baseline SOAP assessment, kinematic biofeedback mirror, daily gym/bedside therapy, and discharge.',
    isDefault: true,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Referral / Walk-in Intake', description: 'Patient registered via electronic referral from Ward/OPD or direct walk-in', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'rehabilitation', moduleRoute: '/rehabilitation' },
      { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', label: 'Treatment Package Billing Gatekeeper', description: 'Payment of session bundle or HMO pre-authorization', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', label: 'Package Credits Confirmed', description: 'Bundle credits activated & allocated to patient account', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 4, statusCode: 'IN_PHYSIOTHERAPY', label: 'Initial SOAP Assessment & Body Map', description: 'Physiotherapist baseline evaluation, pain VAS & ROM range', assignedRole: 'STAFF', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'rehabilitation', moduleRoute: '/rehabilitation' },
      { stepOrder: 5, statusCode: 'IN_REHAB_MIRROR', label: 'Kinematic Biofeedback Mirror & Therapy', description: 'Active gym rehabilitation, MoveNet Computer Vision tracking & manual therapy', assignedRole: 'STAFF', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'rehabilitation', moduleRoute: '/rehabilitation/mirror' },
      { stepOrder: 6, statusCode: 'DISCHARGED', label: 'Treatment Completed / Home Program (HEP)', description: 'Recovery goals achieved, home exercise program prescribed, and episode closed', assignedRole: 'STAFF', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'rehabilitation', moduleRoute: '/rehabilitation' },
      { stepOrder: 7, statusCode: 'CLOSED', label: 'Episode Closed', description: 'Rehabilitation visit journey complete', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Inpatient (IPD)',
    visitType: 'INPATIENT',
    description: 'Inpatient admission and ward care flow',
    isDefault: false,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Registered', description: 'Inpatient arrival registered', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'registration', moduleRoute: '/register-patient' },
      { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', label: 'Admission Fee Payment', description: 'Waiting for admission fee payment', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: true, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', description: 'Admission fee received', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: true, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 4, statusCode: 'IN_TRIAGE', label: 'Admission Assessment', description: 'Admitting vital signs assessment', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'nursing', moduleRoute: '/nursing' },
      { stepOrder: 5, statusCode: 'ADMITTED', label: 'Admitted to Ward', description: 'Patient admitted and bed assigned', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'ipd', moduleRoute: '/ipd' },
      { stepOrder: 6, statusCode: 'IN_CONSULTATION', label: 'Active Ward Care', description: 'Inpatient treatment in ward', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'ipd', moduleRoute: '/ipd' },
      { stepOrder: 7, statusCode: 'CLOSED', label: 'Discharged & Closed', description: 'Visit complete, patient discharged', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Pharmacy Only',
    visitType: 'PHARMACY_ONLY',
    description: 'Walk-in pharmacy client — no consultation required',
    isDefault: false,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Registered', description: 'Pharmacy walk-in registered', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'registration', moduleRoute: '/register-patient' },
      { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', label: 'Pharmacy Payment', description: 'Payment for prescribed/walk-in drugs', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', description: 'Payment received', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 4, statusCode: 'WAITING_PHARMACY', label: 'Pharmacy Queue', description: 'Waiting for dispensing', assignedRole: 'PHARMACIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'pharmacy', moduleRoute: '/pharmacy' },
      { stepOrder: 5, statusCode: 'MEDICATION_DISPENSED', label: 'Dispensed', description: 'Drugs dispensed to patient', assignedRole: 'PHARMACIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'pharmacy', moduleRoute: '/pharmacy' },
      { stepOrder: 6, statusCode: 'CLOSED', label: 'Closed', description: 'Pharmacy visit complete', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Mortuary Service',
    visitType: 'MORTUARY_ONLY',
    description: 'Mortuary services flow',
    isDefault: false,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Registered', description: 'Mortuary external registered', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'registration', moduleRoute: '/register-patient' },
      { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', label: 'Mortuary Fee Payment', description: 'Payment for mortuary services', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', description: 'Payment received', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 4, statusCode: 'IN_MORTUARY', label: 'In Mortuary', description: 'Mortuary services active', assignedRole: 'MORTICIAN', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'mortuary', moduleRoute: '/mortuary' },
      { stepOrder: 5, statusCode: 'CLOSED', label: 'Closed', description: 'Service complete', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Scheduled Surgery (Elective/Urgent)',
    visitType: 'SURGERY_SCHEDULED',
    description: 'Elective & Urgent Perioperative Workflow — Clinical booking order, financial deposit clearance, pre-op clinical assessment, operating theatre suite, PACU recovery, ward transfer & discharge.',
    isDefault: true,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'Surgical Order Booked', description: 'Surgical order requested & patient perioperative check-in registered', assignedRole: 'SURGEON', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'theatre', moduleRoute: '/theatre' },
      { stepOrder: 2, statusCode: 'AWAITING_PAYMENT', label: 'Financial Clearance & Deposit', description: 'Surgical fee / deposit financial clearance & HMO pre-authorization', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 3, statusCode: 'PAYMENT_CONFIRMED', label: 'Financial Clearance Approved', description: 'Surgical deposit paid / HMO authorization confirmed', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 4, statusCode: 'PRE_OP_ASSESSMENT', label: 'Pre-Op & Anaesthetic Clearance', description: 'Fasting verification, WHO safety checklist, and pre-anaesthetic clearance', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'theatre', moduleRoute: '/theatre' },
      { stepOrder: 5, statusCode: 'IN_SURGERY', label: 'Operating Theatre (In Surgery)', description: 'Patient in Operating Room Suite, procedure in progress', assignedRole: 'SURGEON', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'theatre', moduleRoute: '/theatre' },
      { stepOrder: 6, statusCode: 'RECOVERY', label: 'PACU Recovery Room', description: 'Post-Anaesthesia Care Unit (PACU) monitoring & Aldrete score assessment', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'theatre', moduleRoute: '/theatre' },
      { stepOrder: 7, statusCode: 'ADMITTED', label: 'Surgical Ward Transfer', description: 'Transferred to Post-Operative Surgical Ward for recovery', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'ipd', moduleRoute: '/ipd' },
      { stepOrder: 8, statusCode: 'CLOSED', label: 'Discharged & Surgery Closed', description: 'Surgical episode complete and patient discharged', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
  {
    name: 'Emergency STAT Surgery (Category 1)',
    visitType: 'SURGERY_EMERGENCY',
    description: 'Category 1 Emergency & Trauma Surgical Flow — Immediate OR-3 transfer without administrative bottleneck, STAT intra-op care, PACU recovery, retrospective financial clearance.',
    isDefault: true,
    steps: [
      { stepOrder: 1, statusCode: 'REGISTERED', label: 'STAT Emergency Surgical Intake', description: 'Emergency trauma / Category 1 surgical case arrival', assignedRole: 'SURGEON', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'theatre', moduleRoute: '/theatre' },
      { stepOrder: 2, statusCode: 'IN_TRIAGE', label: 'STAT Airway & Resuscitation', description: 'Immediate airway, blood prep & emergency resuscitation', assignedRole: 'DOCTOR', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'theatre', moduleRoute: '/theatre' },
      { stepOrder: 3, statusCode: 'IN_SURGERY', label: 'Operating Theatre (Emergency OR)', description: 'Emergency surgical procedure & life-saving intervention in progress', assignedRole: 'SURGEON', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'theatre', moduleRoute: '/theatre' },
      { stepOrder: 4, statusCode: 'RECOVERY', label: 'PACU / Intensive Recovery', description: 'PACU recovery & post-operative vitals stabilization', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'theatre', moduleRoute: '/theatre' },
      { stepOrder: 5, statusCode: 'AWAITING_PAYMENT', label: 'Retrospective Financial Clearance', description: 'Post-stabilization billing check-in & deposit authorization', assignedRole: 'RECEPTIONIST', isBillingGate: true, isOptional: false, skipForEmergency: true, module: 'billing', moduleRoute: '/billing' },
      { stepOrder: 6, statusCode: 'ADMITTED', label: 'ICU / High Dependency Ward', description: 'Transferred to Intensive Care Unit (ICU) or Surgical Ward', assignedRole: 'NURSE', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'icu', moduleRoute: '/icu' },
      { stepOrder: 7, statusCode: 'CLOSED', label: 'Emergency Surgical Visit Closed', description: 'Emergency surgical visit record fully closed', assignedRole: 'RECEPTIONIST', isBillingGate: false, isOptional: false, skipForEmergency: false, module: 'visits', moduleRoute: '/visits' },
    ],
  },
];

export const DEFAULT_CONSULTATION_SERVICES = [
  { code: 'DELIVERY-SVD', name: 'Normal Vaginal Delivery (SVD) Service', category: 'MATERNITY', price: 15000, description: 'SVD service, including active labour monitoring and midwife attendance', duration: 180, requiresDoctor: false },
  { code: 'OPD-RESIDENT', name: 'Resident Doctor Consultation', category: 'GENERAL', price: 2200, description: 'General Resident Doctor consultation. Billed as Emergency after-hours (6pm-8am) and weekends.', duration: 20, requiresDoctor: true },
  { code: 'OPD-ENT', name: 'ENT Consultation', category: 'SPECIALIST', price: 15000, description: 'Ear, Nose & Throat specialist consultation', duration: 25, requiresDoctor: true },
  { code: 'OPD-UROLOGIST', name: 'Urologist Consultation - Initial', category: 'SPECIALIST', price: 10000, description: 'First-time consultation with Urology specialist', duration: 30, requiresDoctor: true },
  { code: 'OPD-UROLOGIST-SUB', name: 'Urologist Consultation - Subsequent', category: 'SPECIALIST', price: 8000, description: 'Follow-up consultation with Urology specialist', duration: 20, requiresDoctor: true },
  { code: 'OPD-OPTICIAN', name: 'Optician Consultation', category: 'SPECIALIST', price: 5000, description: 'Eye screening and vision assessment', duration: 25, requiresDoctor: true },
  { code: 'OPD-PAED', name: 'Paediatrician Consultation', category: 'SPECIALIST', price: 3200, description: 'Paediatric specialist consultation for children', duration: 25, requiresDoctor: true },
  { code: 'OPD-GYNE', name: 'Gynecologist Consultation', category: 'SPECIALIST', price: 3200, description: 'OB/GYN specialist consultation', duration: 30, requiresDoctor: true },
  { code: 'OPD-DENTAL', name: 'Dentist Consultation', category: 'SPECIALIST', price: 3000, description: 'Dental / oral health consultation', duration: 20, requiresDoctor: true },
  { code: 'OPD-ORTHO', name: 'Orthopedic Consultation - Initial', category: 'SPECIALIST', price: 10000, description: 'First-time consultation with Orthopedics specialist', duration: 30, requiresDoctor: true },
  { code: 'OPD-ORTHO-SUB', name: 'Orthopedic Consultation - Subsequent', category: 'SPECIALIST', price: 7000, description: 'Follow-up consultation with Orthopedics specialist', duration: 20, requiresDoctor: true },
  { code: 'OPD-SURGEON', name: 'General Surgeon Consultation', category: 'SPECIALIST', price: 8000, description: 'General surgical specialty consultation', duration: 30, requiresDoctor: true },
  { code: 'OPD-PHYSIO', name: 'Physiotherapist Consultation - Initial', category: 'SPECIALIST', price: 7000, description: 'First rehabilitation check and physio session', duration: 45, requiresDoctor: true },
  { code: 'OPD-PHYSIO-SUB', name: 'Physiotherapist Consultation - Subsequent', category: 'SPECIALIST', price: 5500, description: 'Follow-up physiotherapy treatment session', duration: 45, requiresDoctor: true },
  { code: 'OPD-CARDIO', name: 'Cardiologist Consultation', category: 'SPECIALIST', price: 15000, description: 'Cardiovascular specialist consultation', duration: 30, requiresDoctor: true },
  { code: 'OPD-PHYSICIAN', name: 'Physician Consultation - Initial', category: 'SPECIALIST', price: 8000, description: 'First consultation with general consultant physician', duration: 30, requiresDoctor: true },
  { code: 'OPD-PHYSICIAN-SUB', name: 'Physician Consultation - Subsequent', category: 'SPECIALIST', price: 5500, description: 'Follow-up consultation with general consultant physician', duration: 20, requiresDoctor: true },
  { code: 'ANC-VISIT', name: 'Antenatal Care Visit', category: 'ANC', price: 2500, description: 'Antenatal care routine visit', duration: 30, requiresDoctor: false },
  { code: 'EMERGENCY', name: 'Emergency Consultation', category: 'EMERGENCY', price: 0, description: 'Emergency triage and consultation (billed post-treatment)', duration: 60, requiresDoctor: true },
  { code: 'TELEMEDICINE', name: 'Telemedicine Consultation', category: 'GENERAL', price: 1500, description: 'Remote video consultation', duration: 15, requiresDoctor: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTIONS (called from server.ts on startup)
// ─────────────────────────────────────────────────────────────────────────────

export async function seedWorkflowTemplates(): Promise<void> {
  try {
    for (const tmpl of DEFAULT_TEMPLATES) {
      const existing = await prisma.workflowTemplate.findFirst({
        where: { visitType: tmpl.visitType }
      });
      const { steps, ...templateData } = tmpl;
      if (existing) {
        await prisma.workflowStep.deleteMany({ where: { templateId: existing.id } });
        await prisma.workflowTemplate.update({
          where: { id: existing.id },
          data: {
            ...templateData,
            steps: { create: steps }
          }
        });
      } else {
        console.log(`[WorkflowEngine] Seeding ${tmpl.name} workflow template...`);
        await prisma.workflowTemplate.create({
          data: { ...templateData, steps: { create: steps } },
        });
      }
    }
  } catch (err) {
    console.error('[WorkflowEngine] Seed error:', err);
  }
}

export async function seedConsultationServices(): Promise<void> {
  try {
    console.log('[WorkflowEngine] Seeding/Upserting consultation services...');
    for (const svc of DEFAULT_CONSULTATION_SERVICES) {
      await prisma.consultationService.upsert({
        where: { code: svc.code },
        update: {
          name: svc.name,
          category: svc.category,
          price: svc.price,
          description: svc.description,
          duration: svc.duration,
          requiresDoctor: svc.requiresDoctor,
          isActive: true,
        },
        create: {
          code: svc.code,
          name: svc.name,
          category: svc.category,
          price: svc.price,
          description: svc.description,
          duration: svc.duration,
          requiresDoctor: svc.requiresDoctor,
          isActive: true,
        },
      });
    }
    console.log('[WorkflowEngine] Upserted', DEFAULT_CONSULTATION_SERVICES.length, 'consultation services');
  } catch (err) {
    console.error('[WorkflowEngine] Consultation seed error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (used by other route modules)
// ─────────────────────────────────────────────────────────────────────────────

export async function createVisitWorkflowState(visitId: string, visitType: string): Promise<void> {
  try {
    let template: any = await prisma.workflowTemplate.findFirst({
      where: { visitType, isActive: true, isDefault: true },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!template) {
      template = await prisma.workflowTemplate.findFirst({
        where: { visitType, isActive: true },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
    }
    if (!template) {
      template = await prisma.workflowTemplate.findFirst({
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
    }
    if (!template || !template.steps[0]) return;
    
    let initialStep = template.steps[0];
    const completedSteps: any[] = [];
    
    // Auto-advance if the first step is REGISTERED and there is a subsequent step
    if (initialStep.statusCode === 'REGISTERED' && template.steps.length > 1) {
      completedSteps.push({
        stepOrder: initialStep.stepOrder,
        statusCode: initialStep.statusCode,
        completedAt: new Date().toISOString(),
        completedBy: 'System (Check-in)',
        notes: 'Auto-advanced upon registration'
      });
      initialStep = template.steps[1];
    }

    await prisma.visitWorkflowState.create({
      data: {
        visitId,
        templateId: template.id,
        currentStepOrder: initialStep.stepOrder,
        currentStatus: initialStep.statusCode,
        completedSteps: completedSteps,
      },
    });
    
    // Update the core Visit record if the state was advanced beyond REGISTERED
    if (initialStep.statusCode !== 'REGISTERED') {
      await prisma.visit.update({ where: { id: visitId }, data: { status: initialStep.statusCode } });
    }

    await syncVisitQueueStatus(visitId, initialStep.statusCode);
  } catch (err) {
    console.error('[WorkflowEngine] createVisitWorkflowState error:', err);
  }
}

export async function autoAdvanceVisitToStatus(visitId: string, targetStatus: string, completedBy = 'System'): Promise<void> {
  try {
    const state = await prisma.visitWorkflowState.findUnique({ where: { visitId } });
    if (!state) return;
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: state.templateId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!template) return;
    let targetStep = template.steps.find((s: any) => s.statusCode === targetStatus);
    if (!targetStep) return;

    // Automatically promote to the next step after PAYMENT_CONFIRMED (e.g. WAITING_TRIAGE or IN_TRIAGE)
    if (targetStatus === 'PAYMENT_CONFIRMED') {
      const currentTargetOrder = targetStep.stepOrder;
      const nextStep = template.steps.find((s: any) => s.stepOrder === currentTargetOrder + 1);
      if (nextStep) {
        targetStep = nextStep;
      }
    }

    let completedSteps: any[] = [];
    if (typeof state.completedSteps === 'string') {
      try {
        completedSteps = JSON.parse(state.completedSteps);
      } catch (e) {}
    } else if (Array.isArray(state.completedSteps)) {
      completedSteps = state.completedSteps;
    }
    const stepsToComplete = template.steps.filter(
      (s: any) => s.stepOrder >= state.currentStepOrder && s.stepOrder < targetStep.stepOrder
    );
    for (const step of stepsToComplete) {
      if (!completedSteps.some((cs: any) => cs.stepOrder === step.stepOrder)) {
        completedSteps.push({
          stepOrder: step.stepOrder,
          statusCode: step.statusCode,
          completedAt: new Date().toISOString(),
          completedBy,
          notes: 'Auto-advanced by system',
        });
      }
    }
    await prisma.visitWorkflowState.update({
      where: { visitId },
      data: { currentStepOrder: targetStep.stepOrder, currentStatus: targetStep.statusCode, completedSteps },
    });
    await prisma.visit.update({ where: { id: visitId }, data: { status: targetStep.statusCode } });
    await syncVisitQueueStatus(visitId, targetStep.statusCode);
    try {
      const { notifyVisitsChange } = await import('./visits.js');
      notifyVisitsChange();
    } catch (e) {
      console.error('[Workflow] Real-time notify failed:', e);
    }
  } catch (err) {
    console.error('[WorkflowEngine] autoAdvance error:', err);
  }
}

export async function transitionVisitWorkflowToStatus(
  visitId: string,
  targetStatusCode: string,
  completedBy = 'System',
  notes?: string
): Promise<{ success: boolean; message: string; newStatus?: string }> {
  try {
    if (!visitId) return { success: false, message: 'Invalid visit ID' };
    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) return { success: false, message: 'Visit not found' };

    const state = await prisma.visitWorkflowState.findUnique({ where: { visitId } });
    if (!state) {
      await prisma.visit.update({ where: { id: visitId }, data: { status: targetStatusCode } }).catch(() => {});
      return { success: true, message: `Visit status set to ${targetStatusCode}` };
    }

    const template = await prisma.workflowTemplate.findUnique({
      where: { id: state.templateId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!template) return { success: false, message: 'Template not found' };

    const stepsList = template.steps as any[];
    const targetStep = stepsList.find((s: any) => s.statusCode === targetStatusCode);
    if (!targetStep) {
      await prisma.visit.update({ where: { id: visitId }, data: { status: targetStatusCode } }).catch(() => {});
      return { success: true, message: `Visit status updated to ${targetStatusCode}` };
    }

    let completedSteps: any[] = [];
    if (typeof state.completedSteps === 'string') {
      try { completedSteps = JSON.parse(state.completedSteps); } catch (e) {}
    } else if (Array.isArray(state.completedSteps)) {
      completedSteps = state.completedSteps;
    }

    const priorSteps = stepsList.filter((s: any) => s.stepOrder < targetStep.stepOrder);
    for (const step of priorSteps) {
      if (!completedSteps.some((cs: any) => cs.stepOrder === step.stepOrder)) {
        completedSteps.push({
          stepOrder: step.stepOrder,
          statusCode: step.statusCode,
          completedAt: new Date().toISOString(),
          completedBy,
          notes: notes || 'Auto-advanced by system',
        });
      }
    }

    await prisma.visitWorkflowState.update({
      where: { visitId },
      data: {
        currentStepOrder: targetStep.stepOrder,
        currentStatus: targetStep.statusCode,
        completedSteps,
      },
    });

    await prisma.visit.update({
      where: { id: visitId },
      data: { status: targetStep.statusCode },
    });

    await syncVisitQueueStatus(visitId, targetStep.statusCode);

    try {
      const { notifyVisitsChange } = await import('./visits.js');
      notifyVisitsChange();
    } catch (e) {
      console.error('[Workflow] notifyVisitsChange failed:', e);
    }

    return { success: true, message: `Transitioned visit to ${targetStep.label}`, newStatus: targetStep.statusCode };
  } catch (err: any) {
    console.error('[WorkflowEngine] transitionVisitWorkflowToStatus error:', err);
    return { success: false, message: err.message || 'Error transitioning workflow state' };
  }
}

export async function advanceVisitWorkflowState(
  visitId: string,
  completedBy = 'System',
  notes?: string
): Promise<{ success: boolean; message: string; newStatus?: string }> {
  try {
    const state = await prisma.visitWorkflowState.findUnique({ where: { visitId } });
    if (!state) return { success: false, message: 'No workflow state found for this visit' };
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: state.templateId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!template) return { success: false, message: 'Workflow template not found' };
    let nextStep: any = null;
    let lookAheadOrder = state.currentStepOrder + 1;
    const stepsList = template.steps as any[];

    while (true) {
      const step = stepsList.find((s: any) => s.stepOrder === lookAheadOrder);
      if (!step) break;

      // Automatically promote/skip PAYMENT_CONFIRMED step if it's hit
      if (step.statusCode === 'PAYMENT_CONFIRMED') {
        lookAheadOrder++;
        continue;
      }

      // If it is AWAITING_INVESTIGATION (Laboratory), check if there are any active/pending orders
      if (step.statusCode === 'AWAITING_INVESTIGATION' && step.isOptional) {
        const pendingLabOrders = await prisma.labOrder.findMany({
          where: {
            visitId,
            status: { in: ['PENDING', 'SPECIMEN_COLLECTED', 'IN_PROGRESS'] }
          }
        });
        if (pendingLabOrders.length === 0) {
          lookAheadOrder++;
          continue;
        }
      }

      // If it is WAITING_PHARMACY or PHARMACY (Pharmacy), check if there are any active/pending prescriptions
      if (step.statusCode === 'WAITING_PHARMACY' && step.isOptional) {
        const pendingPrescriptions = await prisma.pharmacyPrescription.findMany({
          where: {
            visitId,
            status: { in: ['PENDING_VERIFICATION', 'VERIFIED', 'PARTIAL_DISPENSED'] }
          }
        });
        if (pendingPrescriptions.length === 0) {
          lookAheadOrder++;
          continue;
        }
      }

      nextStep = step;
      break;
    }

    if (!nextStep) {
      return { success: false, message: 'Visit is already at the final workflow step.' };
    }

    const completedSteps = (state.completedSteps as any[]) || [];
    completedSteps.push({
      stepOrder: state.currentStepOrder,
      statusCode: state.currentStatus,
      completedAt: new Date().toISOString(),
      completedBy,
      notes: notes || null,
    });

    if (nextStep.statusCode === 'AWAITING_PAYMENT') {
      try {
        const { invoices: billingInvoices } = await import('./billing.js');
        const existingInvoice = billingInvoices.find(i => i.visitId === visitId);
        if (!existingInvoice) {
          const visit = await prisma.visit.findUnique({
            where: { id: visitId },
            include: { consultationService: true, patient: true },
          });
          if (visit && visit.consultationService) {
            const price = Number(visit.consultationService.price);
            if (price > 0) {
              let patientPortion = price;
              let insurancePortion = 0;
              const activeCoverage = await prisma.patientInsurancePolicy.findFirst({
                where: { patientId: visit.patientId, isActive: true },
                include: { plan: true },
              });
              if (activeCoverage) {
                const benefitItem = await prisma.insuranceBenefitCatalogItem.findFirst({
                  where: { planId: activeCoverage.planId, serviceCode: visit.consultationService.code },
                });
                if (benefitItem) {
                  if (benefitItem.coverageType === 'FULL') {
                    patientPortion = 0;
                    insurancePortion = price;
                  } else if (benefitItem.coverageType === 'PARTIAL') {
                    const pct = Number(benefitItem.coveragePct || 0) / 100;
                    insurancePortion = price * pct;
                    patientPortion = price - insurancePortion;
                  } else if (benefitItem.coverageType === 'EXCLUDED') {
                    patientPortion = price;
                    insurancePortion = 0;
                  }
                }
              }

              const dbInv = await prisma.invoice.create({
                data: {
                  patientId: visit.patientId,
                  status: 'ISSUED',
                  total: price,
                  amountPaid: 0,
                  reasonText: `Consultation fee: ${visit.consultationService.name}`,
                },
              });

              const invoiceNo = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
              billingInvoices.unshift({
                id: dbInv.id,
                invoiceNo,
                patientId: visit.patientId,
                patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
                visitId: visit.id,
                items: [{
                  chargeCode: visit.consultationService.code,
                  name: visit.consultationService.name,
                  category: 'Consultation',
                  quantity: 1,
                  unitPrice: price,
                  vat: 0,
                }],
                subtotal: price,
                vatTotal: 0,
                discountAmount: 0,
                totalAmount: price,
                patientAmount: patientPortion,
                donorAmount: 0,
                fundingSource: activeCoverage ? 'HMO' : 'SELF_PAY',
                payerId: activeCoverage?.planId || null,
                status: 'ISSUED',
                amountPaid: 0,
                outstanding: price,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              console.log(`[Workflow] Automatically generated invoice ${invoiceNo} for visit ${visit.id} upon advancing to AWAITING_PAYMENT`);
            }
          }
        }
      } catch (e) {
        console.error('[Workflow] Failed to auto-generate invoice on advance:', e);
      }
    }

    await prisma.visitWorkflowState.update({
      where: { visitId },
      data: { currentStepOrder: nextStep.stepOrder, currentStatus: nextStep.statusCode, completedSteps },
    });
    await prisma.visit.update({ where: { id: visitId }, data: { status: nextStep.statusCode } });
    await syncVisitQueueStatus(visitId, nextStep.statusCode);
    
    try {
      const { notifyVisitsChange } = await import('./visits.js');
      notifyVisitsChange();
    } catch (e) {
      console.error('[Workflow] Manual advance notify failed:', e);
    }

    await logAudit({ action: 'visit.workflow.advance', resourceType: 'Visit', resourceId: visitId, changes: { from: state.currentStatus, to: nextStep.statusCode } });

    return { success: true, message: `Visit advanced to: ${nextStep.label}`, newStatus: nextStep.statusCode };
  } catch (err: any) {
    console.error('[WorkflowEngine] advanceVisitWorkflowState error:', err);
    return { success: false, message: err.message || 'Internal error during workflow advancement' };
  }
}

export async function setVisitWorkflowStepByStatus(
  visitId: string,
  targetStatusCode: string,
  completedBy = 'System'
): Promise<{ success: boolean; message: string }> {
  try {
    const state = await prisma.visitWorkflowState.findUnique({ where: { visitId } });
    if (!state) return { success: false, message: 'No workflow state found for this visit' };

    const template = await prisma.workflowTemplate.findUnique({
      where: { id: state.templateId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!template) return { success: false, message: 'Workflow template not found' };

    const stepsList = template.steps as any[];
    let targetStep = stepsList.find((s: any) => s.statusCode === targetStatusCode);
    if (!targetStep) {
      if (targetStatusCode === 'IN_LABOUR') {
        targetStep = stepsList.find((s: any) => s.statusCode === 'IN_CONSULTATION') || stepsList[0];
      } else {
        targetStep = stepsList.find((s: any) => s.statusCode === 'IN_CONSULTATION') || stepsList[0];
      }
    }

    if (!targetStep) return { success: false, message: 'Target step not found' };

    const completedSteps = (state.completedSteps as any[]) || [];
    if (!completedSteps.some((cs: any) => cs.stepOrder === state.currentStepOrder)) {
      completedSteps.push({
        stepOrder: state.currentStepOrder,
        statusCode: state.currentStatus,
        completedAt: new Date().toISOString(),
        completedBy,
        notes: `Advanced to ${targetStatusCode}`,
      });
    }

    await prisma.visitWorkflowState.update({
      where: { visitId },
      data: {
        currentStepOrder: targetStep.stepOrder,
        currentStatus: targetStep.statusCode,
        completedSteps,
      },
    });

    await prisma.visit.update({
      where: { id: visitId },
      data: { status: targetStep.statusCode }
    });

    return { success: true, message: `Workflow step set to ${targetStep.statusCode}` };
  } catch (err) {
    console.error('[WorkflowEngine] setVisitWorkflowStepByStatus error:', err);
    return { success: false, message: (err as any).message };
  }
}

export async function autoAdvanceVisitTask(visitId: string, taskType: 'LAB' | 'PHARMACY'): Promise<void> {
  try {
    const state = await prisma.visitWorkflowState.findUnique({ where: { visitId } });
    if (!state) return;

    const template = await prisma.workflowTemplate.findUnique({
      where: { id: state.templateId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!template) return;

    const stepsList = template.steps as any[];
    const currentStep = stepsList.find((s: any) => s.stepOrder === state.currentStepOrder);
    if (!currentStep) return;

    if (taskType === 'LAB') {
      if (currentStep.statusCode === 'AWAITING_INVESTIGATION' || currentStep.statusCode === 'IN_LABORATORY') {
        const pendingLabOrders = await prisma.labOrder.findMany({
          where: {
            visitId,
            status: { in: ['PENDING', 'SPECIMEN_COLLECTED', 'IN_PROGRESS'] }
          }
        });
        if (pendingLabOrders.length === 0) {
          await advanceVisitWorkflowState(visitId, 'System Lab Auto-Advance');
        }
      }
    } else if (taskType === 'PHARMACY') {
      if (currentStep.statusCode === 'WAITING_PHARMACY' || currentStep.statusCode === 'PHARMACY' || currentStep.statusCode === 'MEDICATION_DISPENSED') {
        const pendingPrescriptions = await prisma.pharmacyPrescription.findMany({
          where: {
            visitId,
            status: { in: ['PENDING_VERIFICATION', 'VERIFIED', 'PARTIAL_DISPENSED'] }
          }
        });
        if (pendingPrescriptions.length === 0) {
          await advanceVisitWorkflowState(visitId, 'System Pharmacy Auto-Advance');
        }
      }
    }
  } catch (err) {
    console.error('[WorkflowEngine] autoAdvanceVisitTask error:', err);
  }
}

/**
 * Synchronizes active visits against a modified workflow template.
 * Recalculates currentStepOrder and currentStatus based on the newly sorted template steps
 * and the patient's existing completedSteps array.
 */
export async function syncActiveVisitsForTemplate(templateId: string): Promise<void> {
  try {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: templateId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } }
    });
    if (!template || template.steps.length === 0) return;

    // Find all active visits attached to this template
    const activeStates = await prisma.visitWorkflowState.findMany({
      where: {
        templateId,
        visit: {
          status: { notIn: ['CLOSED', 'DISCHARGED'] }
        }
      },
      include: { visit: true }
    });

    for (const state of activeStates) {
      // Parse completed steps
      let completedSteps: any[] = [];
      if (typeof state.completedSteps === 'string') {
        try { completedSteps = JSON.parse(state.completedSteps); } catch (e) {}
      } else if (Array.isArray(state.completedSteps)) {
        completedSteps = state.completedSteps;
      }

      // Map completed status codes for quick lookup
      const completedCodes = new Set(completedSteps.map(cs => cs.statusCode));

      // Find the first step in the template that has NOT been completed
      let nextStep = template.steps.find(s => !completedCodes.has(s.statusCode));
      
      // If all steps somehow completed, default to the last step
      if (!nextStep) {
        nextStep = template.steps[template.steps.length - 1];
      }

      // If the state needs to change, update it
      if (state.currentStepOrder !== nextStep.stepOrder || state.currentStatus !== nextStep.statusCode) {
        await prisma.visitWorkflowState.update({
          where: { id: state.id },
          data: {
            currentStepOrder: nextStep.stepOrder,
            currentStatus: nextStep.statusCode
          }
        });

        // Sync to Visit status
        await prisma.visit.update({
          where: { id: state.visitId },
          data: { status: nextStep.statusCode }
        });

        // Trigger queue update
        await syncVisitQueueStatus(state.visitId, nextStep.statusCode);
      }
    }

    try {
      const { notifyVisitsChange } = await import('./visits.js');
      notifyVisitsChange();
    } catch (e) {
      console.error('[WorkflowEngine] UI refresh emit failed:', e);
    }
  } catch (err) {
    console.error('[WorkflowEngine] SyncActiveVisitsForTemplate error:', err);
  }
}

export async function syncVisitQueueStatus(visitId: string, statusCode: string) {
  try {
    const visit = await prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) return;

    // Map visit status to department queue name
    let dept: string | null = null;
    switch (statusCode) {
      case 'REGISTERED':
        dept = 'REGISTRATION';
        break;
      case 'AWAITING_PAYMENT':
      case 'PAYMENT_CONFIRMED':
        dept = 'BILLING';
        break;
      case 'WAITING_TRIAGE':
      case 'IN_TRIAGE':
        dept = 'TRIAGE';
        break;
      case 'WAITING_CONSULTATION':
      case 'IN_CONSULTATION':
        dept = 'CONSULTATION';
        // Auto-create/ensure active Encounter so OPD desk detects patient immediately
        try {
          const existingEnc = await prisma.encounter.findFirst({ where: { visitId } });
          if (!existingEnc) {
            await prisma.encounter.create({
              data: {
                visitId,
                patientId: visit.patientId,
                type: 'Consultation',
                status: 'IN_PROGRESS',
                start: new Date(),
                serviceType: visit.visitType || 'OUTPATIENT',
                reasonText: visit.chiefComplaint || 'Outpatient Consultation',
              }
            });
          } else if (existingEnc.status !== 'IN_PROGRESS' && existingEnc.status !== 'FINISHED') {
            await prisma.encounter.update({
              where: { id: existingEnc.id },
              data: { status: 'IN_PROGRESS' }
            });
          }
        } catch (encErr) {
          console.warn('[Workflow] Encounter auto-creation for OPD warning:', encErr);
        }
        break;
      case 'AWAITING_INVESTIGATION':
      case 'IN_LABORATORY':
      case 'RESULTS_AVAILABLE':
        dept = 'LABORATORY';
        break;
      case 'WAITING_PHARMACY':
      case 'MEDICATION_DISPENSED':
        dept = 'PHARMACY';
        break;
      default:
        break;
    }

    if (dept) {
      // 1. Mark any active queue tickets for OTHER departments as COMPLETED
      await prisma.patientQueue.updateMany({
        where: {
          visitId,
          department: { not: dept },
          status: { in: ['WAITING', 'CALLED', 'IN_SERVICE'] }
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        }
      });

      // 2. Check if a ticket for the current department already exists
      const existingTicket = await prisma.patientQueue.findFirst({
        where: { visitId, department: dept }
      });

      if (!existingTicket) {
        const prefix = dept.substring(0, 3).toUpperCase();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const count = await prisma.patientQueue.count({
          where: { department: dept, createdAt: { gte: startOfDay } }
        });
        const tokenNumber = `${prefix}-${(count + 1).toString().padStart(3, '0')}`;

        await prisma.patientQueue.create({
          data: {
            patientId: visit.patientId,
            visitId,
            tokenNumber,
            department: dept,
            status: 'WAITING',
          }
        });
      } else if (existingTicket.status === 'COMPLETED' || existingTicket.status === 'CANCELLED') {
        // Reactivate if completed/cancelled
        await prisma.patientQueue.update({
          where: { id: existingTicket.id },
          data: { status: 'WAITING' }
        });
      }
    }
  } catch (err) {
    console.error('[WorkflowEngine] syncVisitQueueStatus error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES — WORKFLOW TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/templates', authMiddleware, async (req, res, next) => {
  try {
    // Auto-sync LABOUR_DELIVERY template name if outdated
    await prisma.workflowTemplate.updateMany({
      where: { visitType: 'LABOUR_DELIVERY', name: 'Labour & Delivery' },
      data: { name: 'Direct Labour & Delivery Admission' }
    }).catch(() => {});

    // Auto-sync EMERGENCY template name if outdated
    await prisma.workflowTemplate.updateMany({
      where: { visitType: 'EMERGENCY', name: 'Emergency' },
      data: { name: 'Quick Admit Patient to A&E', isDefault: true }
    }).catch(() => {});

    const templates = await prisma.workflowTemplate.findMany({
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: templates });
  } catch (e) { next(e); }
});

router.get('/templates/:id', authMiddleware, async (req, res, next) => {
  try {
    const tmpl = await prisma.workflowTemplate.findUnique({
      where: { id: req.params.id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!tmpl) return res.status(404).json({ message: 'Template not found' });
    res.json({ success: true, data: tmpl });
  } catch (e) { next(e); }
});

router.post('/templates', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(2),
      visitType: z.string(),
      description: z.string().optional(),
      isDefault: z.boolean().default(false),
    }).parse(req.body);
    const tmpl = await prisma.workflowTemplate.create({ data });
    await logAudit({ userId: req.user.userId, action: 'workflow.template.create', resourceType: 'WorkflowTemplate', resourceId: tmpl.id, changes: data });
    res.status(201).json({ success: true, data: tmpl });
  } catch (e) { next(e); }
});

router.put('/templates/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(2).optional(),
      description: z.string().optional().nullable(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body);
    const tmpl = await prisma.workflowTemplate.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: tmpl });
  } catch (e) { next(e); }
});

router.delete('/templates/:id', authMiddleware, async (req, res, next) => {
  try {
    await prisma.workflowTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Template deleted' });
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES — WORKFLOW STEPS
// ─────────────────────────────────────────────────────────────────────────────

router.post('/templates/:id/steps', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      stepOrder: z.number().int().min(1),
      statusCode: z.string().min(2),
      label: z.string().min(2),
      description: z.string().optional().nullable(),
      isOptional: z.boolean().default(false),
      isBillingGate: z.boolean().default(false),
      skipForEmergency: z.boolean().default(false),
      assignedRole: z.string().optional().nullable(),
      module: z.string().optional().nullable(),
      moduleRoute: z.string().optional().nullable(),
    }).parse(req.body);
    const step = await prisma.workflowStep.create({ data: { ...data, templateId: req.params.id } });
    
    // Sync active visits
    await syncActiveVisitsForTemplate(req.params.id);

    res.status(201).json({ success: true, data: step });
  } catch (e) { next(e); }
});

router.put('/templates/:id/reorder', authMiddleware, async (req: any, res, next) => {
  try {
    const { steps } = req.body;
    if (!Array.isArray(steps)) return res.status(400).json({ success: false, error: 'steps must be an array' });
    
    // To avoid unique constraint violation on [templateId, stepOrder], 
    // we first move them to negative temporary values, then to the final positive values
    const tempTransaction = steps.map((stepId: string, index: number) => 
      prisma.workflowStep.update({
        where: { id: stepId },
        data: { stepOrder: -(index + 1) } // negative to avoid collision
      })
    );
    await prisma.$transaction(tempTransaction);

    const finalTransaction = steps.map((stepId: string, index: number) => 
      prisma.workflowStep.update({
        where: { id: stepId },
        data: { stepOrder: index + 1 }
      })
    );
    await prisma.$transaction(finalTransaction);
    
    // Sync active visits
    await syncActiveVisitsForTemplate(req.params.id);

    res.json({ success: true });
  } catch (e) { next(e); }
});

router.put('/steps/:stepId', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      stepOrder: z.number().int().min(1).optional(),
      label: z.string().min(2).optional(),
      description: z.string().optional().nullable(),
      isOptional: z.boolean().optional(),
      isBillingGate: z.boolean().optional(),
      skipForEmergency: z.boolean().optional(),
      assignedRole: z.string().optional().nullable(),
      module: z.string().optional().nullable(),
      moduleRoute: z.string().optional().nullable(),
    }).parse(req.body);
    const step = await prisma.workflowStep.update({ where: { id: req.params.stepId }, data });
    
    // Sync active visits
    await syncActiveVisitsForTemplate(step.templateId);

    res.json({ success: true, data: step });
  } catch (e) { next(e); }
});

router.delete('/steps/:stepId', authMiddleware, async (req, res, next) => {
  try {
    const step = await prisma.workflowStep.findUnique({ where: { id: req.params.stepId } });
    if (step) {
      await prisma.workflowStep.delete({ where: { id: req.params.stepId } });
      
      // Sync active visits
      await syncActiveVisitsForTemplate(step.templateId);
    }
    res.json({ success: true, message: 'Step deleted' });
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES — VISIT WORKFLOW STATE
// ─────────────────────────────────────────────────────────────────────────────

router.get('/visits/:visitId', authMiddleware, async (req, res, next) => {
  try {
    const state = await prisma.visitWorkflowState.findUnique({ where: { visitId: req.params.visitId } });
    if (!state) return res.status(404).json({ message: 'No workflow state for this visit' });
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: state.templateId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    const currentStep = template?.steps.find((s: any) => s.stepOrder === state.currentStepOrder);
    const nextStep = template?.steps.find((s: any) => s.stepOrder === state.currentStepOrder + 1);
    res.json({ success: true, data: { state, template, currentStep, nextStep } });
  } catch (e) { next(e); }
});

router.post('/visits/:visitId/advance', authMiddleware, async (req: any, res, next) => {
  try {
    const { completedBy, notes } = req.body;
    const result = await advanceVisitWorkflowState(
      req.params.visitId,
      completedBy || req.user?.username || 'System',
      notes
    );
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }
    // Log manual advance audit trail
    await logAudit({
      userId: req.user?.userId,
      action: 'visit.workflow.advance',
      resourceType: 'Visit',
      resourceId: req.params.visitId,
    });
    res.json(result);
  } catch (e) { next(e); }
});

router.patch('/visits/:visitId/status', authMiddleware, async (req: any, res, next) => {
  try {
    const { statusCode, stepOrder, reason } = z.object({
      statusCode: z.string(),
      stepOrder: z.number().int().min(1),
      reason: z.string().optional(),
    }).parse(req.body);
    await prisma.visitWorkflowState.update({ where: { visitId: req.params.visitId }, data: { currentStatus: statusCode, currentStepOrder: stepOrder } });
    await prisma.visit.update({ where: { id: req.params.visitId }, data: { status: statusCode } });
    await logAudit({ userId: req.user?.userId, action: 'visit.workflow.override', resourceType: 'Visit', resourceId: req.params.visitId, changes: { statusCode, stepOrder, reason } });
    res.json({ success: true, message: `Visit status set to ${statusCode}` });
  } catch (e) { next(e); }
});

router.post('/start-consultation', authMiddleware, async (req: any, res, next) => {
  try {
    const { visitId, encounterId, patientId } = req.body;
    let targetVisitId = visitId;
    if (!targetVisitId && encounterId) {
      const enc = await prisma.encounter.findUnique({ where: { id: encounterId } });
      targetVisitId = enc?.visitId;
    }
    if (!targetVisitId && patientId) {
      const activeVisit = await prisma.visit.findFirst({
        where: { patientId, status: { notIn: ['CLOSED', 'DISCHARGED'] } },
        orderBy: { createdAt: 'desc' }
      });
      targetVisitId = activeVisit?.id;
    }

    if (targetVisitId) {
      const docName = req.user?.fullName || (req.user?.username ? `Dr. ${req.user.username}` : 'Dr. Medical Officer');
      await transitionVisitWorkflowToStatus(targetVisitId, 'IN_CONSULTATION', docName, 'Started consultation in OPD workspace');
    }
    res.json({ success: true, visitId: targetVisitId });
  } catch (e) { next(e); }
});

router.post('/complete-consultation', authMiddleware, async (req: any, res, next) => {
  try {
    const { encounterId, visitId, patientId } = req.body;
    let targetVisitId = visitId;
    let targetEncounterId = encounterId;

    if (targetEncounterId) {
      await prisma.encounter.update({
        where: { id: targetEncounterId },
        data: { status: 'FINISHED' }
      }).catch(() => {});

      if (!targetVisitId) {
        const enc = await prisma.encounter.findUnique({ where: { id: targetEncounterId } });
        targetVisitId = enc?.visitId;
      }
    }

    if (!targetVisitId && patientId) {
      const activeVisit = await prisma.visit.findFirst({
        where: { patientId, status: { notIn: ['CLOSED', 'DISCHARGED'] } },
        orderBy: { createdAt: 'desc' }
      });
      targetVisitId = activeVisit?.id;
    }

    let nextStatus = 'CLOSED';
    if (targetVisitId) {
      const [labOrdersCount, presCount] = await Promise.all([
        prisma.labOrder.count({ where: { visitId: targetVisitId, status: { in: ['PENDING', 'SPECIMEN_COLLECTED', 'IN_PROGRESS'] } } }),
        prisma.pharmacyPrescription.count({ where: { visitId: targetVisitId, status: { in: ['PENDING_VERIFICATION', 'VERIFIED', 'PARTIAL_DISPENSED'] } } }),
      ]);

      const docName = req.user?.fullName || (req.user?.username ? `Dr. ${req.user.username}` : 'Dr. Medical Officer');

      if (labOrdersCount > 0) {
        nextStatus = 'AWAITING_INVESTIGATION';
        await transitionVisitWorkflowToStatus(targetVisitId, 'AWAITING_INVESTIGATION', docName, 'Completed consultation & routed to Laboratory');
      } else if (presCount > 0) {
        nextStatus = 'WAITING_PHARMACY';
        await transitionVisitWorkflowToStatus(targetVisitId, 'WAITING_PHARMACY', docName, 'Completed consultation & routed to Pharmacy');
      } else {
        nextStatus = 'CLOSED';
        await transitionVisitWorkflowToStatus(targetVisitId, 'CLOSED', docName, 'Completed outpatient consultation');
      }
    }

    res.json({ success: true, visitId: targetVisitId, nextStatus });
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES — CONSULTATION SERVICES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/consultation-services', authMiddleware, async (req, res, next) => {
  try {
    const { activeOnly } = req.query;
    const where: any = {};
    if (activeOnly === 'true') where.isActive = true;
    const services = await prisma.consultationService.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.json({ success: true, data: services });
  } catch (e) { next(e); }
});

router.post('/consultation-services', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      code: z.string().min(2),
      name: z.string().min(2),
      category: z.enum(['GENERAL', 'SPECIALIST', 'PROCEDURE', 'DIAGNOSTIC', 'ANC', 'EMERGENCY']),
      price: z.number().nonnegative(),
      description: z.string().optional().nullable(),
      duration: z.number().int().default(15),
      requiresDoctor: z.boolean().default(true),
    }).parse(req.body);
    const svc = await prisma.consultationService.create({ data: { ...data, price: data.price as any } });
    await logAudit({ userId: req.user.userId, action: 'consultation.service.create', resourceType: 'ConsultationService', resourceId: svc.id, changes: data });
    res.status(201).json({ success: true, data: svc });
  } catch (e) { next(e); }
});

router.put('/consultation-services/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(2).optional(),
      category: z.enum(['GENERAL', 'SPECIALIST', 'PROCEDURE', 'DIAGNOSTIC', 'ANC', 'EMERGENCY']).optional(),
      price: z.number().nonnegative().optional(),
      description: z.string().optional().nullable(),
      duration: z.number().int().optional(),
      isActive: z.boolean().optional(),
      requiresDoctor: z.boolean().optional(),
    }).parse(req.body);
    const updated: any = { ...data };
    if (data.price !== undefined) updated.price = data.price as any;
    const svc = await prisma.consultationService.update({ where: { id: req.params.id }, data: updated });
    res.json({ success: true, data: svc });
  } catch (e) { next(e); }
});

router.delete('/consultation-services/:id', authMiddleware, async (req, res, next) => {
  try {
    await prisma.consultationService.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Service deactivated' });
  } catch (e) { next(e); }
});

export default router;
