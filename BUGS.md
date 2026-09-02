# Bugs found

Add one section per issue. Bug 1 is filled in to show the format — fix it, then write what you changed. Copy the blank template for the rest.

Keep this file in the repo and **commit it** with your fixes.

---

## Bug 1

**How to reproduce:** Open the app. The expense list says “Newest first”. The first row is Wine (7 Mar). Board game (15 Mar) is further down.

**What is wrong:** The list is showing oldest expenses first. Newest should be at the top.

**What I changed:** In `src/components/ExpenseList.jsx`, the sort comparator was `dateValue(a.date) - dateValue(b.date)` (ascending). Flipped it to `dateValue(b.date) - dateValue(a.date)` so the newest date sorts first.

---

## Bug 2

**How to reproduce:** Refresh the page (so state loads from `localStorage` instead of the seed), then look at the expense list order, or add a new expense and watch it not slot in by date correctly.

**What is wrong:** `src/lib/format.js`'s `dateValue()` just returned the value it was given instead of converting it to a comparable number. On first load, `date` is a real `Date` object so subtraction happens to work. But `src/state/store.js`'s `loadState()` only ran expenses through `hydrate()` (which turns `date` strings into `Date` objects) on the very first load — every later load parsed the stored JSON directly, leaving `date` as a plain string. Once dates were strings, `dateValue(a.date) - dateValue(b.date)` becomes string arithmetic (`"2026-03-12" - "2026-03-10"` is `NaN`), so `Array.prototype.sort` gets a comparator that always returns `NaN` and effectively stops sorting — the "Newest first" order silently breaks after the very first refresh.

**What I changed:** Made `dateValue()` in `src/lib/format.js` explicitly return `date.getTime()` (parsing with `new Date(date)` first if it isn't already a `Date`). Also fixed `loadState()` in `src/state/store.js` to call `hydrate(JSON.parse(raw))` instead of returning the raw parsed JSON, so `date` is always a `Date` object on every load, not just the first one.

---

## Bug 3

**How to reproduce:** Add "Uber to airport" style expense: paid by someone who is *not* included in the split (e.g. paid by Diya, split only between Aisha and Ben, like the seed data's "Uber to airport"). Check the Balances panel and add up every member's balance.

**What is wrong:** The README is explicit: "Someone can put a cab on their card even if they did not ride... They should get that fare back in full." Instead, `computeBalances()` in `src/lib/balances.js` had an extra block that, whenever the payer wasn't part of the split, subtracted an *additional* `amount / splitWith.length` from the payer's balance — on top of the amount already implicitly excluded because they weren't in `shares`. For the seed's $60 Uber (paid by Diya, split between Aisha & Ben), Diya was only credited $30 instead of the full $60, and the whole group's balances no longer summed to zero (a group of 4 finished at −$30 instead of $0), even though this is meant to be a closed system.

**What I changed:** Removed the extra `if (!(exp.paidBy in shares) ...)` block from `computeBalances()`. The payer's balance already gets `+amount` and only loses a share for entries that actually appear in `shares`, which is exactly "get it back in full unless you're also on the split."

---

## Bug 4

**How to reproduce:** Add an expense split equally among 3 people for an amount that doesn't divide evenly, e.g. $100 split 3 ways, or look at how `splitByPercent` rounds each share independently.

**What is wrong:** The README says: "Those portions together should make up the full bill — the group should not 'lose' or 'invent' money in the rounding." `splitEqual()` and `splitByPercent()` in `src/lib/money.js` rounded each individual share to 2 decimals independently (`Number((amount / n).toFixed(2))`), so $100 / 3 became $33.33 + $33.33 + $33.33 = $99.99 — a cent vanished. The same problem existed for percent splits.

**What I changed:** Replaced both functions with a shared `distributeByWeight()` helper that works in integer cents: it computes each share's ideal cent amount, floors them, then hands out the leftover cent(s) to the shares with the largest fractional remainder (the standard "largest remainder" rounding method). This guarantees the shares always add back up exactly to the original amount, however many people are on the split.

---

## Bug 5

**How to reproduce:** Get a group down to exactly two people left to settle where one owes precisely what the other is owed (e.g. balances of −$50 and +$50), and open the Settle up panel.

**What is wrong:** In `suggestSettlements()` (`src/lib/settle.js`), the loop that matches debtors to creditors had three branches: debtor owes more, creditor is owed more, and an `else` for when the amounts are exactly equal. The `else` branch just advanced both pointers (`i += 1; j += 1;`) without ever pushing a transfer — so the one case where debt and credit match exactly produced *no* payment suggestion at all, even though a real transfer is needed. The panel could show "Everyone is settled" while a member is still genuinely owed money.

**What I changed:** Added the missing `transfers.push(...)` in that `else` branch before advancing both pointers, using either side's amount (they're equal at that point).

---

## Bug 6

**How to reproduce:** Open the Balances panel and compare the "owes" / "is owed" labels against the Settle up panel's suggested transfers for the same people.

**What is wrong:** `computeBalances()` gives a *positive* balance to someone who paid more than their share (they're a creditor — the group owes them), and a *negative* balance to someone who consumed more than they paid (a debtor). `suggestSettlements()` in `settle.js` uses that convention correctly (negative → debtor, positive → creditor). But `BalancesPanel.jsx` had it backwards: it labeled `bal > 0.005` as "owes" and `bal < -0.005` as "is owed" — the exact opposite of what the numbers mean, and the opposite of what the Settle up panel does with the same balances.

**What I changed:** Swapped the two branches in `BalancesPanel.jsx` so a positive balance now shows "is owed" and a negative balance shows "owes", matching `settle.js` and the actual math.

---

## Bug 7

**How to reproduce:** Use the "Paid by" dropdown in Filters to pick any specific person.

**What is wrong:** The `<select>` in `Filters.jsx` reports its value as a string (e.g. `"1"`), but `expense.paidBy` is stored as a number (e.g. `1`). `App.jsx`'s filter did `e.paidBy !== paidBy`, a strict comparison between a number and a string, which is always `true` — so choosing any specific person under "Paid by" hid every expense instead of narrowing the list.

**What I changed:** Changed the comparison in `App.jsx` to `e.paidBy !== Number(paidBy)` so both sides are compared as numbers.

---

## Bug 8

**How to reproduce:** Add a new member via the "Add member" box in the Summary card, without adding or changing any expense.

**What is wrong:** `SummaryCards.jsx` computes a `perPerson` "Paid so far" list with `useMemo(..., [expenses])`, but the calculation also reads `members`. Since the memo's dependency array didn't include `members`, adding a new member didn't invalidate the memo, so the newly added person didn't appear in the "Paid so far" list until some unrelated change touched `expenses`.

**What I changed:** Added `members` to the `useMemo` dependency array in `SummaryCards.jsx`.

---

## Bug 9

**How to reproduce:** Apply any filter (search text, a category, or "Paid by") or just rely on the list's own sort order, then delete or edit the amount on a row.

**What is wrong:** `ExpenseList.jsx` rendered the *filtered and sorted* array and passed each row's position in *that* array (`index`) up to `onDeleteAt(index)` / `onUpdateAt(index, patch)`. `App.jsx` forwarded that index straight into the reducer, and `store.js`'s `DELETE_EXPENSE` / `UPDATE_EXPENSE` used `splice`/direct index assignment against the raw, unfiltered `state.expenses` array. Whenever the visible order didn't match the underlying array's order (any active filter, or simply the date sort), clicking "Delete" or editing the amount on one row would silently delete or change a *different* expense — a direct violation of "What you click is what should change."

**What I changed:** Switched `DELETE_EXPENSE` and `UPDATE_EXPENSE` in `store.js` to operate on the expense's own `id` (`filter`/`map` by `e.id`) instead of an array index, and updated `ExpenseList.jsx` and `App.jsx` to pass `expense.id` through instead of the row's position. Also changed the list's React `key` from `index` to `expense.id`, since keying by position had the same "identity drifts when the list reorders" problem.

---

## Bug 10

**How to reproduce:** Manually type mismatched custom percentages that don't cleanly sum to 100 in floating point (rare, but possible depending on input), or review `percentsSumTo100`.

**What is wrong:** `percentsSumTo100()` in `src/lib/money.js` compared the sum of entered percentages to `100` with strict equality (`=== 100`). Floating-point addition doesn't always land on a value exactly equal to `100` even when the entered percentages are logically correct, which could reject a valid split or (less often) accept one that's off by a hair.

**What I changed:** Compared the sum to `100` with a small tolerance (`Math.abs(sum - 100) < 0.01`) instead of exact equality.

---
