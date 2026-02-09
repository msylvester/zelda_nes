// GameStateManager unit tests
import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager } from '../../src/core/GameStateManager';
import type { InputSnapshot, ButtonState, NesButton } from '../../src/types';

// Helper to create a mock InputSnapshot
function createInputSnapshot(overrides?: {
  justPressed?: NesButton[];
  held?: NesButton[];
}): InputSnapshot {
  const buttons = {} as Record<NesButton, ButtonState>;
  const nesButtons: NesButton[] = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];

  for (const button of nesButtons) {
    buttons[button] = {
      held: overrides?.held?.includes(button) ?? false,
      justPressed: overrides?.justPressed?.includes(button) ?? false,
      justReleased: false,
    };
  }

  return {
    buttons,
    activeDirection: null,
    facingDirection: 'DOWN',
    frameNumber: 1,
  };
}

describe('GameStateManager', () => {
  let gsm: GameStateManager;

  beforeEach(() => {
    gsm = new GameStateManager();
  });

  describe('initial state', () => {
    it('starts on TITLE phase', () => {
      expect(gsm.phase).toBe('TITLE');
    });

    it('starts with frame counter at 0', () => {
      expect(gsm.frameCounter).toBe(0);
    });

    it('previous phase is TITLE initially', () => {
      expect(gsm.getPreviousPhase()).toBe('TITLE');
    });
  });

  describe('setPhase', () => {
    it('changes the current phase', () => {
      gsm.setPhase('GAMEPLAY');
      expect(gsm.phase).toBe('GAMEPLAY');
    });

    it('stores the previous phase', () => {
      gsm.setPhase('GAMEPLAY');
      expect(gsm.getPreviousPhase()).toBe('TITLE');

      gsm.setPhase('PAUSE');
      expect(gsm.getPreviousPhase()).toBe('GAMEPLAY');
    });

    it('can transition through multiple phases', () => {
      gsm.setPhase('FILE_SELECT');
      gsm.setPhase('GAMEPLAY');
      gsm.setPhase('PAUSE');
      expect(gsm.phase).toBe('PAUSE');
      expect(gsm.getPreviousPhase()).toBe('GAMEPLAY');
    });
  });

  describe('processPhaseTransitions', () => {
    it('pauses from GAMEPLAY when Start is pressed', () => {
      gsm.setPhase('GAMEPLAY');
      const input = createInputSnapshot({ justPressed: ['START'] });

      gsm.processPhaseTransitions(input);

      expect(gsm.phase).toBe('PAUSE');
      expect(gsm.getPreviousPhase()).toBe('GAMEPLAY');
    });

    it('unpauses from PAUSE when Start is pressed', () => {
      gsm.setPhase('GAMEPLAY');
      gsm.setPhase('PAUSE');
      const input = createInputSnapshot({ justPressed: ['START'] });

      gsm.processPhaseTransitions(input);

      expect(gsm.phase).toBe('GAMEPLAY');
    });

    it('does not pause from TITLE when Start is pressed', () => {
      const input = createInputSnapshot({ justPressed: ['START'] });
      gsm.processPhaseTransitions(input);
      expect(gsm.phase).toBe('TITLE');
    });

    it('does not transition when Start is just held (not justPressed)', () => {
      gsm.setPhase('GAMEPLAY');
      const input = createInputSnapshot({ held: ['START'] });

      gsm.processPhaseTransitions(input);

      expect(gsm.phase).toBe('GAMEPLAY');
    });

    it('does not affect other phases', () => {
      const phasesToTest = ['TRANSITION', 'DEATH', 'CONTINUE_SCREEN', 'ITEM_PICKUP', 'TEXT_DISPLAY', 'ENDING'] as const;
      const input = createInputSnapshot({ justPressed: ['START'] });

      for (const phase of phasesToTest) {
        gsm.setPhase(phase);
        gsm.processPhaseTransitions(input);
        expect(gsm.phase).toBe(phase);
      }
    });
  });

  describe('frameCounter', () => {
    it('increments the frame counter', () => {
      gsm.incrementFrameCounter();
      expect(gsm.frameCounter).toBe(1);

      gsm.incrementFrameCounter();
      expect(gsm.frameCounter).toBe(2);
    });

    it('can reset the frame counter', () => {
      gsm.incrementFrameCounter();
      gsm.incrementFrameCounter();
      gsm.resetFrameCounter();
      expect(gsm.frameCounter).toBe(0);
    });
  });

  describe('helper methods', () => {
    describe('isPlayable', () => {
      it('returns true for GAMEPLAY', () => {
        gsm.setPhase('GAMEPLAY');
        expect(gsm.isPlayable()).toBe(true);
      });

      it('returns false for non-GAMEPLAY phases', () => {
        expect(gsm.isPlayable()).toBe(false); // TITLE

        gsm.setPhase('PAUSE');
        expect(gsm.isPlayable()).toBe(false);

        gsm.setPhase('TRANSITION');
        expect(gsm.isPlayable()).toBe(false);
      });
    });

    describe('isPaused', () => {
      it('returns true for PAUSE', () => {
        gsm.setPhase('PAUSE');
        expect(gsm.isPaused()).toBe(true);
      });

      it('returns false for non-PAUSE phases', () => {
        expect(gsm.isPaused()).toBe(false);

        gsm.setPhase('GAMEPLAY');
        expect(gsm.isPaused()).toBe(false);
      });
    });

    describe('isTransitioning', () => {
      it('returns true for TRANSITION', () => {
        gsm.setPhase('TRANSITION');
        expect(gsm.isTransitioning()).toBe(true);
      });

      it('returns true for DEATH', () => {
        gsm.setPhase('DEATH');
        expect(gsm.isTransitioning()).toBe(true);
      });

      it('returns true for ITEM_PICKUP', () => {
        gsm.setPhase('ITEM_PICKUP');
        expect(gsm.isTransitioning()).toBe(true);
      });

      it('returns false for other phases', () => {
        expect(gsm.isTransitioning()).toBe(false); // TITLE

        gsm.setPhase('GAMEPLAY');
        expect(gsm.isTransitioning()).toBe(false);

        gsm.setPhase('PAUSE');
        expect(gsm.isTransitioning()).toBe(false);
      });
    });
  });
});
