// PauseScreen.ts - Pause/inventory screen per spec section 5.19
// Displays inventory items and map when game is paused

import type { InputSnapshot, GamePhase, BItemSlot, Inventory } from '../types';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  HUD_HEIGHT,
  OVERWORLD_COLS,
  OVERWORLD_ROWS,
} from '../constants';
import type { GeneratedAssets, SpriteKey } from '../assets/AssetGenerator';

/**
 * Configuration for PauseScreen layout
 */
export const PAUSE_SCREEN_CONFIG = {
  /** Background color */
  BG_COLOR: '#000000',
  /** Text color */
  TEXT_COLOR: '#FFFFFF',
  /** Highlight color for selected item */
  HIGHLIGHT_COLOR: '#FF0000',
  /** Item grid color */
  GRID_COLOR: '#444444',
  /** Map area dimensions */
  MAP: {
    x: 16,
    y: HUD_HEIGHT + 8,
    width: 128,
    height: 64,
    cellWidth: 8,
    cellHeight: 8,
  },
  /** Inventory item grid */
  INVENTORY_GRID: {
    x: 128,
    y: HUD_HEIGHT + 16,
    cellWidth: 24,
    cellHeight: 24,
    cols: 4,
    rows: 2,
  },
  /** Triforce display area */
  TRIFORCE: {
    x: 32,
    y: HUD_HEIGHT + 88,
    width: 80,
    height: 48,
  },
  /** Equipment display area (ring, sword, etc) */
  EQUIPMENT: {
    x: 128,
    y: HUD_HEIGHT + 72,
    itemWidth: 24,
    itemHeight: 24,
  },
  /** Labels */
  LABELS: {
    inventoryY: HUD_HEIGHT + 8,
    useY: HUD_HEIGHT + 80,
  },
  /** Cursor blink interval in frames */
  CURSOR_BLINK_INTERVAL: 15,
} as const;

/**
 * B-items in display order
 */
export const B_ITEM_ORDER: BItemSlot[] = [
  'BOOMERANG',
  'BOMB',
  'BOW_ARROW',
  'CANDLE',
  'RECORDER',
  'FOOD',
  'POTION',
  'MAGIC_ROD',
];

/**
 * Map B-item type to sprite key
 */
const B_ITEM_SPRITES: Record<BItemSlot, SpriteKey | null> = {
  'BOOMERANG': 'projectile_boomerang',
  'BOMB': 'item_bomb',
  'BOW_ARROW': null, // Would need arrow sprite
  'CANDLE': null, // Would need candle sprite
  'RECORDER': null, // Would need recorder sprite
  'FOOD': null, // Would need food sprite
  'POTION': null, // Would need potion sprite
  'MAGIC_ROD': null, // Would need magic rod sprite
};

/**
 * Data needed to render the pause screen
 */
export interface PauseScreenData {
  /** Full inventory state */
  inventory: Inventory;
  /** Current HP in half-hearts */
  currentHP: number;
  /** Heart containers count */
  heartContainers: number;
  /** Current screen position */
  currentScreen: { col: number; row: number };
  /** Set of visited screen coordinates as "col,row" strings */
  visitedScreens?: Set<string>;
  /** Triforce pieces collected (0-8) */
  triforcePieces?: number;
  /** Whether in a dungeon */
  isDungeon?: boolean;
  /** Dungeon map data if available */
  dungeonMap?: {
    rooms: { col: number; row: number; visited: boolean }[];
    hasMap: boolean;
    hasCompass: boolean;
    triforceRoom?: { col: number; row: number };
  };
}

/**
 * Result of pause screen update
 */
export interface PauseScreenUpdateResult {
  /** New phase to transition to, or null if staying paused */
  nextPhase: GamePhase | null;
  /** Newly selected B-item (if changed) */
  selectedBItem?: BItemSlot | null;
}

/**
 * Pause screen handler with inventory display and item selection
 */
export class PauseScreen {
  /** Frame counter for animations */
  private frameCounter: number = 0;

  /** Currently selected item index in the B-item grid */
  private cursorIndex: number = 0;

  /** Optional assets for rendering sprites */
  private assets: GeneratedAssets | null = null;

  constructor() {
    this.reset();
  }

  /**
   * Set assets for sprite rendering
   */
  setAssets(assets: GeneratedAssets): void {
    this.assets = assets;
  }

  /**
   * Reset pause screen state
   */
  reset(): void {
    this.frameCounter = 0;
    this.cursorIndex = 0;
  }

  /**
   * Update the pause screen and handle input
   * @param input Current input snapshot
   * @param data Pause screen data (inventory, etc.)
   * @returns Update result with phase transition and item selection
   */
  update(input: InputSnapshot, data: PauseScreenData): PauseScreenUpdateResult {
    this.frameCounter++;

    // Check for unpause
    if (input.buttons.START.justPressed) {
      return { nextPhase: 'GAMEPLAY' };
    }

    // Get available B-items for cursor navigation
    const availableItems = this.getAvailableBItems(data.inventory);

    // Handle cursor movement in inventory grid
    if (availableItems.length > 0) {
      const { cols } = PAUSE_SCREEN_CONFIG.INVENTORY_GRID;

      if (input.buttons.LEFT.justPressed) {
        // Move left in grid
        const currentCol = this.cursorIndex % cols;
        if (currentCol > 0) {
          this.cursorIndex--;
        }
      } else if (input.buttons.RIGHT.justPressed) {
        // Move right in grid
        const currentCol = this.cursorIndex % cols;
        if (currentCol < cols - 1 && this.cursorIndex < availableItems.length - 1) {
          this.cursorIndex++;
        }
      } else if (input.buttons.UP.justPressed) {
        // Move up in grid
        if (this.cursorIndex >= cols) {
          this.cursorIndex -= cols;
        }
      } else if (input.buttons.DOWN.justPressed) {
        // Move down in grid
        if (this.cursorIndex + cols < availableItems.length) {
          this.cursorIndex += cols;
        }
      }

      // Clamp cursor to available items
      this.cursorIndex = Math.min(this.cursorIndex, availableItems.length - 1);
      this.cursorIndex = Math.max(0, this.cursorIndex);

      // Select item with A button
      if (input.buttons.A.justPressed) {
        const selectedItem = availableItems[this.cursorIndex];
        if (selectedItem !== undefined) {
          return {
            nextPhase: null,
            selectedBItem: selectedItem,
          };
        }
      }
    }

    return { nextPhase: null };
  }

  /**
   * Get list of B-items the player owns (in display order)
   */
  private getAvailableBItems(inventory: Inventory): BItemSlot[] {
    const items: BItemSlot[] = [];

    for (const item of B_ITEM_ORDER) {
      if (this.hasItem(inventory, item)) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Check if player has a specific B-item
   */
  private hasItem(inventory: Inventory, item: BItemSlot): boolean {
    switch (item) {
      case 'BOOMERANG':
        return inventory.hasBoomerang;
      case 'BOMB':
        return inventory.hasBombs;
      case 'BOW_ARROW':
        return inventory.hasBow && !!inventory.arrowType;
      case 'CANDLE':
        return !!inventory.candleType;
      case 'RECORDER':
        return inventory.hasRecorder;
      case 'FOOD':
        return inventory.hasFood;
      case 'POTION':
        return inventory.potionState === 'potion1' || inventory.potionState === 'potion2';
      case 'MAGIC_ROD':
        return inventory.hasMagicRod;
      default:
        return false;
    }
  }

  /**
   * Render the pause screen
   * @param ctx Canvas rendering context
   * @param data Pause screen data
   */
  render(ctx: CanvasRenderingContext2D, data: PauseScreenData): void {
    const config = PAUSE_SCREEN_CONFIG;

    // Clear to black
    ctx.fillStyle = config.BG_COLOR;
    ctx.fillRect(0, HUD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT - HUD_HEIGHT);

    // Render components
    this.renderMap(ctx, data);
    this.renderInventoryGrid(ctx, data);
    this.renderTriforceDisplay(ctx, data);
    this.renderEquipment(ctx, data);
    this.renderLabels(ctx);
  }

  /**
   * Render the map display
   */
  private renderMap(ctx: CanvasRenderingContext2D, data: PauseScreenData): void {
    const { MAP } = PAUSE_SCREEN_CONFIG;

    // Draw map border
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(MAP.x - 1, MAP.y - 1, MAP.width + 2, MAP.height + 2);

    // Draw map background
    ctx.fillStyle = '#222222';
    ctx.fillRect(MAP.x, MAP.y, MAP.width, MAP.height);

    if (data.isDungeon && data.dungeonMap) {
      // Render dungeon map
      this.renderDungeonMap(ctx, data);
    } else {
      // Render overworld map
      this.renderOverworldMap(ctx, data);
    }
  }

  /**
   * Render overworld map with visited screens
   */
  private renderOverworldMap(ctx: CanvasRenderingContext2D, data: PauseScreenData): void {
    const { MAP } = PAUSE_SCREEN_CONFIG;

    // Calculate cell size
    const cellWidth = MAP.width / OVERWORLD_COLS;
    const cellHeight = MAP.height / OVERWORLD_ROWS;

    // Draw visited screens
    if (data.visitedScreens) {
      ctx.fillStyle = '#666666';
      for (const screenKey of data.visitedScreens) {
        const [colStr, rowStr] = screenKey.split(',');
        const col = parseInt(colStr ?? '0', 10);
        const row = parseInt(rowStr ?? '0', 10);
        const x = MAP.x + col * cellWidth;
        const y = MAP.y + row * cellHeight;
        ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
      }
    }

    // Draw current position (blinking)
    const shouldBlink = Math.floor(this.frameCounter / 16) % 2 === 0;
    if (shouldBlink) {
      ctx.fillStyle = '#00FF00';
      const currentX = MAP.x + data.currentScreen.col * cellWidth;
      const currentY = MAP.y + data.currentScreen.row * cellHeight;
      ctx.fillRect(currentX + 1, currentY + 1, cellWidth - 2, cellHeight - 2);
    }
  }

  /**
   * Render dungeon map
   */
  private renderDungeonMap(ctx: CanvasRenderingContext2D, data: PauseScreenData): void {
    const { MAP } = PAUSE_SCREEN_CONFIG;
    const dungeonMap = data.dungeonMap;
    if (!dungeonMap) return;

    // Dungeon rooms are 8x8 grid
    const cellWidth = MAP.width / 8;
    const cellHeight = MAP.height / 8;

    // Draw rooms
    for (const room of dungeonMap.rooms) {
      if (dungeonMap.hasMap || room.visited) {
        const x = MAP.x + room.col * cellWidth;
        const y = MAP.y + room.row * cellHeight;
        ctx.fillStyle = room.visited ? '#FFFFFF' : '#666666';
        ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
      }
    }

    // Draw Triforce room if has compass (blinking red)
    if (dungeonMap.hasCompass && dungeonMap.triforceRoom) {
      const shouldBlink = Math.floor(this.frameCounter / 16) % 2 === 0;
      if (shouldBlink) {
        const x = MAP.x + dungeonMap.triforceRoom.col * cellWidth;
        const y = MAP.y + dungeonMap.triforceRoom.row * cellHeight;
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
      }
    }

    // Draw current position (blinking green)
    const shouldBlink = Math.floor(this.frameCounter / 16) % 2 === 0;
    if (shouldBlink) {
      ctx.fillStyle = '#00FF00';
      const currentX = MAP.x + data.currentScreen.col * cellWidth;
      const currentY = MAP.y + data.currentScreen.row * cellHeight;
      ctx.fillRect(currentX + 1, currentY + 1, cellWidth - 2, cellHeight - 2);
    }
  }

  /**
   * Render the B-item inventory grid
   */
  private renderInventoryGrid(ctx: CanvasRenderingContext2D, data: PauseScreenData): void {
    const { INVENTORY_GRID } = PAUSE_SCREEN_CONFIG;
    const availableItems = this.getAvailableBItems(data.inventory);

    // Draw grid cells
    for (let row = 0; row < INVENTORY_GRID.rows; row++) {
      for (let col = 0; col < INVENTORY_GRID.cols; col++) {
        const x = INVENTORY_GRID.x + col * INVENTORY_GRID.cellWidth;
        const y = INVENTORY_GRID.y + row * INVENTORY_GRID.cellHeight;

        // Draw cell background
        ctx.fillStyle = '#111111';
        ctx.fillRect(x, y, INVENTORY_GRID.cellWidth - 2, INVENTORY_GRID.cellHeight - 2);

        // Draw cell border
        ctx.strokeStyle = PAUSE_SCREEN_CONFIG.GRID_COLOR;
        ctx.strokeRect(x, y, INVENTORY_GRID.cellWidth - 2, INVENTORY_GRID.cellHeight - 2);
      }
    }

    // Draw available items
    for (let i = 0; i < availableItems.length; i++) {
      const item = availableItems[i];
      if (item === undefined) continue;

      const row = Math.floor(i / INVENTORY_GRID.cols);
      const col = i % INVENTORY_GRID.cols;
      const x = INVENTORY_GRID.x + col * INVENTORY_GRID.cellWidth;
      const y = INVENTORY_GRID.y + row * INVENTORY_GRID.cellHeight;

      // Draw item sprite or placeholder
      this.renderBItem(ctx, item, x + 4, y + 4);
    }

    // Draw cursor (blinking)
    if (availableItems.length > 0) {
      const cursorRow = Math.floor(this.cursorIndex / INVENTORY_GRID.cols);
      const cursorCol = this.cursorIndex % INVENTORY_GRID.cols;
      const cursorX = INVENTORY_GRID.x + cursorCol * INVENTORY_GRID.cellWidth;
      const cursorY = INVENTORY_GRID.y + cursorRow * INVENTORY_GRID.cellHeight;

      const shouldBlink = Math.floor(this.frameCounter / PAUSE_SCREEN_CONFIG.CURSOR_BLINK_INTERVAL) % 2 === 0;
      if (shouldBlink) {
        ctx.strokeStyle = PAUSE_SCREEN_CONFIG.HIGHLIGHT_COLOR;
        ctx.lineWidth = 2;
        ctx.strokeRect(cursorX - 1, cursorY - 1, INVENTORY_GRID.cellWidth, INVENTORY_GRID.cellHeight);
        ctx.lineWidth = 1;
      }
    }

    // Show currently selected B-item
    if (data.inventory.selectedBItem) {
      this.renderSelectedBItem(ctx, data.inventory.selectedBItem);
    }
  }

  /**
   * Render a B-item in the grid
   */
  private renderBItem(ctx: CanvasRenderingContext2D, item: BItemSlot, x: number, y: number): void {
    const spriteKey = B_ITEM_SPRITES[item];

    if (spriteKey && this.assets) {
      const sprite = this.assets.sprites.get(spriteKey);
      if (sprite) {
        ctx.drawImage(sprite, x, y);
        return;
      }
    }

    // Fallback: draw colored rectangle with label
    const colors: Record<BItemSlot, string> = {
      'BOOMERANG': '#8B4513',
      'BOMB': '#333333',
      'BOW_ARROW': '#8B4513',
      'CANDLE': '#FF6600',
      'RECORDER': '#4169E1',
      'FOOD': '#FF69B4',
      'POTION': '#0000FF',
      'MAGIC_ROD': '#FFD700',
    };

    ctx.fillStyle = colors[item];
    ctx.fillRect(x, y, 16, 16);

    // Draw first letter as label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.charAt(0), x + 8, y + 8);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Render the currently selected B-item indicator
   */
  private renderSelectedBItem(ctx: CanvasRenderingContext2D, item: BItemSlot): void {
    const { INVENTORY_GRID } = PAUSE_SCREEN_CONFIG;
    const x = INVENTORY_GRID.x - 32;
    const y = INVENTORY_GRID.y + 8;

    // Draw "USE" label
    ctx.fillStyle = PAUSE_SCREEN_CONFIG.TEXT_COLOR;
    ctx.font = '8px monospace';
    ctx.fillText('B', x, y - 4);

    // Draw selected item box
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(x - 2, y + 2, 20, 20);

    // Draw the item
    this.renderBItem(ctx, item, x, y + 4);
  }

  /**
   * Render Triforce piece display
   */
  private renderTriforceDisplay(ctx: CanvasRenderingContext2D, data: PauseScreenData): void {
    const { TRIFORCE } = PAUSE_SCREEN_CONFIG;
    const pieces = data.triforcePieces ?? 0;

    // Draw Triforce outline
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;

    // Draw label
    ctx.fillStyle = PAUSE_SCREEN_CONFIG.TEXT_COLOR;
    ctx.font = '8px monospace';
    ctx.fillText('TRIFORCE', TRIFORCE.x, TRIFORCE.y - 4);

    // Draw 8 Triforce piece slots in a row
    const pieceSize = 8;
    const pieceSpacing = 10;
    for (let i = 0; i < 8; i++) {
      const x = TRIFORCE.x + i * pieceSpacing;
      const y = TRIFORCE.y + 8;

      if (i < pieces) {
        // Filled piece (gold)
        ctx.fillStyle = '#FFD700';
        this.drawTrianglePiece(ctx, x, y, pieceSize, true);
      } else {
        // Empty slot (outline only)
        ctx.strokeStyle = '#444444';
        this.drawTrianglePiece(ctx, x, y, pieceSize, false);
      }
    }
  }

  /**
   * Draw a single Triforce piece (small triangle)
   */
  private drawTrianglePiece(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    const halfSize = size / 2;
    const height = (size * Math.sqrt(3)) / 2;

    ctx.beginPath();
    ctx.moveTo(x + halfSize, y);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + size, y + height);
    ctx.closePath();

    if (filled) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  /**
   * Render equipment display (ring level, sword, shield)
   */
  private renderEquipment(ctx: CanvasRenderingContext2D, data: PauseScreenData): void {
    const { EQUIPMENT } = PAUSE_SCREEN_CONFIG;
    const inv = data.inventory;

    // Draw ring indicator
    if (inv.ringLevel > 0) {
      const ringColor = inv.ringLevel === 2 ? '#FF0000' : '#0000FF';
      ctx.fillStyle = ringColor;
      ctx.beginPath();
      ctx.arc(EQUIPMENT.x + 8, EQUIPMENT.y + 8, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(EQUIPMENT.x + 8, EQUIPMENT.y + 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw sword indicator
    if (inv.swordLevel > 0) {
      const swordColors = ['', '#8B4513', '#FFFFFF', '#FFD700'];
      ctx.fillStyle = swordColors[inv.swordLevel] ?? '#8B4513';
      ctx.fillRect(EQUIPMENT.x + 28, EQUIPMENT.y + 2, 4, 14);
      ctx.fillRect(EQUIPMENT.x + 24, EQUIPMENT.y + 4, 12, 4);
    }

    // Draw shield indicator
    if (inv.shieldType) {
      const shieldColor = inv.shieldType === 'magic' ? '#FF0000' : '#8B4513';
      ctx.fillStyle = shieldColor;
      ctx.fillRect(EQUIPMENT.x + 48, EQUIPMENT.y + 2, 10, 14);
    }

    // Draw power bracelet indicator
    if (inv.hasPowerBracelet) {
      ctx.fillStyle = '#FFA500';
      ctx.fillRect(EQUIPMENT.x + 68, EQUIPMENT.y + 4, 8, 8);
    }

    // Draw raft indicator
    if (inv.hasRaft) {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(EQUIPMENT.x + 0, EQUIPMENT.y + 24, 16, 8);
    }

    // Draw ladder indicator
    if (inv.hasLadder) {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(EQUIPMENT.x + 24, EQUIPMENT.y + 24, 4, 12);
      ctx.fillRect(EQUIPMENT.x + 32, EQUIPMENT.y + 24, 4, 12);
      ctx.fillRect(EQUIPMENT.x + 24, EQUIPMENT.y + 26, 12, 2);
      ctx.fillRect(EQUIPMENT.x + 24, EQUIPMENT.y + 30, 12, 2);
    }

    // Draw magic key indicator
    if (inv.hasMagicKey) {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(EQUIPMENT.x + 48, EQUIPMENT.y + 24, 4, 10);
      ctx.fillRect(EQUIPMENT.x + 48, EQUIPMENT.y + 24, 8, 4);
    }
  }

  /**
   * Render text labels
   */
  private renderLabels(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PAUSE_SCREEN_CONFIG.TEXT_COLOR;
    ctx.font = '8px monospace';

    // "INVENTORY" label
    ctx.fillText('INVENTORY', PAUSE_SCREEN_CONFIG.INVENTORY_GRID.x, PAUSE_SCREEN_CONFIG.LABELS.inventoryY);

    // "MAP" label
    ctx.fillText('MAP', PAUSE_SCREEN_CONFIG.MAP.x, PAUSE_SCREEN_CONFIG.MAP.y - 4);
  }

  /**
   * Get frame counter (for testing)
   */
  getFrameCounter(): number {
    return this.frameCounter;
  }

  /**
   * Get cursor index (for testing)
   */
  getCursorIndex(): number {
    return this.cursorIndex;
  }

  /**
   * Set cursor index (for testing)
   */
  setCursorIndex(index: number): void {
    this.cursorIndex = index;
  }
}

// ===== SINGLETON PATTERN =====

let pauseScreenInstance: PauseScreen | null = null;

/**
 * Gets the singleton PauseScreen instance
 */
export function getPauseScreen(): PauseScreen {
  if (!pauseScreenInstance) {
    pauseScreenInstance = new PauseScreen();
  }
  return pauseScreenInstance;
}

/**
 * Resets the singleton PauseScreen instance (for testing)
 */
export function resetPauseScreen(): void {
  pauseScreenInstance = null;
}
