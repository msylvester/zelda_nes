import { describe, it, expect } from 'vitest';
import {
  TILE_IDS,
  TILE_COLLISION_MAP,
  makeTile,
  TEST_SCREEN_TILES,
  TEST_SCREEN_2_TILES,
  TEST_SCREEN_3_TILES,
  createEmptyScreen,
  createOpenScreen,
  validateTileData,
} from '../../src/world/TestScreenData';
import { TILES_PER_SCREEN, TILES_PER_ROW, TILES_PER_COL } from '../../src/constants';

describe('TestScreenData', () => {
  describe('TILE_IDS', () => {
    it('should have all required tile types', () => {
      expect(TILE_IDS.GRASS).toBeDefined();
      expect(TILE_IDS.GROUND).toBeDefined();
      expect(TILE_IDS.WATER).toBeDefined();
      expect(TILE_IDS.ROCK).toBeDefined();
      expect(TILE_IDS.TREE).toBeDefined();
      expect(TILE_IDS.BUSH).toBeDefined();
      expect(TILE_IDS.STAIRS).toBeDefined();
      expect(TILE_IDS.PIT).toBeDefined();
      expect(TILE_IDS.WALL).toBeDefined();
    });

    it('should have unique tile IDs', () => {
      const ids = Object.values(TILE_IDS);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('TILE_COLLISION_MAP', () => {
    it('should map all tile IDs to collision types', () => {
      for (const tileId of Object.values(TILE_IDS)) {
        expect(TILE_COLLISION_MAP[tileId]).toBeDefined();
      }
    });

    it('should have correct collision types', () => {
      expect(TILE_COLLISION_MAP[TILE_IDS.GRASS]).toBe('PASSABLE');
      expect(TILE_COLLISION_MAP[TILE_IDS.GROUND]).toBe('PASSABLE');
      expect(TILE_COLLISION_MAP[TILE_IDS.WATER]).toBe('WATER');
      expect(TILE_COLLISION_MAP[TILE_IDS.ROCK]).toBe('SOLID');
      expect(TILE_COLLISION_MAP[TILE_IDS.TREE]).toBe('SOLID');
      expect(TILE_COLLISION_MAP[TILE_IDS.BUSH]).toBe('BUSH');
      expect(TILE_COLLISION_MAP[TILE_IDS.STAIRS]).toBe('STAIRS');
      expect(TILE_COLLISION_MAP[TILE_IDS.PIT]).toBe('PIT');
    });
  });

  describe('makeTile', () => {
    it('should create tile with correct tileId', () => {
      const tile = makeTile(TILE_IDS.GRASS);
      expect(tile.tileId).toBe(TILE_IDS.GRASS);
    });

    it('should create tile with correct collision', () => {
      const tile = makeTile(TILE_IDS.WATER);
      expect(tile.collision).toBe('WATER');
    });

    it('should default to SOLID for unknown tile IDs', () => {
      const tile = makeTile(999);
      expect(tile.collision).toBe('SOLID');
    });
  });

  describe('TEST_SCREEN_TILES', () => {
    it('should have correct number of tiles', () => {
      expect(TEST_SCREEN_TILES.length).toBe(TILES_PER_SCREEN);
    });

    it('should have border of trees', () => {
      // Top-left corner
      expect(TEST_SCREEN_TILES[0]?.tileId).toBe(TILE_IDS.TREE);
      // Top-right corner
      expect(TEST_SCREEN_TILES[TILES_PER_ROW - 1]?.tileId).toBe(TILE_IDS.TREE);
      // Bottom-left corner
      expect(TEST_SCREEN_TILES[(TILES_PER_COL - 1) * TILES_PER_ROW]?.tileId).toBe(TILE_IDS.TREE);
      // Bottom-right corner
      expect(TEST_SCREEN_TILES[TILES_PER_SCREEN - 1]?.tileId).toBe(TILE_IDS.TREE);
    });

    it('should have water tiles', () => {
      const hasWater = TEST_SCREEN_TILES.some(tile => tile.collision === 'WATER');
      expect(hasWater).toBe(true);
    });

    it('should have stairs', () => {
      const hasStairs = TEST_SCREEN_TILES.some(tile => tile.collision === 'STAIRS');
      expect(hasStairs).toBe(true);
    });

    it('should have bushes', () => {
      const hasBush = TEST_SCREEN_TILES.some(tile => tile.collision === 'BUSH');
      expect(hasBush).toBe(true);
    });

    it('should have passable interior', () => {
      // Check a tile in the middle-ish area (row 5, col 8)
      const middleIndex = 5 * TILES_PER_ROW + 8;
      expect(TEST_SCREEN_TILES[middleIndex]?.collision).toBe('PASSABLE');
    });
  });

  describe('TEST_SCREEN_2_TILES', () => {
    it('should have correct number of tiles', () => {
      expect(TEST_SCREEN_2_TILES.length).toBe(TILES_PER_SCREEN);
    });

    it('should have a pit tile', () => {
      const hasPit = TEST_SCREEN_2_TILES.some(tile => tile.collision === 'PIT');
      expect(hasPit).toBe(true);
    });
  });

  describe('TEST_SCREEN_3_TILES', () => {
    it('should have correct number of tiles', () => {
      expect(TEST_SCREEN_3_TILES.length).toBe(TILES_PER_SCREEN);
    });

    it('should have multiple water areas', () => {
      const waterCount = TEST_SCREEN_3_TILES.filter(tile => tile.collision === 'WATER').length;
      expect(waterCount).toBeGreaterThan(10); // Water-heavy screen
    });
  });

  describe('createEmptyScreen', () => {
    it('should create screen with correct number of tiles', () => {
      const screen = createEmptyScreen();
      expect(screen.length).toBe(TILES_PER_SCREEN);
    });

    it('should create all solid tiles', () => {
      const screen = createEmptyScreen();
      expect(screen.every(tile => tile.collision === 'SOLID')).toBe(true);
    });

    it('should use rock tile ID', () => {
      const screen = createEmptyScreen();
      expect(screen[0]?.tileId).toBe(TILE_IDS.ROCK);
    });
  });

  describe('createOpenScreen', () => {
    it('should create screen with correct number of tiles', () => {
      const screen = createOpenScreen();
      expect(screen.length).toBe(TILES_PER_SCREEN);
    });

    it('should create all passable tiles', () => {
      const screen = createOpenScreen();
      expect(screen.every(tile => tile.collision === 'PASSABLE')).toBe(true);
    });

    it('should use grass tile ID', () => {
      const screen = createOpenScreen();
      expect(screen[0]?.tileId).toBe(TILE_IDS.GRASS);
    });
  });

  describe('validateTileData', () => {
    it('should return true for valid tile data', () => {
      expect(validateTileData(TEST_SCREEN_TILES)).toBe(true);
    });

    it('should return false for too few tiles', () => {
      expect(validateTileData([])).toBe(false);
    });

    it('should return false for too many tiles', () => {
      const tooMany = [...TEST_SCREEN_TILES, makeTile(0)];
      expect(validateTileData(tooMany)).toBe(false);
    });
  });
});
