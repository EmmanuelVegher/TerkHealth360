import React, { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { api } from '../services/api';

const useHospitalInfo = () => {
  const [info, setInfo] = useState({
    name: 'FAITH FOUNDATION MISSION HOSPITAL, NSUKKA.',
    logoLeft: '/anglican-logo.png',
    logoRight: '/hospital-logo.png'
  });

  useEffect(() => {
    api.get('/config/modules').then(res => {
      if (res.data?.success) {
        const configs = res.data.data;
        const get = (key: string) => configs.find((c: any) => c.moduleKey === key)?.description;
        const name = get('HOSPITAL_NAME');
        const lLogo = get('PRINT_LOGO_LEFT');
        const rLogo = get('PRINT_LOGO_RIGHT');
        setInfo(prev => ({
          ...prev,
          ...(name ? { name: `${name.toUpperCase()}, NSUKKA.` } : {}),
          ...(lLogo ? { logoLeft: lLogo } : {}),
          ...(rLogo ? { logoRight: rLogo } : {}),
        }));
      }
    }).catch(console.error);
  }, []);

  return info;
};

export const TreatmentChartPrintTemplate = ({ patient }: { patient: any }) => {
  const info = useHospitalInfo();
  
  // Create 25 empty rows for hand-writing
  const blankRows = Array.from({ length: 25 });

  return (
    <Box className="printable-treatment-chart" sx={{
      width: '100%',
      backgroundColor: '#fff',
      color: '#000',
      p: 2,
      fontFamily: 'Times New Roman, serif',
    }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, borderBottom: '2px solid #000', pb: 1 }}>
        <img src={info.logoLeft} alt="Logo Left" style={{ height: 70, objectFit: 'contain' }} />
        <Typography variant="h4" sx={{ fontWeight: 'bold', letterSpacing: 1, textAlign: 'center', flex: 1, fontFamily: 'Times New Roman, serif' }}>
          {info.name}
        </Typography>
        <img src={info.logoRight} alt="Logo Right" style={{ height: 70, borderRadius: '50%', border: '2px solid #000', objectFit: 'contain' }} />
      </Box>

      {/* PATIENT DETAILS */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={{ fontFamily: 'Times New Roman, serif', fontSize: '1.1rem' }}>
          Name: <strong style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '350px' }}>{patient.firstName} {patient.lastName}</strong>
        </Typography>
        <Typography sx={{ fontFamily: 'Times New Roman, serif', fontSize: '1.1rem' }}>
          O.P N: <strong style={{ borderBottom: '1px dotted #000', display: 'inline-block', width: '200px' }}>{patient.patientNumber}</strong>
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', flex: 1, alignItems: 'center' }}>
          <Typography sx={{ fontFamily: 'Times New Roman, serif', fontSize: '1.1rem' }}>Ward:</Typography>
          <Box sx={{ borderBottom: '1px dotted #000', flex: 1, ml: 1, mr: 2 }}></Box>
        </Box>
        <Box sx={{ display: 'flex', width: '250px', alignItems: 'center' }}>
          <Typography sx={{ fontFamily: 'Times New Roman, serif', fontSize: '1.1rem' }}>Bed No:</Typography>
          <Box sx={{ borderBottom: '1px dotted #000', flex: 1, ml: 1, mr: 2 }}></Box>
        </Box>
        <Box sx={{ display: 'flex', width: '250px', alignItems: 'center' }}>
          <Typography sx={{ fontFamily: 'Times New Roman, serif', fontSize: '1.1rem' }}>Date:</Typography>
          <Box sx={{ borderBottom: '1px dotted #000', flex: 1, ml: 1 }}></Box>
        </Box>
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'Times New Roman, serif' }}>
        TREATMENTS
      </Typography>

      {/* TABLE */}
      <Table sx={{ border: '2px solid #000', '& th, & td': { border: '1px solid #000', p: 0.5, fontFamily: 'Times New Roman, serif' } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', width: '80px', color: '#000' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '250px', color: '#000' }}>Drug</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: '#000' }}>Drug Dosage</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '80px', color: '#000' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '80px', color: '#000' }}>Time</TableCell>
            <TableCell sx={{ fontWeight: 'bold', width: '100px', color: '#000' }}>Sign</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {blankRows.map((_, i) => (
            <TableRow key={i} sx={{ height: '32px' }}>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Typography sx={{ mt: 2, fontSize: '0.9rem', fontStyle: 'italic', fontFamily: 'Times New Roman, serif' }}>
        Motto: Jehovah Rapha
      </Typography>
    </Box>
  );
};
