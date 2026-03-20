import { useAuction } from '../../../context/AuctionContext';
import PlayerCard from '../center/PlayerCard';
import BidDisplay from '../center/BidDisplay';
import BidButton from '../center/BidButton';
import BidHistory from '../center/BidHistory';
import TimerBar from '../center/TimerBar';
import AuctioneerControls from '../center/AuctioneerControls';
import { formatLakhs } from '../../../utils/formatCurrency';

export default function CenterPanel() {
  const { currentPlayer, currentBid, bidHistory, auctionPhase, lastSoldInfo, lastUnsoldInfo } = useAuction();

  if (auctionPhase === 'idle' || (!currentPlayer && auctionPhase === 'bidding')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-slate-600">
          <img src="/ipl_logo.png" alt="IPL" className="h-16 mx-auto mb-2 object-contain rounded-2xl opacity-30" />
          <p className="text-sm">Waiting for auction to start…</p>
        </div>
      </div>
    );
  }

  if (auctionPhase === 'sold' && lastSoldInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-6 animate-slide-in">
        <div className="text-6xl">🔨</div>
        <div className="text-center">
          <div className="text-green-400 text-lg font-black uppercase tracking-widest mb-1">SOLD!</div>
          <div className="text-3xl font-black text-white mb-1">{lastSoldInfo.player?.name}</div>
          <div className="text-amber-400 text-2xl font-bold">{formatLakhs(lastSoldInfo.soldPrice)}</div>
          <div className="text-slate-300 mt-2">to <span className="font-bold text-white">{lastSoldInfo.soldTo?.teamName}</span></div>
        </div>
      </div>
    );
  }

  if (auctionPhase === 'unsold' && lastUnsoldInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-6 animate-slide-in">
        <div className="text-6xl">↩️</div>
        <div className="text-center">
          <div className="text-red-400 text-lg font-black uppercase tracking-widest mb-1">UNSOLD</div>
          <div className="text-3xl font-black text-white">{lastUnsoldInfo.player?.name}</div>
        </div>
      </div>
    );
  }

  if (auctionPhase === 'completed') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-xl font-bold text-white">Auction Complete!</p>
          <p className="text-slate-400 text-sm mt-1">Check the summary page for results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <TimerBar />
      </div>
      <PlayerCard player={currentPlayer} />
      <BidDisplay currentBid={currentBid} currentPlayer={currentPlayer} />
      <BidButton />
      <BidHistory bids={bidHistory} />
      <AuctioneerControls />
    </div>
  );
}
