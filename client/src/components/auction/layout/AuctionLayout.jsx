import { useState } from 'react';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';
import PlayersModal from '../../common/PlayersModal';
import { useRoom } from '../../../context/RoomContext';
import { useAuction } from '../../../context/AuctionContext';

export default function AuctionLayout() {
  const { room } = useRoom();
  const { auctionOrder, totalPlayers, soldPlayers, unsoldPlayers } = useAuction();
  const [showPlayers, setShowPlayers] = useState(false);

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
          <span className="text-emerald-400 font-semibold">{soldPlayers.length} sold</span>
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
          <button
            onClick={() => setShowPlayers(true)}
            className="text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 px-3 py-1.5 rounded-lg text-slate-300 transition-colors"
          >
            📋 Players
          </button>
          <div className="font-mono text-sm font-bold text-slate-500 tracking-widest">{room?.roomCode}</div>
        </div>
      </header>

      {showPlayers && <PlayersModal onClose={() => setShowPlayers(false)} />}

      {/* 3-column body */}
      <div className="flex-1 grid min-h-0" style={{ gridTemplateColumns: '22% 52% 26%' }}>
        <div className="overflow-y-auto p-3 border-r border-slate-800">
          <LeftPanel />
        </div>
        <div className="overflow-y-auto p-4 border-r border-slate-800">
          <CenterPanel />
        </div>
        <div className="overflow-y-auto p-3">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
