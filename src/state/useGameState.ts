import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createInitialState,
  DEATH_MESSAGE,
  type GameState,
  type TownSubMenu,
} from '@/types/game';
import { createOverworldMap, DUNGEON_POS, isPassable, TILE } from '@/utils/map';
import {
  createVaultFloor,
  DUNGEON_ENTRANCE,
  isVaultPassable,
  VAULT_TILE,
} from '@/utils/dungeon';

const LOG_CAP = 50;

const RUMORS = [
  'They say a foul creature dwells on level 3 of the Abyssal Vaults...',
  "An old wanderer swears the Amulet of Dawn glimmers brightest at the deepest depth of the Abyssal Vaults.",
  'Rumor has it the blacksmith Vance once cleaved a hill giant in twain with a single stroke.',
  "A bard claims the temple's altar restores even the gravest wounds - if thy coin holds out.",
  'They say the marshes east of Oakhaven Keep hide buried treasure beneath the reeds.',
  'A miner whispers that the western ridge holds veins of silver, guarded by harsh terrain.',
];

export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState);
  const map = useMemo(() => createOverworldMap(), []);
  const floor = useMemo(() => createVaultFloor(state.dungeonLevel), [state.dungeonLevel]);

  const addLog = useCallback((message: string) => {
    setState((s) => ({
      ...s,
      log: [...s.log, message].slice(-LOG_CAP),
    }));
  }, []);

  const move = useCallback(
    (dx: number, dy: number) => {
      setState((s) => {
        if (s.mode !== 'OVERWORLD') return s;

        const nx = s.worldPos.x + dx;
        const ny = s.worldPos.y + dy;
        if (nx < 0 || ny < 0 || nx >= map[0].length || ny >= map.length) return s;

        const tile = map[ny][nx];
        const log = [...s.log];
        const push = (msg: string) => {
          log.push(msg);
          if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
        };

        if (!isPassable(tile)) {
          push('Impassable terrain.');
          return { ...s, log };
        }

        const player = { ...s.player };
        if (player.food > 0) {
          player.food -= 1;
        } else {
          player.hp = Math.max(0, player.hp - 2);
          if (player.hp <= 0) {
            push(DEATH_MESSAGE);
            return {
              ...s,
              player,
              worldPos: { x: nx, y: ny },
              mode: 'GAME_OVER',
              log,
            };
          }
        }

        const worldPos = { x: nx, y: ny };
        if (tile === TILE.DUNGEON) {
          push('The descent to The Abyssal Vaults lies here. (Press Enter to enter)');
        } else if (tile === TILE.TOWN) {
          push('The gates of Oakhaven Keep stand before you. (Press Enter to enter)');
        }

        return { ...s, player, worldPos, log };
      });
    },
    [map]
  );

  const enterSite = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'OVERWORLD') return s;
      const tile = map[s.worldPos.y][s.worldPos.x];
      if (tile === TILE.TOWN) {
        return {
          ...s,
          mode: 'TOWN',
          townSubMenu: 'MAIN',
          log: [...s.log, 'You pass the gates of Oakhaven Keep.'].slice(-LOG_CAP),
        };
      }
      if (tile === TILE.DUNGEON) {
        return {
          ...s,
          mode: 'DUNGEON',
          dungeonPos: { x: DUNGEON_ENTRANCE.x, y: DUNGEON_ENTRANCE.y },
          dungeonDir: 1,
          dungeonLevel: 1,
          log: [
            ...s.log,
            'You descend into The Abyssal Vaults, Level 1. Damp air chills your skin.',
          ].slice(-LOG_CAP),
        };
      }
      return s;
    });
  }, [map]);

  const moveDungeon = useCallback(
    (steps: number) => {
      setState((s) => {
        if (s.mode !== 'DUNGEON') return s;

        const dx = [0, 1, 0, -1][s.dungeonDir];
        const dy = [-1, 0, 1, 0][s.dungeonDir];
        const nx = s.dungeonPos.x + dx * steps;
        const ny = s.dungeonPos.y + dy * steps;

        const target =
          nx < 0 || ny < 0 || nx >= floor.length || ny >= floor[0].length
            ? VAULT_TILE.WALL
            : floor[ny][nx];

        const log = [...s.log];
        const push = (msg: string) => {
          log.push(msg);
          if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
        };

        if (!isVaultPassable(target)) {
          push('Solid stone blocks your path.');
          return { ...s, log };
        }

        const player = { ...s.player };
        if (player.food > 0) {
          player.food -= 1;
        } else {
          player.hp = Math.max(0, player.hp - 2);
          if (player.hp <= 0) {
            push(DEATH_MESSAGE);
            return {
              ...s,
              player,
              dungeonPos: { x: nx, y: ny },
              mode: 'GAME_OVER',
              log,
            };
          }
        }

        return { ...s, player, dungeonPos: { x: nx, y: ny }, log };
      });
    },
    [floor]
  );

  const rotateDungeon = useCallback((turn: 1 | -1) => {
    setState((s) => {
      if (s.mode !== 'DUNGEON') return s;
      return { ...s, dungeonDir: (((s.dungeonDir + turn) % 4 + 4) % 4) as GameState['dungeonDir'] };
    });
  }, []);

  const useLadder = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'DUNGEON') return s;
      const tile = floor[s.dungeonPos.y][s.dungeonPos.x];
      if (tile === VAULT_TILE.LADDER_UP) {
        return {
          ...s,
          mode: 'OVERWORLD',
          worldPos: { x: DUNGEON_POS.x, y: DUNGEON_POS.y },
          log: [...s.log, 'You climb back into the daylight of Aethelgard.'].slice(-LOG_CAP),
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

  const restart = useCallback(() => {
    setState(createInitialState());
  }, []);

  // --- Town hub actions ---

  const setTownSubMenu = useCallback((sub: TownSubMenu) => {
    setState((s) => {
      if (s.mode !== 'TOWN') return s;
      return { ...s, townSubMenu: sub };
    });
  }, []);

  const leaveTown = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'TOWN') return s;
      return {
        ...s,
        mode: 'OVERWORLD',
        townSubMenu: 'MAIN',
        log: [
          ...s.log,
          'You pass through the iron portcullis back into the wilds of Aethelgard.',
        ].slice(-LOG_CAP),
      };
    });
  }, []);

  const buyRations = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'TOWN') return s;
      const { player } = s;
      const log = [...s.log];
      const push = (msg: string) => log.push(msg) && (log.length > LOG_CAP ? log.splice(0, log.length - LOG_CAP) : undefined);
      if (player.gold < 10) {
        push('You lack the coin for that.');
        return { ...s, log };
      }
      push('You buy 25 rations from the tavern keeper.');
      return {
        ...s,
        player: { ...player, gold: player.gold - 10, food: player.food + 25 },
        log,
      };
    });
  }, []);

  const restAtTavern = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'TOWN') return s;
      const { player } = s;
      const log = [...s.log];
      const push = (msg: string) => {
        log.push(msg);
        if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
      };
      if (player.gold < 15) {
        push('You lack the coin for that.');
        return { ...s, log };
      }
      if (player.hp >= player.maxHp) {
        push('You are already well rested.');
        return { ...s, log };
      }
      push('You sleep soundly at The Rusty Flagon. (+30 HP)');
      return {
        ...s,
        player: {
          ...player,
          gold: player.gold - 15,
          hp: Math.min(player.maxHp, player.hp + 30),
        },
        log,
      };
    });
  }, []);

  const hearRumor = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'TOWN') return s;
      const rumor = RUMORS[Math.floor(Math.random() * RUMORS.length)];
      return {
        ...s,
        log: [...s.log, rumor].slice(-LOG_CAP),
      };
    });
  }, []);

  const buyBroadsword = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'TOWN') return s;
      const { player } = s;
      const log = [...s.log];
      const push = (msg: string) => {
        log.push(msg);
        if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
      };
      if (player.hasBroadsword) {
        push('You already carry the Iron Broadsword.');
        return { ...s, log };
      }
      if (player.gold < 40) {
        push('You lack the coin for that.');
        return { ...s, log };
      }
      push('Purchased and equipped Iron Broadsword!');
      return {
        ...s,
        player: {
          ...player,
          gold: player.gold - 40,
          attack: player.attack + 4,
          hasBroadsword: true,
        },
        log,
      };
    });
  }, []);

  const buyChainmail = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'TOWN') return s;
      const { player } = s;
      const log = [...s.log];
      const push = (msg: string) => {
        log.push(msg);
        if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
      };
      if (player.hasChainmail) {
        push('You already wear the Chainmail Hauberk.');
        return { ...s, log };
      }
      if (player.gold < 60) {
        push('You lack the coin for that.');
        return { ...s, log };
      }
      push('Purchased and equipped Chainmail Hauberk!');
      return {
        ...s,
        player: {
          ...player,
          gold: player.gold - 60,
          defense: player.defense + 3,
          hasChainmail: true,
        },
        log,
      };
    });
  }, []);

  const templeHeal = useCallback(() => {
    setState((s) => {
      if (s.mode !== 'TOWN') return s;
      const { player } = s;
      const log = [...s.log];
      const push = (msg: string) => {
        log.push(msg);
        if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
      };
      if (player.gold < 20) {
        push('You lack the coin for that.');
        return { ...s, log };
      }
      if (player.hp >= player.maxHp) {
        push('The priests find no wounds to mend.');
        return { ...s, log };
      }
      push('The Temple of the Sun restores you fully. (HP restored)');
      return {
        ...s,
        player: { ...player, gold: player.gold - 20, hp: player.maxHp },
        log,
      };
    });
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
        'w', 'a', 's', 'd', 'u', 'enter', ' ', 'escape', 'e',
      ]);
      if (navKeys.has(e.key.toLowerCase()) || navKeys.has(e.key)) e.preventDefault();
      if (e.repeat) return;

      if (state.mode === 'OVERWORLD') {
        switch (key) {
          case 'arrowup': case 'w': move(0, -1); break;
          case 'arrowdown': case 's': move(0, 1); break;
          case 'arrowleft': case 'a': move(-1, 0); break;
          case 'arrowright': case 'd': move(1, 0); break;
          case 'enter': enterSite(); break;
        }
      } else if (state.mode === 'DUNGEON') {
        switch (key) {
          case 'arrowup': case 'w': moveDungeon(1); break;
          case 'arrowdown': case 's': moveDungeon(-1); break;
          case 'arrowleft': case 'a': rotateDungeon(-1); break;
          case 'arrowright': case 'd': rotateDungeon(1); break;
          case 'u': case 'enter': useLadder(); break;
        }
      } else if (state.mode === 'TOWN') {
        switch (state.townSubMenu) {
          case 'MAIN':
            switch (key) {
              case '1': setTownSubMenu('TAVERN'); break;
              case '2': setTownSubMenu('ARMORY'); break;
              case '3': setTownSubMenu('TEMPLE'); break;
              case '4': setTownSubMenu('JUSTICIAR'); break;
              case 'enter': case 'escape': case 'e': leaveTown(); break;
            }
            break;
          case 'TAVERN':
            switch (key) {
              case 'r': buyRations(); break;
              case 's': restAtTavern(); break;
              case 'h': hearRumor(); break;
              case 'b': setTownSubMenu('MAIN'); break;
            }
            break;
          case 'ARMORY':
            switch (key) {
              case '1': buyBroadsword(); break;
              case '2': buyChainmail(); break;
              case 'b': setTownSubMenu('MAIN'); break;
            }
            break;
          case 'TEMPLE':
            switch (key) {
              case 'h': templeHeal(); break;
              case 'b': setTownSubMenu('MAIN'); break;
            }
            break;
          case 'JUSTICIAR':
            if (key === 'b') setTownSubMenu('MAIN');
            break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    state.mode,
    state.townSubMenu,
    move,
    enterSite,
    moveDungeon,
    rotateDungeon,
    useLadder,
    restart,
    setTownSubMenu,
    leaveTown,
    buyRations,
    restAtTavern,
    hearRumor,
    buyBroadsword,
    buyChainmail,
    templeHeal,
  ]);

  return {
    state,
    addLog,
    move,
    enterSite,
    moveDungeon,
    rotateDungeon,
    useLadder,
    restart,
    setTownSubMenu,
    leaveTown,
    buyRations,
    restAtTavern,
    hearRumor,
    buyBroadsword,
    buyChainmail,
    templeHeal,
  };
}
