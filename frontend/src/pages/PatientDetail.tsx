import { useState, useEffect } from 'react';
import { assetUrl } from '../utils/assetUrl';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { TreatmentChartPrintTemplate } from '../components/TreatmentChartPrintTemplate';
import {
  Container, Typography, Paper, Grid, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Box, Avatar, Stack, Chip, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Tab, Tabs, List, ListItem, ListItemText,
  Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel, TextField, Alert, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip
} from '@mui/material';
import { Delete, Print, QrCode2, ArrowBack, FamilyRestroom, History, Shield, Info, Portrait, Link as LinkIcon, SwapHoriz, ExpandMore, CalendarToday } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { EncounterPrintTemplate } from '../components/EncounterPrintTemplate';
import { LabReportPrintTemplate } from '../components/LabReportPrintTemplate';
import { PrescriptionPrintTemplate } from '../components/PrescriptionPrintTemplate';
import { RegistrationPrintTemplate } from '../components/RegistrationPrintTemplate';
import { useAuth } from '../contexts/AuthContext';

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar: alertMsg } = useSnackbar();
  const { user } = useAuth();
  
  const [patient, setPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [openLinkFamily, setOpenLinkFamily] = useState(false);
  const [printEncounter, setPrintEncounter] = useState<any>(null);
  const [familyAccounts, setFamilyAccounts] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [familyRelationship, setFamilyRelationship] = useState('SPOUSE');
  const [chargeUpgrade, setChargeUpgrade] = useState(true);
  const [upgradeFee, setUpgradeFee] = useState(1500);
  const [openStatusChange, setOpenStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [deleteBlockedMsg, setDeleteBlockedMsg] = useState('');

  // Coverage check states
  const [selectedPolicyCatalog, setSelectedPolicyCatalog] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [checkServiceCode, setCheckServiceCode] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checkingCoverage, setCheckingCoverage] = useState(false);

  const handleLoadCatalog = async (planId: string, policyId: string) => {
    setSelectedPolicyId(policyId);
    setLoadingCatalog(true);
    setCheckResult(null);
    try {
      const res = await api.get(`/insurance/plans/${planId}/catalog`);
      setSelectedPolicyCatalog(res.data?.data || []);
    } catch {
      alertMsg('Failed to load benefit catalog', { variant: 'error' });
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleCheckCoverage = async () => {
    if (!checkServiceCode) return;
    setCheckingCoverage(true);
    try {
      const res = await api.get('/insurance/coverage-check', {
        params: { patientId: id, serviceCode: checkServiceCode },
      });
      setCheckResult(res.data?.data || res.data);
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Check failed', { variant: 'error' });
    } finally {
      setCheckingCoverage(false);
    }
  };

  const fetchFamilyAccounts = async () => {
    try {
      const res = await api.get('/family');
      setFamilyAccounts(res.data);
      if (res.data.length > 0) {
        setSelectedFamilyId(res.data[0].id);
      }
    } catch (err) {
      alertMsg('Failed to load family accounts', { variant: 'error' });
    }
  };

  const handleLinkFamily = async () => {
    if (!selectedFamilyId) {
      alertMsg('Please select a family account', { variant: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await api.post(`/family/${selectedFamilyId}/members`, {
        patientId: id,
        relationship: familyRelationship,
      });
      alertMsg('Successfully linked patient to family account', { variant: 'success' });
      setOpenLinkFamily(false);
      fetchPatientDetails();
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Failed to link family account', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    setLoading(true);
    try {
      await api.post('/family', {
        headPatientId: id,
        upgradeFeeAmount: chargeUpgrade ? upgradeFee : 0,
      });
      alertMsg('Successfully converted account and created Family Account as Head', { variant: 'success' });
      setOpenLinkFamily(false);
      fetchPatientDetails();
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Failed to create family account', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/patients/${id}`);
      setPatient(res.data);
    } catch (err) {
      alertMsg('Failed to load patient profile', { variant: 'error' });
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientDetails();
  }, [id]);

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/patients/${id}`);
      alertMsg('Patient profile deleted successfully', { variant: 'success' });
      navigate('/patients');
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code === 'CLINICAL_RECORDS_EXIST') {
        setDeleteBlockedMsg(data.message);
      } else {
        alertMsg(data?.message || 'Failed to delete patient profile', { variant: 'error' });
      }
    }
  };

  const handleStatusChange = async () => {
    try {
      await api.patch(`/patients/${id}/status`, { status: newStatus });
      alertMsg(`Patient status updated to ${newStatus}`, { variant: 'success' });
      setOpenStatusChange(false);
      fetchPatientDetails();
    } catch (err: any) {
      alertMsg(err.response?.data?.message || 'Failed to update status', { variant: 'error' });
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  if (loading) return <Container sx={{ py: 4 }}><Typography>Loading Patient Profile...</Typography></Container>;
  if (!patient) return <Container sx={{ py: 4 }}><Typography>Patient not found.</Typography></Container>;

  const fullName = `${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`;
  const phone = patient.telecoms?.find((t: any) => t.system === 'phone')?.value || 'N/A';
  const email = patient.telecoms?.find((t: any) => t.system === 'email')?.value || 'N/A';
  const addressStr = patient.addresses?.[0]?.line || 'N/A';

  const labOrders = patient.labOrders || [];
  const prescriptions = patient.pharmacyPrescriptions || [];

  const enhancedVisits = (patient.visits || []).map((visit: any) => {
    const visitDate = new Date(visit.createdAt).toDateString();
    
    const visitLabs = labOrders.filter((lo: any) => lo.visitId === visit.id || new Date(lo.createdAt).toDateString() === visitDate);
    const visitRx = prescriptions.filter((rx: any) => rx.visitId === visit.id || new Date(rx.createdAt).toDateString() === visitDate);

    const mappedLabs = visitLabs.map((lo: any) => ({
      id: lo.id,
      type: 'LAB_ORDER',
      serviceType: `Lab Order (${lo.items?.length || 0} tests)`,
      class: 'DIAGNOSTIC',
      status: lo.status,
      createdAt: lo.createdAt,
      staff: lo.requestedBy,
      reasonText: lo.clinicalNotes,
      diagnosis: lo.diagnosis,
      rawOrder: { ...lo, patient }
    }));

    const mappedRx = visitRx.map((rx: any) => ({
      id: rx.id,
      type: 'PHARMACY_PRESCRIPTION',
      serviceType: `Prescription (${rx.items?.length || 0} items)`,
      class: 'MEDICATION',
      status: rx.status,
      createdAt: rx.createdAt,
      staff: rx.prescriber,
      reasonText: rx.clinicalNotes,
      diagnosis: rx.diagnosis,
      rawOrder: { ...rx, patient }
    }));

    const allEncounters = [...(visit.encounters || []), ...mappedLabs, ...mappedRx]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      ...visit,
      allEncounters
    };
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'block', '@media print': { display: 'none !important' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/patients')}>
          Back to Master Patient Index
        </Button>
        <Stack direction="row" spacing={2}>
          <Button startIcon={<CalendarToday />} variant="contained" color="primary" onClick={() => navigate('/appointments', { state: { preselectedPatient: patient } })}>
            Book Next Appointment
          </Button>
          <Button startIcon={<Print />} variant="outlined" color="primary" onClick={() => window.print()}>
            Print Treatment Chart
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={4}>
        {/* Left Side Details */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4, borderRadius: 3, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3.5 }}>
              <Avatar src={patient.photoUrl || undefined} sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '1.8rem', fontWeight: 'bold' }}>
                {patient.firstName[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={800}>{fullName}</Typography>
                <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                  <Chip label={`MRN: ${patient.patientNumber}`} size="small" variant="outlined" />
                  <Chip label={patient.status} size="small" color={patient.status === 'ACTIVE' ? 'success' : 'default'} />
                  {patient.bloodGroup && (
                    <Chip label={`Blood: ${patient.bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-')}`} size="small" color="primary" />
                  )}
                </Stack>
              </Box>
            </Box>

            <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tab icon={<Info fontSize="small" />} iconPosition="start" label="General Info" />
              <Tab icon={<FamilyRestroom fontSize="small" />} iconPosition="start" label="Family Account" />
              <Tab icon={<History fontSize="small" />} iconPosition="start" label="Visits Register" />
              <Tab icon={<Shield fontSize="small" />} iconPosition="start" label="Insurance Policies" />
            </Tabs>

            {tabIndex === 0 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">National Identification (NIN)</Typography>
                  <Typography variant="body1" fontWeight={600}>{patient.nin || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Contact Phone / Email</Typography>
                  <Typography variant="body1" fontWeight={600}>{phone} • {email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">State / LGA of Origin</Typography>
                  <Typography variant="body1" fontWeight={600}>{patient.stateOfOrigin || 'N/A'} / {patient.lga || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Genotype</Typography>
                  <Typography variant="body1" fontWeight={600}>{patient.genotype || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Residential Address</Typography>
                  <Typography variant="body1" fontWeight={600}>{addressStr}</Typography>
                </Grid>
                <Grid item xs={12}><Divider sx={{ my: 1.5 }} /></Grid>

                {/* NOK */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" fontWeight={700} color="primary" mb={1}>Next of Kin</Typography>
                  <Typography variant="body2"><strong>Name:</strong> {patient.nokName || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Relationship:</strong> {patient.nokRelationship || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Phone:</strong> {patient.nokPhone || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Address:</strong> {patient.nokAddress || 'N/A'}</Typography>
                </Grid>
                {/* Emergency contact */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" fontWeight={700} color="secondary" mb={1}>Emergency Contact</Typography>
                  <Typography variant="body2"><strong>Name:</strong> {patient.emergencyName || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Relationship:</strong> {patient.emergencyRelationship || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Phone:</strong> {patient.emergencyPhone || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Address:</strong> {patient.emergencyAddress || 'N/A'}</Typography>
                </Grid>
              </Grid>
            )}

            {tabIndex === 1 && (
              <Box>
                {patient.familyAccount ? (
                  <Stack spacing={3}>
                    <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700}>Household Family Code: {patient.familyAccount.familyNumber}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>Primary Family Head: {fullName}</Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Family Members Linked</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>MRN</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Relationship</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {patient.familyAccount.members?.map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell>{m.patientNumber}</TableCell>
                            <TableCell>{m.firstName} {m.lastName}</TableCell>
                            <TableCell>{m.familyRelationship}</TableCell>
                            <TableCell><Chip label={m.status} size="small" color={m.status === 'ACTIVE' ? 'success' : 'default'} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Stack>
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      This patient is not currently linked to any Household Family Account.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      onClick={() => {
                        fetchFamilyAccounts();
                        setOpenLinkFamily(true);
                      }}
                    >
                      Link Family Household
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {tabIndex === 2 && (
              <Box>
                {enhancedVisits.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No visits recorded for this patient.</Typography>
                ) : (
                  <Box>
                    {enhancedVisits.map((v: any) => (
                      <Accordion key={v.id} sx={{ mb: 2, '&:before': { display: 'none' }, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#f8f9fa', borderRadius: 1 }}>
                          <Box display="flex" justifyContent="space-between" width="100%" alignItems="center" pr={2}>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>Visit: {v.visitNumber}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Checked in: {new Date(v.createdAt).toLocaleString()} | Type: {v.visitType} | Status: {v.status}
                              </Typography>
                            </Box>
                            <Chip label={`${v.allEncounters?.length || 0} Encounters`} size="small" variant="outlined" />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: '#fff', p: 0 }}>
                          {v.allEncounters?.length === 0 ? (
                            <Box p={2} textAlign="center">
                              <Typography variant="body2" color="text.secondary">No encounters recorded during this visit.</Typography>
                            </Box>
                          ) : (
                            <List disablePadding>
                              {v.allEncounters?.map((enc: any) => (
                                <Accordion key={enc.id} sx={{ boxShadow: 'none', borderBottom: '1px solid #eee', '&:before': { display: 'none' } }}>
                                  <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Box display="flex" justifyContent="space-between" width="100%" alignItems="center" pr={2}>
                                      <Box>
                                        <Typography variant="body2" fontWeight={600}>{enc.serviceType || 'General Consultation'}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {new Date(enc.createdAt).toLocaleString()} • {enc.class} • {enc.status}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </AccordionSummary>
                                  <AccordionDetails sx={{ bgcolor: '#fafafa', borderTop: '1px solid #eee', p: 3 }}>
                                    <Grid container spacing={3}>
                                      <Grid item xs={12} md={6}>
                                        {enc.type === 'LAB_ORDER' ? (
                                          <>
                                            <Typography variant="caption" color="text.secondary" display="block">Requested By</Typography>
                                            <Typography variant="body2" fontWeight={500} mb={2}>
                                              {enc.staff ? `${enc.staff.firstName} ${enc.staff.lastName}` : 'System Administrator'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">Tests ({enc.rawOrder?.items?.length || 0})</Typography>
                                            <Box>
                                              {enc.rawOrder?.items?.map((item: any) => (
                                                <Typography key={item.id} variant="body2" fontWeight={500}>
                                                  • {item.test?.testName || 'Unknown Test'} - {item.status}
                                                  {item.result?.resultValue && ` (Result: ${item.result.resultValue} ${item.result.unit || ''})`}
                                                </Typography>
                                              ))}
                                            </Box>
                                          </>
                                        ) : enc.type === 'PHARMACY_PRESCRIPTION' ? (
                                          <>
                                            <Typography variant="caption" color="text.secondary" display="block">Prescriber</Typography>
                                            <Typography variant="body2" fontWeight={500} mb={2}>
                                              {enc.staff ? `${enc.staff.firstName} ${enc.staff.lastName}` : 'System Administrator'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">Medications ({enc.rawOrder?.items?.length || 0})</Typography>
                                            <Box>
                                              {enc.rawOrder?.items?.map((item: any) => {
                                                const medName = item.medication?.brandName || item.medication?.genericName || item.medication?.itemCode || 'Unknown Medication';
                                                return (
                                                  <Typography key={item.id} variant="body2" fontWeight={500}>
                                                    • {medName} ({item.dose} - {item.frequency} for {item.duration})
                                                  </Typography>
                                                );
                                              })}
                                            </Box>
                                          </>
                                        ) : enc.serviceType === 'REGISTRATION' ? (
                                          <>
                                            <Typography variant="caption" color="text.secondary" display="block">Registration Details</Typography>
                                            <Typography variant="body2" fontWeight={500} mb={1}>
                                              Registered By: {enc.staff ? `${enc.staff.firstName} ${enc.staff.lastName}` : 'System Administrator'}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500} mb={1}>
                                              NOK: {patient.nokName || 'N/A'} ({patient.nokRelationship || 'N/A'}) - {patient.nokPhone || 'N/A'}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500} mb={1}>
                                              Emergency: {patient.emergencyName || 'N/A'} ({patient.emergencyRelationship || 'N/A'}) - {patient.emergencyPhone || 'N/A'}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                              Address: {patient.addresses?.[0]?.line || 'N/A'}, {patient.addresses?.[0]?.city || 'N/A'}
                                            </Typography>
                                          </>
                                        ) : (
                                          <>
                                            <Typography variant="caption" color="text.secondary" display="block">Attending Provider</Typography>
                                            <Typography variant="body2" fontWeight={500} mb={2}>
                                              {enc.staff ? `${enc.staff.firstName} ${enc.staff.lastName}` : 'Unassigned'}
                                            </Typography>
                                            
                                            <Typography variant="caption" color="text.secondary" display="block">Reason for Visit</Typography>
                                            <Typography variant="body2" fontWeight={500}>
                                              {enc.reasonText || 'None provided'}
                                            </Typography>
                                          </>
                                        )}
                                      </Grid>
                                      <Grid item xs={12} md={6}>
                                        <Typography variant="caption" color="text.secondary" display="block">Clinical Notes / Diagnosis</Typography>
                                        <Typography variant="body2" fontWeight={500} sx={{ whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto' }}>
                                          {enc.diagnosis ? JSON.stringify(enc.diagnosis, null, 2) : enc.reasonText || 'No clinical notes recorded.'}
                                        </Typography>
                                      </Grid>
                                      <Grid item xs={12} display="flex" justifyContent="flex-end" mt={1}>
                                        <Button 
                                          startIcon={<Print />} 
                                          variant="outlined" 
                                          size="small"
                                          onClick={() => {
                                            if (enc.type === 'LAB_ORDER') {
                                              setPrintEncounter({ type: 'LAB_ORDER', order: enc.rawOrder });
                                            } else if (enc.type === 'PHARMACY_PRESCRIPTION') {
                                              setPrintEncounter({ type: 'PHARMACY_PRESCRIPTION', prescription: enc.rawOrder });
                                            } else if (enc.serviceType === 'REGISTRATION') {
                                              setPrintEncounter({ type: 'REGISTRATION', data: enc });
                                            } else {
                                              setPrintEncounter({ type: 'CLINICAL', data: enc });
                                            }
                                            setTimeout(() => { window.print(); setPrintEncounter(null); }, 500);
                                          }}
                                        >
                                          Print {enc.type === 'LAB_ORDER' ? 'Lab Result' : enc.type === 'PHARMACY_PRESCRIPTION' ? 'Prescription' : 'Encounter'}
                                        </Button>

                                        {enc.serviceType === 'REGISTRATION' && user?.role === 'ADMIN' && !enc.approvedAt && (
                                          <Button 
                                            variant="contained" 
                                            color="success" 
                                            size="small"
                                            sx={{ ml: 2 }}
                                            onClick={async () => {
                                              try {
                                                // fetch the stamp first
                                                const confRes = await api.get('/config/modules');
                                                let stamp = '';
                                                if (confRes.data?.success) {
                                                  const stampConfig = confRes.data.data.find((c: any) => c.moduleKey === 'HOSPITAL_STAMP');
                                                  if (stampConfig?.description) {
                                                    stamp = stampConfig.description.startsWith('http') ? stampConfig.description : `${stampConfig.description}`;
                                                  }
                                                }

                                                if (!stamp) {
                                                  alertMsg('No Hospital Stamp configured in Settings. Please upload a stamp first.', { variant: 'warning' });
                                                  return;
                                                }

                                                const res = await api.post(`/patients/encounters/${enc.id}/approve`, { signature: stamp });
                                                if (res.data?.success) {
                                                  alertMsg('Registration Approved!', { variant: 'success' });
                                                  fetchPatientDetails(); // reload to get the updated encounter
                                                } else {
                                                  alertMsg(res.data?.error || 'Failed to approve', { variant: 'error' });
                                                }
                                              } catch (err: any) {
                                                alertMsg(err.response?.data?.error || 'Error approving registration', { variant: 'error' });
                                              }
                                            }}
                                          >
                                            Approve & Sign
                                          </Button>
                                        )}
                                      </Grid>
                                    </Grid>
                                  </AccordionDetails>
                                </Accordion>
                              ))}
                            </List>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {tabIndex === 3 && (
              <Box>
                {patient.insurancePolicies?.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No insurance policy details linked.</Typography>
                ) : (
                  <Stack spacing={4}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Provider HMO</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Benefit Plan Name</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Policy Number</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Expiry Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {patient.insurancePolicies?.map((ip: any) => {
                          const isExpired = new Date(ip.expiryDate) < new Date();
                          return (
                            <TableRow key={ip.id}>
                              <TableCell sx={{ fontWeight: 'bold' }}>{ip.provider?.name}</TableCell>
                              <TableCell>{ip.plan?.name}</TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{ip.membershipNumber}</TableCell>
                              <TableCell>{new Date(ip.expiryDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Chip
                                  label={!ip.isActive ? 'SUSPENDED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                                  size="small"
                                  color={!ip.isActive ? 'default' : isExpired ? 'error' : 'success'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleLoadCatalog(ip.planId, ip.id)}
                                  disabled={!ip.isActive || isExpired}
                                >
                                  View Benefits
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {selectedPolicyId && (
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={2}>Plan Coverage Check & Benefits Catalog</Typography>
                        <Divider sx={{ mb: 2 }} />

                        {/* Quick Coverage Tester */}
                        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                          <Grid item xs={8}>
                            <TextField
                              size="small"
                              label="Test Coverage by Service Code"
                              placeholder="e.g. OPD-GENERAL, LAB-CBC"
                              fullWidth
                              value={checkServiceCode}
                              onChange={e => setCheckServiceCode(e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <Button
                              variant="contained"
                              onClick={handleCheckCoverage}
                              disabled={checkingCoverage || !checkServiceCode}
                              fullWidth
                            >
                              Check
                            </Button>
                          </Grid>
                        </Grid>

                        {checkResult && (
                          <Box sx={{ mb: 3 }}>
                            {checkResult.hasCoverage ? (
                              <Alert
                                severity={checkResult.serviceResult?.coverageType === 'FULL' ? 'success' : checkResult.serviceResult?.coverageType === 'PARTIAL' ? 'warning' : 'error'}
                                sx={{ borderRadius: 2 }}
                              >
                                <strong>{checkResult.serviceResult?.serviceName || checkServiceCode}</strong> —{' '}
                                {checkResult.serviceResult?.coverageType || 'EXCLUDED'}{' '}
                                {checkResult.serviceResult?.coverageType === 'PARTIAL' && `(${checkResult.serviceResult.coveragePct}%)`}
                                {checkResult.serviceResult?.maxAmount && ` · Max ₦${Number(checkResult.serviceResult.maxAmount).toLocaleString()}`}
                                {checkResult.serviceResult?.requiresPreAuth && ' · Pre-authorization required'}
                              </Alert>
                            ) : (
                              <Alert severity="error" sx={{ borderRadius: 2 }}>{checkResult.message || 'No coverage found.'}</Alert>
                            )}
                          </Box>
                        )}

                        {/* Benefits Table */}
                        <Typography variant="body2" fontWeight={700} color="text.secondary" mb={1}>Covered Benefit Items</Typography>
                        {loadingCatalog ? (
                          <CircularProgress size={20} />
                        ) : selectedPolicyCatalog.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">No benefits registered for this plan.</Typography>
                        ) : (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Service</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Cover %</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Max Amount</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedPolicyCatalog.map(item => (
                                <TableRow key={item.id}>
                                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.serviceCode}</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>{item.serviceName}</TableCell>
                                  <TableCell>{item.serviceCategory}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={item.coverageType}
                                      size="small"
                                      color={item.coverageType === 'FULL' ? 'success' : item.coverageType === 'PARTIAL' ? 'warning' : 'error'}
                                      sx={{ fontSize: '0.65rem', height: 16 }}
                                    />
                                  </TableCell>
                                  <TableCell>{item.coveragePct}%</TableCell>
                                  <TableCell>{item.maxAmount ? `₦${Number(item.maxAmount).toLocaleString()}` : '—'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Paper>
                    )}
                  </Stack>
                )}
              </Box>
            )}

            <Divider sx={{ my: 4 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<SwapHoriz />}
                onClick={() => {
                  setNewStatus(patient?.status || 'ACTIVE');
                  setOpenStatusChange(true);
                }}
              >
                Change Status
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => {
                  setDeleteBlockedMsg('');
                  setDeleteOpen(true);
                }}
              >
                Delete Profile
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Side Barcode / ID Card Preview */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, borderRadius: 3, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={700} mb={3}>Patient Card Preview</Typography>
            
            <Box
              className="printable-patient-id-card"
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, #1e2a78 0%, #162068 100%)',
                color: 'common.white',
                position: 'relative',
                borderRadius: 2,
                mb: 3,
                minHeight: 180,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Box component="img" src={assetUrl('/hospital-logo.png')} sx={{ width: 22, height: 22, objectFit: 'contain', borderRadius: '4px', bgcolor: '#fff', p: 0.2 }} />
                <Typography variant="caption" sx={{ letterSpacing: '0.05em', fontWeight: 'bold', color: '#fff' }}>
                  FAITH FOUNDATION MISSION HOSPITAL
                </Typography>
              </Stack>
              <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.15)' }} />
              
              <Stack direction="row" spacing={2} sx={{ mt: 1.5, textAlign: 'left' }} alignItems="center">
                <Avatar src={patient.photoUrl || undefined} sx={{ width: 56, height: 56, border: '2px solid #fff' }}>
                  {patient.firstName[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fff' }}>
                    {patient.firstName} {patient.lastName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', fontFamily: 'monospace' }}>
                    MRN: {patient.patientNumber}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Sex: {patient.gender} • Insurance: {patient.insurancePolicy?.provider?.name || 'Self Payer'}
                  </Typography>
                </Box>
              </Stack>
              
              {/* Simulated barcode */}
              <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                <Box sx={{ display: 'flex', height: 24, width: 140, bgcolor: '#fff', p: 0.2, borderRadius: 0.5, gap: 0.5 }}>
                  {[1, 3, 2, 4, 1, 2, 3, 1, 4, 2].map((w, idx) => (
                    <Box key={idx} sx={{ width: w, height: '100%', bgcolor: '#000' }} />
                  ))}
                </Box>
                <Typography variant="caption" sx={{ letterSpacing: '0.2em', fontWeight: 'bold', fontFamily: 'monospace', color: '#fff', mt: 0.5, fontSize: '0.7rem' }}>
                  {patient.patientNumber}
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              startIcon={<Print />}
              fullWidth
              onClick={handlePrintCard}
            >
              Print ID Card
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* CONFIRM DELETE DIALOG */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {deleteBlockedMsg ? 'Deletion Blocked' : 'Confirm Account Deletion'}
        </DialogTitle>
        <DialogContent>
          {deleteBlockedMsg ? (
            <Stack spacing={2}>
              <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                <Typography variant="body2" color="warning.dark" fontWeight={600}>
                  ⚠ This patient cannot be deleted
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This patient has existing clinical records (appointments, encounters, or invoices). Hard deletion is blocked to preserve medical audit trails.
                </Typography>
              </Box>
              <Typography variant="body2">
                You can <strong>change the patient's status</strong> to <em>ARCHIVED</em> or <em>INACTIVE</em> to deactivate the account while preserving the medical history.
              </Typography>
            </Stack>
          ) : (
            <Typography variant="body2">
              Are you sure you want to permanently delete this patient account and all associated encounters, billings, and clinical files? <strong>This cannot be undone.</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          {deleteBlockedMsg ? (
            <Button
              variant="contained"
              color="warning"
              onClick={() => {
                setDeleteOpen(false);
                setNewStatus('ARCHIVED');
                setOpenStatusChange(true);
              }}
            >
              Archive Instead
            </Button>
          ) : (
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Confirm Delete
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* STATUS CHANGE DIALOG */}
      <Dialog open={openStatusChange} onClose={() => setOpenStatusChange(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Change Patient Status</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current status: <Chip label={patient?.status || '...'} size="small"
                color={patient?.status === 'ACTIVE' ? 'success' : patient?.status === 'DECEASED' ? 'error' : 'default'}
              />
            </Typography>
            <FormControl fullWidth>
              <InputLabel>New Status *</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="New Status *"
              >
                <MenuItem value="ACTIVE">✅ ACTIVE</MenuItem>
                <MenuItem value="INACTIVE">🔴 INACTIVE</MenuItem>
                <MenuItem value="DECEASED">💀 DECEASED</MenuItem>
                <MenuItem value="ARCHIVED">📁 ARCHIVED</MenuItem>
              </Select>
            </FormControl>
            {newStatus === 'DECEASED' && (
              <Box sx={{ p: 1.5, bgcolor: 'error.light', borderRadius: 1.5 }}>
                <Typography variant="caption" color="error.dark" fontWeight={700}>
                  ⚠ Setting status to DECEASED will deactivate the patient's portal access.
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatusChange(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusChange}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* LINK FAMILY DIALOG */}
      <Dialog open={openLinkFamily} onClose={() => setOpenLinkFamily(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Link Patient to Family Account</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Option A: Convert Account & Create New Family Account</Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Convert this account to a Family Account and make <strong>{patient?.firstName} {patient?.lastName}</strong> the Family Head.
              </Typography>
              
              <Stack spacing={2} sx={{ mb: 2, mt: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 1.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={chargeUpgrade}
                      onChange={(e) => setChargeUpgrade(e.target.checked)}
                      color="secondary"
                      sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: '#fff' } }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                      Charge Account Upgrade / Conversion Fee
                    </Typography>
                  }
                />
                
                {chargeUpgrade && (
                  <TextField
                    type="number"
                    size="small"
                    label="Upgrade Fee Amount (₦)"
                    value={upgradeFee}
                    onChange={(e) => setUpgradeFee(Number(e.target.value))}
                    InputLabelProps={{
                      style: { color: 'rgba(255,255,255,0.9)' },
                    }}
                    sx={{
                      input: { color: '#fff' },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                        '&:hover fieldset': { borderColor: '#fff' },
                        '&.Mui-focused fieldset': { borderColor: '#fff' },
                      }
                    }}
                  />
                )}
              </Stack>

              <Button variant="contained" color="secondary" onClick={handleCreateFamily} fullWidth>
                Convert and Create Family Account
              </Button>
            </Box>

            <Divider>OR</Divider>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Option B: Link to Existing Family Account</Typography>
              {familyAccounts.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No other Family Accounts currently registered to link this patient to.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Select Family Account *</InputLabel>
                    <Select
                      value={selectedFamilyId}
                      onChange={(e) => setSelectedFamilyId(e.target.value)}
                      label="Select Family Account *"
                    >
                      {familyAccounts.map((f) => (
                        <MenuItem key={f.id} value={f.id}>
                          {f.familyNumber} — Head: {f.headName} ({f.headMrn})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Relationship to Family Head *</InputLabel>
                    <Select
                      value={familyRelationship}
                      onChange={(e) => setFamilyRelationship(e.target.value)}
                      label="Relationship to Family Head *"
                    >
                      <MenuItem value="SPOUSE">SPOUSE</MenuItem>
                      <MenuItem value="CHILD">CHILD</MenuItem>
                      <MenuItem value="PARENT">PARENT</MenuItem>
                      <MenuItem value="SIBLING">SIBLING</MenuItem>
                      <MenuItem value="GUARDIAN">GUARDIAN</MenuItem>
                      <MenuItem value="OTHER">OTHER</MenuItem>
                    </Select>
                  </FormControl>

                  <Button variant="contained" onClick={handleLinkFamily}>
                    Link to Selected Account
                  </Button>
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLinkFamily(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      </Box>

      {/* Hidden Print Templates */}
      <Box sx={{ display: 'none', '@media print': { display: 'block !important' } }}>
        {printEncounter?.type === 'LAB_ORDER' ? (
          <LabReportPrintTemplate order={printEncounter.order} />
        ) : printEncounter?.type === 'PHARMACY_PRESCRIPTION' ? (
          <PrescriptionPrintTemplate prescription={printEncounter.prescription} />
        ) : printEncounter?.type === 'REGISTRATION' ? (
          <RegistrationPrintTemplate patient={patient} encounter={printEncounter.data} />
        ) : printEncounter?.type === 'CLINICAL' ? (
          <EncounterPrintTemplate encounter={printEncounter.data} patient={patient} />
        ) : (
          <TreatmentChartPrintTemplate patient={patient} />
        )}
      </Box>
    </Container>
  );
};

export default PatientDetail;