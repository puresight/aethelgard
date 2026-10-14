import type { Position, TileType } from '@/types/game';

export const MAP_SIZE = 32;

export const TILE = {
  WATER: 0 as TileType,
  GRASS: 1 as TileType,
  FOREST: 2 as TileType,
  MOUNTAIN: 3 as TileType,
  TOWN: 4 as TileType,
  DUNGEON: 5 as TileType,
};

export const TOWN_POS: Position = { x: 14, y: 16 };
export const OAKHAVEN_POS = TOWN_POS;
export const ABYSSAL_VAULTS_POS: Position = { x: 18, y: 12 };
export const DUNGEON_POS = ABYSSAL_VAULTS_POS;

export function createOverworldMap(): TileType[][] {
  const map: TileType[][] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      row.push(TILE.GRASS);
    }
    map.push(row);
  }

  // Water border: 2-tile moat so the shoreline reads on the viewport
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (x < 2 || x >= MAP_SIZE - 2 || y < 2 || y >= MAP_SIZE - 2) {
        map[y][x] = TILE.WATER;
      }
    }
  }

  // Deterministic PRNG (mulberry32) so the world is identical every load
  let seed = 1981;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Foreground patches, kept off the outer water ring
  const paintPatch = (
    cx: number,
    cy: number,
    radius: number,
    tile: TileType,
    density: number
  ) => {
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

  // Mountain ridges
  for (let i = 0; i < 9; i++) {
    const x = 6 + i * 2;
    paintPatch(x, 21, 1, TILE.MOUNTAIN, 0.7);
    paintPatch(22 - i, 9, 1, TILE.MOUNTAIN, 0.55);
  }

  // Lakes
  paintPatch(22, 21, 2, TILE.WATER, 0.85);
  paintPatch(8, 11, 2, TILE.WATER, 0.8);

  // Keep the two sites' surroundings walkable
  paintPatch(TOWN_POS.x, TOWN_POS.y, 1, TILE.GRASS, 1);
  paintPatch(DUNGEON_POS.x, DUNGEON_POS.y, 1, TILE.GRASS, 1);
  map[TOWN_POS.y][TOWN_POS.x] = TILE.TOWN;
  map[DUNGEON_POS.y][DUNGEON_POS.x] = TILE.DUNGEON;

  return map;
}

export function isPassable(tile: TileType): boolean {
  return tile !== TILE.WATER && tile !== TILE.MOUNTAIN;
}
