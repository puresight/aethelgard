import type { GameState } from '@/types/game';
import { createVaultFloor, DUNGEON_SIZE, VAULT_TILE, type DungeonTile } from '@/utils/dungeon';

export const DIR_NAMES = ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const;

const W = 480;
const H = 320;
const CX = W / 2; // vanishing point
const CY = H / 2;

// Precalculated perspective trapezoid frames per depth step.
// Each depth d has an inner rectangle centered on the vanishing point.
const DEPTH_FRAMES = [0, 1, 2, 3].map((d) => {
  const scale = 1 / (1 + d * 0.9);
  const hw = (W / 2) * scale;
  const hh = (H / 2) * scale;
  return {
    x0: CX - hw,
    x1: CX + hw,
    y0: CY - hh,
    y1: CY + hh,
  };
});

const STROKE = '#22c55e';
const STROKE_DIM = 'rgba(34,197,94,0.45)';
const STROKE_FAR = 'rgba(34,197,94,0.22)';

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, style: string, width = 1.5) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function rect(ctx: CanvasRenderingContext2D, f: (typeof DEPTH_FRAMES)[number], style: string, width = 1.5) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.strokeRect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
}

// Offset of a tile at depth d, relative to the facing direction.
// lateral -1 = left, 0 = straight ahead, 1 = right
function tileAt(state: GameState, depth: number, lateral: number) {
  const dx = [0, 1, 0, -1][state.dungeonDir];
  const dy = [-1, 0, 1, 0][state.dungeonDir];
  const sx = [1, 0, -1, 0][state.dungeonDir];
  const sy = [0, 1, 0, -1][state.dungeonDir];
  return {
    x: state.dungeonPos.x + dx * depth + sx * lateral,
    y: state.dungeonPos.y + dy * depth + sy * lateral,
  };
}

function tileAtDir(state: GameState, dx: number, dy: number, floor: DungeonTile[][]): DungeonTile {
  const x = state.dungeonPos.x + dx;
  const y = state.dungeonPos.y + dy;
  if (x < 0 || y < 0 || x >= DUNGEON_SIZE || y >= DUNGEON_SIZE) return VAULT_TILE.WALL;
  return floor[y][x];
}

function drawLadderGlyph(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = STROKE;
  ctx.lineWidth = 1.5;
  const lx = CX - 12;
  const ly = CY - 22;
  // Rails
  line(ctx, lx, ly, lx, ly + 44, STROKE, 1.5);
  line(ctx, lx + 24, ly, lx + 24, ly + 44, STROKE, 1.5);
  // Rungs
  for (let i = 0; i < 5; i++) {
    line(ctx, lx, ly + 6 + i * 9, lx + 24, ly + 6 + i * 9, STROKE, 1);
  }
}

function drawCompass(ctx: CanvasRenderingContext2D, state: GameState) {
  const name = DIR_NAMES[state.dungeonDir];
  ctx.strokeStyle = STROKE;
  ctx.fillStyle = STROKE;
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`DIR: ${name}`, W - 10, 10);
  ctx.strokeRect(W - 92, 8, 82, 16);
  ctx.textAlign = 'left';
}

function drawFrustum(ctx: CanvasRenderingContext2D, state: GameState) {
  const floor = createVaultFloor(state.dungeonLevel);
  const get = (x: number, y: number): DungeonTile => {
    if (x < 0 || y < 0 || x >= DUNGEON_SIZE || y >= DUNGEON_SIZE) return VAULT_TILE.WALL;
    return floor[y][x];
  };

  const { x: px, y: py } = state.dungeonPos;

  // Walk depths 0..3 outward
  let blocked = false;
  for (let depth = 0; depth <= 3; depth++) {
    const frontTile = get(tileAt(state, depth, 0).x, tileAt(state, depth, 0).y);
    const frame = DEPTH_FRAMES[Math.min(depth, 3)];

    if (depth === 0) {
      // Lateral openings beside the player
      const left = get(tileAt(state, 0, -1).x, tileAt(state, 0, -1).y);
      const right = get(tileAt(state, 0, 1).x, tileAt(state, 0, 1).y);
      if (left === VAULT_TILE.WALL) {
        line(ctx, frame.x0, frame.y0, DEPTH_FRAMES[1].x0, DEPTH_FRAMES[1].y0, STROKE_DIM);
        line(ctx, frame.x0, frame.y1, DEPTH_FRAMES[1].x0, DEPTH_FRAMES[1].y1, STROKE_DIM);
      }
      if (right === VAULT_TILE.WALL) {
        line(ctx, frame.x1, frame.y1, DEPTH_FRAMES[1].x1, DEPTH_FRAMES[1].y0, STROKE_DIM);
        line(ctx, frame.x1, frame.y1, DEPTH_FRAMES[1].x1, DEPTH_FRAMES[1].y1, STROKE_DIM);
      } else {
        line(ctx, frame.x1, frame.y0, DEPTH_FRAMES[1].x1, DEPTH_FRAMES[1].y0, STROKE_DIM);
        line(ctx, frame.x1, frame.y1, DEPTH_FRAMES[1].x1, DEPTH_FRAMES[1].y1, STROKE_DIM);
      }
      continue;
    }

    if (blocked) break;

    if (frontTile === VAULT_TILE.WALL) {
      // Solid front-facing wall plane; block deeper rays
      rect(ctx, frame, STROKE, 2);
      blocked = true;
    } else {
      // Open: draw receding frame
      rect(ctx, frame, depth === 3 ? STROKE_FAR : STROKE_DIM);

      // Doorway transverse lines for left/right openings
      const left = get(tileAt(state, depth, -1).x, tileAt(state, depth, -1).y);
      const right = get(tileAt(state, depth, 1).x, tileAt(state, depth, 1).y);
      const nextFrame = DEPTH_FRAMES[Math.min(depth + 1, 3)];
      if (left !== VAULT_TILE.WALL) {
        line(ctx, frame.x0, frame.y0, nextFrame.x0, nextFrame.y0, STROKE_FAR);
        line(ctx, frame.x0, frame.y1, nextFrame.x0, nextFrame.y1, STROKE_FAR);
      } else {
        // Solid left: draw receding diagonal wall plane
        line(ctx, frame.x0, frame.y0, nextFrame.x0, nextFrame.y0, STROKE_DIM);
        line(ctx, frame.x0, frame.y1, nextFrame.x0, nextFrame.y1, STROKE_DIM);
        ctx.fillStyle = STROKE_FAR;
        ctx.beginPath();
        ctx.moveTo(frame.x0, frame.y0);
        ctx.lineTo(frame.x0, frame.y1);
        ctx.lineTo(nextFrame.x0, nextFrame.y1);
        ctx.lineTo(nextFrame.x0, nextFrame.y0);
        ctx.closePath();
        ctx.fill();
      }
      if (right !== VAULT_TILE.WALL) {
        line(ctx, frame.x1, frame.y0, nextFrame.x1, nextFrame.y0, STROKE_FAR);
        line(ctx, frame.x1, frame.y1, nextFrame.x1, nextFrame.y1, STROKE_FAR);
      } else {
        line(ctx, frame.x1, frame.y0, nextFrame.x1, nextFrame.y0, STROKE_DIM);
        line(ctx, frame.x1, frame.y1, nextFrame.x1, nextFrame.y1, STROKE_DIM);
        ctx.fillStyle = STROKE_FAR;
        ctx.beginPath();
        ctx.moveTo(frame.x1, frame.y0);
        ctx.lineTo(frame.x1, frame.y1);
        ctx.lineTo(nextFrame.x1, nextFrame.y1);
        ctx.lineTo(nextFrame.x1, nextFrame.y0);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Standing on a ladder: draw glyph
  const standing = floor[py][px];
  if (standing === VAULT_TILE.LADDER_UP || standing === VAULT_TILE.LADDER_DOWN) {
    drawLadderGlyph(ctx);
  }
}

export function renderDungeonFrame(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  drawFrustum(ctx, state);
  drawCompass(ctx, state);

  // Scanline accent lines for retro texture
  ctx.strokeStyle = 'rgba(34,197,94,0.05)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}
