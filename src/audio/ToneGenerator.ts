// ToneGenerator.ts - NES APU sound synthesis using Web Audio API
// Generates pulse waves, triangle waves, and noise for authentic NES sound

/**
 * NES pulse wave duty cycles.
 * The NES APU supports 4 duty cycle settings for pulse channels.
 */
export type PulseDuty = 0.125 | 0.25 | 0.5 | 0.75;

/**
 * Noise mode for the NES noise channel.
 * - 'short': 93-step LFSR, produces metallic/tonal noise
 * - 'long': 32767-step LFSR, produces white noise hiss
 */
export type NoiseMode = 'short' | 'long';

/**
 * Channel type for NES APU emulation.
 */
export type ChannelType = 'pulse1' | 'pulse2' | 'triangle' | 'noise';

/**
 * Volume envelope configuration for NES-style volume decay.
 */
export interface VolumeEnvelope {
  /** Starting volume (0.0-1.0) */
  startVolume: number;
  /** Ending volume (0.0-1.0) */
  endVolume: number;
  /** Decay duration in seconds */
  decayTime: number;
}

/**
 * Tone configuration for generating a single tone.
 */
export interface ToneConfig {
  /** Frequency in Hz */
  frequency: number;
  /** Duration in seconds */
  duration: number;
  /** Volume (0.0-1.0) */
  volume: number;
  /** Duty cycle for pulse channels (defaults to 0.5) */
  duty?: PulseDuty;
  /** Volume envelope (optional, overrides volume if provided) */
  envelope?: VolumeEnvelope;
}

/**
 * Noise configuration for generating noise.
 */
export interface NoiseConfig {
  /** Duration in seconds */
  duration: number;
  /** Volume (0.0-1.0) */
  volume: number;
  /** Noise mode */
  mode: NoiseMode;
  /** Period index (0-15, lower = higher pitch) */
  periodIndex?: number;
  /** Volume envelope (optional) */
  envelope?: VolumeEnvelope;
}

/**
 * Cached periodic waves for pulse duty cycles.
 */
const pulseWaveCache = new Map<string, PeriodicWave>();

/**
 * Cached noise buffers.
 */
const noiseBufferCache = new Map<string, AudioBuffer>();

/**
 * Create a PeriodicWave matching NES pulse duty cycles.
 * Uses Fourier series to approximate the NES square wave.
 */
export function createPulseWave(context: AudioContext, duty: PulseDuty): PeriodicWave {
  const cacheKey = `${duty}`;
  const cached = pulseWaveCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Number of harmonics to include (more = more accurate, but more CPU)
  const numHarmonics = 32;

  // Fourier coefficients for a pulse wave with given duty cycle
  const real = new Float32Array(numHarmonics + 1);
  const imag = new Float32Array(numHarmonics + 1);

  real[0] = 0; // DC offset
  imag[0] = 0;

  for (let n = 1; n <= numHarmonics; n++) {
    // For a pulse wave with duty cycle d, the Fourier coefficient is:
    // b_n = (2 / (n * pi)) * sin(n * pi * d)
    const coefficient = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    real[n] = 0;
    imag[n] = coefficient;
  }

  const wave = context.createPeriodicWave(real, imag, { disableNormalization: false });
  pulseWaveCache.set(cacheKey, wave);
  return wave;
}

/**
 * Create a noise buffer approximating the NES LFSR noise generator.
 */
export function createNoiseBuffer(
  context: AudioContext,
  mode: NoiseMode,
  sampleRate: number = 44100
): AudioBuffer {
  const cacheKey = `${mode}-${sampleRate}`;
  const cached = noiseBufferCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Buffer length - longer for more varied noise
  // Short mode loops every ~93 samples, long mode loops every ~32767 samples
  const bufferLength = mode === 'short' ? 93 : 32767;

  // Create a buffer of the appropriate length
  // We'll create 1 second of audio and loop it
  const bufferSize = Math.max(bufferLength, sampleRate);
  const buffer = context.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  // NES LFSR noise generator simulation
  // The NES uses a 15-bit LFSR with taps at bits 0 and 1 (short) or bits 0 and 6 (long)
  let lfsr = 1; // Initial state (must be non-zero)
  const tapBit = mode === 'short' ? 1 : 6;

  for (let i = 0; i < bufferSize; i++) {
    // Output is bit 0 of LFSR
    const output = lfsr & 1;
    data[i] = output === 1 ? 1.0 : -1.0;

    // Feedback calculation: XOR of bit 0 and tap bit
    const feedback = (lfsr ^ (lfsr >> tapBit)) & 1;

    // Shift right and insert feedback at bit 14
    lfsr = (lfsr >> 1) | (feedback << 14);

    // Keep LFSR to 15 bits
    lfsr &= 0x7FFF;
  }

  noiseBufferCache.set(cacheKey, buffer);
  return buffer;
}

/**
 * NES noise period table (approximate frequencies in Hz).
 * Lower period index = higher pitch.
 */
const NOISE_PERIOD_TABLE: number[] = [
  // Period index 0-15, values are playback rate multipliers
  16.0, 12.8, 10.7, 9.1, 8.0, 6.4, 5.3, 4.6,
  4.0, 3.2, 2.1, 1.8, 1.5, 1.1, 0.5, 0.3,
];

/**
 * ToneGenerator creates NES-authentic tones using Web Audio API.
 */
export class ToneGenerator {
  private context: AudioContext;
  private destination: AudioNode;

  constructor(context: AudioContext, destination?: AudioNode) {
    this.context = context;
    this.destination = destination ?? context.destination;
  }

  /**
   * Play a pulse wave tone (for pulse1 or pulse2 channels).
   * Returns the oscillator node for external control if needed.
   */
  playPulse(config: ToneConfig): OscillatorNode {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    // Create pulse wave with specified duty cycle
    const duty = config.duty ?? 0.5;
    const wave = createPulseWave(this.context, duty);
    oscillator.setPeriodicWave(wave);

    oscillator.frequency.value = config.frequency;

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.destination);

    // Apply volume/envelope
    const now = this.context.currentTime;
    if (config.envelope) {
      gainNode.gain.setValueAtTime(config.envelope.startVolume, now);
      gainNode.gain.linearRampToValueAtTime(
        config.envelope.endVolume,
        now + config.envelope.decayTime
      );
    } else {
      gainNode.gain.setValueAtTime(config.volume, now);
    }

    // Start and stop
    oscillator.start(now);
    oscillator.stop(now + config.duration);

    // Cleanup after sound completes
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };

    return oscillator;
  }

  /**
   * Play a triangle wave tone (for triangle channel).
   * Triangle channel has no volume control on NES - it's either on or off.
   */
  playTriangle(config: Omit<ToneConfig, 'duty'>): OscillatorNode {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.value = config.frequency;

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.destination);

    // Apply volume (NES triangle has no envelope, but we allow volume control)
    const now = this.context.currentTime;
    if (config.envelope) {
      gainNode.gain.setValueAtTime(config.envelope.startVolume, now);
      gainNode.gain.linearRampToValueAtTime(
        config.envelope.endVolume,
        now + config.envelope.decayTime
      );
    } else {
      gainNode.gain.setValueAtTime(config.volume, now);
    }

    // Start and stop
    oscillator.start(now);
    oscillator.stop(now + config.duration);

    // Cleanup after sound completes
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };

    return oscillator;
  }

  /**
   * Play noise (for noise channel).
   */
  playNoise(config: NoiseConfig): AudioBufferSourceNode {
    const noiseBuffer = createNoiseBuffer(
      this.context,
      config.mode,
      this.context.sampleRate
    );

    const source = this.context.createBufferSource();
    const gainNode = this.context.createGain();

    source.buffer = noiseBuffer;
    source.loop = true;

    // Apply playback rate based on period index
    if (config.periodIndex !== undefined) {
      const periodIndex = Math.max(0, Math.min(15, config.periodIndex));
      const rate = NOISE_PERIOD_TABLE[periodIndex];
      if (rate !== undefined) {
        source.playbackRate.value = rate;
      }
    }

    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(this.destination);

    // Apply volume/envelope
    const now = this.context.currentTime;
    if (config.envelope) {
      gainNode.gain.setValueAtTime(config.envelope.startVolume, now);
      gainNode.gain.linearRampToValueAtTime(
        config.envelope.endVolume,
        now + config.envelope.decayTime
      );
    } else {
      gainNode.gain.setValueAtTime(config.volume, now);
    }

    // Start and stop
    source.start(now);
    source.stop(now + config.duration);

    // Cleanup after sound completes
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
    };

    return source;
  }

  /**
   * Play a frequency sweep (for effects like damage, death).
   */
  playFrequencySweep(
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number,
    type: 'pulse' | 'triangle' = 'pulse',
    duty: PulseDuty = 0.5
  ): OscillatorNode {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    if (type === 'pulse') {
      const wave = createPulseWave(this.context, duty);
      oscillator.setPeriodicWave(wave);
    } else {
      oscillator.type = 'triangle';
    }

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.destination);

    // Set frequency sweep
    const now = this.context.currentTime;
    oscillator.frequency.setValueAtTime(startFreq, now);
    oscillator.frequency.linearRampToValueAtTime(endFreq, now + duration);

    gainNode.gain.setValueAtTime(volume, now);

    // Start and stop
    oscillator.start(now);
    oscillator.stop(now + duration);

    // Cleanup after sound completes
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };

    return oscillator;
  }

  /**
   * Set the output destination for this generator.
   */
  setDestination(destination: AudioNode): void {
    this.destination = destination;
  }

  /**
   * Get the audio context.
   */
  getContext(): AudioContext {
    return this.context;
  }
}

/**
 * Clear cached periodic waves and noise buffers (for testing).
 */
export function clearToneCache(): void {
  pulseWaveCache.clear();
  noiseBufferCache.clear();
}
