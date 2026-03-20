import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket/socket';
import { useRoom } from '../context/RoomContext';
import AuctionLayout from '../components/auction/layout/AuctionLayout';
import ToastContainer from '../components/common/Toast';
import Spinner from '../components/common/Spinner';
import { useAuction } from '../context/AuctionContext';

export default function AuctionPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { room, initRoom } = useRoom();
  const { auctionPhase } = useAuction();
  const joinedRef = useRef(false);

  useEffect(() => {
    const storedCode = sessionStorage.getItem('roomCode');
    const isAuctioneer = sessionStorage.getItem('isAuctioneer') === 'true';
    const auctioneerToken = sessionStorage.getItem('auctioneerToken');
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
      const payload = { roomCode, isAuctioneer };
      if (isAuctioneer) {
        payload.auctioneerToken = auctioneerToken;
        if (teamId) payload.teamId = teamId;
      } else {
        payload.teamName = teamName;
        payload.ownerName = ownerName;
        if (teamId) payload.teamId = teamId;
        if (teamColor) payload.teamColor = teamColor;
      }
      socket.emit('join-room', payload);
    }

    const onRoomState = (state) => {
      initRoom(state.room, isAuctioneer, auctioneerToken);
      if (state.yourTeamId) sessionStorage.setItem('teamId', state.yourTeamId);
    };
    const onAuctionCompleted = () => setTimeout(() => navigate(`/summary/${roomCode}`), 4000);
    const onError = (err) => { if (err.code === 'ROOM_NOT_FOUND') navigate('/'); };

    socket.on('room-state', onRoomState);
    socket.on('auction-completed', onAuctionCompleted);
    socket.on('error', onError);

    return () => {
      socket.off('room-state', onRoomState);
      socket.off('auction-completed', onAuctionCompleted);
      socket.off('error', onError);
    };
  }, [roomCode]);

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <AuctionLayout />
      <ToastContainer />
    </>
  );
}
