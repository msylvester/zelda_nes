// Player.ts - Player (Link) entity implementation
// Implements spec section 5.7 - Player System

import {
  Direction,
  PlayerState,
  InputSnapshot,
  SpriteRenderCommand,
  AABB,
  SpritePriority,
} from '../types';
import {
  PLAYER_SPEED_SUBPIXELS,
  SUBPIXEL_SCALE,
  PLAYER_SPRITE_WIDTH,
  PLAYER_SPRITE_HEIGHT,
  PLAYER_HITBOX_WIDTH,
  PLAYER_HITBOX_HEIGHT,
  PLAYER_HITBOX_OFFSET_X,
  PLAYER_HITBOX_OFFSET_Y,
  KNOCKBACK_DISTANCE,
  KNOCKBACK_FRAMES,
  INVINCIBILITY_FRAMES,
  INVINCIBILITY_FLASH_INTERVAL,
  STARTING_HP,
  ATTACK_FRAMES,
  SWORD_HITBOX_ACTIVE_START,
  SWORD_HITBOX_ACTIVE_END,
  SWORD_HITBOX_HORIZONTAL_WIDTH,
  SWORD_HITBOX_HORIZONTAL_HEIGHT,
  SWORD_HITBOX_VERTICAL_WIDTH,
  SWORD_HITBOX_VERTICAL_HEIGHT,
} from '../constants';
import { snapToGrid } from '../utils/math';
import { BaseEntity } from './Entity';

/**
 * Collision check function type
 * Returns true if the hitbox collides with solid tiles
 */
export type TileCollisionChecker = (hitbox: AABB) => boolean;

/**
 * Player entity - represents Link in the game
 */
export class Player extends BaseEntity {
  // State machine
  state: PlayerState = 'IDLE';
  private previousState: PlayerState = 'IDLE';

  // Sub-pixel position tracking (16 sub-pixels per pixel)
  private subPixelX: number = 0;
  private subPixelY: number = 0;

  // Combat stats
  hp: number;
  maxHp: number;

  // State timers
  private stateTimer: number = 0;
  private knockbackDirection: Direction | null = null;
  private knockbackProgress: number = 0;

  // Animation
  private animationFrame: number = 0;
  private animationTimer: number = 0;
  private readonly WALK_ANIMATION_SPEED = 8; // frames per animation frame

  // Attack
  private attackFrame: number = 0; // Current frame of attack animation (0 = not attacking)

  // Invincibility
  private invincibilityTimer: number = 0;
  private flashTimer: number = 0;
  private justEnteredInvincible: boolean = false; // Flag to skip first frame decrement

  // Collision checker (injected dependency)
  private collisionChecker: TileCollisionChecker | null = null;

  // Sprite priority for rendering
  override spritePriority: SpritePriority = 4;

  constructor(x: number, y: number, startingHp: number = STARTING_HP) {
    super('PLAYER', x, y, PLAYER_SPRITE_WIDTH, PLAYER_SPRITE_HEIGHT, 'player');
    this.hp = startingHp;
    this.maxHp = startingHp;
    this.facingDirection = 'DOWN';
    // Initialize sub-pixel position
    this.subPixelX = x * SUBPIXEL_SCALE;
    this.subPixelY = y * SUBPIXEL_SCALE;
  }

  /**
   * Set the collision checker function
   */
  setCollisionChecker(checker: TileCollisionChecker): void {
    this.collisionChecker = checker;
  }

  /**
   * Get the 8x8 collision hitbox at the player's feet
   */
  override getHitbox(): AABB {
    return {
      x: this.x + PLAYER_HITBOX_OFFSET_X,
      y: this.y + PLAYER_HITBOX_OFFSET_Y,
      width: PLAYER_HITBOX_WIDTH,
      height: PLAYER_HITBOX_HEIGHT,
    };
  }

  /**
   * Get the full sprite bounds (for rendering/camera)
   */
  getSpriteBounds(): AABB {
    return {
      x: this.x,
      y: this.y,
      width: PLAYER_SPRITE_WIDTH,
      height: PLAYER_SPRITE_HEIGHT,
    };
  }

  /**
   * Get the sword hitbox during attack
   * Returns null if not attacking or if sword hitbox is not active
   * Hitbox is active during frames SWORD_HITBOX_ACTIVE_START to SWORD_HITBOX_ACTIVE_END
   */
  getSwordHitbox(): AABB | null {
    // Not attacking
    if (this.state !== 'ATTACKING') {
      return null;
    }

    // Check if sword hitbox is active (frames 2-8)
    if (this.attackFrame < SWORD_HITBOX_ACTIVE_START || this.attackFrame > SWORD_HITBOX_ACTIVE_END) {
      return null;
    }

    // Sword hitbox position depends on facing direction
    // Sword is adjacent to Link, sized 16x8 horizontal or 8x16 vertical
    const centerX = this.x + PLAYER_SPRITE_WIDTH / 2;
    const centerY = this.y + PLAYER_SPRITE_HEIGHT / 2;

    switch (this.facingDirection) {
      case 'UP':
        return {
          x: centerX - SWORD_HITBOX_VERTICAL_WIDTH / 2,
          y: this.y - SWORD_HITBOX_VERTICAL_HEIGHT,
          width: SWORD_HITBOX_VERTICAL_WIDTH,
          height: SWORD_HITBOX_VERTICAL_HEIGHT,
        };
      case 'DOWN':
        return {
          x: centerX - SWORD_HITBOX_VERTICAL_WIDTH / 2,
          y: this.y + PLAYER_SPRITE_HEIGHT,
          width: SWORD_HITBOX_VERTICAL_WIDTH,
          height: SWORD_HITBOX_VERTICAL_HEIGHT,
        };
      case 'LEFT':
        return {
          x: this.x - SWORD_HITBOX_HORIZONTAL_WIDTH,
          y: centerY - SWORD_HITBOX_HORIZONTAL_HEIGHT / 2,
          width: SWORD_HITBOX_HORIZONTAL_WIDTH,
          height: SWORD_HITBOX_HORIZONTAL_HEIGHT,
        };
      case 'RIGHT':
        return {
          x: this.x + PLAYER_SPRITE_WIDTH,
          y: centerY - SWORD_HITBOX_HORIZONTAL_HEIGHT / 2,
          width: SWORD_HITBOX_HORIZONTAL_WIDTH,
          height: SWORD_HITBOX_HORIZONTAL_HEIGHT,
        };
    }
  }

  /**
   * Check if sword hitbox is currently active
   */
  isSwordActive(): boolean {
    return this.getSwordHitbox() !== null;
  }

  /**
   * Get current attack frame (for external queries)
   */
  getAttackFrame(): number {
    return this.attackFrame;
  }

  /**
   * Process input and update player state
   */
  handleInput(input: InputSnapshot): void {
    // Can't act during certain states
    if (this.state === 'KNOCKBACK' || this.state === 'DYING') {
      return;
    }

    // Handle attacking state separately (can't move during attack)
    if (this.state === 'ATTACKING') {
      return;
    }

    // Movement input
    const moveDirection = input.activeDirection;

    if (moveDirection) {
      this.facingDirection = moveDirection;
      this.setState('WALKING');
    } else {
      if (this.state === 'WALKING') {
        this.setState('IDLE');
      }
    }
  }

  /**
   * Main update function
   */
  override update(deltaFrame: number): void {
    // Update state-specific logic
    this.updateState(deltaFrame);

    // Update invincibility
    this.updateInvincibility(deltaFrame);

    // Update animation
    this.updateAnimation(deltaFrame);
  }

  /**
   * Update based on current state
   */
  private updateState(deltaFrame: number): void {
    switch (this.state) {
      case 'IDLE':
        // Nothing to update
        break;

      case 'WALKING':
        this.updateMovement(deltaFrame);
        break;

      case 'ATTACKING':
        this.attackFrame += deltaFrame;
        this.stateTimer -= deltaFrame;
        if (this.stateTimer <= 0) {
          this.attackFrame = 0;
          this.setState('IDLE');
        }
        break;

      case 'KNOCKBACK':
        this.updateKnockback(deltaFrame);
        break;

      case 'DYING':
        this.stateTimer -= deltaFrame;
        if (this.stateTimer <= 0) {
          // Death animation complete
          this.active = false;
        }
        break;

      case 'INVINCIBLE':
        // Just waiting for invincibility to end
        if (this.invincibilityTimer <= 0) {
          this.setState('IDLE');
        }
        break;
    }
  }

  /**
   * Update movement with sub-pixel precision
   */
  private updateMovement(deltaFrame: number): void {
    // Calculate movement in sub-pixels
    const moveAmount = PLAYER_SPEED_SUBPIXELS * deltaFrame;

    let newSubPixelX = this.subPixelX;
    let newSubPixelY = this.subPixelY;

    // Apply movement based on facing direction
    switch (this.facingDirection) {
      case 'UP':
        newSubPixelY -= moveAmount;
        // Snap X to 8-pixel grid
        newSubPixelX = this.snapToGridSubPixel(newSubPixelX, 8);
        break;
      case 'DOWN':
        newSubPixelY += moveAmount;
        // Snap X to 8-pixel grid
        newSubPixelX = this.snapToGridSubPixel(newSubPixelX, 8);
        break;
      case 'LEFT':
        newSubPixelX -= moveAmount;
        // Snap Y to 8-pixel grid
        newSubPixelY = this.snapToGridSubPixel(newSubPixelY, 8);
        break;
      case 'RIGHT':
        newSubPixelX += moveAmount;
        // Snap Y to 8-pixel grid
        newSubPixelY = this.snapToGridSubPixel(newSubPixelY, 8);
        break;
    }

    // Convert to pixel position for collision check
    const newX = Math.floor(newSubPixelX / SUBPIXEL_SCALE);
    const newY = Math.floor(newSubPixelY / SUBPIXEL_SCALE);

    // Check collision with the new hitbox position
    const newHitbox: AABB = {
      x: newX + PLAYER_HITBOX_OFFSET_X,
      y: newY + PLAYER_HITBOX_OFFSET_Y,
      width: PLAYER_HITBOX_WIDTH,
      height: PLAYER_HITBOX_HEIGHT,
    };

    // If collision checker exists and detects collision, don't move
    if (this.collisionChecker && this.collisionChecker(newHitbox)) {
      // Try moving just horizontally
      if (this.facingDirection === 'LEFT' || this.facingDirection === 'RIGHT') {
        const horizHitbox: AABB = {
          x: newX + PLAYER_HITBOX_OFFSET_X,
          y: this.y + PLAYER_HITBOX_OFFSET_Y,
          width: PLAYER_HITBOX_WIDTH,
          height: PLAYER_HITBOX_HEIGHT,
        };
        if (!this.collisionChecker(horizHitbox)) {
          this.subPixelX = newSubPixelX;
          this.x = newX;
        }
      }
      // Try moving just vertically
      else {
        const vertHitbox: AABB = {
          x: this.x + PLAYER_HITBOX_OFFSET_X,
          y: newY + PLAYER_HITBOX_OFFSET_Y,
          width: PLAYER_HITBOX_WIDTH,
          height: PLAYER_HITBOX_HEIGHT,
        };
        if (!this.collisionChecker(vertHitbox)) {
          this.subPixelY = newSubPixelY;
          this.y = newY;
        }
      }
      return;
    }

    // Apply movement
    this.subPixelX = newSubPixelX;
    this.subPixelY = newSubPixelY;
    this.x = newX;
    this.y = newY;
  }

  /**
   * Snap a sub-pixel value to an 8-pixel grid
   */
  private snapToGridSubPixel(subPixels: number, gridSize: number): number {
    const pixels = subPixels / SUBPIXEL_SCALE;
    const snapped = snapToGrid(pixels, gridSize);
    return snapped * SUBPIXEL_SCALE;
  }

  /**
   * Update knockback movement
   */
  private updateKnockback(deltaFrame: number): void {
    if (!this.knockbackDirection) {
      // Start invincibility frames when knockback ends
      this.invincibilityTimer = INVINCIBILITY_FRAMES;
      this.setState('INVINCIBLE');
      return;
    }

    // Move in knockback direction
    const knockbackSpeed = (KNOCKBACK_DISTANCE / KNOCKBACK_FRAMES) * SUBPIXEL_SCALE;
    const moveAmount = knockbackSpeed * deltaFrame;

    let newSubPixelX = this.subPixelX;
    let newSubPixelY = this.subPixelY;

    switch (this.knockbackDirection) {
      case 'UP':
        newSubPixelY -= moveAmount;
        break;
      case 'DOWN':
        newSubPixelY += moveAmount;
        break;
      case 'LEFT':
        newSubPixelX -= moveAmount;
        break;
      case 'RIGHT':
        newSubPixelX += moveAmount;
        break;
    }

    // Convert to pixel position
    const newX = Math.floor(newSubPixelX / SUBPIXEL_SCALE);
    const newY = Math.floor(newSubPixelY / SUBPIXEL_SCALE);

    // Check collision
    const newHitbox: AABB = {
      x: newX + PLAYER_HITBOX_OFFSET_X,
      y: newY + PLAYER_HITBOX_OFFSET_Y,
      width: PLAYER_HITBOX_WIDTH,
      height: PLAYER_HITBOX_HEIGHT,
    };

    // Move unless blocked
    if (!this.collisionChecker || !this.collisionChecker(newHitbox)) {
      this.subPixelX = newSubPixelX;
      this.subPixelY = newSubPixelY;
      this.x = newX;
      this.y = newY;
    }

    // Track knockback progress
    this.knockbackProgress += deltaFrame;
    if (this.knockbackProgress >= KNOCKBACK_FRAMES) {
      this.knockbackDirection = null;
      this.knockbackProgress = 0;
      // Start invincibility frames when knockback ends
      this.invincibilityTimer = INVINCIBILITY_FRAMES;
      this.justEnteredInvincible = true; // Skip decrement on this frame
      this.setState('INVINCIBLE');
    }
  }

  /**
   * Update invincibility timer
   * Note: flashTimer only runs during INVINCIBLE state (after knockback ends)
   */
  private updateInvincibility(deltaFrame: number): void {
    if (this.invincibilityTimer > 0) {
      // Skip decrement on the frame we just entered INVINCIBLE state
      if (this.justEnteredInvincible) {
        this.justEnteredInvincible = false;
        // Don't decrement timer or increment flash timer on transition frame
        // Flash will start from 0 on the next frame
        return;
      }

      this.invincibilityTimer -= deltaFrame;
      // Only flash during INVINCIBLE state, not during KNOCKBACK
      if (this.state === 'INVINCIBLE') {
        this.flashTimer += deltaFrame;
      }
    } else {
      this.flashTimer = 0;
    }
  }

  /**
   * Update animation frame
   */
  private updateAnimation(deltaFrame: number): void {
    if (this.state === 'WALKING') {
      this.animationTimer += deltaFrame;
      if (this.animationTimer >= this.WALK_ANIMATION_SPEED) {
        this.animationTimer = 0;
        this.animationFrame = (this.animationFrame + 1) % 2;
      }
    } else {
      this.animationFrame = 0;
      this.animationTimer = 0;
    }
  }

  /**
   * Change player state
   */
  setState(newState: PlayerState): void {
    this.previousState = this.state;
    this.state = newState;
    this.stateTimer = 0;

    // Reset state-specific variables
    if (newState === 'IDLE') {
      this.animationFrame = 0;
    }
  }

  /**
   * Start attacking state
   */
  startAttack(duration: number = ATTACK_FRAMES): void {
    if (this.state === 'ATTACKING' || this.state === 'KNOCKBACK' || this.state === 'DYING') {
      return;
    }
    this.setState('ATTACKING');
    this.stateTimer = duration;
    this.attackFrame = 0;
  }

  /**
   * Take damage from an enemy
   */
  takeDamage(amount: number, fromDirection: Direction): boolean {
    // Can't take damage while invincible or already dying
    if (this.isInvincible() || this.state === 'DYING') {
      return false;
    }

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.setState('DYING');
      this.stateTimer = 80; // Death animation frames
      return true;
    }

    // Start knockback in opposite direction
    this.knockbackDirection = this.getOppositeDirection(fromDirection);
    this.knockbackProgress = 0;
    this.setState('KNOCKBACK');

    // Note: invincibility timer will be set when knockback ends (in updateKnockback)
    // Player is still invincible during knockback via isInvincible() state check

    return true;
  }

  /**
   * Check if player is invincible
   */
  isInvincible(): boolean {
    return this.invincibilityTimer > 0 || this.state === 'KNOCKBACK' || this.state === 'DYING';
  }

  /**
   * Check if player can move
   */
  canMove(): boolean {
    return this.state === 'IDLE' || this.state === 'WALKING' || this.state === 'INVINCIBLE';
  }

  /**
   * Check if player can attack
   */
  canAttack(): boolean {
    return this.state === 'IDLE' || this.state === 'WALKING' || this.state === 'INVINCIBLE';
  }

  /**
   * Get the opposite direction
   */
  private getOppositeDirection(dir: Direction): Direction {
    switch (dir) {
      case 'UP': return 'DOWN';
      case 'DOWN': return 'UP';
      case 'LEFT': return 'RIGHT';
      case 'RIGHT': return 'LEFT';
    }
  }

  /**
   * Heal the player
   */
  heal(amount: number): void {
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  /**
   * Set position (teleport)
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.subPixelX = x * SUBPIXEL_SCALE;
    this.subPixelY = y * SUBPIXEL_SCALE;
  }

  /**
   * Get sprite commands for rendering
   */
  override getSpriteCommands(): SpriteRenderCommand[] {
    // Don't render if inactive
    if (!this.active) {
      return [];
    }

    // Check if should be visible (invincibility flashing)
    const isFlashing = this.invincibilityTimer > 0;
    const flashPhase = Math.floor(this.flashTimer / INVINCIBILITY_FLASH_INTERVAL) % 2;
    const visible = !isFlashing || flashPhase === 0;

    // Determine sprite key based on state and direction
    const spriteKey = this.getSpriteKey();

    const commands: SpriteRenderCommand[] = [{
      spriteKey,
      x: this.x,
      y: this.y,
      flipX: false,
      flipY: false,
      priority: this.spritePriority,
      visible,
    }];

    // Render sword sprite during active attack frames
    if (this.state === 'ATTACKING' &&
        this.attackFrame >= SWORD_HITBOX_ACTIVE_START &&
        this.attackFrame <= SWORD_HITBOX_ACTIVE_END) {
      const dir = this.facingDirection.toLowerCase();
      const centerX = this.x + PLAYER_SPRITE_WIDTH / 2;
      const centerY = this.y + PLAYER_SPRITE_HEIGHT / 2;

      let swordX: number;
      let swordY: number;
      switch (this.facingDirection) {
        case 'UP':
          swordX = centerX - SWORD_HITBOX_VERTICAL_WIDTH / 2;
          swordY = this.y - SWORD_HITBOX_VERTICAL_HEIGHT;
          break;
        case 'DOWN':
          swordX = centerX - SWORD_HITBOX_VERTICAL_WIDTH / 2;
          swordY = this.y + PLAYER_SPRITE_HEIGHT;
          break;
        case 'LEFT':
          swordX = this.x - SWORD_HITBOX_HORIZONTAL_WIDTH;
          swordY = centerY - SWORD_HITBOX_HORIZONTAL_HEIGHT / 2;
          break;
        case 'RIGHT':
          swordX = this.x + PLAYER_SPRITE_WIDTH;
          swordY = centerY - SWORD_HITBOX_HORIZONTAL_HEIGHT / 2;
          break;
      }

      commands.push({
        spriteKey: `sword_${dir}`,
        x: swordX,
        y: swordY,
        flipX: false,
        flipY: false,
        priority: this.spritePriority,
        visible,
      });
    }

    return commands;
  }

  /**
   * Get the appropriate sprite key for current state
   */
  private getSpriteKey(): string {
    const dir = this.facingDirection.toLowerCase();

    switch (this.state) {
      case 'ATTACKING':
        return `link_attack_${dir}`;

      case 'DYING':
        return 'link_dying';

      case 'WALKING':
        return `link_walk_${dir}_${this.animationFrame}`;

      case 'IDLE':
      case 'INVINCIBLE':
      case 'KNOCKBACK':
      default:
        return `link_walk_${dir}_0`;
    }
  }

  /**
   * Get current state (for external queries)
   */
  getState(): PlayerState {
    return this.state;
  }

  /**
   * Get previous state
   */
  getPreviousState(): PlayerState {
    return this.previousState;
  }

  /**
   * Reset player to initial state
   */
  reset(x: number, y: number, hp: number = STARTING_HP): void {
    this.setPosition(x, y);
    this.hp = hp;
    this.maxHp = Math.max(this.maxHp, hp);
    this.state = 'IDLE';
    this.previousState = 'IDLE';
    this.facingDirection = 'DOWN';
    this.invincibilityTimer = 0;
    this.flashTimer = 0;
    this.justEnteredInvincible = false;
    this.knockbackDirection = null;
    this.knockbackProgress = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.attackFrame = 0;
    this.stateTimer = 0;
    this.active = true;
  }
}

// Singleton player instance
let playerInstance: Player | null = null;

/**
 * Get the global player instance
 */
export function getPlayer(): Player {
  if (!playerInstance) {
    // Default starting position (will be set properly on game init)
    playerInstance = new Player(120, 80);
  }
  return playerInstance;
}

/**
 * Reset the global player instance
 */
export function resetPlayer(x: number = 120, y: number = 80, hp: number = STARTING_HP): Player {
  playerInstance = new Player(x, y, hp);
  return playerInstance;
}
