export function suggestSettlements(balances, members) {
  const nameOf = (id) => members.find((m) => m.id === id)?.name ?? `#${id}`;

  const debtors = [];
  const creditors = [];

  for (const [id, raw] of Object.entries(balances)) {
    const cents = Math.round(Number(raw) * 100);
    const memberId = Number(id);
    if (cents < 0) debtors.push({ id: memberId, cents: -cents });
    else if (cents > 0) creditors.push({ id: memberId, cents });
  }

  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];

    if (d.cents > c.cents) {
      transfers.push({
        from: d.id,
        to: c.id,
        fromName: nameOf(d.id),
        toName: nameOf(c.id),
        amount: c.cents / 100,
      });
      d.cents -= c.cents;
      j += 1;
    } else if (d.cents < c.cents) {
      transfers.push({
        from: d.id,
        to: c.id,
        fromName: nameOf(d.id),
        toName: nameOf(c.id),
        amount: d.cents / 100,
      });
      c.cents -= d.cents;
      i += 1;
    } else {
      transfers.push({
        from: d.id,
        to: c.id,
        fromName: nameOf(d.id),
        toName: nameOf(c.id),
        amount: d.cents / 100,
      });
      i += 1;
      j += 1;
    }
  }

  return transfers;
}
