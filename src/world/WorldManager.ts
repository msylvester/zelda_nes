// WorldManager.ts - World management for screen navigation
// Handles screen loading, transitions, and world state

import {
  TILE_SIZE,
  TILES_PER_ROW,
  TILES_PER_COL,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
  OVERWORLD_COLS,
  OVERWORLD_ROWS,
  START_SCREEN_COL,
  START_SCREEN_ROW,
} from '../constants';
import {
  Direction,
  TileCollision,
  TileData,
  MapContext,
  AABB,
} from '../types';
import { TileMap } from './TileMap';

/**
 * Screen transition information
 */
export interface ScreenTransitionInfo {
  direction: Direction;
  fromScreen: { col: number; row: number };
  toScreen: { col: number; row: number };
}

/**
 * World screen data (simplified for now, will be expanded with full overworld data later)
 */
export interface WorldScreenData {
  tiles: TileData[];
}

/**
 * Manages the game world, screens, and navigation
 */
export class WorldManager {
  private tileMap: TileMap;
  private currentScreenCol: number;
  private currentScreenRow: number;
  private context: MapContext;
  private screenData: Map<string, WorldScreenData> = new Map();

  constructor() {
    this.tileMap = new TileMap();
    this.currentScreenCol = START_SCREEN_COL;
    this.currentScreenRow = START_SCREEN_ROW;
    this.context = 'OVERWORLD';
  }

  /**
   * Register screen data for a specific location
   * @param col Screen column
   * @param row Screen row
   * @param data Screen data
   */
  registerScreen(col: number, row: number, data: WorldScreenData): void {
    const key = `${col},${row}`;
    this.screenData.set(key, data);
  }

  /**
   * Get screen data for a specific location
   * @param col Screen column
   * @param row Screen row
   * @returns Screen data or null if not found
   */
  getScreenData(col: number, row: number): WorldScreenData | null {
    const key = `${col},${row}`;
    return this.screenData.get(key) ?? null;
  }

  /**
   * Load a screen at the specified coordinates
   * @param col Screen column (0-15 for overworld)
   * @param row Screen row (0-7 for overworld)
   * @returns True if screen was loaded successfully
   */
  loadScreen(col: number, row: number): boolean {
    const screenData = this.getScreenData(col, row);
    if (!screenData) {
      return false;
    }

    this.tileMap.load(screenData.tiles);
    this.currentScreenCol = col;
    this.currentScreenRow = row;
    return true;
  }

  /**
   * Load the starting screen
   */
  loadStartingScreen(): boolean {
    return this.loadScreen(START_SCREEN_COL, START_SCREEN_ROW);
  }

  /**
   * Get the current tile map
   */
  getTileMap(): TileMap {
    return this.tileMap;
  }

  /**
   * Get current screen coordinates
   */
  getCurrentScreen(): { col: number; row: number } {
    return {
      col: this.currentScreenCol,
      row: this.currentScreenRow,
    };
  }

  /**
   * Get current map context
   */
  getContext(): MapContext {
    return this.context;
  }

  /**
   * Get current screen column
   */
  getCurrentScreenCol(): number {
    return this.currentScreenCol;
  }

  /**
   * Get current screen row
   */
  getCurrentScreenRow(): number {
    return this.currentScreenRow;
  }

  /**
   * Get tile IDs for the current screen (for rendering)
   * @returns Array of tile IDs (0-based indices into tile set)
   */
  getCurrentTileIds(): number[] {
    const tiles = this.tileMap.getAllTiles();
    return tiles.map((tile) => tile.tileId);
  }

  /**
   * Set map context (OVERWORLD, DUNGEON, CAVE)
   */
  setContext(context: MapContext): void {
    this.context = context;
  }

  /**
   * Check if a tile collision type is solid (blocks movement)
   * @param collision TileCollision type
   * @returns True if the tile blocks movement
   */
  isTileSolid(collision: TileCollision): boolean {
    return collision === 'SOLID' || collision === 'WATER' || collision === 'PIT';
  }

  /**
   * Check if a position collides with solid tiles
   * @param hitbox Entity hitbox in play area coordinates
   * @returns True if any part of the hitbox overlaps a solid tile
   */
  checkCollision(hitbox: AABB): boolean {
    // Get all tile positions that the hitbox overlaps
    const leftCol = Math.floor(hitbox.x / TILE_SIZE);
    const rightCol = Math.floor((hitbox.x + hitbox.width - 1) / TILE_SIZE);
    const topRow = Math.floor(hitbox.y / TILE_SIZE);
    const bottomRow = Math.floor((hitbox.y + hitbox.height - 1) / TILE_SIZE);

    for (let row = topRow; row <= bottomRow; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        // Skip out-of-bounds tiles when an adjacent screen exists,
        // allowing the player to walk off-screen to trigger transitions
        if (col < 0 && this.canTransitionTo(this.currentScreenCol - 1, this.currentScreenRow)) continue;
        if (col >= TILES_PER_ROW && this.canTransitionTo(this.currentScreenCol + 1, this.currentScreenRow)) continue;
        if (row < 0 && this.canTransitionTo(this.currentScreenCol, this.currentScreenRow - 1)) continue;
        if (row >= TILES_PER_COL && this.canTransitionTo(this.currentScreenCol, this.currentScreenRow + 1)) continue;

        const collision = this.tileMap.getCollisionAt(col, row);
        if (this.isTileSolid(collision)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if the player should trigger a screen transition
   * @param playerHitbox Player's collision hitbox in play area coordinates
   * @returns ScreenTransitionInfo if a transition should occur, null otherwise
   */
  checkScreenTransition(playerHitbox: AABB): ScreenTransitionInfo | null {
    const centerX = playerHitbox.x + playerHitbox.width / 2;
    const centerY = playerHitbox.y + playerHitbox.height / 2;

    // Check each screen edge
    // Left edge
    if (centerX < 0) {
      const newCol = this.currentScreenCol - 1;
      if (this.canTransitionTo(newCol, this.currentScreenRow)) {
        return {
          direction: 'LEFT',
          fromScreen: { col: this.currentScreenCol, row: this.currentScreenRow },
          toScreen: { col: newCol, row: this.currentScreenRow },
        };
      }
    }

    // Right edge
    if (centerX >= PLAY_AREA_WIDTH) {
      const newCol = this.currentScreenCol + 1;
      if (this.canTransitionTo(newCol, this.currentScreenRow)) {
        return {
          direction: 'RIGHT',
          fromScreen: { col: this.currentScreenCol, row: this.currentScreenRow },
          toScreen: { col: newCol, row: this.currentScreenRow },
        };
      }
    }

    // Top edge
    if (centerY < 0) {
      const newRow = this.currentScreenRow - 1;
      if (this.canTransitionTo(this.currentScreenCol, newRow)) {
        return {
          direction: 'UP',
          fromScreen: { col: this.currentScreenCol, row: this.currentScreenRow },
          toScreen: { col: this.currentScreenCol, row: newRow },
        };
      }
    }

    // Bottom edge
    if (centerY >= PLAY_AREA_HEIGHT) {
      const newRow = this.currentScreenRow + 1;
      if (this.canTransitionTo(this.currentScreenCol, newRow)) {
        return {
          direction: 'DOWN',
          fromScreen: { col: this.currentScreenCol, row: this.currentScreenRow },
          toScreen: { col: this.currentScreenCol, row: newRow },
        };
      }
    }

    return null;
  }

  /**
   * Check if a screen transition is valid
   * @param col Target screen column
   * @param row Target screen row
   * @returns True if transition is allowed
   */
  canTransitionTo(col: number, row: number): boolean {
    // Check bounds
    if (col < 0 || col >= OVERWORLD_COLS || row < 0 || row >= OVERWORLD_ROWS) {
      return false;
    }

    // Check if screen data exists
    return this.getScreenData(col, row) !== null;
  }

  /**
   * Calculate player position after transitioning to a new screen
   * @param direction Direction of transition
   * @param currentHitbox Current player hitbox
   * @returns New player position (top-left of sprite, not hitbox)
   */
  getPositionAfterTransition(
    direction: Direction,
    currentHitbox: AABB
  ): { x: number; y: number } {
    // Player sprite is 16x16, hitbox is 8x8 at bottom center
    // So sprite X = hitbox.x - 4, sprite Y = hitbox.y - 8
    const spriteX = currentHitbox.x - 4;
    const spriteY = currentHitbox.y - 8;

    switch (direction) {
      case 'LEFT':
        // Enter from right edge
        return {
          x: PLAY_AREA_WIDTH - TILE_SIZE,
          y: spriteY,
        };
      case 'RIGHT':
        // Enter from left edge
        return { x: 0, y: spriteY };
      case 'UP':
        // Enter from bottom edge
        return {
          x: spriteX,
          y: PLAY_AREA_HEIGHT - TILE_SIZE,
        };
      case 'DOWN':
        // Enter from top edge
        return { x: spriteX, y: 0 };
    }
  }

  /**
   * Check collision type at pixel position
   * @param x X position in play area pixels
   * @param y Y position in play area pixels
   * @returns TileCollision type
   */
  getCollisionAtPixel(x: number, y: number): TileCollision {
    return this.tileMap.getCollisionAtPixel(x, y);
  }

  /**
   * Check if screen coordinates are within overworld bounds
   * @param col Screen column
   * @param row Screen row
   * @returns True if coordinates are valid
   */
  isValidScreenCoord(col: number, row: number): boolean {
    return col >= 0 && col < OVERWORLD_COLS && row >= 0 && row < OVERWORLD_ROWS;
  }
}
