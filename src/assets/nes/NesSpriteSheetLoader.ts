/**
 * NesSpriteSheetLoader.ts — Loads the NES Link sprite sheet PNG,
 * slices it into individual sprites using the atlas coordinates,
 * and color-keys the background to transparent.
 *
 * Follows the same async fire-and-forget pattern as GbcSpriteLoader.
 */

import { NES_SPRITE_ATLAS, type SpriteRect } from './SpriteAtlas';

const SPRITE_SHEET_PATH = '/sprites/nes/link_spritesheet.png';

/**
 * The gray background color used behind sprites in the sheet.
 * Pixels matching this color (±tolerance) are made transparent.
 */
const BG_COLOR = { r: 128, g: 128, b: 128 };

/**
 * Tolerance for background color matching.
 * Some anti-aliasing or compression artifacts may shift the gray slightly.
 */
const BG_TOLERANCE = 15;

/**
 * Also key out the green sheet background color.
 */
const GREEN_BG = { r: 56, g: 152, b: 56 };

/**
 * Loads an image from a URL and returns it as an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Returns true if the pixel at offset `i` in `data` matches the given
 * color within the tolerance.
 */
function matchesColor(
  data: Uint8ClampedArray,
  i: number,
  color: { r: number; g: number; b: number },
  tolerance: number
): boolean {
  const r = data[i] as number;
  const g = data[i + 1] as number;
  const b = data[i + 2] as number;
  return (
    Math.abs(r - color.r) <= tolerance &&
    Math.abs(g - color.g) <= tolerance &&
    Math.abs(b - color.b) <= tolerance
  );
}

/**
 * Color-keys background pixels to transparent.
 * Removes both the gray sprite-cell background and the green sheet background.
 */
function removeBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (
      matchesColor(d, i, BG_COLOR, BG_TOLERANCE) ||
      matchesColor(d, i, GREEN_BG, BG_TOLERANCE)
    ) {
      d[i + 3] = 0; // alpha = 0
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Extracts a single sprite from the loaded sheet image.
 */
function extractSprite(
  sheetImage: HTMLImageElement,
  rect: SpriteRect
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  // Disable image smoothing for pixel-art
  ctx.imageSmoothingEnabled = false;

  // Draw the source rectangle from the sprite sheet onto this small canvas
  ctx.drawImage(
    sheetImage,
    rect.x, rect.y, rect.w, rect.h, // source rect
    0, 0, rect.w, rect.h             // dest rect
  );

  // Color-key backgrounds to transparent
  removeBackground(ctx, rect.w, rect.h);

  return canvas;
}

/**
 * Loads the NES Link sprite sheet and extracts all sprites defined in the atlas.
 *
 * Returns a Map of sprite key → HTMLCanvasElement.
 * If the image fails to load, logs a warning and returns an empty map.
 *
 * Sprites are also registered under legacy SpriteKey aliases so existing
 * animation data continues to work (e.g. link_attack_down → link_attack_down_2).
 */
export async function loadNesLinkSprites(): Promise<Map<string, HTMLCanvasElement>> {
  const sprites = new Map<string, HTMLCanvasElement>();

  let sheetImage: HTMLImageElement;
  try {
    sheetImage = await loadImage(SPRITE_SHEET_PATH);
  } catch (err) {
    console.warn('NES sprite sheet not found — using placeholder sprites.', err);
    return sprites;
  }

  for (const [key, rect] of Object.entries(NES_SPRITE_ATLAS)) {
    try {
      const canvas = extractSprite(sheetImage, rect);
      sprites.set(key, canvas);
    } catch (err) {
      console.warn(`Failed to extract sprite "${key}":`, err);
    }
  }

  // Register aliases so existing AnimationData sprite keys work.
  // The existing system uses link_attack_{dir} as a single key;
  // map it to attack frame 2 (mid-swing, hitbox active).
  const ATTACK_ALIASES: Record<string, string> = {
    link_attack_down: 'link_attack_down_2',
    link_attack_up: 'link_attack_up_2',
    link_attack_left: 'link_attack_left_2',
    link_attack_right: 'link_attack_right_2',
  };

  for (const [alias, source] of Object.entries(ATTACK_ALIASES)) {
    const canvas = sprites.get(source);
    if (canvas) {
      sprites.set(alias, canvas);
    }
  }

  // Map boomerang rotation frames to the existing key
  const boom1 = sprites.get('projectile_boomerang_1');
  if (boom1) {
    sprites.set('projectile_boomerang', boom1);
  }

  return sprites;
}
