/**
 * main.js — FloatCam V3
 *
 * Key V3 improvements over V2:
 *  - Dynamic port selection (9211–9299): no more hard-coded port conflicts
 *  - Session token: prevents cross-installation signaling leakage
 *  - All paths use app.getPath('userData') when packaged — no write to install dir
 *  - Tray left-click + double-click both open dashboard (Windows compatibility)
 *  - Windows: backgroundMaterial 'acrylic' only on Win 11 (graceful fallback)
 *  - macOS dock icon shown; LSUIElement not set so first launch opens dashboard
 *  - certificate-error handler covers the dynamic port
 */

// Catch uncaught exceptions gracefully to prevent unexpected dialogs
process.on('uncaughtException', (err) => {
  console.error('[FloatCam:uncaughtException]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FloatCam:unhandledRejection]', reason);
});

const { app, Tray, Menu, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');

// Single-instance lock: prevent multiple instances running simultaneously
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (app.isReady()) {
      showAppDashboard();
    }
  });
}

// Trust our own self-signed local-CA for WSS/HTTPS connections
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

const CH               = require('./shared/ipc-channels');
const { getShape }     = require('./shared/shapes');
const { SettingsStore }= require('./lib/settings-store');
const { SignalingServer }= require('./lib/signaling-server');
const { getLocalIPs, getPreferredLocalIP } = require('./lib/local-ip');
const { ensureCerts }  = require('./lib/cert-manager');
const { findFreePort } = require('./lib/port-manager');

// ---------------------------------------------------------------------------
// App-global state
// ---------------------------------------------------------------------------

const MIN_WIDTH      = 120;
const MIN_HEIGHT     = 90;
const MAX_DIMENSION  = 900;
const CORNER_MARGIN  = 24;

let tray            = null;
let previewWindow   = null;
let controlWindow   = null;
let server          = null;
let settingsStore   = null;
let serverInfo      = null;
let certData        = null; // { certPath, keyPath, caCertPath, certPem, caPem, fingerprint, sans }
let selectedInterface = null;
let usingLocalCamera= false;

/** Resolved after findFreePort() — used everywhere we need the port. */
let activePort = null;

/**
 * Per-session 8-hex token.  Embedded in the QR URL as ?s=<token>.
 * The phone client echoes it in the 'hello' message; the server rejects
 * connections that don't carry the correct token, preventing any other
 * FloatCam installation on the LAN from accidentally joining this session.
 */
let sessionToken = null;

function getCertsDir() {
  if (app && app.isReady()) {
    return path.join(app.getPath('userData'), 'certs');
  }
  return path.join(__dirname, 'certs');
}

const connectionStatus = {
  serverRunning:    false,
  phoneConnected:   false,
  macReady:         false,
  videoPlaying:     false,
  usingLocalCamera: false,
  connectedDevices: [],
  serverError:      null,
  currentIp:        null,
  port:             null   // updated once port is resolved
};

// ---------------------------------------------------------------------------
// Window geometry helpers
// ---------------------------------------------------------------------------

function computeCornerPosition(corner, size, display) {
  const area = (display && display.workArea) ? display.workArea : { x: 0, y: 0, width: 1280, height: 800 };
  switch (corner) {
    case 'top-left':
      return { x: area.x + CORNER_MARGIN, y: area.y + CORNER_MARGIN };
    case 'top-right':
      return { x: area.x + area.width  - size.width  - CORNER_MARGIN, y: area.y + CORNER_MARGIN };
    case 'bottom-left':
      return { x: area.x + CORNER_MARGIN, y: area.y + area.height - size.height - CORNER_MARGIN };
    case 'bottom-right':
    default:
      return {
        x: area.x + area.width  - size.width  - CORNER_MARGIN,
        y: area.y + area.height - size.height - CORNER_MARGIN
      };
  }
}

function applyAspectForShape(win, shapeDef) {
  if (!win || win.isDestroyed()) return;
  win.setAspectRatio(shapeDef.lockAspect ? 1 : 0);
}

function clampSize(width, height, shapeDef) {
  let w = Math.round(width);
  let h = Math.round(height);
  w = Math.min(MAX_DIMENSION, Math.max(MIN_WIDTH, w));
  h = shapeDef.lockAspect ? w : Math.min(MAX_DIMENSION, Math.max(MIN_HEIGHT, h));
  return { width: w, height: h };
}

// ---------------------------------------------------------------------------
// Preview (floating camera) window
// ---------------------------------------------------------------------------

function createPreviewWindow() {
  if (!app.isReady()) return;
  const settings = settingsStore.get();
  const shapeDef = getShape(settings.shape);
  const { screen } = require('electron');
  const display  = screen ? screen.getPrimaryDisplay() : null;
  const pos      = settings.position
    || computeCornerPosition(settings.quickPosition || 'bottom-right', settings.size, display);

  previewWindow = new BrowserWindow({
    width:         settings.size.width,
    height:        settings.size.height,
    x:             pos.x,
    y:             pos.y,
    frame:         false,
    transparent:   true,
    hasShadow:     false,
    resizable:     true,
    movable:       true,
    minimizable:   false,
    maximizable:   false,
    fullscreenable:false,
    skipTaskbar:   true,
    show:          false,
    backgroundColor: '#00000000',
    alwaysOnTop:   settings.alwaysOnTop,
    webPreferences: {
      preload:           path.join(__dirname, 'preload-receiver.js'),
      contextIsolation:  true,
      nodeIntegration:   false,
      sandbox:           false,
      backgroundThrottling: false
    }
  });

  if (settings.alwaysOnTop) previewWindow.setAlwaysOnTop(true, 'floating');
  applyAspectForShape(previewWindow, shapeDef);
  previewWindow.setOpacity(settings.opacity);
  previewWindow.loadFile(path.join(__dirname, 'renderer', 'receiver.html'));

  previewWindow.once('ready-to-show', () => {
    if (settings.visible) previewWindow.show();
  });

  previewWindow.on('moved', () => {
    if (!previewWindow) return;
    const [x, y] = previewWindow.getPosition();
    settingsStore.set({ position: { x, y } });
  });

  previewWindow.on('resized', () => {
    if (!previewWindow) return;
    const [width, height] = previewWindow.getSize();
    settingsStore.set({ size: { width, height } });
    broadcastState();
  });

  previewWindow.on('closed', () => { previewWindow = null; });
  return previewWindow;
}

// ---------------------------------------------------------------------------
// Control panel window
// ---------------------------------------------------------------------------

function createControlWindow() {
  if (!app.isReady()) return;
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';
  const { screen } = require('electron');
  const display = screen ? screen.getPrimaryDisplay() : null;
  const workArea = (display && display.workArea) ? display.workArea : { x: 0, y: 0, width: 1280, height: 800 };
  const width  = 450;
  const height = 750;
  const x = Math.round(workArea.x + (workArea.width  - width)  / 2);
  const y = Math.round(workArea.y + Math.max(20, (workArea.height - height) / 2));

  // Windows 11 supports 'acrylic'; Windows 10 silently ignores it → use 'none' fallback
  let backgroundMaterial;
  if (isWin) {
    try {
      // electron ≥ 29 on Win 11: check OS version before enabling acrylic
      const release = require('os').release();
      const [major, , build] = release.split('.').map(Number);
      backgroundMaterial = (major >= 10 && build >= 22000) ? 'acrylic' : 'none';
    } catch {
      backgroundMaterial = 'none';
    }
  }

  controlWindow = new BrowserWindow({
    width, height, x, y,
    minWidth:   380,
    minHeight:  580,
    show:       false,
    frame:      false,
    transparent:true,
    resizable:  true,
    movable:    true,
    skipTaskbar:false,
    alwaysOnTop:false,
    vibrancy:   isMac ? 'under-window' : undefined,
    backgroundMaterial: isWin ? backgroundMaterial : undefined,
    backgroundColor:    '#00000000',
    visualEffectState:  'active',
    roundedCorners:     true,
    webPreferences: {
      preload:          path.join(__dirname, 'preload-control.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false
    }
  });

  controlWindow.loadFile(path.join(__dirname, 'renderer', 'control.html'));
  controlWindow.on('closed', () => { controlWindow = null; });
}

function showAppDashboard() {
  if (!app.isReady()) return;
  if (!controlWindow || controlWindow.isDestroyed()) createControlWindow();
  if (!controlWindow || controlWindow.isDestroyed()) return;
  if (controlWindow.isMinimized()) controlWindow.restore();
  controlWindow.show();
  controlWindow.focus();
}

function toggleControlWindow() {
  if (!app.isReady()) return;
  if (!controlWindow || controlWindow.isDestroyed()) {
    createControlWindow();
    showAppDashboard();
    return;
  }
  if (controlWindow.isVisible()) controlWindow.hide();
  else showAppDashboard();
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

function buildTrayMenu() {
  const settings = settingsStore.get();
  const isMac    = process.platform === 'darwin';
  return Menu.buildFromTemplate([
    { label: 'FloatCam V3', enabled: false },
    { type: 'separator' },
    { label: 'App Dashboard', click: () => showAppDashboard() },
    {
      label: connectionStatus.serverRunning ? 'Server: Running' : 'Server: Stopped',
      click: () => toggleServer(!connectionStatus.serverRunning)
    },
    { type: 'separator' },
    {
      label:   'Show Floating Preview',
      type:    'checkbox',
      checked: settings.visible,
      click:   (item) => setVisible(item.checked)
    },
    {
      label:   'Always on Top',
      type:    'checkbox',
      checked: settings.alwaysOnTop,
      click:   (item) => setAlwaysOnTop(item.checked)
    },
    {
      label:   isMac ? 'Use Mac Webcam' : 'Use PC Webcam',
      type:    'checkbox',
      checked: usingLocalCamera,
      click:   (item) => toggleLocalCamera(item.checked)
    },
    { type: 'separator' },
    { label: 'Reset View', click: () => resetSettings() },
    { type: 'separator' },
    { label: 'Quit FloatCam', click: () => app.quit() }
  ]);
}

function updateTrayMenu() {
  if (tray && !tray.isDestroyed()) tray.setContextMenu(buildTrayMenu());
}

function createTray() {
  const isWin = process.platform === 'win32';
  let iconPath;
  if (isWin) {
    // Prefer ICO; fall back to PNG if ICO somehow missing
    iconPath = fs.existsSync(path.join(__dirname, 'assets', 'icon.ico'))
      ? path.join(__dirname, 'assets', 'icon.ico')
      : path.join(__dirname, 'assets', 'iconTemplate@2x.png');
  } else {
    iconPath = path.join(__dirname, 'assets', 'iconTemplate.png');
  }

  const icon = nativeImage.createFromPath(iconPath);
  if (!isWin) icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('FloatCam V3');
  updateTrayMenu();

  // Windows: left-click also opens dashboard (no menu-bar like macOS)
  tray.on('click',        () => showAppDashboard());
  tray.on('double-click', () => showAppDashboard());
  tray.on('right-click',  () => { updateTrayMenu(); tray.popUpContextMenu(); });
}

// ---------------------------------------------------------------------------
// State mutators & broadcast
// ---------------------------------------------------------------------------

function broadcastState() {
  const state = settingsStore.get();
  for (const win of [previewWindow, controlWindow]) {
    if (win && !win.isDestroyed()) win.webContents.send(CH.STATE_CHANGED, state);
  }
  updateTrayMenu();
}

function broadcastConnectionStatus() {
  for (const win of [previewWindow, controlWindow]) {
    if (win && !win.isDestroyed()) win.webContents.send(CH.CONNECTION_STATUS, connectionStatus);
  }
  updateTrayMenu();
}

function setShape(shapeId) {
  const shapeDef    = getShape(shapeId);
  const currentSize = settingsStore.get('size');
  const size        = clampSize(currentSize.width, currentSize.height, shapeDef);
  const settings    = settingsStore.set({ shape: shapeDef.id, size });
  if (previewWindow && !previewWindow.isDestroyed()) {
    applyAspectForShape(previewWindow, shapeDef);
    previewWindow.setSize(size.width, size.height, false);
  }
  broadcastState();
  return settings;
}

function setZoom(zoom) {
  const clamped = Math.min(3, Math.max(1, Number(zoom) || 1));
  const settings = settingsStore.set({ zoomLevel: clamped });
  broadcastState();
  return settings;
}

function setOpacity(opacity) {
  const clamped  = Math.min(1, Math.max(0.1, Number(opacity)));
  const settings = settingsStore.set({ opacity: clamped });
  if (previewWindow && !previewWindow.isDestroyed()) previewWindow.setOpacity(clamped);
  broadcastState();
  return settings;
}

function setAlwaysOnTop(flag) {
  const settings = settingsStore.set({ alwaysOnTop: !!flag });
  if (previewWindow && !previewWindow.isDestroyed()) previewWindow.setAlwaysOnTop(!!flag, 'floating');
  broadcastState();
  return settings;
}

function setVisible(flag) {
  const settings = settingsStore.set({ visible: !!flag });
  if (previewWindow && !previewWindow.isDestroyed()) {
    if (flag) previewWindow.show();
    else      previewWindow.hide();
  }
  broadcastState();
  return settings;
}

function setSize(size) {
  if (!previewWindow || previewWindow.isDestroyed()) return settingsStore.get();
  const shapeDef = getShape(settingsStore.get('shape'));
  const clamped  = clampSize(size.width, size.height, shapeDef);
  previewWindow.setSize(clamped.width, clamped.height, false);
  const settings = settingsStore.set({ size: clamped });
  broadcastState();
  return settings;
}

function quickPosition(corner) {
  if (!previewWindow || previewWindow.isDestroyed()) return settingsStore.get();
  const { screen } = require('electron');
  const display = screen ? screen.getDisplayNearestPoint(previewWindow.getBounds()) : null;
  const size    = settingsStore.get('size');
  const pos     = computeCornerPosition(corner, size, display);
  previewWindow.setPosition(pos.x, pos.y, true);
  const settings = settingsStore.set({ position: pos, quickPosition: corner });
  broadcastState();
  return settings;
}

function resetSettings() {
  const settings = settingsStore.reset();
  if (previewWindow && !previewWindow.isDestroyed()) {
    const shapeDef = getShape(settings.shape);
    const { screen } = require('electron');
    const display  = screen ? screen.getDisplayNearestPoint(previewWindow.getBounds()) : null;
    const pos      = computeCornerPosition('bottom-right', settings.size, display);
    previewWindow.setSize(settings.size.width, settings.size.height, false);
    previewWindow.setPosition(pos.x, pos.y, false);
    previewWindow.setOpacity(settings.opacity);
    previewWindow.setAlwaysOnTop(settings.alwaysOnTop, 'floating');
    applyAspectForShape(previewWindow, shapeDef);
    previewWindow.show();
    settingsStore.set({ position: pos, visible: true });
  }
  broadcastState();
  return settingsStore.get();
}

function toggleLocalCamera(enabled) {
  usingLocalCamera = !!enabled;
  connectionStatus.usingLocalCamera = usingLocalCamera;
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.webContents.send(CH.TOGGLE_LOCAL_CAMERA, usingLocalCamera);
  }
  broadcastConnectionStatus();
  return usingLocalCamera;
}

// ---------------------------------------------------------------------------
// Server lifecycle & Networking (V3: dynamic port + session token)
// ---------------------------------------------------------------------------

async function getSignalDetails() {
  const ip  = getPreferredLocalIP(selectedInterface);
  const port = activePort;

  // Guard: if server hasn't started yet or port failed, return safe placeholder
  if (!port) {
    return {
      wsUrl:           '',
      phoneUrl:        '',
      port:            null,
      ip,
      qrDataUrl:       '',
      sessionToken:    sessionToken || '',
      certFingerprint: '',
      sans:            []
    };
  }

  // Phone URL carries the session token so the server can validate it
  const phoneUrl = `https://${ip}:${port}/?s=${sessionToken}`;
  const wsUrl    = `wss://127.0.0.1:${port}/signal`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(phoneUrl, {
      margin: 1,
      width:  220,
      color:  { dark: '#0284C7', light: '#FFFFFF' }
    });
  } catch (err) {
    console.error('QR generation failed:', err);
  }

  return {
    wsUrl,
    phoneUrl,
    port,
    ip,
    qrDataUrl,
    sessionToken,
    certFingerprint: certData ? certData.fingerprint : '',
    sans:            certData ? certData.sans : []
  };
}

async function startServer() {
  // Resolve a free port if we don't have one yet
  if (!activePort) {
    try {
      activePort = await findFreePort();
    } catch (err) {
      console.error('[startServer] Port error:', err.message);
      connectionStatus.serverRunning = false;
      connectionStatus.serverError   = 'no-free-port';
      dialog.showMessageBox({
        type:    'error',
        title:   'No Port Available',
        message: 'FloatCam could not find a free port (9211–9299).',
        detail:  'Please close other FloatCam instances or conflicting services.'
      });
      broadcastConnectionStatus();
      return;
    }
    connectionStatus.port = activePort;
  }

  // Fresh session token each time the server starts
  sessionToken = crypto.randomBytes(4).toString('hex');

  const targetIp  = getPreferredLocalIP(selectedInterface);
  const certsDir  = getCertsDir();
  try {
    certData = ensureCerts(certsDir, targetIp);
  } catch (err) {
    console.error('[startServer] Cert error:', err);
    connectionStatus.serverRunning = false;
    connectionStatus.serverError   = 'cert-generation-failed';
    broadcastConnectionStatus();
    return;
  }

  server = new SignalingServer({
    certPath:   certData.certPath,
    keyPath:    certData.keyPath,
    caPath:     certData.caCertPath,
    staticRoot: path.join(__dirname, 'phone'),
    port:       activePort,
    sessionToken                // V3: passed to server for validation
  });

  server.on('phone-status',   (connected)  => {
    connectionStatus.phoneConnected = connected;
    if (!connected) connectionStatus.videoPlaying = false;
    broadcastConnectionStatus();
  });
  server.on('devices-changed',(devices)    => {
    connectionStatus.connectedDevices = devices || [];
    broadcastConnectionStatus();
  });
  server.on('mac-status',     (ready)      => {
    connectionStatus.macReady = ready;
    broadcastConnectionStatus();
  });
  server.on('server-error',   (err)        => {
    console.error('[server] error:', err.message);
  });

  try {
    serverInfo = await server.start();
    connectionStatus.serverRunning = true;
    connectionStatus.serverError   = null;
    connectionStatus.currentIp     = targetIp;
    console.log(`[server] FloatCam V3 listening on https://0.0.0.0:${serverInfo.port} (session: ${sessionToken})`);
  } catch (err) {
    connectionStatus.serverRunning = false;
    if (err.code === 'EADDRINUSE') {
      // The port became occupied between findFreePort() and .listen() — rare race
      connectionStatus.serverError = 'port-in-use';
      const failedPort = activePort;
      // Reset so next attempt tries a new port
      activePort = null;
      connectionStatus.port = null;
      dialog.showMessageBox({
        type:    'error',
        title:   'Port In Use',
        message: `Port ${failedPort} is already in use by another application.`,
        detail:  'FloatCam will try a different port on next start.'
      });
    } else {
      connectionStatus.serverError = 'unknown';
      console.error('[startServer] listen error:', err);
    }
  }
  broadcastConnectionStatus();
}

function stopServer() {
  if (server) { server.stop(); server = null; }
  connectionStatus.serverRunning    = false;
  connectionStatus.phoneConnected   = false;
  connectionStatus.videoPlaying     = false;
  connectionStatus.connectedDevices = [];
  broadcastConnectionStatus();
}

async function toggleServer(shouldRun) {
  if (shouldRun) {
    if (!connectionStatus.serverRunning) await startServer();
  } else {
    stopServer();
  }
  return connectionStatus;
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

function registerIpcHandlers() {
  ipcMain.handle(CH.GET_SIGNAL_URL,         async ()         => await getSignalDetails());
  ipcMain.handle(CH.GET_SETTINGS,           ()               => settingsStore.get());
  ipcMain.handle(CH.GET_CONNECTION_STATUS,  ()               => connectionStatus);

  ipcMain.handle(CH.SET_SHAPE,              (_e, shapeId)    => setShape(shapeId));
  ipcMain.handle(CH.SET_ZOOM,               (_e, zoom)       => setZoom(zoom));
  ipcMain.handle(CH.SET_OPACITY,            (_e, opacity)    => setOpacity(opacity));
  ipcMain.handle(CH.SET_ALWAYS_ON_TOP,      (_e, flag)       => setAlwaysOnTop(flag));
  ipcMain.handle(CH.SET_VISIBLE,            (_e, flag)       => setVisible(flag));
  ipcMain.handle(CH.SET_SIZE,               (_e, size)       => setSize(size));
  ipcMain.handle(CH.QUICK_POSITION,         (_e, corner)     => quickPosition(corner));
  ipcMain.handle(CH.RESET_SETTINGS,        ()               => resetSettings());
  ipcMain.on(    CH.QUIT_APP,              ()               => app.quit());

  ipcMain.on(CH.RESIZE_DELTA, (_e, payload) => {
    if (!previewWindow || previewWindow.isDestroyed()) return;
    const dw = (payload && payload.dw) || 0;
    const dh = (payload && payload.dh) || 0;
    const [w, h] = previewWindow.getSize();
    const shapeDef = getShape(settingsStore.get('shape'));
    const clamped  = clampSize(w + dw, shapeDef.lockAspect ? w + dw : h + dh, shapeDef);
    previewWindow.setSize(clamped.width, clamped.height, false);
  });

  ipcMain.on(CH.VIDEO_STATE, (_e, isPlaying) => {
    connectionStatus.videoPlaying = !!isPlaying;
    broadcastConnectionStatus();
  });

  ipcMain.handle(CH.TOGGLE_SERVER, async (_e, start) => await toggleServer(start));

  ipcMain.handle(CH.GET_NETWORK_INTERFACES, () => ({
    interfaces: getLocalIPs(),
    selected:   selectedInterface || getPreferredLocalIP()
  }));

  ipcMain.handle(CH.SET_NETWORK_INTERFACE, async (_e, ifaceName) => {
    selectedInterface = ifaceName;
    // Update currentIp immediately so the UI is never stale
    connectionStatus.currentIp = getPreferredLocalIP(selectedInterface);
    if (connectionStatus.serverRunning) {
      stopServer();
      // Keep same port; only the IP changes
      await startServer();
    }
    broadcastConnectionStatus();
    return await getSignalDetails();
  });

  ipcMain.handle(CH.DISCONNECT_DEVICE, (_e, sessionId) => {
    if (server) server.disconnectDevice(sessionId);
    return true;
  });

  ipcMain.handle(CH.SWITCH_CAMERA, () => {
    if (server) return server.switchPhoneCamera();
    return false;
  });

  ipcMain.handle(CH.TOGGLE_LOCAL_CAMERA, (_e, enabled) => toggleLocalCamera(enabled));

  ipcMain.handle(CH.REGENERATE_CERTS, async () => {
    if (server) stopServer();
    // Rotate session token so phones with the old cert must re-scan
    sessionToken = crypto.randomBytes(4).toString('hex');
    const targetIp = getPreferredLocalIP(selectedInterface);
    const certsDir = getCertsDir();
    certData = ensureCerts(certsDir, targetIp);
    await startServer();
    return await getSignalDetails();
  });

  ipcMain.on(CH.SHOW_DASHBOARD,   ()  => showAppDashboard());
  ipcMain.on(CH.WINDOW_MINIMIZE,  ()  => {
    if (controlWindow && !controlWindow.isDestroyed()) controlWindow.minimize();
  });
  ipcMain.on(CH.WINDOW_CLOSE,     ()  => {
    if (controlWindow && !controlWindow.isDestroyed()) controlWindow.hide();
  });
}

// ---------------------------------------------------------------------------
// Trust our own generated local CA for WSS connections from the renderer
// ---------------------------------------------------------------------------

app.on('certificate-error', (event, _webContents, url, _error, _certificate, callback) => {
  const isLocal = url && (
    (activePort && url.includes(`:${activePort}`)) ||
    url.startsWith('wss://10.')        ||
    url.startsWith('wss://192.168.')   ||
    url.startsWith('wss://172.')       ||
    url.startsWith('wss://127.0.0.1') ||
    url.startsWith('wss://localhost')  ||
    url.startsWith('https://10.')      ||
    url.startsWith('https://192.168.') ||
    url.startsWith('https://172.')     ||
    url.startsWith('https://127.0.0.1')||
    url.startsWith('https://localhost')
  );
  if (isLocal) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// ---------------------------------------------------------------------------
// App Lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  if (!gotTheLock) return;
  if (process.platform === 'darwin' && app.dock) app.dock.show();

  settingsStore = new SettingsStore(path.join(app.getPath('userData'), 'settings.json'));

  registerIpcHandlers();
  await startServer();
  createTray();
  createPreviewWindow();
  createControlWindow();
  showAppDashboard();
});

app.on('activate', () => {
  if (app.isReady()) {
    showAppDashboard();
  }
});

// Keep app alive even when all windows are closed (lives in tray/menu-bar)
app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  if (server) server.stop();
});
