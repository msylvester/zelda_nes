import { loadNesLinkSprites } from '../../../src/assets/nes/NesSpriteSheetLoader';
import { ATLAS_SPRITE_COUNT } from '../../../src/assets/nes/SpriteAtlas';

// ── Mock helpers ─────────────────────────────────────────────────────────────

function createMockImageData(w: number, h: number) {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}

function createMockCtx() {
  return {
    drawImage: vi.fn(),
    getImageData: (x: number, y: number, w: number, h: number) =>
      createMockImageData(w, h),
    putImageData: vi.fn(),
    imageSmoothingEnabled: true,
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

/**
 * Mock Image that fires onload synchronously after src is set.
 * This simulates a successful image load.
 */
function createMockImage(shouldLoad: boolean) {
  const img = {
    src: '',
    width: 2216,
    height: 1664,
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };

  // Fire the appropriate callback on next microtask after src is set
  Object.defineProperty(img, 'src', {
    set(value: string) {
      img._src = value;
      setTimeout(() => {
        if (shouldLoad && img.onload) {
          img.onload();
        } else if (!shouldLoad && img.onerror) {
          img.onerror();
        }
      }, 0);
    },
    get() {
      return img._src || '';
    },
  });

  return img;
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag !== 'canvas') throw new Error(`Unexpected tag: ${tag}`);
      return createMockCanvas();
    },
  });

  vi.stubGlobal('Image', class {
    src = '';
    width = 2216;
    height = 1664;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor() {
      const self = this;
      Object.defineProperty(this, 'src', {
        set(value: string) {
          self._src = value;
          setTimeout(() => {
            if (self.onload) self.onload();
          }, 0);
        },
        get() {
          return self._src || '';
        },
      });
    }

    private _src = '';
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('NesSpriteSheetLoader', () => {
  describe('loadNesLinkSprites', () => {
    it('returns a map with entries for all atlas sprites + aliases', async () => {
      const sprites = await loadNesLinkSprites();

      // Atlas sprites + attack aliases (4) + boomerang alias (1)
      const expectedAliases = 5;
      expect(sprites.size).toBe(ATLAS_SPRITE_COUNT + expectedAliases);
    });

    it('sprite canvases have correct dimensions from atlas', async () => {
      const sprites = await loadNesLinkSprites();

      // 16×16 character sprite
      const linkDown = sprites.get('link_down_1');
      expect(linkDown).toBeDefined();
      expect(linkDown?.width).toBe(16);
      expect(linkDown?.height).toBe(16);

      // 8×8 projectile sprite
      const swordBeam = sprites.get('sword_beam');
      expect(swordBeam).toBeDefined();
      expect(swordBeam?.width).toBe(8);
      expect(swordBeam?.height).toBe(8);
    });

    it('registers attack aliases for backwards compatibility', async () => {
      const sprites = await loadNesLinkSprites();

      // Existing AnimationData uses link_attack_{dir}
      expect(sprites.has('link_attack_down')).toBe(true);
      expect(sprites.has('link_attack_up')).toBe(true);
      expect(sprites.has('link_attack_left')).toBe(true);
      expect(sprites.has('link_attack_right')).toBe(true);
    });

    it('registers boomerang alias for backwards compatibility', async () => {
      const sprites = await loadNesLinkSprites();
      expect(sprites.has('projectile_boomerang')).toBe(true);
    });

    it('returns empty map when image fails to load', async () => {
      // Override Image to fail
      vi.stubGlobal('Image', class {
        src = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
          const self = this;
          Object.defineProperty(this, 'src', {
            set(_value: string) {
              setTimeout(() => {
                if (self.onerror) self.onerror();
              }, 0);
            },
            get() { return ''; },
          });
        }
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const sprites = await loadNesLinkSprites();

      expect(sprites.size).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
