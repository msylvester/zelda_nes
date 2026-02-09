// World module exports
export { TileMap } from './TileMap';
export { WorldManager } from './WorldManager';
export type { ScreenTransitionInfo, WorldScreenData } from './WorldManager';
export {
  ScreenTransition,
  getScreenTransition,
  resetScreenTransition,
} from './ScreenTransition';
export type {
  ScreenTransitionType,
  TransitionConfig,
  TransitionState,
  ScrollOffset,
  PlayerPositionAfterTransition,
} from './ScreenTransition';
export {
  DungeonManager,
  getDungeonManager,
  resetDungeonManager,
} from './DungeonManager';
export type {
  DungeonTransitionInfo,
  RuntimeDoorState,
  DoorPosition,
  DungeonProgressState,
} from './DungeonManager';
export {
  CaveManager,
  getCaveManager,
  resetCaveManager,
} from './CaveManager';
export type {
  CaveShopDisplay,
  NpcInteractionState,
  ShopPurchaseResult,
} from './CaveManager';
export {
  TILE_IDS,
  TILE_COLLISION_MAP,
  makeTile,
  TEST_SCREEN_TILES,
  TEST_SCREEN_2_TILES,
  TEST_SCREEN_3_TILES,
  createEmptyScreen,
  createOpenScreen,
  validateTileData,
} from './TestScreenData';
