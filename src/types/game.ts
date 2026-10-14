export type GameMode = 'OVERWORLD' | 'DUNGEON' | 'COMBAT' | 'GAME_OVER';

export type Direction = 0 | 1 | 2 | 3;

export type TileType =
  | 0 // WATER (impassable)
  | 1 // GRASS (passable, cost 1 food)
  | 2 // FOREST (passable, cost 1 food)
  | 3 // MOUNTAIN (impassable)
  | 4 // TOWN (passable, entry to town)
  | 5; // DUNGEON (passable, entry to dungeon)

export interface PlayerStats {
  hp: number;
  maxHp: number;
  food: number;
  gold: number;
  level: number;
  exp: number;
  attack: number;
  defense: number;
  hasBroadsword: boolean;
  hasChainmail: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export type MonsterKind = 'GIANT_RAT' | 'SKELETON' | 'GOBLIN_SKIRMISHER' | 'CAVE_TROLL' | 'WRAITH';

export interface Monster {
  kind: MonsterKind;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  goldReward: number;
  expReward: number;
}

export interface CombatState {
  monster: Monster;
  playerParrying: boolean;
  fled: boolean;
}

export interface GameState {
  mode: GameMode;
  player: PlayerStats;
  worldPos: Position;
  dungeonPos: Position;
  dungeonDir: Direction;
  dungeonLevel: number;
  inCombat: boolean;
  combat: CombatState | null;
  log: string[];
}

export const DEATH_MESSAGE = 'You have succumbed to starvation and collapsed. Game Over.';

export function createInitialState(): GameState {
  return {
    mode: 'OVERWORLD',
    player: {
      hp: 100,
      maxHp: 100,
      food: 150,
      gold: 25,
      level: 1,
      exp: 0,
      attack: 2,
      defense: 1,
      hasBroadsword: false,
      hasChainmail: false,
    },
    worldPos: { x: 15, y: 16 },
    dungeonPos: { x: 1, y: 1 },
    dungeonDir: 1,
    dungeonLevel: 1,
    inCombat: false,
    combat: null,
    log: [
      'You awaken on the plains of Aethelgard. High Justiciar Vance calls for a champion.',
    ],
  };
}
