import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpriteRenderer } from '../../src/rendering/SpriteRenderer';
import { HUD_HEIGHT } from '../../src/constants';
import type { GeneratedAssets, SpriteKey } from '../../src/assets/AssetGenerator';
import type { SpriteRenderCommand } from '../../src/types';

// Mock canvas and context
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;

  clearRect = vi.fn();
  fillRect = vi.fn();
  strokeRect = vi.fn();
  drawImage = vi.fn();
  save = vi.fn();
  restore = vi.fn();
  translate = vi.fn();
  scale = vi.fn();
}

class MockCanvas {
  width = 16;
  height = 16;
}

function createMockAssets(): GeneratedAssets {
  const sprites = new Map<SpriteKey, HTMLCanvasElement>();
  const tiles = new Map();

  // Add mock sprites
  const mockSprite = new MockCanvas() as unknown as HTMLCanvasElement;
  sprites.set('link_down_1', mockSprite);
  sprites.set('link_down_2', mockSprite);
  sprites.set('link_up_1', mockSprite);
  sprites.set('link_attack_down', mockSprite);
  sprites.set('enemy_octorok_red_1', mockSprite);
  sprites.set('item_heart', mockSprite);
  sprites.set('projectile_rock', mockSprite);
  sprites.set('sword_down', mockSprite);

  return {
    sprites,
    tiles,
    ready: true,
  };
}

describe('SpriteRenderer', () => {
  let ctx: MockCanvasRenderingContext2D;
  let assets: GeneratedAssets;
  let spriteRenderer: SpriteRenderer;

  beforeEach(() => {
    ctx = new MockCanvasRenderingContext2D();
    assets = createMockAssets();
    spriteRenderer = new SpriteRenderer(
      ctx as unknown as CanvasRenderingContext2D,
      assets
    );
  });

  describe('render()', () => {
    it('should render nothing for empty array', () => {
      spriteRenderer.render([]);
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it('should render a single visible sprite', () => {
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
      spriteRenderer.render(sprites);
      expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    });

    it('should not render invisible sprites', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'link_down_1',
          x: 100,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 3,
          visible: false,
        },
      ];
      spriteRenderer.render(sprites);
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it('should render multiple sprites', () => {
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
        {
          spriteKey: 'enemy_octorok_red_1',
          x: 150,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 2,
          visible: true,
        },
      ];
      spriteRenderer.render(sprites);
      expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    });

    it('should render sprites sorted by priority (low to high)', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'link_down_1',
          x: 100,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 5,
          visible: true,
        },
        {
          spriteKey: 'enemy_octorok_red_1',
          x: 150,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 2,
          visible: true,
        },
      ];
      spriteRenderer.render(sprites);

      // Enemy (priority 2) should render before Link (priority 5)
      const calls = ctx.drawImage.mock.calls;
      expect(calls.length).toBe(2);
      // First call should be enemy sprite (at 150, 100 + HUD)
      expect(calls[0][1]).toBe(150);
      // Second call should be Link sprite (at 100, 100 + HUD)
      expect(calls[1][1]).toBe(100);
    });

    it('should offset Y position by HUD height', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'link_down_1',
          x: 100,
          y: 50,
          flipX: false,
          flipY: false,
          priority: 3,
          visible: true,
        },
      ];
      spriteRenderer.render(sprites);
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        100,
        50 + HUD_HEIGHT
      );
    });

    it('should floor sprite positions', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'link_down_1',
          x: 100.7,
          y: 50.3,
          flipX: false,
          flipY: false,
          priority: 3,
          visible: true,
        },
      ];
      spriteRenderer.render(sprites);
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        100,
        50 + HUD_HEIGHT
      );
    });
  });

  describe('sprite flipping', () => {
    it('should handle horizontal flip', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'link_down_1',
          x: 100,
          y: 100,
          flipX: true,
          flipY: false,
          priority: 3,
          visible: true,
        },
      ];
      spriteRenderer.render(sprites);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('should handle vertical flip', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'link_down_1',
          x: 100,
          y: 100,
          flipX: false,
          flipY: true,
          priority: 3,
          visible: true,
        },
      ];
      spriteRenderer.render(sprites);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.scale).toHaveBeenCalledWith(1, -1);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('should handle both flips', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'link_down_1',
          x: 100,
          y: 100,
          flipX: true,
          flipY: true,
          priority: 3,
          visible: true,
        },
      ];
      spriteRenderer.render(sprites);
      expect(ctx.scale).toHaveBeenCalledWith(-1, -1);
    });

    it('should not use save/restore for non-flipped sprites', () => {
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
      spriteRenderer.render(sprites);
      expect(ctx.save).not.toHaveBeenCalled();
      expect(ctx.restore).not.toHaveBeenCalled();
    });
  });

  describe('fallback rendering', () => {
    it('should render fallback for missing sprites', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'nonexistent_sprite',
          x: 100,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 3,
          visible: true,
        },
      ];
      spriteRenderer.render(sprites);
      // Should use fillRect for fallback
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should use green color for link sprites fallback', () => {
      const emptyAssets: GeneratedAssets = {
        sprites: new Map(),
        tiles: new Map(),
        ready: true,
      };
      const renderer = new SpriteRenderer(
        ctx as unknown as CanvasRenderingContext2D,
        emptyAssets
      );

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
      renderer.render(sprites);
      expect(ctx.fillStyle).toBe('#228B22'); // Green
    });

    it('should use red color for enemy sprites fallback', () => {
      const emptyAssets: GeneratedAssets = {
        sprites: new Map(),
        tiles: new Map(),
        ready: true,
      };
      const renderer = new SpriteRenderer(
        ctx as unknown as CanvasRenderingContext2D,
        emptyAssets
      );

      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'enemy_something',
          x: 100,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 3,
          visible: true,
        },
      ];
      renderer.render(sprites);
      expect(ctx.fillStyle).toBe('#CD5C5C'); // Red
    });
  });

  describe('renderByPriorityRange()', () => {
    it('should only render sprites within priority range', () => {
      const sprites: SpriteRenderCommand[] = [
        {
          spriteKey: 'link_down_1',
          x: 100,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 1,
          visible: true,
        },
        {
          spriteKey: 'enemy_octorok_red_1',
          x: 150,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 3,
          visible: true,
        },
        {
          spriteKey: 'item_heart',
          x: 200,
          y: 100,
          flipX: false,
          flipY: false,
          priority: 5,
          visible: true,
        },
      ];
      spriteRenderer.renderByPriorityRange(sprites, 2, 4);
      // Only enemy should render (priority 3 is in range 2-4)
      expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    });
  });

  describe('renderAt()', () => {
    it('should render sprite at exact screen position', () => {
      spriteRenderer.renderAt('link_down_1', 50, 100);
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        50,
        100
      );
    });

    it('should handle flipping in renderAt', () => {
      spriteRenderer.renderAt('link_down_1', 50, 100, true, false);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.scale).toHaveBeenCalledWith(-1, 1);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('should render fallback for missing sprite in renderAt', () => {
      spriteRenderer.renderAt('nonexistent', 50, 100);
      expect(ctx.fillRect).toHaveBeenCalledWith(50, 100, 16, 16);
    });
  });

  describe('getSpriteSize()', () => {
    it('should return sprite dimensions', () => {
      const size = spriteRenderer.getSpriteSize('link_down_1');
      expect(size).toEqual({ width: 16, height: 16 });
    });

    it('should return null for missing sprite', () => {
      const size = spriteRenderer.getSpriteSize('nonexistent');
      expect(size).toBeNull();
    });
  });

  describe('hasSprite()', () => {
    it('should return true for existing sprites', () => {
      expect(spriteRenderer.hasSprite('link_down_1')).toBe(true);
    });

    it('should return false for missing sprites', () => {
      expect(spriteRenderer.hasSprite('nonexistent')).toBe(false);
    });
  });
});
