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
  const { state, restart } = useGameState();
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
              {state.mode === 'DUNGEON'
                ? `DUNGEON L${state.dungeonLevel}  X:${String(state.dungeonPos.x).padStart(2, '0')} Y:${String(state.dungeonPos.y).padStart(2, '0')}`
                : state.mode === 'TOWN'
                ? 'OAKHAVEN KEEP'
                : `X:${String(worldPos.x).padStart(2, '0')} Y:${String(worldPos.y).padStart(2, '0')}`}
            </span>
            <span className="px-2 py-0.5 border border-amber-500 text-amber-400 text-[10px] tracking-widest bg-amber-950/40">
              {state.mode}
            </span>
          </div>
        </header>

        {/* Main two-column area */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="crt-frame p-2 bg-black">
            <GameCanvas state={state} />
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
          {state.mode === 'DUNGEON' && (
            <div className="border border-emerald-900/60 bg-black/50 px-3 py-2 flex items-center justify-between">
              <span className="text-emerald-600 text-[10px] tracking-widest">LOCATION:</span>
              <span className="text-sm text-emerald-400">
                The Abyssal Vaults - Level {state.dungeonLevel} (X: {state.dungeonPos.x}, Y: {state.dungeonPos.y})
              </span>
            </div>
          )}
          {state.mode === 'TOWN' && (
            <div className="border border-amber-900/60 bg-black/50 px-3 py-2 flex items-center justify-between">
              <span className="text-amber-600 text-[10px] tracking-widest">LOCATION:</span>
              <span className="text-sm text-amber-400">Oakhaven Keep - Safe haven of the realm</span>
            </div>
          )}
          <p className="text-center text-[10px] tracking-wider text-neutral-500">
            {state.mode === 'DUNGEON'
              ? '[W/Up]: Advance  |  [A/D/Left/Right]: Turn  |  [S/Down]: Retreat  |  [Enter]: Use Ladder'
              : state.mode === 'TOWN'
              ? '[1-4]: Enter District  |  [Hotkeys]: Act  |  [B]: Back  |  [ESC/Enter/E]: Leave Town'
              : '[WASD / Arrows]: Move  |  [Enter]: Enter Site'}
          </p>
        </footer>
      </div>
    </div>
  );
}
