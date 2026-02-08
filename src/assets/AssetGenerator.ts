// AssetGenerator.ts - Procedural placeholder asset generation
// Generates colored rectangle placeholders for game development

import {
  TILE_SIZE,
  PLAYER_SPRITE_WIDTH,
  PLAYER_SPRITE_HEIGHT,
} from '../constants';

// ===== COLORS =====

/** Color palette for placeholder assets */
export const PLACEHOLDER_COLORS = {
  // Link colors
  LINK_BODY: '#228B22', // Forest green
  LINK_SKIN: '#F5DEB3', // Wheat/tan
  LINK_OUTLINE: '#006400', // Dark green

  // Enemy colors
  ENEMY_RED: '#CD5C5C', // Indian red
  ENEMY_RED_DARK: '#8B0000', // Dark red
  ENEMY_BLUE: '#4169E1', // Royal blue
  ENEMY_BLUE_DARK: '#191970', // Midnight blue
  ENEMY_OUTLINE: '#2F2F2F', // Dark gray

  // Tile colors
  TILE_GRASS: '#228B22', // Forest green
  TILE_GRASS_LIGHT: '#32CD32', // Lime green
  TILE_GROUND: '#D2691E', // Chocolate brown
  TILE_GROUND_DARK: '#8B4513', // Saddle brown
  TILE_WATER: '#1E90FF', // Dodger blue
  TILE_WATER_DARK: '#0000CD', // Medium blue
  TILE_ROCK: '#696969', // Dim gray
  TILE_ROCK_DARK: '#2F4F4F', // Dark slate gray
  TILE_WALL: '#555555', // Medium gray
  TILE_BUSH: '#006400', // Dark green
  TILE_TREE: '#2F4F2F', // Dark olive green
  TILE_STAIRS: '#444444', // Dark gray
  TILE_PIT: '#000000', // Black

  // Dungeon tiles
  DUNGEON_FLOOR: '#444488', // Dark blue-gray
  DUNGEON_WALL: '#333366', // Dark slate blue
  DUNGEON_BLOCK: '#555599', // Medium slate blue

  // HUD colors
  HUD_BG: '#000000', // Black
  HUD_HEART_FULL: '#FF0000', // Red
  HUD_HEART_HALF: '#FF6666', // Light red
  HUD_HEART_EMPTY: '#555555', // Gray
  HUD_RUPEE: '#00FF00', // Lime green
  HUD_KEY: '#FFD700', // Gold
  HUD_BOMB: '#4169E1', // Blue
  HUD_TEXT: '#FFFFFF', // White
  HUD_MINIMAP_BG: '#333333', // Dark gray
  HUD_MINIMAP_CURRENT: '#00FF00', // Green
  HUD_MINIMAP_VISITED: '#AAAAAA', // Light gray

  // Item colors
  ITEM_HEART: '#FF0000', // Red
  ITEM_RUPEE: '#00FF00', // Lime green
  ITEM_RUPEE_BLUE: '#0000FF', // Blue
  ITEM_BOMB: '#4169E1', // Royal blue
  ITEM_KEY: '#FFD700', // Gold
  ITEM_SWORD: '#C0C0C0', // Silver
  ITEM_BOOMERANG: '#8B4513', // Saddle brown
  ITEM_TRIFORCE: '#FFD700', // Gold

  // Effect colors
  EFFECT_FLASH: '#FFFFFF', // White
  EFFECT_DAMAGE: '#FF0000', // Red
} as const;

// ===== SPRITE KEYS =====

/** Keys for accessing generated sprites */
export type SpriteKey =
  // Link sprites
  | 'link_down_1'
  | 'link_down_2'
  | 'link_up_1'
  | 'link_up_2'
  | 'link_left_1'
  | 'link_left_2'
  | 'link_right_1'
  | 'link_right_2'
  | 'link_attack_down'
  | 'link_attack_up'
  | 'link_attack_left'
  | 'link_attack_right'
  // Sword sprites
  | 'sword_down'
  | 'sword_up'
  | 'sword_left'
  | 'sword_right'
  | 'sword_beam'
  // Enemy sprites
  | 'enemy_octorok_red_1'
  | 'enemy_octorok_red_2'
  | 'enemy_octorok_blue_1'
  | 'enemy_octorok_blue_2'
  | 'enemy_tektite_1'
  | 'enemy_tektite_2'
  | 'enemy_moblin_red_1'
  | 'enemy_moblin_red_2'
  | 'enemy_moblin_blue_1'
  | 'enemy_moblin_blue_2'
  | 'enemy_keese_1'
  | 'enemy_keese_2'
  | 'enemy_aquamentus_1'
  | 'enemy_aquamentus_2'
  | 'enemy_death_puff_1'
  | 'enemy_death_puff_2'
  | 'enemy_death_puff_3'
  // Projectile sprites
  | 'projectile_rock'
  | 'projectile_fireball'
  | 'projectile_boomerang'
  // Item sprites
  | 'item_heart'
  | 'item_rupee_green'
  | 'item_rupee_blue'
  | 'item_bomb'
  | 'item_key'
  | 'item_fairy'
  | 'item_triforce'
  | 'item_heart_container'
  // HUD sprites
  | 'hud_heart_full'
  | 'hud_heart_half'
  | 'hud_heart_empty'
  | 'hud_rupee_icon'
  | 'hud_key_icon'
  | 'hud_bomb_icon'
  | 'hud_minimap_bg'
  | 'hud_minimap_room'
  | 'hud_minimap_current'
  // NPC sprites
  | 'npc_old_man'
  | 'npc_merchant'
  | 'npc_old_woman';

// ===== TILE KEYS =====

/** Keys for accessing generated tiles */
export type TileKey =
  | 'tile_grass'
  | 'tile_ground'
  | 'tile_water'
  | 'tile_rock'
  | 'tile_tree'
  | 'tile_bush'
  | 'tile_stairs'
  | 'tile_pit'
  | 'tile_wall'
  | 'tile_dungeon_floor'
  | 'tile_dungeon_wall'
  | 'tile_dungeon_block'
  | 'tile_door_open'
  | 'tile_door_locked'
  | 'tile_door_shutter'
  | 'tile_cave_floor'
  | 'tile_cave_wall'
  | 'tile_cave_pillar'
  | 'tile_cave_fire';

// ===== ASSET STORAGE =====

export interface GeneratedAssets {
  sprites: Map<SpriteKey, HTMLCanvasElement>;
  tiles: Map<TileKey, HTMLCanvasElement>;
  ready: boolean;
}

// ===== DRAWING UTILITIES =====

/**
 * Creates a canvas with the specified dimensions and returns both canvas and context
 */
function createCanvasWithContext(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }
  return { canvas, ctx };
}

/**
 * Draws a filled rectangle with an outline
 */
function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  outlineColor?: string
): void {
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, width, height);
  if (outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }
}

/**
 * Draws a simple character placeholder (humanoid shape)
 */
function drawCharacterPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bodyColor: string,
  outlineColor: string,
  direction: 'down' | 'up' | 'left' | 'right' = 'down',
  frame: 1 | 2 = 1
): void {
  ctx.clearRect(0, 0, width, height);

  // Body (main rectangle)
  drawRect(ctx, 2, 4, width - 4, height - 6, bodyColor, outlineColor);

  // Head indicator at top (slightly smaller)
  const headOffset = direction === 'up' ? 0 : 2;
  drawRect(
    ctx,
    4,
    headOffset,
    width - 8,
    4,
    PLACEHOLDER_COLORS.LINK_SKIN,
    outlineColor
  );

  // Direction indicator
  ctx.fillStyle = outlineColor;
  switch (direction) {
    case 'down':
      // Eyes at bottom of head area
      ctx.fillRect(5, 4, 2, 2);
      ctx.fillRect(width - 7, 4, 2, 2);
      break;
    case 'up':
      // Back of head (no eyes)
      break;
    case 'left':
      // Eye on left side
      ctx.fillRect(3, 3, 2, 2);
      break;
    case 'right':
      // Eye on right side
      ctx.fillRect(width - 5, 3, 2, 2);
      break;
  }

  // Leg animation (frame 1 vs 2)
  if (frame === 2) {
    // Legs spread
    drawRect(ctx, 3, height - 4, 4, 4, bodyColor, outlineColor);
    drawRect(ctx, width - 7, height - 4, 4, 4, bodyColor, outlineColor);
  } else {
    // Legs together
    drawRect(ctx, 4, height - 4, width - 8, 4, bodyColor, outlineColor);
  }
}

/**
 * Draws a simple enemy placeholder
 */
function drawEnemyPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  baseColor: string,
  darkColor: string,
  enemyType: 'octorok' | 'tektite' | 'moblin' | 'keese' | 'aquamentus',
  frame: 1 | 2 = 1
): void {
  ctx.clearRect(0, 0, width, height);

  switch (enemyType) {
    case 'octorok':
      // Octopus-like: round body with tentacles
      drawRect(ctx, 2, 2, width - 4, height - 6, baseColor, darkColor);
      // Tentacles
      if (frame === 1) {
        drawRect(ctx, 1, height - 4, 4, 4, baseColor, darkColor);
        drawRect(ctx, width - 5, height - 4, 4, 4, baseColor, darkColor);
      } else {
        drawRect(ctx, 3, height - 4, 4, 4, baseColor, darkColor);
        drawRect(ctx, width - 7, height - 4, 4, 4, baseColor, darkColor);
      }
      // Eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(4, 4, 3, 3);
      ctx.fillRect(width - 7, 4, 3, 3);
      ctx.fillStyle = '#000000';
      ctx.fillRect(5, 5, 2, 2);
      ctx.fillRect(width - 6, 5, 2, 2);
      break;

    case 'tektite': {
      // Spider-like: small body with long legs
      drawRect(ctx, 4, 4, width - 8, height - 8, baseColor, darkColor);
      // Legs
      const legY = frame === 1 ? height - 4 : height - 6;
      ctx.fillStyle = darkColor;
      ctx.fillRect(0, legY, 3, 2);
      ctx.fillRect(width - 3, legY, 3, 2);
      ctx.fillRect(1, 2, 2, 3);
      ctx.fillRect(width - 3, 2, 2, 3);
      // Eye
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(7, 6, 2, 2);
      break;
    }

    case 'moblin':
      // Larger humanoid enemy
      drawRect(ctx, 2, 2, width - 4, height - 4, baseColor, darkColor);
      // Snout
      drawRect(ctx, 5, 4, 6, 4, darkColor);
      // Eyes
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(4, 3, 2, 2);
      ctx.fillRect(width - 6, 3, 2, 2);
      // Legs
      if (frame === 2) {
        drawRect(ctx, 2, height - 3, 5, 3, baseColor, darkColor);
        drawRect(ctx, width - 7, height - 3, 5, 3, baseColor, darkColor);
      }
      break;

    case 'keese': {
      // Bat-like: small body with wings
      drawRect(ctx, 5, 5, 6, 6, baseColor, darkColor);
      // Wings
      const wingSpread = frame === 1 ? 2 : 5;
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 6, 5, wingSpread);
      ctx.fillRect(width - 5, 6, 5, wingSpread);
      // Eyes
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(6, 7, 1, 1);
      ctx.fillRect(9, 7, 1, 1);
      break;
    }

    case 'aquamentus':
      // Boss: large dragon head
      drawRect(ctx, 0, 4, width, height - 8, baseColor, darkColor);
      // Horn
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.moveTo(width - 4, 0);
      ctx.lineTo(width, 4);
      ctx.lineTo(width - 8, 4);
      ctx.fill();
      // Eye
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(4, 8, 6, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(6, 10, 3, 3);
      // Mouth
      if (frame === 2) {
        drawRect(ctx, width - 4, height / 2 - 2, 4, 4, '#000000');
      }
      break;
  }
}

/**
 * Draws a heart shape
 */
function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  fill: 'full' | 'half' | 'empty'
): void {
  const halfSize = size / 2;

  ctx.fillStyle = fill === 'empty' ? PLACEHOLDER_COLORS.HUD_HEART_EMPTY : color;

  // Simple pixelated heart shape
  // Top bumps
  ctx.fillRect(x + 1, y, 2, 2);
  ctx.fillRect(x + halfSize + 1, y, 2, 2);
  // Middle
  ctx.fillRect(x, y + 2, size, 2);
  // Bottom tapering
  ctx.fillRect(x + 1, y + 4, size - 2, 2);
  ctx.fillRect(x + 2, y + 6, size - 4, 2);

  // For half heart, gray out right side
  if (fill === 'half') {
    ctx.fillStyle = PLACEHOLDER_COLORS.HUD_HEART_EMPTY;
    ctx.fillRect(x + halfSize, y, halfSize, size);
  }
}

/**
 * Draws a simple tile with pattern
 */
function drawTilePlaceholder(
  ctx: CanvasRenderingContext2D,
  size: number,
  baseColor: string,
  accentColor: string,
  pattern: 'solid' | 'checkered' | 'dotted' | 'brick' | 'water'
): void {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = accentColor;

  switch (pattern) {
    case 'checkered':
      for (let y = 0; y < size; y += 4) {
        for (let x = 0; x < size; x += 4) {
          if ((x + y) % 8 === 0) {
            ctx.fillRect(x, y, 4, 4);
          }
        }
      }
      break;

    case 'dotted':
      for (let y = 2; y < size; y += 6) {
        for (let x = 2; x < size; x += 6) {
          ctx.fillRect(x, y, 2, 2);
        }
      }
      break;

    case 'brick':
      // Horizontal lines
      ctx.fillRect(0, 4, size, 1);
      ctx.fillRect(0, 10, size, 1);
      // Vertical lines (offset)
      ctx.fillRect(8, 0, 1, 4);
      ctx.fillRect(0, 5, 1, 5);
      ctx.fillRect(8, 11, 1, 5);
      break;

    case 'water':
      // Wavy lines
      for (let y = 2; y < size; y += 4) {
        for (let x = 0; x < size; x += 8) {
          ctx.fillRect(x + (y % 8 === 2 ? 0 : 4), y, 4, 2);
        }
      }
      break;

    case 'solid':
    default:
      // Just the base color, add slight border
      ctx.fillRect(0, 0, size, 1);
      ctx.fillRect(0, 0, 1, size);
      break;
  }
}

/**
 * Draws an item pickup sprite
 */
function drawItemPlaceholder(
  ctx: CanvasRenderingContext2D,
  size: number,
  itemType:
    | 'heart'
    | 'rupee'
    | 'bomb'
    | 'key'
    | 'fairy'
    | 'triforce'
    | 'heart_container',
  color: string
): void {
  ctx.clearRect(0, 0, size, size);

  const half = size / 2;

  switch (itemType) {
    case 'heart':
      drawHeart(ctx, 2, 2, size - 4, color, 'full');
      break;

    case 'rupee':
      // Diamond shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(half, 1);
      ctx.lineTo(size - 2, half);
      ctx.lineTo(half, size - 1);
      ctx.lineTo(2, half);
      ctx.closePath();
      ctx.fill();
      // Shine
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(half - 1, 3, 2, 2);
      break;

    case 'bomb':
      // Round body
      ctx.fillStyle = color;
      ctx.fillRect(2, 4, size - 4, size - 6);
      ctx.fillRect(4, 2, size - 8, size - 4);
      // Fuse
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(half - 1, 0, 2, 4);
      // Spark
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(half - 1, 0, 2, 2);
      break;

    case 'key':
      // Handle
      ctx.fillStyle = color;
      ctx.fillRect(2, 2, 6, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(4, 4, 2, 2);
      // Stem
      ctx.fillStyle = color;
      ctx.fillRect(6, 6, 8, 3);
      // Teeth
      ctx.fillRect(12, 9, 2, 3);
      ctx.fillRect(10, 9, 2, 2);
      break;

    case 'fairy':
      // Body
      ctx.fillStyle = '#FFB6C1'; // Light pink
      ctx.fillRect(half - 2, 2, 4, 8);
      // Wings
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(2, 4, 4, 4);
      ctx.fillRect(size - 6, 4, 4, 4);
      // Sparkle
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(half - 1, 0, 2, 2);
      break;

    case 'triforce':
      // Triangle shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(half, 2);
      ctx.lineTo(size - 2, size - 2);
      ctx.lineTo(2, size - 2);
      ctx.closePath();
      ctx.fill();
      // Inner glow
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(half - 2, 6, 4, 4);
      break;

    case 'heart_container':
      // Larger heart
      drawHeart(ctx, 1, 1, size - 2, color, 'full');
      // Border
      ctx.strokeStyle = '#FF6600';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
      break;
  }
}

// ===== ASSET GENERATOR CLASS =====

export class AssetGenerator {
  private assets: GeneratedAssets;

  constructor() {
    this.assets = {
      sprites: new Map(),
      tiles: new Map(),
      ready: false,
    };
  }

  /**
   * Generates all placeholder assets
   */
  generate(): GeneratedAssets {
    this.generateLinkSprites();
    this.generateSwordSprites();
    this.generateEnemySprites();
    this.generateProjectileSprites();
    this.generateItemSprites();
    this.generateHudSprites();
    this.generateTiles();

    this.assets.ready = true;
    return this.assets;
  }

  /**
   * Gets a sprite by key
   */
  getSprite(key: SpriteKey): HTMLCanvasElement | undefined {
    return this.assets.sprites.get(key);
  }

  /**
   * Gets a tile by key
   */
  getTile(key: TileKey): HTMLCanvasElement | undefined {
    return this.assets.tiles.get(key);
  }

  /**
   * Check if assets are ready
   */
  isReady(): boolean {
    return this.assets.ready;
  }

  /**
   * Get all generated assets
   */
  getAssets(): GeneratedAssets {
    return this.assets;
  }

  private generateLinkSprites(): void {
    const directions: ('down' | 'up' | 'left' | 'right')[] = [
      'down',
      'up',
      'left',
      'right',
    ];
    const frames: (1 | 2)[] = [1, 2];

    for (const dir of directions) {
      for (const frame of frames) {
        const { canvas, ctx } = createCanvasWithContext(
          PLAYER_SPRITE_WIDTH,
          PLAYER_SPRITE_HEIGHT
        );
        drawCharacterPlaceholder(
          ctx,
          PLAYER_SPRITE_WIDTH,
          PLAYER_SPRITE_HEIGHT,
          PLACEHOLDER_COLORS.LINK_BODY,
          PLACEHOLDER_COLORS.LINK_OUTLINE,
          dir,
          frame
        );
        const key = `link_${dir}_${frame}` as SpriteKey;
        this.assets.sprites.set(key, canvas);
      }

      // Attack sprites (same as walk frame 1 but with sword indicator)
      const { canvas: attackCanvas, ctx: attackCtx } = createCanvasWithContext(
        PLAYER_SPRITE_WIDTH,
        PLAYER_SPRITE_HEIGHT
      );
      drawCharacterPlaceholder(
        attackCtx,
        PLAYER_SPRITE_WIDTH,
        PLAYER_SPRITE_HEIGHT,
        PLACEHOLDER_COLORS.LINK_BODY,
        PLACEHOLDER_COLORS.LINK_OUTLINE,
        dir,
        1
      );
      const attackKey = `link_attack_${dir}` as SpriteKey;
      this.assets.sprites.set(attackKey, attackCanvas);
    }
  }

  private generateSwordSprites(): void {
    const swordColor = PLACEHOLDER_COLORS.ITEM_SWORD;

    // Vertical sword (up/down)
    for (const dir of ['up', 'down'] as const) {
      const { canvas, ctx } = createCanvasWithContext(8, 16);
      ctx.fillStyle = swordColor;
      ctx.fillRect(2, 0, 4, 16);
      // Handle
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(1, dir === 'down' ? 0 : 12, 6, 4);
      const key = `sword_${dir}` as SpriteKey;
      this.assets.sprites.set(key, canvas);
    }

    // Horizontal sword (left/right)
    for (const dir of ['left', 'right'] as const) {
      const { canvas, ctx } = createCanvasWithContext(16, 8);
      ctx.fillStyle = swordColor;
      ctx.fillRect(0, 2, 16, 4);
      // Handle
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(dir === 'right' ? 0 : 12, 1, 4, 6);
      const key = `sword_${dir}` as SpriteKey;
      this.assets.sprites.set(key, canvas);
    }

    // Sword beam
    const { canvas: beamCanvas, ctx: beamCtx } = createCanvasWithContext(8, 8);
    beamCtx.fillStyle = swordColor;
    beamCtx.fillRect(1, 1, 6, 6);
    beamCtx.fillStyle = '#FFFFFF';
    beamCtx.fillRect(2, 2, 4, 4);
    this.assets.sprites.set('sword_beam', beamCanvas);
  }

  private generateEnemySprites(): void {
    // Octorok (red and blue variants)
    for (const variant of ['red', 'blue'] as const) {
      const baseColor =
        variant === 'red'
          ? PLACEHOLDER_COLORS.ENEMY_RED
          : PLACEHOLDER_COLORS.ENEMY_BLUE;
      const darkColor =
        variant === 'red'
          ? PLACEHOLDER_COLORS.ENEMY_RED_DARK
          : PLACEHOLDER_COLORS.ENEMY_BLUE_DARK;

      for (const frame of [1, 2] as const) {
        const { canvas, ctx } = createCanvasWithContext(16, 16);
        drawEnemyPlaceholder(ctx, 16, 16, baseColor, darkColor, 'octorok', frame);
        const key = `enemy_octorok_${variant}_${frame}` as SpriteKey;
        this.assets.sprites.set(key, canvas);
      }
    }

    // Tektite
    for (const frame of [1, 2] as const) {
      const { canvas, ctx } = createCanvasWithContext(16, 16);
      drawEnemyPlaceholder(
        ctx,
        16,
        16,
        PLACEHOLDER_COLORS.ENEMY_RED,
        PLACEHOLDER_COLORS.ENEMY_RED_DARK,
        'tektite',
        frame
      );
      const key = `enemy_tektite_${frame}` as SpriteKey;
      this.assets.sprites.set(key, canvas);
    }

    // Moblin (red and blue)
    for (const variant of ['red', 'blue'] as const) {
      const baseColor =
        variant === 'red'
          ? PLACEHOLDER_COLORS.ENEMY_RED
          : PLACEHOLDER_COLORS.ENEMY_BLUE;
      const darkColor =
        variant === 'red'
          ? PLACEHOLDER_COLORS.ENEMY_RED_DARK
          : PLACEHOLDER_COLORS.ENEMY_BLUE_DARK;

      for (const frame of [1, 2] as const) {
        const { canvas, ctx } = createCanvasWithContext(16, 16);
        drawEnemyPlaceholder(ctx, 16, 16, baseColor, darkColor, 'moblin', frame);
        const key = `enemy_moblin_${variant}_${frame}` as SpriteKey;
        this.assets.sprites.set(key, canvas);
      }
    }

    // Keese (bat)
    for (const frame of [1, 2] as const) {
      const { canvas, ctx } = createCanvasWithContext(16, 16);
      drawEnemyPlaceholder(
        ctx,
        16,
        16,
        '#333333',
        '#000000',
        'keese',
        frame
      );
      const key = `enemy_keese_${frame}` as SpriteKey;
      this.assets.sprites.set(key, canvas);
    }

    // Aquamentus (boss - larger sprite)
    for (const frame of [1, 2] as const) {
      const { canvas, ctx } = createCanvasWithContext(32, 32);
      drawEnemyPlaceholder(
        ctx,
        32,
        32,
        PLACEHOLDER_COLORS.TILE_GRASS,
        PLACEHOLDER_COLORS.TILE_BUSH,
        'aquamentus',
        frame
      );
      const key = `enemy_aquamentus_${frame}` as SpriteKey;
      this.assets.sprites.set(key, canvas);
    }

    // Death puff animation
    for (let frame = 1; frame <= 3; frame++) {
      const { canvas, ctx } = createCanvasWithContext(16, 16);
      const size = 16 - frame * 4;
      const offset = (16 - size) / 2;
      ctx.fillStyle = '#FF6600';
      ctx.fillRect(offset, offset, size, size);
      ctx.fillStyle = '#FFFF00';
      ctx.fillRect(offset + 2, offset + 2, size - 4, size - 4);
      const key = `enemy_death_puff_${frame}` as SpriteKey;
      this.assets.sprites.set(key, canvas);
    }
  }

  private generateProjectileSprites(): void {
    // Rock projectile
    const { canvas: rockCanvas, ctx: rockCtx } = createCanvasWithContext(8, 8);
    rockCtx.fillStyle = PLACEHOLDER_COLORS.TILE_ROCK;
    rockCtx.fillRect(1, 1, 6, 6);
    rockCtx.fillStyle = PLACEHOLDER_COLORS.TILE_ROCK_DARK;
    rockCtx.fillRect(2, 2, 4, 4);
    this.assets.sprites.set('projectile_rock', rockCanvas);

    // Fireball projectile
    const { canvas: fireCanvas, ctx: fireCtx } = createCanvasWithContext(8, 8);
    fireCtx.fillStyle = '#FF6600';
    fireCtx.fillRect(1, 1, 6, 6);
    fireCtx.fillStyle = '#FFFF00';
    fireCtx.fillRect(2, 2, 4, 4);
    this.assets.sprites.set('projectile_fireball', fireCanvas);

    // Boomerang
    const { canvas: boomCanvas, ctx: boomCtx } = createCanvasWithContext(8, 8);
    boomCtx.fillStyle = PLACEHOLDER_COLORS.ITEM_BOOMERANG;
    boomCtx.fillRect(1, 0, 2, 4);
    boomCtx.fillRect(3, 4, 4, 2);
    boomCtx.fillRect(5, 2, 2, 2);
    this.assets.sprites.set('projectile_boomerang', boomCanvas);
  }

  private generateItemSprites(): void {
    // Heart drop
    const { canvas: heartCanvas, ctx: heartCtx } = createCanvasWithContext(16, 16);
    drawItemPlaceholder(heartCtx, 16, 'heart', PLACEHOLDER_COLORS.ITEM_HEART);
    this.assets.sprites.set('item_heart', heartCanvas);

    // Green rupee
    const { canvas: rupeeGCanvas, ctx: rupeeGCtx } = createCanvasWithContext(16, 16);
    drawItemPlaceholder(rupeeGCtx, 16, 'rupee', PLACEHOLDER_COLORS.ITEM_RUPEE);
    this.assets.sprites.set('item_rupee_green', rupeeGCanvas);

    // Blue rupee
    const { canvas: rupeeBCanvas, ctx: rupeeBCtx } = createCanvasWithContext(16, 16);
    drawItemPlaceholder(rupeeBCtx, 16, 'rupee', PLACEHOLDER_COLORS.ITEM_RUPEE_BLUE);
    this.assets.sprites.set('item_rupee_blue', rupeeBCanvas);

    // Bomb
    const { canvas: bombCanvas, ctx: bombCtx } = createCanvasWithContext(16, 16);
    drawItemPlaceholder(bombCtx, 16, 'bomb', PLACEHOLDER_COLORS.ITEM_BOMB);
    this.assets.sprites.set('item_bomb', bombCanvas);

    // Key
    const { canvas: keyCanvas, ctx: keyCtx } = createCanvasWithContext(16, 16);
    drawItemPlaceholder(keyCtx, 16, 'key', PLACEHOLDER_COLORS.ITEM_KEY);
    this.assets.sprites.set('item_key', keyCanvas);

    // Fairy
    const { canvas: fairyCanvas, ctx: fairyCtx } = createCanvasWithContext(16, 16);
    drawItemPlaceholder(fairyCtx, 16, 'fairy', '#FFB6C1');
    this.assets.sprites.set('item_fairy', fairyCanvas);

    // Triforce piece
    const { canvas: triCanvas, ctx: triCtx } = createCanvasWithContext(16, 16);
    drawItemPlaceholder(triCtx, 16, 'triforce', PLACEHOLDER_COLORS.ITEM_TRIFORCE);
    this.assets.sprites.set('item_triforce', triCanvas);

    // Heart container
    const { canvas: hcCanvas, ctx: hcCtx } = createCanvasWithContext(16, 16);
    drawItemPlaceholder(hcCtx, 16, 'heart_container', PLACEHOLDER_COLORS.ITEM_HEART);
    this.assets.sprites.set('item_heart_container', hcCanvas);
  }

  private generateHudSprites(): void {
    // HUD heart (full)
    const { canvas: heartFullCanvas, ctx: heartFullCtx } = createCanvasWithContext(8, 8);
    drawHeart(heartFullCtx, 0, 0, 8, PLACEHOLDER_COLORS.HUD_HEART_FULL, 'full');
    this.assets.sprites.set('hud_heart_full', heartFullCanvas);

    // HUD heart (half)
    const { canvas: heartHalfCanvas, ctx: heartHalfCtx } = createCanvasWithContext(8, 8);
    drawHeart(heartHalfCtx, 0, 0, 8, PLACEHOLDER_COLORS.HUD_HEART_FULL, 'half');
    this.assets.sprites.set('hud_heart_half', heartHalfCanvas);

    // HUD heart (empty)
    const { canvas: heartEmptyCanvas, ctx: heartEmptyCtx } = createCanvasWithContext(8, 8);
    drawHeart(
      heartEmptyCtx,
      0,
      0,
      8,
      PLACEHOLDER_COLORS.HUD_HEART_EMPTY,
      'empty'
    );
    this.assets.sprites.set('hud_heart_empty', heartEmptyCanvas);

    // Rupee icon
    const { canvas: rupeeIconCanvas, ctx: rupeeIconCtx } = createCanvasWithContext(8, 8);
    rupeeIconCtx.fillStyle = PLACEHOLDER_COLORS.HUD_RUPEE;
    rupeeIconCtx.fillRect(3, 1, 2, 6);
    rupeeIconCtx.fillRect(2, 2, 4, 4);
    this.assets.sprites.set('hud_rupee_icon', rupeeIconCanvas);

    // Key icon
    const { canvas: keyIconCanvas, ctx: keyIconCtx } = createCanvasWithContext(8, 8);
    keyIconCtx.fillStyle = PLACEHOLDER_COLORS.HUD_KEY;
    keyIconCtx.fillRect(1, 1, 4, 4);
    keyIconCtx.fillRect(4, 3, 3, 2);
    this.assets.sprites.set('hud_key_icon', keyIconCanvas);

    // Bomb icon
    const { canvas: bombIconCanvas, ctx: bombIconCtx } = createCanvasWithContext(8, 8);
    bombIconCtx.fillStyle = PLACEHOLDER_COLORS.HUD_BOMB;
    bombIconCtx.fillRect(1, 2, 6, 5);
    bombIconCtx.fillStyle = '#8B4513';
    bombIconCtx.fillRect(3, 0, 2, 3);
    this.assets.sprites.set('hud_bomb_icon', bombIconCanvas);

    // Minimap background
    const { canvas: minimapBgCanvas, ctx: minimapBgCtx } = createCanvasWithContext(64, 32);
    minimapBgCtx.fillStyle = PLACEHOLDER_COLORS.HUD_MINIMAP_BG;
    minimapBgCtx.fillRect(0, 0, 64, 32);
    minimapBgCtx.strokeStyle = '#666666';
    minimapBgCtx.strokeRect(0.5, 0.5, 63, 31);
    this.assets.sprites.set('hud_minimap_bg', minimapBgCanvas);

    // Minimap room (visited)
    const { canvas: minimapRoomCanvas, ctx: minimapRoomCtx } = createCanvasWithContext(4, 4);
    minimapRoomCtx.fillStyle = PLACEHOLDER_COLORS.HUD_MINIMAP_VISITED;
    minimapRoomCtx.fillRect(0, 0, 4, 4);
    this.assets.sprites.set('hud_minimap_room', minimapRoomCanvas);

    // Minimap current room
    const { canvas: minimapCurrentCanvas, ctx: minimapCurrentCtx } = createCanvasWithContext(4, 4);
    minimapCurrentCtx.fillStyle = PLACEHOLDER_COLORS.HUD_MINIMAP_CURRENT;
    minimapCurrentCtx.fillRect(0, 0, 4, 4);
    this.assets.sprites.set('hud_minimap_current', minimapCurrentCanvas);

    // NPC sprites
    this.generateNpcSprites();
  }

  private generateNpcSprites(): void {
    // Old Man (hooded figure in brown robes)
    const { canvas: oldManCanvas, ctx: oldManCtx } = createCanvasWithContext(16, 16);
    // Robe
    oldManCtx.fillStyle = '#8B4513';
    oldManCtx.fillRect(4, 4, 8, 12);
    // Hood
    oldManCtx.fillStyle = '#654321';
    oldManCtx.fillRect(5, 2, 6, 5);
    // Face
    oldManCtx.fillStyle = '#FFDAB9';
    oldManCtx.fillRect(6, 4, 4, 3);
    // Eyes
    oldManCtx.fillStyle = '#000000';
    oldManCtx.fillRect(6, 5, 1, 1);
    oldManCtx.fillRect(9, 5, 1, 1);
    this.assets.sprites.set('npc_old_man', oldManCanvas);

    // Merchant (similar to old man but different color)
    const { canvas: merchantCanvas, ctx: merchantCtx } = createCanvasWithContext(16, 16);
    // Robe (red)
    merchantCtx.fillStyle = '#8B0000';
    merchantCtx.fillRect(4, 4, 8, 12);
    // Hood
    merchantCtx.fillStyle = '#5B0000';
    merchantCtx.fillRect(5, 2, 6, 5);
    // Face
    merchantCtx.fillStyle = '#FFDAB9';
    merchantCtx.fillRect(6, 4, 4, 3);
    // Eyes
    merchantCtx.fillStyle = '#000000';
    merchantCtx.fillRect(6, 5, 1, 1);
    merchantCtx.fillRect(9, 5, 1, 1);
    this.assets.sprites.set('npc_merchant', merchantCanvas);

    // Old Woman (for potion shop)
    const { canvas: oldWomanCanvas, ctx: oldWomanCtx } = createCanvasWithContext(16, 16);
    // Dress (purple)
    oldWomanCtx.fillStyle = '#800080';
    oldWomanCtx.fillRect(4, 4, 8, 12);
    // Shawl
    oldWomanCtx.fillStyle = '#4B0082';
    oldWomanCtx.fillRect(5, 2, 6, 5);
    // Face
    oldWomanCtx.fillStyle = '#FFDAB9';
    oldWomanCtx.fillRect(6, 4, 4, 3);
    // Eyes
    oldWomanCtx.fillStyle = '#000000';
    oldWomanCtx.fillRect(6, 5, 1, 1);
    oldWomanCtx.fillRect(9, 5, 1, 1);
    this.assets.sprites.set('npc_old_woman', oldWomanCanvas);
  }

  private generateTiles(): void {
    // Grass tile
    const { canvas: grassCanvas, ctx: grassCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    drawTilePlaceholder(
      grassCtx,
      TILE_SIZE,
      PLACEHOLDER_COLORS.TILE_GRASS,
      PLACEHOLDER_COLORS.TILE_GRASS_LIGHT,
      'checkered'
    );
    this.assets.tiles.set('tile_grass', grassCanvas);

    // Ground tile
    const { canvas: groundCanvas, ctx: groundCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    drawTilePlaceholder(
      groundCtx,
      TILE_SIZE,
      PLACEHOLDER_COLORS.TILE_GROUND,
      PLACEHOLDER_COLORS.TILE_GROUND_DARK,
      'dotted'
    );
    this.assets.tiles.set('tile_ground', groundCanvas);

    // Water tile
    const { canvas: waterCanvas, ctx: waterCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    drawTilePlaceholder(
      waterCtx,
      TILE_SIZE,
      PLACEHOLDER_COLORS.TILE_WATER,
      PLACEHOLDER_COLORS.TILE_WATER_DARK,
      'water'
    );
    this.assets.tiles.set('tile_water', waterCanvas);

    // Rock tile
    const { canvas: rockCanvas, ctx: rockCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    drawTilePlaceholder(
      rockCtx,
      TILE_SIZE,
      PLACEHOLDER_COLORS.TILE_ROCK,
      PLACEHOLDER_COLORS.TILE_ROCK_DARK,
      'solid'
    );
    this.assets.tiles.set('tile_rock', rockCanvas);

    // Tree tile
    const { canvas: treeCanvas, ctx: treeCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    treeCtx.fillStyle = PLACEHOLDER_COLORS.TILE_TREE;
    treeCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Tree shape
    treeCtx.fillStyle = PLACEHOLDER_COLORS.TILE_BUSH;
    treeCtx.fillRect(2, 2, 12, 8);
    treeCtx.fillStyle = '#654321';
    treeCtx.fillRect(6, 10, 4, 6);
    this.assets.tiles.set('tile_tree', treeCanvas);

    // Bush tile
    const { canvas: bushCanvas, ctx: bushCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    bushCtx.fillStyle = PLACEHOLDER_COLORS.TILE_GRASS;
    bushCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    bushCtx.fillStyle = PLACEHOLDER_COLORS.TILE_BUSH;
    bushCtx.fillRect(2, 4, 12, 10);
    bushCtx.fillStyle = PLACEHOLDER_COLORS.TILE_GRASS_LIGHT;
    bushCtx.fillRect(4, 6, 4, 4);
    this.assets.tiles.set('tile_bush', bushCanvas);

    // Stairs tile
    const { canvas: stairsCanvas, ctx: stairsCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    stairsCtx.fillStyle = PLACEHOLDER_COLORS.TILE_STAIRS;
    stairsCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Stair lines
    stairsCtx.fillStyle = '#000000';
    for (let i = 0; i < 4; i++) {
      stairsCtx.fillRect(0, 3 + i * 4, TILE_SIZE, 2);
    }
    this.assets.tiles.set('tile_stairs', stairsCanvas);

    // Pit tile (black)
    const { canvas: pitCanvas, ctx: pitCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    pitCtx.fillStyle = PLACEHOLDER_COLORS.TILE_PIT;
    pitCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    this.assets.tiles.set('tile_pit', pitCanvas);

    // Wall tile
    const { canvas: wallCanvas, ctx: wallCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    drawTilePlaceholder(
      wallCtx,
      TILE_SIZE,
      PLACEHOLDER_COLORS.TILE_WALL,
      '#333333',
      'brick'
    );
    this.assets.tiles.set('tile_wall', wallCanvas);

    // Dungeon floor
    const { canvas: dFloorCanvas, ctx: dFloorCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    drawTilePlaceholder(
      dFloorCtx,
      TILE_SIZE,
      PLACEHOLDER_COLORS.DUNGEON_FLOOR,
      '#333355',
      'dotted'
    );
    this.assets.tiles.set('tile_dungeon_floor', dFloorCanvas);

    // Dungeon wall
    const { canvas: dWallCanvas, ctx: dWallCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    drawTilePlaceholder(
      dWallCtx,
      TILE_SIZE,
      PLACEHOLDER_COLORS.DUNGEON_WALL,
      '#222244',
      'brick'
    );
    this.assets.tiles.set('tile_dungeon_wall', dWallCanvas);

    // Dungeon block
    const { canvas: dBlockCanvas, ctx: dBlockCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    drawTilePlaceholder(
      dBlockCtx,
      TILE_SIZE,
      PLACEHOLDER_COLORS.DUNGEON_BLOCK,
      '#444477',
      'solid'
    );
    this.assets.tiles.set('tile_dungeon_block', dBlockCanvas);

    // Door (open)
    const { canvas: doorOpenCanvas, ctx: doorOpenCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    doorOpenCtx.fillStyle = '#000000';
    doorOpenCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    this.assets.tiles.set('tile_door_open', doorOpenCanvas);

    // Door (locked)
    const { canvas: doorLockedCanvas, ctx: doorLockedCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    doorLockedCtx.fillStyle = PLACEHOLDER_COLORS.HUD_KEY;
    doorLockedCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    doorLockedCtx.fillStyle = '#8B4513';
    doorLockedCtx.fillRect(4, 4, 8, 8);
    // Keyhole
    doorLockedCtx.fillStyle = '#000000';
    doorLockedCtx.fillRect(7, 6, 2, 4);
    this.assets.tiles.set('tile_door_locked', doorLockedCanvas);

    // Door (shutter)
    const { canvas: doorShutterCanvas, ctx: doorShutterCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    doorShutterCtx.fillStyle = '#666666';
    doorShutterCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Shutter lines
    doorShutterCtx.fillStyle = '#333333';
    for (let i = 0; i < 4; i++) {
      doorShutterCtx.fillRect(0, i * 4, TILE_SIZE, 2);
    }
    this.assets.tiles.set('tile_door_shutter', doorShutterCanvas);

    // ===== CAVE TILES =====

    // Cave floor (dark brown)
    const { canvas: caveFloorCanvas, ctx: caveFloorCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    caveFloorCtx.fillStyle = '#3D2817';
    caveFloorCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Add some texture
    caveFloorCtx.fillStyle = '#2D1807';
    caveFloorCtx.fillRect(2, 2, 2, 2);
    caveFloorCtx.fillRect(10, 6, 2, 2);
    caveFloorCtx.fillRect(4, 12, 2, 2);
    this.assets.tiles.set('tile_cave_floor', caveFloorCanvas);

    // Cave wall (dark gray/black)
    const { canvas: caveWallCanvas, ctx: caveWallCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    caveWallCtx.fillStyle = '#1A1A1A';
    caveWallCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Add some rock texture
    caveWallCtx.fillStyle = '#2A2A2A';
    caveWallCtx.fillRect(2, 4, 4, 4);
    caveWallCtx.fillRect(8, 8, 4, 4);
    caveWallCtx.fillRect(4, 10, 3, 3);
    this.assets.tiles.set('tile_cave_wall', caveWallCanvas);

    // Cave pillar (stone pillar)
    const { canvas: cavePillarCanvas, ctx: cavePillarCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    // Background
    cavePillarCtx.fillStyle = '#3D2817';
    cavePillarCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Pillar
    cavePillarCtx.fillStyle = '#707070';
    cavePillarCtx.fillRect(4, 0, 8, TILE_SIZE);
    // Pillar highlight
    cavePillarCtx.fillStyle = '#909090';
    cavePillarCtx.fillRect(5, 0, 2, TILE_SIZE);
    // Pillar shadow
    cavePillarCtx.fillStyle = '#505050';
    cavePillarCtx.fillRect(10, 0, 2, TILE_SIZE);
    this.assets.tiles.set('tile_cave_pillar', cavePillarCanvas);

    // Cave fire/torch (animated would be ideal, but static for now)
    const { canvas: caveFireCanvas, ctx: caveFireCtx } = createCanvasWithContext(TILE_SIZE, TILE_SIZE);
    // Background
    caveFireCtx.fillStyle = '#3D2817';
    caveFireCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Torch base
    caveFireCtx.fillStyle = '#8B4513';
    caveFireCtx.fillRect(6, 8, 4, 8);
    // Flame outer (orange)
    caveFireCtx.fillStyle = '#FF6600';
    caveFireCtx.fillRect(5, 2, 6, 6);
    // Flame inner (yellow)
    caveFireCtx.fillStyle = '#FFFF00';
    caveFireCtx.fillRect(6, 3, 4, 4);
    // Flame core (white)
    caveFireCtx.fillStyle = '#FFFFFF';
    caveFireCtx.fillRect(7, 4, 2, 2);
    this.assets.tiles.set('tile_cave_fire', caveFireCanvas);
  }
}

// ===== SINGLETON INSTANCE =====

let assetGeneratorInstance: AssetGenerator | null = null;

/**
 * Gets or creates the singleton asset generator instance
 */
export function getAssetGenerator(): AssetGenerator {
  if (!assetGeneratorInstance) {
    assetGeneratorInstance = new AssetGenerator();
  }
  return assetGeneratorInstance;
}

/**
 * Generates assets and returns them (convenience function)
 */
export function generateGameAssets(): GeneratedAssets {
  const generator = getAssetGenerator();
  if (!generator.isReady()) {
    generator.generate();
  }
  return generator.getAssets();
}
