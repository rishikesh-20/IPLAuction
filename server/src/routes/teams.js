const router = require('express').Router({ mergeParams: true });
const { getTeam, getRoomTeams, setPlaying11 } = require('../controllers/teamController');

router.get('/:teamId', getTeam);
router.patch('/:teamId/playing11', setPlaying11);

module.exports = router;
