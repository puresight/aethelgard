import type { Monster, MonsterKind, Position } from '@/types/game';
import { newId } from '@/types/game';

interface MonsterDef {
  name: string;
  hp: number;
  attack: number;
  goldReward: number;
  expReward: number;
  dungeon: boolean;
}

export const MONSTER_DEFS: Record<MonsterKind, MonsterDef> = {
  GOBLIN: { name: 'Goblin', hp: 8, attack: 3, goldReward: 5, expReward: 6, dungeon: false },
  WOLF: { name: 'Wolf', hp: 10, attack: 4, goldReward: 4, expReward: 7, dungeon: false },
  GIANT_RAT: { name: 'Giant Rat', hp: 7, attack: 2, goldReward: 3, expReward: 4, dungeon: true },
  SKELETON: { name: 'Skeleton', hp: 12, attack: 4, goldReward: 8, expReward: 9, dungeon: true },
  GOBLIN_SKIRMISHER: { name: 'Goblin Skirmisher', hp: 15, attack: 5, goldReward: 12, expReward: 13, dungeon: true },
  CAVE_TROLL: { name: 'Cave Troll', hp: 30, attack: 8, goldReward: 30, expReward: 34, dungeon: true },
  WRAITH: { name: 'Wraith', hp: 22, attack: 9, goldReward: 24, expReward: 30, dungeon: true },
};

export function makeMonster(kind: MonsterKind, dungeonLevel = 1): Monster {
  const def = MONSTER_DEFS[kind];
  const scale = dungeon ? 1 + (dungeonLevel - 1) * 0.25 : 1;
  const hp = Math.round(def.hp * scale);
  return {
    id: newId(),
    kind,
    name: def.name,
    hp,
    maxHp: hp,
    attack: Math.round(def.attack * scale),
    goldReward: Math.round(def.goldReward * scale),
    expReward: Math.round(def.expReward * scale),
  };
}

const dungeon = Object.keys(MONSTER_DEFS).filter((k) => MONSTER_DEFS[k as MonsterKind].dungeon) as MonsterKind[];

export function spawnDungeonMonster(level: number): Monster {
  const pool = level >= 2 ? dungeon : dungeon.filter((k) => k !== 'CAVE_TROLL' && k !== 'WRAITH');
  const kind = pool[Math.floor(Math.random() * pool.length)];
  return makeMonster(kind, level);
}

export function spawnOverworldMonster(): Monster {
  return makeMonster(Math.random() < 0.5 ? 'GOBLIN' : 'WOLF');
}

export function makeChest(pos: Position, dungeonLevel: number): import('@/types/game').Chest {
  const roll = Math.random();
  const base = { id: newId(), pos, dungeon: dungeonLevel > 0, dungeonLevel, opened: false };
  if (roll < 0.45) {
    return { ...base, gold: 15 + Math.floor(Math.random() * 20) + dungeonLevel * 8 };
  }
  if (roll < 0.75) {
    const weapons = [
      { name: 'Short Sword', attack: 5 },
      { name: 'Iron Broadsword', attack: 8 },
      { name: 'Runed Claymore', attack: 12 },
      { name: 'Dawnblade', attack: 16 },
    ];
    return { ...base, gold: 0, weapon: weapons[Math.min(dungeonLevel, weapons.length - 1)] };
  }
  const armors = [
    { name: 'Leather Jerkin', defense: 2 },
    { name: 'Chainmail Hauberk', defense: 4 },
    { name: 'Plate of the Justiciar', defense: 7 },
  ];
  return { ...base, gold: 0, armor: armors[Math.min(dungeonLevel, armors.length - 1)] };
}
