// tests/data/enemyArchetypes.test.ts - Tests for enemy archetype data

import { describe, it, expect } from 'vitest';
import {
  OCTOROK_RED,
  OCTOROK_BLUE,
  TEKTITE_RED,
  TEKTITE_BLUE,
  MOBLIN_RED,
  MOBLIN_BLUE,
  KEESE,
  ENEMY_ARCHETYPES,
  getEnemyArchetype,
  getAllEnemyArchetypes,
  getArchetypesByBaseType,
  getArchetypesByVariant,
  isRandomWalkPattern,
  isHopPattern,
  isFlyPattern,
  isProjectileAttack,
  isContactOnlyAttack,
} from '../../src/data/enemyArchetypes';
import type { EnemyArchetype } from '../../src/types';

describe('Enemy Archetypes', () => {
  describe('Octorok Red', () => {
    it('should have correct ID and name', () => {
      expect(OCTOROK_RED.id).toBe('OCTOROK_RED');
      expect(OCTOROK_RED.name).toBe('Red Octorok');
    });

    it('should have correct base type and variant', () => {
      expect(OCTOROK_RED.baseType).toBe('OCTOROK');
      expect(OCTOROK_RED.variant).toBe('RED');
    });

    it('should have correct stats', () => {
      expect(OCTOROK_RED.hp).toBe(1);
      expect(OCTOROK_RED.contactDamage).toBe(1);
      expect(OCTOROK_RED.speed).toBe(0.5);
    });

    it('should use RANDOM_WALK movement pattern', () => {
      expect(OCTOROK_RED.movementPattern.type).toBe('RANDOM_WALK');
      expect(isRandomWalkPattern(OCTOROK_RED.movementPattern)).toBe(true);
    });

    it('should have projectile attack pattern', () => {
      expect(OCTOROK_RED.attackPattern).not.toBeNull();
      expect(OCTOROK_RED.attackPattern?.type).toBe('PROJECTILE');
      expect(isProjectileAttack(OCTOROK_RED.attackPattern)).toBe(true);
    });

    it('should fire ROCK projectiles', () => {
      if (isProjectileAttack(OCTOROK_RED.attackPattern)) {
        expect(OCTOROK_RED.attackPattern.projectileType).toBe('ROCK');
        expect(OCTOROK_RED.attackPattern.aimMode).toBe('CARDINAL_AT_LINK');
      }
    });

    it('should be knockbackable and stunnable', () => {
      expect(OCTOROK_RED.knockbackable).toBe(true);
      expect(OCTOROK_RED.boomerangStunnable).toBe(true);
      expect(OCTOROK_RED.stunDuration).toBe(60);
    });

    it('should have standard 16x16 hitbox', () => {
      expect(OCTOROK_RED.hitbox).toEqual({
        offsetX: 0,
        offsetY: 0,
        width: 16,
        height: 16,
      });
    });
  });

  describe('Octorok Blue', () => {
    it('should be faster than red variant', () => {
      expect(OCTOROK_BLUE.speed).toBeGreaterThan(OCTOROK_RED.speed);
    });

    it('should have more HP than red variant', () => {
      expect(OCTOROK_BLUE.hp).toBeGreaterThan(OCTOROK_RED.hp);
      expect(OCTOROK_BLUE.hp).toBe(2);
    });

    it('should have BLUE variant', () => {
      expect(OCTOROK_BLUE.variant).toBe('BLUE');
    });

    it('should have faster movement pattern', () => {
      if (isRandomWalkPattern(OCTOROK_BLUE.movementPattern)) {
        const blueSpeed = OCTOROK_BLUE.movementPattern.speed;
        if (isRandomWalkPattern(OCTOROK_RED.movementPattern)) {
          const redSpeed = OCTOROK_RED.movementPattern.speed;
          expect(blueSpeed).toBeGreaterThan(redSpeed);
        }
      }
    });
  });

  describe('Tektite Red', () => {
    it('should have correct ID and base type', () => {
      expect(TEKTITE_RED.id).toBe('TEKTITE_RED');
      expect(TEKTITE_RED.baseType).toBe('TEKTITE');
    });

    it('should use HOP movement pattern', () => {
      expect(TEKTITE_RED.movementPattern.type).toBe('HOP');
      expect(isHopPattern(TEKTITE_RED.movementPattern)).toBe(true);
    });

    it('should hop in random direction', () => {
      if (isHopPattern(TEKTITE_RED.movementPattern)) {
        expect(TEKTITE_RED.movementPattern.hopDirection).toBe('RANDOM');
      }
    });

    it('should have contact-only attack', () => {
      expect(TEKTITE_RED.attackPattern?.type).toBe('CONTACT_ONLY');
      expect(isContactOnlyAttack(TEKTITE_RED.attackPattern)).toBe(true);
    });
  });

  describe('Tektite Blue', () => {
    it('should hop toward Link', () => {
      if (isHopPattern(TEKTITE_BLUE.movementPattern)) {
        expect(TEKTITE_BLUE.movementPattern.hopDirection).toBe('TOWARD_LINK');
      }
    });

    it('should be faster than red variant', () => {
      expect(TEKTITE_BLUE.speed).toBeGreaterThan(TEKTITE_RED.speed);
      if (
        isHopPattern(TEKTITE_BLUE.movementPattern) &&
        isHopPattern(TEKTITE_RED.movementPattern)
      ) {
        expect(TEKTITE_BLUE.movementPattern.hopSpeed).toBeGreaterThan(
          TEKTITE_RED.movementPattern.hopSpeed
        );
      }
    });

    it('should have more HP than red variant', () => {
      expect(TEKTITE_BLUE.hp).toBe(2);
      expect(TEKTITE_RED.hp).toBe(1);
    });
  });

  describe('Moblin Red', () => {
    it('should have correct ID and base type', () => {
      expect(MOBLIN_RED.id).toBe('MOBLIN_RED');
      expect(MOBLIN_RED.baseType).toBe('MOBLIN');
    });

    it('should use RANDOM_WALK movement', () => {
      expect(MOBLIN_RED.movementPattern.type).toBe('RANDOM_WALK');
    });

    it('should fire ARROW projectiles', () => {
      if (isProjectileAttack(MOBLIN_RED.attackPattern)) {
        expect(MOBLIN_RED.attackPattern.projectileType).toBe('ARROW');
        expect(MOBLIN_RED.attackPattern.aimMode).toBe('CURRENT_FACING');
      }
    });

    it('should have 2 HP', () => {
      expect(MOBLIN_RED.hp).toBe(2);
    });
  });

  describe('Moblin Blue', () => {
    it('should have more HP than red variant', () => {
      expect(MOBLIN_BLUE.hp).toBe(3);
      expect(MOBLIN_BLUE.hp).toBeGreaterThan(MOBLIN_RED.hp);
    });

    it('should be faster than red variant', () => {
      expect(MOBLIN_BLUE.speed).toBeGreaterThan(MOBLIN_RED.speed);
    });

    it('should have faster attack cooldown', () => {
      if (
        isProjectileAttack(MOBLIN_BLUE.attackPattern) &&
        isProjectileAttack(MOBLIN_RED.attackPattern)
      ) {
        expect(MOBLIN_BLUE.attackPattern.cooldown.min).toBeLessThan(
          MOBLIN_RED.attackPattern.cooldown.min
        );
      }
    });
  });

  describe('Keese', () => {
    it('should have correct ID and base type', () => {
      expect(KEESE.id).toBe('KEESE');
      expect(KEESE.baseType).toBe('KEESE');
    });

    it('should have DEFAULT variant', () => {
      expect(KEESE.variant).toBe('DEFAULT');
    });

    it('should use FLY movement pattern', () => {
      expect(KEESE.movementPattern.type).toBe('FLY');
      expect(isFlyPattern(KEESE.movementPattern)).toBe(true);
    });

    it('should have wobbling flight', () => {
      if (isFlyPattern(KEESE.movementPattern)) {
        expect(KEESE.movementPattern.wobble).toBe(true);
        expect(KEESE.movementPattern.wobbleAmplitude).toBe(4);
      }
    });

    it('should ignore collision (flying)', () => {
      if (isFlyPattern(KEESE.movementPattern)) {
        expect(KEESE.movementPattern.ignoresCollision).toBe(true);
      }
    });

    it('should not be knockbackable', () => {
      expect(KEESE.knockbackable).toBe(false);
    });

    it('should spawn by flying in', () => {
      expect(KEESE.spawnBehavior).toBe('FLY_IN');
    });

    it('should have higher sprite priority (flying)', () => {
      expect(KEESE.spritePriority).toBe(3);
      expect(KEESE.spritePriority).toBeGreaterThan(OCTOROK_RED.spritePriority);
    });

    it('should have contact-only attack', () => {
      expect(isContactOnlyAttack(KEESE.attackPattern)).toBe(true);
    });
  });
});

describe('ENEMY_ARCHETYPES Map', () => {
  it('should contain all defined archetypes', () => {
    expect(ENEMY_ARCHETYPES.OCTOROK_RED).toBe(OCTOROK_RED);
    expect(ENEMY_ARCHETYPES.OCTOROK_BLUE).toBe(OCTOROK_BLUE);
    expect(ENEMY_ARCHETYPES.TEKTITE_RED).toBe(TEKTITE_RED);
    expect(ENEMY_ARCHETYPES.TEKTITE_BLUE).toBe(TEKTITE_BLUE);
    expect(ENEMY_ARCHETYPES.MOBLIN_RED).toBe(MOBLIN_RED);
    expect(ENEMY_ARCHETYPES.MOBLIN_BLUE).toBe(MOBLIN_BLUE);
    expect(ENEMY_ARCHETYPES.KEESE).toBe(KEESE);
  });

  it('should have 8 archetypes (5 enemy types with variants + Aquamentus boss)', () => {
    expect(Object.keys(ENEMY_ARCHETYPES)).toHaveLength(8);
  });
});

describe('getEnemyArchetype', () => {
  it('should return archetype by ID', () => {
    expect(getEnemyArchetype('OCTOROK_RED')).toBe(OCTOROK_RED);
    expect(getEnemyArchetype('KEESE')).toBe(KEESE);
  });

  it('should return undefined for unknown ID', () => {
    expect(getEnemyArchetype('UNKNOWN')).toBeUndefined();
    expect(getEnemyArchetype('')).toBeUndefined();
  });
});

describe('getAllEnemyArchetypes', () => {
  it('should return all archetypes as array', () => {
    const all = getAllEnemyArchetypes();
    expect(all).toHaveLength(8);
    expect(all).toContain(OCTOROK_RED);
    expect(all).toContain(KEESE);
  });

  it('should return archetypes with valid IDs', () => {
    const all = getAllEnemyArchetypes();
    all.forEach((archetype) => {
      expect(archetype.id).toBeTruthy();
      expect(typeof archetype.id).toBe('string');
    });
  });
});

describe('getArchetypesByBaseType', () => {
  it('should return Octorok variants', () => {
    const octoroks = getArchetypesByBaseType('OCTOROK');
    expect(octoroks).toHaveLength(2);
    expect(octoroks).toContain(OCTOROK_RED);
    expect(octoroks).toContain(OCTOROK_BLUE);
  });

  it('should return Tektite variants', () => {
    const tektites = getArchetypesByBaseType('TEKTITE');
    expect(tektites).toHaveLength(2);
    expect(tektites).toContain(TEKTITE_RED);
    expect(tektites).toContain(TEKTITE_BLUE);
  });

  it('should return Moblin variants', () => {
    const moblins = getArchetypesByBaseType('MOBLIN');
    expect(moblins).toHaveLength(2);
    expect(moblins).toContain(MOBLIN_RED);
    expect(moblins).toContain(MOBLIN_BLUE);
  });

  it('should return single Keese', () => {
    const keeses = getArchetypesByBaseType('KEESE');
    expect(keeses).toHaveLength(1);
    expect(keeses).toContain(KEESE);
  });

  it('should return empty array for unimplemented base type', () => {
    const lynels = getArchetypesByBaseType('LYNEL');
    expect(lynels).toHaveLength(0);
  });
});

describe('getArchetypesByVariant', () => {
  it('should return all RED variants', () => {
    const reds = getArchetypesByVariant('RED');
    expect(reds).toHaveLength(3);
    expect(reds).toContain(OCTOROK_RED);
    expect(reds).toContain(TEKTITE_RED);
    expect(reds).toContain(MOBLIN_RED);
  });

  it('should return all BLUE variants', () => {
    const blues = getArchetypesByVariant('BLUE');
    expect(blues).toHaveLength(3);
    expect(blues).toContain(OCTOROK_BLUE);
    expect(blues).toContain(TEKTITE_BLUE);
    expect(blues).toContain(MOBLIN_BLUE);
  });

  it('should return all DEFAULT variants', () => {
    const defaults = getArchetypesByVariant('DEFAULT');
    expect(defaults).toHaveLength(2); // KEESE and AQUAMENTUS
    expect(defaults).toContain(KEESE);
  });
});

describe('Movement Pattern Type Guards', () => {
  describe('isRandomWalkPattern', () => {
    it('should return true for RANDOM_WALK patterns', () => {
      expect(isRandomWalkPattern(OCTOROK_RED.movementPattern)).toBe(true);
      expect(isRandomWalkPattern(MOBLIN_RED.movementPattern)).toBe(true);
    });

    it('should return false for other patterns', () => {
      expect(isRandomWalkPattern(TEKTITE_RED.movementPattern)).toBe(false);
      expect(isRandomWalkPattern(KEESE.movementPattern)).toBe(false);
    });
  });

  describe('isHopPattern', () => {
    it('should return true for HOP patterns', () => {
      expect(isHopPattern(TEKTITE_RED.movementPattern)).toBe(true);
      expect(isHopPattern(TEKTITE_BLUE.movementPattern)).toBe(true);
    });

    it('should return false for other patterns', () => {
      expect(isHopPattern(OCTOROK_RED.movementPattern)).toBe(false);
      expect(isHopPattern(KEESE.movementPattern)).toBe(false);
    });
  });

  describe('isFlyPattern', () => {
    it('should return true for FLY patterns', () => {
      expect(isFlyPattern(KEESE.movementPattern)).toBe(true);
    });

    it('should return false for other patterns', () => {
      expect(isFlyPattern(OCTOROK_RED.movementPattern)).toBe(false);
      expect(isFlyPattern(TEKTITE_RED.movementPattern)).toBe(false);
    });
  });
});

describe('Attack Pattern Type Guards', () => {
  describe('isProjectileAttack', () => {
    it('should return true for PROJECTILE attacks', () => {
      expect(isProjectileAttack(OCTOROK_RED.attackPattern)).toBe(true);
      expect(isProjectileAttack(MOBLIN_RED.attackPattern)).toBe(true);
    });

    it('should return false for CONTACT_ONLY attacks', () => {
      expect(isProjectileAttack(TEKTITE_RED.attackPattern)).toBe(false);
      expect(isProjectileAttack(KEESE.attackPattern)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isProjectileAttack(null)).toBe(false);
    });
  });

  describe('isContactOnlyAttack', () => {
    it('should return true for CONTACT_ONLY attacks', () => {
      expect(isContactOnlyAttack(TEKTITE_RED.attackPattern)).toBe(true);
      expect(isContactOnlyAttack(KEESE.attackPattern)).toBe(true);
    });

    it('should return false for PROJECTILE attacks', () => {
      expect(isContactOnlyAttack(OCTOROK_RED.attackPattern)).toBe(false);
      expect(isContactOnlyAttack(MOBLIN_RED.attackPattern)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isContactOnlyAttack(null)).toBe(false);
    });
  });
});

describe('Archetype Consistency', () => {
  it('all archetypes should have valid sprite dimensions', () => {
    getAllEnemyArchetypes().forEach((archetype) => {
      expect(archetype.spriteWidth).toBeGreaterThan(0);
      expect(archetype.spriteHeight).toBeGreaterThan(0);
    });
  });

  it('all archetypes should have non-negative HP', () => {
    getAllEnemyArchetypes().forEach((archetype) => {
      expect(archetype.hp).toBeGreaterThan(0);
    });
  });

  it('all archetypes should have valid hitbox', () => {
    getAllEnemyArchetypes().forEach((archetype) => {
      expect(archetype.hitbox.width).toBeGreaterThan(0);
      expect(archetype.hitbox.height).toBeGreaterThan(0);
    });
  });

  it('all archetypes should have valid spawn behavior', () => {
    const validBehaviors = [
      'IMMEDIATE',
      'EMERGE_GROUND',
      'EMERGE_WATER',
      'FLY_IN',
      'FALL_FROM_ABOVE',
      'STATIONARY',
    ];
    getAllEnemyArchetypes().forEach((archetype) => {
      expect(validBehaviors).toContain(archetype.spawnBehavior);
    });
  });

  it('all archetypes should have valid sprite priority', () => {
    getAllEnemyArchetypes().forEach((archetype) => {
      expect(archetype.spritePriority).toBeGreaterThanOrEqual(0);
      expect(archetype.spritePriority).toBeLessThanOrEqual(7);
    });
  });

  it('all archetypes with projectile attack should have valid projectile type', () => {
    const validProjectileTypes = [
      'ROCK',
      'ARROW',
      'MAGIC_BEAM',
      'FIREBALL',
      'ZORA_FIREBALL',
      'SWORD_BEAM',
    ];
    getAllEnemyArchetypes().forEach((archetype) => {
      if (isProjectileAttack(archetype.attackPattern)) {
        expect(validProjectileTypes).toContain(
          archetype.attackPattern.projectileType
        );
      }
    });
  });

  it('all archetypes should have speed matching movement pattern speed', () => {
    getAllEnemyArchetypes().forEach((archetype) => {
      const pattern = archetype.movementPattern;
      if (pattern.type === 'RANDOM_WALK') {
        expect(archetype.speed).toBe(pattern.speed);
      } else if (pattern.type === 'HOP') {
        expect(archetype.speed).toBe(pattern.hopSpeed);
      } else if (pattern.type === 'FLY') {
        expect(archetype.speed).toBe(pattern.speed);
      }
    });
  });
});

describe('Damage Vulnerabilities', () => {
  it('all archetypes should have defined vulnerabilities', () => {
    getAllEnemyArchetypes().forEach((archetype) => {
      expect(archetype.vulnerabilities).toBeDefined();
      expect(archetype.vulnerabilities.sword).toBeDefined();
      expect(archetype.vulnerabilities.bomb).toBeDefined();
      expect(archetype.vulnerabilities.arrow).toBeDefined();
    });
  });

  it('standard enemies should have sword vulnerability of 1', () => {
    // All our basic enemies take normal sword damage
    getAllEnemyArchetypes().forEach((archetype) => {
      expect(archetype.vulnerabilities.sword).toBe(1);
    });
  });

  it('boomerang should stun but not damage (vulnerability 0)', () => {
    getAllEnemyArchetypes().forEach((archetype) => {
      expect(archetype.vulnerabilities.boomerang).toBe(0);
    });
  });
});

describe('Enemy Flags', () => {
  it('all standard enemies should have default flags', () => {
    getAllEnemyArchetypes().forEach((archetype) => {
      expect(archetype.flags.swordImmune).toBe(false);
      expect(archetype.flags.stealsItem).toBe(false);
      expect(archetype.flags.warpsLink).toBe(false);
      expect(archetype.flags.splitsOnDeath).toBe(false);
      expect(archetype.flags.splitInto).toEqual([]);
    });
  });
});
