import React, { useState, useEffect } from 'react';
import { assetUrl } from '../utils/assetUrl';
import { Box, Typography, Grid, Paper, Divider, Avatar } from '@mui/material';
import { api } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

// Shared Header for consistency
const RegistrationHeader = ({ title, theme, logoLeft, logoRight }: { title: string, theme: string, logoLeft?: string, logoRight?: string }) => {
  const isMinimalist = theme === 'reg_modern_minimalist';
  const isHighContrast = theme === 'reg_high_contrast';
  const isPediatric = theme === 'reg_pediatric_theme';
  
  const headerColor = isHighContrast ? '#000' : (theme === 'reg_classic_blue' ? '#e3f2fd' : (isPediatric ? '#fce4ec' : (isMinimalist ? 'transparent' : '#f1f1f1')));
  const headerTextColor = isHighContrast ? '#fff' : (theme === 'reg_classic_blue' ? '#0d47a1' : (isPediatric ? '#c2185b' : '#000'));
  
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      mb: 3, 
      pb: isMinimalist ? 2 : 0,
      p: isMinimalist ? 0 : 2, 
      bgcolor: headerColor, 
      color: headerTextColor,
      borderRadius: isMinimalist ? 0 : 2,
      borderBottom: isMinimalist ? '2px solid #eee' : 'none'
    }}>
      <Box component="img" src={assetUrl(logoLeft || "/hospital-logo.png")} sx={{ height: 60, width: 'auto', objectFit: 'contain' }} />
      <Box sx={{ textAlign: 'center', flexGrow: 1, px: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>Faith Foundation Mission Hospital,Nsukka</Typography>
      </Box>
      <Box component="img" src={assetUrl(logoRight || "/hospital-logo.png")} sx={{ height: 60, width: 'auto', objectFit: 'contain' }} />
    </Box>
  );
};

const RegistrationTemplateFactory = ({ patient, encounter, template, logoLeft, logoRight }: { patient: any, encounter: any, template: string, logoLeft?: string, logoRight?: string }) => {
  const isThermal = template.includes('thermal') || template.includes('slip');
  const isCard = template === 'reg_photo_id_card';
  const isWristband = template === 'reg_wristband';
  
  const fullName = `${patient.firstName} ${patient.middleName || ''} ${patient.lastName}`.trim().toUpperCase();
  const dob = new Date(patient.birthDate).toLocaleDateString();
  const age = new Date().getFullYear() - new Date(patient.birthDate).getFullYear();
  const address = patient.addresses?.[0] ? `${patient.addresses[0].line}, ${patient.addresses[0].city}` : 'N/A';
  const phone = patient.telecoms?.find((t: any) => t.system === 'phone')?.value || 'N/A';

  // Specific layouts
  if (isWristband) {
    return (
      <Box sx={{ width: '100%', maxWidth: '400px', p: 2, border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h6" fontWeight={800}>{fullName}</Typography>
        <Typography variant="body2" fontWeight={700}>MRN: {patient.mrn}</Typography>
        <Typography variant="caption">DOB: {dob} ({age}Y) | {patient.gender}</Typography>
        <Box sx={{ mt: 1, '& svg': { width: '100%', height: '40px' } }}>
          <QRCodeSVG value={patient.mrn || 'UNK'} size={40} />
        </Box>
      </Box>
    );
  }

  if (isCard) {
    return (
      <Paper elevation={0} sx={{ width: '320px', border: '1px solid #1a237e', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#1a237e', color: '#fff', p: 2, textAlign: 'center' }}>
          <Typography variant="subtitle2" fontWeight={700}>FAITH FOUNDATION HOSPITAL</Typography>
          <Typography variant="caption">PATIENT ID CARD</Typography>
        </Box>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Avatar sx={{ width: 80, height: 80 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>{fullName}</Typography>
            <Typography variant="body2" color="text.secondary">{patient.mrn}</Typography>
            <Typography variant="caption" display="block">DOB: {dob}</Typography>
            <Typography variant="caption" display="block">BLD: {patient.bloodGroup || 'UNK'}</Typography>
          </Box>
        </Box>
        <Box sx={{ p: 1, bgcolor: '#f5f5f5', textAlign: 'center', '& svg': { width: '100%', height: '30px' } }}>
           <QRCodeSVG value={patient.mrn || 'UNK'} size={30} />
        </Box>
      </Paper>
    );
  }

  if (isThermal) {
    return (
      <Box sx={{ width: template.includes('58mm') ? '58mm' : '80mm', p: 1, fontFamily: 'monospace', fontSize: '12px' }}>
        <Typography align="center" fontWeight="bold" variant="subtitle2">FAITH FOUNDATION</Typography>
        <Typography align="center" variant="caption" display="block">Patient Registration</Typography>
        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
        <Typography variant="body2"><b>MRN:</b> {patient.mrn}</Typography>
        <Typography variant="body2"><b>Name:</b> {fullName}</Typography>
        <Typography variant="body2"><b>DOB:</b> {dob} ({patient.gender})</Typography>
        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
        <Typography variant="caption" display="block"><b>Phone:</b> {phone}</Typography>
        <Typography variant="caption" display="block"><b>NOK:</b> {patient.nokName} ({patient.nokPhone})</Typography>
        <Typography variant="caption" display="block"><b>Date:</b> {new Date().toLocaleString()}</Typography>
        <Box display="flex" justifyContent="center" mt={2} sx={{ '& svg': { height: '40px' } }}>
          <QRCodeSVG value={patient.mrn || 'UNK'} size={40} />
        </Box>
      </Box>
    );
  }

  // Determine styles for A4 templates
  const isHighContrast = template === 'reg_high_contrast';
  const isZebra = template === 'reg_zebra_striped';
  const isPediatric = template === 'reg_pediatric_theme';
  const isBlue = template === 'reg_classic_blue';
  
  const labelColor = isHighContrast ? '#000' : '#666';
  const valueColor = isHighContrast ? '#000' : '#111';
  
  const sectionTitleProps = {
    variant: "subtitle1" as const,
    fontWeight: 800,
    sx: { 
      mb: 2, 
      borderBottom: '2px solid',
      borderColor: isBlue ? '#0d47a1' : (isPediatric ? '#c2185b' : '#eee'),
      pb: 0.5,
      color: isBlue ? '#0d47a1' : (isPediatric ? '#c2185b' : 'inherit'),
      bgcolor: isZebra ? '#f9f9f9' : 'transparent',
      p: isZebra ? 1 : 0
    }
  };

  const Field = ({ label, value }: { label: string, value: string | undefined }) => (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" display="block" sx={{ color: labelColor, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: valueColor, fontWeight: 700, fontSize: '0.9rem' }}>{value || 'N/A'}</Typography>
    </Box>
  );

  return (
    <Box sx={{ 
      p: template.includes('a5') ? 2 : 4, 
      bgcolor: isHighContrast ? '#fff' : '#fafafa',
      fontFamily: template === 'reg_vip_premium' ? 'Georgia, serif' : 'Inter, sans-serif'
    }}>
      <RegistrationHeader title="PATIENT REGISTRATION RECORD" theme={template} logoLeft={logoLeft} logoRight={logoRight} />
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={template === 'reg_two_column' ? 6 : 12}>
          <Typography {...sectionTitleProps}>1. Patient Demographics</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}><Field label="Patient ID (MRN)" value={patient.mrn} /></Grid>
            <Grid item xs={12} sm={6} md={8}><Field label="Full Name" value={fullName} /></Grid>
            <Grid item xs={12} sm={4}><Field label="Date of Birth" value={dob} /></Grid>
            <Grid item xs={12} sm={4}><Field label="Gender" value={patient.gender} /></Grid>
            <Grid item xs={12} sm={4}><Field label="Marital Status" value={patient.maritalStatus} /></Grid>
            <Grid item xs={12} sm={6}><Field label="National ID (NIN)" value={patient.nin} /></Grid>
            <Grid item xs={12} sm={6}><Field label="Occupation" value={patient.occupation} /></Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={template === 'reg_two_column' ? 6 : 12}>
          <Typography {...sectionTitleProps}>2. Contact Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><Field label="Primary Phone" value={phone} /></Grid>
            <Grid item xs={12} sm={6}><Field label="Email Address" value={patient.telecoms?.find((t: any) => t.system === 'email')?.value} /></Grid>
            <Grid item xs={12}><Field label="Residential Address" value={address} /></Grid>
            <Grid item xs={12} sm={6}><Field label="Town / City" value={patient.addresses?.[0]?.city} /></Grid>
            <Grid item xs={12} sm={6}><Field label="State / Province" value={patient.addresses?.[0]?.state} /></Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography {...sectionTitleProps}>3. Next of Kin (NOK)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}><Field label="Full Name" value={patient.nokName} /></Grid>
            <Grid item xs={12} sm={6}><Field label="Relationship" value={patient.nokRelationship} /></Grid>
            <Grid item xs={12} sm={6}><Field label="Phone Number" value={patient.nokPhone} /></Grid>
            <Grid item xs={12}><Field label="Address" value={patient.nokAddress} /></Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography {...sectionTitleProps}>4. Emergency Contact</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}><Field label="Full Name" value={patient.emergencyName} /></Grid>
            <Grid item xs={12} sm={6}><Field label="Relationship" value={patient.emergencyRelationship} /></Grid>
            <Grid item xs={12} sm={6}><Field label="Phone Number" value={patient.emergencyPhone} /></Grid>
            <Grid item xs={12}><Field label="Address" value={patient.emergencyAddress} /></Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Typography {...sectionTitleProps}>5. Visit & Registration Context</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}><Field label="Registration Date" value={new Date(encounter?.createdAt || patient.createdAt).toLocaleString()} /></Grid>
            <Grid item xs={12} sm={4}><Field label="Visit Type / Class" value={encounter?.class || 'AMBULATORY'} /></Grid>
            <Grid item xs={12} sm={4}><Field label="Registered By" value={encounter?.staff ? `${encounter.staff.firstName} ${encounter.staff.lastName}` : 'System Administrator'} /></Grid>
          </Grid>
        </Grid>
      </Grid>
      
      {template === 'reg_barcode_heavy' && (
        <Box display="flex" justifyContent="space-between" mt={4} sx={{ '& svg': { height: 40 } }}>
          <QRCodeSVG value={patient.mrn || 'UNK'} size={40} />
          <QRCodeSVG value={encounter?.id?.substring(0, 8) || 'N/A'} size={40} />
        </Box>
      )}

      <Box sx={{ mt: 6, pt: 3, borderTop: '1px dashed #ccc', display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="caption" display="block">Patient / Guardian Signature</Typography>
          <Box sx={{ borderBottom: '1px solid #000', width: 200, mt: 3 }}></Box>
        </Box>
        <Box>
          <Typography variant="caption" display="block">Registrar Signature</Typography>
          <Box sx={{ borderBottom: '1px solid #000', width: 200, mt: 3 }}></Box>
        </Box>
        {encounter?.approvedAt && (
          <Box textAlign="center">
            <Typography variant="caption" display="block" fontWeight={700} color="success.main">AUTHORIZED ADMIN APPROVAL</Typography>
            {encounter.approvalSignature ? (
              <Box component="img" src={encounter.approvalSignature} sx={{ height: 50, objectFit: 'contain', display: 'block', margin: '0 auto', mt: 1 }} />
            ) : (
              <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>Digitally Approved</Typography>
            )}
            <Typography variant="caption" display="block" mt={1}>{new Date(encounter.approvedAt).toLocaleString()}</Typography>
          </Box>
        )}
      </Box>

    </Box>
  );
};

export const RegistrationPrintTemplate = ({ patient, encounter, preview = false, forceTemplate, forceLogoLeft, forceLogoRight }: { patient: any, encounter?: any, preview?: boolean, forceTemplate?: string, forceLogoLeft?: string, forceLogoRight?: string }) => {
  const [template, setTemplate] = useState('reg_standard');
  const [logoLeft, setLogoLeft] = useState<string | undefined>();
  const [logoRight, setLogoRight] = useState<string | undefined>();

  useEffect(() => {
    if (preview) {
      if (forceTemplate) setTemplate(forceTemplate);
      if (forceLogoLeft) setLogoLeft(forceLogoLeft);
      if (forceLogoRight) setLogoRight(forceLogoRight);
      return;
    }

    const fetchConfig = async () => {
      try {
        const res = await api.get('/config/modules');
        if (res.data?.success) {
          const conf = res.data.data.find((c: any) => c.moduleKey === 'REGISTRATION_PRINT_TEMPLATE');
          const ll = res.data.data.find((c: any) => c.moduleKey === 'HOSPITAL_LOGO_LEFT');
          const lr = res.data.data.find((c: any) => c.moduleKey === 'HOSPITAL_LOGO_RIGHT');
          
          if (conf?.description && !forceTemplate) setTemplate(conf.description);
          if (ll?.description && !forceLogoLeft) setLogoLeft(ll.description);
          if (lr?.description && !forceLogoRight) setLogoRight(lr.description);
        }
      } catch (err) {
        console.error('Failed to fetch registration template config', err);
      }
    };
    fetchConfig();
  }, [preview, forceTemplate, forceLogoLeft, forceLogoRight]);

  return (
    <Box 
      className="printable-registration"
      sx={{ 
        width: '100%', 
        bgcolor: '#fff',
        color: '#000',
        '@media print': {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bgcolor: '#fff',
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          zIndex: 9999
        }
      }}
    >
      <RegistrationTemplateFactory patient={patient} encounter={encounter} template={template} logoLeft={logoLeft} logoRight={logoRight} />
    </Box>
  );
};
