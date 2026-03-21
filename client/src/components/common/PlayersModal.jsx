import { useState, useEffect, useMemo } from 'react';
import { useAuction } from '../../context/AuctionContext';
import api from '../../api/axios';

const ROLE_STYLES = {
  'Batter': 'text-blue-400 bg-blue-500/20',
  'Bowler': 'text-emerald-400 bg-emerald-500/20',
  'All-rounder': 'text-purple-400 bg-purple-500/20',
  'Wicketkeeper': 'text-amber-400 bg-amber-500/20',
};

const CATEGORY_LABELS = {
  marquee: 'Marquee',
  capped: 'Capped',
  uncapped: 'Uncapped',
  icon: 'Icon',
};

function formatPrice(lakhs) {
  if (!lakhs) return '—';
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(lakhs % 100 === 0 ? 0 : 2)} Cr`;
  return `₹${lakhs}L`;
}

export default function PlayersModal({ onClose }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const { soldPlayers = [], unsoldPlayers = [] } = useAuction();

  useEffect(() => {
    const controller = new AbortController();
    api.get('/players?limit=500', { signal: controller.signal })
      .then((res) => {
        setPlayers(res.data.data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  // Build status lookup maps
  const soldMap = useMemo(() => {
    const map = {};
    soldPlayers.forEach(({ player, soldTo, soldPrice }) => {
      if (player?._id) map[player._id.toString()] = {
        soldTo: soldTo?.teamName ?? soldTo, // normalize: server sends { teamId, teamName }
        soldPrice,
      };
    });
    return map;
  }, [soldPlayers]);

  const unsoldSet = useMemo(() => {
    const set = new Set();
    unsoldPlayers.forEach((p) => { if (p?._id) set.add(p._id.toString()); });
    return set;
  }, [unsoldPlayers]);

  const getStatus = (playerId) => {
    const id = playerId?.toString();
    if (soldMap[id]) return 'sold';
    if (unsoldSet.has(id)) return 'unsold';
    return 'available';
  };

  const roles = ['All', 'Batter', 'Bowler', 'All-rounder', 'Wicketkeeper'];
  const types = ['All', 'Indian', 'Overseas'];
  const statuses = ['All', 'Available', 'Sold', 'Unsold'];

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (search && !(p.name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== 'All' && p.role !== roleFilter) return false;
      if (typeFilter !== 'All' && p.nationality !== typeFilter) return false;
      if (statusFilter !== 'All') {
        const s = getStatus(p._id);
        if (statusFilter.toLowerCase() !== s) return false;
      }
      return true;
    });
  }, [players, search, roleFilter, typeFilter, statusFilter, soldMap, unsoldSet]);

  const counts = useMemo(() => ({
    total: players.length,
    sold: soldPlayers.length,
    unsold: unsoldPlayers.length,
    available: players.length - soldPlayers.length - unsoldPlayers.length,
  }), [players, soldPlayers, unsoldPlayers]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-bold text-lg">Player Pool</h2>
            <div className="flex gap-3 text-xs">
              <span className="text-slate-400">{counts.total} total</span>
              <span className="text-emerald-400">{counts.sold} sold</span>
              <span className="text-red-400">{counts.unsold} unsold</span>
              <span className="text-slate-300">{counts.available} available</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="shrink-0 bg-slate-850 border-b border-slate-700 px-4 py-3 space-y-2">
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <div className="flex flex-wrap gap-2">
            {/* Role filter */}
            <div className="flex gap-1">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    roleFilter === r
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="w-px bg-slate-700" />
            {/* Type filter */}
            <div className="flex gap-1">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    typeFilter === t
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="w-px bg-slate-700" />
            {/* Status filter */}
            <div className="flex gap-1">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    statusFilter === s
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <p className="text-slate-500 text-xs">{filtered.length} players shown</p>
        </div>

        {/* Player grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">Loading players…</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500">No players match your filters</div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {filtered.map((player) => {
                const status = getStatus(player._id);
                const soldInfo = soldMap[player._id?.toString()];
                return (
                  <div
                    key={player._id}
                    className={`bg-slate-800 rounded-lg p-3 border transition-colors ${
                      status === 'sold'
                        ? 'border-emerald-700 opacity-70'
                        : status === 'unsold'
                        ? 'border-red-800 opacity-60'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-white font-semibold text-sm leading-tight">{player.name}</span>
                      {status === 'sold' && (
                        <span className="shrink-0 text-xs bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">SOLD</span>
                      )}
                      {status === 'unsold' && (
                        <span className="shrink-0 text-xs bg-red-500/20 text-red-400 font-bold px-1.5 py-0.5 rounded">UNSOLD</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${ROLE_STYLES[player.role] ?? 'text-slate-400 bg-slate-700'}`}>
                        {player.role}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        player.nationality === 'Overseas'
                          ? 'text-sky-400 bg-sky-500/20'
                          : 'text-orange-400 bg-orange-500/20'
                      }`}>
                        {player.nationality === 'Overseas' ? '🌍 Overseas' : '🇮🇳 Indian'}
                      </span>
                      {player.category && (
                        <span className="text-xs px-1.5 py-0.5 rounded text-yellow-400 bg-yellow-500/10">
                          {CATEGORY_LABELS[player.category] ?? player.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">Base: <span className="text-white font-semibold">{formatPrice(player.basePrice)}</span></span>
                      {soldInfo && (
                        <span className="text-emerald-400 text-xs font-semibold">{formatPrice(soldInfo.soldPrice)}</span>
                      )}
                    </div>
                    {soldInfo && (
                      <div className="text-emerald-500 text-xs mt-1 truncate">→ {soldInfo.soldTo}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
