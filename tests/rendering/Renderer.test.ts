import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { Renderer, type RenderFrame } from '../../src/rendering/Renderer';
import { SCREEN_WIDTH, SCREEN_HEIGHT, CANVAS_SCALE, HUD_HEIGHT } from '../../src/constants';
import type { GeneratedAssets, SpriteKey, TileKey } from '../../src/assets/AssetGenerator';
import type { SpriteRenderCommand } from '../../src/types';

// Mock canvas and context for Node.js environment
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  imageSmoothingEnabled = true;
  canvas: MockCanvas;

  constructor(canvas: MockCanvas) {
    this.canvas = canvas;
  }

  clearRect = vi.fn();
  fillRect = vi.fn();
  strokeRect = vi.fn();
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  closePath = vi.fn();
  fill = vi.fn();
  stroke = vi.fn();
  drawImage = vi.fn();
  save = vi.fn();
  restore = vi.fn();
  translate = vi.fn();
  scale = vi.fn();
  rect = vi.fn();
  clip = vi.fn();
  arc = vi.fn();
}

class MockCanvas {
  width = 0;
  height = 0;
  style: Record<string, string> = {};
  private ctx: MockCanvasRenderingContext2D;

  constructor() {
    this.ctx = new MockCanvasRenderingContext2D(this);
  }

  getContext(type: string): MockCanvasRenderingContext2D | null {
    if (type === '2d') {
      return this.ctx;
    }
    return null;
  }

  toDataURL = vi.fn(() => 'data:image/png;base64,mockdata');
}

// Create mock assets
function createMockAssets(): GeneratedAssets {
  const sprites = new Map<SpriteKey, HTMLCanvasElement>();
  const tiles = new Map<TileKey, HTMLCanvasElement>();

  // Add some mock sprites
  const mockSprite = new MockCanvas() as unknown as HTMLCanvasElement;
  mockSprite.width = 16;
  mockSprite.height = 16;
  sprites.set('link_down_1', mockSprite);
  sprites.set('link_up_1', mockSprite);
  sprites.set('enemy_octorok_red_1', mockSprite);

  // Add some mock tiles
  const mockTile = new MockCanvas() as unknown as HTMLCanvasElement;
  mockTile.width = 16;
  mockTile.height = 16;
  tiles.set('tile_grass', mockTile);
  tiles.set('tile_rock', mockTile);
  tiles.set('tile_dungeon_floor', mockTile);

  return {
    sprites,
    tiles,
    ready: true,
  };
}

beforeAll(() => {
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return new MockCanvas();
      }
      return null;
    },
  });
});

describe('Renderer', () => {
  let canvas: MockCanvas;
  let assets: GeneratedAssets;
  let renderer: Renderer;

  beforeEach(() => {
    canvas = new MockCanvas();
    assets = createMockAssets();
    renderer = new Renderer({
      canvas: canvas as unknown as HTMLCanvasElement,
      assets,
    });
  });

  describe('initialization', () => {
    it('should set canvas dimensions to NES resolution', () => {
      expect(canvas.width).toBe(SCREEN_WIDTH);
      expect(canvas.height).toBe(SCREEN_HEIGHT);
    });

    it('should set canvas CSS scale', () => {
      expect(canvas.style.width).toBe(`${SCREEN_WIDTH * CANVAS_SCALE}px`);
      expect(canvas.style.height).toBe(`${SCREEN_HEIGHT * CANVAS_SCALE}px`);
    });

    it('should disable image smoothing for pixelated rendering', () => {
      const ctx = renderer.getContext();
      expect(ctx.imageSmoothingEnabled).toBe(false);
    });

    it('should throw error if canvas context is null', () => {
      const badCanvas = {
        getContext: () => null,
      } as unknown as HTMLCanvasElement;

      expect(() => {
        new Renderer({ canvas: badCanvas, assets });
      }).toThrow('Failed to get 2D rendering context');
    });
  });

  describe('clear()', () => {
    it('should fill entire screen with black', () => {
      renderer.clear();
      const ctx = renderer.getContext() as unknown as MockCanvasRenderingContext2D;
      expect(ctx.fillStyle).toBe('#000000');
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    });
  });

  describe('render()', () => {
    it('should clear screen to black', () => {
      const frame: RenderFrame = {};
      renderer.render(frame);
      const ctx = renderer.getContext() as unknown as MockCanvasRenderingContext2D;
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    });

    it('should render tiles when provided', () => {
      const tiles = new Array(176).fill(0); // 16x11 = 176 tiles
      const frame: RenderFrame = { tiles };
      renderer.render(frame);
      const ctx = renderer.getContext() as unknown as MockCanvasRenderingContext2D;
      // Should draw tiles (at least one drawImage call for tile)
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should render sprites when provided', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'link_down_1',
          x: 100,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 3,
          visible: true,
        },
      ];
      const frame: RenderFrame = { sprites };
      renderer.render(frame);
      const ctx = renderer.getContext() as unknown as MockCanvasRenderingContext2D;
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should apply scroll offset when provided', () => {
      const frame: RenderFrame = {
        scrollOffset: { x: 10, y: 20 },
        tiles: new Array(176).fill(0),
      };
      renderer.render(frame);
      const ctx = renderer.getContext() as unknown as MockCanvasRenderingContext2D;
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(10, 20);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('should render flash effect when intensity > 0', () => {
      const frame: RenderFrame = { flashIntensity: 0.5 };
      renderer.render(frame);
      const ctx = renderer.getContext() as unknown as MockCanvasRenderingContext2D;
      // Flash renders white overlay
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should render fade effect when alpha > 0', () => {
      const frame: RenderFrame = { fadeAlpha: 0.5 };
      renderer.render(frame);
      const ctx = renderer.getContext() as unknown as MockCanvasRenderingContext2D;
      // Fade renders colored overlay
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should not render flash when intensity is 0', () => {
      const ctx = renderer.getContext() as unknown as MockCanvasRenderingContext2D;
      ctx.fillRect.mockClear();

      const frame: RenderFrame = { flashIntensity: 0 };
      renderer.render(frame);
      // Only the clear() call should happen
      expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    });
  });

  describe('renderPlayArea()', () => {
    it('should clip to play area', () => {
      const frame: RenderFrame = { tiles: new Array(176).fill(0) };
      renderer.renderPlayArea(frame);
      const ctx = renderer.getContext() as unknown as MockCanvasRenderingContext2D;
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.rect).toHaveBeenCalledWith(0, HUD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT - HUD_HEIGHT);
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should return the context', () => {
      expect(renderer.getContext()).toBeDefined();
    });

    it('should return the canvas', () => {
      expect(renderer.getCanvas()).toBe(canvas);
    });

    it('should return the tile renderer', () => {
      expect(renderer.getTileRenderer()).toBeDefined();
    });

    it('should return the sprite renderer', () => {
      expect(renderer.getSpriteRenderer()).toBeDefined();
    });

    it('should return the effect renderer', () => {
      expect(renderer.getEffectRenderer()).toBeDefined();
    });
  });

  describe('screenshot()', () => {
    it('should return a data URL', () => {
      const dataUrl = renderer.screenshot();
      expect(dataUrl).toBe('data:image/png;base64,mockdata');
    });
  });
});
