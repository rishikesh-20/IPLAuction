require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Player = require('../models/Player');
const players = require('./players.seed');

if (process.env.NODE_ENV === 'production') {
  console.error('Do not run seed in production!');
  process.exit(1);
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  await Player.deleteMany({});
  console.log('Cleared players collection');
  const inserted = await Player.insertMany(players);
  console.log(`Seeded ${inserted.length} players`);
  await mongoose.disconnect();
  console.log('Done');
}

seed().catch((err) => { console.error(err); process.exit(1); });
