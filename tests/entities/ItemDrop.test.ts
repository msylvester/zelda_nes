// tests/entities/ItemDrop.test.ts - Tests for ItemDrop entity

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ItemDrop,
  createItemDrop,
  spawnItemDrop,
  getDropFromGroup,
  getEnemyDropGroup,
  determineEnemyDrop,
  applyItemToInventory,
  canCollectItem,
  ITEM_SPRITE_KEYS,
  ITEM_SIZE,
  BOB_AMPLITUDE,
  BOB_PERIOD,
  FAIRY_SPEED,
} from '../../src/entities/ItemDrop';
import { resetEntityIdCounter } from '../../src/entities/Entity';
import { ITEM_DESPAWN_FRAMES, DROP_CHANCE } from '../../src/constants';
import type { ItemDropType } from '../../src/types';

describe('ItemDrop', () => {
  beforeEach(() => {
    resetEntityIdCounter();
  });

  describe('constructor', () => {
    it('should create an item drop with correct type', () => {
      const item = new ItemDrop(100, 80, 'HEART');
      expect(item.x).toBe(100);
      expect(item.y).toBe(80);
      expect(item.itemType).toBe('HEART');
    });

    it('should initialize with default lifetime', () => {
      const item = new ItemDrop(0, 0, 'RUPEE');
      expect(item.lifetime).toBe(ITEM_DESPAWN_FRAMES);
      expect(item.maxLifetime).toBe(ITEM_DESPAWN_FRAMES);
    });

    it('should accept custom lifetime', () => {
      const item = new ItemDrop(0, 0, 'BOMB', 300);
      expect(item.lifetime).toBe(300);
      expect(item.maxLifetime).toBe(300);
    });

    it('should start not collected', () => {
      const item = new ItemDrop(0, 0, 'KEY');
      expect(item.collected).toBe(false);
    });

    it('should start active', () => {
      const item = new ItemDrop(0, 0, 'HEART');
      expect(item.active).toBe(true);
    });

    it('should have entity type ITEM', () => {
      const item = new ItemDrop(0, 0, 'RUPEE');
      expect(item.entityType).toBe('ITEM');
    });

    it('should have correct size', () => {
      const item = new ItemDrop(0, 0, 'HEART');
      expect(item.width).toBe(ITEM_SIZE);
      expect(item.height).toBe(ITEM_SIZE);
    });

    it('should initialize bob offset to 0', () => {
      const item = new ItemDrop(0, 0, 'RUPEE');
      expect(item.bobOffset).toBe(0);
    });

    it('should have sprite priority 2', () => {
      const item = new ItemDrop(0, 0, 'HEART');
      expect(item.spritePriority).toBe(2);
    });
  });

  describe('update', () => {
    it('should decrease lifetime each frame', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      item.update(1);
      expect(item.lifetime).toBe(99);
    });

    it('should handle deltaFrame > 1', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      item.update(5);
      expect(item.lifetime).toBe(95);
    });

    it('should deactivate when lifetime reaches 0', () => {
      const item = new ItemDrop(0, 0, 'HEART', 2);
      item.update(1);
      expect(item.active).toBe(true);
      item.update(1);
      expect(item.active).toBe(false);
    });

    it('should update bob offset based on timer', () => {
      const item = new ItemDrop(0, 0, 'RUPEE');
      item.update(BOB_PERIOD / 4); // Quarter cycle
      // At quarter cycle, sin should be at maximum
      expect(item.bobOffset).toBeCloseTo(BOB_AMPLITUDE, 5);
    });

    it('should not update when collected', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      item.collect();
      const lifetimeBefore = item.lifetime;
      item.update(10);
      // Lifetime shouldn't change when collected
      expect(item.lifetime).toBe(lifetimeBefore);
    });

    it('should not update when inactive', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      item.active = false;
      const lifetimeBefore = item.lifetime;
      item.update(10);
      expect(item.lifetime).toBe(lifetimeBefore);
    });
  });

  describe('fairy movement', () => {
    it('should move fairy when updating', () => {
      const item = new ItemDrop(100, 100, 'FAIRY');
      const startX = item.x;
      const startY = item.y;

      // Update several times
      for (let i = 0; i < 10; i++) {
        item.update(1);
      }

      // Position should have changed
      const moved = item.x !== startX || item.y !== startY;
      expect(moved).toBe(true);
    });

    it('should keep fairy within screen bounds', () => {
      const item = new ItemDrop(0, 0, 'FAIRY');

      // Update many times
      for (let i = 0; i < 200; i++) {
        item.update(1);
      }

      // Should stay within bounds
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x).toBeLessThanOrEqual(256 - ITEM_SIZE);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeLessThanOrEqual(176 - ITEM_SIZE);
    });

    it('should not move non-fairy items', () => {
      const item = new ItemDrop(100, 100, 'HEART');
      item.update(10);
      // X and Y should not change (only bobOffset)
      expect(item.x).toBe(100);
      expect(item.y).toBe(100);
    });
  });

  describe('collect', () => {
    it('should mark item as collected', () => {
      const item = new ItemDrop(0, 0, 'HEART');
      item.collect();
      expect(item.collected).toBe(true);
    });

    it('should mark item as inactive when collected', () => {
      const item = new ItemDrop(0, 0, 'HEART');
      item.collect();
      expect(item.active).toBe(false);
    });

    it('should only collect once', () => {
      const item = new ItemDrop(0, 0, 'HEART');
      item.collect();
      // Second collect should be no-op
      item.collect();
      expect(item.collected).toBe(true);
      expect(item.active).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false when lifetime > 0', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      expect(item.isExpired()).toBe(false);
    });

    it('should return true when lifetime <= 0', () => {
      const item = new ItemDrop(0, 0, 'HEART', 1);
      item.update(1);
      expect(item.isExpired()).toBe(true);
    });
  });

  describe('getLifetimeFraction', () => {
    it('should return 1 at start', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      expect(item.getLifetimeFraction()).toBe(1);
    });

    it('should return 0.5 at halfway', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      item.update(50);
      expect(item.getLifetimeFraction()).toBe(0.5);
    });

    it('should return 0 when expired', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      item.update(100);
      expect(item.getLifetimeFraction()).toBe(0);
    });
  });

  describe('shouldFlash', () => {
    it('should not flash when lifetime > 120', () => {
      const item = new ItemDrop(0, 0, 'HEART', 200);
      expect(item.shouldFlash()).toBe(false);
    });

    it('should start flashing when lifetime < 120', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      // Some frames will flash, some won't
      let flashedAtLeastOnce = false;
      let wasVisibleOnce = false;
      for (let i = 0; i < 100; i++) {
        if (item.shouldFlash()) flashedAtLeastOnce = true;
        else wasVisibleOnce = true;
        item.update(1);
      }
      expect(flashedAtLeastOnce).toBe(true);
      expect(wasVisibleOnce).toBe(true);
    });
  });

  describe('getSpriteCommands', () => {
    it('should return sprite command when active', () => {
      const item = new ItemDrop(50, 60, 'HEART', 200);
      const commands = item.getSpriteCommands();
      expect(commands.length).toBe(1);
      expect(commands[0].spriteKey).toBe(ITEM_SPRITE_KEYS.HEART);
      expect(commands[0].x).toBe(50);
      expect(commands[0].visible).toBe(true);
    });

    it('should include bob offset in y position', () => {
      const item = new ItemDrop(50, 60, 'RUPEE');
      item.update(BOB_PERIOD / 4); // At max bob
      const commands = item.getSpriteCommands();
      expect(commands[0].y).toBeCloseTo(60 + BOB_AMPLITUDE, 5);
    });

    it('should return empty array when collected', () => {
      const item = new ItemDrop(0, 0, 'HEART');
      item.collect();
      expect(item.getSpriteCommands()).toEqual([]);
    });

    it('should return empty array when inactive', () => {
      const item = new ItemDrop(0, 0, 'HEART');
      item.active = false;
      expect(item.getSpriteCommands()).toEqual([]);
    });

    it('should return empty array during flash-off frames', () => {
      const item = new ItemDrop(0, 0, 'HEART', 100);
      // Find a frame where it should flash
      let foundFlashFrame = false;
      for (let i = 0; i < 120; i++) {
        if (item.shouldFlash()) {
          foundFlashFrame = true;
          break;
        }
        item.update(1);
      }
      if (foundFlashFrame) {
        expect(item.getSpriteCommands()).toEqual([]);
      }
    });

    it('should use correct sprite key for each item type', () => {
      const types: ItemDropType[] = ['HEART', 'RUPEE', 'RUPEE_5', 'BOMB', 'KEY', 'FAIRY'];
      for (const type of types) {
        const item = new ItemDrop(0, 0, type, 200);
        const commands = item.getSpriteCommands();
        expect(commands[0].spriteKey).toBe(ITEM_SPRITE_KEYS[type]);
      }
    });
  });

  describe('getValue', () => {
    it('should return 1 for regular rupee', () => {
      const item = new ItemDrop(0, 0, 'RUPEE');
      expect(item.getValue()).toBe(1);
    });

    it('should return 5 for blue rupee', () => {
      const item = new ItemDrop(0, 0, 'RUPEE_5');
      expect(item.getValue()).toBe(5);
    });

    it('should return 2 for heart (2 half-hearts)', () => {
      const item = new ItemDrop(0, 0, 'HEART');
      expect(item.getValue()).toBe(2);
    });

    it('should return 6 for fairy (full heal)', () => {
      const item = new ItemDrop(0, 0, 'FAIRY');
      expect(item.getValue()).toBe(6);
    });

    it('should return 1 for bomb', () => {
      const item = new ItemDrop(0, 0, 'BOMB');
      expect(item.getValue()).toBe(1);
    });

    it('should return 1 for key', () => {
      const item = new ItemDrop(0, 0, 'KEY');
      expect(item.getValue()).toBe(1);
    });
  });
});

describe('createItemDrop', () => {
  beforeEach(() => {
    resetEntityIdCounter();
  });

  it('should create an item drop from config', () => {
    const item = createItemDrop(100, 50, { itemType: 'HEART' });
    expect(item.x).toBe(100);
    expect(item.y).toBe(50);
    expect(item.itemType).toBe('HEART');
  });

  it('should work with all item types', () => {
    const types: ItemDropType[] = ['HEART', 'RUPEE', 'BOMB', 'KEY', 'FAIRY'];
    for (const type of types) {
      const item = createItemDrop(0, 0, { itemType: type });
      expect(item.itemType).toBe(type);
    }
  });
});

describe('spawnItemDrop', () => {
  beforeEach(() => {
    resetEntityIdCounter();
  });

  it('should spawn an item drop at position', () => {
    const item = spawnItemDrop(120, 80, 'RUPEE');
    expect(item.x).toBe(120);
    expect(item.y).toBe(80);
    expect(item.itemType).toBe('RUPEE');
  });

  it('should use default lifetime', () => {
    const item = spawnItemDrop(0, 0, 'HEART');
    expect(item.lifetime).toBe(ITEM_DESPAWN_FRAMES);
  });

  it('should accept custom lifetime', () => {
    const item = spawnItemDrop(0, 0, 'BOMB', 200);
    expect(item.lifetime).toBe(200);
  });
});

describe('getDropFromGroup', () => {
  it('should return items from group A', () => {
    // Mock Math.random to always succeed
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // Less than DROP_CHANCE

    const drop0 = getDropFromGroup('A', 0);
    const drop1 = getDropFromGroup('A', 1);
    const drop2 = getDropFromGroup('A', 2);
    const drop3 = getDropFromGroup('A', 3);

    // Group A: ['RUPEE', 'HEART', 'RUPEE', 'FAIRY']
    expect(drop0).toBe('RUPEE');
    expect(drop1).toBe('HEART');
    expect(drop2).toBe('RUPEE');
    expect(drop3).toBe('FAIRY');

    vi.restoreAllMocks();
  });

  it('should cycle kill counter with modulo', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    // Kill counter 4 should be same as 0
    expect(getDropFromGroup('A', 4)).toBe(getDropFromGroup('A', 0));
    expect(getDropFromGroup('A', 5)).toBe(getDropFromGroup('A', 1));

    vi.restoreAllMocks();
  });

  it('should return null when drop chance fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // Greater than DROP_CHANCE

    const drop = getDropFromGroup('A', 0);
    expect(drop).toBeNull();

    vi.restoreAllMocks();
  });

  it('should work with all drop groups', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    // Group B: ['BOMB', 'RUPEE', 'CLOCK', 'RUPEE']
    expect(getDropFromGroup('B', 0)).toBe('BOMB');

    // Group C: ['RUPEE', 'HEART', 'RUPEE', 'RUPEE']
    expect(getDropFromGroup('C', 1)).toBe('HEART');

    // Group D: ['HEART', 'FAIRY', 'RUPEE', 'HEART']
    expect(getDropFromGroup('D', 1)).toBe('FAIRY');

    vi.restoreAllMocks();
  });
});

describe('getEnemyDropGroup', () => {
  it('should return A for Octoroks', () => {
    expect(getEnemyDropGroup('OCTOROK_RED')).toBe('A');
    expect(getEnemyDropGroup('OCTOROK_BLUE')).toBe('A');
  });

  it('should return A for Tektites', () => {
    expect(getEnemyDropGroup('TEKTITE_RED')).toBe('A');
    expect(getEnemyDropGroup('TEKTITE_BLUE')).toBe('A');
  });

  it('should return B for Moblins', () => {
    expect(getEnemyDropGroup('MOBLIN_RED')).toBe('B');
    expect(getEnemyDropGroup('MOBLIN_BLUE')).toBe('B');
  });

  it('should return C for Keese', () => {
    expect(getEnemyDropGroup('KEESE')).toBe('C');
  });

  it('should return A for unknown enemies', () => {
    expect(getEnemyDropGroup('UNKNOWN_ENEMY')).toBe('A');
  });
});

describe('determineEnemyDrop', () => {
  it('should determine drop based on enemy type and kill counter', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    // Octorok is group A, kill counter 0 = RUPEE
    expect(determineEnemyDrop('OCTOROK_RED', 0)).toBe('RUPEE');

    // Moblin is group B, kill counter 0 = BOMB
    expect(determineEnemyDrop('MOBLIN_RED', 0)).toBe('BOMB');

    vi.restoreAllMocks();
  });

  it('should return null when drop fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    expect(determineEnemyDrop('OCTOROK_RED', 0)).toBeNull();

    vi.restoreAllMocks();
  });
});

describe('applyItemToInventory', () => {
  function createMockInventory(currentHP: number = 4, maxHP: number = 6) {
    return {
      getCurrentHP: vi.fn().mockReturnValue(currentHP),
      getMaxHP: vi.fn().mockReturnValue(maxHP),
      heal: vi.fn(),
      addRupees: vi.fn(),
      addKey: vi.fn(),
      addBomb: vi.fn(),
      addHeartContainer: vi.fn(),
    };
  }

  it('should heal for HEART item', () => {
    const inventory = createMockInventory(4, 6);
    const result = applyItemToInventory('HEART', inventory);
    expect(result).toBe(true);
    expect(inventory.heal).toHaveBeenCalledWith(2);
  });

  it('should not apply HEART when at full HP', () => {
    const inventory = createMockInventory(6, 6);
    const result = applyItemToInventory('HEART', inventory);
    expect(result).toBe(false);
    expect(inventory.heal).not.toHaveBeenCalled();
  });

  it('should full heal for FAIRY', () => {
    const inventory = createMockInventory(2, 6);
    const result = applyItemToInventory('FAIRY', inventory);
    expect(result).toBe(true);
    expect(inventory.heal).toHaveBeenCalledWith(6);
  });

  it('should add 1 rupee for RUPEE', () => {
    const inventory = createMockInventory();
    const result = applyItemToInventory('RUPEE', inventory);
    expect(result).toBe(true);
    expect(inventory.addRupees).toHaveBeenCalledWith(1);
  });

  it('should add 5 rupees for RUPEE_5', () => {
    const inventory = createMockInventory();
    const result = applyItemToInventory('RUPEE_5', inventory);
    expect(result).toBe(true);
    expect(inventory.addRupees).toHaveBeenCalledWith(5);
  });

  it('should add bomb for BOMB', () => {
    const inventory = createMockInventory();
    const result = applyItemToInventory('BOMB', inventory);
    expect(result).toBe(true);
    expect(inventory.addBomb).toHaveBeenCalled();
  });

  it('should add key for KEY', () => {
    const inventory = createMockInventory();
    const result = applyItemToInventory('KEY', inventory);
    expect(result).toBe(true);
    expect(inventory.addKey).toHaveBeenCalled();
  });

  it('should add heart container for HEART_CONTAINER', () => {
    const inventory = createMockInventory();
    const result = applyItemToInventory('HEART_CONTAINER', inventory);
    expect(result).toBe(true);
    expect(inventory.addHeartContainer).toHaveBeenCalled();
  });

  it('should return true for CLOCK (handled by game state)', () => {
    const inventory = createMockInventory();
    const result = applyItemToInventory('CLOCK', inventory);
    expect(result).toBe(true);
  });

  it('should return true for TRIFORCE_PIECE (handled by progression)', () => {
    const inventory = createMockInventory();
    const result = applyItemToInventory('TRIFORCE_PIECE', inventory);
    expect(result).toBe(true);
  });
});

describe('canCollectItem', () => {
  it('should allow hearts when not at full health', () => {
    expect(canCollectItem('HEART', 4, 6)).toBe(true);
  });

  it('should not allow hearts when at full health', () => {
    expect(canCollectItem('HEART', 6, 6)).toBe(false);
  });

  it('should always allow rupees', () => {
    expect(canCollectItem('RUPEE', 6, 6)).toBe(true);
    expect(canCollectItem('RUPEE_5', 6, 6)).toBe(true);
  });

  it('should always allow bombs', () => {
    expect(canCollectItem('BOMB', 6, 6)).toBe(true);
  });

  it('should always allow keys', () => {
    expect(canCollectItem('KEY', 6, 6)).toBe(true);
  });

  it('should always allow fairies', () => {
    expect(canCollectItem('FAIRY', 6, 6)).toBe(true);
  });

  it('should always allow heart containers', () => {
    expect(canCollectItem('HEART_CONTAINER', 6, 6)).toBe(true);
  });
});

describe('ITEM_SPRITE_KEYS', () => {
  it('should have sprite keys for all item types', () => {
    const types: ItemDropType[] = [
      'HEART',
      'RUPEE',
      'RUPEE_5',
      'BOMB',
      'KEY',
      'FAIRY',
      'CLOCK',
      'HEART_CONTAINER',
      'TRIFORCE_PIECE',
    ];
    for (const type of types) {
      expect(ITEM_SPRITE_KEYS[type]).toBeDefined();
      expect(typeof ITEM_SPRITE_KEYS[type]).toBe('string');
    }
  });
});
