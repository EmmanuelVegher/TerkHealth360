import { Router, Request, Response } from 'express';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// STATE STORES (Mock Database)
// ─────────────────────────────────────────────────────────────────────────────

let documents: any[] = [
  { id: 'DOC-001', name: 'Clinical SOP for Antenatal Care', category: 'POLICY_SOP', mimeType: 'application/pdf', department: 'Maternity', creator: 'Dr. Fatima Aliyu', version: '2.0', status: 'PUBLISHED', createdDate: '2026-06-15', retentionPeriodYears: 7, isLegalHold: false, classification: 'INTERNAL', ocrText: 'Standard Operating Procedure for antenatal assessments, maternal risk scoring, and fetal heart monitors.' },
  { id: 'DOC-002', name: 'Vendor Agreement - Emzor Pharma', category: 'CONTRACTS', mimeType: 'application/docx', department: 'Pharmacy', creator: 'Tunde Fashola', version: '1.1', status: 'ACTIVE', createdDate: '2026-05-10', retentionPeriodYears: 10, isLegalHold: true, classification: 'CONFIDENTIAL', ocrText: 'Supply contract for paracetamol, ibuprofen, and related pharmaceutical consumables for hospital pharmacy.' },
  { id: 'DOC-003', name: 'Patient Consent Form - Alhaji Musa', category: 'PATIENT_CONSENT', mimeType: 'image/jpeg', department: 'OPD', creator: 'Nurse Ngozi Adeyemi', version: '1.0', status: 'PUBLISHED', createdDate: '2026-06-28', retentionPeriodYears: 15, isLegalHold: false, classification: 'RESTRICTED', ocrText: 'Patient consent for surgical operation, anaesthesia risks, and privacy disclosure authorization.' }
];

let digitalForms: any[] = [
  { id: 'FRM-01', title: 'Adverse Drug Reaction (ADR) Incident Report', department: 'Pharmacy', creator: 'Quality Assurance Officer', version: '1.0', status: 'PUBLISHED', inputsCount: 12, submissionsCount: 42 },
  { id: 'FRM-02', title: 'Clinical Incident Safety Checklist', department: 'Nursing', creator: 'Quality Assurance Officer', version: '2.1', status: 'PUBLISHED', inputsCount: 8, submissionsCount: 154 }
];

let workflows: any[] = [
  { id: 'WF-7721', docId: 'DOC-001', docName: 'Clinical SOP for Antenatal Care', stage: 'MEDICAL_DIRECTOR_REVIEW', status: 'PENDING_APPROVAL', assignee: 'Medical Director', dateInitiated: '2026-06-28', comments: 'Pending clinical privileges check for pediatric unit.' },
  { id: 'WF-7722', docId: 'DOC-002', docName: 'Vendor Agreement - Emzor Pharma', stage: 'LEGAL_REVIEW', status: 'APPROVED', assignee: 'Legal Officer', dateInitiated: '2026-06-25', comments: 'Reviewed liability terms and insurance compliance.' }
];

let electronicSignatures: any[] = [
  { id: 'SIG-881', docId: 'DOC-002', signer: 'Tunde Fashola', role: 'HR/Admin Manager', timestamp: '2026-06-26 10:15:30', hash: 'SHA256:d8a2bc918a28eef9213efc123a48e833f48a129d2b' },
  { id: 'SIG-882', docId: 'DOC-002', signer: 'Emzor representative', role: 'External Vendor Partner', timestamp: '2026-06-26 11:30:12', hash: 'SHA256:bb192a01f987cc2218c3ef9921bda102c918a2ee' }
];

// ─────────────────────────────────────────────────────────────────────────────
// §22.1 - DOCUMENT CAPTURE, METADATA & FORMS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/documents', (req: Request, res: Response) => {
  res.json({ success: true, data: documents, total: documents.length });
});

router.post('/documents', async (req: Request, res: Response) => {
  try {
    const doc = {
      id: `DOC-${String(documents.length + 1).padStart(3, '0')}`,
      version: '1.0',
      status: 'PUBLISHED',
      isLegalHold: false,
      createdDate: new Date().toISOString().slice(0, 10),
      ocrText: req.body.ocrText || 'Extracted document context from upload.',
      ...req.body
    };
    documents.unshift(doc);
    await logAudit({ userId: (req as any).user?.id, action: 'UPLOAD_DOCUMENT', resourceType: 'Document', resourceId: doc.id, changes: doc });
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

router.get('/forms', (req: Request, res: Response) => {
  res.json({ success: true, data: digitalForms });
});

router.post('/forms', async (req: Request, res: Response) => {
  try {
    const form = {
      id: `FRM-${String(digitalForms.length + 1).padStart(2, '0')}`,
      version: '1.0',
      status: 'PUBLISHED',
      submissionsCount: 0,
      ...req.body
    };
    digitalForms.unshift(form);
    await logAudit({ userId: (req as any).user?.id, action: 'PUBLISH_DIGITAL_FORM', resourceType: 'DigitalForm', resourceId: form.id, changes: form });
    res.status(201).json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to publish form' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §22.2 - LIFECYCLE WORKFLOWS & DIGITAL SIGNATURES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/workflows', (req: Request, res: Response) => {
  res.json({ success: true, data: workflows });
});

router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const doc = documents.find(d => d.id === req.body.docId);
    const wf = {
      id: `WF-${Date.now().toString().slice(-4)}`,
      docName: doc ? doc.name : 'Unknown Document',
      status: 'PENDING_APPROVAL',
      dateInitiated: new Date().toISOString().slice(0, 10),
      ...req.body
    };
    workflows.unshift(wf);
    await logAudit({ userId: (req as any).user?.id, action: 'INITIATE_DOCUMENT_WORKFLOW', resourceType: 'Workflow', resourceId: wf.id, changes: wf });
    res.status(201).json({ success: true, data: wf });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to initiate workflow' });
  }
});

router.patch('/workflows/:id/approve', async (req: Request, res: Response) => {
  try {
    const wf = workflows.find(w => w.id === req.params.id);
    if (!wf) return res.status(404).json({ success: false, message: 'Workflow task not found' });
    wf.status = 'APPROVED';
    wf.comments = req.body.comments || 'Approved under electronic audit signature.';

    // Generate electronic signature log automatically
    const sig = {
      id: `SIG-${Date.now().toString().slice(-3)}`,
      docId: wf.docId,
      signer: (req as any).user?.username || 'admin',
      role: 'Staff Custodian Approver',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      hash: `SHA256:${Math.random().toString(16).substring(2, 10)}8eef9213efc123a48e833f48a129d2b`
    };
    electronicSignatures.unshift(sig);

    // Update document status
    const doc = documents.find(d => d.id === wf.docId);
    if (doc) doc.status = 'PUBLISHED';

    await logAudit({ userId: (req as any).user?.id, action: 'APPROVE_DOCUMENT_WORKFLOW', resourceType: 'Workflow', resourceId: wf.id });
    res.json({ success: true, data: wf, signature: sig });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve workflow task' });
  }
});

router.get('/signatures', (req: Request, res: Response) => {
  res.json({ success: true, data: electronicSignatures });
});

// ─────────────────────────────────────────────────────────────────────────────
// §22.3 - RETENTION, LEGAL HOLD & PRIVACY SECURITY
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/documents/:id/hold', async (req: Request, res: Response) => {
  try {
    const doc = documents.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    doc.isLegalHold = req.body.isLegalHold;
    await logAudit({ userId: (req as any).user?.id, action: 'TOGGLE_LEGAL_HOLD', resourceType: 'Document', resourceId: doc.id, changes: { isLegalHold: doc.isLegalHold } });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to adjust legal hold status' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §22.4 - REPOSITORY BI ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics', (req: Request, res: Response) => {
  const totalCount = documents.length;
  const holdCount = documents.filter(d => d.isLegalHold).length;
  const activeWorkflows = workflows.filter(w => w.status === 'PENDING_APPROVAL').length;
  const publishedForms = digitalForms.length;

  const distributionByCategory = [
    { name: 'Policy & SOPs', value: documents.filter(d => d.category === 'POLICY_SOP').length },
    { name: 'Vendor Contracts', value: documents.filter(d => d.category === 'CONTRACTS').length },
    { name: 'Consent Forms', value: documents.filter(d => d.category === 'PATIENT_CONSENT').length },
  ];

  res.json({
    success: true,
    data: {
      totalCount,
      holdCount,
      activeWorkflows,
      publishedForms,
      distributionByCategory
    }
  });
});

export default router;
