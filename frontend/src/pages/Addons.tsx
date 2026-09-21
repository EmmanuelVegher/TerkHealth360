import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Switch, Button,
  Chip, Avatar, Divider, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton,
} from '@mui/material';
import {
  AccountTree, QrCode2, Security, WhatsApp, Poll,
  CheckCircle, Cancel, Settings as SettingsIcon, Download,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';
interface AddonConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'Core' | 'Communication' | 'Security' | 'Analytics';
  icon: React.ReactNode;
  color: string;
  price: string;
}

const ADDON_DEFS: AddonConfig[] = [
  {
    id: 'multi-branch', name: 'Multi Branch', version: '1.2.0',
    description: 'Manage multiple hospital branches from a single admin panel. Branch-level data isolation, staff assignment and reporting.',
    category: 'Core', icon: <AccountTree />, color: '#3b5bdb', price: 'Premium',
  },
  {
    id: 'qr-attendance', name: 'QR Code Attendance', version: '2.0.1',
    description: 'Generate QR codes for each staff member. Scan to mark attendance with timestamp. Real-time attendance dashboard.',
    category: 'Core', icon: <QrCode2 />, color: '#0ca678', price: 'Free',
  },
  {
    id: '2fa', name: 'Two Factor Authentication', version: '1.0.3',
    description: 'Add an extra layer of security with TOTP-based 2FA (Google Authenticator, Authy). Enforced or optional per role.',
    category: 'Security', icon: <Security />, color: '#f03e3e', price: 'Free',
  },
  {
    id: 'whatsapp', name: 'WhatsApp Messages', version: '1.5.0',
    description: 'Send appointment reminders, lab results, billing notifications and custom messages via WhatsApp Business API.',
    category: 'Communication', icon: <WhatsApp />, color: '#25d366', price: 'Premium',
  },
  {
    id: 'surveys', name: 'Surveys & Polls', version: '1.1.0',
    description: 'Create patient satisfaction surveys and staff polls. View analytics and export responses as CSV.',
    category: 'Analytics', icon: <Poll />, color: '#6741d9', price: 'Free',
  },
];

const Addons = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedAddonId, setSelectedAddonId] = useState<string | null>(null);
  const [addonsState, setAddonsState] = useState<Record<string, { installed: boolean; enabled: boolean }>>(() => {
    const saved = localStorage.getItem('addons_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      'multi-branch': { installed: false, enabled: false },
      'qr-attendance': { installed: true, enabled: true },
      '2fa': { installed: true, enabled: false },
      'whatsapp': { installed: false, enabled: false },
      'surveys': { installed: false, enabled: false },
    };
  });

  const toggle = (id: string, field: 'installed' | 'enabled') => {
    const current = addonsState[id] || { installed: false, enabled: false };
    const nextState = { ...current, [field]: !current[field] };
    // Rules: If uninstalled, must be disabled
    if (field === 'installed' && !nextState.installed) {
      nextState.enabled = false;
    }
    // If enabling but not installed, ignore
    if (field === 'enabled' && !current.installed) {
      return;
    }
    const updated = { ...addonsState, [id]: nextState };
    setAddonsState(updated);
    localStorage.setItem('addons_state', JSON.stringify(updated));
    enqueueSnackbar(
      field === 'installed'
        ? (nextState.installed ? `${id} addon installed` : `${id} addon uninstalled`)
        : (nextState.enabled ? `${id} addon enabled` : `${id} addon disabled`),
      { variant: nextState.installed || nextState.enabled ? 'success' : 'warning' }
    );
  };


  const categoryColor: Record<string, string> = {
    Core: '#3b5bdb', Communication: '#25d366', Security: '#f03e3e', Analytics: '#6741d9',
  };''
  
  const addons = ADDON_DEFS.map((addon) => ({
    ...addon,
    installed: addonsState[addon.id]?.installed ?? false,
    enabled: addonsState[addon.id]?.enabled ?? false,
  }));
  const installedCount = addons.filter((a) => a.installed).length;
  const enabledCount = addons.filter((a) => a.enabled).length;
  const selectedAddon = addons.find((a) => a.id === selectedAddonId);
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Addons</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Install and manage optional modules and integrations</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Download />}>Check for Updates</Button>
      </Box>
      {/* Summary */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Addons', value: addons.length, color: '#3b5bdb' },
          { label: 'Installed', value: installedCount, color: '#2f9e44' },
          { label: 'Enabled', value: enabledCount, color: '#0ca678' },
          { label: 'Available', value: addons.length - installedCount, color: '#f59f00' },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: 'none' }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={800} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {/* Addon cards */}
      <Grid container spacing={2.5}>
      {addons.map((addon) => (
          <Grid item xs={12} sm={6} lg={4} key={addon.id}>
            <Card sx={{
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid',
              borderColor: addon.installed ? alpha(addon.color, 0.25) : 'rgba(0,0,0,0.06)',
              transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' },
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: alpha(addon.color, 0.12), color: addon.color }}>
                    {addon.icon}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>{addon.name}</Typography>
                      <Chip label={`v${addon.version}`} size="small"
                        sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha(addon.color, 0.08), color: addon.color, fontWeight: 600 }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, mt: 0.4 }}>
                      <Chip label={addon.category} size="small"
                        sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha(categoryColor[addon.category], 0.1), color: categoryColor[addon.category], fontWeight: 600 }} />
                      <Chip label={addon.price} size="small"
                        color={addon.price === 'Free' ? 'success' : 'warning'}
                        sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600 }} />
                    </Box>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2} lineHeight={1.5}>
                  {addon.description}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {addon.installed
                      ? <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                      : <Cancel sx={{ fontSize: 16, color: 'text.disabled' }} />}
                    <Typography variant="caption" fontWeight={600} color={addon.installed ? 'success.main' : 'text.secondary'}>
                      {addon.installed ? 'Installed' : 'Not Installed'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {addon.installed && (
                      <>
                        <Typography variant="caption" color="text.secondary">Enabled</Typography>
                        <Switch size="small" checked={addon.enabled} onChange={() => toggle(addon.id, 'enabled')}
                          sx={{ '& .MuiSwitch-thumb': { bgcolor: addon.color } }} />
                         <IconButton size="small" onClick={() => { setSelectedAddonId(addon.id); setConfigOpen(true); }}
                          sx={{ color: 'text.secondary' }}><SettingsIcon fontSize="small" /></IconButton>
                      </>
                    )}
                    <Button
                      size="small" variant={addon.installed ? 'outlined' : 'contained'}
                      color={addon.installed ? 'error' : 'primary'}
                      onClick={() => toggle(addon.id, 'installed')}
                      sx={{ minWidth: 90, fontWeight: 700 }}
                    >
                      {addon.installed ? 'Uninstall' : 'Install'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {/* Config Dialog */}
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Configure — {selectedAddon?.name}</DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Configuration options for this addon will appear here. Adjust settings and save.
          </Typography>
          <TextField label="API Key / Token (if applicable)" fullWidth placeholder="Enter integration key…" />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setConfigOpen(false)} color="inherit">Close</Button>
          <Button variant="contained" onClick={() => { enqueueSnackbar('Addon configured', { variant: 'success' }); setConfigOpen(false); }}>Save Config</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default Addons;