// src/data/enemyArchetypes.ts - Enemy archetype definitions
// All enemy archetypes as specified in enemy-and-ai-behavior.md

import type {
  EnemyArchetype,
  EnemyBaseType,
  EnemyVariant,
  EnemyFlags,
  DamageVulnerabilities,
  SpawnBehavior,
  MovementPattern,
  AttackPattern,
  RandomWalkPattern,
  HopPattern,
  FlyPattern,
  ProjectileAttack,
  ContactOnlyAttack,
  SpritePriority,
} from '../types';

// ===== DEFAULT VALUES =====

/** Default flags for standard enemies */
const DEFAULT_FLAGS: EnemyFlags = {
  swordImmune: false,
  stealsItem: false,
  warpsLink: false,
  splitsOnDeath: false,
  splitInto: [],
  conditionalVulnerability: false,
  weaknessItem: null,
  phasesThroughWalls: false,
};

/** Default vulnerabilities for standard enemies */
const DEFAULT_VULNERABILITIES: DamageVulnerabilities = {
  sword: 1,
  swordBeam: 1,
  arrow: 1,
  silverArrow: 1,
  bomb: 1,
  boomerang: 0, // Boomerang stuns but doesn't damage most enemies
  candleFlame: 1,
  magicRod: 1,
  recorder: 0,
};

/** Standard 16x16 hitbox for most enemies */
const STANDARD_HITBOX = {
  offsetX: 0,
  offsetY: 0,
  width: 16,
  height: 16,
};

// ===== MOVEMENT PATTERNS =====

/** Random walk pattern for Octorok (red) - slower, longer pauses */
const OCTOROK_RED_MOVEMENT: RandomWalkPattern = {
  type: 'RANDOM_WALK',
  speed: 0.5,
  walkDuration: { min: 32, max: 64 },
  pauseDuration: { min: 16, max: 32 },
  axisAligned: true,
  respectsCollision: true,
};

/** Random walk pattern for Octorok (blue) - faster, shorter pauses */
const OCTOROK_BLUE_MOVEMENT: RandomWalkPattern = {
  type: 'RANDOM_WALK',
  speed: 0.75,
  walkDuration: { min: 32, max: 64 },
  pauseDuration: { min: 8, max: 16 },
  axisAligned: true,
  respectsCollision: true,
};

/** Hop pattern for Tektite (red) - random direction */
const TEKTITE_RED_MOVEMENT: HopPattern = {
  type: 'HOP',
  hopSpeed: 2.0,
  hopDuration: 16,
  restDuration: { min: 30, max: 90 },
  hopDirection: 'RANDOM',
  respectsCollision: true,
};

/** Hop pattern for Tektite (blue) - hops toward Link */
const TEKTITE_BLUE_MOVEMENT: HopPattern = {
  type: 'HOP',
  hopSpeed: 2.5,
  hopDuration: 16,
  restDuration: { min: 20, max: 60 },
  hopDirection: 'TOWARD_LINK',
  respectsCollision: true,
};

/** Random walk pattern for Moblin (red) */
const MOBLIN_RED_MOVEMENT: RandomWalkPattern = {
  type: 'RANDOM_WALK',
  speed: 0.75,
  walkDuration: { min: 24, max: 48 },
  pauseDuration: { min: 8, max: 16 },
  axisAligned: true,
  respectsCollision: true,
};

/** Random walk pattern for Moblin (blue) - faster */
const MOBLIN_BLUE_MOVEMENT: RandomWalkPattern = {
  type: 'RANDOM_WALK',
  speed: 1.0,
  walkDuration: { min: 24, max: 48 },
  pauseDuration: { min: 0, max: 8 },
  axisAligned: true,
  respectsCollision: true,
};

/** Fly pattern for Keese */
const KEESE_MOVEMENT: FlyPattern = {
  type: 'FLY',
  speed: 1.5,
  directionChangePeriod: { min: 16, max: 32 },
  entersFromEdge: false,
  ignoresCollision: true,
  wobble: true,
  wobbleAmplitude: 4,
};

// ===== ATTACK PATTERNS =====

/** Projectile attack for Octorok (both variants) */
const OCTOROK_ATTACK: ProjectileAttack = {
  type: 'PROJECTILE',
  projectileType: 'ROCK',
  cooldown: { min: 60, max: 120 },
  aimMode: 'CARDINAL_AT_LINK',
  volleyCount: 1,
  volleySpread: 0,
  maxActiveProjectiles: 2,
  pausesDuringAttack: true,
  attackAnimationFrames: 8,
};

/** Projectile attack for Moblin (red) - slower attack rate */
const MOBLIN_RED_ATTACK: ProjectileAttack = {
  type: 'PROJECTILE',
  projectileType: 'ARROW',
  cooldown: { min: 60, max: 120 },
  aimMode: 'CURRENT_FACING',
  volleyCount: 1,
  volleySpread: 0,
  maxActiveProjectiles: 2,
  pausesDuringAttack: true,
  attackAnimationFrames: 8,
};

/** Projectile attack for Moblin (blue) - faster attack rate */
const MOBLIN_BLUE_ATTACK: ProjectileAttack = {
  type: 'PROJECTILE',
  projectileType: 'ARROW',
  cooldown: { min: 40, max: 90 },
  aimMode: 'CURRENT_FACING',
  volleyCount: 1,
  volleySpread: 0,
  maxActiveProjectiles: 2,
  pausesDuringAttack: true,
  attackAnimationFrames: 8,
};

/** Contact-only attack (no ranged attack) */
const CONTACT_ONLY_ATTACK: ContactOnlyAttack = {
  type: 'CONTACT_ONLY',
};

// ===== ENEMY ARCHETYPES =====

/**
 * Octorok (Red) - Basic overworld enemy
 * Slow movement, fires rocks at Link
 */
export const OCTOROK_RED: EnemyArchetype = {
  id: 'OCTOROK_RED',
  name: 'Red Octorok',
  baseType: 'OCTOROK' as EnemyBaseType,
  variant: 'RED' as EnemyVariant,
  hp: 1,
  contactDamage: 1,
  movementPattern: OCTOROK_RED_MOVEMENT,
  attackPattern: OCTOROK_ATTACK,
  spriteWidth: 16,
  spriteHeight: 16,
  hitbox: STANDARD_HITBOX,
  speed: 0.5,
  vulnerabilities: DEFAULT_VULNERABILITIES,
  spawnBehavior: 'IMMEDIATE' as SpawnBehavior,
  countsTowardLimit: true,
  advancesKillCounter: true,
  boomerangStunnable: true,
  stunDuration: 60,
  knockbackable: true,
  spritePriority: 2 as SpritePriority,
  blocksMovement: false,
  flags: DEFAULT_FLAGS,
};

/**
 * Octorok (Blue) - Faster, tougher variant
 * Faster movement and shooting, more HP
 */
export const OCTOROK_BLUE: EnemyArchetype = {
  id: 'OCTOROK_BLUE',
  name: 'Blue Octorok',
  baseType: 'OCTOROK' as EnemyBaseType,
  variant: 'BLUE' as EnemyVariant,
  hp: 2,
  contactDamage: 1,
  movementPattern: OCTOROK_BLUE_MOVEMENT,
  attackPattern: OCTOROK_ATTACK,
  spriteWidth: 16,
  spriteHeight: 16,
  hitbox: STANDARD_HITBOX,
  speed: 0.75,
  vulnerabilities: DEFAULT_VULNERABILITIES,
  spawnBehavior: 'IMMEDIATE' as SpawnBehavior,
  countsTowardLimit: true,
  advancesKillCounter: true,
  boomerangStunnable: true,
  stunDuration: 60,
  knockbackable: true,
  spritePriority: 2 as SpritePriority,
  blocksMovement: false,
  flags: DEFAULT_FLAGS,
};

/**
 * Tektite (Red) - Hopping spider enemy
 * Hops randomly around the screen
 */
export const TEKTITE_RED: EnemyArchetype = {
  id: 'TEKTITE_RED',
  name: 'Red Tektite',
  baseType: 'TEKTITE' as EnemyBaseType,
  variant: 'RED' as EnemyVariant,
  hp: 1,
  contactDamage: 1,
  movementPattern: TEKTITE_RED_MOVEMENT,
  attackPattern: CONTACT_ONLY_ATTACK,
  spriteWidth: 16,
  spriteHeight: 16,
  hitbox: STANDARD_HITBOX,
  speed: 2.0,
  vulnerabilities: DEFAULT_VULNERABILITIES,
  spawnBehavior: 'IMMEDIATE' as SpawnBehavior,
  countsTowardLimit: true,
  advancesKillCounter: true,
  boomerangStunnable: true,
  stunDuration: 60,
  knockbackable: true,
  spritePriority: 2 as SpritePriority,
  blocksMovement: false,
  flags: DEFAULT_FLAGS,
};

/**
 * Tektite (Blue) - More aggressive hopping enemy
 * Hops toward Link, faster movement
 */
export const TEKTITE_BLUE: EnemyArchetype = {
  id: 'TEKTITE_BLUE',
  name: 'Blue Tektite',
  baseType: 'TEKTITE' as EnemyBaseType,
  variant: 'BLUE' as EnemyVariant,
  hp: 2,
  contactDamage: 1,
  movementPattern: TEKTITE_BLUE_MOVEMENT,
  attackPattern: CONTACT_ONLY_ATTACK,
  spriteWidth: 16,
  spriteHeight: 16,
  hitbox: STANDARD_HITBOX,
  speed: 2.5,
  vulnerabilities: DEFAULT_VULNERABILITIES,
  spawnBehavior: 'IMMEDIATE' as SpawnBehavior,
  countsTowardLimit: true,
  advancesKillCounter: true,
  boomerangStunnable: true,
  stunDuration: 60,
  knockbackable: true,
  spritePriority: 2 as SpritePriority,
  blocksMovement: false,
  flags: DEFAULT_FLAGS,
};

/**
 * Moblin (Red) - Pig-like enemy with arrows
 * Walks randomly, fires arrows in facing direction
 */
export const MOBLIN_RED: EnemyArchetype = {
  id: 'MOBLIN_RED',
  name: 'Red Moblin',
  baseType: 'MOBLIN' as EnemyBaseType,
  variant: 'RED' as EnemyVariant,
  hp: 2,
  contactDamage: 1,
  movementPattern: MOBLIN_RED_MOVEMENT,
  attackPattern: MOBLIN_RED_ATTACK,
  spriteWidth: 16,
  spriteHeight: 16,
  hitbox: STANDARD_HITBOX,
  speed: 0.75,
  vulnerabilities: DEFAULT_VULNERABILITIES,
  spawnBehavior: 'IMMEDIATE' as SpawnBehavior,
  countsTowardLimit: true,
  advancesKillCounter: true,
  boomerangStunnable: true,
  stunDuration: 60,
  knockbackable: true,
  spritePriority: 2 as SpritePriority,
  blocksMovement: false,
  flags: DEFAULT_FLAGS,
};

/**
 * Moblin (Blue) - Faster, tougher Moblin variant
 * Faster movement and shooting, more HP
 */
export const MOBLIN_BLUE: EnemyArchetype = {
  id: 'MOBLIN_BLUE',
  name: 'Blue Moblin',
  baseType: 'MOBLIN' as EnemyBaseType,
  variant: 'BLUE' as EnemyVariant,
  hp: 3,
  contactDamage: 1,
  movementPattern: MOBLIN_BLUE_MOVEMENT,
  attackPattern: MOBLIN_BLUE_ATTACK,
  spriteWidth: 16,
  spriteHeight: 16,
  hitbox: STANDARD_HITBOX,
  speed: 1.0,
  vulnerabilities: DEFAULT_VULNERABILITIES,
  spawnBehavior: 'IMMEDIATE' as SpawnBehavior,
  countsTowardLimit: true,
  advancesKillCounter: true,
  boomerangStunnable: true,
  stunDuration: 60,
  knockbackable: true,
  spritePriority: 2 as SpritePriority,
  blocksMovement: false,
  flags: DEFAULT_FLAGS,
};

/**
 * Keese - Flying bat enemy
 * Flies erratically with wobbling motion
 */
export const KEESE: EnemyArchetype = {
  id: 'KEESE',
  name: 'Keese',
  baseType: 'KEESE' as EnemyBaseType,
  variant: 'DEFAULT' as EnemyVariant,
  hp: 1,
  contactDamage: 1,
  movementPattern: KEESE_MOVEMENT,
  attackPattern: CONTACT_ONLY_ATTACK,
  spriteWidth: 16,
  spriteHeight: 16,
  hitbox: STANDARD_HITBOX,
  speed: 1.5,
  vulnerabilities: DEFAULT_VULNERABILITIES,
  spawnBehavior: 'FLY_IN' as SpawnBehavior,
  countsTowardLimit: true,
  advancesKillCounter: true,
  boomerangStunnable: true,
  stunDuration: 60,
  knockbackable: false, // Flying enemies typically don't get knocked back
  spritePriority: 3 as SpritePriority, // Higher priority for flying enemies
  blocksMovement: false,
  flags: DEFAULT_FLAGS,
};

// ===== BOSS PATTERNS =====

/** Movement pattern for Aquamentus - slow horizontal drift */
const AQUAMENTUS_MOVEMENT: RandomWalkPattern = {
  type: 'RANDOM_WALK',
  speed: 0.25,
  walkDuration: { min: 60, max: 120 },
  pauseDuration: { min: 30, max: 60 },
  axisAligned: true,
  respectsCollision: false, // Boss doesn't get stuck on walls
};

/** Fireball attack for Aquamentus - 3 fireballs in spread pattern */
const AQUAMENTUS_ATTACK: ProjectileAttack = {
  type: 'PROJECTILE',
  projectileType: 'FIREBALL',
  cooldown: { min: 90, max: 150 },
  aimMode: 'FIXED_DIRECTIONS', // 3-spread pattern
  volleyCount: 3,
  volleySpread: 22.5, // degrees between fireballs
  maxActiveProjectiles: 6,
  pausesDuringAttack: false,
  attackAnimationFrames: 16,
};

/** Boss flags - cannot be stunned, doesn't count toward normal enemy limit */
const BOSS_FLAGS: EnemyFlags = {
  ...DEFAULT_FLAGS,
  swordImmune: false,
};

/**
 * Aquamentus - Dungeon 1 Boss (Dragon)
 * Slow horizontal drift, shoots 3 fireballs in spread pattern
 * 6 HP (6 sword hits with wooden sword)
 */
export const AQUAMENTUS: EnemyArchetype = {
  id: 'AQUAMENTUS',
  name: 'Aquamentus',
  baseType: 'AQUAMENTUS' as EnemyBaseType,
  variant: 'DEFAULT' as EnemyVariant,
  hp: 6,
  contactDamage: 2,
  movementPattern: AQUAMENTUS_MOVEMENT,
  attackPattern: AQUAMENTUS_ATTACK,
  spriteWidth: 32,
  spriteHeight: 32,
  hitbox: {
    offsetX: 0,
    offsetY: 8,
    width: 32,
    height: 24,
  },
  speed: 0.25,
  vulnerabilities: {
    ...DEFAULT_VULNERABILITIES,
    bomb: 4, // Bombs deal heavy damage
  },
  spawnBehavior: 'IMMEDIATE' as SpawnBehavior,
  countsTowardLimit: false, // Bosses don't count toward normal enemy limit
  advancesKillCounter: true, // But defeating them clears the room
  boomerangStunnable: false, // Bosses can't be stunned
  stunDuration: 0,
  knockbackable: false, // Bosses don't get knocked back
  spritePriority: 4 as SpritePriority, // Higher priority than regular enemies
  blocksMovement: false,
  flags: BOSS_FLAGS,
};

// ===== ARCHETYPE MAP =====

/** Map of all enemy archetypes by ID for quick lookup */
export const ENEMY_ARCHETYPES: Readonly<Record<string, EnemyArchetype>> = {
  OCTOROK_RED,
  OCTOROK_BLUE,
  TEKTITE_RED,
  TEKTITE_BLUE,
  MOBLIN_RED,
  MOBLIN_BLUE,
  KEESE,
  AQUAMENTUS,
};

/**
 * Get an enemy archetype by ID
 * @param id - The archetype ID (e.g., 'OCTOROK_RED')
 * @returns The archetype or undefined if not found
 */
export function getEnemyArchetype(id: string): EnemyArchetype | undefined {
  return ENEMY_ARCHETYPES[id];
}

/**
 * Get all enemy archetypes
 * @returns Array of all defined archetypes
 */
export function getAllEnemyArchetypes(): EnemyArchetype[] {
  return Object.values(ENEMY_ARCHETYPES);
}

/**
 * Get archetypes by base type
 * @param baseType - The base enemy type
 * @returns Array of archetypes with that base type
 */
export function getArchetypesByBaseType(
  baseType: EnemyBaseType
): EnemyArchetype[] {
  return getAllEnemyArchetypes().filter((a) => a.baseType === baseType);
}

/**
 * Get archetypes by variant
 * @param variant - The enemy variant (RED, BLUE, DEFAULT)
 * @returns Array of archetypes with that variant
 */
export function getArchetypesByVariant(
  variant: EnemyVariant
): EnemyArchetype[] {
  return getAllEnemyArchetypes().filter((a) => a.variant === variant);
}

// ===== MOVEMENT PATTERN TYPE HELPERS =====

/**
 * Check if a movement pattern is RANDOM_WALK type
 */
export function isRandomWalkPattern(
  pattern: MovementPattern
): pattern is RandomWalkPattern {
  return pattern.type === 'RANDOM_WALK';
}

/**
 * Check if a movement pattern is HOP type
 */
export function isHopPattern(pattern: MovementPattern): pattern is HopPattern {
  return pattern.type === 'HOP';
}

/**
 * Check if a movement pattern is FLY type
 */
export function isFlyPattern(pattern: MovementPattern): pattern is FlyPattern {
  return pattern.type === 'FLY';
}

/**
 * Check if an attack pattern is PROJECTILE type
 */
export function isProjectileAttack(
  pattern: AttackPattern | null
): pattern is ProjectileAttack {
  return pattern !== null && pattern.type === 'PROJECTILE';
}

/**
 * Check if an attack pattern is CONTACT_ONLY type
 */
export function isContactOnlyAttack(
  pattern: AttackPattern | null
): pattern is ContactOnlyAttack {
  return pattern !== null && pattern.type === 'CONTACT_ONLY';
}
