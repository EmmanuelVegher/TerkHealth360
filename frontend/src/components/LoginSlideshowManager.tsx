import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, IconButton,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, Stack, CircularProgress, Tooltip, Paper, Divider
} from '@mui/material';
import {
  AddPhotoAlternate, Delete, CloudUpload, Refresh, Image as ImageIcon,
  Restore, CheckCircle, Collections
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { assetUrl } from '../utils/assetUrl';

export interface SlideItem {
  id?: string;
  image: string;
  dept: string;
  desc: string;
}

const DEFAULT_SLIDES: SlideItem[] = [
  {
    id: 'default_1',
    image: '/hospital_slides/slide0_laboratory_scientist.webp?v=2',
    dept: 'Medical Laboratory & Diagnostics',
    desc: 'Advanced medical diagnostics & pathology investigations',
  },
  {
    id: 'default_2',
    image: '/hospital_slides/slide3_nurses_reception.webp?v=2',
    dept: 'Nursing Station',
    desc: 'Dedicated healthcare staff welcoming patients 24/7',
  },
  {
    id: 'default_3',
    image: '/hospital_slides/slide1_consultation_booth.webp?v=2',
    dept: 'Outpatient Triage & Reception',
    desc: 'Dedicated healthcare staff welcoming patients 24/7',
  },
  {
    id: 'default_4',
    image: '/hospital_slides/slide2_hospital_hallway.webp?v=2',
    dept: 'Inpatient Hallways & Patient Wards',
    desc: 'Immaculate, peaceful facility designed for patient recovery',
  },
  {
    id: 'default_5',
    image: '/hospital_slides/slide4_records_administration.webp?v=2',
    dept: 'Health Records & Administration',
    desc: 'Electronic health records and seamless clinic coordination',
  },
  {
    id: 'default_6',
    image: '/hospital_slides/slide5_clinical_examination.webp?v=2',
    dept: 'Clinical Examination Suite',
    desc: 'Fully equipped diagnostic stations and patient examination',
  },
  {
    id: 'default_7',
    image: '/hospital_slides/slide6_cashier_point.webp?v=2',
    dept: 'Patient Accounts & Cashier Point',
    desc: 'Transparent, efficient hospital admissions and payment desk',
  },
];

export const LoginSlideshowManager: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload Modal State
  const [openModal, setOpenModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [deptName, setDeptName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const res = await api.get('/config/slideshow');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setSlides(res.data.data);
      } else {
        setSlides(DEFAULT_SLIDES);
      }
    } catch (err) {
      console.error('Failed to load slides:', err);
      setSlides(DEFAULT_SLIDES);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!deptName) {
        setDeptName('Hospital Ward & Clinic');
      }
    }
  };

  const handleUploadSlide = async () => {
    if (!selectedFile) {
      enqueueSnackbar('Please select an image file to upload', { variant: 'warning' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('dept', deptName || 'Hospital Facility');
      formData.append('desc', description || 'Modern healthcare facility & compassionate patient care.');

      const res = await api.post('/config/slideshow/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        enqueueSnackbar('Slide image uploaded and added to login slideshow!', { variant: 'success' });
        setOpenModal(false);
        setSelectedFile(null);
        setPreviewUrl('');
        setDeptName('');
        setDescription('');
        fetchSlides();
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      enqueueSnackbar(err.response?.data?.error || 'Failed to upload slide image', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSlide = async (slide: SlideItem, index: number) => {
    if (!window.confirm(`Delete "${slide.dept}" from the login slideshow?`)) return;

    try {
      const idToDelete = slide.id || String(index);
      const res = await api.delete(`/config/slideshow/${idToDelete}`);
      if (res.data?.success) {
        enqueueSnackbar('Slide removed from slideshow', { variant: 'info' });
        fetchSlides();
      }
    } catch (err) {
      console.error('Delete error:', err);
      enqueueSnackbar('Failed to delete slide', { variant: 'error' });
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Reset the login slideshow to the default hospital photography collection?')) return;

    try {
      const res = await api.put('/config/slideshow', { slides: DEFAULT_SLIDES });
      if (res.data?.success) {
        enqueueSnackbar('Reset to default hospital photography slides', { variant: 'success' });
        setSlides(DEFAULT_SLIDES);
      }
    } catch (err) {
      console.error('Reset error:', err);
      enqueueSnackbar('Failed to reset slides', { variant: 'error' });
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        mb: 3
      }}
    >
      <Box
        sx={{
          p: 2.5,
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}
          >
            <Collections fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} color="#0f172a">
              Login Page Slideshow & Photography Manager
            </Typography>
            <Typography variant="body2" color="text.secondary" fontSize="0.82rem">
              Upload custom hospital photographs to showcase in the background slideshow on the login page
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            color="inherit"
            startIcon={<Restore />}
            onClick={handleResetToDefaults}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#64748b' }}
          >
            Reset Defaults
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddPhotoAlternate />}
            onClick={() => setOpenModal(true)}
            sx={{
              bgcolor: '#2563eb',
              '&:hover': { bgcolor: '#1d4ed8' },
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            Upload New Slide Image
          </Button>
        </Stack>
      </Box>

      <CardContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : slides.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 2.5,
              borderStyle: 'dashed',
              borderColor: '#cbd5e1'
            }}
          >
            <ImageIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
            <Typography variant="subtitle1" fontWeight={700} color="#334155">
              No Slideshow Images Configured
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload your hospital photographs or click &quot;Reset Defaults&quot; to load default clinic photos.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddPhotoAlternate />}
              onClick={() => setOpenModal(true)}
            >
              Upload First Slide
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {slides.map((slide, idx) => (
              <Grid item xs={12} sm={6} md={4} key={slide.id || slide.image || idx}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                      borderColor: '#93c5fd'
                    }
                  }}
                >
                  {/* Image Display */}
                  <Box
                    sx={{
                      height: 150,
                      width: '100%',
                      position: 'relative',
                      backgroundImage: `url(${slide.image.startsWith('/') || slide.image.startsWith('http') ? assetUrl(slide.image) : slide.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      bgcolor: '#0f172a'
                    }}
                  >
                    <Chip
                      label={`Slide ${idx + 1}`}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        bgcolor: 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        backdropFilter: 'blur(4px)',
                        fontWeight: 700,
                        fontSize: '0.7rem'
                      }}
                    />
                    <Tooltip title="Delete slide">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteSlide(slide, idx)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'rgba(239, 68, 68, 0.85)',
                          color: '#ffffff',
                          '&:hover': { bgcolor: '#dc2626' },
                          p: 0.6
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Metadata Content */}
                  <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      color="#2563eb"
                      textTransform="uppercase"
                      letterSpacing={0.5}
                      noWrap
                    >
                      {slide.dept}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="#334155"
                      sx={{
                        mt: 0.5,
                        fontSize: '0.82rem',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {slide.desc}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>

      {/* Upload Slide Dialog */}
      <Dialog
        open={openModal}
        onClose={() => !uploading && setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Upload New Slideshow Image
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Choose a high-quality photograph of your hospital, clinic wards, reception, or medical equipment:
            </Typography>

            {previewUrl ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: 200,
                  borderRadius: 2,
                  backgroundImage: `url(${previewUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  mb: 1.5,
                  border: '2px solid #2563eb'
                }}
              >
                <Button
                  variant="contained"
                  component="label"
                  size="small"
                  startIcon={<Refresh />}
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    textTransform: 'none'
                  }}
                >
                  Change Image
                  <input type="file" hidden accept="image/*" onChange={handleFileSelect} />
                </Button>
              </Box>
            ) : (
              <Paper
                variant="outlined"
                component="label"
                sx={{
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  borderStyle: 'dashed',
                  borderColor: '#94a3b8',
                  bgcolor: '#f8fafc',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#f1f5f9', borderColor: '#2563eb' }
                }}
              >
                <CloudUpload sx={{ fontSize: 44, color: '#3b82f6', mb: 1 }} />
                <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                  Click to select or drag & drop an image
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PNG, JPG, or WebP (max 10MB)
                </Typography>
                <input type="file" hidden accept="image/*" onChange={handleFileSelect} />
              </Paper>
            )}
          </Box>

          <TextField
            fullWidth
            margin="dense"
            label="Department / Area Tag"
            placeholder="e.g. Accident & Emergency Unit"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            helperText="Appears as the yellow highlight label above the description"
          />

          <TextField
            fullWidth
            margin="dense"
            label="Slide Description / Headline"
            placeholder="e.g. 24/7 dedicated acute trauma and emergency intensive care."
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            helperText="Appears as the subtitle headline on the login screen slideshow"
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadSlide}
            disabled={uploading || !selectedFile}
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />}
            sx={{ bgcolor: '#2563eb', fontWeight: 700 }}
          >
            {uploading ? 'Uploading...' : 'Save & Add to Slideshow'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default LoginSlideshowManager;
