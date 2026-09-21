import { Router, Request, Response } from 'express';

import { logAudit } from '../utils/auditHelper.js';
import { recordShiftClockInAttendance, recordShiftClockOutAttendance } from './hr.js';

const router = Router();
import { prisma } from '../prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// CHARGE MASTER (FR-BILL-001 to FR-BILL-005)
// ─────────────────────────────────────────────────────────────────────────────

const RADIOLOGY_CHARGE_MASTER_ITEMS = [
  { id: 'RAD-XRAY-001', code: 'RAD-XRAY-001', name: 'Chest X-Ray PA & Lateral View', category: 'Radiology', basePrice: 15000, nhiaPrice: 10500, hmoPrice: 12750, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-XRAY-002', code: 'RAD-XRAY-002', name: 'Abdomen X-Ray Erect & Supine (KUB)', category: 'Radiology', basePrice: 18000, nhiaPrice: 12600, hmoPrice: 15300, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-XRAY-003', code: 'RAD-XRAY-003', name: 'Lumbosacral Spine X-Ray AP & Lateral', category: 'Radiology', basePrice: 20000, nhiaPrice: 14000, hmoPrice: 17000, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-XRAY-004', code: 'RAD-XRAY-004', name: 'Cervical Spine X-Ray AP/Lat/Flexion-Extension', category: 'Radiology', basePrice: 20000, nhiaPrice: 14000, hmoPrice: 17000, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-XRAY-005', code: 'RAD-XRAY-005', name: 'Skull X-Ray AP & Lateral View', category: 'Radiology', basePrice: 15000, nhiaPrice: 10500, hmoPrice: 12750, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-XRAY-006', code: 'RAD-XRAY-006', name: 'Pelvis AP X-Ray View', category: 'Radiology', basePrice: 18000, nhiaPrice: 12600, hmoPrice: 15300, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-XRAY-007', code: 'RAD-XRAY-007', name: 'Knee Joint X-Ray AP & Lateral', category: 'Radiology', basePrice: 15000, nhiaPrice: 10500, hmoPrice: 12750, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-XRAY-008', code: 'RAD-XRAY-008', name: 'Wrist Joint X-Ray AP & Lateral (Colles/Scaphoid)', category: 'Radiology', basePrice: 15000, nhiaPrice: 10500, hmoPrice: 12750, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-XRAY-009', code: 'RAD-XRAY-009', name: 'Paranasal Sinuses (PNS) Water\'s View X-Ray', category: 'Radiology', basePrice: 16000, nhiaPrice: 11200, hmoPrice: 13600, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },

  { id: 'RAD-CT-001', code: 'RAD-CT-001', name: 'CT Brain High Resolution Non-Contrast', category: 'Radiology', basePrice: 75000, nhiaPrice: 52500, hmoPrice: 63750, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-CT-002', code: 'RAD-CT-002', name: 'CT Chest Contrast Enhanced (High-Resolution HRCT)', category: 'Radiology', basePrice: 110000, nhiaPrice: 77000, hmoPrice: 93500, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-CT-003', code: 'RAD-CT-003', name: 'CT Abdomen & Pelvis Triphasic Contrast Study', category: 'Radiology', basePrice: 135000, nhiaPrice: 94500, hmoPrice: 114750, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-CT-004', code: 'RAD-CT-004', name: 'CT Angiography Pulmonary (PE Protocol)', category: 'Radiology', basePrice: 150000, nhiaPrice: 105000, hmoPrice: 127500, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-CT-005', code: 'RAD-CT-005', name: 'CT Lumbar Spine 3D Reconstruction', category: 'Radiology', basePrice: 95000, nhiaPrice: 66500, hmoPrice: 80750, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-CT-006', code: 'RAD-CT-006', name: 'CT Coronary Angiography (Calcium Scoring)', category: 'Radiology', basePrice: 180000, nhiaPrice: 126000, hmoPrice: 153000, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-CT-007', code: 'RAD-CT-007', name: 'CT Paranasal Sinuses (PNS) Non-Contrast', category: 'Radiology', basePrice: 65000, nhiaPrice: 45500, hmoPrice: 55250, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },

  { id: 'RAD-MRI-001', code: 'RAD-MRI-001', name: 'MRI Brain 1.5T / 3.0T High Field Non-Contrast', category: 'Radiology', basePrice: 120000, nhiaPrice: 84000, hmoPrice: 102000, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-MRI-002', code: 'RAD-MRI-002', name: 'MRI Lumbar Spine & Cauda Equina', category: 'Radiology', basePrice: 130000, nhiaPrice: 91000, hmoPrice: 110500, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-MRI-003', code: 'RAD-MRI-003', name: 'MRI Knee Joint High Resolution Soft Tissue', category: 'Radiology', basePrice: 125000, nhiaPrice: 87500, hmoPrice: 106250, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-MRI-004', code: 'RAD-MRI-004', name: 'MRI Abdomen & MRCP (Biliary Tree Focus)', category: 'Radiology', basePrice: 160000, nhiaPrice: 112000, hmoPrice: 136000, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-MRI-005', code: 'RAD-MRI-005', name: 'MRI Cervical Spine Non-Contrast', category: 'Radiology', basePrice: 130000, nhiaPrice: 91000, hmoPrice: 110500, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-MRI-006', code: 'RAD-MRI-006', name: 'MRI Pelvis & Prostate Multiparametric (mpMRI)', category: 'Radiology', basePrice: 175000, nhiaPrice: 122500, hmoPrice: 148750, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },

  { id: 'RAD-USS-001', code: 'RAD-USS-001', name: 'Ultrasound Abdominal Complete (Liver, Gallbladder, Pancreas, Spleen)', category: 'Radiology', basePrice: 25000, nhiaPrice: 17500, hmoPrice: 21250, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-USS-002', code: 'RAD-USS-002', name: 'Ultrasound Pelvis / Transvaginal Scan (TVS)', category: 'Radiology', basePrice: 30000, nhiaPrice: 21000, hmoPrice: 25500, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-USS-003', code: 'RAD-USS-003', name: 'Ultrasound Renal & KUB (Kidney, Ureter, Bladder)', category: 'Radiology', basePrice: 25000, nhiaPrice: 17500, hmoPrice: 21250, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-USS-004', code: 'RAD-USS-004', name: 'Ultrasound Obstetric / Fetal Growth Anomaly Scan', category: 'Radiology', basePrice: 28000, nhiaPrice: 19600, hmoPrice: 23800, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-USS-005', code: 'RAD-USS-005', name: 'Ultrasound Thyroid & Neck Soft Tissues', category: 'Radiology', basePrice: 25000, nhiaPrice: 17500, hmoPrice: 21250, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-USS-006', code: 'RAD-USS-006', name: 'Ultrasound Scrotum & Testicular Doppler', category: 'Radiology', basePrice: 28000, nhiaPrice: 19600, hmoPrice: 23800, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },

  { id: 'RAD-MAM-001', code: 'RAD-MAM-001', name: 'Mammography Bilateral Diagnostic & Digital Breast Tomosynthesis', category: 'Radiology', basePrice: 35000, nhiaPrice: 24500, hmoPrice: 29750, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-DOP-001', code: 'RAD-DOP-001', name: 'Color Doppler Ultrasound Lower Limb Arterial/Venous', category: 'Radiology', basePrice: 45000, nhiaPrice: 31500, hmoPrice: 38250, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'RAD-PET-001', code: 'RAD-PET-001', name: 'PET-CT Whole Body Oncology Scan (FDG Tracer)', category: 'Radiology', basePrice: 350000, nhiaPrice: 245000, hmoPrice: 297500, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' }
];

// In-memory charge master (production: DB table)
export let chargeMasterItems: any[] = [
  { id: 'REG001', code: 'REG-INDIVIDUAL', name: 'Individual Account Registration Fee', category: 'Registration', basePrice: 1500, nhiaPrice: 1500, hmoPrice: 1500, isActive: true, vat: 0, unit: 'Per Account', effectiveDate: '2026-01-01' },
  { id: 'REG002', code: 'REG-FAMILY', name: 'Family Package Registration Fee', category: 'Registration', basePrice: 3000, nhiaPrice: 3000, hmoPrice: 3000, isActive: true, vat: 0, unit: 'Per Account', effectiveDate: '2026-01-01' },
  { id: 'REG003', code: 'REG-EMERGENCY', name: 'Emergency Triage Registration Fee', category: 'Registration', basePrice: 0, nhiaPrice: 0, hmoPrice: 0, isActive: true, vat: 0, unit: 'Per Account', effectiveDate: '2026-01-01' },
  { id: 'REG004', code: 'REG-WALKIN', name: 'Walk-In Patient Registration Fee', category: 'Registration', basePrice: 1000, nhiaPrice: 1000, hmoPrice: 1000, isActive: true, vat: 0, unit: 'Per Account', effectiveDate: '2026-01-01' },
  { id: 'REG005', code: 'REG-CORPORATE', name: 'Corporate Link Registration Fee', category: 'Registration', basePrice: 2500, nhiaPrice: 2500, hmoPrice: 2500, isActive: true, vat: 0, unit: 'Per Account', effectiveDate: '2026-01-01' },
  { id: 'REG006', code: 'REG-INSURANCE', name: 'Insurance Managed Registration Fee', category: 'Registration', basePrice: 2000, nhiaPrice: 2000, hmoPrice: 2000, isActive: true, vat: 0, unit: 'Per Account', effectiveDate: '2026-01-01' },
  { id: 'REG007', code: 'REG-LABOUR', name: 'Labour & Delivery Registration Fee', category: 'Registration', basePrice: 5000, nhiaPrice: 5000, hmoPrice: 5000, isActive: true, vat: 0, unit: 'Per Account', effectiveDate: '2026-01-01' },
  { id: 'CM001', code: 'CONSULT-GP', name: 'General Practitioner Consultation', category: 'Consultation', basePrice: 5000, nhiaPrice: 3500, hmoPrice: 4000, isActive: true, vat: 0, unit: 'Per Visit', effectiveDate: '2026-01-01' },
  { id: 'CM002', code: 'CONSULT-SPEC', name: 'Specialist Consultation', category: 'Consultation', basePrice: 15000, nhiaPrice: 10000, hmoPrice: 12000, isActive: true, vat: 0, unit: 'Per Visit', effectiveDate: '2026-01-01' },
  { id: 'CM003', code: 'LAB-FBC', name: 'Full Blood Count (FBC)', category: 'Laboratory', basePrice: 3500, nhiaPrice: 2500, hmoPrice: 3000, isActive: true, vat: 0, unit: 'Per Test', effectiveDate: '2026-01-01' },
  { id: 'CM004', code: 'LAB-LFT', name: 'Liver Function Test (LFT)', category: 'Laboratory', basePrice: 8000, nhiaPrice: 6000, hmoPrice: 7000, isActive: true, vat: 0, unit: 'Per Test', effectiveDate: '2026-01-01' },
  { id: 'CM005', code: 'XRAY-CHEST', name: 'Chest X-Ray', category: 'Radiology', basePrice: 12000, nhiaPrice: 9000, hmoPrice: 10500, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'CM006', code: 'ULTRASOUND', name: 'Abdominal Ultrasound', category: 'Radiology', basePrice: 18000, nhiaPrice: 13000, hmoPrice: 15000, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'CM007', code: 'ADMIT-WARD', name: 'Ward Admission (Per Day)', category: 'Admission', basePrice: 10000, nhiaPrice: 7000, hmoPrice: 8500, isActive: true, vat: 0, unit: 'Per Day', effectiveDate: '2026-01-01' },
  { id: 'CM008', code: 'ADMIT-ICU', name: 'ICU Admission (Per Day)', category: 'Admission', basePrice: 80000, nhiaPrice: 50000, hmoPrice: 65000, isActive: true, vat: 0, unit: 'Per Day', effectiveDate: '2026-01-01' },
  { id: 'CM009', code: 'PHARMACY-DISP', name: 'Pharmacy Dispensing Fee', category: 'Pharmacy', basePrice: 500, nhiaPrice: 0, hmoPrice: 300, isActive: true, vat: 0, unit: 'Per Prescription', effectiveDate: '2026-01-01' },
  { id: 'CM010', code: 'PROC-MINOR', name: 'Minor Surgical Procedure', category: 'Theatre', basePrice: 25000, nhiaPrice: 18000, hmoPrice: 22000, isActive: true, vat: 7.5, unit: 'Per Procedure', effectiveDate: '2026-01-01' },
  { id: 'CM011', code: 'ANC-VISIT', name: 'Antenatal Care Visit', category: 'Maternity', basePrice: 4000, nhiaPrice: 2000, hmoPrice: 3000, isActive: true, vat: 0, unit: 'Per Visit', effectiveDate: '2026-01-01' },
  { id: 'CM012', code: 'DELIVERY-NVD', name: 'Normal Vaginal Delivery', category: 'Maternity', basePrice: 80000, nhiaPrice: 45000, hmoPrice: 60000, isActive: true, vat: 0, unit: 'Per Delivery', effectiveDate: '2026-01-01' },
  { id: 'CM013', code: 'DELIVERY-CS', name: 'Caesarean Section', category: 'Theatre', basePrice: 250000, nhiaPrice: 120000, hmoPrice: 180000, isActive: true, vat: 7.5, unit: 'Per Procedure', effectiveDate: '2026-01-01' },
  { id: 'CM014', code: 'EMRG-CONSULT', name: 'Emergency Consultation', category: 'Emergency', basePrice: 8000, nhiaPrice: 5000, hmoPrice: 6500, isActive: true, vat: 0, unit: 'Per Visit', effectiveDate: '2026-01-01' },
  { id: 'CM015', code: 'CT-SCAN', name: 'CT Scan (Brain)', category: 'Radiology', basePrice: 65000, nhiaPrice: 0, hmoPrice: 50000, isActive: true, vat: 7.5, unit: 'Per Study', effectiveDate: '2026-01-01' },
  { id: 'CM016', code: 'SURG-ELECTIVE', name: 'Elective Surgical Deposit & Financial Clearance Fee', category: 'Theatre', basePrice: 150000, nhiaPrice: 90000, hmoPrice: 120000, isActive: true, vat: 7.5, unit: 'Per Procedure', effectiveDate: '2026-01-01' },
  { id: 'CM017', code: 'SURG-MYOMECTOMY', name: 'Abdominal Myomectomy (Enucleation of Uterine Fibroids)', category: 'Theatre', basePrice: 150000, nhiaPrice: 95000, hmoPrice: 130000, isActive: true, vat: 7.5, unit: 'Per Procedure', effectiveDate: '2026-01-01' },
  { id: 'CM018', code: 'SURG-STAT-EMERGENCY', name: 'STAT Emergency Surgical Fee (Retrospective Clearance)', category: 'Theatre', basePrice: 0, nhiaPrice: 0, hmoPrice: 0, isActive: true, vat: 0, unit: 'Per Procedure', effectiveDate: '2026-01-01' },
  { id: 'MOR001', code: 'MORT-INTAKE', name: 'Hospital Mortuary Cold Vault Admission & Storage (Per Day)', category: 'Mortuary', basePrice: 15000, nhiaPrice: 10000, hmoPrice: 12000, isActive: true, vat: 0, unit: 'Per Day', effectiveDate: '2026-01-01' },
  { id: 'MOR002', code: 'MORT-EMBALM', name: 'Body Preservation & Embalming Procedure', category: 'Mortuary', basePrice: 45000, nhiaPrice: 35000, hmoPrice: 40000, isActive: true, vat: 0, unit: 'Per Body', effectiveDate: '2026-01-01' },
  { id: 'MOR002A', code: 'MORT-EMBALM-DRESS', name: 'Body Embalming & Full Cosmetic Dressing (Ready for Viewing)', category: 'Mortuary', basePrice: 45000, nhiaPrice: 35000, hmoPrice: 40000, isActive: true, vat: 0, unit: 'Per Body', effectiveDate: '2026-01-01' },
  { id: 'MOR002B', code: 'MORT-SHROUD-VIEW', name: 'Dignity White Shroud Preparation & Body Tagging', category: 'Mortuary', basePrice: 30000, nhiaPrice: 22000, hmoPrice: 26000, isActive: true, vat: 0, unit: 'Per Body', effectiveDate: '2026-01-01' },
  { id: 'MOR002C', code: 'MORT-EMBALM-BASIC', name: 'Standard Arterial Embalming & Sanitization Wash', category: 'Mortuary', basePrice: 35000, nhiaPrice: 26000, hmoPrice: 30000, isActive: true, vat: 0, unit: 'Per Body', effectiveDate: '2026-01-01' },
  { id: 'MOR002D', code: 'MORT-RESTORATION', name: 'Facial & Trauma Restoration / Cosmological Reconstruction', category: 'Mortuary', basePrice: 65000, nhiaPrice: 50000, hmoPrice: 58000, isActive: true, vat: 0, unit: 'Per Procedure', effectiveDate: '2026-01-01' },
  { id: 'MOR002E', code: 'MORT-CAVITY-PREP', name: 'High-Index Cavity Fixation & Extended Preservation', category: 'Mortuary', basePrice: 50000, nhiaPrice: 38000, hmoPrice: 44000, isActive: true, vat: 0, unit: 'Per Body', effectiveDate: '2026-01-01' },
  { id: 'MOR002F', code: 'MORT-REPATRIATION', name: 'International Repatriation & Deep Chemical Fixation', category: 'Mortuary', basePrice: 85000, nhiaPrice: 65000, hmoPrice: 75000, isActive: true, vat: 0, unit: 'Per Body', effectiveDate: '2026-01-01' },
  { id: 'MOR002G', code: 'MORT-VIEWING', name: 'Family Dignity Viewing Suite & Private Chapel Reservation', category: 'Mortuary', basePrice: 15000, nhiaPrice: 10000, hmoPrice: 12000, isActive: true, vat: 0, unit: 'Per Session', effectiveDate: '2026-01-01' },
  { id: 'MOR003', code: 'MORT-AUTOPSY-CLIN', name: 'Clinical Pathology Post-Mortem Autopsy Examination', category: 'Pathology', basePrice: 60000, nhiaPrice: 45000, hmoPrice: 50000, isActive: true, vat: 0, unit: 'Per Autopsy', effectiveDate: '2026-01-01' },
  { id: 'MOR004', code: 'MORT-AUTOPSY-CORONER', name: 'Coroner Forensic Medico-Legal Autopsy', category: 'Pathology', basePrice: 90000, nhiaPrice: 70000, hmoPrice: 80000, isActive: true, vat: 0, unit: 'Per Autopsy', effectiveDate: '2026-01-01' },
  { id: 'MOR005', code: 'TRANS-AMBULANCE', name: 'Hospital Ambulance Transport & Inter-Facility Transfer', category: 'Logistics', basePrice: 25000, nhiaPrice: 18000, hmoPrice: 20000, isActive: true, vat: 0, unit: 'Per Trip', effectiveDate: '2026-01-01' },
  { id: 'MOR006', code: 'DEATH-CERT', name: 'Statutory Clinical Death Certification & Release Clearance', category: 'Mortuary', basePrice: 5000, nhiaPrice: 3000, hmoPrice: 4000, isActive: true, vat: 0, unit: 'Per Clearance', effectiveDate: '2026-01-01' },
  { id: 'ART001', code: 'ART-CONSULT', name: 'ART Clinic Consultation (CDC/CARITAS Funded)', category: 'ART Programme', basePrice: 0, nhiaPrice: 0, hmoPrice: 0, isActive: true, vat: 0, unit: 'Per Visit', effectiveDate: '2026-01-01', donorFunded: true, donorProgramme: 'CDC/CARITAS' },
  ...RADIOLOGY_CHARGE_MASTER_ITEMS
];

let invoiceSeq = 1000;
let receiptSeq = 5000;
let claimSeq = 100;

export const invoices: any[] = [];
export const payments: any[] = [];
export const cashierShifts: any[] = [];
export const refunds: any[] = [
  {
    id: '9249639356',
    paymentId: 'pmt_rad_832836',
    receiptNo: 'REC-832836',
    invoiceId: 'ed74bf27-5e3c-4c8d-9257-8007b633592b',
    invoiceNo: 'RAD-INV-ORD-RAD-832836',
    patientId: 'c4f25605-f568-414b-9272-3e521fd658e4',
    patientName: 'Child Pediatrics',
    amount: 5000,
    reason: 'Overcharged',
    refundMethod: 'CASH',
    status: 'APPROVED',
    requestedBy: 'cashier',
    requestedAt: '2026-09-12T08:30:00.000Z',
    approvedBy: 'supervisor',
    approvedAt: '2026-09-12T08:35:00.000Z',
  }
];
export const claims: any[] = [];

/**
 * Automatically creates and queues an official hospital billable invoice
 * for a service defined in the Cashier Charge Master / Catalog.
 */
export function billChargeMasterService({
  patientId,
  patientName,
  serviceCode,
  quantity = 1,
  notes,
  userId = 'SYSTEM'
}: {
  patientId?: string | null;
  patientName: string;
  serviceCode: string;
  quantity?: number;
  notes?: string;
  userId?: string;
}) {
  const item = chargeMasterItems.find(c => c.code === serviceCode || c.id === serviceCode);
  const unitPrice = item ? Number(item.basePrice || 0) : 0;
  const subtotal = unitPrice * quantity;
  const vatTotal = item?.vat ? Math.round((subtotal * Number(item.vat)) / 100) : 0;
  const totalAmount = subtotal + vatTotal;

  const invoiceNo = `INV-${new Date().getFullYear()}-${String(++invoiceSeq).padStart(5, '0')}`;
  const invItem = {
    id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    code: serviceCode,
    description: item?.name || serviceCode,
    category: item?.category || 'Clinical Services',
    unitPrice,
    quantity,
    amount: totalAmount,
    vat: item?.vat || 0,
  };

  const invoice = {
    id: `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    invoiceNo,
    patientId: patientId || null,
    patientName: patientName.replace(/^Late\s+/i, '').trim(),
    items: [invItem],
    donorItems: [],
    patientItems: [invItem],
    subtotal,
    vatTotal,
    discountAmount: 0,
    totalAmount,
    patientAmount: totalAmount,
    donorAmount: 0,
    fundingSource: 'SELF_PAY',
    payerId: null,
    status: 'ISSUED',
    amountPaid: 0,
    outstanding: totalAmount,
    notes: notes || `Hospital Service: ${item?.name || serviceCode}`,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  invoices.unshift(invoice);
  return invoice;
}

const customPayers: any[] = [];

async function getMergedPayers() {
  const dbProviders = await prisma.insuranceProvider.findMany({
    include: { plans: true, policies: true },
    orderBy: { name: 'asc' }
  }).catch(() => []);

  const allInvoices = await fetchAllInvoices();
  const unpaidInvoices = allInvoices.filter((i: any) => i.outstanding > 0);

  const mappedDbPayers = dbProviders.map(prov => {
    const isNHIA = prov.code.toUpperCase().includes('NHI') || prov.name.toUpperCase().includes('NHI');
    const provClaims = claims.filter(c => c.payerId === prov.id || c.payerId === prov.code || (c.payer && c.payer.toLowerCase().includes(prov.code.toLowerCase())));
    const provOutstandingClaims = provClaims.filter(c => c.status !== 'PAID' && c.status !== 'DENIED').reduce((sum, c) => sum + (c.amount || c.totalAmount || 0), 0);
    
    // Unpaid invoices specifically assigned to this insurer
    const insurerInvoices = unpaidInvoices.filter((i: any) => 
      (i.fundingSource === 'HMO' || i.fundingSource === 'INSURANCE' || i.fundingSource === 'NHIA') &&
      (i.payerId === prov.id || i.payerName === prov.name)
    );
    const provOutstandingInvoices = insurerInvoices.reduce((sum: number, i: any) => sum + Number(i.outstanding || 0), 0);

    return {
      id: prov.id,
      name: prov.name,
      code: prov.code,
      type: isNHIA ? 'NHIA' : 'HMO',
      contactEmail: prov.contactDetails || `${prov.code.toLowerCase()}@hospital-provider.ng`,
      creditLimit: isNHIA ? 5000000 : 2000000,
      outstandingBalance: provOutstandingClaims + provOutstandingInvoices,
      status: prov.isActive ? 'ACTIVE' : 'INACTIVE',
      contractStart: '2026-01-01',
      contractEnd: '2026-12-31',
      plansCount: prov.plans?.length || 0,
    };
  });

  return [...mappedDbPayers, ...customPayers];
}

// ─── GET: Charge Master ────────────────────────────────────────────────────
router.get('/charge-master', async (req: Request, res: Response) => {
  try {
    const { category, active } = req.query;
    
    // Fetch DB Radiology Catalog items dynamically
    const dbRadItems = await prisma.radiologyImagingCatalogItem.findMany({
      orderBy: { name: 'asc' }
    }).catch(() => []);

    const dbRadChargeItems = dbRadItems.map(item => ({
      id: item.id,
      code: item.code || `RAD-${item.id.slice(0, 6).toUpperCase()}`,
      name: item.name,
      category: 'Radiology',
      basePrice: Number(item.price || 18000),
      nhiaPrice: Math.round(Number(item.price || 18000) * 0.7),
      hmoPrice: Math.round(Number(item.price || 18000) * 0.85),
      isActive: (item as any).isActive ?? true,
      vat: 7.5,
      unit: 'Per Study',
      effectiveDate: '2026-01-01'
    }));

    const map = new Map<string, any>();

    // 1. Add static base items
    chargeMasterItems.forEach(item => map.set(item.code || item.id, item));

    // 2. Add DB radiology catalog items
    dbRadChargeItems.forEach(item => {
      if (!map.has(item.code) && !map.has(item.id)) {
        map.set(item.code, item);
      }
    });

    let results = Array.from(map.values());
    if (category) results = results.filter(i => i.category === category);
    if (active !== undefined) results = results.filter(i => i.isActive === (active === 'true'));
    
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch charge master' });
  }
});

router.post('/charge-master', async (req: Request, res: Response) => {
  try {
    const item = { id: `CM${Date.now()}`, ...req.body, isActive: true, effectiveDate: new Date().toISOString().slice(0, 10) };
    chargeMasterItems.push(item);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_CHARGE_ITEM', resourceType: 'ChargeMaster', resourceId: item.id, changes: item });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create charge item' });
  }
});

router.put('/charge-master/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, basePrice, nhiaPrice, hmoPrice, vat, unit, isActive } = req.body;
    let item = chargeMasterItems.find(i => i.id === id || i.code === id);
    if (!item) {
      // Check if it exists in DB radiology catalog
      const dbRad = await prisma.radiologyImagingCatalogItem.findFirst({ where: { OR: [{ id }, { code: id }] } });
      if (dbRad) {
        const updatedRad = await prisma.radiologyImagingCatalogItem.update({
          where: { id: dbRad.id },
          data: {
            ...(name ? { name } : {}),
            ...(basePrice !== undefined ? { price: Number(basePrice) } : {})
          }
        });
        return res.json({ success: true, data: updatedRad });
      }
      return res.status(404).json({ success: false, message: 'Charge item not found in catalog' });
    }

    if (name !== undefined) item.name = name;
    if (category !== undefined) item.category = category;
    if (basePrice !== undefined) item.basePrice = Number(basePrice);
    if (nhiaPrice !== undefined) item.nhiaPrice = Number(nhiaPrice);
    if (hmoPrice !== undefined) item.hmoPrice = Number(hmoPrice);
    if (vat !== undefined) item.vat = Number(vat);
    if (unit !== undefined) item.unit = unit;
    if (isActive !== undefined) item.isActive = Boolean(isActive);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'UPDATE_CHARGE_ITEM',
      resourceType: 'ChargeMaster',
      resourceId: item.id,
      changes: { basePrice, nhiaPrice, hmoPrice }
    });

    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to update charge item price: ' + err.message });
  }
});

router.patch('/charge-master/:id/toggle', async (req: Request, res: Response) => {
  try {
    const item = chargeMasterItems.find(i => i.id === req.params.id || i.code === req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.isActive = !item.isActive;
    await logAudit({ userId: (req as any).user?.id, action: 'TOGGLE_CHARGE_ITEM', resourceType: 'ChargeMaster', resourceId: item.id });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle item' });
  }
});

// Helper function to fetch all invoices across sources
export async function fetchAllInvoices(query: any = {}) {
  const { patientId, status, from, to } = query;

  // ── Step 1: Direct query of pharmacyPrescription records ──────────────────
  const rxWhere: any = {};
  if (patientId) rxWhere.patientId = patientId as string;
  if (from) rxWhere.orderedAt = { ...(rxWhere.orderedAt || {}), gte: new Date(from as string) };
  if (to) rxWhere.orderedAt = { ...(rxWhere.orderedAt || {}), lte: new Date(to as string) };

  const prescriptions = await prisma.pharmacyPrescription.findMany({
    where: rxWhere,
    include: {
      patient: { select: { firstName: true, lastName: true, patientNumber: true } },
      items: { include: { medication: true } },
    },
    orderBy: { orderedAt: 'desc' },
  });

  // ── Step 2: Direct query of labOrder records ───────────────────────────────
  const labWhere: any = {};
  if (patientId) labWhere.patientId = patientId as string;
  if (from) labWhere.orderedAt = { ...(labWhere.orderedAt || {}), gte: new Date(from as string) };
  if (to) labWhere.orderedAt = { ...(labWhere.orderedAt || {}), lte: new Date(to as string) };

  const labOrders = await prisma.labOrder.findMany({
    where: labWhere,
    include: {
      patient: { select: { firstName: true, lastName: true, patientNumber: true } },
      items: { include: { test: true } },
    },
    orderBy: { orderedAt: 'desc' },
  });

  // ── Step 2.5: Direct query of radiologyOrder records ────────────────────────
  const radWhere: any = {};
  if (patientId) radWhere.patientId = patientId as string;
  if (from) radWhere.createdAt = { ...(radWhere.createdAt || {}), gte: new Date(from as string) };
  if (to) radWhere.createdAt = { ...(radWhere.createdAt || {}), lte: new Date(to as string) };

  const radiologyOrders = await prisma.radiologyOrder.findMany({
    where: radWhere,
    include: {
      patient: { select: { firstName: true, lastName: true, patientNumber: true } },
      catalogItem: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // ── Step 3: Fetch invoice table to get actual payment status ───────────────
  const dbInvoices = await prisma.invoice.findMany({
    select: { id: true, fhirId: true, status: true, amountPaid: true, total: true },
  });
  const invoiceByFhirId = new Map(dbInvoices.filter((i: any) => i.fhirId).map((i: any) => [i.fhirId, i]));
  const invoiceById = new Map(dbInvoices.map((i: any) => [i.id, i]));

  // Clean up any old DB invoices created for external purchases
  await prisma.invoice.updateMany({
    where: {
      reasonText: { contains: '[External Purchase]' },
      status: 'ISSUED',
    },
    data: {
      total: 0,
      status: 'CANCELLED',
    },
  }).catch(() => {});

  // ── Step 4: Convert prescriptions to invoice shape ─────────────────────────
  const rxInvoices = prescriptions.map((rx: any) => {
    const invoiceNo = `RX-INV-${rx.prescriptionNumber}`;
    const dbInv = invoiceByFhirId.get(invoiceNo);
    const patientName = rx.patient ? `${rx.patient.firstName} ${rx.patient.lastName}` : 'Unknown';

    // Billable hospital items only (exclude external purchases)
    const billableItems = (rx.items || []).filter((it: any) => it.medicationId && !it.isExternalPurchase && !it.isExternal);
    let total = Number(rx.totalAmount || 0);

    // If totalAmount was set to 0 or uncalculated, calculate only from billable in-stock items
    if (total === 0 && billableItems.length > 0) {
      total = billableItems.reduce((sum: number, it: any) => sum + (Number(it.medication?.price || 0) * (it.quantityPrescribed || 1)), 0);
    }

    // If a prescription has NO billable hospital items, total is 0 and it is EXEMPT from hospital cashier billing
    const isAllExternal = (rx.items || []).length > 0 && (rx.items || []).every((it: any) => !it.medicationId || it.isExternalPurchase || it.isExternal);
    if (isAllExternal || billableItems.length === 0) {
      total = 0;
    }

    let invStatus = total === 0 ? 'EXEMPT'
      : rx.paymentStatus === 'PAID' ? 'PAID'
      : rx.paymentStatus === 'PARTIAL' ? 'PARTIAL'
      : dbInv ? (dbInv.status === 'ISSUED' ? 'UNPAID' : dbInv.status) : 'UNPAID';

    const isPaid = invStatus === 'PAID';
    const amountPaid = isPaid ? (dbInv ? Number(dbInv.amountPaid || total) : total) : (dbInv ? Number(dbInv.amountPaid || 0) : 0);
    const outstanding = isPaid || invStatus === 'EXEMPT' ? 0 : Math.max(0, total - amountPaid);

    const items = (rx.items || []).map((it: any) => {
      const isExt = !it.medicationId || it.isExternalPurchase || it.isExternal;
      const unitCost = isExt ? 0 : Number(it.medication?.price || 0);
      return {
        code: rx.prescriptionNumber,
        chargeCode: rx.prescriptionNumber,
        description: `${it.medication?.genericName || it.medication?.tradeName || it.clinicalIndication || 'Medication'} ${isExt ? '[External Purchase / Out of Stock]' : ''}`.trim(),
        quantity: it.quantityPrescribed || 1,
        unitPrice: unitCost,
        vat: 0,
        total: unitCost * (it.quantityPrescribed || 1),
      };
    });

    return {
      id: dbInv?.id || `rx-${rx.id}`,
      invoiceNo,
      patientId: rx.patientId,
      patientName,
      patientNumber: rx.patient?.patientNumber,
      items,
      subtotal: total,
      vatTotal: 0,
      discountAmount: 0,
      totalAmount: total,
      patientAmount: total,
      donorAmount: 0,
      fundingSource: rx.insurancePolicyNo ? 'INSURANCE' : 'SELF_PAY',
      amountPaid,
      outstanding,
      status: invStatus,
      createdAt: rx.orderedAt,
      sourceRef: rx.prescriptionNumber,
      sourceType: 'PHARMACY',
      source: 'PHARMACY',
    };
  });

  // ── Step 5: Convert lab orders to invoice shape ────────────────────────────
  const labInvoices = labOrders.map((order: any) => {
    const invoiceNo = `LAB-INV-${order.orderNumber}`;
    const dbInv = invoiceByFhirId.get(invoiceNo);
    const patientName = order.patient ? `${order.patient.firstName} ${order.patient.lastName}` : 'Unknown';
    let total = Number(order.totalAmount || 0);
    if (total === 0 && order.items && order.items.length > 0) {
      total = order.items.reduce((sum: number, it: any) => sum + Number(it.price || 0), 0);
    }
    
    let invStatus = order.paymentStatus === 'PAID' ? 'PAID'
      : order.paymentStatus === 'PARTIAL' ? 'PARTIAL'
      : dbInv ? (dbInv.status === 'ISSUED' ? 'UNPAID' : dbInv.status) : 'UNPAID';

    const isPaid = invStatus === 'PAID';
    const amountPaid = isPaid ? (dbInv ? Number(dbInv.amountPaid || total) : total) : (dbInv ? Number(dbInv.amountPaid || 0) : 0);
    const outstanding = isPaid ? 0 : Math.max(0, total - amountPaid);

    const items = (order.items || []).map((it: any) => ({
      code: order.orderNumber,
      chargeCode: it.test?.testCode || order.orderNumber,
      description: it.test?.testName || 'Laboratory Test',
      quantity: 1,
      unitPrice: Number(it.price || 0),
      vat: 0,
      total: Number(it.price || 0),
    }));

    return {
      id: dbInv?.id || `lab-${order.id}`,
      invoiceNo,
      patientId: order.patientId,
      patientName,
      patientNumber: order.patient?.patientNumber,
      items,
      subtotal: total,
      vatTotal: 0,
      discountAmount: 0,
      totalAmount: total,
      patientAmount: total,
      donorAmount: 0,
      fundingSource: order.insurancePolicyNo ? 'INSURANCE' : 'SELF_PAY',
      amountPaid,
      outstanding,
      status: invStatus,
      createdAt: order.orderedAt,
      sourceRef: order.orderNumber,
      sourceType: 'LABORATORY',
      source: 'LABORATORY',
    };
  });

  // ── Step 5.5: Convert radiology orders to invoice shape ──────────────────────
  const radInvoices = radiologyOrders.map((order: any) => {
    const invoiceNo = `RAD-INV-${order.orderNumber}`;
    const dbInv = invoiceByFhirId.get(invoiceNo);
    const patientName = order.patient ? `${order.patient.firstName} ${order.patient.lastName}` : 'Unknown';
    const priceAmount = Number(order.catalogItem?.price || 15000);
    const total = dbInv ? Number(dbInv.total || priceAmount) : priceAmount;
    const isPaid = (order.insuranceStatus && (order.insuranceStatus.includes('PAID') || order.insuranceStatus === 'CLEARED')) || dbInv?.status === 'PAID';
    const amountPaid = dbInv ? Number(dbInv.amountPaid || (isPaid ? total : 0)) : (isPaid ? total : 0);
    const outstanding = isPaid ? 0 : Math.max(0, total - amountPaid);

    let invStatus = isPaid ? 'PAID'
      : dbInv ? (dbInv.status === 'ISSUED' ? 'UNPAID' : dbInv.status) : 'UNPAID';

    const items = [{
      code: order.orderNumber,
      chargeCode: order.catalogItem?.code || order.orderNumber,
      description: `Radiology (${order.catalogItem?.modality || 'X-RAY'}): ${order.catalogItem?.name || 'Emergency Scan'}`,
      quantity: 1,
      unitPrice: priceAmount,
      vat: 0,
      total: priceAmount,
    }];

    return {
      id: dbInv?.id || `rad-${order.id}`,
      invoiceNo,
      patientId: order.patientId,
      patientName,
      patientNumber: order.patient?.patientNumber,
      items,
      subtotal: total,
      vatTotal: 0,
      discountAmount: 0,
      totalAmount: total,
      patientAmount: total,
      donorAmount: 0,
      fundingSource: 'SELF_PAY',
      amountPaid,
      outstanding,
      status: invStatus,
      createdAt: order.createdAt,
      sourceRef: order.orderNumber,
      sourceType: 'RADIOLOGY',
      source: 'RADIOLOGY',
    };
  });

  // ── Step 6: Include any DB invoices that are NOT from prescriptions/labs/radiology ──
  const coveredFhirIds = new Set([
    ...prescriptions.map((rx: any) => `RX-INV-${rx.prescriptionNumber}`),
    ...labOrders.map((o: any) => `LAB-INV-${o.orderNumber}`),
    ...radiologyOrders.map((r: any) => `RAD-INV-${r.orderNumber}`),
  ]);
  const coveredDbIds = new Set([
    ...rxInvoices.map((i: any) => i.id).filter(Boolean),
    ...labInvoices.map((i: any) => i.id).filter(Boolean),
    ...radInvoices.map((i: any) => i.id).filter(Boolean),
  ]);

  const standaloneDbInvoices = await prisma.invoice.findMany({
    where: {
      ...(patientId ? { patientId: patientId as string } : {}),
      AND: [
        {
          OR: [
            { fhirId: null },
            { NOT: { fhirId: { in: [...coveredFhirIds] } } }
          ]
        },
        {
          NOT: { id: { in: [...coveredDbIds] } }
        }
      ]
    },
    include: { patient: { select: { firstName: true, lastName: true, patientNumber: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const standaloneNormalized = standaloneDbInvoices.map((inv: any) => ({
    id: inv.id,
    invoiceNo: inv.fhirId || `INV-DB-${inv.id.slice(0, 8).toUpperCase()}`,
    patientId: inv.patientId,
    patientName: inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : 'Unknown',
    patientNumber: inv.patient?.patientNumber,
    items: [{ code: inv.fhirId || inv.id, chargeCode: inv.fhirId || inv.id, description: inv.reasonText || 'Clinical Service', quantity: 1, unitPrice: inv.total, vat: 0, total: inv.total }],
    subtotal: inv.total,
    vatTotal: 0,
    discountAmount: 0,
    totalAmount: inv.total,
    patientAmount: inv.total,
    donorAmount: 0,
    fundingSource: 'SELF_PAY',
    amountPaid: inv.amountPaid || 0,
    outstanding: inv.total - (inv.amountPaid || 0),
    status: inv.status === 'ISSUED' ? 'UNPAID' : inv.status,
    createdAt: inv.createdAt,
    source: 'DATABASE',
  }));

  // ── Step 7: Filter in-memory invoices ─────────────────────────────────────
  let memData = [...invoices];
  if (patientId) memData = memData.filter(i => i.patientId === patientId);
  if (status) memData = memData.filter(i => i.status === status);
  if (from) memData = memData.filter(i => new Date(i.createdAt) >= new Date(from as string));
  if (to) memData = memData.filter(i => new Date(i.createdAt) <= new Date(to as string));
  const enrichedMem = await Promise.all(memData.map(async (inv) => {
    const patient = await prisma.patient.findUnique({ where: { id: inv.patientId }, select: { firstName: true, lastName: true, patientNumber: true } }).catch(() => null);
    return { ...inv, patientName: patient ? `${patient.firstName} ${patient.lastName}` : inv.patientName, patientNumber: patient?.patientNumber, source: 'MEMORY' };
  }));

  // ── Step 8: Merge, deduplicate by id/invoiceNo, filter by status, sort ─────────────────
  const rawCombined = [...rxInvoices, ...labInvoices, ...radInvoices, ...standaloneNormalized, ...enrichedMem];
  const combinedMap = new Map<string, any>();
  for (const item of rawCombined) {
    const key = item.id || item.invoiceNo;
    if (!combinedMap.has(key)) {
      combinedMap.set(key, item);
    }
  }
  let combined = Array.from(combinedMap.values());

  // ── Step 8.5: Auto-include Admission Deposit invoices for active admission visits ──
  try {
    const admissionVisits = await prisma.visit.findMany({
      where: {
        status: { in: ['ORDERED_ADMISSION', 'PENDING_BED_ASSIGNMENT'] },
        ...(patientId ? { patientId: patientId as string } : {})
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } },
        encounters: { where: { type: 'AdmissionOrder' }, orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    for (const v of admissionVisits) {
      if (!v.patient) continue;
      const expectedInvoiceNo = `INV-ADM-${v.id.slice(-6).toUpperCase()}`;
      const hasAdmissionInvoice = combined.some((inv: any) =>
        inv.visitId === v.id ||
        inv.invoiceNo === expectedInvoiceNo ||
        (inv.patientId === v.patientId && (
          inv.invoiceNo?.startsWith('INV-ADM-') ||
          inv.id?.startsWith('adm-inv-') ||
          inv.reasonText?.includes('Admission') ||
          inv.items?.some((it: any) => it.description?.includes('Admission') || it.chargeCode?.includes('ADMIT'))
        ))
      );
      if (!hasAdmissionInvoice) {
        const enc = v.encounters?.[0];
        const diagJson = (enc?.diagnosis as any) || {};
        const wardCat = diagJson.targetWardCategory || 'Medical';
        const depositAmount = wardCat === 'ICU' ? 80000 : (wardCat === 'VIP' || wardCat === 'PRIVATE') ? 40000 : 10000;
        const invoiceNo = `INV-ADM-${v.id.slice(-6).toUpperCase()}`;

        combined.unshift({
          id: `adm-inv-${v.id}`,
          invoiceNo,
          patientId: v.patientId,
          patientName: `${v.patient.firstName} ${v.patient.lastName}`,
          patientNumber: v.patient.patientNumber,
          visitId: v.id,
          items: [{
            code: `ADMIT-${wardCat.toUpperCase()}`,
            chargeCode: `ADMIT-${wardCat.toUpperCase()}`,
            description: `Inpatient Admission & Ward Accommodation Deposit (${wardCat} Ward)`,
            quantity: 1,
            unitPrice: depositAmount,
            vat: 0,
            total: depositAmount
          }],
          subtotal: depositAmount,
          vatTotal: 0,
          discountAmount: 0,
          totalAmount: depositAmount,
          patientAmount: depositAmount,
          donorAmount: 0,
          fundingSource: 'SELF_PAY',
          amountPaid: 0,
          outstanding: depositAmount,
          status: 'UNPAID',
          createdAt: v.createdAt.toISOString(),
          source: 'ADMISSION_ORDER',
        });
      }
    }
  } catch (err) {
    console.error('[Billing] Failed to synthesize admission deposit invoices:', err);
  }

  // ── Step 8.6: Auto-include Surgical Financial Clearance invoices for surgical requests ──
  try {
    const surgicalRequests = await prisma.surgicalRequest.findMany({
      where: {
        ...(patientId ? { patientId: patientId as string } : {})
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    for (const req of surgicalRequests) {
      if (!req.patient) continue;
      const expectedInvoiceNo = `SRG-INV-${req.requestNumber}`;
      const hasSurgicalInvoice = combined.some((inv: any) =>
        inv.invoiceNo === expectedInvoiceNo ||
        inv.id === `srg-${req.id}` ||
        inv.id === req.id ||
        (inv.patientId === req.patientId && (
          inv.invoiceNo?.startsWith('SRG-INV-') ||
          inv.reasonText?.includes(req.requestNumber)
        ))
      );

      if (!hasSurgicalInvoice) {
        const isPaid = req.status === 'APPROVED' || req.status === 'SCHEDULED' || req.status === 'COMPLETED' || req.urgency === 'EMERGENCY';
        const matchedCharge = chargeMasterItems.find(c =>
          c.name.toLowerCase().includes((req.proposedProcedure || '').toLowerCase()) ||
          (req.proposedProcedure || '').toLowerCase().includes(c.name.toLowerCase())
        ) || chargeMasterItems.find(c => c.code === 'SURG-ELECTIVE') || { code: 'SURG-ELECTIVE', basePrice: 150000 };

        const depositAmount = (isPaid && req.urgency === 'EMERGENCY') ? 0 : Number(matchedCharge.basePrice || 150000);
        const amountPaid = isPaid ? depositAmount : 0;
        const invStatus = isPaid ? 'PAID' : 'UNPAID';

        combined.unshift({
          id: `srg-${req.id}`,
          invoiceNo: expectedInvoiceNo,
          patientId: req.patientId,
          patientName: `${req.patient.firstName} ${req.patient.lastName}`,
          patientNumber: req.patient.patientNumber,
          requestId: req.id,
          items: [{
            code: matchedCharge.code || req.requestNumber,
            chargeCode: matchedCharge.code || 'SURG-ELECTIVE',
            description: `Surgical Fee Deposit & Financial Clearance: ${req.proposedProcedure} (${req.requestNumber})`,
            quantity: 1,
            unitPrice: depositAmount,
            vat: 0,
            total: depositAmount
          }],
          subtotal: depositAmount,
          vatTotal: 0,
          discountAmount: 0,
          totalAmount: depositAmount,
          patientAmount: depositAmount,
          donorAmount: 0,
          fundingSource: req.urgency === 'EMERGENCY' ? 'HMO' : 'SELF_PAY',
          amountPaid,
          outstanding: Math.max(0, depositAmount - amountPaid),
          status: invStatus,
          createdAt: req.createdAt.toISOString(),
          source: 'THEATRE',
          sourceType: 'THEATRE',
        });
      }
    }
  } catch (err) {
    console.error('[Billing] Failed to synthesize surgical clearance invoices:', err);
  }

  // ── Step 8.7: Auto-include Radiology Investigation Invoices for Radiology Orders ──
  try {
    const radOrders = await prisma.radiologyOrder.findMany({
      where: {
        ...(patientId ? { patientId: patientId as string } : {})
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, patientNumber: true } },
        catalogItem: { select: { id: true, name: true, code: true, price: true, modality: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    for (const rad of radOrders) {
      if (!rad.patient) continue;
      const expectedInvoiceNo = `RAD-INV-${rad.orderNumber}`;
      const hasRadInvoice = combined.some((inv: any) =>
        inv.invoiceNo === expectedInvoiceNo ||
        inv.id === `rad-${rad.id}` ||
        inv.orderId === rad.id ||
        (inv.patientId === rad.patientId && (
          inv.invoiceNo?.startsWith('RAD-INV-') ||
          inv.reasonText?.includes(rad.orderNumber)
        ))
      );

      if (!hasRadInvoice) {
        const isPaid = rad.insuranceStatus === 'PAID (HMO CLEARED)' || rad.insuranceStatus === 'PAID' || rad.insuranceStatus === 'CLEARED' || (rad.insuranceStatus && rad.insuranceStatus.includes('PAID'));
        const price = Number(rad.catalogItem?.price || 18000);
        const amountPaid = isPaid ? price : 0;
        const invStatus = isPaid ? 'PAID' : (rad.insuranceStatus === 'PENDING_PAYMENT' ? 'UNPAID' : 'PENDING');

        combined.unshift({
          id: `rad-${rad.id}`,
          invoiceNo: expectedInvoiceNo,
          patientId: rad.patientId,
          patientName: `${rad.patient.firstName} ${rad.patient.lastName}`,
          patientNumber: rad.patient.patientNumber,
          orderId: rad.id,
          orderNumber: rad.orderNumber,
          items: [{
            code: rad.catalogItem?.code || rad.orderNumber,
            chargeCode: rad.catalogItem?.code || 'RAD-PROCEDURE',
            description: `Radiology Procedure Fee: ${rad.catalogItem?.name || 'Diagnostic Investigation'} (${rad.orderNumber})`,
            quantity: 1,
            unitPrice: price,
            vat: 0,
            total: price
          }],
          subtotal: price,
          vatTotal: 0,
          discountAmount: 0,
          totalAmount: price,
          patientAmount: price,
          donorAmount: 0,
          fundingSource: 'SELF_PAY',
          amountPaid,
          outstanding: Math.max(0, price - amountPaid),
          status: invStatus,
          createdAt: rad.createdAt.toISOString(),
          source: 'RADIOLOGY',
          sourceType: 'RADIOLOGY',
        });
      }
    }
  } catch (err) {
    console.error('[Billing] Failed to synthesize radiology investigation invoices:', err);
  }
  
  // Deduplicate by unique ID to prevent memory/DB duplicate entries
  const seenIds = new Set<string>();
  combined = combined.filter((inv: any) => {
    if (!inv.id) return true;
    if (seenIds.has(inv.id)) return false;
    seenIds.add(inv.id);
    return true;
  });

  // ── Step 8.8: Attach Receipt Numbers & Link Approved Refunds / Adjustments ──
  combined = combined.map((inv: any) => {
    const rawInvNo = (inv.invoiceNo || inv.fhirId || '').toUpperCase();
    const digits = rawInvNo.replace(/[^0-9]/g, '');

    // Match payment from cashier ledger (or synthesize REC-xxx for paid/settled items)
    const matchingPayment = payments.find((p: any) =>
      (inv.id && p.invoiceId === inv.id) ||
      (inv.invoiceNo && p.invoiceNo === inv.invoiceNo) ||
      (digits && p.receiptNo && p.receiptNo.replace(/[^0-9]/g, '') === digits)
    );

    const receiptNo = matchingPayment?.receiptNo || (
      ((inv.amountPaid && inv.amountPaid > 0) || inv.status === 'PAID') && digits
        ? `REC-${digits}`
        : undefined
    );

    // Match approved refunds
    const matchingRefunds = refunds.filter((r: any) =>
      r.status === 'APPROVED' && (
        (inv.id && r.invoiceId === inv.id) ||
        (inv.invoiceNo && r.invoiceNo === inv.invoiceNo) ||
        (receiptNo && r.receiptNo === receiptNo) ||
        (digits && r.receiptNo && r.receiptNo.replace(/[^0-9]/g, '') === digits) ||
        (inv.id && r.invoiceId && (inv.id.includes(r.invoiceId) || r.invoiceId.includes(inv.id.slice(-8))))
      )
    );

    const totalRefunded = matchingRefunds.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
    const originalPaid = Number(inv.amountPaid ?? (inv.status === 'PAID' ? inv.totalAmount : 0));
    const netAmountPaid = Math.max(0, originalPaid - totalRefunded);

    let updatedStatus = inv.status;
    if (totalRefunded > 0) {
      if (netAmountPaid === 0 && (inv.totalAmount || 0) > 0) {
        updatedStatus = 'REFUNDED';
      } else {
        updatedStatus = 'PARTIALLY_REFUNDED';
      }
    }

    return {
      ...inv,
      receiptNo: receiptNo || inv.receiptNo,
      receipts: receiptNo ? [receiptNo] : (inv.receipts || []),
      refundedAmount: totalRefunded,
      refunds: matchingRefunds,
      originalAmountPaid: originalPaid,
      amountPaid: totalRefunded > 0 ? netAmountPaid : inv.amountPaid,
      netAmountPaid,
      status: updatedStatus,
    };
  });

  if (status) combined = combined.filter((i: any) => i.status === status);
  combined.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return combined;
}

// ─── INVOICES (FR-BILL-016 to FR-BILL-020) ────────────────────────────────
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const combined = await fetchAllInvoices(req.query);
    res.json({ success: true, data: combined, total: combined.length });
  } catch (err) {
    console.error('[Billing] Failed to fetch invoices:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
});

router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const { patientId, patientName, items, fundingSource, payerId, discount, notes, encounterId } = req.body;
    if (!patientId || !items?.length) return res.status(400).json({ success: false, message: 'Patient and line items required' });
    
    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
    const vatTotal = items.reduce((sum: number, item: any) => sum + ((item.unitPrice * item.quantity) * (item.vat || 0) / 100), 0);
    const discountAmount = discount || 0;
    const totalAmount = subtotal + vatTotal - discountAmount;
    
    // Check for donor-funded items
    const donorItems = items.filter((i: any) => i.donorFunded);
    const patientItems = items.filter((i: any) => !i.donorFunded);
    const patientTotal = patientItems.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
    
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(++invoiceSeq).padStart(5, '0')}`;
    const invoice = {
      id: `inv_${Date.now()}`,
      invoiceNo,
      patientId,
      patientName,
      encounterId,
      items,
      donorItems,
      patientItems,
      subtotal,
      vatTotal,
      discountAmount,
      totalAmount,
      patientAmount: patientTotal,
      donorAmount: totalAmount - patientTotal,
      fundingSource: fundingSource || 'SELF_PAY',
      payerId,
      status: 'ISSUED',
      amountPaid: 0,
      outstanding: totalAmount,
      notes,
      createdBy: (req as any).user?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    invoices.unshift(invoice);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_INVOICE', resourceType: 'Invoice', resourceId: invoice.id, changes: { invoiceNo, totalAmount } });
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create invoice' });
  }
});

router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const invoice = invoices.find(i => i.id === req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
});

router.patch('/invoices/:id/void', async (req: Request, res: Response) => {
  try {
    const invoice = invoices.find(i => i.id === req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.amountPaid > 0) return res.status(400).json({ success: false, message: 'Cannot void a partially paid invoice. Issue a credit note instead.' });
    const original = { ...invoice };
    invoice.status = 'CANCELLED';
    invoice.voidedAt = new Date().toISOString();
    invoice.voidedBy = (req as any).user?.id;
    invoice.voidReason = req.body.reason;
    await logAudit({ userId: (req as any).user?.id, action: 'VOID_INVOICE', resourceType: 'Invoice', resourceId: invoice.id, changes: { original, reason: req.body.reason } });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to void invoice' });
  }
});

// Revert payment for an invoice
router.post('/invoices/:id/revert-payment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find in database
    const dbInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { patient: true }
    });

    if (!dbInvoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // 1. Reset invoice amountPaid and status in DB
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: 0,
        status: 'ISSUED'
      }
    });

    // 2. Remove associated payments from in-memory array
    const pmtIndices: number[] = [];
    for (let i = 0; i < payments.length; i++) {
      if (payments[i].invoiceId === id) {
        pmtIndices.push(i);
      }
    }
    // Delete in-memory payments (descending to avoid index shift)
    pmtIndices.sort((a, b) => b - a).forEach(idx => {
      payments.splice(idx, 1);
    });

    // 3. Revert in-memory invoice copy
    const memInv = invoices.find(i => i.id === id || (dbInvoice.fhirId && i.invoiceNo === dbInvoice.fhirId));
    if (memInv) {
      memInv.amountPaid = 0;
      memInv.outstanding = memInv.totalAmount;
      memInv.status = 'ISSUED';
      memInv.updatedAt = new Date().toISOString();
    }

    // 4. Sync paymentStatus back to the source prescription or lab order
    if (dbInvoice.fhirId) {
      try {
        if (dbInvoice.fhirId.startsWith('RX-INV-')) {
          const prescNo = dbInvoice.fhirId.replace('RX-INV-', '');
          await prisma.pharmacyPrescription.updateMany({ where: { prescriptionNumber: prescNo }, data: { paymentStatus: 'UNPAID', status: 'PENDING_VERIFICATION' } });
          console.log(`[Billing Revert] Reverted prescription ${prescNo} paymentStatus to UNPAID`);
        } else if (dbInvoice.fhirId.startsWith('LAB-INV-')) {
          const orderNo = dbInvoice.fhirId.replace('LAB-INV-', '');
          await prisma.labOrder.updateMany({ where: { orderNumber: orderNo }, data: { paymentStatus: 'UNPAID' } });
          console.log(`[Billing Revert] Reverted lab order ${orderNo} paymentStatus to UNPAID`);
        }
      } catch (e) {
        console.error('[Billing Revert] Failed to sync paymentStatus back to source:', e);
      }
    }

    // 5. Revert patient visit status back to AWAITING_PAYMENT
    const visitId = memInv?.visitId;
    if (visitId) {
      try {
        await prisma.visit.update({
          where: { id: visitId },
          data: { status: 'AWAITING_PAYMENT' }
        });
        await prisma.visitWorkflowState.update({
          where: { visitId },
          data: {
            currentStatus: 'AWAITING_PAYMENT',
            currentStepOrder: 2 // AWAITING_PAYMENT step order
          }
        });
        
        // Remove triage queue ticket if it exists (since they aren't waiting for triage yet)
        await prisma.patientQueue.deleteMany({
          where: { visitId, department: 'TRIAGE', status: 'WAITING' }
        });

        console.log(`[Billing Revert] Reverted visit ${visitId} status to AWAITING_PAYMENT`);
      } catch (e) {
        console.error('[Billing Revert] Failed to revert visit status:', e);
      }
    }

    // 6. Notify real-time SSE event clients
    try {
      const { notifyVisitsChange } = await import('./visits.js');
      notifyVisitsChange();
    } catch (e) {
      console.error('[Billing Revert] SSE notify failed:', e);
    }

    res.json({ success: true, invoice: updatedInvoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to revert payment' });
  }
});

// ─── PAYMENTS & CASHIER (FR-CASH-001 to FR-CASH-015) ──────────────────────
router.post('/payments', async (req: Request, res: Response) => {
  try {
    const { invoiceId, methods, totalPaid, cashierId, shiftId, notes } = req.body;
    if (!invoiceId || !methods?.length || !totalPaid) return res.status(400).json({ success: false, message: 'Invoice, payment methods, and amount required' });
    
    // Validation: total paid methods must equal totalPaid (FR-CASH validation)
    const methodsTotal = methods.reduce((sum: number, m: any) => sum + m.amount, 0);
    if (Math.abs(methodsTotal - totalPaid) > 0.01) return res.status(400).json({ success: false, message: 'Payment methods total must equal total paid amount' });

    // Resolve Target Shift
    let targetShift = shiftId ? cashierShifts.find(s => s.id === shiftId || s.shiftNumber === shiftId) : null;
    if (!targetShift) {
      targetShift = cashierShifts.find(s => s.status === 'OPEN' && (s.userId === (req as any).user?.id || s.cashierId === cashierId)) || cashierShifts.find(s => s.status === 'OPEN');
    }

    // Resolve Cashier Staff Name
    let cashierName = targetShift?.cashierName || 'Mary Okon';
    let resolvedCashierId = targetShift?.cashierId || cashierId || (req as any).user?.id || 'cashier';
    if (!targetShift) {
      try {
        const uId = (req as any).user?.id || cashierId;
        if (uId) {
          const staffRec = await prisma.staff.findFirst({
            where: { OR: [{ id: uId }, { userId: uId }] }
          });
          if (staffRec) {
            cashierName = `${staffRec.firstName} ${staffRec.lastName}`.trim();
          } else if ((req as any).user?.username === 'cashier01') {
            cashierName = 'Blessing Ugwu';
          } else if ((req as any).user?.username === 'cashier') {
            cashierName = 'Mary Okon';
          }
        }
      } catch (e) {}
    }

    // Try in-memory invoice first
    let invoice = invoices.find(i => i.id === invoiceId || i.invoiceNo === invoiceId);

    if (invoice) {
      // In-memory invoice payment flow
      if (invoice.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Cannot pay a cancelled invoice' });
      if (totalPaid > invoice.outstanding + 0.01) return res.status(400).json({ success: false, message: 'Payment exceeds outstanding balance' });

      // E-Wallet deduction if selected
      const walletMethod = methods.find((m: any) => m.method === 'E_WALLET');
      if (walletMethod) {
        const dbPatient = await prisma.patient.findUnique({ where: { id: invoice.patientId } });
        if (!dbPatient || Number(dbPatient.walletBalance) < walletMethod.amount) {
          return res.status(400).json({ success: false, message: `Insufficient E-Wallet balance (Current: ₦${Number(dbPatient?.walletBalance || 0).toLocaleString()})` });
        }
        await prisma.patient.update({
          where: { id: invoice.patientId },
          data: { walletBalance: { decrement: walletMethod.amount } }
        });
      }

      const receiptNo = `RCP-${new Date().getFullYear()}-${String(++receiptSeq).padStart(6, '0')}`;
      const payment: any = {
        id: `pmt_${Date.now()}`, receiptNo, invoiceId, invoiceNo: invoice.invoiceNo,
        patientId: invoice.patientId, patientName: invoice.patientName,
        methods, totalPaid, cashierName, cashierId: resolvedCashierId,
        shiftId: targetShift?.id,
        notes, status: 'COMPLETED', createdAt: new Date().toISOString(),
      };
      payments.unshift(payment);
      syncShiftBalances();

      invoice.amountPaid = (invoice.amountPaid || 0) + totalPaid;
      invoice.outstanding = invoice.totalAmount - invoice.amountPaid;
      invoice.status = invoice.outstanding <= 0.01 ? 'PAID' : 'PARTIAL';
      invoice.updatedAt = new Date().toISOString();

      // Sync to DB if linked
      try {
        const dbInv = await prisma.invoice.findFirst({ where: { OR: [{ id: invoice.id }, { fhirId: invoice.invoiceNo }] } });
        if (dbInv) {
          await prisma.invoice.update({ where: { id: dbInv.id }, data: { amountPaid: invoice.amountPaid, status: invoice.status } });
        }
      } catch (e) { console.error('[Billing] DB Invoice update failed:', e); }

      // Advance patient journey in workflow engine if payment is completed
      if (invoice.status === 'PAID' && invoice.visitId) {
        try {
          const v = await prisma.visit.findUnique({ where: { id: invoice.visitId } });
          const isAdmissionInvoice = (
            invoice.invoiceNo?.startsWith('INV-ADM-') ||
            invoice.reasonText?.includes('Admission') ||
            invoice.category === 'ADMISSION' ||
            (invoice as any).description?.includes('Admission')
          );

          if (v && (v.status === 'ORDERED_ADMISSION' || (v.status === 'AWAITING_PAYMENT' && isAdmissionInvoice))) {
            await prisma.visit.update({
              where: { id: invoice.visitId },
              data: { status: 'PENDING_BED_ASSIGNMENT' }
            });
            const wf = await prisma.visitWorkflowState.findUnique({ where: { visitId: invoice.visitId } });
            if (wf) {
              await prisma.visitWorkflowState.update({
                where: { visitId: invoice.visitId },
                data: { currentStatus: 'PENDING_BED_ASSIGNMENT' }
              });
            }
            console.log(`[Billing] Admission deposit paid. Advanced visit ${invoice.visitId} status to PENDING_BED_ASSIGNMENT`);
          } else {
            const { autoAdvanceVisitToStatus } = await import('./workflow.js');
            await autoAdvanceVisitToStatus(invoice.visitId, 'PAYMENT_CONFIRMED', (req as any).user?.username || 'System Cashier');
            console.log(`[Billing] Automatically advanced visit ${invoice.visitId} to PAYMENT_CONFIRMED (Promotes to WAITING_TRIAGE)`);
          }
        } catch (e) {
          console.error('[Billing] Failed to advance visit status on payment:', e);
        }
      }

      await logAudit({ userId: (req as any).user?.id, action: 'RECEIVE_PAYMENT', resourceType: 'Payment', resourceId: payment.id, changes: { receiptNo, totalPaid, invoiceNo: invoice.invoiceNo } });
      return res.status(201).json({ success: true, data: payment, invoice });
    }

    // Fallback: look up in Prisma DB (DB-sourced invoices from prescriptions/lab orders/admission orders/check-ins)
    let dbInvoice = await prisma.invoice.findFirst({
      where: { OR: [{ id: invoiceId }, { fhirId: invoiceId }] },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    if (!dbInvoice && typeof invoiceId === 'string' && invoiceId.startsWith('INV-DB-')) {
      const shortCode = invoiceId.replace('INV-DB-', '').toLowerCase();
      const candidateInvoices = await prisma.invoice.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { firstName: true, lastName: true } } }
      });
      dbInvoice = candidateInvoices.find((inv: any) => inv.id.toLowerCase().startsWith(shortCode)) as any;
    }

    if (!dbInvoice) {
      if (invoiceId.startsWith('rx-') || invoiceId.startsWith('RX-INV-')) {
        const rxId = invoiceId.startsWith('rx-') ? invoiceId.replace('rx-', '') : null;
        const rxNo = invoiceId.startsWith('RX-INV-') ? invoiceId.replace('RX-INV-', '') : null;
        const rx = await prisma.pharmacyPrescription.findFirst({
          where: rxId ? { id: rxId } : { prescriptionNumber: rxNo },
          include: { 
            patient: { select: { firstName: true, lastName: true } },
            items: { include: { medication: true } }
          }
        });
        if (rx) {
          dbInvoice = await prisma.invoice.findFirst({
            where: { fhirId: `RX-INV-${rx.prescriptionNumber}` },
            include: { patient: { select: { firstName: true, lastName: true } } }
          }) as any;

          if (!dbInvoice) {
            let total = Number(rx.totalAmount || 0);
            if (total === 0 && rx.items && rx.items.length > 0) {
              total = rx.items.reduce((sum, it) => sum + (Number(it.medication?.price || 0) * (it.quantityPrescribed || 1)), 0);
            }
            dbInvoice = (await prisma.invoice.create({
              data: {
                fhirId: `RX-INV-${rx.prescriptionNumber}`,
                patientId: rx.patientId,
                status: 'ISSUED',
                total: total,
                amountPaid: 0,
                reasonText: `Pharmacy Prescription (${rx.prescriptionNumber})`
              },
              include: { patient: { select: { firstName: true, lastName: true } } }
            })) as any;
          }
        }
      } else if (invoiceId.startsWith('lab-') || invoiceId.startsWith('LAB-INV-')) {
        const labId = invoiceId.startsWith('lab-') ? invoiceId.replace('lab-', '') : null;
        const orderNo = invoiceId.startsWith('LAB-INV-') ? invoiceId.replace('LAB-INV-', '') : null;
        const labOrder = await prisma.labOrder.findFirst({
          where: labId ? { id: labId } : { orderNumber: orderNo },
          include: { 
            patient: { select: { firstName: true, lastName: true } },
            items: { include: { test: true } }
          }
        });
        if (labOrder) {
          dbInvoice = await prisma.invoice.findFirst({
            where: { fhirId: `LAB-INV-${labOrder.orderNumber}` },
            include: { patient: { select: { firstName: true, lastName: true } } }
          }) as any;

          if (!dbInvoice) {
            let total = Number(labOrder.totalAmount || 0);
            if (total === 0 && labOrder.items && labOrder.items.length > 0) {
              total = labOrder.items.reduce((sum, it) => sum + Number(it.price || 0), 0);
            }
            dbInvoice = (await prisma.invoice.create({
              data: {
                fhirId: `LAB-INV-${labOrder.orderNumber}`,
                patientId: labOrder.patientId,
                status: 'ISSUED',
                total: total,
                amountPaid: 0,
                reasonText: `Lab Order (${labOrder.orderNumber})`
              },
              include: { patient: { select: { firstName: true, lastName: true } } }
            })) as any;
          }
        }
      } else if (invoiceId.startsWith('rad-') || invoiceId.startsWith('RAD-INV-')) {
        const radId = invoiceId.startsWith('rad-') ? invoiceId.replace('rad-', '') : null;
        const radNo = invoiceId.startsWith('RAD-INV-') ? invoiceId.replace('RAD-INV-', '') : null;
        const radOrder = await prisma.radiologyOrder.findFirst({
          where: radId ? { id: radId } : { orderNumber: radNo },
          include: {
            patient: { select: { firstName: true, lastName: true } },
            catalogItem: { select: { name: true, price: true } }
          }
        });
        if (radOrder) {
          dbInvoice = await prisma.invoice.findFirst({
            where: { fhirId: `RAD-INV-${radOrder.orderNumber}` },
            include: { patient: { select: { firstName: true, lastName: true } } }
          }) as any;

          if (!dbInvoice) {
            const total = Number(radOrder.catalogItem?.price || 18000);
            dbInvoice = (await prisma.invoice.create({
              data: {
                fhirId: `RAD-INV-${radOrder.orderNumber}`,
                patientId: radOrder.patientId,
                status: 'ISSUED',
                total: total,
                amountPaid: 0,
                reasonText: `Radiology Procedure Fee: ${radOrder.catalogItem?.name || 'Diagnostic Investigation'} (${radOrder.orderNumber})`
              },
              include: { patient: { select: { firstName: true, lastName: true } } }
            })) as any;
          }
        }
      } else if (invoiceId.startsWith('adm-inv-') || invoiceId.startsWith('INV-ADM-')) {
        const visitId = invoiceId.startsWith('adm-inv-') ? invoiceId.replace('adm-inv-', '') : null;
        const invNo = invoiceId.startsWith('INV-ADM-') ? invoiceId : null;

        const visit = await prisma.visit.findFirst({
          where: visitId ? { id: visitId } : { encounters: { some: { type: 'AdmissionOrder' } } },
          include: { 
            patient: { select: { firstName: true, lastName: true } },
            encounters: { where: { type: 'AdmissionOrder' }, orderBy: { createdAt: 'desc' }, take: 1 }
          }
        });

        if (visit) {
          const fhirId = invNo || `INV-ADM-${visit.id.slice(-6).toUpperCase()}`;

          // Try 1: Find an UNPAID/ISSUED invoice matching this exact fhirId or visit
          dbInvoice = await prisma.invoice.findFirst({
            where: {
              OR: [
                { fhirId, status: { in: ['ISSUED', 'UNPAID'] } },
                { patientId: visit.patientId, fhirId, status: { in: ['ISSUED', 'UNPAID'] } },
                { patientId: visit.patientId, status: { in: ['ISSUED', 'UNPAID'] }, fhirId: { startsWith: 'INV-ADM-' } },
                { patientId: visit.patientId, status: { in: ['ISSUED', 'UNPAID'] }, reasonText: { contains: 'Admission' } }
              ]
            },
            include: { patient: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' }
          }) as any;

          // Try 2: Fallback to exact fhirId regardless of status
          if (!dbInvoice) {
            dbInvoice = await prisma.invoice.findFirst({
              where: { fhirId },
              include: { patient: { select: { firstName: true, lastName: true } } }
            }) as any;
          }

          // Try 3: Create invoice if none exists yet for this visit
          if (!dbInvoice) {
            const enc = visit.encounters?.[0];
            const diagJson = (enc?.diagnosis as any) || {};
            const wardCat = diagJson.targetWardCategory || 'Medical';
            const depositAmount = wardCat === 'ICU' ? 80000 : (wardCat === 'VIP' || wardCat === 'PRIVATE') ? 40000 : 10000;
            const serviceName = `Inpatient Admission & Ward Accommodation Deposit (${wardCat} Ward)`;

            dbInvoice = (await prisma.invoice.create({
              data: {
                fhirId,
                patientId: visit.patientId,
                status: 'ISSUED',
                total: depositAmount,
                amountPaid: 0,
                reasonText: serviceName,
              },
              include: { patient: { select: { firstName: true, lastName: true } } }
            })) as any;
          }
        }
      } else if (invoiceId.startsWith('srg-') || invoiceId.startsWith('SRG-INV-')) {
        const srgReqId = invoiceId.startsWith('srg-') ? invoiceId.replace('srg-', '') : null;
        const reqNo = invoiceId.startsWith('SRG-INV-') ? invoiceId.replace('SRG-INV-', '') : null;
        const srgReq = await prisma.surgicalRequest.findFirst({
          where: srgReqId ? { id: srgReqId } : { requestNumber: reqNo },
          include: { patient: { select: { firstName: true, lastName: true } } }
        });
        if (srgReq) {
          const fhirId = `SRG-INV-${srgReq.requestNumber}`;
          dbInvoice = await prisma.invoice.findFirst({
            where: { fhirId },
            include: { patient: { select: { firstName: true, lastName: true } } }
          }) as any;

          if (!dbInvoice) {
            dbInvoice = (await prisma.invoice.create({
              data: {
                fhirId,
                patientId: srgReq.patientId,
                status: 'ISSUED',
                total: 150000,
                amountPaid: 0,
                reasonText: `Surgical Financial Clearance Deposit: ${srgReq.proposedProcedure} (${srgReq.requestNumber})`
              },
              include: { patient: { select: { firstName: true, lastName: true } } }
            })) as any;
          }
        }
      }
    }

      // Broad Fallback for Admission Visits if dbInvoice is still null
      if (!dbInvoice) {
        const activeAdmissionVisit = await prisma.visit.findFirst({
          where: {
            status: { in: ['ORDERED_ADMISSION', 'PENDING_BED_ASSIGNMENT'] }
          },
          include: {
            patient: { select: { firstName: true, lastName: true } },
            encounters: { where: { type: 'AdmissionOrder' }, orderBy: { createdAt: 'desc' }, take: 1 }
          }
        });

        if (activeAdmissionVisit) {
          const enc = activeAdmissionVisit.encounters?.[0];
          const diagJson = (enc?.diagnosis as any) || {};
          const wardCat = diagJson.targetWardCategory || 'Medical';
          const depositAmount = wardCat === 'ICU' ? 80000 : (wardCat === 'VIP' || wardCat === 'PRIVATE') ? 40000 : 10000;
          const serviceName = `Inpatient Admission & Ward Accommodation Deposit (${wardCat} Ward)`;
          const fhirId = `INV-ADM-${activeAdmissionVisit.id.slice(-6).toUpperCase()}`;

          dbInvoice = (await prisma.invoice.create({
            data: {
              fhirId,
              patientId: activeAdmissionVisit.patientId,
              status: 'ISSUED',
              total: depositAmount,
              amountPaid: 0,
              reasonText: serviceName,
            },
            include: { patient: { select: { firstName: true, lastName: true } } }
          })) as any;
        }
      }

    if (!dbInvoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // Dynamic Healing: If loaded DB invoice has total = 0, recalculate it dynamically from source
    if (dbInvoice.total === 0) {
      if (dbInvoice.fhirId?.startsWith('LAB-INV-')) {
        const orderNo = dbInvoice.fhirId.replace('LAB-INV-', '');
        const labOrder = await prisma.labOrder.findFirst({
          where: { orderNumber: orderNo },
          include: { items: { include: { test: true } } }
        });
        if (labOrder && labOrder.items && labOrder.items.length > 0) {
          dbInvoice.total = labOrder.items.reduce((sum, it) => sum + Number(it.price || 0), 0);
          await prisma.invoice.update({
            where: { id: dbInvoice.id },
            data: { total: dbInvoice.total }
          });
          console.log(`[Billing] Automatically healed DB invoice ${dbInvoice.id} total to ${dbInvoice.total}`);
        }
      } else if (dbInvoice.fhirId?.startsWith('RX-INV-')) {
        const prescNo = dbInvoice.fhirId.replace('RX-INV-', '');
        const rx = await prisma.pharmacyPrescription.findFirst({
          where: { prescriptionNumber: prescNo },
          include: { items: { include: { medication: true } } }
        });
        if (rx && rx.items && rx.items.length > 0) {
          dbInvoice.total = rx.items.reduce((sum, it) => sum + (Number(it.medication?.price || 0) * (it.quantityPrescribed || 1)), 0);
          await prisma.invoice.update({
            where: { id: dbInvoice.id },
            data: { total: dbInvoice.total }
          });
          console.log(`[Billing] Automatically healed DB invoice ${dbInvoice.id} total to ${dbInvoice.total}`);
        }
      } else if (dbInvoice.fhirId?.startsWith('INV-ADM-') || dbInvoice.reasonText?.includes('Admission')) {
        dbInvoice.total = 10000;
        await prisma.invoice.update({
          where: { id: dbInvoice.id },
          data: { total: dbInvoice.total }
        });
        console.log(`[Billing] Automatically healed Admission DB invoice ${dbInvoice.id} total to ${dbInvoice.total}`);
      }
    }

    if (dbInvoice.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Cannot pay a cancelled invoice' });

    const outstanding = Math.max(0, dbInvoice.total - (dbInvoice.amountPaid || 0));
    if (outstanding <= 0.01 || dbInvoice.status === 'PAID') {
      if (dbInvoice.status !== 'PAID') {
        await prisma.invoice.update({ where: { id: dbInvoice.id }, data: { status: 'PAID' } }).catch(() => {});
      }
      return res.status(400).json({ success: false, message: 'This payment has already been received and confirmed.' });
    }
    if (totalPaid > outstanding + 0.01) {
      return res.status(400).json({ success: false, message: `Payment amount (₦${totalPaid.toLocaleString()}) exceeds remaining balance of ₦${outstanding.toLocaleString()}` });
    }

    // E-Wallet deduction if selected
    const walletMethod = methods.find((m: any) => m.method === 'E_WALLET');
    if (walletMethod) {
      const dbPatient = await prisma.patient.findUnique({ where: { id: dbInvoice.patientId } });
      if (!dbPatient || Number(dbPatient.walletBalance) < walletMethod.amount) {
        return res.status(400).json({ success: false, message: `Insufficient E-Wallet balance (Current: ₦${Number(dbPatient?.walletBalance || 0).toLocaleString()})` });
      }
      await prisma.patient.update({
        where: { id: dbInvoice.patientId },
        data: { walletBalance: { decrement: walletMethod.amount } }
      });
    }

    const newAmountPaid = (dbInvoice.amountPaid || 0) + totalPaid;
    const newStatus = newAmountPaid >= dbInvoice.total - 0.01 ? 'PAID' : 'PARTIAL';

    await prisma.invoice.update({ where: { id: dbInvoice.id }, data: { amountPaid: newAmountPaid, status: newStatus } });

    // Sync paymentStatus back to the source pharmacy prescription or lab order
    if (newStatus === 'PAID') {
      try {
        if (dbInvoice.fhirId?.startsWith('RX-INV-')) {
          const prescNo = dbInvoice.fhirId.replace('RX-INV-', '');
          await prisma.pharmacyPrescription.updateMany({ where: { prescriptionNumber: prescNo }, data: { paymentStatus: 'PAID' } });
          console.log(`[Billing] Updated prescription ${prescNo} paymentStatus to PAID`);
        } else if (dbInvoice.fhirId?.startsWith('LAB-INV-')) {
          const orderNo = dbInvoice.fhirId.replace('LAB-INV-', '');
          await prisma.labOrder.updateMany({ where: { orderNumber: orderNo }, data: { paymentStatus: 'PAID' } });
          console.log(`[Billing] Updated lab order ${orderNo} paymentStatus to PAID`);
        } else if (dbInvoice.fhirId?.startsWith('RAD-INV-')) {
          const radNo = dbInvoice.fhirId.replace('RAD-INV-', '');
          const primaryMethod = (methods && methods.length > 0) ? methods[0].method : 'CASH';
          let methodLabel = 'CASH';
          if (primaryMethod === 'CASH') methodLabel = 'CASH';
          else if (primaryMethod === 'POS') methodLabel = 'POS';
          else if (primaryMethod === 'BANK_TRANSFER' || primaryMethod === 'TRANSFER') methodLabel = 'TRANSFER';
          else if (primaryMethod === 'E_WALLET' || primaryMethod === 'WALLET') methodLabel = 'E-WALLET';
          else if (primaryMethod === 'HMO') methodLabel = 'HMO CLEARED';
          else if (primaryMethod === 'NHIA') methodLabel = 'NHIA CLEARED';
          else methodLabel = String(primaryMethod).toUpperCase();

          const paidStatusLabel = `PAID (${methodLabel})`;
          await prisma.radiologyOrder.updateMany({ where: { orderNumber: radNo }, data: { insuranceStatus: paidStatusLabel } });
          console.log(`[Billing] Updated radiology order ${radNo} insuranceStatus to ${paidStatusLabel}`);
        } else if (dbInvoice.fhirId?.startsWith('SRG-INV-')) {
          const reqNo = dbInvoice.fhirId.replace('SRG-INV-', '');
          const srgReq = await prisma.surgicalRequest.findFirst({ where: { requestNumber: reqNo } });
          if (srgReq) {
            await prisma.surgicalRequest.update({ where: { id: srgReq.id }, data: { status: 'APPROVED' } });
            console.log(`[Billing] Updated surgical request ${reqNo} status to APPROVED`);

            const activeSurgVisit = await prisma.visit.findFirst({
              where: { patientId: srgReq.patientId, status: { notIn: ['CLOSED', 'DISCHARGED'] } },
              orderBy: { createdAt: 'desc' }
            });
            if (activeSurgVisit) {
              const { autoAdvanceVisitToStatus } = await import('./workflow.js');
              await autoAdvanceVisitToStatus(activeSurgVisit.id, 'PAYMENT_CONFIRMED', (req as any).user?.username || 'Billing Cashier');
            }
          }
        }

        // Check if there is an in-memory invoice representation that contains visitId
        let visitIdToAdvance = null;
        const memInv = invoices.find(i => i.id === dbInvoice.id || (dbInvoice.fhirId && i.invoiceNo === dbInvoice.fhirId));
        if (memInv && memInv.visitId) {
          visitIdToAdvance = memInv.visitId;
        } else if (dbInvoice.fhirId?.startsWith('LAB-INV-')) {
          const orderNo = dbInvoice.fhirId.replace('LAB-INV-', '');
          const labOrder = await prisma.labOrder.findFirst({ where: { orderNumber: orderNo }});
          if (labOrder?.visitId) visitIdToAdvance = labOrder.visitId;
        }

        if (!visitIdToAdvance && (
          dbInvoice.reasonText?.includes('Registration fee') ||
          dbInvoice.reasonText?.includes('Consultation fee') ||
          dbInvoice.reasonText?.includes('Check-in') ||
          dbInvoice.reasonText?.includes('Admission') ||
          dbInvoice.fhirId?.startsWith('INV-ADM-')
        )) {
          const activeVisit = await prisma.visit.findFirst({
            where: { 
              patientId: dbInvoice.patientId, 
              status: { in: ['REGISTERED', 'AWAITING_PAYMENT', 'ORDERED_ADMISSION', 'PENDING_BED_ASSIGNMENT'] } 
            },
            orderBy: { createdAt: 'desc' }
          });
          if (activeVisit) {
            visitIdToAdvance = activeVisit.id;
          }
        }

        if (visitIdToAdvance) {
          const v = await prisma.visit.findUnique({ where: { id: visitIdToAdvance } });
          const isAdmDbInv = Boolean(dbInvoice.reasonText?.includes('Admission') || dbInvoice.fhirId?.startsWith('INV-ADM-'));
          if (v && (v.status === 'ORDERED_ADMISSION' || (v.status === 'AWAITING_PAYMENT' && isAdmDbInv))) {
            await prisma.visit.update({
              where: { id: visitIdToAdvance },
              data: { status: 'PENDING_BED_ASSIGNMENT' }
            });
            const wf = await prisma.visitWorkflowState.findUnique({ where: { visitId: visitIdToAdvance } });
            if (wf) {
              await prisma.visitWorkflowState.update({
                where: { visitId: visitIdToAdvance },
                data: { currentStatus: 'PENDING_BED_ASSIGNMENT' }
              });
            }
            console.log(`[Billing] Admission deposit paid. Advanced visit ${visitIdToAdvance} status to PENDING_BED_ASSIGNMENT`);
          } else {
            const { autoAdvanceVisitToStatus } = await import('./workflow.js');
            await autoAdvanceVisitToStatus(visitIdToAdvance, 'PAYMENT_CONFIRMED', (req as any).user?.username || 'System Cashier');
            console.log(`[Billing] Advanced visit ${visitIdToAdvance} to PAYMENT_CONFIRMED via DB invoice sync`);
          }

          try {
            const { notifyVisitsChange } = await import('./visits.js');
            notifyVisitsChange();
          } catch (e) {}
        }
      } catch (e) {
        console.error('[Billing] Failed to sync paymentStatus/advance visit status:', e);
      }
    }

    const receiptNo = `RCP-${new Date().getFullYear()}-${String(++receiptSeq).padStart(6, '0')}`;
    const patientName = dbInvoice.patient ? `${(dbInvoice.patient as any).firstName} ${(dbInvoice.patient as any).lastName}` : 'Patient';
    const payment: any = {
      id: `pmt_${Date.now()}`, receiptNo, invoiceId: dbInvoice.id, invoiceNo: dbInvoice.fhirId || `INV-DB-${dbInvoice.id.slice(0, 8).toUpperCase()}`,
      patientId: dbInvoice.patientId, patientName,
      methods, totalPaid, cashierName, cashierId: resolvedCashierId,
      shiftId: targetShift?.id,
      notes, status: 'COMPLETED', createdAt: new Date().toISOString(),
    };
    payments.unshift(payment);
    syncShiftBalances();

    await logAudit({ userId: (req as any).user?.id, action: 'RECEIVE_PAYMENT', resourceType: 'Payment', resourceId: payment.id, changes: { receiptNo, totalPaid, invoiceId: dbInvoice.id } });
    return res.status(201).json({ success: true, data: payment, invoice: { ...payment, totalAmount: dbInvoice.total, amountPaid: newAmountPaid, outstanding: dbInvoice.total - newAmountPaid, status: newStatus } });

  } catch (err) {
    console.error('[Billing] Failed to process payment:', err);
    res.status(500).json({ success: false, message: 'Failed to process payment' });
  }
});

export async function ensurePaymentsInitialized() {
  if (payments.length > 0) return payments;
  // Synthesize realistic recent receipts from paid hospital invoices
  const allInvoices = await fetchAllInvoices();
  const seenInvKeys = new Set<string>();
  const paidInvs = allInvoices.filter(i => {
    if (!((i.amountPaid || 0) > 0 || i.status === 'PAID')) return false;
    const key = i.id || i.invoiceNo;
    if (seenInvKeys.has(key)) return false;
    seenInvKeys.add(key);
    return true;
  });

  const synthesized = paidInvs.map((inv, idx) => {
    const method = idx % 3 === 0 ? 'CASH' : idx % 3 === 1 ? 'DEBIT_CARD' : 'BANK_TRANSFER';
    
    // Dynamic Hospital Cashier & Terminal Attribution:
    // Till #01: Mary Okon (Senior Revenue Cashier - OPD, Pharmacy, General Consultation, Lab)
    // Till #02: Blessing Ugwu (Front Desk Cashier - Emergency, Inpatient, Surgical, Radiology)
    // Electronic Gateway: Online Gateway (Monnify) for direct bank transfers & web clearing
    let cashierName = 'Mary Okon';
    let cashierIdVal = 'cashier';

    const invNo = (inv.invoiceNo || inv.fhirId || '').toUpperCase();
    const reason = (inv.reasonText || '').toLowerCase();
    const isEmergencyOrIPD = invNo.startsWith('INV-ADM-') || invNo.startsWith('RAD-') || invNo.startsWith('SRG-') || reason.includes('admission') || reason.includes('theatre') || reason.includes('radiology') || reason.includes('x-ray') || reason.includes('ultrasound');

    if (method === 'BANK_TRANSFER' && idx % 2 === 0) {
      cashierName = 'Online Gateway (Monnify)';
      cashierIdVal = 'gateway';
    } else if (isEmergencyOrIPD || idx % 2 === 1) {
      cashierName = 'Blessing Ugwu';
      cashierIdVal = 'cashier01';
    } else {
      cashierName = 'Mary Okon';
      cashierIdVal = 'cashier';
    }

    return {
      id: `pmt_${inv.id || idx}`,
      receiptNo: `REC-${(inv.invoiceNo || '').replace(/[^0-9]/g, '') || String(20000 + idx)}`,
      invoiceId: inv.id,
      invoiceNo: inv.invoiceNo,
      patientId: inv.patientId,
      patientName: inv.patientName || 'Hospital Patient',
      patientNumber: inv.patientNumber,
      methods: [{ method, amount: inv.amountPaid || inv.totalAmount || 0 }],
      totalPaid: inv.amountPaid || inv.totalAmount || 0,
      cashierName,
      cashierId: cashierIdVal,
      createdAt: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : (inv.createdAt as string || new Date().toISOString()),
      status: 'CLEARED',
    };
  });
  
  const existingPaymentIds = new Set(payments.map(p => p.id));
  for (const s of synthesized) {
    if (!existingPaymentIds.has(s.id)) {
      payments.push(s);
      existingPaymentIds.add(s.id);
    }
  }
  return payments;
}

router.get('/payments', async (req: Request, res: Response) => {
  try {
    const { invoiceId, from, to, cashierId } = req.query;
    await ensurePaymentsInitialized();
    let data = [...payments];
    if (invoiceId) data = data.filter(p => p.invoiceId === invoiceId);
    if (cashierId) data = data.filter(p => p.cashierId === cashierId);
    if (from) data = data.filter(p => new Date(p.createdAt) >= new Date(from as string));
    if (to) data = data.filter(p => new Date(p.createdAt) <= new Date(to as string));
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

// ─── CASHIER SHIFTS (FR-CASH-001 to FR-CASH-005) ──────────────────────────
export function syncShiftBalances() {
  for (const shift of cashierShifts) {
    if (shift.status !== 'OPEN') continue;

    const shiftOpenTime = new Date(shift.openedAt).getTime();
    const isCustomUserShift = !shift.id.startsWith('shift_today_');

    // Payments belonging to this shift
    const matchingPayments = payments.filter((p: any) => {
      if (p.shiftId && p.shiftId === shift.id) return true;
      const pTime = new Date(p.createdAt).getTime();

      if (isCustomUserShift) {
        // Any payment created since this shift was opened or explicitly tagged
        return pTime >= shiftOpenTime - 60000;
      }

      // Base seeded shifts
      if (shift.id === 'shift_today_01') {
        const isEmergency = (p.invoiceNo || '').startsWith('INV-ADM-') || (p.invoiceNo || '').startsWith('RAD-');
        return !isEmergency;
      }
      if (shift.id === 'shift_today_02') {
        const isEmergency = (p.invoiceNo || '').startsWith('INV-ADM-') || (p.invoiceNo || '').startsWith('RAD-');
        return isEmergency;
      }
      return false;
    });

    const cashPayments = matchingPayments.filter((p: any) => p.methods?.some((m: any) => m.method === 'CASH'));
    const cashCollected = cashPayments.reduce((s: number, p: any) => s + (p.methods.find((m: any) => m.method === 'CASH')?.amount || 0), 0);

    const posPayments = matchingPayments.filter((p: any) => p.methods?.some((m: any) => m.method === 'DEBIT_CARD' || m.method === 'POS' || m.method === 'CARD'));
    const posCollected = posPayments.reduce((s: number, p: any) => s + (p.methods.find((m: any) => m.method === 'DEBIT_CARD' || m.method === 'POS' || m.method === 'CARD')?.amount || 0), 0);

    const transferPayments = matchingPayments.filter((p: any) => p.methods?.some((m: any) => m.method === 'BANK_TRANSFER' || m.method === 'TRANSFER'));
    const transferCollected = transferPayments.reduce((s: number, p: any) => s + (p.methods.find((m: any) => m.method === 'BANK_TRANSFER' || m.method === 'TRANSFER')?.amount || 0), 0);

    const cashRefunded = refunds
      .filter((r: any) => r.status === 'APPROVED' && r.refundMethod === 'CASH' && new Date(r.createdAt).getTime() >= shiftOpenTime - 60000)
      .reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

    shift.cashCollected = cashCollected;
    shift.posCollected = posCollected;
    shift.transferCollected = transferCollected;
    shift.totalInflow = cashCollected + posCollected + transferCollected;
    shift.expectedClosingBalance = Number(shift.openingBalance || 0) + cashCollected - cashRefunded;
    if (shift.actualClosingBalance != null) {
      shift.variance = Number(shift.actualClosingBalance) - shift.expectedClosingBalance;
    } else {
      shift.variance = 0;
    }
  }
}

export function ensureShiftsInitialized() {
  if (cashierShifts.length === 0) {
    const cashPayments = payments.filter(p => p.methods?.some((m: any) => m.method === 'CASH'));
    const cashTill = cashPayments.reduce((s, p) => s + (p.methods.find((m: any) => m.method === 'CASH')?.amount || 0), 0);
    const posPayments = payments.filter(p => p.methods?.some((m: any) => m.method === 'DEBIT_CARD' || m.method === 'POS'));
    const posTotal = posPayments.reduce((s, p) => s + (p.methods.find((m: any) => m.method === 'DEBIT_CARD' || m.method === 'POS')?.amount || 0), 0);
    const transferPayments = payments.filter(p => p.methods?.some((m: any) => m.method === 'BANK_TRANSFER' || m.method === 'TRANSFER'));
    const transferTotal = transferPayments.reduce((s, p) => s + (p.methods.find((m: any) => m.method === 'BANK_TRANSFER' || m.method === 'TRANSFER')?.amount || 0), 0);

    const till1Cash = Math.round(cashTill * 0.58);
    const till2Cash = cashTill - till1Cash;
    const till1Pos = Math.round(posTotal * 0.55);
    const till2Pos = posTotal - till1Pos;
    const till1Transfer = Math.round(transferTotal * 0.50);
    const till2Transfer = transferTotal - till1Transfer;

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const curYear = new Date().getFullYear();
    const curMonth = String(new Date().getMonth() + 1).padStart(2, '0');

    // Helper to format date string for current month
    const getDateStr = (day: number) => `${curYear}-${curMonth}-${String(day).padStart(2, '0')}`;
    const todayDay = new Date().getDate();

    cashierShifts.push(
      // Chinedu Okafor Active Shift from Yesterday (Clocked in 10:40 AM)
      {
        id: 'shift_today_chinedu_open',
        shiftNumber: 'SHF-2026-004',
        location: 'Main Outpatient Cash Desk #01',
        cashDrawer: 'Drawer A (Standard Clinical Desk)',
        cashierId: 'EMP-009',
        userId: 'c1fd506d-d642-45bd-84c5-796c5ee31e1b',
        cashierName: 'Chinedu Okafor (Chief Financial Officer)',
        shiftType: 'Standard Day Shift (07:00 – 15:00)',
        scheduledDate: yesterdayStr,
        startTime: '07:00',
        endTime: '15:00',
        openingBalance: 50000,
        expectedClosingBalance: 50000,
        actualClosingBalance: null,
        cashCollected: 0,
        posCollected: 0,
        transferCollected: 0,
        totalInflow: 0,
        variance: 0,
        openedAt: `${yesterdayStr}T10:40:00`,
        closedAt: null,
        status: 'OPEN',
        configuredBy: 'Workforce HR (Biometric Sync)',
        isReconciled: false,
      },
      // Mary Okon ON APPROVED LEAVE for Today (07:00 – 15:00) Relieved by Blessing Ugwu
      {
        id: 'shift_today_mary_leave',
        shiftNumber: 'SHF-2026-001',
        location: 'Main Outpatient Cash Desk #01',
        cashDrawer: 'Drawer A (Relieved by Blessing Ugwu)',
        cashierId: 'cashier',
        cashierName: 'Mary Okon (On Approved Annual Leave)',
        shiftType: 'ON_LEAVE',
        scheduledDate: todayStr,
        startTime: '07:00',
        endTime: '15:00',
        openingBalance: 0,
        expectedClosingBalance: 0,
        actualClosingBalance: 0,
        cashCollected: 0,
        posCollected: 0,
        transferCollected: 0,
        totalInflow: 0,
        variance: 0,
        openedAt: null,
        closedAt: null,
        status: 'ON_LEAVE',
        relievedBy: 'Blessing Ugwu (Senior Cashier & Shift Lead)',
        notes: 'Covered by relief officer Blessing Ugwu on approved annual leave (LEV-001)',
        configuredBy: 'Admin (Workforce HR)',
        isReconciled: true,
        isReliefCovered: true,
      },
      // Blessing Ugwu Morning Relief Shift for Mary Okon (07:00 – 15:00) - Scheduled & Ready to Start
      {
        id: 'shift_today_mary_relief_blessing',
        shiftNumber: 'SHF-2026-RELIEF-18',
        location: 'Main Outpatient Cash Desk #01',
        cashDrawer: 'Drawer A (Mary Okon - Relieved by Blessing Ugwu)',
        cashierId: 'cashier01',
        userId: 'staff_blessing',
        cashierName: 'Blessing Ugwu (Relief for Mary Okon)',
        staffRole: 'Front Desk Cashier',
        shiftType: 'CASHIER_MORNING_8H',
        scheduledDate: todayStr,
        startTime: '07:00',
        endTime: '15:00',
        openingBalance: 20000,
        expectedClosingBalance: 20000,
        actualClosingBalance: null,
        cashCollected: 0,
        posCollected: 0,
        transferCollected: 0,
        totalInflow: 0,
        variance: 0,
        openedAt: null,
        closedAt: null,
        status: 'SCHEDULED',
        configuredBy: 'Leave System Relief Auto-Reassignment (LEV-001)',
        isReconciled: false,
        isReliefShift: true,
        relievingFor: 'Mary Okon',
        relievingEmpId: 'EMP-006',
        leaveRequestId: 'LEV-001',
      },
      // Blessing Ugwu Afternoon Shift for Today (14:00 – 22:00) - Scheduled
      {
        id: 'shift_today_02',
        shiftNumber: 'SHF-2026-002',
        location: 'Emergency & IPD Cash Desk #02',
        cashDrawer: 'Drawer B (Blessing Ugwu)',
        cashierId: 'cashier01',
        userId: 'staff_blessing',
        cashierName: 'Blessing Ugwu (Front Desk Cashier)',
        staffRole: 'Front Desk Cashier',
        shiftType: 'CASHIER_AFTERNOON_8H',
        scheduledDate: todayStr,
        startTime: '14:00',
        endTime: '22:00',
        openingBalance: 15000,
        expectedClosingBalance: 15000,
        actualClosingBalance: null,
        cashCollected: 0,
        posCollected: 0,
        transferCollected: 0,
        totalInflow: 0,
        variance: 0,
        openedAt: null,
        closedAt: null,
        status: 'SCHEDULED',
        configuredBy: 'Admin (Workforce HR)',
        isReconciled: true,
      },
      // Ibrahim Danladi Scheduled Night Shift for Today
      {
        id: 'shift_sched_03',
        shiftNumber: 'SHF-2026-003',
        location: 'Emergency & IPD Cash Desk #02',
        cashDrawer: 'Drawer B',
        cashierId: 'cashier02',
        cashierName: 'Ibrahim Danladi (Emergency Cashier)',
        staffRole: 'Emergency Cashier',
        shiftType: 'CASHIER_NIGHT_12H',
        scheduledDate: todayStr,
        startTime: '20:00',
        endTime: '08:00',
        openingBalance: 15000,
        expectedClosingBalance: 15000,
        actualClosingBalance: null,
        cashCollected: 0,
        posCollected: 0,
        transferCollected: 0,
        totalInflow: 0,
        variance: 0,
        openedAt: null,
        closedAt: null,
        status: 'SCHEDULED',
        configuredBy: 'Admin (Workforce HR)',
        isReconciled: false,
      }
    );

    // Multi-Staff Calendar Roster Schedules for Current Month
    const rosterStaffData = [
      { name: 'Mary Okon', id: 'cashier', role: 'Senior Cashier', desk: 'Main Outpatient Cash Desk #01', drawer: 'Drawer A', type: 'CASHIER_MORNING_8H', start: '07:00', end: '15:00', float: 20000, days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30] },
      { name: 'Blessing Ugwu', id: 'cashier01', role: 'Front Desk Cashier', desk: 'Emergency & IPD Cash Desk #02', drawer: 'Drawer B', type: 'CASHIER_AFTERNOON_8H', start: '14:00', end: '22:00', float: 15000, days: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30] },
      { name: 'Ibrahim Danladi', id: 'cashier02', role: 'Emergency Cashier', desk: 'Emergency & IPD Cash Desk #02', drawer: 'Drawer B', type: 'CASHIER_NIGHT_12H', start: '20:00', end: '08:00', float: 15000, days: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29] },
      { name: 'Chidi Nwosu', id: 'EMP-003', role: 'Pharmacy Cashier / Dispensary', desk: 'Pharmacy Cash Desk #03', drawer: 'Drawer C', type: 'CASHIER_FULLDAY_12H', start: '08:00', end: '20:00', float: 25000, days: [6, 7, 13, 14, 20, 21, 27, 28] },
      { name: 'Dr. Emeka Okafor', id: 'EMP-001', role: 'Doctor Call Duty', desk: 'General Clinic / OPD', drawer: '—', type: 'DOCTOR_CALL_24H', start: '08:00', end: '08:00', float: 0, days: [2, 5, 9, 12, 16, 19, 23, 26, 30] },
      { name: 'Ngozi Adeyemi', id: 'EMP-002', role: 'Nurse Ward Duty', desk: 'ICU Ward', drawer: '—', type: 'NIGHT_SHIFT_12H', start: '20:00', end: '08:00', float: 0, days: [1, 3, 6, 8, 10, 13, 15, 17, 20, 22, 24, 27, 29] },
      { name: 'Aisha Bello', id: 'EMP-004', role: 'Lab / Diagnostic Desk', desk: 'Diagnostic & Lab Cash Desk #04', drawer: 'Drawer D', type: 'CASHIER_MORNING_8H', start: '08:00', end: '16:00', float: 10000, days: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26] }
    ];

    let shiftSeq = 10;
    for (const staff of rosterStaffData) {
      for (const d of staff.days) {
        if (d === todayDay && (staff.id === 'cashier' || staff.id === 'cashier01' || staff.id === 'cashier02')) continue;
        const sDate = getDateStr(d);
        const isPast = d < todayDay;
        const isMaryOnLeave = staff.id === 'cashier' && (d === 14 || d === 15 || d === 16 || d === 17);

        if (isMaryOnLeave) {
          // Mary Okon Leave Shift
          cashierShifts.push({
            id: `shift_cal_${staff.id}_${d}_leave`,
            shiftNumber: `SHF-${curYear}-${String(shiftSeq++).padStart(3, '0')}`,
            location: staff.desk,
            cashDrawer: 'Drawer A (Relieved by Blessing Ugwu)',
            cashierId: staff.id,
            cashierName: 'Mary Okon (On Approved Annual Leave)',
            staffRole: 'Senior Cashier',
            shiftType: 'ON_LEAVE',
            scheduledDate: sDate,
            startTime: staff.start,
            endTime: staff.end,
            openingBalance: 0,
            expectedClosingBalance: 0,
            actualClosingBalance: 0,
            cashCollected: 0,
            posCollected: 0,
            transferCollected: 0,
            totalInflow: 0,
            variance: 0,
            openedAt: null,
            closedAt: null,
            status: 'ON_LEAVE',
            relievedBy: 'Blessing Ugwu (Senior Cashier & Shift Lead)',
            isReliefCovered: true,
            configuredBy: 'Admin (Workforce HR)',
            isReconciled: true,
          });

          // Blessing Ugwu Relief Shift for that past leave day
          cashierShifts.push({
            id: `shift_relief_cashier01_${d}`,
            shiftNumber: `SHF-${curYear}-RELIEF-${String(d).padStart(2, '0')}`,
            location: staff.desk,
            cashDrawer: 'Drawer A (Mary Okon - Relieved by Blessing Ugwu)',
            cashierId: 'cashier01',
            userId: 'staff_blessing',
            cashierName: 'Blessing Ugwu (Relief for Mary Okon)',
            staffRole: 'Front Desk Cashier',
            shiftType: 'CASHIER_MORNING_8H',
            scheduledDate: sDate,
            startTime: staff.start,
            endTime: staff.end,
            openingBalance: staff.float,
            expectedClosingBalance: isPast ? staff.float + 125000 : staff.float,
            actualClosingBalance: isPast ? staff.float + 125000 : null,
            cashCollected: isPast ? 85000 : 0,
            posCollected: isPast ? 40000 : 0,
            transferCollected: 0,
            totalInflow: isPast ? 125000 : 0,
            variance: 0,
            openedAt: isPast ? `${sDate}T${staff.start}:00.000Z` : null,
            closedAt: isPast ? `${sDate}T${staff.end}:00.000Z` : null,
            status: isPast ? 'CLOSED' : 'SCHEDULED',
            configuredBy: 'Leave System Relief Auto-Reassignment (LEV-001)',
            isReconciled: isPast,
            isReliefShift: true,
            relievingFor: 'Mary Okon',
            relievingEmpId: 'EMP-006',
            leaveRequestId: 'LEV-001',
          });
        } else {
          cashierShifts.push({
            id: `shift_cal_${staff.id}_${d}`,
            shiftNumber: `SHF-${curYear}-${String(shiftSeq++).padStart(3, '0')}`,
            location: staff.desk,
            cashDrawer: staff.drawer,
            cashierId: staff.id,
            cashierName: `${staff.name} (${staff.role})`,
            staffRole: staff.role,
            shiftType: staff.type,
            scheduledDate: sDate,
            startTime: staff.start,
            endTime: staff.end,
            openingBalance: staff.float,
            expectedClosingBalance: isPast ? staff.float + 125000 : staff.float,
            actualClosingBalance: isPast ? staff.float + 125000 : null,
            cashCollected: isPast ? 85000 : 0,
            posCollected: isPast ? 40000 : 0,
            transferCollected: 0,
            totalInflow: isPast ? 125000 : 0,
            variance: 0,
            openedAt: isPast ? `${sDate}T${staff.start}:00.000Z` : null,
            closedAt: isPast ? `${sDate}T${staff.end}:00.000Z` : null,
            status: isPast ? 'CLOSED' : 'SCHEDULED',
            configuredBy: 'Admin (Workforce HR)',
            isReconciled: isPast,
          });
        }
      }
    }
  }
  syncShiftBalances();
  return cashierShifts;
}

router.get('/cashiers-lookup', async (_req: Request, res: Response) => {
  try {
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true, 
        department: true, 
        designation: true, 
        userId: true,
        user: { select: { role: true, username: true } }
      }
    });

    // Filter to only staff members with Cashier, Revenue, Billing, Finance, Accounts, Reception, or HMO roles
    const cashierStaff = staff.filter(s => {
      const dept = (s.department || '').toLowerCase();
      const desig = (s.designation || '').toLowerCase();
      const role = (s.user?.role || '').toUpperCase();
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();

      // Exclude purely clinical / surgical / nursing / lab / doctor roles
      const isClinicalDoctorOrNurse = 
        (desig.includes('consultant') && !desig.includes('revenue') && !desig.includes('billing')) ||
        desig.includes('surgeon') ||
        desig.includes('physician') ||
        desig.includes('medical officer') ||
        desig.includes('nurse') ||
        desig.includes('matron') ||
        desig.includes('radiographer') ||
        desig.includes('pharmacist') ||
        desig.includes('laboratory scientist') ||
        desig.includes('physiotherapist') ||
        desig.includes('mortician') ||
        desig.includes('obstetrician') ||
        desig.includes('gynaecologist');

      if (isClinicalDoctorOrNurse && !name.includes('mary') && !name.includes('blessing') && !name.includes('ibrahim')) {
        return false;
      }

      const isCashierKeyword = 
        desig.includes('cashier') ||
        desig.includes('revenue') ||
        desig.includes('billing') ||
        desig.includes('account') ||
        desig.includes('finance') ||
        desig.includes('cfo') ||
        desig.includes('bursar') ||
        desig.includes('claims') ||
        desig.includes('hmo') ||
        desig.includes('reception') ||
        desig.includes('front desk');

      const isDeptKeyword = 
        dept.includes('billing') ||
        dept.includes('revenue') ||
        dept.includes('finance') ||
        dept.includes('account') ||
        dept.includes('front desk') ||
        dept.includes('bursary') ||
        dept.includes('hmo') ||
        dept.includes('insurance');

      const isRoleMatch = role === 'RECEPTIONIST' || (role === 'STAFF' && (isCashierKeyword || isDeptKeyword));

      const isExplicitCashier = 
        name.includes('mary okon') || 
        name.includes('blessing ugwu') || 
        name.includes('ibrahim danladi') || 
        name.includes('david adeleke') ||
        name.includes('chinedu okafor') ||
        name.includes('tunde bakare') ||
        name.includes('ngozi eze');

      return isCashierKeyword || isDeptKeyword || isRoleMatch || isExplicitCashier;
    });

    const cashiers: any[] = cashierStaff.map(s => ({
      id: s.userId || s.id,
      staffId: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      department: s.department || 'Billing & Finance',
      designation: s.designation || 'Cashier / Revenue Officer'
    }));

    if (!cashiers.some(c => c.name.toLowerCase().includes('mary okon'))) {
      cashiers.unshift({ id: 'cashier', staffId: 'staff_mary', name: 'Mary Okon', department: 'Billing & Finance', designation: 'Senior Revenue Cashier' });
    }
    if (!cashiers.some(c => c.name.toLowerCase().includes('blessing ugwu'))) {
      cashiers.push({ id: 'cashier01', staffId: 'staff_blessing', name: 'Blessing Ugwu', department: 'Billing & Finance', designation: 'Front Desk Cashier' });
    }
    if (!cashiers.some(c => c.name.toLowerCase().includes('ibrahim danladi'))) {
      cashiers.push({ id: 'cashier02', staffId: 'staff_ibrahim', name: 'Ibrahim Danladi', department: 'Emergency & IPD Billing', designation: 'Cashier Officer' });
    }

    // Sort so Mary Okon (Senior Revenue Cashier) and Front Desk cashiers appear first
    cashiers.sort((a, b) => {
      if (a.name.toLowerCase().includes('mary okon')) return -1;
      if (b.name.toLowerCase().includes('mary okon')) return 1;
      if (a.name.toLowerCase().includes('blessing ugwu')) return -1;
      if (b.name.toLowerCase().includes('blessing ugwu')) return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, data: cashiers });
  } catch (err) {
    res.json({
      success: true,
      data: [
        { id: 'cashier', name: 'Mary Okon', department: 'Billing & Finance', designation: 'Senior Revenue Cashier' },
        { id: 'cashier01', name: 'Blessing Ugwu', department: 'Billing & Finance', designation: 'Front Desk Cashier' },
        { id: 'cashier02', name: 'Ibrahim Danladi', department: 'Emergency & IPD Billing', designation: 'Cashier Officer' },
        { id: 'cashier03', name: 'David Adeleke', department: 'Billing & Finance', designation: 'Senior Accountant & Auditor' },
        { id: 'cashier04', name: 'Chinedu Okafor', department: 'Billing & Finance', designation: 'Chief Financial Officer (CFO)' },
      ]
    });
  }
});

export const cashierShiftTemplates: any[] = [
  { code: 'MORNING_8H', name: 'Morning Shift (7am–3pm)', startTime: '07:00', endTime: '15:00', description: 'Main morning OPD and outpatient revenue collection', color: '#2563eb' },
  { code: 'AFTERNOON_8H', name: 'Afternoon Shift (2pm–10pm)', startTime: '14:00', endTime: '22:00', description: 'Afternoon clinic, pharmacy & discharge billing', color: '#d97706' },
  { code: 'NIGHT_12H', name: 'Overnight Shift (10pm–8am)', startTime: '22:00', endTime: '08:00', description: 'Emergency & IPD 24/7 night coverage', color: '#7c3aed' },
  { code: 'DAY_12H', name: '12-Hour Day (7am–7pm)', startTime: '07:00', endTime: '19:00', description: 'Extended full-day weekend / holiday duty', color: '#059669' },
  { code: 'NIGHT_12H_ALT', name: '12-Hour Night (7pm–7am)', startTime: '19:00', endTime: '07:00', description: 'Extended overnight inpatient duty', color: '#dc2626' },
  { code: 'ON_CALL', name: 'Standby / Call Duty (24h)', startTime: '08:00', endTime: '08:00', description: 'On-call emergency revenue support', color: '#0891b2' },
];

// Get Shift Templates for Cashiers
router.get('/cashier/shift-templates', (req: Request, res: Response) => {
  res.json({ success: true, data: cashierShiftTemplates });
});

// Add / Update Shift Template
router.post('/cashier/shift-templates', (req: Request, res: Response) => {
  const { code, name, startTime, endTime, description, color } = req.body;
  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Shift code and name are required' });
  }
  const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');
  const existingIndex = cashierShiftTemplates.findIndex(t => t.code === cleanCode);
  const newTemplate = {
    code: cleanCode,
    name: name.trim(),
    startTime: startTime || '07:00',
    endTime: endTime || '15:00',
    description: description || '',
    color: color || '#2563eb',
  };

  if (existingIndex >= 0) {
    cashierShiftTemplates[existingIndex] = newTemplate;
  } else {
    cashierShiftTemplates.push(newTemplate);
  }

  res.status(201).json({ success: true, message: 'Shift template saved successfully', data: newTemplate });
});

// Delete Shift Template
router.delete('/cashier/shift-templates/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const idx = cashierShiftTemplates.findIndex(t => t.code === code);
  if (idx >= 0) {
    cashierShiftTemplates.splice(idx, 1);
    return res.json({ success: true, message: 'Shift template deleted' });
  }
  res.status(404).json({ success: false, message: 'Shift template not found' });
});

// Admin / Senior Cashier schedule & assign shift for cashier (single or date range)
router.post('/cashier/shift/schedule', async (req: Request, res: Response) => {
  try {
    ensureShiftsInitialized();
    const { cashierId, cashierName, location, cashDrawer, shiftType, scheduledDate, startDate, endDate, startTime, endTime, openingBalance, isPrimary } = req.body;
    
    const assignedCashierId = cashierId || 'cashier';
    const assignedCashierName = cashierName || 'Hospital Cashier';
    const assignedDrawer = cashDrawer || 'Drawer-01';
    const configuredBy = (req as any).user?.name || (req as any).user?.firstName ? `${(req as any).user.firstName} ${(req as any).user.lastName || ''}`.trim() : ((req as any).user?.username || 'Senior Cashier (Mary Okon)');
    const opBal = Number(openingBalance) || 20000;
    const sDate = startDate || scheduledDate || new Date().toISOString().slice(0, 10);
    const eDate = endDate || sDate;

    // Find shift template info
    const template = cashierShiftTemplates.find(t => t.code === shiftType) || {
      startTime: startTime || '07:00',
      endTime: endTime || '15:00',
      name: shiftType,
    };

    const scheduledShift = {
      id: `shift_sched_${Date.now()}`,
      userId: assignedCashierId,
      shiftNumber: `SHF-${new Date().getFullYear()}-${String(cashierShifts.length + 1).padStart(3, '0')}`,
      location: location || 'Main Outpatient Cash Desk #01',
      cashDrawer: assignedDrawer,
      cashierId: assignedCashierId,
      cashierName: assignedCashierName,
      shiftType: shiftType || 'MORNING_8H',
      shiftName: template.name || shiftType,
      scheduledDate: sDate,
      startDate: sDate,
      endDate: eDate,
      startTime: startTime || template.startTime || '07:00',
      endTime: endTime || template.endTime || '15:00',
      openingBalance: opBal,
      expectedClosingBalance: opBal,
      actualClosingBalance: null,
      cashCollected: 0,
      posCollected: 0,
      transferCollected: 0,
      totalInflow: 0,
      variance: 0,
      status: 'SCHEDULED',
      openedAt: null,
      closedAt: null,
      isPrimary: Boolean(isPrimary),
      roleStatus: isPrimary ? 'Head Cashier / Lead' : 'Staff Cashier',
      transactions: [],
      configuredBy,
      isReconciled: false,
    };

    cashierShifts.unshift(scheduledShift);
    await logAudit({
      userId: (req as any).user?.id,
      action: 'ADMIN_SCHEDULE_CASHIER_SHIFT',
      resourceType: 'CashierShift',
      resourceId: scheduledShift.id,
      changes: { cashierName: assignedCashierName, location, shiftType, configuredBy, startDate: sDate, endDate: eDate }
    });

    res.status(201).json({ success: true, message: 'Cashier shift scheduled and assigned to roster successfully.', data: scheduledShift });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to schedule cashier shift' });
  }
});

// Start/Clock-In to an Admin configured or scheduled shift
router.post('/cashier/shift/:id/start', async (req: Request, res: Response) => {
  try {
    ensureShiftsInitialized();
    const shift = cashierShifts.find(s => s.id === req.params.id || s.shiftNumber === req.params.id);
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    if (shift.status === 'OPEN') return res.status(400).json({ success: false, message: 'Shift is already active.' });
    const todayStr = new Date().toISOString().slice(0, 10);
    if (shift.scheduledDate && shift.scheduledDate > todayStr) {
      return res.status(400).json({ 
        success: false, 
        message: `Shift is locked. You cannot start a shift scheduled for futuristic date (${shift.scheduledDate}). Clock-in is only allowed on the scheduled date.` 
      });
    }
    if (shift.scheduledDate && shift.scheduledDate < todayStr) {
      return res.status(400).json({ 
        success: false, 
        message: `This shift was scheduled for a past date (${shift.scheduledDate}) and has expired.` 
      });
    }

    // Check if drawer or cashier already has another OPEN shift
    const existing = cashierShifts.find(s => 
      s.id !== shift.id && s.status === 'OPEN' && (s.cashierId === shift.cashierId || s.cashDrawer === shift.cashDrawer)
    );
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: `An active open shift already exists for this cashier or drawer (${existing.cashDrawer}). Please close it before starting a new shift.` 
      });
    }

    const { openingBalance, notes } = req.body;
    if (openingBalance !== undefined && openingBalance !== null && openingBalance !== '') {
      shift.openingBalance = Number(openingBalance) || 0;
      shift.expectedClosingBalance = shift.openingBalance;
    }
    if (notes) {
      shift.notes = notes;
    }

    shift.status = 'OPEN';
    shift.openedAt = new Date().toISOString();
    syncShiftBalances();

    // Automatically sync clock-in to Hospital Staff Attendance Register (HR)
    try {
      recordShiftClockInAttendance(shift.cashierName, shift.cashierId, shift.shiftWindow);
    } catch (e) {
      console.error('Failed to sync cashier attendance log:', e);
    }

    await logAudit({
      userId: (req as any).user?.id,
      action: 'START_CASHIER_SHIFT',
      resourceType: 'CashierShift',
      resourceId: shift.id,
      changes: { status: 'OPEN', openedAt: shift.openedAt, openingBalance: shift.openingBalance, notes: shift.notes }
    });

    res.json({ success: true, message: `Shift started and locked to ${shift.cashierName} with opening float ₦${(shift.openingBalance || 0).toLocaleString()}.`, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to start shift' });
  }
});

// Cancel/Delete a scheduled shift
router.delete('/cashier/shift/:id', async (req: Request, res: Response) => {
  try {
    ensureShiftsInitialized();
    const idx = cashierShifts.findIndex(s => s.id === req.params.id || s.shiftNumber === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Shift not found' });
    const shift = cashierShifts[idx];
    if (shift.status === 'OPEN' && (shift.cashCollected > 0 || shift.posCollected > 0 || shift.transferCollected > 0)) {
      return res.status(400).json({ success: false, message: 'Cannot delete an active shift with recorded revenue transactions. Please close it instead.' });
    }
    cashierShifts.splice(idx, 1);
    res.json({ success: true, message: 'Shift removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete shift' });
  }
});

router.post('/cashier/shift/open', async (req: Request, res: Response) => {
  try {
    ensureShiftsInitialized();
    const { openingBalance, location, cashDrawer, cashierId, cashierName, shiftType } = req.body;
    
    // Resolve cashier identity
    const assignedCashierId = cashierId || (req as any).user?.id || 'cashier';
    const assignedCashierName = cashierName || (req as any).user?.name || (req as any).user?.username || 'Hospital Cashier';
    const assignedDrawer = cashDrawer || 'Drawer-01';

    // If there's an existing SCHEDULED shift for this cashier today, start it
    const scheduledShift = cashierShifts.find(s => 
      s.status === 'SCHEDULED' && (s.cashierId === assignedCashierId || s.cashierName === assignedCashierName)
    );
    if (scheduledShift) {
      scheduledShift.status = 'OPEN';
      scheduledShift.openedAt = new Date().toISOString();
      scheduledShift.location = location || scheduledShift.location;
      scheduledShift.cashDrawer = assignedDrawer || scheduledShift.cashDrawer;
      if (openingBalance !== undefined) {
        scheduledShift.openingBalance = Number(openingBalance) || 0;
        scheduledShift.expectedClosingBalance = scheduledShift.openingBalance;
      }
      syncShiftBalances();
      return res.status(200).json({ success: true, message: 'Admin-configured scheduled shift activated.', data: scheduledShift });
    }

    // Verify if THIS specific cashier or THIS drawer already has an active open shift
    const existing = cashierShifts.find(s => 
      s.status === 'OPEN' && (s.cashierId === assignedCashierId || s.cashDrawer === assignedDrawer)
    );
    if (existing) {
      const matchType = existing.cashDrawer === assignedDrawer ? `drawer (${assignedDrawer})` : `cashier (${existing.cashierName || assignedCashierName})`;
      return res.status(400).json({ 
        success: false, 
        message: `An open shift already exists for this ${matchType}. Please close or hand over the active shift first, or choose a different cashier/drawer.` 
      });
    }

    const opBal = Number(openingBalance) || 0;
    const shift = {
      id: `shift_${Date.now()}`,
      userId: assignedCashierId,
      shiftNumber: `SHF-${new Date().getFullYear()}-${String(cashierShifts.length + 1).padStart(3, '0')}`,
      location: location || 'Main Cashier',
      cashDrawer: assignedDrawer,
      cashierId: assignedCashierId,
      cashierName: assignedCashierName,
      shiftType: shiftType || 'CASHIER_CUSTOM_SHIFT',
      openingBalance: opBal,
      expectedClosingBalance: opBal,
      actualClosingBalance: null,
      cashCollected: 0,
      posCollected: 0,
      transferCollected: 0,
      totalInflow: 0,
      variance: 0,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      closedAt: null,
      transactions: [],
      configuredBy: (req as any).user?.role === 'Admin' ? 'Admin (Hospital Management)' : 'Self-Opened (Cashier)',
      isReconciled: false,
    };
    cashierShifts.unshift(shift);
    syncShiftBalances();
    res.status(201).json({ success: true, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to open shift' });
  }
});

router.post('/cashier/shift/:id/reassign', async (req: Request, res: Response) => {
  try {
    ensureShiftsInitialized();
    syncShiftBalances();
    const shift = cashierShifts.find(s => 
      s.id === req.params.id || 
      s.shiftNumber === req.params.id || 
      s.id.endsWith(req.params.id) ||
      req.params.id.includes(s.id)
    );
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    if (shift.status !== 'OPEN') return res.status(400).json({ success: false, message: 'Only open shifts can be reassigned.' });

    const { newCashierId, newCashierName, handoverNotes } = req.body;
    if (!newCashierId && !newCashierName) {
      return res.status(400).json({ success: false, message: 'Please select a covering cashier.' });
    }

    const prevCashier = shift.cashierName;
    shift.previousCashierName = prevCashier;
    shift.cashierId = newCashierId || shift.cashierId;
    shift.cashierName = newCashierName || shift.cashierName;
    shift.userId = newCashierId || shift.userId;
    shift.reassignmentNotes = handoverNotes || `Shift cover delegated to ${shift.cashierName} by ${prevCashier}`;
    shift.lastReassignedAt = new Date().toISOString();

    await logAudit({
      userId: (req as any).user?.id,
      action: 'REASSIGN_CASHIER_SHIFT',
      resourceType: 'CashierShift',
      resourceId: shift.id,
      changes: { previousCashier: prevCashier, newCashier: shift.cashierName, notes: shift.reassignmentNotes }
    });

    res.json({ success: true, message: `Shift successfully assigned to ${shift.cashierName} for cover.`, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reassign shift' });
  }
});

router.post('/cashier/shift/:id/close', async (req: Request, res: Response) => {
  try {
    ensureShiftsInitialized();
    syncShiftBalances();
    const shift = cashierShifts.find(s => 
      s.id === req.params.id || 
      s.shiftNumber === req.params.id || 
      s.id.endsWith(req.params.id) ||
      s.id.includes(req.params.id) ||
      req.params.id.includes(s.id)
    );
    if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
    const { actualClosingBalance, supervisorNotes } = req.body;
    
    // Calculate expected & variance
    const actBal = Number(actualClosingBalance ?? shift.expectedClosingBalance ?? 0);
    shift.actualClosingBalance = actBal;
    shift.variance = actBal - (shift.expectedClosingBalance || 0);
    shift.supervisorNotes = supervisorNotes || 'Handed over till successfully';
    shift.status = 'CLOSED';
    shift.closedAt = new Date().toISOString();
    shift.isReconciled = true;
    
    // Automatically record clock-out in Hospital Staff Attendance Register (HR)
    try {
      recordShiftClockOutAttendance(shift.cashierName, shift.cashierId);
    } catch (e) {
      console.error('Failed to sync cashier attendance clock-out:', e);
    }

    await logAudit({ userId: (req as any).user?.id, action: 'CLOSE_CASHIER_SHIFT', resourceType: 'CashierShift', resourceId: shift.id, changes: { variance: shift.variance } });
    res.json({ success: true, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to close shift' });
  }
});

router.get('/cashier/shifts', async (req: Request, res: Response) => {
  try {
    await ensurePaymentsInitialized();
    ensureShiftsInitialized();
    syncShiftBalances();
    res.json({ success: true, data: cashierShifts, total: cashierShifts.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch shifts' });
  }
});

router.get('/cashier/shifts/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { code: 'CASHIER_MORNING_8H', name: 'Cashier Morning Till (7am–3pm)', startTime: '07:00', endTime: '15:00', description: 'Main OPD cashier till & payment collections', color: '#2563eb' },
      { code: 'CASHIER_AFTERNOON_8H', name: 'Cashier Afternoon Till (2pm–10pm)', startTime: '14:00', endTime: '22:00', description: 'Afternoon clinic, pharmacy & discharge billing', color: '#d97706' },
      { code: 'CASHIER_NIGHT_12H', name: 'Cashier Night Till (8pm–8am)', startTime: '20:00', endTime: '08:00', description: 'Emergency & IPD 24/7 revenue collection', color: '#7c3aed' },
      { code: 'CASHIER_FULLDAY_12H', name: 'Weekend Cashier Full Day (8am–8pm)', startTime: '08:00', endTime: '20:00', description: 'Weekend full day billing & till reconciliation', color: '#0d9488' },
      { code: 'DOCTOR_CALL_24H', name: 'Doctor 24-Hour Call Duty (8am–8am)', startTime: '08:00', endTime: '08:00', description: '24H On-Call Doctor', color: '#dc2626' },
      { code: 'NIGHT_SHIFT_12H', name: 'Nurse Night Shift (8pm–8am)', startTime: '20:00', endTime: '08:00', description: '12H Inpatient Nurse', color: '#8b5cf6' },
    ]
  });
});

// ─── REFUNDS (FR-CASH-021 to FR-CASH-025) ────────────────────────────────
router.post('/refunds', async (req: Request, res: Response) => {
  try {
    const { paymentId, amount, reason, refundMethod } = req.body;
    await ensurePaymentsInitialized();
    const payment = payments.find(p => p.id === paymentId || p.receiptNo === paymentId || p.invoiceId === paymentId || p.invoiceNo === paymentId);
    if (!payment) return res.status(404).json({ success: false, message: 'Original payment not found' });
    const paymentTotal = payment.totalPaid || payment.amount || 0;
    if (amount > paymentTotal) return res.status(400).json({ success: false, message: 'Refund cannot exceed original payment' });
    
    let patientId = payment.patientId;
    let patientName = payment.patientName;

    // Resolve patient from invoice if missing
    if (!patientId && payment.invoiceId) {
      const inv = await prisma.invoice.findFirst({
        where: { OR: [{ id: payment.invoiceId }, { fhirId: payment.invoiceNo }] },
        include: { patient: true }
      });
      if (inv?.patientId) {
        patientId = inv.patientId;
        if (inv.patient) {
          patientName = `${inv.patient.firstName} ${inv.patient.lastName}`;
        }
      }
    }

    // Resolve patient by name from Prisma if needed
    if (!patientId && patientName && patientName !== 'Hospital Patient' && patientName !== 'Patient') {
      const nameParts = patientName.trim().split(/\s+/);
      const orConditions: any[] = [
        { firstName: { contains: patientName, mode: 'insensitive' } },
        { lastName: { contains: patientName, mode: 'insensitive' } }
      ];
      if (nameParts.length > 1) {
        orConditions.push({
          AND: [
            { firstName: { contains: nameParts[0], mode: 'insensitive' } },
            { lastName: { contains: nameParts[nameParts.length - 1], mode: 'insensitive' } }
          ]
        });
      }
      const pat = await prisma.patient.findFirst({
        where: { OR: orConditions }
      });
      if (pat) {
        patientId = pat.id;
        patientName = `${pat.firstName} ${pat.lastName}`;
      }
    }

    const isWalletMethod = refundMethod === 'E_WALLET' || refundMethod === 'WALLET' || refundMethod === 'HOSPITAL_WALLET';
    let walletCredited = false;
    let updatedWalletBalance: number | null = null;

    if (isWalletMethod && patientId) {
      try {
        const updatedPat = await prisma.patient.update({
          where: { id: patientId },
          data: { walletBalance: { increment: Number(amount) } },
          select: { id: true, firstName: true, lastName: true, walletBalance: true }
        });
        walletCredited = true;
        updatedWalletBalance = Number(updatedPat.walletBalance);
        console.log(`[Billing] Automatically credited ₦${Number(amount).toLocaleString()} to patient ${patientName} (${patientId}) wallet. New Balance: ₦${updatedWalletBalance.toLocaleString()}`);

        await logAudit({
          userId: (req as any).user?.id,
          action: 'FUND_PATIENT_WALLET',
          resourceType: 'PatientWallet',
          resourceId: patientId,
          changes: {
            amount: Number(amount),
            method: 'HOSPITAL_REFUND',
            reference: payment.receiptNo || `REF-${Date.now()}`,
            reason: reason || 'Refund Reversal to Hospital Wallet',
            newBalance: updatedWalletBalance
          }
        });
      } catch (walletErr) {
        console.error('[Billing] Failed to credit wallet on refund:', walletErr);
      }
    }

    const refund = {
      id: `ref_${Date.now()}`,
      paymentId: payment.id,
      receiptNo: payment.receiptNo,
      invoiceId: payment.invoiceId,
      invoiceNo: payment.invoiceNo,
      patientId: patientId || payment.patientId,
      patientName: patientName || payment.patientName || 'Hospital Patient',
      amount: Number(amount),
      reason,
      refundMethod: refundMethod || (payment.methods?.[0]?.method || 'CASH'),
      status: isWalletMethod ? 'APPROVED' : 'PENDING_APPROVAL',
      walletCredited,
      requestedBy: (req as any).user?.id || 'cashier',
      requestedAt: new Date().toISOString(),
      ...(isWalletMethod ? { approvedBy: (req as any).user?.id || 'cashier', approvedAt: new Date().toISOString() } : {})
    };
    refunds.unshift(refund);

    // If wallet refund is auto-credited & approved, update invoice amounts immediately
    if (isWalletMethod) {
      const invoice = invoices.find(i => i.id === refund.invoiceId || i.invoiceNo === refund.invoiceNo);
      if (invoice) {
        invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - refund.amount);
        if (invoice.amountPaid === 0 && (invoice.totalAmount || 0) > 0) invoice.status = 'REFUNDED';
        else invoice.status = 'PARTIALLY_REFUNDED';
      }
      try {
        const dbInv = await prisma.invoice.findFirst({
          where: {
            OR: [
              { id: refund.invoiceId },
              { fhirId: refund.invoiceNo },
              ...(refund.receiptNo ? [{ fhirId: { contains: refund.receiptNo.replace(/[^0-9]/g, '') } }] : [])
            ]
          }
        });
        if (dbInv) {
          const newPaid = Math.max(0, Number(dbInv.amountPaid || 0) - Number(refund.amount));
          await prisma.invoice.update({
            where: { id: dbInv.id },
            data: {
              amountPaid: newPaid,
              status: newPaid === 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
            }
          });
        }
      } catch (dbErr) {
        console.error('[Billing] DB Invoice update on auto-approved refund error:', dbErr);
      }
    }

    await logAudit({ userId: (req as any).user?.id, action: 'REQUEST_REFUND', resourceType: 'Refund', resourceId: refund.id, changes: { amount, reason, refundMethod, walletCredited } });
    res.status(201).json({ success: true, data: refund, walletCredited, newWalletBalance: updatedWalletBalance });
  } catch (err: any) {
    console.error('Failed to request refund:', err);
    res.status(500).json({ success: false, message: err?.message || 'Failed to request refund' });
  }
});

router.patch('/refunds/:id/approve', async (req: Request, res: Response) => {
  try {
    const refund = refunds.find(r => r.id === req.params.id);
    if (!refund) return res.status(404).json({ success: false, message: 'Refund not found' });
    refund.status = 'APPROVED';
    refund.approvedBy = (req as any).user?.id || 'supervisor';
    refund.approvedAt = new Date().toISOString();
    
    // Credit wallet if E_WALLET and not already credited
    const isWalletMethod = refund.refundMethod === 'E_WALLET' || refund.refundMethod === 'WALLET' || refund.refundMethod === 'HOSPITAL_WALLET';
    if (isWalletMethod && !refund.walletCredited && refund.patientId) {
      try {
        const updatedPat = await prisma.patient.update({
          where: { id: refund.patientId },
          data: { walletBalance: { increment: Number(refund.amount) } },
          select: { id: true, walletBalance: true }
        });
        refund.walletCredited = true;
        console.log(`[Billing] Credited ₦${Number(refund.amount).toLocaleString()} to patient (${refund.patientId}) wallet upon approval. New Balance: ₦${Number(updatedPat.walletBalance).toLocaleString()}`);
        
        await logAudit({
          userId: (req as any).user?.id,
          action: 'FUND_PATIENT_WALLET',
          resourceType: 'PatientWallet',
          resourceId: refund.patientId,
          changes: {
            amount: Number(refund.amount),
            method: 'HOSPITAL_REFUND',
            reference: refund.receiptNo || refund.id,
            newBalance: Number(updatedPat.walletBalance)
          }
        });
      } catch (err) {
        console.error('[Billing] Failed to credit patient wallet on refund approval:', err);
      }
    }

    // Update invoice in-memory
    const invoice = invoices.find(i => i.id === refund.invoiceId || i.invoiceNo === refund.invoiceNo);
    if (invoice) {
      invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - refund.amount);
      if (invoice.amountPaid === 0 && (invoice.totalAmount || 0) > 0) invoice.status = 'REFUNDED';
      else invoice.status = 'PARTIALLY_REFUNDED';
    }

    // Update Prisma database invoice if present
    try {
      const dbInv = await prisma.invoice.findFirst({
        where: {
          OR: [
            { id: refund.invoiceId },
            { fhirId: refund.invoiceNo },
            ...(refund.receiptNo ? [{ fhirId: { contains: refund.receiptNo.replace(/[^0-9]/g, '') } }] : [])
          ]
        }
      });
      if (dbInv) {
        const newPaid = Math.max(0, Number(dbInv.amountPaid || 0) - Number(refund.amount));
        await prisma.invoice.update({
          where: { id: dbInv.id },
          data: {
            amountPaid: newPaid,
            status: newPaid === 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
          }
        });
      }
    } catch (dbErr) {
      console.error('[Billing] DB Invoice update on refund error:', dbErr);
    }

    await logAudit({ userId: (req as any).user?.id, action: 'APPROVE_REFUND', resourceType: 'Refund', resourceId: refund.id });
    res.json({ success: true, data: refund });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve refund' });
  }
});

router.get('/refunds', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: refunds, total: refunds.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch refunds' });
  }
});

// ─── PAYER CONTRACTS (FR-CLM-001 to FR-CLM-005) ───────────────────────────
router.get('/payers', async (req: Request, res: Response) => {
  try {
    const list = await getMergedPayers();
    res.json({ success: true, data: list, total: list.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payers' });
  }
});

router.post('/payers', async (req: Request, res: Response) => {
  try {
    const { name, type, contactEmail, creditLimit, code } = req.body;
    const generatedCode = code || (name ? name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() : `PAY-${Date.now()}`);
    
    let dbProvider: any = null;
    try {
      dbProvider = await prisma.insuranceProvider.upsert({
        where: { code: generatedCode },
        update: { name, contactDetails: contactEmail },
        create: { name, code: generatedCode, contactDetails: contactEmail, isActive: true }
      });
    } catch { /* fallback to custom memory */ }

    const payer = {
      id: dbProvider?.id || `PAY${Date.now()}`,
      name,
      code: generatedCode,
      type: type || 'HMO',
      contactEmail: contactEmail || 'enquiries@provider.com',
      creditLimit: Number(creditLimit) || 2000000,
      outstandingBalance: 0,
      status: 'ACTIVE',
      contractStart: req.body.contractStart || '2026-01-01',
      contractEnd: req.body.contractEnd || '2026-12-31',
    };
    customPayers.push(payer);
    res.status(201).json({ success: true, data: payer });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create payer' });
  }
});

// ─── CLAIMS (FR-CLM-011 to FR-CLM-025) ───────────────────────────────────
router.get('/claims', async (req: Request, res: Response) => {
  try {
    const { status, payerId } = req.query;
    let data = [...claims];
    if (status) data = data.filter(c => c.status === status);
    if (payerId) data = data.filter(c => c.payerId === payerId);
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch claims' });
  }
});

router.post('/claims', async (req: Request, res: Response) => {
  try {
    const { invoiceId, payerId, claimType, notes } = req.body;
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const allPayers = await getMergedPayers();
    const payer = allPayers.find(p => p.id === payerId);
    
    const claimNo = `CLM-${new Date().getFullYear()}-${String(++claimSeq).padStart(5, '0')}`;
    const claim = {
      id: `clm_${Date.now()}`,
      claimNo,
      invoiceId,
      invoiceNo: invoice.invoiceNo,
      patientId: invoice.patientId,
      patientName: invoice.patientName,
      payerId,
      payerName: payer?.name || 'Unknown Payer',
      claimType: claimType || 'STANDARD',
      claimedAmount: invoice.totalAmount,
      approvedAmount: null,
      paidAmount: null,
      status: 'SUBMITTED',
      notes,
      submittedBy: (req as any).user?.id,
      submittedAt: new Date().toISOString(),
      adjudicatedAt: null,
    };
    claims.unshift(claim);
    await logAudit({ userId: (req as any).user?.id, action: 'SUBMIT_CLAIM', resourceType: 'Claim', resourceId: claim.id, changes: { claimNo, claimedAmount: claim.claimedAmount } });
    res.status(201).json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit claim' });
  }
});

router.patch('/claims/:id/adjudicate', async (req: Request, res: Response) => {
  try {
    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    const { decision, approvedAmount, denialReason } = req.body;
    claim.status = decision; // APPROVED, PARTIAL, DENIED
    claim.approvedAmount = approvedAmount;
    claim.denialReason = denialReason;
    claim.adjudicatedAt = new Date().toISOString();
    claim.adjudicatedBy = (req as any).user?.id;
    await logAudit({ userId: (req as any).user?.id, action: 'ADJUDICATE_CLAIM', resourceType: 'Claim', resourceId: claim.id, changes: { decision, approvedAmount } });
    res.json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to adjudicate claim' });
  }
});

router.patch('/claims/:id/appeal', async (req: Request, res: Response) => {
  try {
    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    if (claim.status !== 'DENIED') return res.status(400).json({ success: false, message: 'Only denied claims can be appealed' });
    claim.status = 'APPEALED';
    claim.appealNotes = req.body.appealNotes;
    claim.appealedAt = new Date().toISOString();
    res.json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to appeal claim' });
  }
});

router.patch('/claims/:id/write-off', async (req: Request, res: Response) => {
  try {
    const claim = claims.find(c => c.id === req.params.id);
    if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
    claim.status = 'CANCELLED';
    claim.writeOffReason = req.body.reason || 'Write-off';
    claim.writtenOffAt = new Date().toISOString();
    res.json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to write off claim' });
  }
});

// ─── REVENUE ANALYTICS (FR-BILL-031 to FR-BILL-050, FR-REV-001 to FR-REV-050) ──
router.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const allInvoices = await fetchAllInvoices();
    
    const approvedRefunds = refunds.filter(r => r.status === 'APPROVED');
    const totalRefunded = approvedRefunds.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const totalBilled = allInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
    const netBilled = Math.max(0, totalBilled - totalRefunded);
    const grossCollected = allInvoices.reduce((s, i) => s + (i.originalAmountPaid ?? i.amountPaid ?? 0), 0);
    const totalCollected = Math.max(0, grossCollected - totalRefunded);
    const totalOutstanding = allInvoices.reduce((s, i) => s + (i.outstanding || 0), 0);
    const invoiceCount = allInvoices.length;
    const paidCount = allInvoices.filter(i => i.status === 'PAID').length;
    const partialCount = allInvoices.filter(i => i.status === 'PARTIAL').length;
    const issuedCount = allInvoices.filter(i => i.status === 'ISSUED' || i.status === 'UNPAID').length;
    const cancelledCount = allInvoices.filter(i => i.status === 'CANCELLED').length;
    const refundedCount = allInvoices.filter(i => i.status === 'REFUNDED' || i.status === 'PARTIALLY_REFUNDED').length;
    const collectionRate = netBilled > 0 ? (totalCollected / netBilled) * 100 : 0;
    const avgRevenuePerEncounter = invoiceCount > 0 ? netBilled / invoiceCount : 0;
    const claimsSubmitted = claims.length;
    const claimsDenied = claims.filter(c => c.status === 'DENIED').length;
    const denialRate = claimsSubmitted > 0 ? (claimsDenied / claimsSubmitted) * 100 : 0;
    const refundsPending = refunds.filter(r => r.status === 'PENDING_APPROVAL').length;
    const shiftsOpen = cashierShifts.filter(s => s.status === 'OPEN').length;
    
    // Revenue by funding source
    const revByFunding: Record<string, number> = {};
    allInvoices.forEach(inv => {
      const key = inv.fundingSource || 'SELF_PAY';
      revByFunding[key] = (revByFunding[key] || 0) + (inv.totalAmount || 0);
    });

    // Revenue by Department / Service Category
    const revByDepartment: Record<string, number> = {
      'Pharmacy': 0,
      'Laboratory': 0,
      'Radiology': 0,
      'Consultation & OPD': 0,
      'Other Clinical': 0,
    };
    allInvoices.forEach(inv => {
      const src = (inv.sourceType || inv.source || '').toUpperCase();
      const amt = inv.totalAmount || 0;
      if (src.includes('PHARM')) revByDepartment['Pharmacy'] += amt;
      else if (src.includes('LAB')) revByDepartment['Laboratory'] += amt;
      else if (src.includes('RAD')) revByDepartment['Radiology'] += amt;
      else if (src.includes('CONSULT') || src.includes('OPD')) revByDepartment['Consultation & OPD'] += amt;
      else revByDepartment['Other Clinical'] += amt;
    });

    // Revenue by Payment Channel (Cashier Till / Electronic / Bank)
    const revByPaymentMethod: Record<string, number> = {
      'POS Terminal (Debit Card)': 0,
      'Cash (Drawer Till)': 0,
      'Direct Bank Transfer': 0,
    };
    if (payments.length > 0) {
      payments.forEach(p => {
        (p.methods || []).forEach((m: any) => {
          if (m.method === 'DEBIT_CARD' || m.method === 'POS') revByPaymentMethod['POS Terminal (Debit Card)'] += (m.amount || 0);
          else if (m.method === 'CASH') revByPaymentMethod['Cash (Drawer Till)'] += (m.amount || 0);
          else if (m.method === 'BANK_TRANSFER' || m.method === 'TRANSFER') revByPaymentMethod['Direct Bank Transfer'] += (m.amount || 0);
          else revByPaymentMethod['POS Terminal (Debit Card)'] += (m.amount || 0);
        });
      });
    } else {
      revByPaymentMethod['POS Terminal (Debit Card)'] = Math.round(totalCollected * 0.52);
      revByPaymentMethod['Cash (Drawer Till)'] = Math.round(totalCollected * 0.33);
      revByPaymentMethod['Direct Bank Transfer'] = totalCollected - revByPaymentMethod['POS Terminal (Debit Card)'] - revByPaymentMethod['Cash (Drawer Till)'];
    }

    // Daily revenue trend (populated from recent active dates or rolling history)
    const dateMap: Record<string, { billed: number; collected: number }> = {};
    allInvoices.forEach(inv => {
      const dStr = inv.createdAt instanceof Date ? inv.createdAt.toISOString().slice(0, 10) : (inv.createdAt as string || '').slice(0, 10);
      if (dStr) {
        if (!dateMap[dStr]) dateMap[dStr] = { billed: 0, collected: 0 };
        dateMap[dStr].billed += (inv.totalAmount || 0);
        dateMap[dStr].collected += (inv.amountPaid || 0);
      }
    });

    const sortedDates = Object.keys(dateMap).sort();
    let trendDates = sortedDates.slice(-7);
    if (trendDates.length === 0) {
      const today = new Date();
      trendDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });
    }

    const dailyTrend = trendDates.map(dateStr => ({
      date: dateStr,
      billed: dateMap[dateStr]?.billed || 0,
      collected: dateMap[dateStr]?.collected || 0,
    }));

    res.json({
      success: true,
      data: {
        totalBilled,
        grossBilled: totalBilled,
        netBilled,
        totalCollected,
        grossCollected,
        netCollected: totalCollected,
        totalRefunded,
        approvedRefundsCount: approvedRefunds.length,
        refundedCount,
        totalOutstanding,
        collectionRate,
        avgRevenuePerEncounter,
        invoiceCount,
        paidCount,
        partialCount,
        issuedCount,
        cancelledCount,
        claimsSubmitted,
        claimsDenied,
        denialRate,
        refundsPending,
        shiftsOpen,
        revByFunding,
        revByDepartment,
        revByPaymentMethod,
        dailyTrend,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

router.get('/analytics/reports', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    
    // Accounts Receivable Ageing
    if (type === 'ageing') {
      const allInvoices = await fetchAllInvoices();
      const now = new Date();
      const ageing = { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 };
      allInvoices.filter((i: any) => i.outstanding > 0).forEach((inv: any) => {
        const dStr = inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt);
        const days = Math.floor((now.getTime() - dStr.getTime()) / 86400000);
        if (days <= 30) ageing['0-30'] += inv.outstanding;
        else if (days <= 60) ageing['31-60'] += inv.outstanding;
        else if (days <= 90) ageing['61-90'] += inv.outstanding;
        else ageing['91+'] += inv.outstanding;
      });
      return res.json({ success: true, data: ageing });
    }
    
    // Claims denial analysis
    if (type === 'denial-analysis') {
      const denials = claims.filter(c => c.status === 'DENIED');
      const byReason: Record<string, number> = {};
      denials.forEach(c => { byReason[c.denialReason || 'Unspecified'] = (byReason[c.denialReason || 'Unspecified'] || 0) + 1; });
      return res.json({ success: true, data: byReason });
    }
    
    // Payer performance & Receivables by Payer
    if (type === 'payer-performance') {
      const allInvoices = await fetchAllInvoices();
      const unpaidInvoices = allInvoices.filter((i: any) => i.outstanding > 0);

      // Fetch DB insurance providers
      const dbProviders = await prisma.insuranceProvider.findMany({
        include: { plans: true, policies: true },
        orderBy: { name: 'asc' }
      }).catch(() => []);

      // 1. Self-Pay / Out-of-Pocket / Private Patients category
      const selfPayInvoices = allInvoices.filter((i: any) => i.fundingSource === 'SELF_PAY' || !i.fundingSource || i.fundingSource === 'OUT_OF_POCKET');
      const selfPayOutstanding = selfPayInvoices.reduce((sum: number, i: any) => sum + (Number(i.outstanding) || 0), 0);
      const selfPayPaid = selfPayInvoices.filter((i: any) => i.status === 'PAID').length;
      const selfPayTotal = selfPayInvoices.length;

      const performance: any[] = [
        {
          payerName: 'Self-Pay (Private Patients)',
          type: 'SELF_PAY',
          totalClaims: selfPayTotal,
          approvedClaims: selfPayPaid,
          deniedClaims: selfPayInvoices.filter((i: any) => i.status === 'CANCELLED').length,
          approvalRate: selfPayTotal > 0 ? ((selfPayPaid / selfPayTotal) * 100).toFixed(1) : '100.0',
          outstandingBalance: selfPayOutstanding,
        }
      ];

      // 2. Real DB Insurance Providers (NHIS, AXA Mansard Health, Hygeia HMO, etc.)
      for (const prov of dbProviders) {
        const isNHIA = prov.code.toUpperCase().includes('NHI') || prov.name.toUpperCase().includes('NHI');
        const provClaims = claims.filter(c => c.payerId === prov.id || c.payerId === prov.code || (c.payer && c.payer.toLowerCase().includes(prov.code.toLowerCase())));
        const approved = provClaims.filter(c => c.status === 'APPROVED' || c.status === 'PARTIAL');
        const denied = provClaims.filter(c => c.status === 'DENIED');
        
        // Find any unpaid invoices specifically assigned to this insurer
        const insurerInvoices = unpaidInvoices.filter((i: any) => 
          (i.fundingSource === 'HMO' || i.fundingSource === 'INSURANCE' || i.fundingSource === 'NHIA') &&
          (i.payerId === prov.id || i.payerName === prov.name)
        );
        const provOutstanding = insurerInvoices.reduce((sum: number, i: any) => sum + Number(i.outstanding || 0), 0);

        performance.push({
          payerName: prov.name,
          type: isNHIA ? 'NHIA' : 'HMO',
          totalClaims: provClaims.length,
          approvedClaims: approved.length,
          deniedClaims: denied.length,
          approvalRate: provClaims.length > 0 ? ((approved.length / provClaims.length) * 100).toFixed(1) : '100.0',
          outstandingBalance: provOutstanding,
        });
      }

      // 3. Any additional active custom payers created by user
      for (const payer of customPayers) {
        if (!performance.some(p => p.payerName === payer.name)) {
          const payerClaims = claims.filter(c => c.payerId === payer.id);
          const approved = payerClaims.filter(c => c.status === 'APPROVED' || c.status === 'PARTIAL');
          const denied = payerClaims.filter(c => c.status === 'DENIED');
          performance.push({
            payerName: payer.name,
            type: payer.type,
            totalClaims: payerClaims.length,
            approvedClaims: approved.length,
            deniedClaims: denied.length,
            approvalRate: payerClaims.length > 0 ? ((approved.length / payerClaims.length) * 100).toFixed(1) : '100.0',
            outstandingBalance: Number(payer.outstandingBalance || 0),
          });
        }
      }

      return res.json({ success: true, data: performance });
    }
    
    res.json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

// ─── PATIENTS (for billing lookup) ────────────────────────────────────────
router.get('/patients-lookup', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const where = q ? {
      OR: [
        { firstName: { contains: q as string } },
        { lastName: { contains: q as string } },
        { patientNumber: { contains: q as string } },
      ]
    } : {};
    const patients = await prisma.patient.findMany({ 
      where, 
      take: 50, 
      select: { id: true, firstName: true, lastName: true, patientNumber: true, walletBalance: true, amountOwed: true } 
    });
    
    // Map Decimal to standard number
    const formatted = patients.map(p => ({
      ...p,
      walletBalance: Number(p.walletBalance || 0),
      amountOwed: Number(p.amountOwed || 0)
    }));
    
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch patients' });
  }
});

// GET: Fetch patient wallet balance
router.get('/patients/:patientId/wallet', async (req: Request, res: Response) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.patientId },
      select: { id: true, firstName: true, lastName: true, patientNumber: true, walletBalance: true, amountOwed: true }
    });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found' });
    res.json({ success: true, data: { ...patient, walletBalance: Number(patient.walletBalance || 0), amountOwed: Number(patient.amountOwed || 0) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve patient wallet details' });
  }
});

// POST: Fund patient wallet
router.post('/patients/:patientId/wallet/fund', async (req: Request, res: Response) => {
  try {
    const { amount, method, reference, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid funding amount' });
    
    const patient = await prisma.patient.findUnique({ where: { id: req.params.patientId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found' });

    const updatedPatient = await prisma.patient.update({
      where: { id: req.params.patientId },
      data: { walletBalance: { increment: amount } },
      select: { id: true, firstName: true, lastName: true, patientNumber: true, walletBalance: true }
    });

    await logAudit({
      userId: (req as any).user?.id,
      action: 'FUND_PATIENT_WALLET',
      resourceType: 'Patient',
      resourceId: patient.id,
      changes: { amount, method, reference, newBalance: Number(updatedPatient.walletBalance) }
    });

    res.json({ 
      success: true, 
      message: `Wallet funded with ₦${amount.toLocaleString()}`, 
      data: { ...updatedPatient, walletBalance: Number(updatedPatient.walletBalance) } 
    });
  } catch (err) {
    console.error('[Billing] Failed to fund patient wallet:', err);
    res.status(500).json({ success: false, message: 'Failed to fund patient wallet' });
  }
});

// GET: List all patients with wallet data (Full server-side pagination, search, and global counts)
router.get('/wallet-patients', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    const filter = (req.query.filter as string || 'ALL').toUpperCase();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 25));
    const skip = (page - 1) * limit;

    // 1. Build filter and search where conditions (Strictly ACTIVE patients only: excludes deceased, transferred, archived)
    const whereConditions: any[] = [
      { status: 'ACTIVE', isActive: true }
    ];

    if (q) {
      whereConditions.push({
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { patientNumber: { contains: q, mode: 'insensitive' } },
          { monnifyVirtualAccounts: { some: { accountNumber: { contains: q } } } },
        ]
      });
    }

    if (filter === 'FUNDED') {
      whereConditions.push({ walletBalance: { gt: 0 } });
    } else if (filter === 'MONNIFY') {
      whereConditions.push({ monnifyVirtualAccounts: { some: { status: { not: 'DEACTIVATED' } } } });
    } else if (filter === 'DEBT') {
      whereConditions.push({
        OR: [
          { invoices: { some: { status: { notIn: ['PAID', 'CANCELLED'] } } } },
          { amountOwed: { gt: 0 } }
        ]
      });
    } else if (filter === 'SETTLE_WALLET') {
      whereConditions.push({
        walletBalance: { gt: 0 },
        OR: [
          { invoices: { some: { status: { notIn: ['PAID', 'CANCELLED'] } } } },
          { amountOwed: { gt: 0 } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // 2. Execute sequential queries to ensure zero connection exhaustion
    const totalFiltered = await prisma.patient.count({ where });

    const patients = await prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { walletBalance: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        patientNumber: true,
        walletBalance: true,
        amountOwed: true,
        gender: true,
        invoices: {
          where: { status: { notIn: ['PAID', 'CANCELLED'] } },
          select: {
            id: true,
            fhirId: true,
            total: true,
            amountPaid: true,
            status: true,
            reasonText: true,
            createdAt: true,
          }
        },
        monnifyVirtualAccounts: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            bankName: true,
            bankCode: true,
            status: true,
          }
        }
      }
    });

    // 3. Query global hospital counts across all ACTIVE registered patient accounts
    const countsRaw = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        COUNT(*)::int as "total",
        COUNT(*) FILTER (WHERE "walletBalance" > 0)::int as "funded",
        COUNT(*) FILTER (WHERE "amountOwed" > 0)::int as "debt",
        COUNT(*) FILTER (WHERE "walletBalance" > 0 AND "amountOwed" > 0)::int as "settle",
        COALESCE(SUM("walletBalance"), 0)::float as "totalFunds",
        COALESCE(SUM("amountOwed"), 0)::float as "totalDebt"
      FROM "patients"
      WHERE "status" = 'ACTIVE' AND "isActive" = true;
    `);

    const vaCountRaw = await prisma.monnifyVirtualAccount.count({
      where: {
        status: { not: 'DEACTIVATED' },
        patient: { status: 'ACTIVE', isActive: true }
      }
    }).catch(() => 0);

    const globalCounts = countsRaw?.[0] || {
      total: totalFiltered,
      funded: 0,
      debt: 0,
      settle: 0,
      totalFunds: 0,
      totalDebt: 0,
    };

    const formatted = patients.map(p => {
      const patientInvoices = (p.invoices || []).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.fhirId || inv.id,
        total: Number(inv.total || 0),
        amountPaid: Number(inv.amountPaid || 0),
        outstanding: Math.max(0, Number(inv.total || 0) - Number(inv.amountPaid || 0)),
        status: inv.status,
        reason: inv.reasonText || 'Hospital Services',
        createdAt: inv.createdAt,
      }));

      const liveDebt = patientInvoices.reduce((acc: number, inv: any) => acc + inv.outstanding, 0);

      return {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        patientNumber: p.patientNumber,
        gender: p.gender,
        walletBalance: Number(p.walletBalance || 0),
        amountOwed: liveDebt > 0 ? liveDebt : Number(p.amountOwed || 0),
        pendingInvoices: patientInvoices,
        monnifyAccount: p.monnifyVirtualAccounts?.[0] || null,
      };
    });

    res.json({
      success: true,
      data: formatted,
      total: totalFiltered,
      pagination: {
        total: totalFiltered,
        page,
        limit,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
      },
      counts: {
        total: globalCounts.total,
        funded: globalCounts.funded,
        bankLinked: vaCountRaw,
        debt: globalCounts.debt,
        settleWallet: globalCounts.settle,
        totalFunds: globalCounts.totalFunds,
        totalDebt: globalCounts.totalDebt,
      }
    });
  } catch (err) {
    console.error('Failed to fetch wallet patients:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet patients' });
  }
});

// POST: Manually deduct from patient wallet (cashier adjustment)
router.post('/patients/:patientId/wallet/deduct', async (req: Request, res: Response) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid deduction amount' });
    const patient = await prisma.patient.findUnique({ where: { id: req.params.patientId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    if (Number(patient.walletBalance) < amount) {
      return res.status(400).json({ success: false, message: `Insufficient wallet balance (Current: ₦${Number(patient.walletBalance || 0).toLocaleString()})` });
    }
    const updated = await prisma.patient.update({
      where: { id: req.params.patientId },
      data: { walletBalance: { decrement: amount } },
      select: { id: true, firstName: true, lastName: true, patientNumber: true, walletBalance: true }
    });
    await logAudit({
      userId: (req as any).user?.id,
      action: 'DEDUCT_PATIENT_WALLET',
      resourceType: 'Patient',
      resourceId: patient.id,
      changes: { amount, reason, newBalance: Number(updated.walletBalance) }
    });
    res.json({
      success: true,
      message: `₦${amount.toLocaleString()} deducted from wallet`,
      data: { ...updated, walletBalance: Number(updated.walletBalance) }
    });
  } catch (err) {
    console.error('[Billing] Failed to deduct from patient wallet:', err);
    res.status(500).json({ success: false, message: 'Failed to deduct from wallet' });
  }
});

export default router;
