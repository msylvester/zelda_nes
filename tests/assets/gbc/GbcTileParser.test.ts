import { decodeTile, parseTileBuffer } from '../../../src/assets/gbc/GbcTileParser';

describe('GbcTileParser', () => {
  describe('decodeTile', () => {
    it('decodes all-zero bytes to 64 zeros', () => {
      const data = new Uint8Array(16); // all zeros
      const result = decodeTile(data, 0);

      expect(result.length).toBe(64);
      for (let i = 0; i < 64; i++) {
        expect(result[i]).toBe(0);
      }
    });

    it('decodes 0xFF 0x00 rows to all 1s (low bit set)', () => {
      const data = new Uint8Array(16);
      for (let row = 0; row < 8; row++) {
        data[row * 2] = 0xff; // byte0 = all 1s (low bits)
        data[row * 2 + 1] = 0x00; // byte1 = all 0s (high bits)
      }
      const result = decodeTile(data, 0);

      expect(result.length).toBe(64);
      for (let i = 0; i < 64; i++) {
        expect(result[i]).toBe(1);
      }
    });

    it('decodes 0x00 0xFF rows to all 2s (high bit set)', () => {
      const data = new Uint8Array(16);
      for (let row = 0; row < 8; row++) {
        data[row * 2] = 0x00; // byte0 = all 0s (low bits)
        data[row * 2 + 1] = 0xff; // byte1 = all 1s (high bits)
      }
      const result = decodeTile(data, 0);

      expect(result.length).toBe(64);
      for (let i = 0; i < 64; i++) {
        expect(result[i]).toBe(2);
      }
    });

    it('decodes 0xFF 0xFF rows to all 3s (both bits set)', () => {
      const data = new Uint8Array(16);
      for (let row = 0; row < 8; row++) {
        data[row * 2] = 0xff;
        data[row * 2 + 1] = 0xff;
      }
      const result = decodeTile(data, 0);

      expect(result.length).toBe(64);
      for (let i = 0; i < 64; i++) {
        expect(result[i]).toBe(3);
      }
    });

    it('decodes a specific bit pattern correctly', () => {
      // First row: byte0 = 0b10000000, byte1 = 0b00000000
      // pixel 0: lo=1, hi=0 → 1
      // pixels 1-7: lo=0, hi=0 → 0
      const data = new Uint8Array(16);
      data[0] = 0b10000000;
      data[1] = 0b00000000;
      const result = decodeTile(data, 0);

      expect(result[0]).toBe(1); // pixel 0
      expect(result[1]).toBe(0); // pixel 1
    });

    it('decodes with correct pixel ordering (bit 7 = leftmost pixel)', () => {
      // First row: byte0 = 0b10101010, byte1 = 0b01010101
      // pixel 0 (bit 7): lo=1, hi=0 → 1
      // pixel 1 (bit 6): lo=0, hi=1 → 2
      // pixel 2 (bit 5): lo=1, hi=0 → 1
      // pixel 3 (bit 4): lo=0, hi=1 → 2
      // pixel 4 (bit 3): lo=1, hi=0 → 1
      // pixel 5 (bit 2): lo=0, hi=1 → 2
      // pixel 6 (bit 1): lo=1, hi=0 → 1
      // pixel 7 (bit 0): lo=0, hi=1 → 2
      const data = new Uint8Array(16);
      data[0] = 0b10101010;
      data[1] = 0b01010101;
      const result = decodeTile(data, 0);

      expect(result[0]).toBe(1);
      expect(result[1]).toBe(2);
      expect(result[2]).toBe(1);
      expect(result[3]).toBe(2);
      expect(result[4]).toBe(1);
      expect(result[5]).toBe(2);
      expect(result[6]).toBe(1);
      expect(result[7]).toBe(2);
    });

    it('uses offset parameter correctly', () => {
      // Put the tile data at offset 16 (second tile position)
      const data = new Uint8Array(32);
      for (let row = 0; row < 8; row++) {
        data[16 + row * 2] = 0xff;
        data[16 + row * 2 + 1] = 0xff;
      }
      const result = decodeTile(data, 16);

      for (let i = 0; i < 64; i++) {
        expect(result[i]).toBe(3);
      }
    });

    it('returns a Uint8Array of length 64', () => {
      const data = new Uint8Array(16);
      const result = decodeTile(data, 0);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(64);
    });
  });

  describe('parseTileBuffer', () => {
    it('parses an 8928-byte buffer into 558 tiles', () => {
      const buffer = new ArrayBuffer(8928);
      const tiles = parseTileBuffer(buffer);

      expect(tiles.length).toBe(558);
      expect(tiles[0]).toBeInstanceOf(Uint8Array);
      expect(tiles[0]!.length).toBe(64);
    });

    it('parses a single tile (16 bytes)', () => {
      const buffer = new ArrayBuffer(16);
      const view = new Uint8Array(buffer);
      for (let row = 0; row < 8; row++) {
        view[row * 2] = 0xff;
        view[row * 2 + 1] = 0x00;
      }
      const tiles = parseTileBuffer(buffer);

      expect(tiles.length).toBe(1);
      for (let i = 0; i < 64; i++) {
        expect(tiles[0]![i]).toBe(1);
      }
    });

    it('parses multiple tiles with different data', () => {
      const buffer = new ArrayBuffer(32); // 2 tiles
      const view = new Uint8Array(buffer);

      // Tile 0: all 1s
      for (let row = 0; row < 8; row++) {
        view[row * 2] = 0xff;
        view[row * 2 + 1] = 0x00;
      }
      // Tile 1: all 2s
      for (let row = 0; row < 8; row++) {
        view[16 + row * 2] = 0x00;
        view[16 + row * 2 + 1] = 0xff;
      }

      const tiles = parseTileBuffer(buffer);

      expect(tiles.length).toBe(2);
      expect(tiles[0]![0]).toBe(1);
      expect(tiles[1]![0]).toBe(2);
    });

    it('throws for buffer not divisible by 16', () => {
      const buffer = new ArrayBuffer(17);
      expect(() => parseTileBuffer(buffer)).toThrowError(
        /Buffer size 17 is not divisible by 16/
      );
    });

    it('throws for buffer of size 15', () => {
      const buffer = new ArrayBuffer(15);
      expect(() => parseTileBuffer(buffer)).toThrowError(
        /not divisible by 16/
      );
    });

    it('handles empty buffer (0 bytes)', () => {
      const buffer = new ArrayBuffer(0);
      const tiles = parseTileBuffer(buffer);
      expect(tiles.length).toBe(0);
    });
  });
});
