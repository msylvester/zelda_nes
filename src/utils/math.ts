// math.ts - Mathematical utility functions
import type { AABB } from '../types';

/**
 * Clamps a value between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Linear interpolation between two values.
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor (0-1)
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Checks if two axis-aligned bounding boxes overlap.
 * Returns true if the boxes overlap, false otherwise.
 */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Calculates the squared distance between two points.
 * Useful for distance comparisons without the sqrt cost.
 */
export function distanceSquared(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Calculates the distance between two points.
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(distanceSquared(x1, y1, x2, y2));
}

/**
 * Snaps a value to the nearest multiple of grid size.
 */
export function snapToGrid(value: number, gridSize: number): number {
  const result = Math.round(value / gridSize) * gridSize;
  // Normalize -0 to 0
  return result === 0 ? 0 : result;
}

/**
 * Wraps a value within a range [0, max).
 */
export function wrap(value: number, max: number): number {
  return ((value % max) + max) % max;
}
