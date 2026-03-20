const mongoose = require('mongoose');

const auctionHistorySchema = new mongoose.Schema({
  roomId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  outcome:  { type: String, enum: ['sold', 'unsold'], required: true },
  soldTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  soldPrice:  { type: Number, default: 0 },
  basePrice:  { type: Number, required: true },
  bids: [{
    teamId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    teamName:  { type: String },
    amount:    { type: Number },
    timestamp: { type: Date, default: Date.now },
  }],
  auctionDuration: { type: Number }, // seconds
  auctionOrder:    { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('AuctionHistory', auctionHistorySchema);
