import { Router, Request, Response } from 'express';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// STATE STORES (Mock Database)
// ─────────────────────────────────────────────────────────────────────────────

let assets: any[] = [
  { id: 'AST-MED-001', name: 'GE Healthcare Revolution CT Scanner', category: 'Radiology Equipment', manufacturer: 'GE Healthcare', model: 'Revolution 256', serialNo: 'GE-REV-9928A', department: 'Radiology', physicalLocation: 'CT Suite 1', custodian: 'Dr. Fatima Aliyu', status: 'OPERATIONAL', acquisitionCost: 120000000, residualValue: 12000000, usefulLifeYears: 10, depreciationMethod: 'STRAIGHT_LINE', installationDate: '2024-01-10', warrantyExpiry: '2027-01-10', fundingSource: 'HOSPITAL_CORE', insurancePolicy: 'INS-PROP-882A', criticality: 'CRITICAL', riskClass: 'CLASS_III' },
  { id: 'AST-MED-002', name: 'Mindray BeneHeart D6 Defibrillator', category: 'Emergency Equipment', manufacturer: 'Mindray', model: 'BeneHeart D6', serialNo: 'MR-BH-88231', department: 'Emergency', physicalLocation: 'ER Resus-2', custodian: 'Nurse Ngozi Adeyemi', status: 'OPERATIONAL', acquisitionCost: 3500000, residualValue: 350000, usefulLifeYears: 7, depreciationMethod: 'STRAIGHT_LINE', installationDate: '2025-05-15', warrantyExpiry: '2028-05-15', fundingSource: 'DONOR_FUNDED', donorGrantRef: 'CARITAS-GH-2025', insurancePolicy: 'INS-PROP-112B', criticality: 'CRITICAL', riskClass: 'CLASS_IIB' },
  { id: 'AST-MED-003', name: 'Roche Cobas c311 Chemistry Analyzer', category: 'Laboratory Equipment', manufacturer: 'Roche Diagnostics', model: 'Cobas c311', serialNo: 'RC-COB-10928X', department: 'Laboratory', physicalLocation: 'Clinical Chem lab', custodian: 'Aisha Bello', status: 'UNDER_CALIBRATION', acquisitionCost: 22000000, residualValue: 2200000, usefulLifeYears: 8, depreciationMethod: 'STRAIGHT_LINE', installationDate: '2023-09-20', warrantyExpiry: '2026-09-20', fundingSource: 'HOSPITAL_CORE', insurancePolicy: 'INS-PROP-882A', criticality: 'HIGH', riskClass: 'CLASS_IIA' },
  { id: 'AST-GEN-004', name: 'Perkins 500kVA Soundproof Generator', category: 'Utilities & Infrastructure', manufacturer: 'Perkins', model: '2506C-E15TAG2', serialNo: 'PK-GEN-500KVA', department: 'Administration', physicalLocation: 'Power House', custodian: 'Tunde Fashola', status: 'OPERATIONAL', acquisitionCost: 45000000, residualValue: 4500000, usefulLifeYears: 15, depreciationMethod: 'STRAIGHT_LINE', installationDate: '2020-03-01', warrantyExpiry: '2023-03-01', fundingSource: 'HOSPITAL_CORE', insurancePolicy: 'INS-PROP-882A', criticality: 'CRITICAL', riskClass: 'CLASS_I' }
];

let workOrders: any[] = [
  { id: 'WO-1092', assetId: 'AST-MED-003', assetName: 'Roche Cobas c311 Chemistry Analyzer', title: 'Quarterly Re-calibration & validation', category: 'PREVENTIVE', priority: 'HIGH', assignee: 'Engr. Yusuf Ibrahim (Biomedical)', scheduledDate: '2026-06-30', details: 'Verify optical sensors, clean probe heads and validate controls against NIST standard.', status: 'IN_PROGRESS' },
  { id: 'WO-1093', assetId: 'AST-MED-001', assetName: 'GE Healthcare Revolution CT Scanner', title: 'Replace coolant tubing line', category: 'CORRECTIVE', priority: 'CRITICAL', assignee: 'GE Service Engineer (OEM)', scheduledDate: '2026-06-28', details: 'Minor oil leak observed on main gantry coolant line. Replace seals and refill fluid.', status: 'COMPLETED' },
];

let calibrations: any[] = [
  { id: 'CAL-01', assetId: 'AST-MED-003', assetName: 'Roche Cobas c311 Chemistry Analyzer', certNo: 'NIST-CAL-99212A', calibrationDate: '2026-06-20', nextDueDate: '2026-12-20', technician: 'Engr. Yusuf Ibrahim', toleranceLevel: '±0.05% margin', status: 'VERIFIED' }
];

let generatorLogs: any[] = [
  { id: 'GEN-01', generatorName: 'Perkins 500kVA Soundproof Generator', date: '2026-06-28', runtimeHours: 8.5, fuelLevelStart: 95.0, fuelLevelEnd: 72.0, dieselAddedLitres: 0, status: 'OPERATIONAL', notes: 'Outage occurred from 14:00 to 22:30. Seamless cutover.' }
];

let medicalGasLogs: any[] = [
  { id: 'GAS-01', gasType: 'OXYGEN', plantSource: 'Main PSA Oxygen Plant', manifoldPressurePSI: 55, linePressurePSI: 50, purityPercentage: 94.2, status: 'NORMAL', inspector: 'Engr. Obi Nwosu' }
];

let fleetVehicles: any[] = [
  { id: 'FLT-01', plateNumber: 'LA-992-EKY', brandModel: 'Toyota Hiace Ambulance Type B', status: 'OPERATIONAL', currentMileage: 28400, fuelLevelPercent: 85, assignedDriver: 'Musa Abdullahi', insuranceExpiry: '2026-12-31', lastServiceDate: '2026-05-10' }
];

let safetyLogs: any[] = [
  { id: 'SFT-01', auditDate: '2026-06-25', category: 'FIRE_SAFETY', description: 'Inspected 45 dry chemical powder extinguishers. Checked emergency exits.', findings: '2 extinguishers in pharmacy corridor require recharging.', inspector: 'Officer Bunmi Alao', status: 'CORRECTIVE_REQUIRED' }
];

// ─────────────────────────────────────────────────────────────────────────────
// §20.1 - ASSET REGISTRY & LIFECYCLE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', (req: Request, res: Response) => {
  res.json({ success: true, data: assets, total: assets.length });
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const asset = {
      id: `AST-${req.body.category?.substring(0,3).toUpperCase() || 'MED'}-${String(assets.length + 1).padStart(3, '0')}`,
      ...req.body,
      status: 'OPERATIONAL'
    };
    assets.unshift(asset);
    await logAudit({ userId: (req as any).user?.id, action: 'REGISTER_ASSET', resourceType: 'Asset', resourceId: asset.id, changes: asset });
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to register asset' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §20.2 - MAINTENANCE OPERATIONS, CALIBRATION & WORK ORDERS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/workorders', (req: Request, res: Response) => {
  res.json({ success: true, data: workOrders });
});

router.post('/workorders', async (req: Request, res: Response) => {
  try {
    const asset = assets.find(a => a.id === req.body.assetId);
    const wo = {
      id: `WO-${Date.now().toString().slice(-4)}`,
      assetName: asset ? asset.name : 'Unknown Asset',
      status: 'NEW',
      ...req.body
    };
    workOrders.unshift(wo);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_WORK_ORDER', resourceType: 'WorkOrder', resourceId: wo.id, changes: wo });
    res.status(201).json({ success: true, data: wo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create work order' });
  }
});

router.patch('/workorders/:id/status', async (req: Request, res: Response) => {
  try {
    const wo = workOrders.find(w => w.id === req.params.id);
    if (!wo) return res.status(404).json({ success: false, message: 'Work order not found' });
    wo.status = req.body.status;
    await logAudit({ userId: (req as any).user?.id, action: 'UPDATE_WORK_ORDER_STATUS', resourceType: 'WorkOrder', resourceId: wo.id, changes: { status: wo.status } });
    res.json({ success: true, data: wo });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update work order status' });
  }
});

router.get('/calibrations', (req: Request, res: Response) => {
  res.json({ success: true, data: calibrations });
});

router.post('/calibrations', (req: Request, res: Response) => {
  const asset = assets.find(a => a.id === req.body.assetId);
  const cal = {
    id: `CAL-${String(calibrations.length + 1).padStart(2, '0')}`,
    assetName: asset ? asset.name : 'Unknown',
    status: 'VERIFIED',
    ...req.body
  };
  calibrations.unshift(cal);
  res.status(201).json({ success: true, data: cal });
});

// ─────────────────────────────────────────────────────────────────────────────
// §20.3 - FACILITIES, UTILITIES & FLEET
// ─────────────────────────────────────────────────────────────────────────────

router.get('/generators', (req: Request, res: Response) => {
  res.json({ success: true, data: generatorLogs });
});

router.post('/generators', (req: Request, res: Response) => {
  const log = { id: `GEN-${Date.now().toString().slice(-4)}`, status: 'OPERATIONAL', ...req.body };
  generatorLogs.unshift(log);
  res.status(201).json({ success: true, data: log });
});

router.get('/gas', (req: Request, res: Response) => {
  res.json({ success: true, data: medicalGasLogs });
});

router.post('/gas', (req: Request, res: Response) => {
  const log = { id: `GAS-${Date.now().toString().slice(-4)}`, status: 'NORMAL', ...req.body };
  medicalGasLogs.unshift(log);
  res.status(201).json({ success: true, data: log });
});

router.get('/fleet', (req: Request, res: Response) => {
  res.json({ success: true, data: fleetVehicles });
});

router.post('/fleet', (req: Request, res: Response) => {
  const v = { id: `FLT-${String(fleetVehicles.length + 1).padStart(2, '0')}`, status: 'OPERATIONAL', ...req.body };
  fleetVehicles.unshift(v);
  res.status(201).json({ success: true, data: v });
});

router.get('/safety', (req: Request, res: Response) => {
  res.json({ success: true, data: safetyLogs });
});

router.post('/safety', (req: Request, res: Response) => {
  const log = { id: `SFT-${Date.now().toString().slice(-4)}`, ...req.body };
  safetyLogs.unshift(log);
  res.status(201).json({ success: true, data: log });
});

// ─────────────────────────────────────────────────────────────────────────────
// §20.4 - FINANCIAL DEPRECIATION & BI DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

router.get('/depreciation', (req: Request, res: Response) => {
  // calculate live depreciation
  const reports = assets.map(ast => {
    const ageYears = (new Date().getTime() - new Date(ast.installationDate).getTime()) / (365.25 * 24 * 3600 * 1000);
    const yearlyDep = (ast.acquisitionCost - ast.residualValue) / ast.usefulLifeYears;
    const accumulatedDep = Math.min(ast.acquisitionCost - ast.residualValue, Math.round(yearlyDep * Math.max(0, ageYears)));
    const netBookValue = ast.acquisitionCost - accumulatedDep;

    return {
      id: ast.id,
      name: ast.name,
      category: ast.category,
      acquisitionCost: ast.acquisitionCost,
      accumulatedDep,
      netBookValue,
      usefulLifeYears: ast.usefulLifeYears,
      ageYears: Number(ageYears.toFixed(1))
    };
  });
  res.json({ success: true, data: reports });
});

router.get('/analytics', (req: Request, res: Response) => {
  const totalAssetsCount = assets.length;
  const totalValuation = assets.reduce((s, a) => s + a.acquisitionCost, 0);
  const activeCount = assets.filter(a => a.status === 'OPERATIONAL').length;
  const criticalDowntimeCount = assets.filter(a => a.status === 'UNDER_CALIBRATION' || a.status === 'UNDER_MAINTENANCE').length;

  const distributionByCategory = [
    { name: 'Radiology', value: assets.filter(a => a.category?.includes('Radiology')).length },
    { name: 'Laboratory', value: assets.filter(a => a.category?.includes('Laboratory')).length },
    { name: 'Emergency', value: assets.filter(a => a.category?.includes('Emergency')).length },
    { name: 'Utilities/Generators', value: assets.filter(a => a.category?.includes('Utilities')).length },
  ];

  res.json({
    success: true,
    data: {
      totalAssetsCount,
      totalValuation,
      activeCount,
      criticalDowntimeCount,
      distributionByCategory
    }
  });
});

export default router;
