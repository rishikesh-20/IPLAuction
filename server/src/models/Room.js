const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode:       { type: String, unique: true, required: true, uppercase: true },
  roomName:       { type: String, required: true, maxlength: 60 },
  auctioneerName: { type: String, required: true },
  auctioneerToken:{ type: String, required: true }, // SHA-256 hash of the raw UUID token
  status:         { type: String, enum: ['waiting', 'active', 'paused', 'completed'], default: 'waiting' },
  config: {
    startingBudget:     { type: Number, default: 9000 },
    maxSquadSize:       { type: Number, default: 25 },
    maxOverseasPlayers: { type: Number, default: 8 },
    timerDuration:      { type: Number, default: 30 },
    timerExtension:     { type: Number, default: 10 },
    extensionThreshold: { type: Number, default: 5 },
  },
  playerPool:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  currentPlayerIndex: { type: Number, default: 0 },
  teams:              [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  auctioneerTeamId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  unsoldPlayerIds:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  soldPlayerIds:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
