import { parseTileBuffer } from './GbcTileParser';
import { DEFAULT_PALETTE } from './GbcPalette';
import { composeFrame } from './SpriteFrameComposer';
import { SPRITE_FRAME_MAP } from './SpriteTileMapping';
import { ALL_ALIASES } from './SpriteAliasMap';

const CHARACTER_NAMES = [
  'ganondorf',
  'goron',
  'marin',
  'matty',
  'piratian',
  'subrosian',
  'tokay',
  'vulpera',
  'zoroark',
] as const;

const SPRITES_BASE_PATH = '/sprites/oracles';

/**
 * Load all 9 Oracle character sprites from GBC 2bpp .bin files.
 *
 * Fetches all characters in parallel using Promise.allSettled.
 * For each character, decodes tiles and composes all frames defined in SPRITE_FRAME_MAP.
 * Map keys follow the pattern: oracle_{charName}_{frameName}
 *
 * Additionally registers gameplay alias keys (e.g. "link_walk_down_0", "octorok_red_0")
 * so that Player.ts and Enemy.ts can find real sprites instead of falling back to
 * colored rectangles.
 *
 * If a fetch fails for a character, logs a warning and continues with others.
 */
export async function loadOracleSprites(): Promise<Map<string, HTMLCanvasElement>> {
  const sprites = new Map<string, HTMLCanvasElement>();
  const characterTiles = new Map<string, Uint8Array[]>();

  const results = await Promise.allSettled(
    CHARACTER_NAMES.map(async (name) => {
      const response = await fetch(`${SPRITES_BASE_PATH}/${name}.bin`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${name}.bin`);
      }
      const buffer = await response.arrayBuffer();
      return { name, buffer };
    })
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn(`Failed to load oracle sprite: ${result.reason}`);
      continue;
    }

    const { name, buffer } = result.value;
    const tiles = parseTileBuffer(buffer);
    characterTiles.set(name, tiles);

    for (const [frameName, tileIndices] of Object.entries(SPRITE_FRAME_MAP)) {
      const key = `oracle_${name}_${frameName}`;
      const canvas = composeFrame(tiles, tileIndices, DEFAULT_PALETTE);
      sprites.set(key, canvas);
    }
  }

  // Register gameplay aliases (link_walk_down_0, octorok_red_0, etc.)
  for (const alias of ALL_ALIASES) {
    const tiles = characterTiles.get(alias.oracleCharacter);
    if (!tiles) continue;

    for (const [frameName, tileIndices] of Object.entries(SPRITE_FRAME_MAP)) {
      const gameplayKeys = alias.keyMapper(frameName);
      if (gameplayKeys.length === 0) continue;

      const canvas = composeFrame(tiles, tileIndices, alias.palette);
      for (const gameplayKey of gameplayKeys) {
        sprites.set(gameplayKey, canvas);
      }
    }
  }

  return sprites;
}
