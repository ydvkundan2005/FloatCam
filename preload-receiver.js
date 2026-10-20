const { contextBridge, ipcRenderer } = require('electron');
const CH = require('./shared/ipc-channels');

contextBridge.exposeInMainWorld('floatingCam', {
  /** Resolves to { wsUrl, phoneUrl, fingerprint } for building the WebSocket connection. */
  getSignalUrl: () => ipcRenderer.invoke(CH.GET_SIGNAL_URL),

  /** Resolves to the current persisted settings object. */
  getSettings: () => ipcRenderer.invoke(CH.GET_SETTINGS),

  /** Called whenever shape/zoom/opacity/etc. change. */
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on(CH.STATE_CHANGED, listener);
    return () => ipcRenderer.removeListener(CH.STATE_CHANGED, listener);
  },

  /** Called whenever phone/receiver connection state changes. */
  onConnectionStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on(CH.CONNECTION_STATUS, listener);
    return () => ipcRenderer.removeListener(CH.CONNECTION_STATUS, listener);
  },

  /** Called when toggling local Mac camera */
  onToggleLocalCamera: (callback) => {
    const listener = (_event, enabled) => callback(enabled);
    ipcRenderer.on(CH.TOGGLE_LOCAL_CAMERA, listener);
    return () => ipcRenderer.removeListener(CH.TOGGLE_LOCAL_CAMERA, listener);
  },

  /** Lets the main process know whether a video frame is actually being displayed. */
  reportVideoState: (isPlaying) => ipcRenderer.send(CH.VIDEO_STATE, !!isPlaying),

  /** Incremental drag-to-resize from the on-screen resize handle (screen-pixel deltas). */
  resizeBy: (dw, dh) => ipcRenderer.send(CH.RESIZE_DELTA, { dw, dh }),

  /** Open / focus the App Dashboard */
  showDashboard: () => ipcRenderer.send(CH.SHOW_DASHBOARD)
});
