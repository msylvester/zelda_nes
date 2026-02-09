import { NES_SPRITE_ATLAS, ATLAS_SPRITE_COUNT } from '../../../src/assets/nes/SpriteAtlas';

describe('SpriteAtlas', () => {
  it('exports a non-empty atlas', () => {
    expect(Object.keys(NES_SPRITE_ATLAS).length).toBeGreaterThan(0);
  });

  it('ATLAS_SPRITE_COUNT matches the number of entries', () => {
    expect(ATLAS_SPRITE_COUNT).toBe(Object.keys(NES_SPRITE_ATLAS).length);
  });

  it('every entry has positive width and height', () => {
    for (const [key, rect] of Object.entries(NES_SPRITE_ATLAS)) {
      expect(rect.w, `${key} width`).toBeGreaterThan(0);
      expect(rect.h, `${key} height`).toBeGreaterThan(0);
    }
  });

  it('every entry has non-negative x and y', () => {
    for (const [key, rect] of Object.entries(NES_SPRITE_ATLAS)) {
      expect(rect.x, `${key} x`).toBeGreaterThanOrEqual(0);
      expect(rect.y, `${key} y`).toBeGreaterThanOrEqual(0);
    }
  });

  it('contains basic movement sprites for all 4 directions', () => {
    const dirs = ['down', 'up', 'left', 'right'];
    for (const dir of dirs) {
      expect(NES_SPRITE_ATLAS[`link_${dir}_1`]).toBeDefined();
      expect(NES_SPRITE_ATLAS[`link_${dir}_2`]).toBeDefined();
    }
  });

  it('basic movement sprites are 16×16', () => {
    const dirs = ['down', 'up', 'left', 'right'];
    for (const dir of dirs) {
      for (const frame of [1, 2]) {
        const rect = NES_SPRITE_ATLAS[`link_${dir}_${frame}`];
        expect(rect?.w).toBe(16);
        expect(rect?.h).toBe(16);
      }
    }
  });

  it('contains sword attack sprites for wooden sword (4 dirs × 4 frames)', () => {
    const dirs = ['down', 'up', 'left', 'right'];
    for (const dir of dirs) {
      for (let f = 1; f <= 4; f++) {
        expect(NES_SPRITE_ATLAS[`link_attack_${dir}_${f}`]).toBeDefined();
      }
    }
  });

  it('contains white sword attack sprites', () => {
    expect(NES_SPRITE_ATLAS['link_attack_down_white_1']).toBeDefined();
    expect(NES_SPRITE_ATLAS['link_attack_right_white_4']).toBeDefined();
  });

  it('contains magical sword attack sprites', () => {
    expect(NES_SPRITE_ATLAS['link_attack_down_magical_1']).toBeDefined();
    expect(NES_SPRITE_ATLAS['link_attack_right_magical_4']).toBeDefined();
  });

  it('contains magical rod attack sprites', () => {
    expect(NES_SPRITE_ATLAS['link_rod_attack_down_1']).toBeDefined();
    expect(NES_SPRITE_ATLAS['link_rod_attack_right_4']).toBeDefined();
  });

  it('contains use-item and pickup sprites', () => {
    expect(NES_SPRITE_ATLAS['link_use_item_down']).toBeDefined();
    expect(NES_SPRITE_ATLAS['link_use_item_up']).toBeDefined();
    expect(NES_SPRITE_ATLAS['link_pickup_one_hand']).toBeDefined();
    expect(NES_SPRITE_ATLAS['link_pickup_two_hand']).toBeDefined();
  });

  it('contains magical shield walk sprites', () => {
    const dirs = ['down', 'up', 'left', 'right'];
    for (const dir of dirs) {
      expect(NES_SPRITE_ATLAS[`link_shield_${dir}_1`]).toBeDefined();
      expect(NES_SPRITE_ATLAS[`link_shield_${dir}_2`]).toBeDefined();
    }
  });

  it('contains standalone sword sprites', () => {
    expect(NES_SPRITE_ATLAS['sword_down']).toBeDefined();
    expect(NES_SPRITE_ATLAS['sword_up']).toBeDefined();
    expect(NES_SPRITE_ATLAS['sword_left']).toBeDefined();
    expect(NES_SPRITE_ATLAS['sword_right']).toBeDefined();
  });

  it('contains projectile sprites', () => {
    expect(NES_SPRITE_ATLAS['sword_beam']).toBeDefined();
    expect(NES_SPRITE_ATLAS['projectile_boomerang_1']).toBeDefined();
    expect(NES_SPRITE_ATLAS['projectile_fireball']).toBeDefined();
    expect(NES_SPRITE_ATLAS['candle_flame']).toBeDefined();
    expect(NES_SPRITE_ATLAS['rod_projectile']).toBeDefined();
    expect(NES_SPRITE_ATLAS['item_bomb']).toBeDefined();
  });
});
