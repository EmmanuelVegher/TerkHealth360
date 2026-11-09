import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download,
  MenuBook,
  OpenInNew,
  LocalHospital,
  Healing,
  MedicalServices,
  LocalPharmacy,
  Biotech,
  CameraAlt,
  Receipt,
  AdminPanelSettings,
  HelpOutline,
  Computer,
  Layers,
} from '@mui/icons-material';

const ROLE_SECTIONS = [
  {
    id: 'installation',
    label: '1. Master Installation (Win / Mac / Linux)',
    icon: <Computer />,
    color: '#0d2560',
    summary: 'Step-by-step setup for Windows Desktop (.exe), Apple macOS (.dmg), and Linux (.AppImage / .deb), plus LAN server networking.',
  },
  {
    id: 'architecture',
    label: '2. Patient Lifecycle & Cross-Cutting Architecture',
    icon: <Layers />,
    color: '#0ca678',
    summary: 'The master patient journey diagram demonstrating zero duplicate entries across Reception, Triage, OPD, Lab, Pharmacy, and Billing.',
  },
  {
    id: 'records',
    label: 'Section A: Health Records & Reception',
    icon: <LocalHospital />,
    color: '#1c7ed6',
    summary: 'Master Patient Index (MPI), Demographic Registrations, Payer Types (Cash, NHIA, HMO), and Clinic Queue Check-In.',
  },
  {
    id: 'nursing',
    label: 'Section B: Nursing Staff & Wards',
    icon: <Healing />,
    color: '#d6336c',
    summary: 'Vital Signs Acquisition, Automated NEWS2 Clinical Early Warning Alerts, Inpatient Bed Allocation, and e-MAR Drug Sign-Offs.',
  },
  {
    id: 'doctors',
    label: 'Section C: Medical Doctors & Clinics',
    icon: <MedicalServices />,
    color: '#2b8a3e',
    summary: 'SOAP Clinical Consultations, Voicebox Offline AI Voice Dictation, Automatic ICD-10 Coding, Eye Clinic, and FDI Odontogram Dental Clinic.',
  },
  {
    id: 'pharmacy',
    label: 'Section D: Pharmacy & Supply Chain (SCM)',
    icon: <LocalPharmacy />,
    color: '#e8590c',
    summary: 'Prescription Verification, Drug Safety & Allergies, FEFO Batch Allocations, Store Balances, and Spoken Patient Care Audio Guides.',
  },
  {
    id: 'lab',
    label: 'Section E: Laboratory (LIMS / Pathology)',
    icon: <Biotech />,
    color: '#7048e8',
    summary: 'Phlebotomy Sample Collection, Barcode Tube Labelling, Analyzer Worklists, Biological Reference Ranges, and Pathologist Electronic Sign-Off.',
  },
  {
    id: 'radiology',
    label: 'Section F: Radiology & PACS Imaging',
    icon: <CameraAlt />,
    color: '#1098ad',
    summary: 'Diagnostic Imaging Orders, Web DICOM Viewer, and AI-Assisted Radiographic Findings & Clinical Impressions.',
  },
  {
    id: 'billing',
    label: 'Section G: Billing, Cashier & Insurance',
    icon: <Receipt />,
    color: '#364fc7',
    summary: 'Point-of-Sale Invoicing, Cash / POS / Transfer Receipts, NHIA & HMO Pre-Authorization Codes, and 90/10 Co-Payment Computations.',
  },
  {
    id: 'admin',
    label: 'Section H: Administration, HR & IT',
    icon: <AdminPanelSettings />,
    color: '#f08c00',
    summary: 'Staff User Management, Role-Based Access Control (RBAC), Automated Daily Database Backups (2:00 AM), and System Maintenance.',
  },
  {
    id: 'faq',
    label: 'Troubleshooting & FAQs',
    icon: <HelpOutline />,
    color: '#495057',
    summary: 'Microphone access permissions, offline LAN operating rules, data recovery procedures, and NMRS / DHIS2 statistical reporting.',
  },
];

export const HospitalManual: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState(0);

  const pdfUrl = '/docs/Hospital_Master_Operational_Manual.pdf';
  const htmlUrl = '/docs/manual.html';

  const handleDownloadPdf = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'Faith_Foundation_Hospital_Master_Operational_Manual.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPdf = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleOpenHtml = () => {
    window.open(htmlUrl, '_blank');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #0d1550 0%, #1e2a78 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            <MenuBook sx={{ fontSize: 32, color: '#38bdf8' }} />
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px">
              Hospital Master Operational Manual
            </Typography>
            <Chip
              label="v1.0.0 Enterprise"
              size="small"
              sx={{ bgcolor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700 }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)', maxWidth: 750 }}>
            Official step-by-step role manual, multi-platform desktop installation guide (Windows, macOS, Linux),
            and complete departmental workflows for Faith Foundation Hospital Management System (TerkHealth360).
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<OpenInNew />}
            onClick={handleOpenHtml}
            sx={{
              color: '#ffffff',
              borderColor: 'rgba(255, 255, 255, 0.4)',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.08)' },
            }}
          >
            Read Full Document
          </Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownloadPdf}
            sx={{
              bgcolor: '#0ca678',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 800,
              px: 2.5,
              '&:hover': { bgcolor: '#099268' },
            }}
          >
            Download PDF Manual
          </Button>
        </Stack>
      </Paper>

      {/* Role Navigation Grid */}
      <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ mb: 1.5, letterSpacing: '0.05em' }}>
        SELECT YOUR DESIGNATION OR ROLE TO JUMP TO MODULE INSTRUCTIONS:
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {ROLE_SECTIONS.map((sec, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={sec.id}>
            <Card
              variant="outlined"
              onClick={() => setSelectedSection(idx)}
              sx={{
                p: 1.5,
                borderRadius: 2,
                cursor: 'pointer',
                borderColor: selectedSection === idx ? sec.color : 'divider',
                borderWidth: selectedSection === idx ? 2 : 1,
                bgcolor: selectedSection === idx ? 'rgba(59, 91, 219, 0.04)' : '#ffffff',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: sec.color,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    bgcolor: `${sec.color}15`,
                    color: sec.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {sec.icon}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" fontWeight={800} noWrap sx={{ color: sec.color, display: 'block' }}>
                    {sec.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: '0.72rem',
                    }}
                  >
                    {sec.summary}
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Embedded Document Viewer Panel */}
      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', bgcolor: '#ffffff' }}>
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            bgcolor: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" fontWeight={800} color="#0d2560">
              Interactive Operational Reader: {ROLE_SECTIONS[selectedSection]?.label}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Open in new window">
              <IconButton size="small" onClick={handleOpenHtml}>
                <OpenInNew fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download PDF file">
              <IconButton size="small" onClick={handleDownloadPdf}>
                <Download fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        <Box sx={{ height: '75vh', width: '100%', bgcolor: '#ffffff' }}>
          <iframe
            src={htmlUrl}
            title="Hospital Master Operational Manual"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default HospitalManual;

