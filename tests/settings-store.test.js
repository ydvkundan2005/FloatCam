const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { SettingsStore, DEFAULTS } = require("../lib/settings-store");

test("SettingsStore initializes with default values when file does not exist", () => {
  const tempFile = path.join(os.tmpdir(), "floatcam-test-settings-" + Date.now() + ".json");
  const store = new SettingsStore(tempFile);
  const data = store.get();

  assert.strictEqual(data.shape, DEFAULTS.shape);
  assert.strictEqual(data.zoomLevel, DEFAULTS.zoomLevel);
  assert.strictEqual(data.opacity, DEFAULTS.opacity);
  assert.strictEqual(data.alwaysOnTop, DEFAULTS.alwaysOnTop);

  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
});

test("SettingsStore.set updates in-memory and persists to disk", () => {
  const tempFile = path.join(os.tmpdir(), "floatcam-test-settings-set-" + Date.now() + ".json");
  const store = new SettingsStore(tempFile);

  store.set({ shape: "hexagon", zoomLevel: 1.8, opacity: 0.85 });
  assert.strictEqual(store.get("shape"), "hexagon");
  assert.strictEqual(store.get("zoomLevel"), 1.8);
  assert.strictEqual(store.get("opacity"), 0.85);

  const diskContent = JSON.parse(fs.readFileSync(tempFile, "utf8"));
  assert.strictEqual(diskContent.shape, "hexagon");
  assert.strictEqual(diskContent.zoomLevel, 1.8);

  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
});

test("SettingsStore.reset restores defaults", () => {
  const tempFile = path.join(os.tmpdir(), "floatcam-test-settings-reset-" + Date.now() + ".json");
  const store = new SettingsStore(tempFile);

  store.set({ shape: "star", opacity: 0.5 });
  assert.strictEqual(store.get("shape"), "star");

  store.reset();
  assert.strictEqual(store.get("shape"), DEFAULTS.shape);
  assert.strictEqual(store.get("opacity"), DEFAULTS.opacity);

  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
});
