// GameLoop unit tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameLoop } from '../../src/core/GameLoop';
import { GameStateManager } from '../../src/core/GameStateManager';
import type { InputSnapshot, ButtonState, NesButton } from '../../src/types';

// Helper to create a mock InputSnapshot
function createInputSnapshot(): InputSnapshot {
  const buttons = {} as Record<NesButton, ButtonState>;
  const nesButtons: NesButton[] = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];

  for (const button of nesButtons) {
    buttons[button] = {
      held: false,
      justPressed: false,
      justReleased: false,
    };
  }

  return {
    buttons,
    activeDirection: null,
    facingDirection: 'DOWN',
    frameNumber: 1,
  };
}

describe('GameLoop', () => {
  let gameStateManager: GameStateManager;
  let mockInputSystem: { poll: () => InputSnapshot };
  let updateFn: ReturnType<typeof vi.fn>;
  let gameLoop: GameLoop;
  let rafCallbacks: Map<number, (time: number) => void>;
  let rafId: number;
  let mockPerformanceNow: number;

  beforeEach(() => {
    rafCallbacks = new Map();
    rafId = 0;
    mockPerformanceNow = 0;

    // Mock performance.now
    vi.spyOn(performance, 'now').mockImplementation(() => mockPerformanceNow);

    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => {
      const id = ++rafId;
      rafCallbacks.set(id, callback);
      return id;
    });

    // Mock cancelAnimationFrame
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks.delete(id);
    });

    gameStateManager = new GameStateManager();
    mockInputSystem = {
      poll: vi.fn(() => createInputSnapshot()),
    };
    updateFn = vi.fn();

    gameLoop = new GameLoop(
      {
        inputSystem: mockInputSystem,
        gameStateManager,
      },
      updateFn
    );
  });

  afterEach(() => {
    gameLoop.stop();
    vi.restoreAllMocks();
  });

  // Helper to advance RAF - simulates the browser calling the RAF callback
  function advanceRaf(timestampDelta: number): void {
    const newTime = mockPerformanceNow + timestampDelta;
    mockPerformanceNow = newTime;
    const callbacks = [...rafCallbacks.entries()];
    rafCallbacks.clear();
    for (const [, callback] of callbacks) {
      callback(newTime);
    }
  }

  describe('start', () => {
    it('begins the loop', () => {
      gameLoop.start();
      expect(gameLoop.isRunning()).toBe(true);
    });

    it('schedules a requestAnimationFrame', () => {
      gameLoop.start();
      expect(rafCallbacks.size).toBe(1);
    });

    it('does nothing if already running', () => {
      gameLoop.start();
      const initialCallbackCount = rafCallbacks.size;

      gameLoop.start();
      expect(rafCallbacks.size).toBe(initialCallbackCount);
    });
  });

  describe('stop', () => {
    it('stops the loop', () => {
      gameLoop.start();
      gameLoop.stop();
      expect(gameLoop.isRunning()).toBe(false);
    });

    it('cancels pending animation frame', () => {
      gameLoop.start();
      expect(rafCallbacks.size).toBe(1);

      gameLoop.stop();
      expect(rafCallbacks.size).toBe(0);
    });
  });

  describe('fixed timestep', () => {
    it('executes tick when enough time has passed (16.67ms)', () => {
      gameLoop.start();

      // Advance slightly less than one frame - should not tick
      advanceRaf(10);
      expect(updateFn).not.toHaveBeenCalled();

      // Advance past one frame total (10 + 10 = 20ms > 16.67ms)
      advanceRaf(10);
      expect(updateFn).toHaveBeenCalledTimes(1);
    });

    it('executes multiple ticks if behind', () => {
      gameLoop.start();

      // Advance enough for 3 frames at once (51ms / 16.67ms = 3.06 > 3 frames)
      advanceRaf(51);
      expect(updateFn).toHaveBeenCalledTimes(3);
    });

    it('respects max frame skip', () => {
      gameLoop.start();

      // Advance enough for way more than max frames (200ms = ~12 frames)
      // Default max skip is 3, so only 3 should execute
      advanceRaf(200);
      expect(updateFn).toHaveBeenCalledTimes(3);
    });

    it('discards accumulated time when too far behind', () => {
      gameLoop.start();

      // Get very far behind
      advanceRaf(200);
      expect(updateFn).toHaveBeenCalledTimes(3); // max skip

      updateFn.mockClear();

      // After accumulator reset, next frame should work normally with ~17ms
      advanceRaf(17);
      expect(updateFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('manualTick', () => {
    it('runs a single tick without the RAF loop', () => {
      gameLoop.manualTick();
      expect(mockInputSystem.poll).toHaveBeenCalledTimes(1);
      expect(updateFn).toHaveBeenCalledTimes(1);
    });

    it('processes phase transitions', () => {
      // Set up to test pause toggle
      gameStateManager.setPhase('GAMEPLAY');

      // Mock input with START just pressed
      const startPressedInput = createInputSnapshot();
      startPressedInput.buttons.START.justPressed = true;
      (mockInputSystem.poll as ReturnType<typeof vi.fn>).mockReturnValueOnce(startPressedInput);

      gameLoop.manualTick();

      expect(gameStateManager.phase).toBe('PAUSE');
    });

    it('increments frame counter during gameplay', () => {
      gameStateManager.setPhase('GAMEPLAY');
      expect(gameStateManager.frameCounter).toBe(0);

      gameLoop.manualTick();

      expect(gameStateManager.frameCounter).toBe(1);
    });

    it('does not increment frame counter when not in gameplay', () => {
      expect(gameStateManager.frameCounter).toBe(0);

      gameLoop.manualTick(); // TITLE phase

      expect(gameStateManager.frameCounter).toBe(0);
    });
  });

  describe('getStats', () => {
    it('returns timing information', () => {
      const stats = gameLoop.getStats();

      expect(stats.targetFps).toBe(60);
      expect(stats.frameDuration).toBeCloseTo(16.667, 2);
      expect(stats.accumulator).toBe(0);
    });
  });

  describe('custom options', () => {
    it('allows custom target FPS', () => {
      const customLoop = new GameLoop(
        { inputSystem: mockInputSystem, gameStateManager },
        updateFn,
        { targetFps: 30 }
      );

      const stats = customLoop.getStats();
      expect(stats.targetFps).toBe(30);
      expect(stats.frameDuration).toBeCloseTo(33.333, 2);
    });

    it('allows custom max frame skip', () => {
      const customLoop = new GameLoop(
        { inputSystem: mockInputSystem, gameStateManager },
        updateFn,
        { maxFrameSkip: 1 }
      );

      customLoop.start();
      advanceRaf(100); // Would be ~6 frames at 60fps

      // With maxFrameSkip of 1, only 1 tick should run
      expect(updateFn).toHaveBeenCalledTimes(1);

      customLoop.stop();
    });
  });

  describe('update function receives correct input', () => {
    it('passes the polled input to the update function', () => {
      const customInput = createInputSnapshot();
      customInput.activeDirection = 'UP';
      customInput.buttons.A.justPressed = true;
      (mockInputSystem.poll as ReturnType<typeof vi.fn>).mockReturnValueOnce(customInput);

      gameLoop.manualTick();

      expect(updateFn).toHaveBeenCalledWith(customInput);
    });
  });

  describe('continuous operation', () => {
    it('continues scheduling frames after processing', () => {
      gameLoop.start();
      expect(rafCallbacks.size).toBe(1);

      advanceRaf(17); // Trigger one frame
      expect(updateFn).toHaveBeenCalledTimes(1);

      // Should have scheduled another frame
      expect(rafCallbacks.size).toBe(1);

      advanceRaf(17); // Trigger another frame
      expect(updateFn).toHaveBeenCalledTimes(2);
    });

    it('stops scheduling frames after stop is called', () => {
      gameLoop.start();
      advanceRaf(17);
      expect(rafCallbacks.size).toBe(1);

      gameLoop.stop();
      expect(rafCallbacks.size).toBe(0);

      // No more updates should happen
      updateFn.mockClear();
      advanceRaf(17);
      expect(updateFn).not.toHaveBeenCalled();
    });
  });
});
