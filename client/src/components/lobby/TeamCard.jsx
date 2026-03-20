import { formatLakhs } from '../../utils/formatCurrency';

export default function TeamCard({ team }) {
  return (
    <div className="card p-4 flex items-center gap-4" style={{ borderLeftColor: team.color, borderLeftWidth: 3 }}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-black"
           style={{ backgroundColor: team.color }}>
        {team.teamName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white truncate">{team.teamName}</div>
        <div className="text-xs text-slate-400">{team.ownerName}</div>
      </div>
      <div className="text-right">
        <div className="text-amber-400 font-bold text-sm">{formatLakhs(team.budget?.remaining ?? team.budget?.total)}</div>
        <div className={`text-xs font-medium flex items-center gap-1 justify-end ${team.isConnected ? 'text-green-400' : 'text-slate-500'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${team.isConnected ? 'bg-green-400' : 'bg-slate-500'}`} />
          {team.isConnected ? 'Online' : 'Offline'}
        </div>
      </div>
    </div>
  );
}
