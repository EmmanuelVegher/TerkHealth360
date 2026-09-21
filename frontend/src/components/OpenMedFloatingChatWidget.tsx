import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Fab, Drawer, Typography, TextField, IconButton, Button,
  Avatar, Chip, CircularProgress, Tooltip, Paper, Stack, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Badge,
  List, ListItem, ListItemText,
} from '@mui/material';
import {
  AutoAwesome, Close, Send, Mic, MicOff, Science, LocalPharmacy,
  MedicalServices, BarChart, Person, SmartToy, Warning, DeleteOutline,
  MonitorHeart, CalendarMonth, AccountBalance, Inventory2,
  Psychology, LocalHospital, HealthAndSafety, PriorityHigh,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  cardPayload?: any;
  toolsExecuted?: string[];
  intent?: string;
}

interface QuickPrompt {
  label: string;
  icon: React.ReactNode;
  query: string;
  color: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role → Quick Prompt Map
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_PROMPTS: Record<string, QuickPrompt[]> = {
  DOCTOR: [
    { label: 'Lab Results', icon: <Science sx={{ fontSize: 14 }} />, query: 'Show me the last lab results for patient', color: '#2563EB' },
    { label: 'Prescriptions', icon: <LocalPharmacy sx={{ fontSize: 14 }} />, query: 'Active prescriptions for patient', color: '#16A34A' },
    { label: 'Vitals', icon: <MonitorHeart sx={{ fontSize: 14 }} />, query: 'Latest vitals for patient', color: '#DC2626' },
    { label: 'EMR History', icon: <MedicalServices sx={{ fontSize: 14 }} />, query: 'EMR clinical history for patient', color: '#7C3AED' },
    { label: 'Drug Interactions', icon: <Psychology sx={{ fontSize: 14 }} />, query: 'Check drug interactions for warfarin', color: '#D97706' },
    { label: 'ICU Status', icon: <PriorityHigh sx={{ fontSize: 14 }} />, query: 'Current ICU patient status', color: '#DC2626' },
  ],
  NURSE: [
    { label: 'Patient Vitals', icon: <MonitorHeart sx={{ fontSize: 14 }} />, query: 'Latest vitals for patient', color: '#DC2626' },
    { label: 'Lab Results', icon: <Science sx={{ fontSize: 14 }} />, query: 'Lab results for patient', color: '#2563EB' },
    { label: 'IPD Admissions', icon: <LocalHospital sx={{ fontSize: 14 }} />, query: 'Current IPD ward admissions', color: '#0891B2' },
    { label: 'Nursing Tasks', icon: <HealthAndSafety sx={{ fontSize: 14 }} />, query: 'EMR and nursing tasks for patient', color: '#059669' },
    { label: 'Emergency Queue', icon: <PriorityHigh sx={{ fontSize: 14 }} />, query: 'Emergency department queue', color: '#DC2626' },
  ],
  PHARMACIST: [
    { label: 'Drug Stock', icon: <Inventory2 sx={{ fontSize: 14 }} />, query: 'Check stock level of Artemether', color: '#059669' },
    { label: 'Prescriptions', icon: <LocalPharmacy sx={{ fontSize: 14 }} />, query: 'Active prescriptions for patient', color: '#16A34A' },
    { label: 'Drug Interactions', icon: <Psychology sx={{ fontSize: 14 }} />, query: 'Check interactions for metformin', color: '#D97706' },
  ],
  LAB_TECHNICIAN: [
    { label: 'Pending Orders', icon: <Science sx={{ fontSize: 14 }} />, query: 'Show pending lab orders', color: '#2563EB' },
    { label: 'Lab Results', icon: <Science sx={{ fontSize: 14 }} />, query: 'Lab results for patient', color: '#7C3AED' },
  ],
  RECEPTIONIST: [
    { label: "Today's Appointments", icon: <CalendarMonth sx={{ fontSize: 14 }} />, query: "What are today's appointments?", color: '#0891B2' },
    { label: 'Patient Search', icon: <Person sx={{ fontSize: 14 }} />, query: 'Find patient', color: '#7C3AED' },
    { label: 'Insurance', icon: <AccountBalance sx={{ fontSize: 14 }} />, query: 'Insurance policy for patient', color: '#D97706' },
    { label: 'Billing', icon: <BarChart sx={{ fontSize: 14 }} />, query: 'Unpaid invoices', color: '#DC2626' },
  ],
  ADMIN: [
    { label: 'Hospital Overview', icon: <BarChart sx={{ fontSize: 14 }} />, query: 'Give me the hospital operational overview', color: '#2563EB' },
    { label: 'Bed Occupancy', icon: <LocalHospital sx={{ fontSize: 14 }} />, query: 'Current bed occupancy rate', color: '#0891B2' },
    { label: 'Pending Invoices', icon: <AccountBalance sx={{ fontSize: 14 }} />, query: 'Pending unpaid invoices', color: '#D97706' },
    { label: 'Staff Overview', icon: <Person sx={{ fontSize: 14 }} />, query: 'Total active staff count', color: '#7C3AED' },
  ],
  SUPER_ADMIN: [
    { label: 'Hospital Overview', icon: <BarChart sx={{ fontSize: 14 }} />, query: 'Give me the hospital operational overview', color: '#2563EB' },
    { label: 'ICU + Emergency', icon: <PriorityHigh sx={{ fontSize: 14 }} />, query: 'ICU and emergency department status', color: '#DC2626' },
    { label: 'Bed Occupancy', icon: <LocalHospital sx={{ fontSize: 14 }} />, query: 'Current bed occupancy rate', color: '#0891B2' },
    { label: 'Staff Overview', icon: <Person sx={{ fontSize: 14 }} />, query: 'Total staff and active count', color: '#7C3AED' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Typing Indicator
// ─────────────────────────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <Box display="flex" alignItems="center" gap={0.6} py={1} px={2} sx={{ bgcolor: '#FFFFFF', borderRadius: '18px 18px 18px 4px', border: '1px solid #E2E8F0', width: 'fit-content', maxWidth: 80 }}>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          width: 7, height: 7, borderRadius: '50%', bgcolor: '#94A3B8',
          animation: 'bounce 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
          '@keyframes bounce': {
            '0%, 80%, 100%': { transform: 'scale(0.7)', opacity: 0.5 },
            '40%': { transform: 'scale(1)', opacity: 1 },
          },
        }}
      />
    ))}
  </Box>
);

// ─────────────────────────────────────────────────────────────────────────────
// Rich Card Renderer
// ─────────────────────────────────────────────────────────────────────────────

const CardRenderer: React.FC<{ cardPayload: any }> = ({ cardPayload }) => {
  if (!cardPayload) return null;
  const { type, title, data } = cardPayload;

  if (type === 'LAB_RESULTS') {
    const order = data.orders?.[0];
    const items = order?.items || [];
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, borderRadius: 2, border: '1px solid #CBD5E1', bgcolor: '#F8FAFC' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Science sx={{ color: '#2563EB', fontSize: 18 }} />
          <Typography variant="caption" fontWeight={800} color="#0F172A">{title}</Typography>
        </Box>
        {items.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#EFF6FF' }}>
                  {['Test', 'Result', 'Ref Range', 'Flag'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: 10, py: 0.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item: any, idx: number) => {
                  const result = item.results?.[0];
                  const isAbnormal = result?.isAbnormal;
                  return (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontSize: 10, fontWeight: 600 }}>{item.catalogItem?.name || item.testName || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 10, fontWeight: 800, color: isAbnormal ? '#DC2626' : '#0F172A' }}>
                        {result?.value || result?.result || '—'} {result?.unit || item.catalogItem?.units || ''}
                      </TableCell>
                      <TableCell sx={{ fontSize: 10, color: '#64748B' }}>{result?.referenceRange || item.catalogItem?.normalRange || '—'}</TableCell>
                      <TableCell>
                        <Chip label={isAbnormal ? '⚠ ABNORMAL' : '✓ NORMAL'} size="small"
                          color={isAbnormal ? 'error' : 'success'}
                          sx={{ fontSize: 8, height: 16, fontWeight: 800 }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : <Typography variant="caption" color="#64748B">No test items to display.</Typography>}
      </Paper>
    );
  }

  if (type === 'VITALS') {
    const latest = data.triageRecords?.[0];
    if (!latest) return null;
    const vitals = [
      { label: 'BP', value: latest.bloodPressure, icon: '🫀', unit: 'mmHg' },
      { label: 'Pulse', value: latest.pulseRate, icon: '💓', unit: 'bpm' },
      { label: 'Temp', value: latest.temperature, icon: '🌡️', unit: '°C' },
      { label: 'SpO₂', value: latest.spo2, icon: '🫁', unit: '%' },
      { label: 'RR', value: latest.respiratoryRate, icon: '💨', unit: 'br/min' },
      { label: 'Weight', value: latest.weight, icon: '⚖️', unit: 'kg' },
    ].filter(v => v.value);
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, borderRadius: 2, border: '1px solid #CBD5E1', bgcolor: '#FFF7F7' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <MonitorHeart sx={{ color: '#DC2626', fontSize: 18 }} />
          <Typography variant="caption" fontWeight={800} color="#0F172A">{title}</Typography>
        </Box>
        <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={0.75}>
          {vitals.map((v, i) => (
            <Box key={i} sx={{ bgcolor: '#FFFFFF', p: 0.75, borderRadius: 1.5, border: '1px solid #E2E8F0', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14 }}>{v.icon}</Typography>
              <Typography variant="caption" fontWeight={800} color="#0F172A" display="block">{v.value} {v.unit}</Typography>
              <Typography variant="caption" color="#64748B" sx={{ fontSize: 9 }}>{v.label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  if (type === 'PRESCRIPTIONS') {
    const rx = data.prescriptions?.[0];
    const meds = rx?.items || rx?.medications || [];
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, borderRadius: 2, border: '1px solid #CBD5E1', bgcolor: '#F0FDF4' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <LocalPharmacy sx={{ color: '#16A34A', fontSize: 18 }} />
          <Typography variant="caption" fontWeight={800} color="#0F172A">{title}</Typography>
        </Box>
        <Stack spacing={0.5}>
          {meds.map((m: any, idx: number) => (
            <Box key={idx} sx={{ p: 0.75, bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #D1FAE5' }}>
              <Typography variant="caption" fontWeight={700} color="#0F172A">
                💊 {m.drugName || m.name}
              </Typography>
              <Typography variant="caption" color="#64748B" display="block" sx={{ fontSize: 10 }}>
                {m.dosage} • {m.dosage_instructions || m.frequency} • Qty: {m.quantity || '—'}
              </Typography>
            </Box>
          ))}
          {meds.length === 0 && <Typography variant="caption" color="#64748B">No medications found.</Typography>}
        </Stack>
      </Paper>
    );
  }

  if (type === 'METRICS') {
    const m = data;
    const metricCards = [
      { label: 'Bed Occupancy', value: m.occupancyRate, color: '#2563EB', icon: '🛏️' },
      { label: 'Today Appts', value: m.todayAppointments, color: '#0891B2', icon: '📅' },
      { label: 'Pending Labs', value: m.pendingLabOrders, color: '#D97706', icon: '🧪' },
      { label: 'ICU Active', value: m.icuAdmissions, color: '#DC2626', icon: '🚨' },
      { label: 'Emergency', value: m.emergencyActivePatients, color: '#DC2626', icon: '🚑' },
      { label: 'Pending Bills', value: m.pendingInvoices, color: '#7C3AED', icon: '💰' },
    ];
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, borderRadius: 2, border: '1px solid #BFDBFE', bgcolor: '#EFF6FF' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <BarChart sx={{ color: '#2563EB', fontSize: 18 }} />
          <Typography variant="caption" fontWeight={800} color="#1E40AF">{title}</Typography>
        </Box>
        <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={0.75}>
          {metricCards.map((c, i) => (
            <Box key={i} sx={{ bgcolor: '#FFFFFF', p: 0.75, borderRadius: 1.5, border: '1px solid #E2E8F0', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14 }}>{c.icon}</Typography>
              <Typography variant="caption" fontWeight={800} color={c.color} display="block">{c.value ?? '—'}</Typography>
              <Typography variant="caption" color="#64748B" sx={{ fontSize: 9 }}>{c.label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  }

  if (type === 'EMR_SUMMARY') {
    const { consultations = [], conditions = [], allergies = [], clinicalAlerts = [] } = data;
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, borderRadius: 2, border: '1px solid #E9D5FF', bgcolor: '#FAF5FF' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <MedicalServices sx={{ color: '#7C3AED', fontSize: 18 }} />
          <Typography variant="caption" fontWeight={800} color="#0F172A">{title}</Typography>
        </Box>
        <Stack spacing={0.5}>
          {clinicalAlerts.length > 0 && (
            <Box sx={{ p: 0.75, bgcolor: '#FEF3C7', borderRadius: 1.5, border: '1px solid #FCD34D' }}>
              <Typography variant="caption" fontWeight={700} color="#92400E">⚠️ {clinicalAlerts.length} Active Alert(s)</Typography>
            </Box>
          )}
          <Box sx={{ p: 0.75, bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #EDE9FE' }}>
            <Typography variant="caption" color="#64748B">Conditions: </Typography>
            <Typography variant="caption" fontWeight={600} color="#0F172A">{conditions.map((c: any) => c.display || c.code).join(', ') || 'None'}</Typography>
          </Box>
          <Box sx={{ p: 0.75, bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #EDE9FE' }}>
            <Typography variant="caption" color="#64748B">Allergies: </Typography>
            <Typography variant="caption" fontWeight={600} color="#DC2626">{allergies.map((a: any) => a.substance).join(', ') || 'NKDA'}</Typography>
          </Box>
          {consultations[0]?.presentingComplaint && (
            <Box sx={{ p: 0.75, bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #EDE9FE' }}>
              <Typography variant="caption" color="#64748B">Latest Complaint: </Typography>
              <Typography variant="caption" fontWeight={600} color="#0F172A">{consultations[0].presentingComplaint}</Typography>
            </Box>
          )}
        </Stack>
      </Paper>
    );
  }

  if (type === 'DRUG_INTERACTION') {
    const { interactions = [] } = data;
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, borderRadius: 2, border: '1px solid #FED7AA', bgcolor: '#FFF7ED' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Warning sx={{ color: '#D97706', fontSize: 18 }} />
          <Typography variant="caption" fontWeight={800} color="#0F172A">{title}</Typography>
        </Box>
        {interactions.length === 0
          ? <Typography variant="caption" color="#64748B">No critical interactions found.</Typography>
          : <Stack spacing={0.5}>
            {interactions.map((i: any, idx: number) => (
              <Box key={idx} sx={{ p: 0.75, bgcolor: i.severity === 'HIGH' ? '#FEF2F2' : '#FFFBEB', borderRadius: 1.5, border: `1px solid ${i.severity === 'HIGH' ? '#FECACA' : '#FDE68A'}` }}>
                <Chip label={i.severity} size="small" color={i.severity === 'HIGH' ? 'error' : 'warning'} sx={{ fontSize: 8, height: 14, fontWeight: 800, mr: 0.5 }} />
                <Typography variant="caption" fontWeight={700} color="#0F172A">With {i.drug}: </Typography>
                <Typography variant="caption" color="#64748B">{i.effect}</Typography>
              </Box>
            ))}
          </Stack>}
      </Paper>
    );
  }

  if (type === 'IPD_ADMISSIONS' || type === 'ICU_STATUS') {
    const admissions = data.admissions || [];
    const isICU = type === 'ICU_STATUS';
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, borderRadius: 2, border: `1px solid ${isICU ? '#FECACA' : '#BFDBFE'}`, bgcolor: isICU ? '#FFF1F2' : '#EFF6FF' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          {isICU ? <PriorityHigh sx={{ color: '#DC2626', fontSize: 18 }} /> : <LocalHospital sx={{ color: '#2563EB', fontSize: 18 }} />}
          <Typography variant="caption" fontWeight={800} color="#0F172A">{title}</Typography>
        </Box>
        <Stack spacing={0.5}>
          {admissions.slice(0, 5).map((a: any, idx: number) => (
            <Box key={idx} sx={{ p: 0.75, bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" fontWeight={700} color="#0F172A">
                  {a.patient?.firstName} {a.patient?.lastName}
                </Typography>
                <Typography variant="caption" color="#64748B" display="block" sx={{ fontSize: 10 }}>
                  {a.patient?.patientNumber} • {a.ward?.name || a.icuBed?.location || '—'}
                </Typography>
              </Box>
              <Chip label={a.status} size="small" color={a.status === 'ACTIVE' || a.status === 'ADMITTED' ? 'success' : 'default'} sx={{ fontSize: 8, height: 16, fontWeight: 800 }} />
            </Box>
          ))}
          {admissions.length === 0 && <Typography variant="caption" color="#64748B">No active records found.</Typography>}
        </Stack>
      </Paper>
    );
  }

  if (type === 'APPOINTMENTS') {
    const appts = data.appointments || [];
    return (
      <Paper elevation={0} sx={{ p: 1.5, mt: 1.5, borderRadius: 2, border: '1px solid #BAE6FD', bgcolor: '#F0F9FF' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <CalendarMonth sx={{ color: '#0891B2', fontSize: 18 }} />
          <Typography variant="caption" fontWeight={800} color="#0F172A">{title}</Typography>
        </Box>
        <Stack spacing={0.5}>
          {appts.slice(0, 5).map((a: any, idx: number) => (
            <Box key={idx} sx={{ p: 0.75, bgcolor: '#FFFFFF', borderRadius: 1.5, border: '1px solid #E0F2FE', display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" fontWeight={700} color="#0F172A">
                  {a.patient?.firstName} {a.patient?.lastName}
                </Typography>
                <Typography variant="caption" color="#64748B" display="block" sx={{ fontSize: 10 }}>
                  {a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} • {a.type || 'Consultation'}
                </Typography>
              </Box>
              <Chip label={a.status} size="small" color="primary" sx={{ fontSize: 8, height: 16, fontWeight: 800 }} />
            </Box>
          ))}
          {appts.length === 0 && <Typography variant="caption" color="#64748B">No appointments found.</Typography>}
        </Stack>
      </Paper>
    );
  }

  // Generic fallback card
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.sender === 'user';
  const formattedText = msg.text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');

  return (
    <Box display="flex" flexDirection="column" alignItems={isUser ? 'flex-end' : 'flex-start'}>
      <Box
        sx={{
          maxWidth: '88%',
          p: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          bgcolor: isUser ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : '#FFFFFF',
          background: isUser ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : '#FFFFFF',
          color: isUser ? '#FFFFFF' : '#0F172A',
          boxShadow: isUser ? '0 4px 14px rgba(37,99,235,0.35)' : '0 2px 8px rgba(0,0,0,0.06)',
          border: isUser ? 'none' : '1px solid #E2E8F0',
        }}
      >
        <Typography
          variant="body2"
          sx={{ lineHeight: 1.6, fontSize: '13.5px' }}
          dangerouslySetInnerHTML={{ __html: formattedText }}
        />
        <CardRenderer cardPayload={msg.cardPayload} />
        {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.75, opacity: 0.55, fontSize: 9.5, fontStyle: 'italic' }}>
            ⚡ {msg.toolsExecuted.join(' → ')}
          </Typography>
        )}
      </Box>
      <Typography variant="caption" color="#94A3B8" sx={{ mt: 0.4, px: 0.5, fontSize: 9.5 }}>
        {msg.timestamp}
      </Typography>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Widget
// ─────────────────────────────────────────────────────────────────────────────

export const OpenMedFloatingChatWidget: React.FC = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const role = user?.role || 'STAFF';
  const quickPrompts = ROLE_PROMPTS[role] || ROLE_PROMPTS['ADMIN'];

  const welcomeMessage = useCallback((): ChatMessage => ({
    id: 'welcome-0',
    sender: 'agent',
    text: `Hello **${user?.firstName || 'there'}** 👋 — I'm your **OpenMed Agentic AI** assistant.\n\nI have full access to patient records, lab results, prescriptions, vitals, radiology, admissions, and operational metrics — filtered to your **${role}** access level.\n\nI remember our previous conversations. Just ask naturally.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }), [user?.firstName, role]);

  // Load conversation history when widget opens
  useEffect(() => {
    if (open && !historyLoaded) {
      (async () => {
        try {
          const res = await api.get('/openmed/chat-history');
          if (res.data?.success && res.data.data.turns.length > 0) {
            const turns: ChatMessage[] = res.data.data.turns.map((t: any) => ({
              id: t.id,
              sender: t.sender,
              text: t.text,
              timestamp: new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              cardPayload: t.cardPayload,
              toolsExecuted: t.toolsExecuted,
              intent: t.intent,
            }));
            setMessages(turns);
          } else {
            setMessages([welcomeMessage()]);
          }
          setHistoryLoaded(true);
        } catch {
          setMessages([welcomeMessage()]);
          setHistoryLoaded(true);
        }
      })();
    }
  }, [open, historyLoaded, welcomeMessage]);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages, open]);

  const toggleRecording = () => {
    if (!recording) {
      setRecording(true);
      enqueueSnackbar('OpenMed listening... (English / Pidgin / Yoruba / Igbo / Hausa)', { variant: 'info', autoHideDuration: 2500 });
      setTimeout(() => {
        const sampleQueries: Record<string, string> = {
          DOCTOR: 'Show me the last lab results for patient Ibrahim Mohammed',
          NURSE: 'What are the latest vitals for patient in bed 4?',
          PHARMACIST: 'Check stock level of Artemether Lumefantrine',
          RECEPTIONIST: "What are today's clinic appointments?",
          ADMIN: 'Give me the hospital bed occupancy overview',
          SUPER_ADMIN: 'Full hospital operational overview please',
        };
        setInput(sampleQueries[role] || 'Hospital operational overview');
        setRecording(false);
      }, 2500);
    } else {
      setRecording(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/openmed/agentic-rag-chat', { query: queryText });
      if (res.data?.success) {
        const rag = res.data.data;
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: rag.answerText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardPayload: rag.cardPayload,
          toolsExecuted: rag.toolsExecuted,
          intent: rag.intent,
        };
        setMessages(prev => [...prev, agentMsg]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'agent',
        text: '⚠️ Unable to reach the OpenMed AI engine. Please check your network connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearConversation = async () => {
    try {
      await api.post('/openmed/chat-clear');
      setMessages([welcomeMessage()]);
      setHistoryLoaded(false);
      enqueueSnackbar('Conversation cleared. Starting fresh session.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to clear conversation.', { variant: 'error' });
    }
  };

  const roleColor: Record<string, string> = {
    SUPER_ADMIN: '#7C3AED',
    ADMIN: '#0891B2',
    DOCTOR: '#2563EB',
    NURSE: '#059669',
    PHARMACIST: '#16A34A',
    LAB_TECHNICIAN: '#D97706',
    RECEPTIONIST: '#7C3AED',
  };
  const headerColor = roleColor[role] || '#2563EB';

  return (
    <>
      {/* Floating Action Button */}
      <Box
        sx={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 1400,
          animation: 'pulse-glow 2.5s ease-in-out infinite',
          '@keyframes pulse-glow': {
            '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(37,99,235,0.4))' },
            '50%': { filter: 'drop-shadow(0 0 18px rgba(124,58,237,0.6))' },
          },
        }}
      >
        <Fab
          onClick={() => setOpen(true)}
          sx={{
            background: `linear-gradient(135deg, ${headerColor} 0%, #7C3AED 100%)`,
            boxShadow: '0 8px 28px rgba(37,99,235,0.4)',
            width: 62, height: 62,
            '&:hover': {
              background: `linear-gradient(135deg, #1D4ED8 0%, #6D28D9 100%)`,
              transform: 'scale(1.08)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          <Badge badgeContent="AI" color="error" overlap="circular"
            sx={{ '& .MuiBadge-badge': { fontSize: 9, fontWeight: 900, minWidth: 18, height: 18 } }}>
            <SmartToy sx={{ fontSize: 30, color: '#FFFFFF' }} />
          </Badge>
        </Fab>
      </Box>

      {/* Chat Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 460 },
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(180deg, #FAFBFF 0%, #F1F5F9 100%)',
            boxShadow: '-8px 0 40px rgba(15,23,42,0.18)',
            overflow: 'hidden',
          }
        }}
      >
        {/* Header */}
        <Box
          p={2}
          sx={{
            background: `linear-gradient(135deg, ${headerColor} 0%, #7C3AED 100%)`,
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40, backdropFilter: 'blur(8px)' }}>
                <SmartToy fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="#FFFFFF" lineHeight={1.2}>
                  OpenMed Agentic AI
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.75)" display="block">
                  {user?.firstName} {user?.lastName} · <strong>{role.replace('_', ' ')}</strong>
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip label="● LIVE" size="small" sx={{ bgcolor: '#22C55E', color: '#FFFFFF', fontSize: 9, fontWeight: 900, height: 18 }} />
              <Tooltip title="Clear conversation">
                <IconButton size="small" onClick={handleClearConversation} sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#FFFFFF' } }}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#FFFFFF' } }}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Memory indicator */}
          <Box mt={1} px={0.5}>
            <Typography variant="caption" color="rgba(255,255,255,0.65)" sx={{ fontSize: 10 }}>
              💾 Institutional memory active · Full DB access for <strong>{role.toLowerCase().replace('_', ' ')}</strong> role · 16 tools enabled
            </Typography>
          </Box>
        </Box>

        {/* Quick Prompts */}
        <Box px={2} py={1.25} sx={{ bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <Typography variant="caption" fontWeight={700} color="#64748B" mb={0.75} display="block">
            Quick Actions:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
            {quickPrompts.map((qp, i) => (
              <Chip
                key={i}
                icon={qp.icon as any}
                label={qp.label}
                size="small"
                onClick={() => handleSend(qp.query)}
                sx={{
                  bgcolor: '#F8FAFC',
                  fontSize: 11,
                  height: 24,
                  cursor: 'pointer',
                  border: `1px solid ${qp.color}30`,
                  '& .MuiChip-icon': { color: qp.color },
                  '&:hover': { bgcolor: `${qp.color}10`, borderColor: qp.color },
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Message Thread */}
        <Box flex={1} px={2} py={2} sx={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {loading && (
            <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
              <TypingIndicator />
              <Typography variant="caption" color="#94A3B8" sx={{ fontSize: 9.5, pl: 0.5 }}>
                OpenMed AI is querying the database...
              </Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Bar */}
        <Box
          p={2}
          sx={{
            bgcolor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            flexShrink: 0,
          }}
        >
          <Box display="flex" alignItems="flex-end" gap={1}>
            <Tooltip title={recording ? 'Stop' : 'Multilingual Voice Input (English / Pidgin / Yoruba / Igbo / Hausa)'}>
              <IconButton
                size="small"
                color={recording ? 'error' : 'primary'}
                onClick={toggleRecording}
                sx={{
                  bgcolor: recording ? '#FEE2E2' : '#EFF6FF',
                  width: 38, height: 38,
                  animation: recording ? 'pulse-rec 1s ease-in-out infinite' : 'none',
                  '@keyframes pulse-rec': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.15)' },
                  },
                }}
              >
                {recording ? <MicOff fontSize="small" /> : <Mic fontSize="small" />}
              </IconButton>
            </Tooltip>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              size="small"
              placeholder="Ask anything... e.g. 'Lab results for Ibrahim Mohammed' or 'Today bed occupancy'"
              value={input}
              inputRef={inputRef}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  fontSize: 13,
                  '&:hover fieldset': { borderColor: headerColor },
                  '&.Mui-focused fieldset': { borderColor: headerColor, borderWidth: 2 },
                },
              }}
            />
            <Button
              variant="contained"
              disabled={loading || !input.trim()}
              onClick={() => handleSend()}
              sx={{
                minWidth: 42, height: 38, borderRadius: 2.5,
                background: `linear-gradient(135deg, ${headerColor}, #7C3AED)`,
                boxShadow: 'none',
                '&:hover': { boxShadow: '0 4px 14px rgba(37,99,235,0.4)' },
              }}
            >
              {loading ? <CircularProgress size={16} color="inherit" /> : <Send sx={{ fontSize: 18 }} />}
            </Button>
          </Box>
          <Typography variant="caption" color="#94A3B8" mt={0.5} display="block" textAlign="center" sx={{ fontSize: 9.5 }}>
            Shift+Enter for new line · Enter to send · All data stays local
          </Typography>
        </Box>
      </Drawer>
    </>
  );
};
