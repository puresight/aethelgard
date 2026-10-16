import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialState,
  newId,
  ARMORS,
  WEAPONS,
  DEATH_MESSAGE,
  type Direction,
  type Entity,
  type FloatText,
  type GameState,
  type Monster,
} from '@/types/game';
import {
  createOverworldMap,
  DUNGEON_POS,
  isPassable,
  populateOverworld,
  TILE,
  TOWN_POS,
} from '@/utils/map';
import {
  createVaultFloor,
  DUNGEON_ENTRANCE,
  VAULT_TILE,
} from '@/utils/dungeon';
import {
  makeChest,
  spawnDungeonMonster,
  spawnOverworldMonster,
} from '@/utils/monsters';

const LOG_CAP = 30;
const SHAKE_MS = 140;

export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState);
  const map = useMemo(() => createOverworldMap(), []);
  const spawns = useMemo(() => populateOverworld(map), [map]);
  const floor = useMemo(() => createVaultFloor(state.dungeonLevel), [state.dungeonLevel]);
  const idCounter = useRef(0);

  // Initialize overworld entities once (monsters + chests from spawns; dungeon populated on entry)
  useEffect(() => {
    setState((s) => {
      if (s.entities.length > 0) return s;
      const entities: Entity[] = spawns.monsterTiles.map((pos) => {
        const m = spawnOverworldMonster();
        return { ...m, pos, dungeon: false, dungeonLevel: 0 };
      });
      return { ...s, entities, chests: spawns.chests, shrines: spawns.shrines };
    });
  }, [spawns]);

  const nextFloatId = () => ++idCounter.current;

  const addLog = useCallback((message: string) => {
    setState((s) => ({ ...s, log: [...s.log, message].slice(-LOG_CAP) }));
  }, []);

  const pushLog = (log: string[], msg: string) => {
    log.push(msg);
    if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
  };

  const addFloat = (s: GameState, x: number, y: number, text: string, color: FloatText['color']) => {
    return { ...s, floats: [...s.floats, { id: nextFloatId(), x, y, text, color, born: performance.now() }].slice(-12) };
  };

  const addSlash = (s: GameState, dir: Direction) => {
    return { ...s, slashes: [...s.slashes, { id: nextFloatId(), born: performance.now(), dir }].slice(-4) };
  };

  const screenShake = (s: GameState) => ({ ...s, shakeUntil: performance.now() + SHAKE_MS });

  const levelUp = (s: GameState, log: string[]): GameState => {
    const expTotal = s.player.exp;
    const newLevel = Math.floor(expTotal / 40) + 1;
    if (newLevel > s.player.level) {
      pushLog(log, `Level up! You are now level ${newLevel}. (+8 Max HP)`);
      return {
        ...s,
        player: {
          ...s.player,
          level: newLevel,
          maxHp: s.player.maxHp + 8,
          hp: Math.min(s.player.maxHp + 8, s.player.hp + 8),
        },
      };
    }
    return s;
  };

  // Player strikes an entity; returns updated state (no retaliation)
  const playerStrike = (s: GameState, entity: Entity, log: string[]): { state: GameState; killed: boolean } => {
    const dmg = Math.max(1, s.player.attack + Math.floor(Math.random() * 3) - 1);
    let next = addSlash(s, s.mode === 'DUNGEON' ? s.dungeonDir : 0);
    next = screenShake(next);

    const remainingHp = entity.hp - dmg;
    if (remainingHp <= 0) {
      pushLog(log, `${entity.name} is slain! +${entity.goldReward} gold, +${entity.expReward} exp.`);
      let withLoot = addFloat(next, entity.pos.x, entity.pos.y, `+${entity.goldReward}g`, 'gold');
      withLoot = {
        ...withLoot,
        player: {
          ...withLoot.player,
          gold: withLoot.player.gold + entity.goldReward,
          exp: withLoot.player.exp + entity.expReward,
        },
        entities: withLoot.entities.filter((e) => e.id !== entity.id),
      };
      return { state: levelUp(withLoot, log), killed: true };
    }

    pushLog(log, `You strike the ${entity.name} for ${dmg} damage.`);
    return {
      state: addFloat({ ...next, entities: next.entities.map((e) => (e.id === entity.id ? { ...e, hp: remainingHp } : e)) }, entity.pos.x, entity.pos.y, `-${dmg}`, 'red'),
      killed: false,
    };
  };

  // Enemy counterattack
  const enemyRetaliate = (s: GameState, entity: Entity, log: string[]): GameState => {
    const dmg = Math.max(1, entity.attack - s.player.defense - Math.floor(Math.random() * 2));
    const hp = Math.max(0, s.player.hp - dmg);
    pushLog(log, `The ${entity.name} hits you for ${dmg}.`);
    const floated = addFloat({ ...s, player: { ...s.player, hp } }, s.worldPos.x, s.worldPos.y, `-${dmg}`, 'red');
    if (hp <= 0) {
      pushLog(log, DEATH_MESSAGE);
      return { ...floated, mode: 'GAME_OVER', shakeUntil: performance.now() + SHAKE_MS };
    }
    return floated;
  };

  // --- Overworld movement + bump combat ---

  const move = useCallback(
    (dx: number, dy: number) => {
      setState((s) => {
        if (s.mode !== 'OVERWORLD') return s;

        const nx = s.worldPos.x + dx;
        const ny = s.worldPos.y + dy;
        if (nx < 0 || ny < 0 || nx >= map[0].length || ny >= map.length) return s;

        const log = [...s.log];

        // Bump attack on visible foe
        const foe = s.entities.find((e) => !e.dungeon && e.pos.x === nx && e.pos.y === ny);
        if (foe) {
          const strike = playerStrike(s, foe, log);
          if (strike.killed) return strike.state;
          return enemyRetaliate(strike.state, { ...foe, hp: foe.hp }, log);
        }

        const tile = map[ny][nx];
        if (!isPassable(tile)) {
          pushLog(log, 'Impassable terrain.');
          return { ...s, log };
        }

        let next: GameState = { ...s, worldPos: { x: nx, y: ny }, log };

        // Auto-heal landmarks
        if (tile === TILE.CAMPFIRE || tile === TILE.SPRING) {
          if (next.player.hp < next.player.maxHp) {
            const heal = Math.min(15, next.player.maxHp - next.player.hp);
            next = {
              ...next,
              player: { ...next.player, hp: next.player.hp + heal },
              log: [...next.log, tile === TILE.CAMPFIRE ? 'The campfire restores you.' : 'The spring restores you.'].slice(-LOG_CAP),
            };
            next = addFloat(next, nx, ny, `+${heal}`, 'green');
          }
        }

        // Town: full rest
        if (tile === TILE.TOWN && next.player.hp < next.player.maxHp) {
          next = {
            ...next,
            player: { ...next.player, hp: next.player.maxHp },
            log: [...next.log, 'You rest at Oakhaven Keep. Fully healed.'].slice(-LOG_CAP),
          };
          next = addFloat(next, nx, ny, '+FULL', 'green');
        }

        // Shrine: action pressed separately; hint on step
        const shrine = next.shrines.find((sh) => sh.pos.x === nx && sh.pos.y === ny);
        if (shrine && !shrine.used) {
          pushLog(next.log, 'An ancient shrine hums with power. (Press Action)');
        }

        return next;
      });
    },
    [map, spawns] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const useShrine = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'OVERWORLD') return s;
      const shrine = s.shrines.find(
        (sh) => sh.pos.x === s.worldPos.x && sh.pos.y === s.worldPos.y && !sh.used
      );
      if (!shrine) return s;
      const log = [...s.log];
      let next = { ...s, shrines: s.shrines.map((sh) => (sh === shrine ? { ...sh, used: true } : sh)) };
      if (shrine.boon === 'MAX_HP') {
        next = { ...next, player: { ...next.player, maxHp: next.player.maxHp + 10, hp: next.player.hp + 10 } };
        pushLog(log, 'The shrine blesses you: +10 Max HP!');
      } else {
        next = { ...next, player: { ...next.player, attack: next.player.attack + 3 } };
        pushLog(log, 'The shrine blesses you: +3 Attack!');
      }
      return addFloat(next, shrine.pos.x, shrine.pos.y, 'BOON!', 'white');
    });
  }, []);

  // --- Dungeon movement + bump combat ---

  const moveDungeon = useCallback(
    (steps: number) => {
      setState((s) => {
        if (s.mode !== 'DUNGEON') return s;

        const dx = [0, 1, 0, -1][s.dungeonDir];
        const dy = [-1, 0, 1, 0][s.dungeonDir];
        const nx = s.dungeonPos.x + dx * steps;
        const ny = s.dungeonPos.y + dy * steps;

        const log = [...s.log];

        // Bump attack on dungeon foe
        const foe = s.entities.find((e) => e.dungeon && e.dungeonLevel === s.dungeonLevel && e.pos.x === nx && e.pos.y === ny);
        if (foe) {
          const strike = playerStrike(s, foe, log);
          if (strike.killed) return strike.state;
          return enemyRetaliate(strike.state, foe, log);
        }

        const inBounds = nx >= 0 && ny >= 0 && nx < floor.length && ny < floor[0].length;
        const target = inBounds ? floor[ny][nx] : VAULT_TILE.WALL;
        if (target === VAULT_TILE.WALL) {
          pushLog(log, 'Solid stone blocks your path.');
          return { ...s, log };
        }

        return { ...s, dungeonPos: { x: nx, y: ny }, log };
      });
    },
    [floor]
  );

  const rotateDungeon = useCallback((turn: 1 | -1) => {
    setState((s) => {
      if (s.mode !== 'DUNGEON') return s;
      return { ...s, dungeonDir: (((s.dungeonDir + turn) % 4 + 4) % 4) as Direction };
    });
  }, []);

  const populateDungeon = (s: GameState, level: number): GameState => {
    const entities = s.entities.filter((e) => !(e.dungeon && e.dungeonLevel === level));
    const chests = s.chests.filter((c) => !(c.dungeon && c.dungeonLevel === level));
    const kept = [...entities];
    const keptChests = [...chests];
    const freeTile = () => {
      for (let tries = 0; tries < 100; tries++) {
        const x = 1 + Math.floor(Math.random() * 8);
        const y = 1 + Math.floor(Math.random() * 8);
        if (floor[y][x] !== VAULT_TILE.OPEN) continue;
        if (x === DUNGEON_ENTRANCE.x && y === DUNGEON_ENTRANCE.y) continue;
        if (kept.some((e) => e.pos.x === x && e.pos.y === y)) continue;
        if (keptChests.some((c) => c.pos.x === x && c.pos.y === y)) continue;
        return { x, y };
      }
      return null;
    };

    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const p = freeTile();
      if (p) {
        const m = spawnDungeonMonster(level);
        kept.push({ ...m, pos: p, dungeon: true, dungeonLevel: level });
      }
    }
    const chestCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < chestCount; i++) {
      const p = freeTile();
      if (p) keptChests.push(makeChest(p, level));
    }

    return { ...s, entities: kept, chests: keptChests };
  };

  const enterDungeon = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'OVERWORLD') return s;
      if (map[s.worldPos.y][s.worldPos.x] !== TILE.DUNGEON) return s;
      const entered: GameState = {
        ...s,
        mode: 'DUNGEON',
        dungeonPos: { x: DUNGEON_ENTRANCE.x, y: DUNGEON_ENTRANCE.y },
        dungeonDir: 1,
        dungeonLevel: 1,
        log: [...s.log, 'You descend the slick stone stairs into The Abyssal Vaults (Level 1).'].slice(-LOG_CAP),
      };
      return populateDungeon(entered, 1);
    });
  }, [map, floor]);

  const useLadder = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'DUNGEON') return s;
      if (s.dungeonPos.x === DUNGEON_ENTRANCE.x && s.dungeonPos.y === DUNGEON_ENTRANCE.y) {
        return {
          ...s,
          mode: 'OVERWORLD',
          worldPos: { x: DUNGEON_POS.x, y: DUNGEON_POS.y },
          log: [...s.log, 'You climb back into the daylight of Aethelgard.'].slice(-LOG_CAP),
        };
      }
      const tile = floor[s.dungeonPos.y][s.dungeonPos.x];
      if (tile === VAULT_TILE.LADDER_DOWN) {
        const nextLevel = s.dungeonLevel + 1;
        const descended: GameState = {
          ...s,
          dungeonLevel: nextLevel,
          dungeonPos: { x: DUNGEON_ENTRANCE.x, y: DUNGEON_ENTRANCE.y },
          dungeonDir: 1,
          log: [...s.log, `You descend to The Abyssal Vaults, Level ${nextLevel}.`].slice(-LOG_CAP),
        };
        return populateDungeon(descended, nextLevel);
      }
      return s;
    });
  }, [floor]);

  // --- Chests (bump to open) ---

  const openChestAt = useCallback((pos: { x: number; y: number }) => {
    setState((s) => {
      const chest = s.chests.find(
        (c) => !c.opened && c.pos.x === pos.x && c.pos.y === pos.y
      );
      if (!chest) return s;
      const log = [...s.log];
      let next = { ...s, chests: s.chests.map((c) => (c.id === chest.id ? { ...c, opened: true } : c)) };

      if (chest.gold > 0) {
        next = { ...next, player: { ...next.player, gold: next.player.gold + chest.gold } };
        pushLog(log, `You pry open the chest: +${chest.gold} gold!`);
        next = addFloat(next, chest.pos.x, chest.pos.y, `+${chest.gold}g`, 'gold');
      } else if (chest.weapon) {
        if (chest.weapon.attack > next.player.attack) {
          next = { ...next, player: { ...next.player, attack: chest.weapon.attack, weapon: chest.weapon.name } };
          pushLog(log, `You equip the ${chest.weapon.name}! (+${chest.weapon.attack} Attack)`);
          next = addFloat(next, chest.pos.x, chest.pos.y, chest.weapon.name, 'white');
        } else {
          next = { ...next, player: { ...next.player, gold: next.player.gold + 10 } };
          pushLog(log, `The ${chest.weapon.name} is inferior. You sell it for 10 gold.`);
        }
      } else if (chest.armor) {
        if (chest.armor.defense > next.player.defense) {
          next = { ...next, player: { ...next.player, defense: chest.armor.defense, armor: chest.armor.name } };
          pushLog(log, `You don the ${chest.armor.name}! (+${chest.armor.defense} Defense)`);
          next = addFloat(next, chest.pos.x, chest.pos.y, chest.armor.name, 'white');
        } else {
          next = { ...next, player: { ...next.player, gold: next.player.gold + 10 } };
          pushLog(log, `The ${chest.armor.name} is inferior. You sell it for 10 gold.`);
        }
      }
      return screenShake(next);
    });
  }, []);

  const action = useCallback(() => {
    const s = state;
    if (s.mode === 'OVERWORLD') {
      if (map[s.worldPos.y][s.worldPos.x] === TILE.DUNGEON) {
        enterDungeon();
        return;
      }
      useShrine();
    } else if (s.mode === 'DUNGEON') {
      const tile = floor[s.dungeonPos.y]?.[s.dungeonPos.x];
      if (
        (s.dungeonPos.x === DUNGEON_ENTRANCE.x && s.dungeonPos.y === DUNGEON_ENTRANCE.y) ||
        tile === VAULT_TILE.LADDER_DOWN
      ) {
        useLadder();
        return;
      }
      openChestAt(s.dungeonPos);
    }
  }, [state, map, floor, enterDungeon, useShrine, useLadder, openChestAt]);

  // Chests on overworld: bump to open
  useEffect(() => {
    const overworldChest = state.chests.find(
      (c) => !c.opened && !c.dungeon && c.pos.x === state.worldPos.x && c.pos.y === state.worldPos.y
    );
    if (state.mode === 'OVERWORLD' && overworldChest) {
      openChestAt(state.worldPos);
    }
  }, [state.worldPos, state.chests, state.mode, openChestAt]);

  const restart = useCallback(() => {
    idCounter.current = 0;
    const fresh = createInitialState();
    setState(fresh);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.mode === 'GAME_OVER') {
        if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          restart();
        }
        return;
      }

      const key = e.key.toLowerCase();
      const navKeys = new Set([
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'w', 'a', 's', 'd', 'e', ' ', 'Enter',
      ]);
      if (navKeys.has(e.key)) e.preventDefault();
      if (e.repeat) return;

      if (state.mode === 'OVERWORLD') {
        switch (key) {
          case 'arrowup': case 'w': move(0, -1); break;
          case 'arrowdown': case 's': move(0, 1); break;
          case 'arrowleft': case 'a': move(-1, 0); break;
          case 'arrowright': case 'd': move(1, 0); break;
          case 'enter': case 'e': case ' ': action(); break;
        }
      } else if (state.mode === 'DUNGEON') {
        switch (key) {
          case 'arrowup': case 'w': moveDungeon(1); break;
          case 'arrowdown': case 's': moveDungeon(-1); break;
          case 'arrowleft': case 'a': rotateDungeon(-1); break;
          case 'arrowright': case 'd': rotateDungeon(1); break;
          case 'enter': case 'e': case ' ': action(); break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.mode, move, moveDungeon, rotateDungeon, action, restart]);

  // Prune expired floats + slashes
  useEffect(() => {
    if (state.floats.length === 0 && state.slashes.length === 0) return;
    const t = setInterval(() => {
      const now = performance.now();
      setState((s) => {
        const floats = s.floats.filter((f) => now - f.born < 900);
        const slashes = s.slashes.filter((f) => now - f.born < 220);
        if (floats.length === s.floats.length && slashes.length === s.slashes.length) return s;
        return { ...s, floats, slashes };
      });
    }, 120);
    return () => clearInterval(t);
  }, [state.floats.length, state.slashes.length]);

  return {
    state,
    addLog,
    move,
    moveDungeon,
    rotateDungeon,
    action,
    enterDungeon,
    useShrine,
    useLadder,
    openChestAt,
    restart,
    onTownTile: state.mode === 'OVERWORLD' && state.worldPos.x === TOWN_POS.x && state.worldPos.y === TOWN_POS.y,
  };
}

// Monster union used for typing strike results
export type { Monster };
