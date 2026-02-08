// Animation module barrel export

export {
  type Animation,
  type AnimationFrame,
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
  SWORD_BEAM_FRAME_DURATION,
  BOOMERANG_FRAME_DURATION,
  ITEM_PICKUP_DURATION,
  KNOCKBACK_DURATION,
  DEATH_SPIN_FRAME_DURATION,
} from './AnimationData';

export {
  AnimationSystem,
  type AnimationInstance,
  getAnimationSystem,
  resetAnimationSystem,
} from './AnimationSystem';
