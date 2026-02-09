# US-001: Core Game Systems Specification

Defines all fundamental game systems for the NES Legend of Zelda TypeScript rebuild.

---

## 1. Player Movement and Collision Model

### Grid and Coordinate System
- The game world uses a **256x176 pixel** play area (NES resolution 256x240 minus 64px HUD).
- Movement operates on a **16x16 pixel tile grid** (16 columns x 11 rows of playable tiles).
- Link's hitbox is **16x16 pixels**, aligned to an 8-pixel sub-grid for movement.
- Internal position is tracked in **sub-pixels** (1/16th pixel) for smooth movement.

### Movement Rules
- Link moves in **4 cardinal directions** (up, down, left, right). No diagonal movement.
- Movement speed: **1.5 pixels per frame** (90 pixels/second at 60 FPS).
- When a direction is pressed, Link **snaps to the nearest 8-pixel column/row** on the perpendicular axis to align with the tile grid. This enables passing through single-tile gaps.
- Direction changes are **instant** — no acceleration or deceleration.
- Only **one direction** is active at a time. Priority order when multiple keys held: most recently pressed wins.

### Collision Detection
- Collision is checked **before** movement is applied (predictive).
- Link's collision box is a **subset** of his sprite: 8x8 pixels centered at the bottom of the sprite (feet area). This allows visual overlap with walls at the top of the sprite.
- Solid tiles block movement entirely on that axis. Link slides along walls if a perpendicular component is possible.
- Collision is checked against the **tile map** (static) and **entity list** (dynamic).
- Tile collision types:
  - `SOLID` — fully impassable
  - `PASSABLE` — no collision
  - `WATER` — impassable unless Link has the Ladder item (then treated as passable with a bridge sprite placed)
  - `PIT` — impassable; damages Link if forced onto it
  - `STAIRS` — triggers screen transition or cave entry
  - `BUSH` — solid until cut with sword, then passable (may drop item)
  - `ROCK` — solid; movable with Power Bracelet (one push in facing direction)

### Knockback
- When Link takes damage, he is knocked back in the **opposite direction of the damage source**.
- Knockback distance: **16 pixels** over **16 frames** (linear interpolation).
- During knockback, Link is **invulnerable** and **cannot act** (no movement, no attacks).
- After knockback, Link has **~1 second (60 frames) of invincibility** with a flashing sprite (toggle visibility every 4 frames).

---

## 2. Combat System

### Sword Attack
- Link attacks with his sword in the **direction he is currently facing**.
- Sword hitbox: **16x8 pixels** (horizontal attack) or **8x16 pixels** (vertical attack), positioned adjacent to Link's sprite in the facing direction.
- Sword is active for **frames 2–8** of the attack animation (7-frame active window out of a ~12-frame animation).
- Link **cannot move** during the sword swing animation.
- Sword can hit multiple enemies in one swing if their hitboxes overlap the sword hitbox.
- **Sword beam**: When Link is at full health, the sword swing also fires a projectile:
  - Travels in the facing direction at **3 pixels/frame**.
  - Same hitbox dimensions as the melee sword.
  - Despawns on hitting an enemy, solid tile, or screen edge.
  - Only **one beam projectile** can exist at a time.

### Sword Tiers
| Tier | Name | Base Damage |
|------|------|-------------|
| 1 | Wooden Sword | 1 |
| 2 | White Sword | 2 |
| 3 | Magical Sword | 4 |

### Damage Calculation
- **Link → Enemy**: `swordDamage = swordTier.baseDamage * (hasRing ? ringMultiplier : 1)`. Note: rings affect defense, not offense. Sword damage is simply `baseDamage`. Some enemies have specific resistances (damage multiplied by 0, 0.5, or 1 depending on enemy type).
- **Enemy → Link**: `damageTaken = enemyContactDamage - defenseReduction`. Defense reduction from Blue Ring halves damage; Red Ring quarters it. Minimum damage is **0.5 hearts**.
- Damage is measured in **half-hearts**. All damage values are integers representing half-hearts.

### Enemy Damage Table (contact damage, half-hearts)
| Enemy Type | Damage |
|------------|--------|
| Octorok | 1 |
| Tektite | 1 |
| Leever | 2 |
| Peahat | 2 |
| Zora | 2 |
| Lynel | 2 (blue: 4) |
| Moblin | 1 (blue: 2) |
| Darknut | 2 (blue: 4) |
| Wizzrobe | 2 (blue: 4) |
| Gibdo | 2 |
| Like Like | 2 |
| Stalfos | 1 |
| Keese | 1 |
| Gel/Zol | 1 |
| Goriya | 1 (blue: 2) |
| Rope | 1 |
| Wallmaster | 2 |

### Enemy HP Table (half-hearts equivalent)
| Enemy Type | HP |
|------------|-----|
| Octorok (red) | 1 |
| Octorok (blue) | 2 |
| Tektite (red) | 1 |
| Tektite (blue) | 2 |
| Leever (red) | 2 |
| Leever (blue) | 4 |
| Peahat | 2 |
| Zora | 2 |
| Lynel (red) | 4 |
| Lynel (blue) | 6 |
| Moblin (red) | 2 |
| Moblin (blue) | 3 |
| Darknut (red) | 4 |
| Darknut (blue) | 6 |
| Wizzrobe (red) | 3 |
| Wizzrobe (blue) | 6 |
| Gibdo | 6 |
| Like Like | 4 |
| Stalfos | 2 |
| Keese | 1 |
| Gel | 1 |
| Zol | 2 |
| Goriya (red) | 2 |
| Goriya (blue) | 4 |
| Rope | 1 |
| Wallmaster | 4 |

### Item Weapons (B-button items)
| Item | Behavior |
|------|----------|
| Boomerang | Travels 5 tiles forward then returns. Stuns enemies for 60 frames. Blue boomerang travels full screen. |
| Bombs | Placed at Link's position. Explodes after 60 frames. 8-pixel blast radius. 4 damage. Max 8 carried. |
| Bow + Arrow | Fires in facing direction at 3px/frame. 2 damage (silver arrow: 4). Costs 1 rupee per shot. |
| Candle | Fires a flame projectile in facing direction. Travels 4 tiles. 1 damage, burns bushes. Blue candle: once per screen. Red candle: unlimited. |
| Recorder | Triggers warp, defeats specific enemies (Digdogger). |
| Food | Placed as bait, attracts Goriya-type enemies. |
| Magic Rod | Fires projectile in facing direction. 2 damage. With Book: projectile leaves flame on ground. |
| Potion | Restores all hearts. Blue potion: 2 uses. Red potion: 1 use. |

---

## 3. World Navigation (Screens and Transitions)

### Screen Structure
- The overworld is a **16x8 grid** of screens (128 screens total).
- Each screen is **256x176 pixels** (16x11 tiles).
- Dungeons are **separate maps** of up to **8x8 rooms** per dungeon.
- The player starts at **screen (7, 7)** (0-indexed from top-left).

### Screen Transitions
- When Link walks off any edge of the screen, a **scroll transition** begins.
- Transition scrolling: The new screen scrolls in from the direction Link exited at **4 pixels/frame** (64 frames for a full horizontal transition, 44 for vertical).
- During transition, **no gameplay occurs** — enemies freeze, Link cannot act.
- After transition completes, Link is placed at the opposite edge, inset by 8 pixels.
- Enemies on the new screen **spawn after** the transition completes (with a brief delay of ~15 frames).

### Cave/Stairway Entries
- Certain tiles act as **entrances** (cave mouths, stairways).
- Walking onto an entrance tile triggers a **fade-to-black transition** (16 frames), loads the target room, then **fade-in** (16 frames).
- Cave interiors are **single-screen rooms** with NPCs or item rewards.
- Dungeon stairways connect two rooms within the dungeon (often skipping over rooms).

### Dungeon Navigation
- Dungeon rooms use **locked doors** requiring a key, **bombable walls** (visually distinct cracks), and **shutter doors** (open when all enemies in room are defeated).
- Each dungeon has a **map** and **compass** item:
  - Map: reveals room layout on the pause screen.
  - Compass: reveals Triforce piece location.
- Dungeon rooms can have **pushable blocks** (one per room, specific tile) that open secret passages.

---

## 4. Inventory and Item Usage

### Inventory Structure
```typescript
interface Inventory {
  // Weapons
  swordTier: 0 | 1 | 2 | 3;          // 0 = none
  boomerang: 'none' | 'wood' | 'magic';
  bombs: number;                       // 0–8 (upgradeable to 12, then 16)
  bow: boolean;
  arrowTier: 0 | 1 | 2;              // 0 = none, 1 = arrow, 2 = silver arrow
  candle: 'none' | 'blue' | 'red';
  recorder: boolean;
  food: boolean;
  magicRod: boolean;
  book: boolean;

  // Equipment
  ring: 'none' | 'blue' | 'red';
  powerBracelet: boolean;
  ladder: boolean;
  raft: boolean;
  magicKey: boolean;

  // Consumables
  rupees: number;                      // 0–255
  keys: number;                        // 0–255 (per-game, not per-dungeon)
  potionType: 'none' | 'blue' | 'red';
  heartContainers: number;            // 3–16

  // Progression
  triforceFragments: boolean[];       // 8 entries, one per dungeon
  hasMap: boolean[];                  // per dungeon
  hasCompass: boolean[];              // per dungeon
}
```

### B-Button Item Selection
- The pause/inventory screen allows selecting one **B-button item** from collected items.
- Only one B-button item can be equipped at a time.
- The A button always uses the sword (if Link has one).
- B button uses the currently equipped item.

### Item Acquisition
- Items are acquired from:
  - **Shops** (cost rupees)
  - **Dungeon rewards** (defeating boss, opening chest)
  - **NPC gifts** (cave old men)
  - **Enemy drops** (random drop table)
  - **Secret rooms** (bombing walls, pushing blocks, burning bushes)

### Enemy Drop Table
- When an enemy is killed, a **drop group** is selected based on a global kill counter (cycles through groups A–D).
- Each group has a fixed loot table:

| Group | Drops (equal probability within group) |
|-------|----------------------------------------|
| A | Rupee, Heart, Rupee, Fairy |
| B | Bomb, Rupee, Clock, Rupee |
| C | Rupee, Heart, Rupee, Rupee |
| D | Heart, Fairy, Rupee, Heart |

- Drop chance: **~32%** per kill (determined by a pseudo-random counter).

---

## 5. Health, Death, and Continue Logic

### Health System
- Health is measured in **heart containers**.
- Link starts with **3 heart containers**, max **16**.
- Each container = **2 half-hearts** of HP.
- Starting HP: 6 half-hearts. Max HP: 32 half-hearts.
- The HUD displays hearts as: full (red), half (half-red), empty (outline).

### Healing
- **Heart drops**: Restore 1 full heart (2 half-hearts).
- **Fairy drops**: Restore 3 full hearts (6 half-hearts).
- **Potion**: Restores all hearts.
- **Fairy fountain**: Entering a fairy fountain screen restores all hearts.

### Death
- When HP reaches 0, Link's **death animation** plays:
  1. Link spins in place (rotating through 4 directional sprites) for ~60 frames.
  2. Link's sprite turns red/darkens.
  3. Link's sprite "explodes" outward in 4 directions (8 frames).
  4. Screen fades to black.
- Death animation total: ~90 frames (~1.5 seconds).

### Continue / Game Over
- After death, the **continue screen** appears with options:
  - **Continue**: Link respawns at the **starting position** of the current area:
    - Overworld deaths → respawn at screen (7, 7) (game start location).
    - Dungeon deaths → respawn at the **dungeon entrance room**.
  - **Save**: Game state is saved and returned to the title screen.
  - **Retry**: (second quest only) same as Continue.
- On continue:
  - Link has **3 full hearts** regardless of max containers.
  - All items are **retained**.
  - All permanent world changes (collected items, defeated bosses) are **retained**.
  - Enemy kills on the current screen are **reset** (enemies respawn).
  - Keys, bombs, and rupees are **retained** at their values before death.

### Invincibility Frames
- After taking damage: **60 frames** of invincibility with flashing sprite.
- After screen transition: **0 frames** (Link is immediately vulnerable).
- During knockback: Link is invulnerable for the duration of knockback (16 frames), then the 60-frame invincibility window starts.

---

## Type Definitions Summary

```typescript
// Tile collision types
type TileCollision = 'SOLID' | 'PASSABLE' | 'WATER' | 'PIT' | 'STAIRS' | 'BUSH' | 'ROCK';

// Damage unit: 1 = half-heart
type HalfHearts = number;

// Direction enum
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Game state phases
type GamePhase = 'TITLE' | 'GAMEPLAY' | 'PAUSE' | 'TRANSITION' | 'DEATH' | 'CONTINUE_SCREEN';

// Player state machine
type PlayerState =
  | 'IDLE'
  | 'WALKING'
  | 'ATTACKING'
  | 'USING_ITEM'
  | 'KNOCKBACK'
  | 'INVINCIBLE'
  | 'DYING';
```
