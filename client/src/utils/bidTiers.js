const BID_TIERS = [
  { upTo: 100,      increment: 5   },
  { upTo: 200,      increment: 10  },
  { upTo: 500,      increment: 25  },
  { upTo: 1000,     increment: 50  },
  { upTo: 2000,     increment: 100 },
  { upTo: 5000,     increment: 200 },
  { upTo: Infinity, increment: 500 },
];

export function getBidIncrement(currentPrice) {
  const tier = BID_TIERS.find((t) => currentPrice < t.upTo);
  return tier.increment;
}

export function getNextBidAmount(currentPrice) {
  return currentPrice + getBidIncrement(currentPrice);
}
