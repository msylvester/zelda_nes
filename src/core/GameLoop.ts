// GameLoop.ts - Fixed-timestep game loop at 60 FPS
import { TARGET_FPS, MAX_FRAME_SKIP } from '../constants';
import type { InputSnapshot } from '../types';
import type { GameStateManager } from './GameStateManager';

/**
 * Interface for systems that the game loop needs to interact with.
 * This allows the loop to be configured with different system implementations.
 */
export interface GameLoopSystems {
  inputSystem: {
    poll(): InputSnapshot;
  };
  gameStateManager: GameStateManager;
}

/**
 * Callback signature for the per-frame update function.
 * The game loop calls this with the input snapshot for each logical tick.
 */
export type GameLoopUpdateFn = (input: InputSnapshot) => void;

/**
 * Fixed-timestep game loop running at 60 FPS.
 * Uses requestAnimationFrame for rendering synchronization
 * and accumulator-based timing for consistent gameplay.
 */
export class GameLoop {
  private systems: GameLoopSystems;
  private updateFn: GameLoopUpdateFn;
  private lastTimestamp: number = 0;
  private accumulator: number = 0;
  private running: boolean = false;
  private animationFrameId: number | null = null;

  // Timing constants (can be configured for testing)
  private targetFps: number;
  private frameDuration: number;
  private maxFrameSkip: number;

  constructor(
    systems: GameLoopSystems,
    updateFn: GameLoopUpdateFn,
    options?: {
      targetFps?: number;
      maxFrameSkip?: number;
    }
  ) {
    this.systems = systems;
    this.updateFn = updateFn;
    this.targetFps = options?.targetFps ?? TARGET_FPS;
    this.frameDuration = 1000 / this.targetFps;
    this.maxFrameSkip = options?.maxFrameSkip ?? MAX_FRAME_SKIP;
  }

  /**
   * Starts the game loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.accumulator = 0;
    this.scheduleFrame();
  }

  /**
   * Stops the game loop.
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Returns whether the loop is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Schedules the next frame via requestAnimationFrame.
   */
  private scheduleFrame(): void {
    if (!this.running) return;
    this.animationFrameId = requestAnimationFrame((timestamp) =>
      this.loop(timestamp)
    );
  }

  /**
   * Main loop function called by requestAnimationFrame.
   */
  private loop(timestamp: number): void {
    if (!this.running) return;

    const delta = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.accumulator += delta;

    // Process fixed-timestep updates
    let framesProcessed = 0;
    while (
      this.accumulator >= this.frameDuration &&
      framesProcessed < this.maxFrameSkip
    ) {
      this.tick();
      this.accumulator -= this.frameDuration;
      framesProcessed++;
    }

    // If we're too far behind, discard accumulated time to prevent spiral of death
    if (this.accumulator > this.frameDuration * this.maxFrameSkip) {
      this.accumulator = 0;
    }

    this.scheduleFrame();
  }

  /**
   * Single logical game tick (one frame of game logic).
   */
  private tick(): void {
    // 1. Poll input - produce frozen InputSnapshot for this frame
    const input = this.systems.inputSystem.poll();

    // 2. Process automatic phase transitions (e.g., pause toggle)
    this.systems.gameStateManager.processPhaseTransitions(input);

    // 3. Call the update function with the input
    this.updateFn(input);

    // 4. Increment frame counter (only during gameplay phases where it matters)
    if (this.systems.gameStateManager.isPlayable()) {
      this.systems.gameStateManager.incrementFrameCounter();
    }
  }

  /**
   * Manually run a single tick (useful for testing).
   */
  manualTick(): void {
    this.tick();
  }

  /**
   * Get timing statistics for debugging.
   */
  getStats(): { targetFps: number; frameDuration: number; accumulator: number } {
    return {
      targetFps: this.targetFps,
      frameDuration: this.frameDuration,
      accumulator: this.accumulator,
    };
  }
}
