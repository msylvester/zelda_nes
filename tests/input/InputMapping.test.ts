// InputMapping.test.ts - Tests for input mapping utilities
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_INPUT_MAPPING,
  NES_BUTTONS,
  DIRECTION_BUTTONS,
  buttonToDirection,
  getMappedKeys,
  keyCodeToButton,
} from '../../src/input/InputMapping';

describe('InputMapping', () => {
  describe('DEFAULT_INPUT_MAPPING', () => {
    it('should have all 8 NES buttons mapped', () => {
      expect(Object.keys(DEFAULT_INPUT_MAPPING)).toHaveLength(8);
      for (const button of NES_BUTTONS) {
        expect(DEFAULT_INPUT_MAPPING[button]).toBeDefined();
        expect(DEFAULT_INPUT_MAPPING[button].length).toBeGreaterThan(0);
      }
    });

    it('should map arrow keys to directions', () => {
      expect(DEFAULT_INPUT_MAPPING.UP).toContain('ArrowUp');
      expect(DEFAULT_INPUT_MAPPING.DOWN).toContain('ArrowDown');
      expect(DEFAULT_INPUT_MAPPING.LEFT).toContain('ArrowLeft');
      expect(DEFAULT_INPUT_MAPPING.RIGHT).toContain('ArrowRight');
    });

    it('should map WASD as alternate direction keys', () => {
      expect(DEFAULT_INPUT_MAPPING.UP).toContain('KeyW');
      expect(DEFAULT_INPUT_MAPPING.DOWN).toContain('KeyS');
      expect(DEFAULT_INPUT_MAPPING.LEFT).toContain('KeyA');
      expect(DEFAULT_INPUT_MAPPING.RIGHT).toContain('KeyD');
    });

    it('should map X/Period to A button', () => {
      expect(DEFAULT_INPUT_MAPPING.A).toContain('KeyX');
      expect(DEFAULT_INPUT_MAPPING.A).toContain('Period');
    });

    it('should map Z/Comma to B button', () => {
      expect(DEFAULT_INPUT_MAPPING.B).toContain('KeyZ');
      expect(DEFAULT_INPUT_MAPPING.B).toContain('Comma');
    });

    it('should map Enter to Start', () => {
      expect(DEFAULT_INPUT_MAPPING.START).toContain('Enter');
    });

    it('should map ShiftRight to Select', () => {
      expect(DEFAULT_INPUT_MAPPING.SELECT).toContain('ShiftRight');
    });
  });

  describe('NES_BUTTONS', () => {
    it('should contain all 8 buttons', () => {
      expect(NES_BUTTONS).toHaveLength(8);
    });

    it('should include all expected buttons', () => {
      expect(NES_BUTTONS).toContain('UP');
      expect(NES_BUTTONS).toContain('DOWN');
      expect(NES_BUTTONS).toContain('LEFT');
      expect(NES_BUTTONS).toContain('RIGHT');
      expect(NES_BUTTONS).toContain('A');
      expect(NES_BUTTONS).toContain('B');
      expect(NES_BUTTONS).toContain('START');
      expect(NES_BUTTONS).toContain('SELECT');
    });
  });

  describe('DIRECTION_BUTTONS', () => {
    it('should contain only 4 direction buttons', () => {
      expect(DIRECTION_BUTTONS).toHaveLength(4);
    });

    it('should include all direction buttons', () => {
      expect(DIRECTION_BUTTONS).toContain('UP');
      expect(DIRECTION_BUTTONS).toContain('DOWN');
      expect(DIRECTION_BUTTONS).toContain('LEFT');
      expect(DIRECTION_BUTTONS).toContain('RIGHT');
    });

    it('should not include action buttons', () => {
      expect(DIRECTION_BUTTONS).not.toContain('A');
      expect(DIRECTION_BUTTONS).not.toContain('B');
      expect(DIRECTION_BUTTONS).not.toContain('START');
      expect(DIRECTION_BUTTONS).not.toContain('SELECT');
    });
  });

  describe('buttonToDirection', () => {
    it('should convert direction buttons to Direction type', () => {
      expect(buttonToDirection('UP')).toBe('UP');
      expect(buttonToDirection('DOWN')).toBe('DOWN');
      expect(buttonToDirection('LEFT')).toBe('LEFT');
      expect(buttonToDirection('RIGHT')).toBe('RIGHT');
    });

    it('should return null for non-direction buttons', () => {
      expect(buttonToDirection('A')).toBeNull();
      expect(buttonToDirection('B')).toBeNull();
      expect(buttonToDirection('START')).toBeNull();
      expect(buttonToDirection('SELECT')).toBeNull();
    });
  });

  describe('getMappedKeys', () => {
    it('should return all unique key codes from mapping', () => {
      const keys = getMappedKeys(DEFAULT_INPUT_MAPPING);
      expect(keys.has('ArrowUp')).toBe(true);
      expect(keys.has('ArrowDown')).toBe(true);
      expect(keys.has('ArrowLeft')).toBe(true);
      expect(keys.has('ArrowRight')).toBe(true);
      expect(keys.has('KeyW')).toBe(true);
      expect(keys.has('KeyA')).toBe(true);
      expect(keys.has('KeyS')).toBe(true);
      expect(keys.has('KeyD')).toBe(true);
      expect(keys.has('KeyX')).toBe(true);
      expect(keys.has('KeyZ')).toBe(true);
      expect(keys.has('Period')).toBe(true);
      expect(keys.has('Comma')).toBe(true);
      expect(keys.has('Enter')).toBe(true);
      expect(keys.has('ShiftRight')).toBe(true);
    });

    it('should not include unmapped keys', () => {
      const keys = getMappedKeys(DEFAULT_INPUT_MAPPING);
      expect(keys.has('Space')).toBe(false);
      expect(keys.has('Escape')).toBe(false);
    });
  });

  describe('keyCodeToButton', () => {
    it('should return the correct button for mapped keys', () => {
      expect(keyCodeToButton('ArrowUp', DEFAULT_INPUT_MAPPING)).toBe('UP');
      expect(keyCodeToButton('KeyW', DEFAULT_INPUT_MAPPING)).toBe('UP');
      expect(keyCodeToButton('ArrowDown', DEFAULT_INPUT_MAPPING)).toBe('DOWN');
      expect(keyCodeToButton('KeyS', DEFAULT_INPUT_MAPPING)).toBe('DOWN');
      expect(keyCodeToButton('ArrowLeft', DEFAULT_INPUT_MAPPING)).toBe('LEFT');
      expect(keyCodeToButton('KeyA', DEFAULT_INPUT_MAPPING)).toBe('LEFT');
      expect(keyCodeToButton('ArrowRight', DEFAULT_INPUT_MAPPING)).toBe('RIGHT');
      expect(keyCodeToButton('KeyD', DEFAULT_INPUT_MAPPING)).toBe('RIGHT');
      expect(keyCodeToButton('KeyX', DEFAULT_INPUT_MAPPING)).toBe('A');
      expect(keyCodeToButton('Period', DEFAULT_INPUT_MAPPING)).toBe('A');
      expect(keyCodeToButton('KeyZ', DEFAULT_INPUT_MAPPING)).toBe('B');
      expect(keyCodeToButton('Comma', DEFAULT_INPUT_MAPPING)).toBe('B');
      expect(keyCodeToButton('Enter', DEFAULT_INPUT_MAPPING)).toBe('START');
      expect(keyCodeToButton('ShiftRight', DEFAULT_INPUT_MAPPING)).toBe('SELECT');
    });

    it('should return null for unmapped keys', () => {
      expect(keyCodeToButton('Space', DEFAULT_INPUT_MAPPING)).toBeNull();
      expect(keyCodeToButton('Escape', DEFAULT_INPUT_MAPPING)).toBeNull();
      expect(keyCodeToButton('Tab', DEFAULT_INPUT_MAPPING)).toBeNull();
    });
  });
});
