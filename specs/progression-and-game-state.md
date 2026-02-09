# US-006: Progression and Game State Specification

Defines how game progress is tracked, persisted, restored, and how the game-over/continue cycle works for the NES Legend of Zelda TypeScript rebuild.

---

## 1. Save State Schema

The entire game state that must persist between sessions is captured in a single `SaveFile` object. The NES original supports **3 save files** (slots 1–3). Each file is independent.

### SaveFile Interface

```typescript
interface SaveFile {
  /** Slot index 0–2 */
  slot: number;

  /** Player display name (up to 8 characters, uppercase A-Z plus space) */
  playerName: string;

  /** Number of times the player has died (displayed on file select) */
  deathCount: number;

  /** Whether this is a Second Quest playthrough */
  isSecondQuest: boolean;

  /** Current heart containers (3–16) */
  heartContainers: number;

  /** Player inventory state */
  inventory: Inventory;

  /** Per-dungeon progression flags */
  dungeons: DungeonProgress[];

  /** Overworld persistent state */
  overworld: OverworldProgress;

  /** Global progression flags */
  progression: ProgressionFlags;

  /** Kill counter state for item drop cycling (0–9) */
  killCounter: number;
}
```

### What Is Saved vs. Reset on Continue/Load

| Data | Persisted Across Saves | Reset on Continue | Reset on Load |
|------|:---------------------:|:-----------------:|:-------------:|
| Heart containers | Yes | No | No |
| Current HP | No — restored to 3 hearts | Yes (to 3 hearts) | Yes (to 3 hearts) |
| Inventory items | Yes | No | No |
| Rupees | Yes | No | No |
| Keys | Yes | No | No |
| Bombs | Yes | No | No |
| Dungeon boss defeated | Yes | No | No |
| Dungeon items collected | Yes | No | No |
| Dungeon door states | Yes | No | No |
| Overworld secrets revealed | Yes | No | No |
| Enemy positions | No | Yes (reset) | Yes (reset) |
| Link's screen position | No | Yes (respawn point) | Yes (respawn point) |
| Death count | Yes | Incremented | No |
| Kill counter | Yes | No | No |
| Current active screen | No | Reset to respawn point | Reset to respawn point |

---

## 2. Inventory Persistence

The inventory is fully persisted across saves. Every field of the `Inventory` interface (defined in US-001) is included in the save file.

### Inventory Interface (Complete Persistence View)

```typescript
interface Inventory {
  /** 0 = none, 1 = wooden, 2 = white, 3 = magical */
  swordLevel: 0 | 1 | 2 | 3;

  /** true if currently owned */
  hasBoomerang: boolean;

  /** false = none, 'wood' = wooden, 'magic' = magical */
  boomerangType: false | 'wood' | 'magic';

  /** true if bombs unlocked (can carry/use bombs) */
  hasBombs: boolean;

  /** Current bomb count */
  bombCount: number;

  /** Max bomb capacity: 8, 12, or 16 */
  bombCapacity: 8 | 12 | 16;

  /** true if bow owned */
  hasBow: boolean;

  /** false = none, 'wood' = standard, 'silver' = silver */
  arrowType: false | 'wood' | 'silver';

  /** true if candle owned; false = none, 'blue' = blue, 'red' = red */
  candleType: false | 'blue' | 'red';

  /** true if recorder (whistle) owned */
  hasRecorder: boolean;

  /** true if food (bait) owned */
  hasFood: boolean;

  /** false = none, 'letter' = undelivered, 'potion1' = blue potion, 'potion2' = red potion */
  potionState: false | 'letter' | 'potion1' | 'potion2';

  /** true if magic rod owned */
  hasMagicRod: boolean;

  /** true if book of magic owned (upgrades rod to shoot fire) */
  hasBook: boolean;

  /** 0 = none, 1 = blue ring, 2 = red ring */
  ringLevel: 0 | 1 | 2;

  /** true if power bracelet owned */
  hasPowerBracelet: boolean;

  /** false = none, 'standard' = standard, 'magic' = magical */
  shieldType: false | 'standard' | 'magic';

  /** true if ladder owned */
  hasLadder: boolean;

  /** true if raft owned */
  hasRaft: boolean;

  /** true if magic key owned (infinite keys) */
  hasMagicKey: boolean;

  /** Current rupee count (0–255) */
  rupees: number;

  /** Current key count (0–255); irrelevant if hasMagicKey is true */
  keys: number;

  /** Currently selected B-button item slot */
  selectedBItem: BItemSlot | null;
}

/** Items assignable to the B button */
type BItemSlot =
  | 'BOOMERANG'
  | 'BOMB'
  | 'BOW_ARROW'
  | 'CANDLE'
  | 'RECORDER'
  | 'FOOD'
  | 'POTION'
  | 'MAGIC_ROD';
```

### Inventory Upgrade Rules

Upgrades are one-way — collecting a higher-tier item replaces the lower tier permanently:

| Item | Tiers | Upgrade Path |
|------|-------|-------------|
| Sword | 0→1→2→3 | Wooden → White → Magical |
| Boomerang | wood→magic | Wooden → Magical |
| Arrow | wood→silver | Standard → Silver |
| Candle | blue→red | Blue → Red (blue is single-use per screen; red is unlimited) |
| Ring | 0→1→2 | None → Blue → Red |
| Shield | standard→magic | Standard → Magical |
| Potion | letter→potion1→potion2 | Letter → Blue Potion (1 use) → Red Potion (2 uses) |
| Bomb capacity | 8→12→16 | Via shop purchase |

---

## 3. Dungeon Completion Flags

Each of the 9 dungeons has independent progression state.

### DungeonProgress Interface

```typescript
interface DungeonProgress {
  /** Dungeon index 0–8 (dungeon 1 = index 0, dungeon 9 = index 8) */
  dungeonIndex: number;

  /** true if player has collected the dungeon map */
  hasMap: boolean;

  /** true if player has collected the compass */
  hasCompass: boolean;

  /** true if the dungeon's boss has been defeated */
  bossDefeated: boolean;

  /** true if the Triforce fragment has been collected (dungeons 0–7 only; dungeon 8 has no fragment) */
  triforceCollected: boolean;

  /** true if the dungeon's special item has been collected (e.g., boomerang in dungeon 1) */
  dungeonItemCollected: boolean;

  /** Per-room state within this dungeon */
  rooms: DungeonRoomState[];

  /** Tracks which keys have been used on locked doors */
  lockedDoorsOpened: string[];
}

interface DungeonRoomState {
  /** Room coordinate key, e.g., "3,2" */
  roomKey: string;

  /** true if all enemies in this room have been defeated at least once */
  cleared: boolean;

  /** true if this room's item (floor drop, pushblock reward) has been collected */
  itemCollected: boolean;

  /** Tracks bombable walls that have been opened, by direction */
  bombedWalls: Direction[];
}

type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
```

### Dungeon State Rules

1. **Boss rooms**: Once `bossDefeated` is true, the boss never respawns. The room remains permanently cleared.
2. **Item rooms**: Once `itemCollected` is true, enemies in that room no longer respawn (room stays cleared).
3. **Regular rooms**: Enemies respawn every time the player re-enters, unless the room falls under rules 1 or 2.
4. **Locked doors**: Opening a locked door consumes 1 key and permanently records the door in `lockedDoorsOpened`. Locked doors stay open for the rest of the playthrough.
5. **Shutter doors**: Open when all enemies in the room are defeated. They reset on room re-entry (enemies respawn, shutters re-close) unless the room is permanently cleared.
6. **Bombable walls**: Once bombed open, they remain open permanently (tracked in `bombedWalls`).
7. **Pushed blocks**: Pushblock state resets on room re-entry — the player must re-push blocks each visit. However, the reward behind a pushblock is tracked by `itemCollected`.
8. **Triforce fragment collection**: Collecting a Triforce fragment immediately triggers an animation sequence (room brightens, fragment floats to Link, heart containers fully heal). The dungeon is then "complete" for progression purposes, though the player can re-enter.

### Dungeon-Specific Items

| Dungeon | Special Item | Boss |
|---------|-------------|------|
| 1 (Eagle) | Boomerang | Aquamentus |
| 2 (Moon) | Magical Boomerang | Dodongo |
| 3 (Manji) | Raft | Manhandla |
| 4 (Snake) | Ladder | Gleeok (2 heads) |
| 5 (Lizard) | Recorder | Digdogger |
| 6 (Dragon) | Magic Rod | Gohma |
| 7 (Demon) | Red Candle | Aquamentus (rematch) |
| 8 (Lion) | Magic Key | Gleeok (4 heads) |
| 9 (Death Mountain) | Silver Arrow, Red Ring | Ganon |

---

## 4. Game Over and Continue Logic

### Death Trigger

Link dies when `currentHP` reaches 0. The death sequence is:

1. **Freeze all entities** — all movement, attacks, and spawning stop immediately.
2. **Link spin animation** — Link rotates through all 4 directional sprites (4 frames each, 16 frames total).
3. **Screen darkens** — palette shifts to red tint over 16 frames.
4. **Link explodes** — expand/scatter animation (32 frames).
5. **Fade to black** — 16 frames.
6. Total death sequence: **~80 frames** (~1.33 seconds).

### Continue Screen

After the death animation, the game displays the continue screen with 3 options:

```typescript
type ContinueOption = 'CONTINUE' | 'SAVE' | 'RETRY';

interface ContinueScreen {
  options: ContinueOption[];
  /** Cursor starts on CONTINUE */
  defaultSelection: 'CONTINUE';
  /** RETRY only available in Second Quest */
  retryAvailable: boolean;
}
```

- **CONTINUE**: Resume play from the respawn point. Death count increments by 1.
- **SAVE**: Save current progress to the save file and return to the title screen. Death count increments by 1.
- **RETRY**: (Second Quest only) Restart from the very beginning of the Second Quest with no items. Death count resets.

### Respawn Points

On CONTINUE or on loading a save file, Link spawns at:

| Death/Load Context | Respawn Location |
|-------------------|-----------------|
| Died on overworld | Overworld screen (7, 7) — the starting cave screen |
| Died in a dungeon | The dungeon's entrance room (first room of that dungeon) |
| Died in a cave/shop | Overworld screen the cave was entered from |
| Loaded from save file | Overworld screen (7, 7) |

### State Restoration on Continue

When continuing after death:
- **HP restored to 3 hearts** (6 half-hearts), regardless of max heart containers.
- **All inventory retained** exactly as at moment of death.
- **All dungeon progress retained** (boss kills, items, opened doors, bombed walls).
- **All overworld secrets retained**.
- **Kill counter retained** (item drop cycle position preserved).
- **Current screen enemies fully reset** — all enemy spawns regenerate.
- **Link faces DOWN** at respawn.

---

## 5. Overworld Persistent State

### OverworldProgress Interface

```typescript
interface OverworldProgress {
  /** Screens where a secret has been permanently revealed */
  revealedSecrets: OverworldSecret[];

  /** Screens where a one-time item has been collected */
  collectedItems: OverworldItemCollection[];

  /** Heart containers collected from overworld locations */
  heartContainersCollected: string[];

  /** Shops/NPCs visited that have one-time effects */
  oneTimeEventsCompleted: string[];
}

interface OverworldSecret {
  /** Screen coordinate, e.g., "3,5" */
  screenKey: string;

  /** What type of secret was revealed */
  secretType: 'BOMB_CAVE' | 'BURN_BUSH' | 'PUSH_ROCK' | 'RECORDER_LAKE';
}

interface OverworldItemCollection {
  /** Screen coordinate */
  screenKey: string;

  /** Unique ID of the item on this screen */
  itemId: string;

  /** Whether the item has been collected */
  collected: boolean;
}
```

### Overworld Persistence Rules

1. **Enemies always respawn** on overworld screens — there is no persistent kill tracking for overworld.
2. **Secrets** (bomb-openable caves, burnable bushes, movable rocks, recorder-accessible areas) are permanent once revealed. The entrance/opening persists across continues and saves.
3. **One-time items** (heart containers on the ground, sword upgrades from NPCs, items from cave rewards) are tracked individually. Once collected, they never reappear.
4. **Shop inventory is unlimited** — shops restock every visit. Shop purchases are not tracked beyond their effect on inventory.
5. **Burning bushes**: Blue candle can burn one bush per screen visit. Red candle has no limit. Burned bushes reset on screen re-entry (visual reset), but if they revealed a secret cave, the cave entrance remains.
6. **Recorder warp**: The recorder creates a whirlwind that transports Link to a previously visited dungeon entrance. The available destinations are: dungeons whose entrance screen the player has visited.

---

## 6. Global Progression Flags

### ProgressionFlags Interface

```typescript
interface ProgressionFlags {
  /** Number of Triforce fragments collected (0–8) */
  triforceCount: number;

  /** Individual Triforce collection status per dungeon (index 0–7) */
  triforceFragments: boolean[];

  /** true once Ganon is defeated and the Triforce of Power is obtained */
  ganonDefeated: boolean;

  /** true once Princess Zelda is rescued (game complete) */
  zeldaRescued: boolean;

  /** true if player is in the Second Quest */
  isSecondQuest: boolean;

  /** Tracks which overworld screens have been visited (for recorder warp destinations) */
  visitedDungeonEntrances: number[];

  /** Whether the old man's "IT'S DANGEROUS TO GO ALONE" sword has been collected */
  startingSwordCollected: boolean;

  /** Whether the White Sword has been collected (requires 5 hearts) */
  whiteSwordCollected: boolean;

  /** Whether the Magical Sword has been collected (requires 12 hearts) */
  magicalSwordCollected: boolean;
}
```

### Progression Gates

Certain items and areas are gated behind progression requirements:

| Gate | Requirement | Effect |
|------|------------|--------|
| White Sword | >= 5 heart containers | NPC gives White Sword in cave |
| Magical Sword | >= 12 heart containers | NPC gives Magical Sword in cave |
| Dungeon 9 entrance | 8 Triforce fragments collected | Entrance becomes accessible |
| Ganon fight | Reach final room of Dungeon 9 | Boss encounter begins |
| Silver Arrow kill | Hit Ganon with Silver Arrow | Only way to deliver killing blow |
| Game completion | Rescue Zelda after defeating Ganon | Triggers ending sequence |
| Second Quest | Complete the game once | New game with rearranged dungeons/items |

### Sword Beam Gating

The sword beam (projectile fired from sword swing) is only available when Link has **full HP** (currentHP === maxHP). This is not a progression gate per se, but it ties combat capability to current health state.

---

## 7. Game Completion and Second Quest

### Ending Sequence

When Link defeats Ganon and touches Princess Zelda in the final room:

1. **Zelda appears** — sprite materializes in the room.
2. **"THANKS LINK, YOU'RE THE HERO OF HYRULE"** — text displays character by character.
3. **Triforce of Power obtained** — pickup animation plays.
4. **Screen fades** — transition to ending credits.
5. **Credits scroll** — enemy/item gallery with names.
6. **"PUSH START"** prompt — returns to title screen.

### Second Quest

After completing the game, the player can start the **Second Quest** (also accessible by naming the save file "ZELDA"):

```typescript
interface SecondQuestChanges {
  /** Dungeon layouts are completely rearranged */
  dungeonLayoutsChanged: true;

  /** Dungeon entrances on overworld are moved */
  dungeonEntrancesChanged: true;

  /** Item locations in overworld shuffled */
  overworldItemsMoved: true;

  /** Some enemies are upgraded (more HP, different types) */
  enemyDifficultyIncreased: true;

  /** Secret cave locations changed */
  secretLocationsChanged: true;

  /** RETRY option available on continue screen */
  retryOptionEnabled: true;
}
```

The Second Quest is a full rearrangement, not procedural — it's a fixed second map/data set.

---

## 8. Save/Load Mechanics

### When Saving Occurs

Saves happen in these scenarios:
1. **Player selects SAVE on the continue screen** after death.
2. **Player selects SAVE AND QUIT** from the pause/inventory screen (if implemented; NES original only saves on death).

The NES original only saved on death (via the continue screen). For the TypeScript rebuild, a pause-menu save option is acceptable as a quality-of-life addition, but the default behavior should match the original.

### Save File Storage

```typescript
interface SaveFileStorage {
  /** 3 save file slots */
  files: (SaveFile | null)[];

  /** Index of the most recently played file (for highlighting on file select) */
  lastPlayedSlot: number | null;
}
```

Save data is stored in **localStorage** under a consistent key (e.g., `"zelda_nes_saves"`). The full `SaveFileStorage` object is serialized as JSON.

### Save File Integrity

- On load, validate all fields against expected types and ranges.
- If a save file is corrupted (fails validation), treat it as empty (null slot).
- Version the save format with a `saveVersion: number` field to support future migration.

```typescript
interface SaveFileWithVersion extends SaveFile {
  /** Schema version for forward-compatible migrations */
  saveVersion: number;
}
```

### File Select Screen

The file select screen displays:

```
- FILE 1: [PLAYER NAME]  ♥♥♥♥♥♥ (heart containers as filled/empty hearts)  DEATH COUNT: [N]
- FILE 2: [PLAYER NAME]  ♥♥♥♥   DEATH COUNT: [N]
- FILE 3: [EMPTY]
- REGISTER (create new file)
- ELIMINATE (delete a file)
```

### Registration (New File)

1. Player selects REGISTER.
2. Character entry screen: A–Z, space. 8-character max.
3. Player enters name using direction keys + A to confirm each character.
4. On confirm, a new `SaveFile` is created with default values:

```typescript
const DEFAULT_SAVE: Omit<SaveFile, 'slot' | 'playerName'> = {
  deathCount: 0,
  isSecondQuest: false,
  heartContainers: 3,
  inventory: DEFAULT_INVENTORY,
  dungeons: Array.from({ length: 9 }, (_, i) => createEmptyDungeonProgress(i)),
  overworld: { revealedSecrets: [], collectedItems: [], heartContainersCollected: [], oneTimeEventsCompleted: [] },
  progression: {
    triforceCount: 0,
    triforceFragments: Array(8).fill(false),
    ganonDefeated: false,
    zeldaRescued: false,
    isSecondQuest: false,
    visitedDungeonEntrances: [],
    startingSwordCollected: false,
    whiteSwordCollected: false,
    magicalSwordCollected: false,
  },
  killCounter: 0,
};

const DEFAULT_INVENTORY: Inventory = {
  swordLevel: 0,
  hasBoomerang: false,
  boomerangType: false,
  hasBombs: false,
  bombCount: 0,
  bombCapacity: 8,
  hasBow: false,
  arrowType: false,
  candleType: false,
  hasRecorder: false,
  hasFood: false,
  potionState: false,
  hasMagicRod: false,
  hasBook: false,
  ringLevel: 0,
  hasPowerBracelet: false,
  shieldType: 'standard',
  hasLadder: false,
  hasRaft: false,
  hasMagicKey: false,
  rupees: 0,
  keys: 0,
  selectedBItem: null,
};
```

Note: Link starts with a standard shield but no sword. The first action is typically to enter the cave at screen (7,7) to receive the wooden sword.

### Elimination (Delete File)

1. Player selects ELIMINATE.
2. Player selects which file to delete.
3. Confirmation prompt (UP to confirm, DOWN to cancel).
4. On confirm, the slot is set to `null`.

---

## 9. Runtime Game State (Non-Persisted)

Not all state is saved. The following is **runtime-only** and reconstructed on load:

```typescript
interface RuntimeGameState {
  /** Current game phase */
  phase: GamePhase;

  /** Link's current screen position (pixel coordinates) */
  linkPosition: { x: number; y: number };

  /** Link's current facing direction */
  linkFacing: Direction;

  /** Link's current HP in half-hearts */
  currentHP: number;

  /** Current active screen (overworld coordinate or dungeon room key) */
  currentScreen: string;

  /** Whether Link is currently in a dungeon */
  inDungeon: boolean;

  /** If in a dungeon, which dungeon index (0–8) */
  currentDungeonIndex: number | null;

  /** Active entities on the current screen (enemies, projectiles, items) */
  activeEntities: Entity[];

  /** Active screen transition state, if any */
  transition: TransitionState | null;

  /** Invincibility frames remaining */
  invincibilityFrames: number;

  /** Current animation state for Link */
  linkAnimationState: AnimationState;

  /** Sword beam active flag (true when currentHP === maxHP) */
  swordBeamAvailable: boolean;

  /** Frame-accurate game timer (resets on save load) */
  frameCounter: number;
}

type GamePhase =
  | 'TITLE'
  | 'FILE_SELECT'
  | 'GAMEPLAY'
  | 'PAUSE'
  | 'INVENTORY'
  | 'TRANSITION'
  | 'DEATH'
  | 'CONTINUE_SCREEN'
  | 'ENDING';
```

---

## 10. Type Definitions Summary

All types defined in this specification:

| Type | Kind | Section |
|------|------|---------|
| `SaveFile` | interface | 1 |
| `Inventory` | interface | 2 |
| `BItemSlot` | type union | 2 |
| `DungeonProgress` | interface | 3 |
| `DungeonRoomState` | interface | 3 |
| `Direction` | type union | 3 |
| `OverworldProgress` | interface | 5 |
| `OverworldSecret` | interface | 5 |
| `OverworldItemCollection` | interface | 5 |
| `ProgressionFlags` | interface | 6 |
| `SecondQuestChanges` | interface | 7 |
| `SaveFileStorage` | interface | 8 |
| `SaveFileWithVersion` | interface | 8 |
| `ContinueOption` | type union | 4 |
| `ContinueScreen` | interface | 4 |
| `RuntimeGameState` | interface | 9 |
| `GamePhase` | type union | 9 |
