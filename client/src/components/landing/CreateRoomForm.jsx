import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../../api/rooms';
import Button from '../common/Button';
import TeamSelector from './TeamSelector';

export default function CreateRoomForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    roomName: '',
    auctioneerName: '',
    startingBudget: 9000,
    maxSquadSize: 25,
    maxOverseasPlayers: 8,
    timerDuration: 30,
  });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const textFields = new Set(['roomName', 'auctioneerName']);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: textFields.has(name) ? value : Number(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeam) {
      alert('Please select a team');
      return;
    }
    setError('');
    setLoading(true);
    try {
      sessionStorage.setItem('teamColor', selectedTeam.hex);
      const res = await createRoom({
        roomName: form.roomName,
        auctioneerName: form.auctioneerName,
        auctioneerTeamName: selectedTeam.name,
        auctioneerTeamColor: selectedTeam.hex,
        config: {
          startingBudget: form.startingBudget,
          maxSquadSize: form.maxSquadSize,
          maxOverseasPlayers: form.maxOverseasPlayers,
          timerDuration: form.timerDuration,
        },
      });
      const { roomCode, auctioneerToken, auctioneerTeamId } = res.data;
      localStorage.setItem(`auctioneer_${roomCode}`, auctioneerToken);
      sessionStorage.setItem('roomCode', roomCode);
      sessionStorage.setItem('isAuctioneer', 'true');
      sessionStorage.setItem('auctioneerToken', auctioneerToken);
      sessionStorage.setItem('ownerName', form.auctioneerName);
      if (auctioneerTeamId) sessionStorage.setItem('teamId', auctioneerTeamId);
      navigate(`/lobby/${roomCode}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Room Name</label>
        <input name="roomName" value={form.roomName} onChange={handleChange} required
          className={inputCls} placeholder="Friends Auction 2026" />
      </div>
      <div>
        <label className={labelCls}>Your Name (Auctioneer)</label>
        <input name="auctioneerName" value={form.auctioneerName} onChange={handleChange} required
          className={inputCls} placeholder="" />
      </div>
      <div>
        <label className={labelCls}>Select Your Team <span className="text-slate-500">(lets you bid too)</span></label>
        <TeamSelector selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} takenTeams={[]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Starting Budget</label>
          <select name="startingBudget" value={form.startingBudget} onChange={handleChange} className={inputCls}>
            <option value={5000}>₹50 Cr</option>
            <option value={9000}>₹90 Cr</option>
            <option value={12000}>₹120 Cr</option>
            <option value={15000}>₹150 Cr</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Timer (seconds)</label>
          <select name="timerDuration" value={form.timerDuration} onChange={handleChange} className={inputCls}>
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={45}>45s</option>
            <option value={60}>60s</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Max Squad Size</label>
          <input type="number" name="maxSquadSize" value={form.maxSquadSize} onChange={handleChange}
            min={10} max={30} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Max Overseas</label>
          <input type="number" name="maxOverseasPlayers" value={form.maxOverseasPlayers} onChange={handleChange}
            min={4} max={10} className={inputCls} />
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading ? 'Creating...' : 'Create Room'}
      </Button>
    </form>
  );
}
