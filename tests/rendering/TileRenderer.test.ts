import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { TileRenderer } from '../../src/rendering/TileRenderer';
import { TILE_SIZE, TILES_PER_ROW, TILES_PER_COL, HUD_HEIGHT } from '../../src/constants';
import type { GeneratedAssets, TileKey } from '../../src/assets/AssetGenerator';

// Mock canvas and context
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;

  clearRect = vi.fn();
  fillRect = vi.fn();
  strokeRect = vi.fn();
  drawImage = vi.fn();
}

class MockCanvas {
  width = 16;
  height = 16;
}

function createMockAssets(): GeneratedAssets {
  const sprites = new Map();
  const tiles = new Map<TileKey, HTMLCanvasElement>();

  // Add mock tiles
  const mockTile = new MockCanvas() as unknown as HTMLCanvasElement;
  tiles.set('tile_grass', mockTile);
  tiles.set('tile_ground', mockTile);
  tiles.set('tile_water', mockTile);
  tiles.set('tile_rock', mockTile);
  tiles.set('tile_tree', mockTile);
  tiles.set('tile_bush', mockTile);
  tiles.set('tile_stairs', mockTile);
  tiles.set('tile_pit', mockTile);
  tiles.set('tile_wall', mockTile);
  tiles.set('tile_dungeon_floor', mockTile);
  tiles.set('tile_dungeon_wall', mockTile);
  tiles.set('tile_dungeon_block', mockTile);
  tiles.set('tile_door_open', mockTile);
  tiles.set('tile_door_locked', mockTile);
  tiles.set('tile_door_shutter', mockTile);

  return {
    sprites,
    tiles,
    ready: true,
  };
}

describe('TileRenderer', () => {
  let ctx: MockCanvasRenderingContext2D;
  let assets: GeneratedAssets;
  let tileRenderer: TileRenderer;

  beforeEach(() => {
    ctx = new MockCanvasRenderingContext2D();
    assets = createMockAssets();
    tileRenderer = new TileRenderer(
      ctx as unknown as CanvasRenderingContext2D,
      assets
    );
  });

  describe('render()', () => {
    it('should render all 176 tiles (16x11 grid)', () => {
      const tiles = new Array(176).fill(0);
      tileRenderer.render(tiles);
      // Should call drawImage 176 times
      expect(ctx.drawImage).toHaveBeenCalledTimes(176);
    });

    it('should position tiles with HUD offset', () => {
      const tiles = [0]; // Just first tile
      tileRenderer.render(tiles);
      // First tile should be at (0, HUD_HEIGHT)
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0,
        HUD_HEIGHT
      );
    });

    it('should position tiles correctly based on grid', () => {
      // Fill with zeros but track calls
      const tiles = new Array(176).fill(0);
      tileRenderer.render(tiles);

      // Check second row, first tile (index 16)
      // Should be at y = HUD_HEIGHT + TILE_SIZE
      const call = ctx.drawImage.mock.calls[16];
      expect(call[1]).toBe(0); // x = 0
      expect(call[2]).toBe(HUD_HEIGHT + TILE_SIZE); // y = 64 + 16 = 80
    });

    it('should use dungeon tiles when isDungeon is true', () => {
      const tiles = new Array(176).fill(0);
      tileRenderer.render(tiles, true);
      // Should still render tiles
      expect(ctx.drawImage).toHaveBeenCalledTimes(176);
    });

    it('should handle missing tiles with fallback', () => {
      // Create assets with no tiles
      const emptyAssets: GeneratedAssets = {
        sprites: new Map(),
        tiles: new Map(),
        ready: true,
      };
      const emptyTileRenderer = new TileRenderer(
        ctx as unknown as CanvasRenderingContext2D,
        emptyAssets
      );

      const tiles = [0];
      emptyTileRenderer.render(tiles);
      // Should use fillRect as fallback
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should use default tile for undefined array elements', () => {
      // Sparse array
      const tiles: number[] = [];
      tiles[0] = 3; // rock
      tiles[100] = 2; // water
      // Elements 1-99 and 101-175 are undefined

      tileRenderer.render(tiles);
      // Should render 176 tiles total
      expect(ctx.drawImage).toHaveBeenCalledTimes(176);
    });
  });

  describe('renderTile()', () => {
    it('should render a single tile at specified position', () => {
      tileRenderer.renderTile(5, 3, 0);
      expect(ctx.drawImage).toHaveBeenCalledTimes(1);
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        5 * TILE_SIZE, // x = 80
        3 * TILE_SIZE + HUD_HEIGHT // y = 48 + 64 = 112
      );
    });

    it('should render different tile types', () => {
      tileRenderer.renderTile(0, 0, 3); // rock
      expect(ctx.drawImage).toHaveBeenCalled();
    });
  });

  describe('renderWithOffset()', () => {
    it('should apply offset to all tile positions', () => {
      const tiles = new Array(176).fill(0);
      tileRenderer.renderWithOffset(tiles, 10, 20);

      // First tile should be offset
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        10, // x = 0 + 10
        HUD_HEIGHT + 20 // y = 64 + 20
      );
    });
  });

  describe('getTileKey()', () => {
    it('should return correct tile key for overworld tiles', () => {
      expect(tileRenderer.getTileKey(0)).toBe('tile_grass');
      expect(tileRenderer.getTileKey(1)).toBe('tile_ground');
      expect(tileRenderer.getTileKey(2)).toBe('tile_water');
      expect(tileRenderer.getTileKey(3)).toBe('tile_rock');
      expect(tileRenderer.getTileKey(4)).toBe('tile_tree');
      expect(tileRenderer.getTileKey(5)).toBe('tile_bush');
      expect(tileRenderer.getTileKey(6)).toBe('tile_stairs');
      expect(tileRenderer.getTileKey(7)).toBe('tile_pit');
      expect(tileRenderer.getTileKey(8)).toBe('tile_wall');
    });

    it('should return correct tile key for dungeon tiles', () => {
      expect(tileRenderer.getTileKey(0, 'dungeon')).toBe('tile_dungeon_floor');
      expect(tileRenderer.getTileKey(10, 'dungeon')).toBe('tile_dungeon_wall');
      expect(tileRenderer.getTileKey(11, 'dungeon')).toBe('tile_dungeon_block');
      expect(tileRenderer.getTileKey(12, 'dungeon')).toBe('tile_door_open');
      expect(tileRenderer.getTileKey(13, 'dungeon')).toBe('tile_door_locked');
      expect(tileRenderer.getTileKey(14, 'dungeon')).toBe('tile_door_shutter');
    });

    it('should return correct tile key for cave tiles', () => {
      expect(tileRenderer.getTileKey(20, 'cave')).toBe('tile_cave_floor');
      expect(tileRenderer.getTileKey(21, 'cave')).toBe('tile_cave_wall');
      expect(tileRenderer.getTileKey(22, 'cave')).toBe('tile_cave_pillar');
      expect(tileRenderer.getTileKey(23, 'cave')).toBe('tile_cave_fire');
      expect(tileRenderer.getTileKey(6, 'cave')).toBe('tile_stairs');
    });

    it('should return default tile for unknown tile IDs', () => {
      expect(tileRenderer.getTileKey(999)).toBe('tile_grass');
      expect(tileRenderer.getTileKey(999, 'dungeon')).toBe('tile_dungeon_floor');
      expect(tileRenderer.getTileKey(999, 'cave')).toBe('tile_cave_floor');
    });
  });

  describe('tile grid dimensions', () => {
    it('should match NES Zelda play area dimensions', () => {
      expect(TILES_PER_ROW).toBe(16);
      expect(TILES_PER_COL).toBe(11);
      expect(TILES_PER_ROW * TILES_PER_COL).toBe(176);
    });

    it('should tile exactly fit play area', () => {
      expect(TILES_PER_ROW * TILE_SIZE).toBe(256);
      expect(TILES_PER_COL * TILE_SIZE).toBe(176);
    });
  });
});
