import type { GbcPalette, RGBA } from './GbcPalette';

const TILE_WIDTH = 8;
const FRAME_WIDTH = 16;
const FRAME_HEIGHT = 16;

/**
 * Compose 4 decoded tiles into a 16x16 sprite frame canvas.
 *
 * Tile arrangement in the 2x2 grid:
 *   [topLeft,    topRight]
 *   [bottomLeft, bottomRight]
 *
 * @param tiles - Full array of decoded tiles from parseTileBuffer
 * @param tileIndices - [topLeft, topRight, bottomLeft, bottomRight] indices into the tiles array
 * @param palette - Color palette mapping 2-bit indices to RGBA
 * @returns 16x16 HTMLCanvasElement with the composed sprite frame
 */
export function composeFrame(
  tiles: Uint8Array[],
  tileIndices: [number, number, number, number],
  palette: GbcPalette
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  const imageData = ctx.createImageData(FRAME_WIDTH, FRAME_HEIGHT);
  const { data } = imageData;

  // Grid positions: [tileIndex, xOffset, yOffset]
  const positions: [number, number, number][] = [
    [tileIndices[0], 0, 0],                    // top-left
    [tileIndices[1], TILE_WIDTH, 0],            // top-right
    [tileIndices[2], 0, TILE_WIDTH],            // bottom-left
    [tileIndices[3], TILE_WIDTH, TILE_WIDTH],   // bottom-right
  ];

  for (const [tileIdx, xOff, yOff] of positions) {
    const tile = tiles[tileIdx];
    if (!tile) {
      throw new Error(`Tile index ${tileIdx} out of range (${tiles.length} tiles available)`);
    }

    for (let row = 0; row < TILE_WIDTH; row++) {
      for (let col = 0; col < TILE_WIDTH; col++) {
        const colorIndex = tile[row * TILE_WIDTH + col] as number;
        const [r, g, b, a] = palette[colorIndex] as RGBA;

        const px = xOff + col;
        const py = yOff + row;
        const offset = (py * FRAME_WIDTH + px) * 4;

        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = a;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
