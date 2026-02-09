// Entity.ts - Base entity types and interfaces for game entities
// Implements spec section 5.6 - Entity Management

import {
  Entity,
  AABB,
  Direction,
  SpriteRenderCommand,
  SpritePriority,
  EnemyState,
} from '../types';

/**
 * Entity types for categorization
 */
export type EntityType = 'PLAYER' | 'ENEMY' | 'PROJECTILE' | 'ITEM' | 'EFFECT';

/**
 * Extended entity interface with common game entity properties
 */
export interface GameEntity extends Entity {
  entityType: EntityType;
  facingDirection: Direction;
  velocityX: number;
  velocityY: number;
  spritePriority: SpritePriority;

  // Lifecycle
  update(deltaFrame: number): void;
  getSpriteCommands(): SpriteRenderCommand[];
  getHitbox(): AABB;
  destroy(): void;
}

/**
 * Enemy entity interface
 */
export interface EnemyEntity extends GameEntity {
  entityType: 'ENEMY';
  state: EnemyState;
  hp: number;
  maxHp: number;
  contactDamage: number;
  archetypeId: string;
  knockbackable: boolean;
  countsTowardLimit: boolean;
  advancesKillCounter: boolean;

  // Combat
  takeDamage(amount: number, fromDirection: Direction): boolean;
  isVulnerable(): boolean;
  getContactDamage(): number;
}

/**
 * Projectile entity interface
 */
export interface ProjectileEntity extends GameEntity {
  entityType: 'PROJECTILE';
  damage: number;
  sourceType: 'PLAYER' | 'ENEMY';
  piercing: boolean;
  destroyOnHit: boolean;
  maxRange: number;
  traveledDistance: number;

  // Projectile specific
  onHit(target: GameEntity): void;
  shouldDestroy(): boolean;
}

/**
 * Item drop entity interface
 */
export interface ItemEntity extends GameEntity {
  entityType: 'ITEM';
  itemType: string;
  lifetime: number;
  maxLifetime: number;
  bobOffset: number;
  collected: boolean;

  // Item specific
  collect(): void;
  isExpired(): boolean;
}

/**
 * Visual effect entity interface (particles, flashes, etc.)
 */
export interface EffectEntity extends GameEntity {
  entityType: 'EFFECT';
  lifetime: number;
  maxLifetime: number;
  animationFrame: number;

  // Effect specific
  isComplete(): boolean;
}

/**
 * Generate unique entity IDs
 */
let entityIdCounter = 0;
export function generateEntityId(prefix: string = 'entity'): string {
  return `${prefix}_${++entityIdCounter}`;
}

/**
 * Reset entity ID counter (useful for testing)
 */
export function resetEntityIdCounter(): void {
  entityIdCounter = 0;
}

/**
 * Create a basic AABB hitbox from entity position and size
 */
export function createHitboxFromEntity(entity: Entity): AABB {
  return {
    x: entity.x,
    y: entity.y,
    width: entity.width,
    height: entity.height,
  };
}

/**
 * Create a hitbox with offset (e.g., for player feet hitbox)
 */
export function createOffsetHitbox(
  x: number,
  y: number,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number
): AABB {
  return {
    x: x + offsetX,
    y: y + offsetY,
    width,
    height,
  };
}

/**
 * Base class for game entities providing common functionality
 */
export abstract class BaseEntity implements GameEntity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  entityType: EntityType;
  facingDirection: Direction;
  velocityX: number;
  velocityY: number;
  spritePriority: SpritePriority;

  constructor(
    entityType: EntityType,
    x: number,
    y: number,
    width: number,
    height: number,
    idPrefix?: string
  ) {
    this.id = generateEntityId(idPrefix ?? entityType.toLowerCase());
    this.entityType = entityType;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.active = true;
    this.facingDirection = 'DOWN';
    this.velocityX = 0;
    this.velocityY = 0;
    this.spritePriority = 3; // Default middle priority
  }

  abstract update(deltaFrame: number): void;
  abstract getSpriteCommands(): SpriteRenderCommand[];

  getHitbox(): AABB {
    return createHitboxFromEntity(this);
  }

  destroy(): void {
    this.active = false;
  }

  /**
   * Apply velocity to position
   */
  protected applyVelocity(deltaFrame: number): void {
    this.x += this.velocityX * deltaFrame;
    this.y += this.velocityY * deltaFrame;
  }

  /**
   * Create a basic sprite command for this entity
   */
  protected createSpriteCommand(
    spriteKey: string,
    flipX: boolean = false,
    flipY: boolean = false
  ): SpriteRenderCommand {
    return {
      spriteKey,
      x: this.x,
      y: this.y,
      flipX,
      flipY,
      priority: this.spritePriority,
      visible: this.active,
    };
  }
}

/**
 * Type guard to check if an entity is an enemy
 */
export function isEnemy(entity: GameEntity): entity is EnemyEntity {
  return entity.entityType === 'ENEMY';
}

/**
 * Type guard to check if an entity is a projectile
 */
export function isProjectile(entity: GameEntity): entity is ProjectileEntity {
  return entity.entityType === 'PROJECTILE';
}

/**
 * Type guard to check if an entity is an item
 */
export function isItem(entity: GameEntity): entity is ItemEntity {
  return entity.entityType === 'ITEM';
}

/**
 * Type guard to check if an entity is an effect
 */
export function isEffect(entity: GameEntity): entity is EffectEntity {
  return entity.entityType === 'EFFECT';
}
