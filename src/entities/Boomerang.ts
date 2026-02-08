// Boomerang.ts - Boomerang projectile entity
// A special projectile that travels forward then returns to Link

import {
  Direction,
  SpriteRenderCommand,
  AABB,
  SpritePriority,
} from '../types';
import {
  BOOMERANG_RANGE_TILES,
  TILE_SIZE,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
  PROJECTILE_SPEEDS,
} from '../constants';
import { BaseEntity, ProjectileEntity, GameEntity } from './Entity';

/**
 * Player position provider for boomerang return targeting
 * (Same interface as Enemy.ts BoomerangPlayerProvider, but local to Boomerang)
 */
export interface BoomerangPlayerProvider {
  getX: () => number;
  getY: () => number;
}

/**
 * Boomerang state machine
 * - OUTWARD: traveling away from Link
 * - RETURNING: traveling back to Link
 * - COLLECTED: caught by Link and ready to be removed
 */
export type BoomerangState = 'OUTWARD' | 'RETURNING' | 'COLLECTED';

/**
 * Direction vectors for boomerang movement
 */
const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

/**
 * Boomerang projectile entity
 * Travels forward for up to 5 tiles, then returns to Link's position
 * Stuns enemies on hit instead of damaging them
 */
export class Boomerang extends BaseEntity implements ProjectileEntity {
  entityType = 'PROJECTILE' as const;
  damage: number = 0; // Boomerang stuns, doesn't damage
  sourceType = 'PLAYER' as const;
  piercing: boolean = false;
  destroyOnHit: boolean = false; // Boomerang doesn't get destroyed on hit
  maxRange: number;
  traveledDistance: number = 0;

  // Boomerang-specific properties
  private state: BoomerangState = 'OUTWARD';
  private speed: number;
  private startX: number;
  private startY: number;
  private direction: Direction;
  private isMagic: boolean;
  private playerProvider: BoomerangPlayerProvider | null = null;

  // Animation properties
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private static readonly ANIMATION_SPEED = 4; // frames per animation frame

  // Velocity
  override velocityX: number = 0;
  override velocityY: number = 0;

  constructor(
    x: number,
    y: number,
    direction: Direction,
    isMagic: boolean = false
  ) {
    super('PROJECTILE', x, y, 8, 8, 'projectile');

    this.direction = direction;
    this.isMagic = isMagic;
    this.startX = x;
    this.startY = y;
    this.facingDirection = direction;
    this.spritePriority = 3 as SpritePriority;

    // Set speed based on boomerang type
    this.speed = isMagic
      ? PROJECTILE_SPEEDS.MAGIC_BOOMERANG
      : PROJECTILE_SPEEDS.BOOMERANG;

    // Max range is 5 tiles (or more for magic boomerang going full screen)
    this.maxRange = isMagic
      ? PLAY_AREA_WIDTH
      : BOOMERANG_RANGE_TILES * TILE_SIZE;

    // Set initial velocity
    const vec = DIRECTION_VECTORS[direction];
    this.velocityX = vec.x * this.speed;
    this.velocityY = vec.y * this.speed;
  }

  /**
   * Set the player position provider for return targeting
   */
  setPlayerProvider(provider: BoomerangPlayerProvider): void {
    this.playerProvider = provider;
  }

  /**
   * Get current boomerang state
   */
  getState(): BoomerangState {
    return this.state;
  }

  /**
   * Check if boomerang is returning
   */
  isReturning(): boolean {
    return this.state === 'RETURNING';
  }

  /**
   * Check if boomerang is the magic type
   */
  isMagicBoomerang(): boolean {
    return this.isMagic;
  }

  /**
   * Force the boomerang to start returning (e.g., when hitting a wall or enemy)
   */
  startReturning(): void {
    if (this.state === 'OUTWARD') {
      this.state = 'RETURNING';
    }
  }

  /**
   * Update boomerang position and state
   */
  override update(deltaFrame: number): void {
    if (!this.active) return;

    // Update animation
    this.animationTimer += deltaFrame;
    if (this.animationTimer >= Boomerang.ANIMATION_SPEED) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 4;
    }

    switch (this.state) {
      case 'OUTWARD':
        this.updateOutward(deltaFrame);
        break;
      case 'RETURNING':
        this.updateReturning(deltaFrame);
        break;
      case 'COLLECTED':
        this.active = false;
        break;
    }
  }

  /**
   * Update while traveling outward
   */
  private updateOutward(deltaFrame: number): void {
    // Move in initial direction
    this.x += this.velocityX * deltaFrame;
    this.y += this.velocityY * deltaFrame;

    // Calculate traveled distance
    const dx = this.x - this.startX;
    const dy = this.y - this.startY;
    this.traveledDistance = Math.sqrt(dx * dx + dy * dy);

    // Check if we've reached max range or hit screen edge
    if (this.traveledDistance >= this.maxRange || this.isOffScreen()) {
      this.state = 'RETURNING';
    }
  }

  /**
   * Update while returning to player
   */
  private updateReturning(deltaFrame: number): void {
    if (!this.playerProvider) {
      // No player provider, just deactivate
      this.active = false;
      return;
    }

    // Get player position (center of player sprite)
    const playerX = this.playerProvider.getX() + 8;
    const playerY = this.playerProvider.getY() + 8;

    // Calculate direction to player
    const dx = playerX - (this.x + 4); // center of boomerang
    const dy = playerY - (this.y + 4);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if we've reached the player
    if (distance < this.speed * 2) {
      this.state = 'COLLECTED';
      this.active = false;
      return;
    }

    // Normalize and apply speed
    if (distance > 0) {
      this.velocityX = (dx / distance) * this.speed;
      this.velocityY = (dy / distance) * this.speed;
    }

    // Move toward player
    this.x += this.velocityX * deltaFrame;
    this.y += this.velocityY * deltaFrame;
  }

  /**
   * Check if boomerang is off screen
   */
  private isOffScreen(): boolean {
    return (
      this.x < -8 ||
      this.x > PLAY_AREA_WIDTH + 8 ||
      this.y < -8 ||
      this.y > PLAY_AREA_HEIGHT + 8
    );
  }

  /**
   * Called when boomerang hits an enemy
   * Boomerang doesn't deal damage, it stuns
   */
  onHit(_target: GameEntity): void {
    // Boomerang starts returning after hitting something
    // but doesn't get destroyed
    this.startReturning();
  }

  /**
   * Check if boomerang should be destroyed
   * Boomerang is collected/destroyed when it returns to player
   */
  shouldDestroy(): boolean {
    return this.state === 'COLLECTED' || !this.active;
  }

  /**
   * Get sprite commands for rendering
   */
  override getSpriteCommands(): SpriteRenderCommand[] {
    if (!this.active) {
      return [];
    }

    // Boomerang rotates through 4 frames
    // Use animation frame to determine flip states for rotation effect
    const flipX = this.animationFrame === 1 || this.animationFrame === 2;
    const flipY = this.animationFrame === 2 || this.animationFrame === 3;

    return [{
      spriteKey: 'projectile_boomerang',
      x: this.x,
      y: this.y,
      flipX,
      flipY,
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
   * Check if boomerang was collected (returned to player)
   */
  wasCollected(): boolean {
    return this.state === 'COLLECTED';
  }
}

/**
 * Factory function for creating boomerangs
 */
export function createBoomerang(
  x: number,
  y: number,
  direction: Direction,
  isMagic: boolean = false
): Boomerang {
  return new Boomerang(x, y, direction, isMagic);
}
