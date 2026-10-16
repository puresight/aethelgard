export type GameMode = 'OVERWORLD' | 'DUNGEON' | 'GAME_OVER';

export type Direction = 0 | 1 | 2 | 3;

export type TileType =
  | 0 // WATER (impassable)
  | 1 // GRASS (passable)
  | 2 // FOREST (passable)
  | 3 // MOUNTAIN (impassable)
  | 4 // TOWN (auto-rest landmark)
  | 5 // DUNGEON (enterable)
  | 6 // CAMPFIRE (heal +15 on step)
  | 7; // SPRING (heal +15 on step)

export interface Position {
  x: number;
  y: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  gold: number;
  level: number;
  exp: number;
  attack: number;
  defense: number;
  weapon: string;
  armor: string;
}

export type MonsterKind =
  | 'GOBLIN' | 'WOLF' | 'GIANT_RAT' | 'SKELETON'
  | 'GOBLIN_SKIRMISHER' | 'CAVE_TROLL' | 'WRAITH';

export interface Monster {
  id: number;
  kind: MonsterKind;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  goldReward: number;
  expReward: number;
}

export interface Entity extends Monster {
  pos: Position;
  dungeon: boolean;
  dungeonLevel: number;
}

export interface Chest {
  id: number;
  pos: Position;
  dungeon: boolean;
  dungeonLevel: number;
  opened: boolean;
  gold: number;
  weapon?: { name: string; attack: number };
  armor?: { name: string; defense: number };
}

export interface Shrine {
  pos: Position;
  used: boolean;
  boon: 'MAX_HP' | 'ATTACK';
}

export interface FloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: 'red' | 'green' | 'gold' | 'white';
  born: number;
}

export interface Slash {
  id: number;
  born: number;
  dir: Direction;
}

export interface GameState {
  mode: GameMode;
  player: PlayerStats;
  worldPos: Position;
  dungeonPos: Position;
  dungeonDir: Direction;
  dungeonLevel: number;
  entities: Entity[];
  chests: Chest[];
  shrines: Shrine[];
  floats: FloatText[];
  slashes: Slash[];
  shakeUntil: number;
  log: string[];
}

export const DEATH_MESSAGE = 'You have fallen. Game Over.';

let nextId = 1;
export const newId = () => nextId++;

export function createInitialState(): GameState {
  return {
    mode: 'OVERWORLD',
    player: {
      hp: 30,
      maxHp: 30,
      gold: 25,
      level: 1,
      exp: 0,
      attack: 3,
      defense: 0,
      weapon: 'Rusty Dagger',
      armor: 'Tattered Cloak',
    },
    worldPos: { x: 15, y: 16 },
    dungeonPos: { x: 1, y: 1 },
    dungeonDir: 1,
    dungeonLevel: 1,
    entities: [],
    chests: [],
    shrines: [],
    floats: [],
    slashes: [],
    shakeUntil: 0,
    log: ['You awaken in the wilds of Aethelgard. Seek the Abyssal Vaults to the northeast.'],
  };
}

export const WEAPONS = [
  { name: 'Rusty Dagger', attack: 3 },
  { name: 'Short Sword', attack: 5 },
  { name: 'Iron Broadsword', attack: 8 },
  { name: 'Runed Claymore', attack: 12 },
  { name: 'Dawnblade', attack: 16 },
];

export const ARMORS = [
  { name: 'Tattered Cloak', defense: 0 },
  { name: 'Leather Jerkin', defense: 2 },
  { name: 'Chainmail Hauberk', defense: 4 },
  { name: 'Plate of the Justiciar', defense: 7 },
];
