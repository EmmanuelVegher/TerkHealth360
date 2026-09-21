import { Router, Request, Response } from 'express';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// STATE STORES (Mock Database)
// ─────────────────────────────────────────────────────────────────────────────

let etlPipelines: any[] = [
  { id: 'PIP-001', name: 'Clinical EMR Sync Ingest', schedule: 'HOURLY', recordsProcessed: 1420, latencySeconds: 1.5, status: 'SUCCESS', lastRun: '2026-06-28 14:00' },
  { id: 'PIP-002', name: 'Financial Ledger Consolidation', schedule: 'DAILY', recordsProcessed: 320, latencySeconds: 5.2, status: 'SUCCESS', lastRun: '2026-06-28 01:00' },
  { id: 'PIP-003', name: 'NigeriaMRS HIV Cascade Export', schedule: 'REAL_TIME', recordsProcessed: 45, latencySeconds: 0.8, status: 'SUCCESS', lastRun: '2026-06-28 14:42' }
];

let mdmRecords: any[] = [
  { id: 'MDM-101', entityType: 'PATIENT', primaryName: 'Alhaji Ibrahim Musa', uniqueId: 'EID-PAT-9912', sourceCount: 3, status: 'RESOLVED', matchConfidence: '99.5%' },
  { id: 'MDM-102', entityType: 'MEDICATION', primaryName: 'Paracetamol 500mg Tab', uniqueId: 'EID-MED-0034', sourceCount: 2, status: 'RESOLVED', matchConfidence: '100.0%' }
];

let aiModels: any[] = [
  { id: 'MOD-991', name: 'Sepsis Deterioration Predictor', version: 'v3.2', accuracy: '94.2%', driftFactor: '0.1%', status: 'ACTIVE', lastRetainedDate: '2026-06-15' },
  { id: 'MOD-992', name: 'Outpatient Bed Occupancy Forecaster', version: 'v1.4', accuracy: '89.7%', driftFactor: '0.4%', status: 'ACTIVE', lastRetainedDate: '2026-06-20' },
  { id: 'MOD-993', name: 'HIV Treatment Interruption Risk Classifier', version: 'v2.1', accuracy: '91.5%', driftFactor: '0.2%', status: 'ACTIVE', lastRetainedDate: '2026-06-22' }
];

let clinicalAlertsAI: any[] = [
  { id: 'PRD-701', patientName: 'Baby Joy (Neonatal IPD)', model: 'Sepsis Deterioration Predictor', riskScore: '87%', status: 'HIGH_RISK', explainability: 'High temperature variation (+1.2C) & high heart rate fluctuation.', actionTaken: 'Rapid Response Team dispatched.' },
  { id: 'PRD-702', patientName: 'Alhaji Ibrahim Musa', model: 'HIV Treatment Interruption Classifier', riskScore: '68%', status: 'MEDIUM_RISK', explainability: 'Missed pharmacy refills past 14 days & history of travel.', actionTaken: 'Adherence counselor assigned.' }
];

let biKpiScorecard: any[] = [
  { id: 'KPI-01', metricName: 'Outpatient Triage Wait Duration', baseline: '45 mins', target: '30 mins', actual: '28 mins', status: 'TARGET_MET', category: 'OPERATIONAL' },
  { id: 'KPI-02', metricName: 'Maternity CS Delivery Rate', baseline: '15.0%', target: '12.0%', actual: '11.8%', status: 'TARGET_MET', category: 'CLINICAL' },
  { id: 'KPI-03', metricName: 'NHIA Billing Claims Adjudication Days', baseline: '30 days', target: '15 days', actual: '18 days', status: 'WARNING', category: 'FINANCIAL' }
];

// ─────────────────────────────────────────────────────────────────────────────
// §25.1 - DATA WAREHOUSE & ETL PIPELINES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/etl', (req: Request, res: Response) => {
  res.json({ success: true, data: etlPipelines });
});

router.post('/etl/run', async (req: Request, res: Response) => {
  try {
    const pipeline = etlPipelines.find(p => p.id === req.body.pipelineId);
    if (pipeline) {
      pipeline.status = 'SUCCESS';
      pipeline.lastRun = new Date().toISOString().replace('T', ' ').substring(0, 16);
      pipeline.recordsProcessed += Math.floor(Math.random() * 50);
      await logAudit({ userId: (req as any).user?.id, action: 'TRIGGER_ETL_PIPELINE', resourceType: 'ETLPipeline', resourceId: pipeline.id, changes: pipeline });
      res.json({ success: true, data: pipeline });
    } else {
      res.status(404).json({ success: false, message: 'Pipeline not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to run ETL pipeline' });
  }
});

router.get('/mdm', (req: Request, res: Response) => {
  res.json({ success: true, data: mdmRecords });
});

// ─────────────────────────────────────────────────────────────────────────────
// §25.2 - CLINICAL AI/ML DECISION SUPPORT (CDS)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/models', (req: Request, res: Response) => {
  res.json({ success: true, data: aiModels });
});

router.get('/predictions', (req: Request, res: Response) => {
  res.json({ success: true, data: clinicalAlertsAI });
});

router.post('/predictions', async (req: Request, res: Response) => {
  try {
    const item = {
      id: `PRD-${Date.now().toString().slice(-3)}`,
      actionTaken: 'Awaiting clinical response.',
      ...req.body
    };
    clinicalAlertsAI.unshift(item);
    await logAudit({ userId: (req as any).user?.id, action: 'TRIGGER_AI_PREDICTION', resourceType: 'AIPrediction', resourceId: item.id, changes: item });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record AI prediction' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §25.3 - BUSINESS INTELLIGENCE SCORECARD
// ─────────────────────────────────────────────────────────────────────────────

router.get('/kpis', (req: Request, res: Response) => {
  res.json({ success: true, data: biKpiScorecard });
});

// ─────────────────────────────────────────────────────────────────────────────
// §25.4 - EXECUTIVE DATA GOVERNANCE & BI ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics', (req: Request, res: Response) => {
  const totalPipelines = etlPipelines.length;
  const totalAIModels = aiModels.length;
  const highRiskCount = clinicalAlertsAI.filter(p => p.status === 'HIGH_RISK').length;
  const kpiSuccessRatio = Number(((biKpiScorecard.filter(k => k.status === 'TARGET_MET').length / biKpiScorecard.length) * 100).toFixed(0));

  const distributionByPipeline = [
    { name: 'EMR Sync Ingest', value: etlPipelines.find(p => p.id === 'PIP-001')?.recordsProcessed || 0 },
    { name: 'Financial Consolidation', value: etlPipelines.find(p => p.id === 'PIP-002')?.recordsProcessed || 0 },
    { name: 'NigeriaMRS HIV Cascade', value: etlPipelines.find(p => p.id === 'PIP-003')?.recordsProcessed || 0 },
  ];

  res.json({
    success: true,
    data: {
      totalPipelines,
      totalAIModels,
      highRiskCount,
      kpiSuccessRatio,
      distributionByPipeline
    }
  });
});

export default router;
