import { Router, Request, Response } from 'express';
import { logAudit } from '../utils/auditHelper.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// STATE STORES (Mock Database)
// ─────────────────────────────────────────────────────────────────────────────

let crmProfiles: any[] = [
  { id: 'CRM-001', patientId: 'PAT-001', name: 'Alhaji Ibrahim Musa', phone: '080-3333-8822', email: 'ibrahim@example.com', preferredChannel: 'WHATSAPP', preferredLanguage: 'HAUSA', preferredTime: 'MORNING', consentReminders: true, consentHealthEd: true, referralSource: 'MEDIA_CAMPAIGN', segment: 'CHRONIC_CARE', tag: 'HYPERTENSION', lifecycle: 'ACTIVE', caregiverName: 'Amina Musa', caregiverPhone: '080-3333-8823', caregiverRole: 'SPOUSE' },
  { id: 'CRM-002', patientId: 'PAT-002', name: 'Mrs. Funke Adebayo', phone: '081-4444-9911', email: 'funke@example.com', preferredChannel: 'SMS', preferredLanguage: 'ENGLISH', preferredTime: 'AFTERNOON', consentReminders: true, consentHealthEd: false, referralSource: 'PARTNER_ORG', segment: 'MATERNAL_HEALTH', tag: 'ANC_PREGNANCY', lifecycle: 'ACTIVE', caregiverName: 'Bamidele Adebayo', caregiverPhone: '081-4444-9912', caregiverRole: 'SPOUSE' },
  { id: 'CRM-003', patientId: 'PAT-003', name: 'Obinna Chukwu', phone: '070-5555-1100', email: 'obinna@example.com', preferredChannel: 'EMAIL', preferredLanguage: 'ENGLISH', preferredTime: 'EVENING', consentReminders: true, consentHealthEd: true, referralSource: 'COMMUNITY_OUTREACH', segment: 'CORE_OPD', tag: 'GENERAL_WELLNESS', lifecycle: 'NEW', caregiverName: 'Emeka Chukwu', caregiverPhone: '070-5555-1101', caregiverRole: 'FATHER' }
];

let contactCases: any[] = [
  { id: 'CAS-9921', crmId: 'CRM-001', name: 'Alhaji Ibrahim Musa', category: 'APPOINTMENT_REQUEST', priority: 'MEDIUM', agent: 'Agent Ngozi', date: '2026-06-28', description: 'Requested to reschedule consultation with Cardiology to next Tuesday morning.', status: 'RESOLVED' },
  { id: 'CAS-9922', crmId: 'CRM-002', name: 'Mrs. Funke Adebayo', category: 'COMPLAINT_BILLING', priority: 'HIGH', agent: 'Agent Ngozi', date: '2026-06-28', description: 'NHIA copayment discrepancy reported. Claims she was overcharged for OPD labs.', status: 'OPEN' }
];

let reminders: any[] = [
  { id: 'REM-8812', name: 'Alhaji Ibrahim Musa', phone: '080-3333-8822', channel: 'WHATSAPP', appointmentDate: '2026-06-30', reminderType: 'CLINIC_VISIT', content: 'Dear Alhaji Ibrahim Musa, this is a reminder for your cardiology consultation on Tuesday 30-Jun-2026 at 9:00AM.', status: 'DELIVERED' },
  { id: 'REM-8813', name: 'Mrs. Funke Adebayo', phone: '081-4444-9911', channel: 'SMS', appointmentDate: '2026-07-02', reminderType: 'PROCEDURE', content: 'Dear Mrs. Funke Adebayo, please remember you have an ultrasound scheduled on Thursday 02-Jul-2026 at 11:30AM.', status: 'SENT' }
];

let satisfactionSurveys: any[] = [
  { id: 'SRV-01', name: 'Alhaji Ibrahim Musa', surveyDate: '2026-06-25', department: 'Outpatient Clinic', scoreCSAT: 5, scoreNPS: 10, feedbackText: 'Prompt consultation, cardiologists were very attentive.', status: 'COMPLETED' },
  { id: 'SRV-02', name: 'Obinna Chukwu', surveyDate: '2026-06-24', department: 'Emergency Unit', scoreCSAT: 2, scoreNPS: 3, feedbackText: 'Long wait times before triage assessment.', status: 'CORRECTIVE_ACTION_INITIATED' }
];

let complaints: any[] = [
  { id: 'CMP-771', patientName: 'Obinna Chukwu', department: 'Emergency Unit', category: 'WAITING_TIME', severity: 'HIGH', resolvedDate: '—', actionsTaken: 'Under investigation by Emergency Matron. Patient contacted to schedule service recovery.', status: 'UNDER_INVESTIGATION' },
  { id: 'CMP-772', patientName: 'Alhaji Ibrahim Musa', department: 'Pharmacy', category: 'STAFF_BEHAVIOUR', severity: 'MEDIUM', resolvedDate: '2026-06-27', actionsTaken: 'Resolved via formal apology. Pharmacy shift logs adjusted to minimize crowding.', status: 'RESOLVED' }
];

let campaignOutreach: any[] = [
  { id: 'CMPG-01', name: 'World Hypertension Day Screening outreach', targetAudience: 'Cardiology Segment', channel: 'WHATSAPP', cost: 15000, targetCount: 150, respondedCount: 42, status: 'COMPLETED' },
  { id: 'CMPG-02', name: 'Maternal ANC PMTCT immunization drive', targetAudience: 'ANC_PREGNANCY Segment', channel: 'SMS', cost: 25000, targetCount: 300, respondedCount: 120, status: 'IN_PROGRESS' }
];

// ─────────────────────────────────────────────────────────────────────────────
// §21.1 - PATIENT CRM PROFILES & CAREGIVERS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/profiles', (req: Request, res: Response) => {
  res.json({ success: true, data: crmProfiles, total: crmProfiles.length });
});

router.post('/profiles', async (req: Request, res: Response) => {
  try {
    const profile = {
      id: `CRM-${String(crmProfiles.length + 1).padStart(3, '0')}`,
      ...req.body,
      lifecycle: 'ACTIVE'
    };
    crmProfiles.unshift(profile);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_CRM_PROFILE', resourceType: 'CRMProfile', resourceId: profile.id, changes: profile });
    res.status(201).json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to register CRM profile' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §21.2 - OMNICHANNEL CONTACT CENTRE & REMINDERS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/cases', (req: Request, res: Response) => {
  res.json({ success: true, data: contactCases });
});

router.post('/cases', async (req: Request, res: Response) => {
  try {
    const profile = crmProfiles.find(c => c.id === req.body.crmId);
    const item = {
      id: `CAS-${Date.now().toString().slice(-4)}`,
      name: profile ? profile.name : 'Walk-In Inquirer',
      date: new Date().toISOString().slice(0, 10),
      status: 'OPEN',
      ...req.body
    };
    contactCases.unshift(item);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_CONTACT_CASE', resourceType: 'ContactCase', resourceId: item.id, changes: item });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to log contact case' });
  }
});

router.patch('/cases/:id/status', async (req: Request, res: Response) => {
  try {
    const item = contactCases.find(c => c.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Case file not found' });
    item.status = req.body.status;
    await logAudit({ userId: (req as any).user?.id, action: 'UPDATE_CRM_CASE_STATUS', resourceType: 'ContactCase', resourceId: item.id, changes: { status: item.status } });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update case status' });
  }
});

router.get('/reminders', (req: Request, res: Response) => {
  res.json({ success: true, data: reminders });
});

router.post('/reminders', (req: Request, res: Response) => {
  try {
    const profile = crmProfiles.find(c => c.id === req.body.crmId);
    const item = {
      id: `REM-${Date.now().toString().slice(-4)}`,
      name: profile ? profile.name : 'Unknown Recipient',
      phone: profile ? profile.phone : req.body.phone,
      channel: profile ? profile.preferredChannel : 'SMS',
      status: 'SENT',
      ...req.body
    };
    reminders.unshift(item);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send reminder alert' });
  }
});

router.get('/campaigns', (req: Request, res: Response) => {
  res.json({ success: true, data: campaignOutreach });
});

router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaign = {
      id: `CMPG-${String(campaignOutreach.length + 1).padStart(2, '0')}`,
      respondedCount: 0,
      status: 'IN_PROGRESS',
      ...req.body
    };
    campaignOutreach.unshift(campaign);
    await logAudit({ userId: (req as any).user?.id, action: 'LAUNCH_CAMPAIGN', resourceType: 'Campaign', resourceId: campaign.id, changes: campaign });
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to launch campaign' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §21.3 - PATIENT EXPERIENCE, COMPLAINTS & SURVEYS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/surveys', (req: Request, res: Response) => {
  res.json({ success: true, data: satisfactionSurveys });
});

router.post('/surveys', (req: Request, res: Response) => {
  const profile = crmProfiles.find(c => c.id === req.body.crmId);
  const survey = {
    id: `SRV-${Date.now().toString().slice(-4)}`,
    name: profile ? profile.name : 'Anonymous Patient',
    surveyDate: new Date().toISOString().slice(0, 10),
    status: 'COMPLETED',
    ...req.body
  };
  satisfactionSurveys.unshift(survey);
  res.status(201).json({ success: true, data: survey });
});

router.get('/complaints', (req: Request, res: Response) => {
  res.json({ success: true, data: complaints });
});

router.post('/complaints', async (req: Request, res: Response) => {
  try {
    const item = {
      id: `CMP-${Date.now().toString().slice(-4)}`,
      resolvedDate: '—',
      status: 'UNDER_INVESTIGATION',
      ...req.body
    };
    complaints.unshift(item);
    await logAudit({ userId: (req as any).user?.id, action: 'FILE_COMPLAINT', resourceType: 'Complaint', resourceId: item.id, changes: item });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to file patient complaint' });
  }
});

router.patch('/complaints/:id/resolve', async (req: Request, res: Response) => {
  try {
    const item = complaints.find(c => c.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Complaint ticket not found' });
    item.status = 'RESOLVED';
    item.resolvedDate = new Date().toISOString().slice(0, 10);
    item.actionsTaken = req.body.actionsTaken || 'Resolved via Patient Relations service recovery.';
    await logAudit({ userId: (req as any).user?.id, action: 'RESOLVE_COMPLAINT', resourceType: 'Complaint', resourceId: item.id, changes: { status: item.status, actionsTaken: item.actionsTaken } });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resolve complaint' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §21.4 - STRATEGIC PATIENT EXPERIENCE BI
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics', (req: Request, res: Response) => {
  const totalProfiles = crmProfiles.length;
  const totalRemindersSent = reminders.length;
  const activeCases = contactCases.filter(c => c.status === 'OPEN').length;
  const totalComplaintsResolved = complaints.filter(c => c.status === 'RESOLVED').length;

  // NPS & CSAT averages
  const validSurveys = satisfactionSurveys.filter(s => s.scoreCSAT);
  const avgCSAT = validSurveys.length ? Number((validSurveys.reduce((s, u) => s + u.scoreCSAT, 0) / validSurveys.length).toFixed(1)) : 0;
  
  // Net Promoter Score calculation: Promoters (9-10) % - Detractors (0-6) %
  const promoters = satisfactionSurveys.filter(s => s.scoreNPS >= 9).length;
  const detractors = satisfactionSurveys.filter(s => s.scoreNPS <= 6).length;
  const totalNPSCount = satisfactionSurveys.length;
  const calculatedNPS = totalNPSCount ? Math.round(((promoters - detractors) / totalNPSCount) * 100) : 0;

  const responseChannelMix = [
    { name: 'WhatsApp', value: crmProfiles.filter(p => p.preferredChannel === 'WHATSAPP').length },
    { name: 'SMS', value: crmProfiles.filter(p => p.preferredChannel === 'SMS').length },
    { name: 'Email', value: crmProfiles.filter(p => p.preferredChannel === 'EMAIL').length },
  ];

  res.json({
    success: true,
    data: {
      totalProfiles,
      totalRemindersSent,
      activeCases,
      totalComplaintsResolved,
      avgCSAT,
      calculatedNPS,
      responseChannelMix
    }
  });
});

export default router;
