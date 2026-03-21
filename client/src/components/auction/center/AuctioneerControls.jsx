import { useState } from 'react';
import { useAuction } from '../../../context/AuctionContext';
import { useRoom } from '../../../context/RoomContext';
import Button from '../../common/Button';

export default function AuctioneerControls() {
  const { isAuctioneer, room } = useRoom();
  const { emitMarkUnsold, emitPause, emitResume, emitEndAuction, auctionPhase } = useAuction();
  const [confirmEnd, setConfirmEnd] = useState(false);

  if (!isAuctioneer) return null;

  const isPaused = room?.status === 'paused';

  const handleEndAuction = () => {
    emitEndAuction();
    setConfirmEnd(false);
  };

  return (
    <div className="card p-3 border-red-900/30">
      <div className="text-xs text-red-400/70 uppercase tracking-wider mb-2 text-center">Auctioneer Controls</div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" size="sm" onClick={emitMarkUnsold} disabled={auctionPhase !== 'bidding'}>
          Mark Unsold
        </Button>
        {isPaused ? (
          <Button variant="success" size="sm" onClick={emitResume}>
            Resume
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={emitPause} disabled={auctionPhase !== 'bidding'}>
            Pause
          </Button>
        )}
      </div>

      {/* End Auction */}
      <div className="mt-2">
        {confirmEnd ? (
          <div className="bg-red-950/50 border border-red-800 rounded-lg p-2 text-center">
            <p className="text-red-300 text-xs mb-2">End auction for all teams?</p>
            <div className="flex gap-2">
              <button
                onClick={handleEndAuction}
                className="flex-1 text-xs bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 rounded transition-colors"
              >
                Yes, End
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1.5 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmEnd(true)}
            className="w-full text-xs bg-red-950/40 hover:bg-red-900/50 border border-red-900/50 text-red-400 hover:text-red-300 py-1.5 rounded-lg transition-colors"
          >
            🛑 End Auction
          </button>
        )}
      </div>
    </div>
  );
}
