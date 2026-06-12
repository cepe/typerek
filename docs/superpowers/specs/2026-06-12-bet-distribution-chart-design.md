# Bet Distribution Donut Chart — Design Spec

**Date:** 2026-06-12
**Status:** Approved

## Summary

When a match has started, the "Typy uczestników" card on the match detail page shows how participants distributed their bets across the six bet types (1, X, 2, 1X, X2, 12) as a donut chart. The chart sits at the top of the card, above the per-player list.

## Placement

The chart renders inside the existing `match.started && match.participants` section in `MatchPage.tsx`, at the top of the `card` — between the `card-header` and the `divide-y` participant list. It is a separate `card-body`-styled block with a bottom border separating it from the list.

## Component: `BetDistributionChart`

**File:** `frontend/src/components/BetDistributionChart.tsx`

**Props:**
```ts
interface Props {
  participants: Participant[]
}
```

**Behaviour:**
- Counts how many participants chose each `BetType` (ignores `result: null`).
- Filters out bet types with 0 participants — they produce no slice.
- If the filtered list is empty (nobody has placed a bet yet), returns `null` — the component is not rendered.
- Renders a recharts `PieChart` with `Pie` configured as a donut (`innerRadius`/`outerRadius`).
- Each slice gets a `Cell` with a color from a fixed 6-color indigo/violet palette (consistent with the app's brand colors).
- The center of the donut displays the total number of players who placed a bet.
- A recharts `Tooltip` shows "N graczy" on hover (count only, no percentage).
- A legend rendered alongside the chart lists each bet type label (1, X, 2, etc.) and its count. Only types with ≥1 vote appear in the legend.

**Color palette (indexed by `BET_TYPES` order):**
| Index | Bet | Color |
|-------|-----|-------|
| 0 | 1 | `#6366f1` |
| 1 | X | `#8b5cf6` |
| 2 | 2 | `#a78bfa` |
| 3 | 1X | `#c4b5fd` |
| 4 | X2 | `#ddd6fe` |
| 5 | 12 | `#e0e7ff` |

## Integration in `MatchPage`

Inside the `match.started && match.participants` section, before the `divide-y` list:

```tsx
<BetDistributionChart participants={match.participants} />
```

The chart is wrapped in a `px-4 py-4 sm:px-5 border-b border-line/60` div matching the card's spacing conventions.

## Data Flow

All data comes from `match.participants` already fetched by `useMatch`. No new API calls or server changes are needed. The component derives counts locally:

```ts
const counts = BET_TYPES.map(([result, label]) => ({
  result,
  label,
  count: participants.filter(p => p.result === result).length,
})).filter(d => d.count > 0)
```

## Edge Cases

- **No bets placed yet:** `counts` is empty → component returns `null`, chart hidden.
- **All on one type:** Single slice fills the full donut — renders fine.
- **One participant:** Donut shows "1" in the center, one full slice.

## Out of Scope

- Percentage display (count only).
- Animation beyond recharts defaults.
- Backend changes.
- Finished match — chart remains visible after the match ends (data is still present).
