import { useState } from 'react';
import { formatLakhs } from '../../utils/formatCurrency';
import { RoleBadge } from '../common/Badge';
import Playing11Modal from './Playing11Modal';

const ROLE_ORDER = { batsman: 0, bowler: 1, 'all-rounder': 2, 'wicket-keeper': 3 };

export default function FinalStandings({ standings, myTeamId, isAuctioneer }) {
  if (!standings) return null;
  const sorted = [...standings].sort((a, b) => a.budget.spent - b.budget.spent);
  const [teams, setTeams] = useState(sorted);
  const [modalTeam, setModalTeam] = useState(null);

  function handleSaved(updatedTeam) {
    setTeams((prev) => prev.map((t) => (t._id === updatedTeam._id ? { ...t, ...updatedTeam } : t)));
  }

  return (
    <>
      <div className="space-y-4">
        {teams.map((team) => {
          const canEdit = isAuctioneer || (myTeamId && myTeamId === team._id?.toString());
          const playing11Ids = new Set((team.playing11 ?? []).map((p) => (p._id ?? p).toString()));
          const captainId = team.captainId ? (team.captainId._id ?? team.captainId).toString() : null;
          const vcId = team.viceCaptainId ? (team.viceCaptainId._id ?? team.viceCaptainId).toString() : null;
          const impactId = team.impactPlayerId ? (team.impactPlayerId._id ?? team.impactPlayerId).toString() : null;
          const hasPlaying11 = playing11Ids.size === 11;

          const squadSorted = [...team.squad].sort(
            (a, b) => (ROLE_ORDER[a.playerId?.role] ?? 99) - (ROLE_ORDER[b.playerId?.role] ?? 99)
          );

          return (
            <div key={team._id} className="card p-4" style={{ borderLeftColor: team.color, borderLeftWidth: 3 }}>
              {/* Team header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-black text-lg"
                       style={{ backgroundColor: team.color }}>
                    {team.teamName[0]}
                  </div>
                  <div>
                    <div className="font-bold text-white">{team.teamName}</div>
                    <div className="text-xs text-slate-400">{team.ownerName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-amber-400 font-bold">{formatLakhs(team.budget.spent)} spent</div>
                    <div className="text-slate-500 text-xs">{formatLakhs(team.budget.remaining)} remaining</div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setModalTeam(team)}
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {hasPlaying11 ? 'Edit XI' : 'Pick XI'}
                    </button>
                  )}
                </div>
              </div>

              {hasPlaying11 ? (
                <>
                  {/* Playing 11 */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Playing 11</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {squadSorted
                        .filter((s) => playing11Ids.has(s.playerId?._id?.toString()))
                        .map((s, i) => {
                          const pid = s.playerId._id.toString();
                          const isC = pid === captainId;
                          const isVC = pid === vcId;
                          return (
                            <div key={i} className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium text-white truncate">{s.playerId?.name ?? '—'}</span>
                                  {isC && <span className="text-xs font-black text-amber-400 shrink-0">(C)</span>}
                                  {isVC && <span className="text-xs font-black text-sky-400 shrink-0">(VC)</span>}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {s.playerId && <RoleBadge role={s.playerId.role} size="xs" />}
                                  <span className="text-xs font-bold text-amber-400">{formatLakhs(s.soldPrice)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Impact Player */}
                  {impactId && (() => {
                    const entry = squadSorted.find((s) => s.playerId?._id?.toString() === impactId);
                    return entry ? (
                      <div className="mb-4">
                        <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">Impact Player</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium text-white truncate">{entry.playerId?.name ?? '—'}</span>
                                <span className="text-xs font-black text-orange-400 shrink-0">(IP)</span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {entry.playerId && <RoleBadge role={entry.playerId.role} size="xs" />}
                                <span className="text-xs font-bold text-amber-400">{formatLakhs(entry.soldPrice)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Bench */}
                  {squadSorted.filter((s) => !playing11Ids.has(s.playerId?._id?.toString()) && s.playerId?._id?.toString() !== impactId).length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Bench ({squadSorted.filter((s) => !playing11Ids.has(s.playerId?._id?.toString()) && s.playerId?._id?.toString() !== impactId).length})
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {squadSorted
                          .filter((s) => !playing11Ids.has(s.playerId?._id?.toString()) && s.playerId?._id?.toString() !== impactId)
                          .map((s, i) => (
                            <div key={i} className="bg-slate-900 rounded-lg p-2 flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-white truncate">{s.playerId?.name ?? '—'}</div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {s.playerId && <RoleBadge role={s.playerId.role} size="xs" />}
                                  <span className="text-xs font-bold text-amber-400">{formatLakhs(s.soldPrice)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Full squad (no playing 11 set yet) */}
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Full Squad ({team.squad.length})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {squadSorted.map((s, i) => (
                      <div key={i} className="bg-slate-900 rounded-lg p-2 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white truncate">{s.playerId?.name ?? '—'}</div>
                          <div className="flex gap-1 mt-0.5">
                            {s.playerId && <RoleBadge role={s.playerId.role} size="xs" />}
                          </div>
                        </div>
                        <div className="text-xs font-bold text-amber-400 shrink-0">{formatLakhs(s.soldPrice)}</div>
                      </div>
                    ))}
                  </div>
                  {team.squad.length === 0 && (
                    <p className="text-slate-600 text-xs text-center py-2">No players purchased</p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {modalTeam && (
        <Playing11Modal
          team={modalTeam}
          onClose={() => setModalTeam(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
