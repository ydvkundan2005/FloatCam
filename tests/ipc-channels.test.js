const test = require("node:test");
const assert = require("node:assert");
const CH = require("../shared/ipc-channels");

test("IPC channels map defines all required event constants", () => {
  const required = [
    "GET_SIGNAL_URL",
    "GET_SETTINGS",
    "SET_SHAPE",
    "SET_ZOOM",
    "SET_OPACITY",
    "SET_ALWAYS_ON_TOP",
    "SET_VISIBLE",
    "SET_SIZE",
    "RESIZE_DELTA",
    "QUICK_POSITION",
    "RESET_SETTINGS",
    "QUIT_APP",
    "VIDEO_STATE",
    "STATE_CHANGED",
    "CONNECTION_STATUS",
    "GET_CONNECTION_STATUS",
    "TOGGLE_SERVER",
    "GET_NETWORK_INTERFACES",
    "SET_NETWORK_INTERFACE",
    "DISCONNECT_DEVICE",
    "TOGGLE_LOCAL_CAMERA",
    "REGENERATE_CERTS"
  ];

  for (const key of required) {
    assert.ok(CH[key], "Channel constant " + key + " must be defined");
    assert.ok(typeof CH[key] === "string");
    assert.ok(CH[key].startsWith("floatingcam:"));
  }
});
