import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Card, CardContent, Grid, Button, Divider, List,
  ListItem, ListItemText, ListItemSecondaryAction, IconButton, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Switch, FormControlLabel, Stack, Chip, Alert,
  Paper, CircularProgress, Tooltip, Breadcrumbs, Link,
} from '@mui/material';
import {
  Add, Delete, Edit, ArrowUpward, ArrowDownward, Settings,
  Route as RouteIcon, Save, Refresh, HelpOutline, CheckCircle,
  Warning, LocalHospital, KeyboardArrowRight,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

interface Step {
  id: string;
  stepOrder: number;
  statusCode: string;
  label: string;
  description?: string;
  isOptional: boolean;
  isBillingGate: boolean;
  skipForEmergency: boolean;
  assignedRole?: string;
  module?: string;
  moduleRoute?: string;
}

interface Template {
  id: string;
  name: string;
  visitType: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  steps: Step[];
}

const VISIT_TYPES = ['OUTPATIENT', 'EMERGENCY', 'ANC', 'MATERNITY', 'LAB_ONLY', 'RADIOLOGY_ONLY', 'PHYSIO'];
const ROLES = ['RECEPTIONIST', 'NURSE', 'DOCTOR', 'LAB_TECHNICIAN', 'PHARMACIST', 'STAFF', 'ACCOUNTANT'];
const MODULES = [
  { name: 'Registration', route: '/register-patient' },
  { name: 'Billing/Payment', route: '/billing' },
  { name: 'Nursing/Triage', route: '/nursing' },
  { name: 'Clinical Workspace', route: '/emr-workspace' },
  { name: 'Laboratory', route: '/lims' },
  { name: 'Pharmacy', route: '/pharmacy' },
  { name: 'Radiology', route: '/radiology' },
  { name: 'Emergency', route: '/emergency' },
  { name: 'Rehabilitation', route: '/rehabilitation' },
];

const WorkflowConfig = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
  const [openStepDialog, setOpenStepDialog] = useState(false);

  // Forms
  const [templateForm, setTemplateForm] = useState({ name: '', visitType: 'OUTPATIENT', description: '', isDefault: false });
  const [stepForm, setStepForm] = useState({
    label: '', statusCode: '', description: '', isOptional: false,
    isBillingGate: false, skipForEmergency: false, assignedRole: 'RECEPTIONIST',
    module: 'registration', moduleRoute: '/register-patient',
  });

  const [editingStep, setEditingStep] = useState<Step | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workflow/templates');
      const data = res.data?.data || [];
      setTemplates(data);
      if (data.length > 0) {
        // preserve selection if already selected
        const currentSel = selectedTemplate ? data.find((t: any) => t.id === selectedTemplate.id) : null;
        setSelectedTemplate(currentSel || data[0]);
      }
    } catch (err) {
      enqueueSnackbar('Failed to load workflow templates', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTemplate && !openTemplateDialog) {
        // Save current template details (non-dialog update)
        await api.put(`/workflow/templates/${selectedTemplate.id}`, templateForm);
        enqueueSnackbar('Template details updated', { variant: 'success' });
      } else {
        const res = await api.post('/workflow/templates', templateForm);
        enqueueSnackbar('Workflow template created!', { variant: 'success' });
        setOpenTemplateDialog(false);
        setTemplateForm({ name: '', visitType: 'OUTPATIENT', description: '', isDefault: false });
      }
      fetchTemplates();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save template', { variant: 'error' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this workflow template? This cannot be undone.')) return;
    try {
      await api.delete(`/workflow/templates/${id}`);
      enqueueSnackbar('Template deleted', { variant: 'info' });
      setSelectedTemplate(null);
      fetchTemplates();
    } catch {
      enqueueSnackbar('Failed to delete template', { variant: 'error' });
    }
  };

  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    try {
      const nextOrder = selectedTemplate.steps.length + 1;
      const payload = {
        ...stepForm,
        stepOrder: editingStep ? editingStep.stepOrder : nextOrder,
      };

      if (editingStep) {
        await api.put(`/workflow/steps/${editingStep.id}`, payload);
        enqueueSnackbar('Step details updated', { variant: 'success' });
      } else {
        await api.post(`/workflow/templates/${selectedTemplate.id}/steps`, payload);
        enqueueSnackbar('Step added to workflow template', { variant: 'success' });
      }
      setOpenStepDialog(false);
      setEditingStep(null);
      setStepForm({
        label: '', statusCode: '', description: '', isOptional: false,
        isBillingGate: false, skipForEmergency: false, assignedRole: 'RECEPTIONIST',
        module: 'registration', moduleRoute: '/register-patient',
      });
      fetchTemplates();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to save step', { variant: 'error' });
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!window.confirm('Remove this step from the template?')) return;
    try {
      await api.delete(`/workflow/steps/${stepId}`);
      enqueueSnackbar('Step removed', { variant: 'info' });
      fetchTemplates();
    } catch {
      enqueueSnackbar('Failed to delete step', { variant: 'error' });
    }
  };

  const handleMoveStep = async (index: number, direction: 'up' | 'down') => {
    if (!selectedTemplate) return;
    const steps = [...selectedTemplate.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    // Swap stepOrder locally
    const tempOrder = steps[index].stepOrder;
    steps[index].stepOrder = steps[targetIndex].stepOrder;
    steps[targetIndex].stepOrder = tempOrder;

    try {
      // Send both updates
      await Promise.all([
        api.put(`/workflow/steps/${steps[index].id}`, { stepOrder: steps[index].stepOrder }),
        api.put(`/workflow/steps/${steps[targetIndex].id}`, { stepOrder: steps[targetIndex].stepOrder }),
      ]);
      enqueueSnackbar('Steps reordered', { variant: 'success' });
      fetchTemplates();
    } catch {
      enqueueSnackbar('Failed to save step order', { variant: 'error' });
    }
  };

  const handleModuleChange = (moduleName: string) => {
    const matched = MODULES.find(m => m.name === moduleName);
    setStepForm(f => ({
      ...f,
      module: moduleName,
      moduleRoute: matched ? matched.route : '',
    }));
  };

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" href="/" sx={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          Dashboard
        </Link>
        <Typography color="text.primary" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>Workflow Config</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Patient Journey Builder</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure clinical flows, routing gates, and automated status machines
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={fetchTemplates}><Refresh /></IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setTemplateForm({ name: '', visitType: 'OUTPATIENT', description: '', isDefault: false });
              setOpenTemplateDialog(true);
            }}
            sx={{ background: 'linear-gradient(135deg, #3b5bdb 0%, #4c6ef5 100%)', borderRadius: 2 }}
          >
            Create Template
          </Button>
        </Stack>
      </Box>

      {loading && templates.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {/* Templates Column */}
          <Grid item xs={12} md={4}>
            <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Workflow Templates</Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1.5}>
                  {templates.map(tmpl => (
                    <Paper
                      key={tmpl.id}
                      variant="outlined"
                      onClick={() => {
                        setSelectedTemplate(tmpl);
                        setTemplateForm({ name: tmpl.name, visitType: tmpl.visitType, description: tmpl.description || '', isDefault: tmpl.isDefault });
                      }}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: '0.2s',
                        borderColor: selectedTemplate?.id === tmpl.id ? 'primary.main' : 'divider',
                        bgcolor: selectedTemplate?.id === tmpl.id ? 'primary.50' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="body2" fontWeight={700} color={selectedTemplate?.id === tmpl.id ? 'primary.main' : 'text.primary'}>
                          {tmpl.name}
                        </Typography>
                        {tmpl.isDefault && <Chip label="DEFAULT" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800 }} />}
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                        Category: <strong>{tmpl.visitType}</strong> · {tmpl.steps.length} step(s)
                      </Typography>
                      {tmpl.description && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {tmpl.description}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Steps & Config Column */}
          <Grid item xs={12} md={8}>
            {selectedTemplate ? (
              <Stack spacing={3}>
                {/* Template metadata / quick edit */}
                <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderRadius: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RouteIcon color="primary" />
                        <Typography variant="h6" fontWeight={700}>Template Details: {selectedTemplate.name}</Typography>
                      </Box>
                      <Button size="small" color="error" onClick={() => handleDeleteTemplate(selectedTemplate.id)}>
                        Delete Template
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <form onSubmit={handleSaveTemplate}>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={6}>
                          <TextField label="Template Name" required fullWidth size="small" value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Visit Category</InputLabel>
                            <Select value={templateForm.visitType} label="Visit Category" onChange={e => setTemplateForm(f => ({ ...f, visitType: e.target.value }))} disabled>
                              {VISIT_TYPES.map(vt => <MenuItem key={vt} value={vt}>{vt}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField label="Description" fullWidth size="small" multiline rows={2} value={templateForm.description} onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))} />
                        </Grid>
                      </Grid>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <FormControlLabel
                          control={<Switch checked={templateForm.isDefault} onChange={e => setTemplateForm(f => ({ ...f, isDefault: e.target.checked }))} />}
                          label={<Typography variant="body2">Set as default for {templateForm.visitType}</Typography>}
                        />
                        <Button type="submit" variant="outlined" startIcon={<Save />} size="small">Save Changes</Button>
                      </Box>
                    </form>
                  </CardContent>
                </Card>

                {/* Steps configuration */}
                <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderRadius: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight={700}>Steps Config Pipeline</Typography>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => {
                          setEditingStep(null);
                          setStepForm({
                            label: '', statusCode: '', description: '', isOptional: false,
                            isBillingGate: false, skipForEmergency: false, assignedRole: 'RECEPTIONIST',
                            module: 'registration', moduleRoute: '/register-patient',
                          });
                          setOpenStepDialog(true);
                        }}
                      >
                        Add Step
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    {selectedTemplate.steps.length === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        No steps defined for this workflow yet. Click "Add Step" to configure the journey pipeline.
                      </Alert>
                    ) : (
                      <List disablePadding>
                        {selectedTemplate.steps.map((step, index) => (
                          <Paper
                            key={step.id}
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              mb: 1.5,
                              borderRadius: 2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              {/* Reorder Buttons */}
                              <Stack spacing={0.25}>
                                <IconButton size="small" disabled={index === 0} onClick={() => handleMoveStep(index, 'up')}>
                                  <ArrowUpward sx={{ fontSize: 14 }} />
                                </IconButton>
                                <IconButton size="small" disabled={index === selectedTemplate.steps.length - 1} onClick={() => handleMoveStep(index, 'down')}>
                                  <ArrowDownward sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Stack>

                              {/* Step Details */}
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight={700}>{index + 1}. {step.label}</Typography>
                                  <Chip label={step.statusCode} size="small" sx={{ fontSize: '0.65rem', height: 16, fontFamily: 'monospace' }} />
                                  {step.isBillingGate && <Chip label="Billing Gate" size="small" color="warning" sx={{ fontSize: '0.65rem', height: 16 }} />}
                                  {step.skipForEmergency && <Chip label="ER Bypass" size="small" color="error" sx={{ fontSize: '0.65rem', height: 16 }} />}
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Role: <strong>{step.assignedRole}</strong> · Module: <strong>{step.module}</strong> ({step.moduleRoute})
                                </Typography>
                                {step.description && <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{step.description}</Typography>}
                              </Box>
                            </Box>

                            {/* Actions */}
                            <Stack direction="row" spacing={0.5}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setEditingStep(step);
                                  setStepForm({
                                    label: step.label,
                                    statusCode: step.statusCode,
                                    description: step.description || '',
                                    isOptional: step.isOptional,
                                    isBillingGate: step.isBillingGate,
                                    skipForEmergency: step.skipForEmergency,
                                    assignedRole: step.assignedRole || 'RECEPTIONIST',
                                    module: step.module || 'registration',
                                    moduleRoute: step.moduleRoute || '',
                                  });
                                  setOpenStepDialog(true);
                                }}
                              >
                                <Edit sx={{ fontSize: 16 }} />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteStep(step.id)}>
                                <Delete sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Stack>
                          </Paper>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            ) : (
              <Card sx={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                <Box textAlign="center" color="text.secondary">
                  <Settings sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                  <Typography>Select or create a template to begin configuring</Typography>
                </Box>
              </Card>
            )}
          </Grid>
        </Grid>
      )}

      {/* ── CREATE TEMPLATE DIALOG ─────────────────────────────────────────── */}
      <Dialog open={openTemplateDialog} onClose={() => setOpenTemplateDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Workflow Template</DialogTitle>
        <form onSubmit={handleSaveTemplate}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Template Name" placeholder="e.g. Standard Surgery OPD Template" required fullWidth value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} />
              <FormControl fullWidth>
                <InputLabel>Visit Category</InputLabel>
                <Select value={templateForm.visitType} label="Visit Category" onChange={e => setTemplateForm(f => ({ ...f, visitType: e.target.value }))}>
                  {VISIT_TYPES.map(vt => <MenuItem key={vt} value={vt}>{vt}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Description" placeholder="Optional description..." multiline rows={2} fullWidth value={templateForm.description} onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))} />
              <FormControlLabel
                control={<Switch checked={templateForm.isDefault} onChange={e => setTemplateForm(f => ({ ...f, isDefault: e.target.checked }))} />}
                label={<Typography variant="body2">Set as default for this visit category</Typography>}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenTemplateDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!templateForm.name}>Create Template</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── ADD/EDIT STEP DIALOG ────────────────────────────────────────────── */}
      <Dialog open={openStepDialog} onClose={() => setOpenStepDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingStep ? 'Edit Step Configuration' : 'Add Workflow Step'}</DialogTitle>
        <form onSubmit={handleSaveStep}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField label="Step Label" placeholder="e.g. Awaiting Payment" required fullWidth value={stepForm.label} onChange={e => setStepForm(f => ({ ...f, label: e.target.value }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Status Code" placeholder="e.g. AWAITING_PAYMENT" required fullWidth value={stepForm.statusCode} onChange={e => setStepForm(f => ({ ...f, statusCode: e.target.value.toUpperCase().replace(/\s/g, '_') }))} helperText="Unique status identifier" />
                </Grid>
              </Grid>
              <TextField label="Description" placeholder="Explain what happens at this step..." multiline rows={2} fullWidth value={stepForm.description} onChange={e => setStepForm(f => ({ ...f, description: e.target.value }))} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Assigned Role</InputLabel>
                    <Select value={stepForm.assignedRole} label="Assigned Role" onChange={e => setStepForm(f => ({ ...f, assignedRole: e.target.value }))}>
                      {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Target Module Link</InputLabel>
                    <Select value={stepForm.module} label="Target Module Link" onChange={e => handleModuleChange(e.target.value)}>
                      {MODULES.map(m => <MenuItem key={m.name} value={m.name}>{m.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {stepForm.moduleRoute && (
                <Alert severity="info" sx={{ py: 0.5, borderRadius: 2 }}>
                  Module Route: <code>{stepForm.moduleRoute}</code>
                </Alert>
              )}

              <Grid container spacing={1}>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={<Switch checked={stepForm.isBillingGate} onChange={e => setStepForm(f => ({ ...f, isBillingGate: e.target.checked }))} />}
                    label={<Typography variant="body2">Is Billing Gate</Typography>}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={<Switch checked={stepForm.skipForEmergency} onChange={e => setStepForm(f => ({ ...f, skipForEmergency: e.target.checked }))} />}
                    label={<Typography variant="body2">ER Bypass</Typography>}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={<Switch checked={stepForm.isOptional} onChange={e => setStepForm(f => ({ ...f, isOptional: e.target.checked }))} />}
                    label={<Typography variant="body2">Optional Step</Typography>}
                  />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenStepDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!stepForm.label || !stepForm.statusCode}>
              {editingStep ? 'Update Step' : 'Add Step'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default WorkflowConfig;
