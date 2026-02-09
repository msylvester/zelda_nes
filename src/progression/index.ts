// Progression module barrel export
export {
  SaveSystem,
  getSaveSystem,
  resetSaveSystem,
  createNewSaveFile,
  createDefaultProgressionFlags,
  createEmptyDungeonProgress,
  createDefaultOverworldProgress,
  type SaveFileStorage,
} from './SaveSystem';

export {
  ProgressionManager,
  getProgressionManager,
  resetProgressionManager,
  type TriforceCollectedEvent,
  type DungeonCompletionStatus,
} from './ProgressionManager';
