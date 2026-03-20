import { formatLakhs } from '../../utils/formatCurrency';
import { RoleBadge, NationalityBadge } from '../common/Badge';

export default function FinalStandings({ standings }) {
  if (!standings) return null;
  const sorted = [...standings].sort((a, b) => a.budget.spent - b.budget.spent);

  return (
    <div className="space-y-4">
      {sorted.map((team, rank) => (
        <div key={team._id} className="card p-4" style={{ borderLeftColor: team.color, borderLeftWidth: 3 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-black text-lg"
                   style={{ backgroundColor: team.color }}>
                {team.teamName[0]}
              </div>
              <div>
                <div className="font-bold text-white">{team.teamName}</div>
                <div className="text-xs text-slate-400">{team.ownerName}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-amber-400 font-bold">{formatLakhs(team.budget.spent)} spent</div>
              <div className="text-slate-500 text-xs">{formatLakhs(team.budget.remaining)} remaining</div>
            </div>
          </div>

          {/* Squad */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {team.squad.map((s, i) => (
              <div key={i} className="bg-slate-900 rounded-lg p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{s.playerId?.name ?? '—'}</div>
                  <div className="flex gap-1 mt-0.5">
                    {s.playerId && <RoleBadge role={s.playerId.role} size="xs" />}
                  </div>
                </div>
                <div className="text-xs font-bold text-amber-400 shrink-0">{formatLakhs(s.soldPrice)}</div>
              </div>
            ))}
          </div>

          {team.squad.length === 0 && (
            <p className="text-slate-600 text-xs text-center py-2">No players purchased</p>
          )}
        </div>
      ))}
    </div>
  );
}
