import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket/socket';
import { useRoom } from '../context/RoomContext';
import { useTeams } from '../context/TeamContext';
import { useAuction } from '../context/AuctionContext';
import TeamCard from '../components/lobby/TeamCard';
import Button from '../components/common/Button';
import PlayersModal from '../components/common/PlayersModal';
import Spinner from '../components/common/Spinner';
import { formatLakhs } from '../utils/formatCurrency';

export default function LobbyPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { room, isAuctioneer, initRoom, updateRoomStatus } = useRoom();
  const { teams } = useTeams();
  const { emitStartAuction } = useAuction();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    const storedCode = sessionStorage.getItem('roomCode');
    const storedIsAuctioneer = sessionStorage.getItem('isAuctioneer') === 'true';
    const storedAuctioneerToken = sessionStorage.getItem('auctioneerToken');
    const teamName = sessionStorage.getItem('teamName');
    const teamColor = sessionStorage.getItem('teamColor');
    const ownerName = sessionStorage.getItem('ownerName');
    const teamId = sessionStorage.getItem('teamId');

    if (!storedCode || storedCode !== roomCode) {
      navigate('/');
      return;
    }

    if (!socket.connected) socket.connect();

    // Guard: only emit join-room once (StrictMode runs effects twice in dev)
    if (!joinedRef.current) {
      joinedRef.current = true;
      const payload = { roomCode, isAuctioneer: storedIsAuctioneer };
      if (storedIsAuctioneer) {
        payload.auctioneerToken = storedAuctioneerToken;
        if (teamId) payload.teamId = teamId;
      } else {
        payload.teamName = teamName;
        payload.ownerName = ownerName;
        if (teamId) payload.teamId = teamId;
        if (teamColor) payload.teamColor = teamColor;
      }
      socket.emit('join-room', payload);
    }

    // Always re-attach listeners (cleanup removes them on StrictMode remount)
    // Use named handlers so cleanup only removes these specific listeners,
    // not the ones registered by AuctionContext.
    const onRoomState = (state) => {
      initRoom(state.room, storedIsAuctioneer, storedAuctioneerToken);
      if (state.yourTeamId) sessionStorage.setItem('teamId', state.yourTeamId);
      setLoading(false);
    };

    const onAuctionStarted = () => navigate(`/auction/${roomCode}`);

    const onError = (err) => {
      console.error('Socket error:', err);
      if (err.code === 'ROOM_NOT_FOUND' || err.code === 'AUCTION_STARTED') {
        navigate('/');
      }
    };

    socket.on('room-state', onRoomState);
    socket.on('auction-started', onAuctionStarted);
    socket.on('error', onError);

    return () => {
      socket.off('room-state', onRoomState);
      socket.off('auction-started', onAuctionStarted);
      socket.off('error', onError);
    };
  }, [roomCode]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    emitStartAuction();
    navigate(`/auction/${roomCode}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-400">Joining room {roomCode}…</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{room?.roomName || roomCode}</h1>
            <p className="text-slate-400 text-sm">Waiting for auction to start…</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPlayers(true)}
              className="text-sm bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg px-3 py-2 text-slate-300 transition-colors"
            >
              📋 View Players
            </button>
            <button onClick={copyCode}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 transition-all">
              <span className="font-mono font-bold text-amber-400 tracking-widest text-lg">{roomCode}</span>
              <span className="text-slate-400 text-xs">{copied ? '✓ Copied' : '📋'}</span>
            </button>
          </div>
        </div>

        {/* Room config summary */}
        {room?.config && (
          <div className="card p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Starting Budget', value: formatLakhs(room.config.startingBudget) },
              { label: 'Timer', value: `${room.config.timerDuration}s` },
              { label: 'Max Squad', value: room.config.maxSquadSize },
              { label: 'Max Overseas', value: room.config.maxOverseasPlayers },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-amber-400 font-bold">{value}</div>
                <div className="text-slate-500 text-xs">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Teams */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Teams ({teams.length})
          </h2>
          {teams.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">
              No teams yet. Share the room code!
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((t) => <TeamCard key={t._id} team={t} />)}
            </div>
          )}
        </div>

        {/* Action */}
        {isAuctioneer ? (
          <div className="text-center">
            <Button onClick={handleStart} size="xl" disabled={teams.length < 1} className="w-full">
              🚀 Start Auction
            </Button>
            {teams.length < 1 && (
              <p className="text-slate-500 text-xs mt-2">Wait for at least 1 team to join</p>
            )}
          </div>
        ) : (
          <div className="card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-slate-300 text-sm">Waiting for auctioneer to start…</span>
            </div>
          </div>
        )}
      </div>
    </div>

    {showPlayers && <PlayersModal onClose={() => setShowPlayers(false)} />}
    </>
  );
}
