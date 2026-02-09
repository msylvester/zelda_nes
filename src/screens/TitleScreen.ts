// TitleScreen.ts - Title screen display and input handling
// Displays game title and "Press Start to begin" prompt

import type { InputSnapshot, GamePhase } from '../types';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from '../constants';

/**
 * Configuration for TitleScreen text rendering
 */
export const TITLE_SCREEN_CONFIG = {
  /** Main title text */
  TITLE_TEXT: 'THE LEGEND OF ZELDA',
  /** Subtitle text */
  SUBTITLE_TEXT: 'TypeScript NES Clone',
  /** Prompt text */
  PROMPT_TEXT: 'PRESS START',
  /** Title Y position */
  TITLE_Y: 80,
  /** Subtitle Y position */
  SUBTITLE_Y: 100,
  /** Prompt Y position */
  PROMPT_Y: 160,
  /** Prompt blink interval in frames */
  PROMPT_BLINK_INTERVAL: 30,
  /** Title screen background color */
  BG_COLOR: '#000000',
  /** Title text color */
  TITLE_COLOR: '#B53120', // NES-style dark red
  /** Subtitle text color */
  SUBTITLE_COLOR: '#FCBCB0', // NES-style light pink
  /** Prompt text color */
  PROMPT_COLOR: '#FFFFFF',
  /** Title font */
  TITLE_FONT: 'bold 16px monospace',
  /** Subtitle font */
  SUBTITLE_FONT: '10px monospace',
  /** Prompt font */
  PROMPT_FONT: '12px monospace',
} as const;

/**
 * Result of title screen update - indicates phase transition
 */
export interface TitleScreenUpdateResult {
  /** New phase to transition to, or null if staying on title */
  nextPhase: GamePhase | null;
}

/**
 * Title screen handler with update and render methods.
 * Displays the game title and waits for Start button press.
 */
export class TitleScreen {
  /** Frame counter for animation timing */
  private frameCounter: number = 0;

  /** Whether the prompt is currently visible (for blinking) */
  private promptVisible: boolean = true;

  constructor() {
    this.reset();
  }

  /**
   * Resets the title screen state
   */
  reset(): void {
    this.frameCounter = 0;
    this.promptVisible = true;
  }

  /**
   * Updates the title screen state and checks for input
   * @param input The current input snapshot
   * @returns Update result indicating if phase should change
   */
  update(input: InputSnapshot): TitleScreenUpdateResult {
    this.frameCounter++;

    // Handle prompt blinking
    if (this.frameCounter % TITLE_SCREEN_CONFIG.PROMPT_BLINK_INTERVAL === 0) {
      this.promptVisible = !this.promptVisible;
    }

    // Check for Start button press
    if (input.buttons.START.justPressed) {
      // Transition to FILE_SELECT (or directly to GAMEPLAY if no save system yet)
      return { nextPhase: 'FILE_SELECT' };
    }

    return { nextPhase: null };
  }

  /**
   * Renders the title screen to the canvas
   * @param ctx The canvas rendering context
   */
  render(ctx: CanvasRenderingContext2D): void {
    const config = TITLE_SCREEN_CONFIG;

    // Clear to background color
    ctx.fillStyle = config.BG_COLOR;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Set text rendering properties
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Render title
    ctx.font = config.TITLE_FONT;
    ctx.fillStyle = config.TITLE_COLOR;
    ctx.fillText(config.TITLE_TEXT, SCREEN_WIDTH / 2, config.TITLE_Y);

    // Render subtitle
    ctx.font = config.SUBTITLE_FONT;
    ctx.fillStyle = config.SUBTITLE_COLOR;
    ctx.fillText(config.SUBTITLE_TEXT, SCREEN_WIDTH / 2, config.SUBTITLE_Y);

    // Render decorative Triforce (simple triangle representation)
    this.renderTriforce(ctx);

    // Render prompt (with blinking)
    if (this.promptVisible) {
      ctx.font = config.PROMPT_FONT;
      ctx.fillStyle = config.PROMPT_COLOR;
      ctx.fillText(config.PROMPT_TEXT, SCREEN_WIDTH / 2, config.PROMPT_Y);
    }

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Renders a simple Triforce decoration
   */
  private renderTriforce(ctx: CanvasRenderingContext2D): void {
    const centerX = SCREEN_WIDTH / 2;
    const centerY = 130;
    const size = 20;

    ctx.fillStyle = '#FCD820'; // Gold color

    // Draw three triangles forming Triforce shape
    // Top triangle
    this.drawTriangle(ctx, centerX, centerY - size * 0.5, size);
    // Bottom left triangle
    this.drawTriangle(ctx, centerX - size * 0.5, centerY + size * 0.25, size);
    // Bottom right triangle
    this.drawTriangle(ctx, centerX + size * 0.5, centerY + size * 0.25, size);
  }

  /**
   * Draws an upward-pointing triangle
   */
  private drawTriangle(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number
  ): void {
    const halfSize = size / 2;
    const height = (size * Math.sqrt(3)) / 2;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - height / 2); // Top
    ctx.lineTo(centerX - halfSize, centerY + height / 2); // Bottom left
    ctx.lineTo(centerX + halfSize, centerY + height / 2); // Bottom right
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Gets the current frame counter (for testing)
   */
  getFrameCounter(): number {
    return this.frameCounter;
  }

  /**
   * Gets the prompt visibility state (for testing)
   */
  isPromptVisible(): boolean {
    return this.promptVisible;
  }
}

// ===== SINGLETON PATTERN =====

let titleScreenInstance: TitleScreen | null = null;

/**
 * Gets the singleton TitleScreen instance
 */
export function getTitleScreen(): TitleScreen {
  if (!titleScreenInstance) {
    titleScreenInstance = new TitleScreen();
  }
  return titleScreenInstance;
}

/**
 * Resets the singleton TitleScreen instance (for testing)
 */
export function resetTitleScreen(): void {
  titleScreenInstance = null;
}
