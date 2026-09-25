import { Router, Request, Response } from 'express';
import { logAudit } from '../utils/auditHelper.js';


const router = Router();
import { prisma } from '../prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// STATE STORES (Mock Database)
// ─────────────────────────────────────────────────────────────────────────────

let notificationLogs: any[] = [
  { id: 'NTF-001', module: 'Appointments', recipient: 'Alhaji Ibrahim Musa', type: 'SMS', eventName: 'APPOINTMENT_REMINDER', status: 'DELIVERED', date: '2026-06-28 09:30 AM', content: 'Dear Alhaji Musa, your clinic visit is scheduled for 30-Jun-2026 at 9:00AM.' },
  { id: 'NTF-002', module: 'Pharmacy', recipient: 'Mrs. Funke Adebayo', type: 'WHATSAPP', eventName: 'PRESCRIPTION_READY', status: 'SENT', date: '2026-06-28 11:15 AM', content: 'Dear Mrs. Adebayo, your chronic prescription refills are processed and ready for collection.' }
];

let communicationTemplates: any[] = [
  { id: 'TPL-01', name: 'Standard Appointment Reminder', channel: 'SMS', placeholderFields: 'patientName, apptDate, apptTime', category: 'CLINICAL', status: 'APPROVED' },
  { id: 'TPL-02', name: 'Critical Lab Alert Notification', channel: 'EMAIL', placeholderFields: 'clinicianName, patientName, labParameter, labValue', category: 'CRITICAL', status: 'APPROVED' }
];

let clinicalAlerts: any[] = [
  { id: 'ALT-101', patientName: 'Baby Joy (Neonatal IPD)', labParameter: 'Haemoglobin', value: '6.2 g/dL', severity: 'CRITICAL', clinicianName: 'Dr. Okafor', status: 'UNACKNOWLEDGED', date: '2026-06-28 14:00', escalationLevel: 0, escalationLog: 'Alert generated. Attempting primary routing to Dr. Okafor.' },
  { id: 'ALT-102', patientName: 'Alhaji Ibrahim Musa', labParameter: 'Serum Potassium', value: '7.1 mmol/L', severity: 'LIFE_THREATENING', clinicianName: 'Dr. Aliyu', status: 'ACKNOWLEDGED', date: '2026-06-28 12:30', escalationLevel: 1, escalationLog: 'Escalated to On-Call Consultant. Acknowledged by Dr. Aliyu.' }
];

let internalChats: any[] = [
  {
    id: 'MSG-101',
    sender: 'Lab Scientist (LIMS Emergency Desk)',
    recipient: 'Dr. Oladipo Adebayo',
    subject: '🚨 PANIC VALUE ALERT: Serum Potassium (K+)',
    body: 'CRITICAL LAB ALERT for Bamidele Ogunleye (MRN: P-2026-0892):\n• Test: Serum Potassium (K+)\n• Panic Result: 6.8 mmol/L (Panic High > 6.0)\n• Category: CHEMICAL_PATHOLOGY\n• Action Required: Immediate physician contact & stat ECG.',
    date: '2026-08-13 03:36 AM',
    category: 'CRITICAL_ALERT',
    priority: 'URGENT',
    read: false
  },
  {
    id: 'MSG-102',
    sender: 'Lab Scientist (LIMS Emergency Desk)',
    recipient: 'Dr. Chidi Eze',
    subject: '🚨 PANIC VALUE ALERT: Full Blood Count - Hemoglobin (Hb)',
    body: 'CRITICAL LAB ALERT for Blessing Nwosu (MRN: P-2026-0419):\n• Test: Full Blood Count - Hemoglobin (Hb)\n• Panic Result: 4.8 g/dL (Panic Low < 6.0)\n• Category: HAEMATOLOGY\n• Action Required: Immediate blood transfusion prep.',
    date: '2026-08-13 03:10 AM',
    category: 'CRITICAL_ALERT',
    priority: 'URGENT',
    read: false
  },
  {
    id: 'MSG-103',
    sender: 'Lab Scientist (LIMS Emergency Desk)',
    recipient: 'Dr. Kabiru Ibrahim',
    subject: '🚨 PANIC VALUE ALERT: Blood Culture & Sensitivity',
    body: 'CRITICAL LAB ALERT for Baby Okonkwo (MRN: P-2026-1104):\n• Test: Blood Culture & Sensitivity\n• Panic Result: POS (Gram-Negative Bacilli Growth Detected)\n• Category: MICROBIOLOGY\n• Action Required: Stat IV antibiotic administration.',
    date: '2026-08-13 02:02 AM',
    category: 'CRITICAL_ALERT',
    priority: 'URGENT',
    read: false
  },
  {
    id: 'MSG-104',
    sender: 'Lab Scientist (LIMS Emergency Desk)',
    recipient: 'Dr. Olumide Johnson',
    subject: '✅ READ-BACK ACKNOWLEDGED: Cardiac Troponin I (cTnI)',
    body: 'Verbatim Read-Back Verified & Acknowledged for Emmanuel Aderibigbe (MRN: P-2026-0771).\n• Test: Cardiac Troponin I (cTnI)\n• Result: 4.25 ng/mL (Panic High > 0.40)\n• Action Taken: Patient prepped for IV Heparin & emergency Cath Lab transfer.',
    date: '2026-08-12 11:52 PM',
    category: 'READ_BACK_LOG',
    priority: 'NORMAL',
    read: true
  },
  { id: 'MSG-001', sender: 'Pharmacist Jane (Pharmacy)', recipient: 'Super Admin', subject: 'Urgent: Paracetamol Stock Reorder', body: 'Hello Admin, our paracetamol 500mg stock is running low. Please approve the pending supplier purchase order.', date: '2026-06-24 10:15 AM', read: false },
  { id: 'MSG-002', sender: 'Dr. Okafor (Doctor)', recipient: 'Super Admin', subject: 'Lab Equipment Calibration Required', body: 'The haematology analyzer in Pathology is showing slight deviation. Technical recalibration needed by weekend.', date: '2026-06-23 03:45 PM', read: true }
];

let groupDiscussions: any[] = [
  { id: 'GRP-01', name: 'Multidisciplinary Care - Admission #2991', patientName: 'Baby Joy (Neonatal IPD)', participants: 'Dr. Okafor, Nurse Joy, Pharmacist Jane', lastMessage: 'Oxygen line saturation is stable at 96%.' }
];

let announcements: any[] = [
  { id: 'ANC-01', title: 'Planned Emergency Power Generator Maintenance', targetAudience: 'All Shift Staff', priority: 'HIGH', date: '2026-06-28', content: 'Main diesel generator servicing on 30-Jun-2026 02:00AM - 04:00AM. Secondary backup inverter will be active.', acknowledgementsCount: 45 }
];

// ─────────────────────────────────────────────────────────────────────────────
// §23.1 - NOTIFICATION ENGINE, EVENT PROCESSING & TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

router.get(['/', '/notifications'], (req: Request, res: Response) => {
  res.json({ success: true, data: notificationLogs });
});

// GET /live - Pull live activities from the database as notifications
router.get('/live', async (req: Request, res: Response) => {
  const notifications: any[] = [];
  const now = new Date();

  try {
    const recentPatients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }).catch(() => []);

    recentPatients.forEach(p => {
      notifications.push({
        id: `patient-${p.id}`,
        text: `New patient registered: ${p.firstName} ${p.lastName}`,
        createdAt: p.createdAt,
        type: 'patient',
        color: '#3b5bdb',
      });
    });
  } catch {}

  try {
    const recentAppointments = await prisma.appointment.findMany({
      include: { patient: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }).catch(() => []);

    recentAppointments.forEach(a => {
      notifications.push({
        id: `appointment-${a.id}`,
        text: `OPD appointment #${(a as any).appointmentNumber || a.id.slice(0, 6).toUpperCase()} ${String(a.status || '').toLowerCase()}`,
        createdAt: a.createdAt,
        type: 'appointment',
        color: (a.status as string) === 'CONFIRMED' || (a.status as string) === 'CHECKED_IN' || a.status === 'BOOKED' ? '#0ca678' : '#f59f00',
      });
    });
  } catch {}

  try {
    const recentInvoices = await prisma.invoice.findMany({
      include: { patient: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }).catch(() => []);

    recentInvoices.forEach(inv => {
      const patientName = inv.patient ? `${inv.patient.firstName || ''} ${inv.patient.lastName || ''}`.trim() : 'Walk-in Patient';
      notifications.push({
        id: `invoice-${inv.id}`,
        text: `Invoice #${inv.id.slice(0, 6).toUpperCase()} generated for ${patientName} (₦${inv.total || 0})`,
        createdAt: inv.createdAt,
        type: 'invoice',
        color: inv.status === 'PAID' ? '#0ca678' : '#e03131',
      });
    });
  } catch {}

  // If no DB notifications exist yet, provide standard system status events
  if (notifications.length === 0) {
    notifications.push(
      {
        id: 'sys-1',
        text: 'Hospital Management System live & operational',
        createdAt: new Date(now.getTime() - 2 * 60000).toISOString(),
        type: 'system',
        color: '#0ca678',
      },
      {
        id: 'sys-2',
        text: 'Automated database synchronization active',
        createdAt: new Date(now.getTime() - 15 * 60000).toISOString(),
        type: 'system',
        color: '#3b5bdb',
      },
      {
        id: 'sys-3',
        text: 'Financial Ledger & Statutory reporting ready',
        createdAt: new Date(now.getTime() - 45 * 60000).toISOString(),
        type: 'finance',
        color: '#7048e8',
      }
    );
  }

  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const topNotifications = notifications.slice(0, 10);

  res.json({ success: true, data: topNotifications });
});

router.post(['/', '/notifications'], async (req: Request, res: Response) => {
  try {
    const item = {
      id: `NTF-${String(notificationLogs.length + 1).padStart(3, '0')}`,
      status: 'SENT',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      ...req.body
    };
    notificationLogs.unshift(item);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
});

router.get('/templates', (req: Request, res: Response) => {
  res.json({ success: true, data: communicationTemplates });
});

router.post('/templates', async (req: Request, res: Response) => {
  try {
    const item = {
      id: `TPL-${String(communicationTemplates.length + 1).padStart(2, '0')}`,
      status: 'APPROVED',
      ...req.body
    };
    communicationTemplates.unshift(item);
    await logAudit({ userId: (req as any).user?.id, action: 'CREATE_MESSAGE_TEMPLATE', resourceType: 'CommTemplate', resourceId: item.id, changes: item });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create template' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §23.2 - CLINICAL ALERTS & ESCALATION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

router.get('/alerts', (req: Request, res: Response) => {
  res.json({ success: true, data: clinicalAlerts });
});

router.post('/alerts', async (req: Request, res: Response) => {
  try {
    const item = {
      id: `ALT-${Date.now().toString().slice(-3)}`,
      status: 'UNACKNOWLEDGED',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      escalationLevel: 0,
      escalationLog: 'Critical value trigger. Attempting primary clinician alert.',
      ...req.body
    };
    clinicalAlerts.unshift(item);
    await logAudit({ userId: (req as any).user?.id, action: 'TRIGGER_CLINICAL_ALERT', resourceType: 'ClinicalAlert', resourceId: item.id, changes: item });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate alert' });
  }
});

router.patch('/alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const alert = clinicalAlerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    alert.status = 'ACKNOWLEDGED';
    alert.escalationLog = `Acknowledged by ${req.body.clinicianName || 'Attending Staff'} on ${new Date().toISOString().substring(0, 19)}`;
    await logAudit({ userId: (req as any).user?.id, action: 'ACKNOWLEDGE_CLINICAL_ALERT', resourceType: 'ClinicalAlert', resourceId: alert.id });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to acknowledge alert' });
  }
});

router.patch('/alerts/:id/escalate', async (req: Request, res: Response) => {
  try {
    const alert = clinicalAlerts.find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    alert.escalationLevel += 1;
    alert.escalationLog = `Escalation Level ${alert.escalationLevel} triggered. Routed to department coordinator.`;
    await logAudit({ userId: (req as any).user?.id, action: 'ESCALATE_CLINICAL_ALERT', resourceType: 'ClinicalAlert', resourceId: alert.id });
    res.json({ success: true, data: alert });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to escalate alert' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// §23.3 - INTERNAL CHAT, GROUPS & ANNOUNCEMENTS BOARD
// ─────────────────────────────────────────────────────────────────────────────

router.get('/chats', (req: Request, res: Response) => {
  res.json({ success: true, data: internalChats });
});

router.post('/chats', (req: Request, res: Response) => {
  const item = {
    id: `MSG-${Date.now().toString().slice(-4)}`,
    sender: 'Super Admin',
    date: new Date().toLocaleString(),
    read: true,
    ...req.body
  };
  internalChats.unshift(item);
  res.status(201).json({ success: true, data: item });
});

router.get('/groups', (req: Request, res: Response) => {
  res.json({ success: true, data: groupDiscussions });
});

router.post('/groups', (req: Request, res: Response) => {
  const item = {
    id: `GRP-${String(groupDiscussions.length + 1).padStart(2, '0')}`,
    lastMessage: 'Room created.',
    ...req.body
  };
  groupDiscussions.unshift(item);
  res.status(201).json({ success: true, data: item });
});

router.get('/announcements', (req: Request, res: Response) => {
  res.json({ success: true, data: announcements });
});

router.post('/announcements', async (req: Request, res: Response) => {
  try {
    const item = {
      id: `ANC-${String(announcements.length + 1).padStart(2, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      acknowledgementsCount: 0,
      ...req.body
    };
    announcements.unshift(item);
    await logAudit({ userId: (req as any).user?.id, action: 'PUBLISH_ANNOUNCEMENT', resourceType: 'Announcement', resourceId: item.id, changes: item });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to publish announcement' });
  }
});

router.patch('/announcements/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const item = announcements.find(a => a.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Announcement not found' });
    item.acknowledgementsCount = (item.acknowledgementsCount || 0) + 1;
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to acknowledge announcement' });
  }
});

router.post('/groups/:id/messages', (req: Request, res: Response) => {
  const grp = groupDiscussions.find(g => g.id === req.params.id);
  if (!grp) return res.status(404).json({ success: false, message: 'Group not found' });
  if (!grp.messages) grp.messages = [];
  const msg = {
    id: `GMSG-${Date.now().toString().slice(-4)}`,
    sender: req.body.sender || 'Dr. Okafor',
    text: req.body.text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  grp.messages.push(msg);
  grp.lastMessage = `${msg.sender}: ${msg.text}`;
  res.status(201).json({ success: true, data: msg });
});

// ─────────────────────────────────────────────────────────────────────────────
// §23.4 - OPERATIONS BI ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/analytics', (req: Request, res: Response) => {
  const totalCount = notificationLogs.length;
  const criticalCount = clinicalAlerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'LIFE_THREATENING').length;
  const pendingAlerts = clinicalAlerts.filter(a => a.status === 'UNACKNOWLEDGED').length;
  const announcementsCount = announcements.length;

  const distributionByChannel = [
    { name: 'SMS Alerts', value: notificationLogs.filter(n => n.type === 'SMS').length },
    { name: 'WhatsApp Link', value: notificationLogs.filter(n => n.type === 'WHATSAPP').length },
    { name: 'Email portal', value: notificationLogs.filter(n => n.type === 'EMAIL').length },
  ];

  res.json({
    success: true,
    data: {
      totalCount,
      criticalCount,
      pendingAlerts,
      announcementsCount,
      distributionByChannel
    }
  });
});

export default router;
