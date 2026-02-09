/**
 * Mapping of animation frame names to tile indices within a 558-tile character sheet.
 *
 * Each entry maps a frame name to [topLeft, topRight, bottomLeft, bottomRight]
 * tile indices that form a 2x2 grid composing a 16x16 character sprite.
 *
 * GBC Oracle sprite sheets store tiles in column-major order (8x16 sprite mode):
 *   [TL, BL, TR, BR] — left column first, then right column.
 * So for sequential tiles starting at index N:
 *   topLeft=N, topRight=N+2, bottomLeft=N+1, bottomRight=N+3
 */
export const SPRITE_FRAME_MAP: Record<string, [number, number, number, number]> = {
  // Walk down (facing camera)
  walk_down_1:  [0, 2, 1, 3],
  walk_down_2:  [4, 6, 5, 7],

  // Walk up (facing away)
  walk_up_1:    [8, 10, 9, 11],
  walk_up_2:    [12, 14, 13, 15],

  // Walk left
  walk_left_1:  [16, 18, 17, 19],
  walk_left_2:  [20, 22, 21, 23],

  // Walk right
  walk_right_1: [24, 26, 25, 27],
  walk_right_2: [28, 30, 29, 31],
};
