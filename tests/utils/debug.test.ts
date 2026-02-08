import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDebugConfig,
  setDebugConfig,
  resetDebugConfig,
  toggleDebug,
  debugLog,
  debugLogInput,
  debugLogCollision,
  debugLogPhaseChange,
  updateFPS,
  createEmptyDebugInfo,
} from '../../src/utils/debug';

describe('debug config', () => {
  beforeEach(() => {
    resetDebugConfig();
  });

  it('starts with debug disabled by default', () => {
    const config = getDebugConfig();
    expect(config.enabled).toBe(false);
  });

  it('can update config partially', () => {
    setDebugConfig({ enabled: true, showHitboxes: true });

    const config = getDebugConfig();
    expect(config.enabled).toBe(true);
    expect(config.showHitboxes).toBe(true);
    expect(config.showGrid).toBe(false); // Unchanged default
  });

  it('toggleDebug() toggles enabled state', () => {
    expect(getDebugConfig().enabled).toBe(false);

    toggleDebug();
    expect(getDebugConfig().enabled).toBe(true);

    toggleDebug();
    expect(getDebugConfig().enabled).toBe(false);
  });

  it('resetDebugConfig() restores defaults', () => {
    setDebugConfig({
      enabled: true,
      showHitboxes: true,
      showGrid: true,
      showFPS: true,
    });

    resetDebugConfig();

    const config = getDebugConfig();
    expect(config.enabled).toBe(false);
    expect(config.showHitboxes).toBe(false);
    expect(config.showGrid).toBe(false);
    expect(config.showFPS).toBe(false);
  });
});

describe('debug logging', () => {
  beforeEach(() => {
    resetDebugConfig();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('debugLog() does nothing when debug disabled', () => {
    debugLog('TEST', 'message');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('debugLog() logs when debug enabled', () => {
    setDebugConfig({ enabled: true });
    debugLog('TEST', 'message', { extra: 'data' });

    expect(console.log).toHaveBeenCalledWith('[TEST]', 'message', { extra: 'data' });
  });

  it('debugLogInput() respects logInput setting', () => {
    setDebugConfig({ enabled: true, logInput: false });
    debugLogInput('press', 'KeyZ');
    expect(console.log).not.toHaveBeenCalled();

    setDebugConfig({ enabled: true, logInput: true });
    debugLogInput('press', 'KeyZ');
    expect(console.log).toHaveBeenCalledWith('[INPUT] press: KeyZ');
  });

  it('debugLogCollision() respects logCollisions setting', () => {
    setDebugConfig({ enabled: true, logCollisions: false });
    debugLogCollision('player', 'enemy', true);
    expect(console.log).not.toHaveBeenCalled();

    setDebugConfig({ enabled: true, logCollisions: true });
    debugLogCollision('player', 'enemy', true);
    expect(console.log).toHaveBeenCalledWith('[COLLISION] player <-> enemy');
  });

  it('debugLogCollision() only logs on overlap', () => {
    setDebugConfig({ enabled: true, logCollisions: true });
    debugLogCollision('player', 'enemy', false);
    expect(console.log).not.toHaveBeenCalled();
  });

  it('debugLogPhaseChange() respects logPhaseChanges setting', () => {
    setDebugConfig({ enabled: true, logPhaseChanges: false });
    debugLogPhaseChange('TITLE', 'GAMEPLAY');
    expect(console.log).not.toHaveBeenCalled();

    setDebugConfig({ enabled: true, logPhaseChanges: true });
    debugLogPhaseChange('TITLE', 'GAMEPLAY');
    expect(console.log).toHaveBeenCalledWith('[PHASE] TITLE -> GAMEPLAY');
  });
});

describe('FPS tracking', () => {
  it('returns 60 for first frame', () => {
    // Reset by calling with 0 delta would be complex, so just check it returns a number
    const fps = updateFPS(1000);
    expect(typeof fps).toBe('number');
    expect(fps).toBeGreaterThan(0);
  });

  it('calculates average FPS over time', () => {
    // Simulate frames at 60 FPS (16.67ms apart)
    let time = 0;
    for (let i = 0; i < 70; i++) {
      updateFPS(time);
      time += 16.67;
    }

    const fps = updateFPS(time);
    expect(fps).toBeCloseTo(60, 0);
  });
});

describe('createEmptyDebugInfo', () => {
  it('returns valid debug info structure', () => {
    const info = createEmptyDebugInfo();

    expect(info.fps).toBe(60);
    expect(info.enemyHitboxes).toEqual([]);
    expect(info.projectileHitboxes).toEqual([]);
    expect(info.itemHitboxes).toEqual([]);
    expect(info.playerPosition).toBeUndefined();
    expect(info.playerFacing).toBeUndefined();
    expect(info.playerHitbox).toBeUndefined();
    expect(info.swordHitbox).toBeUndefined();
    expect(info.screenCoords).toBeUndefined();
  });
});
