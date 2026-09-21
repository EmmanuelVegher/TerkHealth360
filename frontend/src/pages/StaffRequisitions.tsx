import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, Typography, Button, TextField, MenuItem, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert, Stack,
  IconButton, Tooltip, InputAdornment, Avatar
} from '@mui/material';
import {
  Add, Search, Refresh, CheckCircle, Cancel, HourglassEmpty,
  Assignment, AccountBalance, Message, Assessment
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';

const PRIMARY = '#1e3a8a';
const SECONDARY = '#2563eb';
const SUCCESS = '#16a34a';
const WARNING = '#ea580c';
const DANGER = '#dc2626';

export default function StaffRequisitions() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Request form state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [reqType, setReqType] = useState('DEPARTMENTAL_REQUEST');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDept, setReqDept] = useState('');
  const [reqContent, setReqContent] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/internal-requests');
      if (res.data?.success) {
        setRequests(res.data.data);
      }
    } catch (err) {
      enqueueSnackbar('Failed to fetch internal requests', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        type: reqType,
        title: reqTitle,
        department: reqDept,
        requester: user ? `${user.firstName} ${user.lastName}` : 'Secretary',
        content: reqContent
      };
      await api.post('/hr/internal-requests', payload);
      enqueueSnackbar('Internal request submitted successfully', { variant: 'success' });
      setCreateDialogOpen(false);
      setReqTitle('');
      setReqDept('');
      setReqContent('');
      fetchData();
    } catch (err) {
      enqueueSnackbar('Failed to submit internal request', { variant: 'error' });
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/hr/internal-requests/${id}/status`, { status });
      enqueueSnackbar(`Request successfully ${status.toLowerCase()}`, { variant: 'info' });
      fetchData();
    } catch (err) {
      enqueueSnackbar('Failed to update request status', { variant: 'error' });
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requester?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Chip label="APPROVED" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.68rem' }} />;
      case 'REJECTED':
        return <Chip label="REJECTED" size="small" sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: '0.68rem' }} />;
      default:
        return <Chip label="PENDING APPROVAL" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 800, fontSize: '0.68rem' }} />;
    }
  };

  const getTypeLabel = (type: string) => {
    return type?.replace('_', ' ');
  };

  return (
    <Box sx={{ height: '100vh', bgcolor: '#f1f5f9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Banner */}
      <Box sx={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, ${SECONDARY} 100%)`, color: '#fff', px: 3, py: 1.5, borderRadius: '0 0 16px 16px', flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.2 }}>📋 Staff Internal Requisitions & Requests</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>Departmental needs, bill requisitions, unit complaints, and administrative approvals desk</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh Request Registry"><IconButton onClick={fetchData} size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)' }}><Refresh fontSize="small" /></IconButton></Tooltip>
            {!isAdmin && (
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)} sx={{ bgcolor: '#fff', color: PRIMARY, fontWeight: 700, '&:hover': { bgcolor: '#f8fafc' }, textTransform: 'none', px: 2, py: 0.5, borderRadius: 2 }}>
                Submit Requisition
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ px: 2, pt: 2, flexShrink: 0 }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Card sx={{ p: 2, borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#eff6ff', color: SECONDARY, width: 44, height: 44 }}><Assignment /></Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Total Requisitions</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>{requests.length}</Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ p: 2, borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#fffbeb', color: WARNING, width: 44, height: 44 }}><HourglassEmpty /></Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Pending Review</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>{requests.filter(r => r.status === 'PENDING').length}</Typography>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card sx={{ p: 2, borderRadius: 2.5, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#ecfdf5', color: SUCCESS, width: 44, height: 44 }}><CheckCircle /></Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Approved Requests</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>{requests.filter(r => r.status === 'APPROVED').length}</Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Main workspace */}
      <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Card sx={{ borderRadius: 2, p: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Controls */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
            <TextField
              size="small"
              placeholder="Search by title, requester or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              sx={{ flexGrow: 1 }}
            />
            <TextField
              select
              size="small"
              label="Filter by Type"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="ALL">All Request Types</MenuItem>
              <MenuItem value="DEPARTMENTAL_REQUEST">Departmental Requests</MenuItem>
              <MenuItem value="UNIT_REQUEST">Unit Requests</MenuItem>
              <MenuItem value="BILL_REQUISITION">Bill Requisitions</MenuItem>
              <MenuItem value="STAFF_COMPLAINT">Staff Complaints</MenuItem>
            </TextField>
          </Stack>

          <TableContainer component={Paper} sx={{ borderRadius: 2, flex: 1, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead sx={{ bgcolor: PRIMARY }}>
                <TableRow>
                  {['Req ID', 'Type', 'Requisition Title', 'Dept/Unit', 'Submitted By', 'Description / Details', 'Date Logged', 'Approval Status', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ bgcolor: `${PRIMARY} !important`, color: '#ffffff !important', fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><Alert severity="info">No requisitions found matching the selection criteria.</Alert></TableCell></TableRow>
                ) : (
                  filteredRequests.map(req => (
                    <TableRow key={req.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: SECONDARY }}>{req.id}</TableCell>
                      <TableCell><Chip label={getTypeLabel(req.type)} size="small" variant="outlined" sx={{ fontSize: '0.65rem', fontWeight: 600 }} /></TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{req.title}</TableCell>
                      <TableCell>{req.department || 'All'}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{req.requester}</TableCell>
                      <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{req.content}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{req.date}</TableCell>
                      <TableCell>{getStatusChip(req.status)}</TableCell>
                      <TableCell>
                        {isAdmin && req.status === 'PENDING' ? (
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Approve Request">
                              <IconButton size="small" color="success" onClick={() => handleUpdateStatus(req.id, 'APPROVED')}><CheckCircle fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Reject Request">
                              <IconButton size="small" color="error" onClick={() => handleUpdateStatus(req.id, 'REJECTED')}><Cancel fontSize="small" /></IconButton>
                            </Tooltip>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      {/* Create Requisition Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitRequest}>
          <DialogTitle sx={{ fontWeight: 800 }}>Submit Internal Requisition</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                select
                label="Requisition Type"
                value={reqType}
                onChange={e => setReqType(e.target.value)}
                size="small"
                fullWidth
                required
              >
                <MenuItem value="DEPARTMENTAL_REQUEST">Departmental Request</MenuItem>
                <MenuItem value="UNIT_REQUEST">Unit Request</MenuItem>
                <MenuItem value="BILL_REQUISITION">Bill Requisition (Expenses / Invoices)</MenuItem>
                <MenuItem value="STAFF_COMPLAINT">Staff Complaint / Query Redressal</MenuItem>
              </TextField>
              <TextField
                label="Requisition Title / Summary"
                placeholder="e.g. Purchase of replacement ECG lead cables"
                value={reqTitle}
                onChange={e => setReqTitle(e.target.value)}
                size="small"
                fullWidth
                required
              />
              <TextField
                label="Target Department / Unit"
                placeholder="e.g. Cardiology / OPD Desk / General Administration"
                value={reqDept}
                onChange={e => setReqDept(e.target.value)}
                size="small"
                fullWidth
                required
              />
              <TextField
                label="Detailed Requisition Particulars"
                placeholder="Provide comprehensive details, quantity, estimated cost, justification..."
                value={reqContent}
                onChange={e => setReqContent(e.target.value)}
                size="small"
                fullWidth
                required
                multiline
                rows={4}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: PRIMARY }}>Submit Requisition</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
