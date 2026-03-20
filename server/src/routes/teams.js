const router = require('express').Router({ mergeParams: true });
const { getTeam, getRoomTeams } = require('../controllers/teamController');

router.get('/:teamId', getTeam);

module.exports = router;
