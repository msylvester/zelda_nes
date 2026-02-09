// CandleFlame.ts - Flame projectile from candle item
// Travels 4 tiles in the direction Link is facing, can burn bushes

import {
  Direction,
  SpriteRenderCommand,
  AABB,
  SpritePriority,
} from '../types';
import {
  TILE_SIZE,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
} from '../constants';
import { BaseEntity, ProjectileEntity, GameEntity } from './Entity';

/**
 * Tile collision/burn checker for candle flame
 * Returns { blocked: boolean, canBurn: boolean } for the tile at hitbox position
 */
export type FlameCollisionChecker = (hitbox: AABB) => {
  blocked: boolean;
  canBurn: boolean;
  tileX: number;
  tileY: number;
};

/**
 * Callback for when flame burns a tile
 */
export type BurnTileCallback = (tileX: number, tileY: number) => void;

/**
 * Candle flame range in tiles
 */
const FLAME_RANGE_TILES = 4;

/**
 * Candle flame speed in pixels per frame
 */
const FLAME_SPEED = 2.0;

/**
 * Direction vectors for flame movement
 */
const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

/**
 * Candle flame state
 * - TRAVELING: moving in direction
 * - BURNING: stopped at a position, burning
 * - DONE: finished burning
 */
export type FlameState = 'TRAVELING' | 'BURNING' | 'DONE';

/**
 * Duration to burn at a position (frames)
 */
const BURN_DURATION = 60;

/**
 * CandleFlame entity - flame projectile from candle
 * Travels 4 tiles, stops at obstacles, burns bushes
 */
export class CandleFlame extends BaseEntity implements ProjectileEntity {
  entityType = 'PROJECTILE' as const;
  damage: number = 1; // Flames damage enemies
  sourceType = 'PLAYER' as const;
  piercing: boolean = false;
  destroyOnHit: boolean = false; // Flame doesn't disappear on enemy hit
  maxRange: number;
  traveledDistance: number = 0;

  // Flame-specific properties
  private state: FlameState = 'TRAVELING';
  private speed: number = FLAME_SPEED;
  private direction: Direction;
  private startX: number;
  private startY: number;
  private burnTimer: number = 0;

  // Tile collision/burn checker
  private collisionChecker: FlameCollisionChecker | null = null;
  private burnCallback: BurnTileCallback | null = null;
  private hasBurnedTile: boolean = false;

  // Animation properties
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private static readonly ANIMATION_SPEED = 4;

  // Velocity
  override velocityX: number = 0;
  override velocityY: number = 0;

  constructor(x: number, y: number, direction: Direction) {
    super('PROJECTILE', x, y, 16, 16, 'projectile');

    this.direction = direction;
    this.startX = x;
    this.startY = y;
    this.facingDirection = direction;
    this.spritePriority = 4 as SpritePriority;

    // Max range is 4 tiles
    this.maxRange = FLAME_RANGE_TILES * TILE_SIZE;

    // Set initial velocity
    const vec = DIRECTION_VECTORS[direction];
    this.velocityX = vec.x * this.speed;
    this.velocityY = vec.y * this.speed;
  }

  /**
   * Set the collision checker for detecting burnable tiles and obstacles
   */
  setCollisionChecker(checker: FlameCollisionChecker): void {
    this.collisionChecker = checker;
  }

  /**
   * Set callback for when flame burns a tile
   */
  setBurnCallback(callback: BurnTileCallback): void {
    this.burnCallback = callback;
  }

  /**
   * Get current flame state
   */
  getState(): FlameState {
    return this.state;
  }

  /**
   * Check if flame is currently burning
   */
  isBurning(): boolean {
    return this.state === 'BURNING';
  }

  /**
   * Update flame position and state
   */
  override update(deltaFrame: number): void {
    if (!this.active) return;

    // Update animation
    this.animationTimer += deltaFrame;
    if (this.animationTimer >= CandleFlame.ANIMATION_SPEED) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 4;
    }

    switch (this.state) {
      case 'TRAVELING':
        this.updateTraveling(deltaFrame);
        break;
      case 'BURNING':
        this.updateBurning(deltaFrame);
        break;
      case 'DONE':
        this.active = false;
        break;
    }
  }

  /**
   * Update while traveling
   */
  private updateTraveling(deltaFrame: number): void {
    // Move flame
    this.x += this.velocityX * deltaFrame;
    this.y += this.velocityY * deltaFrame;

    // Calculate traveled distance
    const dx = this.x - this.startX;
    const dy = this.y - this.startY;
    this.traveledDistance = Math.sqrt(dx * dx + dy * dy);

    // Check if reached max range
    if (this.traveledDistance >= this.maxRange) {
      this.state = 'BURNING';
      this.burnTimer = BURN_DURATION;
      return;
    }

    // Check if off screen
    if (this.isOffScreen()) {
      this.state = 'DONE';
      this.active = false;
      return;
    }

    // Check for tile collision
    if (this.collisionChecker) {
      const hitbox = this.getHitbox();
      const result = this.collisionChecker(hitbox);

      if (result.canBurn && !this.hasBurnedTile) {
        // Found a burnable tile (bush) - stop and burn it
        this.state = 'BURNING';
        this.burnTimer = BURN_DURATION;
        this.hasBurnedTile = true;

        // Trigger burn callback
        if (this.burnCallback) {
          this.burnCallback(result.tileX, result.tileY);
        }
        return;
      }

      if (result.blocked) {
        // Hit a solid obstacle - stop and burn for a bit
        this.state = 'BURNING';
        this.burnTimer = BURN_DURATION;
        return;
      }
    }
  }

  /**
   * Update while burning
   */
  private updateBurning(deltaFrame: number): void {
    this.burnTimer -= deltaFrame;

    if (this.burnTimer <= 0) {
      this.state = 'DONE';
      this.active = false;
    }
  }

  /**
   * Check if flame is off screen
   */
  private isOffScreen(): boolean {
    return (
      this.x < -16 ||
      this.x > PLAY_AREA_WIDTH + 16 ||
      this.y < -16 ||
      this.y > PLAY_AREA_HEIGHT + 16
    );
  }

  /**
   * Called when flame hits an enemy
   */
  onHit(_target: GameEntity): void {
    // Flame doesn't disappear on enemy hit, continues burning
  }

  /**
   * Check if flame should be destroyed
   */
  shouldDestroy(): boolean {
    return this.state === 'DONE' || !this.active;
  }

  /**
   * Get sprite commands for rendering
   */
  override getSpriteCommands(): SpriteRenderCommand[] {
    if (!this.active) {
      return [];
    }

    // Use fireball sprite as placeholder for flame
    // Alternate animation frames for flickering effect
    const spriteKey = this.animationFrame < 2 ? 'projectile_fireball' : 'projectile_fireball';

    return [{
      spriteKey,
      x: this.x,
      y: this.y,
      flipX: this.animationFrame === 1 || this.animationFrame === 3,
      flipY: this.animationFrame === 2 || this.animationFrame === 3,
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
}

/**
 * Factory function for creating candle flames
 */
export function createCandleFlame(
  x: number,
  y: number,
  direction: Direction
): CandleFlame {
  return new CandleFlame(x, y, direction);
}
