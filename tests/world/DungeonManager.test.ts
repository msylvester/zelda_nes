// DungeonManager.test.ts - Tests for dungeon navigation and door management

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DungeonManager,
  getDungeonManager,
  resetDungeonManager,
} from '../../src/world/DungeonManager';

describe('DungeonManager', () => {
  let dungeonManager: DungeonManager;

  beforeEach(() => {
    resetDungeonManager();
    dungeonManager = getDungeonManager();
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getDungeonManager();
      const instance2 = getDungeonManager();
      expect(instance1).toBe(instance2);
    });

    it('should return a new instance after reset', () => {
      const instance1 = getDungeonManager();
      instance1.enterDungeon(1);
      resetDungeonManager();
      const instance2 = getDungeonManager();
      expect(instance2.isInDungeon()).toBe(false);
    });
  });

  describe('initial state', () => {
    it('should not be in dungeon initially', () => {
      expect(dungeonManager.isInDungeon()).toBe(false);
    });

    it('should have null dungeon ID initially', () => {
      expect(dungeonManager.getCurrentDungeonId()).toBeNull();
    });

    it('should return null for current dungeon', () => {
      expect(dungeonManager.getCurrentDungeon()).toBeNull();
    });

    it('should return null for current room data', () => {
      expect(dungeonManager.getCurrentRoomData()).toBeNull();
    });
  });

  describe('enterDungeon', () => {
    it('should enter dungeon 1 successfully', () => {
      const result = dungeonManager.enterDungeon(1);
      expect(result).toBe(true);
      expect(dungeonManager.isInDungeon()).toBe(true);
      expect(dungeonManager.getCurrentDungeonId()).toBe(1);
    });

    it('should fail to enter non-existent dungeon', () => {
      const result = dungeonManager.enterDungeon(99);
      expect(result).toBe(false);
      expect(dungeonManager.isInDungeon()).toBe(false);
    });

    it('should start at dungeon entrance', () => {
      dungeonManager.enterDungeon(1);
      const room = dungeonManager.getCurrentRoom();
      // Dungeon 1 entrance is at (3, 7)
      expect(room.col).toBe(3);
      expect(room.row).toBe(7);
    });

    it('should get dungeon definition after entering', () => {
      dungeonManager.enterDungeon(1);
      const dungeon = dungeonManager.getCurrentDungeon();
      expect(dungeon).not.toBeNull();
      expect(dungeon?.name).toBe('Eagle');
      expect(dungeon?.dungeonId).toBe(1);
    });

    it('should get room data after entering', () => {
      dungeonManager.enterDungeon(1);
      const room = dungeonManager.getCurrentRoomData();
      expect(room).not.toBeNull();
      expect(room?.roomType).toBe('ENTRANCE');
    });
  });

  describe('exitDungeon', () => {
    it('should exit dungeon and reset state', () => {
      dungeonManager.enterDungeon(1);
      dungeonManager.exitDungeon();
      expect(dungeonManager.isInDungeon()).toBe(false);
      expect(dungeonManager.getCurrentDungeonId()).toBeNull();
    });

    it('should be safe to call when not in dungeon', () => {
      expect(() => dungeonManager.exitDungeon()).not.toThrow();
    });
  });

  describe('door states', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
    });

    it('should get door states for entrance room', () => {
      const states = dungeonManager.getRoomDoorStates();
      // Dungeon 1 entrance has OPEN door up, all others WALL
      expect(states.up).toBe('OPEN');
      expect(states.down).toBe('WALL');
      expect(states.left).toBe('WALL');
      expect(states.right).toBe('WALL');
    });

    it('should check if door is passable', () => {
      expect(dungeonManager.isDoorPassable('UP')).toBe(true);
      expect(dungeonManager.isDoorPassable('DOWN')).toBe(false);
    });

    it('should check if door is locked', () => {
      // Move to room with locked door (3, 5)
      dungeonManager.transitionToRoom('UP', 3, 6);
      dungeonManager.transitionToRoom('UP', 3, 5);
      expect(dungeonManager.isDoorLocked('UP')).toBe(true);
    });

    it('should check if door is shutter', () => {
      // Move to room with shutter door (3, 4) - map room has shutter on UP
      dungeonManager.transitionToRoom('UP', 3, 6);
      dungeonManager.transitionToRoom('UP', 3, 5);
      // Need to unlock the door first
      dungeonManager.tryUnlockDoor('UP');
      dungeonManager.transitionToRoom('UP', 3, 4);
      expect(dungeonManager.isDoorShutter('UP')).toBe(true);
    });

    it('should set door state', () => {
      dungeonManager.setDoorState('DOWN', 'OPEN');
      expect(dungeonManager.getDoorState('DOWN')).toBe('OPEN');
    });
  });

  describe('locked doors', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
      // Navigate to room with locked door
      dungeonManager.transitionToRoom('UP', 3, 6);
      dungeonManager.transitionToRoom('UP', 3, 5);
    });

    it('should unlock door with tryUnlockDoor', () => {
      expect(dungeonManager.isDoorLocked('UP')).toBe(true);
      const result = dungeonManager.tryUnlockDoor('UP');
      expect(result).toBe(true);
      expect(dungeonManager.isDoorLocked('UP')).toBe(false);
      expect(dungeonManager.isDoorPassable('UP')).toBe(true);
    });

    it('should return false when unlocking non-locked door', () => {
      const result = dungeonManager.tryUnlockDoor('DOWN');
      expect(result).toBe(false);
    });
  });

  describe('shutter doors', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
      // Navigate to room with shutter door (map room at 3,4)
      dungeonManager.transitionToRoom('UP', 3, 6);
      dungeonManager.transitionToRoom('UP', 3, 5);
      dungeonManager.tryUnlockDoor('UP');
      dungeonManager.transitionToRoom('UP', 3, 4);
    });

    it('should have shutter door that is not passable', () => {
      expect(dungeonManager.isDoorShutter('UP')).toBe(true);
      expect(dungeonManager.isDoorPassable('UP')).toBe(false);
    });

    it('should open shutter doors when room is cleared', () => {
      expect(dungeonManager.isRoomCleared()).toBe(false);
      dungeonManager.markRoomCleared();
      expect(dungeonManager.isRoomCleared()).toBe(true);
      expect(dungeonManager.isDoorPassable('UP')).toBe(true);
    });

    it('should not re-clear an already cleared room', () => {
      dungeonManager.markRoomCleared();
      // Clearing again should be a no-op
      expect(() => dungeonManager.markRoomCleared()).not.toThrow();
      expect(dungeonManager.isRoomCleared()).toBe(true);
    });
  });

  describe('room transitions', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
    });

    it('should transition to adjacent room through open door', () => {
      const newRoom = dungeonManager.transitionToRoom('UP', 3, 6);
      expect(newRoom).not.toBeNull();
      expect(newRoom?.roomCol).toBe(3);
      expect(newRoom?.roomRow).toBe(6);
    });

    it('should fail transition through wall', () => {
      const newRoom = dungeonManager.transitionToRoom('LEFT', 2, 7);
      expect(newRoom).toBeNull();
    });

    it('should fail transition to non-existent room', () => {
      const newRoom = dungeonManager.transitionToRoom('DOWN', 3, 8);
      expect(newRoom).toBeNull();
    });

    it('should fail transition when not in dungeon', () => {
      dungeonManager.exitDungeon();
      const newRoom = dungeonManager.transitionToRoom('UP', 3, 6);
      expect(newRoom).toBeNull();
    });

    it('should check room transition correctly', () => {
      // Player at top edge should trigger UP transition
      const playerHitbox = { x: 120, y: -5, width: 8, height: 8 };
      const info = dungeonManager.checkRoomTransition(playerHitbox);
      expect(info).not.toBeNull();
      expect(info?.direction).toBe('UP');
    });

    it('should not trigger transition when in middle of room', () => {
      const playerHitbox = { x: 120, y: 88, width: 8, height: 8 };
      const info = dungeonManager.checkRoomTransition(playerHitbox);
      expect(info).toBeNull();
    });

    it('should get spawn position for direction', () => {
      const pos = dungeonManager.getSpawnPositionForDirection('UP');
      // Coming from UP, should spawn at bottom
      expect(pos.y).toBeGreaterThan(100);
    });

    it('should get entrance spawn position', () => {
      const pos = dungeonManager.getEntranceSpawnPosition();
      expect(pos.x).toBe(120);
      expect(pos.y).toBe(128);
    });
  });

  describe('door positions', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
    });

    it('should return door positions for all directions', () => {
      const positions = dungeonManager.getDoorPositions();
      expect(positions).toHaveLength(4);

      const directions = positions.map(p => p.direction);
      expect(directions).toContain('UP');
      expect(directions).toContain('DOWN');
      expect(directions).toContain('LEFT');
      expect(directions).toContain('RIGHT');
    });

    it('should include door state in position info', () => {
      const positions = dungeonManager.getDoorPositions();
      const upDoor = positions.find(p => p.direction === 'UP');
      expect(upDoor?.state).toBe('OPEN');
    });
  });

  describe('stairs detection', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
    });

    it('should detect player on stairs', () => {
      // Entrance room has stairs at row 8, cols 7-8
      const playerOnStairs = { x: 112, y: 128, width: 8, height: 8 };
      expect(dungeonManager.isOnStairs(playerOnStairs)).toBe(true);
    });

    it('should not detect player away from stairs', () => {
      const playerAwayFromStairs = { x: 32, y: 32, width: 8, height: 8 };
      expect(dungeonManager.isOnStairs(playerAwayFromStairs)).toBe(false);
    });
  });

  describe('locked door detection at player', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
      // Navigate to room with locked door
      dungeonManager.transitionToRoom('UP', 3, 6);
      dungeonManager.transitionToRoom('UP', 3, 5);
    });

    it('should detect locked door when player is near', () => {
      // Player near top edge
      const playerNearLockedDoor = { x: 120, y: 5, width: 8, height: 8 };
      const dir = dungeonManager.getLockedDoorAtPlayer(playerNearLockedDoor);
      expect(dir).toBe('UP');
    });

    it('should return null when player is not near locked door', () => {
      const playerInMiddle = { x: 120, y: 88, width: 8, height: 8 };
      const dir = dungeonManager.getLockedDoorAtPlayer(playerInMiddle);
      expect(dir).toBeNull();
    });
  });

  describe('updated tiles', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
    });

    it('should return updated tiles with door states', () => {
      const tiles = dungeonManager.getUpdatedTiles();
      expect(tiles).not.toBeNull();
      expect(tiles?.length).toBe(16 * 11); // 176 tiles
    });

    it('should reflect door state changes in tiles', () => {
      // Move to room with all OPEN doors
      dungeonManager.transitionToRoom('UP', 3, 6);
      const tiles = dungeonManager.getUpdatedTiles();
      // Door tiles should be OPEN (passable)
      const topDoorTile = tiles?.[7];
      expect(topDoorTile?.collision).toBe('PASSABLE');
    });
  });

  describe('canTransitionTo', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
    });

    it('should allow transition to valid room through open door', () => {
      expect(dungeonManager.canTransitionTo('UP', 3, 6)).toBe(true);
    });

    it('should not allow transition through closed door', () => {
      expect(dungeonManager.canTransitionTo('DOWN', 3, 8)).toBe(false);
    });

    it('should not allow transition out of bounds', () => {
      expect(dungeonManager.canTransitionTo('LEFT', -1, 7)).toBe(false);
    });

    it('should not allow transition to non-existent room', () => {
      // Room at (0, 0) doesn't exist in dungeon 1
      dungeonManager.transitionToRoom('UP', 3, 6);
      expect(dungeonManager.canTransitionTo('UP', 3, 0)).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      dungeonManager.enterDungeon(1);
      dungeonManager.transitionToRoom('UP', 3, 6);
      dungeonManager.markRoomCleared();

      dungeonManager.reset();

      expect(dungeonManager.isInDungeon()).toBe(false);
      expect(dungeonManager.getCurrentDungeonId()).toBeNull();
      expect(dungeonManager.isRoomCleared()).toBe(false);
    });
  });

  describe('dungeon progress', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
    });

    it('should initialize progress when entering dungeon', () => {
      const progress = dungeonManager.getCurrentDungeonProgress();
      expect(progress).not.toBeNull();
      expect(progress?.hasMap).toBe(false);
      expect(progress?.hasCompass).toBe(false);
    });

    it('should mark entrance room as visited on entry', () => {
      expect(dungeonManager.isRoomVisited(3, 7)).toBe(true);
    });

    it('should mark new rooms as visited on transition', () => {
      dungeonManager.transitionToRoom('UP', 3, 6);
      expect(dungeonManager.isRoomVisited(3, 6)).toBe(true);
    });

    it('should collect dungeon map', () => {
      dungeonManager.collectDungeonItem('MAP');
      expect(dungeonManager.hasMap()).toBe(true);
    });

    it('should collect compass', () => {
      dungeonManager.collectDungeonItem('COMPASS');
      expect(dungeonManager.hasCompass()).toBe(true);
    });

    it('should collect triforce piece', () => {
      dungeonManager.collectDungeonItem('TRIFORCE_PIECE');
      expect(dungeonManager.hasTriforce()).toBe(true);
    });

    it('should mark boss as defeated', () => {
      expect(dungeonManager.isBossDefeated()).toBe(false);
      dungeonManager.markBossDefeated();
      expect(dungeonManager.isBossDefeated()).toBe(true);
    });

    it('should track room items collected', () => {
      expect(dungeonManager.isRoomItemCollected(3, 6, 0)).toBe(false);
      dungeonManager.markRoomItemCollected(3, 6, 0);
      expect(dungeonManager.isRoomItemCollected(3, 6, 0)).toBe(true);
    });

    it('should get visited rooms list', () => {
      dungeonManager.transitionToRoom('UP', 3, 6);
      const visitedRooms = dungeonManager.getVisitedRooms();
      expect(visitedRooms).toContainEqual({ col: 3, row: 7 }); // entrance
      expect(visitedRooms).toContainEqual({ col: 3, row: 6 }); // room 2
    });
  });

  describe('dungeon map data', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
    });

    it('should return null when not in dungeon', () => {
      dungeonManager.exitDungeon();
      expect(dungeonManager.getDungeonMapData()).toBeNull();
    });

    it('should return map data when in dungeon', () => {
      const mapData = dungeonManager.getDungeonMapData();
      expect(mapData).not.toBeNull();
      expect(mapData?.hasMap).toBe(false);
      expect(mapData?.hasCompass).toBe(false);
    });

    it('should show only visited rooms without map', () => {
      const mapData = dungeonManager.getDungeonMapData();
      // Only entrance should be in the list
      expect(mapData?.rooms.length).toBe(1);
      expect(mapData?.rooms[0]).toMatchObject({ col: 3, row: 7, visited: true });
    });

    it('should show all rooms with map', () => {
      dungeonManager.collectDungeonItem('MAP');
      const mapData = dungeonManager.getDungeonMapData();
      expect(mapData?.hasMap).toBe(true);
      // Should show all defined rooms
      expect(mapData?.rooms.length).toBeGreaterThan(1);
    });

    it('should show triforce room location with compass', () => {
      dungeonManager.collectDungeonItem('COMPASS');
      const mapData = dungeonManager.getDungeonMapData();
      expect(mapData?.hasCompass).toBe(true);
      expect(mapData?.triforceRoom).toEqual({ col: 2, row: 3 });
    });

    it('should not show triforce room without compass', () => {
      const mapData = dungeonManager.getDungeonMapData();
      expect(mapData?.triforceRoom).toBeUndefined();
    });
  });

  describe('uncollected room items', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
      // Navigate to key room
      dungeonManager.transitionToRoom('UP', 3, 6);
      dungeonManager.transitionToRoom('LEFT', 2, 6);
    });

    it('should not show items that require kill all before room is cleared', () => {
      const uncollected = dungeonManager.getUncollectedRoomItems();
      // Key requires kill all, room not cleared
      expect(uncollected.length).toBe(0);
    });

    it('should show items after room is cleared', () => {
      dungeonManager.markRoomCleared();
      const uncollected = dungeonManager.getUncollectedRoomItems();
      expect(uncollected.length).toBe(1);
      expect(uncollected[0]?.itemType).toBe('KEY');
    });

    it('should not show collected items', () => {
      dungeonManager.markRoomCleared();
      dungeonManager.markRoomItemCollected(2, 6, 0);
      const uncollected = dungeonManager.getUncollectedRoomItems();
      expect(uncollected.length).toBe(0);
    });
  });

  describe('progress export/import', () => {
    beforeEach(() => {
      dungeonManager.enterDungeon(1);
    });

    it('should export progress', () => {
      dungeonManager.collectDungeonItem('MAP');
      dungeonManager.collectDungeonItem('COMPASS');
      dungeonManager.transitionToRoom('UP', 3, 6);

      const exported = dungeonManager.exportProgress(1);
      expect(exported).not.toBeNull();
      expect(exported?.hasMap).toBe(true);
      expect(exported?.hasCompass).toBe(true);
      expect(exported?.visitedRooms).toContain('3,7');
      expect(exported?.visitedRooms).toContain('3,6');
    });

    it('should import progress', () => {
      dungeonManager.exitDungeon();
      dungeonManager.loadProgress(1, {
        hasMap: true,
        hasCompass: true,
        bossDefeated: false,
        triforceCollected: false,
        visitedRooms: ['3,7', '3,6', '3,5'],
        collectedRoomItems: ['2,6:0'],
        unlockedDoors: [],
      });

      dungeonManager.enterDungeon(1);
      expect(dungeonManager.hasMap()).toBe(true);
      expect(dungeonManager.hasCompass()).toBe(true);
      expect(dungeonManager.isRoomVisited(3, 5)).toBe(true);
      expect(dungeonManager.isRoomItemCollected(2, 6, 0)).toBe(true);
    });

    it('should export all dungeon progress', () => {
      dungeonManager.collectDungeonItem('MAP');
      const allProgress = dungeonManager.exportAllProgress();
      expect(allProgress.size).toBe(1);
      expect(allProgress.get(1)?.hasMap).toBe(true);
    });
  });
});
