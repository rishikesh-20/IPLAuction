import { useTeams } from '../../context/TeamContext';
import { useAuction } from '../../context/AuctionContext';
import { formatLakhs as formatPrice } from '../../utils/formatCurrency';

const ROLE_STYLES = {
  'batsman': 'text-blue-400 bg-blue-500/20',
  'batter': 'text-blue-400 bg-blue-500/20',
  'bowler': 'text-emerald-400 bg-emerald-500/20',
  'all-rounder': 'text-purple-400 bg-purple-500/20',
  'allrounder': 'text-purple-400 bg-purple-500/20',
  'wicket-keeper': 'text-amber-400 bg-amber-500/20',
  'wicketkeeper': 'text-amber-400 bg-amber-500/20',
};

const ROLE_LABELS = {
  'batsman': 'Batter',
  'batter': 'Batter',
  'bowler': 'Bowler',
  'all-rounder': 'All-rounder',
  'allrounder': 'All-rounder',
  'wicket-keeper': 'Wicketkeeper',
  'wicketkeeper': 'Wicketkeeper',
};


export default function EmergencyFundModal({ onClose }) {
  const { myTeam } = useTeams();
  const { emitEmergencyRelease } = useAuction();

  const squad = myTeam?.squad ?? [];

  function handleRelease(playerId) {
    emitEmergencyRelease(playerId);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">Select a player to release</h2>
            <p className="text-xs text-gray-400 mt-0.5">You will get a full refund. This action cannot be undone.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Squad list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {squad.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No players in squad</p>
          ) : (
            squad.map((entry) => {
              const player = entry.playerId;
              if (!player) return null;
              const roleKey = player.role?.toLowerCase();
              const roleStyle = ROLE_STYLES[roleKey] ?? 'text-gray-400 bg-gray-500/20';
              const roleLabel = ROLE_LABELS[roleKey] ?? player.role;

              return (
                <div
                  key={player._id}
                  className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 border border-gray-700"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-white font-semibold text-sm truncate">{player.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleStyle}`}>
                        {roleLabel}
                      </span>
                      <span className="text-xs text-gray-400">
                        {player.nationality === 'Overseas' ? '🌍 Overseas' : '🇮🇳 Indian'}
                      </span>
                    </div>
                    <span className="text-xs text-emerald-400 font-medium">
                      Bought for {formatPrice(entry.soldPrice)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRelease(player._id)}
                    className="ml-4 shrink-0 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Release
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
