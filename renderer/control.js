(function () {
  // Elements - Header & Tabs
  const serverToggleBtn = document.getElementById('serverToggleBtn');
  const serverToggleText = document.getElementById('serverToggleText');
  const quitBtn = document.getElementById('quitBtn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Elements - Connect Tab
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const statusHint = document.getElementById('statusHint');
  const deviceList = document.getElementById('deviceList');
  const qrImage = document.getElementById('qrImage');
  const phoneUrlEl = document.getElementById('phoneUrl');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const openUrlBtn = document.getElementById('openUrlBtn');
  const ifaceSelect = document.getElementById('ifaceSelect');
  const macCamToggle = document.getElementById('macCamToggle');
  const remoteSwitchBtn = document.getElementById('remoteSwitchBtn');

  // Elements - Controls Tab
  const visibleToggle = document.getElementById('visibleToggle');
  const alwaysOnTopToggle = document.getElementById('alwaysOnTopToggle');
  const shapeGrid = document.getElementById('shapeGrid');
  const zoomSlider = document.getElementById('zoomSlider');
  const zoomValueEl = document.getElementById('zoomValue');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeValueEl = document.getElementById('sizeValue');
  const opacitySlider = document.getElementById('opacitySlider');
  const opacityValueEl = document.getElementById('opacityValue');
  const resetBtn = document.getElementById('resetBtn');

  // Elements - Troubleshoot Tab
  const downloadCaBtn = document.getElementById('downloadCaBtn');
  const regenCertsBtn = document.getElementById('regenCertsBtn');

  let currentSettings = null;
  let currentPhoneUrl = '';
  let sizeRafPending = false;
  let isServerRunning = true;

  // ---- Tabs ----
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // ---- Shapes Grid ----
  function applySwatchStyle(el, shape) {
    if (shape.clipPath && shape.clipPath !== 'none') {
      el.style.clipPath = shape.clipPath;
      el.style.borderRadius = '0';
    } else {
      el.style.clipPath = 'none';
      el.style.borderRadius = shape.borderRadius || '0';
    }
  }

  function buildShapeGrid() {
    const shapes = (window.SHAPES || []).slice();
    shapeGrid.innerHTML = '';
    shapes.forEach((shape) => {
      const btn = document.createElement('button');
      btn.className = 'shape-btn';
      btn.dataset.shape = shape.id;

      const swatch = document.createElement('span');
      swatch.className = 'shape-swatch';
      applySwatchStyle(swatch, shape);

      const label = document.createElement('span');
      label.className = 'shape-label';
      label.textContent = shape.label;

      btn.appendChild(swatch);
      btn.appendChild(label);

      btn.addEventListener('click', async () => {
        const updated = await window.controls.setShape(shape.id);
        applySettings(updated);
      });
      shapeGrid.appendChild(btn);
    });
  }

  function highlightActiveShape(shapeId) {
    shapeGrid.querySelectorAll('.shape-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.shape === shapeId);
    });
  }

  // ---- Reflect Settings ----
  function applySettings(settings) {
    if (!settings) return;
    currentSettings = settings;

    visibleToggle.checked = !!settings.visible;
    alwaysOnTopToggle.checked = !!settings.alwaysOnTop;
    highlightActiveShape(settings.shape);

    const zoom = Number(settings.zoomLevel) || 1;
    zoomSlider.value = String(zoom);
    zoomValueEl.textContent = zoom.toFixed(1) + '×';

    const size = settings.size || { width: 220, height: 220 };
    sizeSlider.value = String(size.width);
    sizeValueEl.textContent = size.width + ' px';

    const opacityPct = Math.round((Number(settings.opacity) || 1) * 100);
    opacitySlider.value = String(opacityPct);
    opacityValueEl.textContent = opacityPct + '%';
  }

  // ---- Update Status Card & Devices ----
  function updateStatus(status) {
    if (!status) return;
    isServerRunning = !!status.serverRunning;

    if (isServerRunning) {
      serverToggleBtn.className = 'pill-btn on';
      serverToggleText.textContent = 'Server Running';
    } else {
      serverToggleBtn.className = 'pill-btn off';
      serverToggleText.textContent = 'Server Stopped';
    }

    macCamToggle.checked = !!status.usingLocalCamera;
    remoteSwitchBtn.disabled = !status.phoneConnected;

    if (!status.serverRunning) {
      statusDot.className = 'status-dot error';
      statusLabel.textContent = 'Server is stopped';
      if (status.serverError === 'port-in-use') {
        statusHint.textContent = 'Port 9211 is already in use by another app.';
      } else {
        statusHint.textContent = 'Click "Server Stopped" above to turn the server on.';
      }
    } else if (status.usingLocalCamera) {
      statusDot.className = 'status-dot ok';
      statusLabel.textContent = 'Mac Webcam Live';
      statusHint.textContent = 'Rendering directly from your Mac FaceTime / integrated camera.';
    } else if (!status.phoneConnected) {
      statusDot.className = 'status-dot warn';
      statusLabel.textContent = 'Waiting for phone';
      statusHint.textContent = 'Scan the QR code below or open the URL in your phone browser.';
    } else if (!status.videoPlaying) {
      statusDot.className = 'status-dot warn';
      statusLabel.textContent = 'Phone connected';
      statusHint.textContent = 'Tap "Start Camera" on your phone to begin live streaming.';
    } else {
      statusDot.className = 'status-dot ok';
      statusLabel.textContent = 'Camera stream active';
      statusHint.textContent = 'Streaming live video directly over local Wi-Fi.';
    }

    // Render Connected Devices list
    const devices = status.connectedDevices || [];
    if (devices.length === 0) {
      deviceList.innerHTML = '<div class="empty-devices">No phone connected yet</div>';
    } else {
      deviceList.innerHTML = '';
      devices.forEach((dev) => {
        const item = document.createElement('div');
        item.className = 'device-item';
        item.innerHTML = `
          <span>📱 ${dev.name || 'Mobile Phone'}</span>
          <button class="disconnect-btn" data-session="${dev.id}">Disconnect</button>
        `;
        item.querySelector('.disconnect-btn').addEventListener('click', async () => {
          await window.controls.disconnectDevice(dev.id);
        });
        deviceList.appendChild(item);
      });
    }
  }

  // ---- Refresh Connection Details (URL & QR Code) ----
  async function refreshSignalInfo() {
    try {
      const info = await window.controls.getSignalInfo();
      currentPhoneUrl = info.phoneUrl;
      phoneUrlEl.textContent = info.phoneUrl;
      if (info.qrDataUrl) {
        qrImage.src = info.qrDataUrl;
      }
    } catch (err) {
      phoneUrlEl.textContent = 'Unavailable';
    }
  }

  // ---- Server Toggle ----
  serverToggleBtn.addEventListener('click', async () => {
    const nextState = !isServerRunning;
    const res = await window.controls.toggleServer(nextState);
    updateStatus(res);
    await refreshSignalInfo();
  });

  // ---- Copy & Open URL ----
  copyUrlBtn.addEventListener('click', () => {
    if (!currentPhoneUrl) return;
    window.controls.copyToClipboard(currentPhoneUrl);
    const prev = copyUrlBtn.textContent;
    copyUrlBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyUrlBtn.textContent = prev;
    }, 1200);
  });

  openUrlBtn.addEventListener('click', () => {
    if (currentPhoneUrl && window.controls.openExternal) {
      window.controls.openExternal(currentPhoneUrl);
    }
  });

  // ---- Network Interface Selection ----
  async function loadNetworkInterfaces() {
    try {
      const res = await window.controls.getNetworkInterfaces();
      ifaceSelect.innerHTML = '';
      (res.interfaces || []).forEach((iface) => {
        const opt = document.createElement('option');
        opt.value = iface.name;
        opt.textContent = iface.label;
        if (iface.address === res.selected || iface.name === res.selected) {
          opt.selected = true;
        }
        ifaceSelect.appendChild(opt);
      });
    } catch (err) {
      /* ignore */
    }
  }

  ifaceSelect.addEventListener('change', async () => {
    await window.controls.setNetworkInterface(ifaceSelect.value);
    await refreshSignalInfo();
  });

  // ---- Mac Webcam & Remote Phone Camera Flip ----
  macCamToggle.addEventListener('change', async () => {
    await window.controls.toggleLocalCamera(macCamToggle.checked);
  });

  remoteSwitchBtn.addEventListener('click', async () => {
    // Sends remote switch to phone
    window.controls.copyToClipboard('camera-switch');
  });

  // ---- Controls Tab Event Handlers ----
  visibleToggle.addEventListener('change', async () => {
    applySettings(await window.controls.setVisible(visibleToggle.checked));
  });

  alwaysOnTopToggle.addEventListener('change', async () => {
    applySettings(await window.controls.setAlwaysOnTop(alwaysOnTopToggle.checked));
  });

  zoomSlider.addEventListener('input', async () => {
    const value = Number(zoomSlider.value);
    zoomValueEl.textContent = value.toFixed(1) + '×';
    applySettings(await window.controls.setZoom(value));
  });
  zoomInBtn.addEventListener('click', () => {
    zoomSlider.value = String(Math.min(3, Number(zoomSlider.value) + 0.1));
    zoomSlider.dispatchEvent(new Event('input'));
  });
  zoomOutBtn.addEventListener('click', () => {
    zoomSlider.value = String(Math.max(1, Number(zoomSlider.value) - 0.1));
    zoomSlider.dispatchEvent(new Event('input'));
  });

  sizeSlider.addEventListener('input', () => {
    const width = Number(sizeSlider.value);
    sizeValueEl.textContent = width + ' px';
    if (sizeRafPending) return;
    sizeRafPending = true;
    requestAnimationFrame(async () => {
      sizeRafPending = false;
      const shape =
        (window.getShape && currentSettings && window.getShape(currentSettings.shape)) || null;
      const height = shape && !shape.lockAspect ? Math.round(width / shape.aspectRatio) : width;
      applySettings(await window.controls.setSize({ width, height }));
    });
  });

  opacitySlider.addEventListener('input', async () => {
    const pct = Number(opacitySlider.value);
    opacityValueEl.textContent = pct + '%';
    applySettings(await window.controls.setOpacity(pct / 100));
  });

  document.querySelectorAll('.pos-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      applySettings(await window.controls.quickPosition(btn.dataset.corner));
    });
  });

  resetBtn.addEventListener('click', async () => {
    applySettings(await window.controls.resetSettings());
  });

  quitBtn.addEventListener('click', () => {
    window.controls.quitApp();
  });

  // ---- Troubleshoot Actions ----
  downloadCaBtn.addEventListener('click', () => {
    if (currentPhoneUrl && window.controls.openExternal) {
      window.controls.openExternal(`${currentPhoneUrl}ca.crt`);
    }
  });

  regenCertsBtn.addEventListener('click', async () => {
    regenCertsBtn.textContent = 'Generating…';
    regenCertsBtn.disabled = true;
    try {
      await window.controls.regenerateCerts();
      await refreshSignalInfo();
      regenCertsBtn.textContent = 'Done!';
    } catch (e) {
      regenCertsBtn.textContent = 'Failed';
    }
    setTimeout(() => {
      regenCertsBtn.textContent = 'Regenerate Certs';
      regenCertsBtn.disabled = false;
    }, 1500);
  });

  // ---- Initialization ----
  async function init() {
    buildShapeGrid();

    try {
      const settings = await window.controls.getSettings();
      applySettings(settings);
    } catch (e) {}

    await loadNetworkInterfaces();
    await refreshSignalInfo();

    try {
      updateStatus(await window.controls.getConnectionStatus());
    } catch (e) {}

    window.controls.onState((state) => applySettings(state));
    window.controls.onConnectionStatus((status) => updateStatus(status));
  }

  init();
})();
