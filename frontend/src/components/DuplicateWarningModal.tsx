import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box,
  Card, CardContent, Chip, Stack, Table, TableBody, TableCell, TableRow, Alert
} from '@mui/material';
import { Warning, CheckCircle, PersonSearch, Key } from '@mui/icons-material';

export interface Candidate {
  patientId: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  phone?: string | null;
  gender?: string | null;
  score: number;
  reasons: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  incomingName: string;
  incomingPhone?: string;
  candidates: Candidate[];
  onSelectExisting: (candidate: Candidate) => void;
  onOverride?: () => void;
}

export const DuplicateWarningModal: React.FC<Props> = ({
  open,
  onClose,
  incomingName,
  incomingPhone,
  candidates,
  onSelectExisting,
  onOverride,
}) => {
  const highestCandidate = candidates[0];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 800 }}>
        <Warning color="warning" fontSize="large" />
        Real-Time Duplicate Patient Alert
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 3, fontWeight: 600 }}>
          Potential patient match detected ({highestCandidate?.score || 0}% confidence score). Creating duplicate records fragments patient medical records across Pharmacy, Laboratory, and Billing!
        </Alert>

        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          INCOMING REGISTRATION DETAILS:
        </Typography>
        <Box sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, mb: 3 }}>
          <Typography variant="body1" fontWeight={700}>
            {incomingName} {incomingPhone ? `| Phone: ${incomingPhone}` : ''}
          </Typography>
        </Box>

        <Typography variant="subtitle1" fontWeight={800} color="primary" mb={2}>
          EXISTING MATCHING PATIENT RECORDS ({candidates.length} Found)
        </Typography>

        <Stack spacing={2}>
          {candidates.map((c) => (
            <Card key={c.patientId} variant="outlined" sx={{ borderColor: c.score >= 70 ? '#E65100' : '#E0E0E0', bgcolor: c.score >= 70 ? '#FFF8E1' : '#FFFFFF' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6" fontWeight={800}>
                      {c.firstName} {c.lastName}
                    </Typography>
                    <Chip label={c.patientNumber} size="small" color="primary" variant="outlined" />
                  </Box>
                  <Chip
                    label={`${c.score}% Match Score`}
                    color={c.score >= 70 ? 'error' : 'warning'}
                    sx={{ fontWeight: 800 }}
                  />
                </Box>

                <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                  {c.reasons?.map((reason, idx) => (
                    <Chip key={idx} label={reason} size="small" color="info" variant="filled" sx={{ mb: 0.5 }} />
                  ))}
                </Stack>

                <Table size="small" sx={{ mb: 2 }}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, width: 120 }}>Gender / DOB</TableCell>
                      <TableCell>{c.gender || 'N/A'} | {c.birthDate ? new Date(c.birthDate).toLocaleDateString() : 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                      <TableCell>{c.phone || 'N/A'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => onSelectExisting(c)}
                  fullWidth
                  sx={{ fontWeight: 700 }}
                >
                  Use Existing Record ({c.patientNumber})
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">
          Cancel Registration
        </Button>
        {onOverride && (
          <Button
            onClick={onOverride}
            color="warning"
            variant="outlined"
            startIcon={<Key />}
            sx={{ fontWeight: 700 }}
          >
            Override & Register New Record (Supervisor)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
