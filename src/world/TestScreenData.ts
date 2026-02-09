// TestScreenData.ts - Hardcoded test screen for development
// Provides a playable screen with mixed collision types for testing

import { TileData, TileCollision } from '../types';
import { TILES_PER_ROW, TILES_PER_COL } from '../constants';

/**
 * Tile IDs for the tileset
 * These map to the asset generator's tile sprites
 */
export const TILE_IDS = {
  GRASS: 0,
  GROUND: 1,
  WATER: 2,
  ROCK: 3,
  TREE: 4,
  BUSH: 5,
  STAIRS: 6,
  PIT: 7,
  WALL: 8,
  DUNGEON_FLOOR: 9,
  DUNGEON_WALL: 10,
  DUNGEON_BLOCK: 11,
  DOOR_OPEN: 12,
  DOOR_LOCKED: 13,
  DOOR_SHUTTER: 14,
} as const;

/**
 * Map tile IDs to collision types
 */
export const TILE_COLLISION_MAP: Record<number, TileCollision> = {
  [TILE_IDS.GRASS]: 'PASSABLE',
  [TILE_IDS.GROUND]: 'PASSABLE',
  [TILE_IDS.WATER]: 'WATER',
  [TILE_IDS.ROCK]: 'SOLID',
  [TILE_IDS.TREE]: 'SOLID',
  [TILE_IDS.BUSH]: 'BUSH',
  [TILE_IDS.STAIRS]: 'STAIRS',
  [TILE_IDS.PIT]: 'PIT',
  [TILE_IDS.WALL]: 'SOLID',
  [TILE_IDS.DUNGEON_FLOOR]: 'PASSABLE',
  [TILE_IDS.DUNGEON_WALL]: 'SOLID',
  [TILE_IDS.DUNGEON_BLOCK]: 'SOLID',
  [TILE_IDS.DOOR_OPEN]: 'PASSABLE',
  [TILE_IDS.DOOR_LOCKED]: 'SOLID',
  [TILE_IDS.DOOR_SHUTTER]: 'SOLID',
};

/**
 * Create a TileData entry
 */
export function makeTile(tileId: number): TileData {
  return {
    tileId,
    collision: TILE_COLLISION_MAP[tileId] ?? 'SOLID',
  };
}

/**
 * Helper to create a row of tiles
 */
function makeRow(...tileIds: number[]): TileData[] {
  if (tileIds.length !== TILES_PER_ROW) {
    throw new Error(`Row must have ${TILES_PER_ROW} tiles, got ${tileIds.length}`);
  }
  return tileIds.map(makeTile);
}

// Shorthand aliases for readability
const G = TILE_IDS.GRASS;    // Passable grass
const D = TILE_IDS.GROUND;   // Passable ground/dirt
const W = TILE_IDS.WATER;    // Water (blocks movement)
const R = TILE_IDS.ROCK;     // Rock/stone (solid)
const T = TILE_IDS.TREE;     // Tree (solid)
const B = TILE_IDS.BUSH;     // Bush (burnable, blocks until burned)
const S = TILE_IDS.STAIRS;   // Stairs (entrance/exit)
const P = TILE_IDS.PIT;      // Pit (damaging)

/**
 * Test screen: Starting area (screen 7,7)
 *
 * Layout:
 * - Bordered by trees/rocks on edges
 * - Open grass area in center for movement
 * - Water pond in corner
 * - Bushes scattered for secrets
 * - Stairs for cave entrance
 *
 * 16 columns x 11 rows
 */
export const TEST_SCREEN_TILES: TileData[] = [
  // Row 0: Top border with trees
  ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
  // Row 1: Trees on sides, grass in middle, rocks
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  // Row 2: Water pond top-left, open area
  ...makeRow(T, W, W, G, G, G, G, G, G, G, G, G, B, G, G, T),
  // Row 3: Water pond continues
  ...makeRow(T, W, W, G, G, G, G, G, G, G, G, G, G, G, G, T),
  // Row 4: Open area with bushes
  ...makeRow(T, G, G, G, G, G, B, G, G, G, G, G, G, G, G, T),
  // Row 5: Center area - mostly open
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  // Row 6: Rocks and path
  ...makeRow(T, G, G, G, G, R, R, G, G, G, R, R, G, G, G, T),
  // Row 7: Path with stairs (cave entrance)
  ...makeRow(T, G, G, G, G, G, G, G, S, G, G, G, G, G, G, T),
  // Row 8: Open area
  ...makeRow(T, G, G, B, G, G, G, G, G, G, G, G, G, B, G, T),
  // Row 9: Near bottom, some rocks
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  // Row 10: Bottom border with trees
  ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
];

/**
 * Test screen 2: Screen to the right of starting (screen 8,7)
 * More open terrain for testing screen transitions
 */
export const TEST_SCREEN_2_TILES: TileData[] = [
  ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  ...makeRow(T, G, G, D, D, G, G, G, G, G, G, D, D, G, G, T), // Dirt path
  ...makeRow(T, G, G, D, D, G, R, G, G, G, R, D, D, G, G, T),
  ...makeRow(T, G, G, D, D, G, G, G, G, G, G, D, D, G, G, T),
  ...makeRow(T, G, G, D, D, G, G, G, P, G, G, D, D, G, G, T), // Pit in center
  ...makeRow(T, G, G, D, D, G, R, G, G, G, R, D, D, G, G, T),
  ...makeRow(T, G, G, D, D, G, G, G, G, G, G, D, D, G, G, T),
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
];

/**
 * Test screen 3: Screen above starting (screen 7,6)
 * Water-heavy area for testing water collision
 */
export const TEST_SCREEN_3_TILES: TileData[] = [
  ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
  ...makeRow(T, G, G, G, G, W, W, W, W, W, W, G, G, G, G, T),
  ...makeRow(T, G, G, G, G, W, W, W, W, W, W, G, G, G, G, T),
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  ...makeRow(T, G, G, G, G, W, W, G, G, W, W, G, G, G, G, T),
  ...makeRow(T, G, G, G, G, W, W, G, G, W, W, G, G, G, G, T),
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
  ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
];

/**
 * Create an empty/blocked screen (all solid)
 * Used for screens that haven't been designed yet
 */
export function createEmptyScreen(): TileData[] {
  const tiles: TileData[] = [];
  for (let i = 0; i < TILES_PER_ROW * TILES_PER_COL; i++) {
    tiles.push(makeTile(TILE_IDS.ROCK));
  }
  return tiles;
}

/**
 * Create a fully passable screen (all grass)
 * Useful for debugging
 */
export function createOpenScreen(): TileData[] {
  const tiles: TileData[] = [];
  for (let i = 0; i < TILES_PER_ROW * TILES_PER_COL; i++) {
    tiles.push(makeTile(TILE_IDS.GRASS));
  }
  return tiles;
}

/**
 * Validate that tile data has the correct number of tiles
 */
export function validateTileData(tiles: TileData[]): boolean {
  return tiles.length === TILES_PER_ROW * TILES_PER_COL;
}
