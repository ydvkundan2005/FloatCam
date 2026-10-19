const { app, Tray, Menu, BrowserWindow, ipcMain, screen, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

const CH = require('./shared/ipc-channels');
const { getShape } = require('./shared/shapes');
const { SettingsStore } = require('./lib/settings-store');
const { SignalingServer } = require('./lib/signaling-server');
const { getLocalIPs, getPreferredLocalIP } = require('./lib/local-ip');
const { ensureCerts } = require('./lib/cert-manager');

const PORT = 9211;
const CERTS_DIR = path.join(__dirname, 'certs');
const MIN_WIDTH = 120;
const MIN_HEIGHT = 90;
const MAX_DIMENSION = 900;
const CORNER_MARGIN = 24;

let tray = null;
let previewWindow = null;
let controlWindow = null;
let server = null;
let settingsStore = null;
let serverInfo = null;
let certData = null; // { certPath, keyPath, caCertPath, certPem, caPem, fingerprint, sans }
let selectedInterface = null;
let usingLocalCamera = false;

const connectionStatus = {
  serverRunning: false,
  phoneConnected: false,
  macReady: false,
  videoPlaying: false,
  usingLocalCamera: false,
  connectedDevices: [],
  serverError: null,
  currentIp: null,
  port: PORT
};

// ---------------------------------------------------------------------------
// Window geometry helpers
// ---------------------------------------------------------------------------

function computeCornerPosition(corner, size, display) {
  const area = display.workArea;
  switch (corner) {
    case 'top-left':
      return { x: area.x + CORNER_MARGIN, y: area.y + CORNER_MARGIN };
    case 'top-right':
      return {
        x: area.x + area.width - size.width - CORNER_MARGIN,
        y: area.y + CORNER_MARGIN
      };
    case 'bottom-left':
      return {
        x: area.x + CORNER_MARGIN,
        y: area.y + area.height - size.height - CORNER_MARGIN
      };
    case 'bottom-right':
    default:
      return {
        x: area.x + area.width - size.width - CORNER_MARGIN,
        y: area.y + area.height - size.height - CORNER_MARGIN
      };
  }
}

function applyAspectForShape(win, shapeDef) {
  if (!win || win.isDestroyed()) return;
  if (shapeDef.lockAspect) {
    win.setAspectRatio(1);
  } else {
    win.setAspectRatio(0);
  }
}

function clampSize(width, height, shapeDef) {
  let w = Math.round(width);
  let h = Math.round(height);
  w = Math.min(MAX_DIMENSION, Math.max(MIN_WIDTH, w));
  if (shapeDef.lockAspect) {
    h = w;
  } else {
    h = Math.min(MAX_DIMENSION, Math.max(MIN_HEIGHT, h));
  }
  return { width: w, height: h };
}

// ---------------------------------------------------------------------------
// Preview (floating camera) window
// ---------------------------------------------------------------------------

function createPreviewWindow() {
  const settings = settingsStore.get();
  const shapeDef = getShape(settings.shape);
  const display = screen.getPrimaryDisplay();
  const pos =
    settings.position || computeCornerPosition(settings.quickPosition || 'bottom-right', settings.size, display);

  previewWindow = new BrowserWindow({
    width: settings.size.width,
    height: settings.size.height,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    alwaysOnTop: settings.alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, 'preload-receiver.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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

  previewWindow.on('closed', () => {
    previewWindow = null;
  });

  return previewWindow;
}

// ---------------------------------------------------------------------------
// Control panel window
// ---------------------------------------------------------------------------

function createControlWindow() {
  const isMac = process.platform === 'darwin';
  controlWindow = new BrowserWindow({
    width: 370,
    height: 640,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    vibrancy: isMac ? 'popover' : undefined,
    backgroundMaterial: !isMac ? 'acrylic' : undefined,
    backgroundColor: !isMac ? '#0f172ae6' : '#00000000',
    visualEffectState: 'active',
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-control.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  controlWindow.loadFile(path.join(__dirname, 'renderer', 'control.html'));

  controlWindow.on('blur', () => {
    if (controlWindow && !controlWindow.webContents.isDevToolsFocused()) {
      controlWindow.hide();
    }
  });

  controlWindow.on('closed', () => {
    controlWindow = null;
  });
}

function positionControlWindow() {
  if (!tray || !controlWindow) return;
  const trayBounds = tray.getBounds();
  const winBounds = controlWindow.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - winBounds.width / 2);
  let y;

  // On Windows, the system tray is at the bottom taskbar -> pop up above the tray
  // On macOS, the menu bar is at the top -> pop down below the tray
  if (trayBounds.y > display.workArea.y + display.workArea.height / 2) {
    y = Math.round(trayBounds.y - winBounds.height - 8);
  } else {
    y = Math.round(trayBounds.y + trayBounds.height + 4);
  }

  // Keep within display bounds
  x = Math.max(display.workArea.x + 8, Math.min(x, display.workArea.x + display.workArea.width - winBounds.width - 8));
  y = Math.max(display.workArea.y + 8, Math.min(y, display.workArea.y + display.workArea.height - winBounds.height - 8));
  controlWindow.setPosition(x, y, false);
}

function toggleControlWindow() {
  if (!controlWindow || controlWindow.isDestroyed()) createControlWindow();
  if (controlWindow.isVisible()) {
    controlWindow.hide();
    return;
  }
  positionControlWindow();
  controlWindow.show();
  controlWindow.focus();
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

function buildTrayMenu() {
  const settings = settingsStore.get();
  return Menu.buildFromTemplate([
    { label: 'Floating Phone Camera', enabled: false },
    { type: 'separator' },
    { label: 'Dashboard & Controls', click: () => toggleControlWindow() },
    {
      label: connectionStatus.serverRunning ? 'Server: Running' : 'Server: Stopped',
      click: () => toggleServer(!connectionStatus.serverRunning)
    },
    { type: 'separator' },
    {
      label: 'Show Preview',
      type: 'checkbox',
      checked: settings.visible,
      click: (item) => setVisible(item.checked)
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: settings.alwaysOnTop,
      click: (item) => setAlwaysOnTop(item.checked)
    },
    {
      label: 'Use Mac Camera',
      type: 'checkbox',
      checked: usingLocalCamera,
      click: (item) => toggleLocalCamera(item.checked)
    },
    { type: 'separator' },
    { label: 'Reset View', click: () => resetSettings() },
    { type: 'separator' },
    { label: 'Quit Floating Phone Camera', click: () => app.quit() }
  ]);
}

function createTray() {
  const isWin = process.platform === 'win32';
  const iconPath = isWin
    ? (fs.existsSync(path.join(__dirname, 'assets', 'icon.ico')) ? path.join(__dirname, 'assets', 'icon.ico') : path.join(__dirname, 'assets', 'iconTemplate@2x.png'))
    : path.join(__dirname, 'assets', 'iconTemplate.png');
  const icon = nativeImage.createFromPath(iconPath);
  if (!isWin) {
    icon.setTemplateImage(true);
  }

  tray = new Tray(icon);
  tray.setToolTip('Floating Phone Camera');

  tray.on('click', () => toggleControlWindow());
  tray.on('right-click', () => tray.popUpContextMenu(buildTrayMenu()));
}

// ---------------------------------------------------------------------------
// State mutators & broadcast
// ---------------------------------------------------------------------------

function broadcastState() {
  const state = settingsStore.get();
  for (const win of [previewWindow, controlWindow]) {
    if (win && !win.isDestroyed()) win.webContents.send(CH.STATE_CHANGED, state);
  }
}

function broadcastConnectionStatus() {
  for (const win of [previewWindow, controlWindow]) {
    if (win && !win.isDestroyed()) win.webContents.send(CH.CONNECTION_STATUS, connectionStatus);
  }
}

function setShape(shapeId) {
  const shapeDef = getShape(shapeId);
  const currentSize = settingsStore.get('size');
  const size = clampSize(currentSize.width, currentSize.height, shapeDef);
  const settings = settingsStore.set({ shape: shapeDef.id, size });
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
  const clamped = Math.min(1, Math.max(0.1, Number(opacity)));
  const settings = settingsStore.set({ opacity: clamped });
  if (previewWindow && !previewWindow.isDestroyed()) previewWindow.setOpacity(clamped);
  broadcastState();
  return settings;
}

function setAlwaysOnTop(flag) {
  const settings = settingsStore.set({ alwaysOnTop: !!flag });
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.setAlwaysOnTop(!!flag, 'floating');
  }
  broadcastState();
  return settings;
}

function setVisible(flag) {
  const settings = settingsStore.set({ visible: !!flag });
  if (previewWindow && !previewWindow.isDestroyed()) {
    if (flag) previewWindow.show();
    else previewWindow.hide();
  }
  broadcastState();
  return settings;
}

function setSize(size) {
  if (!previewWindow || previewWindow.isDestroyed()) return settingsStore.get();
  const shapeDef = getShape(settingsStore.get('shape'));
  const clamped = clampSize(size.width, size.height, shapeDef);
  previewWindow.setSize(clamped.width, clamped.height, false);
  const settings = settingsStore.set({ size: clamped });
  broadcastState();
  return settings;
}

function quickPosition(corner) {
  if (!previewWindow || previewWindow.isDestroyed()) return settingsStore.get();
  const display = screen.getDisplayNearestPoint(previewWindow.getBounds());
  const size = settingsStore.get('size');
  const pos = computeCornerPosition(corner, size, display);
  previewWindow.setPosition(pos.x, pos.y, true);
  const settings = settingsStore.set({ position: pos, quickPosition: corner });
  broadcastState();
  return settings;
}

function resetSettings() {
  const settings = settingsStore.reset();
  if (previewWindow && !previewWindow.isDestroyed()) {
    const shapeDef = getShape(settings.shape);
    const display = screen.getDisplayNearestPoint(previewWindow.getBounds());
    const pos = computeCornerPosition('bottom-right', settings.size, display);
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
// Server lifecycle & Network
// ---------------------------------------------------------------------------

async function getSignalDetails() {
  const ip = getPreferredLocalIP(selectedInterface);
  const phoneUrl = `https://${ip}:${PORT}/`;
  const wsUrl = `wss://127.0.0.1:${PORT}/signal`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(phoneUrl, {
      margin: 1,
      width: 220,
      color: {
        dark: '#0284C7',
        light: '#FFFFFF'
      }
    });
  } catch (err) {
    console.error('QR generation failed:', err);
  }

  return {
    wsUrl,
    phoneUrl,
    port: PORT,
    ip,
    qrDataUrl,
    certFingerprint: certData ? certData.fingerprint : '',
    sans: certData ? certData.sans : []
  };
}

async function startServer() {
  const targetIp = getPreferredLocalIP(selectedInterface);
  try {
    certData = ensureCerts(CERTS_DIR, targetIp);
  } catch (err) {
    connectionStatus.serverRunning = false;
    connectionStatus.serverError = 'cert-generation-failed';
    broadcastConnectionStatus();
    return;
  }

  server = new SignalingServer({
    certPath: certData.certPath,
    keyPath: certData.keyPath,
    caPath: certData.caCertPath,
    staticRoot: path.join(__dirname, 'phone'),
    port: PORT
  });

  server.on('phone-status', (connected) => {
    connectionStatus.phoneConnected = connected;
    if (!connected) connectionStatus.videoPlaying = false;
    broadcastConnectionStatus();
  });

  server.on('devices-changed', (devices) => {
    connectionStatus.connectedDevices = devices || [];
    broadcastConnectionStatus();
  });

  server.on('mac-status', (ready) => {
    connectionStatus.macReady = ready;
    broadcastConnectionStatus();
  });

  server.on('server-error', (err) => {
    console.error('[server] error:', err.message);
  });

  try {
    serverInfo = await server.start();
    connectionStatus.serverRunning = true;
    connectionStatus.serverError = null;
    connectionStatus.currentIp = targetIp;
    console.log(`[server] listening on https://0.0.0.0:${serverInfo.port}`);
  } catch (err) {
    connectionStatus.serverRunning = false;
    if (err.code === 'EADDRINUSE') {
      connectionStatus.serverError = 'port-in-use';
      dialog.showMessageBox({
        type: 'error',
        title: 'Port In Use',
        message: `Port ${PORT} is already in use by another application.`,
        detail: 'Please close other instances or conflicting services.'
      });
    } else {
      connectionStatus.serverError = 'unknown';
    }
  }
  broadcastConnectionStatus();
}

function stopServer() {
  if (server) {
    server.stop();
    server = null;
  }
  connectionStatus.serverRunning = false;
  connectionStatus.phoneConnected = false;
  connectionStatus.videoPlaying = false;
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
  ipcMain.handle(CH.GET_SIGNAL_URL, async () => {
    return await getSignalDetails();
  });

  ipcMain.handle(CH.GET_SETTINGS, () => settingsStore.get());
  ipcMain.handle(CH.GET_CONNECTION_STATUS, () => connectionStatus);

  ipcMain.handle(CH.SET_SHAPE, (_e, shapeId) => setShape(shapeId));
  ipcMain.handle(CH.SET_ZOOM, (_e, zoom) => setZoom(zoom));
  ipcMain.handle(CH.SET_OPACITY, (_e, opacity) => setOpacity(opacity));
  ipcMain.handle(CH.SET_ALWAYS_ON_TOP, (_e, flag) => setAlwaysOnTop(flag));
  ipcMain.handle(CH.SET_VISIBLE, (_e, flag) => setVisible(flag));
  ipcMain.handle(CH.SET_SIZE, (_e, size) => setSize(size));
  ipcMain.handle(CH.QUICK_POSITION, (_e, corner) => quickPosition(corner));
  ipcMain.handle(CH.RESET_SETTINGS, () => resetSettings());
  ipcMain.on(CH.QUIT_APP, () => app.quit());

  ipcMain.on(CH.RESIZE_DELTA, (_e, payload) => {
    if (!previewWindow || previewWindow.isDestroyed()) return;
    const dw = (payload && payload.dw) || 0;
    const dh = (payload && payload.dh) || 0;
    const [w, h] = previewWindow.getSize();
    const shapeDef = getShape(settingsStore.get('shape'));
    const clamped = clampSize(w + dw, shapeDef.lockAspect ? w + dw : h + dh, shapeDef);
    previewWindow.setSize(clamped.width, clamped.height, false);
  });

  ipcMain.on(CH.VIDEO_STATE, (_e, isPlaying) => {
    connectionStatus.videoPlaying = !!isPlaying;
    broadcastConnectionStatus();
  });

  // Additional production dashboard handlers
  ipcMain.handle(CH.TOGGLE_SERVER, async (_e, start) => {
    return await toggleServer(start);
  });

  ipcMain.handle(CH.GET_NETWORK_INTERFACES, () => {
    return {
      interfaces: getLocalIPs(),
      selected: selectedInterface || getPreferredLocalIP()
    };
  });

  ipcMain.handle(CH.SET_NETWORK_INTERFACE, async (_e, ifaceName) => {
    selectedInterface = ifaceName;
    if (connectionStatus.serverRunning) {
      stopServer();
      await startServer();
    }
    return await getSignalDetails();
  });

  ipcMain.handle(CH.DISCONNECT_DEVICE, (_e, sessionId) => {
    if (server) server.disconnectDevice(sessionId);
    return true;
  });

  ipcMain.handle(CH.TOGGLE_LOCAL_CAMERA, (_e, enabled) => {
    return toggleLocalCamera(enabled);
  });

  ipcMain.handle(CH.REGENERATE_CERTS, async () => {
    if (server) stopServer();
    const targetIp = getPreferredLocalIP(selectedInterface);
    certData = ensureCerts(CERTS_DIR, targetIp);
    await startServer();
    return await getSignalDetails();
  });
}

// ---------------------------------------------------------------------------
// App Lifecycle
// ---------------------------------------------------------------------------

// Trust our own generated local CA and server cert for local signaling wss:// connection
app.on('certificate-error', (event, _webContents, url, _error, certificate, callback) => {
  const isLocalServer = url && (
    url.includes(`:${PORT}`) ||
    url.startsWith('wss://10.') ||
    url.startsWith('wss://192.168.') ||
    url.startsWith('wss://172.') ||
    url.startsWith('wss://127.0.0.1') ||
    url.startsWith('wss://localhost')
  );
  if (isLocalServer) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

app.whenReady().then(async () => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide();

  settingsStore = new SettingsStore(path.join(app.getPath('userData'), 'settings.json'));

  registerIpcHandlers();
  await startServer();
  createTray();
  createPreviewWindow();
});

app.on('window-all-closed', () => {
  // Menu bar utility stays resident
});

app.on('before-quit', () => {
  if (server) server.stop();
});
