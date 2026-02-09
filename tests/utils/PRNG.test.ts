import { describe, it, expect, beforeEach } from 'vitest';
import {
  PRNG,
  getGlobalPRNG,
  setGlobalSeed,
  random,
  randomInt,
  randomPick,
} from '../../src/utils/PRNG';

describe('PRNG', () => {
  describe('determinism', () => {
    it('produces same sequence with same seed', () => {
      const prng1 = new PRNG(12345);
      const prng2 = new PRNG(12345);

      const seq1 = [prng1.next(), prng1.next(), prng1.next()];
      const seq2 = [prng2.next(), prng2.next(), prng2.next()];

      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences with different seeds', () => {
      const prng1 = new PRNG(12345);
      const prng2 = new PRNG(54321);

      const val1 = prng1.next();
      const val2 = prng2.next();

      expect(val1).not.toBe(val2);
    });

    it('can save and restore state', () => {
      const prng = new PRNG(42);
      prng.next(); // Advance state
      prng.next();

      const savedSeed = prng.getSeed();
      const val1 = prng.next();

      prng.setSeed(savedSeed);
      const val2 = prng.next();

      expect(val1).toBe(val2);
    });
  });

  describe('next()', () => {
    it('returns values in range [0, 1)', () => {
      const prng = new PRNG(999);
      for (let i = 0; i < 1000; i++) {
        const val = prng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('nextRange()', () => {
    it('returns values in specified range', () => {
      const prng = new PRNG(777);
      for (let i = 0; i < 100; i++) {
        const val = prng.nextRange(10, 20);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThan(20);
      }
    });

    it('handles negative ranges', () => {
      const prng = new PRNG(888);
      for (let i = 0; i < 100; i++) {
        const val = prng.nextRange(-50, -10);
        expect(val).toBeGreaterThanOrEqual(-50);
        expect(val).toBeLessThan(-10);
      }
    });
  });

  describe('nextIntRange()', () => {
    it('returns integers in specified range (inclusive)', () => {
      const prng = new PRNG(123);
      const results = new Set<number>();

      for (let i = 0; i < 1000; i++) {
        const val = prng.nextIntRange(1, 6);
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
        results.add(val);
      }

      // Should eventually hit all values 1-6
      expect(results.size).toBe(6);
    });
  });

  describe('chance()', () => {
    it('returns boolean', () => {
      const prng = new PRNG(555);
      const result = prng.chance(0.5);
      expect(typeof result).toBe('boolean');
    });

    it('always returns true for probability 1', () => {
      const prng = new PRNG(111);
      for (let i = 0; i < 100; i++) {
        expect(prng.chance(1)).toBe(true);
      }
    });

    it('always returns false for probability 0', () => {
      const prng = new PRNG(222);
      for (let i = 0; i < 100; i++) {
        expect(prng.chance(0)).toBe(false);
      }
    });
  });

  describe('pick()', () => {
    it('returns element from array', () => {
      const prng = new PRNG(333);
      const array = ['a', 'b', 'c', 'd', 'e'];

      for (let i = 0; i < 100; i++) {
        const result = prng.pick(array);
        expect(array).toContain(result);
      }
    });

    it('throws on empty array', () => {
      const prng = new PRNG(444);
      expect(() => prng.pick([])).toThrow('Cannot pick from empty array');
    });

    it('returns the only element from single-element array', () => {
      const prng = new PRNG(555);
      expect(prng.pick(['only'])).toBe('only');
    });
  });

  describe('shuffle()', () => {
    it('shuffles array in place', () => {
      const prng = new PRNG(666);
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const array = [...original];

      const result = prng.shuffle(array);

      // Same reference returned
      expect(result).toBe(array);

      // Same elements, different order (very unlikely to be identical)
      expect(array.sort()).toEqual(original.sort());
    });

    it('deterministically shuffles with same seed', () => {
      const prng1 = new PRNG(777);
      const prng2 = new PRNG(777);

      const arr1 = [1, 2, 3, 4, 5];
      const arr2 = [1, 2, 3, 4, 5];

      prng1.shuffle(arr1);
      prng2.shuffle(arr2);

      expect(arr1).toEqual(arr2);
    });
  });
});

describe('global PRNG functions', () => {
  beforeEach(() => {
    setGlobalSeed(42);
  });

  it('random() returns values in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const val = random();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('randomInt() returns integers in range', () => {
    for (let i = 0; i < 100; i++) {
      const val = randomInt(1, 10);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it('randomPick() picks from array', () => {
    const choices = ['red', 'green', 'blue'];
    for (let i = 0; i < 100; i++) {
      const val = randomPick(choices);
      expect(choices).toContain(val);
    }
  });

  it('setGlobalSeed() produces deterministic sequence', () => {
    setGlobalSeed(12345);
    const seq1 = [random(), random(), random()];

    setGlobalSeed(12345);
    const seq2 = [random(), random(), random()];

    expect(seq1).toEqual(seq2);
  });

  it('getGlobalPRNG() returns the global instance', () => {
    const prng = getGlobalPRNG();
    expect(prng).toBeInstanceOf(PRNG);
  });
});
