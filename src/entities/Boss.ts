// Boss.ts - Boss enemy entity implementation
// Handles boss-specific behavior like Aquamentus

import {
  Direction,
  EnemyState,
  SpriteRenderCommand,
  AABB,
  EnemyArchetype,
  ProjectileAttack,
} from '../types';
import {
  DEATH_ANIMATION_FRAMES,
  PLAY_AREA_WIDTH,
} from '../constants';
import { randomInt, randomPick } from '../utils/PRNG';
import { clamp } from '../utils/math';
import { BaseEntity, EnemyEntity, createOffsetHitbox } from './Entity';
import { getEnemyArchetype, isProjectileAttack } from '../data/enemyArchetypes';
import { createSpreadProjectiles } from './Projectile';
import { getEntityManager } from './EntityManager';

/**
 * Player position provider for AI targeting
 */
export interface BossPlayerProvider {
  getX(): number;
  getY(): number;
}

/**
 * Boss entity - special enemy with boss-specific behavior
 * Used for dungeon bosses like Aquamentus
 */
export class Boss extends BaseEntity implements EnemyEntity {
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
  private readonly SPAWN_DURATION = 60; // Longer spawn for bosses

  // Movement state
  private movementTimer: number = 0;
  private pauseTimer: number = 0;
  private isMoving: boolean = false;
  private movementDirection: 'LEFT' | 'RIGHT' = 'LEFT';

  // Attack state
  private attackCooldown: number = 0;
  private attackAnimationTimer: number = 0;
  private isAttacking: boolean = false;

  // Animation
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private readonly ANIMATION_SPEED = 16; // frames per animation frame

  // Player targeting
  private playerProvider: BossPlayerProvider | null = null;

  // Track if boss has died (for events)
  private hasDied: boolean = false;

  constructor(x: number, y: number, archetypeId: string) {
    const archetype = getEnemyArchetype(archetypeId);
    if (!archetype) {
      throw new Error(`Unknown boss archetype: ${archetypeId}`);
    }

    super(
      'ENEMY',
      x,
      y,
      archetype.spriteWidth,
      archetype.spriteHeight,
      'boss'
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

    // Initialize boss-specific state
    this.facingDirection = 'LEFT'; // Aquamentus faces left toward player
    this.initializeMovement();
    this.initializeAttack();
  }

  /**
   * Set the player position provider for AI targeting
   */
  setPlayerProvider(provider: BossPlayerProvider): void {
    this.playerProvider = provider;
  }

  /**
   * Initialize movement timers
   */
  private initializeMovement(): void {
    const pattern = this.archetype.movementPattern;
    if (pattern.type === 'RANDOM_WALK') {
      this.movementTimer = randomInt(pattern.walkDuration.min, pattern.walkDuration.max);
      this.isMoving = true;
      // Start moving up or down (Aquamentus moves vertically)
      this.movementDirection = randomPick(['LEFT', 'RIGHT'] as const);
    }
  }

  /**
   * Initialize attack cooldown
   */
  private initializeAttack(): void {
    const attackPattern = this.archetype.attackPattern;
    if (isProjectileAttack(attackPattern)) {
      this.attackCooldown = randomInt(attackPattern.cooldown.min, attackPattern.cooldown.max);
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

      case 'KNOCKBACK':
        this.updateKnockback(deltaFrame);
        break;

      case 'DYING':
        this.updateDying(deltaFrame);
        break;

      default:
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
   * Update active state (movement and attacks)
   */
  private updateActive(deltaFrame: number): void {
    // Update movement (Aquamentus-style: slow vertical drift)
    this.updateAquamentusMovement(deltaFrame);

    // Update attack
    this.updateAttack(deltaFrame);
  }

  /**
   * Aquamentus-specific movement: slow vertical drift with horizontal boundaries
   */
  private updateAquamentusMovement(deltaFrame: number): void {
    const pattern = this.archetype.movementPattern;
    if (pattern.type !== 'RANDOM_WALK') return;

    const speed = pattern.speed;

    if (this.isMoving) {
      // Move up or down
      if (this.movementDirection === 'LEFT') {
        this.y -= speed * deltaFrame;
      } else {
        this.y += speed * deltaFrame;
      }

      // Keep within vertical bounds (play area with buffer)
      const minY = 16;
      const maxY = 144 - this.height; // Leave room for boss sprite
      this.y = clamp(this.y, minY, maxY);

      // Change direction at boundaries
      if (this.y <= minY || this.y >= maxY) {
        this.movementDirection = this.movementDirection === 'LEFT' ? 'RIGHT' : 'LEFT';
      }

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
        this.movementDirection = randomPick(['LEFT', 'RIGHT'] as const);
        this.movementTimer = randomInt(pattern.walkDuration.min, pattern.walkDuration.max);
        this.isMoving = true;
      }
    }

    // Keep boss on right side of screen (Aquamentus stays on right)
    const minX = PLAY_AREA_WIDTH / 2; // Right half of screen
    const maxX = PLAY_AREA_WIDTH - this.width - 8;
    this.x = clamp(this.x, minX, maxX);
  }

  /**
   * Update attack state and fire projectiles
   */
  private updateAttack(deltaFrame: number): void {
    const attackPattern = this.archetype.attackPattern;
    if (!isProjectileAttack(attackPattern)) return;

    if (this.isAttacking) {
      // Update attack animation
      this.attackAnimationTimer -= deltaFrame;
      if (this.attackAnimationTimer <= 0) {
        this.isAttacking = false;
      }
    } else {
      // Decrement cooldown
      this.attackCooldown -= deltaFrame;

      if (this.attackCooldown <= 0) {
        // Fire attack
        this.fireProjectiles(attackPattern);

        // Reset cooldown
        this.attackCooldown = randomInt(
          attackPattern.cooldown.min,
          attackPattern.cooldown.max
        );

        // Start attack animation
        this.isAttacking = true;
        this.attackAnimationTimer = attackPattern.attackAnimationFrames;
      }
    }
  }

  /**
   * Fire projectiles (Aquamentus fires 3 fireballs in spread pattern)
   */
  private fireProjectiles(attackPattern: ProjectileAttack): void {
    const entityManager = getEntityManager();

    // Calculate spawn position (from boss's mouth/front)
    const spawnX = this.x; // Left side of boss (facing left)
    const spawnY = this.y + this.height / 2;

    // Aquamentus fires toward the player (left direction)
    const direction: Direction = 'LEFT';

    // Create spread projectiles
    const projectiles = createSpreadProjectiles(
      spawnX,
      spawnY,
      direction,
      attackPattern.projectileType,
      'ENEMY',
      attackPattern.volleyCount,
      attackPattern.volleySpread
    );

    // Add projectiles to entity manager
    for (const projectile of projectiles) {
      entityManager.addEntity(projectile);
    }
  }

  /**
   * Update knockback state (bosses don't get knocked back, but still flash)
   */
  private updateKnockback(deltaFrame: number): void {
    this.stateTimer -= deltaFrame;
    if (this.stateTimer <= 0) {
      this.state = 'ACTIVE';
    }
  }

  /**
   * Update dying state
   */
  private updateDying(deltaFrame: number): void {
    this.stateTimer -= deltaFrame;
    if (this.stateTimer <= 0) {
      // Death complete
      this.active = false;
      this.hasDied = true;
    }
  }

  /**
   * Update animation frame
   */
  private updateAnimation(deltaFrame: number): void {
    if (this.state === 'DYING') {
      // Death animation
      const progress = 1 - (this.stateTimer / DEATH_ANIMATION_FRAMES);
      this.animationFrame = Math.floor(progress * 4);
    } else {
      // Normal animation
      this.animationTimer += deltaFrame;
      if (this.animationTimer >= this.ANIMATION_SPEED) {
        this.animationTimer = 0;
        this.animationFrame = (this.animationFrame + 1) % 2;
      }
    }
  }

  /**
   * Take damage from a weapon
   */
  takeDamage(amount: number, _fromDirection: Direction): boolean {
    // Can't take damage while spawning or dying
    if (this.state === 'SPAWNING' || this.state === 'DYING') {
      return false;
    }

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'DYING';
      this.stateTimer = DEATH_ANIMATION_FRAMES * 2; // Bosses die longer
      return true;
    }

    // Brief knockback/flash state for damage feedback
    if (!this.knockbackable) {
      // Just flash briefly
      this.state = 'KNOCKBACK'; // Reusing state for flash effect
      this.stateTimer = 16; // Brief flash
    }

    return true;
  }

  /**
   * Check if boss is vulnerable to damage
   */
  isVulnerable(): boolean {
    return (
      this.state !== 'SPAWNING' &&
      this.state !== 'DYING'
    );
  }

  /**
   * Get contact damage value
   */
  getContactDamage(): number {
    return this.contactDamage;
  }

  /**
   * Get current state
   */
  getState(): EnemyState {
    return this.state;
  }

  /**
   * Check if boss has died (for triggering events)
   */
  hasBeenDefeated(): boolean {
    return this.hasDied;
  }

  /**
   * Get sprite commands for rendering
   */
  override getSpriteCommands(): SpriteRenderCommand[] {
    if (!this.active) {
      return [];
    }

    // Hidden during first half of spawning
    if (this.state === 'SPAWNING') {
      const spawnProgress = 1 - (this.spawnTimer / this.SPAWN_DURATION);
      if (spawnProgress < 0.5) {
        return [];
      }
    }

    const spriteKey = this.getSpriteKey();

    // Flash when in knockback/damaged state
    const flashVisible = this.state === 'KNOCKBACK'
      ? Math.floor(this.stateTimer / 4) % 2 === 0
      : true;

    return [{
      spriteKey,
      x: this.x,
      y: this.y,
      flipX: false,
      flipY: false,
      priority: this.spritePriority,
      visible: flashVisible,
    }];
  }

  /**
   * Get the appropriate sprite key for current state
   */
  private getSpriteKey(): string {
    // Death animation (puff)
    if (this.state === 'DYING') {
      return `puff_${Math.min(this.animationFrame, 3)}`;
    }

    // Attack animation (mouth open)
    if (this.isAttacking) {
      return `enemy_aquamentus_2`;
    }

    // Normal animation
    return `enemy_aquamentus_${this.animationFrame + 1}`;
  }

  /**
   * Get archetype reference
   */
  getArchetype(): EnemyArchetype {
    return this.archetype;
  }
}

/**
 * Factory function for creating boss enemies
 */
export function createBoss(
  x: number,
  y: number,
  config: { archetypeId: string }
): Boss {
  return new Boss(x, y, config.archetypeId);
}

/**
 * Check if an archetype ID is a boss type
 */
export function isBossArchetype(archetypeId: string): boolean {
  const bossTypes = ['AQUAMENTUS', 'DODONGO', 'MANHANDLA', 'GLEEOK', 'DIGDOGGER', 'GOHMA', 'PATRA', 'GANON'];
  return bossTypes.includes(archetypeId);
}
