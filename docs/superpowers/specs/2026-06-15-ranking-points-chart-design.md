# Ranking Points Chart — Design Spec

**Date:** 2026-06-15  
**Status:** Approved

## Problem

The existing bump chart (`?view=chart`) plots ranking position (Y-axis) over match number (X-axis) for all ~80 users. With 80 overlapping lines compressed into 80 integer positions, the chart is unreadable — solid spaghetti from top to bottom.

## Approach

Add a new **"Punkty" tab** alongside the existing "Wykres pozycji" tab. The new chart uses **cumulative points** on the Y-axis instead of position. Points spread the field more naturally (especially at the top where many players can share a position but have different point totals). All 80 lines are rendered simultaneously using a **tiered opacity fog**: most lines are nearly invisible, but "you" and your favourites are always fully visible and drawn on top.

The existing bump chart is **not changed**.

## What Changes

### `frontend/src/pages/RankingPage.tsx`

- The `view` type expands: `'table' | 'chart' | 'points'`
- URL param: `?view=points` activates the new chart (existing `?view=chart` unchanged)
- A third tab button "Punkty" is added between "Wykres pozycji" and nothing
- Renders `<RankingPointsChart enabled={view === 'points'} />` when active

### `frontend/src/components/RankingPointsChart.tsx` (new file)

New component, structured similarly to `RankingBumpChart`. Reuses:
- `useRankingHistory` hook (already fetches `series[].points[]`)
- Same mobile/desktop layout split
- Same collapsible legend pattern

**Y-axis:** cumulative points, 0 → max. Not reversed (higher = better).  
**X-axis:** match number, same tick logic as today (`xTicks` helper).  
**Chart width:** same `COL_PX = 20` horizontal scroll. Desktop height: same `DESKTOP_CHART_HEIGHT_PER_USER * totalUsers` formula.

#### Fog rendering (line opacity by final rank tier)

All lines are drawn in two passes so "me" and favourites always render on top:

| Tier | Rank fraction | Stroke colour | Opacity (base) |
|------|--------------|---------------|----------------|
| Top  | 0–15%        | `#34d399` (green) | 20% |
| Mid  | 15–65%       | `#6b7280` (grey)  | 12% |
| Low  | 65–100%      | `#f87171` (red)   | 12% |

Pass 1: all non-me, non-favourite lines at tier opacity.  
Pass 2: favourite lines — full opacity, 1.8px amber (`#f59e0b`).  
Pass 3: me — full opacity, 2.5px brand green (`#12A751`).

**When `highlightedIds` is non-empty:**
- Highlighted lines → full opacity, 2px, their tier colour (or green/amber if me/fav)
- All other non-me, non-favourite lines → 5% opacity

#### End-of-chart rank labels

At x = last match, draw a small rank badge (#1, #2, #3) next to the top 3 lines. Only rendered if those users are not already highlighted/me (to avoid clutter).

#### Prize zone reference line

Dashed amber line at the points value of the weakest in-prize-zone user at the final match. Same label "strefa nagród" as the bump chart. Shown only when `rewarded > 0`.

#### Multi-select legend

State: `highlightedIds: Set<number>` (replaces bump chart's single `highlightedId: number | null`).

- Clicking a legend entry toggles that user's ID in/out of the set.
- When set is non-empty, a "Wyczyść (N)" button appears in the legend header.
- Legend entry shows a filled indicator when selected.
- Legend otherwise identical to bump chart: scrollable on desktop (with `maxHeight`), collapsible on mobile.

#### Tooltip

Same structure as today's `CustomTooltip`. On hover at match X:
- Shows match name, score, date.
- If `hoveredUserId` is set: shows that user's **points** at that match + their **position** at that match (both available in `series[].points[i]` and `series[].positions[i]`).

`hoveredUserId` is set via `activeDot.onMouseEnter` on each `<Line>`, same pattern as today.

#### No dots by default

`showDots` only when `matches.length <= 5`, same threshold as bump chart.

## What Does Not Change

- `RankingBumpChart.tsx` — untouched
- `ranking_history_serializer.rb` — already serialises `points`
- `lib/typerek/ranking/history.rb` — untouched
- API route — untouched
- `useRankingHistory` hook — untouched

## Data Flow

```
RankingPage (view === 'points')
  └─ RankingPointsChart
       └─ useRankingHistory()   ← already cached, shared with bump chart
            └─ data.series[].points[]   ← Y values
            └─ data.series[].positions[] ← tooltip secondary info
            └─ data.matches[]            ← X axis + tooltip match info
```

The hook result is cached by React Query so switching tabs does not re-fetch.

## Non-Goals

- No backend changes.
- No search/filter input (legend scroll + multi-select is sufficient for now).
- No animation.
- No changes to the "Wykres pozycji" tab.
