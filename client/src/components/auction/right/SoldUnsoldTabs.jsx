import { useState } from 'react';
import { useAuction } from '../../../context/AuctionContext';
import { formatLakhs } from '../../../utils/formatCurrency';
import { RoleBadge } from '../../common/Badge';

export default function SoldUnsoldTabs() {
  const [tab, setTab] = useState('sold');
  const { auctionHistory, unsoldPlayers } = useAuction();

  const sold = auctionHistory.filter((h) => h.outcome === 'sold');

  return (
    <div className="card overflow-hidden">
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setTab('sold')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === 'sold' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Sold ({sold.length})
        </button>
        <button
          onClick={() => setTab('unsold')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === 'unsold' ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Unsold ({unsoldPlayers.length})
        </button>
      </div>
      <div className="max-h-52 overflow-y-auto">
        {tab === 'sold' && (
          <div>
            {sold.length === 0 && <p className="text-slate-600 text-xs text-center py-4">No sales yet</p>}
            {sold.map((h, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50 hover:bg-slate-700/30">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate font-medium">{h.player?.name}</div>
                  <div className="text-xs text-emerald-400 truncate">{h.soldTo?.teamName}</div>
                </div>
                <div className="text-xs font-bold text-amber-400">{formatLakhs(h.soldPrice)}</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'unsold' && (
          <div>
            {unsoldPlayers.length === 0 && <p className="text-slate-600 text-xs text-center py-4">No unsold players</p>}
            {unsoldPlayers.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50 hover:bg-slate-700/30">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-300 truncate">{p.name}</div>
                  <div className="flex gap-1 mt-0.5">
                    <RoleBadge role={p.role} size="xs" />
                  </div>
                </div>
                <div className="text-xs text-slate-500">{formatLakhs(p.basePrice)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
