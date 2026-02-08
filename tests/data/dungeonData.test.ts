// tests/data/dungeonData.test.ts - Tests for dungeon room data

import { describe, it, expect } from 'vitest';
import {
  DUNGEON_TILE_IDS,
  DUNGEON_TILE_COLLISION_MAP,
  makeDungeonTile,
  DUNGEON_1,
  getDungeon,
  getDungeonRoom,
  getDungeonEntrance,
  getDungeonBossRoom,
  getDungeonTriforceRoom,
  getDefinedDungeonRooms,
  getDungeonRoomCount,
  getAdjacentRoom,
  isDoorOpen,
  isDoorLocked,
  isDoorShutter,
  isDoorBombable,
  isRoomDefined,
  getAllDungeonIds,
  validateDungeonData,
} from '../../src/data/dungeonData';
import { TILES_PER_ROW, TILES_PER_COL, DUNGEON_GRID_WIDTH, DUNGEON_GRID_HEIGHT } from '../../src/constants';

describe('dungeonData', () => {
  describe('DUNGEON_TILE_IDS', () => {
    it('should define dungeon tile IDs', () => {
      expect(DUNGEON_TILE_IDS.FLOOR).toBe(9);
      expect(DUNGEON_TILE_IDS.WALL).toBe(10);
      expect(DUNGEON_TILE_IDS.BLOCK).toBe(11);
      expect(DUNGEON_TILE_IDS.DOOR_OPEN).toBe(12);
      expect(DUNGEON_TILE_IDS.DOOR_LOCKED).toBe(13);
      expect(DUNGEON_TILE_IDS.DOOR_SHUTTER).toBe(14);
      expect(DUNGEON_TILE_IDS.WATER).toBe(2);
      expect(DUNGEON_TILE_IDS.STAIRS).toBe(6);
      expect(DUNGEON_TILE_IDS.PIT).toBe(7);
    });
  });

  describe('DUNGEON_TILE_COLLISION_MAP', () => {
    it('should map dungeon tiles to collision types', () => {
      expect(DUNGEON_TILE_COLLISION_MAP[DUNGEON_TILE_IDS.FLOOR]).toBe('PASSABLE');
      expect(DUNGEON_TILE_COLLISION_MAP[DUNGEON_TILE_IDS.WALL]).toBe('SOLID');
      expect(DUNGEON_TILE_COLLISION_MAP[DUNGEON_TILE_IDS.BLOCK]).toBe('ROCK');
      expect(DUNGEON_TILE_COLLISION_MAP[DUNGEON_TILE_IDS.DOOR_OPEN]).toBe('PASSABLE');
      expect(DUNGEON_TILE_COLLISION_MAP[DUNGEON_TILE_IDS.DOOR_LOCKED]).toBe('SOLID');
      expect(DUNGEON_TILE_COLLISION_MAP[DUNGEON_TILE_IDS.DOOR_SHUTTER]).toBe('SOLID');
      expect(DUNGEON_TILE_COLLISION_MAP[DUNGEON_TILE_IDS.WATER]).toBe('WATER');
      expect(DUNGEON_TILE_COLLISION_MAP[DUNGEON_TILE_IDS.STAIRS]).toBe('STAIRS');
      expect(DUNGEON_TILE_COLLISION_MAP[DUNGEON_TILE_IDS.PIT]).toBe('PIT');
    });
  });

  describe('makeDungeonTile', () => {
    it('should create dungeon tile data with correct collision', () => {
      const floorTile = makeDungeonTile(DUNGEON_TILE_IDS.FLOOR);
      expect(floorTile.tileId).toBe(DUNGEON_TILE_IDS.FLOOR);
      expect(floorTile.collision).toBe('PASSABLE');

      const wallTile = makeDungeonTile(DUNGEON_TILE_IDS.WALL);
      expect(wallTile.tileId).toBe(DUNGEON_TILE_IDS.WALL);
      expect(wallTile.collision).toBe('SOLID');
    });

    it('should default to SOLID for unknown tile IDs', () => {
      const unknownTile = makeDungeonTile(999);
      expect(unknownTile.tileId).toBe(999);
      expect(unknownTile.collision).toBe('SOLID');
    });
  });

  describe('DUNGEON_1', () => {
    it('should have correct dungeon metadata', () => {
      expect(DUNGEON_1.dungeonId).toBe(1);
      expect(DUNGEON_1.name).toBe('Eagle');
      expect(DUNGEON_1.gridWidth).toBe(DUNGEON_GRID_WIDTH);
      expect(DUNGEON_1.gridHeight).toBe(DUNGEON_GRID_HEIGHT);
      expect(DUNGEON_1.bossType).toBe('AQUAMENTUS');
      expect(DUNGEON_1.dungeonPalette).toBe(0);
    });

    it('should have entrance at (3,7)', () => {
      expect(DUNGEON_1.entranceCol).toBe(3);
      expect(DUNGEON_1.entranceRow).toBe(7);
    });

    it('should have boss room at (3,3)', () => {
      expect(DUNGEON_1.bossCol).toBe(3);
      expect(DUNGEON_1.bossRow).toBe(3);
    });

    it('should have triforce room at (2,3)', () => {
      expect(DUNGEON_1.triforceCol).toBe(2);
      expect(DUNGEON_1.triforceRow).toBe(3);
    });

    it('should have overworld entrance at (9,7)', () => {
      expect(DUNGEON_1.overworldEntranceCol).toBe(9);
      expect(DUNGEON_1.overworldEntranceRow).toBe(7);
    });

    it('should have an 8x8 room grid', () => {
      expect(DUNGEON_1.rooms.length).toBe(DUNGEON_GRID_HEIGHT);
      for (const row of DUNGEON_1.rooms) {
        expect(row.length).toBe(DUNGEON_GRID_WIDTH);
      }
    });

    it('should have at least 6 defined rooms', () => {
      const roomCount = getDungeonRoomCount(1);
      expect(roomCount).toBeGreaterThanOrEqual(6);
    });
  });

  describe('getDungeon', () => {
    it('should return dungeon 1', () => {
      const dungeon = getDungeon(1);
      expect(dungeon).not.toBeNull();
      expect(dungeon?.dungeonId).toBe(1);
      expect(dungeon?.name).toBe('Eagle');
    });

    it('should return null for non-existent dungeon', () => {
      expect(getDungeon(99)).toBeNull();
      expect(getDungeon(0)).toBeNull();
      expect(getDungeon(-1)).toBeNull();
    });
  });

  describe('getDungeonRoom', () => {
    it('should return entrance room at (3,7)', () => {
      const room = getDungeonRoom(1, 3, 7);
      expect(room).not.toBeNull();
      expect(room?.roomCol).toBe(3);
      expect(room?.roomRow).toBe(7);
      expect(room?.roomType).toBe('ENTRANCE');
    });

    it('should return boss room at (3,3)', () => {
      const room = getDungeonRoom(1, 3, 3);
      expect(room).not.toBeNull();
      expect(room?.roomType).toBe('BOSS');
    });

    it('should return triforce room at (2,3)', () => {
      const room = getDungeonRoom(1, 2, 3);
      expect(room).not.toBeNull();
      expect(room?.roomType).toBe('TRIFORCE');
    });

    it('should return null for undefined room positions', () => {
      expect(getDungeonRoom(1, 0, 0)).toBeNull();
      expect(getDungeonRoom(1, 7, 7)).toBeNull();
    });

    it('should return null for out-of-bounds coordinates', () => {
      expect(getDungeonRoom(1, -1, 0)).toBeNull();
      expect(getDungeonRoom(1, 0, -1)).toBeNull();
      expect(getDungeonRoom(1, 8, 0)).toBeNull();
      expect(getDungeonRoom(1, 0, 8)).toBeNull();
    });

    it('should return null for non-existent dungeon', () => {
      expect(getDungeonRoom(99, 0, 0)).toBeNull();
    });
  });

  describe('getDungeonEntrance', () => {
    it('should return entrance room for dungeon 1', () => {
      const entrance = getDungeonEntrance(1);
      expect(entrance).not.toBeNull();
      expect(entrance?.roomType).toBe('ENTRANCE');
      expect(entrance?.roomCol).toBe(3);
      expect(entrance?.roomRow).toBe(7);
    });

    it('should return null for non-existent dungeon', () => {
      expect(getDungeonEntrance(99)).toBeNull();
    });
  });

  describe('getDungeonBossRoom', () => {
    it('should return boss room for dungeon 1', () => {
      const bossRoom = getDungeonBossRoom(1);
      expect(bossRoom).not.toBeNull();
      expect(bossRoom?.roomType).toBe('BOSS');
    });

    it('should have Aquamentus enemy spawn', () => {
      const bossRoom = getDungeonBossRoom(1);
      expect(bossRoom?.enemySpawns.length).toBeGreaterThan(0);
      const bossSpawn = bossRoom?.enemySpawns[0];
      expect(bossSpawn?.archetypeId).toBe('AQUAMENTUS');
    });

    it('should return null for non-existent dungeon', () => {
      expect(getDungeonBossRoom(99)).toBeNull();
    });
  });

  describe('getDungeonTriforceRoom', () => {
    it('should return triforce room for dungeon 1', () => {
      const triforceRoom = getDungeonTriforceRoom(1);
      expect(triforceRoom).not.toBeNull();
      expect(triforceRoom?.roomType).toBe('TRIFORCE');
    });

    it('should have triforce piece item', () => {
      const triforceRoom = getDungeonTriforceRoom(1);
      expect(triforceRoom?.items.length).toBeGreaterThan(0);
      const triforceItem = triforceRoom?.items[0];
      expect(triforceItem?.itemType).toBe('TRIFORCE_PIECE');
    });

    it('should have no enemies', () => {
      const triforceRoom = getDungeonTriforceRoom(1);
      expect(triforceRoom?.enemySpawns.length).toBe(0);
    });

    it('should return null for non-existent dungeon', () => {
      expect(getDungeonTriforceRoom(99)).toBeNull();
    });
  });

  describe('getDefinedDungeonRooms', () => {
    it('should return all defined rooms for dungeon 1', () => {
      const rooms = getDefinedDungeonRooms(1);
      expect(rooms.length).toBeGreaterThanOrEqual(6);
    });

    it('should include entrance, boss, and triforce rooms', () => {
      const rooms = getDefinedDungeonRooms(1);
      const roomTypes = rooms.map(r => r.roomType);
      expect(roomTypes).toContain('ENTRANCE');
      expect(roomTypes).toContain('BOSS');
      expect(roomTypes).toContain('TRIFORCE');
    });

    it('should return empty array for non-existent dungeon', () => {
      expect(getDefinedDungeonRooms(99)).toEqual([]);
    });
  });

  describe('getDungeonRoomCount', () => {
    it('should return correct count for dungeon 1', () => {
      const count = getDungeonRoomCount(1);
      expect(count).toBe(9); // entrance + 7 combat/item rooms + triforce
    });

    it('should return 0 for non-existent dungeon', () => {
      expect(getDungeonRoomCount(99)).toBe(0);
    });
  });

  describe('getAdjacentRoom', () => {
    it('should get room above entrance', () => {
      const above = getAdjacentRoom(1, 3, 7, 'UP');
      expect(above).not.toBeNull();
      expect(above?.roomRow).toBe(6);
      expect(above?.roomCol).toBe(3);
    });

    it('should get room below room 2', () => {
      const below = getAdjacentRoom(1, 3, 6, 'DOWN');
      expect(below).not.toBeNull();
      expect(below?.roomType).toBe('ENTRANCE');
    });

    it('should get room to left of room 2', () => {
      const left = getAdjacentRoom(1, 3, 6, 'LEFT');
      expect(left).not.toBeNull();
      expect(left?.roomType).toBe('ITEM'); // Key room
    });

    it('should get room to right of room 2', () => {
      const right = getAdjacentRoom(1, 3, 6, 'RIGHT');
      expect(right).not.toBeNull();
      expect(right?.roomCol).toBe(4);
    });

    it('should return null for non-existent adjacent room', () => {
      expect(getAdjacentRoom(1, 3, 7, 'DOWN')).toBeNull(); // No room below entrance
      expect(getAdjacentRoom(1, 2, 6, 'LEFT')).toBeNull(); // No room left of key room
    });
  });

  describe('door state helpers', () => {
    describe('isDoorOpen', () => {
      it('should return true only for OPEN doors', () => {
        expect(isDoorOpen('OPEN')).toBe(true);
        expect(isDoorOpen('LOCKED')).toBe(false);
        expect(isDoorOpen('SHUTTER')).toBe(false);
        expect(isDoorOpen('BOMBABLE')).toBe(false);
        expect(isDoorOpen('WALL')).toBe(false);
      });
    });

    describe('isDoorLocked', () => {
      it('should return true only for LOCKED doors', () => {
        expect(isDoorLocked('LOCKED')).toBe(true);
        expect(isDoorLocked('OPEN')).toBe(false);
        expect(isDoorLocked('SHUTTER')).toBe(false);
        expect(isDoorLocked('BOMBABLE')).toBe(false);
        expect(isDoorLocked('WALL')).toBe(false);
      });
    });

    describe('isDoorShutter', () => {
      it('should return true only for SHUTTER doors', () => {
        expect(isDoorShutter('SHUTTER')).toBe(true);
        expect(isDoorShutter('OPEN')).toBe(false);
        expect(isDoorShutter('LOCKED')).toBe(false);
        expect(isDoorShutter('BOMBABLE')).toBe(false);
        expect(isDoorShutter('WALL')).toBe(false);
      });
    });

    describe('isDoorBombable', () => {
      it('should return true only for BOMBABLE doors', () => {
        expect(isDoorBombable('BOMBABLE')).toBe(true);
        expect(isDoorBombable('OPEN')).toBe(false);
        expect(isDoorBombable('LOCKED')).toBe(false);
        expect(isDoorBombable('SHUTTER')).toBe(false);
        expect(isDoorBombable('WALL')).toBe(false);
      });
    });
  });

  describe('isRoomDefined', () => {
    it('should return true for defined rooms', () => {
      expect(isRoomDefined(1, 3, 7)).toBe(true); // Entrance
      expect(isRoomDefined(1, 3, 3)).toBe(true); // Boss
      expect(isRoomDefined(1, 2, 3)).toBe(true); // Triforce
    });

    it('should return false for undefined rooms', () => {
      expect(isRoomDefined(1, 0, 0)).toBe(false);
      expect(isRoomDefined(1, 7, 7)).toBe(false);
    });

    it('should return false for non-existent dungeon', () => {
      expect(isRoomDefined(99, 0, 0)).toBe(false);
    });
  });

  describe('getAllDungeonIds', () => {
    it('should return array with dungeon 1', () => {
      const ids = getAllDungeonIds();
      expect(ids).toContain(1);
    });

    it('should return correct number of dungeons', () => {
      const ids = getAllDungeonIds();
      expect(ids.length).toBe(1); // Currently only dungeon 1
    });
  });

  describe('validateDungeonData', () => {
    it('should validate dungeon 1 successfully', () => {
      expect(validateDungeonData(1)).toBe(true);
    });

    it('should return false for non-existent dungeon', () => {
      expect(validateDungeonData(99)).toBe(false);
    });
  });

  describe('room tile data', () => {
    it('should have correct tile count for all rooms', () => {
      const expectedTiles = TILES_PER_ROW * TILES_PER_COL;
      const rooms = getDefinedDungeonRooms(1);

      for (const room of rooms) {
        expect(room.tiles.length).toBe(expectedTiles);
      }
    });

    it('should have entrance room with stairs', () => {
      const entrance = getDungeonEntrance(1);
      const stairsTiles = entrance?.tiles.filter(t => t.tileId === DUNGEON_TILE_IDS.STAIRS);
      expect(stairsTiles?.length).toBeGreaterThan(0);
    });

    it('should have entrance room with open door up', () => {
      const entrance = getDungeonEntrance(1);
      expect(entrance?.doors.up).toBe('OPEN');
      expect(entrance?.doors.down).toBe('WALL');
      expect(entrance?.doors.left).toBe('WALL');
      expect(entrance?.doors.right).toBe('WALL');
    });
  });

  describe('room items', () => {
    it('should have key in key room', () => {
      const keyRoom = getDungeonRoom(1, 2, 6);
      expect(keyRoom).not.toBeNull();
      expect(keyRoom?.items.some(i => i.itemType === 'KEY')).toBe(true);
    });

    it('should have compass in compass room', () => {
      const compassRoom = getDungeonRoom(1, 5, 6);
      expect(compassRoom).not.toBeNull();
      expect(compassRoom?.items.some(i => i.itemType === 'COMPASS')).toBe(true);
    });

    it('should have map in map room', () => {
      const mapRoom = getDungeonRoom(1, 3, 4);
      expect(mapRoom).not.toBeNull();
      expect(mapRoom?.items.some(i => i.itemType === 'MAP')).toBe(true);
    });

    it('should have items with requiresKillAll where appropriate', () => {
      const keyRoom = getDungeonRoom(1, 2, 6);
      const keyItem = keyRoom?.items.find(i => i.itemType === 'KEY');
      expect(keyItem?.requiresKillAll).toBe(true);
    });
  });

  describe('room doors', () => {
    it('should have locked door leading to boss area', () => {
      const room6 = getDungeonRoom(1, 3, 5);
      expect(room6).not.toBeNull();
      expect(room6?.doors.up).toBe('LOCKED');
    });

    it('should have shutter doors in map room', () => {
      const mapRoom = getDungeonRoom(1, 3, 4);
      expect(mapRoom).not.toBeNull();
      expect(mapRoom?.doors.up).toBe('SHUTTER');
    });

    it('should have shutter door in boss room', () => {
      const bossRoom = getDungeonBossRoom(1);
      expect(bossRoom?.doors.left).toBe('SHUTTER');
    });
  });

  describe('room enemy spawns', () => {
    it('should have no enemies in entrance room', () => {
      const entrance = getDungeonEntrance(1);
      expect(entrance?.enemySpawns.length).toBe(0);
    });

    it('should have enemies in combat rooms', () => {
      const room2 = getDungeonRoom(1, 3, 6);
      expect(room2?.enemySpawns.length).toBeGreaterThan(0);
    });

    it('should have Keese in key room', () => {
      const keyRoom = getDungeonRoom(1, 2, 6);
      const keeseSpawns = keyRoom?.enemySpawns.filter(e => e.archetypeId === 'KEESE');
      expect(keeseSpawns?.length).toBeGreaterThan(0);
    });

    it('should have spawn delays for staggered spawning', () => {
      const room2 = getDungeonRoom(1, 3, 6);
      const delays = room2?.enemySpawns.map(e => e.spawnDelay) ?? [];
      // Should have varied delays
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('dungeon palette', () => {
    it('should use different palette from overworld (palette 0)', () => {
      // All dungeon 1 rooms use palette 0 (blue/gray)
      const rooms = getDefinedDungeonRooms(1);
      for (const room of rooms) {
        expect(room.paletteId).toBe(0);
      }
    });
  });

  describe('dark rooms', () => {
    it('should have isDark flag on rooms', () => {
      const rooms = getDefinedDungeonRooms(1);
      for (const room of rooms) {
        expect(typeof room.isDark).toBe('boolean');
      }
    });

    it('should have no dark rooms in dungeon 1', () => {
      // Dungeon 1 has no dark rooms in original game
      const rooms = getDefinedDungeonRooms(1);
      const darkRooms = rooms.filter(r => r.isDark);
      expect(darkRooms.length).toBe(0);
    });
  });

  describe('room connections', () => {
    it('should have bidirectional connections', () => {
      // If room A has open door to room B, room B should have open door to room A
      const entrance = getDungeonEntrance(1);
      const roomAbove = getAdjacentRoom(1, 3, 7, 'UP');

      // Entrance has open door up
      expect(entrance?.doors.up).toBe('OPEN');
      // Room above should have open door down
      expect(roomAbove?.doors.down).toBe('OPEN');
    });

    it('should not have doors leading to null rooms', () => {
      const rooms = getDefinedDungeonRooms(1);

      for (const room of rooms) {
        // Check each door direction
        if (room.doors.up !== 'WALL') {
          const upRoom = getAdjacentRoom(1, room.roomCol, room.roomRow, 'UP');
          expect(upRoom).not.toBeNull();
        }
        if (room.doors.down !== 'WALL') {
          const downRoom = getAdjacentRoom(1, room.roomCol, room.roomRow, 'DOWN');
          expect(downRoom).not.toBeNull();
        }
        if (room.doors.left !== 'WALL') {
          const leftRoom = getAdjacentRoom(1, room.roomCol, room.roomRow, 'LEFT');
          expect(leftRoom).not.toBeNull();
        }
        if (room.doors.right !== 'WALL') {
          const rightRoom = getAdjacentRoom(1, room.roomCol, room.roomRow, 'RIGHT');
          expect(rightRoom).not.toBeNull();
        }
      }
    });
  });
});
