const crypto = require('crypto');
const { Mutex } = require('async-mutex');
const Room = require('../models/Room');
const Team = require('../models/Team');
const Player = require('../models/Player');
const AuctionHistory = require('../models/AuctionHistory');
const { getNextBidAmount, TIMER_DEFAULTS } = require('../config/constants');
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

  // Save history
  await AuctionHistory.create({
    roomId: room._id,
    playerId: currentPlayer._id,
    outcome: 'sold',
    soldTo: winningTeamId,
    soldPrice,
    basePrice: currentPlayer.basePrice,
    bids,
    auctionDuration: Math.round((Date.now() - startedAt) / 1000),
    auctionOrder,
  });

  const teams = await populateTeamSnapshots(room._id);

  io.to(room.roomCode).emit('player-sold', {
    player: currentPlayer,
    soldTo: { teamId: winningTeamId, teamName: currentBid.teamName },
    soldPrice,
    teams,
    auctionOrder,
  });

  auctionStates.delete(room.roomCode);

  // Auto-advance after delay
  setTimeout(async () => {
    const latestRoom = await Room.findById(room._id);
    if (latestRoom && latestRoom.status === 'active') {
      await advanceToNextPlayer(io, latestRoom);
    }
  }, TIMER_DEFAULTS.postSaleDelay);
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

module.exports = {
  verifyAuctioneerToken,
  getAuctionState,
  startAuction,
  advanceToNextPlayer,
  placeBid,
  finalizeSale,
  finalizeUnsold,
  markUnsold,
  endAuction,
  populateTeamSnapshots,
};
