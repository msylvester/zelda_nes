import {
  DEFAULT_PALETTE,
  RED_PALETTE,
  BLUE_PALETTE,
  renderTileToCanvas,
} from '../../../src/assets/gbc/GbcPalette';
import type { GbcPalette } from '../../../src/assets/gbc/GbcPalette';

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

describe('GbcPalette', () => {
  describe('palette definitions', () => {
    it('DEFAULT_PALETTE has 4 entries', () => {
      expect(DEFAULT_PALETTE.length).toBe(4);
    });

    it('RED_PALETTE has 4 entries', () => {
      expect(RED_PALETTE.length).toBe(4);
    });

    it('BLUE_PALETTE has 4 entries', () => {
      expect(BLUE_PALETTE.length).toBe(4);
    });

    it('index 0 is transparent in all palettes', () => {
      for (const palette of [DEFAULT_PALETTE, RED_PALETTE, BLUE_PALETTE]) {
        const [, , , a] = palette[0];
        expect(a).toBe(0);
      }
    });

    it('indices 1-3 are fully opaque in all palettes', () => {
      for (const palette of [DEFAULT_PALETTE, RED_PALETTE, BLUE_PALETTE]) {
        for (let i = 1; i <= 3; i++) {
          const [, , , a] = palette[i] as [number, number, number, number];
          expect(a).toBe(255);
        }
      }
    });

    it('each RGBA tuple has 4 components in range 0-255', () => {
      for (const palette of [DEFAULT_PALETTE, RED_PALETTE, BLUE_PALETTE]) {
        for (const color of palette) {
          expect(color.length).toBe(4);
          for (const component of color) {
            expect(component).toBeGreaterThanOrEqual(0);
            expect(component).toBeLessThanOrEqual(255);
          }
        }
      }
    });
  });

  describe('renderTileToCanvas', () => {
    it('returns an 8x8 canvas', () => {
      const tile = new Uint8Array(64); // all index 0
      const canvas = renderTileToCanvas(tile, DEFAULT_PALETTE);
      expect(canvas.width).toBe(8);
      expect(canvas.height).toBe(8);
    });

    it('renders index 0 pixels as transparent', () => {
      const tile = new Uint8Array(64); // all index 0
      renderTileToCanvas(tile, DEFAULT_PALETTE);

      expect(mockCtx.putImageData).toHaveBeenCalledOnce();
      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };
      // Every pixel should have alpha = 0
      for (let i = 0; i < 64; i++) {
        expect(imageData.data[i * 4 + 3]).toBe(0);
      }
    });

    it('renders index 3 pixels with correct palette color', () => {
      const tile = new Uint8Array(64).fill(3); // all index 3
      renderTileToCanvas(tile, DEFAULT_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };
      const [r, g, b, a] = DEFAULT_PALETTE[3];
      for (let i = 0; i < 64; i++) {
        const offset = i * 4;
        expect(imageData.data[offset]).toBe(r);
        expect(imageData.data[offset + 1]).toBe(g);
        expect(imageData.data[offset + 2]).toBe(b);
        expect(imageData.data[offset + 3]).toBe(a);
      }
    });

    it('maps each color index to the correct palette entry', () => {
      const tile = new Uint8Array(64);
      // Set 4 pixels to different indices
      tile[0] = 0;
      tile[1] = 1;
      tile[2] = 2;
      tile[3] = 3;
      renderTileToCanvas(tile, DEFAULT_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };
      for (let idx = 0; idx < 4; idx++) {
        const [r, g, b, a] = DEFAULT_PALETTE[idx] as [number, number, number, number];
        const offset = idx * 4;
        expect(imageData.data[offset]).toBe(r);
        expect(imageData.data[offset + 1]).toBe(g);
        expect(imageData.data[offset + 2]).toBe(b);
        expect(imageData.data[offset + 3]).toBe(a);
      }
    });

    it('works with RED_PALETTE', () => {
      const tile = new Uint8Array(64).fill(1);
      renderTileToCanvas(tile, RED_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };
      const [r, g, b, a] = RED_PALETTE[1];
      expect(imageData.data[0]).toBe(r);
      expect(imageData.data[1]).toBe(g);
      expect(imageData.data[2]).toBe(b);
      expect(imageData.data[3]).toBe(a);
    });

    it('works with BLUE_PALETTE', () => {
      const tile = new Uint8Array(64).fill(2);
      renderTileToCanvas(tile, BLUE_PALETTE);

      const imageData = mockCtx.putImageData.mock.calls[0]![0] as { data: Uint8ClampedArray };
      const [r, g, b, a] = BLUE_PALETTE[2];
      expect(imageData.data[0]).toBe(r);
      expect(imageData.data[1]).toBe(g);
      expect(imageData.data[2]).toBe(b);
      expect(imageData.data[3]).toBe(a);
    });

    it('calls putImageData at position (0, 0)', () => {
      const tile = new Uint8Array(64);
      renderTileToCanvas(tile, DEFAULT_PALETTE);

      expect(mockCtx.putImageData).toHaveBeenCalledWith(expect.anything(), 0, 0);
    });
  });
});
