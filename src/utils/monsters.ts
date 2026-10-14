import type { Monster, MonsterKind } from '@/types/game';

interface MonsterDef {
  name: string;
  hp: number;
  attack: number;
  goldReward: number;
  expReward: number;
  minLevel: number;
}

export const MONSTER_DEFS: Record<MonsterKind, MonsterDef> = {
  GIANT_RAT: {
    name: 'Giant Rat',
    hp: 14,
    attack: 4,
    goldReward: 6,
    expReward: 8,
    minLevel: 1,
  },
  SKELETON: {
    name: 'Skeleton',
    hp: 22,
    attack: 7,
    goldReward: 12,
    expReward: 15,
    minLevel: 1,
  },
  GOBLIN_SKIRMISHER: {
    name: 'Goblin Skirmisher',
    hp: 28,
    attack: 9,
    goldReward: 18,
    expReward: 22,
    minLevel: 1,
  },
  CAVE_TROLL: {
    name: 'Cave Troll',
    hp: 55,
    attack: 14,
    goldReward: 45,
    expReward: 60,
    minLevel: 2,
  },
  WRAITH: {
    name: 'Wraith',
    hp: 40,
    attack: 16,
    goldReward: 35,
    expReward: 50,
    minLevel: 2,
  },
};

export function spawnMonster(floorLevel: number): Monster {
  const pool = (Object.keys(MONSTER_DEFS) as MonsterKind[]).filter(
    (k) => MONSTER_DEFS[k].minLevel <= floorLevel
  );
  const kind = pool[Math.floor(Math.random() * pool.length)];
  const def = MONSTER_DEFS[kind];
  // Scale monster slightly with floor depth
  const scale = 1 + (floorLevel - 1) * 0.15;
  const hp = Math.round(def.hp * scale);
  return {
    kind,
    name: def.name,
    hp,
    maxHp: hp,
    attack: Math.round(def.attack * scale),
    goldReward: Math.round(def.goldReward * scale),
    expReward: Math.round(def.expReward * scale),
  };
}

export const ENCOUNTER_CHANCE = 0.15;
