import { composeFrame } from '../../../src/assets/gbc/SpriteFrameComposer';
import { DEFAULT_PALETTE } from '../../../src/assets/gbc/GbcPalette';
import type { GbcPalette } from '../../../src/assets/gbc/GbcPalette';
import { SPRITE_FRAME_MAP } from '../../../src/assets/gbc/SpriteTileMapping';

// Mock canvas and 2D context for Node test environment
function createMockImageData(w: number, h: number) {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}

function createMockCtx() {
  const imageDataStore: { data: Uint8ClampedArray; x: number; y: number }[] = [];
  return {
    createImageData: (w: number, h: number) => createMockImageData(w, h),
    putImageData: vi.fn((imageData: { data: Uint8ClampedArray }, x: number, y: number) => {
      imageDataStore.push({ data: imageData.data, x, y });
    }),
    _imageDataStore: imageDataStore,
  };
}

let mockCtx: ReturnType<typeof createMockCtx>;

beforeEach(() => {
  mockCtx = createMockCtx();

  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag !== 'canvas') throw new Error(`Unexpected tag: ${tag}`);
      return {
        width: 0,
        height: 0,
        getContext: (type: string) => {
          if (type !== '2d') return null;
          return mockCtx;
        },
      };
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Helper: create a tile (Uint8Array of 64) filled with a single color index
function makeTile(colorIndex: number): Uint8Array {
  return new Uint8Array(64).fill(colorIndex);
}

describe('SpriteFrameComposer', () => {
  describe('composeFrame', () => {
    it('returns a 16x16 canvas', () => {
      const tiles = [makeTile(0), makeTile(0), makeTile(0), makeTile(0)];
      const canvas = composeFrame(tiles, [0, 1, 2, 3], DEFAULT_PALETTE);
      expect(canvas.width).toBe(16);
      expect(canvas.height).toBe(16);
    });

    it('calls putImageData at position (0, 0)', () => {
      const tiles = [makeTile(0), makeTile(0), makeTile(0), makeTile(0)];
      composeFrame(tiles, [0, 1, 2, 3], DEFAULT_PALETTE);
      expect(mockCtx.putImageData).toHaveBeenCalledWith(expect.anything(), 0, 0);
    });

    it('places top-left tile in the top-left quadrant', () => {
      // tile 0 = all color index 1, tiles 1-3 = all color index 0
      const tiles = [makeTile(1), makeTile(0), makeTile(0), makeTile(0)];
      composeFrame(tiles, [0, 1, 2, 3], DEFAULT_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };
      const [r, g, b, a] = DEFAULT_PALETTE[1];

      // Check pixel (0, 0) - top-left quadrant
      expect(imageData.data[0]).toBe(r);
      expect(imageData.data[1]).toBe(g);
      expect(imageData.data[2]).toBe(b);
      expect(imageData.data[3]).toBe(a);

      // Check pixel (7, 7) - last pixel of top-left quadrant
      const offset77 = (7 * 16 + 7) * 4;
      expect(imageData.data[offset77]).toBe(r);
      expect(imageData.data[offset77 + 3]).toBe(a);
    });

    it('places top-right tile in the top-right quadrant', () => {
      // tile 1 = all color index 2, rest = index 0
      const tiles = [makeTile(0), makeTile(2), makeTile(0), makeTile(0)];
      composeFrame(tiles, [0, 1, 2, 3], DEFAULT_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };
      const [r, g, b, a] = DEFAULT_PALETTE[2];

      // Check pixel (8, 0) - first pixel of top-right quadrant
      const offset80 = (0 * 16 + 8) * 4;
      expect(imageData.data[offset80]).toBe(r);
      expect(imageData.data[offset80 + 1]).toBe(g);
      expect(imageData.data[offset80 + 2]).toBe(b);
      expect(imageData.data[offset80 + 3]).toBe(a);
    });

    it('places bottom-left tile in the bottom-left quadrant', () => {
      const tiles = [makeTile(0), makeTile(0), makeTile(3), makeTile(0)];
      composeFrame(tiles, [0, 1, 2, 3], DEFAULT_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };
      const [r, g, b, a] = DEFAULT_PALETTE[3];

      // Check pixel (0, 8) - first pixel of bottom-left quadrant
      const offset08 = (8 * 16 + 0) * 4;
      expect(imageData.data[offset08]).toBe(r);
      expect(imageData.data[offset08 + 1]).toBe(g);
      expect(imageData.data[offset08 + 2]).toBe(b);
      expect(imageData.data[offset08 + 3]).toBe(a);
    });

    it('places bottom-right tile in the bottom-right quadrant', () => {
      const tiles = [makeTile(0), makeTile(0), makeTile(0), makeTile(1)];
      composeFrame(tiles, [0, 1, 2, 3], DEFAULT_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };
      const [r, g, b, a] = DEFAULT_PALETTE[1];

      // Check pixel (8, 8) - first pixel of bottom-right quadrant
      const offset88 = (8 * 16 + 8) * 4;
      expect(imageData.data[offset88]).toBe(r);
      expect(imageData.data[offset88 + 1]).toBe(g);
      expect(imageData.data[offset88 + 2]).toBe(b);
      expect(imageData.data[offset88 + 3]).toBe(a);
    });

    it('composes 4 differently-colored tiles correctly', () => {
      const tiles = [makeTile(0), makeTile(1), makeTile(2), makeTile(3)];
      composeFrame(tiles, [0, 1, 2, 3], DEFAULT_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };

      // Top-left (0,0) should be transparent (index 0)
      expect(imageData.data[3]).toBe(0); // alpha = 0

      // Top-right (8,0) should be color 1
      const trOffset = (0 * 16 + 8) * 4;
      expect(imageData.data[trOffset + 3]).toBe(255);

      // Bottom-left (0,8) should be color 2
      const blOffset = (8 * 16 + 0) * 4;
      expect(imageData.data[blOffset + 3]).toBe(255);

      // Bottom-right (8,8) should be color 3
      const brOffset = (8 * 16 + 8) * 4;
      expect(imageData.data[brOffset + 3]).toBe(255);
    });

    it('throws when tile index is out of range', () => {
      const tiles = [makeTile(0), makeTile(0)]; // only 2 tiles
      expect(() => composeFrame(tiles, [0, 1, 2, 3], DEFAULT_PALETTE)).toThrowError(
        /Tile index 2 out of range/
      );
    });

    it('uses tile indices to select from tiles array (non-sequential)', () => {
      // 5 tiles total, but only use indices 1 and 4
      const tiles = [makeTile(0), makeTile(1), makeTile(0), makeTile(0), makeTile(3)];
      composeFrame(tiles, [1, 4, 1, 4], DEFAULT_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };

      // Top-left and bottom-left should be color 1
      const [r1, g1, b1] = DEFAULT_PALETTE[1];
      expect(imageData.data[0]).toBe(r1);
      expect(imageData.data[1]).toBe(g1);
      expect(imageData.data[2]).toBe(b1);

      // Top-right and bottom-right should be color 3
      const trOffset = (0 * 16 + 8) * 4;
      const [r3, g3, b3] = DEFAULT_PALETTE[3];
      expect(imageData.data[trOffset]).toBe(r3);
      expect(imageData.data[trOffset + 1]).toBe(g3);
      expect(imageData.data[trOffset + 2]).toBe(b3);
    });
  });

  describe('SpriteTileMapping', () => {
    it('SPRITE_FRAME_MAP includes all 8 walk frames', () => {
      const requiredFrames = [
        'walk_down_1', 'walk_down_2',
        'walk_up_1', 'walk_up_2',
        'walk_left_1', 'walk_left_2',
        'walk_right_1', 'walk_right_2',
      ];
      for (const frame of requiredFrames) {
        expect(SPRITE_FRAME_MAP[frame]).toBeDefined();
      }
    });

    it('each frame mapping has exactly 4 tile indices', () => {
      for (const [, indices] of Object.entries(SPRITE_FRAME_MAP)) {
        expect(indices.length).toBe(4);
      }
    });

    it('all tile indices are non-negative integers', () => {
      for (const [, indices] of Object.entries(SPRITE_FRAME_MAP)) {
        for (const idx of indices) {
          expect(Number.isInteger(idx)).toBe(true);
          expect(idx).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('all tile indices are within 558-tile range', () => {
      for (const [, indices] of Object.entries(SPRITE_FRAME_MAP)) {
        for (const idx of indices) {
          expect(idx).toBeLessThan(558);
        }
      }
    });
  });
});
