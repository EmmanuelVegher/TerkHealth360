import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Chip, Stack,
  IconButton, Collapse, CircularProgress, Alert, Tooltip, Divider
} from '@mui/material';
import {
  AutoAwesome, Mic, MicOff, SmartToy, ExpandMore, ExpandLess,
  CheckCircle, Warning, LocalHospital, Send
} from '@mui/icons-material';
import { api } from '../services/api';
import { useSnackbar } from 'notistack';

interface Props {
  unitName: string; // e.g., 'OPD & Consultation', 'Pharmacy', 'LIMS Lab', 'Emergency & ICU', 'Inpatient Ward', 'Labour Ward', 'Billing & HMO', 'Executive'
  patientName?: string;
  patientId?: string;
  contextData?: any;
  onApplyRecommendation?: (rec: any) => void;
}

export const OpenMedUnitCoPilot: React.FC<Props> = ({
  unitName,
  patientName,
  patientId,
  contextData,
  onApplyRecommendation,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [expanded, setExpanded] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState<any | null>(null);
  const [customQuery, setCustomQuery] = useState('');

  // Handle Voice Recording Simulation (supporting English, Pidgin, Yoruba, Igbo, Hausa)
  const toggleRecording = () => {
    if (!recording) {
      setRecording(true);
      enqueueSnackbar('OpenMed Ambient Microphone listening (English / Pidgin / Yoruba / Igbo / Hausa)...', { variant: 'info' });
      // Simulate real-time stream speech input
      setTimeout(() => {
        setTranscript('Doctor ori n fo mi acute headache for 3 days and fever body dey hot me');
      }, 2500);
    } else {
      setRecording(false);
      if (transcript) {
        handleVoiceAnalyze();
      }
    }
  };

  const handleVoiceAnalyze = async () => {
    if (!transcript) return;
    setAnalyzing(true);
    try {
      const res = await api.post('/openmed/voice-summarize', {
        rawTranscript: transcript,
        patientName: patientName || 'Patient',
      });
      if (res.data?.success) {
        setAiResponse(res.data.data);
        enqueueSnackbar('Voice transcript analyzed & structured by OpenMed Local AI!', { variant: 'success' });
      }
    } catch (err) {
      console.error('Voice analysis failed:', err);
      enqueueSnackbar('Voice analysis failed. Please retry.', { variant: 'error' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunQuery = async () => {
    if (!customQuery.trim()) return;
    setAnalyzing(true);
    try {
      if (unitName.toLowerCase().includes('executive') || unitName.toLowerCase().includes('dashboard')) {
        const res = await api.post('/openmed/ask-hospital', { query: customQuery });
        if (res.data?.success) {
          setAiResponse({ executiveAnswer: res.data.data.answer, dataPoints: res.data.data.dataPoints });
        }
      } else {
        const res = await api.post('/openmed/ner', { text: customQuery });
        if (res.data?.success) {
          setAiResponse({ entities: res.data.data.entities, query: customQuery });
        }
      }
    } catch (err) {
      enqueueSnackbar('Query processing failed', { variant: 'error' });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(37, 99, 235, 0.12)',
        border: '1px solid #DBEAFE',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F0F7FF 100%)',
        mb: 3,
      }}
    >
      <Box
        p={2}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <AutoAwesome sx={{ color: '#2563EB', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={800} color="#0F172A">
              OpenMed AI Co-Pilot — {unitName}
            </Typography>
            <Typography variant="caption" color="#64748B" fontWeight={600}>
              Local 7B Clinical Engine • 100% Offline Safe & NDPR Compliant
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label="ONLINE • LOCAL" size="small" color="success" sx={{ fontWeight: 800 }} />
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <CardContent sx={{ pt: 2.5 }}>
          {/* Quick Voice Scribe Toolbar */}
          <Box
            sx={{
              p: 2,
              bgcolor: recording ? '#FEF2F2' : '#FFFFFF',
              borderRadius: 2,
              border: recording ? '2px solid #EF4444' : '1px solid #E2E8F0',
              mb: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5} flex={1}>
              <Tooltip title={recording ? 'Stop Recording' : 'Start Ambient Voice Scribe (Multilingual)'}>
                <IconButton
                  color={recording ? 'error' : 'primary'}
                  onClick={toggleRecording}
                  sx={{ bgcolor: recording ? '#FEE2E2' : '#EFF6FF', p: 1.5 }}
                >
                  {recording ? <MicOff /> : <Mic />}
                </IconButton>
              </Tooltip>
              <TextField
                fullWidth
                size="small"
                placeholder={recording ? 'Listening to consultation dialogue...' : 'Type or record clinical dialogue / query...'}
                value={transcript || customQuery}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  setCustomQuery(e.target.value);
                }}
              />
            </Box>
            <Button
              variant="contained"
              color="primary"
              disabled={analyzing || (!transcript && !customQuery)}
              onClick={transcript ? handleVoiceAnalyze : handleRunQuery}
              startIcon={analyzing ? <CircularProgress size={16} color="inherit" /> : <Send />}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Analyze
            </Button>
          </Box>

          {/* AI Response Preview */}
          {aiResponse && (
            <Box sx={{ p: 2.5, bgcolor: '#FFFFFF', borderRadius: 2, border: '1px solid #BFDBFE' }}>
              {aiResponse.summary && (
                <Box mb={2}>
                  <Typography variant="subtitle2" fontWeight={800} color="#1E40AF" mb={1}>
                    Auto-Generated SOAP Clinical Note:
                  </Typography>
                  <Typography variant="body2" sx={{ bgcolor: '#F8FAFC', p: 1.5, borderRadius: 1.5, fontStyle: 'italic', mb: 1 }}>
                    <strong>Subjective:</strong> {aiResponse.summary.subjective}
                  </Typography>
                  <Typography variant="body2" sx={{ bgcolor: '#F8FAFC', p: 1.5, borderRadius: 1.5, mb: 1 }}>
                    <strong>Assessment:</strong> {aiResponse.summary.assessment}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, whiteSpace: 'pre-line' }}>
                    <strong>Plan:</strong> {aiResponse.summary.plan}
                  </Typography>
                </Box>
              )}

              {aiResponse.executiveAnswer && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="#1E40AF" mb={1}>
                    Executive Intelligence Answer:
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="#0F172A" mb={1}>
                    {aiResponse.executiveAnswer}
                  </Typography>
                </Box>
              )}

              {aiResponse.entities && aiResponse.entities.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                  {aiResponse.entities.map((e: any, idx: number) => (
                    <Chip key={idx} label={`${e.category}: ${e.text}`} size="small" color="primary" variant="outlined" sx={{ mb: 0.5 }} />
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </CardContent>
      </Collapse>
    </Card>
  );
};
