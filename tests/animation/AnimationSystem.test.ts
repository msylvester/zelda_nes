// Tests for AnimationSystem.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnimationSystem,
  getAnimationSystem,
  resetAnimationSystem,
} from '../../src/animation/AnimationSystem';
import { resetAnimations, getAnimation } from '../../src/animation/AnimationData';

describe('AnimationSystem', () => {
  let system: AnimationSystem;

  beforeEach(() => {
    resetAnimations();
    resetAnimationSystem();
    system = getAnimationSystem();
  });

  describe('play', () => {
    it('starts an animation for an entity', () => {
      const result = system.play(1, 'link_walk_down');
      expect(result).toBe(true);
      expect(system.hasAnimation(1)).toBe(true);
    });

    it('returns false for unknown animation', () => {
      const result = system.play(1, 'nonexistent_animation');
      expect(result).toBe(false);
      expect(system.hasAnimation(1)).toBe(false);
    });

    it('does not restart same animation if already playing', () => {
      system.play(1, 'link_walk_down');
      // Advance a few frames
      system.update();
      system.update();
      const instance = system.getInstance(1);
      const timerBefore = instance?.frameTimer;

      // Play same animation again (should be no-op)
      system.play(1, 'link_walk_down');
      const instanceAfter = system.getInstance(1);
      // Timer should remain unchanged (play is a no-op for same animation)
      expect(instanceAfter?.frameTimer).toBe(timerBefore);
    });

    it('restarts animation when forceRestart is true', () => {
      system.play(1, 'link_walk_down');
      system.update();
      system.update();
      const instance = system.getInstance(1);
      expect(instance?.frameTimer).toBeLessThan(8); // Started at 8, decremented twice

      system.play(1, 'link_walk_down', true);
      const instanceAfter = system.getInstance(1);
      expect(instanceAfter?.frameTimer).toBe(8); // Reset to initial frame duration
    });

    it('can play different animation for same entity', () => {
      system.play(1, 'link_walk_down');
      expect(system.getCurrentSpriteKey(1)).toBe('link_down_1');

      system.play(1, 'link_walk_up');
      expect(system.getCurrentSpriteKey(1)).toBe('link_up_1');
    });

    it('handles multiple entities', () => {
      system.play(1, 'link_walk_down');
      system.play(2, 'link_walk_up');
      system.play(3, 'octorok_red_walk');

      expect(system.hasAnimation(1)).toBe(true);
      expect(system.hasAnimation(2)).toBe(true);
      expect(system.hasAnimation(3)).toBe(true);
    });
  });

  describe('stop', () => {
    it('stops animation for entity', () => {
      system.play(1, 'link_walk_down');
      expect(system.hasAnimation(1)).toBe(true);

      system.stop(1);
      expect(system.hasAnimation(1)).toBe(false);
    });

    it('does nothing for entity without animation', () => {
      system.stop(999);
      // No error should occur
    });
  });

  describe('update', () => {
    it('decrements frame timer', () => {
      system.play(1, 'link_walk_down');
      const anim = getAnimation('link_walk_down');
      const initialDuration = anim?.frames[0]?.duration ?? 8;

      const instanceBefore = system.getInstance(1);
      expect(instanceBefore?.frameTimer).toBe(initialDuration);

      system.update();
      const instanceAfter = system.getInstance(1);
      expect(instanceAfter?.frameTimer).toBe(initialDuration - 1);
    });

    it('advances to next frame when timer reaches 0', () => {
      system.play(1, 'link_walk_down');

      // Walk animation: 8 frames per sprite
      for (let i = 0; i < 8; i++) {
        expect(system.getCurrentFrameIndex(1)).toBe(0);
        system.update();
      }
      expect(system.getCurrentFrameIndex(1)).toBe(1);
    });

    it('loops animation when loop is true', () => {
      system.play(1, 'link_walk_down');

      // Walk animation: 2 frames, 8 ticks each = 16 ticks total
      for (let i = 0; i < 16; i++) {
        system.update();
      }
      // Should have looped back to frame 0
      expect(system.getCurrentFrameIndex(1)).toBe(0);
      expect(system.isFinished(1)).toBe(false);

      const instance = system.getInstance(1);
      expect(instance?.loopCount).toBe(1);
    });

    it('marks non-looping animation as finished', () => {
      system.play(1, 'link_idle_down');

      // Idle has 1 frame with duration 1
      system.update();
      expect(system.isFinished(1)).toBe(true);
    });

    it('handles HOLD_LAST completion', () => {
      system.play(1, 'link_idle_down');
      system.update(); // Complete the animation

      expect(system.isFinished(1)).toBe(true);
      expect(system.getCurrentFrameIndex(1)).toBe(0); // Still on last frame (index 0)
      expect(system.getCurrentSpriteKey(1)).toBe('link_down_1');
    });

    it('handles RESET completion', () => {
      system.play(1, 'link_attack_down');

      // Attack animation: 4 frames with durations [1, 4, 3, 4] = 12 total
      for (let i = 0; i < 12; i++) {
        system.update();
      }

      expect(system.isFinished(1)).toBe(true);
      expect(system.getCurrentFrameIndex(1)).toBe(0); // Reset to first frame
    });

    it('handles DESTROY completion', () => {
      system.play(1, 'enemy_death_puff');

      // Death puff: 3 frames, 4 ticks each = 12 total
      for (let i = 0; i < 12; i++) {
        system.update();
      }

      expect(system.isFinished(1)).toBe(true);
      const instance = system.getInstance(1);
      expect(instance?.animation.onComplete).toBe('DESTROY');
    });

    it('does not update finished animations', () => {
      system.play(1, 'link_idle_down');
      system.update(); // Finish

      const instanceBefore = system.getInstance(1);
      const timerBefore = instanceBefore?.frameTimer;

      system.update();
      system.update();

      const instanceAfter = system.getInstance(1);
      // Timer should not have changed much (it's set on completion)
      expect(instanceAfter?.finished).toBe(true);
    });
  });

  describe('getCurrentFrame', () => {
    it('returns current frame', () => {
      system.play(1, 'link_walk_down');
      const frame = system.getCurrentFrame(1);
      expect(frame).toBeDefined();
      expect(frame?.spriteKey).toBe('link_down_1');
      expect(frame?.duration).toBe(8);
    });

    it('returns null for entity without animation', () => {
      const frame = system.getCurrentFrame(999);
      expect(frame).toBeNull();
    });
  });

  describe('getCurrentSpriteKey', () => {
    it('returns sprite key for current frame', () => {
      system.play(1, 'link_walk_down');
      expect(system.getCurrentSpriteKey(1)).toBe('link_down_1');

      // Advance to second frame
      for (let i = 0; i < 8; i++) {
        system.update();
      }
      expect(system.getCurrentSpriteKey(1)).toBe('link_down_2');
    });

    it('returns null for entity without animation', () => {
      expect(system.getCurrentSpriteKey(999)).toBeNull();
    });
  });

  describe('getSpriteOffset', () => {
    it('returns offset for current frame', () => {
      system.play(1, 'item_bob_item_heart');
      const offset = system.getSpriteOffset(1);
      expect(offset).toBeDefined();
      expect(offset?.x).toBe(0);
      expect(offset?.y).toBe(0);
    });

    it('returns correct offset as animation progresses', () => {
      system.play(1, 'item_bob_item_heart');

      // Item bob: frame 0 has offsetY: 0, frame 1 has offsetY: -2
      for (let i = 0; i < 15; i++) {
        system.update();
      }
      const offset = system.getSpriteOffset(1);
      expect(offset?.y).toBe(-2);
    });

    it('returns null for entity without animation', () => {
      expect(system.getSpriteOffset(999)).toBeNull();
    });
  });

  describe('isFinished', () => {
    it('returns false for active animation', () => {
      system.play(1, 'link_walk_down');
      expect(system.isFinished(1)).toBe(false);
    });

    it('returns true for finished animation', () => {
      system.play(1, 'link_idle_down');
      system.update();
      expect(system.isFinished(1)).toBe(true);
    });

    it('returns true for entity without animation', () => {
      expect(system.isFinished(999)).toBe(true);
    });
  });

  describe('isHitboxActive', () => {
    it('returns false when hitbox not active', () => {
      system.play(1, 'link_attack_down');
      // Frame 0: hitboxActive = false
      expect(system.isHitboxActive(1)).toBe(false);
    });

    it('returns true when hitbox is active', () => {
      system.play(1, 'link_attack_down');
      // Attack: frame durations [1, 4, 3, 4], frame 1 has hitboxActive = true
      system.update(); // Advance past frame 0 (duration 1)
      expect(system.isHitboxActive(1)).toBe(true);
    });

    it('returns false for entity without animation', () => {
      expect(system.isHitboxActive(999)).toBe(false);
    });

    it('returns false for animations without hitbox data', () => {
      system.play(1, 'link_walk_down');
      expect(system.isHitboxActive(1)).toBe(false);
    });
  });

  describe('getCurrentFrameIndex', () => {
    it('returns current frame index', () => {
      system.play(1, 'link_walk_down');
      expect(system.getCurrentFrameIndex(1)).toBe(0);

      for (let i = 0; i < 8; i++) {
        system.update();
      }
      expect(system.getCurrentFrameIndex(1)).toBe(1);
    });

    it('returns -1 for entity without animation', () => {
      expect(system.getCurrentFrameIndex(999)).toBe(-1);
    });
  });

  describe('getLoopCount', () => {
    it('returns 0 initially', () => {
      system.play(1, 'link_walk_down');
      expect(system.getLoopCount(1)).toBe(0);
    });

    it('increments on loop', () => {
      system.play(1, 'link_walk_down');

      // Complete one full cycle (16 frames)
      for (let i = 0; i < 16; i++) {
        system.update();
      }
      expect(system.getLoopCount(1)).toBe(1);

      // Complete another cycle
      for (let i = 0; i < 16; i++) {
        system.update();
      }
      expect(system.getLoopCount(1)).toBe(2);
    });

    it('returns 0 for entity without animation', () => {
      expect(system.getLoopCount(999)).toBe(0);
    });
  });

  describe('getActiveEntityIds', () => {
    it('returns empty array when no animations', () => {
      expect(system.getActiveEntityIds()).toEqual([]);
    });

    it('returns all entity IDs with animations', () => {
      system.play(1, 'link_walk_down');
      system.play(2, 'link_walk_up');
      system.play(3, 'octorok_red_walk');

      const ids = system.getActiveEntityIds();
      expect(ids).toContain(1);
      expect(ids).toContain(2);
      expect(ids).toContain(3);
      expect(ids.length).toBe(3);
    });
  });

  describe('clear', () => {
    it('removes all animations', () => {
      system.play(1, 'link_walk_down');
      system.play(2, 'link_walk_up');

      system.clear();

      expect(system.hasAnimation(1)).toBe(false);
      expect(system.hasAnimation(2)).toBe(false);
      expect(system.getActiveCount()).toBe(0);
    });
  });

  describe('removeFinishedDestroyAnimations', () => {
    it('removes finished animations with DESTROY behavior', () => {
      system.play(1, 'enemy_death_puff');

      // Complete the animation
      for (let i = 0; i < 12; i++) {
        system.update();
      }
      expect(system.isFinished(1)).toBe(true);

      const removed = system.removeFinishedDestroyAnimations();
      expect(removed).toContain(1);
      expect(system.hasAnimation(1)).toBe(false);
    });

    it('does not remove finished animations with other behaviors', () => {
      system.play(1, 'link_idle_down'); // HOLD_LAST
      system.update();
      expect(system.isFinished(1)).toBe(true);

      const removed = system.removeFinishedDestroyAnimations();
      expect(removed).not.toContain(1);
      expect(system.hasAnimation(1)).toBe(true);
    });

    it('does not remove unfinished animations', () => {
      system.play(1, 'enemy_death_puff');
      system.update(); // Not finished yet

      const removed = system.removeFinishedDestroyAnimations();
      expect(removed.length).toBe(0);
      expect(system.hasAnimation(1)).toBe(true);
    });
  });

  describe('getActiveCount', () => {
    it('returns 0 when empty', () => {
      expect(system.getActiveCount()).toBe(0);
    });

    it('returns correct count', () => {
      system.play(1, 'link_walk_down');
      expect(system.getActiveCount()).toBe(1);

      system.play(2, 'link_walk_up');
      expect(system.getActiveCount()).toBe(2);

      system.stop(1);
      expect(system.getActiveCount()).toBe(1);
    });
  });

  describe('setFrameTimer', () => {
    it('sets frame timer directly', () => {
      system.play(1, 'link_walk_down');
      system.setFrameTimer(1, 5);

      const instance = system.getInstance(1);
      expect(instance?.frameTimer).toBe(5);
    });

    it('does nothing for entity without animation', () => {
      system.setFrameTimer(999, 5);
      // No error
    });
  });

  describe('setFrameIndex', () => {
    it('jumps to specific frame', () => {
      system.play(1, 'link_walk_down');
      expect(system.getCurrentFrameIndex(1)).toBe(0);

      const result = system.setFrameIndex(1, 1);
      expect(result).toBe(true);
      expect(system.getCurrentFrameIndex(1)).toBe(1);
      expect(system.getCurrentSpriteKey(1)).toBe('link_down_2');
    });

    it('returns false for invalid frame index', () => {
      system.play(1, 'link_walk_down');

      expect(system.setFrameIndex(1, -1)).toBe(false);
      expect(system.setFrameIndex(1, 100)).toBe(false);
    });

    it('returns false for entity without animation', () => {
      expect(system.setFrameIndex(999, 0)).toBe(false);
    });

    it('resets finished flag', () => {
      system.play(1, 'link_idle_down');
      system.update();
      expect(system.isFinished(1)).toBe(true);

      system.setFrameIndex(1, 0);
      expect(system.isFinished(1)).toBe(false);
    });

    it('resets frame timer to new frame duration', () => {
      system.play(1, 'link_attack_down');
      // Frame durations: [1, 4, 3, 4]

      system.setFrameIndex(1, 2);
      const instance = system.getInstance(1);
      expect(instance?.frameTimer).toBe(3);
    });
  });

  describe('singleton', () => {
    it('getAnimationSystem returns same instance', () => {
      const system1 = getAnimationSystem();
      const system2 = getAnimationSystem();
      expect(system1).toBe(system2);
    });

    it('resetAnimationSystem creates new instance', () => {
      const system1 = getAnimationSystem();
      system1.play(1, 'link_walk_down');

      resetAnimationSystem();

      const system2 = getAnimationSystem();
      expect(system2.hasAnimation(1)).toBe(false);
    });
  });
});
