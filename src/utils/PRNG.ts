// PRNG.ts - Deterministic seeded pseudo-random number generator
// Uses a Linear Congruential Generator (LCG) for NES-era style determinism

/**
 * A deterministic pseudo-random number generator with seed support.
 * Useful for reproducible random sequences (e.g., procedural generation, replays).
 */
export class PRNG {
  private state: number;

  // LCG parameters (same as MINSTD)
  private static readonly A = 48271;
  private static readonly M = 2147483647; // 2^31 - 1 (Mersenne prime)

  /**
   * Creates a new PRNG with the given seed.
   * @param seed Initial seed value (default: current timestamp)
   */
  constructor(seed?: number) {
    this.state = this.sanitizeSeed(seed ?? Date.now());
  }

  /**
   * Ensures the seed is a valid positive integer within range.
   */
  private sanitizeSeed(seed: number): number {
    // Force to positive integer
    let s = Math.abs(Math.floor(seed)) % PRNG.M;
    // Avoid zero (would produce all zeros)
    if (s === 0) s = 1;
    return s;
  }

  /**
   * Returns the current seed/state (for saving/restoring).
   */
  getSeed(): number {
    return this.state;
  }

  /**
   * Sets a new seed, resetting the generator state.
   */
  setSeed(seed: number): void {
    this.state = this.sanitizeSeed(seed);
  }

  /**
   * Generates the next random integer in the sequence.
   * @returns Integer in range [1, 2^31 - 2]
   */
  nextInt(): number {
    this.state = (PRNG.A * this.state) % PRNG.M;
    return this.state;
  }

  /**
   * Generates a random float in range [0, 1).
   */
  next(): number {
    return (this.nextInt() - 1) / (PRNG.M - 1);
  }

  /**
   * Generates a random float in range [min, max).
   */
  nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates a random integer in range [min, max] (inclusive).
   */
  nextIntRange(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /**
   * Returns true with the given probability (0-1).
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Picks a random element from an array.
   */
  pick<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    const index = Math.floor(this.next() * array.length);
    return array[index] as T;
  }

  /**
   * Shuffles an array in place using Fisher-Yates algorithm.
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = array[i] as T;
      array[i] = array[j] as T;
      array[j] = temp;
    }
    return array;
  }
}

// Default global instance for convenience
let globalPRNG = new PRNG();

/**
 * Gets the global PRNG instance.
 */
export function getGlobalPRNG(): PRNG {
  return globalPRNG;
}

/**
 * Resets the global PRNG with a new seed.
 */
export function setGlobalSeed(seed: number): void {
  globalPRNG = new PRNG(seed);
}

/**
 * Convenience: get random float [0, 1) from global PRNG.
 */
export function random(): number {
  return globalPRNG.next();
}

/**
 * Convenience: get random int in range from global PRNG.
 */
export function randomInt(min: number, max: number): number {
  return globalPRNG.nextIntRange(min, max);
}

/**
 * Convenience: pick random element from global PRNG.
 */
export function randomPick<T>(array: readonly T[]): T {
  return globalPRNG.pick(array);
}
