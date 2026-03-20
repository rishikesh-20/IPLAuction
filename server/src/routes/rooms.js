const router = require('express').Router();
const { createRoom, getRoom, updateConfig, getHistory, getStandings } = require('../controllers/roomController');
const { getRoomTeams } = require('../controllers/teamController');

router.post('/', createRoom);
router.get('/:roomCode', getRoom);
router.patch('/:roomCode/config', updateConfig);
router.get('/:roomCode/history', getHistory);
router.get('/:roomCode/standings', getStandings);
router.get('/:roomCode/teams', getRoomTeams);

module.exports = router;
