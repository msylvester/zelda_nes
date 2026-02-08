// caveData.ts - Cave room definitions for single-screen cave interiors
// Includes NPC caves, shops, and special locations

import { TileData, TileCollision } from '../types';
import { TILES_PER_ROW, TILES_PER_COL } from '../constants';

// ===== CAVE TILE IDS =====
// Cave tiles use a darker palette than overworld

export const CAVE_TILE_IDS = {
  FLOOR: 20,      // Cave floor - passable
  WALL: 21,       // Cave wall - solid
  PILLAR: 22,     // Decorative pillar - solid
  FIRE: 23,       // Torch/fire - passable, decorative
  STAIRS: 6,      // Stairs (same as overworld) - exit
  BLOCK: 11,      // Block (same as dungeon) - solid
} as const;

// Shorthand aliases
const F = CAVE_TILE_IDS.FLOOR;
const W = CAVE_TILE_IDS.WALL;
const P = CAVE_TILE_IDS.PILLAR;
const I = CAVE_TILE_IDS.FIRE;  // 'I' for ignited
const S = CAVE_TILE_IDS.STAIRS;

/**
 * Map cave tile IDs to collision types
 */
export const CAVE_TILE_COLLISION_MAP: Record<number, TileCollision> = {
  [CAVE_TILE_IDS.FLOOR]: 'PASSABLE',
  [CAVE_TILE_IDS.WALL]: 'SOLID',
  [CAVE_TILE_IDS.PILLAR]: 'SOLID',
  [CAVE_TILE_IDS.FIRE]: 'PASSABLE',
  [CAVE_TILE_IDS.STAIRS]: 'STAIRS',
  [CAVE_TILE_IDS.BLOCK]: 'SOLID',
};

/**
 * Create a TileData entry for cave tiles
 */
export function makeCaveTile(tileId: number): TileData {
  return {
    tileId,
    collision: CAVE_TILE_COLLISION_MAP[tileId] ?? 'SOLID',
  };
}

/**
 * Helper to create a row of cave tiles
 */
function makeCaveRow(...tileIds: number[]): TileData[] {
  if (tileIds.length !== TILES_PER_ROW) {
    throw new Error(`Row must have ${TILES_PER_ROW} tiles, got ${tileIds.length}`);
  }
  return tileIds.map(makeCaveTile);
}

// ===== CAVE TYPES =====

export type CaveType =
  | 'NPC_ITEM'      // Old man gives item (sword, etc.)
  | 'NPC_HINT'      // Old man gives advice/hint
  | 'SHOP'          // Shop with purchasable items
  | 'GAMBLE'        // Money-making game
  | 'FAIRY'         // Fairy fountain (restore health)
  | 'POTION_SHOP'   // Potion lady's shop
  | 'LETTER_CAVE';  // Letter delivery location

export type NpcType =
  | 'OLD_MAN'       // Generic old man NPC
  | 'OLD_WOMAN'     // Potion lady
  | 'MERCHANT'      // Shop merchant
  | 'FAIRY';        // Fairy (not really NPC but heals)

// ===== SHOP ITEM DEFINITIONS =====

export interface ShopItem {
  itemType: string;       // Item type identifier
  price: number;          // Price in rupees
  slotPosition: number;   // 0, 1, or 2 for left/center/right
  requiresItem?: string;  // Required item to see this (e.g., letter for potion)
}

export interface NpcDialogue {
  text: string;
  requiresItem?: string;  // Only show if player has this item
}

// ===== CAVE ROOM DEFINITION =====

export interface CaveRoom {
  caveId: number;
  caveType: CaveType;
  tiles: TileData[];
  npc?: {
    type: NpcType;
    x: number;
    y: number;
    dialogue: NpcDialogue[];
    givesItem?: string;       // Item given to player
    takesRupees?: number;     // Rupees taken (for purchases/gambling)
  };
  shopItems?: ShopItem[];     // For shop caves
  exitPosition: { x: number; y: number };  // Where player exits to overworld
}

// ===== CAVE DEFINITIONS =====

/**
 * Cave 0: Starting Cave - Old Man Gives Sword
 * "IT'S DANGEROUS TO GO ALONE! TAKE THIS."
 */
const CAVE_0_SWORD_CAVE: CaveRoom = {
  caveId: 0,
  caveType: 'NPC_ITEM',
  tiles: [
    // Row 0: Top wall
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    // Row 1: Wall with fire torches
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    // Row 2: Open floor
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    // Row 3: Old man position (center) with decorative pillars
    ...makeCaveRow(W, F, F, P, F, F, F, F, F, F, F, F, P, F, F, W),
    // Row 4: Sword pedestal position
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    // Row 5: Open floor
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    // Row 6: Fire torches
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    // Row 7: Open floor
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    // Row 8: Near exit
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    // Row 9: Exit stairs
    ...makeCaveRow(W, F, F, F, F, F, F, S, S, F, F, F, F, F, F, W),
    // Row 10: Bottom wall
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  npc: {
    type: 'OLD_MAN',
    x: 120,    // Center of screen
    y: 48,     // Row 3 area
    dialogue: [
      { text: "IT'S DANGEROUS TO GO\nALONE! TAKE THIS." },
    ],
    givesItem: 'WOODEN_SWORD',
  },
  exitPosition: { x: 120, y: 144 },  // Stairs area
};

/**
 * Cave 1: Hint Cave
 * Old man gives gameplay hint
 */
const CAVE_1_HINT_CAVE: CaveRoom = {
  caveId: 1,
  caveType: 'NPC_HINT',
  tiles: [
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, P, F, F, F, F, F, F, F, F, P, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, S, S, F, F, F, F, F, F, W),
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  npc: {
    type: 'OLD_MAN',
    x: 120,
    y: 48,
    dialogue: [
      { text: "EASTMOST PENNINSULA\nIS THE SECRET." },
    ],
  },
  exitPosition: { x: 120, y: 144 },
};

/**
 * Cave 2: Basic Shop
 * Sells shield, candle, bombs
 */
const CAVE_2_SHOP: CaveRoom = {
  caveId: 2,
  caveType: 'SHOP',
  tiles: [
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, S, S, F, F, F, F, F, F, W),
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  npc: {
    type: 'MERCHANT',
    x: 120,
    y: 32,
    dialogue: [
      { text: "BUY SOMETHIN' WILL YA!" },
    ],
  },
  shopItems: [
    { itemType: 'SHIELD', price: 90, slotPosition: 0 },
    { itemType: 'BLUE_CANDLE', price: 60, slotPosition: 1 },
    { itemType: 'BOMB', price: 20, slotPosition: 2 },
  ],
  exitPosition: { x: 120, y: 144 },
};

/**
 * Cave 3: Expensive Shop
 * Sells blue ring, heart container, food
 */
const CAVE_3_EXPENSIVE_SHOP: CaveRoom = {
  caveId: 3,
  caveType: 'SHOP',
  tiles: [
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, S, S, F, F, F, F, F, F, W),
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  npc: {
    type: 'MERCHANT',
    x: 120,
    y: 32,
    dialogue: [
      { text: "BUY SOMETHIN' WILL YA!" },
    ],
  },
  shopItems: [
    { itemType: 'BLUE_RING', price: 250, slotPosition: 0 },
    { itemType: 'HEART_CONTAINER', price: 100, slotPosition: 1 },
    { itemType: 'FOOD', price: 60, slotPosition: 2 },
  ],
  exitPosition: { x: 120, y: 144 },
};

/**
 * Cave 4: Arrow Shop
 * Sells arrows and bow
 */
const CAVE_4_ARROW_SHOP: CaveRoom = {
  caveId: 4,
  caveType: 'SHOP',
  tiles: [
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, S, S, F, F, F, F, F, F, W),
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  npc: {
    type: 'MERCHANT',
    x: 120,
    y: 32,
    dialogue: [
      { text: "BUY SOMETHIN' WILL YA!" },
    ],
  },
  shopItems: [
    { itemType: 'BOW', price: 80, slotPosition: 0 },
    { itemType: 'ARROW', price: 80, slotPosition: 1 },
    { itemType: 'KEY', price: 100, slotPosition: 2 },
  ],
  exitPosition: { x: 120, y: 144 },
};

/**
 * Cave 5: Boomerang Cave
 * Old man gives boomerang
 */
const CAVE_5_BOOMERANG_CAVE: CaveRoom = {
  caveId: 5,
  caveType: 'NPC_ITEM',
  tiles: [
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, P, F, F, F, F, F, F, F, F, P, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, I, F, F, F, F, I, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeCaveRow(W, F, F, F, F, F, F, S, S, F, F, F, F, F, F, W),
    ...makeCaveRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  npc: {
    type: 'OLD_MAN',
    x: 120,
    y: 48,
    dialogue: [
      { text: "TAKE ANY ROAD YOU\nWANT." },
    ],
    givesItem: 'BOOMERANG',
  },
  exitPosition: { x: 120, y: 144 },
};

// ===== CAVE REGISTRY =====

const CAVES: Map<number, CaveRoom> = new Map([
  [0, CAVE_0_SWORD_CAVE],
  [1, CAVE_1_HINT_CAVE],
  [2, CAVE_2_SHOP],
  [3, CAVE_3_EXPENSIVE_SHOP],
  [4, CAVE_4_ARROW_SHOP],
  [5, CAVE_5_BOOMERANG_CAVE],
]);

// ===== HELPER FUNCTIONS =====

/**
 * Get a cave by ID
 */
export function getCave(caveId: number): CaveRoom | undefined {
  const cave = CAVES.get(caveId);
  if (cave) {
    // Return a copy to prevent mutation
    return {
      ...cave,
      tiles: [...cave.tiles],
      npc: cave.npc ? { ...cave.npc, dialogue: [...cave.npc.dialogue] } : undefined,
      shopItems: cave.shopItems ? [...cave.shopItems] : undefined,
    };
  }
  return undefined;
}

/**
 * Check if a cave exists
 */
export function caveExists(caveId: number): boolean {
  return CAVES.has(caveId);
}

/**
 * Get all defined cave IDs
 */
export function getAllCaveIds(): number[] {
  return Array.from(CAVES.keys());
}

/**
 * Get the number of defined caves
 */
export function getCaveCount(): number {
  return CAVES.size;
}

/**
 * Check if a cave is a shop
 */
export function isCaveShop(caveId: number): boolean {
  const cave = CAVES.get(caveId);
  return cave?.caveType === 'SHOP';
}

/**
 * Check if a cave has an NPC that gives an item
 */
export function caveGivesItem(caveId: number): boolean {
  const cave = CAVES.get(caveId);
  return cave?.npc?.givesItem !== undefined;
}

/**
 * Get the item a cave's NPC gives (if any)
 */
export function getCaveItem(caveId: number): string | undefined {
  const cave = CAVES.get(caveId);
  return cave?.npc?.givesItem;
}

/**
 * Get the shop items for a cave
 */
export function getCaveShopItems(caveId: number): ShopItem[] | undefined {
  const cave = CAVES.get(caveId);
  return cave?.shopItems ? [...cave.shopItems] : undefined;
}

/**
 * Get the NPC dialogue for a cave
 */
export function getCaveDialogue(caveId: number): string | undefined {
  const cave = CAVES.get(caveId);
  const dialogue = cave?.npc?.dialogue[0];
  return dialogue?.text;
}

/**
 * Validate cave data integrity
 */
export function validateCaveData(): boolean {
  const expectedTiles = TILES_PER_ROW * TILES_PER_COL;

  for (const [id, cave] of CAVES) {
    if (cave.tiles.length !== expectedTiles) {
      console.error(`Cave ${id} has ${cave.tiles.length} tiles, expected ${expectedTiles}`);
      return false;
    }

    // Check that shop caves have shop items
    if (cave.caveType === 'SHOP' && (!cave.shopItems || cave.shopItems.length === 0)) {
      console.error(`Cave ${id} is a shop but has no shop items`);
      return false;
    }

    // Check that NPC_ITEM caves have an item to give
    if (cave.caveType === 'NPC_ITEM' && !cave.npc?.givesItem) {
      console.error(`Cave ${id} is NPC_ITEM type but NPC has no item to give`);
      return false;
    }
  }

  return true;
}

// ===== SHOP ITEM PRICES (for reference) =====

export const SHOP_PRICES = {
  SHIELD: 90,
  BLUE_CANDLE: 60,
  BOMB: 20,
  BLUE_RING: 250,
  HEART_CONTAINER: 100,
  FOOD: 60,
  BOW: 80,
  ARROW: 80,
  KEY: 100,
  BLUE_POTION: 40,
  RED_POTION: 68,
} as const;
