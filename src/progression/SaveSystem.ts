// SaveSystem.ts - Save/Load system per spec section 5.17
// Manages localStorage persistence with 3 save slots and validation

import type {
  SaveFile,
  Inventory,
  DungeonProgress,
  OverworldProgress,
  ProgressionFlags,
} from '../types';
import {
  SAVE_SLOTS,
  SAVE_VERSION,
  LOCAL_STORAGE_KEY,
  STARTING_HEARTS,
} from '../constants';
import { DEFAULT_INVENTORY } from '../inventory/InventoryManager';

// ===== STORAGE INTERFACE =====
export interface SaveFileStorage {
  files: (SaveFile | null)[];
  lastPlayedSlot: number | null;
}

// ===== DEFAULT VALUES =====

/**
 * Create default progression flags for a new game
 */
export function createDefaultProgressionFlags(): ProgressionFlags {
  return {
    triforceCount: 0,
    triforceFragments: Array(8).fill(false) as boolean[],
    ganonDefeated: false,
    zeldaRescued: false,
    isSecondQuest: false,
    visitedDungeonEntrances: [],
    startingSwordCollected: false,
    whiteSwordCollected: false,
    magicalSwordCollected: false,
  };
}

/**
 * Create empty dungeon progress for a dungeon index
 */
export function createEmptyDungeonProgress(dungeonIndex: number): DungeonProgress {
  return {
    dungeonIndex,
    hasMap: false,
    hasCompass: false,
    bossDefeated: false,
    triforceCollected: false,
    dungeonItemCollected: false,
    rooms: [],
    lockedDoorsOpened: [],
  };
}

/**
 * Create default overworld progress for a new game
 */
export function createDefaultOverworldProgress(): OverworldProgress {
  return {
    visitedScreens: [],
    revealedSecrets: [],
    collectedItems: [],
  };
}

/**
 * Create a new save file with default values
 */
export function createNewSaveFile(slot: number, playerName: string): SaveFile {
  return {
    slot,
    playerName,
    deathCount: 0,
    isSecondQuest: false,
    heartContainers: STARTING_HEARTS,
    inventory: { ...DEFAULT_INVENTORY },
    dungeons: Array.from({ length: 9 }, (_, i) => createEmptyDungeonProgress(i)),
    overworld: createDefaultOverworldProgress(),
    progression: createDefaultProgressionFlags(),
    killCounter: 0,
    saveVersion: SAVE_VERSION,
  };
}

// ===== VALIDATION =====

/**
 * Validate that a value is a valid Inventory object
 */
function isValidInventory(inv: unknown): inv is Inventory {
  if (typeof inv !== 'object' || inv === null) return false;
  const obj = inv as Record<string, unknown>;

  // Check required fields exist with correct types
  if (typeof obj['swordLevel'] !== 'number') return false;
  if (obj['swordLevel'] < 0 || obj['swordLevel'] > 3) return false;
  if (typeof obj['hasBoomerang'] !== 'boolean') return false;
  if (typeof obj['hasBombs'] !== 'boolean') return false;
  if (typeof obj['bombCount'] !== 'number') return false;
  if (typeof obj['bombCapacity'] !== 'number') return false;
  if (![8, 12, 16].includes(obj['bombCapacity'] as number)) return false;
  if (typeof obj['hasBow'] !== 'boolean') return false;
  if (typeof obj['hasRecorder'] !== 'boolean') return false;
  if (typeof obj['hasFood'] !== 'boolean') return false;
  if (typeof obj['hasMagicRod'] !== 'boolean') return false;
  if (typeof obj['hasBook'] !== 'boolean') return false;
  if (typeof obj['ringLevel'] !== 'number') return false;
  if (obj['ringLevel'] < 0 || obj['ringLevel'] > 2) return false;
  if (typeof obj['hasPowerBracelet'] !== 'boolean') return false;
  if (typeof obj['hasLadder'] !== 'boolean') return false;
  if (typeof obj['hasRaft'] !== 'boolean') return false;
  if (typeof obj['hasMagicKey'] !== 'boolean') return false;
  if (typeof obj['rupees'] !== 'number') return false;
  if (typeof obj['keys'] !== 'number') return false;

  return true;
}

/**
 * Validate that a value is a valid ProgressionFlags object
 */
function isValidProgressionFlags(flags: unknown): flags is ProgressionFlags {
  if (typeof flags !== 'object' || flags === null) return false;
  const obj = flags as Record<string, unknown>;

  if (typeof obj['triforceCount'] !== 'number') return false;
  if (!Array.isArray(obj['triforceFragments'])) return false;
  if (obj['triforceFragments'].length !== 8) return false;
  if (typeof obj['ganonDefeated'] !== 'boolean') return false;
  if (typeof obj['zeldaRescued'] !== 'boolean') return false;
  if (typeof obj['isSecondQuest'] !== 'boolean') return false;
  if (!Array.isArray(obj['visitedDungeonEntrances'])) return false;
  if (typeof obj['startingSwordCollected'] !== 'boolean') return false;
  if (typeof obj['whiteSwordCollected'] !== 'boolean') return false;
  if (typeof obj['magicalSwordCollected'] !== 'boolean') return false;

  return true;
}

/**
 * Validate that a value is a valid DungeonProgress object
 */
function isValidDungeonProgress(progress: unknown): progress is DungeonProgress {
  if (typeof progress !== 'object' || progress === null) return false;
  const obj = progress as Record<string, unknown>;

  if (typeof obj['dungeonIndex'] !== 'number') return false;
  if (typeof obj['hasMap'] !== 'boolean') return false;
  if (typeof obj['hasCompass'] !== 'boolean') return false;
  if (typeof obj['bossDefeated'] !== 'boolean') return false;
  if (typeof obj['triforceCollected'] !== 'boolean') return false;
  if (typeof obj['dungeonItemCollected'] !== 'boolean') return false;
  if (!Array.isArray(obj['rooms'])) return false;
  if (!Array.isArray(obj['lockedDoorsOpened'])) return false;

  return true;
}

/**
 * Validate that a value is a valid OverworldProgress object
 */
function isValidOverworldProgress(progress: unknown): progress is OverworldProgress {
  if (typeof progress !== 'object' || progress === null) return false;
  const obj = progress as Record<string, unknown>;

  if (!Array.isArray(obj['visitedScreens'])) return false;
  if (!Array.isArray(obj['revealedSecrets'])) return false;
  if (!Array.isArray(obj['collectedItems'])) return false;

  return true;
}

/**
 * Validate that a value is a valid SaveFile object
 */
function isValidSaveFile(file: unknown): file is SaveFile {
  if (typeof file !== 'object' || file === null) return false;
  const obj = file as Record<string, unknown>;

  // Check basic fields
  if (typeof obj['slot'] !== 'number') return false;
  if (obj['slot'] < 0 || obj['slot'] >= SAVE_SLOTS) return false;
  if (typeof obj['playerName'] !== 'string') return false;
  if (obj['playerName'].length === 0 || obj['playerName'].length > 8) return false;
  if (typeof obj['deathCount'] !== 'number') return false;
  if (typeof obj['isSecondQuest'] !== 'boolean') return false;
  if (typeof obj['heartContainers'] !== 'number') return false;
  if (obj['heartContainers'] < 3 || obj['heartContainers'] > 16) return false;
  if (typeof obj['killCounter'] !== 'number') return false;
  if (typeof obj['saveVersion'] !== 'number') return false;

  // Check complex fields
  if (!isValidInventory(obj['inventory'])) return false;
  if (!isValidProgressionFlags(obj['progression'])) return false;
  if (!isValidOverworldProgress(obj['overworld'])) return false;

  // Check dungeons array
  if (!Array.isArray(obj['dungeons'])) return false;
  if (obj['dungeons'].length !== 9) return false;
  for (const dungeon of obj['dungeons']) {
    if (!isValidDungeonProgress(dungeon)) return false;
  }

  return true;
}

/**
 * Validate that a value is a valid SaveFileStorage object
 */
function isValidSaveFileStorage(data: unknown): data is SaveFileStorage {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  // Check files array
  if (!Array.isArray(obj['files'])) return false;
  if (obj['files'].length !== SAVE_SLOTS) return false;

  // Validate each file (can be null or valid SaveFile)
  for (const file of obj['files']) {
    if (file !== null && !isValidSaveFile(file)) return false;
  }

  // Check lastPlayedSlot
  if (obj['lastPlayedSlot'] !== null && typeof obj['lastPlayedSlot'] !== 'number') return false;
  if (typeof obj['lastPlayedSlot'] === 'number') {
    if (obj['lastPlayedSlot'] < 0 || obj['lastPlayedSlot'] >= SAVE_SLOTS) return false;
  }

  return true;
}

// ===== SAVE SYSTEM CLASS =====

export class SaveSystem {
  private storage: SaveFileStorage;

  constructor() {
    this.storage = this.loadFromStorage();
  }

  /**
   * Load storage from localStorage, returning empty storage on error
   */
  private loadFromStorage(): SaveFileStorage {
    // Check for browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return this.createEmptyStorage();
    }

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return this.createEmptyStorage();

      const parsed: unknown = JSON.parse(raw);
      if (isValidSaveFileStorage(parsed)) {
        // Handle version migration if needed
        return this.migrateStorage(parsed);
      }
    } catch {
      // Corrupted data - return empty storage
    }

    return this.createEmptyStorage();
  }

  /**
   * Create an empty storage object
   */
  private createEmptyStorage(): SaveFileStorage {
    const files: (SaveFile | null)[] = [];
    for (let i = 0; i < SAVE_SLOTS; i++) {
      files.push(null);
    }
    return { files, lastPlayedSlot: null };
  }

  /**
   * Migrate storage from older save versions if needed
   */
  private migrateStorage(storage: SaveFileStorage): SaveFileStorage {
    // Future version migrations would go here
    // For now, just return as-is
    return storage;
  }

  /**
   * Persist storage to localStorage
   */
  private persistStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.storage));
    } catch {
      // Storage full or unavailable - silently fail
      console.warn('Failed to persist save data to localStorage');
    }
  }

  /**
   * Save a game to a slot
   * @param slot The save slot (0-2)
   * @param saveFile The save file data
   */
  save(slot: number, saveFile: SaveFile): void {
    if (slot < 0 || slot >= SAVE_SLOTS) {
      throw new Error(`Invalid save slot: ${slot}`);
    }

    // Ensure save version is current and slot matches
    const fileToSave: SaveFile = {
      ...saveFile,
      slot,
      saveVersion: SAVE_VERSION,
    };

    this.storage.files[slot] = fileToSave;
    this.storage.lastPlayedSlot = slot;
    this.persistStorage();
  }

  /**
   * Load a save file from a slot
   * @param slot The save slot (0-2)
   * @returns The save file or null if empty/invalid
   */
  load(slot: number): SaveFile | null {
    if (slot < 0 || slot >= SAVE_SLOTS) {
      return null;
    }

    const file = this.storage.files[slot];
    return file ?? null;
  }

  /**
   * Delete a save file from a slot
   * @param slot The save slot (0-2)
   */
  deleteFile(slot: number): void {
    if (slot < 0 || slot >= SAVE_SLOTS) {
      return;
    }

    this.storage.files[slot] = null;

    // Clear lastPlayedSlot if it was this slot
    if (this.storage.lastPlayedSlot === slot) {
      this.storage.lastPlayedSlot = null;
    }

    this.persistStorage();
  }

  /**
   * Get all save files (for file select screen)
   * @returns Array of save files (null for empty slots)
   */
  getFiles(): readonly (SaveFile | null)[] {
    return this.storage.files;
  }

  /**
   * Get the last played slot
   * @returns The slot number or null if none
   */
  getLastPlayedSlot(): number | null {
    return this.storage.lastPlayedSlot;
  }

  /**
   * Check if a slot has a save file
   * @param slot The save slot (0-2)
   */
  hasFile(slot: number): boolean {
    if (slot < 0 || slot >= SAVE_SLOTS) {
      return false;
    }
    return this.storage.files[slot] !== null;
  }

  /**
   * Create and save a new game file
   * @param slot The save slot (0-2)
   * @param playerName The player name (1-8 characters)
   * @returns The new save file
   */
  createNewGame(slot: number, playerName: string): SaveFile {
    if (slot < 0 || slot >= SAVE_SLOTS) {
      throw new Error(`Invalid save slot: ${slot}`);
    }

    // Validate and sanitize player name
    const sanitizedName = playerName.trim().substring(0, 8).toUpperCase();
    if (sanitizedName.length === 0) {
      throw new Error('Player name cannot be empty');
    }

    const saveFile = createNewSaveFile(slot, sanitizedName);
    this.save(slot, saveFile);
    return saveFile;
  }

  /**
   * Update an existing save file (e.g., after collecting items, defeating bosses)
   * @param slot The save slot
   * @param updates Partial save file updates
   */
  updateSave(slot: number, updates: Partial<Omit<SaveFile, 'slot' | 'saveVersion'>>): void {
    const existing = this.load(slot);
    if (!existing) {
      throw new Error(`No save file in slot ${slot}`);
    }

    const updatedFile: SaveFile = {
      ...existing,
      ...updates,
      slot, // Ensure slot is preserved
      saveVersion: SAVE_VERSION, // Ensure version is current
    };

    this.save(slot, updatedFile);
  }

  /**
   * Increment death counter for a save file
   * @param slot The save slot
   */
  incrementDeathCount(slot: number): void {
    const existing = this.load(slot);
    if (!existing) return;

    this.updateSave(slot, { deathCount: existing.deathCount + 1 });
  }

  /**
   * Clear all save data (for testing or reset)
   */
  clearAllSaves(): void {
    this.storage = this.createEmptyStorage();
    this.persistStorage();
  }

  /**
   * Validate a save file
   * @param file The file to validate
   * @returns true if valid
   */
  static isValidSaveFile(file: unknown): file is SaveFile {
    return isValidSaveFile(file);
  }
}

// ===== SINGLETON =====
let saveSystemInstance: SaveSystem | null = null;

/**
 * Get the singleton SaveSystem instance
 */
export function getSaveSystem(): SaveSystem {
  if (!saveSystemInstance) {
    saveSystemInstance = new SaveSystem();
  }
  return saveSystemInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSaveSystem(): void {
  saveSystemInstance = null;
}
