import { formatLakhs } from '../../../utils/formatCurrency';
import { getTeamHex } from '../../landing/TeamSelector';

export default function BidHistory({ bids }) {
  if (!bids || bids.length === 0) return null;

  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Recent Bids</div>
      <div className="space-y-1">
        {bids.map((bid, i) => {
          const teamColor = getTeamHex(bid.teamName);
          return (
            <div
              key={i}
              className={`flex justify-between items-center text-sm rounded px-2 py-1 ${i === 0 ? 'bg-slate-700/60' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: teamColor }}
                />
                <span
                  className="font-medium"
                  style={{ color: i === 0 ? teamColor : '#cbd5e1' }}
                >
                  {bid.teamName}
                </span>
              </div>
              <span
                className="font-bold"
                style={{ color: i === 0 ? teamColor : '#94a3b8' }}
              >
                {formatLakhs(bid.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
