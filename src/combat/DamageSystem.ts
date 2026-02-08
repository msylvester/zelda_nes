// DamageSystem.ts - Damage calculation and application
// Implements spec section 5.9 - Damage System

import { Direction } from '../types';
import { Player } from '../entities/Player';
import { EnemyEntity } from '../entities/Entity';
import { SWORD_DAMAGE, MIN_DAMAGE } from '../constants';

/**
 * Target types for damage events
 */
export type DamageTargetType = 'PLAYER' | 'ENEMY';

/**
 * Source types for damage
 */
export type DamageSourceType = 'CONTACT' | 'SWORD' | 'PROJECTILE' | 'BOMB' | 'ENVIRONMENT';

/**
 * Damage event in the queue
 */
export interface DamageEvent {
  targetType: DamageTargetType;
  target: Player | EnemyEntity;
  damage: number;
  fromDirection: Direction;
  sourceType: DamageSourceType;
  sourceId?: string; // Optional source entity ID for tracking
}

/**
 * Result of processing a damage event
 */
export interface DamageResult {
  success: boolean;
  actualDamage: number;
  targetDied: boolean;
  reason?: string; // Why damage was blocked (e.g., 'invincible', 'already_dead')
}

/**
 * DamageSystem - Handles damage queuing and processing
 *
 * Damage is queued during collision detection and processed once per frame
 * to avoid double-damage and ensure consistent state.
 */
export class DamageSystem {
  private damageQueue: DamageEvent[] = [];
  private swordTier: number = 1;

  /**
   * Queue a damage event to be processed
   */
  queueDamage(event: DamageEvent): void {
    this.damageQueue.push(event);
  }

  /**
   * Queue player damage from enemy contact
   */
  queuePlayerDamage(
    player: Player,
    damage: number,
    fromDirection: Direction,
    sourceType: DamageSourceType = 'CONTACT'
  ): void {
    this.queueDamage({
      targetType: 'PLAYER',
      target: player,
      damage,
      fromDirection,
      sourceType,
    });
  }

  /**
   * Queue enemy damage from player weapon
   */
  queueEnemyDamage(
    enemy: EnemyEntity,
    damage: number,
    fromDirection: Direction,
    sourceType: DamageSourceType = 'SWORD'
  ): void {
    this.queueDamage({
      targetType: 'ENEMY',
      target: enemy,
      damage,
      fromDirection,
      sourceType,
    });
  }

  /**
   * Set the player's current sword tier (affects damage)
   */
  setSwordTier(tier: number): void {
    this.swordTier = Math.max(1, Math.min(3, tier));
  }

  /**
   * Get the current sword tier
   */
  getSwordTier(): number {
    return this.swordTier;
  }

  /**
   * Calculate actual sword damage based on tier
   */
  calculateSwordDamage(): number {
    return SWORD_DAMAGE[this.swordTier] ?? MIN_DAMAGE;
  }

  /**
   * Process all queued damage events
   * Returns results for each processed event
   */
  processQueue(): DamageResult[] {
    const results: DamageResult[] = [];
    const processedTargets = new Set<string>(); // Prevent double-damage to same target

    for (const event of this.damageQueue) {
      const targetId = this.getTargetId(event.target);

      // Skip if already damaged this frame (prevents double-hits)
      if (processedTargets.has(targetId)) {
        results.push({
          success: false,
          actualDamage: 0,
          targetDied: false,
          reason: 'already_damaged_this_frame',
        });
        continue;
      }

      const result = this.processDamageEvent(event);
      results.push(result);

      // Mark target as processed if damage was successful
      if (result.success) {
        processedTargets.add(targetId);
      }
    }

    // Clear the queue after processing
    this.damageQueue = [];

    return results;
  }

  /**
   * Process a single damage event
   */
  private processDamageEvent(event: DamageEvent): DamageResult {
    if (event.targetType === 'PLAYER') {
      return this.processPlayerDamage(event.target as Player, event);
    } else {
      return this.processEnemyDamage(event.target as EnemyEntity, event);
    }
  }

  /**
   * Process damage to the player
   */
  private processPlayerDamage(player: Player, event: DamageEvent): DamageResult {
    // Check if player is already dying (check this first since DYING makes them invincible)
    if (player.getState() === 'DYING') {
      return {
        success: false,
        actualDamage: 0,
        targetDied: false,
        reason: 'already_dead',
      };
    }

    // Check if player is invincible
    if (player.isInvincible()) {
      return {
        success: false,
        actualDamage: 0,
        targetDied: false,
        reason: 'invincible',
      };
    }

    // Apply damage using player's takeDamage method
    // This handles knockback and invincibility internally
    const damageTaken = player.takeDamage(event.damage, event.fromDirection);

    if (!damageTaken) {
      return {
        success: false,
        actualDamage: 0,
        targetDied: false,
        reason: 'damage_rejected',
      };
    }

    return {
      success: true,
      actualDamage: event.damage,
      targetDied: player.hp <= 0,
    };
  }

  /**
   * Process damage to an enemy
   */
  private processEnemyDamage(enemy: EnemyEntity, event: DamageEvent): DamageResult {
    // Check if enemy is active
    if (!enemy.active) {
      return {
        success: false,
        actualDamage: 0,
        targetDied: false,
        reason: 'inactive',
      };
    }

    // Check if enemy is dying
    if (enemy.state === 'DYING') {
      return {
        success: false,
        actualDamage: 0,
        targetDied: false,
        reason: 'already_dead',
      };
    }

    // Check if enemy is vulnerable
    if (!enemy.isVulnerable()) {
      return {
        success: false,
        actualDamage: 0,
        targetDied: false,
        reason: 'invulnerable',
      };
    }

    // Calculate actual damage
    let actualDamage = event.damage;
    if (event.sourceType === 'SWORD') {
      actualDamage = this.calculateSwordDamage();
    }
    actualDamage = Math.max(MIN_DAMAGE, actualDamage);

    // Apply damage using enemy's takeDamage method
    // This handles knockback (if knockbackable) and state changes internally
    const damageTaken = enemy.takeDamage(actualDamage, event.fromDirection);

    if (!damageTaken) {
      return {
        success: false,
        actualDamage: 0,
        targetDied: false,
        reason: 'damage_rejected',
      };
    }

    return {
      success: true,
      actualDamage,
      targetDied: enemy.hp <= 0,
    };
  }

  /**
   * Get unique ID for a target entity
   */
  private getTargetId(target: Player | EnemyEntity): string {
    if ('id' in target && typeof target.id === 'string') {
      return target.id;
    }
    return 'player';
  }

  /**
   * Get the number of pending damage events
   */
  getQueueLength(): number {
    return this.damageQueue.length;
  }

  /**
   * Clear all queued damage events without processing
   */
  clearQueue(): void {
    this.damageQueue = [];
  }

  /**
   * Check if there are any pending damage events
   */
  hasPendingDamage(): boolean {
    return this.damageQueue.length > 0;
  }
}

// Singleton instance
let damageSystem: DamageSystem | null = null;

/**
 * Get the global DamageSystem instance
 */
export function getDamageSystem(): DamageSystem {
  if (!damageSystem) {
    damageSystem = new DamageSystem();
  }
  return damageSystem;
}

/**
 * Reset the global DamageSystem instance (for testing)
 */
export function resetDamageSystem(): DamageSystem {
  damageSystem = new DamageSystem();
  return damageSystem;
}
