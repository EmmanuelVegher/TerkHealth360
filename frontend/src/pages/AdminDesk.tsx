import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Grid, Card, Typography, Button, TextField, Chip, Alert, Stack,
  IconButton, Tooltip, Avatar, Divider, Paper, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  Send, Refresh, CheckCircle, Assignment, Chat, HourglassEmpty, Add
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';

const PRIMARY = '#1e3a8a';
const SECONDARY = '#2563eb';
const SUCCESS = '#16a34a';

export default function AdminDesk() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // New task form state (for admin simulate / display)
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN');

  const fetchChat = async () => {
    try {
      const res = await api.get('/hr/admin-chat');
      if (res.data?.success) {
        setMessages(res.data.data);
      }
    } catch (err) {}
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get('/hr/admin-tasks');
      if (res.data?.success) {
        setTasks(res.data.data);
      }
    } catch (err) {}
  };

  const fetchData = () => {
    fetchChat();
    fetchTasks();
  };

  useEffect(() => {
    fetchData();
    // Poll chat every 5 seconds for interactive feel
    const timer = setInterval(fetchChat, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      const input = chatInput;
      setChatInput('');
      const res = await api.post('/hr/admin-chat', { content: input });
      if (res.data?.success) {
        fetchChat();
      }
    } catch (err) {
      enqueueSnackbar('Failed to send message', { variant: 'error' });
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      const payload = {
        title: taskTitle,
        assignedTo: 'FF-0001',
        assignedToName: 'Emmanuel Vegher',
        deadline: taskDeadline || new Date().toISOString().slice(0, 10)
      };
      await api.post('/hr/admin-tasks', payload);
      enqueueSnackbar('Secretary task assigned successfully', { variant: 'success' });
      setTaskTitle('');
      setTaskDeadline('');
      fetchTasks();
    } catch (err) {
      enqueueSnackbar('Failed to create task', { variant: 'error' });
    }
  };

  const handleCompleteTask = async (id: string) => {
    try {
      await api.patch(`/hr/admin-tasks/${id}`, { status: 'COMPLETED' });
      enqueueSnackbar('Task marked as completed!', { variant: 'success' });
      fetchTasks();
    } catch (err) {
      enqueueSnackbar('Failed to update task status', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ height: '100vh', bgcolor: '#f1f5f9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #1e1b4b 100%)`, color: '#fff', px: 3, py: 1.5, borderRadius: '0 0 16px 16px', flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.2 }}>🤝 Admin & Secretary Collaboration Workspace</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>
              {isAdmin ? "Episcopal Direct Chat & Actionable Secretary Directive Controls" : "Direct Interactive Channel with the Hospital Administrator Desk"}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh Feed"><IconButton onClick={fetchData} size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh fontSize="small" /></IconButton></Tooltip>
            <Chip label="Secure Channel Active" color="success" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
          </Stack>
        </Stack>
      </Box>

      {/* Grid Workspace */}
      <Grid container spacing={2.5} sx={{ p: 2, flex: 1, overflow: 'hidden' }}>
        {/* Chat Panel */}
        <Grid item xs={12} md={7} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Card sx={{ borderRadius: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: SECONDARY }}><Chat /></Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>
                  {isAdmin ? "Direct Channel: Secretary (Emmanuel Vegher)" : "Direct Channel: Hospital Administrator"}
                </Typography>
                <Typography variant="caption" color="text.secondary">Secure End-to-End Chat Logs</Typography>
              </Box>
            </Box>

            {/* Chat Messages */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#fafafa' }}>
              {messages.map((msg) => {
                const isMe = msg.sender === user?.username || (msg.sender === 'FF-0001' && !isAdmin) || (msg.sender === 'admin' && isAdmin);
                return (
                  <Box key={msg.id} sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                    <Paper elevation={0} sx={{
                      p: 1.5,
                      borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                      bgcolor: isMe ? SECONDARY : '#fff',
                      color: isMe ? '#fff' : '#1e293b',
                      border: isMe ? 'none' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      {!isMe && (
                        <Typography variant="caption" sx={{ fontWeight: 800, color: SECONDARY, display: 'block', mb: 0.5 }}>
                          {msg.senderName}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ lineHeight: 1.4 }}>{msg.content}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, opacity: 0.7, fontSize: '0.62rem' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
              <div ref={chatEndRef} />
            </Box>

            {/* Message input */}
            <Box component="form" onSubmit={handleSendChat} sx={{ p: 1.5, borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  placeholder="Type a message to admin..."
                  size="small"
                  fullWidth
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  autoComplete="off"
                />
                <Button type="submit" variant="contained" endIcon={<Send />} sx={{ bgcolor: SECONDARY }}>
                  Send
                </Button>
              </Stack>
            </Box>
          </Card>
        </Grid>

        {/* Task and Controls Panel */}
        <Grid item xs={12} md={5} sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Admin directives tasks */}
          <Card sx={{ borderRadius: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: '#fffbeb', color: '#b45309' }}><Assignment /></Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>Directives & Action Tasks</Typography>
                <Typography variant="caption" color="text.secondary">Assigned operational tasks list</Typography>
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
              {tasks.length === 0 ? (
                <Alert severity="info">No outstanding directive tasks registered.</Alert>
              ) : (
                <List disablePadding>
                  {tasks.map((task) => (
                    <ListItem key={task.id} sx={{ mb: 1, border: '1px solid #e2e8f0', borderRadius: 1.5, bgcolor: '#fff' }} secondaryAction={
                      !isAdmin && task.status === 'PENDING' ? (
                        <Button size="small" variant="contained" color="success" onClick={() => handleCompleteTask(task.id)} sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.72rem' }}>
                          Done
                        </Button>
                      ) : null
                    }>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {task.status === 'COMPLETED' ? (
                          <CheckCircle sx={{ color: SUCCESS }} />
                        ) : (
                          <HourglassEmpty sx={{ color: '#b45309' }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2" sx={{ fontWeight: 700, textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none', color: task.status === 'COMPLETED' ? 'text.secondary' : '#1e293b' }}>{task.title}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">Target Deadline: {task.deadline}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Card>

          {/* Admin Task Assignment Panel */}
          {isAdmin && (
            <Card sx={{ borderRadius: 2, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b', mb: 1.5 }}>Assign Secretary Directive</Typography>
              <form onSubmit={handleCreateTask}>
                <Stack spacing={2}>
                  <TextField
                    label="Task Title / Directive Instruction"
                    size="small"
                    required
                    fullWidth
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="e.g. Schedule emergency board room meeting"
                  />
                  <TextField
                    label="Target Deadline"
                    type="date"
                    size="small"
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={taskDeadline}
                    onChange={e => setTaskDeadline(e.target.value)}
                  />
                  <Button type="submit" variant="contained" startIcon={<Add />} fullWidth sx={{ bgcolor: PRIMARY }}>
                    Assign Task
                  </Button>
                </Stack>
              </form>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
