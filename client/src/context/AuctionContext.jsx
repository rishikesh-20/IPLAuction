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
  const [soldCount, setSoldCount] = useState(0);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [auctionHistory, setAuctionHistory] = useState([]);
  const [auctionOrder, setAuctionOrder] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [finalStandings, setFinalStandings] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [auctionPhase, setAuctionPhase] = useState('idle'); // idle | bidding | sold | unsold | completed
  const [lastSoldInfo, setLastSoldInfo] = useState(null);
  const [lastUnsoldInfo, setLastUnsoldInfo] = useState(null);
  // RTM state
  const [rtmPhase, setRtmPhase] = useState(null); // null | 'window' | 'bidding' | 'ended'
  const [rtmInfo, setRtmInfo] = useState(null);

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
      // soldPlayers from server are IDs only — restore the authoritative count
      if (Array.isArray(state.soldPlayers)) setSoldCount(state.soldPlayers.length);
      // Restore RTM state on reconnect
      if (state.rtmState) {
        setRtmPhase(state.rtmState.phase);
        setRtmInfo({
          player: state.rtmState.player,
          soldPrice: state.rtmState.soldPrice,
          soldTo: state.rtmState.soldTo,
          eligibleTeamIds: state.rtmState.eligibleTeamIds || [],
          interestedTeamIds: state.rtmState.interestedTeamIds || [],
          windowSecondsRemaining: state.rtmState.phase === 'window' ? state.rtmState.secondsRemaining : null,
          biddingSecondsRemaining: state.rtmState.phase === 'bidding' ? state.rtmState.secondsRemaining : null,
          currentRtmBid: state.rtmState.currentBid,
          interestedTeams: [],
        });
      }
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
      setSoldCount((prev) => prev + 1);
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
    const onTeamUpdated = ({ teamId, coOwnerName }) => updateTeam(teamId, { coOwnerName });

    // RTM listeners
    const onRtmAvailable = ({ player, soldPrice, soldTo, eligibleTeamIds, windowDuration }) => {
      setRtmPhase('window');
      setRtmInfo({
        player,
        soldPrice,
        soldTo,
        eligibleTeamIds: eligibleTeamIds || [],
        interestedTeamIds: [],
        interestedTeams: [],
        windowSecondsRemaining: windowDuration,
        biddingSecondsRemaining: null,
        currentRtmBid: null,
        nextRtmBidAmount: soldPrice,
      });
    };

    const onRtmWindowTick = ({ secondsRemaining }) => {
      setRtmInfo((prev) => prev ? { ...prev, windowSecondsRemaining: secondsRemaining } : prev);
    };

    const onRtmUpdate = ({ interestedTeamIds, interestedTeam }) => {
      setRtmInfo((prev) => {
        if (!prev) return prev;
        const newTeams = prev.interestedTeams.some((t) => t.teamId?.toString() === interestedTeam?.teamId?.toString())
          ? prev.interestedTeams
          : [...prev.interestedTeams, interestedTeam];
        return { ...prev, interestedTeamIds: interestedTeamIds || prev.interestedTeamIds, interestedTeams: newTeams };
      });
    };

    const onRtmBiddingStarted = ({ interestedTeamIds, interestedTeams, baseBid, biddingDuration }) => {
      setRtmPhase('bidding');
      setRtmInfo((prev) => prev ? {
        ...prev,
        interestedTeamIds: interestedTeamIds || prev.interestedTeamIds,
        interestedTeams: interestedTeams || prev.interestedTeams,
        currentRtmBid: null,
        nextRtmBidAmount: baseBid,
        biddingSecondsRemaining: biddingDuration,
      } : prev);
    };

    const onRtmBidTick = ({ secondsRemaining }) => {
      setRtmInfo((prev) => prev ? { ...prev, biddingSecondsRemaining: secondsRemaining } : prev);
    };

    const onRtmBidUpdate = ({ teamId, teamName, amount, nextBidAmount, secondsRemaining }) => {
      setRtmInfo((prev) => prev ? {
        ...prev,
        currentRtmBid: { amount, teamId, teamName },
        nextRtmBidAmount: nextBidAmount,
        biddingSecondsRemaining: secondsRemaining,
      } : prev);
    };

    const onRtmEnd = ({ outcome, teams, ...rest }) => {
      setRtmPhase('ended');
      if (teams) setAllTeamsFromSold(teams);
      setRtmInfo((prev) => prev ? { ...prev, outcome, ...rest } : prev);
      // Clear RTM UI after showing the result
      setTimeout(() => {
        setRtmPhase(null);
        setRtmInfo(null);
      }, 3000);
    };

    const onRtmRejected = ({ message }) => {
      addToast(message, 'error');
    };

    const onEmergencyRelease = ({ teamId, playerId, refundAmount, updatedTeam, playerQueue }) => {
      updateTeam(teamId, updatedTeam);
      setSoldPlayers((prev) => prev.filter((sp) => sp.player._id !== playerId));
      if (playerQueue) setPlayerQueue(playerQueue);
      const myTeamId = sessionStorage.getItem('teamId');
      if (String(teamId) === myTeamId) {
        addToast(`Emergency Fund used. ₹${refundAmount}L refunded.`, 'success');
      }
    };

    socket.on('room-state', onRoomState);
    socket.on('team-joined', onTeamJoined);
    const onTeamDisconnected = ({ teamId }) => onTeamConnChange({ teamId, isConnected: false });
    const onTeamReconnected  = ({ teamId }) => onTeamConnChange({ teamId, isConnected: true });
    socket.on('team-disconnected', onTeamDisconnected);
    socket.on('team-reconnected',  onTeamReconnected);
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
    socket.on('team-updated', onTeamUpdated);
    socket.on('emergency-release', onEmergencyRelease);
    socket.on('rtm-available', onRtmAvailable);
    socket.on('rtm-window-tick', onRtmWindowTick);
    socket.on('rtm-update', onRtmUpdate);
    socket.on('rtm-bidding-started', onRtmBiddingStarted);
    socket.on('rtm-bid-tick', onRtmBidTick);
    socket.on('rtm-bid-update', onRtmBidUpdate);
    socket.on('rtm-end', onRtmEnd);
    socket.on('rtm-rejected', onRtmRejected);

    return () => {
      socket.off('room-state', onRoomState);
      socket.off('team-joined', onTeamJoined);
      socket.off('team-disconnected', onTeamDisconnected);
      socket.off('team-reconnected',  onTeamReconnected);
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
    socket.off('team-updated', onTeamUpdated);
    socket.off('emergency-release', onEmergencyRelease);
    socket.off('rtm-available', onRtmAvailable);
    socket.off('rtm-window-tick', onRtmWindowTick);
    socket.off('rtm-update', onRtmUpdate);
    socket.off('rtm-bidding-started', onRtmBiddingStarted);
    socket.off('rtm-bid-tick', onRtmBidTick);
    socket.off('rtm-bid-update', onRtmBidUpdate);
    socket.off('rtm-end', onRtmEnd);
    socket.off('rtm-rejected', onRtmRejected);
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

  const emitEmergencyRelease = useCallback((playerId) => {
    if (!room) return;
    const teamId = sessionStorage.getItem('teamId');
    socket.emit('emergency-release', { roomCode: room.roomCode, teamId, playerId });
  }, [room]);

  const emitRtmInterest = useCallback(() => {
    if (!room) return;
    const teamId = sessionStorage.getItem('teamId');
    socket.emit('rtm-interest', { roomCode: room.roomCode, teamId });
  }, [room]);

  const emitRtmBid = useCallback((amount) => {
    if (!room) return;
    const teamId = sessionStorage.getItem('teamId');
    socket.emit('rtm-bid', { roomCode: room.roomCode, teamId, amount });
  }, [room]);

  return (
    <AuctionContext.Provider value={{
      currentPlayer, currentBid, bidHistory, timer,
      playerQueue, soldPlayers, soldCount, unsoldPlayers, auctionHistory,
      auctionOrder, totalPlayers, finalStandings,
      auctionPhase, lastSoldInfo, lastUnsoldInfo,
      toasts, addToast, removeToast,
      emitStartAuction, emitNextPlayer, emitMarkUnsold, emitPlaceBid, emitPause, emitResume, emitEndAuction, emitEmergencyRelease,
      rtmPhase, rtmInfo, emitRtmInterest, emitRtmBid,
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
