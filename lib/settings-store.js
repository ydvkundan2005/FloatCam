const fs = require('fs');
const path = require('path');

// Defaults used on first run and whenever the user hits "Reset".
const DEFAULTS = Object.freeze({
  shape: 'circle',
  size: { width: 220, height: 220 },
  position: null, // null => main.js will place it in the default corner
  zoomLevel: 1,
  opacity: 1,
  alwaysOnTop: true,
  visible: true,
  quickPosition: 'bottom-right'
});

/**
 * Tiny synchronous JSON-file-backed settings store. Deliberately dependency
 * free (no electron-store) to keep the app's runtime footprint small and
 * predictable. Not meant for high-frequency writes, but window
 * move/resize/settings changes are infrequent enough that sync fs calls are
 * fine here.
 */
function sanitizeSettings(data) {
  const merged = Object.assign({}, DEFAULTS, data);
  if (
    !merged.size ||
    typeof merged.size !== 'object' ||
    typeof merged.size.width !== 'number' ||
    typeof merged.size.height !== 'number' ||
    isNaN(merged.size.width) ||
    isNaN(merged.size.height) ||
    merged.size.width <= 0 ||
    merged.size.height <= 0
  ) {
    merged.size = Object.assign({}, DEFAULTS.size);
  } else {
    merged.size = {
      width: Math.max(50, Math.min(2000, Math.round(merged.size.width))),
      height: Math.max(50, Math.min(2000, Math.round(merged.size.height)))
    };
  }

  if (typeof merged.zoomLevel !== 'number' || isNaN(merged.zoomLevel) || merged.zoomLevel <= 0) {
    merged.zoomLevel = DEFAULTS.zoomLevel;
  }
  if (typeof merged.opacity !== 'number' || isNaN(merged.opacity) || merged.opacity < 0.1 || merged.opacity > 1) {
    merged.opacity = DEFAULTS.opacity;
  }

  return merged;
}

class SettingsStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return sanitizeSettings(parsed);
    } catch (err) {
      // Missing file, first run, or corrupt JSON — fall back to defaults.
      return Object.assign({}, DEFAULTS);
    }
  }

  /** Returns the whole settings object (a copy), or a single value if `key` is given. */
  get(key) {
    if (key) return this.data[key];
    return Object.assign({}, this.data);
  }

  /** Shallow-merges `patch` into the current settings and persists to disk. */
  set(patch) {
    if (patch && typeof patch === 'object') {
      const current = Object.assign({}, this.data);
      if (patch.size && typeof patch.size === 'object') {
        patch.size = Object.assign({}, current.size, patch.size);
      }
      this.data = sanitizeSettings(Object.assign(current, patch));
      this._save();
    }
    return this.get();
  }

  /** Restores factory defaults and persists. */
  reset() {
    this.data = Object.assign({}, DEFAULTS);
    this._save();
    return this.get();
  }

  _save() {
    try {
      const dir = path.dirname(this.filePath);
      fs.mkdirSync(dir, { recursive: true });
      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error('[settings] failed to save settings.json:', err.message);
    }
  }
}

module.exports = { SettingsStore, DEFAULTS };
