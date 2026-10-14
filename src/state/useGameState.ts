import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createInitialState,
  DEATH_MESSAGE,
  type GameState,
  type Monster,
} from '@/types/game';
import { createOverworldMap, DUNGEON_POS, isPassable, TILE, TOWN_POS } from '@/utils/map';
import {
  createVaultFloor,
  DUNGEON_ENTRANCE,
  isVaultPassable,
  VAULT_TILE,
} from '@/utils/dungeon';
import {
  ENCOUNTER_CHANCE,
  spawnMonster,
} from '@/utils/monsters';

const LOG_CAP = 50;

export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState);
  const map = useMemo(() => createOverworldMap(), []);
  const floor = useMemo(() => createVaultFloor(state.dungeonLevel), [state.dungeonLevel]);

  const onTownTile = state.mode === 'OVERWORLD'
    && state.worldPos.x === TOWN_POS.x
    && state.worldPos.y === TOWN_POS.y;

  const pushLog = (log: string[], msg: string) => {
    log.push(msg);
    if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
  };

  const addLog = useCallback((message: string) => {
    setState((s) => {
      const log = [...s.log];
      pushLog(log, message);
      return { ...s, log };
    });
  }, []);

  // --- Starvation shared per-step cost ---
  const applyStepCost = (s: GameState, log: string[]): GameState => {
    const player = { ...s.player };
    if (player.food > 0) {
      player.food -= 1;
      return { ...s, player, log };
    }
    player.hp = Math.max(0, player.hp - 2);
    if (player.hp <= 0) {
      pushLog(log, DEATH_MESSAGE);
      return { ...s, player, mode: 'GAME_OVER', log };
    }
    return { ...s, player, log };
  };

  const move = useCallback(
    (dx: number, dy: number) => {
      setState((s): GameState => {
        if (s.mode !== 'OVERWORLD') return s;

        const nx = s.worldPos.x + dx;
        const ny = s.worldPos.y + dy;
        if (nx < 0 || ny < 0 || nx >= map[0].length || ny >= map.length) return s;

        const tile = map[ny][nx];
        const log = [...s.log];

        if (!isPassable(tile)) {
          pushLog(log, 'Impassable terrain.');
          return { ...s, log };
        }

        const stepped = applyStepCost(s, log);
        const worldPos = { x: nx, y: ny };
        if (stepped.mode === 'GAME_OVER') {
          return { ...stepped, worldPos };
        }

        if (tile === TILE.DUNGEON) {
          pushLog(log, 'The descent to The Abyssal Vaults lies here. (Press Enter to enter)');
        } else if (tile === TILE.TOWN) {
          pushLog(log, 'You arrive at Oakhaven Keep. Services available below.');
        }

        return { ...stepped, worldPos, log };
      });
    },
    [map]
  );

  const enterDungeon = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'OVERWORLD') return s;
      const tile = map[s.worldPos.y][s.worldPos.x];
      if (tile !== TILE.DUNGEON) return s;
      return {
        ...s,
        mode: 'DUNGEON',
        dungeonPos: { x: DUNGEON_ENTRANCE.x, y: DUNGEON_ENTRANCE.y },
        dungeonDir: 1,
        dungeonLevel: 1,
        inCombat: false,
        combat: null,
        log: [
          ...s.log,
          'You descend the slick stone stairs into The Abyssal Vaults (Level 1).',
        ].slice(-LOG_CAP),
      };
    });
  }, [map]);

  const moveDungeon = useCallback(
    (steps: number) => {
      setState((s): GameState => {
        if (s.mode !== 'DUNGEON' || s.inCombat) return s;

        const dx = [0, 1, 0, -1][s.dungeonDir];
        const dy = [-1, 0, 1, 0][s.dungeonDir];
        const nx = s.dungeonPos.x + dx * steps;
        const ny = s.dungeonPos.y + dy * steps;

        const target =
          nx < 0 || ny < 0 || nx >= floor.length || ny >= floor[0].length
            ? VAULT_TILE.WALL
            : floor[ny][nx];

        const log = [...s.log];

        if (!isVaultPassable(target)) {
          pushLog(log, 'Solid stone blocks your path.');
          return { ...s, log };
        }

        const stepped = applyStepCost(s, log);
        const moved: GameState = { ...stepped, dungeonPos: { x: nx, y: ny }, log };
        if (stepped.mode === 'GAME_OVER') {
          return moved;
        }

        // Forward steps only: chance of wandering encounter
        if (steps > 0 && Math.random() < ENCOUNTER_CHANCE) {
          const monster = spawnMonster(s.dungeonLevel);
          pushLog(log, `A ${monster.name} lunges from the shadows!`);
          return { ...moved, mode: 'COMBAT', inCombat: true, combat: { monster, playerParrying: false, fled: false } };
        }

        return moved;
      });
    },
    [floor]
  );

  const rotateDungeon = useCallback((turn: 1 | -1) => {
    setState((s) => {
      if (s.mode !== 'DUNGEON' || s.inCombat) return s;
      return { ...s, dungeonDir: (((s.dungeonDir + turn) % 4 + 4) % 4) as GameState['dungeonDir'] };
    });
  }, []);

  const useLadder = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'DUNGEON' || s.inCombat) return s;
      const tile = floor[s.dungeonPos.y][s.dungeonPos.x];
      if (s.dungeonPos.x === DUNGEON_ENTRANCE.x && s.dungeonPos.y === DUNGEON_ENTRANCE.y) {
        return {
          ...s,
          mode: 'OVERWORLD',
          worldPos: { x: DUNGEON_POS.x, y: DUNGEON_POS.y },
          log: [...s.log, 'You climb the ladder back into the daylight of Aethelgard.'].slice(-LOG_CAP),
        };
      }
      if (tile === VAULT_TILE.LADDER_DOWN) {
        return {
          ...s,
          dungeonLevel: s.dungeonLevel + 1,
          dungeonPos: { x: DUNGEON_ENTRANCE.x, y: DUNGEON_ENTRANCE.y },
          dungeonDir: 1,
          log: [
            ...s.log,
            `You descend to The Abyssal Vaults, Level ${s.dungeonLevel + 1}.`,
          ].slice(-LOG_CAP),
        };
      }
      return s;
    });
  }, [floor]);

  // --- Town instant services (no menu lock, movement stays free) ---

  const townRest = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'OVERWORLD' || !(s.worldPos.x === TOWN_POS.x && s.worldPos.y === TOWN_POS.y)) return s;
      const { player } = s;
      const log = [...s.log];
      if (player.gold < 20) {
        pushLog(log, 'You lack the coin for that.');
        return { ...s, log };
      }
      if (player.hp >= player.maxHp) {
        pushLog(log, 'You are already at full health.');
        return { ...s, log };
      }
      pushLog(log, 'The keep\'s healers mend thy wounds. (HP restored)');
      return { ...s, player: { ...player, gold: player.gold - 20, hp: player.maxHp }, log };
    });
  }, []);

  const townBuyRations = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'OVERWORLD' || !(s.worldPos.x === TOWN_POS.x && s.worldPos.y === TOWN_POS.y)) return s;
      const { player } = s;
      const log = [...s.log];
      if (player.gold < 15) {
        pushLog(log, 'You lack the coin for that.');
        return { ...s, log };
      }
      pushLog(log, 'You stock up on 50 rations from the market stalls.');
      return { ...s, player: { ...player, gold: player.gold - 15, food: player.food + 50 }, log };
    });
  }, []);

  const townUpgradeSword = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'OVERWORLD' || !(s.worldPos.x === TOWN_POS.x && s.worldPos.y === TOWN_POS.y)) return s;
      const { player } = s;
      const log = [...s.log];
      if (player.gold < 40) {
        pushLog(log, 'You lack the coin for that.');
        return { ...s, log };
      }
      pushLog(log, 'Vance\'s smith hones thy blade. (+5 Attack)');
      return { ...s, player: { ...player, gold: player.gold - 40, attack: player.attack + 5 }, log };
    });
  }, []);

  // --- Combat actions ---

  const combatAttack = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'COMBAT' || !s.combat) return s;
      const log = [...s.log];
      const combat = { ...s.combat };
      const monster: Monster = { ...combat.monster };

      const playerDmg = Math.max(1, s.player.attack + Math.floor(Math.random() * 5) - 1);
      monster.hp = Math.max(0, monster.hp - playerDmg);
      pushLog(log, `You strike the ${monster.name} for ${playerDmg} damage. (${monster.hp}/${monster.maxHp} HP)`);

      if (monster.hp <= 0) {
        pushLog(log, `The ${monster.name} falls! You gain ${monster.goldReward} gold and ${monster.expReward} exp.`);
        const expTotal = s.player.exp + monster.expReward;
        const newLevel = Math.max(s.player.level, Math.floor(expTotal / 50) + 1);
        const leveled = newLevel > s.player.level;
        if (leveled) {
          pushLog(log, `Thou hast reached level ${newLevel}! Max HP increases.`);
        }
        return {
          ...s,
          mode: 'DUNGEON',
          inCombat: false,
          combat: null,
          player: {
            ...s.player,
            gold: s.player.gold + monster.goldReward,
            exp: expTotal,
            level: newLevel,
            maxHp: leveled ? s.player.maxHp + 10 : s.player.maxHp,
            hp: leveled ? Math.min(s.player.maxHp + 10, s.player.hp + 10) : s.player.hp,
          },
          log,
        };
      }

      // Monster turn
      const parryReduce = combat.playerParrying ? Math.floor(s.player.defense * 1.5) : 0;
      const monsterDmg = Math.max(1, monster.attack - s.player.defense - parryReduce - Math.floor(Math.random() * 3));
      const hp = Math.max(0, s.player.hp - monsterDmg);
      pushLog(log, combat.playerParrying
        ? `You parry and deflect some damage! The ${monster.name} hits you for ${monsterDmg}. (${hp}/${s.player.maxHp} HP)`
        : `The ${monster.name} hits you for ${monsterDmg} damage. (${hp}/${s.player.maxHp} HP)`);

      if (hp <= 0) {
        pushLog(log, 'You have been slain in the depths. Game Over.');
        return { ...s, combat, player: { ...s.player, hp: 0 }, mode: 'GAME_OVER', inCombat: false, log };
      }

      return { ...s, combat: { ...combat, monster, playerParrying: false }, player: { ...s.player, hp }, log };
    });
  }, []);

  const combatParry = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'COMBAT' || !s.combat) return s;
      const log = [...s.log];
      const combat = { ...s.combat, playerParrying: true };
      pushLog(log, 'You raise thy shield in a defensive stance.');

      const monsterDmg = Math.max(1, combat.monster.attack - s.player.defense * 2 - Math.floor(Math.random() * 3));
      const hp = Math.max(0, s.player.hp - monsterDmg);
      pushLog(log, `The ${combat.monster.name} hits you for ${monsterDmg} damage (reduced). (${hp}/${s.player.maxHp} HP)`);

      if (hp <= 0) {
        pushLog(log, 'You have been slain in the depths. Game Over.');
        return { ...s, combat, player: { ...s.player, hp: 0 }, mode: 'GAME_OVER', inCombat: false, log };
      }

      return { ...s, combat, player: { ...s.player, hp }, log };
    });
  }, []);

  const combatFlee = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'COMBAT' || !s.combat) return s;
      const log = [...s.log];

      if (Math.random() < 0.5) {
        pushLog(log, 'You flee back one step to safety!');
        const dx = [0, 1, 0, -1][s.dungeonDir];
        const dy = [-1, 0, 1, 0][s.dungeonDir];
        const nx = Math.max(0, Math.min(floor.length - 1, s.dungeonPos.x - dx));
        const ny = Math.max(0, Math.min(floor[0].length - 1, s.dungeonPos.y - dy));
        return { ...s, mode: 'DUNGEON', inCombat: false, combat: null, dungeonPos: { x: nx, y: ny }, log };
      }

      pushLog(log, 'You fail to escape!');

      const monsterDmg = Math.max(1, s.combat.monster.attack - s.player.defense - Math.floor(Math.random() * 3));
      const hp = Math.max(0, s.player.hp - monsterDmg);
      pushLog(log, `The ${s.combat.monster.name} hits you for ${monsterDmg} damage. (${hp}/${s.player.maxHp} HP)`);

      if (hp <= 0) {
        pushLog(log, 'You have been slain in the depths. Game Over.');
        return { ...s, player: { ...s.player, hp: 0 }, mode: 'GAME_OVER', inCombat: false, log };
      }

      return { ...s, player: { ...s.player, hp }, log };
    });
  }, [floor]);

  const restart = useCallback(() => {
    setState(createInitialState());
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
        'w', 'a', 's', 'd', 'u', 'enter', ' ',
      ]);
      if (navKeys.has(e.key)) e.preventDefault();
      if (e.repeat) return;

      if (state.mode === 'COMBAT') {
        switch (key) {
          case 'a': combatAttack(); break;
          case 'p': combatParry(); break;
          case 'f': combatFlee(); break;
        }
        return;
      }

      if (state.mode === 'OVERWORLD') {
        switch (key) {
          case 'arrowup': case 'w': move(0, -1); break;
          case 'arrowdown': case 's': move(0, 1); break;
          case 'arrowleft': case 'a': move(-1, 0); break;
          case 'arrowright': case 'd': move(1, 0); break;
          case 'enter': enterDungeon(); break;
          case 'h': townRest(); break;
          case 'r': townBuyRations(); break;
          case 'u': townUpgradeSword(); break;
        }
      } else if (state.mode === 'DUNGEON') {
        switch (key) {
          case 'arrowup': case 'w': moveDungeon(1); break;
          case 'arrowdown': case 's': moveDungeon(-1); break;
          case 'arrowleft': case 'a': rotateDungeon(-1); break;
          case 'arrowright': case 'd': rotateDungeon(1); break;
          case 'enter': useLadder(); break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    state.mode,
    move,
    enterDungeon,
    moveDungeon,
    rotateDungeon,
    useLadder,
    restart,
    combatAttack,
    combatParry,
    combatFlee,
    townRest,
    townBuyRations,
    townUpgradeSword,
  ]);

  return {
    state,
    addLog,
    move,
    enterDungeon,
    moveDungeon,
    rotateDungeon,
    useLadder,
    restart,
    townRest,
    townBuyRations,
    townUpgradeSword,
    combatAttack,
    combatParry,
    combatFlee,
    onTownTile,
  };
}
