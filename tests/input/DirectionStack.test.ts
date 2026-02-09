// DirectionStack.test.ts - Tests for direction priority resolution
import { describe, it, expect, beforeEach } from 'vitest';
import { DirectionStack } from '../../src/input/DirectionStack';

describe('DirectionStack', () => {
  let stack: DirectionStack;

  beforeEach(() => {
    stack = new DirectionStack();
  });

  describe('initial state', () => {
    it('should have no active direction initially', () => {
      expect(stack.current()).toBeNull();
    });

    it('should have size 0 initially', () => {
      expect(stack.size).toBe(0);
    });

    it('should return empty array for getAll initially', () => {
      expect(stack.getAll()).toEqual([]);
    });
  });

  describe('push', () => {
    it('should make the pushed direction active', () => {
      stack.push('UP');
      expect(stack.current()).toBe('UP');
    });

    it('should return size of 1 after single push', () => {
      stack.push('DOWN');
      expect(stack.size).toBe(1);
    });

    it('should make the most recently pushed direction active', () => {
      stack.push('UP');
      stack.push('RIGHT');
      expect(stack.current()).toBe('RIGHT');
    });

    it('should not create duplicates when pushing same direction', () => {
      stack.push('UP');
      stack.push('UP');
      expect(stack.size).toBe(1);
      expect(stack.getAll()).toEqual(['UP']);
    });

    it('should move existing direction to top of stack', () => {
      stack.push('UP');
      stack.push('RIGHT');
      stack.push('UP');
      expect(stack.current()).toBe('UP');
      expect(stack.size).toBe(2);
      expect(stack.getAll()).toEqual(['RIGHT', 'UP']);
    });
  });

  describe('remove', () => {
    it('should remove a direction from the stack', () => {
      stack.push('UP');
      stack.remove('UP');
      expect(stack.current()).toBeNull();
      expect(stack.size).toBe(0);
    });

    it('should make next direction active when top is removed', () => {
      stack.push('UP');
      stack.push('RIGHT');
      stack.remove('RIGHT');
      expect(stack.current()).toBe('UP');
    });

    it('should handle removing a direction that is not present', () => {
      stack.push('UP');
      stack.remove('DOWN');
      expect(stack.current()).toBe('UP');
      expect(stack.size).toBe(1);
    });

    it('should handle removing from empty stack', () => {
      stack.remove('UP');
      expect(stack.current()).toBeNull();
      expect(stack.size).toBe(0);
    });

    it('should correctly handle removing middle element', () => {
      stack.push('UP');
      stack.push('RIGHT');
      stack.push('DOWN');
      stack.remove('RIGHT');
      expect(stack.getAll()).toEqual(['UP', 'DOWN']);
      expect(stack.current()).toBe('DOWN');
    });
  });

  describe('clear', () => {
    it('should remove all directions', () => {
      stack.push('UP');
      stack.push('RIGHT');
      stack.push('DOWN');
      stack.clear();
      expect(stack.current()).toBeNull();
      expect(stack.size).toBe(0);
      expect(stack.getAll()).toEqual([]);
    });

    it('should handle clearing empty stack', () => {
      stack.clear();
      expect(stack.current()).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for directions in stack', () => {
      stack.push('UP');
      stack.push('RIGHT');
      expect(stack.has('UP')).toBe(true);
      expect(stack.has('RIGHT')).toBe(true);
    });

    it('should return false for directions not in stack', () => {
      stack.push('UP');
      expect(stack.has('DOWN')).toBe(false);
      expect(stack.has('LEFT')).toBe(false);
    });

    it('should return false when stack is empty', () => {
      expect(stack.has('UP')).toBe(false);
    });
  });

  describe('direction priority scenarios', () => {
    it('should handle opposing directions (UP then DOWN)', () => {
      stack.push('UP');
      stack.push('DOWN');
      expect(stack.current()).toBe('DOWN');
    });

    it('should handle opposing directions (LEFT then RIGHT)', () => {
      stack.push('LEFT');
      stack.push('RIGHT');
      expect(stack.current()).toBe('RIGHT');
    });

    it('should handle perpendicular directions (UP then RIGHT)', () => {
      stack.push('UP');
      stack.push('RIGHT');
      expect(stack.current()).toBe('RIGHT');
    });

    it('should revert to previous direction when current is released', () => {
      stack.push('UP');
      stack.push('RIGHT');
      stack.push('DOWN');
      // Release DOWN, RIGHT should be active
      stack.remove('DOWN');
      expect(stack.current()).toBe('RIGHT');
      // Release RIGHT, UP should be active
      stack.remove('RIGHT');
      expect(stack.current()).toBe('UP');
    });

    it('should handle complex sequence: UP, RIGHT, release UP, DOWN', () => {
      stack.push('UP');
      stack.push('RIGHT');
      stack.remove('UP');
      stack.push('DOWN');
      expect(stack.current()).toBe('DOWN');
      expect(stack.getAll()).toEqual(['RIGHT', 'DOWN']);
    });

    it('should handle all four directions pressed', () => {
      stack.push('UP');
      stack.push('RIGHT');
      stack.push('DOWN');
      stack.push('LEFT');
      expect(stack.current()).toBe('LEFT');
      expect(stack.size).toBe(4);
    });
  });

  describe('getAll', () => {
    it('should return a copy, not the original array', () => {
      stack.push('UP');
      const result = stack.getAll();
      result.push('DOWN' as never);
      expect(stack.getAll()).toEqual(['UP']);
    });

    it('should preserve order (oldest first)', () => {
      stack.push('UP');
      stack.push('RIGHT');
      stack.push('DOWN');
      expect(stack.getAll()).toEqual(['UP', 'RIGHT', 'DOWN']);
    });
  });
});
