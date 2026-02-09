// CaveManager.ts - Manages cave state, NPC interactions, and shop functionality
// Handles cave entry/exit, item collection, and shop purchases

import {
  TILE_SIZE,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
} from '../constants';
import type { AABB, TileData } from '../types';
import {
  getCave,
  caveExists,
  CAVE_TILE_COLLISION_MAP,
  type CaveRoom,
  type ShopItem,
} from '../data/caveData';

/**
 * Information needed to render cave shop items
 */
export interface CaveShopDisplay {
  items: Array<{
    item: ShopItem;
    x: number;
    y: number;
    canAfford: boolean;
  }>;
  merchantX: number;
  merchantY: number;
}

/**
 * NPC interaction state
 */
export interface NpcInteractionState {
  isInteracting: boolean;
  npcType: string | null;
  dialogueText: string | null;
  itemToGive: string | null;
  hasGivenItem: boolean;
}

/**
 * Shop purchase result
 */
export interface ShopPurchaseResult {
  success: boolean;
  reason?: 'NOT_IN_SHOP' | 'INVALID_SLOT' | 'INSUFFICIENT_RUPEES' | 'ALREADY_OWNED';
  item?: ShopItem;
  newRupeeCount?: number;
}

/**
 * Cave manager singleton
 */
export class CaveManager {
  private currentCaveId: number | null = null;
  private inCave: boolean = false;

  // Track which caves have had their items collected
  // Key: caveId, Value: true if item collected
  private collectedCaveItems: Set<number> = new Set();

  // Track current shop interaction state
  private selectedShopSlot: number = 0;

  // Track the overworld position to return to
  private exitScreenCol: number = 0;
  private exitScreenRow: number = 0;
  private exitX: number = 0;
  private exitY: number = 0;

  /**
   * Check if currently in a cave
   */
  isInCave(): boolean {
    return this.inCave;
  }

  /**
   * Get current cave ID (null if not in cave)
   */
  getCurrentCaveId(): number | null {
    return this.currentCaveId;
  }

  /**
   * Get current cave data
   */
  getCurrentCave(): CaveRoom | undefined {
    if (this.currentCaveId === null) {
      return undefined;
    }
    return getCave(this.currentCaveId);
  }

  /**
   * Enter a cave from the overworld
   */
  enterCave(
    caveId: number,
    fromScreenCol: number,
    fromScreenRow: number,
    fromX: number,
    fromY: number
  ): boolean {
    if (!caveExists(caveId)) {
      console.error(`Cave ${caveId} does not exist`);
      return false;
    }

    this.currentCaveId = caveId;
    this.inCave = true;

    // Store exit position for return
    this.exitScreenCol = fromScreenCol;
    this.exitScreenRow = fromScreenRow;
    this.exitX = fromX;
    this.exitY = fromY;

    // Reset shop selection
    this.selectedShopSlot = 0;

    return true;
  }

  /**
   * Exit the current cave
   */
  exitCave(): { screenCol: number; screenRow: number; x: number; y: number } | null {
    if (!this.inCave) {
      return null;
    }

    const exitInfo = {
      screenCol: this.exitScreenCol,
      screenRow: this.exitScreenRow,
      x: this.exitX,
      y: this.exitY,
    };

    this.currentCaveId = null;
    this.inCave = false;
    this.selectedShopSlot = 0;

    return exitInfo;
  }

  /**
   * Get the spawn position when entering a cave
   */
  getSpawnPosition(): { x: number; y: number } {
    const cave = this.getCurrentCave();
    if (cave) {
      return { ...cave.exitPosition };
    }
    // Default spawn at center-bottom
    return { x: PLAY_AREA_WIDTH / 2, y: PLAY_AREA_HEIGHT - 32 };
  }

  /**
   * Get the tile data for the current cave
   */
  getCurrentTiles(): TileData[] {
    const cave = this.getCurrentCave();
    if (cave) {
      return [...cave.tiles];
    }
    return [];
  }

  /**
   * Get collision type for a cave tile
   */
  getTileCollision(tileId: number): string {
    return CAVE_TILE_COLLISION_MAP[tileId] ?? 'SOLID';
  }

  /**
   * Check if player is on exit stairs
   */
  isOnExitStairs(playerHitbox: AABB): boolean {
    const cave = this.getCurrentCave();
    if (!cave) return false;

    // Check if player overlaps with exit stairs position
    const exitX = cave.exitPosition.x;
    const exitY = cave.exitPosition.y;

    // Stairs hitbox (2 tiles wide)
    const stairsHitbox: AABB = {
      x: exitX - TILE_SIZE,
      y: exitY - TILE_SIZE / 2,
      width: TILE_SIZE * 2,
      height: TILE_SIZE,
    };

    return (
      playerHitbox.x < stairsHitbox.x + stairsHitbox.width &&
      playerHitbox.x + playerHitbox.width > stairsHitbox.x &&
      playerHitbox.y < stairsHitbox.y + stairsHitbox.height &&
      playerHitbox.y + playerHitbox.height > stairsHitbox.y
    );
  }

  /**
   * Get NPC interaction state for current cave
   */
  getNpcInteraction(): NpcInteractionState {
    const cave = this.getCurrentCave();
    if (!cave || !cave.npc) {
      return {
        isInteracting: false,
        npcType: null,
        dialogueText: null,
        itemToGive: null,
        hasGivenItem: false,
      };
    }

    const hasGivenItem = this.hasCollectedCaveItem(cave.caveId);
    const itemToGive = hasGivenItem ? null : cave.npc.givesItem ?? null;

    return {
      isInteracting: true,
      npcType: cave.npc.type,
      dialogueText: cave.npc.dialogue[0]?.text ?? null,
      itemToGive,
      hasGivenItem,
    };
  }

  /**
   * Check if player is close enough to NPC to interact
   */
  isNearNpc(playerHitbox: AABB): boolean {
    const cave = this.getCurrentCave();
    if (!cave || !cave.npc) return false;

    const npcHitbox: AABB = {
      x: cave.npc.x - 8,
      y: cave.npc.y - 8,
      width: 16,
      height: 16,
    };

    // Check if player is within interaction range (about 2 tiles)
    const interactionRange = TILE_SIZE * 2;
    const playerCenterX = playerHitbox.x + playerHitbox.width / 2;
    const playerCenterY = playerHitbox.y + playerHitbox.height / 2;
    const npcCenterX = npcHitbox.x + npcHitbox.width / 2;
    const npcCenterY = npcHitbox.y + npcHitbox.height / 2;

    const distance = Math.sqrt(
      Math.pow(playerCenterX - npcCenterX, 2) +
      Math.pow(playerCenterY - npcCenterY, 2)
    );

    return distance <= interactionRange;
  }

  /**
   * Collect the item from an NPC cave
   */
  collectCaveItem(): string | null {
    const cave = this.getCurrentCave();
    if (!cave || !cave.npc?.givesItem) {
      return null;
    }

    if (this.hasCollectedCaveItem(cave.caveId)) {
      return null;
    }

    this.collectedCaveItems.add(cave.caveId);
    return cave.npc.givesItem;
  }

  /**
   * Check if cave item has been collected
   */
  hasCollectedCaveItem(caveId: number): boolean {
    return this.collectedCaveItems.has(caveId);
  }

  // ===== SHOP FUNCTIONALITY =====

  /**
   * Check if current cave is a shop
   */
  isInShop(): boolean {
    const cave = this.getCurrentCave();
    return cave?.caveType === 'SHOP';
  }

  /**
   * Get shop items with display positions
   */
  getShopDisplay(playerRupees: number): CaveShopDisplay | null {
    const cave = this.getCurrentCave();
    if (!cave || cave.caveType !== 'SHOP' || !cave.shopItems) {
      return null;
    }

    // Shop item positions (3 slots: left, center, right)
    const slotPositions = [
      { x: 64, y: 72 },   // Left
      { x: 120, y: 72 },  // Center
      { x: 176, y: 72 },  // Right
    ];

    const items = cave.shopItems.map((item) => {
      const pos = slotPositions[item.slotPosition] ?? { x: 120, y: 72 };
      return {
        item,
        x: pos.x,
        y: pos.y,
        canAfford: playerRupees >= item.price,
      };
    });

    return {
      items,
      merchantX: cave.npc?.x ?? 120,
      merchantY: cave.npc?.y ?? 32,
    };
  }

  /**
   * Get currently selected shop slot
   */
  getSelectedShopSlot(): number {
    return this.selectedShopSlot;
  }

  /**
   * Move shop cursor left
   */
  moveShopCursorLeft(): void {
    const cave = this.getCurrentCave();
    if (!cave?.shopItems) return;

    this.selectedShopSlot = Math.max(0, this.selectedShopSlot - 1);
  }

  /**
   * Move shop cursor right
   */
  moveShopCursorRight(): void {
    const cave = this.getCurrentCave();
    if (!cave?.shopItems) return;

    this.selectedShopSlot = Math.min(cave.shopItems.length - 1, this.selectedShopSlot + 1);
  }

  /**
   * Attempt to purchase the selected shop item
   */
  purchaseSelectedItem(playerRupees: number): ShopPurchaseResult {
    if (!this.isInShop()) {
      return { success: false, reason: 'NOT_IN_SHOP' };
    }

    const cave = this.getCurrentCave();
    if (!cave?.shopItems) {
      return { success: false, reason: 'NOT_IN_SHOP' };
    }

    const selectedItem = cave.shopItems.find(
      (item) => item.slotPosition === this.selectedShopSlot
    );

    if (!selectedItem) {
      return { success: false, reason: 'INVALID_SLOT' };
    }

    if (playerRupees < selectedItem.price) {
      return { success: false, reason: 'INSUFFICIENT_RUPEES' };
    }

    return {
      success: true,
      item: selectedItem,
      newRupeeCount: playerRupees - selectedItem.price,
    };
  }

  /**
   * Get shop item at slot position
   */
  getShopItemAtSlot(slot: number): ShopItem | null {
    const cave = this.getCurrentCave();
    if (!cave?.shopItems) return null;

    return cave.shopItems.find((item) => item.slotPosition === slot) ?? null;
  }

  // ===== SAVE/LOAD =====

  /**
   * Export collected cave items for save
   */
  exportCollectedItems(): number[] {
    return Array.from(this.collectedCaveItems);
  }

  /**
   * Load collected cave items from save
   */
  loadCollectedItems(collected: number[]): void {
    this.collectedCaveItems = new Set(collected);
  }

  /**
   * Reset cave manager state
   */
  reset(): void {
    this.currentCaveId = null;
    this.inCave = false;
    this.collectedCaveItems.clear();
    this.selectedShopSlot = 0;
    this.exitScreenCol = 0;
    this.exitScreenRow = 0;
    this.exitX = 0;
    this.exitY = 0;
  }
}

// ===== SINGLETON =====

let caveManagerInstance: CaveManager | null = null;

/**
 * Get the global cave manager instance
 */
export function getCaveManager(): CaveManager {
  if (!caveManagerInstance) {
    caveManagerInstance = new CaveManager();
  }
  return caveManagerInstance;
}

/**
 * Reset the cave manager (for testing or new game)
 */
export function resetCaveManager(): void {
  if (caveManagerInstance) {
    caveManagerInstance.reset();
  }
  caveManagerInstance = null;
}
