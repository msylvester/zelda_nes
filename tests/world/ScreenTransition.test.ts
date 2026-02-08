// ScreenTransition.test.ts - Tests for screen transition system

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScreenTransition,
  getScreenTransition,
  resetScreenTransition,
  TransitionConfig,
  ScreenTransitionType,
} from '../../src/world/ScreenTransition';
import {
  SCROLL_SPEED,
  HORIZONTAL_SCROLL_FRAMES,
  VERTICAL_SCROLL_FRAMES,
  PLAY_AREA_WIDTH,
  PLAY_AREA_HEIGHT,
  TILE_SIZE,
} from '../../src/constants';
import type { TileData } from '../../src/types';

describe('ScreenTransition', () => {
  let transition: ScreenTransition;

  // Helper to create sample tiles
  const createSampleTiles = (): TileData[] => {
    const tiles: TileData[] = [];
    for (let i = 0; i < 176; i++) {
      tiles.push({ tileId: i % 8, collision: 'PASSABLE' });
    }
    return tiles;
  };

  const createScrollConfig = (direction: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN'): TransitionConfig => ({
    type: 'SCROLL',
    direction,
    fromScreenCol: 7,
    fromScreenRow: 7,
    toScreenCol: direction === 'LEFT' ? 6 : direction === 'RIGHT' ? 8 : 7,
    toScreenRow: direction === 'UP' ? 6 : direction === 'DOWN' ? 8 : 7,
    fromTiles: createSampleTiles(),
    toTiles: createSampleTiles(),
  });

  beforeEach(() => {
    resetScreenTransition();
    transition = new ScreenTransition();
  });

  describe('Initial State', () => {
    it('should start in inactive state', () => {
      expect(transition.isActive()).toBe(false);
      expect(transition.isComplete()).toBe(false);
    });

    it('should return zero scroll offset when inactive', () => {
      const offset = transition.getScrollOffset();
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('should return zero progress when inactive', () => {
      expect(transition.getProgress()).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance from getScreenTransition', () => {
      const instance1 = getScreenTransition();
      const instance2 = getScreenTransition();
      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after reset', () => {
      const instance1 = getScreenTransition();
      resetScreenTransition();
      const instance2 = getScreenTransition();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Starting Transitions', () => {
    it('should become active when started', () => {
      transition.start(createScrollConfig('RIGHT'));
      expect(transition.isActive()).toBe(true);
    });

    it('should store the transition direction', () => {
      transition.start(createScrollConfig('LEFT'));
      expect(transition.getDirection()).toBe('LEFT');
    });

    it('should store the transition type', () => {
      transition.start(createScrollConfig('RIGHT'));
      expect(transition.getType()).toBe('SCROLL');
    });

    it('should store source and target screen coordinates', () => {
      transition.start(createScrollConfig('RIGHT'));
      expect(transition.getSourceScreen()).toEqual({ col: 7, row: 7 });
      expect(transition.getTargetScreen()).toEqual({ col: 8, row: 7 });
    });

    it('should store from and to tiles', () => {
      const config = createScrollConfig('RIGHT');
      transition.start(config);
      expect(transition.getFromTiles().length).toBe(176);
      expect(transition.getToTiles().length).toBe(176);
    });

    it('should start at frame 0', () => {
      transition.start(createScrollConfig('RIGHT'));
      expect(transition.getCurrentFrame()).toBe(0);
    });
  });

  describe('Horizontal Scroll Transitions', () => {
    it('should take 64 frames for horizontal scroll', () => {
      transition.start(createScrollConfig('RIGHT'));
      expect(transition.getTotalFrames()).toBe(HORIZONTAL_SCROLL_FRAMES);
      expect(transition.getTotalFrames()).toBe(64);
    });

    it('should scroll right correctly', () => {
      transition.start(createScrollConfig('RIGHT'));

      // At frame 0, no offset yet
      expect(transition.getScrollOffset()).toEqual({ x: 0, y: 0 });

      // After 1 update, moved 4 pixels
      transition.update();
      expect(transition.getScrollOffset()).toEqual({ x: -SCROLL_SPEED, y: 0 });

      // After 10 updates, moved 40 pixels
      for (let i = 0; i < 9; i++) transition.update();
      expect(transition.getScrollOffset()).toEqual({ x: -40, y: 0 });
    });

    it('should scroll left correctly', () => {
      transition.start(createScrollConfig('LEFT'));

      transition.update();
      expect(transition.getScrollOffset()).toEqual({ x: SCROLL_SPEED, y: 0 });

      for (let i = 0; i < 9; i++) transition.update();
      expect(transition.getScrollOffset()).toEqual({ x: 40, y: 0 });
    });

    it('should complete after 64 frames', () => {
      transition.start(createScrollConfig('RIGHT'));

      for (let i = 0; i < 63; i++) {
        transition.update();
        expect(transition.isComplete()).toBe(false);
      }

      transition.update(); // Frame 64
      expect(transition.isComplete()).toBe(true);
    });

    it('should have full offset at completion', () => {
      transition.start(createScrollConfig('RIGHT'));

      for (let i = 0; i < 64; i++) {
        transition.update();
      }

      // 64 frames * 4 pixels/frame = 256 pixels = PLAY_AREA_WIDTH
      expect(transition.getScrollOffset()).toEqual({ x: -PLAY_AREA_WIDTH, y: 0 });
    });
  });

  describe('Vertical Scroll Transitions', () => {
    it('should take 44 frames for vertical scroll', () => {
      transition.start(createScrollConfig('UP'));
      expect(transition.getTotalFrames()).toBe(VERTICAL_SCROLL_FRAMES);
      expect(transition.getTotalFrames()).toBe(44);
    });

    it('should scroll up correctly', () => {
      transition.start(createScrollConfig('UP'));

      transition.update();
      expect(transition.getScrollOffset()).toEqual({ x: 0, y: SCROLL_SPEED });

      for (let i = 0; i < 9; i++) transition.update();
      expect(transition.getScrollOffset()).toEqual({ x: 0, y: 40 });
    });

    it('should scroll down correctly', () => {
      transition.start(createScrollConfig('DOWN'));

      transition.update();
      expect(transition.getScrollOffset()).toEqual({ x: 0, y: -SCROLL_SPEED });

      for (let i = 0; i < 9; i++) transition.update();
      expect(transition.getScrollOffset()).toEqual({ x: 0, y: -40 });
    });

    it('should complete after 44 frames', () => {
      transition.start(createScrollConfig('DOWN'));

      for (let i = 0; i < 43; i++) {
        transition.update();
        expect(transition.isComplete()).toBe(false);
      }

      transition.update(); // Frame 44
      expect(transition.isComplete()).toBe(true);
    });

    it('should have full offset at completion', () => {
      transition.start(createScrollConfig('DOWN'));

      for (let i = 0; i < 44; i++) {
        transition.update();
      }

      // 44 frames * 4 pixels/frame = 176 pixels = PLAY_AREA_HEIGHT
      expect(transition.getScrollOffset()).toEqual({ x: 0, y: -PLAY_AREA_HEIGHT });
    });
  });

  describe('From/To Screen Positions', () => {
    it('should position "to" screen correctly when scrolling right', () => {
      transition.start(createScrollConfig('RIGHT'));
      transition.update();

      const fromPos = transition.getFromScreenPosition();
      const toPos = transition.getToScreenPosition();

      // From screen moves left (negative)
      expect(fromPos.x).toBe(-SCROLL_SPEED);
      // To screen starts at PLAY_AREA_WIDTH and moves left
      expect(toPos.x).toBe(PLAY_AREA_WIDTH - SCROLL_SPEED);
    });

    it('should position "to" screen correctly when scrolling left', () => {
      transition.start(createScrollConfig('LEFT'));
      transition.update();

      const toPos = transition.getToScreenPosition();

      // To screen starts at -PLAY_AREA_WIDTH and moves right
      expect(toPos.x).toBe(SCROLL_SPEED - PLAY_AREA_WIDTH);
    });

    it('should position "to" screen correctly when scrolling down', () => {
      transition.start(createScrollConfig('DOWN'));
      transition.update();

      const toPos = transition.getToScreenPosition();

      // To screen starts at PLAY_AREA_HEIGHT and moves up
      expect(toPos.y).toBe(PLAY_AREA_HEIGHT - SCROLL_SPEED);
    });

    it('should position "to" screen correctly when scrolling up', () => {
      transition.start(createScrollConfig('UP'));
      transition.update();

      const toPos = transition.getToScreenPosition();

      // To screen starts at -PLAY_AREA_HEIGHT and moves down
      expect(toPos.y).toBe(SCROLL_SPEED - PLAY_AREA_HEIGHT);
    });
  });

  describe('FADE Transitions', () => {
    const createFadeConfig = (): TransitionConfig => ({
      type: 'FADE',
      direction: 'DOWN',
      fromScreenCol: 0,
      fromScreenRow: 0,
      toScreenCol: 0,
      toScreenRow: 1,
      fromTiles: createSampleTiles(),
      toTiles: createSampleTiles(),
    });

    it('should take 9 frames for fade transition', () => {
      transition.start(createFadeConfig());
      expect(transition.getTotalFrames()).toBe(9);
    });

    it('should fade out during first 4 frames', () => {
      transition.start(createFadeConfig());

      // Frame 0
      expect(transition.getFadeAlpha()).toBe(0.25);

      transition.update();
      expect(transition.getFadeAlpha()).toBe(0.5); // Frame 1

      transition.update();
      expect(transition.getFadeAlpha()).toBe(0.75); // Frame 2

      transition.update();
      expect(transition.getFadeAlpha()).toBe(1); // Frame 3
    });

    it('should be fully black at frame 4', () => {
      transition.start(createFadeConfig());

      for (let i = 0; i < 4; i++) transition.update();
      expect(transition.getFadeAlpha()).toBe(1); // Frame 4
    });

    it('should fade in during frames 5-8', () => {
      transition.start(createFadeConfig());

      for (let i = 0; i < 5; i++) transition.update();
      expect(transition.getFadeAlpha()).toBe(0.75); // Frame 5

      transition.update();
      expect(transition.getFadeAlpha()).toBe(0.5); // Frame 6

      transition.update();
      expect(transition.getFadeAlpha()).toBe(0.25); // Frame 7

      transition.update();
      expect(transition.getFadeAlpha()).toBe(0); // Frame 8
    });

    it('should indicate load point at frame 4', () => {
      transition.start(createFadeConfig());

      for (let i = 0; i < 4; i++) {
        expect(transition.shouldLoadNewScreen()).toBe(false);
        transition.update();
      }
      expect(transition.shouldLoadNewScreen()).toBe(true); // Frame 4
      transition.update();
      expect(transition.shouldLoadNewScreen()).toBe(false);
    });
  });

  describe('WIPE Transitions', () => {
    const createWipeConfig = (): TransitionConfig => ({
      type: 'WIPE',
      direction: 'DOWN',
      fromScreenCol: 7,
      fromScreenRow: 7,
      toScreenCol: 7,
      toScreenRow: 0, // Cave/dungeon
      fromTiles: createSampleTiles(),
      toTiles: createSampleTiles(),
    });

    it('should take 33 frames for wipe transition', () => {
      transition.start(createWipeConfig());
      expect(transition.getTotalFrames()).toBe(33);
    });

    it('should close during first 16 frames', () => {
      transition.start(createWipeConfig());

      // Frame 0
      let wipe = transition.getWipeProgress();
      expect(wipe.progress).toBeCloseTo(1 / 16, 5);
      expect(wipe.closing).toBe(true);

      // Frame 8 (halfway closing)
      for (let i = 0; i < 8; i++) transition.update();
      wipe = transition.getWipeProgress();
      expect(wipe.progress).toBeCloseTo(9 / 16, 5);
      expect(wipe.closing).toBe(true);

      // Frame 15 (almost closed)
      for (let i = 0; i < 7; i++) transition.update();
      wipe = transition.getWipeProgress();
      expect(wipe.progress).toBe(1);
      expect(wipe.closing).toBe(true);
    });

    it('should be fully closed at frame 16', () => {
      transition.start(createWipeConfig());

      for (let i = 0; i < 16; i++) transition.update();
      const wipe = transition.getWipeProgress();
      expect(wipe.progress).toBe(1);
    });

    it('should open during frames 17-32', () => {
      transition.start(createWipeConfig());

      for (let i = 0; i < 17; i++) transition.update();
      let wipe = transition.getWipeProgress();
      expect(wipe.closing).toBe(false);
      expect(wipe.progress).toBeCloseTo(15 / 16, 5);

      // Frame 25 (halfway opening)
      for (let i = 0; i < 8; i++) transition.update();
      wipe = transition.getWipeProgress();
      expect(wipe.closing).toBe(false);
      expect(wipe.progress).toBeCloseTo(7 / 16, 5);
    });

    it('should indicate load point at frame 16', () => {
      transition.start(createWipeConfig());

      for (let i = 0; i < 16; i++) {
        expect(transition.shouldLoadNewScreen()).toBe(false);
        transition.update();
      }
      expect(transition.shouldLoadNewScreen()).toBe(true); // Frame 16
      transition.update();
      expect(transition.shouldLoadNewScreen()).toBe(false);
    });
  });

  describe('Player Position After Transition', () => {
    it('should position player on right edge after scrolling left', () => {
      const pos = transition.getPlayerPositionAfterTransition('LEFT', 100, 80);
      expect(pos.x).toBe(PLAY_AREA_WIDTH - TILE_SIZE);
      expect(pos.y).toBe(80);
    });

    it('should position player on left edge after scrolling right', () => {
      const pos = transition.getPlayerPositionAfterTransition('RIGHT', 100, 80);
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(80);
    });

    it('should position player at bottom after scrolling up', () => {
      const pos = transition.getPlayerPositionAfterTransition('UP', 100, 80);
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(PLAY_AREA_HEIGHT - TILE_SIZE);
    });

    it('should position player at top after scrolling down', () => {
      const pos = transition.getPlayerPositionAfterTransition('DOWN', 100, 80);
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(0);
    });
  });

  describe('Player Position During Transition', () => {
    it('should move player with scroll offset', () => {
      transition.start(createScrollConfig('RIGHT'));
      transition.update();

      const pos = transition.getPlayerPositionDuringTransition(100, 80);
      expect(pos.x).toBe(100 - SCROLL_SPEED);
      expect(pos.y).toBe(80);
    });

    it('should not move player for non-scroll transitions', () => {
      transition.start({
        type: 'FADE',
        direction: 'DOWN',
        fromScreenCol: 0,
        fromScreenRow: 0,
        toScreenCol: 0,
        toScreenRow: 1,
        fromTiles: createSampleTiles(),
        toTiles: createSampleTiles(),
      });
      transition.update();

      const pos = transition.getPlayerPositionDuringTransition(100, 80);
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(80);
    });
  });

  describe('Finalize and Cancel', () => {
    it('should return target coordinates on finalize', () => {
      transition.start(createScrollConfig('RIGHT'));
      for (let i = 0; i < 64; i++) transition.update();

      const result = transition.finalize();
      expect(result).toEqual({ col: 8, row: 7 });
    });

    it('should reset to inactive state after finalize', () => {
      transition.start(createScrollConfig('RIGHT'));
      transition.finalize();

      expect(transition.isActive()).toBe(false);
      expect(transition.isComplete()).toBe(false);
    });

    it('should reset to inactive state on cancel', () => {
      transition.start(createScrollConfig('RIGHT'));
      for (let i = 0; i < 10; i++) transition.update();

      transition.cancel();
      expect(transition.isActive()).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
    it('should report progress from 0 to 1', () => {
      transition.start(createScrollConfig('RIGHT'));

      expect(transition.getProgress()).toBe(0);

      for (let i = 0; i < 32; i++) transition.update();
      expect(transition.getProgress()).toBe(0.5);

      for (let i = 0; i < 32; i++) transition.update();
      expect(transition.getProgress()).toBe(1);
    });

    it('should cap progress at 1', () => {
      transition.start(createScrollConfig('RIGHT'));

      for (let i = 0; i < 100; i++) transition.update();
      expect(transition.getProgress()).toBe(1);
    });
  });

  describe('ScreenTransitionData Conversion', () => {
    it('should convert state to ScreenTransitionData', () => {
      transition.start(createScrollConfig('RIGHT'));
      transition.update();

      const data = transition.toScreenTransitionData();

      expect(data.type).toBe('SCROLL');
      expect(data.direction).toBe('RIGHT');
      expect(data.fromScreenCol).toBe(7);
      expect(data.fromScreenRow).toBe(7);
      expect(data.toScreenCol).toBe(8);
      expect(data.toScreenRow).toBe(7);
      expect(data.totalFrames).toBe(64);
      expect(data.progress).toBeCloseTo(1 / 64, 5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle update when inactive', () => {
      transition.update();
      expect(transition.isActive()).toBe(false);
      expect(transition.getCurrentFrame()).toBe(0);
    });

    it('should handle getScrollOffset for non-scroll types', () => {
      transition.start({
        type: 'FADE',
        direction: 'DOWN',
        fromScreenCol: 0,
        fromScreenRow: 0,
        toScreenCol: 0,
        toScreenRow: 1,
        fromTiles: createSampleTiles(),
        toTiles: createSampleTiles(),
      });

      const offset = transition.getScrollOffset();
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('should handle getFadeAlpha for non-fade types', () => {
      transition.start(createScrollConfig('RIGHT'));
      expect(transition.getFadeAlpha()).toBe(0);
    });

    it('should handle getWipeProgress for non-wipe types', () => {
      transition.start(createScrollConfig('RIGHT'));
      const wipe = transition.getWipeProgress();
      expect(wipe.progress).toBe(0);
      expect(wipe.closing).toBe(false);
    });
  });
});
