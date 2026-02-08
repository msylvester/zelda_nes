// debug.ts - Debug utilities and optional overlay
import { SCREEN_WIDTH, SCREEN_HEIGHT, HUD_HEIGHT, TILE_SIZE } from '../constants';
import type { AABB, Direction } from '../types';

/**
 * Debug configuration - can be toggled at runtime.
 */
export interface DebugConfig {
  enabled: boolean;
  showHitboxes: boolean;
  showGrid: boolean;
  showFPS: boolean;
  showPosition: boolean;
  showEnemyState: boolean;
  logInput: boolean;
  logCollisions: boolean;
  logPhaseChanges: boolean;
}

// Default debug configuration
const defaultConfig: DebugConfig = {
  enabled: false,
  showHitboxes: false,
  showGrid: false,
  showFPS: false,
  showPosition: false,
  showEnemyState: false,
  logInput: false,
  logCollisions: false,
  logPhaseChanges: false,
};

// Current debug state
let config: DebugConfig = { ...defaultConfig };
const fpsHistory: number[] = [];
let lastFrameTime = 0;

/**
 * Gets the current debug configuration.
 */
export function getDebugConfig(): Readonly<DebugConfig> {
  return config;
}

/**
 * Updates debug configuration.
 */
export function setDebugConfig(updates: Partial<DebugConfig>): void {
  config = { ...config, ...updates };
}

/**
 * Resets debug configuration to defaults.
 */
export function resetDebugConfig(): void {
  config = { ...defaultConfig };
}

/**
 * Toggles debug mode on/off.
 */
export function toggleDebug(): void {
  config.enabled = !config.enabled;
  debugLog('DEBUG', `Debug mode ${config.enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Logs a message if debug is enabled.
 */
export function debugLog(category: string, message: string, ...args: unknown[]): void {
  if (!config.enabled) return;
  console.log(`[${category}]`, message, ...args);
}

/**
 * Logs input events if debug input logging is enabled.
 */
export function debugLogInput(action: string, key: string): void {
  if (!config.enabled || !config.logInput) return;
  console.log(`[INPUT] ${action}: ${key}`);
}

/**
 * Logs collision events if debug collision logging is enabled.
 */
export function debugLogCollision(
  entityA: string,
  entityB: string,
  overlap: boolean
): void {
  if (!config.enabled || !config.logCollisions) return;
  if (overlap) {
    console.log(`[COLLISION] ${entityA} <-> ${entityB}`);
  }
}

/**
 * Logs game phase changes if enabled.
 */
export function debugLogPhaseChange(from: string, to: string): void {
  if (!config.enabled || !config.logPhaseChanges) return;
  console.log(`[PHASE] ${from} -> ${to}`);
}

/**
 * Updates FPS tracking (call once per frame).
 */
export function updateFPS(currentTime: number): number {
  if (lastFrameTime === 0) {
    lastFrameTime = currentTime;
    return 60;
  }

  const delta = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  const fps = delta > 0 ? 1000 / delta : 60;
  fpsHistory.push(fps);
  if (fpsHistory.length > 60) {
    fpsHistory.shift();
  }

  return fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
}

/**
 * Renders debug overlay on the canvas.
 */
export function renderDebugOverlay(
  ctx: CanvasRenderingContext2D,
  debugInfo: DebugInfo
): void {
  if (!config.enabled) return;

  ctx.save();

  // Draw grid
  if (config.showGrid) {
    drawGrid(ctx);
  }

  // Draw hitboxes
  if (config.showHitboxes) {
    // Player hitbox
    if (debugInfo.playerHitbox) {
      drawHitbox(ctx, debugInfo.playerHitbox, 'lime');
    }
    // Sword hitbox
    if (debugInfo.swordHitbox) {
      drawHitbox(ctx, debugInfo.swordHitbox, 'yellow');
    }
    // Enemy hitboxes
    for (const hitbox of debugInfo.enemyHitboxes) {
      drawHitbox(ctx, hitbox, 'red');
    }
    // Projectile hitboxes
    for (const hitbox of debugInfo.projectileHitboxes) {
      drawHitbox(ctx, hitbox, 'orange');
    }
    // Item hitboxes
    for (const hitbox of debugInfo.itemHitboxes) {
      drawHitbox(ctx, hitbox, 'cyan');
    }
  }

  // Draw text overlay (top-left)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, 120, 80);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'white';

  let y = 12;

  if (config.showFPS) {
    ctx.fillText(`FPS: ${debugInfo.fps.toFixed(1)}`, 4, y);
    y += 12;
  }

  if (config.showPosition && debugInfo.playerPosition) {
    ctx.fillText(
      `X: ${debugInfo.playerPosition.x.toFixed(1)}`,
      4,
      y
    );
    y += 12;
    ctx.fillText(
      `Y: ${debugInfo.playerPosition.y.toFixed(1)}`,
      4,
      y
    );
    y += 12;
    if (debugInfo.playerFacing) {
      ctx.fillText(`Dir: ${debugInfo.playerFacing}`, 4, y);
      y += 12;
    }
  }

  if (debugInfo.screenCoords) {
    ctx.fillText(
      `Screen: ${debugInfo.screenCoords.col},${debugInfo.screenCoords.row}`,
      4,
      y
    );
  }

  ctx.restore();
}

/**
 * Draws the tile grid overlay.
 */
function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= SCREEN_WIDTH; x += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_HEIGHT);
    ctx.lineTo(x, SCREEN_HEIGHT);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = HUD_HEIGHT; y <= SCREEN_HEIGHT; y += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SCREEN_WIDTH, y);
    ctx.stroke();
  }
}

/**
 * Draws a hitbox rectangle.
 */
function drawHitbox(
  ctx: CanvasRenderingContext2D,
  hitbox: AABB,
  color: string
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
}

/**
 * Debug info structure passed to the overlay renderer.
 */
export interface DebugInfo {
  fps: number;
  playerPosition?: { x: number; y: number };
  playerFacing?: Direction;
  playerHitbox?: AABB;
  swordHitbox?: AABB;
  enemyHitboxes: AABB[];
  projectileHitboxes: AABB[];
  itemHitboxes: AABB[];
  screenCoords?: { col: number; row: number };
}

/**
 * Creates an empty debug info object.
 */
export function createEmptyDebugInfo(): DebugInfo {
  return {
    fps: 60,
    enemyHitboxes: [],
    projectileHitboxes: [],
    itemHitboxes: [],
  };
}

// Expose for browser console access during development
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__zeldaDebug = {
    toggle: toggleDebug,
    config: () => config,
    set: setDebugConfig,
    reset: resetDebugConfig,
  };
}
