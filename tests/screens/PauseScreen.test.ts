// PauseScreen.test.ts - Tests for pause screen functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PauseScreen,
  getPauseScreen,
  resetPauseScreen,
  PAUSE_SCREEN_CONFIG,
  B_ITEM_ORDER,
} from '../../src/screens/PauseScreen';
import type { PauseScreenData } from '../../src/screens/PauseScreen';
import type { InputSnapshot, ButtonState, NesButton, Inventory } from '../../src/types';
import { DEFAULT_INVENTORY } from '../../src/inventory/InventoryManager';

// ===== MOCK SETUP =====

function createMockContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    lineWidth: 1,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function createButtonState(held = false, justPressed = false, justReleased = false): ButtonState {
  return { held, justPressed, justReleased };
}

function createInputSnapshot(overrides: Partial<Record<NesButton, ButtonState>> = {}): InputSnapshot {
  const defaultButton = createButtonState();
  return {
    buttons: {
      UP: overrides.UP ?? defaultButton,
      DOWN: overrides.DOWN ?? defaultButton,
      LEFT: overrides.LEFT ?? defaultButton,
      RIGHT: overrides.RIGHT ?? defaultButton,
      A: overrides.A ?? defaultButton,
      B: overrides.B ?? defaultButton,
      START: overrides.START ?? defaultButton,
      SELECT: overrides.SELECT ?? defaultButton,
    },
    activeDirection: null,
    facingDirection: 'DOWN',
    frameNumber: 1,
  };
}

function createDefaultPauseData(inventoryOverrides: Partial<Inventory> = {}): PauseScreenData {
  return {
    inventory: { ...DEFAULT_INVENTORY, ...inventoryOverrides },
    currentHP: 6,
    heartContainers: 3,
    currentScreen: { col: 7, row: 7 },
    visitedScreens: new Set(['7,7']),
    triforcePieces: 0,
    isDungeon: false,
  };
}

// ===== TESTS =====

describe('PauseScreen', () => {
  let pauseScreen: PauseScreen;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    resetPauseScreen();
    pauseScreen = new PauseScreen();
    mockCtx = createMockContext();
  });

  describe('constructor and reset', () => {
    it('initializes with frame counter at 0', () => {
      expect(pauseScreen.getFrameCounter()).toBe(0);
    });

    it('initializes with cursor at index 0', () => {
      expect(pauseScreen.getCursorIndex()).toBe(0);
    });

    it('reset() restores initial state', () => {
      // Advance some frames and move cursor
      const input = createInputSnapshot();
      const data = createDefaultPauseData({ hasBoomerang: true, hasBombs: true, bombCount: 4 });

      for (let i = 0; i < 50; i++) {
        pauseScreen.update(input, data);
      }
      pauseScreen.setCursorIndex(1);

      expect(pauseScreen.getFrameCounter()).toBe(50);
      expect(pauseScreen.getCursorIndex()).toBe(1);

      // Reset
      pauseScreen.reset();
      expect(pauseScreen.getFrameCounter()).toBe(0);
      expect(pauseScreen.getCursorIndex()).toBe(0);
    });
  });

  describe('update - unpause', () => {
    it('increments frame counter each update', () => {
      const input = createInputSnapshot();
      const data = createDefaultPauseData();

      pauseScreen.update(input, data);
      expect(pauseScreen.getFrameCounter()).toBe(1);

      pauseScreen.update(input, data);
      expect(pauseScreen.getFrameCounter()).toBe(2);
    });

    it('returns GAMEPLAY phase when START is pressed', () => {
      const input = createInputSnapshot({
        START: createButtonState(true, true, false),
      });
      const data = createDefaultPauseData();

      const result = pauseScreen.update(input, data);
      expect(result.nextPhase).toBe('GAMEPLAY');
    });

    it('returns null nextPhase when no START pressed', () => {
      const input = createInputSnapshot();
      const data = createDefaultPauseData();

      const result = pauseScreen.update(input, data);
      expect(result.nextPhase).toBeNull();
    });

    it('does not unpause when START is held but not just pressed', () => {
      const input = createInputSnapshot({
        START: createButtonState(true, false, false),
      });
      const data = createDefaultPauseData();

      const result = pauseScreen.update(input, data);
      expect(result.nextPhase).toBeNull();
    });
  });

  describe('cursor navigation', () => {
    it('moves cursor right when RIGHT is pressed', () => {
      const input = createInputSnapshot({
        RIGHT: createButtonState(true, true, false),
      });
      const data = createDefaultPauseData({ hasBoomerang: true, hasBombs: true, bombCount: 4 });

      pauseScreen.update(input, data);
      expect(pauseScreen.getCursorIndex()).toBe(1);
    });

    it('moves cursor left when LEFT is pressed', () => {
      const input = createInputSnapshot();
      const data = createDefaultPauseData({ hasBoomerang: true, hasBombs: true, bombCount: 4 });

      // Move right first
      pauseScreen.update(createInputSnapshot({ RIGHT: createButtonState(true, true, false) }), data);
      expect(pauseScreen.getCursorIndex()).toBe(1);

      // Then move left
      pauseScreen.update(createInputSnapshot({ LEFT: createButtonState(true, true, false) }), data);
      expect(pauseScreen.getCursorIndex()).toBe(0);
    });

    it('does not move cursor left at index 0', () => {
      const input = createInputSnapshot({
        LEFT: createButtonState(true, true, false),
      });
      const data = createDefaultPauseData({ hasBoomerang: true, hasBombs: true, bombCount: 4 });

      expect(pauseScreen.getCursorIndex()).toBe(0);
      pauseScreen.update(input, data);
      expect(pauseScreen.getCursorIndex()).toBe(0);
    });

    it('does not move cursor past last item', () => {
      const data = createDefaultPauseData({ hasBoomerang: true }); // Only 1 item

      // Try to move right
      pauseScreen.update(createInputSnapshot({ RIGHT: createButtonState(true, true, false) }), data);
      expect(pauseScreen.getCursorIndex()).toBe(0);
    });

    it('moves cursor down in grid when DOWN is pressed', () => {
      // Need 5+ items to have a second row (4 cols)
      const data = createDefaultPauseData({
        hasBoomerang: true,
        hasBombs: true,
        bombCount: 4,
        hasBow: true,
        arrowType: 'wood',
        candleType: 'blue',
        hasRecorder: true,
      });

      // Move down
      pauseScreen.update(createInputSnapshot({ DOWN: createButtonState(true, true, false) }), data);
      expect(pauseScreen.getCursorIndex()).toBe(4); // Moved down one row (4 cols)
    });

    it('moves cursor up in grid when UP is pressed', () => {
      const data = createDefaultPauseData({
        hasBoomerang: true,
        hasBombs: true,
        bombCount: 4,
        hasBow: true,
        arrowType: 'wood',
        candleType: 'blue',
        hasRecorder: true,
      });

      // Start at second row
      pauseScreen.setCursorIndex(4);

      // Move up
      pauseScreen.update(createInputSnapshot({ UP: createButtonState(true, true, false) }), data);
      expect(pauseScreen.getCursorIndex()).toBe(0);
    });

    it('does not move cursor up when on first row', () => {
      const data = createDefaultPauseData({ hasBoomerang: true, hasBombs: true, bombCount: 4 });

      pauseScreen.update(createInputSnapshot({ UP: createButtonState(true, true, false) }), data);
      expect(pauseScreen.getCursorIndex()).toBe(0);
    });

    it('clamps cursor index to available items', () => {
      // Start with many items
      const data1 = createDefaultPauseData({
        hasBoomerang: true,
        hasBombs: true,
        bombCount: 4,
        hasBow: true,
        arrowType: 'wood',
      });
      pauseScreen.setCursorIndex(2);

      // Update with fewer items
      const data2 = createDefaultPauseData({ hasBoomerang: true });
      pauseScreen.update(createInputSnapshot(), data2);
      expect(pauseScreen.getCursorIndex()).toBe(0);
    });

    it('does nothing when no items available', () => {
      const data = createDefaultPauseData(); // No B-items

      pauseScreen.update(createInputSnapshot({ RIGHT: createButtonState(true, true, false) }), data);
      expect(pauseScreen.getCursorIndex()).toBe(0);
    });
  });

  describe('item selection', () => {
    it('selects item when A is pressed', () => {
      const data = createDefaultPauseData({ hasBoomerang: true });

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('BOOMERANG');
      expect(result.nextPhase).toBeNull();
    });

    it('selects correct item at cursor position', () => {
      const data = createDefaultPauseData({ hasBoomerang: true, hasBombs: true, bombCount: 4 });

      // Move cursor to bomb
      pauseScreen.update(createInputSnapshot({ RIGHT: createButtonState(true, true, false) }), data);

      // Select
      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('BOMB');
    });

    it('does not select item when no items available', () => {
      const data = createDefaultPauseData(); // No B-items

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBeUndefined();
    });

    it('does not include selectedBItem in result when A not pressed', () => {
      const data = createDefaultPauseData({ hasBoomerang: true });

      const result = pauseScreen.update(createInputSnapshot(), data);

      expect(result.selectedBItem).toBeUndefined();
    });
  });

  describe('available items detection', () => {
    it('includes boomerang when hasBoomerang is true', () => {
      const data = createDefaultPauseData({ hasBoomerang: true, boomerangType: 'wood' });

      // Select to check what's available
      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('BOOMERANG');
    });

    it('includes bombs when hasBombs and bombCount > 0', () => {
      const data = createDefaultPauseData({ hasBombs: true, bombCount: 4 });

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('BOMB');
    });

    it('includes bow_arrow when hasBow and arrowType', () => {
      const data = createDefaultPauseData({ hasBow: true, arrowType: 'wood' });

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('BOW_ARROW');
    });

    it('includes candle when candleType set', () => {
      const data = createDefaultPauseData({ candleType: 'blue' });

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('CANDLE');
    });

    it('includes recorder when hasRecorder', () => {
      const data = createDefaultPauseData({ hasRecorder: true });

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('RECORDER');
    });

    it('includes food when hasFood', () => {
      const data = createDefaultPauseData({ hasFood: true });

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('FOOD');
    });

    it('includes potion when potionState is potion1', () => {
      const data = createDefaultPauseData({ potionState: 'potion1' });

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('POTION');
    });

    it('includes potion when potionState is potion2', () => {
      const data = createDefaultPauseData({ potionState: 'potion2' });

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('POTION');
    });

    it('does not include potion when potionState is letter', () => {
      const data = createDefaultPauseData({ potionState: 'letter' });

      // No items available
      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBeUndefined();
    });

    it('includes magic_rod when hasMagicRod', () => {
      const data = createDefaultPauseData({ hasMagicRod: true });

      const result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );

      expect(result.selectedBItem).toBe('MAGIC_ROD');
    });

    it('items appear in correct order', () => {
      // All items available
      const data = createDefaultPauseData({
        hasBoomerang: true,
        boomerangType: 'wood',
        hasBombs: true,
        bombCount: 4,
        hasBow: true,
        arrowType: 'wood',
        candleType: 'blue',
      });

      // First item is boomerang
      let result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );
      expect(result.selectedBItem).toBe('BOOMERANG');

      // Move to second and select
      pauseScreen.update(createInputSnapshot({ RIGHT: createButtonState(true, true, false) }), data);
      result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );
      expect(result.selectedBItem).toBe('BOMB');

      // Third
      pauseScreen.update(createInputSnapshot({ RIGHT: createButtonState(true, true, false) }), data);
      result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );
      expect(result.selectedBItem).toBe('BOW_ARROW');

      // Fourth
      pauseScreen.update(createInputSnapshot({ RIGHT: createButtonState(true, true, false) }), data);
      result = pauseScreen.update(
        createInputSnapshot({ A: createButtonState(true, true, false) }),
        data
      );
      expect(result.selectedBItem).toBe('CANDLE');
    });
  });

  describe('render', () => {
    it('clears the area below HUD with background color', () => {
      const data = createDefaultPauseData();
      pauseScreen.render(mockCtx, data);

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('renders map border', () => {
      const data = createDefaultPauseData();
      pauseScreen.render(mockCtx, data);

      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });

    it('renders visited screens on overworld map', () => {
      const data = createDefaultPauseData();
      data.visitedScreens = new Set(['7,7', '8,7', '6,7']);

      pauseScreen.render(mockCtx, data);

      // Should call fillRect multiple times for visited screens
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('renders inventory grid cells', () => {
      const data = createDefaultPauseData({ hasBoomerang: true });
      pauseScreen.render(mockCtx, data);

      // Grid cells are rendered with fillRect and strokeRect
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });

    it('renders Triforce display section', () => {
      const data = createDefaultPauseData();
      data.triforcePieces = 3;

      pauseScreen.render(mockCtx, data);

      // Triforce pieces use beginPath for triangles
      expect(mockCtx.beginPath).toHaveBeenCalled();
    });

    it('renders equipment indicators', () => {
      const data = createDefaultPauseData({
        ringLevel: 1,
        swordLevel: 2,
        shieldType: 'standard',
      });

      pauseScreen.render(mockCtx, data);

      // Ring uses arc
      expect(mockCtx.arc).toHaveBeenCalled();
      // Sword and shield use fillRect
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('renders labels', () => {
      const data = createDefaultPauseData();
      pauseScreen.render(mockCtx, data);

      // Should render INVENTORY and MAP labels
      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      expect(fillTextCalls.some(call => call[0] === 'INVENTORY')).toBe(true);
      expect(fillTextCalls.some(call => call[0] === 'MAP')).toBe(true);
    });

    it('renders cursor on selected item (when blinking on)', () => {
      const data = createDefaultPauseData({ hasBoomerang: true });

      // Cursor blinks, ensure we're on a visible frame
      // Frame 0 should show cursor (frameCounter % 15 < 15/2)
      pauseScreen.render(mockCtx, data);

      // Cursor rendered with strokeRect with highlight color
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });

    it('renders dungeon map when isDungeon is true', () => {
      const data = createDefaultPauseData();
      data.isDungeon = true;
      data.dungeonMap = {
        rooms: [
          { col: 0, row: 0, visited: true },
          { col: 1, row: 0, visited: false },
        ],
        hasMap: true,
        hasCompass: false,
      };

      pauseScreen.render(mockCtx, data);

      // Should render dungeon map rooms
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('renders Triforce room blinking red when compass and triforceRoom', () => {
      const data = createDefaultPauseData();
      data.isDungeon = true;
      data.dungeonMap = {
        rooms: [{ col: 0, row: 0, visited: true }],
        hasMap: true,
        hasCompass: true,
        triforceRoom: { col: 2, row: 2 },
      };

      pauseScreen.render(mockCtx, data);

      // Should render with red color on certain frames
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });
});

describe('PauseScreen singleton', () => {
  beforeEach(() => {
    resetPauseScreen();
  });

  it('getPauseScreen returns a PauseScreen instance', () => {
    const instance = getPauseScreen();
    expect(instance).toBeInstanceOf(PauseScreen);
  });

  it('getPauseScreen returns the same instance on multiple calls', () => {
    const instance1 = getPauseScreen();
    const instance2 = getPauseScreen();
    expect(instance1).toBe(instance2);
  });

  it('resetPauseScreen creates a new instance on next call', () => {
    const instance1 = getPauseScreen();

    // Modify state
    instance1.setCursorIndex(2);
    expect(instance1.getCursorIndex()).toBe(2);

    // Reset
    resetPauseScreen();

    // New instance should have fresh state
    const instance2 = getPauseScreen();
    expect(instance2).not.toBe(instance1);
    expect(instance2.getCursorIndex()).toBe(0);
  });
});

describe('PAUSE_SCREEN_CONFIG', () => {
  it('has valid cursor blink interval', () => {
    expect(PAUSE_SCREEN_CONFIG.CURSOR_BLINK_INTERVAL).toBeGreaterThan(0);
  });

  it('has valid map dimensions', () => {
    expect(PAUSE_SCREEN_CONFIG.MAP.width).toBeGreaterThan(0);
    expect(PAUSE_SCREEN_CONFIG.MAP.height).toBeGreaterThan(0);
  });

  it('has valid inventory grid dimensions', () => {
    expect(PAUSE_SCREEN_CONFIG.INVENTORY_GRID.cols).toBeGreaterThan(0);
    expect(PAUSE_SCREEN_CONFIG.INVENTORY_GRID.rows).toBeGreaterThan(0);
    expect(PAUSE_SCREEN_CONFIG.INVENTORY_GRID.cellWidth).toBeGreaterThan(0);
    expect(PAUSE_SCREEN_CONFIG.INVENTORY_GRID.cellHeight).toBeGreaterThan(0);
  });

  it('has valid color values', () => {
    expect(PAUSE_SCREEN_CONFIG.BG_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(PAUSE_SCREEN_CONFIG.TEXT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(PAUSE_SCREEN_CONFIG.HIGHLIGHT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe('B_ITEM_ORDER', () => {
  it('contains all B-item types', () => {
    expect(B_ITEM_ORDER).toContain('BOOMERANG');
    expect(B_ITEM_ORDER).toContain('BOMB');
    expect(B_ITEM_ORDER).toContain('BOW_ARROW');
    expect(B_ITEM_ORDER).toContain('CANDLE');
    expect(B_ITEM_ORDER).toContain('RECORDER');
    expect(B_ITEM_ORDER).toContain('FOOD');
    expect(B_ITEM_ORDER).toContain('POTION');
    expect(B_ITEM_ORDER).toContain('MAGIC_ROD');
  });

  it('has 8 items', () => {
    expect(B_ITEM_ORDER.length).toBe(8);
  });
});

describe('PauseScreen edge cases', () => {
  let pauseScreen: PauseScreen;

  beforeEach(() => {
    resetPauseScreen();
    pauseScreen = new PauseScreen();
  });

  it('handles START press taking priority over item selection', () => {
    const data = createDefaultPauseData({ hasBoomerang: true });

    // Press both START and A
    const input = createInputSnapshot({
      START: createButtonState(true, true, false),
      A: createButtonState(true, true, false),
    });

    const result = pauseScreen.update(input, data);

    // START takes priority
    expect(result.nextPhase).toBe('GAMEPLAY');
  });

  it('handles simultaneous direction presses', () => {
    const data = createDefaultPauseData({ hasBoomerang: true, hasBombs: true, bombCount: 4 });

    // Press both LEFT and RIGHT
    const input = createInputSnapshot({
      LEFT: createButtonState(true, true, false),
      RIGHT: createButtonState(true, true, false),
    });

    // LEFT is checked first, but we're at 0 so nothing happens
    pauseScreen.update(input, data);
    // Cursor might move right after left check fails
    expect(pauseScreen.getCursorIndex()).toBeLessThanOrEqual(1);
  });

  it('frame counter does not overflow on extended pause', () => {
    const data = createDefaultPauseData();
    const input = createInputSnapshot();

    for (let i = 0; i < 10000; i++) {
      pauseScreen.update(input, data);
    }

    expect(pauseScreen.getFrameCounter()).toBe(10000);
  });

  it('handles empty visitedScreens set', () => {
    const data = createDefaultPauseData();
    data.visitedScreens = new Set();

    const mockCtx = createMockContext();

    // Should not throw
    expect(() => pauseScreen.render(mockCtx, data)).not.toThrow();
  });

  it('handles undefined visitedScreens', () => {
    const data = createDefaultPauseData();
    data.visitedScreens = undefined;

    const mockCtx = createMockContext();

    // Should not throw
    expect(() => pauseScreen.render(mockCtx, data)).not.toThrow();
  });

  it('handles undefined dungeonMap when isDungeon', () => {
    const data = createDefaultPauseData();
    data.isDungeon = true;
    data.dungeonMap = undefined;

    const mockCtx = createMockContext();

    // Should not throw
    expect(() => pauseScreen.render(mockCtx, data)).not.toThrow();
  });
});
