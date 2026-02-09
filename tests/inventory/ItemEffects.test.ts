// ItemEffects.test.ts - Tests for B-item use logic

import { describe, it, expect, beforeEach } from 'vitest';
import {
  useBItem,
  canUseBItem,
  type ItemUseContext,
} from '../../src/inventory/ItemEffects';
import {
  InventoryManager,
  resetInventoryManager,
} from '../../src/inventory/InventoryManager';

describe('ItemEffects', () => {
  let inventoryManager: InventoryManager;

  beforeEach(() => {
    resetInventoryManager();
    inventoryManager = new InventoryManager();
  });

  describe('useBItem - BOOMERANG', () => {
    it('should return success when using boomerang', () => {
      inventoryManager.addItem('BOOMERANG');

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'RIGHT',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOOMERANG', context);

      expect(result.success).toBe(true);
      expect(result.consumed).toBe(false);
      expect(result.spawnProjectile?.type).toBe('BOOMERANG');
    });

    it('should fail when player has no boomerang', () => {
      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'RIGHT',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOOMERANG', context);

      expect(result.success).toBe(false);
    });

    it('should fail when boomerang already active', () => {
      inventoryManager.addItem('BOOMERANG');

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'RIGHT',
        canSpawnProjectile: false, // Already active
        inventoryManager,
      };

      const result = useBItem('BOOMERANG', context);

      expect(result.success).toBe(false);
    });

    it('should return spawn info with correct position', () => {
      inventoryManager.addItem('BOOMERANG');

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'RIGHT',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOOMERANG', context);

      expect(result.spawnProjectile?.x).toBeGreaterThan(100); // Spawns ahead
      expect(result.spawnProjectile?.direction).toBe('RIGHT');
    });

    it('should indicate magic boomerang when player has it', () => {
      inventoryManager.addItem('MAGIC_BOOMERANG');

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'UP',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOOMERANG', context);

      expect(result.success).toBe(true);
      expect(result.spawnProjectile?.isMagic).toBe(true);
    });
  });

  describe('useBItem - BOMB', () => {
    it('should return success when using bomb', () => {
      inventoryManager.addBomb();

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'DOWN',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOMB', context);

      expect(result.success).toBe(true);
      expect(result.consumed).toBe(true);
      expect(result.spawnProjectile?.type).toBe('BOMB');
    });

    it('should fail when no bombs available', () => {
      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'DOWN',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOMB', context);

      expect(result.success).toBe(false);
    });

    it('should decrement bomb count on use', () => {
      inventoryManager.addBomb();
      inventoryManager.addBomb();
      expect(inventoryManager.getBombs()).toBe(2);

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'DOWN',
        canSpawnProjectile: true,
        inventoryManager,
      };

      useBItem('BOMB', context);

      expect(inventoryManager.getBombs()).toBe(1);
    });
  });

  describe('useBItem - BOW_ARROW', () => {
    it('should return success when using bow with arrows and rupees', () => {
      inventoryManager.addItem('ARROW');
      inventoryManager.addRupees(10);

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'LEFT',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOW_ARROW', context);

      expect(result.success).toBe(true);
      expect(result.consumed).toBe(true);
      expect(result.spawnProjectile?.type).toBe('ARROW');
    });

    it('should fail when no rupees', () => {
      inventoryManager.addItem('ARROW');
      // No rupees

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'LEFT',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOW_ARROW', context);

      expect(result.success).toBe(false);
    });

    it('should fail when no arrows', () => {
      inventoryManager.addItem('BOW');
      inventoryManager.addRupees(10);

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'LEFT',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOW_ARROW', context);

      expect(result.success).toBe(false);
    });

    it('should spend 1 rupee on use', () => {
      inventoryManager.addItem('ARROW');
      inventoryManager.addRupees(5);

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'LEFT',
        canSpawnProjectile: true,
        inventoryManager,
      };

      useBItem('BOW_ARROW', context);

      expect(inventoryManager.getRupees()).toBe(4);
    });
  });

  describe('useBItem - CANDLE', () => {
    it('should return success when using candle', () => {
      inventoryManager.addItem('BLUE_CANDLE');

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'UP',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('CANDLE', context);

      expect(result.success).toBe(true);
      expect(result.consumed).toBe(false);
      expect(result.spawnProjectile?.type).toBe('CANDLE_FLAME');
    });

    it('should fail when no candle', () => {
      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'UP',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('CANDLE', context);

      expect(result.success).toBe(false);
    });
  });

  describe('useBItem - POTION', () => {
    it('should heal player when using potion', () => {
      inventoryManager.addItem('POTION');
      inventoryManager.setCurrentHP(2);

      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'DOWN',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('POTION', context);

      expect(result.success).toBe(true);
      expect(result.consumed).toBe(true);
      expect(inventoryManager.getCurrentHP()).toBe(inventoryManager.getMaxHP());
    });

    it('should fail when no potion', () => {
      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'DOWN',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('POTION', context);

      expect(result.success).toBe(false);
    });
  });

  describe('canUseBItem', () => {
    it('should return true for boomerang when owned and no active projectile', () => {
      inventoryManager.addItem('BOOMERANG');
      expect(canUseBItem('BOOMERANG', inventoryManager, false)).toBe(true);
    });

    it('should return false for boomerang when active projectile exists', () => {
      inventoryManager.addItem('BOOMERANG');
      expect(canUseBItem('BOOMERANG', inventoryManager, true)).toBe(false);
    });

    it('should return true for bomb when bombs available', () => {
      inventoryManager.addBomb();
      expect(canUseBItem('BOMB', inventoryManager, false)).toBe(true);
    });

    it('should return false for bomb when no bombs', () => {
      expect(canUseBItem('BOMB', inventoryManager, false)).toBe(false);
    });

    it('should return true for bow when bow, arrows, and rupees available', () => {
      inventoryManager.addItem('ARROW');
      inventoryManager.addRupees(5);
      expect(canUseBItem('BOW_ARROW', inventoryManager, false)).toBe(true);
    });

    it('should return false for bow when no rupees', () => {
      inventoryManager.addItem('ARROW');
      expect(canUseBItem('BOW_ARROW', inventoryManager, false)).toBe(false);
    });

    it('should return true for candle when owned', () => {
      inventoryManager.addItem('BLUE_CANDLE');
      expect(canUseBItem('CANDLE', inventoryManager, false)).toBe(true);
    });

    it('should return true for potion when owned', () => {
      inventoryManager.addItem('POTION');
      expect(canUseBItem('POTION', inventoryManager, false)).toBe(true);
    });

    it('should return true for magic rod when owned', () => {
      inventoryManager.addItem('MAGIC_ROD');
      expect(canUseBItem('MAGIC_ROD', inventoryManager, false)).toBe(true);
    });
  });

  describe('spawn positions', () => {
    beforeEach(() => {
      inventoryManager.addItem('BOOMERANG');
    });

    it('should spawn projectile to the right for RIGHT direction', () => {
      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'RIGHT',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOOMERANG', context);

      expect(result.spawnProjectile?.x).toBeGreaterThan(100);
      expect(result.spawnProjectile?.y).toBeCloseTo(104);
    });

    it('should spawn projectile to the left for LEFT direction', () => {
      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'LEFT',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOOMERANG', context);

      expect(result.spawnProjectile?.x).toBeLessThan(100);
    });

    it('should spawn projectile above for UP direction', () => {
      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'UP',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOOMERANG', context);

      expect(result.spawnProjectile?.y).toBeLessThan(100);
    });

    it('should spawn projectile below for DOWN direction', () => {
      const context: ItemUseContext = {
        playerX: 100,
        playerY: 100,
        playerDirection: 'DOWN',
        canSpawnProjectile: true,
        inventoryManager,
      };

      const result = useBItem('BOOMERANG', context);

      expect(result.spawnProjectile?.y).toBeGreaterThan(100);
    });
  });
});
