// inventory module barrel export
export {
  InventoryManager,
  getInventoryManager,
  resetInventoryManager,
  DEFAULT_INVENTORY,
  type MajorItem,
} from './InventoryManager';

export {
  useBItem,
  canUseBItem,
  type ItemUseResult,
  type ItemUseContext,
} from './ItemEffects';
