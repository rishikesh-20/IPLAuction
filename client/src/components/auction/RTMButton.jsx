import { useMemo } from 'react';
import { useAuction } from '../../context/AuctionContext';
import { useTeams } from '../../context/TeamContext';
import { IPL_TEAMS } from '../landing/TeamSelector';

// Expand pipe-separated history entries into flat abbr array: ['MI|KKR','RCB'] → ['MI','KKR','RCB']
function expandHistory(iplTeamHistory) {
  return (iplTeamHistory || []).flatMap((h) => h.split('|').map((s) => s.trim()).filter(Boolean));
}

export default function RTMButton() {
  const { rtmPhase, rtmInfo, emitRtmInterest, currentPlayer, auctionPhase } = useAuction();
  const { myTeam, myTeamId } = useTeams();

  // Only show for teams (not auctioneer-only), never after auction completes
  if (!myTeam || auctionPhase === 'completed') return null;

  // ── State B: RTM window active ────────────────────────────────────────────
  if (rtmPhase === 'window' && rtmInfo) {
    const isEligible = rtmInfo.eligibleTeamIds.includes(String(myTeamId));
    const hasOptedIn = rtmInfo.interestedTeamIds.includes(String(myTeamId));
    const seconds = rtmInfo.windowSecondsRemaining ?? 0;

    if (isEligible && !hasOptedIn) {
      return (
        <button
          onClick={emitRtmInterest}
          className="fixed bottom-20 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white ring-2 ring-amber-300/60 animate-pulse cursor-pointer transition-all"
          title={`Use RTM to reclaim this player — ${seconds}s remaining`}
        >
          <span>🔁</span>
          <span>RTM</span>
          <span className="ml-1 text-xs opacity-80">{seconds}s</span>
        </button>
      );
    }

    if (isEligible && hasOptedIn) {
      return (
        <button
          disabled
          className="fixed bottom-20 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg bg-amber-800/60 text-amber-300 cursor-not-allowed opacity-80"
        >
          <span>🔁</span>
          <span>RTM: Opted In</span>
          <span className="ml-1 text-xs opacity-70">{seconds}s</span>
        </button>
      );
    }

    // Not eligible — spectator view
    return (
      <button
        disabled
        className="fixed bottom-20 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg bg-gray-800/80 text-gray-400 border border-gray-700/60 cursor-not-allowed opacity-70"
        title="RTM window is open for eligible teams"
      >
        <span>🔁</span>
        <span>RTM Window</span>
        <span className="ml-1 text-xs opacity-70">{seconds}s</span>
      </button>
    );
  }

  // ── State C: RTM bidding war ──────────────────────────────────────────────
  if (rtmPhase === 'bidding' && rtmInfo) {
    const isParticipant = (rtmInfo.interestedTeamIds || []).includes(String(myTeamId));
    return (
      <button
        disabled
        className={`fixed bottom-20 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg cursor-not-allowed ${
          isParticipant
            ? 'bg-amber-800/60 text-amber-300'
            : 'bg-gray-800/80 text-gray-400 border border-gray-700/60 opacity-70'
        }`}
      >
        <span>🔁</span>
        <span>RTM Bidding…</span>
      </button>
    );
  }

  // ── Hidden during active bidding ──────────────────────────────────────────
  if (auctionPhase === 'bidding') return null;

  // ── Persistent indicator: visible between players and at idle ─────────────
  const rtmLeft = myTeam.rtmRemaining ?? 0;
  const teamAbbr = IPL_TEAMS.find((t) => t.name === myTeam.teamName)?.abbr || myTeam.teamName;
  const expandedHistory = useMemo(
    () => expandHistory(currentPlayer?.iplTeamHistory),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPlayer?.iplTeamHistory]
  );
  const hasHistory = expandedHistory.includes(teamAbbr);
  const isEligibleNow = hasHistory && rtmLeft > 0;

  return (
    <div
      className={`fixed bottom-20 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg select-none cursor-default transition-all ${
        isEligibleNow
          ? 'bg-amber-900/70 text-amber-400 border border-amber-700/50'
          : rtmLeft > 0
          ? 'bg-gray-800/70 text-gray-400 border border-gray-700/40'
          : 'bg-gray-800/40 text-gray-600 border border-gray-700/20 opacity-50'
      }`}
      title={rtmLeft > 0 ? `${rtmLeft} RTM use${rtmLeft !== 1 ? 's' : ''} remaining` : 'No RTM uses remaining'}
    >
      <span>🔁</span>
      <span>RTM</span>
      <span className="ml-1 text-xs opacity-70">{rtmLeft} left</span>
    </div>
  );
}
