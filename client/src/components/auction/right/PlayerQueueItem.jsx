import { RoleBadge, NationalityBadge } from '../../common/Badge';
import { formatLakhs } from '../../../utils/formatCurrency';

export default function PlayerQueueItem({ player, index, isTargeted }) {
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
      isTargeted
        ? 'bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15'
        : 'hover:bg-slate-700/50'
    }`}>
      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{player.name}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <RoleBadge role={player.role} size="xs" />
          <NationalityBadge nationality={player.nationality} country={player.country} />
        </div>
      </div>
      <div className="text-xs text-slate-400 shrink-0">{formatLakhs(player.basePrice)}</div>
      {isTargeted && <span className="text-amber-400 text-xs shrink-0">🎯</span>}
    </div>
  );
}
