// dungeonData.ts - Dungeon room data for all dungeons
// Provides room definitions for the 8x8 dungeon grids

import { DungeonRoom, DungeonDefinition, TileData, DoorConfig, DoorState } from '../types';
import { TILES_PER_ROW, TILES_PER_COL, DUNGEON_GRID_WIDTH, DUNGEON_GRID_HEIGHT } from '../constants';

// ===== DUNGEON TILE IDS =====
// These map to the asset generator's dungeon tile sprites

export const DUNGEON_TILE_IDS = {
  FLOOR: 9,       // DUNGEON_FLOOR - passable
  WALL: 10,       // DUNGEON_WALL - solid (top/side borders)
  BLOCK: 11,      // DUNGEON_BLOCK - solid pushable blocks
  DOOR_OPEN: 12,  // Open doorway
  DOOR_LOCKED: 13, // Locked door (requires key)
  DOOR_SHUTTER: 14, // Shutter door (opens when enemies defeated)
  WATER: 2,       // Water hazard
  STAIRS: 6,      // Stairs (entrance/exit)
  PIT: 7,         // Pit hazard
} as const;

// Shorthand aliases
const F = DUNGEON_TILE_IDS.FLOOR;
const W = DUNGEON_TILE_IDS.WALL;
const B = DUNGEON_TILE_IDS.BLOCK;
const DO = DUNGEON_TILE_IDS.DOOR_OPEN;
const DL = DUNGEON_TILE_IDS.DOOR_LOCKED;
const DS = DUNGEON_TILE_IDS.DOOR_SHUTTER;
const WA = DUNGEON_TILE_IDS.WATER;
const S = DUNGEON_TILE_IDS.STAIRS;
// PIT available for future rooms: const _P = DUNGEON_TILE_IDS.PIT;

/**
 * Map dungeon tile IDs to collision types (extends base tile collision map)
 */
import { TileCollision } from '../types';
export const DUNGEON_TILE_COLLISION_MAP: Record<number, TileCollision> = {
  [DUNGEON_TILE_IDS.FLOOR]: 'PASSABLE',
  [DUNGEON_TILE_IDS.WALL]: 'SOLID',
  [DUNGEON_TILE_IDS.BLOCK]: 'ROCK', // Pushable
  [DUNGEON_TILE_IDS.DOOR_OPEN]: 'PASSABLE',
  [DUNGEON_TILE_IDS.DOOR_LOCKED]: 'SOLID',
  [DUNGEON_TILE_IDS.DOOR_SHUTTER]: 'SOLID',
  [DUNGEON_TILE_IDS.WATER]: 'WATER',
  [DUNGEON_TILE_IDS.STAIRS]: 'STAIRS',
  [DUNGEON_TILE_IDS.PIT]: 'PIT',
};

/**
 * Create a TileData entry for dungeon tiles
 */
export function makeDungeonTile(tileId: number): TileData {
  return {
    tileId,
    collision: DUNGEON_TILE_COLLISION_MAP[tileId] ?? 'SOLID',
  };
}

/**
 * Helper to create a row of dungeon tiles
 */
function makeDungeonRow(...tileIds: number[]): TileData[] {
  if (tileIds.length !== TILES_PER_ROW) {
    throw new Error(`Row must have ${TILES_PER_ROW} tiles, got ${tileIds.length}`);
  }
  return tileIds.map(makeDungeonTile);
}

/**
 * Helper to create doors config
 */
function makeDoors(
  up: DoorState = 'WALL',
  down: DoorState = 'WALL',
  left: DoorState = 'WALL',
  right: DoorState = 'WALL'
): DoorConfig {
  return { up, down, left, right };
}

// ===== DUNGEON 1: EAGLE (LEVEL-1) =====
// Original NES Dungeon 1 shape resembles an eagle
// Located at overworld screen (9,7)

/**
 * Room 1-1: Entrance room (entrance from overworld)
 * Position: (3, 7) - bottom center
 */
const DUNGEON_1_ENTRANCE: DungeonRoom = {
  roomCol: 3,
  roomRow: 7,
  tiles: [
    ...makeDungeonRow(W, W, W, W, W, W, W, DO, DO, W, W, W, W, W, W, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, S, S, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  doors: makeDoors('OPEN', 'WALL', 'WALL', 'WALL'),
  enemySpawns: [], // Entrance is safe
  items: [],
  isDark: false,
  roomType: 'ENTRANCE',
  paletteId: 0,
};

/**
 * Room 1-2: First combat room with Stalfos
 * Position: (3, 6) - above entrance
 */
const DUNGEON_1_ROOM_2: DungeonRoom = {
  roomCol: 3,
  roomRow: 6,
  tiles: [
    ...makeDungeonRow(W, W, W, W, W, W, W, DO, DO, W, W, W, W, W, W, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, B, F, F, F, F, F, F, F, F, B, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(DO, F, F, F, F, F, F, F, F, F, F, F, F, F, F, DO),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, B, F, F, F, F, F, F, F, F, B, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, W, W, W, W, W, W, DO, DO, W, W, W, W, W, W, W),
  ],
  doors: makeDoors('OPEN', 'OPEN', 'OPEN', 'OPEN'),
  enemySpawns: [
    { archetypeId: 'STALFOS_GREEN', x: 64, y: 64, spawnDelay: 0 },
    { archetypeId: 'STALFOS_GREEN', x: 176, y: 64, spawnDelay: 15 },
    { archetypeId: 'STALFOS_GREEN', x: 120, y: 112, spawnDelay: 30 },
  ],
  items: [],
  isDark: false,
  roomType: 'NORMAL',
  paletteId: 0,
};

/**
 * Room 1-3: Key room with Keese
 * Position: (2, 6) - left of room 2
 */
const DUNGEON_1_KEY_ROOM: DungeonRoom = {
  roomCol: 2,
  roomRow: 6,
  tiles: [
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, DO),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  doors: makeDoors('WALL', 'WALL', 'WALL', 'OPEN'),
  enemySpawns: [
    { archetypeId: 'KEESE', x: 80, y: 48, spawnDelay: 0 },
    { archetypeId: 'KEESE', x: 160, y: 48, spawnDelay: 15 },
    { archetypeId: 'KEESE', x: 80, y: 128, spawnDelay: 30 },
    { archetypeId: 'KEESE', x: 160, y: 128, spawnDelay: 45 },
  ],
  items: [
    { x: 120, y: 88, itemType: 'KEY', requiresKillAll: true },
  ],
  isDark: false,
  roomType: 'ITEM',
  paletteId: 0,
};

/**
 * Room 1-4: Right branch combat room
 * Position: (4, 6) - right of room 2
 */
const DUNGEON_1_ROOM_4: DungeonRoom = {
  roomCol: 4,
  roomRow: 6,
  tiles: [
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, WA, WA, WA, WA, WA, WA, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, WA, WA, WA, WA, WA, WA, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(DO, F, F, F, F, F, F, F, F, F, F, F, F, F, F, DO),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, WA, WA, WA, WA, WA, WA, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, WA, WA, WA, WA, WA, WA, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  doors: makeDoors('WALL', 'WALL', 'OPEN', 'OPEN'),
  enemySpawns: [
    { archetypeId: 'GEL_GREEN', x: 48, y: 80, spawnDelay: 0 },
    { archetypeId: 'GEL_GREEN', x: 80, y: 80, spawnDelay: 10 },
    { archetypeId: 'GEL_GREEN', x: 160, y: 80, spawnDelay: 20 },
    { archetypeId: 'GEL_GREEN', x: 192, y: 80, spawnDelay: 30 },
  ],
  items: [],
  isDark: false,
  roomType: 'NORMAL',
  paletteId: 0,
};

/**
 * Room 1-5: Compass room
 * Position: (5, 6) - far right
 */
const DUNGEON_1_COMPASS_ROOM: DungeonRoom = {
  roomCol: 5,
  roomRow: 6,
  tiles: [
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, B, B, F, F, F, F, F, F, B, B, F, F, W),
    ...makeDungeonRow(W, F, F, B, B, F, F, F, F, F, F, B, B, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(DO, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, B, B, F, F, F, F, F, F, B, B, F, F, W),
    ...makeDungeonRow(W, F, F, B, B, F, F, F, F, F, F, B, B, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  doors: makeDoors('WALL', 'WALL', 'OPEN', 'WALL'),
  enemySpawns: [
    { archetypeId: 'STALFOS_GREEN', x: 120, y: 80, spawnDelay: 0 },
  ],
  items: [
    { x: 120, y: 80, itemType: 'COMPASS', requiresKillAll: true },
  ],
  isDark: false,
  roomType: 'ITEM',
  paletteId: 0,
};

/**
 * Room 1-6: Upper corridor leading to boss
 * Position: (3, 5) - above room 2
 */
const DUNGEON_1_ROOM_6: DungeonRoom = {
  roomCol: 3,
  roomRow: 5,
  tiles: [
    ...makeDungeonRow(W, W, W, W, W, W, W, DL, DL, W, W, W, W, W, W, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, W, W, W, W, W, W, DO, DO, W, W, W, W, W, W, W),
  ],
  doors: makeDoors('LOCKED', 'OPEN', 'WALL', 'WALL'),
  enemySpawns: [
    { archetypeId: 'STALFOS_GREEN', x: 64, y: 64, spawnDelay: 0 },
    { archetypeId: 'STALFOS_GREEN', x: 176, y: 112, spawnDelay: 30 },
  ],
  items: [],
  isDark: false,
  roomType: 'NORMAL',
  paletteId: 0,
};

/**
 * Room 1-7: Map room
 * Position: (3, 4) - above room 6 (after locked door)
 */
const DUNGEON_1_MAP_ROOM: DungeonRoom = {
  roomCol: 3,
  roomRow: 4,
  tiles: [
    ...makeDungeonRow(W, W, W, W, W, W, W, DS, DS, W, W, W, W, W, W, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, B, F, F, F, F, F, F, F, F, F, F, B, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, B, F, F, F, F, F, F, F, F, F, F, B, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, W, W, W, W, W, W, DO, DO, W, W, W, W, W, W, W),
  ],
  doors: makeDoors('SHUTTER', 'OPEN', 'WALL', 'WALL'),
  enemySpawns: [
    { archetypeId: 'KEESE', x: 64, y: 48, spawnDelay: 0 },
    { archetypeId: 'KEESE', x: 176, y: 48, spawnDelay: 15 },
    { archetypeId: 'KEESE', x: 64, y: 128, spawnDelay: 30 },
    { archetypeId: 'KEESE', x: 176, y: 128, spawnDelay: 45 },
    { archetypeId: 'KEESE', x: 120, y: 88, spawnDelay: 60 },
  ],
  items: [
    { x: 120, y: 88, itemType: 'MAP', requiresKillAll: true },
  ],
  isDark: false,
  roomType: 'ITEM',
  paletteId: 0,
};

/**
 * Room 1-8: Boss room (Aquamentus)
 * Position: (3, 3) - above map room
 */
const DUNGEON_1_BOSS_ROOM: DungeonRoom = {
  roomCol: 3,
  roomRow: 3,
  tiles: [
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(DS, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, W, W, W, W, W, W, DO, DO, W, W, W, W, W, W, W),
  ],
  doors: makeDoors('WALL', 'OPEN', 'SHUTTER', 'WALL'),
  enemySpawns: [
    { archetypeId: 'AQUAMENTUS', x: 192, y: 88, spawnDelay: 0 },
  ],
  items: [],
  isDark: false,
  roomType: 'BOSS',
  paletteId: 0,
};

/**
 * Room 1-9: Triforce room
 * Position: (2, 3) - left of boss room
 */
const DUNGEON_1_TRIFORCE_ROOM: DungeonRoom = {
  roomCol: 2,
  roomRow: 3,
  tiles: [
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, DO),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W),
    ...makeDungeonRow(W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W),
  ],
  doors: makeDoors('WALL', 'WALL', 'WALL', 'OPEN'),
  enemySpawns: [], // Triforce room is safe
  items: [
    { x: 120, y: 88, itemType: 'TRIFORCE_PIECE', requiresKillAll: false },
  ],
  isDark: false,
  roomType: 'TRIFORCE',
  paletteId: 0,
};

/**
 * Create the 8x8 room grid for Dungeon 1
 * Most rooms are null (not accessible), only defined rooms are placed
 */
function createDungeon1Rooms(): (DungeonRoom | null)[][] {
  // Create empty 8x8 grid filled with nulls
  const rooms: (DungeonRoom | null)[][] = Array.from(
    { length: DUNGEON_GRID_HEIGHT },
    () => Array.from({ length: DUNGEON_GRID_WIDTH }, () => null)
  );

  // Helper to safely set room with TypeScript strict mode
  const setRoom = (row: number, col: number, room: DungeonRoom): void => {
    const rowArray = rooms[row];
    if (rowArray) {
      rowArray[col] = room;
    }
  };

  // Place defined rooms
  // Row 3: Boss and Triforce rooms
  setRoom(3, 2, DUNGEON_1_TRIFORCE_ROOM);
  setRoom(3, 3, DUNGEON_1_BOSS_ROOM);

  // Row 4: Map room
  setRoom(4, 3, DUNGEON_1_MAP_ROOM);

  // Row 5: Upper corridor
  setRoom(5, 3, DUNGEON_1_ROOM_6);

  // Row 6: Main combat row
  setRoom(6, 2, DUNGEON_1_KEY_ROOM);
  setRoom(6, 3, DUNGEON_1_ROOM_2);
  setRoom(6, 4, DUNGEON_1_ROOM_4);
  setRoom(6, 5, DUNGEON_1_COMPASS_ROOM);

  // Row 7: Entrance
  setRoom(7, 3, DUNGEON_1_ENTRANCE);

  return rooms;
}

/**
 * Dungeon 1 definition: Eagle dungeon
 */
export const DUNGEON_1: DungeonDefinition = {
  dungeonId: 1,
  name: 'Eagle',
  gridWidth: DUNGEON_GRID_WIDTH,
  gridHeight: DUNGEON_GRID_HEIGHT,
  rooms: createDungeon1Rooms(),
  entranceCol: 3,
  entranceRow: 7,
  bossCol: 3,
  bossRow: 3,
  triforceCol: 2,
  triforceRow: 3,
  bossType: 'AQUAMENTUS',
  dungeonPalette: 0, // Blue/gray palette
  overworldEntranceCol: 9,
  overworldEntranceRow: 7,
};

// ===== DUNGEON DATA ACCESS =====

/**
 * Map of all dungeons by ID
 */
const DUNGEONS: Map<number, DungeonDefinition> = new Map([
  [1, DUNGEON_1],
]);

/**
 * Get a dungeon by ID
 */
export function getDungeon(dungeonId: number): DungeonDefinition | null {
  return DUNGEONS.get(dungeonId) ?? null;
}

/**
 * Get a dungeon room by dungeon ID and room coordinates
 */
export function getDungeonRoom(
  dungeonId: number,
  roomCol: number,
  roomRow: number
): DungeonRoom | null {
  const dungeon = getDungeon(dungeonId);
  if (!dungeon) return null;

  // Validate bounds
  if (roomRow < 0 || roomRow >= dungeon.gridHeight) return null;
  if (roomCol < 0 || roomCol >= dungeon.gridWidth) return null;

  const row = dungeon.rooms[roomRow];
  if (!row) return null;

  return row[roomCol] ?? null;
}

/**
 * Get the entrance room for a dungeon
 */
export function getDungeonEntrance(dungeonId: number): DungeonRoom | null {
  const dungeon = getDungeon(dungeonId);
  if (!dungeon) return null;

  return getDungeonRoom(dungeonId, dungeon.entranceCol, dungeon.entranceRow);
}

/**
 * Get the boss room for a dungeon
 */
export function getDungeonBossRoom(dungeonId: number): DungeonRoom | null {
  const dungeon = getDungeon(dungeonId);
  if (!dungeon) return null;

  return getDungeonRoom(dungeonId, dungeon.bossCol, dungeon.bossRow);
}

/**
 * Get the triforce room for a dungeon
 */
export function getDungeonTriforceRoom(dungeonId: number): DungeonRoom | null {
  const dungeon = getDungeon(dungeonId);
  if (!dungeon) return null;

  return getDungeonRoom(dungeonId, dungeon.triforceCol, dungeon.triforceRow);
}

/**
 * Get all defined rooms in a dungeon
 */
export function getDefinedDungeonRooms(dungeonId: number): DungeonRoom[] {
  const dungeon = getDungeon(dungeonId);
  if (!dungeon) return [];

  const rooms: DungeonRoom[] = [];
  for (let row = 0; row < dungeon.gridHeight; row++) {
    const roomRow = dungeon.rooms[row];
    if (!roomRow) continue;
    for (let col = 0; col < dungeon.gridWidth; col++) {
      const room = roomRow[col];
      if (room) rooms.push(room);
    }
  }
  return rooms;
}

/**
 * Get count of defined rooms in a dungeon
 */
export function getDungeonRoomCount(dungeonId: number): number {
  return getDefinedDungeonRooms(dungeonId).length;
}

/**
 * Get adjacent room in a direction
 */
export function getAdjacentRoom(
  dungeonId: number,
  roomCol: number,
  roomRow: number,
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
): DungeonRoom | null {
  let newCol = roomCol;
  let newRow = roomRow;

  switch (direction) {
    case 'UP': newRow--; break;
    case 'DOWN': newRow++; break;
    case 'LEFT': newCol--; break;
    case 'RIGHT': newCol++; break;
  }

  return getDungeonRoom(dungeonId, newCol, newRow);
}

/**
 * Check if a door is passable (OPEN, or LOCKED with key, etc.)
 */
export function isDoorOpen(doorState: DoorState): boolean {
  return doorState === 'OPEN';
}

/**
 * Check if a door can be opened with a key
 */
export function isDoorLocked(doorState: DoorState): boolean {
  return doorState === 'LOCKED';
}

/**
 * Check if a door is a shutter (opens when enemies defeated)
 */
export function isDoorShutter(doorState: DoorState): boolean {
  return doorState === 'SHUTTER';
}

/**
 * Check if a door is bombable
 */
export function isDoorBombable(doorState: DoorState): boolean {
  return doorState === 'BOMBABLE';
}

/**
 * Check if a room exists at the given coordinates
 */
export function isRoomDefined(
  dungeonId: number,
  roomCol: number,
  roomRow: number
): boolean {
  return getDungeonRoom(dungeonId, roomCol, roomRow) !== null;
}

/**
 * Get all dungeon IDs
 */
export function getAllDungeonIds(): number[] {
  return Array.from(DUNGEONS.keys());
}

/**
 * Validate dungeon data integrity
 */
export function validateDungeonData(dungeonId: number): boolean {
  const dungeon = getDungeon(dungeonId);
  if (!dungeon) return false;

  const expectedTiles = TILES_PER_ROW * TILES_PER_COL;

  // Check entrance exists
  const entrance = getDungeonEntrance(dungeonId);
  if (!entrance) {
    console.error(`Dungeon ${dungeonId} has no entrance room`);
    return false;
  }

  // Check boss room exists
  const bossRoom = getDungeonBossRoom(dungeonId);
  if (!bossRoom) {
    console.error(`Dungeon ${dungeonId} has no boss room`);
    return false;
  }

  // Check triforce room exists
  const triforceRoom = getDungeonTriforceRoom(dungeonId);
  if (!triforceRoom) {
    console.error(`Dungeon ${dungeonId} has no triforce room`);
    return false;
  }

  // Validate all defined rooms
  const rooms = getDefinedDungeonRooms(dungeonId);
  for (const room of rooms) {
    if (room.tiles.length !== expectedTiles) {
      console.error(
        `Dungeon ${dungeonId} room (${room.roomCol},${room.roomRow}) has ${room.tiles.length} tiles, expected ${expectedTiles}`
      );
      return false;
    }
  }

  return true;
}
