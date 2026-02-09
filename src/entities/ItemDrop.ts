// ItemDrop.ts - Item drop entities that spawn when enemies die
// Implements spec for collectible items: hearts, rupees, bombs, keys, etc.

import {
  SpriteRenderCommand,
  Direction,
  ItemDropType,
  DropGroup,
} from '../types';
import {
  ITEM_DESPAWN_FRAMES,
  DROP_CHANCE,
  DROP_GROUPS,
} from '../constants';
import {
  BaseEntity,
  ItemEntity,
} from './Entity';

// ===== ITEM DROP CONSTANTS =====

/** Sprite keys for each item type */
export const ITEM_SPRITE_KEYS: Record<ItemDropType, string> = {
  HEART: 'item_heart',
  RUPEE: 'item_rupee_green',
  RUPEE_5: 'item_rupee_blue',
  BOMB: 'item_bomb',
  KEY: 'item_key',
  FAIRY: 'item_fairy',
  CLOCK: 'item_heart', // Use heart as placeholder
  HEART_CONTAINER: 'item_heart_container',
  TRIFORCE_PIECE: 'item_triforce',
};

/** Item drop sizes */
export const ITEM_SIZE = 8;

/** Bob animation parameters */
export const BOB_AMPLITUDE = 2; // Pixels up/down
export const BOB_PERIOD = 60; // Frames for full cycle

/** Fairy movement speed */
export const FAIRY_SPEED = 0.5;
export const FAIRY_DIRECTION_CHANGE_FRAMES = 60;

// ===== ITEM DROP CLASS =====

/**
 * ItemDrop - Collectible item dropped by enemies or found in world
 */
export class ItemDrop extends BaseEntity implements ItemEntity {
  declare entityType: 'ITEM';
  itemType: ItemDropType;
  lifetime: number;
  maxLifetime: number;
  bobOffset: number;
  collected: boolean;

  // Animation state
  private bobTimer: number;

  // Fairy-specific movement
  private moveDirection: Direction;
  private directionTimer: number;

  constructor(
    x: number,
    y: number,
    itemType: ItemDropType,
    lifetime: number = ITEM_DESPAWN_FRAMES
  ) {
    super('ITEM', x, y, ITEM_SIZE, ITEM_SIZE, 'item');
    this.entityType = 'ITEM';
    this.itemType = itemType;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.bobOffset = 0;
    this.collected = false;
    this.bobTimer = 0;
    this.spritePriority = 2; // Items render above background, below enemies

    // Fairy movement
    this.moveDirection = 'UP';
    this.directionTimer = FAIRY_DIRECTION_CHANGE_FRAMES;
  }

  /**
   * Update the item drop each frame
   */
  update(deltaFrame: number): void {
    if (this.collected || !this.active) return;

    // Update lifetime
    this.lifetime -= deltaFrame;
    if (this.lifetime <= 0) {
      this.active = false;
      return;
    }

    // Update bob animation
    this.bobTimer += deltaFrame;
    this.bobOffset = Math.sin((this.bobTimer / BOB_PERIOD) * Math.PI * 2) * BOB_AMPLITUDE;

    // Fairy special movement
    if (this.itemType === 'FAIRY') {
      this.updateFairyMovement(deltaFrame);
    }
  }

  /**
   * Update fairy-specific movement
   */
  private updateFairyMovement(deltaFrame: number): void {
    // Update direction change timer
    this.directionTimer -= deltaFrame;
    if (this.directionTimer <= 0) {
      this.directionTimer = FAIRY_DIRECTION_CHANGE_FRAMES;
      // Random direction change
      const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      this.moveDirection = directions[Math.floor(Math.random() * directions.length)] as Direction;
    }

    // Move in current direction
    const speed = FAIRY_SPEED * deltaFrame;
    switch (this.moveDirection) {
      case 'UP':
        this.y -= speed;
        break;
      case 'DOWN':
        this.y += speed;
        break;
      case 'LEFT':
        this.x -= speed;
        break;
      case 'RIGHT':
        this.x += speed;
        break;
    }

    // Bounce off screen boundaries (play area)
    const minX = 0;
    const maxX = 256 - ITEM_SIZE;
    const minY = 0;
    const maxY = 176 - ITEM_SIZE;

    if (this.x < minX) {
      this.x = minX;
      this.moveDirection = 'RIGHT';
    } else if (this.x > maxX) {
      this.x = maxX;
      this.moveDirection = 'LEFT';
    }

    if (this.y < minY) {
      this.y = minY;
      this.moveDirection = 'DOWN';
    } else if (this.y > maxY) {
      this.y = maxY;
      this.moveDirection = 'UP';
    }
  }

  /**
   * Collect this item
   */
  collect(): void {
    if (!this.collected) {
      this.collected = true;
      this.active = false;
    }
  }

  /**
   * Check if item has expired
   */
  isExpired(): boolean {
    return this.lifetime <= 0;
  }

  /**
   * Get time remaining as fraction (0-1)
   */
  getLifetimeFraction(): number {
    return this.lifetime / this.maxLifetime;
  }

  /**
   * Check if item should flash (near despawn)
   */
  shouldFlash(): boolean {
    // Flash during last 2 seconds (120 frames)
    return this.lifetime < 120 && Math.floor(this.lifetime / 8) % 2 === 0;
  }

  /**
   * Get sprite commands for rendering
   */
  getSpriteCommands(): SpriteRenderCommand[] {
    if (this.collected || !this.active) return [];

    // Don't render during flash-off frames
    if (this.shouldFlash()) return [];

    const spriteKey = ITEM_SPRITE_KEYS[this.itemType];
    return [
      {
        spriteKey,
        x: this.x,
        y: this.y + this.bobOffset,
        flipX: false,
        flipY: false,
        priority: this.spritePriority,
        visible: true,
      },
    ];
  }

  /**
   * Get the item's value for inventory purposes
   */
  getValue(): number {
    switch (this.itemType) {
      case 'RUPEE':
        return 1;
      case 'RUPEE_5':
        return 5;
      case 'HEART':
        return 2; // Half-hearts restored
      case 'FAIRY':
        return 6; // Full heal (3 hearts)
      case 'BOMB':
        return 1;
      case 'KEY':
        return 1;
      default:
        return 1;
    }
  }
}

// ===== ITEM DROP FACTORY =====

/**
 * Create an item drop entity
 */
export function createItemDrop(
  x: number,
  y: number,
  config: { itemType: string }
): ItemDrop {
  return new ItemDrop(x, y, config.itemType as ItemDropType);
}

// ===== DROP TABLE SYSTEM =====

/**
 * Get a random drop from a drop group
 * @param group Drop group A, B, C, or D
 * @param killCounter Current kill counter (0-9, cycles)
 * @returns Item type or null if no drop
 */
export function getDropFromGroup(group: DropGroup, killCounter: number): ItemDropType | null {
  // Only drop if roll succeeds (32% chance)
  if (Math.random() > DROP_CHANCE) {
    return null;
  }

  // Use kill counter to index into drop table
  const dropIndex = killCounter % 4;
  const drops = DROP_GROUPS[group];
  const dropType = drops[dropIndex];

  return dropType as ItemDropType;
}

/**
 * Get enemy drop group based on enemy type
 */
export function getEnemyDropGroup(archetypeId: string): DropGroup {
  // Different enemies have different drop groups
  // Based on original Zelda enemy classifications
  switch (archetypeId) {
    case 'OCTOROK_RED':
    case 'OCTOROK_BLUE':
    case 'TEKTITE_RED':
    case 'TEKTITE_BLUE':
      return 'A';
    case 'MOBLIN_RED':
    case 'MOBLIN_BLUE':
      return 'B';
    case 'KEESE':
      return 'C';
    default:
      return 'A';
  }
}

/**
 * Determine what item (if any) an enemy drops on death
 * @param archetypeId Enemy archetype ID
 * @param killCounter Current kill counter
 * @returns Item type to drop, or null for no drop
 */
export function determineEnemyDrop(
  archetypeId: string,
  killCounter: number
): ItemDropType | null {
  const dropGroup = getEnemyDropGroup(archetypeId);
  return getDropFromGroup(dropGroup, killCounter);
}

/**
 * Spawn an item drop at a position
 * This is the main API for creating item drops from enemy deaths
 */
export function spawnItemDrop(
  x: number,
  y: number,
  itemType: ItemDropType,
  lifetime: number = ITEM_DESPAWN_FRAMES
): ItemDrop {
  return new ItemDrop(x, y, itemType, lifetime);
}

// ===== INVENTORY INTEGRATION =====

/**
 * Apply collected item to inventory
 * @param itemType Type of item collected
 * @param inventory InventoryManager to update
 * @returns true if item was successfully applied
 */
export interface InventoryApplicator {
  getCurrentHP(): number;
  getMaxHP(): number;
  heal(halfHearts: number): void;
  addRupees(count: number): void;
  addKey(): void;
  addBomb(): void;
  addHeartContainer(): void;
}

export function applyItemToInventory(
  itemType: ItemDropType,
  inventory: InventoryApplicator
): boolean {
  switch (itemType) {
    case 'HEART':
      // Only collect if not at full HP
      if (inventory.getCurrentHP() >= inventory.getMaxHP()) {
        return false;
      }
      inventory.heal(2); // 1 heart = 2 half-hearts
      return true;

    case 'FAIRY':
      // Fairies always heal, even if at full (but give full heal)
      inventory.heal(inventory.getMaxHP());
      return true;

    case 'RUPEE':
      inventory.addRupees(1);
      return true;

    case 'RUPEE_5':
      inventory.addRupees(5);
      return true;

    case 'BOMB':
      inventory.addBomb();
      return true;

    case 'KEY':
      inventory.addKey();
      return true;

    case 'HEART_CONTAINER':
      inventory.addHeartContainer();
      return true;

    case 'CLOCK':
      // Clock freezes enemies - handled by game state, not inventory
      return true;

    case 'TRIFORCE_PIECE':
      // Triforce handled by progression system
      return true;

    default:
      return false;
  }
}

/**
 * Check if an item can be collected by the player
 * (Some items like hearts can't be picked up at full health)
 */
export function canCollectItem(
  itemType: ItemDropType,
  currentHP: number,
  maxHP: number
): boolean {
  // Hearts can only be collected if not at full health
  if (itemType === 'HEART' && currentHP >= maxHP) {
    return false;
  }
  // All other items can always be collected
  return true;
}
