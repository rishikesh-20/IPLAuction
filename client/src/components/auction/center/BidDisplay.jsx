import { useEffect, useRef } from 'react';
import { formatLakhs } from '../../../utils/formatCurrency';
import { getTeamHex } from '../../landing/TeamSelector';

export default function BidDisplay({ currentBid, currentPlayer }) {
  const amountRef = useRef(null);
  const prevAmount = useRef(null);

  useEffect(() => {
    if (currentBid?.amount && prevAmount.current !== currentBid.amount) {
      prevAmount.current = currentBid.amount;
      if (amountRef.current) {
        amountRef.current.classList.remove('animate-bid-flash');
        void amountRef.current.offsetWidth;
        amountRef.current.classList.add('animate-bid-flash');
      }
    }
  }, [currentBid?.amount]);

  const amount = currentBid?.amount ?? currentPlayer?.basePrice;
  const hasLeader = currentBid?.teamName;
  const leaderColor = hasLeader ? getTeamHex(currentBid.teamName) : null;

  return (
    <div className="card p-4 text-center">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
        {hasLeader ? 'Current Bid' : 'Base Price'}
      </div>
      <div
        ref={amountRef}
        className="text-4xl font-black rounded-lg py-1"
        style={{ color: leaderColor ?? '#f59e0b' }}
      >
        {formatLakhs(amount)}
      </div>
      {hasLeader && (
        <div className="mt-1 text-sm text-slate-300 flex items-center justify-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: leaderColor }}
          />
          <span className="font-semibold" style={{ color: leaderColor }}>
            {currentBid.teamName}
          </span>
          <span className="text-slate-500">is leading</span>
        </div>
      )}
      {!hasLeader && (
        <div className="mt-1 text-xs text-slate-500">No bids yet</div>
      )}
    </div>
  );
}
