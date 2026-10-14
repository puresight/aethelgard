import type { GameState, MonsterKind } from '@/types/game';
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

const MONSTER_COLOR = '#22c55e';
const MONSTER_HIT_FLASH = '#f87171';

function drawGiantRat(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.strokeStyle = MONSTER_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Body ellipse
  ctx.ellipse(cx, cy + 5, 34, 16, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Head
  ctx.beginPath();
  ctx.moveTo(cx + 30, cy);
  ctx.lineTo(cx + 48, cy - 8);
  ctx.lineTo(cx + 46, cy + 8);
  ctx.closePath();
  ctx.stroke();
  // Ear
  ctx.beginPath();
  ctx.moveTo(cx + 32, cy - 6);
  ctx.lineTo(cx + 36, cy - 16);
  ctx.lineTo(cx + 40, cy - 6);
  ctx.stroke();
  // Eye
  ctx.fillStyle = MONSTER_COLOR;
  ctx.fillRect(cx + 40, cy - 4, 3, 3);
  // Tail
  ctx.beginPath();
  ctx.moveTo(cx - 32, cy + 4);
  ctx.quadraticCurveTo(cx - 55, cy - 5, cx - 65, cy + 8);
  ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy + 20); ctx.lineTo(cx - 15, cy + 32);
  ctx.moveTo(cx + 5, cy + 20); ctx.lineTo(cx + 5, cy + 32);
  ctx.stroke();
  // Whiskers
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 46, cy + 2); ctx.lineTo(cx + 58, cy - 2);
  ctx.moveTo(cx + 46, cy + 4); ctx.lineTo(cx + 58, cy + 6);
  ctx.stroke();
}

function drawSkeleton(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.strokeStyle = MONSTER_COLOR;
  ctx.lineWidth = 2;
  // Skull
  ctx.strokeRect(cx - 10, cy - 40, 20, 18);
  ctx.fillStyle = MONSTER_COLOR;
  ctx.fillRect(cx - 6, cy - 34, 4, 5); // eye
  ctx.fillRect(cx + 2, cy - 34, 4, 5); // eye
  ctx.fillRect(cx - 3, cy - 26, 6, 2); // nose gap
  // Jaw teeth
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.strokeRect(cx - 7 + i * 4, cy - 22, 3, 4);
  }
  // Spine + ribcage
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy + 10);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const ry = cy - 18 + i * 8;
    ctx.beginPath();
    ctx.moveTo(cx - 14, ry);
    ctx.quadraticCurveTo(cx, ry + 6, cx + 14, ry);
    ctx.stroke();
  }
  // Pelvis
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy + 10); ctx.lineTo(cx + 10, cy + 10);
  ctx.stroke();
  // Arms
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 16); ctx.lineTo(cx - 26, cy + 4);
  ctx.moveTo(cx + 14, cy - 16); ctx.lineTo(cx + 26, cy + 4);
  ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy + 10); ctx.lineTo(cx - 8, cy + 42);
  ctx.moveTo(cx + 5, cy + 10); ctx.lineTo(cx + 8, cy + 42);
  ctx.stroke();
}

function drawGoblin(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.strokeStyle = MONSTER_COLOR;
  ctx.lineWidth = 2;
  // Head with pointed ears
  ctx.beginPath();
  ctx.arc(cx, cy - 30, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy - 34); ctx.lineTo(cx - 26, cy - 42); ctx.lineTo(cx - 9, cy - 26);
  ctx.moveTo(cx + 11, cy - 34); ctx.lineTo(cx + 26, cy - 42); ctx.lineTo(cx + 9, cy - 26);
  ctx.stroke();
  // Beady eyes
  ctx.fillStyle = MONSTER_COLOR;
  ctx.fillRect(cx - 6, cy - 34, 3, 3);
  ctx.fillRect(cx + 3, cy - 34, 3, 3);
  // Body
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 18); ctx.lineTo(cx - 14, cy + 12);
  ctx.lineTo(cx + 14, cy + 12); ctx.lineTo(cx + 10, cy - 18);
  ctx.closePath();
  ctx.stroke();
  // Scimitar (raised right)
  ctx.beginPath();
  ctx.moveTo(cx + 16, cy - 16);
  ctx.quadraticCurveTo(cx + 38, cy - 30, cx + 44, cy - 48);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 12, cy - 14); ctx.lineTo(cx + 18, cy - 20); // guard
  ctx.stroke();
  ctx.lineWidth = 2;
  // Left arm + dagger
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 16); ctx.lineTo(cx - 22, cy - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy - 4); ctx.lineTo(cx - 30, cy - 14);
  ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 12); ctx.lineTo(cx - 10, cy + 34);
  ctx.moveTo(cx + 8, cy + 12); ctx.lineTo(cx + 10, cy + 34);
  ctx.stroke();
}

function drawTroll(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.strokeStyle = MONSTER_COLOR;
  ctx.lineWidth = 3;
  // Massive head
  ctx.beginPath();
  ctx.arc(cx, cy - 34, 16, 0, Math.PI * 2);
  ctx.stroke();
  // Underbite fangs
  ctx.fillStyle = MONSTER_COLOR;
  ctx.fillRect(cx - 8, cy - 24, 3, 5);
  ctx.fillRect(cx + 5, cy - 24, 3, 5);
  // Hunched body
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy - 20);
  ctx.quadraticCurveTo(cx - 24, cy + 10, cx - 18, cy + 20);
  ctx.lineTo(cx + 18, cy + 20);
  ctx.quadraticCurveTo(cx + 24, cy + 10, cx + 16, cy - 20);
  ctx.stroke();
  // Huge arms with club
  ctx.beginPath();
  ctx.moveTo(cx + 18, cy - 14); ctx.lineTo(cx + 34, cy + 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 30, cy + 10); ctx.lineTo(cx + 44, cy + 4); // club
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy - 14); ctx.lineTo(cx - 30, cy + 14);
  ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy + 20); ctx.lineTo(cx - 14, cy + 46);
  ctx.moveTo(cx + 10, cy + 20); ctx.lineTo(cx + 14, cy + 46);
  ctx.stroke();
}

function drawWraith(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.strokeStyle = MONSTER_COLOR;
  ctx.lineWidth = 2;
  // Hooded head
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 44);
  ctx.quadraticCurveTo(cx, cy - 58, cx + 14, cy - 44);
  ctx.lineTo(cx + 14, cy - 24);
  ctx.quadraticCurveTo(cx, cy - 32, cx - 14, cy - 24);
  ctx.closePath();
  ctx.stroke();
  // Glowing eyes
  ctx.fillStyle = MONSTER_COLOR;
  ctx.fillRect(cx - 7, cy - 44, 4, 3);
  ctx.fillRect(cx + 3, cy - 44, 4, 3);
  // Tattered robe body
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 26);
  ctx.quadraticCurveTo(cx - 22, cy + 8, cx - 16, cy + 30);
  ctx.lineTo(cx - 8, cy + 22);
  ctx.lineTo(cx - 2, cy + 34);
  ctx.lineTo(cx + 4, cy + 20);
  ctx.lineTo(cx + 10, cy + 32);
  ctx.lineTo(cx + 14, cy + 24);
  ctx.quadraticCurveTo(cx + 20, cy + 4, cx + 14, cy - 26);
  ctx.stroke();
  // Wispy claw hands
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy - 6); ctx.lineTo(cx - 26, cy - 16);
  ctx.moveTo(cx - 18, cy - 6); ctx.lineTo(cx - 24, cy - 4);
  ctx.moveTo(cx + 18, cy - 6); ctx.lineTo(cx + 26, cy - 16);
  ctx.stroke();
}

const MONSTER_DRAWERS: Record<MonsterKind, (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void> = {
  GIANT_RAT: drawGiantRat,
  SKELETON: drawSkeleton,
  GOBLIN_SKIRMISHER: drawGoblin,
  CAVE_TROLL: drawTroll,
  WRAITH: drawWraith,
};

function drawMonster(ctx: CanvasRenderingContext2D, kind: MonsterKind, hpRatio: number) {
  const cx = CX;
  const cy = CY;
  // Wobble animation
  const t = performance.now();
  const wob = Math.sin(t / 180) * 2;
  ctx.save();
  ctx.translate(0, wob);
  // Low HP: red flash tint frame
  if (hpRatio < 0.35) {
    ctx.save();
    ctx.strokeStyle = MONSTER_HIT_FLASH;
    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t / 120);
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 60, cy - 70, 120, 140);
    ctx.restore();
  }
  MONSTER_DRAWERS[kind](ctx, cx, cy);
  ctx.restore();

  // Monster HP bar
  const bw = 80;
  ctx.strokeStyle = MONSTER_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - bw / 2, cy + 58, bw, 6);
  ctx.fillStyle = MONSTER_COLOR;
  ctx.fillRect(cx - bw / 2 + 1, cy + 59, (bw - 2) * Math.max(0, hpRatio), 4);
}

export function renderDungeonFrame(ctx: CanvasRenderingContext2D, state: GameState, monsterKind?: MonsterKind, monsterHpRatio?: number) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, W, H);

  drawFrustum(ctx, state);
  drawCompass(ctx, state);

  if (monsterKind) {
    drawMonster(ctx, monsterKind, monsterHpRatio ?? 1);
  }

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
