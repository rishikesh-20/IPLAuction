const Room = require('../models/Room');
const Team = require('../models/Team');
const Player = require('../models/Player');
const AuctionHistory = require('../models/AuctionHistory');
const { getAuctionState, getRTMState, populateTeamSnapshots, buildQueuePreview } = require('../services/auctionService');

const TEAM_COLORS = [
  '#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899','#14b8a6','#f97316',
  '#6366f1','#84cc16',
];

async function buildRoomState(room, socket, myTeamId) {
  const teams = await populateTeamSnapshots(room._id);
  const auctionState = getAuctionState(room.roomCode);

  // Player queue preview
  const queuePlayers = await buildQueuePreview(room, room.currentPlayerIndex + (auctionState ? 1 : 0));

  const unsoldPlayers = await Player.find({ _id: { $in: room.unsoldPlayerIds } });
  const recentHistory = await AuctionHistory.find({ roomId: room._id })
    .populate('playerId').populate('soldTo').sort({ auctionOrder: -1 }).limit(20);

  return {
    room: {
      roomCode: room.roomCode,
      roomName: room.roomName,
      auctioneerName: room.auctioneerName,
      status: room.status,
      config: room.config,
      currentPlayerIndex: room.currentPlayerIndex,
    },
    teams,
    currentPlayer: auctionState ? auctionState.currentPlayer : null,
    currentBid: auctionState ? auctionState.currentBid : null,
    bidHistory: auctionState ? auctionState.bids.slice(-5) : [],
    playerQueue: queuePlayers,
    soldPlayers: room.soldPlayerIds,
    unsoldPlayers,
    auctionHistory: recentHistory,
    yourTeamId: myTeamId,
    rtmState: (() => {
      const rtm = getRTMState(room.roomCode);
      if (!rtm) return null;
      return {
        phase: rtm.phase,
        player: rtm.player,
        soldPrice: rtm.soldPrice,
        soldTo: { teamId: rtm.originalWinnerId, teamName: rtm.originalWinnerName },
        eligibleTeamIds: rtm.eligibleTeamIds.map(String),
        interestedTeamIds: rtm.interestedTeamIds.map(String),
        secondsRemaining: rtm.secondsRemaining,
        currentBid: rtm.currentBid,
      };
    })(),
  };
}

module.exports = function registerRoomHandlers(io, socket) {
  socket.on('join-room', async (data) => {
    try {
      const { roomCode, teamName, ownerName, isAuctioneer, teamId, auctioneerToken, teamColor, coOwner } = data;
      if (!roomCode) return socket.emit('error', { code: 'MISSING_ROOM_CODE', message: 'roomCode is required' });

      const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
      if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: `Room ${roomCode} does not exist` });

      socket.join(room.roomCode);

      let myTeam = null;

      if (isAuctioneer) {
        // Update socketId on auctioneer's team if they have one
        if (room.auctioneerTeamId) {
          const auctioneerTeam = await Team.findById(room.auctioneerTeamId);
          if (auctioneerTeam) {
            auctioneerTeam.socketId = socket.id;
            auctioneerTeam.isConnected = true;
            await auctioneerTeam.save();
          }
        }
        const state = await buildRoomState(room, socket, room.auctioneerTeamId);
        state.isAuctioneer = true;
        socket.emit('room-state', state);
        return;
      }

      // Check if rejoining with existing teamId
      if (teamId) {
        myTeam = await Team.findById(teamId);
        if (myTeam && myTeam.roomId.equals(room._id)) {
          if (coOwner) {
            myTeam.coOwnerSocketId = socket.id;
          } else {
            myTeam.socketId = socket.id;
          }
          myTeam.isConnected = true;
          await myTeam.save();
          socket.to(room.roomCode).emit('team-reconnected', {
            teamId: myTeam._id,
            teamName: myTeam.teamName,
            isConnected: true,
          });
        } else {
          // teamId was provided but is invalid — session is stale
          return socket.emit('error', {
            code: 'SESSION_EXPIRED',
            message: 'Your session has expired. Please rejoin the room.',
          });
        }
      }

      // New team joining
      if (!myTeam) {
        if (!teamName || !ownerName) {
          return socket.emit('error', { code: 'MISSING_FIELDS', message: 'teamName and ownerName are required' });
        }

        // Co-owner first join — attach to an existing team
        if (coOwner) {
          const targetTeam = await Team.findOne({ roomId: room._id, teamName });
          if (!targetTeam) {
            return socket.emit('error', { code: 'TEAM_NOT_FOUND', message: `Team "${teamName}" not found in this room` });
          }
          if (targetTeam.coOwnerName) {
            return socket.emit('error', { code: 'CO_OWNER_EXISTS', message: 'This team already has a co-owner' });
          }
          targetTeam.coOwnerName = ownerName;
          targetTeam.coOwnerSocketId = socket.id;
          targetTeam.isConnected = true;
          await targetTeam.save();
          myTeam = targetTeam;
          socket.to(room.roomCode).emit('team-updated', {
            teamId: myTeam._id,
            coOwnerName: myTeam.coOwnerName,
          });
          const state = await buildRoomState(room, socket, myTeam._id);
          socket.emit('room-state', state);
          return;
        }

        // Check if a team with the same name already exists (reconnect without teamId race condition)
        const existingTeam = await Team.findOne({ roomId: room._id, teamName });
        if (existingTeam) {
          // Verify the owner name matches to prevent impersonation
          if (existingTeam.ownerName !== ownerName) {
            return socket.emit('error', {
              code: 'NAME_MISMATCH',
              message: 'The name you entered does not match the team owner. Please enter your original name.',
            });
          }
          existingTeam.socketId = socket.id;
          existingTeam.isConnected = true;
          await existingTeam.save();
          myTeam = existingTeam;
          socket.to(room.roomCode).emit('team-reconnected', {
            teamId: myTeam._id,
            teamName: myTeam.teamName,
            isConnected: true,
          });
          const state = await buildRoomState(room, socket, myTeam._id);
          socket.emit('room-state', state);
          return;
        }

        if (room.status !== 'waiting') {
          return socket.emit('error', { code: 'AUCTION_STARTED', message: 'Auction has already started' });
        }

        const colorIndex = room.teams.length % TEAM_COLORS.length;
        myTeam = await Team.create({
          roomId: room._id,
          teamName,
          ownerName,
          socketId: socket.id,
          color: teamColor || TEAM_COLORS[colorIndex],
          budget: {
            total: room.config.startingBudget,
            spent: 0,
            remaining: room.config.startingBudget,
          },
        });

        room.teams.push(myTeam._id);
        await room.save();

        // Notify others
        socket.to(room.roomCode).emit('team-joined', {
          team: {
            _id: myTeam._id,
            teamName: myTeam.teamName,
            ownerName: myTeam.ownerName,
            color: myTeam.color,
            budget: myTeam.budget,
            squad: [],
            overseasCount: 0,
            isConnected: true,
          },
        });
      }

      const state = await buildRoomState(room, socket, myTeam._id);
      socket.emit('room-state', state);
    } catch (err) {
      console.error('join-room error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('leave-room', async (data) => {
    try {
      const { roomCode, teamId } = data || {};
      if (teamId) {
        const team = await Team.findById(teamId);
        if (team) {
          team.isConnected = false;
          await team.save();
          socket.to(roomCode).emit('team-disconnected', { teamId, teamName: team.teamName, isConnected: false });
        }
      }
      if (roomCode) socket.leave(roomCode);
    } catch (err) {
      console.error('leave-room error:', err);
    }
  });

  socket.on('disconnecting', async () => {
    try {
      // Check primary owner first, then co-owner
      let team = await Team.findOne({ socketId: socket.id });
      let isCoOwner = false;
      if (!team) {
        team = await Team.findOne({ coOwnerSocketId: socket.id });
        isCoOwner = true;
      }
      if (team) {
        if (isCoOwner) {
          team.coOwnerSocketId = null;
        } else {
          team.socketId = null;
        }
        // Only go fully offline when BOTH sockets are gone
        const stillConnected = isCoOwner ? !!team.socketId : !!team.coOwnerSocketId;
        team.isConnected = stillConnected;
        await team.save();
        if (!stillConnected) {
          const room = await Room.findById(team.roomId);
          if (room) {
            socket.to(room.roomCode).emit('team-disconnected', {
              teamId: team._id,
              teamName: team.teamName,
              isConnected: false,
            });
          }
        }
      }
    } catch (err) {
      console.error('disconnecting error:', err);
    }
  });
};
