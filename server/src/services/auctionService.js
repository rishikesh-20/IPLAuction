const crypto = require('crypto');
const { Mutex } = require('async-mutex');
const Room = require('../models/Room');
const Team = require('../models/Team');
const Player = require('../models/Player');
const AuctionHistory = require('../models/AuctionHistory');
const { getNextBidAmount, TIMER_DEFAULTS, RTM_DEFAULTS, IPL_TEAM_ABBR, expandTeamHistory } = require('../config/constants');
const timerManager = require('../socket/timerManager');

// Per-room mutexes to serialize bid handling
const mutexes = new Map();
function getMutex(roomCode) {
  if (!mutexes.has(roomCode)) mutexes.set(roomCode, new Mutex());
  return mutexes.get(roomCode);
}

// In-memory current auction state per room
const auctionStates = new Map();
// shape: { currentPlayer, currentBid: { amount, teamId, teamName }, bids: [], auctionOrder, startedAt }

// In-memory RTM state per room
const rtmStates = new Map();
// shape: { player, originalWinnerId, originalWinnerName, soldPrice, auctionOrder, bids, startedAt,
//          phase: 'window'|'bidding', eligibleTeamIds: [ObjectId], interestedTeamIds: [ObjectId],
//          currentBid: { amount, teamId, teamName }|null, rtmBids: [], interval, secondsRemaining }

function getAuctionState(roomCode) {
  return auctionStates.get(roomCode);
}

function verifyAuctioneerToken(rawToken, hashedToken) {
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
  return hashed === hashedToken;
}

async function populateTeamSnapshots(roomId) {
  const teams = await Team.find({ roomId }).populate('squad.playerId');
  return teams.map((t) => ({
    _id: t._id,
    teamName: t.teamName,
    ownerName: t.ownerName,
    color: t.color,
    budget: t.budget,
    squad: t.squad,
    overseasCount: t.overseasCount,
    isConnected: t.isConnected,
    isEliminated: t.isEliminated,
    emergencyUsed: t.emergencyUsed,
    rtmRemaining: t.rtmRemaining,
    coOwnerName: t.coOwnerName || null,
  }));
}

async function loadNextPlayer(room) {
  while (room.currentPlayerIndex < room.playerPool.length) {
    const playerId = room.playerPool[room.currentPlayerIndex];
    // Skip already sold or unsold
    const isSold = room.soldPlayerIds.some((id) => id.equals(playerId));
    const isUnsold = room.unsoldPlayerIds.some((id) => id.equals(playerId));
    if (!isSold && !isUnsold) {
      return await Player.findById(playerId);
    }
    room.currentPlayerIndex++;
  }
  return null; // all players exhausted
}

async function startAuction(io, room) {
  room.status = 'active';
  room.currentPlayerIndex = 0;
  await room.save();
  await advanceToNextPlayer(io, room);
}

async function endAuction(io, room) {
  timerManager.destroyTimer(room.roomCode);
  auctionStates.delete(room.roomCode);
  mutexes.delete(room.roomCode);
  room.status = 'completed';
  await room.save();
  const teams = await populateTeamSnapshots(room._id);
  const unsoldPlayers = await Player.find({ _id: { $in: room.unsoldPlayerIds } });
  io.to(room.roomCode).emit('auction-completed', {
    finalStandings: teams,
    unsoldPlayers,
    totalAuctioned: room.soldPlayerIds.length,
    totalUnsold: room.unsoldPlayerIds.length,
  });
}

async function advanceToNextPlayer(io, room) {
  const player = await loadNextPlayer(room);

  if (!player) {
    // All players exhausted — end auction
    await endAuction(io, room);
    return;
  }

  // Auto-end if ALL teams have less than 30L remaining
  const allTeams = await Team.find({ roomId: room._id });
  const allInsufficientFunds = allTeams.length > 0 && allTeams.every(t => t.budget.remaining < 30);
  if (allInsufficientFunds) {
    io.to(room.roomCode).emit('auction-notice', {
      message: 'All teams have insufficient funds (< ₹30L). Auction ending automatically.',
    });
    await endAuction(io, room);
    return;
  }

  const auctionOrder = (room.soldPlayerIds.length + room.unsoldPlayerIds.length) + 1;

  // Set auction state
  auctionStates.set(room.roomCode, {
    currentPlayer: player,
    currentBid: { amount: player.basePrice - getBidTierDecrement(player.basePrice), teamId: null, teamName: null },
    bids: [],
    auctionOrder,
    startedAt: Date.now(),
  });

  // Build queue preview (next 5)
  const queuePlayers = [];
  let lookahead = room.currentPlayerIndex + 1;
  while (queuePlayers.length < 5 && lookahead < room.playerPool.length) {
    const pid = room.playerPool[lookahead];
    const alreadyDone = room.soldPlayerIds.some((id) => id.equals(pid)) || room.unsoldPlayerIds.some((id) => id.equals(pid));
    if (!alreadyDone) {
      const p = await Player.findById(pid).select('name role nationality basePrice category');
      if (p) queuePlayers.push(p);
    }
    lookahead++;
  }

  io.to(room.roomCode).emit('player-queued', {
    currentPlayer: player,
    playerQueue: queuePlayers,
    auctionOrder,
    totalPlayers: room.playerPool.length,
    remainingCount: room.playerPool.length - room.currentPlayerIndex - 1,
  });

  // Start timer
  timerManager.createTimer(room.roomCode, {
    duration: room.config.timerDuration,
    extension: room.config.timerExtension,
    extensionThreshold: room.config.extensionThreshold,
    onTick: (tick) => {
      io.to(room.roomCode).emit('timer-tick', tick);
    },
    onExpire: async ({ hasBid }) => {
      const latestRoom = await Room.findById(room._id);
      if (!latestRoom || latestRoom.status !== 'active') return;
      if (hasBid) {
        await finalizeSale(io, latestRoom);
      } else {
        await finalizeUnsold(io, latestRoom);
      }
    },
  });
}

// Bid tier adjustment to set initial "currentBid" so first bid = basePrice
function getBidTierDecrement(basePrice) {
  const { getBidIncrement } = require('../config/constants');
  return getBidIncrement(basePrice - 1) || 5;
}

async function placeBid(io, socket, { roomCode, teamId, amount }) {
  const mutex = getMutex(roomCode);
  const release = await mutex.acquire();
  try {
    const state = auctionStates.get(roomCode);
    if (!state) {
      socket.emit('bid-rejected', { reason: 'NO_ACTIVE_PLAYER', message: 'No player is currently being auctioned' });
      return;
    }

    const room = await Room.findOne({ roomCode });
    if (!room || room.status !== 'active') {
      socket.emit('bid-rejected', { reason: 'AUCTION_NOT_ACTIVE', message: 'Auction is not active' });
      return;
    }

    const team = await Team.findById(teamId);
    if (!team || !team.roomId.equals(room._id)) {
      socket.emit('bid-rejected', { reason: 'TEAM_NOT_FOUND', message: 'Team not found in this room' });
      return;
    }

    // Calculate minimum next bid.
    // If nobody has bid yet (teamId is null), the floor is the base price itself.
    // Once someone has bid, the floor is the next tier increment above the current bid.
    const hasBid = state.currentBid.teamId != null;
    const minBidAmount = hasBid
      ? getNextBidAmount(state.currentBid.amount)
      : state.currentBid.amount;

    if (!Number.isInteger(amount) || amount < minBidAmount || amount % 5 !== 0) {
      socket.emit('bid-rejected', { reason: 'INVALID_BID', message: `Bid must be at least ${minBidAmount}L and a multiple of 5L` });
      return;
    }

    if (team.budget.remaining < amount) {
      socket.emit('bid-rejected', { reason: 'INSUFFICIENT_FUNDS', message: `Remaining budget (${team.budget.remaining}L) is less than bid (${amount}L)` });
      return;
    }

    if (team.squad.length >= room.config.maxSquadSize) {
      socket.emit('bid-rejected', { reason: 'SQUAD_FULL', message: `Squad is full (${room.config.maxSquadSize} players max)` });
      return;
    }

    if (state.currentPlayer.nationality === 'Overseas' && team.overseasCount >= room.config.maxOverseasPlayers) {
      socket.emit('bid-rejected', { reason: 'OVERSEAS_LIMIT', message: `Overseas player limit reached (${room.config.maxOverseasPlayers})` });
      return;
    }

    // Accept bid
    const bidEntry = { teamId: team._id, teamName: team.teamName, amount, timestamp: new Date() };
    state.currentBid = { amount, teamId: team._id, teamName: team.teamName };
    state.bids.push(bidEntry);

    const nextBidAmount = getNextBidAmount(amount);

    // Check for timer extension
    const newTimerValue = timerManager.onBid(roomCode);

    if (newTimerValue !== null) {
      io.to(roomCode).emit('timer-extended', { secondsRemaining: newTimerValue, extensionAdded: room.config.timerExtension });
    }

    io.to(roomCode).emit('bid-update', {
      teamId: team._id,
      teamName: team.teamName,
      amount,
      nextBidAmount,
      timestamp: bidEntry.timestamp,
      timerReset: newTimerValue !== null,
      newTimerValue,
    });
  } finally {
    release();
  }
}

async function finalizeSale(io, room) {
  const state = auctionStates.get(room.roomCode);
  if (!state) return;

  timerManager.destroyTimer(room.roomCode);

  const { currentPlayer, currentBid, bids, auctionOrder, startedAt } = state;
  const soldPrice = currentBid.amount;
  const winningTeamId = currentBid.teamId;

  // Update team
  const team = await Team.findById(winningTeamId);
  team.budget.spent += soldPrice;
  team.budget.remaining = team.budget.total - team.budget.spent;
  team.squad.push({ playerId: currentPlayer._id, soldPrice });
  if (currentPlayer.nationality === 'Overseas') team.overseasCount++;
  await team.save();

  // Update room
  room.soldPlayerIds.push(currentPlayer._id);
  room.currentPlayerIndex++;
  await room.save();

  const teams = await populateTeamSnapshots(room._id);

  io.to(room.roomCode).emit('player-sold', {
    player: currentPlayer,
    soldTo: { teamId: winningTeamId, teamName: currentBid.teamName },
    soldPrice,
    teams,
    auctionOrder,
  });

  auctionStates.delete(room.roomCode);

  // Check for RTM eligibility — RTM functions handle advance/history write
  await tryStartRTM(io, room, {
    player: currentPlayer,
    soldPrice,
    winningTeamId,
    winningTeamName: currentBid.teamName,
    bids,
    auctionOrder,
    startedAt,
  });
}

async function finalizeUnsold(io, room) {
  const state = auctionStates.get(room.roomCode);
  if (!state) return;

  timerManager.destroyTimer(room.roomCode);

  const { currentPlayer, auctionOrder, startedAt, bids } = state;

  room.unsoldPlayerIds.push(currentPlayer._id);
  room.currentPlayerIndex++;
  await room.save();

  await AuctionHistory.create({
    roomId: room._id,
    playerId: currentPlayer._id,
    outcome: 'unsold',
    soldTo: null,
    soldPrice: 0,
    basePrice: currentPlayer.basePrice,
    bids,
    auctionDuration: Math.round((Date.now() - startedAt) / 1000),
    auctionOrder,
  });

  const unsoldPlayers = await Player.find({ _id: { $in: room.unsoldPlayerIds } });

  io.to(room.roomCode).emit('player-unsold', {
    player: currentPlayer,
    unsoldPlayers,
    auctionOrder,
  });

  auctionStates.delete(room.roomCode);

  setTimeout(async () => {
    const latestRoom = await Room.findById(room._id);
    if (latestRoom && latestRoom.status === 'active') {
      await advanceToNextPlayer(io, latestRoom);
    }
  }, TIMER_DEFAULTS.postSaleDelay);
}

async function markUnsold(io, room) {
  timerManager.destroyTimer(room.roomCode);
  await finalizeUnsold(io, room);
}

async function emergencyRelease(io, socket, { roomCode, teamId, playerId }) {
  const mutex = getMutex(roomCode);
  const release = await mutex.acquire();
  try {
    const room = await Room.findOne({ roomCode });
    if (!room || room.status !== 'active') {
      socket.emit('emergency-release-rejected', { reason: 'AUCTION_NOT_ACTIVE', message: 'Auction is not active' });
      return;
    }

    const team = await Team.findById(teamId);
    if (!team || !team.roomId.equals(room._id)) {
      socket.emit('emergency-release-rejected', { reason: 'TEAM_NOT_FOUND', message: 'Team not found in this room' });
      return;
    }

    if (team.emergencyUsed) {
      socket.emit('emergency-release-rejected', { reason: 'ALREADY_USED', message: 'Emergency Fund has already been used' });
      return;
    }

    if (team.squad.length === 0) {
      socket.emit('emergency-release-rejected', { reason: 'EMPTY_SQUAD', message: 'Squad is empty' });
      return;
    }

    const squadEntry = team.squad.find((e) => e.playerId.equals(playerId));
    if (!squadEntry) {
      socket.emit('emergency-release-rejected', { reason: 'PLAYER_NOT_IN_SQUAD', message: 'Player not found in squad' });
      return;
    }

    const { soldPrice } = squadEntry;

    // Fetch player to check nationality
    const player = await Player.findById(playerId);

    // Update team
    team.squad = team.squad.filter((e) => !e.playerId.equals(playerId));
    if (player && player.nationality === 'Overseas') team.overseasCount = Math.max(0, team.overseasCount - 1);
    team.budget.spent -= soldPrice;
    team.emergencyUsed = true;
    await team.save();

    // Update room: remove from soldPlayerIds, push to end of playerPool
    room.soldPlayerIds = room.soldPlayerIds.filter((id) => !id.equals(playerId));
    room.playerPool.push(playerId);
    await room.save();

    // Build updated team snapshot
    const populatedTeam = await Team.findById(team._id).populate('squad.playerId');
    const updatedTeam = {
      _id: populatedTeam._id,
      teamName: populatedTeam.teamName,
      ownerName: populatedTeam.ownerName,
      color: populatedTeam.color,
      budget: populatedTeam.budget,
      squad: populatedTeam.squad,
      overseasCount: populatedTeam.overseasCount,
      isConnected: populatedTeam.isConnected,
      isEliminated: populatedTeam.isEliminated,
      emergencyUsed: populatedTeam.emergencyUsed,
      coOwnerName: populatedTeam.coOwnerName || null,
    };

    // Build updated queue preview (next 5 after current index)
    const queuePlayers = [];
    let lookahead = room.currentPlayerIndex + 1;
    while (queuePlayers.length < 5 && lookahead < room.playerPool.length) {
      const pid = room.playerPool[lookahead];
      const alreadyDone = room.soldPlayerIds.some((id) => id.equals(pid)) || room.unsoldPlayerIds.some((id) => id.equals(pid));
      if (!alreadyDone) {
        const p = await Player.findById(pid).select('name role nationality basePrice category');
        if (p) queuePlayers.push(p);
      }
      lookahead++;
    }

    io.to(roomCode).emit('emergency-release', {
      teamId: team._id,
      playerId,
      refundAmount: soldPrice,
      updatedTeam,
      playerQueue: queuePlayers,
    });
  } finally {
    release();
  }
}

// ─── RTM (Right to Match) ────────────────────────────────────────────────────

function getRTMState(roomCode) {
  return rtmStates.get(roomCode) || null;
}

async function tryStartRTM(io, room, { player, soldPrice, winningTeamId, winningTeamName, bids, auctionOrder, startedAt }) {
  const allTeams = await Team.find({ roomId: room._id });

  // Expand pipe-separated history entries (e.g. 'MI|KKR') and resolve full names → abbrevs
  const playerTeamAbbrs = expandTeamHistory(player.iplTeamHistory);

  const eligibleTeams = allTeams.filter((t) => {
    if (t._id.equals(winningTeamId)) return false;
    // Compare team's abbreviation against expanded player history
    const teamAbbr = IPL_TEAM_ABBR[t.teamName] || t.teamName;
    if (!playerTeamAbbrs.includes(teamAbbr)) return false;
    if (t.rtmRemaining <= 0) return false;
    if (t.budget.remaining < soldPrice) return false;
    if (t.squad.length >= room.config.maxSquadSize) return false;
    if (player.nationality === 'Overseas' && t.overseasCount >= room.config.maxOverseasPlayers) return false;
    return true;
  });

  if (eligibleTeams.length === 0) {
    // No RTM possible — write history and advance normally
    await AuctionHistory.create({
      roomId: room._id,
      playerId: player._id,
      outcome: 'sold',
      soldTo: winningTeamId,
      soldPrice,
      basePrice: player.basePrice,
      bids,
      auctionDuration: Math.round((Date.now() - startedAt) / 1000),
      auctionOrder,
    });
    setTimeout(async () => {
      const latestRoom = await Room.findById(room._id);
      if (latestRoom && latestRoom.status === 'active') await advanceToNextPlayer(io, latestRoom);
    }, TIMER_DEFAULTS.postSaleDelay);
    return;
  }

  // RTM window opens
  const state = {
    player,
    originalWinnerId: winningTeamId,
    originalWinnerName: winningTeamName,
    soldPrice,
    auctionOrder,
    bids,
    startedAt,
    phase: 'window',
    eligibleTeamIds: eligibleTeams.map((t) => t._id),
    interestedTeamIds: [],
    currentBid: null,
    rtmBids: [],
    interval: null,
    secondsRemaining: RTM_DEFAULTS.windowDuration,
  };
  rtmStates.set(room.roomCode, state);

  io.to(room.roomCode).emit('rtm-available', {
    player,
    soldPrice,
    soldTo: { teamId: winningTeamId, teamName: winningTeamName },
    eligibleTeamIds: eligibleTeams.map((t) => t._id.toString()),
    windowDuration: RTM_DEFAULTS.windowDuration,
  });

  // Start window countdown
  state.interval = setInterval(async () => {
    state.secondsRemaining -= 1;
    io.to(room.roomCode).emit('rtm-window-tick', { secondsRemaining: state.secondsRemaining });
    if (state.secondsRemaining <= 0) {
      clearInterval(state.interval);
      state.interval = null;
      await _resolveRTMWindow(io, room);
    }
  }, 1000);
}

async function _resolveRTMWindow(io, room) {
  const state = rtmStates.get(room.roomCode);
  if (!state || state.phase !== 'window') return;

  if (state.interestedTeamIds.length === 0) {
    await endRTMNoWinner(io, room);
    return;
  }

  if (state.interestedTeamIds.length === 1) {
    await finalizeRTM(io, room, { winnerId: state.interestedTeamIds[0], finalPrice: state.soldPrice });
    return;
  }

  // 2+ interested — start bidding war
  state.phase = 'bidding';
  state.secondsRemaining = RTM_DEFAULTS.biddingRoundDuration;

  const interestedTeams = await Team.find({ _id: { $in: state.interestedTeamIds } }).select('teamName color');

  io.to(room.roomCode).emit('rtm-bidding-started', {
    interestedTeamIds: state.interestedTeamIds.map(String),
    interestedTeams: interestedTeams.map((t) => ({ teamId: t._id, teamName: t.teamName, color: t.color })),
    baseBid: state.soldPrice,
    biddingDuration: RTM_DEFAULTS.biddingRoundDuration,
  });

  _startRTMBiddingInterval(io, room);
}

function _startRTMBiddingInterval(io, room) {
  const state = rtmStates.get(room.roomCode);
  if (!state) return;
  if (state.interval) clearInterval(state.interval);
  state.secondsRemaining = RTM_DEFAULTS.biddingRoundDuration;

  state.interval = setInterval(async () => {
    state.secondsRemaining -= 1;
    io.to(room.roomCode).emit('rtm-bid-tick', { secondsRemaining: state.secondsRemaining });
    if (state.secondsRemaining <= 0) {
      clearInterval(state.interval);
      state.interval = null;
      if (state.currentBid && state.currentBid.teamId) {
        await finalizeRTM(io, room, { winnerId: state.currentBid.teamId, finalPrice: state.currentBid.amount });
      } else {
        // Bidding war with no bids — original winner keeps
        await endRTMNoWinner(io, room);
      }
    }
  }, 1000);
}

async function handleRTMInterest(io, socket, { roomCode, teamId }) {
  const state = rtmStates.get(roomCode);
  if (!state || state.phase !== 'window') {
    socket.emit('rtm-rejected', { reason: 'WINDOW_CLOSED', message: 'RTM window is not open' });
    return;
  }
  const isEligible = state.eligibleTeamIds.some((id) => id.toString() === teamId.toString());
  if (!isEligible) {
    socket.emit('rtm-rejected', { reason: 'NOT_ELIGIBLE', message: 'Your team is not eligible for RTM on this player' });
    return;
  }
  const alreadyIn = state.interestedTeamIds.some((id) => id.toString() === teamId.toString());
  if (alreadyIn) return; // idempotent

  const team = await Team.findById(teamId);
  if (!team) return;

  state.interestedTeamIds.push(team._id);

  io.to(roomCode).emit('rtm-update', {
    interestedTeamIds: state.interestedTeamIds.map(String),
    interestedTeam: { teamId: team._id, teamName: team.teamName },
  });
}

async function handleRTMBid(io, socket, { roomCode, teamId, amount }) {
  const mutex = getMutex(roomCode);
  const release = await mutex.acquire();
  try {
    const state = rtmStates.get(roomCode);
    if (!state || state.phase !== 'bidding') {
      socket.emit('rtm-rejected', { reason: 'NOT_IN_BIDDING', message: 'RTM bidding is not active' });
      return;
    }
    const isParticipant = state.interestedTeamIds.some((id) => id.toString() === teamId.toString());
    if (!isParticipant) {
      socket.emit('rtm-rejected', { reason: 'NOT_PARTICIPATING', message: 'You did not opt into RTM' });
      return;
    }

    // Minimum bid: if nobody has bid yet in the war, floor = soldPrice; otherwise next tier
    const minBid = state.currentBid ? getNextBidAmount(state.currentBid.amount) : state.soldPrice;
    if (!Number.isInteger(amount) || amount < minBid || amount % 5 !== 0) {
      socket.emit('rtm-rejected', { reason: 'INVALID_BID', message: `RTM bid must be at least ₹${minBid}L and a multiple of 5L` });
      return;
    }

    const team = await Team.findById(teamId);
    if (!team || team.budget.remaining < amount) {
      socket.emit('rtm-rejected', { reason: 'INSUFFICIENT_FUNDS', message: 'Insufficient budget for this RTM bid' });
      return;
    }

    const room = await Room.findOne({ roomCode });
    if (!room) return;

    state.currentBid = { amount, teamId: team._id, teamName: team.teamName };
    state.rtmBids.push({ teamId: team._id, teamName: team.teamName, amount, timestamp: new Date() });

    // Reset bidding timer
    _startRTMBiddingInterval(io, room);

    io.to(roomCode).emit('rtm-bid-update', {
      teamId: team._id,
      teamName: team.teamName,
      amount,
      nextBidAmount: getNextBidAmount(amount),
      secondsRemaining: RTM_DEFAULTS.biddingRoundDuration,
    });
  } finally {
    release();
  }
}

async function finalizeRTM(io, room, { winnerId, finalPrice }) {
  const state = rtmStates.get(room.roomCode);
  if (!state) return;
  if (state.interval) { clearInterval(state.interval); state.interval = null; }
  rtmStates.delete(room.roomCode);

  // Refund original winner
  const origTeam = await Team.findById(state.originalWinnerId);
  if (origTeam) {
    origTeam.squad = origTeam.squad.filter((e) => !e.playerId.equals(state.player._id));
    if (state.player.nationality === 'Overseas') origTeam.overseasCount = Math.max(0, origTeam.overseasCount - 1);
    origTeam.budget.spent -= state.soldPrice;
    await origTeam.save();
  }

  // Assign to RTM winner
  const rtmWinner = await Team.findById(winnerId);
  if (rtmWinner) {
    rtmWinner.squad.push({ playerId: state.player._id, soldPrice: finalPrice });
    if (state.player.nationality === 'Overseas') rtmWinner.overseasCount++;
    rtmWinner.budget.spent += finalPrice;
    rtmWinner.rtmRemaining = Math.max(0, rtmWinner.rtmRemaining - 1);
    await rtmWinner.save();
  }

  // Write definitive AuctionHistory
  await AuctionHistory.create({
    roomId: room._id,
    playerId: state.player._id,
    outcome: 'sold',
    soldTo: winnerId,
    soldPrice: finalPrice,
    basePrice: state.player.basePrice,
    bids: [...state.bids, ...state.rtmBids],
    auctionDuration: Math.round((Date.now() - state.startedAt) / 1000),
    auctionOrder: state.auctionOrder,
  });

  const teams = await populateTeamSnapshots(room._id);

  io.to(room.roomCode).emit('rtm-end', {
    outcome: 'rtm-won',
    player: state.player,
    rtmWinner: { teamId: winnerId, teamName: rtmWinner ? rtmWinner.teamName : '' },
    finalPrice,
    originalWinner: { teamId: state.originalWinnerId, teamName: state.originalWinnerName },
    refundAmount: state.soldPrice,
    teams,
  });

  setTimeout(async () => {
    const latestRoom = await Room.findById(room._id);
    if (latestRoom && latestRoom.status === 'active') await advanceToNextPlayer(io, latestRoom);
  }, RTM_DEFAULTS.postRtmDelay);
}

async function endRTMNoWinner(io, room) {
  const state = rtmStates.get(room.roomCode);
  if (!state) return;
  if (state.interval) { clearInterval(state.interval); state.interval = null; }
  rtmStates.delete(room.roomCode);

  // Original winner keeps player — write AuctionHistory
  await AuctionHistory.create({
    roomId: room._id,
    playerId: state.player._id,
    outcome: 'sold',
    soldTo: state.originalWinnerId,
    soldPrice: state.soldPrice,
    basePrice: state.player.basePrice,
    bids: state.bids,
    auctionDuration: Math.round((Date.now() - state.startedAt) / 1000),
    auctionOrder: state.auctionOrder,
  });

  const teams = await populateTeamSnapshots(room._id);

  io.to(room.roomCode).emit('rtm-end', {
    outcome: 'no-rtm',
    player: state.player,
    soldTo: { teamId: state.originalWinnerId, teamName: state.originalWinnerName },
    soldPrice: state.soldPrice,
    teams,
  });

  setTimeout(async () => {
    const latestRoom = await Room.findById(room._id);
    if (latestRoom && latestRoom.status === 'active') await advanceToNextPlayer(io, latestRoom);
  }, RTM_DEFAULTS.postRtmDelay);
}

// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  verifyAuctioneerToken,
  getAuctionState,
  getRTMState,
  startAuction,
  advanceToNextPlayer,
  placeBid,
  finalizeSale,
  finalizeUnsold,
  markUnsold,
  endAuction,
  emergencyRelease,
  handleRTMInterest,
  handleRTMBid,
  populateTeamSnapshots,
};
