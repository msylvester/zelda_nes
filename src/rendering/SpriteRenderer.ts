// SpriteRenderer.ts - Renders sprites sorted by priority
// NES-style sprite rendering with priority-based sorting

import { HUD_HEIGHT } from '../constants';
import type { SpriteRenderCommand, SpritePriority } from '../types';
import type { GeneratedAssets, SpriteKey } from '../assets/AssetGenerator';

/**
 * Renders sprites in the correct order based on priority
 * Lower priority values are rendered first (behind higher values)
 * Priority 0-7 matches NES sprite priority system
 */
export class SpriteRenderer {
  private ctx: CanvasRenderingContext2D;
  private assets: GeneratedAssets;

  constructor(ctx: CanvasRenderingContext2D, assets: GeneratedAssets) {
    this.ctx = ctx;
    this.assets = assets;
  }

  /**
   * Renders all sprites sorted by priority (low to high)
   * Sprites with lower priority are rendered first (appear behind)
   */
  render(sprites: SpriteRenderCommand[]): void {
    if (sprites.length === 0) return;

    // Sort by priority (ascending) - lower priority renders first (behind)
    const sorted = [...sprites].sort((a, b) => a.priority - b.priority);

    for (const sprite of sorted) {
      if (!sprite.visible) continue;
      this.renderSprite(sprite);
    }
  }

  /**
   * Renders a single sprite
   */
  renderSprite(sprite: SpriteRenderCommand): void {
    if (!sprite.visible) return;

    // Get sprite canvas from assets
    const spriteCanvas = this.assets.sprites.get(sprite.spriteKey as SpriteKey);

    if (!spriteCanvas) {
      // Fallback: draw a colored rectangle for missing sprites
      this.renderFallbackSprite(sprite);
      return;
    }

    // Calculate screen position (add HUD offset for Y)
    const screenX = Math.floor(sprite.x);
    const screenY = Math.floor(sprite.y) + HUD_HEIGHT;

    // Handle flipping
    if (sprite.flipX || sprite.flipY) {
      this.ctx.save();

      // Translate to sprite center
      const centerX = screenX + spriteCanvas.width / 2;
      const centerY = screenY + spriteCanvas.height / 2;
      this.ctx.translate(centerX, centerY);

      // Apply flip transformations
      this.ctx.scale(sprite.flipX ? -1 : 1, sprite.flipY ? -1 : 1);

      // Draw at offset from center
      this.ctx.drawImage(
        spriteCanvas,
        -spriteCanvas.width / 2,
        -spriteCanvas.height / 2
      );

      this.ctx.restore();
    } else {
      // Simple draw without flipping
      this.ctx.drawImage(spriteCanvas, screenX, screenY);
    }
  }

  /**
   * Renders a fallback sprite when the asset is missing
   */
  private renderFallbackSprite(sprite: SpriteRenderCommand): void {
    const screenX = Math.floor(sprite.x);
    const screenY = Math.floor(sprite.y) + HUD_HEIGHT;

    // Default size for fallback sprites
    const width = 16;
    const height = 16;

    // Color based on sprite key prefix
    let color = '#FF00FF'; // Magenta for unknown
    if (sprite.spriteKey.startsWith('link')) {
      color = '#228B22'; // Green for Link
    } else if (sprite.spriteKey.startsWith('enemy')) {
      color = '#CD5C5C'; // Red for enemies
    } else if (sprite.spriteKey.startsWith('item')) {
      color = '#FFD700'; // Gold for items
    } else if (sprite.spriteKey.startsWith('projectile')) {
      color = '#FF6600'; // Orange for projectiles
    } else if (sprite.spriteKey.startsWith('sword')) {
      color = '#C0C0C0'; // Silver for sword
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, screenY, width, height);

    // Draw outline
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(screenX + 0.5, screenY + 0.5, width - 1, height - 1);
  }

  /**
   * Renders sprites filtered by priority range
   * Useful for rendering certain layers separately
   */
  renderByPriorityRange(
    sprites: SpriteRenderCommand[],
    minPriority: SpritePriority,
    maxPriority: SpritePriority
  ): void {
    const filtered = sprites.filter(
      (s) => s.priority >= minPriority && s.priority <= maxPriority
    );
    this.render(filtered);
  }

  /**
   * Renders a sprite at a specific screen position (ignoring sprite.x/y)
   * Useful for HUD elements or fixed-position sprites
   */
  renderAt(spriteKey: string, x: number, y: number, flipX: boolean = false, flipY: boolean = false): void {
    const spriteCanvas = this.assets.sprites.get(spriteKey as SpriteKey);

    if (!spriteCanvas) {
      // Fallback
      this.ctx.fillStyle = '#FF00FF';
      this.ctx.fillRect(x, y, 16, 16);
      return;
    }

    if (flipX || flipY) {
      this.ctx.save();
      const centerX = x + spriteCanvas.width / 2;
      const centerY = y + spriteCanvas.height / 2;
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      this.ctx.drawImage(spriteCanvas, -spriteCanvas.width / 2, -spriteCanvas.height / 2);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(spriteCanvas, x, y);
    }
  }

  /**
   * Gets the dimensions of a sprite
   */
  getSpriteSize(spriteKey: string): { width: number; height: number } | null {
    const spriteCanvas = this.assets.sprites.get(spriteKey as SpriteKey);
    if (!spriteCanvas) return null;
    return {
      width: spriteCanvas.width,
      height: spriteCanvas.height,
    };
  }

  /**
   * Checks if a sprite asset exists
   */
  hasSprite(spriteKey: string): boolean {
    return this.assets.sprites.has(spriteKey as SpriteKey);
  }
}
