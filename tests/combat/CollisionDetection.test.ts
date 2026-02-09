// tests/combat/CollisionDetection.test.ts - Tests for collision detection

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CollisionDetection,
  getCollisionDetection,
  resetCollisionDetection,
  getDirectionFrom,
  getCenter,
  aabbOverlap,
} from '../../src/combat/CollisionDetection';
import { Player, resetPlayer } from '../../src/entities/Player';
import { EnemyEntity, ProjectileEntity, ItemEntity } from '../../src/entities/Entity';
import { resetEntityIdCounter } from '../../src/entities/Entity';
import { Direction, EnemyState, AABB } from '../../src/types';

// Mock enemy factory for testing
function createMockEnemy(
  x: number,
  y: number,
  options: Partial<{
    active: boolean;
    state: EnemyState;
    contactDamage: number;
    vulnerable: boolean;
  }> = {}
): EnemyEntity {
  const {
    active = true,
    state = 'ACTIVE',
    contactDamage = 1,
    vulnerable = true,
  } = options;

  return {
    id: `enemy_${Math.random().toString(36).slice(2, 9)}`,
    entityType: 'ENEMY',
    x,
    y,
    width: 16,
    height: 16,
    active,
    facingDirection: 'DOWN',
    velocityX: 0,
    velocityY: 0,
    spritePriority: 3,
    state,
    hp: 2,
    maxHp: 2,
    contactDamage,
    archetypeId: 'TEST',
    knockbackable: true,
    countsTowardLimit: true,
    advancesKillCounter: true,
    update: vi.fn(),
    getSpriteCommands: () => [],
    getHitbox: () => ({ x, y, width: 16, height: 16 }),
    destroy: function () { this.active = false; },
    takeDamage: () => true,
    isVulnerable: () => vulnerable,
    getContactDamage: function () { return this.contactDamage; },
  };
}

// Mock projectile factory
function createMockProjectile(
  x: number,
  y: number,
  sourceType: 'PLAYER' | 'ENEMY',
  damage: number = 1
): ProjectileEntity {
  return {
    id: `projectile_${Math.random().toString(36).slice(2, 9)}`,
    entityType: 'PROJECTILE',
    x,
    y,
    width: 8,
    height: 8,
    active: true,
    facingDirection: 'UP',
    velocityX: 0,
    velocityY: -2,
    spritePriority: 4,
    damage,
    sourceType,
    piercing: false,
    destroyOnHit: true,
    maxRange: 80,
    traveledDistance: 0,
    update: vi.fn(),
    getSpriteCommands: () => [],
    getHitbox: () => ({ x, y, width: 8, height: 8 }),
    destroy: function () { this.active = false; },
    onHit: vi.fn(),
    shouldDestroy: () => false,
  };
}

// Mock item factory
function createMockItem(x: number, y: number, collected: boolean = false): ItemEntity {
  return {
    id: `item_${Math.random().toString(36).slice(2, 9)}`,
    entityType: 'ITEM',
    x,
    y,
    width: 8,
    height: 8,
    active: true,
    facingDirection: 'DOWN',
    velocityX: 0,
    velocityY: 0,
    spritePriority: 2,
    itemType: 'HEART',
    lifetime: 0,
    maxLifetime: 600,
    bobOffset: 0,
    collected,
    update: vi.fn(),
    getSpriteCommands: () => [],
    getHitbox: () => ({ x, y, width: 8, height: 8 }),
    destroy: function () { this.active = false; },
    collect: function () { this.collected = true; },
    isExpired: () => false,
  };
}

describe('CollisionDetection', () => {
  let collision: CollisionDetection;
  let player: Player;

  beforeEach(() => {
    resetEntityIdCounter();
    collision = new CollisionDetection();
    player = resetPlayer(100, 100);
  });

  describe('utility functions', () => {
    describe('aabbOverlap', () => {
      it('should detect overlapping boxes', () => {
        const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
        const b: AABB = { x: 5, y: 5, width: 10, height: 10 };
        expect(aabbOverlap(a, b)).toBe(true);
      });

      it('should not detect non-overlapping boxes', () => {
        const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
        const b: AABB = { x: 20, y: 20, width: 10, height: 10 };
        expect(aabbOverlap(a, b)).toBe(false);
      });

      it('should not detect touching boxes as overlapping', () => {
        const a: AABB = { x: 0, y: 0, width: 10, height: 10 };
        const b: AABB = { x: 10, y: 0, width: 10, height: 10 };
        expect(aabbOverlap(a, b)).toBe(false);
      });
    });

    describe('getDirectionFrom', () => {
      it('should return LEFT when target is left of source', () => {
        // source (100,50) to target (50,50) - target is to the left
        expect(getDirectionFrom(100, 50, 50, 50)).toBe('LEFT');
      });

      it('should return RIGHT when target is right of source', () => {
        // source (50,50) to target (100,50) - target is to the right
        expect(getDirectionFrom(50, 50, 100, 50)).toBe('RIGHT');
      });

      it('should return UP when target is above source', () => {
        // source (50,100) to target (50,50) - target is above
        expect(getDirectionFrom(50, 100, 50, 50)).toBe('UP');
      });

      it('should return DOWN when target is below source', () => {
        // source (50,50) to target (50,100) - target is below
        expect(getDirectionFrom(50, 50, 50, 100)).toBe('DOWN');
      });

      it('should prefer horizontal for diagonal', () => {
        // source (0,0) to target (10,9) - dx=10, dy=9, horizontal wins -> RIGHT
        expect(getDirectionFrom(0, 0, 10, 9)).toBe('RIGHT');
      });
    });

    describe('getCenter', () => {
      it('should return center of box', () => {
        const box: AABB = { x: 10, y: 20, width: 20, height: 10 };
        const center = getCenter(box);
        expect(center.x).toBe(20);
        expect(center.y).toBe(25);
      });
    });
  });

  describe('checkPlayerEnemyCollisions', () => {
    it('should detect collision when overlapping', () => {
      // Position enemy at player's hitbox location
      const playerHitbox = player.getHitbox();
      const enemy = createMockEnemy(playerHitbox.x, playerHitbox.y);

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(1);
      expect(collisions[0].enemy).toBe(enemy);
    });

    it('should return damage amount from enemy', () => {
      const playerHitbox = player.getHitbox();
      const enemy = createMockEnemy(playerHitbox.x, playerHitbox.y, { contactDamage: 2 });

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy]);
      expect(collisions[0].damage).toBe(2);
    });

    it('should return direction from enemy to player (for knockback)', () => {
      const playerHitbox = player.getHitbox();
      // Enemy to the left of player - knockback should be to the RIGHT
      const enemy = createMockEnemy(playerHitbox.x - 10, playerHitbox.y);

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(1);
      // Direction from enemy to player = RIGHT (player is right of enemy)
      expect(collisions[0].fromDirection).toBe('RIGHT');
    });

    it('should skip inactive enemies', () => {
      const playerHitbox = player.getHitbox();
      const enemy = createMockEnemy(playerHitbox.x, playerHitbox.y, { active: false });

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(0);
    });

    it('should skip dying enemies', () => {
      const playerHitbox = player.getHitbox();
      const enemy = createMockEnemy(playerHitbox.x, playerHitbox.y, { state: 'DYING' });

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(0);
    });

    it('should skip spawning enemies', () => {
      const playerHitbox = player.getHitbox();
      const enemy = createMockEnemy(playerHitbox.x, playerHitbox.y, { state: 'SPAWNING' });

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(0);
    });

    it('should return empty when player is invincible', () => {
      player.takeDamage(1, 'UP'); // Makes player invincible
      const playerHitbox = player.getHitbox();
      const enemy = createMockEnemy(playerHitbox.x, playerHitbox.y);

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(0);
    });

    it('should return empty when player is dying', () => {
      player.takeDamage(player.hp, 'UP'); // Kills player
      const playerHitbox = player.getHitbox();
      const enemy = createMockEnemy(playerHitbox.x, playerHitbox.y);

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(0);
    });

    it('should detect multiple collisions', () => {
      const playerHitbox = player.getHitbox();
      const enemy1 = createMockEnemy(playerHitbox.x, playerHitbox.y);
      const enemy2 = createMockEnemy(playerHitbox.x + 5, playerHitbox.y);

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy1, enemy2]);
      expect(collisions.length).toBe(2);
    });

    it('should not detect collision when not overlapping', () => {
      const enemy = createMockEnemy(200, 200);

      const collisions = collision.checkPlayerEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(0);
    });
  });

  describe('checkPlayerSwordEnemyCollisions', () => {
    it('should detect collision when sword active and overlapping', () => {
      // Start attack to create sword hitbox
      player.handleInput({ activeDirection: 'RIGHT', buttons: {} as never, facingDirection: 'RIGHT', frameNumber: 0 });
      player.startAttack(12);
      player.update(2); // Advance to active frame

      // Position enemy at sword hitbox location
      const swordHitbox = player.getSwordHitbox();
      expect(swordHitbox).not.toBeNull();
      const enemy = createMockEnemy(swordHitbox!.x, swordHitbox!.y);

      const collisions = collision.checkPlayerSwordEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(1);
      expect(collisions[0].sourceType).toBe('SWORD');
    });

    it('should return empty when not attacking', () => {
      const enemy = createMockEnemy(100, 100);

      const collisions = collision.checkPlayerSwordEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(0);
    });

    it('should skip invulnerable enemies', () => {
      player.startAttack(12);
      player.update(2);

      const swordHitbox = player.getSwordHitbox();
      const enemy = createMockEnemy(swordHitbox!.x, swordHitbox!.y, { vulnerable: false });

      const collisions = collision.checkPlayerSwordEnemyCollisions(player, [enemy]);
      expect(collisions.length).toBe(0);
    });
  });

  describe('checkProjectileEnemyCollisions', () => {
    it('should detect player projectile hitting enemy', () => {
      const projectile = createMockProjectile(100, 100, 'PLAYER', 2);
      const enemy = createMockEnemy(100, 100);

      const collisions = collision.checkProjectileEnemyCollisions([projectile], [enemy]);
      expect(collisions.length).toBe(1);
      expect(collisions[0].sourceType).toBe('PROJECTILE');
      expect(collisions[0].damage).toBe(2);
    });

    it('should ignore enemy projectiles', () => {
      const projectile = createMockProjectile(100, 100, 'ENEMY', 2);
      const enemy = createMockEnemy(100, 100);

      const collisions = collision.checkProjectileEnemyCollisions([projectile], [enemy]);
      expect(collisions.length).toBe(0);
    });

    it('should skip inactive projectiles', () => {
      const projectile = createMockProjectile(100, 100, 'PLAYER');
      projectile.active = false;
      const enemy = createMockEnemy(100, 100);

      const collisions = collision.checkProjectileEnemyCollisions([projectile], [enemy]);
      expect(collisions.length).toBe(0);
    });
  });

  describe('checkPlayerItemCollisions', () => {
    it('should detect collision with item', () => {
      const playerHitbox = player.getHitbox();
      const item = createMockItem(playerHitbox.x, playerHitbox.y);

      const collisions = collision.checkPlayerItemCollisions(player, [item]);
      expect(collisions.length).toBe(1);
      expect(collisions[0].item).toBe(item);
    });

    it('should skip collected items', () => {
      const playerHitbox = player.getHitbox();
      const item = createMockItem(playerHitbox.x, playerHitbox.y, true);

      const collisions = collision.checkPlayerItemCollisions(player, [item]);
      expect(collisions.length).toBe(0);
    });

    it('should skip inactive items', () => {
      const playerHitbox = player.getHitbox();
      const item = createMockItem(playerHitbox.x, playerHitbox.y);
      item.active = false;

      const collisions = collision.checkPlayerItemCollisions(player, [item]);
      expect(collisions.length).toBe(0);
    });

    it('should return empty when player is dying', () => {
      player.takeDamage(player.hp, 'UP');
      const playerHitbox = player.getHitbox();
      const item = createMockItem(playerHitbox.x, playerHitbox.y);

      const collisions = collision.checkPlayerItemCollisions(player, [item]);
      expect(collisions.length).toBe(0);
    });
  });

  describe('checkEnemyProjectilePlayerCollisions', () => {
    it('should detect enemy projectile hitting player', () => {
      const playerHitbox = player.getHitbox();
      const projectile = createMockProjectile(playerHitbox.x, playerHitbox.y, 'ENEMY', 2);

      const collisions = collision.checkEnemyProjectilePlayerCollisions(player, [projectile]);
      expect(collisions.length).toBe(1);
      expect(collisions[0].damage).toBe(2);
    });

    it('should ignore player projectiles', () => {
      const playerHitbox = player.getHitbox();
      const projectile = createMockProjectile(playerHitbox.x, playerHitbox.y, 'PLAYER');

      const collisions = collision.checkEnemyProjectilePlayerCollisions(player, [projectile]);
      expect(collisions.length).toBe(0);
    });

    it('should return direction from projectile to player (for knockback)', () => {
      const playerHitbox = player.getHitbox();
      // Projectile above player - knockback should be DOWN
      const projectile = createMockProjectile(playerHitbox.x, playerHitbox.y - 4, 'ENEMY');

      const collisions = collision.checkEnemyProjectilePlayerCollisions(player, [projectile]);
      // Direction from projectile to player = DOWN (player is below projectile)
      expect(collisions[0].fromDirection).toBe('DOWN');
    });

    it('should return empty when player is invincible', () => {
      player.takeDamage(1, 'UP');
      const playerHitbox = player.getHitbox();
      const projectile = createMockProjectile(playerHitbox.x, playerHitbox.y, 'ENEMY');

      const collisions = collision.checkEnemyProjectilePlayerCollisions(player, [projectile]);
      expect(collisions.length).toBe(0);
    });
  });

  describe('checkPlayerWeaponEnemyCollisions', () => {
    it('should combine sword and projectile collisions', () => {
      // Setup player attacking
      player.startAttack(12);
      player.update(2);

      const swordHitbox = player.getSwordHitbox();
      const enemy1 = createMockEnemy(swordHitbox!.x, swordHitbox!.y);

      // Enemy hit by projectile (different location)
      const projectile = createMockProjectile(50, 50, 'PLAYER');
      const enemy2 = createMockEnemy(50, 50);

      const collisions = collision.checkPlayerWeaponEnemyCollisions(
        player,
        [enemy1, enemy2],
        [projectile]
      );

      expect(collisions.length).toBe(2);
      expect(collisions.filter(c => c.sourceType === 'SWORD').length).toBe(1);
      expect(collisions.filter(c => c.sourceType === 'PROJECTILE').length).toBe(1);
    });
  });

  describe('singleton', () => {
    it('getCollisionDetection should return same instance', () => {
      const cd1 = getCollisionDetection();
      const cd2 = getCollisionDetection();
      expect(cd1).toBe(cd2);
    });

    it('resetCollisionDetection should create new instance', () => {
      const cd1 = getCollisionDetection();
      resetCollisionDetection();
      const cd2 = getCollisionDetection();
      expect(cd1).not.toBe(cd2);
    });
  });
});
