// FileSelectScreen.test.ts - Tests for file select screen functionality

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  FileSelectScreen,
  getFileSelectScreen,
  resetFileSelectScreen,
  FILE_SELECT_CONFIG,
} from '../../src/screens/FileSelectScreen';
import type { InputSnapshot, ButtonState, NesButton } from '../../src/types';
import { resetSaveSystem, getSaveSystem } from '../../src/progression/SaveSystem';

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
    strokeRect: vi.fn(),
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

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

// ===== TESTS =====

describe('FileSelectScreen', () => {
  let fileSelectScreen: FileSelectScreen;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    // Setup localStorage mock
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();

    resetFileSelectScreen();
    resetSaveSystem();
    fileSelectScreen = new FileSelectScreen();
    mockCtx = createMockContext();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor and reset', () => {
    it('initializes with frame counter at 0', () => {
      expect(fileSelectScreen.getFrameCounter()).toBe(0);
    });

    it('initializes in SELECT mode', () => {
      expect(fileSelectScreen.getMode()).toBe('SELECT');
    });

    it('initializes with first slot selected (index 0)', () => {
      expect(fileSelectScreen.getSelectedIndex()).toBe(0);
    });

    it('initializes with cursor visible', () => {
      expect(fileSelectScreen.isCursorVisible()).toBe(true);
    });

    it('initializes with empty entered name', () => {
      expect(fileSelectScreen.getEnteredName()).toBe('');
    });

    it('reset() restores initial state', () => {
      // Advance some frames and change mode
      const input = createInputSnapshot();
      for (let i = 0; i < 50; i++) {
        fileSelectScreen.update(input);
      }
      fileSelectScreen.setMode('ELIMINATE');
      fileSelectScreen.setSelectedIndex(2);
      fileSelectScreen.setEnteredName('TEST');

      expect(fileSelectScreen.getFrameCounter()).toBe(50);
      expect(fileSelectScreen.getMode()).toBe('ELIMINATE');
      expect(fileSelectScreen.getSelectedIndex()).toBe(2);

      // Reset
      fileSelectScreen.reset();
      expect(fileSelectScreen.getFrameCounter()).toBe(0);
      expect(fileSelectScreen.getMode()).toBe('SELECT');
      expect(fileSelectScreen.getSelectedIndex()).toBe(0);
      expect(fileSelectScreen.getEnteredName()).toBe('');
      expect(fileSelectScreen.isCursorVisible()).toBe(true);
    });
  });

  describe('update - SELECT mode', () => {
    it('increments frame counter each update', () => {
      const input = createInputSnapshot();

      fileSelectScreen.update(input);
      expect(fileSelectScreen.getFrameCounter()).toBe(1);

      fileSelectScreen.update(input);
      expect(fileSelectScreen.getFrameCounter()).toBe(2);
    });

    it('returns null nextPhase when no button pressed', () => {
      const input = createInputSnapshot();
      const result = fileSelectScreen.update(input);
      expect(result.nextPhase).toBeNull();
      expect(result.selectedSlot).toBeNull();
      expect(result.isNewGame).toBe(false);
    });

    it('pressing DOWN navigates to next option', () => {
      expect(fileSelectScreen.getSelectedIndex()).toBe(0);

      const input = createInputSnapshot({
        DOWN: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getSelectedIndex()).toBe(1);
    });

    it('pressing UP navigates to previous option', () => {
      fileSelectScreen.setSelectedIndex(1);

      const input = createInputSnapshot({
        UP: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getSelectedIndex()).toBe(0);
    });

    it('pressing UP from first option wraps to last option', () => {
      expect(fileSelectScreen.getSelectedIndex()).toBe(0);

      const input = createInputSnapshot({
        UP: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getSelectedIndex()).toBe(4); // 0-2 slots, 3 register, 4 eliminate
    });

    it('pressing DOWN from last option wraps to first option', () => {
      fileSelectScreen.setSelectedIndex(4);

      const input = createInputSnapshot({
        DOWN: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getSelectedIndex()).toBe(0);
    });

    it('pressing B returns to TITLE phase', () => {
      const input = createInputSnapshot({
        B: createButtonState(true, true, false),
      });
      const result = fileSelectScreen.update(input);

      expect(result.nextPhase).toBe('TITLE');
      expect(result.selectedSlot).toBeNull();
    });
  });

  describe('slot selection with existing saves', () => {
    beforeEach(() => {
      // Create a save in slot 0
      const saveSystem = getSaveSystem();
      saveSystem.createNewGame(0, 'LINK');
    });

    it('pressing A on slot with save continues game', () => {
      fileSelectScreen.setSelectedIndex(0);

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      const result = fileSelectScreen.update(input);

      expect(result.nextPhase).toBe('GAMEPLAY');
      expect(result.selectedSlot).toBe(0);
      expect(result.isNewGame).toBe(false);
    });

    it('pressing START on slot with save continues game', () => {
      fileSelectScreen.setSelectedIndex(0);

      const input = createInputSnapshot({
        START: createButtonState(true, true, false),
      });
      const result = fileSelectScreen.update(input);

      expect(result.nextPhase).toBe('GAMEPLAY');
      expect(result.selectedSlot).toBe(0);
      expect(result.isNewGame).toBe(false);
    });
  });

  describe('slot selection with empty slots', () => {
    it('pressing A on empty slot enters REGISTER mode', () => {
      expect(fileSelectScreen.getMode()).toBe('SELECT');

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getMode()).toBe('REGISTER');
      expect(fileSelectScreen.getRegisterTargetSlot()).toBe(0);
    });

    it('pressing START on empty slot enters REGISTER mode', () => {
      fileSelectScreen.setSelectedIndex(1);

      const input = createInputSnapshot({
        START: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getMode()).toBe('REGISTER');
      expect(fileSelectScreen.getRegisterTargetSlot()).toBe(1);
    });
  });

  describe('register option', () => {
    it('pressing A on register option enters REGISTER mode', () => {
      fileSelectScreen.setSelectedIndex(3); // Register option

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getMode()).toBe('REGISTER');
    });
  });

  describe('eliminate option', () => {
    it('pressing A on eliminate option enters ELIMINATE mode', () => {
      fileSelectScreen.setSelectedIndex(4); // Eliminate option

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getMode()).toBe('ELIMINATE');
      expect(fileSelectScreen.getSelectedIndex()).toBe(0);
    });
  });

  describe('REGISTER mode - name entry', () => {
    beforeEach(() => {
      // Enter register mode for slot 0 - press A on empty slot
      fileSelectScreen.setSelectedIndex(0);
      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);
      // Now in REGISTER mode with slot 0 as target
      expect(fileSelectScreen.getMode()).toBe('REGISTER');
      expect(fileSelectScreen.getRegisterTargetSlot()).toBe(0);
    });

    it('pressing A adds selected character to name', () => {
      expect(fileSelectScreen.getEnteredName()).toBe('');

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getEnteredName()).toBe('A');
    });

    it('pressing A on multiple characters builds name', () => {
      const aInput = createInputSnapshot({
        A: createButtonState(true, true, false),
      });

      // Add 'A'
      fileSelectScreen.update(aInput);
      expect(fileSelectScreen.getEnteredName()).toBe('A');

      // Reset input and move to 'B'
      fileSelectScreen.setCharSelectIndex(1);
      fileSelectScreen.update(aInput);
      expect(fileSelectScreen.getEnteredName()).toBe('AB');
    });

    it('pressing B removes last character', () => {
      fileSelectScreen.setEnteredName('ABC');

      const input = createInputSnapshot({
        B: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getEnteredName()).toBe('AB');
    });

    it('pressing B on empty name cancels registration', () => {
      expect(fileSelectScreen.getEnteredName()).toBe('');

      const input = createInputSnapshot({
        B: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getMode()).toBe('SELECT');
    });

    it('pressing RIGHT moves to next character', () => {
      expect(fileSelectScreen.getCharSelectIndex()).toBe(0);

      const input = createInputSnapshot({
        RIGHT: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getCharSelectIndex()).toBe(1);
    });

    it('pressing LEFT moves to previous character', () => {
      fileSelectScreen.setCharSelectIndex(5);

      const input = createInputSnapshot({
        LEFT: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getCharSelectIndex()).toBe(4);
    });

    it('character selection wraps around', () => {
      const validChars = FILE_SELECT_CONFIG.VALID_CHARACTERS;
      const totalItems = validChars.length + 1; // +1 for END
      fileSelectScreen.setCharSelectIndex(totalItems - 1);

      const input = createInputSnapshot({
        RIGHT: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getCharSelectIndex()).toBe(0);
    });

    it('pressing A on END with valid name creates save and starts game', () => {
      fileSelectScreen.setEnteredName('LINK');
      const validChars = FILE_SELECT_CONFIG.VALID_CHARACTERS;
      fileSelectScreen.setCharSelectIndex(validChars.length); // END

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      const result = fileSelectScreen.update(input);

      expect(result.nextPhase).toBe('GAMEPLAY');
      expect(result.selectedSlot).toBe(0);
      expect(result.isNewGame).toBe(true);
    });

    it('pressing A on END with empty name does nothing', () => {
      expect(fileSelectScreen.getEnteredName()).toBe('');
      const validChars = FILE_SELECT_CONFIG.VALID_CHARACTERS;
      fileSelectScreen.setCharSelectIndex(validChars.length); // END

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      const result = fileSelectScreen.update(input);

      expect(result.nextPhase).toBeNull();
      expect(fileSelectScreen.getMode()).toBe('REGISTER');
    });

    it('pressing START with valid name creates save and starts game', () => {
      fileSelectScreen.setEnteredName('ZELDA');

      const input = createInputSnapshot({
        START: createButtonState(true, true, false),
      });
      const result = fileSelectScreen.update(input);

      expect(result.nextPhase).toBe('GAMEPLAY');
      expect(result.selectedSlot).toBe(0);
      expect(result.isNewGame).toBe(true);
    });

    it('pressing START with empty name does nothing', () => {
      expect(fileSelectScreen.getEnteredName()).toBe('');

      const input = createInputSnapshot({
        START: createButtonState(true, true, false),
      });
      const result = fileSelectScreen.update(input);

      expect(result.nextPhase).toBeNull();
    });

    it('cannot enter more than MAX_NAME_LENGTH characters', () => {
      const maxLen = FILE_SELECT_CONFIG.MAX_NAME_LENGTH;
      fileSelectScreen.setEnteredName('A'.repeat(maxLen));

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getEnteredName().length).toBe(maxLen);
    });
  });

  describe('ELIMINATE mode', () => {
    beforeEach(() => {
      // Create saves in slots 0 and 1
      const saveSystem = getSaveSystem();
      saveSystem.createNewGame(0, 'LINK');
      saveSystem.createNewGame(1, 'ZELDA');

      // Enter eliminate mode
      fileSelectScreen.setMode('ELIMINATE');
      fileSelectScreen.setSelectedIndex(0);
    });

    it('pressing DOWN navigates to next slot', () => {
      expect(fileSelectScreen.getSelectedIndex()).toBe(0);

      const input = createInputSnapshot({
        DOWN: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getSelectedIndex()).toBe(1);
    });

    it('pressing A on slot deletes the save', () => {
      const saveSystem = getSaveSystem();
      expect(saveSystem.hasFile(0)).toBe(true);

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(saveSystem.hasFile(0)).toBe(false);
    });

    it('pressing A on END returns to SELECT mode', () => {
      fileSelectScreen.setSelectedIndex(3); // END

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getMode()).toBe('SELECT');
      expect(fileSelectScreen.getSelectedIndex()).toBe(0);
    });

    it('pressing B returns to SELECT mode', () => {
      const input = createInputSnapshot({
        B: createButtonState(true, true, false),
      });
      fileSelectScreen.update(input);

      expect(fileSelectScreen.getMode()).toBe('SELECT');
    });
  });

  describe('cursor blinking', () => {
    it('toggles cursor visibility at CURSOR_BLINK_INTERVAL', () => {
      const input = createInputSnapshot();
      const interval = FILE_SELECT_CONFIG.CURSOR_BLINK_INTERVAL;

      // Initially visible
      expect(fileSelectScreen.isCursorVisible()).toBe(true);

      // Update until just before toggle
      for (let i = 0; i < interval - 1; i++) {
        fileSelectScreen.update(input);
      }
      expect(fileSelectScreen.isCursorVisible()).toBe(true);

      // One more frame should toggle
      fileSelectScreen.update(input);
      expect(fileSelectScreen.isCursorVisible()).toBe(false);
    });

    it('toggles back to visible after another interval', () => {
      const input = createInputSnapshot();
      const interval = FILE_SELECT_CONFIG.CURSOR_BLINK_INTERVAL;

      // First toggle (visible -> invisible)
      for (let i = 0; i < interval; i++) {
        fileSelectScreen.update(input);
      }
      expect(fileSelectScreen.isCursorVisible()).toBe(false);

      // Second toggle (invisible -> visible)
      for (let i = 0; i < interval; i++) {
        fileSelectScreen.update(input);
      }
      expect(fileSelectScreen.isCursorVisible()).toBe(true);
    });
  });

  describe('render', () => {
    it('clears the screen with background color', () => {
      fileSelectScreen.render(mockCtx);

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('renders SELECT FILE title in SELECT mode', () => {
      fileSelectScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const titleCall = fillTextCalls.find(
        (call) => call[0] === FILE_SELECT_CONFIG.TITLE_TEXT
      );
      expect(titleCall).toBeDefined();
    });

    it('renders REGISTER YOUR NAME title in REGISTER mode', () => {
      fileSelectScreen.setMode('REGISTER');
      fileSelectScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const titleCall = fillTextCalls.find(
        (call) => call[0] === FILE_SELECT_CONFIG.REGISTER_TEXT
      );
      expect(titleCall).toBeDefined();
    });

    it('renders ELIMINATION MODE title in ELIMINATE mode', () => {
      fileSelectScreen.setMode('ELIMINATE');
      fileSelectScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const titleCall = fillTextCalls.find(
        (call) => call[0] === FILE_SELECT_CONFIG.ELIMINATE_TEXT
      );
      expect(titleCall).toBeDefined();
    });

    it('renders empty slot indicator', () => {
      fileSelectScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const emptySlotCall = fillTextCalls.find(
        (call) => (call[0] as string).includes(FILE_SELECT_CONFIG.EMPTY_SLOT_TEXT)
      );
      expect(emptySlotCall).toBeDefined();
    });

    it('renders slot with save data', () => {
      const saveSystem = getSaveSystem();
      saveSystem.createNewGame(0, 'LINK');

      fileSelectScreen.render(mockCtx);

      const fillTextCalls = vi.mocked(mockCtx.fillText).mock.calls;
      const slotCall = fillTextCalls.find(
        (call) => (call[0] as string).includes('LINK')
      );
      expect(slotCall).toBeDefined();
    });

    it('renders cursor when visible', () => {
      fileSelectScreen.render(mockCtx);

      // Cursor uses beginPath, moveTo, lineTo, closePath, fill
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.closePath).toHaveBeenCalled();
    });

    it('resets text alignment after rendering', () => {
      fileSelectScreen.render(mockCtx);

      expect(mockCtx.textAlign).toBe('left');
      expect(mockCtx.textBaseline).toBe('alphabetic');
    });

    it('renders character selection grid in REGISTER mode', () => {
      fileSelectScreen.setMode('REGISTER');
      fileSelectScreen.setRegisterTargetSlot(0);
      fileSelectScreen.render(mockCtx);

      // Should render many characters
      expect(vi.mocked(mockCtx.fillText).mock.calls.length).toBeGreaterThan(10);
    });

    it('renders name entry boxes in REGISTER mode', () => {
      fileSelectScreen.setMode('REGISTER');
      fileSelectScreen.render(mockCtx);

      // Should draw rectangles for name boxes
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });
  });

  describe('FILE_SELECT_CONFIG', () => {
    it('has expected title text', () => {
      expect(FILE_SELECT_CONFIG.TITLE_TEXT).toBe('SELECT FILE');
    });

    it('has expected register text', () => {
      expect(FILE_SELECT_CONFIG.REGISTER_TEXT).toBe('REGISTER YOUR NAME');
    });

    it('has expected eliminate text', () => {
      expect(FILE_SELECT_CONFIG.ELIMINATE_TEXT).toBe('ELIMINATION MODE');
    });

    it('has cursor blink interval greater than 0', () => {
      expect(FILE_SELECT_CONFIG.CURSOR_BLINK_INTERVAL).toBeGreaterThan(0);
    });

    it('has valid max name length', () => {
      expect(FILE_SELECT_CONFIG.MAX_NAME_LENGTH).toBe(8);
    });

    it('has valid characters string', () => {
      expect(FILE_SELECT_CONFIG.VALID_CHARACTERS).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ');
    });

    it('has valid color values', () => {
      expect(FILE_SELECT_CONFIG.BG_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(FILE_SELECT_CONFIG.TITLE_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(FILE_SELECT_CONFIG.SLOT_TEXT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('FileSelectScreen singleton', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();
    resetFileSelectScreen();
    resetSaveSystem();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getFileSelectScreen returns a FileSelectScreen instance', () => {
    const instance = getFileSelectScreen();
    expect(instance).toBeInstanceOf(FileSelectScreen);
  });

  it('getFileSelectScreen returns the same instance on multiple calls', () => {
    const instance1 = getFileSelectScreen();
    const instance2 = getFileSelectScreen();
    expect(instance1).toBe(instance2);
  });

  it('resetFileSelectScreen creates a new instance on next call', () => {
    const instance1 = getFileSelectScreen();

    // Modify state
    const input = createInputSnapshot();
    instance1.update(input);
    instance1.setMode('ELIMINATE');
    expect(instance1.getFrameCounter()).toBe(1);
    expect(instance1.getMode()).toBe('ELIMINATE');

    // Reset
    resetFileSelectScreen();

    // New instance should have fresh state
    const instance2 = getFileSelectScreen();
    expect(instance2).not.toBe(instance1);
    expect(instance2.getFrameCounter()).toBe(0);
    expect(instance2.getMode()).toBe('SELECT');
  });
});

describe('FileSelectScreen edge cases', () => {
  let fileSelectScreen: FileSelectScreen;

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorageMock.clear();
    resetFileSelectScreen();
    resetSaveSystem();
    fileSelectScreen = new FileSelectScreen();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('handles navigation and selection on same frame', () => {
    const input = createInputSnapshot({
      DOWN: createButtonState(true, true, false),
      A: createButtonState(true, true, false),
    });

    // Start at slot 0, navigate to slot 1, then try to select
    const result = fileSelectScreen.update(input);

    // Should have navigated to slot 1 and entered register mode
    expect(fileSelectScreen.getSelectedIndex()).toBe(1);
    // Selection happens after navigation, so register mode for empty slot 1
    expect(fileSelectScreen.getMode()).toBe('REGISTER');
  });

  it('handles multiple saves correctly', () => {
    const saveSystem = getSaveSystem();
    saveSystem.createNewGame(0, 'LINK');
    saveSystem.createNewGame(1, 'ZELDA');
    saveSystem.createNewGame(2, 'GANON');

    // All slots should have saves
    expect(saveSystem.hasFile(0)).toBe(true);
    expect(saveSystem.hasFile(1)).toBe(true);
    expect(saveSystem.hasFile(2)).toBe(true);

    // Select each slot and verify continue
    for (let i = 0; i < 3; i++) {
      fileSelectScreen.reset();
      fileSelectScreen.setSelectedIndex(i);

      const input = createInputSnapshot({
        A: createButtonState(true, true, false),
      });
      const result = fileSelectScreen.update(input);

      expect(result.nextPhase).toBe('GAMEPLAY');
      expect(result.selectedSlot).toBe(i);
      expect(result.isNewGame).toBe(false);
    }
  });

  it('trims whitespace from entered name', () => {
    // Enter register mode properly
    fileSelectScreen.setSelectedIndex(0);
    const enterInput = createInputSnapshot({
      A: createButtonState(true, true, false),
    });
    fileSelectScreen.update(enterInput);
    expect(fileSelectScreen.getMode()).toBe('REGISTER');

    // Set name with whitespace
    fileSelectScreen.setEnteredName('  LINK  ');

    const input = createInputSnapshot({
      START: createButtonState(true, true, false),
    });
    fileSelectScreen.update(input);

    const saveSystem = getSaveSystem();
    const file = saveSystem.load(0);
    expect(file?.playerName).toBe('LINK');
  });

  it('handles whitespace-only name as empty', () => {
    fileSelectScreen.setMode('REGISTER');
    fileSelectScreen.setRegisterTargetSlot(0);
    fileSelectScreen.setEnteredName('   ');

    const validChars = FILE_SELECT_CONFIG.VALID_CHARACTERS;
    fileSelectScreen.setCharSelectIndex(validChars.length); // END

    const input = createInputSnapshot({
      A: createButtonState(true, true, false),
    });
    const result = fileSelectScreen.update(input);

    // Should not create save - name is empty after trim
    expect(result.nextPhase).toBeNull();
    expect(fileSelectScreen.getMode()).toBe('REGISTER');
  });

  it('frame counter does not overflow on extended time', () => {
    const input = createInputSnapshot();

    // Simulate many frames
    for (let i = 0; i < 10000; i++) {
      fileSelectScreen.update(input);
    }

    expect(fileSelectScreen.getFrameCounter()).toBe(10000);
  });

  it('setters allow programmatic state changes', () => {
    fileSelectScreen.setSelectedIndex(2);
    expect(fileSelectScreen.getSelectedIndex()).toBe(2);

    fileSelectScreen.setMode('ELIMINATE');
    expect(fileSelectScreen.getMode()).toBe('ELIMINATE');

    fileSelectScreen.setEnteredName('TEST');
    expect(fileSelectScreen.getEnteredName()).toBe('TEST');

    fileSelectScreen.setRegisterTargetSlot(1);
    expect(fileSelectScreen.getRegisterTargetSlot()).toBe(1);

    fileSelectScreen.setCharSelectIndex(5);
    expect(fileSelectScreen.getCharSelectIndex()).toBe(5);
  });
});
