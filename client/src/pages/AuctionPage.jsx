import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket/socket';
import { useRoom } from '../context/RoomContext';
import AuctionLayout from '../components/auction/layout/AuctionLayout';
import ToastContainer from '../components/common/Toast';
import Spinner from '../components/common/Spinner';
import { useAuction } from '../context/AuctionContext';
import EmergencyFundButton from '../components/auction/EmergencyFundButton';

export default function AuctionPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { room, initRoom } = useRoom();
  const { auctionPhase, addToast } = useAuction();
  const joinedRef = useRef(false);

  useEffect(() => {
    const storedCode = sessionStorage.getItem('roomCode');
    const isAuctioneer = sessionStorage.getItem('isAuctioneer') === 'true';
    const auctioneerToken = sessionStorage.getItem('auctioneerToken');
    const teamName = sessionStorage.getItem('teamName');
    const teamColor = sessionStorage.getItem('teamColor');
    const ownerName = sessionStorage.getItem('ownerName');
    const teamId = sessionStorage.getItem('teamId');
    const coOwner = sessionStorage.getItem('coOwner') === 'true';

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
        if (coOwner) payload.coOwner = true;
      }
      socket.emit('join-room', payload);
    }

    const onRoomState = (state) => {
      initRoom(state.room, isAuctioneer, auctioneerToken);
      if (state.yourTeamId) sessionStorage.setItem('teamId', state.yourTeamId);
    };
    const onAuctionCompleted = () => setTimeout(() => navigate(`/summary/${roomCode}`), 4000);
    const ERROR_TOASTS = {
      CO_OWNER_EXISTS: 'This team already has a co-owner',
      TEAM_NOT_FOUND:  'Team not found in this room',
      SERVER_ERROR:    'Server error — please try refreshing',
      MISSING_FIELDS:  'Session data missing — please rejoin from home',
    };
    const onError = (err) => {
      if (err.code === 'ROOM_NOT_FOUND' || err.code === 'SESSION_EXPIRED') {
        navigate('/');
      } else if (ERROR_TOASTS[err.code]) {
        addToast(ERROR_TOASTS[err.code], 'error');
      } else {
        addToast(err.message || 'A connection error occurred', 'error');
      }
    };

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
      {auctionPhase !== 'completed' && <EmergencyFundButton />}
    </>
  );
}
