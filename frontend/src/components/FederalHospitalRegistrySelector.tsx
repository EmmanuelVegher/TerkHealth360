import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Autocomplete, TextField,
  Button, Chip, Divider, CircularProgress, Alert, Paper, Stack, Tooltip
} from '@mui/material';
import {
  LocalHospital, Verified, Place, Phone, Email, Language,
  MedicalServices, Bed, CheckCircle, SyncAlt, Refresh,
  Domain, AssignmentTurnedIn, HealthAndSafety, Apartment
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

interface StateOption {
  stateName: string;
  facilityCount: number;
}

interface LgaOption {
  lgaName: string;
  facilityCount: number;
}

interface WardOption {
  wardName: string;
  facilityCount: number;
}

export interface FederalFacility {
  id: string;
  registryId?: string;
  uniqueId: string;
  stateUniqueId?: string;
  registrationNo?: string;
  facilityName: string;
  altFacilityName?: string;
  stateId?: string;
  stateName: string;
  lgaId?: string;
  lgaName: string;
  wardId?: string;
  wardName: string;
  facilityLevelName?: string;
  ownershipName?: string;
  ownershipType?: string;
  physicalLocation?: string;
  postalAddress?: string;
  longitude?: number;
  latitude?: number;
  phoneNumber?: string;
  alternateNumber?: string;
  emailAddress?: string;
  website?: string;
  operationalDays?: string;
  operationalHours?: string;
  operationalStatus?: string;
  registrationStatus?: string;
  licenseStatus?: string;
  outpatient?: string;
  inpatient?: string;
  doctors?: number;
  pharmacists?: number;
  dentist?: number;
  pharmacyTechnicians?: number;
  nurses?: number;
  labScientists?: number;
  midwifes?: number;
  labTechnicians?: number;
  nurseMidwife?: number;
  himOfficers?: number;
  communityHealthOfficer?: number;
  communityExtensionWorkers?: number;
  junCommunityExtensionWorker?: number;
  dentalTechnicians?: number;
  envHealthOfficers?: number;
  attendants?: number;
  beds?: number;
  onsiteLaboratory?: string;
  onsiteImaging?: string;
  onsitePharmacy?: string;
  mortuaryServices?: string;
  ambulanceServices?: string;
  dhis2Synced?: string;
  isSelectedHospital?: boolean;
  rawMetadata?: any;
}

interface Props {
  onHospitalSelected?: (facility: FederalFacility) => void;
}

export const FederalHospitalRegistrySelector: React.FC<Props> = ({ onHospitalSelected }) => {
  const { enqueueSnackbar } = useSnackbar();

  // Active / Linked Hospital
  const [activeFacility, setActiveFacility] = useState<FederalFacility | null>(null);
  const [loadingActive, setLoadingActive] = useState(false);

  // Cascading options
  const [states, setStates] = useState<StateOption[]>([]);
  const [lgas, setLgas] = useState<LgaOption[]>([]);
  const [wards, setWards] = useState<WardOption[]>([]);
  const [hospitals, setHospitals] = useState<FederalFacility[]>([]);

  // Selected values
  const [selectedState, setSelectedState] = useState<StateOption | null>(null);
  const [selectedLga, setSelectedLga] = useState<LgaOption | null>(null);
  const [selectedWard, setSelectedWard] = useState<WardOption | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<FederalFacility | null>(null);

  // Loaders
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingLgas, setLoadingLgas] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);

  // 1. Fetch current active facility & states on mount
  useEffect(() => {
    fetchActiveFacility();
    fetchStates();
  }, []);

  const fetchActiveFacility = async () => {
    setLoadingActive(true);
    try {
      const res = await api.get('/facilities/selected');
      if (res.data?.success && res.data.facility) {
        setActiveFacility(res.data.facility);
        localStorage.setItem('app_hospital_name', res.data.facility.facilityName);
        const sub = res.data.facility.facilityLevelName
          ? `${res.data.facility.facilityLevelName} Hospital · ${res.data.facility.lgaName}`
          : `${res.data.facility.lgaName}, ${res.data.facility.stateName}`;
        localStorage.setItem('app_hospital_subtitle', sub);
        window.dispatchEvent(new Event('hospital-config-updated'));
      }
    } catch (err) {
      console.error('Failed to load active facility:', err);
    } finally {
      setLoadingActive(false);
    }
  };

  const fetchStates = async () => {
    setLoadingStates(true);
    try {
      const res = await api.get('/facilities/states');
      if (res.data?.success) {
        setStates(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load states:', err);
      enqueueSnackbar('Failed to load Nigerian states registry', { variant: 'error' });
    } finally {
      setLoadingStates(false);
    }
  };

  // 2. When State changes, fetch LGAs
  const handleStateChange = async (_: any, newState: StateOption | null) => {
    setSelectedState(newState);
    setSelectedLga(null);
    setSelectedWard(null);
    setSelectedHospital(null);
    setLgas([]);
    setWards([]);
    setHospitals([]);

    if (!newState) return;

    setLoadingLgas(true);
    try {
      const res = await api.get('/facilities/lgas', {
        params: { state: newState.stateName }
      });
      if (res.data?.success) {
        setLgas(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load LGAs:', err);
      enqueueSnackbar('Failed to load LGAs for ' + newState.stateName, { variant: 'error' });
    } finally {
      setLoadingLgas(false);
    }
  };

  // 3. When LGA changes, fetch Wards
  const handleLgaChange = async (_: any, newLga: LgaOption | null) => {
    setSelectedLga(newLga);
    setSelectedWard(null);
    setSelectedHospital(null);
    setWards([]);
    setHospitals([]);

    if (!selectedState || !newLga) return;

    setLoadingWards(true);
    try {
      const res = await api.get('/facilities/wards', {
        params: {
          state: selectedState.stateName,
          lga: newLga.lgaName
        }
      });
      if (res.data?.success) {
        setWards(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load Wards:', err);
      enqueueSnackbar('Failed to load Wards for ' + newLga.lgaName, { variant: 'error' });
    } finally {
      setLoadingWards(false);
    }
  };

  // 4. When Ward changes, fetch Hospitals
  const handleWardChange = async (_: any, newWard: WardOption | null) => {
    setSelectedWard(newWard);
    setSelectedHospital(null);
    setHospitals([]);

    if (!selectedState || !selectedLga || !newWard) return;

    setLoadingHospitals(true);
    try {
      const res = await api.get('/facilities/hospitals', {
        params: {
          state: selectedState.stateName,
          lga: selectedLga.lgaName,
          ward: newWard.wardName,
          limit: 300
        }
      });
      if (res.data?.success) {
        setHospitals(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load hospitals:', err);
      enqueueSnackbar('Failed to load hospitals for ' + newWard.wardName, { variant: 'error' });
    } finally {
      setLoadingHospitals(false);
    }
  };

  // 5. Apply selected hospital to the entire application
  const handleApplySelectedHospital = async (targetFacility?: FederalFacility) => {
    const facilityToApply = targetFacility || selectedHospital;
    if (!facilityToApply) {
      enqueueSnackbar('Please select a hospital first', { variant: 'warning' });
      return;
    }

    setSavingSelection(true);
    try {
      const res = await api.post('/facilities/select', {
        facilityId: facilityToApply.id,
        uniqueId: facilityToApply.uniqueId
      });

      if (res.data?.success) {
        const updated = res.data.data;
        setActiveFacility(updated);
        setSelectedHospital(updated);

        localStorage.setItem('app_hospital_name', updated.facilityName);
        const sub = updated.facilityLevelName
          ? `${updated.facilityLevelName} Hospital · ${updated.lgaName}`
          : `${updated.lgaName}, ${updated.stateName}`;
        localStorage.setItem('app_hospital_subtitle', sub);
        window.dispatchEvent(new Event('hospital-config-updated'));

        enqueueSnackbar(`Application linked to ${updated.facilityName} (HFR: ${updated.uniqueId})`, {
          variant: 'success'
        });

        if (onHospitalSelected) {
          onHospitalSelected(updated);
        }
      }
    } catch (err: any) {
      console.error('Failed to select hospital:', err);
      enqueueSnackbar(err.response?.data?.error || 'Failed to update application hospital link', {
        variant: 'error'
      });
    } finally {
      setSavingSelection(false);
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid #e2e8f0',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        mb: 3
      }}
    >
      {/* Top Banner */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)',
          color: '#ffffff',
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.25)'
            }}
          >
            <LocalHospital sx={{ color: '#ffffff', fontSize: 28 }} />
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.3px', color: '#ffffff' }}>
                Federal Health Facility Registry (FMoH HFR)
              </Typography>
              <Chip
                icon={<Verified sx={{ fontSize: '14px !important', color: '#10b981 !important' }} />}
                label="Official Federal Registry"
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  color: '#065f46',
                  fontWeight: 700,
                  fontSize: '0.72rem'
                }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.82rem' }}>
              Select State, LGA, Ward, and Hospital to link this application and switch between Nigerian health facilities
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={<Refresh />}
          onClick={() => {
            fetchActiveFacility();
            fetchStates();
          }}
          sx={{
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.3)' }
          }}
        >
          Refresh Registry
        </Button>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {/* Active Facility Status Display */}
        {activeFacility ? (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 2.5,
              border: '1px solid #10b981',
              bgcolor: 'rgba(16, 185, 129, 0.04)'
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                  <CheckCircle sx={{ color: '#059669', fontSize: 20 }} />
                  <Typography variant="caption" fontWeight={800} color="#059669" textTransform="uppercase" letterSpacing={0.5}>
                    Currently Active & Linked Facility
                  </Typography>
                  <Chip
                    label={activeFacility.facilityLevelName || 'Health Facility'}
                    size="small"
                    sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 700, height: 22 }}
                  />
                  {activeFacility.ownershipName && (
                    <Chip
                      label={activeFacility.ownershipName}
                      size="small"
                      sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 600, height: 22 }}
                    />
                  )}
                </Stack>
                <Typography variant="h6" fontWeight={800} color="#1e293b">
                  {activeFacility.facilityName}
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={2} mt={1} color="#64748b" fontSize="0.82rem">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Place sx={{ fontSize: 16, color: '#059669' }} />
                    <span>{activeFacility.physicalLocation || `${activeFacility.wardName}, ${activeFacility.lgaName}, ${activeFacility.stateName}`}</span>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Apartment sx={{ fontSize: 16, color: '#6366f1' }} />
                    <span>LGA: <strong>{activeFacility.lgaName}</strong>, State: <strong>{activeFacility.stateName}</strong></span>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AssignmentTurnedIn sx={{ fontSize: 16, color: '#0284c7' }} />
                    <span>HFR Unique Code: <strong style={{ fontFamily: 'monospace' }}>{activeFacility.uniqueId}</strong></span>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                  {activeFacility.beds ? (
                    <Tooltip title="Bed Capacity">
                      <Chip
                        icon={<Bed sx={{ fontSize: '14px !important' }} />}
                        label={`${activeFacility.beds} Beds`}
                        size="small"
                        sx={{ bgcolor: '#f1f5f9', fontWeight: 600 }}
                      />
                    </Tooltip>
                  ) : null}
                  {activeFacility.doctors ? (
                    <Tooltip title="Doctors Registered">
                      <Chip
                        icon={<MedicalServices sx={{ fontSize: '14px !important' }} />}
                        label={`${activeFacility.doctors} Doctors`}
                        size="small"
                        sx={{ bgcolor: '#f1f5f9', fontWeight: 600 }}
                      />
                    </Tooltip>
                  ) : null}
                  <Chip
                    label={activeFacility.operationalStatus || 'Functional'}
                    size="small"
                    sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }}
                  />
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        ) : loadingActive ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, mb: 3 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">Checking linked hospital registration...</Typography>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            No Federal Registry facility is currently linked. Use the cascading selectors below to find and link your hospital.
          </Alert>
        )}

        <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SyncAlt sx={{ color: '#059669', fontSize: 18 }} />
          Select Location & Hospital from Federal Registry
        </Typography>

        {/* Cascading Dropdowns: State -> LGA -> Ward -> Hospital */}
        <Grid container spacing={2}>
          {/* 1. STATE */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={states}
              getOptionLabel={(option) => `${option.stateName} (${option.facilityCount})`}
              value={selectedState}
              onChange={handleStateChange}
              loading={loadingStates}
              isOptionEqualToValue={(option, value) => option.stateName === value.stateName}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="1. State"
                  placeholder="Select Nigerian State"
                  size="small"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingStates ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* 2. LGA */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={lgas}
              getOptionLabel={(option) => `${option.lgaName} (${option.facilityCount})`}
              value={selectedLga}
              onChange={handleLgaChange}
              disabled={!selectedState || loadingLgas}
              loading={loadingLgas}
              isOptionEqualToValue={(option, value) => option.lgaName === value.lgaName}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="2. LGA (Local Govt)"
                  placeholder={selectedState ? "Select LGA" : "Select State first"}
                  size="small"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingLgas ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* 3. WARD */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={wards}
              getOptionLabel={(option) => `${option.wardName} (${option.facilityCount})`}
              value={selectedWard}
              onChange={handleWardChange}
              disabled={!selectedLga || loadingWards}
              loading={loadingWards}
              isOptionEqualToValue={(option, value) => option.wardName === value.wardName}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="3. Ward"
                  placeholder={selectedLga ? "Select Ward" : "Select LGA first"}
                  size="small"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingWards ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* 4. HOSPITAL NAME */}
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              options={hospitals}
              getOptionLabel={(option) => option.facilityName}
              value={selectedHospital}
              onChange={(_, newHospital) => setSelectedHospital(newHospital)}
              disabled={!selectedWard || loadingHospitals}
              loading={loadingHospitals}
              isOptionEqualToValue={(option, value) => option.id === value.id || option.uniqueId === value.uniqueId}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ py: 0.5, width: '100%' }}>
                    <Typography variant="body2" fontWeight={700} color="#1e293b">
                      {option.facilityName}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" mt={0.2}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {option.uniqueId}
                      </Typography>
                      {option.facilityLevelName && (
                        <Chip
                          label={option.facilityLevelName}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#f1f5f9' }}
                        />
                      )}
                      {option.ownershipName && (
                        <Chip
                          label={option.ownershipName}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#e0f2fe', color: '#0369a1' }}
                        />
                      )}
                    </Stack>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="4. Hospital Name"
                  placeholder={selectedWard ? "Select Hospital" : "Select Ward first"}
                  size="small"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingHospitals ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
        </Grid>

        {/* Selected Hospital Preview & Apply Action */}
        {selectedHospital && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 3,
              borderRadius: 2.5,
              border: '1px solid #cbd5e1',
              bgcolor: '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                  <Chip
                    label="Selected Registry Facility"
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    label={selectedHospital.facilityLevelName || 'Level Unspecified'}
                    size="small"
                    sx={{ bgcolor: '#e2e8f0', fontWeight: 600 }}
                  />
                  <Chip
                    label={selectedHospital.ownershipName || 'Ownership Unspecified'}
                    size="small"
                    sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600 }}
                  />
                  {selectedHospital.ownershipType && (
                    <Chip
                      label={selectedHospital.ownershipType}
                      size="small"
                      sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 500 }}
                    />
                  )}
                </Stack>
                <Typography variant="h6" fontWeight={800} color="#0f172a">
                  {selectedHospital.facilityName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {selectedHospital.physicalLocation || 'No street address listed'}
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="success"
                size="large"
                disabled={savingSelection}
                onClick={() => handleApplySelectedHospital()}
                startIcon={savingSelection ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
                sx={{
                  bgcolor: '#059669',
                  '&:hover': { bgcolor: '#047857' },
                  fontWeight: 700,
                  px: 3,
                  py: 1,
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)'
                }}
              >
                {savingSelection ? 'Updating Application...' : 'Link & Switch Application To This Hospital'}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Comprehensive Metadata Grid */}
            <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={1.5} display="block">
              Federal Registry Metadata (Will be saved to application configuration)
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">HFR Master Unique ID</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                    {selectedHospital.uniqueId}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">State Unique ID / Reg No</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                    {selectedHospital.stateUniqueId || selectedHospital.registrationNo || 'N/A'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Location Hierarchy</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedHospital.wardName} Ward, {selectedHospital.lgaName}, {selectedHospital.stateName}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Operational Hours</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedHospital.operationalHours || '24 Hours'} ({selectedHospital.operationalStatus || 'Functional'})
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedHospital.phoneNumber || 'Not Listed'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Email & Website</Typography>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {selectedHospital.emailAddress || selectedHospital.website || 'Not Listed'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Clinical Staff Capacity</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedHospital.doctors ?? 0} Doctors, {selectedHospital.nurses ?? 0} Nurses, {selectedHospital.midwifes ?? 0} Midwives
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Bed Capacity & Diagnostics</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {selectedHospital.beds ?? 0} Beds • Lab: {selectedHospital.onsiteLaboratory || 'No'} • Imaging: {selectedHospital.onsiteImaging || 'No'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default FederalHospitalRegistrySelector;
