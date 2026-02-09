# GBC 2bpp Sprite Module

## Overview

This module loads character sprites from GBC (Game Boy Color) 2bpp binary tile data (`.bin` files) and renders them as `HTMLCanvasElement` sprites for use in the game's asset system.

## GBC 2bpp Tile Format

- Each tile is **16 bytes** encoding an **8x8 pixel** grid
- Each row is 2 bytes: for pixel N (0-7, left to right), bit `(7-N)` of byte0 = low bit, bit `(7-N)` of byte1 = high bit of the 2-bit color index
- Color indices range from 0-3; index 0 is always transparent
- A character sprite sheet is **8928 bytes** = **558 tiles**

## Module Structure

| File | Purpose |
|---|---|
| `GbcTileParser.ts` | Decodes 2bpp binary data into color index arrays |
| `GbcPalette.ts` | RGBA palette types, presets (green/red/blue), single-tile canvas rendering |
| `SpriteFrameComposer.ts` | Composes 4 tiles in a 2x2 grid into a 16x16 sprite frame |
| `SpriteTileMapping.ts` | Maps animation frame names to tile indices within the 558-tile sheet |
| `GbcSpriteLoader.ts` | Async loader: fetches `.bin` files, parses, composes, returns named canvas Map |
| `index.ts` | Barrel exports for all public APIs |

## How to Add New Characters

1. Place the `.bin` file (must be a multiple of 16 bytes) in `public/sprites/oracles/`
2. Add the character name to the `CHARACTER_NAMES` array in `GbcSpriteLoader.ts`
3. The loader will automatically generate all frames defined in `SPRITE_FRAME_MAP`
4. Map keys follow the pattern: `oracle_{charName}_{frameName}`

## How to Add New Animation Frames

1. Identify the tile indices in the 558-tile sheet for the new frame
2. Add an entry to `SPRITE_FRAME_MAP` in `SpriteTileMapping.ts`: `frameName: [topLeft, topRight, bottomLeft, bottomRight]`
3. All characters will automatically get the new frame on next load

## Key Patterns

- Canvas rendering uses `createImageData` + `putImageData` for pixel-level control (not `fillRect`)
- Tile arrangement in 2x2 grid: `[topLeft, topRight, bottomLeft, bottomRight]`
- `loadOracleSprites()` uses `Promise.allSettled` for graceful per-character error handling
- Sprites are loaded fire-and-forget in `main.ts` — they do not block game boot
- Mock DOM/canvas in tests with `vi.stubGlobal('document', ...)` and `vi.unstubAllGlobals()` in `afterEach`
