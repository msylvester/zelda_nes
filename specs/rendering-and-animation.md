# US-003: Rendering and Animation Model Specification

Defines deterministic rendering rules matching NES behavior for the Legend of Zelda TypeScript rebuild.

---

## 1. Tile Rendering Order

### Rendering Pipeline Overview

Each frame is rendered in a fixed order from back to front. The NES PPU draws in two layers — background tiles and sprites — which this spec mirrors:

1. **Background color** (black `#000000`)
2. **Background tile layer** (the tile grid for the current screen)
3. **Sprite layer** (entities, items, projectiles, effects)
4. **HUD layer** (always on top, never scrolled)

### Background Tile Rendering

- The play area is a 16x11 grid of 16x16 pixel tiles.
- Each tile references a `tileId` (0–255) into the active **tileset spritesheet**.
- Tiles are drawn left-to-right, top-to-bottom (row-major) using the same index order as tile data: `tiles[row * 16 + col]`.
- The active tileset is determined by the current map context:
  - `OVERWORLD` → overworld tileset
  - `DUNGEON` → dungeon tileset
  - `CAVE` → cave tileset (shared interior tileset)

### Tileset Spritesheets

```typescript
interface Tileset {
  /** Unique identifier */
  id: string;

  /** Source image (256x256 px spritesheet = 16x16 grid of 16x16 tiles) */
  image: string;

  /** Number of tile entries */
  tileCount: number; // up to 256

  /** Tile dimensions (always 16x16) */
  tileWidth: 16;
  tileHeight: 16;
}
```

- Tile index `tileId` maps to the spritesheet position:
  - `srcX = (tileId % 16) * 16`
  - `srcY = Math.floor(tileId / 16) * 16`

### Palette Application

The NES uses 4-color palettes for background tiles. Each screen has a `paletteId` (0–3) that selects the color palette:

```typescript
interface TilePalette {
  /** Palette index (0–3) */
  id: number;

  /** 4 colors: index 0 is transparent/background, 1–3 are tile colors */
  colors: [string, string, string, string]; // CSS color strings (e.g., "#00A800")
}
```

- In the NES, palette is applied per 2x2 tile block (attribute table). For simplicity in this implementation, each tileset image is pre-colored per palette variant. The `paletteId` selects which pre-colored tileset image to use.
- Overworld screens use 4 palette variants (green/forest, brown/desert, gray/mountain, blue/water-heavy).
- Dungeon rooms each specify a `paletteId` that maps to a dungeon color theme.

### Dark Rooms

- Dungeon rooms with `isDark: true` render all background tiles as solid black.
- Sprites (enemies, items) are **not visible** in dark rooms.
- Link's sprite is always visible.
- When the player uses a candle item, the room is illuminated for the duration of the visit:
  - All background tiles render normally.
  - All sprites become visible.
  - On room re-entry, darkness resets (unless the room is permanently lit by game logic).

---

## 2. Sprite Layering Rules

### Sprite Rendering Order

Sprites are rendered in a specific priority order. Higher-priority sprites are drawn **on top** of lower-priority sprites:

| Priority | Sprite Category | Examples |
|----------|----------------|----------|
| 0 (back) | Ground items / drops | Hearts, rupees, bombs on ground |
| 1 | Ground effects | Ladder bridge, raft wake |
| 2 | Enemies | All enemy sprites |
| 3 | Enemy projectiles | Fireballs, boomerangs thrown by enemies |
| 4 | Player (Link) | Link's sprite |
| 5 | Player weapons/projectiles | Sword, boomerang, arrows, bombs (in-flight), beam |
| 6 | Overhead effects | Explosions, death puffs, sparkles |
| 7 (front) | Screen-level effects | Flash (damage flash, triforce flash), fade overlay |

```typescript
type SpritePriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
```

### NES Sprite Limit Emulation

The NES hardware limits **8 sprites per scanline** (horizontal line). When more than 8 sprites share a scanline, the lowest-priority sprites flicker (toggle visibility every other frame). This is an iconic NES visual artifact:

```typescript
interface SpriteFlickerConfig {
  /** Whether to emulate NES sprite flicker */
  enabled: boolean; // default: true

  /** Maximum sprites per scanline before flickering activates */
  maxSpritesPerScanline: 8;

  /** Flicker alternates visibility every N frames */
  flickerInterval: 1; // toggle every frame (60Hz flicker)
}
```

- When flicker is enabled and a scanline has >8 sprites, the renderer cycles which sprites are hidden on alternating frames, spreading the flicker across all affected sprites (round-robin).
- Sprites with priority >= 4 (Link, player weapons) are **never flickered**.

### Sprite Sheet Structure

All game entities use sprites from a shared sprite sheet:

```typescript
interface SpriteSheet {
  /** Source image */
  image: string;

  /** Individual sprite definitions */
  sprites: Record<string, SpriteDefinition>;
}

interface SpriteDefinition {
  /** Position in the sprite sheet */
  srcX: number;
  srcY: number;

  /** Size in pixels (most are 16x16; bosses may be 16x32 or 32x32) */
  width: number;
  height: number;

  /** Anchor point for positioning (default: top-left) */
  anchorX: number; // default: 0
  anchorY: number; // default: 0
}
```

### Sprite Rendering Rules

1. **Position**: Sprites are positioned in pixel coordinates relative to the play area origin (0, 0) at the top-left of the play area, NOT the screen. The HUD offset (64px) is added by the renderer.
2. **Flipping**: Sprites can be flipped horizontally and/or vertically to reuse frames for different facing directions.
3. **Clipping**: Sprites that extend beyond the play area boundaries (0–255 horizontally, 0–175 vertically) are clipped. No wrap-around.
4. **Transparency**: Sprite pixel color index 0 is transparent.

```typescript
interface SpriteRenderCommand {
  /** Sprite definition key */
  spriteKey: string;

  /** World position (pixels, relative to play area) */
  x: number;
  y: number;

  /** Rendering transforms */
  flipX: boolean;
  flipY: boolean;

  /** Priority layer */
  priority: SpritePriority;

  /** Palette override (for color-variant enemies: red vs blue) */
  paletteId?: number;

  /** Visibility (for flashing/invincibility effects) */
  visible: boolean;
}
```

---

## 3. Animation Frame Timing

### Frame Rate

- The game runs at **60 frames per second** (matching the NES NTSC refresh rate).
- All animation timings are defined in **frames** (1 frame = 1/60th second).
- The game loop is a fixed-timestep loop: each tick advances exactly 1 frame of game logic and renders 1 frame.

```typescript
interface FrameTimingConstants {
  /** Target FPS */
  targetFps: 60;

  /** Frame duration in milliseconds */
  frameDurationMs: 16.667; // 1000 / 60

  /** If a frame takes longer than this, skip rendering (don't accumulate) */
  maxFrameSkip: 3;
}
```

### Animation System

Animations are defined as sequences of sprite frames with per-frame durations:

```typescript
interface Animation {
  /** Unique name (e.g., "link_walk_down", "octorok_move_left") */
  name: string;

  /** Ordered list of frames */
  frames: AnimationFrame[];

  /** Whether the animation loops */
  loop: boolean;

  /** Callback on completion (for non-looping animations) */
  onComplete?: 'DESTROY' | 'HOLD_LAST' | 'RESET';
}

interface AnimationFrame {
  /** Sprite key to display for this frame */
  spriteKey: string;

  /** Duration in game frames (ticks) this frame is displayed */
  duration: number;

  /** Optional hitbox active during this frame (for attack animations) */
  hitboxActive?: boolean;

  /** Optional sprite offset from entity position */
  offsetX?: number;
  offsetY?: number;
}
```

### Link Animations

| Animation | Frames | Frame Durations | Loop | Notes |
|-----------|--------|-----------------|------|-------|
| Idle (per direction) | 1 | — | No | Static facing sprite |
| Walk (per direction) | 2 | 8, 8 | Yes | Alternates feet |
| Sword attack (per direction) | 4 | 1, 4, 3, 4 | No | Frame 2–3 have active hitbox |
| Sword beam fire | 2 | 3, 3 | Yes | Applied to beam projectile |
| Use item (per direction) | 3 | 2, 6, 4 | No | Item appears on frame 2 |
| Knockback | 1 | 16 | No | Uses damage sprite (flashing) |
| Invincibility flash | 1 | 4 | Yes | Toggles `visible` every 4 frames for 60 frames |
| Death spin | 4 | 4, 4, 4, 4 | Yes | Cycles through 4 direction sprites, loops ~4 times |
| Death explode | 4 | 2, 2, 2, 2 | No | 4 sprites fly outward from center |
| Pickup item (major) | 1 | 60 | No | Link holds item overhead, item sprite drawn above |
| Pickup item (minor) | — | — | No | No pickup animation for minor items |

### Enemy Animations

Most enemies use 2-frame walk cycles:

| Animation | Frames | Frame Durations | Loop |
|-----------|--------|-----------------|------|
| Walk (per direction) | 2 | 8, 8 | Yes |
| Damage flash | 1 | 2 | Yes (4 cycles) |
| Death puff | 3 | 4, 4, 4 | No |

Specific enemy animation exceptions:

| Enemy | Variation |
|-------|-----------|
| Keese | 2 frames, duration 4 each (faster wing flap) |
| Peahat | 2 frames, duration 2 each (very fast spin) |
| Tektite | 2 frames: landed (variable duration 30–90 frames), airborne (16 frames) |
| Zora | 3 frames: submerged (invisible), emerging (8 frames), surfaced (30 frames, then fires) |
| Wallmaster | 2 frames, duration 6 each; only animated while active/moving |
| Like Like | 2 frames, duration 10 each (slow pulsing) |
| Gel/Zol | 2 frames, duration 6 each |
| Wizzrobe | 2 frames: visible (24 frames), invisible/teleporting (16 frames) |

### Boss Animations

| Boss | Sprite Size | Frames | Notes |
|------|-------------|--------|-------|
| Aquamentus | 32x32 | 2 frames, duration 8 each | Mouth open/closed cycle |
| Dodongo | 32x16 | 2 frames per direction, duration 8 each | Larger collision box |
| Manhandla | 32x32 | 2 frames, duration 6 each | 4 detachable hand segments, each 16x16 |
| Gleeok | 32x32 (body) + 16x16 (heads) | 2 frames, duration 6 each | Heads on neck chains; detached heads float independently |
| Digdogger | 32x32 (big) / 16x16 (small) | 2 frames, duration 4 each | Splits into 3 small copies when recorder is used |
| Gohma | 32x16 | 3 frames (eye closed, half-open, open), duration 16 each | Only vulnerable when eye is open |
| Patra | 16x16 (core) + 8x8 (orbitals) | 2 frames, duration 4 each | Orbital sprites rotate around core |
| Ganon | 32x32 | Invisible until hit; 2 frames visible (8 each) | Turns brown when vulnerable to silver arrow |

### Projectile Animations

| Projectile | Frames | Duration | Notes |
|------------|--------|----------|-------|
| Sword beam | 2 | 3 each | Spinning sprite |
| Arrow | 1 | — | Static, rotated per direction |
| Boomerang | 4 | 2 each | Spinning in flight |
| Bomb (placed) | 1 | 60 total | Static until explosion |
| Bomb explosion | 3 | 4, 4, 4 | Expanding cloud |
| Candle flame | 2 | 4 each | Flickering |
| Magic rod beam | 2 | 3 each | Similar to sword beam |
| Enemy fireball | 2 | 3 each | Spinning |
| Zora fireball | 2 | 3 each | Distinct sprite from generic fireball |

---

## 4. Camera Behavior

### Overworld Camera

- The camera is **screen-locked**: it shows exactly one 256x176 screen at a time with no sub-pixel scrolling during gameplay.
- The camera does NOT follow Link. Link moves within the fixed screen boundaries.
- The play area viewport is at a fixed offset of `(0, 64)` in screen space (below the HUD).

### Screen Transition Camera

During a screen transition (triggered by Link walking off-screen):

```typescript
interface ScrollTransition {
  /** Direction of scroll */
  direction: Direction;

  /** Speed in pixels per frame */
  speed: 4;

  /** Total scroll distance in pixels */
  totalDistance: number; // 256 for horizontal, 176 for vertical

  /** Current scroll offset */
  currentOffset: number;

  /** Duration in frames */
  totalFrames: number; // 64 for horizontal, 44 for vertical
}
```

- **Horizontal transition**: The current screen and new screen are rendered side by side. The viewport pans left or right at 4 px/frame for 64 frames (256 pixels).
- **Vertical transition**: The viewport pans up or down at 4 px/frame for 44 frames (176 pixels).
- During transition, **both screens** are rendered simultaneously (the departing screen sliding out, the arriving screen sliding in).
- Link's sprite slides with the transition, maintaining his relative position to the departing screen edge.
- No game logic updates during transition (enemies frozen, no input processed).

### Dungeon Room Transition

- Dungeon transitions use an **instant cut** with a brief fade:
  1. Screen fades to black over **4 frames** (opacity 0% → 100%).
  2. New room tile data and sprites are loaded (1 frame, not visible).
  3. Screen fades in over **4 frames** (opacity 100% → 0%).
- Link is repositioned at the entry door of the new room.
- Total transition: **9 frames** (~150ms).

### Cave / Dungeon Entry Transition

- Overworld → Cave / Dungeon entry uses a **column-wipe** effect:
  1. Black columns close in from left and right edges toward center over **16 frames**.
  2. New screen loaded while fully black (1 frame).
  3. Black columns open from center to edges over **16 frames**.
- Total transition: **33 frames** (~550ms).

### No Camera Shake

The original NES Zelda has no camera shake effects. The camera is always perfectly stable.

---

## 5. HUD Rendering

### HUD Layout

The HUD occupies the top **64 pixels** of the 256x240 screen. It is rendered **after** the play area and is never affected by screen transitions or scrolling.

```
┌──────────────────────────────────────────────────────┐  y=0
│  INVENTORY                                            │
│  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │ B-button  │  │ MAP / DUNGEON LAYOUT              │  │  y=8
│  │ item icon │  │                                    │  │
│  │           │  │                                    │  │
│  └──────────┘  └──────────────────────────────────┘  │  y=32
│  -LIFE-          ♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥♥                    │  y=40
│  ┌─────┐        (heart display, max 16)               │
│  │RUPEE│ x 042   A:[] B:[]                            │  y=48
│  │KEYS │ x 05    BOMBS x 04                          │  y=56
│  └─────┘                                              │
└──────────────────────────────────────────────────────┘  y=64
```

### HUD Sections

```typescript
interface HudLayout {
  /** Minimap area */
  minimap: {
    x: 16;
    y: 8;
    width: 64;
    height: 32;
  };

  /** B-button item display */
  bButtonItem: {
    x: 128;
    y: 8;
    width: 16;
    height: 16;
  };

  /** A-button item display (sword indicator) */
  aButtonItem: {
    x: 152;
    y: 8;
    width: 16;
    height: 16;
  };

  /** Heart row */
  hearts: {
    x: 176;
    y: 40;
    /** Hearts per row */
    heartsPerRow: 8;
    /** Spacing between hearts */
    heartWidth: 8;
    heartHeight: 8;
  };

  /** Rupee counter */
  rupees: {
    x: 96;
    y: 16;
  };

  /** Key counter */
  keys: {
    x: 96;
    y: 24;
  };

  /** Bomb counter */
  bombs: {
    x: 96;
    y: 32;
  };
}
```

### Heart Display

Hearts are rendered to show Link's current HP:

```typescript
type HeartState = 'FULL' | 'HALF' | 'EMPTY';

function renderHearts(currentHp: number, maxHp: number): HeartState[] {
  const containerCount = maxHp / 2;
  const hearts: HeartState[] = [];
  for (let i = 0; i < containerCount; i++) {
    const hpForThisHeart = currentHp - i * 2;
    if (hpForThisHeart >= 2) hearts.push('FULL');
    else if (hpForThisHeart === 1) hearts.push('HALF');
    else hearts.push('EMPTY');
  }
  return hearts;
}
```

- Hearts display on two rows if Link has >8 containers (row 1: containers 1–8, row 2: containers 9–16).
- Full heart: red filled. Half heart: left-half red, right-half black. Empty heart: outline only.

### Minimap Display

#### Overworld Minimap
- Shows the full 16x8 overworld grid as tiny dots.
- Each screen = 1 pixel dot.
- Link's current screen is shown as a **blinking green dot** (toggle every 16 frames).
- Unvisited screens are dimmed; visited screens are brighter.
- Dungeon entrances are **not** marked on the overworld minimap.

#### Dungeon Minimap
- If Link has the dungeon **Map** item: shows the full room layout as dots.
- If Link does NOT have the Map: shows only rooms Link has visited.
- If Link has the **Compass**: the Triforce room blinks red.
- Link's current room is shown as a blinking green dot.
- Room dots are color-coded: gray for unvisited, white for visited.

### HUD Text Rendering

- All HUD text uses an **8x8 pixel monospaced font** matching the NES Zelda typeface.
- Characters: A–Z (uppercase only), 0–9, and a handful of special characters (♥, ×, -, space).
- No lowercase letters.
- Text color is white unless palette-specific.

```typescript
interface HudFont {
  /** Character set available */
  charset: string; // "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -x♥."

  /** Character dimensions */
  charWidth: 8;
  charHeight: 8;

  /** Source spritesheet containing character glyphs */
  image: string;
}
```

### Rupee/Key/Bomb Counter Display

- Format: `x NNN` where NNN is the count, left-padded with spaces (not zeros).
- Rupee icon is a small diamond sprite.
- Key icon is a small key sprite.
- Bomb icon is a small bomb sprite.
- Counter text is white 8x8 font.

---

## 6. Screen-Level Visual Effects

### Damage Flash

When Link takes damage:
1. The entire screen (play area only, not HUD) flashes **red** for **1 frame**.
2. Normal rendering resumes.

### Invincibility Flashing

- Link's sprite toggles `visible` every **4 frames** for **60 frames** after taking damage.
- This creates a ~7.5 Hz flicker effect.

### Enemy Death Effect

When an enemy is killed:
1. Enemy sprite is replaced by a **puff animation**: 3 frames expanding outward (4 frames each, 12 frames total).
2. The puff is white/blue depending on the enemy palette.
3. After the puff, a **drop item** may appear at the enemy's position (if the drop table grants one).

### Item Pickup Flash

When Link collects a **major item** (new weapon, heart container, Triforce fragment):
1. Screen pauses for **30 frames**.
2. Link plays the **pickup pose** (item held overhead).
3. For Triforce fragments: the screen flashes white 3 times (8 frames on, 8 frames off, repeat) before returning to normal.

### Fade Effects

```typescript
type FadeType = 'FADE_TO_BLACK' | 'FADE_FROM_BLACK' | 'COLUMN_WIPE_CLOSE' | 'COLUMN_WIPE_OPEN';

interface FadeEffect {
  type: FadeType;

  /** Duration in frames */
  duration: number;

  /** Current progress (0.0 to 1.0) */
  progress: number;
}
```

- `FADE_TO_BLACK`: Linear opacity increase of a black overlay (0% → 100%).
- `FADE_FROM_BLACK`: Linear opacity decrease of a black overlay (100% → 0%).
- `COLUMN_WIPE_CLOSE`: Black columns advance from left/right edges toward center.
- `COLUMN_WIPE_OPEN`: Black columns recede from center toward edges.

### Low Health Warning

When Link's HP is ≤ 2 half-hearts (1 full heart or less):
- A repeating **beep** sound effect plays (handled by audio system).
- No visual change to the HUD hearts themselves (they are simply displayed as HALF or FULL as normal). The beep is the only indicator beyond the heart display.

---

## 7. Pause/Inventory Screen Rendering

### Pause Screen Layout

When the player pauses, the HUD remains visible and the play area is replaced with the inventory screen:

```
┌──────────────────────────────────────────────┐  y=0
│  [Standard HUD - same as gameplay]            │
├──────────────────────────────────────────────┤  y=64
│                                                │
│  INVENTORY                                     │
│  ┌──┬──┬──┬──┐                                │
│  │🔵│💣│🏹│🕯│  ← Selectable B-items           │
│  ├──┼──┼──┼──┤                                │
│  │🎵│🍖│🔮│📕│                                │
│  └──┴──┴──┴──┘                                │
│                                                │
│  USE B BUTTON                                  │
│  FOR SELECTION                                 │
│                                                │
│  TRIFORCE:  △△△△△△△△                          │
│                                                │
│  ┌─────────────────┐                          │
│  │  DUNGEON MAP     │                          │
│  │  (if in dungeon) │                          │
│  └─────────────────┘                          │
│                                                │
└──────────────────────────────────────────────┘  y=240
```

### Inventory Grid

```typescript
interface InventoryScreen {
  /** Grid of B-button selectable items (2 rows x 4 columns) */
  itemGrid: {
    rows: 2;
    cols: 4;
    cellSize: 24; // pixels per cell
    startX: 128;
    startY: 72;
  };

  /** Currently selected cell */
  cursorPosition: { row: number; col: number };

  /** Cursor blink rate */
  cursorBlinkFrames: 16; // toggle every 16 frames

  /** Items are displayed as 16x16 sprites centered in each cell */
  /** Uncollected items show as empty cells (no sprite) */
}
```

- The cursor is a **flashing rectangle** around the selected item cell.
- D-pad moves the cursor between cells.
- Pressing Start (pause button) again closes the inventory and resumes gameplay.
- The currently equipped B-item is highlighted with a different color background.

### Triforce Display

- 8 small triangle sprites in a row.
- Collected fragments are filled/golden.
- Uncollected fragments are outline/gray.

---

## 8. Rendering Constants Summary

```typescript
interface RenderingConstants {
  /** Screen dimensions */
  screenWidth: 256;
  screenHeight: 240;

  /** Play area */
  playAreaX: 0;
  playAreaY: 64;
  playAreaWidth: 256;
  playAreaHeight: 176;

  /** HUD area */
  hudX: 0;
  hudY: 0;
  hudWidth: 256;
  hudHeight: 64;

  /** Tile dimensions */
  tileSize: 16;
  tilesPerRow: 16;
  tilesPerCol: 11;

  /** Canvas scaling (NES resolution → display) */
  baseScale: number; // default: 3 (768x720 display)

  /** Sprite transparency color index */
  transparentColorIndex: 0;

  /** Flicker */
  maxSpritesPerScanline: 8;

  /** Animation */
  targetFps: 60;
}
```

### Canvas Setup

```typescript
interface CanvasConfig {
  /** Internal resolution (NES native) */
  internalWidth: 256;
  internalHeight: 240;

  /** Display scale factor (integer scaling for crisp pixels) */
  scaleFactor: number; // default: 3

  /** Rendering context settings */
  imageSmoothingEnabled: false; // nearest-neighbor scaling for pixel art
  alpha: false; // opaque canvas, no compositing needed
}
```

- The canvas renders at 256x240 internally using `CanvasRenderingContext2D`.
- The canvas CSS dimensions are set to `256 * scaleFactor` x `240 * scaleFactor`.
- `imageSmoothingEnabled = false` ensures pixel-perfect scaling with no blurring.
- The scale factor is configurable but defaults to 3 (768x720 display window).

---

## Type Definitions Summary

```typescript
// Sprite priority layer
type SpritePriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Animation completion behavior
type AnimationOnComplete = 'DESTROY' | 'HOLD_LAST' | 'RESET';

// Heart display state
type HeartState = 'FULL' | 'HALF' | 'EMPTY';

// Fade/transition visual type
type FadeType = 'FADE_TO_BLACK' | 'FADE_FROM_BLACK' | 'COLUMN_WIPE_CLOSE' | 'COLUMN_WIPE_OPEN';

// Render layer ordering
type RenderLayer = 'BACKGROUND' | 'SPRITES' | 'HUD' | 'OVERLAY';

// Supported tilesets
type TilesetId = 'OVERWORLD' | 'DUNGEON' | 'CAVE';

// Map context for tileset selection
type MapContext = 'OVERWORLD' | 'DUNGEON' | 'CAVE';
```
