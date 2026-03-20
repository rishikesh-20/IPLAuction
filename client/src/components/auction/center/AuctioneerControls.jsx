import { useAuction } from '../../../context/AuctionContext';
import { useRoom } from '../../../context/RoomContext';
import Button from '../../common/Button';

export default function AuctioneerControls() {
  const { isAuctioneer, room } = useRoom();
  const { emitNextPlayer, emitMarkUnsold, emitPause, emitResume, auctionPhase, currentBid } = useAuction();

  if (!isAuctioneer) return null;

  const isPaused = room?.status === 'paused';

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
    </div>
  );
}
