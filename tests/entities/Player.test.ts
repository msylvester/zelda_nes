// tests/entities/Player.test.ts - Tests for Player entity

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Player,
  TileCollisionChecker,
  getPlayer,
  resetPlayer,
} from '../../src/entities/Player';
import { resetEntityIdCounter } from '../../src/entities/Entity';
import { InputSnapshot, Direction, ButtonState, NesButton } from '../../src/types';
import {
  PLAYER_HITBOX_WIDTH,
  PLAYER_HITBOX_HEIGHT,
  PLAYER_HITBOX_OFFSET_X,
  PLAYER_HITBOX_OFFSET_Y,
  PLAYER_SPRITE_WIDTH,
  PLAYER_SPRITE_HEIGHT,
  KNOCKBACK_FRAMES,
  INVINCIBILITY_FRAMES,
  STARTING_HP,
  SUBPIXEL_SCALE,
} from '../../src/constants';

// Helper to create mock input snapshot
function createMockInput(overrides: Partial<InputSnapshot> = {}): InputSnapshot {
  const defaultButtonState: ButtonState = { held: false, justPressed: false, justReleased: false };
  return {
    buttons: {
      UP: { ...defaultButtonState },
      DOWN: { ...defaultButtonState },
      LEFT: { ...defaultButtonState },
      RIGHT: { ...defaultButtonState },
      A: { ...defaultButtonState },
      B: { ...defaultButtonState },
      START: { ...defaultButtonState },
      SELECT: { ...defaultButtonState },
    },
    activeDirection: null,
    facingDirection: 'DOWN',
    frameNumber: 0,
    ...overrides,
  };
}

// Helper to create input with direction
function createDirectionInput(direction: Direction): InputSnapshot {
  return createMockInput({ activeDirection: direction });
}

describe('Player', () => {
  let player: Player;

  beforeEach(() => {
    resetEntityIdCounter();
    player = new Player(100, 80);
  });

  describe('constructor', () => {
    it('should initialize at given position', () => {
      expect(player.x).toBe(100);
      expect(player.y).toBe(80);
    });

    it('should initialize with correct dimensions', () => {
      expect(player.width).toBe(PLAYER_SPRITE_WIDTH);
      expect(player.height).toBe(PLAYER_SPRITE_HEIGHT);
    });

    it('should initialize with starting HP', () => {
      expect(player.hp).toBe(STARTING_HP);
      expect(player.maxHp).toBe(STARTING_HP);
    });

    it('should start in IDLE state', () => {
      expect(player.getState()).toBe('IDLE');
    });

    it('should start facing DOWN', () => {
      expect(player.facingDirection).toBe('DOWN');
    });

    it('should be active', () => {
      expect(player.active).toBe(true);
    });

    it('should accept custom starting HP', () => {
      const customPlayer = new Player(0, 0, 12);
      expect(customPlayer.hp).toBe(12);
      expect(customPlayer.maxHp).toBe(12);
    });
  });

  describe('getHitbox', () => {
    it('should return 8x8 hitbox at feet', () => {
      const hitbox = player.getHitbox();
      expect(hitbox.width).toBe(PLAYER_HITBOX_WIDTH);
      expect(hitbox.height).toBe(PLAYER_HITBOX_HEIGHT);
    });

    it('should offset hitbox from sprite position', () => {
      const hitbox = player.getHitbox();
      expect(hitbox.x).toBe(player.x + PLAYER_HITBOX_OFFSET_X);
      expect(hitbox.y).toBe(player.y + PLAYER_HITBOX_OFFSET_Y);
    });

    it('should update hitbox when player moves', () => {
      player.setPosition(50, 60);
      const hitbox = player.getHitbox();
      expect(hitbox.x).toBe(50 + PLAYER_HITBOX_OFFSET_X);
      expect(hitbox.y).toBe(60 + PLAYER_HITBOX_OFFSET_Y);
    });
  });

  describe('getSpriteBounds', () => {
    it('should return full sprite dimensions', () => {
      const bounds = player.getSpriteBounds();
      expect(bounds.x).toBe(player.x);
      expect(bounds.y).toBe(player.y);
      expect(bounds.width).toBe(PLAYER_SPRITE_WIDTH);
      expect(bounds.height).toBe(PLAYER_SPRITE_HEIGHT);
    });
  });

  describe('handleInput', () => {
    it('should change facing direction on movement input', () => {
      player.handleInput(createDirectionInput('UP'));
      expect(player.facingDirection).toBe('UP');

      player.handleInput(createDirectionInput('LEFT'));
      expect(player.facingDirection).toBe('LEFT');
    });

    it('should enter WALKING state on movement input', () => {
      player.handleInput(createDirectionInput('RIGHT'));
      expect(player.getState()).toBe('WALKING');
    });

    it('should return to IDLE when no direction input', () => {
      player.handleInput(createDirectionInput('UP'));
      expect(player.getState()).toBe('WALKING');

      player.handleInput(createMockInput());
      expect(player.getState()).toBe('IDLE');
    });

    it('should not respond during KNOCKBACK state', () => {
      player.takeDamage(1, 'UP');
      expect(player.getState()).toBe('KNOCKBACK');

      player.handleInput(createDirectionInput('LEFT'));
      expect(player.facingDirection).not.toBe('LEFT'); // Should keep knockback direction
    });

    it('should not respond during DYING state', () => {
      player.takeDamage(player.hp, 'UP');
      expect(player.getState()).toBe('DYING');

      player.handleInput(createDirectionInput('LEFT'));
      // State should remain DYING
      expect(player.getState()).toBe('DYING');
    });

    it('should not move during ATTACKING state', () => {
      player.startAttack(12);
      expect(player.getState()).toBe('ATTACKING');

      player.handleInput(createDirectionInput('UP'));
      // Should remain attacking, not change direction
      expect(player.getState()).toBe('ATTACKING');
    });
  });

  describe('movement', () => {
    it('should move when WALKING', () => {
      const startX = player.x;
      player.handleInput(createDirectionInput('RIGHT'));
      player.update(1);
      expect(player.x).toBeGreaterThan(startX);
    });

    it('should move up', () => {
      const startY = player.y;
      player.handleInput(createDirectionInput('UP'));
      player.update(1);
      expect(player.y).toBeLessThan(startY);
    });

    it('should move down', () => {
      const startY = player.y;
      player.handleInput(createDirectionInput('DOWN'));
      player.update(1);
      expect(player.y).toBeGreaterThan(startY);
    });

    it('should move left', () => {
      const startX = player.x;
      player.handleInput(createDirectionInput('LEFT'));
      player.update(1);
      expect(player.x).toBeLessThan(startX);
    });

    it('should move at 1.5 pixels per frame', () => {
      const startX = player.x;
      player.handleInput(createDirectionInput('RIGHT'));
      player.update(1);
      expect(player.x - startX).toBe(1); // Due to sub-pixel, first frame moves 1 pixel

      player.update(1);
      // After 2 frames at 1.5px/frame = 3 pixels total
      expect(player.x - startX).toBe(3);
    });

    it('should snap perpendicular axis to 8-pixel grid', () => {
      // Start at non-grid-aligned position
      player.setPosition(100, 83); // 83 is not divisible by 8

      player.handleInput(createDirectionInput('RIGHT'));
      player.update(1);

      // Y should snap to nearest 8-pixel grid (80 or 88)
      expect(player.y % 8).toBe(0);
    });

    it('should not move without collision checker if no collision', () => {
      const startX = player.x;
      player.handleInput(createDirectionInput('RIGHT'));
      player.update(1);
      expect(player.x).toBeGreaterThan(startX);
    });
  });

  describe('collision detection', () => {
    it('should stop at solid tiles', () => {
      const mockChecker: TileCollisionChecker = () => true; // Always collide
      player.setCollisionChecker(mockChecker);

      const startX = player.x;
      player.handleInput(createDirectionInput('RIGHT'));
      player.update(1);

      expect(player.x).toBe(startX); // Should not move
    });

    it('should move when no collision', () => {
      const mockChecker: TileCollisionChecker = () => false; // Never collide
      player.setCollisionChecker(mockChecker);

      const startX = player.x;
      player.handleInput(createDirectionInput('RIGHT'));
      player.update(1);

      expect(player.x).toBeGreaterThan(startX);
    });

    it('should use hitbox for collision, not sprite bounds', () => {
      let checkedHitbox: { width: number; height: number } | null = null;
      const mockChecker: TileCollisionChecker = (hitbox) => {
        checkedHitbox = hitbox;
        return false;
      };
      player.setCollisionChecker(mockChecker);

      player.handleInput(createDirectionInput('RIGHT'));
      player.update(1);

      expect(checkedHitbox).not.toBeNull();
      expect(checkedHitbox!.width).toBe(PLAYER_HITBOX_WIDTH);
      expect(checkedHitbox!.height).toBe(PLAYER_HITBOX_HEIGHT);
    });
  });

  describe('takeDamage', () => {
    it('should reduce HP', () => {
      const startHp = player.hp;
      player.takeDamage(2, 'UP');
      expect(player.hp).toBe(startHp - 2);
    });

    it('should enter KNOCKBACK state', () => {
      player.takeDamage(1, 'UP');
      expect(player.getState()).toBe('KNOCKBACK');
    });

    it('should not take damage while invincible', () => {
      player.takeDamage(1, 'UP');
      const hpAfterFirst = player.hp;

      // Should be invincible now
      expect(player.isInvincible()).toBe(true);

      player.takeDamage(1, 'UP');
      expect(player.hp).toBe(hpAfterFirst); // No additional damage
    });

    it('should return true when damage applied', () => {
      const result = player.takeDamage(1, 'UP');
      expect(result).toBe(true);
    });

    it('should return false when blocked by invincibility', () => {
      player.takeDamage(1, 'UP');
      const result = player.takeDamage(1, 'UP');
      expect(result).toBe(false);
    });

    it('should enter DYING state when HP reaches 0', () => {
      player.takeDamage(player.hp, 'UP');
      expect(player.getState()).toBe('DYING');
      expect(player.hp).toBe(0);
    });
  });

  describe('knockback', () => {
    it('should move in opposite direction of damage', () => {
      const startX = player.x;
      player.takeDamage(1, 'LEFT'); // Hit from left, knockback right

      // Update through knockback
      player.update(1);
      expect(player.x).toBeGreaterThan(startX);
    });

    it('should move exactly 16 pixels over 16 frames (1 pixel per frame)', () => {
      const startX = player.x;
      player.takeDamage(1, 'LEFT'); // Hit from left, knockback right

      // Update through entire knockback duration
      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      // Should have moved exactly KNOCKBACK_DISTANCE (16 pixels)
      expect(player.x - startX).toBe(16);
    });

    it('should knockback up when hit from down', () => {
      const startY = player.y;
      player.takeDamage(1, 'DOWN'); // Hit from down, knockback up

      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      expect(startY - player.y).toBe(16); // Moved up (negative Y)
    });

    it('should knockback down when hit from up', () => {
      const startY = player.y;
      player.takeDamage(1, 'UP'); // Hit from up, knockback down

      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      expect(player.y - startY).toBe(16); // Moved down (positive Y)
    });

    it('should knockback left when hit from right', () => {
      const startX = player.x;
      player.takeDamage(1, 'RIGHT'); // Hit from right, knockback left

      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      expect(startX - player.x).toBe(16); // Moved left (negative X)
    });

    it('should be invulnerable during knockback', () => {
      player.takeDamage(1, 'UP');
      expect(player.isInvincible()).toBe(true);
      expect(player.getState()).toBe('KNOCKBACK');

      // Try to take damage during knockback
      const hpDuringKnockback = player.hp;
      player.takeDamage(1, 'LEFT');
      expect(player.hp).toBe(hpDuringKnockback);
    });

    it('should not respond to input during knockback', () => {
      player.takeDamage(1, 'UP');
      expect(player.getState()).toBe('KNOCKBACK');

      // Try to move
      player.handleInput(createDirectionInput('LEFT'));
      expect(player.getState()).toBe('KNOCKBACK'); // Still in knockback
    });

    it('should transition to INVINCIBLE after knockback', () => {
      player.takeDamage(1, 'UP');
      expect(player.getState()).toBe('KNOCKBACK');

      // Update through entire knockback duration
      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      expect(player.getState()).toBe('INVINCIBLE');
    });

    it('should last KNOCKBACK_FRAMES', () => {
      player.takeDamage(1, 'UP');

      for (let i = 0; i < KNOCKBACK_FRAMES - 1; i++) {
        player.update(1);
        expect(player.getState()).toBe('KNOCKBACK');
      }

      player.update(1);
      expect(player.getState()).toBe('INVINCIBLE');
    });

    it('should stop at solid tiles during knockback', () => {
      // Always collide - simulates hitting a wall
      const mockChecker: TileCollisionChecker = () => true;
      player.setCollisionChecker(mockChecker);

      const startX = player.x;
      player.takeDamage(1, 'LEFT'); // Hit from left, knockback right

      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      // Should not have moved because collision blocks it
      expect(player.x).toBe(startX);
      // Should still transition to INVINCIBLE after knockback duration
      expect(player.getState()).toBe('INVINCIBLE');
    });
  });

  describe('invincibility', () => {
    it('should last INVINCIBILITY_FRAMES (60 frames) after knockback', () => {
      player.takeDamage(1, 'UP');

      // Skip knockback
      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      expect(player.isInvincible()).toBe(true);
      expect(player.getState()).toBe('INVINCIBLE');

      // Update through invincibility minus 1
      for (let i = 0; i < INVINCIBILITY_FRAMES - 1; i++) {
        player.update(1);
        expect(player.isInvincible()).toBe(true);
      }

      // Last frame should end invincibility
      player.update(1);
      expect(player.isInvincible()).toBe(false);
    });

    it('should flash sprite every 4 frames during invincibility', () => {
      player.takeDamage(1, 'UP');

      // Skip knockback
      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      // Check first 16 frames of invincibility for proper flash pattern
      const visibilityPattern: boolean[] = [];
      for (let i = 0; i < 16; i++) {
        const commands = player.getSpriteCommands();
        visibilityPattern.push(commands[0].visible);
        player.update(1);
      }

      // Should alternate visibility every 4 frames
      // Frames 0-3: visible (flashTimer 0-3, phase 0)
      // Frames 4-7: invisible (flashTimer 4-7, phase 1)
      // Frames 8-11: visible (flashTimer 8-11, phase 0)
      // Frames 12-15: invisible (flashTimer 12-15, phase 1)
      expect(visibilityPattern.slice(0, 4).every(v => v === true)).toBe(true);
      expect(visibilityPattern.slice(4, 8).every(v => v === false)).toBe(true);
      expect(visibilityPattern.slice(8, 12).every(v => v === true)).toBe(true);
      expect(visibilityPattern.slice(12, 16).every(v => v === false)).toBe(true);
    });

    it('should prevent damage during invincibility period', () => {
      player.takeDamage(1, 'UP');
      const hpAfterFirst = player.hp;

      // Skip knockback
      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      // Should still be invincible
      expect(player.isInvincible()).toBe(true);

      // Try to take damage
      const result = player.takeDamage(1, 'LEFT');
      expect(result).toBe(false);
      expect(player.hp).toBe(hpAfterFirst);
    });

    it('should allow movement during invincibility', () => {
      player.takeDamage(1, 'UP');

      // Skip knockback
      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      expect(player.getState()).toBe('INVINCIBLE');
      expect(player.canMove()).toBe(true);

      // Move during invincibility
      const startX = player.x;
      player.handleInput(createDirectionInput('RIGHT'));
      player.update(1);

      expect(player.x).toBeGreaterThan(startX);
    });

    it('should allow attacking during invincibility', () => {
      player.takeDamage(1, 'UP');

      // Skip knockback
      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      expect(player.getState()).toBe('INVINCIBLE');
      expect(player.canAttack()).toBe(true);

      player.startAttack(12);
      expect(player.getState()).toBe('ATTACKING');
    });

    it('should return to IDLE after invincibility ends', () => {
      player.takeDamage(1, 'UP');

      // Skip knockback
      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      expect(player.getState()).toBe('INVINCIBLE');

      // Update through invincibility (60 frames)
      for (let i = 0; i < INVINCIBILITY_FRAMES; i++) {
        player.update(1);
      }

      // After 60 invincibility frames, timer is 0 but state check happens before decrement
      // So we need one more frame for the check to see timer <= 0 and transition
      player.update(1);

      expect(player.getState()).toBe('IDLE');
      expect(player.isInvincible()).toBe(false);
    });

    it('should be able to take damage after invincibility ends', () => {
      player.takeDamage(1, 'UP');
      const hpAfterFirst = player.hp;

      // Skip knockback + invincibility
      for (let i = 0; i < KNOCKBACK_FRAMES + INVINCIBILITY_FRAMES; i++) {
        player.update(1);
      }

      expect(player.isInvincible()).toBe(false);

      // Should be able to take damage again
      const result = player.takeDamage(1, 'LEFT');
      expect(result).toBe(true);
      expect(player.hp).toBe(hpAfterFirst - 1);
    });
  });

  describe('attacking', () => {
    it('should enter ATTACKING state', () => {
      player.startAttack(12);
      expect(player.getState()).toBe('ATTACKING');
    });

    it('should return to IDLE after attack duration', () => {
      player.startAttack(12);

      for (let i = 0; i < 12; i++) {
        player.update(1);
      }

      expect(player.getState()).toBe('IDLE');
    });

    it('should not start attack during KNOCKBACK', () => {
      player.takeDamage(1, 'UP');
      player.startAttack(12);
      expect(player.getState()).toBe('KNOCKBACK');
    });

    it('should not start attack during DYING', () => {
      player.takeDamage(player.hp, 'UP');
      player.startAttack(12);
      expect(player.getState()).toBe('DYING');
    });

    it('canAttack should return true when able', () => {
      expect(player.canAttack()).toBe(true);
    });

    it('canAttack should return false during knockback', () => {
      player.takeDamage(1, 'UP');
      expect(player.canAttack()).toBe(false);
    });

    it('should use default ATTACK_FRAMES duration', () => {
      player.startAttack(); // No duration specified

      // Should still be attacking after 11 frames
      for (let i = 0; i < 11; i++) {
        player.update(1);
        expect(player.getState()).toBe('ATTACKING');
      }

      // Should return to IDLE after 12 frames (ATTACK_FRAMES default)
      player.update(1);
      expect(player.getState()).toBe('IDLE');
    });

    it('should track attack frame', () => {
      player.startAttack(12);
      expect(player.getAttackFrame()).toBe(0);

      player.update(1);
      expect(player.getAttackFrame()).toBe(1);

      player.update(5);
      expect(player.getAttackFrame()).toBe(6);
    });

    it('should reset attack frame when attack ends', () => {
      player.startAttack(5);

      for (let i = 0; i < 5; i++) {
        player.update(1);
      }

      expect(player.getState()).toBe('IDLE');
      expect(player.getAttackFrame()).toBe(0);
    });
  });

  describe('sword hitbox', () => {
    it('getSwordHitbox should return null when not attacking', () => {
      expect(player.getSwordHitbox()).toBeNull();
    });

    it('getSwordHitbox should return null before active frames', () => {
      player.startAttack(12);
      player.update(1); // Frame 1, not yet active (starts at frame 2)
      expect(player.getSwordHitbox()).toBeNull();
    });

    it('getSwordHitbox should return hitbox during active frames', () => {
      player.startAttack(12);
      player.update(2); // Frame 2, should be active
      expect(player.getSwordHitbox()).not.toBeNull();
    });

    it('getSwordHitbox should return null after active frames', () => {
      player.startAttack(12);
      player.update(9); // Frame 9, past active (ends at frame 8)
      expect(player.getSwordHitbox()).toBeNull();
    });

    it('should position sword hitbox to the right when facing RIGHT', () => {
      player.handleInput(createDirectionInput('RIGHT'));
      player.startAttack(12);
      player.update(2);

      const hitbox = player.getSwordHitbox();
      expect(hitbox).not.toBeNull();
      // Sword should be to the right of player
      expect(hitbox!.x).toBe(player.x + PLAYER_SPRITE_WIDTH);
      expect(hitbox!.width).toBe(16);
      expect(hitbox!.height).toBe(8);
    });

    it('should position sword hitbox to the left when facing LEFT', () => {
      player.handleInput(createDirectionInput('LEFT'));
      player.startAttack(12);
      player.update(2);

      const hitbox = player.getSwordHitbox();
      expect(hitbox).not.toBeNull();
      // Sword should be to the left of player
      expect(hitbox!.x).toBe(player.x - 16);
      expect(hitbox!.width).toBe(16);
      expect(hitbox!.height).toBe(8);
    });

    it('should position sword hitbox above when facing UP', () => {
      player.handleInput(createDirectionInput('UP'));
      player.startAttack(12);
      player.update(2);

      const hitbox = player.getSwordHitbox();
      expect(hitbox).not.toBeNull();
      // Sword should be above player
      expect(hitbox!.y).toBe(player.y - 16);
      expect(hitbox!.width).toBe(8);
      expect(hitbox!.height).toBe(16);
    });

    it('should position sword hitbox below when facing DOWN', () => {
      player.handleInput(createDirectionInput('DOWN'));
      player.startAttack(12);
      player.update(2);

      const hitbox = player.getSwordHitbox();
      expect(hitbox).not.toBeNull();
      // Sword should be below player
      expect(hitbox!.y).toBe(player.y + PLAYER_SPRITE_HEIGHT);
      expect(hitbox!.width).toBe(8);
      expect(hitbox!.height).toBe(16);
    });

    it('isSwordActive should reflect hitbox state', () => {
      expect(player.isSwordActive()).toBe(false);

      player.startAttack(12);
      player.update(1);
      expect(player.isSwordActive()).toBe(false); // Before active

      player.update(1);
      expect(player.isSwordActive()).toBe(true); // During active

      player.update(7);
      expect(player.isSwordActive()).toBe(false); // After active
    });
  });

  describe('healing', () => {
    it('should increase HP', () => {
      player.takeDamage(2, 'UP');
      const hpAfterDamage = player.hp;

      player.heal(1);
      expect(player.hp).toBe(hpAfterDamage + 1);
    });

    it('should not exceed maxHp', () => {
      player.heal(100);
      expect(player.hp).toBe(player.maxHp);
    });
  });

  describe('setPosition', () => {
    it('should teleport player', () => {
      player.setPosition(200, 150);
      expect(player.x).toBe(200);
      expect(player.y).toBe(150);
    });

    it('should update sub-pixel position', () => {
      player.setPosition(200, 150);

      // Movement should start from exact position
      player.handleInput(createDirectionInput('RIGHT'));
      player.update(1);
      expect(player.x).toBe(201); // 1 pixel from sub-pixel math
    });
  });

  describe('getSpriteCommands', () => {
    it('should return sprite commands when active', () => {
      const commands = player.getSpriteCommands();
      expect(commands.length).toBe(1);
    });

    it('should return empty array when inactive', () => {
      player.destroy();
      const commands = player.getSpriteCommands();
      expect(commands.length).toBe(0);
    });

    it('should use correct position', () => {
      player.setPosition(120, 80);
      const commands = player.getSpriteCommands();
      expect(commands[0].x).toBe(120);
      expect(commands[0].y).toBe(80);
    });

    it('should include direction in sprite key', () => {
      player.handleInput(createDirectionInput('LEFT'));
      const commands = player.getSpriteCommands();
      expect(commands[0].spriteKey).toContain('left');
    });

    it('should flash during invincibility', () => {
      player.takeDamage(1, 'UP');

      // Update past knockback
      for (let i = 0; i < KNOCKBACK_FRAMES; i++) {
        player.update(1);
      }

      // Check flashing behavior
      let visibleCount = 0;
      let invisibleCount = 0;

      for (let i = 0; i < 20; i++) {
        player.update(1);
        const commands = player.getSpriteCommands();
        if (commands[0].visible) {
          visibleCount++;
        } else {
          invisibleCount++;
        }
      }

      // Should have some visible and some invisible frames
      expect(visibleCount).toBeGreaterThan(0);
      expect(invisibleCount).toBeGreaterThan(0);
    });
  });

  describe('animation', () => {
    it('should cycle animation frame while walking', () => {
      player.handleInput(createDirectionInput('RIGHT'));

      // Start walking (first update)
      player.update(1);
      const frame0Key = player.getSpriteCommands()[0].spriteKey;
      expect(frame0Key).toContain('_0'); // Should start at frame 0

      // Update 8 frames to trigger animation change (WALK_ANIMATION_SPEED = 8)
      for (let i = 0; i < 8; i++) {
        player.update(1);
        player.handleInput(createDirectionInput('RIGHT')); // Keep walking
      }

      const frame1Key = player.getSpriteCommands()[0].spriteKey;
      expect(frame1Key).toContain('_1'); // Should be at frame 1

      // Update 8 more frames to cycle back to frame 0
      for (let i = 0; i < 8; i++) {
        player.update(1);
        player.handleInput(createDirectionInput('RIGHT')); // Keep walking
      }

      const frame0AgainKey = player.getSpriteCommands()[0].spriteKey;
      expect(frame0AgainKey).toContain('_0'); // Should cycle back to frame 0
    });

    it('should reset animation when stopping', () => {
      player.handleInput(createDirectionInput('RIGHT'));

      // Walk for a bit
      for (let i = 0; i < 16; i++) {
        player.update(1);
      }

      // Stop walking
      player.handleInput(createMockInput());
      player.update(1);

      const commands = player.getSpriteCommands();
      expect(commands[0].spriteKey).toContain('_0'); // Frame 0
    });
  });

  describe('reset', () => {
    it('should reset position', () => {
      player.setPosition(200, 150);
      player.reset(100, 80);
      expect(player.x).toBe(100);
      expect(player.y).toBe(80);
    });

    it('should reset HP', () => {
      player.takeDamage(2, 'UP');
      player.reset(100, 80, 6);
      expect(player.hp).toBe(6);
    });

    it('should reset state to IDLE', () => {
      player.takeDamage(1, 'UP');
      expect(player.getState()).toBe('KNOCKBACK');

      player.reset(100, 80);
      expect(player.getState()).toBe('IDLE');
    });

    it('should clear invincibility', () => {
      player.takeDamage(1, 'UP');
      player.reset(100, 80);
      expect(player.isInvincible()).toBe(false);
    });

    it('should reactivate player', () => {
      player.destroy();
      expect(player.active).toBe(false);

      player.reset(100, 80);
      expect(player.active).toBe(true);
    });
  });

  describe('canMove', () => {
    it('should return true in IDLE state', () => {
      expect(player.canMove()).toBe(true);
    });

    it('should return true in WALKING state', () => {
      player.handleInput(createDirectionInput('UP'));
      expect(player.canMove()).toBe(true);
    });

    it('should return false in KNOCKBACK state', () => {
      player.takeDamage(1, 'UP');
      expect(player.canMove()).toBe(false);
    });

    it('should return false in DYING state', () => {
      player.takeDamage(player.hp, 'UP');
      expect(player.canMove()).toBe(false);
    });
  });

  describe('dying', () => {
    it('should deactivate after death animation', () => {
      player.takeDamage(player.hp, 'UP');
      expect(player.getState()).toBe('DYING');

      // Update through death animation (80 frames)
      for (let i = 0; i < 80; i++) {
        player.update(1);
      }

      expect(player.active).toBe(false);
    });
  });

  describe('singleton', () => {
    it('getPlayer should return same instance', () => {
      const player1 = getPlayer();
      const player2 = getPlayer();
      expect(player1).toBe(player2);
    });

    it('resetPlayer should create new instance', () => {
      const player1 = getPlayer();
      const player2 = resetPlayer(50, 50);
      expect(player2.x).toBe(50);
      expect(player2.y).toBe(50);
    });
  });
});
