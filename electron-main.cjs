const { app, BrowserWindow, Menu, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow = null;
let backendProcess = null;

// Determine environment
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const APP_TITLE = 'Faith Foundation Hospital Management System';
const BACKEND_PORT = process.env.PORT || 3000;
const FRONTEND_DEV_URL = 'http://localhost:5173';
const FRONTEND_DEV_URL_FALLBACK = 'http://127.0.0.1:5173';

/**
 * Poll the Vite dev server until it responds (up to maxTries * delayMs ms).
 * Returns the first URL that responds, or null if both fail.
 */
function waitForViteServer(maxTries = 40, delayMs = 500) {
  return new Promise((resolve) => {
    let attempts = 0;
    function tryUrl(url) {
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve(url);
        } else {
          scheduleRetry();
        }
      });
      req.on('error', scheduleRetry);
      req.setTimeout(800, () => { req.destroy(); scheduleRetry(); });
    }
    function scheduleRetry() {
      attempts++;
      if (attempts >= maxTries) {
        console.warn('[Electron] Vite dev server not reachable after ' + maxTries + ' attempts. Trying fallback URL.');
        // Try 127.0.0.1 as one final attempt
        const fallbackReq = http.get(FRONTEND_DEV_URL_FALLBACK, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 500 ? FRONTEND_DEV_URL_FALLBACK : null);
        });
        fallbackReq.on('error', () => resolve(null));
        fallbackReq.setTimeout(1500, () => { fallbackReq.destroy(); resolve(null); });
        return;
      }
      setTimeout(() => tryUrl(FRONTEND_DEV_URL), delayMs);
    }
    tryUrl(FRONTEND_DEV_URL);
  });
}

/**
 * Check if the backend server is already reachable on the expected port
 */
function checkBackendHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Find the system Node.js executable.
 * process.execPath in a packaged Electron app is the ELECTRON binary, not node.
 * We search multiple well-known locations so the backend starts reliably.
 */
function findNodeBin() {
  const candidates = [
    // 1. Bundled node.exe shipped inside resources/ (ideal for air-gapped machines)
    app.isPackaged ? path.join(process.resourcesPath, 'node.exe') : null,
    // 2. Standard Windows install paths
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
    path.join(process.env.APPDATA || '', '..', 'Local', 'Programs', 'nodejs', 'node.exe'),
    // 3. nvm-windows
    path.join(process.env.APPDATA || '', 'nvm', 'current', 'node.exe'),
    // 4. Scan every directory on PATH
    ...(process.env.PATH || '').split(';').map(p => path.join(p.trim(), 'node.exe')),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        console.log('[Electron] Found node.exe at:', candidate);
        return candidate;
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Launch backend process in background if not already running
 */
async function ensureBackendRunning() {
  const isRunning = await checkBackendHealth(BACKEND_PORT);
  if (isRunning) {
    console.log(`[Electron] Backend is already active on port ${BACKEND_PORT}.`);
    return;
  }

  console.log('[Electron] Starting internal backend server...');
  const backendDir = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, 'backend');
  const backendEntryPath = path.join(backendDir, 'dist', 'server.js');

  if (!fs.existsSync(backendEntryPath)) {
    console.error('[Electron] Backend entry not found at:', backendEntryPath);
    return;
  }

  // Read .env from the backend dir and inject into the child process environment
  const envFromFile = {};
  const envFilePath = path.join(backendDir, '.env');
  if (fs.existsSync(envFilePath)) {
    const envContent = fs.readFileSync(envFilePath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envFromFile[key] = val;
    }
    console.log('[Electron] Loaded .env from:', envFilePath);
  } else {
    console.warn('[Electron] No .env file found at:', envFilePath);
  }

  // Find node.exe — process.execPath is the Electron binary, NOT node
  const nodeBin = findNodeBin();
  if (!nodeBin) {
    console.error('[Electron] Could not find node.exe. Backend will not start.');
    console.error('[Electron] Please install Node.js v18+ from https://nodejs.org/');
    return;
  }

  try {
    backendProcess = spawn(nodeBin, [backendEntryPath], {
      cwd: backendDir,
      env: {
        ...process.env,
        ...envFromFile,
        PORT: String(BACKEND_PORT),
        NODE_ENV: 'production',
      },
      stdio: 'inherit'
    });

    backendProcess.on('error', (err) => {
      console.error('[Electron] Failed to start backend process:', err);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Electron] Backend process exited with code ${code}, signal ${signal}`);
      backendProcess = null;
    });

    console.log('[Electron] Backend spawned — PID:', backendProcess.pid, '| node:', nodeBin);
  } catch (err) {
    console.warn('[Electron] Could not spawn backend:', err.message);
  }
}

/**
 * Create the main desktop application window
 */
function createMainWindow() {
  // Resolve icon paths — prefer .ico on Windows, fall back to .png
  const iconBaseDev = path.join(__dirname, 'frontend', 'public');
  const iconBaseProd = process.resourcesPath;

  const icoPaths = app.isPackaged
    ? [path.join(iconBaseProd, 'app-icon.ico')]
    : [path.join(iconBaseDev, 'app-icon.ico')];

  const pngPaths = app.isPackaged
    ? [path.join(iconBaseProd, 'app-icon.png')]
    : [path.join(iconBaseDev, 'app-icon.png')];

  const iconFile = [...icoPaths, ...pngPaths].find(p => {
    try { return fs.existsSync(p); } catch { return false; }
  });

  let appIcon;
  if (iconFile) {
    try {
      appIcon = nativeImage.createFromPath(iconFile);
      if (appIcon.isEmpty()) {
        console.warn('[Electron] nativeImage loaded but is empty for:', iconFile);
        appIcon = undefined;
      } else {
        console.log('[Electron] Loaded icon from:', iconFile);
      }
    } catch (e) {
      console.warn('[Electron] Failed to load icon via nativeImage:', e.message);
    }
  } else {
    console.warn('[Electron] No icon file found in expected locations.');
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: APP_TITLE,
    icon: appIcon,
    backgroundColor: '#0f172a',
    show: false, // Don't show until ready-to-show to avoid blank white flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'frontend', 'electron-preload.cjs')
    }
  });

  // Keep title locked to the hospital brand
  mainWindow.setTitle(APP_TITLE);
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
    mainWindow.setTitle(APP_TITLE);
  });

  // Reveal window once UI is rendered
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links in native browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Load the application
  if (isDev) {
    // Wait for Vite dev server then load
    waitForViteServer().then((devUrl) => {
      if (devUrl) {
        console.log('[Electron] Loading dev server from:', devUrl);
        mainWindow.loadURL(devUrl).catch(() => {
          console.log('[Electron] loadURL failed, loading local build file...');
          loadDistFile();
        });
      } else {
        console.log('[Electron] Dev server not available, loading local build file...');
        loadDistFile();
      }
    });
  } else {
    // In production: load the frontend immediately, backend starts concurrently
    // (API calls will naturally fail/retry until backend is ready)
    loadDistFile();
  }

  function waitForBackendThenLoad(maxWaitMs = 30000) {
    const start = Date.now();
    function poll() {
      checkBackendHealth(BACKEND_PORT).then((ok) => {
        if (ok) {
          console.log('[Electron] Backend ready. Loading frontend...');
          loadDistFile();
        } else if (Date.now() - start < maxWaitMs) {
          setTimeout(poll, 500);
        } else {
          console.warn('[Electron] Backend did not start in time. Loading frontend anyway...');
          loadDistFile();
        }
      });
    }
    poll();
  }

  function loadDistFile() {
    // In a packaged asar, app.getAppPath() points inside the asar — check there first
    const possiblePaths = [
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(app.getAppPath(), 'index.html'),
      path.join(__dirname, 'dist', 'index.html'),
      path.join(__dirname, 'frontend', 'dist', 'index.html'),
      path.join(__dirname, 'index.html'),
    ];

    console.log('[Electron] Searching for index.html in:');
    possiblePaths.forEach(p => {
      const exists = (() => { try { return fs.existsSync(p); } catch { return false; } })();
      console.log(`  [${exists ? 'FOUND' : '    '}] ${p}`);
    });

    const validPath = possiblePaths.find((p) => {
      try { return fs.existsSync(p); } catch (e) { return false; }
    });

    const target = validPath || path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('[Electron] Loading:', target);
    mainWindow.loadFile(target).catch((err) => {
      console.error('[Electron] Failed to load index.html from ' + target, err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Build application native menu
 */
function createMenu() {
  const template = [
    {
      label: 'Faith Foundation Hospital',
      submenu: [
        { role: 'about', label: `About ${APP_TITLE}` },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: `Hide ${APP_TITLE}` },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: `Quit ${APP_TITLE}` }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Cleanly terminate background processes on Windows & Unix
 */
function killBackend() {
  if (backendProcess) {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${backendProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        backendProcess.kill('SIGTERM');
      }
    } catch (e) {
      try { backendProcess.kill('SIGKILL'); } catch (err) {}
    }
    backendProcess = null;
  }
}

// App lifecycle
// IMPORTANT: Must be set before app is ready on Windows for taskbar icon to work
if (process.platform === 'win32') {
  app.setAppUserModelId('com.terkage.faithfoundationhospital');
}

app.whenReady().then(async () => {
  if (app.setAboutPanelOptions) {
    app.setAboutPanelOptions({
      applicationName: APP_TITLE,
      applicationVersion: '1.0.0',
      copyright: 'Copyright © 2026 Terk-Age LTD. All rights reserved.',
      credits: 'Published & Maintained by Terk-Age LTD',
      authors: ['Terk-Age LTD']
    });
  }
  createMenu();
  await ensureBackendRunning();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  killBackend();
  app.quit();
});

app.on('before-quit', () => {
  killBackend();
});

app.on('will-quit', () => {
  killBackend();
});
