// EffectRenderer.ts - Screen effects (flash, fade, wipe)
// Handles visual effects like screen flash on damage and fade transitions

import { SCREEN_WIDTH, SCREEN_HEIGHT, HUD_HEIGHT } from '../constants';

/**
 * Renders screen effects like flash and fade
 * These effects are rendered on top of all other content
 */
export class EffectRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * Renders a screen flash effect (damage feedback, etc.)
   * @param intensity Flash intensity from 0 (none) to 1 (full white)
   */
  renderFlash(intensity: number): void {
    if (intensity <= 0) return;

    const clampedIntensity = Math.min(1, Math.max(0, intensity));

    this.ctx.fillStyle = `rgba(255, 255, 255, ${clampedIntensity})`;
    this.ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  /**
   * Renders a screen fade effect
   * @param alpha Fade alpha from 0 (fully visible) to 1 (fully black/colored)
   * @param color Fade color (default black)
   */
  renderFade(alpha: number, color: string = '#000000'): void {
    if (alpha <= 0) return;

    const clampedAlpha = Math.min(1, Math.max(0, alpha));

    // Parse color to RGB
    const rgb = this.parseColor(color);

    this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
    this.ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  /**
   * Renders a fade effect only on the play area (not the HUD)
   * @param alpha Fade alpha from 0 to 1
   * @param color Fade color (default black)
   */
  renderPlayAreaFade(alpha: number, color: string = '#000000'): void {
    if (alpha <= 0) return;

    const clampedAlpha = Math.min(1, Math.max(0, alpha));
    const rgb = this.parseColor(color);

    this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
    this.ctx.fillRect(0, HUD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT - HUD_HEIGHT);
  }

  /**
   * Renders a column wipe effect (used for dungeon transitions)
   * Draws black columns from edges towards center
   * @param progress Wipe progress from 0 (none) to 1 (fully covered)
   * @param reverse If true, wipes from center to edges (revealing)
   */
  renderColumnWipe(progress: number, reverse: boolean = false): void {
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const effectiveProgress = reverse ? 1 - clampedProgress : clampedProgress;

    // Wipe covers from edges to center
    const wipeWidth = Math.floor((SCREEN_WIDTH / 2) * effectiveProgress);

    if (wipeWidth <= 0) return;

    this.ctx.fillStyle = '#000000';
    // Left side
    this.ctx.fillRect(0, HUD_HEIGHT, wipeWidth, SCREEN_HEIGHT - HUD_HEIGHT);
    // Right side
    this.ctx.fillRect(SCREEN_WIDTH - wipeWidth, HUD_HEIGHT, wipeWidth, SCREEN_HEIGHT - HUD_HEIGHT);
  }

  /**
   * Renders a row wipe effect
   * Draws black rows from top and bottom towards center
   * @param progress Wipe progress from 0 to 1
   * @param reverse If true, wipes from center to edges
   */
  renderRowWipe(progress: number, reverse: boolean = false): void {
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const effectiveProgress = reverse ? 1 - clampedProgress : clampedProgress;

    const playAreaHeight = SCREEN_HEIGHT - HUD_HEIGHT;
    const wipeHeight = Math.floor((playAreaHeight / 2) * effectiveProgress);

    if (wipeHeight <= 0) return;

    this.ctx.fillStyle = '#000000';
    // Top
    this.ctx.fillRect(0, HUD_HEIGHT, SCREEN_WIDTH, wipeHeight);
    // Bottom
    this.ctx.fillRect(0, SCREEN_HEIGHT - wipeHeight, SCREEN_WIDTH, wipeHeight);
  }

  /**
   * Renders a damage flash (red tint)
   * @param intensity Flash intensity from 0 to 1
   */
  renderDamageFlash(intensity: number): void {
    if (intensity <= 0) return;

    const clampedIntensity = Math.min(1, Math.max(0, intensity));

    this.ctx.fillStyle = `rgba(255, 0, 0, ${clampedIntensity * 0.5})`;
    this.ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  /**
   * Renders an invincibility flash (alternating visibility)
   * @param visible Whether the flashing entity should be visible this frame
   */
  isFlashVisible(frameCounter: number, flashInterval: number = 4): boolean {
    return Math.floor(frameCounter / flashInterval) % 2 === 0;
  }

  /**
   * Renders a cave/warp iris effect (circular reveal/hide)
   * @param progress Progress from 0 (closed) to 1 (fully open)
   * @param centerX Center X coordinate of the iris
   * @param centerY Center Y coordinate of the iris
   */
  renderIrisWipe(progress: number, centerX: number = SCREEN_WIDTH / 2, centerY: number = (SCREEN_HEIGHT + HUD_HEIGHT) / 2): void {
    const clampedProgress = Math.min(1, Math.max(0, progress));

    // Maximum radius to cover the entire screen
    const maxRadius = Math.sqrt(SCREEN_WIDTH * SCREEN_WIDTH + SCREEN_HEIGHT * SCREEN_HEIGHT);
    const currentRadius = maxRadius * clampedProgress;

    // Draw black overlay with circular cutout
    this.ctx.save();

    // Create a path that covers everything except the circle
    this.ctx.beginPath();
    this.ctx.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    this.ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2, true);
    this.ctx.closePath();

    this.ctx.fillStyle = '#000000';
    this.ctx.fill('evenodd');

    this.ctx.restore();
  }

  /**
   * Parses a hex color string to RGB values
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    // Default to black
    let r = 0, g = 0, b = 0;

    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        const r0 = hex.charAt(0);
        const g0 = hex.charAt(1);
        const b0 = hex.charAt(2);
        r = parseInt(r0 + r0, 16);
        g = parseInt(g0 + g0, 16);
        b = parseInt(b0 + b0, 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    }

    return { r, g, b };
  }

  /**
   * Clears all effects from the screen (useful for debugging)
   */
  clearEffects(): void {
    // This just re-exposes the context for external clearing if needed
    // Actual clearing should be done by the main renderer
  }
}
