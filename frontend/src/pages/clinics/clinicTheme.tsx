import React from 'react';
import { Coronavirus, Masks, BugReport, Vaccines, ChildCare, PregnantWoman, Sick } from '@mui/icons-material';

export const PROGRAM_ICONS: Record<string, React.ReactElement> = {
  'hiv-art': <Coronavirus />,
  'tb-dots': <Masks />,
  malaria: <BugReport />,
  immunization: <Vaccines />,
  'polio-afp': <Sick />,
  mch: <PregnantWoman />,
};
export const ChildIcon = ChildCare;

export const PROGRAM_COLORS: Record<string, string> = {
  'hiv-art': '#e11d48', 'tb-dots': '#d97706', malaria: '#059669',
  immunization: '#2563eb', 'polio-afp': '#7c3aed', mch: '#db2777',
};

export const gradient = (c: string) => `linear-gradient(135deg, ${c} 0%, ${c}cc 55%, ${c}88 100%)`;

export const glass = {
  background: 'rgba(255,255,255,0.78)',
  backdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
  borderRadius: 4,
} as const;

export interface ProgramSummary {
  id: string; title: string; subtitle: string; color: string; standards: string; categories: string[];
  patients: number; encounters: number; last30: number; active30: number; forms: number; sparkline: { m: string; v: number }[];
}

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
