import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Avatar, InputAdornment, MenuItem, LinearProgress,
} from '@mui/material';
import { Search, Download, AccountBalanceWallet } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
interface PayRecord {
  id:number; name:string; role:string; department:string;
  basic:number; allowance:number; deduction:number; net:number; status:string;
}
const roleColor: Record<string,string> = {
  Doctor:'#3b5bdb', Nurse:'#0ca678', Pharmacist:'#f59f00',
  'Lab Technician':'#1c7ed6', Admin:'#6741d9', Receptionist:'#f03e3e', Accountant:'#2f9e44',
};
const Payroll = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('June');
  const [year, setYear] = useState('2026');
  const [records] = useState<PayRecord[]>([
    { id:1, name:'Dr. Emeka Okafor',   role:'Doctor',          department:'OPD',       basic:350000, allowance:50000, deduction:35000, net:365000, status:'Paid' },
    { id:2, name:'Ngozi Adeyemi',       role:'Nurse',           department:'ICU',       basic:120000, allowance:20000, deduction:12000, net:128000, status:'Paid' },
    { id:3, name:'Chidi Nwosu',         role:'Pharmacist',      department:'Pharmacy',  basic:180000, allowance:25000, deduction:18000, net:187000, status:'Pending' },
    { id:4, name:'Aisha Bello',         role:'Lab Technician',  department:'Laboratory',basic:140000, allowance:15000, deduction:14000, net:141000, status:'Paid' },
    { id:5, name:'Tunde Fashola',       role:'Admin',           department:'Admin',     basic:200000, allowance:30000, deduction:20000, net:210000, status:'Pending' },
    { id:6, name:'Dr. Fatima Aliyu',    role:'Doctor',          department:'Emergency', basic:400000, allowance:60000, deduction:40000, net:420000, status:'Paid' },
    { id:7, name:'Biodun Oyelaran',     role:'Receptionist',    department:'OPD',       basic:90000,  allowance:10000, deduction:9000,  net:91000,  status:'Paid' },
  ]);
  const filtered = records.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.department.toLowerCase().includes(search.toLowerCase())
  );
  const totalNet    = records.reduce((a,b) => a+b.net, 0);
  const totalPaid   = records.filter(r => r.status==='Paid').reduce((a,b) => a+b.net, 0);
  const totalPending= records.filter(r => r.status==='Pending').reduce((a,b) => a+b.net, 0);
  const handleProcess = () => {
    enqueueSnackbar(`Payroll for ${month} ${year} processed successfully`, { variant: 'success' });
  };
  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', mb:3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Payroll</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Monthly salary management and processing</Typography>
        </Box>
        <Box sx={{ display:'flex', gap:1.5 }}>
          <TextField select label="Month" size="small" value={month} onChange={e => setMonth(e.target.value)} sx={{ width:130 }}>
            {MONTHS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>
          <TextField select label="Year" size="small" value={year} onChange={e => setYear(e.target.value)} sx={{ width:100 }}>
            {['2024','2025','2026'].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
          <Button variant="contained" startIcon={<AccountBalanceWallet />} onClick={handleProcess}>
            Process Payroll
          </Button>
        </Box>
      </Box>
      {/* Summary */}
      <Grid container spacing={2} mb={3}>
        {[
          { label:'Total Payroll',      value:`₦${totalNet.toLocaleString()}`,    color:'#3b5bdb', pct:100 },
          { label:'Paid',               value:`₦${totalPaid.toLocaleString()}`,   color:'#2f9e44', pct:(totalPaid/totalNet)*100 },
          { label:'Pending',            value:`₦${totalPending.toLocaleString()}`,color:'#f59f00', pct:(totalPending/totalNet)*100 },
          { label:'Total Staff',        value:records.length,                     color:'#1c7ed6', pct:100 },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'none' }}>
              <CardContent sx={{ p:2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>{s.label}</Typography>
                <Typography variant="h5" fontWeight={800} color={s.color} mt={0.5}>{s.value}</Typography>
                <LinearProgress variant="determinate" value={s.pct}
                  sx={{ mt:1, height:4, borderRadius:2, bgcolor: alpha(s.color,0.1),
                    '& .MuiLinearProgress-bar':{ bgcolor: s.color, borderRadius:2 } }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card sx={{ boxShadow:'0 4px 24px rgba(0,0,0,0.07)', border:'none' }}>
        <CardContent sx={{ p:2.5 }}>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2 }}>
            <Typography variant="h6" fontWeight={700}>Salary Details — {month} {year}</Typography>
            <Box sx={{ display:'flex', gap:1.5 }}>
              <TextField placeholder="Search…" size="small" value={search} onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment:<InputAdornment position="start"><Search sx={{ fontSize:18 }} /></InputAdornment> }}
                sx={{ width:220 }} />
              <Button variant="outlined" startIcon={<Download />} size="small">Export</Button>
            </Box>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell align="right">Basic (₦)</TableCell>
                  <TableCell align="right">Allowance (₦)</TableCell>
                  <TableCell align="right">Deduction (₦)</TableCell>
                  <TableCell align="right">Net Pay (₦)</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} hover sx={{ '&:last-child td':{ border:0 } }}>
                    <TableCell>
                      <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                        <Avatar sx={{ width:34, height:34, fontSize:'0.75rem', fontWeight:700,
                          bgcolor: alpha(roleColor[r.role]??'#3b5bdb',0.12), color: roleColor[r.role]??'#3b5bdb' }}>
                          {r.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                          <Chip label={r.role} size="small"
                            sx={{ height:16, fontSize:'0.6rem', bgcolor: alpha(roleColor[r.role]??'#3b5bdb',0.1), color: roleColor[r.role]??'#3b5bdb', fontWeight:600 }} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography variant="body2">{r.department}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2">{r.basic.toLocaleString()}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" color="success.main">+{r.allowance.toLocaleString()}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" color="error.main">-{r.deduction.toLocaleString()}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="body2" fontWeight={700}>{r.net.toLocaleString()}</Typography></TableCell>
                    <TableCell>
                      <Chip label={r.status} size="small"
                        color={r.status==='Paid'?'success':'warning'} sx={{ fontWeight:600 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
export default Payroll;
