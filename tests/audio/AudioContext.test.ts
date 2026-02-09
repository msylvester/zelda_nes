// AudioContext.test.ts - Tests for AudioContextManager

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AudioContextManager,
  getAudioContextManager,
  resetAudioContextManager,
} from '../../src/audio/AudioContext';

// Mock AudioContext for Node.js environment
class MockGainNode {
  gain = { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  state = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};

  createGain = vi.fn(() => new MockGainNode());
  createOscillator = vi.fn();
  createBuffer = vi.fn();
  createBufferSource = vi.fn();
  createPeriodicWave = vi.fn();
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  suspend = vi.fn(() => {
    this.state = 'suspended';
    return Promise.resolve();
  });
  close = vi.fn(() => Promise.resolve());
}

describe('AudioContextManager', () => {
  let originalWindow: typeof globalThis.window | undefined;
  let originalAudioContext: typeof globalThis.AudioContext | undefined;
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    resetAudioContextManager();
    originalWindow = globalThis.window;
    originalAudioContext = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
    mockAudioContext = new MockAudioContext();

    // Mock window with AudioContext
    const mockAudioContextConstructor = vi.fn(() => mockAudioContext);
    (globalThis as Record<string, unknown>).window = {
      AudioContext: mockAudioContextConstructor,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    // Also set global AudioContext for direct usage
    (globalThis as Record<string, unknown>).AudioContext = mockAudioContextConstructor;
  });

  afterEach(() => {
    resetAudioContextManager();
    if (originalWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
    if (originalAudioContext === undefined) {
      delete (globalThis as Record<string, unknown>).AudioContext;
    } else {
      (globalThis as Record<string, unknown>).AudioContext = originalAudioContext;
    }
  });

  describe('init', () => {
    it('should create AudioContext on init', () => {
      const manager = new AudioContextManager();
      manager.init();

      expect(manager.isCreated()).toBe(true);
      expect(window.AudioContext).toHaveBeenCalled();
    });

    it('should create gain node hierarchy', () => {
      const manager = new AudioContextManager();
      manager.init();

      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(3);
      expect(manager.getMasterGain()).toBeTruthy();
      expect(manager.getMusicGain()).toBeTruthy();
      expect(manager.getSfxGain()).toBeTruthy();
    });

    it('should not create AudioContext twice', () => {
      const manager = new AudioContextManager();
      manager.init();
      manager.init();

      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('should register resume listeners', () => {
      const manager = new AudioContextManager();
      manager.init();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        { once: true }
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { once: true }
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        { once: true }
      );
    });

    it('should handle missing window gracefully', () => {
      delete (globalThis as Record<string, unknown>).window;
      const manager = new AudioContextManager();
      manager.init();

      expect(manager.isCreated()).toBe(false);
    });

    it('should handle missing AudioContext gracefully', () => {
      (globalThis as Record<string, unknown>).window = {};
      const manager = new AudioContextManager();
      manager.init();

      expect(manager.isCreated()).toBe(false);
    });
  });

  describe('getContext', () => {
    it('should return null before init', () => {
      const manager = new AudioContextManager();
      expect(manager.getContext()).toBeNull();
    });

    it('should return AudioContext after init', () => {
      const manager = new AudioContextManager();
      manager.init();
      expect(manager.getContext()).toBe(mockAudioContext);
    });
  });

  describe('isReady', () => {
    it('should return false before init', () => {
      const manager = new AudioContextManager();
      expect(manager.isReady()).toBe(false);
    });

    it('should return false after init but before resume', () => {
      const manager = new AudioContextManager();
      manager.init();
      expect(manager.isCreated()).toBe(true);
      expect(manager.isResumed()).toBe(false);
      expect(manager.isReady()).toBe(false);
    });
  });

  describe('volume control', () => {
    it('should set volume', () => {
      const manager = new AudioContextManager();
      manager.init();

      manager.setVolume(0.5);
      expect(manager.getVolume()).toBe(0.5);
    });

    it('should clamp volume to 0-1 range', () => {
      const manager = new AudioContextManager();
      manager.init();

      manager.setVolume(-0.5);
      expect(manager.getVolume()).toBe(0);

      manager.setVolume(1.5);
      expect(manager.getVolume()).toBe(1);
    });

    it('should apply volume to master gain', () => {
      const manager = new AudioContextManager();
      manager.init();

      const masterGain = manager.getMasterGain() as MockGainNode;
      manager.setVolume(0.7);

      expect(masterGain.gain.value).toBe(0.7);
    });
  });

  describe('mute control', () => {
    it('should toggle mute', () => {
      const manager = new AudioContextManager();
      manager.init();

      expect(manager.isMuted()).toBe(false);

      const muted = manager.toggleMute();
      expect(muted).toBe(true);
      expect(manager.isMuted()).toBe(true);

      const unmuted = manager.toggleMute();
      expect(unmuted).toBe(false);
      expect(manager.isMuted()).toBe(false);
    });

    it('should set mute state directly', () => {
      const manager = new AudioContextManager();
      manager.init();

      manager.setMuted(true);
      expect(manager.isMuted()).toBe(true);

      manager.setMuted(false);
      expect(manager.isMuted()).toBe(false);
    });

    it('should set master gain to 0 when muted', () => {
      const manager = new AudioContextManager();
      manager.init();

      const masterGain = manager.getMasterGain() as MockGainNode;

      manager.setMuted(true);
      expect(masterGain.gain.value).toBe(0);

      manager.setMuted(false);
      expect(masterGain.gain.value).toBe(1);
    });

    it('should toggle music mute separately', () => {
      const manager = new AudioContextManager();
      manager.init();

      expect(manager.isMusicMuted()).toBe(false);

      manager.toggleMusicMute();
      expect(manager.isMusicMuted()).toBe(true);

      manager.setMusicMuted(false);
      expect(manager.isMusicMuted()).toBe(false);
    });

    it('should toggle SFX mute separately', () => {
      const manager = new AudioContextManager();
      manager.init();

      expect(manager.isSfxMuted()).toBe(false);

      manager.toggleSfxMute();
      expect(manager.isSfxMuted()).toBe(true);

      manager.setSfxMuted(false);
      expect(manager.isSfxMuted()).toBe(false);
    });

    it('should apply music/SFX mute to individual gain nodes', () => {
      const manager = new AudioContextManager();
      manager.init();

      const musicGain = manager.getMusicGain() as MockGainNode;
      const sfxGain = manager.getSfxGain() as MockGainNode;

      manager.setMusicMuted(true);
      expect(musicGain.gain.value).toBe(0);
      expect(sfxGain.gain.value).toBe(1);

      manager.setMusicMuted(false);
      manager.setSfxMuted(true);
      expect(musicGain.gain.value).toBe(1);
      expect(sfxGain.gain.value).toBe(0);
    });
  });

  describe('suspend and resume', () => {
    it('should suspend the audio context', () => {
      const manager = new AudioContextManager();
      manager.init();
      mockAudioContext.state = 'running';

      manager.suspend();
      expect(mockAudioContext.suspend).toHaveBeenCalled();
    });

    it('should resume the audio context', () => {
      const manager = new AudioContextManager();
      manager.init();

      manager.resume();
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should not suspend if already suspended', () => {
      const manager = new AudioContextManager();
      manager.init();
      mockAudioContext.state = 'suspended';

      manager.suspend();
      expect(mockAudioContext.suspend).not.toHaveBeenCalled();
    });

    it('should not resume if already running', () => {
      const manager = new AudioContextManager();
      manager.init();
      mockAudioContext.state = 'running';

      manager.resume();
      expect(mockAudioContext.resume).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentTime', () => {
    it('should return 0 before init', () => {
      const manager = new AudioContextManager();
      expect(manager.getCurrentTime()).toBe(0);
    });

    it('should return current time from context', () => {
      const manager = new AudioContextManager();
      manager.init();
      mockAudioContext.currentTime = 1.5;

      expect(manager.getCurrentTime()).toBe(1.5);
    });
  });

  describe('getSampleRate', () => {
    it('should return default sample rate before init', () => {
      const manager = new AudioContextManager();
      expect(manager.getSampleRate()).toBe(44100);
    });

    it('should return sample rate from context', () => {
      const manager = new AudioContextManager();
      manager.init();
      mockAudioContext.sampleRate = 48000;

      expect(manager.getSampleRate()).toBe(48000);
    });
  });

  describe('getState', () => {
    it('should return a copy of the state', () => {
      const manager = new AudioContextManager();
      manager.init();

      const state1 = manager.getState();
      const state2 = manager.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it('should reflect all state flags', () => {
      const manager = new AudioContextManager();
      manager.init();

      manager.setMuted(true);
      manager.setMusicMuted(true);
      manager.setSfxMuted(true);

      const state = manager.getState();
      expect(state.created).toBe(true);
      expect(state.muted).toBe(true);
      expect(state.musicMuted).toBe(true);
      expect(state.sfxMuted).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should close the audio context', () => {
      const manager = new AudioContextManager();
      manager.init();

      manager.dispose();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should reset state after dispose', () => {
      const manager = new AudioContextManager();
      manager.init();
      manager.setMuted(true);

      manager.dispose();

      expect(manager.isCreated()).toBe(false);
      expect(manager.getContext()).toBeNull();
      expect(manager.getMasterGain()).toBeNull();
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const manager1 = getAudioContextManager();
      const manager2 = getAudioContextManager();

      expect(manager1).toBe(manager2);
    });

    it('should create new instance after reset', () => {
      const manager1 = getAudioContextManager();
      manager1.init();

      resetAudioContextManager();

      const manager2 = getAudioContextManager();
      expect(manager1).not.toBe(manager2);
      expect(manager2.isCreated()).toBe(false);
    });
  });
});
