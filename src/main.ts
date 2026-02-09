// main.ts - Entry point for Legend of Zelda NES TypeScript implementation
// Bootstraps all game systems per spec section 5.1

import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  CANVAS_SCALE,
  START_SCREEN_COL,
  START_SCREEN_ROW,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
  CONTINUE_HP,
} from './constants';
import type { InputSnapshot, SpriteRenderCommand, EnemySpawn, TileData } from './types';

// Core systems
import { GameStateManager } from './core/GameStateManager';
import { GameLoop } from './core/GameLoop';

// Input system
import { InputSystem } from './input';

// Audio system
import { getAudioManager } from './audio';

// Asset generation
import { generateGameAssets, type GeneratedAssets } from './assets/AssetGenerator';
import { loadOracleSprites } from './assets/gbc/GbcSpriteLoader';

// Rendering
import { Renderer, type RenderFrame } from './rendering/Renderer';
import { HudRenderer, createHudData } from './rendering/HudRenderer';

// World management
import { WorldManager } from './world/WorldManager';
import { getDungeonManager, resetDungeonManager } from './world/DungeonManager';
import { getCaveManager, resetCaveManager } from './world/CaveManager';
import { getOverworldScreen, getStartingScreen } from './data/overworldData';
import { getDungeonRoom } from './data/dungeonData';
import { getCave, CAVE_TILE_COLLISION_MAP } from './data/caveData';

// Entity management
import { getEntityManager, resetEntityManager } from './entities/EntityManager';
import { getPlayer, resetPlayer } from './entities/Player';
import { createEnemy, Enemy } from './entities/Enemy';
import { createBoss, Boss, isBossArchetype } from './entities/Boss';
import { createProjectile } from './entities/Projectile';
import {
  createItemDrop,
  determineEnemyDrop,
  applyItemToInventory,
  canCollectItem,
} from './entities/ItemDrop';
import { Projectile } from './entities/Projectile';

// Combat systems
import { getCollisionDetection } from './combat/CollisionDetection';
import { getDamageSystem, resetDamageSystem } from './combat/DamageSystem';

// Inventory
import { getInventoryManager, resetInventoryManager } from './inventory/InventoryManager';
import { useBItem } from './inventory/ItemEffects';

// B-items
import { Boomerang } from './entities/Boomerang';
import { Bomb } from './entities/Bomb';
import { CandleFlame } from './entities/CandleFlame';
import { BOOMERANG_STUN_FRAMES, BOMB_DAMAGE } from './constants';

// Screens
import { getTitleScreen } from './screens/TitleScreen';
import { getPauseScreen, type PauseScreenData } from './screens/PauseScreen';
import { getContinueScreen } from './screens/ContinueScreen';
import { getFileSelectScreen } from './screens/FileSelectScreen';

// Save system and progression
import { getSaveSystem } from './progression/SaveSystem';
import { getProgressionManager, resetProgressionManager } from './progression/ProgressionManager';

// ===== GAME CLASS =====

/**
 * Main Game class that orchestrates all systems
 */
class Game {
  // Core systems
  private gameStateManager: GameStateManager;
  private gameLoop: GameLoop | null = null;
  private inputSystem: InputSystem;

  // Rendering
  private canvas: HTMLCanvasElement | null = null;
  private renderer: Renderer | null = null;
  private hudRenderer: HudRenderer | null = null;
  private assets: GeneratedAssets | null = null;

  // World
  private worldManager: WorldManager;

  // Flags
  private initialized: boolean = false;

  // Kill counter for item drop tables
  private killCounter: number = 0;

  // Track dying enemies for item drops
  private dyingEnemies: Set<string> = new Set();

  // Track visited screens for pause screen map
  private visitedScreens: Set<string> = new Set();

  // Sword beam tracking - only one beam can exist at a time
  private activeSwordBeam: Projectile | null = null;

  // Boomerang tracking - only one boomerang can exist at a time
  private activeBoomerang: Boomerang | null = null;

  // Bomb tracking - multiple bombs can exist
  private activeBombs: Set<Bomb> = new Set();

  // Candle flame tracking - only one flame can exist at a time
  private activeCandleFlame: CandleFlame | null = null;

  // Blue candle once-per-screen tracking
  private usedBlueCandleThisScreen: boolean = false;

  // Debug frame counter for throttled logging
  private debugFrameCount: number = 0;

  constructor() {
    // Initialize core systems that don't need DOM
    this.gameStateManager = new GameStateManager();
    this.inputSystem = new InputSystem();
    this.worldManager = new WorldManager();
  }

  /**
   * Initialize the game - call after DOM is ready
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    // Get canvas element
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element #game-canvas not found');
    }

    // Setup canvas dimensions
    this.setupCanvas();

    // Generate placeholder assets
    this.assets = generateGameAssets();

    // Load oracle sprites in background (fire-and-forget, no await)
    const assets = this.assets;
    loadOracleSprites().then((oracleSprites) => {
      for (const [key, canvas] of oracleSprites) {
        assets.sprites.set(key, canvas);
      }
      console.log(`Loaded ${oracleSprites.size} oracle sprites`);
    }).catch((err) => {
      console.warn('Failed to load oracle sprites:', err);
    });

    // Initialize renderer
    this.renderer = new Renderer({
      canvas: this.canvas,
      assets: this.assets,
    });

    // Initialize HUD renderer
    this.hudRenderer = new HudRenderer(this.renderer.getContext(), this.assets);

    // Initialize audio (will wait for user interaction)
    const audioManager = getAudioManager();
    audioManager.init();

    // Register entity factories
    this.setupEntityFactories();

    // Load overworld screen data
    this.loadOverworldData();

    // Setup game loop
    this.gameLoop = new GameLoop(
      {
        inputSystem: this.inputSystem,
        gameStateManager: this.gameStateManager,
      },
      (input) => this.update(input)
    );

    // Game starts on TITLE phase
    this.gameStateManager.setPhase('TITLE');

    this.initialized = true;
    console.log('Game initialized successfully');
  }

  /**
   * Setup canvas for NES-style rendering
   */
  private setupCanvas(): void {
    if (!this.canvas) return;

    // Set native NES resolution
    this.canvas.width = SCREEN_WIDTH;
    this.canvas.height = SCREEN_HEIGHT;

    // Scale up with CSS for display (3x scale)
    this.canvas.style.width = `${SCREEN_WIDTH * CANVAS_SCALE}px`;
    this.canvas.style.height = `${SCREEN_HEIGHT * CANVAS_SCALE}px`;
  }

  /**
   * Register entity factories with EntityManager
   */
  private setupEntityFactories(): void {
    const entityManager = getEntityManager();

    // Register enemy factory (handles both regular enemies and bosses)
    entityManager.registerEnemyFactory((x, y, config) => {
      const { archetypeId } = config as { archetypeId: string };
      // Use Boss class for boss archetypes
      if (isBossArchetype(archetypeId)) {
        const boss = createBoss(x, y, { archetypeId });
        boss.setPlayerProvider({
          getX: () => getPlayer().x,
          getY: () => getPlayer().y,
        });
        return boss;
      }
      return createEnemy(x, y, { archetypeId });
    });

    // Register item factory
    entityManager.registerItemFactory((x, y, config) => {
      return createItemDrop(x, y, config as { itemType: string });
    });

    // Register projectile factory
    entityManager.registerProjectileFactory((x, y, config) => {
      const typedConfig = config as {
        direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
        sourceType: 'PLAYER' | 'ENEMY';
        projectileType: string;
        angleOffset?: number;
      };
      return createProjectile(x, y, typedConfig);
    });
  }

  // Store enemy spawn data per screen
  private screenEnemySpawns: Map<string, EnemySpawn[]> = new Map();

  /**
   * Load all overworld screen data into WorldManager
   */
  private loadOverworldData(): void {
    // Load all defined screens
    for (let col = 0; col < 16; col++) {
      for (let row = 0; row < 8; row++) {
        const screen = getOverworldScreen(col, row);
        if (screen) {
          this.worldManager.registerScreen(col, row, {
            tiles: screen.tiles,
          });
          // Store enemy spawn data for each screen
          const key = `${col},${row}`;
          this.screenEnemySpawns.set(key, screen.enemySpawns);
        }
      }
    }
  }

  /**
   * Spawn enemies for the current screen
   */
  private spawnScreenEnemies(col: number, row: number): void {
    const key = `${col},${row}`;
    const spawns = this.screenEnemySpawns.get(key);
    if (!spawns) return;

    const entityManager = getEntityManager();

    // Queue all enemy spawns
    for (const spawn of spawns) {
      entityManager.queueEnemySpawn(spawn);
    }

    // Set up collision checker and player provider for spawned enemies
    // This will be called when enemies are actually spawned from the queue
    this.setupEnemyBehaviors();
  }

  /**
   * Set up collision checker and player provider for all active enemies
   */
  private setupEnemyBehaviors(): void {
    const entityManager = getEntityManager();
    const player = getPlayer();
    const enemies = entityManager.getEnemies();

    for (const enemyEntity of enemies) {
      if (enemyEntity instanceof Enemy) {
        enemyEntity.setCollisionChecker((hitbox) => this.worldManager.checkCollision(hitbox));
        enemyEntity.setPlayerProvider({
          getX: () => player.x,
          getY: () => player.y,
        });
      }
    }
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (!this.initialized) {
      throw new Error('Game not initialized. Call init() first.');
    }
    this.gameLoop?.start();
    console.log('Game loop started');
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.gameLoop?.stop();
  }

  /**
   * Main update function called each frame
   */
  private update(input: InputSnapshot): void {
    const phase = this.gameStateManager.phase;

    // Update based on current phase
    switch (phase) {
      case 'TITLE':
        this.updateTitle(input);
        break;
      case 'FILE_SELECT':
        this.updateFileSelect(input);
        break;
      case 'GAMEPLAY':
        this.updateGameplay(input);
        break;
      case 'PAUSE':
        this.updatePause(input);
        break;
      case 'TRANSITION':
        this.updateTransition(input);
        break;
      case 'DEATH':
        this.updateDeath(input);
        break;
      case 'CONTINUE_SCREEN':
        this.updateContinueScreen(input);
        break;
      case 'ITEM_PICKUP':
        this.updateItemPickup(input);
        break;
      default:
        // Handle any unimplemented phases
        break;
    }

    // Render
    this.render();

    // Update audio
    const audioManager = getAudioManager();
    audioManager.update();
  }

  // Track current save slot for continuing/saving
  private currentSaveSlot: number = -1;

  /**
   * Update title screen
   */
  private updateTitle(input: InputSnapshot): void {
    const titleScreen = getTitleScreen();
    const result = titleScreen.update(input);

    if (result.nextPhase) {
      this.gameStateManager.setPhase(result.nextPhase);

      // Reset file select screen when transitioning to it
      if (result.nextPhase === 'FILE_SELECT') {
        const fileSelectScreen = getFileSelectScreen();
        fileSelectScreen.reset();
      }
    }
  }

  /**
   * Update file select screen
   */
  private updateFileSelect(input: InputSnapshot): void {
    const fileSelectScreen = getFileSelectScreen();
    const result = fileSelectScreen.update(input);

    if (result.nextPhase === 'TITLE') {
      // Go back to title screen
      this.gameStateManager.setPhase('TITLE');
      const titleScreen = getTitleScreen();
      titleScreen.reset();
    } else if (result.nextPhase === 'GAMEPLAY' && result.selectedSlot !== null) {
      // Start or continue game
      this.currentSaveSlot = result.selectedSlot;
      if (result.isNewGame) {
        this.startNewGame();
      } else {
        this.continueFromSave(result.selectedSlot);
      }
    }
  }

  /**
   * Continue game from a save slot
   */
  private continueFromSave(slot: number): void {
    const saveSystem = getSaveSystem();
    const saveFile = saveSystem.load(slot);

    if (!saveFile) {
      // No save file, start new game instead
      this.startNewGame();
      return;
    }

    // Reset systems for loaded game
    resetPlayer();
    resetEntityManager();
    resetDamageSystem();
    resetInventoryManager();
    resetDungeonManager();
    resetCaveManager();
    resetProgressionManager();

    // Reset kill counter from save
    this.killCounter = saveFile.killCounter;
    this.dyingEnemies.clear();

    // Set context to overworld (always respawn in overworld)
    this.worldManager.setContext('OVERWORLD');

    // Restore visited screens from save (overworld progress)
    this.visitedScreens.clear();
    for (const screenKey of saveFile.overworld.visitedScreens) {
      this.visitedScreens.add(screenKey);
    }
    // Ensure starting screen is always visited
    this.visitedScreens.add(`${START_SCREEN_COL},${START_SCREEN_ROW}`);

    // Re-register entity factories
    this.setupEntityFactories();

    // Restore inventory from save
    const inventoryManager = getInventoryManager();
    inventoryManager.loadFromSave(saveFile);

    // Restore progression from save
    const progressionManager = getProgressionManager();
    progressionManager.loadFromSave(saveFile);

    // Setup player with saved heart containers
    const player = getPlayer();
    player.setCollisionChecker((hitbox) => this.worldManager.checkCollision(hitbox));

    // Set player HP to full (continue always restores full HP)
    const maxHP = saveFile.heartContainers * 2;
    player.reset(120, 88, maxHP);
    inventoryManager.setCurrentHP(maxHP);

    // Load starting screen (always respawn at start)
    const startScreen = getStartingScreen();
    if (startScreen) {
      this.worldManager.loadScreen(START_SCREEN_COL, START_SCREEN_ROW);
      player.setPosition(120, 88);
      this.spawnScreenEnemies(START_SCREEN_COL, START_SCREEN_ROW);
    }

    // Transition to gameplay
    this.gameStateManager.setPhase('GAMEPLAY');
    console.log(`Game continued from save slot ${slot}`);
  }

  /**
   * Start a new game
   */
  private startNewGame(): void {
    // Reset systems for new game
    resetPlayer();
    resetEntityManager();
    resetDamageSystem();
    resetInventoryManager();
    resetDungeonManager();
    resetCaveManager();
    resetProgressionManager();

    // Reset kill counter
    this.killCounter = 0;
    this.dyingEnemies.clear();

    // Set context to overworld
    this.worldManager.setContext('OVERWORLD');

    // Reset visited screens and add starting screen
    this.visitedScreens.clear();
    this.visitedScreens.add(`${START_SCREEN_COL},${START_SCREEN_ROW}`);

    // Re-register entity factories (they were cleared on reset)
    this.setupEntityFactories();

    // Setup player
    const player = getPlayer();
    player.setCollisionChecker((hitbox) => this.worldManager.checkCollision(hitbox));

    // Load starting screen
    const startScreen = getStartingScreen();
    if (startScreen) {
      this.worldManager.loadScreen(START_SCREEN_COL, START_SCREEN_ROW);

      // Position player at center of screen
      player.setPosition(120, 88);

      // Spawn enemies for the starting screen
      this.spawnScreenEnemies(START_SCREEN_COL, START_SCREEN_ROW);
    }

    // Transition to gameplay
    this.gameStateManager.setPhase('GAMEPLAY');
    console.log('New game started');
  }

  /**
   * Update gameplay
   */
  private updateGameplay(input: InputSnapshot): void {
    const player = getPlayer();
    const entityManager = getEntityManager();
    const damageSystem = getDamageSystem();
    const inventoryManager = getInventoryManager();
    const collisionDetection = getCollisionDetection();

    // Handle pause toggle
    if (input.buttons.START.justPressed) {
      this.gameStateManager.setPhase('PAUSE');
      return;
    }

    // Handle attack input - if A button pressed and player can attack
    if (input.buttons.A.justPressed && player.canAttack() && inventoryManager.hasSword()) {
      player.startAttack();

      // Check if we should spawn a sword beam (at full HP and no active beam)
      this.trySpawnSwordBeam(player, inventoryManager, entityManager);
    }

    // Handle B-button item use
    if (input.buttons.B.justPressed) {
      this.tryUseBItem(player, inventoryManager, entityManager);
    }

    // Update player
    player.handleInput(input);
    player.update(1); // deltaFrame = 1 for fixed timestep

    // Log Link's position (throttled to every 30 frames)
    this.debugFrameCount++;
    if (this.debugFrameCount % 30 === 0) {
      const hitbox = player.getHitbox();
      console.log(`Link pos: (${player.x.toFixed(1)}, ${player.y.toFixed(1)}) | hitbox: (${hitbox.x}, ${hitbox.y}, w:${hitbox.width}, h:${hitbox.height}) | screen: (${this.worldManager.getCurrentScreenCol()}, ${this.worldManager.getCurrentScreenRow()})`);
    }

    // Update sword beam tracking - check if our tracked beam is still active
    if (this.activeSwordBeam && !this.activeSwordBeam.active) {
      this.activeSwordBeam = null;
    }

    // Update boomerang tracking - check if our tracked boomerang is still active
    if (this.activeBoomerang && !this.activeBoomerang.active) {
      this.activeBoomerang = null;
    }

    // Update bomb tracking - remove inactive bombs
    for (const bomb of this.activeBombs) {
      if (!bomb.active) {
        this.activeBombs.delete(bomb);
      }
    }

    // Update candle flame tracking - check if our tracked flame is still active
    if (this.activeCandleFlame && !this.activeCandleFlame.active) {
      this.activeCandleFlame = null;
    }

    // Set up enemy behaviors (for newly spawned enemies)
    this.setupEnemyBehaviors();

    // Track enemies that are dying (before update) for item drops
    const enemiesBefore = entityManager.getEnemies();
    const dyingEnemiesNow = new Map<string, { x: number; y: number; archetypeId: string }>();
    for (const enemy of enemiesBefore) {
      if (enemy.state === 'DYING' && !this.dyingEnemies.has(enemy.id)) {
        // This enemy just started dying
        this.dyingEnemies.add(enemy.id);
        if (enemy instanceof Enemy) {
          dyingEnemiesNow.set(enemy.id, {
            x: enemy.x,
            y: enemy.y,
            archetypeId: enemy.archetypeId,
          });
        }
      }
    }

    // Spawn item drops for dying enemies
    for (const [, enemyInfo] of dyingEnemiesNow) {
      const itemType = determineEnemyDrop(enemyInfo.archetypeId, this.killCounter);
      if (itemType) {
        entityManager.spawnItem(enemyInfo.x, enemyInfo.y, itemType);
      }
      this.killCounter = (this.killCounter + 1) % 10; // Cycle kill counter
    }

    // Update entities
    entityManager.update(1); // deltaFrame = 1 for fixed timestep

    // Check collisions
    const collisionResults = collisionDetection.checkAllCollisions(player, entityManager);

    // Process player damage from enemy contact
    for (const collision of collisionResults.playerEnemyCollisions) {
      damageSystem.queuePlayerDamage(
        player,
        collision.damage,
        collision.fromDirection,
        'CONTACT'
      );
    }

    // Process player damage from enemy projectiles
    for (const collision of collisionResults.enemyProjectileCollisions) {
      damageSystem.queuePlayerDamage(
        player,
        collision.damage,
        collision.fromDirection,
        'PROJECTILE'
      );
      // Deactivate the projectile that hit
      collision.projectile.active = false;
    }

    // Process enemy damage from player sword and projectiles
    for (const collision of collisionResults.weaponEnemyCollisions) {
      const swordDamage = inventoryManager.getSwordLevel() || 1;
      damageSystem.queueEnemyDamage(
        collision.enemy,
        swordDamage,
        player.facingDirection,
        collision.sourceType // Use actual source type (SWORD or PROJECTILE)
      );

      // Deactivate projectile if it hit an enemy (sword beam, boomerang, etc.)
      if (collision.sourceType === 'PROJECTILE' && collision.projectile) {
        // Special handling for boomerang - don't deactivate, just start returning
        if (this.activeBoomerang && collision.projectile === (this.activeBoomerang as unknown)) {
          this.activeBoomerang.startReturning();
        } else {
          collision.projectile.active = false;

          // If it was our tracked sword beam, clear the reference
          if (collision.projectile === this.activeSwordBeam) {
            this.activeSwordBeam = null;
          }
        }
      }
    }

    // Process boomerang collisions (stuns enemies instead of damaging)
    if (this.activeBoomerang && this.activeBoomerang.active) {
      const enemies = entityManager.getEnemies();
      const boomerangCollisions = collisionDetection.checkBoomerangEnemyCollisions(
        this.activeBoomerang.getHitbox(),
        enemies,
        BOOMERANG_STUN_FRAMES
      );

      for (const collision of boomerangCollisions) {
        if (collision.enemy instanceof Enemy) {
          collision.enemy.stun(collision.stunDuration);
          // Boomerang starts returning after hitting something
          this.activeBoomerang.startReturning();
        }
      }
    }

    // Process bomb explosion collisions
    for (const bomb of this.activeBombs) {
      if (bomb.isExploding() && !bomb.hasExploded()) {
        const enemies = entityManager.getEnemies();
        const blastHitbox = bomb.getBlastHitbox();
        const bombCollisions = collisionDetection.checkBombEnemyCollisions(
          blastHitbox,
          enemies,
          BOMB_DAMAGE
        );

        for (const collision of bombCollisions) {
          // Queue damage for each enemy hit by the blast
          damageSystem.queueEnemyDamage(
            collision.enemy,
            collision.damage,
            player.facingDirection, // Use player direction for knockback
            'BOMB'
          );
        }

        // Mark that this bomb has dealt its damage
        bomb.markDamageDealt();

        // Play explosion sound
        const audioManager = getAudioManager();
        audioManager.playSfx('bomb_explode');
      }
    }

    // Process candle flame collisions
    if (this.activeCandleFlame && this.activeCandleFlame.active) {
      const enemies = entityManager.getEnemies();
      const flameHitbox = this.activeCandleFlame.getHitbox();

      // Check for enemy collisions
      for (const enemy of enemies) {
        if (!enemy.active || enemy.state === 'DYING') {
          continue;
        }

        const enemyHitbox = enemy.getHitbox();
        if (
          flameHitbox.x < enemyHitbox.x + enemyHitbox.width &&
          flameHitbox.x + flameHitbox.width > enemyHitbox.x &&
          flameHitbox.y < enemyHitbox.y + enemyHitbox.height &&
          flameHitbox.y + flameHitbox.height > enemyHitbox.y
        ) {
          // Queue damage from flame
          damageSystem.queueEnemyDamage(
            enemy,
            this.activeCandleFlame.damage,
            player.facingDirection,
            'PROJECTILE'
          );
        }
      }
    }

    // Process item collisions
    for (const collision of collisionResults.playerItemCollisions) {
      const item = collision.item;
      // Check if item can be collected (hearts can't be picked up at full HP)
      if ('itemType' in item) {
        const itemDrop = item as { itemType: string; collect: () => void };
        const itemType = itemDrop.itemType;
        if (canCollectItem(
          itemType as Parameters<typeof canCollectItem>[0],
          inventoryManager.getCurrentHP(),
          inventoryManager.getMaxHP()
        )) {
          // Apply item to inventory
          applyItemToInventory(
            itemType as Parameters<typeof applyItemToInventory>[0],
            inventoryManager
          );
          // Mark item as collected
          itemDrop.collect();
          // Play pickup sound
          const audioManager = getAudioManager();
          if (itemType === 'HEART' || itemType === 'FAIRY') {
            audioManager.playSfx('item_pickup_heart');
          } else {
            audioManager.playSfx('item_pickup_small');
          }
        }
      }
    }

    // Process damage queue
    damageSystem.processQueue();

    // Clean up dying enemy tracking (remove entries for enemies that are no longer active)
    const activeEnemyIds = new Set(enemiesBefore.map(e => e.id));
    for (const id of this.dyingEnemies) {
      if (!activeEnemyIds.has(id)) {
        this.dyingEnemies.delete(id);
      }
    }

    // Check for transitions (dungeon, cave, or overworld)
    const dungeonManager = getDungeonManager();
    const caveManager = getCaveManager();

    if (dungeonManager.isInDungeon()) {
      // Dungeon navigation
      this.handleDungeonGameplay(player, entityManager, inventoryManager);
    } else if (caveManager.isInCave()) {
      // Cave navigation
      this.handleCaveGameplay(player, inventoryManager);
    } else {
      // Overworld navigation
      // First check for dungeon/cave entrances (stairs)
      this.checkOverworldEntrances(player);

      // Then check for screen transitions
      const transitionInfo = this.worldManager.checkScreenTransition(player.getHitbox());
      if (transitionInfo) {
        this.handleOverworldScreenTransition(transitionInfo);
      }
    }

    // Sync player HP with inventory
    inventoryManager.setCurrentHP(player.hp);

    // Check for player death - transition to DEATH phase when player enters DYING state
    if (player.getState() === 'DYING') {
      this.gameStateManager.setPhase('DEATH');
    }
  }

  /**
   * Handle overworld screen transition
   */
  private handleOverworldScreenTransition(transitionInfo: {
    direction: string;
    fromScreen: { col: number; row: number };
    toScreen: { col: number; row: number };
  }): void {
    const { toScreen } = transitionInfo;

    // Load new screen
    if (this.worldManager.loadScreen(toScreen.col, toScreen.row)) {
      // Track visited screens
      this.visitedScreens.add(`${toScreen.col},${toScreen.row}`);
      // Reset entities for new screen
      const entityManager = getEntityManager();
      entityManager.clearEnemies();
      entityManager.clearProjectiles();
      entityManager.clearItems();

      // Clear dying enemies tracking
      this.dyingEnemies.clear();

      // Clear sword beam, boomerang, and bomb tracking
      this.activeSwordBeam = null;
      this.activeBoomerang = null;
      this.activeBombs.clear();
      this.activeCandleFlame = null;
      this.usedBlueCandleThisScreen = false; // Reset blue candle usage for new screen

      // Position player at opposite edge (in play area coordinates, not screen coordinates)
      const player = getPlayer();
      const dir = transitionInfo.direction;
      if (dir === 'LEFT') {
        // Coming from left, enter from right side
        player.setPosition(PLAY_AREA_WIDTH - 24, player.y);
      } else if (dir === 'RIGHT') {
        // Coming from right, enter from left side
        player.setPosition(8, player.y);
      } else if (dir === 'UP') {
        // Coming from above, enter from bottom
        player.setPosition(player.x, PLAY_AREA_HEIGHT - 24);
      } else if (dir === 'DOWN') {
        // Coming from below, enter from top
        player.setPosition(player.x, 8);
      }

      // Spawn enemies for the new screen
      this.spawnScreenEnemies(toScreen.col, toScreen.row);
    }
  }

  /**
   * Check for overworld entrances (stairs leading to dungeons/caves)
   */
  private checkOverworldEntrances(player: ReturnType<typeof getPlayer>): void {
    // Get current screen data
    const screenCol = this.worldManager.getCurrentScreenCol();
    const screenRow = this.worldManager.getCurrentScreenRow();
    const screen = getOverworldScreen(screenCol, screenRow);

    if (!screen || screen.entrances.length === 0) return;

    const playerHitbox = player.getHitbox();

    // Check each entrance
    for (const entrance of screen.entrances) {
      // Check if player overlaps entrance position (stairs are 2 tiles wide typically)
      const entranceHitbox = {
        x: entrance.x - 16, // Center the entrance
        y: entrance.y - 16,
        width: 32,
        height: 32,
      };

      // Simple overlap check
      if (
        playerHitbox.x < entranceHitbox.x + entranceHitbox.width &&
        playerHitbox.x + playerHitbox.width > entranceHitbox.x &&
        playerHitbox.y < entranceHitbox.y + entranceHitbox.height &&
        playerHitbox.y + playerHitbox.height > entranceHitbox.y
      ) {
        if (entrance.destinationType === 'DUNGEON') {
          this.enterDungeon(entrance.destinationId);
          return;
        }
        if (entrance.destinationType === 'CAVE') {
          this.enterCave(entrance.destinationId);
          return;
        }
      }
    }
  }

  /**
   * Enter a dungeon from the overworld
   */
  private enterDungeon(dungeonId: number): void {
    const dungeonManager = getDungeonManager();
    const progressionManager = getProgressionManager();

    if (!dungeonManager.enterDungeon(dungeonId)) {
      console.error(`Failed to enter dungeon ${dungeonId}`);
      return;
    }

    // Track dungeon entrance visit for progression
    progressionManager.visitDungeonEntrance(dungeonId);

    // Set world context to dungeon
    this.worldManager.setContext('DUNGEON');

    // Get entrance room and load tiles
    const room = dungeonManager.getCurrentRoomData();
    if (!room) return;

    // Load dungeon room tiles into the tile map
    this.loadDungeonRoom(room);

    // Position player at dungeon entrance
    const player = getPlayer();
    const spawnPos = dungeonManager.getEntranceSpawnPosition();
    player.setPosition(spawnPos.x, spawnPos.y);

    // Clear entities and spawn dungeon enemies
    const entityManager = getEntityManager();
    entityManager.clearEnemies();
    entityManager.clearProjectiles();
    entityManager.clearItems();
    this.dyingEnemies.clear();

    // Clear sword beam, boomerang, and bomb tracking
    this.activeSwordBeam = null;
    this.activeBoomerang = null;
    this.activeBombs.clear();
    this.activeCandleFlame = null;
    this.usedBlueCandleThisScreen = false;

    // Clear spawned items tracking
    this.spawnedDungeonItems.clear();

    this.spawnDungeonRoomEnemies(room);

    // Play audio feedback
    const audioManager = getAudioManager();
    audioManager.playSfx('secret_reveal');

    console.log(`Entered dungeon ${dungeonId}`);
  }

  /**
   * Enter a cave from the overworld
   */
  private enterCave(caveId: number): void {
    const caveManager = getCaveManager();
    const player = getPlayer();

    // Store current position for return
    const screenCol = this.worldManager.getCurrentScreenCol();
    const screenRow = this.worldManager.getCurrentScreenRow();

    if (!caveManager.enterCave(caveId, screenCol, screenRow, player.x, player.y)) {
      console.error(`Failed to enter cave ${caveId}`);
      return;
    }

    // Set world context to cave
    this.worldManager.setContext('CAVE');

    // Load cave tiles
    const cave = getCave(caveId);
    if (!cave) return;

    // Convert cave tiles to TileData format for world manager
    const tiles: TileData[] = cave.tiles.map((t) => ({
      tileId: t.tileId,
      collision: CAVE_TILE_COLLISION_MAP[t.tileId] ?? 'SOLID',
    }));

    // Register and load cave as a screen
    this.worldManager.registerScreen(0, 0, { tiles });
    this.worldManager.loadScreen(0, 0);

    // Position player at cave entrance
    const spawnPos = caveManager.getSpawnPosition();
    player.setPosition(spawnPos.x, spawnPos.y);

    // Clear entities (caves have no enemies)
    const entityManager = getEntityManager();
    entityManager.clearEnemies();
    entityManager.clearProjectiles();
    entityManager.clearItems();
    this.dyingEnemies.clear();

    // Clear projectile tracking
    this.activeSwordBeam = null;
    this.activeBoomerang = null;
    this.activeBombs.clear();
    this.activeCandleFlame = null;

    // Play audio feedback
    const audioManager = getAudioManager();
    audioManager.playSfx('secret_reveal');

    console.log(`Entered cave ${caveId}`);
  }

  /**
   * Exit current cave back to overworld
   */
  private exitCave(): void {
    const caveManager = getCaveManager();
    const exitInfo = caveManager.exitCave();

    if (!exitInfo) {
      console.error('Failed to exit cave - not in cave');
      return;
    }

    // Set context back to overworld
    this.worldManager.setContext('OVERWORLD');

    // Load the overworld screen
    const screen = getOverworldScreen(exitInfo.screenCol, exitInfo.screenRow);
    const tiles: TileData[] = screen.tiles;

    this.worldManager.registerScreen(exitInfo.screenCol, exitInfo.screenRow, { tiles });
    this.worldManager.loadScreen(exitInfo.screenCol, exitInfo.screenRow);

    // Position player at exit position
    const player = getPlayer();
    player.setPosition(exitInfo.x, exitInfo.y);

    // Spawn enemies for the screen
    this.spawnScreenEnemies(exitInfo.screenCol, exitInfo.screenRow);

    console.log(`Exited cave to screen (${exitInfo.screenCol}, ${exitInfo.screenRow})`);
  }

  // Track pending cave item collection
  private pendingCaveItem: string | null = null;

  /**
   * Handle cave-specific gameplay (NPC interaction, shops, exit)
   */
  private handleCaveGameplay(
    player: ReturnType<typeof getPlayer>,
    inventoryManager: ReturnType<typeof getInventoryManager>
  ): void {
    const caveManager = getCaveManager();

    // Check for cave exit (player on exit stairs)
    if (caveManager.isOnExitStairs(player.getHitbox())) {
      this.exitCave();
      return;
    }

    // Check for NPC interaction
    const npcInteraction = caveManager.getNpcInteraction();
    if (npcInteraction.isInteracting && caveManager.isNearNpc(player.getHitbox())) {
      // Handle item collection if NPC has uncollected item
      if (npcInteraction.itemToGive && !npcInteraction.hasGivenItem) {
        const itemType = caveManager.collectCaveItem();
        if (itemType) {
          // Apply item to inventory
          this.applyCaveItemToInventory(itemType, inventoryManager);

          // Store for item pickup display
          this.pendingCaveItem = itemType;

          // Play sound
          const audioManager = getAudioManager();
          audioManager.playSfx('item_pickup_small');

          console.log(`Collected cave item: ${itemType}`);
        }
      }
    }

    // Handle shop purchases (A button in shop)
    if (caveManager.isInShop()) {
      this.handleShopInteraction(player, inventoryManager, caveManager);
    }
  }

  /**
   * Handle shop interaction (cursor movement and purchase)
   */
  private handleShopInteraction(
    _player: ReturnType<typeof getPlayer>,
    inventoryManager: ReturnType<typeof getInventoryManager>,
    caveManager: ReturnType<typeof getCaveManager>
  ): void {
    const input = this.inputSystem.poll();

    // Shop cursor movement
    if (input.buttons.LEFT?.justPressed) {
      caveManager.moveShopCursorLeft();
    }
    if (input.buttons.RIGHT?.justPressed) {
      caveManager.moveShopCursorRight();
    }

    // Purchase attempt
    if (input.buttons.A?.justPressed) {
      const rupees = inventoryManager.getRupees();
      const result = caveManager.purchaseSelectedItem(rupees);

      if (result.success && result.item) {
        // Deduct rupees
        if (result.newRupeeCount !== undefined) {
          inventoryManager.spendRupees(result.item.price);
        }

        // Apply purchased item
        this.applyShopItemToInventory(result.item.itemType, inventoryManager);

        // Play sound
        const audioManager = getAudioManager();
        audioManager.playSfx('item_pickup_small');

        console.log(`Purchased: ${result.item.itemType} for ${result.item.price} rupees`);
      }
    }
  }

  /**
   * Apply cave item (from NPC) to inventory
   */
  private applyCaveItemToInventory(
    itemType: string,
    inventoryManager: ReturnType<typeof getInventoryManager>
  ): void {
    switch (itemType) {
      case 'WOODEN_SWORD':
        inventoryManager.addItem('WOODEN_SWORD');
        break;
      case 'BOOMERANG':
        inventoryManager.addItem('BOOMERANG');
        break;
      case 'WHITE_SWORD':
        inventoryManager.addItem('WHITE_SWORD');
        break;
      case 'MAGICAL_SWORD':
        inventoryManager.addItem('MAGICAL_SWORD');
        break;
      default:
        console.log(`Unknown cave item: ${itemType}`);
    }
  }

  /**
   * Apply shop purchase to inventory
   */
  private applyShopItemToInventory(
    itemType: string,
    inventoryManager: ReturnType<typeof getInventoryManager>
  ): void {
    switch (itemType) {
      case 'SHIELD':
        inventoryManager.addItem('MAGIC_SHIELD');
        break;
      case 'BLUE_CANDLE':
        inventoryManager.addItem('BLUE_CANDLE');
        break;
      case 'BOMB':
        inventoryManager.addBomb();
        break;
      case 'BLUE_RING':
        inventoryManager.addItem('BLUE_RING');
        break;
      case 'HEART_CONTAINER':
        inventoryManager.addHeartContainer();
        break;
      case 'FOOD':
        inventoryManager.addItem('FOOD');
        break;
      case 'BOW':
        inventoryManager.addItem('BOW');
        break;
      case 'ARROW':
        inventoryManager.addItem('ARROW');
        break;
      case 'KEY':
        inventoryManager.addKey();
        break;
      default:
        console.log(`Unknown shop item: ${itemType}`);
    }
  }

  /**
   * Load a dungeon room's tiles into the world manager
   */
  private loadDungeonRoom(room: ReturnType<typeof getDungeonRoom>): void {
    if (!room) return;

    const dungeonManager = getDungeonManager();
    const col = room.roomCol;
    const row = room.roomRow;

    // Get updated tiles with current door states
    const updatedTiles = dungeonManager.getUpdatedTiles();
    const tiles: TileData[] = updatedTiles
      ? updatedTiles.map(t => ({
          tileId: t.tileId,
          collision: t.collision as TileData['collision'],
        }))
      : room.tiles;

    // Register the room as a screen and load it
    this.worldManager.registerScreen(col, row, { tiles });
    this.worldManager.loadScreen(col, row);
  }

  /**
   * Spawn enemies for a dungeon room
   */
  private spawnDungeonRoomEnemies(room: ReturnType<typeof getDungeonRoom>): void {
    if (!room) return;

    const entityManager = getEntityManager();
    const dungeonManager = getDungeonManager();

    // Don't spawn enemies if room is already cleared
    if (dungeonManager.isRoomCleared()) {
      // But still spawn items that don't require kill all
      this.spawnDungeonRoomItems();
      return;
    }

    for (const spawn of room.enemySpawns) {
      entityManager.queueEnemySpawn({
        archetypeId: spawn.archetypeId,
        x: spawn.x,
        y: spawn.y,
        spawnDelay: spawn.spawnDelay,
      });
    }

    this.setupEnemyBehaviors();

    // Spawn items that don't require kill all (like Triforce in its room)
    this.spawnDungeonRoomItems();
  }

  // Track if boss has been defeated in current room
  private bossDefeatedInRoom: boolean = false;
  private defeatedBossPosition: { x: number; y: number } | null = null;

  /**
   * Handle dungeon-specific gameplay (room transitions, locked doors, shutter doors)
   */
  private handleDungeonGameplay(
    player: ReturnType<typeof getPlayer>,
    entityManager: ReturnType<typeof getEntityManager>,
    inventoryManager: ReturnType<typeof getInventoryManager>
  ): void {
    const dungeonManager = getDungeonManager();
    const audioManager = getAudioManager();
    const room = dungeonManager.getCurrentRoomData();

    // Check for boss defeat in boss room
    if (room && room.roomType === 'BOSS' && !this.bossDefeatedInRoom) {
      this.checkBossDefeat(entityManager, dungeonManager, audioManager);
    }

    // Check for shutter doors - if all enemies are defeated, open them
    const activeEnemies = entityManager.getKillCounterEnemyCount();
    if (activeEnemies === 0 && !dungeonManager.isRoomCleared()) {
      dungeonManager.markRoomCleared();

      // Reload the room tiles with updated door states
      if (room) {
        this.loadDungeonRoom(room);
      }

      // Spawn dungeon room items that require clearing the room
      this.spawnDungeonRoomItems();

      // Play door open sound
      audioManager.playSfx('secret_reveal');

      // If boss was defeated, spawn Triforce piece
      if (this.bossDefeatedInRoom && this.defeatedBossPosition) {
        this.spawnTriforceFromBoss();
      }
    }

    // Check if player is near a locked door and has a key
    const lockedDoorDir = dungeonManager.getLockedDoorAtPlayer(player.getHitbox());
    if (lockedDoorDir && inventoryManager.getKeys() > 0) {
      // Player is at a locked door with a key - use the key
      if (dungeonManager.tryUnlockDoor(lockedDoorDir)) {
        inventoryManager.useKey();

        // Reload the room tiles with updated door states
        if (room) {
          this.loadDungeonRoom(room);
        }

        // Play unlock sound
        audioManager.playSfx('secret_reveal');
      }
    }

    // Check for dungeon item pickups
    this.checkDungeonItemPickups(player, entityManager, inventoryManager);

    // Check for room transitions
    const transitionInfo = dungeonManager.checkRoomTransition(player.getHitbox());
    if (transitionInfo && transitionInfo.doorState === 'OPEN') {
      this.handleDungeonRoomTransition(transitionInfo);
    }

    // Check for dungeon exit (stairs in entrance room)
    if (dungeonManager.isOnStairs(player.getHitbox())) {
      if (room && room.roomType === 'ENTRANCE') {
        this.exitDungeon();
      }
    }
  }

  /**
   * Check if boss has been defeated and handle boss death
   */
  private checkBossDefeat(
    entityManager: ReturnType<typeof getEntityManager>,
    dungeonManager: ReturnType<typeof getDungeonManager>,
    audioManager: ReturnType<typeof getAudioManager>
  ): void {
    const enemies = entityManager.getEnemies();

    // Find any dying boss
    for (const enemy of enemies) {
      if (enemy instanceof Boss && enemy.state === 'DYING' && !this.dyingEnemies.has(enemy.id)) {
        // Boss is dying for the first time
        this.dyingEnemies.add(enemy.id);
        this.bossDefeatedInRoom = true;
        this.defeatedBossPosition = { x: enemy.x + 8, y: enemy.y + 16 }; // Center of boss

        // Mark boss as defeated in dungeon progress
        dungeonManager.markBossDefeated();

        // Play boss defeat fanfare
        audioManager.playSfx('secret_reveal');

        console.log('Boss defeated!');
      }
    }
  }

  /**
   * Spawn Triforce piece after boss defeat
   */
  private spawnTriforceFromBoss(): void {
    if (!this.defeatedBossPosition) return;

    const entityManager = getEntityManager();

    // Spawn Triforce piece at boss death location
    entityManager.spawnItem(
      this.defeatedBossPosition.x,
      this.defeatedBossPosition.y,
      'TRIFORCE_PIECE'
    );

    console.log('Triforce piece spawned at boss death location!');

    // Clear the position so we don't spawn multiple times
    this.defeatedBossPosition = null;
  }

  // Track dungeon items spawned in current room
  private spawnedDungeonItems: Set<number> = new Set();

  /**
   * Spawn dungeon room items (MAP, COMPASS, KEY, etc.) after room is cleared
   */
  private spawnDungeonRoomItems(): void {
    const dungeonManager = getDungeonManager();
    const entityManager = getEntityManager();

    const uncollectedItems = dungeonManager.getUncollectedRoomItems();

    for (const item of uncollectedItems) {
      // Skip if already spawned this session
      if (this.spawnedDungeonItems.has(item.index)) continue;

      // Mark as spawned
      this.spawnedDungeonItems.add(item.index);

      // Spawn the item
      entityManager.spawnItem(item.x, item.y, item.itemType);
      console.log(`Spawned dungeon item: ${item.itemType} at (${item.x}, ${item.y})`);
    }
  }

  /**
   * Check for dungeon item pickups (MAP, COMPASS, KEY, TRIFORCE_PIECE)
   */
  private checkDungeonItemPickups(
    player: ReturnType<typeof getPlayer>,
    entityManager: ReturnType<typeof getEntityManager>,
    inventoryManager: ReturnType<typeof getInventoryManager>
  ): void {
    const dungeonManager = getDungeonManager();
    const playerHitbox = player.getHitbox();

    // Get all items and check for collection
    const items = entityManager.getItems();
    for (const item of items) {
      if (!item.active || ('collected' in item && item.collected)) continue;

      // Get item hitbox
      const itemHitbox = {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      };

      // Check overlap
      if (
        playerHitbox.x < itemHitbox.x + itemHitbox.width &&
        playerHitbox.x + playerHitbox.width > itemHitbox.x &&
        playerHitbox.y < itemHitbox.y + itemHitbox.height &&
        playerHitbox.y + playerHitbox.height > itemHitbox.y
      ) {
        // Get item type
        const itemType = ('itemType' in item) ? (item.itemType as string) : '';

        // Handle dungeon-specific items
        if (itemType === 'MAP' || itemType === 'COMPASS') {
          // Collect dungeon item
          dungeonManager.collectDungeonItem(itemType);

          // Mark room item as collected
          const room = dungeonManager.getCurrentRoom();
          const roomItems = dungeonManager.getUncollectedRoomItems();
          const matchingItem = roomItems.find(ri =>
            ri.itemType === itemType && ri.x === item.x && ri.y === item.y
          );
          if (matchingItem) {
            dungeonManager.markRoomItemCollected(room.col, room.row, matchingItem.index);
          }

          // Mark item as collected
          if ('collect' in item && typeof item.collect === 'function') {
            item.collect();
          }
          item.active = false;

          // Play pickup sound
          const audioManager = getAudioManager();
          audioManager.playSfx('item_pickup_small');

          // Trigger item pickup phase for major items
          this.pendingItemPickup = { itemType, x: item.x, y: item.y };
          this.gameStateManager.setPhase('ITEM_PICKUP');
          return;
        }

        if (itemType === 'KEY') {
          // Add key to inventory
          inventoryManager.addKey();

          // Mark room item as collected
          const room = dungeonManager.getCurrentRoom();
          const roomItems = dungeonManager.getUncollectedRoomItems();
          const matchingItem = roomItems.find(ri =>
            ri.itemType === itemType && ri.x === item.x && ri.y === item.y
          );
          if (matchingItem) {
            dungeonManager.markRoomItemCollected(room.col, room.row, matchingItem.index);
          }

          // Mark item as collected
          if ('collect' in item && typeof item.collect === 'function') {
            item.collect();
          }
          item.active = false;

          // Play pickup sound
          const audioManager = getAudioManager();
          audioManager.playSfx('item_pickup_small');
          console.log('Collected dungeon key');
        }

        if (itemType === 'TRIFORCE_PIECE') {
          // Collect Triforce piece
          dungeonManager.collectDungeonItem(itemType);

          // Mark room item as collected
          const room = dungeonManager.getCurrentRoom();
          const roomItems = dungeonManager.getUncollectedRoomItems();
          const matchingItem = roomItems.find(ri =>
            ri.itemType === itemType && ri.x === item.x && ri.y === item.y
          );
          if (matchingItem) {
            dungeonManager.markRoomItemCollected(room.col, room.row, matchingItem.index);
          }

          // Mark item as collected
          if ('collect' in item && typeof item.collect === 'function') {
            item.collect();
          }
          item.active = false;

          // Play fanfare
          const audioManager = getAudioManager();
          audioManager.playSfx('secret_reveal');

          // Trigger item pickup phase
          this.pendingItemPickup = { itemType, x: item.x, y: item.y };
          this.gameStateManager.setPhase('ITEM_PICKUP');
          return;
        }
      }
    }
  }

  // Pending item pickup for ITEM_PICKUP phase
  private pendingItemPickup: { itemType: string; x: number; y: number } | null = null;
  private itemPickupTimer: number = 0;

  /**
   * Handle transitioning between dungeon rooms
   */
  private handleDungeonRoomTransition(transitionInfo: {
    direction: string;
    fromRoom: { col: number; row: number };
    toRoom: { col: number; row: number };
    doorState: string;
  }): void {
    const dungeonManager = getDungeonManager();
    const dungeonId = dungeonManager.getCurrentDungeonId();
    if (dungeonId === null) return;

    const direction = transitionInfo.direction as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
    const { toRoom } = transitionInfo;

    // Perform the transition
    const newRoom = dungeonManager.transitionToRoom(direction, toRoom.col, toRoom.row);
    if (!newRoom) return;

    // Load new room tiles
    this.loadDungeonRoom(newRoom);

    // Clear and spawn enemies for new room
    const entityManager = getEntityManager();
    entityManager.clearEnemies();
    entityManager.clearProjectiles();
    entityManager.clearItems();
    this.dyingEnemies.clear();

    // Clear sword beam, boomerang, and bomb tracking
    this.activeSwordBeam = null;
    this.activeBoomerang = null;
    this.activeBombs.clear();
    this.activeCandleFlame = null;
    this.usedBlueCandleThisScreen = false;

    // Reset boss tracking for new room
    this.bossDefeatedInRoom = false;
    this.defeatedBossPosition = null;

    // Clear spawned items tracking for new room
    this.spawnedDungeonItems.clear();

    this.spawnDungeonRoomEnemies(newRoom);

    // Position player at opposite edge
    const player = getPlayer();
    const spawnPos = dungeonManager.getSpawnPositionForDirection(direction);
    player.setPosition(spawnPos.x, spawnPos.y);
  }

  /**
   * Exit dungeon and return to overworld
   */
  private exitDungeon(): void {
    const dungeonManager = getDungeonManager();
    const dungeon = dungeonManager.getCurrentDungeon();
    if (!dungeon) return;

    // Get overworld entrance location
    const overworldCol = dungeon.overworldEntranceCol;
    const overworldRow = dungeon.overworldEntranceRow;

    // Exit dungeon
    dungeonManager.exitDungeon();

    // Set context back to overworld
    this.worldManager.setContext('OVERWORLD');

    // Load the overworld screen
    this.worldManager.loadScreen(overworldCol, overworldRow);

    // Position player near the dungeon entrance
    const player = getPlayer();
    player.setPosition(120, 96); // Just below the stairs

    // Clear and spawn overworld enemies
    const entityManager = getEntityManager();
    entityManager.clearEnemies();
    entityManager.clearProjectiles();
    entityManager.clearItems();
    this.dyingEnemies.clear();

    // Clear sword beam, boomerang, and bomb tracking
    this.activeSwordBeam = null;
    this.activeBoomerang = null;
    this.activeBombs.clear();
    this.activeCandleFlame = null;
    this.usedBlueCandleThisScreen = false;

    this.spawnScreenEnemies(overworldCol, overworldRow);

    console.log('Exited dungeon to overworld');
  }

  /**
   * Update pause screen
   */
  private updatePause(input: InputSnapshot): void {
    const pauseScreen = getPauseScreen();
    const inventoryManager = getInventoryManager();
    const dungeonManager = getDungeonManager();

    // Build pause screen data
    const pauseData: PauseScreenData = {
      inventory: inventoryManager.getInventory(),
      currentHP: inventoryManager.getCurrentHP(),
      heartContainers: inventoryManager.getHeartContainers(),
      currentScreen: {
        col: this.worldManager.getCurrentScreenCol(),
        row: this.worldManager.getCurrentScreenRow(),
      },
      visitedScreens: this.visitedScreens,
      triforcePieces: this.getTriforceCount(),
      isDungeon: this.worldManager.getContext() === 'DUNGEON',
    };

    // Add dungeon map data if in dungeon
    if (pauseData.isDungeon) {
      pauseData.dungeonMap = dungeonManager.getDungeonMapData() ?? undefined;
    }

    const result = pauseScreen.update(input, pauseData);

    // Handle phase transition
    if (result.nextPhase) {
      this.gameStateManager.setPhase(result.nextPhase);
    }

    // Handle B-item selection change
    if (result.selectedBItem !== undefined) {
      inventoryManager.setSelectedBItem(result.selectedBItem);
    }
  }

  /**
   * Get total Triforce pieces collected
   */
  private getTriforceCount(): number {
    const progressionManager = getProgressionManager();
    return progressionManager.getTriforceCount();
  }

  /**
   * Get NPC sprites for cave rendering
   */
  private getCaveNpcSprites(caveManager: ReturnType<typeof getCaveManager>): SpriteRenderCommand[] {
    const cave = caveManager.getCurrentCave();
    if (!cave || !cave.npc) return [];

    const sprites: SpriteRenderCommand[] = [];

    // Map NPC type to sprite key
    let spriteKey = 'npc_old_man';
    if (cave.npc.type === 'MERCHANT') {
      spriteKey = 'npc_merchant';
    } else if (cave.npc.type === 'OLD_WOMAN') {
      spriteKey = 'npc_old_woman';
    }

    sprites.push({
      spriteKey,
      x: cave.npc.x - 8, // Center the sprite
      y: cave.npc.y - 8,
      flipX: false,
      flipY: false,
      priority: 3,
      visible: true,
    });

    // If shop, add shop item sprites
    if (cave.shopItems) {
      const slotPositions = [
        { x: 64, y: 72 },
        { x: 120, y: 72 },
        { x: 176, y: 72 },
      ];

      for (const shopItem of cave.shopItems) {
        const pos = slotPositions[shopItem.slotPosition];
        if (!pos) continue;

        const itemSpriteKey = this.getShopItemSpriteKey(shopItem.itemType);
        sprites.push({
          spriteKey: itemSpriteKey,
          x: pos.x - 4,
          y: pos.y - 4,
          flipX: false,
          flipY: false,
          priority: 3,
          visible: true,
        });
      }
    }

    // If NPC gives item and hasn't given it yet, show item above NPC
    if (cave.npc.givesItem && !caveManager.hasCollectedCaveItem(cave.caveId)) {
      const itemSpriteKey = this.getCaveItemSpriteKey(cave.npc.givesItem);
      sprites.push({
        spriteKey: itemSpriteKey,
        x: cave.npc.x - 4,
        y: cave.npc.y - 24, // Above NPC
        flipX: false,
        flipY: false,
        priority: 4,
        visible: true,
      });
    }

    return sprites;
  }

  /**
   * Map shop item type to sprite key
   */
  private getShopItemSpriteKey(itemType: string): string {
    switch (itemType) {
      case 'SHIELD':
        return 'item_key'; // Placeholder
      case 'BLUE_CANDLE':
        return 'item_bomb'; // Placeholder
      case 'BOMB':
        return 'item_bomb';
      case 'BLUE_RING':
        return 'item_rupee_blue';
      case 'HEART_CONTAINER':
        return 'item_heart_container';
      case 'FOOD':
        return 'item_heart'; // Placeholder
      case 'BOW':
        return 'item_key'; // Placeholder
      case 'ARROW':
        return 'item_key'; // Placeholder
      case 'KEY':
        return 'item_key';
      default:
        return 'item_rupee_green';
    }
  }

  /**
   * Map cave item type to sprite key
   */
  private getCaveItemSpriteKey(itemType: string): string {
    switch (itemType) {
      case 'WOODEN_SWORD':
      case 'WHITE_SWORD':
      case 'MAGICAL_SWORD':
        return 'sword_down';
      case 'BOOMERANG':
        return 'projectile_boomerang';
      default:
        return 'item_triforce';
    }
  }

  /**
   * Render cave UI (dialogue, shop prices, cursor)
   */
  private renderCaveUI(
    caveManager: ReturnType<typeof getCaveManager>,
    inventoryManager: ReturnType<typeof getInventoryManager>
  ): void {
    if (!this.renderer) return;

    const ctx = this.renderer.getContext();
    const cave = caveManager.getCurrentCave();
    if (!cave) return;

    // Render NPC dialogue
    if (cave.npc) {
      const dialogue = cave.npc.dialogue[0]?.text;
      if (dialogue) {
        this.renderDialogueBox(ctx, dialogue);
      }
    }

    // Render shop UI
    if (cave.caveType === 'SHOP' && cave.shopItems) {
      this.renderShopUI(ctx, cave.shopItems, caveManager.getSelectedShopSlot(), inventoryManager.getRupees());
    }
  }

  /**
   * Render dialogue text box
   */
  private renderDialogueBox(ctx: CanvasRenderingContext2D, text: string): void {
    const boxX = 24;
    const boxY = 88; // Below NPC, above exit
    const boxWidth = 208;
    const boxHeight = 32;

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX + 1, boxY + 1, boxWidth - 2, boxHeight - 2);

    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Handle multi-line text
    const lines = text.split('\n');
    let lineY = boxY + 6;
    for (const line of lines) {
      ctx.fillText(line, boxX + 8, lineY);
      lineY += 12;
    }

    // Reset text alignment
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Render shop UI with prices and cursor
   */
  private renderShopUI(
    ctx: CanvasRenderingContext2D,
    shopItems: { itemType: string; price: number; slotPosition: number }[],
    selectedSlot: number,
    playerRupees: number
  ): void {
    const slotPositions = [
      { x: 64, y: 72 },
      { x: 120, y: 72 },
      { x: 176, y: 72 },
    ];

    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const item of shopItems) {
      const pos = slotPositions[item.slotPosition];
      if (!pos) continue;

      // Price
      const canAfford = playerRupees >= item.price;
      ctx.fillStyle = canAfford ? '#FFFFFF' : '#FF0000';
      ctx.fillText(`${item.price}`, pos.x, pos.y + 16);

      // Cursor indicator
      if (item.slotPosition === selectedSlot) {
        // Blinking cursor
        if (Math.floor(this.gameStateManager.frameCounter / 15) % 2 === 0) {
          ctx.fillStyle = '#FFFF00';
          ctx.fillText('▲', pos.x, pos.y + 28);
        }
      }
    }

    // Reset text alignment
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Update transition phase (stub)
   */
  private updateTransition(_input: InputSnapshot): void {
    // Screen transition animation - not implemented yet
  }

  /**
   * Update death phase
   * Plays death animation then transitions to continue screen
   */
  private updateDeath(_input: InputSnapshot): void {
    const player = getPlayer();
    player.update(1); // deltaFrame = 1 for fixed timestep

    // When death animation completes (player.active becomes false), go to continue screen
    if (!player.active) {
      // Reset continue screen for fresh state
      const continueScreen = getContinueScreen();
      continueScreen.reset();
      this.gameStateManager.setPhase('CONTINUE_SCREEN');
    }
  }

  /**
   * Update continue screen
   * Handles Continue/Save&Quit options
   */
  private updateContinueScreen(input: InputSnapshot): void {
    const continueScreen = getContinueScreen();
    const result = continueScreen.update(input);

    if (result.nextPhase && result.action) {
      if (result.action === 'CONTINUE') {
        // Continue from current progress - respawn player with 3 hearts
        // Increment death count for save file
        if (this.currentSaveSlot >= 0) {
          const saveSystem = getSaveSystem();
          saveSystem.incrementDeathCount(this.currentSaveSlot);
        }
        this.respawnPlayer();
        this.gameStateManager.setPhase('GAMEPLAY');
      } else if (result.action === 'SAVE_QUIT') {
        // Save progress and return to title
        this.saveCurrentGame();
        this.gameStateManager.setPhase('TITLE');
        // Reset title screen for fresh start
        const titleScreen = getTitleScreen();
        titleScreen.reset();
      }
    }
  }

  /**
   * Save the current game state to the active save slot
   */
  private saveCurrentGame(): void {
    if (this.currentSaveSlot < 0) {
      // No save slot selected, nothing to save
      return;
    }

    const saveSystem = getSaveSystem();
    const inventoryManager = getInventoryManager();
    const existingFile = saveSystem.load(this.currentSaveSlot);

    if (!existingFile) {
      // No existing file, can't save
      return;
    }

    // Increment death count for the save
    const newDeathCount = existingFile.deathCount + 1;

    // Build visited screens array
    const visitedScreensArray = Array.from(this.visitedScreens);

    // Update save with current state
    saveSystem.updateSave(this.currentSaveSlot, {
      deathCount: newDeathCount,
      heartContainers: inventoryManager.getHeartContainers(),
      inventory: inventoryManager.getInventory(),
      killCounter: this.killCounter,
      overworld: {
        ...existingFile.overworld,
        visitedScreens: visitedScreensArray,
      },
    });

    console.log(`Game saved to slot ${this.currentSaveSlot}`);
  }

  /**
   * Try to spawn a sword beam projectile if conditions are met
   * - Player must be at full HP
   * - No active sword beam must exist
   * - Player must have a sword
   */
  private trySpawnSwordBeam(
    player: ReturnType<typeof getPlayer>,
    inventoryManager: ReturnType<typeof getInventoryManager>,
    entityManager: ReturnType<typeof getEntityManager>
  ): void {
    // Check conditions for spawning sword beam
    // 1. Player must have a sword (level > 0)
    const swordLevel = inventoryManager.getSwordLevel();
    if (swordLevel === 0) {
      return;
    }

    // 2. Player must be at full HP
    if (!inventoryManager.isAtFullHP()) {
      return;
    }

    // 3. No active sword beam can exist
    if (this.activeSwordBeam && this.activeSwordBeam.active) {
      return;
    }

    // Calculate spawn position based on player position and facing direction
    const direction = player.facingDirection;
    let spawnX = player.x + 8; // Center of sprite
    let spawnY = player.y + 8;

    // Offset spawn position based on facing direction
    switch (direction) {
      case 'UP':
        spawnY = player.y - 8;
        spawnX = player.x + 4;
        break;
      case 'DOWN':
        spawnY = player.y + 16;
        spawnX = player.x + 4;
        break;
      case 'LEFT':
        spawnX = player.x - 8;
        spawnY = player.y + 4;
        break;
      case 'RIGHT':
        spawnX = player.x + 16;
        spawnY = player.y + 4;
        break;
    }

    // Create the sword beam projectile
    const beam = new Projectile(
      spawnX,
      spawnY,
      direction,
      'SWORD_BEAM',
      'PLAYER'
    );

    // Set tile collision checker so beam stops at walls
    beam.setTileCollisionChecker((hitbox) => this.worldManager.checkCollision(hitbox));

    // Spawn the beam through entity manager
    entityManager.addProjectile(beam);

    // Track as active sword beam
    this.activeSwordBeam = beam;

    // Play sword sound effect (slash sound covers both melee and beam)
    const audioManager = getAudioManager();
    audioManager.playSfx('sword_slash');
  }

  /**
   * Try to use the currently selected B-item
   */
  private tryUseBItem(
    player: ReturnType<typeof getPlayer>,
    inventoryManager: ReturnType<typeof getInventoryManager>,
    entityManager: ReturnType<typeof getEntityManager>
  ): void {
    const selectedBItem = inventoryManager.getSelectedBItem();
    if (!selectedBItem) {
      return;
    }

    // Check if player can use B-item (not attacking, dying, etc.)
    if (!player.canAttack()) {
      return;
    }

    // Determine if we can spawn a projectile (for items that need it)
    const canSpawnBoomerang = !this.activeBoomerang || !this.activeBoomerang.active;

    // For candle, check if it's a blue candle and already used this screen
    let canSpawnFlame = !this.activeCandleFlame || !this.activeCandleFlame.active;
    if (selectedBItem === 'CANDLE') {
      const inventory = inventoryManager.getInventory();
      if (inventory.candleType === 'blue' && this.usedBlueCandleThisScreen) {
        canSpawnFlame = false;
      }
    }

    // Use the B-item
    const result = useBItem(selectedBItem, {
      playerX: player.x,
      playerY: player.y,
      playerDirection: player.facingDirection,
      canSpawnProjectile: selectedBItem === 'CANDLE' ? canSpawnFlame : canSpawnBoomerang,
      inventoryManager,
    });

    if (!result.success) {
      return;
    }

    // Handle spawned projectile
    if (result.spawnProjectile) {
      const { type, x, y, direction, isMagic } = result.spawnProjectile;

      if (type === 'BOOMERANG') {
        // Create and track boomerang
        const boomerang = new Boomerang(x, y, direction, isMagic ?? false);
        boomerang.setPlayerProvider({
          getX: () => player.x,
          getY: () => player.y,
        });

        entityManager.addProjectile(boomerang);
        this.activeBoomerang = boomerang;

        // Play throw sound
        const audioManager = getAudioManager();
        audioManager.playSfx('sword_slash'); // TODO: Add boomerang throw sound
      } else if (type === 'BOMB') {
        // Create and track bomb
        const bomb = new Bomb(x, y, direction);

        entityManager.addProjectile(bomb);
        this.activeBombs.add(bomb);

        // Play bomb place sound (use a different sound or none)
        const audioManager = getAudioManager();
        audioManager.playSfx('item_pickup_small');
      } else if (type === 'CANDLE_FLAME') {
        // Create and track candle flame
        const flame = new CandleFlame(x, y, direction);

        // Set collision checker for burning bushes
        flame.setCollisionChecker((hitbox) => {
          // Check if the tile at the flame's position is a bush or solid
          const centerX = hitbox.x + hitbox.width / 2;
          const centerY = hitbox.y + hitbox.height / 2;
          const tileX = Math.floor(centerX / 16);
          const tileY = Math.floor(centerY / 16);

          // Get tile collision
          const blocked = this.worldManager.checkCollision(hitbox);

          // Check if tile is a bush (BUSH collision type)
          // For now, we'll just check if it's blocked but not solid
          // TODO: Implement proper bush detection and burning
          const canBurn = false; // Placeholder - would check for BUSH tile type

          return { blocked, canBurn, tileX, tileY };
        });

        entityManager.addProjectile(flame);
        this.activeCandleFlame = flame;

        // Mark blue candle as used for this screen
        const inventory = inventoryManager.getInventory();
        if (inventory.candleType === 'blue') {
          this.usedBlueCandleThisScreen = true;
        }

        // Play flame sound
        const audioManager = getAudioManager();
        audioManager.playSfx('sword_slash'); // TODO: Add flame sound
      }
      // TODO: Handle other B-item projectiles (arrows, magic rod)
    }

    // TODO: Handle other B-item effects (recorder, food, potion)
  }

  /**
   * Respawn player after death with 3 hearts
   * Keeps inventory progress but restores HP
   */
  private respawnPlayer(): void {
    const player = getPlayer();
    const inventoryManager = getInventoryManager();

    // Get current screen position for respawn
    const screenCol = this.worldManager.getCurrentScreenCol();
    const screenRow = this.worldManager.getCurrentScreenRow();

    // Reset player state but keep position at screen start
    player.reset(120, 88, CONTINUE_HP);
    player.setCollisionChecker((hitbox) => this.worldManager.checkCollision(hitbox));

    // Sync HP with inventory manager (CONTINUE_HP = 6 = 3 hearts)
    inventoryManager.setCurrentHP(CONTINUE_HP);

    // Clear all entities and respawn enemies for current screen
    const entityManager = getEntityManager();
    entityManager.clearEnemies();
    entityManager.clearProjectiles();
    entityManager.clearItems();
    this.dyingEnemies.clear();

    // Clear sword beam, boomerang, and bomb tracking
    this.activeSwordBeam = null;
    this.activeBoomerang = null;
    this.activeBombs.clear();
    this.activeCandleFlame = null;
    this.usedBlueCandleThisScreen = false;

    // Re-register entity factories (in case they were cleared)
    this.setupEntityFactories();

    // Respawn enemies for the current screen
    this.spawnScreenEnemies(screenCol, screenRow);

    console.log('Player respawned with 3 hearts');
  }

  // Item pickup display duration in frames
  private static readonly ITEM_PICKUP_DURATION = 120; // 2 seconds at 60fps

  /**
   * Update item pickup phase
   * Shows the item above Link's head for a duration
   */
  private updateItemPickup(_input: InputSnapshot): void {
    // Increment timer
    this.itemPickupTimer++;

    // Check if duration complete
    if (this.itemPickupTimer >= Game.ITEM_PICKUP_DURATION) {
      // Return to gameplay
      this.gameStateManager.setPhase('GAMEPLAY');
      this.pendingItemPickup = null;
      this.itemPickupTimer = 0;
    }
  }

  /**
   * Render the current frame
   */
  private render(): void {
    if (!this.renderer || !this.hudRenderer) return;

    const phase = this.gameStateManager.phase;

    // Render based on phase
    switch (phase) {
      case 'TITLE':
        this.renderTitle();
        break;
      case 'FILE_SELECT':
        this.renderFileSelect();
        break;
      case 'GAMEPLAY':
      case 'PAUSE':
        this.renderGameplay();
        break;
      case 'TRANSITION':
        this.renderTransition();
        break;
      case 'DEATH':
        this.renderDeath();
        break;
      case 'CONTINUE_SCREEN':
        this.renderContinueScreen();
        break;
      case 'ITEM_PICKUP':
        this.renderItemPickup();
        break;
      default:
        this.renderer.clear();
        break;
    }
  }

  /**
   * Render title screen
   */
  private renderTitle(): void {
    if (!this.renderer) return;
    const titleScreen = getTitleScreen();
    titleScreen.render(this.renderer.getContext());
  }

  /**
   * Render file select screen
   */
  private renderFileSelect(): void {
    if (!this.renderer) return;
    const fileSelectScreen = getFileSelectScreen();
    fileSelectScreen.render(this.renderer.getContext());
  }

  /**
   * Render gameplay
   */
  private renderGameplay(): void {
    if (!this.renderer || !this.hudRenderer) return;

    const player = getPlayer();
    const entityManager = getEntityManager();
    const inventoryManager = getInventoryManager();

    // Build sprite list
    const sprites: SpriteRenderCommand[] = [];

    // Add player sprites
    const playerSprites = player.getSpriteCommands();
    sprites.push(...playerSprites);

    // Add entity sprites
    const entitySprites = entityManager.getSpriteCommands();
    sprites.push(...entitySprites);

    // Add NPC sprites if in cave
    const caveManager = getCaveManager();
    if (caveManager.isInCave()) {
      const caveNpcSprites = this.getCaveNpcSprites(caveManager);
      sprites.push(...caveNpcSprites);
    }

    // Determine render context
    const worldContext = this.worldManager.getContext();
    let renderContext: 'overworld' | 'dungeon' | 'cave' = 'overworld';
    if (worldContext === 'DUNGEON') {
      renderContext = 'dungeon';
    } else if (worldContext === 'CAVE') {
      renderContext = 'cave';
    }

    // Build render frame
    const frame: RenderFrame = {
      tiles: this.worldManager.getCurrentTileIds(),
      sprites,
      context: renderContext,
    };

    // Render main frame
    this.renderer.render(frame);

    // Render cave dialogue/shop UI if in cave
    if (caveManager.isInCave() && this.renderer) {
      this.renderCaveUI(caveManager, inventoryManager);
    }

    // Render HUD
    const hudData = createHudData(
      inventoryManager.getInventory(),
      inventoryManager.getCurrentHP(),
      inventoryManager.getHeartContainers(),
      {
        col: this.worldManager.getCurrentScreenCol(),
        row: this.worldManager.getCurrentScreenRow(),
      },
      {
        frameCounter: this.gameStateManager.frameCounter,
        isDungeon: this.worldManager.getContext() === 'DUNGEON',
      }
    );
    this.hudRenderer.render(hudData);

    // If paused, render pause screen (inventory/map display)
    if (this.gameStateManager.phase === 'PAUSE') {
      const pauseScreen = getPauseScreen();
      const dungeonManager = getDungeonManager();

      if (this.assets) {
        pauseScreen.setAssets(this.assets);
      }

      const pauseData: PauseScreenData = {
        inventory: inventoryManager.getInventory(),
        currentHP: inventoryManager.getCurrentHP(),
        heartContainers: inventoryManager.getHeartContainers(),
        currentScreen: {
          col: this.worldManager.getCurrentScreenCol(),
          row: this.worldManager.getCurrentScreenRow(),
        },
        visitedScreens: this.visitedScreens,
        triforcePieces: this.getTriforceCount(),
        isDungeon: this.worldManager.getContext() === 'DUNGEON',
      };

      // Add dungeon map data if in dungeon
      if (pauseData.isDungeon) {
        pauseData.dungeonMap = dungeonManager.getDungeonMapData() ?? undefined;
      }

      pauseScreen.render(this.renderer.getContext(), pauseData);
    }
  }

  /**
   * Render transition (stub)
   */
  private renderTransition(): void {
    this.renderGameplay();
  }

  /**
   * Render death phase
   */
  private renderDeath(): void {
    this.renderGameplay();
  }

  /**
   * Render continue screen
   */
  private renderContinueScreen(): void {
    if (!this.renderer) return;
    const continueScreen = getContinueScreen();
    continueScreen.render(this.renderer.getContext());
  }

  /**
   * Render item pickup phase
   * Shows Link holding the item above his head
   */
  private renderItemPickup(): void {
    if (!this.renderer || !this.hudRenderer || !this.assets) {
      this.renderGameplay();
      return;
    }

    const player = getPlayer();
    const entityManager = getEntityManager();
    const inventoryManager = getInventoryManager();

    // Build sprite list without player walking animation
    const sprites: SpriteRenderCommand[] = [];

    // Add player holding item (use a specific sprite)
    sprites.push({
      spriteKey: 'link_down_1', // Standing pose
      x: player.x,
      y: player.y,
      flipX: false,
      flipY: false,
      priority: 4,
      visible: true,
    });

    // Add the collected item above Link's head
    if (this.pendingItemPickup) {
      const itemSpriteKey = this.getItemSpriteKey(this.pendingItemPickup.itemType);
      sprites.push({
        spriteKey: itemSpriteKey,
        x: player.x + 4, // Center above link
        y: player.y - 16, // Above link's head
        flipX: false,
        flipY: false,
        priority: 5,
        visible: true,
      });
    }

    // Add entity sprites (enemies, etc.)
    const entitySprites = entityManager.getSpriteCommands();
    sprites.push(...entitySprites);

    // Build render frame
    const frame: RenderFrame = {
      tiles: this.worldManager.getCurrentTileIds(),
      sprites,
      isDungeon: this.worldManager.getContext() === 'DUNGEON',
    };

    // Render main frame
    this.renderer.render(frame);

    // Render HUD
    const hudData = createHudData(
      inventoryManager.getInventory(),
      inventoryManager.getCurrentHP(),
      inventoryManager.getHeartContainers(),
      {
        col: this.worldManager.getCurrentScreenCol(),
        row: this.worldManager.getCurrentScreenRow(),
      },
      {
        frameCounter: this.gameStateManager.frameCounter,
        isDungeon: this.worldManager.getContext() === 'DUNGEON',
      }
    );
    this.hudRenderer.render(hudData);

    // Draw item name text
    if (this.pendingItemPickup) {
      const ctx = this.renderer.getContext();
      const itemName = this.getItemDisplayName(this.pendingItemPickup.itemType);

      // Draw text below the play area
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(itemName, 128, 200);
      ctx.textAlign = 'left';
    }
  }

  /**
   * Get sprite key for an item type
   */
  private getItemSpriteKey(itemType: string): string {
    const spriteMap: Record<string, string> = {
      'MAP': 'item_key', // Placeholder
      'COMPASS': 'item_key', // Placeholder
      'KEY': 'item_key',
      'TRIFORCE_PIECE': 'item_triforce',
      'HEART_CONTAINER': 'item_heart_container',
    };
    return spriteMap[itemType] ?? 'item_heart';
  }

  /**
   * Get display name for an item type
   */
  private getItemDisplayName(itemType: string): string {
    const nameMap: Record<string, string> = {
      'MAP': 'YOU GOT THE MAP!',
      'COMPASS': 'YOU GOT THE COMPASS!',
      'KEY': 'YOU GOT A KEY!',
      'TRIFORCE_PIECE': 'YOU GOT A TRIFORCE!',
      'HEART_CONTAINER': 'HEART CONTAINER!',
    };
    return nameMap[itemType] ?? 'ITEM GET!';
  }
}

// ===== BOOTSTRAP =====

// Create game instance
const game = new Game();

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    game.init();
    game.start();
  });
} else {
  // DOM already loaded
  game.init();
  game.start();
}

// Export for debugging
declare global {
  interface Window {
    __zeldaGame: Game;
  }
}
window.__zeldaGame = game;

export { Game };
