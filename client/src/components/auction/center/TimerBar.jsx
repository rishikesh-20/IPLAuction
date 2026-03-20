import CountdownRing from '../../common/CountdownRing';
import { useAuction } from '../../../context/AuctionContext';

export default function TimerBar() {
  const { timer, auctionPhase } = useAuction();
  const { secondsRemaining, totalDuration, isExtended } = timer;

  if (auctionPhase !== 'bidding') return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <CountdownRing secondsRemaining={secondsRemaining} totalDuration={totalDuration} size={110} />
      {isExtended && (
        <span className="text-xs text-amber-400 font-medium animate-pulse">+Extended</span>
      )}
    </div>
  );
}
