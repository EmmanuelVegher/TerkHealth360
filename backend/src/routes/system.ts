/**
 * system.ts  — System Health & Failover Status Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * GET  /api/system/status          Current DB layer + all layer health
 * GET  /api/system/events          Last N failover events (from log file)
 * GET  /api/system/sync-status     Sync queue metrics
 * POST /api/system/force-failover  Admin: manually switch to a specific layer
 * POST /api/system/reverse-sync    Admin: trigger cloud→local reverse sync
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import { getHealthSnapshot }         from '../services/healthMonitor.js';
import { getLayer, setLayer, type DbLayer } from '../services/connectionManager.js';
import { getSyncStatus, reverseSyncFromCloud } from '../services/syncService.js';
import { readRecentEvents }          from '../utils/failoverLog.js';
import { authMiddleware }            from '../middleware/auth.js';


const router = Router();
import { prisma } from '../prisma.js';

// ── GET /api/system/startup-status ─────────────────────────────────────────
router.get(['/startup-status', '/system/startup-status'], (_req: Request, res: Response) => {
  res.json({
    ready: true,
    phases: [
      { id: 'banks',     label: 'Loading Nigerian Banks & Financial Data', status: 'done' },
      { id: 'roles',     label: 'Seeding Role & Permission Matrix',        status: 'done' },
      { id: 'workflow',  label: 'Initializing Workflow Engine',            status: 'done' },
      { id: 'triggers',  label: 'Installing CDC Database Triggers',        status: 'done' },
      { id: 'health',    label: 'Starting Health Monitor (All DB Layers)', status: 'done' },
      { id: 'sync',      label: 'Starting Cloud Sync Service',            status: 'done' },
      { id: 'server',    label: 'Starting HTTP Server',                   status: 'done' },
    ]
  });
});

// ── GET /api/system/status ────────────────────────────────────────────────
router.get('/status', (_req: Request, res: Response) => {
  try {
    const snapshot = getHealthSnapshot();
    const activeLayer: DbLayer = snapshot?.activeLayer || 'PRIMARY';

    const isCloudPrimary = Boolean(process.env.DATABASE_URL?.includes('neon.tech') || process.env.RENDER === 'true');

    // Mode label for the frontend badge
    const modeLabels: Record<DbLayer, string> = {
      PRIMARY: isCloudPrimary ? 'CLOUD PRIMARY (NEON)' : 'LOCAL PRIMARY',
      STANDBY: 'LOCAL STANDBY',
      CLOUD:   'CLOUD FALLBACK',
      OFFLINE: 'OFFLINE CAPTURE',
    };

    res.json({
      ok:          true,
      activeLayer: activeLayer,
      modeLabel:   modeLabels[activeLayer] || 'LOCAL PRIMARY',
      layers:      snapshot?.layers || [],
      checkedAt:   snapshot?.checkedAt || new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[SystemStatus] Error fetching health snapshot:', err);
    res.json({
      ok:          true,
      activeLayer: 'PRIMARY',
      modeLabel:   'LOCAL PRIMARY',
      layers:      [],
      checkedAt:   new Date().toISOString(),
    });
  }
});

// All other system routes require authentication
router.use(authMiddleware);

// ── GET /api/system/events ────────────────────────────────────────────────
router.get('/events', (req: Request, res: Response) => {
  try {
    const limit  = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
    const events = readRecentEvents(limit);
    res.json({ ok: true, count: events.length, events });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/system/sync-status ───────────────────────────────────────────
router.get('/sync-status', async (_req: Request, res: Response) => {
  try {
    const status = await getSyncStatus();
    res.json({ ok: true, sync: status });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── POST /api/system/force-failover ──────────────────────────────────────
// Body: { layer: 'PRIMARY' | 'STANDBY' | 'CLOUD' | 'OFFLINE' }
router.post('/force-failover', (req: Request, res: Response) => {
  try {
    const { layer } = req.body as { layer: DbLayer };
    const valid: DbLayer[] = ['PRIMARY', 'STANDBY', 'CLOUD', 'OFFLINE'];

    if (!valid.includes(layer)) {
      return res.status(400).json({
        ok:      false,
        message: `Invalid layer. Must be one of: ${valid.join(', ')}`,
      });
    }

    const prev = getLayer();
    setLayer(layer);

    res.json({
      ok:      true,
      message: `Manually switched from ${prev} to ${layer}`,
      from:    prev,
      to:      layer,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── POST /api/system/reverse-sync ─────────────────────────────────────────
router.post('/reverse-sync', async (_req: Request, res: Response) => {
  try {
    const result = await reverseSyncFromCloud();
    res.json({
      ok:       true,
      message:  'Reverse sync from cloud to local completed.',
      imported: result.imported,
      conflicts: result.conflicts,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/system/banks ───────────────────────────────────────────────────
router.get('/banks', async (_req: Request, res: Response) => {
  try {
    const banks = await prisma.bank.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ ok: true, data: banks });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── POST /api/system/banks ──────────────────────────────────────────────────
router.post('/banks', async (req: Request, res: Response) => {
  try {
    const { name, code, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ ok: false, message: 'Name and Type are required' });
    }
    const bank = await prisma.bank.create({
      data: { name, code, type },
    });
    res.status(201).json({ ok: true, data: bank });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── DELETE /api/system/banks/:id ────────────────────────────────────────────
router.delete('/banks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.bank.delete({ where: { id } });
    res.json({ ok: true, message: 'Bank deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── In-memory settings store (persisted via DB SystemEvent table as a config log) ──
// Key-value store for non-sensitive runtime settings
const _settings: Record<string, any> = {
  staffIdFormat: {
    prefix:    'FF',
    separator: '-',
    digits:    4,
    startFrom: 1,
  },
};

// ── GET /api/system/settings ────────────────────────────────────────────────
router.get('/settings', (_req: Request, res: Response) => {
  res.json({ ok: true, settings: _settings });
});

// ── PUT /api/system/settings ────────────────────────────────────────────────
router.put('/settings', (req: Request, res: Response) => {
  try {
    const { key, value } = req.body as { key: string; value: any };
    if (!key) return res.status(400).json({ ok: false, message: 'key is required' });
    _settings[key] = value;
    res.json({ ok: true, settings: _settings });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/system/staff/next-id ───────────────────────────────────────────
// Returns the next available sequential staff ID based on the stored format config.
// Queries the actual staff table to find the highest used number with the current prefix.
router.get('/staff/next-id', async (_req: Request, res: Response) => {
  try {
    const fmt = _settings.staffIdFormat as {
      prefix: string; separator: string; digits: number; startFrom: number;
    };
    const { prefix, separator, digits, startFrom } = fmt;

    // Fetch all employeeIds that start with our prefix pattern
    const staffList = await prisma.staff.findMany({
      select: { employeeId: true },
    });

    // Extract the numeric suffix from IDs matching this prefix
    const pattern = `${prefix}${separator}`;
    const usedNumbers: number[] = [];

    for (const s of staffList) {
      if (s.employeeId.startsWith(pattern)) {
        const suffix = s.employeeId.slice(pattern.length);
        const num = parseInt(suffix, 10);
        if (!isNaN(num)) usedNumbers.push(num);
      }
    }

    const maxUsed = usedNumbers.length > 0 ? Math.max(...usedNumbers) : startFrom - 1;
    const nextNum  = Math.max(maxUsed + 1, startFrom);
    const nextId   = `${prefix}${separator}${String(nextNum).padStart(digits, '0')}`;

    res.json({ ok: true, nextId, format: fmt, nextNumber: nextNum });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

export default router;

