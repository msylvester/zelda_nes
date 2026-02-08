// HudRenderer.ts - HUD overlay rendering (hearts, minimap, counters)
// The HUD occupies the top 64 pixels of the 256x240 screen

import {
  SCREEN_WIDTH,
  HUD_HEIGHT,
  OVERWORLD_COLS,
  OVERWORLD_ROWS,
  MAX_HEARTS,
} from '../constants';
import type { GeneratedAssets, SpriteKey } from '../assets/AssetGenerator';
import { PLACEHOLDER_COLORS } from '../assets/AssetGenerator';
import type { Inventory, BItemSlot } from '../types';

// ===== HUD LAYOUT CONSTANTS =====

/** HUD layout positions per spec section 5 */
export const HUD_LAYOUT = {
  /** Minimap area */
  minimap: {
    x: 16,
    y: 8,
    width: 64,
    height: 32,
  },

  /** B-button item display */
  bButtonItem: {
    x: 128,
    y: 8,
    width: 16,
    height: 16,
  },

  /** A-button item display (sword indicator) */
  aButtonItem: {
    x: 152,
    y: 8,
    width: 16,
    height: 16,
  },

  /** Heart row */
  hearts: {
    x: 176,
    y: 40,
    heartsPerRow: 8,
    heartWidth: 8,
    heartHeight: 8,
  },

  /** Rupee counter */
  rupees: {
    x: 96,
    y: 16,
  },

  /** Key counter */
  keys: {
    x: 96,
    y: 24,
  },

  /** Bomb counter */
  bombs: {
    x: 96,
    y: 32,
  },

  /** Labels */
  labels: {
    inventoryX: 8,
    inventoryY: 0,
    lifeX: 176,
    lifeY: 32,
  },
} as const;

// ===== TYPES =====

/** Heart display state */
export type HeartState = 'FULL' | 'HALF' | 'EMPTY';

/** Data needed to render the HUD */
export interface HudData {
  /** Current HP in half-hearts */
  currentHP: number;
  /** Maximum HP in half-hearts (heart containers * 2) */
  maxHP: number;
  /** Current rupee count */
  rupees: number;
  /** Current key count */
  keys: number;
  /** Current bomb count */
  bombs: number;
  /** Currently equipped B-item (null if none) */
  selectedBItem: BItemSlot | null;
  /** Player's sword level (0 = no sword) */
  swordLevel: number;
  /** Current screen position on overworld (col, row) */
  currentScreen: { col: number; row: number };
  /** Set of visited screen coordinates as "col,row" strings */
  visitedScreens?: Set<string>;
  /** Current frame number for animations (e.g., blinking) */
  frameCounter?: number;
  /** Whether currently in a dungeon */
  isDungeon?: boolean;
  /** Dungeon map data if in dungeon and has map item */
  dungeonMap?: {
    rooms: { col: number; row: number; visited: boolean }[];
    hasMap: boolean;
    hasCompass: boolean;
    triforceRoom?: { col: number; row: number };
  };
}

// ===== HUD RENDERER CLASS =====

/**
 * Renders the HUD overlay in the top 64 pixels of the screen
 * Includes hearts, minimap, rupee/key/bomb counters, and item slots
 */
export class HudRenderer {
  private ctx: CanvasRenderingContext2D;
  private assets: GeneratedAssets;

  constructor(ctx: CanvasRenderingContext2D, assets: GeneratedAssets) {
    this.ctx = ctx;
    this.assets = assets;
  }

  /**
   * Renders the complete HUD
   */
  render(data: HudData): void {
    // 1. Draw HUD background (black)
    this.renderBackground();

    // 2. Draw labels
    this.renderLabels();

    // 3. Draw minimap
    this.renderMinimap(data);

    // 4. Draw item slots (B and A buttons)
    this.renderItemSlots(data);

    // 5. Draw hearts
    this.renderHearts(data.currentHP, data.maxHP);

    // 6. Draw rupee/key/bomb counters
    this.renderCounters(data.rupees, data.keys, data.bombs);
  }

  /**
   * Renders the HUD background
   */
  private renderBackground(): void {
    this.ctx.fillStyle = PLACEHOLDER_COLORS.HUD_BG;
    this.ctx.fillRect(0, 0, SCREEN_WIDTH, HUD_HEIGHT);
  }

  /**
   * Renders HUD labels (INVENTORY, -LIFE-)
   */
  private renderLabels(): void {
    this.ctx.fillStyle = PLACEHOLDER_COLORS.HUD_TEXT;
    this.ctx.font = '8px monospace';

    // "INVENTORY" label in top-left area
    // Note: Using simple text for now, could be replaced with sprite font
    this.drawText('INVENTORY', HUD_LAYOUT.labels.inventoryX, HUD_LAYOUT.labels.inventoryY + 8);

    // "-LIFE-" label above hearts
    this.drawText('-LIFE-', HUD_LAYOUT.labels.lifeX, HUD_LAYOUT.labels.lifeY + 8);
  }

  /**
   * Renders the minimap showing current position
   */
  private renderMinimap(data: HudData): void {
    const { minimap } = HUD_LAYOUT;

    // Draw minimap background
    const minimapBg = this.assets.sprites.get('hud_minimap_bg');
    if (minimapBg) {
      this.ctx.drawImage(minimapBg, minimap.x, minimap.y);
    } else {
      // Fallback: draw rectangle
      this.ctx.fillStyle = PLACEHOLDER_COLORS.HUD_MINIMAP_BG;
      this.ctx.fillRect(minimap.x, minimap.y, minimap.width, minimap.height);
      this.ctx.strokeStyle = '#666666';
      this.ctx.strokeRect(minimap.x + 0.5, minimap.y + 0.5, minimap.width - 1, minimap.height - 1);
    }

    if (data.isDungeon && data.dungeonMap) {
      // Dungeon minimap rendering
      this.renderDungeonMinimap(data);
    } else {
      // Overworld minimap rendering
      this.renderOverworldMinimap(data);
    }
  }

  /**
   * Renders the overworld minimap
   */
  private renderOverworldMinimap(data: HudData): void {
    const { minimap } = HUD_LAYOUT;

    // Calculate pixel size for each screen dot
    // Overworld is 16x8 screens, minimap is 64x32 pixels
    // So each screen is 4x4 pixels
    const dotWidth = minimap.width / OVERWORLD_COLS;
    const dotHeight = minimap.height / OVERWORLD_ROWS;

    // Draw visited screens (dimmed)
    if (data.visitedScreens) {
      this.ctx.fillStyle = PLACEHOLDER_COLORS.HUD_MINIMAP_VISITED;
      for (const screenKey of data.visitedScreens) {
        const [colStr, rowStr] = screenKey.split(',');
        const col = parseInt(colStr ?? '0', 10);
        const row = parseInt(rowStr ?? '0', 10);
        const x = minimap.x + col * dotWidth;
        const y = minimap.y + row * dotHeight;
        this.ctx.fillRect(x, y, dotWidth - 1, dotHeight - 1);
      }
    }

    // Draw current screen (blinking green dot)
    const shouldBlink = data.frameCounter !== undefined && Math.floor(data.frameCounter / 16) % 2 === 0;
    if (shouldBlink) {
      this.ctx.fillStyle = PLACEHOLDER_COLORS.HUD_MINIMAP_CURRENT;
      const currentX = minimap.x + data.currentScreen.col * dotWidth;
      const currentY = minimap.y + data.currentScreen.row * dotHeight;
      this.ctx.fillRect(currentX, currentY, dotWidth - 1, dotHeight - 1);
    }
  }

  /**
   * Renders the dungeon minimap
   */
  private renderDungeonMinimap(data: HudData): void {
    const { minimap } = HUD_LAYOUT;
    const dungeonMap = data.dungeonMap;
    if (!dungeonMap) return;

    // Dungeon is 8x8 rooms, minimap is 64x32 pixels
    // So each room is 8x4 pixels
    const dotWidth = 8;
    const dotHeight = 4;

    // Draw rooms
    for (const room of dungeonMap.rooms) {
      // Only show room if has map item OR room was visited
      if (dungeonMap.hasMap || room.visited) {
        const x = minimap.x + room.col * dotWidth;
        const y = minimap.y + room.row * dotHeight;

        // Color: gray for unvisited (with map), white for visited
        this.ctx.fillStyle = room.visited ? '#FFFFFF' : '#666666';
        this.ctx.fillRect(x, y, dotWidth - 1, dotHeight - 1);
      }
    }

    // Draw Triforce room blinking red if has compass
    if (dungeonMap.hasCompass && dungeonMap.triforceRoom) {
      const shouldBlink = data.frameCounter !== undefined && Math.floor(data.frameCounter / 16) % 2 === 0;
      if (shouldBlink) {
        const x = minimap.x + dungeonMap.triforceRoom.col * dotWidth;
        const y = minimap.y + dungeonMap.triforceRoom.row * dotHeight;
        this.ctx.fillStyle = '#FF0000';
        this.ctx.fillRect(x, y, dotWidth - 1, dotHeight - 1);
      }
    }

    // Draw current room (blinking green)
    const shouldBlink = data.frameCounter !== undefined && Math.floor(data.frameCounter / 16) % 2 === 0;
    if (shouldBlink) {
      this.ctx.fillStyle = PLACEHOLDER_COLORS.HUD_MINIMAP_CURRENT;
      const currentX = minimap.x + data.currentScreen.col * dotWidth;
      const currentY = minimap.y + data.currentScreen.row * dotHeight;
      this.ctx.fillRect(currentX, currentY, dotWidth - 1, dotHeight - 1);
    }
  }

  /**
   * Renders the B-item and A-item (sword) slots
   */
  private renderItemSlots(data: HudData): void {
    const { bButtonItem, aButtonItem } = HUD_LAYOUT;

    // Draw B slot frame
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.strokeRect(bButtonItem.x - 1, bButtonItem.y - 1, bButtonItem.width + 2, bButtonItem.height + 2);

    // Draw B button label
    this.drawText('B', bButtonItem.x + 4, bButtonItem.y + bButtonItem.height + 8);

    // Draw currently selected B-item if any
    if (data.selectedBItem) {
      const bItemSprite = this.getBItemSprite(data.selectedBItem);
      if (bItemSprite) {
        const sprite = this.assets.sprites.get(bItemSprite);
        if (sprite) {
          this.ctx.drawImage(sprite, bButtonItem.x, bButtonItem.y);
        }
      }
    }

    // Draw A slot frame
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.strokeRect(aButtonItem.x - 1, aButtonItem.y - 1, aButtonItem.width + 2, aButtonItem.height + 2);

    // Draw A button label
    this.drawText('A', aButtonItem.x + 4, aButtonItem.y + aButtonItem.height + 8);

    // Draw sword indicator if player has sword
    if (data.swordLevel > 0) {
      // Use sword sprite based on level
      const swordSprite = this.assets.sprites.get('sword_down');
      if (swordSprite) {
        // Center the sword in the slot
        const offsetX = (aButtonItem.width - swordSprite.width) / 2;
        const offsetY = (aButtonItem.height - swordSprite.height) / 2;
        this.ctx.drawImage(swordSprite, aButtonItem.x + offsetX, aButtonItem.y + offsetY);
      }
    }
  }

  /**
   * Gets the sprite key for a B-item
   */
  private getBItemSprite(item: BItemSlot): SpriteKey | null {
    switch (item) {
      case 'BOOMERANG':
        return 'projectile_boomerang';
      case 'BOMB':
        return 'item_bomb';
      case 'BOW_ARROW':
        return null; // Would need arrow sprite
      case 'CANDLE':
        return null; // Would need candle sprite
      case 'RECORDER':
        return null; // Would need recorder sprite
      case 'FOOD':
        return null; // Would need food sprite
      case 'POTION':
        return null; // Would need potion sprite
      case 'MAGIC_ROD':
        return null; // Would need magic rod sprite
      default:
        return null;
    }
  }

  /**
   * Renders the heart display
   */
  renderHearts(currentHP: number, maxHP: number): void {
    const { hearts } = HUD_LAYOUT;
    const heartStates = this.calculateHeartStates(currentHP, maxHP);

    for (let i = 0; i < heartStates.length; i++) {
      const state = heartStates[i];
      if (state === undefined) continue;

      const row = Math.floor(i / hearts.heartsPerRow);
      const col = i % hearts.heartsPerRow;

      const x = hearts.x + col * hearts.heartWidth;
      const y = hearts.y + row * hearts.heartHeight;

      // Get appropriate heart sprite
      let spriteKey: SpriteKey;
      switch (state) {
        case 'FULL':
          spriteKey = 'hud_heart_full';
          break;
        case 'HALF':
          spriteKey = 'hud_heart_half';
          break;
        case 'EMPTY':
          spriteKey = 'hud_heart_empty';
          break;
      }

      const heartSprite = this.assets.sprites.get(spriteKey);
      if (heartSprite) {
        this.ctx.drawImage(heartSprite, x, y);
      } else {
        // Fallback: draw colored rectangle
        this.ctx.fillStyle =
          state === 'FULL'
            ? PLACEHOLDER_COLORS.HUD_HEART_FULL
            : state === 'HALF'
              ? PLACEHOLDER_COLORS.HUD_HEART_HALF
              : PLACEHOLDER_COLORS.HUD_HEART_EMPTY;
        this.ctx.fillRect(x, y, hearts.heartWidth, hearts.heartHeight);
      }
    }
  }

  /**
   * Calculates heart states from current and max HP
   */
  calculateHeartStates(currentHP: number, maxHP: number): HeartState[] {
    const containerCount = Math.min(Math.floor(maxHP / 2), MAX_HEARTS);
    const hearts: HeartState[] = [];

    for (let i = 0; i < containerCount; i++) {
      const hpForThisHeart = currentHP - i * 2;
      if (hpForThisHeart >= 2) {
        hearts.push('FULL');
      } else if (hpForThisHeart === 1) {
        hearts.push('HALF');
      } else {
        hearts.push('EMPTY');
      }
    }

    return hearts;
  }

  /**
   * Renders the rupee, key, and bomb counters
   */
  renderCounters(rupees: number, keys: number, bombs: number): void {
    const { rupees: rupeePos, keys: keyPos, bombs: bombPos } = HUD_LAYOUT;

    // Rupee counter
    const rupeeIcon = this.assets.sprites.get('hud_rupee_icon');
    if (rupeeIcon) {
      this.ctx.drawImage(rupeeIcon, rupeePos.x - 12, rupeePos.y);
    }
    this.drawText(`X${String(rupees).padStart(3, ' ')}`, rupeePos.x, rupeePos.y + 8);

    // Key counter
    const keyIcon = this.assets.sprites.get('hud_key_icon');
    if (keyIcon) {
      this.ctx.drawImage(keyIcon, keyPos.x - 12, keyPos.y);
    }
    this.drawText(`X${String(keys).padStart(2, ' ')}`, keyPos.x, keyPos.y + 8);

    // Bomb counter
    const bombIcon = this.assets.sprites.get('hud_bomb_icon');
    if (bombIcon) {
      this.ctx.drawImage(bombIcon, bombPos.x - 12, bombPos.y);
    }
    this.drawText(`X${String(bombs).padStart(2, ' ')}`, bombPos.x, bombPos.y + 8);
  }

  /**
   * Draws text using the canvas context
   * Uses a simple 8x8 monospace font approximation
   */
  private drawText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = PLACEHOLDER_COLORS.HUD_TEXT;
    this.ctx.font = '8px monospace';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(text, x, y);
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Creates HudData from an Inventory and player state
 */
export function createHudData(
  inventory: Inventory,
  currentHP: number,
  heartContainers: number,
  currentScreen: { col: number; row: number },
  options?: {
    visitedScreens?: Set<string>;
    frameCounter?: number;
    isDungeon?: boolean;
    dungeonMap?: HudData['dungeonMap'];
  }
): HudData {
  return {
    currentHP,
    maxHP: heartContainers * 2,
    rupees: inventory.rupees,
    keys: inventory.keys,
    bombs: inventory.bombCount,
    selectedBItem: inventory.selectedBItem,
    swordLevel: inventory.swordLevel,
    currentScreen,
    visitedScreens: options?.visitedScreens,
    frameCounter: options?.frameCounter,
    isDungeon: options?.isDungeon,
    dungeonMap: options?.dungeonMap,
  };
}

// ===== SINGLETON INSTANCE =====

let hudRendererInstance: HudRenderer | null = null;

/**
 * Gets or creates the singleton HUD renderer instance
 */
export function getHudRenderer(
  ctx: CanvasRenderingContext2D,
  assets: GeneratedAssets
): HudRenderer {
  if (!hudRendererInstance) {
    hudRendererInstance = new HudRenderer(ctx, assets);
  }
  return hudRendererInstance;
}

/**
 * Resets the singleton instance (for testing)
 */
export function resetHudRenderer(): void {
  hudRendererInstance = null;
}
