// TileMap.ts - Tile map management for screens
// Handles tile data, collision queries, and screen rendering data

import {
  TILE_SIZE,
  TILES_PER_ROW,
  TILES_PER_COL,
  TILES_PER_SCREEN,
} from '../constants';
import { TileCollision, TileData } from '../types';

/**
 * Manages a single screen's tile data (16x11 tiles, 256x176 pixels)
 */
export class TileMap {
  private tiles: TileData[] = [];
  private loaded = false;

  /**
   * Load tile data for a screen
   * @param tileData Array of 176 TileData entries (16 columns x 11 rows)
   */
  load(tileData: TileData[]): void {
    if (tileData.length !== TILES_PER_SCREEN) {
      throw new Error(
        `Invalid tile data: expected ${TILES_PER_SCREEN} tiles, got ${tileData.length}`
      );
    }
    this.tiles = [...tileData];
    this.loaded = true;
  }

  /**
   * Clear the current tile map
   */
  clear(): void {
    this.tiles = [];
    this.loaded = false;
  }

  /**
   * Check if a tile map is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get tile data at a specific grid position
   * @param col Column (0-15)
   * @param row Row (0-10)
   * @returns TileData or null if out of bounds
   */
  getTileAt(col: number, row: number): TileData | null {
    if (!this.loaded) {
      return null;
    }
    if (col < 0 || col >= TILES_PER_ROW || row < 0 || row >= TILES_PER_COL) {
      return null;
    }
    const index = row * TILES_PER_ROW + col;
    return this.tiles[index] ?? null;
  }

  /**
   * Get collision type at a specific grid position
   * @param col Column (0-15)
   * @param row Row (0-10)
   * @returns TileCollision or 'SOLID' if out of bounds (treat OOB as walls)
   */
  getCollisionAt(col: number, row: number): TileCollision {
    if (!this.loaded) {
      return 'SOLID';
    }
    if (col < 0 || col >= TILES_PER_ROW || row < 0 || row >= TILES_PER_COL) {
      return 'SOLID';
    }
    const tile = this.getTileAt(col, row);
    return tile ? tile.collision : 'SOLID';
  }

  /**
   * Get collision type at pixel coordinates (play area relative)
   * @param x X position in pixels (0-255)
   * @param y Y position in pixels (0-175)
   * @returns TileCollision or 'SOLID' if out of bounds
   */
  getCollisionAtPixel(x: number, y: number): TileCollision {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    return this.getCollisionAt(col, row);
  }

  /**
   * Get all tiles for rendering
   * @returns Copy of the tile data array
   */
  getAllTiles(): readonly TileData[] {
    return [...this.tiles];
  }

  /**
   * Get tile data as a 2D grid (row-major)
   * @returns 2D array of TileData [row][col]
   */
  getTileGrid(): TileData[][] {
    const grid: TileData[][] = [];
    for (let row = 0; row < TILES_PER_COL; row++) {
      const rowData: TileData[] = [];
      for (let col = 0; col < TILES_PER_ROW; col++) {
        const tile = this.getTileAt(col, row);
        if (tile) {
          rowData.push(tile);
        }
      }
      grid.push(rowData);
    }
    return grid;
  }

  /**
   * Convert pixel coordinates to tile grid coordinates
   * @param x X position in pixels
   * @param y Y position in pixels
   * @returns Grid coordinates {col, row}
   */
  static pixelToTile(x: number, y: number): { col: number; row: number } {
    return {
      col: Math.floor(x / TILE_SIZE),
      row: Math.floor(y / TILE_SIZE),
    };
  }

  /**
   * Convert tile grid coordinates to pixel coordinates (top-left of tile)
   * @param col Column (0-15)
   * @param row Row (0-10)
   * @returns Pixel coordinates {x, y}
   */
  static tileToPixel(col: number, row: number): { x: number; y: number } {
    return {
      x: col * TILE_SIZE,
      y: row * TILE_SIZE,
    };
  }
}
