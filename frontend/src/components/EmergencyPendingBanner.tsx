import React, { useState, useEffect } from 'react';
import {
  Alert, Box, Button, Chip, Stack, Typography
} from '@mui/material';
import { Warning, HowToReg, AssignmentInd } from '@mui/icons-material';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface EmergencyPendingBannerProps {
  onSelectArrival?: (arrival: any) => void;
  mode?: 'navigate' | 'select';
}

export const EmergencyPendingBanner: React.FC<EmergencyPendingBannerProps> = ({ onSelectArrival, mode = 'navigate' }) => {
  const navigate = useNavigate();
  const [pendingArrivals, setPendingArrivals] = useState<any[]>([]);
  const [pendingLabour, setPendingLabour] = useState<any[]>([]);

  const fetchPending = async () => {
    try {
      const [erRes, labourRes] = await Promise.all([
        api.get('/emergency/arrivals').catch(() => ({ data: [] })),
        api.get('/maternity/labour/pending-unbooked').catch(() => ({ data: { pendingPatients: [] } }))
      ]);

      const data = Array.isArray(erRes.data) ? erRes.data : [];
      const uncompletedER = data.filter((a: any) => !!a.tempPatientName && !a.patientId);
      setPendingArrivals(uncompletedER);

      const labourPatients = labourRes.data?.pendingPatients || [];
      setPendingLabour(labourPatients);
    } catch (err) {
      console.error('Failed to load pending emergency arrivals or labour intakes', err);
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleAction = (arrival: any) => {
    if (mode === 'select' && onSelectArrival) {
      onSelectArrival(arrival);
    } else {
      navigate('/register-patient', { state: { emergencyArrival: arrival } });
    }
  };

  const handleLabourAction = (patient: any) => {
    navigate('/register-patient', { state: { editPatient: patient, isLabourValidation: true } });
  };

  if (pendingArrivals.length === 0 && pendingLabour.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Alert
        severity="warning"
        icon={<Warning fontSize="large" color="warning" />}
        sx={{
          bgcolor: '#fffbe6',
          border: '2px solid #ffe58f',
          borderRadius: 3,
          p: 2,
          boxShadow: '0 4px 20px rgba(250, 173, 20, 0.15)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2, width: '100%' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#d46b08', display: 'flex', alignItems: 'center', gap: 1 }}>
              🚨 EMERGENCY & UNBOOKED LABOUR REGISTRATION FLAGS ({pendingArrivals.length + pendingLabour.length})
            </Typography>
            <Typography variant="body2" sx={{ color: '#8c4c00', mt: 0.5 }}>
              Emergency/Labour patients were bedside quick-admitted with temporary tags. Records Desk must complete full bio-data & HMO check-in.
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5, gap: 1 }}>
              {pendingArrivals.map((arr) => (
                <Chip
                  key={arr.id}
                  icon={<AssignmentInd />}
                  label={`[ER] ${arr.tempPatientName || 'Unknown'} (${arr.arrivalCode})`}
                  color="warning"
                  variant="outlined"
                  onClick={() => handleAction(arr)}
                  sx={{
                    fontWeight: 700,
                    bgcolor: '#fff',
                    borderColor: '#faad14',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#ffe7ba' }
                  }}
                />
              ))}

              {pendingLabour.map((p) => {
                const bedNum = p.admissions?.[0]?.bed?.number || 'Labour Ward';
                return (
                  <Chip
                    key={p.id}
                    icon={<AssignmentInd />}
                    label={`👶 [LABOUR] ${p.firstName} ${p.lastName} (${p.patientNumber} - Bed: ${bedNum})`}
                    color="secondary"
                    variant="filled"
                    onClick={() => handleLabourAction(p)}
                    sx={{
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(156,39,176,0.3)',
                    }}
                  />
                );
              })}
            </Stack>
          </Box>

          <Button
            variant="contained"
            color="warning"
            startIcon={<HowToReg />}
            onClick={() => {
              if (pendingLabour.length > 0) {
                handleLabourAction(pendingLabour[0]);
              } else if (pendingArrivals.length > 0) {
                handleAction(pendingArrivals[0]);
              }
            }}
            sx={{ fontWeight: 800, whiteSpace: 'nowrap', alignSelf: { xs: 'flex-start', md: 'center' } }}
          >
            Complete Bio-Data Check-In
          </Button>
        </Box>
      </Alert>
    </Box>
  );
};
