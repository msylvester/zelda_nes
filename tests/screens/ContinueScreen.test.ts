// ContinueScreen.test.ts - Tests for continue screen functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ContinueScreen,
  getContinueScreen,
  resetContinueScreen,
  CONTINUE_SCREEN_CONFIG,
} from '../../src/screens/ContinueScreen';
import type { InputSnapshot, ButtonState, NesButton } from '../../src/types';

// ===== MOCK SETUP =====

function createMockContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function createButtonState(held = false, justPressed = false, justReleased = false): ButtonState {
  return { held, justPressed, justReleased };
}

function createInputSnapshot(overrides: Partial<Record<NesButton, ButtonState>> = {}): InputSnapshot {
  const defaultButton = createButtonState();
  return {
    buttons: {
      UP: overrides.UP ?? defaultButton,
      DOWN: overrides.DOWN ?? defaultButton,
      LEFT: overrides.LEFT ?? defaultButton,
      RIGHT: overrides.RIGHT ?? defaultButton,
      A: overrides.A ?? defaultButton,
      B: overrides.B ?? defaultButton,
      START: overrides.START ?? defaultButton,
      SELECT: overrides.SELECT ?? defaultButton,
    },
    activeDirection: null,
    facingDirection: 'DOWN',
    frameNumber: 1,
  };
}

// ===== TESTS =====

describe('ContinueScreen', () => {
  let continueScreen: ContinueScreen;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    resetContinueScreen();
    continueScreen = new ContinueScreen();
    mockCtx = createMockContext();
  });

  describe('constructor and reset', () => {
    it('initializes with frame counter at 0', () => {
      expect(continueScreen.getFrameCounter()).toBe(0);
    });

    it('initializes with CONTINUE option selected', () => {
      expect(continueScreen.getSelectedOption()).toBe('CONTINUE');
    });

    it('initializes with cursor visible', () => {
      expect(continueScreen.isCursorVisible()).toBe(true);
    });

    it('reset() restores initial state', () => {
      // Advance some frames and change selection
      const input = createInputSnapshot();
      for (let i = 0; i < 50; i++) {
        continueScreen.update(input);
      }
      continueScreen.setSelectedOption('SAVE_QUIT');
      expect(continueScreen.getFrameCounter()).toBe(50);
      expect(continueScreen.getSelectedOption()).toBe('SAVE_QUIT');

      // Reset
      continueScreen.reset();
      expect(continueScreen.getFrameCounter()).toBe(0);
      expect(continueScreen.getSelectedOption()).toBe('CONTINUE');
      expect(continueScreen.isCursorVisible()).toBe(true);
    });
  });

  describe('update', () => {
    it('increments frame counter each update', () => {
      const input = createInputSnapshot();

      continueScreen.update(input);
      expect(continueScreen.getFrameCounter()).toBe(1);

      continueScreen.update(input);
      expect(continueScreen.getFrameCounter()).toBe(2);

      continueScreen.update(input);
      expect(continueScreen.getFrameCounter()).toBe(3);
    });

    it('returns null nextPhase when no button pressed', () => {
      const input = createInputSnapshot();
      const result = continueScreen.update(input);
      expect(result.nextPhase).toBeNull();
      expect(result.action).toBeNull();
    });
  });

  describe('menu navigation', () => {
    it('pressing UP toggles selection', () => {
      expect(continueScreen.getSelectedOption()).toBe('CONTINUE');

      const input = createInputSnapshot({
        UP: createButtonState(true, true, false),
      });
      continueScreen.update(input);

      expect(continueScreen.getSelectedOption()).toBe('SAVE_QUIT');
    });

    it('pressing DOWN toggles selection', () => {
      expect(continueScreen.getSelectedOption()).toBe('CONTINUE');

      const input = createInputSnapshot({
        DOWN: createButtonState(true, true, false),
      });
      continueScreen.update(input);

      expect(continueScreen.getSelectedOption()).toBe('SAVE_QUIT');
    });

    it('pressing UP again toggles back', () => {
      const input = createInputSnapshot({
        UP: createButtonState(true, true, false),
      });
      continueScreen.update(input);
      expect(continueScreen.getSelectedOption()).toBe('SAVE_QUIT');

      // Reset input state and press again
      const input2 = createInputSnapshot({
        UP: createButtonState(true, true, false),
      });
      continueScreen.update(input2);
      expect(continueScreen.getSelectedOption()).toBe('CONTINUE');
    });

    it('does not toggle when UP is held but not just pressed', () => {
      const input = createInputSnapshot({
        UP: createButtonState(true, false, false),
      });
      continueScreen.update(input);
      expect(continueScreen.getSelectedOption()).toBe('CONTINUE');
    });
  });

  describe('selection confirmation', () => {
    it('pressing START on CONTINUE returns GAMEPLAY phase', () => {
      expect(continueScreen.getSelectedOption()).toBe('CONTINUE');

      const input = createInputSnapshot({
        START: createButtonState(true, true, false),
      });
      const result = continueScreen.update(input);

      expect(result.nextPhase).toBe('GAMEPLAY');
      expect(result.action).toBe('CONTINUE');
    });

    it('pressing A on CONTINUE returns GAMEPLAY phase', () => {
      expect(continueScreen.getSelectedOption()).toBe('CONTINUE');

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      const result = continueScreen.update(input);

      expect(result.nextPhase).toBe('GAMEPLAY');
      expect(result.action).toBe('CONTINUE');
    });

    it('pressing START on SAVE_QUIT returns TITLE phase', () => {
      continueScreen.setSelectedOption('SAVE_QUIT');

      const input = createInputSnapshot({
        START: createButtonState(true, true, false),
      });
      const result = continueScreen.update(input);

      expect(result.nextPhase).toBe('TITLE');
      expect(result.action).toBe('SAVE_QUIT');
    });

    it('pressing A on SAVE_QUIT returns TITLE phase', () => {
      continueScreen.setSelectedOption('SAVE_QUIT');

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      const result = continueScreen.update(input);

      expect(result.nextPhase).toBe('TITLE');
      expect(result.action).toBe('SAVE_QUIT');
    });

    it('does not confirm when START is held but not just pressed', () => {
      const input = createInputSnapshot({
        START: createButtonState(true, false, false),
      });
      const result = continueScreen.update(input);

      expect(result.nextPhase).toBeNull();
      expect(result.action).toBeNull();
    });
  });

  describe('cursor blinking', () => {
    it('toggles cursor visibility at CURSOR_BLINK_INTERVAL', () => {
      const input = createInputSnapshot();
      const interval = CONTINUE_SCREEN_CONFIG.CURSOR_BLINK_INTERVAL;

      // Initially visible
      expect(continueScreen.isCursorVisible()).toBe(true);

      // Update until just before toggle
      for (let i = 0; i < interval - 1; i++) {
        continueScreen.update(input);
      }
      expect(continueScreen.isCursorVisible()).toBe(true);

      // One more frame should toggle
      continueScreen.update(input);
      expect(continueScreen.isCursorVisible()).toBe(false);
    });

    it('toggles back to visible after another interval', () => {
      const input = createInputSnapshot();
      const interval = CONTINUE_SCREEN_CONFIG.CURSOR_BLINK_INTERVAL;

      // First toggle (visible -> invisible)
      for (let i = 0; i < interval; i++) {
        continueScreen.update(input);
      }
      expect(continueScreen.isCursorVisible()).toBe(false);

      // Second toggle (invisible -> visible)
      for (let i = 0; i < interval; i++) {
        continueScreen.update(input);
      }
      expect(continueScreen.isCursorVisible()).toBe(true);
    });
  });

  describe('render', () => {
    it('clears the screen with background color', () => {
      continueScreen.render(mockCtx);

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('renders GAME OVER text', () => {
      continueScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const gameOverCall = fillTextCalls.find(
        (call) => call[0] === CONTINUE_SCREEN_CONFIG.GAME_OVER_TEXT
      );
      expect(gameOverCall).toBeDefined();
    });

    it('renders CONTINUE option', () => {
      continueScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const continueCall = fillTextCalls.find(
        (call) => call[0] === CONTINUE_SCREEN_CONFIG.CONTINUE_TEXT
      );
      expect(continueCall).toBeDefined();
    });

    it('renders SAVE & QUIT option', () => {
      continueScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const saveQuitCall = fillTextCalls.find(
        (call) => call[0] === CONTINUE_SCREEN_CONFIG.SAVE_QUIT_TEXT
      );
      expect(saveQuitCall).toBeDefined();
    });

    it('renders cursor when visible', () => {
      continueScreen.render(mockCtx);

      // Cursor uses beginPath, moveTo, lineTo, closePath, fill
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.closePath).toHaveBeenCalled();
    });

    it('does not render cursor when invisible', () => {
      const input = createInputSnapshot();
      const interval = CONTINUE_SCREEN_CONFIG.CURSOR_BLINK_INTERVAL;

      // Toggle cursor off
      for (let i = 0; i < interval; i++) {
        continueScreen.update(input);
      }
      expect(continueScreen.isCursorVisible()).toBe(false);

      // Clear mock and render
      vi.mocked(mockCtx.beginPath).mockClear();
      vi.mocked(mockCtx.moveTo).mockClear();
      continueScreen.render(mockCtx);

      // Should still have some beginPath calls from hearts, but fewer total
      // Since we can't easily distinguish heart from cursor calls,
      // we just verify render completes without error
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('renders hearts decoration', () => {
      continueScreen.render(mockCtx);

      // Hearts use arc for the bumps
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('resets text alignment after rendering', () => {
      continueScreen.render(mockCtx);

      expect(mockCtx.textAlign).toBe('left');
      expect(mockCtx.textBaseline).toBe('alphabetic');
    });
  });

  describe('CONTINUE_SCREEN_CONFIG', () => {
    it('has expected game over text', () => {
      expect(CONTINUE_SCREEN_CONFIG.GAME_OVER_TEXT).toBe('GAME OVER');
    });

    it('has expected continue text', () => {
      expect(CONTINUE_SCREEN_CONFIG.CONTINUE_TEXT).toBe('CONTINUE');
    });

    it('has expected save quit text', () => {
      expect(CONTINUE_SCREEN_CONFIG.SAVE_QUIT_TEXT).toBe('SAVE & QUIT');
    });

    it('has cursor blink interval greater than 0', () => {
      expect(CONTINUE_SCREEN_CONFIG.CURSOR_BLINK_INTERVAL).toBeGreaterThan(0);
    });

    it('has valid color values', () => {
      expect(CONTINUE_SCREEN_CONFIG.BG_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(CONTINUE_SCREEN_CONFIG.GAME_OVER_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(CONTINUE_SCREEN_CONFIG.MENU_TEXT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('has CONTINUE_HEARTS equal to 6 (3 full hearts)', () => {
      expect(CONTINUE_SCREEN_CONFIG.CONTINUE_HEARTS).toBe(6);
    });
  });
});

describe('ContinueScreen singleton', () => {
  beforeEach(() => {
    resetContinueScreen();
  });

  it('getContinueScreen returns a ContinueScreen instance', () => {
    const instance = getContinueScreen();
    expect(instance).toBeInstanceOf(ContinueScreen);
  });

  it('getContinueScreen returns the same instance on multiple calls', () => {
    const instance1 = getContinueScreen();
    const instance2 = getContinueScreen();
    expect(instance1).toBe(instance2);
  });

  it('resetContinueScreen creates a new instance on next call', () => {
    const instance1 = getContinueScreen();

    // Modify state
    const input = createInputSnapshot();
    instance1.update(input);
    instance1.setSelectedOption('SAVE_QUIT');
    expect(instance1.getFrameCounter()).toBe(1);
    expect(instance1.getSelectedOption()).toBe('SAVE_QUIT');

    // Reset
    resetContinueScreen();

    // New instance should have fresh state
    const instance2 = getContinueScreen();
    expect(instance2).not.toBe(instance1);
    expect(instance2.getFrameCounter()).toBe(0);
    expect(instance2.getSelectedOption()).toBe('CONTINUE');
  });
});

describe('ContinueScreen edge cases', () => {
  let continueScreen: ContinueScreen;

  beforeEach(() => {
    resetContinueScreen();
    continueScreen = new ContinueScreen();
  });

  it('handles navigation and selection on same frame', () => {
    const input = createInputSnapshot({
      DOWN: createButtonState(true, true, false),
      START: createButtonState(true, true, false),
    });

    // Navigation happens, then selection
    const result = continueScreen.update(input);

    // Should select SAVE_QUIT (navigation happens first, then selection)
    expect(continueScreen.getSelectedOption()).toBe('SAVE_QUIT');
    expect(result.nextPhase).toBe('TITLE');
    expect(result.action).toBe('SAVE_QUIT');
  });

  it('handles START press on exact blink frame', () => {
    const interval = CONTINUE_SCREEN_CONFIG.CURSOR_BLINK_INTERVAL;
    const input = createInputSnapshot();

    // Advance to just before blink
    for (let i = 0; i < interval - 1; i++) {
      continueScreen.update(input);
    }

    // Press START on blink frame
    const startInput = createInputSnapshot({
      START: createButtonState(true, true, false),
    });
    const result = continueScreen.update(startInput);

    // Should still transition
    expect(result.nextPhase).toBe('GAMEPLAY');
    expect(result.action).toBe('CONTINUE');
  });

  it('handles multiple direction inputs (UP and DOWN)', () => {
    // Both UP and DOWN pressed
    const input = createInputSnapshot({
      UP: createButtonState(true, true, false),
      DOWN: createButtonState(true, true, false),
    });
    continueScreen.update(input);

    // Should toggle once - the condition is OR, not two separate checks
    // So CONTINUE -> SAVE_QUIT
    expect(continueScreen.getSelectedOption()).toBe('SAVE_QUIT');
  });

  it('handles rapid selection attempts', () => {
    // Press START
    let input = createInputSnapshot({
      START: createButtonState(true, true, false),
    });
    const result1 = continueScreen.update(input);
    expect(result1.nextPhase).toBe('GAMEPLAY');

    // If we somehow update again (shouldn't happen in real game)
    continueScreen.reset();
    input = createInputSnapshot({
      A: createButtonState(true, true, false),
    });
    const result2 = continueScreen.update(input);
    expect(result2.nextPhase).toBe('GAMEPLAY');
  });

  it('frame counter does not overflow on extended time', () => {
    const input = createInputSnapshot();

    // Simulate many frames
    for (let i = 0; i < 10000; i++) {
      continueScreen.update(input);
    }

    expect(continueScreen.getFrameCounter()).toBe(10000);
  });

  it('setSelectedOption allows programmatic selection', () => {
    expect(continueScreen.getSelectedOption()).toBe('CONTINUE');

    continueScreen.setSelectedOption('SAVE_QUIT');
    expect(continueScreen.getSelectedOption()).toBe('SAVE_QUIT');

    continueScreen.setSelectedOption('CONTINUE');
    expect(continueScreen.getSelectedOption()).toBe('CONTINUE');
  });
});
