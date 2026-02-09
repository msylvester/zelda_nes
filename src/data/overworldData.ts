// overworldData.ts - Overworld screen data for the 16x8 grid
// Provides screen definitions for the overworld map

import { OverworldScreen, TileData } from '../types';
import { OVERWORLD_COLS, OVERWORLD_ROWS, TILES_PER_ROW, TILES_PER_COL, START_SCREEN_COL, START_SCREEN_ROW } from '../constants';
import { TILE_IDS, TILE_COLLISION_MAP, makeTile } from '../world/TestScreenData';

// Re-export utilities for convenience
export { TILE_IDS, TILE_COLLISION_MAP, makeTile };

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
 * Create an empty/blocked screen (all rocks)
 * Used for screens that haven't been designed yet
 */
function createBlockedScreen(col: number, row: number): OverworldScreen {
  const tiles: TileData[] = [];
  for (let i = 0; i < TILES_PER_ROW * TILES_PER_COL; i++) {
    tiles.push(makeTile(TILE_IDS.ROCK));
  }
  return {
    screenCol: col,
    screenRow: row,
    tiles,
    enemySpawns: [],
    entrances: [],
    hiddenItems: [],
    secretsRevealed: false,
    paletteId: 0,
    screenType: 'NORMAL',
  };
}

// ===== DEFINED SCREENS =====

/**
 * Starting screen (7,7) - Link's starting location
 *
 * Layout:
 * - Open center area for movement
 * - Trees on border edges
 * - Cave entrance (stairs) at center-right
 * - Water pond top-left
 * - Scattered bushes for secrets
 */
const SCREEN_7_7: OverworldScreen = {
  screenCol: 7,
  screenRow: 7,
  tiles: [
    // Row 0: Top border with opening for north exit
    ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
    // Row 1: Trees on sides, grass in middle
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    // Row 2: Water pond top-left
    ...makeRow(T, W, W, G, G, G, G, G, G, G, G, G, B, G, G, T),
    // Row 3: Water continues
    ...makeRow(T, W, W, G, G, G, G, G, G, G, G, G, G, G, G, T),
    // Row 4: Open with bush
    ...makeRow(T, G, G, G, G, G, B, G, G, G, G, G, G, G, G, T),
    // Row 5: Mostly open center
    ...makeRow(G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G),  // Left exit open
    // Row 6: Rocks and path
    ...makeRow(T, G, G, G, G, R, R, G, G, G, R, R, G, G, G, T),
    // Row 7: Cave entrance (stairs)
    ...makeRow(T, G, G, G, G, G, G, G, S, G, G, G, G, G, G, T),
    // Row 8: Open with bushes
    ...makeRow(T, G, G, B, G, G, G, G, G, G, G, G, G, B, G, T),
    // Row 9: Near bottom
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    // Row 10: Bottom border with opening
    ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
  ],
  enemySpawns: [
    { archetypeId: 'OCTOROK_RED', x: 64, y: 80, spawnDelay: 0 },
    { archetypeId: 'OCTOROK_RED', x: 176, y: 80, spawnDelay: 30 },
  ],
  entrances: [
    { x: 128, y: 112, destinationType: 'CAVE', destinationId: 0 }, // Starting cave
  ],
  hiddenItems: [
    { x: 96, y: 64, itemType: 'RUPEE', revealCondition: 'BURN' }, // Under bush
  ],
  secretsRevealed: false,
  paletteId: 0,
  screenType: 'NORMAL',
};

/**
 * Screen (8,7) - East of start
 * Open terrain with dirt path
 */
const SCREEN_8_7: OverworldScreen = {
  screenCol: 8,
  screenRow: 7,
  tiles: [
    ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, D, D, G, G, G, G, G, G, D, D, G, G, T),
    ...makeRow(T, G, G, D, D, G, R, G, G, G, R, D, D, G, G, T),
    ...makeRow(T, G, G, D, D, G, G, G, G, G, G, D, D, G, G, T),
    ...makeRow(G, G, G, D, D, G, G, G, P, G, G, D, D, G, G, G),  // Left/right open
    ...makeRow(T, G, G, D, D, G, R, G, G, G, R, D, D, G, G, T),
    ...makeRow(T, G, G, D, D, G, G, G, G, G, G, D, D, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
  ],
  enemySpawns: [
    { archetypeId: 'OCTOROK_RED', x: 96, y: 48, spawnDelay: 0 },
    { archetypeId: 'TEKTITE_RED', x: 160, y: 112, spawnDelay: 15 },
  ],
  entrances: [],
  hiddenItems: [],
  secretsRevealed: false,
  paletteId: 0,
  screenType: 'NORMAL',
};

/**
 * Screen (6,7) - West of start
 * Forest edge with more trees
 */
const SCREEN_6_7: OverworldScreen = {
  screenCol: 6,
  screenRow: 7,
  tiles: [
    ...makeRow(T, T, T, T, T, G, G, G, G, G, G, T, T, T, T, T),
    ...makeRow(T, G, G, T, G, G, G, G, G, G, G, G, T, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, B, G, G, G, G, G, G, G, G, B, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G),  // Right open
    ...makeRow(T, G, G, G, G, G, R, R, R, R, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, B, G, G, G, G, G, G, G, G, B, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, T, T, T, T, G, G, G, G, G, G, T, T, T, T, T),
  ],
  enemySpawns: [
    { archetypeId: 'MOBLIN_RED', x: 128, y: 80, spawnDelay: 0 },
    { archetypeId: 'OCTOROK_BLUE', x: 80, y: 128, spawnDelay: 30 },
  ],
  entrances: [],
  hiddenItems: [],
  secretsRevealed: false,
  paletteId: 0,
  screenType: 'NORMAL',
};

/**
 * Screen (7,6) - North of start
 * Lake area with water
 */
const SCREEN_7_6: OverworldScreen = {
  screenCol: 7,
  screenRow: 6,
  tiles: [
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
  ],
  enemySpawns: [
    { archetypeId: 'TEKTITE_RED', x: 48, y: 64, spawnDelay: 0 },
    { archetypeId: 'TEKTITE_RED', x: 192, y: 64, spawnDelay: 15 },
  ],
  entrances: [],
  hiddenItems: [],
  secretsRevealed: false,
  paletteId: 0,
  screenType: 'NORMAL',
};

/**
 * Screen (7,8) - South of start (technically doesn't exist in original, but for testing)
 * This would be bottom row - kept blocked
 */
// No SCREEN_7_8 - row 7 is already the bottom (0-indexed means row 7 is last)

/**
 * Screen (8,6) - Northeast
 * Mixed terrain with bushes and rocks
 */
const SCREEN_8_6: OverworldScreen = {
  screenCol: 8,
  screenRow: 6,
  tiles: [
    ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, B, B, G, G, G, G, G, G, B, B, G, G, T),
    ...makeRow(T, G, G, B, B, G, G, G, G, G, G, B, B, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, R, R, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G),  // Right open
    ...makeRow(T, G, G, G, G, G, G, R, R, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
  ],
  enemySpawns: [
    { archetypeId: 'KEESE', x: 80, y: 48, spawnDelay: 0 },
    { archetypeId: 'KEESE', x: 160, y: 48, spawnDelay: 15 },
    { archetypeId: 'KEESE', x: 120, y: 96, spawnDelay: 30 },
  ],
  entrances: [],
  hiddenItems: [
    { x: 48, y: 32, itemType: 'HEART', revealCondition: 'BURN' },
    { x: 176, y: 32, itemType: 'RUPEE_5', revealCondition: 'BURN' },
  ],
  secretsRevealed: false,
  paletteId: 0,
  screenType: 'NORMAL',
};

/**
 * Screen (6,6) - Northwest
 * Dense forest area
 */
const SCREEN_6_6: OverworldScreen = {
  screenCol: 6,
  screenRow: 6,
  tiles: [
    ...makeRow(T, T, T, T, T, T, G, G, G, G, T, T, T, T, T, T),
    ...makeRow(T, G, G, G, T, G, G, G, G, G, G, T, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, T, G, G, G, G, G, G, G, G, G, G, T, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, T, G, G, G, G, G, G, G, G, G, G, T, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, T, T, T, T, G, G, G, G, G, G, T, T, T, T, T),
  ],
  enemySpawns: [
    { archetypeId: 'MOBLIN_RED', x: 64, y: 64, spawnDelay: 0 },
    { archetypeId: 'MOBLIN_RED', x: 176, y: 128, spawnDelay: 30 },
  ],
  entrances: [],
  hiddenItems: [],
  secretsRevealed: false,
  paletteId: 0,
  screenType: 'NORMAL',
};

/**
 * Screen (9,7) - Far east
 * Open plains with dungeon entrance
 */
const SCREEN_9_7: OverworldScreen = {
  screenCol: 9,
  screenRow: 7,
  tiles: [
    ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, R, R, R, R, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, R, S, S, R, G, G, G, G, G, T),  // Dungeon entrance
    ...makeRow(G, G, G, G, G, G, R, D, D, R, G, G, G, G, G, T),  // Left open
    ...makeRow(T, G, G, G, G, G, G, D, D, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, D, D, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T),
    ...makeRow(T, T, T, T, G, G, G, G, G, G, G, G, T, T, T, T),
  ],
  enemySpawns: [
    { archetypeId: 'OCTOROK_BLUE', x: 48, y: 96, spawnDelay: 0 },
    { archetypeId: 'OCTOROK_BLUE', x: 192, y: 96, spawnDelay: 15 },
  ],
  entrances: [
    { x: 120, y: 64, destinationType: 'DUNGEON', destinationId: 1 }, // Dungeon 1 entrance
  ],
  hiddenItems: [],
  secretsRevealed: false,
  paletteId: 0,
  screenType: 'DUNGEON_ENTRANCE',
};

/**
 * Screen (5,7) - Far west
 * Rocky mountains blocking further progress
 */
const SCREEN_5_7: OverworldScreen = {
  screenCol: 5,
  screenRow: 7,
  tiles: [
    ...makeRow(R, R, R, R, R, T, T, T, T, T, T, R, R, R, R, R),
    ...makeRow(R, G, G, R, G, G, G, G, G, G, G, G, R, G, G, R),
    ...makeRow(R, G, G, G, G, G, G, G, G, G, G, G, G, G, G, R),
    ...makeRow(R, G, G, G, G, G, G, G, G, G, G, G, G, G, G, R),
    ...makeRow(R, G, G, G, G, G, G, G, G, G, G, G, G, G, G, R),
    ...makeRow(R, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G),  // Right open
    ...makeRow(R, G, G, G, G, R, R, R, R, R, R, G, G, G, G, R),
    ...makeRow(R, G, G, G, G, G, G, G, G, G, G, G, G, G, G, R),
    ...makeRow(R, G, G, G, G, G, G, G, G, G, G, G, G, G, G, R),
    ...makeRow(R, G, G, G, G, G, G, G, G, G, G, G, G, G, G, R),
    ...makeRow(R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R),
  ],
  enemySpawns: [
    { archetypeId: 'TEKTITE_BLUE', x: 96, y: 64, spawnDelay: 0 },
    { archetypeId: 'TEKTITE_BLUE', x: 144, y: 128, spawnDelay: 30 },
  ],
  entrances: [],
  hiddenItems: [],
  secretsRevealed: false,
  paletteId: 1, // Mountain palette
  screenType: 'NORMAL',
};

// ===== OVERWORLD DATA STRUCTURE =====

/**
 * Map of defined screens, keyed by "col,row"
 */
const DEFINED_SCREENS: Map<string, OverworldScreen> = new Map([
  ['7,7', SCREEN_7_7],  // Starting screen
  ['8,7', SCREEN_8_7],  // East of start
  ['6,7', SCREEN_6_7],  // West of start
  ['7,6', SCREEN_7_6],  // North of start
  ['8,6', SCREEN_8_6],  // Northeast
  ['6,6', SCREEN_6_6],  // Northwest
  ['9,7', SCREEN_9_7],  // Far east (dungeon entrance)
  ['5,7', SCREEN_5_7],  // Far west (mountains)
]);

/**
 * Get a screen by coordinates
 * Returns a blocked screen if not defined
 */
export function getOverworldScreen(col: number, row: number): OverworldScreen {
  // Validate bounds
  if (col < 0 || col >= OVERWORLD_COLS || row < 0 || row >= OVERWORLD_ROWS) {
    return createBlockedScreen(col, row);
  }

  const key = `${col},${row}`;
  const screen = DEFINED_SCREENS.get(key);

  if (screen) {
    // Return a copy to prevent mutation
    return { ...screen, tiles: [...screen.tiles] };
  }

  // Return blocked screen for undefined areas
  return createBlockedScreen(col, row);
}

/**
 * Check if a screen is defined (not just blocked)
 */
export function isScreenDefined(col: number, row: number): boolean {
  const key = `${col},${row}`;
  return DEFINED_SCREENS.has(key);
}

/**
 * Get all defined screen coordinates
 */
export function getDefinedScreenCoords(): { col: number; row: number }[] {
  const coords: { col: number; row: number }[] = [];
  for (const key of DEFINED_SCREENS.keys()) {
    const parts = key.split(',');
    const col = Number(parts[0]);
    const row = Number(parts[1]);
    coords.push({ col, row });
  }
  return coords;
}

/**
 * Get the starting screen data
 */
export function getStartingScreen(): OverworldScreen {
  return getOverworldScreen(START_SCREEN_COL, START_SCREEN_ROW);
}

/**
 * Get screens adjacent to a given screen
 * Returns only defined (non-blocked) screens
 */
export function getAdjacentScreens(col: number, row: number): {
  up: OverworldScreen | null;
  down: OverworldScreen | null;
  left: OverworldScreen | null;
  right: OverworldScreen | null;
} {
  return {
    up: row > 0 && isScreenDefined(col, row - 1) ? getOverworldScreen(col, row - 1) : null,
    down: row < OVERWORLD_ROWS - 1 && isScreenDefined(col, row + 1) ? getOverworldScreen(col, row + 1) : null,
    left: col > 0 && isScreenDefined(col - 1, row) ? getOverworldScreen(col - 1, row) : null,
    right: col < OVERWORLD_COLS - 1 && isScreenDefined(col + 1, row) ? getOverworldScreen(col + 1, row) : null,
  };
}

/**
 * Total number of screens in the overworld grid
 */
export const TOTAL_SCREENS = OVERWORLD_COLS * OVERWORLD_ROWS;

/**
 * Number of currently defined (playable) screens
 */
export const DEFINED_SCREEN_COUNT = DEFINED_SCREENS.size;

/**
 * Validate that all defined screens have correct tile counts
 */
export function validateOverworldData(): boolean {
  const expectedTiles = TILES_PER_ROW * TILES_PER_COL;

  for (const [key, screen] of DEFINED_SCREENS) {
    if (screen.tiles.length !== expectedTiles) {
      console.error(`Screen ${key} has ${screen.tiles.length} tiles, expected ${expectedTiles}`);
      return false;
    }
  }

  return true;
}
