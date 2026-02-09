// ItemEffects.ts - Per-item use logic for B-button items
// Handles the effects of using each B-item type

import type { Direction, BItemSlot } from '../types';
import type { InventoryManager } from './InventoryManager';

/**
 * Result of using a B-item
 */
export interface ItemUseResult {
  success: boolean;
  consumed: boolean; // Whether the item was consumed (for consumables like bombs)
  message?: string;
  spawnProjectile?: {
    type: 'BOOMERANG' | 'BOMB' | 'ARROW' | 'CANDLE_FLAME' | 'MAGIC_ROD_BEAM';
    x: number;
    y: number;
    direction: Direction;
    isMagic?: boolean;
  };
  effect?: {
    type: 'RECORDER' | 'FOOD' | 'POTION';
    data?: unknown;
  };
}

/**
 * Context for using a B-item
 */
export interface ItemUseContext {
  playerX: number;
  playerY: number;
  playerDirection: Direction;
  canSpawnProjectile: boolean; // false if a projectile of this type already exists
  inventoryManager: InventoryManager;
}

/**
 * Use the currently selected B-item
 * Returns the result of the item use attempt
 */
export function useBItem(
  item: BItemSlot,
  context: ItemUseContext
): ItemUseResult {
  switch (item) {
    case 'BOOMERANG':
      return useBoomerang(context);
    case 'BOMB':
      return useBomb(context);
    case 'BOW_ARROW':
      return useBowArrow(context);
    case 'CANDLE':
      return useCandle(context);
    case 'RECORDER':
      return useRecorder(context);
    case 'FOOD':
      return useFood(context);
    case 'POTION':
      return usePotion(context);
    case 'MAGIC_ROD':
      return useMagicRod(context);
    default:
      return { success: false, consumed: false, message: 'Unknown item' };
  }
}

/**
 * Use the boomerang
 * Throws a boomerang that travels forward then returns to Link
 */
function useBoomerang(context: ItemUseContext): ItemUseResult {
  const { playerX, playerY, playerDirection, canSpawnProjectile, inventoryManager } = context;

  // Check if boomerang already exists (only one at a time)
  if (!canSpawnProjectile) {
    return { success: false, consumed: false, message: 'Boomerang already active' };
  }

  // Check if player has boomerang
  const inventory = inventoryManager.getInventory();
  if (!inventory.hasBoomerang) {
    return { success: false, consumed: false, message: 'No boomerang' };
  }

  // Calculate spawn position based on player position and direction
  const spawnPos = getProjectileSpawnPosition(playerX, playerY, playerDirection);

  return {
    success: true,
    consumed: false, // Boomerang is not consumed
    spawnProjectile: {
      type: 'BOOMERANG',
      x: spawnPos.x,
      y: spawnPos.y,
      direction: playerDirection,
      isMagic: inventory.boomerangType === 'magic',
    },
  };
}

/**
 * Use a bomb
 * Places a bomb at Link's position that explodes after a delay
 */
function useBomb(context: ItemUseContext): ItemUseResult {
  const { playerX, playerY, playerDirection, inventoryManager } = context;

  // Check if player has bombs
  if (!inventoryManager.useBomb()) {
    return { success: false, consumed: false, message: 'No bombs' };
  }

  return {
    success: true,
    consumed: true, // Bomb is consumed
    spawnProjectile: {
      type: 'BOMB',
      x: playerX,
      y: playerY,
      direction: playerDirection,
    },
  };
}

/**
 * Use the bow and arrow
 * Shoots an arrow in the direction Link is facing
 */
function useBowArrow(context: ItemUseContext): ItemUseResult {
  const { playerX, playerY, playerDirection, canSpawnProjectile, inventoryManager } = context;

  // Check if arrow already exists (only one at a time in NES)
  if (!canSpawnProjectile) {
    return { success: false, consumed: false, message: 'Arrow already active' };
  }

  // Check if player has bow and arrows
  const inventory = inventoryManager.getInventory();
  if (!inventory.hasBow || !inventory.arrowType) {
    return { success: false, consumed: false, message: 'No bow or arrows' };
  }

  // Arrows cost 1 rupee to fire in original game
  if (!inventoryManager.spendRupees(1)) {
    return { success: false, consumed: false, message: 'No rupees' };
  }

  // Calculate spawn position
  const spawnPos = getProjectileSpawnPosition(playerX, playerY, playerDirection);

  return {
    success: true,
    consumed: true, // Rupee consumed
    spawnProjectile: {
      type: 'ARROW',
      x: spawnPos.x,
      y: spawnPos.y,
      direction: playerDirection,
      isMagic: inventory.arrowType === 'silver',
    },
  };
}

/**
 * Use the candle
 * Shoots a flame in the direction Link is facing
 */
function useCandle(context: ItemUseContext): ItemUseResult {
  const { playerX, playerY, playerDirection, canSpawnProjectile, inventoryManager } = context;

  // Check if flame already exists (blue candle: once per screen)
  if (!canSpawnProjectile) {
    return { success: false, consumed: false, message: 'Flame already active' };
  }

  // Check if player has candle
  const inventory = inventoryManager.getInventory();
  if (!inventory.candleType) {
    return { success: false, consumed: false, message: 'No candle' };
  }

  // Calculate spawn position
  const spawnPos = getProjectileSpawnPosition(playerX, playerY, playerDirection);

  return {
    success: true,
    consumed: false, // Candle not consumed (but blue candle limited to once per screen)
    spawnProjectile: {
      type: 'CANDLE_FLAME',
      x: spawnPos.x,
      y: spawnPos.y,
      direction: playerDirection,
    },
  };
}

/**
 * Use the recorder
 * Plays music that can reveal secrets or warp
 */
function useRecorder(context: ItemUseContext): ItemUseResult {
  const { inventoryManager } = context;

  // Check if player has recorder
  const inventory = inventoryManager.getInventory();
  if (!inventory.hasRecorder) {
    return { success: false, consumed: false, message: 'No recorder' };
  }

  return {
    success: true,
    consumed: false,
    effect: {
      type: 'RECORDER',
    },
  };
}

/**
 * Use food
 * Places food that attracts or distracts enemies
 */
function useFood(context: ItemUseContext): ItemUseResult {
  const { inventoryManager } = context;

  // Check if player has food
  const inventory = inventoryManager.getInventory();
  if (!inventory.hasFood) {
    return { success: false, consumed: false, message: 'No food' };
  }

  return {
    success: true,
    consumed: false, // Food can be reused
    effect: {
      type: 'FOOD',
    },
  };
}

/**
 * Use a potion
 * Restores health (potion is consumed)
 */
function usePotion(context: ItemUseContext): ItemUseResult {
  const { inventoryManager } = context;

  // Check if player has potion
  const inventory = inventoryManager.getInventory();
  if (inventory.potionState !== 'potion1' && inventory.potionState !== 'potion2') {
    return { success: false, consumed: false, message: 'No potion' };
  }

  // Heal player to full
  const maxHP = inventoryManager.getMaxHP();
  inventoryManager.setCurrentHP(maxHP);

  // Potion 2 becomes potion 1 after use, potion 1 is consumed
  // For now, just mark it as consumed
  return {
    success: true,
    consumed: true,
    effect: {
      type: 'POTION',
    },
  };
}

/**
 * Use the magic rod
 * Shoots a magic beam, with flames if player has the book
 */
function useMagicRod(context: ItemUseContext): ItemUseResult {
  const { playerX, playerY, playerDirection, canSpawnProjectile, inventoryManager } = context;

  // Check if beam already exists
  if (!canSpawnProjectile) {
    return { success: false, consumed: false, message: 'Magic beam already active' };
  }

  // Check if player has magic rod
  const inventory = inventoryManager.getInventory();
  if (!inventory.hasMagicRod) {
    return { success: false, consumed: false, message: 'No magic rod' };
  }

  // Calculate spawn position
  const spawnPos = getProjectileSpawnPosition(playerX, playerY, playerDirection);

  return {
    success: true,
    consumed: false,
    spawnProjectile: {
      type: 'MAGIC_ROD_BEAM',
      x: spawnPos.x,
      y: spawnPos.y,
      direction: playerDirection,
      isMagic: inventory.hasBook, // With book, beam leaves flames
    },
  };
}

/**
 * Get the spawn position for a projectile based on player position and direction
 */
function getProjectileSpawnPosition(
  playerX: number,
  playerY: number,
  direction: Direction
): { x: number; y: number } {
  // Spawn projectile adjacent to player in facing direction
  switch (direction) {
    case 'UP':
      return { x: playerX + 4, y: playerY - 8 };
    case 'DOWN':
      return { x: playerX + 4, y: playerY + 16 };
    case 'LEFT':
      return { x: playerX - 8, y: playerY + 4 };
    case 'RIGHT':
      return { x: playerX + 16, y: playerY + 4 };
  }
}

/**
 * Check if a B-item can be used (has item and meets conditions)
 */
export function canUseBItem(
  item: BItemSlot,
  inventoryManager: InventoryManager,
  hasActiveProjectile: boolean
): boolean {
  const inventory = inventoryManager.getInventory();

  switch (item) {
    case 'BOOMERANG':
      return inventory.hasBoomerang && !hasActiveProjectile;
    case 'BOMB':
      return inventory.bombCount > 0;
    case 'BOW_ARROW':
      return inventory.hasBow && !!inventory.arrowType && inventory.rupees > 0 && !hasActiveProjectile;
    case 'CANDLE':
      return !!inventory.candleType && !hasActiveProjectile;
    case 'RECORDER':
      return inventory.hasRecorder;
    case 'FOOD':
      return inventory.hasFood;
    case 'POTION':
      return inventory.potionState === 'potion1' || inventory.potionState === 'potion2';
    case 'MAGIC_ROD':
      return inventory.hasMagicRod && !hasActiveProjectile;
    default:
      return false;
  }
}
