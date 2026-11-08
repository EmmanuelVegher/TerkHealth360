import './utils/fetchPolyfill.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import fhirRoutes from './routes/fhir.js';
import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import departmentsRoutes from './routes/departments.js';
import auditLogsRoutes from './routes/audit.js';
import patientsRoutes from './routes/patients.js';
import familyRoutes from './routes/family.js';
import visitsRoutes from './routes/visits.js';
import insuranceRoutes from './routes/insurance.js';
import emrRoutes from './routes/emr.js';
import reportsRoutes from './routes/reports.js';
import appointmentsRoutes from './routes/appointments.js';
import queuesRoutes from './routes/queues.js';
import portalRoutes from './routes/portal.js';
import nursingRoutes from './routes/nursing.js';
import triageRoutes from './routes/triage.js';
import emarRoutes from './routes/emar.js';
import maternityRoutes from './routes/maternity.js';
import collaborationRoutes from './routes/collaboration.js';
import limsRoutes from './routes/lims.js';
import pharmacyRoutes from './routes/pharmacy.js';
import moniepointRoutes from './routes/moniepoint.js';
import openmrsRoutes from './routes/openmrs.js';
import radiologyRoutes from './routes/radiology.js';
import bloodbankRoutes from './routes/bloodbank.js';
import theatreRoutes from './routes/theatre.js';
import icuRoutes from './routes/icu.js';
import emergencyRoutes from './routes/emergency.js';
import billingRoutes from './routes/billing.js';
import inventoryRoutes from './routes/inventory.js';
import financeRoutes from './routes/finance.js';
import hrRoutes from './routes/hr.js';
import assetsRoutes from './routes/assets.js';
import crmRoutes from './routes/crm.js';
import dmsRoutes from './routes/dms.js';
import notificationsRoutes from './routes/notifications.js';
import securityRoutes from './routes/security.js';
import analyticsRoutes from './routes/analytics.js';
import mortuaryRoutes from './routes/mortuary.js';
import rehabilitationRoutes from './routes/rehabilitation.js';
import architectureRoutes from './routes/architecture.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { setupTriggers } from './utils/setupTriggers.js';
import { seedClinicians } from './utils/seedClinicians.js';
import { startSyncService } from './services/syncService.js';
import { startHealthMonitor } from './services/healthMonitor.js';
import { logFailoverEvent } from './utils/failoverLog.js';
import systemRoutes from './routes/system.js';
import { prepopulateBanks } from './utils/setupBanks.js';
import { ensureRolePermissions } from './utils/ensureRolePermissions.js';
import workflowRoutes, { seedWorkflowTemplates, seedConsultationServices } from './routes/workflow.js';
import configRoutes from './routes/config.js';
import ipdRoutes from './routes/ipd.js';
import wardRosterRoutes from './routes/ward-roster.js';
import wardsRoutes from './routes/wards.js';
import monnifyRoutes from './routes/monnify.js';
import openmedRoutes from './routes/openmed.js';
import terminologyRoutes from './routes/terminology.js';
import medgemmaRoutes from './routes/medgemma.js';
import { ensureSchemaSync } from './utils/ensureSchemaSync.js';
import recordsMigrationRoutes from './routes/recordsMigration.js';
import dentalRoutes from './routes/dental.js';
import ophthalmologyRoutes from './routes/ophthalmology.js';
import nmrsRoutes, { handleNmrsEncounterSavedWebhook } from './routes/nmrs.js';
import interopRoutes from './routes/interop.js';
import dhis2Routes from './routes/dhis2.js';
import privacyRoutes from './routes/privacy.js';
import diseaseClinicsRoutes from './routes/diseaseClinics.js';
import facilitiesRoutes from './routes/facilities.js';
import voiceboxRoutes from './routes/voicebox.js';

import { getLayer } from './services/connectionManager.js';
import { analyzerListener } from './services/analyzerListener.js';
import { warmUpOfflineSTT } from './utils/offlineSpeechToText.js';

dotenv.config();

const app = express();

import { prisma } from './prisma.js';

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
  hsts: false, // Disabled on localhost/LAN to prevent forcing unwanted HTTPS
  contentSecurityPolicy: false, // Prevent upgrade-insecure-requests on localhost
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow Electron (file:// or null origin), localhost, 127.0.0.1, or local LAN IP requests
    if (!origin || origin === 'null' || origin === 'file://' || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return callback(null, true);
    }
    // Allow all in local/production hospital environment
    return callback(null, true);
  },
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve uploaded files (avatars, logos, etc.) publicly
app.use('/uploads', express.static('./uploads'));

// ── Serve the compiled frontend for LAN / tablet access ──────────────────────
// When running inside the packaged Electron app, FRONTEND_DIST_PATH is injected
// by electron-main.cjs. We also automatically discover sibling frontend dist directories
// so that tablets and other PCs can always reach http://<PC_IP>:3000 to use the full React SPA.
function resolveFrontendDist(): string {
  const candidates = [
    process.env.FRONTEND_DIST_PATH,
    path.resolve(process.cwd(), '..', 'frontend-dist'),
    path.resolve(process.cwd(), 'frontend-dist'),
    path.resolve(process.cwd(), '..', 'frontend', 'dist'),
    path.resolve(process.cwd(), 'dist', 'frontend'),
    path.resolve(__dirname, '..', '..', 'frontend', 'dist'),
    path.resolve(__dirname, '..', 'frontend-dist'),
    path.resolve(__dirname, 'frontend-dist'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
        return candidate;
      }
    } catch (_) {}
  }
  return '';
}

const frontendDist = resolveFrontendDist();
if (frontendDist) {
  app.use('/', express.static(frontendDist));
  console.log('[Server] Serving frontend static files from:', frontendDist);
} else {
  console.warn('[Server] No frontend dist folder found for static web serving.');
}

// Health check (public — no auth required)
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Startup status (public — used by login page to show progress)
type StartupPhase = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
};

const startupPhases: StartupPhase[] = [
  { id: 'banks',     label: 'Loading Nigerian Banks & Financial Data', status: 'pending' },
  { id: 'roles',     label: 'Seeding Role & Permission Matrix',        status: 'pending' },
  { id: 'workflow',  label: 'Initializing Workflow Engine',            status: 'pending' },
  { id: 'triggers',  label: 'Installing CDC Database Triggers',        status: 'pending' },
  { id: 'health',    label: 'Starting Health Monitor (All DB Layers)', status: 'pending' },
  { id: 'sync',      label: 'Starting Cloud Sync Service',            status: 'pending' },
  { id: 'server',    label: 'Starting HTTP Server',                   status: 'pending' },
];

let serverReady = false;

app.get(['/startup-status', '/api/startup-status'], (_req, res) => {
  res.json({ ready: serverReady, phases: startupPhases });
});

app.get('/api/staff', authMiddleware, async (req: any, res: any, next: any) => {
  try {
    const { query, startTime, endTime } = req.query;
    const where: any = { isActive: true };
    if (query) {
      const q = (query as string).trim();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { designation: { contains: q } },
        { employeeId: { contains: q } },
      ];
    }
    if (startTime && endTime) {
      const startVal = new Date(startTime as string);
      const endVal = new Date(endTime as string);
      where.calendarBlocks = {
        none: {
          OR: [
            { startTime: { lte: startVal }, endTime: { gte: startVal } },
            { startTime: { lte: endVal }, endTime: { gte: endVal } },
            { startTime: { gte: startVal }, endTime: { lte: endVal } },
          ],
        },
      };
    }
    const staff = await prisma.staff.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
        employeeId: true,
      },
      take: 50,
    });
    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// Routes
app.use('/api/auth', authRoutes);
// Monnify webhook — PUBLIC (no auth, Monnify must reach this directly)
app.post('/api/monnify/webhook', monnifyRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/roles', authMiddleware, rolesRoutes);
app.use('/api/departments', authMiddleware, departmentsRoutes);
app.use('/api/audit-logs', authMiddleware, auditLogsRoutes);
app.use('/api/patients', authMiddleware, patientsRoutes);
app.use('/api/family', authMiddleware, familyRoutes);
app.use('/api/visits', authMiddleware, visitsRoutes);
app.use('/api/insurance', authMiddleware, insuranceRoutes);
app.use('/api/emr', authMiddleware, emrRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/appointments', authMiddleware, appointmentsRoutes);
app.use('/api/queues', authMiddleware, queuesRoutes);
// Public SMART on FHIR Discovery (NHTDAO / NDHA)
app.get([
  '/.well-known/smart-configuration',
  '/api/fhir/.well-known/smart-configuration',
  '/api/fhir/smart-configuration'
], (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/authorize`,
    token_endpoint: `${baseUrl}/api/auth/token`,
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
    registration_endpoint: `${baseUrl}/api/auth/register`,
    scopes_supported: [
      'openid', 'profile', 'launch', 'launch/patient', 'patient/*.read', 'patient/*.write',
      'user/*.read', 'user/*.write', 'offline_access'
    ],
    response_types_supported: ['code'],
    management_endpoint: `${baseUrl}/api/auth/manage`,
    introspection_endpoint: `${baseUrl}/api/auth/introspect`,
    revocation_endpoint: `${baseUrl}/api/auth/revoke`,
    capabilities: [
      'launch-standalone',
      'launch-ehr',
      'client-public',
      'client-confidential-symmetric',
      'context-ehr-patient',
      'context-standalone-patient',
      'permission-patient',
      'permission-user'
    ]
  });
});

app.use('/api/portal', portalRoutes);
app.use('/api/fhir', (req, res, next) => {
  if (req.path === '/metadata' || req.path === '/.well-known/smart-configuration' || req.path === '/smart-configuration') {
    return next();
  }
  return authMiddleware(req, res, next);
}, fhirRoutes);
app.use('/api/terminology', terminologyRoutes);
app.use('/api/nursing', authMiddleware, nursingRoutes);
app.use('/api/triage', authMiddleware, triageRoutes);
app.use('/api/emar', authMiddleware, emarRoutes);
app.use('/api/maternity', authMiddleware, maternityRoutes);
app.use('/api/collaboration', authMiddleware, collaborationRoutes);
app.use('/api/lims', authMiddleware, limsRoutes);
app.use('/api/pharmacy', authMiddleware, pharmacyRoutes);
app.use('/api/moniepoint', authMiddleware, moniepointRoutes);
app.use('/api/monnify', authMiddleware, monnifyRoutes);
app.use('/api/openmrs', authMiddleware, openmrsRoutes);
app.use('/api/radiology', authMiddleware, radiologyRoutes);
app.use('/api/bloodbank', authMiddleware, bloodbankRoutes);
app.use('/api/theatre', authMiddleware, theatreRoutes);
app.use('/api/icu', authMiddleware, icuRoutes);
app.use('/api/emergency', authMiddleware, emergencyRoutes);
app.use('/api/billing', authMiddleware, billingRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/finance', authMiddleware, financeRoutes);
app.use('/api/hr', authMiddleware, hrRoutes);
app.use('/api/assets', authMiddleware, assetsRoutes);
app.use('/api/crm', authMiddleware, crmRoutes);
app.use('/api/dms', authMiddleware, dmsRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);
app.use('/api/security', authMiddleware, securityRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/mortuary', authMiddleware, mortuaryRoutes);
app.use('/api/rehabilitation', authMiddleware, rehabilitationRoutes);
app.use('/api/physiotherapy', authMiddleware, rehabilitationRoutes);
app.use('/api/architecture', authMiddleware, architectureRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/config', (req, res, next) => {
  if (req.path === '/public-info' || (req.path === '/slideshow' && req.method === 'GET')) {
    return next();
  }
  return authMiddleware(req, res, next);
}, configRoutes);
app.use('/api/ipd', ipdRoutes);
app.use('/api/ward-roster', wardRosterRoutes);
app.use('/api/wards', wardsRoutes);
app.use('/api/openmed', openmedRoutes);
app.use('/api/medgemma', authMiddleware, medgemmaRoutes);
app.use('/api/records-migration', authMiddleware, recordsMigrationRoutes);
app.use('/api/dental', authMiddleware, dentalRoutes);
app.use('/api/ophthalmology', authMiddleware, ophthalmologyRoutes);
app.use('/api/disease-clinics', authMiddleware, diseaseClinicsRoutes);

// ── OpenMRS / NMRS AI Real-Time Webhook (External Event-Driven Sync) ─────────
app.post('/api/v1/nmrs/webhook/encounter-saved', handleNmrsEncounterSavedWebhook);
app.post('/api/nmrs/webhook/encounter-saved', handleNmrsEncounterSavedWebhook);

app.use('/api/nmrs', authMiddleware, nmrsRoutes);
app.use('/api/interop', interopRoutes);

// NHTDAO Layer 4: DHIS2 / OpenHEXA Public Health Reporting
app.get('/api/dhis2/openhexa/feed', (req, res, next) => {
  if (req.query.apiKey || req.headers['x-openhexa-key']) {
    return dhis2Routes(req, res, next);
  }
  return authMiddleware(req, res, () => dhis2Routes(req, res, next));
});
app.use('/api/dhis2', authMiddleware, dhis2Routes);
// NHTDAO Layer 5: Privacy-by-Design & NDPC Compliance Auditing
app.use('/api/privacy', authMiddleware, privacyRoutes);

// Federal Ministry of Health (FMoH) Health Facilities Registry (HFR)
app.use('/api/facilities', facilitiesRoutes);

// Local-First Voicebox AI Voice Studio Bridge (TTS, Whisper STT, Hospital PA & MCP)
app.use('/api/voicebox', voiceboxRoutes);


// ── SPA catch-all: return index.html for any non-API route ──────────────────
// This makes client-side routing work when tablets open deep links like
// http://<PC_IP>:3000/dashboard directly.
if (frontendDist) {
  app.get('*', (_req, res) => {
    const indexPath = path.join(frontendDist, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) res.status(404).send('Frontend not found');
    });
  });
}

// Error handling
app.use(errorHandler);

// Global exception and rejection handlers to prevent transient database socket reset errors from crashing Node.js
process.on('uncaughtException', (error) => {
  console.error('[Global Error] Uncaught Exception:', error.message || error, error.stack);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Global Error] Unhandled Rejection:', reason?.message || reason, reason?.stack);
});

// ── Startup ──────────────────────────────────────────────────────────────────
async function bootstrap() {
  const setPhase = (id: string, status: 'pending' | 'running' | 'done' | 'error') => {
    const phase = startupPhases.find(p => p.id === id);
    if (phase) phase.status = status;
  };

  // Start HTTP server immediately
  app.listen(PORT, () => {
    serverReady = true;
    setPhase('server', 'done');
    console.log(`\n┌──────────────────────────────────────────────────────┐`);
    console.log(`│  FF Mission Hospital HMIS API                        │`);
    console.log(`│  Port      : ${PORT}                                   │`);
    console.log(`│  Layer 1   : Neon Cloud — ff_mission_hospital_cloud  │`);
    console.log(`│  Layer 2   : Primary    — localhost:5432             │`);
    console.log(`│  Layer 3   : Standby    — localhost:5433             │`);
    console.log(`│  Layer 4   : Device/Manual offline capture           │`);
    console.log(`│  Failover  : AUTO (health monitor every 10s)         │`);
    console.log(`│  Sync      : ${process.env.SYNC_ONLINE !== 'false' ? 'ONLINE ✓  every 5s                       ' : 'OFFLINE (queuing only)                   '}│`);
    console.log(`│  Env       : ${(process.env.NODE_ENV || 'development').padEnd(38)}│`);
    console.log(`└──────────────────────────────────────────────────────┘\n`);
  });

  // Background initialization
  try {
    await ensureSchemaSync().catch((e) => console.warn('[SchemaSync] Non-fatal check error:', e.message));

    setPhase('banks', 'running');
    await prepopulateBanks().catch(() => {});
    setPhase('banks', 'done');

    setPhase('roles', 'running');
    await ensureRolePermissions().catch(() => {});
    setPhase('roles', 'done');

    setPhase('workflow', 'running');
    await seedWorkflowTemplates().catch(() => {});
    await seedConsultationServices().catch(() => {});
    setPhase('workflow', 'done');

    setPhase('triggers', 'running');
    await setupTriggers().catch(() => {});
    await seedClinicians().catch(() => {});
    setPhase('triggers', 'done');

    setPhase('health', 'running');
    startHealthMonitor();
    setPhase('health', 'done');

    setPhase('sync', 'running');
    await startSyncService().catch(() => {});
    setPhase('sync', 'done');

    logFailoverEvent({
      eventType:   'STARTUP',
      description: 'FF Mission Hospital API server started. Four-layer failover active.',
      metadata: {
        layers:       ['CLOUD :Neon', 'PRIMARY :5432', 'STANDBY :5433'],
        syncInterval: process.env.SYNC_INTERVAL_MS,
        healthCheck:  process.env.HEALTH_CHECK_INTERVAL_MS,
      },
    });

    analyzerListener.start();
    warmUpOfflineSTT();
  } catch (err) {
    console.error('[Bootstrap] Non-fatal initialization warning:', err);
  }
}

bootstrap().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

// Reload trigger
export { prisma };
