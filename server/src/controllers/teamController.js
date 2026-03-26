const Team = require('../models/Team');
const Room = require('../models/Room');

exports.getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('squad.playerId');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (err) { next(err); }
};

exports.setPlaying11 = async (req, res, next) => {
  try {
    const { playerIds, captainId, viceCaptainId, impactPlayerId } = req.body;
    if (!Array.isArray(playerIds) || playerIds.length !== 11) {
      return res.status(400).json({ success: false, message: 'Exactly 11 players required' });
    }
    if (!captainId || !viceCaptainId) {
      return res.status(400).json({ success: false, message: 'Captain and vice-captain are required' });
    }
    if (captainId === viceCaptainId) {
      return res.status(400).json({ success: false, message: 'Captain and vice-captain must be different players' });
    }
    const team = await Team.findById(req.params.teamId).populate('squad.playerId');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const squadIds = team.squad.map((s) => s.playerId?._id?.toString());
    const allInSquad = playerIds.every((id) => squadIds.includes(id));
    if (!allInSquad) {
      return res.status(400).json({ success: false, message: 'All playing 11 players must be in the team squad' });
    }
    if (!playerIds.includes(captainId) || !playerIds.includes(viceCaptainId)) {
      return res.status(400).json({ success: false, message: 'Captain and vice-captain must be in the playing 11' });
    }
    if (impactPlayerId) {
      if (playerIds.includes(impactPlayerId)) {
        return res.status(400).json({ success: false, message: 'Impact player must come from the bench, not the playing 11' });
      }
      if (!squadIds.includes(impactPlayerId)) {
        return res.status(400).json({ success: false, message: 'Impact player must be in the team squad' });
      }
    }

    team.playing11 = playerIds;
    team.captainId = captainId;
    team.viceCaptainId = viceCaptainId;
    team.impactPlayerId = impactPlayerId || null;
    await team.save();

    const populated = await Team.findById(team._id)
      .populate('squad.playerId')
      .populate('playing11')
      .populate('captainId')
      .populate('viceCaptainId')
      .populate('impactPlayerId');
    res.json({ success: true, data: populated });
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
