# US-002: World and Map Representation Specification

Defines the overworld and dungeon structure as data-driven schemas for the NES Legend of Zelda TypeScript rebuild.

---

## 1. Tile Grid Dimensions

### Global Constants

| Constant | Value | Notes |
|----------|-------|-------|
| NES resolution | 256x240 px | Full output resolution |
| HUD height | 64 px | Top of screen |
| Play area | 256x176 px | Below HUD |
| Tile size | 16x16 px | Universal for all maps |
| Screen columns | 16 | 256 / 16 |
| Screen rows | 11 | 176 / 16 |
| Tiles per screen | 176 | 16 x 11 |
| Sub-pixel unit | 1/16 px | Internal position precision |

### Tile Indexing

- Tiles are indexed `(col, row)` where `(0, 0)` is the **top-left** tile of the play area.
- Column range: `0–15`. Row range: `0–10`.
- Tile position in pixels: `x = col * 16`, `y = row * 16` (relative to play area origin, not screen origin).
- The HUD occupies `y = 0–63` in screen space. The play area starts at screen `y = 64`.

### Tile Data

Each tile in a screen is represented by two values:

```typescript
interface TileData {
  /** Visual tile index into the tileset spritesheet (0–255) */
  tileId: number;
  /** Collision behavior */
  collision: TileCollision;
}

type TileCollision = 'SOLID' | 'PASSABLE' | 'WATER' | 'PIT' | 'STAIRS' | 'BUSH' | 'ROCK';
```

A screen's tile data is a flat array of 176 entries, stored in **row-major order** (left-to-right, top-to-bottom):

```typescript
type ScreenTileData = TileData[]; // length = 176 (16 * 11)

// Index formula: tiles[row * 16 + col]
```

---

## 2. Screen Adjacency Rules

### Overworld Adjacency

- The overworld is a **16-column x 8-row grid** of screens (128 total).
- Screens are addressed as `(screenCol, screenRow)` where `(0, 0)` is the **top-left** (northwest corner of the map).
- Column range: `0–15`. Row range: `0–7`.

**Adjacency is strictly cardinal and grid-based:**

| Direction | Adjacent Screen |
|-----------|----------------|
| Left | `(screenCol - 1, screenRow)` if `screenCol > 0` |
| Right | `(screenCol + 1, screenRow)` if `screenCol < 15` |
| Up | `(screenCol, screenRow - 1)` if `screenRow > 0` |
| Down | `(screenCol, screenRow + 1)` if `screenRow < 7` |

- If the adjacent screen would be out of bounds, **no transition occurs** — Link is simply blocked at the screen edge.
- There are **no wrap-around connections** in the overworld.

### Special Overworld Connections

Certain screens override standard adjacency:

- **Raft docks**: Walking onto a raft tile on a specific screen transitions to a non-adjacent screen (e.g., screen `(5, 2)` → screen `(5, 4)`). These are encoded as special `STAIRS`-type transitions with a target screen and position.
- **Recorder warp**: The recorder transports Link to one of several predefined warp destinations (dungeon entrance screens). These are not adjacency-based; they use a warp table.

### Dungeon Adjacency

- Each dungeon is an **independent grid** up to **8x8 rooms**.
- Not all grid positions contain rooms; unused positions are `null`.
- Adjacency follows the same cardinal grid rules, but doors control access:

```typescript
type DoorState = 'OPEN' | 'LOCKED' | 'SHUTTER' | 'BOMBABLE' | 'WALL';
```

| Door State | Behavior |
|------------|----------|
| `OPEN` | Always passable |
| `LOCKED` | Requires 1 key to open (consumed). Permanently open after unlocking. |
| `SHUTTER` | Opens when all enemies in the room are defeated. Resets on re-entry if enemies respawn. |
| `BOMBABLE` | Appears as `WALL` until a bomb explodes adjacent to it, then becomes `OPEN` permanently. Visual hint: cracked wall pattern. |
| `WALL` | Impassable. No room on the other side (or room exists but is not connected here). |

- Each room has **4 door slots** (up, down, left, right).
- The door state must be **symmetric**: if room A's right door is `LOCKED`, room B's left door (the same physical door) is also `LOCKED`.

---

## 3. Overworld vs. Dungeon Distinctions

### Overworld Properties

| Property | Overworld |
|----------|-----------|
| Grid size | 16x8 screens |
| Tile palette | Outdoor tileset (grass, trees, mountains, water, sand, graves) |
| Screen transition | Scroll (4 px/frame) |
| Enemy persistence | Enemies reset when screen is re-entered |
| Secrets | Hidden cave entrances (burn bush, bomb wall, push rock) |
| Navigation | Open grid; all screens accessible if not blocked by terrain |
| Music | Overworld theme (continuous across screens) |
| Darkness | Never dark |

### Dungeon Properties

| Property | Dungeon |
|----------|---------|
| Grid size | Up to 8x8 rooms per dungeon |
| Tile palette | Dungeon tileset (floor, blocks, statues, water, pits) |
| Screen transition | Instant cut (push through door) with brief fade (~8 frames) |
| Enemy persistence | Enemies respawn on room re-entry (except defeated bosses) |
| Secrets | Pushable blocks, bombable walls, defeated-enemy triggers |
| Navigation | Constrained by doors (locked, shutter, bombable) |
| Music | Dungeon theme (per-dungeon, resets on entry) |
| Darkness | Some rooms are dark until the player obtains a specific item (Blue Candle/Red Candle lights the room for the visit; permanent map reveal requires Triforce) |

### Transition Between Overworld and Dungeon

1. Link walks onto a dungeon entrance tile on the overworld (specific `STAIRS` tile).
2. **Fade to black** (16 frames).
3. Load dungeon map data. Set Link's position to the dungeon's entrance room and entrance tile.
4. **Fade in** (16 frames).
5. Exiting: Link walks up through the entrance door of room `(entranceCol, entranceRow)`, reversing the fade transition back to the overworld screen that contains the dungeon entrance.

---

## 4. Room Metadata Schema

### Overworld Screen Schema

```typescript
interface OverworldScreen {
  /** Grid position */
  screenCol: number;  // 0–15
  screenRow: number;  // 0–7

  /** Tile data: 176 tiles in row-major order */
  tiles: ScreenTileData;

  /** Enemies that spawn on this screen */
  enemySpawns: EnemySpawn[];

  /** Special entrances (caves, dungeon entries, stairways) */
  entrances: ScreenEntrance[];

  /** Items hidden on this screen (e.g., under a bush or armos) */
  hiddenItems: HiddenItem[];

  /** If true, secrets on this screen have been permanently revealed */
  secretsRevealed: boolean;

  /** Visual palette index (determines color scheme: green, brown, gray, etc.) */
  paletteId: number;  // 0–3

  /** Indicates if this screen has a special property */
  screenType: OverworldScreenType;
}

type OverworldScreenType =
  | 'NORMAL'          // Standard overworld screen
  | 'FAIRY_FOUNTAIN'  // Heals Link on entry
  | 'SHOP'            // Contains purchasable items
  | 'NPC_CAVE'        // Contains an NPC with dialogue/gift
  | 'DUNGEON_ENTRANCE'// Contains a dungeon entry point
  | 'WARP_POINT';     // Recorder destination

interface ScreenEntrance {
  /** Tile position of the entrance on this screen */
  tileCol: number;
  tileRow: number;

  /** Target location */
  target: EntranceTarget;

  /** Visual type of the entrance */
  entranceType: 'CAVE' | 'STAIRWAY' | 'DUNGEON' | 'DOCK';

  /** Condition to reveal (if hidden) */
  revealCondition?: RevealCondition;
}

type EntranceTarget =
  | { type: 'CAVE_ROOM'; caveId: string }
  | { type: 'DUNGEON'; dungeonId: number; roomCol: number; roomRow: number; entryTileCol: number; entryTileRow: number }
  | { type: 'OVERWORLD'; screenCol: number; screenRow: number; tileCol: number; tileRow: number }; // for raft/special warps

type RevealCondition =
  | { type: 'BURN_BUSH'; tileCol: number; tileRow: number }
  | { type: 'BOMB_WALL'; tileCol: number; tileRow: number }
  | { type: 'PUSH_ROCK'; tileCol: number; tileRow: number }
  | { type: 'PUSH_ARMOS'; tileCol: number; tileRow: number }
  | { type: 'ALWAYS_VISIBLE' };

interface HiddenItem {
  tileCol: number;
  tileRow: number;
  item: DropItem;
  revealCondition: RevealCondition;
  collected: boolean;
}

type DropItem = 'RUPEE' | 'FIVE_RUPEES' | 'HEART' | 'FAIRY' | 'BOMB' | 'CLOCK' | 'KEY'
  | 'HEART_CONTAINER' | 'TRIFORCE_FRAGMENT';
```

### Dungeon Room Schema

```typescript
interface DungeonRoom {
  /** Position within dungeon grid */
  roomCol: number;  // 0–7
  roomRow: number;  // 0–7

  /** Tile data: 176 tiles in row-major order */
  tiles: ScreenTileData;

  /** Door states for each direction */
  doors: {
    up: DoorState;
    down: DoorState;
    left: DoorState;
    right: DoorState;
  };

  /** Enemies that spawn in this room */
  enemySpawns: EnemySpawn[];

  /** Items/rewards in this room */
  items: RoomItem[];

  /** Whether the room is dark (requires candle to see) */
  isDark: boolean;

  /** Pushable block (if any) */
  pushBlock?: PushBlock;

  /** Room type for special behavior */
  roomType: DungeonRoomType;

  /** Visual palette for this room */
  paletteId: number;  // 0–3
}

type DungeonRoomType =
  | 'NORMAL'         // Standard enemy room
  | 'BOSS'           // Boss encounter
  | 'ITEM'           // Contains a major item reward
  | 'TRIFORCE'       // Contains the Triforce fragment
  | 'ENTRANCE'       // Dungeon entry point
  | 'PASSAGE'        // Stairway connecting two rooms
  | 'NPC'            // Old man with hint or item
  | 'TRAP';          // Room with traps (blade traps, fireballs)

interface PushBlock {
  tileCol: number;
  tileRow: number;
  pushDirection: Direction;  // Which direction it must be pushed
  effect: 'OPEN_SHUTTER' | 'REVEAL_STAIRWAY';
  activated: boolean;
}

interface RoomItem {
  /** Position in the room */
  tileCol: number;
  tileRow: number;

  /** What item this is */
  item: DropItem | MajorItem;

  /** When the item becomes available */
  availableCondition: 'ALWAYS' | 'ENEMIES_DEFEATED' | 'PUSH_BLOCK';

  /** Has the player collected this? */
  collected: boolean;
}

type MajorItem =
  | 'BOOMERANG' | 'MAGIC_BOOMERANG'
  | 'BOW' | 'SILVER_ARROW'
  | 'BLUE_CANDLE' | 'RED_CANDLE'
  | 'RECORDER'
  | 'FOOD'
  | 'MAGIC_ROD' | 'BOOK'
  | 'BLUE_RING' | 'RED_RING'
  | 'POWER_BRACELET'
  | 'LADDER'
  | 'RAFT'
  | 'MAGIC_KEY'
  | 'MAP' | 'COMPASS'
  | 'WHITE_SWORD' | 'MAGICAL_SWORD'
  | 'HEART_CONTAINER'
  | 'POTION_BLUE' | 'POTION_RED';
```

### Dungeon Definition Schema

```typescript
interface DungeonDefinition {
  /** Dungeon number (1–9) */
  dungeonId: number;

  /** Display name */
  name: string;

  /** Grid dimensions used (not all cells populated) */
  gridWidth: number;   // up to 8
  gridHeight: number;  // up to 8

  /** Room grid — null entries are empty/unused positions */
  rooms: (DungeonRoom | null)[][];  // [row][col]

  /** Entrance room position */
  entranceCol: number;
  entranceRow: number;

  /** Boss room position */
  bossCol: number;
  bossRow: number;

  /** Triforce room position */
  triforceCol: number;
  triforceRow: number;

  /** Boss enemy type */
  bossType: BossType;

  /** Palette/theme for this dungeon */
  dungeonPalette: number;

  /** Overworld screen containing this dungeon's entrance */
  overworldEntranceCol: number;
  overworldEntranceRow: number;
}

type BossType =
  | 'AQUAMENTUS'    // Dungeons 1, 7
  | 'DODONGO'       // Dungeons 2, 5
  | 'MANHANDLA'     // Dungeons 3, 8
  | 'GLEEOK'        // Dungeons 4, 6, 8 (2-head, 3-head, 4-head)
  | 'DIGDOGGER'     // Dungeons 5, 7
  | 'GOHMA'         // Dungeons 6, 8
  | 'GANON'         // Dungeon 9
  | 'PATRA';        // Dungeon 9 (mini-boss)
```

---

## 5. Enemy Spawn Rules

### Spawn Schema

```typescript
interface EnemySpawn {
  /** Enemy type identifier */
  enemyType: string;

  /** Variant (e.g., 'red', 'blue') */
  variant: string;

  /** Number of this enemy to spawn */
  count: number;

  /** Spawn positions — if provided, enemies spawn at these exact tiles.
      If omitted, enemies spawn at random valid positions. */
  positions?: { tileCol: number; tileRow: number }[];

  /** Spawn behavior */
  spawnBehavior: SpawnBehavior;
}

type SpawnBehavior =
  | 'IMMEDIATE'       // Appears as soon as screen loads (after transition delay)
  | 'EMERGE_GROUND'   // Rises from the ground (Leever, Zol)
  | 'EMERGE_WATER'    // Rises from water (Zora)
  | 'FLY_IN'          // Flies in from screen edge (Peahat, Keese)
  | 'FALL_FROM_ABOVE' // Falls from above (Wallmaster, triggered by proximity)
  | 'STATIONARY';     // Does not move from spawn position (trap, turret)
```

### Overworld Spawn Rules

1. **Screen-specific spawn lists**: Each overworld screen has a fixed `enemySpawns` array defining which enemies appear.
2. **Respawn on re-entry**: All enemies respawn every time Link enters the screen. There is no persistent enemy death tracking on the overworld.
3. **Spawn timing**: Enemies appear **15 frames** after the screen transition completes.
4. **Spawn positions**: If no explicit positions are given, enemies spawn at random `PASSABLE` tiles that are at least **3 tiles** away from Link's entry position.
5. **Maximum enemies per screen**: Up to **6 enemies** can be active simultaneously on an overworld screen. If the spawn list defines more, they are queued and spawn as others are defeated.
6. **Zora spawning**: Zoras spawn from `WATER` tiles, surfacing periodically (every 120–180 frames, randomized). They fire a projectile, then submerge. They do not count toward the 6-enemy limit.

### Dungeon Spawn Rules

1. **Room-specific spawn lists**: Each dungeon room has a fixed `enemySpawns` array.
2. **Respawn on re-entry**: Enemies respawn every time Link enters the room, **except**:
   - Boss rooms: once the boss is defeated, the room stays cleared permanently.
   - Rooms that grant items on enemy defeat: once cleared and item collected, enemies do not respawn.
3. **Spawn timing**: Enemies appear **immediately** when the room loads (no delay).
4. **Shutter door trigger**: Rooms with `SHUTTER` doors track a `remainingEnemies` counter. When it reaches 0, all shutter doors in the room open and a sound effect plays.
5. **Maximum enemies per room**: Up to **6 enemies** active simultaneously. Queuing works identically to overworld.
6. **Trap spawns**: Blade traps and fireball turrets are `STATIONARY` spawns that activate based on Link's position (same row or column for blade traps).

### Spawn Position Constraints

```typescript
interface SpawnConstraints {
  /** Minimum tile distance from Link on spawn */
  minDistanceFromLink: number;  // default: 3

  /** Valid collision types for spawn position */
  validTiles: TileCollision[];  // default: ['PASSABLE']

  /** Whether enemy can spawn on screen edges */
  allowEdgeSpawn: boolean;  // default: true

  /** For EMERGE_GROUND/WATER, the tile type the enemy emerges from */
  emergeTileType?: TileCollision;
}
```

### Enemy Screen Assignment Data Format

The complete overworld enemy assignment maps each screen to its spawn configuration:

```typescript
interface OverworldEnemyMap {
  /** Key: "screenCol,screenRow" */
  [screenKey: string]: {
    /** Enemy type pool for this screen */
    spawns: EnemySpawn[];
    /** Whether enemies spawn in a formation pattern */
    formation?: 'RANDOM' | 'CIRCLE' | 'LINE' | 'CORNERS';
  };
}
```

---

## 6. Warp and Special Transport

### Recorder Warp Destinations

The recorder cycles through warp destinations in order. Each destination is a dungeon entrance screen:

```typescript
interface WarpDestination {
  /** Dungeon number this warps to */
  dungeonId: number;
  /** Overworld screen coordinates of the dungeon entrance */
  screenCol: number;
  screenRow: number;
  /** Tile Link lands on */
  tileCol: number;
  tileRow: number;
}

// Warp destinations correspond to dungeons 1–8 (dungeon 9 is not warpable)
const warpDestinations: WarpDestination[] = [
  // Populated with all 8 dungeon entrance locations
];
```

### Raft Transport

- The raft activates automatically when Link walks onto a **dock tile** while possessing the raft item.
- There are exactly **2 dock tiles** in the overworld. Each connects to a specific destination screen and tile.
- Transport is a scroll animation in the dock's facing direction.

```typescript
interface RaftRoute {
  /** Source dock location */
  sourceScreen: { col: number; row: number };
  sourceTile: { col: number; row: number };
  /** Destination */
  destScreen: { col: number; row: number };
  destTile: { col: number; row: number };
  /** Direction of travel animation */
  direction: Direction;
}
```

---

## 7. Cave Room Schema

Caves are single-screen interiors accessed from overworld entrances:

```typescript
interface CaveRoom {
  /** Unique identifier */
  caveId: string;

  /** Cave type determines layout and behavior */
  caveType: CaveType;

  /** Tile data for the cave interior */
  tiles: ScreenTileData;

  /** NPC(s) in the cave */
  npcs: CaveNpc[];

  /** Items available (for shops, gifts) */
  items: CaveItem[];
}

type CaveType =
  | 'SHOP'           // 3 items for purchase
  | 'NPC_GIFT'       // Old man gives an item
  | 'NPC_HINT'       // Old man gives text hint
  | 'MONEY_GAME'     // Gambling game (pick one of 3 rupee amounts)
  | 'POTION_SHOP'    // Buy potions
  | 'SWORD_CAVE'     // Contains a sword upgrade
  | 'HEART_CAVE'     // Choose between items (e.g., "take any one you want")
  | 'PAY_OR_SUFFER'; // "Pay me or else" — lose rupees or take damage

interface CaveNpc {
  /** Sprite to display */
  spriteId: string;
  /** Dialogue text (displayed above/below NPC) */
  dialogue: string;
  /** Position in the cave */
  tileCol: number;
  tileRow: number;
}

interface CaveItem {
  /** Item type */
  item: MajorItem | DropItem;
  /** Cost in rupees (0 = free/gift) */
  cost: number;
  /** Position */
  tileCol: number;
  tileRow: number;
  /** Has been purchased/collected */
  collected: boolean;
}
```

---

## 8. Complete World Data Structure

The top-level world data combines all maps:

```typescript
interface WorldData {
  /** Overworld grid: [row][col], 8 rows x 16 cols */
  overworld: OverworldScreen[][];

  /** All 9 dungeons */
  dungeons: DungeonDefinition[];

  /** Cave room definitions */
  caves: Record<string, CaveRoom>;

  /** Recorder warp destinations */
  warpDestinations: WarpDestination[];

  /** Raft routes */
  raftRoutes: RaftRoute[];

  /** Starting screen for new game */
  startScreen: { col: number; row: number };  // (7, 7)

  /** Starting tile within start screen */
  startTile: { col: number; row: number };    // (7, 5) — center-bottom area

  /** Fairy fountain screen locations */
  fairyFountains: { screenCol: number; screenRow: number }[];
}
```

---

## Type Definitions Summary

```typescript
// Screen coordinates
type ScreenCoord = { col: number; row: number };

// Tile coordinates within a screen
type TileCoord = { col: number; row: number };

// Full world position
interface WorldPosition {
  screenCol: number;
  screenRow: number;
  tileCol: number;
  tileRow: number;
  /** Sub-pixel offset within the tile (0–15 each axis) */
  subX: number;
  subY: number;
}

// Map type discriminator
type MapContext = 'OVERWORLD' | 'DUNGEON' | 'CAVE';

// Transition types
type TransitionType =
  | 'SCROLL_LEFT' | 'SCROLL_RIGHT' | 'SCROLL_UP' | 'SCROLL_DOWN'
  | 'FADE_CAVE'
  | 'FADE_DUNGEON'
  | 'WARP'
  | 'RAFT';
```
