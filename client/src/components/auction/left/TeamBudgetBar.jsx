import { useState } from 'react';
import { formatLakhs } from '../../../utils/formatCurrency';
import { RoleBadge } from '../../common/Badge';

export default function TeamBudgetBar({ team, isMyTeam, config }) {
  const [expanded, setExpanded] = useState(false);
  const remaining = team.budget?.remaining ?? 0;
  const total = team.budget?.total ?? 1;
  const percent = Math.max(0, Math.min(100, (remaining / total) * 100));

  return (
    <div
      className={`card p-3 cursor-pointer transition-all ${isMyTeam ? 'ring-1 ring-amber-500/50' : ''}`}
      onClick={() => setExpanded((e) => !e)}
      style={{ borderLeftColor: team.color, borderLeftWidth: 3 }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-black shrink-0"
             style={{ backgroundColor: team.color }}>
          {team.teamName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white truncate">{team.teamName}</span>
            {isMyTeam && <span className="text-xs text-amber-400 shrink-0">(You)</span>}
            <div className={`w-1.5 h-1.5 rounded-full ml-auto shrink-0 ${team.isConnected ? 'bg-green-400' : 'bg-slate-600'}`} />
          </div>
          {team.ownerName && (
            <div className="text-xs text-slate-400 truncate">
              {team.ownerName}{team.coOwnerName ? ` & ${team.coOwnerName}` : ''}
            </div>
          )}
        </div>
      </div>

      {/* Budget bar */}
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: team.color }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-amber-400 font-bold">{formatLakhs(remaining)}</span>
        <div className="flex items-center gap-2 text-slate-500">
          <span>{team.squad?.length ?? 0}/{config?.maxSquadSize ?? 25} players</span>
          <span>✈️ {Math.max(0, (config?.maxOverseasPlayers ?? 8) - (team.overseasCount ?? 0))} left</span>
        </div>
      </div>

      {/* Expanded squad */}
      {expanded && team.squad?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
          {(() => {
            const ROLE_ORDER = { batsman: 0, bowler: 1, 'all-rounder': 2, 'wicket-keeper': 3 };
            const sortedSquad = [...team.squad].sort(
              (a, b) => (ROLE_ORDER[a.playerId?.role] ?? 99) - (ROLE_ORDER[b.playerId?.role] ?? 99)
            );
            return sortedSquad;
          })().map((s, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                {s.playerId && <RoleBadge role={s.playerId.role} size="xs" />}
                <span className="text-slate-300 truncate">{s.playerId?.name ?? 'Unknown'}</span>
                {s.playerId?.nationality === 'Overseas' && <span className="shrink-0">✈️</span>}
              </div>
              <span className="text-slate-500 shrink-0">{formatLakhs(s.soldPrice)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
