const Room = require('../models/Room');
const { verifyAuctioneerToken, startAuction, placeBid, markUnsold, advanceToNextPlayer, endAuction, emergencyRelease, handleRTMInterest, handleRTMBid } = require('../services/auctionService');
const timerManager = require('./timerManager');

module.exports = function registerAuctionHandlers(io, socket) {
  socket.on('start-auction', async ({ roomCode, auctioneerToken }) => {
    try {
      const room = await Room.findOne({ roomCode: roomCode?.toUpperCase() });
      if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (!verifyAuctioneerToken(auctioneerToken, room.auctioneerToken)) return socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid auctioneer token' });
      if (room.status !== 'waiting') return socket.emit('error', { code: 'ALREADY_STARTED', message: 'Auction already started' });
      if (room.teams.length < 1) return socket.emit('error', { code: 'NO_TEAMS', message: 'At least one team must join before starting' });

      await startAuction(io, room);
      io.to(room.roomCode).emit('auction-started', { message: 'Auction has started!' });
    } catch (err) {
      console.error('start-auction error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('place-bid', async ({ roomCode, teamId, amount }) => {
    try {
      await placeBid(io, socket, { roomCode: roomCode?.toUpperCase(), teamId, amount });
    } catch (err) {
      console.error('place-bid error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('next-player', async ({ roomCode, auctioneerToken }) => {
    try {
      const room = await Room.findOne({ roomCode: roomCode?.toUpperCase() });
      if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (!verifyAuctioneerToken(auctioneerToken, room.auctioneerToken)) return socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid auctioneer token' });
      if (room.status !== 'active') return socket.emit('error', { code: 'AUCTION_NOT_ACTIVE', message: 'Auction is not active' });

      timerManager.destroyTimer(room.roomCode);
      // Mark current player as unsold and advance
      await markUnsold(io, room);
    } catch (err) {
      console.error('next-player error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('mark-unsold', async ({ roomCode, auctioneerToken }) => {
    try {
      const room = await Room.findOne({ roomCode: roomCode?.toUpperCase() });
      if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (!verifyAuctioneerToken(auctioneerToken, room.auctioneerToken)) return socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid auctioneer token' });
      if (room.status !== 'active') return socket.emit('error', { code: 'AUCTION_NOT_ACTIVE', message: 'Auction is not active' });

      await markUnsold(io, room);
    } catch (err) {
      console.error('mark-unsold error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('end-auction', async ({ roomCode, auctioneerToken }) => {
    try {
      const room = await Room.findOne({ roomCode: roomCode?.toUpperCase() });
      if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (!verifyAuctioneerToken(auctioneerToken, room.auctioneerToken)) return socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid auctioneer token' });
      if (room.status === 'completed') return socket.emit('error', { code: 'ALREADY_COMPLETED', message: 'Auction already completed' });

      await endAuction(io, room);
    } catch (err) {
      console.error('end-auction error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('pause-auction', async ({ roomCode, auctioneerToken }) => {
    try {
      const room = await Room.findOne({ roomCode: roomCode?.toUpperCase() });
      if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (!verifyAuctioneerToken(auctioneerToken, room.auctioneerToken)) return socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid auctioneer token' });

      timerManager.pauseTimer(room.roomCode);
      room.status = 'paused';
      await room.save();
      io.to(room.roomCode).emit('auction-paused', { message: 'Auction paused' });
    } catch (err) {
      console.error('pause-auction error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('resume-auction', async ({ roomCode, auctioneerToken }) => {
    try {
      const room = await Room.findOne({ roomCode: roomCode?.toUpperCase() });
      if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      if (!verifyAuctioneerToken(auctioneerToken, room.auctioneerToken)) return socket.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid auctioneer token' });

      timerManager.resumeTimer(room.roomCode);
      room.status = 'active';
      await room.save();
      io.to(room.roomCode).emit('auction-resumed', { message: 'Auction resumed' });
    } catch (err) {
      console.error('resume-auction error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('emergency-release', async ({ roomCode, teamId, playerId }) => {
    try {
      await emergencyRelease(io, socket, { roomCode: roomCode?.toUpperCase(), teamId, playerId });
    } catch (err) {
      console.error('emergency-release error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('rtm-interest', async ({ roomCode, teamId }) => {
    try {
      await handleRTMInterest(io, socket, { roomCode: roomCode?.toUpperCase(), teamId });
    } catch (err) {
      console.error('rtm-interest error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });

  socket.on('rtm-bid', async ({ roomCode, teamId, amount }) => {
    try {
      await handleRTMBid(io, socket, { roomCode: roomCode?.toUpperCase(), teamId, amount });
    } catch (err) {
      console.error('rtm-bid error:', err);
      socket.emit('error', { code: 'SERVER_ERROR', message: err.message });
    }
  });
};
