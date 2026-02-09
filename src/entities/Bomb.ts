// Bomb.ts - Bomb entity that explodes after a delay
// Bombs are placed by Link and explode after BOMB_FUSE_FRAMES (60 frames)

import {
  Direction,
  SpriteRenderCommand,
  AABB,
  SpritePriority,
} from '../types';
import {
  BOMB_FUSE_FRAMES,
  BOMB_BLAST_RADIUS,
  BOMB_DAMAGE,
} from '../constants';
import { BaseEntity, ProjectileEntity, GameEntity } from './Entity';

/**
 * Bomb state machine
 * - FUSE: counting down to explosion
 * - EXPLODING: dealing damage and showing explosion
 * - DONE: explosion complete, ready for removal
 */
export type BombState = 'FUSE' | 'EXPLODING' | 'DONE';

/**
 * Explosion animation duration
 */
const EXPLOSION_FRAMES = 20;

/**
 * Bomb entity - placed by player, explodes after delay
 */
export class Bomb extends BaseEntity implements ProjectileEntity {
  entityType = 'PROJECTILE' as const;
  damage: number = BOMB_DAMAGE;
  sourceType = 'PLAYER' as const;
  piercing: boolean = true; // Bomb explosion hits all enemies in range
  destroyOnHit: boolean = false; // Bomb is removed after explosion animation, not on hit
  maxRange: number = 0; // Bomb doesn't travel
  traveledDistance: number = 0;

  // Bomb-specific properties
  private state: BombState = 'FUSE';
  private fuseTimer: number = BOMB_FUSE_FRAMES;
  private explosionTimer: number = 0;
  private hasDealtDamage: boolean = false;

  // Animation properties
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private static readonly FUSE_ANIMATION_SPEED = 8; // frames per animation frame

  // Velocity (bomb doesn't move)
  override velocityX: number = 0;
  override velocityY: number = 0;

  constructor(x: number, y: number, _direction: Direction) {
    super('PROJECTILE', x, y, 16, 16, 'projectile');

    this.facingDirection = _direction;
    this.spritePriority = 3 as SpritePriority;
  }

  /**
   * Get current bomb state
   */
  getState(): BombState {
    return this.state;
  }

  /**
   * Check if bomb is currently exploding
   */
  isExploding(): boolean {
    return this.state === 'EXPLODING';
  }

  /**
   * Check if bomb has dealt its explosion damage
   */
  hasExploded(): boolean {
    return this.hasDealtDamage;
  }

  /**
   * Get the blast radius hitbox (for damage calculation)
   * Returns a larger hitbox during explosion
   */
  getBlastHitbox(): AABB | null {
    if (this.state !== 'EXPLODING' || this.hasDealtDamage) {
      return null;
    }

    // Blast radius extends from bomb center
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    return {
      x: centerX - BOMB_BLAST_RADIUS,
      y: centerY - BOMB_BLAST_RADIUS,
      width: BOMB_BLAST_RADIUS * 2,
      height: BOMB_BLAST_RADIUS * 2,
    };
  }

  /**
   * Mark that damage has been dealt (call after processing collisions)
   */
  markDamageDealt(): void {
    this.hasDealtDamage = true;
  }

  /**
   * Get remaining fuse time (for display)
   */
  getFuseTimer(): number {
    return this.fuseTimer;
  }

  /**
   * Update bomb state
   */
  override update(deltaFrame: number): void {
    if (!this.active) return;

    switch (this.state) {
      case 'FUSE':
        this.updateFuse(deltaFrame);
        break;
      case 'EXPLODING':
        this.updateExplosion(deltaFrame);
        break;
      case 'DONE':
        this.active = false;
        break;
    }
  }

  /**
   * Update during fuse countdown
   */
  private updateFuse(deltaFrame: number): void {
    // Update animation
    this.animationTimer += deltaFrame;
    if (this.animationTimer >= Bomb.FUSE_ANIMATION_SPEED) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 2;
    }

    // Countdown fuse
    this.fuseTimer -= deltaFrame;

    if (this.fuseTimer <= 0) {
      this.state = 'EXPLODING';
      this.explosionTimer = EXPLOSION_FRAMES;
    }
  }

  /**
   * Update during explosion
   */
  private updateExplosion(deltaFrame: number): void {
    // Update animation frame during explosion
    this.animationTimer += deltaFrame;
    if (this.animationTimer >= 4) {
      this.animationTimer = 0;
      this.animationFrame = (this.animationFrame + 1) % 3;
    }

    // Countdown explosion
    this.explosionTimer -= deltaFrame;

    if (this.explosionTimer <= 0) {
      this.state = 'DONE';
      this.active = false;
    }
  }

  /**
   * Called when bomb hits a target (during explosion)
   * Bomb doesn't get destroyed on hit, it continues through explosion
   */
  onHit(_target: GameEntity): void {
    // Bomb explosion hits multiple targets, doesn't destroy on single hit
  }

  /**
   * Check if bomb should be destroyed
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

    const commands: SpriteRenderCommand[] = [];

    if (this.state === 'FUSE') {
      // Render bomb with fuse
      // Alternate between normal and flashing as fuse gets shorter
      const isFlashing = this.fuseTimer < 20 && this.animationFrame === 1;

      commands.push({
        spriteKey: 'item_bomb',
        x: this.x,
        y: this.y,
        flipX: false,
        flipY: false,
        priority: this.spritePriority,
        visible: !isFlashing, // Flash when about to explode
      });
    } else if (this.state === 'EXPLODING') {
      // Render explosion effect
      // Use death puff animation as placeholder for explosion
      commands.push({
        spriteKey: 'death_puff_1',
        x: this.x - 8, // Center explosion on bomb
        y: this.y - 8,
        flipX: false,
        flipY: false,
        priority: 5 as SpritePriority, // High priority for explosion
        visible: true,
      });

      // Add additional explosion sprites for larger effect
      if (this.animationFrame > 0) {
        commands.push({
          spriteKey: 'death_puff_2',
          x: this.x + 8,
          y: this.y - 8,
          flipX: true,
          flipY: false,
          priority: 5 as SpritePriority,
          visible: true,
        });
      }
    }

    return commands;
  }

  /**
   * Get hitbox for collision detection (bomb body during fuse, blast during explosion)
   */
  override getHitbox(): AABB {
    if (this.state === 'EXPLODING' && !this.hasDealtDamage) {
      // Return blast hitbox during explosion
      const blastHitbox = this.getBlastHitbox();
      if (blastHitbox) {
        return blastHitbox;
      }
    }

    // Normal bomb hitbox
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Check if position is within blast radius
   */
  isInBlastRadius(targetX: number, targetY: number, targetWidth: number, targetHeight: number): boolean {
    if (this.state !== 'EXPLODING') {
      return false;
    }

    const blastHitbox = this.getBlastHitbox();
    if (!blastHitbox) {
      return false;
    }

    // AABB overlap check
    return (
      targetX < blastHitbox.x + blastHitbox.width &&
      targetX + targetWidth > blastHitbox.x &&
      targetY < blastHitbox.y + blastHitbox.height &&
      targetY + targetHeight > blastHitbox.y
    );
  }
}

/**
 * Factory function for creating bombs
 */
export function createBomb(
  x: number,
  y: number,
  direction: Direction
): Bomb {
  return new Bomb(x, y, direction);
}
