import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox } from '@mui/material';

interface AncCardPrintTemplateProps {
  patient: any;
  maternityProfile?: any;
  activePregnancy?: any;
  preview?: boolean;
  forceTemplate?: string;
  forceLogoLeft?: string;
  forceLogoRight?: string;
}

export const AncCardPrintTemplate: React.FC<AncCardPrintTemplateProps> = ({
  patient,
  maternityProfile,
  activePregnancy,
  preview = false,
  forceTemplate = 'anc_faith_foundation_replica',
  forceLogoLeft = '/anglican-logo.png',
  forceLogoRight = '/hospital-logo.png',
}) => {
  // Parse customFields if stored as JSON string
  const getCustomFields = (source: any) => {
    if (!source || !source.customFields) return {};
    try {
      return JSON.parse(source.customFields);
    } catch (e) {
      return {};
    }
  };

  const profileCustom = getCustomFields(maternityProfile);
  const pregnancyCustom = getCustomFields(activePregnancy);

  // Helper to render fake checkbox with label
  const CheckBoxField = ({ label, checked }: { label: string; checked: boolean }) => (
    <Box display="inline-flex" alignItems="center" gap={0.5} sx={{ mr: 2 }}>
      <span style={{ 
        display: 'inline-block', 
        width: '12px', 
        height: '12px', 
        border: '1.5px solid #000', 
        textAlign: 'center', 
        lineHeight: '10px', 
        fontSize: '10px',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        backgroundColor: checked ? '#f0f0f0' : 'transparent'
      }}>
        {checked ? 'X' : ' '}
      </span>
      <span style={{ fontSize: '11px', fontFamily: '"Times New Roman", Times, serif' }}>{label}</span>
    </Box>
  );

  // 1. FAITH FOUNDATION REPLICA
  const renderReplica = () => {
    return (
      <Box sx={{ 
        bgcolor: '#fff', 
        color: '#000', 
        p: 2, 
        fontFamily: '"Times New Roman", Times, serif',
        border: '2px solid #000',
        maxWidth: '800px',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        {/* Banner Headers */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ borderBottom: '3px double #000', pb: 1, mb: 1 }}>
          <Box sx={{ width: '70px', height: '70px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src={forceLogoLeft} alt="Logo Left" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </Box>
          <Box textAlign="center" flex={1} sx={{ px: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '20px', letterSpacing: '1px', lineHeight: 1.2 }}>
              FAITH FOUNDATION
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: '18px', letterSpacing: '1px', lineHeight: 1.2 }}>
              MISSION HOSPITAL NSUKKA
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '11px', fontStyle: 'italic' }}>
              No. 20 Ogurugu Road Nsukka, Enugu State, Nigeria
            </Typography>
          </Box>
          <Box sx={{ width: '70px', height: '70px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src={forceLogoRight} alt="Logo Right" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </Box>
        </Box>

        {/* Heading title */}
        <Box textAlign="center" sx={{ mb: 2 }}>
          <span style={{ 
            border: '1.5px solid #000', 
            padding: '2px 15px', 
            fontWeight: 'bold', 
            fontSize: '14px',
            letterSpacing: '1.5px'
          }}>
            ANTENAL CARD
          </span>
        </Box>

        {/* Main Grid structure mirroring the physical form exactly */}
        <style dangerouslySetInnerHTML={{__html: `
          .anc-grid {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .anc-grid td {
            border: 1px solid #000;
            padding: 4px 6px;
            vertical-align: top;
          }
          .anc-label {
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            color: #333;
          }
          .anc-val {
            font-family: 'Courier New', Courier, monospace;
            font-weight: bold;
            font-size: 13px;
          }
        `}} />

        <table className="anc-grid">
          <tbody>
            {/* Row 1: Surname / First Name / Age / Unit No */}
            <tr>
              <td width="30%">
                <div className="anc-label">Surname</div>
                <div className="anc-val">{patient?.lastName || '................................'}</div>
              </td>
              <td width="40%">
                <div className="anc-label">First Name</div>
                <div className="anc-val">{patient?.firstName} {patient?.middleName || ''}</div>
              </td>
              <td width="15%">
                <div className="anc-label">Age</div>
                <div className="anc-val">{maternityProfile?.ageAtRegistration || patient?.age || '......'}</div>
              </td>
              <td width="15%">
                <div className="anc-label">Unit No</div>
                <div className="anc-val">{patient?.mrn || patient?.patientNumber || '......'}</div>
              </td>
            </tr>

            {/* Row 2: Special Points / Consultant */}
            <tr>
              <td>
                <div className="anc-label">Special Points</div>
                <div className="anc-val">{pregnancyCustom.specialPoints || 'None'}</div>
              </td>
              <td colSpan={2}>
                <div className="anc-label">Consultant</div>
                <div className="anc-val">{pregnancyCustom.consultant || '................................'}</div>
              </td>
              <td>
                <div className="anc-label">Booking Date</div>
                <div className="anc-val">{maternityProfile?.bookingDate ? new Date(maternityProfile.bookingDate).toLocaleDateString() : '......'}</div>
              </td>
            </tr>

            {/* Row 3: Indication / LMP / EDD / GA */}
            <tr>
              <td rowSpan={4}>
                <div className="anc-label">Res. Address</div>
                <div className="anc-val" style={{ fontSize: '11px' }}>{patient?.addresses?.[0]?.line || patient?.address || '................................'}</div>
                <div className="anc-label" style={{ marginTop: '10px' }}>Phone No:</div>
                <div className="anc-val">{patient?.telecoms?.[0]?.value || patient?.phone || '................................'}</div>
                <div className="anc-label" style={{ marginTop: '10px' }}>Occupation</div>
                <div className="anc-val">{profileCustom.occupation || '................................'}</div>
              </td>
              <td rowSpan={4}>
                <div className="anc-label">Indication for Booking:</div>
                <div className="anc-val" style={{ minHeight: '80px', whiteSpace: 'pre-line' }}>{pregnancyCustom.indicationForBooking || 'Routine Antenatal Care'}</div>
              </td>
              <td colSpan={2}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span className="anc-label">LMP: </span>
                    <span className="anc-val">{activePregnancy?.lmpDate ? new Date(activePregnancy.lmpDate).toLocaleDateString() : '....'}</span>
                  </div>
                  <div>
                    <span className="anc-label">E.D.D: </span>
                    <span className="anc-val">{activePregnancy?.eddDate ? new Date(activePregnancy.eddDate).toLocaleDateString() : '....'}</span>
                  </div>
                </div>
              </td>
            </tr>

            {/* Row 4: Husband Info Header */}
            <tr>
              <td colSpan={2} style={{ backgroundColor: '#f0f0f0', textAlign: 'center', fontWeight: 'bold', paddingTop: '8px', paddingBottom: '8px' }}>
                HUSBAND DETAILS
              </td>
            </tr>

            {/* Row 5: Husband Name */}
            <tr>
              <td colSpan={2}>
                <span className="anc-label">Name: </span>
                <span className="anc-val">{profileCustom.husbandName || '................................'}</span>
              </td>
            </tr>

            {/* Row 6: Husband Occupation */}
            <tr>
              <td colSpan={2}>
                <span className="anc-label">Occupation: </span>
                <span className="anc-val">{profileCustom.husbandOccupation || '................................'}</span>
              </td>
            </tr>

            {/* Row 7: Language / Tribe / Husband Phone */}
            <tr>
              <td>
                <div className="anc-label" style={{ marginBottom: '8px' }}>Speaking English</div>
                <CheckBoxField label="Yes" checked={profileCustom.speakingEnglish === 'Yes'} />
                <CheckBoxField label="No" checked={profileCustom.speakingEnglish === 'No'} />
              </td>
              <td>
                <div className="anc-label" style={{ marginBottom: '8px' }}>Tribe</div>
                <CheckBoxField label="Igbo" checked={profileCustom.tribe === 'Igbo'} />
                <CheckBoxField label="Hausa" checked={profileCustom.tribe === 'Hausa'} />
                <CheckBoxField label="Yoruba" checked={profileCustom.tribe === 'Yoruba'} />
                <CheckBoxField label="Others" checked={profileCustom.tribe === 'Others'} />
              </td>
              <td colSpan={2}>
                <div className="anc-label">Phone No:</div>
                <div className="anc-val">{profileCustom.husbandPhone || '................................'}</div>
              </td>
            </tr>

            {/* Row 8: Religion / Husband Office */}
            <tr>
              <td>
                <div className="anc-label" style={{ marginBottom: '8px' }}>Religion</div>
                <CheckBoxField label="Anglican" checked={profileCustom.religion === 'Anglican'} />
                <CheckBoxField label="Others" checked={profileCustom.religion === 'Others'} />
                <CheckBoxField label="Pagan" checked={profileCustom.religion === 'Pagan'} />
              </td>
              <td>
                <div className="anc-label">FSH</div>
                <div className="anc-val">{profileCustom.fsh || 'Nil'}</div>
              </td>
              <td colSpan={2}>
                <div className="anc-label">Office Address:</div>
                <div className="anc-val">{profileCustom.husbandOfficeAddress || '................................'}</div>
              </td>
            </tr>

            {/* Row 9: General medical headers */}
            <tr>
              <td style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>SYSTEMIC DISEASES</td>
              <td style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>SOCIAL & EDUCATION</td>
              <td colSpan={2} style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', textAlign: 'center' }}>PRESENT PREGNANCY</td>
            </tr>

            {/* Row 10: Heart Disease / Year of Marriage / Bleeding */}
            <tr>
              <td>
                <CheckBoxField label="Heart Disease" checked={!!profileCustom.heartDisease} />
              </td>
              <td>
                <span className="anc-label">Year of Marriage: </span>
                <span className="anc-val">{profileCustom.yearOfMarriage || '....'}</span>
              </td>
              <td colSpan={2}>
                <CheckBoxField label="Bleeding" checked={!!profileCustom.bleeding} />
              </td>
            </tr>

            {/* Row 11: Chest Disease / Education / Discharge */}
            <tr>
              <td>
                <CheckBoxField label="Chest Disease" checked={!!profileCustom.chestDisease} />
              </td>
              <td>
                <div className="anc-label" style={{ marginBottom: '4px' }}>Level of Education:</div>
                <CheckBoxField label="Primary" checked={profileCustom.educationLevel === 'Primary'} />
                <CheckBoxField label="Secondary" checked={profileCustom.educationLevel === 'Secondary'} />
                <CheckBoxField label="Tertiary" checked={profileCustom.educationLevel === 'Tertiary'} />
              </td>
              <td colSpan={2}>
                <CheckBoxField label="Discharge" checked={!!profileCustom.discharge} />
              </td>
            </tr>

            {/* Row 12: Kidney Disease / Other risk checkboxes / Urinary */}
            <tr>
              <td>
                <CheckBoxField label="Kidney Disease" checked={!!profileCustom.kidneyDisease} />
              </td>
              <td rowSpan={3}>
                <div className="anc-label" style={{ marginBottom: '8px' }}>Risk Flags Checked:</div>
                <div style={{ fontSize: '10px', lineHeight: 1.4 }}>
                  {['Smoking', 'Alcohol', 'Hypertension', 'Blood transfusion', 'Diabetes', 'Mellitus', 'Sickle Cell', 'Twinning', 'Asthma', 'Epilepsy'].map(risk => (
                    <span key={risk} style={{ marginRight: '8px', display: 'inline-block' }}>
                      <span style={{ border: '1px solid #000', paddingLeft: '4px', paddingRight: '4px', marginRight: '2px' }}>
                        {(profileCustom.lifestyleRiskFactors || []).includes(risk) ? '✓' : ' '}
                      </span>
                      {risk}
                    </span>
                  ))}
                </div>
              </td>
              <td colSpan={2}>
                <CheckBoxField label="Urinary Symptoms" checked={!!profileCustom.urinarySymptoms} />
              </td>
            </tr>

            {/* Row 13: Operations / Swelling */}
            <tr>
              <td rowSpan={2}>
                <div className="anc-label">Operations:</div>
                <div className="anc-val" style={{ fontSize: '11px' }}>{profileCustom.operations || 'None'}</div>
              </td>
              <td colSpan={2}>
                <CheckBoxField label="Swelling of Ankles" checked={!!profileCustom.swellingOfAnkles} />
              </td>
            </tr>

            {/* Row 14: Other Symptoms */}
            <tr>
              <td colSpan={2}>
                <div className="anc-label">Other Symptoms:</div>
                <div className="anc-val">{profileCustom.otherSymptoms ? (profileCustom.otherSymptomsDesc || 'Yes') : 'None'}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Previous Pregnancies Section */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', mb: 1, border: '1px solid #000', bgcolor: '#f5f5f5', py: 0.5 }}>
            Details of Previous Pregnancies
          </Typography>
          <table className="anc-grid">
            <thead>
              <tr style={{ backgroundColor: '#fafafa', fontWeight: 'bold' }}>
                <td>Gravida</td>
                <td>Parity</td>
                <td>Living Children (M/F)</td>
                <td>Date of Birth</td>
                <td>Place of Birth</td>
                <td>Duration of Pregnancy</td>
                <td>Pregnancy, Labour and Puerperium</td>
                <td>Birth Weight</td>
                <td>Outcome (Baby A/SB/NND/D)</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="anc-val">{profileCustom.prevGravida1 || ''}</td>
                <td className="anc-val">{profileCustom.prevParity1 || ''}</td>
                <td className="anc-val">
                  {profileCustom.prevLivingMale1 !== undefined || profileCustom.prevLivingFemale1 !== undefined
                    ? `${profileCustom.prevLivingMale1 || 0} / ${profileCustom.prevLivingFemale1 || 0}`
                    : ''}
                </td>
                <td>{profileCustom.prevDob1 || ''}</td>
                <td>{profileCustom.prevPob1 || ''}</td>
                <td>{profileCustom.prevDuration1 || ''}</td>
                <td>{profileCustom.prevComps1 || 'None'}</td>
                <td>{profileCustom.prevWeight1 || ''}</td>
                <td>{profileCustom.prevOutcome1 || ''}</td>
              </tr>
              <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
              <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
            </tbody>
          </table>
        </Box>

        {/* Footer Signature */}
        <Box display="flex" justifyContent="space-between" sx={{ mt: 3, pt: 2, borderTop: '1px solid #000', fontSize: '11px' }}>
          <div>Signature: ............................................</div>
          <div>Name: .................................................</div>
          <div>Date: .................................................</div>
        </Box>
      </Box>
    );
  };

  // RENDER DYNAMIC ANC TEMPLATES
  const renderTemplateSelector = () => {
    if (forceTemplate === 'anc_faith_foundation_replica') {
      return renderReplica();
    }

    // Dynamic schemas for other templates
    return (
      <Box sx={{ bgcolor: '#fff', p: 3, borderRadius: 2, border: '1px solid #ddd', fontFamily: 'sans-serif', color: '#333' }}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 3, borderBottom: '2px solid #3f51b5', pb: 2 }}>
          <img src={forceLogoLeft} alt="Logo" style={{ height: '50px' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
              {forceTemplate.toUpperCase().replace(/_/g, ' ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Patient Health Records - Antenatal Care Program
            </Typography>
          </Box>
        </Box>

        {/* Basic Info */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Mother's Name</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{patient?.firstName} {patient?.lastName}</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="caption" color="text.secondary">Age</Typography>
            <Typography variant="body1">{maternityProfile?.ageAtRegistration || patient?.age || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="caption" color="text.secondary">MRN</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{patient?.mrn || 'N/A'}</Typography>
          </Grid>
        </Grid>

        {/* Custom profile fields for the selected template */}
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', p: 1, mb: 2 }}>
          Maternity Profile Custom Fields
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Object.keys(profileCustom).length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" style={{ fontStyle: 'italic' }}>No custom profile data filled for this template.</Typography>
            </Grid>
          ) : (
            Object.entries(profileCustom).map(([key, val]: any) => (
              <Grid item xs={6} key={key}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                </Typography>
              </Grid>
            ))
          )}
        </Grid>

        {/* Custom pregnancy fields */}
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', p: 1, mb: 2 }}>
          Pregnancy Episode Custom Fields
        </Typography>
        <Grid container spacing={2}>
          {Object.keys(pregnancyCustom).length === 0 ? (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" style={{ fontStyle: 'italic' }}>No custom pregnancy data logged for this template.</Typography>
            </Grid>
          ) : (
            Object.entries(pregnancyCustom).map(([key, val]: any) => (
              <Grid item xs={6} key={key}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                </Typography>
              </Grid>
            ))
          )}
        </Grid>
      </Box>
    );
  };

  return <Box>{renderTemplateSelector()}</Box>;
};

// Help Grid Layout inside PrintTemplate fallback
const Grid = ({ children, container, spacing, item, xs, md, ...props }: any) => {
  const styles: any = {};
  if (container) {
    styles.display = 'flex';
    styles.flexWrap = 'wrap';
    styles.margin = `-${(spacing || 2) * 4}px`;
  }
  if (item) {
    styles.boxSizing = 'border-box';
    styles.padding = `${(spacing || 2) * 4}px`;
    if (xs) styles.width = `${(xs / 12) * 100}%`;
  }
  return <div style={{ ...styles, ...props.style }}>{children}</div>;
};
