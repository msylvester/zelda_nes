// Enemy.ts - Enemy entity implementation
// Implements spec section 5.8 - Enemy System

import {
  Direction,
  EnemyState,
  SpriteRenderCommand,
  AABB,
  EnemyArchetype,
  RandomWalkPattern,
  HopPattern,
  FlyPattern,
} from '../types';
import {
  KNOCKBACK_DISTANCE,
  KNOCKBACK_FRAMES,
  DEATH_ANIMATION_FRAMES,
} from '../constants';
import { randomInt, randomPick } from '../utils/PRNG';
import { clamp } from '../utils/math';
import { BaseEntity, EnemyEntity, createOffsetHitbox } from './Entity';
import {
  getEnemyArchetype,
  isRandomWalkPattern,
  isHopPattern,
  isFlyPattern,
} from '../data/enemyArchetypes';

/**
 * Direction vectors for movement
 */
const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

/**
 * All four cardinal directions
 */
const ALL_DIRECTIONS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

/**
 * Collision check function type
 * Returns true if the hitbox collides with solid tiles
 */
export type EnemyCollisionChecker = (hitbox: AABB) => boolean;

/**
 * Player position provider for AI targeting
 */
export interface PlayerPositionProvider {
  getX(): number;
  getY(): number;
}

/**
 * Enemy entity - enemies that can move, attack, and be killed
 */
export class Enemy extends BaseEntity implements EnemyEntity {
  // EnemyEntity interface
  entityType = 'ENEMY' as const;
  state: EnemyState = 'SPAWNING';
  hp: number;
  maxHp: number;
  contactDamage: number;
  archetypeId: string;
  knockbackable: boolean;
  countsTowardLimit: boolean;
  advancesKillCounter: boolean;

  // Archetype reference
  private archetype: EnemyArchetype;

  // State timers
  private stateTimer: number = 0;
  private spawnTimer: number = 0;
  private readonly SPAWN_DURATION = 30; // frames for spawn animation

  // Movement state
  private movementTimer: number = 0;
  private pauseTimer: number = 0;
  private isMoving: boolean = false;

  // Knockback state
  private knockbackDirection: Direction | null = null;
  private knockbackProgress: number = 0;

  // Stun state
  private stunTimer: number = 0;

  // Animation
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private readonly WALK_ANIMATION_SPEED = 12; // frames per animation frame

  // Collision checker (injected dependency)
  private collisionChecker: EnemyCollisionChecker | null = null;

  // Player position provider (for AI targeting)
  private playerProvider: PlayerPositionProvider | null = null;

  // For FLY pattern
  private wobblePhase: number = 0;

  // For HOP pattern
  private isHopping: boolean = false;
  private hopTimer: number = 0;
  private hopDirection: Direction = 'DOWN';

  constructor(x: number, y: number, archetypeId: string) {
    const archetype = getEnemyArchetype(archetypeId);
    if (!archetype) {
      throw new Error(`Unknown enemy archetype: ${archetypeId}`);
    }

    super(
      'ENEMY',
      x,
      y,
      archetype.spriteWidth,
      archetype.spriteHeight,
      'enemy'
    );

    this.archetype = archetype;
    this.archetypeId = archetypeId;
    this.hp = archetype.hp;
    this.maxHp = archetype.hp;
    this.contactDamage = archetype.contactDamage;
    this.knockbackable = archetype.knockbackable;
    this.countsTowardLimit = archetype.countsTowardLimit;
    this.advancesKillCounter = archetype.advancesKillCounter;
    this.spritePriority = archetype.spritePriority;

    // Start in SPAWNING state
    this.state = 'SPAWNING';
    this.spawnTimer = this.SPAWN_DURATION;

    // Initialize movement direction
    this.facingDirection = randomPick(ALL_DIRECTIONS);

    // Initialize movement timers
    this.initializeMovementTimers();
  }

  /**
   * Set the collision checker function
   */
  setCollisionChecker(checker: EnemyCollisionChecker): void {
    this.collisionChecker = checker;
  }

  /**
   * Set the player position provider for AI targeting
   */
  setPlayerProvider(provider: PlayerPositionProvider): void {
    this.playerProvider = provider;
  }

  /**
   * Initialize movement timers based on pattern
   */
  private initializeMovementTimers(): void {
    const pattern = this.archetype.movementPattern;

    if (isRandomWalkPattern(pattern)) {
      this.movementTimer = randomInt(pattern.walkDuration.min, pattern.walkDuration.max);
      this.isMoving = true;
    } else if (isHopPattern(pattern)) {
      this.hopTimer = 0;
      this.pauseTimer = randomInt(pattern.restDuration.min, pattern.restDuration.max);
      this.isHopping = false;
    } else if (isFlyPattern(pattern)) {
      this.movementTimer = randomInt(
        pattern.directionChangePeriod.min,
        pattern.directionChangePeriod.max
      );
      this.isMoving = true;
    }
  }

  /**
   * Get the collision hitbox
   */
  override getHitbox(): AABB {
    const hitboxDef = this.archetype.hitbox;
    return createOffsetHitbox(
      this.x,
      this.y,
      hitboxDef.width,
      hitboxDef.height,
      hitboxDef.offsetX,
      hitboxDef.offsetY
    );
  }

  /**
   * Main update function
   */
  override update(deltaFrame: number): void {
    switch (this.state) {
      case 'SPAWNING':
        this.updateSpawning(deltaFrame);
        break;

      case 'ACTIVE':
        this.updateActive(deltaFrame);
        break;

      case 'STUNNED':
        this.updateStunned(deltaFrame);
        break;

      case 'KNOCKBACK':
        this.updateKnockback(deltaFrame);
        break;

      case 'DYING':
        this.updateDying(deltaFrame);
        break;

      case 'SUBMERGED':
      case 'INVISIBLE':
      case 'DAMAGED':
        // These states are not used for basic enemies yet
        break;
    }

    // Update animation
    this.updateAnimation(deltaFrame);
  }

  /**
   * Update spawning state
   */
  private updateSpawning(deltaFrame: number): void {
    this.spawnTimer -= deltaFrame;
    if (this.spawnTimer <= 0) {
      this.state = 'ACTIVE';
    }
  }

  /**
   * Update active state (movement and AI)
   */
  private updateActive(deltaFrame: number): void {
    const pattern = this.archetype.movementPattern;

    if (isRandomWalkPattern(pattern)) {
      this.updateRandomWalk(deltaFrame, pattern);
    } else if (isHopPattern(pattern)) {
      this.updateHop(deltaFrame, pattern);
    } else if (isFlyPattern(pattern)) {
      this.updateFly(deltaFrame, pattern);
    }
  }

  /**
   * Update RANDOM_WALK movement pattern
   */
  private updateRandomWalk(deltaFrame: number, pattern: RandomWalkPattern): void {
    if (this.isMoving) {
      // Move in current direction
      this.moveInDirection(deltaFrame, pattern.speed, pattern.respectsCollision);

      // Check if walk duration is over
      this.movementTimer -= deltaFrame;
      if (this.movementTimer <= 0) {
        // Start pause
        this.isMoving = false;
        this.pauseTimer = randomInt(pattern.pauseDuration.min, pattern.pauseDuration.max);
      }
    } else {
      // Pausing
      this.pauseTimer -= deltaFrame;
      if (this.pauseTimer <= 0) {
        // Pick new direction and start walking
        this.facingDirection = randomPick(ALL_DIRECTIONS);
        this.movementTimer = randomInt(pattern.walkDuration.min, pattern.walkDuration.max);
        this.isMoving = true;
      }
    }
  }

  /**
   * Update HOP movement pattern
   */
  private updateHop(deltaFrame: number, pattern: HopPattern): void {
    if (this.isHopping) {
      // Currently in a hop
      this.moveInDirection(deltaFrame, pattern.hopSpeed, pattern.respectsCollision);

      this.hopTimer -= deltaFrame;
      if (this.hopTimer <= 0) {
        // End hop, start rest
        this.isHopping = false;
        this.pauseTimer = randomInt(pattern.restDuration.min, pattern.restDuration.max);
      }
    } else {
      // Resting between hops
      this.pauseTimer -= deltaFrame;
      if (this.pauseTimer <= 0) {
        // Start new hop
        this.isHopping = true;
        this.hopTimer = pattern.hopDuration;

        // Determine hop direction
        if (pattern.hopDirection === 'TOWARD_LINK' && this.playerProvider) {
          this.hopDirection = this.getDirectionToPlayer();
        } else {
          this.hopDirection = randomPick(ALL_DIRECTIONS);
        }
        this.facingDirection = this.hopDirection;
      }
    }
  }

  /**
   * Update FLY movement pattern
   */
  private updateFly(deltaFrame: number, pattern: FlyPattern): void {
    // Move in current direction
    const vec = DIRECTION_VECTORS[this.facingDirection];
    let dx = vec.x * pattern.speed * deltaFrame;
    let dy = vec.y * pattern.speed * deltaFrame;

    // Apply wobble if enabled
    if (pattern.wobble) {
      this.wobblePhase += deltaFrame * 0.3;
      const wobbleOffset = Math.sin(this.wobblePhase) * pattern.wobbleAmplitude * 0.1;

      // Wobble perpendicular to movement
      if (this.facingDirection === 'UP' || this.facingDirection === 'DOWN') {
        dx += wobbleOffset;
      } else {
        dy += wobbleOffset;
      }
    }

    // Flying enemies typically ignore collision
    if (pattern.ignoresCollision) {
      this.x += dx;
      this.y += dy;
    } else {
      this.moveWithCollision(dx, dy);
    }

    // Check for direction change
    this.movementTimer -= deltaFrame;
    if (this.movementTimer <= 0) {
      this.facingDirection = randomPick(ALL_DIRECTIONS);
      this.movementTimer = randomInt(
        pattern.directionChangePeriod.min,
        pattern.directionChangePeriod.max
      );
    }

    // Keep flying enemies within screen bounds (roughly)
    this.x = clamp(this.x, 0, 256 - this.width);
    this.y = clamp(this.y, 0, 176 - this.height);
  }

  /**
   * Move in the current facing direction
   */
  private moveInDirection(
    deltaFrame: number,
    speed: number,
    respectsCollision: boolean
  ): void {
    const vec = DIRECTION_VECTORS[this.facingDirection];
    const dx = vec.x * speed * deltaFrame;
    const dy = vec.y * speed * deltaFrame;

    if (respectsCollision) {
      this.moveWithCollision(dx, dy);
    } else {
      this.x += dx;
      this.y += dy;
    }
  }

  /**
   * Move with collision checking
   */
  private moveWithCollision(dx: number, dy: number): void {
    if (!this.collisionChecker) {
      // No collision checker, just move
      this.x += dx;
      this.y += dy;
      return;
    }

    const newX = this.x + dx;
    const newY = this.y + dy;
    const hitboxDef = this.archetype.hitbox;

    // Try full movement
    const newHitbox = createOffsetHitbox(
      newX,
      newY,
      hitboxDef.width,
      hitboxDef.height,
      hitboxDef.offsetX,
      hitboxDef.offsetY
    );

    if (!this.collisionChecker(newHitbox)) {
      this.x = newX;
      this.y = newY;
      return;
    }

    // Try just X movement
    const xOnlyHitbox = createOffsetHitbox(
      newX,
      this.y,
      hitboxDef.width,
      hitboxDef.height,
      hitboxDef.offsetX,
      hitboxDef.offsetY
    );

    if (dx !== 0 && !this.collisionChecker(xOnlyHitbox)) {
      this.x = newX;
      // Change direction when blocked
      this.facingDirection = randomPick(ALL_DIRECTIONS);
      return;
    }

    // Try just Y movement
    const yOnlyHitbox = createOffsetHitbox(
      this.x,
      newY,
      hitboxDef.width,
      hitboxDef.height,
      hitboxDef.offsetX,
      hitboxDef.offsetY
    );

    if (dy !== 0 && !this.collisionChecker(yOnlyHitbox)) {
      this.y = newY;
      // Change direction when blocked
      this.facingDirection = randomPick(ALL_DIRECTIONS);
      return;
    }

    // Blocked completely, change direction
    this.facingDirection = randomPick(ALL_DIRECTIONS);
  }

  /**
   * Get direction toward the player
   */
  private getDirectionToPlayer(): Direction {
    if (!this.playerProvider) {
      return randomPick(ALL_DIRECTIONS);
    }

    const playerX = this.playerProvider.getX();
    const playerY = this.playerProvider.getY();
    const dx = playerX - this.x;
    const dy = playerY - this.y;

    // Choose axis-aligned direction toward player
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      return dy > 0 ? 'DOWN' : 'UP';
    }
  }

  /**
   * Update stunned state
   */
  private updateStunned(deltaFrame: number): void {
    this.stunTimer -= deltaFrame;
    if (this.stunTimer <= 0) {
      this.state = 'ACTIVE';
    }
  }

  /**
   * Update knockback state
   */
  private updateKnockback(deltaFrame: number): void {
    if (!this.knockbackDirection) {
      this.state = 'ACTIVE';
      return;
    }

    // Move in knockback direction
    const knockbackSpeed = KNOCKBACK_DISTANCE / KNOCKBACK_FRAMES;
    const vec = DIRECTION_VECTORS[this.knockbackDirection];
    const dx = vec.x * knockbackSpeed * deltaFrame;
    const dy = vec.y * knockbackSpeed * deltaFrame;

    // Check collision during knockback
    if (this.collisionChecker) {
      const hitboxDef = this.archetype.hitbox;
      const newHitbox = createOffsetHitbox(
        this.x + dx,
        this.y + dy,
        hitboxDef.width,
        hitboxDef.height,
        hitboxDef.offsetX,
        hitboxDef.offsetY
      );

      if (!this.collisionChecker(newHitbox)) {
        this.x += dx;
        this.y += dy;
      }
    } else {
      this.x += dx;
      this.y += dy;
    }

    // Track knockback progress
    this.knockbackProgress += deltaFrame;
    if (this.knockbackProgress >= KNOCKBACK_FRAMES) {
      this.knockbackDirection = null;
      this.knockbackProgress = 0;
      this.state = 'ACTIVE';
    }
  }

  /**
   * Update dying state
   */
  private updateDying(deltaFrame: number): void {
    this.stateTimer -= deltaFrame;
    if (this.stateTimer <= 0) {
      // Death animation complete, deactivate entity
      this.active = false;
    }
  }

  /**
   * Update animation frame
   */
  private updateAnimation(deltaFrame: number): void {
    if (this.state === 'ACTIVE' && this.isMoving) {
      this.animationTimer += deltaFrame;
      if (this.animationTimer >= this.WALK_ANIMATION_SPEED) {
        this.animationTimer = 0;
        this.animationFrame = (this.animationFrame + 1) % 2;
      }
    } else if (this.state === 'DYING') {
      // Death animation (puff effect)
      const progress = 1 - (this.stateTimer / DEATH_ANIMATION_FRAMES);
      this.animationFrame = Math.floor(progress * 4); // 4 frames of puff animation
    } else {
      this.animationFrame = 0;
      this.animationTimer = 0;
    }
  }

  /**
   * Take damage from a weapon
   */
  takeDamage(amount: number, fromDirection: Direction): boolean {
    // Can't take damage while spawning, dying, or already in knockback
    if (
      this.state === 'SPAWNING' ||
      this.state === 'DYING' ||
      this.state === 'KNOCKBACK'
    ) {
      return false;
    }

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'DYING';
      this.stateTimer = DEATH_ANIMATION_FRAMES;
      return true;
    }

    // Start knockback if enemy is knockbackable
    if (this.knockbackable) {
      this.knockbackDirection = this.getOppositeDirection(fromDirection);
      this.knockbackProgress = 0;
      this.state = 'KNOCKBACK';
    }

    return true;
  }

  /**
   * Stun the enemy (e.g., from boomerang)
   */
  stun(duration: number): void {
    if (
      this.state === 'SPAWNING' ||
      this.state === 'DYING'
    ) {
      return;
    }

    if (this.archetype.boomerangStunnable) {
      this.state = 'STUNNED';
      this.stunTimer = duration;
    }
  }

  /**
   * Check if enemy is vulnerable to damage
   */
  isVulnerable(): boolean {
    return (
      this.state !== 'SPAWNING' &&
      this.state !== 'DYING' &&
      this.state !== 'KNOCKBACK'
    );
  }

  /**
   * Get contact damage value
   */
  getContactDamage(): number {
    return this.contactDamage;
  }

  /**
   * Get the opposite direction
   */
  private getOppositeDirection(dir: Direction): Direction {
    switch (dir) {
      case 'UP': return 'DOWN';
      case 'DOWN': return 'UP';
      case 'LEFT': return 'RIGHT';
      case 'RIGHT': return 'LEFT';
    }
  }

  /**
   * Get current state
   */
  getState(): EnemyState {
    return this.state;
  }

  /**
   * Get sprite commands for rendering
   */
  override getSpriteCommands(): SpriteRenderCommand[] {
    if (!this.active) {
      return [];
    }

    // Hidden during spawning (could add spawn animation later)
    if (this.state === 'SPAWNING') {
      // Show partially visible during spawn
      const spawnProgress = 1 - (this.spawnTimer / this.SPAWN_DURATION);
      if (spawnProgress < 0.5) {
        return []; // First half of spawn: invisible
      }
    }

    const spriteKey = this.getSpriteKey();

    return [{
      spriteKey,
      x: this.x,
      y: this.y,
      flipX: false,
      flipY: false,
      priority: this.spritePriority,
      visible: true,
    }];
  }

  /**
   * Get the appropriate sprite key for current state
   */
  private getSpriteKey(): string {
    const baseType = this.archetype.baseType.toLowerCase();
    const variant = this.archetype.variant.toLowerCase();

    // Death animation (puff)
    if (this.state === 'DYING') {
      return `puff_${Math.min(this.animationFrame, 3)}`;
    }

    // Build sprite key based on enemy type and variant
    // Format: {baseType}_{variant} or {baseType}_{variant}_{frame}
    if (variant === 'default') {
      return `${baseType}_${this.animationFrame}`;
    }

    return `${baseType}_${variant}_${this.animationFrame}`;
  }

  /**
   * Get archetype reference
   */
  getArchetype(): EnemyArchetype {
    return this.archetype;
  }
}

/**
 * Factory function for creating enemies
 * Used with EntityManager's factory registration
 */
export function createEnemy(
  x: number,
  y: number,
  config: { archetypeId: string }
): Enemy {
  return new Enemy(x, y, config.archetypeId);
}
