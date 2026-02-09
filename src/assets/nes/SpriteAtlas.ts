/**
 * SpriteAtlas.ts — Coordinate map for every sprite in the NES Link sprite sheet.
 *
 * Each entry maps a sprite key to its pixel rectangle {x, y, w, h} in
 * public/sprites/nes/link_spritesheet.png.
 *
 * The sprite sheet layout (from the reference image) is organized in labeled rows:
 *   Row 0: "Basic movement" | "Use item/weapon" | "Pick up item" | "Magical Shield"
 *   Row 1–4: "Wooden Sword" | "White Sword" | "Magical Sword" | "Magical Rod"
 *   Row 5: Sword beam / misc weapon items
 *   Row 6: "Other Weapons/Items"
 *   Row 7–8: "Hurt Colors Example"
 *
 * IMPORTANT: The coordinates below are measured from the reference image at its
 * original resolution (2216×1664). If you re-export the sprite sheet at a
 * different size, scale all values proportionally.
 *
 * Each sprite sits on a gray (#808080) background rectangle within the green
 * sheet. The loader color-keys that gray to transparent.
 */

export interface SpriteRect {
  /** X offset in the sprite sheet (px) */
  x: number;
  /** Y offset in the sprite sheet (px) */
  y: number;
  /** Width of the sprite region (px) */
  w: number;
  /** Height of the sprite region (px) */
  h: number;
}

/**
 * Maps a gameplay sprite key → its source rectangle in the sprite sheet.
 *
 * Coordinates assume the original sprite sheet pixel grid.
 * The sheet uses 16×16 character sprites and 8×8 / 8×16 / 16×8 weapon sprites.
 * Gray background cells are spaced ~1 px apart.
 *
 * NOTE TO FUTURE DEVS: If you add the PNG and the sprites look mis-aligned,
 * adjust these coordinates. Open the PNG in an image editor and check pixel
 * offsets. The green background makes it easy to see the bounding boxes.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Shorthand for a 16×16 sprite at (x, y). */
const s16 = (x: number, y: number): SpriteRect => ({ x, y, w: 16, h: 16 });

/** Shorthand for an 8×8 sprite at (x, y). */
const s8 = (x: number, y: number): SpriteRect => ({ x, y, w: 8, h: 8 });

/** Shorthand for an 8×16 (tall) sprite at (x, y). */
const s8x16 = (x: number, y: number): SpriteRect => ({ x, y, w: 8, h: 16 });

/** Shorthand for a 16×8 (wide) sprite at (x, y). */
const s16x8 = (x: number, y: number): SpriteRect => ({ x, y, w: 16, h: 8 });

// ── Row 0: Basic movement, Use item, Pick up, Magical Shield ────────────────
// The first row of sprites sits below the "Basic movement" header text.
// Approximate Y baseline for row 0 character sprites: y=48
// Each sprite is 16×16, separated by ~1–2 px gaps.

const ROW0_Y = 48;

// Basic movement: 8 frames (down1, down2, left1, left2, right1, right2, up1, up2)
// Starting at roughly x=1
const BASIC_MOVE_X = 1;
const BASIC_STEP = 18; // 16px sprite + 2px gap

// Use item/weapon: 4 frames (down, left, right, up)
// Starting roughly after basic movement + a gap, ~x=290
const USE_ITEM_X = 290;

// Pick up item: 2 frames
const PICKUP_X = 530;

// Magical Shield: 8 frames (same layout as basic movement)
const SHIELD_X = 700;

// ── Rows 1–4: Weapon attacks ─────────────────────────────────────────────────
// Each weapon section has 4 rows (one per direction: down, left, up, right)
// with ~4 frames per row. Each row is ~18px tall.

// Row heights for weapon sections (approximate Y positions)
const WEAPON_ROW_HEIGHT = 18;

// Wooden Sword section starts around y=120
const WS_Y = 120;
const WS_X = 1;

// White Sword section starts around same Y but offset to the right ~x=340
const WHITE_S_X = 340;

// Magical Sword starts around x=680
const MAG_S_X = 680;

// Magical Rod starts around x=1020
const ROD_X = 1020;

// ── Row 5–6: Other weapons/items ─────────────────────────────────────────────
// Sword beam projectiles, arrows, boomerang, bomb, etc.
// These are various sizes (8×8, 8×16, 16×8)

const ITEMS_Y = 440;
const ITEMS_X = 1;

// ══════════════════════════════════════════════════════════════════════════════
// The atlas maps sprite keys to rectangles.
//
// The coordinates here are ESTIMATES based on the reference image layout.
// They MUST be validated and adjusted once the actual PNG is added to the repo.
// The loader will gracefully handle missing/misaligned sprites by logging a
// warning, so the game won't crash if coordinates are off.
// ══════════════════════════════════════════════════════════════════════════════

export const NES_SPRITE_ATLAS: Record<string, SpriteRect> = {
  // ── Basic Movement (16×16) ───────────────────────────────────────────────
  link_down_1:  s16(BASIC_MOVE_X + BASIC_STEP * 0, ROW0_Y),
  link_down_2:  s16(BASIC_MOVE_X + BASIC_STEP * 1, ROW0_Y),
  link_left_1:  s16(BASIC_MOVE_X + BASIC_STEP * 2, ROW0_Y),
  link_left_2:  s16(BASIC_MOVE_X + BASIC_STEP * 3, ROW0_Y),
  link_right_1: s16(BASIC_MOVE_X + BASIC_STEP * 4, ROW0_Y),
  link_right_2: s16(BASIC_MOVE_X + BASIC_STEP * 5, ROW0_Y),
  link_up_1:    s16(BASIC_MOVE_X + BASIC_STEP * 6, ROW0_Y),
  link_up_2:    s16(BASIC_MOVE_X + BASIC_STEP * 7, ROW0_Y),

  // ── Use Item / Weapon (16×16) ────────────────────────────────────────────
  link_use_item_down:  s16(USE_ITEM_X + BASIC_STEP * 0, ROW0_Y),
  link_use_item_left:  s16(USE_ITEM_X + BASIC_STEP * 1, ROW0_Y),
  link_use_item_right: s16(USE_ITEM_X + BASIC_STEP * 2, ROW0_Y),
  link_use_item_up:    s16(USE_ITEM_X + BASIC_STEP * 3, ROW0_Y),

  // ── Pick Up Item (16×16) ─────────────────────────────────────────────────
  link_pickup_one_hand: s16(PICKUP_X, ROW0_Y),
  link_pickup_two_hand: s16(PICKUP_X + BASIC_STEP, ROW0_Y),

  // ── Magical Shield Walk (16×16) ──────────────────────────────────────────
  link_shield_down_1:  s16(SHIELD_X + BASIC_STEP * 0, ROW0_Y),
  link_shield_down_2:  s16(SHIELD_X + BASIC_STEP * 1, ROW0_Y),
  link_shield_left_1:  s16(SHIELD_X + BASIC_STEP * 2, ROW0_Y),
  link_shield_left_2:  s16(SHIELD_X + BASIC_STEP * 3, ROW0_Y),
  link_shield_right_1: s16(SHIELD_X + BASIC_STEP * 4, ROW0_Y),
  link_shield_right_2: s16(SHIELD_X + BASIC_STEP * 5, ROW0_Y),
  link_shield_up_1:    s16(SHIELD_X + BASIC_STEP * 6, ROW0_Y),
  link_shield_up_2:    s16(SHIELD_X + BASIC_STEP * 7, ROW0_Y),

  // ── Wooden Sword Attack (16×16 Link body per frame) ──────────────────────
  // 4 directions × 4 frames
  link_attack_down_1:  s16(WS_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_down_2:  s16(WS_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_down_3:  s16(WS_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_down_4:  s16(WS_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_left_1:  s16(WS_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_left_2:  s16(WS_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_left_3:  s16(WS_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_left_4:  s16(WS_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_up_1:    s16(WS_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_up_2:    s16(WS_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_up_3:    s16(WS_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_up_4:    s16(WS_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_right_1: s16(WS_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_attack_right_2: s16(WS_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_attack_right_3: s16(WS_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_attack_right_4: s16(WS_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 3),

  // ── White Sword Attack (16×16) ───────────────────────────────────────────
  link_attack_down_white_1:  s16(WHITE_S_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_down_white_2:  s16(WHITE_S_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_down_white_3:  s16(WHITE_S_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_down_white_4:  s16(WHITE_S_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_left_white_1:  s16(WHITE_S_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_left_white_2:  s16(WHITE_S_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_left_white_3:  s16(WHITE_S_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_left_white_4:  s16(WHITE_S_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_up_white_1:    s16(WHITE_S_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_up_white_2:    s16(WHITE_S_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_up_white_3:    s16(WHITE_S_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_up_white_4:    s16(WHITE_S_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_right_white_1: s16(WHITE_S_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_attack_right_white_2: s16(WHITE_S_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_attack_right_white_3: s16(WHITE_S_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_attack_right_white_4: s16(WHITE_S_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 3),

  // ── Magical Sword Attack (16×16) ─────────────────────────────────────────
  link_attack_down_magical_1:  s16(MAG_S_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_down_magical_2:  s16(MAG_S_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_down_magical_3:  s16(MAG_S_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_down_magical_4:  s16(MAG_S_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_attack_left_magical_1:  s16(MAG_S_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_left_magical_2:  s16(MAG_S_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_left_magical_3:  s16(MAG_S_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_left_magical_4:  s16(MAG_S_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_attack_up_magical_1:    s16(MAG_S_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_up_magical_2:    s16(MAG_S_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_up_magical_3:    s16(MAG_S_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_up_magical_4:    s16(MAG_S_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_attack_right_magical_1: s16(MAG_S_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_attack_right_magical_2: s16(MAG_S_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_attack_right_magical_3: s16(MAG_S_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_attack_right_magical_4: s16(MAG_S_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 3),

  // ── Magical Rod Attack (16×16) ───────────────────────────────────────────
  link_rod_attack_down_1:  s16(ROD_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_rod_attack_down_2:  s16(ROD_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_rod_attack_down_3:  s16(ROD_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_rod_attack_down_4:  s16(ROD_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 0),
  link_rod_attack_left_1:  s16(ROD_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_rod_attack_left_2:  s16(ROD_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_rod_attack_left_3:  s16(ROD_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_rod_attack_left_4:  s16(ROD_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 1),
  link_rod_attack_up_1:    s16(ROD_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_rod_attack_up_2:    s16(ROD_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_rod_attack_up_3:    s16(ROD_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_rod_attack_up_4:    s16(ROD_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 2),
  link_rod_attack_right_1: s16(ROD_X + BASIC_STEP * 0, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_rod_attack_right_2: s16(ROD_X + BASIC_STEP * 1, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_rod_attack_right_3: s16(ROD_X + BASIC_STEP * 2, WS_Y + WEAPON_ROW_HEIGHT * 3),
  link_rod_attack_right_4: s16(ROD_X + BASIC_STEP * 3, WS_Y + WEAPON_ROW_HEIGHT * 3),

  // ── Standalone Sword Sprites ─────────────────────────────────────────────
  // Swords appear alongside their respective attack frames.
  // Vertical swords: 8×16, horizontal swords: 16×8
  sword_down:  s8x16(WS_X + BASIC_STEP * 4, WS_Y + WEAPON_ROW_HEIGHT * 0),
  sword_up:    s8x16(WS_X + BASIC_STEP * 4, WS_Y + WEAPON_ROW_HEIGHT * 2),
  sword_left:  s16x8(WS_X + BASIC_STEP * 4, WS_Y + WEAPON_ROW_HEIGHT * 1),
  sword_right: s16x8(WS_X + BASIC_STEP * 4, WS_Y + WEAPON_ROW_HEIGHT * 3),

  // ── Projectile / Weapon Sprites ──────────────────────────────────────────
  // Row below weapon sections. Various sizes.
  arrow_up:    s8x16(ITEMS_X,                  ITEMS_Y),
  arrow_down:  s8x16(ITEMS_X + 10,             ITEMS_Y),
  arrow_left:  s16x8(ITEMS_X + 20,             ITEMS_Y),
  arrow_right: s16x8(ITEMS_X + 38,             ITEMS_Y),

  projectile_boomerang_1: s8(ITEMS_X + 60,  ITEMS_Y),
  projectile_boomerang_2: s8(ITEMS_X + 70,  ITEMS_Y),
  projectile_boomerang_3: s8(ITEMS_X + 80,  ITEMS_Y),
  projectile_boomerang_4: s8(ITEMS_X + 90,  ITEMS_Y),

  projectile_fireball: s8(ITEMS_X + 106, ITEMS_Y),
  candle_flame:        s8(ITEMS_X + 116, ITEMS_Y),
  rod_projectile:      s8(ITEMS_X + 126, ITEMS_Y),

  sword_beam:   s8(ITEMS_X + 140, ITEMS_Y),
  sword_beam_2: s8(ITEMS_X + 150, ITEMS_Y),
  sword_beam_3: s8(ITEMS_X + 160, ITEMS_Y),
  sword_beam_4: s8(ITEMS_X + 170, ITEMS_Y),

  item_bomb: s8x16(ITEMS_X + 186, ITEMS_Y),
};

/** Total number of sprites defined in the atlas */
export const ATLAS_SPRITE_COUNT = Object.keys(NES_SPRITE_ATLAS).length;
