import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoom, getRoomTeams } from '../../api/rooms';
import Button from '../common/Button';
import TeamSelector from './TeamSelector';

export default function JoinRoomForm({ prefilledRoom = '', prefilledError = '' }) {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState(prefilledRoom);
  const [ownerName, setOwnerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [takenTeams, setTakenTeams] = useState([]);
  const [roomFound, setRoomFound] = useState(false);
  const [roomStatus, setRoomStatus] = useState('waiting');
  const [coOwnerMode, setCoOwnerMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [nameMismatchError] = useState(prefilledError);

  const inputCls = 'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

  // Auto-lookup when a room code is pre-filled (e.g. redirected from lobby/auction)
  useEffect(() => {
    if (prefilledRoom) {
      lookupRoom(prefilledRoom);
    }
  }, []);

  const lookupRoom = async (code) => {
    setError('');
    setChecking(true);
    setRoomFound(false);
    setSelectedTeam(null);
    setCoOwnerMode(false);
    try {
      const res = await getRoom(code);
      const room = res.data.data;
      const teamsRes = await getRoomTeams(code);
      const existingNames = (teamsRes.data.data || []).map((t) => t.teamName);
      setTakenTeams(existingNames);
      setRoomStatus(room.status);
      setRoomFound(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found');
    } finally {
      setChecking(false);
    }
  };

  const handleFindRoom = async (e) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    await lookupRoom(code);
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
      const res = await getRoom(code);
      const currentStatus = res.data.data.status;

      // Block only if auction started AND the team doesn't already exist (truly new join)
      if (currentStatus !== 'waiting' && !takenTeams.includes(selectedTeam.name)) {
        setError('This auction has already started and that team slot is not taken. You can only rejoin an existing team.');
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

      const dest = currentStatus === 'active' ? 'auction'
                 : currentStatus === 'completed' ? 'summary'
                 : 'lobby';
      navigate(`/${dest}/${code}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found');
    } finally {
      setLoading(false);
    }
  };

  const isRejoinMode = roomStatus !== 'waiting';

  return (
    <div className="space-y-4">
      {nameMismatchError && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {nameMismatchError}
        </p>
      )}
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
          {isRejoinMode && (
            <p className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              Auction is in progress — select your team and enter your name to rejoin.
            </p>
          )}
          <div>
            <label className={labelCls}>Select Your Team</label>
            <TeamSelector
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              takenTeams={takenTeams}
              coOwnerMode={coOwnerMode}
              rejoinMode={isRejoinMode}
            />
            {takenTeams.length > 0 && !isRejoinMode && (
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
              placeholder=""
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} variant="secondary" size="lg" className="w-full">
            {loading ? 'Joining...' : isRejoinMode ? 'Rejoin Room' : 'Join Room'}
          </Button>
        </form>
      )}

      {error && !roomFound && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
