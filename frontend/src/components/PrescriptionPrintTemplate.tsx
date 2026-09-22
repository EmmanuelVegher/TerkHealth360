import React, { useState, useEffect } from 'react';
import { assetUrl } from '../utils/assetUrl';
import { Box, Typography, Divider, Grid } from '@mui/material';
import { api } from '../services/api';

// --- Hook: Load hospital info from backend config ---
const useHospitalInfo = () => {
  const [info, setInfo] = useState({
    name: 'FAITH FOUNDATION PHARMACY',
    address: 'No. 20 Ogurugu Road Nsukka, Enugu State',
    email: '',
    phone: '',
  });

  useEffect(() => {
    api.get('/config/modules').then(res => {
      if (res.data?.success) {
        const configs = res.data.data;
        const get = (key: string) => configs.find((c: any) => c.moduleKey === key)?.description;
        const name = get('HOSPITAL_NAME');
        const address = get('HOSPITAL_ADDRESS');
        const email = get('HOSPITAL_EMAIL');
        const phone = get('HOSPITAL_PHONE');
        setInfo(prev => ({
          ...prev,
          ...(name ? { name: `${name.toUpperCase()} - PHARMACY` } : {}),
          ...(address ? { address } : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
        }));
      }
    }).catch(console.error);
  }, []);

  return info;
};

// --- Shared Pharmacy Header ---
const PharmacyHeader = ({ title, theme, logoLeft, logoRight }: { title: string, theme: string, logoLeft?: string, logoRight?: string }) => {
  const hospitalInfo = useHospitalInfo();
  let color = '#2e7d32';
  if (theme === 'rx_classic_blue') color = '#1976d2';
  if (theme === 'rx_high_contrast') color = '#000000';
  if (theme === 'rx_pediatric_theme') color = '#f50057';
  
  return (
    <Box display="flex" justifyContent="center" alignItems="center" mb={2} sx={{ borderBottom: theme === 'rx_modern_minimalist' ? 'none' : `2px solid ${color}`, pb: 1, position: 'relative' }}>
      <img src={assetUrl(logoLeft || "/anglican-logo.png")} alt="Logo Left" style={{ position: 'absolute', left: 0, height: 50, objectFit: 'contain' }} />
      <Box textAlign="center">
        <Typography variant="h5" fontWeight={900} sx={{ color, letterSpacing: 1 }}>
          {theme === 'rx_pediatric_theme' ? `🧸 ${hospitalInfo.name} CHILDREN'S` : hospitalInfo.name}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {hospitalInfo.address}
        </Typography>
        {(hospitalInfo.phone || hospitalInfo.email) && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {hospitalInfo.phone && `Tel: ${hospitalInfo.phone}`}{hospitalInfo.phone && hospitalInfo.email ? '  |  ' : ''}{hospitalInfo.email && `Email: ${hospitalInfo.email}`}
          </Typography>
        )}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, textDecoration: theme === 'rx_modern_minimalist' ? 'none' : 'underline' }}>
          {title}
        </Typography>
      </Box>
      <img src={assetUrl(logoRight || "/hospital-logo.png")} alt="Logo Right" style={{ position: 'absolute', right: 0, height: 50, borderRadius: '50%', objectFit: 'contain' }} />
    </Box>
  );
};

// --- Pharmacy Dynamic Factory Engine ---
const PharmacyTemplateFactory = ({ prescription, template, logoLeft, logoRight }: { prescription: any, template: string, logoLeft?: string, logoRight?: string }) => {
  const isThermal = template.includes('thermal');
  const isLabel = template.includes('label');
  
  if (isThermal) {
    const is58mm = template === 'rx_thermal_58mm_narrow';
    const isCentered = template === 'rx_thermal_centered';
    const isCompact = template === 'rx_thermal_compact';
    const isDetailed = template === 'rx_thermal_detailed';

    return (
      <Box sx={{ 
        width: is58mm ? '58mm' : '80mm', 
        margin: '0 auto', 
        fontFamily: 'monospace', 
        fontSize: is58mm ? '10px' : '12px',
        textAlign: isCentered ? 'center' : 'left'
      }}>
        <Box textAlign="center" mb={isCompact ? 0.5 : 2}>
          <Typography variant="subtitle2" fontWeight={800}>FFMH PHARMACY</Typography>
          <Typography fontSize={is58mm ? '9px' : '10px'}>Nsukka, Enugu State</Typography>
          <Typography fontSize={is58mm ? '9px' : '10px'}>Date: {new Date().toLocaleString()}</Typography>
        </Box>
        <Divider sx={{ borderStyle: 'dashed', my: isCompact ? 0.5 : 1 }} />
        <Typography fontSize={is58mm ? '9px' : '10px'} textAlign={isCentered ? 'center' : 'left'}>
          Patient: {prescription?.patient?.firstName} {prescription?.patient?.lastName}
        </Typography>
        <Divider sx={{ borderStyle: 'dashed', my: isCompact ? 0.5 : 1 }} />
        
        {prescription?.items?.map((item: any) => (
          <Box key={item.id} mb={isCompact ? 0.5 : 1}>
            <Typography fontSize={is58mm ? '10px' : '11px'} fontWeight={700}>{item.medication?.brandName || item.medication?.genericName || item.medication?.itemCode || item.drug?.genericName || item.medicationName}</Typography>
            <Typography fontSize={is58mm ? '9px' : '10px'}>Qty: {item.quantity} | Sig: {item.dosage} {item.frequency}</Typography>
            {!isCompact && <Typography fontSize={is58mm ? '9px' : '10px'}>For: {item.duration}</Typography>}
          </Box>
        ))}
        
        <Divider sx={{ borderStyle: 'dashed', my: isCompact ? 0.5 : 1 }} />
        
        {isDetailed && (
          <Box mb={2}>
            <Typography fontSize="9px">Returns Policy: Goods received in good condition cannot be returned after 24 hours.</Typography>
          </Box>
        )}
        
        <Typography textAlign="center" fontSize={is58mm ? '9px' : '10px'}>Get Well Soon!</Typography>
      </Box>
    );
  }

  if (isLabel) {
    const isMultiGrid = template === 'rx_multi_label_grid';
    const LabelSticker = ({ item }: { item: any }) => (
      <Box sx={{ 
        width: isMultiGrid ? '100%' : '4in', 
        height: isMultiGrid ? 'auto' : '2in',
        border: '1px solid #000',
        borderRadius: 2,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        bgcolor: '#fff',
        pageBreakInside: 'avoid'
      }}>
        <Box display="flex" justifyContent="space-between">
          <Typography fontWeight="bold" fontSize="12px">FFMH PHARMACY</Typography>
          <Typography fontSize="10px">{new Date().toLocaleDateString()}</Typography>
        </Box>
        <Typography fontWeight="bold" fontSize="14px" mt={1}>{prescription?.patient?.firstName} {prescription?.patient?.lastName}</Typography>
        <Typography fontWeight="bold" fontSize="16px" sx={{ textDecoration: 'underline' }}>{item.medication?.brandName || item.medication?.genericName || item.medication?.itemCode || item.drug?.genericName || item.medicationName}</Typography>
        <Typography fontSize="14px" fontWeight={800} color="#d32f2f">TAKE: {item.dosage} {item.frequency}</Typography>
        <Typography fontSize="10px" mt={1}>Qty: {item.quantity} | Keep out of reach of children.</Typography>
      </Box>
    );

    if (isMultiGrid) {
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {prescription?.items?.map((item: any) => <LabelSticker key={item.id} item={item} />)}
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {prescription?.items?.map((item: any) => <LabelSticker key={item.id} item={item} />)}
      </Box>
    );
  }

  // A4 / A5 Pad Formats
  const isMinimalist = template === 'rx_modern_minimalist';
  const isZebra = template === 'rx_zebra_striped';
  const is2Col = template === 'rx_two_column';
  const isPad = template === 'rx_pad_a5';
  const isCalendar = template === 'rx_dosage_calendar';
  const isDischarge = template === 'rx_discharge_summary';
  const isBold = template === 'rx_instructions_bold';
  const isBilingual = template === 'rx_bilingual';
  const isPediatric = template === 'rx_pediatric_theme';
  const isHighContrast = template === 'rx_high_contrast';

  const headerColor = isHighContrast ? '#fff' : (template === 'rx_classic_blue' ? '#e3f2fd' : (isPediatric ? '#fce4ec' : '#f1f1f1'));
  const headerTextColor = isHighContrast ? '#000' : (template === 'rx_classic_blue' ? '#0d47a1' : (isPediatric ? '#c2185b' : '#000'));
  const borderStyle = isMinimalist ? 'none' : (isHighContrast ? '2px solid #000' : '1px solid #ccc');

  return (
    <Box sx={{ position: 'relative', width: isPad ? '148mm' : '100%', minHeight: isPad ? '210mm' : 'auto', p: isPad ? 2 : 0, bgcolor: isHighContrast ? '#000' : '#fff', color: isHighContrast ? '#fff' : '#000' }}>
      
      {/* Background Watermark for Pad */}
      {isPad && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.05, zIndex: 0, pointerEvents: 'none' }}>
          <Typography sx={{ fontSize: '200px', fontWeight: 'bold' }}>Rx</Typography>
        </Box>
      )}

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <PharmacyHeader title={isDischarge ? "DISCHARGE MEDICATION SUMMARY" : "PRESCRIPTION DISPENSARY LOG"} theme={template} logoLeft={logoLeft} logoRight={logoRight} />
        
        <Box mb={isDischarge ? 4 : 2} display="flex" justifyContent="space-between">
          <Box>
            <Typography variant="body2"><strong>Patient Name:</strong> {prescription?.patient?.firstName} {prescription?.patient?.lastName}</Typography>
            <Typography variant="body2"><strong>Date:</strong> {new Date().toLocaleDateString()}</Typography>
          </Box>
          {isPad && (
            <Box>
              <Typography variant="h2" fontWeight="bold" sx={{ fontFamily: 'serif', color: '#666' }}>Rx</Typography>
            </Box>
          )}
        </Box>

        {isDischarge && (
          <Box mb={3} p={2} border="1px solid #000" bgcolor="#f9f9f9">
            <Typography variant="subtitle2" fontWeight="bold">Doctor's Notes:</Typography>
            <Box sx={{ borderBottom: '1px dotted #000', mt: 2, width: '100%' }}></Box>
            <Box sx={{ borderBottom: '1px dotted #000', mt: 3, width: '100%' }}></Box>
          </Box>
        )}

        {is2Col ? (
          <Box sx={{ columnCount: 2, columnGap: '40px' }}>
            {prescription?.items?.map((item: any) => (
              <Box key={item.id} mb={3} sx={{ breakInside: 'avoid', borderBottom: '1px dashed #ccc', pb: 1 }}>
                <Typography fontWeight="bold" fontSize="14px">{item.medication?.brandName || item.medication?.genericName || item.medication?.itemCode || item.drug?.genericName || item.medicationName}</Typography>
                <Typography fontSize="12px" color="text.secondary">Take: {item.dosage} {item.frequency}</Typography>
                <Typography fontSize="12px" color="text.secondary">For: {item.duration} | Qty: {item.quantity}</Typography>
              </Box>
            ))}
          </Box>
        ) : isCalendar ? (
          <Box>
             {prescription?.items?.map((item: any) => (
                <Box key={item.id} mb={2} p={2} border="1px solid #ddd" borderRadius={2}>
                  <Typography fontWeight="bold">{item.medication?.brandName || item.medication?.genericName || item.medication?.itemCode || item.drug?.genericName || item.medicationName}</Typography>
                  <Grid container spacing={1} mt={1}>
                    {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => {
                      const isActive = item.frequency.toUpperCase().includes('TDS') && time !== 'Night' || 
                                       item.frequency.toUpperCase().includes('BD') && (time === 'Morning' || time === 'Evening') ||
                                       item.frequency.toUpperCase().includes('OD') && time === 'Morning';
                      return (
                        <Grid item xs={3} key={time}>
                          <Box textAlign="center" p={1} bgcolor={isActive ? '#4caf50' : '#f5f5f5'} color={isActive ? '#fff' : '#ccc'} borderRadius={1}>
                            <Typography fontSize="10px" fontWeight="bold">{time}</Typography>
                            {isActive && <Typography fontSize="14px" fontWeight="bold">{item.dosage}</Typography>}
                          </Box>
                        </Grid>
                      )
                    })}
                  </Grid>
                </Box>
             ))}
          </Box>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: headerColor, color: headerTextColor }}>
                <th style={{ border: borderStyle, padding: '10px', textAlign: 'left' }}>Medication (Generic Name)</th>
                <th style={{ border: borderStyle, padding: '10px', textAlign: 'left' }}>Dosage & Frequency</th>
                <th style={{ border: borderStyle, padding: '10px', textAlign: 'left' }}>Duration</th>
                <th style={{ border: borderStyle, padding: '10px', textAlign: 'left' }}>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {prescription?.items?.map((item: any, index: number) => {
                const isStriped = isZebra && index % 2 !== 0;
                return (
                  <tr key={item.id} style={{ backgroundColor: isStriped ? (isHighContrast ? '#333' : '#fafafa') : 'transparent' }}>
                    <td style={{ border: borderStyle, padding: '10px', fontWeight: isBold ? 700 : 400 }}>
                      {item.medication?.brandName || item.medication?.genericName || item.medication?.itemCode || item.drug?.genericName || item.medicationName}
                      {isBilingual && <Typography fontSize="10px" color="text.secondary" display="block">Medicamento</Typography>}
                    </td>
                    <td style={{ border: borderStyle, padding: '10px' }}>
                      <Typography fontWeight={isBold ? 900 : 400} fontSize={isBold ? '16px' : '14px'}>{item.dosage} {item.frequency}</Typography>
                      {isBilingual && <Typography fontSize="10px" color="text.secondary">Tomar {item.dosage} {item.frequency}</Typography>}
                    </td>
                    <td style={{ border: borderStyle, padding: '10px' }}>{item.duration}</td>
                    <td style={{ border: borderStyle, padding: '10px', fontWeight: 'bold' }}>{item.quantity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

      </Box>
    </Box>
  );
};

export const PrescriptionPrintTemplate = ({ prescription, preview = false, forceTemplate, forceLogoLeft, forceLogoRight }: { prescription: any, preview?: boolean, forceTemplate?: string, forceLogoLeft?: string, forceLogoRight?: string }) => {
  const [template, setTemplate] = useState('standard');
  const [logoLeft, setLogoLeft] = useState<string | undefined>();
  const [logoRight, setLogoRight] = useState<string | undefined>();
  
  useEffect(() => {
    api.get('/config/modules').then(res => {
      if (res.data?.success) {
        const conf = res.data.data.find((c: any) => c.moduleKey === 'PHARMACY_PRINT_TEMPLATE');
        const lConf = res.data.data.find((c: any) => c.moduleKey === 'HOSPITAL_LOGO_LEFT');
        const rConf = res.data.data.find((c: any) => c.moduleKey === 'HOSPITAL_LOGO_RIGHT');
        
        if (conf?.description && !forceTemplate) setTemplate(conf.description);
        if (lConf?.description && !forceLogoLeft) {
          const url = lConf.description.startsWith('http') ? lConf.description : lConf.description;
          setLogoLeft(url);
        }
        if (rConf?.description && !forceLogoRight) {
          const url = rConf.description.startsWith('http') ? rConf.description : rConf.description;
          setLogoRight(url);
        }
      }
    }).catch(console.error);

    if (forceTemplate) setTemplate(forceTemplate);
  }, [forceTemplate]);

  // Override with directly passed logos immediately (for live preview)
  const effectiveLogoLeft = forceLogoLeft || logoLeft;
  const effectiveLogoRight = forceLogoRight || logoRight;

  if (!prescription) return null;

  return (
    <div className={preview ? 'preview-pharmacy-report' : 'printable-pharmacy-report'} style={{ 
      display: preview ? 'block' : 'none',
      backgroundColor: template === 'rx_high_contrast' ? '#000' : '#fff',
      padding: preview ? '10px' : '0',
      transform: preview ? 'scale(0.8)' : 'none',
      transformOrigin: 'top center',
      boxShadow: preview ? '0 0 10px rgba(0,0,0,0.1)' : 'none'
    }}>
      <style>
        {`
          ${preview ? '' : '@media print {'}
            .${preview ? 'preview-pharmacy-report' : 'printable-pharmacy-report'} { display: block !important; }
          ${preview ? '' : '}'}
        `}
      </style>
      <PharmacyTemplateFactory prescription={prescription} template={template} logoLeft={effectiveLogoLeft} logoRight={effectiveLogoRight} />
    </div>
  );
};
