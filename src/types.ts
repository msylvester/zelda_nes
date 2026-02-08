// types.ts - Shared type definitions
// All TypeScript interfaces from spec section 6 (Data Schemas)

// ===== BASIC TYPES =====

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type TileCollision =
  | 'SOLID'
  | 'PASSABLE'
  | 'WATER'
  | 'PIT'
  | 'STAIRS'
  | 'BUSH'
  | 'ROCK';

export type SpritePriority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type MapContext = 'OVERWORLD' | 'DUNGEON' | 'CAVE';

export type HalfHearts = number;

// ===== GAME PHASES =====

export type GamePhase =
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

export type PlayerState =
  | 'IDLE'
  | 'WALKING'
  | 'ATTACKING'
  | 'USING_ITEM'
  | 'KNOCKBACK'
  | 'INVINCIBLE'
  | 'DYING';

export type EnemyState =
  | 'SPAWNING'
  | 'ACTIVE'
  | 'STUNNED'
  | 'KNOCKBACK'
  | 'DAMAGED'
  | 'DYING'
  | 'SUBMERGED'
  | 'INVISIBLE';

// ===== INPUT =====

export type NesButton =
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'A'
  | 'B'
  | 'START'
  | 'SELECT';

export interface ButtonState {
  held: boolean;
  justPressed: boolean;
  justReleased: boolean;
}

export interface InputSnapshot {
  buttons: Record<NesButton, ButtonState>;
  activeDirection: Direction | null;
  facingDirection: Direction;
  frameNumber: number;
}

// ===== GEOMETRY =====

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HitboxDefinition {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

// ===== TILES AND WORLD =====

export interface TileData {
  tileId: number;
  collision: TileCollision;
}

export interface OverworldScreen {
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

export type OverworldScreenType =
  | 'NORMAL'
  | 'FAIRY_FOUNTAIN'
  | 'SHOP'
  | 'NPC_CAVE'
  | 'DUNGEON_ENTRANCE'
  | 'WARP_POINT';

export interface EnemySpawn {
  archetypeId: string;
  x: number;
  y: number;
  spawnDelay: number;
}

export interface ScreenEntrance {
  x: number;
  y: number;
  destinationType: 'CAVE' | 'DUNGEON' | 'WARP';
  destinationId: number;
}

export interface HiddenItem {
  x: number;
  y: number;
  itemType: string;
  revealCondition: 'BURN' | 'BOMB' | 'PUSH' | 'KILL_ALL';
}

// ===== DUNGEON =====

export interface DungeonRoom {
  roomCol: number;
  roomRow: number;
  tiles: TileData[];
  doors: DoorConfig;
  enemySpawns: EnemySpawn[];
  items: RoomItem[];
  isDark: boolean;
  pushBlock?: PushBlock;
  roomType: DungeonRoomType;
  paletteId: number;
}

export interface DoorConfig {
  up: DoorState;
  down: DoorState;
  left: DoorState;
  right: DoorState;
}

export type DoorState = 'OPEN' | 'LOCKED' | 'SHUTTER' | 'BOMBABLE' | 'WALL';

export type DungeonRoomType =
  | 'NORMAL'
  | 'BOSS'
  | 'ITEM'
  | 'TRIFORCE'
  | 'ENTRANCE'
  | 'PASSAGE'
  | 'NPC'
  | 'TRAP';

export interface RoomItem {
  x: number;
  y: number;
  itemType: string;
  requiresKillAll: boolean;
}

export interface PushBlock {
  x: number;
  y: number;
  pushDirection: Direction;
  revealsStairs: boolean;
  destinationId?: number;
}

export interface DungeonDefinition {
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

export type BossType =
  | 'AQUAMENTUS'
  | 'DODONGO'
  | 'MANHANDLA'
  | 'GLEEOK'
  | 'DIGDOGGER'
  | 'GOHMA'
  | 'PATRA'
  | 'GANON';

// ===== ENEMIES =====

export type EnemyBaseType =
  | 'OCTOROK'
  | 'TEKTITE'
  | 'LEEVER'
  | 'PEAHAT'
  | 'ZORA'
  | 'LYNEL'
  | 'MOBLIN'
  | 'DARKNUT'
  | 'WIZZROBE'
  | 'GIBDO'
  | 'LIKE_LIKE'
  | 'STALFOS'
  | 'KEESE'
  | 'GEL'
  | 'ZOL'
  | 'GORIYA'
  | 'ROPE'
  | 'WALLMASTER'
  | 'VIRE'
  | 'POLS_VOICE'
  | 'LANMOLA'
  | 'BUBBLE'
  | 'BLADE_TRAP'
  | 'FIREBALL_TURRET'
  | 'AQUAMENTUS'
  | 'DODONGO'
  | 'MANHANDLA'
  | 'GLEEOK'
  | 'DIGDOGGER'
  | 'GOHMA'
  | 'PATRA'
  | 'GANON';

export type EnemyVariant = 'RED' | 'BLUE' | 'DEFAULT';

export interface EnemyArchetype {
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

export interface EnemyFlags {
  swordImmune: boolean;
  stealsItem: boolean;
  warpsLink: boolean;
  splitsOnDeath: boolean;
  splitInto: string[];
  conditionalVulnerability: boolean;
  weaknessItem: string | null;
  phasesThroughWalls: boolean;
}

export type SpawnBehavior =
  | 'IMMEDIATE'
  | 'EMERGE_GROUND'
  | 'EMERGE_WATER'
  | 'FLY_IN'
  | 'FALL_FROM_ABOVE'
  | 'STATIONARY';

export type DespawnBehavior = 'ON_DEATH' | 'ON_SCREEN_EXIT' | 'PERSISTENT';

// ===== MOVEMENT PATTERNS =====

export type MovementPattern =
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

export interface RandomWalkPattern {
  type: 'RANDOM_WALK';
  speed: number;
  walkDuration: { min: number; max: number };
  pauseDuration: { min: number; max: number };
  axisAligned: boolean;
  respectsCollision: boolean;
}

export interface ChasePattern {
  type: 'CHASE';
  speed: number;
  activationRange: number;
  axisAligned: boolean;
  idlePattern: MovementPattern;
  respectsCollision: boolean;
}

export interface HopPattern {
  type: 'HOP';
  hopSpeed: number;
  hopDuration: number;
  restDuration: { min: number; max: number };
  hopDirection: 'RANDOM' | 'TOWARD_LINK';
  respectsCollision: boolean;
}

export interface CircularPattern {
  type: 'CIRCULAR';
  centerX: number;
  centerY: number;
  radius: number;
  angularSpeed: number;
  direction: 'CW' | 'CCW';
}

export interface EmergePattern {
  type: 'EMERGE';
  emergeTile: TileCollision;
  submergedDuration: { min: number; max: number };
  surfacedDuration: { min: number; max: number };
  movesWhileSurfaced: boolean;
  surfaceSpeed: number;
}

export interface StationaryPattern {
  type: 'STATIONARY';
  activationTrigger: 'NONE' | 'SAME_ROW' | 'SAME_COLUMN' | 'PROXIMITY';
  activatedSpeed: number;
  returnSpeed: number;
  activatedDistance: number;
}

export interface DashPattern {
  type: 'DASH';
  idleSpeed: number;
  dashSpeed: number;
  dashTrigger: 'LINE_OF_SIGHT' | 'PROXIMITY';
  dashDirection: 'TOWARD_LINK' | 'CURRENT_FACING';
  triggerDistance: number;
  idlePattern: RandomWalkPattern;
}

export interface TeleportPattern {
  type: 'TELEPORT';
  visibleDuration: { min: number; max: number };
  invisibleDuration: { min: number; max: number };
  attacksWhileVisible: boolean;
  destinationMode: 'RANDOM' | 'NEAR_LINK';
  minDistanceFromLink: number;
}

export interface FlyPattern {
  type: 'FLY';
  speed: number;
  directionChangePeriod: { min: number; max: number };
  entersFromEdge: boolean;
  ignoresCollision: boolean;
  wobble: boolean;
  wobbleAmplitude: number;
}

export interface TrackPattern {
  type: 'TRACK';
  waypoints: { x: number; y: number }[];
  speed: number;
  loop: boolean;
  endBehavior: 'STOP' | 'REVERSE';
}

// ===== ATTACK PATTERNS =====

export type AttackPattern =
  | ProjectileAttack
  | BoomerangAttack
  | ContactOnlyAttack
  | BreathAttack
  | SplitAttack
  | SummonAttack;

export interface ProjectileAttack {
  type: 'PROJECTILE';
  projectileType: ProjectileType;
  cooldown: { min: number; max: number };
  aimMode: AimMode;
  volleyCount: number;
  volleySpread: number;
  maxActiveProjectiles: number;
  pausesDuringAttack: boolean;
  attackAnimationFrames: number;
}

export interface BoomerangAttack {
  type: 'BOOMERANG';
  range: number;
  speed: number;
  cooldown: { min: number; max: number };
  returns: boolean;
  damage: number;
}

export interface ContactOnlyAttack {
  type: 'CONTACT_ONLY';
}

export interface BreathAttack {
  type: 'BREATH';
  projectileCount: number;
  spreadAngle: number;
  projectileType: ProjectileType;
  cooldown: { min: number; max: number };
}

export interface SplitAttack {
  type: 'SPLIT';
  triggerCondition: 'ITEM_USED' | 'HP_THRESHOLD';
  triggerItem?: string;
  hpThreshold?: number;
  splitResult: { enemyId: string; count: number };
}

export interface SummonAttack {
  type: 'SUMMON';
  summonedEnemy: string;
  maxSummoned: number;
  cooldown: { min: number; max: number };
}

export type AimMode =
  | 'CARDINAL_AT_LINK'
  | 'EXACT_AT_LINK'
  | 'CURRENT_FACING'
  | 'FIXED_DIRECTIONS';

// ===== COMBAT =====

export type PlayerWeaponType =
  | 'WOODEN_SWORD'
  | 'WHITE_SWORD'
  | 'MAGICAL_SWORD'
  | 'SWORD_BEAM'
  | 'ARROW'
  | 'SILVER_ARROW'
  | 'BOMB'
  | 'BOOMERANG'
  | 'MAGIC_BOOMERANG'
  | 'CANDLE_FLAME'
  | 'MAGIC_ROD'
  | 'MAGIC_ROD_FLAME'
  | 'RECORDER';

export type ProjectileType =
  | 'ROCK'
  | 'ARROW'
  | 'MAGIC_BEAM'
  | 'FIREBALL'
  | 'ZORA_FIREBALL'
  | 'SWORD_BEAM'
  | 'BOOMERANG';

export interface DamageVulnerabilities {
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

export interface EnemyProjectile {
  type: ProjectileType;
  speed: number;
  damage: number;
  hitbox: HitboxDefinition;
  blockableByShield: boolean;
  destroyedByWalls: boolean;
  maxRange: number;
  spriteKey: string;
  animationKey: string | null;
}

export interface ShieldBlockRules {
  standardShieldBlocks: ProjectileType[];
  magicalShieldBlocks: ProjectileType[];
}

// ===== INVENTORY =====

export interface Inventory {
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

export type BItemSlot =
  | 'BOOMERANG'
  | 'BOMB'
  | 'BOW_ARROW'
  | 'CANDLE'
  | 'RECORDER'
  | 'FOOD'
  | 'POTION'
  | 'MAGIC_ROD';

// ===== ITEM DROPS =====

export type ItemDropType =
  | 'HEART'
  | 'RUPEE'
  | 'RUPEE_5'
  | 'BOMB'
  | 'KEY'
  | 'FAIRY'
  | 'CLOCK'
  | 'HEART_CONTAINER'
  | 'TRIFORCE_PIECE';

export type DropGroup = 'A' | 'B' | 'C' | 'D';

// ===== SAVE DATA =====

export interface SaveFile {
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

export interface DungeonProgress {
  dungeonIndex: number;
  hasMap: boolean;
  hasCompass: boolean;
  bossDefeated: boolean;
  triforceCollected: boolean;
  dungeonItemCollected: boolean;
  rooms: DungeonRoomState[];
  lockedDoorsOpened: string[];
}

export interface DungeonRoomState {
  roomCol: number;
  roomRow: number;
  visited: boolean;
  cleared: boolean;
  itemCollected: boolean;
}

export interface OverworldProgress {
  visitedScreens: string[];
  revealedSecrets: string[];
  collectedItems: string[];
}

export interface ProgressionFlags {
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

export interface SpriteRenderCommand {
  spriteKey: string;
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
  priority: SpritePriority;
  visible: boolean;
  paletteId?: number;
}

export interface Animation {
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
  onComplete?: 'DESTROY' | 'HOLD_LAST' | 'RESET';
}

export interface AnimationFrame {
  spriteKey: string;
  duration: number;
  hitboxActive?: boolean;
  offsetX?: number;
  offsetY?: number;
}

// ===== AUDIO =====

export interface SfxData {
  id: string;
  channels: ('pulse1' | 'pulse2' | 'triangle' | 'noise')[];
  priority: number;
  loops: boolean;
  channelFrames: Record<string, SfxFrame[]>;
}

export interface SfxFrame {
  frequency: number;
  volume: number;
  duration: number;
  waveform?: 'pulse' | 'triangle' | 'noise';
  dutyCycle?: number;
}

export interface MusicData {
  id: string;
  bpm: number;
  ticksPerBeat: number;
  loops: boolean;
  loopStartTick: number;
  channels: Record<string, MusicNote[]>;
}

export interface MusicNote {
  tick: number;
  frequency: number;
  duration: number;
  volume: number;
}

// ===== ASSETS =====

export interface GameAssets {
  overworldTileset: HTMLCanvasElement;
  dungeonTileset: HTMLCanvasElement;
  spriteSheet: HTMLCanvasElement;
  fontSheet: HTMLCanvasElement;
}

// ===== ENTITY BASE =====

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

// ===== TRANSITIONS =====

export type TransitionType = 'SCROLL' | 'FADE' | 'WIPE';

export interface ScreenTransitionData {
  type: TransitionType;
  direction: Direction;
  fromScreenCol: number;
  fromScreenRow: number;
  toScreenCol: number;
  toScreenRow: number;
  progress: number;
  totalFrames: number;
}

// ===== EVENTS =====

export type GameEvent =
  | { type: 'ENEMY_KILLED'; enemyId: string; position: { x: number; y: number } }
  | { type: 'PLAYER_DAMAGED'; amount: number; fromDirection: Direction }
  | { type: 'ITEM_COLLECTED'; itemType: string; position: { x: number; y: number } }
  | { type: 'SCREEN_CLEARED' }
  | { type: 'DOOR_OPENED'; direction: Direction }
  | { type: 'BOSS_DEFEATED'; bossType: BossType }
  | { type: 'TRIFORCE_COLLECTED'; dungeonId: number }
  | { type: 'PLAYER_DIED' }
  | { type: 'GAME_SAVED' }
  | { type: 'GAME_LOADED' };

// ===== UTILITY TYPES =====

export type Point = { x: number; y: number };

export type Range = { min: number; max: number };
