// InputSystem.ts - Keyboard polling and input snapshot generation
import type { ButtonState, Direction, InputSnapshot, NesButton } from '../types';
import { DirectionStack } from './DirectionStack';
import {
  DEFAULT_INPUT_MAPPING,
  NES_BUTTONS,
  buttonToDirection,
  getMappedKeys,
  keyCodeToButton,
  type InputMapping,
} from './InputMapping';

/**
 * Creates an empty button record with all buttons set to default state.
 */
function createEmptyButtonRecord(): Record<NesButton, boolean> {
  return {
    UP: false,
    DOWN: false,
    LEFT: false,
    RIGHT: false,
    A: false,
    B: false,
    START: false,
    SELECT: false,
  };
}

/**
 * Configuration options for InputSystem
 */
export interface InputSystemOptions {
  /** Input mapping (defaults to DEFAULT_INPUT_MAPPING) */
  mapping?: InputMapping;
  /** Whether to register DOM event listeners (false for testing) */
  registerListeners?: boolean;
}

/**
 * The InputSystem handles keyboard input and produces InputSnapshots.
 *
 * Key features:
 * - Polls keyboard state once per frame
 * - Maps physical keys to NES buttons
 * - Tracks button edge transitions (justPressed, justReleased)
 * - Maintains direction priority via DirectionStack
 * - Handles window blur to prevent stuck keys
 * - Prevents browser defaults for mapped keys
 */
export class InputSystem {
  /** Raw key states from browser events */
  private keysHeld: Set<string> = new Set();

  /** Previous frame's button held states (for edge detection) */
  private previousButtons: Record<NesButton, boolean>;

  /** Direction priority stack */
  private directionStack: DirectionStack = new DirectionStack();

  /** Persistent facing direction */
  private facingDirection: Direction = 'DOWN';

  /** Key-to-button mapping */
  private mapping: InputMapping;

  /** Set of all mapped key codes for preventDefault */
  private mappedKeys: Set<string>;

  /** Frame counter for snapshots */
  private frameNumber: number = 0;

  /** Whether event listeners have been registered */
  private listenersRegistered: boolean = false;

  constructor(options: InputSystemOptions = {}) {
    const { mapping = DEFAULT_INPUT_MAPPING, registerListeners = true } =
      options;
    this.mapping = mapping;
    this.mappedKeys = getMappedKeys(mapping);
    this.previousButtons = createEmptyButtonRecord();

    // Only register listeners in browser environment
    if (registerListeners && typeof window !== 'undefined') {
      this.registerEventListeners();
    }
  }

  /**
   * Poll the current input state and produce a frozen InputSnapshot.
   * Called once per frame at the start of the game loop.
   */
  poll(): InputSnapshot {
    this.frameNumber++;
    const currentButtons = this.mapKeysToButtons();

    const snapshot: InputSnapshot = {
      buttons: {} as Record<NesButton, ButtonState>,
      activeDirection: this.directionStack.current(),
      facingDirection: this.facingDirection,
      frameNumber: this.frameNumber,
    };

    // Compute edge-triggered button states
    for (const button of NES_BUTTONS) {
      const held = currentButtons[button];
      const wasHeld = this.previousButtons[button];
      snapshot.buttons[button] = {
        held,
        justPressed: held && !wasHeld,
        justReleased: !held && wasHeld,
      };
    }

    // Update facing direction if there's an active direction
    if (snapshot.activeDirection !== null) {
      this.facingDirection = snapshot.activeDirection;
      snapshot.facingDirection = this.facingDirection;
    }

    // Store current state for next frame's edge detection
    this.previousButtons = currentButtons;

    return snapshot;
  }

  /**
   * Check if a specific key code is mapped.
   */
  private isMappedKey(keyCode: string): boolean {
    return this.mappedKeys.has(keyCode);
  }

  /**
   * Map raw held keys to logical NES button states.
   */
  private mapKeysToButtons(): Record<NesButton, boolean> {
    const buttons = createEmptyButtonRecord();

    for (const keyCode of this.keysHeld) {
      const button = keyCodeToButton(keyCode, this.mapping);
      if (button !== null) {
        buttons[button] = true;
      }
    }

    return buttons;
  }

  /**
   * Convert a key code to a direction (if it's a direction key).
   */
  private keyToDirection(keyCode: string): Direction | null {
    const button = keyCodeToButton(keyCode, this.mapping);
    if (button === null) return null;
    return buttonToDirection(button);
  }

  /**
   * Register keyboard event listeners.
   * Only called in browser environment.
   */
  private registerEventListeners(): void {
    if (this.listenersRegistered) return;
    this.listenersRegistered = true;

    // Handle keydown
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore browser key repeat events
      if (e.repeat) return;

      // Prevent browser defaults for mapped keys
      if (this.isMappedKey(e.code)) {
        e.preventDefault();
      }

      // Track the key as held
      this.keysHeld.add(e.code);

      // Update direction stack for direction keys
      const dir = this.keyToDirection(e.code);
      if (dir !== null) {
        this.directionStack.push(dir);
      }
    });

    // Handle keyup
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      // Remove from held set
      this.keysHeld.delete(e.code);

      // Update direction stack
      const dir = this.keyToDirection(e.code);
      if (dir !== null) {
        this.directionStack.remove(dir);
      }
    });

    // Handle window blur (tab loses focus)
    window.addEventListener('blur', () => {
      // Clear all held keys to prevent stuck keys
      this.keysHeld.clear();
      this.directionStack.clear();
      // Note: Auto-pause is handled by GameStateManager via EventBus
    });
  }

  /**
   * Get the current facing direction.
   */
  getFacingDirection(): Direction {
    return this.facingDirection;
  }

  /**
   * Get the current active direction (for external queries).
   */
  getActiveDirection(): Direction | null {
    return this.directionStack.current();
  }

  /**
   * Manually clear all input state.
   * Useful for testing or forced state reset.
   */
  clearState(): void {
    this.keysHeld.clear();
    this.directionStack.clear();
    this.previousButtons = createEmptyButtonRecord();
  }

  /**
   * Update the input mapping at runtime.
   */
  setMapping(mapping: InputMapping): void {
    this.mapping = mapping;
    this.mappedKeys = getMappedKeys(mapping);
  }

  /**
   * Get the current mapping.
   */
  getMapping(): InputMapping {
    return this.mapping;
  }

  /**
   * Simulate a key press (for testing).
   */
  simulateKeyDown(keyCode: string): void {
    this.keysHeld.add(keyCode);
    const dir = this.keyToDirection(keyCode);
    if (dir !== null) {
      this.directionStack.push(dir);
    }
  }

  /**
   * Simulate a key release (for testing).
   */
  simulateKeyUp(keyCode: string): void {
    this.keysHeld.delete(keyCode);
    const dir = this.keyToDirection(keyCode);
    if (dir !== null) {
      this.directionStack.remove(dir);
    }
  }
}
