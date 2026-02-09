import { loadOracleSprites } from '../../../src/assets/gbc/GbcSpriteLoader';
import { SPRITE_FRAME_MAP } from '../../../src/assets/gbc/SpriteTileMapping';
import { ALL_ALIASES } from '../../../src/assets/gbc/SpriteAliasMap';

// Helper: create a valid 8928-byte buffer (558 tiles of 16 bytes each)
function makeValidBuffer(): ArrayBuffer {
  return new ArrayBuffer(8928);
}

// Mock canvas and 2D context for Node test environment
function createMockImageData(w: number, h: number) {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}

function createMockCtx() {
  return {
    createImageData: (w: number, h: number) => createMockImageData(w, h),
    putImageData: vi.fn(),
  };
}

function createMockCanvas() {
  return {
    width: 0,
    height: 0,
    getContext: (type: string) => {
      if (type !== '2d') return null;
      return createMockCtx();
    },
  };
}

const CHARACTER_NAMES = [
  'ganondorf', 'goron', 'marin', 'matty', 'piratian',
  'subrosian', 'tokay', 'vulpera', 'zoroark',
];

const FRAME_COUNT = Object.keys(SPRITE_FRAME_MAP).length;

/** Count the total gameplay alias keys generated for a set of loaded character names */
function countAliasKeys(loadedCharacters: string[]): number {
  let count = 0;
  for (const alias of ALL_ALIASES) {
    if (!loadedCharacters.includes(alias.oracleCharacter)) continue;
    for (const frameName of Object.keys(SPRITE_FRAME_MAP)) {
      count += alias.keyMapper(frameName).length;
    }
  }
  return count;
}

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag !== 'canvas') throw new Error(`Unexpected tag: ${tag}`);
      return createMockCanvas();
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GbcSpriteLoader', () => {
  describe('loadOracleSprites', () => {
    it('returns a map with entries for all 9 characters × all frames', async () => {
      const buffer = makeValidBuffer();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(buffer.slice(0)),
      }));

      const sprites = await loadOracleSprites();

      const oracleCount = CHARACTER_NAMES.length * FRAME_COUNT;
      const aliasCount = countAliasKeys(CHARACTER_NAMES);
      expect(sprites.size).toBe(oracleCount + aliasCount);
    });

    it('map keys follow oracle_{charName}_{frameName} pattern', async () => {
      const buffer = makeValidBuffer();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(buffer.slice(0)),
      }));

      const sprites = await loadOracleSprites();

      for (const charName of CHARACTER_NAMES) {
        for (const frameName of Object.keys(SPRITE_FRAME_MAP)) {
          const key = `oracle_${charName}_${frameName}`;
          expect(sprites.has(key)).toBe(true);
        }
      }
    });

    it('sprite values are canvas elements with 16x16 dimensions', async () => {
      const buffer = makeValidBuffer();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(buffer.slice(0)),
      }));

      const sprites = await loadOracleSprites();

      for (const canvas of sprites.values()) {
        expect(canvas.width).toBe(16);
        expect(canvas.height).toBe(16);
      }
    });

    it('fetches all 9 .bin files from the correct paths', async () => {
      const buffer = makeValidBuffer();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(buffer.slice(0)),
      });
      vi.stubGlobal('fetch', mockFetch);

      await loadOracleSprites();

      expect(mockFetch).toHaveBeenCalledTimes(9);
      for (const name of CHARACTER_NAMES) {
        expect(mockFetch).toHaveBeenCalledWith(`/sprites/oracles/${name}.bin`);
      }
    });

    it('skips a character on fetch failure and loads the rest', async () => {
      const buffer = makeValidBuffer();
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('ganondorf')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(buffer.slice(0)),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const sprites = await loadOracleSprites();

      // 8 characters loaded (ganondorf skipped)
      const loadedChars = CHARACTER_NAMES.filter(c => c !== 'ganondorf');
      const oracleCount = loadedChars.length * FRAME_COUNT;
      const aliasCount = countAliasKeys(loadedChars);
      expect(sprites.size).toBe(oracleCount + aliasCount);
      expect(warnSpy).toHaveBeenCalled();

      // No ganondorf oracle keys
      for (const key of sprites.keys()) {
        if (key.startsWith('oracle_')) {
          expect(key).not.toContain('ganondorf');
        }
      }
    });

    it('skips a character on HTTP error and loads the rest', async () => {
      const buffer = makeValidBuffer();
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('marin')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(buffer.slice(0)),
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const sprites = await loadOracleSprites();

      const loadedChars = CHARACTER_NAMES.filter(c => c !== 'marin');
      const oracleCount = loadedChars.length * FRAME_COUNT;
      const aliasCount = countAliasKeys(loadedChars);
      expect(sprites.size).toBe(oracleCount + aliasCount);
      expect(warnSpy).toHaveBeenCalled();

      // No marin oracle keys
      for (const key of sprites.keys()) {
        if (key.startsWith('oracle_')) {
          expect(key).not.toContain('marin');
        }
      }
    });

    it('returns empty map when all fetches fail', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('All down')));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const sprites = await loadOracleSprites();

      expect(sprites.size).toBe(0);
      expect(warnSpy).toHaveBeenCalledTimes(9);
    });
  });
});
