const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let backendProcess = null;

// Determine environment
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const APP_TITLE = 'Faith Foundation Hospital Management System';
const BACKEND_PORT = process.env.PORT || 3000;
const FRONTEND_DEV_URL = 'http://localhost:5173';

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
 * Launch backend process in background if not already running
 */
async function ensureBackendRunning() {
  const isRunning = await checkBackendHealth(BACKEND_PORT);
  if (isRunning) {
    console.log(`[Electron] Backend is already active on port ${BACKEND_PORT}.`);
    return;
  }

  console.log('[Electron] Starting internal backend server...');
  const backendEntryPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'dist', 'index.js')
    : path.join(__dirname, 'backend', 'dist', 'index.js');

  try {
    backendProcess = fork(backendEntryPath, [], {
      env: {
        ...process.env,
        PORT: String(BACKEND_PORT),
        NODE_ENV: 'production'
      },
      stdio: 'inherit'
    });

    backendProcess.on('error', (err) => {
      console.error('[Electron] Failed to start backend process:', err);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Electron] Backend process exited with code ${code}, signal ${signal}`);
    });
  } catch (err) {
    console.warn('[Electron] Could not fork backend dist (will rely on external server):', err.message);
  }
}

/**
 * Create the main desktop application window
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: APP_TITLE,
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
    mainWindow.loadURL(FRONTEND_DEV_URL).catch(() => {
      console.log('[Electron] Dev server not ready, loading local build file...');
      loadDistFile();
    });
  } else {
    loadDistFile();
  }

  function loadDistFile() {
    const fs = require('fs');
    const possiblePaths = [
      path.join(__dirname, 'dist', 'index.html'),
      path.join(__dirname, 'frontend', 'dist', 'index.html'),
      path.join(__dirname, 'index.html'),
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(app.getAppPath(), 'index.html')
    ];

    const validPath = possiblePaths.find((p) => {
      try { return fs.existsSync(p); } catch (e) { return false; }
    });

    const target = validPath || path.join(__dirname, 'frontend', 'dist', 'index.html');
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
