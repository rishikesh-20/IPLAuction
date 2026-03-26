import { RoleBadge, CategoryBadge, NationalityBadge } from '../../common/Badge';
import { useTeams } from '../../../context/TeamContext';

// Mirrors server-side IPL_TEAM_ABBR mapping
const IPL_TEAM_ABBR = {
  'Mumbai Indians':              'MI',
  'Chennai Super Kings':         'CSK',
  'Royal Challengers Bangalore': 'RCB',
  'Kolkata Knight Riders':       'KKR',
  'Delhi Capitals':              'DC',
  'Sunrisers Hyderabad':         'SRH',
  'Rajasthan Royals':            'RR',
  'Punjab Kings':                'PBKS',
  'Gujarat Titans':              'GT',
  'Lucknow Super Giants':        'LSG',
};

function expandTeamHistory(iplTeamHistory) {
  return (iplTeamHistory || []).flatMap((e) => e.split('|').map((s) => s.trim()).filter(Boolean));
}

export default function PlayerCard({ player }) {
  const { teams } = useTeams();
  if (!player) return null;

  const expandedHistory = expandTeamHistory(player.iplTeamHistory);

  // For each previous team abbreviation, find if a room team matches and has RTM left
  const rtmEligibleMap = {}; // abbr → room team (or null)
  expandedHistory.forEach((abbr) => {
    const match = teams.find((t) => (IPL_TEAM_ABBR[t.teamName] || t.teamName) === abbr && (t.rtmRemaining ?? 0) > 0);
    rtmEligibleMap[abbr] = match || null;
  });

  return (
    <div className="card p-5 text-center border-amber-500/20 relative overflow-hidden">
      {/* Background glow for marquee */}
      {player.category === 'marquee' && (
        <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
      )}

      {/* Player initials avatar */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 border-2 border-amber-500/40 flex items-center justify-center text-2xl font-black text-amber-400 mx-auto mb-3">
        {player.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
      </div>

      <h2 className="text-xl font-black text-white mb-1 leading-tight">{player.name}</h2>
      {player.specialization && (
        <p className="text-slate-400 text-xs mb-3">{player.specialization}</p>
      )}

      <div className="flex flex-wrap gap-1.5 justify-center mb-4">
        <RoleBadge role={player.role} />
        <CategoryBadge category={player.category} />
        <NationalityBadge nationality={player.nationality} country={player.country} />
        {player.age && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">Age {player.age}</span>}
      </div>

      {/* Stats */}
      {player.stats && (player.stats.matches > 0) && (
        <div className="grid grid-cols-3 gap-2 border-t border-slate-700 pt-3">
          <Stat label="Matches" value={player.stats.matches} />
          {player.role === 'bowler' ? (
            <>
              <Stat label="Wickets" value={player.stats.wickets} />
              <Stat label="Avg" value={player.stats.average} />
            </>
          ) : player.role === 'all-rounder' ? (
            <>
              <Stat label="Runs" value={player.stats.runs} />
              <Stat label="Wickets" value={player.stats.wickets} />
            </>
          ) : (
            <>
              <Stat label="Runs" value={player.stats.runs} />
              <Stat label="SR" value={player.stats.strikeRate} />
            </>
          )}
        </div>
      )}

      {/* Previous IPL teams + RTM availability */}
      {expandedHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">🔁 Previous Teams & RTM</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {expandedHistory.map((abbr, i) => {
              const roomTeam = rtmEligibleMap[abbr];
              return roomTeam ? (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/50 rounded-lg px-2.5 py-1"
                  title={`${roomTeam.teamName} has RTM — ${roomTeam.rtmRemaining} left`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: roomTeam.color }} />
                  <span className="text-xs text-amber-300 font-bold">{abbr}</span>
                  <span className="text-xs text-amber-500">RTM ✓</span>
                </div>
              ) : (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-700/50 border border-slate-700 text-slate-500"
                >
                  {abbr}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-white font-bold text-sm">{value}</div>
      <div className="text-slate-500 text-xs">{label}</div>
    </div>
  );
}
