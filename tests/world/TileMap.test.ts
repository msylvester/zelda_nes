import { describe, it, expect, beforeEach } from 'vitest';
import { TileMap } from '../../src/world/TileMap';
import { TileData, TileCollision } from '../../src/types';
import { TILES_PER_SCREEN, TILE_SIZE, TILES_PER_ROW, TILES_PER_COL } from '../../src/constants';

function createTestTileData(): TileData[] {
  const tiles: TileData[] = [];
  for (let i = 0; i < TILES_PER_SCREEN; i++) {
    // Create varied tiles: mostly passable, some solid
    const collision: TileCollision = i % 17 === 0 ? 'SOLID' : 'PASSABLE';
    tiles.push({ tileId: i % 8, collision });
  }
  return tiles;
}

function createMixedTileData(): TileData[] {
  const tiles: TileData[] = [];
  const collisions: TileCollision[] = ['PASSABLE', 'SOLID', 'WATER', 'PIT', 'STAIRS', 'BUSH', 'ROCK'];
  for (let i = 0; i < TILES_PER_SCREEN; i++) {
    tiles.push({
      tileId: i % 8,
      collision: collisions[i % collisions.length] as TileCollision,
    });
  }
  return tiles;
}

describe('TileMap', () => {
  let tileMap: TileMap;

  beforeEach(() => {
    tileMap = new TileMap();
  });

  describe('load', () => {
    it('should load valid tile data', () => {
      const tiles = createTestTileData();
      expect(() => tileMap.load(tiles)).not.toThrow();
      expect(tileMap.isLoaded()).toBe(true);
    });

    it('should reject invalid tile data length (too few)', () => {
      const tiles = [{ tileId: 0, collision: 'PASSABLE' as TileCollision }];
      expect(() => tileMap.load(tiles)).toThrow(/expected 176 tiles, got 1/);
    });

    it('should reject invalid tile data length (too many)', () => {
      const tiles = [...createTestTileData(), { tileId: 0, collision: 'PASSABLE' as TileCollision }];
      expect(() => tileMap.load(tiles)).toThrow(/expected 176 tiles, got 177/);
    });

    it('should copy tile data (not reference)', () => {
      const tiles = createTestTileData();
      tileMap.load(tiles);
      tiles[0] = { tileId: 99, collision: 'WATER' };
      expect(tileMap.getTileAt(0, 0)?.tileId).not.toBe(99);
    });
  });

  describe('clear', () => {
    it('should clear loaded tile data', () => {
      tileMap.load(createTestTileData());
      expect(tileMap.isLoaded()).toBe(true);
      tileMap.clear();
      expect(tileMap.isLoaded()).toBe(false);
    });
  });

  describe('isLoaded', () => {
    it('should return false before loading', () => {
      expect(tileMap.isLoaded()).toBe(false);
    });

    it('should return true after loading', () => {
      tileMap.load(createTestTileData());
      expect(tileMap.isLoaded()).toBe(true);
    });
  });

  describe('getTileAt', () => {
    beforeEach(() => {
      tileMap.load(createTestTileData());
    });

    it('should return tile at valid coordinates', () => {
      const tile = tileMap.getTileAt(0, 0);
      expect(tile).not.toBeNull();
      expect(tile?.tileId).toBeDefined();
    });

    it('should return correct tile for specific position', () => {
      // Position (5, 3) = index 3 * 16 + 5 = 53
      const tile = tileMap.getTileAt(5, 3);
      expect(tile?.tileId).toBe(53 % 8);
    });

    it('should return null for negative column', () => {
      expect(tileMap.getTileAt(-1, 0)).toBeNull();
    });

    it('should return null for negative row', () => {
      expect(tileMap.getTileAt(0, -1)).toBeNull();
    });

    it('should return null for column out of bounds', () => {
      expect(tileMap.getTileAt(TILES_PER_ROW, 0)).toBeNull();
    });

    it('should return null for row out of bounds', () => {
      expect(tileMap.getTileAt(0, TILES_PER_COL)).toBeNull();
    });

    it('should return null when not loaded', () => {
      const emptyMap = new TileMap();
      expect(emptyMap.getTileAt(0, 0)).toBeNull();
    });

    it('should handle edge coordinates', () => {
      // Bottom-right corner: (15, 10)
      const tile = tileMap.getTileAt(TILES_PER_ROW - 1, TILES_PER_COL - 1);
      expect(tile).not.toBeNull();
    });
  });

  describe('getCollisionAt', () => {
    it('should return collision type at valid coordinates', () => {
      tileMap.load(createMixedTileData());
      const collision = tileMap.getCollisionAt(0, 0);
      expect(collision).toBe('PASSABLE');
    });

    it('should return SOLID for out of bounds (negative col)', () => {
      tileMap.load(createTestTileData());
      expect(tileMap.getCollisionAt(-1, 0)).toBe('SOLID');
    });

    it('should return SOLID for out of bounds (high col)', () => {
      tileMap.load(createTestTileData());
      expect(tileMap.getCollisionAt(TILES_PER_ROW, 0)).toBe('SOLID');
    });

    it('should return SOLID for out of bounds (negative row)', () => {
      tileMap.load(createTestTileData());
      expect(tileMap.getCollisionAt(0, -1)).toBe('SOLID');
    });

    it('should return SOLID for out of bounds (high row)', () => {
      tileMap.load(createTestTileData());
      expect(tileMap.getCollisionAt(0, TILES_PER_COL)).toBe('SOLID');
    });

    it('should return SOLID when not loaded', () => {
      expect(tileMap.getCollisionAt(0, 0)).toBe('SOLID');
    });
  });

  describe('getCollisionAtPixel', () => {
    beforeEach(() => {
      tileMap.load(createMixedTileData());
    });

    it('should convert pixel to tile coordinates correctly', () => {
      // Pixel (0, 0) = tile (0, 0)
      expect(tileMap.getCollisionAtPixel(0, 0)).toBe(tileMap.getCollisionAt(0, 0));
    });

    it('should handle mid-tile pixels', () => {
      // Pixel (24, 24) = tile (1, 1) since TILE_SIZE is 16
      expect(tileMap.getCollisionAtPixel(24, 24)).toBe(tileMap.getCollisionAt(1, 1));
    });

    it('should handle tile boundary pixels', () => {
      // Pixel (16, 16) = tile (1, 1)
      expect(tileMap.getCollisionAtPixel(16, 16)).toBe(tileMap.getCollisionAt(1, 1));
    });

    it('should handle last pixel of a tile', () => {
      // Pixel (15, 15) = tile (0, 0)
      expect(tileMap.getCollisionAtPixel(15, 15)).toBe(tileMap.getCollisionAt(0, 0));
    });
  });

  describe('getAllTiles', () => {
    it('should return copy of all tiles', () => {
      const tiles = createTestTileData();
      tileMap.load(tiles);
      const allTiles = tileMap.getAllTiles();
      expect(allTiles.length).toBe(TILES_PER_SCREEN);
    });

    it('should return empty array when not loaded', () => {
      const allTiles = tileMap.getAllTiles();
      expect(allTiles.length).toBe(0);
    });
  });

  describe('getTileGrid', () => {
    it('should return 2D grid of tiles', () => {
      tileMap.load(createTestTileData());
      const grid = tileMap.getTileGrid();
      expect(grid.length).toBe(TILES_PER_COL);
      expect(grid[0]?.length).toBe(TILES_PER_ROW);
    });

    it('should return tiles in row-major order', () => {
      tileMap.load(createTestTileData());
      const grid = tileMap.getTileGrid();
      // Check that grid[row][col] matches getTileAt(col, row)
      expect(grid[2]?.[5]).toEqual(tileMap.getTileAt(5, 2));
    });
  });

  describe('pixelToTile (static)', () => {
    it('should convert origin correctly', () => {
      expect(TileMap.pixelToTile(0, 0)).toEqual({ col: 0, row: 0 });
    });

    it('should convert mid-tile correctly', () => {
      expect(TileMap.pixelToTile(8, 8)).toEqual({ col: 0, row: 0 });
    });

    it('should convert next tile correctly', () => {
      expect(TileMap.pixelToTile(16, 0)).toEqual({ col: 1, row: 0 });
      expect(TileMap.pixelToTile(0, 16)).toEqual({ col: 0, row: 1 });
    });

    it('should handle arbitrary positions', () => {
      expect(TileMap.pixelToTile(100, 50)).toEqual({
        col: Math.floor(100 / TILE_SIZE),
        row: Math.floor(50 / TILE_SIZE),
      });
    });
  });

  describe('tileToPixel (static)', () => {
    it('should convert origin correctly', () => {
      expect(TileMap.tileToPixel(0, 0)).toEqual({ x: 0, y: 0 });
    });

    it('should convert tile 1,1 correctly', () => {
      expect(TileMap.tileToPixel(1, 1)).toEqual({ x: 16, y: 16 });
    });

    it('should handle arbitrary positions', () => {
      expect(TileMap.tileToPixel(5, 3)).toEqual({
        x: 5 * TILE_SIZE,
        y: 3 * TILE_SIZE,
      });
    });
  });
});
