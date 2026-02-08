// tests/entities/EntityManager.test.ts - Tests for EntityManager

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EntityManager,
  getEntityManager,
  resetEntityManager,
} from '../../src/entities/EntityManager';
import {
  GameEntity,
  EnemyEntity,
  ProjectileEntity,
  ItemEntity,
  EffectEntity,
  resetEntityIdCounter,
} from '../../src/entities/Entity';
import { SpriteRenderCommand, Direction, EnemyState } from '../../src/types';
import { MAX_ENEMIES_PER_SCREEN } from '../../src/constants';

// Mock factories for creating test entities
function createMockEnemy(x: number, y: number, config: unknown): EnemyEntity {
  const cfg = config as { archetypeId: string };
  const enemy: EnemyEntity = {
    id: `enemy_${Math.random().toString(36).slice(2, 9)}`,
    entityType: 'ENEMY',
    x,
    y,
    width: 16,
    height: 16,
    active: true,
    facingDirection: 'DOWN',
    velocityX: 0,
    velocityY: 0,
    spritePriority: 3,
    state: 'ACTIVE',
    hp: 2,
    maxHp: 2,
    contactDamage: 1,
    archetypeId: cfg.archetypeId,
    knockbackable: true,
    countsTowardLimit: true,
    advancesKillCounter: true,
    update: vi.fn(),
    getSpriteCommands: () => [{
      spriteKey: 'enemy_sprite',
      x,
      y,
      flipX: false,
      flipY: false,
      priority: 3,
      visible: true,
    }],
    getHitbox: () => ({ x, y, width: 16, height: 16 }),
    destroy: function() { this.active = false; },
    takeDamage: () => true,
    isVulnerable: () => true,
    getContactDamage: function() { return this.contactDamage; },
  };
  return enemy;
}

function createMockProjectile(x: number, y: number, config: unknown): ProjectileEntity {
  const cfg = config as { direction: Direction; sourceType: 'PLAYER' | 'ENEMY'; projectileType: string };
  const projectile: ProjectileEntity = {
    id: `projectile_${Math.random().toString(36).slice(2, 9)}`,
    entityType: 'PROJECTILE',
    x,
    y,
    width: 8,
    height: 8,
    active: true,
    facingDirection: cfg.direction,
    velocityX: 0,
    velocityY: cfg.direction === 'UP' ? -2 : cfg.direction === 'DOWN' ? 2 : 0,
    spritePriority: 4,
    damage: 1,
    sourceType: cfg.sourceType,
    piercing: false,
    destroyOnHit: true,
    maxRange: 80,
    traveledDistance: 0,
    update: vi.fn(),
    getSpriteCommands: () => [{
      spriteKey: 'projectile_sprite',
      x,
      y,
      flipX: false,
      flipY: false,
      priority: 4,
      visible: true,
    }],
    getHitbox: () => ({ x, y, width: 8, height: 8 }),
    destroy: function() { this.active = false; },
    onHit: vi.fn(),
    shouldDestroy: function() { return this.traveledDistance >= this.maxRange; },
  };
  return projectile;
}

function createMockItem(x: number, y: number, config: unknown): ItemEntity {
  const cfg = config as { itemType: string };
  const item: ItemEntity = {
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
    itemType: cfg.itemType,
    lifetime: 0,
    maxLifetime: 600,
    bobOffset: 0,
    collected: false,
    update: vi.fn(),
    getSpriteCommands: () => [{
      spriteKey: 'item_sprite',
      x,
      y,
      flipX: false,
      flipY: false,
      priority: 2,
      visible: true,
    }],
    getHitbox: () => ({ x, y, width: 8, height: 8 }),
    destroy: function() { this.active = false; },
    collect: function() { this.collected = true; },
    isExpired: function() { return this.lifetime >= this.maxLifetime; },
  };
  return item;
}

function createMockEffect(x: number, y: number, config: unknown): EffectEntity {
  const cfg = config as { effectType: string };
  const effect: EffectEntity = {
    id: `effect_${Math.random().toString(36).slice(2, 9)}`,
    entityType: 'EFFECT',
    x,
    y,
    width: 16,
    height: 16,
    active: true,
    facingDirection: 'DOWN',
    velocityX: 0,
    velocityY: 0,
    spritePriority: 5,
    lifetime: 0,
    maxLifetime: 30,
    animationFrame: 0,
    update: vi.fn(),
    getSpriteCommands: () => [{
      spriteKey: 'effect_sprite',
      x,
      y,
      flipX: false,
      flipY: false,
      priority: 5,
      visible: true,
    }],
    getHitbox: () => ({ x, y, width: 16, height: 16 }),
    destroy: function() { this.active = false; },
    isComplete: function() { return this.lifetime >= this.maxLifetime; },
  };
  return effect;
}

describe('EntityManager', () => {
  let manager: EntityManager;

  beforeEach(() => {
    resetEntityIdCounter();
    manager = new EntityManager();
    // Register factories
    manager.registerEnemyFactory(createMockEnemy);
    manager.registerProjectileFactory(createMockProjectile);
    manager.registerItemFactory(createMockItem);
    manager.registerEffectFactory(createMockEffect);
  });

  describe('factory registration', () => {
    it('should spawn enemies after registering factory', () => {
      const enemy = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      expect(enemy).not.toBeNull();
      expect(enemy?.archetypeId).toBe('OCTOROK_RED');
    });

    it('should return null if no factory registered', () => {
      const noFactoryManager = new EntityManager();
      const enemy = noFactoryManager.spawnEnemy(100, 50, 'OCTOROK_RED');
      expect(enemy).toBeNull();
    });
  });

  describe('spawnEnemy', () => {
    it('should create enemy at specified position', () => {
      const enemy = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      expect(enemy).not.toBeNull();
      expect(enemy?.x).toBe(100);
      expect(enemy?.y).toBe(50);
    });

    it('should add enemy to internal list', () => {
      manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      expect(manager.getActiveEnemyCount()).toBe(1);
    });

    it('should respect MAX_ENEMIES_PER_SCREEN limit', () => {
      for (let i = 0; i < MAX_ENEMIES_PER_SCREEN; i++) {
        const enemy = manager.spawnEnemy(i * 32, 50, 'OCTOROK_RED');
        expect(enemy).not.toBeNull();
      }
      // Next spawn should fail
      const overflow = manager.spawnEnemy(200, 50, 'OCTOROK_RED');
      expect(overflow).toBeNull();
      expect(manager.getActiveEnemyCount()).toBe(MAX_ENEMIES_PER_SCREEN);
    });
  });

  describe('spawnProjectile', () => {
    it('should create projectile at specified position', () => {
      const projectile = manager.spawnProjectile(128, 64, 'UP', 'PLAYER', 'SWORD_BEAM');
      expect(projectile).not.toBeNull();
      expect(projectile?.x).toBe(128);
      expect(projectile?.y).toBe(64);
    });

    it('should set source type correctly', () => {
      const playerProj = manager.spawnProjectile(128, 64, 'UP', 'PLAYER', 'SWORD_BEAM');
      const enemyProj = manager.spawnProjectile(64, 32, 'DOWN', 'ENEMY', 'ROCK');
      expect(playerProj?.sourceType).toBe('PLAYER');
      expect(enemyProj?.sourceType).toBe('ENEMY');
    });
  });

  describe('spawnItem', () => {
    it('should create item at specified position', () => {
      const item = manager.spawnItem(80, 40, 'HEART');
      expect(item).not.toBeNull();
      expect(item?.x).toBe(80);
      expect(item?.y).toBe(40);
      expect(item?.itemType).toBe('HEART');
    });
  });

  describe('spawnEffect', () => {
    it('should create effect at specified position', () => {
      const effect = manager.spawnEffect(120, 60, 'DEATH_PUFF');
      expect(effect).not.toBeNull();
      expect(effect?.x).toBe(120);
      expect(effect?.y).toBe(60);
    });
  });

  describe('addEntity', () => {
    it('should add pre-created enemy', () => {
      const enemy = createMockEnemy(100, 50, { archetypeId: 'TEST' });
      manager.addEntity(enemy);
      expect(manager.getActiveEnemyCount()).toBe(1);
    });

    it('should add pre-created projectile', () => {
      const projectile = createMockProjectile(100, 50, { direction: 'UP', sourceType: 'PLAYER', projectileType: 'SWORD_BEAM' });
      manager.addEntity(projectile);
      expect(manager.getPlayerProjectiles().length).toBe(1);
    });

    it('should add pre-created item', () => {
      const item = createMockItem(100, 50, { itemType: 'HEART' });
      manager.addEntity(item);
      expect(manager.getItems().length).toBe(1);
    });

    it('should add pre-created effect', () => {
      const effect = createMockEffect(100, 50, { effectType: 'PUFF' });
      manager.addEntity(effect);
      expect(manager.getEffects().length).toBe(1);
    });
  });

  describe('queueEnemySpawn', () => {
    it('should queue enemy spawn with delay', () => {
      manager.queueEnemySpawn({ archetypeId: 'OCTOROK_RED', x: 100, y: 50, spawnDelay: 30 });
      expect(manager.getSpawnQueueLength()).toBe(1);
      expect(manager.getActiveEnemyCount()).toBe(0);
    });

    it('should spawn enemy after delay expires', () => {
      manager.queueEnemySpawn({ archetypeId: 'OCTOROK_RED', x: 100, y: 50, spawnDelay: 30 });

      // Update 29 frames - not yet
      manager.update(29);
      expect(manager.getActiveEnemyCount()).toBe(0);

      // Update 1 more frame - should spawn
      manager.update(1);
      expect(manager.getActiveEnemyCount()).toBe(1);
      expect(manager.getSpawnQueueLength()).toBe(0);
    });

    it('should handle zero delay spawn', () => {
      manager.queueEnemySpawn({ archetypeId: 'OCTOROK_RED', x: 100, y: 50, spawnDelay: 0 });
      manager.update(1);
      expect(manager.getActiveEnemyCount()).toBe(1);
    });
  });

  describe('queueEnemySpawns', () => {
    it('should queue multiple enemy spawns', () => {
      manager.queueEnemySpawns([
        { archetypeId: 'OCTOROK_RED', x: 100, y: 50, spawnDelay: 0 },
        { archetypeId: 'TEKTITE_RED', x: 150, y: 50, spawnDelay: 15 },
        { archetypeId: 'KEESE', x: 200, y: 50, spawnDelay: 30 },
      ]);
      expect(manager.getSpawnQueueLength()).toBe(3);
    });
  });

  describe('update', () => {
    it('should call update on all entities', () => {
      const enemy = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      const projectile = manager.spawnProjectile(128, 64, 'UP', 'PLAYER', 'SWORD_BEAM');
      const item = manager.spawnItem(80, 40, 'HEART');
      const effect = manager.spawnEffect(120, 60, 'PUFF');

      manager.update(1);

      expect(enemy?.update).toHaveBeenCalled();
      expect(projectile?.update).toHaveBeenCalled();
      expect(item?.update).toHaveBeenCalled();
      expect(effect?.update).toHaveBeenCalled();
    });

    it('should remove inactive entities', () => {
      const enemy = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      expect(manager.getActiveEnemyCount()).toBe(1);

      enemy!.active = false;
      manager.update(1);

      expect(manager.getActiveEnemyCount()).toBe(0);
    });
  });

  describe('getActiveEnemyCount', () => {
    it('should count enemies that count toward limit', () => {
      const enemy1 = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      const enemy2 = manager.spawnEnemy(150, 50, 'TEKTITE_RED');

      expect(manager.getActiveEnemyCount()).toBe(2);

      // Make one not count toward limit
      enemy1!.countsTowardLimit = false;
      expect(manager.getActiveEnemyCount()).toBe(1);
    });

    it('should not count inactive enemies', () => {
      const enemy = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      expect(manager.getActiveEnemyCount()).toBe(1);

      enemy!.active = false;
      expect(manager.getActiveEnemyCount()).toBe(0);
    });
  });

  describe('getKillCounterEnemyCount', () => {
    it('should count enemies that advance kill counter', () => {
      const enemy1 = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      const enemy2 = manager.spawnEnemy(150, 50, 'TEKTITE_RED');

      expect(manager.getKillCounterEnemyCount()).toBe(2);

      enemy1!.advancesKillCounter = false;
      expect(manager.getKillCounterEnemyCount()).toBe(1);
    });
  });

  describe('isRoomCleared', () => {
    it('should return true when no kill-counter enemies remain', () => {
      expect(manager.isRoomCleared()).toBe(true);

      manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      expect(manager.isRoomCleared()).toBe(false);
    });
  });

  describe('getEnemies', () => {
    it('should return all active enemies', () => {
      manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      manager.spawnEnemy(150, 50, 'TEKTITE_RED');

      const enemies = manager.getEnemies();
      expect(enemies.length).toBe(2);
    });

    it('should not return inactive enemies', () => {
      const enemy = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      enemy!.active = false;

      const enemies = manager.getEnemies();
      expect(enemies.length).toBe(0);
    });
  });

  describe('getPlayerProjectiles', () => {
    it('should return only player projectiles', () => {
      manager.spawnProjectile(100, 50, 'UP', 'PLAYER', 'SWORD_BEAM');
      manager.spawnProjectile(150, 50, 'DOWN', 'ENEMY', 'ROCK');

      const playerProjectiles = manager.getPlayerProjectiles();
      expect(playerProjectiles.length).toBe(1);
      expect(playerProjectiles[0].sourceType).toBe('PLAYER');
    });
  });

  describe('getEnemyProjectiles', () => {
    it('should return only enemy projectiles', () => {
      manager.spawnProjectile(100, 50, 'UP', 'PLAYER', 'SWORD_BEAM');
      manager.spawnProjectile(150, 50, 'DOWN', 'ENEMY', 'ROCK');

      const enemyProjectiles = manager.getEnemyProjectiles();
      expect(enemyProjectiles.length).toBe(1);
      expect(enemyProjectiles[0].sourceType).toBe('ENEMY');
    });
  });

  describe('getItems', () => {
    it('should return uncollected items', () => {
      const item = manager.spawnItem(100, 50, 'HEART');
      expect(manager.getItems().length).toBe(1);

      item!.collected = true;
      expect(manager.getItems().length).toBe(0);
    });
  });

  describe('getEffects', () => {
    it('should return active effects', () => {
      manager.spawnEffect(100, 50, 'PUFF');
      expect(manager.getEffects().length).toBe(1);
    });
  });

  describe('getEntityById', () => {
    it('should find enemy by ID', () => {
      const enemy = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      const found = manager.getEntityById(enemy!.id);
      expect(found).toBe(enemy);
    });

    it('should find projectile by ID', () => {
      const projectile = manager.spawnProjectile(100, 50, 'UP', 'PLAYER', 'SWORD_BEAM');
      const found = manager.getEntityById(projectile!.id);
      expect(found).toBe(projectile);
    });

    it('should find item by ID', () => {
      const item = manager.spawnItem(100, 50, 'HEART');
      const found = manager.getEntityById(item!.id);
      expect(found).toBe(item);
    });

    it('should find effect by ID', () => {
      const effect = manager.spawnEffect(100, 50, 'PUFF');
      const found = manager.getEntityById(effect!.id);
      expect(found).toBe(effect);
    });

    it('should return null for unknown ID', () => {
      const found = manager.getEntityById('unknown_id');
      expect(found).toBeNull();
    });
  });

  describe('getSpriteCommands', () => {
    it('should collect commands from all entity types', () => {
      manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      manager.spawnProjectile(128, 64, 'UP', 'PLAYER', 'SWORD_BEAM');
      manager.spawnItem(80, 40, 'HEART');
      manager.spawnEffect(120, 60, 'PUFF');

      const commands = manager.getSpriteCommands();
      expect(commands.length).toBe(4);
    });

    it('should sort commands by priority (low to high)', () => {
      manager.spawnItem(80, 40, 'HEART'); // priority 2
      manager.spawnEnemy(100, 50, 'OCTOROK_RED'); // priority 3
      manager.spawnProjectile(128, 64, 'UP', 'PLAYER', 'SWORD_BEAM'); // priority 4
      manager.spawnEffect(120, 60, 'PUFF'); // priority 5

      const commands = manager.getSpriteCommands();
      expect(commands[0].priority).toBe(2);
      expect(commands[1].priority).toBe(3);
      expect(commands[2].priority).toBe(4);
      expect(commands[3].priority).toBe(5);
    });

    it('should not include inactive entities', () => {
      const enemy = manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      enemy!.active = false;

      const commands = manager.getSpriteCommands();
      expect(commands.length).toBe(0);
    });

    it('should not include collected items', () => {
      const item = manager.spawnItem(80, 40, 'HEART');
      item!.collected = true;

      const commands = manager.getSpriteCommands();
      expect(commands.length).toBe(0);
    });
  });

  describe('clear methods', () => {
    beforeEach(() => {
      manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      manager.spawnProjectile(128, 64, 'UP', 'PLAYER', 'SWORD_BEAM');
      manager.spawnItem(80, 40, 'HEART');
      manager.spawnEffect(120, 60, 'PUFF');
      manager.queueEnemySpawn({ archetypeId: 'KEESE', x: 200, y: 50, spawnDelay: 30 });
    });

    it('clearEnemies should remove all enemies and queued spawns', () => {
      manager.clearEnemies();
      expect(manager.getActiveEnemyCount()).toBe(0);
      expect(manager.getPlayerProjectiles().length).toBe(1); // Projectiles remain
      // Queued enemy spawn should be removed
      manager.update(31);
      expect(manager.getActiveEnemyCount()).toBe(0);
    });

    it('clearProjectiles should remove all projectiles', () => {
      manager.clearProjectiles();
      expect(manager.getPlayerProjectiles().length).toBe(0);
      expect(manager.getActiveEnemyCount()).toBe(1); // Enemies remain
    });

    it('clearItems should remove all items', () => {
      manager.clearItems();
      expect(manager.getItems().length).toBe(0);
    });

    it('clearEffects should remove all effects', () => {
      manager.clearEffects();
      expect(manager.getEffects().length).toBe(0);
    });

    it('clearAll should remove everything', () => {
      manager.clearAll();
      expect(manager.getTotalEntityCount()).toBe(0);
      expect(manager.getSpawnQueueLength()).toBe(0);
    });
  });

  describe('getTotalEntityCount', () => {
    it('should count all entities', () => {
      manager.spawnEnemy(100, 50, 'OCTOROK_RED');
      manager.spawnProjectile(128, 64, 'UP', 'PLAYER', 'SWORD_BEAM');
      manager.spawnItem(80, 40, 'HEART');
      manager.spawnEffect(120, 60, 'PUFF');

      expect(manager.getTotalEntityCount()).toBe(4);
    });
  });

  describe('singleton', () => {
    it('getEntityManager should return same instance', () => {
      const manager1 = getEntityManager();
      const manager2 = getEntityManager();
      expect(manager1).toBe(manager2);
    });

    it('resetEntityManager should create new instance', () => {
      const manager1 = getEntityManager();
      manager1.spawnEnemy(100, 50, 'OCTOROK_RED');

      resetEntityManager();
      const manager2 = getEntityManager();

      // New manager should be empty
      expect(manager2.getActiveEnemyCount()).toBe(0);
    });
  });
});
