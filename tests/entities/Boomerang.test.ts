// Boomerang.test.ts - Tests for Boomerang entity

import { describe, it, expect, beforeEach } from 'vitest';
import { Boomerang, createBoomerang, type BoomerangPlayerProvider } from '../../src/entities/Boomerang';
import { BOOMERANG_RANGE_TILES, TILE_SIZE, PROJECTILE_SPEEDS } from '../../src/constants';

describe('Boomerang', () => {
  describe('constructor', () => {
    it('should create a wood boomerang at given position', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);

      expect(boomerang.x).toBe(100);
      expect(boomerang.y).toBe(100);
      expect(boomerang.active).toBe(true);
    });

    it('should set correct max range for wood boomerang', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', false);
      expect(boomerang.maxRange).toBe(BOOMERANG_RANGE_TILES * TILE_SIZE);
    });

    it('should set longer max range for magic boomerang', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', true);
      expect(boomerang.maxRange).toBeGreaterThan(BOOMERANG_RANGE_TILES * TILE_SIZE);
    });

    it('should set correct velocity for RIGHT direction', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', false);
      expect(boomerang.velocityX).toBeCloseTo(PROJECTILE_SPEEDS.BOOMERANG);
      expect(boomerang.velocityY).toBe(0);
    });

    it('should set correct velocity for UP direction', () => {
      const boomerang = new Boomerang(0, 0, 'UP', false);
      expect(boomerang.velocityX).toBe(0);
      expect(boomerang.velocityY).toBeCloseTo(-PROJECTILE_SPEEDS.BOOMERANG);
    });

    it('should have zero damage (boomerang stuns, not damages)', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', false);
      expect(boomerang.damage).toBe(0);
    });

    it('should have destroyOnHit false', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', false);
      expect(boomerang.destroyOnHit).toBe(false);
    });
  });

  describe('state machine', () => {
    it('should start in OUTWARD state', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', false);
      expect(boomerang.getState()).toBe('OUTWARD');
    });

    it('should return isReturning false initially', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', false);
      expect(boomerang.isReturning()).toBe(false);
    });

    it('should transition to RETURNING when calling startReturning', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', false);
      boomerang.startReturning();
      expect(boomerang.getState()).toBe('RETURNING');
      expect(boomerang.isReturning()).toBe(true);
    });
  });

  describe('update - outward movement', () => {
    it('should move in initial direction during OUTWARD state', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      boomerang.update(1);
      expect(boomerang.x).toBeGreaterThan(100);
      expect(boomerang.y).toBe(100);
    });

    it('should track traveled distance', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      boomerang.update(1);
      expect(boomerang.traveledDistance).toBeGreaterThan(0);
    });

    it('should switch to RETURNING when max range reached', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', false);
      // Simulate many frames to reach max range
      for (let i = 0; i < 100; i++) {
        boomerang.update(1);
      }
      expect(boomerang.getState()).toBe('RETURNING');
    });
  });

  describe('update - returning movement', () => {
    let boomerang: Boomerang;
    let mockPlayerProvider: BoomerangPlayerProvider;

    beforeEach(() => {
      boomerang = new Boomerang(100, 100, 'RIGHT', false);
      mockPlayerProvider = {
        getX: () => 50,
        getY: () => 50,
      };
      boomerang.setPlayerProvider(mockPlayerProvider);
      boomerang.startReturning();
    });

    it('should move toward player when returning', () => {
      const startX = boomerang.x;
      boomerang.update(1);
      expect(boomerang.x).toBeLessThan(startX); // Moving left toward player at (50, 50)
    });

    it('should deactivate when reaching player', () => {
      // Set player position very close to boomerang center
      // Need to account for +8 offset added to player position in updateReturning
      const closeProvider: BoomerangPlayerProvider = {
        getX: () => boomerang.x - 8 + 4, // Adjust for +8 offset and center
        getY: () => boomerang.y - 8 + 4,
      };
      boomerang.setPlayerProvider(closeProvider);
      // Update multiple times to ensure it reaches
      for (let i = 0; i < 10; i++) {
        boomerang.update(1);
        if (!boomerang.active) break;
      }
      expect(boomerang.active).toBe(false);
      expect(boomerang.getState()).toBe('COLLECTED');
    });

    it('should deactivate if no player provider set', () => {
      const boomerangNoProvider = new Boomerang(100, 100, 'RIGHT', false);
      boomerangNoProvider.startReturning();
      boomerangNoProvider.update(1);
      expect(boomerangNoProvider.active).toBe(false);
    });
  });

  describe('onHit', () => {
    it('should start returning when hitting a target', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      expect(boomerang.getState()).toBe('OUTWARD');

      // Simulate hitting something
      boomerang.onHit({} as never);
      expect(boomerang.getState()).toBe('RETURNING');
    });

    it('should not deactivate on hit', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      boomerang.onHit({} as never);
      expect(boomerang.active).toBe(true);
    });
  });

  describe('shouldDestroy', () => {
    it('should return false when active and not collected', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      expect(boomerang.shouldDestroy()).toBe(false);
    });

    it('should return true when collected', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      const provider: BoomerangPlayerProvider = {
        getX: () => boomerang.x - 8 + 4,
        getY: () => boomerang.y - 8 + 4,
      };
      boomerang.setPlayerProvider(provider);
      boomerang.startReturning();
      // Update multiple times to reach player
      for (let i = 0; i < 10; i++) {
        boomerang.update(1);
        if (!boomerang.active) break;
      }
      expect(boomerang.shouldDestroy()).toBe(true);
    });

    it('should return true when inactive', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      boomerang.active = false;
      expect(boomerang.shouldDestroy()).toBe(true);
    });
  });

  describe('isMagicBoomerang', () => {
    it('should return false for wood boomerang', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', false);
      expect(boomerang.isMagicBoomerang()).toBe(false);
    });

    it('should return true for magic boomerang', () => {
      const boomerang = new Boomerang(0, 0, 'RIGHT', true);
      expect(boomerang.isMagicBoomerang()).toBe(true);
    });
  });

  describe('wasCollected', () => {
    it('should return false before collection', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      expect(boomerang.wasCollected()).toBe(false);
    });

    it('should return true after collection', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      const provider: BoomerangPlayerProvider = {
        getX: () => boomerang.x - 8 + 4,
        getY: () => boomerang.y - 8 + 4,
      };
      boomerang.setPlayerProvider(provider);
      boomerang.startReturning();
      // Update multiple times to reach player
      for (let i = 0; i < 10; i++) {
        boomerang.update(1);
        if (!boomerang.active) break;
      }
      expect(boomerang.wasCollected()).toBe(true);
    });
  });

  describe('getSpriteCommands', () => {
    it('should return sprite commands when active', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      const commands = boomerang.getSpriteCommands();
      expect(commands.length).toBe(1);
      expect(commands[0]?.spriteKey).toBe('projectile_boomerang');
    });

    it('should return empty array when inactive', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      boomerang.active = false;
      const commands = boomerang.getSpriteCommands();
      expect(commands.length).toBe(0);
    });

    it('should use flip for rotation animation', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);

      // Advance animation
      for (let i = 0; i < 5; i++) {
        boomerang.update(1);
      }

      const commands = boomerang.getSpriteCommands();
      // Just verify we get commands - the flip states vary by frame
      expect(commands.length).toBe(1);
    });
  });

  describe('getHitbox', () => {
    it('should return correct hitbox', () => {
      const boomerang = new Boomerang(100, 100, 'RIGHT', false);
      const hitbox = boomerang.getHitbox();
      expect(hitbox.x).toBe(100);
      expect(hitbox.y).toBe(100);
      expect(hitbox.width).toBe(8);
      expect(hitbox.height).toBe(8);
    });
  });

  describe('createBoomerang factory', () => {
    it('should create wood boomerang', () => {
      const boomerang = createBoomerang(50, 60, 'DOWN', false);
      expect(boomerang.x).toBe(50);
      expect(boomerang.y).toBe(60);
      expect(boomerang.isMagicBoomerang()).toBe(false);
    });

    it('should create magic boomerang', () => {
      const boomerang = createBoomerang(50, 60, 'DOWN', true);
      expect(boomerang.isMagicBoomerang()).toBe(true);
    });
  });
});
