// InventoryManager.ts - Inventory system per spec section 5.16
// Manages all player inventory items, currencies, and B-item selection

import type {
  Inventory,
  BItemSlot,
  SaveFile,
} from '../types';
import {
  MAX_RUPEES,
  MAX_KEYS,
  MAX_HEARTS,
} from '../constants';

// ===== MAJOR ITEMS =====
// Items that can be collected once and are tracked in inventory
export type MajorItem =
  | 'BOOMERANG'
  | 'MAGIC_BOOMERANG'
  | 'BOW'
  | 'ARROW'
  | 'SILVER_ARROW'
  | 'BLUE_CANDLE'
  | 'RED_CANDLE'
  | 'RECORDER'
  | 'FOOD'
  | 'LETTER'
  | 'POTION'
  | 'POTION_2'
  | 'MAGIC_ROD'
  | 'BOOK_OF_MAGIC'
  | 'BLUE_RING'
  | 'RED_RING'
  | 'POWER_BRACELET'
  | 'STANDARD_SHIELD'
  | 'MAGIC_SHIELD'
  | 'LADDER'
  | 'RAFT'
  | 'MAGIC_KEY'
  | 'WOODEN_SWORD'
  | 'WHITE_SWORD'
  | 'MAGICAL_SWORD';

// ===== DEFAULT INVENTORY =====
// Starting inventory for a new game
export const DEFAULT_INVENTORY: Inventory = {
  swordLevel: 0,
  hasBoomerang: false,
  boomerangType: false,
  hasBombs: false,
  bombCount: 0,
  bombCapacity: 8,
  hasBow: false,
  arrowType: false,
  candleType: false,
  hasRecorder: false,
  hasFood: false,
  potionState: false,
  hasMagicRod: false,
  hasBook: false,
  ringLevel: 0,
  hasPowerBracelet: false,
  shieldType: false,
  hasLadder: false,
  hasRaft: false,
  hasMagicKey: false,
  rupees: 0,
  keys: 0,
  selectedBItem: null,
};

// ===== INVENTORY MANAGER =====
export class InventoryManager {
  private inventory: Inventory;
  private heartContainers: number;
  private currentHP: number;

  constructor() {
    this.inventory = { ...DEFAULT_INVENTORY };
    this.heartContainers = 3; // Starting heart containers (3 hearts)
    this.currentHP = 6; // 3 hearts * 2 half-hearts
  }

  /**
   * Load inventory from a save file
   */
  loadFromSave(save: SaveFile): void {
    this.inventory = { ...save.inventory };
    this.heartContainers = save.heartContainers;
    // Note: currentHP is typically restored to a fixed amount on continue (6 half-hearts = 3 hearts)
    // The calling code should handle this via setCurrentHP or continue logic
  }

  /**
   * Get a read-only snapshot of the current inventory
   */
  getInventory(): Readonly<Inventory> {
    return this.inventory;
  }

  /**
   * Get the number of heart containers
   */
  getHeartContainers(): number {
    return this.heartContainers;
  }

  /**
   * Get the maximum HP (heart containers * 2)
   */
  getMaxHP(): number {
    return this.heartContainers * 2;
  }

  /**
   * Get current HP in half-hearts
   */
  getCurrentHP(): number {
    return this.currentHP;
  }

  /**
   * Set current HP (clamped to 0 - maxHP)
   */
  setCurrentHP(hp: number): void {
    this.currentHP = Math.max(0, Math.min(this.getMaxHP(), hp));
  }

  /**
   * Add a major item to inventory
   */
  addItem(item: MajorItem): void {
    switch (item) {
      case 'BOOMERANG':
        this.inventory.hasBoomerang = true;
        this.inventory.boomerangType = 'wood';
        break;
      case 'MAGIC_BOOMERANG':
        this.inventory.hasBoomerang = true;
        this.inventory.boomerangType = 'magic';
        break;
      case 'BOW':
        this.inventory.hasBow = true;
        break;
      case 'ARROW':
        this.inventory.hasBow = true;
        this.inventory.arrowType = 'wood';
        break;
      case 'SILVER_ARROW':
        this.inventory.arrowType = 'silver';
        break;
      case 'BLUE_CANDLE':
        this.inventory.candleType = 'blue';
        break;
      case 'RED_CANDLE':
        this.inventory.candleType = 'red';
        break;
      case 'RECORDER':
        this.inventory.hasRecorder = true;
        break;
      case 'FOOD':
        this.inventory.hasFood = true;
        break;
      case 'LETTER':
        this.inventory.potionState = 'letter';
        break;
      case 'POTION':
        this.inventory.potionState = 'potion1';
        break;
      case 'POTION_2':
        this.inventory.potionState = 'potion2';
        break;
      case 'MAGIC_ROD':
        this.inventory.hasMagicRod = true;
        break;
      case 'BOOK_OF_MAGIC':
        this.inventory.hasBook = true;
        break;
      case 'BLUE_RING':
        this.inventory.ringLevel = 1;
        break;
      case 'RED_RING':
        this.inventory.ringLevel = 2;
        break;
      case 'POWER_BRACELET':
        this.inventory.hasPowerBracelet = true;
        break;
      case 'STANDARD_SHIELD':
        this.inventory.shieldType = 'standard';
        break;
      case 'MAGIC_SHIELD':
        this.inventory.shieldType = 'magic';
        break;
      case 'LADDER':
        this.inventory.hasLadder = true;
        break;
      case 'RAFT':
        this.inventory.hasRaft = true;
        break;
      case 'MAGIC_KEY':
        this.inventory.hasMagicKey = true;
        break;
      case 'WOODEN_SWORD':
        this.inventory.swordLevel = 1;
        break;
      case 'WHITE_SWORD':
        this.inventory.swordLevel = 2;
        break;
      case 'MAGICAL_SWORD':
        this.inventory.swordLevel = 3;
        break;
    }
  }

  /**
   * Add rupees (capped at MAX_RUPEES = 255)
   */
  addRupees(count: number): void {
    this.inventory.rupees = Math.min(MAX_RUPEES, this.inventory.rupees + count);
  }

  /**
   * Spend rupees if sufficient funds available
   * @returns true if purchase succeeded, false if insufficient rupees
   */
  spendRupees(cost: number): boolean {
    if (this.inventory.rupees < cost) return false;
    this.inventory.rupees -= cost;
    return true;
  }

  /**
   * Get current rupee count
   */
  getRupees(): number {
    return this.inventory.rupees;
  }

  /**
   * Add a key (capped at MAX_KEYS = 255)
   */
  addKey(): void {
    this.inventory.keys = Math.min(MAX_KEYS, this.inventory.keys + 1);
  }

  /**
   * Use a key to open a locked door
   * Magic Key is infinite, otherwise consumes a key
   * @returns true if door can be opened, false if no keys
   */
  useKey(): boolean {
    if (this.inventory.hasMagicKey) return true;
    if (this.inventory.keys <= 0) return false;
    this.inventory.keys--;
    return true;
  }

  /**
   * Get current key count
   */
  getKeys(): number {
    return this.inventory.keys;
  }

  /**
   * Check if player has magic key
   */
  hasMagicKey(): boolean {
    return this.inventory.hasMagicKey;
  }

  /**
   * Add a bomb (first bomb also enables bombs)
   */
  addBomb(): void {
    if (!this.inventory.hasBombs) {
      this.inventory.hasBombs = true;
    }
    this.inventory.bombCount = Math.min(this.inventory.bombCapacity, this.inventory.bombCount + 1);
  }

  /**
   * Use a bomb if available
   * @returns true if bomb was used, false if none available
   */
  useBomb(): boolean {
    if (this.inventory.bombCount <= 0) return false;
    this.inventory.bombCount--;
    return true;
  }

  /**
   * Get current bomb count
   */
  getBombs(): number {
    return this.inventory.bombCount;
  }

  /**
   * Upgrade bomb capacity (8 -> 12 -> 16)
   */
  upgradeBombCapacity(): void {
    if (this.inventory.bombCapacity === 8) {
      this.inventory.bombCapacity = 12;
    } else if (this.inventory.bombCapacity === 12) {
      this.inventory.bombCapacity = 16;
    }
    // Already at 16, no further upgrade
  }

  /**
   * Get bomb capacity
   */
  getBombCapacity(): number {
    return this.inventory.bombCapacity;
  }

  /**
   * Add a heart container (max 16)
   * Also fills HP to max
   */
  addHeartContainer(): void {
    if (this.heartContainers >= MAX_HEARTS) return;
    this.heartContainers++;
    // Heart containers also restore HP to full
    this.currentHP = this.getMaxHP();
  }

  /**
   * Heal HP by specified half-hearts
   * @param halfHearts Number of half-hearts to restore
   */
  heal(halfHearts: number): void {
    this.currentHP = Math.min(this.getMaxHP(), this.currentHP + halfHearts);
  }

  /**
   * Take damage (reduce HP)
   * @param halfHearts Damage in half-hearts
   * @returns true if player is still alive, false if dead
   */
  takeDamage(halfHearts: number): boolean {
    // Apply ring damage reduction
    const reduction = this.getDamageReduction();
    const actualDamage = Math.max(1, Math.floor(halfHearts * reduction));
    this.currentHP = Math.max(0, this.currentHP - actualDamage);
    return this.currentHP > 0;
  }

  /**
   * Get damage reduction multiplier based on ring level
   * 0 = no ring (1.0x)
   * 1 = blue ring (0.5x)
   * 2 = red ring (0.25x)
   */
  getDamageReduction(): number {
    switch (this.inventory.ringLevel) {
      case 1:
        return 0.5;
      case 2:
        return 0.25;
      default:
        return 1;
    }
  }

  /**
   * Check if player is at full HP
   */
  isAtFullHP(): boolean {
    return this.currentHP >= this.getMaxHP();
  }

  /**
   * Get the currently selected B-item
   */
  getSelectedBItem(): BItemSlot | null {
    return this.inventory.selectedBItem;
  }

  /**
   * Set the selected B-item
   */
  setSelectedBItem(item: BItemSlot | null): void {
    this.inventory.selectedBItem = item;
  }

  /**
   * Get list of available B-items that player owns
   */
  getAvailableBItems(): BItemSlot[] {
    const items: BItemSlot[] = [];
    if (this.inventory.hasBoomerang) items.push('BOOMERANG');
    if (this.inventory.hasBombs && this.inventory.bombCount > 0) items.push('BOMB');
    if (this.inventory.hasBow && this.inventory.arrowType) items.push('BOW_ARROW');
    if (this.inventory.candleType) items.push('CANDLE');
    if (this.inventory.hasRecorder) items.push('RECORDER');
    if (this.inventory.hasFood) items.push('FOOD');
    if (this.inventory.potionState === 'potion1' || this.inventory.potionState === 'potion2') items.push('POTION');
    if (this.inventory.hasMagicRod) items.push('MAGIC_ROD');
    return items;
  }

  /**
   * Check if player can use the currently selected B-item
   */
  canUseBItem(): boolean {
    const item = this.inventory.selectedBItem;
    if (!item) return false;

    switch (item) {
      case 'BOOMERANG':
        return this.inventory.hasBoomerang;
      case 'BOMB':
        return this.inventory.bombCount > 0;
      case 'BOW_ARROW':
        return this.inventory.hasBow && !!this.inventory.arrowType;
      case 'CANDLE':
        return !!this.inventory.candleType;
      case 'RECORDER':
        return this.inventory.hasRecorder;
      case 'FOOD':
        return this.inventory.hasFood;
      case 'POTION':
        return this.inventory.potionState === 'potion1' || this.inventory.potionState === 'potion2';
      case 'MAGIC_ROD':
        return this.inventory.hasMagicRod;
      default:
        return false;
    }
  }

  /**
   * Get sword level (0 = none, 1 = wooden, 2 = white, 3 = magical)
   */
  getSwordLevel(): 0 | 1 | 2 | 3 {
    return this.inventory.swordLevel;
  }

  /**
   * Check if player has a sword
   */
  hasSword(): boolean {
    return this.inventory.swordLevel > 0;
  }

  /**
   * Reset inventory to default state (for new game)
   */
  reset(): void {
    this.inventory = { ...DEFAULT_INVENTORY };
    this.heartContainers = 3;
    this.currentHP = 6;
  }

  /**
   * Create a copy of inventory for saving
   */
  toSaveData(): { inventory: Inventory; heartContainers: number } {
    return {
      inventory: { ...this.inventory },
      heartContainers: this.heartContainers,
    };
  }
}

// ===== SINGLETON =====
let inventoryManagerInstance: InventoryManager | null = null;

/**
 * Get the singleton inventory manager instance
 */
export function getInventoryManager(): InventoryManager {
  if (!inventoryManagerInstance) {
    inventoryManagerInstance = new InventoryManager();
  }
  return inventoryManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetInventoryManager(): void {
  inventoryManagerInstance = null;
}
