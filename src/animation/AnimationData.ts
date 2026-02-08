// AnimationData.ts - Animation definitions for all game entities
// Refer to specs/rendering-and-animation.md Section 3

import type { Direction } from '../types';

// ===== ANIMATION INTERFACES =====

/**
 * A single frame in an animation sequence
 */
export interface AnimationFrame {
  /** Sprite key to display for this frame */
  spriteKey: string;

  /** Duration in game frames (ticks) this frame is displayed */
  duration: number;

  /** Optional hitbox active during this frame (for attack animations) */
  hitboxActive?: boolean;

  /** Optional sprite offset from entity position */
  offsetX?: number;
  offsetY?: number;
}

/**
 * An animation definition with multiple frames
 */
export interface Animation {
  /** Unique name (e.g., "link_walk_down", "octorok_move_left") */
  name: string;

  /** Ordered list of frames */
  frames: AnimationFrame[];

  /** Whether the animation loops */
  loop: boolean;

  /** Behavior on completion for non-looping animations */
  onComplete?: 'DESTROY' | 'HOLD_LAST' | 'RESET';
}

// ===== ANIMATION CONSTANTS =====

/** Walk animation frame duration (8 frames per sprite) */
export const WALK_FRAME_DURATION = 8;

/** Keese wing flap duration (faster than normal walk) */
export const KEESE_FLAP_DURATION = 4;

/** Death puff frame duration */
export const DEATH_PUFF_FRAME_DURATION = 4;

/** Sword attack frame durations per phase */
export const SWORD_ATTACK_DURATIONS = [1, 4, 3, 4] as const;

/** Individual attack frame durations for type-safe access */
const ATTACK_FRAME_0_DURATION = SWORD_ATTACK_DURATIONS[0];
const ATTACK_FRAME_1_DURATION = SWORD_ATTACK_DURATIONS[1];
const ATTACK_FRAME_2_DURATION = SWORD_ATTACK_DURATIONS[2];
const ATTACK_FRAME_3_DURATION = SWORD_ATTACK_DURATIONS[3];

/** Sword beam spin duration */
export const SWORD_BEAM_FRAME_DURATION = 3;

/** Boomerang spin duration */
export const BOOMERANG_FRAME_DURATION = 2;

/** Item pickup duration */
export const ITEM_PICKUP_DURATION = 60;

/** Knockback animation duration */
export const KNOCKBACK_DURATION = 16;

/** Death spin frame duration */
export const DEATH_SPIN_FRAME_DURATION = 4;

// ===== LINK ANIMATIONS =====

/** Creates Link idle animation for a direction */
function createLinkIdleAnimation(direction: Direction): Animation {
  const dirLower = direction.toLowerCase();
  return {
    name: `link_idle_${dirLower}`,
    frames: [{ spriteKey: `link_${dirLower}_1`, duration: 1 }],
    loop: false,
    onComplete: 'HOLD_LAST',
  };
}

/** Creates Link walk animation for a direction */
function createLinkWalkAnimation(direction: Direction): Animation {
  const dirLower = direction.toLowerCase();
  return {
    name: `link_walk_${dirLower}`,
    frames: [
      { spriteKey: `link_${dirLower}_1`, duration: WALK_FRAME_DURATION },
      { spriteKey: `link_${dirLower}_2`, duration: WALK_FRAME_DURATION },
    ],
    loop: true,
  };
}

/** Creates Link sword attack animation for a direction */
function createLinkAttackAnimation(direction: Direction): Animation {
  const dirLower = direction.toLowerCase();
  // Attack uses 4 frames with different durations
  // Frames 2-3 have active hitbox (indices 1-2 in durations)
  return {
    name: `link_attack_${dirLower}`,
    frames: [
      {
        spriteKey: `link_${dirLower}_1`,
        duration: ATTACK_FRAME_0_DURATION,
        hitboxActive: false,
      },
      {
        spriteKey: `link_attack_${dirLower}`,
        duration: ATTACK_FRAME_1_DURATION,
        hitboxActive: true,
      },
      {
        spriteKey: `link_attack_${dirLower}`,
        duration: ATTACK_FRAME_2_DURATION,
        hitboxActive: true,
      },
      {
        spriteKey: `link_${dirLower}_1`,
        duration: ATTACK_FRAME_3_DURATION,
        hitboxActive: false,
      },
    ],
    loop: false,
    onComplete: 'RESET',
  };
}

/** Link knockback animation (single frame with flashing handled externally) */
function createLinkKnockbackAnimation(): Animation {
  return {
    name: 'link_knockback',
    frames: [{ spriteKey: 'link_down_1', duration: KNOCKBACK_DURATION }],
    loop: false,
    onComplete: 'HOLD_LAST',
  };
}

/** Link death spin animation */
function createLinkDeathSpinAnimation(): Animation {
  return {
    name: 'link_death_spin',
    frames: [
      { spriteKey: 'link_down_1', duration: DEATH_SPIN_FRAME_DURATION },
      { spriteKey: 'link_left_1', duration: DEATH_SPIN_FRAME_DURATION },
      { spriteKey: 'link_up_1', duration: DEATH_SPIN_FRAME_DURATION },
      { spriteKey: 'link_right_1', duration: DEATH_SPIN_FRAME_DURATION },
    ],
    loop: true,
  };
}

/** Link item pickup animation (major item) */
function createLinkPickupAnimation(): Animation {
  return {
    name: 'link_pickup',
    frames: [{ spriteKey: 'link_up_1', duration: ITEM_PICKUP_DURATION }],
    loop: false,
    onComplete: 'HOLD_LAST',
  };
}

// ===== ENEMY ANIMATIONS =====

/** Creates a standard 2-frame walk animation for an enemy */
function createEnemyWalkAnimation(
  enemyType: string,
  frame1Suffix: string = '_1',
  frame2Suffix: string = '_2',
  frameDuration: number = WALK_FRAME_DURATION
): Animation {
  return {
    name: `${enemyType}_walk`,
    frames: [
      { spriteKey: `enemy_${enemyType}${frame1Suffix}`, duration: frameDuration },
      { spriteKey: `enemy_${enemyType}${frame2Suffix}`, duration: frameDuration },
    ],
    loop: true,
  };
}

/** Creates enemy death puff animation */
function createDeathPuffAnimation(): Animation {
  return {
    name: 'enemy_death_puff',
    frames: [
      { spriteKey: 'enemy_death_puff_1', duration: DEATH_PUFF_FRAME_DURATION },
      { spriteKey: 'enemy_death_puff_2', duration: DEATH_PUFF_FRAME_DURATION },
      { spriteKey: 'enemy_death_puff_3', duration: DEATH_PUFF_FRAME_DURATION },
    ],
    loop: false,
    onComplete: 'DESTROY',
  };
}

// ===== PROJECTILE ANIMATIONS =====

/** Sword beam spinning animation */
function createSwordBeamAnimation(): Animation {
  return {
    name: 'sword_beam',
    frames: [
      { spriteKey: 'sword_beam', duration: SWORD_BEAM_FRAME_DURATION },
      { spriteKey: 'sword_beam', duration: SWORD_BEAM_FRAME_DURATION }, // Rotated by renderer
    ],
    loop: true,
  };
}

/** Boomerang spinning animation */
function createBoomerangAnimation(): Animation {
  return {
    name: 'boomerang',
    frames: [
      { spriteKey: 'projectile_boomerang', duration: BOOMERANG_FRAME_DURATION },
      { spriteKey: 'projectile_boomerang', duration: BOOMERANG_FRAME_DURATION },
      { spriteKey: 'projectile_boomerang', duration: BOOMERANG_FRAME_DURATION },
      { spriteKey: 'projectile_boomerang', duration: BOOMERANG_FRAME_DURATION },
    ],
    loop: true,
  };
}

/** Fireball spinning animation */
function createFireballAnimation(): Animation {
  return {
    name: 'fireball',
    frames: [
      { spriteKey: 'projectile_fireball', duration: SWORD_BEAM_FRAME_DURATION },
      { spriteKey: 'projectile_fireball', duration: SWORD_BEAM_FRAME_DURATION },
    ],
    loop: true,
  };
}

// ===== ITEM ANIMATIONS =====

/** Item bob animation (float up and down) - uses same sprite */
function createItemBobAnimation(spriteKey: string): Animation {
  return {
    name: `item_bob_${spriteKey}`,
    frames: [
      { spriteKey, duration: 15, offsetY: 0 },
      { spriteKey, duration: 15, offsetY: -2 },
      { spriteKey, duration: 15, offsetY: 0 },
      { spriteKey, duration: 15, offsetY: 2 },
    ],
    loop: true,
  };
}

// ===== ANIMATION REGISTRY =====

/** All registered animations */
const ANIMATIONS: Map<string, Animation> = new Map();

/**
 * Registers an animation in the registry
 */
function registerAnimation(animation: Animation): void {
  ANIMATIONS.set(animation.name, animation);
}

/**
 * Initialize all animations
 */
function initializeAnimations(): void {
  // Clear existing
  ANIMATIONS.clear();

  // Link idle animations
  const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  for (const dir of directions) {
    registerAnimation(createLinkIdleAnimation(dir));
    registerAnimation(createLinkWalkAnimation(dir));
    registerAnimation(createLinkAttackAnimation(dir));
  }

  // Link special animations
  registerAnimation(createLinkKnockbackAnimation());
  registerAnimation(createLinkDeathSpinAnimation());
  registerAnimation(createLinkPickupAnimation());

  // Enemy walk animations
  registerAnimation(createEnemyWalkAnimation('octorok_red'));
  registerAnimation(createEnemyWalkAnimation('octorok_blue'));
  registerAnimation(createEnemyWalkAnimation('tektite', '_1', '_2', WALK_FRAME_DURATION));
  registerAnimation(createEnemyWalkAnimation('moblin_red'));
  registerAnimation(createEnemyWalkAnimation('moblin_blue'));
  registerAnimation(createEnemyWalkAnimation('keese', '_1', '_2', KEESE_FLAP_DURATION));
  registerAnimation(createEnemyWalkAnimation('aquamentus'));

  // Death puff
  registerAnimation(createDeathPuffAnimation());

  // Projectile animations
  registerAnimation(createSwordBeamAnimation());
  registerAnimation(createBoomerangAnimation());
  registerAnimation(createFireballAnimation());

  // Item bob animations
  registerAnimation(createItemBobAnimation('item_heart'));
  registerAnimation(createItemBobAnimation('item_rupee_green'));
  registerAnimation(createItemBobAnimation('item_rupee_blue'));
  registerAnimation(createItemBobAnimation('item_bomb'));
  registerAnimation(createItemBobAnimation('item_key'));
  registerAnimation(createItemBobAnimation('item_fairy'));
  registerAnimation(createItemBobAnimation('item_triforce'));
  registerAnimation(createItemBobAnimation('item_heart_container'));
}

// Initialize on module load
initializeAnimations();

/**
 * Gets an animation by name
 * @param name Animation name
 * @returns Animation or undefined if not found
 */
export function getAnimation(name: string): Animation | undefined {
  return ANIMATIONS.get(name);
}

/**
 * Checks if an animation exists
 * @param name Animation name
 */
export function hasAnimation(name: string): boolean {
  return ANIMATIONS.has(name);
}

/**
 * Gets all registered animation names
 */
export function getAllAnimationNames(): string[] {
  return Array.from(ANIMATIONS.keys());
}

/**
 * Re-initializes the animation registry (useful for testing)
 */
export function resetAnimations(): void {
  initializeAnimations();
}

/**
 * Generates animation name for Link based on state and direction
 */
export function getLinkAnimationName(
  state: 'IDLE' | 'WALKING' | 'ATTACKING' | 'KNOCKBACK' | 'DYING' | 'PICKUP',
  direction: Direction
): string {
  const dirLower = direction.toLowerCase();
  switch (state) {
    case 'IDLE':
      return `link_idle_${dirLower}`;
    case 'WALKING':
      return `link_walk_${dirLower}`;
    case 'ATTACKING':
      return `link_attack_${dirLower}`;
    case 'KNOCKBACK':
      return 'link_knockback';
    case 'DYING':
      return 'link_death_spin';
    case 'PICKUP':
      return 'link_pickup';
  }
}

/**
 * Generates animation name for an enemy type
 */
export function getEnemyAnimationName(
  enemyType: string,
  animationType: 'walk' | 'death'
): string {
  if (animationType === 'death') {
    return 'enemy_death_puff';
  }
  return `${enemyType}_walk`;
}

/**
 * Gets the total duration of an animation in frames
 */
export function getAnimationDuration(animation: Animation): number {
  return animation.frames.reduce((sum, frame) => sum + frame.duration, 0);
}
