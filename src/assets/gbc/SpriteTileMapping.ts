/**
 * Mapping of animation frame names to tile indices within a 558-tile character sheet.
 *
 * Each entry maps a frame name to [topLeft, topRight, bottomLeft, bottomRight]
 * tile indices that form a 2x2 grid composing a 16x16 character sprite.
 *
 * GBC Oracle sprite sheets store character tiles sequentially.
 * Walk animation tiles are at the start of the sheet, organized by direction.
 * Each direction has 2 frames, each frame uses 4 tiles (2x2).
 */
export const SPRITE_FRAME_MAP: Record<string, [number, number, number, number]> = {
  // Walk down (facing camera)
  walk_down_1:  [0, 1, 2, 3],
  walk_down_2:  [4, 5, 6, 7],

  // Walk up (facing away)
  walk_up_1:    [8, 9, 10, 11],
  walk_up_2:    [12, 13, 14, 15],

  // Walk left
  walk_left_1:  [16, 17, 18, 19],
  walk_left_2:  [20, 21, 22, 23],

  // Walk right
  walk_right_1: [24, 25, 26, 27],
  walk_right_2: [28, 29, 30, 31],
};
