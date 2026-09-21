import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, InputAdornment, Tabs, Tab, Avatar,
} from '@mui/material';
import { Add, Search, Edit, Visibility, Science, CheckCircle, AccessTime, Cancel } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
const TEST_TYPES = [
  'Complete Blood Count (CBC)', 'Blood Sugar (Fasting)', 'Blood Sugar (Random)',
  'Liver Function Test (LFT)', 'Kidney Function Test (KFT)', 'Malaria Parasite (MP)',
  'Urinalysis', 'HIV Test', 'Hepatitis B', 'Typhoid (Widal)', 'Chest X-Ray',
  'Urine Culture & Sensitivity', 'Stool Analysis', 'Pregnancy Test',
];
type LabStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
interface LabTest {
  id: number;
  testNo: string;
  patientName: string;
  patientId: string;
  testType: string;
  referredBy: string;
  date: string;
  status: LabStatus;
  result?: string;
  amount: number;
}
const statusMeta: Record<LabStatus, { color: 'warning'|'info'|'success'|'error'; icon: React.ReactNode }> = {
  Pending:     { color: 'warning', icon: <AccessTime sx={{ fontSize: 14 }} /> },
  'In Progress': { color: 'info',    icon: <Science sx={{ fontSize: 14 }} /> },
  Completed:   { color: 'success', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  Cancelled:   { color: 'error',   icon: <Cancel sx={{ fontSize: 14 }} /> },
};
const emptyForm = {
  patientName: '', patientId: '', testType: '', referredBy: '', amount: '', date: new Date().toISOString().slice(0,10),
};
const Lab = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [resultText, setResultText] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tests, setTests] = useState<LabTest[]>([
    { id: 1, testNo: 'LAB-001', patientName: 'Emeka Okonkwo',  patientId: 'P-1001', testType: 'Complete Blood Count (CBC)', referredBy: 'Dr. Okafor',  date: '2026-06-24', status: 'Completed',   result: 'Hb: 13.2 g/dL, WBC: 6.2 × 10³, Platelets: 210 × 10³. All within normal range.', amount: 3500 },
    { id: 2, testNo: 'LAB-002', patientName: 'Adaeze Chukwu',  patientId: 'P-1002', testType: 'Malaria Parasite (MP)',        referredBy: 'Dr. Aliyu',   date: '2026-06-24', status: 'In Progress', amount: 2000 },
    { id: 3, testNo: 'LAB-003', patientName: 'Yusuf Ibrahim',  patientId: 'P-1003', testType: 'Blood Sugar (Fasting)',        referredBy: 'Dr. Okafor',  date: '2026-06-24', status: 'Pending',    amount: 1500 },
    { id: 4, testNo: 'LAB-004', patientName: 'Bisi Adeyemi',   patientId: 'P-1004', testType: 'Liver Function Test (LFT)',    referredBy: 'Dr. Musa',    date: '2026-06-23', status: 'Completed',  result: 'ALT: 28 U/L, AST: 32 U/L, ALP: 95 U/L. Liver function normal.', amount: 5000 },
    { id: 5, testNo: 'LAB-005', patientName: 'Kemi Owolabi',   patientId: 'P-1005', testType: 'Urinalysis',                   referredBy: 'Dr. Aliyu',   date: '2026-06-23', status: 'Pending',    amount: 1200 },
    { id: 6, testNo: 'LAB-006', patientName: 'Damilola Afolabi',patientId: 'P-1006', testType: 'HIV Test',                   referredBy: 'Dr. Okafor',  date: '2026-06-22', status: 'Completed',  result: 'Non-reactive. No HIV antibodies detected.', amount: 2500 },
  ]);
  const filtered = tests.filter(t => {
    const statusTab = ['All', 'Pending', 'In Progress', 'Completed'][tab];
    const matchStatus = statusTab === 'All' || t.status === statusTab;
    const matchSearch = t.patientName.toLowerCase().includes(search.toLowerCase()) ||
      t.testNo.toLowerCase().includes(search.toLowerCase()) ||
      t.testType.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });
  const handleSave = () => {
    const newTest: LabTest = {
      id: Date.now(),
      testNo: `LAB-${String(tests.length + 1).padStart(3, '0')}`,
      patientName: form.patientName,
      patientId: form.patientId,
      testType: form.testType,
      referredBy: form.referredBy,
      date: form.date,
      status: 'Pending',
      amount: Number(form.amount),
    };
    setTests(prev => [newTest, ...prev]);
    enqueueSnackbar('Lab test request created', { variant: 'success' });
    setOpen(false);
  };
  const handleResult = (id: number) => {
    const t = tests.find(x => x.id === id);
    setSelectedId(id);
    setResultText(t?.result ?? '');
    setResultOpen(true);
  };
  const saveResult = () => {
    setTests(prev => prev.map(t =>
      t.id === selectedId ? { ...t, result: resultText, status: 'Completed' } : t
    ));
    enqueueSnackbar('Lab result saved', { variant: 'success' });
    setResultOpen(false);
  };
  const counts = {
    all: tests.length,
    pending: tests.filter(t => t.status === 'Pending').length,
    inProgress: tests.filter(t => t.status === 'In Progress').length,
    completed: tests.filter(t => t.status === 'Completed').length,
  };
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Laboratory</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Manage lab tests, requests and results</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          New Test Request
        </Button>
      </Box>
      {/* Summary */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Tests Today', value: counts.all,       color: '#3b5bdb' },
          { label: 'Pending',           value: counts.pending,   color: '#f59f00' },
          { label: 'In Progress',       value: counts.inProgress,color: '#1c7ed6' },
          { label: 'Completed',         value: counts.completed, color: '#2f9e44' },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: 'none' }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={800} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontWeight: 600, fontSize: '0.82rem' } }}>
              <Tab label={`All (${counts.all})`} />
              <Tab label={`Pending (${counts.pending})`} />
              <Tab label={`In Progress (${counts.inProgress})`} />
              <Tab label={`Completed (${counts.completed})`} />
            </Tabs>
            <TextField
              placeholder="Search tests…"
              size="small"
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
              sx={{ width: 240 }}
            />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Test No.</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Test Type</TableCell>
                  <TableCell>Referred By</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount (₦)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="primary.main">{t.testNo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 30, height: 30, fontSize: '0.7rem', bgcolor: alpha('#3b5bdb', 0.1), color: '#3b5bdb' }}>
                          {t.patientName.split(' ').map(n => n[0]).slice(0,2).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{t.patientName}</Typography>
                          <Typography variant="caption" color="text.secondary">{t.patientId}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{t.testType}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{t.referredBy}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{t.date}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{t.amount.toLocaleString()}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        label={t.status}
                        size="small"
                        color={statusMeta[t.status].color}
                        icon={statusMeta[t.status].icon as any}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {t.status !== 'Completed' && (
                        <IconButton size="small" onClick={() => handleResult(t.id)} sx={{ color: 'primary.main' }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                      {t.result && (
                        <IconButton size="small" onClick={() => handleResult(t.id)} sx={{ color: 'success.main' }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      {/* New Test Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>New Lab Test Request</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Grid container spacing={2}>
            {[
              { label: 'Patient Name', key: 'patientName' },
              { label: 'Patient ID', key: 'patientId' },
              { label: 'Referred By', key: 'referredBy' },
              { label: 'Amount (₦)', key: 'amount' },
            ].map(f => (
              <Grid item xs={12} sm={6} key={f.key}>
                <TextField label={f.label} fullWidth value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <TextField select label="Test Type" fullWidth value={form.testType}
                onChange={e => setForm(p => ({ ...p, testType: e.target.value }))}>
                {TEST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date" type="date" fullWidth value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.patientName || !form.testType}>
            Create Request
          </Button>
        </DialogActions>
      </Dialog>
      {/* Result Dialog */}
      <Dialog open={resultOpen} onClose={() => setResultOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Enter Lab Result</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField
            label="Result / Findings"
            multiline rows={5}
            fullWidth
            value={resultText}
            onChange={e => setResultText(e.target.value)}
            placeholder="Enter test findings and results here…"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setResultOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={saveResult} variant="contained">Save Result</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default Lab;