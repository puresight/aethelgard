import { useEffect, useRef } from 'react';
import type { GameState } from '@/types/game';
import { createOverworldMap, TILE } from '@/utils/map';
import { drawMonsterSilhouette, renderDungeonFrame } from '@/components/DungeonRenderer';

const VIEW = 11;
const TILE_PX = 32;
const W = 480;
const H = 320;

const map = createOverworldMap();

function drawWater(ctx: CanvasRenderingContext2D, px: number, py: number, t: number) {
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 1;
  for (let i = 0; i < 2; i++) {
    const wy = py + 8 + i * 14 + Math.sin(t / 900 + px / 40 + i) * 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 5, wy);
    ctx.lineTo(px + 13, wy);
    ctx.moveTo(px + 18, wy + 3);
    ctx.lineTo(px + 27, wy + 3);
    ctx.stroke();
  }
}

function drawGrass(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#15803d';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  ctx.fillStyle = '#22c55e';
  const specks = [[4, 6], [12, 3], [22, 8], [8, 15], [18, 13], [26, 20], [6, 24], [16, 22], [24, 27]];
  for (const [sx, sy] of specks) ctx.fillRect(px + sx, py + sy, 2, 4);
}

function drawForest(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#14532d';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  const trees = [[8, 20], [20, 24], [14, 26]];
  for (const [tx, ty] of trees) {
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(px + tx, py + ty - 16);
    ctx.lineTo(px + tx - 7, py + ty);
    ctx.lineTo(px + tx + 7, py + ty);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(px + tx - 1, py + ty, 2, 4);
  }
}

function drawMountain(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#334155';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  // Rear peak
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(px + 10, py + 6);
  ctx.lineTo(px + 2, py + 30);
  ctx.lineTo(px + 18, py + 30);
  ctx.closePath();
  ctx.fill();
  // Foreground peak
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(px + 22, py + 10);
  ctx.lineTo(px + 10, py + 32);
  ctx.lineTo(px + 30, py + 32);
  ctx.closePath();
  ctx.fill();
  // Ridge highlight
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(px + 22, py + 10);
  ctx.lineTo(px + 16, py + 32);
  ctx.lineTo(px + 18, py + 32);
  ctx.closePath();
  ctx.fill();
  // Snow caps
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(px + 22, py + 10);
  ctx.lineTo(px + 18, py + 18);
  ctx.lineTo(px + 21, py + 16);
  ctx.lineTo(px + 24, py + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(px + 10, py + 6);
  ctx.lineTo(px + 7, py + 13);
  ctx.lineTo(px + 10, py + 11);
  ctx.lineTo(px + 13, py + 13);
  ctx.closePath();
  ctx.fill();
}

function drawTown(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#a16207';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  ctx.fillStyle = '#d6d3d1';
  ctx.fillRect(px + 6, py + 8, 20, 16);
  ctx.fillStyle = '#57534e';
  for (let i = 0; i < 3; i++) ctx.fillRect(px + 6 + i * 8, py + 5, 4, 4);
  ctx.fillStyle = '#292524';
  ctx.fillRect(px + 13, py + 16, 6, 8);
}

function drawDungeonEntrance(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#292524';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(px + 6, py + 10, 20, 16);
  ctx.fillStyle = '#57534e';
  ctx.fillRect(px + 8, py + 13, 16, 2);
  ctx.fillRect(px + 11, py + 17, 10, 2);
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(px + 12, py + 4);
  ctx.lineTo(px + 16, py + 8);
  ctx.lineTo(px + 20, py + 4);
  ctx.lineTo(px + 20, py + 2);
  ctx.lineTo(px + 16, py + 6);
  ctx.lineTo(px + 12, py + 2);
  ctx.closePath();
  ctx.fill();
}

function drawCampfire(ctx: CanvasRenderingContext2D, px: number, py: number, t: number) {
  ctx.fillStyle = '#166534';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  // Logs
  ctx.fillStyle = '#78350f';
  ctx.fillRect(px + 8, py + 20, 16, 4);
  ctx.fillRect(px + 11, py + 24, 10, 3);
  // Flame flicker
  const frame = Math.floor(t / 180) % 2;
  ctx.fillStyle = '#f97316';
  if (frame === 0) {
    ctx.beginPath();
    ctx.moveTo(px + 16, py + 4);
    ctx.lineTo(px + 10, py + 20);
    ctx.lineTo(px + 22, py + 20);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(px + 16, py + 7);
    ctx.lineTo(px + 11, py + 20);
    ctx.lineTo(px + 21, py + 20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(px + 16, py + 12);
  ctx.lineTo(px + 12, py + 20);
  ctx.lineTo(px + 20, py + 20);
  ctx.closePath();
  ctx.fill();
  // Glow
  ctx.fillStyle = `rgba(249,115,22,${frame === 0 ? 0.15 : 0.22})`;
  ctx.beginPath();
  ctx.arc(px + 16, py + 16, 15, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpring(ctx: CanvasRenderingContext2D, px: number, py: number, t: number) {
  ctx.fillStyle = '#166534';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  // Pool
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.arc(px + 16, py + 18, 11, 0, Math.PI * 2);
  ctx.fill();
  // Sparkle
  const frame = Math.floor(t / 300) % 2;
  ctx.fillStyle = '#e0f2fe';
  if (frame === 0) {
    ctx.fillRect(px + 12, py + 14, 2, 2);
    ctx.fillRect(px + 19, py + 20, 2, 2);
  } else {
    ctx.fillRect(px + 18, py + 14, 2, 2);
    ctx.fillRect(px + 12, py + 21, 2, 2);
  }
}

function drawChestTile(ctx: CanvasRenderingContext2D, px: number, py: number, opened: boolean) {
  ctx.fillStyle = '#92400e';
  ctx.fillRect(px + 6, py + 10, 20, 14);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(px + 6, py + 10, 20, 5);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 6, py + 10, 20, 14);
  if (!opened) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(px + 14, py + 15, 4, 6);
  } else {
    ctx.fillStyle = '#050505';
    ctx.fillRect(px + 9, py + 12, 14, 4);
  }
}

function drawShrineTile(ctx: CanvasRenderingContext2D, px: number, py: number, used: boolean, t: number) {
  ctx.fillStyle = '#166534';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  // Stone plinth
  ctx.fillStyle = '#57534e';
  ctx.fillRect(px + 9, py + 14, 14, 12);
  ctx.fillStyle = '#78716c';
  ctx.fillRect(px + 7, py + 26, 18, 4);
  // Crystal
  if (!used) {
    const glow = 0.5 + 0.3 * Math.sin(t / 400);
    ctx.fillStyle = `rgba(103,232,249,${glow})`;
    ctx.beginPath();
    ctx.moveTo(px + 16, py + 2);
    ctx.lineTo(px + 11, py + 12);
    ctx.lineTo(px + 21, py + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(px + 16, py + 4);
    ctx.lineTo(px + 12, py + 12);
    ctx.lineTo(px + 20, py + 12);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlayerOverworld(ctx: CanvasRenderingContext2D, px: number, py: number) {
  const cx = px + TILE_PX / 2;
  const cy = py + TILE_PX / 2;
  const s = 2;
  const p = (ox: number, oy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(cx + ox * s), Math.round(cy + oy * s), w * s, h * s);
  };
  // Sword
  p(6, -8, 1, 8, '#f8fafc');
  p(5, 0, 3, 1, '#eab308');
  p(6, 1, 1, 2, '#78350f');
  // Legs + boots
  p(-2, 4, 2, 4, '#94a3b8');
  p(0, 4, 2, 4, '#94a3b8');
  p(-2, 8, 2, 2, '#78350f');
  p(0, 8, 2, 2, '#78350f');
  // Torso + belt
  p(-3, -2, 6, 6, '#2563eb');
  p(-3, 3, 6, 1, '#eab308');
  // Shield
  p(-7, -3, 4, 5, '#b91c1c');
  p(-6, -1, 3, 1, '#f8fafc');
  // Arm
  p(3, -2, 2, 3, '#2563eb');
  // Face + helm
  p(-2, -5, 4, 3, '#d4a373');
  p(-3, -8, 6, 3, '#cbd5e1');
  p(-2, -6, 4, 1, '#0f172a');
  p(-3, -8, 6, 1, '#e2e8f0');
}

function drawFloatText(ctx: CanvasRenderingContext2D, f: { x: number; y: number; text: string; color: string; born: number }, ox: number, oy: number, now: number) {
  const age = (now - f.born) / 900;
  if (age > 1) return;
  const px = ox + f.x * TILE_PX + TILE_PX / 2;
  const py = oy + f.y * TILE_PX + TILE_PX / 2 - age * 22;
  const colors: Record<string, string> = {
    red: '#f87171',
    green: '#4ade80',
    gold: '#fbbf24',
    white: '#e2e8f0',
  };
  ctx.globalAlpha = 1 - age;
  ctx.fillStyle = colors[f.color] ?? '#fff';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(f.text, px, py);
  ctx.fillText(f.text, px, py);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawSlashEffect(ctx: CanvasRenderingContext2D, dir: number, born: number, ox: number, oy: number, px: number, py: number, now: number) {
  const age = (now - born) / 220;
  if (age > 1) return;
  const cx = ox + px * TILE_PX + TILE_PX / 2;
  const cy = oy + py * TILE_PX + TILE_PX / 2;
  const r = 10 + age * 14;
  const startAngle = dir * (Math.PI / 2) - 0.9;
  ctx.globalAlpha = 1 - age;
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, startAngle + 1.8);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export default function GameCanvas({ state }: { state: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const now = performance.now();
      ctx.imageSmoothingEnabled = false;

      if (state.mode === 'DUNGEON') {
        renderDungeonFrame(ctx, state);
        return;
      }

      // Screen shake
      let shakeX = 0;
      let shakeY = 0;
      if (now < state.shakeUntil) {
        shakeX = Math.round((Math.random() - 0.5) * 4);
        shakeY = Math.round((Math.random() - 0.5) * 4);
      }
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      const active = VIEW * TILE_PX;
      const ox = Math.floor((W - active) / 2);
      const oy = Math.floor((H - active) / 2);
      const player = state.worldPos;
      const half = Math.floor(VIEW / 2);
      const t = now;

      for (let vy = 0; vy < VIEW; vy++) {
        for (let vx = 0; vx < VIEW; vx++) {
          const wx = player.x - half + vx;
          const wy = player.y - half + vy;
          const px = ox + vx * TILE_PX;
          const py = oy + vy * TILE_PX;
          const tile = wx < 0 || wy < 0 || wx >= map.length || wy >= map[0].length
            ? TILE.WATER
            : map[wy][wx];
          switch (tile) {
            case TILE.WATER: drawWater(ctx, px, py, t); break;
            case TILE.GRASS: drawGrass(ctx, px, py); break;
            case TILE.FOREST: drawForest(ctx, px, py); break;
            case TILE.MOUNTAIN: drawMountain(ctx, px, py); break;
            case TILE.TOWN: drawTown(ctx, px, py); break;
            case TILE.DUNGEON: drawDungeonEntrance(ctx, px, py); break;
            case TILE.CAMPFIRE: drawCampfire(ctx, px, py, t); break;
            case TILE.SPRING: drawSpring(ctx, px, py, t); break;
          }
        }
      }

      // Chests
      for (const c of state.chests) {
        if (c.dungeon) continue;
        const vx = c.pos.x - (player.x - half);
        const vy = c.pos.y - (player.y - half);
        if (vx < 0 || vy < 0 || vx >= VIEW || vy >= VIEW) continue;
        drawChestTile(ctx, ox + vx * TILE_PX, oy + vy * TILE_PX, c.opened);
      }

      // Shrines
      for (const sh of state.shrines) {
        const vx = sh.pos.x - (player.x - half);
        const vy = sh.pos.y - (player.y - half);
        if (vx < 0 || vy < 0 || vx >= VIEW || vy >= VIEW) continue;
        drawShrineTile(ctx, ox + vx * TILE_PX, oy + vy * TILE_PX, sh.used, t);
      }

      // Visible monsters
      for (const e of state.entities) {
        if (e.dungeon) continue;
        const vx = e.pos.x - (player.x - half);
        const vy = e.pos.y - (player.y - half);
        if (vx < 0 || vy < 0 || vx >= VIEW || vy >= VIEW) continue;
        drawMonsterSilhouette(ctx, e.kind, ox + vx * TILE_PX + TILE_PX / 2, oy + vy * TILE_PX + TILE_PX / 2, 0.28);
        // HP pip bar
        const ratio = e.hp / e.maxHp;
        ctx.fillStyle = '#000';
        ctx.fillRect(ox + vx * TILE_PX + 4, oy + vy * TILE_PX + 1, 24, 3);
        ctx.fillStyle = ratio > 0.5 ? '#22c55e' : '#ef4444';
        ctx.fillRect(ox + vx * TILE_PX + 5, oy + vy * TILE_PX + 2, 22 * ratio, 1);
      }

      drawPlayerOverworld(ctx, ox + half * TILE_PX, oy + half * TILE_PX);

      // Slash effects
      for (const sl of state.slashes) {
        drawSlashEffect(ctx, sl.dir, sl.born, ox, oy, half, half, now);
      }

      // Floating text
      for (const f of state.floats) {
        const vx = f.x - (player.x - half);
        const vy = f.y - (player.y - half);
        if (vx < -1 || vy < -1 || vx > VIEW || vy > VIEW) continue;
        drawFloatText(ctx, f, ox, oy, now);
      }

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(ox - 1, oy - 1, active + 2, active + 2);
      ctx.restore();

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={320}
      className="block w-full h-auto"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
