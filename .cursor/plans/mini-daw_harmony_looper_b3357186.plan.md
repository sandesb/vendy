---
name: Mini-DAW Harmony Looper
overview: Add a Harmony Mode that plays recordings at music-theory-based fixed intervals triggered by finger-count gestures, plus a metronome with visual countdown before/during recording to enable accurate looping layers.
todos:
  - id: harmony-engine
    content: Add harmonicMode, harmonyPresets, harmonySources to buildEngine state; implement startHarmony() and stopHarmony() using multiple AudioBufferSourceNode
    status: completed
  - id: finger-gesture
    content: Add gestureMode='fingers' branch in computeGesture that counts raised fingers and calls startHarmony/stopHarmony; add 'Fingers → Harmony' option to gesture selector UI
    status: completed
  - id: harmony-panel
    content: Add Harmony panel section with mode toggle, 4 preset slots (editable semitone offsets + preset name labels), and pitch-track dim when fingers mode is active
    status: completed
  - id: metronome-engine
    content: Add playClick() to buildEngine; add metroBpm/metroCountIn React state; replace startMicRecording with startMicRecordingWithCountdown that runs setTimeout countdown sequence then starts MediaRecorder + beat interval
    status: completed
  - id: countdown-ui
    content: Add countdown React state and countdown overlay JSX over main-view; add BPM and count-in controls in the Library tab recording section; add CSS for overlay and metronome controls
    status: completed
isProject: false
---

# Mini-DAW Harmony Looper

## What gets built

Three interlocking features added to the existing VENDY engine in `[src/App.jsx](src/App.jsx)` and `[src/App.css](src/App.css)`:

1. **Harmony Mode** — plays the loaded buffer at one or more fixed semitone offsets (theory presets) instead of continuous Y-axis control
2. **Finger-count gesture** — replaces the Y-axis read with a discrete count of raised fingers, each mapped to a harmony preset
3. **Metronome + countdown** — BPM-locked audio click + visual 3-2-1 overlay before recording starts, beat counter while recording

---

## Feature 1 — Harmony Mode

### New engine state (inside `buildEngine`)

```js
harmonicMode: false,           // toggle
harmonyPresets: [3, 4, 7, 12], // default semitone offsets per finger (1–4)
harmonySources: [],            // live AudioBufferSourceNodes
lastFingerCount: -1,           // debounce re-triggers
```

### `startHarmony(semitones[])` function in engine

```js
const startHarmony = (semitonesArr) => {
  // stop previous harmony sources
  state.harmonySources.forEach(s => { try { s.stop(); } catch(_){} });
  state.harmonySources = [];
  semitonesArr.forEach(st => {
    const src = state.audioCtx.createBufferSource();
    src.buffer = state.audioBuffer;
    src.playbackRate.value = Math.pow(2, st / 12);
    src.loop = true;
    src.connect(state.gainNode);
    src.start();
    state.harmonySources.push(src);
  });
};
const stopHarmony = () => {
  state.harmonySources.forEach(s => { try { s.stop(); } catch(_){} });
  state.harmonySources = [];
};
```

### Harmony presets UI (new panel section)

Named intervals for finger slots 1–4 with editable semitone offsets (or pick from dropdown):


| Slot      | Default name  | Semitones |
| --------- | ------------- | --------- |
| 1 finger  | Minor Third   | +3        |
| 2 fingers | Major Third   | +4        |
| 3 fingers | Perfect Fifth | +7        |
| 4 fingers | Octave Up     | +12       |
| Fist (0)  | Stop harmony  | —         |


User can change each slot's semitone offset (−24 to +24) via a small number input. A `setHarmonyPreset(slot, semitones)` method on the engine API updates `state.harmonyPresets[slot]`.

---

## Feature 2 — Finger-Count Gesture Mode

### New `gestureMode: 'fingers'` branch inside `computeGesture`

```js
} else if (state.gestureMode === 'fingers') {
  // Finger tips [8,12,16,20], PIPs [7,11,15,19]
  const tips  = [8, 12, 16, 20];
  const pips  = [7, 11, 15, 19];
  let count = 0;
  tips.forEach((t, i) => {
    if (landmarks[t].y < landmarks[pips[i]].y) count++;
  });
  if (count !== state.lastFingerCount) {
    state.lastFingerCount = count;
    if (count === 0) stopHarmony();
    else startHarmony([state.harmonyPresets[count - 1]]);
  }
  // Y-axis pitch control is intentionally skipped in this mode
}
```

The gesture mode selector in the panel gets a new option: **"Fingers → Harmony"** (`value="fingers"`). The pitch track/thumb UI dims when this mode is active (CSS class toggle).

---

## Feature 3 — Metronome + Countdown

### React state additions

```js
const [metroBpm, setMetroBpm] = useState(120);
const [metroCountIn, setMetroCountIn] = useState(1); // bars before record
const [countdown, setCountdown] = useState(null);    // null | 3 | 2 | 1 | 'GO!'
const [recordBeat, setRecordBeat] = useState(null);  // beat number while recording
```

### Audio click generator (added to `buildEngine`)

```js
const playClick = (isDownbeat) => {
  const osc = state.audioCtx.createOscillator();
  const g   = state.audioCtx.createGain();
  osc.connect(g); g.connect(state.audioCtx.destination);
  osc.frequency.value = isDownbeat ? 880 : 660;
  g.gain.setValueAtTime(0.5, state.audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.06);
  osc.start(); osc.stop(state.audioCtx.currentTime + 0.06);
};
```

### `startMicRecordingWithCountdown` (replaces `startMicRecording`)

Sequence using `setTimeout`:

1. `setCountdown(3)` + `playClick(true)` → wait one beat
2. `setCountdown(2)` + `playClick(false)` → wait one beat
3. `setCountdown(1)` + `playClick(false)` → wait one beat
4. `setCountdown('GO!')` + `playClick(true)` → wait one beat
5. `setCountdown(null)`, start `MediaRecorder`, begin beat-tick `setInterval`

Beat interval = `60000 / bpm` ms. The `setInterval` increments `recordBeat` and calls `playClick` on each tick so the user can hear tempo while recording.

### Countdown overlay

Shown over the main video area (absolute-positioned on top of `.main-view`):

```jsx
{countdown !== null && (
  <div className="countdown-overlay">
    <span className="countdown-number">{countdown}</span>
  </div>
)}
```

Large centered number, semi-transparent dark background, animated scale-in.

### Metronome controls in Cloud Library recording section

- BPM number input (60–200)
- Count-in selector (1 bar / 2 bars)
- These appear just above the Rec button in the Library tab

---

## Affected files

- `[src/App.jsx](src/App.jsx)` — engine state, `computeGesture`, new harmony/metro functions, updated recording flow, new JSX sections
- `[src/App.css](src/App.css)` — `.harmony-section`, `.finger-map`, `.countdown-overlay`, `.countdown-number`, `.harmony-dim` styles
- **No DB/API changes** — harmony is purely client-side; `vendy_recordings` table is unchanged

---

## Looper workflow this enables

```
Record base take (with metronome clicks)
  → Upload to library
Load base take from library
  → Enable Harmony Mode (gesture = 'fingers')
  → Hold up N fingers → base plays at harmony interval
  → Hear the harmony → sing/play a new layer over it
Record new layer (with same metronome)
  → Upload second take
```

