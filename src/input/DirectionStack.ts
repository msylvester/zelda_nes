// DirectionStack.ts - Direction priority resolution for movement input
import type { Direction } from '../types';

/**
 * Maintains an ordered stack of currently-held direction keys.
 * The active direction is always the top of the stack (most recently pressed).
 *
 * This handles the case where multiple directions are pressed simultaneously:
 * - Opposing directions: most recently pressed wins
 * - Perpendicular directions: most recently pressed wins
 * - Single direction: that direction is active
 * - No direction: returns null (Link stops but retains facing)
 */
export class DirectionStack {
  private stack: Direction[] = [];

  /**
   * Push a direction when its key is pressed.
   * Removes any existing occurrence first to prevent duplicates.
   */
  push(dir: Direction): void {
    this.remove(dir);
    this.stack.push(dir);
  }

  /**
   * Remove a direction when its key is released.
   */
  remove(dir: Direction): void {
    this.stack = this.stack.filter((d) => d !== dir);
  }

  /**
   * Get the currently active direction (top of stack).
   * Returns null if no direction keys are held.
   */
  current(): Direction | null {
    if (this.stack.length === 0) return null;
    const last = this.stack[this.stack.length - 1];
    return last !== undefined ? last : null;
  }

  /**
   * Clear all directions (e.g., on window blur).
   */
  clear(): void {
    this.stack = [];
  }

  /**
   * Check if a specific direction is currently in the stack.
   */
  has(dir: Direction): boolean {
    return this.stack.includes(dir);
  }

  /**
   * Get all currently held directions.
   */
  getAll(): readonly Direction[] {
    return [...this.stack];
  }

  /**
   * Get the number of directions currently held.
   */
  get size(): number {
    return this.stack.length;
  }
}
