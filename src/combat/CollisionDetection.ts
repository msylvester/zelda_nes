// CollisionDetection.ts - Collision detection system
// Implements spec section 5.10 - Collision System

import { AABB, Direction } from '../types';
import { aabbOverlap } from '../utils/math';
import { Player } from '../entities/Player';
import { EnemyEntity, ProjectileEntity, ItemEntity } from '../entities/Entity';
import { EntityManager } from '../entities/EntityManager';

/**
 * Collision result for player-enemy contact
 */
export interface PlayerEnemyCollision {
  enemy: EnemyEntity;
  damage: number;
  fromDirection: Direction;
}

/**
 * Collision result for weapon-enemy contact
 */
export interface WeaponEnemyCollision {
  enemy: EnemyEntity;
  hitbox: AABB;
  sourceType: 'SWORD' | 'PROJECTILE';
  damage: number;
  projectile?: ProjectileEntity; // Reference to projectile if sourceType is PROJECTILE
}

/**
 * Collision result for player-item contact
 */
export interface PlayerItemCollision {
  item: ItemEntity;
}

/**
 * Collision result for player-projectile contact
 */
export interface PlayerProjectileCollision {
  projectile: ProjectileEntity;
  damage: number;
  fromDirection: Direction;
}

/**
 * Collision result for boomerang hitting enemy (stun, not damage)
 */
export interface BoomerangEnemyCollision {
  enemy: EnemyEntity;
  stunDuration: number;
}

/**
 * Collision result for bomb explosion hitting enemy
 */
export interface BombEnemyCollision {
  enemy: EnemyEntity;
  damage: number;
}

/**
 * Get the direction from one entity to another
 * Returns the direction you would travel TO GET FROM source to target
 * (e.g., if target is to the right of source, returns RIGHT)
 */
export function getDirectionFrom(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): Direction {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;

  // Use the larger component to determine primary direction
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'RIGHT' : 'LEFT';
  } else {
    return dy > 0 ? 'DOWN' : 'UP';
  }
}

/**
 * Get the center point of an AABB
 */
export function getCenter(box: AABB): { x: number; y: number } {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * CollisionDetection - Handles all collision checks in the game
 */
export class CollisionDetection {
  /**
   * Check for collisions between player and enemies
   * Returns list of enemies that the player is touching
   */
  checkPlayerEnemyCollisions(
    player: Player,
    enemies: EnemyEntity[]
  ): PlayerEnemyCollision[] {
    const collisions: PlayerEnemyCollision[] = [];

    // Don't check if player is invincible or dead
    if (player.isInvincible() || player.getState() === 'DYING') {
      return collisions;
    }

    const playerHitbox = player.getHitbox();

    for (const enemy of enemies) {
      // Skip inactive or dying enemies
      if (!enemy.active || enemy.state === 'DYING' || enemy.state === 'SPAWNING') {
        continue;
      }

      const enemyHitbox = enemy.getHitbox();

      if (aabbOverlap(playerHitbox, enemyHitbox)) {
        const playerCenter = getCenter(playerHitbox);
        const enemyCenter = getCenter(enemyHitbox);

        collisions.push({
          enemy,
          damage: enemy.getContactDamage(),
          fromDirection: getDirectionFrom(
            enemyCenter.x,
            enemyCenter.y,
            playerCenter.x,
            playerCenter.y
          ),
        });
      }
    }

    return collisions;
  }

  /**
   * Check for collisions between player's sword and enemies
   * Returns list of enemies hit by the sword
   */
  checkPlayerSwordEnemyCollisions(
    player: Player,
    enemies: EnemyEntity[]
  ): WeaponEnemyCollision[] {
    const collisions: WeaponEnemyCollision[] = [];

    const swordHitbox = player.getSwordHitbox();
    if (!swordHitbox) {
      return collisions;
    }

    for (const enemy of enemies) {
      // Skip inactive, dying, or invulnerable enemies
      if (!enemy.active || enemy.state === 'DYING' || !enemy.isVulnerable()) {
        continue;
      }

      const enemyHitbox = enemy.getHitbox();

      if (aabbOverlap(swordHitbox, enemyHitbox)) {
        collisions.push({
          enemy,
          hitbox: swordHitbox,
          sourceType: 'SWORD',
          damage: 1, // Base sword damage, will be modified by sword tier
        });
      }
    }

    return collisions;
  }

  /**
   * Check for collisions between player projectiles and enemies
   * Returns list of enemies hit by projectiles
   */
  checkProjectileEnemyCollisions(
    projectiles: ProjectileEntity[],
    enemies: EnemyEntity[]
  ): WeaponEnemyCollision[] {
    const collisions: WeaponEnemyCollision[] = [];

    for (const projectile of projectiles) {
      if (!projectile.active || projectile.sourceType !== 'PLAYER') {
        continue;
      }

      const projectileHitbox = projectile.getHitbox();

      for (const enemy of enemies) {
        if (!enemy.active || enemy.state === 'DYING' || !enemy.isVulnerable()) {
          continue;
        }

        const enemyHitbox = enemy.getHitbox();

        if (aabbOverlap(projectileHitbox, enemyHitbox)) {
          collisions.push({
            enemy,
            hitbox: projectileHitbox,
            sourceType: 'PROJECTILE',
            damage: projectile.damage,
            projectile, // Include reference to deactivate projectile on hit
          });
        }
      }
    }

    return collisions;
  }

  /**
   * Check for collisions between player and items
   * Returns list of items the player is touching
   */
  checkPlayerItemCollisions(
    player: Player,
    items: ItemEntity[]
  ): PlayerItemCollision[] {
    const collisions: PlayerItemCollision[] = [];

    // Can't collect items while dying
    if (player.getState() === 'DYING') {
      return collisions;
    }

    const playerHitbox = player.getHitbox();

    for (const item of items) {
      if (!item.active || item.collected) {
        continue;
      }

      const itemHitbox = item.getHitbox();

      if (aabbOverlap(playerHitbox, itemHitbox)) {
        collisions.push({ item });
      }
    }

    return collisions;
  }

  /**
   * Check for collisions between enemy projectiles and player
   * Returns list of projectiles hitting the player
   */
  checkEnemyProjectilePlayerCollisions(
    player: Player,
    projectiles: ProjectileEntity[]
  ): PlayerProjectileCollision[] {
    const collisions: PlayerProjectileCollision[] = [];

    // Don't check if player is invincible or dead
    if (player.isInvincible() || player.getState() === 'DYING') {
      return collisions;
    }

    const playerHitbox = player.getHitbox();

    for (const projectile of projectiles) {
      if (!projectile.active || projectile.sourceType !== 'ENEMY') {
        continue;
      }

      const projectileHitbox = projectile.getHitbox();

      if (aabbOverlap(playerHitbox, projectileHitbox)) {
        const playerCenter = getCenter(playerHitbox);
        const projCenter = getCenter(projectileHitbox);

        collisions.push({
          projectile,
          damage: projectile.damage,
          fromDirection: getDirectionFrom(
            projCenter.x,
            projCenter.y,
            playerCenter.x,
            playerCenter.y
          ),
        });
      }
    }

    return collisions;
  }

  /**
   * Combined check for player weapon (sword + projectiles) hitting enemies
   */
  checkPlayerWeaponEnemyCollisions(
    player: Player,
    enemies: EnemyEntity[],
    playerProjectiles: ProjectileEntity[]
  ): WeaponEnemyCollision[] {
    const swordCollisions = this.checkPlayerSwordEnemyCollisions(player, enemies);
    const projectileCollisions = this.checkProjectileEnemyCollisions(playerProjectiles, enemies);
    return [...swordCollisions, ...projectileCollisions];
  }

  /**
   * Check for boomerang collisions with enemies (for stunning)
   * Returns list of enemies hit by the boomerang
   */
  checkBoomerangEnemyCollisions(
    boomerangHitbox: AABB | null,
    enemies: EnemyEntity[],
    stunDuration: number
  ): BoomerangEnemyCollision[] {
    const collisions: BoomerangEnemyCollision[] = [];

    if (!boomerangHitbox) {
      return collisions;
    }

    for (const enemy of enemies) {
      // Skip inactive, dying, or already stunned enemies
      if (!enemy.active || enemy.state === 'DYING' || enemy.state === 'STUNNED') {
        continue;
      }

      const enemyHitbox = enemy.getHitbox();

      if (aabbOverlap(boomerangHitbox, enemyHitbox)) {
        collisions.push({
          enemy,
          stunDuration,
        });
      }
    }

    return collisions;
  }

  /**
   * Check for bomb explosion collisions with enemies
   * Returns list of enemies hit by the blast
   */
  checkBombEnemyCollisions(
    blastHitbox: AABB | null,
    enemies: EnemyEntity[],
    damage: number
  ): BombEnemyCollision[] {
    const collisions: BombEnemyCollision[] = [];

    if (!blastHitbox) {
      return collisions;
    }

    for (const enemy of enemies) {
      // Skip inactive or dying enemies
      if (!enemy.active || enemy.state === 'DYING') {
        continue;
      }

      const enemyHitbox = enemy.getHitbox();

      if (aabbOverlap(blastHitbox, enemyHitbox)) {
        collisions.push({
          enemy,
          damage,
        });
      }
    }

    return collisions;
  }

  /**
   * Process all collision checks using EntityManager
   * Returns all detected collisions
   */
  checkAllCollisions(
    player: Player,
    entityManager: EntityManager
  ): {
    playerEnemyCollisions: PlayerEnemyCollision[];
    weaponEnemyCollisions: WeaponEnemyCollision[];
    playerItemCollisions: PlayerItemCollision[];
    enemyProjectileCollisions: PlayerProjectileCollision[];
  } {
    const enemies = entityManager.getEnemies();
    const items = entityManager.getItems();
    const playerProjectiles = entityManager.getPlayerProjectiles();
    const enemyProjectiles = entityManager.getEnemyProjectiles();

    return {
      playerEnemyCollisions: this.checkPlayerEnemyCollisions(player, enemies),
      weaponEnemyCollisions: this.checkPlayerWeaponEnemyCollisions(player, enemies, playerProjectiles),
      playerItemCollisions: this.checkPlayerItemCollisions(player, items),
      enemyProjectileCollisions: this.checkEnemyProjectilePlayerCollisions(player, enemyProjectiles),
    };
  }
}

// Singleton instance
let collisionDetection: CollisionDetection | null = null;

/**
 * Get the global CollisionDetection instance
 */
export function getCollisionDetection(): CollisionDetection {
  if (!collisionDetection) {
    collisionDetection = new CollisionDetection();
  }
  return collisionDetection;
}

/**
 * Reset the global CollisionDetection instance (for testing)
 */
export function resetCollisionDetection(): void {
  collisionDetection = new CollisionDetection();
}

// Re-export aabbOverlap for convenience
export { aabbOverlap } from '../utils/math';
