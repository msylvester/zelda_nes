// Tests for AnimationData.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAnimation,
  hasAnimation,
  getAllAnimationNames,
  resetAnimations,
  getLinkAnimationName,
  getEnemyAnimationName,
  getAnimationDuration,
  WALK_FRAME_DURATION,
  KEESE_FLAP_DURATION,
  DEATH_PUFF_FRAME_DURATION,
  SWORD_ATTACK_DURATIONS,
} from '../../src/animation/AnimationData';

describe('AnimationData', () => {
  beforeEach(() => {
    resetAnimations();
  });

  describe('getAnimation', () => {
    it('returns animation by name', () => {
      const anim = getAnimation('link_walk_down');
      expect(anim).toBeDefined();
      expect(anim?.name).toBe('link_walk_down');
    });

    it('returns undefined for unknown animation', () => {
      const anim = getAnimation('unknown_animation');
      expect(anim).toBeUndefined();
    });
  });

  describe('hasAnimation', () => {
    it('returns true for existing animation', () => {
      expect(hasAnimation('link_idle_down')).toBe(true);
    });

    it('returns false for non-existing animation', () => {
      expect(hasAnimation('nonexistent')).toBe(false);
    });
  });

  describe('getAllAnimationNames', () => {
    it('returns array of animation names', () => {
      const names = getAllAnimationNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
    });

    it('includes Link animations', () => {
      const names = getAllAnimationNames();
      expect(names).toContain('link_walk_down');
      expect(names).toContain('link_walk_up');
      expect(names).toContain('link_walk_left');
      expect(names).toContain('link_walk_right');
    });

    it('includes enemy animations', () => {
      const names = getAllAnimationNames();
      expect(names).toContain('octorok_red_walk');
      expect(names).toContain('keese_walk');
      expect(names).toContain('enemy_death_puff');
    });
  });

  describe('Link Animations', () => {
    describe('idle animations', () => {
      it('has idle animation for each direction', () => {
        const directions = ['up', 'down', 'left', 'right'];
        for (const dir of directions) {
          const anim = getAnimation(`link_idle_${dir}`);
          expect(anim).toBeDefined();
          expect(anim?.frames.length).toBe(1);
          expect(anim?.loop).toBe(false);
        }
      });

      it('idle animations hold last frame on complete', () => {
        const anim = getAnimation('link_idle_down');
        expect(anim?.onComplete).toBe('HOLD_LAST');
      });
    });

    describe('walk animations', () => {
      it('has walk animation for each direction', () => {
        const directions = ['up', 'down', 'left', 'right'];
        for (const dir of directions) {
          const anim = getAnimation(`link_walk_${dir}`);
          expect(anim).toBeDefined();
          expect(anim?.frames.length).toBe(2);
          expect(anim?.loop).toBe(true);
        }
      });

      it('walk animations have correct frame durations', () => {
        const anim = getAnimation('link_walk_down');
        expect(anim?.frames[0]?.duration).toBe(WALK_FRAME_DURATION);
        expect(anim?.frames[1]?.duration).toBe(WALK_FRAME_DURATION);
      });

      it('walk animations use correct sprite keys', () => {
        const anim = getAnimation('link_walk_down');
        expect(anim?.frames[0]?.spriteKey).toBe('link_down_1');
        expect(anim?.frames[1]?.spriteKey).toBe('link_down_2');
      });
    });

    describe('attack animations', () => {
      it('has attack animation for each direction', () => {
        const directions = ['up', 'down', 'left', 'right'];
        for (const dir of directions) {
          const anim = getAnimation(`link_attack_${dir}`);
          expect(anim).toBeDefined();
          expect(anim?.frames.length).toBe(4);
          expect(anim?.loop).toBe(false);
        }
      });

      it('attack animations have correct frame durations', () => {
        const anim = getAnimation('link_attack_down');
        expect(anim?.frames[0]?.duration).toBe(SWORD_ATTACK_DURATIONS[0]);
        expect(anim?.frames[1]?.duration).toBe(SWORD_ATTACK_DURATIONS[1]);
        expect(anim?.frames[2]?.duration).toBe(SWORD_ATTACK_DURATIONS[2]);
        expect(anim?.frames[3]?.duration).toBe(SWORD_ATTACK_DURATIONS[3]);
      });

      it('attack animations have hitbox active on middle frames', () => {
        const anim = getAnimation('link_attack_down');
        expect(anim?.frames[0]?.hitboxActive).toBe(false);
        expect(anim?.frames[1]?.hitboxActive).toBe(true);
        expect(anim?.frames[2]?.hitboxActive).toBe(true);
        expect(anim?.frames[3]?.hitboxActive).toBe(false);
      });

      it('attack animations reset on complete', () => {
        const anim = getAnimation('link_attack_down');
        expect(anim?.onComplete).toBe('RESET');
      });
    });

    describe('special animations', () => {
      it('has knockback animation', () => {
        const anim = getAnimation('link_knockback');
        expect(anim).toBeDefined();
        expect(anim?.frames.length).toBe(1);
        expect(anim?.loop).toBe(false);
      });

      it('has death spin animation', () => {
        const anim = getAnimation('link_death_spin');
        expect(anim).toBeDefined();
        expect(anim?.frames.length).toBe(4);
        expect(anim?.loop).toBe(true);
      });

      it('death spin cycles through all directions', () => {
        const anim = getAnimation('link_death_spin');
        expect(anim?.frames[0]?.spriteKey).toBe('link_down_1');
        expect(anim?.frames[1]?.spriteKey).toBe('link_left_1');
        expect(anim?.frames[2]?.spriteKey).toBe('link_up_1');
        expect(anim?.frames[3]?.spriteKey).toBe('link_right_1');
      });

      it('has pickup animation', () => {
        const anim = getAnimation('link_pickup');
        expect(anim).toBeDefined();
        expect(anim?.frames.length).toBe(1);
        expect(anim?.frames[0]?.duration).toBe(60);
      });
    });
  });

  describe('Enemy Animations', () => {
    describe('Octorok animations', () => {
      it('has red octorok walk animation', () => {
        const anim = getAnimation('octorok_red_walk');
        expect(anim).toBeDefined();
        expect(anim?.frames.length).toBe(2);
        expect(anim?.loop).toBe(true);
      });

      it('has blue octorok walk animation', () => {
        const anim = getAnimation('octorok_blue_walk');
        expect(anim).toBeDefined();
        expect(anim?.frames.length).toBe(2);
      });
    });

    describe('Keese animation', () => {
      it('has keese walk animation with faster flap', () => {
        const anim = getAnimation('keese_walk');
        expect(anim).toBeDefined();
        expect(anim?.frames[0]?.duration).toBe(KEESE_FLAP_DURATION);
        expect(anim?.frames[1]?.duration).toBe(KEESE_FLAP_DURATION);
      });
    });

    describe('Tektite animation', () => {
      it('has tektite walk animation', () => {
        const anim = getAnimation('tektite_walk');
        expect(anim).toBeDefined();
        expect(anim?.frames.length).toBe(2);
      });
    });

    describe('Moblin animations', () => {
      it('has red moblin walk animation', () => {
        const anim = getAnimation('moblin_red_walk');
        expect(anim).toBeDefined();
      });

      it('has blue moblin walk animation', () => {
        const anim = getAnimation('moblin_blue_walk');
        expect(anim).toBeDefined();
      });
    });

    describe('Aquamentus animation', () => {
      it('has aquamentus walk animation', () => {
        const anim = getAnimation('aquamentus_walk');
        expect(anim).toBeDefined();
        expect(anim?.frames.length).toBe(2);
      });
    });

    describe('Death puff animation', () => {
      it('has death puff animation', () => {
        const anim = getAnimation('enemy_death_puff');
        expect(anim).toBeDefined();
        expect(anim?.frames.length).toBe(3);
        expect(anim?.loop).toBe(false);
      });

      it('death puff marks for destruction on complete', () => {
        const anim = getAnimation('enemy_death_puff');
        expect(anim?.onComplete).toBe('DESTROY');
      });

      it('death puff has correct frame durations', () => {
        const anim = getAnimation('enemy_death_puff');
        for (const frame of anim?.frames ?? []) {
          expect(frame.duration).toBe(DEATH_PUFF_FRAME_DURATION);
        }
      });
    });
  });

  describe('Projectile Animations', () => {
    it('has sword beam animation', () => {
      const anim = getAnimation('sword_beam');
      expect(anim).toBeDefined();
      expect(anim?.loop).toBe(true);
    });

    it('has boomerang animation', () => {
      const anim = getAnimation('boomerang');
      expect(anim).toBeDefined();
      expect(anim?.frames.length).toBe(4);
      expect(anim?.loop).toBe(true);
    });

    it('has fireball animation', () => {
      const anim = getAnimation('fireball');
      expect(anim).toBeDefined();
      expect(anim?.loop).toBe(true);
    });
  });

  describe('Item Animations', () => {
    it('has item bob animations', () => {
      const items = [
        'item_heart',
        'item_rupee_green',
        'item_rupee_blue',
        'item_bomb',
        'item_key',
        'item_fairy',
        'item_triforce',
        'item_heart_container',
      ];

      for (const item of items) {
        const anim = getAnimation(`item_bob_${item}`);
        expect(anim).toBeDefined();
        expect(anim?.frames.length).toBe(4);
        expect(anim?.loop).toBe(true);
      }
    });

    it('item bob animations have offset values', () => {
      const anim = getAnimation('item_bob_item_heart');
      expect(anim?.frames[0]?.offsetY).toBe(0);
      expect(anim?.frames[1]?.offsetY).toBe(-2);
      expect(anim?.frames[2]?.offsetY).toBe(0);
      expect(anim?.frames[3]?.offsetY).toBe(2);
    });
  });

  describe('getLinkAnimationName', () => {
    it('returns correct idle animation name', () => {
      expect(getLinkAnimationName('IDLE', 'DOWN')).toBe('link_idle_down');
      expect(getLinkAnimationName('IDLE', 'UP')).toBe('link_idle_up');
      expect(getLinkAnimationName('IDLE', 'LEFT')).toBe('link_idle_left');
      expect(getLinkAnimationName('IDLE', 'RIGHT')).toBe('link_idle_right');
    });

    it('returns correct walk animation name', () => {
      expect(getLinkAnimationName('WALKING', 'DOWN')).toBe('link_walk_down');
      expect(getLinkAnimationName('WALKING', 'UP')).toBe('link_walk_up');
    });

    it('returns correct attack animation name', () => {
      expect(getLinkAnimationName('ATTACKING', 'DOWN')).toBe('link_attack_down');
      expect(getLinkAnimationName('ATTACKING', 'LEFT')).toBe('link_attack_left');
    });

    it('returns knockback animation regardless of direction', () => {
      expect(getLinkAnimationName('KNOCKBACK', 'DOWN')).toBe('link_knockback');
      expect(getLinkAnimationName('KNOCKBACK', 'UP')).toBe('link_knockback');
    });

    it('returns death spin animation regardless of direction', () => {
      expect(getLinkAnimationName('DYING', 'DOWN')).toBe('link_death_spin');
      expect(getLinkAnimationName('DYING', 'LEFT')).toBe('link_death_spin');
    });

    it('returns pickup animation regardless of direction', () => {
      expect(getLinkAnimationName('PICKUP', 'DOWN')).toBe('link_pickup');
    });
  });

  describe('getEnemyAnimationName', () => {
    it('returns walk animation name', () => {
      expect(getEnemyAnimationName('octorok_red', 'walk')).toBe('octorok_red_walk');
      expect(getEnemyAnimationName('keese', 'walk')).toBe('keese_walk');
    });

    it('returns death puff for death animation', () => {
      expect(getEnemyAnimationName('octorok_red', 'death')).toBe('enemy_death_puff');
      expect(getEnemyAnimationName('keese', 'death')).toBe('enemy_death_puff');
    });
  });

  describe('getAnimationDuration', () => {
    it('calculates total duration for walk animation', () => {
      const anim = getAnimation('link_walk_down');
      expect(anim).toBeDefined();
      const duration = getAnimationDuration(anim!);
      expect(duration).toBe(WALK_FRAME_DURATION * 2);
    });

    it('calculates total duration for attack animation', () => {
      const anim = getAnimation('link_attack_down');
      expect(anim).toBeDefined();
      const duration = getAnimationDuration(anim!);
      const expectedDuration = SWORD_ATTACK_DURATIONS.reduce((a, b) => a + b, 0);
      expect(duration).toBe(expectedDuration);
    });

    it('calculates total duration for death puff', () => {
      const anim = getAnimation('enemy_death_puff');
      expect(anim).toBeDefined();
      const duration = getAnimationDuration(anim!);
      expect(duration).toBe(DEATH_PUFF_FRAME_DURATION * 3);
    });
  });

  describe('resetAnimations', () => {
    it('can be called multiple times without error', () => {
      resetAnimations();
      resetAnimations();
      expect(hasAnimation('link_walk_down')).toBe(true);
    });

    it('re-initializes all animations', () => {
      const namesBefore = getAllAnimationNames().length;
      resetAnimations();
      const namesAfter = getAllAnimationNames().length;
      expect(namesAfter).toBe(namesBefore);
    });
  });
});
