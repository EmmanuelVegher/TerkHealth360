import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Button, TextField, MenuItem, Chip, Alert, Stack,
  IconButton, Tooltip, Avatar, Divider, Grid, Paper, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Send, Refresh, Campaign, Add, Search, Assessment, EventNote, Mail
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';

const PRIMARY = '#1e3a8a';
const SECONDARY = '#2563eb';
const SUCCESS = '#16a34a';

export default function InternalMemos() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [memos, setMemos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Publish memo state
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [memoTitle, setMemoTitle] = useState('');
  const [targetType, setTargetType] = useState('ALL');
  const [targetDept, setTargetDept] = useState('Nursing');
  const [memoContent, setMemoContent] = useState('');

  // Selected memo view state
  const [selectedMemo, setSelectedMemo] = useState<any | null>(null);

  const userDesignation = user?.designation || (user as any)?.staff?.designation || '';
  const canPublish = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN') || userDesignation === 'Secretary';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/memos');
      if (res.data?.success) {
        setMemos(res.data.data);
      }
    } catch (err) {
      enqueueSnackbar('Failed to fetch internal memos', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePublishMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: memoTitle,
        targetType,
        targetDepartment: targetType === 'DEPARTMENTAL' ? targetDept : undefined,
        content: memoContent,
        department: 'Administration'
      };
      await api.post('/hr/memos', payload);
      enqueueSnackbar('Internal memo published successfully!', { variant: 'success' });
      setPublishDialogOpen(false);
      setMemoTitle('');
      setMemoContent('');
      fetchData();
    } catch (err) {
      enqueueSnackbar('Failed to publish memo', { variant: 'error' });
    }
  };

  const filteredMemos = memos.filter(m => {
    const matchesSearch = m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sender?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <Box sx={{ height: '100vh', bgcolor: '#f1f5f9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #1e1b4b 100%)`, color: '#fff', px: 3, py: 1.5, borderRadius: '0 0 16px 16px', flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.2 }}>📣 Hospital Internal Memos & Bulletins</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>Official directives, departmental announcements, and policy declarations board</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh Bulletin"><IconButton onClick={fetchData} size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh fontSize="small" /></IconButton></Tooltip>
            {canPublish && (
              <Button variant="contained" startIcon={<Campaign />} onClick={() => setPublishDialogOpen(true)} sx={{ bgcolor: '#fff', color: PRIMARY, fontWeight: 700, '&:hover': { bgcolor: '#f8fafc' }, textTransform: 'none', px: 2, py: 0.5, borderRadius: 2 }}>
                Publish Memo
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Main Workspace */}
      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Controls */}
        <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center" flexShrink={0}>
          <TextField
            size="small"
            placeholder="Search memos by title or sender..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <Search fontSize="small" /> }}
            sx={{ flexGrow: 1, bgcolor: '#fff', borderRadius: 1.5 }}
          />
        </Stack>

        {/* Memo Grid */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {filteredMemos.length === 0 ? (
            <Alert severity="info">No internal memos published on the bulletin yet.</Alert>
          ) : (
            <Grid container spacing={2.5}>
              {filteredMemos.map((memo) => (
                <Grid item xs={12} md={6} key={memo.id}>
                  <Card sx={{ p: 2.5, borderRadius: 2.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', cursor: 'pointer', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }, transition: 'all 0.2s ease-in-out' }} onClick={() => setSelectedMemo(memo)}>
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1e293b', flexGrow: 1, pr: 2 }}>{memo.title}</Typography>
                        <Chip
                          label={memo.targetType === 'ALL' ? 'ALL STAFF' : memo.targetDepartment}
                          color={memo.targetType === 'ALL' ? 'primary' : 'secondary'}
                          size="small"
                          sx={{ fontSize: '0.62rem', fontWeight: 800 }}
                        />
                      </Stack>
                      <Typography variant="body2" sx={{ color: '#475569', mb: 2, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                        {memo.content}
                      </Typography>
                    </Box>

                    <Box sx={{ borderTop: '1px solid #f1f5f9', pt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28, bgcolor: PRIMARY, fontSize: '0.7rem' }}>
                          {memo.sender?.[0] || 'A'}
                        </Avatar>
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block' }}>{memo.sender}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>{memo.department}</Typography>
                        </Box>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{memo.date}</Typography>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>

      {/* Publish Memo Dialog */}
      <Dialog open={publishDialogOpen} onClose={() => setPublishDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handlePublishMemo}>
          <DialogTitle sx={{ fontWeight: 800 }}>Publish Internal Memo</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label="Memo Title / Subject"
                placeholder="e.g. Revised Shift Handover Protocol"
                value={memoTitle}
                onChange={e => setMemoTitle(e.target.value)}
                size="small"
                fullWidth
                required
              />
              <TextField
                select
                label="Target Audience Type"
                value={targetType}
                onChange={e => setTargetType(e.target.value)}
                size="small"
                fullWidth
                required
              >
                <MenuItem value="ALL">All Hospital Staff (Broad Broadcast)</MenuItem>
                <MenuItem value="DEPARTMENTAL">Specific Department / Unit</MenuItem>
              </TextField>
              {targetType === 'DEPARTMENTAL' && (
                <TextField
                  select
                  label="Target Department"
                  value={targetDept}
                  onChange={e => setTargetDept(e.target.value)}
                  size="small"
                  fullWidth
                  required
                >
                  <MenuItem value="OPD">Outpatient Department (OPD)</MenuItem>
                  <MenuItem value="Nursing">Nursing Department</MenuItem>
                  <MenuItem value="Pharmacy">Pharmacy</MenuItem>
                  <MenuItem value="Laboratory">Laboratory / Pathology</MenuItem>
                  <MenuItem value="Administration">General Administration</MenuItem>
                </TextField>
              )}
              <TextField
                label="Memo Content & Directives"
                placeholder="Write the full memo body details here..."
                value={memoContent}
                onChange={e => setMemoContent(e.target.value)}
                size="small"
                fullWidth
                required
                multiline
                rows={5}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPublishDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: PRIMARY }}>Publish Memo</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Memo Details Dialog */}
      {selectedMemo && (
        <Dialog open={Boolean(selectedMemo)} onClose={() => setSelectedMemo(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 850 }}>
            {selectedMemo.title}
          </DialogTitle>
          <DialogContent dividers sx={{ pb: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>TARGET AUDIENCE</Typography>
                  <Chip
                    label={selectedMemo.targetType === 'ALL' ? 'ALL STAFF' : selectedMemo.targetDepartment}
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 800, fontSize: '0.68rem', mt: 0.5 }}
                  />
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>PUBLICATION DATE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>{selectedMemo.date}</Typography>
                </Box>
              </Stack>
              <Divider />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#1e293b' }}>
                {selectedMemo.content}
              </Typography>
              <Divider />
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 44, height: 44, bgcolor: PRIMARY }}>
                  {selectedMemo.sender?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>{selectedMemo.sender}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedMemo.department} · SmartHospital Authority</Typography>
                </Box>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedMemo(null)} variant="contained" sx={{ bgcolor: PRIMARY }}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
