const { contextBridge, ipcRenderer, clipboard, shell } = require('electron');
const CH = require('./shared/ipc-channels');

contextBridge.exposeInMainWorld('controls', {
  getSettings: () => ipcRenderer.invoke(CH.GET_SETTINGS),
  getSignalInfo: () => ipcRenderer.invoke(CH.GET_SIGNAL_URL),
  getConnectionStatus: () => ipcRenderer.invoke(CH.GET_CONNECTION_STATUS),

  setShape: (shapeId) => ipcRenderer.invoke(CH.SET_SHAPE, shapeId),
  setZoom: (zoom) => ipcRenderer.invoke(CH.SET_ZOOM, zoom),
  setOpacity: (opacity) => ipcRenderer.invoke(CH.SET_OPACITY, opacity),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke(CH.SET_ALWAYS_ON_TOP, flag),
  setVisible: (flag) => ipcRenderer.invoke(CH.SET_VISIBLE, flag),
  setSize: (size) => ipcRenderer.invoke(CH.SET_SIZE, size),
  quickPosition: (corner) => ipcRenderer.invoke(CH.QUICK_POSITION, corner),
  resetSettings: () => ipcRenderer.invoke(CH.RESET_SETTINGS),
  quitApp: () => ipcRenderer.send(CH.QUIT_APP),

  // Server & Network controls
  toggleServer: (start) => ipcRenderer.invoke(CH.TOGGLE_SERVER, start),
  getNetworkInterfaces: () => ipcRenderer.invoke(CH.GET_NETWORK_INTERFACES),
  setNetworkInterface: (ifaceName) => ipcRenderer.invoke(CH.SET_NETWORK_INTERFACE, ifaceName),
  disconnectDevice: (sessionId) => ipcRenderer.invoke(CH.DISCONNECT_DEVICE, sessionId),
  toggleLocalCamera: (enabled) => ipcRenderer.invoke(CH.TOGGLE_LOCAL_CAMERA, enabled),
  regenerateCerts: () => ipcRenderer.invoke(CH.REGENERATE_CERTS),

  copyToClipboard: (text) => {
    clipboard.writeText(String(text || ''));
    return true;
  },

  openExternal: (url) => {
    shell.openExternal(url);
  },

  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on(CH.STATE_CHANGED, listener);
    return () => ipcRenderer.removeListener(CH.STATE_CHANGED, listener);
  },
  onConnectionStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on(CH.CONNECTION_STATUS, listener);
    return () => ipcRenderer.removeListener(CH.CONNECTION_STATUS, listener);
  }
});
