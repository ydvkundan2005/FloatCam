(function () {
  // Window & Traffic Light Controls
  const closeBtn = document.getElementById('closeBtn');
  const minBtn = document.getElementById('minBtn');
  const serverToggleBtn = document.getElementById('serverToggleBtn');
  const serverToggleText = document.getElementById('serverToggleText');
  const quitBtn = document.getElementById('quitBtn');
  const quickQuitBtn = document.getElementById('quickQuitBtn');
  const footerIpText = document.getElementById('footerIpText');

  // Menu Bar Mirror Dock Controls
  const quickVisibleToggle = document.getElementById('quickVisibleToggle');
  const quickPinToggle = document.getElementById('quickPinToggle');
  const quickLocalCamToggle = document.getElementById('quickLocalCamToggle');
  const quickResetBtn = document.getElementById('quickResetBtn');

  // Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Elements - Tab 1: Connect
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

  // Elements - Tab 2: Controls & Shapes
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

  // Elements - Tab 3: Troubleshoot
  const downloadCaBtn = document.getElementById('downloadCaBtn');
  const regenCertsBtn = document.getElementById('regenCertsBtn');

  let currentSettings = null;
  let currentPhoneUrl = '';
  let sizeRafPending = false;
  let isServerRunning = true;

  // ---- Window Traffic Light Actions ----
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.controls.closeWindow) window.controls.closeWindow();
    });
  }
  if (minBtn) {
    minBtn.addEventListener('click', () => {
      if (window.controls.minimizeWindow) window.controls.minimizeWindow();
    });
  }

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

  // ---- Reflect Settings to UI ----
  function applySettings(settings) {
    if (!settings) return;
    currentSettings = settings;

    // Visibility toggles
    if (visibleToggle) visibleToggle.checked = !!settings.visible;
    if (quickVisibleToggle) quickVisibleToggle.checked = !!settings.visible;

    // Always on top toggles
    if (alwaysOnTopToggle) alwaysOnTopToggle.checked = !!settings.alwaysOnTop;
    if (quickPinToggle) quickPinToggle.checked = !!settings.alwaysOnTop;

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
      serverToggleText.textContent = 'Server Live';
    } else {
      serverToggleBtn.className = 'pill-btn off';
      serverToggleText.textContent = 'Server Stopped';
    }

    if (macCamToggle) macCamToggle.checked = !!status.usingLocalCamera;
    if (quickLocalCamToggle) quickLocalCamToggle.checked = !!status.usingLocalCamera;
    if (remoteSwitchBtn) remoteSwitchBtn.disabled = !status.phoneConnected;

    if (!status.serverRunning) {
      statusDot.className = 'status-dot error';
      statusLabel.textContent = 'Server Stopped';
      if (status.serverError === 'port-in-use') {
        const portRef = status.port ? ` (port ${status.port})` : '';
        statusHint.textContent = `A port${portRef} is already in use by another app. FloatCam will try a different port on next start.`;
      } else {
        statusHint.textContent = 'Click "Server Stopped" above to turn signaling server on.';
      }
    } else if (status.usingLocalCamera) {
      statusDot.className = 'status-dot ok';
      statusLabel.textContent = 'Local Webcam Active';
      statusHint.textContent = 'Streaming directly from your integrated / USB camera.';
    } else if (!status.phoneConnected) {
      statusDot.className = 'status-dot warn';
      statusLabel.textContent = 'Waiting for Phone';
      statusHint.textContent = 'Scan the QR code below on your phone to connect.';
    } else if (!status.videoPlaying) {
      statusDot.className = 'status-dot warn';
      statusLabel.textContent = 'Phone Connected';
      statusHint.textContent = 'Tap "Start Camera" on your phone to begin live stream.';
    } else {
      statusDot.className = 'status-dot ok';
      statusLabel.textContent = 'Camera Stream Active';
      statusHint.textContent = 'Live video streaming smoothly over local Wi-Fi.';
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
      if (footerIpText && info.ip) {
        footerIpText.textContent = `https://${info.ip}:${info.port || 9211} • Local Peer-to-Peer`;
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

  // ---- Webcam & Remote Phone Camera Flip ----
  const handleCamToggle = async (checked) => {
    if (macCamToggle) macCamToggle.checked = checked;
    if (quickLocalCamToggle) quickLocalCamToggle.checked = checked;
    await window.controls.toggleLocalCamera(checked);
  };

  if (macCamToggle) {
    macCamToggle.addEventListener('change', () => handleCamToggle(macCamToggle.checked));
  }
  if (quickLocalCamToggle) {
    quickLocalCamToggle.addEventListener('change', () => handleCamToggle(quickLocalCamToggle.checked));
  }

  let switchCamPending = false;
  if (remoteSwitchBtn) {
    remoteSwitchBtn.addEventListener('click', async () => {
      if (switchCamPending) return;
      switchCamPending = true;
      const prev = remoteSwitchBtn.textContent;
      remoteSwitchBtn.disabled = true;
      try {
        await window.controls.switchCamera();
        remoteSwitchBtn.textContent = 'Flipped!';
      } catch (_) {
        remoteSwitchBtn.textContent = 'Failed';
      }
      setTimeout(() => {
        remoteSwitchBtn.textContent = prev;
        remoteSwitchBtn.disabled = false;
        switchCamPending = false;
      }, 1500);
    });
  }

  // ---- Floating Camera Controls ----
  const handleVisibleToggle = async (checked) => {
    if (visibleToggle) visibleToggle.checked = checked;
    if (quickVisibleToggle) quickVisibleToggle.checked = checked;
    applySettings(await window.controls.setVisible(checked));
  };

  if (visibleToggle) {
    visibleToggle.addEventListener('change', () => handleVisibleToggle(visibleToggle.checked));
  }
  if (quickVisibleToggle) {
    quickVisibleToggle.addEventListener('change', () => handleVisibleToggle(quickVisibleToggle.checked));
  }

  const handlePinToggle = async (checked) => {
    if (alwaysOnTopToggle) alwaysOnTopToggle.checked = checked;
    if (quickPinToggle) quickPinToggle.checked = checked;
    applySettings(await window.controls.setAlwaysOnTop(checked));
  };

  if (alwaysOnTopToggle) {
    alwaysOnTopToggle.addEventListener('change', () => handlePinToggle(alwaysOnTopToggle.checked));
  }
  if (quickPinToggle) {
    quickPinToggle.addEventListener('change', () => handlePinToggle(quickPinToggle.checked));
  }

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

  const handleReset = async () => {
    applySettings(await window.controls.resetSettings());
  };

  if (resetBtn) resetBtn.addEventListener('click', handleReset);
  if (quickResetBtn) quickResetBtn.addEventListener('click', handleReset);

  const handleQuit = () => {
    window.controls.quitApp();
  };

  if (quitBtn) quitBtn.addEventListener('click', handleQuit);
  if (quickQuitBtn) quickQuitBtn.addEventListener('click', handleQuit);

  // ---- Troubleshoot Actions ----
  downloadCaBtn.addEventListener('click', () => {
    if (currentPhoneUrl && window.controls.openExternal) {
      const baseUrl = currentPhoneUrl.split('?')[0].replace(/\/+$/, '');
      window.controls.openExternal(`${baseUrl}/ca.crt`);
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

    let _lastServerRunning = isServerRunning;
    window.controls.onConnectionStatus(async (status) => {
      updateStatus(status);
      // Auto-refresh QR code whenever the server transitions to running
      if (status.serverRunning && !_lastServerRunning) {
        await refreshSignalInfo();
      }
      _lastServerRunning = !!status.serverRunning;
    });
  }

  init();
})();
