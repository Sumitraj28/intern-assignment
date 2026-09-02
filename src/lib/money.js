export function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$0.00";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

// Splits `amount` into cent-accurate shares according to `weights` (numbers
// that don't need to sum to 1) so the shares always add back up to `amount`
// exactly, distributing leftover cents to the largest fractional remainders.
function distributeByWeight(amount, ids, weights) {
  const totalCents = Math.round(Number(amount) * 100);
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (w / weightSum) * totalCents);
  const floors = raw.map(Math.floor);
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);

  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac);

  const cents = floors.slice();
  for (let k = 0; k < remainder; k += 1) {
    cents[order[k % order.length].i] += 1;
  }

  const shares = {};
  ids.forEach((id, i) => {
    shares[id] = cents[i] / 100;
  });
  return shares;
}

export function splitEqual(amount, ids) {
  const n = ids.length || 1;
  const weights = ids.map(() => 1 / n);
  return distributeByWeight(amount, ids, weights);
}

export function percentsSumTo100(percents) {
  const values = Object.values(percents).map(Number);
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.abs(sum - 100) < 0.01;
}

export function splitByPercent(amount, percents) {
  const ids = Object.keys(percents);
  const weights = ids.map((id) => Number(percents[id]));
  return distributeByWeight(amount, ids, weights);
}

export function sharesForExpense(expense) {
  if (expense.splitType === "percent" && expense.percents) {
    return splitByPercent(expense.amount, expense.percents);
  }
  return splitEqual(expense.amount, expense.splitWith);
}
