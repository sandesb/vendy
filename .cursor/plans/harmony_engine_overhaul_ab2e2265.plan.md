---
name: Harmony Engine Overhaul
overview: Fix the chipmunk effect by replacing playbackRate-based pitch shifting with Tone.js PitchShift (time-stretching), and add a diatonic key/scale preset system so harmonies are musically in-key.
todos:
  - id: install-tone
    content: npm install tone; add Player, PitchShift, setContext, ToneAudioBuffer imports to App.jsx; call setContext(state.audioCtx) in init() after AudioContext is created
    status: completed
  - id: rewrite-harmony-audio
    content: Rewrite startHarmony to use Player+PitchShift+ToneAudioBuffer chain (playbackRate stays 1.0); rewrite stopHarmony to dispose Tone nodes; update harmonySources type to {player, ps}[]
    status: completed
  - id: diatonic-constants
    content: Add NOTE_NAMES, SCALE_PRESETS, DIATONIC_SAFE constants; add harmonyKey + harmonyScale React state; add handleFillForScale callback
    status: completed
  - id: diatonic-ui
    content: Add key/scale selectors + Fill button to Harmony panel; add in-key badge per finger slot; add explanatory note; add CSS for new elements
    status: completed
isProject: false
---

# Harmony Engine Overhaul

## Problem summary

**Bug — Chipmunk Effect**: `startHarmony` currently sets `playbackRate = Math.pow(2, st/12)`. Speeding up the tape speeds up time AND pitch together. You need pitch shifted WITHOUT changing playback speed.

**Issue — Sour harmonies**: A fixed +3 semitone shift gives a minor third regardless of which note in the scale you are singing. In C Major, singing an E and harmonizing +3 gives G# which is outside the key. True diatonic harmony requires real-time pitch detection (too complex for now), but we can give the user a key-aware preset system that pre-fills the best in-key intervals.

---

## Fix 1 — Tone.js PitchShift (fixes chipmunk)

### How it works

`Tone.PitchShift` uses a granular phase-vocoder under the hood. It chops the audio into overlapping grains, pitch-shifts each grain, and reconstructs audio at the original tempo. The `playbackRate` stays at `1.0`.

### Install

```bash
npm install tone
```

### Import in `src/App.jsx`

```js
import { Player, PitchShift, setContext, ToneAudioBuffer } from 'tone';
```

### Engine init change — in `[src/App.jsx](src/App.jsx)` inside `init()`

After `state.audioCtx = new AudioContext()`:

```js
setContext(state.audioCtx); // share the same context with Tone.js
```

### Rewrite `startHarmony` in `buildEngine`

```js
const startHarmony = (semitonesArr) => {
  stopHarmony();
  if (!state.audioBuffer || !state.audioCtx) return;
  if (state.audioCtx.state === 'suspended') state.audioCtx.resume();

  semitonesArr.forEach((st) => {
    const toneBuffer = new ToneAudioBuffer(state.audioBuffer);
    const player = new Player(toneBuffer);
    const ps = new PitchShift({ pitch: st, windowSize: 0.1 });
    player.connect(ps);
    ps.connect(state.gainNode); // Tone → native AudioNode
    player.loop = true;
    player.start();
    state.harmonySources.push({ player, ps });
  });

  setDot(el.dotPlaying, 'active');
  addLog(`Harmony: ${semitonesArr.map((s) => (s >= 0 ? `+${s}` : `${s}`)).join(', ')} st`, 'ok');
};
```

### Rewrite `stopHarmony`

```js
const stopHarmony = () => {
  state.harmonySources.forEach(({ player, ps }) => {
    try { player.stop(); player.dispose(); ps.dispose(); } catch (_) {}
  });
  state.harmonySources = [];
  addLog('Harmony stopped.', 'info');
};
```

---

## Fix 2 — Diatonic Key/Scale Preset System

### Music theory constants (top of `App.jsx`)

```js
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Recommended finger-slot semitone offsets per scale type
// Values chosen so they are diatonic or near-diatonic for most notes in the scale
const SCALE_PRESETS = {
  major:      [4, 7, 9, 12],   // Maj3, P5, Maj6, Oct — bright, works on I/IV/V
  minor:      [3, 7, 8, 12],   // Min3, P5, Min6, Oct — darker character
  dorian:     [3, 7, 10, 12],  // Min3, P5, Min7, Oct — jazzy
  mixolydian: [4, 7, 10, 12],  // Maj3, P5, Min7, Oct — bluesy
  pentatonic: [3, 7, 10, 12],  // works on any note in a pentatonic key
  blues:      [3, 6, 10, 12],  // Min3, Tritone, Min7, Oct
};

// Intervals that are stable / in-key for a given scale
const DIATONIC_SAFE = {
  major:      [4, 5, 7, 9, 12],
  minor:      [3, 5, 7, 8, 12],
  dorian:     [3, 5, 7, 9, 10, 12],
  mixolydian: [4, 5, 7, 10, 12],
  pentatonic: [3, 7, 10, 12],
  blues:      [3, 6, 10, 12],
};
```

### New React state (in `App`)

```js
const [harmonyKey, setHarmonyKey] = useState('C');
const [harmonyScale, setHarmonyScale] = useState('major');
```

### `handleFillForScale` callback

```js
const handleFillForScale = () => {
  const presets = SCALE_PRESETS[harmonyScale] ?? [3, 4, 7, 12];
  setHarmonyPresets([...presets]);
  presets.forEach((st, i) => engineRef.current?.setHarmonyPreset(i, st));
};
```

### Harmony panel UI changes in `[src/App.jsx](src/App.jsx)`

Inside the `// HARMONY PRESETS` panel section, add **above** the finger map:

```jsx
{/* Key / Scale row */}
<div className="harmony-key-row">
  <select className="harmony-quick-pick"
    value={harmonyKey} onChange={(e) => setHarmonyKey(e.target.value)}>
    {NOTE_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
  </select>
  <select className="harmony-quick-pick"
    value={harmonyScale} onChange={(e) => setHarmonyScale(e.target.value)}>
    <option value="major">Major</option>
    <option value="minor">Minor</option>
    <option value="dorian">Dorian</option>
    <option value="mixolydian">Mixolydian</option>
    <option value="pentatonic">Pentatonic</option>
    <option value="blues">Blues</option>
  </select>
  <button className="btn" onClick={handleFillForScale}>Fill</button>
</div>
```

Each finger slot shows an "in-key" badge:

```jsx
{DIATONIC_SAFE[harmonyScale]?.includes(Math.abs(harmonyPresets[i])) && (
  <span className="in-key-badge">in key</span>
)}
```

Add an explanatory note at the bottom of the section:

> "Fill auto-sets intervals diatonic to [key] [scale]. Note: a single fixed shift sounds best when singing one sustained note. For melodies, real-time pitch detection would be needed for fully adaptive diatonic harmony."

---

## Note on latency

Tone.js `PitchShift` introduces a small delay (`windowSize` default ~0.2 s). Set `windowSize: 0.1` for a better balance of quality vs latency. The harmony will still be clearly audible with no chipmunk effect.

---

## Affected files

- `[src/App.jsx](src/App.jsx)` — install tone import, `setContext` in `init()`, rewrite `startHarmony`/`stopHarmony`, new constants, new React state, harmony panel UI changes
- `[src/App.css](src/App.css)` — `.harmony-key-row`, `.in-key-badge` styles
- `package.json` — `tone` dependency added via npm

