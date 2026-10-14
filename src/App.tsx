import { useEffect, useRef } from 'react';
import GameCanvas from '@/components/GameCanvas';
import { useGameState } from '@/state/useGameState';

function LogBox({ log, turn }: { log: string[]; turn: number }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const firstShown = Math.max(0, log.length - 12);
  const entries = log.map((msg, i) => ({ msg, turn: turn - (log.length - 1 - i) }));

  return (
    <div className="h-[320px] flex flex-col border-2 border-amber-700/60 bg-black/60 p-3">
      <div className="text-amber-500 text-[10px] tracking-[0.25em] border-b border-amber-800/50 pb-2 mb-2">
        :: SCROLL OF CHRONICLES ::
      </div>
      <div
        ref={boxRef}
        className="flex-1 overflow-y-auto text-emerald-400 text-[11px] leading-[1.7] pr-1 space-y-1"
      >
        {entries.slice(firstShown).map((e, i) => (
          <p key={`${e.turn}-${i}`}>
            <span className="text-amber-600/70 mr-2">[{String(e.turn).padStart(3, '0')}]</span>
            {e.msg}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const {
    state,
    restart,
    townRest,
    townBuyRations,
    townUpgradeSword,
    combatAttack,
    combatParry,
    combatFlee,
    onTownTile,
  } = useGameState();
  const { player, worldPos } = state;

  const stats = [
    { label: 'HP', value: `${player.hp}/${player.maxHp}`, color: 'text-red-400' },
    { label: 'FOOD', value: String(player.food), color: 'text-emerald-400' },
    { label: 'GOLD', value: String(player.gold), color: 'text-amber-400' },
    { label: 'ATK', value: String(player.attack), color: 'text-orange-400' },
    { label: 'DEF', value: String(player.defense), color: 'text-sky-400' },
    { label: 'LEVEL', value: String(player.level), color: 'text-cyan-400' },
    { label: 'EXP', value: String(player.exp), color: 'text-fuchsia-400' },
  ];

  const townActions = [
    { key: 'H', label: 'Rest & Heal (+Full HP)', cost: 20, onClick: townRest },
    { key: 'R', label: 'Buy Rations (+50 Food)', cost: 15, onClick: townBuyRations },
    { key: 'U', label: 'Upgrade Sword (+5 Atk)', cost: 40, onClick: townUpgradeSword },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono flex items-center justify-center p-4">
      {/* CRT vignette + flicker overlay */}
      <div className="pointer-events-none fixed inset-0 z-50" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
      <div className="scanlines pointer-events-none fixed inset-0 z-40" />

      <div className="w-full max-w-5xl relative z-10">
        {state.mode === 'GAME_OVER' && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/85">
            <div className="text-center border-4 border-red-900 bg-neutral-950 px-10 py-8 shadow-[0_0_40px_rgba(220,38,38,0.3)]">
              <h2 className="text-4xl font-bold tracking-[0.3em] text-red-500 crt-glow-red">GAME OVER</h2>
              <p className="mt-4 text-sm text-red-300/80">
                You perished in the wilds of Aethelgard.
              </p>
              <button
                onClick={restart}
                className="mt-6 px-6 py-2 border-2 border-red-700 text-red-400 text-xs tracking-widest hover:bg-red-950/60 hover:text-red-300 transition-colors"
              >
                [Press 'R' to Restart]
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b-2 border-amber-700/60 pb-3 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-[0.15em] text-amber-400 crt-glow">
            AETHELGARD: DESCENT
          </h1>
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <span className="text-emerald-400">
              {state.mode === 'DUNGEON' || state.mode === 'COMBAT'
                ? `DUNGEON L${state.dungeonLevel}  X:${String(state.dungeonPos.x).padStart(2, '0')} Y:${String(state.dungeonPos.y).padStart(2, '0')}`
                : `X:${String(worldPos.x).padStart(2, '0')} Y:${String(worldPos.y).padStart(2, '0')}`}
            </span>
            <span className="px-2 py-0.5 border border-amber-500 text-amber-400 text-[10px] tracking-widest bg-amber-950/40">
              {state.mode}
            </span>
          </div>
        </header>

        {/* Main two-column area */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 relative">
          <div className="crt-frame p-2 bg-black relative">
            <GameCanvas state={state} />

            {/* Floating town services HUD */}
            {onTownTile && state.mode === 'OVERWORLD' && (
              <div className="absolute inset-x-2 bottom-2 bg-neutral-950/95 border-2 border-amber-600 p-2 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                <div className="text-amber-500 text-[10px] tracking-[0.2em] mb-1.5 text-center">
                  == OAKHAVEN KEEP ==
                </div>
                <div className="flex flex-col sm:flex-row gap-1.5">
                  {townActions.map((a) => (
                    <button
                      key={a.key}
                      onClick={a.onClick}
                      className="flex-1 text-left px-2 py-1.5 border border-amber-800/70 bg-black/60 hover:bg-amber-950/60 transition-colors text-[10px] leading-tight"
                    >
                      <span className="text-amber-400 font-bold">[{a.key}]</span>
                      <span className="text-neutral-300"> {a.label}</span>
                      <span className="block text-amber-600/90 text-[9px] mt-0.5">{a.cost}g</span>
                    </button>
                  ))}
                </div>
                <p className="text-neutral-600 text-[9px] mt-1.5 text-center">
                  Walk away to leave. Movement stays free.
                </p>
              </div>
            )}

            {/* Combat action bar overlay */}
            {state.mode === 'COMBAT' && state.combat && (
              <div className="absolute inset-x-2 bottom-2 bg-neutral-950/95 border-2 border-red-700 p-2 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-red-400 text-[11px] font-bold tracking-widest">
                    {state.combat.monster.name}
                  </span>
                  <span className="text-red-300/80 text-[10px]">
                    {state.combat.monster.hp}/{state.combat.monster.maxHp} HP
                  </span>
                </div>
                <div className="w-full h-1.5 bg-black border border-red-900 mb-2">
                  <div
                    className="h-full bg-red-500 transition-all duration-200"
                    style={{ width: `${(state.combat.monster.hp / state.combat.monster.maxHp) * 100}%` }}
                  />
                </div>
                <div className="flex gap-1.5">
                  {[
                    { key: 'A', label: 'Attack', onClick: combatAttack, color: 'border-red-700 text-red-400 hover:bg-red-950/60' },
                    { key: 'P', label: 'Parry', onClick: combatParry, color: 'border-sky-700 text-sky-400 hover:bg-sky-950/60' },
                    { key: 'F', label: 'Flee', onClick: combatFlee, color: 'border-neutral-600 text-neutral-400 hover:bg-neutral-900' },
                  ].map((a) => (
                    <button
                      key={a.key}
                      onClick={a.onClick}
                      className={`flex-1 py-1.5 border bg-black/60 transition-colors text-[11px] ${a.color}`}
                    >
                      <span className="font-bold">[{a.key}]</span> {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <LogBox log={state.log} turn={state.log.length} />
        </main>

        {/* Status bar */}
        <footer className="border-t-2 border-amber-700/60 pt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="border border-amber-900/60 bg-black/50 px-3 py-2 flex items-center justify-between">
                <span className="text-amber-600 text-[10px] tracking-widest">{s.label}:</span>
                <span className={`text-sm tabular-nums ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
          {(state.mode === 'DUNGEON' || state.mode === 'COMBAT') && (
            <div className="border border-emerald-900/60 bg-black/50 px-3 py-2 flex items-center justify-between">
              <span className="text-emerald-600 text-[10px] tracking-widest">LOCATION:</span>
              <span className="text-sm text-emerald-400">
                The Abyssal Vaults - Level {state.dungeonLevel} (X: {state.dungeonPos.x}, Y: {state.dungeonPos.y})
              </span>
            </div>
          )}
          <p className="text-center text-[10px] tracking-wider text-neutral-500">
            {state.mode === 'COMBAT'
              ? '[A]: Attack  |  [P]: Parry  |  [F]: Flee'
              : state.mode === 'DUNGEON'
              ? '[W/Up]: Advance  |  [A/D/Left/Right]: Turn  |  [S/Down]: Retreat  |  [Enter]: Use Ladder'
              : onTownTile
              ? '[H]: Heal  |  [R]: Rations  |  [U]: Upgrade Sword  |  [WASD]: Walk away'
              : '[WASD / Arrows]: Move  |  [Enter]: Enter Dungeon'}
          </p>
        </footer>
      </div>
    </div>
  );
}
