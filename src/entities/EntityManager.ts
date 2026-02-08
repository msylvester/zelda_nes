// EntityManager.ts - Manages all game entities
// Implements spec section 5.6 - Entity Management

import { SpriteRenderCommand, Direction, EnemySpawn } from '../types';
import { MAX_ENEMIES_PER_SCREEN } from '../constants';
import {
  GameEntity,
  EnemyEntity,
  ProjectileEntity,
  ItemEntity,
  EffectEntity,
  EntityType,
  isEnemy,
  isProjectile,
  isItem,
  isEffect,
} from './Entity';

/**
 * Spawn request for deferred entity creation
 */
export interface SpawnRequest {
  type: EntityType;
  x: number;
  y: number;
  config: unknown;
  delay: number; // frames until spawn
}

/**
 * Entity factory function signature
 */
export type EntityFactory<T extends GameEntity> = (
  x: number,
  y: number,
  config: unknown
) => T;

/**
 * EntityManager - Central manager for all game entities
 *
 * Responsibilities:
 * - Track all active entities by type
 * - Handle entity lifecycle (spawn, update, despawn)
 * - Provide entity queries for collision detection
 * - Generate sprite render commands for all entities
 */
export class EntityManager {
  // Entity storage by type
  private enemies: Map<string, EnemyEntity> = new Map();
  private projectiles: Map<string, ProjectileEntity> = new Map();
  private items: Map<string, ItemEntity> = new Map();
  private effects: Map<string, EffectEntity> = new Map();

  // Spawn queue for delayed spawns
  private spawnQueue: SpawnRequest[] = [];

  // Entity factories
  private enemyFactory: EntityFactory<EnemyEntity> | null = null;
  private projectileFactory: EntityFactory<ProjectileEntity> | null = null;
  private itemFactory: EntityFactory<ItemEntity> | null = null;
  private effectFactory: EntityFactory<EffectEntity> | null = null;

  /**
   * Register an enemy factory for spawning enemies
   */
  registerEnemyFactory(factory: EntityFactory<EnemyEntity>): void {
    this.enemyFactory = factory;
  }

  /**
   * Register a projectile factory for spawning projectiles
   */
  registerProjectileFactory(factory: EntityFactory<ProjectileEntity>): void {
    this.projectileFactory = factory;
  }

  /**
   * Register an item factory for spawning items
   */
  registerItemFactory(factory: EntityFactory<ItemEntity>): void {
    this.itemFactory = factory;
  }

  /**
   * Register an effect factory for spawning effects
   */
  registerEffectFactory(factory: EntityFactory<EffectEntity>): void {
    this.effectFactory = factory;
  }

  // ===== SPAWN METHODS =====

  /**
   * Spawn an enemy immediately
   */
  spawnEnemy(x: number, y: number, archetypeId: string): EnemyEntity | null {
    if (!this.enemyFactory) {
      console.warn('No enemy factory registered');
      return null;
    }

    if (this.getActiveEnemyCount() >= MAX_ENEMIES_PER_SCREEN) {
      return null; // At enemy limit
    }

    const enemy = this.enemyFactory(x, y, { archetypeId });
    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  /**
   * Queue an enemy spawn with delay
   */
  queueEnemySpawn(spawn: EnemySpawn): void {
    this.spawnQueue.push({
      type: 'ENEMY',
      x: spawn.x,
      y: spawn.y,
      config: { archetypeId: spawn.archetypeId },
      delay: spawn.spawnDelay,
    });
  }

  /**
   * Queue multiple enemy spawns from screen data
   */
  queueEnemySpawns(spawns: EnemySpawn[]): void {
    for (const spawn of spawns) {
      this.queueEnemySpawn(spawn);
    }
  }

  /**
   * Spawn a projectile
   */
  spawnProjectile(
    x: number,
    y: number,
    direction: Direction,
    sourceType: 'PLAYER' | 'ENEMY',
    projectileType: string
  ): ProjectileEntity | null {
    if (!this.projectileFactory) {
      console.warn('No projectile factory registered');
      return null;
    }

    const projectile = this.projectileFactory(x, y, {
      direction,
      sourceType,
      projectileType,
    });
    this.projectiles.set(projectile.id, projectile);
    return projectile;
  }

  /**
   * Add a pre-created projectile directly to the manager
   * Useful for projectiles that need custom configuration before adding
   */
  addProjectile(projectile: ProjectileEntity): void {
    this.projectiles.set(projectile.id, projectile);
  }

  /**
   * Spawn an item drop
   */
  spawnItem(x: number, y: number, itemType: string): ItemEntity | null {
    if (!this.itemFactory) {
      console.warn('No item factory registered');
      return null;
    }

    const item = this.itemFactory(x, y, { itemType });
    this.items.set(item.id, item);
    return item;
  }

  /**
   * Spawn a visual effect
   */
  spawnEffect(x: number, y: number, effectType: string): EffectEntity | null {
    if (!this.effectFactory) {
      console.warn('No effect factory registered');
      return null;
    }

    const effect = this.effectFactory(x, y, { effectType });
    this.effects.set(effect.id, effect);
    return effect;
  }

  /**
   * Add a pre-created entity directly
   */
  addEntity(entity: GameEntity): void {
    if (isEnemy(entity)) {
      this.enemies.set(entity.id, entity);
    } else if (isProjectile(entity)) {
      this.projectiles.set(entity.id, entity);
    } else if (isItem(entity)) {
      this.items.set(entity.id, entity);
    } else if (isEffect(entity)) {
      this.effects.set(entity.id, entity);
    }
  }

  // ===== UPDATE METHODS =====

  /**
   * Update all entities and process spawn queue
   */
  update(deltaFrame: number): void {
    // Process spawn queue
    this.processSpawnQueue(deltaFrame);

    // Update all entity types
    this.updateEntities(this.enemies, deltaFrame);
    this.updateEntities(this.projectiles, deltaFrame);
    this.updateEntities(this.items, deltaFrame);
    this.updateEntities(this.effects, deltaFrame);

    // Clean up inactive entities
    this.removeInactiveEntities();
  }

  /**
   * Process the spawn queue, decrementing delays and spawning when ready
   */
  private processSpawnQueue(deltaFrame: number): void {
    const remaining: SpawnRequest[] = [];

    for (const request of this.spawnQueue) {
      request.delay -= deltaFrame;

      if (request.delay <= 0) {
        // Time to spawn
        this.processSpawnRequest(request);
      } else {
        // Keep waiting
        remaining.push(request);
      }
    }

    this.spawnQueue = remaining;
  }

  /**
   * Process a single spawn request
   */
  private processSpawnRequest(request: SpawnRequest): void {
    switch (request.type) {
      case 'ENEMY': {
        const config = request.config as { archetypeId: string };
        this.spawnEnemy(request.x, request.y, config.archetypeId);
        break;
      }
      case 'PROJECTILE': {
        const config = request.config as {
          direction: Direction;
          sourceType: 'PLAYER' | 'ENEMY';
          projectileType: string;
        };
        this.spawnProjectile(
          request.x,
          request.y,
          config.direction,
          config.sourceType,
          config.projectileType
        );
        break;
      }
      case 'ITEM': {
        const config = request.config as { itemType: string };
        this.spawnItem(request.x, request.y, config.itemType);
        break;
      }
      case 'EFFECT': {
        const config = request.config as { effectType: string };
        this.spawnEffect(request.x, request.y, config.effectType);
        break;
      }
    }
  }

  /**
   * Update a map of entities
   */
  private updateEntities<T extends GameEntity>(
    entities: Map<string, T>,
    deltaFrame: number
  ): void {
    for (const entity of entities.values()) {
      if (entity.active) {
        entity.update(deltaFrame);
      }
    }
  }

  /**
   * Remove all inactive entities from their maps
   */
  private removeInactiveEntities(): void {
    this.removeInactiveFromMap(this.enemies);
    this.removeInactiveFromMap(this.projectiles);
    this.removeInactiveFromMap(this.items);
    this.removeInactiveFromMap(this.effects);
  }

  /**
   * Remove inactive entities from a specific map
   */
  private removeInactiveFromMap<T extends GameEntity>(
    entities: Map<string, T>
  ): void {
    const toRemove: string[] = [];
    for (const [id, entity] of entities) {
      if (!entity.active) {
        toRemove.push(id);
      }
    }
    for (const id of toRemove) {
      entities.delete(id);
    }
  }

  // ===== QUERY METHODS =====

  /**
   * Get count of active enemies that count toward limit
   */
  getActiveEnemyCount(): number {
    let count = 0;
    for (const enemy of this.enemies.values()) {
      if (enemy.active && enemy.countsTowardLimit) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get count of enemies that advance kill counter (for room clearing)
   */
  getKillCounterEnemyCount(): number {
    let count = 0;
    for (const enemy of this.enemies.values()) {
      if (enemy.active && enemy.advancesKillCounter) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check if all kill-counter enemies are defeated
   */
  isRoomCleared(): boolean {
    return this.getKillCounterEnemyCount() === 0;
  }

  /**
   * Get all active enemies
   */
  getEnemies(): EnemyEntity[] {
    return Array.from(this.enemies.values()).filter(e => e.active);
  }

  /**
   * Get all player projectiles
   */
  getPlayerProjectiles(): ProjectileEntity[] {
    return Array.from(this.projectiles.values()).filter(
      p => p.active && p.sourceType === 'PLAYER'
    );
  }

  /**
   * Get all enemy projectiles
   */
  getEnemyProjectiles(): ProjectileEntity[] {
    return Array.from(this.projectiles.values()).filter(
      p => p.active && p.sourceType === 'ENEMY'
    );
  }

  /**
   * Get all active items
   */
  getItems(): ItemEntity[] {
    return Array.from(this.items.values()).filter(i => i.active && !i.collected);
  }

  /**
   * Get all active effects
   */
  getEffects(): EffectEntity[] {
    return Array.from(this.effects.values()).filter(e => e.active);
  }

  /**
   * Get entity by ID
   */
  getEntityById(id: string): GameEntity | null {
    return (
      this.enemies.get(id) ??
      this.projectiles.get(id) ??
      this.items.get(id) ??
      this.effects.get(id) ??
      null
    );
  }

  // ===== RENDERING =====

  /**
   * Get all sprite render commands for all entities
   * Sorted by priority (lower priority renders first/behind)
   */
  getSpriteCommands(): SpriteRenderCommand[] {
    const commands: SpriteRenderCommand[] = [];

    // Collect from all entity types
    for (const enemy of this.enemies.values()) {
      if (enemy.active) {
        commands.push(...enemy.getSpriteCommands());
      }
    }

    for (const projectile of this.projectiles.values()) {
      if (projectile.active) {
        commands.push(...projectile.getSpriteCommands());
      }
    }

    for (const item of this.items.values()) {
      if (item.active && !item.collected) {
        commands.push(...item.getSpriteCommands());
      }
    }

    for (const effect of this.effects.values()) {
      if (effect.active) {
        commands.push(...effect.getSpriteCommands());
      }
    }

    // Sort by priority (lower values render first/behind)
    commands.sort((a, b) => a.priority - b.priority);

    return commands;
  }

  // ===== CLEAR/RESET METHODS =====

  /**
   * Clear all enemies (e.g., on screen transition)
   */
  clearEnemies(): void {
    for (const enemy of this.enemies.values()) {
      enemy.destroy();
    }
    this.enemies.clear();
    // Also clear pending enemy spawns
    this.spawnQueue = this.spawnQueue.filter(r => r.type !== 'ENEMY');
  }

  /**
   * Clear all projectiles
   */
  clearProjectiles(): void {
    for (const projectile of this.projectiles.values()) {
      projectile.destroy();
    }
    this.projectiles.clear();
    this.spawnQueue = this.spawnQueue.filter(r => r.type !== 'PROJECTILE');
  }

  /**
   * Clear all items
   */
  clearItems(): void {
    for (const item of this.items.values()) {
      item.destroy();
    }
    this.items.clear();
    this.spawnQueue = this.spawnQueue.filter(r => r.type !== 'ITEM');
  }

  /**
   * Clear all effects
   */
  clearEffects(): void {
    for (const effect of this.effects.values()) {
      effect.destroy();
    }
    this.effects.clear();
    this.spawnQueue = this.spawnQueue.filter(r => r.type !== 'EFFECT');
  }

  /**
   * Clear all entities and spawn queue
   */
  clearAll(): void {
    this.clearEnemies();
    this.clearProjectiles();
    this.clearItems();
    this.clearEffects();
    this.spawnQueue = [];
  }

  /**
   * Get total entity count (for debugging)
   */
  getTotalEntityCount(): number {
    return (
      this.enemies.size +
      this.projectiles.size +
      this.items.size +
      this.effects.size
    );
  }

  /**
   * Get spawn queue length (for debugging/testing)
   */
  getSpawnQueueLength(): number {
    return this.spawnQueue.length;
  }
}

// Singleton instance
let entityManager: EntityManager | null = null;

/**
 * Get the global EntityManager instance
 */
export function getEntityManager(): EntityManager {
  if (!entityManager) {
    entityManager = new EntityManager();
  }
  return entityManager;
}

/**
 * Reset the global EntityManager (useful for testing)
 */
export function resetEntityManager(): void {
  if (entityManager) {
    entityManager.clearAll();
  }
  entityManager = new EntityManager();
}
