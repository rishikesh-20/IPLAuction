const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const Team = require('../models/Team');
const Player = require('../models/Player');
const AuctionHistory = require('../models/AuctionHistory');

// Exclude visually ambiguous chars: 0/O, 1/I, 5/S, 8/B, 2/Z
const CODE_CHARS = 'ACDEFGHJKLMNPQRTUVWXY3469';
function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

exports.createRoom = async (req, res, next) => {
  try {
    const { roomName, auctioneerName, auctioneerTeamName, auctioneerTeamColor, config = {}, playerPoolIds } = req.body;
    if (!roomName || !auctioneerName) {
      return res.status(400).json({ success: false, message: 'roomName and auctioneerName are required' });
    }

    // Generate unique room code
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      attempts++;
      if (attempts > 10) throw new Error('Could not generate unique room code');
    } while (await Room.findOne({ roomCode }));

    // Auctioneer token
    const rawToken = uuidv4();
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Player pool
    let playerPool;
    if (playerPoolIds && playerPoolIds.length > 0) {
      playerPool = shuffle(playerPoolIds);
    } else {
      const allPlayers = await Player.find({ isActive: true }).select('_id');
      playerPool = shuffle(allPlayers.map((p) => p._id));
    }

    const startingBudget = config.startingBudget ?? 9000;

    const room = await Room.create({
      roomCode,
      roomName,
      auctioneerName,
      auctioneerToken: hashedToken,
      config: {
        startingBudget,
        maxSquadSize:       config.maxSquadSize       ?? 25,
        maxOverseasPlayers: config.maxOverseasPlayers ?? 8,
        timerDuration:      config.timerDuration      ?? 30,
        timerExtension:     config.timerExtension     ?? 10,
        extensionThreshold: config.extensionThreshold ?? 5,
      },
      playerPool,
    });

    // Optionally create a team for the auctioneer
    let auctioneerTeamId = null;
    if (auctioneerTeamName && auctioneerTeamName.trim()) {
      const TEAM_COLORS = [
        '#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899','#14b8a6','#f97316',
        '#6366f1','#84cc16',
      ];
      const auctioneerTeam = await Team.create({
        roomId: room._id,
        teamName: auctioneerTeamName.trim(),
        ownerName: auctioneerName,
        socketId: null,
        color: auctioneerTeamColor || TEAM_COLORS[0],
        budget: { total: startingBudget, spent: 0, remaining: startingBudget },
      });
      room.teams.push(auctioneerTeam._id);
      room.auctioneerTeamId = auctioneerTeam._id;
      await room.save();
      auctioneerTeamId = auctioneerTeam._id;
    }

    res.status(201).json({ success: true, roomCode: room.roomCode, roomId: room._id, auctioneerToken: rawToken, auctioneerTeamId });
  } catch (err) { next(err); }
};

exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() }).populate('teams');
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const { auctioneerToken, config } = req.body;
    const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    if (room.status !== 'waiting') return res.status(400).json({ success: false, message: 'Cannot update config after auction starts' });

    const hashed = crypto.createHash('sha256').update(auctioneerToken).digest('hex');
    if (hashed !== room.auctioneerToken) return res.status(403).json({ success: false, message: 'Unauthorized' });

    Object.assign(room.config, config);
    await room.save();
    res.json({ success: true, data: room.config });
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    const history = await AuctionHistory.find({ roomId: room._id })
      .populate('playerId').populate('soldTo').sort({ auctionOrder: 1 });
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
};

exports.getStandings = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    const teams = await Team.find({ roomId: room._id }).populate('squad.playerId');
    const unsoldPlayers = await Player.find({ _id: { $in: room.unsoldPlayerIds } });
    res.json({ success: true, data: { teams, unsoldPlayers, status: room.status } });
  } catch (err) { next(err); }
};
