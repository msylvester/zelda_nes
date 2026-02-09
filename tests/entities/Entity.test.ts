// tests/entities/Entity.test.ts - Tests for base entity types

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BaseEntity,
  EntityType,
  GameEntity,
  EnemyEntity,
  ProjectileEntity,
  ItemEntity,
  EffectEntity,
  generateEntityId,
  resetEntityIdCounter,
  createHitboxFromEntity,
  createOffsetHitbox,
  isEnemy,
  isProjectile,
  isItem,
  isEffect,
} from '../../src/entities/Entity';
import { SpriteRenderCommand, Direction, EnemyState } from '../../src/types';

// Test implementation of BaseEntity for testing
class TestEntity extends BaseEntity {
  updateCount = 0;

  constructor(x: number, y: number, width: number = 16, height: number = 16) {
    super('ENEMY', x, y, width, height, 'test');
  }

  update(deltaFrame: number): void {
    this.updateCount++;
    this.applyVelocity(deltaFrame);
  }

  getSpriteCommands(): SpriteRenderCommand[] {
    return [this.createSpriteCommand('test_sprite')];
  }
}

// Mock enemy entity for type guard testing
class MockEnemy implements EnemyEntity {
  id = 'mock_enemy';
  entityType: 'ENEMY' = 'ENEMY';
  x = 0;
  y = 0;
  width = 16;
  height = 16;
  active = true;
  facingDirection: Direction = 'DOWN';
  velocityX = 0;
  velocityY = 0;
  spritePriority = 3 as const;
  state: EnemyState = 'ACTIVE';
  hp = 2;
  maxHp = 2;
  contactDamage = 1;
  archetypeId = 'TEST';
  knockbackable = true;
  countsTowardLimit = true;
  advancesKillCounter = true;

  update(): void {}
  getSpriteCommands(): SpriteRenderCommand[] { return []; }
  getHitbox() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
  destroy(): void { this.active = false; }
  takeDamage(): boolean { return true; }
  isVulnerable(): boolean { return true; }
  getContactDamage(): number { return this.contactDamage; }
}

// Mock projectile entity
class MockProjectile implements ProjectileEntity {
  id = 'mock_projectile';
  entityType: 'PROJECTILE' = 'PROJECTILE';
  x = 0;
  y = 0;
  width = 8;
  height = 8;
  active = true;
  facingDirection: Direction = 'UP';
  velocityX = 0;
  velocityY = -2;
  spritePriority = 4 as const;
  damage = 1;
  sourceType: 'PLAYER' = 'PLAYER';
  piercing = false;
  destroyOnHit = true;
  maxRange = 80;
  traveledDistance = 0;

  update(): void {}
  getSpriteCommands(): SpriteRenderCommand[] { return []; }
  getHitbox() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
  destroy(): void { this.active = false; }
  onHit(): void {}
  shouldDestroy(): boolean { return this.traveledDistance >= this.maxRange; }
}

// Mock item entity
class MockItem implements ItemEntity {
  id = 'mock_item';
  entityType: 'ITEM' = 'ITEM';
  x = 0;
  y = 0;
  width = 8;
  height = 8;
  active = true;
  facingDirection: Direction = 'DOWN';
  velocityX = 0;
  velocityY = 0;
  spritePriority = 2 as const;
  itemType = 'HEART';
  lifetime = 0;
  maxLifetime = 600;
  bobOffset = 0;
  collected = false;

  update(): void {}
  getSpriteCommands(): SpriteRenderCommand[] { return []; }
  getHitbox() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
  destroy(): void { this.active = false; }
  collect(): void { this.collected = true; }
  isExpired(): boolean { return this.lifetime >= this.maxLifetime; }
}

// Mock effect entity
class MockEffect implements EffectEntity {
  id = 'mock_effect';
  entityType: 'EFFECT' = 'EFFECT';
  x = 0;
  y = 0;
  width = 16;
  height = 16;
  active = true;
  facingDirection: Direction = 'DOWN';
  velocityX = 0;
  velocityY = 0;
  spritePriority = 5 as const;
  lifetime = 0;
  maxLifetime = 30;
  animationFrame = 0;

  update(): void {}
  getSpriteCommands(): SpriteRenderCommand[] { return []; }
  getHitbox() { return { x: this.x, y: this.y, width: this.width, height: this.height }; }
  destroy(): void { this.active = false; }
  isComplete(): boolean { return this.lifetime >= this.maxLifetime; }
}

describe('Entity module', () => {
  beforeEach(() => {
    resetEntityIdCounter();
  });

  describe('generateEntityId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateEntityId('test');
      const id2 = generateEntityId('test');
      expect(id1).not.toBe(id2);
    });

    it('should use provided prefix', () => {
      const id = generateEntityId('enemy');
      expect(id.startsWith('enemy_')).toBe(true);
    });

    it('should use default prefix', () => {
      const id = generateEntityId();
      expect(id.startsWith('entity_')).toBe(true);
    });

    it('should increment counter', () => {
      const id1 = generateEntityId('test');
      const id2 = generateEntityId('test');
      expect(id1).toBe('test_1');
      expect(id2).toBe('test_2');
    });
  });

  describe('resetEntityIdCounter', () => {
    it('should reset counter to 0', () => {
      generateEntityId('test');
      generateEntityId('test');
      resetEntityIdCounter();
      const id = generateEntityId('test');
      expect(id).toBe('test_1');
    });
  });

  describe('createHitboxFromEntity', () => {
    it('should create hitbox from entity properties', () => {
      const entity = { x: 10, y: 20, width: 16, height: 16, id: 'test', active: true };
      const hitbox = createHitboxFromEntity(entity);
      expect(hitbox).toEqual({ x: 10, y: 20, width: 16, height: 16 });
    });
  });

  describe('createOffsetHitbox', () => {
    it('should create hitbox with offset', () => {
      const hitbox = createOffsetHitbox(10, 20, 8, 8, 4, 8);
      expect(hitbox).toEqual({ x: 14, y: 28, width: 8, height: 8 });
    });

    it('should handle negative offsets', () => {
      const hitbox = createOffsetHitbox(100, 100, 16, 16, -8, -8);
      expect(hitbox).toEqual({ x: 92, y: 92, width: 16, height: 16 });
    });
  });

  describe('BaseEntity', () => {
    it('should initialize with correct values', () => {
      const entity = new TestEntity(100, 50);
      expect(entity.x).toBe(100);
      expect(entity.y).toBe(50);
      expect(entity.width).toBe(16);
      expect(entity.height).toBe(16);
      expect(entity.active).toBe(true);
      expect(entity.entityType).toBe('ENEMY');
    });

    it('should generate unique ID', () => {
      const entity1 = new TestEntity(0, 0);
      const entity2 = new TestEntity(0, 0);
      expect(entity1.id).not.toBe(entity2.id);
    });

    it('should have default facing direction DOWN', () => {
      const entity = new TestEntity(0, 0);
      expect(entity.facingDirection).toBe('DOWN');
    });

    it('should have default velocity of 0', () => {
      const entity = new TestEntity(0, 0);
      expect(entity.velocityX).toBe(0);
      expect(entity.velocityY).toBe(0);
    });

    it('should have default sprite priority of 3', () => {
      const entity = new TestEntity(0, 0);
      expect(entity.spritePriority).toBe(3);
    });

    it('destroy() should set active to false', () => {
      const entity = new TestEntity(0, 0);
      expect(entity.active).toBe(true);
      entity.destroy();
      expect(entity.active).toBe(false);
    });

    it('getHitbox() should return correct hitbox', () => {
      const entity = new TestEntity(10, 20);
      const hitbox = entity.getHitbox();
      expect(hitbox).toEqual({ x: 10, y: 20, width: 16, height: 16 });
    });

    it('applyVelocity should update position', () => {
      const entity = new TestEntity(100, 100);
      entity.velocityX = 2;
      entity.velocityY = -1;
      entity.update(1);
      expect(entity.x).toBe(102);
      expect(entity.y).toBe(99);
    });

    it('applyVelocity should scale with deltaFrame', () => {
      const entity = new TestEntity(100, 100);
      entity.velocityX = 2;
      entity.velocityY = 2;
      entity.update(0.5);
      expect(entity.x).toBe(101);
      expect(entity.y).toBe(101);
    });

    it('getSpriteCommands should return valid command', () => {
      const entity = new TestEntity(50, 75);
      const commands = entity.getSpriteCommands();
      expect(commands.length).toBe(1);
      expect(commands[0]).toEqual({
        spriteKey: 'test_sprite',
        x: 50,
        y: 75,
        flipX: false,
        flipY: false,
        priority: 3,
        visible: true,
      });
    });

    it('getSpriteCommands should reflect active state', () => {
      const entity = new TestEntity(50, 75);
      entity.destroy();
      const commands = entity.getSpriteCommands();
      expect(commands[0].visible).toBe(false);
    });
  });

  describe('type guards', () => {
    it('isEnemy should identify enemy entities', () => {
      const enemy = new MockEnemy();
      const projectile = new MockProjectile();
      expect(isEnemy(enemy)).toBe(true);
      expect(isEnemy(projectile)).toBe(false);
    });

    it('isProjectile should identify projectile entities', () => {
      const enemy = new MockEnemy();
      const projectile = new MockProjectile();
      expect(isProjectile(projectile)).toBe(true);
      expect(isProjectile(enemy)).toBe(false);
    });

    it('isItem should identify item entities', () => {
      const item = new MockItem();
      const enemy = new MockEnemy();
      expect(isItem(item)).toBe(true);
      expect(isItem(enemy)).toBe(false);
    });

    it('isEffect should identify effect entities', () => {
      const effect = new MockEffect();
      const item = new MockItem();
      expect(isEffect(effect)).toBe(true);
      expect(isEffect(item)).toBe(false);
    });
  });

  describe('EnemyEntity interface', () => {
    it('should have combat properties', () => {
      const enemy = new MockEnemy();
      expect(enemy.hp).toBe(2);
      expect(enemy.maxHp).toBe(2);
      expect(enemy.contactDamage).toBe(1);
      expect(enemy.knockbackable).toBe(true);
    });

    it('should have room limit tracking properties', () => {
      const enemy = new MockEnemy();
      expect(enemy.countsTowardLimit).toBe(true);
      expect(enemy.advancesKillCounter).toBe(true);
    });
  });

  describe('ProjectileEntity interface', () => {
    it('should have projectile properties', () => {
      const projectile = new MockProjectile();
      expect(projectile.damage).toBe(1);
      expect(projectile.sourceType).toBe('PLAYER');
      expect(projectile.maxRange).toBe(80);
      expect(projectile.piercing).toBe(false);
    });

    it('shouldDestroy should check range', () => {
      const projectile = new MockProjectile();
      expect(projectile.shouldDestroy()).toBe(false);
      projectile.traveledDistance = 80;
      expect(projectile.shouldDestroy()).toBe(true);
    });
  });

  describe('ItemEntity interface', () => {
    it('should have item properties', () => {
      const item = new MockItem();
      expect(item.itemType).toBe('HEART');
      expect(item.maxLifetime).toBe(600);
      expect(item.collected).toBe(false);
    });

    it('collect should mark as collected', () => {
      const item = new MockItem();
      item.collect();
      expect(item.collected).toBe(true);
    });

    it('isExpired should check lifetime', () => {
      const item = new MockItem();
      expect(item.isExpired()).toBe(false);
      item.lifetime = 600;
      expect(item.isExpired()).toBe(true);
    });
  });

  describe('EffectEntity interface', () => {
    it('should have effect properties', () => {
      const effect = new MockEffect();
      expect(effect.maxLifetime).toBe(30);
      expect(effect.animationFrame).toBe(0);
    });

    it('isComplete should check lifetime', () => {
      const effect = new MockEffect();
      expect(effect.isComplete()).toBe(false);
      effect.lifetime = 30;
      expect(effect.isComplete()).toBe(true);
    });
  });
});
