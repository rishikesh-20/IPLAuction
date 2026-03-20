const Team = require('../models/Team');
const Room = require('../models/Room');

exports.getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('squad.playerId');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) { next(err); }
};

exports.getRoomTeams = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode.toUpperCase() });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    const teams = await Team.find({ roomId: room._id }).populate('squad.playerId');
    res.json({ success: true, data: teams });
  } catch (err) { next(err); }
};
