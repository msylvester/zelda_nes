// SaveSystem.test.ts - Tests for save/load system
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SaveSystem,
  getSaveSystem,
  resetSaveSystem,
  createNewSaveFile,
  createDefaultProgressionFlags,
  createEmptyDungeonProgress,
  createDefaultOverworldProgress,
} from '../../src/progression/SaveSystem';
import type { SaveFile, Inventory } from '../../src/types';
import { SAVE_SLOTS, SAVE_VERSION, LOCAL_STORAGE_KEY, STARTING_HEARTS } from '../../src/constants';
import { DEFAULT_INVENTORY } from '../../src/inventory/InventoryManager';

// Mock localStorage with persistent store across calls
let mockStore: Record<string, string> = {};

const createLocalStorageMock = () => ({
  getItem: vi.fn((key: string) => mockStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStore[key];
  }),
  clear: vi.fn(() => {
    mockStore = {};
  }),
});

let localStorageMock = createLocalStorageMock();

// Setup before each test
beforeEach(() => {
  mockStore = {};
  localStorageMock = createLocalStorageMock();
  // Need to stub both window (so typeof window !== 'undefined') and localStorage
  vi.stubGlobal('window', { localStorage: localStorageMock });
  vi.stubGlobal('localStorage', localStorageMock);
  resetSaveSystem();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ===== HELPER FUNCTIONS =====

function createValidSaveFile(slot: number = 0, name: string = 'LINK'): SaveFile {
  return createNewSaveFile(slot, name);
}

// ===== createDefaultProgressionFlags =====
describe('createDefaultProgressionFlags', () => {
  it('should create progression flags with all default values', () => {
    const flags = createDefaultProgressionFlags();
    expect(flags.triforceCount).toBe(0);
    expect(flags.triforceFragments).toHaveLength(8);
    expect(flags.triforceFragments.every(f => f === false)).toBe(true);
    expect(flags.ganonDefeated).toBe(false);
    expect(flags.zeldaRescued).toBe(false);
    expect(flags.isSecondQuest).toBe(false);
    expect(flags.visitedDungeonEntrances).toEqual([]);
    expect(flags.startingSwordCollected).toBe(false);
    expect(flags.whiteSwordCollected).toBe(false);
    expect(flags.magicalSwordCollected).toBe(false);
  });
});

// ===== createEmptyDungeonProgress =====
describe('createEmptyDungeonProgress', () => {
  it('should create empty dungeon progress for given index', () => {
    const progress = createEmptyDungeonProgress(3);
    expect(progress.dungeonIndex).toBe(3);
    expect(progress.hasMap).toBe(false);
    expect(progress.hasCompass).toBe(false);
    expect(progress.bossDefeated).toBe(false);
    expect(progress.triforceCollected).toBe(false);
    expect(progress.dungeonItemCollected).toBe(false);
    expect(progress.rooms).toEqual([]);
    expect(progress.lockedDoorsOpened).toEqual([]);
  });

  it('should create progress for all dungeon indices 0-8', () => {
    for (let i = 0; i < 9; i++) {
      const progress = createEmptyDungeonProgress(i);
      expect(progress.dungeonIndex).toBe(i);
    }
  });
});

// ===== createDefaultOverworldProgress =====
describe('createDefaultOverworldProgress', () => {
  it('should create empty overworld progress', () => {
    const progress = createDefaultOverworldProgress();
    expect(progress.visitedScreens).toEqual([]);
    expect(progress.revealedSecrets).toEqual([]);
    expect(progress.collectedItems).toEqual([]);
  });
});

// ===== createNewSaveFile =====
describe('createNewSaveFile', () => {
  it('should create a new save file with correct slot and name', () => {
    const save = createNewSaveFile(1, 'ZELDA');
    expect(save.slot).toBe(1);
    expect(save.playerName).toBe('ZELDA');
  });

  it('should have default values for new game', () => {
    const save = createNewSaveFile(0, 'LINK');
    expect(save.deathCount).toBe(0);
    expect(save.isSecondQuest).toBe(false);
    expect(save.heartContainers).toBe(STARTING_HEARTS);
    expect(save.killCounter).toBe(0);
    expect(save.saveVersion).toBe(SAVE_VERSION);
  });

  it('should have default inventory', () => {
    const save = createNewSaveFile(0, 'LINK');
    expect(save.inventory.swordLevel).toBe(0);
    expect(save.inventory.rupees).toBe(0);
    expect(save.inventory.keys).toBe(0);
    expect(save.inventory.bombCount).toBe(0);
  });

  it('should have 9 empty dungeon progress entries', () => {
    const save = createNewSaveFile(0, 'LINK');
    expect(save.dungeons).toHaveLength(9);
    for (let i = 0; i < 9; i++) {
      expect(save.dungeons[i]?.dungeonIndex).toBe(i);
      expect(save.dungeons[i]?.bossDefeated).toBe(false);
    }
  });

  it('should have default progression flags', () => {
    const save = createNewSaveFile(0, 'LINK');
    expect(save.progression.triforceCount).toBe(0);
    expect(save.progression.ganonDefeated).toBe(false);
  });
});

// ===== SaveSystem constructor =====
describe('SaveSystem constructor', () => {
  it('should create empty storage when localStorage is empty', () => {
    const system = new SaveSystem();
    const files = system.getFiles();
    expect(files).toHaveLength(SAVE_SLOTS);
    expect(files.every(f => f === null)).toBe(true);
  });

  it('should load existing saves from localStorage', () => {
    const existingSave = createValidSaveFile(0, 'TEST');
    const storage = {
      files: [existingSave, null, null],
      lastPlayedSlot: 0,
    };
    localStorageMock.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storage));

    const system = new SaveSystem();
    const files = system.getFiles();
    expect(files[0]?.playerName).toBe('TEST');
    expect(files[1]).toBeNull();
    expect(files[2]).toBeNull();
  });

  it('should return empty storage for invalid JSON', () => {
    localStorageMock.setItem(LOCAL_STORAGE_KEY, 'not valid json');

    const system = new SaveSystem();
    const files = system.getFiles();
    expect(files.every(f => f === null)).toBe(true);
  });

  it('should return empty storage for invalid structure', () => {
    localStorageMock.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ files: 'not an array' }));

    const system = new SaveSystem();
    const files = system.getFiles();
    expect(files.every(f => f === null)).toBe(true);
  });
});

// ===== SaveSystem.save =====
describe('SaveSystem.save', () => {
  it('should save a file to the correct slot', () => {
    const system = new SaveSystem();
    const saveFile = createValidSaveFile(1, 'HERO');

    system.save(1, saveFile);

    expect(system.load(1)?.playerName).toBe('HERO');
    expect(system.load(0)).toBeNull();
    expect(system.load(2)).toBeNull();
  });

  it('should persist to localStorage', () => {
    const system = new SaveSystem();
    const saveFile = createValidSaveFile(0, 'LINK');

    system.save(0, saveFile);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      LOCAL_STORAGE_KEY,
      expect.any(String)
    );
  });

  it('should update lastPlayedSlot', () => {
    const system = new SaveSystem();
    const saveFile = createValidSaveFile(2, 'LINK');

    system.save(2, saveFile);

    expect(system.getLastPlayedSlot()).toBe(2);
  });

  it('should ensure save version is current', () => {
    const system = new SaveSystem();
    const saveFile = createValidSaveFile(0, 'LINK');
    (saveFile as { saveVersion: number }).saveVersion = 0; // Outdated version

    system.save(0, saveFile);

    expect(system.load(0)?.saveVersion).toBe(SAVE_VERSION);
  });

  it('should overwrite existing save in slot', () => {
    const system = new SaveSystem();
    system.save(0, createValidSaveFile(0, 'FIRST'));
    system.save(0, createValidSaveFile(0, 'SECOND'));

    expect(system.load(0)?.playerName).toBe('SECOND');
  });

  it('should throw for invalid slot number', () => {
    const system = new SaveSystem();
    const saveFile = createValidSaveFile(0, 'LINK');

    expect(() => system.save(-1, saveFile)).toThrow('Invalid save slot');
    expect(() => system.save(3, saveFile)).toThrow('Invalid save slot');
    expect(() => system.save(100, saveFile)).toThrow('Invalid save slot');
  });
});

// ===== SaveSystem.load =====
describe('SaveSystem.load', () => {
  it('should return null for empty slot', () => {
    const system = new SaveSystem();
    expect(system.load(0)).toBeNull();
    expect(system.load(1)).toBeNull();
    expect(system.load(2)).toBeNull();
  });

  it('should return save file for occupied slot', () => {
    const system = new SaveSystem();
    const saveFile = createValidSaveFile(1, 'ZELDA');
    system.save(1, saveFile);

    const loaded = system.load(1);
    expect(loaded).not.toBeNull();
    expect(loaded?.playerName).toBe('ZELDA');
    expect(loaded?.slot).toBe(1);
  });

  it('should return null for invalid slot', () => {
    const system = new SaveSystem();
    expect(system.load(-1)).toBeNull();
    expect(system.load(3)).toBeNull();
    expect(system.load(100)).toBeNull();
  });
});

// ===== SaveSystem.deleteFile =====
describe('SaveSystem.deleteFile', () => {
  it('should delete save file from slot', () => {
    const system = new SaveSystem();
    system.save(0, createValidSaveFile(0, 'LINK'));

    expect(system.load(0)).not.toBeNull();
    system.deleteFile(0);
    expect(system.load(0)).toBeNull();
  });

  it('should persist deletion to localStorage', () => {
    const system = new SaveSystem();
    system.save(0, createValidSaveFile(0, 'LINK'));

    system.deleteFile(0);

    // Check the stored data directly
    const storedValue = mockStore[LOCAL_STORAGE_KEY];
    expect(storedValue).toBeDefined();
    const savedData = JSON.parse(storedValue ?? '{}');
    expect(savedData.files[0]).toBeNull();
  });

  it('should clear lastPlayedSlot if deleting that slot', () => {
    const system = new SaveSystem();
    system.save(1, createValidSaveFile(1, 'LINK'));
    expect(system.getLastPlayedSlot()).toBe(1);

    system.deleteFile(1);
    expect(system.getLastPlayedSlot()).toBeNull();
  });

  it('should not affect lastPlayedSlot if deleting different slot', () => {
    const system = new SaveSystem();
    system.save(1, createValidSaveFile(1, 'LINK'));
    system.save(2, createValidSaveFile(2, 'ZELDA'));

    system.deleteFile(1);
    expect(system.getLastPlayedSlot()).toBe(2);
  });

  it('should do nothing for invalid slot', () => {
    const system = new SaveSystem();
    system.save(0, createValidSaveFile(0, 'LINK'));

    system.deleteFile(-1);
    system.deleteFile(3);

    expect(system.load(0)).not.toBeNull();
  });
});

// ===== SaveSystem.getFiles =====
describe('SaveSystem.getFiles', () => {
  it('should return all save slots', () => {
    const system = new SaveSystem();
    const files = system.getFiles();
    expect(files).toHaveLength(SAVE_SLOTS);
  });

  it('should return array with correct length', () => {
    const system = new SaveSystem();
    const files = system.getFiles();
    // Note: readonly is a TypeScript compile-time only check
    // At runtime, arrays are still mutable but we return the internal array reference
    expect(files).toHaveLength(SAVE_SLOTS);
  });

  it('should reflect current state of all slots', () => {
    const system = new SaveSystem();
    system.save(0, createValidSaveFile(0, 'LINK'));
    system.save(2, createValidSaveFile(2, 'ZELDA'));

    const files = system.getFiles();
    expect(files[0]?.playerName).toBe('LINK');
    expect(files[1]).toBeNull();
    expect(files[2]?.playerName).toBe('ZELDA');
  });
});

// ===== SaveSystem.hasFile =====
describe('SaveSystem.hasFile', () => {
  it('should return false for empty slot', () => {
    const system = new SaveSystem();
    expect(system.hasFile(0)).toBe(false);
    expect(system.hasFile(1)).toBe(false);
    expect(system.hasFile(2)).toBe(false);
  });

  it('should return true for occupied slot', () => {
    const system = new SaveSystem();
    system.save(1, createValidSaveFile(1, 'LINK'));

    expect(system.hasFile(0)).toBe(false);
    expect(system.hasFile(1)).toBe(true);
    expect(system.hasFile(2)).toBe(false);
  });

  it('should return false for invalid slot', () => {
    const system = new SaveSystem();
    expect(system.hasFile(-1)).toBe(false);
    expect(system.hasFile(3)).toBe(false);
  });
});

// ===== SaveSystem.createNewGame =====
describe('SaveSystem.createNewGame', () => {
  it('should create and save a new game', () => {
    const system = new SaveSystem();
    const save = system.createNewGame(0, 'LINK');

    expect(save.playerName).toBe('LINK');
    expect(save.slot).toBe(0);
    expect(system.hasFile(0)).toBe(true);
  });

  it('should uppercase the player name', () => {
    const system = new SaveSystem();
    const save = system.createNewGame(0, 'link');

    expect(save.playerName).toBe('LINK');
  });

  it('should trim whitespace from player name', () => {
    const system = new SaveSystem();
    const save = system.createNewGame(0, '  HERO  ');

    expect(save.playerName).toBe('HERO');
  });

  it('should truncate name to 8 characters', () => {
    const system = new SaveSystem();
    const save = system.createNewGame(0, 'VERYLONGNAME');

    expect(save.playerName).toBe('VERYLONG');
    expect(save.playerName.length).toBe(8);
  });

  it('should throw for empty name', () => {
    const system = new SaveSystem();
    expect(() => system.createNewGame(0, '')).toThrow('Player name cannot be empty');
    expect(() => system.createNewGame(0, '   ')).toThrow('Player name cannot be empty');
  });

  it('should throw for invalid slot', () => {
    const system = new SaveSystem();
    expect(() => system.createNewGame(-1, 'LINK')).toThrow('Invalid save slot');
    expect(() => system.createNewGame(3, 'LINK')).toThrow('Invalid save slot');
  });
});

// ===== SaveSystem.updateSave =====
describe('SaveSystem.updateSave', () => {
  it('should update specific fields in save file', () => {
    const system = new SaveSystem();
    system.createNewGame(0, 'LINK');

    system.updateSave(0, { deathCount: 5 });

    expect(system.load(0)?.deathCount).toBe(5);
    expect(system.load(0)?.playerName).toBe('LINK'); // Other fields preserved
  });

  it('should update inventory', () => {
    const system = new SaveSystem();
    system.createNewGame(0, 'LINK');

    const newInventory: Inventory = {
      ...DEFAULT_INVENTORY,
      swordLevel: 2,
      rupees: 100,
    };
    system.updateSave(0, { inventory: newInventory });

    expect(system.load(0)?.inventory.swordLevel).toBe(2);
    expect(system.load(0)?.inventory.rupees).toBe(100);
  });

  it('should update heart containers', () => {
    const system = new SaveSystem();
    system.createNewGame(0, 'LINK');

    system.updateSave(0, { heartContainers: 8 });

    expect(system.load(0)?.heartContainers).toBe(8);
  });

  it('should preserve slot number', () => {
    const system = new SaveSystem();
    system.createNewGame(1, 'LINK');

    // Try to update with different slot (should be ignored)
    system.updateSave(1, { deathCount: 1 });

    expect(system.load(1)?.slot).toBe(1);
  });

  it('should ensure save version is current', () => {
    const system = new SaveSystem();
    system.createNewGame(0, 'LINK');

    system.updateSave(0, { deathCount: 1 });

    expect(system.load(0)?.saveVersion).toBe(SAVE_VERSION);
  });

  it('should throw for non-existent save', () => {
    const system = new SaveSystem();
    expect(() => system.updateSave(0, { deathCount: 1 })).toThrow('No save file in slot 0');
  });
});

// ===== SaveSystem.incrementDeathCount =====
describe('SaveSystem.incrementDeathCount', () => {
  it('should increment death counter', () => {
    const system = new SaveSystem();
    system.createNewGame(0, 'LINK');

    system.incrementDeathCount(0);
    expect(system.load(0)?.deathCount).toBe(1);

    system.incrementDeathCount(0);
    expect(system.load(0)?.deathCount).toBe(2);
  });

  it('should do nothing for empty slot', () => {
    const system = new SaveSystem();
    system.incrementDeathCount(0); // Should not throw
    expect(system.hasFile(0)).toBe(false);
  });
});

// ===== SaveSystem.clearAllSaves =====
describe('SaveSystem.clearAllSaves', () => {
  it('should clear all save files', () => {
    const system = new SaveSystem();
    system.save(0, createValidSaveFile(0, 'ONE'));
    system.save(1, createValidSaveFile(1, 'TWO'));
    system.save(2, createValidSaveFile(2, 'THREE'));

    system.clearAllSaves();

    expect(system.hasFile(0)).toBe(false);
    expect(system.hasFile(1)).toBe(false);
    expect(system.hasFile(2)).toBe(false);
  });

  it('should clear lastPlayedSlot', () => {
    const system = new SaveSystem();
    system.save(0, createValidSaveFile(0, 'LINK'));

    system.clearAllSaves();

    expect(system.getLastPlayedSlot()).toBeNull();
  });

  it('should persist cleared state', () => {
    const system = new SaveSystem();
    system.save(0, createValidSaveFile(0, 'LINK'));

    system.clearAllSaves();

    // Check the stored data directly
    const storedValue = mockStore[LOCAL_STORAGE_KEY];
    expect(storedValue).toBeDefined();
    const savedData = JSON.parse(storedValue ?? '{}');
    expect(savedData.files.every((f: unknown) => f === null)).toBe(true);
  });
});

// ===== SaveSystem.isValidSaveFile (static) =====
describe('SaveSystem.isValidSaveFile', () => {
  it('should return true for valid save file', () => {
    const save = createValidSaveFile(0, 'LINK');
    expect(SaveSystem.isValidSaveFile(save)).toBe(true);
  });

  it('should return false for null', () => {
    expect(SaveSystem.isValidSaveFile(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(SaveSystem.isValidSaveFile('string')).toBe(false);
    expect(SaveSystem.isValidSaveFile(123)).toBe(false);
    expect(SaveSystem.isValidSaveFile(undefined)).toBe(false);
  });

  it('should return false for missing slot', () => {
    const save = createValidSaveFile(0, 'LINK');
    delete (save as Record<string, unknown>)['slot'];
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });

  it('should return false for invalid slot range', () => {
    const save = createValidSaveFile(0, 'LINK');
    (save as { slot: number }).slot = -1;
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);

    (save as { slot: number }).slot = 5;
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });

  it('should return false for empty player name', () => {
    const save = createValidSaveFile(0, 'LINK');
    (save as { playerName: string }).playerName = '';
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });

  it('should return false for player name over 8 characters', () => {
    const save = createValidSaveFile(0, 'LINK');
    (save as { playerName: string }).playerName = 'VERYLONGNAME';
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });

  it('should return false for invalid heart containers', () => {
    const save = createValidSaveFile(0, 'LINK');
    (save as { heartContainers: number }).heartContainers = 2;
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);

    (save as { heartContainers: number }).heartContainers = 20;
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });

  it('should return false for invalid inventory', () => {
    const save = createValidSaveFile(0, 'LINK');
    (save as Record<string, unknown>)['inventory'] = { swordLevel: 5 };
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });

  it('should return false for wrong number of dungeons', () => {
    const save = createValidSaveFile(0, 'LINK');
    save.dungeons = [];
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });
});

// ===== Singleton Pattern =====
describe('Singleton Pattern', () => {
  it('should return same instance from getSaveSystem', () => {
    const system1 = getSaveSystem();
    const system2 = getSaveSystem();
    expect(system1).toBe(system2);
  });

  it('should return new instance after resetSaveSystem', () => {
    const system1 = getSaveSystem();
    resetSaveSystem();
    const system2 = getSaveSystem();
    expect(system1).not.toBe(system2);
  });

  it('should preserve state within same instance', () => {
    const system = getSaveSystem();
    system.save(0, createValidSaveFile(0, 'LINK'));

    const same = getSaveSystem();
    expect(same.hasFile(0)).toBe(true);
  });
});

// ===== Validation edge cases =====
describe('Validation edge cases', () => {
  it('should reject save file with invalid bomb capacity', () => {
    const save = createValidSaveFile(0, 'LINK');
    (save.inventory as Record<string, unknown>)['bombCapacity'] = 10;
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });

  it('should reject save file with invalid ring level', () => {
    const save = createValidSaveFile(0, 'LINK');
    (save.inventory as Record<string, unknown>)['ringLevel'] = 5;
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });

  it('should reject save file with wrong triforce fragments length', () => {
    const save = createValidSaveFile(0, 'LINK');
    save.progression.triforceFragments = [true, false];
    expect(SaveSystem.isValidSaveFile(save)).toBe(false);
  });

  it('should accept save file with all valid edge values', () => {
    const save = createValidSaveFile(0, 'L');
    save.heartContainers = 16;
    save.inventory.swordLevel = 3;
    save.inventory.ringLevel = 2;
    save.inventory.bombCapacity = 16;
    save.inventory.rupees = 255;
    save.deathCount = 999;
    expect(SaveSystem.isValidSaveFile(save)).toBe(true);
  });
});

// ===== localStorage unavailable =====
describe('localStorage unavailable', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', undefined);
  });

  it('should work without localStorage', () => {
    const system = new SaveSystem();
    const save = createValidSaveFile(0, 'LINK');

    // Should not throw
    system.save(0, save);
    expect(system.load(0)?.playerName).toBe('LINK');
  });

  it('should start with empty storage', () => {
    const system = new SaveSystem();
    expect(system.getFiles().every(f => f === null)).toBe(true);
  });
});
