import type { ActivityDetails } from '@wealthfolio/addon-sdk';

export interface YearlyGain {
  year: number;
  gain: number;
}

interface BuyLot {
  quantity: number;
  costPerShare: number;
}

/**
 * Calculate realized gains by year using FIFO cost-basis matching.
 *
 * For each symbol:
 *   - BUY activities push lots onto a FIFO queue with a cost-per-share.
 *   - SELL activities consume the oldest lots first, computing the matched
 *     cost basis for the shares sold.
 *   - Realized gain = net proceeds (amount − fee) − matched cost basis.
 *
 * Results are aggregated by calendar year and sorted ascending.
 */
export function calculateRealizedGainsByYear(activities: ActivityDetails[]): YearlyGain[] {
  // Sort chronologically so FIFO matching is correct.
  const sorted = [...activities].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // FIFO buy-lot queues keyed by assetId.
  const buyQueues = new Map<string, BuyLot[]>();

  // Accumulated realized gain per calendar year.
  const yearlyGains = new Map<number, number>();

  for (const activity of sorted) {
    const { activityType, assetId, quantity, amount, fee, date } = activity;

    // Skip activities without a tradeable asset or meaningful quantity.
    if (!assetId || quantity === 0) continue;

    const qty = Math.abs(quantity);
    const year = new Date(date).getFullYear();

    if (activityType === 'BUY') {
      const totalCost = Math.abs(amount) + Math.abs(fee);
      const costPerShare = totalCost / qty;

      const queue = buyQueues.get(assetId) ?? [];
      queue.push({ quantity: qty, costPerShare });
      buyQueues.set(assetId, queue);
    } else if (activityType === 'SELL') {
      const netProceeds = Math.abs(amount) - Math.abs(fee);

      // Consume buy lots FIFO to determine the cost basis for this sale.
      const queue = buyQueues.get(assetId) ?? [];
      let remaining = qty;
      let matchedCost = 0;

      while (remaining > 0 && queue.length > 0) {
        const lot = queue[0];
        if (lot.quantity <= remaining) {
          // Consume the entire lot.
          matchedCost += lot.quantity * lot.costPerShare;
          remaining -= lot.quantity;
          queue.shift();
        } else {
          // Partially consume the lot.
          matchedCost += remaining * lot.costPerShare;
          lot.quantity -= remaining;
          remaining = 0;
        }
      }
      // If there are no matching buy lots (e.g. data gap), cost basis defaults
      // to 0 for the unmatched portion — the gain equals full proceeds.

      const gain = netProceeds - matchedCost;
      yearlyGains.set(year, (yearlyGains.get(year) ?? 0) + gain);
    }
  }

  return Array.from(yearlyGains.entries())
    .map(([year, gain]) => ({ year, gain }))
    .sort((a, b) => a.year - b.year);
}
