// InventoryManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  InventoryManager,
  DEFAULT_INVENTORY,
  resetInventoryManager,
  getInventoryManager,
} from '../../src/inventory/InventoryManager';
import type { SaveFile, Inventory } from '../../src/types';

describe('InventoryManager', () => {
  let manager: InventoryManager;

  beforeEach(() => {
    resetInventoryManager();
    manager = new InventoryManager();
  });

  describe('constructor and defaults', () => {
    it('initializes with default inventory', () => {
      const inv = manager.getInventory();
      expect(inv.swordLevel).toBe(0);
      expect(inv.rupees).toBe(0);
      expect(inv.keys).toBe(0);
      expect(inv.bombCount).toBe(0);
      expect(inv.hasBoomerang).toBe(false);
    });

    it('initializes with 3 heart containers', () => {
      expect(manager.getHeartContainers()).toBe(3);
    });

    it('initializes with 6 HP (3 full hearts)', () => {
      expect(manager.getCurrentHP()).toBe(6);
    });

    it('initializes with max HP of 6', () => {
      expect(manager.getMaxHP()).toBe(6);
    });
  });

  describe('DEFAULT_INVENTORY', () => {
    it('has all expected properties', () => {
      expect(DEFAULT_INVENTORY.swordLevel).toBe(0);
      expect(DEFAULT_INVENTORY.rupees).toBe(0);
      expect(DEFAULT_INVENTORY.keys).toBe(0);
      expect(DEFAULT_INVENTORY.bombCount).toBe(0);
      expect(DEFAULT_INVENTORY.bombCapacity).toBe(8);
      expect(DEFAULT_INVENTORY.selectedBItem).toBeNull();
    });
  });

  describe('rupees', () => {
    it('adds rupees', () => {
      manager.addRupees(10);
      expect(manager.getRupees()).toBe(10);
    });

    it('caps rupees at 255', () => {
      manager.addRupees(300);
      expect(manager.getRupees()).toBe(255);
    });

    it('accumulates rupees correctly', () => {
      manager.addRupees(50);
      manager.addRupees(30);
      expect(manager.getRupees()).toBe(80);
    });

    it('spends rupees when sufficient', () => {
      manager.addRupees(100);
      const result = manager.spendRupees(30);
      expect(result).toBe(true);
      expect(manager.getRupees()).toBe(70);
    });

    it('fails to spend rupees when insufficient', () => {
      manager.addRupees(20);
      const result = manager.spendRupees(50);
      expect(result).toBe(false);
      expect(manager.getRupees()).toBe(20);
    });

    it('spends exact amount', () => {
      manager.addRupees(50);
      const result = manager.spendRupees(50);
      expect(result).toBe(true);
      expect(manager.getRupees()).toBe(0);
    });
  });

  describe('keys', () => {
    it('adds keys', () => {
      manager.addKey();
      expect(manager.getKeys()).toBe(1);
    });

    it('caps keys at 255', () => {
      for (let i = 0; i < 260; i++) {
        manager.addKey();
      }
      expect(manager.getKeys()).toBe(255);
    });

    it('uses keys when available', () => {
      manager.addKey();
      manager.addKey();
      const result = manager.useKey();
      expect(result).toBe(true);
      expect(manager.getKeys()).toBe(1);
    });

    it('fails to use key when none available', () => {
      const result = manager.useKey();
      expect(result).toBe(false);
    });

    it('magic key allows infinite uses', () => {
      manager.addItem('MAGIC_KEY');
      const result1 = manager.useKey();
      const result2 = manager.useKey();
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(manager.getKeys()).toBe(0); // No physical keys consumed
    });

    it('hasMagicKey returns correct state', () => {
      expect(manager.hasMagicKey()).toBe(false);
      manager.addItem('MAGIC_KEY');
      expect(manager.hasMagicKey()).toBe(true);
    });
  });

  describe('bombs', () => {
    it('adds bombs and enables bomb usage', () => {
      manager.addBomb();
      expect(manager.getBombs()).toBe(1);
      expect(manager.getInventory().hasBombs).toBe(true);
    });

    it('caps bombs at bomb capacity', () => {
      for (let i = 0; i < 12; i++) {
        manager.addBomb();
      }
      expect(manager.getBombs()).toBe(8); // Default capacity
    });

    it('uses bombs when available', () => {
      manager.addBomb();
      manager.addBomb();
      const result = manager.useBomb();
      expect(result).toBe(true);
      expect(manager.getBombs()).toBe(1);
    });

    it('fails to use bomb when none available', () => {
      const result = manager.useBomb();
      expect(result).toBe(false);
    });

    it('upgrades bomb capacity 8 -> 12', () => {
      expect(manager.getBombCapacity()).toBe(8);
      manager.upgradeBombCapacity();
      expect(manager.getBombCapacity()).toBe(12);
    });

    it('upgrades bomb capacity 12 -> 16', () => {
      manager.upgradeBombCapacity(); // 8 -> 12
      manager.upgradeBombCapacity(); // 12 -> 16
      expect(manager.getBombCapacity()).toBe(16);
    });

    it('does not upgrade bomb capacity past 16', () => {
      manager.upgradeBombCapacity(); // 8 -> 12
      manager.upgradeBombCapacity(); // 12 -> 16
      manager.upgradeBombCapacity(); // no change
      expect(manager.getBombCapacity()).toBe(16);
    });

    it('respects upgraded bomb capacity', () => {
      manager.upgradeBombCapacity(); // 8 -> 12
      for (let i = 0; i < 15; i++) {
        manager.addBomb();
      }
      expect(manager.getBombs()).toBe(12);
    });
  });

  describe('heart containers and HP', () => {
    it('adds heart container', () => {
      manager.addHeartContainer();
      expect(manager.getHeartContainers()).toBe(4);
    });

    it('caps heart containers at 16', () => {
      for (let i = 0; i < 20; i++) {
        manager.addHeartContainer();
      }
      expect(manager.getHeartContainers()).toBe(16);
    });

    it('adding heart container fills HP to max', () => {
      manager.takeDamage(4);
      manager.addHeartContainer();
      expect(manager.getCurrentHP()).toBe(8); // 4 hearts = 8 half-hearts
    });

    it('updates max HP when heart container added', () => {
      manager.addHeartContainer();
      expect(manager.getMaxHP()).toBe(8);
    });

    it('sets HP directly', () => {
      manager.setCurrentHP(4);
      expect(manager.getCurrentHP()).toBe(4);
    });

    it('clamps HP to max', () => {
      manager.setCurrentHP(100);
      expect(manager.getCurrentHP()).toBe(6);
    });

    it('clamps HP to 0', () => {
      manager.setCurrentHP(-5);
      expect(manager.getCurrentHP()).toBe(0);
    });

    it('heals HP', () => {
      manager.takeDamage(4);
      manager.heal(2);
      expect(manager.getCurrentHP()).toBe(4);
    });

    it('heal does not exceed max HP', () => {
      manager.heal(100);
      expect(manager.getCurrentHP()).toBe(6);
    });
  });

  describe('damage and rings', () => {
    it('takes damage without ring', () => {
      const alive = manager.takeDamage(2);
      expect(alive).toBe(true);
      expect(manager.getCurrentHP()).toBe(4);
    });

    it('returns false when HP reaches 0', () => {
      const alive = manager.takeDamage(10);
      expect(alive).toBe(false);
      expect(manager.getCurrentHP()).toBe(0);
    });

    it('blue ring reduces damage by half', () => {
      manager.addItem('BLUE_RING');
      manager.takeDamage(4);
      expect(manager.getCurrentHP()).toBe(4); // 4 * 0.5 = 2 damage
    });

    it('red ring reduces damage to quarter', () => {
      manager.addItem('RED_RING');
      manager.takeDamage(4);
      expect(manager.getCurrentHP()).toBe(5); // 4 * 0.25 = 1 damage
    });

    it('minimum damage is 1', () => {
      manager.addItem('RED_RING');
      manager.takeDamage(1); // 1 * 0.25 = 0.25, floors to 0, but min is 1
      expect(manager.getCurrentHP()).toBe(5);
    });

    it('getDamageReduction returns correct values', () => {
      expect(manager.getDamageReduction()).toBe(1);
      manager.addItem('BLUE_RING');
      expect(manager.getDamageReduction()).toBe(0.5);
      manager.addItem('RED_RING');
      expect(manager.getDamageReduction()).toBe(0.25);
    });

    it('isAtFullHP returns correct state', () => {
      expect(manager.isAtFullHP()).toBe(true);
      manager.takeDamage(1);
      expect(manager.isAtFullHP()).toBe(false);
      manager.heal(1);
      expect(manager.isAtFullHP()).toBe(true);
    });
  });

  describe('major items', () => {
    it('adds boomerang', () => {
      manager.addItem('BOOMERANG');
      const inv = manager.getInventory();
      expect(inv.hasBoomerang).toBe(true);
      expect(inv.boomerangType).toBe('wood');
    });

    it('adds magic boomerang', () => {
      manager.addItem('MAGIC_BOOMERANG');
      const inv = manager.getInventory();
      expect(inv.hasBoomerang).toBe(true);
      expect(inv.boomerangType).toBe('magic');
    });

    it('adds bow', () => {
      manager.addItem('BOW');
      expect(manager.getInventory().hasBow).toBe(true);
    });

    it('adds arrow (includes bow)', () => {
      manager.addItem('ARROW');
      const inv = manager.getInventory();
      expect(inv.hasBow).toBe(true);
      expect(inv.arrowType).toBe('wood');
    });

    it('adds silver arrow', () => {
      manager.addItem('SILVER_ARROW');
      expect(manager.getInventory().arrowType).toBe('silver');
    });

    it('adds blue candle', () => {
      manager.addItem('BLUE_CANDLE');
      expect(manager.getInventory().candleType).toBe('blue');
    });

    it('adds red candle', () => {
      manager.addItem('RED_CANDLE');
      expect(manager.getInventory().candleType).toBe('red');
    });

    it('adds recorder', () => {
      manager.addItem('RECORDER');
      expect(manager.getInventory().hasRecorder).toBe(true);
    });

    it('adds food', () => {
      manager.addItem('FOOD');
      expect(manager.getInventory().hasFood).toBe(true);
    });

    it('adds letter', () => {
      manager.addItem('LETTER');
      expect(manager.getInventory().potionState).toBe('letter');
    });

    it('adds potion', () => {
      manager.addItem('POTION');
      expect(manager.getInventory().potionState).toBe('potion1');
    });

    it('adds second potion', () => {
      manager.addItem('POTION_2');
      expect(manager.getInventory().potionState).toBe('potion2');
    });

    it('adds magic rod', () => {
      manager.addItem('MAGIC_ROD');
      expect(manager.getInventory().hasMagicRod).toBe(true);
    });

    it('adds book of magic', () => {
      manager.addItem('BOOK_OF_MAGIC');
      expect(manager.getInventory().hasBook).toBe(true);
    });

    it('adds power bracelet', () => {
      manager.addItem('POWER_BRACELET');
      expect(manager.getInventory().hasPowerBracelet).toBe(true);
    });

    it('adds standard shield', () => {
      manager.addItem('STANDARD_SHIELD');
      expect(manager.getInventory().shieldType).toBe('standard');
    });

    it('adds magic shield', () => {
      manager.addItem('MAGIC_SHIELD');
      expect(manager.getInventory().shieldType).toBe('magic');
    });

    it('adds ladder', () => {
      manager.addItem('LADDER');
      expect(manager.getInventory().hasLadder).toBe(true);
    });

    it('adds raft', () => {
      manager.addItem('RAFT');
      expect(manager.getInventory().hasRaft).toBe(true);
    });
  });

  describe('swords', () => {
    it('adds wooden sword (level 1)', () => {
      manager.addItem('WOODEN_SWORD');
      expect(manager.getSwordLevel()).toBe(1);
      expect(manager.hasSword()).toBe(true);
    });

    it('adds white sword (level 2)', () => {
      manager.addItem('WHITE_SWORD');
      expect(manager.getSwordLevel()).toBe(2);
    });

    it('adds magical sword (level 3)', () => {
      manager.addItem('MAGICAL_SWORD');
      expect(manager.getSwordLevel()).toBe(3);
    });

    it('hasSword returns false when no sword', () => {
      expect(manager.hasSword()).toBe(false);
    });
  });

  describe('B-item selection', () => {
    it('starts with no selected B-item', () => {
      expect(manager.getSelectedBItem()).toBeNull();
    });

    it('sets selected B-item', () => {
      manager.setSelectedBItem('BOMB');
      expect(manager.getSelectedBItem()).toBe('BOMB');
    });

    it('clears selected B-item', () => {
      manager.setSelectedBItem('BOMB');
      manager.setSelectedBItem(null);
      expect(manager.getSelectedBItem()).toBeNull();
    });

    it('getAvailableBItems returns empty array initially', () => {
      expect(manager.getAvailableBItems()).toEqual([]);
    });

    it('getAvailableBItems includes boomerang when owned', () => {
      manager.addItem('BOOMERANG');
      expect(manager.getAvailableBItems()).toContain('BOOMERANG');
    });

    it('getAvailableBItems includes bomb when owned and has bombs', () => {
      manager.addBomb();
      expect(manager.getAvailableBItems()).toContain('BOMB');
    });

    it('getAvailableBItems excludes bomb when count is 0', () => {
      manager.addBomb();
      manager.useBomb();
      expect(manager.getAvailableBItems()).not.toContain('BOMB');
    });

    it('getAvailableBItems includes bow_arrow when both owned', () => {
      manager.addItem('BOW');
      manager.addItem('ARROW');
      expect(manager.getAvailableBItems()).toContain('BOW_ARROW');
    });

    it('getAvailableBItems excludes bow_arrow when only bow owned', () => {
      manager.addItem('BOW');
      expect(manager.getAvailableBItems()).not.toContain('BOW_ARROW');
    });

    it('getAvailableBItems includes candle when owned', () => {
      manager.addItem('BLUE_CANDLE');
      expect(manager.getAvailableBItems()).toContain('CANDLE');
    });

    it('getAvailableBItems includes recorder when owned', () => {
      manager.addItem('RECORDER');
      expect(manager.getAvailableBItems()).toContain('RECORDER');
    });

    it('getAvailableBItems includes food when owned', () => {
      manager.addItem('FOOD');
      expect(manager.getAvailableBItems()).toContain('FOOD');
    });

    it('getAvailableBItems includes potion when owned', () => {
      manager.addItem('POTION');
      expect(manager.getAvailableBItems()).toContain('POTION');
    });

    it('getAvailableBItems excludes potion when only letter owned', () => {
      manager.addItem('LETTER');
      expect(manager.getAvailableBItems()).not.toContain('POTION');
    });

    it('getAvailableBItems includes magic rod when owned', () => {
      manager.addItem('MAGIC_ROD');
      expect(manager.getAvailableBItems()).toContain('MAGIC_ROD');
    });
  });

  describe('canUseBItem', () => {
    it('returns false when no item selected', () => {
      expect(manager.canUseBItem()).toBe(false);
    });

    it('returns true for boomerang when owned', () => {
      manager.addItem('BOOMERANG');
      manager.setSelectedBItem('BOOMERANG');
      expect(manager.canUseBItem()).toBe(true);
    });

    it('returns false for boomerang when not owned', () => {
      manager.setSelectedBItem('BOOMERANG');
      expect(manager.canUseBItem()).toBe(false);
    });

    it('returns true for bomb when available', () => {
      manager.addBomb();
      manager.setSelectedBItem('BOMB');
      expect(manager.canUseBItem()).toBe(true);
    });

    it('returns false for bomb when count is 0', () => {
      manager.setSelectedBItem('BOMB');
      expect(manager.canUseBItem()).toBe(false);
    });

    it('returns true for bow_arrow when both owned', () => {
      manager.addItem('ARROW');
      manager.setSelectedBItem('BOW_ARROW');
      expect(manager.canUseBItem()).toBe(true);
    });

    it('returns false for bow_arrow when only bow owned', () => {
      manager.addItem('BOW');
      manager.setSelectedBItem('BOW_ARROW');
      expect(manager.canUseBItem()).toBe(false);
    });

    it('returns true for candle when owned', () => {
      manager.addItem('RED_CANDLE');
      manager.setSelectedBItem('CANDLE');
      expect(manager.canUseBItem()).toBe(true);
    });

    it('returns true for recorder when owned', () => {
      manager.addItem('RECORDER');
      manager.setSelectedBItem('RECORDER');
      expect(manager.canUseBItem()).toBe(true);
    });

    it('returns true for food when owned', () => {
      manager.addItem('FOOD');
      manager.setSelectedBItem('FOOD');
      expect(manager.canUseBItem()).toBe(true);
    });

    it('returns true for potion when owned', () => {
      manager.addItem('POTION');
      manager.setSelectedBItem('POTION');
      expect(manager.canUseBItem()).toBe(true);
    });

    it('returns true for magic rod when owned', () => {
      manager.addItem('MAGIC_ROD');
      manager.setSelectedBItem('MAGIC_ROD');
      expect(manager.canUseBItem()).toBe(true);
    });
  });

  describe('loadFromSave', () => {
    it('loads inventory from save file', () => {
      const save: Partial<SaveFile> = {
        inventory: {
          ...DEFAULT_INVENTORY,
          rupees: 100,
          keys: 5,
          swordLevel: 2,
        } as Inventory,
        heartContainers: 8,
      };
      manager.loadFromSave(save as SaveFile);
      expect(manager.getRupees()).toBe(100);
      expect(manager.getKeys()).toBe(5);
      expect(manager.getSwordLevel()).toBe(2);
      expect(manager.getHeartContainers()).toBe(8);
    });

    it('creates independent copy of inventory', () => {
      const save: Partial<SaveFile> = {
        inventory: {
          ...DEFAULT_INVENTORY,
          rupees: 50,
        } as Inventory,
        heartContainers: 4,
      };
      manager.loadFromSave(save as SaveFile);
      manager.addRupees(10);
      expect(save.inventory!.rupees).toBe(50); // Original unchanged
    });
  });

  describe('reset', () => {
    it('resets to default inventory', () => {
      manager.addRupees(100);
      manager.addKey();
      manager.addItem('BOOMERANG');
      manager.addHeartContainer();

      manager.reset();

      expect(manager.getRupees()).toBe(0);
      expect(manager.getKeys()).toBe(0);
      expect(manager.getInventory().hasBoomerang).toBe(false);
      expect(manager.getHeartContainers()).toBe(3);
      expect(manager.getCurrentHP()).toBe(6);
    });
  });

  describe('toSaveData', () => {
    it('returns inventory and heart containers', () => {
      manager.addRupees(75);
      manager.addHeartContainer();

      const saveData = manager.toSaveData();

      expect(saveData.inventory.rupees).toBe(75);
      expect(saveData.heartContainers).toBe(4);
    });

    it('returns independent copy', () => {
      const saveData = manager.toSaveData();
      saveData.inventory.rupees = 999;
      expect(manager.getRupees()).toBe(0);
    });
  });

  describe('singleton', () => {
    it('getInventoryManager returns same instance', () => {
      const instance1 = getInventoryManager();
      const instance2 = getInventoryManager();
      expect(instance1).toBe(instance2);
    });

    it('resetInventoryManager creates new instance', () => {
      const instance1 = getInventoryManager();
      instance1.addRupees(50);

      resetInventoryManager();
      const instance2 = getInventoryManager();

      expect(instance2.getRupees()).toBe(0);
    });
  });
});
