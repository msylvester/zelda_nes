// FileSelectScreen.ts - File select screen for save slot management
// Displays 3 save slots with name/hearts/deaths, allows register/select/eliminate

import type { InputSnapshot, GamePhase, SaveFile } from '../types';
import { SCREEN_WIDTH, SCREEN_HEIGHT, SAVE_SLOTS } from '../constants';
import { getSaveSystem } from '../progression/SaveSystem';

/**
 * Configuration for FileSelectScreen rendering
 */
export const FILE_SELECT_CONFIG = {
  /** Screen title text */
  TITLE_TEXT: 'SELECT FILE',
  /** Register new file text */
  REGISTER_TEXT: 'REGISTER YOUR NAME',
  /** Eliminate file text */
  ELIMINATE_TEXT: 'ELIMINATION MODE',
  /** End elimination mode text */
  END_ELIMINATE_TEXT: 'END',
  /** Empty slot text */
  EMPTY_SLOT_TEXT: '- EMPTY -',
  /** Title Y position */
  TITLE_Y: 32,
  /** First slot Y position */
  FIRST_SLOT_Y: 64,
  /** Slot spacing */
  SLOT_SPACING: 40,
  /** Register option Y (below all slots) */
  REGISTER_OPTION_Y: 188,
  /** Eliminate option Y */
  ELIMINATE_OPTION_Y: 208,
  /** Cursor X offset from text */
  CURSOR_OFFSET_X: 20,
  /** Cursor blink interval in frames */
  CURSOR_BLINK_INTERVAL: 15,
  /** Name entry blink interval */
  NAME_ENTRY_BLINK_INTERVAL: 8,
  /** Maximum name length */
  MAX_NAME_LENGTH: 8,
  /** Valid name characters */
  VALID_CHARACTERS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
  /** Background color */
  BG_COLOR: '#000000',
  /** Title text color */
  TITLE_COLOR: '#FCD820', // Gold
  /** Slot text color */
  SLOT_TEXT_COLOR: '#FFFFFF',
  /** Selected option color */
  SELECTED_COLOR: '#FCD820', // Gold
  /** Empty slot color */
  EMPTY_SLOT_COLOR: '#808080', // Gray
  /** Cursor color */
  CURSOR_COLOR: '#FCD820',
  /** Danger color (for elimination) */
  DANGER_COLOR: '#B53120', // Red
  /** Title font */
  TITLE_FONT: 'bold 14px monospace',
  /** Slot font */
  SLOT_FONT: '12px monospace',
  /** Small font for details */
  SMALL_FONT: '10px monospace',
} as const;

/**
 * Mode for file select screen
 */
export type FileSelectMode = 'SELECT' | 'REGISTER' | 'ELIMINATE';

/**
 * Result of file select screen update
 */
export interface FileSelectUpdateResult {
  /** New phase to transition to, or null if staying on screen */
  nextPhase: GamePhase | null;
  /** Selected save slot (0-2) when starting a game */
  selectedSlot: number | null;
  /** Whether to start a new game (vs continue) */
  isNewGame: boolean;
}

/**
 * File select screen handler with update and render methods.
 * Displays save slots, allows registration of new files, selection to continue, and elimination.
 */
export class FileSelectScreen {
  /** Frame counter for animation timing */
  private frameCounter: number = 0;

  /** Current mode */
  private mode: FileSelectMode = 'SELECT';

  /** Currently selected slot index (0-2) or 3 for Register, 4 for Eliminate */
  private selectedIndex: number = 0;

  /** Whether cursor is visible (for blinking) */
  private cursorVisible: boolean = true;

  /** Name being entered during registration */
  private enteredName: string = '';

  /** Target slot for registration */
  private registerTargetSlot: number = -1;

  /** Character selection index for name entry (0-36) */
  private charSelectIndex: number = 0;

  /** Whether currently in character selection mode */
  private isSelectingChar: boolean = false;

  constructor() {
    this.reset();
  }

  /**
   * Resets the file select screen state
   */
  reset(): void {
    this.frameCounter = 0;
    this.mode = 'SELECT';
    this.selectedIndex = 0;
    this.cursorVisible = true;
    this.enteredName = '';
    this.registerTargetSlot = -1;
    this.charSelectIndex = 0;
    this.isSelectingChar = false;
  }

  /**
   * Updates the file select screen state and checks for input
   * @param input The current input snapshot
   * @returns Update result indicating if phase should change
   */
  update(input: InputSnapshot): FileSelectUpdateResult {
    this.frameCounter++;

    // Handle cursor blinking
    const blinkInterval = this.mode === 'REGISTER' && this.isSelectingChar
      ? FILE_SELECT_CONFIG.NAME_ENTRY_BLINK_INTERVAL
      : FILE_SELECT_CONFIG.CURSOR_BLINK_INTERVAL;
    if (this.frameCounter % blinkInterval === 0) {
      this.cursorVisible = !this.cursorVisible;
    }

    // Handle based on current mode
    switch (this.mode) {
      case 'SELECT':
        return this.updateSelectMode(input);
      case 'REGISTER':
        return this.updateRegisterMode(input);
      case 'ELIMINATE':
        return this.updateEliminateMode(input);
    }
  }

  /**
   * Handle SELECT mode input
   */
  private updateSelectMode(input: InputSnapshot): FileSelectUpdateResult {
    const saveSystem = getSaveSystem();
    const files = saveSystem.getFiles();
    const maxIndex = 4; // 0-2 = slots, 3 = register, 4 = eliminate

    // Navigation
    if (input.buttons.UP.justPressed) {
      this.selectedIndex = (this.selectedIndex - 1 + maxIndex + 1) % (maxIndex + 1);
    }
    if (input.buttons.DOWN.justPressed) {
      this.selectedIndex = (this.selectedIndex + 1) % (maxIndex + 1);
    }

    // Selection
    if (input.buttons.A.justPressed || input.buttons.START.justPressed) {
      if (this.selectedIndex < SAVE_SLOTS) {
        // Selected a slot
        const file = files[this.selectedIndex];
        if (file !== null) {
          // Continue existing game
          return {
            nextPhase: 'GAMEPLAY',
            selectedSlot: this.selectedIndex,
            isNewGame: false,
          };
        } else {
          // Empty slot - start registration
          this.startRegistration(this.selectedIndex);
        }
      } else if (this.selectedIndex === 3) {
        // Register option - find first empty slot or use first slot
        const emptySlot = files.findIndex(f => f === null);
        if (emptySlot >= 0) {
          this.startRegistration(emptySlot);
        }
      } else if (this.selectedIndex === 4) {
        // Eliminate mode
        this.mode = 'ELIMINATE';
        this.selectedIndex = 0;
      }
    }

    // B button returns to title
    if (input.buttons.B.justPressed) {
      return { nextPhase: 'TITLE', selectedSlot: null, isNewGame: false };
    }

    return { nextPhase: null, selectedSlot: null, isNewGame: false };
  }

  /**
   * Start registration for a slot
   */
  private startRegistration(slot: number): void {
    this.mode = 'REGISTER';
    this.registerTargetSlot = slot;
    this.enteredName = '';
    this.charSelectIndex = 0;
    this.isSelectingChar = true;
  }

  /**
   * Handle REGISTER mode input
   */
  private updateRegisterMode(input: InputSnapshot): FileSelectUpdateResult {
    const validChars = FILE_SELECT_CONFIG.VALID_CHARACTERS;

    if (this.isSelectingChar) {
      // Character selection grid navigation
      // Use a 6x7 grid layout for 37 characters (A-Z, 0-9, space) + END
      const gridWidth = 7;
      const totalItems = validChars.length + 1; // +1 for END

      if (input.buttons.LEFT.justPressed) {
        this.charSelectIndex = (this.charSelectIndex - 1 + totalItems) % totalItems;
      }
      if (input.buttons.RIGHT.justPressed) {
        this.charSelectIndex = (this.charSelectIndex + 1) % totalItems;
      }
      if (input.buttons.UP.justPressed) {
        this.charSelectIndex = (this.charSelectIndex - gridWidth + totalItems) % totalItems;
      }
      if (input.buttons.DOWN.justPressed) {
        this.charSelectIndex = (this.charSelectIndex + gridWidth) % totalItems;
      }

      // A button selects character or END
      if (input.buttons.A.justPressed) {
        if (this.charSelectIndex === validChars.length) {
          // END selected - finish registration
          if (this.enteredName.trim().length > 0) {
            const saveSystem = getSaveSystem();
            saveSystem.createNewGame(this.registerTargetSlot, this.enteredName.trim());
            this.mode = 'SELECT';
            this.selectedIndex = this.registerTargetSlot;
            return {
              nextPhase: 'GAMEPLAY',
              selectedSlot: this.registerTargetSlot,
              isNewGame: true,
            };
          }
        } else if (this.enteredName.length < FILE_SELECT_CONFIG.MAX_NAME_LENGTH) {
          // Add character to name
          const char = validChars[this.charSelectIndex];
          if (char !== undefined) {
            this.enteredName += char;
          }
        }
      }

      // START confirms name if valid
      if (input.buttons.START.justPressed && this.enteredName.trim().length > 0) {
        const saveSystem = getSaveSystem();
        saveSystem.createNewGame(this.registerTargetSlot, this.enteredName.trim());
        this.mode = 'SELECT';
        this.selectedIndex = this.registerTargetSlot;
        return {
          nextPhase: 'GAMEPLAY',
          selectedSlot: this.registerTargetSlot,
          isNewGame: true,
        };
      }

      // B button removes last character or cancels
      if (input.buttons.B.justPressed) {
        if (this.enteredName.length > 0) {
          this.enteredName = this.enteredName.slice(0, -1);
        } else {
          // Cancel registration
          this.mode = 'SELECT';
          this.selectedIndex = this.registerTargetSlot;
        }
      }
    }

    return { nextPhase: null, selectedSlot: null, isNewGame: false };
  }

  /**
   * Handle ELIMINATE mode input
   */
  private updateEliminateMode(input: InputSnapshot): FileSelectUpdateResult {
    const saveSystem = getSaveSystem();
    const maxIndex = SAVE_SLOTS; // 0-2 = slots, 3 = END

    // Navigation
    if (input.buttons.UP.justPressed) {
      this.selectedIndex = (this.selectedIndex - 1 + maxIndex + 1) % (maxIndex + 1);
    }
    if (input.buttons.DOWN.justPressed) {
      this.selectedIndex = (this.selectedIndex + 1) % (maxIndex + 1);
    }

    // Selection
    if (input.buttons.A.justPressed || input.buttons.START.justPressed) {
      if (this.selectedIndex < SAVE_SLOTS) {
        // Delete this slot
        saveSystem.deleteFile(this.selectedIndex);
      } else {
        // END - return to select mode
        this.mode = 'SELECT';
        this.selectedIndex = 0;
      }
    }

    // B button exits eliminate mode
    if (input.buttons.B.justPressed) {
      this.mode = 'SELECT';
      this.selectedIndex = 0;
    }

    return { nextPhase: null, selectedSlot: null, isNewGame: false };
  }

  /**
   * Renders the file select screen to the canvas
   * @param ctx The canvas rendering context
   */
  render(ctx: CanvasRenderingContext2D): void {
    const config = FILE_SELECT_CONFIG;

    // Clear to background color
    ctx.fillStyle = config.BG_COLOR;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Render based on mode
    switch (this.mode) {
      case 'SELECT':
        this.renderSelectMode(ctx);
        break;
      case 'REGISTER':
        this.renderRegisterMode(ctx);
        break;
      case 'ELIMINATE':
        this.renderEliminateMode(ctx);
        break;
    }

    // Reset text alignment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Render SELECT mode
   */
  private renderSelectMode(ctx: CanvasRenderingContext2D): void {
    const config = FILE_SELECT_CONFIG;
    const saveSystem = getSaveSystem();
    const files = saveSystem.getFiles();

    // Title
    ctx.font = config.TITLE_FONT;
    ctx.fillStyle = config.TITLE_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.TITLE_TEXT, SCREEN_WIDTH / 2, config.TITLE_Y);

    // Save slots
    ctx.font = config.SLOT_FONT;
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const file = files[i] ?? null;
      const y = config.FIRST_SLOT_Y + i * config.SLOT_SPACING;
      const isSelected = this.selectedIndex === i;

      this.renderSlot(ctx, i, file, y, isSelected);
    }

    // Register option
    const registerY = config.REGISTER_OPTION_Y;
    const registerSelected = this.selectedIndex === 3;
    ctx.fillStyle = registerSelected ? config.SELECTED_COLOR : config.SLOT_TEXT_COLOR;
    ctx.fillText(config.REGISTER_TEXT, SCREEN_WIDTH / 2, registerY);
    if (registerSelected && this.cursorVisible) {
      this.renderCursor(ctx, SCREEN_WIDTH / 2 - 80, registerY);
    }

    // Eliminate option
    const eliminateY = config.ELIMINATE_OPTION_Y;
    const eliminateSelected = this.selectedIndex === 4;
    ctx.fillStyle = eliminateSelected ? config.DANGER_COLOR : config.SLOT_TEXT_COLOR;
    ctx.fillText(config.ELIMINATE_TEXT, SCREEN_WIDTH / 2, eliminateY);
    if (eliminateSelected && this.cursorVisible) {
      this.renderCursor(ctx, SCREEN_WIDTH / 2 - 80, eliminateY);
    }
  }

  /**
   * Render a save slot
   */
  private renderSlot(
    ctx: CanvasRenderingContext2D,
    slotIndex: number,
    file: SaveFile | null,
    y: number,
    isSelected: boolean
  ): void {
    const config = FILE_SELECT_CONFIG;
    const slotX = 40;

    if (file === null) {
      // Empty slot
      ctx.textAlign = 'left';
      ctx.fillStyle = isSelected ? config.SELECTED_COLOR : config.EMPTY_SLOT_COLOR;
      ctx.fillText(`${slotIndex + 1}. ${config.EMPTY_SLOT_TEXT}`, slotX, y);
    } else {
      // Slot with save data
      ctx.textAlign = 'left';
      ctx.fillStyle = isSelected ? config.SELECTED_COLOR : config.SLOT_TEXT_COLOR;
      ctx.fillText(`${slotIndex + 1}. ${file.playerName}`, slotX, y);

      // Hearts display
      this.renderSlotHearts(ctx, slotX + 140, y, file.heartContainers);

      // Death count
      ctx.font = config.SMALL_FONT;
      ctx.fillStyle = config.SLOT_TEXT_COLOR;
      ctx.fillText(`DEATHS: ${file.deathCount}`, slotX, y + 14);
      ctx.font = config.SLOT_FONT;
    }

    // Cursor
    if (isSelected && this.cursorVisible) {
      this.renderCursor(ctx, slotX - 16, y);
    }
  }

  /**
   * Render hearts for a slot
   */
  private renderSlotHearts(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    heartContainers: number
  ): void {
    const heartSize = 8;
    const spacing = 10;

    for (let i = 0; i < heartContainers; i++) {
      const heartX = x + i * spacing;
      this.drawHeart(ctx, heartX, y, heartSize);
    }
  }

  /**
   * Draw a simple heart shape
   */
  private drawHeart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ): void {
    ctx.fillStyle = '#FF0000';
    const halfSize = size / 2;

    ctx.beginPath();
    ctx.arc(x - halfSize / 2, y - halfSize / 4, halfSize / 2, Math.PI, 0);
    ctx.arc(x + halfSize / 2, y - halfSize / 4, halfSize / 2, Math.PI, 0);
    ctx.lineTo(x, y + halfSize);
    ctx.lineTo(x - halfSize, y - halfSize / 4);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Render REGISTER mode (name entry)
   */
  private renderRegisterMode(ctx: CanvasRenderingContext2D): void {
    const config = FILE_SELECT_CONFIG;
    const validChars = config.VALID_CHARACTERS;

    // Title
    ctx.font = config.TITLE_FONT;
    ctx.fillStyle = config.TITLE_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.REGISTER_TEXT, SCREEN_WIDTH / 2, config.TITLE_Y);

    // Name display with cursor
    const nameY = 60;
    ctx.font = config.SLOT_FONT;
    ctx.fillStyle = config.SLOT_TEXT_COLOR;

    // Draw name boxes
    const boxSize = 12;
    const boxSpacing = 16;
    const startX = SCREEN_WIDTH / 2 - (config.MAX_NAME_LENGTH * boxSpacing) / 2;

    for (let i = 0; i < config.MAX_NAME_LENGTH; i++) {
      const boxX = startX + i * boxSpacing;

      // Draw box outline
      ctx.strokeStyle = config.SLOT_TEXT_COLOR;
      ctx.strokeRect(boxX, nameY - boxSize / 2, boxSize, boxSize);

      // Draw character if entered
      if (i < this.enteredName.length) {
        ctx.fillStyle = config.SLOT_TEXT_COLOR;
        ctx.textAlign = 'center';
        ctx.fillText(this.enteredName[i] ?? '', boxX + boxSize / 2, nameY);
      } else if (i === this.enteredName.length && this.cursorVisible) {
        // Blinking cursor at current position
        ctx.fillStyle = config.CURSOR_COLOR;
        ctx.fillRect(boxX + 2, nameY - boxSize / 2 + 2, boxSize - 4, boxSize - 4);
      }
    }

    // Character selection grid
    const gridStartY = 100;
    const gridCharWidth = 24;
    const gridCharHeight = 16;
    const charsPerRow = 7;

    ctx.font = config.SMALL_FONT;

    for (let i = 0; i <= validChars.length; i++) {
      const row = Math.floor(i / charsPerRow);
      const col = i % charsPerRow;
      const charX = 44 + col * gridCharWidth;
      const charY = gridStartY + row * gridCharHeight;

      const isSelectedChar = i === this.charSelectIndex;
      const charLabel = i === validChars.length ? 'END' : (validChars[i] === ' ' ? '_' : validChars[i] ?? '');

      if (isSelectedChar && this.cursorVisible) {
        // Highlight selected character
        ctx.fillStyle = config.SELECTED_COLOR;
        ctx.fillRect(charX - 4, charY - 8, gridCharWidth - 4, gridCharHeight - 2);
        ctx.fillStyle = config.BG_COLOR;
      } else {
        ctx.fillStyle = config.SLOT_TEXT_COLOR;
      }

      ctx.textAlign = 'left';
      ctx.fillText(charLabel, charX, charY);
    }

    // Instructions
    ctx.font = config.SMALL_FONT;
    ctx.fillStyle = config.SLOT_TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.fillText('A: SELECT   B: DELETE   START: CONFIRM', SCREEN_WIDTH / 2, 220);
  }

  /**
   * Render ELIMINATE mode
   */
  private renderEliminateMode(ctx: CanvasRenderingContext2D): void {
    const config = FILE_SELECT_CONFIG;
    const saveSystem = getSaveSystem();
    const files = saveSystem.getFiles();

    // Title - in red for danger
    ctx.font = config.TITLE_FONT;
    ctx.fillStyle = config.DANGER_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.ELIMINATE_TEXT, SCREEN_WIDTH / 2, config.TITLE_Y);

    // Warning text
    ctx.font = config.SMALL_FONT;
    ctx.fillStyle = config.DANGER_COLOR;
    ctx.fillText('SELECT FILE TO DELETE', SCREEN_WIDTH / 2, config.TITLE_Y + 16);

    // Save slots
    ctx.font = config.SLOT_FONT;
    for (let i = 0; i < SAVE_SLOTS; i++) {
      const file = files[i] ?? null;
      const y = config.FIRST_SLOT_Y + i * config.SLOT_SPACING;
      const isSelected = this.selectedIndex === i;

      this.renderSlot(ctx, i, file, y, isSelected);
    }

    // END option
    const endY = config.REGISTER_OPTION_Y;
    const endSelected = this.selectedIndex === SAVE_SLOTS;
    ctx.textAlign = 'center';
    ctx.fillStyle = endSelected ? config.SELECTED_COLOR : config.SLOT_TEXT_COLOR;
    ctx.fillText(config.END_ELIMINATE_TEXT, SCREEN_WIDTH / 2, endY);
    if (endSelected && this.cursorVisible) {
      this.renderCursor(ctx, SCREEN_WIDTH / 2 - 24, endY);
    }
  }

  /**
   * Renders the selection cursor
   */
  private renderCursor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = FILE_SELECT_CONFIG.CURSOR_COLOR;

    // Draw a simple arrow/triangle cursor pointing right
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.closePath();
    ctx.fill();
  }

  // ===== TEST HELPERS =====

  /**
   * Gets the current mode (for testing)
   */
  getMode(): FileSelectMode {
    return this.mode;
  }

  /**
   * Gets the current selected index (for testing)
   */
  getSelectedIndex(): number {
    return this.selectedIndex;
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
   * Gets the entered name during registration (for testing)
   */
  getEnteredName(): string {
    return this.enteredName;
  }

  /**
   * Gets the register target slot (for testing)
   */
  getRegisterTargetSlot(): number {
    return this.registerTargetSlot;
  }

  /**
   * Gets the character selection index (for testing)
   */
  getCharSelectIndex(): number {
    return this.charSelectIndex;
  }

  /**
   * Sets the selected index (for testing)
   */
  setSelectedIndex(index: number): void {
    this.selectedIndex = index;
  }

  /**
   * Sets the mode (for testing)
   */
  setMode(mode: FileSelectMode): void {
    this.mode = mode;
  }

  /**
   * Sets the entered name (for testing)
   */
  setEnteredName(name: string): void {
    this.enteredName = name;
  }

  /**
   * Sets the register target slot (for testing)
   */
  setRegisterTargetSlot(slot: number): void {
    this.registerTargetSlot = slot;
  }

  /**
   * Sets the character selection index (for testing)
   */
  setCharSelectIndex(index: number): void {
    this.charSelectIndex = index;
  }

  /**
   * Gets whether in character selection mode (for testing)
   */
  isInCharSelectMode(): boolean {
    return this.isSelectingChar;
  }
}

// ===== SINGLETON PATTERN =====

let fileSelectScreenInstance: FileSelectScreen | null = null;

/**
 * Gets the singleton FileSelectScreen instance
 */
export function getFileSelectScreen(): FileSelectScreen {
  if (!fileSelectScreenInstance) {
    fileSelectScreenInstance = new FileSelectScreen();
  }
  return fileSelectScreenInstance;
}

/**
 * Resets the singleton FileSelectScreen instance (for testing)
 */
export function resetFileSelectScreen(): void {
  fileSelectScreenInstance = null;
}
