const router = require('express').Router();
router.use('/rooms', require('./rooms'));
router.use('/players', require('./players'));
router.use('/teams', require('./teams'));
module.exports = router;
