import { useTeams } from '../../../context/TeamContext';
import { useRoom } from '../../../context/RoomContext';
import TeamBudgetBar from './TeamBudgetBar';

export default function TeamList() {
  const { teams, myTeamId } = useTeams();
  const { room } = useRoom();

  const sorted = [...teams].sort((a, b) => (b.budget?.remaining ?? 0) - (a.budget?.remaining ?? 0));

  return (
    <div className="space-y-2">
      {sorted.map((team) => (
        <TeamBudgetBar
          key={team._id}
          team={team}
          isMyTeam={team._id?.toString() === myTeamId?.toString()}
          config={room?.config}
        />
      ))}
    </div>
  );
}
