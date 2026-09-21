import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Avatar, List, ListItem, ListItemText, ListItemAvatar, ListItemButton,
  Tab, Tabs, InputAdornment, Stack, Divider, Chip, Badge, Paper,
  LinearProgress, FormControlLabel, Checkbox, Tooltip, Switch,
} from '@mui/material';
import {
  VideoCall, Mic, MicOff, Videocam, VideocamOff, ScreenShare,
  StopScreenShare, RadioButtonChecked, RadioButtonUnchecked,
  Send, AttachFile, Chat, People, Group, Assignment, FileCopy,
  CheckCircle, Warning, PriorityHigh, History, AccessTime, Refresh,
  VolumeUp, Event, AssignmentTurnedIn, Edit, SmartDisplay, Add,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { OpenMedAssistant } from '../components/OpenMedAssistant';

interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  departmentName?: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  priority: string;
  attachmentUrl?: string;
  isRead: boolean;
  createdAt: string;
  sender: Clinician;
  recipient: Clinician;
  patient?: { id: string; firstName: string; lastName: string; patientNumber: string } | null;
}

interface Discussion {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  creator: Clinician;
  comments: {
    id: string;
    comment: string;
    isRecommendation: boolean;
    createdAt: string;
    author: Clinician;
  }[];
}

interface MDTMeeting {
  id: string;
  title: string;
  scheduledAt: string;
  agenda: string;
  casesJson?: string;
  attendanceJson?: string;
  minutes?: string;
  decisionsJson?: string;
  status: string;
}

const Telemedicine = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);

  // Lists from APIs
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [mdtMeetings, setMdtMeetings] = useState<MDTMeeting[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);

  // User state
  const [myStaffId, setMyStaffId] = useState<string>('');
  const [selectedClinicianId, setSelectedClinicianId] = useState<string>('');

  // 1. Messenger states
  const [chatBody, setChatBody] = useState('');
  const [chatPriority, setChatPriority] = useState<'ROUTINE' | 'URGENT'>('ROUTINE');
  const [chatPatientId, setChatPatientId] = useState('');
  const [chatAttachment, setChatAttachment] = useState('');

  // 2. Discussions states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [newDiscussionSubject, setNewDiscussionSubject] = useState('');
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentIsRec, setCommentIsRec] = useState(false);
  const [createDiscOpen, setCreateDiscOpen] = useState(false);

  // 3. MDT states
  const [createMdtOpen, setCreateMdtOpen] = useState(false);
  const [mdtTitle, setMdtTitle] = useState('');
  const [mdtScheduledAt, setMdtScheduledAt] = useState('');
  const [mdtAgenda, setMdtAgenda] = useState('');
  const [mdtCases, setMdtCases] = useState('');
  const [mdtAttendees, setMdtAttendees] = useState('');

  // MDT Minutes log
  const [documentMdtId, setDocumentMdtId] = useState<string>('');
  const [mdtMinutes, setMdtMinutes] = useState('');
  const [mdtDecisions, setMdtDecisions] = useState('');

  // 4. Telemedicine Console states
  const [teleOpen, setTeleOpen] = useState(false);
  const [telePatientId, setTelePatientId] = useState('');
  const [teleRoomName, setTeleRoomName] = useState('');
  const [teleSession, setTeleSession] = useState<any | null>(null);
  const [teleNotes, setTeleNotes] = useState('');
  const [teleConsent, setTeleConsent] = useState(true);

  // WebRTC Call Mock controls
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 5. Shift Handovers states
  const [handovers, setHandovers] = useState<any[]>([]);
  const [handoverPatientId, setHandoverPatientId] = useState('');
  const [handoverIncomingId, setHandoverIncomingId] = useState('');
  const [handoverCondition, setHandoverCondition] = useState('');
  const [handoverConcerns, setHandoverConcerns] = useState('');
  const [handoverRisks, setHandoverRisks] = useState('');
  const [handoverTasks, setHandoverTasks] = useState('');
  const [handoverMeds, setHandoverMeds] = useState('');
  const [handoverInvestigations, setHandoverInvestigations] = useState('');

  // Load data
  const loadBasicData = async () => {
    try {
      const [staffRes, patientsRes] = await Promise.all([
        api.get('/staff'),
        api.get('/patients'),
      ]);
      setClinicians(staffRes.data);
      setPatients(patientsRes.data);
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await api.get('/collaboration/messages');
      setMessages(res.data.messages);
      setMyStaffId(res.data.staffId);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMdt = async () => {
    try {
      const res = await api.get('/collaboration/mdt');
      setMdtMeetings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDiscussions = async (patientId: string) => {
    try {
      const res = await api.get(`/collaboration/discussions/patient/${patientId}`);
      setDiscussions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHandovers = async () => {
    try {
      const res = await api.get('/nursing/handovers');
      setHandovers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBasicData();
    loadMessages();
    loadMdt();
    loadHandovers();
  }, []);

  // Sync selected discussion
  useEffect(() => {
    if (selectedDiscussion) {
      const updated = discussions.find(d => d.id === selectedDiscussion.id);
      if (updated) {
        setSelectedDiscussion(updated);
      }
    }
  }, [discussions]);

  // Call timer mock logic
  useEffect(() => {
    if (teleSession && teleSession.status === 'ACTIVE') {
      timerRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallTimer(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [teleSession]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handlers
  const handleSendMessage = async () => {
    if (!selectedClinicianId || !chatBody) {
      enqueueSnackbar('Select a clinician and enter your message', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/collaboration/messages', {
        recipientId: selectedClinicianId,
        body: chatBody,
        patientId: chatPatientId || null,
        attachmentUrl: chatAttachment || null,
        priority: chatPriority,
      });
      setChatBody('');
      setChatPatientId('');
      setChatAttachment('');
      setChatPriority('ROUTINE');
      enqueueSnackbar('Clinical message sent', { variant: 'success' });
      loadMessages();
    } catch (err) {
      enqueueSnackbar('Failed to send message', { variant: 'error' });
    }
  };

  const handleReadMessage = async (msgId: string) => {
    try {
      await api.post(`/collaboration/messages/read/${msgId}`);
      loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDiscussion = async () => {
    if (!selectedPatientId || !newDiscussionSubject) {
      enqueueSnackbar('Select patient and enter case subject', { variant: 'warning' });
      return;
    }
    try {
      const res = await api.post('/collaboration/discussions', {
        patientId: selectedPatientId,
        subject: newDiscussionSubject,
      });
      setNewDiscussionSubject('');
      setCreateDiscOpen(false);
      enqueueSnackbar('Discussion thread initiated', { variant: 'success' });
      loadDiscussions(selectedPatientId);
    } catch (err) {
      enqueueSnackbar('Failed to create thread', { variant: 'error' });
    }
  };

  const handleAddComment = async () => {
    if (!selectedDiscussion || !newComment) return;
    try {
      await api.post('/collaboration/discussions/comment', {
        discussionId: selectedDiscussion.id,
        comment: newComment,
        isRecommendation: commentIsRec,
      });
      setNewComment('');
      setCommentIsRec(false);
      enqueueSnackbar('Clinical comment added', { variant: 'success' });
      loadDiscussions(selectedPatientId);
    } catch (err) {
      enqueueSnackbar('Failed to add comment', { variant: 'error' });
    }
  };

  const handleCreateMdt = async () => {
    if (!mdtTitle || !mdtScheduledAt || !mdtAgenda) {
      enqueueSnackbar('Please fill MDT title, schedule date, and agenda', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/collaboration/mdt', {
        title: mdtTitle,
        scheduledAt: mdtScheduledAt,
        agenda: mdtAgenda,
        casesJson: mdtCases || null,
        attendanceJson: mdtAttendees || null,
      });
      setMdtTitle('');
      setMdtScheduledAt('');
      setMdtAgenda('');
      setMdtCases('');
      setMdtAttendees('');
      setCreateMdtOpen(false);
      enqueueSnackbar('MDT Meeting scheduled successfully', { variant: 'success' });
      loadMdt();
    } catch (err) {
      enqueueSnackbar('Failed to schedule MDT meeting', { variant: 'error' });
    }
  };

  const handleDocumentMdtDecisions = async () => {
    if (!documentMdtId || !mdtMinutes || !mdtDecisions) return;
    try {
      await api.post(`/collaboration/mdt/decisions/${documentMdtId}`, {
        minutes: mdtMinutes,
        decisionsJson: mdtDecisions,
      });
      setMdtMinutes('');
      setMdtDecisions('');
      setDocumentMdtId('');
      enqueueSnackbar('MDT meeting minutes and decisions saved', { variant: 'success' });
      loadMdt();
    } catch (err) {
      enqueueSnackbar('Failed to document decisions', { variant: 'error' });
    }
  };

  const handleStartTelemedicine = async () => {
    if (!telePatientId || !teleRoomName) {
      enqueueSnackbar('Select patient and choose room/channel name', { variant: 'warning' });
      return;
    }
    try {
      const res = await api.post('/collaboration/telemedicine/session', {
        patientId: telePatientId,
        roomName: teleRoomName,
        hasConsent: teleConsent,
        recordingConsentText: teleConsent ? 'Patient verbally consented to video consultation & recording' : null,
      });
      setTeleSession(res.data);
      enqueueSnackbar('Virtual room initialized successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to initialize session', { variant: 'error' });
    }
  };

  const handleCompleteTelemedicine = async () => {
    if (!teleSession || !teleNotes) {
      enqueueSnackbar('Please document consultation notes to complete session', { variant: 'warning' });
      return;
    }
    try {
      await api.post(`/collaboration/telemedicine/complete/${teleSession.id}`, {
        notes: teleNotes,
      });
      setTeleSession(null);
      setTeleNotes('');
      setTelePatientId('');
      setTeleRoomName('');
      setTeleOpen(false);
      enqueueSnackbar('Telemedicine consultation completed and synced to EMR', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to complete consultation', { variant: 'error' });
    }
  };

  const handleCreateHandover = async () => {
    if (!handoverPatientId || !handoverIncomingId || !handoverCondition) {
      enqueueSnackbar('Select patient, incoming clinician, and current condition', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/nursing/handovers', {
        patientId: handoverPatientId,
        incomingNurseId: handoverIncomingId,
        condition: handoverCondition,
        clinicalConcerns: handoverConcerns,
        risks: handoverRisks,
        outstandingTasks: handoverTasks,
        medicationsDue: handoverMeds,
        pendingInvestigations: handoverInvestigations,
        shiftDate: new Date(),
      });
      setHandoverPatientId('');
      setHandoverIncomingId('');
      setHandoverCondition('');
      setHandoverConcerns('');
      setHandoverRisks('');
      setHandoverTasks('');
      setHandoverMeds('');
      setHandoverInvestigations('');
      enqueueSnackbar('Shift handover registered successfully', { variant: 'success' });
      loadHandovers();
    } catch (err) {
      enqueueSnackbar('Failed to submit handover', { variant: 'error' });
    }
  };

  const handleAcknowledgeHandover = async (handoverId: string) => {
    try {
      await api.post(`/nursing/handovers/acknowledge/${handoverId}`);
      enqueueSnackbar('Handover verified and signed electronically', { variant: 'success' });
      loadHandovers();
    } catch (err) {
      enqueueSnackbar('Failed to acknowledge handover', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ p: 4, minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <VideoCall sx={{ fontSize: 40, color: 'primary.main' }} />
            Clinical Collaboration & Telemedicine
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Secure clinical messaging, virtual consultations, MDT team reviews, case discussions, and electronic handovers
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => {
            loadMessages();
            loadMdt();
            loadHandovers();
            enqueueSnackbar('Data refreshed', { variant: 'info' });
          }}>
            Refresh Desk
          </Button>
          <Button variant="contained" color="primary" startIcon={<VideoCall />} onClick={() => setTeleOpen(true)}>
            Telehealth Console
          </Button>
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        sx={{
          mb: 4,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 'bold' },
        }}
      >
        <Tab icon={<Chat sx={{ mr: 1 }} />} iconPosition="start" label="Secure Messenger" />
        <Tab icon={<People sx={{ mr: 1 }} />} iconPosition="start" label="Case Discussions" />
        <Tab icon={<Group sx={{ mr: 1 }} />} iconPosition="start" label="MDT Meetings Board" />
        <Tab icon={<Assignment sx={{ mr: 1 }} />} iconPosition="start" label="Shift Handovers" />
        <Tab icon={<SmartDisplay sx={{ mr: 1, color: '#7c3aed' }} />} iconPosition="start" label="OpenMed™ AI Workspace" />
      </Tabs>

      {/* SECURE MESSENGER */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '70vh', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, bgcolor: alpha('#3b5bdb', 0.05), borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight="bold">Clinical Directory</Typography>
              </Box>
              <List sx={{ flex: 1, overflowY: 'auto' }}>
                {clinicians.filter(c => c.id !== myStaffId).map((c) => (
                  <ListItemButton
                    key={c.id}
                    selected={selectedClinicianId === c.id}
                    onClick={() => {
                      setSelectedClinicianId(c.id);
                      // Mark relevant incoming messages from this user as read
                      messages.forEach(m => {
                        if (m.senderId === c.id && !m.isRead) {
                          handleReadMessage(m.id);
                        }
                      });
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{c.firstName[0]}{c.lastName[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${c.firstName} ${c.lastName}`}
                      secondary={`${c.designation} (${c.departmentName || 'Medical Dept'})`}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '70vh', display: 'flex', flexDirection: 'column' }}>
              {selectedClinicianId ? (
                <>
                  {/* Chat Area Header */}
                  <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      {clinicians.filter(c => c.id === selectedClinicianId).map(c => (
                        <div key={c.id}>
                          <Typography variant="subtitle1" fontWeight="bold">{c.firstName} {c.lastName}</Typography>
                          <Typography variant="caption" color="text.secondary">{c.designation}</Typography>
                        </div>
                      ))}
                    </Box>
                  </Box>

                  {/* Chat Message Stream */}
                  <Box sx={{ flex: 1, p: 3, overflowY: 'auto', bgcolor: '#fdfdfd', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {messages
                      .filter(m =>
                        (m.senderId === myStaffId && m.recipientId === selectedClinicianId) ||
                        (m.senderId === selectedClinicianId && m.recipientId === myStaffId)
                      )
                      .map((msg) => {
                        const isMe = msg.senderId === myStaffId;
                        return (
                          <Box key={msg.id} sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                            <Box sx={{
                              p: 2,
                              borderRadius: 3,
                              bgcolor: isMe ? 'primary.main' : '#f1f3f5',
                              color: isMe ? '#fff' : 'text.primary',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}>
                              <Typography variant="body2">{msg.body}</Typography>
                              {msg.patient && (
                                <Paper variant="outlined" sx={{ p: 1, mt: 1, bgcolor: isMe ? alpha('#fff', 0.1) : '#fff', borderColor: 'divider' }}>
                                  <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', color: isMe ? '#fff' : 'primary.main' }}>
                                    Patient: {msg.patient.firstName} {msg.patient.lastName} ({msg.patient.patientNumber})
                                  </Typography>
                                </Paper>
                              )}
                              {msg.attachmentUrl && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 0.5 }}>
                                  <AttachFile fontSize="small" />
                                  <Typography variant="caption" sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
                                    Attachment: {msg.attachmentUrl}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                              {msg.priority === 'URGENT' && (
                                <Chip label="URGENT" color="error" size="small" sx={{ height: 16, fontSize: 9 }} />
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                  </Box>

                  {/* Input Box */}
                  <Divider />
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        select
                        size="small"
                        label="Priority"
                        value={chatPriority}
                        onChange={(e) => setChatPriority(e.target.value as any)}
                        sx={{ width: 140 }}
                      >
                        <MenuItem value="ROUTINE">Routine</MenuItem>
                        <MenuItem value="URGENT">Urgent Alert</MenuItem>
                      </TextField>
                      <TextField
                        select
                        size="small"
                        label="Link Patient (Optional)"
                        value={chatPatientId}
                        onChange={(e) => setChatPatientId(e.target.value)}
                        sx={{ flex: 1 }}
                      >
                        <MenuItem value="">-- None --</MenuItem>
                        {patients.map(p => (
                          <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientNumber})</MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        label="Attachment Link"
                        placeholder="path/to/scan.pdf"
                        value={chatAttachment}
                        onChange={(e) => setChatAttachment(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                    </Stack>
                    <TextField
                      fullWidth
                      placeholder="Type a secure clinical message..."
                      value={chatBody}
                      onChange={(e) => setChatBody(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton color="primary" onClick={handleSendMessage}>
                              <Send />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Box>
                </>
              ) : (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'text.secondary' }}>
                  <Chat sx={{ fontSize: 60, mb: 2 }} />
                  <Typography variant="body1">Select a clinician from directory to begin secure message consultation</Typography>
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      )}

      {/* CASE DISCUSSIONS */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '65vh' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">Case Collaboration Threads</Typography>
                  <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setCreateDiscOpen(true)}>
                    New Case Discussion
                  </Button>
                </Box>

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Filter by Patient File"
                  value={selectedPatientId}
                  onChange={(e) => {
                    setSelectedPatientId(e.target.value);
                    loadDiscussions(e.target.value);
                  }}
                  sx={{ mb: 3 }}
                >
                  {patients.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientNumber})</MenuItem>
                  ))}
                </TextField>

                <List>
                  {discussions.map((d) => (
                    <ListItemButton
                      key={d.id}
                      selected={selectedDiscussion?.id === d.id}
                      onClick={() => setSelectedDiscussion(d)}
                      sx={{ borderRadius: 2, mb: 1, border: '1px solid', borderColor: 'divider' }}
                    >
                      <ListItemText
                        primary={d.subject}
                        secondary={`Initiated by: ${d.creator.firstName} ${d.creator.lastName} on ${new Date(d.createdAt).toLocaleDateString()}`}
                      />
                      <Chip label={d.status} color={d.status === 'ACTIVE' ? 'success' : 'default'} size="small" />
                    </ListItemButton>
                  ))}
                  {discussions.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                      Select a patient record to view active multidisciplinary discussions
                    </Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            {selectedDiscussion ? (
              <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '65vh', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#3b5bdb', 0.02) }}>
                  <Typography variant="h6" fontWeight="bold">{selectedDiscussion.subject}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thread ID: {selectedDiscussion.id} • Created: {new Date(selectedDiscussion.createdAt).toLocaleString()}
                  </Typography>
                </Box>

                {/* Comments List */}
                <Box sx={{ flex: 1, p: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedDiscussion.comments.map((c) => (
                    <Paper
                      key={c.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: c.isRecommendation ? alpha('#ff922b', 0.05) : '#fff',
                        borderColor: c.isRecommendation ? '#ff922b' : 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {c.author.firstName} {c.author.lastName} ({c.author.designation})
                        </Typography>
                        {c.isRecommendation && (
                          <Chip label="CLINICAL RECOMMENDATION" size="small" color="warning" icon={<CheckCircle />} />
                        )}
                      </Box>
                      <Typography variant="body2">{c.comment}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'right' }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </Typography>
                    </Paper>
                  ))}
                </Box>

                <Divider />
                <Box sx={{ p: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Contribute to this patient's case discussion..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <FormControlLabel
                      control={<Checkbox checked={commentIsRec} onChange={(e) => setCommentIsRec(e.target.checked)} />}
                      label="Flag as Clinical Recommendation"
                    />
                    <Button variant="contained" startIcon={<Send />} onClick={handleAddComment}>
                      Submit Opinion
                    </Button>
                  </Box>
                </Box>
              </Card>
            ) : (
              <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                <Typography variant="body1">Select a discussion thread to view panel recommendation details</Typography>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* MDT MEETINGS */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '65vh' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">MDT Meeting Schedule</Typography>
                  <Button variant="contained" startIcon={<Event />} onClick={() => setCreateMdtOpen(true)}>
                    Schedule Committee
                  </Button>
                </Box>

                <List>
                  {mdtMeetings.map((m) => (
                    <Paper
                      key={m.id}
                      variant="outlined"
                      sx={{ p: 3, mb: 2, borderRadius: 3, borderColor: documentMdtId === m.id ? 'primary.main' : 'divider' }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">{m.title}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime fontSize="small" /> Scheduled: {new Date(m.scheduledAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <Chip label={m.status} color={m.status === 'COMPLETED' ? 'success' : 'primary'} size="small" />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2 }}><strong>Agenda:</strong> {m.agenda}</Typography>
                      {m.casesJson && (
                        <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
                          <strong>Patient Cases Scheduled:</strong> {m.casesJson}
                        </Typography>
                      )}
                      {m.attendanceJson && (
                        <Typography variant="caption" sx={{ display: 'block', mb: 2 }} color="text.secondary">
                          <strong>Invited Roles:</strong> {m.attendanceJson}
                        </Typography>
                      )}

                      {m.minutes && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                          <Typography variant="subtitle2" fontWeight="bold" mb={0.5}>MDT Decisions:</Typography>
                          <Typography variant="body2"><strong>Minutes:</strong> {m.minutes}</Typography>
                          <Typography variant="body2"><strong>Decisions Summary:</strong> {m.decisionsJson}</Typography>
                        </Box>
                      )}

                      {m.status === 'SCHEDULED' && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AssignmentTurnedIn />}
                            onClick={() => {
                              setDocumentMdtId(m.id);
                              setMdtMinutes('');
                              setMdtDecisions('');
                            }}
                          >
                            Document Minutes & Decisions
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            {documentMdtId ? (
              <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '65vh' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" mb={2}>Document MDT Meeting Decisions</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                    Log final minutes and therapeutic decisions reached by the multidisciplinary panel. This is saved to EMR audit trails.
                  </Typography>

                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Discussion Minutes / Case Summaries"
                    placeholder="Log detail minutes of cases discussed, patient parameters, and specialist statements..."
                    value={mdtMinutes}
                    onChange={(e) => setMdtMinutes(e.target.value)}
                    sx={{ mb: 3 }}
                  />

                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Therapeutic Decisions Reach Summary"
                    placeholder="Summary of medication updates, surgical requests, diagnostic referrals..."
                    value={mdtDecisions}
                    onChange={(e) => setMdtDecisions(e.target.value)}
                    sx={{ mb: 3 }}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button variant="text" onClick={() => setDocumentMdtId('')}>Cancel</Button>
                    <Button variant="contained" color="success" onClick={handleDocumentMdtDecisions}>
                      Commit to Records
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                <Typography variant="body1">Select scheduled committee item to document minutes</Typography>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* SHIFT HANDOVERS */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" mb={3}>Submit New Department Handover</Typography>

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Select Handover Patient"
                  value={handoverPatientId}
                  onChange={(e) => setHandoverPatientId(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  {patients.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientNumber})</MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Select Receiving Clinician"
                  value={handoverIncomingId}
                  onChange={(e) => setHandoverIncomingId(e.target.value)}
                  sx={{ mb: 2 }}
                >
                  {clinicians.filter(c => c.id !== myStaffId).map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.designation})</MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Current Condition Description"
                  placeholder="Stable, high fever, post-op day 1..."
                  value={handoverCondition}
                  onChange={(e) => setHandoverCondition(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Clinical Risks"
                  placeholder="Fall risk, drug allergy, bleeding..."
                  value={handoverRisks}
                  onChange={(e) => setHandoverRisks(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Clinical Concerns & Alerts"
                  placeholder="Elevated NEWS2 alarm, pending blood transfusion..."
                  value={handoverConcerns}
                  onChange={(e) => setHandoverConcerns(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Outstanding Tasks for Next Shift"
                  placeholder="Vitals review at 2 PM, check CBC results..."
                  value={handoverTasks}
                  onChange={(e) => setHandoverTasks(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Medications Due"
                  placeholder="Ceftriaxone IV 1g at 10 PM..."
                  value={handoverMeds}
                  onChange={(e) => setHandoverMeds(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Pending Investigations"
                  placeholder="Chest X-ray report, blood culture..."
                  value={handoverInvestigations}
                  onChange={(e) => setHandoverInvestigations(e.target.value)}
                  sx={{ mb: 3 }}
                />

                <Button fullWidth variant="contained" startIcon={<AssignmentTurnedIn />} onClick={handleCreateHandover}>
                  Register Handover
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '65vh' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" mb={3}>Handovers Logs & Acknowledgment Register</Typography>

                <List>
                  {handovers.map((h) => (
                    <Paper
                      key={h.id}
                      variant="outlined"
                      sx={{ p: 3, mb: 2, borderRadius: 3, borderLeft: '5px solid', borderColor: h.isAcknowledged ? 'success.main' : 'warning.main' }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            Patient: {h.patient.firstName} {h.patient.lastName} ({h.patient.patientNumber})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Out: {h.outgoingNurse.firstName} {h.outgoingNurse.lastName} ➔ In: {h.incomingNurse.firstName} {h.incomingNurse.lastName}
                          </Typography>
                        </Box>
                        {h.isAcknowledged ? (
                          <Chip label="Signed & Acknowledged" color="success" size="small" icon={<CheckCircle />} />
                        ) : (
                          <Chip label="Pending Acknowledgment" color="warning" size="small" icon={<Warning />} />
                        )}
                      </Box>

                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Current Condition</Typography>
                          <Typography variant="body2">{h.condition}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Risks</Typography>
                          <Typography variant="body2">{h.risks || 'No risks logged'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Clinical Concerns</Typography>
                          <Typography variant="body2">{h.clinicalConcerns || 'None'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Outstanding Tasks</Typography>
                          <Typography variant="body2">{h.outstandingTasks || 'None'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Medications Due</Typography>
                          <Typography variant="body2">{h.medicationsDue || 'None'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Pending Investigations</Typography>
                          <Typography variant="body2">{h.pendingInvestigations || 'None'}</Typography>
                        </Grid>
                      </Grid>

                      {!h.isAcknowledged && h.incomingNurseId === myStaffId && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<AssignmentTurnedIn />}
                            onClick={() => handleAcknowledgeHandover(h.id)}
                          >
                            Acknowledge Receipt & Sign
                          </Button>
                        </Box>
                      )}
                    </Paper>
                  ))}
                  {handovers.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>
                      No shift handovers logged for your ward or clinician account.
                    </Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* OPENMED CLINICAL AI WORKSPACE */}
      {activeTab === 4 && (
        <Box sx={{ mt: 1 }}>
          <OpenMedAssistant
            defaultNotes="Patient in Telemedicine consultation reports 4-day history of persistent high fever, productive cough with yellow sputum, and pleuritic chest pain. Vital signs: Temp 38.8°C, SpO2 92% on room air, BP 135/85 mmHg. Prescribed Amoxicillin/Clavulanate 1g BD and Paracetamol 1g TDS."
            patientName="Telehealth Patient"
          />
        </Box>
      )}

      {/* ── DIALOG: CREATE DISCUSSION THREAD ─────────────────────────── */}
      <Dialog open={createDiscOpen} onClose={() => setCreateDiscOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Initiate Case Discussion</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              select
              fullWidth
              label="Select Patient"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              {patients.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientNumber})</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="Case Discussion Subject / Diagnosis title"
              placeholder="e.g. Recurrent Stroke Multi-Disciplinary Care Strategy"
              value={newDiscussionSubject}
              onChange={(e) => setNewDiscussionSubject(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDiscOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateDiscussion}>Create Thread</Button>
        </DialogActions>
      </Dialog>

      {/* ── DIALOG: CREATE MDT COMMITTEE MEETING ───────────────────── */}
      <Dialog open={createMdtOpen} onClose={() => setCreateMdtOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Schedule MDT Panel Review</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Meeting Title"
              placeholder="Cardiology-Oncology Complex Case Board"
              value={mdtTitle}
              onChange={(e) => setMdtTitle(e.target.value)}
            />
            <TextField
              fullWidth
              type="datetime-local"
              label="Scheduled Date & Time"
              InputLabelProps={{ shrink: true }}
              value={mdtScheduledAt}
              onChange={(e) => setMdtScheduledAt(e.target.value)}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Agenda & Objective"
              placeholder="Review chemotherapy dosing modification for breast cancer patient with heart failure..."
              value={mdtAgenda}
              onChange={(e) => setMdtAgenda(e.target.value)}
            />
            <TextField
              fullWidth
              label="Scheduled Patient Cases (MRNs)"
              placeholder="e.g. FFH-PAT-001, FFH-PAT-023"
              value={mdtCases}
              onChange={(e) => setMdtCases(e.target.value)}
            />
            <TextField
              fullWidth
              label="Invited Clinical Roles"
              placeholder="e.g. Cardiologist, Oncologist, Ward Nurse, Clinical Pharmacist"
              value={mdtAttendees}
              onChange={(e) => setMdtAttendees(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateMdtOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateMdt}>Schedule</Button>
        </DialogActions>
      </Dialog>

      {/* ── DIALOG: TELEMEDICINE VIRTUAL CONSULTATION CONSOLE ───────── */}
      <Dialog open={teleOpen} onClose={() => { if(!teleSession) setTeleOpen(false); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Telehealth Consultation Workspace</span>
          {teleSession && (
            <Chip
              icon={<RadioButtonChecked sx={{ color: 'error.main', animation: 'pulse 1.5s infinite' }} />}
              label={`LIVE SECURE SESSION • ${formatTimer(callTimer)}`}
              color="error"
              variant="outlined"
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {teleSession ? (
            <Grid container spacing={3}>
              {/* WebRTC Mock Call Viewport */}
              <Grid item xs={12} md={7}>
                <Box sx={{
                  bgcolor: '#1a1b20',
                  height: 380,
                  borderRadius: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isCamOff ? (
                    <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                      <VideocamOff sx={{ fontSize: 60, mb: 1 }} />
                      <Typography variant="body2">Your camera is turned off</Typography>
                    </Box>
                  ) : (
                    // Mock patient visual channel stream
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="h6" color="#fff" fontWeight="normal">
                        Patient Feed: {teleSession.patient.firstName} {teleSession.patient.lastName} (Connected)
                      </Typography>
                      {/* Self-preview thumbnail overlay */}
                      <Box sx={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        width: 120,
                        height: 90,
                        bgcolor: '#2e3035',
                        borderRadius: 2,
                        boxShadow: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #fff'
                      }}>
                        <Typography variant="caption" color="#fff">Doctor (Me)</Typography>
                      </Box>
                    </Box>
                  )}

                  {/* WebRTC overlay tool controls */}
                  <Box sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1.5,
                    bgcolor: 'rgba(0,0,0,0.65)',
                    p: 1,
                    borderRadius: 4
                  }}>
                    <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <MicOff color="error" /> : <Mic />}
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setIsCamOff(!isCamOff)}>
                      {isCamOff ? <VideocamOff color="error" /> : <Videocam />}
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setIsScreenSharing(!isScreenSharing)}>
                      {isScreenSharing ? <StopScreenShare color="warning" /> : <ScreenShare />}
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setIsRecording(!isRecording)}>
                      {isRecording ? <RadioButtonChecked color="error" /> : <RadioButtonUnchecked />}
                    </IconButton>
                  </Box>
                </Box>

                {/* Call stats banner */}
                <Stack direction="row" spacing={3} mt={2} justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Encryption: end-to-end TLS/WebRTC secure tunnel
                  </Typography>
                  {isRecording && (
                    <Typography variant="caption" color="error.main" fontWeight="bold">
                      🔴 RECORDING SESSION WITH DOCUMENTED CONSENT
                    </Typography>
                  )}
                </Stack>
              </Grid>

              {/* SOAP Documentation notepad */}
              <Grid item xs={12} md={5}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>EMR Consultation Summary Note</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  placeholder="Record symptoms, assessments, drug prescriptions, and orders here. Completed summary note will automatically sync to patient's clinical EMR files..."
                  value={teleNotes}
                  onChange={(e) => setTeleNotes(e.target.value)}
                  sx={{ mb: 3 }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={<AssignmentTurnedIn />}
                  onClick={handleCompleteTelemedicine}
                >
                  Complete & Sync to EMR
                </Button>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 400, mx: 'auto' }}>
              <Typography variant="subtitle2" align="center" color="text.secondary">
                Configure patient consent and select patient target to establish virtual audio/video consultation link.
              </Typography>

              <TextField
                select
                fullWidth
                label="Target Patient"
                value={telePatientId}
                onChange={(e) => setTelePatientId(e.target.value)}
              >
                {patients.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.patientNumber})</MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="Room / WebRTC Channel Identifier"
                placeholder="e.g. clinic-room-101"
                value={teleRoomName}
                onChange={(e) => setTeleRoomName(e.target.value)}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Acquire Patient Recording Consent</Typography>
                <Switch checked={teleConsent} onChange={(e) => setTeleConsent(e.target.checked)} />
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<SmartDisplay />}
                onClick={handleStartTelemedicine}
              >
                Launch Virtual Stream
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!teleSession && <Button onClick={() => setTeleOpen(false)}>Close Workspace</Button>}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Telemedicine;
