# US-004: Input and Control Mapping Specification

Defines keyboard-to-NES controller mapping, input polling, buffering, and context-sensitive controls for the Legend of Zelda TypeScript rebuild.

---

## 1. NES Controller Model

The NES controller has 8 buttons. This game maps keyboard keys to each:

| NES Button | Primary Key | Alternate Key | Function |
|------------|------------|---------------|----------|
| D-Pad Up | `ArrowUp` | `W` | Move up |
| D-Pad Down | `ArrowDown` | `S` | Move down |
| D-Pad Left | `ArrowLeft` | `A` | Move left |
| D-Pad Right | `ArrowRight` | `D` | Move right |
| A Button | `X` | `.` (period) | Sword attack |
| B Button | `Z` | `,` (comma) | Use equipped item |
| Start | `Enter` | — | Pause / unpause |
| Select | `Shift` (right) | — | (unused in gameplay; reserved for debug/future) |

```typescript
interface InputMapping {
  /** Maps a logical NES button to one or more keyboard keys */
  [button: string]: string[];
}

const DEFAULT_INPUT_MAPPING: InputMapping = {
  UP:     ['ArrowUp', 'KeyW'],
  DOWN:   ['ArrowDown', 'KeyS'],
  LEFT:   ['ArrowLeft', 'KeyA'],
  RIGHT:  ['ArrowRight', 'KeyD'],
  A:      ['KeyX', 'Period'],
  B:      ['KeyZ', 'Comma'],
  START:  ['Enter'],
  SELECT: ['ShiftRight'],
};
```

### Key Code Reference

All key identifiers use the `KeyboardEvent.code` property (physical key location), NOT `KeyboardEvent.key` (character output). This ensures consistent behavior regardless of keyboard layout or OS locale.

---

## 2. Directional Movement

### D-Pad Behavior

The NES D-pad is a physical rocker that mechanically prevents pressing opposite directions simultaneously. The keyboard does not have this constraint, so opposing simultaneous inputs must be handled:

```typescript
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface DirectionalInput {
  /** Currently active direction (null if no direction pressed) */
  activeDirection: Direction | null;

  /** Set of all currently held direction keys */
  heldDirections: Set<Direction>;
}
```

### Direction Priority Rules

1. **Single direction**: If exactly one direction key is held, that is the active direction.
2. **Opposing directions**: If both UP+DOWN or LEFT+RIGHT are held simultaneously, the **most recently pressed** direction wins. The earlier direction is ignored.
3. **Perpendicular directions**: If e.g. UP+RIGHT are held simultaneously, the **most recently pressed** direction wins. NES Zelda does not support diagonal movement.
4. **No direction**: If no direction keys are held, `activeDirection` is `null` (Link stops moving but retains his facing direction).

Implementation: maintain an **ordered stack** of currently-held direction keys. The active direction is always the **top of the stack** (most recently pressed). When a key is released, it is removed from the stack; the next key down in the stack becomes active.

```typescript
interface DirectionStack {
  /** Stack of held directions, most recent at end */
  stack: Direction[];

  /** Push direction when key is pressed */
  push(dir: Direction): void;

  /** Remove direction when key is released */
  remove(dir: Direction): void;

  /** Get the currently active direction (top of stack, or null) */
  current(): Direction | null;
}
```

### Movement Speed

- Link moves at **1.5 pixels per frame** when a direction is active (defined in US-001).
- Movement begins on the **same frame** the direction becomes active (no startup delay).
- Movement stops on the **same frame** the direction becomes null (no coast/deceleration).
- Grid snapping: when Link changes to a perpendicular direction, his position snaps to the nearest **8-pixel boundary** on the axis he was previously moving along. This is essential for navigating through 1-tile-wide gaps.

### Facing Direction

- Link's **facing direction** is set to the active direction whenever a direction key is pressed.
- Facing direction persists when no direction key is held (Link faces the last direction he moved).
- Facing direction determines: attack direction, item-use direction, and idle sprite.

---

## 3. Action Buttons (A and B)

### A Button — Sword Attack

| Context | A-Button Behavior |
|---------|-------------------|
| Gameplay (has sword) | Initiates sword swing in facing direction |
| Gameplay (no sword) | No action |
| During attack animation | Ignored (cannot interrupt/queue) |
| During item-use animation | Ignored |
| During knockback | Ignored |
| Pause/inventory screen | No action |
| Screen transition | Ignored |
| Text/dialog display | Advance to next text segment |
| Continue screen | Select highlighted option |

**Sword attack details** (cross-reference US-001):
- Pressing A starts the sword swing animation (12 frames total).
- Link cannot move during the swing.
- Sword hitbox is active on frames 2–8.
- If Link is at full health, a sword beam projectile is also fired (only one beam can exist at a time).
- The A button responds to **key-down events only** (not held). Holding A does not auto-repeat attacks. The player must release and press again for each swing.

### B Button — Use Equipped Item

| Context | B-Button Behavior |
|---------|-------------------|
| Gameplay (item equipped) | Uses the currently equipped B-item |
| Gameplay (no item equipped) | No action |
| During attack animation | Ignored |
| During item-use animation | Ignored |
| During knockback | Ignored |
| Pause/inventory screen | Equip highlighted item as B-item |
| Screen transition | Ignored |
| Text/dialog display | No action |
| Continue screen | No action |

**Item-use details** (cross-reference US-001):
- Pressing B starts the item-use animation (12 frames total, varies by item).
- Link cannot move during item use.
- Some items have constraints (e.g., blue candle once per screen, arrows require rupees, bombs require bomb count > 0).
- If the item cannot be used (out of ammo, constraint violated), pressing B does nothing — no animation plays, no sound plays.
- Like A, the B button responds to **key-down events only**.

### Button Press vs. Hold

All action buttons (A, B, Start) use **edge-triggered** detection — they fire on the **transition from released to pressed** (key-down), not on the held state. Holding a button down continuously has no additional effect after the initial press.

```typescript
interface ButtonState {
  /** True if the button is currently held down */
  held: boolean;

  /** True only on the frame the button transitioned from released to pressed */
  justPressed: boolean;

  /** True only on the frame the button transitioned from pressed to released */
  justReleased: boolean;
}
```

---

## 4. Pause / Inventory Screen Controls

### Start Button — Pause Toggle

- Pressing Start during gameplay opens the **inventory/pause screen**.
- Pressing Start while on the inventory screen closes it and resumes gameplay.
- The pause state is toggled on `justPressed` only.
- Start has **no effect** during:
  - Screen transitions
  - Death animation
  - Continue screen
  - Item pickup animation
  - Cave/NPC text display

### Inventory Screen Navigation

When the pause/inventory screen is open:

| Input | Action |
|-------|--------|
| D-Pad Up/Down/Left/Right | Move item selection cursor |
| B Button | Equip the currently highlighted item as the B-item |
| Start | Close inventory, resume gameplay |
| A Button | No action |

**Cursor movement rules:**
- The inventory grid is 2 rows x 4 columns (defined in US-003).
- D-Pad moves the cursor one cell in the pressed direction.
- Cursor wraps: moving left from column 0 wraps to column 3 of the same row; moving right from column 3 wraps to column 0. Moving up from row 0 wraps to row 1; moving down from row 1 wraps to row 0.
- Cursor movement uses **edge-triggered** input — holding a direction does NOT auto-repeat. The player must release and re-press to move the cursor again.
- Empty cells (items not yet collected) are skipped — the cursor jumps to the next occupied cell in the direction of movement. If no occupied cell exists in that direction, the cursor does not move.

### Continue Screen Navigation

After death, the continue screen presents options:

| Input | Action |
|-------|--------|
| D-Pad Up/Down | Move selection cursor between options |
| A Button | Select the highlighted option |
| Start | Same as A (selects highlighted option) |

Continue screen options:
1. **CONTINUE** — respawn and resume
2. **SAVE** — save and return to title
3. **RETRY** — (second quest only) same as continue

---

## 5. Input Polling and Buffering

### Input Polling Architecture

The input system reads keyboard state **once per game frame** at the start of the game loop, before any game logic runs. This ensures all systems within a frame see a consistent snapshot of input state.

```typescript
interface InputSnapshot {
  /** State of each logical button for this frame */
  buttons: Record<NesButton, ButtonState>;

  /** Active direction this frame (from direction stack) */
  activeDirection: Direction | null;

  /** Facing direction (persists from last active direction) */
  facingDirection: Direction;

  /** Frame number this snapshot was taken */
  frameNumber: number;
}

type NesButton = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'A' | 'B' | 'START' | 'SELECT';
```

### Polling Sequence

Each frame:

1. **Read raw keyboard state**: Check which keys are currently held via the browser's `keydown`/`keyup` event tracking.
2. **Map to logical buttons**: Convert physical keys to NES button states using the input mapping.
3. **Compute edge triggers**: Compare current held state to previous frame's held state to determine `justPressed` and `justReleased`.
4. **Resolve direction**: Update the direction stack and compute `activeDirection`.
5. **Update facing direction**: If `activeDirection` is non-null, set `facingDirection` to match.
6. **Produce InputSnapshot**: Freeze the snapshot for this frame. All game systems read from this snapshot.

```typescript
interface InputSystem {
  /** Raw key states from browser events */
  keysHeld: Set<string>; // Set of KeyboardEvent.code values

  /** Previous frame's button held states (for edge detection) */
  previousHeld: Record<NesButton, boolean>;

  /** Direction priority stack */
  directionStack: DirectionStack;

  /** Persistent facing direction */
  facingDirection: Direction;

  /** Poll and produce snapshot for current frame */
  poll(): InputSnapshot;
}
```

### Keyboard Event Handling

```typescript
interface KeyboardEventHandling {
  /** Listen for keydown events */
  onKeyDown: (event: KeyboardEvent) => void;

  /** Listen for keyup events */
  onKeyUp: (event: KeyboardEvent) => void;

  /** Prevent default behavior for mapped keys (stops arrow keys from scrolling the page) */
  preventDefault: true;

  /** Ignore key repeat events (held key firing repeated keydown events) */
  ignoreRepeat: true; // filter out events where event.repeat === true
}
```

- `keydown` events add the key code to `keysHeld`.
- `keyup` events remove the key code from `keysHeld`.
- Events where `event.repeat === true` are discarded — they are browser-generated repeats from holding a key and must not be treated as new presses.
- `event.preventDefault()` is called for all mapped keys to prevent browser default actions (arrow key scrolling, Enter form submission, etc.).

### Input Buffering

The NES Zelda has minimal input buffering. This implementation mirrors that:

- **No action buffering**: If the player presses A (sword) during an active sword animation, the input is discarded. The player must wait for the animation to complete and press A again. There is no queue of pending actions.
- **Direction buffering: none**: Direction changes take effect on the exact frame they are detected. There is no smoothing, prediction, or buffering of directional input.
- **Late input tolerance: none**: There is no grace period for inputs. If a button press happens after the polling window for a frame (between frame N's poll and frame N+1's poll), it will be picked up on frame N+1. This is inherent in the polling model and matches NES behavior.

```typescript
interface InputBufferConfig {
  /** No action buffering — inputs during locked states are discarded */
  actionBufferFrames: 0;

  /** No directional smoothing */
  directionBufferFrames: 0;

  /** No late-input tolerance window */
  lateInputToleranceMs: 0;
}
```

### Focus and Blur Handling

When the browser tab loses focus:

1. **Clear all held keys**: Set `keysHeld` to empty. This prevents "stuck keys" when the player alt-tabs away while holding a direction.
2. **Auto-pause**: If gameplay is active, trigger a pause (same as pressing Start). This prevents Link from walking into enemies while the player is in another tab.
3. On refocus, the game remains paused. The player must press Start to resume.

```typescript
interface FocusHandling {
  /** On window blur: clear keys and auto-pause */
  onBlur: () => void;

  /** On window focus: no auto-resume (player presses Start) */
  onFocus: () => void;
}
```

---

## 6. Context-Sensitive Input States

The input system behavior changes based on the current game phase. The game phase determines which inputs are accepted:

```typescript
type GamePhase =
  | 'TITLE'
  | 'GAMEPLAY'
  | 'PAUSE'
  | 'TRANSITION'
  | 'DEATH'
  | 'CONTINUE_SCREEN'
  | 'TEXT_DISPLAY'
  | 'ITEM_PICKUP';
```

### Input Acceptance Matrix

| Input | TITLE | GAMEPLAY | PAUSE | TRANSITION | DEATH | CONTINUE_SCREEN | TEXT_DISPLAY | ITEM_PICKUP |
|-------|-------|----------|-------|------------|-------|-----------------|--------------|-------------|
| D-Pad | — | Move | Cursor | — | — | Cursor | — | — |
| A | Start game | Sword | — | — | — | Select option | Advance text | — |
| B | — | Use item | Equip item | — | — | — | — | — |
| Start | Start game | Pause | Unpause | — | — | Select option | — | — |
| Select | — | — | — | — | — | — | — | — |

- **`—`** = input is ignored / has no effect.
- During `TRANSITION`: all inputs are completely ignored. No polling occurs (or polling occurs but the snapshot is discarded).
- During `DEATH`: all inputs are ignored until the death animation completes and the `CONTINUE_SCREEN` phase begins.
- During `ITEM_PICKUP`: all inputs are ignored for the duration of the pickup animation (30–60 frames depending on item type).

### Player State Input Locks

Within the `GAMEPLAY` phase, certain player states further restrict inputs:

| Player State | D-Pad | A | B |
|-------------|-------|---|---|
| IDLE | Move | Attack | Use item |
| WALKING | Move | Attack | Use item |
| ATTACKING | Ignored | Ignored | Ignored |
| USING_ITEM | Ignored | Ignored | Ignored |
| KNOCKBACK | Ignored | Ignored | Ignored |
| INVINCIBLE | Move | Attack | Use item |

- `ATTACKING` and `USING_ITEM` lock out all input until the animation completes.
- `KNOCKBACK` locks all input for 16 frames (knockback duration).
- `INVINCIBLE` (post-knockback flashing) allows full control — only the sprite flickers, not the controls.

---

## 7. Title Screen Input

The title screen has minimal interactivity:

| Phase | Input | Action |
|-------|-------|--------|
| Title scroll / intro | Any button | Skip intro, show menu |
| File select | D-Pad Up/Down | Move cursor between save files |
| File select | A / Start | Select highlighted file |
| File select | — | Register mode accessible via specific sequence (not detailed here) |

### Title Screen File Select

```typescript
interface TitleScreenInput {
  /** Number of save file slots */
  fileSlots: 3;

  /** Cursor wraps vertically */
  cursorWrap: true;

  /** Inputs accepted */
  acceptedInputs: ['UP', 'DOWN', 'A', 'START'];
}
```

---

## 8. Input Remapping

The input mapping is stored as a configurable data structure, allowing players to rebind controls:

```typescript
interface InputConfig {
  /** Map of NES button to keyboard codes */
  mapping: Record<NesButton, string[]>;

  /** Whether to prevent browser defaults for mapped keys */
  preventDefaults: boolean;

  /** Whether to auto-pause on blur */
  autoPauseOnBlur: boolean;
}

const DEFAULT_INPUT_CONFIG: InputConfig = {
  mapping: {
    UP:     ['ArrowUp', 'KeyW'],
    DOWN:   ['ArrowDown', 'KeyS'],
    LEFT:   ['ArrowLeft', 'KeyA'],
    RIGHT:  ['ArrowRight', 'KeyD'],
    A:      ['KeyX', 'Period'],
    B:      ['KeyZ', 'Comma'],
    START:  ['Enter'],
    SELECT: ['ShiftRight'],
  },
  preventDefaults: true,
  autoPauseOnBlur: true,
};
```

- Remapping is persisted to `localStorage` under a known key (e.g., `zelda_input_config`).
- The remapping UI is out of scope for this spec (can be a simple options screen or developer console).
- Validation: a single keyboard key cannot be mapped to multiple NES buttons. The system should reject conflicting mappings.

---

## 9. Gamepad Support (Optional / Future)

The architecture supports gamepad input as a secondary input source. When a gamepad is connected:

```typescript
interface GamepadConfig {
  /** Whether gamepad input is enabled */
  enabled: boolean;

  /** Gamepad button mapping (standard gamepad layout) */
  buttonMapping: {
    A: number;         // gamepad button index for NES A (typically 0 or 1)
    B: number;         // gamepad button index for NES B (typically 1 or 0)
    START: number;     // typically 9
    SELECT: number;    // typically 8
  };

  /** D-Pad can use either digital buttons or left analog stick */
  dpadSource: 'BUTTONS' | 'LEFT_STICK' | 'BOTH';

  /** Analog stick deadzone (0.0–1.0) */
  stickDeadzone: number; // default: 0.3
}
```

- Gamepad and keyboard inputs are merged: either source can produce button presses.
- When both sources press conflicting directions simultaneously, keyboard takes priority.
- Gamepad polling uses `navigator.getGamepads()` API, read once per frame alongside keyboard polling.
- This is a stretch goal and not required for initial implementation.

---

## Type Definitions Summary

```typescript
// Logical NES button
type NesButton = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'A' | 'B' | 'START' | 'SELECT';

// Cardinal direction
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

// Button press state for a single frame
interface ButtonState {
  held: boolean;
  justPressed: boolean;
  justReleased: boolean;
}

// Complete input snapshot for one frame
interface InputSnapshot {
  buttons: Record<NesButton, ButtonState>;
  activeDirection: Direction | null;
  facingDirection: Direction;
  frameNumber: number;
}

// Direction priority resolution
interface DirectionStack {
  stack: Direction[];
  push(dir: Direction): void;
  remove(dir: Direction): void;
  current(): Direction | null;
}

// Game phases that affect input acceptance
type GamePhase =
  | 'TITLE'
  | 'GAMEPLAY'
  | 'PAUSE'
  | 'TRANSITION'
  | 'DEATH'
  | 'CONTINUE_SCREEN'
  | 'TEXT_DISPLAY'
  | 'ITEM_PICKUP';

// Player states that affect input locks during gameplay
type PlayerState =
  | 'IDLE'
  | 'WALKING'
  | 'ATTACKING'
  | 'USING_ITEM'
  | 'KNOCKBACK'
  | 'INVINCIBLE'
  | 'DYING';
```
