import { parseTileBuffer } from './GbcTileParser';
import { DEFAULT_PALETTE } from './GbcPalette';
import { composeFrame } from './SpriteFrameComposer';
import { SPRITE_FRAME_MAP } from './SpriteTileMapping';

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
 * If a fetch fails for a character, logs a warning and continues with others.
 */
export async function loadOracleSprites(): Promise<Map<string, HTMLCanvasElement>> {
  const sprites = new Map<string, HTMLCanvasElement>();

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

    for (const [frameName, tileIndices] of Object.entries(SPRITE_FRAME_MAP)) {
      const key = `oracle_${name}_${frameName}`;
      const canvas = composeFrame(tiles, tileIndices, DEFAULT_PALETTE);
      sprites.set(key, canvas);
    }
  }

  return sprites;
}
