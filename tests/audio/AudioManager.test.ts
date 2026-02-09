// AudioManager.test.ts - Tests for AudioManager

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AudioManager,
  SOUND_EFFECTS,
  getAudioManager,
  resetAudioManager,
} from '../../src/audio/AudioManager';
import { AudioContextManager } from '../../src/audio/AudioContext';

// Mock ToneGenerator
const mockPlayPulse = vi.fn(() => ({}));
const mockPlayTriangle = vi.fn(() => ({}));
const mockPlayNoise = vi.fn(() => ({}));
const mockPlayFrequencySweep = vi.fn(() => ({}));

vi.mock('../../src/audio/ToneGenerator', () => ({
  ToneGenerator: vi.fn().mockImplementation(() => ({
    playPulse: mockPlayPulse,
    playTriangle: mockPlayTriangle,
    playNoise: mockPlayNoise,
    playFrequencySweep: mockPlayFrequencySweep,
    setDestination: vi.fn(),
    getContext: vi.fn(),
  })),
  createPulseWave: vi.fn(),
  createNoiseBuffer: vi.fn(),
  clearToneCache: vi.fn(),
}));

// Mock AudioContextManager
class MockAudioContextManager {
  private created = false;
  private resumed = false;
  private muted = false;
  private sfxMuted = false;
  private volume = 1.0;
  private context = {};
  private sfxGain = { gain: { value: 1 } };

  init = vi.fn(() => {
    this.created = true;
    this.resumed = true;
  });

  isCreated = vi.fn(() => this.created);
  isResumed = vi.fn(() => this.resumed);
  isReady = vi.fn(() => this.created && this.resumed);
  isMuted = vi.fn(() => this.muted);
  isSfxMuted = vi.fn(() => this.sfxMuted);
  isMusicMuted = vi.fn(() => false);

  getContext = vi.fn(() => this.context);
  getSfxGain = vi.fn(() => this.sfxGain);
  getMusicGain = vi.fn(() => ({ gain: { value: 1 } }));
  getMasterGain = vi.fn(() => ({ gain: { value: 1 } }));

  toggleMute = vi.fn(() => {
    this.muted = !this.muted;
    return this.muted;
  });

  setMuted = vi.fn((value: boolean) => {
    this.muted = value;
  });

  setSfxMuted = vi.fn((value: boolean) => {
    this.sfxMuted = value;
  });

  setVolume = vi.fn((value: number) => {
    this.volume = value;
  });

  getVolume = vi.fn(() => this.volume);

  suspend = vi.fn();
  resume = vi.fn();
  dispose = vi.fn();

  // Test helpers
  _setReady(ready: boolean) {
    this.created = ready;
    this.resumed = ready;
  }
}

describe('AudioManager', () => {
  let mockContextManager: MockAudioContextManager;
  let manager: AudioManager;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAudioManager();
    mockContextManager = new MockAudioContextManager();
    manager = new AudioManager(mockContextManager as unknown as AudioContextManager);
  });

  afterEach(() => {
    resetAudioManager();
  });

  describe('SOUND_EFFECTS', () => {
    it('should have sword_slash defined', () => {
      expect(SOUND_EFFECTS.sword_slash).toBeDefined();
      expect(SOUND_EFFECTS.sword_slash.channels).toContain('noise');
      expect(SOUND_EFFECTS.sword_slash.priority).toBe(6);
    });

    it('should have enemy_hit defined', () => {
      expect(SOUND_EFFECTS.enemy_hit).toBeDefined();
      expect(SOUND_EFFECTS.enemy_hit.channels).toContain('pulse1');
      expect(SOUND_EFFECTS.enemy_hit.priority).toBe(7);
    });

    it('should have enemy_kill defined', () => {
      expect(SOUND_EFFECTS.enemy_kill).toBeDefined();
      expect(SOUND_EFFECTS.enemy_kill.channels).toContain('pulse1');
      expect(SOUND_EFFECTS.enemy_kill.channels).toContain('noise');
      expect(SOUND_EFFECTS.enemy_kill.priority).toBe(7);
    });

    it('should have link_hurt defined', () => {
      expect(SOUND_EFFECTS.link_hurt).toBeDefined();
      expect(SOUND_EFFECTS.link_hurt.channels).toContain('pulse1');
      expect(SOUND_EFFECTS.link_hurt.channels).toContain('pulse2');
      expect(SOUND_EFFECTS.link_hurt.priority).toBe(9);
    });

    it('should have item_pickup_small defined', () => {
      expect(SOUND_EFFECTS.item_pickup_small).toBeDefined();
      expect(SOUND_EFFECTS.item_pickup_small.channels).toContain('pulse2');
    });

    it('should have low_health defined as looping', () => {
      expect(SOUND_EFFECTS.low_health).toBeDefined();
      expect(SOUND_EFFECTS.low_health.loops).toBe(true);
    });

    it('should have all required sound effects', () => {
      const requiredSfx = [
        'sword_slash',
        'enemy_hit',
        'enemy_kill',
        'link_hurt',
        'item_pickup_small',
        'item_pickup_heart',
        'bomb_explode',
        'low_health',
        'secret_reveal',
        'cursor_move',
      ];

      for (const sfxId of requiredSfx) {
        expect(SOUND_EFFECTS[sfxId]).toBeDefined();
      }
    });
  });

  describe('init', () => {
    it('should initialize the context manager', () => {
      manager.init();

      expect(mockContextManager.init).toHaveBeenCalled();
    });
  });

  describe('playSfx', () => {
    beforeEach(() => {
      manager.init();
    });

    it('should not play if audio system is not ready', () => {
      mockContextManager._setReady(false);

      manager.playSfx('sword_slash');

      expect(mockPlayNoise).not.toHaveBeenCalled();
    });

    it('should not play if SFX is muted', () => {
      mockContextManager.setSfxMuted(true);

      manager.playSfx('sword_slash');

      expect(mockPlayNoise).not.toHaveBeenCalled();
    });

    it('should warn for unknown SFX', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      manager.playSfx('nonexistent');

      expect(consoleSpy).toHaveBeenCalledWith('Unknown SFX: nonexistent');
      consoleSpy.mockRestore();
    });

    it('should play noise channel SFX', () => {
      manager.playSfx('sword_slash');

      expect(mockPlayNoise).toHaveBeenCalled();
    });

    it('should play pulse channel SFX', () => {
      manager.playSfx('enemy_hit');

      expect(mockPlayPulse).toHaveBeenCalled();
    });

    it('should track active SFX', () => {
      manager.playSfx('sword_slash');

      expect(manager.isSfxPlaying('sword_slash')).toBe(true);
      expect(manager.getActiveSfxIds()).toContain('sword_slash');
    });

    it('should restart non-looping SFX if already playing', () => {
      manager.playSfx('sword_slash');
      manager.playSfx('sword_slash');

      // Should still be playing (restarted)
      expect(manager.isSfxPlaying('sword_slash')).toBe(true);
    });

    it('should respect channel priority', () => {
      // Play lower priority SFX first
      manager.playSfx('item_pickup_small'); // priority 6 on pulse2

      // Try to play higher priority SFX on same channel
      manager.playSfx('link_hurt'); // priority 9 on pulse1 and pulse2

      // Higher priority should be playing
      expect(manager.isSfxPlaying('link_hurt')).toBe(true);
    });

    it('should not interrupt higher priority SFX', () => {
      // Play higher priority SFX first
      manager.playSfx('link_hurt'); // priority 9 on pulse2

      // Try to play lower priority SFX on same channel
      manager.playSfx('item_pickup_small'); // priority 6 on pulse2

      // Higher priority should still be playing, lower should not start
      expect(manager.isSfxPlaying('link_hurt')).toBe(true);
    });
  });

  describe('stopSfx', () => {
    beforeEach(() => {
      manager.init();
    });

    it('should stop a playing SFX', () => {
      manager.playSfx('low_health');
      expect(manager.isSfxPlaying('low_health')).toBe(true);

      manager.stopSfx('low_health');
      expect(manager.isSfxPlaying('low_health')).toBe(false);
    });

    it('should do nothing for non-playing SFX', () => {
      manager.stopSfx('sword_slash');
      // No error should occur
    });
  });

  describe('music control', () => {
    beforeEach(() => {
      manager.init();
    });

    it('should start music', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      manager.playMusic('overworld');

      expect(manager.getCurrentMusic()).toBe('overworld');
      consoleSpy.mockRestore();
    });

    it('should not restart same music', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      manager.playMusic('overworld');
      manager.playMusic('overworld');

      // Should only log once
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });

    it('should stop previous music when starting new', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      manager.playMusic('overworld');
      manager.playMusic('dungeon');

      expect(manager.getCurrentMusic()).toBe('dungeon');
      consoleSpy.mockRestore();
    });

    it('should stop music', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      manager.playMusic('overworld');
      manager.stopMusic();

      expect(manager.getCurrentMusic()).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('pause and resume', () => {
    beforeEach(() => {
      manager.init();
    });

    it('should pause audio context', () => {
      manager.pause();

      expect(mockContextManager.suspend).toHaveBeenCalled();
    });

    it('should resume audio context', () => {
      manager.resume();

      expect(mockContextManager.resume).toHaveBeenCalled();
    });
  });

  describe('mute control', () => {
    beforeEach(() => {
      manager.init();
    });

    it('should toggle mute', () => {
      expect(manager.isMuted()).toBe(false);

      manager.toggleMute();

      expect(mockContextManager.toggleMute).toHaveBeenCalled();
    });
  });

  describe('volume control', () => {
    beforeEach(() => {
      manager.init();
    });

    it('should set volume', () => {
      manager.setVolume(0.5);

      expect(mockContextManager.setVolume).toHaveBeenCalledWith(0.5);
    });

    it('should get volume', () => {
      mockContextManager.getVolume.mockReturnValue(0.7);

      expect(manager.getVolume()).toBe(0.7);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      manager.init();
    });

    it('should do nothing if not ready', () => {
      mockContextManager._setReady(false);

      manager.playSfx('sword_slash');
      mockContextManager._setReady(true);
      manager.playSfx('sword_slash');

      manager.update();
      // Should not throw
    });

    it('should advance SFX frame', () => {
      manager.playSfx('sword_slash');
      const initialActive = manager.isSfxPlaying('sword_slash');

      // Update multiple times to complete the SFX
      for (let i = 0; i < 20; i++) {
        manager.update();
      }

      expect(initialActive).toBe(true);
      expect(manager.isSfxPlaying('sword_slash')).toBe(false);
    });

    it('should loop looping SFX', () => {
      manager.playSfx('low_health');

      // Update many times
      for (let i = 0; i < 100; i++) {
        manager.update();
      }

      // Should still be playing
      expect(manager.isSfxPlaying('low_health')).toBe(true);
    });

    it('should remove completed non-looping SFX', () => {
      manager.playSfx('sword_slash');

      // Update until SFX completes (8 frames for sword_slash)
      for (let i = 0; i < 15; i++) {
        manager.update();
      }

      expect(manager.isSfxPlaying('sword_slash')).toBe(false);
    });
  });

  describe('isReady', () => {
    it('should return false before init', () => {
      expect(manager.isReady()).toBe(false);
    });

    it('should return true after init', () => {
      manager.init();

      expect(manager.isReady()).toBe(true);
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      manager.init();
    });

    it('should stop all active SFX', () => {
      manager.playSfx('sword_slash');
      manager.playSfx('enemy_hit');

      manager.dispose();

      expect(manager.getActiveSfxIds()).toHaveLength(0);
    });

    it('should clear current music', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      manager.playMusic('overworld');

      manager.dispose();

      expect(manager.getCurrentMusic()).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const manager1 = getAudioManager();
      const manager2 = getAudioManager();

      expect(manager1).toBe(manager2);
    });

    it('should create new instance after reset', () => {
      const manager1 = getAudioManager();
      manager1.init();

      resetAudioManager();

      const manager2 = getAudioManager();
      expect(manager1).not.toBe(manager2);
    });
  });

  describe('multi-channel SFX', () => {
    beforeEach(() => {
      manager.init();
    });

    it('should play SFX on multiple channels', () => {
      manager.playSfx('enemy_kill');

      // enemy_kill uses pulse1 and noise
      expect(mockPlayPulse).toHaveBeenCalled();
      expect(mockPlayNoise).toHaveBeenCalled();
    });

    it('should play secret_reveal on all melodic channels', () => {
      manager.playSfx('secret_reveal');

      // secret_reveal uses pulse1, pulse2, and triangle
      expect(mockPlayPulse).toHaveBeenCalled();
      expect(mockPlayTriangle).toHaveBeenCalled();
    });
  });
});
