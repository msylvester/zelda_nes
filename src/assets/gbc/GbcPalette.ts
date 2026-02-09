/** RGBA color tuple: [red, green, blue, alpha] each 0-255 */
export type RGBA = [number, number, number, number];

/** GBC palette: 4 colors mapped from 2-bit indices (0-3) */
export type GbcPalette = [RGBA, RGBA, RGBA, RGBA];

/** Default green palette matching GBC aesthetic. Index 0 is transparent. */
export const DEFAULT_PALETTE: GbcPalette = [
  [0, 0, 0, 0], // 0: transparent
  [96, 176, 72, 255], // 1: light green
  [56, 120, 56, 255], // 2: mid green
  [8, 56, 8, 255], // 3: dark green
];

/** Red palette preset. Index 0 is transparent. */
export const RED_PALETTE: GbcPalette = [
  [0, 0, 0, 0], // 0: transparent
  [216, 120, 104, 255], // 1: light red
  [168, 56, 56, 255], // 2: mid red
  [80, 16, 16, 255], // 3: dark red
];

/** Blue palette preset. Index 0 is transparent. */
export const BLUE_PALETTE: GbcPalette = [
  [0, 0, 0, 0], // 0: transparent
  [120, 152, 216, 255], // 1: light blue
  [56, 88, 168, 255], // 2: mid blue
  [16, 32, 80, 255], // 3: dark blue
];

const TILE_WIDTH = 8;

/**
 * Render a decoded tile (64 color indices) to an 8x8 HTMLCanvasElement
 * using the given palette. Index 0 pixels are fully transparent.
 */
export function renderTileToCanvas(
  tile: Uint8Array,
  palette: GbcPalette
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_WIDTH;
  canvas.height = TILE_WIDTH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  const imageData = ctx.createImageData(TILE_WIDTH, TILE_WIDTH);
  const { data } = imageData;

  for (let i = 0; i < TILE_WIDTH * TILE_WIDTH; i++) {
    const colorIndex = tile[i] as number;
    const [r, g, b, a] = palette[colorIndex] as RGBA;
    const offset = i * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
