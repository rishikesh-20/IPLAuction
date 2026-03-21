import { useState, useEffect } from 'react';
import { useAuction } from '../../../context/AuctionContext';
import { useTeams } from '../../../context/TeamContext';
import { useRoom } from '../../../context/RoomContext';
import { getNextBidAmount } from '../../../utils/bidTiers';
import { formatLakhs } from '../../../utils/formatCurrency';
import Button from '../../common/Button';

export default function BidButton() {
  const { currentBid, currentPlayer, emitPlaceBid, auctionPhase } = useAuction();
  const { myTeam } = useTeams();
  const { room } = useRoom();

  const hasBid = currentBid?.teamId != null;
  const minBidAmount = hasBid
    ? getNextBidAmount(currentBid.amount)
    : (currentPlayer?.basePrice ?? 0);

  const [inputText, setInputText] = useState(String(minBidAmount));

  useEffect(() => {
    setInputText(String(minBidAmount));
  }, [minBidAmount]);

  const parsedAmount = parseInt(inputText, 10);
  const parsedValid = !isNaN(parsedAmount);

  if (!myTeam) return null;

  const teamHex = myTeam?.color;

  let disabledReason = null;
  if (auctionPhase !== 'bidding') {
    disabledReason = 'No player being auctioned';
  } else if (myTeam.budget?.remaining < minBidAmount) {
    disabledReason = `Insufficient budget (${formatLakhs(myTeam.budget.remaining)} left)`;
  } else if (myTeam.squad?.length >= (room?.config?.maxSquadSize ?? 25)) {
    disabledReason = 'Squad is full';
  } else if (currentPlayer?.nationality === 'Overseas' && myTeam.overseasCount >= (room?.config?.maxOverseasPlayers ?? 8)) {
    disabledReason = 'Overseas player limit reached';
  } else if (currentBid?.teamId?.toString() === myTeam._id?.toString()) {
    disabledReason = "You're already the highest bidder";
  }

  const bidAmountValid =
    parsedValid &&
    parsedAmount >= minBidAmount &&
    parsedAmount % 5 === 0;
  const canBid = !disabledReason && bidAmountValid && myTeam?.budget?.remaining >= parsedAmount;

  const handleBid = () => {
    if (!canBid || !myTeam?._id) return;
    emitPlaceBid(myTeam._id, parsedAmount);
  };

  const handleAmountChange = (e) => {
    setInputText(e.target.value);
  };

  const quickAmounts = [];
  let cursor = minBidAmount;
  for (let i = 0; i < 3; i++) {
    quickAmounts.push(cursor);
    cursor = getNextBidAmount(cursor);
  }

  return (
    <div className="space-y-2">
      {/* Quick-bid chips — clicking places the bid immediately */}
      {!disabledReason && (
        <div className="flex gap-2">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => {
                if ((myTeam?.budget?.remaining ?? 0) >= amt) {
                  emitPlaceBid(myTeam._id, amt);
                }
              }}
              disabled={(myTeam?.budget?.remaining ?? 0) < amt}
              style={teamHex ? { backgroundColor: teamHex, borderColor: teamHex } : undefined}
              className="flex-1 text-xs py-1.5 rounded-lg border text-white font-bold transition-all hover:opacity-90 active:opacity-70 disabled:bg-slate-700 disabled:border-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {formatLakhs(amt)}
            </button>
          ))}
        </div>
      )}

      {/* Custom amount row */}
      {!disabledReason && (
        <div className="flex gap-2 items-center">
          <span className="text-slate-400 text-sm shrink-0">Custom:</span>
          <div className="flex-1 flex items-center gap-1">
            <button
              onClick={() => {
                const cur = parseInt(inputText, 10);
                const next = isNaN(cur) ? minBidAmount : Math.max(minBidAmount, cur - 5);
                setInputText(String(next));
              }}
              className="w-7 h-7 rounded bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 text-sm font-bold flex items-center justify-center"
            >−</button>
            <input
              type="text"
              inputMode="numeric"
              value={inputText}
              onChange={handleAmountChange}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-amber-500 w-0"
            />
            <button
              onClick={() => {
                const cur = parseInt(inputText, 10);
                const next = isNaN(cur) ? minBidAmount + 5 : cur + 5;
                setInputText(String(next));
              }}
              className="w-7 h-7 rounded bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 text-sm font-bold flex items-center justify-center"
            >+</button>
          </div>
          <span className="text-slate-500 text-xs shrink-0">L</span>
        </div>
      )}

      {/* Main bid button */}
      <Button
        onClick={handleBid}
        disabled={!canBid}
        size="xl"
        className="w-full text-lg text-white"
        style={canBid && teamHex ? { backgroundColor: teamHex, borderColor: teamHex } : undefined}
        title={disabledReason || undefined}
      >
        Bid {parsedValid ? formatLakhs(parsedAmount) : '—'}
      </Button>

      {disabledReason && (
        <p className="text-center text-xs text-slate-500">{disabledReason}</p>
      )}
      {!disabledReason && !parsedValid && (
        <p className="text-center text-xs text-red-400">Enter a valid amount</p>
      )}
      {!disabledReason && parsedValid && !bidAmountValid && (
        <p className="text-center text-xs text-red-400">
          {parsedAmount < minBidAmount
            ? `Min bid: ${formatLakhs(minBidAmount)}`
            : `Must be a multiple of ₹5L`}
        </p>
      )}
    </div>
  );
}
