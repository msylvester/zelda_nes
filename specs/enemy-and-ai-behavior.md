# US-005: Enemy and AI Behavior System Specification

Defines data-driven, reproducible enemy archetypes, movement patterns, attack patterns, damage/knockback rules, and spawn/despawn rules for the NES Legend of Zelda TypeScript rebuild.

---

## 1. Enemy Archetype Schema

Every enemy in the game is defined by a single archetype data object. The archetype fully determines an enemy's appearance, stats, behavior, and interactions — no logic is hardcoded per enemy type.

```typescript
interface EnemyArchetype {
  /** Unique identifier (e.g., "OCTOROK_RED", "LYNEL_BLUE") */
  id: string;

  /** Display name */
  name: string;

  /** Base enemy type (for shared logic grouping) */
  baseType: EnemyBaseType;

  /** Color/tier variant */
  variant: EnemyVariant;

  /** Hit points in half-hearts */
  hp: number;

  /** Contact damage dealt to Link in half-hearts */
  contactDamage: number;

  /** Movement behavior */
  movementPattern: MovementPattern;

  /** Attack behavior (null if enemy has no ranged/special attack) */
  attackPattern: AttackPattern | null;

  /** Sprite dimensions (most are 16x16; bosses are larger) */
  spriteWidth: number;
  spriteHeight: number;

  /** Collision hitbox (may differ from sprite size) */
  hitbox: HitboxDefinition;

  /** Movement speed in pixels per frame */
  speed: number;

  /** Whether this enemy can be damaged by specific weapon types */
  vulnerabilities: DamageVulnerabilities;

  /** Spawn behavior (how the enemy enters the screen) */
  spawnBehavior: SpawnBehavior;

  /** Despawn behavior */
  despawnBehavior: DespawnBehavior;

  /** Whether this enemy counts toward the 6-enemy screen limit */
  countsTowardLimit: boolean;

  /** Whether killing this enemy advances the global kill counter for drop tables */
  advancesKillCounter: boolean;

  /** Drop group override (null = use global kill counter cycling) */
  dropGroupOverride: DropGroup | null;

  /** Whether the enemy can be stunned by boomerang */
  boomerangStunnable: boolean;

  /** Stun duration override in frames (default: 60) */
  stunDuration: number;

  /** Whether the enemy can be knocked back on hit */
  knockbackable: boolean;

  /** Sprite priority layer (default: 2 for standard enemies) */
  spritePriority: SpritePriority;

  /** Whether this enemy blocks Link's movement on contact */
  blocksMovement: boolean;

  /** Special flags for unique behaviors */
  flags: EnemyFlags;
}

type EnemyBaseType =
  | 'OCTOROK' | 'TEKTITE' | 'LEEVER' | 'PEAHAT'
  | 'ZORA' | 'LYNEL' | 'MOBLIN' | 'DARKNUT'
  | 'WIZZROBE' | 'GIBDO' | 'LIKE_LIKE' | 'STALFOS'
  | 'KEESE' | 'GEL' | 'ZOL' | 'GORIYA'
  | 'ROPE' | 'WALLMASTER' | 'VIRE' | 'POLS_VOICE'
  | 'LANMOLA' | 'BUBBLE'
  | 'BLADE_TRAP' | 'FIREBALL_TURRET'
  | 'AQUAMENTUS' | 'DODONGO' | 'MANHANDLA'
  | 'GLEEOK' | 'DIGDOGGER' | 'GOHMA'
  | 'PATRA' | 'GANON';

type EnemyVariant = 'RED' | 'BLUE' | 'DEFAULT';

type SpritePriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface EnemyFlags {
  /** Enemy is immune to sword (e.g., Bubble) */
  swordImmune: boolean;
  /** Enemy steals an equipped item on contact (Like Like steals shield) */
  stealsItem: boolean;
  /** Enemy teleports Link to dungeon entrance on contact (Wallmaster) */
  warpsLink: boolean;
  /** Enemy splits into smaller enemies on death (Zol → 2 Gels, Vire → 2 Keese) */
  splitsOnDeath: boolean;
  /** Split results (enemy IDs spawned on death) */
  splitInto: string[];
  /** Enemy is only vulnerable during specific animation frames */
  conditionalVulnerability: boolean;
  /** Specific item that triggers a special effect (e.g., Recorder on Digdogger) */
  weaknessItem: string | null;
  /** Whether the enemy can pass through solid tiles */
  phasesThroughWalls: boolean;
}
```

### Hitbox Definition

```typescript
interface HitboxDefinition {
  /** Offset from sprite top-left corner */
  offsetX: number;
  offsetY: number;
  /** Hitbox dimensions */
  width: number;
  height: number;
}
```

For most 16x16 enemies, the hitbox is the full sprite: `{ offsetX: 0, offsetY: 0, width: 16, height: 16 }`. Bosses and special enemies have custom hitboxes.

---

## 2. Movement Patterns

Movement patterns are data-driven configurations that the movement system reads each frame to determine an enemy's next position. Each pattern type has its own parameter set.

```typescript
type MovementPattern =
  | RandomWalkPattern
  | ChasePattern
  | HopPattern
  | CircularPattern
  | EmergePattern
  | StationaryPattern
  | DashPattern
  | TeleportPattern
  | FlyPattern
  | TrackPattern;

interface RandomWalkPattern {
  type: 'RANDOM_WALK';
  /** Pixels per frame */
  speed: number;
  /** Frames to walk in one direction before potentially changing */
  walkDuration: { min: number; max: number };
  /** Frames to pause between walks (0 = no pause) */
  pauseDuration: { min: number; max: number };
  /** Whether movement is axis-aligned (4 directions) or free-roaming */
  axisAligned: boolean;
  /** Whether the enemy respects tile collision */
  respectsCollision: boolean;
}

interface ChasePattern {
  type: 'CHASE';
  /** Pixels per frame */
  speed: number;
  /** Distance (in pixels) at which the enemy begins chasing Link */
  activationRange: number;
  /** Whether chase is axis-aligned or free direction */
  axisAligned: boolean;
  /** Fallback pattern when Link is out of range */
  idlePattern: MovementPattern;
  /** Whether the enemy respects tile collision while chasing */
  respectsCollision: boolean;
}

interface HopPattern {
  type: 'HOP';
  /** Pixels per frame during a hop */
  hopSpeed: number;
  /** Duration of one hop in frames */
  hopDuration: number;
  /** Frames between hops (on ground) */
  restDuration: { min: number; max: number };
  /** Direction selection: RANDOM or TOWARD_LINK */
  hopDirection: 'RANDOM' | 'TOWARD_LINK';
  /** Whether the enemy respects tile collision */
  respectsCollision: boolean;
}

interface CircularPattern {
  type: 'CIRCULAR';
  /** Center point (relative to spawn position) */
  centerX: number;
  centerY: number;
  /** Orbit radius in pixels */
  radius: number;
  /** Angular speed in radians per frame */
  angularSpeed: number;
  /** Clockwise or counter-clockwise */
  direction: 'CW' | 'CCW';
}

interface EmergePattern {
  type: 'EMERGE';
  /** Tile type to emerge from (PASSABLE for ground, WATER for Zora) */
  emergeTile: TileCollision;
  /** Frames spent submerged */
  submergedDuration: { min: number; max: number };
  /** Frames spent surfaced */
  surfacedDuration: { min: number; max: number };
  /** Whether the enemy moves while surfaced */
  movesWhileSurfaced: boolean;
  /** Speed when surfaced (if movesWhileSurfaced) */
  surfaceSpeed: number;
}

interface StationaryPattern {
  type: 'STATIONARY';
  /** The enemy does not move on its own */
  /** Activation trigger (for traps) */
  activationTrigger: 'NONE' | 'SAME_ROW' | 'SAME_COLUMN' | 'PROXIMITY';
  /** For traps: speed when activated */
  activatedSpeed: number;
  /** For traps: return speed (usually slower) */
  returnSpeed: number;
  /** Distance to travel when activated (in pixels) */
  activatedDistance: number;
}

interface DashPattern {
  type: 'DASH';
  /** Idle speed (slow patrol) */
  idleSpeed: number;
  /** Dash speed (fast charge) */
  dashSpeed: number;
  /** Trigger: what causes the dash */
  dashTrigger: 'LINE_OF_SIGHT' | 'PROXIMITY';
  /** Direction of dash */
  dashDirection: 'TOWARD_LINK' | 'CURRENT_FACING';
  /** Distance at which dash triggers (pixels) */
  triggerDistance: number;
  /** Idle movement pattern */
  idlePattern: RandomWalkPattern;
}

interface TeleportPattern {
  type: 'TELEPORT';
  /** Frames visible before teleporting */
  visibleDuration: { min: number; max: number };
  /** Frames invisible (teleporting) */
  invisibleDuration: { min: number; max: number };
  /** Whether the enemy can attack while visible */
  attacksWhileVisible: boolean;
  /** Teleport destination selection */
  destinationMode: 'RANDOM' | 'NEAR_LINK';
  /** Minimum distance from Link for destination (pixels) */
  minDistanceFromLink: number;
}

interface FlyPattern {
  type: 'FLY';
  /** Base speed in pixels per frame */
  speed: number;
  /** Direction change frequency */
  directionChangePeriod: { min: number; max: number };
  /** Whether the enemy flies in from screen edges */
  entersFromEdge: boolean;
  /** Whether the enemy ignores tile collision */
  ignoresCollision: boolean;
  /** Whether movement has sinusoidal wobble */
  wobble: boolean;
  /** Wobble amplitude in pixels (if wobble = true) */
  wobbleAmplitude: number;
}

interface TrackPattern {
  type: 'TRACK';
  /** Follows a fixed path of waypoints */
  waypoints: { x: number; y: number }[];
  /** Speed along path in pixels per frame */
  speed: number;
  /** Whether the path loops */
  loop: boolean;
  /** Behavior at end of path if not looping */
  endBehavior: 'STOP' | 'REVERSE';
}
```

### Movement Pattern Assignment Table

| Enemy | Movement Pattern | Key Parameters |
|-------|-----------------|----------------|
| Octorok (red) | `RANDOM_WALK` | speed: 0.5, walkDuration: 32–64, pauseDuration: 16–32, axisAligned: true |
| Octorok (blue) | `RANDOM_WALK` | speed: 0.75, walkDuration: 32–64, pauseDuration: 8–16, axisAligned: true |
| Tektite (red) | `HOP` | hopSpeed: 2.0, hopDuration: 16, restDuration: 30–90, hopDirection: RANDOM |
| Tektite (blue) | `HOP` | hopSpeed: 2.5, hopDuration: 16, restDuration: 20–60, hopDirection: TOWARD_LINK |
| Leever (red) | `EMERGE` | emergeTile: PASSABLE, submergedDuration: 60–120, surfacedDuration: 60–90, movesWhileSurfaced: true, surfaceSpeed: 0.5 |
| Leever (blue) | `EMERGE` | emergeTile: PASSABLE, submergedDuration: 30–60, surfacedDuration: 90–120, movesWhileSurfaced: true, surfaceSpeed: 1.0 |
| Peahat | `FLY` | speed: 1.0, ignoresCollision: true, wobble: true, wobbleAmplitude: 8 |
| Zora | `EMERGE` | emergeTile: WATER, submergedDuration: 120–180, surfacedDuration: 30, movesWhileSurfaced: false |
| Lynel (red) | `CHASE` | speed: 1.0, activationRange: 80, axisAligned: true, idlePattern: RANDOM_WALK |
| Lynel (blue) | `CHASE` | speed: 1.25, activationRange: 96, axisAligned: true, idlePattern: RANDOM_WALK |
| Moblin (red) | `RANDOM_WALK` | speed: 0.75, walkDuration: 24–48, pauseDuration: 8–16, axisAligned: true |
| Moblin (blue) | `RANDOM_WALK` | speed: 1.0, walkDuration: 24–48, pauseDuration: 0–8, axisAligned: true |
| Darknut (red) | `RANDOM_WALK` | speed: 0.75, walkDuration: 16–32, pauseDuration: 0, axisAligned: true |
| Darknut (blue) | `RANDOM_WALK` | speed: 1.0, walkDuration: 16–32, pauseDuration: 0, axisAligned: true |
| Wizzrobe (red) | `TELEPORT` | visibleDuration: 24–36, invisibleDuration: 16–24, attacksWhileVisible: true, destinationMode: RANDOM |
| Wizzrobe (blue) | `RANDOM_WALK` | speed: 1.0, walkDuration: 16–24, pauseDuration: 0, axisAligned: true, phasesThroughWalls: true |
| Gibdo | `RANDOM_WALK` | speed: 0.5, walkDuration: 24–48, pauseDuration: 8–16, axisAligned: true |
| Like Like | `CHASE` | speed: 0.5, activationRange: 48, axisAligned: true, idlePattern: RANDOM_WALK |
| Stalfos | `RANDOM_WALK` | speed: 0.75, walkDuration: 16–32, pauseDuration: 8–16, axisAligned: true |
| Keese | `FLY` | speed: 1.5, ignoresCollision: true, wobble: true, wobbleAmplitude: 4, directionChangePeriod: 16–32 |
| Gel | `RANDOM_WALK` | speed: 0.5, walkDuration: 8–16, pauseDuration: 16–32, axisAligned: true |
| Zol | `RANDOM_WALK` | speed: 0.5, walkDuration: 16–24, pauseDuration: 16–32, axisAligned: true |
| Goriya (red) | `RANDOM_WALK` | speed: 0.75, walkDuration: 24–48, pauseDuration: 8–24, axisAligned: true |
| Goriya (blue) | `RANDOM_WALK` | speed: 1.0, walkDuration: 24–48, pauseDuration: 8–16, axisAligned: true |
| Rope | `DASH` | idleSpeed: 0.5, dashSpeed: 2.5, dashTrigger: LINE_OF_SIGHT, dashDirection: TOWARD_LINK, triggerDistance: 64 |
| Wallmaster | `CHASE` | speed: 0.75, activationRange: 256 (full screen), axisAligned: true, idlePattern: hidden until triggered |
| Vire | `FLY` | speed: 1.0, ignoresCollision: true, wobble: true, wobbleAmplitude: 6 |
| Pols Voice | `HOP` | hopSpeed: 1.5, hopDuration: 12, restDuration: 24–48, hopDirection: RANDOM |
| Lanmola | `TRACK` | speed: 1.5, waypoints: dynamically generated, loop: true |
| Bubble | `FLY` | speed: 1.5, ignoresCollision: true, wobble: false |
| Blade Trap | `STATIONARY` | activationTrigger: SAME_ROW or SAME_COLUMN, activatedSpeed: 3.0, returnSpeed: 0.75, activatedDistance: varies |
| Fireball Turret | `STATIONARY` | activationTrigger: NONE (fires on timer) |

### Collision Behavior

Enemies that respect tile collision follow the same collision rules as Link but with these differences:

- Enemies check their full sprite hitbox (not a smaller sub-hitbox like Link).
- When an enemy cannot move in its chosen direction, it picks a new random direction (for `RANDOM_WALK`) or stops until the next movement decision (for `CHASE`).
- Flying enemies (`FLY` pattern) and wall-phasing enemies (`phasesThroughWalls: true`) ignore tile collision entirely.
- Enemies cannot walk off screen edges. They bounce off or choose a new direction at screen boundaries.

### Random Number Generation

All random values in enemy movement (walk duration, pause duration, direction selection) use a **deterministic pseudo-random number generator** seeded per-screen. This ensures enemy behavior is reproducible when a screen is revisited within the same play session. The PRNG is re-seeded when the screen loads.

```typescript
interface EnemyPRNG {
  /** Seed value (based on screen coordinates and frame counter) */
  seed: number;
  /** Generate next random integer in range [min, max] */
  nextInt(min: number, max: number): number;
  /** Generate next random float in range [0, 1) */
  nextFloat(): number;
}
```

---

## 3. Attack Patterns

Enemies that have ranged or special attacks use an `AttackPattern` definition. Attacks are independent of movement — an enemy can move and attack according to separate timing rules.

```typescript
type AttackPattern =
  | ProjectileAttack
  | BoomerangAttack
  | ContactOnlyAttack
  | BreathAttack
  | SplitAttack
  | SummonAttack;

interface ProjectileAttack {
  type: 'PROJECTILE';
  /** Projectile type to fire */
  projectileType: ProjectileType;
  /** Frames between attack attempts */
  cooldown: { min: number; max: number };
  /** Direction the projectile fires */
  aimMode: AimMode;
  /** Number of projectiles per volley */
  volleyCount: number;
  /** Spread angle between projectiles in a volley (radians) */
  volleySpread: number;
  /** Maximum number of this enemy's projectiles on screen at once */
  maxActiveProjectiles: number;
  /** Whether the enemy pauses movement while attacking */
  pausesDuringAttack: boolean;
  /** Attack animation duration in frames */
  attackAnimationFrames: number;
}

interface BoomerangAttack {
  type: 'BOOMERANG';
  /** Boomerang travel distance (tiles) */
  range: number;
  /** Boomerang speed (pixels per frame) */
  speed: number;
  /** Cooldown between throws (frames) */
  cooldown: { min: number; max: number };
  /** Whether the boomerang returns to the thrower */
  returns: boolean;
  /** Damage dealt by the boomerang */
  damage: number;
}

interface ContactOnlyAttack {
  type: 'CONTACT_ONLY';
  /** Enemy only damages Link on physical contact — no ranged attack */
}

interface BreathAttack {
  type: 'BREATH';
  /** Used by bosses like Aquamentus */
  /** Number of projectiles fired per breath */
  projectileCount: number;
  /** Spread pattern */
  spreadAngle: number;
  /** Projectile type */
  projectileType: ProjectileType;
  /** Cooldown between breaths */
  cooldown: { min: number; max: number };
}

interface SplitAttack {
  type: 'SPLIT';
  /** Enemy splits into smaller enemies when a condition is met */
  triggerCondition: 'ITEM_USED' | 'HP_THRESHOLD';
  /** Item that triggers the split (e.g., "RECORDER" for Digdogger) */
  triggerItem?: string;
  /** HP threshold (fraction 0–1) below which the enemy splits */
  hpThreshold?: number;
  /** Enemy types spawned on split */
  splitResult: { enemyId: string; count: number };
}

interface SummonAttack {
  type: 'SUMMON';
  /** Periodically summons helper enemies */
  summonedEnemy: string;
  /** Maximum summoned enemies alive at once */
  maxSummoned: number;
  /** Cooldown between summon attempts */
  cooldown: { min: number; max: number };
}

type AimMode =
  | 'CARDINAL_AT_LINK'     // Fires in the cardinal direction closest to Link
  | 'EXACT_AT_LINK'        // Fires directly at Link's position (angled)
  | 'CURRENT_FACING'       // Fires in the direction the enemy is facing
  | 'FIXED_DIRECTIONS';    // Fires in predefined fixed directions

type ProjectileType =
  | 'ROCK'           // Octorok rocks
  | 'ARROW'          // Moblin/Lynel arrows
  | 'MAGIC_BEAM'     // Wizzrobe magic beams
  | 'FIREBALL'       // Generic fireball (turrets, bosses)
  | 'ZORA_FIREBALL'  // Zora-specific fireball (can travel diagonally)
  | 'SWORD_BEAM';    // Lynel sword beams (blue)
```

### Projectile Definition

```typescript
interface EnemyProjectile {
  /** Projectile type */
  type: ProjectileType;
  /** Speed in pixels per frame */
  speed: number;
  /** Damage dealt to Link in half-hearts */
  damage: number;
  /** Hitbox dimensions */
  hitbox: HitboxDefinition;
  /** Whether the projectile is blocked by Link's shield */
  blockableByShield: boolean;
  /** Whether the projectile is destroyed on hitting a solid tile */
  destroyedByWalls: boolean;
  /** Maximum travel distance in pixels (0 = infinite/screen edge) */
  maxRange: number;
  /** Sprite key for rendering */
  spriteKey: string;
  /** Animation (if any) */
  animationKey: string | null;
}
```

### Projectile Stats Table

| Projectile Type | Speed | Damage | Blockable | Destroyed by Walls | Max Range |
|----------------|-------|--------|-----------|--------------------|-----------|
| ROCK | 1.5 | 1 | Yes | Yes | 0 (screen edge) |
| ARROW | 2.0 | 1 | Yes | Yes | 0 |
| MAGIC_BEAM | 2.0 | 2 | No | Yes | 0 |
| FIREBALL | 1.5 | 1 | Yes | No | 0 |
| ZORA_FIREBALL | 1.5 | 2 | Yes | No | 0 |
| SWORD_BEAM | 2.5 | 2 | Yes | Yes | 0 |

### Shield Blocking

When Link faces a projectile (Link's facing direction opposes the projectile's travel direction) and the projectile is `blockableByShield: true`:

- If Link has any shield: the projectile is deflected (destroyed with no damage).
- The Magical Shield blocks all blockable projectiles. The standard shield blocks only ROCK and ARROW, not FIREBALL or ZORA_FIREBALL.
- Blocking produces a "clink" sound effect.
- Blocking does not interrupt Link's movement or actions.

```typescript
interface ShieldBlockRules {
  /** Standard shield blocks these projectile types */
  standardShieldBlocks: ProjectileType[];  // ['ROCK', 'ARROW']
  /** Magical shield blocks these projectile types */
  magicalShieldBlocks: ProjectileType[];   // ['ROCK', 'ARROW', 'FIREBALL', 'ZORA_FIREBALL', 'SWORD_BEAM']
}
```

### Attack Pattern Assignment Table

| Enemy | Attack Pattern | Key Parameters |
|-------|---------------|----------------|
| Octorok (both) | `PROJECTILE` | ROCK, cooldown: 60–120, aimMode: CARDINAL_AT_LINK, volleyCount: 1 |
| Tektite (both) | `CONTACT_ONLY` | — |
| Leever (both) | `CONTACT_ONLY` | — |
| Peahat | `CONTACT_ONLY` | — (invulnerable while moving; only hittable when stopped) |
| Zora | `PROJECTILE` | ZORA_FIREBALL, cooldown: per-emerge, aimMode: EXACT_AT_LINK, volleyCount: 1 |
| Lynel (red) | `PROJECTILE` | SWORD_BEAM, cooldown: 60–90, aimMode: CARDINAL_AT_LINK, volleyCount: 1 |
| Lynel (blue) | `PROJECTILE` | SWORD_BEAM, cooldown: 40–60, aimMode: CARDINAL_AT_LINK, volleyCount: 1 |
| Moblin (red) | `PROJECTILE` | ARROW, cooldown: 60–120, aimMode: CURRENT_FACING, volleyCount: 1 |
| Moblin (blue) | `PROJECTILE` | ARROW, cooldown: 40–90, aimMode: CURRENT_FACING, volleyCount: 1 |
| Darknut (both) | `CONTACT_ONLY` | — (only hittable from sides/back; front is shielded) |
| Wizzrobe (red) | `PROJECTILE` | MAGIC_BEAM, cooldown: per-teleport, aimMode: CARDINAL_AT_LINK, volleyCount: 1 |
| Wizzrobe (blue) | `PROJECTILE` | MAGIC_BEAM, cooldown: 30–60, aimMode: CARDINAL_AT_LINK, volleyCount: 1 |
| Gibdo | `CONTACT_ONLY` | — |
| Like Like | `CONTACT_ONLY` | — (special: engulfs Link, steals shield) |
| Stalfos | `CONTACT_ONLY` | — |
| Keese | `CONTACT_ONLY` | — |
| Gel | `CONTACT_ONLY` | — |
| Zol | `CONTACT_ONLY` | — (splits into 2 Gels on death) |
| Goriya (red) | `BOOMERANG` | range: 5 tiles, speed: 2.0, cooldown: 60–90, damage: 1 |
| Goriya (blue) | `BOOMERANG` | range: 8 tiles, speed: 2.5, cooldown: 40–60, damage: 2 |
| Rope | `CONTACT_ONLY` | — (damage dealt via dash contact) |
| Wallmaster | `CONTACT_ONLY` | — (special: warps Link to dungeon entrance on contact) |
| Vire | `CONTACT_ONLY` | — (splits into 2 Keese on death) |
| Pols Voice | `CONTACT_ONLY` | — (immune to sword; killed by arrow or recorder) |
| Bubble | `CONTACT_ONLY` | — (immune to all damage; disables Link's sword for ~5 seconds on contact) |
| Blade Trap | `CONTACT_ONLY` | — (invincible; charges when Link is in same row/column) |
| Fireball Turret | `PROJECTILE` | FIREBALL, cooldown: 90–120, aimMode: FIXED_DIRECTIONS, volleyCount: 4 (in 4 cardinal directions) |

---

## 4. Damage and Knockback Rules

### Damage Application (Enemy → Link)

When Link's hitbox overlaps an enemy's hitbox (or an enemy projectile's hitbox), damage is applied:

```typescript
interface DamageEvent {
  /** Source of damage */
  source: 'CONTACT' | 'PROJECTILE';
  /** Raw damage in half-hearts */
  rawDamage: number;
  /** Direction damage came from (for knockback) */
  damageDirection: Direction;
  /** Whether damage was blocked by shield */
  blocked: boolean;
}
```

**Damage flow:**
1. Check if Link is in an invulnerable state (invincibility frames, knockback). If so, discard.
2. Check shield blocking (for projectiles only — contact damage is never blocked by shield).
3. Apply defense reduction: `finalDamage = Math.max(rawDamage * defenseMultiplier, 1)` where defenseMultiplier is `1.0` (no ring), `0.5` (Blue Ring), or `0.25` (Red Ring). Minimum 1 half-heart.
4. Subtract from Link's HP.
5. Trigger knockback.
6. Play damage sound effect.
7. Flash the screen red for 1 frame.

### Damage Application (Link → Enemy)

When Link's sword hitbox (or a player projectile) overlaps an enemy's hitbox:

```typescript
interface EnemyDamageEvent {
  /** Weapon that dealt the damage */
  weaponType: PlayerWeaponType;
  /** Raw damage in half-hearts */
  rawDamage: number;
  /** Direction the attack came from */
  attackDirection: Direction;
}

type PlayerWeaponType =
  | 'WOODEN_SWORD' | 'WHITE_SWORD' | 'MAGICAL_SWORD'
  | 'SWORD_BEAM'
  | 'ARROW' | 'SILVER_ARROW'
  | 'BOMB'
  | 'BOOMERANG' | 'MAGIC_BOOMERANG'
  | 'CANDLE_FLAME'
  | 'MAGIC_ROD' | 'MAGIC_ROD_FLAME'
  | 'RECORDER';
```

**Damage flow:**
1. Check vulnerability: does this enemy take damage from this weapon type? Consult `vulnerabilities`.
2. Apply damage multiplier from vulnerability table: `finalDamage = rawDamage * vulnerabilityMultiplier`.
3. Subtract from enemy HP.
4. If HP > 0: trigger enemy damage flash animation (sprite flickers white for 8 frames).
5. If HP <= 0: trigger death sequence.
6. Apply knockback to enemy (if `knockbackable: true`).

### Damage Vulnerability Table

```typescript
interface DamageVulnerabilities {
  /** Multiplier per weapon type (0 = immune, 0.5 = half damage, 1 = normal, 2 = double) */
  sword: number;
  swordBeam: number;
  arrow: number;
  silverArrow: number;
  bomb: number;
  boomerang: number;   // 0 = immune to damage but may still stun
  candleFlame: number;
  magicRod: number;
  recorder: number;    // 0 for most; special for Digdogger/Pols Voice
}
```

### Notable Vulnerability Rules

| Enemy | Special Vulnerability Rule |
|-------|--------------------------|
| Darknut | `sword: 1` but only hittable from sides or back. Front-facing attacks deal 0 damage (shielded). Vulnerability check includes comparing attack direction vs. enemy facing direction. |
| Peahat | Invulnerable while moving (all multipliers 0). Only vulnerable during pause frames (when stationary). |
| Gohma | Only vulnerable when eye is open. Arrow does 1-hit kill to open eye. Sword does 0 damage. |
| Pols Voice | `sword: 0`, `arrow: 999` (instant kill), `recorder: 999` (instant kill). Immune to sword. |
| Bubble | All damage multipliers 0. Cannot be killed. Contact disables Link's sword for 300 frames (~5 seconds). Blue bubbles re-enable sword. |
| Gibdo | `candleFlame: 999` (instant kill, reveals Stalfos underneath). |
| Dodongo | `sword: 0`, `bomb: 2` (must eat bombs placed in its path — only damaged when it walks over a bomb). |
| Ganon | Invisible until hit. Only Silver Arrow kills when HP reaches 0. All other weapons deal damage but cannot deliver the killing blow. |
| Digdogger | `recorder: SPLIT` — using the recorder triggers split into 3 smaller copies, each with reduced HP. |
| Lanmola | Only the head segment takes damage; body segments are invulnerable. |

### Enemy Knockback

```typescript
interface EnemyKnockback {
  /** Whether the enemy is knocked back on hit */
  enabled: boolean;
  /** Knockback distance in pixels */
  distance: number;  // default: 16
  /** Knockback duration in frames */
  duration: number;  // default: 8
  /** Direction: opposite of incoming attack direction */
  direction: Direction;
}
```

- Most enemies are knocked back 16 pixels over 8 frames when hit.
- Bosses are generally NOT knocked back (`knockbackable: false`).
- During knockback, enemies cannot move or attack.
- If knockback would push an enemy into a solid tile, the enemy stops at the tile boundary.

### Invincibility Frames (Enemy)

After taking damage, enemies have **0 frames of invincibility** — they can be hit again immediately on the next frame. The damage flash animation (8 frames of sprite flickering) is purely visual and does not provide any protection.

Exception: Bosses have **8 frames** of invincibility after each hit to prevent stacking damage too quickly.

```typescript
interface EnemyInvincibility {
  /** Frames of invincibility after taking damage */
  standardEnemy: 0;
  boss: 8;
}
```

---

## 5. Spawn and Despawn Rules

### Spawn System

Enemy spawning is controlled by the `EnemySpawn` configuration on each screen/room (defined in US-002). This section specifies the runtime spawn behavior.

```typescript
interface SpawnState {
  /** List of enemy spawn definitions for this screen */
  spawnList: EnemySpawn[];

  /** Currently active enemies (on screen) */
  activeEnemies: EnemyInstance[];

  /** Queue of enemies waiting to spawn (when screen limit is reached) */
  spawnQueue: EnemySpawn[];

  /** Maximum concurrent active enemies */
  maxActive: number;  // 6 for both overworld and dungeon

  /** Enemies killed on this screen visit (for shutter door tracking) */
  killCount: number;

  /** Total enemies required to be killed for shutter doors to open */
  totalRequired: number;
}
```

### Spawn Sequence

When a screen/room loads:

1. **Transition completes** (overworld: scroll finishes; dungeon: fade-in finishes).
2. **Spawn delay**: overworld screens have a **15-frame delay** before enemies appear. Dungeon rooms spawn enemies **immediately** (0-frame delay).
3. **Process spawn list**: iterate through `spawnList`, creating `EnemyInstance` objects:
   - If the spawn has explicit `positions`, place enemies at those tile coordinates.
   - If no positions, select random valid tiles (PASSABLE for ground, WATER for Zora) at least `minDistanceFromLink` tiles from Link's position.
4. **Apply screen limit**: only spawn up to `maxActive` enemies. Queue excess enemies in `spawnQueue`.
5. **Spawn animation**: each enemy plays its spawn-in animation based on `spawnBehavior`:
   - `IMMEDIATE`: enemy appears instantly at full opacity.
   - `EMERGE_GROUND`: enemy rises from below the tile over 8 frames.
   - `EMERGE_WATER`: enemy surfaces from water over 12 frames (Zora specific).
   - `FLY_IN`: enemy enters from the nearest screen edge, flying to its target position.
   - `FALL_FROM_ABOVE`: enemy falls from above the screen to its position over 8 frames.
   - `STATIONARY`: enemy appears instantly (traps are always present).

### Queue Processing

When an active enemy dies:

1. Decrement active count.
2. Check `spawnQueue`: if non-empty, dequeue the next enemy and spawn it after a **30-frame delay** at a random valid position.
3. Increment `killCount`.
4. If `killCount >= totalRequired` and room has shutter doors: open all shutter doors.

### Despawn Rules

```typescript
type DespawnBehavior =
  | 'ON_DEATH'          // Standard: despawn when HP reaches 0
  | 'ON_SCREEN_EXIT'    // Despawn when Link leaves the screen (standard for all)
  | 'PERSISTENT';       // Rare: survives screen transitions (not used in standard gameplay)
```

**Despawn conditions:**
- **Screen exit**: all enemies are immediately removed when Link exits the screen. No cleanup animation.
- **Death**: enemy plays death animation (puff, 12 frames), then is removed from the entity list.
- **Boss death**: boss plays a unique death animation (explosion pattern, 60 frames), drops a heart container, and is flagged as permanently defeated in the dungeon state.

### Overworld Respawn Rules

- All enemies on an overworld screen respawn every time Link enters that screen.
- No persistent kill tracking on the overworld.
- The global kill counter (for drop table cycling) persists across screen transitions but resets on game over/continue.

### Dungeon Respawn Rules

- Standard dungeon room enemies respawn on every room entry.
- **Boss rooms**: once the boss is defeated, the room is permanently cleared (no enemies spawn). This is tracked in the dungeon state: `bossDefeated: boolean`.
- **Item rooms**: rooms that grant an item on clearing all enemies — once the item is collected, enemies no longer respawn. Tracked per-room: `clearedAndItemCollected: boolean`.
- **Shutter door rooms**: enemies always respawn (shutter doors re-close on re-entry). The player must defeat all enemies again to re-open the doors.

---

## 6. Enemy State Machine

Each enemy instance runs a simple state machine:

```typescript
type EnemyState =
  | 'SPAWNING'       // Playing spawn-in animation
  | 'ACTIVE'         // Normal behavior (moving + attacking)
  | 'STUNNED'        // Hit by boomerang, frozen in place
  | 'KNOCKBACK'      // Being knocked back from a hit
  | 'DAMAGED'        // Playing damage flash (visual only, can overlap with ACTIVE)
  | 'DYING'          // Playing death animation
  | 'SUBMERGED'      // For EMERGE-type enemies: hidden below surface
  | 'INVISIBLE';     // For TELEPORT-type enemies: between teleports

interface EnemyInstance {
  /** Reference to the archetype */
  archetype: EnemyArchetype;

  /** Current state */
  state: EnemyState;

  /** Current position in pixels (play area coordinates) */
  x: number;
  y: number;

  /** Current facing direction */
  facing: Direction;

  /** Current HP */
  hp: number;

  /** Frames remaining in current state (for timed states) */
  stateTimer: number;

  /** Movement-specific state (timer, target, etc.) */
  movementState: MovementState;

  /** Attack cooldown remaining (frames) */
  attackCooldown: number;

  /** Invincibility frames remaining */
  invincibilityFrames: number;

  /** Active projectiles belonging to this enemy */
  projectiles: EnemyProjectile[];

  /** PRNG state for this enemy instance */
  rng: EnemyPRNG;
}
```

### State Transitions

```
SPAWNING → ACTIVE (spawn animation completes)
ACTIVE → STUNNED (hit by boomerang)
ACTIVE → KNOCKBACK (hit by weapon, knockbackable)
ACTIVE → DYING (HP reaches 0)
ACTIVE → SUBMERGED (EMERGE pattern: surface timer expires)
ACTIVE → INVISIBLE (TELEPORT pattern: visible timer expires)
STUNNED → ACTIVE (stun timer expires)
KNOCKBACK → ACTIVE (knockback distance reached)
SUBMERGED → ACTIVE (submerge timer expires, enemy surfaces)
INVISIBLE → ACTIVE (teleport timer expires, enemy reappears)
DYING → [removed from entity list] (death animation completes)
```

### Per-Frame Update Logic

Each frame, for each active enemy:

1. **Update state timer**: decrement `stateTimer` if > 0. Process state transitions if timer expires.
2. **If ACTIVE**:
   a. Run movement pattern logic → compute new position.
   b. Check tile collision (if applicable) → adjust position.
   c. Check screen boundaries → keep within bounds.
   d. Decrement `attackCooldown`. If cooldown reaches 0 and attack conditions are met: execute attack, reset cooldown to random value in range.
   e. Check contact with Link → apply contact damage if applicable.
3. **If STUNNED**: do nothing (enemy is frozen). Decrement stun timer.
4. **If KNOCKBACK**: move enemy in knockback direction at knockback speed. Decrement distance remaining.
5. **If SUBMERGED/INVISIBLE**: decrement timer. Enemy cannot be hit or collided with.
6. **Update animation**: advance the current animation frame based on state and movement.

---

## 7. Boss-Specific Behaviors

Bosses use the same archetype system but have additional parameters and unique mechanics that build on top of the standard patterns.

### Aquamentus (Dungeons 1, 7)

```typescript
const AQUAMENTUS: EnemyArchetype = {
  id: 'AQUAMENTUS',
  baseType: 'AQUAMENTUS',
  variant: 'DEFAULT',
  hp: 6,
  contactDamage: 2,
  spriteWidth: 32,
  spriteHeight: 32,
  speed: 0.25,
  movementPattern: {
    type: 'RANDOM_WALK',
    speed: 0.25,
    walkDuration: { min: 60, max: 120 },
    pauseDuration: { min: 30, max: 60 },
    axisAligned: false,
    respectsCollision: true,
  },
  attackPattern: {
    type: 'BREATH',
    projectileCount: 3,
    spreadAngle: Math.PI / 6, // 30 degrees between projectiles
    projectileType: 'FIREBALL',
    cooldown: { min: 90, max: 150 },
  },
  knockbackable: false,
  countsTowardLimit: false, // bosses don't count toward 6-enemy limit
  boomerangStunnable: false,
  // ... remaining fields
};
```

- Aquamentus moves left and right slowly within the right portion of the room.
- Fires 3 fireballs in a spread pattern periodically.
- 6 HP; takes normal sword damage.

### Dodongo (Dungeons 2, 5)

- Moves in a straight line, turning when hitting a wall (random turn direction).
- **Cannot be damaged by sword**. Must eat bombs: a bomb placed in Dodongo's path is consumed when it walks over it, dealing damage internally.
- Each bomb consumed deals 2 damage. Dodongo has 4 HP (2 bombs to kill).
- When a bomb is consumed, Dodongo freezes for 30 frames (stunned), then resumes.
- Dodongo in dungeon 5 has 6 HP (3 bombs).

### Manhandla (Dungeons 3, 8)

- 4-segmented boss: a center body with 4 hand/claw segments (up, down, left, right).
- Each hand has its own HP pool (4 HP each). Destroying a hand removes it and speeds up the remaining boss.
- The center body has 8 HP and becomes vulnerable when all 4 hands are destroyed.
- Hands fire fireballs independently.
- Speed increases: base speed `0.5`, each hand destroyed adds `0.25` to speed.
- Bombs deal double damage to hands (`bomb: 2` multiplier).

### Gleeok (Dungeons 4, 6, 8)

- Multi-headed dragon: 2 heads (dungeon 4), 3 heads (dungeon 6), 4 heads (dungeon 8).
- Each head has 4 HP. Heads must be destroyed individually.
- When a head is severed, it detaches and becomes an independent flying entity that fires fireballs but cannot be further damaged.
- The body has no HP — defeating all heads defeats the boss.
- Heads are connected by "necks" (chain of sprites that undulate).

### Digdogger (Dungeons 5, 7)

- Large form (32x32): invulnerable to all attacks.
- When the Recorder item is used: Digdogger shrinks and splits into 1 (dungeon 5) or 3 (dungeon 7) small forms (16x16), each with 2 HP.
- Small forms move faster and can be killed with sword.
- Using the Recorder again has no additional effect.

### Gohma (Dungeons 6, 8)

- Moves horizontally across the room, periodically opening its eye.
- Eye states cycle: closed (24 frames) → half-open (8 frames) → open (16 frames) → half-open (8 frames) → closed.
- Only vulnerable to arrows when eye is fully open. One arrow hit to the open eye kills Gohma in dungeon 6. In dungeon 8, Gohma requires 3 arrow hits.
- Sword does 0 damage regardless of eye state.

### Patra (Dungeon 9 mini-boss)

- Center eye with 8 orbiting smaller eyes in a circular pattern.
- Orbital eyes must all be destroyed first (1 HP each, killed by sword).
- Once all orbitals are gone, the center eye becomes vulnerable (8 HP).
- Orbital pattern alternates between tight orbit and wide orbit every 120 frames.
- Center fires fireballs at Link.

### Ganon (Dungeon 9 final boss)

- Invisible. Only visible for 8 frames after being hit.
- Teleports around the room randomly, pausing to fire fireballs at Link.
- Total HP: 16. Can be damaged by any weapon, but the killing blow MUST be the Silver Arrow.
- At 0 HP from a non-silver-arrow attack, Ganon stays at 1 HP (cannot be killed by other weapons).
- When killed by Silver Arrow: Ganon turns brown, screams, ash pile remains, drops Triforce of Power.
- Phase 2 (HP < 8): increased fireball rate (cooldown halved), teleport frequency doubled.

---

## 8. Enemy Instance Lifecycle Summary

```
Screen Load
  │
  ▼
[Create spawn list from screen/room data]
  │
  ▼
[Apply spawn delay (15 frames overworld, 0 dungeon)]
  │
  ▼
[Spawn up to 6 enemies, queue excess]
  │
  ├── For each enemy ──►  SPAWNING → ACTIVE
  │                           │
  │                    ┌──────┼──────┐
  │                    ▼      ▼      ▼
  │               [Move]  [Attack]  [Contact check]
  │                    │      │      │
  │                    ▼      ▼      ▼
  │              [Collision] [Projectile] [Damage Link]
  │                    │       │
  │                    ▼       │
  │              [Hit by Link?]│
  │                 │    │     │
  │              [Yes] [No]    │
  │                 │          │
  │            [Apply damage]  │
  │              │      │      │
  │          [HP > 0] [HP ≤ 0]│
  │              │      │      │
  │          [KNOCKBACK/│      │
  │           DAMAGED]  │      │
  │              │   [DYING]   │
  │              │      │      │
  │              │   [Death animation]
  │              │      │
  │              │   [Drop item?]
  │              │      │
  │              │   [Remove from entity list]
  │              │      │
  │              │   [Dequeue next from spawnQueue]
  │              │
  │              ▼
  │         [Continue ACTIVE loop]
  │
  ▼
[Screen exit → despawn all enemies]
```

---

## Type Definitions Summary

```typescript
// Enemy base type enum
type EnemyBaseType =
  | 'OCTOROK' | 'TEKTITE' | 'LEEVER' | 'PEAHAT'
  | 'ZORA' | 'LYNEL' | 'MOBLIN' | 'DARKNUT'
  | 'WIZZROBE' | 'GIBDO' | 'LIKE_LIKE' | 'STALFOS'
  | 'KEESE' | 'GEL' | 'ZOL' | 'GORIYA'
  | 'ROPE' | 'WALLMASTER' | 'VIRE' | 'POLS_VOICE'
  | 'LANMOLA' | 'BUBBLE'
  | 'BLADE_TRAP' | 'FIREBALL_TURRET'
  | 'AQUAMENTUS' | 'DODONGO' | 'MANHANDLA'
  | 'GLEEOK' | 'DIGDOGGER' | 'GOHMA'
  | 'PATRA' | 'GANON';

// Enemy color variant
type EnemyVariant = 'RED' | 'BLUE' | 'DEFAULT';

// Enemy runtime state
type EnemyState =
  | 'SPAWNING' | 'ACTIVE' | 'STUNNED' | 'KNOCKBACK'
  | 'DAMAGED' | 'DYING' | 'SUBMERGED' | 'INVISIBLE';

// Spawn behavior (how an enemy enters the screen)
type SpawnBehavior =
  | 'IMMEDIATE' | 'EMERGE_GROUND' | 'EMERGE_WATER'
  | 'FLY_IN' | 'FALL_FROM_ABOVE' | 'STATIONARY';

// Despawn behavior
type DespawnBehavior = 'ON_DEATH' | 'ON_SCREEN_EXIT' | 'PERSISTENT';

// Player weapon types for damage calculations
type PlayerWeaponType =
  | 'WOODEN_SWORD' | 'WHITE_SWORD' | 'MAGICAL_SWORD'
  | 'SWORD_BEAM'
  | 'ARROW' | 'SILVER_ARROW'
  | 'BOMB'
  | 'BOOMERANG' | 'MAGIC_BOOMERANG'
  | 'CANDLE_FLAME'
  | 'MAGIC_ROD' | 'MAGIC_ROD_FLAME'
  | 'RECORDER';

// Enemy projectile types
type ProjectileType =
  | 'ROCK' | 'ARROW' | 'MAGIC_BEAM'
  | 'FIREBALL' | 'ZORA_FIREBALL' | 'SWORD_BEAM';

// Projectile aiming mode
type AimMode =
  | 'CARDINAL_AT_LINK' | 'EXACT_AT_LINK'
  | 'CURRENT_FACING' | 'FIXED_DIRECTIONS';

// Drop table groups (cross-ref US-001)
type DropGroup = 'A' | 'B' | 'C' | 'D';

// Tile collision types (cross-ref US-002)
type TileCollision = 'SOLID' | 'PASSABLE' | 'WATER' | 'PIT' | 'STAIRS' | 'BUSH' | 'ROCK';

// Direction (cross-ref US-001)
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
```
