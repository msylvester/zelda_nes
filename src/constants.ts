// constants.ts - Game constants
// NES Zelda faithful values from spec section 9

// ===== SCREEN DIMENSIONS =====
export const SCREEN_WIDTH = 256;
export const SCREEN_HEIGHT = 240;
export const PLAY_AREA_WIDTH = 256;
export const PLAY_AREA_HEIGHT = 176;
export const HUD_HEIGHT = 64;
export const TILE_SIZE = 16;
export const TILES_PER_ROW = 16;
export const TILES_PER_COL = 11;
export const TILES_PER_SCREEN = 176;

// ===== GAMEPLAY =====
export const TARGET_FPS = 60;
export const FRAME_DURATION_MS = 1000 / TARGET_FPS;
export const MAX_FRAME_SKIP = 3;
export const PLAYER_SPEED_SUBPIXELS = 24; // 1.5 px/frame * 16 subpixels
export const SUBPIXEL_SCALE = 16;
export const KNOCKBACK_DISTANCE = 16;
export const KNOCKBACK_FRAMES = 16;
export const INVINCIBILITY_FRAMES = 60;
export const INVINCIBILITY_FLASH_INTERVAL = 4;
export const ATTACK_FRAMES = 12;
export const SWORD_HITBOX_ACTIVE_START = 2;
export const SWORD_HITBOX_ACTIVE_END = 8;
export const MAX_ENEMIES_PER_SCREEN = 6;
export const OVERWORLD_SPAWN_DELAY = 15;
export const DUNGEON_SPAWN_DELAY = 0;

// ===== TRANSITIONS =====
export const SCROLL_SPEED = 4; // px per frame
export const HORIZONTAL_SCROLL_FRAMES = 64;
export const VERTICAL_SCROLL_FRAMES = 44;
export const DUNGEON_FADE_FRAMES = 9;
export const CAVE_WIPE_FRAMES = 33;

// ===== OVERWORLD =====
export const OVERWORLD_COLS = 16;
export const OVERWORLD_ROWS = 8;
export const START_SCREEN_COL = 7;
export const START_SCREEN_ROW = 7;

// ===== PLAYER =====
export const STARTING_HEARTS = 3;
export const MAX_HEARTS = 16;
export const STARTING_HP = 6; // 3 hearts * 2 half-hearts
export const CONTINUE_HP = 6; // Always restore to 3 hearts on continue
export const MAX_RUPEES = 255;
export const MAX_KEYS = 255;
export const MAX_BOMBS = 8;
export const PLAYER_SPRITE_WIDTH = 16;
export const PLAYER_SPRITE_HEIGHT = 16;
export const PLAYER_HITBOX_WIDTH = 8;
export const PLAYER_HITBOX_HEIGHT = 8;
export const PLAYER_HITBOX_OFFSET_X = 4;
export const PLAYER_HITBOX_OFFSET_Y = 8;

// ===== SWORD HITBOX =====
export const SWORD_HITBOX_HORIZONTAL_WIDTH = 16;
export const SWORD_HITBOX_HORIZONTAL_HEIGHT = 8;
export const SWORD_HITBOX_VERTICAL_WIDTH = 8;
export const SWORD_HITBOX_VERTICAL_HEIGHT = 16;

// ===== DISPLAY =====
export const CANVAS_SCALE = 3;
export const MAX_SPRITES_PER_SCANLINE = 8;

// ===== DAMAGE =====
export const SWORD_DAMAGE: Record<number, number> = { 1: 1, 2: 2, 3: 4 };
export const MIN_DAMAGE = 1;

// ===== SWORD BEAM =====
export const SWORD_BEAM_SPEED = 3; // px per frame

// ===== BOOMERANG =====
export const BOOMERANG_RANGE_TILES = 5;
export const BOOMERANG_STUN_FRAMES = 60;
export const BOOMERANG_SPEED = 2.5; // px per frame - wood boomerang
export const MAGIC_BOOMERANG_SPEED = 3.5; // px per frame - magic boomerang is faster

// ===== BOMBS =====
export const BOMB_FUSE_FRAMES = 60;
export const BOMB_BLAST_RADIUS = 8;
export const BOMB_DAMAGE = 4;

// ===== CANDLE =====
export const CANDLE_FLAME_RANGE_TILES = 4;
export const CANDLE_FLAME_SPEED = 2.0; // px per frame
export const CANDLE_FLAME_BURN_DURATION = 60; // frames

// ===== ITEM DROPS =====
export const DROP_CHANCE = 0.32;
export const ITEM_DESPAWN_FRAMES = 600; // ~10 seconds at 60 FPS
export const DROP_GROUPS = {
  A: ['RUPEE', 'HEART', 'RUPEE', 'FAIRY'],
  B: ['BOMB', 'RUPEE', 'CLOCK', 'RUPEE'],
  C: ['RUPEE', 'HEART', 'RUPEE', 'RUPEE'],
  D: ['HEART', 'FAIRY', 'RUPEE', 'HEART'],
} as const;

// ===== DEATH ANIMATION =====
export const DEATH_ANIMATION_FRAMES = 80;

// ===== DUNGEON =====
export const DUNGEON_GRID_WIDTH = 8;
export const DUNGEON_GRID_HEIGHT = 8;

// ===== PROJECTILE SPEEDS (px/frame) =====
export const PROJECTILE_SPEEDS = {
  ROCK: 1.5,
  ARROW: 2.0,
  MAGIC_BEAM: 2.0,
  FIREBALL: 1.5,
  ZORA_FIREBALL: 1.5,
  SWORD_BEAM: 3, // Per spec: sword beam travels at 3px/frame
  BOOMERANG: 2.5, // Wood boomerang speed
  MAGIC_BOOMERANG: 3.5, // Magic boomerang is faster
  CANDLE_FLAME: 2.0, // Candle flame speed
} as const;

// ===== INPUT =====
export const KEY_MAPPINGS = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  KeyZ: 'A',
  KeyX: 'B',
  Enter: 'START',
  ShiftLeft: 'SELECT',
  ShiftRight: 'SELECT',
} as const;

// ===== SAVE SYSTEM =====
export const SAVE_SLOTS = 3;
export const SAVE_VERSION = 1;
export const LOCAL_STORAGE_KEY = 'zelda_nes_saves';
