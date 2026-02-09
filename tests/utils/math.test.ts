import { describe, it, expect } from 'vitest';
import {
  clamp,
  lerp,
  aabbOverlap,
  distanceSquared,
  distance,
  snapToGrid,
  wrap,
} from '../../src/utils/math';
import type { AABB } from '../../src/types';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('clamps to min when below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, 0, 10)).toBe(0);
  });

  it('clamps to max when above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, 0, 10)).toBe(10);
  });

  it('handles negative ranges', () => {
    expect(clamp(0, -10, -5)).toBe(-5);
    expect(clamp(-7, -10, -5)).toBe(-7);
    expect(clamp(-20, -10, -5)).toBe(-10);
  });
});

describe('lerp', () => {
  it('returns start value at t=0', () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(50, 150, 0)).toBe(50);
  });

  it('returns end value at t=1', () => {
    expect(lerp(0, 100, 1)).toBe(100);
    expect(lerp(50, 150, 1)).toBe(150);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(10, 30, 0.5)).toBe(20);
  });

  it('interpolates correctly for other t values', () => {
    expect(lerp(0, 100, 0.25)).toBe(25);
    expect(lerp(0, 100, 0.75)).toBe(75);
  });

  it('handles negative values', () => {
    expect(lerp(-100, 100, 0.5)).toBe(0);
    expect(lerp(-50, -10, 0.5)).toBe(-30);
  });

  it('extrapolates beyond 0-1 range', () => {
    expect(lerp(0, 100, 2)).toBe(200);
    expect(lerp(0, 100, -1)).toBe(-100);
  });
});

describe('aabbOverlap', () => {
  it('detects overlap when boxes intersect', () => {
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
    const b: AABB = { x: 5, y: 5, width: 10, height: 10 };
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('detects overlap when one box contains another', () => {
    const a: AABB = { x: 0, y: 0, width: 100, height: 100 };
    const b: AABB = { x: 25, y: 25, width: 10, height: 10 };
    expect(aabbOverlap(a, b)).toBe(true);
    expect(aabbOverlap(b, a)).toBe(true);
  });

  it('returns false when boxes are separate horizontally', () => {
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
    const b: AABB = { x: 20, y: 0, width: 10, height: 10 };
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('returns false when boxes are separate vertically', () => {
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
    const b: AABB = { x: 0, y: 20, width: 10, height: 10 };
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('returns false when boxes just touch edges (not overlapping)', () => {
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
    const b: AABB = { x: 10, y: 0, width: 10, height: 10 };
    expect(aabbOverlap(a, b)).toBe(false);
  });

  it('handles zero-width boxes', () => {
    // A zero-width box at x=5 is a vertical line inside box b
    // The standard AABB algorithm considers this an overlap since:
    // a.x (5) < b.x + b.width (10) AND a.x + a.width (5) > b.x (0)
    const a: AABB = { x: 5, y: 5, width: 0, height: 10 };
    const b: AABB = { x: 0, y: 0, width: 10, height: 10 };
    expect(aabbOverlap(a, b)).toBe(true);
  });
});

describe('distanceSquared', () => {
  it('returns 0 for same point', () => {
    expect(distanceSquared(5, 5, 5, 5)).toBe(0);
  });

  it('calculates squared distance correctly', () => {
    expect(distanceSquared(0, 0, 3, 4)).toBe(25); // 3^2 + 4^2 = 25
    expect(distanceSquared(0, 0, 1, 0)).toBe(1);
    expect(distanceSquared(0, 0, 0, 1)).toBe(1);
  });

  it('handles negative coordinates', () => {
    expect(distanceSquared(-3, -4, 0, 0)).toBe(25);
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance(5, 5, 5, 5)).toBe(0);
  });

  it('calculates distance correctly', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
    expect(distance(0, 0, 1, 0)).toBe(1);
  });

  it('handles negative coordinates', () => {
    expect(distance(-3, -4, 0, 0)).toBe(5);
  });
});

describe('snapToGrid', () => {
  it('snaps to nearest grid position', () => {
    expect(snapToGrid(7, 16)).toBe(0);
    expect(snapToGrid(8, 16)).toBe(16);
    expect(snapToGrid(15, 16)).toBe(16);
    expect(snapToGrid(16, 16)).toBe(16);
    expect(snapToGrid(24, 16)).toBe(32);
  });

  it('handles values already on grid', () => {
    expect(snapToGrid(0, 16)).toBe(0);
    expect(snapToGrid(32, 16)).toBe(32);
  });

  it('handles negative values', () => {
    // Math.round(-0.5) rounds to 0 in JavaScript (banker's rounding towards zero)
    expect(snapToGrid(-7, 16)).toBe(0);
    expect(snapToGrid(-8, 16)).toBe(0); // -0.5 rounds to 0, not -1
    expect(snapToGrid(-9, 16)).toBe(-16); // -0.5625 rounds to -1
    expect(snapToGrid(-16, 16)).toBe(-16);
  });
});

describe('wrap', () => {
  it('returns value when in range', () => {
    expect(wrap(5, 10)).toBe(5);
    expect(wrap(0, 10)).toBe(0);
  });

  it('wraps values above max', () => {
    expect(wrap(10, 10)).toBe(0);
    expect(wrap(12, 10)).toBe(2);
    expect(wrap(25, 10)).toBe(5);
  });

  it('wraps negative values', () => {
    expect(wrap(-1, 10)).toBe(9);
    expect(wrap(-5, 10)).toBe(5);
    expect(wrap(-12, 10)).toBe(8);
  });
});
