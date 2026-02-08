// Bomb.test.ts - Tests for Bomb entity

import { describe, it, expect, beforeEach } from 'vitest';
import { Bomb, createBomb } from '../../src/entities/Bomb';
import { BOMB_FUSE_FRAMES, BOMB_BLAST_RADIUS, BOMB_DAMAGE } from '../../src/constants';

describe('Bomb', () => {
  let bomb: Bomb;

  beforeEach(() => {
    bomb = new Bomb(100, 100, 'DOWN');
  });

  describe('constructor', () => {
    it('should create bomb at specified position', () => {
      expect(bomb.x).toBe(100);
      expect(bomb.y).toBe(100);
    });

    it('should start in FUSE state', () => {
      expect(bomb.getState()).toBe('FUSE');
    });

    it('should have correct damage value', () => {
      expect(bomb.damage).toBe(BOMB_DAMAGE);
    });

    it('should be active on creation', () => {
      expect(bomb.active).toBe(true);
    });

    it('should be a player projectile', () => {
      expect(bomb.sourceType).toBe('PLAYER');
    });

    it('should have piercing enabled (hits all enemies in blast)', () => {
      expect(bomb.piercing).toBe(true);
    });

    it('should not destroy on hit', () => {
      expect(bomb.destroyOnHit).toBe(false);
    });

    it('should have zero velocity (stationary)', () => {
      expect(bomb.velocityX).toBe(0);
      expect(bomb.velocityY).toBe(0);
    });
  });

  describe('fuse countdown', () => {
    it('should countdown fuse timer', () => {
      const initialFuse = bomb.getFuseTimer();
      bomb.update(1);
      expect(bomb.getFuseTimer()).toBe(initialFuse - 1);
    });

    it('should remain in FUSE state while timer > 0', () => {
      bomb.update(BOMB_FUSE_FRAMES - 1);
      expect(bomb.getState()).toBe('FUSE');
    });

    it('should transition to EXPLODING when fuse reaches 0', () => {
      bomb.update(BOMB_FUSE_FRAMES);
      expect(bomb.getState()).toBe('EXPLODING');
    });

    it('should not explode until full fuse time', () => {
      bomb.update(BOMB_FUSE_FRAMES / 2);
      expect(bomb.getState()).toBe('FUSE');
      expect(bomb.isExploding()).toBe(false);
    });
  });

  describe('explosion', () => {
    beforeEach(() => {
      // Advance to explosion state
      bomb.update(BOMB_FUSE_FRAMES);
    });

    it('should be in EXPLODING state', () => {
      expect(bomb.getState()).toBe('EXPLODING');
    });

    it('should return true for isExploding()', () => {
      expect(bomb.isExploding()).toBe(true);
    });

    it('should have a blast hitbox during explosion', () => {
      const blastHitbox = bomb.getBlastHitbox();
      expect(blastHitbox).not.toBeNull();
    });

    it('should return null blast hitbox after damage dealt', () => {
      bomb.markDamageDealt();
      const blastHitbox = bomb.getBlastHitbox();
      expect(blastHitbox).toBeNull();
    });

    it('should have correct blast radius', () => {
      const blastHitbox = bomb.getBlastHitbox();
      expect(blastHitbox).not.toBeNull();
      if (blastHitbox) {
        expect(blastHitbox.width).toBe(BOMB_BLAST_RADIUS * 2);
        expect(blastHitbox.height).toBe(BOMB_BLAST_RADIUS * 2);
      }
    });

    it('should center blast hitbox on bomb position', () => {
      const blastHitbox = bomb.getBlastHitbox();
      expect(blastHitbox).not.toBeNull();
      if (blastHitbox) {
        // Bomb is at 100, 100 with size 16x16, so center is at 108, 108
        // Blast hitbox should extend BOMB_BLAST_RADIUS in each direction from center
        expect(blastHitbox.x).toBe(108 - BOMB_BLAST_RADIUS);
        expect(blastHitbox.y).toBe(108 - BOMB_BLAST_RADIUS);
      }
    });

    it('should transition to DONE after explosion animation', () => {
      // Explosion animation is 20 frames
      bomb.update(20);
      expect(bomb.getState()).toBe('DONE');
    });

    it('should become inactive when explosion completes', () => {
      bomb.update(20);
      expect(bomb.active).toBe(false);
    });
  });

  describe('damage tracking', () => {
    beforeEach(() => {
      bomb.update(BOMB_FUSE_FRAMES); // Advance to explosion
    });

    it('should start with hasExploded false', () => {
      expect(bomb.hasExploded()).toBe(false);
    });

    it('should return true for hasExploded after markDamageDealt', () => {
      bomb.markDamageDealt();
      expect(bomb.hasExploded()).toBe(true);
    });
  });

  describe('shouldDestroy', () => {
    it('should return false during fuse', () => {
      expect(bomb.shouldDestroy()).toBe(false);
    });

    it('should return false during explosion', () => {
      bomb.update(BOMB_FUSE_FRAMES);
      expect(bomb.shouldDestroy()).toBe(false);
    });

    it('should return true when DONE', () => {
      bomb.update(BOMB_FUSE_FRAMES); // Start explosion
      bomb.update(20); // Complete explosion
      expect(bomb.shouldDestroy()).toBe(true);
    });
  });

  describe('isInBlastRadius', () => {
    beforeEach(() => {
      bomb.update(BOMB_FUSE_FRAMES); // Advance to explosion
    });

    it('should return true for targets within blast radius', () => {
      // Bomb center is at 108, 108 (100 + 16/2)
      // Target at bomb center should be in radius
      const inRadius = bomb.isInBlastRadius(100, 100, 16, 16);
      expect(inRadius).toBe(true);
    });

    it('should return true for targets at edge of blast', () => {
      // Position target so it just overlaps with blast hitbox
      const inRadius = bomb.isInBlastRadius(100 - 8, 100 - 8, 16, 16);
      expect(inRadius).toBe(true);
    });

    it('should return false for targets outside blast radius', () => {
      const inRadius = bomb.isInBlastRadius(200, 200, 16, 16);
      expect(inRadius).toBe(false);
    });

    it('should return false when not exploding', () => {
      const freshBomb = new Bomb(100, 100, 'DOWN');
      const inRadius = freshBomb.isInBlastRadius(100, 100, 16, 16);
      expect(inRadius).toBe(false);
    });
  });

  describe('getHitbox', () => {
    it('should return normal hitbox during fuse', () => {
      const hitbox = bomb.getHitbox();
      expect(hitbox.x).toBe(100);
      expect(hitbox.y).toBe(100);
      expect(hitbox.width).toBe(16);
      expect(hitbox.height).toBe(16);
    });

    it('should return blast hitbox during explosion', () => {
      bomb.update(BOMB_FUSE_FRAMES);
      const hitbox = bomb.getHitbox();
      // Should be blast hitbox dimensions
      expect(hitbox.width).toBe(BOMB_BLAST_RADIUS * 2);
      expect(hitbox.height).toBe(BOMB_BLAST_RADIUS * 2);
    });
  });

  describe('getSpriteCommands', () => {
    it('should return sprite commands during fuse', () => {
      const commands = bomb.getSpriteCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0]?.spriteKey).toBe('item_bomb');
    });

    it('should return explosion sprite commands during explosion', () => {
      bomb.update(BOMB_FUSE_FRAMES);
      const commands = bomb.getSpriteCommands();
      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0]?.spriteKey).toContain('death_puff');
    });

    it('should return empty array when inactive', () => {
      bomb.active = false;
      const commands = bomb.getSpriteCommands();
      expect(commands).toEqual([]);
    });
  });

  describe('onHit', () => {
    it('should not destroy bomb when hitting target', () => {
      const mockTarget = { id: 'test' } as unknown as Parameters<typeof bomb.onHit>[0];
      bomb.onHit(mockTarget);
      expect(bomb.active).toBe(true);
    });
  });

  describe('update when inactive', () => {
    it('should not update when inactive', () => {
      bomb.active = false;
      const fuseTime = bomb.getFuseTimer();
      bomb.update(10);
      expect(bomb.getFuseTimer()).toBe(fuseTime);
    });
  });
});

describe('createBomb factory', () => {
  it('should create a Bomb instance', () => {
    const bomb = createBomb(50, 75, 'LEFT');
    expect(bomb).toBeInstanceOf(Bomb);
    expect(bomb.x).toBe(50);
    expect(bomb.y).toBe(75);
  });
});
