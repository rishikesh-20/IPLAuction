const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  roomId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  teamName:  { type: String, required: true },
  ownerName: { type: String, required: true },
  socketId:  { type: String, default: null },
  color:     { type: String, default: '#f59e0b' },
  budget: {
    total:     { type: Number, required: true },
    spent:     { type: Number, default: 0 },
    remaining: { type: Number },
  },
  squad: [{
    playerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    soldPrice:  { type: Number },
    acquiredAt: { type: Date, default: Date.now },
  }],
  playing11:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  captainId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  viceCaptainId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  impactPlayerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  overseasCount: { type: Number, default: 0 },
  isConnected:     { type: Boolean, default: true },
  isEliminated:    { type: Boolean, default: false },
  emergencyUsed:   { type: Boolean, default: false },
  rtmRemaining:    { type: Number,  default: 3 },
  coOwnerName:     { type: String, default: null },
  coOwnerSocketId: { type: String, default: null },
}, { timestamps: true });

teamSchema.index({ roomId: 1 });
teamSchema.index({ socketId: 1 });
teamSchema.index({ coOwnerSocketId: 1 });

// Virtual: keep remaining in sync
teamSchema.pre('save', function (next) {
  this.budget.remaining = this.budget.total - this.budget.spent;
  next();
});

module.exports = mongoose.model('Team', teamSchema);
