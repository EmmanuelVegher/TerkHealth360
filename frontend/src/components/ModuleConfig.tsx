import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Switch, FormControlLabel, CircularProgress, Divider } from '@mui/material';
import { ViewModule } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';

export const ModuleConfig = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/config/modules');
      if (res.data?.success) {
        setConfigs(res.data.data);
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load module configuration', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggle = async (moduleKey: string, currentStatus: boolean) => {
    try {
      const res = await api.put(`/config/modules/${moduleKey}`, { isActive: !currentStatus });
      if (res.data?.success) {
        enqueueSnackbar(`${moduleKey} module ${!currentStatus ? 'activated' : 'deactivated'}`, { variant: 'success' });
        fetchConfigs();
        // Force a page reload so sidebar can update its state
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      enqueueSnackbar('Failed to update module', { variant: 'error' });
    }
  };

  return (
    <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 3, mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ViewModule color="primary" /> Module Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Activate or deactivate hospital departments based on your operational needs. Deactivated modules will be hidden from the sidebar.
        </Typography>

        {loading ? (
          <CircularProgress size={24} />
        ) : (
          <Grid container spacing={2}>
            {configs.map((config) => (
              <Grid item xs={12} sm={6} md={4} key={config.moduleKey}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.isActive}
                      onChange={() => handleToggle(config.moduleKey, config.isActive)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={600}>
                      {config.description || config.moduleKey}
                    </Typography>
                  }
                />
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};
