/**
 * Formats a value in lakhs to a human-readable INR string.
 * e.g. 200 → "₹2 Cr", 50 → "₹50 L", 1500 → "₹15 Cr"
 */
export function formatLakhs(lakhs) {
  if (lakhs === null || lakhs === undefined) return '—';
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  return `₹${lakhs} L`;
}

export function formatBudget(lakhs) {
  return formatLakhs(lakhs);
}
