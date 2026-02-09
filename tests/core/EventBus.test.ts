// EventBus unit tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, gameEventBus } from '../../src/core/EventBus';
import type { GameEvent } from '../../src/types';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on', () => {
    it('subscribes to specific event type', () => {
      const handler = vi.fn();
      bus.on('ENEMY_KILLED', handler);

      const event: GameEvent = {
        type: 'ENEMY_KILLED',
        enemyId: 'enemy-1',
        position: { x: 100, y: 100 },
      };
      bus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('does not receive events of other types', () => {
      const handler = vi.fn();
      bus.on('ENEMY_KILLED', handler);

      bus.emit({ type: 'SCREEN_CLEARED' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('allows multiple handlers for same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.on('ENEMY_KILLED', handler1);
      bus.on('ENEMY_KILLED', handler2);

      const event: GameEvent = {
        type: 'ENEMY_KILLED',
        enemyId: 'enemy-1',
        position: { x: 100, y: 100 },
      };
      bus.emit(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('returns unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = bus.on('ENEMY_KILLED', handler);

      // Should receive event before unsubscribe
      bus.emit({
        type: 'ENEMY_KILLED',
        enemyId: 'enemy-1',
        position: { x: 100, y: 100 },
      });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      // Should not receive after unsubscribe
      bus.emit({
        type: 'ENEMY_KILLED',
        enemyId: 'enemy-2',
        position: { x: 200, y: 200 },
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('onAny', () => {
    it('receives all event types', () => {
      const handler = vi.fn();
      bus.onAny(handler);

      bus.emit({ type: 'SCREEN_CLEARED' });
      bus.emit({
        type: 'ENEMY_KILLED',
        enemyId: 'e1',
        position: { x: 0, y: 0 },
      });
      bus.emit({ type: 'PLAYER_DIED' });

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('returns unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = bus.onAny(handler);

      bus.emit({ type: 'SCREEN_CLEARED' });
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      bus.emit({ type: 'PLAYER_DIED' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('once', () => {
    it('only triggers handler once', () => {
      const handler = vi.fn();
      bus.once('SCREEN_CLEARED', handler);

      bus.emit({ type: 'SCREEN_CLEARED' });
      bus.emit({ type: 'SCREEN_CLEARED' });
      bus.emit({ type: 'SCREEN_CLEARED' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns unsubscribe function that can cancel before trigger', () => {
      const handler = vi.fn();
      const unsubscribe = bus.once('SCREEN_CLEARED', handler);

      unsubscribe();

      bus.emit({ type: 'SCREEN_CLEARED' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('calls both specific and global handlers', () => {
      const specificHandler = vi.fn();
      const globalHandler = vi.fn();

      bus.on('SCREEN_CLEARED', specificHandler);
      bus.onAny(globalHandler);

      bus.emit({ type: 'SCREEN_CLEARED' });

      expect(specificHandler).toHaveBeenCalledTimes(1);
      expect(globalHandler).toHaveBeenCalledTimes(1);
    });

    it('handles events with no handlers gracefully', () => {
      expect(() => {
        bus.emit({ type: 'SCREEN_CLEARED' });
      }).not.toThrow();
    });
  });

  describe('off', () => {
    it('removes all handlers for a specific event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      bus.on('ENEMY_KILLED', handler1);
      bus.on('ENEMY_KILLED', handler2);

      bus.off('ENEMY_KILLED');

      bus.emit({
        type: 'ENEMY_KILLED',
        enemyId: 'e1',
        position: { x: 0, y: 0 },
      });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('does not affect other event types', () => {
      const enemyHandler = vi.fn();
      const clearHandler = vi.fn();
      bus.on('ENEMY_KILLED', enemyHandler);
      bus.on('SCREEN_CLEARED', clearHandler);

      bus.off('ENEMY_KILLED');

      bus.emit({ type: 'SCREEN_CLEARED' });
      expect(clearHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('removes all handlers including global', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const globalHandler = vi.fn();

      bus.on('ENEMY_KILLED', handler1);
      bus.on('SCREEN_CLEARED', handler2);
      bus.onAny(globalHandler);

      bus.clear();

      bus.emit({
        type: 'ENEMY_KILLED',
        enemyId: 'e1',
        position: { x: 0, y: 0 },
      });
      bus.emit({ type: 'SCREEN_CLEARED' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(globalHandler).not.toHaveBeenCalled();
    });
  });

  describe('hasHandlers', () => {
    it('returns false when no handlers registered', () => {
      expect(bus.hasHandlers('SCREEN_CLEARED')).toBe(false);
    });

    it('returns true when specific handler registered', () => {
      bus.on('SCREEN_CLEARED', vi.fn());
      expect(bus.hasHandlers('SCREEN_CLEARED')).toBe(true);
    });

    it('returns true when global handler registered', () => {
      bus.onAny(vi.fn());
      expect(bus.hasHandlers('SCREEN_CLEARED')).toBe(true);
    });

    it('returns false after unsubscribe', () => {
      const unsubscribe = bus.on('SCREEN_CLEARED', vi.fn());
      expect(bus.hasHandlers('SCREEN_CLEARED')).toBe(true);

      unsubscribe();
      expect(bus.hasHandlers('SCREEN_CLEARED')).toBe(false);
    });
  });

  describe('typed events', () => {
    it('handles PLAYER_DAMAGED event', () => {
      const handler = vi.fn();
      bus.on('PLAYER_DAMAGED', handler);

      const event: GameEvent = {
        type: 'PLAYER_DAMAGED',
        amount: 2,
        fromDirection: 'LEFT',
      };
      bus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('handles ITEM_COLLECTED event', () => {
      const handler = vi.fn();
      bus.on('ITEM_COLLECTED', handler);

      const event: GameEvent = {
        type: 'ITEM_COLLECTED',
        itemType: 'HEART',
        position: { x: 50, y: 75 },
      };
      bus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('handles TRIFORCE_COLLECTED event', () => {
      const handler = vi.fn();
      bus.on('TRIFORCE_COLLECTED', handler);

      const event: GameEvent = {
        type: 'TRIFORCE_COLLECTED',
        dungeonId: 1,
      };
      bus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('handles BOSS_DEFEATED event', () => {
      const handler = vi.fn();
      bus.on('BOSS_DEFEATED', handler);

      const event: GameEvent = {
        type: 'BOSS_DEFEATED',
        bossType: 'AQUAMENTUS',
      };
      bus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });
  });
});

describe('gameEventBus singleton', () => {
  beforeEach(() => {
    // Clear the singleton before each test
    gameEventBus.clear();
  });

  it('is an instance of EventBus', () => {
    expect(gameEventBus).toBeInstanceOf(EventBus);
  });

  it('can subscribe and receive events', () => {
    const handler = vi.fn();
    gameEventBus.on('GAME_SAVED', handler);

    gameEventBus.emit({ type: 'GAME_SAVED' });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
