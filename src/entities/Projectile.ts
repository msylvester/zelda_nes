// Projectile.ts - Projectile entity implementation
// Handles both player and enemy projectiles

import {
  Direction,
  SpriteRenderCommand,
  AABB,
  ProjectileType,
  SpritePriority,
} from '../types';
import { PROJECTILE_SPEEDS, PLAY_AREA_WIDTH, PLAY_AREA_HEIGHT } from '../constants';
import { BaseEntity, ProjectileEntity, GameEntity } from './Entity';

/**
 * Tile collision checker function type for projectiles (sword beam hitting walls)
 */
export type ProjectileTileCollisionChecker = (hitbox: AABB) => boolean;

/**
 * Direction vectors for projectile movement
 */
const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

/**
 * Projectile configuration for different types
 */
interface ProjectileConfig {
  speed: number;
  damage: number;
  width: number;
  height: number;
  spriteKey: string;
  piercing: boolean;
  maxRange: number;
}

/**
 * Get configuration for a projectile type
 */
function getProjectileConfig(
  projectileType: ProjectileType,
  sourceType: 'PLAYER' | 'ENEMY'
): ProjectileConfig {
  switch (projectileType) {
    case 'FIREBALL':
      return {
        speed: PROJECTILE_SPEEDS.FIREBALL,
        damage: sourceType === 'ENEMY' ? 2 : 1,
        width: 8,
        height: 8,
        spriteKey: 'projectile_fireball',
        piercing: false,
        maxRange: 256, // Full screen width
      };
    case 'ROCK':
      return {
        speed: PROJECTILE_SPEEDS.ROCK,
        damage: 1,
        width: 8,
        height: 8,
        spriteKey: 'projectile_rock',
        piercing: false,
        maxRange: 128,
      };
    case 'ARROW':
      return {
        speed: PROJECTILE_SPEEDS.ARROW,
        damage: 1,
        width: 8,
        height: 8,
        spriteKey: 'projectile_arrow',
        piercing: false,
        maxRange: 192,
      };
    case 'SWORD_BEAM':
      return {
        speed: PROJECTILE_SPEEDS.SWORD_BEAM,
        damage: 1,
        width: 8,
        height: 8,
        spriteKey: 'sword_beam',
        piercing: false,
        maxRange: 256,
      };
    case 'MAGIC_BEAM':
      return {
        speed: PROJECTILE_SPEEDS.MAGIC_BEAM,
        damage: 1,
        width: 8,
        height: 8,
        spriteKey: 'projectile_magic',
        piercing: false,
        maxRange: 192,
      };
    case 'ZORA_FIREBALL':
      return {
        speed: PROJECTILE_SPEEDS.ZORA_FIREBALL,
        damage: 2,
        width: 8,
        height: 8,
        spriteKey: 'projectile_fireball',
        piercing: false,
        maxRange: 256,
      };
    default:
      return {
        speed: 1.5,
        damage: 1,
        width: 8,
        height: 8,
        spriteKey: 'projectile_rock',
        piercing: false,
        maxRange: 128,
      };
  }
}

/**
 * Projectile entity - projectiles fired by player or enemies
 */
export class Projectile extends BaseEntity implements ProjectileEntity {
  entityType = 'PROJECTILE' as const;
  damage: number;
  sourceType: 'PLAYER' | 'ENEMY';
  piercing: boolean;
  destroyOnHit: boolean = true;
  maxRange: number;
  traveledDistance: number = 0;

  // Projectile-specific properties
  private projectileType: ProjectileType;
  private speed: number;
  private spriteKey: string;
  private startX: number;
  private startY: number;

  // For angled projectiles (like Aquamentus fireballs)
  // These override the base class public velocityX/Y properties
  override velocityX: number = 0;
  override velocityY: number = 0;
  private hasCustomVelocity: boolean = false;

  // Tile collision checker for projectiles that should stop on walls (like sword beam)
  private tileCollisionChecker: ProjectileTileCollisionChecker | null = null;
  private checksWallCollision: boolean = false;

  constructor(
    x: number,
    y: number,
    direction: Direction,
    projectileType: ProjectileType,
    sourceType: 'PLAYER' | 'ENEMY',
    angleOffset: number = 0 // Degrees offset from direction (for spread patterns)
  ) {
    const config = getProjectileConfig(projectileType, sourceType);

    super('PROJECTILE', x, y, config.width, config.height, 'projectile');

    this.projectileType = projectileType;
    this.sourceType = sourceType;
    this.damage = config.damage;
    this.speed = config.speed;
    this.piercing = config.piercing;
    this.maxRange = config.maxRange;
    this.spriteKey = config.spriteKey;
    this.startX = x;
    this.startY = y;
    this.facingDirection = direction;
    this.spritePriority = 3 as SpritePriority;

    // Calculate velocity based on direction and angle offset
    if (angleOffset === 0) {
      // Straight shot in cardinal direction
      const vec = DIRECTION_VECTORS[direction];
      this.velocityX = vec.x * this.speed;
      this.velocityY = vec.y * this.speed;
    } else {
      // Angled shot (for spread patterns)
      this.hasCustomVelocity = true;
      const baseAngle = this.getBaseAngle(direction);
      const radians = (baseAngle + angleOffset) * (Math.PI / 180);
      this.velocityX = Math.cos(radians) * this.speed;
      this.velocityY = Math.sin(radians) * this.speed;
    }
  }

  /**
   * Get base angle in degrees for a direction
   */
  private getBaseAngle(direction: Direction): number {
    switch (direction) {
      case 'RIGHT': return 0;
      case 'DOWN': return 90;
      case 'LEFT': return 180;
      case 'UP': return 270;
    }
  }

  /**
   * Set custom velocity for angled shots
   */
  setVelocity(vx: number, vy: number): void {
    this.velocityX = vx;
    this.velocityY = vy;
    this.hasCustomVelocity = true;
  }

  /**
   * Set tile collision checker for projectiles that should stop at walls
   */
  setTileCollisionChecker(checker: ProjectileTileCollisionChecker): void {
    this.tileCollisionChecker = checker;
    this.checksWallCollision = true;
  }

  /**
   * Update projectile position
   */
  override update(deltaFrame: number): void {
    if (!this.active) return;

    // Move projectile
    this.x += this.velocityX * deltaFrame;
    this.y += this.velocityY * deltaFrame;

    // Calculate traveled distance
    const dx = this.x - this.startX;
    const dy = this.y - this.startY;
    this.traveledDistance = Math.sqrt(dx * dx + dy * dy);

    // Check if should destroy
    if (this.shouldDestroy()) {
      this.active = false;
    }
  }

  /**
   * Check if projectile should be destroyed
   */
  shouldDestroy(): boolean {
    // Out of range
    if (this.traveledDistance >= this.maxRange) {
      return true;
    }

    // Off screen (with small buffer)
    if (
      this.x < -16 ||
      this.x > PLAY_AREA_WIDTH + 16 ||
      this.y < -16 ||
      this.y > PLAY_AREA_HEIGHT + 16
    ) {
      return true;
    }

    // Check wall collision for projectiles that should stop at walls (like sword beam)
    if (this.checksWallCollision && this.tileCollisionChecker) {
      const hitbox = this.getHitbox();
      if (this.tileCollisionChecker(hitbox)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Called when projectile hits a target
   */
  onHit(_target: GameEntity): void {
    if (this.destroyOnHit && !this.piercing) {
      this.active = false;
    }
  }

  /**
   * Get sprite commands for rendering
   */
  override getSpriteCommands(): SpriteRenderCommand[] {
    if (!this.active) {
      return [];
    }

    return [{
      spriteKey: this.spriteKey,
      x: this.x,
      y: this.y,
      flipX: false,
      flipY: false,
      priority: this.spritePriority,
      visible: true,
    }];
  }

  /**
   * Get hitbox for collision detection
   */
  override getHitbox(): AABB {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Get the projectile type
   */
  getProjectileType(): ProjectileType {
    return this.projectileType;
  }
}

/**
 * Factory function for creating projectiles
 * Used with EntityManager's factory registration
 */
export function createProjectile(
  x: number,
  y: number,
  config: {
    direction: Direction;
    sourceType: 'PLAYER' | 'ENEMY';
    projectileType: string;
    angleOffset?: number;
  }
): Projectile {
  return new Projectile(
    x,
    y,
    config.direction,
    config.projectileType as ProjectileType,
    config.sourceType,
    config.angleOffset ?? 0
  );
}

/**
 * Spawn spread projectiles (like Aquamentus fireballs)
 * Returns array of projectiles for a spread pattern
 */
export function createSpreadProjectiles(
  x: number,
  y: number,
  direction: Direction,
  projectileType: ProjectileType,
  sourceType: 'PLAYER' | 'ENEMY',
  count: number,
  spreadAngle: number
): Projectile[] {
  const projectiles: Projectile[] = [];

  if (count === 1) {
    projectiles.push(new Projectile(x, y, direction, projectileType, sourceType, 0));
  } else {
    // Calculate angles for spread pattern
    const startAngle = -spreadAngle * (count - 1) / 2;
    for (let i = 0; i < count; i++) {
      const angle = startAngle + spreadAngle * i;
      projectiles.push(new Projectile(x, y, direction, projectileType, sourceType, angle));
    }
  }

  return projectiles;
}
