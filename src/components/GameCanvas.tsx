import { useEffect, useRef } from 'react';
import type { GameState } from '@/types/game';
import { createOverworldMap, TILE } from '@/utils/map';
import { renderDungeonFrame } from '@/components/DungeonRenderer';

const VIEW = 11; // 11x11 tile viewport
const TILE_PX = 32;

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
  const specks = [
    [4, 6], [12, 3], [22, 8], [8, 15], [18, 13], [26, 20], [6, 24], [16, 22], [24, 27],
  ];
  for (const [sx, sy] of specks) {
    ctx.fillRect(px + sx, py + sy, 2, 4);
  }
}

function drawForest(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#14532d';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  const trees = [[8, 20], [20, 24], [14, 26]];
  ctx.fillStyle = '#166534';
  for (const [tx, ty] of trees) {
    ctx.beginPath();
    ctx.moveTo(px + tx, py + ty - 16);
    ctx.lineTo(px + tx - 7, py + ty);
    ctx.lineTo(px + tx + 7, py + ty);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.fillRect(px + tx - 1, py + ty, 2, 4);
    ctx.fillStyle = '#166534';
  }
}

function drawMountain(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#334155';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);

  // Rear/left peak: dark slate
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(px + 10, py + 6);
  ctx.lineTo(px + 2, py + 30);
  ctx.lineTo(px + 18, py + 30);
  ctx.closePath();
  ctx.fill();

  // Foreground peak: mid slate
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(px + 22, py + 10);
  ctx.lineTo(px + 10, py + 32);
  ctx.lineTo(px + 30, py + 32);
  ctx.closePath();
  ctx.fill();

  // Ridge highlight split down the foreground peak (left face lit, right face shadowed)
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(px + 22, py + 10);
  ctx.lineTo(px + 16, py + 32);
  ctx.lineTo(px + 17, py + 32);
  ctx.lineTo(px + 23, py + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#293548';
  ctx.beginPath();
  ctx.moveTo(px + 23, py + 10);
  ctx.lineTo(px + 18, py + 32);
  ctx.lineTo(px + 20, py + 32);
  ctx.lineTo(px + 24, py + 10);
  ctx.closePath();
  ctx.fill();

  // Snow cap on foreground peak
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(px + 22, py + 10);
  ctx.lineTo(px + 18, py + 18);
  ctx.lineTo(px + 20, py + 16);
  ctx.lineTo(px + 22, py + 19);
  ctx.lineTo(px + 24, py + 16);
  ctx.lineTo(px + 26, py + 18);
  ctx.closePath();
  ctx.fill();
  // Snow cap shadow edge
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(px + 22, py + 10);
  ctx.lineTo(px + 24, py + 16);
  ctx.lineTo(px + 26, py + 18);
  ctx.lineTo(px + 23, py + 18);
  ctx.closePath();
  ctx.fill();

  // Snow cap on rear peak
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(px + 10, py + 6);
  ctx.lineTo(px + 7, py + 13);
  ctx.lineTo(px + 9, py + 11);
  ctx.lineTo(px + 11, py + 13);
  ctx.lineTo(px + 13, py + 12);
  ctx.closePath();
  ctx.fill();
}

function drawTown(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#a16207';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  ctx.fillStyle = '#78350f';
  for (let cy = 0; cy < TILE_PX; cy += 8) {
    for (let cx = 0; cx < TILE_PX; cx += 8) {
      ctx.fillRect(px + cx + ((cy / 8) % 2 ? 4 : 0), py + cy, 7, 1);
    }
  }
  // Castle wall + archway
  ctx.fillStyle = '#d6d3d1';
  ctx.fillRect(px + 6, py + 8, 20, 16);
  ctx.fillStyle = '#57534e';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(px + 6 + i * 8, py + 5, 4, 4);
  }
  ctx.fillStyle = '#292524';
  ctx.fillRect(px + 13, py + 16, 6, 8);
  ctx.beginPath();
  ctx.arc(px + 16, py + 16, 3, Math.PI, 0);
  ctx.fill();
}

function drawDungeon(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#292524';
  ctx.fillRect(px, py, TILE_PX, TILE_PX);
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(px + 6, py + 10, 20, 16);
  // Descending steps
  ctx.fillStyle = '#57534e';
  ctx.fillRect(px + 8, py + 13, 16, 2);
  ctx.fillRect(px + 11, py + 17, 10, 2);
  ctx.fillRect(px + 14, py + 21, 4, 2);
  // Red chevron
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

function drawPlayer(ctx: CanvasRenderingContext2D, px: number, py: number) {
  const cx = px + TILE_PX / 2;
  const cy = py + TILE_PX / 2;
  const s = 2; // pixel scale
  const p = (ox: number, oy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(cx + ox * s), Math.round(cy + oy * s), w * s, h * s);
  };

  // Sword blade (right hand, raised)
  p(6, -8, 1, 8, '#f8fafc');
  p(6, -9, 1, 1, '#cbd5e1');
  p(5, 0, 3, 1, '#eab308'); // crossguard
  p(6, 1, 1, 2, '#78350f'); // grip

  // Legs
  p(-2, 4, 2, 4, '#94a3b8');
  p(0, 4, 2, 4, '#94a3b8');
  // Boots
  p(-2, 8, 2, 2, '#78350f');
  p(0, 8, 2, 2, '#78350f');

  // Torso armor
  p(-3, -2, 6, 6, '#2563eb');
  // Gold belt
  p(-3, 3, 6, 1, '#eab308');
  p(-1, 3, 2, 1, '#facc15'); // buckle

  // Left arm + heater shield
  p(-5, -2, 2, 3, '#2563eb');
  p(-7, -3, 4, 5, '#b91c1c');
  p(-6, -3, 1, 5, '#f8fafc'); // white border left
  p(-4, -3, 1, 5, '#f8fafc'); // white border right
  p(-6, -1, 3, 1, '#f8fafc'); // white cross horizontal

  // Right arm
  p(3, -2, 2, 3, '#2563eb');

  // Face
  p(-2, -5, 4, 3, '#d4a373');

  // Iron helm
  p(-3, -8, 6, 3, '#cbd5e1');
  p(-3, -6, 1, 1, '#cbd5e1'); // side guards
  p(2, -6, 1, 1, '#cbd5e1');
  p(-2, -6, 4, 1, '#0f172a'); // eye slit

  // Helm highlight
  p(-3, -8, 6, 1, '#e2e8f0');

  // Retro outline frame
  ctx.strokeStyle = 'rgba(251,191,36,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 3, py + 3, TILE_PX - 6, TILE_PX - 6);
}

const GOLD = '#d97706';
const TEXT_GOLD = '#fbbf24';
const TEXT_GRAY = '#9ca3af';

function drawTownScene(ctx: CanvasRenderingContext2D) {
  const W = 480;

  // Building silhouettes across the town square
  ctx.fillStyle = '#111827';

  // Tavern (left)
  ctx.fillRect(30, 70, 100, 70);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(30, 70, 100, 8); // roof line
  ctx.fillRect(70, 110, 20, 30); // door
  // Tavern sign post
  ctx.fillStyle = '#78350f';
  ctx.fillRect(140, 80, 4, 60);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(126, 84, 32, 20);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ALE', 142, 98);

  // Forge (center)
  ctx.fillStyle = '#111827';
  ctx.fillRect(190, 60, 110, 80);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(190, 60, 110, 8);
  ctx.fillRect(230, 105, 26, 35); // door
  // Anvil silhouette
  ctx.fillStyle = '#475569';
  ctx.fillRect(320, 120, 36, 8);
  ctx.fillRect(330, 128, 16, 10);
  ctx.fillRect(322, 116, 8, 4);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(346, 114, 12, 3); // horn

  // Temple (right)
  ctx.fillStyle = '#111827';
  ctx.fillRect(370, 65, 90, 75);
  ctx.fillStyle = '#1f2937';
  // Pediment
  ctx.beginPath();
  ctx.moveTo(370, 65);
  ctx.lineTo(415, 45);
  ctx.lineTo(460, 65);
  ctx.closePath();
  ctx.fill();
  // Columns
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(378 + i * 20, 70, 6, 60);
  }
  // Altar glow
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(404, 128, 22, 8);

  // Cobbled ground line
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 140);
    ctx.lineTo(x + 8, 140);
    ctx.stroke();
  }
}

function drawTownMenuList(ctx: CanvasRenderingContext2D, subMenu: string) {
  ctx.textAlign = 'left';
  ctx.font = '11px monospace';

  const items: Array<[string, string, string]> = [
    ['1', 'The Rusty Flagon', 'Rest, rations, rumors'],
    ['2', "Vance's Armory", 'Weapons & armor'],
    ['3', 'Temple of the Sun', 'Cure wounds'],
    ['4', "Justiciar's Hall", 'Quest briefing'],
    ['E', 'Leave Oakhaven Keep', 'Back to the wilds'],
  ];

  items.forEach(([key, name, desc], i) => {
    const y = 168 + i * 26;
    const isLeave = key === 'E';
    ctx.fillStyle = isLeave ? '#f87171' : TEXT_GOLD;
    ctx.fillText(`[${key}]`, 36, y);
    ctx.fillStyle = isLeave ? '#fca5a5' : '#e5e7eb';
    ctx.fillText(name, 70, y);
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px monospace';
    ctx.fillText(desc, 250, y);
    ctx.font = '11px monospace';
  });
}

function drawTownHeader(ctx: CanvasRenderingContext2D, subMenu: string) {
  const W = 480;
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = TEXT_GOLD;
  ctx.fillText('=== OAKHAVEN KEEP ===', W / 2, 26);

  ctx.font = '10px monospace';
  ctx.fillStyle = TEXT_GRAY;
  ctx.fillText('Safe haven and marketplace of the realm', W / 2, 42);

  // Sub-menu label
  if (subMenu !== 'MAIN') {
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#f59e0b';
    const names: Record<string, string> = {
      TAVERN: 'The Rusty Flagon (Tavern)',
      ARMORY: "Vance's Armory (Blacksmith)",
      TEMPLE: 'Temple of the Sun (Healer)',
      JUSTICIAR: "Justiciar's Hall (Quest)",
    };
    ctx.fillText(`-- ${names[subMenu] ?? ''} --`, W / 2, 158);
    ctx.textAlign = 'left';
  }
  ctx.textAlign = 'left';
}

function drawTownSubMenus(ctx: CanvasRenderingContext2D, state: GameState) {
  const { townSubMenu, player } = state;
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';

  const footer = (text: string) => {
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px monospace';
    ctx.fillText(text, 36, 306);
    ctx.font = '11px monospace';
  };
  const goldTag = () => {
    ctx.fillStyle = TEXT_GOLD;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`Gold: ${player.gold}`, 360, 306);
    ctx.font = '11px monospace';
  };

  switch (townSubMenu) {
    case 'TAVERN': {
      const rows: Array<[string, string, string]> = [
        ['R', 'Buy 25 Rations', '10 Gold'],
        ['S', 'Rest for the night (+30 HP)', '15 Gold'],
        ['H', 'Hear a rumor', 'Free'],
        ['B', 'Back to Town Square', ''],
      ];
      rows.forEach(([k, label, price], i) => {
        const y = 178 + i * 22;
        ctx.fillStyle = TEXT_GOLD;
        ctx.fillText(`[${k}]`, 36, y);
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText(label, 66, y);
        if (price) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(price, 320, y);
        }
      });
      goldTag();
      break;
    }
    case 'ARMORY': {
      const rows: Array<[string, string, string]> = [
        ['1', 'Iron Broadsword (+4 Attack)', player.hasBroadsword ? 'Owned' : '40 Gold'],
        ['2', 'Chainmail Hauberk (+3 Defense)', player.hasChainmail ? 'Owned' : '60 Gold'],
        ['B', 'Back to Town Square', ''],
      ];
      rows.forEach(([k, label, price], i) => {
        const y = 178 + i * 26;
        ctx.fillStyle = TEXT_GOLD;
        ctx.fillText(`[${k}]`, 36, y);
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText(label, 66, y);
        ctx.fillStyle = price === 'Owned' ? '#22c55e' : '#f59e0b';
        ctx.fillText(price, 330, y);
      });
      goldTag();
      break;
    }
    case 'TEMPLE': {
      const rows: Array<[string, string, string]> = [
        ['H', `Full Restoration (${player.hp}/${player.maxHp} HP)`, '20 Gold'],
        ['B', 'Back to Town Square', ''],
      ];
      rows.forEach(([k, label, price], i) => {
        const y = 178 + i * 24;
        ctx.fillStyle = TEXT_GOLD;
        ctx.fillText(`[${k}]`, 36, y);
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText(label, 66, y);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(price, 330, y);
      });
      goldTag();
      break;
    }
    case 'JUSTICIAR': {
      ctx.fillStyle = '#93c5fd';
      ctx.font = 'italic 10px monospace';
      ctx.fillText('"Descend into the Abyssal Vaults, recover the', 36, 180);
      ctx.fillText('Amulet of Dawn from the lowest depths,', 52, 194);
      ctx.fillText('and return it to me."', 52, 208);
      ctx.font = '11px monospace';
      ctx.fillStyle = TEXT_GRAY;
      ctx.fillText('- High Justiciar Vance', 220, 226);
      ctx.fillStyle = TEXT_GOLD;
      ctx.fillText('[B] Back to Town Square', 36, 250);
      break;
    }
    default:
      break;
  }
  void footer;
}

function renderTownFrame(ctx: CanvasRenderingContext2D, state: GameState) {
  const W = 480;
  const H = 320;

  ctx.imageSmoothingEnabled = false;

  // Background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, W, H);

  // Amber double-border frame
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.strokeRect(10, 10, W - 20, H - 20);

  // Town scene silhouettes (top half)
  drawTownScene(ctx);

  // Header banner
  drawTownHeader(ctx, state.townSubMenu);

  // Menu area (bottom half)
  if (state.townSubMenu === 'MAIN') {
    drawTownMenuList(ctx, state.townSubMenu);
  } else {
    drawTownSubMenus(ctx, state);
  }
}

export default function GameCanvas({ state }: { state: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    if (state.mode === 'DUNGEON') {
      renderDungeonFrame(ctx, state);
      return;
    }
    if (state.mode === 'TOWN') {
      renderTownFrame(ctx, state);
      return;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const active = VIEW * TILE_PX;
    const ox = Math.floor((canvas.width - active) / 2);
    const oy = Math.floor((canvas.height - active) / 2);

    const player = state.worldPos;
    const half = Math.floor(VIEW / 2);
    const t = performance.now();

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
          case TILE.DUNGEON: drawDungeon(ctx, px, py); break;
        }
      }
    }

    drawPlayer(ctx, ox + half * TILE_PX, oy + half * TILE_PX);

    // Frame the viewport with a black border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox - 1, oy - 1, active + 2, active + 2);
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={320}
      className="block w-full max-w-[480px] mx-auto"
    />
  );
}
