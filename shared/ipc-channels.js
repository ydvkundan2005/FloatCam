/**
 * Central list of IPC channel names, required by main.js and preload
 * scripts (preload-receiver.js / preload-control.js).
 */
module.exports = {
  GET_SIGNAL_URL: 'floatingcam:get-signal-url',
  GET_SETTINGS: 'floatingcam:get-settings',
  SET_SHAPE: 'floatingcam:set-shape',
  SET_ZOOM: 'floatingcam:set-zoom',
  SET_OPACITY: 'floatingcam:set-opacity',
  SET_ALWAYS_ON_TOP: 'floatingcam:set-always-on-top',
  SET_VISIBLE: 'floatingcam:set-visible',
  SET_SIZE: 'floatingcam:set-size',
  RESIZE_DELTA: 'floatingcam:resize-delta',
  QUICK_POSITION: 'floatingcam:quick-position',
  RESET_SETTINGS: 'floatingcam:reset-settings',
  QUIT_APP: 'floatingcam:quit-app',
  VIDEO_STATE: 'floatingcam:video-state',
  STATE_CHANGED: 'floatingcam:state-changed',
  CONNECTION_STATUS: 'floatingcam:connection-status',
  GET_CONNECTION_STATUS: 'floatingcam:get-connection-status',
  TOGGLE_SERVER: 'floatingcam:toggle-server',
  GET_NETWORK_INTERFACES: 'floatingcam:get-network-interfaces',
  SET_NETWORK_INTERFACE: 'floatingcam:set-network-interface',
  DISCONNECT_DEVICE: 'floatingcam:disconnect-device',
  TOGGLE_LOCAL_CAMERA: 'floatingcam:toggle-local-camera',
  REGENERATE_CERTS: 'floatingcam:regenerate-certs',
  WINDOW_MINIMIZE: 'floatingcam:window-minimize',
  WINDOW_CLOSE: 'floatingcam:window-close',
  SHOW_DASHBOARD: 'floatingcam:show-dashboard',
  SWITCH_CAMERA: 'floatingcam:switch-camera'
};
