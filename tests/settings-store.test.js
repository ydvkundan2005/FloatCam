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

test("SettingsStore sanitizes corrupt nested size and invalid properties", () => {
  const tempFile = path.join(os.tmpdir(), "floatcam-test-corrupt-" + Date.now() + ".json");
  // Write corrupt JSON with invalid size and zoomLevel
  fs.writeFileSync(tempFile, JSON.stringify({
    shape: "oval",
    size: { width: "invalid", height: -50 },
    zoomLevel: -5,
    opacity: 999
  }), "utf8");

  const store = new SettingsStore(tempFile);
  const data = store.get();

  // Size should have safely fallen back to default { width: 220, height: 220 }
  assert.strictEqual(data.size.width, DEFAULTS.size.width);
  assert.strictEqual(data.size.height, DEFAULTS.size.height);
  assert.strictEqual(data.zoomLevel, DEFAULTS.zoomLevel);
  assert.strictEqual(data.opacity, DEFAULTS.opacity);

  // Patching with valid size clamps and preserves object structure
  store.set({ size: { width: 350, height: 280 } });
  assert.strictEqual(store.get("size").width, 350);
  assert.strictEqual(store.get("size").height, 280);

  if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
});
