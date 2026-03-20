import { useState } from 'react';
import { useAuction } from '../../../context/AuctionContext';
import PlayerQueueItem from './PlayerQueueItem';
import SoldUnsoldTabs from './SoldUnsoldTabs';

const ROLES = ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'];

export default function PlayerQueue() {
  const { playerQueue } = useAuction();
  const [roleFilter, setRoleFilter] = useState('');

  const filtered = roleFilter
    ? playerQueue.filter((p) => p.role === roleFilter)
    : playerQueue;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Up Next */}
      <div className="card overflow-hidden">
        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Up Next</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-700 border-none rounded px-2 py-0.5 text-slate-300 focus:outline-none"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="divide-y divide-slate-700/50">
          {filtered.length === 0 && (
            <p className="text-slate-600 text-xs text-center py-6">No more players in queue</p>
          )}
          {filtered.map((p, i) => (
            <PlayerQueueItem key={p._id} player={p} index={i} />
          ))}
        </div>
      </div>

      {/* Sold / Unsold tabs */}
      <SoldUnsoldTabs />
    </div>
  );
}
