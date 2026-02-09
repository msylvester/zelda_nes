// ToneGenerator.test.ts - Tests for ToneGenerator

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ToneGenerator,
  createPulseWave,
  createNoiseBuffer,
  clearToneCache,
  PulseDuty,
} from '../../src/audio/ToneGenerator';

// Mock audio nodes
class MockOscillatorNode {
  type = 'sine';
  frequency = { value: 440, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  setPeriodicWave = vi.fn();
  onended: (() => void) | null = null;
}

class MockGainNode {
  gain = { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  playbackRate = { value: 1 };
  loop = false;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
}

class MockAudioBuffer {
  numberOfChannels = 1;
  length = 44100;
  sampleRate = 44100;
  private data: Float32Array;

  constructor(channels: number, length: number, sampleRate: number) {
    this.numberOfChannels = channels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.data = new Float32Array(length);
  }

  getChannelData(): Float32Array {
    return this.data;
  }
}

class MockPeriodicWave {}

class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {};

  createOscillator = vi.fn(() => new MockOscillatorNode());
  createGain = vi.fn(() => new MockGainNode());
  createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
  createBuffer = vi.fn(
    (channels: number, length: number, sampleRate: number) =>
      new MockAudioBuffer(channels, length, sampleRate)
  );
  createPeriodicWave = vi.fn(() => new MockPeriodicWave());
}

describe('ToneGenerator', () => {
  let mockContext: MockAudioContext;

  beforeEach(() => {
    clearToneCache();
    mockContext = new MockAudioContext();
  });

  afterEach(() => {
    clearToneCache();
  });

  describe('createPulseWave', () => {
    it('should create a periodic wave for each duty cycle', () => {
      const duties: PulseDuty[] = [0.125, 0.25, 0.5, 0.75];

      for (const duty of duties) {
        const wave = createPulseWave(mockContext as unknown as AudioContext, duty);
        expect(wave).toBeTruthy();
        expect(mockContext.createPeriodicWave).toHaveBeenCalled();
      }
    });

    it('should cache periodic waves by duty cycle', () => {
      const wave1 = createPulseWave(mockContext as unknown as AudioContext, 0.5);
      const wave2 = createPulseWave(mockContext as unknown as AudioContext, 0.5);

      expect(wave1).toBe(wave2);
    });

    it('should create different waves for different duty cycles', () => {
      const wave1 = createPulseWave(mockContext as unknown as AudioContext, 0.25);
      mockContext.createPeriodicWave.mockReturnValueOnce(new MockPeriodicWave());
      const wave2 = createPulseWave(mockContext as unknown as AudioContext, 0.5);

      expect(wave1).not.toBe(wave2);
    });

    it('should use Fourier coefficients for wave generation', () => {
      createPulseWave(mockContext as unknown as AudioContext, 0.5);

      expect(mockContext.createPeriodicWave).toHaveBeenCalledWith(
        expect.any(Float32Array),
        expect.any(Float32Array),
        { disableNormalization: false }
      );
    });
  });

  describe('createNoiseBuffer', () => {
    it('should create a noise buffer for short mode', () => {
      const buffer = createNoiseBuffer(mockContext as unknown as AudioContext, 'short');

      expect(buffer).toBeTruthy();
      expect(mockContext.createBuffer).toHaveBeenCalled();
    });

    it('should create a noise buffer for long mode', () => {
      const buffer = createNoiseBuffer(mockContext as unknown as AudioContext, 'long');

      expect(buffer).toBeTruthy();
      expect(mockContext.createBuffer).toHaveBeenCalled();
    });

    it('should cache noise buffers', () => {
      const buffer1 = createNoiseBuffer(mockContext as unknown as AudioContext, 'short');
      const buffer2 = createNoiseBuffer(mockContext as unknown as AudioContext, 'short');

      expect(buffer1).toBe(buffer2);
    });

    it('should create different buffers for different modes', () => {
      const buffer1 = createNoiseBuffer(mockContext as unknown as AudioContext, 'short');
      const buffer2 = createNoiseBuffer(mockContext as unknown as AudioContext, 'long');

      expect(buffer1).not.toBe(buffer2);
    });

    it('should fill buffer with LFSR noise values', () => {
      const buffer = createNoiseBuffer(mockContext as unknown as AudioContext, 'short');
      const data = buffer.getChannelData(0);

      // Check that data contains only -1 or 1 values (LFSR output)
      for (let i = 0; i < Math.min(100, data.length); i++) {
        expect(data[i] === 1 || data[i] === -1).toBe(true);
      }
    });
  });

  describe('ToneGenerator construction', () => {
    it('should create a generator with context', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);

      expect(generator.getContext()).toBe(mockContext);
    });

    it('should use provided destination', () => {
      const destination = { name: 'custom' };
      const generator = new ToneGenerator(
        mockContext as unknown as AudioContext,
        destination as unknown as AudioNode
      );

      expect(generator.getContext()).toBe(mockContext);
    });

    it('should allow setting destination', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const newDestination = { name: 'new' };

      generator.setDestination(newDestination as unknown as AudioNode);
      // No error thrown = success
    });
  });

  describe('playPulse', () => {
    it('should create and configure an oscillator', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);

      const oscillator = generator.playPulse({
        frequency: 440,
        duration: 0.5,
        volume: 0.5,
      });

      expect(mockContext.createOscillator).toHaveBeenCalled();
      expect(oscillator.frequency.value).toBe(440);
      expect(oscillator.start).toHaveBeenCalled();
      expect(oscillator.stop).toHaveBeenCalled();
    });

    it('should use specified duty cycle', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);

      generator.playPulse({
        frequency: 440,
        duration: 0.5,
        volume: 0.5,
        duty: 0.25,
      });

      expect(mockContext.createPeriodicWave).toHaveBeenCalled();
    });

    it('should use default duty cycle of 0.5', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);

      generator.playPulse({
        frequency: 440,
        duration: 0.5,
        volume: 0.5,
      });

      // The periodic wave for 0.5 duty should be created
      expect(mockContext.createPeriodicWave).toHaveBeenCalled();
    });

    it('should apply volume to gain node', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const gainNode = new MockGainNode();
      mockContext.createGain.mockReturnValueOnce(gainNode);

      generator.playPulse({
        frequency: 440,
        duration: 0.5,
        volume: 0.7,
      });

      expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.7, 0);
    });

    it('should apply volume envelope when provided', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const gainNode = new MockGainNode();
      mockContext.createGain.mockReturnValueOnce(gainNode);

      generator.playPulse({
        frequency: 440,
        duration: 0.5,
        volume: 0.5,
        envelope: {
          startVolume: 1.0,
          endVolume: 0.0,
          decayTime: 0.5,
        },
      });

      expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(1.0, 0);
      expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.0, 0.5);
    });

    it('should connect nodes in correct order', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const oscillator = new MockOscillatorNode();
      const gainNode = new MockGainNode();
      mockContext.createOscillator.mockReturnValueOnce(oscillator);
      mockContext.createGain.mockReturnValueOnce(gainNode);

      generator.playPulse({
        frequency: 440,
        duration: 0.5,
        volume: 0.5,
      });

      expect(oscillator.connect).toHaveBeenCalledWith(gainNode);
      expect(gainNode.connect).toHaveBeenCalled();
    });
  });

  describe('playTriangle', () => {
    it('should create a triangle oscillator', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const oscillator = new MockOscillatorNode();
      mockContext.createOscillator.mockReturnValueOnce(oscillator);

      generator.playTriangle({
        frequency: 220,
        duration: 0.5,
        volume: 0.5,
      });

      expect(oscillator.type).toBe('triangle');
      expect(oscillator.frequency.value).toBe(220);
    });

    it('should apply volume correctly', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const gainNode = new MockGainNode();
      mockContext.createGain.mockReturnValueOnce(gainNode);

      generator.playTriangle({
        frequency: 220,
        duration: 0.5,
        volume: 0.8,
      });

      expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 0);
    });

    it('should apply envelope for triangle waves', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const gainNode = new MockGainNode();
      mockContext.createGain.mockReturnValueOnce(gainNode);

      generator.playTriangle({
        frequency: 220,
        duration: 0.5,
        volume: 0.5,
        envelope: {
          startVolume: 0.8,
          endVolume: 0.2,
          decayTime: 0.3,
        },
      });

      expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 0);
      expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.2, 0.3);
    });
  });

  describe('playNoise', () => {
    it('should create a buffer source with noise', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const source = new MockAudioBufferSourceNode();
      mockContext.createBufferSource.mockReturnValueOnce(source);

      generator.playNoise({
        duration: 0.5,
        volume: 0.5,
        mode: 'long',
      });

      expect(mockContext.createBufferSource).toHaveBeenCalled();
      expect(source.loop).toBe(true);
      expect(source.start).toHaveBeenCalled();
      expect(source.stop).toHaveBeenCalled();
    });

    it('should use short noise mode', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);

      generator.playNoise({
        duration: 0.5,
        volume: 0.5,
        mode: 'short',
      });

      expect(mockContext.createBuffer).toHaveBeenCalled();
    });

    it('should apply playback rate based on period index', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const source = new MockAudioBufferSourceNode();
      mockContext.createBufferSource.mockReturnValueOnce(source);

      generator.playNoise({
        duration: 0.5,
        volume: 0.5,
        mode: 'long',
        periodIndex: 0,
      });

      // Period index 0 should have highest playback rate (16.0)
      expect(source.playbackRate.value).toBe(16.0);
    });

    it('should clamp period index to valid range', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const source = new MockAudioBufferSourceNode();
      mockContext.createBufferSource.mockReturnValueOnce(source);

      generator.playNoise({
        duration: 0.5,
        volume: 0.5,
        mode: 'long',
        periodIndex: 100, // Out of range, should clamp to 15
      });

      // Period index 15 should have lowest playback rate (0.3)
      expect(source.playbackRate.value).toBe(0.3);
    });

    it('should apply volume envelope', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const gainNode = new MockGainNode();
      mockContext.createGain.mockReturnValueOnce(gainNode);

      generator.playNoise({
        duration: 0.5,
        volume: 0.5,
        mode: 'long',
        envelope: {
          startVolume: 0.9,
          endVolume: 0.1,
          decayTime: 0.4,
        },
      });

      expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.9, 0);
      expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.1, 0.4);
    });
  });

  describe('playFrequencySweep', () => {
    it('should create a frequency sweep for pulse wave', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const oscillator = new MockOscillatorNode();
      mockContext.createOscillator.mockReturnValueOnce(oscillator);

      generator.playFrequencySweep(880, 220, 0.5, 0.5, 'pulse', 0.5);

      expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, 0);
      expect(oscillator.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(220, 0.5);
    });

    it('should create a frequency sweep for triangle wave', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);
      const oscillator = new MockOscillatorNode();
      mockContext.createOscillator.mockReturnValueOnce(oscillator);

      generator.playFrequencySweep(440, 110, 0.3, 0.6, 'triangle');

      expect(oscillator.type).toBe('triangle');
      expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
      expect(oscillator.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(110, 0.3);
    });

    it('should use default pulse type and duty cycle', () => {
      const generator = new ToneGenerator(mockContext as unknown as AudioContext);

      generator.playFrequencySweep(880, 440, 0.5, 0.5);

      expect(mockContext.createPeriodicWave).toHaveBeenCalled();
    });
  });

  describe('clearToneCache', () => {
    it('should clear cached periodic waves', () => {
      const wave1 = createPulseWave(mockContext as unknown as AudioContext, 0.5);

      clearToneCache();

      mockContext.createPeriodicWave.mockReturnValueOnce(new MockPeriodicWave());
      const wave2 = createPulseWave(mockContext as unknown as AudioContext, 0.5);

      expect(wave1).not.toBe(wave2);
    });

    it('should clear cached noise buffers', () => {
      const buffer1 = createNoiseBuffer(mockContext as unknown as AudioContext, 'short');

      clearToneCache();

      const buffer2 = createNoiseBuffer(mockContext as unknown as AudioContext, 'short');

      expect(buffer1).not.toBe(buffer2);
    });
  });
});
