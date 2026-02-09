// GameStateManager.ts - Game phase transitions and runtime state
import type { GamePhase, InputSnapshot } from '../types';

/**
 * Manages the current game phase and handles phase transitions.
 * Only the Start button pause toggle is handled here; other transitions
 * are triggered externally by game systems.
 */
export class GameStateManager {
  public phase: GamePhase = 'TITLE';
  public frameCounter: number = 0;
  private previousPhase: GamePhase = 'TITLE';

  /**
   * Transitions to a new game phase, storing the previous phase.
   */
  setPhase(newPhase: GamePhase): void {
    this.previousPhase = this.phase;
    this.phase = newPhase;
  }

  /**
   * Returns the phase that was active before the current one.
   */
  getPreviousPhase(): GamePhase {
    return this.previousPhase;
  }

  /**
   * Handles automatic phase transitions based on input.
   * Currently handles Start button for pause toggle.
   */
  processPhaseTransitions(input: InputSnapshot): void {
    // Handle Start button for pause toggle
    if (this.phase === 'GAMEPLAY' && input.buttons.START.justPressed) {
      this.setPhase('PAUSE');
      return;
    }
    if (this.phase === 'PAUSE' && input.buttons.START.justPressed) {
      this.setPhase('GAMEPLAY');
      return;
    }
  }

  /**
   * Increments the frame counter. Called once per logical tick.
   */
  incrementFrameCounter(): void {
    this.frameCounter++;
  }

  /**
   * Resets the frame counter (e.g., on phase change if needed).
   */
  resetFrameCounter(): void {
    this.frameCounter = 0;
  }

  /**
   * Checks if the game is in a playable state (not in menus/transitions).
   */
  isPlayable(): boolean {
    return this.phase === 'GAMEPLAY';
  }

  /**
   * Checks if the game should pause all gameplay logic.
   */
  isPaused(): boolean {
    return this.phase === 'PAUSE';
  }

  /**
   * Checks if the game is in a transition state.
   */
  isTransitioning(): boolean {
    return this.phase === 'TRANSITION' || this.phase === 'DEATH' || this.phase === 'ITEM_PICKUP';
  }
}
