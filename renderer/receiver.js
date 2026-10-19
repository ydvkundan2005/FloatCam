(function () {
  const shapeEl = document.getElementById('shape');
  const video = document.getElementById('remoteVideo');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlayText');
  const resizeHandle = document.getElementById('resizeHandle');

  const RECONNECT_BASE_DELAY_MS = 1000;
  const RECONNECT_MAX_DELAY_MS = 10000;
  const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

  let ws = null;
  let pc = null;
  let wsUrl = null;
  let reconnectAttempt = 0;
  let reconnectTimer = null;
  let intentionalClose = false;

  let localMacStream = null;
  let isUsingLocalCamera = false;
  let phoneStream = null;

  // ---- shape / zoom ----

  function applyShape(state) {
    const shape = (window.getShape && window.getShape(state.shape)) || null;
    if (!shape) return;
    if (shape.clipPath && shape.clipPath !== 'none') {
      shapeEl.style.clipPath = shape.clipPath;
      shapeEl.style.borderRadius = '0';
    } else {
      shapeEl.style.clipPath = 'none';
      shapeEl.style.borderRadius = shape.borderRadius || '0';
    }
  }

  function applyZoom(state) {
    const zoom = Number(state.zoomLevel) || 1;
    video.style.transform = 'scale(' + zoom + ')';
  }

  function applyState(state) {
    applyShape(state);
    applyZoom(state);
  }

  function setOverlay(visible, text) {
    if (text) overlayText.textContent = text;
    overlay.classList.toggle('visible', !!visible);
  }

  // ---- resize handle ----

  function startResize(e) {
    e.preventDefault();
    let lastX = e.screenX;
    let lastY = e.screenY;

    function onMove(ev) {
      const dw = ev.screenX - lastX;
      const dh = ev.screenY - lastY;
      lastX = ev.screenX;
      lastY = ev.screenY;
      if (dw !== 0 || dh !== 0) window.floatingCam.resizeBy(dw, dh);
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  resizeHandle.addEventListener('mousedown', startResize);

  // ---- Local Mac Camera Support ----

  async function startLocalCamera() {
    isUsingLocalCamera = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      localMacStream = stream;
      video.srcObject = stream;
      setOverlay(false);
      window.floatingCam.reportVideoState(true);
    } catch (err) {
      isUsingLocalCamera = false;
      setOverlay(true, 'Mac camera permission denied');
    }
  }

  function stopLocalCamera() {
    isUsingLocalCamera = false;
    if (localMacStream) {
      localMacStream.getTracks().forEach((t) => t.stop());
      localMacStream = null;
    }
    if (phoneStream) {
      video.srcObject = phoneStream;
      setOverlay(false);
      window.floatingCam.reportVideoState(true);
    } else {
      video.srcObject = null;
      window.floatingCam.reportVideoState(false);
      setOverlay(true, 'Waiting for phone…');
    }
  }

  // ---- WebRTC (Answerer) ----

  function teardownPeerConnection(nextOverlayText) {
    if (pc) {
      try {
        pc.close();
      } catch (err) {
        /* ignore */
      }
      pc = null;
    }
    phoneStream = null;
    if (!isUsingLocalCamera) {
      video.srcObject = null;
      window.floatingCam.reportVideoState(false);
      setOverlay(true, nextOverlayText || 'Waiting for phone…');
    }
  }

  function createPeerConnection() {
    const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    conn.ontrack = (e) => {
      phoneStream = e.streams[0];
      if (!isUsingLocalCamera) {
        video.srcObject = phoneStream;
        setOverlay(false);
        window.floatingCam.reportVideoState(true);
      }
    };

    conn.onicecandidate = (e) => {
      if (e.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
      }
    };

    conn.oniceconnectionstatechange = () => {
      const state = conn.iceConnectionState;
      if (state === 'failed' || state === 'disconnected') {
        if (!isUsingLocalCamera) setOverlay(true, 'Reconnecting…');
      }
    };

    return conn;
  }

  async function handleSignal(msg) {
    switch (msg.type) {
      case 'offer': {
        if (pc) {
          try {
            pc.close();
          } catch (err) {
            /* ignore */
          }
        }
        pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', sdp: pc.localDescription }));
        break;
      }
      case 'candidate':
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch (err) {
            /* ignore */
          }
        }
        break;
      case 'phone-status':
        if (!msg.connected) teardownPeerConnection('Waiting for phone…');
        break;
      default:
        break;
    }
  }

  function scheduleReconnect() {
    if (intentionalClose) return;
    clearTimeout(reconnectTimer);
    const delay = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_BASE_DELAY_MS * Math.pow(1.6, reconnectAttempt)
    );
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(connectSignaling, delay);
  }

  function connectSignaling() {
    if (!wsUrl) return;
    if (!isUsingLocalCamera) setOverlay(true, 'Connecting to local server…');

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempt = 0;
      ws.send(JSON.stringify({ type: 'hello', role: 'mac' }));
    };

    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch (err) {
        return;
      }
      handleSignal(msg).catch(() => {
        if (!isUsingLocalCamera) setOverlay(true, 'Connection error — retrying…');
      });
    };

    ws.onclose = () => {
      teardownPeerConnection();
      if (!intentionalClose && !isUsingLocalCamera) {
        setOverlay(true, 'Disconnected — retrying…');
        scheduleReconnect();
      }
    };

    ws.onerror = () => {};
  }

  // ---- boot ----

  async function init() {
    try {
      const settings = await window.floatingCam.getSettings();
      applyState(settings);
    } catch (err) {
      /* fallback */
    }

    window.floatingCam.onState((state) => applyState(state));

    window.floatingCam.onConnectionStatus((status) => {
      if (isUsingLocalCamera) return;
      if (!status.serverRunning) {
        setOverlay(true, 'Server stopped — start via menu bar');
      } else if (!status.phoneConnected) {
        setOverlay(true, 'Waiting for phone…');
      }
    });

    if (window.floatingCam.onToggleLocalCamera) {
      window.floatingCam.onToggleLocalCamera((enabled) => {
        if (enabled) startLocalCamera();
        else stopLocalCamera();
      });
    }

    try {
      const info = await window.floatingCam.getSignalUrl();
      wsUrl = info.wsUrl;
      connectSignaling();
    } catch (err) {
      setOverlay(true, 'Could not reach local server.');
    }
  }

  window.addEventListener('beforeunload', () => {
    intentionalClose = true;
    clearTimeout(reconnectTimer);
    if (localMacStream) {
      localMacStream.getTracks().forEach((t) => t.stop());
    }
    if (ws) {
      try {
        ws.close();
      } catch (err) {
        /* ignore */
      }
    }
  });

  init();
})();
