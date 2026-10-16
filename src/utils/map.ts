import type { Chest, Position, Shrine, TileType } from '@/types/game';
import { newId } from '@/types/game';

export const MAP_SIZE = 32;

export const TILE = {
  WATER: 0 as TileType,
  GRASS: 1 as TileType,
  FOREST: 2 as TileType,
  MOUNTAIN: 3 as TileType,
  TOWN: 4 as TileType,
  DUNGEON: 5 as TileType,
  CAMPFIRE: 6 as TileType,
  SPRING: 7 as TileType,
};

export const TOWN_POS: Position = { x: 14, y: 16 };
export const DUNGEON_POS: Position = { x: 18, y: 12 };

// Deterministic PRNG (mulberry32) so the world is identical every load
export function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createOverworldMap(): TileType[][] {
  const map: TileType[][] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    map.push(Array.from({ length: MAP_SIZE }, () => TILE.GRASS));
  }

  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (x < 2 || x >= MAP_SIZE - 2 || y < 2 || y >= MAP_SIZE - 2) {
        map[y][x] = TILE.WATER;
      }
    }
  }

  const rand = mulberry32(1981);

  const paintPatch = (cx: number, cy: number, radius: number, tile: TileType, density: number) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 2 || x >= MAP_SIZE - 2 || y < 2 || y >= MAP_SIZE - 2) continue;
        if (rand() > density) continue;
        map[y][x] = tile;
      }
    }
  };

  const centers = [
    { x: 6, y: 5, r: 5, t: TILE.FOREST, d: 0.9 },
    { x: 24, y: 6, r: 4, t: TILE.FOREST, d: 0.75 },
    { x: 10, y: 26, r: 4, t: TILE.FOREST, d: 0.8 },
    { x: 26, y: 25, r: 5, t: TILE.FOREST, d: 0.7 },
    { x: 5, y: 18, r: 3, t: TILE.MOUNTAIN, d: 0.9 },
    { x: 25, y: 16, r: 3, t: TILE.MOUNTAIN, d: 0.85 },
    { x: 15, y: 5, r: 2, t: TILE.MOUNTAIN, d: 0.9 },
    { x: 20, y: 27, r: 2, t: TILE.MOUNTAIN, d: 0.9 },
  ];
  for (const c of centers) paintPatch(c.x, c.y, c.r, c.t, c.d);

  for (let i = 0; i < 9; i++) {
    paintPatch(6 + i * 2, 21, 1, TILE.MOUNTAIN, 0.7);
    paintPatch(22 - i, 9, 1, TILE.MOUNTAIN, 0.55);
  }

  paintPatch(22, 21, 2, TILE.WATER, 0.85);
  paintPatch(8, 11, 2, TILE.WATER, 0.8);

  paintPatch(TOWN_POS.x, TOWN_POS.y, 1, TILE.GRASS, 1);
  paintPatch(DUNGEON_POS.x, DUNGEON_POS.y, 1, TILE.GRASS, 1);
  map[TOWN_POS.y][TOWN_POS.x] = TILE.TOWN;
  map[DUNGEON_POS.y][DUNGEON_POS.x] = TILE.DUNGEON;

  // Campfires and springs along likely travel routes
  const landmarks: Array<[number, number, TileType]> = [
    [12, 13, TILE.CAMPFIRE],
    [17, 15, TILE.CAMPFIRE],
    [10, 20, TILE.SPRING],
    [21, 9, TILE.SPRING],
    [7, 9, TILE.CAMPFIRE],
    [26, 20, TILE.SPRING],
  ];
  for (const [x, y, t] of landmarks) map[y][x] = t;

  return map;
}

export function isPassable(tile: TileType): boolean {
  return tile !== TILE.WATER && tile !== TILE.MOUNTAIN;
}

// --- World populator: shrines, chests, and visible foes ---

export interface OverworldSpawn {
  shrines: Shrine[];
  chests: Chest[];
  monsterTiles: Position[];
}

export function populateOverworld(map: TileType[][]): OverworldSpawn {
  const rand = mulberry32(7777);
  const shrines: Shrine[] = [];
  const chests: Chest[] = [];
  const monsterTiles: Position[] = [];

  const freeTile = (): Position | null => {
    for (let tries = 0; tries < 200; tries++) {
      const x = 3 + Math.floor(rand() * (MAP_SIZE - 6));
      const y = 3 + Math.floor(rand() * (MAP_SIZE - 6));
      const t = map[y][x];
      if (t === TILE.GRASS || t === TILE.FOREST) {
        const taken =
          shrines.some((s) => s.pos.x === x && s.pos.y === y) ||
          chests.some((c) => c.pos.x === x && c.pos.y === y) ||
          monsterTiles.some((m) => m.x === x && m.y === y) ||
          (TOWN_POS.x === x && TOWN_POS.y === y) ||
          (DUNGEON_POS.x === x && DUNGEON_POS.y === y);
        if (!taken) return { x, y };
      }
    }
    return null;
  };

  for (let i = 0; i < 2; i++) {
    const p = freeTile();
    if (p) shrines.push({ pos: p, used: false, boon: i === 0 ? 'MAX_HP' : 'ATTACK' });
  }

  const weaponTable = [
    { name: 'Short Sword', attack: 5 },
    { name: 'Iron Broadsword', attack: 8 },
    { name: 'Runed Claymore', attack: 12 },
  ];
  const armorTable = [
    { name: 'Leather Jerkin', defense: 2 },
    { name: 'Chainmail Hauberk', defense: 4 },
  ];

  for (let i = 0; i < 4; i++) {
    const p = freeTile();
    if (!p) break;
    const roll = rand();
    if (roll < 0.4) {
      chests.push({ id: newId(), pos: p, dungeon: false, dungeonLevel: 0, opened: false, gold: 10 + Math.floor(rand() * 20) });
    } else if (roll < 0.75) {
      chests.push({ id: newId(), pos: p, dungeon: false, dungeonLevel: 0, opened: false, gold: 0, weapon: weaponTable[Math.floor(rand() * weaponTable.length)] });
    } else {
      chests.push({ id: newId(), pos: p, dungeon: false, dungeonLevel: 0, opened: false, gold: 0, armor: armorTable[Math.floor(rand() * armorTable.length)] });
    }
  }

  for (let i = 0; i < 8; i++) {
    const p = freeTile();
    if (p) monsterTiles.push(p);
  }

  return { shrines, chests, monsterTiles };
}
