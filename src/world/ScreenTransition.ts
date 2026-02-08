// ScreenTransition.ts - Screen transition logic for scrolling between screens
// Handles scroll, fade, and wipe transitions per spec section 5.14

import {
  SCROLL_SPEED,
  HORIZONTAL_SCROLL_FRAMES,
  VERTICAL_SCROLL_FRAMES,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
  TILE_SIZE,
} from '../constants';
import type { Direction, TileData, TransitionType, ScreenTransitionData } from '../types';

/**
 * Transition type options:
 * - SCROLL: Smooth screen scroll (overworld)
 * - FADE: Fade to black and back (dungeon room change)
 * - WIPE: Column wipe effect (cave/dungeon entry)
 */
export type ScreenTransitionType = 'SCROLL' | 'FADE' | 'WIPE';

/**
 * Configuration for starting a screen transition
 */
export interface TransitionConfig {
  type: ScreenTransitionType;
  direction: Direction;
  fromScreenCol: number;
  fromScreenRow: number;
  toScreenCol: number;
  toScreenRow: number;
  fromTiles: TileData[];
  toTiles: TileData[];
}

/**
 * Current state of the transition
 */
export interface TransitionState {
  /** Whether a transition is currently active */
  active: boolean;
  /** Type of transition (SCROLL, FADE, WIPE) */
  type: ScreenTransitionType;
  /** Direction of the transition */
  direction: Direction;
  /** Current frame of the transition */
  currentFrame: number;
  /** Total frames for this transition */
  totalFrames: number;
  /** Source screen column */
  fromScreenCol: number;
  /** Source screen row */
  fromScreenRow: number;
  /** Target screen column */
  toScreenCol: number;
  /** Target screen row */
  toScreenRow: number;
  /** Tiles of the source screen */
  fromTiles: TileData[];
  /** Tiles of the target screen */
  toTiles: TileData[];
}

/**
 * Scroll offset for rendering during transitions
 */
export interface ScrollOffset {
  x: number;
  y: number;
}

/**
 * Player position adjustment after transition completes
 */
export interface PlayerPositionAfterTransition {
  x: number;
  y: number;
}

/**
 * Manages screen transitions (scrolling, fading, wiping)
 * During TRANSITION phase, this class controls the visual effect and timing
 */
export class ScreenTransition {
  private state: TransitionState;

  constructor() {
    this.state = this.createInactiveState();
  }

  /**
   * Creates an inactive/default state
   */
  private createInactiveState(): TransitionState {
    return {
      active: false,
      type: 'SCROLL',
      direction: 'RIGHT',
      currentFrame: 0,
      totalFrames: 0,
      fromScreenCol: 0,
      fromScreenRow: 0,
      toScreenCol: 0,
      toScreenRow: 0,
      fromTiles: [],
      toTiles: [],
    };
  }

  /**
   * Starts a new screen transition
   * @param config Transition configuration
   */
  start(config: TransitionConfig): void {
    this.state = {
      active: true,
      type: config.type,
      direction: config.direction,
      currentFrame: 0,
      totalFrames: this.computeTotalFrames(config.type, config.direction),
      fromScreenCol: config.fromScreenCol,
      fromScreenRow: config.fromScreenRow,
      toScreenCol: config.toScreenCol,
      toScreenRow: config.toScreenRow,
      fromTiles: config.fromTiles,
      toTiles: config.toTiles,
    };
  }

  /**
   * Advances the transition by one frame
   * Call this each frame while in TRANSITION phase
   */
  update(): void {
    if (!this.state.active) return;

    this.state.currentFrame++;

    // Check if transition is complete
    if (this.state.currentFrame >= this.state.totalFrames) {
      // Transition will be finalized externally
    }
  }

  /**
   * Checks if the transition has completed
   */
  isComplete(): boolean {
    return this.state.active && this.state.currentFrame >= this.state.totalFrames;
  }

  /**
   * Checks if a transition is currently active
   */
  isActive(): boolean {
    return this.state.active;
  }

  /**
   * Gets the current transition state
   */
  getState(): Readonly<TransitionState> {
    return this.state;
  }

  /**
   * Gets the scroll offset for rendering
   * Used to position both screens during scroll transition
   */
  getScrollOffset(): ScrollOffset {
    if (!this.state.active || this.state.type !== 'SCROLL') {
      return { x: 0, y: 0 };
    }

    const pixels = this.state.currentFrame * SCROLL_SPEED;

    // Normalize to avoid -0 which causes issues with deep equality
    const normalize = (n: number): number => (n === 0 ? 0 : n);

    switch (this.state.direction) {
      case 'LEFT':
        // Scrolling left means the view moves left, so offset is positive
        return { x: normalize(pixels), y: 0 };
      case 'RIGHT':
        // Scrolling right means the view moves right, so offset is negative
        return { x: normalize(-pixels), y: 0 };
      case 'UP':
        // Scrolling up means the view moves up, so offset is positive
        return { x: 0, y: normalize(pixels) };
      case 'DOWN':
        // Scrolling down means the view moves down, so offset is negative
        return { x: 0, y: normalize(-pixels) };
    }
  }

  /**
   * Gets the position to render the "from" screen during scroll
   */
  getFromScreenPosition(): ScrollOffset {
    return this.getScrollOffset();
  }

  /**
   * Gets the position to render the "to" screen during scroll
   */
  getToScreenPosition(): ScrollOffset {
    if (!this.state.active || this.state.type !== 'SCROLL') {
      return { x: 0, y: 0 };
    }

    const offset = this.getScrollOffset();

    switch (this.state.direction) {
      case 'LEFT':
        // New screen comes from the left, so it starts at -PLAY_AREA_WIDTH
        return { x: offset.x - PLAY_AREA_WIDTH, y: 0 };
      case 'RIGHT':
        // New screen comes from the right, so it starts at +PLAY_AREA_WIDTH
        return { x: offset.x + PLAY_AREA_WIDTH, y: 0 };
      case 'UP':
        // New screen comes from above, so it starts at -PLAY_AREA_HEIGHT
        return { x: 0, y: offset.y - PLAY_AREA_HEIGHT };
      case 'DOWN':
        // New screen comes from below, so it starts at +PLAY_AREA_HEIGHT
        return { x: 0, y: offset.y + PLAY_AREA_HEIGHT };
    }
  }

  /**
   * Gets the fade alpha for FADE transitions
   * 0 = fully visible, 1 = fully black
   */
  getFadeAlpha(): number {
    if (!this.state.active || this.state.type !== 'FADE') {
      return 0;
    }

    // FADE transition: 4 frames fade out, 1 frame load, 4 frames fade in
    // Total: 9 frames
    // Frames 0-3: fade out (alpha 0 -> 1)
    // Frame 4: fully black (load happens here)
    // Frames 5-8: fade in (alpha 1 -> 0)

    const frame = this.state.currentFrame;

    if (frame <= 3) {
      // Fade out: 0, 0.25, 0.5, 0.75, 1
      return (frame + 1) / 4;
    } else if (frame === 4) {
      // Fully black
      return 1;
    } else {
      // Fade in: frames 5-8
      // frame 5 = alpha 0.75, frame 6 = 0.5, frame 7 = 0.25, frame 8 = 0
      return 1 - ((frame - 4) / 4);
    }
  }

  /**
   * Gets the wipe progress for WIPE transitions
   * 0 = fully open, 1 = fully closed
   */
  getWipeProgress(): { progress: number; closing: boolean } {
    if (!this.state.active || this.state.type !== 'WIPE') {
      return { progress: 0, closing: false };
    }

    // WIPE transition: 16 frames close, 1 frame load, 16 frames open
    // Total: 33 frames

    const frame = this.state.currentFrame;

    if (frame <= 15) {
      // Closing: progress 0 -> 1
      return { progress: (frame + 1) / 16, closing: true };
    } else if (frame === 16) {
      // Fully closed (load happens here)
      return { progress: 1, closing: true };
    } else {
      // Opening: progress 1 -> 0 (frames 17-32)
      return { progress: 1 - ((frame - 16) / 16), closing: false };
    }
  }

  /**
   * Checks if we're at the "load point" where the new screen should be loaded
   * For SCROLL: never (both screens rendered simultaneously)
   * For FADE: at frame 4
   * For WIPE: at frame 16
   */
  shouldLoadNewScreen(): boolean {
    if (!this.state.active) return false;

    switch (this.state.type) {
      case 'SCROLL':
        // For scroll, we don't need a specific load point - both are rendered
        // But we consider the halfway point for any needed updates
        return this.state.currentFrame === Math.floor(this.state.totalFrames / 2);
      case 'FADE':
        return this.state.currentFrame === 4;
      case 'WIPE':
        return this.state.currentFrame === 16;
    }
  }

  /**
   * Gets the player position during scroll transition
   * The player moves smoothly during the scroll
   */
  getPlayerPositionDuringTransition(startX: number, startY: number): { x: number; y: number } {
    if (!this.state.active || this.state.type !== 'SCROLL') {
      return { x: startX, y: startY };
    }

    // Player moves with the scroll
    const offset = this.getScrollOffset();
    return {
      x: startX + offset.x,
      y: startY + offset.y,
    };
  }

  /**
   * Calculates the player's position after the transition completes
   * @param direction Direction of the transition
   * @param currentX Current player X position (sprite top-left)
   * @param currentY Current player Y position (sprite top-left)
   */
  getPlayerPositionAfterTransition(
    direction: Direction,
    currentX: number,
    currentY: number
  ): PlayerPositionAfterTransition {
    // After transition, player should appear at the opposite edge
    switch (direction) {
      case 'LEFT':
        // Went left, so appear on the right edge of the new screen
        return {
          x: PLAY_AREA_WIDTH - TILE_SIZE,
          y: currentY,
        };
      case 'RIGHT':
        // Went right, so appear on the left edge
        return {
          x: 0,
          y: currentY,
        };
      case 'UP':
        // Went up, so appear at the bottom
        return {
          x: currentX,
          y: PLAY_AREA_HEIGHT - TILE_SIZE,
        };
      case 'DOWN':
        // Went down, so appear at the top
        return {
          x: currentX,
          y: 0,
        };
    }
  }

  /**
   * Finalizes the transition and resets state
   * Returns the target screen coordinates
   */
  finalize(): { col: number; row: number } {
    const result = {
      col: this.state.toScreenCol,
      row: this.state.toScreenRow,
    };
    this.state = this.createInactiveState();
    return result;
  }

  /**
   * Cancels the current transition (if any)
   */
  cancel(): void {
    this.state = this.createInactiveState();
  }

  /**
   * Gets the target screen coordinates
   */
  getTargetScreen(): { col: number; row: number } {
    return {
      col: this.state.toScreenCol,
      row: this.state.toScreenRow,
    };
  }

  /**
   * Gets the source screen coordinates
   */
  getSourceScreen(): { col: number; row: number } {
    return {
      col: this.state.fromScreenCol,
      row: this.state.fromScreenRow,
    };
  }

  /**
   * Gets the tiles for the source screen (for rendering during scroll)
   */
  getFromTiles(): TileData[] {
    return this.state.fromTiles;
  }

  /**
   * Gets the tiles for the target screen (for rendering during scroll)
   */
  getToTiles(): TileData[] {
    return this.state.toTiles;
  }

  /**
   * Gets the transition progress as a value from 0 to 1
   */
  getProgress(): number {
    if (!this.state.active || this.state.totalFrames === 0) {
      return 0;
    }
    return Math.min(1, this.state.currentFrame / this.state.totalFrames);
  }

  /**
   * Gets the current frame of the transition
   */
  getCurrentFrame(): number {
    return this.state.currentFrame;
  }

  /**
   * Gets the total frames for the transition
   */
  getTotalFrames(): number {
    return this.state.totalFrames;
  }

  /**
   * Gets the direction of the current transition
   */
  getDirection(): Direction {
    return this.state.direction;
  }

  /**
   * Gets the type of the current transition
   */
  getType(): ScreenTransitionType {
    return this.state.type;
  }

  /**
   * Creates a ScreenTransitionData object for the types system
   */
  toScreenTransitionData(): ScreenTransitionData {
    return {
      type: this.state.type as TransitionType,
      direction: this.state.direction,
      fromScreenCol: this.state.fromScreenCol,
      fromScreenRow: this.state.fromScreenRow,
      toScreenCol: this.state.toScreenCol,
      toScreenRow: this.state.toScreenRow,
      progress: this.getProgress(),
      totalFrames: this.state.totalFrames,
    };
  }

  /**
   * Computes the total frames for a transition type
   */
  private computeTotalFrames(type: ScreenTransitionType, direction: Direction): number {
    switch (type) {
      case 'SCROLL':
        // Horizontal: 256px / 4px per frame = 64 frames
        // Vertical: 176px / 4px per frame = 44 frames
        if (direction === 'LEFT' || direction === 'RIGHT') {
          return HORIZONTAL_SCROLL_FRAMES;
        } else {
          return VERTICAL_SCROLL_FRAMES;
        }
      case 'FADE':
        // 4 fade-out + 1 load + 4 fade-in = 9 frames
        return 9;
      case 'WIPE':
        // 16 close + 1 load + 16 open = 33 frames
        return 33;
    }
  }
}

// Singleton instance
let screenTransitionInstance: ScreenTransition | null = null;

/**
 * Gets the singleton ScreenTransition instance
 */
export function getScreenTransition(): ScreenTransition {
  if (!screenTransitionInstance) {
    screenTransitionInstance = new ScreenTransition();
  }
  return screenTransitionInstance;
}

/**
 * Resets the singleton instance (for testing)
 */
export function resetScreenTransition(): void {
  screenTransitionInstance = null;
}
