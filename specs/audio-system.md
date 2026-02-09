# US-007: Audio System Specification

Defines sound effect triggers, music playback rules, channel limitations, and mute/pause behavior for the NES Legend of Zelda TypeScript rebuild.

---

## 1. NES Audio Architecture Overview

The NES APU (Audio Processing Unit) has **5 channels**:

| Channel | Type | Typical Use in Zelda |
|---------|------|---------------------|
| Pulse 1 | Square wave (12.5%, 25%, 50%, 75% duty) | Melody, lead instrument |
| Pulse 2 | Square wave (same duty options) | Harmony, secondary melody |
| Triangle | Triangle wave (fixed volume) | Bass lines, low tones |
| Noise | Pseudo-random noise | Percussion, explosions, sword SFX |
| DMC | Delta modulation (sample playback) | Not used in Zelda |

### Web Audio Approximation

The rebuild approximates the NES APU using the **Web Audio API**:

```typescript
interface AudioSystem {
  /** Web Audio context */
  context: AudioContext;

  /** Master gain node for global volume control */
  masterGain: GainNode;

  /** Music gain node (child of masterGain) */
  musicGain: GainNode;

  /** SFX gain node (child of masterGain) */
  sfxGain: GainNode;

  /** Current music track ID (null if silent) */
  currentMusic: string | null;

  /** Whether audio is globally muted */
  muted: boolean;

  /** Whether audio context has been resumed (requires user gesture) */
  resumed: boolean;
}
```

### Channel Mapping

| NES Channel | Web Audio Node | Configuration |
|-------------|---------------|---------------|
| Pulse 1 | `OscillatorNode` type `"square"` | Duty cycle simulated via custom `PeriodicWave` |
| Pulse 2 | `OscillatorNode` type `"square"` | Same as Pulse 1 |
| Triangle | `OscillatorNode` type `"triangle"` | Fixed volume (no envelope) |
| Noise | `AudioBufferSourceNode` with white noise buffer | Filtered to approximate NES LFSR noise |
| DMC | Not implemented | N/A |

```typescript
interface AudioChannel {
  /** Channel identifier */
  id: 'pulse1' | 'pulse2' | 'triangle' | 'noise';

  /** The active oscillator or buffer source (null if silent) */
  source: OscillatorNode | AudioBufferSourceNode | null;

  /** Gain node for per-channel volume */
  gain: GainNode;

  /** Whether this channel is currently claimed by a sound effect */
  sfxOverride: boolean;

  /** Frame counter for when SFX override expires */
  sfxOverrideFramesRemaining: number;
}
```

---

## 2. Sound Effect Triggers

Sound effects are short audio sequences that play in response to game events. Each SFX has a defined trigger condition, channel assignment, priority, and duration.

### SFX Priority System

When multiple SFX compete for the same channel:

1. **Higher priority SFX always interrupts lower priority.**
2. **Equal priority: new SFX replaces the current one** (last-write-wins).
3. **SFX always override music on their assigned channel** for their duration; music resumes on that channel after the SFX completes.

Priority scale: **0** (lowest) to **10** (highest).

### Sound Effect Catalog

```typescript
interface SoundEffect {
  /** Unique SFX identifier */
  id: string;

  /** Channel(s) this SFX uses */
  channels: ('pulse1' | 'pulse2' | 'triangle' | 'noise')[];

  /** Priority (0–10). Higher interrupts lower on same channel */
  priority: number;

  /** Duration in frames (at 60 FPS) */
  durationFrames: number;

  /** Tone/noise sequence data (per-frame frequency, volume, duty) */
  sequence: SfxFrame[];
}

interface SfxFrame {
  /** Frequency in Hz (ignored for noise channel) */
  frequency?: number;

  /** Volume (0.0–1.0) */
  volume: number;

  /** Duty cycle for pulse channels (0.125, 0.25, 0.5, 0.75) */
  duty?: number;

  /** For noise channel: short mode (metallic) vs long mode (hiss) */
  noiseMode?: 'short' | 'long';

  /** For noise channel: period index (0–15, lower = higher pitch) */
  noisePeriod?: number;
}
```

### Complete SFX Trigger Table

| SFX ID | Trigger Event | Channel(s) | Priority | Duration (frames) | Description |
|--------|--------------|------------|----------|-------------------|-------------|
| `sword_slash` | Link attacks with sword | noise | 6 | 8 | Sharp swoosh sound |
| `sword_beam` | Sword beam projectile fired (full HP) | pulse2 | 5 | 12 | Rising tone projectile |
| `sword_beam_hit` | Sword beam hits an enemy or wall | noise | 5 | 6 | Impact thud |
| `enemy_hit` | Enemy takes damage | pulse1 | 7 | 6 | Short buzz/crunch |
| `enemy_kill` | Enemy dies | pulse1, noise | 7 | 10 | Descending tone + noise burst |
| `link_hurt` | Link takes damage | pulse1, pulse2 | 9 | 12 | Distinctive damage buzz |
| `link_die` | Link's HP reaches 0 | pulse1, pulse2, triangle | 10 | 60 | Descending cascade, silences music |
| `low_health` | Link HP <= 2 half-hearts (continuous) | pulse2 | 4 | 30 | Repeating beep (loops while condition met) |
| `item_pickup_small` | Pick up rupee, heart, bomb, etc. | pulse2 | 6 | 8 | Quick ascending tone |
| `item_pickup_major` | Pick up key item (Triforce piece, dungeon item, heart container) | pulse1, pulse2, triangle | 10 | 120 | Fanfare jingle, pauses gameplay |
| `item_pickup_heart` | Pick up a recovery heart | pulse2 | 5 | 6 | Soft ascending blip |
| `rupee_tick` | Rupee counter incrementing (shop purchase) | pulse2 | 3 | 2 | Single tick per count step |
| `bomb_place` | Bomb placed on ground | noise | 4 | 4 | Short thud |
| `bomb_explode` | Bomb detonates | noise | 8 | 15 | Long noise burst with decay |
| `arrow_shoot` | Arrow or magic arrow fired | pulse2 | 5 | 6 | Whistling tone |
| `boomerang_throw` | Boomerang thrown | pulse2 | 4 | 4 | Spinning tone (loops while in flight) |
| `boomerang_catch` | Boomerang returns to Link | pulse2 | 4 | 3 | Quick catch sound |
| `shield_block` | Enemy projectile blocked by shield | noise | 5 | 4 | Metallic clink |
| `door_open` | Door/shutter opens in dungeon | noise | 6 | 10 | Rumbling slide |
| `door_unlock` | Locked door opened with key | noise, triangle | 6 | 12 | Click + rumble |
| `secret_reveal` | Secret discovered (bombable wall, pushed block) | pulse1, pulse2, triangle | 9 | 30 | The iconic "secret" jingle |
| `stairs_appear` | Staircase appears | pulse1 | 7 | 15 | Ascending staccato |
| `text_scroll` | Text character appearing in dialog | pulse2 | 2 | 1 | Single blip per character |
| `cursor_move` | Menu/inventory cursor moved | pulse2 | 3 | 2 | Quick blip |
| `pause_open` | Pause/inventory screen opened | pulse2 | 6 | 4 | Rising tone pair |
| `pause_close` | Pause/inventory screen closed | pulse2 | 6 | 4 | Falling tone pair |
| `recorder_play` | Recorder item used | pulse1, pulse2, triangle | 10 | 90 | Plays the recorder melody |
| `flute_warp` | Warp tornado appears after recorder | noise | 7 | 45 | Swirling noise |
| `candle_fire` | Candle/magic rod fire shot | noise | 5 | 8 | Crackling burst |
| `water_splash` | Entity enters/exits water | noise | 3 | 6 | Short splash |
| `boss_roar` | Boss encounter begins | noise, triangle | 8 | 20 | Low rumble + noise |
| `triforce_complete` | Triforce piece collected (full fanfare) | pulse1, pulse2, triangle | 10 | 180 | Extended fanfare, gameplay paused |
| `game_over` | Game over sequence | pulse1, pulse2, triangle | 10 | 90 | Descending funeral march |

### Looping SFX

Some sound effects loop continuously while a condition is met:

| SFX ID | Loop Condition | Reset Behavior |
|--------|---------------|----------------|
| `low_health` | Link HP <= 2 half-hearts AND game phase is `GAMEPLAY` | Stops immediately when HP > 2 or phase changes |
| `boomerang_throw` | Boomerang entity is in flight | Stops when boomerang returns or despawns |

Looping SFX restart from frame 0 each loop iteration.

---

## 3. Music Playback Rules

### Music Track Catalog

```typescript
interface MusicTrack {
  /** Unique track identifier */
  id: string;

  /** Channels used by this track */
  channels: ('pulse1' | 'pulse2' | 'triangle' | 'noise')[];

  /** Whether the track loops */
  loops: boolean;

  /** Tempo in BPM */
  bpm: number;

  /** Sequence data: per-channel note sequences */
  channelSequences: Map<string, MusicNote[]>;
}

interface MusicNote {
  /** MIDI note number (0–127) or null for rest */
  note: number | null;

  /** Duration in ticks (1 tick = 1 frame at 60 FPS) */
  durationTicks: number;

  /** Volume (0.0–1.0) */
  volume: number;

  /** Duty cycle for pulse channels */
  duty?: number;
}
```

### Track Assignment Table

| Track ID | Context | Loops | Channels Used | Notes |
|----------|---------|-------|---------------|-------|
| `title_theme` | Title screen | Yes | pulse1, pulse2, triangle | Plays while on title/file select |
| `overworld` | Overworld gameplay | Yes | pulse1, pulse2, triangle, noise | Continuous across screen transitions |
| `dungeon` | Dungeon gameplay (dungeons 1–8) | Yes | pulse1, pulse2, triangle | Restarts on dungeon entry |
| `dungeon9` | Dungeon 9 (Ganon's dungeon) | Yes | pulse1, pulse2, triangle | Distinct theme for final dungeon |
| `item_room` | Dungeon item acquisition room | No | pulse1, pulse2, triangle | Plays once, then silence until room exit |
| `triforce_fanfare` | Triforce piece obtained | No | pulse1, pulse2, triangle | Replaces dungeon music; silence after |
| `ganon_battle` | Ganon boss fight | Yes | pulse1, pulse2, triangle, noise | Starts when Ganon room entered |
| `death` | Link death sequence | No | pulse1, pulse2, triangle | Plays once during death animation |
| `ending` | Game ending/credits | No | pulse1, pulse2, triangle, noise | Plays during ending sequence |
| `recorder_melody` | Recorder item effect | No | pulse1, pulse2 | Short melody, then warp begins |

### Music Transition Rules

Music transitions follow strict rules to match NES behavior:

```typescript
type MusicTransition =
  | { type: 'IMMEDIATE'; }     // Cut to new track instantly
  | { type: 'FADE_OUT'; durationFrames: number; } // Fade current, then start new
  | { type: 'SILENCE'; }       // Stop current, play nothing
```

| Transition | From | To | Method |
|-----------|------|-----|--------|
| Enter overworld | Any | `overworld` | IMMEDIATE |
| Enter dungeon | Any | `dungeon` | IMMEDIATE |
| Enter dungeon 9 | Any | `dungeon9` | IMMEDIATE |
| Enter item room | `dungeon` | `item_room` | IMMEDIATE |
| Exit item room | `item_room` | `dungeon` | IMMEDIATE (resumes from start) |
| Get Triforce piece | `dungeon` | `triforce_fanfare` | IMMEDIATE |
| After Triforce fanfare | `triforce_fanfare` | SILENCE | Wait for fanfare end |
| Enter Ganon room | `dungeon9` | `ganon_battle` | IMMEDIATE |
| Link dies | Any | `death` | IMMEDIATE (stops all SFX) |
| Game over screen | `death` | SILENCE | After death track ends |
| Title screen | Any | `title_theme` | IMMEDIATE |
| Recorder used | Any | `recorder_melody` | IMMEDIATE |
| After recorder | `recorder_melody` | Previous track | IMMEDIATE (restore pre-recorder track) |
| Ending sequence | Any | `ending` | IMMEDIATE |

### Music Persistence Across Screens

- **Overworld**: `overworld` theme plays continuously across screen transitions. It does **not** restart when moving between screens.
- **Dungeons**: `dungeon` theme restarts from the beginning when entering a dungeon. It plays continuously within the dungeon across rooms.
- **Caves/Shops**: Music **stops** (silence) inside caves and shops. Overworld music resumes on exit.

### SFX-Music Channel Sharing

When an SFX plays on a channel that music is also using:

1. The music note on that channel is **silenced** for the SFX duration.
2. When the SFX finishes, the music **resumes on that channel** at its current position (not rewound).
3. The music playback position counter **continues advancing** during the SFX override — only the audio output on that channel is replaced.

This matches NES behavior where SFX share APU channels with music.

---

## 4. Channel Limitations

### NES-Accurate Channel Constraints

- **Maximum 4 melodic channels** active simultaneously (2 pulse + 1 triangle + 1 noise).
- DMC channel is unused.
- Each channel can produce **exactly one tone at a time**. No polyphony within a single channel.
- When an SFX claims a channel, that channel is unavailable for music until the SFX completes.

### Channel Allocation Priority

Channel allocation follows a fixed priority order:

1. **SFX** (always wins over music on same channel)
2. **Music** (fills remaining channels)
3. **Looping SFX** (lowest SFX priority, yields to higher-priority SFX)

### Simultaneous SFX Limit

- Multiple SFX **can** play simultaneously if they use **different channels**.
- If two SFX compete for the same channel, the higher-priority SFX wins.
- Example: `enemy_hit` (pulse1, priority 7) and `sword_slash` (noise, priority 6) can coexist because they use different channels.
- Example: `enemy_hit` (pulse1, priority 7) interrupts `low_health` (pulse2, priority 4) only if both claim pulse2 — they don't, so they coexist.

### Volume Envelope Approximation

NES pulse and noise channels support volume envelopes (linear decay). The rebuild approximates this:

```typescript
interface VolumeEnvelope {
  /** Starting volume (0.0–1.0) */
  startVolume: number;

  /** Ending volume (0.0–1.0) */
  endVolume: number;

  /** Decay duration in frames */
  decayFrames: number;

  /** Whether the envelope loops */
  loop: boolean;
}
```

- Triangle channel has **no volume control** on NES — it's either on or off. The rebuild mirrors this: triangle channel volume is always 1.0 or 0.0.
- Pulse channels use configurable volume envelopes per-note.
- Noise channel uses configurable volume envelopes per-note.

---

## 5. Mute and Pause Behavior

### Mute Controls

```typescript
interface MuteState {
  /** Global mute (all audio) */
  globalMute: boolean;

  /** Music mute (music only, SFX still play) */
  musicMute: boolean;

  /** SFX mute (SFX only, music still plays) */
  sfxMute: boolean;
}
```

- **Global mute** sets `masterGain.gain.value = 0`. All audio output stops, but playback positions continue advancing internally.
- **Music mute** sets `musicGain.gain.value = 0`. Music position keeps advancing (so unmuting doesn't restart from the beginning).
- **SFX mute** sets `sfxGain.gain.value = 0`. SFX still "play" internally (durations tick down) but produce no audio.
- Mute state is **not persisted** in save data — it resets to unmuted on page load.

### Mute Toggle Key

- Mute is toggled via a dedicated key (default: `KeyM`).
- Pressing the mute key cycles: **Unmuted → Global Mute → Unmuted**.
- Separate music/SFX mute is accessible only from an options/settings menu (not a single keypress).

### Pause Screen Behavior

When the game is paused (inventory/pause screen):

1. **Music pauses** — all oscillators stop, playback position is frozen.
2. **SFX do not play** — game events don't fire during pause, so no SFX trigger.
3. **Menu SFX still play** — `cursor_move`, `pause_open`, `pause_close` are UI sounds that play regardless of pause state.
4. On unpause, music **resumes from the exact position** where it was paused.

```typescript
function pauseAudio(audioSystem: AudioSystem): void {
  // Suspend the AudioContext (stops all processing)
  audioSystem.context.suspend();
}

function resumeAudio(audioSystem: AudioSystem): void {
  // Resume the AudioContext (continues from where it left off)
  audioSystem.context.resume();
}
```

### Screen Transition Behavior

During screen transitions (overworld scrolling, dungeon fades):

- **Music continues playing** uninterrupted.
- **SFX from the previous screen** may still be audible during the transition (they are not forcibly cut).
- **No new gameplay SFX** fire during the transition since game logic is paused.

### Focus/Blur Behavior

When the browser tab/window loses focus:

1. **Pause the game** (as per input spec: auto-pause on blur).
2. **Suspend the AudioContext** to stop all audio output.
3. On regaining focus, **resume AudioContext** along with unpausing the game.

This prevents audio playing in background tabs and is consistent with the input system's blur handling.

---

## 6. Web Audio API Bootstrap

The Web Audio API requires a **user gesture** before the `AudioContext` can produce sound (browser autoplay policy).

### Initialization Sequence

```typescript
interface AudioBootstrap {
  /** Create AudioContext in suspended state on page load */
  createOnLoad: true;

  /** Resume AudioContext on first user interaction (click/keydown) */
  resumeEvent: 'keydown' | 'click' | 'touchstart';

  /** One-time event listener — remove after first resume */
  oneShot: true;
}
```

1. On page load, create `AudioContext` (it starts suspended in most browsers).
2. Register a one-shot event listener on `keydown`, `click`, and `touchstart`.
3. On first user interaction, call `audioContext.resume()`.
4. Set `audioSystem.resumed = true`.
5. Remove the event listeners.
6. Music and SFX playback can now begin.

### Graceful Degradation

If `AudioContext` is not available (older browser):

- All audio calls become no-ops.
- Game plays silently with no errors.
- `audioSystem.resumed` remains `false`.

---

## 7. Audio Data Format

All music and SFX data is defined as JSON-serializable objects for the data-driven architecture.

### SFX Data Schema

```typescript
interface SfxData {
  /** SFX identifier */
  id: string;

  /** Channel assignments */
  channels: ('pulse1' | 'pulse2' | 'triangle' | 'noise')[];

  /** Priority (0–10) */
  priority: number;

  /** Whether this SFX loops */
  loops: boolean;

  /** Per-channel frame sequences */
  channelFrames: Record<string, SfxFrame[]>;
}
```

### Music Data Schema

```typescript
interface MusicData {
  /** Track identifier */
  id: string;

  /** Tempo in BPM */
  bpm: number;

  /** Ticks per beat (subdivision granularity) */
  ticksPerBeat: number;

  /** Whether the track loops */
  loops: boolean;

  /** Loop point in ticks (0 = loop from start) */
  loopStartTick: number;

  /** Per-channel note sequences */
  channels: Record<string, MusicNote[]>;
}
```

### Tone Generation Parameters

For the Web Audio synthesis:

```typescript
/** Duty cycle waveforms for pulse channels */
type PulseDuty = 0.125 | 0.25 | 0.5 | 0.75;

/**
 * Create a PeriodicWave matching NES pulse duty cycles.
 * The NES square wave is not a perfect square — it has harmonic
 * content determined by the duty cycle setting.
 */
function createPulseWave(
  context: AudioContext,
  duty: PulseDuty
): PeriodicWave;

/**
 * Create a noise buffer approximating the NES LFSR noise generator.
 * Short mode (93-byte loop) produces metallic/tonal noise.
 * Long mode (32767-sample loop) produces white noise hiss.
 */
function createNoiseBuffer(
  context: AudioContext,
  mode: 'short' | 'long',
  sampleRate: number
): AudioBuffer;
```

---

## 8. Runtime Audio Manager API

The audio system exposes a minimal API consumed by other game systems:

```typescript
interface AudioManager {
  /** Initialize the audio system (call once on game boot) */
  init(): void;

  /** Play a sound effect by ID */
  playSfx(sfxId: string): void;

  /** Stop a looping SFX by ID */
  stopSfx(sfxId: string): void;

  /** Start playing a music track (handles transitions) */
  playMusic(trackId: string): void;

  /** Stop current music */
  stopMusic(): void;

  /** Pause all audio (for game pause) */
  pause(): void;

  /** Resume all audio (for game unpause) */
  resume(): void;

  /** Toggle global mute */
  toggleMute(): void;

  /** Set master volume (0.0–1.0) */
  setVolume(volume: number): void;

  /** Called once per frame to advance SFX timers, check loop conditions */
  update(): void;
}
```

### Frame Update Loop Integration

The audio `update()` method is called once per frame as part of the main game loop:

```
1. Poll input
2. Update game logic
3. Render frame
4. **Update audio** (process SFX timers, check loop conditions, advance music position)
```

The audio update processes:
- Decrement `sfxOverrideFramesRemaining` on each channel.
- When an SFX override expires, restore music output on that channel.
- Check loop conditions for looping SFX (e.g., is Link still at low health?).
- Start/stop looping SFX as conditions change.
- Advance the music playback position by 1 tick.
