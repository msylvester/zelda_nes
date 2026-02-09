// AudioManager.ts - Main audio system manager
// Handles SFX playback, music control, and channel management

import { TARGET_FPS } from '../constants';
import { AudioContextManager, getAudioContextManager } from './AudioContext';
import { ToneGenerator, PulseDuty, NoiseMode } from './ToneGenerator';

/**
 * Sound effect frame data for per-frame tone control.
 */
export interface SfxFrame {
  /** Frequency in Hz (ignored for noise channel) */
  frequency?: number;
  /** Volume (0.0-1.0) */
  volume: number;
  /** Duty cycle for pulse channels */
  duty?: PulseDuty;
  /** Noise mode for noise channel */
  noiseMode?: NoiseMode;
  /** Noise period index (0-15) */
  noisePeriod?: number;
}

/**
 * Sound effect definition.
 */
export interface SoundEffect {
  /** Unique identifier */
  id: string;
  /** Channels this SFX uses */
  channels: ('pulse1' | 'pulse2' | 'triangle' | 'noise')[];
  /** Priority (0-10, higher wins on same channel) */
  priority: number;
  /** Whether this SFX loops */
  loops: boolean;
  /** Per-channel frame sequences */
  channelFrames: Record<string, SfxFrame[]>;
}

/**
 * Active SFX instance tracking.
 */
interface ActiveSfx {
  /** SFX definition */
  sfx: SoundEffect;
  /** Current frame index */
  frameIndex: number;
  /** Active audio nodes per channel */
  nodes: Map<string, OscillatorNode | AudioBufferSourceNode>;
}

/**
 * Pre-defined sound effects for the game.
 * Based on NES Zelda sound design.
 */
export const SOUND_EFFECTS: Record<string, SoundEffect> = {
  // Sword swing - sharp swoosh on noise channel
  sword_slash: {
    id: 'sword_slash',
    channels: ['noise'],
    priority: 6,
    loops: false,
    channelFrames: {
      noise: [
        { volume: 0.5, noiseMode: 'short', noisePeriod: 4 },
        { volume: 0.45, noiseMode: 'short', noisePeriod: 5 },
        { volume: 0.4, noiseMode: 'short', noisePeriod: 6 },
        { volume: 0.35, noiseMode: 'short', noisePeriod: 7 },
        { volume: 0.25, noiseMode: 'short', noisePeriod: 8 },
        { volume: 0.15, noiseMode: 'short', noisePeriod: 9 },
        { volume: 0.08, noiseMode: 'short', noisePeriod: 10 },
        { volume: 0.0, noiseMode: 'short', noisePeriod: 11 },
      ],
    },
  },

  // Enemy hit - short buzz/crunch on pulse1
  enemy_hit: {
    id: 'enemy_hit',
    channels: ['pulse1'],
    priority: 7,
    loops: false,
    channelFrames: {
      pulse1: [
        { frequency: 200, volume: 0.5, duty: 0.25 },
        { frequency: 180, volume: 0.45, duty: 0.25 },
        { frequency: 160, volume: 0.35, duty: 0.25 },
        { frequency: 140, volume: 0.25, duty: 0.25 },
        { frequency: 120, volume: 0.15, duty: 0.25 },
        { frequency: 100, volume: 0.05, duty: 0.25 },
      ],
    },
  },

  // Enemy kill - descending tone + noise burst
  enemy_kill: {
    id: 'enemy_kill',
    channels: ['pulse1', 'noise'],
    priority: 7,
    loops: false,
    channelFrames: {
      pulse1: [
        { frequency: 400, volume: 0.5, duty: 0.5 },
        { frequency: 380, volume: 0.48, duty: 0.5 },
        { frequency: 350, volume: 0.45, duty: 0.5 },
        { frequency: 320, volume: 0.4, duty: 0.5 },
        { frequency: 280, volume: 0.35, duty: 0.5 },
        { frequency: 240, volume: 0.3, duty: 0.5 },
        { frequency: 200, volume: 0.25, duty: 0.5 },
        { frequency: 160, volume: 0.15, duty: 0.5 },
        { frequency: 120, volume: 0.08, duty: 0.5 },
        { frequency: 80, volume: 0.0, duty: 0.5 },
      ],
      noise: [
        { volume: 0.4, noiseMode: 'long', noisePeriod: 6 },
        { volume: 0.35, noiseMode: 'long', noisePeriod: 7 },
        { volume: 0.3, noiseMode: 'long', noisePeriod: 8 },
        { volume: 0.25, noiseMode: 'long', noisePeriod: 9 },
        { volume: 0.2, noiseMode: 'long', noisePeriod: 10 },
        { volume: 0.15, noiseMode: 'long', noisePeriod: 11 },
        { volume: 0.1, noiseMode: 'long', noisePeriod: 12 },
        { volume: 0.05, noiseMode: 'long', noisePeriod: 13 },
        { volume: 0.02, noiseMode: 'long', noisePeriod: 14 },
        { volume: 0.0, noiseMode: 'long', noisePeriod: 15 },
      ],
    },
  },

  // Link hurt - distinctive damage buzz
  link_hurt: {
    id: 'link_hurt',
    channels: ['pulse1', 'pulse2'],
    priority: 9,
    loops: false,
    channelFrames: {
      pulse1: [
        { frequency: 220, volume: 0.5, duty: 0.25 },
        { frequency: 200, volume: 0.5, duty: 0.25 },
        { frequency: 220, volume: 0.45, duty: 0.25 },
        { frequency: 200, volume: 0.45, duty: 0.25 },
        { frequency: 180, volume: 0.4, duty: 0.25 },
        { frequency: 160, volume: 0.35, duty: 0.25 },
        { frequency: 140, volume: 0.3, duty: 0.25 },
        { frequency: 120, volume: 0.25, duty: 0.25 },
        { frequency: 100, volume: 0.15, duty: 0.25 },
        { frequency: 80, volume: 0.08, duty: 0.25 },
        { frequency: 60, volume: 0.04, duty: 0.25 },
        { frequency: 40, volume: 0.0, duty: 0.25 },
      ],
      pulse2: [
        { frequency: 180, volume: 0.4, duty: 0.5 },
        { frequency: 160, volume: 0.4, duty: 0.5 },
        { frequency: 180, volume: 0.35, duty: 0.5 },
        { frequency: 160, volume: 0.35, duty: 0.5 },
        { frequency: 140, volume: 0.3, duty: 0.5 },
        { frequency: 120, volume: 0.25, duty: 0.5 },
        { frequency: 100, volume: 0.2, duty: 0.5 },
        { frequency: 80, volume: 0.15, duty: 0.5 },
        { frequency: 60, volume: 0.1, duty: 0.5 },
        { frequency: 50, volume: 0.05, duty: 0.5 },
        { frequency: 40, volume: 0.02, duty: 0.5 },
        { frequency: 30, volume: 0.0, duty: 0.5 },
      ],
    },
  },

  // Item pickup (small) - quick ascending tone
  item_pickup_small: {
    id: 'item_pickup_small',
    channels: ['pulse2'],
    priority: 6,
    loops: false,
    channelFrames: {
      pulse2: [
        { frequency: 440, volume: 0.4, duty: 0.5 },
        { frequency: 523, volume: 0.4, duty: 0.5 },
        { frequency: 659, volume: 0.35, duty: 0.5 },
        { frequency: 784, volume: 0.3, duty: 0.5 },
        { frequency: 880, volume: 0.25, duty: 0.5 },
        { frequency: 988, volume: 0.18, duty: 0.5 },
        { frequency: 1047, volume: 0.1, duty: 0.5 },
        { frequency: 1175, volume: 0.0, duty: 0.5 },
      ],
    },
  },

  // Heart pickup - softer ascending blip
  item_pickup_heart: {
    id: 'item_pickup_heart',
    channels: ['pulse2'],
    priority: 5,
    loops: false,
    channelFrames: {
      pulse2: [
        { frequency: 523, volume: 0.3, duty: 0.5 },
        { frequency: 659, volume: 0.3, duty: 0.5 },
        { frequency: 784, volume: 0.25, duty: 0.5 },
        { frequency: 880, volume: 0.2, duty: 0.5 },
        { frequency: 988, volume: 0.1, duty: 0.5 },
        { frequency: 1047, volume: 0.0, duty: 0.5 },
      ],
    },
  },

  // Bomb explosion - long noise burst with decay
  bomb_explode: {
    id: 'bomb_explode',
    channels: ['noise'],
    priority: 8,
    loops: false,
    channelFrames: {
      noise: [
        { volume: 0.7, noiseMode: 'long', noisePeriod: 2 },
        { volume: 0.7, noiseMode: 'long', noisePeriod: 2 },
        { volume: 0.65, noiseMode: 'long', noisePeriod: 3 },
        { volume: 0.6, noiseMode: 'long', noisePeriod: 3 },
        { volume: 0.55, noiseMode: 'long', noisePeriod: 4 },
        { volume: 0.5, noiseMode: 'long', noisePeriod: 5 },
        { volume: 0.45, noiseMode: 'long', noisePeriod: 6 },
        { volume: 0.4, noiseMode: 'long', noisePeriod: 7 },
        { volume: 0.35, noiseMode: 'long', noisePeriod: 8 },
        { volume: 0.28, noiseMode: 'long', noisePeriod: 9 },
        { volume: 0.2, noiseMode: 'long', noisePeriod: 10 },
        { volume: 0.15, noiseMode: 'long', noisePeriod: 11 },
        { volume: 0.1, noiseMode: 'long', noisePeriod: 12 },
        { volume: 0.05, noiseMode: 'long', noisePeriod: 13 },
        { volume: 0.0, noiseMode: 'long', noisePeriod: 14 },
      ],
    },
  },

  // Low health beep - repeating warning
  low_health: {
    id: 'low_health',
    channels: ['pulse2'],
    priority: 4,
    loops: true,
    channelFrames: {
      pulse2: [
        { frequency: 880, volume: 0.3, duty: 0.25 },
        { frequency: 880, volume: 0.3, duty: 0.25 },
        { frequency: 880, volume: 0.25, duty: 0.25 },
        { frequency: 880, volume: 0.2, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        // More silence frames to create a gap
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
        { frequency: 0, volume: 0, duty: 0.25 },
      ],
    },
  },

  // Secret reveal - the iconic jingle
  secret_reveal: {
    id: 'secret_reveal',
    channels: ['pulse1', 'pulse2', 'triangle'],
    priority: 9,
    loops: false,
    channelFrames: {
      pulse1: [
        { frequency: 523, volume: 0.4, duty: 0.5 },
        { frequency: 523, volume: 0.4, duty: 0.5 },
        { frequency: 523, volume: 0.4, duty: 0.5 },
        { frequency: 523, volume: 0.4, duty: 0.5 },
        { frequency: 587, volume: 0.4, duty: 0.5 },
        { frequency: 587, volume: 0.4, duty: 0.5 },
        { frequency: 587, volume: 0.4, duty: 0.5 },
        { frequency: 587, volume: 0.4, duty: 0.5 },
        { frequency: 659, volume: 0.4, duty: 0.5 },
        { frequency: 659, volume: 0.4, duty: 0.5 },
        { frequency: 659, volume: 0.4, duty: 0.5 },
        { frequency: 659, volume: 0.4, duty: 0.5 },
        { frequency: 698, volume: 0.4, duty: 0.5 },
        { frequency: 698, volume: 0.4, duty: 0.5 },
        { frequency: 698, volume: 0.4, duty: 0.5 },
        { frequency: 698, volume: 0.4, duty: 0.5 },
        { frequency: 784, volume: 0.4, duty: 0.5 },
        { frequency: 784, volume: 0.4, duty: 0.5 },
        { frequency: 784, volume: 0.4, duty: 0.5 },
        { frequency: 784, volume: 0.4, duty: 0.5 },
        { frequency: 880, volume: 0.35, duty: 0.5 },
        { frequency: 880, volume: 0.35, duty: 0.5 },
        { frequency: 880, volume: 0.35, duty: 0.5 },
        { frequency: 880, volume: 0.35, duty: 0.5 },
        { frequency: 988, volume: 0.3, duty: 0.5 },
        { frequency: 988, volume: 0.3, duty: 0.5 },
        { frequency: 988, volume: 0.25, duty: 0.5 },
        { frequency: 988, volume: 0.2, duty: 0.5 },
        { frequency: 1047, volume: 0.15, duty: 0.5 },
        { frequency: 1047, volume: 0.1, duty: 0.5 },
      ],
      pulse2: [
        { frequency: 262, volume: 0.3, duty: 0.25 },
        { frequency: 262, volume: 0.3, duty: 0.25 },
        { frequency: 262, volume: 0.3, duty: 0.25 },
        { frequency: 262, volume: 0.3, duty: 0.25 },
        { frequency: 294, volume: 0.3, duty: 0.25 },
        { frequency: 294, volume: 0.3, duty: 0.25 },
        { frequency: 294, volume: 0.3, duty: 0.25 },
        { frequency: 294, volume: 0.3, duty: 0.25 },
        { frequency: 330, volume: 0.3, duty: 0.25 },
        { frequency: 330, volume: 0.3, duty: 0.25 },
        { frequency: 330, volume: 0.3, duty: 0.25 },
        { frequency: 330, volume: 0.3, duty: 0.25 },
        { frequency: 349, volume: 0.3, duty: 0.25 },
        { frequency: 349, volume: 0.3, duty: 0.25 },
        { frequency: 349, volume: 0.3, duty: 0.25 },
        { frequency: 349, volume: 0.3, duty: 0.25 },
        { frequency: 392, volume: 0.3, duty: 0.25 },
        { frequency: 392, volume: 0.3, duty: 0.25 },
        { frequency: 392, volume: 0.3, duty: 0.25 },
        { frequency: 392, volume: 0.3, duty: 0.25 },
        { frequency: 440, volume: 0.25, duty: 0.25 },
        { frequency: 440, volume: 0.25, duty: 0.25 },
        { frequency: 440, volume: 0.25, duty: 0.25 },
        { frequency: 440, volume: 0.25, duty: 0.25 },
        { frequency: 494, volume: 0.2, duty: 0.25 },
        { frequency: 494, volume: 0.2, duty: 0.25 },
        { frequency: 494, volume: 0.15, duty: 0.25 },
        { frequency: 494, volume: 0.1, duty: 0.25 },
        { frequency: 523, volume: 0.08, duty: 0.25 },
        { frequency: 523, volume: 0.05, duty: 0.25 },
      ],
      triangle: [
        { frequency: 131, volume: 0.3 },
        { frequency: 131, volume: 0.3 },
        { frequency: 131, volume: 0.3 },
        { frequency: 131, volume: 0.3 },
        { frequency: 147, volume: 0.3 },
        { frequency: 147, volume: 0.3 },
        { frequency: 147, volume: 0.3 },
        { frequency: 147, volume: 0.3 },
        { frequency: 165, volume: 0.3 },
        { frequency: 165, volume: 0.3 },
        { frequency: 165, volume: 0.3 },
        { frequency: 165, volume: 0.3 },
        { frequency: 175, volume: 0.3 },
        { frequency: 175, volume: 0.3 },
        { frequency: 175, volume: 0.3 },
        { frequency: 175, volume: 0.3 },
        { frequency: 196, volume: 0.3 },
        { frequency: 196, volume: 0.3 },
        { frequency: 196, volume: 0.3 },
        { frequency: 196, volume: 0.3 },
        { frequency: 220, volume: 0.25 },
        { frequency: 220, volume: 0.25 },
        { frequency: 220, volume: 0.25 },
        { frequency: 220, volume: 0.25 },
        { frequency: 247, volume: 0.2 },
        { frequency: 247, volume: 0.2 },
        { frequency: 247, volume: 0.15 },
        { frequency: 247, volume: 0.1 },
        { frequency: 262, volume: 0.08 },
        { frequency: 262, volume: 0.05 },
      ],
    },
  },

  // Cursor move - quick menu blip
  cursor_move: {
    id: 'cursor_move',
    channels: ['pulse2'],
    priority: 3,
    loops: false,
    channelFrames: {
      pulse2: [
        { frequency: 1200, volume: 0.2, duty: 0.25 },
        { frequency: 1000, volume: 0.1, duty: 0.25 },
      ],
    },
  },
};

/**
 * AudioManager handles all game audio: SFX and music.
 */
export class AudioManager {
  private contextManager: AudioContextManager;
  private toneGenerator: ToneGenerator | null = null;
  private activeSfx: Map<string, ActiveSfx> = new Map();
  private currentMusic: string | null = null;
  private frameAccumulator = 0;

  constructor(contextManager?: AudioContextManager) {
    this.contextManager = contextManager ?? getAudioContextManager();
  }

  /**
   * Initialize the audio manager.
   * Call this on game boot.
   */
  init(): void {
    this.contextManager.init();

    const context = this.contextManager.getContext();
    const sfxGain = this.contextManager.getSfxGain();

    if (context && sfxGain) {
      this.toneGenerator = new ToneGenerator(context, sfxGain);
    }
  }

  /**
   * Play a sound effect by ID.
   */
  playSfx(sfxId: string): void {
    const sfx = SOUND_EFFECTS[sfxId];
    if (!sfx) {
      console.warn(`Unknown SFX: ${sfxId}`);
      return;
    }

    // Check if audio system is ready
    if (!this.contextManager.isReady() || !this.toneGenerator) {
      return;
    }

    // Check if SFX is muted
    if (this.contextManager.isSfxMuted()) {
      return;
    }

    // Check if same SFX is already playing
    const existing = this.activeSfx.get(sfxId);
    if (existing && !sfx.loops) {
      // For non-looping SFX, restart from beginning
      this.stopSfxInstance(sfxId);
    }

    // Check channel priority conflicts
    for (const channel of sfx.channels) {
      const conflictingSfx = this.findSfxOnChannel(channel);
      if (conflictingSfx && conflictingSfx.sfx.priority > sfx.priority) {
        // Higher priority SFX already on this channel, don't play
        return;
      } else if (conflictingSfx && conflictingSfx.sfx.priority <= sfx.priority) {
        // Stop the lower/equal priority SFX on this channel
        this.stopSfxInstance(conflictingSfx.sfx.id);
      }
    }

    // Start the SFX
    const activeSfx: ActiveSfx = {
      sfx,
      frameIndex: 0,
      nodes: new Map(),
    };

    this.activeSfx.set(sfxId, activeSfx);
    this.playSfxFrame(activeSfx);
  }

  /**
   * Stop a looping SFX by ID.
   */
  stopSfx(sfxId: string): void {
    this.stopSfxInstance(sfxId);
  }

  /**
   * Start playing a music track.
   * Note: Full music implementation is beyond the scope of this basic audio system.
   * This provides a stub for the API.
   */
  playMusic(trackId: string): void {
    if (this.currentMusic === trackId) {
      return;
    }

    this.stopMusic();
    this.currentMusic = trackId;

    // TODO: Implement full music playback with note sequences
    // For now, this just tracks the current music ID
    console.log(`Music started: ${trackId}`);
  }

  /**
   * Stop current music.
   */
  stopMusic(): void {
    if (this.currentMusic) {
      console.log(`Music stopped: ${this.currentMusic}`);
      this.currentMusic = null;
    }
  }

  /**
   * Get the current music track ID.
   */
  getCurrentMusic(): string | null {
    return this.currentMusic;
  }

  /**
   * Pause all audio (for game pause).
   */
  pause(): void {
    this.contextManager.suspend();
  }

  /**
   * Resume all audio (for game unpause).
   */
  resume(): void {
    this.contextManager.resume();
  }

  /**
   * Toggle global mute.
   */
  toggleMute(): boolean {
    return this.contextManager.toggleMute();
  }

  /**
   * Check if audio is muted.
   */
  isMuted(): boolean {
    return this.contextManager.isMuted();
  }

  /**
   * Set master volume (0.0-1.0).
   */
  setVolume(volume: number): void {
    this.contextManager.setVolume(volume);
  }

  /**
   * Get current volume.
   */
  getVolume(): number {
    return this.contextManager.getVolume();
  }

  /**
   * Called once per frame to advance SFX timers.
   */
  update(): void {
    if (!this.contextManager.isReady()) {
      return;
    }

    // Advance frame for all active SFX
    const toRemove: string[] = [];

    for (const [sfxId, activeSfx] of this.activeSfx) {
      activeSfx.frameIndex++;

      // Check if SFX has completed
      const maxFrames = this.getMaxFrames(activeSfx.sfx);
      if (activeSfx.frameIndex >= maxFrames) {
        if (activeSfx.sfx.loops) {
          // Reset to beginning for looping SFX
          activeSfx.frameIndex = 0;
          this.playSfxFrame(activeSfx);
        } else {
          // Mark for removal
          toRemove.push(sfxId);
        }
      } else {
        // Play the next frame
        this.playSfxFrame(activeSfx);
      }
    }

    // Remove completed SFX
    for (const sfxId of toRemove) {
      this.stopSfxInstance(sfxId);
    }
  }

  /**
   * Check if a specific SFX is currently playing.
   */
  isSfxPlaying(sfxId: string): boolean {
    return this.activeSfx.has(sfxId);
  }

  /**
   * Get all currently playing SFX IDs.
   */
  getActiveSfxIds(): string[] {
    return Array.from(this.activeSfx.keys());
  }

  /**
   * Check if the audio system is ready.
   */
  isReady(): boolean {
    return this.contextManager.isReady();
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    // Stop all active SFX
    for (const sfxId of this.activeSfx.keys()) {
      this.stopSfxInstance(sfxId);
    }
    this.activeSfx.clear();
    this.currentMusic = null;
    this.toneGenerator = null;
  }

  /**
   * Play a single frame of an SFX.
   */
  private playSfxFrame(activeSfx: ActiveSfx): void {
    if (!this.toneGenerator) {
      return;
    }

    const context = this.contextManager.getContext();
    if (!context) {
      return;
    }

    const frameTime = 1 / TARGET_FPS;

    for (const channel of activeSfx.sfx.channels) {
      const frames = activeSfx.sfx.channelFrames[channel];
      if (!frames || activeSfx.frameIndex >= frames.length) {
        continue;
      }

      const frame = frames[activeSfx.frameIndex];
      if (!frame || frame.volume <= 0) {
        continue;
      }

      // Play the appropriate tone type for this channel
      if (channel === 'noise') {
        this.toneGenerator.playNoise({
          duration: frameTime,
          volume: frame.volume,
          mode: frame.noiseMode ?? 'long',
          periodIndex: frame.noisePeriod,
        });
      } else if (channel === 'triangle') {
        if (frame.frequency && frame.frequency > 0) {
          this.toneGenerator.playTriangle({
            frequency: frame.frequency,
            duration: frameTime,
            volume: frame.volume,
          });
        }
      } else {
        // pulse1 or pulse2
        if (frame.frequency && frame.frequency > 0) {
          this.toneGenerator.playPulse({
            frequency: frame.frequency,
            duration: frameTime,
            volume: frame.volume,
            duty: frame.duty,
          });
        }
      }
    }
  }

  /**
   * Stop a specific SFX instance.
   */
  private stopSfxInstance(sfxId: string): void {
    const activeSfx = this.activeSfx.get(sfxId);
    if (!activeSfx) {
      return;
    }

    // Stop all active nodes
    for (const node of activeSfx.nodes.values()) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Node may already be stopped
      }
    }

    this.activeSfx.delete(sfxId);
  }

  /**
   * Find an SFX that's currently using a specific channel.
   */
  private findSfxOnChannel(channel: string): ActiveSfx | null {
    for (const activeSfx of this.activeSfx.values()) {
      if (activeSfx.sfx.channels.includes(channel as 'pulse1' | 'pulse2' | 'triangle' | 'noise')) {
        return activeSfx;
      }
    }
    return null;
  }

  /**
   * Get the maximum frame count for an SFX.
   */
  private getMaxFrames(sfx: SoundEffect): number {
    let maxFrames = 0;
    for (const channel of sfx.channels) {
      const frames = sfx.channelFrames[channel];
      if (frames) {
        maxFrames = Math.max(maxFrames, frames.length);
      }
    }
    return maxFrames;
  }
}

// Singleton instance
let audioManager: AudioManager | null = null;

/**
 * Get the singleton AudioManager instance.
 */
export function getAudioManager(): AudioManager {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
}

/**
 * Reset the singleton instance (for testing).
 */
export function resetAudioManager(): void {
  if (audioManager) {
    audioManager.dispose();
  }
  audioManager = null;
}
