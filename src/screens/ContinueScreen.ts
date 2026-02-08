// ContinueScreen.ts - Continue screen after player death
// Displays Continue/Save&Quit options

import type { InputSnapshot, GamePhase } from '../types';
import { SCREEN_WIDTH, SCREEN_HEIGHT, CONTINUE_HP } from '../constants';

/**
 * Configuration for ContinueScreen text rendering
 */
export const CONTINUE_SCREEN_CONFIG = {
  /** Game over text */
  GAME_OVER_TEXT: 'GAME OVER',
  /** Continue option text */
  CONTINUE_TEXT: 'CONTINUE',
  /** Save & Quit option text */
  SAVE_QUIT_TEXT: 'SAVE & QUIT',
  /** Game over Y position */
  GAME_OVER_Y: 60,
  /** Menu start Y position */
  MENU_START_Y: 120,
  /** Menu option spacing */
  MENU_SPACING: 24,
  /** Cursor X offset from text */
  CURSOR_OFFSET_X: 20,
  /** Cursor blink interval in frames */
  CURSOR_BLINK_INTERVAL: 15,
  /** Background color */
  BG_COLOR: '#000000',
  /** Game over text color */
  GAME_OVER_COLOR: '#B53120', // NES-style dark red
  /** Menu text color */
  MENU_TEXT_COLOR: '#FFFFFF',
  /** Selected option color */
  SELECTED_COLOR: '#FCD820', // Gold
  /** Cursor color */
  CURSOR_COLOR: '#FCD820',
  /** Game over font */
  GAME_OVER_FONT: 'bold 16px monospace',
  /** Menu font */
  MENU_FONT: '12px monospace',
  /** Number of hearts to restore on continue */
  CONTINUE_HEARTS: CONTINUE_HP,
} as const;

/**
 * Menu option on continue screen
 */
export type ContinueOption = 'CONTINUE' | 'SAVE_QUIT';

/**
 * Result of continue screen update
 */
export interface ContinueScreenUpdateResult {
  /** New phase to transition to, or null if staying on screen */
  nextPhase: GamePhase | null;
  /** Selected action */
  action: ContinueOption | null;
}

/**
 * Continue screen handler with update and render methods.
 * Displays after player death with Continue/Save&Quit options.
 */
export class ContinueScreen {
  /** Frame counter for animation timing */
  private frameCounter: number = 0;

  /** Currently selected menu option */
  private selectedOption: ContinueOption = 'CONTINUE';

  /** Whether cursor is visible (for blinking) */
  private cursorVisible: boolean = true;

  /** Menu options */
  private readonly menuOptions: ContinueOption[] = ['CONTINUE', 'SAVE_QUIT'];

  constructor() {
    this.reset();
  }

  /**
   * Resets the continue screen state
   */
  reset(): void {
    this.frameCounter = 0;
    this.selectedOption = 'CONTINUE';
    this.cursorVisible = true;
  }

  /**
   * Updates the continue screen state and checks for input
   * @param input The current input snapshot
   * @returns Update result indicating if phase should change and action taken
   */
  update(input: InputSnapshot): ContinueScreenUpdateResult {
    this.frameCounter++;

    // Handle cursor blinking
    if (this.frameCounter % CONTINUE_SCREEN_CONFIG.CURSOR_BLINK_INTERVAL === 0) {
      this.cursorVisible = !this.cursorVisible;
    }

    // Handle menu navigation
    if (input.buttons.UP.justPressed || input.buttons.DOWN.justPressed) {
      // Toggle between options
      const currentIndex = this.menuOptions.indexOf(this.selectedOption);
      const newIndex = (currentIndex + 1) % this.menuOptions.length;
      const newOption = this.menuOptions[newIndex];
      if (newOption) {
        this.selectedOption = newOption;
      }
    }

    // Handle selection
    if (input.buttons.START.justPressed || input.buttons.A.justPressed) {
      if (this.selectedOption === 'CONTINUE') {
        // Return to gameplay with respawn
        return {
          nextPhase: 'GAMEPLAY',
          action: 'CONTINUE',
        };
      } else {
        // Save and quit - go to title screen
        return {
          nextPhase: 'TITLE',
          action: 'SAVE_QUIT',
        };
      }
    }

    return { nextPhase: null, action: null };
  }

  /**
   * Renders the continue screen to the canvas
   * @param ctx The canvas rendering context
   */
  render(ctx: CanvasRenderingContext2D): void {
    const config = CONTINUE_SCREEN_CONFIG;

    // Clear to background color
    ctx.fillStyle = config.BG_COLOR;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Set text rendering properties
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Render Game Over text
    ctx.font = config.GAME_OVER_FONT;
    ctx.fillStyle = config.GAME_OVER_COLOR;
    ctx.fillText(config.GAME_OVER_TEXT, SCREEN_WIDTH / 2, config.GAME_OVER_Y);

    // Render decorative hearts showing how many will be restored
    this.renderHearts(ctx, SCREEN_WIDTH / 2, config.GAME_OVER_Y + 30);

    // Render menu options
    ctx.font = config.MENU_FONT;
    for (let i = 0; i < this.menuOptions.length; i++) {
      const option = this.menuOptions[i];
      const y = config.MENU_START_Y + i * config.MENU_SPACING;
      const isSelected = option === this.selectedOption;

      // Set color based on selection
      ctx.fillStyle = isSelected ? config.SELECTED_COLOR : config.MENU_TEXT_COLOR;

      // Get display text for option
      const text = option === 'CONTINUE' ? config.CONTINUE_TEXT : config.SAVE_QUIT_TEXT;
      ctx.fillText(text, SCREEN_WIDTH / 2, y);

      // Draw cursor for selected option
      if (isSelected && this.cursorVisible) {
        this.renderCursor(ctx, SCREEN_WIDTH / 2 - 50, y);
      }
    }

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Renders decorative hearts showing restoration amount
   */
  private renderHearts(ctx: CanvasRenderingContext2D, centerX: number, y: number): void {
    const heartCount = CONTINUE_SCREEN_CONFIG.CONTINUE_HEARTS / 2; // Convert HP to hearts
    const heartSize = 8;
    const spacing = 12;
    const startX = centerX - ((heartCount - 1) * spacing) / 2;

    ctx.fillStyle = '#FF0000';

    for (let i = 0; i < heartCount; i++) {
      const x = startX + i * spacing;
      this.drawHeart(ctx, x, y, heartSize);
    }
  }

  /**
   * Draws a simple heart shape
   */
  private drawHeart(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number
  ): void {
    const halfSize = size / 2;

    ctx.beginPath();
    // Left bump
    ctx.arc(centerX - halfSize / 2, centerY - halfSize / 4, halfSize / 2, Math.PI, 0);
    // Right bump
    ctx.arc(centerX + halfSize / 2, centerY - halfSize / 4, halfSize / 2, Math.PI, 0);
    // Point at bottom
    ctx.lineTo(centerX, centerY + halfSize);
    ctx.lineTo(centerX - halfSize, centerY - halfSize / 4);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Renders the selection cursor
   */
  private renderCursor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = CONTINUE_SCREEN_CONFIG.CURSOR_COLOR;

    // Draw a simple arrow/triangle cursor
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y - 4);
    ctx.lineTo(x - 8, y + 4);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Gets the currently selected option (for testing)
   */
  getSelectedOption(): ContinueOption {
    return this.selectedOption;
  }

  /**
   * Gets the current frame counter (for testing)
   */
  getFrameCounter(): number {
    return this.frameCounter;
  }

  /**
   * Gets the cursor visibility state (for testing)
   */
  isCursorVisible(): boolean {
    return this.cursorVisible;
  }

  /**
   * Sets the selected option (for testing)
   */
  setSelectedOption(option: ContinueOption): void {
    this.selectedOption = option;
  }
}

// ===== SINGLETON PATTERN =====

let continueScreenInstance: ContinueScreen | null = null;

/**
 * Gets the singleton ContinueScreen instance
 */
export function getContinueScreen(): ContinueScreen {
  if (!continueScreenInstance) {
    continueScreenInstance = new ContinueScreen();
  }
  return continueScreenInstance;
}

/**
 * Resets the singleton ContinueScreen instance (for testing)
 */
export function resetContinueScreen(): void {
  continueScreenInstance = null;
}
