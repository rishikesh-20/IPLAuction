import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoomStandings } from '../api/rooms';
import FinalStandings from '../components/summary/FinalStandings';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { formatLakhs } from '../utils/formatCurrency';
import { RoleBadge } from '../components/common/Badge';

export default function SummaryPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const myTeamId = sessionStorage.getItem('teamId');
  const isAuctioneer = sessionStorage.getItem('isAuctioneer') === 'true';

  useEffect(() => {
    getRoomStandings(roomCode)
      .then((res) => setData(res.data.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [roomCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🏆</span>
              <h1 className="text-2xl font-black text-white">Auction Complete</h1>
            </div>
            <p className="text-slate-400 text-sm">Room: <span className="font-mono text-amber-400">{roomCode}</span></p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>New Auction</Button>
        </div>

        {/* Stats row */}
        {data && (
          <div className="card p-4 mb-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-black text-white">{data.teams?.length ?? 0}</div>
              <div className="text-slate-500 text-xs">Teams</div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400">
                {data.teams?.reduce((s, t) => s + (t.squad?.length ?? 0), 0)}
              </div>
              <div className="text-slate-500 text-xs">Players Sold</div>
            </div>
            <div>
              <div className="text-2xl font-black text-red-400">{data.unsoldPlayers?.length ?? 0}</div>
              <div className="text-slate-500 text-xs">Unsold</div>
            </div>
          </div>
        )}

        {/* Standings */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Final Squads</h2>
        <FinalStandings standings={data?.teams} myTeamId={myTeamId} isAuctioneer={isAuctioneer} />

        {/* Unsold */}
        {data?.unsoldPlayers?.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Unsold Players ({data.unsoldPlayers.length})
            </h2>
            <div className="card p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {data.unsoldPlayers.map((p) => (
                <div key={p._id} className="bg-slate-900 rounded-lg p-2">
                  <div className="text-xs font-medium text-slate-300">{p.name}</div>
                  <div className="flex gap-1 mt-0.5">
                    <RoleBadge role={p.role} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
