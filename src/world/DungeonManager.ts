// DungeonManager.ts - Manages dungeon navigation and door states
// Handles dungeon entry, room transitions, locked doors, and shutter doors

import {
  TILE_SIZE,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
  DUNGEON_GRID_WIDTH,
  DUNGEON_GRID_HEIGHT,
} from '../constants';
import type {
  Direction,
  DungeonRoom,
  DungeonDefinition,
  DoorState,
  AABB,
} from '../types';
import {
  getDungeon,
  getDungeonRoom,
  DUNGEON_TILE_IDS,
} from '../data/dungeonData';

/**
 * Information about a dungeon room transition
 */
export interface DungeonTransitionInfo {
  direction: Direction;
  fromRoom: { col: number; row: number };
  toRoom: { col: number; row: number };
  doorState: DoorState;
}

/**
 * Runtime door state that can change during gameplay
 * (e.g., shutter doors open when enemies defeated)
 */
export interface RuntimeDoorState {
  up: DoorState;
  down: DoorState;
  left: DoorState;
  right: DoorState;
}

/**
 * Door position info for collision/interaction
 */
export interface DoorPosition {
  direction: Direction;
  x: number;
  y: number;
  width: number;
  height: number;
  state: DoorState;
}

/**
 * Dungeon progress tracking for map/compass/items
 */
export interface DungeonProgressState {
  hasMap: boolean;
  hasCompass: boolean;
  bossDefeated: boolean;
  triforceCollected: boolean;
  visitedRooms: Set<string>;
  collectedRoomItems: Set<string>; // "col,row:index" format
  unlockedDoors: Set<string>; // "col,row:direction" format
}

/**
 * Manages dungeon state and navigation
 */
export class DungeonManager {
  private currentDungeonId: number | null = null;
  private currentRoomCol: number = 0;
  private currentRoomRow: number = 0;
  private inDungeon: boolean = false;

  // Runtime door states per room (can change from base definition)
  // Key: "col,row", Value: runtime door state
  private roomDoorStates: Map<string, RuntimeDoorState> = new Map();

  // Track which rooms have been cleared (all enemies defeated)
  private clearedRooms: Set<string> = new Set();

  // Track which rooms have had their items collected
  private collectedItems: Map<string, Set<number>> = new Map();

  // Dungeon progress tracking per dungeon (Map, Compass, etc.)
  // Key: dungeonId, Value: progress state
  private dungeonProgress: Map<number, DungeonProgressState> = new Map();

  /**
   * Check if currently in a dungeon
   */
  isInDungeon(): boolean {
    return this.inDungeon;
  }

  /**
   * Get current dungeon ID (null if not in dungeon)
   */
  getCurrentDungeonId(): number | null {
    return this.currentDungeonId;
  }

  /**
   * Get current room coordinates
   */
  getCurrentRoom(): { col: number; row: number } {
    return {
      col: this.currentRoomCol,
      row: this.currentRoomRow,
    };
  }

  /**
   * Get the current dungeon definition
   */
  getCurrentDungeon(): DungeonDefinition | null {
    if (this.currentDungeonId === null) return null;
    return getDungeon(this.currentDungeonId);
  }

  /**
   * Get the current room data
   */
  getCurrentRoomData(): DungeonRoom | null {
    if (this.currentDungeonId === null) return null;
    return getDungeonRoom(this.currentDungeonId, this.currentRoomCol, this.currentRoomRow);
  }

  /**
   * Enter a dungeon from the overworld
   * @param dungeonId The dungeon to enter
   * @returns True if entry was successful
   */
  enterDungeon(dungeonId: number): boolean {
    const dungeon = getDungeon(dungeonId);
    if (!dungeon) {
      console.error(`Dungeon ${dungeonId} not found`);
      return false;
    }

    this.currentDungeonId = dungeonId;
    this.inDungeon = true;

    // Start at dungeon entrance
    this.currentRoomCol = dungeon.entranceCol;
    this.currentRoomRow = dungeon.entranceRow;

    // Initialize dungeon progress if not exists
    this.initializeDungeonProgress(dungeonId);

    // Mark entrance room as visited
    this.markRoomVisited(this.currentRoomCol, this.currentRoomRow);

    // Initialize door states for the entrance room
    this.initializeRoomDoorStates(this.currentRoomCol, this.currentRoomRow);

    console.log(`Entered dungeon ${dungeonId} (${dungeon.name}) at room (${this.currentRoomCol}, ${this.currentRoomRow})`);
    return true;
  }

  /**
   * Initialize progress tracking for a dungeon
   */
  private initializeDungeonProgress(dungeonId: number): void {
    if (this.dungeonProgress.has(dungeonId)) return;

    this.dungeonProgress.set(dungeonId, {
      hasMap: false,
      hasCompass: false,
      bossDefeated: false,
      triforceCollected: false,
      visitedRooms: new Set(),
      collectedRoomItems: new Set(),
      unlockedDoors: new Set(),
    });
  }

  /**
   * Get dungeon progress for a dungeon
   */
  getDungeonProgress(dungeonId: number): DungeonProgressState | null {
    return this.dungeonProgress.get(dungeonId) ?? null;
  }

  /**
   * Get current dungeon's progress
   */
  getCurrentDungeonProgress(): DungeonProgressState | null {
    if (this.currentDungeonId === null) return null;
    return this.getDungeonProgress(this.currentDungeonId);
  }

  /**
   * Mark the current room as visited
   */
  markRoomVisited(col: number, row: number): void {
    const progress = this.getCurrentDungeonProgress();
    if (progress) {
      progress.visitedRooms.add(`${col},${row}`);
    }
  }

  /**
   * Check if a room has been visited
   */
  isRoomVisited(col: number, row: number): boolean {
    const progress = this.getCurrentDungeonProgress();
    if (!progress) return false;
    return progress.visitedRooms.has(`${col},${row}`);
  }

  /**
   * Collect a dungeon item (MAP, COMPASS, etc.)
   */
  collectDungeonItem(itemType: string): void {
    const progress = this.getCurrentDungeonProgress();
    if (!progress) return;

    switch (itemType) {
      case 'MAP':
        progress.hasMap = true;
        console.log(`Collected dungeon map for dungeon ${this.currentDungeonId}`);
        break;
      case 'COMPASS':
        progress.hasCompass = true;
        console.log(`Collected compass for dungeon ${this.currentDungeonId}`);
        break;
      case 'TRIFORCE_PIECE':
        progress.triforceCollected = true;
        console.log(`Collected Triforce piece from dungeon ${this.currentDungeonId}`);
        break;
    }
  }

  /**
   * Mark a room item as collected (to prevent respawn)
   */
  markRoomItemCollected(col: number, row: number, itemIndex: number): void {
    const progress = this.getCurrentDungeonProgress();
    if (progress) {
      progress.collectedRoomItems.add(`${col},${row}:${itemIndex}`);
    }
  }

  /**
   * Check if a room item has been collected
   */
  isRoomItemCollected(col: number, row: number, itemIndex: number): boolean {
    const progress = this.getCurrentDungeonProgress();
    if (!progress) return false;
    return progress.collectedRoomItems.has(`${col},${row}:${itemIndex}`);
  }

  /**
   * Get uncollected room items for current room
   */
  getUncollectedRoomItems(): { x: number; y: number; itemType: string; index: number }[] {
    const room = this.getCurrentRoomData();
    if (!room) return [];

    const uncollected: { x: number; y: number; itemType: string; index: number }[] = [];

    for (let i = 0; i < room.items.length; i++) {
      const item = room.items[i];
      if (!item) continue;

      // Skip if already collected
      if (this.isRoomItemCollected(this.currentRoomCol, this.currentRoomRow, i)) {
        continue;
      }

      // Check if item requires kill all (only show if room is cleared)
      if (item.requiresKillAll && !this.isRoomCleared()) {
        continue;
      }

      uncollected.push({
        x: item.x,
        y: item.y,
        itemType: item.itemType,
        index: i,
      });
    }

    return uncollected;
  }

  /**
   * Mark boss as defeated
   */
  markBossDefeated(): void {
    const progress = this.getCurrentDungeonProgress();
    if (progress) {
      progress.bossDefeated = true;
      console.log(`Boss defeated in dungeon ${this.currentDungeonId}`);
    }
  }

  /**
   * Check if boss is defeated
   */
  isBossDefeated(): boolean {
    const progress = this.getCurrentDungeonProgress();
    return progress?.bossDefeated ?? false;
  }

  /**
   * Check if player has dungeon map
   */
  hasMap(): boolean {
    const progress = this.getCurrentDungeonProgress();
    return progress?.hasMap ?? false;
  }

  /**
   * Check if player has compass
   */
  hasCompass(): boolean {
    const progress = this.getCurrentDungeonProgress();
    return progress?.hasCompass ?? false;
  }

  /**
   * Check if Triforce has been collected
   */
  hasTriforce(): boolean {
    const progress = this.getCurrentDungeonProgress();
    return progress?.triforceCollected ?? false;
  }

  /**
   * Get all visited rooms (for map display)
   */
  getVisitedRooms(): { col: number; row: number }[] {
    const progress = this.getCurrentDungeonProgress();
    if (!progress) return [];

    const rooms: { col: number; row: number }[] = [];
    for (const key of progress.visitedRooms) {
      const [colStr, rowStr] = key.split(',');
      const col = parseInt(colStr ?? '0', 10);
      const row = parseInt(rowStr ?? '0', 10);
      rooms.push({ col, row });
    }
    return rooms;
  }

  /**
   * Get dungeon map data for pause screen display
   */
  getDungeonMapData(): {
    rooms: { col: number; row: number; visited: boolean }[];
    hasMap: boolean;
    hasCompass: boolean;
    triforceRoom: { col: number; row: number } | undefined;
  } | null {
    if (this.currentDungeonId === null) return null;

    const dungeon = getDungeon(this.currentDungeonId);
    if (!dungeon) return null;

    const progress = this.getCurrentDungeonProgress();
    if (!progress) return null;

    // Build room list
    const rooms: { col: number; row: number; visited: boolean }[] = [];

    // If has map, show all defined rooms
    if (progress.hasMap) {
      for (let row = 0; row < dungeon.gridHeight; row++) {
        const roomRow = dungeon.rooms[row];
        if (!roomRow) continue;
        for (let col = 0; col < dungeon.gridWidth; col++) {
          const room = roomRow[col];
          if (room) {
            rooms.push({
              col,
              row,
              visited: progress.visitedRooms.has(`${col},${row}`),
            });
          }
        }
      }
    } else {
      // Only show visited rooms
      for (const key of progress.visitedRooms) {
        const [colStr, rowStr] = key.split(',');
        const col = parseInt(colStr ?? '0', 10);
        const row = parseInt(rowStr ?? '0', 10);
        rooms.push({ col, row, visited: true });
      }
    }

    return {
      rooms,
      hasMap: progress.hasMap,
      hasCompass: progress.hasCompass,
      triforceRoom: progress.hasCompass
        ? { col: dungeon.triforceCol, row: dungeon.triforceRow }
        : undefined,
    };
  }

  /**
   * Exit the dungeon and return to overworld
   */
  exitDungeon(): void {
    this.currentDungeonId = null;
    this.inDungeon = false;
    this.currentRoomCol = 0;
    this.currentRoomRow = 0;
    console.log('Exited dungeon');
  }

  /**
   * Initialize runtime door states for a room (copies from base definition)
   */
  private initializeRoomDoorStates(col: number, row: number): void {
    if (this.currentDungeonId === null) return;

    const room = getDungeonRoom(this.currentDungeonId, col, row);
    if (!room) return;

    const key = `${col},${row}`;

    // If already initialized, don't overwrite
    if (this.roomDoorStates.has(key)) return;

    // Copy door states from room definition
    this.roomDoorStates.set(key, {
      up: room.doors.up,
      down: room.doors.down,
      left: room.doors.left,
      right: room.doors.right,
    });
  }

  /**
   * Get runtime door states for the current room
   */
  getRoomDoorStates(): RuntimeDoorState {
    const key = `${this.currentRoomCol},${this.currentRoomRow}`;
    const states = this.roomDoorStates.get(key);

    if (!states) {
      // Return all walls if not initialized
      return { up: 'WALL', down: 'WALL', left: 'WALL', right: 'WALL' };
    }

    return states;
  }

  /**
   * Get door state for a specific direction in current room
   */
  getDoorState(direction: Direction): DoorState {
    const states = this.getRoomDoorStates();
    switch (direction) {
      case 'UP': return states.up;
      case 'DOWN': return states.down;
      case 'LEFT': return states.left;
      case 'RIGHT': return states.right;
    }
  }

  /**
   * Set door state for a specific direction in current room
   */
  setDoorState(direction: Direction, state: DoorState): void {
    const key = `${this.currentRoomCol},${this.currentRoomRow}`;
    let states = this.roomDoorStates.get(key);

    if (!states) {
      this.initializeRoomDoorStates(this.currentRoomCol, this.currentRoomRow);
      states = this.roomDoorStates.get(key);
      if (!states) return;
    }

    switch (direction) {
      case 'UP': states.up = state; break;
      case 'DOWN': states.down = state; break;
      case 'LEFT': states.left = state; break;
      case 'RIGHT': states.right = state; break;
    }
  }

  /**
   * Check if door is passable (OPEN state)
   */
  isDoorPassable(direction: Direction): boolean {
    return this.getDoorState(direction) === 'OPEN';
  }

  /**
   * Check if door is locked (requires key)
   */
  isDoorLocked(direction: Direction): boolean {
    return this.getDoorState(direction) === 'LOCKED';
  }

  /**
   * Check if door is a shutter door (opens when room cleared)
   */
  isDoorShutter(direction: Direction): boolean {
    return this.getDoorState(direction) === 'SHUTTER';
  }

  /**
   * Attempt to open a locked door using a key
   * @returns True if door was unlocked
   */
  tryUnlockDoor(direction: Direction): boolean {
    if (!this.isDoorLocked(direction)) {
      return false;
    }

    // Door will be unlocked - caller should check/consume key
    this.setDoorState(direction, 'OPEN');
    console.log(`Unlocked ${direction} door at (${this.currentRoomCol}, ${this.currentRoomRow})`);
    return true;
  }

  /**
   * Mark current room as cleared and open shutter doors
   */
  markRoomCleared(): void {
    const key = `${this.currentRoomCol},${this.currentRoomRow}`;

    if (this.clearedRooms.has(key)) {
      return; // Already cleared
    }

    this.clearedRooms.add(key);

    // Open all shutter doors in this room
    const states = this.getRoomDoorStates();
    if (states.up === 'SHUTTER') this.setDoorState('UP', 'OPEN');
    if (states.down === 'SHUTTER') this.setDoorState('DOWN', 'OPEN');
    if (states.left === 'SHUTTER') this.setDoorState('LEFT', 'OPEN');
    if (states.right === 'SHUTTER') this.setDoorState('RIGHT', 'OPEN');

    console.log(`Room (${this.currentRoomCol}, ${this.currentRoomRow}) cleared, shutter doors opened`);
  }

  /**
   * Check if current room has been cleared
   */
  isRoomCleared(): boolean {
    const key = `${this.currentRoomCol},${this.currentRoomRow}`;
    return this.clearedRooms.has(key);
  }

  /**
   * Get door positions for collision detection and rendering
   */
  getDoorPositions(): DoorPosition[] {
    const positions: DoorPosition[] = [];
    const states = this.getRoomDoorStates();

    // Top door (center of top edge)
    positions.push({
      direction: 'UP',
      x: 7 * TILE_SIZE, // Columns 7-8 (2 tiles wide)
      y: 0,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE,
      state: states.up,
    });

    // Bottom door (center of bottom edge)
    positions.push({
      direction: 'DOWN',
      x: 7 * TILE_SIZE,
      y: 10 * TILE_SIZE,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE,
      state: states.down,
    });

    // Left door (center of left edge)
    positions.push({
      direction: 'LEFT',
      x: 0,
      y: 5 * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      state: states.left,
    });

    // Right door (center of right edge)
    positions.push({
      direction: 'RIGHT',
      x: 15 * TILE_SIZE,
      y: 5 * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      state: states.right,
    });

    return positions;
  }

  /**
   * Check if player is at a door that can trigger a transition
   * @param playerHitbox Player's collision hitbox
   * @returns Transition info or null
   */
  checkRoomTransition(playerHitbox: AABB): DungeonTransitionInfo | null {
    if (!this.inDungeon || this.currentDungeonId === null) return null;

    const centerX = playerHitbox.x + playerHitbox.width / 2;
    const centerY = playerHitbox.y + playerHitbox.height / 2;

    // Check each door position
    // Top door
    if (centerY < 0) {
      const newRow = this.currentRoomRow - 1;
      if (this.canTransitionTo('UP', this.currentRoomCol, newRow)) {
        return {
          direction: 'UP',
          fromRoom: { col: this.currentRoomCol, row: this.currentRoomRow },
          toRoom: { col: this.currentRoomCol, row: newRow },
          doorState: this.getDoorState('UP'),
        };
      }
    }

    // Bottom door
    if (centerY >= PLAY_AREA_HEIGHT) {
      const newRow = this.currentRoomRow + 1;
      if (this.canTransitionTo('DOWN', this.currentRoomCol, newRow)) {
        return {
          direction: 'DOWN',
          fromRoom: { col: this.currentRoomCol, row: this.currentRoomRow },
          toRoom: { col: this.currentRoomCol, row: newRow },
          doorState: this.getDoorState('DOWN'),
        };
      }
    }

    // Left door
    if (centerX < 0) {
      const newCol = this.currentRoomCol - 1;
      if (this.canTransitionTo('LEFT', newCol, this.currentRoomRow)) {
        return {
          direction: 'LEFT',
          fromRoom: { col: this.currentRoomCol, row: this.currentRoomRow },
          toRoom: { col: newCol, row: this.currentRoomRow },
          doorState: this.getDoorState('LEFT'),
        };
      }
    }

    // Right door
    if (centerX >= PLAY_AREA_WIDTH) {
      const newCol = this.currentRoomCol + 1;
      if (this.canTransitionTo('RIGHT', newCol, this.currentRoomRow)) {
        return {
          direction: 'RIGHT',
          fromRoom: { col: this.currentRoomCol, row: this.currentRoomRow },
          toRoom: { col: newCol, row: this.currentRoomRow },
          doorState: this.getDoorState('RIGHT'),
        };
      }
    }

    return null;
  }

  /**
   * Check if a room transition is valid
   */
  canTransitionTo(direction: Direction, toCol: number, toRow: number): boolean {
    if (!this.inDungeon || this.currentDungeonId === null) return false;

    // Check bounds
    if (toCol < 0 || toCol >= DUNGEON_GRID_WIDTH) return false;
    if (toRow < 0 || toRow >= DUNGEON_GRID_HEIGHT) return false;

    // Check if target room exists
    const targetRoom = getDungeonRoom(this.currentDungeonId, toCol, toRow);
    if (!targetRoom) return false;

    // Check if door is passable (OPEN state only)
    return this.isDoorPassable(direction);
  }

  /**
   * Perform room transition
   * @returns New room data or null if transition failed
   */
  transitionToRoom(direction: Direction, toCol: number, toRow: number): DungeonRoom | null {
    if (!this.canTransitionTo(direction, toCol, toRow)) return null;
    if (this.currentDungeonId === null) return null;

    const newRoom = getDungeonRoom(this.currentDungeonId, toCol, toRow);
    if (!newRoom) return null;

    // Update current room
    this.currentRoomCol = toCol;
    this.currentRoomRow = toRow;

    // Mark new room as visited
    this.markRoomVisited(toCol, toRow);

    // Initialize door states for the new room
    this.initializeRoomDoorStates(toCol, toRow);

    console.log(`Transitioned to room (${toCol}, ${toRow})`);
    return newRoom;
  }

  /**
   * Get player spawn position after entering a room from a direction
   */
  getSpawnPositionForDirection(fromDirection: Direction): { x: number; y: number } {
    // Player enters from opposite edge
    switch (fromDirection) {
      case 'UP':
        // Came from above, enter from top
        return { x: 120, y: PLAY_AREA_HEIGHT - 24 };
      case 'DOWN':
        // Came from below, enter from bottom
        return { x: 120, y: 8 };
      case 'LEFT':
        // Came from left, enter from left side
        return { x: PLAY_AREA_WIDTH - 24, y: 80 };
      case 'RIGHT':
        // Came from right, enter from right side
        return { x: 8, y: 80 };
    }
  }

  /**
   * Get spawn position for dungeon entrance
   */
  getEntranceSpawnPosition(): { x: number; y: number } {
    // Spawn near the stairs at bottom center
    return { x: 120, y: 128 };
  }

  /**
   * Check if player is on stairs (for dungeon exit)
   */
  isOnStairs(playerHitbox: AABB): boolean {
    const room = this.getCurrentRoomData();
    if (!room) return false;

    // Find stairs tiles
    for (let row = 0; row < 11; row++) {
      for (let col = 0; col < 16; col++) {
        const index = row * 16 + col;
        const tile = room.tiles[index];
        if (tile && tile.tileId === DUNGEON_TILE_IDS.STAIRS) {
          // Check if player overlaps with stairs tile
          const stairsBounds: AABB = {
            x: col * TILE_SIZE,
            y: row * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
          };

          // Simple AABB overlap check
          if (
            playerHitbox.x < stairsBounds.x + stairsBounds.width &&
            playerHitbox.x + playerHitbox.width > stairsBounds.x &&
            playerHitbox.y < stairsBounds.y + stairsBounds.height &&
            playerHitbox.y + playerHitbox.height > stairsBounds.y
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if player is near a locked door (for key prompt)
   */
  getLockedDoorAtPlayer(playerHitbox: AABB): Direction | null {
    const centerX = playerHitbox.x + playerHitbox.width / 2;
    const centerY = playerHitbox.y + playerHitbox.height / 2;

    const doorThreshold = TILE_SIZE; // How close player needs to be

    // Check each direction
    if (centerY < doorThreshold && this.isDoorLocked('UP')) {
      return 'UP';
    }
    if (centerY > PLAY_AREA_HEIGHT - doorThreshold && this.isDoorLocked('DOWN')) {
      return 'DOWN';
    }
    if (centerX < doorThreshold && this.isDoorLocked('LEFT')) {
      return 'LEFT';
    }
    if (centerX > PLAY_AREA_WIDTH - doorThreshold && this.isDoorLocked('RIGHT')) {
      return 'RIGHT';
    }

    return null;
  }

  /**
   * Update tiles to reflect current door states
   * Call this to get tiles with proper door rendering
   */
  getUpdatedTiles(): { tileId: number; collision: string }[] | null {
    const room = this.getCurrentRoomData();
    if (!room) return null;

    // Copy tiles from room
    const tiles = room.tiles.map(t => ({
      tileId: t.tileId,
      collision: t.collision,
    }));

    const doorStates = this.getRoomDoorStates();

    // Update door tile IDs based on runtime state
    const doorTileMap: Record<DoorState, number> = {
      'OPEN': DUNGEON_TILE_IDS.DOOR_OPEN,
      'LOCKED': DUNGEON_TILE_IDS.DOOR_LOCKED,
      'SHUTTER': DUNGEON_TILE_IDS.DOOR_SHUTTER,
      'BOMBABLE': DUNGEON_TILE_IDS.WALL, // Look like wall until bombed
      'WALL': DUNGEON_TILE_IDS.WALL,
    };

    // Top door (row 0, cols 7-8)
    if (doorStates.up !== 'WALL') {
      const doorTile = doorTileMap[doorStates.up];
      const collision = doorStates.up === 'OPEN' ? 'PASSABLE' : 'SOLID';
      tiles[7] = { tileId: doorTile, collision };
      tiles[8] = { tileId: doorTile, collision };
    }

    // Bottom door (row 10, cols 7-8)
    if (doorStates.down !== 'WALL') {
      const doorTile = doorTileMap[doorStates.down];
      const collision = doorStates.down === 'OPEN' ? 'PASSABLE' : 'SOLID';
      tiles[10 * 16 + 7] = { tileId: doorTile, collision };
      tiles[10 * 16 + 8] = { tileId: doorTile, collision };
    }

    // Left door (row 5, col 0)
    if (doorStates.left !== 'WALL') {
      const doorTile = doorTileMap[doorStates.left];
      const collision = doorStates.left === 'OPEN' ? 'PASSABLE' : 'SOLID';
      tiles[5 * 16] = { tileId: doorTile, collision };
    }

    // Right door (row 5, col 15)
    if (doorStates.right !== 'WALL') {
      const doorTile = doorTileMap[doorStates.right];
      const collision = doorStates.right === 'OPEN' ? 'PASSABLE' : 'SOLID';
      tiles[5 * 16 + 15] = { tileId: doorTile, collision };
    }

    return tiles;
  }

  /**
   * Reset dungeon state (for new game)
   */
  reset(): void {
    this.currentDungeonId = null;
    this.currentRoomCol = 0;
    this.currentRoomRow = 0;
    this.inDungeon = false;
    this.roomDoorStates.clear();
    this.clearedRooms.clear();
    this.collectedItems.clear();
    this.dungeonProgress.clear();
  }

  /**
   * Load dungeon progress from save data
   */
  loadProgress(dungeonId: number, progress: {
    hasMap: boolean;
    hasCompass: boolean;
    bossDefeated: boolean;
    triforceCollected: boolean;
    visitedRooms: string[];
    collectedRoomItems: string[];
    unlockedDoors: string[];
  }): void {
    this.dungeonProgress.set(dungeonId, {
      hasMap: progress.hasMap,
      hasCompass: progress.hasCompass,
      bossDefeated: progress.bossDefeated,
      triforceCollected: progress.triforceCollected,
      visitedRooms: new Set(progress.visitedRooms),
      collectedRoomItems: new Set(progress.collectedRoomItems),
      unlockedDoors: new Set(progress.unlockedDoors),
    });
  }

  /**
   * Export dungeon progress for saving
   */
  exportProgress(dungeonId: number): {
    hasMap: boolean;
    hasCompass: boolean;
    bossDefeated: boolean;
    triforceCollected: boolean;
    visitedRooms: string[];
    collectedRoomItems: string[];
    unlockedDoors: string[];
  } | null {
    const progress = this.dungeonProgress.get(dungeonId);
    if (!progress) return null;

    return {
      hasMap: progress.hasMap,
      hasCompass: progress.hasCompass,
      bossDefeated: progress.bossDefeated,
      triforceCollected: progress.triforceCollected,
      visitedRooms: Array.from(progress.visitedRooms),
      collectedRoomItems: Array.from(progress.collectedRoomItems),
      unlockedDoors: Array.from(progress.unlockedDoors),
    };
  }

  /**
   * Get all dungeon progress for saving
   */
  exportAllProgress(): Map<number, {
    hasMap: boolean;
    hasCompass: boolean;
    bossDefeated: boolean;
    triforceCollected: boolean;
    visitedRooms: string[];
    collectedRoomItems: string[];
    unlockedDoors: string[];
  }> {
    const result = new Map<number, {
      hasMap: boolean;
      hasCompass: boolean;
      bossDefeated: boolean;
      triforceCollected: boolean;
      visitedRooms: string[];
      collectedRoomItems: string[];
      unlockedDoors: string[];
    }>();

    for (const dungeonId of this.dungeonProgress.keys()) {
      const exported = this.exportProgress(dungeonId);
      if (exported) {
        result.set(dungeonId, exported);
      }
    }

    return result;
  }
}

// Singleton instance
let dungeonManagerInstance: DungeonManager | null = null;

/**
 * Get the singleton DungeonManager instance
 */
export function getDungeonManager(): DungeonManager {
  if (!dungeonManagerInstance) {
    dungeonManagerInstance = new DungeonManager();
  }
  return dungeonManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetDungeonManager(): void {
  if (dungeonManagerInstance) {
    dungeonManagerInstance.reset();
  }
  dungeonManagerInstance = null;
}
