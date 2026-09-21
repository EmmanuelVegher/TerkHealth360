import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Tabs, Tab, Button, TextField,
  MenuItem, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert,
  LinearProgress, Divider, IconButton, Stack, Avatar, Tooltip, Badge,
  InputAdornment, List, ListItem, ListItemText, ListItemAvatar, Drawer
} from '@mui/material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  Mail, Send, Search, Refresh, Add, Delete, Reply, NotificationsActive,
  Chat, Group, Campaign, Sms, Drafts, Settings, HeadsetMic,
  Warning, CheckCircle, ReportProblem, Stars, LibraryBooks, FileDownload, Assessment,
  Visibility, PhoneInTalk, FilterList, MedicalServices, Check, ArrowForward, VerifiedUser
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

// ─── Design Tokens & Theme Formatting ────────────────────────────────────────
const PRIMARY = '#1e3a8a';
const SECONDARY = '#3b82f6';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';
const PURPLE = '#7c3aed';
const TEAL = '#0d9488';
const GOLD = '#ca8a04';

const CHART_COLORS = ['#3b82f6', '#7c3aed', '#0d9488', '#ea580c', '#1e3a8a', '#16a34a'];

// ─── Sub-Tab Panel Helper ────────────────────────────────────────────────────
function TabPanel({ children, value, index }: any) {
  return value === index ? <Box sx={{ pt: 2.5 }}>{children}</Box> : null;
}

// ─── KPI Card Component ──────────────────────────────────────────────────────
const KPICard = ({ title, value, sub, icon, color }: any) => (
  <Card sx={{
    background: `linear-gradient(135deg, ${color}ee, ${color}aa)`,
    color: '#fff', borderRadius: 3, boxShadow: `0 8px 32px ${color}33`,
    position: 'relative', overflow: 'hidden', transition: 'transform 0.2s',
    '&:hover': { transform: 'translateY(-3px)' }
  }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>{title}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</Typography>
          {sub && <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.5, fontWeight: 500 }}>{sub}</Typography>}
        </Box>
        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.22)', width: 48, height: 48 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

const StatusChip = ({ label }: { label: string }) => {
  let color: 'success' | 'info' | 'warning' | 'error' | 'default' = 'default';
  const l = label?.toUpperCase() || '';
  if (['DELIVERED', 'APPROVED', 'ACKNOWLEDGED', 'PUBLISHED', 'SENT', 'ONLINE'].includes(l)) color = 'success';
  if (['PENDING_APPROVAL', 'UNACKNOWLEDGED', 'UNDER_REVIEW', 'SMS', 'WHATSAPP', 'MEDIUM'].includes(l)) color = 'warning';
  if (['CRITICAL', 'LIFE_THREATENING', 'FAILED', 'HIGH', 'EMERGENCY'].includes(l)) color = 'error';
  if (['EMAIL', 'CLINICAL', 'INFO', 'SYSTEM'].includes(l)) color = 'info';

  return <Chip label={label?.replace('_', ' ')} size="small" color={color} sx={{ fontWeight: 700, fontSize: '0.68rem', borderRadius: 1.5 }} />;
};

const RECIPIENTS = [
  'Dr. Okafor (Doctor - ICU)',
  'Dr. Aliyu (OPD Lead)',
  'Nurse Joy (ICU Supervisor)',
  'Pharmacist Jane (Pharmacy)',
  'Billing Officer Mark (Billing)',
  'Super Admin (Administration)',
  'Dr. Emmanuel Vegher (Medical Director)',
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN NOTIFICATIONS & MESSAGES COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Messages = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── Data States ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});

  // ─── Interactive Dialog & Drawer States ──────────────────────────────────
  const [composeOpen, setComposeOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState<any>(null);
  const [notificationDetailOpen, setNotificationDetailOpen] = useState<any>(null);

  // Active selections
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [activeGroup, setActiveGroup] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [groupMsgText, setGroupMsgText] = useState('');

  // ─── Sub-Tab Index States ──────────────────────────────────────────────────
  const [subTab0, setSubTab0] = useState(0); // 0=Chats 1=Groups 2=Announcements
  const [subTab1, setSubTab1] = useState(0); // 0=Logs 1=Templates

  // ─── Filter & Search Queries ──────────────────────────────────────────────
  const [searchChat, setSearchChat] = useState('');
  const [chatFilter, setChatFilter] = useState<'ALL' | 'UNREAD' | 'SENT'>('ALL');
  const [searchLog, setSearchLog] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [searchTemplate, setSearchTemplate] = useState('');
  const [searchAlert, setSearchAlert] = useState('');

  // ─── Fetch All Data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [noRes, teRes, alRes, chRes, grRes, anRes, biRes] = await Promise.all([
        api.get('/notifications/notifications'),
        api.get('/notifications/templates'),
        api.get('/notifications/alerts'),
        api.get('/notifications/chats'),
        api.get('/notifications/groups'),
        api.get('/notifications/announcements'),
        api.get('/notifications/analytics'),
      ]);
      const fetchedChats = chRes.data.data || [];
      setNotifications(noRes.data.data || []);
      setTemplates(teRes.data.data || []);
      setAlerts(alRes.data.data || []);
      setChats(fetchedChats);
      setGroups(grRes.data.data || []);
      setAnnouncements(anRes.data.data || []);
      setAnalytics(biRes.data.data || {});

      // Auto-select first chat if none selected
      if (fetchedChats.length > 0 && !selectedMessage) {
        setSelectedMessage(fetchedChats[0]);
      }
    } catch {
      enqueueSnackbar('Failed to load notification gateways', { variant: 'error' });
    }
    setLoading(false);
  }, [enqueueSnackbar, selectedMessage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const { data } = await api.post('/notifications/chats', {
        recipient: fd.get('recipient'),
        subject: fd.get('subject'),
        body: fd.get('body'),
      });
      enqueueSnackbar('Secure internal message sent', { variant: 'success' });
      setComposeOpen(false);
      fetchData();
      if (data.data) setSelectedMessage(data.data);
    } catch {
      enqueueSnackbar('Failed to send message', { variant: 'error' });
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    try {
      const replyBody = `${selectedMessage.body}\n\n─── Reply (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) ───\n${replyText}`;
      const { data } = await api.post('/notifications/chats', {
        recipient: selectedMessage.sender,
        subject: `Re: ${selectedMessage.subject}`,
        body: replyText,
      });
      setSelectedMessage({
        ...selectedMessage,
        body: replyBody,
      });
      setReplyText('');
      enqueueSnackbar('Reply transmitted cleanly', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to send reply', { variant: 'error' });
    }
  };

  const handleSendGroupMessage = async () => {
    if (!groupMsgText.trim() || !activeGroup) return;
    try {
      await api.post(`/notifications/groups/${activeGroup.id}/messages`, {
        sender: 'Dr. Okafor',
        text: groupMsgText.trim(),
      });
      setGroupMsgText('');
      enqueueSnackbar('Message posted to care group thread', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to post message', { variant: 'error' });
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/notifications/templates', {
        name: fd.get('name'),
        channel: fd.get('channel'),
        placeholderFields: fd.get('placeholderFields'),
        category: fd.get('category'),
      });
      enqueueSnackbar('Communication template registered & approved', { variant: 'success' });
      setTemplateDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to register template', { variant: 'error' });
    }
  };

  const handleTriggerAlert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/notifications/alerts', {
        patientName: fd.get('patientName'),
        labParameter: fd.get('labParameter'),
        value: fd.get('value'),
        severity: fd.get('severity'),
        clinicianName: fd.get('clinicianName'),
      });
      enqueueSnackbar('Safety-critical alert triggered & dispatched to on-call clinician!', { variant: 'error' });
      setAlertDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to trigger alert', { variant: 'error' });
    }
  };

  const handleAcknowledgeAlert = async (id: string) => {
    try {
      await api.patch(`/notifications/alerts/${id}/acknowledge`, { clinicianName: 'Dr. Okafor' });
      enqueueSnackbar('Critical alert acknowledged successfully', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to acknowledge alert', { variant: 'error' });
    }
  };

  const handleEscalateAlert = async (id: string) => {
    try {
      await api.patch(`/notifications/alerts/${id}/escalate`, {});
      enqueueSnackbar('Alert escalated to on-duty consultant', { variant: 'warning' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to escalate alert', { variant: 'error' });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/notifications/groups', {
        name: fd.get('name'),
        patientName: fd.get('patientName'),
        participants: fd.get('participants'),
      });
      enqueueSnackbar('Multidisciplinary care team group created', { variant: 'success' });
      setGroupDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to create group', { variant: 'error' });
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await api.post('/notifications/announcements', {
        title: fd.get('title'),
        targetAudience: fd.get('targetAudience'),
        priority: fd.get('priority'),
        content: fd.get('content'),
      });
      enqueueSnackbar('Mandatory announcement broadcast complete', { variant: 'success' });
      setAnnouncementDialogOpen(false);
      fetchData();
    } catch {
      enqueueSnackbar('Failed to publish announcement', { variant: 'error' });
    }
  };

  const handleAcknowledgeAnnouncement = async (id: string) => {
    try {
      await api.patch(`/notifications/announcements/${id}/acknowledge`, {});
      enqueueSnackbar('Notice receipt acknowledged', { variant: 'success' });
      fetchData();
    } catch {
      enqueueSnackbar('Failed to acknowledge announcement', { variant: 'error' });
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 0: SECURE MESSAGING, CARE GROUPS & ANNOUNCEMENTS
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab1 = () => {
    const filteredChats = chats.filter(c => {
      const matchQuery = `${c.sender} ${c.subject} ${c.body}`.toLowerCase().includes(searchChat.toLowerCase());
      if (chatFilter === 'UNREAD') return matchQuery && !c.read;
      if (chatFilter === 'SENT') return matchQuery && c.sender.includes('Admin');
      return matchQuery;
    });

    return (
      <Box>
        <Tabs value={subTab0} onChange={(_, v) => setSubTab0(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
          <Tab icon={<Chat />} iconPosition="start" label="Secure Direct Messages" sx={{ fontWeight: subTab0 === 0 ? 800 : 500, textTransform: 'none' }} />
          <Tab icon={<Group />} iconPosition="start" label="Multidisciplinary Care Groups" sx={{ fontWeight: subTab0 === 1 ? 800 : 500, textTransform: 'none' }} />
          <Tab icon={<Campaign />} iconPosition="start" label="Mandatory Broadcast Announcements" sx={{ fontWeight: subTab0 === 2 ? 800 : 500, textTransform: 'none' }} />
        </Tabs>

        {/* ── SUB-TAB 0: Direct Chat Thread ── */}
        <TabPanel value={subTab0} index={0}>
          <Grid container spacing={3}>
            {/* Left Inbox Column */}
            <Grid item xs={12} md={5} lg={4}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: 600, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: PRIMARY }}>📥 Internal Inbox</Typography>
                    <Button variant="contained" size="small" onClick={() => setComposeOpen(true)} startIcon={<Add />} sx={{ borderRadius: 2, bgcolor: PRIMARY }}>
                      Compose
                    </Button>
                  </Stack>
                  <TextField
                    placeholder="Search messages by sender or subject..."
                    size="small" fullWidth value={searchChat}
                    onChange={e => setSearchChat(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                    }}
                    sx={{ bgcolor: '#fff', borderRadius: 2 }}
                  />
                  <Stack direction="row" spacing={1} mt={1.5}>
                    {(['ALL', 'UNREAD', 'SENT'] as const).map(f => (
                      <Chip
                        key={f} label={f} size="small"
                        clickable color={chatFilter === f ? 'primary' : 'default'}
                        onClick={() => setChatFilter(f)}
                        sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                      />
                    ))}
                  </Stack>
                </Box>
                <List sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
                  {filteredChats.map(chat => {
                    const isSelected = selectedMessage?.id === chat.id;
                    return (
                      <ListItem
                        key={chat.id} button onClick={() => setSelectedMessage(chat)}
                        selected={isSelected}
                        sx={{
                          borderRadius: 2, mb: 1, border: `1px solid ${isSelected ? PRIMARY : '#f1f5f9'}`,
                          bgcolor: isSelected ? `${PRIMARY}0d` : '#fff',
                          '&.Mui-selected': { bgcolor: `${PRIMARY}12` }
                        }}
                      >
                        <ListItemAvatar>
                          <Badge color="success" variant="dot" invisible={chat.read}>
                            <Avatar sx={{ bgcolor: isSelected ? PRIMARY : SECONDARY, fontWeight: 700, fontSize: '0.85rem' }}>
                              {chat.sender[0]}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle2" sx={{ fontWeight: chat.read ? 600 : 800, fontSize: '0.83rem' }}>
                                {chat.sender}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                                {chat.date?.split(' ')[1] || chat.date}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            <Box component="span" sx={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'text.secondary', fontWeight: chat.read ? 400 : 700 }}>
                              {chat.subject}
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                  {filteredChats.length === 0 && (
                    <Box sx={{ textCenter: 'center', py: 6, opacity: 0.6, textAlign: 'center' }}>
                      <Drafts sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2">No messages found</Typography>
                    </Box>
                  )}
                </List>
              </Card>
            </Grid>

            {/* Right Reading & Reply Panel */}
            <Grid item xs={12} md={7} lg={8}>
              {selectedMessage ? (
                <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: 600, display: 'flex', flexDirection: 'column' }}>
                  {/* Thread Header */}
                  <Box sx={{ p: 2.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: PRIMARY, width: 44, height: 44, fontWeight: 800 }}>{selectedMessage.sender[0]}</Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>{selectedMessage.sender}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Sent to: <strong>{selectedMessage.recipient || 'Super Admin'}</strong> &bull; {selectedMessage.date}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip label="ENC-SSL SECURE" color="success" size="small" icon={<VerifiedUser sx={{ fontSize: 14 }} />} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
                    </Stack>
                  </Box>

                  {/* Message Body Content */}
                  <Box sx={{ p: 3, flexGrow: 1, overflowY: 'auto', bgcolor: '#ffffff' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, mb: 2 }}>{selectedMessage.subject}</Typography>
                    <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0', mb: 3 }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, color: '#334155', fontSize: '0.92rem' }}>
                        {selectedMessage.body}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Quick Reply Form */}
                  <Box sx={{ p: 2, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <TextField
                        placeholder={`Reply to ${selectedMessage.sender}...`}
                        size="small" fullWidth multiline maxRows={3}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        sx={{ bgcolor: '#fff', borderRadius: 2 }}
                      />
                      <Button
                        variant="contained" color="primary" endIcon={<Send />}
                        onClick={handleSendReply}
                        disabled={!replyText.trim()}
                        sx={{ borderRadius: 2.5, px: 3, py: 1, fontWeight: 700, minWidth: 120 }}
                      >
                        Reply
                      </Button>
                    </Stack>
                  </Box>
                </Card>
              ) : (
                <Card sx={{ borderRadius: 3, p: 6, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', border: '2px dashed #cbd5e1' }}>
                  <Box sx={{ textAlign: 'center', maxWidth: 360 }}>
                    <Mail sx={{ fontSize: 54, color: PRIMARY, opacity: 0.6, mb: 2 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY, mb: 1 }}>Select a Message Thread</Typography>
                    <Typography variant="body2" color="text.secondary">Choose an internal communication record from the left queue to view details or send a reply.</Typography>
                  </Box>
                </Card>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* ── SUB-TAB 1: Multidisciplinary Care Groups ── */}
        <TabPanel value={subTab0} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Multidisciplinary Care Team Groups</Typography>
              <Typography variant="caption" color="text.secondary">Integrated clinical consultation rooms linking doctors, nurses, pharmacists & specialists</Typography>
            </Box>
            <Button variant="contained" startIcon={<Group />} onClick={() => setGroupDialogOpen(true)} sx={{ bgcolor: PURPLE, borderRadius: 2, fontWeight: 700 }}>
              Create Care Group
            </Button>
          </Box>

          <Grid container spacing={3}>
            {groups.map(grp => (
              <Grid item xs={12} md={6} lg={4} key={grp.id}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: `1px solid ${PURPLE}30`, transition: 'all 0.2s', '&:hover': { boxShadow: `0 8px 30px ${PURPLE}25` } }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Chip label={grp.id} size="small" sx={{ fontWeight: 800, bgcolor: `${PURPLE}15`, color: PURPLE }} />
                      <Chip label="ACTIVE DISCUSSIONS" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                    </Stack>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>{grp.name}</Typography>
                    <Typography variant="caption" sx={{ color: PRIMARY, fontWeight: 700, display: 'block', mb: 1.5 }}>
                      🏥 Linked Patient: <strong>{grp.patientName}</strong>
                    </Typography>
                    <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" fontWeight={700}>LAST MESSAGE:</Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#334155', fontStyle: 'italic' }}>
                        "{grp.lastMessage || 'Room created.'}"
                      </Typography>
                    </Box>
                    <Typography variant="caption" display="block" color="text.secondary" mb={2}>
                      👥 Participants: <strong>{grp.participants}</strong>
                    </Typography>
                    <Button variant="outlined" fullWidth onClick={() => setActiveGroup(grp)} startIcon={<Chat />} sx={{ borderColor: PURPLE, color: PURPLE, fontWeight: 700, borderRadius: 2 }}>
                      Open Group Discussion
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* ── SUB-TAB 2: Mandatory Broadcast Announcements ── */}
        <TabPanel value={subTab0} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Mandatory Broadcast Announcements</Typography>
              <Typography variant="caption" color="text.secondary">Hospital-wide directives, policy broadcasts & emergency facility updates</Typography>
            </Box>
            <Button variant="contained" startIcon={<Campaign />} onClick={() => setAnnouncementDialogOpen(true)} sx={{ bgcolor: WARNING, borderRadius: 2, fontWeight: 700 }}>
              Publish Broadcast
            </Button>
          </Box>

          <Grid container spacing={3}>
            {announcements.map(ann => (
              <Grid item xs={12} md={6} key={ann.id}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderLeft: `5px solid ${ann.priority === 'HIGH' || ann.priority === 'EMERGENCY' ? DANGER : WARNING}` }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                      <StatusChip label={ann.priority} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Published: {ann.date}</Typography>
                    </Stack>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>{ann.title}</Typography>
                    <Chip label={`Target: ${ann.targetAudience}`} size="small" variant="outlined" sx={{ mb: 2, fontWeight: 600 }} />
                    <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0', mb: 2.5 }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.7, color: '#334155', fontSize: '0.88rem' }}>
                        {ann.content}
                      </Typography>
                    </Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ fontWeight: 700, color: SUCCESS }}>
                        ✅ {ann.acknowledgementsCount || 0} Staff Acknowledged
                      </Typography>
                      <Button
                        size="small" variant="contained" color="success" startIcon={<Check />}
                        onClick={() => handleAcknowledgeAnnouncement(ann.id)}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        Acknowledge Notice
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Box>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 1: NOTIFICATION ENGINE & TEMPLATES
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab2 = () => {
    const filteredLogs = notifications.filter(n => {
      const matchQuery = `${n.id} ${n.recipient} ${n.content} ${n.eventName}`.toLowerCase().includes(searchLog.toLowerCase());
      if (channelFilter !== 'ALL') return matchQuery && n.type === channelFilter;
      return matchQuery;
    });

    const filteredTemplates = templates.filter(t =>
      `${t.name} ${t.placeholderFields} ${t.category}`.toLowerCase().includes(searchTemplate.toLowerCase())
    );

    return (
      <Box>
        <Tabs value={subTab1} onChange={(_, v) => setSubTab1(v)} sx={{ mb: 3, borderBottom: '2px solid #e2e8f0' }}>
          <Tab icon={<Sms />} iconPosition="start" label="Event Delivery Transmission Logs" sx={{ fontWeight: subTab1 === 0 ? 800 : 500, textTransform: 'none' }} />
          <Tab icon={<LibraryBooks />} iconPosition="start" label="Communication Templates" sx={{ fontWeight: subTab1 === 1 ? 800 : 500, textTransform: 'none' }} />
        </Tabs>

        {/* ── SUB-TAB 0: Event Delivery Transmission Logs ── */}
        <TabPanel value={subTab1} index={0}>
          {/* Search & Filter Bar */}
          <Card sx={{ p: 2, mb: 3, borderRadius: 3, bgcolor: '#f8fafc' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  placeholder="Search logs by ID, recipient or event..."
                  size="small" fullWidth value={searchLog}
                  onChange={e => setSearchLog(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                  }}
                  sx={{ bgcolor: '#fff', borderRadius: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" fontWeight={700} color="text.secondary">CHANNEL:</Typography>
                  {['ALL', 'SMS', 'WHATSAPP', 'EMAIL'].map(ch => (
                    <Chip
                      key={ch} label={ch} size="small"
                      clickable color={channelFilter === ch ? 'primary' : 'default'}
                      onClick={() => setChannelFilter(ch)}
                      sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                    />
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
                <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={fetchData} sx={{ fontWeight: 700, borderRadius: 2 }}>
                  Refresh Logs
                </Button>
              </Grid>
            </Grid>
          </Card>

          <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: PRIMARY }}>
                <TableRow>
                  {['Event ID', 'Origin Module', 'Recipient Target', 'Channel', 'Event Name', 'Message Content Snippet', 'Send Date', 'Status', 'Action'].map(h => (
                    <TableCell key={h} sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.map(not => (
                  <TableRow key={not.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: PRIMARY }}>{not.id}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{not.module}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{not.recipient}</TableCell>
                    <TableCell><StatusChip label={not.type} /></TableCell>
                    <TableCell><Chip label={not.eventName} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} /></TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{not.content}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{not.date}</TableCell>
                    <TableCell><StatusChip label={not.status} /></TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" onClick={() => setNotificationDetailOpen(not)} sx={{ fontSize: '0.68rem', fontWeight: 700, borderRadius: 1.5 }}>
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ── SUB-TAB 1: Communication Templates ── */}
        <TabPanel value={subTab1} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: PRIMARY }}>Gateway Communication Templates</Typography>
              <Typography variant="caption" color="text.secondary">Approved templates for automated patient SMS, WhatsApp & clinical email dispatches</Typography>
            </Box>
            <Button variant="contained" startIcon={<Add />} onClick={() => setTemplateDialogOpen(true)} sx={{ bgcolor: SUCCESS, borderRadius: 2, fontWeight: 700 }}>
              Create Template
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: SUCCESS }}>
                <TableRow>
                  {['Template ID', 'Template Name & Purpose', 'Channel', 'Placeholders', 'Category', 'Status', 'Action'].map(h => (
                    <TableCell key={h} sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTemplates.map(tpl => (
                  <TableRow key={tpl.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SUCCESS }}>{tpl.id}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{tpl.name}</TableCell>
                    <TableCell><StatusChip label={tpl.channel} /></TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: PURPLE, fontWeight: 600 }}>{tpl.placeholderFields}</TableCell>
                    <TableCell><Chip label={tpl.category} size="small" variant="outlined" sx={{ fontWeight: 600 }} /></TableCell>
                    <TableCell><StatusChip label={tpl.status} /></TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" color="success" onClick={() => setTemplatePreviewOpen(tpl)} sx={{ fontSize: '0.68rem', fontWeight: 700, borderRadius: 1.5 }}>
                        Preview Substitution
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Box>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 2: SAFETY-CRITICAL CLINICAL ALERTS & EMERGENCY ESCALATIONS
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab3 = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: DANGER }}>Safety-Critical Clinical Alerts & Escalation Center</Typography>
          <Typography variant="caption" color="text.secondary">Real-time critical lab parameters, panic values & automated escalation routing</Typography>
        </Box>
        <Button variant="contained" startIcon={<NotificationsActive />} onClick={() => setAlertDialogOpen(true)} sx={{ bgcolor: DANGER, borderRadius: 2, fontWeight: 800, boxShadow: '0 4px 20px rgba(220,38,38,0.35)' }}>
          Trigger Lab Alert
        </Button>
      </Box>

      {/* Emergency Alert Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fef2f2', border: `1px solid ${DANGER}30` }}>
            <Typography variant="caption" color="error" fontWeight={700}>ACTIVE CRITICAL TRIGGERS</Typography>
            <Typography variant="h4" fontWeight={900} color={DANGER}>{alerts.length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fff7ed', border: `1px solid ${WARNING}30` }}>
            <Typography variant="caption" color="warning.main" fontWeight={700}>UNACKNOWLEDGED ALERTS</Typography>
            <Typography variant="h4" fontWeight={900} color={WARNING}>{alerts.filter(a => a.status === 'UNACKNOWLEDGED').length}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f0fdf4', border: `1px solid ${SUCCESS}30` }}>
            <Typography variant="caption" color="success.main" fontWeight={700}>ROUTING RESPONSE TIME</Typography>
            <Typography variant="h4" fontWeight={900} color={SUCCESS}>&lt; 0.5s</Typography>
          </Paper>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: DANGER }}>
            <TableRow>
              {['Alert ID', 'Patient Name', 'Lab Parameter', 'Critical Measured Value', 'Severity Impact', 'Responsible Clinician', 'Status', 'Escalation Level', 'Routing Log Details', 'Action'].map(h => (
                <TableCell key={h} sx={{ color: '#fff', fontWeight: 800, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts.map(al => (
              <TableRow key={al.id} hover>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: DANGER }}>{al.id}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{al.patientName}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{al.labParameter}</TableCell>
                <TableCell sx={{ fontWeight: 900, color: DANGER, fontSize: '0.9rem' }}>{al.value}</TableCell>
                <TableCell><StatusChip label={al.severity} /></TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{al.clinicianName}</TableCell>
                <TableCell><StatusChip label={al.status} /></TableCell>
                <TableCell align="center">
                  <Chip label={`Level ${al.escalationLevel}`} size="small" color={al.escalationLevel > 0 ? 'warning' : 'default'} sx={{ fontWeight: 800 }} />
                </TableCell>
                <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 220 }}>{al.escalationLog}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {al.status === 'UNACKNOWLEDGED' && (
                      <Button size="small" variant="contained" color="success" onClick={() => handleAcknowledgeAlert(al.id)} sx={{ fontWeight: 700, fontSize: '0.68rem', borderRadius: 1.5 }}>
                        Acknowledge
                      </Button>
                    )}
                    {al.status === 'UNACKNOWLEDGED' && (
                      <Button size="small" variant="outlined" color="warning" onClick={() => handleEscalateAlert(al.id)} sx={{ fontWeight: 700, fontSize: '0.68rem', borderRadius: 1.5 }}>
                        Escalate
                      </Button>
                    )}
                    {al.status === 'ACKNOWLEDGED' && (
                      <Chip label="RESOLVED" size="small" color="success" variant="outlined" sx={{ fontWeight: 700 }} />
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // TAB 3: OPERATIONS BI DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  const renderTab4 = () => (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><KPICard title="Total Transmissions" value={analytics.totalCount || notifications.length} sub="SMS / WhatsApp / Email logs" icon={<Sms />} color={PRIMARY} /></Grid>
        <Grid item xs={6} md={3}><KPICard title="Critical Lab Triggers" value={analytics.criticalCount || alerts.length} sub="Urgent panic value alerts" icon={<NotificationsActive />} color={DANGER} /></Grid>
        <Grid item xs={6} md={3}><KPICard title="Pending Action Items" value={analytics.pendingAlerts || alerts.filter(a => a.status === 'UNACKNOWLEDGED').length} sub="Unacknowledged clinical alerts" icon={<Warning />} color={WARNING} /></Grid>
        <Grid item xs={6} md={3}><KPICard title="Gateway Uptime" value="99.9%" sub="Twilio & GSM Modem online" icon={<CheckCircle />} color={SUCCESS} /></Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Donut Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>Outbound Deliveries Channel Mix</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={analytics.distributionByChannel || [
                  { name: 'SMS Alerts', value: 140 },
                  { name: 'WhatsApp Link', value: 85 },
                  { name: 'Email Portal', value: 42 }
                ]} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {CHART_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: PRIMARY }}>Gateway Transmission Volume</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { name: 'Mon', SMS: 45, WhatsApp: 30, Email: 12 },
                { name: 'Tue', SMS: 52, WhatsApp: 35, Email: 18 },
                { name: 'Wed', SMS: 68, WhatsApp: 42, Email: 25 },
                { name: 'Thu', SMS: 61, WhatsApp: 40, Email: 22 },
                { name: 'Fri', SMS: 75, WhatsApp: 48, Email: 30 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="SMS" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                <Bar dataKey="WhatsApp" fill={SUCCESS} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Email" fill={PURPLE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Gateway Health Card */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, p: 3, borderLeft: `5px solid ${SUCCESS}`, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: SUCCESS, mb: 1 }}>Communication Gateways & Hardware Status</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Enterprise notification service directly integrates with primary SMS gateways, WhatsApp Business Webhooks, and hospital GSM hardware modems.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2.5, border: `1px solid ${SUCCESS}30` }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">PRIMARY SMS PROVIDER</Typography>
                  <Typography variant="subtitle1" fontWeight={800} color={SUCCESS}>99.9% (ONLINE)</Typography>
                  <Typography variant="caption" color="text.secondary">Latency: 45ms</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2.5, border: `1px solid ${SUCCESS}30` }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">WHATSAPP API WEBHOOK</Typography>
                  <Typography variant="subtitle1" fontWeight={800} color={SUCCESS}>ONLINE</Typography>
                  <Typography variant="caption" color="text.secondary">Latency: 85ms</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2.5, border: `1px solid ${PRIMARY}30` }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">EMAIL SMTP RELAY</Typography>
                  <Typography variant="subtitle1" fontWeight={800} color={PRIMARY}>READY</Typography>
                  <Typography variant="caption" color="text.secondary">Latency: 120ms</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2.5, border: `1px solid ${DANGER}30` }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">CRITICAL CLINICAL PAGER</Typography>
                  <Typography variant="subtitle1" fontWeight={800} color={DANGER}>INSTANT (&lt;0.5s)</Typography>
                  <Typography variant="caption" color="text.secondary">Priority Routing: Active</Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN COMPONENT BUILD
  // ══════════════════════════════════════════════════════════════════════════
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/messages/alerts' || path === '/messages/pagers') {
      setActiveTab(2);
    } else if (path === '/messages/announcements') {
      setActiveTab(0);
      setSubTab0(2);
    } else if (path === '/messages/memos' || path === '/messages/handover') {
      setActiveTab(3);
    } else if (path === '/messages/patient-sms' || path === '/messages/templates') {
      setActiveTab(1);
    } else if (path === '/messages/chat' || path === '/messages/staff-chat' || path === '/messages' || path === '/messages/') {
      setActiveTab(0);
      setSubTab0(0);
    }
  }, [location.pathname]);

  const getPageDetails = () => {
    const path = location.pathname.replace(/\/$/, '');

    if (path === '/messages/alerts' || path === '/messages/pagers') {
      return {
        title: 'Critical Clinical Alerts & Emergency Escalation Center',
        subtitle: 'Lab Panic Value Alerts · Code Blue Pagers · STAT Radiology Notifications',
        category: 'Messages & Communications',
        kpis: [
          { label: 'Critical Alerts', value: `${alerts.filter(a=>a.severity==='CRITICAL').length || 0} Alerts`, subtitle: 'Active Critical Alerts', icon: <ReportProblem />, color: DANGER },
          { label: 'Avg Acknowledge Time', value: '< 45 Secs', subtitle: 'On-Call Clinicians', icon: <NotificationsActive />, color: WARNING },
          { label: 'Escalation Level', value: 'Level 1-3 Active', subtitle: 'Automated Routing', icon: <HeadsetMic />, color: PURPLE },
          { label: 'Panic Value Deliveries', value: '100% Verified', subtitle: 'LIMS Critical Result', icon: <CheckCircle />, color: SUCCESS },
        ],
      };
    }

    if (path === '/messages/announcements') {
      return {
        title: 'Hospital-Wide Announcements & Executive Broadcasts',
        subtitle: 'Mandatory Staff Bulletins · Policy Updates · Clinical Emergency Protocols',
        category: 'Messages & Communications',
        kpis: [
          { label: 'Published Broadcasts', value: `${announcements.length || 0} Bulletins`, subtitle: 'Active Announcements', icon: <Campaign />, color: PRIMARY },
          { label: 'Staff Acknowledgments', value: '45 Verified', subtitle: 'Read Receipts', icon: <CheckCircle />, color: SUCCESS },
          { label: 'Target Audience', value: 'All Hospital Staff', subtitle: 'Broadcast Scope', icon: <Group />, color: PURPLE },
          { label: 'Urgent Bulletins', value: '1 Active', subtitle: 'Priority Notices', icon: <ReportProblem />, color: DANGER },
        ],
      };
    }

    if (path === '/messages/memos' || path === '/messages/handover') {
      return {
        title: 'Shift Handover Memos & Multidisciplinary Operational Handoffs',
        subtitle: 'Nursing Ward Handovers · ICU Bed Summary Memos · On-Call Roster Notes',
        category: 'Messages & Communications',
        kpis: [
          { label: 'Shift Memos Logged', value: '24 Memos', subtitle: '24-Hour Operations', icon: <Assessment />, color: TEAL },
          { label: 'Ward Handovers', value: '100% Completed', subtitle: 'Shift Change Compliance', icon: <CheckCircle />, color: SUCCESS },
          { label: 'On-Call Roster', value: 'Active Shift 2', subtitle: 'Emergency Duty Staff', icon: <HeadsetMic />, color: PRIMARY },
          { label: 'Critical Handoffs', value: '3 High Priority', subtitle: 'ICU & Theatre Memos', icon: <Warning />, color: WARNING },
        ],
      };
    }

    if (path === '/messages/patient-sms') {
      return {
        title: 'Patient Outbound SMS, WhatsApp & Broadcast Templates',
        subtitle: 'Appointment Reminders · Prescription Ready Alerts · Lab Result Notifications',
        category: 'Messages & Communications',
        kpis: [
          { label: 'Outbound Messages Today', value: '1,240 Sent', subtitle: 'SMS + WhatsApp', icon: <Sms />, color: SECONDARY },
          { label: 'Delivery Rate', value: '99.9%', subtitle: 'GSM Gateway Status', icon: <CheckCircle />, color: SUCCESS },
          { label: 'Configured Templates', value: `${templates.length || 0} Templates`, subtitle: 'Placeholders Enabled', icon: <LibraryBooks />, color: TEAL },
          { label: 'Appointment Reminders', value: '450 Sent', subtitle: 'Automated Reminders', icon: <Campaign />, color: PRIMARY },
        ],
      };
    }

    // Default: Internal Chat (/messages/chat)
    return {
      title: 'Internal Secure Staff Chat & Multidisciplinary Channels',
      subtitle: 'Direct 1-on-1 Doctor Messaging · Lab Emergency Dispatch Logs · Clinical Group Threads',
      category: 'Messages & Communications',
      kpis: [
        { label: 'Active Chat Channels', value: '12 Channels', subtitle: 'Internal Staff Groups', icon: <Group />, color: PURPLE },
        { label: 'Unread Messages', value: `${chats.filter((c: any) => !c.read).length || 0} Unread`, subtitle: 'Inbox Notifications', icon: <Mail />, color: SECONDARY },
        { label: 'Staff Online', value: '48 Staff', subtitle: 'Active Users', icon: <Chat />, color: SUCCESS },
        { label: 'Encrypted Logs', value: '100% Protected', subtitle: 'HIPAA/NDPA Compliant', icon: <VerifiedUser />, color: PRIMARY },
      ],
    };
  };

  const pageDetails = getPageDetails();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 5 }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 60%, ${TEAL} 100%)`, color: '#fff', px: 4, py: 3, borderRadius: '0 0 24px 24px', mb: 3, boxShadow: '0 8px 32px rgba(30,58,138,0.25)' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>
              Messages &gt; {pageDetails.category}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", mt: 0.2 }}>
              💬 {pageDetails.title}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.88, fontWeight: 500, display: 'block', mt: 0.2 }}>
              {pageDetails.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Tooltip title="Refresh all gateways"><IconButton onClick={fetchData} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}><Refresh /></IconButton></Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* KPIStrip */}
      <Box sx={{ px: 3, mb: 3 }}>
        <Grid container spacing={2}>
          {pageDetails.kpis.map((kpi, idx) => (
            <Grid item xs={6} md={3} key={idx}>
              <KPICard title={kpi.label} value={kpi.value} sub={kpi.subtitle} icon={kpi.icon} color={kpi.color} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3, bgcolor: '#fff', borderRadius: 3, px: 1, py: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 48, fontSize: '0.88rem' },
            '& .Mui-selected': { fontWeight: 800, color: `${SECONDARY} !important` },
            '& .MuiTabs-indicator': { bgcolor: SECONDARY, height: 3, borderRadius: 2 } }}>
          <Tab icon={<Chat />} iconPosition="start" label="Secure Messaging & Announcements" />
          <Tab icon={<Sms />} iconPosition="start" label="Notification Engine & Templates" />
          <Tab icon={<ReportProblem />} iconPosition="start" label="Clinical Alerts & Escalations" />
          <Tab icon={<Assessment />} iconPosition="start" label="Operations BI Dashboard" />
        </Tabs>

        <Card sx={{ borderRadius: 3, p: 3, boxShadow: '0 8px 40px rgba(0,0,0,0.04)' }}>
          {activeTab === 0 && renderTab1()}
          {activeTab === 1 && renderTab2()}
          {activeTab === 2 && renderTab3()}
          {activeTab === 3 && renderTab4()}
        </Card>
      </Box>

      {/* Modals & Drawers */}

      {/* Group Discussion Drawer */}
      <Drawer anchor="right" open={Boolean(activeGroup)} onClose={() => setActiveGroup(null)}>
        {activeGroup && (
          <Box sx={{ width: { xs: 320, sm: 460 }, p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ pb: 2, borderBottom: '1px solid #e2e8f0' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 800, color: PURPLE }}>{activeGroup.name}</Typography>
                <IconButton onClick={() => setActiveGroup(null)}>✕</IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary">Linked Patient: <strong>{activeGroup.patientName}</strong></Typography>
            </Box>

            {/* Chat Thread */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 2 }}>
              {(activeGroup.messages || [
                { id: '1', sender: 'Nurse Joy', text: 'Oxygen line saturation is stable at 96%.', time: '10:30 AM' },
                { id: '2', sender: 'Dr. Okafor', text: 'Good. Please keep monitoring vitals Q2H.', time: '10:35 AM' }
              ]).map((m: any) => (
                <Box key={m.id} sx={{ mb: 2, textAlign: m.sender.includes('Okafor') ? 'right' : 'left' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: PRIMARY, display: 'block' }}>{m.sender}</Typography>
                  <Paper sx={{ p: 1.5, display: 'inline-block', bgcolor: m.sender.includes('Okafor') ? `${SECONDARY}15` : '#f1f5f9', borderRadius: 2, maxW: '85%' }}>
                    <Typography variant="body2">{m.text}</Typography>
                  </Paper>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem', mt: 0.3 }}>{m.time}</Typography>
                </Box>
              ))}
            </Box>

            {/* Input Box */}
            <Box sx={{ pt: 2, borderTop: '1px solid #e2e8f0' }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  placeholder="Type message to care team..."
                  size="small" fullWidth value={groupMsgText}
                  onChange={e => setGroupMsgText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendGroupMessage(); }}
                />
                <Button variant="contained" onClick={handleSendGroupMessage} sx={{ bgcolor: PURPLE }}>Send</Button>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Template Substitution Preview Modal */}
      <Dialog open={Boolean(templatePreviewOpen)} onClose={() => setTemplatePreviewOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: SUCCESS }}>Communication Template Preview</DialogTitle>
        <DialogContent dividers>
          {templatePreviewOpen && (
            <Stack spacing={2}>
              <Typography variant="subtitle2">Template: <strong>{templatePreviewOpen.name}</strong></Typography>
              <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: `1px solid ${SUCCESS}30` }}>
                <Typography variant="caption" color="success.main" fontWeight={700}>CONFIGURED PLACEHOLDERS:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: PURPLE }}>
                  {templatePreviewOpen.placeholderFields}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>SUBSTITUTED OUTBOUND SAMPLE:</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                  "Dear <strong>[Alhaji Ibrahim Musa]</strong>, your <strong>[Haemoglobin]</strong> lab result is <strong>[6.2 g/dL]</strong>. Please report to <strong>[Dr. Okafor]</strong> immediately."
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplatePreviewOpen(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notification Inspection Modal */}
      <Dialog open={Boolean(notificationDetailOpen)} onClose={() => setNotificationDetailOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: PRIMARY }}>Transmission Payload Receipt</DialogTitle>
        <DialogContent dividers>
          {notificationDetailOpen && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">EVENT ID:</Typography><Typography variant="subtitle2" fontWeight={800}>{notificationDetailOpen.id}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">ORIGIN MODULE:</Typography><Typography variant="subtitle2" fontWeight={800}>{notificationDetailOpen.module}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">RECIPIENT:</Typography><Typography variant="subtitle2" fontWeight={800}>{notificationDetailOpen.recipient}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">CHANNEL:</Typography><StatusChip label={notificationDetailOpen.type} /></Grid>
              </Grid>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>DELIVERED PAYLOAD BODY:</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>{notificationDetailOpen.content}</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setNotificationDetailOpen(null)}>Close</Button></DialogActions>
      </Dialog>

      {/* Compose Message Dialog */}
      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleSendMessage}>
          <DialogTitle sx={{ fontWeight: 800, color: PRIMARY }}>Compose Secure Message</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField select label="Recipient" name="recipient" size="small" fullWidth required defaultValue="">
                {RECIPIENTS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <TextField label="Subject" name="subject" size="small" fullWidth required />
              <TextField label="Message Body" name="body" size="small" fullWidth multiline rows={4} required />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setComposeOpen(false)}>Cancel</Button><Button type="submit" variant="contained" sx={{ bgcolor: PRIMARY }}>Send Message</Button></DialogActions>
        </form>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateTemplate}>
          <DialogTitle sx={{ fontWeight: 800, color: SUCCESS }}>Create Communication Template</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Template Name" name="name" size="small" fullWidth required placeholder="e.g. Appointment Confirmation SMS" />
              <TextField select label="Delivery Channel" name="channel" size="small" fullWidth defaultValue="SMS"><MenuItem value="SMS">SMS Message</MenuItem><MenuItem value="WHATSAPP">WhatsApp</MenuItem><MenuItem value="EMAIL">Email</MenuItem></TextField>
              <TextField label="Placeholders (Comma separated)" name="placeholderFields" size="small" fullWidth required placeholder="e.g. patientName, date" />
              <TextField select label="Category" name="category" size="small" fullWidth defaultValue="CLINICAL"><MenuItem value="CLINICAL">Clinical / Appointments</MenuItem><MenuItem value="CRITICAL">Critical Alerts</MenuItem><MenuItem value="BILLING">Billing / Finance</MenuItem></TextField>
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained" color="success">Publish Template</Button></DialogActions>
        </form>
      </Dialog>

      {/* Trigger Alert Dialog */}
      <Dialog open={alertDialogOpen} onClose={() => setAlertDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleTriggerAlert}>
          <DialogTitle sx={{ fontWeight: 800, color: DANGER }}>Trigger Safety-Critical Alert</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Patient Name" name="patientName" size="small" fullWidth required placeholder="e.g. Baby Joy" />
              <TextField label="Critical Lab Parameter" name="labParameter" size="small" fullWidth required placeholder="e.g. Haemoglobin" />
              <TextField label="Measured Value" name="value" size="small" fullWidth required placeholder="e.g. 6.2 g/dL" />
              <TextField select label="Severity Impact" name="severity" size="small" fullWidth defaultValue="CRITICAL"><MenuItem value="CRITICAL">Critical Alert</MenuItem><MenuItem value="LIFE_THREATENING">Life-Threatening</MenuItem></TextField>
              <TextField label="Responsible Clinician" name="clinicianName" size="small" fullWidth defaultValue="Dr. Okafor" required />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setAlertDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained" color="error">Trigger Alert</Button></DialogActions>
        </form>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreateGroup}>
          <DialogTitle sx={{ fontWeight: 800, color: PURPLE }}>Create Care Group</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Group Name" name="name" size="small" fullWidth required placeholder="e.g. Neonatal Ward Group" />
              <TextField label="Patient Link Name" name="patientName" size="small" fullWidth required placeholder="e.g. Baby Joy" />
              <TextField label="Care Team Participants" name="participants" size="small" fullWidth required placeholder="e.g. Dr. Okafor, Nurse Joy" />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setGroupDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained" sx={{ bgcolor: PURPLE }}>Create Group</Button></DialogActions>
        </form>
      </Dialog>

      {/* Publish Announcement Dialog */}
      <Dialog open={announcementDialogOpen} onClose={() => setAnnouncementDialogOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handlePublishAnnouncement}>
          <DialogTitle sx={{ fontWeight: 800, color: WARNING }}>Publish Broadcast Announcement</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField label="Announcement Title" name="title" size="small" fullWidth required placeholder="e.g. Generator Maintenance Scheduled" />
              <TextField label="Target Audience" name="targetAudience" size="small" fullWidth defaultValue="All Shift Staff" required />
              <TextField select label="Priority Level" name="priority" size="small" fullWidth defaultValue="HIGH"><MenuItem value="HIGH">High Priority</MenuItem><MenuItem value="MEDIUM">Medium Priority</MenuItem><MenuItem value="INFO">Information Only</MenuItem></TextField>
              <TextField label="Broadcast Content detail" name="content" size="small" fullWidth multiline rows={3} required />
            </Stack>
          </DialogContent>
          <DialogActions><Button onClick={() => setAnnouncementDialogOpen(false)}>Cancel</Button><Button type="submit" variant="contained" color="warning">Publish Broadcast</Button></DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Messages;
