// ProgressionManager.test.ts - Tests for Triforce and progression tracking

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProgressionManager,
  getProgressionManager,
  resetProgressionManager,
} from '../../src/progression/ProgressionManager';
import { resetDungeonManager, getDungeonManager } from '../../src/world/DungeonManager';
import { createDefaultProgressionFlags } from '../../src/progression/SaveSystem';
import type { SaveFile } from '../../src/types';

describe('ProgressionManager', () => {
  beforeEach(() => {
    resetProgressionManager();
    resetDungeonManager();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const pm1 = getProgressionManager();
      const pm2 = getProgressionManager();
      expect(pm1).toBe(pm2);
    });

    it('should return a new instance after reset', () => {
      const pm1 = getProgressionManager();
      resetProgressionManager();
      const pm2 = getProgressionManager();
      expect(pm1).not.toBe(pm2);
    });
  });

  describe('Triforce tracking', () => {
    it('should start with 0 Triforce pieces', () => {
      const pm = new ProgressionManager();
      expect(pm.getTriforceCount()).toBe(0);
    });

    it('should track Triforce collected from dungeons', () => {
      const pm = new ProgressionManager();
      const dm = getDungeonManager();

      // Enter dungeon 1 and collect Triforce
      dm.enterDungeon(1);
      dm.collectDungeonItem('TRIFORCE_PIECE');

      expect(pm.getTriforceCount()).toBe(1);
      expect(pm.hasTriforceFromDungeon(1)).toBe(true);
      expect(pm.hasTriforceFromDungeon(2)).toBe(false);
    });

    it('should collectTriforce return correct event data', () => {
      const pm = new ProgressionManager();

      const event = pm.collectTriforce(1);

      expect(event.dungeonId).toBe(1);
      expect(event.totalPieces).toBe(0); // DungeonManager doesn't have this marked
      expect(event.isComplete).toBe(false);
    });

    it('should getTriforceFragments return array of 8 booleans', () => {
      const pm = new ProgressionManager();
      const fragments = pm.getTriforceFragments();

      expect(fragments).toHaveLength(8);
      expect(fragments.every(f => f === false)).toBe(true);
    });

    it('should isTriforceComplete return false with less than 8 pieces', () => {
      const pm = new ProgressionManager();
      expect(pm.isTriforceComplete()).toBe(false);
    });

    it('should throw for invalid dungeon ID', () => {
      const pm = new ProgressionManager();
      expect(() => pm.collectTriforce(0)).toThrow('Invalid dungeon ID');
      expect(() => pm.collectTriforce(9)).toThrow('Invalid dungeon ID');
    });

    it('should hasTriforceFromDungeon return false for invalid IDs', () => {
      const pm = new ProgressionManager();
      expect(pm.hasTriforceFromDungeon(0)).toBe(false);
      expect(pm.hasTriforceFromDungeon(9)).toBe(false);
      expect(pm.hasTriforceFromDungeon(-1)).toBe(false);
    });
  });

  describe('Dungeon completion', () => {
    it('should getDungeonStatus return null for invalid IDs', () => {
      const pm = new ProgressionManager();
      expect(pm.getDungeonStatus(0)).toBeNull();
      expect(pm.getDungeonStatus(9)).toBeNull();
    });

    it('should getDungeonStatus return default status for unvisited dungeon', () => {
      const pm = new ProgressionManager();
      const status = pm.getDungeonStatus(1);

      expect(status).not.toBeNull();
      expect(status!.dungeonId).toBe(1);
      expect(status!.triforceCollected).toBe(false);
      expect(status!.bossDefeated).toBe(false);
      expect(status!.hasMap).toBe(false);
      expect(status!.hasCompass).toBe(false);
      expect(status!.isComplete).toBe(false);
    });

    it('should getDungeonStatus reflect dungeon progress', () => {
      const pm = new ProgressionManager();
      const dm = getDungeonManager();

      // Enter dungeon and collect items
      dm.enterDungeon(1);
      dm.collectDungeonItem('MAP');
      dm.collectDungeonItem('COMPASS');
      dm.markBossDefeated();
      dm.collectDungeonItem('TRIFORCE_PIECE');

      const status = pm.getDungeonStatus(1);
      expect(status!.hasMap).toBe(true);
      expect(status!.hasCompass).toBe(true);
      expect(status!.bossDefeated).toBe(true);
      expect(status!.triforceCollected).toBe(true);
      expect(status!.isComplete).toBe(true);
    });

    it('should isDungeonComplete check Triforce collection', () => {
      const pm = new ProgressionManager();
      const dm = getDungeonManager();

      expect(pm.isDungeonComplete(1)).toBe(false);

      dm.enterDungeon(1);
      dm.collectDungeonItem('TRIFORCE_PIECE');

      expect(pm.isDungeonComplete(1)).toBe(true);
    });

    it('should getCompletedDungeons return list of completed IDs', () => {
      const pm = new ProgressionManager();
      const dm = getDungeonManager();

      expect(pm.getCompletedDungeons()).toEqual([]);

      // Complete dungeon 1 (only dungeon 1 is defined in test data)
      dm.enterDungeon(1);
      dm.collectDungeonItem('TRIFORCE_PIECE');
      dm.exitDungeon();

      expect(pm.getCompletedDungeons()).toEqual([1]);
    });
  });

  describe('Game win condition', () => {
    it('should canAccessDungeon9 require all 8 Triforce pieces', () => {
      const pm = new ProgressionManager();
      expect(pm.canAccessDungeon9()).toBe(false);
    });

    it('should track Ganon defeat', () => {
      const pm = new ProgressionManager();
      expect(pm.isGanonDefeated()).toBe(false);

      pm.defeatGanon();
      expect(pm.isGanonDefeated()).toBe(true);
    });

    it('should track Zelda rescue', () => {
      const pm = new ProgressionManager();
      expect(pm.isZeldaRescued()).toBe(false);
      expect(pm.isGameComplete()).toBe(false);

      pm.rescueZelda();
      expect(pm.isZeldaRescued()).toBe(true);
      expect(pm.isGameComplete()).toBe(true);
    });
  });

  describe('Sword tracking', () => {
    it('should track starting sword collection', () => {
      const pm = new ProgressionManager();
      expect(pm.hasStartingSword()).toBe(false);

      pm.collectStartingSword();
      expect(pm.hasStartingSword()).toBe(true);
    });

    it('should track white sword collection', () => {
      const pm = new ProgressionManager();
      expect(pm.hasWhiteSword()).toBe(false);

      pm.collectWhiteSword();
      expect(pm.hasWhiteSword()).toBe(true);
    });

    it('should track magical sword collection', () => {
      const pm = new ProgressionManager();
      expect(pm.hasMagicalSword()).toBe(false);

      pm.collectMagicalSword();
      expect(pm.hasMagicalSword()).toBe(true);
    });
  });

  describe('Dungeon entrance tracking', () => {
    it('should track visited dungeon entrances', () => {
      const pm = new ProgressionManager();
      expect(pm.hasVisitedDungeonEntrance(1)).toBe(false);

      pm.visitDungeonEntrance(1);
      expect(pm.hasVisitedDungeonEntrance(1)).toBe(true);
      expect(pm.hasVisitedDungeonEntrance(2)).toBe(false);
    });

    it('should not duplicate visited entrances', () => {
      const pm = new ProgressionManager();
      pm.visitDungeonEntrance(1);
      pm.visitDungeonEntrance(1);
      pm.visitDungeonEntrance(1);

      expect(pm.getVisitedDungeonEntrances()).toEqual([1]);
    });

    it('should getVisitedDungeonEntrances return all visited', () => {
      const pm = new ProgressionManager();
      pm.visitDungeonEntrance(1);
      pm.visitDungeonEntrance(3);
      pm.visitDungeonEntrance(5);

      expect(pm.getVisitedDungeonEntrances()).toEqual([1, 3, 5]);
    });
  });

  describe('Second quest', () => {
    it('should track second quest status', () => {
      const pm = new ProgressionManager();
      expect(pm.isSecondQuest()).toBe(false);

      pm.startSecondQuest();
      expect(pm.isSecondQuest()).toBe(true);
    });
  });

  describe('Save/Load', () => {
    it('should getProgressionFlags return current state', () => {
      const pm = new ProgressionManager();
      pm.collectStartingSword();
      pm.visitDungeonEntrance(1);

      const flags = pm.getProgressionFlags();
      expect(flags.startingSwordCollected).toBe(true);
      expect(flags.visitedDungeonEntrances).toEqual([1]);
    });

    it('should loadFromSave restore progression', () => {
      const pm = new ProgressionManager();
      const saveFile: SaveFile = {
        slot: 0,
        playerName: 'TEST',
        deathCount: 5,
        isSecondQuest: false,
        heartContainers: 5,
        inventory: {
          swordLevel: 1,
          hasBoomerang: false,
          hasBombs: false,
          bombCount: 0,
          bombCapacity: 8,
          hasBow: false,
          arrowType: undefined,
          hasRecorder: false,
          hasFood: false,
          hasMagicRod: false,
          hasBook: false,
          candleType: undefined,
          ringLevel: 0,
          hasPowerBracelet: false,
          hasLadder: false,
          hasRaft: false,
          hasMagicKey: false,
          shieldType: 'small',
          rupees: 0,
          keys: 0,
          selectedBItem: null,
          potionState: 'none',
        },
        dungeons: [],
        overworld: {
          visitedScreens: [],
          revealedSecrets: [],
          collectedItems: [],
        },
        progression: {
          ...createDefaultProgressionFlags(),
          ganonDefeated: true,
          startingSwordCollected: true,
          whiteSwordCollected: true,
        },
        killCounter: 0,
        saveVersion: 1,
      };

      pm.loadFromSave(saveFile);

      expect(pm.isGanonDefeated()).toBe(true);
      expect(pm.hasStartingSword()).toBe(true);
      expect(pm.hasWhiteSword()).toBe(true);
    });

    it('should loadProgressionFlags restore just flags', () => {
      const pm = new ProgressionManager();
      const flags = createDefaultProgressionFlags();
      flags.zeldaRescued = true;

      pm.loadProgressionFlags(flags);
      expect(pm.isZeldaRescued()).toBe(true);
    });

    it('should toSaveData return flags for saving', () => {
      const pm = new ProgressionManager();
      pm.defeatGanon();
      pm.rescueZelda();

      const saveData = pm.toSaveData();
      expect(saveData.ganonDefeated).toBe(true);
      expect(saveData.zeldaRescued).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset clear all progression', () => {
      const pm = new ProgressionManager();
      pm.defeatGanon();
      pm.rescueZelda();
      pm.collectStartingSword();
      pm.visitDungeonEntrance(1);

      pm.reset();

      expect(pm.isGanonDefeated()).toBe(false);
      expect(pm.isZeldaRescued()).toBe(false);
      expect(pm.hasStartingSword()).toBe(false);
      expect(pm.getVisitedDungeonEntrances()).toEqual([]);
    });
  });
});
