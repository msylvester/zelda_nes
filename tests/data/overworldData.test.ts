// tests/data/overworldData.test.ts - Tests for overworld screen data

import { describe, it, expect } from 'vitest';
import {
  getOverworldScreen,
  isScreenDefined,
  getDefinedScreenCoords,
  getStartingScreen,
  getAdjacentScreens,
  validateOverworldData,
  TOTAL_SCREENS,
  DEFINED_SCREEN_COUNT,
  TILE_IDS,
  TILE_COLLISION_MAP,
  makeTile,
} from '../../src/data/overworldData';
import { OVERWORLD_COLS, OVERWORLD_ROWS, TILES_PER_ROW, TILES_PER_COL, START_SCREEN_COL, START_SCREEN_ROW } from '../../src/constants';

describe('overworldData', () => {
  describe('constants', () => {
    it('should have correct total screen count', () => {
      expect(TOTAL_SCREENS).toBe(OVERWORLD_COLS * OVERWORLD_ROWS);
      expect(TOTAL_SCREENS).toBe(128); // 16x8
    });

    it('should have 8 defined screens', () => {
      expect(DEFINED_SCREEN_COUNT).toBe(8);
    });
  });

  describe('TILE_IDS', () => {
    it('should export tile IDs', () => {
      expect(TILE_IDS.GRASS).toBe(0);
      expect(TILE_IDS.GROUND).toBe(1);
      expect(TILE_IDS.WATER).toBe(2);
      expect(TILE_IDS.ROCK).toBe(3);
      expect(TILE_IDS.TREE).toBe(4);
      expect(TILE_IDS.BUSH).toBe(5);
      expect(TILE_IDS.STAIRS).toBe(6);
      expect(TILE_IDS.PIT).toBe(7);
    });
  });

  describe('TILE_COLLISION_MAP', () => {
    it('should map tiles to collision types', () => {
      expect(TILE_COLLISION_MAP[TILE_IDS.GRASS]).toBe('PASSABLE');
      expect(TILE_COLLISION_MAP[TILE_IDS.WATER]).toBe('WATER');
      expect(TILE_COLLISION_MAP[TILE_IDS.ROCK]).toBe('SOLID');
      expect(TILE_COLLISION_MAP[TILE_IDS.TREE]).toBe('SOLID');
      expect(TILE_COLLISION_MAP[TILE_IDS.BUSH]).toBe('BUSH');
      expect(TILE_COLLISION_MAP[TILE_IDS.STAIRS]).toBe('STAIRS');
      expect(TILE_COLLISION_MAP[TILE_IDS.PIT]).toBe('PIT');
    });
  });

  describe('makeTile', () => {
    it('should create tile data with correct collision', () => {
      const grassTile = makeTile(TILE_IDS.GRASS);
      expect(grassTile.tileId).toBe(TILE_IDS.GRASS);
      expect(grassTile.collision).toBe('PASSABLE');

      const waterTile = makeTile(TILE_IDS.WATER);
      expect(waterTile.tileId).toBe(TILE_IDS.WATER);
      expect(waterTile.collision).toBe('WATER');
    });
  });

  describe('getOverworldScreen', () => {
    it('should return starting screen at (7,7)', () => {
      const screen = getOverworldScreen(7, 7);
      expect(screen.screenCol).toBe(7);
      expect(screen.screenRow).toBe(7);
      expect(screen.tiles.length).toBe(TILES_PER_ROW * TILES_PER_COL);
    });

    it('should return defined screens correctly', () => {
      const screen87 = getOverworldScreen(8, 7);
      expect(screen87.screenCol).toBe(8);
      expect(screen87.screenRow).toBe(7);

      const screen76 = getOverworldScreen(7, 6);
      expect(screen76.screenCol).toBe(7);
      expect(screen76.screenRow).toBe(6);
    });

    it('should return blocked screen for undefined coordinates', () => {
      const screen = getOverworldScreen(0, 0);
      expect(screen.screenCol).toBe(0);
      expect(screen.screenRow).toBe(0);
      expect(screen.tiles.length).toBe(TILES_PER_ROW * TILES_PER_COL);
      // All tiles should be rocks (blocked)
      expect(screen.tiles.every(t => t.tileId === TILE_IDS.ROCK)).toBe(true);
    });

    it('should return blocked screen for out of bounds coordinates', () => {
      const screenNegative = getOverworldScreen(-1, 0);
      expect(screenNegative.tiles.every(t => t.tileId === TILE_IDS.ROCK)).toBe(true);

      const screenTooLarge = getOverworldScreen(16, 8);
      expect(screenTooLarge.tiles.every(t => t.tileId === TILE_IDS.ROCK)).toBe(true);
    });

    it('should return a copy of tile data', () => {
      const screen1 = getOverworldScreen(7, 7);
      const screen2 = getOverworldScreen(7, 7);
      expect(screen1.tiles).not.toBe(screen2.tiles);
    });
  });

  describe('isScreenDefined', () => {
    it('should return true for defined screens', () => {
      expect(isScreenDefined(7, 7)).toBe(true);
      expect(isScreenDefined(8, 7)).toBe(true);
      expect(isScreenDefined(6, 7)).toBe(true);
      expect(isScreenDefined(7, 6)).toBe(true);
      expect(isScreenDefined(8, 6)).toBe(true);
      expect(isScreenDefined(6, 6)).toBe(true);
      expect(isScreenDefined(9, 7)).toBe(true);
      expect(isScreenDefined(5, 7)).toBe(true);
    });

    it('should return false for undefined screens', () => {
      expect(isScreenDefined(0, 0)).toBe(false);
      expect(isScreenDefined(15, 7)).toBe(false);
      expect(isScreenDefined(7, 0)).toBe(false);
    });
  });

  describe('getDefinedScreenCoords', () => {
    it('should return all defined screen coordinates', () => {
      const coords = getDefinedScreenCoords();
      expect(coords.length).toBe(8);
    });

    it('should include starting screen', () => {
      const coords = getDefinedScreenCoords();
      const hasStartScreen = coords.some(c => c.col === 7 && c.row === 7);
      expect(hasStartScreen).toBe(true);
    });

    it('should include all adjacent screens', () => {
      const coords = getDefinedScreenCoords();
      const expected = [
        { col: 7, row: 7 },
        { col: 8, row: 7 },
        { col: 6, row: 7 },
        { col: 7, row: 6 },
        { col: 8, row: 6 },
        { col: 6, row: 6 },
        { col: 9, row: 7 },
        { col: 5, row: 7 },
      ];
      for (const exp of expected) {
        const found = coords.some(c => c.col === exp.col && c.row === exp.row);
        expect(found).toBe(true);
      }
    });
  });

  describe('getStartingScreen', () => {
    it('should return screen at START_SCREEN_COL, START_SCREEN_ROW', () => {
      const screen = getStartingScreen();
      expect(screen.screenCol).toBe(START_SCREEN_COL);
      expect(screen.screenRow).toBe(START_SCREEN_ROW);
    });

    it('should have correct tile count', () => {
      const screen = getStartingScreen();
      expect(screen.tiles.length).toBe(TILES_PER_ROW * TILES_PER_COL);
    });

    it('should have enemy spawns', () => {
      const screen = getStartingScreen();
      expect(screen.enemySpawns.length).toBeGreaterThan(0);
    });

    it('should have cave entrance', () => {
      const screen = getStartingScreen();
      expect(screen.entrances.length).toBe(1);
      expect(screen.entrances[0].destinationType).toBe('CAVE');
    });
  });

  describe('getAdjacentScreens', () => {
    it('should return adjacent defined screens for starting screen', () => {
      const adj = getAdjacentScreens(7, 7);
      expect(adj.up).not.toBeNull(); // (7,6) is defined
      expect(adj.down).toBeNull(); // row 7 is bottom
      expect(adj.left).not.toBeNull(); // (6,7) is defined
      expect(adj.right).not.toBeNull(); // (8,7) is defined
    });

    it('should return null for undefined adjacent screens', () => {
      const adj = getAdjacentScreens(5, 7);
      expect(adj.left).toBeNull(); // (4,7) is not defined
      expect(adj.right).not.toBeNull(); // (6,7) is defined
    });

    it('should return correct screen data', () => {
      const adj = getAdjacentScreens(7, 7);
      expect(adj.up?.screenCol).toBe(7);
      expect(adj.up?.screenRow).toBe(6);
      expect(adj.left?.screenCol).toBe(6);
      expect(adj.left?.screenRow).toBe(7);
      expect(adj.right?.screenCol).toBe(8);
      expect(adj.right?.screenRow).toBe(7);
    });
  });

  describe('validateOverworldData', () => {
    it('should return true for valid data', () => {
      expect(validateOverworldData()).toBe(true);
    });
  });

  describe('screen content', () => {
    it('starting screen should have walkable center area', () => {
      const screen = getStartingScreen();
      // Check center tiles (row 5, cols 4-11 should be passable)
      const row5Start = 5 * TILES_PER_ROW;
      for (let col = 4; col <= 11; col++) {
        const tile = screen.tiles[row5Start + col];
        expect(['PASSABLE', 'BUSH'].includes(tile.collision)).toBe(true);
      }
    });

    it('starting screen should have water in top-left', () => {
      const screen = getStartingScreen();
      // Check tiles (1,2), (2,2), (1,3), (2,3)
      const waterPositions = [
        2 * TILES_PER_ROW + 1, // row 2, col 1
        2 * TILES_PER_ROW + 2, // row 2, col 2
        3 * TILES_PER_ROW + 1, // row 3, col 1
        3 * TILES_PER_ROW + 2, // row 3, col 2
      ];
      for (const pos of waterPositions) {
        expect(screen.tiles[pos].collision).toBe('WATER');
      }
    });

    it('starting screen should have stairs (cave entrance)', () => {
      const screen = getStartingScreen();
      // Check for stairs tile
      const hasStairs = screen.tiles.some(t => t.tileId === TILE_IDS.STAIRS);
      expect(hasStairs).toBe(true);
    });

    it('dungeon entrance screen (9,7) should have correct type', () => {
      const screen = getOverworldScreen(9, 7);
      expect(screen.screenType).toBe('DUNGEON_ENTRANCE');
      expect(screen.entrances.length).toBe(1);
      expect(screen.entrances[0].destinationType).toBe('DUNGEON');
      expect(screen.entrances[0].destinationId).toBe(1);
    });

    it('screens should have border tiles for blocking exits', () => {
      // Check that borders have solid tiles where there's no exit
      const screen = getOverworldScreen(6, 6); // Northwest, no exits on top/left

      // Top-left corner should be solid
      expect(screen.tiles[0].collision).toBe('SOLID');

      // Bottom-left corner should be solid
      const bottomLeft = (TILES_PER_COL - 1) * TILES_PER_ROW;
      expect(screen.tiles[bottomLeft].collision).toBe('SOLID');
    });
  });

  describe('enemy spawns', () => {
    it('starting screen should have Octorok spawns', () => {
      const screen = getStartingScreen();
      const octorokSpawns = screen.enemySpawns.filter(s => s.archetypeId.includes('OCTOROK'));
      expect(octorokSpawns.length).toBe(2);
    });

    it('enemy spawns should have valid positions', () => {
      const screen = getStartingScreen();
      for (const spawn of screen.enemySpawns) {
        expect(spawn.x).toBeGreaterThanOrEqual(0);
        expect(spawn.x).toBeLessThan(256);
        expect(spawn.y).toBeGreaterThanOrEqual(0);
        expect(spawn.y).toBeLessThan(176);
      }
    });

    it('keese screen (8,6) should have multiple Keese spawns', () => {
      const screen = getOverworldScreen(8, 6);
      const keeseSpawns = screen.enemySpawns.filter(s => s.archetypeId === 'KEESE');
      expect(keeseSpawns.length).toBe(3);
    });
  });

  describe('hidden items', () => {
    it('starting screen should have hidden item under bush', () => {
      const screen = getStartingScreen();
      expect(screen.hiddenItems.length).toBe(1);
      expect(screen.hiddenItems[0].revealCondition).toBe('BURN');
    });

    it('bush screen (8,6) should have multiple hidden items', () => {
      const screen = getOverworldScreen(8, 6);
      expect(screen.hiddenItems.length).toBe(2);
    });
  });

  describe('screen connectivity', () => {
    it('all defined screens should be connected to at least one other screen', () => {
      const coords = getDefinedScreenCoords();
      for (const coord of coords) {
        const adj = getAdjacentScreens(coord.col, coord.row);
        const connectedCount = [adj.up, adj.down, adj.left, adj.right].filter(Boolean).length;

        // All screens should connect to at least one other (except edge cases in bounds)
        // Since we're checking defined screens, most should connect
        if (coord.col > 0 && coord.col < OVERWORLD_COLS - 1 &&
            coord.row > 0 && coord.row < OVERWORLD_ROWS - 1) {
          // Interior screens should be well-connected
          expect(connectedCount).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('starting screen should be reachable', () => {
      // Starting screen should be connected
      const adj = getAdjacentScreens(START_SCREEN_COL, START_SCREEN_ROW);
      const connectedCount = [adj.up, adj.down, adj.left, adj.right].filter(Boolean).length;
      expect(connectedCount).toBeGreaterThanOrEqual(2); // At least north, east, west
    });
  });
});
