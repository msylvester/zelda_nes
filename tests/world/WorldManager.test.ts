import { describe, it, expect, beforeEach } from 'vitest';
import { WorldManager, WorldScreenData } from '../../src/world/WorldManager';
import { TileData, TileCollision } from '../../src/types';
import {
  TILES_PER_SCREEN,
  TILES_PER_ROW,
  TILES_PER_COL,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
  START_SCREEN_COL,
  START_SCREEN_ROW,
  TILE_SIZE,
  OVERWORLD_COLS,
  OVERWORLD_ROWS,
} from '../../src/constants';

function createTestScreenData(defaultCollision: TileCollision = 'PASSABLE'): WorldScreenData {
  const tiles: TileData[] = [];
  for (let i = 0; i < TILES_PER_SCREEN; i++) {
    tiles.push({ tileId: 0, collision: defaultCollision });
  }
  return { tiles };
}

function createMixedScreenData(): WorldScreenData {
  const tiles: TileData[] = [];
  for (let row = 0; row < TILES_PER_COL; row++) {
    for (let col = 0; col < TILES_PER_ROW; col++) {
      // Create a border of solid tiles
      const isBorder = row === 0 || row === TILES_PER_COL - 1 || col === 0 || col === TILES_PER_ROW - 1;
      tiles.push({
        tileId: isBorder ? 1 : 0,
        collision: isBorder ? 'SOLID' : 'PASSABLE',
      });
    }
  }
  return { tiles };
}

describe('WorldManager', () => {
  let worldManager: WorldManager;

  beforeEach(() => {
    worldManager = new WorldManager();
  });

  describe('initial state', () => {
    it('should start at the starting screen coordinates', () => {
      const screen = worldManager.getCurrentScreen();
      expect(screen.col).toBe(START_SCREEN_COL);
      expect(screen.row).toBe(START_SCREEN_ROW);
    });

    it('should start in OVERWORLD context', () => {
      expect(worldManager.getContext()).toBe('OVERWORLD');
    });
  });

  describe('registerScreen / getScreenData', () => {
    it('should register and retrieve screen data', () => {
      const data = createTestScreenData();
      worldManager.registerScreen(7, 7, data);
      expect(worldManager.getScreenData(7, 7)).toEqual(data);
    });

    it('should return null for unregistered screen', () => {
      expect(worldManager.getScreenData(0, 0)).toBeNull();
    });

    it('should overwrite existing screen data', () => {
      const data1 = createTestScreenData('PASSABLE');
      const data2 = createTestScreenData('SOLID');
      worldManager.registerScreen(7, 7, data1);
      worldManager.registerScreen(7, 7, data2);
      expect(worldManager.getScreenData(7, 7)?.tiles[0]?.collision).toBe('SOLID');
    });
  });

  describe('loadScreen', () => {
    it('should load a registered screen', () => {
      worldManager.registerScreen(7, 7, createTestScreenData());
      expect(worldManager.loadScreen(7, 7)).toBe(true);
      expect(worldManager.getTileMap().isLoaded()).toBe(true);
    });

    it('should update current screen coordinates', () => {
      worldManager.registerScreen(5, 3, createTestScreenData());
      worldManager.loadScreen(5, 3);
      const screen = worldManager.getCurrentScreen();
      expect(screen.col).toBe(5);
      expect(screen.row).toBe(3);
    });

    it('should return false for unregistered screen', () => {
      expect(worldManager.loadScreen(0, 0)).toBe(false);
    });

    it('should not modify current screen on failed load', () => {
      worldManager.registerScreen(7, 7, createTestScreenData());
      worldManager.loadScreen(7, 7);
      worldManager.loadScreen(0, 0); // Should fail
      const screen = worldManager.getCurrentScreen();
      expect(screen.col).toBe(7);
      expect(screen.row).toBe(7);
    });
  });

  describe('loadStartingScreen', () => {
    it('should load the starting screen when registered', () => {
      worldManager.registerScreen(START_SCREEN_COL, START_SCREEN_ROW, createTestScreenData());
      expect(worldManager.loadStartingScreen()).toBe(true);
    });

    it('should return false when starting screen not registered', () => {
      expect(worldManager.loadStartingScreen()).toBe(false);
    });
  });

  describe('isTileSolid', () => {
    it('should return true for SOLID tiles', () => {
      expect(worldManager.isTileSolid('SOLID')).toBe(true);
    });

    it('should return true for WATER tiles', () => {
      expect(worldManager.isTileSolid('WATER')).toBe(true);
    });

    it('should return true for PIT tiles', () => {
      expect(worldManager.isTileSolid('PIT')).toBe(true);
    });

    it('should return false for PASSABLE tiles', () => {
      expect(worldManager.isTileSolid('PASSABLE')).toBe(false);
    });

    it('should return false for STAIRS tiles', () => {
      expect(worldManager.isTileSolid('STAIRS')).toBe(false);
    });

    it('should return false for BUSH tiles', () => {
      expect(worldManager.isTileSolid('BUSH')).toBe(false);
    });

    it('should return false for ROCK tiles', () => {
      // ROCK is a pushable rock, not a solid obstacle in original Zelda
      expect(worldManager.isTileSolid('ROCK')).toBe(false);
    });
  });

  describe('checkCollision', () => {
    beforeEach(() => {
      worldManager.registerScreen(7, 7, createMixedScreenData());
      worldManager.loadScreen(7, 7);
    });

    it('should detect collision with solid border', () => {
      // Top-left corner (solid due to border)
      const hitbox = { x: 0, y: 0, width: 8, height: 8 };
      expect(worldManager.checkCollision(hitbox)).toBe(true);
    });

    it('should not detect collision in open area', () => {
      // Center of screen (passable)
      const hitbox = { x: 64, y: 64, width: 8, height: 8 };
      expect(worldManager.checkCollision(hitbox)).toBe(false);
    });

    it('should detect partial overlap with solid', () => {
      // Hitbox that spans border and interior
      const hitbox = { x: 12, y: 12, width: 8, height: 8 };
      expect(worldManager.checkCollision(hitbox)).toBe(true);
    });

    it('should handle hitbox at tile boundaries', () => {
      // Exactly at tile (1, 1) which is passable
      const hitbox = { x: 16, y: 16, width: 8, height: 8 };
      expect(worldManager.checkCollision(hitbox)).toBe(false);
    });
  });

  describe('checkScreenTransition', () => {
    beforeEach(() => {
      // Register screens around the starting screen
      worldManager.registerScreen(7, 7, createTestScreenData());
      worldManager.registerScreen(8, 7, createTestScreenData()); // Right
      worldManager.registerScreen(6, 7, createTestScreenData()); // Left
      worldManager.registerScreen(7, 6, createTestScreenData()); // Above
      worldManager.registerScreen(7, 8, createTestScreenData()); // Below (but row 8 is out of OVERWORLD_ROWS if max is 8)
      worldManager.loadScreen(7, 7);
    });

    it('should not trigger transition in center of screen', () => {
      const hitbox = { x: 128, y: 88, width: 8, height: 8 };
      expect(worldManager.checkScreenTransition(hitbox)).toBeNull();
    });

    it('should trigger left transition when crossing left edge', () => {
      // centerX = -8 + 4 = -4 (which is < 0)
      const hitbox = { x: -8, y: 88, width: 8, height: 8 };
      const transition = worldManager.checkScreenTransition(hitbox);
      expect(transition).not.toBeNull();
      expect(transition?.direction).toBe('LEFT');
      expect(transition?.toScreen.col).toBe(6);
    });

    it('should trigger right transition when crossing right edge', () => {
      const hitbox = { x: PLAY_AREA_WIDTH - 4, y: 88, width: 8, height: 8 };
      const transition = worldManager.checkScreenTransition(hitbox);
      expect(transition).not.toBeNull();
      expect(transition?.direction).toBe('RIGHT');
      expect(transition?.toScreen.col).toBe(8);
    });

    it('should trigger up transition when crossing top edge', () => {
      // centerY = -8 + 4 = -4 (which is < 0)
      const hitbox = { x: 128, y: -8, width: 8, height: 8 };
      const transition = worldManager.checkScreenTransition(hitbox);
      expect(transition).not.toBeNull();
      expect(transition?.direction).toBe('UP');
      expect(transition?.toScreen.row).toBe(6);
    });

    it('should trigger down transition when crossing bottom edge', () => {
      // Note: row 8 may or may not exist depending on OVERWORLD_ROWS
      // If OVERWORLD_ROWS is 8 (0-7), row 8 is invalid
      const hitbox = { x: 128, y: PLAY_AREA_HEIGHT - 4, width: 8, height: 8 };
      const transition = worldManager.checkScreenTransition(hitbox);
      // Should be null if row 8 is invalid (row >= OVERWORLD_ROWS)
      if (START_SCREEN_ROW + 1 >= OVERWORLD_ROWS) {
        expect(transition).toBeNull();
      } else {
        expect(transition?.direction).toBe('DOWN');
      }
    });

    it('should not trigger transition to unregistered screen', () => {
      // Try to transition to unregistered screen at (5, 7)
      const hitbox = { x: -100, y: 88, width: 8, height: 8 }; // Far left, goes to col 6, then col 5
      // First check if it would be col 6 (registered)
      worldManager.loadScreen(6, 7);
      const hitbox2 = { x: -4, y: 88, width: 8, height: 8 };
      const transition = worldManager.checkScreenTransition(hitbox2);
      // Screen at (5, 7) is not registered
      expect(transition).toBeNull();
    });
  });

  describe('canTransitionTo', () => {
    beforeEach(() => {
      worldManager.registerScreen(7, 7, createTestScreenData());
      worldManager.registerScreen(8, 7, createTestScreenData());
    });

    it('should return true for registered screen', () => {
      expect(worldManager.canTransitionTo(8, 7)).toBe(true);
    });

    it('should return false for unregistered screen', () => {
      expect(worldManager.canTransitionTo(0, 0)).toBe(false);
    });

    it('should return false for negative coordinates', () => {
      expect(worldManager.canTransitionTo(-1, 7)).toBe(false);
      expect(worldManager.canTransitionTo(7, -1)).toBe(false);
    });

    it('should return false for coordinates beyond overworld bounds', () => {
      expect(worldManager.canTransitionTo(OVERWORLD_COLS, 7)).toBe(false);
      expect(worldManager.canTransitionTo(7, OVERWORLD_ROWS)).toBe(false);
    });
  });

  describe('getPositionAfterTransition', () => {
    it('should position player at right edge when entering from left', () => {
      const hitbox = { x: -4, y: 80, width: 8, height: 8 };
      const pos = worldManager.getPositionAfterTransition('LEFT', hitbox);
      expect(pos.x).toBe(PLAY_AREA_WIDTH - TILE_SIZE);
      // Y should maintain relative position (sprite Y = hitbox.y - 8)
      expect(pos.y).toBe(72);
    });

    it('should position player at left edge when entering from right', () => {
      const hitbox = { x: 256, y: 80, width: 8, height: 8 };
      const pos = worldManager.getPositionAfterTransition('RIGHT', hitbox);
      expect(pos.x).toBe(0);
    });

    it('should position player at bottom edge when entering from top', () => {
      const hitbox = { x: 128, y: -4, width: 8, height: 8 };
      const pos = worldManager.getPositionAfterTransition('UP', hitbox);
      expect(pos.y).toBe(PLAY_AREA_HEIGHT - TILE_SIZE);
    });

    it('should position player at top edge when entering from bottom', () => {
      const hitbox = { x: 128, y: 180, width: 8, height: 8 };
      const pos = worldManager.getPositionAfterTransition('DOWN', hitbox);
      expect(pos.y).toBe(0);
    });
  });

  describe('getCollisionAtPixel', () => {
    beforeEach(() => {
      worldManager.registerScreen(7, 7, createMixedScreenData());
      worldManager.loadScreen(7, 7);
    });

    it('should return collision type at pixel position', () => {
      // Border tile at (0, 0) should be SOLID
      expect(worldManager.getCollisionAtPixel(0, 0)).toBe('SOLID');
      // Interior tile at (32, 32) should be PASSABLE
      expect(worldManager.getCollisionAtPixel(32, 32)).toBe('PASSABLE');
    });
  });

  describe('setContext', () => {
    it('should change map context', () => {
      worldManager.setContext('DUNGEON');
      expect(worldManager.getContext()).toBe('DUNGEON');
    });

    it('should support all context types', () => {
      worldManager.setContext('OVERWORLD');
      expect(worldManager.getContext()).toBe('OVERWORLD');
      worldManager.setContext('DUNGEON');
      expect(worldManager.getContext()).toBe('DUNGEON');
      worldManager.setContext('CAVE');
      expect(worldManager.getContext()).toBe('CAVE');
    });
  });

  describe('isValidScreenCoord', () => {
    it('should return true for valid coordinates', () => {
      expect(worldManager.isValidScreenCoord(0, 0)).toBe(true);
      expect(worldManager.isValidScreenCoord(7, 7)).toBe(true);
      expect(worldManager.isValidScreenCoord(15, 7)).toBe(true);
    });

    it('should return false for negative coordinates', () => {
      expect(worldManager.isValidScreenCoord(-1, 0)).toBe(false);
      expect(worldManager.isValidScreenCoord(0, -1)).toBe(false);
    });

    it('should return false for out of bounds coordinates', () => {
      expect(worldManager.isValidScreenCoord(OVERWORLD_COLS, 0)).toBe(false);
      expect(worldManager.isValidScreenCoord(0, OVERWORLD_ROWS)).toBe(false);
    });
  });
});
