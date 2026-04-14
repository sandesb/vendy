import { useEffect, useRef, useState } from 'react';
import './App.css';

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.crossOrigin = 'anonymous';
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });

export default function App() {
  const [started, setStarted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [inputMode, setInputMode] = useState('file');
  const refs = useRef({});
  const engineRef = useRef(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
    ])
      .then(() => { if (alive) engineRef.current = buildEngine(refs.current); })
      .catch(() => {});
    return () => {
      alive = false;
      engineRef.current?.destroy();
    };
  }, []);

  const handleStart = async () => {
    if (!engineRef.current) return;
    try {
      await engineRef.current.init();
      setStarted(true);
    } catch (err) {
      console.error('Initialization failed:', err);
    }
  };

  return (
    <div id="app">
      <header>
        <div className="logo">VEND<span>Y</span></div>

        <div className="header-right">
          <button className="menu-btn" onClick={() => setPanelOpen((v) => !v)}>
            ☰ Controls
          </button>
          <div className="status-bar">
            <div className="status-item">
              <div className="dot" ref={(r) => { refs.current.dotCam = r; }} />
              Camera
            </div>
            <div className="status-item">
              <div className="dot" ref={(r) => { refs.current.dotHand = r; }} />
              Hand Track
            </div>
            <div className="status-item">
              <div className="dot" ref={(r) => { refs.current.dotAudio = r; }} />
              Audio
            </div>
            <div className="status-item">
              <div className="dot" ref={(r) => { refs.current.dotPlaying = r; }} />
              Playing
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CAMERA VIEW ── */}
      <div className="main">
        <div className="video-container">
          <video
            autoPlay muted playsInline
            className="webcam"
            ref={(r) => { refs.current.webcam = r; }}
          />
          <canvas
            className="hand-canvas"
            ref={(r) => { refs.current.handCanvas = r; }}
          />
          <canvas
            className="pitch-line-canvas"
            ref={(r) => { refs.current.pitchLineCanvas = r; }}
          />
        </div>

        {!started && (
          <div className="overlay">
            <div className="overlay-title">VENDY</div>
            <div className="overlay-sub">Gesture-Controlled Pitch Shifter</div>
            <button className="start-btn" onClick={handleStart}>
              Initialize System
            </button>
            <div className="overlay-note">
              Place <code>audio.mp3</code> in the <code>public/</code> folder, or use Mic Live mode.
              <br />
              Raise your hand to shift pitch up · Lower to shift down.
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE BACKDROP ── */}
      {panelOpen && (
        <div className="panel-backdrop" onClick={() => setPanelOpen(false)} />
      )}

      {/* ── SIDE PANEL ── */}
      <div className={`panel${panelOpen ? ' open' : ''}`}>

        <div className="panel-section panel-close-row">
          <button className="btn" onClick={() => setPanelOpen(false)}>✕ Close</button>
        </div>

        {/* PITCH CONTROL */}
        <div className="panel-section">
          <div className="section-label">// Pitch Control</div>
          <div className="pitch-display">
            <div
              className="pitch-value"
              ref={(r) => { refs.current.pitchDisplay = r; }}
            >
              1.00
            </div>
            <div className="pitch-unit">Playback Rate</div>
            <div className="semitone-display">
              <span>SEMITONES</span>
              <span
                className="semitone-val"
                ref={(r) => { refs.current.semitoneDisplay = r; }}
              >
                +0.0
              </span>
            </div>
          </div>

          <div className="pitch-slider-container">
            <div className="scale-labels">
              <span>+12</span><span>+6</span><span>0</span><span>-6</span><span>-12</span>
            </div>
            <div className="pitch-track">
              <div className="pitch-thumb" ref={(r) => { refs.current.pitchThumb = r; }} />
            </div>
            <div className="scale-labels right-scale">
              <span style={{ color: '#00d4ff' }}>↑ HIGH</span>
              <span />
              <span style={{ color: 'var(--text)' }}>BASE</span>
              <span />
              <span style={{ color: 'var(--accent2)' }}>↓ LOW</span>
            </div>
          </div>

          <div className="zone-indicator">
            <span>Hand Y</span>
            <div className="zone-bar">
              <div className="zone-fill" ref={(r) => { refs.current.zoneFill = r; }} />
            </div>
            <span ref={(r) => { refs.current.zoneLabel = r; }}>—</span>
          </div>
        </div>

        {/* GESTURE MODE */}
        <div className="panel-section">
          <div className="section-label">// Gesture Mode</div>
          <div className="mode-tabs" ref={(r) => { refs.current.modeTabs = r; }}>
            <button className="mode-tab active" onClick={() => engineRef.current?.setMode('y')}>Y Axis</button>
            <button className="mode-tab" onClick={() => engineRef.current?.setMode('spread')}>Spread</button>
            <button className="mode-tab" onClick={() => engineRef.current?.setMode('wrist')}>Wrist</button>
          </div>
          <div
            className="mode-desc"
            ref={(r) => { refs.current.modeDesc = r; }}
            dangerouslySetInnerHTML={{
              __html: 'Move hand <strong>up/down</strong> to control pitch. Top of frame = highest pitch.',
            }}
          />
        </div>

        {/* PLAYBACK */}
        <div className="panel-section">
          <div className="section-label">// Playback</div>

          <div className="input-tabs">
            <button
              className={`input-tab${inputMode === 'file' ? ' active' : ''}`}
              onClick={() => { setInputMode('file'); engineRef.current?.setInputMode('file'); }}
            >
              File
            </button>
            <button
              className={`input-tab${inputMode === 'mic' ? ' active' : ''}`}
              onClick={() => { setInputMode('mic'); engineRef.current?.setInputMode('mic'); }}
            >
              🎤 Mic Live
            </button>
          </div>

          <div className="ctrl-row">
            <button
              className="btn"
              ref={(r) => { refs.current.playBtn = r; }}
              onClick={() => engineRef.current?.togglePlay()}
            >
              ▶ Play
            </button>
            <button
              className="btn active"
              ref={(r) => { refs.current.loopBtn = r; }}
              onClick={() => engineRef.current?.toggleLoop()}
            >
              ⟳ Loop
            </button>
            <button className="btn danger" onClick={() => engineRef.current?.resetPitch()}>
              ↺ Reset
            </button>
          </div>

          <div className="range-group">
            <div className="range-label">
              Volume <span ref={(r) => { refs.current.volVal = r; }}>80%</span>
            </div>
            <input
              type="range" min="0" max="100" defaultValue="80"
              onInput={(e) => engineRef.current?.setVolume(e.target.value)}
            />
          </div>

          <div className="range-group">
            <div className="range-label">
              Smoothing <span ref={(r) => { refs.current.smoothVal = r; }}>0.30</span>
            </div>
            <input
              type="range" min="0" max="99" defaultValue="30"
              onInput={(e) => engineRef.current?.setSmoothing(e.target.value)}
            />
          </div>

          <div className="range-group">
            <div className="range-label">
              Range (semitones) <span ref={(r) => { refs.current.rangeVal = r; }}>±12</span>
            </div>
            <input
              type="range" min="3" max="24" defaultValue="12"
              onInput={(e) => engineRef.current?.setRange(e.target.value)}
            />
          </div>
        </div>

        {/* WAVEFORM */}
        <div className="panel-section">
          <div className="section-label">// Waveform</div>
          <canvas className="osc-canvas" ref={(r) => { refs.current.oscCanvas = r; }} />
          <div className="vu-container" ref={(r) => { refs.current.vuMeter = r; }} />
        </div>

        {/* LOG */}
        <div className="panel-section">
          <div className="section-label">// System Log</div>
          <div className="log" ref={(r) => { refs.current.log = r; }}>
            <div>Awaiting initialization...</div>
          </div>
        </div>
      </div>

      <footer>
        <span>VENDY v1.0 — Gesture Pitch Shifter</span>
        <span ref={(r) => { refs.current.fpsCounter = r; }}>FPS: —</span>
        <span ref={(r) => { refs.current.handCount = r; }}>Hands: 0</span>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ENGINE — all audio / hand-tracking logic (imperative)
// ═══════════════════════════════════════════════════════════
function buildEngine(el) {
  const VU_BARS = 24;

  const state = {
    audioCtx: null,
    sourceNode: null,
    gainNode: null,
    analyserNode: null,
    audioBuffer: null,
    isPlaying: false,
    isLooping: true,
    startTime: 0,
    pauseOffset: 0,
    pitchRate: 1,
    targetPitchRate: 1,
    smoothing: 0.30,          // default < 50%
    semitoneRange: 12,
    gestureMode: 'y',
    handY: 0.5,
    handDetected: false,
    lastFrameTime: 0,
    inputMode: 'file',
    isMicLive: false,
    micStream: null,
    micSourceNode: null,
    micProcessorNode: null,
    shifterWritePos: 0,
    shifterReadPos: 8192,
    shifterBuffer: new Float32Array(32768),
    hands: null,
    camera: null,
    rafId: null,
  };

  // ── VU bars ──
  for (let i = 0; i < VU_BARS; i++) {
    const b = document.createElement('div');
    b.className = 'vu-bar';
    el.vuMeter.appendChild(b);
  }
  const vuBars = Array.from(el.vuMeter.querySelectorAll('.vu-bar'));

  const handCtx = el.handCanvas.getContext('2d');
  const oscCtx = el.oscCanvas.getContext('2d');
  const pitchLineCtx = el.pitchLineCanvas.getContext('2d');

  // ── Helpers ──
  const addLog = (msg, cls = '') => {
    if (!el.log) return;
    const line = document.createElement('div');
    line.className = cls;
    line.textContent = `[${new Date().toTimeString().slice(0, 8)}] ${msg}`;
    el.log.appendChild(line);
    el.log.scrollTop = el.log.scrollHeight;
    if (el.log.children.length > 40) el.log.removeChild(el.log.firstChild);
  };

  const setDot = (dotEl, s) => {
    if (dotEl) dotEl.className = `dot${s ? ` ${s}` : ''}`;
  };

  const updateTargetPitch = () => {
    const st = state.semitoneRange - state.handY * state.semitoneRange * 2;
    state.targetPitchRate = Math.pow(2, st / 12);
  };

  // ── Hand drawing ──
  const CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17],
  ];
  const TIPS = [4, 8, 12, 16, 20];

  const drawHand = (landmarks) => {
    const w = el.handCanvas.width;
    const h = el.handCanvas.height;
    handCtx.shadowBlur = 12;
    handCtx.shadowColor = '#00f5c4';
    handCtx.strokeStyle = 'rgba(0,245,196,0.6)';
    handCtx.lineWidth = 2;
    CONNECTIONS.forEach(([a, b]) => {
      handCtx.beginPath();
      handCtx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
      handCtx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
      handCtx.stroke();
    });
    landmarks.forEach((lm, i) => {
      const isTip = TIPS.includes(i);
      handCtx.beginPath();
      handCtx.arc(lm.x * w, lm.y * h, isTip ? 6 : 3, 0, Math.PI * 2);
      handCtx.fillStyle = isTip ? '#00f5c4' : 'rgba(0,245,196,0.4)';
      handCtx.shadowBlur = isTip ? 16 : 6;
      handCtx.shadowColor = '#00f5c4';
      handCtx.fill();
    });
    handCtx.shadowBlur = 0;
  };

  const computeGesture = (landmarks) => {
    let val = 0.5;
    if (state.gestureMode === 'y') {
      val = landmarks[0].y;
    } else if (state.gestureMode === 'spread') {
      const dx = landmarks[8].x - landmarks[20].x;
      const dy = landmarks[8].y - landmarks[20].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      val = 1 - Math.min(1, Math.max(0, (dist - 0.05) / 0.35));
    } else if (state.gestureMode === 'wrist') {
      const tilt = (landmarks[17].y - landmarks[5].y) + 0.5;
      val = Math.min(1, Math.max(0, tilt));
    }
    state.handY += (val - state.handY) * (1 - state.smoothing);
    updateTargetPitch();
  };

  // ── Visualizers ──
  const drawOscilloscope = () => {
    if (!state.analyserNode || !el.oscCanvas) return;
    const w = el.oscCanvas.offsetWidth || 320;
    const h = 60;
    el.oscCanvas.width = w;
    el.oscCanvas.height = h;
    const data = new Uint8Array(state.analyserNode.frequencyBinCount);
    state.analyserNode.getByteTimeDomainData(data);
    oscCtx.clearRect(0, 0, w, h);
    oscCtx.fillStyle = 'rgba(5,8,16,0.5)';
    oscCtx.fillRect(0, 0, w, h);
    const color = state.pitchRate > 1.02 ? '#00d4ff' : state.pitchRate < 0.98 ? '#ff4b6e' : '#00f5c4';
    oscCtx.strokeStyle = color;
    oscCtx.shadowColor = color;
    oscCtx.shadowBlur = 6;
    oscCtx.lineWidth = 1.5;
    oscCtx.beginPath();
    const sliceW = w / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const y = ((data[i] / 128.0) * h) / 2;
      if (i === 0) oscCtx.moveTo(x, y); else oscCtx.lineTo(x, y);
      x += sliceW;
    }
    oscCtx.stroke();
    oscCtx.shadowBlur = 0;
  };

  const drawVU = () => {
    if (!state.analyserNode) return;
    const data = new Uint8Array(state.analyserNode.frequencyBinCount);
    state.analyserNode.getByteFrequencyData(data);
    const step = Math.floor(data.length / VU_BARS);
    const hue = state.pitchRate > 1.02 ? '#00d4ff' : state.pitchRate < 0.98 ? '#ff4b6e' : '#00f5c4';
    vuBars.forEach((bar, i) => {
      const val = data[i * step] / 255;
      bar.style.height = `${Math.max(4, val * 50)}px`;
      bar.style.background = hue;
      bar.style.boxShadow = `0 0 ${val * 8}px ${hue}`;
    });
  };

  const drawPitchLine = () => {
    const c = el.pitchLineCanvas;
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    pitchLineCtx.clearRect(0, 0, c.width, c.height);
    if (!state.handDetected) return;

    const y = state.handY * c.height;
    const semitones = 12 * Math.log2(state.pitchRate);
    const color = semitones > 0.5 ? '#00d4ff' : semitones < -0.5 ? '#ff4b6e' : '#00f5c4';

    pitchLineCtx.shadowColor = color;
    pitchLineCtx.shadowBlur = 20;
    pitchLineCtx.strokeStyle = color;
    pitchLineCtx.lineWidth = 2;
    pitchLineCtx.setLineDash([8, 6]);
    pitchLineCtx.beginPath();
    pitchLineCtx.moveTo(0, y);
    pitchLineCtx.lineTo(c.width, y);
    pitchLineCtx.stroke();
    pitchLineCtx.setLineDash([]);
    pitchLineCtx.shadowBlur = 0;

    pitchLineCtx.fillStyle = color;
    pitchLineCtx.font = '600 13px "Share Tech Mono", monospace';
    const label = `${semitones >= 0 ? '+' : ''}${semitones.toFixed(1)} st  ×${state.pitchRate.toFixed(2)}`;
    pitchLineCtx.fillText(label, 16, y - 8);

    const cy = c.height / 2;
    pitchLineCtx.strokeStyle = 'rgba(255,255,255,0.12)';
    pitchLineCtx.lineWidth = 1;
    pitchLineCtx.setLineDash([4, 8]);
    pitchLineCtx.beginPath();
    pitchLineCtx.moveTo(0, cy);
    pitchLineCtx.lineTo(c.width, cy);
    pitchLineCtx.stroke();
    pitchLineCtx.setLineDash([]);
    pitchLineCtx.fillStyle = 'rgba(255,255,255,0.2)';
    pitchLineCtx.font = '11px "Share Tech Mono"';
    pitchLineCtx.fillText('NEUTRAL', c.width - 80, cy - 6);
  };

  // ── Render loop ──
  const renderLoop = () => {
    state.rafId = requestAnimationFrame(renderLoop);
    state.pitchRate += (state.targetPitchRate - state.pitchRate) * (1 - state.smoothing);

    if (state.sourceNode && state.isPlaying && state.audioCtx) {
      state.sourceNode.playbackRate.setTargetAtTime(
        state.pitchRate, state.audioCtx.currentTime, 0.02
      );
    }

    const semitones = 12 * Math.log2(state.pitchRate);

    if (el.pitchDisplay) {
      el.pitchDisplay.textContent = state.pitchRate.toFixed(2);
      el.pitchDisplay.className =
        Math.abs(semitones) < 0.5 ? 'pitch-value'
          : semitones > 0 ? 'pitch-value shifted-up'
          : 'pitch-value shifted-down';
    }
    if (el.semitoneDisplay) {
      el.semitoneDisplay.textContent = `${semitones >= 0 ? '+' : ''}${semitones.toFixed(1)}`;
    }
    if (el.pitchThumb) {
      const pct = (1 - (semitones + state.semitoneRange) / (state.semitoneRange * 2)) * 100;
      el.pitchThumb.style.top = `${Math.min(98, Math.max(2, pct))}%`;
      const tc = semitones > 0 ? '#00d4ff' : semitones < 0 ? '#ff4b6e' : '#00f5c4';
      el.pitchThumb.style.background = tc;
      el.pitchThumb.style.boxShadow = `0 0 12px ${tc}`;
    }
    if (el.zoneFill) el.zoneFill.style.width = `${state.handY * 100}%`;
    if (el.zoneLabel) el.zoneLabel.textContent = state.handDetected ? state.handY.toFixed(2) : '—';

    drawOscilloscope();
    drawVU();
    drawPitchLine();
  };

  // ── Mic mode ──
  const startMic = async () => {
    if (state.isMicLive || !state.audioCtx) return;
    try {
      if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
      state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      state.micSourceNode = state.audioCtx.createMediaStreamSource(state.micStream);
      state.micProcessorNode = state.audioCtx.createScriptProcessor(1024, 1, 1);
      state.shifterWritePos = 0;
      state.shifterReadPos = 8192;
      state.shifterBuffer.fill(0);
      const size = state.shifterBuffer.length;
      state.micProcessorNode.onaudioprocess = (evt) => {
        const input = evt.inputBuffer.getChannelData(0);
        const output = evt.outputBuffer.getChannelData(0);
        for (let i = 0; i < input.length; i++) {
          state.shifterBuffer[state.shifterWritePos] = input[i];
          state.shifterWritePos = (state.shifterWritePos + 1) % size;
        }
        for (let i = 0; i < output.length; i++) {
          const i0 = Math.floor(state.shifterReadPos) % size;
          const i1 = (i0 + 1) % size;
          const frac = state.shifterReadPos - Math.floor(state.shifterReadPos);
          output[i] = state.shifterBuffer[i0] * (1 - frac) + state.shifterBuffer[i1] * frac;
          state.shifterReadPos = (state.shifterReadPos + state.pitchRate) % size;
        }
      };
      state.micSourceNode.connect(state.micProcessorNode);
      state.micProcessorNode.connect(state.gainNode);
      state.isMicLive = true;
      setDot(el.dotPlaying, 'active');
      if (el.playBtn) { el.playBtn.textContent = '⏹ Stop Mic'; el.playBtn.classList.add('active'); }
      addLog('Mic live input started.', 'ok');
    } catch (e) {
      addLog(`Mic error: ${e.message}`, 'err');
      setDot(el.dotAudio, 'error');
    }
  };

  const stopMic = () => {
    if (!state.isMicLive) return;
    state.micProcessorNode?.disconnect();
    state.micSourceNode?.disconnect();
    state.micStream?.getTracks().forEach((t) => t.stop());
    state.micProcessorNode = null;
    state.micSourceNode = null;
    state.micStream = null;
    state.isMicLive = false;
    setDot(el.dotPlaying, '');
    if (el.playBtn) { el.playBtn.textContent = '🎤 Start Mic'; el.playBtn.classList.remove('active'); }
    addLog('Mic stopped.', 'info');
  };

  // ── File playback ──
  const startFile = async () => {
    if (!state.audioBuffer || state.isPlaying) return;
    if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();
    state.sourceNode = state.audioCtx.createBufferSource();
    state.sourceNode.buffer = state.audioBuffer;
    state.sourceNode.loop = state.isLooping;
    state.sourceNode.playbackRate.value = state.pitchRate;
    state.sourceNode.connect(state.gainNode);
    state.sourceNode.onended = () => {
      if (!state.isLooping) {
        state.isPlaying = false;
        if (el.playBtn) el.playBtn.textContent = '▶ Play';
        setDot(el.dotPlaying, '');
      }
    };
    state.sourceNode.start(0, state.pauseOffset);
    state.startTime = state.audioCtx.currentTime - state.pauseOffset;
    state.isPlaying = true;
    if (el.playBtn) el.playBtn.textContent = '⏸ Pause';
    setDot(el.dotPlaying, 'active');
    addLog('Playback started.', 'ok');
  };

  const stopFile = () => {
    if (!state.isPlaying) return;
    state.pauseOffset = (state.audioCtx.currentTime - state.startTime) % state.audioBuffer.duration;
    state.sourceNode.stop();
    state.sourceNode.disconnect();
    state.isPlaying = false;
    if (el.playBtn) el.playBtn.textContent = '▶ Play';
    setDot(el.dotPlaying, '');
    addLog('Playback paused.', 'info');
  };

  // ── Public API ──
  return {
    async init() {
      addLog('Requesting camera...', 'info');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      });
      el.webcam.srcObject = stream;
      await new Promise((r) => { el.webcam.onloadedmetadata = r; });
      setDot(el.dotCam, 'active');
      addLog('Camera ready.', 'ok');

      addLog('Loading MediaPipe Hands...', 'info');
      state.hands = new window.Hands({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
      });
      state.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
      });
      state.hands.onResults((results) => {
        el.handCanvas.width = el.webcam.videoWidth || el.handCanvas.offsetWidth;
        el.handCanvas.height = el.webcam.videoHeight || el.handCanvas.offsetHeight;
        handCtx.clearRect(0, 0, el.handCanvas.width, el.handCanvas.height);
        if (results.multiHandLandmarks?.length) {
          state.handDetected = true;
          setDot(el.dotHand, 'active');
          if (el.handCount) el.handCount.textContent = `Hands: ${results.multiHandLandmarks.length}`;
          const lm = results.multiHandLandmarks[0];
          drawHand(lm);
          computeGesture(lm);
        } else {
          state.handDetected = false;
          if (el.handCount) el.handCount.textContent = 'Hands: 0';
          state.handY += (0.5 - state.handY) * 0.05;
          updateTargetPitch();
        }
      });
      state.camera = new window.Camera(el.webcam, {
        onFrame: async () => {
          await state.hands.send({ image: el.webcam });
          const now = performance.now();
          if (state.lastFrameTime) {
            const fps = Math.round(1000 / (now - state.lastFrameTime));
            if (el.fpsCounter) el.fpsCounter.textContent = `FPS: ${fps}`;
          }
          state.lastFrameTime = now;
        },
        width: 1280,
        height: 720,
      });
      await state.camera.start();
      setDot(el.dotHand, 'active');
      addLog('Hand tracking ready.', 'ok');

      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      state.gainNode = state.audioCtx.createGain();
      state.analyserNode = state.audioCtx.createAnalyser();
      state.analyserNode.fftSize = 256;
      state.gainNode.connect(state.analyserNode);
      state.analyserNode.connect(state.audioCtx.destination);
      state.gainNode.gain.value = 0.8;

      addLog('Loading audio.mp3...', 'info');
      try {
        const resp = await fetch('audio.mp3');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        state.audioBuffer = await state.audioCtx.decodeAudioData(buf);
        addLog(`Audio loaded: ${state.audioBuffer.duration.toFixed(1)}s, ${state.audioBuffer.sampleRate}Hz`, 'ok');
      } catch (e) {
        addLog(`audio.mp3 not found — ${e.message}`, 'err');
        addLog('Mic Live mode still available.', 'info');
      }
      setDot(el.dotAudio, 'active');

      renderLoop();
      addLog('System online.', 'ok');
    },

    togglePlay() {
      if (state.inputMode === 'mic') {
        state.isMicLive ? stopMic() : startMic();
      } else {
        state.isPlaying ? stopFile() : startFile();
      }
    },

    toggleLoop() {
      state.isLooping = !state.isLooping;
      if (state.sourceNode) state.sourceNode.loop = state.isLooping;
      if (el.loopBtn) el.loopBtn.classList.toggle('active', state.isLooping);
      addLog(`Loop: ${state.isLooping ? 'ON' : 'OFF'}`, 'info');
    },

    resetPitch() {
      state.handY = 0.5;
      state.targetPitchRate = 1;
      addLog('Pitch reset.', 'info');
    },

    setVolume(v) {
      if (state.gainNode) state.gainNode.gain.value = v / 100;
      if (el.volVal) el.volVal.textContent = `${v}%`;
    },

    setSmoothing(v) {
      state.smoothing = v / 100;
      if (el.smoothVal) el.smoothVal.textContent = state.smoothing.toFixed(2);
    },

    setRange(v) {
      state.semitoneRange = Number(v);
      if (el.rangeVal) el.rangeVal.textContent = `±${v}`;
    },

    setMode(m) {
      state.gestureMode = m;
      if (el.modeTabs) {
        Array.from(el.modeTabs.querySelectorAll('.mode-tab')).forEach((t) =>
          t.classList.remove('active')
        );
        const idx = { y: 0, spread: 1, wrist: 2 }[m] ?? 0;
        el.modeTabs.querySelectorAll('.mode-tab')[idx]?.classList.add('active');
      }
      const descs = {
        y: 'Move hand <strong>up/down</strong> to control pitch. Top of frame = highest pitch.',
        spread: 'Open/close fingers to control pitch. Wide open = high pitch, closed = low pitch.',
        wrist: 'Tilt your wrist left/right to control pitch.',
      };
      if (el.modeDesc) el.modeDesc.innerHTML = descs[m];
    },

    setInputMode(mode) {
      if (mode === state.inputMode) return;
      if (mode === 'mic' && state.isPlaying) stopFile();
      if (mode === 'file' && state.isMicLive) stopMic();
      state.inputMode = mode;
      if (mode === 'mic') {
        if (el.playBtn) el.playBtn.textContent = '🎤 Start Mic';
        if (el.loopBtn) { el.loopBtn.disabled = true; el.loopBtn.style.opacity = '0.4'; }
      } else {
        if (el.playBtn) el.playBtn.textContent = state.isPlaying ? '⏸ Pause' : '▶ Play';
        if (el.loopBtn) { el.loopBtn.disabled = false; el.loopBtn.style.opacity = ''; }
      }
      addLog(`Input mode: ${mode.toUpperCase()}`, 'info');
    },

    destroy() {
      if (state.rafId) cancelAnimationFrame(state.rafId);
      if (state.isMicLive) stopMic();
      if (state.isPlaying) stopFile();
      state.camera?.stop();
      if (el.webcam?.srcObject) el.webcam.srcObject.getTracks().forEach((t) => t.stop());
      state.audioCtx?.close();
    },
  };
}
