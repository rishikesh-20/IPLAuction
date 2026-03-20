import PlayerQueue from '../right/PlayerQueue';

export default function RightPanel() {
  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Player Queue</h2>
      <PlayerQueue />
    </div>
  );
}
