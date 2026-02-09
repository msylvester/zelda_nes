// InputMapping.ts - Keyboard to NES controller mapping configuration
import type { NesButton, Direction } from '../types';

/**
 * Maps a logical NES button to one or more keyboard keys.
 * All keys use KeyboardEvent.code (physical key location).
 */
export type InputMapping = Record<NesButton, readonly string[]>;

/**
 * Default keyboard mapping following spec:
 * - Arrow keys / WASD for D-Pad
 * - X / Period for A button (sword)
 * - Z / Comma for B button (item)
 * - Enter for Start
 * - ShiftRight for Select
 */
export const DEFAULT_INPUT_MAPPING: InputMapping = {
  UP: ['ArrowUp', 'KeyW'],
  DOWN: ['ArrowDown', 'KeyS'],
  LEFT: ['ArrowLeft', 'KeyA'],
  RIGHT: ['ArrowRight', 'KeyD'],
  A: ['KeyX', 'Period'],
  B: ['KeyZ', 'Comma'],
  START: ['Enter'],
  SELECT: ['ShiftRight'],
} as const;

/** All NES buttons in order */
export const NES_BUTTONS: readonly NesButton[] = [
  'UP',
  'DOWN',
  'LEFT',
  'RIGHT',
  'A',
  'B',
  'START',
  'SELECT',
] as const;

/** Direction buttons only */
export const DIRECTION_BUTTONS: readonly NesButton[] = [
  'UP',
  'DOWN',
  'LEFT',
  'RIGHT',
] as const;

/**
 * Maps a direction button to its Direction type.
 */
export function buttonToDirection(button: NesButton): Direction | null {
  switch (button) {
    case 'UP':
      return 'UP';
    case 'DOWN':
      return 'DOWN';
    case 'LEFT':
      return 'LEFT';
    case 'RIGHT':
      return 'RIGHT';
    default:
      return null;
  }
}

/**
 * All mapped key codes from the default mapping.
 */
export function getMappedKeys(mapping: InputMapping): Set<string> {
  const keys = new Set<string>();
  for (const button of NES_BUTTONS) {
    for (const key of mapping[button]) {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * Finds which button (if any) a key code maps to.
 */
export function keyCodeToButton(
  keyCode: string,
  mapping: InputMapping
): NesButton | null {
  for (const button of NES_BUTTONS) {
    if (mapping[button].includes(keyCode)) {
      return button;
    }
  }
  return null;
}
