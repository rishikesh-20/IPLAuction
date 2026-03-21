import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import socket from '../socket/socket';
import { useRoom } from './RoomContext';
import { useTeams } from './TeamContext';

const AuctionContext = createContext(null);

export function AuctionProvider({ children }) {
  const { room, isAuctioneer, auctioneerToken, updateRoomStatus } = useRoom();
  const { setAllTeams, addTeam, updateTeam, setAllTeamsFromSold, setMyTeamId } = useTeams();

  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentBid, setCurrentBid] = useState(null); // { amount, teamId, teamName, nextBidAmount }
  const [bidHistory, setBidHistory] = useState([]); // last 5 bids for current player
  const [timer, setTimer] = useState({ secondsRemaining: 0, totalDuration: 30, isExtended: false });
  const [playerQueue, setPlayerQueue] = useState([]);
  const [soldPlayers, setSoldPlayers] = useState([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [auctionHistory, setAuctionHistory] = useState([]);
  const [auctionOrder, setAuctionOrder] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [finalStandings, setFinalStandings] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [auctionPhase, setAuctionPhase] = useState('idle'); // idle | bidding | sold | unsold | completed
  const [lastSoldInfo, setLastSoldInfo] = useState(null);
  const [lastUnsoldInfo, setLastUnsoldInfo] = useState(null);

  const toastIdRef = useRef(0);

  const addToast = useCallback((msg, type = 'error') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Socket event subscriptions
  useEffect(() => {
    const onRoomState = (state) => {
      if (state.teams) setAllTeams(state.teams);
      if (state.yourTeamId) setMyTeamId(state.yourTeamId);
      if (state.currentPlayer) setCurrentPlayer(state.currentPlayer);
      if (state.currentBid) setCurrentBid(state.currentBid);
      if (state.bidHistory) setBidHistory(state.bidHistory);
      if (state.playerQueue) setPlayerQueue(state.playerQueue);
      if (state.unsoldPlayers) setUnsoldPlayers(state.unsoldPlayers);
      if (state.auctionHistory) setAuctionHistory(state.auctionHistory);
      if (state.room?.status) updateRoomStatus(state.room.status);
    };

    const onTeamJoined = ({ team }) => addTeam(team);

    const onTeamConnChange = ({ teamId, isConnected }) => {
      updateTeam(teamId, { isConnected });
    };

    const onAuctionStarted = () => {
      updateRoomStatus('active');
      setAuctionPhase('bidding');
    };

    const onPlayerQueued = ({ currentPlayer, playerQueue, auctionOrder, totalPlayers }) => {
      setCurrentPlayer(currentPlayer);
      setPlayerQueue(playerQueue);
      setAuctionOrder(auctionOrder);
      setTotalPlayers(totalPlayers);
      setCurrentBid({ amount: currentPlayer.basePrice, teamId: null, teamName: null, nextBidAmount: null });
      setBidHistory([]);
      setAuctionPhase('bidding');
      setLastSoldInfo(null);
      setLastUnsoldInfo(null);
    };

    const onBidUpdate = ({ teamId, teamName, amount, nextBidAmount, timerReset, newTimerValue }) => {
      setCurrentBid({ amount, teamId, teamName, nextBidAmount });
      setBidHistory((prev) => {
        const entry = { teamId, teamName, amount, timestamp: new Date() };
        return [entry, ...prev].slice(0, 5);
      });
    };

    const onBidRejected = ({ reason, message }) => {
      addToast(message, 'error');
    };

    const onTimerTick = (tick) => {
      setTimer(tick);
    };

    const onTimerExtended = ({ secondsRemaining, extensionAdded }) => {
      setTimer((prev) => ({ ...prev, secondsRemaining, isExtended: true }));
    };

    const onPlayerSold = ({ player, soldTo, soldPrice, teams, auctionOrder }) => {
      setAuctionPhase('sold');
      setLastSoldInfo({ player, soldTo, soldPrice });
      setAllTeamsFromSold(teams);
      setSoldPlayers((prev) => [...prev, { player, soldTo, soldPrice }]);
      setAuctionHistory((prev) => [{ player, soldTo, soldPrice, outcome: 'sold', auctionOrder }, ...prev]);
    };

    const onPlayerUnsold = ({ player, unsoldPlayers }) => {
      setAuctionPhase('unsold');
      setLastUnsoldInfo({ player });
      setUnsoldPlayers(unsoldPlayers);
      setAuctionHistory((prev) => [{ player, outcome: 'unsold', auctionOrder: prev.length + 1 }, ...prev]);
    };

    const onAuctionCompleted = ({ finalStandings, unsoldPlayers, totalAuctioned, totalUnsold }) => {
      setFinalStandings(finalStandings);
      setUnsoldPlayers(unsoldPlayers);
      setAuctionPhase('completed');
      updateRoomStatus('completed');
    };

    const onAuctionPaused = () => updateRoomStatus('paused');
    const onAuctionResumed = () => updateRoomStatus('active');
    const onAuctionNotice = ({ message }) => addToast(message, 'info');

    socket.on('room-state', onRoomState);
    socket.on('team-joined', onTeamJoined);
    socket.on('team-disconnected', ({ teamId }) => onTeamConnChange({ teamId, isConnected: false }));
    socket.on('team-reconnected', ({ teamId }) => onTeamConnChange({ teamId, isConnected: true }));
    socket.on('auction-started', onAuctionStarted);
    socket.on('player-queued', onPlayerQueued);
    socket.on('bid-update', onBidUpdate);
    socket.on('bid-rejected', onBidRejected);
    socket.on('timer-tick', onTimerTick);
    socket.on('timer-extended', onTimerExtended);
    socket.on('player-sold', onPlayerSold);
    socket.on('player-unsold', onPlayerUnsold);
    socket.on('auction-completed', onAuctionCompleted);
    socket.on('auction-paused', onAuctionPaused);
    socket.on('auction-resumed', onAuctionResumed);
    socket.on('auction-notice', onAuctionNotice);

    return () => {
      socket.off('room-state', onRoomState);
      socket.off('team-joined', onTeamJoined);
      socket.off('team-disconnected');
      socket.off('team-reconnected');
      socket.off('auction-started', onAuctionStarted);
      socket.off('player-queued', onPlayerQueued);
      socket.off('bid-update', onBidUpdate);
      socket.off('bid-rejected', onBidRejected);
      socket.off('timer-tick', onTimerTick);
      socket.off('timer-extended', onTimerExtended);
      socket.off('player-sold', onPlayerSold);
      socket.off('player-unsold', onPlayerUnsold);
      socket.off('auction-completed', onAuctionCompleted);
      socket.off('auction-paused', onAuctionPaused);
      socket.off('auction-resumed', onAuctionResumed);
      socket.off('auction-notice', onAuctionNotice);
    };
  }, []);

  const emitStartAuction = useCallback(() => {
    if (!room || !auctioneerToken) return;
    socket.emit('start-auction', { roomCode: room.roomCode, auctioneerToken });
  }, [room, auctioneerToken]);

  const emitNextPlayer = useCallback(() => {
    if (!room || !auctioneerToken) return;
    socket.emit('next-player', { roomCode: room.roomCode, auctioneerToken });
  }, [room, auctioneerToken]);

  const emitMarkUnsold = useCallback(() => {
    if (!room || !auctioneerToken) return;
    socket.emit('mark-unsold', { roomCode: room.roomCode, auctioneerToken });
  }, [room, auctioneerToken]);

  const emitPlaceBid = useCallback((teamId, amount) => {
    if (!room) return;
    socket.emit('place-bid', { roomCode: room.roomCode, teamId, amount });
  }, [room]);

  const emitPause = useCallback(() => {
    if (!room || !auctioneerToken) return;
    socket.emit('pause-auction', { roomCode: room.roomCode, auctioneerToken });
  }, [room, auctioneerToken]);

  const emitResume = useCallback(() => {
    if (!room || !auctioneerToken) return;
    socket.emit('resume-auction', { roomCode: room.roomCode, auctioneerToken });
  }, [room, auctioneerToken]);

  const emitEndAuction = useCallback(() => {
    if (!room || !auctioneerToken) return;
    socket.emit('end-auction', { roomCode: room.roomCode, auctioneerToken });
  }, [room, auctioneerToken]);

  return (
    <AuctionContext.Provider value={{
      currentPlayer, currentBid, bidHistory, timer,
      playerQueue, soldPlayers, unsoldPlayers, auctionHistory,
      auctionOrder, totalPlayers, finalStandings,
      auctionPhase, lastSoldInfo, lastUnsoldInfo,
      toasts, addToast, removeToast,
      emitStartAuction, emitNextPlayer, emitMarkUnsold, emitPlaceBid, emitPause, emitResume, emitEndAuction,
    }}>
      {children}
    </AuctionContext.Provider>
  );
}

export function useAuction() {
  const ctx = useContext(AuctionContext);
  if (!ctx) throw new Error('useAuction must be used within AuctionProvider');
  return ctx;
}
