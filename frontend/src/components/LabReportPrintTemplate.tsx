import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';

// --- Hook: Load hospital info from backend config ---
const useHospitalInfo = () => {
  const [info, setInfo] = useState({
    name: 'FAITH FOUNDATION',
    subName: 'MISSION HOSPITAL NSUKKA',
    address: 'No. 20 Ogurugu Road Nsukka, Enugu State, Nigeria',
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
          ...(name ? { name: name.toUpperCase(), subName: '' } : {}),
          ...(address ? { address } : {}),
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
        }));
      }
    }).catch(console.error);
  }, []);

  return info;
};

// --- Shared Header ---
export const PrintHeader = ({ order, theme, logoLeft, logoRight }: { order: any, theme?: string, logoLeft?: string, logoRight?: string }) => {
  const hospitalInfo = useHospitalInfo();
  const getThemeColor = () => {
    switch(theme) {
      case 'lims_corporate_blue': return '#1976d2';
      case 'lims_corporate_green': return '#2e7d32';
      case 'lims_theme_ruby': return '#c62828';
      case 'lims_theme_ocean': return '#006064';
      case 'lims_high_contrast': return '#000000';
      default: return '#1e2a78';
    }
  };
  const color = getThemeColor();

  return (
    <Box display="flex" justifyContent="center" alignItems="center" mb={2} sx={{ borderBottom: `3px solid ${color}`, borderTop: `6px solid ${color}`, pb: 1, pt: 1, position: 'relative' }}>
      <img src={logoLeft || "/anglican-logo.png"} alt="Logo Left" style={{ position: 'absolute', left: 0, height: 60, objectFit: 'contain' }} />
      <Box textAlign="center">
        <Typography variant="h4" fontWeight={900} sx={{ color, letterSpacing: 1, fontFamily: 'Times New Roman, serif' }}>
          {hospitalInfo.name}
        </Typography>
        {hospitalInfo.subName && (
          <Typography variant="h5" fontWeight={900} sx={{ color: theme === 'lims_high_contrast' ? '#000' : '#c41d1d', letterSpacing: 0.5, fontFamily: 'Times New Roman, serif' }}>
            {hospitalInfo.subName}
          </Typography>
        )}
        <Typography variant="body1" sx={{ fontWeight: 600, color: theme === 'lims_high_contrast' ? '#000' : 'inherit' }}>
          {hospitalInfo.address}
        </Typography>
        {(hospitalInfo.phone || hospitalInfo.email) && (
          <Typography variant="body2" sx={{ color: theme === 'lims_high_contrast' ? '#000' : 'inherit' }}>
            {hospitalInfo.phone && `Tel: ${hospitalInfo.phone}`}{hospitalInfo.phone && hospitalInfo.email ? '  |  ' : ''}{hospitalInfo.email && `Email: ${hospitalInfo.email}`}
          </Typography>
        )}
      </Box>
      <Box sx={{ position: 'absolute', right: 70, top: 5, textAlign: 'center' }}>
        <QRCodeSVG value={`${window.location.origin}/verify/lab/${order.id}`} size={50} />
        <Typography variant="caption" sx={{ display: 'block', fontSize: '8px', mt: 0.5 }}>Scan to Verify</Typography>
      </Box>
      <img src={logoRight || "/hospital-logo.png"} alt="Logo Right" style={{ position: 'absolute', right: 0, height: 60, borderRadius: '50%', border: `2px solid ${color}`, objectFit: 'contain' }} />
    </Box>
  );
};

// --- Legacy Faith Foundation Template ---
const FaithFoundationTemplate = ({ order, p, logoLeft, logoRight }: { order: any, p: any, logoLeft?: string, logoRight?: string }) => {
  const getResultItem = (testName: string) => {
    return order.items?.find((i: any) => {
      const tName = (i.test?.testName || i.testName || '').toLowerCase();
      const tCode = (i.test?.testCode || i.testCode || '').toLowerCase();
      const target = testName.toLowerCase();
      return tName.includes(target) || tCode === target;
    });
  };

  const getResult = (testName: string) => {
    const item = getResultItem(testName);
    if (!item) return '';
    return item.result?.resultValue || '☑ [ ✓ ]';
  };

  const renderedTestIds = new Set<string>();
  const markRendered = (testName: string) => {
    const item = getResultItem(testName);
    if (item) {
      const key = item.id || item.test?.testName || item.testName || testName;
      renderedTestIds.add(key);
      if (item.result?.resultValue) {
        return item.result.resultValue;
      }
      return '☑ [ ✓ ]';
    }
    return '';
  };

  const getMarkedResult = (testName: string) => markRendered(testName);

  const widalParams = ['widal_o_d', 'widal_h_d', 'widal_o_a', 'widal_h_a', 'widal_o_b', 'widal_h_b', 'widal_o_c', 'widal_h_c'];
  widalParams.forEach(p => markRendered(p));

  const uriParams = ['urinalysis_blood', 'urinalysis_urobilinogen', 'urinalysis_bilirubin', 'urinalysis_protein', 'urinalysis_ketone', 'urinalysis_glucose', 'urinalysis_ph', 'urinalysis_nitrite', 'urinalysis_ascorbic', 'urinalysis_appearance'];
  uriParams.forEach(p => markRendered(p));

  // Find all items that are NOT part of the standard pre-printed grid
  const unrenderedItems = order.items?.filter((i: any) => {
    const key = i.id || i.test?.testName || i.testName;
    return !renderedTestIds.has(key);
  }) || [];

  const isRequestOnly = !order.items?.some((i: any) => i.result?.resultValue);

  return (
    <>
      <PrintHeader order={order} logoLeft={logoLeft} logoRight={logoRight} />
      <Box display="flex" justifyContent="center" mb={1.5}>
        <Box sx={{ border: '2px solid #000', px: 3, py: 0.3 }}>
          <Typography variant="subtitle1" fontWeight={800} style={{ fontSize: '14px', letterSpacing: 0.5 }}>
            {isRequestOnly ? 'LABORATORY REQUISITION & EXTERNAL REFERRAL FORM' : 'LABORATORY RESULT'}
          </Typography>
        </Box>
      </Box>

      {/* Patient Header Table */}
      <table className="ff-table">
        <thead>
          <tr>
            <th style={{ width: '25%' }}>SURNAME</th>
            <th style={{ width: '25%' }}>OTHER NAME</th>
            <th style={{ width: '15%' }}>LAB / REF NO</th>
            <th style={{ width: '10%' }}>AGE</th>
            <th style={{ width: '10%' }}>SEX</th>
            <th style={{ width: '15%' }}>ADDRESS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ fontWeight: 'bold' }}>{p?.lastName?.toUpperCase() || ''}</td>
            <td style={{ fontWeight: 'bold' }}>{p?.firstName?.toUpperCase() || ''}</td>
            <td style={{ fontWeight: 'bold', color: '#000' }}>{order?.orderNumber || ''}</td>
            <td style={{ fontWeight: 'bold' }}>{p?.birthDate ? new Date().getFullYear() - new Date(p.birthDate).getFullYear() : ''}</td>
            <td style={{ fontWeight: 'bold' }}>{p?.gender === 'MALE' ? 'M' : p?.gender === 'FEMALE' ? 'F' : ''}</td>
            <td style={{ fontWeight: 'bold' }}>{p?.address || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* Standard Customized Test Grid */}
      <table className="ff-table">
        <tbody>
          <tr>
            <td style={{ width: '15%', fontWeight: 'bold' }}>Genotype</td><td style={{ width: '18%' }}>{getMarkedResult('genotype')}</td>
            <td style={{ width: '15%', fontWeight: 'bold' }}>Blood G.</td><td style={{ width: '18%' }}>{getMarkedResult('blood g')}</td>
            <td style={{ width: '15%', fontWeight: 'bold' }}>Rh.D</td><td style={{ width: '19%' }}>{getMarkedResult('rh')}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>M.P</td><td>{getMarkedResult('m.p') || getMarkedResult('malaria')}</td>
            <td style={{ fontWeight: 'bold' }}>ASO</td><td>{getMarkedResult('aso')}</td>
            <td style={{ fontWeight: 'bold' }}>RBS</td><td>{getMarkedResult('rbs') || getMarkedResult('random blood')}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>RVS</td><td>{getMarkedResult('rvs')}</td>
            <td style={{ fontWeight: 'bold' }}>HCV</td><td>{getMarkedResult('hcv')}</td>
            <td style={{ fontWeight: 'bold' }}>FBS</td><td>{getMarkedResult('fbs') || getMarkedResult('fasting blood')}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Wbc (total)</td><td>{getMarkedResult('wbc (total)') || getMarkedResult('wbc total')}</td>
            <td style={{ fontWeight: 'bold' }}>HBSAg</td><td>{getMarkedResult('hbsag')}</td>
            <td style={{ fontWeight: 'bold' }}>VDRL</td><td>{getMarkedResult('vdrl')}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Wbc (Diff)</td><td>{getMarkedResult('wbc (diff)')}</td>
            <td style={{ fontWeight: 'bold' }}>Hb</td><td>{getMarkedResult('hb')}</td>
            <td style={{ fontWeight: 'bold' }}>H-Pylori</td><td>{getMarkedResult('pylori')}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Esino</td><td>{getMarkedResult('esino')}</td><td></td><td></td><td></td><td></td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Neutro</td><td>{getMarkedResult('neutro')}</td>
            <td style={{ fontWeight: 'bold' }}>RF</td><td>{getMarkedResult('rf')}</td>
            <td style={{ fontWeight: 'bold' }}>Preg. Test</td><td>{getMarkedResult('preg')}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Lym</td><td>{getMarkedResult('lym')}</td>
            <td style={{ fontWeight: 'bold' }}>ESR</td><td>{getMarkedResult('esr')}</td>
            <td style={{ fontWeight: 'bold' }}>M.f(skin snip)</td><td>{getMarkedResult('skin snip')}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Mono</td><td>{getMarkedResult('mono')}</td>
            <td style={{ fontWeight: 'bold' }}>FOB</td><td>{getMarkedResult('fob')}</td>
            <td style={{ fontWeight: 'bold' }}>M.F (blood)</td><td>{getMarkedResult('m.f (blood)')}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Baso</td><td>{getMarkedResult('baso')}</td>
            <td style={{ fontWeight: 'bold' }}>PCV</td><td>{getMarkedResult('pcv')}</td>
            <td style={{ fontWeight: 'bold' }}>Mantoux Test</td><td>{getMarkedResult('mantoux')}</td>
          </tr>
        </tbody>
      </table>

      {/* Widal & Urinalysis Grid */}
      <Box display="flex" gap={1.5} mb={1}>
        <Box sx={{ width: '50%' }}>
          <Typography className="section-title" style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>WIDAL TEST</Typography>
          <table className="widal-table">
            <thead><tr><th>D</th><th>A</th><th>B</th><th>C</th></tr></thead>
            <tbody>
              <tr><td>O|H</td><td>O|H</td><td>O|H</td><td>O|H</td></tr>
              <tr>
                <td>{getResult('widal_o_d') || ''}</td><td>{getResult('widal_o_a') || ''}</td>
                <td>{getResult('widal_o_b') || ''}</td><td>{getResult('widal_o_c') || ''}</td>
              </tr>
            </tbody>
          </table>
        </Box>
        <Box sx={{ width: '50%', border: '1px solid #000', p: 0.8 }}>
          <Typography className="section-title" style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>URINALYSIS</Typography>
          <Box display="flex" flexDirection="column" gap={0.2}>
            {uriParams.map(p => (
              <div key={p} className="uri-line" style={{ fontSize: '11px' }}>
                <span className="uri-label" style={{ width: '100px' }}>{p.split('_')[1]}:</span>
                <span className="uri-value">{getResult(p)}</span>
              </div>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Additional Test Section & Write-Up (If requested test is outside customized grid) */}
      {(unrenderedItems.length > 0 || order.clinicalNotes || order.notes) && (
        <Box mt={1.5} pt={1} sx={{ borderTop: '2px dashed #000' }}>
          <Typography className="section-title" sx={{ textAlign: 'left', mb: 1, fontWeight: 'bold', fontSize: '12px' }}>
            ADDITIONAL TESTS & OUTSOURCED INVESTIGATIONS SECTION
          </Typography>
          
          {unrenderedItems.length > 0 && (
            <table className="ff-table">
              <thead>
                <tr>
                  <th style={{ width: '12%', textAlign: 'center' }}>REQUESTED</th>
                  <th style={{ width: '44%' }}>TEST NAME / INVESTIGATION</th>
                  <th style={{ width: '44%' }}>STATUS / FINDINGS</th>
                </tr>
              </thead>
              <tbody>
                {unrenderedItems.map((item: any, idx: number) => {
                  const tName = item.test?.testName || item.testName || 'External Investigation';
                  const resVal = item.result?.resultValue || (item.isExternal ? 'Outsourced (Pending Result)' : '☑ [ ✓ ] Test Requested');
                  return (
                    <tr key={item.id || idx}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>☑ [ ✓ ]</td>
                      <td style={{ fontWeight: 'bold', fontSize: '12px' }}>{tName}</td>
                      <td style={{ fontSize: '12px' }}>{resVal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {(order.clinicalNotes || order.notes) && (
            <Box mt={1} p={1} sx={{ border: '1px solid #000', backgroundColor: '#fafafa', borderRadius: '4px' }}>
              <Typography style={{ fontWeight: 'bold', fontSize: '11px', color: '#000' }}>
                📝 CLINICAL WRITE-UP & REFERRAL NOTES:
              </Typography>
              <Typography style={{ fontStyle: 'italic', fontSize: '11px', color: '#222', marginTop: '2px' }}>
                {order.clinicalNotes || order.notes}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </>
  );
};


// --- Dynamic Factory Template Engine ---
const DynamicTemplateFactory = ({ order, p, template, logoLeft, logoRight }: { order: any, p: any, template: string, logoLeft?: string, logoRight?: string }) => {
  const groupedItems = order.items?.reduce((acc: any, item: any) => {
    if (!item.result) return acc;
    const cat = item.test?.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Extract properties based on template ID
  const isMinimalist = template === 'lims_modern_minimalist';
  const isZebra = template === 'lims_zebra_striped';
  const is2Col = template === 'lims_compact_2col';
  const isCard = template === 'lims_category_cards';
  const isSpacious = template === 'lims_spacious_elegant';
  const isStrict = template === 'lims_tabular_strict';
  const isHighContrast = template === 'lims_high_contrast';
  const isClinical = template === 'lims_clinical_summary';
  const isGrid = template === 'lims_classic_grid' || isStrict;
  
  // Theming colors
  let headerBg = '#f5f5f5';
  let headerColor = '#000';
  let titleColor = '#1e2a78';
  
  if (template.includes('corporate_blue') || template === 'lims_theme_ocean') { headerBg = '#e3f2fd'; headerColor = '#0d47a1'; titleColor = '#0d47a1'; }
  if (template.includes('corporate_green') || template === 'lims_theme_pediatric') { headerBg = '#e8f5e9'; headerColor = '#1b5e20'; titleColor = '#1b5e20'; }
  if (template === 'lims_theme_ruby') { headerBg = '#ffebee'; headerColor = '#b71c1c'; titleColor = '#b71c1c'; }
  if (isHighContrast) { headerBg = '#000'; headerColor = '#fff'; titleColor = '#000'; }

  const borderStyle = isMinimalist ? 'none' : isGrid ? '1px solid #000' : '1px solid #ddd';

  // Layout structures
  if (template === 'lims_sidebar_info') {
    return (
      <Box display="flex" gap={4}>
        <Box width="30%" borderRight="2px solid #000" pr={2}>
          <PrintHeader order={order} theme={template} logoLeft={logoLeft} logoRight={logoRight} />
          <Typography variant="h6" fontWeight="bold" mt={4} mb={2}>PATIENT INFO</Typography>
          <Typography><strong>Name:</strong><br/>{p?.lastName}, {p?.firstName}</Typography><br/>
          <Typography><strong>Age/Sex:</strong><br/>{p?.birthDate ? new Date().getFullYear() - new Date(p.birthDate).getFullYear() : ''} / {p?.gender}</Typography><br/>
          <Typography><strong>Lab No:</strong><br/>{order?.orderNumber}</Typography><br/>
          <Typography><strong>Date:</strong><br/>{new Date(order?.createdAt).toLocaleDateString()}</Typography>
        </Box>
        <Box width="70%" pl={2}>
          <Typography variant="h4" fontWeight="bold" mb={4} color={titleColor}>LABORATORY RESULTS</Typography>
          {groupedItems && Object.keys(groupedItems).map((category) => (
            <Box key={category} mb={4}>
              <Typography sx={{ fontWeight: 'bold', borderBottom: `2px solid ${titleColor}`, mb: 1, textTransform: 'uppercase', color: titleColor, fontSize: '18px' }}>
                {category}
              </Typography>
              {groupedItems[category].map((item: any) => (
                <Box key={item.id} display="flex" justifyContent="space-between" borderBottom="1px solid #eee" py={1}>
                  <Typography width="40%" fontWeight={500}>{item.test?.testName}</Typography>
                  <Typography width="30%"><strong>{item.result?.resultValue}</strong> {item.result?.resultUnit}</Typography>
                  <Typography width="30%" color="text.secondary" textAlign="right">{item.test?.referenceRange || '-'}</Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: isSpacious ? 4 : 0 }}>
      {template !== 'lims_letterhead_centered' && <PrintHeader order={order} theme={template} logoLeft={logoLeft} logoRight={logoRight} />}
      
      {template === 'lims_letterhead_centered' && (
        <Box textAlign="center" mb={4} borderBottom="3px solid #000" pb={2} position="relative">
          <img src={logoLeft || "/anglican-logo.png"} alt="Logo Left" style={{ position: 'absolute', left: 0, top: 0, height: 60, objectFit: 'contain' }} />
          <img src={logoRight || "/hospital-logo.png"} alt="Logo Right" style={{ position: 'absolute', right: 0, top: 0, height: 60, objectFit: 'contain' }} />
          <Typography variant="h3" fontWeight={900}>FAITH FOUNDATION HOSPITAL</Typography>
          <Typography variant="subtitle1">No. 20 Ogurugu Road Nsukka, Enugu State, Nigeria</Typography>
          <Box mt={2}><QRCodeSVG value={`${window.location.origin}/verify/lab/${order.id}`} size={60} /></Box>
        </Box>
      )}

      {template === 'lims_qr_focused' && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} p={2} border="4px solid #1e2a78" borderRadius={2}>
          <Box>
            <Typography variant="h4" fontWeight={900} color="#1e2a78">LABORATORY RESULT</Typography>
            <Typography variant="subtitle1" color="text.secondary">Scan QR code to verify authenticity instantly.</Typography>
          </Box>
          <QRCodeSVG value={`${window.location.origin}/verify/lab/${order.id}`} size={100} />
        </Box>
      )}

      {template !== 'lims_qr_focused' && (
        <Box display="flex" justifyContent="center" mb={isSpacious ? 4 : 2}>
          <Box sx={{ border: isMinimalist ? 'none' : '2px solid #000', px: 3, py: 0.5, bgcolor: isHighContrast ? '#000' : 'transparent', color: isHighContrast ? '#fff' : 'inherit' }}>
            <Typography variant={isSpacious ? 'h5' : 'subtitle1'} fontWeight={700}>LABORATORY RESULT</Typography>
          </Box>
        </Box>
      )}

      <table style={{ marginBottom: isSpacious ? '40px' : '30px', width: '100%', borderCollapse: 'collapse', border: borderStyle }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 'bold', width: '20%', border: borderStyle, padding: '8px', backgroundColor: headerBg, color: headerColor }}>Patient Name:</td>
            <td style={{ width: '30%', border: borderStyle, padding: '8px' }}>{p?.lastName}, {p?.firstName}</td>
            <td style={{ fontWeight: 'bold', width: '20%', border: borderStyle, padding: '8px', backgroundColor: headerBg, color: headerColor }}>Lab Number:</td>
            <td style={{ width: '30%', border: borderStyle, padding: '8px' }}>{order?.orderNumber}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', border: borderStyle, padding: '8px', backgroundColor: headerBg, color: headerColor }}>Age/Sex:</td>
            <td style={{ border: borderStyle, padding: '8px' }}>{p?.birthDate ? new Date().getFullYear() - new Date(p.birthDate).getFullYear() : ''} yrs / {p?.gender}</td>
            <td style={{ fontWeight: 'bold', border: borderStyle, padding: '8px', backgroundColor: headerBg, color: headerColor }}>Date Ordered:</td>
            <td style={{ border: borderStyle, padding: '8px' }}>{new Date(order?.createdAt).toLocaleDateString()}</td>
          </tr>
        </tbody>
      </table>

      {is2Col ? (
        <Box sx={{ columnCount: 2, columnGap: '40px' }}>
          {groupedItems && Object.keys(groupedItems).map((category) => (
            <Box key={category} mb={3} sx={{ breakInside: 'avoid' }}>
              <Typography sx={{ fontWeight: 'bold', borderBottom: `2px solid ${titleColor}`, mb: 1, color: titleColor }}>{category}</Typography>
              {groupedItems[category].map((item: any) => (
                <Box key={item.id} display="flex" justifyContent="space-between" borderBottom="1px dashed #ccc" py={0.5} fontSize="12px">
                  <span style={{ fontWeight: 600 }}>{item.test?.testName}</span>
                  <span><strong>{item.result?.resultValue}</strong> {item.result?.resultUnit}</span>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={isCard ? 3 : 0}>
          {groupedItems && Object.keys(groupedItems).map((category) => (
            <Box key={category} mb={isSpacious ? 4 : 3} sx={{ border: isCard ? '1px solid #ccc' : 'none', borderRadius: isCard ? 2 : 0, p: isCard ? 2 : 0, boxShadow: isCard ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
              <Typography sx={{ fontWeight: 'bold', borderBottom: isCard ? 'none' : `2px solid ${titleColor}`, mb: isSpacious ? 2 : 1, textTransform: 'uppercase', color: titleColor, fontSize: isSpacious ? '18px' : '14px' }}>
                {category}
              </Typography>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: isCard ? 'none' : borderStyle }}>
                <thead>
                  <tr style={{ backgroundColor: headerBg, color: headerColor }}>
                    <th style={{ width: '40%', border: borderStyle, padding: isSpacious ? '12px' : '8px', textAlign: 'left' }}>Test Parameter</th>
                    <th style={{ width: '30%', border: borderStyle, padding: isSpacious ? '12px' : '8px', textAlign: 'left' }}>Result Value</th>
                    <th style={{ width: '30%', border: borderStyle, padding: isSpacious ? '12px' : '8px', textAlign: 'left' }}>Reference Range</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedItems[category].map((item: any, index: number) => {
                    // Check if result is abnormal based on simple regex for demonstration (if isClinical)
                    const isAbnormal = isClinical && item.test?.referenceRange && !item.test?.referenceRange.includes(item.result?.resultValue);
                    const rowBg = isZebra && index % 2 !== 0 ? '#fafafa' : isAbnormal ? '#ffebee' : 'transparent';
                    
                    return (
                      <tr key={item.id} style={{ backgroundColor: rowBg }}>
                        <td style={{ border: borderStyle, padding: isSpacious ? '12px' : '8px', fontWeight: isAbnormal ? 700 : 500, color: isAbnormal ? '#d32f2f' : 'inherit' }}>{item.test?.testName}</td>
                        <td style={{ border: borderStyle, padding: isSpacious ? '12px' : '8px', color: isAbnormal ? '#d32f2f' : 'inherit' }}>
                          <strong style={{ fontSize: isSpacious ? '16px' : 'inherit' }}>{item.result?.resultValue}</strong> {item.result?.resultUnit}
                          {isAbnormal && <span style={{ marginLeft: '8px', color: '#d32f2f', fontWeight: 'bold' }}>*</span>}
                        </td>
                        <td style={{ border: borderStyle, padding: isSpacious ? '12px' : '8px', color: isHighContrast ? '#fff' : '#666' }}>{item.test?.referenceRange || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};


// --- Main Exported Component ---
export const LabReportPrintTemplate = ({ order, preview = false, forceTemplate, forceLogoLeft, forceLogoRight }: { order: any, preview?: boolean, forceTemplate?: string, forceLogoLeft?: string, forceLogoRight?: string }) => {
  const [template, setTemplate] = useState('standard_dynamic');
  const [logoLeft, setLogoLeft] = useState<string | undefined>();
  const [logoRight, setLogoRight] = useState<string | undefined>();
  
  useEffect(() => {
    api.get('/config/modules').then(res => {
      if (res.data?.success) {
        const conf = res.data.data.find((c: any) => c.moduleKey === 'LIMS_PRINT_TEMPLATE');
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

  if (!order) return null;

  return (
    <div className={preview ? 'preview-lab-report' : 'printable-lab-report'} style={{ 
      display: preview ? 'block' : 'none',
      fontFamily: template === 'lims_modern_minimalist' ? 'Inter, sans-serif' : template === 'lims_tabular_strict' ? 'Courier New, monospace' : 'Arial, sans-serif',
      color: '#000',
      padding: preview ? '10px' : '20px 40px',
      width: template.includes('a5') ? '148mm' : '100%',
      height: template.includes('a5') ? '210mm' : 'auto',
      boxSizing: 'border-box',
      backgroundColor: template === 'lims_theme_pediatric' ? '#fffdf7' : '#fff',
      transform: preview ? 'scale(0.8)' : 'none',
      transformOrigin: 'top left',
      overflow: 'hidden'
    }}>
      <style>
        {`
          @page {
            size: A4 portrait;
            margin: 10mm 15mm 10mm 15mm;
          }
          ${preview ? '' : '@media print {'}
            body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
            .${preview ? 'preview-lab-report' : 'printable-lab-report'} { display: block !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 auto !important; box-sizing: border-box !important; }
            .${preview ? 'preview-lab-report' : 'printable-lab-report'} .ff-table { width: 100% !important; border-collapse: collapse !important; margin-bottom: 12px !important; box-sizing: border-box !important; table-layout: fixed !important; }
            .${preview ? 'preview-lab-report' : 'printable-lab-report'} .ff-table th, .${preview ? 'preview-lab-report' : 'printable-lab-report'} .ff-table td { border: 1px solid #000 !important; padding: 4px 6px !important; text-align: left !important; font-size: 12px !important; word-break: break-word !important; }
            .${preview ? 'preview-lab-report' : 'printable-lab-report'} .ff-table th { font-weight: bold !important; background-color: #fafafa !important; }
            .${preview ? 'preview-lab-report' : 'printable-lab-report'} .widal-table td, .${preview ? 'preview-lab-report' : 'printable-lab-report'} .widal-table th { text-align: center !important; border: 1px solid #000 !important; padding: 3px !important; font-size: 11px !important; }
            .${preview ? 'preview-lab-report' : 'printable-lab-report'} .widal-table { width: 100% !important; border-collapse: collapse !important; box-sizing: border-box !important; }
            .${preview ? 'preview-lab-report' : 'printable-lab-report'} .uri-line { display: flex !important; margin-bottom: 4px !important; font-size: 11px !important; }
            .${preview ? 'preview-lab-report' : 'printable-lab-report'} .uri-label { font-weight: bold !important; width: 100px !important; }
            .${preview ? 'preview-lab-report' : 'printable-lab-report'} .uri-value { flex-grow: 1 !important; border-bottom: 1px solid #000 !important; }
          ${preview ? '' : '}'}
        `}
      </style>

      {template === 'lims_legacy_faith' ? (
        <FaithFoundationTemplate order={order} p={order.patient} logoLeft={effectiveLogoLeft} logoRight={effectiveLogoRight} />
      ) : (
        <DynamicTemplateFactory order={order} p={order.patient} template={template} logoLeft={effectiveLogoLeft} logoRight={effectiveLogoRight} />
      )}
      
    </div>
  );
};
