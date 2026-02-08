# US-008: Final One-Shot PRD — Legend of Zelda (NES) TypeScript Rebuild

This document is the complete, self-contained PRD for generating a playable NES Legend of Zelda clone in a single implementation pass. Every system, file, schema, and runtime behavior is specified deterministically below. An implementation agent should be able to produce the full codebase from this document alone, with no open-ended decisions remaining.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack and Build Pipeline](#2-technology-stack-and-build-pipeline)
3. [File and Module Layout](#3-file-and-module-layout)
4. [Runtime Game Loop](#4-runtime-game-loop)
5. [Module Specifications](#5-module-specifications)
   - 5.1 [Entry Point and Bootstrap](#51-entry-point-and-bootstrap)
   - 5.2 [Game Loop and Frame Timing](#52-game-loop-and-frame-timing)
   - 5.3 [Input System](#53-input-system)
   - 5.4 [Game State Manager](#54-game-state-manager)
   - 5.5 [World and Map System](#55-world-and-map-system)
   - 5.6 [Entity System](#56-entity-system)
   - 5.7 [Player (Link) Module](#57-player-link-module)
   - 5.8 [Enemy System](#58-enemy-system)
   - 5.9 [Combat and Damage System](#59-combat-and-damage-system)
   - 5.10 [Collision System](#510-collision-system)
   - 5.11 [Rendering System](#511-rendering-system)
   - 5.12 [Animation System](#512-animation-system)
   - 5.13 [HUD Renderer](#513-hud-renderer)
   - 5.14 [Screen Transition System](#514-screen-transition-system)
   - 5.15 [Audio System](#515-audio-system)
   - 5.16 [Inventory and Item System](#516-inventory-and-item-system)
   - 5.17 [Save/Load System](#517-saveload-system)
   - 5.18 [Progression System](#518-progression-system)
   - 5.19 [Title Screen and Menus](#519-title-screen-and-menus)
6. [Data Schemas (Consolidated)](#6-data-schemas-consolidated)
7. [Data Files](#7-data-files)
8. [Asset Pipeline](#8-asset-pipeline)
9. [Cross-Cutting Concerns](#9-cross-cutting-concerns)
10. [Implementation Order](#10-implementation-order)
11. [Verification Criteria](#11-verification-criteria)

---

## 1. Project Overview

### Goal

Produce a browser-based TypeScript recreation of the NES Legend of Zelda (1986) that boots, renders the overworld, allows combat, and supports completing at least Dungeon 1 — all from a single implementation pass of this PRD.

### Constraints

- **Local execution only** — no server, no backend.
- **TypeScript** — strict mode, no `any` unless interfacing with browser APIs.
- **No copyrighted assets** — all tilesets, sprites, and audio are generated or placeholder stubs.
- **Browser Canvas + Web Audio** — no third-party game engines or rendering libraries.
- **NES-faithful mechanics** — pixel dimensions, timing, and game logic match the original.

### Non-Goals

- Multiplayer
- Modern Zelda mechanics
- High-resolution graphics
- Full 128-screen overworld data (stub most screens; fully implement 9 screens around start + Dungeon 1 area)
- Full Second Quest data (structure only; data stubs)
- Complete music composition (structure + placeholder melodies)

---

## 2. Technology Stack and Build Pipeline

### Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript 5.x (strict) | Type safety, IDE support |
| Bundler | Vite | Fast dev server, native TS support, zero-config |
| Rendering | `<canvas>` 2D Context | NES-style tile/sprite blitting |
| Audio | Web Audio API | NES APU approximation via OscillatorNode |
| Storage | localStorage | Save file persistence |
| Testing | Vitest | Vite-native, fast |
| Linting | ESLint + typescript-eslint | Code quality |

### Package.json Scripts

```json
{
  "name": "zelda-nes-ts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0"
  }
}
```

### TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "declaration": false,
    "jsx": "preserve",
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

### Vite Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'ES2022',
  },
  server: {
    port: 3000,
  },
});
```

### HTML Entry

```html
<!-- index.html (project root) -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Legend of Zelda</title>
  <style>
    body {
      margin: 0;
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      overflow: hidden;
    }
    canvas {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

---

## 3. File and Module Layout

```
zelda-nes-ts/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── public/
│   └── (empty — all assets generated at runtime or embedded)
├── src/
│   ├── main.ts                          # Entry point: bootstrap game
│   ├── constants.ts                     # All numeric/string constants
│   ├── types.ts                         # Shared type definitions
│   │
│   ├── core/
│   │   ├── GameLoop.ts                  # Fixed-timestep game loop
│   │   ├── GameStateManager.ts          # Phase transitions, runtime state
│   │   └── EventBus.ts                  # Simple pub/sub for game events
│   │
│   ├── input/
│   │   ├── InputSystem.ts               # Keyboard polling, snapshot generation
│   │   ├── DirectionStack.ts            # Direction priority resolution
│   │   └── InputMapping.ts              # Key-to-button mapping config
│   │
│   ├── world/
│   │   ├── WorldManager.ts              # Screen loading, transitions
│   │   ├── TileMap.ts                   # Tile data access, collision queries
│   │   └── ScreenTransition.ts          # Scroll/fade/wipe transition logic
│   │
│   ├── entities/
│   │   ├── Entity.ts                    # Base entity interface
│   │   ├── EntityManager.ts             # Entity lifecycle, per-frame updates
│   │   ├── Player.ts                    # Link: movement, state machine, actions
│   │   ├── Enemy.ts                     # Enemy instance: state machine, AI
│   │   ├── Projectile.ts               # Projectile entity (player + enemy)
│   │   ├── ItemDrop.ts                  # Dropped item entity (hearts, rupees)
│   │   └── BladeTrap.ts                # Blade trap special entity
│   │
│   ├── combat/
│   │   ├── DamageSystem.ts              # Damage calculation, application
│   │   ├── CollisionDetection.ts        # AABB overlap, tile collision
│   │   ├── Knockback.ts                 # Knockback state processing
│   │   └── ShieldBlock.ts              # Shield blocking logic
│   │
│   ├── rendering/
│   │   ├── Renderer.ts                  # Main render pipeline orchestrator
│   │   ├── TileRenderer.ts              # Background tile layer
│   │   ├── SpriteRenderer.ts            # Sprite drawing with priority sorting
│   │   ├── HudRenderer.ts              # HUD overlay (hearts, minimap, counters)
│   │   ├── EffectRenderer.ts            # Screen flash, fade, transitions
│   │   └── SpriteFlicker.ts            # NES 8-sprites-per-scanline emulation
│   │
│   ├── animation/
│   │   ├── AnimationSystem.ts           # Animation playback, frame advancement
│   │   └── AnimationData.ts             # All animation definitions
│   │
│   ├── audio/
│   │   ├── AudioManager.ts              # Public API: playSfx, playMusic, etc.
│   │   ├── AudioContext.ts              # Web Audio bootstrap, channel management
│   │   ├── SfxPlayer.ts                # SFX playback with priority arbitration
│   │   ├── MusicPlayer.ts              # Music track sequencing
│   │   └── ToneGenerator.ts            # Pulse wave, triangle, noise synthesis
│   │
│   ├── inventory/
│   │   ├── InventoryManager.ts          # Item collection, B-item selection
│   │   └── ItemEffects.ts              # Per-item use logic
│   │
│   ├── progression/
│   │   ├── SaveSystem.ts                # localStorage save/load, validation
│   │   ├── ProgressionManager.ts        # Triforce tracking, gates, completion
│   │   └── DungeonState.ts             # Per-dungeon room/door/boss tracking
│   │
│   ├── screens/
│   │   ├── TitleScreen.ts               # Title screen rendering and input
│   │   ├── FileSelectScreen.ts          # File select, register, eliminate
│   │   ├── PauseScreen.ts              # Inventory/pause overlay
│   │   ├── ContinueScreen.ts           # Death continue/save/retry screen
│   │   └── EndingScreen.ts             # Credits and ending sequence
│   │
│   ├── data/
│   │   ├── overworldData.ts             # Overworld screen definitions (128 screens, most stubbed)
│   │   ├── dungeonData.ts               # Dungeon room definitions (dungeon 1 full, rest stubbed)
│   │   ├── caveData.ts                  # Cave room definitions
│   │   ├── enemyArchetypes.ts           # All enemy archetype definitions
│   │   ├── itemData.ts                  # Item metadata (costs, effects)
│   │   ├── sfxData.ts                   # Sound effect definitions
│   │   ├── musicData.ts                 # Music track definitions
│   │   └── tilesetData.ts              # Tileset metadata + procedural generation
│   │
│   ├── assets/
│   │   └── AssetGenerator.ts            # Runtime procedural tileset/sprite generation
│   │
│   └── utils/
│       ├── PRNG.ts                      # Deterministic pseudo-random number generator
│       ├── math.ts                      # Clamp, lerp, AABB overlap
│       └── debug.ts                     # Optional debug overlay/logging
│
└── tests/
    ├── input.test.ts
    ├── collision.test.ts
    ├── damage.test.ts
    ├── player.test.ts
    ├── enemy.test.ts
    ├── saveSystem.test.ts
    └── gameLoop.test.ts
```

### Module Dependency Graph (Direction: depends-on)

```
main.ts
  → core/GameLoop
  → core/GameStateManager
  → input/InputSystem
  → rendering/Renderer
  → audio/AudioManager
  → screens/*

core/GameLoop
  → core/GameStateManager (reads phase)
  → input/InputSystem (polls input)
  → entities/EntityManager (updates entities)
  → combat/DamageSystem (processes hits)
  → combat/CollisionDetection (checks overlaps)
  → rendering/Renderer (draws frame)
  → audio/AudioManager (updates audio)

entities/Player
  → input/InputSystem (reads snapshot)
  → combat/DamageSystem (sword hitbox)
  → inventory/InventoryManager (B-item)
  → animation/AnimationSystem (plays anims)

entities/Enemy
  → data/enemyArchetypes (reads config)
  → utils/PRNG (movement decisions)
  → combat/DamageSystem (contact damage)

world/WorldManager
  → data/overworldData
  → data/dungeonData
  → data/caveData
  → world/TileMap
  → world/ScreenTransition

rendering/Renderer
  → rendering/TileRenderer
  → rendering/SpriteRenderer
  → rendering/HudRenderer
  → rendering/EffectRenderer
```

### Import Rules

- All cross-module imports use relative paths.
- `types.ts` and `constants.ts` are the only files importable from anywhere.
- `data/*` files export pure data objects — no logic, no side effects.
- Circular dependencies are forbidden. The dependency graph above is a DAG.

---

## 4. Runtime Game Loop

The game runs a **fixed-timestep loop** at 60 FPS. Each frame executes the following steps in exact order:

```typescript
// Pseudocode for the main game loop (GameLoop.ts)

function gameLoopTick(): void {
  // 1. Poll input — produce frozen InputSnapshot for this frame
  const input = inputSystem.poll();

  // 2. Process game phase transitions
  gameStateManager.processPhaseTransitions(input);

  // 3. Branch on current phase
  switch (gameStateManager.phase) {
    case 'TITLE':
      titleScreen.update(input);
      titleScreen.render(renderer);
      break;

    case 'FILE_SELECT':
      fileSelectScreen.update(input);
      fileSelectScreen.render(renderer);
      break;

    case 'GAMEPLAY':
      // 3a. Update player (reads input, processes state machine)
      player.update(input);

      // 3b. Update all enemies (AI, movement, attacks)
      entityManager.updateEnemies();

      // 3c. Update all projectiles (movement, lifetime)
      entityManager.updateProjectiles();

      // 3d. Update item drops (bobbing animation, despawn timer)
      entityManager.updateItemDrops();

      // 3e. Process collisions
      collisionSystem.checkPlayerEnemyCollisions();
      collisionSystem.checkPlayerProjectileCollisions();
      collisionSystem.checkPlayerItemCollisions();
      collisionSystem.checkPlayerWeaponEnemyCollisions();

      // 3f. Process damage events (queued by collision system)
      damageSystem.processQueue();

      // 3g. Check screen exit / transition triggers
      worldManager.checkScreenTransition(player);

      // 3h. Render frame
      renderer.renderFrame();

      // 3i. Update audio
      audioManager.update();

      // 3j. Advance frame counter
      gameStateManager.frameCounter++;
      break;

    case 'PAUSE':
      pauseScreen.update(input);
      renderer.renderFrame(); // render gameplay underneath
      pauseScreen.render(renderer); // overlay pause screen
      break;

    case 'TRANSITION':
      screenTransition.update();
      screenTransition.render(renderer);
      if (screenTransition.isComplete()) {
        worldManager.finalizeTransition();
        gameStateManager.setPhase('GAMEPLAY');
      }
      break;

    case 'DEATH':
      deathSequence.update();
      deathSequence.render(renderer);
      if (deathSequence.isComplete()) {
        gameStateManager.setPhase('CONTINUE_SCREEN');
      }
      break;

    case 'CONTINUE_SCREEN':
      continueScreen.update(input);
      continueScreen.render(renderer);
      break;

    case 'ITEM_PICKUP':
      itemPickupSequence.update();
      itemPickupSequence.render(renderer);
      if (itemPickupSequence.isComplete()) {
        gameStateManager.setPhase('GAMEPLAY');
      }
      break;

    case 'TEXT_DISPLAY':
      textDisplay.update(input);
      textDisplay.render(renderer);
      break;

    case 'ENDING':
      endingScreen.update(input);
      endingScreen.render(renderer);
      break;
  }
}
```

### Frame Timing Implementation

```typescript
// GameLoop.ts

const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS; // 16.667ms
const MAX_FRAME_SKIP = 3;

let lastTimestamp = 0;
let accumulator = 0;

function startLoop(): void {
  lastTimestamp = performance.now();
  requestAnimationFrame(loop);
}

function loop(timestamp: number): void {
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  accumulator += delta;

  let framesProcessed = 0;
  while (accumulator >= FRAME_DURATION && framesProcessed < MAX_FRAME_SKIP) {
    gameLoopTick();
    accumulator -= FRAME_DURATION;
    framesProcessed++;
  }

  // If we're too far behind, discard accumulated time
  if (accumulator > FRAME_DURATION * MAX_FRAME_SKIP) {
    accumulator = 0;
  }

  requestAnimationFrame(loop);
}
```

---

## 5. Module Specifications

### 5.1 Entry Point and Bootstrap

**File**: `src/main.ts`

```typescript
// main.ts — Bootstrap sequence

function main(): void {
  // 1. Get canvas and create 2D context
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  canvas.width = 256;
  canvas.height = 240;
  canvas.style.width = `${256 * 3}px`;
  canvas.style.height = `${240 * 3}px`;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingEnabled = false;

  // 2. Generate placeholder assets
  const assets = AssetGenerator.generate();

  // 3. Initialize systems (order matters)
  const inputSystem = new InputSystem();
  const audioManager = new AudioManager();
  const renderer = new Renderer(ctx, assets);
  const gameStateManager = new GameStateManager();
  const worldManager = new WorldManager();
  const entityManager = new EntityManager();
  const collisionSystem = new CollisionSystem();
  const damageSystem = new DamageSystem();
  const saveSystem = new SaveSystem();
  const progressionManager = new ProgressionManager();

  // 4. Wire systems together
  const gameLoop = new GameLoop({
    inputSystem,
    audioManager,
    renderer,
    gameStateManager,
    worldManager,
    entityManager,
    collisionSystem,
    damageSystem,
    saveSystem,
    progressionManager,
  });

  // 5. Start on title screen
  gameStateManager.setPhase('TITLE');

  // 6. Start game loop
  gameLoop.start();
}

document.addEventListener('DOMContentLoaded', main);
```

### 5.2 Game Loop and Frame Timing

**File**: `src/core/GameLoop.ts`

See Section 4 above. The `GameLoop` class owns the `requestAnimationFrame` loop and delegates to the game state manager for phase-specific updates.

Key behaviors:
- Fixed 60 FPS timestep (16.667ms per frame)
- Maximum 3 frame skip to prevent spiral of death
- All game systems read from the same `InputSnapshot` per frame
- Frame counter increments exactly once per logical tick

### 5.3 Input System

**File**: `src/input/InputSystem.ts`, `src/input/DirectionStack.ts`, `src/input/InputMapping.ts`

Refer to **specs/input-and-control-mapping.md** for full specification. Key implementation points:

```typescript
// InputSystem.ts

class InputSystem {
  private keysHeld: Set<string> = new Set();
  private previousButtons: Record<NesButton, boolean>;
  private directionStack: DirectionStack = new DirectionStack();
  private facingDirection: Direction = 'DOWN';
  private mapping: InputMapping;
  private frameNumber: number = 0;

  constructor() {
    this.mapping = { ...DEFAULT_INPUT_MAPPING };
    this.previousButtons = createEmptyButtonRecord();
    this.registerEventListeners();
  }

  poll(): InputSnapshot {
    this.frameNumber++;
    const currentButtons = this.mapKeysToButtons();
    const snapshot: InputSnapshot = {
      buttons: {} as Record<NesButton, ButtonState>,
      activeDirection: this.directionStack.current(),
      facingDirection: this.facingDirection,
      frameNumber: this.frameNumber,
    };

    for (const button of NES_BUTTONS) {
      const held = currentButtons[button];
      const wasHeld = this.previousButtons[button];
      snapshot.buttons[button] = {
        held,
        justPressed: held && !wasHeld,
        justReleased: !held && wasHeld,
      };
    }

    if (snapshot.activeDirection !== null) {
      this.facingDirection = snapshot.activeDirection;
      snapshot.facingDirection = this.facingDirection;
    }

    this.previousButtons = currentButtons;
    return snapshot;
  }

  private registerEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return; // Ignore browser key repeat
      if (this.isMappedKey(e.code)) e.preventDefault();
      this.keysHeld.add(e.code);
      // Update direction stack for direction keys
      const dir = this.keyToDirection(e.code);
      if (dir) this.directionStack.push(dir);
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
      const dir = this.keyToDirection(e.code);
      if (dir) this.directionStack.remove(dir);
    });

    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.directionStack.clear();
      // Auto-pause handled by GameStateManager via EventBus
    });
  }
}
```

```typescript
// DirectionStack.ts

class DirectionStack {
  private stack: Direction[] = [];

  push(dir: Direction): void {
    this.remove(dir); // prevent duplicates
    this.stack.push(dir);
  }

  remove(dir: Direction): void {
    this.stack = this.stack.filter(d => d !== dir);
  }

  current(): Direction | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1]! : null;
  }

  clear(): void {
    this.stack = [];
  }
}
```

### 5.4 Game State Manager

**File**: `src/core/GameStateManager.ts`

```typescript
type GamePhase =
  | 'TITLE'
  | 'FILE_SELECT'
  | 'GAMEPLAY'
  | 'PAUSE'
  | 'TRANSITION'
  | 'DEATH'
  | 'CONTINUE_SCREEN'
  | 'ITEM_PICKUP'
  | 'TEXT_DISPLAY'
  | 'ENDING';

class GameStateManager {
  phase: GamePhase = 'TITLE';
  frameCounter: number = 0;
  private previousPhase: GamePhase = 'TITLE';

  setPhase(newPhase: GamePhase): void {
    this.previousPhase = this.phase;
    this.phase = newPhase;
  }

  getPreviousPhase(): GamePhase {
    return this.previousPhase;
  }

  processPhaseTransitions(input: InputSnapshot): void {
    // Handle Start button for pause toggle
    if (this.phase === 'GAMEPLAY' && input.buttons.START.justPressed) {
      this.setPhase('PAUSE');
      return;
    }
    if (this.phase === 'PAUSE' && input.buttons.START.justPressed) {
      this.setPhase('GAMEPLAY');
      return;
    }
  }
}
```

### 5.5 World and Map System

**File**: `src/world/WorldManager.ts`, `src/world/TileMap.ts`, `src/world/ScreenTransition.ts`

Refer to **specs/world-and-map-representation.md** for full data schemas.

```typescript
// WorldManager.ts

class WorldManager {
  currentContext: MapContext = 'OVERWORLD';
  currentScreenCol: number = 7;
  currentScreenRow: number = 7;
  currentDungeonIndex: number | null = null;
  tileMap: TileMap;

  constructor() {
    this.tileMap = new TileMap();
  }

  loadScreen(col: number, row: number): void {
    const screenData = this.getScreenData(col, row);
    this.tileMap.load(screenData.tiles);
    this.currentScreenCol = col;
    this.currentScreenRow = row;
  }

  checkScreenTransition(player: Player): TransitionRequest | null {
    const pos = player.getPosition();
    // Check if player has walked off any edge
    if (pos.x < 0) return { direction: 'LEFT', targetCol: this.currentScreenCol - 1, targetRow: this.currentScreenRow };
    if (pos.x > 240) return { direction: 'RIGHT', targetCol: this.currentScreenCol + 1, targetRow: this.currentScreenRow };
    if (pos.y < 0) return { direction: 'UP', targetCol: this.currentScreenCol, targetRow: this.currentScreenRow - 1 };
    if (pos.y > 160) return { direction: 'DOWN', targetCol: this.currentScreenCol, targetRow: this.currentScreenRow + 1 };
    return null;
  }

  // Tile collision query
  isTileSolid(pixelX: number, pixelY: number): boolean {
    return this.tileMap.getCollisionAt(pixelX, pixelY) === 'SOLID';
  }

  getTileCollision(pixelX: number, pixelY: number): TileCollision {
    return this.tileMap.getCollisionAt(pixelX, pixelY);
  }
}
```

```typescript
// TileMap.ts

class TileMap {
  private tiles: TileData[] = []; // 176 entries (16x11)

  load(tileData: TileData[]): void {
    this.tiles = tileData;
  }

  getTileAt(col: number, row: number): TileData | undefined {
    if (col < 0 || col > 15 || row < 0 || row > 10) return undefined;
    return this.tiles[row * 16 + col];
  }

  getCollisionAt(pixelX: number, pixelY: number): TileCollision {
    const col = Math.floor(pixelX / 16);
    const row = Math.floor(pixelY / 16);
    const tile = this.getTileAt(col, row);
    return tile?.collision ?? 'SOLID'; // Out of bounds = solid
  }
}
```

```typescript
// ScreenTransition.ts — handles scroll, fade, and wipe transitions

class ScreenTransition {
  type: TransitionType;
  direction: Direction;
  progress: number = 0;
  totalFrames: number;
  speed: number = 4; // pixels per frame

  constructor(type: TransitionType, direction: Direction) {
    this.type = type;
    this.direction = direction;
    this.totalFrames = this.computeTotalFrames();
  }

  update(): void {
    this.progress++;
  }

  isComplete(): boolean {
    return this.progress >= this.totalFrames;
  }

  getScrollOffset(): number {
    return this.progress * this.speed;
  }

  private computeTotalFrames(): number {
    switch (this.type) {
      case 'SCROLL_HORIZONTAL': return 64;  // 256px / 4px per frame
      case 'SCROLL_VERTICAL': return 44;    // 176px / 4px per frame
      case 'FADE_DUNGEON': return 9;        // 4 fade-out + 1 load + 4 fade-in
      case 'COLUMN_WIPE': return 33;        // 16 close + 1 load + 16 open
      default: return 1;
    }
  }
}
```

### 5.6 Entity System

**File**: `src/entities/Entity.ts`, `src/entities/EntityManager.ts`

```typescript
// Entity.ts — base interface for all game entities

interface Entity {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  spriteKey: string;
  spritePriority: SpritePriority;
  flipX: boolean;
  flipY: boolean;
  visible: boolean;

  update(): void;
  getHitbox(): AABB;
}

interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

```typescript
// EntityManager.ts

class EntityManager {
  private nextId: number = 0;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private itemDrops: ItemDrop[] = [];

  spawnEnemy(archetype: EnemyArchetype, x: number, y: number): Enemy {
    const enemy = new Enemy(this.nextId++, archetype, x, y);
    this.enemies.push(enemy);
    return enemy;
  }

  spawnProjectile(config: ProjectileConfig): Projectile {
    const proj = new Projectile(this.nextId++, config);
    this.projectiles.push(proj);
    return proj;
  }

  spawnItemDrop(item: DropItem, x: number, y: number): ItemDrop {
    const drop = new ItemDrop(this.nextId++, item, x, y);
    this.itemDrops.push(drop);
    return drop;
  }

  updateEnemies(): void {
    for (const enemy of this.enemies) {
      if (enemy.active) enemy.update();
    }
    this.enemies = this.enemies.filter(e => e.active);
  }

  updateProjectiles(): void {
    for (const proj of this.projectiles) {
      if (proj.active) proj.update();
    }
    this.projectiles = this.projectiles.filter(p => p.active);
  }

  updateItemDrops(): void {
    for (const drop of this.itemDrops) {
      if (drop.active) drop.update();
    }
    this.itemDrops = this.itemDrops.filter(d => d.active);
  }

  clearAll(): void {
    this.enemies = [];
    this.projectiles = [];
    this.itemDrops = [];
  }

  getActiveEnemies(): readonly Enemy[] {
    return this.enemies;
  }

  getActiveProjectiles(): readonly Projectile[] {
    return this.projectiles;
  }

  getActiveItemDrops(): readonly ItemDrop[] {
    return this.itemDrops;
  }

  getActiveEnemyCount(): number {
    return this.enemies.filter(e => e.active && e.state !== 'DYING').length;
  }
}
```

### 5.7 Player (Link) Module

**File**: `src/entities/Player.ts`

Refer to **specs/core-game-systems.md** and **specs/input-and-control-mapping.md**.

```typescript
type PlayerState =
  | 'IDLE'
  | 'WALKING'
  | 'ATTACKING'
  | 'USING_ITEM'
  | 'KNOCKBACK'
  | 'INVINCIBLE'
  | 'DYING';

class Player implements Entity {
  // Position (sub-pixel precision: stored as 16ths of a pixel)
  private subX: number;
  private subY: number;

  // Derived pixel position
  get x(): number { return Math.floor(this.subX / 16); }
  get y(): number { return Math.floor(this.subY / 16); }

  state: PlayerState = 'IDLE';
  facing: Direction = 'DOWN';
  currentHP: number = 6; // 3 hearts = 6 half-hearts
  maxHP: number = 6;

  // Dimensions
  readonly width = 16;
  readonly height = 16;
  readonly collisionBox: AABB = { x: 4, y: 8, width: 8, height: 8 }; // feet area

  // State timers
  private stateTimer: number = 0;
  private invincibilityFrames: number = 0;
  private knockbackDirection: Direction = 'DOWN';
  private attackFrameCount: number = 0;

  // Constants
  private readonly MOVE_SPEED = 24; // 1.5 pixels/frame in sub-pixels (1.5 * 16)
  private readonly KNOCKBACK_DISTANCE = 16;
  private readonly KNOCKBACK_FRAMES = 16;
  private readonly INVINCIBILITY_DURATION = 60;
  private readonly ATTACK_DURATION = 12;

  // Sword hitbox (active during attack)
  swordHitboxActive: boolean = false;

  update(input: InputSnapshot): void {
    // Decrement invincibility
    if (this.invincibilityFrames > 0) {
      this.invincibilityFrames--;
      // Toggle visibility every 4 frames for flash effect
      this.visible = (this.invincibilityFrames % 8) < 4;
      if (this.invincibilityFrames === 0) {
        this.visible = true;
        if (this.state === 'INVINCIBLE') this.state = 'IDLE';
      }
    }

    switch (this.state) {
      case 'IDLE':
      case 'WALKING':
      case 'INVINCIBLE':
        this.handleMovement(input);
        this.handleActions(input);
        break;

      case 'ATTACKING':
        this.updateAttack();
        break;

      case 'USING_ITEM':
        this.updateItemUse();
        break;

      case 'KNOCKBACK':
        this.updateKnockback();
        break;

      case 'DYING':
        this.updateDeath();
        break;
    }
  }

  private handleMovement(input: InputSnapshot): void {
    if (input.activeDirection === null) {
      if (this.state === 'WALKING') this.state = 'IDLE';
      return;
    }

    this.facing = input.activeDirection;
    this.state = this.invincibilityFrames > 0 ? 'INVINCIBLE' : 'WALKING';

    // Compute new position
    let newSubX = this.subX;
    let newSubY = this.subY;

    switch (input.activeDirection) {
      case 'UP':    newSubY -= this.MOVE_SPEED; break;
      case 'DOWN':  newSubY += this.MOVE_SPEED; break;
      case 'LEFT':  newSubX -= this.MOVE_SPEED; break;
      case 'RIGHT': newSubX += this.MOVE_SPEED; break;
    }

    // Grid snap on perpendicular axis (snap to 8px = 128 sub-pixels)
    if (input.activeDirection === 'UP' || input.activeDirection === 'DOWN') {
      newSubX = Math.round(newSubX / 128) * 128;
    } else {
      newSubY = Math.round(newSubY / 128) * 128;
    }

    // Collision check (delegated to collision system)
    // If collision, don't update position
    // Actual collision check happens via WorldManager.isTileSolid()
    this.subX = newSubX;
    this.subY = newSubY;
  }

  private handleActions(input: InputSnapshot): void {
    if (input.buttons.A.justPressed && this.canAttack()) {
      this.startAttack();
    }
    if (input.buttons.B.justPressed && this.canUseItem()) {
      this.startItemUse();
    }
  }

  takeDamage(amount: number, fromDirection: Direction): void {
    if (this.invincibilityFrames > 0 || this.state === 'DYING') return;

    this.currentHP = Math.max(0, this.currentHP - amount);

    if (this.currentHP <= 0) {
      this.state = 'DYING';
      this.stateTimer = 80; // death animation frames
      return;
    }

    // Start knockback
    this.state = 'KNOCKBACK';
    this.knockbackDirection = oppositeDirection(fromDirection);
    this.stateTimer = this.KNOCKBACK_FRAMES;
    this.invincibilityFrames = this.KNOCKBACK_FRAMES + this.INVINCIBILITY_DURATION;
  }

  getSwordHitbox(): AABB | null {
    if (!this.swordHitboxActive) return null;
    // Position sword hitbox adjacent to Link in facing direction
    switch (this.facing) {
      case 'UP':    return { x: this.x, y: this.y - 16, width: 16, height: 8 };
      case 'DOWN':  return { x: this.x, y: this.y + 16, width: 16, height: 8 };
      case 'LEFT':  return { x: this.x - 16, y: this.y, width: 8, height: 16 };
      case 'RIGHT': return { x: this.x + 16, y: this.y, width: 8, height: 16 };
    }
  }

  getWorldHitbox(): AABB {
    return {
      x: this.x + this.collisionBox.x,
      y: this.y + this.collisionBox.y,
      width: this.collisionBox.width,
      height: this.collisionBox.height,
    };
  }
}
```

### 5.8 Enemy System

**File**: `src/entities/Enemy.ts`

Refer to **specs/enemy-and-ai-behavior.md** for full archetype definitions and behavior tables.

```typescript
type EnemyState =
  | 'SPAWNING' | 'ACTIVE' | 'STUNNED' | 'KNOCKBACK'
  | 'DAMAGED' | 'DYING' | 'SUBMERGED' | 'INVISIBLE';

class Enemy implements Entity {
  id: number;
  x: number;
  y: number;
  active: boolean = true;
  visible: boolean = true;
  state: EnemyState = 'SPAWNING';

  readonly archetype: EnemyArchetype;
  hp: number;
  facing: Direction = 'DOWN';
  stateTimer: number = 0;
  attackCooldown: number = 0;
  invincibilityFrames: number = 0;
  private rng: PRNG;

  // Movement state
  private moveTimer: number = 0;
  private moveDirection: Direction = 'DOWN';
  private pauseTimer: number = 0;

  constructor(id: number, archetype: EnemyArchetype, x: number, y: number) {
    this.id = id;
    this.archetype = archetype;
    this.x = x;
    this.y = y;
    this.hp = archetype.hp;
    this.rng = new PRNG(id); // Seeded by entity ID for reproducibility

    // Set initial spawn timer
    this.stateTimer = 8; // spawn animation frames
    this.attackCooldown = this.randomCooldown();
  }

  update(): void {
    if (this.invincibilityFrames > 0) this.invincibilityFrames--;

    switch (this.state) {
      case 'SPAWNING':
        this.stateTimer--;
        if (this.stateTimer <= 0) this.state = 'ACTIVE';
        break;

      case 'ACTIVE':
        this.updateMovement();
        this.updateAttack();
        break;

      case 'STUNNED':
        this.stateTimer--;
        if (this.stateTimer <= 0) this.state = 'ACTIVE';
        break;

      case 'KNOCKBACK':
        this.updateKnockback();
        break;

      case 'DYING':
        this.stateTimer--;
        if (this.stateTimer <= 0) this.active = false;
        break;

      case 'SUBMERGED':
        this.stateTimer--;
        this.visible = false;
        if (this.stateTimer <= 0) {
          this.state = 'ACTIVE';
          this.visible = true;
        }
        break;

      case 'INVISIBLE':
        this.stateTimer--;
        this.visible = false;
        if (this.stateTimer <= 0) {
          this.state = 'ACTIVE';
          this.visible = true;
        }
        break;
    }
  }

  takeDamage(amount: number, fromDirection: Direction, weaponType: PlayerWeaponType): void {
    if (this.invincibilityFrames > 0) return;

    // Check vulnerability
    const multiplier = this.getVulnerabilityMultiplier(weaponType);
    if (multiplier === 0) return;

    const finalDamage = Math.floor(amount * multiplier);
    this.hp -= finalDamage;

    if (this.hp <= 0) {
      this.state = 'DYING';
      this.stateTimer = 12; // death puff animation
      return;
    }

    // Knockback
    if (this.archetype.knockbackable) {
      this.state = 'KNOCKBACK';
      this.moveDirection = oppositeDirection(fromDirection);
      this.stateTimer = 8;
    }

    // Boss invincibility frames
    this.invincibilityFrames = this.archetype.countsTowardLimit ? 0 : 8;
  }

  stun(duration: number): void {
    if (!this.archetype.boomerangStunnable) return;
    this.state = 'STUNNED';
    this.stateTimer = duration;
  }

  private updateMovement(): void {
    // Delegate to pattern-specific logic based on archetype.movementPattern.type
    const pattern = this.archetype.movementPattern;
    switch (pattern.type) {
      case 'RANDOM_WALK': this.moveRandomWalk(pattern); break;
      case 'CHASE': this.moveChase(pattern); break;
      case 'HOP': this.moveHop(pattern); break;
      case 'FLY': this.moveFly(pattern); break;
      case 'EMERGE': this.moveEmerge(pattern); break;
      case 'STATIONARY': this.moveStationary(pattern); break;
      case 'DASH': this.moveDash(pattern); break;
      case 'TELEPORT': this.moveTeleport(pattern); break;
      // ... other patterns
    }
  }

  private updateAttack(): void {
    if (!this.archetype.attackPattern) return;
    this.attackCooldown--;
    if (this.attackCooldown <= 0) {
      this.executeAttack();
      this.attackCooldown = this.randomCooldown();
    }
  }

  getHitbox(): AABB {
    return {
      x: this.x + this.archetype.hitbox.offsetX,
      y: this.y + this.archetype.hitbox.offsetY,
      width: this.archetype.hitbox.width,
      height: this.archetype.hitbox.height,
    };
  }
}
```

### 5.9 Combat and Damage System

**File**: `src/combat/DamageSystem.ts`

Refer to **specs/core-game-systems.md** (combat section) and **specs/enemy-and-ai-behavior.md** (damage rules).

```typescript
interface DamageEvent {
  target: 'PLAYER' | 'ENEMY';
  targetEntity: Player | Enemy;
  source: 'CONTACT' | 'PROJECTILE' | 'SWORD' | 'ITEM';
  rawDamage: number;
  direction: Direction;
  weaponType?: PlayerWeaponType;
}

class DamageSystem {
  private queue: DamageEvent[] = [];

  queueDamage(event: DamageEvent): void {
    this.queue.push(event);
  }

  processQueue(): void {
    for (const event of this.queue) {
      if (event.target === 'PLAYER') {
        this.applyPlayerDamage(event);
      } else {
        this.applyEnemyDamage(event);
      }
    }
    this.queue = [];
  }

  private applyPlayerDamage(event: DamageEvent): void {
    const player = event.targetEntity as Player;
    const inventory = InventoryManager.getInventory();

    // Defense reduction
    let defenseMultiplier = 1.0;
    if (inventory.ringLevel === 1) defenseMultiplier = 0.5;
    if (inventory.ringLevel === 2) defenseMultiplier = 0.25;

    const finalDamage = Math.max(1, Math.floor(event.rawDamage * defenseMultiplier));
    player.takeDamage(finalDamage, event.direction);
  }

  private applyEnemyDamage(event: DamageEvent): void {
    const enemy = event.targetEntity as Enemy;
    const weaponType = event.weaponType ?? 'WOODEN_SWORD';

    // Darknut directional shielding check
    if (enemy.archetype.baseType === 'DARKNUT') {
      if (event.direction === enemy.facing) return; // front is shielded
    }

    enemy.takeDamage(event.rawDamage, event.direction, weaponType);
  }
}
```

### 5.10 Collision System

**File**: `src/combat/CollisionDetection.ts`

```typescript
class CollisionSystem {
  checkPlayerEnemyCollisions(player: Player, enemies: readonly Enemy[]): void {
    const playerBox = player.getWorldHitbox();
    for (const enemy of enemies) {
      if (enemy.state !== 'ACTIVE' || !enemy.active) continue;
      const enemyBox = enemy.getHitbox();
      if (aabbOverlap(playerBox, enemyBox)) {
        damageSystem.queueDamage({
          target: 'PLAYER',
          targetEntity: player,
          source: 'CONTACT',
          rawDamage: enemy.archetype.contactDamage,
          direction: directionFromTo(enemy, player),
        });
      }
    }
  }

  checkPlayerWeaponEnemyCollisions(player: Player, enemies: readonly Enemy[]): void {
    const swordBox = player.getSwordHitbox();
    if (!swordBox) return;
    for (const enemy of enemies) {
      if (enemy.state === 'DYING' || !enemy.active) continue;
      const enemyBox = enemy.getHitbox();
      if (aabbOverlap(swordBox, enemyBox)) {
        damageSystem.queueDamage({
          target: 'ENEMY',
          targetEntity: enemy,
          source: 'SWORD',
          rawDamage: getSwordDamage(inventory.swordLevel),
          direction: player.facing,
          weaponType: getSwordWeaponType(inventory.swordLevel),
        });
      }
    }
  }

  checkPlayerProjectileCollisions(
    player: Player,
    projectiles: readonly Projectile[]
  ): void {
    const playerBox = player.getWorldHitbox();
    for (const proj of projectiles) {
      if (!proj.active || proj.isPlayerProjectile) continue;
      const projBox = proj.getHitbox();
      if (aabbOverlap(playerBox, projBox)) {
        // Shield block check
        if (proj.blockableByShield && isShieldBlocking(player, proj)) {
          proj.active = false;
          audioManager.playSfx('shield_block');
          continue;
        }
        damageSystem.queueDamage({
          target: 'PLAYER',
          targetEntity: player,
          source: 'PROJECTILE',
          rawDamage: proj.damage,
          direction: proj.travelDirection,
        });
        proj.active = false;
      }
    }
  }

  checkPlayerItemCollisions(player: Player, items: readonly ItemDrop[]): void {
    const playerBox = player.getWorldHitbox();
    for (const item of items) {
      if (!item.active) continue;
      const itemBox = item.getHitbox();
      if (aabbOverlap(playerBox, itemBox)) {
        collectItem(item);
        item.active = false;
      }
    }
  }
}

// AABB overlap utility
function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
```

### 5.11 Rendering System

**File**: `src/rendering/Renderer.ts`, `src/rendering/TileRenderer.ts`, `src/rendering/SpriteRenderer.ts`

Refer to **specs/rendering-and-animation.md** for full specification.

```typescript
// Renderer.ts — Main render pipeline

class Renderer {
  private ctx: CanvasRenderingContext2D;
  private tileRenderer: TileRenderer;
  private spriteRenderer: SpriteRenderer;
  private hudRenderer: HudRenderer;
  private effectRenderer: EffectRenderer;

  constructor(ctx: CanvasRenderingContext2D, assets: GameAssets) {
    this.ctx = ctx;
    this.tileRenderer = new TileRenderer(ctx, assets);
    this.spriteRenderer = new SpriteRenderer(ctx, assets);
    this.hudRenderer = new HudRenderer(ctx, assets);
    this.effectRenderer = new EffectRenderer(ctx);
  }

  renderFrame(): void {
    // 1. Clear entire canvas to black
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, 256, 240);

    // 2. Render background tiles in play area (y offset by 64 for HUD)
    this.ctx.save();
    this.ctx.translate(0, 64); // HUD offset
    this.tileRenderer.renderTiles();

    // 3. Collect all sprite render commands
    const spriteCommands: SpriteRenderCommand[] = [];
    // Add all entities (enemies, projectiles, items, player)
    spriteCommands.push(...entityManager.getSpriteCommands());

    // 4. Sort by priority, then render
    spriteCommands.sort((a, b) => a.priority - b.priority);
    this.spriteRenderer.renderSprites(spriteCommands);

    // 5. Render screen-level effects (damage flash, fade)
    this.effectRenderer.render();

    this.ctx.restore();

    // 6. Render HUD (always on top, not translated)
    this.hudRenderer.render();
  }
}
```

```typescript
// TileRenderer.ts

class TileRenderer {
  private ctx: CanvasRenderingContext2D;
  private tilesetImage: ImageBitmap | HTMLCanvasElement;

  renderTiles(): void {
    const tiles = worldManager.tileMap.getAllTiles();
    for (let row = 0; row < 11; row++) {
      for (let col = 0; col < 16; col++) {
        const tile = tiles[row * 16 + col];
        if (!tile) continue;
        const srcX = (tile.tileId % 16) * 16;
        const srcY = Math.floor(tile.tileId / 16) * 16;
        this.ctx.drawImage(this.tilesetImage, srcX, srcY, 16, 16, col * 16, row * 16, 16, 16);
      }
    }
  }
}
```

```typescript
// SpriteRenderer.ts

class SpriteRenderer {
  private ctx: CanvasRenderingContext2D;
  private spriteSheet: ImageBitmap | HTMLCanvasElement;

  renderSprites(commands: SpriteRenderCommand[]): void {
    for (const cmd of commands) {
      if (!cmd.visible) continue;

      const def = this.getSpriteDefinition(cmd.spriteKey);
      if (!def) continue;

      this.ctx.save();

      // Apply flips
      if (cmd.flipX || cmd.flipY) {
        this.ctx.translate(
          cmd.flipX ? cmd.x + def.width : cmd.x,
          cmd.flipY ? cmd.y + def.height : cmd.y
        );
        this.ctx.scale(cmd.flipX ? -1 : 1, cmd.flipY ? -1 : 1);
        this.ctx.drawImage(
          this.spriteSheet,
          def.srcX, def.srcY, def.width, def.height,
          0, 0, def.width, def.height
        );
      } else {
        this.ctx.drawImage(
          this.spriteSheet,
          def.srcX, def.srcY, def.width, def.height,
          cmd.x, cmd.y, def.width, def.height
        );
      }

      this.ctx.restore();
    }
  }
}
```

### 5.12 Animation System

**File**: `src/animation/AnimationSystem.ts`, `src/animation/AnimationData.ts`

Refer to **specs/rendering-and-animation.md** Section 3.

```typescript
// AnimationSystem.ts

interface AnimationInstance {
  animation: Animation;
  currentFrameIndex: number;
  frameTimer: number;
  finished: boolean;
}

class AnimationSystem {
  private instances: Map<number, AnimationInstance> = new Map();

  play(entityId: number, animationName: string): void {
    const animation = getAnimation(animationName);
    if (!animation) return;
    this.instances.set(entityId, {
      animation,
      currentFrameIndex: 0,
      frameTimer: animation.frames[0]!.duration,
      finished: false,
    });
  }

  update(): void {
    for (const [id, instance] of this.instances) {
      if (instance.finished) continue;

      instance.frameTimer--;
      if (instance.frameTimer <= 0) {
        instance.currentFrameIndex++;
        if (instance.currentFrameIndex >= instance.animation.frames.length) {
          if (instance.animation.loop) {
            instance.currentFrameIndex = 0;
          } else {
            instance.finished = true;
            instance.currentFrameIndex = instance.animation.frames.length - 1;
            continue;
          }
        }
        instance.frameTimer = instance.animation.frames[instance.currentFrameIndex]!.duration;
      }
    }
  }

  getCurrentFrame(entityId: number): AnimationFrame | null {
    const instance = this.instances.get(entityId);
    if (!instance) return null;
    return instance.animation.frames[instance.currentFrameIndex] ?? null;
  }

  isFinished(entityId: number): boolean {
    return this.instances.get(entityId)?.finished ?? true;
  }
}
```

### 5.13 HUD Renderer

**File**: `src/rendering/HudRenderer.ts`

Refer to **specs/rendering-and-animation.md** Section 5.

```typescript
// HudRenderer.ts

class HudRenderer {
  private ctx: CanvasRenderingContext2D;

  render(): void {
    // 1. Draw HUD background (black)
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, 256, 64);

    // 2. Draw minimap
    this.renderMinimap();

    // 3. Draw B-item and A-item slots
    this.renderItemSlots();

    // 4. Draw hearts
    this.renderHearts();

    // 5. Draw rupee/key/bomb counters
    this.renderCounters();
  }

  private renderHearts(): void {
    const player = gameStateManager.getPlayer();
    const containerCount = Math.floor(player.maxHP / 2);
    const heartsPerRow = 8;

    for (let i = 0; i < containerCount; i++) {
      const row = Math.floor(i / heartsPerRow);
      const col = i % heartsPerRow;
      const hx = 176 + col * 8;
      const hy = 40 + row * 8;

      const hpForHeart = player.currentHP - i * 2;
      if (hpForHeart >= 2) {
        this.drawHeart(hx, hy, 'FULL');
      } else if (hpForHeart === 1) {
        this.drawHeart(hx, hy, 'HALF');
      } else {
        this.drawHeart(hx, hy, 'EMPTY');
      }
    }
  }

  private renderMinimap(): void {
    if (worldManager.currentContext === 'OVERWORLD') {
      this.renderOverworldMinimap();
    } else if (worldManager.currentContext === 'DUNGEON') {
      this.renderDungeonMinimap();
    }
  }

  private renderCounters(): void {
    const inv = InventoryManager.getInventory();
    this.drawText(`X${String(inv.rupees).padStart(3, ' ')}`, 96, 16);
    this.drawText(`X${String(inv.keys).padStart(2, ' ')}`, 96, 24);
    this.drawText(`X${String(inv.bombCount).padStart(2, ' ')}`, 96, 32);
  }

  private drawText(text: string, x: number, y: number): void {
    // 8x8 monospaced font rendering from sprite sheet
    for (let i = 0; i < text.length; i++) {
      const charIndex = this.getCharIndex(text[i]!);
      if (charIndex >= 0) {
        // Draw from font sprite sheet
        this.ctx.drawImage(
          this.fontImage,
          charIndex * 8, 0, 8, 8,
          x + i * 8, y, 8, 8
        );
      }
    }
  }
}
```

### 5.14 Screen Transition System

**File**: `src/world/ScreenTransition.ts`

See Section 5.5 for the `ScreenTransition` class. The transition system handles:

- **Overworld scroll**: 4px/frame horizontal (64 frames) or vertical (44 frames). Both screens rendered simultaneously during scroll.
- **Dungeon room change**: 4-frame fade-out, 1-frame load, 4-frame fade-in (9 frames total).
- **Cave/dungeon entry**: 16-frame column-wipe close, 1-frame load, 16-frame column-wipe open (33 frames total).

During all transitions, `GamePhase` is `'TRANSITION'` and all gameplay input is ignored.

### 5.15 Audio System

**File**: `src/audio/AudioManager.ts`, `src/audio/AudioContext.ts`, `src/audio/SfxPlayer.ts`, `src/audio/MusicPlayer.ts`, `src/audio/ToneGenerator.ts`

Refer to **specs/audio-system.md** for full specification.

```typescript
// AudioManager.ts

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxPlayer: SfxPlayer;
  private musicPlayer: MusicPlayer;
  private resumed: boolean = false;
  private muted: boolean = false;

  init(): void {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.sfxPlayer = new SfxPlayer(this.ctx, this.masterGain);
    this.musicPlayer = new MusicPlayer(this.ctx, this.masterGain);

    // Register one-shot gesture listener to resume AudioContext
    const resumeHandler = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
        this.resumed = true;
      }
      window.removeEventListener('keydown', resumeHandler);
      window.removeEventListener('click', resumeHandler);
    };
    window.addEventListener('keydown', resumeHandler);
    window.addEventListener('click', resumeHandler);
  }

  playSfx(sfxId: string): void {
    if (!this.resumed || this.muted) return;
    this.sfxPlayer.play(sfxId);
  }

  stopSfx(sfxId: string): void {
    this.sfxPlayer.stop(sfxId);
  }

  playMusic(trackId: string): void {
    if (!this.resumed) return;
    this.musicPlayer.play(trackId);
  }

  stopMusic(): void {
    this.musicPlayer.stop();
  }

  pause(): void {
    this.ctx?.suspend();
  }

  resume(): void {
    this.ctx?.resume();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 1;
    }
  }

  update(): void {
    this.sfxPlayer.update();
    this.musicPlayer.update();
  }
}
```

```typescript
// ToneGenerator.ts

class ToneGenerator {
  static createPulseWave(ctx: AudioContext, duty: PulseDuty): PeriodicWave {
    // Generate Fourier coefficients for NES-style square wave
    const harmonics = 64;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    real[0] = 0;
    imag[0] = 0;
    for (let n = 1; n < harmonics; n++) {
      imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  static createNoiseBuffer(ctx: AudioContext, mode: 'short' | 'long'): AudioBuffer {
    const length = mode === 'short' ? 93 : 32767;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // LFSR noise generator (NES-style)
    let shift = 1;
    for (let i = 0; i < length; i++) {
      const bit0 = shift & 1;
      const bit1 = mode === 'short' ? (shift >> 6) & 1 : (shift >> 1) & 1;
      const feedback = bit0 ^ bit1;
      shift = (shift >> 1) | (feedback << 14);
      data[i] = bit0 ? 1.0 : -1.0;
    }

    return buffer;
  }
}
```

### 5.16 Inventory and Item System

**File**: `src/inventory/InventoryManager.ts`, `src/inventory/ItemEffects.ts`

Refer to **specs/core-game-systems.md** (Section 4) and **specs/progression-and-game-state.md** (Section 2).

```typescript
// InventoryManager.ts

class InventoryManager {
  private inventory: Inventory;

  constructor() {
    this.inventory = { ...DEFAULT_INVENTORY };
  }

  loadFromSave(save: SaveFile): void {
    this.inventory = { ...save.inventory };
  }

  getInventory(): Readonly<Inventory> {
    return this.inventory;
  }

  addItem(item: MajorItem): void {
    switch (item) {
      case 'BOOMERANG':
        this.inventory.hasBoomerang = true;
        this.inventory.boomerangType = 'wood';
        break;
      case 'MAGIC_BOOMERANG':
        this.inventory.hasBoomerang = true;
        this.inventory.boomerangType = 'magic';
        break;
      case 'BOW':
        this.inventory.hasBow = true;
        break;
      // ... (all items follow same pattern)
    }
  }

  addRupees(count: number): void {
    this.inventory.rupees = Math.min(255, this.inventory.rupees + count);
  }

  spendRupees(cost: number): boolean {
    if (this.inventory.rupees < cost) return false;
    this.inventory.rupees -= cost;
    return true;
  }

  addKey(): void {
    this.inventory.keys = Math.min(255, this.inventory.keys + 1);
  }

  useKey(): boolean {
    if (this.inventory.hasMagicKey) return true;
    if (this.inventory.keys <= 0) return false;
    this.inventory.keys--;
    return true;
  }

  addBomb(): void {
    this.inventory.bombCount = Math.min(this.inventory.bombCapacity, this.inventory.bombCount + 1);
  }

  useBomb(): boolean {
    if (this.inventory.bombCount <= 0) return false;
    this.inventory.bombCount--;
    return true;
  }

  addHeartContainer(): void {
    if (this.inventory.heartContainers >= 16) return;
    this.inventory.heartContainers++;
  }

  getSelectedBItem(): BItemSlot | null {
    return this.inventory.selectedBItem;
  }

  setSelectedBItem(item: BItemSlot): void {
    this.inventory.selectedBItem = item;
  }
}
```

### 5.17 Save/Load System

**File**: `src/progression/SaveSystem.ts`

Refer to **specs/progression-and-game-state.md** (Section 8).

```typescript
const STORAGE_KEY = 'zelda_nes_saves';
const SAVE_VERSION = 1;

class SaveSystem {
  private storage: SaveFileStorage;

  constructor() {
    this.storage = this.loadFromStorage();
  }

  private loadFromStorage(): SaveFileStorage {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { files: [null, null, null], lastPlayedSlot: null };
      const parsed = JSON.parse(raw);
      if (this.validate(parsed)) return parsed;
    } catch {
      // Corrupted data — return empty
    }
    return { files: [null, null, null], lastPlayedSlot: null };
  }

  save(slot: number, saveFile: SaveFile): void {
    this.storage.files[slot] = { ...saveFile, saveVersion: SAVE_VERSION };
    this.storage.lastPlayedSlot = slot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
  }

  load(slot: number): SaveFile | null {
    return this.storage.files[slot] ?? null;
  }

  deleteFile(slot: number): void {
    this.storage.files[slot] = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
  }

  getFiles(): readonly (SaveFile | null)[] {
    return this.storage.files;
  }

  private validate(data: unknown): data is SaveFileStorage {
    // Validate structure, types, ranges
    if (typeof data !== 'object' || data === null) return false;
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj['files'])) return false;
    if (obj['files'].length !== 3) return false;
    return true;
  }
}
```

### 5.18 Progression System

**File**: `src/progression/ProgressionManager.ts`, `src/progression/DungeonState.ts`

Refer to **specs/progression-and-game-state.md** (Sections 3, 6).

```typescript
// ProgressionManager.ts

class ProgressionManager {
  private flags: ProgressionFlags;
  private dungeons: DungeonProgress[];

  constructor() {
    this.flags = createDefaultProgressionFlags();
    this.dungeons = Array.from({ length: 9 }, (_, i) => createEmptyDungeonProgress(i));
  }

  loadFromSave(save: SaveFile): void {
    this.flags = { ...save.progression };
    this.dungeons = save.dungeons.map(d => ({ ...d }));
  }

  collectTriforce(dungeonIndex: number): void {
    if (dungeonIndex < 0 || dungeonIndex > 7) return;
    this.flags.triforceFragments[dungeonIndex] = true;
    this.flags.triforceCount = this.flags.triforceFragments.filter(Boolean).length;
  }

  defeatBoss(dungeonIndex: number): void {
    this.dungeons[dungeonIndex]!.bossDefeated = true;
  }

  canEnterDungeon9(): boolean {
    return this.flags.triforceCount >= 8;
  }

  isGameComplete(): boolean {
    return this.flags.zeldaRescued;
  }

  canGetWhiteSword(heartContainers: number): boolean {
    return heartContainers >= 5;
  }

  canGetMagicalSword(heartContainers: number): boolean {
    return heartContainers >= 12;
  }

  getDungeonProgress(dungeonIndex: number): DungeonProgress {
    return this.dungeons[dungeonIndex]!;
  }
}
```

### 5.19 Title Screen and Menus

**File**: `src/screens/TitleScreen.ts`, `src/screens/FileSelectScreen.ts`, `src/screens/PauseScreen.ts`, `src/screens/ContinueScreen.ts`

```typescript
// TitleScreen.ts

class TitleScreen {
  update(input: InputSnapshot): void {
    if (input.buttons.START.justPressed || input.buttons.A.justPressed) {
      gameStateManager.setPhase('FILE_SELECT');
    }
  }

  render(renderer: Renderer): void {
    // Render title screen: "THE LEGEND OF ZELDA" text + waterfall animation
    // Use 8x8 font rendering from HudRenderer
  }
}
```

```typescript
// PauseScreen.ts

class PauseScreen {
  private cursorRow: number = 0;
  private cursorCol: number = 0;
  private readonly GRID_ROWS = 2;
  private readonly GRID_COLS = 4;

  update(input: InputSnapshot): void {
    // Cursor navigation (edge-triggered, skips empty slots)
    if (input.buttons.UP.justPressed) this.moveCursor('UP');
    if (input.buttons.DOWN.justPressed) this.moveCursor('DOWN');
    if (input.buttons.LEFT.justPressed) this.moveCursor('LEFT');
    if (input.buttons.RIGHT.justPressed) this.moveCursor('RIGHT');

    // B button equips highlighted item
    if (input.buttons.B.justPressed) {
      const item = this.getItemAtCursor();
      if (item) inventoryManager.setSelectedBItem(item);
    }
  }

  render(renderer: Renderer): void {
    // Render inventory grid, cursor, Triforce display, dungeon map
    // Overlay on top of the frozen gameplay frame
  }
}
```

```typescript
// ContinueScreen.ts

class ContinueScreen {
  private selectedOption: number = 0;
  private readonly options: ContinueOption[] = ['CONTINUE', 'SAVE'];

  update(input: InputSnapshot): void {
    if (input.buttons.UP.justPressed) {
      this.selectedOption = Math.max(0, this.selectedOption - 1);
    }
    if (input.buttons.DOWN.justPressed) {
      this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
    }
    if (input.buttons.A.justPressed || input.buttons.START.justPressed) {
      this.executeOption(this.options[this.selectedOption]!);
    }
  }

  private executeOption(option: ContinueOption): void {
    switch (option) {
      case 'CONTINUE':
        // Respawn at appropriate location, HP = 3 hearts
        player.currentHP = 6;
        player.state = 'IDLE';
        // Respawn logic per specs/progression-and-game-state.md
        gameStateManager.setPhase('GAMEPLAY');
        break;
      case 'SAVE':
        saveSystem.save(currentSlot, buildSaveFile());
        gameStateManager.setPhase('TITLE');
        break;
    }
  }
}
```

---

## 6. Data Schemas (Consolidated)

All TypeScript interfaces used across the codebase. These are defined in `src/types.ts`:

```typescript
// ===== CONSTANTS =====

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type TileCollision = 'SOLID' | 'PASSABLE' | 'WATER' | 'PIT' | 'STAIRS' | 'BUSH' | 'ROCK';
type SpritePriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type MapContext = 'OVERWORLD' | 'DUNGEON' | 'CAVE';
type HalfHearts = number;

// ===== GAME PHASES =====

type GamePhase =
  | 'TITLE' | 'FILE_SELECT' | 'GAMEPLAY' | 'PAUSE'
  | 'TRANSITION' | 'DEATH' | 'CONTINUE_SCREEN'
  | 'ITEM_PICKUP' | 'TEXT_DISPLAY' | 'ENDING';

type PlayerState =
  | 'IDLE' | 'WALKING' | 'ATTACKING' | 'USING_ITEM'
  | 'KNOCKBACK' | 'INVINCIBLE' | 'DYING';

type EnemyState =
  | 'SPAWNING' | 'ACTIVE' | 'STUNNED' | 'KNOCKBACK'
  | 'DAMAGED' | 'DYING' | 'SUBMERGED' | 'INVISIBLE';

// ===== INPUT =====

type NesButton = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'A' | 'B' | 'START' | 'SELECT';

interface ButtonState {
  held: boolean;
  justPressed: boolean;
  justReleased: boolean;
}

interface InputSnapshot {
  buttons: Record<NesButton, ButtonState>;
  activeDirection: Direction | null;
  facingDirection: Direction;
  frameNumber: number;
}

// ===== TILES AND WORLD =====

interface TileData {
  tileId: number;
  collision: TileCollision;
}

interface OverworldScreen {
  screenCol: number;
  screenRow: number;
  tiles: TileData[];
  enemySpawns: EnemySpawn[];
  entrances: ScreenEntrance[];
  hiddenItems: HiddenItem[];
  secretsRevealed: boolean;
  paletteId: number;
  screenType: OverworldScreenType;
}

type OverworldScreenType =
  | 'NORMAL' | 'FAIRY_FOUNTAIN' | 'SHOP' | 'NPC_CAVE'
  | 'DUNGEON_ENTRANCE' | 'WARP_POINT';

interface DungeonRoom {
  roomCol: number;
  roomRow: number;
  tiles: TileData[];
  doors: { up: DoorState; down: DoorState; left: DoorState; right: DoorState };
  enemySpawns: EnemySpawn[];
  items: RoomItem[];
  isDark: boolean;
  pushBlock?: PushBlock;
  roomType: DungeonRoomType;
  paletteId: number;
}

type DoorState = 'OPEN' | 'LOCKED' | 'SHUTTER' | 'BOMBABLE' | 'WALL';
type DungeonRoomType =
  | 'NORMAL' | 'BOSS' | 'ITEM' | 'TRIFORCE'
  | 'ENTRANCE' | 'PASSAGE' | 'NPC' | 'TRAP';

interface DungeonDefinition {
  dungeonId: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
  rooms: (DungeonRoom | null)[][];
  entranceCol: number;
  entranceRow: number;
  bossCol: number;
  bossRow: number;
  triforceCol: number;
  triforceRow: number;
  bossType: BossType;
  dungeonPalette: number;
  overworldEntranceCol: number;
  overworldEntranceRow: number;
}

type BossType =
  | 'AQUAMENTUS' | 'DODONGO' | 'MANHANDLA' | 'GLEEOK'
  | 'DIGDOGGER' | 'GOHMA' | 'PATRA' | 'GANON';

// ===== ENEMIES =====

interface EnemyArchetype {
  id: string;
  name: string;
  baseType: EnemyBaseType;
  variant: EnemyVariant;
  hp: number;
  contactDamage: number;
  movementPattern: MovementPattern;
  attackPattern: AttackPattern | null;
  spriteWidth: number;
  spriteHeight: number;
  hitbox: HitboxDefinition;
  speed: number;
  vulnerabilities: DamageVulnerabilities;
  spawnBehavior: SpawnBehavior;
  countsTowardLimit: boolean;
  advancesKillCounter: boolean;
  boomerangStunnable: boolean;
  stunDuration: number;
  knockbackable: boolean;
  spritePriority: SpritePriority;
  blocksMovement: boolean;
  flags: EnemyFlags;
}

// (Full EnemyBaseType, EnemyVariant, MovementPattern, AttackPattern,
//  EnemyFlags, etc. as defined in specs/enemy-and-ai-behavior.md)

// ===== COMBAT =====

type PlayerWeaponType =
  | 'WOODEN_SWORD' | 'WHITE_SWORD' | 'MAGICAL_SWORD'
  | 'SWORD_BEAM' | 'ARROW' | 'SILVER_ARROW' | 'BOMB'
  | 'BOOMERANG' | 'MAGIC_BOOMERANG' | 'CANDLE_FLAME'
  | 'MAGIC_ROD' | 'MAGIC_ROD_FLAME' | 'RECORDER';

type ProjectileType =
  | 'ROCK' | 'ARROW' | 'MAGIC_BEAM'
  | 'FIREBALL' | 'ZORA_FIREBALL' | 'SWORD_BEAM';

interface DamageVulnerabilities {
  sword: number;
  swordBeam: number;
  arrow: number;
  silverArrow: number;
  bomb: number;
  boomerang: number;
  candleFlame: number;
  magicRod: number;
  recorder: number;
}

// ===== INVENTORY =====

interface Inventory {
  swordLevel: 0 | 1 | 2 | 3;
  hasBoomerang: boolean;
  boomerangType: false | 'wood' | 'magic';
  hasBombs: boolean;
  bombCount: number;
  bombCapacity: 8 | 12 | 16;
  hasBow: boolean;
  arrowType: false | 'wood' | 'silver';
  candleType: false | 'blue' | 'red';
  hasRecorder: boolean;
  hasFood: boolean;
  potionState: false | 'letter' | 'potion1' | 'potion2';
  hasMagicRod: boolean;
  hasBook: boolean;
  ringLevel: 0 | 1 | 2;
  hasPowerBracelet: boolean;
  shieldType: false | 'standard' | 'magic';
  hasLadder: boolean;
  hasRaft: boolean;
  hasMagicKey: boolean;
  rupees: number;
  keys: number;
  selectedBItem: BItemSlot | null;
}

type BItemSlot =
  | 'BOOMERANG' | 'BOMB' | 'BOW_ARROW' | 'CANDLE'
  | 'RECORDER' | 'FOOD' | 'POTION' | 'MAGIC_ROD';

// ===== SAVE DATA =====

interface SaveFile {
  slot: number;
  playerName: string;
  deathCount: number;
  isSecondQuest: boolean;
  heartContainers: number;
  inventory: Inventory;
  dungeons: DungeonProgress[];
  overworld: OverworldProgress;
  progression: ProgressionFlags;
  killCounter: number;
  saveVersion: number;
}

interface DungeonProgress {
  dungeonIndex: number;
  hasMap: boolean;
  hasCompass: boolean;
  bossDefeated: boolean;
  triforceCollected: boolean;
  dungeonItemCollected: boolean;
  rooms: DungeonRoomState[];
  lockedDoorsOpened: string[];
}

interface ProgressionFlags {
  triforceCount: number;
  triforceFragments: boolean[];
  ganonDefeated: boolean;
  zeldaRescued: boolean;
  isSecondQuest: boolean;
  visitedDungeonEntrances: number[];
  startingSwordCollected: boolean;
  whiteSwordCollected: boolean;
  magicalSwordCollected: boolean;
}

// ===== RENDERING =====

interface SpriteRenderCommand {
  spriteKey: string;
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
  priority: SpritePriority;
  visible: boolean;
  paletteId?: number;
}

interface Animation {
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
  onComplete?: 'DESTROY' | 'HOLD_LAST' | 'RESET';
}

interface AnimationFrame {
  spriteKey: string;
  duration: number;
  hitboxActive?: boolean;
  offsetX?: number;
  offsetY?: number;
}

// ===== AUDIO =====

interface SfxData {
  id: string;
  channels: ('pulse1' | 'pulse2' | 'triangle' | 'noise')[];
  priority: number;
  loops: boolean;
  channelFrames: Record<string, SfxFrame[]>;
}

interface MusicData {
  id: string;
  bpm: number;
  ticksPerBeat: number;
  loops: boolean;
  loopStartTick: number;
  channels: Record<string, MusicNote[]>;
}

// ===== GEOMETRY =====

interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface HitboxDefinition {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}
```

---

## 7. Data Files

### `src/data/overworldData.ts`

Contains the full 16x8 overworld grid. For initial implementation:

- **Fully defined screens**: (7,7) start, (7,6) cave entrance, screens adjacent to start (6,7), (8,7), (7,8), and screens leading to Dungeon 1 entrance.
- **Stub screens**: All other 122 screens use a default grass/forest layout with no enemies and no entrances.
- Each screen is a `TileData[176]` array + metadata.

### `src/data/dungeonData.ts`

Contains dungeon definitions for all 9 dungeons:

- **Dungeon 1 (Eagle)**: Fully defined with all rooms, enemies, doors, items (Boomerang), boss (Aquamentus), and Triforce room.
- **Dungeons 2–9**: Stub definitions with entrance room only, boss room, and Triforce room. Empty rooms elsewhere.

### `src/data/enemyArchetypes.ts`

Contains all enemy archetype definitions as exported constants. Full archetype data for:
- All standard enemies (Octorok red/blue, Tektite red/blue, Stalfos, Keese, Gel, Zol, Goriya red/blue, Darknut red/blue, Gibdo, Like Like, Rope, Wallmaster)
- Aquamentus boss (full behavior)
- Stub archetypes for remaining bosses (HP/damage values only, simplified movement)

### `src/data/sfxData.ts` and `src/data/musicData.ts`

Placeholder audio data:
- SFX: Simple frequency sweeps and noise bursts approximating the original sounds. Each SFX is a `SfxFrame[]` sequence.
- Music: Single-channel placeholder melodies for overworld and dungeon themes. Triangle channel bass line + pulse melody.

### `src/data/tilesetData.ts`

Metadata for tileset generation. The `AssetGenerator` uses this to create procedural tilesets at runtime.

---

## 8. Asset Pipeline

### `src/assets/AssetGenerator.ts`

All visual assets are generated procedurally at runtime to avoid any copyrighted content.

```typescript
class AssetGenerator {
  static generate(): GameAssets {
    return {
      overworldTileset: this.generateOverworldTileset(),
      dungeonTileset: this.generateDungeonTileset(),
      spriteSheet: this.generateSpriteSheet(),
      fontSheet: this.generateFontSheet(),
    };
  }

  private static generateOverworldTileset(): HTMLCanvasElement {
    // Create a 256x256 canvas (16x16 grid of 16x16 tiles)
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Tile 0: Grass (green)
    this.fillTile(ctx, 0, '#00A800');

    // Tile 1: Tree/Bush (dark green)
    this.fillTile(ctx, 1, '#005800');

    // Tile 2: Water (blue)
    this.fillTile(ctx, 2, '#0058F8');

    // Tile 3: Sand/Path (tan)
    this.fillTile(ctx, 3, '#F8B800');

    // Tile 4: Mountain/Wall (gray)
    this.fillTile(ctx, 4, '#747474');

    // Tile 5: Cave entrance (dark)
    this.fillTile(ctx, 5, '#383838');

    // Tile 6: Dungeon entrance (black)
    this.fillTile(ctx, 6, '#000000');

    // ... additional tiles

    return canvas;
  }

  private static generateSpriteSheet(): HTMLCanvasElement {
    // Create sprite sheet with all entity sprites
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Link sprites (4 directions x idle/walk/attack = 12 sprites)
    // Row 0: Link facing down (idle, walk1, walk2, attack1-4)
    this.drawLinkSprite(ctx, 0, 0, 'DOWN', 'IDLE');
    // ... all Link sprites

    // Enemy sprites (row 2+)
    this.drawEnemySprite(ctx, 0, 32, 'OCTOROK', 'RED');
    // ... all enemy sprites

    return canvas;
  }

  private static generateFontSheet(): HTMLCanvasElement {
    // 8x8 pixel monospaced font: A-Z, 0-9, special chars
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;

    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -x.';
    for (let i = 0; i < charset.length; i++) {
      this.drawFontChar(ctx, i * 8, 0, charset[i]!);
    }

    return canvas;
  }
}
```

Sprites are simple colored rectangles and shapes:
- **Link**: Green tunic, 16x16, directional sprites using basic pixel art (body + shield + sword shapes)
- **Enemies**: Color-coded rectangles with distinguishing features (Octorok: round shape, Keese: wing shape, etc.)
- **Items**: Small colored icons (heart: red, rupee: blue/green, key: yellow, bomb: gray)
- **Tiles**: Solid colored squares with optional grid lines or simple patterns

---

## 9. Cross-Cutting Concerns

### Error Handling

- All `localStorage` operations are wrapped in try-catch.
- All `AudioContext` operations gracefully degrade if Web Audio is unavailable.
- Out-of-bounds tile access returns `SOLID` (safe default).
- Invalid sprite keys render nothing (no crash).

### Debug Overlay (Optional)

`src/utils/debug.ts` provides:
- FPS counter
- Entity count display
- Collision box visualization
- Current screen coordinates
- Toggled via `KeyF1` (not mapped to any NES button)

### PRNG

`src/utils/PRNG.ts` implements a deterministic PRNG (xorshift32 or similar) used for:
- Enemy movement decisions
- Enemy spawn position selection
- Item drop table cycling

```typescript
class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed || 1;
  }

  next(): number {
    // xorshift32
    this.state ^= this.state << 13;
    this.state ^= this.state >> 17;
    this.state ^= this.state << 5;
    return (this.state >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
```

### Constants

`src/constants.ts` centralizes all magic numbers:

```typescript
// Screen dimensions
export const SCREEN_WIDTH = 256;
export const SCREEN_HEIGHT = 240;
export const PLAY_AREA_WIDTH = 256;
export const PLAY_AREA_HEIGHT = 176;
export const HUD_HEIGHT = 64;
export const TILE_SIZE = 16;
export const TILES_PER_ROW = 16;
export const TILES_PER_COL = 11;
export const TILES_PER_SCREEN = 176;

// Gameplay
export const TARGET_FPS = 60;
export const FRAME_DURATION_MS = 1000 / TARGET_FPS;
export const PLAYER_SPEED_SUBPIXELS = 24; // 1.5 px/frame * 16 subpixels
export const KNOCKBACK_DISTANCE = 16;
export const KNOCKBACK_FRAMES = 16;
export const INVINCIBILITY_FRAMES = 60;
export const ATTACK_FRAMES = 12;
export const MAX_ENEMIES_PER_SCREEN = 6;
export const OVERWORLD_SPAWN_DELAY = 15;
export const DUNGEON_SPAWN_DELAY = 0;

// Transitions
export const SCROLL_SPEED = 4; // px per frame
export const HORIZONTAL_SCROLL_FRAMES = 64;
export const VERTICAL_SCROLL_FRAMES = 44;
export const DUNGEON_FADE_FRAMES = 9;
export const CAVE_WIPE_FRAMES = 33;

// Overworld
export const OVERWORLD_COLS = 16;
export const OVERWORLD_ROWS = 8;
export const START_SCREEN_COL = 7;
export const START_SCREEN_ROW = 7;

// Player
export const STARTING_HEARTS = 3;
export const MAX_HEARTS = 16;
export const STARTING_HP = 6; // 3 hearts * 2 half-hearts
export const CONTINUE_HP = 6; // Always restore to 3 hearts on continue
export const MAX_RUPEES = 255;
export const MAX_KEYS = 255;

// Display
export const CANVAS_SCALE = 3;
export const MAX_SPRITES_PER_SCANLINE = 8;

// Damage
export const SWORD_DAMAGE: Record<number, number> = { 1: 1, 2: 2, 3: 4 };
export const MIN_DAMAGE = 1;

// Drop table
export const DROP_CHANCE = 0.32;
export const DROP_GROUPS = {
  A: ['RUPEE', 'HEART', 'RUPEE', 'FAIRY'],
  B: ['BOMB', 'RUPEE', 'CLOCK', 'RUPEE'],
  C: ['RUPEE', 'HEART', 'RUPEE', 'RUPEE'],
  D: ['HEART', 'FAIRY', 'RUPEE', 'HEART'],
} as const;
```

---

## 10. Implementation Order

The recommended build order minimizes blockers and enables incremental testing:

| Phase | What to Build | Depends On | Verification |
|-------|--------------|------------|-------------|
| **1** | Build pipeline: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `eslint.config.js` | Nothing | `npm run dev` serves blank page |
| **2** | `src/constants.ts`, `src/types.ts` | Phase 1 | `npm run typecheck` passes |
| **3** | `src/utils/PRNG.ts`, `src/utils/math.ts` | Phase 2 | Unit tests pass |
| **4** | `src/assets/AssetGenerator.ts` | Phase 2 | Canvas renders colored tiles |
| **5** | `src/core/GameLoop.ts`, `src/core/GameStateManager.ts` | Phase 2 | Loop runs at 60 FPS, phase transitions work |
| **6** | `src/input/InputSystem.ts`, `src/input/DirectionStack.ts`, `src/input/InputMapping.ts` | Phase 2 | Input snapshot has correct button states |
| **7** | `src/rendering/Renderer.ts`, `src/rendering/TileRenderer.ts`, `src/rendering/SpriteRenderer.ts` | Phase 4 | Tiles render on canvas |
| **8** | `src/world/TileMap.ts`, `src/world/WorldManager.ts`, `src/data/overworldData.ts` | Phase 7 | Start screen renders overworld tiles |
| **9** | `src/entities/Entity.ts`, `src/entities/EntityManager.ts`, `src/entities/Player.ts` | Phase 6, 8 | Link moves on screen with arrow keys |
| **10** | `src/combat/CollisionDetection.ts`, tile collision | Phase 9 | Link cannot walk through walls |
| **11** | `src/animation/AnimationSystem.ts`, `src/animation/AnimationData.ts` | Phase 9 | Link walk/idle animations play |
| **12** | `src/rendering/HudRenderer.ts` | Phase 7 | HUD displays hearts, counters |
| **13** | `src/world/ScreenTransition.ts` | Phase 8, 10 | Screen scrolls when Link exits edge |
| **14** | `src/data/enemyArchetypes.ts`, `src/entities/Enemy.ts` | Phase 9 | Enemies spawn and move on screen |
| **15** | `src/combat/DamageSystem.ts`, `src/combat/Knockback.ts` | Phase 10 | Sword kills enemies, enemies hurt Link |
| **16** | `src/entities/Projectile.ts`, `src/combat/ShieldBlock.ts` | Phase 15 | Octoroks fire rocks, shield blocks |
| **17** | `src/inventory/InventoryManager.ts`, `src/entities/ItemDrop.ts` | Phase 15 | Item drops spawn, hearts heal |
| **18** | `src/screens/PauseScreen.ts` | Phase 12, 17 | Pause screen opens, B-item selectable |
| **19** | `src/data/dungeonData.ts`, dungeon room transitions | Phase 13 | Can enter Dungeon 1, navigate rooms |
| **20** | Boss fight (Aquamentus) | Phase 14, 15 | Boss fight works, drops heart container |
| **21** | `src/progression/SaveSystem.ts`, `src/progression/ProgressionManager.ts` | Phase 17 | Save/load works via localStorage |
| **22** | `src/screens/TitleScreen.ts`, `src/screens/FileSelectScreen.ts`, `src/screens/ContinueScreen.ts` | Phase 21 | Full title → file select → game flow |
| **23** | `src/audio/AudioManager.ts`, `src/audio/ToneGenerator.ts`, `src/audio/SfxPlayer.ts`, `src/audio/MusicPlayer.ts` | Phase 5 | SFX play on sword slash, music plays |
| **24** | `src/rendering/EffectRenderer.ts`, `src/rendering/SpriteFlicker.ts` | Phase 7 | Screen flash, NES sprite flicker |
| **25** | Polish: death sequence, item pickup animation, ending screen | All above | Full playthrough: title → dungeon 1 clear |

---

## 11. Verification Criteria

The implementation is considered complete when all of the following are true:

### Build and Tooling
- [ ] `npm install` succeeds
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run test` passes with all tests passing
- [ ] `npm run build` produces a working `dist/` bundle
- [ ] `npm run dev` serves the game on `localhost:3000`

### Core Gameplay Loop
- [ ] Game boots to title screen
- [ ] File select screen works (register, select, eliminate)
- [ ] Link spawns on overworld screen (7,7) facing down
- [ ] Link moves in 4 directions at 1.5 px/frame with grid snapping
- [ ] Link cannot walk through solid tiles (trees, mountains, water)
- [ ] Screen transitions scroll at 4 px/frame when walking off-screen
- [ ] Link can attack with sword (A button), sword hitbox damages enemies
- [ ] Enemies spawn after screen transition, move per their patterns
- [ ] Enemy contact damages Link, triggers knockback + invincibility flash
- [ ] Enemy projectiles fire and can be blocked by shield facing
- [ ] Item drops appear when enemies die, heal/give rupees on pickup

### Dungeon 1
- [ ] Can enter Dungeon 1 from overworld
- [ ] Dungeon rooms load with correct door states
- [ ] Locked doors consume keys
- [ ] Shutter doors open when all enemies defeated
- [ ] Boss (Aquamentus) spawns, fires 3-way fireballs, takes sword damage
- [ ] Defeating boss drops heart container
- [ ] Triforce room accessible after boss; collecting Triforce shows fanfare

### HUD and Menus
- [ ] HUD shows hearts (full/half/empty), rupee/key/bomb counts
- [ ] Minimap shows current position
- [ ] Pause screen shows inventory grid, cursor navigates, B equips item
- [ ] Continue screen after death offers CONTINUE and SAVE options
- [ ] CONTINUE respawns Link with 3 hearts at correct location

### Audio
- [ ] AudioContext resumes on first user gesture
- [ ] Sword slash, enemy hit, and item pickup SFX play
- [ ] Background music plays (overworld and dungeon themes)
- [ ] Music pauses when game pauses
- [ ] Mute toggle works (M key)

### Save/Load
- [ ] Game saves to localStorage on continue screen SAVE
- [ ] Loading a save file restores inventory, progression, dungeon state
- [ ] Save file select screen correctly displays file data

### Rendering
- [ ] Canvas renders at 256x240 internally, scaled 3x (768x720 display)
- [ ] `imageSmoothingEnabled = false` for pixel-perfect rendering
- [ ] Sprite priority layering correct (items < enemies < Link < weapons)
- [ ] NES sprite flicker activates when >8 sprites share a scanline

---

## Appendix A: Cross-Reference to Source Specs

| Spec File | Sections in This PRD |
|-----------|---------------------|
| `specs/core-game-systems.md` | 5.7, 5.9, 5.10, 5.16, 6 |
| `specs/world-and-map-representation.md` | 5.5, 6, 7 |
| `specs/rendering-and-animation.md` | 5.11, 5.12, 5.13, 5.14, 6, 8 |
| `specs/input-and-control-mapping.md` | 5.3, 6 |
| `specs/enemy-and-ai-behavior.md` | 5.8, 5.9, 6, 7 |
| `specs/progression-and-game-state.md` | 5.17, 5.18, 6 |
| `specs/audio-system.md` | 5.15, 6, 7 |

---

## Appendix B: Decision Log — No Open-Ended Decisions

Every design decision has been resolved in this PRD. The following decisions were explicitly made:

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| Bundler | Vite | Native TS, fast dev server, zero config |
| Testing framework | Vitest | Vite-native, fast, compatible |
| Asset approach | Procedural generation at runtime | Avoids copyrighted assets, self-contained |
| Save storage | localStorage (JSON) | Simplest local persistence, matches constraint |
| Tileset rendering | Pre-colored per palette variant | Simpler than runtime palette swapping |
| Sub-pixel precision | 1/16th pixel (integer math) | Avoids floating-point drift, matches NES |
| Direction priority | Stack-based (most recent wins) | Matches NES behavior per input spec |
| PRNG algorithm | xorshift32 | Simple, fast, deterministic |
| Module system | ES modules (import/export) | Vite-native, tree-shakeable |
| State management | Direct class instances (no ECS framework) | Minimal complexity, sufficient for scope |
| Screen data format | TypeScript source files (not JSON) | Type-checked at compile time, simpler imports |
| Audio synthesis | OscillatorNode + custom PeriodicWave | Approximates NES APU without samples |
| Dark room rendering | Black fill over tile layer | Simplest implementation of darkness |
| Inventory pause overlay | Canvas draw over frozen gameplay | Single canvas, no DOM overlays |
| Canvas scaling | CSS `width/height` on canvas element | Hardware-accelerated, no manual scaling |
| Overworld data scope | 9 fully defined screens, rest stubbed | Proves architecture without 128 screens of hand-made data |
| Dungeon scope | Dungeon 1 full, 2-9 entrance-only stubs | Proves dungeon system end-to-end |
