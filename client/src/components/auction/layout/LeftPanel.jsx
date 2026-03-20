import TeamList from '../left/TeamList';

export default function LeftPanel() {
  return (
    <div>
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Teams</h2>
      <TeamList />
    </div>
  );
}
