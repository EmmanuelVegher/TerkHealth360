import { useState, useEffect } from 'react';
import {
  Typography, Box, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Button, Grid, Chip,
  Divider, Paper, TablePagination, CircularProgress, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Search, Download, FilterList, Info, Visibility } from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  changes: any;
  createdAt: string;
  user?: {
    username: string;
  };
}

const AuditLogs = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [action, setAction] = useState('');
  const [resType, setResType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRows, setTotalRows] = useState(0);

  // Detail view Dialog
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit-logs', {
        params: {
          action,
          resourceType: resType,
          startDate,
          endDate,
          page: page + 1,
          limit: rowsPerPage,
        },
      });
      setLogs(response.data.data);
      setTotalRows(response.data.pagination.total);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to fetch security audit logs', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, rowsPerPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchLogs();
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await api.get('/audit-logs/export', {
        params: { action, resourceType: resType, startDate, endDate },
        responseType: 'blob', // standard for files download
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      enqueueSnackbar('Audit log CSV exported successfully!', { variant: 'success' });
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to export audit logs', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const getActionColor = (act: string) => {
    if (act.includes('failed') || act.includes('locked')) return 'error';
    if (act.includes('create') || act.includes('success')) return 'success';
    if (act.includes('update') || act.includes('change')) return 'warning';
    if (act.includes('delete') || act.includes('deactivate')) return 'error';
    return 'info';
  };

  return (
    <div>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Immutable Security Audit Logs</Typography>
        <Button
          variant="contained"
          color="success"
          startIcon={<Download />}
          onClick={handleExportCSV}
          disabled={exporting}
          sx={{ borderRadius: 2 }}
        >
          {exporting ? 'Exporting...' : 'Export to CSV'}
        </Button>
      </Box>

      {/* Filter panel */}
      <Card sx={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterList color="primary" />
            <Typography variant="h6" fontWeight={700}>Filter Audit Trail</Typography>
          </Box>
          <Divider sx={{ mb: 2.5 }} />
          <form onSubmit={handleSearchSubmit}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Action"
                  placeholder="e.g. login, create"
                  value={action}
                  onChange={e => setAction(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Resource Type"
                  placeholder="e.g. User, Department"
                  value={resType}
                  onChange={e => setResType(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Start Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="End Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={2} sx={{ display: 'flex', gap: 1 }}>
                <Button type="submit" variant="contained" fullWidth size="small">
                  Filter
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => { setAction(''); setResType(''); setStartDate(''); setEndDate(''); }}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card sx={{ border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Actor</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Resource Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>IP Address</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id} hover>
                      <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {log.user 
                          ? (log.user as any).staff 
                            ? `${(log.user as any).staff.firstName} ${(log.user as any).staff.lastName}` 
                            : `@${log.user.username}` 
                          : 'System/Guest'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color={getActionColor(log.action)}
                          sx={{ height: 20, fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>{log.resourceType}</TableCell>
                      <TableCell>{log.ipAddress || '127.0.0.1'}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="info"
                          onClick={() => { setSelectedLog(log); setOpenDetail(true); }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        No audit logs matching search parameters were found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalRows}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Card>

      {/* DETAIL DIALOG */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Audit Trail Event Entry</DialogTitle>
        <DialogContent dividers>
          {selectedLog && (
            <Grid container spacing={1.5}>
              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Event ID:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedLog.id}</Typography>
              </Grid>

              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Timestamp:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{new Date(selectedLog.createdAt).toLocaleString()}</Typography>
              </Grid>

              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Security Action:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Chip label={selectedLog.action} size="small" color={getActionColor(selectedLog.action)} />
              </Grid>

              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Resource Entity:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{selectedLog.resourceType} ({selectedLog.resourceId || 'N/A'})</Typography>
              </Grid>

              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">Client IP:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2">{selectedLog.ipAddress || '127.0.0.1'}</Typography>
              </Grid>

              <Grid item xs={4}>
                <Typography variant="body2" color="text.secondary">User Agent:</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{selectedLog.userAgent}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Data Event Payload (Changes)</Typography>
                <Box
                  sx={{
                    bgcolor: 'grey.900',
                    color: 'common.white',
                    p: 2,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    maxHeight: 250,
                  }}
                >
                  <pre>{JSON.stringify(selectedLog.changes || {}, null, 2)}</pre>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetail(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
