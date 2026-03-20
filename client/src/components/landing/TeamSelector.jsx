const IPL_TEAMS = [
  { name: 'Mumbai Indians',              abbr: 'MI',   color: 'bg-blue-600',   ring: 'ring-blue-500',   hex: '#2563eb' },
  { name: 'Chennai Super Kings',         abbr: 'CSK',  color: 'bg-yellow-500', ring: 'ring-yellow-400', hex: '#eab308' },
  { name: 'Royal Challengers Bangalore', abbr: 'RCB',  color: 'bg-red-600',    ring: 'ring-red-500',    hex: '#dc2626' },
  { name: 'Kolkata Knight Riders',       abbr: 'KKR',  color: 'bg-purple-700', ring: 'ring-purple-500', hex: '#7e22ce' },
  { name: 'Delhi Capitals',              abbr: 'DC',   color: 'bg-blue-500',   ring: 'ring-blue-400',   hex: '#3b82f6' },
  { name: 'Sunrisers Hyderabad',         abbr: 'SRH',  color: 'bg-orange-500', ring: 'ring-orange-400', hex: '#f97316' },
  { name: 'Rajasthan Royals',            abbr: 'RR',   color: 'bg-pink-500',   ring: 'ring-pink-400',   hex: '#ec4899' },
  { name: 'Punjab Kings',                abbr: 'PBKS', color: 'bg-red-500',    ring: 'ring-red-400',    hex: '#ef4444' },
  { name: 'Gujarat Titans',              abbr: 'GT',   color: 'bg-indigo-600', ring: 'ring-indigo-500', hex: '#4f46e5' },
  { name: 'Lucknow Super Giants',        abbr: 'LSG',  color: 'bg-cyan-500',   ring: 'ring-cyan-400',   hex: '#06b6d4' },
];

export { IPL_TEAMS };

/** Look up a team's hex color by full name. Falls back to IPL amber. */
export function getTeamHex(teamName) {
  return IPL_TEAMS.find((t) => t.name === teamName)?.hex ?? '#f59e0b';
}

export default function TeamSelector({ selectedTeam, setSelectedTeam, takenTeams = [] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {IPL_TEAMS.map((team) => {
        const isTaken = takenTeams.includes(team.name);
        const isSelected = selectedTeam?.name === team.name;
        return (
          <button
            key={team.abbr}
            type="button"
            disabled={isTaken}
            onClick={() => !isTaken && setSelectedTeam(team)}
            className={`
              relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-150
              ${isTaken
                ? 'opacity-40 cursor-not-allowed border-slate-600 bg-slate-800'
                : isSelected
                  ? `border-amber-500 bg-slate-700 ring-2 ${team.ring} scale-105`
                  : 'border-slate-600 bg-slate-800 hover:border-slate-400 hover:scale-105 cursor-pointer'
              }
            `}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1"
              style={{ backgroundColor: team.hex }}
            >
              {team.abbr.slice(0, 2)}
            </span>
            <span className="text-white text-xs font-medium text-center leading-tight">{team.abbr}</span>
            {isTaken && (
              <span className="absolute top-1 right-1 text-[9px] text-slate-400 font-semibold">Taken</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
