import { useState } from 'react';
import { useAuction } from '../../../context/AuctionContext';
import { RoleBadge } from '../../common/Badge';
import { formatLakhs } from '../../../utils/formatCurrency';


const ROLE_NORMALIZE = {
  batsman: 'Batter',
  batter: 'Batter',
  bowler: 'Bowler',
  'all-rounder': 'All-Rounder',
  allrounder: 'All-Rounder',
  'wicket-keeper': 'Wicketkeeper',
  wicketkeeper: 'Wicketkeeper',
};

const ROLE_FILTERS = ['All', 'Batter', 'Bowler', 'All-Rounder', 'Wicketkeeper'];

export default function TargetedPlayersPanel() {
  const { targetedPlayers, toggleTargetedPlayer, playerQueue, customAmounts, setCustomAmount } = useAuction();
  const [roleFilter, setRoleFilter] = useState('All');

  const inQueueIds = new Set(playerQueue.map((p) => p._id?.toString()));

  const filtered = roleFilter === 'All'
    ? targetedPlayers
    : targetedPlayers.filter(
        (p) => (ROLE_NORMALIZE[p.role?.toLowerCase()] ?? p.role) === roleFilter
      );

  if (targetedPlayers.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl mb-2">🎯</div>
        <p className="text-slate-400 text-sm font-medium mb-1">No players targeted yet</p>
        <p className="text-slate-600 text-xs leading-relaxed">
          Open <span className="text-slate-500">📋 Players</span> and tap{' '}
          <span className="text-amber-500">★</span> on any player to add them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-slate-700/50">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Targeted ({targetedPlayers.length})
          </span>
          <button
            onClick={() => [...targetedPlayers].forEach((p) => toggleTargetedPlayer(p))}
            className="text-xs text-slate-600 hover:text-red-400 transition-colors"
            title="Clear all targets"
          >
            Clear all
          </button>
        </div>

        {/* Role filter */}
        <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-slate-700/50">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                roleFilter === r
                  ? 'bg-amber-500 text-black font-bold'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Player list */}
        <div className="divide-y divide-slate-700/50">
          {filtered.length === 0 ? (
            <p className="text-slate-600 text-xs text-center py-5">
              No targeted {roleFilter.toLowerCase()}s
            </p>
          ) : (
            filtered.map((player) => {
              const inQueue = inQueueIds.has(player._id?.toString());
              const id = player._id?.toString();
              const customVal = customAmounts[id] ?? '';

              return (
                <div
                  key={id}
                  className={`p-2.5 transition-colors ${
                    inQueue ? 'bg-amber-500/10' : 'hover:bg-slate-700/30'
                  }`}
                >
                  {/* Top row: name + badges + remove */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">{player.name}</span>
                        {inQueue && (
                          <span className="shrink-0 text-xs bg-amber-500/20 text-amber-300 font-semibold px-1.5 py-0.5 rounded">
                            UP NEXT
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <RoleBadge role={player.role} size="xs" />
                      </div>
                    </div>
                    <button
                      onClick={() => toggleTargetedPlayer(player)}
                      className="text-slate-500 hover:text-red-400 text-sm leading-none px-1 mt-0.5 transition-colors shrink-0"
                      title="Remove target"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Bottom row: base price + custom amount input */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500">
                      Base: <span className="text-slate-300 font-medium">{formatLakhs(player.basePrice)}</span>
                    </span>
                    <div className="flex-1 flex items-center gap-1">
                      <span className="text-xs text-slate-500 shrink-0">Max:</span>
                      <div className="flex items-center flex-1 bg-slate-700/60 border border-slate-600 rounded px-1.5 py-0.5 focus-within:border-amber-500/60">
                        <span className="text-xs text-slate-500">₹</span>
                        <input
                          type="number"
                          min={player.basePrice}
                          step={5}
                          value={customVal}
                          onChange={(e) => setCustomAmount(id, e.target.value)}
                          placeholder="—"
                          className="w-full bg-transparent text-xs text-amber-300 placeholder-slate-600 focus:outline-none text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {customVal && (
                          <span className="text-xs text-slate-500 ml-0.5 shrink-0">L</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
