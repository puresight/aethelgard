export const DUNGEON_SIZE = 10;

export type DungeonTile =
  | 0 // Open corridor
  | 1 // Solid stone wall
  | 2 // Ladder Up (exits to Overworld)
  | 3; // Ladder Down (reserved for lower levels)

export const VAULT_TILE = {
  OPEN: 0 as DungeonTile,
  WALL: 1 as DungeonTile,
  LADDER_UP: 2 as DungeonTile,
  LADDER_DOWN: 3 as DungeonTile,
};

export const DUNGEON_ENTRANCE = { x: 1, y: 1 };

const FLOORS = 3;

export function createVaultFloor(level: number): DungeonTile[][] {
  const grid: DungeonTile[][] = [];
  for (let y = 0; y < DUNGEON_SIZE; y++) {
    const row: DungeonTile[] = [];
    for (let x = 0; x < DUNGEON_SIZE; x++) {
      row.push(VAULT_TILE.OPEN);
    }
    grid.push(row);
  }

  // Deterministic PRNG (mulberry32), seeded per level so layout is stable
  let seed = 0x5eed + level * 7919;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Interior rooms with connecting corridors, carved from wall blocks
  const carveRoom = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (x > 0 && x < DUNGEON_SIZE - 1 && y > 0 && y < DUNGEON_SIZE - 1) {
          grid[y][x] = VAULT_TILE.OPEN;
        }
      }
    }
  };

  const rooms: Array<[number, number, number, number]> = [
    [1, 1, 3, 3], [6, 1, 3, 2], [6, 5, 3, 3], [1, 6, 3, 3], [4, 4, 2, 2],
  ];
  for (const [x, y, w, h] of rooms) carveRoom(x, y, w, h);

  // Corridors linking rooms
  carveRoom(3, 2, 4, 1); // room 1 -> 2
  carveRoom(7, 3, 1, 3); // room 2 -> 3
  carveRoom(5, 6, 2, 1); // room 3 -> 4
  carveRoom(2, 4, 1, 3); // room 1 -> 4
  carveRoom(4, 4, 3, 1); // hub -> room 5

  // Scatter debris walls inside rooms for maze feel
  const obstacles: Array<[number, number]> = [
    [2, 2], [7, 2], [7, 6], [2, 7], [4, 5], [8, 8], [5, 7], [3, 3],
  ];
  for (const [x, y] of obstacles) {
    // Never block the entrance tile or its immediate exits
    if (
      (x === DUNGEON_ENTRANCE.x && y === DUNGEON_ENTRANCE.y) ||
      (x === DUNGEON_ENTRANCE.x + 1 && y === DUNGEON_ENTRANCE.y) ||
      (x === DUNGEON_ENTRANCE.x && y === DUNGEON_ENTRANCE.y + 1)
    ) {
      continue;
    }
    grid[y][x] = VAULT_TILE.WALL;
  }

  // Solid boundary
  for (let i = 0; i < DUNGEON_SIZE; i++) {
    grid[0][i] = VAULT_TILE.WALL;
    grid[DUNGEON_SIZE - 1][i] = VAULT_TILE.WALL;
    grid[i][0] = VAULT_TILE.WALL;
    grid[i][DUNGEON_SIZE - 1] = VAULT_TILE.WALL;
  }

  // Ladder Up at the entrance; Ladder Down on the last floor
  grid[DUNGEON_ENTRANCE.y][DUNGEON_ENTRANCE.x] = VAULT_TILE.LADDER_UP;
  if (level >= FLOORS) {
    grid[DUNGEON_SIZE - 2][DUNGEON_SIZE - 2] = VAULT_TILE.LADDER_DOWN;
  } else {
    grid[DUNGEON_SIZE - 2][DUNGEON_SIZE - 2] = VAULT_TILE.LADDER_DOWN;
  }

  return grid;
}

export function isVaultPassable(tile: DungeonTile): boolean {
  return tile !== VAULT_TILE.WALL;
}
