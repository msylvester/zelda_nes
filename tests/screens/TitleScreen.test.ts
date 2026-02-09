// TitleScreen.test.ts - Tests for title screen functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TitleScreen,
  getTitleScreen,
  resetTitleScreen,
  TITLE_SCREEN_CONFIG,
} from '../../src/screens/TitleScreen';
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

describe('TitleScreen', () => {
  let titleScreen: TitleScreen;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    resetTitleScreen();
    titleScreen = new TitleScreen();
    mockCtx = createMockContext();
  });

  describe('constructor and reset', () => {
    it('initializes with frame counter at 0', () => {
      expect(titleScreen.getFrameCounter()).toBe(0);
    });

    it('initializes with prompt visible', () => {
      expect(titleScreen.isPromptVisible()).toBe(true);
    });

    it('reset() restores initial state', () => {
      // Advance some frames
      const input = createInputSnapshot();
      for (let i = 0; i < 50; i++) {
        titleScreen.update(input);
      }
      expect(titleScreen.getFrameCounter()).toBe(50);

      // Reset
      titleScreen.reset();
      expect(titleScreen.getFrameCounter()).toBe(0);
      expect(titleScreen.isPromptVisible()).toBe(true);
    });
  });

  describe('update', () => {
    it('increments frame counter each update', () => {
      const input = createInputSnapshot();

      titleScreen.update(input);
      expect(titleScreen.getFrameCounter()).toBe(1);

      titleScreen.update(input);
      expect(titleScreen.getFrameCounter()).toBe(2);

      titleScreen.update(input);
      expect(titleScreen.getFrameCounter()).toBe(3);
    });

    it('returns null nextPhase when no Start pressed', () => {
      const input = createInputSnapshot();
      const result = titleScreen.update(input);
      expect(result.nextPhase).toBeNull();
    });

    it('returns FILE_SELECT when Start is pressed', () => {
      const input = createInputSnapshot({
        START: createButtonState(true, true, false),
      });
      const result = titleScreen.update(input);
      expect(result.nextPhase).toBe('FILE_SELECT');
    });

    it('does not transition when Start is held but not just pressed', () => {
      const input = createInputSnapshot({
        START: createButtonState(true, false, false),
      });
      const result = titleScreen.update(input);
      expect(result.nextPhase).toBeNull();
    });

    it('does not transition when Start is released', () => {
      const input = createInputSnapshot({
        START: createButtonState(false, false, true),
      });
      const result = titleScreen.update(input);
      expect(result.nextPhase).toBeNull();
    });
  });

  describe('prompt blinking', () => {
    it('toggles prompt visibility at PROMPT_BLINK_INTERVAL', () => {
      const input = createInputSnapshot();
      const interval = TITLE_SCREEN_CONFIG.PROMPT_BLINK_INTERVAL;

      // Initially visible
      expect(titleScreen.isPromptVisible()).toBe(true);

      // Update until just before toggle
      for (let i = 0; i < interval - 1; i++) {
        titleScreen.update(input);
      }
      expect(titleScreen.isPromptVisible()).toBe(true);

      // One more frame should toggle
      titleScreen.update(input);
      expect(titleScreen.isPromptVisible()).toBe(false);
    });

    it('toggles back to visible after another interval', () => {
      const input = createInputSnapshot();
      const interval = TITLE_SCREEN_CONFIG.PROMPT_BLINK_INTERVAL;

      // First toggle (visible -> invisible)
      for (let i = 0; i < interval; i++) {
        titleScreen.update(input);
      }
      expect(titleScreen.isPromptVisible()).toBe(false);

      // Second toggle (invisible -> visible)
      for (let i = 0; i < interval; i++) {
        titleScreen.update(input);
      }
      expect(titleScreen.isPromptVisible()).toBe(true);
    });

    it('continues blinking pattern correctly', () => {
      const input = createInputSnapshot();
      const interval = TITLE_SCREEN_CONFIG.PROMPT_BLINK_INTERVAL;

      // Cycle through multiple toggles
      const states: boolean[] = [titleScreen.isPromptVisible()];
      for (let cycle = 0; cycle < 4; cycle++) {
        for (let i = 0; i < interval; i++) {
          titleScreen.update(input);
        }
        states.push(titleScreen.isPromptVisible());
      }

      // Should alternate: true, false, true, false, true
      expect(states).toEqual([true, false, true, false, true]);
    });
  });

  describe('render', () => {
    it('clears the screen with background color', () => {
      titleScreen.render(mockCtx);

      expect(mockCtx.fillStyle).not.toBe(''); // Some color was set
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('sets text alignment to center for title', () => {
      titleScreen.render(mockCtx);

      // Check that text was rendered (fillText was called)
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('renders title text', () => {
      titleScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const titleCall = fillTextCalls.find(
        (call) => call[0] === TITLE_SCREEN_CONFIG.TITLE_TEXT
      );
      expect(titleCall).toBeDefined();
    });

    it('renders subtitle text', () => {
      titleScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const subtitleCall = fillTextCalls.find(
        (call) => call[0] === TITLE_SCREEN_CONFIG.SUBTITLE_TEXT
      );
      expect(subtitleCall).toBeDefined();
    });

    it('renders prompt text when visible', () => {
      titleScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const promptCall = fillTextCalls.find(
        (call) => call[0] === TITLE_SCREEN_CONFIG.PROMPT_TEXT
      );
      expect(promptCall).toBeDefined();
    });

    it('does not render prompt text when invisible', () => {
      const input = createInputSnapshot();
      const interval = TITLE_SCREEN_CONFIG.PROMPT_BLINK_INTERVAL;

      // Toggle prompt off
      for (let i = 0; i < interval; i++) {
        titleScreen.update(input);
      }
      expect(titleScreen.isPromptVisible()).toBe(false);

      // Clear mock and render
      vi.mocked(mockCtx.fillText).mockClear();
      titleScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const promptCall = fillTextCalls.find(
        (call) => call[0] === TITLE_SCREEN_CONFIG.PROMPT_TEXT
      );
      expect(promptCall).toBeUndefined();
    });

    it('renders Triforce decoration', () => {
      titleScreen.render(mockCtx);

      // Triforce rendering uses beginPath, moveTo, lineTo, fill
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('draws three triangles for Triforce', () => {
      titleScreen.render(mockCtx);

      // Each triangle calls closePath and fill once
      // 3 triangles = 3 calls to closePath, 3 calls to fill
      expect(vi.mocked(mockCtx.closePath).mock.calls.length).toBe(3);
      expect(vi.mocked(mockCtx.fill).mock.calls.length).toBe(3);
    });

    it('resets text alignment after rendering', () => {
      titleScreen.render(mockCtx);

      // After render, textAlign should be reset to 'left'
      expect(mockCtx.textAlign).toBe('left');
      expect(mockCtx.textBaseline).toBe('alphabetic');
    });
  });

  describe('TITLE_SCREEN_CONFIG', () => {
    it('has expected title text', () => {
      expect(TITLE_SCREEN_CONFIG.TITLE_TEXT).toBe('THE LEGEND OF ZELDA');
    });

    it('has prompt blink interval greater than 0', () => {
      expect(TITLE_SCREEN_CONFIG.PROMPT_BLINK_INTERVAL).toBeGreaterThan(0);
    });

    it('has valid color values', () => {
      expect(TITLE_SCREEN_CONFIG.BG_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(TITLE_SCREEN_CONFIG.TITLE_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(TITLE_SCREEN_CONFIG.PROMPT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('has Y positions in valid screen range', () => {
      expect(TITLE_SCREEN_CONFIG.TITLE_Y).toBeGreaterThan(0);
      expect(TITLE_SCREEN_CONFIG.TITLE_Y).toBeLessThan(240);
      expect(TITLE_SCREEN_CONFIG.PROMPT_Y).toBeGreaterThan(0);
      expect(TITLE_SCREEN_CONFIG.PROMPT_Y).toBeLessThan(240);
    });
  });
});

describe('TitleScreen singleton', () => {
  beforeEach(() => {
    resetTitleScreen();
  });

  it('getTitleScreen returns a TitleScreen instance', () => {
    const instance = getTitleScreen();
    expect(instance).toBeInstanceOf(TitleScreen);
  });

  it('getTitleScreen returns the same instance on multiple calls', () => {
    const instance1 = getTitleScreen();
    const instance2 = getTitleScreen();
    expect(instance1).toBe(instance2);
  });

  it('resetTitleScreen creates a new instance on next call', () => {
    const instance1 = getTitleScreen();

    // Modify state
    const input = createInputSnapshot();
    instance1.update(input);
    expect(instance1.getFrameCounter()).toBe(1);

    // Reset
    resetTitleScreen();

    // New instance should have fresh state
    const instance2 = getTitleScreen();
    expect(instance2).not.toBe(instance1);
    expect(instance2.getFrameCounter()).toBe(0);
  });
});

describe('TitleScreen edge cases', () => {
  let titleScreen: TitleScreen;

  beforeEach(() => {
    resetTitleScreen();
    titleScreen = new TitleScreen();
  });

  it('handles Start press on exact blink frame', () => {
    const interval = TITLE_SCREEN_CONFIG.PROMPT_BLINK_INTERVAL;
    const input = createInputSnapshot();

    // Advance to just before blink
    for (let i = 0; i < interval - 1; i++) {
      titleScreen.update(input);
    }

    // Press Start on blink frame
    const startInput = createInputSnapshot({
      START: createButtonState(true, true, false),
    });
    const result = titleScreen.update(startInput);

    // Should still transition (input takes priority)
    expect(result.nextPhase).toBe('FILE_SELECT');
    // And blink should have toggled
    expect(titleScreen.isPromptVisible()).toBe(false);
  });

  it('handles rapid Start press/release', () => {
    // Press
    let input = createInputSnapshot({
      START: createButtonState(true, true, false),
    });
    const result1 = titleScreen.update(input);
    expect(result1.nextPhase).toBe('FILE_SELECT');

    // Release (if we're still on title somehow)
    titleScreen.reset();
    input = createInputSnapshot({
      START: createButtonState(false, false, true),
    });
    const result2 = titleScreen.update(input);
    expect(result2.nextPhase).toBeNull();
  });

  it('handles other buttons being pressed alongside Start', () => {
    const input = createInputSnapshot({
      START: createButtonState(true, true, false),
      A: createButtonState(true, true, false),
      B: createButtonState(true, true, false),
    });
    const result = titleScreen.update(input);

    // Should still work - Start is what matters
    expect(result.nextPhase).toBe('FILE_SELECT');
  });

  it('frame counter does not overflow on extended play', () => {
    const input = createInputSnapshot();

    // Simulate many frames
    for (let i = 0; i < 10000; i++) {
      titleScreen.update(input);
    }

    expect(titleScreen.getFrameCounter()).toBe(10000);
  });
});
