import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EffectRenderer } from '../../src/rendering/EffectRenderer';
import { SCREEN_WIDTH, SCREEN_HEIGHT, HUD_HEIGHT } from '../../src/constants';

// Mock canvas context
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;

  clearRect = vi.fn();
  fillRect = vi.fn();
  strokeRect = vi.fn();
  save = vi.fn();
  restore = vi.fn();
  beginPath = vi.fn();
  rect = vi.fn();
  arc = vi.fn();
  closePath = vi.fn();
  fill = vi.fn();
}

describe('EffectRenderer', () => {
  let ctx: MockCanvasRenderingContext2D;
  let effectRenderer: EffectRenderer;

  beforeEach(() => {
    ctx = new MockCanvasRenderingContext2D();
    effectRenderer = new EffectRenderer(
      ctx as unknown as CanvasRenderingContext2D
    );
  });

  describe('renderFlash()', () => {
    it('should render white flash at full intensity', () => {
      effectRenderer.renderFlash(1);
      expect(ctx.fillStyle).toBe('rgba(255, 255, 255, 1)');
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    });

    it('should render flash at partial intensity', () => {
      effectRenderer.renderFlash(0.5);
      expect(ctx.fillStyle).toBe('rgba(255, 255, 255, 0.5)');
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should not render flash when intensity is 0', () => {
      effectRenderer.renderFlash(0);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('should not render flash when intensity is negative', () => {
      effectRenderer.renderFlash(-0.5);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('should clamp intensity to max 1', () => {
      effectRenderer.renderFlash(2);
      expect(ctx.fillStyle).toBe('rgba(255, 255, 255, 1)');
    });
  });

  describe('renderFade()', () => {
    it('should render black fade by default', () => {
      effectRenderer.renderFade(1);
      expect(ctx.fillStyle).toBe('rgba(0, 0, 0, 1)');
      expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    });

    it('should render fade at partial alpha', () => {
      effectRenderer.renderFade(0.5);
      expect(ctx.fillStyle).toBe('rgba(0, 0, 0, 0.5)');
    });

    it('should render custom color fade', () => {
      effectRenderer.renderFade(0.5, '#FF0000');
      expect(ctx.fillStyle).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should handle shorthand hex colors', () => {
      effectRenderer.renderFade(1, '#F00');
      expect(ctx.fillStyle).toBe('rgba(255, 0, 0, 1)');
    });

    it('should not render fade when alpha is 0', () => {
      effectRenderer.renderFade(0);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('should clamp alpha to max 1', () => {
      effectRenderer.renderFade(1.5);
      expect(ctx.fillStyle).toBe('rgba(0, 0, 0, 1)');
    });
  });

  describe('renderPlayAreaFade()', () => {
    it('should render fade only in play area', () => {
      effectRenderer.renderPlayAreaFade(1);
      expect(ctx.fillRect).toHaveBeenCalledWith(
        0,
        HUD_HEIGHT,
        SCREEN_WIDTH,
        SCREEN_HEIGHT - HUD_HEIGHT
      );
    });

    it('should not render when alpha is 0', () => {
      effectRenderer.renderPlayAreaFade(0);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('renderColumnWipe()', () => {
    it('should not render when progress is 0', () => {
      effectRenderer.renderColumnWipe(0);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('should render column wipe at partial progress', () => {
      effectRenderer.renderColumnWipe(0.5);
      // Should draw two rectangles (left and right)
      expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    });

    it('should render column wipe at full progress', () => {
      effectRenderer.renderColumnWipe(1);
      expect(ctx.fillRect).toHaveBeenCalledTimes(2);
      // Each wipe should be half the screen width
      const leftCall = ctx.fillRect.mock.calls[0];
      const rightCall = ctx.fillRect.mock.calls[1];
      expect(leftCall[0]).toBe(0); // Left starts at 0
      expect(leftCall[2]).toBe(SCREEN_WIDTH / 2); // Width = half screen
      expect(rightCall[0]).toBe(SCREEN_WIDTH / 2); // Right starts at midpoint
      expect(rightCall[2]).toBe(SCREEN_WIDTH / 2); // Width = half screen
    });

    it('should handle reverse wipe (revealing)', () => {
      effectRenderer.renderColumnWipe(1, true);
      // At progress=1 with reverse=true, effective progress is 0
      expect(ctx.fillRect).not.toHaveBeenCalled();

      ctx.fillRect.mockClear();
      effectRenderer.renderColumnWipe(0, true);
      // At progress=0 with reverse=true, effective progress is 1
      expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    });

    it('should only affect play area (below HUD)', () => {
      effectRenderer.renderColumnWipe(0.5);
      const leftCall = ctx.fillRect.mock.calls[0];
      expect(leftCall[1]).toBe(HUD_HEIGHT); // y starts at HUD
      expect(leftCall[3]).toBe(SCREEN_HEIGHT - HUD_HEIGHT); // Height = play area
    });
  });

  describe('renderRowWipe()', () => {
    it('should not render when progress is 0', () => {
      effectRenderer.renderRowWipe(0);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('should render row wipe at partial progress', () => {
      effectRenderer.renderRowWipe(0.5);
      // Should draw two rectangles (top and bottom)
      expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    });

    it('should render row wipe at full progress', () => {
      effectRenderer.renderRowWipe(1);
      const playAreaHeight = SCREEN_HEIGHT - HUD_HEIGHT;
      const topCall = ctx.fillRect.mock.calls[0];
      const bottomCall = ctx.fillRect.mock.calls[1];
      expect(topCall[3]).toBe(playAreaHeight / 2); // Height = half play area
      expect(bottomCall[3]).toBe(playAreaHeight / 2);
    });

    it('should handle reverse row wipe', () => {
      effectRenderer.renderRowWipe(1, true);
      // At progress=1 with reverse=true, effective progress is 0
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('renderDamageFlash()', () => {
    it('should render red tinted flash', () => {
      effectRenderer.renderDamageFlash(1);
      // Damage flash uses 50% of the intensity for the red tint
      expect(ctx.fillStyle).toBe('rgba(255, 0, 0, 0.5)');
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should not render when intensity is 0', () => {
      effectRenderer.renderDamageFlash(0);
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });

    it('should scale with intensity', () => {
      effectRenderer.renderDamageFlash(0.5);
      expect(ctx.fillStyle).toBe('rgba(255, 0, 0, 0.25)');
    });
  });

  describe('isFlashVisible()', () => {
    it('should return true at frame 0', () => {
      expect(effectRenderer.isFlashVisible(0)).toBe(true);
    });

    it('should return true for frames 0-3 (default interval 4)', () => {
      expect(effectRenderer.isFlashVisible(0)).toBe(true);
      expect(effectRenderer.isFlashVisible(1)).toBe(true);
      expect(effectRenderer.isFlashVisible(2)).toBe(true);
      expect(effectRenderer.isFlashVisible(3)).toBe(true);
    });

    it('should return false for frames 4-7', () => {
      expect(effectRenderer.isFlashVisible(4)).toBe(false);
      expect(effectRenderer.isFlashVisible(5)).toBe(false);
      expect(effectRenderer.isFlashVisible(6)).toBe(false);
      expect(effectRenderer.isFlashVisible(7)).toBe(false);
    });

    it('should return true for frames 8-11', () => {
      expect(effectRenderer.isFlashVisible(8)).toBe(true);
      expect(effectRenderer.isFlashVisible(9)).toBe(true);
      expect(effectRenderer.isFlashVisible(10)).toBe(true);
      expect(effectRenderer.isFlashVisible(11)).toBe(true);
    });

    it('should respect custom flash interval', () => {
      expect(effectRenderer.isFlashVisible(0, 2)).toBe(true);
      expect(effectRenderer.isFlashVisible(1, 2)).toBe(true);
      expect(effectRenderer.isFlashVisible(2, 2)).toBe(false);
      expect(effectRenderer.isFlashVisible(3, 2)).toBe(false);
      expect(effectRenderer.isFlashVisible(4, 2)).toBe(true);
    });
  });

  describe('renderIrisWipe()', () => {
    it('should render iris effect', () => {
      effectRenderer.renderIrisWipe(0.5);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.rect).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalledWith('evenodd');
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('should use custom center position', () => {
      effectRenderer.renderIrisWipe(0.5, 50, 100);
      expect(ctx.arc).toHaveBeenCalledWith(
        50,
        100,
        expect.any(Number),
        0,
        Math.PI * 2,
        true
      );
    });

    it('should clamp progress', () => {
      effectRenderer.renderIrisWipe(-0.5);
      // Should still render with clamped progress of 0
      expect(ctx.arc).toHaveBeenCalled();
    });
  });

  describe('clearEffects()', () => {
    it('should not throw', () => {
      expect(() => effectRenderer.clearEffects()).not.toThrow();
    });
  });
});
