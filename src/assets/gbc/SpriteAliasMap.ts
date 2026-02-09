/**
 * Maps oracle character sprites to gameplay sprite keys.
 *
 * The game code (Player.ts, Enemy.ts) requests sprites by keys like
 * "link_walk_down_0" or "octorok_red_0", but the oracle loader registers
 * them as "oracle_marin_walk_down_1". This module bridges the gap by
 * defining which oracle character + palette maps to which gameplay keys.
 */

import type { GbcPalette } from './GbcPalette';
import { DEFAULT_PALETTE, RED_PALETTE, BLUE_PALETTE } from './GbcPalette';

export interface SpriteAliasConfig {
  /** Oracle character name (must match CHARACTER_NAMES in GbcSpriteLoader) */
  oracleCharacter: string;
  /** Palette to use when composing sprites for this alias */
  palette: GbcPalette;
  /**
   * Maps an oracle frame name (e.g. "walk_down_1") to gameplay sprite keys.
   * Returns an array of keys to register the composed sprite under.
   * Return empty array to skip the frame.
   */
  keyMapper: (oracleFrameName: string) => string[];
}

// --- Link key mapper ---
// Oracle frames: walk_{dir}_{1|2} (1-indexed)
// Player requests: link_walk_{dir}_{0|1} (0-indexed)
// Also reuse frame 1 for attack sprites: link_attack_{dir}
function linkKeyMapper(oracleFrameName: string): string[] {
  const match = oracleFrameName.match(/^walk_(down|up|left|right)_([12])$/);
  if (!match || !match[1] || !match[2]) return [];
  const dir = match[1];
  const oracleFrame = parseInt(match[2], 10);
  const gameFrame = oracleFrame - 1;
  const keys = [`link_walk_${dir}_${gameFrame}`];
  // Reuse walk frame 1 (game frame 0) as the attack sprite
  if (oracleFrame === 1) {
    keys.push(`link_attack_${dir}`);
  }
  return keys;
}

export const LINK_ALIAS: SpriteAliasConfig = {
  oracleCharacter: 'marin',
  palette: DEFAULT_PALETTE,
  keyMapper: linkKeyMapper,
};

// --- Enemy key mapper factory ---
// Enemies don't use direction — just frame 0 and frame 1.
// We use walk_down_1 → frame 0, walk_down_2 → frame 1.
function enemyKeyMapper(baseType: string, variant: string | null) {
  return (oracleFrameName: string): string[] => {
    const match = oracleFrameName.match(/^walk_down_([12])$/);
    if (!match || !match[1]) return [];
    const gameFrame = parseInt(match[1], 10) - 1;
    if (variant) {
      return [`${baseType}_${variant}_${gameFrame}`];
    }
    return [`${baseType}_${gameFrame}`];
  };
}

export const ENEMY_ALIASES: SpriteAliasConfig[] = [
  { oracleCharacter: 'piratian', palette: RED_PALETTE, keyMapper: enemyKeyMapper('octorok', 'red') },
  { oracleCharacter: 'piratian', palette: BLUE_PALETTE, keyMapper: enemyKeyMapper('octorok', 'blue') },
  { oracleCharacter: 'tokay', palette: RED_PALETTE, keyMapper: enemyKeyMapper('tektite', 'red') },
  { oracleCharacter: 'tokay', palette: BLUE_PALETTE, keyMapper: enemyKeyMapper('tektite', 'blue') },
  { oracleCharacter: 'ganondorf', palette: RED_PALETTE, keyMapper: enemyKeyMapper('moblin', 'red') },
  { oracleCharacter: 'ganondorf', palette: BLUE_PALETTE, keyMapper: enemyKeyMapper('moblin', 'blue') },
  { oracleCharacter: 'subrosian', palette: DEFAULT_PALETTE, keyMapper: enemyKeyMapper('keese', null) },
  { oracleCharacter: 'matty', palette: DEFAULT_PALETTE, keyMapper: enemyKeyMapper('gel', 'green') },
  { oracleCharacter: 'zoroark', palette: DEFAULT_PALETTE, keyMapper: enemyKeyMapper('stalfos', 'green') },
];

export const ALL_ALIASES: SpriteAliasConfig[] = [LINK_ALIAS, ...ENEMY_ALIASES];
