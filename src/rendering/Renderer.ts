// Renderer.ts - Main render pipeline orchestrator
// Renders at 256x240 with 3x scale and pixelated rendering

import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  CANVAS_SCALE,
  HUD_HEIGHT,
} from '../constants';
import type { SpriteRenderCommand } from '../types';
import { TileRenderer } from './TileRenderer';
import { SpriteRenderer } from './SpriteRenderer';
import { EffectRenderer } from './EffectRenderer';
import type { GeneratedAssets } from '../assets/AssetGenerator';

/**
 * Configuration for the renderer
 */
export interface RendererConfig {
  canvas: HTMLCanvasElement;
  assets: GeneratedAssets;
}

/**
 * World context for tile rendering
 */
export type WorldContext = 'overworld' | 'dungeon' | 'cave';

/**
 * Data needed to render a frame
 */
export interface RenderFrame {
  /** Background tiles for the current screen (16x11 grid) */
  tiles?: number[];
  /** Whether rendering dungeon tiles (different palette) - deprecated, use context */
  isDungeon?: boolean;
  /** World context for tile rendering */
  context?: WorldContext;
  /** Sprite render commands sorted by priority */
  sprites?: SpriteRenderCommand[];
  /** Screen scroll offset for transitions (x, y) */
  scrollOffset?: { x: number; y: number };
  /** Screen flash effect (0-1 intensity) */
  flashIntensity?: number;
  /** Screen fade effect (0-1 alpha, 0 = fully visible) */
  fadeAlpha?: number;
  /** Fade color (default black) */
  fadeColor?: string;
}

/**
 * Main renderer that orchestrates the render pipeline
 * Clears to black, renders tiles, sprites, and effects in order
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assets: GeneratedAssets;

  private tileRenderer: TileRenderer;
  private spriteRenderer: SpriteRenderer;
  private effectRenderer: EffectRenderer;

  constructor(config: RendererConfig) {
    this.canvas = config.canvas;
    this.assets = config.assets;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;

    // Set up canvas for pixel-perfect rendering
    this.setupCanvas();

    // Initialize sub-renderers
    this.tileRenderer = new TileRenderer(this.ctx, this.assets);
    this.spriteRenderer = new SpriteRenderer(this.ctx, this.assets);
    this.effectRenderer = new EffectRenderer(this.ctx);
  }

  /**
   * Sets up the canvas for NES-style pixel rendering
   */
  private setupCanvas(): void {
    // Set native NES resolution
    this.canvas.width = SCREEN_WIDTH;
    this.canvas.height = SCREEN_HEIGHT;

    // Scale up with CSS for display (3x scale)
    this.canvas.style.width = `${SCREEN_WIDTH * CANVAS_SCALE}px`;
    this.canvas.style.height = `${SCREEN_HEIGHT * CANVAS_SCALE}px`;

    // Disable image smoothing for pixelated look
    this.ctx.imageSmoothingEnabled = false;

    // Some browsers need these properties too
    const ctxAny = this.ctx as unknown as Record<string, boolean>;
    ctxAny['mozImageSmoothingEnabled'] = false;
    ctxAny['webkitImageSmoothingEnabled'] = false;
    ctxAny['msImageSmoothingEnabled'] = false;
  }

  /**
   * Clears the entire screen to black
   */
  clear(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  /**
   * Renders a complete frame
   */
  render(frame: RenderFrame): void {
    // Clear screen to black
    this.clear();

    // Apply scroll offset if present (for screen transitions)
    if (frame.scrollOffset) {
      this.ctx.save();
      this.ctx.translate(frame.scrollOffset.x, frame.scrollOffset.y);
    }

    // Render background tiles (offset by HUD height)
    if (frame.tiles) {
      // Support both legacy isDungeon and new context property
      const context = frame.context ?? (frame.isDungeon ? 'dungeon' : 'overworld');
      this.tileRenderer.render(frame.tiles, context);
    }

    // Render sprites (sorted by priority)
    if (frame.sprites) {
      this.spriteRenderer.render(frame.sprites);
    }

    // Restore context if scroll was applied
    if (frame.scrollOffset) {
      this.ctx.restore();
    }

    // Render screen effects (flash, fade)
    if (frame.flashIntensity !== undefined && frame.flashIntensity > 0) {
      this.effectRenderer.renderFlash(frame.flashIntensity);
    }

    if (frame.fadeAlpha !== undefined && frame.fadeAlpha > 0) {
      this.effectRenderer.renderFade(frame.fadeAlpha, frame.fadeColor);
    }
  }

  /**
   * Renders only the play area (no HUD)
   * Used during screen transitions
   */
  renderPlayArea(frame: RenderFrame): void {
    // Save context and clip to play area
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, HUD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT - HUD_HEIGHT);
    this.ctx.clip();

    // Clear play area
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, HUD_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT - HUD_HEIGHT);

    // Apply scroll offset if present
    if (frame.scrollOffset) {
      this.ctx.translate(frame.scrollOffset.x, frame.scrollOffset.y);
    }

    // Render tiles
    if (frame.tiles) {
      const context = frame.context ?? (frame.isDungeon ? 'dungeon' : 'overworld');
      this.tileRenderer.render(frame.tiles, context);
    }

    // Render sprites
    if (frame.sprites) {
      this.spriteRenderer.render(frame.sprites);
    }

    this.ctx.restore();
  }

  /**
   * Gets the rendering context for direct drawing (e.g., HUD)
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Gets the canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Gets the tile renderer for direct access
   */
  getTileRenderer(): TileRenderer {
    return this.tileRenderer;
  }

  /**
   * Gets the sprite renderer for direct access
   */
  getSpriteRenderer(): SpriteRenderer {
    return this.spriteRenderer;
  }

  /**
   * Gets the effect renderer for direct access
   */
  getEffectRenderer(): EffectRenderer {
    return this.effectRenderer;
  }

  /**
   * Takes a screenshot of the current canvas as a data URL
   */
  screenshot(): string {
    return this.canvas.toDataURL('image/png');
  }
}
