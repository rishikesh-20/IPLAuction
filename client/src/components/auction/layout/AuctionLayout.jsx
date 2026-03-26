import { useState, Component } from 'react';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';
import PlayersModal from '../../common/PlayersModal';
import TargetedPlayersPanel from '../right/TargetedPlayersPanel';
import { useRoom } from '../../../context/RoomContext';
import { useAuction } from '../../../context/AuctionContext';
import { useTeams } from '../../../context/TeamContext';

class ModalErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <p className="text-white font-semibold mb-3">Failed to load players</p>
            <button onClick={() => { this.setState({ hasError: false }); this.props.onClose(); }}
              className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg">
              Close
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AuctionLayout() {
  const { room, isAuctioneer } = useRoom();
  const { auctionOrder, totalPlayers, soldCount, unsoldPlayers, targetedPlayers, hasTargetedPlayerInQueue } = useAuction();
  const { myTeam } = useTeams();
  const [showPlayers, setShowPlayers] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState(null); // null | 'queue' | 'targeted'

  const toggleSidebar = (name) => setActiveSidebar((prev) => (prev === name ? null : name));

  const ownerName = myTeam?.ownerName || sessionStorage.getItem('ownerName') || '';
  const teamName = myTeam?.teamName || (isAuctioneer ? 'Auctioneer' : '');

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      {/* Top header bar */}
      <header className="shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/ipl_logo.png" alt="IPL" className="h-8 w-auto object-contain rounded-lg" />
          <div>
            <div className="font-bold text-white text-sm leading-tight">{room?.roomName}</div>
            <div className="text-slate-400 text-xs">{room?.auctioneerName}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          {auctionOrder > 0 && (
            <span>Player <span className="text-white font-bold">{auctionOrder}</span> / {totalPlayers}</span>
          )}
          <span className="text-emerald-400 font-semibold">{soldCount} sold</span>
          <span className="text-red-400 font-semibold">{unsoldPlayers.length} unsold</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            room?.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
            room?.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
            room?.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
            'bg-slate-500/20 text-slate-400'
          }`}>
            {room?.status?.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Your identity badge */}
          {(ownerName || teamName) && (
            <div className="flex items-center gap-1.5 bg-slate-700/60 border border-slate-600 rounded-lg px-2.5 py-1">
              {myTeam?.color && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: myTeam.color }} />
              )}
              <div className="text-xs leading-tight">
                <span className="text-white font-semibold">{ownerName}</span>
                {teamName && (
                  <span className="text-slate-400"> · {teamName}</span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => toggleSidebar('queue')}
            className={`text-xs border px-3 py-1.5 rounded-lg transition-all ${
              activeSidebar === 'queue'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : hasTargetedPlayerInQueue
                ? 'bg-amber-500/10 border-amber-400/70 text-amber-300 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.35)]'
                : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-300'
            }`}
          >
            🗂 Queue
          </button>
          <button
            onClick={() => toggleSidebar('targeted')}
            className={`text-xs border px-3 py-1.5 rounded-lg transition-all ${
              activeSidebar === 'targeted'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                : targetedPlayers.length > 0
                ? 'bg-slate-700 hover:bg-slate-600 border-amber-500/40 text-amber-400'
                : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-300'
            }`}
          >
            🎯 Targeted{targetedPlayers.length > 0 && (
              <span className="ml-1 font-semibold text-amber-400">({targetedPlayers.length})</span>
            )}
          </button>
          <button
            onClick={() => setShowPlayers(true)}
            className="text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 px-3 py-1.5 rounded-lg text-slate-300 transition-colors"
          >
            📋 Players
          </button>
          <div className="font-mono text-sm font-bold text-slate-500 tracking-widest">{room?.roomCode}</div>
        </div>
      </header>

      {showPlayers && (
        <ModalErrorBoundary onClose={() => setShowPlayers(false)}>
          <PlayersModal onClose={() => setShowPlayers(false)} />
        </ModalErrorBoundary>
      )}

      {/* 2-column body */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <div className="w-[22%] shrink-0 overflow-y-auto p-3 border-r border-slate-800">
          <LeftPanel />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <CenterPanel />
        </div>

        {/* Sliding Sidebar */}
        <div className={`absolute top-0 right-0 h-full w-72 bg-slate-900 border-l border-slate-700 overflow-y-auto transition-transform duration-300 ease-in-out z-30 ${
          activeSidebar ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 sticky top-0 bg-slate-900">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {activeSidebar === 'targeted' ? '🎯 Targeted Players' : '🗂 Player Queue'}
            </h2>
            <button onClick={() => setActiveSidebar(null)} className="text-slate-500 hover:text-white text-lg leading-none transition-colors">✕</button>
          </div>
          <div className="p-3">
            {activeSidebar === 'targeted' ? <TargetedPlayersPanel /> : <RightPanel />}
          </div>
        </div>

        {/* Backdrop when sidebar open */}
        {activeSidebar && (
          <div className="absolute inset-0 z-20 bg-black/30" onClick={() => setActiveSidebar(null)} />
        )}
      </div>
    </div>
  );
}
