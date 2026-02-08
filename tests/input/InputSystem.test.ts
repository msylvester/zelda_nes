// InputSystem.test.ts - Tests for the input system
import { describe, it, expect, beforeEach } from 'vitest';
import { InputSystem } from '../../src/input/InputSystem';
import { DEFAULT_INPUT_MAPPING } from '../../src/input/InputMapping';

describe('InputSystem', () => {
  let inputSystem: InputSystem;

  beforeEach(() => {
    inputSystem = new InputSystem();
    inputSystem.clearState();
  });

  describe('initial state', () => {
    it('should have DOWN as initial facing direction', () => {
      expect(inputSystem.getFacingDirection()).toBe('DOWN');
    });

    it('should have no active direction initially', () => {
      expect(inputSystem.getActiveDirection()).toBeNull();
    });

    it('should produce a valid initial snapshot', () => {
      const snapshot = inputSystem.poll();
      expect(snapshot.activeDirection).toBeNull();
      expect(snapshot.facingDirection).toBe('DOWN');
      expect(snapshot.frameNumber).toBe(1);
    });

    it('should have all buttons not held in initial snapshot', () => {
      const snapshot = inputSystem.poll();
      for (const button of Object.keys(snapshot.buttons)) {
        expect(snapshot.buttons[button as keyof typeof snapshot.buttons].held).toBe(false);
        expect(snapshot.buttons[button as keyof typeof snapshot.buttons].justPressed).toBe(false);
        expect(snapshot.buttons[button as keyof typeof snapshot.buttons].justReleased).toBe(false);
      }
    });
  });

  describe('poll', () => {
    it('should increment frame number on each poll', () => {
      const snapshot1 = inputSystem.poll();
      const snapshot2 = inputSystem.poll();
      const snapshot3 = inputSystem.poll();
      expect(snapshot1.frameNumber).toBe(1);
      expect(snapshot2.frameNumber).toBe(2);
      expect(snapshot3.frameNumber).toBe(3);
    });

    it('should detect held state for pressed keys', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.UP.held).toBe(true);
    });

    it('should detect justPressed on first frame of key press', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.UP.justPressed).toBe(true);
    });

    it('should not have justPressed on subsequent frames', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      inputSystem.poll(); // First frame
      const snapshot = inputSystem.poll(); // Second frame
      expect(snapshot.buttons.UP.justPressed).toBe(false);
      expect(snapshot.buttons.UP.held).toBe(true);
    });

    it('should detect justReleased on key release', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      inputSystem.poll(); // Press frame
      inputSystem.simulateKeyUp('ArrowUp');
      const snapshot = inputSystem.poll(); // Release frame
      expect(snapshot.buttons.UP.justReleased).toBe(true);
      expect(snapshot.buttons.UP.held).toBe(false);
    });

    it('should not have justReleased after the release frame', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      inputSystem.poll();
      inputSystem.simulateKeyUp('ArrowUp');
      inputSystem.poll(); // Release frame
      const snapshot = inputSystem.poll(); // Frame after release
      expect(snapshot.buttons.UP.justReleased).toBe(false);
    });
  });

  describe('direction handling', () => {
    it('should set active direction when direction key is pressed', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      const snapshot = inputSystem.poll();
      expect(snapshot.activeDirection).toBe('UP');
    });

    it('should update facing direction when moving', () => {
      inputSystem.simulateKeyDown('ArrowRight');
      const snapshot = inputSystem.poll();
      expect(snapshot.facingDirection).toBe('RIGHT');
    });

    it('should retain facing direction when no direction is pressed', () => {
      inputSystem.simulateKeyDown('ArrowRight');
      inputSystem.poll();
      inputSystem.simulateKeyUp('ArrowRight');
      const snapshot = inputSystem.poll();
      expect(snapshot.activeDirection).toBeNull();
      expect(snapshot.facingDirection).toBe('RIGHT');
    });

    it('should handle direction priority (most recent wins)', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      inputSystem.simulateKeyDown('ArrowRight');
      const snapshot = inputSystem.poll();
      expect(snapshot.activeDirection).toBe('RIGHT');
    });

    it('should revert to previous direction on release', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      inputSystem.simulateKeyDown('ArrowRight');
      inputSystem.simulateKeyUp('ArrowRight');
      const snapshot = inputSystem.poll();
      expect(snapshot.activeDirection).toBe('UP');
    });
  });

  describe('multiple buttons', () => {
    it('should track multiple buttons simultaneously', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      inputSystem.simulateKeyDown('KeyX'); // A button
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.UP.held).toBe(true);
      expect(snapshot.buttons.A.held).toBe(true);
    });

    it('should handle both A and B buttons', () => {
      inputSystem.simulateKeyDown('KeyX'); // A
      inputSystem.simulateKeyDown('KeyZ'); // B
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.A.held).toBe(true);
      expect(snapshot.buttons.B.held).toBe(true);
    });

    it('should handle direction with action buttons', () => {
      inputSystem.simulateKeyDown('ArrowDown');
      inputSystem.simulateKeyDown('KeyX');
      inputSystem.simulateKeyDown('Enter');
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.DOWN.held).toBe(true);
      expect(snapshot.buttons.A.held).toBe(true);
      expect(snapshot.buttons.START.held).toBe(true);
      expect(snapshot.activeDirection).toBe('DOWN');
    });
  });

  describe('alternate key mappings', () => {
    it('should handle WASD keys', () => {
      inputSystem.simulateKeyDown('KeyW'); // UP
      inputSystem.simulateKeyDown('KeyD'); // RIGHT
      inputSystem.simulateKeyUp('KeyD');
      const snapshot = inputSystem.poll();
      expect(snapshot.activeDirection).toBe('UP');
    });

    it('should handle Period for A button', () => {
      inputSystem.simulateKeyDown('Period');
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.A.held).toBe(true);
    });

    it('should handle Comma for B button', () => {
      inputSystem.simulateKeyDown('Comma');
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.B.held).toBe(true);
    });
  });

  describe('clearState', () => {
    it('should clear all held keys', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      inputSystem.simulateKeyDown('KeyX');
      inputSystem.clearState();
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.UP.held).toBe(false);
      expect(snapshot.buttons.A.held).toBe(false);
      expect(snapshot.activeDirection).toBeNull();
    });

    it('should clear direction stack', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      inputSystem.simulateKeyDown('ArrowRight');
      inputSystem.clearState();
      expect(inputSystem.getActiveDirection()).toBeNull();
    });
  });

  describe('mapping', () => {
    it('should return the current mapping', () => {
      const mapping = inputSystem.getMapping();
      expect(mapping).toEqual(DEFAULT_INPUT_MAPPING);
    });

    it('should allow setting a custom mapping', () => {
      const customMapping = {
        ...DEFAULT_INPUT_MAPPING,
        A: ['Space'],
      };
      inputSystem.setMapping(customMapping);
      inputSystem.simulateKeyDown('Space');
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.A.held).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle pressing and releasing same key rapidly', () => {
      inputSystem.simulateKeyDown('ArrowUp');
      const snapshot1 = inputSystem.poll();
      expect(snapshot1.buttons.UP.justPressed).toBe(true);

      inputSystem.simulateKeyUp('ArrowUp');
      const snapshot2 = inputSystem.poll();
      expect(snapshot2.buttons.UP.justReleased).toBe(true);

      inputSystem.simulateKeyDown('ArrowUp');
      const snapshot3 = inputSystem.poll();
      expect(snapshot3.buttons.UP.justPressed).toBe(true);
    });

    it('should handle unmapped keys gracefully', () => {
      inputSystem.simulateKeyDown('Space');
      const snapshot = inputSystem.poll();
      // All buttons should be unaffected
      expect(snapshot.buttons.UP.held).toBe(false);
      expect(snapshot.buttons.A.held).toBe(false);
    });

    it('should handle releasing a key that was never pressed', () => {
      inputSystem.simulateKeyUp('ArrowUp');
      const snapshot = inputSystem.poll();
      expect(snapshot.buttons.UP.justReleased).toBe(false);
      expect(snapshot.buttons.UP.held).toBe(false);
    });
  });

  describe('button state transitions', () => {
    it('should correctly transition through all states', () => {
      // Frame 1: Nothing pressed
      const s1 = inputSystem.poll();
      expect(s1.buttons.A.held).toBe(false);
      expect(s1.buttons.A.justPressed).toBe(false);
      expect(s1.buttons.A.justReleased).toBe(false);

      // Frame 2: Key down
      inputSystem.simulateKeyDown('KeyX');
      const s2 = inputSystem.poll();
      expect(s2.buttons.A.held).toBe(true);
      expect(s2.buttons.A.justPressed).toBe(true);
      expect(s2.buttons.A.justReleased).toBe(false);

      // Frame 3: Key still held
      const s3 = inputSystem.poll();
      expect(s3.buttons.A.held).toBe(true);
      expect(s3.buttons.A.justPressed).toBe(false);
      expect(s3.buttons.A.justReleased).toBe(false);

      // Frame 4: Key released
      inputSystem.simulateKeyUp('KeyX');
      const s4 = inputSystem.poll();
      expect(s4.buttons.A.held).toBe(false);
      expect(s4.buttons.A.justPressed).toBe(false);
      expect(s4.buttons.A.justReleased).toBe(true);

      // Frame 5: Key still released
      const s5 = inputSystem.poll();
      expect(s5.buttons.A.held).toBe(false);
      expect(s5.buttons.A.justPressed).toBe(false);
      expect(s5.buttons.A.justReleased).toBe(false);
    });
  });
});
