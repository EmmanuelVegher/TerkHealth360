import React, { useState, useEffect } from 'react';
import { Box, Typography, Divider, Grid } from '@mui/material';
import { api } from '../services/api';

// --- Hook: Load hospital info from backend config ---
const useHospitalInfo = () => {
  const [info, setInfo] = useState({
    name: 'FAITH FOUNDATION MISSION HOSPITAL',
    address: 'No. 20 Ogurugu Road Nsukka, Enugu State, Nigeria',
    email: 'info@faithfoundationhospital.org',
    phone: '+2347061042086',
  });

  useEffect(() => {
    api.get('/config/modules').then(res => {
      const g = res.data?.general;
      if (g) {
        setInfo(prev => ({
          ...prev,
          name: g.hospitalName || prev.name,
          address: g.hospitalAddress || prev.address,
          email: g.contactEmail || prev.email,
          phone: g.contactPhone || prev.phone,
        }));
      }
    }).catch(console.error);
  }, []);

  return info;
};

interface EncounterPrintTemplateProps {
  encounter: any;
  patient: any;
}

export const EncounterPrintTemplate: React.FC<EncounterPrintTemplateProps> = ({ encounter, patient }) => {
  const hospitalInfo = useHospitalInfo();
  
  // Custom Logos from backend (fallback to default)
  const [logoLeft, setLogoLeft] = useState('/hospital-logo.png');
  const [logoRight, setLogoRight] = useState('/hospital-logo.png');

  useEffect(() => {
    api.get('/config/modules').then(res => {
      if (res.data?.printTemplates) {
        setLogoLeft(res.data.printTemplates.logoLeft || '/hospital-logo.png');
        setLogoRight(res.data.printTemplates.logoRight || '/hospital-logo.png');
      }
    }).catch(console.error);
  }, []);

  if (!encounter || !patient) return null;

  return (
    <Box className="printable-encounter" sx={{ 
      p: 4, 
      bgcolor: '#fff', 
      color: '#000', 
      fontFamily: 'Arial, sans-serif',
      width: '100%',
      '@media print': {
        p: 2,
        WebkitPrintColorAdjust: 'exact'
      }
    }}>
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <img src={logoLeft} alt="Left Logo" style={{ height: 80, width: 80, objectFit: 'contain' }} />
        <Box textAlign="center" flex={1} px={2}>
          <Typography variant="h5" fontWeight={800} color="#1a237e" sx={{ letterSpacing: 1 }}>
            {hospitalInfo.name}
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {hospitalInfo.address}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tel: {hospitalInfo.phone} | Email: {hospitalInfo.email}
          </Typography>
        </Box>
        <img src={logoRight} alt="Right Logo" style={{ height: 80, width: 80, objectFit: 'contain' }} />
      </Box>

      <Divider sx={{ borderBottomWidth: 3, borderColor: '#1a237e', mb: 0.5 }} />
      <Divider sx={{ borderBottomWidth: 1, borderColor: '#1a237e', mb: 3 }} />

      <Typography variant="h6" align="center" fontWeight="bold" sx={{ textDecoration: 'underline', mb: 3 }}>
        CLINICAL ENCOUNTER SUMMARY
      </Typography>

      {/* PATIENT INFO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', border: '1px solid #000' }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold', width: '20%' }}>Patient Name:</td>
            <td style={{ padding: '8px', border: '1px solid #000', width: '30%' }}>{patient.lastName}, {patient.firstName}</td>
            <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold', width: '20%' }}>MRN:</td>
            <td style={{ padding: '8px', border: '1px solid #000', width: '30%' }}>{patient.medicalRecordNumber}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold' }}>Age / Sex:</td>
            <td style={{ padding: '8px', border: '1px solid #000' }}>
              {patient.birthDate ? new Date().getFullYear() - new Date(patient.birthDate).getFullYear() : ''} yrs / {patient.gender}
            </td>
            <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold' }}>Date Printed:</td>
            <td style={{ padding: '8px', border: '1px solid #000' }}>{new Date().toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      {/* ENCOUNTER INFO */}
      <Box sx={{ border: '1px solid #000', p: 2, mb: 4 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={2} sx={{ borderBottom: '1px solid #ccc', pb: 1 }}>
          Encounter Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2"><strong>Encounter Class:</strong> {encounter.class}</Typography>
            <Typography variant="body2" mt={1}><strong>Service Type:</strong> {encounter.serviceType || 'General'}</Typography>
            <Typography variant="body2" mt={1}><strong>Status:</strong> {encounter.status}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2"><strong>Start Time:</strong> {encounter.start ? new Date(encounter.start).toLocaleString() : 'N/A'}</Typography>
            <Typography variant="body2" mt={1}><strong>End Time:</strong> {encounter.end ? new Date(encounter.end).toLocaleString() : 'N/A'}</Typography>
            <Typography variant="body2" mt={1}><strong>Attending Provider:</strong> {encounter.staff ? `${encounter.staff.firstName} ${encounter.staff.lastName}` : 'N/A'}</Typography>
          </Grid>
        </Grid>
        
        <Box mt={3}>
          <Typography variant="body2"><strong>Reason for Visit:</strong></Typography>
          <Typography variant="body2" sx={{ p: 1, bgcolor: '#f9f9f9', border: '1px solid #eee', mt: 0.5, minHeight: '40px' }}>
            {encounter.reasonText || 'No specific reason documented.'}
          </Typography>
        </Box>

        <Box mt={3}>
          <Typography variant="body2"><strong>Diagnosis / Clinical Notes:</strong></Typography>
          <Typography variant="body2" sx={{ p: 1, bgcolor: '#f9f9f9', border: '1px solid #eee', mt: 0.5, minHeight: '60px' }}>
            {encounter.diagnosis ? JSON.stringify(encounter.diagnosis) : 'No diagnosis recorded during this encounter.'}
          </Typography>
        </Box>
      </Box>

      {/* FOOTER */}
      <Box mt={8} display="flex" justifyContent="space-between">
        <Box width="200px" textAlign="center">
          <Divider sx={{ borderColor: '#000', mb: 1 }} />
          <Typography variant="caption">Provider Signature</Typography>
        </Box>
        <Box width="200px" textAlign="center">
          <Divider sx={{ borderColor: '#000', mb: 1 }} />
          <Typography variant="caption">Date</Typography>
        </Box>
      </Box>
    </Box>
  );
};
