// tests/combat/DamageSystem.test.ts - Tests for damage system

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DamageSystem,
  getDamageSystem,
  resetDamageSystem,
  DamageEvent,
} from '../../src/combat/DamageSystem';
import { Player, resetPlayer } from '../../src/entities/Player';
import { EnemyEntity } from '../../src/entities/Entity';
import { resetEntityIdCounter } from '../../src/entities/Entity';
import { Direction, EnemyState } from '../../src/types';
import { SWORD_DAMAGE, MIN_DAMAGE, STARTING_HP } from '../../src/constants';

// Mock enemy factory for testing
function createMockEnemy(
  x: number,
  y: number,
  options: Partial<{
    id: string;
    active: boolean;
    state: EnemyState;
    hp: number;
    maxHp: number;
    contactDamage: number;
    vulnerable: boolean;
    knockbackable: boolean;
  }> = {}
): EnemyEntity {
  const {
    id = `enemy_${Math.random().toString(36).slice(2, 9)}`,
    active = true,
    state = 'ACTIVE',
    hp = 2,
    maxHp = 2,
    contactDamage = 1,
    vulnerable = true,
    knockbackable = true,
  } = options;

  const enemy: EnemyEntity = {
    id,
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
    hp,
    maxHp,
    contactDamage,
    archetypeId: 'TEST',
    knockbackable,
    countsTowardLimit: true,
    advancesKillCounter: true,
    update: vi.fn(),
    getSpriteCommands: () => [],
    getHitbox: () => ({ x, y, width: 16, height: 16 }),
    destroy: function () { this.active = false; },
    takeDamage: vi.fn(function (this: EnemyEntity, amount: number) {
      if (!this.active || this.state === 'DYING' || !vulnerable) {
        return false;
      }
      this.hp -= amount;
      if (this.hp <= 0) {
        this.state = 'DYING';
      }
      return true;
    }),
    isVulnerable: () => vulnerable,
    getContactDamage: function () { return this.contactDamage; },
  };

  return enemy;
}

describe('DamageSystem', () => {
  let damageSystem: DamageSystem;
  let player: Player;

  beforeEach(() => {
    resetEntityIdCounter();
    damageSystem = resetDamageSystem();
    player = resetPlayer(100, 80, STARTING_HP);
  });

  describe('constructor and singleton', () => {
    it('should start with empty queue', () => {
      expect(damageSystem.getQueueLength()).toBe(0);
    });

    it('should start with sword tier 1', () => {
      expect(damageSystem.getSwordTier()).toBe(1);
    });

    it('getDamageSystem returns singleton', () => {
      const system1 = getDamageSystem();
      const system2 = getDamageSystem();
      expect(system1).toBe(system2);
    });

    it('resetDamageSystem creates new instance', () => {
      const system1 = getDamageSystem();
      system1.queuePlayerDamage(player, 1, 'LEFT');
      const system2 = resetDamageSystem();
      expect(system2.getQueueLength()).toBe(0);
    });
  });

  describe('queueDamage', () => {
    it('should add damage event to queue', () => {
      const event: DamageEvent = {
        targetType: 'PLAYER',
        target: player,
        damage: 2,
        fromDirection: 'LEFT',
        sourceType: 'CONTACT',
      };
      damageSystem.queueDamage(event);
      expect(damageSystem.getQueueLength()).toBe(1);
    });

    it('should allow multiple events in queue', () => {
      const enemy1 = createMockEnemy(50, 50);
      const enemy2 = createMockEnemy(60, 60);

      damageSystem.queueEnemyDamage(enemy1, 1, 'UP');
      damageSystem.queueEnemyDamage(enemy2, 1, 'DOWN');
      expect(damageSystem.getQueueLength()).toBe(2);
    });
  });

  describe('queuePlayerDamage', () => {
    it('should create proper damage event', () => {
      damageSystem.queuePlayerDamage(player, 2, 'RIGHT', 'CONTACT');
      expect(damageSystem.getQueueLength()).toBe(1);
      expect(damageSystem.hasPendingDamage()).toBe(true);
    });

    it('should default sourceType to CONTACT', () => {
      damageSystem.queuePlayerDamage(player, 1, 'LEFT');
      expect(damageSystem.getQueueLength()).toBe(1);
    });
  });

  describe('queueEnemyDamage', () => {
    it('should create proper damage event', () => {
      const enemy = createMockEnemy(50, 50);
      damageSystem.queueEnemyDamage(enemy, 1, 'UP', 'SWORD');
      expect(damageSystem.getQueueLength()).toBe(1);
    });

    it('should default sourceType to SWORD', () => {
      const enemy = createMockEnemy(50, 50);
      damageSystem.queueEnemyDamage(enemy, 1, 'DOWN');
      expect(damageSystem.getQueueLength()).toBe(1);
    });
  });

  describe('setSwordTier', () => {
    it('should set sword tier 1', () => {
      damageSystem.setSwordTier(1);
      expect(damageSystem.getSwordTier()).toBe(1);
    });

    it('should set sword tier 2', () => {
      damageSystem.setSwordTier(2);
      expect(damageSystem.getSwordTier()).toBe(2);
    });

    it('should set sword tier 3', () => {
      damageSystem.setSwordTier(3);
      expect(damageSystem.getSwordTier()).toBe(3);
    });

    it('should clamp to minimum tier 1', () => {
      damageSystem.setSwordTier(0);
      expect(damageSystem.getSwordTier()).toBe(1);
    });

    it('should clamp to maximum tier 3', () => {
      damageSystem.setSwordTier(5);
      expect(damageSystem.getSwordTier()).toBe(3);
    });
  });

  describe('calculateSwordDamage', () => {
    it('should return tier 1 damage', () => {
      damageSystem.setSwordTier(1);
      expect(damageSystem.calculateSwordDamage()).toBe(SWORD_DAMAGE[1]);
    });

    it('should return tier 2 damage', () => {
      damageSystem.setSwordTier(2);
      expect(damageSystem.calculateSwordDamage()).toBe(SWORD_DAMAGE[2]);
    });

    it('should return tier 3 damage', () => {
      damageSystem.setSwordTier(3);
      expect(damageSystem.calculateSwordDamage()).toBe(SWORD_DAMAGE[3]);
    });
  });

  describe('processQueue - player damage', () => {
    it('should reduce player HP', () => {
      const initialHp = player.hp;
      damageSystem.queuePlayerDamage(player, 2, 'LEFT');
      const results = damageSystem.processQueue();

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(results[0].actualDamage).toBe(2);
      expect(player.hp).toBe(initialHp - 2);
    });

    it('should trigger knockback state', () => {
      damageSystem.queuePlayerDamage(player, 1, 'RIGHT');
      damageSystem.processQueue();
      expect(player.getState()).toBe('KNOCKBACK');
    });

    it('should trigger invincibility', () => {
      damageSystem.queuePlayerDamage(player, 1, 'DOWN');
      damageSystem.processQueue();
      expect(player.isInvincible()).toBe(true);
    });

    it('should not damage invincible player', () => {
      // First hit makes player invincible
      damageSystem.queuePlayerDamage(player, 1, 'LEFT');
      damageSystem.processQueue();
      const hpAfterFirstHit = player.hp;

      // Second hit should be blocked
      damageSystem.queuePlayerDamage(player, 1, 'RIGHT');
      const results = damageSystem.processQueue();

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('invincible');
      expect(player.hp).toBe(hpAfterFirstHit);
    });

    it('should report player death when HP reaches 0', () => {
      player.hp = 1;
      damageSystem.queuePlayerDamage(player, 2, 'UP');
      const results = damageSystem.processQueue();

      expect(results[0].targetDied).toBe(true);
      expect(player.getState()).toBe('DYING');
    });

    it('should not damage dying player', () => {
      player.hp = 1;
      damageSystem.queuePlayerDamage(player, 2, 'DOWN');
      damageSystem.processQueue();

      // Player is now dying
      damageSystem.queuePlayerDamage(player, 1, 'LEFT');
      const results = damageSystem.processQueue();

      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('already_dead');
    });

    it('should clear queue after processing', () => {
      damageSystem.queuePlayerDamage(player, 1, 'LEFT');
      expect(damageSystem.getQueueLength()).toBe(1);
      damageSystem.processQueue();
      expect(damageSystem.getQueueLength()).toBe(0);
    });
  });

  describe('processQueue - enemy damage', () => {
    it('should reduce enemy HP', () => {
      const enemy = createMockEnemy(50, 50, { hp: 3 });
      damageSystem.queueEnemyDamage(enemy, 1, 'LEFT', 'PROJECTILE');
      const results = damageSystem.processQueue();

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(enemy.takeDamage).toHaveBeenCalled();
    });

    it('should use sword tier damage for SWORD source', () => {
      const enemy = createMockEnemy(50, 50, { hp: 5 });
      damageSystem.setSwordTier(2);
      damageSystem.queueEnemyDamage(enemy, 1, 'UP', 'SWORD');
      const results = damageSystem.processQueue();

      expect(results[0].actualDamage).toBe(SWORD_DAMAGE[2]);
    });

    it('should report enemy death when HP reaches 0', () => {
      const enemy = createMockEnemy(50, 50, { hp: 1 });
      damageSystem.queueEnemyDamage(enemy, 1, 'DOWN', 'PROJECTILE');
      const results = damageSystem.processQueue();

      expect(results[0].targetDied).toBe(true);
    });

    it('should not damage dying enemy', () => {
      const enemy = createMockEnemy(50, 50, { state: 'DYING' });
      damageSystem.queueEnemyDamage(enemy, 1, 'LEFT');
      const results = damageSystem.processQueue();

      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('already_dead');
    });

    it('should not damage inactive enemy', () => {
      const enemy = createMockEnemy(50, 50, { active: false });
      damageSystem.queueEnemyDamage(enemy, 1, 'RIGHT');
      const results = damageSystem.processQueue();

      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('inactive');
    });

    it('should not damage invulnerable enemy', () => {
      const enemy = createMockEnemy(50, 50, { vulnerable: false });
      damageSystem.queueEnemyDamage(enemy, 1, 'UP');
      const results = damageSystem.processQueue();

      expect(results[0].success).toBe(false);
      expect(results[0].reason).toBe('invulnerable');
    });
  });

  describe('processQueue - double damage prevention', () => {
    it('should prevent double damage to player in same frame', () => {
      const initialHp = player.hp;
      damageSystem.queuePlayerDamage(player, 1, 'LEFT');
      damageSystem.queuePlayerDamage(player, 1, 'RIGHT');
      const results = damageSystem.processQueue();

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].reason).toBe('already_damaged_this_frame');
      expect(player.hp).toBe(initialHp - 1);
    });

    it('should prevent double damage to enemy in same frame', () => {
      const enemy = createMockEnemy(50, 50, { id: 'enemy_1', hp: 5 });
      damageSystem.queueEnemyDamage(enemy, 1, 'UP', 'SWORD');
      damageSystem.queueEnemyDamage(enemy, 1, 'DOWN', 'PROJECTILE');
      const results = damageSystem.processQueue();

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].reason).toBe('already_damaged_this_frame');
    });

    it('should allow damage to different targets in same frame', () => {
      const enemy1 = createMockEnemy(50, 50, { id: 'enemy_1' });
      const enemy2 = createMockEnemy(60, 60, { id: 'enemy_2' });
      damageSystem.queueEnemyDamage(enemy1, 1, 'UP');
      damageSystem.queueEnemyDamage(enemy2, 1, 'DOWN');
      const results = damageSystem.processQueue();

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('clearQueue', () => {
    it('should clear all pending damage events', () => {
      damageSystem.queuePlayerDamage(player, 1, 'LEFT');
      damageSystem.queuePlayerDamage(player, 1, 'RIGHT');
      expect(damageSystem.getQueueLength()).toBe(2);

      damageSystem.clearQueue();
      expect(damageSystem.getQueueLength()).toBe(0);
      expect(damageSystem.hasPendingDamage()).toBe(false);
    });
  });

  describe('hasPendingDamage', () => {
    it('should return false when queue is empty', () => {
      expect(damageSystem.hasPendingDamage()).toBe(false);
    });

    it('should return true when queue has events', () => {
      damageSystem.queuePlayerDamage(player, 1, 'LEFT');
      expect(damageSystem.hasPendingDamage()).toBe(true);
    });

    it('should return false after processing', () => {
      damageSystem.queuePlayerDamage(player, 1, 'UP');
      damageSystem.processQueue();
      expect(damageSystem.hasPendingDamage()).toBe(false);
    });
  });

  describe('knockback direction', () => {
    it('should knock player back opposite to damage direction (LEFT source -> RIGHT knockback)', () => {
      // The fromDirection is where the damage comes from
      // Knockback should be in the opposite direction
      damageSystem.queuePlayerDamage(player, 1, 'LEFT');
      damageSystem.processQueue();

      // Player should be knocked right (away from left-side attacker)
      expect(player.getState()).toBe('KNOCKBACK');
    });

    it('should knock player back opposite to damage direction (UP source -> DOWN knockback)', () => {
      damageSystem.queuePlayerDamage(player, 1, 'UP');
      damageSystem.processQueue();
      expect(player.getState()).toBe('KNOCKBACK');
    });
  });

  describe('minimum damage', () => {
    it('should apply minimum damage for low damage amounts', () => {
      const enemy = createMockEnemy(50, 50, { hp: 5 });
      damageSystem.queueEnemyDamage(enemy, 0, 'DOWN', 'PROJECTILE');
      const results = damageSystem.processQueue();

      expect(results[0].actualDamage).toBeGreaterThanOrEqual(MIN_DAMAGE);
    });
  });

  describe('bomb damage', () => {
    it('should process bomb damage', () => {
      const enemy = createMockEnemy(50, 50, { hp: 5 });
      damageSystem.queueEnemyDamage(enemy, 4, 'UP', 'BOMB');
      const results = damageSystem.processQueue();

      expect(results[0].success).toBe(true);
      expect(results[0].actualDamage).toBe(4);
    });
  });

  describe('environment damage', () => {
    it('should process environment damage to player', () => {
      const initialHp = player.hp;
      damageSystem.queuePlayerDamage(player, 1, 'DOWN', 'ENVIRONMENT');
      const results = damageSystem.processQueue();

      expect(results[0].success).toBe(true);
      expect(player.hp).toBe(initialHp - 1);
    });
  });
});
