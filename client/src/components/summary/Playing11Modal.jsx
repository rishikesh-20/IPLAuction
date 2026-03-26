import { useState } from 'react';
import { setTeamPlaying11 } from '../../api/rooms';

const ROLE_ORDER = { batsman: 0, bowler: 1, 'all-rounder': 2, 'wicket-keeper': 3 };

const ROLE_STYLES = {
  batsman: 'text-blue-400 bg-blue-500/20',
  bowler: 'text-emerald-400 bg-emerald-500/20',
  'all-rounder': 'text-purple-400 bg-purple-500/20',
  'wicket-keeper': 'text-amber-400 bg-amber-500/20',
};

const ROLE_LABELS = {
  batsman: 'Batsman',
  bowler: 'Bowler',
  'all-rounder': 'All-rounder',
  'wicket-keeper': 'Wicketkeeper',
};

export default function Playing11Modal({ team, onClose, onSaved }) {
  const sortedSquad = [...(team.squad ?? [])].sort(
    (a, b) => (ROLE_ORDER[a.playerId?.role] ?? 99) - (ROLE_ORDER[b.playerId?.role] ?? 99)
  );

  // Pre-fill if already saved
  const [selected, setSelected] = useState(() => new Set(
    (team.playing11 ?? []).map((p) => (p._id ?? p).toString())
  ));
  const [captainId, setCaptainId] = useState(
    team.captainId ? (team.captainId._id ?? team.captainId).toString() : ''
  );
  const [viceCaptainId, setViceCaptainId] = useState(
    team.viceCaptainId ? (team.viceCaptainId._id ?? team.viceCaptainId).toString() : ''
  );
  const [impactPlayerId, setImpactPlayerId] = useState(
    team.impactPlayerId ? (team.impactPlayerId._id ?? team.impactPlayerId).toString() : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function togglePlayer(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (captainId === id) setCaptainId('');
        if (viceCaptainId === id) setViceCaptainId('');
        if (impactPlayerId === id) setImpactPlayerId('');
      } else {
        if (next.size >= 11) return prev;
        next.add(id);
      }
      return next;
    });
  }

  const selectedArr = Array.from(selected);
  const selectedPlayers = sortedSquad.filter((s) => selected.has(s.playerId._id.toString()));
  const benchPlayers = sortedSquad.filter((s) => !selected.has(s.playerId._id.toString()));

  async function handleSave() {
    if (selected.size !== 11) { setError('Select exactly 11 players'); return; }
    if (!captainId) { setError('Select a captain'); return; }
    if (!viceCaptainId) { setError('Select a vice-captain'); return; }
    if (captainId === viceCaptainId) { setError('Captain and vice-captain must be different'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await setTeamPlaying11(team._id, {
        playerIds: selectedArr,
        captainId,
        viceCaptainId,
        impactPlayerId: impactPlayerId || undefined,
      });
      onSaved(res.data.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">Pick Playing 11</h2>
            <p className="text-xs text-gray-400 mt-0.5">{team.teamName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${selected.size === 11 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {selected.size} / 11
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">✕</button>
          </div>
        </div>

        {/* Player list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {sortedSquad.map((entry) => {
            const player = entry.playerId;
            if (!player) return null;
            const id = player._id.toString();
            const isSelected = selected.has(id);
            const isDisabled = !isSelected && selected.size >= 11;
            const roleStyle = ROLE_STYLES[player.role] ?? 'text-gray-400 bg-gray-500/20';
            const roleLabel = ROLE_LABELS[player.role] ?? player.role;

            return (
              <button
                key={id}
                onClick={() => togglePlayer(id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : impactPlayerId === id
                    ? 'bg-orange-500/10 border-orange-500/40'
                    : isDisabled
                    ? 'bg-gray-800/40 border-gray-700/40 opacity-40 cursor-not-allowed'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? 'border-emerald-400 bg-emerald-400' : 'border-gray-600'
                }`}>
                  {isSelected && <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
                </div>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm truncate">{player.name}</span>
                    {captainId === id && <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">C</span>}
                    {viceCaptainId === id && <span className="text-xs font-bold text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded">VC</span>}
                    {impactPlayerId === id && <span className="text-xs font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">IP</span>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleStyle}`}>{roleLabel}</span>
                </div>

                <span className="text-xs text-gray-400 shrink-0">{player.nationality === 'Overseas' ? '🌍' : '🇮🇳'}</span>
              </button>
            );
          })}
        </div>

        {/* Captain / VC / Impact Player pickers — shown when 11 are selected */}
        {selected.size === 11 && (
          <div className="px-5 py-4 border-t border-gray-700 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block font-medium">Captain</label>
                <select
                  value={captainId}
                  onChange={(e) => setCaptainId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select captain</option>
                  {selectedPlayers.map((s) => (
                    <option key={s.playerId._id} value={s.playerId._id.toString()} disabled={viceCaptainId === s.playerId._id.toString()}>
                      {s.playerId.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block font-medium">Vice-Captain</label>
                <select
                  value={viceCaptainId}
                  onChange={(e) => setViceCaptainId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Select vice-captain</option>
                  {selectedPlayers.map((s) => (
                    <option key={s.playerId._id} value={s.playerId._id.toString()} disabled={captainId === s.playerId._id.toString()}>
                      {s.playerId.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {benchPlayers.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block font-medium">Impact Player <span className="text-gray-600">(from bench — optional)</span></label>
                <select
                  value={impactPlayerId}
                  onChange={(e) => setImpactPlayerId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">None</option>
                  {benchPlayers.map((s) => (
                    <option key={s.playerId._id} value={s.playerId._id.toString()}>
                      {s.playerId.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700 flex items-center justify-between gap-3">
          {error ? <p className="text-xs text-red-400">{error}</p> : <span />}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || selected.size !== 11 || !captainId || !viceCaptainId}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save Playing 11'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
