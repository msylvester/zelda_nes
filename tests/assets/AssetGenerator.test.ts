import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import {
  AssetGenerator,
  getAssetGenerator,
  generateGameAssets,
  PLACEHOLDER_COLORS,
  type SpriteKey,
  type TileKey,
} from '../../src/assets/AssetGenerator';

// Mock canvas and context for Node.js environment
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  canvas: MockCanvas;

  constructor(canvas: MockCanvas) {
    this.canvas = canvas;
  }

  clearRect = vi.fn();
  fillRect = vi.fn();
  strokeRect = vi.fn();
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  closePath = vi.fn();
  fill = vi.fn();
  stroke = vi.fn();
}

class MockCanvas {
  width = 0;
  height = 0;
  private ctx: MockCanvasRenderingContext2D;

  constructor() {
    this.ctx = new MockCanvasRenderingContext2D(this);
  }

  getContext(type: string): MockCanvasRenderingContext2D | null {
    if (type === '2d') {
      return this.ctx;
    }
    return null;
  }
}

// Mock document.createElement before tests
beforeAll(() => {
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return new MockCanvas();
      }
      return null;
    },
  });
});

describe('AssetGenerator', () => {
  let generator: AssetGenerator;

  beforeEach(() => {
    generator = new AssetGenerator();
  });

  describe('initialization', () => {
    it('should start with assets not ready', () => {
      expect(generator.isReady()).toBe(false);
    });

    it('should have no sprites before generation', () => {
      expect(generator.getSprite('link_down_1')).toBeUndefined();
    });

    it('should have no tiles before generation', () => {
      expect(generator.getTile('tile_grass')).toBeUndefined();
    });
  });

  describe('generate()', () => {
    it('should mark assets as ready after generation', () => {
      generator.generate();
      expect(generator.isReady()).toBe(true);
    });

    it('should return GeneratedAssets object', () => {
      const assets = generator.generate();
      expect(assets).toHaveProperty('sprites');
      expect(assets).toHaveProperty('tiles');
      expect(assets).toHaveProperty('ready');
      expect(assets.ready).toBe(true);
    });
  });

  describe('Link sprites', () => {
    beforeEach(() => {
      generator.generate();
    });

    it('should generate Link walking sprites for all directions', () => {
      const directions = ['down', 'up', 'left', 'right'];
      const frames = [1, 2];

      for (const dir of directions) {
        for (const frame of frames) {
          const key = `link_${dir}_${frame}` as SpriteKey;
          const sprite = generator.getSprite(key);
          expect(sprite).toBeDefined();
          expect(sprite?.width).toBe(16);
          expect(sprite?.height).toBe(16);
        }
      }
    });

    it('should generate Link attack sprites for all directions', () => {
      const directions = ['down', 'up', 'left', 'right'];

      for (const dir of directions) {
        const key = `link_attack_${dir}` as SpriteKey;
        const sprite = generator.getSprite(key);
        expect(sprite).toBeDefined();
        expect(sprite?.width).toBe(16);
        expect(sprite?.height).toBe(16);
      }
    });
  });

  describe('Sword sprites', () => {
    beforeEach(() => {
      generator.generate();
    });

    it('should generate sword sprites for all directions', () => {
      // Vertical swords are 8x16
      expect(generator.getSprite('sword_up')?.width).toBe(8);
      expect(generator.getSprite('sword_up')?.height).toBe(16);
      expect(generator.getSprite('sword_down')?.width).toBe(8);
      expect(generator.getSprite('sword_down')?.height).toBe(16);

      // Horizontal swords are 16x8
      expect(generator.getSprite('sword_left')?.width).toBe(16);
      expect(generator.getSprite('sword_left')?.height).toBe(8);
      expect(generator.getSprite('sword_right')?.width).toBe(16);
      expect(generator.getSprite('sword_right')?.height).toBe(8);
    });

    it('should generate sword beam sprite', () => {
      const beam = generator.getSprite('sword_beam');
      expect(beam).toBeDefined();
      expect(beam?.width).toBe(8);
      expect(beam?.height).toBe(8);
    });
  });

  describe('Enemy sprites', () => {
    beforeEach(() => {
      generator.generate();
    });

    it('should generate Octorok sprites (red and blue variants)', () => {
      for (const variant of ['red', 'blue']) {
        for (const frame of [1, 2]) {
          const key = `enemy_octorok_${variant}_${frame}` as SpriteKey;
          const sprite = generator.getSprite(key);
          expect(sprite).toBeDefined();
          expect(sprite?.width).toBe(16);
          expect(sprite?.height).toBe(16);
        }
      }
    });

    it('should generate Tektite sprites', () => {
      for (const frame of [1, 2]) {
        const key = `enemy_tektite_${frame}` as SpriteKey;
        expect(generator.getSprite(key)).toBeDefined();
      }
    });

    it('should generate Moblin sprites (red and blue variants)', () => {
      for (const variant of ['red', 'blue']) {
        for (const frame of [1, 2]) {
          const key = `enemy_moblin_${variant}_${frame}` as SpriteKey;
          expect(generator.getSprite(key)).toBeDefined();
        }
      }
    });

    it('should generate Keese sprites', () => {
      for (const frame of [1, 2]) {
        const key = `enemy_keese_${frame}` as SpriteKey;
        expect(generator.getSprite(key)).toBeDefined();
      }
    });

    it('should generate Aquamentus (boss) sprites at larger size', () => {
      for (const frame of [1, 2]) {
        const key = `enemy_aquamentus_${frame}` as SpriteKey;
        const sprite = generator.getSprite(key);
        expect(sprite).toBeDefined();
        expect(sprite?.width).toBe(32);
        expect(sprite?.height).toBe(32);
      }
    });

    it('should generate death puff animation frames', () => {
      for (let frame = 1; frame <= 3; frame++) {
        const key = `enemy_death_puff_${frame}` as SpriteKey;
        expect(generator.getSprite(key)).toBeDefined();
      }
    });
  });

  describe('Projectile sprites', () => {
    beforeEach(() => {
      generator.generate();
    });

    it('should generate rock projectile', () => {
      expect(generator.getSprite('projectile_rock')).toBeDefined();
    });

    it('should generate fireball projectile', () => {
      expect(generator.getSprite('projectile_fireball')).toBeDefined();
    });

    it('should generate boomerang projectile', () => {
      expect(generator.getSprite('projectile_boomerang')).toBeDefined();
    });
  });

  describe('Item sprites', () => {
    beforeEach(() => {
      generator.generate();
    });

    it('should generate heart item', () => {
      expect(generator.getSprite('item_heart')).toBeDefined();
    });

    it('should generate rupee items (green and blue)', () => {
      expect(generator.getSprite('item_rupee_green')).toBeDefined();
      expect(generator.getSprite('item_rupee_blue')).toBeDefined();
    });

    it('should generate bomb item', () => {
      expect(generator.getSprite('item_bomb')).toBeDefined();
    });

    it('should generate key item', () => {
      expect(generator.getSprite('item_key')).toBeDefined();
    });

    it('should generate fairy item', () => {
      expect(generator.getSprite('item_fairy')).toBeDefined();
    });

    it('should generate triforce piece', () => {
      expect(generator.getSprite('item_triforce')).toBeDefined();
    });

    it('should generate heart container', () => {
      expect(generator.getSprite('item_heart_container')).toBeDefined();
    });
  });

  describe('HUD sprites', () => {
    beforeEach(() => {
      generator.generate();
    });

    it('should generate HUD hearts (full, half, empty)', () => {
      expect(generator.getSprite('hud_heart_full')).toBeDefined();
      expect(generator.getSprite('hud_heart_half')).toBeDefined();
      expect(generator.getSprite('hud_heart_empty')).toBeDefined();
    });

    it('should generate HUD icons', () => {
      expect(generator.getSprite('hud_rupee_icon')).toBeDefined();
      expect(generator.getSprite('hud_key_icon')).toBeDefined();
      expect(generator.getSprite('hud_bomb_icon')).toBeDefined();
    });

    it('should generate minimap sprites', () => {
      expect(generator.getSprite('hud_minimap_bg')).toBeDefined();
      expect(generator.getSprite('hud_minimap_room')).toBeDefined();
      expect(generator.getSprite('hud_minimap_current')).toBeDefined();
    });

    it('should have correct minimap dimensions', () => {
      const bg = generator.getSprite('hud_minimap_bg');
      expect(bg?.width).toBe(64);
      expect(bg?.height).toBe(32);

      const room = generator.getSprite('hud_minimap_room');
      expect(room?.width).toBe(4);
      expect(room?.height).toBe(4);
    });
  });

  describe('Tile generation', () => {
    beforeEach(() => {
      generator.generate();
    });

    it('should generate overworld tiles', () => {
      const overworldTiles: TileKey[] = [
        'tile_grass',
        'tile_ground',
        'tile_water',
        'tile_rock',
        'tile_tree',
        'tile_bush',
        'tile_stairs',
        'tile_pit',
        'tile_wall',
      ];

      for (const key of overworldTiles) {
        const tile = generator.getTile(key);
        expect(tile).toBeDefined();
        expect(tile?.width).toBe(16);
        expect(tile?.height).toBe(16);
      }
    });

    it('should generate dungeon tiles', () => {
      const dungeonTiles: TileKey[] = [
        'tile_dungeon_floor',
        'tile_dungeon_wall',
        'tile_dungeon_block',
      ];

      for (const key of dungeonTiles) {
        expect(generator.getTile(key)).toBeDefined();
      }
    });

    it('should generate door tiles', () => {
      const doorTiles: TileKey[] = [
        'tile_door_open',
        'tile_door_locked',
        'tile_door_shutter',
      ];

      for (const key of doorTiles) {
        expect(generator.getTile(key)).toBeDefined();
      }
    });
  });

  describe('getAssets()', () => {
    it('should return the full assets object', () => {
      generator.generate();
      const assets = generator.getAssets();

      expect(assets.sprites).toBeInstanceOf(Map);
      expect(assets.tiles).toBeInstanceOf(Map);
      expect(assets.ready).toBe(true);
    });
  });
});

describe('getAssetGenerator()', () => {
  it('should return same instance on multiple calls', () => {
    const gen1 = getAssetGenerator();
    const gen2 = getAssetGenerator();
    expect(gen1).toBe(gen2);
  });
});

describe('generateGameAssets()', () => {
  it('should generate and return assets', () => {
    const assets = generateGameAssets();
    expect(assets.ready).toBe(true);
    expect(assets.sprites.size).toBeGreaterThan(0);
    expect(assets.tiles.size).toBeGreaterThan(0);
  });

  it('should not regenerate if already ready', () => {
    const assets1 = generateGameAssets();
    const assets2 = generateGameAssets();
    expect(assets1).toBe(assets2);
  });
});

describe('PLACEHOLDER_COLORS', () => {
  it('should define Link colors', () => {
    expect(PLACEHOLDER_COLORS.LINK_BODY).toBe('#228B22');
    expect(PLACEHOLDER_COLORS.LINK_SKIN).toBe('#F5DEB3');
    expect(PLACEHOLDER_COLORS.LINK_OUTLINE).toBe('#006400');
  });

  it('should define enemy colors', () => {
    expect(PLACEHOLDER_COLORS.ENEMY_RED).toBeDefined();
    expect(PLACEHOLDER_COLORS.ENEMY_BLUE).toBeDefined();
  });

  it('should define tile colors', () => {
    expect(PLACEHOLDER_COLORS.TILE_GRASS).toBeDefined();
    expect(PLACEHOLDER_COLORS.TILE_GROUND).toBeDefined();
    expect(PLACEHOLDER_COLORS.TILE_WATER).toBeDefined();
  });

  it('should define HUD colors', () => {
    expect(PLACEHOLDER_COLORS.HUD_HEART_FULL).toBe('#FF0000');
    expect(PLACEHOLDER_COLORS.HUD_RUPEE).toBe('#00FF00');
    expect(PLACEHOLDER_COLORS.HUD_KEY).toBe('#FFD700');
  });

  it('should define item colors', () => {
    expect(PLACEHOLDER_COLORS.ITEM_HEART).toBeDefined();
    expect(PLACEHOLDER_COLORS.ITEM_TRIFORCE).toBe('#FFD700');
  });
});
