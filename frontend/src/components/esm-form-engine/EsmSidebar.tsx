/**
 * OpenMRS ESM Form Engine Sidebar Navigation
 * Replicates sidebar from @openmrs/esm-form-engine-lib/src/components/sidebar
 */

import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Divider,
  Paper,
} from '@mui/material';
import {
  DescriptionOutlined as PageIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as ErrorIcon,
  UnfoldMore as ExpandAllIcon,
  UnfoldLess as CollapseAllIcon,
} from '@mui/icons-material';
import { FormPage } from './types';

interface EsmSidebarProps {
  pages: FormPage[];
  activePageIndex: number;
  onSelectPage: (index: number) => void;
  pageErrors: Record<number, number>;
  forceExpandAll: boolean;
  onToggleExpandAll: () => void;
}

export const EsmSidebar: React.FC<EsmSidebarProps> = ({
  pages,
  activePageIndex,
  onSelectPage,
  pageErrors,
  forceExpandAll,
  onToggleExpandAll,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        width: 260,
        flexShrink: 0,
        bgcolor: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Box mb={2}>
        <Typography variant="overline" sx={{ fontWeight: 800, color: '#64748b', letterSpacing: 1 }}>
          Form Navigation
        </Typography>
        <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>
          {pages.length} {pages.length === 1 ? 'Page' : 'Pages'}
        </Typography>
      </Box>

      <List sx={{ p: 0, flex: 1, overflowY: 'auto' }}>
        {pages.map((page, idx) => {
          const isSelected = activePageIndex === idx;
          const errorCount = pageErrors[idx] || 0;
          return (
            <ListItemButton
              key={page.id || `page-${idx}`}
              selected={isSelected}
              onClick={() => onSelectPage(idx)}
              sx={{
                borderRadius: 2,
                mb: 1,
                py: 1,
                px: 1.5,
                bgcolor: isSelected ? '#e0f2fe !important' : 'transparent',
                border: isSelected ? '1px solid #7dd3fc' : '1px solid transparent',
                '&:hover': { bgcolor: '#f1f5f9' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: isSelected ? '#0284c7' : '#94a3b8' }}>
                <PageIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#0369a1' : '#1e293b',
                      fontSize: '0.85rem',
                    }}
                  >
                    {page.label}
                  </Typography>
                }
              />
              {errorCount > 0 ? (
                <Chip
                  size="small"
                  label={errorCount}
                  color="error"
                  sx={{ height: 20, minWidth: 20, fontSize: '0.7rem', fontWeight: 700 }}
                />
              ) : (
                <CheckIcon sx={{ fontSize: 16, color: '#10b981' }} />
              )}
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ my: 2 }} />

      <Button
        fullWidth
        size="small"
        variant="outlined"
        startIcon={forceExpandAll ? <CollapseAllIcon /> : <ExpandAllIcon />}
        onClick={onToggleExpandAll}
        sx={{
          textTransform: 'none',
          borderRadius: 2,
          color: '#475569',
          borderColor: '#cbd5e1',
          fontSize: '0.8rem',
        }}
      >
        {forceExpandAll ? 'Collapse All' : 'Expand All'}
      </Button>
    </Paper>
  );
};
