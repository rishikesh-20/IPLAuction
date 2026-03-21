import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoom, getRoomTeams } from '../../api/rooms';
import Button from '../common/Button';
import TeamSelector from './TeamSelector';

export default function JoinRoomForm() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [takenTeams, setTakenTeams] = useState([]);
  const [roomFound, setRoomFound] = useState(false);
  const [coOwnerMode, setCoOwnerMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const inputCls = 'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

  const handleFindRoom = async (e) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    setError('');
    setChecking(true);
    setRoomFound(false);
    setSelectedTeam(null);
    setCoOwnerMode(false);
    try {
      const res = await getRoom(code);
      const room = res.data.data;
      if (room.status !== 'waiting') {
        setError('This auction has already started');
        return;
      }
      // Fetch existing teams to mark as taken
      const teamsRes = await getRoomTeams(code);
      const existingNames = (teamsRes.data.data || []).map((t) => t.teamName);
      setTakenTeams(existingNames);
      setRoomFound(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found');
    } finally {
      setChecking(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!selectedTeam) {
      alert('Please select a team');
      return;
    }
    if (!ownerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (coOwnerMode && !takenTeams.includes(selectedTeam.name)) {
      alert('In co-owner mode you must select an existing (taken) team');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const code = roomCode.trim().toUpperCase();
      // Re-validate room is still waiting
      const res = await getRoom(code);
      if (res.data.data.status !== 'waiting') {
        setError('This auction has already started');
        return;
      }
      sessionStorage.setItem('roomCode', code);
      sessionStorage.setItem('isAuctioneer', 'false');
      sessionStorage.setItem('teamName', selectedTeam.name);
      sessionStorage.setItem('teamColor', selectedTeam.hex);
      sessionStorage.setItem('ownerName', ownerName.trim());
      if (coOwnerMode) {
        sessionStorage.setItem('coOwner', 'true');
      } else {
        sessionStorage.removeItem('coOwner');
      }
      navigate(`/lobby/${code}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Room code */}
      <form onSubmit={handleFindRoom} className="space-y-3">
        <div>
          <label className={labelCls}>Room Code</label>
          <input
            value={roomCode}
            onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setRoomFound(false); setSelectedTeam(null); }}
            required
            maxLength={6}
            className={`${inputCls} uppercase tracking-widest text-lg font-bold`}
            placeholder="ABC123"
          />
        </div>
        <Button type="submit" disabled={checking || !roomCode.trim()} variant="secondary" size="sm" className="w-full">
          {checking ? 'Checking...' : roomFound ? 'Room Found ✓' : 'Find Room'}
        </Button>
      </form>

      {/* Step 2: Pick team + name */}
      {roomFound && (
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className={labelCls}>Select Your Team</label>
            <TeamSelector
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              takenTeams={takenTeams}
              coOwnerMode={coOwnerMode}
            />
            {takenTeams.length > 0 && (
              <label className="flex items-center gap-2 mt-2 text-sm text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={coOwnerMode}
                  onChange={(e) => { setCoOwnerMode(e.target.checked); setSelectedTeam(null); }}
                  className="accent-teal-400"
                />
                Join as co-owner of an existing team
              </label>
            )}
          </div>
          <div>
            <label className={labelCls}>Your Name</label>
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
              className={inputCls}
              placeholder="Rishi"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} variant="secondary" size="lg" className="w-full">
            {loading ? 'Joining...' : 'Join Room'}
          </Button>
        </form>
      )}

      {error && !roomFound && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
