// AnimationSystem.ts - Animation playback and frame advancement
// Refer to specs/final-one-shot-prd.md section 5.12

import {
  getAnimation,
  type Animation,
  type AnimationFrame,
} from './AnimationData';

// ===== ANIMATION INSTANCE =====

/**
 * Runtime state of a playing animation
 */
export interface AnimationInstance {
  /** The animation definition */
  animation: Animation;

  /** Current frame index in the animation */
  currentFrameIndex: number;

  /** Remaining ticks until next frame */
  frameTimer: number;

  /** Whether the animation has completed (non-looping only) */
  finished: boolean;

  /** Number of times the animation has looped */
  loopCount: number;
}

// ===== ANIMATION SYSTEM =====

/**
 * Manages animation playback for all entities
 */
export class AnimationSystem {
  /** Active animation instances by entity ID */
  private instances: Map<number, AnimationInstance> = new Map();

  /**
   * Plays an animation for an entity
   * @param entityId Entity ID to play animation for
   * @param animationName Name of the animation to play
   * @param forceRestart If true, restarts even if same animation is playing
   * @returns true if animation was started successfully
   */
  play(
    entityId: number,
    animationName: string,
    forceRestart: boolean = false
  ): boolean {
    const animation = getAnimation(animationName);
    if (!animation) {
      return false;
    }

    // Check if same animation is already playing
    const existing = this.instances.get(entityId);
    if (
      existing &&
      existing.animation.name === animationName &&
      !forceRestart &&
      !existing.finished
    ) {
      return true; // Already playing
    }

    // Get first frame duration
    const firstFrame = animation.frames[0];
    if (!firstFrame) {
      return false;
    }

    // Create new instance
    this.instances.set(entityId, {
      animation,
      currentFrameIndex: 0,
      frameTimer: firstFrame.duration,
      finished: false,
      loopCount: 0,
    });

    return true;
  }

  /**
   * Stops the animation for an entity
   * @param entityId Entity ID to stop animation for
   */
  stop(entityId: number): void {
    this.instances.delete(entityId);
  }

  /**
   * Updates all active animations by one frame
   */
  update(): void {
    for (const [, instance] of this.instances) {
      if (instance.finished) {
        continue;
      }

      // Decrement frame timer
      instance.frameTimer--;

      // Check if time to advance frame
      if (instance.frameTimer <= 0) {
        instance.currentFrameIndex++;

        // Check if animation is complete
        if (instance.currentFrameIndex >= instance.animation.frames.length) {
          if (instance.animation.loop) {
            // Loop back to start
            instance.currentFrameIndex = 0;
            instance.loopCount++;
          } else {
            // Animation finished
            instance.finished = true;

            // Handle completion behavior
            switch (instance.animation.onComplete) {
              case 'DESTROY':
                // Mark for removal, keep last frame visible
                instance.currentFrameIndex =
                  instance.animation.frames.length - 1;
                break;
              case 'RESET':
                // Reset to first frame
                instance.currentFrameIndex = 0;
                break;
              case 'HOLD_LAST':
              default:
                // Stay on last frame
                instance.currentFrameIndex =
                  instance.animation.frames.length - 1;
                break;
            }

            // Set frame timer for the final frame
            const finalFrame =
              instance.animation.frames[instance.currentFrameIndex];
            instance.frameTimer = finalFrame?.duration ?? 1;
            continue;
          }
        }

        // Set timer for new frame
        const nextFrame = instance.animation.frames[instance.currentFrameIndex];
        instance.frameTimer = nextFrame?.duration ?? 1;
      }
    }
  }

  /**
   * Gets the current frame for an entity
   * @param entityId Entity ID
   * @returns Current animation frame or null if no animation
   */
  getCurrentFrame(entityId: number): AnimationFrame | null {
    const instance = this.instances.get(entityId);
    if (!instance) {
      return null;
    }
    return instance.animation.frames[instance.currentFrameIndex] ?? null;
  }

  /**
   * Gets the current sprite key for an entity
   * @param entityId Entity ID
   * @returns Sprite key string or null if no animation
   */
  getCurrentSpriteKey(entityId: number): string | null {
    const frame = this.getCurrentFrame(entityId);
    return frame?.spriteKey ?? null;
  }

  /**
   * Gets the sprite offset for an entity
   * @param entityId Entity ID
   * @returns Offset {x, y} or null if no animation
   */
  getSpriteOffset(entityId: number): { x: number; y: number } | null {
    const frame = this.getCurrentFrame(entityId);
    if (!frame) {
      return null;
    }
    return {
      x: frame.offsetX ?? 0,
      y: frame.offsetY ?? 0,
    };
  }

  /**
   * Checks if an entity's animation has finished
   * @param entityId Entity ID
   * @returns true if finished or no animation
   */
  isFinished(entityId: number): boolean {
    const instance = this.instances.get(entityId);
    return instance?.finished ?? true;
  }

  /**
   * Checks if hitbox is active in current animation frame
   * @param entityId Entity ID
   * @returns true if hitbox active, false otherwise
   */
  isHitboxActive(entityId: number): boolean {
    const frame = this.getCurrentFrame(entityId);
    return frame?.hitboxActive ?? false;
  }

  /**
   * Gets the current frame index
   * @param entityId Entity ID
   * @returns Frame index or -1 if no animation
   */
  getCurrentFrameIndex(entityId: number): number {
    const instance = this.instances.get(entityId);
    return instance?.currentFrameIndex ?? -1;
  }

  /**
   * Gets the number of times the animation has looped
   * @param entityId Entity ID
   * @returns Loop count or 0 if no animation
   */
  getLoopCount(entityId: number): number {
    const instance = this.instances.get(entityId);
    return instance?.loopCount ?? 0;
  }

  /**
   * Gets the animation instance for an entity
   * @param entityId Entity ID
   * @returns Animation instance or undefined
   */
  getInstance(entityId: number): AnimationInstance | undefined {
    return this.instances.get(entityId);
  }

  /**
   * Checks if an entity has an active animation
   * @param entityId Entity ID
   */
  hasAnimation(entityId: number): boolean {
    return this.instances.has(entityId);
  }

  /**
   * Gets all entity IDs with active animations
   */
  getActiveEntityIds(): number[] {
    return Array.from(this.instances.keys());
  }

  /**
   * Clears all animations
   */
  clear(): void {
    this.instances.clear();
  }

  /**
   * Removes finished animations marked for destruction
   * @returns Array of entity IDs that were removed
   */
  removeFinishedDestroyAnimations(): number[] {
    const removed: number[] = [];

    for (const [entityId, instance] of this.instances) {
      if (instance.finished && instance.animation.onComplete === 'DESTROY') {
        this.instances.delete(entityId);
        removed.push(entityId);
      }
    }

    return removed;
  }

  /**
   * Gets the total number of active animations
   */
  getActiveCount(): number {
    return this.instances.size;
  }

  /**
   * Sets the frame timer directly (useful for synchronization)
   * @param entityId Entity ID
   * @param timer New timer value
   */
  setFrameTimer(entityId: number, timer: number): void {
    const instance = this.instances.get(entityId);
    if (instance) {
      instance.frameTimer = timer;
    }
  }

  /**
   * Jumps to a specific frame in the animation
   * @param entityId Entity ID
   * @param frameIndex Frame index to jump to
   * @returns true if successful
   */
  setFrameIndex(entityId: number, frameIndex: number): boolean {
    const instance = this.instances.get(entityId);
    if (!instance) {
      return false;
    }

    if (frameIndex < 0 || frameIndex >= instance.animation.frames.length) {
      return false;
    }

    instance.currentFrameIndex = frameIndex;
    const frame = instance.animation.frames[frameIndex];
    instance.frameTimer = frame?.duration ?? 1;
    instance.finished = false;

    return true;
  }
}

// ===== SINGLETON =====

let animationSystemInstance: AnimationSystem | null = null;

/**
 * Gets the global animation system instance
 */
export function getAnimationSystem(): AnimationSystem {
  if (!animationSystemInstance) {
    animationSystemInstance = new AnimationSystem();
  }
  return animationSystemInstance;
}

/**
 * Resets the animation system (useful for testing)
 */
export function resetAnimationSystem(): void {
  animationSystemInstance = null;
}
