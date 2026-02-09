// ProgressionManager.ts - Tracks Triforce pieces and overall game progression
// Per spec section 5.17 and IMPL-035 acceptance criteria

import type { ProgressionFlags, SaveFile } from '../types';
import { getDungeonManager } from '../world/DungeonManager';
import { createDefaultProgressionFlags } from './SaveSystem';

/**
 * Triforce collection event data
 */
export interface TriforceCollectedEvent {
  dungeonId: number;
  totalPieces: number;
  isComplete: boolean;
}

/**
 * Dungeon completion status
 */
export interface DungeonCompletionStatus {
  dungeonId: number;
  triforceCollected: boolean;
  bossDefeated: boolean;
  hasMap: boolean;
  hasCompass: boolean;
  isComplete: boolean;
}

/**
 * ProgressionManager - Tracks Triforce collection and game progression
 *
 * This class provides a clean API for:
 * - Tracking Triforce pieces collected per dungeon
 * - Marking dungeons as complete
 * - Checking game win conditions
 * - Integration with save system
 */
export class ProgressionManager {
  private flags: ProgressionFlags;

  constructor() {
    this.flags = createDefaultProgressionFlags();
  }

  /**
   * Reset all progression to default state
   */
  reset(): void {
    this.flags = createDefaultProgressionFlags();
  }

  // ===== TRIFORCE TRACKING =====

  /**
   * Get total Triforce pieces collected
   * Counts from dungeons 1-8
   */
  getTriforceCount(): number {
    const dungeonManager = getDungeonManager();
    let count = 0;

    for (let i = 1; i <= 8; i++) {
      const progress = dungeonManager.getDungeonProgress(i);
      if (progress?.triforceCollected) {
        count++;
      }
    }

    // Also check our local flags for consistency
    this.flags.triforceCount = count;
    return count;
  }

  /**
   * Check if a specific dungeon's Triforce has been collected
   */
  hasTriforceFromDungeon(dungeonId: number): boolean {
    if (dungeonId < 1 || dungeonId > 8) return false;

    const dungeonManager = getDungeonManager();
    const progress = dungeonManager.getDungeonProgress(dungeonId);
    return progress?.triforceCollected ?? false;
  }

  /**
   * Mark a Triforce piece as collected for a dungeon
   * This is typically called via DungeonManager.collectDungeonItem('TRIFORCE_PIECE')
   * but can be called directly for save/load
   */
  collectTriforce(dungeonId: number): TriforceCollectedEvent {
    if (dungeonId < 1 || dungeonId > 8) {
      throw new Error(`Invalid dungeon ID: ${dungeonId}`);
    }

    // Mark in our flags
    const index = dungeonId - 1;
    this.flags.triforceFragments[index] = true;
    this.flags.triforceCount = this.getTriforceCount();

    const totalPieces = this.flags.triforceCount;
    const isComplete = totalPieces >= 8;

    console.log(`Triforce piece collected from dungeon ${dungeonId}. Total: ${totalPieces}/8`);

    return {
      dungeonId,
      totalPieces,
      isComplete,
    };
  }

  /**
   * Get array of Triforce pieces (true = collected)
   */
  getTriforceFragments(): readonly boolean[] {
    // Sync with dungeon manager state
    const dungeonManager = getDungeonManager();
    for (let i = 1; i <= 8; i++) {
      const progress = dungeonManager.getDungeonProgress(i);
      this.flags.triforceFragments[i - 1] = progress?.triforceCollected ?? false;
    }
    return this.flags.triforceFragments;
  }

  /**
   * Check if all Triforce pieces are collected
   */
  isTriforceComplete(): boolean {
    return this.getTriforceCount() >= 8;
  }

  // ===== DUNGEON COMPLETION =====

  /**
   * Get completion status for a dungeon
   */
  getDungeonStatus(dungeonId: number): DungeonCompletionStatus | null {
    if (dungeonId < 1 || dungeonId > 8) return null;

    const dungeonManager = getDungeonManager();
    const progress = dungeonManager.getDungeonProgress(dungeonId);

    if (!progress) {
      return {
        dungeonId,
        triforceCollected: false,
        bossDefeated: false,
        hasMap: false,
        hasCompass: false,
        isComplete: false,
      };
    }

    return {
      dungeonId,
      triforceCollected: progress.triforceCollected,
      bossDefeated: progress.bossDefeated,
      hasMap: progress.hasMap,
      hasCompass: progress.hasCompass,
      isComplete: progress.triforceCollected,
    };
  }

  /**
   * Check if a dungeon is complete (Triforce collected)
   */
  isDungeonComplete(dungeonId: number): boolean {
    return this.hasTriforceFromDungeon(dungeonId);
  }

  /**
   * Get list of completed dungeon IDs
   */
  getCompletedDungeons(): number[] {
    const completed: number[] = [];
    for (let i = 1; i <= 8; i++) {
      if (this.isDungeonComplete(i)) {
        completed.push(i);
      }
    }
    return completed;
  }

  // ===== GAME WIN CONDITION =====

  /**
   * Check if player can access Dungeon 9 (all 8 Triforce pieces)
   */
  canAccessDungeon9(): boolean {
    return this.isTriforceComplete();
  }

  /**
   * Check if Ganon has been defeated
   */
  isGanonDefeated(): boolean {
    return this.flags.ganonDefeated;
  }

  /**
   * Mark Ganon as defeated
   */
  defeatGanon(): void {
    this.flags.ganonDefeated = true;
    console.log('Ganon has been defeated!');
  }

  /**
   * Check if Zelda has been rescued (game complete)
   */
  isZeldaRescued(): boolean {
    return this.flags.zeldaRescued;
  }

  /**
   * Rescue Zelda (game complete)
   */
  rescueZelda(): void {
    this.flags.zeldaRescued = true;
    console.log('Zelda has been rescued! Game complete!');
  }

  /**
   * Check if game is complete
   */
  isGameComplete(): boolean {
    return this.flags.zeldaRescued;
  }

  // ===== SWORD TRACKING =====

  /**
   * Check if starting sword has been collected
   */
  hasStartingSword(): boolean {
    return this.flags.startingSwordCollected;
  }

  /**
   * Mark starting sword as collected
   */
  collectStartingSword(): void {
    this.flags.startingSwordCollected = true;
  }

  /**
   * Check if white sword has been collected
   */
  hasWhiteSword(): boolean {
    return this.flags.whiteSwordCollected;
  }

  /**
   * Mark white sword as collected
   */
  collectWhiteSword(): void {
    this.flags.whiteSwordCollected = true;
  }

  /**
   * Check if magical sword has been collected
   */
  hasMagicalSword(): boolean {
    return this.flags.magicalSwordCollected;
  }

  /**
   * Mark magical sword as collected
   */
  collectMagicalSword(): void {
    this.flags.magicalSwordCollected = true;
  }

  // ===== DUNGEON ENTRANCE TRACKING =====

  /**
   * Mark a dungeon entrance as visited
   */
  visitDungeonEntrance(dungeonId: number): void {
    if (!this.flags.visitedDungeonEntrances.includes(dungeonId)) {
      this.flags.visitedDungeonEntrances.push(dungeonId);
    }
  }

  /**
   * Check if a dungeon entrance has been visited
   */
  hasVisitedDungeonEntrance(dungeonId: number): boolean {
    return this.flags.visitedDungeonEntrances.includes(dungeonId);
  }

  /**
   * Get all visited dungeon entrances
   */
  getVisitedDungeonEntrances(): readonly number[] {
    return this.flags.visitedDungeonEntrances;
  }

  // ===== SECOND QUEST =====

  /**
   * Check if playing second quest
   */
  isSecondQuest(): boolean {
    return this.flags.isSecondQuest;
  }

  /**
   * Start second quest
   */
  startSecondQuest(): void {
    this.flags.isSecondQuest = true;
  }

  // ===== SAVE/LOAD =====

  /**
   * Get current progression flags for saving
   */
  getProgressionFlags(): ProgressionFlags {
    // Sync triforce count before returning
    this.getTriforceCount();
    return { ...this.flags };
  }

  /**
   * Load progression from save file
   */
  loadFromSave(saveFile: SaveFile): void {
    this.flags = { ...saveFile.progression };
  }

  /**
   * Load just progression flags (for partial load)
   */
  loadProgressionFlags(flags: ProgressionFlags): void {
    this.flags = { ...flags };
  }

  /**
   * Export progression for save file
   */
  toSaveData(): ProgressionFlags {
    return this.getProgressionFlags();
  }
}

// ===== SINGLETON =====

let progressionManagerInstance: ProgressionManager | null = null;

/**
 * Get the singleton ProgressionManager instance
 */
export function getProgressionManager(): ProgressionManager {
  if (!progressionManagerInstance) {
    progressionManagerInstance = new ProgressionManager();
  }
  return progressionManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetProgressionManager(): void {
  if (progressionManagerInstance) {
    progressionManagerInstance.reset();
  }
  progressionManagerInstance = null;
}
