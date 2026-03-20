const Player = require('../models/Player');

exports.getPlayers = async (req, res, next) => {
  try {
    const { role, nationality, category, minPrice, maxPrice, sort = 'basePrice', order = 'desc', page = 1, limit = 100 } = req.query;
    const filter = { isActive: true };
    if (role) filter.role = role;
    if (nationality) filter.nationality = nationality;
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);
    const [players, total] = await Promise.all([
      Player.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Player.countDocuments(filter),
    ]);
    res.json({ success: true, data: players, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

exports.getPlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });
    res.json({ success: true, data: player });
  } catch (err) { next(err); }
};
