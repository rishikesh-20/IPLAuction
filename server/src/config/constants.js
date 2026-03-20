// IPL-style bid increment tiers (amounts in lakhs)
const BID_TIERS = [
  { upTo: 100,      increment: 5   }, // < 1 Cr  → 5L steps
  { upTo: 200,      increment: 10  }, // < 2 Cr  → 10L steps
  { upTo: 500,      increment: 25  }, // < 5 Cr  → 25L steps
  { upTo: 1000,     increment: 50  }, // < 10 Cr → 50L steps
  { upTo: 2000,     increment: 100 }, // < 20 Cr → 1 Cr steps
  { upTo: 5000,     increment: 200 }, // < 50 Cr → 2 Cr steps
  { upTo: Infinity, increment: 500 }, // ≥ 50 Cr → 5 Cr steps
];

function getBidIncrement(currentPrice) {
  const tier = BID_TIERS.find((t) => currentPrice < t.upTo);
  return tier.increment;
}

function getNextBidAmount(currentPrice) {
  return currentPrice + getBidIncrement(currentPrice);
}

const TIMER_DEFAULTS = {
  duration: 30,          // seconds per player
  extension: 10,         // seconds added on late bid
  extensionThreshold: 5, // extend if bid in last N seconds
  postSaleDelay: 3000,   // ms before advancing to next player
};

const ROOM_DEFAULTS = {
  startingBudget: 9000,   // lakhs (= 90 Cr)
  maxSquadSize: 25,
  maxOverseasPlayers: 8,
  minTeams: 2,
  maxTeams: 10,
};

module.exports = { BID_TIERS, getBidIncrement, getNextBidAmount, TIMER_DEFAULTS, ROOM_DEFAULTS };
