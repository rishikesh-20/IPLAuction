const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  role:          { type: String, enum: ['batsman', 'bowler', 'all-rounder', 'wicket-keeper'], required: true },
  nationality:   { type: String, enum: ['Indian', 'Overseas'], required: true },
  country:       { type: String, required: true },
  category:      { type: String, enum: ['marquee', 'capped', 'uncapped', 'icon'], default: 'capped' },
  basePrice:     { type: Number, required: true }, // in lakhs
  age:           { type: Number },
  specialization:{ type: String },
  iplTeamHistory:{ type: [String], default: [] },
  stats: {
    matches:    { type: Number, default: 0 },
    runs:       { type: Number, default: 0 },
    wickets:    { type: Number, default: 0 },
    average:    { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
