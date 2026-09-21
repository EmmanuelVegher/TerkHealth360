import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  Chip,
  IconButton
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import CloseIcon from '@mui/icons-material/Close';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

export interface DoctorCallEventDetail {
  doctorName: string;
  patientName: string;
  patientId?: string;
  tokenNumber: string;
  department: string;
  timestamp: string;
}

export const broadcastDoctorCall = (detail: DoctorCallEventDetail) => {
  // Broadcast locally via Window CustomEvent
  window.dispatchEvent(new CustomEvent('doctor-patient-call', { detail }));

  // Broadcast across browser tabs via BroadcastChannel
  try {
    const bc = new BroadcastChannel('hms_doctor_calls');
    bc.postMessage(detail);
    bc.close();
  } catch (e) {}
};

export const GlobalCallDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [callData, setCallData] = useState<DoctorCallEventDetail | null>(null);

  useEffect(() => {
    const handleCall = (event: Event) => {
      const customEv = event as CustomEvent<DoctorCallEventDetail>;
      if (customEv.detail) {
        setCallData(customEv.detail);
        setOpen(true);
        playChime();
      }
    };

    window.addEventListener('doctor-patient-call', handleCall);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('hms_doctor_calls');
      bc.onmessage = (ev) => {
        if (ev.data) {
          setCallData(ev.data);
          setOpen(true);
          playChime();
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener('doctor-patient-call', handleCall);
      if (bc) bc.close();
    };
  }, []);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  if (!callData) return null;

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '2px solid #2563eb',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#2563eb', width: 40, height: 40 }}>
            <CampaignIcon sx={{ color: '#fff' }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#60a5fa' }}>
            Doctor Call Alert
          </Typography>
        </Box>
        <IconButton onClick={() => setOpen(false)} sx={{ color: '#94a3b8' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)', p: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Chip
            icon={<RecordVoiceOverIcon style={{ color: '#38bdf8' }} />}
            label={`TOKEN: ${callData.tokenNumber}`}
            color="primary"
            sx={{ fontSize: '1.1rem', py: 2, px: 1, fontWeight: 800, letterSpacing: 1 }}
          />
        </Box>
        <Box sx={{ bg: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 2, mb: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Patient Called
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mt: 0.5 }}>
            {callData.patientName}
          </Typography>
        </Box>
        <Box sx={{ bg: 'rgba(37,99,235,0.15)', p: 2, borderRadius: 2, border: '1px solid rgba(59,130,246,0.3)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <LocalHospitalIcon sx={{ color: '#60a5fa', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#93c5fd' }}>
              {callData.doctorName}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#cbd5e1', display: 'block' }}>
            Destination: <strong>{callData.department}</strong>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          onClick={() => setOpen(false)}
          fullWidth
          sx={{ py: 1.2, fontWeight: 700, borderRadius: 2, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
        >
          Acknowledge & Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );
};
