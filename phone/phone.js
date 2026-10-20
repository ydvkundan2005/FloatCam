/**
 * phone.js — FloatCam V3 Phone Client
 *
 * Reads the session token from the URL (?s=<token>) and includes it
 * in every 'hello' message so the server can validate the session.
 * This prevents a phone from accidentally joining a different user's
 * FloatCam instance on the same local network.
 */
(function () {
  const localVideo   = document.getElementById('localVideo');
  const startBtn     = document.getElementById('startBtn');
  const switchBtn    = document.getElementById('switchBtn');
  const statusText   = document.getElementById('statusText');
  const statusDot    = document.getElementById('statusDot');
  const errorModal   = document.getElementById('errorModal');
  const modalTitle   = document.getElementById('modalTitle');
  const modalBody    = document.getElementById('modalBody');
  const modalRetryBtn= document.getElementById('modalRetryBtn');
  const modalCloseBtn= document.getElementById('modalCloseBtn');

  // LAN-only: no external STUN/TURN needed because phone and computer are
  // on the same Wi-Fi. Keeping stun.l.google.com as a lightweight helper
  // for local ICE candidate gathering (it never relays actual media).
  const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

  const RECONNECT_BASE_DELAY_MS = 1000;
  const RECONNECT_MAX_DELAY_MS  = 10000;

  // ---- Extract session token from URL (?s=<token>) ----
  const SESSION_TOKEN = (function () {
    try {
      return new URLSearchParams(window.location.search).get('s') || '';
    } catch (_) {
      return '';
    }
  })();

  let ws              = null;
  let pc              = null;
  let localStream     = null;
  let facingMode      = 'environment'; // Rear camera by default
  let peerReady       = false;
  let cameraRunning   = false;
  let negotiating     = false;
  let intentionalClose= false;
  let reconnectAttempt= 0;
  let reconnectTimer  = null;
  let pendingCandidates = [];

  // ---- Status helpers ----

  function setStatus(text, level) {
    statusText.textContent = text;
    statusDot.className    = 'status-dot ' + (level || '');
  }

  function showModal(title, body) {
    modalTitle.textContent = title;
    modalBody.textContent  = body;
    errorModal.classList.remove('hidden');
  }

  function hideModal() {
    errorModal.classList.add('hidden');
  }

  modalCloseBtn.addEventListener('click', hideModal);
  modalRetryBtn.addEventListener('click', () => { hideModal(); startCamera(); });

  // ---- Device Identification ----
  function getDeviceLabel() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua))   return 'iPhone';
    if (/iPad/.test(ua))     return 'iPad';
    if (/Android/.test(ua))  return 'Android Device';
    return 'Mobile Browser';
  }

  // ---- Signaling ----

  function connectSignaling() {
    const wsUrl = 'wss://' + location.host + '/signal';
    setStatus('Connecting…', 'warn');

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempt = 0;
      ws.send(JSON.stringify({
        type:   'hello',
        role:   'phone',
        device: getDeviceLabel(),
        token:  SESSION_TOKEN   // V3: session token for server-side validation
      }));
      setStatus(
        cameraRunning ? 'Camera on — waiting for desktop preview…' : 'Connected — tap Start Camera',
        'ok'
      );
    };

    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      handleSignal(msg);
    };

    ws.onclose = () => {
      peerReady = false;
      teardownPeerConnection();
      if (!intentionalClose) {
        setStatus(cameraRunning ? 'Reconnecting…' : 'Disconnected — retrying…', 'warn');
        scheduleReconnect();
      }
    };

    ws.onerror = () => { /* onclose fires next */ };
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

  // ---- WebRTC ----

  function teardownPeerConnection() {
    pendingCandidates = [];
    negotiating = false;
    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.oniceconnectionstatechange = null;
        pc.ontrack = null;
        pc.close();
      } catch { /* ignore */ }
      pc = null;
    }
  }

  function createPeerConnection() {
    const conn = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    conn.onicecandidate = (e) => {
      if (e.candidate && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
      }
    };

    conn.oniceconnectionstatechange = () => {
      const state = conn.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setStatus('Live — streaming to desktop preview', 'ok');
      } else if (state === 'disconnected') {
        setStatus('Connection unstable…', 'warn');
      } else if (state === 'failed') {
        setStatus('Reconnecting stream…', 'error');
        teardownPeerConnection();
        if (peerReady && cameraRunning) createOfferIfReady();
      }
    };

    if (localStream) {
      localStream.getTracks().forEach((track) => conn.addTrack(track, localStream));
    }

    return conn;
  }

  async function createOfferIfReady() {
    if (!peerReady || !cameraRunning || negotiating) return;
    negotiating = true;
    try {
      teardownPeerConnection();
      pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));
      }
    } catch (err) {
      setStatus('Failed to negotiate stream', 'error');
    } finally {
      negotiating = false;
    }
  }

  async function handleSignal(msg) {
    switch (msg.type) {
      case 'peer-ready':
        peerReady = true;
        createOfferIfReady();
        break;
      case 'answer':
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            while (pendingCandidates.length > 0) {
              const cand = pendingCandidates.shift();
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (_) {
                /* benign */
              }
            }
          } catch {
            /* ignore */
          }
        }
        break;
      case 'candidate':
        if (msg.candidate) {
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch {
              /* benign */
            }
          } else {
            pendingCandidates.push(msg.candidate);
          }
        }
        break;
      case 'camera-switch':
        toggleFacingMode();
        break;
      case 'peer-left':
        peerReady = false;
        teardownPeerConnection();
        setStatus(cameraRunning ? 'Camera on — waiting for desktop…' : 'Waiting for desktop…', 'warn');
        break;
      case 'replaced':
      case 'force-disconnect':
        setStatus('Disconnected by desktop dashboard.', 'warn');
        stopCamera();
        intentionalClose = true;
        if (ws) ws.close();
        break;
      case 'rejected':
        // Server rejected connection (wrong session token)
        setStatus('Session invalid — scan the QR code again.', 'error');
        intentionalClose = true;
        if (ws) ws.close();
        showModal(
          'Session Expired',
          'This QR code is no longer valid. Please scan the current QR code from the FloatCam dashboard.'
        );
        break;
      default:
        break;
    }
  }

  // ---- Camera ----

  function handleCameraError(err) {
    let title   = 'Camera Access Blocked';
    let message = 'Unable to access your phone camera.';

    if (err && err.name === 'NotAllowedError') {
      message = 'Permission denied. In Safari: tap the "aA" icon in address bar → Website Settings → Camera → Allow. In Chrome: tap lock icon → Site settings → Camera → Allow.';
    } else if (err && err.name === 'NotFoundError') {
      message = 'No camera found on this device.';
    } else if (err && err.name === 'NotReadableError') {
      message = 'Camera is in use by another app or browser tab. Please close other camera apps and retry.';
    }
    setStatus('Permission denied', 'error');
    showModal(title, message);
  }

  async function startCamera() {
    startBtn.disabled = true;
    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width:  { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      const stream  = await navigator.mediaDevices.getUserMedia(constraints);
      localStream   = stream;
      localVideo.srcObject = stream;
      cameraRunning = true;
      startBtn.innerHTML   = '<span class="btn-icon">⏹</span> Stop Camera';
      switchBtn.disabled   = false;
      setStatus(peerReady ? 'Starting video stream…' : 'Camera on — waiting for desktop…', 'warn');
      createOfferIfReady();
    } catch (err) {
      handleCameraError(err);
    } finally {
      startBtn.disabled = false;
    }
  }

  function stopCamera() {
    cameraRunning = false;
    teardownPeerConnection();
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }
    localVideo.srcObject = null;
    startBtn.innerHTML   = '<span class="btn-icon">📹</span> Start Camera';
    switchBtn.disabled   = true;
    setStatus('Camera stopped', '');
  }

  async function toggleFacingMode() {
    const nextFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    switchBtn.disabled   = true;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacingMode }, width: { ideal: 1920 } },
        audio: false
      });
      const newTrack = newStream.getVideoTracks()[0];
      const oldStream = localStream;
      facingMode   = nextFacingMode;
      localStream  = newStream;
      localVideo.srcObject = newStream;
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) await sender.replaceTrack(newTrack);
      }
      if (oldStream) oldStream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      handleCameraError(err);
    } finally {
      switchBtn.disabled = false;
    }
  }

  startBtn.addEventListener('click',  () => { if (cameraRunning) stopCamera(); else startCamera(); });
  switchBtn.addEventListener('click', toggleFacingMode);

  window.addEventListener('beforeunload', () => {
    intentionalClose = true;
    clearTimeout(reconnectTimer);
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    if (ws) { try { ws.close(); } catch { /* ignore */ } }
  });

  setStatus('Ready', '');
  connectSignaling();
})();
