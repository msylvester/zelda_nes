// TileRenderer.ts - Renders background tiles with 64px HUD offset
// Screen is 16x11 tiles (256x176 pixels) below the HUD

import {
  TILE_SIZE,
  TILES_PER_ROW,
  TILES_PER_COL,
  HUD_HEIGHT,
} from '../constants';
import type { GeneratedAssets, TileKey } from '../assets/AssetGenerator';

/**
 * Mapping from tile ID to tile asset key
 * Tile IDs:
 * 0 = grass (passable)
 * 1 = ground/sand (passable)
 * 2 = water (impassable without ladder)
 * 3 = rock/boulder (solid)
 * 4 = tree (solid)
 * 5 = bush (burnable, passable after burn)
 * 6 = stairs (entrance)
 * 7 = pit (fall damage)
 * 8 = wall (solid)
 * 9 = dungeon floor (passable)
 * 10 = dungeon wall (solid)
 * 11 = dungeon block (pushable)
 * 12 = door open
 * 13 = door locked
 * 14 = door shutter
 */
const OVERWORLD_TILE_MAP: Record<number, TileKey> = {
  0: 'tile_grass',
  1: 'tile_ground',
  2: 'tile_water',
  3: 'tile_rock',
  4: 'tile_tree',
  5: 'tile_bush',
  6: 'tile_stairs',
  7: 'tile_pit',
  8: 'tile_wall',
};

const DUNGEON_TILE_MAP: Record<number, TileKey> = {
  0: 'tile_dungeon_floor',
  1: 'tile_dungeon_floor', // Ground treated as floor in dungeon
  2: 'tile_water',
  3: 'tile_dungeon_block',
  4: 'tile_dungeon_wall',
  5: 'tile_dungeon_floor', // No bushes in dungeons
  6: 'tile_stairs',
  7: 'tile_pit',
  8: 'tile_dungeon_wall',
  9: 'tile_dungeon_floor',
  10: 'tile_dungeon_wall',
  11: 'tile_dungeon_block',
  12: 'tile_door_open',
  13: 'tile_door_locked',
  14: 'tile_door_shutter',
};

/**
 * Cave tile mapping
 * Cave IDs (from caveData.ts):
 * 20 = cave floor
 * 21 = cave wall
 * 22 = cave pillar
 * 23 = cave fire
 * 6 = stairs (same as overworld)
 */
const CAVE_TILE_MAP: Record<number, TileKey> = {
  6: 'tile_stairs',
  11: 'tile_dungeon_block', // Use dungeon block for cave blocks
  20: 'tile_cave_floor',
  21: 'tile_cave_wall',
  22: 'tile_cave_pillar',
  23: 'tile_cave_fire',
};

/**
 * Renders the background tile layer
 * Tiles are rendered in the play area (below the 64px HUD)
 */
export class TileRenderer {
  private ctx: CanvasRenderingContext2D;
  private assets: GeneratedAssets;

  constructor(ctx: CanvasRenderingContext2D, assets: GeneratedAssets) {
    this.ctx = ctx;
    this.assets = assets;
  }

  /**
   * Get the appropriate tile map and default tile for a context
   */
  private getTileMapForContext(context: 'overworld' | 'dungeon' | 'cave'): {
    tileMap: Record<number, TileKey>;
    defaultTileKey: TileKey;
  } {
    switch (context) {
      case 'dungeon':
        return { tileMap: DUNGEON_TILE_MAP, defaultTileKey: 'tile_dungeon_floor' };
      case 'cave':
        return { tileMap: CAVE_TILE_MAP, defaultTileKey: 'tile_cave_floor' };
      default:
        return { tileMap: OVERWORLD_TILE_MAP, defaultTileKey: 'tile_grass' };
    }
  }

  /**
   * Renders a screen of tiles
   * @param tiles Array of tile IDs (16x11 = 176 tiles, row-major order)
   * @param context 'overworld' | 'dungeon' | 'cave' - which tileset to use
   */
  render(tiles: number[], context: 'overworld' | 'dungeon' | 'cave' = 'overworld'): void {
    const { tileMap, defaultTileKey } = this.getTileMapForContext(context);

    for (let row = 0; row < TILES_PER_COL; row++) {
      for (let col = 0; col < TILES_PER_ROW; col++) {
        const index = row * TILES_PER_ROW + col;
        const tileId = tiles[index] ?? 0;

        // Get tile asset
        const tileKey = tileMap[tileId] ?? defaultTileKey;
        const tileCanvas = this.assets.tiles.get(tileKey);

        // Calculate position (offset by HUD height)
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE + HUD_HEIGHT;

        if (tileCanvas) {
          this.ctx.drawImage(tileCanvas, x, y);
        } else {
          // Fallback: draw colored rectangle
          this.drawFallbackTile(x, y, tileId, context);
        }
      }
    }
  }

  /**
   * Renders a single tile at the specified grid position
   */
  renderTile(
    col: number,
    row: number,
    tileId: number,
    context: 'overworld' | 'dungeon' | 'cave' = 'overworld'
  ): void {
    const { tileMap, defaultTileKey } = this.getTileMapForContext(context);

    const tileKey = tileMap[tileId] ?? defaultTileKey;
    const tileCanvas = this.assets.tiles.get(tileKey);

    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE + HUD_HEIGHT;

    if (tileCanvas) {
      this.ctx.drawImage(tileCanvas, x, y);
    } else {
      this.drawFallbackTile(x, y, tileId, context);
    }
  }

  /**
   * Draws a fallback colored rectangle when tile asset is missing
   */
  private drawFallbackTile(
    x: number,
    y: number,
    tileId: number,
    context: 'overworld' | 'dungeon' | 'cave'
  ): void {
    // Color map for fallback rendering
    const overworldColors: Record<number, string> = {
      0: '#228B22', // grass - forest green
      1: '#D2691E', // ground - chocolate
      2: '#1E90FF', // water - dodger blue
      3: '#696969', // rock - dim gray
      4: '#2F4F2F', // tree - dark olive
      5: '#006400', // bush - dark green
      6: '#444444', // stairs - dark gray
      7: '#000000', // pit - black
      8: '#555555', // wall - gray
    };

    const dungeonColors: Record<number, string> = {
      0: '#444488', // floor - dark blue-gray
      1: '#444488',
      2: '#1E90FF', // water
      3: '#555599', // block - medium slate
      4: '#333366', // wall - dark slate
      5: '#444488',
      6: '#444444', // stairs
      7: '#000000', // pit
      8: '#333366',
      9: '#444488',
      10: '#333366',
      11: '#555599',
      12: '#000000', // door open
      13: '#FFD700', // door locked (gold)
      14: '#666666', // door shutter
    };

    const caveColors: Record<number, string> = {
      6: '#444444',  // stairs
      11: '#555599', // block
      20: '#3D2817', // cave floor - dark brown
      21: '#1A1A1A', // cave wall - black
      22: '#707070', // pillar - gray
      23: '#FF6600', // fire - orange
    };

    let colors: Record<number, string>;
    switch (context) {
      case 'dungeon':
        colors = dungeonColors;
        break;
      case 'cave':
        colors = caveColors;
        break;
      default:
        colors = overworldColors;
    }
    const color = colors[tileId] ?? '#FF00FF'; // Magenta for unknown tiles

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  /**
   * Renders tiles with a pixel offset (for screen transitions)
   */
  renderWithOffset(
    tiles: number[],
    offsetX: number,
    offsetY: number,
    context: 'overworld' | 'dungeon' | 'cave' = 'overworld'
  ): void {
    const { tileMap, defaultTileKey } = this.getTileMapForContext(context);

    for (let row = 0; row < TILES_PER_COL; row++) {
      for (let col = 0; col < TILES_PER_ROW; col++) {
        const index = row * TILES_PER_ROW + col;
        const tileId = tiles[index] ?? 0;

        const tileKey = tileMap[tileId] ?? defaultTileKey;
        const tileCanvas = this.assets.tiles.get(tileKey);

        const x = col * TILE_SIZE + offsetX;
        const y = row * TILE_SIZE + HUD_HEIGHT + offsetY;

        if (tileCanvas) {
          this.ctx.drawImage(tileCanvas, x, y);
        } else {
          this.drawFallbackTile(x, y, tileId, context);
        }
      }
    }
  }

  /**
   * Gets the tile key for a tile ID
   */
  getTileKey(tileId: number, context: 'overworld' | 'dungeon' | 'cave' = 'overworld'): TileKey {
    const { tileMap, defaultTileKey } = this.getTileMapForContext(context);
    return tileMap[tileId] ?? defaultTileKey;
  }
}
