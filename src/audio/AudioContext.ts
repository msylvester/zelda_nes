// AudioContext.ts - Web Audio API bootstrap and context management
// Handles browser autoplay policy by resuming audio context on first user interaction

/**
 * Audio system state tracking
 */
export interface AudioSystemState {
  /** Whether the AudioContext has been created */
  created: boolean;
  /** Whether the AudioContext has been resumed (after user gesture) */
  resumed: boolean;
  /** Whether audio is globally muted */
  muted: boolean;
  /** Whether music is muted (SFX still play) */
  musicMuted: boolean;
  /** Whether SFX are muted (music still plays) */
  sfxMuted: boolean;
}

/**
 * AudioContextManager handles Web Audio API initialization and lifecycle.
 * Addresses browser autoplay policy by deferring audio context resume
 * until first user interaction.
 */
export class AudioContextManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private state: AudioSystemState = {
    created: false,
    resumed: false,
    muted: false,
    musicMuted: false,
    sfxMuted: false,
  };
  private resumeListenersBound = false;
  private volume = 1.0;

  /**
   * Initialize the audio context (creates it in suspended state).
   * Call this on page load.
   */
  init(): void {
    if (this.state.created) {
      return;
    }

    // Check for Web Audio API support
    if (typeof window === 'undefined' || !window.AudioContext) {
      // Graceful degradation: no Web Audio API
      console.warn('Web Audio API not available. Audio will be disabled.');
      return;
    }

    try {
      this.context = new AudioContext();

      // Create gain node hierarchy: master -> music/sfx
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);

      this.musicGain = this.context.createGain();
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.context.createGain();
      this.sfxGain.connect(this.masterGain);

      this.state.created = true;

      // Register one-shot event listeners for user interaction
      this.bindResumeListeners();
    } catch (e) {
      console.warn('Failed to create AudioContext:', e);
    }
  }

  /**
   * Bind event listeners for resuming audio context on first user interaction.
   * Required due to browser autoplay policies.
   */
  private bindResumeListeners(): void {
    if (this.resumeListenersBound || typeof window === 'undefined') {
      return;
    }

    const resumeHandler = () => {
      this.resumeContext();
    };

    // Listen for various user interaction events
    window.addEventListener('keydown', resumeHandler, { once: true });
    window.addEventListener('click', resumeHandler, { once: true });
    window.addEventListener('touchstart', resumeHandler, { once: true });

    this.resumeListenersBound = true;
  }

  /**
   * Resume the audio context after user interaction.
   * Called automatically by event listeners.
   */
  private resumeContext(): void {
    if (!this.context || this.state.resumed) {
      return;
    }

    this.context.resume().then(() => {
      this.state.resumed = true;
    }).catch((e) => {
      console.warn('Failed to resume AudioContext:', e);
    });
  }

  /**
   * Get the AudioContext (may be null if not supported).
   */
  getContext(): AudioContext | null {
    return this.context;
  }

  /**
   * Get the master gain node.
   */
  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  /**
   * Get the music gain node.
   */
  getMusicGain(): GainNode | null {
    return this.musicGain;
  }

  /**
   * Get the SFX gain node.
   */
  getSfxGain(): GainNode | null {
    return this.sfxGain;
  }

  /**
   * Check if the audio system is ready to play audio.
   */
  isReady(): boolean {
    return this.state.created && this.state.resumed;
  }

  /**
   * Check if the audio system has been created (may not be resumed yet).
   */
  isCreated(): boolean {
    return this.state.created;
  }

  /**
   * Check if the audio system has been resumed after user interaction.
   */
  isResumed(): boolean {
    return this.state.resumed;
  }

  /**
   * Get the current audio system state.
   */
  getState(): AudioSystemState {
    return { ...this.state };
  }

  /**
   * Set the master volume (0.0 - 1.0).
   */
  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.masterGain && !this.state.muted) {
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * Get the current master volume.
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Toggle global mute.
   */
  toggleMute(): boolean {
    this.state.muted = !this.state.muted;
    this.applyMuteState();
    return this.state.muted;
  }

  /**
   * Set global mute state.
   */
  setMuted(muted: boolean): void {
    this.state.muted = muted;
    this.applyMuteState();
  }

  /**
   * Check if audio is globally muted.
   */
  isMuted(): boolean {
    return this.state.muted;
  }

  /**
   * Toggle music mute.
   */
  toggleMusicMute(): boolean {
    this.state.musicMuted = !this.state.musicMuted;
    this.applyMuteState();
    return this.state.musicMuted;
  }

  /**
   * Set music mute state.
   */
  setMusicMuted(muted: boolean): void {
    this.state.musicMuted = muted;
    this.applyMuteState();
  }

  /**
   * Check if music is muted.
   */
  isMusicMuted(): boolean {
    return this.state.musicMuted;
  }

  /**
   * Toggle SFX mute.
   */
  toggleSfxMute(): boolean {
    this.state.sfxMuted = !this.state.sfxMuted;
    this.applyMuteState();
    return this.state.sfxMuted;
  }

  /**
   * Set SFX mute state.
   */
  setSfxMuted(muted: boolean): void {
    this.state.sfxMuted = muted;
    this.applyMuteState();
  }

  /**
   * Check if SFX are muted.
   */
  isSfxMuted(): boolean {
    return this.state.sfxMuted;
  }

  /**
   * Apply the current mute state to gain nodes.
   */
  private applyMuteState(): void {
    if (!this.masterGain || !this.musicGain || !this.sfxGain) {
      return;
    }

    // Global mute affects master gain
    if (this.state.muted) {
      this.masterGain.gain.value = 0;
    } else {
      this.masterGain.gain.value = this.volume;

      // Apply individual mute states
      this.musicGain.gain.value = this.state.musicMuted ? 0 : 1;
      this.sfxGain.gain.value = this.state.sfxMuted ? 0 : 1;
    }
  }

  /**
   * Suspend the audio context (for pausing).
   */
  suspend(): void {
    if (this.context && this.context.state === 'running') {
      this.context.suspend();
    }
  }

  /**
   * Resume the audio context (for unpausing).
   * Note: This is different from the initial resume on user interaction.
   */
  resume(): void {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  /**
   * Get the current time from the audio context.
   */
  getCurrentTime(): number {
    return this.context?.currentTime ?? 0;
  }

  /**
   * Get the sample rate of the audio context.
   */
  getSampleRate(): number {
    return this.context?.sampleRate ?? 44100;
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.state = {
      created: false,
      resumed: false,
      muted: false,
      musicMuted: false,
      sfxMuted: false,
    };
  }
}

// Singleton instance
let audioContextManager: AudioContextManager | null = null;

/**
 * Get the singleton AudioContextManager instance.
 */
export function getAudioContextManager(): AudioContextManager {
  if (!audioContextManager) {
    audioContextManager = new AudioContextManager();
  }
  return audioContextManager;
}

/**
 * Reset the singleton instance (for testing).
 */
export function resetAudioContextManager(): void {
  if (audioContextManager) {
    audioContextManager.dispose();
  }
  audioContextManager = null;
}
