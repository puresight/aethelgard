import { useEffect, useRef } from 'react';
import GameCanvas from '@/components/GameCanvas';
import { useGameState } from '@/state/useGameState';
import type { GameState } from '@/types/game';

function Ticker({ log }: { log: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);
  const recent = log.slice(-2);
  return (
    <div
      ref={ref}
      className="h-10 overflow-hidden px-2 py-1 text-[11px] leading-relaxed text-emerald-400 bg-black/70 border-x-2 border-b-2 border-neutral-800 rounded-b-md"
    >
      {recent.map((m, i) => (
        <p key={i} className="truncate">{m}</p>
      ))}
    </div>
  );
}

interface BtnProps {
  label: string;
  sub?: string;
  onPress: () => void;
  className?: string;
}

function TouchBtn({ label, sub, onPress, className = '' }: BtnProps) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`select-none rounded-lg border-2 active:scale-95 active:brightness-150 transition-transform touch-manipulation flex flex-col items-center justify-center leading-none ${className}`}
      style={{ touchAction: 'manipulation' }}
    >
      <span>{label}</span>
      {sub && <span className="text-[8px] opacity-70 mt-0.5">{sub}</span>}
    </button>
  );
}

function TouchDeck({ state, move, moveDungeon, rotateDungeon, action, restart }: {
  state: GameState;
  move: (dx: number, dy: number) => void;
  moveDungeon: (s: number) => void;
  rotateDungeon: (t: 1 | -1) => void;
  action: () => void;
  restart: () => void;
}) {
  if (state.mode === 'GAME_OVER') {
    return (
      <div className="w-full flex justify-center pb-2">
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            restart();
          }}
          className="px-8 py-3 border-2 border-red-700 text-red-400 rounded-lg active:scale-95 active:brightness-150 text-sm tracking-widest bg-black/80"
        >
          TAP TO RESTART
        </button>
      </div>
    );
  }

  if (state.mode === 'DUNGEON') {
    return (
      <div className="w-full grid grid-cols-2 gap-2 pb-2">
        <div className="flex flex-col gap-1.5">
          <TouchBtn label="↑ FWD" onPress={() => moveDungeon(1)} className="h-11 border-emerald-700 bg-emerald-950/60 text-emerald-300 text-sm" />
          <div className="grid grid-cols-3 gap-1.5">
            <TouchBtn label="↶" sub="TURN L" onPress={() => rotateDungeon(-1)} className="h-11 border-amber-700 bg-amber-950/60 text-amber-300 text-lg" />
            <TouchBtn label="↓" sub="BACK" onPress={() => moveDungeon(-1)} className="h-11 border-neutral-700 bg-neutral-900 text-neutral-300 text-lg" />
            <TouchBtn label="↷" sub="TURN R" onPress={() => rotateDungeon(1)} className="h-11 border-amber-700 bg-amber-950/60 text-amber-300 text-lg" />
          </div>
        </div>
        <TouchBtn label="USE / ENTER" sub="ladder · chest" onPress={action} className="h-full min-h-[96px] border-amber-500 bg-amber-900/50 text-amber-200 text-sm tracking-wider" />
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-2 gap-2 pb-2">
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-36">
        <div />
        <TouchBtn label="↑" onPress={() => move(0, -1)} className="h-11 border-emerald-700 bg-emerald-950/60 text-emerald-300 text-lg" />
        <div />
        <TouchBtn label="←" onPress={() => move(-1, 0)} className="h-11 border-emerald-700 bg-emerald-950/60 text-emerald-300 text-lg" />
        <div />
        <TouchBtn label="→" onPress={() => move(1, 0)} className="h-11 border-emerald-700 bg-emerald-950/60 text-emerald-300 text-lg" />
        <div />
        <TouchBtn label="↓" onPress={() => move(0, 1)} className="h-11 border-emerald-700 bg-emerald-950/60 text-emerald-300 text-lg" />
        <div />
      </div>
      <TouchBtn label="ACTION" sub="enter · shrine" onPress={action} className="h-full min-h-[120px] border-amber-500 bg-amber-900/50 text-amber-200 text-base tracking-wider" />
    </div>
  );
}

export default function App() {
  const { state, restart, move, moveDungeon, rotateDungeon, action } = useGameState();
  const { player } = state;
  const hpRatio = player.hp / player.maxHp;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between p-2 sm:p-4 bg-neutral-950 text-neutral-100 select-none touch-none">
      {/* Top sticky HUD */}
      <div className="sticky top-0 z-20 bg-neutral-950/95 backdrop-blur-sm border-b-2 border-neutral-800 px-2 py-2 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400 w-16 shrink-0">HP: {player.hp}/{player.maxHp}</span>
          <div className="flex-1 h-3.5 bg-neutral-900 border border-neutral-700 rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${hpRatio > 0.5 ? 'bg-emerald-500' : hpRatio > 0.25 ? 'bg-amber-500' : 'bg-red-600'}`}
              style={{ width: `${hpRatio * 100}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px]">LVL {player.level}</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[10px]">{player.gold}g</span>
          <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 text-[10px]">ATK {player.attack} · {player.weapon}</span>
          <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 text-[10px]">DEF {player.defense} · {player.armor}</span>
          {state.mode !== 'GAME_OVER' && (
            <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 text-[10px]">
              {state.mode === 'DUNGEON' ? `VAULTS L${state.dungeonLevel}` : `X${state.worldPos.x} Y${state.worldPos.y}`}
            </span>
          )}
        </div>
      </div>

      {/* Center viewport + ticker */}
      <div className="flex-1 flex flex-col justify-center py-1">
        <div className="w-full max-w-[480px] mx-auto overflow-hidden rounded-md border-2 border-neutral-800 shadow-lg bg-black">
          <GameCanvas state={state} />
        </div>
        <div className="w-full max-w-[480px] mx-auto">
          <Ticker log={state.log} />
        </div>
      </div>

      {/* Bottom touch deck */}
      <TouchDeck
        state={state}
        move={move}
        moveDungeon={moveDungeon}
        rotateDungeon={rotateDungeon}
        action={action}
        restart={restart}
      />
    </div>
  );
}
