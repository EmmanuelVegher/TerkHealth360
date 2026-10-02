import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  IconButton,
  Stack,
  Chip,
  Grid,
  Avatar,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Print,
  Download,
  Refresh,
  Today,
  Search,
  Close,
  LocalAtm,
  MedicalServices,
  Shield,
  Add
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

const PRIMARY = '#0f766e';
const SECONDARY = '#1e3a8a';
const SUCCESS = '#16a34a';

const formatNGN = (v: number) =>
  '₦' + Number(v || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface DailyIncomeExpenditureSheetProps {
  allowRecordExpense?: boolean;
  initialDate?: string;
  elevation?: number;
  showHeaderTitle?: boolean;
}

export const DailyIncomeExpenditureSheet: React.FC<DailyIncomeExpenditureSheetProps> = ({
  allowRecordExpense = true,
  initialDate,
  elevation = 0,
  showHeaderTitle = true,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [reportDate, setReportDate] = useState<string>(
    initialDate || new Date().toISOString().slice(0, 10)
  );
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    purpose: 'DRUG',
    amount: '',
    paymentMethod: 'CASH',
    description: '',
    approvedBy: 'Hospital Administrator'
  });

  const fetchDailyReport = useCallback(async (targetDate?: string) => {
    setLoading(true);
    try {
      const d = targetDate || reportDate;
      const res = await api.get(`/reports/daily-income-expenditure?date=${d}`);
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load daily income/expenditure report:', e);
    } finally {
      setLoading(false);
    }
  }, [reportDate]);

  useEffect(() => {
    fetchDailyReport(reportDate);
  }, [reportDate, fetchDailyReport]);

  const handleRecordExpense = async () => {
    if (!expenseForm.purpose || !expenseForm.amount) {
      enqueueSnackbar('Please enter both Section/Purpose and Expense Amount.', { variant: 'warning' });
      return;
    }
    try {
      await api.post('/reports/daily-income-expenditure/expense', {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        date: reportDate
      });
      enqueueSnackbar(
        `Recorded expense voucher of ${formatNGN(Number(expenseForm.amount))} for ${expenseForm.purpose}`,
        { variant: 'success' }
      );
      setExpenseDialogOpen(false);
      setExpenseForm({
        purpose: 'DRUG',
        amount: '',
        paymentMethod: 'CASH',
        description: '',
        approvedBy: 'Hospital Administrator'
      });
      fetchDailyReport(reportDate);
    } catch {
      enqueueSnackbar('Failed to record expense voucher', { variant: 'error' });
    }
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.rows) return;
    const headers = [
      'SECTION/PURPOSE',
      'CASH (NGN)',
      'POS/TRANSFER (NGN)',
      'TOTAL (NGN)',
      'EXPENSES (NGN)',
      'CASH AT HAND (NGN)'
    ];
    const rows = reportData.rows.map((r: any) => [
      `"${r.purpose}"`,
      r.cash,
      r.posTransfer,
      r.total,
      r.expenses,
      r.cashAtHand
    ]);
    if (reportData.grossTotal) {
      rows.push([
        '"GROSS TOTAL"',
        reportData.grossTotal.cash,
        reportData.grossTotal.posTransfer,
        reportData.grossTotal.total,
        reportData.grossTotal.expenses,
        reportData.grossTotal.cashAtHand
      ]);
    }
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Income_and_Expenditure_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Daily Income & Expenditure sheet exported to CSV', { variant: 'success' });
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRows = (reportData?.rows || []).filter(
    (r: any) =>
      !searchFilter ||
      r.purpose.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <Box>
      <Paper
        elevation={elevation}
        className="printable-daily-sheet"
        sx={{
          p: { xs: 2, sm: 3.5 },
          borderRadius: 3,
          border: '2px solid #0f172a',
          bgcolor: '#ffffff',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
          position: 'relative',
          '@media print': {
            border: 'none',
            boxShadow: 'none',
            p: 0,
            m: 0,
          }
        }}
      >
        {/* Action Bar (Top Controls) */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 3, pb: 2.5, borderBottom: '1px dashed #cbd5e1' }}
          className="no-print"
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Chip
              icon={<Today />}
              label="Live Database Ledger"
              sx={{ bgcolor: '#0f172a', color: '#fff', fontWeight: 800, fontSize: '0.75rem' }}
            />
            <TextField
              type="date"
              size="small"
              label="Report Sheet Date"
              value={reportDate}
              onChange={(e) => {
                setReportDate(e.target.value);
                fetchDailyReport(e.target.value);
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                width: 175,
                bgcolor: '#f8fafc',
                '& .MuiOutlinedInput-root': { borderRadius: 2, fontWeight: 700 }
              }}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                setReportDate(todayStr);
                fetchDailyReport(todayStr);
              }}
              sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
            >
              Today
            </Button>
            <Tooltip title="Reload latest transactions from PostgreSQL">
              <IconButton
                size="small"
                onClick={() => fetchDailyReport(reportDate)}
                disabled={loading}
                sx={{ border: '1px solid #cbd5e1', bgcolor: '#f8fafc' }}
              >
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {allowRecordExpense && (
              <Button
                variant="outlined"
                size="small"
                color="warning"
                startIcon={<Add />}
                onClick={() => setExpenseDialogOpen(true)}
                sx={{ borderRadius: 2, fontWeight: 800, textTransform: 'none', borderWidth: 1.5 }}
              >
                Record Expense Voucher
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download />}
              onClick={handleExportCSV}
              sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Print />}
              onClick={handlePrint}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                textTransform: 'none',
                bgcolor: '#0f172a',
                '&:hover': { bgcolor: '#1e293b' }
              }}
            >
              Print Report Sheet
            </Button>
          </Stack>
        </Stack>

        {/* Printable Report Header Matching Official Physical Sheet */}
        {showHeaderTitle && (
          <Box sx={{ textAlign: 'center', mb: 3, pt: 1 }}>
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={2} sx={{ mb: 1 }}>
              <Avatar sx={{ bgcolor: `${PRIMARY}15`, color: PRIMARY, width: 44, height: 44, border: `2px solid ${PRIMARY}` }}>
                <MedicalServices fontSize="medium" />
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "'Georgia', serif", letterSpacing: 0.8, color: '#0f172a', lineHeight: 1.1 }}>
                  {reportData?.hospitalName || 'FAITH FOUNDATION MISSION HOSPITAL NSUKKA'}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 850, letterSpacing: 1.2, color: '#334155', textTransform: 'uppercase', mt: 0.5 }}>
                  {reportData?.reportTitle || 'DAILY INCOME AND EXPENDITURE REPORT SHEET'}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: `${SUCCESS}15`, color: SUCCESS, width: 44, height: 44, border: `2px solid ${SUCCESS}` }}>
                <Shield fontSize="medium" />
              </Avatar>
            </Stack>

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: 0.5 }}>
                DATE:
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 850, color: PRIMARY, borderBottom: '2px dotted #0f172a', px: 2, pb: 0.2 }}>
                {new Date(reportDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Quick Filter Search Bar */}
        <Box sx={{ mb: 2.5 }} className="no-print">
          <TextField
            fullWidth
            size="small"
            placeholder="Filter section / purpose (e.g. CF, DRUG, LAB, SURGERY, MATERNITY, MORTUARY, OXYGEN, GLOVE)..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchFilter && (
                <IconButton size="small" onClick={() => setSearchFilter('')}>
                  <Close fontSize="small" />
                </IconButton>
              )
            }}
            sx={{ bgcolor: '#f8fafc', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        {/* ── THE LEDGER TABLE ── */}
        <TableContainer component={Paper} elevation={0} sx={{ border: '2px solid #0f172a', borderRadius: 1.5, overflow: 'hidden' }}>
          <Table size="small" sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                <TableCell sx={{ fontWeight: 900, color: '#0f172a', borderRight: '1.5px solid #cbd5e1', fontSize: '0.82rem', py: 1.2, width: '32%' }}>
                  SECTION/PURPOSE
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: '#0f172a', borderRight: '1.5px solid #cbd5e1', fontSize: '0.82rem', py: 1.2, width: '13%' }}>
                  CASH
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: '#0f172a', borderRight: '1.5px solid #cbd5e1', fontSize: '0.82rem', py: 1.2, width: '14%' }}>
                  POS/Transfer
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: '#0f172a', borderRight: '1.5px solid #cbd5e1', fontSize: '0.82rem', py: 1.2, width: '14%' }}>
                  TOTAL
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: '#b91c1c', borderRight: '1.5px solid #cbd5e1', fontSize: '0.82rem', py: 1.2, width: '13%' }}>
                  EXPENSES
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 900, color: '#15803d', fontSize: '0.82rem', py: 1.2, width: '14%' }}>
                  CASH AT HAND
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} sx={{ color: '#0f172a', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">Fetching live PostgreSQL ledger data...</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredRows.map((row: any, idx: number) => {
                    return (
                      <TableRow
                        key={row.purpose || idx}
                        hover
                        sx={{
                          borderBottom: '1px solid #cbd5e1',
                          bgcolor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          '&:hover': { bgcolor: '#f1f5f9' }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.78rem', borderRight: '1.5px solid #cbd5e1', py: 0.8 }}>
                          {row.purpose}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: row.cash > 0 ? '#0f172a' : '#94a3b8', borderRight: '1.5px solid #cbd5e1', fontSize: '0.78rem', py: 0.8 }}>
                          {row.cash > 0 ? formatNGN(row.cash) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: row.posTransfer > 0 ? '#0f172a' : '#94a3b8', borderRight: '1.5px solid #cbd5e1', fontSize: '0.78rem', py: 0.8 }}>
                          {row.posTransfer > 0 ? formatNGN(row.posTransfer) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 850, color: row.total > 0 ? PRIMARY : '#94a3b8', borderRight: '1.5px solid #cbd5e1', fontSize: '0.8rem', py: 0.8 }}>
                          {row.total > 0 ? formatNGN(row.total) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 750, color: row.expenses > 0 ? '#b91c1c' : '#94a3b8', borderRight: '1.5px solid #cbd5e1', fontSize: '0.78rem', py: 0.8, bgcolor: row.expenses > 0 ? '#fef2f2' : 'inherit' }}>
                          {row.expenses > 0 ? formatNGN(row.expenses) : '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 850, color: row.cashAtHand > 0 ? '#15803d' : '#94a3b8', fontSize: '0.8rem', py: 0.8, bgcolor: row.cashAtHand > 0 ? '#f0fdf4' : 'inherit' }}>
                          {row.cashAtHand > 0 ? formatNGN(row.cashAtHand) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Gross Total Row */}
                  {reportData?.grossTotal && (
                    <TableRow sx={{ bgcolor: '#0f172a', color: '#ffffff', borderTop: '2px solid #0f172a' }}>
                      <TableCell sx={{ fontWeight: 900, color: '#ffffff', fontSize: '0.85rem', py: 1.2, borderRight: '1.5px solid #334155' }}>
                        {reportData.grossTotal.purpose}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: '#fef08a', fontSize: '0.85rem', py: 1.2, borderRight: '1.5px solid #334155' }}>
                        {formatNGN(reportData.grossTotal.cash)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: '#bae6fd', fontSize: '0.85rem', py: 1.2, borderRight: '1.5px solid #334155' }}>
                        {formatNGN(reportData.grossTotal.posTransfer)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: '#ffffff', fontSize: '0.9rem', py: 1.2, borderRight: '1.5px solid #334155' }}>
                        {formatNGN(reportData.grossTotal.total)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: '#fca5a5', fontSize: '0.85rem', py: 1.2, borderRight: '1.5px solid #334155' }}>
                        {formatNGN(reportData.grossTotal.expenses)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: '#86efac', fontSize: '0.9rem', py: 1.2 }}>
                        {formatNGN(reportData.grossTotal.cashAtHand)}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Signatures & Attestation Footer */}
        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid #cbd5e1' }}>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ border: '1px solid #e2e8f0', p: 2.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                  PRESENTED & SIGNED BY: ................................................................
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block' }}>
                  CASHIER: <strong>{reportData?.presentedBy || 'Mary Okon (Duty Cashier)'}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Main Outpatient Cashier Desk · Till Session Verified
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ border: '1px solid #e2e8f0', p: 2.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                  RECEIVED & SIGNED BY: ................................................................
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, display: 'block' }}>
                  ACCOUNT CLERK: <strong>{reportData?.receivedBy || 'C. Eze (Chief Account Clerk)'}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Central Finance Department · Vault Drop & Safe Custody
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* ── Record Daily Operational Expense Voucher Dialog ── */}
      {allowRecordExpense && (
        <Dialog
          open={expenseDialogOpen}
          onClose={() => setExpenseDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: '#fef2f2', color: '#dc2626' }}>
                <LocalAtm />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Record Operational Expense Voucher
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Deduct official departmental expenses from today's cashier cash till (Report Date: {reportDate})
                </Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent dividers sx={{ py: 2.5 }}>
            <Stack spacing={2.5}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Expenses entered here immediately reflect on the <strong>Daily Income and Expenditure Report Sheet</strong>, deducting from <strong>Cash at Hand</strong> for the selected Section/Purpose.
              </Alert>

              <FormControl fullWidth size="small">
                <InputLabel id="expense-purpose-label">Section / Department Purpose *</InputLabel>
                <Select
                  labelId="expense-purpose-label"
                  value={expenseForm.purpose}
                  label="Section / Department Purpose *"
                  onChange={e => setExpenseForm({ ...expenseForm, purpose: e.target.value })}
                >
                  {(reportData?.rows || []).map((r: any) => (
                    <MenuItem key={r.purpose} value={r.purpose}>
                      {r.purpose}
                    </MenuItem>
                  ))}
                  {!reportData?.rows?.length &&
                    [
                      'CONSULTATION FEE (CF)',
                      'DRUG',
                      'LABORATORY',
                      'S.CHARGES/ OTHERS',
                      'HOSPITAL CARDS',
                      'SURGERY',
                      'ORTHOPEDIC',
                      'ORTHOPEDIC CF',
                      'ULTRA-SOUND',
                      'AMBULANCE',
                      'MATERNITY (MU)',
                      'MORTUARY',
                      'PHYSIOTHERAPY',
                      'THEATRE CHARGES',
                      'OPD',
                      'CHMA',
                      'NHIS',
                      'Enugu State Mortuary Rev.',
                      'PHYSICIAN',
                      'PHYSICIAN CF',
                      'GENERAL SURGEON',
                      'GENERAL SURGEON (CF)',
                      'IMMUNIZATION',
                      'ANASTHETICS',
                      'PEADIATRICIAN',
                      'GYNE',
                      'DENTAL',
                      'OPTICIAN',
                      'BLOOD BANK',
                      'UROLOGY',
                      "DR'S SHARES",
                      'EMERGENCY',
                      'OXYGEN',
                      'BED',
                      'GLOVE',
                      'SUTURING',
                      'EVACUATION',
                      'EXCESS'
                    ].map(p => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Expense Amount (NGN) *"
                type="number"
                placeholder="e.g. 15000"
                value={expenseForm.amount}
                onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₦</InputAdornment>
                }}
              />

              <FormControl fullWidth size="small">
                <InputLabel id="expense-payment-method-label">Payment Channel</InputLabel>
                <Select
                  labelId="expense-payment-method-label"
                  value={expenseForm.paymentMethod}
                  label="Payment Channel"
                  onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                >
                  <MenuItem value="CASH">Cash (Physical Till Drawer)</MenuItem>
                  <MenuItem value="BANK_TRANSFER">Direct Bank Transfer</MenuItem>
                  <MenuItem value="POS">POS / Corporate Card</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                size="small"
                label="Authorizing Officer / Approved By"
                placeholder="e.g. Hospital Administrator / MD"
                value={expenseForm.approvedBy}
                onChange={e => setExpenseForm({ ...expenseForm, approvedBy: e.target.value })}
              />

              <TextField
                fullWidth
                size="small"
                label="Expense Description & Voucher Reference"
                placeholder="e.g. Fuel for hospital generator backup during surgery / Medical supplies"
                multiline
                rows={2}
                value={expenseForm.description}
                onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setExpenseDialogOpen(false)} sx={{ fontWeight: 700, textTransform: 'none' }}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordExpense}
              variant="contained"
              color="error"
              startIcon={<LocalAtm />}
              sx={{ fontWeight: 800, textTransform: 'none', borderRadius: 2 }}
            >
              Save & Deduct Voucher
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default DailyIncomeExpenditureSheet;
