// Product-wide practice settings are data, not session orchestration.
// Keeping them here lets persistence validate the same range without depending on core.
export const MAX_ROUND = 30;

export function roundSize(value, fallback = 20) {
  if (value === 'all') return 'all';
  const size = Number(value);
  return Number.isInteger(size) && size >= 1 ? Math.min(MAX_ROUND, size) : fallback;
}
