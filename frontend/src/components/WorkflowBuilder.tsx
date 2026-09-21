import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Select, MenuItem, Button, Grid, Chip } from '@mui/material';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AccountTree, Save, DragIndicator } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

const AVAILABLE_BLOCKS = [
  { id: 'opd', label: 'OPD Consultation', statusCode: 'WAITING_CONSULTATION', assignedRole: 'DOCTOR', module: 'opd', moduleRoute: '/opd', configKey: 'OPD' },
  { id: 'ipd', label: 'IPD/Ward Admission', statusCode: 'ADMITTED', assignedRole: 'NURSE', module: 'ipd', moduleRoute: '/ipd', configKey: 'IPD' },
  { id: 'pathology', label: 'Pathology & Laboratory', statusCode: 'AWAITING_INVESTIGATION', assignedRole: 'LAB_TECHNICIAN', module: 'lims', moduleRoute: '/lims', configKey: 'PATHOLOGY' },
  { id: 'radiology', label: 'Radiology & Imaging', statusCode: 'WAITING_IMAGING', assignedRole: 'RADIOLOGIST', module: 'radiology', moduleRoute: '/radiology', configKey: 'RADIOLOGY' },
  { id: 'blood_bank', label: 'Blood Bank', statusCode: 'WAITING_BLOOD', assignedRole: 'PHARMACIST', module: 'bloodbank', moduleRoute: '/blood-bank', configKey: 'BLOOD_BANK' },
  { id: 'operating_theatre', label: 'Operating Theatre', statusCode: 'IN_SURGERY', assignedRole: 'SURGEON', module: 'theatre', moduleRoute: '/theatre', configKey: 'OPERATING_THEATRE' },
  { id: 'icu', label: 'Intensive Care (ICU)', statusCode: 'IN_ICU', assignedRole: 'DOCTOR', module: 'icu', moduleRoute: '/icu', configKey: 'ICU' },
  { id: 'emergency', label: 'Accident & Emergency', statusCode: 'IN_EMERGENCY', assignedRole: 'DOCTOR', module: 'emergency', moduleRoute: '/emergency', configKey: 'EMERGENCY' },
  { id: 'maternity', label: 'Maternity Ward', statusCode: 'IN_MATERNITY', assignedRole: 'MIDWIFE', module: 'maternity', moduleRoute: '/maternity', configKey: 'MATERNITY' },
  { id: 'labour_delivery', label: 'Labour & Delivery Ward', statusCode: 'IN_LABOUR', assignedRole: 'MIDWIFE', module: 'maternity', moduleRoute: '/labour-ward', configKey: 'MATERNITY' },
  { id: 'labour_delivered', label: 'Delivered (Birth Record)', statusCode: 'DELIVERED', assignedRole: 'MIDWIFE', module: 'maternity', moduleRoute: '/labour-ward', configKey: 'MATERNITY' },
  { id: 'labour_recovery', label: 'Post-Delivery Recovery', statusCode: 'RECOVERY', assignedRole: 'NURSE', module: 'maternity', moduleRoute: '/labour-ward', configKey: 'MATERNITY' },
  { id: 'physio', label: 'Physiotherapy SOAP Assessment', statusCode: 'IN_TRIAGE', assignedRole: 'PHYSIOTHERAPIST', module: 'rehabilitation', moduleRoute: '/rehabilitation', configKey: 'PHYSIO' },
  { id: 'physio_mirror', label: 'Kinematic Biofeedback Mirror & Therapy', statusCode: 'IN_CONSULTATION', assignedRole: 'PHYSIOTHERAPIST', module: 'rehabilitation', moduleRoute: '/rehabilitation/mirror', configKey: 'PHYSIO' },
  { id: 'physio_hep', label: 'Discharge / Home Exercise Program (HEP)', statusCode: 'DISCHARGED', assignedRole: 'PHYSIOTHERAPIST', module: 'rehabilitation', moduleRoute: '/rehabilitation', configKey: 'PHYSIO' },
  { id: 'mortuary', label: 'Mortuary & Funeral', statusCode: 'IN_MORTUARY', assignedRole: 'MORTICIAN', module: 'mortician', moduleRoute: '/mortuary', configKey: 'MORTUARY' },
  { id: 'pharmacy', label: 'Pharmacy', statusCode: 'WAITING_PHARMACY', assignedRole: 'PHARMACIST', module: 'pharmacy', moduleRoute: '/pharmacy', configKey: 'PHARMACY' },
  { id: 'triage', label: 'Nursing Triage', statusCode: 'WAITING_TRIAGE', assignedRole: 'NURSE', module: 'nursing', moduleRoute: '/nursing', configKey: 'OPD' },
  { id: 'billing', label: 'Billing / Cashier', statusCode: 'AWAITING_PAYMENT', assignedRole: 'RECEPTIONIST', module: 'billing', moduleRoute: '/billing', isBillingGate: true, configKey: 'OPD' },
];

export const WorkflowBuilder = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [activeSteps, setActiveSteps] = useState<any[]>([]);
  const [configs, setConfigs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchConfigs();
    fetchTemplates();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/config/modules');
      if (res.data?.success) {
        const cfgObj: Record<string, boolean> = {};
        res.data.data.forEach((mod: any) => { cfgObj[mod.moduleKey] = mod.isActive; });
        setConfigs(cfgObj);
      }
    } catch (err) { console.error(err); }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/workflow/templates');
      setTemplates(res.data.data || []);
      if (res.data.data?.length > 0 && !selectedTemplateId) {
        handleSelectTemplate(res.data.data[0].id, res.data.data);
      }
    } catch (err) { console.error(err); }
  };

  const handleSelectTemplate = async (id: string, allTemplates = templates) => {
    setSelectedTemplateId(id);
    try {
      const res = await api.get(`/workflow/templates/${id}`);
      setActiveSteps(res.data.data.steps || []);
    } catch (err) { console.error(err); }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === 'palette' && destination.droppableId === 'activeFlow') {
      // Adding a new block to the flow
      const block = AVAILABLE_BLOCKS[source.index];
      const newStep = {
        id: `temp-${Date.now()}`,
        templateId: selectedTemplateId,
        label: block.label,
        statusCode: block.statusCode,
        assignedRole: block.assignedRole,
        module: block.module,
        moduleRoute: block.moduleRoute,
        isBillingGate: block.isBillingGate || false,
        isOptional: false,
        stepOrder: destination.index + 1
      };
      const newSteps = Array.from(activeSteps);
      newSteps.splice(destination.index, 0, newStep);
      setActiveSteps(newSteps);
    } else if (source.droppableId === 'activeFlow' && destination.droppableId === 'activeFlow') {
      // Reordering within the active flow
      const newSteps = Array.from(activeSteps);
      const [moved] = newSteps.splice(source.index, 1);
      newSteps.splice(destination.index, 0, moved);
      setActiveSteps(newSteps);
    }
  };

  const saveFlow = async () => {
    try {
      // First, create any new steps (they have temp- IDs)
      for (let i = 0; i < activeSteps.length; i++) {
        const step = activeSteps[i];
        if (step.id.startsWith('temp-')) {
          const res = await api.post(`/workflow/templates/${selectedTemplateId}/steps`, {
            label: step.label,
            statusCode: step.statusCode,
            assignedRole: step.assignedRole,
            module: step.module,
            moduleRoute: step.moduleRoute,
            isBillingGate: step.isBillingGate,
            stepOrder: i + 1
          });
          activeSteps[i].id = res.data.data.id;
        }
      }

      // Then save the order
      const stepIds = activeSteps.map(s => s.id);
      await api.put(`/workflow/templates/${selectedTemplateId}/reorder`, { steps: stepIds });
      enqueueSnackbar('Workflow saved successfully', { variant: 'success' });
      handleSelectTemplate(selectedTemplateId); // Refresh
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to save workflow', { variant: 'error' });
    }
  };

  const removeStep = async (stepId: string, index: number) => {
    if (!window.confirm('Remove this step from the workflow?')) return;
    if (!stepId.startsWith('temp-')) {
      try {
        await api.delete(`/workflow/steps/${stepId}`);
      } catch (err) {
        enqueueSnackbar('Failed to delete step', { variant: 'error' });
        return;
      }
    }
    const newSteps = Array.from(activeSteps);
    newSteps.splice(index, 1);
    setActiveSteps(newSteps);
  };

  // Filter out blocks that belong to deactivated modules
  const availableBlocksFiltered = AVAILABLE_BLOCKS.filter(b => configs[b.configKey] !== false);

  return (
    <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 3, mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountTree color="primary" /> Patient Flow Workflow Builder
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Select
              size="small"
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </Select>
            <Button variant="contained" startIcon={<Save />} onClick={saveFlow}>
              Save Flow
            </Button>
          </Box>
        </Box>

        <DragDropContext onDragEnd={onDragEnd}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Available Departments (Drag)</Typography>
              <Droppable droppableId="palette" isDropDisabled={true}>
                {(provided) => (
                  <Box {...provided.droppableProps} ref={provided.innerRef} sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 2, borderRadius: 2, minHeight: 400 }}>
                    {availableBlocksFiltered.map((block, index) => (
                      <Draggable key={block.id} draggableId={block.id} index={index}>
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              p: 1.5, mb: 1.5, bgcolor: '#fff', border: '1px solid #ddd', borderRadius: 2,
                              display: 'flex', alignItems: 'center', gap: 1,
                              boxShadow: snapshot.isDragging ? 3 : 1
                            }}
                          >
                            <DragIndicator sx={{ color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight={600}>{block.label}</Typography>
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Grid>

            <Grid item xs={12} md={8}>
              <Typography variant="subtitle2" fontWeight={700} mb={2}>Active Patient Flow (Drop & Reorder)</Typography>
              <Droppable droppableId="activeFlow">
                {(provided) => (
                  <Box {...provided.droppableProps} ref={provided.innerRef} sx={{ bgcolor: 'rgba(59, 91, 219, 0.05)', p: 2, borderRadius: 2, minHeight: 400 }}>
                    {activeSteps.map((step, index) => (
                      <Draggable key={step.id} draggableId={step.id} index={index}>
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              p: 1.5, mb: 1, bgcolor: '#fff', border: '1px solid #3b5bdb', borderRadius: 2,
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              boxShadow: snapshot.isDragging ? 4 : 1
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Chip label={index + 1} size="small" color="primary" />
                              <DragIndicator sx={{ color: 'primary.main' }} />
                              <Box>
                                <Typography variant="body2" fontWeight={700}>{step.label}</Typography>
                                <Typography variant="caption" color="text.secondary">State: {step.statusCode}</Typography>
                              </Box>
                            </Box>
                            <Button size="small" color="error" onClick={() => removeStep(step.id, index)}>Remove</Button>
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Grid>
          </Grid>
        </DragDropContext>
      </CardContent>
    </Card>
  );
};
