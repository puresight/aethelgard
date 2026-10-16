import type { Direction, GameState, MonsterKind } from '@/types/game';
import { createVaultFloor, DUNGEON_ENTRANCE, DUNGEON_SIZE, VAULT_TILE, type DungeonTile } from '@/utils/dungeon';

export const DIR_NAMES = ['N', 'E', 'S', 'W'] as const;

const W = 480;
const H = 320;
const CX = W / 2;
const CY = H / 2;

const EDGE = '#f59e0b'; // amber edge accents
const EDGE_DIM = 'rgba(245,158,11,0.5)';
const FILL_WALL = '#1c1917';
const FILL_WALL_LIT = '#292524';
const FILL_SIDE = '#0f0d0b';
const FILL_FLOOR = '#050505';
const TORCH = '#f97316';

// Precalculated perspective frames per depth
const DEPTH_FRAMES = [0, 1, 2, 3].map((d) => {
  const scale = 1 / (1 + d * 0.9);
  const hw = (W / 2) * scale;
  const hh = (H / 2) * scale;
  return { x0: CX - hw, x1: CX + hw, y0: CY - hh, y1: CY + hh };
});

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, style: string, width = 1.5) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function quadFill(ctx: CanvasRenderingContext2D, pts: number[][], color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function tileAt(state: GameState, depth: number, lateral: number) {
  const dx = [0, 1, 0, -1][state.dungeonDir];
  const dy = [-1, 0, 1, 0][state.dungeonDir];
  const sx = [1, 0, -1, 0][state.dungeonDir];
  const sy = [0, 1, 0, -1][state.dungeonDir];
  return { x: state.dungeonPos.x + dx * depth + sx * lateral, y: state.dungeonPos.y + dy * depth + sy * lateral };
}

function drawLadderGlyph(ctx: CanvasRenderingContext2D, down: boolean) {
  ctx.strokeStyle = down ? '#22d3ee' : EDGE;
  ctx.lineWidth = 2;
  const lx = CX - 14;
  const ly = CY - 26;
  line(ctx, lx, ly, lx, ly + 52, ctx.strokeStyle as string, 2);
  line(ctx, lx + 28, ly, lx + 28, ly + 52, ctx.strokeStyle as string, 2);
  for (let i = 0; i < 6; i++) {
    line(ctx, lx, ly + 7 + i * 9, lx + 28, ly + 7 + i * 9, ctx.strokeStyle as string, 1.5);
  }
  ctx.fillStyle = ctx.strokeStyle;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(down ? 'DOWN' : 'EXIT', CX, ly - 8);
  ctx.textAlign = 'left';
}

function drawChestGlyph(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, opened: boolean) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-14, -10, 28, 18);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(-14, -10, 28, 6);
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-14, -10, 28, 18);
  if (!opened) {
    ctx.fillStyle = EDGE;
    ctx.fillRect(-2, -4, 4, 7);
  } else {
    ctx.fillStyle = '#050505';
    ctx.fillRect(-11, -8, 22, 5);
  }
  ctx.restore();
}

function drawCompass(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.strokeStyle = EDGE;
  ctx.fillStyle = EDGE;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(`DIR: ${DIR_NAMES[state.dungeonDir]}`, W - 10, 10);
  ctx.strokeRect(W - 70, 8, 60, 18);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, seed: number) {
  // Bracket
  ctx.fillStyle = '#44403c';
  ctx.fillRect(x - 2, y, 4, 8);
  // 2-frame flame flicker
  const frame = Math.floor(t / 160 + seed) % 2;
  ctx.fillStyle = TORCH;
  if (frame === 0) {
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x - 4, y);
    ctx.lineTo(x + 4, y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x - 3, y - 7);
    ctx.lineTo(x + 3, y - 7);
    ctx.closePath();
    ctx.fill();
  }
  // Glow halo
  ctx.fillStyle = `rgba(249,115,22,${frame === 0 ? 0.10 : 0.16})`;
  ctx.beginPath();
  ctx.arc(x, y - 6, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawTorches(ctx: CanvasRenderingContext2D, t: number) {
  // Paired torches on the near side walls at depth 0, smaller at depth 2
  const f0 = DEPTH_FRAMES[0];
  const f2 = DEPTH_FRAMES[2];
  drawTorch(ctx, f0.x0 + 22, CY - 30, t, 0);
  drawTorch(ctx, f0.x1 - 22, CY - 30, t, 1);
  drawTorch(ctx, f2.x0 + 12, CY - 18, t, 2);
  drawTorch(ctx, f2.x1 - 12, CY - 18, t, 3);
}

function drawCorridor(ctx: CanvasRenderingContext2D, state: GameState) {
  const floorGrid = createVaultFloor(state.dungeonLevel);
  const get = (x: number, y: number): DungeonTile => {
    if (x < 0 || y < 0 || x >= DUNGEON_SIZE || y >= DUNGEON_SIZE) return VAULT_TILE.WALL;
    return floorGrid[y][x];
  };

  let blocked = false;
  for (let depth = 0; depth <= 3; depth++) {
    const frame = DEPTH_FRAMES[depth];
    const nextFrame = DEPTH_FRAMES[Math.min(depth + 1, 3)];
    const front = get(tileAt(state, depth, 0).x, tileAt(state, depth, 0).y);
    const left = get(tileAt(state, depth, -1).x, tileAt(state, depth, -1).y);
    const right = get(tileAt(state, depth, 1).x, tileAt(state, depth, 1).y);

    if (depth === 0) {
      // Floor trapezoid from frame0 to frame1
      quadFill(ctx, [[f(0).x0, f(0).y1], [f(0).x1, f(0).y1], [f(1).x1, f(1).y1], [f(1).x0, f(1).y1]], FILL_FLOOR);
      // Ceiling
      quadFill(ctx, [[f(0).x0, f(0).y0], [f(0).x1, f(0).y0], [f(1).x1, f(1).y0], [f(1).x0, f(1).y0]], FILL_SIDE);
      function f(d: number) { return DEPTH_FRAMES[d]; }
      // Left wall: solid fill plane if wall, opening otherwise
      if (left === VAULT_TILE.WALL) {
        quadFill(ctx, [[f(0).x0, f(0).y0], [f(0).x0, f(0).y1], [f(1).x0, f(1).y1], [f(1).x0, f(1).y0]], FILL_WALL_LIT);
      } else {
        quadFill(ctx, [[f(0).x0, f(0).y0], [f(0).x0, f(0).y1], [f(1).x0, f(1).y1], [f(1).x0, f(1).y0]], FILL_FLOOR);
      }
      if (right === VAULT_TILE.WALL) {
        quadFill(ctx, [[f(0).x1, f(0).y0], [f(0).x1, f(0).y1], [f(1).x1, f(1).y1], [f(1).x1, f(1).y0]], FILL_WALL);
      } else {
        quadFill(ctx, [[f(0).x1, f(0).y0], [f(0).x1, f(0).y1], [f(1).x1, f(1).y1], [f(1).x1, f(1).y0]], FILL_FLOOR);
      }
      // Amber edge accents on the near frame
      line(ctx, f(0).x0, f(0).y0, f(1).x0, f(1).y0, EDGE_DIM);
      line(ctx, f(0).x0, f(0).y1, f(1).x0, f(1).y1, EDGE_DIM);
      line(ctx, f(0).x1, f(0).y0, f(1).x1, f(1).y0, EDGE_DIM);
      line(ctx, f(0).x1, f(0).y1, f(1).x1, f(1).y1, EDGE_DIM);
      continue;
    }

    if (blocked) break;

    if (front === VAULT_TILE.WALL) {
      // Solid front wall plane with lit gradient bands + amber frame
      quadFill(ctx, [[frame.x0, frame.y0], [frame.x1, frame.y0], [frame.x1, frame.y1], [frame.x0, frame.y1]], FILL_WALL);
      quadFill(ctx, [[frame.x0, frame.y0], [frame.x0 + (frame.x1 - frame.x0) * 0.15, frame.y0], [frame.x0 + (frame.x1 - frame.x0) * 0.15, frame.y1], [frame.x0, frame.y1]], FILL_WALL_LIT);
      ctx.strokeStyle = EDGE;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(frame.x0, frame.y0, frame.x1 - frame.x0, frame.y1 - frame.y0);
      blocked = true;
      continue;
    }

    // Open: floor + ceiling + side planes
    quadFill(ctx, [[frame.x0, frame.y1], [frame.x1, frame.y1], [nextFrame.x1, nextFrame.y1], [nextFrame.x0, nextFrame.y1]], FILL_FLOOR);
    quadFill(ctx, [[frame.x0, frame.y0], [frame.x1, frame.y0], [nextFrame.x1, nextFrame.y0], [nextFrame.x0, nextFrame.y0]], FILL_SIDE);
    if (left === VAULT_TILE.WALL) {
      quadFill(ctx, [[frame.x0, frame.y0], [frame.x0, frame.y1], [nextFrame.x0, nextFrame.y1], [nextFrame.x0, nextFrame.y0]], FILL_WALL_LIT);
    } else {
      quadFill(ctx, [[frame.x0, frame.y0], [frame.x0, frame.y1], [nextFrame.x0, nextFrame.y1], [nextFrame.x0, nextFrame.y0]], FILL_FLOOR);
      line(ctx, frame.x0, frame.y0, nextFrame.x0, nextFrame.y0, EDGE_DIM);
      line(ctx, frame.x0, frame.y1, nextFrame.x0, nextFrame.y1, EDGE_DIM);
    }
    if (right === VAULT_TILE.WALL) {
      quadFill(ctx, [[frame.x1, frame.y0], [frame.x1, frame.y1], [nextFrame.x1, nextFrame.y1], [nextFrame.x1, nextFrame.y0]], FILL_WALL);
    } else {
      quadFill(ctx, [[frame.x1, frame.y0], [frame.x1, frame.y1], [nextFrame.x1, nextFrame.y1], [nextFrame.x1, nextFrame.y0]], FILL_FLOOR);
      line(ctx, frame.x1, frame.y0, nextFrame.x1, nextFrame.y0, EDGE_DIM);
      line(ctx, frame.x1, frame.y1, nextFrame.x1, nextFrame.y1, EDGE_DIM);
    }
    // Amber receding frame
    ctx.strokeStyle = depth === 3 ? 'rgba(245,158,11,0.25)' : EDGE_DIM;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(frame.x0, frame.y0, frame.x1 - frame.x0, frame.y1 - frame.y0);
  }
}

// Depth telegraph: chests and monsters visible down the corridor
function drawDepthContents(ctx: CanvasRenderingContext2D, state: GameState, t: number) {
  const standing = state.chests.find(
    (c) => c.dungeon && c.dungeonLevel === state.dungeonLevel && !c.opened &&
      c.pos.x === state.dungeonPos.x && c.pos.y === state.dungeonPos.y
  );
  if (standing) drawChestGlyph(ctx, CX, CY + 20, 0.9, false);

  for (let depth = 1; depth <= 2; depth++) {
    const frame = DEPTH_FRAMES[depth];
    const scale = depth === 1 ? 0.75 : 0.42;
    const cy = depth === 1 ? CY + 8 : CY + 2;

    const chest = state.chests.find(
      (c) => c.dungeon && c.dungeonLevel === state.dungeonLevel && !c.opened &&
        c.pos.x === tileAt(state, depth, 0).x && c.pos.y === tileAt(state, depth, 0).y
    );
    if (chest) {
      drawChestGlyph(ctx, CX, cy + 14, scale, false);
      continue;
    }

    const foe = state.entities.find(
      (e) => e.dungeon && e.dungeonLevel === state.dungeonLevel &&
        e.pos.x === tileAt(state, depth, 0).x && e.pos.y === tileAt(state, depth, 0).y
    );
    if (foe) {
      const wob = Math.sin(t / 200 + depth) * 1.5;
      drawMonsterSilhouette(ctx, foe.kind, CX, cy + wob, scale);
    }
  }
}

// 1-bit vector silhouettes, drawn centered at (cx, cy) with uniform scale
export function drawMonsterSilhouette(ctx: CanvasRenderingContext2D, kind: MonsterKind, cx: number, cy: number, scale: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#e7e5e4';
  ctx.fillStyle = '#e7e5e4';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  switch (kind) {
    case 'GOBLIN':
    case 'GOBLIN_SKIRMISHER': {
      ctx.beginPath();
      ctx.arc(0, -22, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, -26); ctx.lineTo(-24, -34); ctx.lineTo(-8, -18);
      ctx.moveTo(10, -26); ctx.lineTo(24, -34); ctx.lineTo(8, -18);
      ctx.stroke();
      ctx.fillRect(-4, -26, 3, 3);
      ctx.fillRect(2, -26, 3, 3);
      ctx.beginPath();
      ctx.moveTo(-9, -11); ctx.lineTo(-12, 16); ctx.lineTo(12, 16); ctx.lineTo(9, -11);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(12, -10); ctx.quadraticCurveTo(30, -20, 36, -36);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, 16); ctx.lineTo(-13, 34);
      ctx.moveTo(10, 16); ctx.lineTo(13, 34);
      ctx.stroke();
      break;
    }
    case 'WOLF': {
      ctx.beginPath();
      ctx.ellipse(0, 6, 26, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, 0); ctx.lineTo(38, -8); ctx.lineTo(36, 6); ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(30, -8); ctx.lineTo(28, -16); ctx.lineTo(35, -9); ctx.closePath();
      ctx.stroke();
      ctx.fillRect(34, -4, 3, 3);
      ctx.beginPath();
      ctx.moveTo(-24, 4); ctx.quadraticCurveTo(-40, -6, -46, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-14, 16); ctx.lineTo(-14, 30);
      ctx.moveTo(0, 16); ctx.lineTo(0, 30);
      ctx.moveTo(10, 16); ctx.lineTo(10, 30);
      ctx.stroke();
      break;
    }
    case 'GIANT_RAT': {
      ctx.beginPath();
      ctx.ellipse(0, 8, 24, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, 2); ctx.lineTo(36, -4); ctx.lineTo(34, 10); ctx.closePath();
      ctx.stroke();
      ctx.fillRect(30, 0, 3, 3);
      ctx.beginPath();
      ctx.moveTo(-22, 8); ctx.quadraticCurveTo(-42, 0, -50, 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-10, 20); ctx.lineTo(-10, 32);
      ctx.moveTo(8, 20); ctx.lineTo(8, 32);
      ctx.stroke();
      break;
    }
    case 'SKELETON': {
      ctx.strokeRect(-9, -40, 18, 16);
      ctx.fillRect(-5, -34, 4, 5);
      ctx.fillRect(2, -34, 4, 5);
      ctx.beginPath();
      ctx.moveTo(0, -24); ctx.lineTo(0, 12);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-12, -20 + i * 8);
        ctx.quadraticCurveTo(0, -14 + i * 8, 12, -20 + i * 8);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-12, -16); ctx.lineTo(-24, 4);
      ctx.moveTo(12, -16); ctx.lineTo(24, 4);
      ctx.moveTo(-5, 12); ctx.lineTo(-8, 42);
      ctx.moveTo(5, 12); ctx.lineTo(8, 42);
      ctx.stroke();
      break;
    }
    case 'CAVE_TROLL': {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -32, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(-8, -24, 3, 6);
      ctx.fillRect(5, -24, 3, 6);
      ctx.beginPath();
      ctx.moveTo(-15, -18);
      ctx.quadraticCurveTo(-24, 12, -17, 24);
      ctx.lineTo(17, 24);
      ctx.quadraticCurveTo(24, 12, 15, -18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, -14); ctx.lineTo(32, 16);
      ctx.moveTo(28, 12); ctx.lineTo(42, 4);
      ctx.moveTo(-16, -14); ctx.lineTo(-30, 16);
      ctx.moveTo(-11, 24); ctx.lineTo(-14, 46);
      ctx.moveTo(11, 24); ctx.lineTo(14, 46);
      ctx.stroke();
      break;
    }
    case 'WRAITH': {
      ctx.beginPath();
      ctx.moveTo(-13, -42);
      ctx.quadraticCurveTo(0, -56, 13, -42);
      ctx.lineTo(13, -22);
      ctx.quadraticCurveTo(0, -30, -13, -22);
      ctx.closePath();
      ctx.stroke();
      ctx.fillRect(-6, -42, 4, 3);
      ctx.fillRect(3, -42, 4, 3);
      ctx.beginPath();
      ctx.moveTo(-13, -24);
      ctx.quadraticCurveTo(-21, 8, -15, 30);
      ctx.lineTo(-7, 22); ctx.lineTo(-1, 34); ctx.lineTo(5, 20); ctx.lineTo(10, 32);
      ctx.lineTo(14, 24);
      ctx.quadraticCurveTo(20, 4, 13, -24);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export function renderDungeonFrame(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  drawCorridor(ctx, state);
  drawTorches(ctx, performance.now());
  drawDepthContents(ctx, state, performance.now());

  // Player HUD hint at bottom of viewport
  ctx.fillStyle = 'rgba(245,158,11,0.85)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`VAULTS L${state.dungeonLevel}`, 12, H - 10);

  // Standing-on-exit indicator
  const standingTile = createVaultFloor(state.dungeonLevel)[state.dungeonPos.y]?.[state.dungeonPos.x];
  if (standingTile === VAULT_TILE.LADDER_UP || state.dungeonPos.x === DUNGEON_ENTRANCE.x) {
    if (state.dungeonPos.x === DUNGEON_ENTRANCE.x && state.dungeonPos.y === DUNGEON_ENTRANCE.y) {
      drawLadderGlyph(ctx, false);
    }
  }
  if (standingTile === VAULT_TILE.LADDER_DOWN) {
    drawLadderGlyph(ctx, true);
  }

  drawCompass(ctx, state);
}
