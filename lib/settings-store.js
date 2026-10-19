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
class SettingsStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULTS, parsed);
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
    this.data = Object.assign({}, this.data, patch);
    this._save();
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
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[settings] failed to save settings.json:', err.message);
    }
  }
}

module.exports = { SettingsStore, DEFAULTS };
