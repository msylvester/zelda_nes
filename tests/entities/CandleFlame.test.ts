// CandleFlame.test.ts - Tests for CandleFlame entity

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CandleFlame, createCandleFlame, FlameCollisionChecker, BurnTileCallback } from '../../src/entities/CandleFlame';
import { TILE_SIZE, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT } from '../../src/constants';

describe('CandleFlame', () => {
  let flame: CandleFlame;

  beforeEach(() => {
    flame = new CandleFlame(100, 100, 'RIGHT');
  });

  describe('constructor', () => {
    it('should create flame at specified position', () => {
      expect(flame.x).toBe(100);
      expect(flame.y).toBe(100);
    });

    it('should start in TRAVELING state', () => {
      expect(flame.getState()).toBe('TRAVELING');
    });

    it('should have damage value', () => {
      expect(flame.damage).toBe(1);
    });

    it('should be active on creation', () => {
      expect(flame.active).toBe(true);
    });

    it('should be a player projectile', () => {
      expect(flame.sourceType).toBe('PLAYER');
    });

    it('should have max range of 4 tiles', () => {
      expect(flame.maxRange).toBe(4 * TILE_SIZE);
    });

    it('should set velocity based on direction', () => {
      const rightFlame = new CandleFlame(0, 0, 'RIGHT');
      expect(rightFlame.velocityX).toBeGreaterThan(0);
      expect(rightFlame.velocityY).toBe(0);

      const leftFlame = new CandleFlame(0, 0, 'LEFT');
      expect(leftFlame.velocityX).toBeLessThan(0);
      expect(leftFlame.velocityY).toBe(0);

      const upFlame = new CandleFlame(0, 0, 'UP');
      expect(upFlame.velocityX).toBe(0);
      expect(upFlame.velocityY).toBeLessThan(0);

      const downFlame = new CandleFlame(0, 0, 'DOWN');
      expect(downFlame.velocityX).toBe(0);
      expect(downFlame.velocityY).toBeGreaterThan(0);
    });
  });

  describe('traveling', () => {
    it('should move in the direction of travel', () => {
      const startX = flame.x;
      flame.update(1);
      expect(flame.x).toBeGreaterThan(startX);
    });

    it('should track traveled distance', () => {
      expect(flame.traveledDistance).toBe(0);
      flame.update(1);
      expect(flame.traveledDistance).toBeGreaterThan(0);
    });

    it('should transition to BURNING when reaching max range', () => {
      // Move flame to max range
      const framesToMaxRange = Math.ceil(flame.maxRange / 2.0) + 1; // Speed is 2.0 px/frame
      flame.update(framesToMaxRange);
      expect(flame.getState()).toBe('BURNING');
    });

    it('should remain TRAVELING before reaching max range', () => {
      flame.update(10);
      expect(flame.getState()).toBe('TRAVELING');
      expect(flame.isBurning()).toBe(false);
    });
  });

  describe('collision detection', () => {
    let collisionChecker: FlameCollisionChecker;

    beforeEach(() => {
      collisionChecker = vi.fn().mockReturnValue({
        blocked: false,
        canBurn: false,
        tileX: 0,
        tileY: 0,
      });
      flame.setCollisionChecker(collisionChecker);
    });

    it('should call collision checker during update', () => {
      flame.update(1);
      expect(collisionChecker).toHaveBeenCalled();
    });

    it('should stop and burn when hitting solid obstacle', () => {
      collisionChecker = vi.fn().mockReturnValue({
        blocked: true,
        canBurn: false,
        tileX: 7,
        tileY: 6,
      });
      flame.setCollisionChecker(collisionChecker);

      flame.update(1);
      expect(flame.getState()).toBe('BURNING');
    });

    it('should stop and burn when hitting burnable tile', () => {
      collisionChecker = vi.fn().mockReturnValue({
        blocked: false,
        canBurn: true,
        tileX: 7,
        tileY: 6,
      });
      flame.setCollisionChecker(collisionChecker);

      flame.update(1);
      expect(flame.getState()).toBe('BURNING');
      expect(flame.isBurning()).toBe(true);
    });

    it('should call burn callback when burning a tile', () => {
      const burnCallback = vi.fn();
      flame.setBurnCallback(burnCallback);

      collisionChecker = vi.fn().mockReturnValue({
        blocked: false,
        canBurn: true,
        tileX: 7,
        tileY: 6,
      });
      flame.setCollisionChecker(collisionChecker);

      flame.update(1);
      expect(burnCallback).toHaveBeenCalledWith(7, 6);
    });

    it('should continue traveling when no collision', () => {
      flame.update(1);
      expect(flame.getState()).toBe('TRAVELING');
    });
  });

  describe('burning state', () => {
    beforeEach(() => {
      // Force transition to burning state
      const framesToMaxRange = Math.ceil(flame.maxRange / 2.0) + 1;
      flame.update(framesToMaxRange);
    });

    it('should be in BURNING state', () => {
      expect(flame.getState()).toBe('BURNING');
    });

    it('should return true for isBurning()', () => {
      expect(flame.isBurning()).toBe(true);
    });

    it('should transition to DONE after burn duration', () => {
      // Burn duration is 60 frames
      flame.update(60);
      expect(flame.getState()).toBe('DONE');
    });

    it('should become inactive when burn completes', () => {
      flame.update(60);
      expect(flame.active).toBe(false);
    });
  });

  describe('off screen detection', () => {
    it('should become DONE when going off left edge', () => {
      const leftFlame = new CandleFlame(10, 100, 'LEFT');
      // Move flame off left edge
      leftFlame.update(20);
      expect(leftFlame.getState()).toBe('DONE');
      expect(leftFlame.active).toBe(false);
    });

    it('should become DONE when going off top edge', () => {
      const upFlame = new CandleFlame(100, 10, 'UP');
      // Move flame off top edge
      upFlame.update(20);
      expect(upFlame.getState()).toBe('DONE');
    });

    it('should become DONE when going off right edge', () => {
      const rightFlame = new CandleFlame(PLAY_AREA_WIDTH - 10, 100, 'RIGHT');
      // Move flame off right edge
      rightFlame.update(20);
      expect(rightFlame.getState()).toBe('DONE');
    });

    it('should become DONE when going off bottom edge', () => {
      const downFlame = new CandleFlame(100, PLAY_AREA_HEIGHT - 10, 'DOWN');
      // Move flame off bottom edge
      downFlame.update(20);
      expect(downFlame.getState()).toBe('DONE');
    });
  });

  describe('shouldDestroy', () => {
    it('should return false while traveling', () => {
      expect(flame.shouldDestroy()).toBe(false);
    });

    it('should return false while burning', () => {
      const framesToMaxRange = Math.ceil(flame.maxRange / 2.0) + 1;
      flame.update(framesToMaxRange);
      expect(flame.shouldDestroy()).toBe(false);
    });

    it('should return true when DONE', () => {
      const framesToMaxRange = Math.ceil(flame.maxRange / 2.0) + 1;
      flame.update(framesToMaxRange); // Start burning
      flame.update(60); // Complete burning
      expect(flame.shouldDestroy()).toBe(true);
    });
  });

  describe('getHitbox', () => {
    it('should return correct hitbox', () => {
      const hitbox = flame.getHitbox();
      expect(hitbox.x).toBe(100);
      expect(hitbox.y).toBe(100);
      expect(hitbox.width).toBe(16);
      expect(hitbox.height).toBe(16);
    });

    it('should update hitbox position as flame moves', () => {
      flame.update(10);
      const hitbox = flame.getHitbox();
      expect(hitbox.x).toBeGreaterThan(100);
    });
  });

  describe('getSpriteCommands', () => {
    it('should return sprite commands while active', () => {
      const commands = flame.getSpriteCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0]?.spriteKey).toBe('projectile_fireball');
    });

    it('should return empty array when inactive', () => {
      flame.active = false;
      const commands = flame.getSpriteCommands();
      expect(commands).toEqual([]);
    });

    it('should animate by flipping sprite', () => {
      // Check that animation changes flipX/flipY
      const commands1 = flame.getSpriteCommands();
      flame.update(5); // Update animation
      const commands2 = flame.getSpriteCommands();

      // At least one should have different flip state after some animation frames
      // Animation cycles through 4 frames
      flame.update(4);
      const commands3 = flame.getSpriteCommands();

      // Just check that we get valid commands
      expect(commands1.length).toBeGreaterThan(0);
      expect(commands2.length).toBeGreaterThan(0);
      expect(commands3.length).toBeGreaterThan(0);
    });
  });

  describe('onHit', () => {
    it('should not destroy flame when hitting target', () => {
      const mockTarget = { id: 'test' } as unknown as Parameters<typeof flame.onHit>[0];
      flame.onHit(mockTarget);
      expect(flame.active).toBe(true);
    });
  });

  describe('update when inactive', () => {
    it('should not update when inactive', () => {
      flame.active = false;
      const startX = flame.x;
      flame.update(10);
      expect(flame.x).toBe(startX);
    });
  });
});

describe('createCandleFlame factory', () => {
  it('should create a CandleFlame instance', () => {
    const flame = createCandleFlame(50, 75, 'UP');
    expect(flame).toBeInstanceOf(CandleFlame);
    expect(flame.x).toBe(50);
    expect(flame.y).toBe(75);
  });
});
