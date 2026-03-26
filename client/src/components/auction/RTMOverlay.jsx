import { useState, useEffect } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { useTeams } from '../../context/TeamContext';
import { getNextBidAmount } from '../../utils/bidTiers';
import { formatLakhs as formatPrice } from '../../utils/formatCurrency';

// ─── Window Phase ─────────────────────────────────────────────────────────────

function RTMWindow({ rtmInfo, myTeamId, isEligible, hasOptedIn, emitRtmInterest, teams }) {
  const seconds = rtmInfo.windowSecondsRemaining ?? 0;
  const pct = Math.max(0, Math.min(100, (seconds / 10) * 100));

  return (
    <div className="flex flex-col gap-4">
      {/* Player + sale info */}
      <div className="text-center">
        <p className="text-lg font-bold text-white">{rtmInfo.player?.name}</p>
        <p className="text-sm text-gray-400">
          Sold to <span className="text-white font-medium">{rtmInfo.soldTo?.teamName}</span> for{' '}
          <span className="text-emerald-400 font-semibold">{formatPrice(rtmInfo.soldPrice)}</span>
        </p>
      </div>

      {/* Countdown */}
      <div className="text-center">
        <span className={`text-4xl font-mono font-bold ${seconds <= 3 ? 'text-red-400' : 'text-amber-400'}`}>
          {seconds}s
        </span>
        <p className="text-xs text-gray-500 mt-0.5">RTM window closes in</p>
        <div className="mt-2 h-1.5 rounded-full bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${seconds <= 3 ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Eligible teams list */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Eligible Teams</p>
        {(rtmInfo.eligibleTeamIds || []).map((tid) => {
          const opted = (rtmInfo.interestedTeamIds || []).includes(String(tid));
          const isMe = String(tid) === String(myTeamId);
          const teamObj = (teams || []).find((t) => String(t._id) === String(tid));
          const displayName = isMe ? 'You' : (teamObj?.teamName || tid);
          return (
            <div
              key={tid}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                opted ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-gray-800 border border-gray-700'
              }`}
            >
              <span className={`font-medium ${isMe ? 'text-amber-300' : 'text-gray-300'}`}>
                {displayName}
              </span>
              {opted ? (
                <span className="text-amber-400 text-xs font-semibold">✓ Opted In</span>
              ) : (
                <span className="text-gray-500 text-xs">Deciding…</span>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {isEligible && !hasOptedIn && (
        <button
          onClick={emitRtmInterest}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold text-base transition-colors ring-2 ring-amber-300/40"
        >
          🔁 Use RTM — Match at {formatPrice(rtmInfo.soldPrice)}
        </button>
      )}
      {isEligible && hasOptedIn && (
        <div className="w-full py-3 rounded-xl bg-amber-800/40 border border-amber-600/30 text-amber-300 font-semibold text-sm text-center">
          ✓ You opted in — waiting for window to close
        </div>
      )}
      {!isEligible && (
        <div className="w-full py-2 rounded-xl bg-gray-800 text-gray-500 text-sm text-center">
          Your team has no RTM rights for this player
        </div>
      )}
    </div>
  );
}

// ─── Bidding Phase ────────────────────────────────────────────────────────────

function RTMBidding({ rtmInfo, myTeamId, myTeam, emitRtmBid }) {
  const seconds = rtmInfo.biddingSecondsRemaining ?? 0;
  const pct = Math.max(0, Math.min(100, (seconds / 10) * 100));

  const isParticipant = (rtmInfo.interestedTeamIds || []).includes(String(myTeamId));
  const currentBidAmount = rtmInfo.currentRtmBid?.amount ?? null;
  const nextBidAmount = currentBidAmount ? getNextBidAmount(currentBidAmount) : (rtmInfo.nextRtmBidAmount ?? rtmInfo.soldPrice ?? 0);

  const [inputText, setInputText] = useState(String(nextBidAmount));

  useEffect(() => {
    setInputText(String(nextBidAmount));
  }, [nextBidAmount]);

  const parsed = parseInt(inputText, 10);
  const parsedValid = !isNaN(parsed) && parsed >= nextBidAmount && parsed % 5 === 0 && (myTeam?.budget?.remaining ?? 0) >= parsed;

  const quickAmounts = [nextBidAmount, getNextBidAmount(nextBidAmount), getNextBidAmount(getNextBidAmount(nextBidAmount))];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="text-center">
        <p className="text-base font-bold text-white">{rtmInfo.player?.name}</p>
        <p className="text-xs text-gray-400">RTM Bidding War</p>
      </div>

      {/* Current bid */}
      <div className="bg-gray-800 rounded-xl p-3 text-center border border-gray-700">
        {rtmInfo.currentRtmBid ? (
          <>
            <p className="text-2xl font-bold text-emerald-400">{formatPrice(rtmInfo.currentRtmBid.amount)}</p>
            <p className="text-xs text-gray-400">by {rtmInfo.currentRtmBid.teamName}</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-400">No bids yet</p>
            <p className="text-xs text-gray-500">Floor: {formatPrice(rtmInfo.soldPrice)}</p>
          </>
        )}
      </div>

      {/* Timer */}
      <div className="text-center">
        <span className={`text-3xl font-mono font-bold ${seconds <= 3 ? 'text-red-400' : 'text-amber-400'}`}>
          {seconds}s
        </span>
        <div className="mt-1 h-1.5 rounded-full bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${seconds <= 3 ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Participants */}
      <div className="flex flex-wrap gap-2">
        {(rtmInfo.interestedTeams || []).map((t) => (
          <span
            key={t.teamId}
            className={`text-xs px-2 py-1 rounded-full font-medium border ${
              String(t.teamId) === String(myTeamId)
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-gray-700 border-gray-600 text-gray-300'
            }`}
          >
            {t.teamName}
          </span>
        ))}
      </div>

      {/* Bid controls for participants */}
      {isParticipant ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">
            Budget: <span className="text-white font-medium">{formatPrice(myTeam?.budget?.remaining)}</span>
            {' · '}Min bid: <span className="text-amber-300 font-medium">{formatPrice(nextBidAmount)}</span>
          </p>
          {/* Quick-select chips */}
          <div className="flex gap-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => emitRtmBid(amt)}
                disabled={(myTeam?.budget?.remaining ?? 0) < amt}
                className="flex-1 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                {formatPrice(amt)}
              </button>
            ))}
          </div>
          {/* Custom amount */}
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setInputText(String(Math.max(nextBidAmount, (parseInt(inputText) || nextBidAmount) - 5)))}
              className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors"
            >−</button>
            <input
              type="number"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 text-center bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
              placeholder={String(nextBidAmount)}
            />
            <button
              onClick={() => setInputText(String((parseInt(inputText) || nextBidAmount) + 5))}
              className="w-9 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors"
            >+</button>
            <button
              onClick={() => { if (parsedValid) emitRtmBid(parsed); }}
              disabled={!parsedValid}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold text-sm disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              Bid
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-gray-500 py-2">
          Watching RTM bidding war
        </div>
      )}
    </div>
  );
}

// ─── Ended Banner ─────────────────────────────────────────────────────────────

function RTMEnded({ rtmInfo }) {
  if (!rtmInfo) return null;
  const { outcome } = rtmInfo;
  if (outcome === 'rtm-won') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <span className="text-4xl">🏆</span>
        <p className="text-lg font-bold text-white">RTM Successful!</p>
        <p className="text-sm text-gray-300">
          <span className="text-amber-300 font-semibold">{rtmInfo.rtmWinner?.teamName}</span> claimed{' '}
          <span className="text-white font-medium">{rtmInfo.player?.name}</span> for{' '}
          <span className="text-emerald-400 font-semibold">{formatPrice(rtmInfo.finalPrice)}</span>
        </p>
        <p className="text-xs text-gray-500">
          {rtmInfo.originalWinner?.teamName} refunded {formatPrice(rtmInfo.refundAmount)}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <span className="text-4xl">✅</span>
      <p className="text-lg font-bold text-white">No RTM</p>
      <p className="text-sm text-gray-300">
        <span className="text-white font-medium">{rtmInfo.player?.name}</span> stays with{' '}
        <span className="text-amber-300 font-semibold">{rtmInfo.soldTo?.teamName}</span>
      </p>
    </div>
  );
}

// ─── Main Overlay ─────────────────────────────────────────────────────────────

export default function RTMOverlay() {
  const { rtmPhase, rtmInfo, emitRtmInterest, emitRtmBid } = useAuction();
  const { myTeam, myTeamId, teams } = useTeams();

  if (!rtmPhase || !rtmInfo) return null;

  const isEligible = (rtmInfo.eligibleTeamIds || []).includes(String(myTeamId));
  const hasOptedIn = (rtmInfo.interestedTeamIds || []).includes(String(myTeamId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl shadow-amber-500/10 flex flex-col max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-700 flex items-center gap-3">
          <span className="text-2xl">🔁</span>
          <div>
            <h2 className="text-base font-bold text-amber-400">
              {rtmPhase === 'window' && 'Right to Match'}
              {rtmPhase === 'bidding' && 'RTM Bidding War'}
              {rtmPhase === 'ended' && 'RTM Complete'}
            </h2>
            <p className="text-xs text-gray-400">
              {rtmPhase === 'window' && 'Eligible teams can reclaim this player'}
              {rtmPhase === 'bidding' && 'Only opted-in teams may bid'}
              {rtmPhase === 'ended' && 'Advancing to next player…'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {rtmPhase === 'window' && (
            <RTMWindow
              rtmInfo={rtmInfo}
              myTeamId={myTeamId}
              isEligible={isEligible}
              hasOptedIn={hasOptedIn}
              emitRtmInterest={emitRtmInterest}
              teams={teams}
            />
          )}
          {rtmPhase === 'bidding' && (
            <RTMBidding
              rtmInfo={rtmInfo}
              myTeamId={myTeamId}
              myTeam={myTeam}
              emitRtmBid={emitRtmBid}
            />
          )}
          {rtmPhase === 'ended' && <RTMEnded rtmInfo={rtmInfo} />}
        </div>
      </div>
    </div>
  );
}
