const TILE_BYTES = 16;
const TILE_PIXELS = 64;
const TILE_WIDTH = 8;

/**
 * Decode a single GBC 2bpp tile (16 bytes) into 64 color indices (0-3).
 *
 * GBC 2bpp format: each row is 2 bytes. For pixel N (0-7, left to right):
 *   - bit (7-N) of byte0 = low bit of color index
 *   - bit (7-N) of byte1 = high bit of color index
 */
export function decodeTile(data: Uint8Array, offset: number): Uint8Array {
  const pixels = new Uint8Array(TILE_PIXELS);

  for (let row = 0; row < TILE_WIDTH; row++) {
    const byte0 = data[offset + row * 2] as number;
    const byte1 = data[offset + row * 2 + 1] as number;

    for (let col = 0; col < TILE_WIDTH; col++) {
      const bit = 7 - col;
      const lo = (byte0 >> bit) & 1;
      const hi = (byte1 >> bit) & 1;
      pixels[row * TILE_WIDTH + col] = (hi << 1) | lo;
    }
  }

  return pixels;
}

/**
 * Parse a full binary buffer into an array of decoded tiles.
 * Each tile is 16 bytes; an 8928-byte buffer yields 558 tiles.
 */
export function parseTileBuffer(buffer: ArrayBuffer): Uint8Array[] {
  if (buffer.byteLength % TILE_BYTES !== 0) {
    throw new Error(
      `Buffer size ${buffer.byteLength} is not divisible by ${TILE_BYTES} (tile size). ` +
        `Expected a multiple of ${TILE_BYTES} bytes.`
    );
  }

  const data = new Uint8Array(buffer);
  const tileCount = buffer.byteLength / TILE_BYTES;
  const tiles: Uint8Array[] = [];

  for (let i = 0; i < tileCount; i++) {
    tiles.push(decodeTile(data, i * TILE_BYTES));
  }

  return tiles;
}
